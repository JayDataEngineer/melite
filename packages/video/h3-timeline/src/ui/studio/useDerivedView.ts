/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useMemo, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { isImageUrl } from "./kit"
import { PROMPT_COLORS } from "@melite-plugin/timeline/ui/timeline"
import type { DocCall, DocKeyframe, LayerA } from "./docModel"
import { callsToPrompts, keyframesToLanes } from "./docCalls"
import type { LinkArtifact } from "./refUtils"
import type { TimelineSelection } from "./useViewSelection"
import type { useFilmAudio } from "./useFilmAudio"

type FilmMap = ReturnType<typeof useFilmAudio>["filmMap"]
type FilmFromDoc = ReturnType<typeof useFilmAudio>["filmFromDoc"]

/** Upstream vocabulary, filmstrip, bar-space memos (tenant §10).
 *  Verbatim lines 2474–2628. */
export function useDerivedView(args: {
  upstreams?: CardStage[]
  stage: CardStage
  calls: DocCall[]
  layerA: LayerA
  keyframes: DocKeyframe[]
  filmMap: FilmMap
  filmFromDoc: FilmFromDoc
  selected: TimelineSelection | null
  fps: number
  totalFrames: number
}) {
  const {
    upstreams, stage, calls, layerA, keyframes,
    filmMap, filmFromDoc, selected, fps, totalFrames,
  } = args
  // ── Upstream artifact vocabulary (the source picker's datalist — the
  // same ctx-key vocabulary _normalize_guides resolves: an upstream
  // artifact NAME → read + upload; anything else → an uploaded filename).
  const sourceOptions = useMemo(() => {
    const opts: { title: string; name: string }[] = []
    for (const u of upstreams ?? []) {
      const arts = u.result?.artifacts
      if (!arts) continue
      for (const name of Object.keys(arts)) opts.push({ title: u.title, name })
    }
    return opts
  }, [upstreams])

  // ── Link-to-previous-output rows (2026-08-24 parity upgrade): the
  // upstream cards' IMAGE artifacts — what the first/last-frame subcards'
  // Link2 picker offers. Picking writes the ctx-key NAME, a LIVE reference
  // _resolveSource re-resolves at render time. Image-filtered by the SHARED
  // isImageUrl rule — these slots condition frames; a video/audio artifact
  // is not their language.
  const linkGroups = useMemo<LinkArtifact[]>(() => {
    const out: LinkArtifact[] = []
    for (const u of upstreams ?? []) {
      const arts = u.result?.artifacts
      if (!arts) continue
      for (const [name, url] of Object.entries(arts)) {
        if (typeof url === "string" && url && isImageUrl(url)) {
          out.push({ name, url, title: u.title })
        }
      }
    }
    return out
  }, [upstreams])

  // ── Filmstrip: the last run's windows, by artifact name (data already
  // in props — no fetch, no plan-parse; the plan manifest's reused/rendered
  // detail stays backend-side).
  const filmstrip = useMemo(() => {
    const res = stage.result
    const arts = res?.artifacts ?? {}
    const urls = Array.isArray(res?.assetUrls) ? res.assetUrls : []
    const windows = Object.keys(arts)
      .filter((n) => /^video_w\d+_/.test(n) && !n.endsWith("_last_frame") && !n.includes("_seam") && !n.includes("_prev"))
      // no-fake-data guard (2026-08-31): a placeholder artifact with an
      // EMPTY url must never become a tile — an empty src renders a
      // broken video player. Absence of a url = absence of a window.
      .filter((n) => typeof arts[n] === "string" && arts[n] !== "")
      .sort((a, b) => {
        const ai = Number(/_w(\d+)_/.exec(a)?.[1] ?? 0)
        const bi = Number(/_w(\d+)_/.exec(b)?.[1] ?? 0)
        return ai - bi
      })
      .map((name) => ({ name, url: arts[name]! }))
    // FLAT-LIST FALLBACK (2026-08-30 "only shows the first clip"): the
    // windows were built ONLY from the named artifact map — a snapshot
    // whose artifacts were stripped (older bundle eras, degraded stores)
    // rendered ONE final-cut tile and the windows vanished even though
    // assetUrls (the ray-parity FLAT list, stitch first) carried every
    // clip. Union: every flat-list entry beyond [0] that the artifact
    // map didn't already provide joins as a window tile. Clip loss can
    // no longer hide behind a missing artifact name.
    if (urls.length > 1) {
      const have = new Set(windows.map((w) => w.url))
      for (let i = 1; i < urls.length; i++) {
        const u = urls[i]!
        if (!u || have.has(u)) continue
        have.add(u)
        const m = /window(\d+)_video/.exec(u)
        windows.push({ name: m ? `video_w${m[1]}_main` : (u.split("/").pop() ?? `clip-${i}`), url: u })
      }
    }
    return { windows, final: arts.video ?? urls[0] ?? null }
  }, [stage.result])

  const prompts = useMemo(() => callsToPrompts(calls, layerA.fps || 24), [calls, layerA.fps])
  const lanes = useMemo(() => keyframesToLanes(keyframes), [keyframes])

  /** The film's OWN duration off the player (master-axis fallback): a
   *  run whose metadata carries no probed map still sizes the bar from
   *  the rendered film, never from the plan frames. */
  const [filmDurSec, setFilmDurSec] = useState(0)
  // (audit F2) the no-map fallback sizes the axis from the FILM's own
  // probed duration — multiply by the film's fps, not the doc rail's
  // (they diverge the moment fps is edited after a run).
  const barTotal = filmMap?.totalFrames
    ?? (filmDurSec > 0 ? Math.round(filmDurSec * (filmMap?.fps ?? fps ?? 24)) : totalFrames)
  const barPrompts = useMemo(() => filmMap
    ? prompts.map((p) => ({ ...p, start_frame: filmFromDoc(p.start_frame), end_frame: filmFromDoc(p.end_frame) }))
    : prompts, [prompts, filmMap, filmFromDoc])
  // FLAT diamonds (the bar's keyframes prop is TimelineKeyframe[] —
  // keyframesToLanes returns the FLAT list despite its name; the old
  // nested `l.keyframes.map` was a type lie that crashed at runtime
  // whenever a film map existed).
  const barLanes = useMemo(() => filmMap
    ? lanes.map((k) => ({ ...k, frame: filmFromDoc(k.frame) }))
    : lanes, [lanes, filmMap, filmFromDoc])

  // ── Bar-side Layer C + previews + selection (2026-08-16) ───────────────

  /** Every prompt segment flattened into the bar's BEATS row (under the
   * calls): id `beat-i-j`, end_frame translated to the bar's INCLUSIVE
   * vocabulary (the doc's end is exclusive), color = the call's prompt
   * color so a segment reads as belonging to its call. */
  // (2026-09-15) barBeats removed - no prompt beats row on the strip.


  /** (Layer A NLE) the Music row's clips in BAR space: both endpoints
   * through filmFromDoc (identity with no film map), width = the mapped
   * span — a clip crossing a trim boundary narrows like the calls do. */
  const barAudioClips = useMemo(
    () => (layerA.audio_clips ?? []).map((c) => {
      const g0 = filmFromDoc(c.start_frame)
      const g1 = filmFromDoc(c.start_frame + c.dur_frames)
      return {
        id: c.id,
        name: c.name,
        start_frame: g0,
        dur_frames: Math.max(1, g1 - g0),
        gain: c.gain,
      }
    }),
    [layerA.audio_clips, filmFromDoc],
  )

  /** Window render → call clip (previews INSIDE the bar clips): window
   * index ↔ call index 1:1 (best effort — a forced mid-call split
   * shifts later windows; index-based like the artifact naming). */
  const callPreviews = useMemo(
    () => Object.fromEntries(
      filmstrip.windows.slice(0, calls.length).map((w, i) => [`call-${i}`, w.url]),
    ),
    [filmstrip.windows, calls.length],
  )

  /** The bar's selected clip id (call or beat) — the ring the bar draws. */
  const selectedBarId = selected
    ? selected.beatIdx != null
      ? `beat-${selected.callIdx}-${selected.beatIdx}`
      : `call-${selected.callIdx}`
    : null
  return {
    sourceOptions, linkGroups, filmstrip, prompts, lanes,
    filmDurSec, setFilmDurSec, barTotal,
    barPrompts, barLanes, barAudioClips, callPreviews, selectedBarId,
  }
}
