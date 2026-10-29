/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useMemo, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { isImageUrl } from "@melite/card-base/client"
import { PROMPT_COLORS } from "@melite-plugin/timeline/ui/timeline"
import type { DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { callsToPrompts, keyframesToLanes } from "./docCalls.ts"
import { refGenreOf } from '@melite/models-h3/timelineContract'
import type { LinkArtifact } from "./refUtils.ts"
import type { TimelineSelection } from "./useViewSelection.ts"
import type { useFilmAudio } from "./useFilmAudio.ts"
import { deriveCommissions, type DocCommission } from "./commissions.ts"

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
  /** The artifact NAME→URL index (useFilmAudio's — threaded from the
   *  tenant, 2026-11-05): resolves a keyframe pin's bare artifact name
   *  to a displayable thumb URL. Absent (tests, motion) = names never
   *  thumb — the diamond-only chip. */
  artifactIndex?: { byName: ReadonlyMap<string, string> }
  /** THE DURABLE BENCH ROW (§9's mod projection): the doc's own params,
   *  where the four mod bags live — outside Layer A and outside the
   *  studio's three write channels. The commission rail projects them
   *  read-only; absent (tests, motion) = no commissions. */
  docParams?: Record<string, unknown>
}) {
  const {
    upstreams, stage, calls, layerA, keyframes,
    filmMap, filmFromDoc, selected, fps, totalFrames, artifactIndex, docParams,
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

  // ── NON-IMAGE GUIDE LINKS (the rail-law audit's square gap b,
  // 2026-10-31): the clip/audio guides ride SourceRow squares — their
  // From-flow rows are THIS genre's upstream artifacts (the image-only
  // linkGroups is the anchor's law, not theirs; a video/audio artifact
  // is exactly the clip/audio guide's language).
  const guideLinks = useMemo<{ clip: LinkArtifact[]; audio: LinkArtifact[] }>(() => {
    const out = { clip: [] as LinkArtifact[], audio: [] as LinkArtifact[] }
    for (const u of upstreams ?? []) {
      const arts = u.result?.artifacts
      if (!arts) continue
      for (const [name, url] of Object.entries(arts)) {
        if (typeof url !== "string" || url === "") continue
        const genre = refGenreOf(name, url)
        if (genre === "video") out.clip.push({ name, url, title: u.title })
        else if (genre === "audio") out.audio.push({ name, url, title: u.title })
      }
    }
    return out
  }, [upstreams])

  // ── Filmstrip: the last run's windows, by artifact name (data already
  // in props — no fetch, no plan-parse; the plan manifest's reused/rendered
  // detail stays backend-side).
  // ARTIFACT-NAME CONTRACT (2026-09-23, the first-clip preview defect):
  // the queue publishes the card's REAL save names — h3_t4_film_<n>_.mp4
  // (the hero, filmLead.ts's lead law) and h3_t4_w<k>_<n>_.mp4 (windows).
  // The legacy video / video_w<k>_main names belong to an older engine
  // era and stay as a second spelling — but the REAL names are the
  // contract this face is tested against (fixture from run-b664de5e4155).
  const filmstrip = useMemo(() => {
    const res = stage.result
    const arts = res?.artifacts ?? {}
    const urls = Array.isArray(res?.assetUrls) ? res.assetUrls : []
    // both eras, one matcher: video_w<k>_… (legacy) | h3_t4_w<k>_<n>_.mp4 (real)
    const windowIndexOf = (n: string): number | null => {
      const legacy = /^video_w(\d+)_/.exec(n)
      if (legacy !== null) return Number(legacy[1])
      const real = /^h3_t4_w(\d+)_\d+_\.mp4$/.exec(n)
      if (real !== null) return Number(real[1])
      return null
    }
    const windows = Object.keys(arts)
      .filter((n) => windowIndexOf(n) !== null && !n.endsWith("_last_frame") && !n.includes("_seam") && !n.includes("_prev"))
      // no-fake-data guard (2026-08-31): a placeholder artifact with an
      // EMPTY url must never become a tile — an empty src renders a
      // broken video player. Absence of a url = absence of a window.
      .filter((n) => typeof arts[n] === "string" && arts[n] !== "")
      .sort((a, b) => {
        // (both indexes parsed non-null in the filter above — no
        // fallback arms.)
        return windowIndexOf(a)! - windowIndexOf(b)!
      })
      .map((name) => ({ name, url: arts[name]! }))
    // FLAT-LIST FALLBACK (2026-08-30 "only shows the first clip"): the
    // windows were built ONLY from the named artifact map — a snapshot
    // whose artifacts were stripped (older bundle eras, degraded stores)
    // rendered ONE final-cut tile and the windows vanished even though
    // assetUrls (the FLAT list, stitch first) carried every
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
        // (u is truthy here, so split("/") is non-empty and pop() is
        // defined — no `??` fallback arm.)
        windows.push({ name: m ? `video_w${m[1]}_main` : u.split("/").pop()!, url: u })
      }
    }
    // THE HERO (same defect, the hero arm): the engine film leads by
    // NAME (filmLead.ts's regex, mirrored here for the browser bundle)
    // — the legacy 'video' key and the flat list trail it. A run whose
    // gallery carries the film can never preview a window as the cut.
    const filmName = Object.keys(arts).find((n): boolean => /^h3_t4_film_\d+_\.mp4$/.test(n))
    const filmUrl = filmName !== undefined && typeof arts[filmName] === "string" && arts[filmName] !== ""
      ? arts[filmName] as string : ""
    const namedVideo = Object.entries(arts).find(([name, url]) =>
      typeof url === "string" && url !== "" && refGenreOf(name, url) === "video"
      && !/^h3_t4_w\d+_\d+_\.mp4$/i.test(name) && !/^video_w\d+_/.test(name),
    )?.[1]
    const flatVideo = urls.find((url) =>
      refGenreOf("", url) === "video"
      && !/(?:^|\/)h3_t4_w\d+_\d+_\.mp4$/i.test(url)
      && !/(?:^|\/)video_w\d+_/.test(url),
    )
    return {
      windows,
      final: filmUrl !== "" ? filmUrl : typeof namedVideo === "string" ? namedVideo : flatVideo ?? null,
    }
  }, [stage.result])

  // (fps is optional on Layer A since the pin law (R2) — the clock
  // fallback owns itself inside callsToPrompts; the derived `fps`
  // arg below is useViewSelection's defaulted value.)
  const prompts = useMemo(() => callsToPrompts(calls, layerA.fps), [calls, layerA.fps])
  // (slice 3) the thumb pass: keyframesToLanes maps displayable URLs
  // (data:/http) itself; a bare artifact NAME resolves HERE through the
  // index (lanes[i] ↔ keyframes[i] — the mapper is 1:1 in order). An
  // unresolvable name stays absent — the diamond-only chip, never a
  // broken <img>.
  const lanes = useMemo(() => {
    const ls = keyframesToLanes(keyframes)
    const byName = artifactIndex?.byName
    if (byName === undefined) return ls
    return ls.map((l, i) => {
      if (l.thumbUrl !== undefined || keyframes[i] === undefined) return l
      const resolved = byName.get(keyframes[i]!.image)
      return resolved === undefined ? l : { ...l, thumbUrl: resolved }
    })
  }, [keyframes, artifactIndex])

  /** The film's OWN duration off the player (master-axis fallback): a
   *  run whose metadata carries no probed map still sizes the bar from
   *  the rendered film, never from the plan frames. */
  const [filmDurSec, setFilmDurSec] = useState(0)
  // (audit F2) the no-map fallback sizes the axis from the FILM's own
  // probed duration — multiply by the film's fps, not the doc rail's
  // (they diverge the moment fps is edited after a run).
  // (fps is always a number — the doc rail's Layer A fps — no `?? 24`.)
  const barTotal = filmMap?.totalFrames
    ?? (filmDurSec > 0 ? Math.round(filmDurSec * (filmMap?.fps ?? fps)) : totalFrames)
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
        class: c.class,
        text: c.text,
      }
    }),
    [layerA.audio_clips, filmFromDoc],
  )

  /** THE PIN MAP (2026-09-22, the door-guard UX arm): which calls'
   * spans carry a dialogue/sfx clip — those windows PIN, and the
   * pinned window's normal audio doors stand down (the CallCard
   * grays the Ref audios bucket; the compose owns the real wall —
   * this is the BEFORE-the-Run hint, doc-space overlap mirroring
   * the stamp law's doc-span arm). */
  const voicePinnedCalls = useMemo(() => {
    const set = new Set<number>()
    calls.forEach((call, i) => {
      const sf = call.start_frame, ef = call.end_frame
      for (const c of layerA.audio_clips ?? []) {
        const cls = c.class ?? (c.text ? "dialogue" : "music")
        if (cls !== "dialogue" && cls !== "sfx") continue
        if ((c.dur_frames ?? 0) <= 0) continue
        if (c.start_frame < ef && c.start_frame + c.dur_frames > sf) { set.add(i); break }
      }
    })
    return set
  }, [calls, layerA.audio_clips])

  /** THE BLOCKER (2026-09-22, the operator's lane-collision law):
   * the D-M-E clips and the normal audio inputs are MUTUALLY EXCLUSIVE
   * at authoring time — reference audio wired on ANY call locks the
   * lanes (no adds on ANY lane); ANY clip present locks the Ref audios
   * buckets on EVERY call. Doc-level, both directions, blunt on
   * purpose: the compose door guard stays only as the silent backstop
   * for docs that already carry both (it strips, never crashes). */
  const refAudiosPresent = useMemo(
    () => calls.some((c) => !!(c.refs?.audios ?? "").trim()),
    [calls],
  )
  const audioClipsPresent = (layerA.audio_clips?.length ?? 0) > 0

  /** Window render → call clip (previews INSIDE the bar clips): window
   * index ↔ call index 1:1 (best effort — a forced mid-call split
   * shifts later windows; index-based like the artifact naming). */
  const callPreviews = useMemo(
    () => Object.fromEntries(
      filmstrip.windows.slice(0, calls.length).map((w, i) => [`call-${i}`, w.url]),
    ),
    [filmstrip.windows, calls.length],
  )

  /** THE COMMISSIONS (§9 of the multiwindow unification audit): one row
   *  per ARMED mod bag — the bag's entry seats, and (extend) the window
   *  composition the compose door will build. Read-only: the studio
   *  authors no bag, so there is no op overlay to fold in — the durable
   *  row IS the truth. */
  const commissions: DocCommission[] = useMemo(
    () => deriveCommissions(docParams),
    [docParams],
  )

  /** The bar's selected clip id (a call — the only selectable clip
   *  since Layer C left the bar, 2026-09-15) — the ring the bar
   *  draws. */
  const selectedBarId = selected ? `call-${selected.callIdx}` : null
  return {
    sourceOptions, linkGroups, guideLinks, filmstrip, prompts, lanes,
    filmDurSec, setFilmDurSec, barTotal,
    barPrompts, barLanes, barAudioClips, callPreviews, selectedBarId,
    voicePinnedCalls, refAudiosPresent, audioClipsPresent, commissions,
  }
}
