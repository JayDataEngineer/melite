/**
 * docGrid — THE AUTHORING GRID (studio side, BEHAVIORAL).
 *
 * PINS: the two length families (first/cut = 22+17f, carried = 17f),
 * the shortest legal span, nearest-legal snapping, the both-halves-legal
 * split search, and the seam toggle's exact 22f re-frame.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import {
  GRID_BASE,
  GRID_STEP,
  isCarriedShape,
  isLegalCallLength,
  reflowSeamSpan,
  parseFrameEdit,
  snapCallEnd,
  snapCallLength,
  snapSplitFrame,
  shortestCallLength,
  snapCutDelta,
  healOffGridCalls,
} from "../src/ui/studio/docGrid.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"

const A: DocCall = { text: "a", start_frame: 0, end_frame: 56 }
const B: DocCall = { text: "b", start_frame: 56, end_frame: 124 }

describe("the two length families", () => {
  it("a first window carries nothing; a later non-cut window does", () => {
    assert.equal(isCarriedShape(0, { transition: "cut" }), false)
    assert.equal(isCarriedShape(0, {}), false, "the FIRST window has no predecessor to carry")
    assert.equal(isCarriedShape(1, {}), true, "absent transition = extend = carried")
    assert.equal(isCarriedShape(1, { transition: "extend" }), true)
    assert.equal(isCarriedShape(1, { transition: "cut" }), false)
  })

  it("first/cut lengths are 22+17k; carried lengths are 17k", () => {
    assert.ok(isLegalCallLength(22, false))
    assert.ok(isLegalCallLength(39, false))
    assert.ok(isLegalCallLength(56, false))
    assert.ok(isLegalCallLength(362, false))
    assert.ok(!isLegalCallLength(21, false))
    assert.ok(!isLegalCallLength(38, false))
    assert.ok(!isLegalCallLength(379, false))
    assert.ok(!isLegalCallLength(56.5, false))
    assert.ok(isLegalCallLength(17, true))
    assert.ok(isLegalCallLength(340, true))
    assert.ok(!isLegalCallLength(51, false), "a 17k span is NOT a legal no-carry length")
    assert.ok(!isLegalCallLength(16, true))
    assert.ok(!isLegalCallLength(341, true), "341 + 22 would blow past the 362 ceiling")
  })

  it("the shortest legal span follows the shape", () => {
    assert.equal(shortestCallLength(0, {}), 22)
    assert.equal(shortestCallLength(1, {}), 17)
    assert.equal(GRID_BASE, 22)
    assert.equal(GRID_STEP, 17)
  })
})

describe("snapCallLength", () => {
  it("snaps to the nearest legal length of the shape", () => {
    assert.equal(snapCallLength(48, false), 56)
    assert.equal(snapCallLength(1, false), 22, "the floor is the 22f base, never 1f")
    assert.equal(snapCallLength(9999, false), 362, "the ceiling is the engine's own")
    assert.equal(snapCallLength(48, true), 51)
    assert.equal(snapCallLength(1, true), 17, "the carried floor is one 17f step")
    assert.equal(snapCallLength(9999, true), 340, "carried + 22 must stay under 362")
  })
})

describe("snapCallEnd", () => {
  it("keeps the operator's start and snaps the length", () => {
    assert.equal(snapCallEnd(A, 0, 120), 124)
    assert.equal(snapCallEnd(B, 1, 200), 56 + 136)
    // a cut window snaps the plain family
    assert.equal(snapCallEnd({ ...B, transition: "cut" }, 1, 200), 56 + 141)
  })
})

describe("snapSplitFrame", () => {
  it("keeps a gesture that already leaves both halves legal", () => {
    // 0→124: left plain lengths 22+17k, right carried lengths 17k
    assert.equal(snapSplitFrame(0, 124, false, true, 73), 73)
  })

  it("moves to the nearest frame where BOTH halves are legal", () => {
    assert.equal(snapSplitFrame(0, 124, false, true, 24), 22, "22 is the nearest legal seam to 24")
    assert.equal(snapSplitFrame(0, 124, false, true, 60), 56)
    // legal seams here are 56, 73, 90, 107 — 100 lands on 107
    assert.equal(snapSplitFrame(0, 124, false, true, 100), 107)
  })

  it("a window with no legal seam keeps the gesture (the setter then no-ops)", () => {
    // 22→30: no frame leaves a legal carried right half
    assert.equal(snapSplitFrame(22, 30, false, true, 25), 25)
    // 0→90 with a cut on BOTH sides has no legal seam either: a plain
    // length (22+17k) can never pair to 90 with another plain length
    assert.equal(snapSplitFrame(0, 90, false, false, 50), 50)
  })
})

describe("reflowSeamSpan", () => {
  it("moves the 22f carry between the authored span and the seam head", () => {
    const carried = { ...B }
    assert.equal(reflowSeamSpan(carried, 1, "cut"), 56 + 68 + 22, "extend 68f → cut 90f")
    const cut = { ...B, transition: "cut" as const, end_frame: 56 + 90 }
    assert.equal(reflowSeamSpan(cut, 1, "extend"), 124, "cut 90f → extend 68f")
  })

  it("a first window carries nothing either way (no re-frame)", () => {
    assert.equal(reflowSeamSpan(A, 0, "cut"), 56)
    assert.equal(reflowSeamSpan({ ...A, transition: "cut" }, 0, "extend"), 56)
  })
})

describe("parseFrameEdit (the span seat's one narrowing)", () => {
  it("numeric strings round into frame writes; everything else writes nothing", () => {
    assert.equal(parseFrameEdit("12.6"), 13, "rounds to the nearest frame")
    assert.equal(parseFrameEdit(" 8 "), 8, "whitespace-trimmed like the spec parse")
    assert.equal(parseFrameEdit(""), undefined, "an empty edit is no edit")
    assert.equal(parseFrameEdit("abc"), undefined, "non-numeric is no write, never NaN")
    // the grammar seam's unknown door: no DOM face emits a non-string
    // today — this arm pins the narrowing the two span seats share.
    assert.equal(parseFrameEdit(12), undefined)
    assert.equal(parseFrameEdit(undefined), undefined)
  })
})

// ── THE GRID HEAL + CUT SNAP (operator 2026-11-05: "I can't even run
// defaults" — a drag-authored 57f window refused the WHOLE compose) ──
describe("the grid heal (a doc never refuses the run)", () => {
  it("healOffGridCalls snaps an off-grid first window to the nearest legal and rebases the tiling", () => {
    const healed = healOffGridCalls([
      { text: "a", start_frame: 0, end_frame: 57 },
      { text: "b", start_frame: 57, end_frame: 119 },
    ])
    // 57 → 56 (22+17k), the follower rebases onto the healed cut
    assert.equal(healed[0]!.end_frame - healed[0]!.start_frame, 56)
    assert.equal(healed[1]!.start_frame, healed[0]!.end_frame)
    for (const [i, c] of healed.entries()) {
      assert.ok(isLegalCallLength(c.end_frame - c.start_frame, isCarriedShape(i, c)), `window ${i} legal after heal`)
    }
  })

  it("healOffGridCalls floors constructed junk — never refuses (an unfinished card still renders)", () => {
    const healed = healOffGridCalls([{ text: "", start_frame: 0, end_frame: 0 }])
    assert.equal(healed[0]!.end_frame - healed[0]!.start_frame, 22)
  })

  it("a legal doc passes through byte-identical (lengths + order)", () => {
    const doc = [
      { text: "a", start_frame: 0, end_frame: 124 },
      { text: "b", start_frame: 124, end_frame: 243 },
    ]
    assert.deepEqual(healOffGridCalls(doc), doc)
  })

  it("snapCutDelta lands a dragged cut on the 17-lattice — both adjacent windows stay legal", () => {
    assert.equal(snapCutDelta(57 - 39), 17)   // a 18f drag snaps to one step
    assert.equal(snapCutDelta(7), 0)          // a sub-step drag is no move
    assert.equal(snapCutDelta(-9), -17)
  })
})
