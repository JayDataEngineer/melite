/**
 * RunRefsClips — run-level identity refs + audio-clips upload (BEHAVIORAL).
 *
 * PINS: identity refs ride Ref2VA only (one picker per bus);
 * ref size honors the match/max R2V combo; trims write; the clips
 * note counts (none/one/many); the upload door takes files and
 * resets so the same file re-picks.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { useRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { RunRefsClips } from "../src/ui/studio/RunRefsClips.tsx"
import type { LayerA } from "../src/ui/studio/docModel.ts"

const ARTS = [
  { name: "ri.png", url: "https://u/ri.png" },
  { name: "rv.mp4", url: "https://u/rv.mp4" },
  { name: "ra.mp3", url: "https://u/ra.mp3" },
]

function clips(layerA: Record<string, unknown>, over?: Record<string, unknown>) {
  const keys: [string, unknown][] = []
  const taken: [string, number][] = []
  const els = render(
    <RunRefsClips
      layerA={layerA as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
      isRef2va
      refArtifacts={ARTS}
      takeAudioFile={(f, at) => { taken.push([f.name, at]) }}
      audioUploadRef={{ current: null }}
      {...over}
    />,
  )
  return { keys, taken, els }
}

describe("identity refs (Ref2VA only)", () => {
  it("FL2VA owns no identity block", () => {
    clips({}, { isRef2va: false })
    assert.equal(screen.queryByTestId("tl-refs-panel"), null)
  })

  it("one picker per bus — picks write their own key", () => {
    const { keys } = clips({})
    assert.ok(screen.getByTestId("tl-refs-panel"))
    fireEvent.change(screen.getByLabelText("Add ref images (run)"), { target: { value: "ri.png" } })
    fireEvent.change(screen.getByLabelText("Add ref videos (run)"), { target: { value: "rv.mp4" } })
    fireEvent.change(screen.getByLabelText("Add ref audios (run)"), { target: { value: "ra.mp3" } })
    fireEvent.change(screen.getByLabelText("Add ref video audios (run)"), { target: { value: "ra.mp3" } })
    assert.deepEqual(keys, [
      ["h3_ref_images", "ri.png"],
      ["h3_ref_videos", "rv.mp4"],
      ["h3_ref_audios", "ra.mp3"],
      ["h3_ref_video_audios", "ra.mp3"],
    ])
  })

  it("ref size honors the match/max combo (a clear inherits match)", () => {
    const { keys } = clips({ h3_ref_image_size: "max" })
    fireEvent.change(screen.getByLabelText("Ref image size (run)"), { target: { value: "match" } })
    fireEvent.change(screen.getByLabelText("Ref image size (run)"), { target: { value: "" } })
    assert.deepEqual(keys, [["h3_ref_image_size", "match"], ["h3_ref_image_size", undefined]])
  })

  it("a non-string size reads unset; trims write", () => {
    const { keys } = clips({ h3_ref_image_size: 3 })
    assert.equal((screen.getByLabelText("Ref image size (run)") as HTMLSelectElement).value, "")
    fireEvent.change(screen.getByLabelText("Ref audio trim start (run)"), { target: { value: "1.5" } })
    fireEvent.change(screen.getByLabelText("Ref audio trim duration (run)"), { target: { value: "2" } })
    assert.deepEqual(keys, [
      ["h3_ref_audio_trim_start", 1.5],
      ["h3_ref_audio_trim_duration", 2],
    ])
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

  it("files land at frame 0; the input resets; no files = no-op", () => {
    const { taken } = clips({})
    const btn = screen.getByTestId("tl-audio-upload")
    fireEvent.click(btn) // unattached ref — never a throw
    // the clips door is the LAST audio/* input (the ref-audio rows own theirs)
    const all = document.body.querySelectorAll('input[type="file"][accept="audio/*"]')
    const input = all[all.length - 1]! as HTMLInputElement
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
    const h = clips({}, { isRef2va: false })
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
          setLayerAKey={() => {}}
          isRef2va={false}
          refArtifacts={[]}
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
