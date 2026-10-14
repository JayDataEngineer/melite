/**
 * TimelineScrubBar — the form card's OPTIONAL BOTTOM SEAM (the
 * generic-tools stroke, 2026-09-17: "form cards can have an
 * optional SEAM for a timeline that stretches along the bottom").
 *
 * A PURE scrub rail: playhead position from current/duration,
 * click + drag to seek, an optional play/pause toggle, and a
 * time/frame readout. The OWNER wires it to whatever player owns
 * the preview (the shared FilmPlayer's handle — seekTo/toggle/
 * current/duration); the bar never touches a media element itself.
 * Studios with full NLE needs ride MotionTimelineBar instead —
 * this is the FORM card's face, the same genre as the shell's
 * own "bottom: timeline scrub" slot law.
 */
import { useCallback, useRef, useState } from "react"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import type { PointerEvent as ReactPointerEvent } from "react"
import styles from "./timeline.module.css"
import { timelineCopy } from "../timelineCopy.ts"

export interface TimelineScrubBarProps {
  /** the playhead's clock (seconds) */
  current: number
  /** the film's length (seconds); <= 0 renders the bar inert */
  duration: number
  /** seek to a second (owner → player handle) */
  onSeek: (sec: number) => void
  /** optional transport toggle (owner → player handle) */
  onTogglePlay?: () => void
  /** playing state for the toggle's glyph */
  playing?: boolean
  /** frames-per-second for the readout's frame column (omit = time only) */
  fps?: number
  /** testid hook */
  "data-testid"?: string
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function TimelineScrubBar({
  current, duration, onSeek, onTogglePlay, playing, fps, "data-testid": tid,
}: TimelineScrubBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const pct = duration > 0 ? clamp01(current / duration) : 0

  /** pointer X → track fraction → seconds, clamped to the film */
  const seekAtPointer = useCallback((clientX: number): void => {
    const track = trackRef.current
    if (track === null || duration <= 0) return
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    onSeek(clamp01((clientX - rect.left) / rect.width) * duration)
  }, [duration, onSeek])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    seekAtPointer(e.clientX)
  }, [duration, seekAtPointer])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    seekAtPointer(e.clientX)
  }, [dragging, seekAtPointer])

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }, [dragging])

  const fmt = (sec: number): string => {
    const s = Math.max(0, sec)
    const m = Math.floor(s / 60)
    return m > 0 ? m + ":" + String(Math.floor(s % 60)).padStart(2, "0") : s.toFixed(1) + timelineCopy.secondsUnit
  }

  return (
    <div className={styles.scrubBar} data-testid={tid ?? "timeline-scrub-bar"} data-dragging={dragging ? "true" : undefined}>
      {onTogglePlay !== undefined
        ? (
          // DSH Button (law 1: the sibling timeline bars already
          // ride it; this raw button was the last hand-rolled one).
          // Ghost/sm is the sibling zoom control's own shape, and the
          // scrubToggle class keeps the seam's flex sizing.
          <Button
            variant="ghost"
            size="sm"
            className={styles.scrubToggle}
            aria-label={playing ? timelineCopy.scrubPauseAria : timelineCopy.scrubPlayAria}
            onClick={onTogglePlay}
            data-testid="timeline-scrub-toggle"
          >
            {playing ? "❚❚" : "▶"}
          </Button>
        )
        : null}
      <div
        ref={trackRef}
        className={styles.scrubTrack}
        data-testid="timeline-scrub-track"
        role="slider"
        aria-label={timelineCopy.scrubAria}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration)}
        aria-valuenow={Math.max(0, current)}
        aria-valuetext={timelineCopy.scrubValuetext({ current: fmt(current), duration: fmt(duration) })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.scrubFill} style={{ width: (pct * 100).toFixed(3) + "%" }} />
        <div className={styles.scrubHead} style={{ left: (pct * 100).toFixed(3) + "%" }} />
      </div>
      <span className={styles.scrubReadout} data-testid="timeline-scrub-readout">
        {fmt(current)} / {fmt(duration)}
        {fps !== undefined && fps > 0
          ? timelineCopy.scrubFramesSuffix({ frame: Math.round(current * fps), total: Math.round(duration * fps) })
          : null}
      </span>
    </div>
  )
}
