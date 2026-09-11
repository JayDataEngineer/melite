/**
 * Legacy-bag removal (2026-09-06, operator order "NO LEGACY
 * CODEBASE"): the ray-era keys rode stage params from the retired
 * body card's bridge and died at the Run gate naming all four.
 * scrubLegacyBag is pure (no store); the bridge scrubs a dirtied
 * stage once on mount and never writes the bag back.
 */
import { it, expect, vi } from "vitest"
import { waitFor } from "@testing-library/react"
import { mockStage, renderTenant } from "./assembly-tenant-shared"
import {
  LEGACY_BAG_KEYS,
  scrubLegacyBag,
  useAnnyShapeBridge,
} from "@melite/3d-anny/ui/studio/shape"

const BASE = { id: "anny-1", title: "Anny", kind: "anny", service: "anny" }

it("names the full removed bag", () => {
  expect([...LEGACY_BAG_KEYS].sort()).toEqual(
    ["coeffs", "customTargets", "identityModel", "localChanges"].sort(),
  )
})

it("scrub returns null when there is nothing to strip", () => {
  expect(
    scrubLegacyBag({ body_glb: "runs/x/b.glb", source_image: "data/input/p.png" }),
  ).toBeNull()
})

it("scrub lifts exactly the bag and keeps everything else", () => {
  const out = scrubLegacyBag({
    body_glb: "runs/x/b.glb",
    identityModel: "anny",
    coeffs: [0.5],
    localChanges: { chest: 0.2 },
    customTargets: null,
  })
  expect(out).toEqual({ body_glb: "runs/x/b.glb" })
})

it("the bridge scrubs a dirtied stage once on mount", async () => {
  const onSave = vi.fn()
  function Probe({ stage }: { stage: Parameters<typeof useAnnyShapeBridge>[0] }): null {
    useAnnyShapeBridge(stage, onSave)
    return null
  }
  renderTenant(
    <Probe
      stage={mockStage(BASE, {
        params: {
          body_glb: "runs/x/b.glb",
          identityModel: "anny",
          coeffs: [0.1],
          localChanges: {},
          customTargets: null,
        },
      })}
    />,
  )
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  const patch = onSave.mock.calls[0]![0] as Record<string, unknown>
  expect(patch).toEqual({ body_glb: "runs/x/b.glb" })
})

it("the bridge stays silent on a clean stage", async () => {
  const onSave = vi.fn()
  function Probe({ stage }: { stage: Parameters<typeof useAnnyShapeBridge>[0] }): null {
    useAnnyShapeBridge(stage, onSave)
    return null
  }
  renderTenant(
    <Probe stage={mockStage(BASE, { params: { body_glb: "runs/x/b.glb" } })} />,
  )
  // Let effects flush: no scrub, no write-back, no save at all.
  await new Promise((r) => setTimeout(r, 50))
  expect(onSave).not.toHaveBeenCalled()
})
