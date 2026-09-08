// Custom video player — native <video> with a polished control overlay.
// Modeled after redshiftdb's VideoPlayer pattern.
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@melite/ui/button"
import { ScrubInput } from "@melite/ui"
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize2,
  RotateCcw, RotateCw,
} from "lucide-react"

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

interface VideoPlayerProps {
  src: string
  className?: string
  autoPlay?: boolean
}

export function VideoPlayer({ src, className, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [ended, setEnded] = useState(false)

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pokeControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500)
    }
  }, [playing])

  useEffect(() => {
    if (fullscreen) pokeControls()
  }, [fullscreen, pokeControls])

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrent(v.currentTime)
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1))
    }
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setEnded(false)
    } else {
      v.pause()
    }
  }, [])

  const seek = useCallback((t: number) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(t) || t < 0) return
    const maxTime = Number.isFinite(duration) && duration > 0 ? duration : v.duration
    if (!Number.isFinite(maxTime) || maxTime <= 0) return
    v.currentTime = Math.min(t, maxTime)
  }, [duration])

  const skip = useCallback((delta: number) => {
    const v = videoRef.current
    if (!v) return
    seek(v.currentTime + delta)
  }, [seek])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay() }
      else if (e.key === "ArrowLeft") { e.preventDefault(); skip(-5) }
      else if (e.key === "ArrowRight") { e.preventDefault(); skip(5) }
      else if (e.key === "f") { e.preventDefault(); toggleFullscreen() }
      else if (e.key === "m") { e.preventDefault(); toggleMute() }
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [togglePlay, skip, toggleFullscreen, toggleMute])

  useEffect(() => {
    if (playing) pokeControls()
    else setShowControls(true)
  }, [playing, pokeControls])

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`group relative overflow-hidden bg-black outline-none ${fullscreen ? "h-screen w-screen rounded-none" : "w-full rounded-lg"} ${className ?? ""}`}
      onMouseMove={pokeControls}
      onMouseLeave={() => playing && setShowControls(false)}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        playsInline
        autoPlay={autoPlay}
        className={`bg-black ${fullscreen ? "h-full w-full object-contain" : "w-full"}`}
        style={fullscreen ? undefined : { aspectRatio: "16 / 9", maxHeight: "78vh" }}
        onClick={togglePlay}
        onPlay={() => { setPlaying(true); setEnded(false) }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onEnded={() => { setEnded(true); setPlaying(false) }}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted) }}
      />

      {/* Center play/pause button */}
      {!playing && (
        <Button variant="ghost" onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          aria-label={ended ? "Replay" : "Play"}>
          <span className="flex size-20 items-center justify-center rounded-full bg-white/90 shadow-2xl transition-transform hover:scale-110">
            {ended
              ? <RotateCcw className="size-8 text-black" />
              : <Play className="ml-1 size-8 fill-black text-black" />}
          </span>
        </Button>
      )}

      {/* Control bar */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-8 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Seek bar */}
        <div
          className="group/seek relative mb-2 flex h-1.5 cursor-pointer items-center"
          onClick={(e) => {
            if (!Number.isFinite(duration) || duration <= 0) return
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            seek(ratio * duration)
          }}
        >
          <div className="absolute inset-x-0 h-1 rounded-full bg-white/25" />
          <div className="absolute h-1 rounded-full bg-white/35" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute h-1 rounded-full bg-brand" style={{ width: `${pct}%` }} />
          <div className="absolute size-3.5 rounded-full bg-white shadow-md transition-transform group-hover/seek:scale-125" style={{ left: `calc(${pct}% - 7px)` }} />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3 text-foreground">
          <Button variant="ghost" onClick={togglePlay} className="rounded p-1 transition-colors hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </Button>

          <Button variant="ghost" onClick={() => skip(-10)} className="rounded p-1 transition-colors hover:bg-white/20" aria-label="Back 10 seconds">
            <RotateCcw className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => skip(10)} className="rounded p-1 transition-colors hover:bg-white/20" aria-label="Forward 10 seconds">
            <RotateCw className="size-4" />
          </Button>

          {/* Volume */}
          <div className="group/vol flex items-center gap-1.5">
            <Button variant="ghost" onClick={toggleMute} className="rounded p-1 transition-colors hover:bg-white/20">
              {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
            <ScrubInput
              min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                const vid = videoRef.current
                if (vid) { vid.volume = v; vid.muted = v === 0 }
              }}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white h-1 cursor-pointer opacity-0 group-hover/vol:opacity-100"
            />
          </div>

          <span className="text-xs tabular-nums text-foreground/70">{fmtTime(current)} / {fmtTime(duration)}</span>

          <div className="flex-1" />

          <Button variant="ghost" onClick={toggleFullscreen} className="rounded p-1 transition-colors hover:bg-white/20">
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
