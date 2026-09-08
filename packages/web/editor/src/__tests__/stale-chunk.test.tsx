import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  STALE_CHUNK_RELOAD_KEY,
  installStaleChunkReload,
  isChunkLoadError,
  reloadOnStaleChunk,
} from '../lib/staleChunk'
import { ErrorBoundary } from '../components/ErrorBoundary'

// The verbatim incident (2026-09-06, the DSH card view):
const INCIDENT =
  'Failed to fetch dynamically imported module: https://cloud.tailb1e597.ts.net:3909/editor/assets/component-C-Rg1sKu.js'

function ChunkBomb(): ReactNode {
  throw new TypeError(INCIDENT)
}

describe('stale-chunk self-heal (lib/staleChunk.ts)', () => {
  let reloadSpy: ReturnType<typeof vi.fn>
  const origLoc = Object.getOwnPropertyDescriptor(window, 'location')

  beforeEach(() => {
    window.sessionStorage.clear()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      configurable: true,
      writable: true,
    })
  })
  afterEach(() => {
    if (origLoc) Object.defineProperty(window, 'location', origLoc)
    window.sessionStorage.clear()
  })

  describe('isChunkLoadError — the message table', () => {
    it('matches the verbatim incident message', () => {
      expect(isChunkLoadError(new TypeError(INCIDENT))).toBe(true)
    })
    it('matches the cross-browser + vite preload variants', () => {
      expect(
        isChunkLoadError(new TypeError('Importing a module script failed: https://x/editor/assets/component-1.js')),
      ).toBe(true)
      expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true)
      expect(isChunkLoadError(new Error('Unable to preload CSS for ./assets/index-abc.css'))).toBe(true)
      expect(isChunkLoadError(new Error('Unable to preload dependency https://x/editor/assets/utils-abc.js'))).toBe(true)
    })
    it('rejects non-chunk errors — a real bug must crash visibly', () => {
      expect(isChunkLoadError(new Error('kaboom in render'))).toBe(false)
      expect(isChunkLoadError(null)).toBe(false)
      expect(isChunkLoadError({ nope: 1 })).toBe(false)
      expect(isChunkLoadError('')).toBe(false)
    })
  })

  describe('reloadOnStaleChunk — one guarded reload', () => {
    it('reloads once on a stale chunk and stamps the guard', () => {
      expect(reloadOnStaleChunk(new TypeError(INCIDENT))).toBe(true)
      expect(reloadSpy).toHaveBeenCalledOnce()
      expect(window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).toBeTruthy()
    })
    it('refuses a second reload inside the guard window (no storm on a torn dist)', () => {
      reloadOnStaleChunk(new TypeError(INCIDENT))
      expect(reloadOnStaleChunk(new TypeError(INCIDENT))).toBe(false)
      expect(reloadSpy).toHaveBeenCalledOnce()
    })
    it('reloads again once the guard window has passed', () => {
      window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now() - 60_000))
      expect(reloadOnStaleChunk(new TypeError(INCIDENT))).toBe(true)
      expect(reloadSpy).toHaveBeenCalledOnce()
    })
    it('never reloads for a non-chunk error', () => {
      expect(reloadOnStaleChunk(new Error('kaboom in render'))).toBe(false)
      expect(reloadSpy).not.toHaveBeenCalled()
    })
  })

  describe('installStaleChunkReload — the vite:preloadError net', () => {
    it('reloads on the vite preload-failure event', () => {
      installStaleChunkReload()
      window.dispatchEvent(new CustomEvent('vite:preloadError'))
      expect(reloadSpy).toHaveBeenCalledOnce()
    })
    it('is loop-guarded too', () => {
      installStaleChunkReload()
      window.dispatchEvent(new CustomEvent('vite:preloadError'))
      window.dispatchEvent(new CustomEvent('vite:preloadError'))
      expect(reloadSpy).toHaveBeenCalledOnce()
    })
  })

  describe('ErrorBoundary integration — the lazy-route net', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('auto-reloads when a child throws the stale-chunk error', () => {
      render(
        <ErrorBoundary>
          <ChunkBomb />
        </ErrorBoundary>,
      )
      expect(reloadSpy).toHaveBeenCalledOnce()
    })
    it('shows the crash fallback (no reload) when the guard blocks', () => {
      window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()))
      render(
        <ErrorBoundary>
          <ChunkBomb />
        </ErrorBoundary>,
      )
      expect(reloadSpy).not.toHaveBeenCalled()
      expect(screen.getByText('Something crashed')).toBeTruthy()
    })
    it('does not reload for ordinary render errors', () => {
      function Bomb(): ReactNode {
        throw new Error('kaboom in render')
      }
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      )
      expect(reloadSpy).not.toHaveBeenCalled()
      expect(screen.getByText('Something crashed')).toBeTruthy()
    })
  })
})
