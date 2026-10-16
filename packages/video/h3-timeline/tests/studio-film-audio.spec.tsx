/**
 * useFilmAudio — davinci map, artifact index, clips + mixer (BEHAVIORAL).
 *
 * PINS: the film map (valid/invalid metadata; doc⇄film conversion
 * including overshoot clamps and zero-span scales), the artifact
 * index (own ∪ upstream, upstream-wins, junk skipped), src
 * resolution (data: passthrough, name lookup, null), clip add
 * (4s fallback + probe correction) / move / delete / file intake
 * (type + size gates), and the mixer (span play/pause, drift
 * resync, gain, unmount silence).
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useState } from "react"
import { useFilmAudio } from "../src/ui/studio/useFilmAudio.ts"
import type { CardStage } from "@melite/contracts"
import type { LayerA } from "../src/ui/studio/docModel.ts"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"

afterEach(() => { vi.unstubAllGlobals() })

const FILM = {
  fps: 30,
  totalFrames: 390,
  windows: [
    { start: 0, len: 200, trim: 8, docStart: 0, docSpan: 180 },
    { start: 200, len: 190, trim: 8, docStart: 180, docSpan: 165 },
  ],
}
const stageWith = (result?: unknown, params?: unknown): CardStage =>
  ({ params: params ?? {}, result }) as unknown as CardStage

function harness(opts?: {
  stage?: CardStage
  upstreams?: CardStage[]
  layerA?: LayerA
  frameIdx?: number
  filmPlaying?: boolean
  fps?: number
}) {
  const filmFpsRef = { current: null as number | null }
  const h = renderHook(
    ({ layerA, frameIdx, filmPlaying }) => {
      const [la, setLa] = useState(layerA)
      const r = useFilmAudio({
        stage: opts?.stage ?? stageWith(undefined),
        upstreams: opts?.upstreams,
        layerA: la,
        setLayerA: setLa,
        setLayerAKey: ((k: never, v: never) => { setLa((p) => ({ ...p, [k]: v })) }) as never,
        fps: opts?.fps ?? 24,
        frameIdx,
        filmPlaying,
        filmFpsRef,
      })
      return { ...r, layerA: la }
    },
    { initialProps: { layerA: opts?.layerA ?? hydrateLayerA(undefined), frameIdx: opts?.frameIdx ?? 0, filmPlaying: opts?.filmPlaying ?? false } },
  )
  return { ...h, filmFpsRef }
}

describe("filmMap (the gateway's probed truth)", () => {
  it("valid metadata maps; anything else is identity (null)", () => {
    const good = harness({ stage: stageWith({ metadata: { film: FILM } }) })
    assert.equal(good.result.current.filmMap!.totalFrames, 390)
    assert.equal(good.filmFpsRef.current, 30)
    for (const bad of [
      stageWith(undefined),
      stageWith({}),
      stageWith({ metadata: {} }),
      stageWith({ metadata: { film: { ...FILM, windows: "x" } } }),
      stageWith({ metadata: { film: { ...FILM, windows: [] } } }),
      stageWith({ metadata: { film: { ...FILM, totalFrames: 0 } } }),
      stageWith({ metadata: { film: { ...FILM, totalFrames: undefined } } }),
    ]) {
      const h = harness({ stage: bad })
      assert.equal(h.result.current.filmMap, null)
      assert.equal(h.filmFpsRef.current, null)
    }
    expect(good.result.current.filmMap!.fps).toBe(30)
  })

  it("filmFromDoc/docFromFilm translate (window pick, scale, overshoot clamps)", () => {
    const { result } = harness({ stage: stageWith({ metadata: { film: FILM } }) })
    // window 0: 8 carried + 90 × 192/180
    assert.equal(result.current.filmFromDoc(90), 104)
    // window 1: 200 + 8 + 20 × 182/165
    assert.equal(result.current.filmFromDoc(200), 230)
    // plan overshoot clamps to the film tail
    assert.equal(result.current.filmFromDoc(400), 390)
    // back: seam head clamps to the call start
    assert.equal(result.current.docFromFilm(100), 86)
    assert.equal(result.current.docFromFilm(204), 180)
    // film overshoot clamps to the plan tail
    assert.equal(result.current.docFromFilm(900), 345)
  })

  it("zero-span windows scale 1 (never a divide-by-zero)", () => {
    const flat = { fps: 24, totalFrames: 100, windows: [{ start: 0, len: 100, trim: 0, docStart: 0, docSpan: 0 }] }
    const { result } = harness({ stage: stageWith({ metadata: { film: flat } }) })
    // inside the zero-span window: scale 1 (no divide-by-zero)
    assert.equal(result.current.filmFromDoc(0), 0)
    assert.equal(result.current.docFromFilm(0), 0)
    // past it: both directions clamp to the tails
    assert.equal(result.current.filmFromDoc(40), 100)
    assert.equal(result.current.docFromFilm(40), 0)
  })

  it("no map = identity both ways", () => {
    const { result } = harness()
    assert.equal(result.current.filmFromDoc(77), 77)
    assert.equal(result.current.docFromFilm(77), 77)
  })
})

describe("artifactIndex + audioSrcUrl (the drop honesty)", () => {
  const OWN = stageWith({ artifacts: { win: "https://x/win.mp4", pic: "https://x/p.png", empty: "", num: 42 } })
  const UP = stageWith({ artifacts: { win: "https://live/win.mp4", song: "https://live/s.mp3", blank: "", n: 7 } })
  const NORES = stageWith({}) as CardStage

  it("own ∪ upstream; upstream wins collisions; junk never indexes", () => {
    const { result } = harness({ stage: OWN, upstreams: [NORES, UP] })
    // upstream wins the collision (a live ctx reference beats same-named)
    assert.equal(result.current.artifactIndex.byName.get("win"), "https://live/win.mp4")
    assert.equal(result.current.artifactIndex.byUrl.get("https://live/win.mp4"), "win")
    assert.equal(result.current.artifactIndex.byName.get("pic"), "https://x/p.png")
    assert.ok(!result.current.artifactIndex.byName.has("empty"))
    assert.ok(!result.current.artifactIndex.byName.has("num"))
    // own {win, pic} ∪ upstream {win→live, song} = 3 names (collision merges)
    assert.equal(result.current.refArtifacts.length, 3)
  })

  it("no upstreams at all still indexes the run's own artifacts", () => {
    const { result } = harness({ stage: OWN })
    assert.equal(result.current.artifactIndex.byName.get("pic"), "https://x/p.png")
    expect(result.current.refArtifacts.length).toBe(2)
  })

  it("audioSrcUrl: data: rides itself; names resolve; unknown is null (mixer skips)", () => {
    const { result } = harness({ stage: OWN })
    assert.equal(result.current.audioSrcUrl("data:audio/mp3;base64,AA"), "data:audio/mp3;base64,AA")
    assert.equal(result.current.audioSrcUrl("pic"), "https://x/p.png")
    assert.equal(result.current.audioSrcUrl("ghost"), null)
  })
})

describe("addAudioClip (probe-then-correct)", () => {
  function captureAudio() {
    const probes: HTMLAudioElement[] = []
    const RealAudio = globalThis.Audio
    class CapAudio extends RealAudio {
      constructor() {
        super()
        probes.push(this)
      }
    }
    vi.stubGlobal("Audio", CapAudio)
    return { probes, restore: () => { vi.unstubAllGlobals() } }
  }

  /** The duration probe (preload=metadata) — not the mixer's element. */
  function probeOf(probes: HTMLAudioElement[]) {
    const p = probes.find((e) => e.preload === "metadata")
    assert.ok(p, "a probe element was created")
    return p!
  }

  it("lands a 4s fallback at the frame (floored at 0, rounded)", () => {
    const cap = captureAudio()
    try {
      const { result } = harness()
      let id = ""
      act(() => { id = result.current.addAudioClip("song", "data:audio/mp3;base64,AA", -4) })
      const clip = result.current.layerA.audio_clips![0]!
      assert.equal(clip.id, id)
      assert.equal(clip.start_frame, 0)
      assert.equal(clip.dur_frames, 96)
      // a probe rode (the mixer may also mint its element — find by role)
      assert.ok(probeOf(cap.probes))
    } finally {
      cap.restore()
    }
  })

  it("the probe corrects the duration (only the probed clip)", async () => {
    const cap = captureAudio()
    try {
      const { result } = harness({
        layerA: {
          ...hydrateLayerA(undefined),
          audio_clips: [{ id: "old", name: "o", src: "data:audio/mp3;base64,AA", start_frame: 0, dur_frames: 96 }],
        },
      })
      act(() => { result.current.addAudioClip("new", "data:audio/mp3;base64,AA", 10) })
      const probe = probeOf(cap.probes)
      Object.defineProperty(probe, "duration", { value: 8, configurable: true })
      await act(async () => { probe.dispatchEvent(new Event("loadedmetadata")) })
      const clips = result.current.layerA.audio_clips!
      assert.equal(clips.length, 2)
      assert.equal(clips[0]!.dur_frames, 96)
      assert.equal(clips[1]!.dur_frames, 192)
    } finally {
      cap.restore()
    }
  })

  it("a late probe against a clip-less doc is a safe no-op", async () => {
    const cap = captureAudio()
    try {
      const { result } = renderHook(() => {
        const [la, setLa] = useState(hydrateLayerA(undefined))
        const r = useFilmAudio({
          stage: stageWith(undefined),
          layerA: la,
          setLayerA: setLa,
          setLayerAKey: ((k: never, v: never) => { setLa((p) => ({ ...p, [k]: v })) }) as never,
          fps: 24,
          frameIdx: 0,
          filmPlaying: false,
          filmFpsRef: { current: null },
        })
        return {
          ...r,
          layerA: la,
          strip: () => setLa((p) => {
            const { audio_clips: _d, ...rest } = p
            void _d
            return rest
          }),
        }
      })
      act(() => { result.current.addAudioClip("n", "data:audio/mp3;base64,AA", 0) })
      const probe = probeOf(cap.probes)
      // the clip vanishes before the probe lands (deleted key, not [])
      act(() => { result.current.strip() })
      Object.defineProperty(probe, "duration", { value: 8, configurable: true })
      await act(async () => { probe.dispatchEvent(new Event("loadedmetadata")) })
      // the probe maps over nothing (the `?? []` arm) — an empty row, never a crash
      assert.deepEqual(result.current.layerA.audio_clips, [])
    } finally {
      cap.restore()
    }
  })

  it("a junk probe duration leaves the fallback (never NaN on the row)", async () => {
    const cap = captureAudio()
    try {
      const { result } = harness()
      act(() => { result.current.addAudioClip("n", "data:audio/mp3;base64,AA", 0) })
      const probe = probeOf(cap.probes)
      Object.defineProperty(probe, "duration", { value: NaN, configurable: true })
      await act(async () => { probe.dispatchEvent(new Event("loadedmetadata")) })
      assert.equal(result.current.layerA.audio_clips![0]!.dur_frames, 96)
    } finally {
      cap.restore()
    }
  })

  it("index-backed sources probe through the index; unknown sources unhook", () => {
    const cap = captureAudio()
    const OWN = stageWith({ artifacts: { song: "https://x/s.mp3" } })
    try {
      const { result } = harness({ stage: OWN })
      act(() => { result.current.addAudioClip("song", "song", 0) })
      const via = probeOf(cap.probes)
      assert.ok(via.src.includes("s.mp3"))
      act(() => { result.current.addAudioClip("ghost", "ghost", 0) })
      // unresolvable: the probe carries no media src (the guard unhooks
      // it — happy-dom resolves "" to the base URL, never to s.mp3)
      const ghost = cap.probes.find((p) => p.preload === "metadata" && !p.src.includes("s.mp3"))
      assert.ok(ghost, "the ghost probe rides sourceless")
      assert.equal(result.current.layerA.audio_clips!.length, 2)
    } finally {
      cap.restore()
    }
  })
})

describe("moveAudioClip / deleteAudioClip", () => {
  const CLIPS: LayerA = {
    ...hydrateLayerA(undefined),
    audio_clips: [
      { id: "a", name: "a", src: "data:x", start_frame: 10, dur_frames: 48 },
      { id: "b", name: "b", src: "data:y", start_frame: 60, dur_frames: 48 },
    ],
  }

  it("moves clamp at 0; unknown ids keep identity", () => {
    const { result } = harness({ layerA: CLIPS })
    act(() => { result.current.moveAudioClip("a", -30) })
    assert.equal(result.current.layerA.audio_clips![0]!.start_frame, 0)
    assert.equal(result.current.layerA.audio_clips![1]!.start_frame, 60)
    const before = result.current.layerA
    act(() => { result.current.moveAudioClip("zzz", 5) })
    assert.ok(result.current.layerA === before)
  })

  it("a clip-less doc ignores moves (never a crash)", () => {
    const { result } = harness()
    const before = result.current.layerA
    act(() => { result.current.moveAudioClip("a", 5) })
    assert.ok(result.current.layerA === before)
  })

  it("deletes drop the clip (empty doc deletes stay empty)", () => {
    const { result } = harness({ layerA: CLIPS })
    act(() => { result.current.deleteAudioClip("a") })
    assert.deepEqual(result.current.layerA.audio_clips!.map((c) => c.id), ["b"])
    const { result: r2 } = harness()
    act(() => { r2.current.deleteAudioClip("a") })
    assert.deepEqual(r2.current.layerA.audio_clips, [])
    expect(result.current.layerA.audio_clips!.length).toBe(1)
  })

  it("THE STEM RESURRECTION (2026-10-16, audit 645981ec AUDIO-1): deleting the LAST clip ends the stem too — a reopen never replays a deleted clip", () => {
    // the resurrection chain, exactly as the burn ran it: a doc with
    // a legacy stem and its converted clip deletes that clip → the
    // stem stayed → serialize rode it → the next hydrate
    // re-converted it as a clip at frame 0 → the run replayed the
    // deleted audio.
    const stemDoc = hydrateLayerA({ audio_stem: "legacy-voice.wav", fps: 24, seed: 1 })
    assert.equal(stemDoc.audio_clips!.length, 1) // hydrate converted the stem
    const { result } = harness({ layerA: stemDoc })
    act(() => { result.current.deleteAudioClip(result.current.layerA.audio_clips![0]!.id) })
    // THE LAW: the clips list is empty AND the stem is ENDED in the
    // same write — the SAVED doc can never re-author the clip
    assert.deepEqual(result.current.layerA.audio_clips, [])
    assert.equal(result.current.layerA.audio_stem, undefined)
    const saved = serializeLayerA(result.current.layerA)
    expect("audio_stem" in saved).toBe(false)
    const reopened = hydrateLayerA(saved)
    assert.equal(reopened.audio_clips, undefined) // the reopen proof
    // and the non-last delete keeps the stem: a doc with authored
    // clips alongside the legacy stem keeps the lane's truth intact
    const multiDoc = { ...hydrateLayerA({ fps: 24, seed: 1 }), audio_stem: "legacy-voice.wav", audio_clips: [
      { id: "a", name: "a", src: "data:x", start_frame: 10, dur_frames: 48 },
      { id: "b", name: "b", src: "data:y", start_frame: 60, dur_frames: 48 },
    ] } as LayerA
    const { result: r2 } = harness({ layerA: multiDoc })
    act(() => { r2.current.deleteAudioClip("a") })
    assert.equal(r2.current.layerA.audio_stem, "legacy-voice.wav")
    assert.deepEqual(r2.current.layerA.audio_clips!.map((c) => c.id), ["b"])
  })
})

describe("takeAudioFile (OS file → clip)", () => {
  it("non-audio and oversize files are refused (never a silent bad write)", () => {
    const { result } = harness()
    act(() => {
      result.current.takeAudioFile(new File(["x"], "v.mp4", { type: "video/mp4" }), 0)
      result.current.takeAudioFile(new File([new ArrayBuffer(31 * 1024 * 1024)], "big.mp3", { type: "audio/mpeg" }), 0)
    })
    assert.equal(result.current.layerA.audio_clips, undefined)
  })

  it("an audio file lands as a data: clip", async () => {
    const { result } = harness()
    act(() => {
      result.current.takeAudioFile(new File(["wave-bytes"], "take.mp3", { type: "audio/mpeg" }), 24)
    })
    // the FileReader onload lands the clip on its own task — poll
    // the clips row, not a fixed 50ms inside async act.
    await waitFor(() => { expect(result.current.layerA.audio_clips).toHaveLength(1) })
    const clips = result.current.layerA.audio_clips!
    assert.equal(clips.length, 1)
    assert.equal(clips[0]!.name, "take.mp3")
    assert.ok(clips[0]!.src.startsWith("data:"))
    assert.equal(clips[0]!.start_frame, 24)
  })

  it("an unreadable file adds nothing (the catch is silent but covered)", async () => {
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      const { result } = harness()
      // the FailReader fires onerror synchronously and the catch
      // writes nothing — no flush needed, assert immediately.
      act(() => {
        result.current.takeAudioFile(new File(["x"], "bad.mp3", { type: "audio/mpeg" }), 0)
      })
      assert.equal(result.current.layerA.audio_clips, undefined)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("the mixer (the Music row, live)", () => {
  const MIX: LayerA = {
    ...hydrateLayerA(undefined),
    audio_clips: [
      { id: "in", name: "in", src: "data:audio/a", start_frame: 0, dur_frames: 96, gain: 0.5 },
      { id: "ghost", name: "ghost", src: "no-such-artifact", start_frame: 0, dur_frames: 96 },
    ],
  }

  function mixHarness(layerA: LayerA, frameIdx: number, filmPlaying: boolean, stage?: CardStage) {
    const h = renderHook(
      ({ f, playing }: { f: number; playing: boolean }) => {
        const [l, setL] = useState(layerA)
        const r = useFilmAudio({
          stage: stage ?? stageWith(undefined),
          layerA: l,
          setLayerA: setL,
          setLayerAKey: ((k: never, v: never) => { setL((p) => ({ ...p, [k]: v })) }) as never,
          fps: 24,
          frameIdx: f,
          filmPlaying: playing,
          filmFpsRef: { current: null },
        })
        return r
      },
      { initialProps: { f: frameIdx, playing: filmPlaying } },
    )
    return h
  }

  function rig(h: { result: { current: { clipElsRef: { current: Map<string, HTMLAudioElement> } } } }, log: string[], rejectPlay = false) {
    for (const [id, el] of h.result.current.clipElsRef.current) {
      el.play = (() => {
        log.push(`play:${id}`)
        return rejectPlay ? Promise.reject(new Error("blocked")) : Promise.resolve()
      }) as typeof el.play
      el.pause = (() => { log.push(`pause:${id}`) }) as typeof el.pause
      Object.defineProperty(el, "paused", { value: true, configurable: true })
      Object.defineProperty(el, "currentTime", { value: 0, writable: true, configurable: true })
    }
  }

  it("in-span + paused → seeks to the offset and plays (gain rides the element)", () => {
    const log: string[] = []
    const h = mixHarness(MIX, 24, false)
    assert.equal(h.result.current.clipElsRef.current.size, 2)
    rig(h, log)
    const el = h.result.current.clipElsRef.current.get("in")!
    act(() => { h.rerender({ f: 25, playing: true }) })
    assert.ok(log.includes("play:in"), `plays under the playhead (got ${JSON.stringify(log)})`)
    assert.equal(el.currentTime, 25 / 24)
    assert.equal(el.volume, 0.5)
    // the ghost (unresolvable src) never plays, never throws
    assert.ok(!log.some((l) => l.includes("ghost")))
    // src sticks after the first set (no redundant rewrites)
    const src = el.src
    act(() => { h.rerender({ f: 26, playing: true }) })
    assert.equal(el.src, src)
  })

  it("drift resyncs a playing element; small drift rides (no seek churn)", () => {
    const log: string[] = []
    const h = mixHarness(MIX, 24, true)
    rig(h, log)
    const el = h.result.current.clipElsRef.current.get("in")!
    // the mount tick already played on the unspied element; now it
    // "plays" far behind: the next tick resyncs (drift > 0.12s)
    Object.defineProperty(el, "paused", { value: false, configurable: true })
    Object.defineProperty(el, "currentTime", { value: 0, writable: true, configurable: true })
    const plays = log.length
    act(() => { h.rerender({ f: 48, playing: true }) })
    assert.equal(log.length, plays, "no second play call — a resync instead")
    assert.equal(el.currentTime, 2)
    // a tick 1 frame later drifts 1/24s — under the threshold, untouched
    act(() => { h.rerender({ f: 49, playing: true }) })
    assert.equal(el.currentTime, 2)
  })

  it("out-of-span and stop ticks pause a playing element; paused stays silent", () => {
    const log: string[] = []
    const h = mixHarness(MIX, 24, true)
    rig(h, log)
    const el = h.result.current.clipElsRef.current.get("in")!
    Object.defineProperty(el, "paused", { value: false, configurable: true })
    // out of span (clip ends at frame 96, media 4s): pause rides
    act(() => { h.rerender({ f: 200, playing: true }) })
    assert.ok(log.includes("pause:in"))
    // stopped with a playing element: pause rides too
    log.length = 0
    act(() => { h.rerender({ f: 25, playing: false }) })
    assert.ok(log.includes("pause:in"))
    // stopped with a paused element: silence (no pause storm)
    log.length = 0
    Object.defineProperty(el, "paused", { value: true, configurable: true })
    act(() => { h.rerender({ f: 26, playing: false }) })
    assert.deepEqual(log, [])
  })

  it("a blocked play() rejects into the catch (next tick retries)", async () => {
    const log: string[] = []
    const h = mixHarness(MIX, 24, true, stageWith({ metadata: { film: FILM } }))
    // film map present: the start maps through filmFromDoc (the map arm)
    rig(h, log, true)
    act(() => { h.rerender({ f: 25, playing: true }) })
    assert.ok(log.includes("play:in"))
    await act(async () => { await Promise.resolve() })
    expect(log.includes("play:in")).toBe(true)
  })

  it("a missing element is skipped (never a crash on a torn-down row)", () => {
    const log: string[] = []
    const h = mixHarness(MIX, 24, true)
    rig(h, log)
    act(() => { h.result.current.clipElsRef.current.delete("in") })
    act(() => { h.rerender({ f: 25, playing: true }) })
    assert.ok(!log.includes("play:in"))
  })

  it("element lifecycle: removed clips pause + drop; unmount silences all", () => {
    const log: string[] = []
    const layerA: LayerA = {
      ...hydrateLayerA(undefined),
      audio_clips: [
        { id: "a", name: "a", src: "data:x", start_frame: 0, dur_frames: 48 },
        { id: "b", name: "b", src: "data:y", start_frame: 0, dur_frames: 48 },
      ],
    }
    const h = renderHook(
      ({ la }: { la: LayerA }) => {
        const [l, setL] = useState(la)
        const r = useFilmAudio({
          stage: stageWith(undefined),
          layerA: l,
          setLayerA: setL,
          setLayerAKey: ((k: never, v: never) => { setL((p) => ({ ...p, [k]: v })) }) as never,
          fps: 24,
          frameIdx: 0,
          filmPlaying: false,
          filmFpsRef: { current: null },
        })
        return { ...r, layerA: l, drop: (id: string) => setL((p) => ({ ...p, audio_clips: (p.audio_clips ?? []).filter((c) => c.id !== id) })) }
      },
      { initialProps: { la: layerA } },
    )
    assert.equal(h.result.current.clipElsRef.current.size, 2)
    for (const [id, el] of h.result.current.clipElsRef.current) {
      el.pause = (() => { log.push(`pause:${id}`) }) as typeof el.pause
    }
    act(() => { h.result.current.drop("a") })
    assert.equal(h.result.current.clipElsRef.current.size, 1)
    assert.ok(log.includes("pause:a"))
    h.unmount()
    assert.equal(h.result.current.clipElsRef.current.size, 0)
    assert.ok(log.includes("pause:b"))
  })
})
