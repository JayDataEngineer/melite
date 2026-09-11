// Hard regression tests for AssetPreviewDialog Ctrl+wheel zoom.
//
// BUG (2026-08-08): the lightbox had NO Ctrl+wheel zoom at all, and its wheel
// handler was a React `onWheel` — which React attaches as a PASSIVE listener
// at the root. preventDefault() inside a passive listener is a no-op, so the
// browser's native Ctrl+wheel PAGE ZOOM fired through the overlay and resized
// the entire app behind it ("the underlying stuff behind it"). Zoom also did
// not anchor to the cursor.
//
// FIX: a NATIVE, explicitly non-passive `addEventListener("wheel", fn,
// { passive: false })` on the image container. It:
// • Ctrl/Cmd+wheel (and Mac trackpad pinch, which also sets ctrlKey) →
// zooms toward the cursor via zoomToPoint (cursor pixel stays fixed).
// • plain wheel → pans, only while zoomed in.
// • calls preventDefault() on every handled gesture so the browser gesture
// is swallowed — even at the zoom clamp floor/ceiling.
//
// These tests make it impossible to regress: the structural non-passive
// listener guard fails if anyone reverts to React onWheel, and the
// behavior assertions pin the exact cursor-anchoring math.
//
// NOTE on the wheel() helper: jsdom's WheelEvent constructor silently DROPS
// MouseEventInit fields (ctrlKey, clientX, clientY) — only WheelEventInit
// (deltaY/deltaMode) survives — so we must Object.defineProperty the mouse
// fields onto the instance, or the ctrl branch would never fire. Dispatch is
// wrapped in act() so the setState it triggers is flushed before assertions.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup, fireEvent, act } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { AssetPreviewDialog } from "../surfaces/assets/AssetPreviewDialog"
import type { MediaAsset } from "../surfaces/library/media"

vi.mock("../surfaces/library/media", async (orig) => ({
  ...(await orig<typeof import("../surfaces/library/media")>()),
  listMedia: () => Promise.resolve([]),
}))
vi.mock("@melite/formats", () => ({ readWorkflowFromPng: (): null => null }))

const IMG_URL = "https://example.test/artifact.png"
const asset: MediaAsset = {
  id: "a1", name: "artifact.png", url: IMG_URL, type: "image",
  category: "image", size: 1024, createdAt: 1,
} as unknown as MediaAsset

/** Container 500×500 at origin; image base layout 1000×1000. */
const RECT = { width: 500, height: 500, left: 0, top: 0, right: 500, bottom: 500, x: 0, y: 0, toJSON() {} }
const IMG_W = 1000, IMG_H = 1000

function setupLayout(container: HTMLElement, img: HTMLImageElement) {
  container.getBoundingClientRect = () => RECT as DOMRect
  Object.defineProperty(img, "offsetWidth", { configurable: true, value: IMG_W })
  Object.defineProperty(img, "offsetHeight", { configurable: true, value: IMG_H })
    }
    
/** Parse `translate(Xpx, Ypx)` out of a transform string. */
function readTranslate(transform: string): { x: number; y: number } {
  const m = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  if (!m) throw new Error(`no translate in: ${transform}`)
  return { x: Number(m[1]), y: Number(m[2]) }
    }
    
interface WheelInit { deltaY?: number; deltaX?: number; ctrlKey?: boolean; clientX?: number; clientY?: number }

/** Build & dispatch a realistic WheelEvent, returning it for defaultPrevented. */
function wheel(el: HTMLElement, init: WheelInit): WheelEvent {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: init.deltaY ?? 0 })
  // jsdom drops these MouseEventInit fields from the ctor — define them.
  Object.defineProperty(ev, "ctrlKey", { configurable: true, value: !!init.ctrlKey })
  Object.defineProperty(ev, "clientX", { configurable: true, value: init.clientX ?? 0 })
  Object.defineProperty(ev, "clientY", { configurable: true, value: init.clientY ?? 0 })
  Object.defineProperty(ev, "deltaX", { configurable: true, value: init.deltaX ?? 0 })
  act(() => { el.dispatchEvent(ev) })
  return ev
    }
    
describe("AssetPreviewDialog Ctrl+wheel zoom", () => {
  beforeEach(() => cleanup())
  afterEach(() => vi.restoreAllMocks())
  
  /* ── STRUCTURAL GUARD ────────────────────────────────────────────── */
  it("registers a NATIVE, NON-PASSIVE wheel listener (not React's passive onWheel)", () => {
    // This is the core fix. React's onWheel is passive at the root, so
    // preventDefault() is a no-op and the browser's Ctrl+wheel page-zoom
    // blows through the overlay. Only a native { passive: false } listener
    // can truly swallow it. If anyone reverts to onWheel, this fails.
    const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener")
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    setupLayout(img.parentElement!, img)
    
    const wheelCalls = addSpy.mock.calls.filter(([type]) => type === "wheel")
    const nonPassive = wheelCalls.filter((c) => (c[2] as AddEventListenerOptions | undefined)?.passive === false)
    expect(nonPassive.length).toBeGreaterThanOrEqual(1)
})

  /* ── FEATURE: Ctrl+wheel zooms toward the cursor ─────────────────── */
  it("Ctrl+wheel UP zooms in and anchors to the cursor (cursor pixel stays fixed)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)

    // Ctrl+wheel up (deltaY<0) at cursor (350, 300):
    // factor 1.2 → zoom 1.2. Cursor offset from center = (100, 50).
    // The image point under the cursor is q=(100, 50); keeping it pinned
    // needs pan = off − q·z = (100−120, 50−60) = (−20, −10), i.e.
    // translate(−20/1.2, −10/1.2) = (−16.667, −8.333).
    //
    // 2026-08-16 FIX: the old code set pan = −cursorOffset = (−100, −50),
    // which moves the cursor's pixel toward the image center on every
    // notch (it's only correct at exactly z=2) — the wheel zoom "drifted"
    // and felt odd. These are the TRUE fixed-anchor numbers.
    const ev = wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 350, clientY: 300 })
    const t = img.style.transform
    expect(t).toContain("scale(1.2)")
    const tr = readTranslate(t)
    expect(tr.x).toBeCloseTo(-16.667, 1)
    expect(tr.y).toBeCloseTo(-8.333, 1)
    // The browser's page-zoom MUST be swallowed.
    expect(ev.defaultPrevented).toBe(true)
})

  it("repeated notches accumulate while the anchor pixel STAYS under the cursor", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)

    // Two notches at the same cursor (350, 300): zoom 1→1.44, and the
    // pinned q=(100, 50) needs pan = off − q·1.44 = (−44, −22) →
    // translate(−44/1.44, −22/1.44) = (−30.556, −15.278). If the anchor
    // math regresses to the old pan=−off form, the second notch jumps
    // the image toward its center instead of staying put.
    wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 350, clientY: 300 })
    wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 350, clientY: 300 })
    const t = img.style.transform
    expect(t).toContain("scale(1.44)")
    const tr = readTranslate(t)
    expect(tr.x).toBeCloseTo(-30.556, 1)
    expect(tr.y).toBeCloseTo(-15.278, 1)
})

  it("zoom NEVER relayouts the image — the fit constraints stay on at every zoom", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)

    // 2026-08-16 FIX: the img used to swap maxWidth/maxHeight to "none"
    // the moment zoom left 1 — an INSTANT relayout from fitted size to
    // natural size on the first wheel notch, fighting the transform
    // transition (a giant lurch, then easing: "janky"). The constraints
    // must stay constant so ONLY the transform changes.
    expect(img.style.maxWidth).toBe("90vw")
    wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 250, clientY: 250 })
    expect(img.style.maxWidth).toBe("90vw")
    expect(img.style.maxHeight).toBe("80vh")
    expect(img.style.transform).toContain("scale(1.2)")
})

  it("is SMOOTH: retargets ease, but a drag tracks 1:1 (transition none)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)

    // Idle: zoom/pan retargets ease (the 150ms class transition applied
    // to drags too — the image lagged the cursor; now drags disable it).
    expect(img.style.transition).toContain("transform")
    // Click center → zoomed 2× (still eased when not dragging).
    fireEvent.click(img, { clientX: 250, clientY: 250 })
    expect(img.style.transition).toContain("transform")
    // A drag MUST kill the transition — the pan tracks the cursor exactly.
    fireEvent.mouseDown(img, { clientX: 250, clientY: 250 })
    expect(img.style.transition).toBe("none")
    fireEvent.mouseUp(img)
    expect(img.style.transition).toContain("transform")
})

  it("Ctrl+wheel DOWN zooms out", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    // Zoom in first via Ctrl+wheel up at center → 1.2.
    wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(1.2)")
    
    // Ctrl+wheel down → back to 1.0.
    wheel(zoomContainer, { deltaY: 100, ctrlKey: true, clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(1)")
    expect(img.style.transform).toMatch(/translate\(0px, 0px\)/)
})

  /* ── CLAMP + GESTURE SWALLOW AT THE BOUNDS ───────────────────────── */
  it("Ctrl+wheel clamps at ZOOM_MAX and STILL swallows the browser gesture", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    // Hammer Ctrl+wheel up well past the 5× ceiling.
    let ev: WheelEvent = new WheelEvent("wheel")
    for (let i = 0; i < 20; i++) {
      ev = wheel(zoomContainer, { deltaY: -100, ctrlKey: true, clientX: 250, clientY: 250 })
    }
    expect(img.style.transform).toContain("scale(5)")
    // Never exceeds the ceiling (no scale(5.15), etc.).
    expect(img.style.transform).not.toMatch(/scale\(5\.\d/)
    // Even though zoom is already maxed, the browser page-zoom is still killed.
    expect(ev.defaultPrevented).toBe(true)
})

  it("Ctrl+wheel at the ZOOM_MIN floor does not move and STILL swallows the gesture", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    // Already at zoom 1 → Ctrl+wheel down can't go lower.
    const ev = wheel(zoomContainer, { deltaY: 100, ctrlKey: true, clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(1)")
    expect(img.style.transform).toMatch(/translate\(0px, 0px\)/)
    // CRITICAL: page-zoom is blocked even when zoom doesn't change —
    // otherwise the underlying app would resize at the floor.
    expect(ev.defaultPrevented).toBe(true)
})

  /* ── PLAIN WHEEL CONTRACT ────────────────────────────────────────── */
  it("plain wheel (no Ctrl) does NOT zoom at zoom 1 and does not swallow the event", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    const ev = wheel(zoomContainer, { deltaY: -100, clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(1)")
    // No ctrl → not a zoom gesture; we don't claim it.
    expect(ev.defaultPrevented).toBe(false)
})

  it("plain wheel still PANS when already zoomed in (regression: pan path moved to native listener)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    // Zoom to 2× via click at center → pan (0,0).
    fireEvent.click(img, { clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(2)")
    
    // Plain wheel down → pan clamped to the bottom edge.
    // At zoom 2: scaled 2000×2000, container 500×500 → max pan 750 per axis.
    // deltaY 100000 clamps to pan.y = -750 → translate -750/2 = -375px.
    const ev = wheel(zoomContainer, { deltaY: 100000 })
    const t = img.style.transform
    expect(t).toContain("scale(2)")
    expect(t).toContain("-375px")
    expect(t).not.toContain("-50000px")
    expect(ev.defaultPrevented).toBe(true)
})

  /* ── CLICK-TO-ZOOM ANCHORS TO THE CLICK POINT ────────────────────── */
  it("click-to-zoom anchors to the clicked pixel (not the center)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)
    
    // Click at (300, 300): offset from center = (50, 50). zoomToPoint(2, …)
    // sets pan (-50, -50) → translate (-25, -25) at zoom 2.
    fireEvent.click(img, { clientX: 300, clientY: 300 })
    const t = img.style.transform
    expect(t).toContain("scale(2)")
    const tr = readTranslate(t)
    expect(tr.x).toBeCloseTo(-25, 0)
    expect(tr.y).toBeCloseTo(-25, 0)
})
})
