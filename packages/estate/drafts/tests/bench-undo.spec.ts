import {test, describe } from "vitest";
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
  clearBench,
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

// THE FENCE IS NOT OPTIONAL (audit W-E2): undo fences like every
// verb now, so every undo in this file carries the rev its setup
// read — an absent expect_rev refuses bench/cas-conflict.
test("undo takes expect_rev; the author filter skips foreign entries and reports its voice", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await addStageBench(drafts, "s", { card: "x", author: "user", expect_rev: 0 });
  // Filter user: undoes only the user's add (rev 1).
  const undone = await undoBench(drafts, "s", { n: 1, author: "user", expect_rev: 1 });
  assert.deepEqual(undone.undone, [1]);
  // Nothing left for a user filter: the filter's own voice.
  assert.match(
    await codeOf(undoBench(drafts, "s", { n: 1, author: "user", expect_rev: 2 })),
    /^bench\/nothing-to-undo\|nothing to undo \(author user\)/,
  );
});

test("undo n>1 sorts the undone revs ascending", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await addStageBench(drafts, "s", { card: "x", expect_rev: 1 });
  const undone = await undoBench(drafts, "s", { n: 2, expect_rev: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(patch) restores before-values and drops added keys", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a", params: { steps: 4 } }] });
  await patchBench(drafts, "s", { stage: "a", params: { steps: 9, extra: true }, expect_rev: 0 });
  await undoBench(drafts, "s", { n: 1, expect_rev: 1 });
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
  const undone = await undoBench(drafts, "s", { n: 2, expect_rev: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(group) spills the children back; undo(ungroup) re-groups; undo(reorder) moves back", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  const grouped = await groupBench(drafts, "s", { stages: ["a", "b"], expect_rev: 0 });
  // ungroup then undo: the compound returns at its index.
  await ungroupBench(drafts, "s", { stage: grouped.stage, expect_rev: 1 });
  await undoBench(drafts, "s", { n: 1, expect_rev: 2 });
  let doc = getBench(drafts, "s");
  let ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.equal(ids.length, 2, "compound + c after undo(ungroup)");
  assert.match(ids[0]!, /^g_r0c2_/);
  // undo(ungroup) again is impossible (reverted); now undo the GROUP
  // itself from the birth state instead.
  const gid = ids[0]!;
  await undoBench(drafts, "s", { n: 1, expect_rev: 3 });
  doc = getBench(drafts, "s");
  ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "c"], "undo(group) spills children");
  // reorder + undo: back to the original position.
  await reorderBench(drafts, "s", { stage: "c", to: 0, expect_rev: 4 });
  await undoBench(drafts, "s", { n: 1, expect_rev: 5 });
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
  await undoBench(drafts, "s", { n: 1, expect_rev: 2 });
  let doc = getBench(drafts, "s");
  let st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "b", output: "default" });
  // Undo the bind itself: the input disappears.
  await undoBench(drafts, "s", { n: 1, expect_rev: 3 });
  doc = getBench(drafts, "s");
  st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal("image" in st.inputs, false);
});

test("undo(load) restores the pre-load snapshot", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  await ensureBench(drafts, { session: "s", stages: [{ id: "z" }], expect_rev: 0, overwrite: true });
  await undoBench(drafts, "s", { n: 1, expect_rev: 1 });
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
  const undone = await undoBench(drafts, "craft", { n: 2, expect_rev: 2 });
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
  await undoBench(drafts, "craft2", { n: 1, expect_rev: 1 });
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
  const undone = await undoBench(drafts, "craft3", { n: 3, expect_rev: 3 });
  assert.deepEqual(undone.undone, [1, 2, 3]);
  const doc = getBench(drafts, "craft3");
  // The reorder with no from: 'a' parks at the tail.
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["b", "a"]);
});

test("crafted rewire inverse with a before-binding restores it", async () => {
  const drafts = await boot();
  await seed(drafts, "craft4", {
    // 'z' rides the bench: the restored wire must name a LIVE stage
    // (2026-10-10, the write-seat audit's row 6) — undo-rewire walks
    // the same wiring law the rewire door walks before the restore
    // lands.
    stages: [
      { id: "a", params: { image: "$image" }, inputs: { image: { initial: "image" } } },
      { id: "z" },
    ],
    bench: {
      rev: 1,
      log: [
        entry(1, "rewire", "agent", {
          stage: "a", input: "image", before: { stage: "z", output: "default" },
        }),
      ],
    },
  });
  await undoBench(drafts, "craft4", { n: 1, expect_rev: 1 });
  const doc = getBench(drafts, "craft4");
  const st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "z", output: "default" });
});

test("an undo-rewire whose restored wire names a DEAD upstream refuses (the restore is a write)", async () => {
  // 2026-10-10, the write-seat audit's row 6: the inverse records a
  // wire cut earlier; the bench has since lost the upstream — the
  // rewire door refuses to create this state, and so does the undo
  // that would restore it. The refusal names the wire, and the row
  // keeps its CURRENT inputs (the undo aborts whole).
  const drafts = await boot();
  await seed(drafts, "craft4b", {
    stages: [{ id: "a", params: { image: "$image" }, inputs: { image: { initial: "image" } } }],
    bench: {
      rev: 1,
      log: [
        entry(1, "rewire", "agent", {
          stage: "a", input: "image", before: { stage: "z", output: "default" },
        }),
      ],
    },
  });
  await assert.rejects(
    undoBench(drafts, "craft4b", { n: 1, expect_rev: 1 }),
    /no such stage on the bench/,
  );
  const doc = getBench(drafts, "craft4b");
  const st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { initial: "image" });
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
  await undoBench(drafts, "craft5", { n: 1, expect_rev: 1 });
  assert.match(
    await codeOf(undoBench(drafts, "craft5", { n: 1, expect_rev: 2 })),
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
  const undone = await undoBench(drafts, "tail", { n: 12, expect_rev: 12 });
  assert.equal(undone.undone.length, 12);
  const doc = getBench(drafts, "tail");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  // The whole table degraded loudly-free: keep + bare survive; the
  // patch (e.stage keep) applied params_before; nothing else moved.
  assert.deepEqual(ids.filter((x) => x === "keep" || x === "bare").length, 2);
  assert.equal(ids.includes("ghost"), false);
  assert.equal(ids.includes("nope"), false, "unknown-kind snapshot did not apply");
});

describe("THE MULTI-TARGET UNDO IS ATOMIC (the bench audit's gap 2)", () => {
  test("a late refusal leaks NEITHER target (a repair door that half-repairs is worse than one that refuses)", async () => {
    // 2026-10-10: the inverses applied straight into the cached doc,
    // so `undo {n: 2}` whose first target reverts cleanly and whose
    // second refuses left the first change in the live document with
    // no rev and no log. The inverses now run on a deep copy.
    //
    // The log is crafted so the SECOND target's restore reinserts a
    // row the seat refuses (the audit's repro): rev 2 is a patch
    // whose inverse reverts cleanly; rev 3 is a remove_stage whose
    // inverse row carries a model no family declares.
    const drafts = await boot();
    await seed(drafts, "atomic", {
      // the live row says seed 1; the patch's params_before says 9 —
      // so the undo's first target REALLY changes it (an identical
      // value would make the inverse a no-op and nothing could leak)
      stages: [{ id: "keep", card: "card-a", params: { seed: 1 } }],
      bench: {
        rev: 3,
        log: [
          entry(1, "add_stage", "agent", { stage: "keep", row: { id: "keep", card: "card-a", params: { seed: 1 } } }),
          // newest-first application: rev 3 (the patch) reverts
          // CLEANLY first, then rev 2 (the remove) reinserts the
          // poison row and refuses — so the leak, before the kill,
          // is the patch's change sitting in the live document with
          // no rev and no log.
          entry(2, "remove_stage", "agent", { stage: "gone", row: { id: "gone", card: "card-a", params: { model: "poison-net" } } }),
          entry(3, "patch", "agent", { stage: "keep", params_before: { seed: 9 } }),
        ],
      },
    });
    const refuseRestore = (card: string, params: Record<string, unknown>): void => {
      if (params["model"] === "poison-net") throw new Error("bench/bad-model");
    };
    const before = getBench(drafts, "atomic");
    const beforeJson = JSON.stringify(before.stages);
    const refused = await codeOf(undoBench(drafts, "atomic", { n: 2, expect_rev: 3 }, refuseRestore));
    assert.match(String(refused), /bad-model/, "the restore refuses");
    const after = getBench(drafts, "atomic");
    assert.equal(JSON.stringify(after.stages), beforeJson,
      "the bench is byte-identical after the refused undo — the first target did NOT land");
  });

describe("THE UNDOED BENCH IS WIRE-JUDGED WHOLE (the bench audit's gaps 4 + 5)", () => {
  test("undo-patch refuses a restore that strands a spell the wire still feeds (the dead wire forward patch refuses)", async () => {
    // 2026-10-10: the patch inverse judged models only, so restoring
    // params that predate the "$image" spell while the wire stayed
    // landed the dead wire through the repair door.
    const drafts = await boot();
    await seed(drafts, "stray", {
      stages: [
        { id: "s_0", card: "card-a", params: { image: "$image" }, inputs: { image: { stage: "s_1", output: "image" } } },
        { id: "s_1", card: "card-b", params: {} },
      ],
      bench: {
        rev: 1,
        // the patch's inverse restores params from BEFORE the spell
        // existed; the wire (not part of the patch) stays
        log: [entry(1, "patch", "agent", { stage: "s_0", params_before: {}, params_added: ["image"] })],
      },
    });
    const refused = await codeOf(undoBench(drafts, "stray", { n: 1, expect_rev: 1 }));
    assert.match(String(refused), /dead-wire|bound by no/,
      "the undo refuses the stranded spell: " + String(refused));
    const after = getBench(drafts, "stray").stages as Array<{ params: Record<string, unknown> }>;
    assert.equal(after[0]!.params["image"], "$image", "the refused undo left the row as it was");
  });

  test("undo-remove refuses to reinsert a row wired to a stage that is gone (a phantom the forward doors both refuse)", async () => {
    // 2026-10-10: the remove inverse reinserted the row after judging
    // its model only — so a reinsert that wired a missing stage
    // landed the phantom the add/rewire/remove doors all refuse.
    const drafts = await boot();
    await seed(drafts, "phantom", {
      stages: [{ id: "keep", card: "card-a", params: {} }],
      bench: {
        rev: 1,
        log: [
          entry(1, "remove_stage", "agent", {
            stage: "gone",
            row: { id: "gone", card: "card-b", params: { image: "$image" }, inputs: { image: { stage: "ghost", output: "image" } } },
          }),
        ],
      },
    });
    const refused = await codeOf(undoBench(drafts, "phantom", { n: 1, expect_rev: 1 }));
    assert.match(String(refused), /wire-stage-not-found|no such stage/,
      "the undo refuses the phantom: " + String(refused));
    assert.equal((getBench(drafts, "phantom").stages as unknown[]).length, 1,
      "nothing reinserted");
  });
});
});

// ── §4 DEBT 0: THE UNDO WALK NEVER LANDS A SECOND ROW UNDER ONE ID ──

describe("the standing-id survivor law at undo (CONTRACTS §4 debt 0, the s_0-twice burn)", () => {
  test("an undo walking to an old un-reverted remove whose id already stands refuses — never a duplicate row", async () => {
    // The 2026-10-26 night's LIVE burn (revs 126-127): the log still
    // held un-reverted agent removes from the earlier purge era while
    // the stage's id had re-entered the bench since. Two probe undos
    // applied the old inverse and landed s_0 TWICE (repaired at the
    // store, rev 128). The add door refuses this state
    // (bench/duplicate-stage) and the load dedupe forbids it (the
    // identity audit's A3) — the repair door must not launder it
    // back. Census FIRST, so the toggle-out red shows the s_0-twice
    // shape itself, not just the missing refusal.
    const drafts = await boot();
    await seed(drafts, "d7-standing", {
      // the standing s_0 is the row the bench holds NOW — the
      // purge-era inverse's stale snapshot of the same id
      stages: [
        { id: "s_0", card: "card-a", params: {} },
        { id: "keep", card: "card-a", params: {} },
      ],
      bench: {
        rev: 1,
        log: [
          entry(1, "remove_stage", "agent", {
            stage: "s_0",
            row: { id: "s_0", card: "card-a", params: {} },
          }),
        ],
      },
    });
    const refused = await codeOf(undoBench(drafts, "d7-standing", { n: 1, expect_rev: 1 }));
    const ids = (getBench(drafts, "d7-standing").stages as Array<{ id: string }>).map((x) => x.id);
    assert.deepEqual(ids, ["s_0", "keep"], "the standing row keeps the bench, exactly once — got: " + JSON.stringify(ids));
    assert.equal(new Set(ids).size, ids.length, "ids stay unique post-undo");
    assert.match(refused, /^bench\/duplicate-stage\|/, "the undo refuses by name: " + refused);
    // The refused write wrote nothing: no undo entry, rev unmoved.
    assert.equal(getBench(drafts, "d7-standing").rev, 1, "the refusal landed no entry");
  });
});

// ── THE UNDO WALK'S OWN TOLERANCES (the log is data): an inverse is
//    a payload the log recorded, never a promise — the walks judge
//    what the entries carry and degrade loudly-free on junk. ────────

describe("the undo walk's own tolerances (the log is data)", () => {
  test("a crafted clear-undo snapshot carrying junk rows restores only the records", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-clear-junk", {
      stages: [{ id: "live" }],
      bench: {
        rev: 1,
        log: [
          entry(1, "clear", "agent", {
            stages_before: [
              null,
              "a bare string row",
              { id: "jp", params: "not-an-object bag" },
              { id: "old-1" },
            ],
          }),
        ],
      },
    });
    const undone = await undoBench(drafts, "walk-clear-junk", { n: 1, expect_rev: 1 });
    assert.equal(undone.undone.length, 1);
    const doc = getBench(drafts, "walk-clear-junk");
    const ids = (doc.stages as Array<{ id?: string }>).filter((x) => typeof x === "object" && x !== null).map((x) => x.id);
    assert.ok(ids.includes("old-1"), "the good row came back");
    assert.ok(ids.includes("jp"), "the junk-params row came back as it was");
  });

  test("a crafted group-undo whose children carry junk params degrades loudly-free", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-group-junk", {
      stages: [{ id: "keep" }],
      bench: {
        rev: 1,
        log: [
          entry(1, "group", "agent", {
            stage: "ghost",
            children: [{ id: "x", params: "not-an-object bag" }, null, "a bare string member"],
          }),
        ],
      },
    });
    const undone = await undoBench(drafts, "walk-group-junk", { n: 1, expect_rev: 1 });
    assert.equal(undone.undone.length, 1);
    const ids = (getBench(drafts, "walk-group-junk").stages as Array<{ id?: string }>).map((x) => x?.id);
    assert.deepEqual(ids, ["keep"], "the ghost compound spliced nothing");
  });

  test("a crafted rewire-undo on a row whose params is junk judges over empty params", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-rewire-junk", {
      stages: [{ id: "rw", params: "not-an-object bag", inputs: {} }],
      bench: {
        rev: 1,
        log: [
          entry(1, "rewire", "agent", { stage: "rw", input: "image", added: true }),
        ],
      },
    });
    await undoBench(drafts, "walk-rewire-junk", { n: 1, expect_rev: 1 });
    const row = (getBench(drafts, "walk-rewire-junk").stages as Array<Record<string, unknown>>).find((x) => x["id"] === "rw")!;
    assert.ok(!("image" in (row["inputs"] as Record<string, unknown>)), "the added wire came back off");
  });

  test("the restored walk reads an id-less row as no id, and the undo still lands", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-noid", {
      stages: [{ params: { seed: 1 } }, { id: "a" }],
      bench: {
        rev: 1,
        log: [entry(1, "patch", "agent", { params_before: { x: 1 }, stage: "a" })],
      },
    });
    const undone = await undoBench(drafts, "walk-noid", { n: 1, expect_rev: 1 });
    assert.equal(undone.undone.length, 1, "the undo landed over the id-less row");
  });
});

describe("the verb doors' own tolerances (a doc is data, the log is data)", () => {
  test("a doc whose stages is not an array reads as an empty bench, never a crash", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-nonarray", { stages: "a bare string where the array lives" as never });
    // the serve gate skips its walk (nothing is an array)
    const read = getBench(drafts, "walk-nonarray");
    assert.equal(read.stages, "a bare string where the array lives");
    // and the verbs refuse by name, they do not crash
    assert.match(
      await codeOf(patchBench(drafts, "walk-nonarray", { stage: "s_0", params: {}, expect_rev: 0 })),
      /stage not found: s_0/,
    );
  });

  test("a load whose rows carry non-string cards walks the intent sync past them", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-intent", {
      stages: [{ id: "s_0", card: "card-a", params: {} }],
      intent: "card-a",
    });
    await ensureBench(drafts, {
      session: "walk-intent",
      stages: [{ id: "s_0", card: 42, params: {} }, { card: "", params: {} }],
      overwrite: true,
      expect_rev: 0,
    });
    const doc = getBench(drafts, "walk-intent");
    assert.equal((doc as unknown as Record<string, unknown>)["intent"], "card-a", "the label survived: no card to re-derive from");
  });

  test("a doc whose intent is not a string keeps it — the sync never matches a held card", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-intent-junk", {
      stages: [{ id: "s_0", card: "card-a", params: {} }],
      intent: 42,
    });
    await addStageBench(drafts, "walk-intent-junk", { card: "card-b", expect_rev: 0 });
    const doc = getBench(drafts, "walk-intent-junk");
    assert.equal((doc as unknown as Record<string, unknown>)["intent"], 42, "junk intent rides untouched");
  });

  test("add_stage without a real card refuses by name", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "walk-card" });
    assert.match(
      await codeOf(addStageBench(drafts, "walk-card", { card: 42, expect_rev: 0 })),
      /card is required/,
    );
    assert.match(
      await codeOf(addStageBench(drafts, "walk-card", { card: "", expect_rev: 0 })),
      /card is required/,
    );
  });

  test("grouping and ungrouping a row whose params is junk judges it over empty params", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-grp-junk", {
      stages: [
        { id: "s_0", card: "card-a", params: "not-an-object bag" },
        { id: "s_1", card: "card-b", params: {} },
      ],
    });
    await groupBench(drafts, "walk-grp-junk", { stages: ["s_0", "s_1"], expect_rev: 0 });
    const grouped = getBench(drafts, "walk-grp-junk").stages as unknown as Array<Record<string, unknown>>;
    const compound = grouped.find((r): boolean => r["card"] === "group");
    assert.ok(compound, "the compound landed");
    await ungroupBench(drafts, "walk-grp-junk", { stage: String(compound!["id"]), expect_rev: 1 });
    const flat = getBench(drafts, "walk-grp-junk").stages as unknown as Array<Record<string, unknown>>;
    assert.ok(flat.some((r): boolean => r["id"] === "s_0"), "the junk-params row spilled back flat");
  });

  test("clear with a stated author lands the entry under that author", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "walk-clear-auth" });
    await addStageBench(drafts, "walk-clear-auth", { card: "card-a", expect_rev: 0 });
    const cleared = await clearBench(drafts, "walk-clear-auth", { expect_rev: 1, author: "user" });
    assert.ok(cleared.rev >= 2, "the clear landed");
    const read = getBench(drafts, "walk-clear-auth");
    assert.equal((read.stages as unknown[]).length, 0, "the bench is empty");
  });
});

test("a load onto a doc whose intent is junk walks the sync past it", async () => {
  const drafts = await boot();
  await seed(drafts, "walk-intent-load", {
    stages: [{ id: "s_0", card: "card-a", params: {} }],
    intent: 42,
  });
  await ensureBench(drafts, {
    session: "walk-intent-load",
    stages: [{ id: "s_0", card: "card-a", params: {} }],
    overwrite: true,
    expect_rev: 0,
  });
  const doc = getBench(drafts, "walk-intent-load");
  assert.equal((doc as unknown as Record<string, unknown>)["intent"], 42, "junk intent rides untouched through a load");
});

test("a rewire-undo over a bench holding an id-less row reads it as no id", async () => {
  const drafts = await boot();
  await seed(drafts, "walk-rewire-noid", {
    stages: [
      { params: { seed: 1 } },
      { id: "rw", card: "card-a", params: {}, inputs: {} },
    ],
    bench: {
      rev: 1,
      log: [
        entry(1, "rewire", "agent", { stage: "rw", input: "image", added: true }),
      ],
    },
  });
  await undoBench(drafts, "walk-rewire-noid", { n: 1, expect_rev: 1 });
  const row = (getBench(drafts, "walk-rewire-noid").stages as Array<Record<string, unknown>>).find((x) => x["id"] === "rw")!;
  assert.ok(!("image" in (row["inputs"] as Record<string, unknown>)), "the added wire came back off over the id-less sibling");
});
