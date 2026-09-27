import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, undoBench } from "../src/bench.ts";
import { boot, seed, codeOf, syncCodeOf, failureOf, syncFailureOf } from "./bench-helpers.ts";

// ── ensure: the admission voices ────────────────────────────────

test("ensure refuses unknown keys, bad sessions, and stageless loads without expect_rev", async () => {
  const drafts = await boot();
  assert.match(await codeOf(ensureBench(drafts, { session: "s", junk: 1 })), /^bench\/bad-body\|unknown bench key/);
  assert.match(await codeOf(ensureBench(drafts, { session: "bad key!" })), /^bench\/bad-session/);
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  // A load (stages present) with no expect_rev: the CAS law's voice.
  assert.match(
    await codeOf(ensureBench(drafts, { session: "s", stages: [{ id: "b" }] })),
    /^bench\/cas-conflict\|expect_rev is required/,
  );
  // A moved bench: the caller held a stale rev.
  assert.match(
    await codeOf(ensureBench(drafts, { session: "s", stages: [{ id: "b" }], expect_rev: 9 })),
    /^bench\/cas-conflict\|bench moved/,
  );
  // A junk stages value loads as [] (normalize's contract; the body
  // is caller data, never schema-validated) — under the overwrite
  // law the wipe still needs its confirmation.
  const loaded = await ensureBench(drafts, { session: "s", stages: "junk", expect_rev: 0, overwrite: true });
  assert.deepEqual(loaded.stages, []);
  assert.equal(loaded.rev, 1);
});

test("A BENCH IS BORN CLEAN OF ARCHIVES — history/resultParams/runStatus/resolved die at birth, the wand's result stamp rides", async () => {
  // The cross-bench history leak (2026-09-23, live proof
  // bench-session-2bd2a61f): the wand restores a run onto a fresh
  // session carrying stage rows from a FOREIGN bench's snapshot —
  // history tiles named like the other card's files landed in the
  // new bench and the next Run press archived them into view.
  // Archives are earned by THIS bench's own runs; only `result`
  // (the wand's preview stamp for the ran card) survives a birth.
  // The LOAD arm keeps the stage memory law whole (same-id carry,
  // fill-never-clobber — remote.spec.ts owns that wall).
  const drafts = await boot();
  const born = await ensureBench(drafts, {
    session: "s",
    stages: [{
      id: "s_0",
      card: "sfx",
      params: { prompt: "thunder" },
      history: [{ run_id: "run-foreign", url: "/tts/x.flac" }],
      result: { run_id: "run-own", url: "/sfx/SaveAudio.0_sfx_00001.flac" },
      resultParams: { qvoice: [] },
      runStatus: "done",
      resolved: { model: "moss-sfx" },
    }],
  });
  assert.equal(born.rev, 0);
  const [row] = born.stages as Array<Record<string, unknown>>;
  assert.equal(row["id"], "s_0");
  assert.equal(row["card"], "sfx");
  assert.deepEqual(row["params"], { prompt: "thunder" });
  assert.deepEqual(row["result"], { run_id: "run-own", url: "/sfx/SaveAudio.0_sfx_00001.flac" },
    "the wand's preview stamp (result) is the one lawful birth memory");
  for (const k of ["history", "resultParams", "runStatus", "resolved"]) {
    assert.equal(k in row, false, k + " must not survive a birth");
  }
});

test("the overwrite law: a wholesale load onto a non-empty bench refuses without overwrite:true", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  // expect_rev proves the caller READ the bench — not that the user
  // agreed to lose it (2026-09-15: a compose agent wiped a live
  // card with a wholesale load holding a fresh rev).
  assert.match(
    await codeOf(ensureBench(drafts, { session: "s", stages: [{ id: "z" }], expect_rev: 0 })),
    /^bench\/overwrite-required\|bench holds 2 stage\(s\) at rev 0/,
  );
  // the refusal is pure: rev and stages stand.
  const kept = getBench(drafts, "s");
  assert.equal(kept.rev, 0);
  assert.deepEqual(
    (kept.stages as Array<{ id: string }>).map((x) => x.id),
    ["a", "b"],
  );
  // overwrite:true confirms the wipe — the inverse still carries
  // stages_before, so undo restores.
  const wiped = await ensureBench(drafts, {
    session: "s", stages: [{ id: "z" }], expect_rev: 0, overwrite: true,
  });
  assert.equal(wiped.rev, 1);
  assert.deepEqual(
    (wiped.stages as Array<{ id: string }>).map((x) => x.id),
    ["z"],
  );
  await undoBench(drafts, "s", { n: 1 });
  const back = getBench(drafts, "s");
  assert.deepEqual(
    (back.stages as Array<{ id: string }>).map((x) => x.id),
    ["a", "b"],
  );
});

test("the overwrite law spares births and empty benches", async () => {  const drafts = await boot();
  // birth with stages: no bench to wipe, no confirmation needed.
  const born = await ensureBench(drafts, { session: "fresh", stages: [{ id: "a" }] });
  assert.equal(born.rev, 0);
  // a bench holding zero stages loads freely.
  await ensureBench(drafts, { session: "fresh", stages: [], expect_rev: 0, overwrite: true });
  const emptied = await ensureBench(drafts, { session: "fresh", stages: [{ id: "b" }], expect_rev: 1 });
  assert.deepEqual(
    (emptied.stages as Array<{ id: string }>).map((x) => x.id),
    ["b"],
  );
});

// ── the legacy bench doc: no bench block, block reborn on save ──

test("a bench doc without a bench block reads as rev 0 and gains its block on first save", async () => {
  const drafts = await boot();
  await seed(drafts, "legacy", { stages: [{ id: "a" }] });
  const got = getBench(drafts, "legacy");
  assert.equal(got.rev, 0);
  assert.deepEqual(got.log, []);
  // The first mutation persists the born block.
  const patched = await patchBench(drafts, "legacy", {
    stage: "a", params: { x: 1 }, expect_rev: 0,
  });
  assert.equal(patched.rev, 1);
  const after = getBench(drafts, "legacy");
  assert.equal(after.rev, 1);
  assert.equal(after.log.length, 1);
});

test("THE NULL-UNSET ARM (commission 033's gap): a null param DELETES its key — and undo resurrects it", async () => {
  // The drafts door has always deleted null keys (JSON Merge Patch);
  // this door landed literal nulls — a key that could never clear,
  // forcing makers into remove_stage + add_stage dances to move a
  // lane. One law, two doors: null deletes here too.
  const drafts = await boot();
  await seed(drafts, "unset", { stages: [{ id: "s_0", card: "tts", params: { voice_name: "ann", pitch: 5 } }] });
  const cut = await patchBench(drafts, "unset", {
    stage: "s_0", params: { voice_name: null, style: "warm" }, expect_rev: 0,
  });
  assert.equal(cut.rev, 1);
  const row = (getBench(drafts, "unset").stages as Array<Record<string, unknown>>)[0]!; // the test seeded an array of stage records; the served row types stages as JsonValue
  const params = row["params"] as Record<string, unknown>;
  assert.equal("voice_name" in params, false, "the null key is GONE, not a literal null");
  assert.equal(params["style"], "warm", "sibling keys in the same patch land");
  assert.equal(params["pitch"], 5, "untouched keys survive");
  // the receipt's patched names both moved keys
  assert.deepEqual([...cut.patched].sort(), ["style", "voice_name"]);
  // UNDO resurrects: the inverse carries params_before, the deleted
  // key's old value rides it home.
  await undoBench(drafts, "unset", {});
  const undone = ((getBench(drafts, "unset").stages as Array<Record<string, unknown>>)[0]!["params"]) as Record<string, unknown>; // same seeded-array read as above
  assert.equal(undone["voice_name"], "ann", "undo restores the deleted key");
  assert.equal("style" in undone, false, "the same patch's addition reverts");
});

test("getBench refuses bad sessions and unknown benches with their voices", async () => {
  const drafts = await boot();
  assert.match(syncCodeOf((): unknown => getBench(drafts, "no!")), /^bench\/bad-session/);
  // STROKE 46g: the READ door keeps its honest not-found; the WRITE
// door (loadBench) BIRTHS — a conversation's bench is born at its
// first write, never refused (the forever fix).
  assert.match(syncCodeOf((): unknown => getBench(drafts, "ghost")), /^bench\/not-found/);
  const born = await addStageBench(drafts, "session-born-1", { card: "image-gen", author: "user", expect_rev: 0 });
  assert.equal(born.rev, 1);
  assert.equal((getBench(drafts, "session-born-1") as { stages: unknown[] }).stages.length, 1);
});

test("the load receipt names every incoming stage's seed state (ledger #41: a pin arrived silently)", async () => {
  // A concrete seed rode a wholesale load while the summary said
  // only "load N stages" — the operator re-ran one image
  // believing they were on random. The load entry now names each
  // stage's seed state: pinned (the value, verbatim), random (the
  // -1 sentinel), or absent.
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await ensureBench(drafts, {
    session: "s",
    stages: [
      { id: "p", params: { seed: 42 } },
      { id: "r", params: { seed: -1 } },
      { id: "n", params: { prompt: "x" } },
    ],
    expect_rev: 0, overwrite: true,
  });
  const got = getBench(drafts, "s");
  assert.equal(got.rev, 1);
  const entry = got.log[got.log.length - 1] as unknown as Record<string, unknown>;
  assert.equal(entry["kind"], "load");
  const summary = entry["summary"] as string;
  assert.match(summary, /load 3 stages/);
  assert.match(summary, /p seed 42 \(pinned\)/);
  assert.match(summary, /r seed random/);
  assert.match(summary, /n seed absent/);
});

// ── the details receipts (cookbook adding-a-remote-api §5) ─────
// The refusal voice is code + message + a STRUCTURED details payload
// (RemoteErrorDetailsMap); the walls above pin the prose, this one
// pins the payload — recovered with remoteErrorOf after catching,
// asserted by field, never by regex over prose. A details key that
// silently goes missing or drifts type fails HERE, at the throw the
// client's catch-branch narrows on.
test("every structured refusal carries its declared details on the wire", async () => {
  const drafts = await boot();
  // bench/overwrite-required → { current_rev, stages }
  await ensureBench(drafts, { session: "d", stages: [{ id: "a" }, { id: "b" }] });
  const overwrite = await failureOf(
    ensureBench(drafts, { session: "d", stages: [{ id: "z" }], expect_rev: 0 }),
  );
  assert.equal(overwrite.code, "bench/overwrite-required");
  assert.equal(typeof overwrite.message, "string");
  assert.equal(overwrite.details.current_rev, 0);
  assert.equal(overwrite.details.stages, 2);
  // bench/cas-conflict → { current_rev, expect_rev }
  const cas = await failureOf(
    ensureBench(drafts, { session: "d", stages: [{ id: "z" }], expect_rev: 9, overwrite: true }),
  );
  assert.equal(cas.code, "bench/cas-conflict");
  assert.equal(cas.details.current_rev, 0);
  assert.equal(cas.details.expect_rev, 9);
  // bench/stage-not-found → { session, stage }
  const stageMiss = await failureOf(
    patchBench(drafts, "d", { stage: "ghost", params: { x: 1 }, expect_rev: 0 }),
  );
  assert.equal(stageMiss.code, "bench/stage-not-found");
  assert.equal(stageMiss.details.session, "d");
  assert.equal(stageMiss.details.stage, "ghost");
  // bench/not-found → { session } (getBench refuses synchronously)
  const missing = syncFailureOf((): unknown => getBench(drafts, "ghost"));
  assert.equal(missing.code, "bench/not-found");
  assert.equal(missing.details.session, "ghost");
});
