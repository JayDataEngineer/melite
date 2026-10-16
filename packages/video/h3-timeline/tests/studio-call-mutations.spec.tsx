/**
 * useCallMutations — call-structure setters (BEHAVIORAL).
 *
 * PINS: extend (empty/shrink/grow, snapped to the grid), addCallAt
 * (interior split on a legal boundary, boundary append, empty-doc
 * seed), guides (set/clear/no-op/range), transition (mode switch
 * re-frames the span by the 22f carry), prev-sec (set/clear/
 * validation), refs (set/clear/prune), span (start/end clamps +
 * neighbor ripple + grid snap), knobs (set/clear/prune).
 *
 * THE FIXTURES ARE ON THE CARD'S GRID (2026-09-25, the uniform span
 * gate): a first window is 22+17f, a carried window is 17f, and calls
 * tile. `A`/`B` below are the legal pair the card admits.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useCallMutations } from "../src/ui/studio/useCallMutations.ts"
import { snapCallLength } from "../src/ui/studio/docGrid.ts"
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
  it("splits the containing call where BOTH halves are legal", () => {
    const { result } = harness([A, B])
    // gesture 24 → the nearest frame that leaves a legal left half
    // (22+17k) and a legal carried right half (17k) is 22
    act(() => { result.current.addCallAt(24) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 22], [22, 56], [56, 124]])
    assert.equal(result.current.calls[1]!.text, "")
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
