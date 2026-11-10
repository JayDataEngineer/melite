/**
 * useCallMutations — call-structure setters (BEHAVIORAL).
 *
 * PINS: extend (empty/shrink/grow, snapped to the grid), addCallAt
 * (interior split on a legal boundary — §0.5: identity carries, the
 * seam births cut, downstream rebases; refusal on no-legal-splice;
 * boundary append, empty-doc seed), guides (set/clear/no-op/range),
 * transition (mode switch re-frames the span by the 22f carry),
 * prev-sec (set/clear/validation), refs (set/clear/prune), span
 * (start/end clamps + neighbor ripple + grid snap + the no-legal-
 * seam fence), snapSplitFrame (null when no interior frame serves
 * both halves), knobs (set/clear/prune).
 *
 * THE FIXTURES ARE ON THE CARD'S GRID (2026-09-25, the uniform span
 * gate): a first window is 22+17f, a carried window is 17f, and calls
 * tile. `A`/`B` below are the legal pair the card admits.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useCallMutations } from "../src/ui/studio/useCallMutations.ts"
import { snapCallLength, snapSplitFrame } from "../src/ui/studio/docGrid.ts"
import { DOC_FPS_DEFAULT } from "@melite/models-h3/timelineContract"
import type { DocCall } from "../src/ui/studio/docModel.ts"

function harness(initial: DocCall[], fps = 24) {
  return renderHook(() => {
    const [calls, setCalls] = useState(initial)
    const m = useCallMutations(setCalls, fps)
    return { calls, ...m }
  })
}

/** 0→56 is 22+17k (a first window); 56→124 is 17k (carried). */
const A: DocCall = { text: "a", start_frame: 0, end_frame: 56 }
const B: DocCall = { text: "b", start_frame: 56, end_frame: 124 }

describe("handleExtend", () => {
  it("grows the last call's exclusive end, snapped to its legal length", () => {
    const { result } = harness([A])
    // A is the FIRST window → its length is 22+17k: 120 snaps to 124
    act(() => { result.current.handleExtend(120) })
    assert.equal(result.current.calls[0]!.end_frame, 124)
    const carried = harness([A, B])
    act(() => { carried.result.current.handleExtend(200) })
    // B is carried → 17k: 200 - 56 = 144 snaps to 136 (17×8)
    assert.equal(carried.result.current.calls[1]!.end_frame, 56 + 136)
  })

  it("empty docs and shrinks no-op (never a new array)", () => {
    const { result } = harness([])
    const beforeEmpty = result.current.calls
    act(() => { result.current.handleExtend(50) })
    assert.ok(result.current.calls === beforeEmpty)
    const { result: r2 } = harness([A])
    const before = r2.current.calls
    act(() => { r2.current.handleExtend(56) })
    act(() => { r2.current.handleExtend(10) })
    assert.ok(r2.current.calls === before)
    expect(r2.current.calls.length).toBe(1)
  })
})

describe("addCallAt", () => {
  // (§0.5, the window split — re-pinned 2026-11-09) the split is ONE
  // call becoming ITS OWN two halves, never a fresh TODO spliced in:
  // identity carries whole, the seam between the halves states cut
  // (the only seam a split can birth), the right half authors its
  // 17k content + the 22f cut price (a plain span), and everything
  // downstream rebases by that price.
  it("splits the containing call where BOTH halves are legal — identity carries, the new seam is a cut", () => {
    const { result } = harness([A, B])
    // gesture 24 → the nearest frame that leaves a legal left half
    // (22+17k) and a legal right CONTENT (17k) is 22
    act(() => { result.current.addCallAt(24) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 22], [22, 78], [78, 146]])
    // the right half is A's second half, not a fresh call: text rides
    assert.equal(result.current.calls[1]!.text, "a")
    // the seam between the halves states cut (overlap 0 — the §0.5 glue)
    assert.equal(result.current.calls[1]!.transition, "cut")
    // B rebases by the +22f cut price, its own seam untouched
    assert.equal(result.current.calls[2]!.text, "b")
    assert.equal(result.current.calls[2]!.start_frame, 78)
  })

  it("the whole identity carries into BOTH halves (refs, knobs, guides, last_frame)", () => {
    const full: DocCall = {
      ...A,
      refs: { images: "hero.png" },
      knobs: { denoise: 0.55 },
      image: "still.png",
      last_frame: "end.png",
    }
    const { result } = harness([full, B])
    act(() => { result.current.addCallAt(24) })
    const [left, right] = result.current.calls
    for (const half of [left, right]) {
      assert.equal(half!.refs?.images, "hero.png")
      assert.equal(half!.knobs?.denoise, 0.55)
      assert.equal(half!.image, "still.png")
      assert.equal(half!.last_frame, "end.png")
    }
    // the halves differ ONLY in span + the cut seam
    assert.equal(left!.transition, undefined)
    assert.equal(right!.transition, "cut")
  })

  it("splitting a carried call keeps ITS seam and births a cut at the split", () => {
    // B (carried at index 1) splits at its only interior legal frame
    // (73): left stays carried 17k, right authors 51 content + 22
    const { result } = harness([A, B, { text: "c", start_frame: 124, end_frame: 190 }] as DocCall[])
    act(() => { result.current.addCallAt(80) })
    assert.deepEqual(
      result.current.calls.map((c) => [c.start_frame, c.end_frame]),
      [[0, 56], [56, 73], [73, 146], [146, 212]],
    )
    assert.equal(result.current.calls[1]!.text, "b")
    assert.equal(result.current.calls[1]!.transition, undefined)
    assert.equal(result.current.calls[2]!.text, "b")
    assert.equal(result.current.calls[2]!.transition, "cut")
    assert.equal(result.current.calls[3]!.start_frame, 146)
  })

  it("REFUSAL (§0.5): a window with no legal split refuses loud — onRefuse fires once, the doc keeps identity", () => {
    // the 22f base window has no interior frame leaving a legal pair
    const doc: DocCall[] = [{ text: "a", start_frame: 0, end_frame: 22 }]
    const onRefuse = vi.fn()
    const { result } = harness(doc)
    act(() => { result.current.addCallAt(10, onRefuse) })
    assert.ok(result.current.calls === doc, "the refused write returns the SAME array")
    expect(onRefuse).toHaveBeenCalledTimes(1)
    // the carried step (17k authored, no interior legal frame) refuses too
    const carried: DocCall[] = [A, { text: "b", start_frame: 56, end_frame: 73 }]
    const onRefuse2 = vi.fn()
    const r2 = harness(carried)
    act(() => { r2.result.current.addCallAt(60, onRefuse2) })
    assert.ok(r2.result.current.calls === carried)
    expect(onRefuse2).toHaveBeenCalledTimes(1)
  })

  it("boundary/past-end frames append a fresh call on the grid (empty TODO, never junk)", () => {
    const { result } = harness([A])
    act(() => { result.current.addCallAt(56) })
    // 2s = 48f, carried → 17k snaps to 51
    assert.deepEqual(result.current.calls[1], { text: "", start_frame: 56, end_frame: 107 })
    act(() => { result.current.addCallAt(500) })
    assert.equal(result.current.calls[2]!.start_frame, 107)
  })

  it("an empty doc seeds at 0 (fps-scaled, on the first window's grid)", () => {
    const { result } = harness([], 24)
    act(() => { result.current.addCallAt(10) })
    // the first window is plain (no carry): 48 snaps to 56
    assert.deepEqual(result.current.calls, [{ text: "", start_frame: 0, end_frame: 56 }])
    const tiny = harness([], 0)
    act(() => { tiny.result.current.addCallAt(0) })
    // the shortest legal first window is the 22f base, never 1f
    assert.equal(tiny.result.current.calls[0]!.end_frame, 22)
  })

  // (timeline-plane wave-2 G5, the S11 seat) the fresh call's booked
  // LENGTH was unwalled: it books TWO SECONDS of frames at the doc
  // clock (the seat's own fps × 2), snapped by the grid's real law —
  // derived here through the const and the shared snap, never a
  // frozen 48. The stated-fps arm proves the booking rides the PASSED
  // clock, not the default.
  it("the appended call books fps×2 frames at the doc clock (G5)", () => {
    const { result } = harness([A], DOC_FPS_DEFAULT)
    act(() => { result.current.addCallAt(A.end_frame) })
    const booked = result.current.calls[1]!
    assert.equal(
      booked.end_frame - booked.start_frame,
      snapCallLength(Math.round(DOC_FPS_DEFAULT * 2), true),
      `a fresh call books 2s of frames at ${DOC_FPS_DEFAULT}fps, snapped carried`,
    )
    const slow = harness([A], 12)
    act(() => { slow.result.current.addCallAt(A.end_frame) })
    const bookedSlow = slow.result.current.calls[1]!
    assert.equal(
      bookedSlow.end_frame - bookedSlow.start_frame,
      snapCallLength(Math.round(12 * 2), true),
      "the booking rides the passed fps — 12fps books half the frames",
    )
  })
})

describe("addFirstWindowCut (D-19 — the derived whole-film first cut)", () => {
  it("materializes BOTH halves in one write — the split law's lattice, the right half's reflow, the cut seam", () => {
    // the derived window is the whole film [0, 56): a 28f gesture
    // snaps to the lattice's nearest legal split (22 — left 22
    // uncarried, right 34 carried), and the right half reflows by
    // the cut conversion (+22) to end 78
    const { result } = harness([])
    act(() => { result.current.addFirstWindowCut(56, 28) })
    const calls = result.current.calls
    assert.equal(calls.length, 2, "the first cut writes BOTH halves in ONE setCalls")
    assert.deepEqual(
      [calls[0]!.start_frame, calls[0]!.end_frame, calls[0]!.text],
      [0, 22, ""],
      "the left half is a genuine first window on the grid",
    )
    assert.deepEqual(
      [calls[1]!.start_frame, calls[1]!.end_frame, calls[1]!.transition],
      [22, 78, "cut"],
      "the right half carries the CUT seam and the reflowed end (22+34+22)",
    )
    // the extent rounds — a fractional film total never mints junk
    const frac = harness([])
    act(() => { frac.result.current.addFirstWindowCut(55.6, 28) })
    assert.equal(frac.result.current.calls[1]!.end_frame, 78,
      "a fractional extent rounds to the frame (55.6 → 56) before the lattice")
  })

  it("REFUSES LOUD when no legal split serves the derived window — the doc stays empty, the same array", () => {
    // [0, 34): left must be 22 (the only uncarried lattice point
    // inside), right 12 is not carried-legal → no split serves
    const onRefuse = vi.fn()
    const { result } = harness([])
    const before = result.current.calls
    act(() => { result.current.addFirstWindowCut(34, 17, onRefuse) })
    assert.equal(onRefuse.mock.calls.length, 1, "onRefuse fires ONCE (never a silent no-op)")
    assert.ok(result.current.calls === before,
      "the empty doc keeps its identity — the derived window keeps painting")
  })

  it("GUARDS the occupied doc LOUD — authored spans cut through addCallAt, never here", () => {
    const onRefuse = vi.fn()
    const { result } = harness([A])
    const before = result.current.calls
    act(() => { result.current.addFirstWindowCut(56, 28, onRefuse) })
    assert.equal(onRefuse.mock.calls.length, 1,
      "the occupied doc refuses loud (the disease class this cure names is the silent drop)")
    assert.ok(result.current.calls === before, "the authored doc is untouched")
  })
})

describe("setCallGuide", () => {
  it("wires a guide; clearing detaches (the key drops)", () => {
    const { result } = harness([A])
    act(() => { result.current.setCallGuide(0, "image", "still-a") })
    assert.equal(result.current.calls[0]!.image, "still-a")
    act(() => { result.current.setCallGuide(0, "image", "   ") })
    assert.ok(!("image" in result.current.calls[0]!))
  })

  it("out-of-range and same-source writes no-op", () => {
    const { result } = harness([{ ...A, image: "s" }])
    const before = result.current.calls
    act(() => {
      result.current.setCallGuide(-1, "image", "x")
      result.current.setCallGuide(7, "image", "x")
      result.current.setCallGuide(0, "image", "s")
    })
    assert.ok(result.current.calls === before)
  })
})

describe("setCallTransition", () => {
  it("writes the seam mode; the carry itself is automatic (never authored)", () => {
    // (2026-09-20: the seconds picker died with the MotionContext
    // seam — the drift-control continuation carries every non-cut
    // join at the director's proven 22 frames)
    const { result } = harness([{ ...A, transition: "cut" }])
    act(() => { result.current.setCallTransition(0, "extend") })
    assert.equal(result.current.calls[0]!.transition, "extend")
    act(() => { result.current.setCallTransition(0, "cut") })
    assert.equal(result.current.calls[0]!.transition, "cut")
  })

  it("THE SEAM TOGGLE RE-FRAMES BY THE 22f CARRY (both shapes stay legal)", () => {
    const { result } = harness([A, B])
    // B is carried at 17k (68f). Toggling to cut makes its span plain
    // (22+17k): the same generated length, now 68+22 = 90f authored.
    act(() => { result.current.setCallTransition(1, "cut") })
    assert.equal(result.current.calls[1]!.transition, "cut")
    assert.equal(result.current.calls[1]!.end_frame, 56 + 90)
    // and back: the authored span gives its 22 frames to the seam
    act(() => { result.current.setCallTransition(1, "extend") })
    assert.equal(result.current.calls[1]!.end_frame, 124)
  })

  it("a first window carries nothing either way (no re-frame)", () => {
    const { result } = harness([A])
    act(() => { result.current.setCallTransition(0, "cut") })
    assert.equal(result.current.calls[0]!.end_frame, 56)
  })

  it("the toggle ripples the neighbor's start (the tiling holds)", () => {
    const { result } = harness([A, B, { text: "c", start_frame: 124, end_frame: 190 }])
    act(() => { result.current.setCallTransition(1, "cut") })
    assert.equal(result.current.calls[2]!.start_frame, 146)
  })

  it("same-mode and out-of-range writes no-op", () => {
    const { result } = harness([A])
    const before = result.current.calls
    act(() => {
      result.current.setCallTransition(0, "cut")
    })
    // transition was undefined → setting cut writes (not a no-op)
    assert.equal(result.current.calls[0]!.transition, "cut")
    const after = result.current.calls
    act(() => {
      result.current.setCallTransition(0, "cut")
      result.current.setCallTransition(9, "extend")
      result.current.setCallTransition(-1, "extend")
    })
    assert.ok(result.current.calls === after)
    expect(before).not.toBe(after)
  })
})

describe("setCallRefs", () => {
  it("sets trimmed refs; blank drops the key; last key drops the bag", () => {
    const { result } = harness([A])
    act(() => { result.current.setCallRefs(0, "images", "  a, b  ") })
    assert.deepEqual(result.current.calls[0]!.refs, { images: "a, b" })
    act(() => { result.current.setCallRefs(0, "images", "   ") })
    assert.ok(!("refs" in result.current.calls[0]!))
  })

  it("same-value and out-of-range writes no-op", () => {
    const { result } = harness([{ ...A, refs: { images: "a" } }])
    const before = result.current.calls
    act(() => {
      result.current.setCallRefs(0, "images", "a")
      result.current.setCallRefs(-1, "images", "x")
      result.current.setCallRefs(4, "images", "x")
    })
    assert.ok(result.current.calls === before)
    expect(result.current.calls[0]!.refs).toEqual({ images: "a" })
  })
})

describe("setCallSpan", () => {
  it("start edits ripple into the previous call's end, snapped to ITS length", () => {
    const { result } = harness([A, B])
    // A (first, plain) at 56; a gesture of 60 would snap back onto 56,
    // so the live-step rule moves one 17f step: 73
    act(() => { result.current.setCallSpan(1, "start", 60) })
    assert.equal(result.current.calls[0]!.end_frame, 73)
    assert.equal(result.current.calls[1]!.start_frame, 73)
  })

  it("a seam gesture lands where BOTH neighbouring windows stay legal", () => {
    const { result } = harness([A, B])
    // A is 22+17k (56) and B is 17k (68): 60 snaps back onto 56, which
    // would read as a dead input, so the nearest frame where BOTH
    // lengths are legal wins — 73 (A 73 = 22+17k, B 51 = 17k)
    act(() => { result.current.setCallSpan(1, "start", 60) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 73], [73, 124]])
    // a gesture at the current seam is a no-op (identity preserved)
    const before = result.current.calls
    act(() => { result.current.setCallSpan(1, "start", 73) })
    assert.ok(result.current.calls === before)
  })

  it("a seam step that would break a neighbour is refused (the frame stays put)", () => {
    // A 0→56 (plain), B 56→73 (17k carried): the only legal seams are
    // 22, 39, 56 — stepping past 56 would need 73 frames, and B ends
    // there, so the gesture keeps the current seam and writes nothing
    const { result } = harness([A, { text: "b", start_frame: 56, end_frame: 73 }])
    const before = result.current.calls
    act(() => { result.current.setCallSpan(1, "start", 60) })
    assert.ok(result.current.calls === before)
  })

  it("a first-window start gesture snaps to its own legal length", () => {
    // 90f window, gesture 40 → 90 - 56 = 34: a legal 22+17k span, no
    // nudge needed
    const { result } = harness([{ text: "a", start_frame: 0, end_frame: 90 }])
    act(() => { result.current.setCallSpan(0, "start", 40) })
    assert.equal(result.current.calls[0]!.start_frame, 34)
  })

  it("a first-window start gesture at the 22f base is a no-op", () => {
    const { result } = harness([{ text: "a", start_frame: 0, end_frame: 22 }])
    const before = result.current.calls
    act(() => { result.current.setCallSpan(0, "start", 5) })
    assert.ok(result.current.calls === before)
  })

  it("an end step that would break the shortest window is refused", () => {
    const { result } = harness([{ text: "a", start_frame: 0, end_frame: 22 }])
    const before = result.current.calls
    act(() => { result.current.setCallSpan(0, "end", 5) })
    assert.ok(result.current.calls === before)
  })

  it("first-call start floors at 0 and snaps its own length; end edits ripple forward", () => {
    const { result } = harness([A, B])
    act(() => { result.current.setCallSpan(0, "start", -50) })
    assert.equal(result.current.calls[0]!.start_frame, 0)
    // first-call start CAN move right (no previous neighbor to ripple)
    // — only to a frame that leaves a legal 22+17k span
    act(() => { result.current.setCallSpan(0, "start", 6) })
    assert.equal(result.current.calls[0]!.start_frame, 17)
    act(() => { result.current.setCallSpan(0, "start", 20) })
    assert.equal(result.current.calls[0]!.start_frame, 34)
    act(() => { result.current.setCallSpan(0, "end", 60) })
    // 60 snaps to 73; B's start follows so the tiling holds
    assert.equal(result.current.calls[0]!.end_frame, 73)
    assert.equal(result.current.calls[1]!.start_frame, 73)
    act(() => { result.current.setCallSpan(1, "end", 200) })
    // B is carried: 200 - 73 = 127 snaps to 119 (17×7)
    assert.equal(result.current.calls[1]!.end_frame, 73 + 119)
  })

  it("end floors at the shortest legal span; no-op writes keep identity; ranges guard", () => {
    const { result } = harness([A, B])
    act(() => { result.current.setCallSpan(0, "end", -5) })
    assert.equal(result.current.calls[0]!.end_frame, 22)
    assert.equal(result.current.calls[1]!.start_frame, 22)
    const before = result.current.calls
    act(() => {
      result.current.setCallSpan(0, "start", 0)
      result.current.setCallSpan(0, "end", 22)
      result.current.setCallSpan(-1, "start", 5)
      result.current.setCallSpan(9, "end", 5)
    })
    assert.ok(result.current.calls === before)
  })
})

describe("snapSplitFrame (the §0.5 fence)", () => {
  it("returns null when NO interior frame leaves both halves legal — never the raw gesture", () => {
    // the 22f base: any interior cut leaves a sub-base left half
    assert.ok(snapSplitFrame(0, 22, false, true, 10) === null)
    // the carried step (17k authored): same law one family over
    assert.ok(snapSplitFrame(56, 73, true, true, 60) === null)
  })

  it("the nearest legal frame still wins when one exists", () => {
    assert.equal(snapSplitFrame(0, 56, false, true, 24), 22)
    assert.equal(snapSplitFrame(56, 124, true, true, 80), 73)
  })

  it("THE FENCE AT THE OTHER DOOR: a seam gesture with NO legal frame writes nothing (never the raw gesture)", () => {
    // an off-grid pair (a healed-away spelling): plain wants 22+17k,
    // plain wants 22+17k, and no interior frame serves both — the
    // fallthrough used to write the raw gesture and both halves went
    // off-grid. A legal doc always has its current seam legal, so
    // this fence fires exactly on the constructed spelling.
    const doc: DocCall[] = [
      { text: "a", start_frame: 0, end_frame: 30 },
      { text: "b", start_frame: 30, end_frame: 60, transition: "cut" },
    ]
    const { result } = harness(doc)
    act(() => { result.current.setCallSpan(1, "start", 35) })
    assert.ok(result.current.calls === doc, "no legal seam exists — nothing is written")
  })
})

describe("setCallKnob", () => {
  it("sets overrides; clearing the last one prunes the dict (absent = inherit)", () => {
    const { result } = harness([A])
    act(() => { result.current.setCallKnob(0, "denoise", 0.5) })
    assert.deepEqual(result.current.calls[0]!.knobs, { denoise: 0.5 })
    act(() => { result.current.setCallKnob(0, "denoise", undefined) })
    assert.ok(!("knobs" in result.current.calls[0]!))
  })

  it("out-of-range writes no-op", () => {
    const { result } = harness([A])
    const before = result.current.calls
    act(() => {
      result.current.setCallKnob(-1, "denoise", 1)
      result.current.setCallKnob(3, "denoise", 1)
    })
    assert.ok(result.current.calls === before)
    expect(result.current.calls.length).toBe(1)
  })
})
