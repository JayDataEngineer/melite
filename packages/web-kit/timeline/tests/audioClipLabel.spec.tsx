// audioClipLabel.spec.tsx — THE LABEL SPEAKS THE CLIP'S DURATION
// (2026-11-17, the M-18 burn: "a .02 second tts clip going to 6+
// seconds? Why is it labeled .02 seconds?"). The audio block's
// visible label printed the clip's START position with a duration
// suffix — a 5.9s clip starting at frame 4/24 announced itself as
// "0.2s" while its geometry stretched six seconds. The span labels
// above the lanes (end−start) and the block's own title
// (start–end·gain) were already honest; the label now speaks the
// DURATION (dur_frames/fps), the same law as every other seconds
// readout on the bar.
import { afterEach, describe, it, expect } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createElement as h } from "react"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"

afterEach(cleanup)

const noop = (): void => {};

function barWithClip(clip: { start_frame: number; dur_frames: number; gain?: number }) {
  return h(MotionTimelineBar, {
    prompts: [],
    keyframes: [],
    frameIdx: 0,
    totalFrames: 243,
    fps: 24,
    audioLayers: [
      { id: "dialogue", label: "Dialogue", clips: [{ id: "c1", name: "line 1", ...clip }] },
    ],
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
  } as never)
}

/** The block's seconds readout — CSS-module classnames are hashed, so
 *  the finder takes the span whose text is exactly a seconds value
 *  (the only such span inside a clip block: the name never formats
 *  as one). */
function secondsLabel(block: HTMLElement): string | null {
  for (const span of block.querySelectorAll("span")) {
    if (/^\d+(\.\d+)?s$/.test(span.textContent ?? "")) return span.textContent
  }
  return null
}

describe("the audio clip label (M-18: the '.02 seconds' mislabel)", () => {
  it("a 5.9s clip starting at frame 4 reads 5.9s — the DURATION, never the start position", () => {
    // the burn's own numbers: start 4/24 = 0.2s (the old, lying
    // label), dur 142/24 = 5.9s (the truth the block's geometry shows)
    render(barWithClip({ start_frame: 4, dur_frames: 142, gain: 1 }))
    const block = document.querySelector("[data-audio-clip]") as HTMLElement
    expect(block).not.toBeNull()
    expect(secondsLabel(block)).toBe("5.9s")
    expect(secondsLabel(block)).not.toContain("0.2")
  })

  it("the title keeps the start–end span — position stays one hover away", () => {
    render(barWithClip({ start_frame: 4, dur_frames: 142, gain: 1 }))
    const block = document.querySelector("[data-audio-clip]") as HTMLElement
    expect(block.getAttribute("title")).toContain("0.2")
    expect(block.getAttribute("title")).toContain("6.1")
  })

  it("a second clip at another start reads its OWN duration (the label is not a lane-level constant)", () => {
    render(barWithClip({ start_frame: 150, dur_frames: 92 }))
    const block = document.querySelector("[data-audio-clip]") as HTMLElement
    expect(secondsLabel(block)).toBe("3.8s")
  })
})
