/**
 * filmSeam.tsx — THE FORM CARD'S OPTIONAL TIMELINE SEAM (the
 * form-seams stroke, 2026-09-17): "form cards can have an optional
 * SEAM for a timeline that stretches along the bottom".
 *
 * The shell's three-slot shape puts the PREVIEW in the right slot
 * and the TIMELINE in the bottom slot — two different slots, one
 * logical face (the bar scrubs the player). The seam object is the
 * bridge: the player writes (handle + clock), the bar reads. A
 * plain observable box — no store, no context, the smallest honest
 * straddle: createFilmSeam() once per stage view (a useRef in the
 * owner), FilmSeamPlayer into the preview slot, FilmSeamBar into
 * the shell's bottom slot when the card CLAIMS the seam (the
 * served spec's preview.timeline) AND a film artifact exists.
 */
import { useCallback, useEffect, useState } from 'react'
import { createElement as h, type Ref } from 'react'
import { FilmPlayer, TimelineScrubBar } from '@melite-plugin/timeline/ui/timeline'
import type { FilmPlayerHandle } from '@melite-plugin/timeline/ui/timeline'

/** the observable bridge — player writes, bar reads */
export interface FilmSeam {
  handle: FilmPlayerHandle | null
  current: number
  duration: number
  playing: boolean
  fps: number
  subscribe(fn: () => void): () => void
  /** the player face wires itself here (the ref callback) */
  bind(handle: FilmPlayerHandle | null): void
  report(partial: Partial<Pick<FilmSeam, 'current' | 'duration' | 'playing' | 'fps'>>): void
}

export function createFilmSeam(fps = 0): FilmSeam {
  const listeners = new Set<() => void>()
  const seam: FilmSeam = {
    handle: null,
    current: 0,
    duration: 0,
    playing: false,
    fps,
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    bind(handle) {
      seam.handle = handle
      for (const fn of listeners) fn()
    },
    report(partial) {
      Object.assign(seam, partial)
      for (const fn of listeners) fn()
    },
  }
  return seam
}

/** THE PREVIEW SLOT FACE — the shared player, wired to the seam */
export function FilmSeamPlayer(props: { seam: FilmSeam; src: string; 'data-testid'?: string }): ReturnType<typeof h> {
  const { seam, src } = props
  const onTime = useCallback((sec: number) => { seam.report({ current: sec }) }, [seam])
  const onDuration = useCallback((sec: number) => { seam.report({ duration: sec }) }, [seam])
  const onPlayingChange = useCallback((playing: boolean) => { seam.report({ playing }) }, [seam])
  const ref: Ref<FilmPlayerHandle> = (handle) => { seam.bind(handle) }
  return h(FilmPlayer, {
    src,
    onTime,
    onDuration,
    onPlayingChange,
    ref,
    'data-testid': props['data-testid'] ?? 'film-seam-player',
  })
}

/** THE BOTTOM SLOT FACE — the shared scrub bar, reading the seam */
export function FilmSeamBar(props: { seam: FilmSeam; 'data-testid'?: string }): ReturnType<typeof h> {
  const { seam } = props
  const [, force] = useState(0)
  useEffect(() => seam.subscribe(() => { force((n) => n + 1) }), [seam])
  const onSeek = useCallback((sec: number) => {
    seam.handle?.seekTo(sec)
    // optimistic playhead (the 4Hz poll confirms; the drag never waits)
    seam.report({ current: sec })
  }, [seam])
  const onTogglePlay = useCallback(() => { seam.handle?.toggle() }, [seam])
  return h(TimelineScrubBar, {
    current: seam.current,
    duration: seam.duration > 0 ? seam.duration : (seam.handle?.duration() ?? 0),
    onSeek,
    onTogglePlay,
    playing: seam.playing,
    fps: seam.fps > 0 ? seam.fps : undefined,
    'data-testid': props['data-testid'] ?? 'film-seam-bar',
  })
}
