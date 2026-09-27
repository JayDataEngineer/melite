import { test } from "vitest";
import assert from "node:assert/strict";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../src/spec.js";
import { ensureBench, getBench, patchBench, addStageBench, removeStageBench, rewireBench } from "../src/bench.ts";
import { boot, seed, codeOf, syncCodeOf } from "./bench-helpers.ts";

// ── coverage arms: the rare-error and default branches ──────────
// One behavioral arm per reporter-named location (2026-09-15 gate
// push): intent defaults, the stageless re-read, the stillborn
// birth, the CAS mismatch on write verbs, junk-cell tolerance on
// seeded rows (the loose schema rides extras verbatim), the
// admission's junk-row skip + empty-card early return, array
// spells, output-only bindings, the empty live set, the duplicate
// mint, and rewire's junk-params tolerance.

test("birth honors a string intent; loads keep the old intent on junk, take a new one", async () => {
  const drafts = await boot();
  const born = await ensureBench(drafts, { session: "i1", intent: "my intent" });
  assert.equal(born.created, true);
  assert.equal(born.intent, "my intent");
  // a load with a junk intent keeps the standing one …
  const kept = await ensureBench(drafts, {
    session: "i1", stages: [{ id: "a" }], expect_rev: 0, intent: 5,
  });
  assert.equal(kept.intent, "my intent");
  // … while a string intent replaces it.
  const moved = await ensureBench(drafts, {
    session: "i1", stages: [{ id: "b" }], expect_rev: 1, intent: "new", overwrite: true,
  });
  assert.equal(moved.intent, "new");
});

test("ensure on a live bench without stages re-reads (created:false)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "r1", stages: [{ id: "a" }] });
  const reread = await ensureBench(drafts, { session: "r1" });
  assert.equal(reread.created, false);
  assert.equal(reread.rev, 0);
  assert.deepEqual(
    (reread.stages as Array<{ id: string }>).map((x) => x.id),
    ["a"],
  );
});

test("a stillborn birth refuses bench/not-found (the storage dropped the put)", async () => {
  // the hand-rolled stillborn facility: puts record, reads never
  // land — the birth's re-read misses and the write refuses loud.
  class StillbornDocs {
    puts: Array<{ id: string; row: unknown }> = [];
    table(name: string): StillbornDocs {
      assert.equal(name, "docs", "the bench reads the docs table only");
      return this;
    }
    get(_id: string): undefined {
      return undefined;
    }
    put(id: string, row: unknown): Promise<void> {
      this.puts.push({ id, row });
      return Promise.resolve();
    }
  }
  const docs = new StillbornDocs();
  const drafts = { table: (name: string): StillbornDocs => docs.table(name) } as unknown as Domain<DraftsDomainSpec>;
  const refusal = await codeOf(addStageBench(drafts, "s", { card: "c", expect_rev: 0 }));
  assert.match(refusal, /^bench\/not-found\|could not birth bench: s/);
  assert.equal(docs.puts.length, 1);
  assert.equal(docs.puts[0]?.id, "bench-s");
});

test("THE INTENT-SYNC LAW (BRIEF14 finding #3 — the stale bench_snapshot.intent): a card-naming intent re-derives when the bench no longer holds that card; stated intents and free prose ride untouched", async () => {
  const drafts = await boot();
  // the receipt's exact shape: a tts-born bench, wholesale-loaded
  // with an h3 stage, no stated intent — the old "tts" must not ride
  await ensureBench(drafts, { session: "isync", intent: "tts", stages: [{ id: "s_0", card: "tts", params: {} }] });
  const loaded = await ensureBench(drafts, {
    session: "isync", stages: [{ id: "s_0", card: "h3-timeline", params: {} }], expect_rev: 0, overwrite: true,
  });
  assert.equal(loaded.intent, "h3-timeline");
  // a pure add_stage never orphans a true label (no churn)
  await ensureBench(drafts, { session: "isync2", intent: "tts", stages: [{ id: "s_0", card: "tts", params: {} }] });
  await addStageBench(drafts, "isync2", { card: "h3-timeline", expect_rev: 0 });
  assert.equal((await getBench(drafts, "isync2")).intent, "tts");
  // remove_stage CAN orphan: the label's card leaves, a surviving
  // card takes the label (the re-derivation receipt)
  await ensureBench(drafts, { session: "isync2b", intent: "tts", stages: [
    { id: "s_0", card: "tts", params: {} }, { id: "s_1", card: "h3-timeline", params: {} },
  ] });
  await removeStageBench(drafts, "isync2b", { stage: "s_0", expect_rev: 0 });
  assert.equal((await getBench(drafts, "isync2b")).intent, "h3-timeline");
  // remove_stage to a card-LESS bench keeps the label (inert with
  // nothing to mislabel — the prose boundary is the same path)
  await ensureBench(drafts, { session: "isync3", intent: "tts", stages: [{ id: "s_0", card: "tts", params: {} }] });
  await removeStageBench(drafts, "isync3", { stage: "s_0", expect_rev: 0 });
  const afterRemove = await getBench(drafts, "isync3");
  assert.equal(afterRemove.intent, "tts");
  // an intent still naming a PRESENT card is untouched (no churn)
  await ensureBench(drafts, { session: "isync4", intent: "tts", stages: [{ id: "s_0", card: "tts", params: {} }] });
  await patchBench(drafts, "isync4", { stage: "s_0", params: { seed: 7 }, expect_rev: 0 });
  assert.equal((await getBench(drafts, "isync4")).intent, "tts");
  // free prose never matches a card id and rides untouched
  await ensureBench(drafts, { session: "isync5", intent: "my harbour film idea", stages: [{ id: "s_0", card: "h3-timeline", params: {} }] });
  await addStageBench(drafts, "isync5", { card: "tts", expect_rev: 0 });
  assert.equal((await getBench(drafts, "isync5")).intent, "my harbour film idea");
  // a STATED load intent wins over the derivation
  await ensureBench(drafts, { session: "isync6", intent: "tts", stages: [{ id: "s_0", card: "tts", params: {} }] });
  const stated = await ensureBench(drafts, {
    session: "isync6", intent: "operator named it", stages: [{ id: "s_0", card: "h3-timeline", params: {} }], expect_rev: 0, overwrite: true,
  });
  assert.equal(stated.intent, "operator named it");
});

test("casCheck names the moved bench on the write verbs", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "m1" });
  const added = await addStageBench(drafts, "m1", { card: "c", expect_rev: 0 });
  assert.equal(added.rev, 1);
  assert.match(
    await codeOf(patchBench(drafts, "m1", { stage: added.stage, params: { x: 1 }, expect_rev: 0 })),
    /^bench\/cas-conflict\|bench m1 moved: rev is 1, caller held 0/,
  );
});

test("patch tolerates a junk inputs cell on a seeded row (extras ride the loose schema)", async () => {
  const drafts = await boot();
  await seed(drafts, "j", {
    stages: [{ id: "s_0", card: "c", params: { p: "$ch" }, inputs: "junk" }],
  });
  const row = await patchBench(drafts, "j", {
    stage: "s_0", params: { q: 1 }, expect_rev: 0,
  });
  assert.equal(row.rev, 1);
  assert.deepEqual(row.patched, ["q"]);
  const after = getBench(drafts, "j");
  assert.deepEqual(
    (after.stages as Array<{ params: unknown }>)[0]?.params,
    { p: "$ch", q: 1 },
  );
});

test("the admission skips junk rows and returns early on empty cards (never a silent sail-through)", async () => {
  const drafts = await boot();
  const seen: Array<{ card: unknown; params: unknown }> = [];
  const admit = (card: string, params: Record<string, unknown>): void => {
    seen.push({ card, params });
  };
  const born = await ensureBench(drafts, {
    session: "a1", stages: ["junk", { id: "a", card: "hero" }],
  }, admit);
  // the junk row never reached admission; the record row did, on {}.
  assert.deepEqual(seen, [{ card: "hero", params: {} }]);
  assert.deepEqual(
    (born.stages as Array<{ id: string }>).map((x) => x.id),
    ["a"],
  );
  // an empty card returns before admission — the recorder stands still —
  // and the write still refuses its own voice.
  assert.match(
    await codeOf(addStageBench(drafts, "a1", { card: "", expect_rev: 0 }, admit)),
    /^bench\/bad-body\|card is required/,
  );
  assert.deepEqual(seen, [{ card: "hero", params: {} }]);
});

test("array params spell through the wiring admission", async () => {
  const drafts = await boot();
  const row = await addStageBench(drafts, "arr", {
    card: "c",
    params: { gallery: ["$a", "plain"] },
    inputs: { a: { initial: "f" } },
    expect_rev: 0,
  });
  assert.equal(row.stage, "s_0");
  const after = getBench(drafts, "arr");
  assert.deepEqual(
    (after.stages as Array<{ params: unknown }>)[0]?.params,
    { gallery: ["$a", "plain"] },
  );
});

test("a binding naming only an output refuses bench/bad-wire", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "bw" });
  assert.match(
    await codeOf(addStageBench(drafts, "bw", {
      card: "c", params: { p: "$ch" }, inputs: { ch: { output: "x" } }, expect_rev: 0,
    })),
    /^bench\/bad-wire\|.*is neither \{stage, output\} nor \{initial\}/,
  );
});

test("a wire to a ghost on an empty-id bench names the empty live set", async () => {
  const drafts = await boot();
  assert.match(
    await codeOf(ensureBench(drafts, {
      session: "n1",
      stages: [{ id: "", params: { p: "$ghost" }, inputs: { ghost: { stage: "zzz", output: "o" } } }],
    })),
    /^bench\/wire-stage-not-found\|.*\(live: none\)/,
  );
  // the refused birth persisted nothing.
  assert.match(syncCodeOf((): unknown => getBench(drafts, "n1")), /^bench\/not-found/);
});

test("an explicit duplicate id refuses bench/duplicate-stage", async () => {
  const drafts = await boot();
  const first = await addStageBench(drafts, "d1", { id: "dup", card: "c", expect_rev: 0 });
  assert.equal(first.stage, "dup");
  assert.match(
    await codeOf(addStageBench(drafts, "d1", { id: "dup", card: "c", expect_rev: 1 })),
    /^bench\/duplicate-stage\|stage id already on the bench: dup/,
  );
});

test("rewire tolerates a junk params cell when the channel deletes (no spell left to strand)", async () => {
  const drafts = await boot();
  await seed(drafts, "rw", {
    stages: [{ id: "a", card: "c", params: "junk", inputs: { ch: { initial: "f" } } }],
  });
  const row = await rewireBench(drafts, "rw", { stage: "a", input: "ch", expect_rev: 0 });
  assert.equal(row.rev, 1);
  const after = getBench(drafts, "rw");
  assert.deepEqual(
    (after.stages as Array<{ inputs: unknown }>)[0]?.inputs,
    {},
  );
});

// ── THE RESTORE REPAIR (operator law 2026-09-24 — receipt: loading
// run-257737552c00's history refused "unknown model
// 'qwen3-tts-voicedesign-design'"; an era's compose wrote ids
// today's registry never boarded, so the archive died at the load
// door). Two walls: the provenance coordinate flows through the
// domain's admission, and the remote's admission closure repairs
// restores (never live rows) per the schema-master law.
import { admissionOf, RESTORED_PROVENANCE } from "../src/remote.ts";

test("the admission carries the provenance coordinate (restored rows ride restore law, live adds pass undefined)", async () => {
  const drafts = await boot();
  const seen: Array<{ card: string; provenance: unknown }> = [];
  const admit = (card: string, _params: Record<string, unknown>, provenance: unknown): void => {
    seen.push({ card, provenance });
  };
  await ensureBench(drafts, {
    session: "prov",
    stages: [{ id: "a", card: "tts", provenance: RESTORED_PROVENANCE, params: {} }],
  }, admit);
  await addStageBench(drafts, "prov", { card: "sfx", expect_rev: 0 }, admit);
  assert.deepEqual(seen, [
    { card: "tts", provenance: RESTORED_PROVENANCE },
    { card: "sfx", provenance: undefined },
  ]);
});

// The resolver stub: admission admits only the repaired family;
// the repair owns the family-prefix law (the registry's own
// repairStageModel is walled in estate-queue's cards-registry
// spec against the REAL defs/facts).
interface CtxLike { get(name: string, optional?: boolean): unknown }
function ctxWithResolver(resolver: unknown): CtxLike {
  return { get: (name: string): unknown => (name === "cardRegistry" ? resolver : undefined) };
}
const RESOLVER = {
  resolveStageParams: (): null => null,
  admitStageModel: (card: string, model: unknown) =>
    card === "tts" && model === "qwen3-tts-voicedesign"
      ? { ok: true as const }
      : { ok: false as const, error: "model '" + String(model) + "' is not offered", offered: ["qwen3-tts-voicedesign"] },
  repairStageModel: (card: string, model: string) =>
    card === "tts" && model.startsWith("qwen3-tts-voicedesign-")
      ? { model: "qwen3-tts-voicedesign" }
      : null,
};

test("a RESTORED row with a poisoned model repairs in place and lands", () => {
  const admit = admissionOf(ctxWithResolver(RESOLVER) as never);
  assert.ok(admit !== undefined);
  const params: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design" };
  admit("tts", params, RESTORED_PROVENANCE);
  assert.equal(params["model"], "qwen3-tts-voicedesign");
});

test("a LIVE row with the same poison refuses loud (the composer's teaching surface)", () => {
  const admit = admissionOf(ctxWithResolver(RESOLVER) as never);
  assert.ok(admit !== undefined);
  const params: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design" };
  assert.throws(() => admit("tts", params, undefined), /is not offered/);
  assert.equal(params["model"], "qwen3-tts-voicedesign-design", "a live refusal never mutates");
});

test("a restored row with NO repairable prefix rethrows the original refusal", () => {
  const admit = admissionOf(ctxWithResolver(RESOLVER) as never);
  assert.ok(admit !== undefined);
  assert.throws(
    () => admit("tts", { model: "mystery-thing" }, "restored"),
    /is not offered/,
  );
});

test("a repair that still refuses rethrows the ORIGINAL refusal", () => {
  // the board refuses even the repaired family (the stub admits
  // only on card 'tts' — a card mismatch survives repair):
  const admit = admissionOf(ctxWithResolver(RESOLVER) as never);
  assert.ok(admit !== undefined);
  const params: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design" };
  assert.throws(() => admit("sfx", params, "restored"), /is not offered/);
});

test("a registry-less lane admits nothing (no admission closure)", () => {
  assert.equal(admissionOf(ctxWithResolver(undefined) as never), undefined);
});

test("restored model repair fills absent and empty variants but preserves a stated variant", () => {
  const resolver = {
    ...RESOLVER,
    repairStageModel: (): { model: string, variant: string } => ({
      model: "qwen3-tts-voicedesign",
      variant: "design",
    }),
  };
  const absent = admissionOf(ctxWithResolver(resolver) as never);
  const empty = admissionOf(ctxWithResolver(resolver) as never);
  const stated = admissionOf(ctxWithResolver(resolver) as never);
  assert.ok(absent !== undefined && empty !== undefined && stated !== undefined);
  const absentParams: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design" };
  const emptyParams: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design", variant: "" };
  const statedParams: Record<string, unknown> = { model: "qwen3-tts-voicedesign-design", variant: "base" };
  absent("tts", absentParams, RESTORED_PROVENANCE);
  empty("tts", emptyParams, RESTORED_PROVENANCE);
  stated("tts", statedParams, RESTORED_PROVENANCE);
  assert.equal(absentParams["variant"], "design");
  assert.equal(emptyParams["variant"], "design");
  assert.equal(statedParams["variant"], "base");
});

test("a non-null repair that still refuses preserves the original refusal", () => {
  const resolver = {
    resolveStageParams: (): null => null,
    admitStageModel: (): { ok: false, error: string, offered: string[] } => ({ // a RETURN-TYPE literal: 'false' alone is the narrow type ('as const' is value syntax — tsc reads it as a second member)
      ok: false,
      error: "model 'poison' is not offered",
      offered: [],
    }),
    repairStageModel: (): { model: string, variant: string } => ({
      model: "still-rejected",
      variant: "design",
    }),
  };
  const admit = admissionOf(ctxWithResolver(resolver) as never);
  assert.ok(admit !== undefined);
  const params: Record<string, unknown> = { model: "poison" };
  assert.throws(() => admit("tts", params, RESTORED_PROVENANCE), /model 'poison' is not offered/);
  assert.equal(params["model"], "still-rejected");
});
