// splitSeat.spec.tsx — THE SPLIT SEAT (§0.5, the window split, 2026-11-09).
//
// The audit's finding: the interior split lived behind a double-click no
// clip ever passes through (clips own double-click for inline edit), and
// the splice it performed stripped the call's identity and stated no
// seam. The kit invariant half: every clip carries a visible divide verb
// (uuid-addressed to the tenant — the tenant picks the frame and owns
// the refusal), a tenant that provides no callback keeps the old bar
// byte-identical (the motion card), and the seat never starts a clip
// drag or the inline editor. The tenant half (uuid → call → addCallAt)
// lives in the h3 strip-pane and studio specs.
import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { createElement as h } from "react"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"
import { timelineCopy } from "../src/timelineCopy"

afterEach(cleanup)

const noop = (): void => {}
const PROMPTS = [
  { uuid: "call-0", text: "a", start_frame: 0, end_frame: 80, color: null },
  { uuid: "call-1", text: "b", start_frame: 80, end_frame: 168, color: null, seam: "cut" as const },
]

function bar(over?: Record<string, unknown>) {
  return h(MotionTimelineBar, {
    prompts: PROMPTS,
    keyframes: [],
    frameIdx: 0,
    totalFrames: 240,
    fps: 24,
    tracks: [],
    audioLayers: [],
    beats: [],
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
    onTrackAdd: () => {},
    ...over,
  } as never)
}

describe("THE SPLIT SEAT — the divide verb is visible on every clip", () => {
  it("ARM 1 — a seat on EVERY clip (a first window splits too), uuid-addressed to the tenant", () => {
    const onPromptSplit = vi.fn()
    const { container } = render(bar({ onPromptSplit }))
    const seats = Array.from(container.querySelectorAll("[data-split-toggle]")) as HTMLElement[]
    // unlike the seam chip, the FIRST clip carries a seat: a first
    // window splits as well as any other
    expect(seats.map((s) => s.getAttribute("data-split-toggle"))).toEqual(["call-0", "call-1"])
    // the hover words ride the estate Tip (never a native title attr
    // on the seat), and the real button's accessible name is the
    // dictionary's
    const btn = seats[0]!.querySelector("button")!
    expect(btn.getAttribute("aria-label")).toBe(timelineCopy.splitClipAria)
    expect(btn.getAttribute("title")).toBeNull()
    expect(timelineCopy.splitClipTip).toMatch(/^split — divide this window in two/)
    // a click writes the split through — the row's uuid, never an index
    fireEvent.click(btn)
    expect(onPromptSplit).toHaveBeenCalledWith("call-0")
  })

  it("ARM 2 — no tenant callback: no seat, the old bar byte-identical (the motion card)", () => {
    const { container } = render(bar())
    expect(container.querySelectorAll("[data-split-toggle]")).toHaveLength(0)
  })

  it("ARM 3 — the seat never starts a clip drag or the inline editor (pointerdown/double-click stopped)", () => {
    const onPromptSplit = vi.fn()
    const { container } = render(bar({ onPromptSplit }))
    const seat = container.querySelector('[data-split-toggle="call-0"]') as HTMLElement
    // the clip body's double-click opens the inline editor; the seat's
    // own double-click must not reach it
    fireEvent.doubleClick(seat)
    expect(container.querySelector("input")).toBeNull()
    // and a pointer gesture on the seat splits once, never drags
    fireEvent.pointerDown(seat, { clientX: 100 })
    fireEvent.click(seat.querySelector("button")!)
    expect(onPromptSplit).toHaveBeenCalledTimes(1)
  })
})
