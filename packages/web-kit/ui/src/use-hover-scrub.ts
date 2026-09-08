/**
 * E3.9 — Hover-scrub hook for the storyboard inline mini-player.
 *
 * When the user hovers over a segment card thumbnail, we want to preview
 * the frame under the cursor — like YouTube's seek-preview. We bind a
 * hidden `<video>` element to the hook, and on mousemove we seek that
 * video to the proportional time. When the new frame has painted we
 * publish the scrub time so the UI can render a timecode / frame
 * overlay (and the seeked video element shows the frame itself, exposed
 * via CSS visibility or a separate visible `<video>`).
 *
 * We prefer `requestVideoFrameCallback` (rVFC) when available — it
 * fires once per *painted* frame, so we don't update React state more
 * often than the user can see. On browsers without rVFC we fall back
 * to setting scrubTime immediately after the seek.
 *
 * Why a hook (not a component): the parent (`SegmentCard`) owns the
 * surrounding markup and just needs the event handlers + the scrub
 * time. Keeping the imperative video element in a ref (rather than
 * state) avoids re-renders on every mousemove.
 */
import { useCallback, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

export interface UseHoverScrubResult {
  /** Imperatively register the hidden <video> used for seeking. The
   *  parent should call this in a `<video>` ref callback. */
  setVideoEl: (el: HTMLVideoElement | null) => void
  /** Attach to the thumbnail wrapper. Computes the proportional time
   *  from the cursor X within the element and seeks the bound video. */
  onMouseMove: (e: MouseEvent<HTMLDivElement>) => void
  /** Reset the scrub time to null (clears the overlay). */
  onMouseLeave: () => void
  /** The currently-scrubbed time in seconds, or null when not hovering
   *  or no frame has been published yet. */
  scrubTime: number | null
  /** Whether the bound video is ready to seek (loaded metadata). */
  ready: boolean
}

export function useHoverScrub(): UseHoverScrubResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el) {
      // Mark ready when metadata is loaded so the duration is known.
      if (el.readyState >= 1) setReady(true)
      else {
        el.addEventListener('loadedmetadata', () => setReady(true), { once: true })
      }
    } else {
      setReady(false)
    }
  }, [])

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return
    const dur = video.duration
    if (!dur || !isFinite(dur) || dur <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const t = (x / rect.width) * dur
    try {
      video.currentTime = t
    } catch {
      // HTMLMediaElement.currentTime setter throws if the media isn't
      // seekable yet (early in load). Browser-API rejection, not a backend
      // failure — silent catch is correct (see api.ts no-swallow policy).
      return
    }
    // Use requestVideoFrameCallback if available — it fires once per
    // painted frame, throttling React updates to visible changes.
    const anyVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
    }
    if (typeof anyVideo.requestVideoFrameCallback === 'function') {
      anyVideo.requestVideoFrameCallback(() => {
        setScrubTime(video.currentTime)
      })
    } else {
      setScrubTime(video.currentTime)
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    setScrubTime(null)
  }, [])

  return { setVideoEl, onMouseMove, onMouseLeave, scrubTime, ready }
}

/** Format seconds as M:SS.d for the scrub overlay. */
export function formatScrubTime(t: number | null): string {
  if (t === null || !isFinite(t)) return ''
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
