import { describe, test } from "vitest";
import assert from "node:assert/strict";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../src/spec.js";
import { benchBlockOf } from "../src/bench.ts";
import { BenchRemoteService, DraftsRemoteService } from "../src/remote.ts";
import { sig, bootCtx, codeOf } from "./bench-helpers.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

// ── THE BENCH WRITE TRANSACTION (the round-14 race audit's R1/R2/R3,
//    2026-10-22) ───────────────────────────────────────────────────
//
// Every bench mutation is load → CAS check → sync mutate → put, and its
// fence compares a rev read in its own prologue. Before the transaction
// lock, two verbs dispatched together both read rev N, both passed the
// fence (the check is sync; the only yield is the put) and both
// persisted rev N+1: the contracted `bench/cas-conflict` never fired and
// the log carried duplicate revs — which rev-keyed undo targeting
// conflates. The author door (`drafts/patch`) spread-copied the log
// instead of pushing onto it, so a concurrent pair could persist a log
// missing the other's landed entry. These arms drive the SERVICES (the
// door the wire and the agent tool share) at one rev, and pin the
// contract: exactly one writer lands, the loser refuses, the log's revs
// stay unique and its entries agree with the stages.

/** One bench block straight from the domain's live cached doc. */
function blockOf(
  domain: Domain<DraftsDomainSpec>,
  session: string,
): { rev: number; log: Array<{ rev?: unknown; kind?: unknown }> } {
  const rec = domain.table("docs").get("bench-" + session);
  assert.ok(rec !== undefined, `the bench doc for ${session} exists`);
  return benchBlockOf(rec.doc as Record<string, unknown>) as {
    rev: number;
    log: Array<{ rev?: unknown; kind?: unknown }>;
  };
}

/** The draft's stage rows, live from the domain's cached doc. */
function stagesOf(
  domain: Domain<DraftsDomainSpec>,
  session: string,
): Array<Record<string, unknown>> {
  const rec = domain.table("docs").get("bench-" + session);
  assert.ok(rec !== undefined, `the bench doc for ${session} exists`);
  const stages = (rec.doc as Record<string, unknown>)["stages"];
  return Array.isArray(stages) ? (stages as Array<Record<string, unknown>>) : [];
}

function refusalsOf(...codes: string[]): string[] {
  return codes.filter((c) => c !== "NO-REFUSAL");
}
describe("THE BENCH WRITE TRANSACTION (the round-14 race audit's R1/R2/R3)", () => {
  test("two bench patches on one rev serialize: the second refuses with the rev the first landed", async () => {
    const { ctx, domain } = await bootCtx();
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "s", stages: [{ id: "a" }, { id: "b" }] }, sig);
    const rev0 = blockOf(domain, "s").rev;
    const [first, second] = await Promise.all([
      codeOf(bench.patch("s", { stage: "a", params: { prompt: "one" }, expect_rev: rev0 }, sig)),
      codeOf(bench.patch("s", { stage: "b", params: { prompt: "two" }, expect_rev: rev0 }, sig)),
    ]);
    const refusals = refusalsOf(first, second);
    assert.equal(
      refusals.length, 1,
      `exactly one of the pair refuses (got ${first} / ${second})`,
    );
    assert.match(refusals[0]!, /^bench\/cas-conflict\|/);
    assert.match(
      refusals[0]!,
      new RegExp(`rev is ${rev0 + 1}, caller held ${rev0}`),
      `the refusal names the rev the winner landed (got ${refusals[0]})`,
    );
    const block = blockOf(domain, "s");
    const revs = block.log.map((e) => e.rev);
    assert.equal(
      new Set(revs).size, revs.length,
      `the log's revs are unique (got ${revs.join(", ")})`,
    );
    assert.equal(block.rev, rev0 + 1);
  });

  // The fork's interleaving (both doors reading rev N before either
  // put) is timing-dependent and is not forced here, so this arm pins
  // the CONTRACT both doors hold — one doc, one rev, one landed
  // writer — rather than proving the lock the way the first and third
  // arms do.
  test("both doors address one doc and hold one CAS contract: a same-rev pair leaves one landed writer", async () => {
    const { ctx, domain } = await bootCtx();
    const bench = new BenchRemoteService(ctx);
    const drafts = new DraftsRemoteService(ctx);
    await bench.ensure({ session: "s", stages: [{ id: "a" }, { id: "b" }] }, sig);
    const rev0 = blockOf(domain, "s").rev;
    // the author door addresses the same doc the load arm minted for the
    // session key: `bench-s` is `benchDraftIdOf("s")`, the one key both
    // transactions queue on
    const [authorArm, benchArm] = await Promise.all([
      codeOf(drafts.patch(draftIdOf("bench-s"), "b", { params: { prompt: "two" } }, rev0, sig)),
      codeOf(bench.patch("s", { stage: "a", params: { prompt: "one" }, expect_rev: rev0 }, sig)),
    ]);
    const refusals = refusalsOf(benchArm, authorArm);
    assert.equal(
      refusals.length, 1,
      `exactly one writer refuses (got ${benchArm} / ${authorArm})`,
    );
    assert.match(refusals[0]!, /^bench\/cas-conflict\|/);
    const block = blockOf(domain, "s");
    const revs = block.log.map((e) => e.rev);
    assert.equal(
      new Set(revs).size, revs.length,
      `the log's revs are unique (got ${revs.join(", ")})`,
    );
    const patches = block.log.filter((e) => e.kind === "patch");
    // the fork this arm pins: the author door's spread-copy could persist
    // a log missing the bench verb's landed entry while both revs read
    // N+1 — one landed patch entry, never zero and never two
    assert.equal(
      patches.length, 1,
      `the landed patch entries are exactly one (got ${patches.length} of ${block.log.length})`,
    );
    assert.equal(block.rev, rev0 + 1);
    // each arm's effect survives exactly when that arm landed: the fork
    // this pins is a doc whose log holds one writer's entry while the
    // other's landed change is gone (the last put wins wholesale)
    const stages = stagesOf(domain, "s");
    const paramsOf = (id: string): Record<string, unknown> => {
      const stage = stages.find((s) => s["id"] === id);
      return (stage?.["params"] ?? {}) as Record<string, unknown>;
    };
    const benchLanded = benchArm === "NO-REFUSAL";
    assert.equal(
      paramsOf("a")["prompt"] === "one", benchLanded,
      "the bench arm's stage keeps its write iff that arm landed",
    );
    assert.equal(
      paramsOf("b")["prompt"] === "two", !benchLanded,
      "the author arm's stage keeps its write iff that arm landed",
    );
  });

  test("an undo and a patch on one rev cannot both land: the loser refuses instead of vanishing", async () => {
    const { ctx, domain } = await bootCtx();
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "s", stages: [{ id: "a" }, { id: "b" }] }, sig);
    const rev0 = blockOf(domain, "s").rev;
    // a landed write for the undo to target, sequentially
    await bench.patch("s", { stage: "a", params: { prompt: "seed" }, expect_rev: rev0 }, sig);
    const rev1 = blockOf(domain, "s").rev;
    const [undoArm, patchArm] = await Promise.all([
      codeOf(bench.undo("s", { expect_rev: rev1 }, sig)),
      codeOf(bench.patch("s", { stage: "b", params: { prompt: "two" }, expect_rev: rev1 }, sig)),
    ]);
    const refusals = refusalsOf(undoArm, patchArm);
    assert.equal(
      refusals.length, 1,
      `exactly one of the pair refuses (got ${undoArm} / ${patchArm})`,
    );
    const block = blockOf(domain, "s");
    const revs = block.log.map((e) => e.rev);
    assert.equal(
      new Set(revs).size, revs.length,
      `the log's revs are unique (got ${revs.join(", ")})`,
    );
    assert.equal(block.rev, rev1 + 1);
  });
});
