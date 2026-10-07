// Custom video player — native <video> with a polished control overlay.
// Modeled after redshiftdb's VideoPlayer pattern.
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { ScrubInput } from '@melite/cards/form-fields'
import {
  Maximize, Minimize2, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX,
} from "@melite/card-base/client"
import styles from "./VideoPlayer.module.css"

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
      className={`${styles.root} ${fullscreen ? styles.rootFullscreen : styles.rootWindowed} ${className ?? ""}`}
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
        className={fullscreen ? styles.videoFullscreen : styles.videoWindowed}
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
          className={styles.centerPlay}
          aria-label={ended ? "Replay" : "Play"}>
          <span className={styles.centerPlayDisc}>
            {ended
              ? <RotateCcw className={styles.centerIcon} />
              : <Play className={`${styles.centerIcon} ${styles.centerIconFill} ${styles.centerIconNudge}`} />}
          </span>
        </Button>
      )}

      {/* Control bar */}
      <div className={`${styles.controlBar} ${showControls ? styles.controlBarShown : styles.controlBarHidden}`}>
        {/* Seek bar */}
        <div
          className={styles.seekBar}
          onClick={(e) => {
            if (!Number.isFinite(duration) || duration <= 0) return
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            seek(ratio * duration)
          }}
        >
          <div className={styles.seekTrack} />
          <div className={styles.seekBuffered} style={{ width: `${bufferedPct}%` }} />
          <div className={styles.seekPlayed} style={{ width: `${pct}%` }} />
          <div className={styles.seekKnob} style={{ left: `calc(${pct}% - 7px)` }} />
        </div>

        {/* Buttons row */}
        <div className={styles.buttonsRow}>
          <Button variant="ghost" onClick={togglePlay} className={styles.transportBtn} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className={styles.transportIcon} /> : <Play className={styles.transportIcon} />}
          </Button>

          <Button variant="ghost" onClick={() => skip(-10)} className={styles.transportBtn} aria-label="Back 10 seconds">
            <RotateCcw className={styles.transportIconSm} />
          </Button>
          <Button variant="ghost" onClick={() => skip(10)} className={styles.transportBtn} aria-label="Forward 10 seconds">
            <RotateCw className={styles.transportIconSm} />
          </Button>

          {/* Volume */}
          <div className={styles.volumeWrap}>
            <Button variant="ghost" onClick={toggleMute} className={styles.transportBtn}>
              {muted || volume === 0 ? <VolumeX className={styles.transportIconSm} /> : <Volume2 className={styles.transportIconSm} />}
            </Button>
            <ScrubInput
              min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                const vid = videoRef.current
                if (vid) { vid.volume = v; vid.muted = v === 0 }
              }}
              className={styles.volumeSlider}
            />
          </div>

          <span className={styles.timeLabel}>{fmtTime(current)} / {fmtTime(duration)}</span>

          <div className={styles.spacer} />

          <Button variant="ghost" onClick={toggleFullscreen} className={styles.transportBtn}>
            {fullscreen ? <Minimize2 className={styles.transportIconSm} /> : <Maximize className={styles.transportIconSm} />}
          </Button>
        </div>
      </div>
    </div>
  )
}
