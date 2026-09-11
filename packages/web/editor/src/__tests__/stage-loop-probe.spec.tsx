/**
 * Stage — the stability regression pin (the 2026-09-05 effect-loop fix).
 *
 * THE DEFECT IT PINS: Stage used to pass `objectRef={objectRef(a.id)}`
 * — a fresh function identity every parent render — while StageModel's
 * mount-effect listed `objectRef` in its deps and the effect itself
 * called setObjs (→ parent re-render → new identity → effect re-run →
 * …). Measured before the fix: the mount-effect re-ran 112→397 /
 * 143→502 / 65→274 times across 100–150ms windows (~2.8k cycles/sec)
 * — a never-settling loop that rebuilt the Box3 auto-fit + a fresh
 * AnimationMixer every cycle (baked clips froze at t=0) and burned CPU
 * for as long as Stage was mounted.
 *
 * THE FIX IT GUARDS: Stage mints every per-asset callback (objectRef /
 * onRigAuto / onLoadingChange) ONCE per id in a ref-map, and the
 * mount-effect deps are [gltf, objectRef] only — `playing` toggles
 * pause the live action instead of remounting the scene. Both are
 * pinned here: the load settles (no churn with zero input change) and
 * a play/pause toggle re-runs the mount-effect ZERO times.
 *
 * Mock strategy mirrors animated-glb-viewer.spec.tsx (fiber Canvas →
 * passthrough div, drei inert) plus a createElement patch so R3F
 * intrinsics (<group>) survive the mount-effect's g.clear()/g.add().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import * as THREE from "three"

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => {},
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(),
    raycaster: new THREE.Raycaster(),
    gl: { domElement: document.createElement("canvas") },
  }),
}))

vi.mock("@react-three/drei", () => ({
  OrbitControls: (): null => null,
  TransformControls: (): null => null,
  Grid: (): null => null,
  ContactShadows: (): null => null,
  Environment: (): null => null,
  Lightformer: (): null => null,
}))

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => {
  return {
    GLTFLoader: class {
      setDRACOLoader() {}
      load(_url: string, resolve: (v: unknown) => void) {
        // resolve IMMEDIATELY-ish so the gltf state lands and the
        // mount-effect under test fires.
        const scene = new THREE.Group()
        queueMicrotask(() =>
          resolve({
            scene,
            animations: [new THREE.AnimationClip("idle", 1.0, [])],
          }),
        )
      }
    },
  }
})

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: class {
    setDecoderPath() {}
  },
}))

import { Stage } from "@melite-plugin/3d/ui/viewers"

const tick = () => new Promise((r) => setTimeout(r, 50))

let _restoreCreateElement: () => void = () => {}

describe("Stage audit probe — effect ping-pong", () => {
  beforeEach(() => {
    // The mocked Canvas renders R3F intrinsics (<group>) as custom DOM
    // elements; the mount-effect calls g.clear()/g.add() on them. Patch
    // createElement so every created element carries no-op clear/add
    // (happy-dom's unknown-element prototype chain is not reliably
    // patchable).
    const orig = document.createElement.bind(document)
    const patch = (el: HTMLElement) => {
      ;(el as unknown as { clear: () => void }).clear = () => {}
      ;(el as unknown as { add: () => void }).add = () => {}
      return el
    }
    document.createElement = ((tag: string, opts?: ElementCreationOptions) =>
      patch(orig(tag, opts))) as typeof document.createElement
    _restoreCreateElement = () => {
      document.createElement = orig
    }
  })
  afterEach(() => _restoreCreateElement())

  it("mount-effect settles after ONE load (no re-render loop)", async () => {
    const spy = vi.spyOn(THREE.Box3.prototype, "setFromObject")
    render(
      <Stage
        assets={[{ id: "a", url: "/x.glb", playing: true }]}
      />,
    )
    await tick()
    const first = spy.mock.calls.length
    expect(first).toBeGreaterThanOrEqual(1) // the load landed
    await tick()
    await tick()
    const later = spy.mock.calls.length
    // A settled component re-runs the mount-effect ZERO times with no
    // input change. Anything beyond the first call is churn.
    expect(later).toBe(first)
  })

  it("play/pause toggles the action without remounting the scene", async () => {
    const spy = vi.spyOn(THREE.Box3.prototype, "setFromObject")
    const view = render(
      <Stage
        assets={[{ id: "a", url: "/x.glb", playing: true }]}
      />,
    )
    await tick()
    const settled = spy.mock.calls.length
    expect(settled).toBeGreaterThanOrEqual(1)
    // Toggle playing — a pure pause, NOT a scene rebuild.
    view.rerender(
      <Stage
        assets={[{ id: "a", url: "/x.glb", playing: false }]}
      />,
    )
    await tick()
    await tick()
    expect(spy.mock.calls.length).toBe(settled)
    view.unmount()
  })
})
