/**
 * embed-geometry-tick — THE ZOOM LANDS WHERE THE CARD IS (2026-08-22).
 *
 * Operator verdict, verbatim: "when we zoom out — the animation for the
 * drilldown -> normal view plays — the zoom out lands in the wrong spot,
 * instead of the spot of the card." Root cause: in the DSH chat embed the
 * toolview PROMOTES the whole iframe to fixed/100vw×100vh while the zoom
 * overlay is open (dsh/melite-card-view/src/client/zoomPromotion.ts). That
 * resize reflows every tile WITHOUT a React render; framer-motion only
 * re-measures shared-element projections on render, so the close morph
 * targeted the PRE-promotion tile rect.
 *
 * The fix is useEmbedGeometryTick: bump state on viewport geometry change →
 * the embed re-renders down to the tiles (no memo barriers) → framer
 * re-measures → the morph always targets the live rect. Pinned here:
 *   1. a ResizeObserver entry on <html> bumps the tick,
 *   2. a window resize bumps the tick,
 *   3. AgentCardsEmbed carries the tick on [data-geometry-tick] so the
 *      wiring itself cannot silently detach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { render } from "@testing-library/react"

type ROCallback = (entries: unknown[], observer: unknown) => void

/** Capturing ResizeObserver fake — tests fire entries manually. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  callback: ROCallback
  observed: Element[] = []
  disconnected = false
  constructor(cb: ROCallback) {
    this.callback = cb
    FakeResizeObserver.instances.push(this)
  }
  observe(target: Element) { this.observed.push(target) }
  unobserve() {}
  disconnect() { this.disconnected = true }
  /** Test lever: simulate the observed box changing. */
  fire() { this.callback([], this) }
}

import { useEmbedGeometryTick } from "../surfaces/flow/useEmbedGeometryTick"
import { AgentCardsEmbed } from "../surfaces/flow/AgentCardsEmbed"

// The embed pulls its own lanes on mount (kinds + ui slots) — stub both so
// the wiring test renders bare (they are failure-logged loaders).
vi.mock("../surfaces/flow/pluginKinds", () => ({
  loadPluginKinds: vi.fn(async () => undefined),
}))
vi.mock("@/shell/pluginUi", () => ({
  loadPluginUi: vi.fn(async () => undefined),
}))
// The grid subtree is irrelevant to the tick contract — stub it out.
vi.mock("../surfaces/flow/InlineFlowCards", () => ({
  InlineFlowCards: () => <div data-stub-grid />,
}))

beforeEach(() => {
  FakeResizeObserver.instances = []
  vi.stubGlobal("ResizeObserver", FakeResizeObserver as unknown as typeof ResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useEmbedGeometryTick — the zoom morph always targets the live tile rect", () => {
  it("observes the document root and bumps on a resize entry (the fullscreen promotion)", () => {
    const { result } = renderHook(() => useEmbedGeometryTick())
    expect(result.current).toBe(0)
    // One observer, watching <html> — its box IS the embed's viewport.
    expect(FakeResizeObserver.instances.length).toBe(1)
    const ro = FakeResizeObserver.instances[0]
    expect(ro.observed).toContain(document.documentElement)
    // The promotion resizes the frame → an entry fires → the surface
    // re-renders (the tick bumps), which re-measures every projection.
    act(() => { ro.fire() })
    expect(result.current).toBe(1)
    act(() => { ro.fire() })
    expect(result.current).toBe(2)
  })

  it("bumps on window resize too (non-embed hosts)", () => {
    const { result } = renderHook(() => useEmbedGeometryTick())
    act(() => { window.dispatchEvent(new Event("resize")) })
    expect(result.current).toBe(1)
  })

  it("disconnects the observer on unmount (no leaks across embed swaps)", () => {
    const { unmount } = renderHook(() => useEmbedGeometryTick())
    const ro = FakeResizeObserver.instances[0]
    unmount()
    expect(ro.disconnected).toBe(true)
  })
})

describe("AgentCardsEmbed — the tick is wired into the surface", () => {
  it("carries the live tick on [data-geometry-tick] and bumps when the viewport resizes", async () => {
    const { container } = render(<AgentCardsEmbed draftId="p_tick" />)
    const root = container.querySelector("[data-agent-cards-embed]") as HTMLElement
    expect(root, "the embed mounts").toBeTruthy()
    expect(root.getAttribute("data-geometry-tick")).toBe("0")
    // The promotion resizes the frame → tick bumps → re-render reaches the
    // grid (the data attribute proves the commit happened).
    await act(async () => { FakeResizeObserver.instances[0].fire() })
    expect(root.getAttribute("data-geometry-tick")).toBe("1")
  })
})
