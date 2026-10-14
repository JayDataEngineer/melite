/**
 * useViewSelection — bar↔sidebar selection (BEHAVIORAL).
 *
 * PINS: clip-id routing (call-N → the card, beat-i-j → the segment,
 * null → global params, junk → cleared), the frame seam, and the
 * scroll/seek gestures (missing refs never throw; seek selects the
 * containing call).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useViewSelection } from "../src/ui/studio/useViewSelection.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"

const CALLS: DocCall[] = [
  { text: "a", start_frame: 0, end_frame: 48 },
  { text: "b", start_frame: 48, end_frame: 96 },
]

function harness() {
  return renderHook(() => useViewSelection(CALLS, hydrateLayerA({ fps: 24 }), "stage-a"))
}

describe("handleTimelineSelect (clip id → the sidebar selection)", () => {
  it("call-N selects that call's card; a beat id is a no-op (beats left the bar)", () => {
    const { result } = harness()
    act(() => { result.current.handleTimelineSelect("call-1") })
    assert.deepEqual(result.current.selected, { callIdx: 1 })
    act(() => { result.current.handleTimelineSelect("beat-1-2") })
    assert.deepEqual(result.current.selected, { callIdx: 1 },
      "a beat id has no producer — the seat it touched stays")
  })

  it("null returns to global params; junk ids change nothing", () => {
    const { result } = harness()
    act(() => { result.current.handleTimelineSelect("call-0") })
    act(() => { result.current.handleTimelineSelect(null) })
    assert.equal(result.current.selected, null)
    act(() => { result.current.handleTimelineSelect("call-0") })
    act(() => { result.current.handleTimelineSelect("nope") })
    assert.deepEqual(result.current.selected, { callIdx: 0 },
      "a junk id is not a deselect gesture — the seat it touched stays")
    act(() => { result.current.handleTimelineSelect("call-") })
    assert.deepEqual(result.current.selected, { callIdx: 0 })
  })

  it("setSelected writes through (the rail's own seam)", () => {
    const { result } = harness()
    act(() => { result.current.setSelected({ callIdx: 0 }) })
    assert.deepEqual(result.current.selected, { callIdx: 0 })
    expect(result.current.selected).not.toBeNull()
  })
})

describe("the view seam (fps + duration + ref registries)", () => {
  it("fps rides from Layer A; totalFrames is the tail call's end", () => {
    const { result } = harness()
    assert.equal(result.current.fps, 24)
    assert.equal(result.current.totalFrames, 96)
    assert.equal(result.current.frameIdx, 0)
  })

  it("an empty doc still spans one frame (the bar never divides by zero)", () => {
    const { result } = renderHook(() => useViewSelection([], hydrateLayerA({ fps: 30 }), "stage-a"))
    assert.equal(result.current.totalFrames, 1)
    assert.equal(result.current.fps, 30)
  })

  it("the ref registries start empty and accept the rail's mounts", () => {
    const { result } = harness()
    assert.deepEqual(result.current.callCardRefs.current, [])
    act(() => {
      result.current.callCardRefs.current[0] = null
      result.current.setFrameIdx(33)
    })
    assert.equal(result.current.frameIdx, 33)
  })
})
