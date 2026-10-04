// audioLaneUpload.spec.tsx — THE LANE-PICKER LAW (2026-09-22, the
// operator: "an upload icon next to the lane titles that opens the
// generic from-flow / from-media component"): the gutter's add door
// is OPT-IN — absent, the head renders byte-identical (no button);
// present, the button rides beside the label and hands ITS OWN
// ELEMENT back to the host (the anchor the source-picker menu pins
// to). The grammar itself lives in the host (useSquareProvider); the
// kit only owes the affordance + the anchor.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { MotionTimelineBar } from "../timeline/MotionTimelineBar"

afterEach(cleanup)

// The bar's required handlers are supplied as no-ops: this suite
// exercises the audio-lane gutter, and the typecheck net (new to this
// package) is right that a render helper cannot omit them — the
// component's contract is that every editor callback is present.
const noop = (): void => {};
function bar(audioLayers: Array<{ id: string; label: string; onUpload?: (anchor: HTMLElement) => void }>) {
  return h(MotionTimelineBar, {
    prompts: [],
    keyframes: [],
    frameIdx: 0,
    totalFrames: 96,
    fps: 24,
    audioLayers,
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
  } as never)
}

describe("the lane gutter's add door (opt-in)", () => {
  it("absent onUpload — no affordance, the head stays byte-identical", () => {
    render(bar([{ id: "music", label: "Music" }]))
    expect(screen.queryByTestId("audio-upload")).toBeNull()
    expect(document.querySelector("[data-audio-upload]")).toBeNull()
  })

  it("present onUpload — the button rides beside the label, named for the lane", () => {
    render(bar([
      { id: "music", label: "Music" },
      { id: "dialogue", label: "Dialogue", onUpload: () => {} },
    ]))
    const btn = document.querySelector('[data-audio-upload="dialogue"]') as HTMLElement
    expect(btn).not.toBeNull()
    expect(btn.getAttribute("aria-label")).toBe("Add Dialogue clip")
    expect(btn.getAttribute("title")).toContain("from flow")
    expect(btn.getAttribute("title")).toContain("from media")
    expect(btn.getAttribute("title")).toContain("from file")
    // the opt-out lane next to it carries nothing
    expect(document.querySelector('[data-audio-upload="music"]')).toBeNull()
  })

  it("the click hands the BUTTON ELEMENT back — the picker's anchor", () => {
    const onUpload = vi.fn()
    render(bar([{ id: "sfx", label: "SFX", onUpload }]))
    const btn = document.querySelector('[data-audio-upload="sfx"]') as HTMLElement
    fireEvent.click(btn)
    expect(onUpload).toHaveBeenCalledTimes(1)
    const anchor = onUpload.mock.calls[0][0] as unknown
    expect(anchor).toBeInstanceOf(HTMLElement)
    expect(anchor).toBe(btn)
  })
})
