// Regression test for AssetPreviewDialog's zoom/pan clamp.
//
// Bug (2026-08-08): clicking an image in the left Media drawer opens the
// lightbox; zooming in and scrolling/panning was UNBOUNDED — the user could
// scroll the image off-screen into empty space ("infinite scroll above the
// image"). The fix bounds the pan to half the scaled image's overflow past
// the container on each axis.
//
// We mock the layout dims (container 500×500, image base 1000×1000) so the
// clamp math is deterministic, then fire a wheel event with an absurd
// deltaY and assert the resulting transform translate is the clamped edge,
// not a runaway value.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, cleanup, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { AssetPreviewDialog } from "../surfaces/assets/AssetPreviewDialog"
import type { MediaAsset } from "../surfaces/library/media"

// listMedia() runs on mount — stub it so no network.
vi.mock("../surfaces/library/media", async (orig) => ({
  ...(await orig<typeof import("../surfaces/library/media")>()),
  listMedia: () => Promise.resolve([]),
}))
// readWorkflowFromPng is invoked for the copy-workflow button — stub null.
vi.mock("@melite/formats", () => ({ readWorkflowFromPng: (): null => null }))

const IMG_URL = "https://example.test/artifact.png"
const asset: MediaAsset = {
  id: "a1", name: "artifact.png", url: IMG_URL, type: "image",
  category: "image", size: 1024, createdAt: 1,
} as unknown as MediaAsset

/** Fake rect for the container (500×500 at origin). */
const RECT = { width: 500, height: 500, left: 0, top: 0, right: 500, bottom: 500, x: 0, y: 0, toJSON() {} }
/** Base (pre-transform) image layout size. */
const IMG_W = 1000
const IMG_H = 1000

function setupLayout(container: HTMLElement, img: HTMLImageElement) {
  container.getBoundingClientRect = () => RECT as DOMRect
  Object.defineProperty(img, "offsetWidth", { configurable: true, value: IMG_W })
  Object.defineProperty(img, "offsetHeight", { configurable: true, value: IMG_H })
}

describe("AssetPreviewDialog pan clamp", () => {
  beforeEach(() => cleanup())

  it("clamps wheel-pan to the image bounds (no infinite scroll above the image)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement! // imgContainerRef
    setupLayout(zoomContainer, img)

    // Click the image at the container center → zoom to 2×, pan {0,0}.
    fireEvent.click(img, { clientX: 250, clientY: 250 })

    // At zoom 2: scaled image = 2000×2000, container = 500×500, so the
    // overflow is 1500 each axis → max pan = 750. An absurd deltaY of
    // 100000 MUST clamp to pan.y = 750 (translate = 750/2 = 375px), not
    // the unclamped 50000px the old code produced.
    fireEvent.wheel(zoomContainer, { deltaY: 100000 })

    const t = img.style.transform
    expect(t).toContain("scale(2)")
    // Clamped translate Y: -375px (= -750 pan / zoom 2), sign negative
    // because scrolling down moves the image up.
    expect(t).toContain("-375px")
    // The unbounded bug would have emitted -50000px here.
    expect(t).not.toContain("-50000px")
  })

  it("does not pan at all when not zoomed (zoom = 1)", () => {
    const { container: root } = renderWithTooltip(
      <AssetPreviewDialog asset={asset} onClose={() => {}} onSelect={() => {}} />,
    )
    const img = root.querySelector("img")!
    const zoomContainer = img.parentElement!
    setupLayout(zoomContainer, img)

    // No click → still at zoom 1. Wheel should be a no-op.
    fireEvent.wheel(zoomContainer, { deltaY: 100000 })
    const t = img.style.transform
    expect(t).toContain("scale(1)")
    // translate stays at 0 — no movement at all.
    expect(t).toMatch(/translate\(0px, 0px\)/)
  })
})
