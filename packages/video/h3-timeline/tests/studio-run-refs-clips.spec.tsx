/**
 * RunRefsClips — the audio-clips upload door (BEHAVIORAL).
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the run-level identity
 * refs panel is GONE (refs are per-call, in CallCard's SourceRow
 * group); what remains is the Layer A NLE audio-clips bed.
 *
 * PINS: the refs panel never renders; the clips note counts
 * (none/one/many); the upload door takes files and resets so the
 * same file re-picks; a dialog cancel takes nothing; an attached
 * ref opens the dialog on click.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { useRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { RunRefsClips } from "../src/ui/studio/RunRefsClips.tsx"
import type { LayerA } from "../src/ui/studio/docModel.ts"

function clips(layerA: Record<string, unknown>) {
  const taken: [string, number][] = []
  const els = render(
    <RunRefsClips
      layerA={layerA as unknown as LayerA}
      takeAudioFile={(f, at) => { taken.push([f.name, at]) }}
      audioUploadRef={{ current: null }}
    />,
  )
  return { taken, els }
}

describe("the run-level refs panel is dead (refs are per-call)", () => {
  it("no refs panel renders on any route — the clips row only", () => {
    const h = clips({})
    assert.equal(screen.queryByTestId("tl-refs-panel"), null)
    assert.equal(screen.queryByLabelText("ref images (run)"), null)
    assert.ok(screen.getByTestId("tl-audio-upload"))
    h.els.unmount()
  })
})

describe("the clips upload door", () => {
  it("the note counts (none / one / many)", () => {
    const h0 = clips({})
    assert.ok(screen.getByText("none — upload or drop a file on the Music row"))
    h0.els.unmount()
    const h1 = clips({ audio_clips: [{ name: "a" }] })
    assert.ok(screen.getByText("1 clip on the Music row — drag to move, × to remove"))
    h1.els.unmount()
    clips({ audio_clips: [{ name: "a" }, { name: "b" }] })
    assert.ok(screen.getByText("2 clips on the Music row — drag to move, × to remove"))
  })

  // ── THE LANE-COST HINT (roadmap §14): the 3-lane audio bus law
  // states itself ON THE ROW, not only at compose — the loud
  // refusal names every competitor AFTER the Run press; the hint
  // names the budget BEFORE it.
  it("the Music row states the 3-lane audio budget (the lane-cost hint)", () => {
    const h = clips({})
    const hint = screen.getByTestId("tl-clips-lane-hint")
    assert.match(hint.textContent!, /3 audio lanes/i, "the budget is stated")
    assert.match(hint.textContent!, /bed/i, "the bed is named as a lane spender")
    assert.match(hint.textContent!, /dialogue/i, "dialogue clips are named as lane spenders")
    assert.match(hint.textContent!, /ref/i, "refs close the competitor list")
    h.els.unmount()
  })

  it("files land at frame 0; the input resets; no files = no-op", () => {
    const { taken } = clips({})
    const btn = screen.getByTestId("tl-audio-upload")
    fireEvent.click(btn) // unattached ref — never a throw
    const input = document.body.querySelector('input[type="file"][accept="audio/*"]')! as HTMLInputElement
    assert.equal(input.hasAttribute("multiple"), true)
    const a = new File(["a"], "a.mp3", { type: "audio/mpeg" })
    const b = new File(["b"], "b.wav", { type: "audio/wav" })
    fireEvent.change(input, { target: { files: [a, b] } })
    assert.deepEqual(taken, [["a.mp3", 0], ["b.wav", 0]])
    assert.equal(input.value, "")
    // an empty pick takes nothing (but still resets)
    fireEvent.change(input, { target: { files: [] } })
    assert.deepEqual(taken, [["a.mp3", 0], ["b.wav", 0]])
    assert.equal(input.value, "")
  })

  it("a dialog cancel (files null per the DOM type) takes nothing", () => {
    const h = clips({})
    const input = document.body.querySelector('input[type="file"][accept="audio/*"]')! as HTMLInputElement
    // the DOM type allows files === null (never-picked) — the door pins it
    Object.defineProperty(input, "files", { value: null, configurable: true })
    fireEvent.change(input, { target: { value: "" } })
    assert.equal(input.value, "")
    h.els.unmount()
  })

  it("an attached ref opens the dialog on click", () => {
    function Live() {
      const ref = useRef<HTMLInputElement | null>(null)
      return (
        <RunRefsClips
          layerA={{} as unknown as LayerA}
          takeAudioFile={() => {}}
          audioUploadRef={ref}
        />
      )
    }
    let opened = 0
    render(<Live />)
    const input = document.body.querySelector('input[type="file"][accept="audio/*"]')! as HTMLInputElement
    input.click = () => { opened += 1 }
    fireEvent.click(screen.getByTestId("tl-audio-upload"))
    assert.equal(opened, 1)
  })
})
