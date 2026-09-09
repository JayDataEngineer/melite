/**
 * seedFromEstimate — the recipe bridge's mapper (2026-09-06): the
 * estimator's verbatim recipe (phenotype[6] + scale[139]) names
 * itself into the authored scratchpad (11 coeffs + named morphs).
 * Pure — tested without a store, a fetch, or a GPU.
 */
import { it, expect } from "vitest"
import {
  ESTIMATE_IGNORED_PARTS,
  seedFromEstimate,
} from "../../../../../packages/engines/comfyui-cordis/src/cards/3d/anny/ui/studio/shape"
import fixture from "./estimate-identity.fixture.json"

const SPACE = {
  defaults: fixture.defaults,
  localChangesLabels: fixture.localChangesLabels,
}

function recipe() {
  return {
    phenotype: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    scale: Array.from({ length: 139 }, (_, i) => i * 0.001),
  }
}

it("keeps 139 named morphs out of the 254-label order (face parts dropped, order kept)", () => {
  const seed = seedFromEstimate(recipe(), SPACE)
  expect(Object.keys(seed.localChanges)).toHaveLength(139)
  for (const name of Object.keys(seed.localChanges)) {
    for (const part of ESTIMATE_IGNORED_PARTS) {
      expect(name.includes(part)).toBe(false)
    }
  }
  // order-preserved: first kept label takes scale[0]
  const firstKept = SPACE.localChangesLabels.find(
    (l) => !ESTIMATE_IGNORED_PARTS.some((p) => l.includes(p)),
  )!
  expect(seed.localChanges[firstKept]).toBe(0)
})

it("fills phenotype dims 0-5 over the identity defaults", () => {
  const seed = seedFromEstimate(recipe(), SPACE)
  expect(seed.coeffs).toHaveLength(11)
  expect(seed.coeffs.slice(0, 6)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
  expect(seed.coeffs.slice(6)).toEqual(fixture.defaults.slice(6))
})

it("throws on any shape drift — a half seed is a wrong body wearing yours", () => {
  expect(() => seedFromEstimate({ phenotype: [1, 2], scale: recipe().scale }, SPACE)).toThrow()
  expect(() => seedFromEstimate({ phenotype: recipe().phenotype, scale: [1, 2] }, SPACE)).toThrow()
  expect(() => seedFromEstimate({ phenotype: recipe().phenotype, scale: recipe().scale }, {
    defaults: [0.5],
    localChangesLabels: [],
  })).toThrow()
})
