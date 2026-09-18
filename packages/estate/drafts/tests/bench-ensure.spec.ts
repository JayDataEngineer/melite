import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, undoBench } from "../src/bench.ts";
import { boot, seed, codeOf, syncCodeOf } from "./bench-helpers.ts";

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

test("the overwrite law spares births and empty benches", async () => {
  const drafts = await boot();
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
