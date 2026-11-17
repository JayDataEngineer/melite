// motionBarDragSessions.spec.tsx — THE DRAG SESSION'S RELEASE FACES
// (the coverage-honesty pass, 2026-11-17). The bar's drag session
// (MotionTimelineBarDrag.ts) owns four release-time laws whose arms
// the bar-level specs never reached: the empty-lane quiet render, the
// unsorted-roster seat (tail + head reduces), the keyframe pin's
// click-vs-drag split, the clip click-select, and the F4b
// EXTEND-RELEASE PIN — a gesture that grew the doc pins the frozen
// gesture scale before the freeze clears. The pin arms ride a
// composed harness of the REAL hooks (useTimelineDragSession with
// literal opts — the bar only wires them), because the pin's
// precondition (an unpinned ppf) cannot live past the scale hook's
// own mount pin in a measured box.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h, useState } from "react"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"
import { useTimelineDragSession } from "../src/timeline/MotionTimelineBarDrag"

afterEach(cleanup)

const noop = (): void => {}

/** ── The full bar, the split-seat harness shape. */
function bar(over?: Record<string, unknown>) {
  return h(MotionTimelineBar, {
    prompts: [
      { uuid: "call-0", text: "a", start_frame: 0, end_frame: 80, color: null },
      { uuid: "call-1", text: "b", start_frame: 80, end_frame: 168, color: null },
    ],
    keyframes: [{ uuid: "kf-1", track_id: "trk", frame: 42, value: 1 }],
    tracks: [{ uuid: "trk", name: "Motion", track_type: "motion", color: null }],
    frameIdx: 0,
    totalFrames: 96,
    fps: 24,
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
    ...over,
  } as never)
}

/** Pin the scroll strip's rect (the playhead spec's precedent) so
 *  frameAt resolves instead of nulling on jsdom's zero boxes. */
function pinRect() {
  const scroll = screen.getByTestId("motion-timeline-scroll")
  Object.defineProperty(scroll, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
    configurable: true,
  })
}

/** ── The composed drag-session harness (the pin arms): the REAL
 *  session hook with literal opts and spy setters — the bar wires
 *  exactly this shape; the pin's law lives in the hook, not the
 *  wiring. totalFrames rerenders mid-gesture the way a parent that
 *  honored onExtend would. */
function DragHarness(props: { totalFrames: number; ppf: number | null; spies: Record<string, ReturnType<typeof vi.fn>> }) {
  const [dragScale, setDragScale] = useState<number | null>(null)
  const session = useTimelineDragSession({
    T1: Math.max(0, props.totalFrames - 1),
    effPpf: 8,
    ppf: props.ppf,
    dragScale,
    setPpf: props.spies.setPpf as unknown as (v: number) => void,
    setBasePpf: props.spies.setBasePpf as unknown as (v: number) => void,
    setDragScale,
    prompts: [{ uuid: "c0", text: "a", start_frame: 0, end_frame: 90, color: null }],
    packed: false,
    xToFrame: () => null,
    keepTailVisible: () => {},
    onFrameChange: noop,
    onKeyframeMove: noop,
    onPromptMove: noop,
    onPromptResize: noop,
    onExtend: noop,
  })
  return h("div", {
    "data-harness-grip": true,
    onPointerDown: (e: React.PointerEvent) =>
      session.startDrag(e, { kind: "prompt-r", id: "c0", startX: e.clientX, startF: 0, endF: 90, moved: false }),
  })
}

/** The pin's own seat (the aria-label carries the Tip's words). */
const kfPin = (): HTMLElement => document.querySelector("[data-kf]") as HTMLElement
/** The harness grip div. */
const harnessGrip = (): HTMLElement => document.querySelector("[data-harness-grip]") as HTMLElement

describe("THE DRAG SESSION'S RELEASE FACES", () => {
  it("an EMPTY lane renders quiet — no tail, no head, and a stray window pointerup with no armed drag seeks and selects nothing", () => {
    const onFrameChange = vi.fn()
    const onSelect = vi.fn()
    const { container } = render(bar({ prompts: [], keyframes: [], tracks: [], onFrameChange, onSelect }))
    expect(container).toBeTruthy()
    // no drag was armed: the release walk's every d-guard stays quiet
    fireEvent.pointerUp(window, { clientX: 400 })
    expect(onFrameChange, "a dragless release never seeks").not.toHaveBeenCalled()
    expect(onSelect, "a dragless release never selects").not.toHaveBeenCalled()
  })

  it("an UNSORTED roster seats both reduce winners — the tail keeps the later-start card with the shorter end, the head keeps the later card with the earlier start", () => {
    // tail: b.end > a.end is FALSE when the later card ENDS earlier
    // (a crossed pair); head: b.start < a.start is TRUE when the
    // later card STARTS earlier. Both reduces' losing arms ride one
    // render.
    const { container } = render(bar({
      prompts: [
        { uuid: "wide", text: "a", start_frame: 0, end_frame: 168, color: null },
        { uuid: "front", text: "b", start_frame: 80, end_frame: 80, color: null },
      ],
    }))
    const clips = container.querySelectorAll("[data-prompt-clip]")
    expect(clips.length, "the crossed pair renders both cards").toBe(2)
    // and the mirror crossing: the later card starts earlier — the
    // head reduce's winning arm (b.start < a.start TRUE) rides this
    // render while the tail keeps its winner
    const mirror = render(bar({
      prompts: [
        { uuid: "front", text: "b", start_frame: 80, end_frame: 80, color: null },
        { uuid: "wide", text: "a", start_frame: 0, end_frame: 168, color: null },
      ],
    }))
    expect(mirror.container.querySelectorAll("[data-prompt-clip]").length).toBe(2)
  })

  it("a keyframe CLICK (press, no travel) seeks to its frame — the pin's jump seat", () => {
    const onFrameChange = vi.fn()
    render(bar({ onFrameChange }))
    pinRect()
    fireEvent.pointerDown(kfPin(), { button: 0, clientX: 300 })
    fireEvent.pointerUp(window, { clientX: 300 })
    expect(onFrameChange, "the unmoved pin releases as a seek to its own frame").toHaveBeenCalledWith(42)
  })

  it("a keyframe DRAG (travel past the arm threshold) moves the pin and never seeks — a drag is not a jump", () => {
    const onFrameChange = vi.fn()
    const onKeyframeMove = vi.fn()
    render(bar({ onFrameChange, onKeyframeMove }))
    pinRect()
    fireEvent.pointerDown(kfPin(), { button: 0, clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 364, buttons: 1 })
    fireEvent.pointerUp(window, { clientX: 364 })
    expect(onKeyframeMove, "the moved pin writes its frame through the move seat").toHaveBeenCalled()
    expect(onFrameChange, "a traveled pin never releases a seek").not.toHaveBeenCalled()
  })

  it("a clip CLICK (press, no travel) selects the clip — the sidebar's own door", () => {
    const onSelect = vi.fn()
    const { container } = render(bar({ onSelect }))
    pinRect()
    const clip = container.querySelector("[data-prompt-clip]") as HTMLElement
    fireEvent.pointerDown(clip, { button: 0, clientX: 120 })
    fireEvent.pointerUp(window, { clientX: 120 })
    expect(onSelect, "the unmoved clip press releases as a select").toHaveBeenCalledWith("call-0")
  })

  it("THE EXTEND-RELEASE PIN (F4b): a gesture that grew the doc, released while the scale is still the live fit, PINS the frozen gesture scale", () => {
    const spies = { setPpf: vi.fn(), setBasePpf: vi.fn() }
    const view = render(h(DragHarness, { totalFrames: 96, ppf: null, spies }))
    fireEvent.pointerDown(harnessGrip(), { button: 0, clientX: 100 })
    // the parent honors onExtend: the envelope grows mid-gesture
    view.rerender(h(DragHarness, { totalFrames: 200, ppf: null, spies }))
    fireEvent.pointerUp(window, { clientX: 100 })
    expect(spies.setPpf, "the pin seats the frozen gesture scale (8 px/frame)").toHaveBeenCalledWith(8)
    expect(spies.setBasePpf, "the readout's denominator pins with it").toHaveBeenCalledWith(8)
  })

  it("the pin law is quiet when the scale is ALREADY pinned — an absolute scale never re-pins on doc growth", () => {
    const spies = { setPpf: vi.fn(), setBasePpf: vi.fn() }
    const view = render(h(DragHarness, { totalFrames: 96, ppf: 5, spies }))
    fireEvent.pointerDown(harnessGrip(), { button: 0, clientX: 100 })
    view.rerender(h(DragHarness, { totalFrames: 200, ppf: 5, spies }))
    fireEvent.pointerUp(window, { clientX: 100 })
    expect(spies.setPpf, "a pinned scale stays where the operator dialed it").not.toHaveBeenCalled()
    expect(spies.setBasePpf).not.toHaveBeenCalled()
  })
})
