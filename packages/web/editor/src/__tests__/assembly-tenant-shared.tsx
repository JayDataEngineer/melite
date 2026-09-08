/**
 * Shared cases for AssemblyStudio tenants (Anny, Trellis, whoever is
 * next) — ONE copy of the mock rig and the generic pins. A tenant's
 * own test file is a descriptor + its tenant-specific extras, never
 * a retyped harness.
 *
 * Import this module FIRST in the tenant test file (the vi.mock
 * registrations below must evaluate before the tenant component
 * graph loads), then call describeAssemblyTenant.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ReactElement, ComponentType } from "react"
import { TooltipProvider } from "@melite/ui"
import type { BarKind, ShellDeclaration } from "@melite/ui"
import * as THREE from "three"
import type { CardStage } from "@melite/contracts"
import { primeCatalog } from "@melite/catalog"

// Module-local (NOT exported — vi.hoisted forbids exporting the
// hoisted binding). Tests reach it through the accessors below.
const loaderCalls = vi.hoisted(() => ({ urls: [] as string[] }))

/** URLs the shared GLTF mock has been asked to load. */
export function loaderUrls(): string[] {
  return loaderCalls.urls
}

/** Clear the recorded loader URLs (tenant lifecycle calls this). */
export function resetLoaderUrls(): void {
  loaderCalls.urls.length = 0
}

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
      load(
        url: string,
        resolve: (v: unknown) => void,
        _prog?: unknown,
        reject?: (e: unknown) => void,
      ) {
        loaderCalls.urls.push(url)
        const scene = new THREE.Group()
        if (/FAIL/.test(url)) {
          queueMicrotask(() => reject?.(new Error(`HTTP 404: ${url}`)))
          return
        }
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

export interface TenantStageBase {
  id: string
  title: string
  kind: string
  service: string
}

export function mockStage(
  base: TenantStageBase,
  over: Partial<CardStage> = {},
): CardStage {
  return {
    ...base,
    genre: "3d",
    params: {},
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    ...over,
  }
}

/** Tip (radix Tooltip) needs its provider — the shell owns it in
 *  production; the test mounts it explicitly. */
export function renderTenant(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

let _restoreCreateElement: () => void = () => {}

export function tenantLifecycle() {
  beforeEach(() => {
    resetLoaderUrls()
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
}

export interface TenantProps {
  stage: CardStage
  running?: boolean
  onSave: (patch: Record<string, unknown>) => void
  upstreams?: CardStage[]
}

export interface TenantDescriptor {
  /** describe label, e.g. "AnnyStudio tenant (3d/anny)". */
  label: string
  Component: ComponentType<TenantProps>
  Default: unknown
  stageBase: TenantStageBase
  slotsTitle: string
  slots: string[]
  /** VIEWPORT MODE (one-mesh order, 2026-09-06): "none" when the
   *  tenant renders its OWN native viewport as the one mesh (anny) —
   *  the shared Stage cases become ONE-MESH cases (GLB params and
   *  run assets NEVER hit the loader). Default "stage". */
  viewport?: "stage" | "none"
  /** THE SOURCE PIN (2026-09-06, operator order: "We need to have an
   *  image preview when the card is drilled out for ANNY and
   *  IMAGE->3d"): the input slot whose image stays pinned in view
   *  (over the Stage, or over the tenant's own viewport) + its human
   *  label. Present → the shared pin cases run; absent → no pin. */
  sourcePin?: { slot: string; label: string }
  /** Tenant-specific cases (servable-part wiring, mount notes, …)
   *  run INSIDE the same describe — helpers handed in. */
  extraCases?: (helpers: {
    renderTenant: typeof renderTenant
    mockStage: (over?: Partial<CardStage>) => CardStage
  }) => void
}

// The 3D slot vocabulary the rail reads (mirrors the live
// model-catalog golden: model_slots per service + the shared
// form_img_to_mesh form). Under vitest no catalog loads (MODE=test
// skips the background fetch), so the rail's stageSlots would fall
// back to the global union — which never carried rigged_glb /
// target_glb / body_glb. Priming is what production has (a loaded
// catalog); file-scoped like every vitest module graph.
function primeTenantCatalog(): void {
  primeCatalog({
    families: {
      "trellis2-native": { label: "TRELLIS.2 Native" },
      pixal3d: { label: "Pixal3D" },
      transfer_rig: { label: "Transfer Rig" },
      anny: { label: "Anny (character assembly)" },
    },
    models: {
      "trellis2-native": {
        family: "trellis2-native", form: "form_img_to_mesh",
        label: "TRELLIS.2 Native",
        input_slots: ["input_image", "rigged_glb", "target_glb"],
      },
      pixal3d: {
        family: "pixal3d", form: "form_img_to_mesh", label: "Pixal3D",
        input_slots: ["input_image", "rigged_glb", "target_glb"],
      },
      transfer_rig: {
        family: "transfer_rig", form: "form_img_to_mesh",
        label: "Transfer Rig",
        input_slots: ["input_image", "rigged_glb", "target_glb"],
      },
      anny: {
        family: "anny", form: "form_3d_anny",
        label: "Anny (character assembly)",
        input_slots: ["body_glb", "source_image"],
      },
    },
    capabilities: null,
    engine_order: null,
    quant_order: null,
    input_vocabulary: {
      slots: ["input_image", "rigged_glb", "target_glb", "body_glb", "source_image"],
      aliases: {},
      form_aliases: {},
      form_slots: {
        form_img_to_mesh: ["input_image", "rigged_glb", "target_glb"],
        form_3d_anny: ["body_glb", "source_image"],
      },
    },
  })
}

/** describeShellTenant (row 5 stroke 4) — the assembly harness
 *  generalized to THE SHELL: every shared case above, PLUS the typed
 *  seam-table coherence pins. The declaration is DATA; these cases
 *  refuse the two drift shapes a compiler cannot see — a table that
 *  stopped describing the ride (slots vs rendered vocabulary, center
 *  kind vs viewport mode, bottom bar vs none) and a table the tenant
 *  mutates at runtime (frozen at defineShellDeclaration). */
export function describeShellTenant(
  desc: TenantDescriptor & {
    declaration: Readonly<ShellDeclaration>
    /** The bottom bar the tenant rides (undefined = none). */
    bottom?: BarKind
  },
) {
  const { declaration, bottom, ...rest } = desc
  describeAssemblyTenant(rest)
  describe(`${desc.label} — shell declaration (stroke 4)`, () => {
    it("declares a FROZEN table (data, not code — rung-7)", () => {
      expect(Object.isFrozen(declaration)).toBe(true)
      expect(declaration.rail.slots.length).toBeGreaterThan(0)
    })
    it("rail rows == the rendered slot vocabulary", () => {
      expect([...declaration.rail.slots].sort()).toEqual(
        [...desc.slots].sort(),
      )
    })
    it("center kind matches the viewport the tests render", () => {
      expect(declaration.center.kind).toBe(
        desc.viewport === "none" ? "native" : "stage3d",
      )
    })
    it("bottom seam: declared bar == the bar the tenant rides", () => {
      expect(declaration.bottom?.kind).toBe(bottom)
    })
  })
}

export function describeAssemblyTenant(desc: TenantDescriptor) {
  const { label, Component, Default, stageBase } = desc
  // Production stages carry their slot keys (the store's null-seed);
  // the generic rail renders ONLY declared∩present keys, so the mock
  // seeds the tenant's slots — extras merge/override per case.
  const stage = (over: Partial<CardStage> = {}) => {
    const { params, ...rest } = over
    return mockStage(stageBase, {
      ...rest,
      params: {
        ...Object.fromEntries(desc.slots.map((k): [string, null] => [k, null])),
        ...(params ?? {}),
      },
    })
  }
  describe(label, () => {
    beforeAll(() => primeTenantCatalog())
    tenantLifecycle()

    it("carries the default export the cardStudios glob requires", () => {
      expect(Default).toBe(Component)
    })

    it(`${desc.slotsTitle} and an explicit empty state`, () => {
      renderTenant(
        <Component stage={stage()} onSave={() => {}} upstreams={[]} />,
      )
      for (const slot of desc.slots) {
        expect(screen.getByText(slot)).toBeTruthy()
      }
      if (desc.viewport === "none") {
        // ONE MESH: there is no GLB stage to stand empty — the
        // tenant's own viewport (anny's native figure) is the mesh.
        expect(screen.queryByText("No parts on the stage yet")).toBeNull()
      } else {
        expect(screen.getByText("No parts on the stage yet")).toBeTruthy()
      }
    })

    if (desc.viewport === "none") {
      it("ONE MESH: run assets are files, never scene loads", async () => {
        renderTenant(
          <Component
            stage={stage({
              result: {
                assetUrls: ["https://cdn.test/run-output.glb"],
                artifacts: {},
                metadata: {},
              },
            })}
            onSave={() => {}}
            upstreams={[]}
          />,
        )
        // A run GLB NEVER reaches the loader (the second scene is
        // dead — the tenant's viewport is the one mesh)…
        await vi.waitFor(() => {
          expect(loaderUrls()).not.toContain("https://cdn.test/run-output.glb")
        })
        expect(loaderUrls()).toHaveLength(0)
        // …and nothing fails loudly (nothing was asked to load).
        expect(screen.queryByRole("alert")).toBeNull()
      })
    } else {
      it("a failed run asset surfaces as DOM text naming the asset", async () => {
        renderTenant(
          <Component
            stage={stage({
              result: {
                assetUrls: ["https://cdn.test/FAIL.glb"],
                artifacts: {},
                metadata: {},
              },
            })}
            onSave={() => {}}
            upstreams={[]}
          />,
        )
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).toMatch(/FAIL\.glb/)
        expect(alert.textContent).toMatch(/HTTP 404/)
      })
    }

    // THE SOURCE PIN (drilled-out preview order, 2026-09-06): the
    // input image stays visible on the opened card — the estate path
    // maps through the input preview door (survives reload), an
    // absent input renders NO pin (honest or absent, never a broken
    // frame), and a non-previewable value (mount path) never births
    // a doomed <img>.
    if (desc.sourcePin) {
      const { slot, label } = desc.sourcePin
      it("pins the source image through the input preview door", () => {
        renderTenant(
          <Component
            stage={stage({ params: { [slot]: "data/input/me-1a2b3c4d.png" } })}
            onSave={() => {}}
            upstreams={[]}
          />,
        )
        const pin = document.querySelector("[data-reference-image]")
        expect(pin).not.toBeNull()
        const img = pin!.querySelector("img")
        expect(img).not.toBeNull()
        expect(img!.getAttribute("src")).toBe("/v1/assets/inputs/me-1a2b3c4d.png")
        expect(pin!.getAttribute("aria-label")).toBe(label)
      })

      it("renders no source pin when the input is empty or a mount path", () => {
        const { unmount } = renderTenant(
          <Component stage={stage()} onSave={() => {}} upstreams={[]} />,
        )
        expect(document.querySelector("[data-reference-image]")).toBeNull()
        unmount()
        renderTenant(
          <Component
            stage={stage({ params: { [slot]: "/mnt/models/body.png" } })}
            onSave={() => {}}
            upstreams={[]}
          />,
        )
        expect(document.querySelector("[data-reference-image]")).toBeNull()
      })
    }

    desc.extraCases?.({ renderTenant, mockStage: stage })
  })
}
