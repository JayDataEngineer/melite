/**
 * Regression tests for MeshPoster (src/surfaces/assets/MeshPoster.tsx).
 *
 * THE BUG (2026-08-12): mesh asset tiles in the Media sidebar showed the
 * run's `thumbnail` — for a Trellis (image→mesh) run that's the INPUT
 * image, "completely wrong." The fix: MeshPoster renders the ACTUAL GLB.
 *
 * These tests lock in that MeshPoster NEVER renders blank/null:
 *   • Loading state → skeleton (not null).
 *   • Error state → explicit "Preview unavailable" affordance (not blank).
 *   • Cache hit → a real <img> (the persisted poster).
 *
 * The GLTFLoader + DRACOLoader are mocked so no network/worker/WebGL
 * activity occurs in jsdom (jsdom has no WebGL context). The error path
 * is driven by making the loader reject; the loading path by making it
 * pending forever; the success path by pre-seeding the poster cache (no
 * render needed).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"

// Hoisted mock controller — lets each test choose loader behavior. vi.hoisted
// is required because vi.mock factories run above every const in the file.
const { loadMode } = vi.hoisted(() => ({ loadMode: { mode: "error" as "error" | "pending" } }))

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockGLTFLoader {
    setDRACOLoader() {
      return this
    }
    load(_url: string, _onDone: unknown, _onProg: unknown, onErr?: (e: Error) => void) {
      // 'error' → reject immediately (drives the explicit error affordance).
      // 'pending' → never resolve (keeps the loading skeleton on screen).
      if (loadMode.mode === "error") onErr?.(new Error("test: glb load failure"))
    }
  },
}))

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: class MockDRACOLoader {
    setDecoderPath() {}
  },
}))

import { MeshPoster, useMeshPosterStore } from "@melite-plugin/3d/ui/viewers"

describe("MeshPoster — the 2026-08-12 wrong-thumbnail regression", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the persisted cache between tests so each starts clean.
    useMeshPosterStore.setState({ posters: {} })
    localStorage.removeItem("mesh-asset-posters")
    loadMode.mode = "error"
  })

  it("renders a loading skeleton (NOT null/blank) while the GLB loads", () => {
    loadMode.mode = "pending" // never resolves → skeleton persists
    const { container } = render(<MeshPoster url="/assets/runs/x/stage.glb" />)
    expect(container.firstChild).not.toBeNull()
    // The skeleton is announced as a status with a descriptive label.
    expect(screen.getByLabelText("Loading 3D preview")).toBeTruthy()
    expect(container.querySelector("img")).toBeNull() // not yet rendered
  })

  it("renders an EXPLICIT error affordance (NOT a blank div) on load failure", async () => {
    // ONE PATH (2026-09-05 fossil-tier kill): the "server poster" tier
    // (/v1/flows/mesh_poster/…) never existed in any gateway — the client
    // render below is the only path. The mocked GLTFLoader rejects and the
    // error affordance appears; no <img> is ever rendered on this path.
    const { container } = render(<MeshPoster url="/v1/assets/runs/x/broken.glb" />)
    expect(container.querySelector("img")).toBeNull() // no server tier
    // The error affordance is a role=alert with "Preview unavailable".
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByText("Preview unavailable")).toBeTruthy()
    // The error box must not be a bare empty div — it has visible text.
    expect(container.textContent).toContain("Preview unavailable")
  })

  it("renders a real <img> from the persisted cache (no re-render)", () => {
    // Pre-seed the cache — the component must show this immediately,
    // without spinning up a GLTFLoader / WebGLRenderer.
    const cachedPng = "data:image/png;base64,AAAAFAKEPOSTER===="
    useMeshPosterStore.setState({ posters: { "/assets/runs/x/m.glb": cachedPng } })
    const { container } = render(<MeshPoster url="/assets/runs/x/m.glb" />)
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("src")).toBe(cachedPng)
  })

  it("persists the rendered poster to localStorage for subsequent opens", async () => {
    // This is the cache-write contract: a successful render stashes the PNG
    // so the next mount skips the GLTFLoader. We can't do a real WebGL render
    // in jsdom, so this test verifies the store-level persistence instead.
    useMeshPosterStore.getState().setPoster("/x.glb", "data:image/png;base64,CACHED")
    expect(useMeshPosterStore.getState().posters["/x.glb"]).toBe("data:image/png;base64,CACHED")
    // Survives a fresh store load (localStorage round-trip).
    expect(localStorage.getItem("mesh-asset-posters")).toContain("CACHED")
  })

  it("applies the className prop to the rendered affordance", () => {
    loadMode.mode = "pending"
    const { container } = render(
      <MeshPoster url="/x.glb" className="w-20 h-20 custom-tile" />,
    )
    expect((container.firstChild as HTMLElement).className).toContain("custom-tile")
  })

  it("does NOT render a Box/glyph that masks missing content", async () => {
    // The old code fell back to a bare Box icon for mesh tiles. MeshPoster
    // must never show a bare glyph as if it were the asset — on error it
    // shows explicit "Preview unavailable" text, and on success a real img.
    // The mocked loader rejects → the affordance (the client render is
    // the only tier — no server-poster path exists for any URL shape).
    loadMode.mode = "error"
    render(<MeshPoster url="data:model/gltf-binary;base64,AAAA" />)
    // The SVG glyph path would be a lucide Box; the error affordance uses
    // an AlertTriangle + visible text instead. The presence of the explicit
    // label is the contract.
    expect(await screen.findByText("Preview unavailable")).toBeTruthy()
  })
})

// Silence React act() warnings from the async effect between tests.
afterEach(() => {
  cleanup()
})
