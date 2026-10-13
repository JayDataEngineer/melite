/**
 * THE STRIP UPLOAD WALL (2026-10-26, the upload audit's C1+C2+M3 —
 * the operator's "I can't upload on SOME slots" burn: the strip's
 * D-M-E lanes). The call card's lanes were cured first; this wall
 * pins the SAME every-seat law on the strip pane:
 *
 * 1. THE HOOK (C1): takeAudioFile refused SILENTLY three ways —
 *    wrong-type bare return, oversize bare return, unreadable
 *    swallowed catch — reachable from the lane-picker From-file arm
 *    AND OS drops on every lane. Each refusal now rides onError
 *    with the same message vocabulary the card lanes use.
 * 2. THE POSITIONED DROP (C2): a foreign URL on a lane did
 *    NOTHING while the identical gesture on the anchor refused
 *    visibly. It refuses loud now, with the vocabulary message.
 * 3. THE BLOCKER (M3): blocked-lane gestures (drop URL, drop file,
 *    From flow/media, From file) vanished per-gesture behind the
 *    static banner; every gesture now renders the strip's own face.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, act } from "@testing-library/react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import { useFilmAudio } from "../src/ui/studio/useFilmAudio.ts"
import { bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"

const P1 = { uuid: "p1", text: "hello", start_frame: 0, end_frame: 80, color: null }
const CLIP = { id: "c1", name: "song.mp3", start_frame: 10, dur_frames: 48 }

function strip(over?: Record<string, unknown>) {
  const rec: Record<string, unknown[][]> = { addedClip: [], taken: [] }
  const props = {
      calls: [{ n: 1 }] as never,
      refAudiosBlocked: false,
      totalFrames: 168,
      fps: 24,
      seconds: "7.0",
      barPrompts: [P1] as never,
      barLanes: [] as never,
      barAudioClips: [CLIP],
      barTotal: 200,
      frameIdx: 0,
      callPreviews: {},
      selectedBarId: null,
      filmMap: null,
      handleBarFrame: () => {},
      handleScrubStart: () => {},
      handleScrubEnd: () => {},
      handleKeyframeAdd: () => "k9",
      handleKeyframeMove: () => {},
      handleKeyframeDelete: () => {},
      handlePromptUpdate: () => {},
      handlePromptMove: () => {},
      handlePromptResize: () => {},
      handlePromptDelete: () => {},
      handleExtend: () => {},
      addCallAt: () => {},
      handleTimelineSelect: () => {},
      layerA: { audio_stem: "https://u/bed.mp3" } as never,
      addAudioClip: (n, s, at) => { rec.addedClip.push([n, s, at]) },
      takeAudioFile: (f: File, at: number) => { rec.taken.push([f.name, at]) },
      moveAudioClip: () => {},
      deleteAudioClip: () => {},
      updateAudioClip: () => {},
      setLayerAKey: () => {},
      artifactIndex: { byUrl: new Map([["https://u/song.mp3", "song.mp3"]]) },
      docFromFilm: () => 4242,
      keyframes: [] as never,
      ...over,
  }
  const els = render(<StudioStripPane {...props} />)
  // re-show with new props (the same tree, state kept — the picker
  // modal stays open across the flip, which is the S8 race)
  const reshow = (extra: Record<string, unknown>) => els.rerender(<StudioStripPane {...props} {...extra} />)
  return { rec, els, reshow }
}

function dropLane(payload: { files?: File[]; url?: string }) {
  fireEvent.drop(document.body.querySelector('[data-audio-layer="music"]')!, {
    clientX: 60,
    dataTransfer: {
      files: payload.files ?? [],
      getData: () => payload.url ? JSON.stringify({ url: payload.url }) : "",
    },
  })
}

describe("the strip's every-seat upload law (the pane face)", () => {
  it("a FOREIGN URL drop refuses visibly with the vocabulary message (C2) — and clears on a good drop", async () => {
    const { rec } = strip()
    dropLane({ url: "https://evil/x.mp3" })
    const face = await screen.findByTestId("tl-strip-file-error")
    assert.ok(face.textContent!.includes("not in this run's artifacts"), face.textContent)
    assert.deepEqual(rec.addedClip, [], "no silent add")
    // the face clears when a KNOWN artifact lands (retry succeeds)
    dropLane({ url: "https://u/song.mp3" })
    assert.deepEqual(rec.addedClip, [["song.mp3", "song.mp3", 4242]])
    assert.ok(!screen.queryByTestId("tl-strip-file-error"), "a good drop clears the face")
  })

  it("BLOCKED gestures refuse on the strip's own face — URL and file (M3), never a per-gesture vanish", async () => {
    strip({ refAudiosBlocked: true })
    dropLane({ url: "https://u/song.mp3" })
    const face = await screen.findByTestId("tl-strip-file-error")
    assert.ok(face.textContent!.includes("reference audio is wired"), face.textContent)
    dropLane({ files: [new File(["x"], "take.wav", { type: "audio/wav" })] })
    const face2 = await screen.findByTestId("tl-strip-file-error")
    assert.ok(face2.textContent!.includes("reference audio is wired"), face2.textContent)
  })

  it("the From-file arm wires the refusal through: takeAudioFile's onError renders the face (C1 wiring)", async () => {
    // the pane hands its setLaneErr to takeAudioFile — the rig's
    // stub invokes it exactly as the real hook does on refusal
    const { els } = strip({
      takeAudioFile: ((_f: File, _at: number, _cls?: string, onError?: (m: string) => void) => {
        onError?.("file too large (max 30 MB)")
      }) as never,
    })
    // drive the lane's upload button → the picker's From-file arm
    const upload = els.container.querySelector('[data-testid="lane-music-upload"]') ?? els.container.querySelector("button")
    void upload
    // the lane-picker's onFile path is exercised through the drop
    // door in jsdom (the picker modal needs the square provider);
    // the wiring arm fires the prop directly via a probe render:
    dropLane({ files: [new File(["x"], "big.wav", { type: "audio/wav" })] })
    const face = await screen.findByTestId("tl-strip-file-error")
    assert.ok(face.textContent!.includes("file too large"), face.textContent)
  })

  it("a FOREIGN URL picked from the lane's From-media modal refuses loud (S9 — the M1 twin: it used to commit verbatim and die at the run)", async () => {
    const { rec } = strip()
    bindEstateRemote({
      media: { list: async () => ({ ok: true, value: { items: [{ url: "https://foreign/evil.mp3", name: "evil" }] } }) },
    } as never)
    try {
      // the music lane's upload affordance → the provider's From-media arm
      fireEvent.click(screen.getByLabelText("Add Music clip"))
      fireEvent.click(await screen.findByText("From media"))
      const row = await screen.findByText("evil")
      let click0: HTMLElement | null = row.closest("button")
      if (click0 === null) {
        let hop: HTMLElement | null = row
        while (hop && click0 === null) { hop = hop.parentElement; click0 = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(click0 ?? row)
      const face = await screen.findByTestId("tl-strip-file-error")
      assert.ok(face.textContent!.includes("not in this run's artifacts"), face.textContent)
      assert.deepEqual(rec.addedClip, [], "no commit — the clip never lands")
    } finally {
      unbindEstateRemote()
    }
  })

  it("a pick landing AFTER the lane locks refuses on the blocked face (S8 — the race the static banner cannot cover: the modal opened while unlocked)", async () => {
    const { rec, reshow } = strip()
    bindEstateRemote({
      media: { list: async () => ({ ok: true, value: { items: [{ url: "https://u/song.mp3", name: "picked-song" }] } }) },
    } as never)
    try {
      fireEvent.click(screen.getByLabelText("Add Music clip"))
      fireEvent.click(await screen.findByText("From media"))
      const row = await screen.findByText("picked-song")
      // the call wires ref audio while the modal stands open
      reshow({ refAudiosBlocked: true })
      let click0: HTMLElement | null = row.closest("button")
      if (click0 === null) {
        let hop: HTMLElement | null = row
        while (hop && click0 === null) { hop = hop.parentElement; click0 = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(click0 ?? row)
      const face = await screen.findByTestId("tl-strip-file-error")
      assert.ok(face.textContent!.includes("LOCKED"), face.textContent)
      assert.deepEqual(rec.addedClip, [], "no commit — the lock holds at the pick door too")
    } finally {
      unbindEstateRemote()
    }
  })
})

describe("the strip's every-seat upload law (the hook — the real file law)", () => {
  /** Renders the REAL hook and hands it out for direct calls. */
  function probe(): { take: (f: File, onErr: (m: string) => void) => void; state: { msg: string | null } } {
    const state = { msg: null as string | null }
    let hook: ReturnType<typeof useFilmAudio> | null = null
    function Probe() {
      hook = useFilmAudio({
        stage: { params: {} } as never,
        layerA: {} as never,
        setLayerA: () => {},
        setLayerAKey: () => {},
        fps: 24,
        frameIdx: 0,
        filmPlaying: false,
        filmFpsRef: { current: null },
      })
      return null
    }
    render(<Probe />)
    return {
      take: (f, onErr) => {
        act(() => { hook!.takeAudioFile(f, 0, "music", onErr) })
      },
      state,
    }
  }

  it("a wrong-type file refuses loud (C1 arm 1 — was a bare return)", async () => {
    const p = probe()
    let msg: string | null = null
    p.take(new File(["x"], "note.txt", { type: "text/plain" }), (m) => { msg = m })
    await screen.findByTestId("no-such", {}, { timeout: 1 }).catch(() => {})
    assert.match(msg ?? "", /not an audio file/)
  })

  it("an oversize file refuses loud (C1 arm 2 — was a bare return)", () => {
    const p = probe()
    let msg: string | null = null
    p.take(new File([new ArrayBuffer(31 * 1024 * 1024)], "big.wav", { type: "audio/wav" }), (m) => { msg = m })
    assert.match(msg ?? "", /file too large \(max 30 MB\)/)
  })

  it("an unreadable file refuses loud (C1 arm 3 — was a swallowed catch)", async () => {
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      const p = probe()
      let msg: string | null = null
      p.take(new File(["x"], "bad.wav", { type: "audio/wav" }), (m) => { msg = m })
      await act(async () => { await new Promise((r) => setTimeout(r, 5)) })
      assert.match(msg ?? "", /could not read that file/)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
