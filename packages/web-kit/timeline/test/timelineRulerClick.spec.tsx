// timelineRulerClick.spec.tsx — P6 GESTURE RECEIPTS (the ruler-click
// void; purge §7 P6, B5's wall, 2026-11-08).
//
// THE VOID: a single click on the timeline RULER — the time line
// itself, the gesture every NLE answers with a seek — does NOTHING.
// TimelineContent's onClick early-returns the ruler
// (MotionTimelineBarChrome.tsx:246: the click-away-deselect carve-out
// added for audit F3), and the ruler carries no onClick of its own
// (double-click ADDS; single-click is unowned). No seek, no deselect,
// no voice. The operator's scrub law pins the CAP as the scrub
// surface (strip-pane.spec pins cap-only), but cap-only-scrub does
// not excuse a SILENT ruler: P6's law is "every pointer gesture
// either writes the doc (loud receipt) or faces why not — no silent
// void".
//
// THE CONTRACT this wall pins: a ruler click carries a RECEIPT —
// either the tenant is asked to seek at the clicked frame (the
// cure's onSeekFrame-style seat, called with frameAt(clientX) like
// the double-click ADD), or the chrome faces a reason
// (data-testid="motion-timeline-click-voice", wording that names
// seek/scrub/cap/playhead so a screen reader and the operator hear
// the same truth). The cure may satisfy EITHER half; the wall forbids
// only the void. A seeking cure keeps a transient voice (aria-live
// "playhead 12.5s") — a seek that announces itself is still a
// receipt.
//
// SCOPE: the ruler ONLY. Empty-content click-away deselect is an
// intentional feature (sidebar back to global params) and stays;
// clip clicks select. Red-proof: this file's single arm reds on
// today's tree (no voice, no seek seat) and greens when the cure
// lands either half.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h, createRef } from "react"
import { TimelineContent, TimelineRuler } from "../src/timeline/MotionTimelineBarChrome"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"

afterEach(cleanup)

/** The real composition: content owns the click-away seat, the ruler
 *  rides inside it (StudioStripPane seats them the same way). The cure
 *  wires the seek seat (the bar passes its onFrameChange); the wall
 *  rides it with a spy AND asserts the voice — P6's either half, both
 *  pinned (red-proofed pre-cure without the seat: no voice, no seek). */
function renderRulerLine() {
  const onSelect = vi.fn()
  const onSeekFrame = vi.fn()
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
        frameIdx: 0,
        barBg: "#000",
        frameToPx: (f: number) => f * 10,
        frameAt: () => 42,
        onSeekFrame,
      }),
    }),
  )
  return { onSelect, onSeekFrame }
}

describe("P6 — the ruler click carries a receipt (no silent void)", () => {
  it("a single click on the ruler seeks AND faces — never the void", () => {
    const { onSelect, onSeekFrame } = renderRulerLine()
    const ruler = screen.getByTestId("motion-timeline-ruler")
    fireEvent.click(ruler, { clientX: 60 })
    // THE OLD VOID stays void: the ruler carve-out still returns first
    // (click-away deselect is the empty-content seat, never the ruler's).
    expect(onSelect).not.toHaveBeenCalled()
    // THE RECEIPT, BOTH HALVES (P6's law): the tenant is asked to seek
    // at the clicked frame (frameAt's 42, the double-click ADD's
    // precedent) AND the chrome voices where the playhead went. The
    // pre-cure tree had neither (red-proofed: no voice, no seek seat).
    expect(onSeekFrame).toHaveBeenCalledTimes(1)
    expect(onSeekFrame).toHaveBeenCalledWith(42)
    const voice = screen.queryByTestId("motion-timeline-click-voice")
    expect(
      voice?.textContent ?? "",
      "P6 GESTURE RECEIPT (hop [1]→[2]): the ruler click sought but never " +
        "faced it — the seek without the voice is half a receipt. (THE SILENT UI DROP, ERRORS.md bottom)",
    ).toMatch(/seek|scrub|cap|playhead/i)
  })

  it("F-1 THE BAR SEAT (the toggle-proven gap): the bar passes its onFrameChange to the ruler — a dropped pass-through reds HERE", () => {
    // THE GAP the journey audit proved REAL (toggle 2): deleting
    // onSeekFrame={onFrameChange} from the bar's ruler seat keeps the
    // chrome-level arm green — the unit spec passes onSeekFrame
    // directly and never judges the bar's seat. No suite anywhere
    // single-clicks the ruler, so the regression would return the
    // operator's void under an all-green suite. This arm renders the
    // REAL bar and clicks the REAL ruler: the bar's own onFrameChange
    // must fire exactly once (the seek the scrub drag drives through
    // the same callback), and the click-away seat must stay silent.
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
    // spec's precedent): 800px wide at x=0 so scale.frameAt resolves
    // instead of nulling the click into the void.
    const scroll = screen.getByTestId("motion-timeline-scroll")
    Object.defineProperty(scroll, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.click(screen.getByTestId("motion-timeline-ruler"), { clientX: 60 })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onFrameChange).toHaveBeenCalledTimes(1)
  })
})
