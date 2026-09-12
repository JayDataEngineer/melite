/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CardStage } from "@melite/contracts"
import { readAsDataURL } from "./kit"
import type { LayerA, SetLayerAKey } from "./docModel"

/** Davinci map, artifact index, positioned audio clips + the mixer
 *  (tenant §5). Verbatim lines 1731–1946. */
export function useFilmAudio(args: {
  stage: CardStage
  upstreams?: CardStage[]
  layerA: LayerA
  setLayerA: Dispatch<SetStateAction<LayerA>>
  setLayerAKey: SetLayerAKey
  fps: number
  frameIdx: number
  filmPlaying: boolean
  filmFpsRef: { current: number | null }
}) {
  const {
    stage, upstreams, layerA, setLayerA, setLayerAKey,
    fps, frameIdx, filmPlaying, filmFpsRef,
  } = args
  // ── LAYER A AUDIO CLIPS — the Music row as an NLE track (2026-08-31,
  // operator: "upload these audio in Layer A … davinci resolve type of
  // moving audio around … when I hit play, it will all be done nice").
  // The row already lives in the bar; these give it positioned, movable,
  // uploadable clips + a playback mixer synced to the film player. ──────

  // ── DAVINCI MAP (2026-09-01): 1:1 player ↔ scrubber. After a run the
  // film's REAL grid ≠ the plan (engine grid snapping: 345 plan frames
  // → 390 film frames on the first PlagueKind film). The gateway probes
  // the rendered files and serves the truth as result.metadata.film:
  // per window {start (film space, new-content start), len, trim
  // (carried head = the seam overlap), docStart, docSpan (plan frames)}.
  // With the map: the bar's axis IS film space — the playhead is 1:1
  // with the player by construction, call clips sit at their true film
  // positions, and authoring gestures translate back to doc frames at
  // the boundary (cut math is EXACT there: the scale telescopes, docEnd_k
  // ↦ start_k+len_k = start_{k+1}+trim_{k+1}). Without it (pre-map runs,
  // fresh unrendered cards): identity — plan space, the old behavior.
  // (2026-09-02 hoist) originally declared ~640 lines below the audio
  // mixer effect that consumes it — another temporal-dead-zone crash on
  // the real-draft mount path. Depends only on the stage prop.
  const filmMap = useMemo(() => {
    const m = (stage.result?.metadata as { film?: {
      fps?: number; totalFrames?: number
      windows?: Array<{ start: number; len: number; trim: number; docStart: number; docSpan: number }>
    } } | undefined)?.film
    return m && Array.isArray(m.windows) && m.windows.length > 0 && m.totalFrames ? m : null
  }, [stage.result])
  // (audit F2) mirror the film's fps up to the playhead converters.
  filmFpsRef.current = filmMap?.fps ?? null
  const filmFromDoc = useCallback((f: number): number => {
    const ws = filmMap?.windows
    if (!ws) return f
    let w = ws[0]!
    for (const c of ws) { if (f >= c.docStart) w = c; else break }
    const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1
    if (f <= w.docStart + w.docSpan)
      return Math.round(w.start + w.trim + (f - w.docStart) * scale)
    return w.start + w.len /* plan overshoot clamps to the film tail */
  }, [filmMap])
  const docFromFilm = useCallback((g: number): number => {
    const ws = filmMap?.windows
    if (!ws) return g
    let w = ws[ws.length - 1]!
    for (const c of ws) { if (g < c.start + c.len) { w = c; break } }
    const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1
    /* the carried head (the seam overlap) clamps to the call's start */
    const t = Math.max(0, g - w.start - w.trim)
    return Math.round(w.docStart + Math.min(t / scale, w.docSpan))
  }, [filmMap])

  // ── Artifact NAME ⇄ URL index (the subcards' drop honesty): a tray
  // drop arrives as a URL, but the guide vocabulary is a NAME (ctx key)
  // or an uploaded filename — a raw URL would pass through unresolved
  // at render time. So a drop wires ONLY when the URL is a known
  // upstream artifact (mapped to its name); anything else writes
  // NOTHING. name→url drives the square's thumbnail.
  // (2026-09-02 hoist) this block lived ~660 lines below its first
  // consumers (audioSrcUrl/addAudioClip) — a temporal-dead-zone crash
  // ("Cannot access 'artifactIndex' before initialization") killed the
  // real-draft smoke test at mount. upstreams is a prop: the index is
  // declarable before every consumer.
  const artifactIndex = useMemo(() => {
    const byName = new Map<string, string>()
    const byUrl = new Map<string, string>()
    // (2026-09-02 refs audit) TWO source families feed the pickers:
    // the run's OWN artifacts first (window films, seams, last-frame
    // stills, the final cut — in a standalone timeline card these are
    // the ONLY sources, and "no artifacts upstream" with a filmstrip
    // full of clips on screen was the lazy-audit bug), then upstream
    // cards — which WIN on a name collision (a live ctx reference
    // beats a same-named own artifact: retakes flow through).
    const ownArts = stage.result?.artifacts
    if (ownArts) {
      for (const [name, url] of Object.entries(ownArts)) {
        if (typeof url === "string" && url) {
          byName.set(name, url)
          byUrl.set(url, name)
        }
      }
    }
    for (const u of upstreams ?? []) {
      const arts = u.result?.artifacts
      if (!arts) continue
      for (const [name, url] of Object.entries(arts)) {
        if (typeof url === "string" && url) {
          byName.set(name, url)
          byUrl.set(url, name)
        }
      }
    }
    return { byName, byUrl }
  }, [upstreams, stage.result])

  /** The refs pickers' candidates: the full artifact index (own run
   * ∪ upstreams — see artifactIndex), genre-filtered per bucket inside
   * RefPickerRow (2026-09-02: own outputs included, not just upstream). */
  const refArtifacts = useMemo(
    () => [...artifactIndex.byName.entries()].map(([name, url]) => ({ name, url })),
    [artifactIndex],
  )

  /** Resolve a clip's src to a PLAYABLE url: a data: URL is itself; an
   * artifact name maps through the index. Unresolvable → null (the
   * mixer skips it — never a bad fetch). */
  const audioSrcUrl = useCallback((src: string): string | null => {
    if (src.startsWith("data:")) return src
    return artifactIndex.byName.get(src) ?? null
  }, [artifactIndex.byName])

  /** Add a clip: probe its duration (Audio metadata), land it at the
   * frame. dur fallback 4s worth of frames — VISIBLE, then correctable
   * by the probe's completion. */
  const addAudioClip = useCallback((name: string, src: string, startFrame: number) => {
    const id = `aclip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const f = layerA.fps || 24
    setLayerAKey("audio_clips", [
      ...(layerA.audio_clips ?? []),
      { id, name, src, start_frame: Math.max(0, Math.round(startFrame)), dur_frames: Math.round(4 * f) },
    ])
    const url = src.startsWith("data:") ? src : null
    const probe = new Audio()
    probe.preload = "metadata"
    const done = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        const durF = Math.max(1, Math.round(probe.duration * f))
        setLayerA((prev) => ({
          ...prev,
          audio_clips: (prev.audio_clips ?? []).map((c) =>
            c.id === id ? { ...c, dur_frames: durF } : c),
        }))
      }
    }
    probe.addEventListener("loadedmetadata", done, { once: true })
    probe.src = url ?? (artifactIndex.byName.get(src) ?? "")
    if (!probe.src) probe.removeEventListener("loadedmetadata", done)
    return id
  }, [layerA.audio_clips, layerA.fps, artifactIndex.byName, setLayerAKey])

  const moveAudioClip = useCallback((clipId: string, docFrame: number) => {
    setLayerA((prev) => (prev.audio_clips?.some((c) => c.id === clipId)) ? {
      ...prev,
      audio_clips: prev.audio_clips!.map((c) =>
        c.id === clipId ? { ...c, start_frame: Math.max(0, Math.round(docFrame)) } : c),
    } : prev)
  }, [])

  const deleteAudioClip = useCallback((clipId: string) => {
    setLayerA((prev) => ({
      ...prev,
      audio_clips: (prev.audio_clips ?? []).filter((c) => c.id !== clipId),
    }))
  }, [])

  /** OS file → clip: audio only, 30 MB cap — a rejection is the file
   * input's accept + this guard (never a silent bad write). */
  const takeAudioFile = useCallback((file: File, startFrame: number) => {
    if (!file.type.startsWith("audio/")) return
    if (file.size > 30 * 1024 * 1024) return
    readAsDataURL(file).then((dataUrl) => {
      addAudioClip(file.name, dataUrl, startFrame)
    }).catch(() => { /* unreadable — no clip */ })
  }, [addAudioClip])

  // ── THE MIXER (2026-08-31): "when I hit play, it will all be done
  // nice for me". One HTMLAudioElement per clip; on every film time
  // tick, each clip inside the playhead's span plays at its local
  // offset (resync on >0.12s drift), everything else pauses. The
  // film's OWN audio (window dialogue / Layer B reference audio that
  // rode the render) plays from the FilmPlayer element itself — the
  // mixer only layers the Music row OVER it. ─────────────────────────
  const clipElsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const audioUploadRef = useRef<HTMLInputElement | null>(null)
  // element lifecycle: create per clip, drop the removed
  useEffect(() => {
    const live = clipElsRef.current
    const ids = new Set((layerA.audio_clips ?? []).map((c) => c.id))
    for (const [id, el] of live) {
      if (!ids.has(id)) { el.pause(); live.delete(id) }
    }
    for (const c of layerA.audio_clips ?? []) {
      if (!live.has(c.id)) live.set(c.id, new Audio())
    }
  }, [layerA.audio_clips])
  // the sync itself — runs on every playhead tick while playing
  useEffect(() => {
    if (!layerA.audio_clips?.length) return
    const fpsEff = filmMap?.fps ?? fps ?? 24
    const t = frameIdx / fpsEff   // film seconds at the playhead
    for (const c of layerA.audio_clips) {
      const el = clipElsRef.current.get(c.id)
      const url = audioSrcUrl(c.src)
      if (!el || !url) continue
      if (el.src !== url) el.src = url
      el.volume = c.gain != null ? Math.max(0, Math.min(1, c.gain)) : 1
      // doc start → film seconds (identity when no film map)
      const startSec = (filmMap ? filmFromDoc(c.start_frame) : c.start_frame) / fpsEff
      const mediaSec = c.dur_frames / (fps || 24)   // wall-clock media length
      const local = t - startSec
      if (filmPlaying && local >= 0 && local < mediaSec) {
        if (el.paused) {
          el.currentTime = local
          void el.play().catch(() => { /* blocked — next tick retries */ })
        } else if (Math.abs(el.currentTime - local) > 0.12) {
          el.currentTime = local
        }
      } else if (!el.paused) {
        el.pause()
      }
    }
  }, [frameIdx, filmPlaying, layerA.audio_clips, audioSrcUrl, filmMap, filmFromDoc, fps])
  // pause everything when the card unmounts
  useEffect(() => () => {
    for (const [, el] of clipElsRef.current) el.pause()
    clipElsRef.current.clear()
  }, [])
  return {
    filmMap, filmFromDoc, docFromFilm,
    artifactIndex, refArtifacts, audioSrcUrl,
    addAudioClip, moveAudioClip, deleteAudioClip, takeAudioFile,
    clipElsRef, audioUploadRef,
  }
}
