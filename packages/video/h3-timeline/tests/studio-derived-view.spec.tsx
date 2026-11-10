/**
 * useDerivedView — upstream vocabulary, filmstrip, bar-space memos (BEHAVIORAL).
 *
 * PINS: the source picker vocabulary (name → upstream title, missing
 * results skipped), the Link2 image groups (shared isImageUrl rule),
 * the filmstrip (window pick, junk filtered, flat-list fallback union,
 * final-cut pick), and every bar-space translation (prompts, lanes,
 * audio, previews, selection) with and without a film map.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useDerivedView } from "../src/ui/studio/useDerivedView.ts"
import type { CardStage } from "@melite/contracts"
import type { DocCall, DocKeyframe, LayerA } from "../src/ui/studio/docModel.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import type { TimelineSelection } from "../src/ui/studio/useViewSelection.ts"

const stageWith = (result?: unknown): CardStage =>
  ({ params: {}, result }) as unknown as CardStage

const CALLS: DocCall[] = [
  { text: "rain", start_frame: 0, end_frame: 48 },
  { text: "sun", start_frame: 48, end_frame: 96 },
]
const KEYS: DocKeyframe[] = [{ image: "s", frame: 10 }]
const LAYER: LayerA = hydrateLayerA({ fps: 24 })

function view(opts?: {
  upstreams?: CardStage[]
  stage?: CardStage
  calls?: DocCall[]
  layerA?: LayerA
  keyframes?: DocKeyframe[]
  filmMap?: { totalFrames?: number; fps?: number } | null
  filmFromDoc?: (f: number) => number
  selected?: TimelineSelection | null
  fps?: number
  totalFrames?: number
  artifactIndex?: { byName: ReadonlyMap<string, string> }
  docParams?: Record<string, unknown>
}) {
  return renderHook(() => useDerivedView({
    upstreams: opts?.upstreams,
    stage: opts?.stage ?? stageWith(undefined),
    calls: opts?.calls ?? CALLS,
    layerA: opts?.layerA ?? LAYER,
    keyframes: opts?.keyframes ?? KEYS,
    filmMap: (opts?.filmMap ?? null) as never,
    filmFromDoc: opts?.filmFromDoc ?? ((f: number) => f),
    selected: opts?.selected ?? null,
    fps: opts?.fps ?? 24,
    totalFrames: opts?.totalFrames ?? 96,
    artifactIndex: opts?.artifactIndex,
    docParams: opts?.docParams,
  }))
}

describe("sourceOptions + linkGroups (the upstream vocabulary)", () => {
  const UP = stageWith({
    artifacts: {
      "clip-a": "https://u/a.png",
      "clip-b": "https://u/b.mp4",
      "clip-c": "",
      "clip-d": 42,
    },
  })

  it("names every artifact; links only real images (the shared rule)", () => {
    const { result } = view({ upstreams: [stageWith(undefined), UP] })
    assert.equal(result.current.sourceOptions.length, 4)
    assert.deepEqual(result.current.sourceOptions[0], { title: UP.title, name: "clip-a" })
    // video, empty and non-string artifacts are not Link2's language
    assert.deepEqual(result.current.linkGroups.map((g) => g.name), ["clip-a"])
    assert.equal(result.current.linkGroups[0]!.url, "https://u/a.png")
  })

  it("no upstreams = empty vocabulary (never a crash)", () => {
    const { result } = view()
    assert.deepEqual(result.current.sourceOptions, [])
    assert.deepEqual(result.current.linkGroups, [])
    expect(result.current.sourceOptions.length).toBe(0)
  })
})

describe("filmstrip (the last run's windows)", () => {
  it("picks window renders; junk never becomes a tile", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: {
          video_w0_main: "https://r/w0.mp4",
          video_w1_main: "https://r/w1.mp4",
          video_w0_last_frame: "https://r/lf.png",
          video_w1_seam_0: "https://r/seam.mp4",
          video_w1_prev_leak: "https://r/prev.mp4",
          poster: "https://r/poster.png",
          ghost: "",
          n: 9,
          video: "https://r/final.mp4",
        },
        assetUrls: ["https://r/final.mp4"],
      }),
    })
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.name),
      ["video_w0_main", "video_w1_main"],
    )
    assert.equal(result.current.filmstrip.final, "https://r/final.mp4")
  })

  it("the flat-list fallback unions clips the artifact map lost", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: { video_w0_main: "https://r/w0.mp4", video: "https://r/final.mp4" },
        assetUrls: ["https://r/final.mp4", "https://r/window12_video.mp4", "https://r/w0.mp4", "", "https://r/odd-clip.mp4"],
      }),
    })
    const names = result.current.filmstrip.windows.map((w) => w.name)
    // window12_video earns its canonical name; the dup + empty skip; the
    // odd clip joins under its filename
    assert.deepEqual(names, ["video_w0_main", "video_w12_main", "odd-clip.mp4"])
  })

  // THE RESHOOT HERO (2026-11-15 burn, live shape verbatim from
  // run-bb1ce19bd192 / bench s_65): the reshoot's product saves
  // under the WINDOW spelling (h3_t4_w1_00001_) while the engine
  // re-saves the SOURCE CLIP beside it under the estate's dedup
  // stamp (`__e80f2bcec264`) — the stamp breaks the window regex,
  // so the name-only law crowned the ORIGINAL (the stamped twin)
  // the final cut while the estate's url pointed at the RESHOOT
  // (byte-proven on the lane: hero 1.8MB md5 680130dedad3, twin
  // 5.9MB md5 ad7a7a85aba6 == the source clip's bytes). The
  // estate's hero pointer must win.
  it("reshoot: the estate hero pointer is the final cut — never the dedup-stamped source copy", () => {
    const { result } = view({
      stage: stageWith({
        url: "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
        artifacts: {
          "h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4": "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
          "h3-film/SaveImage.1_reshoot_orbit_00001_.png": "https://r/run-bb1ce19bd192/h3-film/SaveImage.1_reshoot_orbit_00001_.png",
          "h3-film/SaveImage.0_reshoot_warp_00001_.png": "https://r/run-bb1ce19bd192/h3-film/SaveImage.0_reshoot_warp_00001_.png",
          "h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4": "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4",
        },
        assetUrls: [
          "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
          "https://r/run-bb1ce19bd192/h3-film/SaveImage.1_reshoot_orbit_00001_.png",
          "https://r/run-bb1ce19bd192/h3-film/SaveImage.0_reshoot_warp_00001_.png",
          "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4",
        ],
      }),
    })
    assert.equal(
      result.current.filmstrip.final,
      "https://r/run-bb1ce19bd192/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
    )
    // the indexed window is the reshoot (window 1); the flat-list
    // union law then tiles the gallery's every remaining entry
    // (the two reshoot probe pngs + the stamped source copy) — clip
    // loss can never hide, and the twin stays WALKABLE, never the hero
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.name),
      [
        "h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4",
        "SaveImage.1_reshoot_orbit_00001_.png",
        "SaveImage.0_reshoot_warp_00001_.png",
        "SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4",
      ],
    )
  })

  it("a bare stage degrades to empty windows + null final (never a crash)", () => {
    const { result } = view({ stage: stageWith(undefined) })
    assert.deepEqual(result.current.filmstrip.windows, [])
    assert.equal(result.current.filmstrip.final, null)
    const { result: r2 } = view({ stage: stageWith({ artifacts: {}, assetUrls: "x" }) })
    assert.deepEqual(r2.current.filmstrip.windows, [])
    // flat final when no named video exists
    const { result: r3 } = view({ stage: stageWith({ artifacts: {}, assetUrls: ["https://r/only.mp4"] }) })
    assert.equal(r3.current.filmstrip.final, "https://r/only.mp4")
    expect(r3.current.filmstrip.windows.length).toBe(0)
  })

  // THE ARTIFACT-NAME CONTRACT (2026-09-23): the queue publishes the
  // card's REAL save names — fixture verbatim from run-b664de5e4155
  // (the first-clip preview defect: the face grepped a dead era's
  // names and the film could never be the hero).
  it("real engine names: the film is the hero, windows tile by index", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: {
          // gallery order as the queue leads it (filmLead.ts): film first
          "h3_t4_film_00019_.mp4": "https://r/h3_t4_film_00019_.mp4",
          "h3_t4_w1_00003_.mp4": "https://r/h3_t4_w1_00003_.mp4",
          "h3_t4_w2_00002_.mp4": "https://r/h3_t4_w2_00002_.mp4",
          "h3_t4_w3_00003_.mp4": "https://r/h3_t4_w3_00003_.mp4",
        },
        assetUrls: [
          "https://r/h3_t4_film_00019_.mp4",
          "https://r/h3_t4_w1_00003_.mp4",
          "https://r/h3_t4_w2_00002_.mp4",
          "https://r/h3_t4_w3_00003_.mp4",
        ],
      }),
    })
    assert.equal(result.current.filmstrip.final, "https://r/h3_t4_film_00019_.mp4")
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.name),
      ["h3_t4_w1_00003_.mp4", "h3_t4_w2_00002_.mp4", "h3_t4_w3_00003_.mp4"],
    )
  })

  // F14 (2026-11-12) — THE RUN-SCOPE KEY SHAPES: film saves ride
  // `<runId>/…`, so the run row key may arrive with a leading run
  // path (the subfolder spelling) or a leading harvest nodeId
  // segment (the flat `<nodeId>_<name>` spelling). Both must hero
  // the film and tile the windows — the name contract's run-scoped
  // era, never a regression to flat-only matching.
  it("run-scoped keys: the film is the hero, windows tile by index (path and nodeId shapes)", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: {
          "run-abc123/h3_t4_film_00001_.mp4": "https://r/film.mp4",
          "run-abc123/h3_t4_w1_00001_.mp4": "https://r/w1.mp4",
          "42_h3_t4_w2_00001_.mp4": "https://r/w2.mp4",
        },
        assetUrls: ["https://r/film.mp4", "https://r/w1.mp4", "https://r/w2.mp4"],
      }),
    })
    assert.equal(result.current.filmstrip.final, "https://r/film.mp4")
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.url),
      ["https://r/w1.mp4", "https://r/w2.mp4"],
    )
  })

  // THE BORN-NAMED FILM (queue 12's file plane, 2026-11-19): a run
  // that spelled output_name delivers `h3_t4_film_<slug>_<n>_.mp4`
  // — the browser-side hero finder (useDerivedView's mirror of
  // filmLead.ts) must seat the NAMED film as the hero; a window
  // never takes the cut seat because the finder missed the slug.
  it("the born-named film is the hero: the slug segment never breaks the hero pick", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: {
          "run-abc123/h3_t4_film_chase_00001_.mp4": "https://r/film-chase.mp4",
          "run-abc123/h3_t4_w1_00001_.mp4": "https://r/w1.mp4",
        },
        assetUrls: ["https://r/film-chase.mp4", "https://r/w1.mp4"],
      }),
    })
    assert.equal(result.current.filmstrip.final, "https://r/film-chase.mp4")
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.url),
      ["https://r/w1.mp4"],
    )
  })

  it("a window can never impersonate the hero when the film is absent", () => {
    const { result } = view({
      stage: stageWith({
        artifacts: {
          "h3_t4_w1_00003_.mp4": "https://r/h3_t4_w1_00003_.mp4",
          "h3_t4_w2_00002_.mp4": "https://r/h3_t4_w2_00002_.mp4",
        },
        assetUrls: ["https://r/h3_t4_w1_00003_.mp4", "https://r/h3_t4_w2_00002_.mp4"],
      }),
    })
    assert.deepEqual(
      result.current.filmstrip.windows.map((w) => w.name),
      ["h3_t4_w1_00003_.mp4", "h3_t4_w2_00002_.mp4"],
    )
    assert.equal(result.current.filmstrip.final, null)
  })
})

describe("bar-space memos (film map on/off)", () => {
  const MAP = { totalFrames: 390, fps: 30 } as never
  const plus100 = (f: number) => f + 100

  it("prompts/lanes/audio/previews ride identity with no map", () => {
    const { result } = view()
    assert.equal(result.current.prompts.length, 2)
    assert.equal(result.current.barPrompts[0]!.start_frame, result.current.prompts[0]!.start_frame)
    assert.equal(result.current.barLanes.length, result.current.lanes.length)
    assert.deepEqual(result.current.barAudioClips, [])
    assert.deepEqual(result.current.callPreviews, {})
    assert.equal(result.current.barTotal, 96)
  })

  it("a film map translates every endpoint (audio narrows, previews index 1:1)", () => {
    const layerA: LayerA = {
      ...LAYER,
      audio_clips: [
        { id: "m", name: "m", src: "data:x", start_frame: 0, dur_frames: 48, gain: 1 },
        { id: "z", name: "z", src: "data:y", start_frame: 60, dur_frames: 0 },
      ],
    }
    const { result } = view({
      stage: stageWith({ artifacts: { video_w0_main: "https://r/w0.mp4", video_w1_main: "https://r/w1.mp4" } }),
      layerA,
      filmMap: MAP,
      filmFromDoc: plus100,
    })
    assert.equal(result.current.barPrompts[0]!.start_frame, result.current.prompts[0]!.start_frame + 100)
    assert.equal(result.current.barLanes[0]!.frame, result.current.lanes[0]!.frame + 100)
    assert.equal(result.current.barAudioClips[0]!.start_frame, 100)
    assert.equal(result.current.barAudioClips[0]!.dur_frames, 48)
    // zero-width still draws (min 1)
    assert.equal(result.current.barAudioClips[1]!.dur_frames, 1)
    assert.deepEqual(result.current.callPreviews, { "call-0": "https://r/w0.mp4", "call-1": "https://r/w1.mp4" })
    assert.equal(result.current.barTotal, 390)
  })

  it("the no-map fallback sizes the axis from the film's own duration", () => {
    const { result } = view({ filmMap: { fps: 30 } as never })
    act(() => { result.current.setFilmDurSec(10) })
    // 10s × the FILM's 30fps (never the doc rail's 24)
    assert.equal(result.current.barTotal, 300)
    const { result: r2 } = view()
    act(() => { r2.current.setFilmDurSec(10) })
    assert.equal(r2.current.barTotal, 240)
    expect(result.current.filmDurSec).toBe(10)
  })

  it("THE VERB'S OWN EXTENT (D-19) — an armed edit window sizes the axis BEFORE any prior film", () => {
    // the stated window wins over the map: a fresh never-run armed
    // doc books its OWN stated window, never a past run's 390
    const { result } = view({
      filmMap: MAP,
      docParams: { edit: [{ edit_prompt: "make it rain", window_length: 56 }] },
    })
    assert.equal(result.current.barTotal, 56,
      "the armed edit's stated window_length is the face's input extent — before the film map's 390")
    // window_start rides when stated (the verb's own geometry)
    const started = view({
      filmMap: MAP,
      docParams: { edit: [{ edit_prompt: "make it rain", window_start: 10, window_length: 56 }] },
    })
    assert.equal(started.result.current.barTotal, 66,
      "a stated window_start sums into the extent (10 + 56)")
    // zero/absent length is not a stated window — the chain falls to
    // the map (the tier order, never a silent junk extent)
    const unstated = view({
      filmMap: MAP,
      docParams: { edit: [{ edit_prompt: "make it rain" }] },
    })
    assert.equal(unstated.result.current.barTotal, 390,
      "no stated window: the film map still sizes the axis")
    const zeroed = view({
      filmMap: MAP,
      docParams: { edit: [{ edit_prompt: "make it rain", window_length: 0 }] },
    })
    assert.equal(zeroed.result.current.barTotal, 390,
      "a zero window_length is NOT a stated window (the door holds grid legality)")
  })
})

describe("selectedBarId (the ring the bar draws)", () => {
  it("null / call / beat", () => {
    assert.equal(view().result.current.selectedBarId, null)
    assert.equal(
      view({ selected: { callIdx: 1 } as TimelineSelection }).result.current.selectedBarId,
      "call-1",
    )
  })
})

describe("keyframe chip thumbs (slice 3 — the pin lane's faces)", () => {
  it("a bare artifact name thumbs through the index; a direct URL rides verbatim; an unknown name stays absent", () => {
    const { result } = view({
      keyframes: [
        { image: "own_out", frame: 10 },
        { image: "https://u/direct.png", frame: 20 },
        { image: "ghost", frame: 30 },
      ],
      artifactIndex: { byName: new Map([["own_out", "https://r/own_out.png"]]) },
    })
    assert.deepEqual(result.current.lanes[0], {
      uuid: "kf-0", track_id: "image", frame: 10, value: null,
      thumbUrl: "https://r/own_out.png",
    })
    assert.equal(result.current.lanes[1]!.thumbUrl, "https://u/direct.png")
    assert.ok(!("thumbUrl" in result.current.lanes[2]!), "an unresolvable name never thumbs")
  })

  it("no index (motion, tests) = names never thumb; the film map keeps the face through the frame translation", () => {
    const { result } = view({
      keyframes: [{ image: "own_out", frame: 10 }],
      filmFromDoc: (f: number) => f + 100,
      filmMap: { totalFrames: 200 } as never,
    })
    assert.ok(!("thumbUrl" in result.current.barLanes[0]!))
    assert.equal(result.current.barLanes[0]!.frame, 110)
  })
})
