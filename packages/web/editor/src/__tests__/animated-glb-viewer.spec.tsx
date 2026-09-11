/**
 * Regression tests for AnimatedGLBViewer (src/surfaces/shared/AnimatedGLBViewer.tsx).
 *
 * THE BUG (2026-08-12): AnimatedGLBViewer was a STUB that returned ``null``.
 * Every mesh asset (SOMAX-rigged GLB, TRELLIS, baked-animated, static) was
 * INVISIBLE when clicked in the asset sidebar — the detail dialog opened
 * with a blank body. The user's report: "I can't see it AT ALL WHEN I CLICK
 * ON IT IN THE LEFT MENU."
 *
 * These tests lock in that the component NEVER renders blank/null again:
 *   • No-URL fallback renders an explicit affordance (not null).
 *   • With a URL, the viewer mounts a container + loading overlay (not null),
 *     even before the GLTF resolves.
 *
 * 2026-08-15 contract refresh (the shared/-move rework): the GLB loads via
 * a hand-rolled GLTFLoader — no drei useGLTF suspense — so the loading
 * overlay reads "Loading character…", and the background lives on the
 * Canvas style prop (dark = the theme CSS var, light = #f0f0f0). The
 * legacy `url` prop alias is GONE; every caller passes glbUrl.
 *
 * The @react-three/fiber Canvas + drei are mocked to plain passthroughs so
 * we can assert DOM-level output without a WebGL context (jsdom has none).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

// ── Mocks: collapse the R3F/three surface to plain DOM ────────────────────
// Canvas → a div that renders its children (style forwarded so the
// background assertions can observe it). The drei helpers are inert
// passthroughs. useGLTF is NOT mocked — the reworked component loads via
// its own GLTFLoader, driven through the frozen fetch below.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({
    children,
    style,
  }: {
    children?: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <div data-testid="r3f-canvas" style={style}>{children}</div>
  ),
  useFrame: () => {},
}))

vi.mock("@react-three/drei", () => ({
  OrbitControls: (): null => null,
  ContactShadows: (): null => null,
  Environment: (): null => null,
  Lightformer: (): null => null,
}))

import { AnimatedGLBViewer } from "@melite-plugin/3d/ui/viewers"

describe("AnimatedGLBViewer — the 2026-08-12 stub-returning-null regression", () => {
  beforeEach(() => {
    // Freeze the GLB fetch forever: three's FileLoader goes through fetch,
    // so a never-settling promise pins loading=true deterministically — no
    // network in jsdom, and no state updates landing after the test ends.
    vi.stubGlobal("fetch", () => new Promise(() => {}))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("renders an explicit fallback when no URL is provided (NOT null/blank)", () => {
    const { container } = render(<AnimatedGLBViewer />)
    // The no-URL branch renders "No 3D asset URL" — the affordance that
    // something is wrong rather than an empty void.
    expect(screen.getByText("No 3D asset URL")).toBeTruthy()
    expect(container.firstChild).not.toBeNull()
  })

  it("renders a container + loading overlay when given a GLB url (NOT null/blank)", () => {
    const { container } = render(<AnimatedGLBViewer glbUrl="/assets/runs/abc/stage4_somax_rigged.glb" />)
    // The viewer must mount SOMETHING — the bug was returning null here.
    expect(container.firstChild).not.toBeNull()
    // The loading overlay is the pre-resolution affordance. The previous stub
    // rendered nothing; the overlay must appear until the GLTF resolves
    // (which, with fetch frozen, is never — deterministic).
    expect(screen.getByText("Loading character…")).toBeTruthy()
  })

  it("applies the className prop to the viewer container", () => {
    const { container } = render(
      <AnimatedGLBViewer glbUrl="/x.glb" className="h-[70vh] w-full rounded-lg" />,
    )
    expect(container.firstChild).not.toBeNull()
    // The className lands on the outermost rendered element.
    expect((container.firstChild as HTMLElement).className).toContain("h-[70vh]")
  })

  it("darkMode paints the theme CSS-var background on the canvas", () => {
    const { container } = render(<AnimatedGLBViewer glbUrl="/x.glb" darkMode />)
    const canvas = container.querySelector('[data-testid="r3f-canvas"]') as HTMLElement
    expect(canvas).toBeTruthy()
    expect(canvas.style.background).toBe("var(--background)")
  })

  it("explicit light mode uses the light fallback background (default is dark)", () => {
    const { container } = render(<AnimatedGLBViewer glbUrl="/x.glb" darkMode={false} />)
    const canvas = container.querySelector('[data-testid="r3f-canvas"]') as HTMLElement
    expect(canvas).toBeTruthy()
    expect(canvas.style.background).toBe("#f0f0f0")
  })
})
