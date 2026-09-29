import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  addStageBench, clearBench, ensureBench, getBench, removeStageBench, rewireBench, undoBench,
} from "../src/bench.ts";
import { boot, codeOf, seed } from "./bench-helpers.ts";

// ── THE OPERATOR'S WEDGE (2026-10-10, pinned same day) ───────────
// The burn, live on the lane: a bench carried a wire to a stage
// that no longer existed ('input input_image wires stage s_2 — no
// such stage on the bench (live: s_3…s_8)'). Every repair verb
// re-judged the WHOLE bench and refused on that pre-existing
// dangle: remove was wedged ("I CAN'T EVEN CLEAR OR DELETE"), add
// was wedged, group was wedged — no door could cure a state no
// door admits creating (an interleaved write birthed it).
//
// THE UN-WEDGE LAW: a wiring judgment refuses the danglings the
// VERB CREATES; a dead ref a row already carried before the verb
// passes through (the run door names it — selection/dangling is
// its voice). The cure doors are rewire-clear (heals the row) and
// remove (deletes the broken row) — neither may refuse on the
// very state it cures. A verb that would NEWLY wire a dead stage
// still refuses (the 2026-10-10 survivors law and the 2026-09-15
// phantom-wire cure both stand).

/** The operator's bench: s_2 gone, s_3 wiring its corpse, healthy
 *  s_4/s_5/s_6 behind it (ids verbatim from the lane). Fresh copy
 *  per seed — the domain caches doc objects by reference, so a
 *  shared literal would carry one test's splices into the next. */
const wedged = (): Array<Record<string, unknown>> => structuredClone([
  { id: "s_3", card: "image-edit", params: { image: "$input_image", prompt: "x" },
    inputs: { input_image: { stage: "s_2", output: "image" } } },
  { id: "s_4", card: "image-edit", params: { image: "$input_image", prompt: "x" },
    inputs: { input_image: { stage: "s_3", output: "image" } } },
  { id: "s_5", card: "image-gen", params: { prompt: "x" }, inputs: {} },
  { id: "s_6", card: "image-gen", params: { prompt: "x" }, inputs: {} },
] as Array<Record<string, unknown>>);

describe("the un-wedge law (a pre-existing dangle strands no door)", () => {
  test("remove of an UNRELATED stage lands on the wedged bench", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const row = await removeStageBench(drafts, "s", { stage: "s_5", expect_rev: 0 });
    assert.equal(row.stage, "s_5");
    const after = getBench(drafts, "s");
    assert.deepEqual(
      (after.stages as Array<{ id: string }>).map((r) => r.id),
      ["s_3", "s_4", "s_6"],
    );
  });

  test("the broken row's repair order: clear the dependent wire, then the row deletes", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    // s_4 HEALTHY-wires s_3 — removing s_3 would CREATE s_4's
    // dangle, so the survivors law refuses with the cure named.
    // (The broken row's OWN dead wire to s_2 never refuses the
    // remove: it deletes with the row.)
    const refusal = await codeOf(removeStageBench(drafts, "s", { stage: "s_3", expect_rev: 0 }));
    assert.match(refusal, /bench\/wire-stage-not-found/);
    assert.match(refusal, /s_4/);
    // THE OPERATOR'S REPAIR PATH, end to end: drop the dependent
    // wire (the cure door), then the broken row deletes clean.
    await rewireBench(drafts, "s", { stage: "s_4", input: "input_image", expect_rev: 0 });
    const row = await removeStageBench(drafts, "s", { stage: "s_3", expect_rev: 1 });
    assert.equal(row.stage, "s_3");
    const after = getBench(drafts, "s");
    assert.deepEqual(
      (after.stages as Array<{ id: string }>).map((r) => r.id),
      ["s_4", "s_5", "s_6"],
    );
  });

  test("add_stage lands on the wedged bench (the new row is judged, not the old wounds)", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const row = await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    assert.equal(row.stage, "s_7");
  });

  test("rewire-clear HEALS the dead wire (the cure door never refuses the cure)", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const row = await rewireBench(drafts, "s", { stage: "s_3", input: "input_image", expect_rev: 0 });
    assert.equal(row.stage, "s_3");
    const after = getBench(drafts, "s");
    const healed = (after.stages as Array<{ id: string; inputs: Record<string, unknown> }>)
      .find((r) => r.id === "s_3");
    assert.equal(healed?.inputs["input_image"], undefined);
  });

  test("rewire still refuses NEWLY wiring a dead stage (creation law intact)", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const refusal = await codeOf(rewireBench(drafts, "s", {
      stage: "s_5", input: "image", from: { stage: "s_2", output: "image" }, expect_rev: 0,
    }));
    assert.match(refusal, /bench\/wire-stage-not-found/);
  });

  test("remove of a HEALTHY wired stage still refuses (the 2026-10-10 survivors law stands)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s", stages: [
      { id: "s_0", card: "image-gen", params: { prompt: "x" }, inputs: {} },
      { id: "s_1", card: "image-edit", params: { image: "$input_image", prompt: "x" },
        inputs: { input_image: { stage: "s_0", output: "image" } } },
    ] });
    const refusal = await codeOf(removeStageBench(drafts, "s", { stage: "s_0", expect_rev: 0 }));
    assert.match(refusal, /bench\/wire-stage-not-found/);
  });
});

describe("clear — the operator's demanded door (there was no clear all)", () => {
  test("clear empties ANY bench — even a wedged one — in one verb", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const row = await clearBench(drafts, "s", { expect_rev: 0 });
    assert.equal(row.cleared, 4);
    const after = getBench(drafts, "s");
    assert.deepEqual(after.stages, []);
  });

  test("clear is ONE log entry and undo restores every stage", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const cleared = await clearBench(drafts, "s", { expect_rev: 0 });
    const undone = await undoBench(drafts, "s", { n: 1, expect_rev: cleared.rev });
    assert.deepEqual(undone.undone, [cleared.rev]);
    const after = getBench(drafts, "s");
    assert.deepEqual(
      (after.stages as Array<{ id: string }>).map((r) => r.id),
      ["s_3", "s_4", "s_5", "s_6"],
    );
  });

  test("clear refuses unknown keys and guards CAS like every door", async () => {
    const drafts = await boot();
    // seeded straight into the domain — the wedged doc was born clean
    // and DANGLED LATER (an interleaved write); no door admits
    // creating it, so the test seeds the corpse the way the lane
    // got it (the log is data).
    await seed(drafts, "s", { stages: wedged() });
    const refusal = await codeOf(clearBench(drafts, "s", { expect_rev: 0, stages: [] }));
    assert.match(refusal, /bench\/bad-body/);
    const stale = await codeOf(clearBench(drafts, "s", { expect_rev: 4 }));
    assert.match(stale, /bench\/cas/);
  });
});
