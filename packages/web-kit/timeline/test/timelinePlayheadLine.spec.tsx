// timelinePlayheadLine.spec.tsx — THE LINE SWALLOWS (E2-10).
//
// THE BURN (operator, verbatim): "THE DOT AND LINE ISSUE WAS NOT FIXED
// ON THE VIDEO CARD, IS HAS NEVER BEEN FIXED WHEN I TOLD YOU 10+ TIMES
// ABOUT IT. I NEED HARD TESTS ON THIS YOU IDIOT."
//
// THE HOLE the all-green suite hid: the playhead line was pointer-dead
// (pointer-events:none) — and pointer-dead is NOT gesture-dead, it is
// gesture-PASS-THROUGH. The line spans every row (top:0 bottom:0,
// painted last at z-40), so a press on its visible pixels targets
// whatever sits BENEATH it, and every seat beneath is LIVE:
//   - over the ruler band → the ruler's P6 onClick SEEKS (the playhead
//     JUMPS when the operator clicks the line);
//   - over a call clip → the clip's pointerdown OPENS A CLIP DRAG (the
//     operator drags the line and the CLIP moves);
//   - over empty track → TimelineContent's click-away onClick DESELECTS
//     (the sidebar kicks back to global — audit F3's ghost, which the
//     F3 carve-out only fixed for targets INSIDE the ruler element).
// The strip-pane "line is pointer-dead" arm dispatched DIRECTLY on the
// line element — jsdom has no hit-test, so the pass-through never ran
// and the arm stayed green while the live lane burned in three places.
//
// THE LAW (the cure this wall red-proofs): the line SWALLOWS its own
// pixels — it intercepts (never pointer-events:none) and its handlers
// stopPropagation with no session, no seek, no select. The cap is
// carved out (a press bubbling from the cap still opens the scrub).
// P6 survives: ruler clicks anywhere OFF the line's 2px column still
// seek; clip drags starting off the line still drag.
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"
import { repoRoot } from "./repo-root.ts"

afterEach(cleanup)

/** The real bar: ruler + one clip lane + the playhead, the compositing
 *  the operator's burn crosses. Spies on every seat a pass-through
 *  press could wake: scrub session, frame seek, selection. */
function renderBar() {
  const onFrameChange = vi.fn()
  const onSelect = vi.fn()
  const onScrubStart = vi.fn()
  const onScrubEnd = vi.fn()
  const onPromptMove = vi.fn()
  const noop = (): void => {}
  render(
    h(MotionTimelineBar, {
      prompts: [{
        uuid: "call-1", title: "Call 1", start_frame: 0, end_frame: 24,
        prompt: "", seed: 0,
      }, {
        // the second clip: its LEFT edge is a live trim (a lone clip is
        // the head card — its left grip renders DISABLED by the frame-0
        // wall, audit F7 — so the left-edge arm needs a neighbor).
        uuid: "call-2", title: "Call 2", start_frame: 24, end_frame: 72,
        prompt: "", seed: 0,
      }],
      keyframes: [],
      frameIdx: 48,
      totalFrames: 96,
      fps: 24,
      onFrameChange,
      onSelect,
      onScrubStart,
      onScrubEnd,
      onKeyframeAdd: () => "kf",
      onKeyframeMove: noop,
      onKeyframeDelete: noop,
      onPromptUpdate: noop,
      onPromptMove,
      onPromptResize: noop,
    } as never),
  )
  // happy-dom returns zero rects — pin the scroll strip (the ruler arm's
  // precedent): 800px wide at x=0 so frameAt resolves instead of nulling.
  const scroll = screen.getByTestId("motion-timeline-scroll")
  Object.defineProperty(scroll, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200, x: 0, y: 0, toJSON: () => ({}) }),
    configurable: true,
  })
  return { onFrameChange, onSelect, onScrubStart, onScrubEnd, onPromptMove }
}

const lineOf = (): HTMLElement => screen.getByTestId("motion-timeline-playhead")
const capOf = (): HTMLElement => screen.getByTestId("motion-timeline-playhead-cap")

describe("E2-10 THE LINE SWALLOWS (the dot-and-line burn, third seating)", () => {
  it("the line intercepts its own pixels — the built css never leaves it pointer-dead", async () => {
    // THE HIT-TEST INPUT the browser rides: the topmost painted element
    // with pointer-events:none is SKIPPED and the press lands beneath.
    // jsdom cannot hit-test, so the wall pins the mechanism directly —
    // the shipped rule must give the line a presence (the pass-through
    // face reds here: pointer-events:none).
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    // the workspace root by marker walk — the invocation cwd is the
    // walker's repo root OR the package dir (the package runner); a
    // cwd assumption ENOENTs under the other (the 2026-10-22 red class)
    const css = readFileSync(join(repoRoot(), "packages", "web-kit", "timeline", "lib", "timeline", "timeline.module.css"), "utf8")
    const rule = css.match(/\.playhead\s*\{[^}]*\}/)?.[0] ?? "(no .playhead rule)"
    expect(rule, "the shipped .playhead rule hit-tests (the pass-through: " + rule + ")").not.toMatch(/pointer-events:\s*none/)
  })

  it("the line owns its pointerdown — a press on the line opens nothing and seeks nothing", () => {
    const { onFrameChange, onScrubStart, onScrubEnd, onPromptMove } = renderBar()
    const line = lineOf()
    // React wires JSX handlers as fiber props, never DOM properties.
    const key = Object.keys(line).find((k) => k.startsWith("__reactProps$"))
    const props = (key ? (line as unknown as Record<string, unknown>)[key] : {}) as Record<string, unknown>
    expect(typeof props.onPointerDown, "the line carries the swallow seat (no handler = pass-through = the burn)").toBe("function")
    fireEvent.pointerDown(line, { button: 0, clientX: 400 })
    fireEvent.pointerMove(document.body, { clientX: 460 })
    fireEvent.pointerUp(document.body, { clientX: 460 })
    expect(onScrubStart, "no scrub session from the line").not.toHaveBeenCalled()
    expect(onScrubEnd, "no scrub session from the line").not.toHaveBeenCalled()
    expect(onFrameChange, "no seek from a line drag").not.toHaveBeenCalled()
    expect(onPromptMove, "no clip drag from the line's column").not.toHaveBeenCalled()
  })

  it("a click on the line never deselects (the F3 ghost through the dead line)", () => {
    // TODAY'S RED: the click targets the line element, TimelineContent's
    // click-away seat sees a target outside its ruler/clip carve-out and
    // fires onSelect(null) — the sidebar kicks back to global when the
    // operator clicks the white line over empty track. The swallow's
    // click seat must eat it (stopPropagation before the content seat).
    const { onSelect } = renderBar()
    fireEvent.click(lineOf(), { clientX: 400 })
    expect(onSelect, "a line click is not a click-away — selection stands").not.toHaveBeenCalled()
  })

  it("LOCK: the cap still owns the scrub — press opens without jumping, the move seeks, release closes", () => {
    const { onFrameChange, onScrubStart, onScrubEnd } = renderBar()
    fireEvent.pointerDown(capOf(), { button: 0, clientX: 400 })
    expect(onScrubStart, "the press opens the interaction state").toHaveBeenCalledTimes(1)
    expect(onFrameChange, "a grab never jumps — the press seeks nothing").not.toHaveBeenCalled()
    fireEvent.pointerMove(document.body, { clientX: 460 })
    expect(onFrameChange, "the move is the seek").toHaveBeenCalled()
    fireEvent.pointerUp(document.body, { clientX: 460 })
    expect(onScrubEnd, "release closes").toHaveBeenCalledTimes(1)
  })

  it("LOCK (P6 survives): a ruler click off the line's column still seeks", () => {
    // The playhead sits at frame 48 (px 400 at 800px/96f); the click
    // lands at clientX 60 — ruler pixels, not line pixels — so the
    // ruler's own seat answers. Dispatched on the ruler element itself
    // (its own seat, unaffected by the line's swallow).
    const { onFrameChange, onSelect } = renderBar()
    fireEvent.click(screen.getByTestId("motion-timeline-ruler"), { clientX: 60 })
    expect(onSelect, "the ruler carve-out still holds — never a deselect").not.toHaveBeenCalled()
    expect(onFrameChange, "P6: the ruler click still seeks").toHaveBeenCalledTimes(1)
  })

  it("HOOKS-ON (right edge): dragging the END of a clip moves the end — the playhead stays put", () => {
    // THE OPERATOR'S LIVE NOTE (E2-10, mid-round): "when I drag the end
    // of the video bits in the timeline, the scrubber HOOKS ON" — the
    // edge trim's TRIM-FOLLOW (audit F5b's DaVinci parity) seeks the
    // film on every move, yanking the preview along with the trim.
    // The operator's ONLY ("it ONLY scrubs on the white circle") kills
    // it: jumps are click seats (ruler, pins); drag-follow belongs to
    // the cap alone. The clip end must move while the playhead sits.
    const { onFrameChange, onPromptMove } = renderBar()
    const edgeR = document.body.querySelector('[data-prompt-edge="r"]') as HTMLElement
    expect(edgeR, "the clip carries a right edge").not.toBe(null)
    fireEvent.pointerDown(edgeR, { button: 0, clientX: 600 })
    fireEvent.pointerMove(window, { clientX: 660 })
    fireEvent.pointerUp(window, { clientX: 660 })
    expect(onPromptMove, "body drags never seeked — the edge is the hole").not.toHaveBeenCalled()
    expect(onFrameChange, "the trim must not hook the playhead (the resize's own seat still fires — pinned by the tenant arms)").not.toHaveBeenCalled()
  })

  it("HOOKS-ON (left edge, symmetry): dragging the START of a clip never seeks either", () => {
    // No asymmetry: the left-edge branch carried the same follow. One
    // law for both edges — a re-added follow on EITHER side reds.
    const { onFrameChange } = renderBar()
    const edgeL = document.body.querySelector('[data-prompt-clip="call-2"] [data-prompt-edge="l"]') as HTMLElement
    expect(edgeL, "the second clip carries a live left edge").not.toBe(null)
    fireEvent.pointerDown(edgeL, { button: 0, clientX: 200 })
    fireEvent.pointerMove(window, { clientX: 260 })
    fireEvent.pointerUp(window, { clientX: 260 })
    expect(onFrameChange, "the left trim must not hook the playhead").not.toHaveBeenCalled()
  })

  it("THE SHRINK (the fourth seating): the ruler spans its content — the Tip anchor never shrink-wraps the band", () => {
    // THE DEEPEST ROOT (live-measured 2026-11-09: the ruler div is 62px
    // wide inside 1064px of content). The ruler rides inside card-base
    // <Tip> whose anchor is display:inline-flex ("hugs the wrapped
    // control"): as a flex item the width-auto ruler shrink-wraps to
    // its only in-flow child (the sticky timecode chip ≈62px) while
    // the 18 absolute ticks paint across the full band — a 1064px
    // ruler face with a 62px hit seat. Clicks past the chip hit CONTENT
    // (deselect!) or clips, never the ruler's seek/double-click-add —
    // the operator clicks the "timeline" and the sidebar kicks. jsdom
    // has no layout, so the wall pins the seam: the anchor must carry
    // Tip's FILL face (block-level, definite — the ruler fills it), not
    // the hug face. The live probe (rulerBox.w == contentBox.w) is the
    // hard geometry verdict.
    renderBar()
    const ruler = screen.getByTestId("motion-timeline-ruler")
    const anchor = ruler.parentElement
    expect(anchor?.tagName, "the ruler rides Tip's anchor span").toBe("SPAN")
    expect(
      anchor?.className ?? "",
      "the anchor fills (the hug face shrink-wraps the band to its chip: " + (anchor?.className ?? "?") + ")",
    ).toMatch(/tipFill/i)
  })
})
