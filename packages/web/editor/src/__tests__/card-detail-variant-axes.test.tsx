// card-detail-variant-axes.test.tsx — THE PRESETS/VARIANTS VISIBILITY
// PIN (2026-08-18: "I NEED TO SEE ALL THE PRESETS… VARIANT CONTAINS
// PRESETS… I do not see it on the card!").
//
// The zoomed form card (CardDetailInline → ParamGrid editing →
// ParamEditor → AxisRows) must render the FULL model-zone row ABOVE the
// parameters: the Model select, one select per variant axis the spec
// serves (Variant / Quant), and the preset field (the spec's declared
// "preset" select — z-image's Workflow Preset group). The backend
// serves variant_groups + variants + preset options per route
// (live-proven on :33080); this pins the SURFACE renders them.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
import { editorClient } from "../rpc/editorClient"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn() },
}))

// The z-image spec shape the live backend serves (verbatim from
// /v1/form-spec?model=z-image on 2026-08-18): variant_groups {Variant,
// Quant}, five variants (turbo/base Variant rows, int8/q8/q5 Quant
// cells), a preset select with inpaint_lanpaint.
const Z_IMAGE_SPEC: Record<string, any> = {
  fields: [
    { name: "prompt", type: "string" },
    { name: "preset", type: "select", label: "Workflow Preset", default: "",
      options: [{ value: "inpaint_lanpaint", label: "Inpaint (LanPaint)" }] },
  ],
  schema_groups: [
    { id: "preset", label: "Workflow Preset", fields: [
      { name: "preset", type: "select", label: "Workflow Preset", default: "",
        options: [{ value: "inpaint_lanpaint", label: "Inpaint (LanPaint)" }] },
    ] },
    { id: "prompt", label: "Prompt", fields: [{ name: "prompt", type: "textarea" }] },
  ],
  defaults: {},
  // Wire shape (f8d5ea7): `variants` rides the spec ROOT;
  // `variant_groups` stays under `features` (the FormSpecRow SSOT).
  variants: [
    { id: "turbo", label: "Turbo", defaults: { model: "z-image" }, group: "Variant", route: "z-image", hint: "8-step distilled — fast (DEFAULT)" },
    { id: "base", label: "Base", defaults: { model: "z-image-base" }, group: "Variant", route: "z-image-base", hint: "50-step base checkpoint" },
    { id: "int8", label: "INT8 ConvRot", defaults: { model: "z-image-int8" }, group: "Quant", route: "z-image-int8", owner: "turbo", quant: "int8" },
    { id: "q8", label: "Q8", defaults: { model: "z-image-q8" }, group: "Quant", route: "z-image-q8", owner: "turbo", quant: "q8" },
    { id: "q5", label: "Q5", defaults: { model: "z-image-q5" }, group: "Quant", route: "z-image-q5", owner: "turbo", quant: "q5" },
  ],
  features: {
    variant_groups: {
      Variant: { label: "Variant", tooltip: "Turbo or Base", filters_on: null },
      Quant: { label: "Quant", tooltip: "INT8/Q8/Q5", filters_on: "Variant" },
    },
  },
}

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Generate image",
    subtitle: "z-image",
    kind: "generation",
    service: "z-image",
    params: { prompt: "a cat" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

describe("CardDetailInline — variant axes + presets visible on the form card", () => {
  beforeEach(() => {
    vi.mocked(editorClient.getFormSpec).mockReset()
  })

  it("renders Model, Variant, and Quant selects above the parameters", async () => {
    vi.mocked(editorClient.getFormSpec).mockResolvedValue(Z_IMAGE_SPEC as any)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn(), onRun: vi.fn() }}
      />,
    )
    // Model combobox (kit Select trigger carries aria-label) + axis
    // labels (the label sits in a Tip wrapper, so query by label TEXT).
    const modelBox = await screen.findByRole("combobox", { name: "Model" })
    expect(modelBox).toBeTruthy()
    const labels = await screen.findAllByText(/^(Variant|Quant)$/)
    expect(labels.length).toBe(2)
    // Every axis select is a kit Select: open the Variant combobox and
    // assert the variant labels arrive as listbox options.
    const variantBox = await screen.findByRole("combobox", { name: "Variant" })
    fireEvent.click(variantBox)
    const listbox = await screen.findByRole("listbox")
    const optionTexts = within(listbox).getAllByRole("option")
      .map((o) => o.textContent ?? "")
    for (const want of ["Turbo", "Base"]) {
      expect(optionTexts.some((t) => t.includes(want))).toBe(true)
    }
    // The Quant combobox shows the active cell's label on its trigger.
    const quantBox = await screen.findByRole("combobox", { name: "Quant" })
    expect(quantBox.textContent ?? "").toMatch(/INT8 ConvRot|Q8|Q5/)
  })

  it("renders the preset picker (z-image's Workflow Preset) on the card", async () => {
    vi.mocked(editorClient.getFormSpec).mockResolvedValue(Z_IMAGE_SPEC as any)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn(), onRun: vi.fn() }}
      />,
    )
    // The preset field renders as a chip row (≤5 options — the
    // "PRESETS VISIBLE" rule): "Default" + "Inpaint (LanPaint)" buttons.
    await screen.findByLabelText("Model")
    expect(await screen.findByText("Inpaint (LanPaint)", { selector: "button" })).toBeTruthy()
    expect(await screen.findByText("Default", { selector: "button" })).toBeTruthy()
  })

  it("renders the Recipe rail ABOVE the Model row (2026-09-06 order)", async () => {
    // The grammar ships a Recipe group (default='default') on every
    // family — the rail rides above Model, never beside it.
    const spec = {
      ...Z_IMAGE_SPEC,
      variants: [
        ...Z_IMAGE_SPEC.variants,
        { id: "default", label: "Default", defaults: {}, group: "Recipe", route: "" },
      ],
      features: {
        variant_groups: {
          ...Z_IMAGE_SPEC.features.variant_groups,
          Recipe: { label: "Recipe", tooltip: "recipes", default: "default" },
        },
      },
    }
    vi.mocked(editorClient.getFormSpec).mockResolvedValue(spec as any)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn(), onRun: vi.fn() }}
      />,
    )
    const recipeLabel = await screen.findByText("Recipe")
    const modelBox = await screen.findByRole("combobox", { name: "Model" })
    expect(recipeLabel).toBeTruthy()
    // Recipe precedes Model in document order (the rail is above).
    const pos = recipeLabel.compareDocumentPosition(modelBox)
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The Recipe combobox lands on the Default option — open it and
    // assert Default leads the listbox.
    const recipeBox = await screen.findByRole("combobox", { name: "Recipe" })
    fireEvent.click(recipeBox)
    const listbox = await screen.findByRole("listbox")
    const options = within(listbox).getAllByRole("option")
    expect(options.length).toBeGreaterThanOrEqual(1)
    expect(options[0]?.textContent ?? "").toContain("Default")
  })
})
