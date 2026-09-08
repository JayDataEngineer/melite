/**
 * E3.9 — useHoverScrub hook unit tests.
 *
 * The hook is the meat of the hover-scrub UX. Verifies:
 *   - setVideoEl binds and reports ready after metadata loads.
 *   - onMouseMove seeks the bound video to the proportional time.
 *   - requestVideoFrameCallback is invoked when available (the spec
 *     calls this out explicitly).
 *   - Falls back to immediate scrubTime publish when rVFC is unavailable.
 *   - onMouseLeave resets scrubTime to null.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useHoverScrub, formatScrubTime } from '@melite/ui'

function makeRect(left: number, width: number) {
  return { left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => {} }
}

function defineProps(el: HTMLVideoElement, props: Record<string, unknown>) {
  for (const [k, value] of Object.entries(props)) {
    Object.defineProperty(el, k, { configurable: true, writable: true, value })
  }
}

function makeVideo(overrides: Record<string, unknown> = {}): HTMLVideoElement {
  const v = document.createElement('video')
  defineProps(v, {
    duration: 10,
    readyState: 1,
    currentTime: 0,
    addEventListener: vi.fn((_t: string, cb: () => void) => {
      cb()
      return 0
    }),
    ...overrides,
  })
  return v
}

afterEach(() => cleanup())

describe('useHoverScrub (E3.9)', () => {
  it('publishes scrubTime immediately when rVFC unavailable', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo()
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(0, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 50 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(v.currentTime).toBe(5)
    expect(result.current.scrubTime).toBe(5)
  })

  it('uses requestVideoFrameCallback when available', () => {
    const rVFC = vi.fn((cb: () => void) => { cb(); return 1 })
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo({
      requestVideoFrameCallback: rVFC as unknown as HTMLVideoElement['requestVideoFrameCallback'],
    })
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(0, 200) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 100 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(rVFC).toHaveBeenCalledTimes(1)
    expect(v.currentTime).toBe(5)
    expect(result.current.scrubTime).toBe(5)
  })

  it('clamps cursor to right edge', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo({ duration: 20 })
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(0, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 500 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(v.currentTime).toBe(20)
  })

  it('clamps cursor to left edge (0)', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo({ duration: 10 })
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(50, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 0 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(v.currentTime).toBe(0)
  })

  it('no-ops when no video bound', () => {
    const { result } = renderHook(() => useHoverScrub())
    const target = { getBoundingClientRect: () => makeRect(0, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 50 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(result.current.scrubTime).toBeNull()
  })

  it('no-ops when video has no finite duration', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo({ duration: NaN })
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(0, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 50 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(result.current.scrubTime).toBeNull()
  })

  it('onMouseLeave resets scrubTime to null', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo()
    act(() => result.current.setVideoEl(v))
    const target = { getBoundingClientRect: () => makeRect(0, 100) } as unknown as HTMLDivElement
    act(() => {
      result.current.onMouseMove({ currentTarget: target, clientX: 50 } as unknown as React.MouseEvent<HTMLDivElement>)
    })
    expect(result.current.scrubTime).toBe(5)
    act(() => result.current.onMouseLeave())
    expect(result.current.scrubTime).toBeNull()
  })

  it('marks ready after loadedmetadata fires', () => {
    const { result } = renderHook(() => useHoverScrub())
    expect(result.current.ready).toBe(false)
    const v = makeVideo({ readyState: 0 })
    act(() => result.current.setVideoEl(v))
    // Our makeVideo stub fires the loadedmetadata callback synchronously
    // from addEventListener, so ready should be true now.
    expect(result.current.ready).toBe(true)
  })

  it('marks ready immediately if readyState >= 1', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo({ readyState: 1 })
    act(() => result.current.setVideoEl(v))
    expect(result.current.ready).toBe(true)
  })

  it('handles unbind cleanly', () => {
    const { result } = renderHook(() => useHoverScrub())
    const v = makeVideo()
    act(() => result.current.setVideoEl(v))
    expect(result.current.ready).toBe(true)
    act(() => result.current.setVideoEl(null))
    expect(result.current.ready).toBe(false)
  })
})

describe('formatScrubTime (E3.9)', () => {
  it('formats seconds as M:SS.d', () => {
    expect(formatScrubTime(0)).toBe('0:00.0')
    expect(formatScrubTime(5.4)).toBe('0:05.4')
    expect(formatScrubTime(65.2)).toBe('1:05.2')
  })

  it('returns empty string for null/non-finite', () => {
    expect(formatScrubTime(null)).toBe('')
    expect(formatScrubTime(NaN)).toBe('')
  })
})
