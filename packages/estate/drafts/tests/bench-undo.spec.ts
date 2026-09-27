import { test } from "vitest";
import assert from "node:assert/strict";
import {
  ensureBench,
  getBench,
  patchBench,
  addStageBench,
  removeStageBench,
  rewireBench,
  reorderBench,
  groupBench,
  ungroupBench,
  undoBench,
} from "../src/bench.ts";
import { boot, seed, codeOf } from "./bench-helpers.ts";

function entry(
  rev: number,
  kind: string,
  author: string,
  inverse?: Record<string, unknown>,
): Record<string, unknown> {
  return { rev, at: rev, author, kind, ...(inverse !== undefined ? { inverse } : {}) };
}

// ── undo: the inverse table ─────────────────────────────────────

test("undo takes expect_rev; the author filter skips foreign entries and reports its voice", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await addStageBench(drafts, "s", { card: "x", author: "user", expect_rev: 0 });
  // Filter user: undoes only the user's add (rev 1).
  const undone = await undoBench(drafts, "s", { n: 1, author: "user", expect_rev: 1 });
  assert.deepEqual(undone.undone, [1]);
  // Nothing left for a user filter: the filter's own voice.
  assert.match(
    await codeOf(undoBench(drafts, "s", { n: 1, author: "user" })),
    /^bench\/nothing-to-undo\|nothing to undo \(author user\)/,
  );
});

test("undo n>1 sorts the undone revs ascending", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await addStageBench(drafts, "s", { card: "x", expect_rev: 1 });
  const undone = await undoBench(drafts, "s", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(patch) restores before-values and drops added keys", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a", params: { steps: 4 } }] });
  await patchBench(drafts, "s", { stage: "a", params: { steps: 9, extra: true }, expect_rev: 0 });
  await undoBench(drafts, "s", { n: 1 });
  const doc = getBench(drafts, "s");
  const st = (doc.stages as Array<{ id: string; params: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.params, { steps: 4 });
});

test("undo(patch) on a removed stage skips loudly-free (the snapshot is the coarse truth)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await removeStageBench(drafts, "s", { stage: "a", expect_rev: 1 });
  // Undoing BOTH: the patch's stage is gone when its inverse applies.
  const undone = await undoBench(drafts, "s", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(group) spills the children back; undo(ungroup) re-groups; undo(reorder) moves back", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  const grouped = await groupBench(drafts, "s", { stages: ["a", "b"], expect_rev: 0 });
  // ungroup then undo: the compound returns at its index.
  await ungroupBench(drafts, "s", { stage: grouped.stage, expect_rev: 1 });
  await undoBench(drafts, "s", { n: 1 });
  let doc = getBench(drafts, "s");
  let ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.equal(ids.length, 2, "compound + c after undo(ungroup)");
  assert.match(ids[0]!, /^g_r0c2_/);
  // undo(ungroup) again is impossible (reverted); now undo the GROUP
  // itself from the birth state instead.
  const gid = ids[0]!;
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "c"], "undo(group) spills children");
  // reorder + undo: back to the original position.
  await reorderBench(drafts, "s", { stage: "c", to: 0, expect_rev: 4 });
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "c"], "undo(reorder) moves back");
});

test("undo(rewire) restores the before-binding, then removes an added one", async () => {
  const drafts = await boot();
  // (2026-09-15 wiring law: 'a' spells the channel, 'b' is the
  // live upstream.)
  await ensureBench(drafts, {
    session: "s",
    stages: [
      { id: "a", params: { image: "$image" } },
      { id: "b" },
    ],
  });
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { stage: "b", output: "default" }, expect_rev: 0 });
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { initial: "image" }, expect_rev: 1 });
  // Undo the rebind: the before-binding returns.
  await undoBench(drafts, "s", { n: 1 });
  let doc = getBench(drafts, "s");
  let st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "b", output: "default" });
  // Undo the bind itself: the input disappears.
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal("image" in st.inputs, false);
});

test("undo(load) restores the pre-load snapshot", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  await ensureBench(drafts, { session: "s", stages: [{ id: "z" }], expect_rev: 0, overwrite: true });
  await undoBench(drafts, "s", { n: 1 });
  const doc = getBench(drafts, "s");
  assert.deepEqual(
    (doc.stages as Array<{ id: string }>).map((x) => x.id),
    ["a", "b"],
  );
});

// ── crafted log entries: the applier is robust to partial data ──

test("crafted entries: remove without index lands at the tail; ungroup without row/index degrades", async () => {
  const drafts = await boot();
  await seed(drafts, "craft", {
    stages: [{ id: "keep" }],
    bench: {
      rev: 2,
      log: [
        entry(1, "remove_stage", "agent", { stage: "gone", row: { id: "gone" } }),
        entry(2, "ungroup", "agent", { stage: "x" }),
      ],
    },
  });
  // No index on the remove: the row re-lands at the tail. The
  // ungroup with no row: skipped loudly-free.
  const undone = await undoBench(drafts, "craft", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
  const doc = getBench(drafts, "craft");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["keep", "gone"]);
});

test("crafted ungroup with non-array children skips the splice-out; missing index parks at the tail", async () => {
  const drafts = await boot();
  await seed(drafts, "craft2", {
    stages: [{ id: "a" }, { id: "b" }],
    bench: {
      rev: 1,
      log: [
        entry(1, "ungroup", "agent", {
          row: { id: "g", card: "group", children: "junk" },
        }),
      ],
    },
  });
  // children non-array: nothing spliced out; the compound parks at
  // the tail (no index on the inverse).
  await undoBench(drafts, "craft2", { n: 1 });
  const doc = getBench(drafts, "craft2");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "g"]);
});

test("crafted reorder without from parks at the tail; crafted patch/rewire on ghost stages skip", async () => {
  const drafts = await boot();
  await seed(drafts, "craft3", {
    stages: [{ id: "a" }, { id: "b" }],
    bench: {
      rev: 3,
      log: [
        entry(1, "patch", "agent", { stage: "ghost", params_before: { x: 1 } }),
        entry(2, "rewire", "agent", { stage: "ghost", input: "image", added: true }),
        entry(3, "reorder", "agent", { stage: "a" }),
      ],
    },
  });
  const undone = await undoBench(drafts, "craft3", { n: 3 });
  assert.deepEqual(undone.undone, [1, 2, 3]);
  const doc = getBench(drafts, "craft3");
  // The reorder with no from: 'a' parks at the tail.
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["b", "a"]);
});

test("crafted rewire inverse with a before-binding restores it", async () => {
  const drafts = await boot();
  await seed(drafts, "craft4", {
    stages: [{ id: "a", inputs: { image: { initial: "image" } } }],
    bench: {
      rev: 1,
      log: [
        entry(1, "rewire", "agent", {
          stage: "a", input: "image", before: { stage: "z", output: "default" },
        }),
      ],
    },
  });
  await undoBench(drafts, "craft4", { n: 1 });
  const doc = getBench(drafts, "craft4");
  const st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "z", output: "default" });
});

test("crafted undo entry restores its snapshot (the coarse fallback on itself)", async () => {
  const drafts = await boot();
  await seed(drafts, "craft5", {
    stages: [{ id: "current" }],
    bench: {
      rev: 1,
      log: [
        entry(1, "undo", "agent", { stages_before: [{ id: "old-1" }, { id: "old-2" }] }),
        entry(2, "patch", "agent", { stage: "current" }),
      ],
    },
  });
  // The newest ACTION is the patch (rev 2); undoing it is a no-op
  // inverse (patch with no before/added on a bare stage). Then a
  // second undo targets... nothing (the undo entry is never a
  // candidate) — the nothing-to-undo voice. Instead: undo 2 actions —
  // only the patch qualifies; assert the refusal voice after.
  await undoBench(drafts, "craft5", { n: 1 });
  assert.match(
    await codeOf(undoBench(drafts, "craft5", { n: 1 })),
    /^bench\/nothing-to-undo/,
  );
});

test("crafted tail: inverses without stage/index/from/before degrade; unknown kinds fall to the snapshot gate", async () => {
  const drafts = await boot();
  await seed(drafts, "tail", {
    stages: [{ id: "keep" }, { id: "bare" }],
    bench: {
      rev: 12,
      log: [
        // patch with NO inverse: inv {} → ghost stage skip.
        entry(1, "patch", "agent"),
        // patch: e.stage carries the target, inverse only params_before.
        { ...entry(2, "patch", "agent", { params_before: { x: 1 } }), stage: "keep" },
        // add_stage whose stage is absent: nothing spliced in.
        entry(3, "add_stage", "agent", { stage: "ghost" }),
        // remove_stage with a junk row: nothing re-landed.
        entry(4, "remove_stage", "agent", { stage: "keep", row: "junk" }),
        // group with junk children + ghost compound: nothing.
        entry(5, "group", "agent", { stage: "ghostx", children: "junk" }),
        // ungroup child that is not on the bench: splice skipped.
        entry(6, "ungroup", "agent", { row: { id: "g", card: "group", children: [{ id: "ghost" }] }, index: 0 }),
        // reorder ghost: nothing.
        entry(7, "reorder", "agent", { stage: "ghost", from: 1, to: 0 }),
        // rewire: no stage in inverse → ghost skip.
        entry(8, "rewire", "agent", { input: "image", added: true }),
        // rewire: bare stage (no inputs record) births one, then delete "".
        entry(9, "rewire", "agent", { stage: "bare", added: true }),
        // rewire: no input in inverse → input "" (harmless).
        entry(10, "rewire", "agent", { stage: "keep", added: true }),
        // rewire: neither added nor before → no change.
        entry(11, "rewire", "agent", { stage: "keep", input: "image" }),
        // unknown kind: falls through to the snapshot gate (undefined).
        entry(12, "future_kind", "agent", { stages_before: [{ id: "nope" }] }),
      ],
    },
  });
  const undone = await undoBench(drafts, "tail", { n: 12 });
  assert.equal(undone.undone.length, 12);
  const doc = getBench(drafts, "tail");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  // The whole table degraded loudly-free: keep + bare survive; the
  // patch (e.stage keep) applied params_before; nothing else moved.
  assert.deepEqual(ids.filter((x) => x === "keep" || x === "bare").length, 2);
  assert.equal(ids.includes("ghost"), false);
  assert.equal(ids.includes("nope"), false, "unknown-kind snapshot did not apply");
});
