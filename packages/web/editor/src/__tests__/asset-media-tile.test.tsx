/**
 * Regression tests for AssetMedia tile mode (src/surfaces/assets/AssetMedia.tsx).
 *
 * THE BUG (2026-08-12): mesh + motion tiles rendered the run's `thumbnail`
 * (its first IMAGE artifact) as the poster. For a Trellis (image→mesh) run,
 * that thumbnail is the INPUT image — so the mesh tile showed the source
 * picture instead of the generated 3D object. "Completely wrong."
 *
 * The fix: mesh tiles render <MeshPoster> (the actual GLB), motion tiles
 * render <MotionPoster> (the actual NPZ) — NEVER the run's thumbnail and
 * NEVER a bare glyph.
 *
 * These tests lock in:
 *   • Mesh asset WITH a thumbnail → MeshPoster, NOT an <img src=thumbnail>.
 *   • Motion asset WITH a thumbnail → MotionPoster, NOT an <img src=thumbnail>.
 *   • Image asset → its own <img> (passthrough).
 *   • The run's thumbnail is never shown for mesh/motion.
 *
 * Child viewers are mocked to identifiable stubs so we can assert WHICH
 * renderer is chosen at the DOM level.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { MediaAsset } from "../surfaces/library/media"

// The viewers now live in their owning plugins (the viewer seam,
// 2026-08-21) — mock the TENANT SURFACE, exactly as the boundary gate
// prescribes ("tests re-point their vi.mocks at the tenant surface").
// Each stub renders a data-testid so the test can assert which path
// the kernel's kind fold + the claim components chose.
vi.mock("@melite-plugin/3d/ui/viewers", () => ({
  MeshPoster: ({ url }: { url: string }) => (
    <div data-testid="mesh-poster" data-url={url} />
  ),
  AnimatedGLBViewer: ({ glbUrl }: { glbUrl?: string }) => (
    <div data-testid="animated-glb" data-url={glbUrl} />
  ),
}))
vi.mock("@melite-plugin/motion/ui/viewers", () => ({
  MotionPoster: ({ url }: { url: string }) => (
    <div data-testid="motion-poster" data-url={url} />
  ),
  MotionViewer: ({ url }: { url: string }) => (
    <div data-testid="motion-viewer" data-url={url} />
  ),
}))
vi.mock("@melite-plugin/video/ui/viewers", () => ({
  VideoPlayer: ({ src }: { src: string }) => (
    <div data-testid="video-player" data-src={src} />
  ),
}))
vi.mock("@melite-plugin/audio/ui/viewers", () => ({
  AudioPlayer: ({ src }: { src: string }) => (
    <div data-testid="audio-player" data-src={src} />
  ),
  AudioWaveform: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="audio-waveform" data-url={audioUrl} />
  ),
}))

import { AssetMedia } from "../surfaces/assets/AssetMedia"
import { syncPluginUi } from "@/shell/pluginUi"

// Seed the ui wire with the four REAL viewer claims (ui.yaml parity —
// what /v1/ui-slots serves in production). syncPluginUi loads the
// claim component.tsx files through the import.meta.glob, which import
// the (mocked) tenant surface above.
const VIEWER_CLAIMS = [
  { plugin: "3d", id: "mesh-viewer", slot: "mesh-viewer", precedence: 10 },
  { plugin: "motion", id: "motion-viewer", slot: "motion-viewer", precedence: 10 },
  { plugin: "video", id: "video-viewer", slot: "video-viewer", precedence: 10 },
  { plugin: "audio", id: "audio-viewer", slot: "audio-viewer", precedence: 10 },
] as const

// ── Fixtures ───────────────────────────────────────────────────────────────
// A Trellis mesh run: the OUTPUT is a .glb, and the run's `thumbnail` is the
// INPUT image. Showing the thumbnail would be "completely wrong" — it is NOT
// the mesh. This is the exact scenario the user reported.
const meshAsset: MediaAsset = {
  id: "run/trellis.glb",
  runId: "run",
  name: "trellis_output.glb",
  category: "3d" as MediaAsset["category"],
  url: "data:application/octet-stream;base64,AAAAMESH====",
  type: "glb",
  size: 9999,
  prompt: "a trellis mesh",
  thumbnail: "data:image/png;base64,INPUT_IMAGE_NOT_THE_MESH",
  createdAt: 0,
  runStatus: "completed",
  runParams: {},
}

const motionAsset: MediaAsset = {
  ...meshAsset,
  id: "run/motion.npz",
  name: "walk_cycle.npz",
  category: "motion" as MediaAsset["category"],
  url: "data:application/octet-stream;base64,AAAAMOTION====",
  type: "npz",
  thumbnail: "data:image/png;base64,WRONG_MOTION_THUMBNAIL",
}

const imageAsset: MediaAsset = {
  ...meshAsset,
  id: "run/output.png",
  name: "render.png",
  category: "image" as MediaAsset["category"],
  url: "data:image/png;base64,REAL_IMAGE_CONTENT",
  type: "image",
  thumbnail: "data:image/png;base64,REAL_IMAGE_CONTENT",
}

describe("AssetMedia tile mode — the 2026-08-12 wrong-thumbnail regression", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await syncPluginUi(VIEWER_CLAIMS)
  })

  it("mesh tile renders MeshPoster (the actual GLB), NOT the run's input thumbnail", () => {
    render(<AssetMedia asset={meshAsset} mode="tile" />)
    // MeshPoster must be used.
    const poster = screen.getByTestId("mesh-poster")
    // And it receives the GLB url (the real asset), not the thumbnail.
    expect(poster.getAttribute("data-url")).toBe(meshAsset.url)
    // CRITICAL: the run's input thumbnail must NOT be rendered anywhere.
    // That thumbnail is the Trellis INPUT image — showing it was the bug.
    expect(screen.queryByText(/INPUT_IMAGE_NOT_THE_MESH/)).toBeNull()
    // No bare <img> with the thumbnail src should appear.
    const imgs = document.querySelectorAll("img")
    imgs.forEach((img) => {
      expect(img.getAttribute("src")).not.toBe(meshAsset.thumbnail)
    })
  })

  it("motion tile renders MotionPoster, NOT the run's thumbnail", () => {
    render(<AssetMedia asset={motionAsset} mode="tile" />)
    expect(screen.getByTestId("motion-poster")).toBeTruthy()
    expect(screen.queryByText(/WRONG_MOTION_THUMBNAIL/)).toBeNull()
    // The MotionPoster receives the NPZ url.
    expect(screen.getByTestId("motion-poster").getAttribute("data-url")).toBe(motionAsset.url)
  })

  it("image tile passes the image straight through (it IS its own preview)", () => {
    const { container } = render(<AssetMedia asset={imageAsset} mode="tile" />)
    // No poster components for plain images — just an <img>.
    expect(screen.queryByTestId("mesh-poster")).toBeNull()
    expect(screen.queryByTestId("motion-poster")).toBeNull()
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("src")).toBe(imageAsset.url)
  })

  it("mesh tile NEVER falls back to a bare Box glyph", () => {
    // The old code rendered <IconTile Icon={Box}> for mesh assets without a
    // thumbnail. Even a mesh WITH no thumbnail must now use MeshPoster.
    const noThumbMesh: MediaAsset = { ...meshAsset, thumbnail: "" }
    render(<AssetMedia asset={noThumbMesh} mode="tile" />)
    expect(screen.getByTestId("mesh-poster")).toBeTruthy()
  })

  it("mesh full mode (dialog) uses AnimatedGLBViewer, not the wrong thumbnail", () => {
    render(<AssetMedia asset={meshAsset} mode="full" />)
    expect(screen.getByTestId("animated-glb").getAttribute("data-url")).toBe(meshAsset.url)
  })
})
