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
import { nextSelectionAfterDelete, useViewSelection } from "../src/ui/studio/useViewSelection.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"

const CALLS: DocCall[] = [
  { text: "a", start_frame: 0, end_frame: 48 },
  { text: "b", start_frame: 48, end_frame: 96 },
]

function harness() {
  return renderHook(() => useViewSelection(CALLS, hydrateLayerA({ fps: 24 }), "stage-a"))
}

describe("nextSelectionAfterDelete — THE DELETE-FOLLOW LAW (all five arms; the missing-tests audit #3, 2026-11-06)", () => {
  // pure law table — no mount: the five arms the doc names. The
  // mounted arm for the same-index case already exists at
  // studio-component.spec.tsx ("DELETING the focused call clears
  // the focus"); these five own the FUNCTION's whole truth.
  const table: Array<[TimelineSelection | null, string, TimelineSelection | null, string]> = [
    [{ callIdx: 2 }, "call-5", { callIdx: 2 }, "a later delete leaves the seat untouched (nothing slid)"],
    [{ callIdx: 2 }, "call-2", null, "deleting the SELECTED call clears the focus (the index would silently repoint)"],
    [{ callIdx: 3 }, "call-1", { callIdx: 2 }, "deleting an EARLIER call walks the focus back one (the editor keeps its call)"],
    [null, "call-1", null, "a null selection (global rail) stays null"],
    [{ callIdx: 1 }, "banana", { callIdx: 1 }, "a junk delete id never touches the seat"],
  ]
  it.each(table)("%s", (selected, deletedId, want) => {
    assert.deepEqual(nextSelectionAfterDelete(selected, deletedId), want)
  })
})

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

describe("THE CLOCK DEFAULT'S NULL ARM + the submenu verbs (the missing-tests audit #4, 2026-11-06)", () => {
  it("an unstated doc falls to DEFAULT_SEGMENT_PARAMS.fps — the default's one owner", () => {
    const { result } = renderHook(() => useViewSelection(CALLS, hydrateLayerA({}), "stage-a"))
    // the CONTRACT's own default, not a second spelling: 16 is
    // VACE's proven clock (timelineTypes DEFAULT_SEGMENT_PARAMS)
    assert.equal(result.current.fps, 16)
  })

  it("the rail's views are mutually exclusive — both directions", () => {
    const { result } = harness()
    // audio submenu clears a call focus...
    act(() => { result.current.handleTimelineSelect("call-1") })
    act(() => { result.current.enterAudioView() })
    assert.equal(result.current.sub, "audio")
    assert.equal(result.current.selected, null, "entering a submenu clears the call focus")
    // ...and a call pick leaves the submenu
    act(() => { result.current.handleTimelineSelect("call-0") })
    assert.equal(result.current.sub, null, "a call pick closes the submenu")
    assert.deepEqual(result.current.selected, { callIdx: 0 })
  })

  it("the keyframes door rides the same law; the back verb leaves any submenu", () => {
    const { result } = harness()
    act(() => { result.current.enterKfView() })
    assert.equal(result.current.kfView, true)
    assert.equal(result.current.selected, null)
    act(() => { result.current.exitKfView() })
    assert.equal(result.current.sub, null)
    assert.equal(result.current.kfView, false)
  })
})
