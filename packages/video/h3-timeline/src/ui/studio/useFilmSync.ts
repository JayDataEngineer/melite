/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useCallback, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { FilmPlayerHandle } from "@melite-plugin/timeline/ui/timeline"
import { GUIDE_KINDS } from "./docModel.ts"
import type { DocCall, DocKeyframe } from "./docModel.ts"
import { hasKnobs } from "./docCalls.ts"

/** Player↔bar playhead sync + rail readout stats (tenant §3). Verbatim lines 1592–1670. */
export function useFilmSync(args: {
  fps: number
  totalFrames: number
  keyframes: DocKeyframe[]
  calls: DocCall[]
  setFrameIdx: Dispatch<SetStateAction<number>>
}) {
  const { fps, totalFrames, keyframes, calls, setFrameIdx } = args
  // ── FILM SYNC (2026-09-01, the player/timeline split, round 2 — the
  // davinci law): ONE player — the final cut — and the bar's axis IS the
  // master output track. The playhead is NEVER translated: it is the
  // literal video time (frame = sec × fps), full stop. Two directions:
  //   player.onTime(sec) → frameIdx = round(sec × fps)   (playback moves the bar)
  //   bar.onFrameChange(f) → frameIdx = f; seekTo(f/fps) (the hand moves the film)
  // SCRUB INTERACTION STATES — not timers (round 1's 300ms guard let a
  // late seek-decode onTime land mid-hold and yank the thumb back, and
  // a slow hold longer than the guard broke the drag outright): the bar
  // reports onScrubStart/onScrubEnd around the gesture; while the flag
  // is set every player time report is swallowed, the player is PAUSED
  // (no decoder thrash under the hand), and on release it resumes only
  // if it had been playing. Synchronous states — nothing expires.
  const filmRef = useRef<FilmPlayerHandle>(null)
  const isScrubbingRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const handleScrubStart = useCallback(() => {
    isScrubbingRef.current = true
    wasPlayingRef.current = filmRef.current ? !isPausedRef.current : false
    if (wasPlayingRef.current) filmRef.current?.pause()
  }, [])
  const handleScrubEnd = useCallback(() => {
    isScrubbingRef.current = false
    if (wasPlayingRef.current) {
      wasPlayingRef.current = false
      filmRef.current?.play()
    }
  }, [])
  // AXIS FPS (audit F2 — ONE fps for the playhead↔indicator↔player
  // triangle): the bar's frame axis is the FILM's (the rendered file's
  // probed fps), not the doc rail's editable fps. These converters used
  // to divide/multiply by layerA.fps while the clips were drawn in film
  // frames — any post-run fps edit desynced playhead, readout and player
  // by exactly the fps ratio. filmMap is declared ~120 lines below
  // (temporal dead zone), so its fps rides a live ref mirrored right
  // after the memo (the filmRef pattern).
  const filmFpsRef = useRef<number | null>(null)
  // (fps arrives defaulted — useViewSelection's one-owner fallback —
  // so a trailing `?? 24` default would be a dead arm, R2 2026-10-27.)
  const axisFps = useCallback(() => filmFpsRef.current ?? fps, [fps])
  const handleFilmTime = useCallback(
    (sec: number) => {
      if (isScrubbingRef.current) return
      const f = Math.round(sec * axisFps())
      setFrameIdx((prev) => (prev === f ? prev : f))
    },
    [axisFps],
  )
  const handleBarFrame = useCallback(
    (f: number) => {
      setFrameIdx(f)
      filmRef.current?.seekTo(f / axisFps())
    },
    [axisFps],
  )
  /** Playing state mirror — needed by handleScrubStart to know whether
   *  to resume on release (the handle has no isPaused getter; keep one
   *  frame of truth here from onPlayingChange). */
  const isPausedRef = useRef(true)
  const handlePlayingChange = useCallback((playing: boolean) => {
    isPausedRef.current = !playing
    setFilmPlaying(playing)
  }, [])
  /** (Layer A NLE) film playing mirror — the mixer drives clip elements
   *  from this + frameIdx; the FilmPlayer's own track (dialogue + any
   *  window audio) plays from the player element itself. */
  const [filmPlaying, setFilmPlaying] = useState(false)
  const seconds = (totalFrames / fps).toFixed(1)
  const unwired = keyframes.filter((k) => !k.image.trim()).length
  // A call's prompt is its ONE text: empty = no prompt at all
  // (the plan refuses it before any GPU work). (text is always a
  // string post-hydration — the `!` records that proof, no dead
  // `?? ""` arm.)
  const emptyText = calls.filter((c) => !c.text!.trim()).length
  const guideCount = calls.reduce(
    (n, c) => n + GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).length,
    0,
  )
  const knobOverrides = calls.filter(hasKnobs).length

  return {
    filmRef, isScrubbingRef, wasPlayingRef, handleScrubStart, handleScrubEnd,
    filmFpsRef, axisFps, handleFilmTime, handleBarFrame,
    isPausedRef, handlePlayingChange, filmPlaying,
    seconds, unwired, emptyText, guideCount, knobOverrides,
  }
}
