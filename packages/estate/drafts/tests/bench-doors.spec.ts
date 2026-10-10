import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../src/spec.js";
import { ensureBench } from "../src/bench.ts";
import { BenchRemoteService, DraftsRemoteService } from "../src/remote.ts";
import { sig, bootCtx, seed } from "./bench-helpers.ts";

// ── THE OUTPUT HISTORY (stroke 40 — the operator's QOL law: the
//    preview's mini row is a CARD OUTPUT HISTORY) ─────────────────

describe("the drafts/patch door: the output history archive", () => {
  /** Boot a real DraftsRemoteService over the json+domain stack. */
  async function bootRemote(): Promise<{ svc: DraftsRemoteService; drafts: Domain<DraftsDomainSpec> }> {
    const { ctx, domain } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    return { svc, drafts: domain };
  }

  async function historyOf(svc: DraftsRemoteService, stageId = "s_0"): Promise<unknown[]> {
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>).find((s) => s["id"] === stageId)!;
    return Array.isArray(stage["history"]) ? (stage["history"] as unknown[]) : [];
  }

  test("a LIVE progress face over a completed result ARCHIVES the outputs (the poll never destroys a run)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // run A completes: the terminal result carries outputs
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "a", url: "/runs/a/out.png", artifacts: { out: "/runs/a/out.png" } } }, 0, sig);
    // run B goes live: the poll's progress face carries NO outputs
    await svc.patch("bench-main", "s_0", { runStatus: "running", result: { run_id: "b", progress: { value: 1, max: 10 } } }, 1, sig);
    // the previous outputs are ARCHIVED, newest first — and the
    // live face is the current result, not the archive's
    const hist = await historyOf(svc);
    expect(hist.length).toBe(1);
    expect((hist[0] as Record<string, unknown>)["url"]).toBe("/runs/a/out.png");
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    expect((stage["result"] as Record<string, unknown>)["run_id"]).toBe("b");
  });

  test("a terminal overwrite archives the previous outputs (re-generate lands in history)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "a", url: "/runs/a/out.png", artifacts: { out: "/runs/a/out.png" } } }, 0, sig);
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "b", url: "/runs/b/out.png", artifacts: { out: "/runs/b/out.png" } } }, 1, sig);
    const hist = await historyOf(svc);
    // BOTH landings are members: head is the CURRENT gen (b), the
    // superseded a sits beneath — no pick can orphan either
    expect(hist.length).toBe(2);
    expect((hist[0] as Record<string, unknown>)["run_id"]).toBe("b");
    expect((hist[1] as Record<string, unknown>)["run_id"]).toBe("a");
  });

  test("the SAME outputs never double-list (the operator's uniqueness: re-generate UNIQUE outputs only)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "a", url: "/runs/a/out.png" } }, 0, sig);
    // a progress face, then the SAME urls land again (an idempotent
    // re-delivery) — the archive holds ONE entry for those urls
    await svc.patch("bench-main", "s_0", { runStatus: "running", result: { run_id: "b", progress: { value: 1, max: 4 } } }, 1, sig);
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "c", url: "/runs/a/out.png" } }, 2, sig);
    const hist = await historyOf(svc);
    expect(hist.length).toBe(1);
  });

  test("the archive is CAPPED at 12 (a reasonable maximum)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    let rev = 0;
    for (let i = 0; i < 16; i++) {
      await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "r" + i, url: "/runs/r" + i + "/out.png" } }, rev, sig);
      rev += 1;
    }
    const hist = await historyOf(svc);
    expect(hist.length).toBe(12);
    // NEWEST FIRST: the head is the CURRENT gen (r15); the cap
    // drops the oldest (r0..r3)
    expect((hist[0] as Record<string, unknown>)["run_id"]).toBe("r15");
    expect((hist[11] as Record<string, unknown>)["run_id"]).toBe("r4");
  });

  test("results without outputs never archive (a progress face over a progress face)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    await svc.patch("bench-main", "s_0", { runStatus: "running", result: { run_id: "a", progress: { value: 1, max: 4 } } }, 0, sig);
    await svc.patch("bench-main", "s_0", { runStatus: "running", result: { run_id: "a", progress: { value: 2, max: 4 } } }, 1, sig);
    expect((await historyOf(svc)).length).toBe(0);
  });

  test("THE PARAMS SNAPSHOT (output-component stroke): the archive entry carries the params that MADE the run — captured at landing, immune to later edits", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // run A lands under params {seed: 1} (the params write is the
    // author move, rev 0→1; the landing below it is TELEMETRY —
    // result+runStatus only — and never advances the rev)
    await svc.patch("bench-main", "s_0", { params: { seed: 1 } }, 0, sig);
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "a", url: "/runs/a/out.png" } }, 1, sig);
    // the operator edits params to {seed: 2} (rev 1→2 — the CAS
    // handle moved exactly once per AUTHOR move, telemetry aside),
    // then re-runs
    await svc.patch("bench-main", "s_0", { params: { seed: 2 } }, 1, sig);
    await svc.patch("bench-main", "s_0", { runStatus: "completed", result: { run_id: "b", url: "/runs/b/out.png" } }, 2, sig);
    const hist = await historyOf(svc);
    expect(hist.length).toBe(2);
    // EVERY archived generation is tagged with ITS OWN params, not
    // the current ones (the edit between runs never re-labels
    // history): head = b under {seed: 2}, beneath = a under {seed: 1}
    expect((hist[0] as Record<string, unknown>)["params"]).toEqual({ seed: 2 });
    expect((hist[1] as Record<string, unknown>)["params"]).toEqual({ seed: 1 });
    // a params-only patch never disturbs the live resultParams
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    expect(stage["resultParams"]).toEqual({ seed: 2 });
  });
});

// ── the drafts/patch door (the layered-params law, 2026-09-14) ────

describe("the drafts/patch door: null-unset, CAS fence, rev+log", () => {
  /** Boot a real DraftsRemoteService over the json+domain stack. */
  async function bootRemote(): Promise<{ svc: DraftsRemoteService; drafts: Domain<DraftsDomainSpec> }> {
    const { ctx, domain } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    return { svc, drafts: domain };
  }

  test("a params patch merges per-key, bumps rev, and logs kind:patch", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0", params: { steps: 8 } }] });
    const answer = await svc.patch("bench-main", "s_0", { params: { cfg: 3.5 } }, 0, sig);
    // the answer carries the new rev (the client's CAS currency)
    expect(answer.rev).toBe(1);
    expect(answer.patched).toEqual(["params"]);
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    // merge per-key: steps SURVIVES, cfg rides
    expect(stage["params"]).toEqual({ steps: 8, cfg: 3.5 });
    const bench = (doc["bench"] as Record<string, unknown>);
    expect(bench["rev"]).toBe(1);
    const log = bench["log"] as Array<Record<string, unknown>>;
    const last = log[log.length - 1]!;
    expect(last["kind"]).toBe("patch");
    expect(last["stage"]).toBe("s_0");
  });

  test("a null param DELETES the key (JSON Merge Patch — the unset wire form)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0", params: { steps: 8, cfg: 3.5 } }] });
    await svc.patch("bench-main", "s_0", { params: { cfg: null } }, 0, sig);
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    expect(stage["params"]).toEqual({ steps: 8 });
  });

  test("a stale expectRev refuses loud with bench/cas-conflict carrying current_rev", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0", params: { steps: 8 } }] });
    await svc.patch("bench-main", "s_0", { params: { cfg: 3 } }, 0, sig);
    // the bench moved to rev 1; a writer holding rev 0 refuses —
    // never merges under the earlier author
    const err = await svc.patch("bench-main", "s_0", { params: { steps: 20 } }, 0, sig).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).not.toBeNull();
    expect(String((err as { code?: string }).code)).toBe("bench/cas-conflict");
    const details = (err as { details?: Record<string, unknown> }).details ?? {};
    expect(details["current_rev"]).toBe(1);
    expect(details["expect_rev"]).toBe(0);
    // the doc never moved
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    expect(stage["params"]).toEqual({ steps: 8, cfg: 3 });
    expect((doc["bench"] as Record<string, unknown>)["rev"]).toBe(1);
  });

  test("expectRev null refuses — the recovery path rides the REV, never the fence-skip (S-S2)", async () => {
    // The obsolete wall pinned the unfenced null write (the
    // last-writer-wins "recovery path"). The door now speaks the
    // bench verbs' law: a non-number expect_rev is a guaranteed
    // refusal — an unfenced author write merged silently under a
    // moved bench. Recovery = fetch the current rev and write with
    // it (exactly what the client's CAS predicate rebase does).
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0", params: { steps: 8 } }] });
    const refused = await svc.patch("bench-main", "s_0", { params: { steps: 20 } }, null, sig).then(
      () => null,
      (e: unknown) => e,
    );
    expect(refused).not.toBeNull();
    expect(String((refused as { code?: string }).code)).toBe("bench/cas-conflict");
    expect(String((refused as { message?: string }).message)).toBe("expect_rev is required (the CAS law)");
    expect(((refused as { details?: Record<string, unknown> }).details ?? {})["current_rev"]).toBe(0);
    // nothing landed
    const doc0 = await svc.get("bench-main", sig);
    expect(((doc0["stages"] as Array<Record<string, unknown>>)[0]!)["params"]).toEqual({ steps: 8 });
    // the recovery write rides the rev it was refused with
    await svc.patch("bench-main", "s_0", { params: { steps: 20 } }, 0, sig);
    const doc = await svc.get("bench-main", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    expect(stage["params"]).toEqual({ steps: 20 });
    expect((doc["bench"] as Record<string, unknown>)["rev"]).toBe(1);
  });
});

// ── the resolved serve (hour-26 stroke 15, the 1:1 run law) ──────
// The doors attach prepareCardParams' own stamps per stage (the
// registry behind the optional-dependency law) and never store
// them: the domain keeps params/result/runStatus, the serve derives
// `resolved` fresh on every read.

async function seedDraft(
  drafts: Domain<DraftsDomainSpec>,
  draftId: string,
  stages: unknown[],
): Promise<void> {
  await drafts.table("docs").put(draftId, {
    updated_at: 1,
    doc: {
      draft_id: draftId,
      intent: "seeded",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      stages,
    } as never,
  });
}

function fakeRegistry(ctx: Context): void {
  // the serve probes ctx.get('cardRegistry') (the no-inject read),
  // so the fake rides ctx.provide — the store the probe reads.
  ctx.provide("cardRegistry", {
    resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null =>
      typeof body["model"] === "string" && body["model"] !== ""
        ? { ...body, steps: 52 }
        : null,
  });
}

test("drafts/get + bench/get attach the served resolved map and never store it", async () => {
  const { ctx, domain } = await bootCtx();
  const stages = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "anima", prompt: "x" } }];
  await seedDraft(domain, "rs-draft", stages);
  await seed(domain, "rs", { stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "anima", prompt: "x" } }] });
  fakeRegistry(ctx);
  const doc = await new DraftsRemoteService(ctx).get("rs-draft", sig);
  const dstages = doc["stages"] as Array<Record<string, unknown>>;
  assert.deepEqual(dstages[0]?.["resolved"], { model: "anima", prompt: "x", steps: 52 });
  const row = await new BenchRemoteService(ctx).get("rs", sig);
  const rstages = row.stages as Array<Record<string, unknown>>;
  assert.deepEqual(rstages[0]?.["resolved"], { model: "anima", prompt: "x", steps: 52 });
  // the stored records keep params only — the serve derived, never persisted
  const storedDraft = domain.table("docs").get("rs-draft");
  assert.ok(!("resolved" in ((storedDraft?.doc as unknown as { stages: Array<Record<string, unknown>> }).stages[0] as object)));
  const storedBench = domain.table("docs").get("bench-rs");
  assert.ok(!("resolved" in ((storedBench?.doc as unknown as { stages: Array<Record<string, unknown>> }).stages[0] as object)));
});

test("registry-less lanes serve stages un-resolved (the local-derive fallback)", async () => {
  const { ctx, domain } = await bootCtx();
  await seedDraft(domain, "plain-draft", [{ id: "s_0", card: "image-gen", params: { model: "anima" } }]);
  await seed(domain, "plain", { stages: [{ id: "s_0", card: "image-gen", params: { model: "anima" } }] });
  const doc = await new DraftsRemoteService(ctx).get("plain-draft", sig);
  assert.ok(!("resolved" in ((doc["stages"] as Array<Record<string, unknown>>)[0] as object)));
  const row = await new BenchRemoteService(ctx).get("plain", sig);
  assert.ok(!("resolved" in ((row.stages as Array<Record<string, unknown>>)[0] as object)));
});

test("unresolvable params ride un-resolved (no key, never null)", async () => {
  const { ctx, domain } = await bootCtx();
  await seedDraft(domain, "ghost-draft", [{ id: "s_0", card: "image-gen", params: {} }]);
  fakeRegistry(ctx);
  const doc = await new DraftsRemoteService(ctx).get("ghost-draft", sig);
  assert.ok(!("resolved" in ((doc["stages"] as Array<Record<string, unknown>>)[0] as object)));
});
