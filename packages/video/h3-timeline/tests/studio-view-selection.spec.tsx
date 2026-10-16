/**
 * useViewSelection — bar↔sidebar selection (BEHAVIORAL).
 *
 * PINS: clip-id routing (call-N → the card; a beat id has no
 * producer and is a no-op — the beat plane left the bar), null →
 * global params AND exits any open submenu, junk → cleared, the
 * frame seam, and the sub seat's own verbs (enter/exit/replace —
 * the h3-submenu audit M1/M2/M4, 2026-11-06).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { nextSelectionAfterDelete, useViewSelection } from "../src/ui/studio/useViewSelection.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import { DOC_FPS_DEFAULT } from "@melite/models-h3/timelineContract"

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
  it("an unstated doc falls to DOC_FPS_DEFAULT — the default's one owner (ONE CLOCK, AUDIO-2)", () => {
    const { result } = renderHook(() => useViewSelection(CALLS, hydrateLayerA({}), "stage-a"))
    // the SCHEMA ROW's own default (24), not a second spelling: the
    // walk fills the same value, the mix divides by it, the stamps
    // book at it — the retired timeline-vocabulary 16 was the third
    // clock of AUDIO-2's split (a 64-frame clip booked 4.0s in the
    // bar while the compose stamped 2.67s)
    assert.equal(result.current.fps, 24)
    assert.equal(result.current.fps, DOC_FPS_DEFAULT)
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

describe("the sub seat directly (the h3-submenu audit M1/M2/M4, 2026-11-06)", () => {
  // The hook is the truth home of the seat; the component arms ride
  // the doors. These arms drive the seat verbs themselves.
  it("enterSub seats the view and clears the focus; exitSub empties it (M1)", () => {
    const { result } = harness()
    act(() => { result.current.handleTimelineSelect("call-1") })
    act(() => { result.current.enterSub("audio") })
    assert.equal(result.current.sub, "audio")
    assert.equal(result.current.selected, null, "seating a submenu clears the call focus")
    act(() => { result.current.exitSub() })
    assert.equal(result.current.sub, null)
    assert.equal(result.current.kfView, false, "exitSub also retires the compat seat")
  })

  it("a second submenu REPLACES the first — the rail is one view, never two (M4)", () => {
    const { result } = harness()
    act(() => { result.current.enterSub("audio") })
    act(() => { result.current.enterSub("keyframes") })
    assert.equal(result.current.sub, "keyframes", "the later door wins")
    assert.notEqual(result.current.sub, "audio")
    act(() => { result.current.enterSub("audio") })
    assert.equal(result.current.sub, "audio", "the law holds in the other direction")
  })

  it("a click-away (null select) EXITS an open submenu (M2)", () => {
    const { result } = harness()
    act(() => { result.current.enterSub("audio") })
    act(() => { result.current.handleTimelineSelect(null) })
    assert.equal(result.current.sub, null, "the empty-timeline click leaves the audio view, not only the focus")
  })

  it("a stage re-seat clears an open submenu (M3, the seat's own door — renderHook rerender; the component arm is a filed debt below)", () => {
    // THE COMPONENT-LEVEL TWIN IS A FILED DEBT (h3-submenu ledger,
    // 2026-11-06): rerendering the mounted studio while sub ===
    // "audio" spins the tree past any budget under the dom
    // environment (receipts in the ledger — studio renders stop at
    // #29, bar at #32, a click + SAME-stage rerender hangs while a
    // no-click rerender is green). The hook owns the law; this arm
    // walls it at the seat's own door.
    const CALLS_B: DocCall[] = [{ text: "z", start_frame: 0, end_frame: 24 }]
    const hook = renderHook(({ sid }) => useViewSelection(CALLS_B, hydrateLayerA({ fps: 24 }), sid), { initialProps: { sid: "s_4" } })
    act(() => { hook.result.current.enterSub("audio") })
    assert.equal(hook.result.current.sub, "audio")
    hook.rerender({ sid: "s_9" })
    assert.equal(hook.result.current.sub, null, "the new stage's rail carries no open submenu")
    assert.equal(hook.result.current.selected, null)
  })

  it("the compat seats mirror the seat: kfView is (sub === keyframes), exactly (M1 parity)", () => {
    const { result } = harness()
    assert.equal(result.current.kfView, false)
    act(() => { result.current.enterSub("keyframes") })
    assert.equal(result.current.kfView, true, "the compat seat derives from the seat")
    act(() => { result.current.exitSub() })
    assert.equal(result.current.kfView, false)
  })
})
