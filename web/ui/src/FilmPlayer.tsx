/**
 * FilmPlayer — the ONE film player primitive (2026-09-01, operator's
 * player/timeline split: "use a library for the player, keep the custom
 * timeline").
 *
 * The scenario-A half: standard playback UX (play/pause, scrub, volume,
 * buffering, keyboard, ARIA) is a trap to hand-roll — cross-browser
 * edge cases live in the library. Built on Vidstack's headless React
 * primitives (@vidstack/react), themed to the editor tokens; the custom
 * MotionTimelineBar (scenario B) stays the EDITOR surface and syncs to
 * this player through the handle + onTime.
 *
 * The handle (scenario-B seam): seekTo/current/play/pause/toggle — the
 * timeline bar's playhead drives seekTo, onTime drives the bar's frame
 * index. One direction at a time is guarded by the CONSUMER (it knows
 * whether a scrub is in flight); the player just reports truth.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react"
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default"
import "@vidstack/react/player/styles/default/theme.css"
import "@vidstack/react/player/styles/default/layouts/video.css"

export interface FilmPlayerHandle {
  /** Seek to a time in seconds (clamped to the media duration). */
  seekTo: (sec: number) => void
  /** Current playback time in seconds (0 when nothing is loaded). */
  current: () => number
  /** Media duration in seconds (0 when unknown). */
  duration: () => number
  play: () => void
  pause: () => void
  /** Toggle play/pause. */
  toggle: () => void
}

export interface FilmPlayerProps {
  src: string
  /** Continuous time reports (RAW seconds — no scaling math here; the
   *  consumer owns any frame conversion). */
  onTime?: (sec: number) => void
  /** Media duration once known (the master-axis source of last resort). */
  onDuration?: (sec: number) => void
  /** Play/pause state changes (drives external transport UI). */
  onPlayingChange?: (playing: boolean) => void
  /** Called when the media ends (loop-off decks advance on it). */
  onEnded?: () => void
  /** Sound: the DELIVERABLE film plays ON (the default); muted is explicit. */
  muted?: boolean
  loop?: boolean
  autoPlay?: boolean
  /** Poster before first play (a frame thumb; absent = the film's own). */
  poster?: string
  className?: string
  /** data-testid for the one hero player a surface mounts. */
  "data-testid"?: string
}

/**
 * One film, one player. `controls` come from the DefaultVideoLayout
 * (Vidstack's accessible default chrome); the wrapper stays unstyled so
 * the tenant decides size/shape.
 */
export const FilmPlayer = forwardRef<FilmPlayerHandle, FilmPlayerProps>(
  function FilmPlayer(
    { src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid },
    ref,
  ) {
    const playerRef = useRef<MediaPlayerInstance>(null)

    // SEEK COALESCING (audit F6, DaVinci-smooth scrubbing): a scrub or a
    // trim-follow drag fires a seek per pointermove (60–120 Hz) and each
    // element-level seek costs demux+decode — the unthrottled storm was
    // the scrub stutter. Collapse on the animation frame: latest value
    // wins, at most ONE media seek per frame, trailing call always lands.
    const pendingSeekRef = useRef<number | null>(null)
    const seekRafRef = useRef<number | null>(null)

    const seekTo = useCallback((sec: number) => {
      pendingSeekRef.current = sec
      if (seekRafRef.current != null) return
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = null
        const s = pendingSeekRef.current
        pendingSeekRef.current = null
        const p = playerRef.current
        if (s == null || !p) return
        const d = p.state.duration
        const t = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(s, d) : s)
        p.currentTime = t
      })
    }, [])

    // Never leak a scheduled frame across unmounts.
    useEffect(
      () => () => {
        if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current)
      },
      [],
    )

    useImperativeHandle(
      ref,
      (): FilmPlayerHandle => ({
        seekTo,
        current: () => playerRef.current?.currentTime ?? 0,
        duration: () => {
          const d = playerRef.current?.duration
          return Number.isFinite(d) ? (d ?? 0) : 0
        },
        play: () => void playerRef.current?.play(),
        pause: () => void playerRef.current?.pause(),
        toggle: () => {
          const p = playerRef.current
          if (!p) return
          if (p.state.paused) void p.play()
          else p.pause()
        },
      }),
      [seekTo],
    )

    // Time reports — TWO independent sources, because a silent event
    // path must never freeze a synced playhead ("the bar didn't move
    // during playback", 2026-09-01):
    //   1. Vidstack's time-update event (engine clock), and
    //   2. a 4Hz reading of the instance's own currentTime while
    //      playing — raw seconds straight off the element, no event
    //      plumbing to trust. Whichever speaks, onTime hears.
    const onTimeRef = useRef(onTime)
    onTimeRef.current = onTime
    const handleTime = useCallback((t: number) => {
      onTimeRef.current?.(t)
    }, [])
    useEffect(() => {
      const id = window.setInterval(() => {
        const p = playerRef.current
        if (!p || p.state.paused || p.state.ended) return
        const t = p.currentTime
        if (Number.isFinite(t) && t >= 0) onTimeRef.current?.(t)
      }, 250)
      return () => window.clearInterval(id)
    }, [])

    // Duration: the master-axis source of last resort (a tenant without
    // probed metadata sizes the bar from the film itself).
    const onDurRef = useRef(onDuration)
    onDurRef.current = onDuration
    useEffect(() => {
      const p = playerRef.current
      if (!p) return
      const d = p.state.duration
      if (Number.isFinite(d) && d > 0) onDurRef.current?.(d)
    })

    return (
      <MediaPlayer
        ref={playerRef}
        className={className}
        data-testid={tid}
        src={src}
        muted={muted}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        posterLoad="eager"
        onTimeUpdate={(detail) => handleTime(detail.currentTime)}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        onEnded={() => onEnded?.()}
        streamType="on-demand"
        viewType="video"
      >
        {poster ? <Poster className="vds-poster" src={poster} alt="" /> : null}
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    )
  },
)
