import { useCallback, useRef, useEffect } from 'react'
import { useTimelineStore } from "../store"
import { computeWaveformLODs } from '@melite/catalog'

export function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null)
  const sourcesRef = useRef<Map<string, { source: AudioBufferSourceNode; gain: GainNode }>>(new Map())
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const rafRef = useRef<number>(0)

  const audioCues = useTimelineStore((s) => s.audioCues)
  const audioTracks = useTimelineStore((s) => s.audioTracks)
  const playback = useTimelineStore((s) => s.playback)
  const setPlayback = useTimelineStore((s) => s.setPlayback)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  // Pre-load audio buffers when cues change
  useEffect(() => {
    const ctx = getCtx()
    for (const cue of audioCues) {
      if (!cue.audioUrl || buffersRef.current.has(cue.id)) continue
      fetch(cue.audioUrl)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          buffersRef.current.set(cue.id, buffer)
          // Compute waveform peaks — legacy single-LOD (kept for
          // motion-envelope.ts) PLUS the E3.14 multi-LOD cache for
          // zoom-faithful rendering.
          const channel = buffer.getChannelData(0)
          const peaks = downsample(channel, 200)
          const lod = computeWaveformLODs(channel)
          useTimelineStore.getState().updateAudioCue(cue.id, {
            waveformPeaks: peaks,
            waveformPeaksLOD: lod,
          })
        })
        .catch((e: unknown) => {
          // NO SILENT SWALLOW — if the audio fetch or decode fails, the
          // waveform just never appears and the user has no idea why. Log
          // with the cue URL so it's debuggable.
          console.error(`[useAudioPlayback] waveform fetch/decode failed for cue ${cue.id} (${cue.audioUrl}):`, e)
        })
    }
  }, [audioCues, getCtx])

  const play = useCallback(() => {
    const ctx = getCtx()
    // Stop any existing sources
    stopSources()

    // E2.5: build a quick lookup of track state so we can skip muted
    // tracks and apply solo logic. Solo on any track mutes all others.
    // Mute wins over solo on the same track (matches render_service).
    const anySolo = audioTracks.some(t => t.solo)
    const isAudible = (trackId: string): boolean => {
      const t = audioTracks.find(tr => tr.id === trackId)
      if (!t) return !anySolo  // unmapped track: pass unless something is soloed
      if (t.muted) return false  // mute always wins
      if (anySolo) return !!t.solo
      return true
    }

    // Start all cues
    for (const cue of audioCues) {
      const buffer = buffersRef.current.get(cue.id)
      if (!buffer) continue
      // E2.5: skip cues on inaudible tracks entirely.
      if (!isAudible(cue.track)) continue

      // Start at the cue's offset relative to the playhead
      const offset = Math.max(0, playback.currentTime - cue.start)
      // Don't start sources that are already past the cue's end.
      if (offset >= cue.duration) continue

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const gain = ctx.createGain()
      // E2.4: linear gain automation for fade-in / fade-out. The renderer
      // applies afade=t=in:st=0:d=fadeIn and afade=t=out:st=(cue_dur -
      // fadeOut):d=fadeOut in the cue's own clock. For live preview we
      // mirror that with WebAudio ramp automation on the GainNode,
      // accounting for the playhead offset (we may start mid-fade).
      scheduleFadeAutomation(
        gain.gain,
        cue.volume,
        cue.duration,
        cue.fadeIn ?? 0,
        cue.fadeOut ?? 0,
        offset,
        ctx.currentTime,
      )

      source.connect(gain)
      gain.connect(ctx.destination)

      source.start(0, offset)

      sourcesRef.current.set(cue.id, { source, gain })
    }

    // Animate playhead
    const startTime = ctx.currentTime
    const startOffset = playback.currentTime
    function tick() {
      const elapsed = ctx.currentTime - startTime
      const newTime = startOffset + elapsed
      const totalDuration = playback.totalDuration
      if (newTime >= totalDuration) {
        setPlayback({ isPlaying: false, currentTime: 0 })
        stopSources()
        return
      }
      setPlayback({ currentTime: newTime })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    setPlayback({ isPlaying: true })
  }, [audioCues, audioTracks, playback, setPlayback, getCtx])

  const pause = useCallback(() => {
    stopSources()
    cancelAnimationFrame(rafRef.current)
    setPlayback({ isPlaying: false })
  }, [setPlayback])

  const seek = useCallback((time: number) => {
    const wasPlaying = playback.isPlaying
    if (wasPlaying) stopSources()
    cancelAnimationFrame(rafRef.current)
    setPlayback({ currentTime: time })
    if (wasPlaying) play()
  }, [playback.isPlaying, setPlayback, play])

  function stopSources() {
    for (const [, { source }] of sourcesRef.current) {
      try { source.stop() } catch {
        // Browser API: AudioBufferSourceNode.stop() throws if the node has
        // already stopped or never started. Same policy exemption as
        // play()/fullscreen — silent catch is correct.
      }
    }
    sourcesRef.current.clear()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      stopSources()
      ctxRef.current?.close()
    }
  }, [])

  return { play, pause, seek }
}

function downsample(data: Float32Array, numPoints: number): number[] {
  const blockSize = Math.floor(data.length / numPoints)
  const peaks: number[] = []
  for (let i = 0; i < numPoints; i++) {
    let max = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(data[start + j] || 0)
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

/**
 * E2.4: Schedule linear gain ramps on an {@link AudioParam} to mirror the
 * renderer's `afade=t=in|out` filter chain. Public for unit testing with a
 * mock AudioContext.
 *
 * Automation regions (in the cue's own clock, where 0 = cue start):
 *   - Fade-in:  [0, fadeIn]              gain: 0      → volume
 *   - Steady:   [fadeIn, dur - fadeOut]  gain: volume
 *   - Fade-out: [dur - fadeOut, dur]     gain: volume → 0
 *
 * When playback begins at `offset` into the cue, source-clock time 0 is
 * `offset` in the cue's clock. We translate each region accordingly and
 * skip any portion that is already in the past.
 *
 * Clamps `fadeIn`/`fadeOut` to `dur / 2` (matches `_build_audio_filter`
 * in `render_service.py`). With no fades, the param is left at `volume`.
 */
export function scheduleFadeAutomation(
  param: AudioParam,
  volume: number,
  cueDuration: number,
  fadeInRaw: number,
  fadeOutRaw: number,
  offset: number,
  now: number,
): void {
  // Set the steady-state default first so the param is never silent when
  // no automation is needed.
  param.setValueAtTime(volume, now)

  if (cueDuration <= 0) return
  // Clamp to half-duration (matches the renderer clamp).
  const fadeIn = Math.max(0, Math.min(fadeInRaw, cueDuration / 2))
  const fadeOut = Math.max(0, Math.min(fadeOutRaw, cueDuration / 2))
  if (fadeIn <= 0 && fadeOut <= 0) return

  // Convert cue-clock positions to source-clock positions (subtract offset).
  const fadeInEndSrc = fadeIn - offset        // when fade-in completes
  const fadeOutStartSrc = cueDuration - fadeOut - offset
  const fadeOutEndSrc = cueDuration - offset

  // ── Fade-in ──────────────────────────────────────────────────────────
  if (fadeIn > 0 && offset < fadeIn) {
    // Currently inside (or before) the fade-in region. Interpolate the
    // gain at the current source-clock time so the ramp is continuous.
    const gainNow = (offset / fadeIn) * volume
    param.setValueAtTime(gainNow, now)
    param.linearRampToValueAtTime(volume, now + Math.max(0, fadeInEndSrc))
  }

  // ── Fade-out ─────────────────────────────────────────────────────────
  if (fadeOut > 0) {
    if (offset >= fadeOutStartSrc && offset < cueDuration) {
      // Already inside the fade-out region. The remaining gain scales
      // linearly with the remaining time.
      const remaining = cueDuration - offset
      const gainNow = (remaining / fadeOut) * volume
      param.setValueAtTime(gainNow, now)
      param.linearRampToValueAtTime(0, now + Math.max(0, remaining))
    } else if (offset < fadeOutStartSrc) {
      // Fade-out is entirely in the future. Pin the gain at `volume` at
      // the start of the fade-out window, then ramp to 0 by cue end.
      param.setValueAtTime(volume, now + Math.max(0, fadeOutStartSrc))
      param.linearRampToValueAtTime(0, now + Math.max(0, fadeOutEndSrc))
    }
  }
}
