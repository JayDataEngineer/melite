// timelineRulerNoSeek.spec.tsx — THE CAP-ONLY PLAYHEAD LAW (operator,
// told 10+ times, 2026-10-29: "I only want the playhead to move to my
// mouse WHEN I CLICK AND DRAG THE CIRCLE ON TOP").
//
// THE LAW: the playhead moves ONLY by dragging the cap — the white
// circle at the top of the line. A single click ANYWHERE on the
// timeline (the ruler band included) moves NOTHING. The P6
// ruler-click seek and its click-voice chip are DEAD, and the sticky
// timecode chip is DEAD with them (it read the bar's fps axis, which
// can mismatch the film's own rate — a readout that can lie is
// removed, not patched; the operator: "WHY EVEN ADD THIS?").
//
// This file replaces timelineRulerClick.spec.tsx (P6's receipt wall)
// — the void that wall forbade is now the LAW itself, by direct
// operator order. Arms:
//
//   ARM 1 — the ruler click is silence: no seek, no deselect.
//   ARM 2 — THE BAR SEAT: a click on the REAL bar's ruler never
//     calls onFrameChange (reintroducing any seek wiring reds HERE).
//   ARM 3 — THE CHIPS ARE GONE: neither the click-voice chip nor the
//     sticky timecode chip renders (reintroducing either reds HERE).
//   ARM 4 — THE CONTROL: the cap's drag DOES drive onFrameChange —
//     the one gesture that lives.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h, createRef } from "react"
import { TimelineContent, TimelineRuler } from "../src/timeline/MotionTimelineBarChrome"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"

afterEach(cleanup)

/** The real composition: content owns the click-away seat, the ruler
 *  rides inside it (StudioStripPane seats them the same way). */
function renderRulerLine() {
  const onSelect = vi.fn()
  const scrollRef = createRef<HTMLDivElement>()
  const suppressClickRef = { current: false }
  render(
    // children rides IN the props object: the component's own
    // interface declares it required, and createElement's rest-arg
    // overload does not satisfy a required children member
    h(TimelineContent, {
      scrollRef,
      contentW: 800,
      suppressClickRef,
      onSelect,
      children: h(TimelineRuler, {
        ticks: [0, 5, 10],
        stepSec: 5,
        fps: 24,
        barBg: "#000",
        frameToPx: (f: number) => f * 10,
        frameAt: () => 42,
      }),
    }),
  )
  return { onSelect }
}

describe("the cap-only playhead law (operator 2026-10-29, told 10+ times)", () => {
  it("ARM 1 — a single click on the ruler is SILENCE: no seek, no deselect", () => {
    const { onSelect } = renderRulerLine()
    const ruler = screen.getByTestId("motion-timeline-ruler")
    fireEvent.click(ruler, { clientX: 60 })
    // the ruler carve-out holds (click-away deselect is the
    // empty-content seat, never the ruler's) AND the seek is dead:
    // the click answers with nothing at all.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("ARM 2 — THE BAR SEAT: a ruler click on the REAL bar never calls onFrameChange", () => {
    const onFrameChange = vi.fn()
    const onSelect = vi.fn()
    const noop = (): void => {}
    render(
      h(MotionTimelineBar, {
        prompts: [],
        keyframes: [],
        frameIdx: 0,
        totalFrames: 96,
        fps: 24,
        onFrameChange,
        onSelect,
        onKeyframeAdd: () => "kf",
        onKeyframeMove: noop,
        onKeyframeDelete: noop,
        onPromptUpdate: noop,
        onPromptMove: noop,
      } as never),
    )
    // happy-dom returns zero rects — pin the scroll strip (the scrub
    // spec's precedent): 800px wide at x=0 so scale.frameAt resolves.
    const scroll = screen.getByTestId("motion-timeline-scroll")
    Object.defineProperty(scroll, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.click(screen.getByTestId("motion-timeline-ruler"), { clientX: 60 })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onFrameChange).not.toHaveBeenCalled()
  })

  it("ARM 3 — THE CHIPS ARE GONE: no click-voice, no sticky timecode", () => {
    const noop = (): void => {}
    render(
      h(MotionTimelineBar, {
        prompts: [],
        keyframes: [],
        frameIdx: 0,
        totalFrames: 96,
        fps: 24,
        onFrameChange: noop,
        onSelect: noop,
        onKeyframeAdd: () => "kf",
        onKeyframeMove: noop,
        onKeyframeDelete: noop,
        onPromptUpdate: noop,
        onPromptMove: noop,
      } as never),
    )
    expect(screen.queryByTestId("motion-timeline-click-voice")).toBeNull()
    expect(screen.queryByTestId("motion-timeline-timecode")).toBeNull()
  })

  it("ARM 4 — THE CONTROL: the cap's press-move-release DOES drive onFrameChange", () => {
    const onFrameChange = vi.fn()
    const noop = (): void => {}
    render(
      h(MotionTimelineBar, {
        prompts: [],
        keyframes: [],
        frameIdx: 0,
        totalFrames: 96,
        fps: 24,
        onFrameChange,
        onSelect: noop,
        onKeyframeAdd: () => "kf",
        onKeyframeMove: noop,
        onKeyframeDelete: noop,
        onPromptUpdate: noop,
        onPromptMove: noop,
      } as never),
    )
    const scroll = screen.getByTestId("motion-timeline-scroll")
    Object.defineProperty(scroll, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    const cap = screen.getByTestId("motion-timeline-playhead-cap")
    fireEvent.pointerDown(cap, { clientX: 10, button: 0 })
    fireEvent.pointerMove(window, { clientX: 66 })
    fireEvent.pointerUp(window, { clientX: 66 })
    expect(onFrameChange).toHaveBeenCalled()
  })
})
