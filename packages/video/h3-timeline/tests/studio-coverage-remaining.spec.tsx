import { afterEach, describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { useState } from "react"
import { RunRefsClips } from "../src/ui/studio/RunRefsClips.tsx"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import { useDerivedView } from "../src/ui/studio/useDerivedView.ts"
import { useFilmAudio } from "../src/ui/studio/useFilmAudio.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import type { CardStage } from "@melite/contracts"
import type { DocAudioClip, DocCall, LayerA } from "../src/ui/studio/docModel.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base/client'

afterEach(() => {
  cleanup()
  unbindEstateRemote()
})

describe("RunRefsClips lane inspector", () => {
  it("renders every lane and forwards its authored edits", () => {
    const updates: Array<[string, { class?: "dialogue" | "sfx" | "music", text?: string }]> = []
    const deletes: string[] = []
    const clips: DocAudioClip[] = [
      { id: "d", name: "line", src: "data:d", start_frame: 0, dur_frames: 24, class: "dialogue", text: "hello" },
      { id: "s", name: "boom", src: "data:s", start_frame: 0, dur_frames: 24, class: "sfx", text: "explode" },
      { id: "m", name: "pad", src: "data:m", start_frame: 0, dur_frames: 24, class: "music" },
      { id: "legacy-d", name: "legacy line", src: "data:ld", start_frame: 0, dur_frames: 24, text: "legacy words" },
      { id: "legacy-m", name: "legacy pad", src: "data:lm", start_frame: 0, dur_frames: 24 },
    ]
    const h = render(
      <RunRefsClips
        layerA={{ ...hydrateLayerA(undefined), audio_clips: clips }}
        updateAudioClip={(id, patch) => { updates.push([id, patch]) }}
        deleteAudioClip={(id) => { deletes.push(id) }}
      />,
    )

    assert.equal(screen.getAllByTestId("tl-lane-row").length, clips.length)
    // THE MENU SELECT (S7 sweep): the trigger Button carries the row
    // face; picks open the trigger + click the menuitem row.
    const selects = screen.getAllByTestId("tl-lane-class") as HTMLElement[]
    const inputs = screen.getAllByTestId("tl-lane-text") as HTMLInputElement[]
    assert.deepEqual(selects.map((select) => select.textContent), ["Dialogue", "SFX", "Music", "Dialogue", "Music"])
    assert.equal(inputs[0]!.placeholder, "the exact spoken words (verbatim, unabridged — they move the mouth)")
    assert.equal(inputs[1]!.placeholder, "the event the soundscape times (e.g. a sudden explosion rocks the room)")
    assert.equal(inputs[2]!.placeholder, "music description (rides non_diegetic_music)")

    fireEvent.click(selects[0]!)
    fireEvent.click(screen.getByRole("menuitem", { name: "Music" }))
    fireEvent.change(inputs[1]!, { target: { value: "new event" } })
    fireEvent.click(screen.getAllByTestId("tl-lane-delete")[2]!)

    assert.deepEqual(updates, [["d", { class: "music" }], ["s", { text: "new event" }]])
    assert.deepEqual(deletes, ["m"])
    h.unmount()
  })
})

type StripProps = Parameters<typeof StudioStripPane>[0]
type StripRecord = {
  addedClip: Array<[string, string, number, ("dialogue" | "sfx" | "music")?]>
  taken: Array<[string, number, ("dialogue" | "sfx" | "music")?]>
  keys: Array<[string, unknown]>
}

const ARTIFACTS = new Map([
  ["https://audio.test/line.wav", "line.wav"],
  ["https://audio.test/boom.wav", "boom.wav"],
  ["https://audio.test/song.mp3", "song.mp3"],
])

function makeStripProps(rec: StripRecord, over: Partial<StripProps> = {}): StripProps {
  const props: StripProps = {
    calls: [{ text: "one", start_frame: 0, end_frame: 96 }],
    fps: 24,
    barPrompts: [],
    barLanes: [],
    barAudioClips: [],
    barTotal: 96,
    frameIdx: 0,
    callPreviews: {},
    selectedBarId: null,
    filmMap: null,
    handleBarFrame: () => {},
    handleScrubStart: () => {},
    handleScrubEnd: () => {},
    handleKeyframeAdd: () => "k-new",
    // (addKeyframeWithImage left the studio API with the submenu-law
    // rework — the image door rides the keyframe submenu's own verb)
    handleKeyframeMove: () => {},
    handleKeyframeDelete: () => {},
    handlePromptUpdate: () => {},
    handlePromptMove: () => {},
    handlePromptResize: () => {},
    handlePromptDelete: () => {},
    handleExtend: () => {},
    addCallAt: () => {},
    handleTimelineSelect: () => {},
    layerA: hydrateLayerA(undefined),
    refAudiosBlocked: false,
    addAudioClip: (name, src, startFrame, cls) => { rec.addedClip.push([name, src, startFrame, cls]) },
    takeAudioFile: (file, startFrame, cls) => { rec.taken.push([file.name, startFrame, cls]) },
    moveAudioClip: () => {},
    deleteAudioClip: () => {},
    updateAudioClip: () => {},
    setLayerAKey: (key, value) => { rec.keys.push([key, value]) },
    artifactIndex: { byUrl: new Map(ARTIFACTS) },
    docFromFilm: (frame) => frame,
    keyframes: [],
    addKeyframeWithImage: () => "k",
    enterKfView: () => {},
    enterAudioView: () => {},
  }
  return { ...props, ...over }
}

function renderStrip(over: Partial<StripProps> = {}) {
  const rec: StripRecord = { addedClip: [], taken: [], keys: [] }
  const props = makeStripProps(rec, over)
  const view = render(<StudioStripPane {...props} />)
  return { rec, props, view }
}

function mediaBinding(rows: Array<{ url: string, name: string }>, refused = false): void {
  const dead = (name: string) => async (): Promise<never> => { throw new Error(name) }
  bindEstateRemote({
    bench: { get: dead("bench"), "add-stage": dead("add-stage"), "remove-stage": dead("remove-stage") },
    drafts: { get: dead("drafts"), patch: dead("patch") },
    runs: { list: dead("list"), start: dead("start"), status: dead("status"), stop: dead("stop"), validate: dead("validate") },
    media: {
      list: async () => refused
        ? { ok: false, error: new Error("media refused") }
        : { ok: true, value: { items: rows } },
    },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

async function openFlow(lane: string): Promise<void> {
  fireEvent.click(document.querySelector(`[data-audio-upload="${lane}"]`)!)
  fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
}

async function openMedia(lane: string): Promise<void> {
  fireEvent.click(document.querySelector(`[data-audio-upload="${lane}"]`)!)
  fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
}

async function openFile(lane: string): Promise<HTMLInputElement> {
  fireEvent.click(document.querySelector(`[data-audio-upload="${lane}"]`)!)
  fireEvent.click(await screen.findByRole("menuitem", { name: "From file" }))
  // querySelector answers Element; the caller wants the input's
  // files API — assert the concrete node, never cast past it
  const node = document.querySelector('input[type="file"]')
  assert.ok(node instanceof HTMLInputElement, "file input rendered")
  return node
}

function rowWith(text: string): HTMLElement {
  const row = screen.getAllByTestId("source-pick-row").find((element) => element.textContent?.includes(text))
  assert.ok(row)
  return row!
}

describe("StudioStripPane lane picker", () => {
  it("routes flow, media, file, and clear through the shared picker", async () => {
    mediaBinding([
      { url: "https://foreign.test/room.flac", name: "room.flac" },
      { url: "https://foreign.test/no-extension", name: "named.wav" },
      { url: "https://foreign.test/ignored.txt", name: "ignored" },
    ])
    const { rec, view } = renderStrip()

    await openFlow("music")
    fireEvent.click(rowWith("song.mp3"))
    await openFlow("dialogue")
    fireEvent.click(rowWith("line.wav"))
    await openFlow("sfx")
    fireEvent.click(rowWith("boom.wav"))
    assert.deepEqual(rec.addedClip, [
      ["song.mp3", "https://audio.test/song.mp3", 0, "music"],
      ["line.wav", "https://audio.test/line.wav", 0, "dialogue"],
      ["boom.wav", "https://audio.test/boom.wav", 0, "sfx"],
    ])

    await openMedia("sfx")
    await screen.findAllByTestId("source-pick-row")
    assert.equal(screen.getAllByTestId("source-pick-row").length, 2)
    fireEvent.click(rowWith("room.flac"))
    // THE S9 LAW (2026-10-26): a From-media URL outside this run's
    // artifacts refuses on the strip face — it used to commit a clip
    // that could never play (the mixer skips non-artifact src)
    assert.equal(rec.addedClip.length, 3, "no commit — the foreign pick refuses")
    const face = await screen.findByTestId("tl-strip-file-error")
    assert.ok(face.textContent!.includes("not in this run's artifacts"), face.textContent)

    const input = await openFile("dialogue")
    fireEvent.change(input, { target: { files: [new File(["audio"], "take.wav", { type: "audio/wav" })] } })
    assert.deepEqual(rec.taken, [["take.wav", 0, "dialogue"]])

    fireEvent.click(document.querySelector('[data-audio-upload="music"]')!)
    fireEvent.click(await screen.findByText("— clear —"))
    assert.equal(rec.addedClip.length, 3)
    view.unmount()
  })

  it("refuses a picker pick and a file when the blocker arrives", async () => {
    const flow = renderStrip()
    fireEvent.click(document.querySelector('[data-audio-upload="music"]')!)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const row = rowWith("song.mp3")
    flow.view.rerender(<StudioStripPane {...flow.props} refAudiosBlocked />)
    fireEvent.click(row)
    assert.deepEqual(flow.rec.addedClip, [])
    flow.view.unmount()

    const file = renderStrip()
    const input = await openFile("dialogue")
    file.view.rerender(<StudioStripPane {...file.props} refAudiosBlocked />)
    fireEvent.change(input, { target: { files: [new File(["audio"], "blocked.wav", { type: "audio/wav" })] } })
    assert.deepEqual(file.rec.taken, [])
    file.view.unmount()
  })

  it("shows an honest empty media face when the library refuses", async () => {
    // card-base's square provider moved the refusal OUT of the empty
    // state (2026-09-25): a refused door says so, "nothing to pick yet"
    // now means a genuinely empty library
    mediaBinding([], true)
    renderStrip()
    await openMedia("music")
    await screen.findByText(/media library unavailable.*media refused/)
    expect(screen.queryByText("nothing to pick yet")).toBeNull()
  })
  it("an empty library (not a refusal) still reads as empty", async () => {
    mediaBinding([])
    renderStrip()
    await openMedia("music")
    await screen.findByText("nothing to pick yet")
  })
})

describe("StudioStripPane lane mapping and detach", () => {
  it("maps explicit and legacy classes and detaches every lane", () => {
    const clips: DocAudioClip[] = [
      { id: "d", name: "dialogue", src: "data:d", start_frame: 0, dur_frames: 20, class: "dialogue" },
      { id: "s", name: "sfx", src: "data:s", start_frame: 0, dur_frames: 20, class: "sfx" },
      { id: "m", name: "music", src: "data:m", start_frame: 0, dur_frames: 20, class: "music" },
      { id: "ld", name: "legacy dialogue", src: "data:ld", start_frame: 0, dur_frames: 20, text: "say" },
      { id: "lm", name: "legacy music", src: "data:lm", start_frame: 0, dur_frames: 20 },
    ]
    const barClips = clips as unknown as StripProps["barAudioClips"]
    const layerA: LayerA = { ...hydrateLayerA(undefined), audio_clips: clips }
    const { rec, view } = renderStrip({ barAudioClips: barClips, layerA })
    assert.ok(document.querySelector('[data-audio-layer="dialogue"] [data-audio-clip="ld"]'))
    assert.ok(document.querySelector('[data-audio-layer="music"] [data-audio-clip="lm"]'))
    fireEvent.click(screen.getByLabelText("Detach Dialogue"))
    fireEvent.click(screen.getByLabelText("Detach SFX"))
    fireEvent.click(screen.getByLabelText("Detach Music"))
    assert.equal(rec.keys.length, 4)
    assert.deepEqual((rec.keys[0]![1] as StripProps["barAudioClips"]).map((c) => c.id), ["s", "m", "lm"])
    assert.deepEqual((rec.keys[1]![1] as StripProps["barAudioClips"]).map((c) => c.id), ["d", "m", "ld", "lm"])
    assert.deepEqual((rec.keys[2]![1] as StripProps["barAudioClips"]).map((c) => c.id), ["d", "s", "ld"])
    assert.deepEqual(rec.keys[3], ["audio_stem", undefined])
    view.unmount()
  })

  it("clears the last lane clip and a stem-only layer", () => {
    const one: DocAudioClip[] = [
      { id: "only", name: "only", src: "data:o", start_frame: 0, dur_frames: 10, class: "sfx" },
    ]
    const barOne = one as unknown as StripProps["barAudioClips"]
    const clipLayer: LayerA = { ...hydrateLayerA(undefined), audio_clips: one }
    const clipView = renderStrip({ barAudioClips: barOne, layerA: clipLayer })
    fireEvent.click(screen.getByLabelText("Detach SFX"))
    assert.deepEqual(clipView.rec.keys, [["audio_clips", undefined]])
    clipView.view.unmount()

    const stemView = renderStrip({ layerA: { ...hydrateLayerA(undefined), audio_stem: "data:bed" } })
    fireEvent.click(screen.getByLabelText("Detach Music"))
    assert.deepEqual(stemView.rec.keys, [["audio_clips", undefined], ["audio_stem", undefined]])
    stemView.view.unmount()
  })
})

type DerivedArgs = Parameters<typeof useDerivedView>[0]

function derivedView(over: Partial<DerivedArgs> = {}) {
  const args: DerivedArgs = {
    upstreams: undefined,
    stage: { params: {}, result: undefined } as unknown as CardStage,
    calls: [
      { start_frame: 0, end_frame: 48 },
      { start_frame: 48, end_frame: 96 },
      { start_frame: 96, end_frame: 144 },
    ],
    layerA: hydrateLayerA(undefined),
    keyframes: [],
    filmMap: null,
    filmFromDoc: (frame) => frame,
    selected: null,
    fps: 24,
    totalFrames: 144,
    ...over,
  }
  return renderHook(() => useDerivedView(args))
}

describe("useDerivedView voice pins", () => {
  it("maps every clip class and overlap guard into the pinned call set", () => {
    const missingDuration = {
      id: "missing-duration",
      name: "missing duration",
      src: "data:missing",
      start_frame: 10,
      class: "sfx",
    } as unknown as DocAudioClip
    const clips: DocAudioClip[] = [
      { id: "dialogue", name: "dialogue", src: "data:d", start_frame: 10, dur_frames: 20, class: "dialogue" },
      { id: "legacy-dialogue", name: "legacy dialogue", src: "data:ld", start_frame: 60, dur_frames: 20, text: "say" },
      { id: "sfx", name: "sfx", src: "data:s", start_frame: 110, dur_frames: 20, class: "sfx" },
      { id: "music", name: "music", src: "data:m", start_frame: 20, dur_frames: 20, class: "music" },
      { id: "legacy-music", name: "legacy music", src: "data:lm", start_frame: 70, dur_frames: 20 },
      { id: "zero", name: "zero", src: "data:z", start_frame: 0, dur_frames: 0, class: "dialogue" },
      missingDuration,
      { id: "after", name: "after", src: "data:a", start_frame: 200, dur_frames: 20, class: "dialogue" },
    ]
    const { result } = derivedView({ layerA: { ...hydrateLayerA(undefined), audio_clips: clips } })
    assert.deepEqual([...result.current.voicePinnedCalls], [0, 1, 2])
  })

  it("skips zero and missing durations before testing overlap", () => {
    const missingDuration = {
      id: "missing",
      name: "missing",
      src: "data:missing",
      start_frame: 10,
      class: "sfx",
    } as unknown as DocAudioClip
    const { result } = derivedView({
      calls: [{ start_frame: 0, end_frame: 48 }],
      layerA: {
        ...hydrateLayerA(undefined),
        audio_clips: [
          { id: "zero", name: "zero", src: "data:zero", start_frame: 10, dur_frames: 0, class: "dialogue" },
          missingDuration,
        ],
      },
    })
    assert.deepEqual([...result.current.voicePinnedCalls], [])
  })
})

type FilmAudioArgs = Parameters<typeof useFilmAudio>[0]

function filmAudioView(initialLayer: LayerA) {
  const filmFpsRef = { current: null as number | null }
  const h = renderHook(
    ({ layerA }: { layerA: LayerA }) => {
      const [state, setState] = useState(layerA)
      const audio = useFilmAudio({
        ...({} as Omit<FilmAudioArgs, "layerA" | "setLayerA" | "setLayerAKey">),
        stage: { params: {}, result: undefined } as unknown as CardStage,
        layerA: state,
        setLayerA: setState,
        setLayerAKey: ((key: never, value: never) => {
          setState((previous) => ({ ...previous, [key]: value }))
        }) as never,
        fps: 24,
        frameIdx: 0,
        filmPlaying: false,
        filmFpsRef,
      } satisfies FilmAudioArgs)
      return { ...audio, layerA: state }
    },
    { initialProps: { layerA: initialLayer } },
  )
  return { ...h, filmFpsRef }
}

describe("useFilmAudio authored clip updates", () => {
  it("adds explicit classes and patches only the selected clip", () => {
    const initial = {
      ...hydrateLayerA(undefined),
      audio_clips: [
        { id: "a", name: "a", src: "data:a", start_frame: 0, dur_frames: 24 },
        { id: "b", name: "b", src: "data:b", start_frame: 24, dur_frames: 24 },
      ] satisfies DocAudioClip[],
    } satisfies LayerA
    const { result } = filmAudioView(initial)
    act(() => { result.current.addAudioClip("sfx", "data:sfx", 0, "sfx") })
    const added = result.current.layerA.audio_clips!.at(-1)!
    assert.equal(added.class, "sfx")
    act(() => { result.current.updateAudioClip("a", { class: "music", text: "description" }) })
    const clips = result.current.layerA.audio_clips!
    assert.equal(clips.find((clip) => clip.id === "a")?.class, "music")
    assert.equal(clips.find((clip) => clip.id === "a")?.text, "description")
    assert.equal(clips.find((clip) => clip.id === "b")?.class, undefined)
    const beforeUnknown = result.current.layerA
    act(() => { result.current.updateAudioClip("missing", { text: "no" }) })
    expect(result.current.layerA).toBe(beforeUnknown)
  })
})
