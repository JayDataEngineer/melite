/**
 * filmSeam.spec.tsx — the FORM CARD'S OPTIONAL TIMELINE SEAM (the
 * form-seams stroke 2026-09-17): the observable bridge straddles
 * the shell's two slots — the player face writes (handle + clock),
 * the bottom bar reads (scrub → seekTo, toggle, optimistic
 * playhead). The REAL shared player + bar ride under it (the seam
 * is the wiring, not a re-implementation).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { createFilmSeam, FilmSeamBar, FilmSeamPlayer } from '../src/client/filmSeam.tsx'
import type { FilmSeam } from '../src/client/filmSeam.tsx'

afterEach(cleanup)

/** happy-dom's media element is a stub shell: pin play/pause so the
 *  handle arms run without a decoder (the filmPlayer spec's law). */
function silenceMedia(): () => void {
  const proto = (globalThis as unknown as { HTMLMediaElement: { prototype: HTMLMediaElement } }).HTMLMediaElement.prototype
  const origPlay = proto.play
  const origPause = proto.pause
  proto.play = (() => Promise.resolve()) as unknown as typeof proto.play
  proto.pause = (() => {}) as unknown as typeof proto.pause
  return () => {
    proto.play = origPlay
    proto.pause = origPause
  }
}

describe('createFilmSeam (the observable bridge)', () => {
  it('starts neutral; report writes and pings subscribers; unsubscribe stops', () => {
    const seam = createFilmSeam()
    expect(seam.current).toBe(0)
    expect(seam.duration).toBe(0)
    expect(seam.playing).toBe(false)
    expect(seam.fps).toBe(0)
    const seen: number[] = []
    const off = seam.subscribe(() => { seen.push(seam.current) })
    seam.report({ current: 2.5 })
    seam.report({ duration: 10, playing: true, fps: 24 })
    expect(seen).toEqual([2.5, 2.5])
    off()
    seam.report({ current: 9 })
    expect(seen.length).toBe(2)
  })

  it("fps rides the constructor (the card's own frame clock)", () => {
    expect(createFilmSeam(24).fps).toBe(24)
  })
})

describe('the straddle: player writes, bar reads', () => {
  it("the player carries THE FIT LAW (the tall-screen catch, 2026-09-23: 'the video AGAIN FLOWS OVER THE SIDES') — a 1344px film never paints outside its pane", async () => {
    const restore = silenceMedia()
    try {
      const seam = createFilmSeam()
      render(h(FilmSeamPlayer, { seam, src: 'https://x/final.mp4' }))
      const v = screen.getByTestId('film-seam-player') as HTMLVideoElement
      // the shared player renders a bare <video> — the class is the
      // ONLY fit law this face has; absent, the intrinsic width wins
      expect(v.className).toMatch(/player/)
      // jsdom does no layout: the module's own file IS the contract —
      // pin the law's declarations (the honest jsdom way for CSS;
      // vitest runs from the repo root, the workspace runner's cwd)
      const fs = await import('node:fs')
      const law = fs.readFileSync('packages/web/melite-card-view/src/client/filmSeam.module.css', 'utf8')
      expect(law).toContain('width: 100%')
      expect(law).toContain('max-width: 100%')
      expect(law).toContain('max-height: 100%')
      expect(law).toContain('object-fit: contain')
    } finally {
      restore()
    }
  })

  it('the player binds its handle and reports the clock through the seam', () => {
    const restore = silenceMedia()
    try {
      const seam = createFilmSeam()
      render(h(FilmSeamPlayer, { seam, src: 'https://x/final.mp4' }))
      expect(seam.handle).not.toBeNull()
      const v = screen.getByTestId('film-seam-player') as HTMLVideoElement
      Object.defineProperty(v, 'duration', { value: 12.5, configurable: true })
      fireEvent.loadedMetadata(v)
      fireEvent.play(v)
      fireEvent.timeUpdate(v, { target: { currentTime: 3 } })
      expect(seam.duration).toBe(12.5)
      expect(seam.playing).toBe(true)
      expect(seam.current).toBe(3)
    } finally {
      restore()
    }
  })

  it('the bar scrubs THROUGH the handle (seek + optimistic playhead) and toggles', () => {
    const seam = createFilmSeam()
    const seekTo = vi.fn()
    const toggle = vi.fn()
    seam.bind({ seekTo, toggle, current: () => 0, duration: () => 10, play: () => {}, pause: () => {} })
    seam.report({ duration: 10, current: 1 })
    render(h(FilmSeamBar, { seam }))
    const track = screen.getByTestId('film-seam-bar').querySelector('[data-testid="timeline-scrub-track"]') as HTMLElement
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 100, bottom: 18, width: 100, height: 18, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.pointerDown(track, { clientX: 80, pointerId: 1 })
    expect(seekTo).toHaveBeenCalledWith(8)
    expect(seam.current).toBe(8) // the optimistic playhead
    fireEvent.click(screen.getByTestId('timeline-scrub-toggle'))
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('report() re-renders the mounted bar (the subscription law)', () => {
    const seam = createFilmSeam()
    seam.bind({ seekTo: vi.fn(), toggle: vi.fn(), current: () => 0, duration: () => 8, play: () => {}, pause: () => {} })
    seam.report({ duration: 8, current: 2 })
    render(h(FilmSeamBar, { seam }))
    const readout = screen.getByTestId('timeline-scrub-readout')
    expect(readout.textContent).toBe('2.0s / 8.0s')
    act(() => { seam.report({ current: 6 }) })
    expect(screen.getByTestId('timeline-scrub-readout').textContent).toBe('6.0s / 8.0s')
  })

  it('a seam.duration of 0 falls back to the handle duration; fps rides when > 0', () => {
    const seam = createFilmSeam(24)
    seam.bind({ seekTo: vi.fn(), toggle: vi.fn(), current: () => 0, duration: () => 7, play: () => {}, pause: () => {} })
    render(h(FilmSeamBar, { seam }))
    expect(screen.getByTestId('timeline-scrub-readout').textContent).toBe('0.0s / 7.0s · frame 0/168')
  })

  it('a null handle renders inert (unmount unwires; no crash on scrub)', () => {
    const seam: FilmSeam = createFilmSeam()
    render(h(FilmSeamBar, { seam }))
    const track = screen.getByTestId('film-seam-bar').querySelector('[data-testid="timeline-scrub-track"]') as HTMLElement
    Object.defineProperty(track, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 100, bottom: 18, width: 100, height: 18, x: 0, y: 0, toJSON: () => ({}) }),
      configurable: true,
    })
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 }) // duration 0 — inert arm
    fireEvent.click(screen.getByTestId('timeline-scrub-toggle')) // handle?.toggle — no throw
    // the player unmounting binds null — the bar never crashes after
    act(() => { seam.bind(null) })
    expect(screen.getByTestId('timeline-scrub-readout').textContent).toBe('0.0s / 0.0s')
  })
})
