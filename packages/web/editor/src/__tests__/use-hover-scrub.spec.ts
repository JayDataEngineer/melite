/**
 * Unit tests for lib/use-hover-scrub.ts — the hover-scrub hook for the
 * storyboard inline mini-player (YouTube-style seek-preview on thumbnail
 * hover).
 *
 * Coverage:
 *   - setVideoEl: null → ready=false, readyState>=1 → ready=true immediately,
 *     readyState=0 → ready on loadedmetadata event.
 *   - onMouseMove: no video → no-op, no duration → no-op, clamps x to
 *     [0, rect.width], seeks to proportional time, requestVideoFrameCallback
 *     deferred update, currentTime setter throws → silent return.
 *   - onMouseLeave: resets scrubTime to null.
 *   - formatScrubTime: null/NaN/Infinity → "", M:SS.d format for valid times.
 *
 * Zero prior coverage. A missing duration guard or clamp would seek to
 * negative/Infinity time; a missing readyState guard would seek before
 * metadata loads.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useHoverScrub, formatScrubTime } from "@melite/ui"

// ── formatScrubTime (pure) ──────────────────────────────────────────────────
describe("use-hover-scrub — formatScrubTime", () => {
  it("returns '' for null", () => {
    expect(formatScrubTime(null)).toBe("")
  })
  it("returns '' for NaN", () => {
    expect(formatScrubTime(NaN)).toBe("")
  })
  it("returns '' for Infinity", () => {
    expect(formatScrubTime(Infinity)).toBe("")
  })
  it("formats 0 as '0:00.0'", () => {
    expect(formatScrubTime(0)).toBe("0:00.0")
  })
  it("formats 65.5 as '1:05.5'", () => {
    expect(formatScrubTime(65.5)).toBe("1:05.5")
  })
  it("formats 125.7 as '2:05.7'", () => {
    expect(formatScrubTime(125.7)).toBe("2:05.7")
  })
  it("formats 5.56 as '0:05.6' (rounded to 1 decimal)", () => {
    expect(formatScrubTime(5.56)).toBe("0:05.6")
  })
  it("formats 3599.9 as '59:59.9'", () => {
    expect(formatScrubTime(3599.9)).toBe("59:59.9")
  })
})

// ── useHoverScrub hook ──────────────────────────────────────────────────────
describe("use-hover-scrub — setVideoEl", () => {
  it("initializes with ready=false and scrubTime=null", () => {
    const { result } = renderHook(() => useHoverScrub())
    expect(result.current.ready).toBe(false)
    expect(result.current.scrubTime).toBeNull()
  })
  it("setVideoEl(null) keeps ready=false", () => {
    const { result } = renderHook(() => useHoverScrub())
    act(() => result.current.setVideoEl(null))
    expect(result.current.ready).toBe(false)
  })
  it("setVideoEl with readyState >= 1 → ready=true immediately", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = document.createElement("video")
    Object.defineProperty(video, "readyState", { value: 2, configurable: true })
    act(() => result.current.setVideoEl(video))
    expect(result.current.ready).toBe(true)
  })
  it("setVideoEl with readyState 0 → ready=false, then true on loadedmetadata", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = document.createElement("video")
    Object.defineProperty(video, "readyState", { value: 0, configurable: true })
    act(() => result.current.setVideoEl(video))
    expect(result.current.ready).toBe(false)
    // Simulate loadedmetadata event.
    act(() => video.dispatchEvent(new Event("loadedmetadata")))
    expect(result.current.ready).toBe(true)
  })
  it("setVideoEl(null) after a ready video → ready resets to false", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = document.createElement("video")
    Object.defineProperty(video, "readyState", { value: 2, configurable: true })
    act(() => result.current.setVideoEl(video))
    expect(result.current.ready).toBe(true)
    act(() => result.current.setVideoEl(null))
    expect(result.current.ready).toBe(false)
  })
})

describe("use-hover-scrub — onMouseMove", () => {
  function mkVideo(dur: number): HTMLVideoElement {
    const video = document.createElement("video")
    Object.defineProperty(video, "duration", { value: dur, configurable: true, writable: true })
    Object.defineProperty(video, "readyState", { value: 2, configurable: true })
    let _currentTime = 0
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      get: () => _currentTime,
      set: (v: number) => { _currentTime = v },
    })
    return video
  }
  function mkEvent(clientX: number, width = 200): { clientX: number; currentTarget: HTMLElement } {
    const el = document.createElement("div")
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, width, height: 100, top: 0, right: width, bottom: 100, left: 0, toJSON: () => ({}),
    })
    return { clientX, currentTarget: el }
  }

  beforeEach(() => vi.clearAllMocks())

  it("does nothing when no video is bound", () => {
    const { result } = renderHook(() => useHoverScrub())
    act(() => result.current.onMouseMove(mkEvent(100) as never))
    expect(result.current.scrubTime).toBeNull()
  })
  it("does nothing when duration is 0", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(0)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100) as never))
    expect(result.current.scrubTime).toBeNull()
  })
  it("does nothing when duration is NaN", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(NaN)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100) as never))
    expect(result.current.scrubTime).toBeNull()
  })
  it("does nothing when duration is Infinity", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(Infinity)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100) as never))
    expect(result.current.scrubTime).toBeNull()
  })
  it("does nothing when rect.width <= 0", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(10)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100, 0) as never))
    expect(result.current.scrubTime).toBeNull()
  })
  it("seeks to proportional time at 50% of the element width", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(10)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100, 200) as never))
    // x=100, width=200 → 50% → t=5.0
    expect(result.current.scrubTime).toBeCloseTo(5, 1)
  })
  it("clamps x to [0, rect.width] (mouse beyond left edge)", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(10)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(-50, 200) as never))
    // x clamped to 0 → t=0
    expect(result.current.scrubTime).toBeCloseTo(0, 1)
  })
  it("clamps x to [0, rect.width] (mouse beyond right edge)", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(10)
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(300, 200) as never))
    // x clamped to 200 → t=10
    expect(result.current.scrubTime).toBeCloseTo(10, 1)
  })
  it("uses requestVideoFrameCallback when available (deferred scrubTime)", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = mkVideo(10)
    let rvcCb: (() => void) | null = null
    ;(video as unknown as { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback = (cb: () => void) => {
      rvcCb = cb
      return 1
    }
    act(() => result.current.setVideoEl(video))
    act(() => result.current.onMouseMove(mkEvent(100, 200) as never))
    // scrubTime is NOT set yet — the rVFC callback hasn't fired.
    expect(result.current.scrubTime).toBeNull()
    // Fire the rVFC callback.
    act(() => rvcCb!())
    expect(result.current.scrubTime).toBeCloseTo(5, 1)
  })
  it("returns silently when currentTime setter throws", () => {
    const { result } = renderHook(() => useHoverScrub())
    const video = document.createElement("video")
    Object.defineProperty(video, "duration", { value: 10, configurable: true })
    Object.defineProperty(video, "readyState", { value: 2, configurable: true })
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      get: () => 0,
      set: () => { throw new Error("not seekable") },
    })
    act(() => result.current.setVideoEl(video))
    // Should not throw.
    expect(() => act(() => result.current.onMouseMove(mkEvent(100, 200) as never))).not.toThrow()
    expect(result.current.scrubTime).toBeNull()
  })
})

describe("use-hover-scrub — onMouseLeave", () => {
  it("resets scrubTime to null", () => {
    const { result } = renderHook(() => useHoverScrub())
    // First set a scrubTime via onMouseMove.
    const video = document.createElement("video")
    Object.defineProperty(video, "duration", { value: 10, configurable: true })
    Object.defineProperty(video, "readyState", { value: 2, configurable: true })
    let _t = 0
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      get: () => _t,
      set: (v: number) => { _t = v },
    })
    act(() => result.current.setVideoEl(video))
    const el = document.createElement("div")
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, width: 200, height: 100, top: 0, right: 200, bottom: 100, left: 0, toJSON: () => ({}),
    })
    act(() => result.current.onMouseMove({ clientX: 100, currentTarget: el } as never))
    expect(result.current.scrubTime).not.toBeNull()
    // Now leave.
    act(() => result.current.onMouseLeave())
    expect(result.current.scrubTime).toBeNull()
  })
  it("onMouseLeave is safe when scrubTime is already null", () => {
    const { result } = renderHook(() => useHoverScrub())
    expect(() => act(() => result.current.onMouseLeave())).not.toThrow()
    expect(result.current.scrubTime).toBeNull()
  })
})
