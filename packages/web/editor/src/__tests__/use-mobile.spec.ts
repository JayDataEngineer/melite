/**
 * Unit tests for hooks/use-mobile.ts — the `useIsMobile()` breakpoint hook
 * backing the sidebar collapse / drawer-layout decision.
 *
 * Zero direct coverage previously. The hook reads `window.matchMedia` and
 * `window.innerWidth` on mount and subscribes to `(max-width: 767px)` changes;
 * the global setup.ts mock returns a no-op MediaQueryList, so we drive the
 * hook by varying `window.innerWidth` (the same path the production code takes
 * when the listener fires) and by replacing `matchMedia` per-test where we
 * need to simulate a responsive change.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "@melite/ui"

describe("useIsMobile — initial render", () => {
  it("returns a boolean (never undefined) even on first render", () => {
    const { result } = renderHook(() => useIsMobile())
    expect(typeof result.current).toBe("boolean")
  })

  it("returns false when window.innerWidth >= 768 (desktop breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true when window.innerWidth < 768 (mobile breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("treats exactly 768 as desktop (the breakpoint is exclusive on the mobile side)", () => {
    Object.defineProperty(window, "innerWidth", { value: 768, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("treats 767 as mobile (just below the breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", { value: 767, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})

describe("useIsMobile — MediaQueryList subscription", () => {
  let listeners: Set<() => void>
  let mql: { matches: boolean; addEventListener: (t: string, fn: () => void) => void; removeEventListener: (t: string, fn: () => void) => void }

  beforeEach(() => {
    listeners = new Set()
    mql = {
      matches: false,
      addEventListener: (_type: string, fn: () => void) => { listeners.add(fn) },
      removeEventListener: (_type: string, fn: () => void) => { listeners.delete(fn) },
    }
    // Override the global matchMedia mock from setup.ts with a controllable one.
    Object.defineProperty(globalThis, "matchMedia", {
      value: (_q: string) => mql,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("subscribes to matchMedia 'change' on mount and unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile())
    expect(listeners.size).toBe(1)
    unmount()
    expect(listeners.size).toBe(0)
  })

  it("re-evaluates innerWidth when the 'change' listener fires", () => {
    Object.defineProperty(window, "innerWidth", { value: 1200, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    // Simulate a resize below the breakpoint + listener dispatch.
    Object.defineProperty(window, "innerWidth", { value: 500, writable: true, configurable: true })
    act(() => { for (const fn of listeners) fn() })
    expect(result.current).toBe(true)
  })

  it("stays false when the listener fires but innerWidth is still desktop", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, writable: true, configurable: true })
    const { result } = renderHook(() => useIsMobile())
    act(() => { for (const fn of listeners) fn() })
    expect(result.current).toBe(false)
  })
})
