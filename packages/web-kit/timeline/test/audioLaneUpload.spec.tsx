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
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"

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

  it("THE TRACK HEADS carry the same opt-in door (the lane-add parity law, operator 2026-11-06: the keyframes heads owe the same up-arrow icon the audio inputs carry) — absent onTrackAdd, byte-identical; present, every track head's icon rides named for its track and hands (uuid, the button) back", () => {
    const seen: [string, string][] = []
    const bar = (onTrackAdd?: (uuid: string, anchor: HTMLButtonElement) => void) => h(MotionTimelineBar, {
      prompts: [],
      keyframes: [],
      frameIdx: 0,
      totalFrames: 96,
      fps: 24,
      tracks: [
        { uuid: "image", name: "Keyframes", track_type: "keyframe", color: [86, 140, 245] },
        { uuid: "pose", name: "Pose", track_type: "keyframe", color: null },
      ],
      onFrameChange: noop,
      onKeyframeAdd: () => "kf",
      onKeyframeMove: noop,
      onKeyframeDelete: noop,
      onPromptUpdate: noop,
      onPromptMove: noop,
      onTrackAdd,
    } as never)
    // absent = no affordance on ANY track head (byte-identical head)
    const { unmount } = render(bar())
    expect(document.querySelector('[data-track-upload="image"]')).toBeNull()
    expect(document.querySelector('[data-track-upload="pose"]')).toBeNull()
    unmount()
    // present = every track head gains its named icon; the click
    // hands (uuid, the button element) back — the host's picker
    // anchor (the uuid lets one host serve many heads)
    render(bar((uuid, anchor) => { seen.push([uuid, anchor.getAttribute("data-track-upload") ?? "?"]) }))
    const kfBtn = document.querySelector('[data-track-upload="image"]') as HTMLElement
    expect(kfBtn).not.toBeNull()
    expect(kfBtn.getAttribute("aria-label")).toContain("Keyframes")
    fireEvent.click(kfBtn)
    const poseBtn = document.querySelector('[data-track-upload="pose"]') as HTMLElement
    expect(poseBtn.getAttribute("aria-label")).toContain("Pose")
    fireEvent.click(poseBtn)
    expect(seen).toEqual([["image", "image"], ["pose", "pose"]])
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
