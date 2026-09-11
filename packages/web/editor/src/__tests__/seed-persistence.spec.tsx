// seed-persistence.spec.tsx — the "can't upload images into image ops"
// regression: a FRESH card's null-seeded slot keys (input_image et al.)
// must reach stage.params via the auto-save. The mount-skip used to eat
// the seed when the spec record was already cached (picker prefetch),
// leaving fresh cards with NO input squares.
import { describe, it, expect, vi } from "vitest"
import { render, waitFor, act } from "@testing-library/react"
import React from "react"

vi.mock("@melite/catalog/modelCatalog", () => ({
  studioOf: vi.fn(() => undefined),
  loadCatalog: vi.fn().mockResolvedValue({ models: {}, families: {} }),
  getCachedCatalog: vi.fn().mockReturnValue({ models: {}, families: {} }),
  familiesForForm: vi.fn().mockReturnValue([]),
  familyGenre: vi.fn(() => "image"),
  familyLabel: vi.fn((k: string) => k),
  familyCardSummary: vi.fn().mockReturnValue(null),
  variantLabel: vi.fn().mockReturnValue(""),
  routeCoordinates: vi.fn().mockReturnValue({ variant: undefined, quant: undefined }),
  composeVariantRoute: vi.fn().mockReturnValue(""),
  axisCellExists: vi.fn().mockReturnValue(true),
  dropdownModels: vi.fn().mockReturnValue([]),
  variantSiblings: vi.fn().mockReturnValue([]),
}))
vi.mock("../lib/formSpec", () => ({
  optionValue: vi.fn(),
  optionLabel: vi.fn(),
  evalVisibleWhen: vi.fn().mockReturnValue(true),
}))
// Tip/AxisRows chrome isn't under test — passthrough so the radix
// Tooltip provider requirement doesn't fail the mount.
vi.mock("@melite/ui/tip", () => ({ Tip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) }))
vi.mock("../surfaces/flow/flowAxisRows", () => ({ AxisRows: (): null => null }))
vi.mock("../surfaces/flow/flowParamFields", () => ({ ParamFields: (): null => null }))

// The LIVE spec shape for qwen-img-edit-2511 (trimmed to the seam under
// test: flat fields WITHOUT the image inputs, schema_groups WITH them —
// FEATURE_FIELD_TYPES excludes image fields from the flat list).
const SPEC = {
  model: "qwen-img-edit-2511",
  form: "form_edit",
  fields: [
    { name: "prompt", type: "textarea", label: "Prompt", default: "" },
    { name: "width", type: "number", label: "Width", default: 1024 },
  ],
  schema_groups: [
    {
      id: "input", label: "Input", order: -10,
      fields: [
        { name: "input_image", type: "image", label: "Image" },
        { name: "image2", type: "image", label: "Image 2" },
        { name: "image3", type: "image", label: "Image 3" },
      ],
    },
    {
      id: "prompt", label: "Prompt", order: -10,
      fields: [{ name: "prompt", type: "textarea", label: "Prompt", default: "" }],
    },
  ],
  defaults: { prompt: "", width: 1024 },
  features: {},
}

const records: Record<string, unknown> = {}
const loadFormSpec = async (model: string): Promise<{ spec: unknown; state: string; violations: unknown[]; error: string | null }> => {
  const record = { spec: SPEC, state: "loaded" as const, violations: [] as unknown[], error: null as string | null }
  records[model] = record
  return record
}
vi.mock("../surfaces/shared/specContractStore", () => {
  const useSpecContractStore = Object.assign(
    (selector: (s: { records: Record<string, unknown> }) => unknown) => selector({ records }),
    { getState: () => ({ loadFormSpec, records, retryFormSpec: () => {} }) },
  )
  return { useSpecContractStore }
})

import { ParamEditor } from "../surfaces/flow/flowParamEditor"

const stage: import("@melite/contracts").CardStage = {
  id: "s0", title: "Edit Image", subtitle: "qwen", kind: "generation",
  service: "qwen-img-edit-2511",
  // Fresh card: the picker's defaults — NO slot keys.
  params: { prompt: "", width: 1024 },
  inputs: [], inputIndices: [], result: null, status: "pending" as const, error: null,
}

describe("fresh card slot-key seeding reaches stage.params", () => {
  it("auto-saves the null-seeded input slots (cached record path)", async () => {
    // PRE-CACHE the record — the picker already fetched it. This is the
    // exact live condition where the mount-skip ate the seed.
    await loadFormSpec("qwen-img-edit-2511")

    const onSave = vi.fn()
    render(
      React.createElement(ParamEditor, {
        stage: stage as never,
        onSave,
        onDraftChange: () => {},
      }),
    )

    await waitFor(
      () => {
        expect(onSave).toHaveBeenCalled()
        const payload = onSave.mock.calls[onSave.mock.calls.length - 1][0]
        expect(payload.input_image).toBe(null)
        expect(payload.image2).toBe(null)
        expect(payload.image3).toBe(null)
      },
      { timeout: 2500 },
    )
  })

  it("persists the seed IMMEDIATELY — the Inputs squares never pop in after the reveal (2026-08-22)", async () => {
    // THE SINGLE-POP LAW: the zoom door reveals the card only once, with
    // everything loaded. The slot keys the Inputs zone renders from are
    // null-seeded by the spec vocabulary — under the old flow that seed
    // reached stage.params via the 300ms DEBOUNCE, so the squares popped in
    // a beat after the expand. Pinned here: the seed save fires WITHOUT any
    // timer advance, and no second save trails it.
    vi.useFakeTimers()
    try {
      await loadFormSpec("qwen-img-edit-2511")
      const onSave = vi.fn()
      render(
        React.createElement(ParamEditor, {
          stage: stage as never,
          onSave,
          onDraftChange: () => {},
        }),
      )
      // Flush ONLY effects + microtasks — never the debounce window.
      await act(async () => {})
      expect(onSave.mock.calls.length, "the seed save must not wait 300ms").toBeGreaterThan(0)
      const payload = onSave.mock.calls[0][0]
      expect(payload.input_image).toBe(null)
      expect(payload.image2).toBe(null)
      expect(payload.image3).toBe(null)
      // Letting the debounce window elapse must NOT double-save the seed.
      const count = onSave.mock.calls.length
      await act(async () => { vi.advanceTimersByTime(400) })
      expect(onSave.mock.calls.length).toBe(count)
    } finally {
      vi.useRealTimers()
    }
  })
})
