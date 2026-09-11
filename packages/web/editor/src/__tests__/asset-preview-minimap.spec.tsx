// Tests for the AssetPreviewDialog magnifier + dimensions (2026-08-16):
//
//   b) a magnifying-glass button (bottom bar, right cluster) toggles a
//      minimap NAVIGATOR pinned bottom-right of the media area — click or
//      drag the thumbnail to center that part of the image; the outlined
//      rectangle is the live viewport.
//   c) the bottom bar shows the image's pixel dimensions
//      (naturalWidth × naturalHeight, captured on img load).
//
// The magnifier thumb is a fixed SQUARE (it must not stretch with the
// image's aspect — user 2026-08-16: "make the box for the magnifying glass
// square"); the image object-contains inside it, so wide/tall images get
// letterbox bars. These tests pin the letterbox-aware rect + pointer math.
//
// Layout is mocked like the sibling wheel/pan-clamp tests: zoom container
// 500×500 at the origin, main image base layout 1000×1000, navigator
// thumbnail 176×176 at the origin.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, cleanup, fireEvent } from "@testing-library/react"
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

const asset: MediaAsset = {
  id: "a1", name: "artifact.png", url: "https://example.test/artifact.png",
  type: "image", category: "image", size: 1024, createdAt: 1,
} as unknown as MediaAsset

const RECT = { width: 500, height: 500, left: 0, top: 0, right: 500, bottom: 500, x: 0, y: 0, toJSON() {} }
const NAV_RECT = { width: 176, height: 176, left: 0, top: 0, right: 176, bottom: 176, x: 0, y: 0, toJSON() {} }
const IMG_W = 1000, IMG_H = 1000

function setupLayout(
  root: HTMLElement,
  opts: { withNav?: boolean; imgW?: number; imgH?: number } = {},
) {
  const { withNav = false, imgW = IMG_W, imgH = IMG_H } = opts
  const img = root.querySelector("img")!
  const zoomContainer = img.parentElement!
  zoomContainer.getBoundingClientRect = () => RECT as DOMRect
  Object.defineProperty(img, "offsetWidth", { configurable: true, value: imgW })
  Object.defineProperty(img, "offsetHeight", { configurable: true, value: imgH })
  if (withNav) {
    const nav = root.querySelector("[data-asset-minimap] > div")!
    nav.getBoundingClientRect = () => NAV_RECT as DOMRect
  }
  return { img, zoomContainer }
}

/** Load the main image with pixel dimensions (jsdom fires no load itself). */
function loadDims(img: HTMLImageElement, w: number, h: number) {
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: w })
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: h })
  fireEvent.load(img)
}

function readTranslate(transform: string): { x: number; y: number } {
  const m = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  if (!m) throw new Error(`no translate in: ${transform}`)
  return { x: Number(m[1]), y: Number(m[2]) }
}

describe("AssetPreviewDialog magnifier + dimensions", () => {
  beforeEach(() => cleanup())

  /* ── (c) dimensions in the bottom bar ─────────────────────────────── */
  it("shows the image's pixel dimensions once the image loads", () => {
    const { container: root, getByText } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    expect(root.querySelector("[data-asset-dims]")).toBeNull()
    loadDims(img, 1024, 768)
    expect(getByText("1024 × 768")).toBeTruthy()
  })

  /* ── (b) the magnifier toggle ─────────────────────────────────────── */
  it("the magnifying-glass button toggles the navigator open/closed", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const toggle = root.querySelector("[data-asset-minimap-toggle]")!
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
    expect(root.querySelector("[data-asset-minimap]")).toBeNull()

    fireEvent.click(toggle)
    expect(root.querySelector("[data-asset-minimap]")).not.toBeNull()
    expect(toggle.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(toggle)
    expect(root.querySelector("[data-asset-minimap]")).toBeNull()
  })

  it("non-image assets get no magnifier button", () => {
    const video: MediaAsset = {
      id: "v1", name: "clip.mp4", url: "https://example.test/clip.mp4",
      type: "video", category: "video", size: 10, createdAt: 1,
    } as unknown as MediaAsset
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={video} onClose={() => {}} onSelect={() => {}} />,
    )
    expect(root.querySelector("[data-asset-minimap-toggle]")).toBeNull()
  })

  /* ── the live viewport rectangle ──────────────────────────────────── */
  it("the thumb is a fixed SQUARE and outlines the live viewport (zoom 2 → 25% box at 37.5%)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    fireEvent.click(root.querySelector("[data-asset-minimap-toggle]")!)
    const { img } = setupLayout(root, { withNav: true })
    loadDims(img, 1000, 1000)
    const nav = root.querySelector("[data-asset-minimap] > div")!

    // SQUARE regardless of the image's aspect — no aspectRatio style that
    // would stretch the box to a wide/tall image's shape.
    expect(nav.className).toContain("aspect-square")

    // Click the image center → zoom 2, pan (0,0): visible fraction
    // 500/2000 = 25%, centered at 0.5 → left/top 37.5%.
    fireEvent.click(img, { clientX: 250, clientY: 250 })
    const rect = root.querySelector("[data-asset-minimap-rect]") as HTMLElement
    expect(rect.style.left).toBe("37.5%")
    expect(rect.style.top).toBe("37.5%")
    expect(rect.style.width).toBe("25%")
    expect(rect.style.height).toBe("25%")
  })

  it("a WIDE image letterboxes in the square thumb — rect and pointer honor the bars", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    fireEvent.click(root.querySelector("[data-asset-minimap-toggle]")!)
    // Aspect 2:1 — the main image's LAYOUT must share the aspect for the
    // pan/clamp math to be consistent with the natural dims.
    const { img } = setupLayout(root, { withNav: true, imgW: 1000, imgH: 500 })
    loadDims(img, 2000, 1000)
    fireEvent.click(img, { clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(2)")

    // Square thumb 176×176; the 2:1 image shows 176×88 with 44px bars
    // top/bottom. Viewport: w = 500/2000 = 25% of image width, h =
    // 500/1000 = 50% of image height → in square percentages:
    // left/top 37.5%, width/height 25% (h: 0.5·88 = 44px of 176).
    const rect = root.querySelector("[data-asset-minimap-rect]") as HTMLElement
    expect(rect.style.left).toBe("37.5%")
    expect(rect.style.top).toBe("37.5%")
    expect(rect.style.width).toBe("25%")
    expect(rect.style.height).toBe("25%")

    // Pointer at image fraction (0.3, 0.3) — thumb px (0.3·176,
    // 44 + 0.3·88 = 70.4): q = ((0.3−0.5)·1000, (0.3−0.5)·500) = (−200,
    // −100) → pan (400, 200) → translate (200, 100). Interior for both
    // clamps (±750 / ±250), so this asserts the mapping, not the clamp.
    const nav = root.querySelector("[data-asset-minimap] > div")!
    fireEvent.pointerDown(nav, { clientX: 0.3 * 176, clientY: 44 + 0.3 * 88 })
    const tr = readTranslate(img.style.transform)
    expect(tr.x).toBeCloseTo(200, 0)
    expect(tr.y).toBeCloseTo(100, 0)

    // A press in the letterbox BAR clamps to the image edge on that axis
    // (fy → 0): pan.y clamps to maxY = (500·2−500)/2 = 250 → translate y
    // 125; x stays centered (fx = 0.5).
    fireEvent.pointerDown(nav, { clientX: 88, clientY: 5 })
    const tr2 = readTranslate(img.style.transform)
    expect(tr2.x).toBeCloseTo(0, 0)
    expect(tr2.y).toBeCloseTo(125, 0)
  })

  /* ── navigation: pointer on the thumbnail centers that image part ─── */
  it("pointer-down on the navigator centers that part of the image (and tracks the drag)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    fireEvent.click(root.querySelector("[data-asset-minimap-toggle]")!)
    const { img } = setupLayout(root, { withNav: true })
    loadDims(img, 1000, 1000)

    // Zoom 2× centered: click the main image at the container center.
    fireEvent.click(img, { clientX: 250, clientY: 250 })
    expect(img.style.transform).toContain("scale(2)")

    const nav = root.querySelector("[data-asset-minimap] > div")!
    // Press at 30% across the thumb → image point q=(0.3−0.5)·1000=−200
    // from center → pan = −q·z = 400 → translate(400/2) = 200px. Clamped
    // range at zoom 2 is ±750, so 400 is interior (asserts the math, not
    // the clamp).
    fireEvent.pointerDown(nav, { clientX: 0.3 * 176, clientY: 0.3 * 176 })
    let tr = readTranslate(img.style.transform)
    expect(tr.x).toBeCloseTo(200, 0)
    expect(tr.y).toBeCloseTo(200, 0)

    // While navigating the main image tracks 1:1 — NO transition lag.
    expect(img.style.transition).toBe("none")

    // The drag follows the pointer (window-level move).
    fireEvent.pointerMove(nav, { clientX: 0.8 * 176, clientY: 0.3 * 176 })
    tr = readTranslate(img.style.transform)
    expect(tr.x).toBeCloseTo(-300, 0)
    expect(tr.y).toBeCloseTo(200, 0)

    // Release → tracking ends, easing returns.
    fireEvent.pointerUp(window)
    expect(img.style.transition).toContain("transform")
  })

  it("the navigator rectangle follows the pan", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    fireEvent.click(root.querySelector("[data-asset-minimap-toggle]")!)
    const { img } = setupLayout(root, { withNav: true })
    loadDims(img, 1000, 1000)
    fireEvent.click(img, { clientX: 250, clientY: 250 })

    const nav = root.querySelector("[data-asset-minimap] > div")!
    // Center on the 30%/30% point → pan (400, 400) → center fraction
    // 0.5 − 400/2000 = 0.3 → left/top = 0.3 − 0.125 = 17.5%.
    fireEvent.pointerDown(nav, { clientX: 0.3 * 176, clientY: 0.3 * 176 })
    const rect = root.querySelector("[data-asset-minimap-rect]") as HTMLElement
    expect(rect.style.left).toBe("17.5%")
    expect(rect.style.top).toBe("17.5%")
  })
})
