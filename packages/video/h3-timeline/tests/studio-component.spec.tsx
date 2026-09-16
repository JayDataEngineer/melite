/**
 * VideoTimelineStudio — the tenant composition (BEHAVIORAL).
 *
 * PINS (the shell ride): the rail reads the document out (calls /
 * guides / knob departures / unwired warnings, each in singular and
 * plural); global mode owns the call cards + the Run fold; selecting
 * a bar clip swaps the rail to that call's editor and back; the
 * player's own duration sizes the film axis.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  VideoTimelineStudio, shellDeclaration,
} from "../src/ui/studio/component.tsx"

function stageOf(params: Record<string, unknown>, extra?: Record<string, unknown>) {
  return { params, ...extra } as never
}

function studio(params: Record<string, unknown>, extra?: Record<string, unknown>) {
  const saved: Record<string, unknown>[] = []
  const els = render(
    <VideoTimelineStudio
      stage={stageOf(params, extra)}
      running={false}
      onSave={(p) => { saved.push(p) }}
    />,
  )
  return { saved, els }
}

const TWO = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80, image: "img.png", knobs: { denoise: 0.8 } },
    { text: "two", start_frame: 80, end_frame: 168 },
  ],
  keyframes: [{ frame: 10, kind: "image", source: "" }],
  fps: 24,
}

describe("the rail reads the document out", () => {
  it("counts + departures + warnings (singular)", () => {
    studio(TWO)
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("2 calls"))
    assert.ok(readout.includes("7.0s"))
    assert.ok(readout.includes("1 guide"))
    assert.ok(readout.includes("1 call with knobs"))
    assert.ok(document.body.textContent!.includes("1 keyframe source unwired"))
  })

  it("bare docs read clean (no departures, no warnings)", () => {
    const h = studio({ calls: [{ text: "solo", start_frame: 0, end_frame: 48 }], fps: 24 })
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("1 call ·"))
    assert.ok(readout.includes("0 guides"))
    assert.ok(!readout.includes("with knobs"))
    assert.ok(!document.body.textContent!.includes("unwired"))
    h.els.unmount()
  })

  it("crowded docs pluralize everything", () => {
    studio({
      calls: [
        { text: "a", start_frame: 0, end_frame: 80, image: "a.png", knobs: { denoise: 0.5 } },
        { text: "b", start_frame: 80, end_frame: 168, clip: "b.mp4", knobs: { sampler: "heun" } },
      ],
      keyframes: [
        { frame: 5, kind: "image", source: "" },
        { frame: 90, kind: "clip", source: "" },
      ],
      fps: 24,
    })
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("2 calls"))
    assert.ok(readout.includes("2 guides"))
    assert.ok(readout.includes("2 calls with knobs"))
    assert.ok(document.body.textContent!.includes("2 keyframe sources unwired"))
  })
})

describe("the mode-switching rail", () => {
  it("global mode owns the rows + the Run fold", () => {
    studio(TWO)
    assert.ok(screen.getByTestId("tl-run-panel"))
    assert.ok(document.body.querySelector('[data-call-row="0"]'))
    assert.ok(document.body.querySelector('[data-call-row="1"]'))
  })

  it("a bar clip swaps the rail to its editor; click-away swaps back", () => {
    studio(TWO)
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    // focused: the Run fold leaves, the full card rides
    assert.equal(screen.queryByTestId("tl-run-panel"), null)
    assert.ok(document.body.querySelector('[data-call-card="0"]'))
    // click-away on the bar's empty lane restores the global rail
    fireEvent.click(clip.parentElement!)
    assert.ok(screen.queryByTestId("tl-run-panel"))
  })
})

describe("the film axis (the player's own duration)", () => {
  it("a landed final plays; its duration report never throws", () => {
    studio(
      { calls: [{ text: "one", start_frame: 0, end_frame: 168 }], fps: 24 },
      { result: { artifacts: { video: "https://u/final.mp4" } } },
    )
    const cut = screen.getByTestId("tl-final-cut")
    const video = cut.querySelector("video")!
    Object.defineProperty(video, "duration", { value: 12.5, configurable: true })
    fireEvent.loadedMetadata(video)
    assert.ok(screen.getByTestId("tl-film-player"))
  })

  it("the shell declaration owns the seams", () => {
    assert.deepEqual(shellDeclaration, {
      preview: { kind: "native" },
      bottom: { kind: "timeline" },
      params: { slots: [] },
    })
  })
})
