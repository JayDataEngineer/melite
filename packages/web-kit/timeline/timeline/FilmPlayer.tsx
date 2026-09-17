/**
 * FilmPlayer — ONE film, ONE native player (the timeline genre's
 * shared video surface, moved from h3-timeline's kit 2026-09-17:
 * the operator's generic-tools stroke — "other cards, like H3
 * Timeline (timeline bar at the bottom, video preview, dynamic
 * parameters on the left), share code"). The timeline-genre card
 * now composes from shared rails: StudioShell + CardForm
 * (@melite/card-base), MotionTimelineBar (this package), and THIS
 * player — the imperative seam the bar's playhead drives
 * (seekTo/current/duration/play/pause/toggle) with the
 * time/duration/playing reports. Time reports keep both sources
 * (the element's timeupdate clock + a 4Hz poll while playing) so a
 * silent event path never freezes the bar.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react"

export interface FilmPlayerHandle {
  seekTo: (sec: number) => void
  current: () => number
  duration: () => number
  play: () => void
  pause: () => void
  toggle: () => void
}

export interface FilmPlayerProps {
  src: string
  onTime?: (sec: number) => void
  onDuration?: (sec: number) => void
  onPlayingChange?: (playing: boolean) => void
  onEnded?: () => void
  muted?: boolean
  loop?: boolean
  autoPlay?: boolean
  poster?: string
  className?: string
  "data-testid"?: string
}

export const FilmPlayer = forwardRef<FilmPlayerHandle, FilmPlayerProps>(
  function FilmPlayer(
    { src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)

    const pendingSeekRef = useRef<number | null>(null)
    const seekRafRef = useRef<number | null>(null)

    const seekTo = useCallback((sec: number) => {
      pendingSeekRef.current = sec
      if (seekRafRef.current != null) return
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = null
        // (pendingSeek is always a number here: seekTo sets it before
        // scheduling and this callback is its only reader — the `as`
        // records the single-writer proof, no dead null arm.)
        const target = pendingSeekRef.current as number
        pendingSeekRef.current = null
        const el = videoRef.current
        if (!el) return
        const d = el.duration
        const t = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target)
        el.currentTime = t
      })
    }, [])

    useEffect(
      () => () => {
        if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current)
      },
      [],
    )

    useImperativeHandle(
      ref,
      (): FilmPlayerHandle => ({
        // (The handle is callable only while mounted — React nulls the
        // imperative ref on unmount — and the <video> always renders,
        // so videoRef is non-null here; `!` records that proof.)
        seekTo,
        current: () => videoRef.current!.currentTime,
        duration: () => {
          const d = videoRef.current!.duration
          return Number.isFinite(d) ? d : 0
        },
        play: () => void videoRef.current?.play(),
        pause: () => void videoRef.current?.pause(),
        toggle: () => {
          const el = videoRef.current!
          if (el.paused) void el.play()
          else el.pause()
        },
      }),
      [seekTo],
    )

    const onTimeRef = useRef(onTime)
    onTimeRef.current = onTime
    const handleTime = useCallback((t: number) => {
      onTimeRef.current?.(t)
    }, [])
    useEffect(() => {
      const id = window.setInterval(() => {
        // (The interval is cleared on unmount — videoRef is non-null on
        // every tick; `!` records that proof.)
        const el = videoRef.current!
        if (el.paused || el.ended) return
        const t = el.currentTime
        if (Number.isFinite(t) && t >= 0) onTimeRef.current?.(t)
      }, 250)
      return () => window.clearInterval(id)
    }, [])

    return (
      <video
        ref={videoRef}
        className={className}
        data-testid={tid}
        src={src}
        muted={muted}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        controls
        poster={poster}
        onTimeUpdate={(e) => handleTime(e.currentTarget.currentTime)}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        onEnded={() => onEnded?.()}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) onDuration?.(d)
        }}
      />
    )
  },
)
