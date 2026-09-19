/**
 * useCallMutations — call-structure setters (BEHAVIORAL).
 *
 * PINS: extend (empty/shrink/grow), addCallAt (interior split,
 * boundary append, empty-doc seed), guides (set/clear/no-op/range),
 * transition (mode switch re-bases the carry default), prev-sec
 * (set/clear/validation), refs (set/clear/prune), span (start/end
 * clamps + neighbor ripple), knobs (set/clear/prune).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { useCallMutations } from "../src/ui/studio/useCallMutations.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"

function harness(initial: DocCall[], fps = 24) {
  return renderHook(() => {
    const [calls, setCalls] = useState(initial)
    const m = useCallMutations(setCalls, fps)
    return { calls, ...m }
  })
}

const A: DocCall = { text: "a", start_frame: 0, end_frame: 48 }
const B: DocCall = { text: "b", start_frame: 48, end_frame: 96 }

describe("handleExtend", () => {
  it("grows the last call's exclusive end", () => {
    const { result } = harness([A])
    act(() => { result.current.handleExtend(120) })
    assert.equal(result.current.calls[0]!.end_frame, 120)
  })

  it("empty docs and shrinks no-op (never a new array)", () => {
    const { result } = harness([])
    const beforeEmpty = result.current.calls
    act(() => { result.current.handleExtend(50) })
    assert.ok(result.current.calls === beforeEmpty)
    const { result: r2 } = harness([A])
    const before = r2.current.calls
    act(() => { r2.current.handleExtend(48) })
    act(() => { r2.current.handleExtend(10) })
    assert.ok(r2.current.calls === before)
    expect(r2.current.calls.length).toBe(1)
  })
})

describe("addCallAt", () => {
  it("splits the containing call (both halves keep the tiling)", () => {
    const { result } = harness([A, B])
    act(() => { result.current.addCallAt(24) })
    assert.deepEqual(result.current.calls.map((c) => [c.start_frame, c.end_frame]), [[0, 24], [24, 48], [48, 96]])
    assert.equal(result.current.calls[1]!.text, "")
  })

  it("boundary/past-end frames append a fresh 2s call (empty TODO, never junk)", () => {
    const { result } = harness([A])
    act(() => { result.current.addCallAt(48) })
    assert.deepEqual(result.current.calls[1], { text: "", start_frame: 48, end_frame: 96 })
    act(() => { result.current.addCallAt(500) })
    assert.equal(result.current.calls[2]!.start_frame, 96)
  })

  it("an empty doc seeds at 0 (fps-scaled, minimum 1 frame)", () => {
    const { result } = harness([], 24)
    act(() => { result.current.addCallAt(10) })
    assert.deepEqual(result.current.calls, [{ text: "", start_frame: 0, end_frame: 48 }])
    const tiny = harness([], 0)
    act(() => { tiny.result.current.addCallAt(0) })
    assert.equal(tiny.result.current.calls[0]!.end_frame, 1)
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
  it("start edits ripple into the previous call's end (clamped to the tiling)", () => {
    const { result } = harness([A, B])
    act(() => { result.current.setCallSpan(1, "start", 60) })
    assert.equal(result.current.calls[0]!.end_frame, 60)
    assert.equal(result.current.calls[1]!.start_frame, 60)
  })

  it("first-call start floors at 0; end edits ripple forward; tail grows the envelope", () => {
    const { result } = harness([A, B])
    act(() => { result.current.setCallSpan(0, "start", -50) })
    assert.equal(result.current.calls[0]!.start_frame, 0)
    // first-call start CAN move right (no previous neighbor to ripple)
    act(() => { result.current.setCallSpan(0, "start", 6) })
    assert.equal(result.current.calls[0]!.start_frame, 6)
    act(() => { result.current.setCallSpan(0, "end", 60) })
    assert.equal(result.current.calls[1]!.start_frame, 60)
    act(() => { result.current.setCallSpan(1, "end", 200) })
    assert.equal(result.current.calls[1]!.end_frame, 200)
  })

  it("end floors at start+1; no-op writes keep identity; ranges guard", () => {
    const { result } = harness([A, B])
    act(() => { result.current.setCallSpan(0, "end", -5) })
    assert.equal(result.current.calls[0]!.end_frame, 1)
    assert.equal(result.current.calls[1]!.start_frame, 1)
    const before = result.current.calls
    act(() => {
      result.current.setCallSpan(0, "start", 0)
      result.current.setCallSpan(0, "end", 1)
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
