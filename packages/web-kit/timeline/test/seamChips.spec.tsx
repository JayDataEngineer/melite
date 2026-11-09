// seamChips.spec.tsx — THE SEAM CHIP (the collapse's cuts, 2026-11-09).
//
// The operator's order: "another option to choose the 'cuts', i.e. where
// the film cuts without auto context carry" — authored ON the strip at
// the add-call surface, not buried in the rail. The kit invariant half:
// every NON-FIRST boundary carries a chip whose state is the row's own
// seam (carried = the latent tail continues; cut = overlap 0, nothing
// carries), click-to-toggle rides the tenant's callback with the row's
// uuid, and a tenant that provides no callback keeps the read-only dot
// (byte-identical for the motion card). The tenant half (uuid → call
// index through a filtered face) lives in the h3 strip-pane spec.
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
  { uuid: "call-2", text: "c", start_frame: 168, end_frame: 240, color: null, seam: "extend" as const },
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

describe("THE SEAM CHIP — the cut choice rides the add-call surface", () => {
  it("ARM 1 — one chip per NON-FIRST boundary, state from the row, uuid-addressed to the tenant", () => {
    const onSeamToggle = vi.fn()
    const { container } = render(bar({ onSeamToggle }))
    const chips = Array.from(container.querySelectorAll("[data-seam-toggle]")) as HTMLElement[]
    // the first call has no join before it — no chip
    expect(chips.map((c) => c.getAttribute("data-seam-toggle"))).toEqual(["call-1", "call-2"])
    // the row's own state paints the chip: cut vs carried
    expect(chips[0]!.getAttribute("data-seam-state")).toBe("cut")
    expect(chips[1]!.getAttribute("data-seam-state")).toBe("carried")
    // the hover words ride the estate Tip (a lazy bubble — the words
    // live in the dictionary, never a native title attr on the seat),
    // and the real button's accessible name spells the same law
    expect(chips[0]!.querySelector("button")!.getAttribute("aria-label")).toBe(
      timelineCopy.seamToggleAria({ state: "cut" }),
    )
    expect(chips[0]!.querySelector("button")!.getAttribute("title")).toBeNull()
    expect(timelineCopy.seamCutTitle).toMatch(/^cut — this call starts fresh/)
    expect(timelineCopy.seamCarriedTitle).toMatch(/^carried — the latent tail continues/)
    // a click writes the seam through — the row's uuid, never an index
    fireEvent.click(chips[1]!.querySelector("button")!)
    expect(onSeamToggle).toHaveBeenCalledWith("call-2")
  })

  it("ARM 2 — no tenant callback: no chip, and the read-only extend dot keeps the old bar byte-identical", () => {
    const { container } = render(bar())
    expect(container.querySelectorAll("[data-seam-toggle]")).toHaveLength(0)
    // the F9 readout survives for carried seams (the motion card's bar)
    expect(container.querySelectorAll("[class*=seamDot]")).toHaveLength(1)
  })

  it("ARM 3 — the chip never starts a clip drag or the inline editor (pointerdown/double-click stopped)", () => {
    const onSeamToggle = vi.fn()
    const { container } = render(bar({ onSeamToggle }))
    const chip = container.querySelector('[data-seam-toggle="call-1"]') as HTMLElement
    // the clip body's double-click opens the inline editor; the chip's
    // own double-click must not reach it (two toggles would cancel)
    fireEvent.doubleClick(chip)
    expect(container.querySelector("input")).toBeNull()
    // and a pointer gesture on the chip toggles once, never drags
    fireEvent.pointerDown(chip, { clientX: 100 })
    fireEvent.click(chip.querySelector("button")!)
    expect(onSeamToggle).toHaveBeenCalledTimes(1)
  })
})
