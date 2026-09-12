// Audio player with WaveSurfer.js waveform visualization.
import { useCallback, useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { Play, Pause } from "../../../ui-icons"
import styles from "./AudioPlayer.module.css"

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

interface AudioPlayerProps {
  src: string
  height?: number
  className?: string
}

export function AudioPlayer({ src, height = 128, className }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  // EXPLICIT SCRUB (2026-08-25 "can't click and drag around the little
  // scrubber"): wavesurfer 7.12's dragToSeek machinery proved unreliable in
  // the live dialog (drag events fired, rendered progress stayed 0% —
  // verified with real CDP input AND synthetic events). The container now
  // owns the interaction directly: pointer down/move maps clientX to a
  // waveform ratio and seeks immediately, with pointer capture so a fast
  // drag never loses the gesture. This is the scrubber contract — click
  // AND drag, anywhere on the waveform.
  const scrubbingRef = useRef(false)
  const seekFromPointer = useCallback((clientX: number) => {
    const ws = wsRef.current
    const el = containerRef.current
    if (!ws || !el) return
    const d = ws.getDuration()
    if (!(d > 0)) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    ws.setTime(ratio * d)
  }, [])
  const onScrubPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      scrubbingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      seekFromPointer(e.clientX)
    },
    [seekFromPointer],
  )
  const onScrubPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return
      seekFromPointer(e.clientX)
    },
    [seekFromPointer],
  )
  const onScrubPointerUp = useCallback(() => {
    scrubbingRef.current = false
  }, [])

  // Init wavesurfer
  useEffect(() => {
    if (!containerRef.current) return
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      cursorColor: "#ffffff30",
      cursorWidth: 2,
      normalize: true,
      waveColor: "#ffffff30",
      progressColor: "var(--brand)",
      // DRAG-TO-SEEK (2026-08-25 "can't click and drag around the little
      // scrubber"): wavesurfer 7.12 ships dragToSeek FALSE — a press-move-
      // release across the waveform did nothing; only bare clicks seeked.
      // The scrubber is THE interaction surface of a player this size.
      dragToSeek: true,
    })
    ws.load(src).catch((err: unknown) => {
      // Unreachable / undecodable audio must degrade gracefully (empty
      // waveform, transport disabled) — never an uncaught rejection.
      console.warn("AudioPlayer: failed to load", src, err)
    })
    ws.on("ready", () => { setDuration(ws.getDuration()) })
    ws.on("timeupdate", (t: number) => setCurrent(t))
    ws.on("play", () => setPlaying(true))
    ws.on("pause", () => setPlaying(false))
    ws.on("finish", () => setPlaying(false))
    wsRef.current = ws
    return () => { ws.destroy(); wsRef.current = null }
  }, [src, height])

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  return (
    // FULL-MODE WIDTH (same 2026-08-25 report: "way too small"): the root
    // had NO width, so inside the centered dialog flex row it shrank to its
    // widest intrinsic child (the transport row — measured live at ~102px)
    // and the waveform collapsed to a sliver. AudioPlayer is only ever
    // mounted full-size (the claim's mode dispatch). INLINE STYLE, not a
    // Tailwind arbitrary value: w-[min(880px,88vw)] never compiled — the
    // app's Tailwind scan doesn't reach this plugin file (verified: zero
    // occurrences of "min(880px" in the built CSS), so the class silently
    // did nothing.
    <div className={className ? `${styles.root} ${className}` : styles.root} style={{ width: "min(880px, 88vw)" }}>
      {/* Waveform — wrapped in a recessed "track" panel so the bars don't
          appear to float on the dialog background. The outer panel carries
          the surface bg + border; the inner div is the WaveSurfer mount. */}
      <div className={styles.trackPanel}>
        <div
          ref={containerRef}
          className={styles.waveMount}
          onPointerDown={onScrubPointerDown}
          onPointerMove={onScrubPointerMove}
          onPointerUp={onScrubPointerUp}
          onPointerCancel={onScrubPointerUp}
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Transport bar */}
      <div className={styles.transport}>
        <Button variant="ghost" onClick={togglePlay}
          className={styles.playBtn}>
          {playing ? <Pause className={styles.playIcon} /> : <Play className={`${styles.playIcon} ${styles.playIconOffset}`} />}
        </Button>
        <span className={styles.timeLabel}>
          {fmtTime(current)} / {fmtTime(duration)}
        </span>
      </div>
    </div>
  )
}
