// @melite/models-h3 — the multi-window composition solver at its
// own door (the multi-window unification, 2026-11-12). The card
// spec drives the compose door; this spec judges the solver's
// arithmetic directly: the exact grid composition, the refusal
// naming both neighbors, the ceiling where no over-neighbor
// exists (N saturates at 32 windows of 362f), and the default
// context overlap.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { solveWindowComposition } from "../src/extend.ts";

describe("solveWindowComposition (the multi-window arithmetic)", () => {
  it("solves 379f exactly as two 209f windows under the default 39f overlap", () => {
    const c = solveWindowComposition(379, "lib door");
    assert.deepEqual(
      { windows: c.windows, windowFrames: c.windowFrames, deliveredFrames: c.deliveredFrames },
      { windows: 2, windowFrames: 209, deliveredFrames: 379 },
      "2×209−39=379 — every window on the 22+17k grid, the seam exactly the context overlap",
    );
  });

  it("refuses 480f naming the max-under and min-over neighbors for re-statement", () => {
    assert.throws(
      () => solveWindowComposition(480, "lib door"),
      /nearest: 5 windows of 124f deliver 464f.*nearest: 2 windows of 260f deliver 481f/s,
      "the door never snaps silently — the agent re-states a composition's delivered seconds",
    );
  });

  it("refuses past the ceiling naming only the under neighbor (no over composition exists)", () => {
    assert.throws(() => solveWindowComposition(10400, "lib door"), /nearest: 32 windows of 362f deliver 10375f/);
    try {
      solveWindowComposition(10400, "lib door");
      assert.fail("10400f must refuse");
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.equal(
        (err.message.match(/nearest:/g) ?? []).length,
        1,
        "exactly one neighbor — the max-under; every grid ceil exceeds 362f so no over composition exists to name",
      );
    }
  });
});
