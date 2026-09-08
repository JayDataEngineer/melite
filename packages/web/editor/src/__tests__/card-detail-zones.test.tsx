// card-detail-zones.test.tsx — the form-card zone anatomy
// (docs/design/card-studio-pattern.md §4).
//
// WHAT IS PROVEN: the drilldown renders ONE anatomy in order —
// Outputs → Inputs → Model → Parameters → Mods (Outputs since 2026-08-16,
// the declared-contract zone above the artifacts) — with zone headers
// rendering ONLY when the zone has content (skip-empty), the Enhance
// wand staying inline with its field label, and the Model zone being
// the catalog-tree row (one dropdown per variant axis — the variant
// FOLDERS + quant cells from the yaml files, driven by form-spec
// features, never hard-coded).
//
// Backend companion: tests/unit/test_form_spec_zones.py pins the wire
// (every emitted schema_groups entry carries a valid zone; the Model
// zone is NEVER a schema group). This file pins the render.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

vi.mock("@melite/catalog/modelCatalog", () => ({
  studioOf: vi.fn(() => undefined),
 loadCatalog: vi.fn().mockResolvedValue({
    models: {
      "qwen-img-edit-2511": { form: "form_edit", label: "Image Edit" },
      "krea2": { form: "form_generate", label: "Krea 2" },
    },
  }),
  getCachedCatalog: vi.fn().mockReturnValue({ models: {}, families: {} }),
  familiesForForm: vi.fn().mockReturnValue([
    { familyId: "qwen-edit", primaryRoute: "qwen-img-edit-2511", label: "Image Edit" },
    { familyId: "krea2", primaryRoute: "krea2", label: "Krea 2" },
  ]),
  // The Inputs gate (stageSlots) calls formOf — return undefined so the
  // global slot-vocabulary fallback drives it (the vocabulary store is
  // never loaded under the mock).
  formOf: vi.fn().mockReturnValue(undefined),
  familyGenre: vi.fn().mockReturnValue("image"),
  familyOf: vi.fn().mockReturnValue(undefined),
  narrowGenre: vi.fn((g: unknown) =>
    typeof g === "string" &&
    ["image", "video", "audio", "3d", "motion", "ai_generated", "text"].includes(g)
      ? g
      : undefined,
  ),
  familyLabel: vi.fn().mockImplementation((k: string) => k),
  familyCardSummary: vi.fn().mockReturnValue(null),
  variantLabel: vi.fn().mockReturnValue(""),
  routeCoordinates: vi.fn().mockReturnValue({ variant: undefined, quant: undefined }),
  composeVariantRoute: vi.fn().mockReturnValue(""),
  // Only-existing-combinations (2026-08-16): mocked permissive — the
  // filter's own behavior is pinned in model-catalog.test.ts against a
  // REAL catalog. These files pin rendering, not matrix composition.
  axisCellExists: vi.fn().mockReturnValue(true),
  dropdownModels: vi.fn().mockReturnValue([]),
  variantSiblings: vi.fn().mockReturnValue([]),
}))

// Door B (2026-08-11): a form-spec only enters the app through the
// specContractStore. The per-model spec factory returns the fixtures —
// zone-tagged schema_groups, features (variants + modifiers), enhance
// prompts — mirroring what the backend now emits.
vi.mock("../surfaces/shared/specContractStore", () => {
  const records: Record<string, any> = {}
  const stateRef = { records }

  async function specFor(model: string): Promise<Partial<FormSpec>> {
    if (model === "qwen-img-edit-2511") {
      return {
        defaults: { prompt: "", steps: 28, cfg: 4.5 },
        fields: [
          { name: "prompt", type: "textarea", label: "Prompt" },
          { name: "steps", type: "number" },
          { name: "cfg", type: "number" },
        ],
        schema_groups: [
          // Inputs zone — pure-slot group (its image field renders via
          // SlotGrid, never in the params flow).
          { id: "input", label: "Input", zone: "inputs", order: 0, collapsed: false, fields: [{ name: "image1", type: "image", label: "Image 1", default: null, order: 0, width: 6 }] },
          // Params zone (the default for untagged groups — explicit here).
          { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
            { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
            { name: "steps", type: "number", label: "Steps", default: 28, order: 2, width: 4 },
            { name: "cfg", type: "number", label: "CFG", default: 4.5, order: 3, width: 4 },
          ] },
          // Mods zone — the mod bag, owned by SubcardGrid.
          { id: "loras", label: "LoRAs", zone: "mods", order: 0, collapsed: false, fields: [{ name: "loras", type: "loras", label: "LoRAs", default: null, order: 4, width: 12 }] },
        ],
        // Wire shape (f8d5ea7): `variants` rides the spec ROOT;
        // groups/modifiers stay under `features`.
        variants: [
          { id: "lightning4", group: "Quant", label: "FP8 Lightning (4-step)", quant: "fp8", defaults: {} },
          { id: "int8", group: "Quant", label: "INT8 ConvRot", defaults: {} },
        ],
        features: {
          // The catalog tree: Quant axis cells (the quants keys).
          variant_groups: { Quant: { label: "Quant", tooltip: "Quantization tier" } },
          modifiers: [{ kind: "loras", param_key: "loras", label: "LoRA", cardinality: "list", fields: [], options: [] }],
        },
        enhance_prompts: { prompt: "Rewrite the prompt for the active model." },
      }
    }
    if (model === "qwen-img-edit-2511-two-axis") {
      return {
        defaults: { prompt: "" },
        fields: [{ name: "prompt", type: "textarea" }],
        schema_groups: [
          { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
            { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
          ] },
        ],
        // TWO variant FOLDERS (Variant axis) + a quant cell (Quant
        // axis) — the folder structure as the matrix.
        variants: [
          { id: "lightning", group: "Variant", label: "⚡ Lightning (4-step)", defaults: { steps: 4 } },
          { id: "standard", group: "Variant", label: "Standard (20-step)", defaults: { steps: 20 } },
          { id: "q8", group: "Quant", label: "Q8", quant: "q8", defaults: {} },
        ],
        features: {
          variant_groups: {
            Variant: { label: "Variant", tooltip: "Distillation tier" },
            Quant: { label: "Quant", tooltip: "Quantization tier" },
          },
        },
      }
    }
    // kimodo-like: no variants, no modifiers, no slot groups.
    return {
      defaults: { prompt: "", cfg: 4.5 },
      fields: [
        { name: "prompt", type: "textarea" },
        { name: "cfg", type: "number" },
      ],
      schema_groups: [
        { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
          { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
          { name: "cfg", type: "number", label: "CFG", default: 4.5, order: 2, width: 4 },
        ] },
      ],
      features: {},
    }
  }

  const loadFormSpec = vi.fn(async (model: string, _opts?: { fresh?: boolean }) => {
    const spec = await specFor(model)
    const record: SpecContractRecord = { spec: spec as FormSpec, state: "loaded", violations: [], error: null }
    records[model] = record
    return record
  })
  const useSpecContractStore = Object.assign(
    (selector: (s: { records: Record<string, any> }) => any) => selector(stateRef),
    {
      getState: () => ({ loadFormSpec, records }),
      setState: (patch: { records: Record<string, any> }) => {
        stateRef.records = patch.records
      },
    },
  )
  return { useSpecContractStore }
})

vi.mock("../lib/formSpec", () => ({
  optionValue: (opt: unknown) => (typeof opt === "string" ? opt : (opt as { value: string }).value),
  optionLabel: (opt: unknown) => (typeof opt === "string" ? opt : (opt as { label: string }).label),
  // Unknown atoms default to visible (true) — the fixtures use no
  // visible_when, so every field renders.
  evalVisibleWhen: () => true,
}))

import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import { useSpecContractStore, type SpecContractRecord } from "../surfaces/shared/specContractStore"
import type { FormSpec } from "@melite/contracts"
import { formSpecStub } from "./fixtures/formSpecStub"
import { familiesForForm } from "@melite/catalog"
import type { CardStage } from "@melite/contracts"
function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Edit image",
    subtitle: "qwen-img-edit-2511",
    kind: "generation",
    service: "qwen-img-edit-2511",
    // steps keeps ParamGrid's entry list non-empty (the editor branch);
    // image1 is a slot → the Inputs section renders.
    params: { prompt: "make it blue", steps: 28, cfg: 4.5, image1: "data:image/png;base64,AAAA" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

/** True when a comes BEFORE b in the DOM (document order). */
function before(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

// The mock store has no subscription machinery — a record loaded AFTER
// mount would never re-render the body. Pre-seed the record so the
// subscription reads it on the FIRST render (the loadFormSpec fetch on
// mount re-writes the same fixture — harmless).
const IMAGE_EDIT_SPEC: Partial<FormSpec> = {
  defaults: { prompt: "", steps: 28, cfg: 4.5 },
  fields: [
    { name: "prompt", type: "textarea", label: "Prompt" },
    { name: "steps", type: "number" },
    { name: "cfg", type: "number" },
  ],
  schema_groups: [
    { id: "input", label: "Input", zone: "inputs", order: 0, collapsed: false, fields: [{ name: "image1", type: "image", label: "Image 1", default: null, order: 0, width: 6 }] },
    { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
      { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
      { name: "steps", type: "number", label: "Steps", default: 28, order: 2, width: 4 },
      { name: "cfg", type: "number", label: "CFG", default: 4.5, order: 3, width: 4 },
    ] },
    { id: "loras", label: "LoRAs", zone: "mods", order: 0, collapsed: false, fields: [{ name: "loras", type: "loras", label: "LoRAs", default: null, order: 4, width: 12 }] },
  ],
  // Wire shape (f8d5ea7): `variants` rides the spec ROOT.
  variants: [
    { id: "lightning4", group: "Quant", label: "FP8 Lightning (4-step)", quant: "fp8", defaults: {} },
    { id: "int8", group: "Quant", label: "INT8 ConvRot", defaults: {} },
  ],
  features: {
    variant_groups: { Quant: { label: "Quant", tooltip: "Quantization tier" } },
    modifiers: [{ kind: "loras", param_key: "loras", label: "LoRA", cardinality: "list", fields: [], options: [] }],
  },
  enhance_prompts: { prompt: "Rewrite the prompt for the active model." },
}

const TWO_AXIS_SPEC: Partial<FormSpec> = {
  defaults: { prompt: "" },
  fields: [{ name: "prompt", type: "textarea" }],
  schema_groups: [
    { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
      { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
    ] },
  ],
  // Wire shape (f8d5ea7): `variants` rides the spec ROOT.
  variants: [
    { id: "lightning", group: "Variant", label: "⚡ Lightning (4-step)", defaults: { steps: 4 } },
    { id: "standard", group: "Variant", label: "Standard (20-step)", defaults: { steps: 20 } },
    { id: "q8", group: "Quant", label: "Q8", quant: "q8", defaults: {} },
  ],
  features: {
    variant_groups: {
      Variant: { label: "Variant", tooltip: "Distillation tier" },
      Quant: { label: "Quant", tooltip: "Quantization tier" },
    },
  },
}

const KIMODO_SPEC: Partial<FormSpec> = {
  defaults: { prompt: "", cfg: 4.5 },
  fields: [
    { name: "prompt", type: "textarea" },
    { name: "cfg", type: "number" },
  ],
  schema_groups: [
    { id: "prompt", label: "Prompt", zone: "params", order: 0, collapsed: false, fields: [
      { name: "prompt", type: "textarea", label: "Prompt", default: "", order: 1, width: 12 },
      { name: "cfg", type: "number", label: "CFG", default: 4.5, order: 2, width: 4 },
    ] },
  ],
  features: {},
}

function seedSpecRecord(service: string, spec: Partial<FormSpec>) {
  useSpecContractStore.setState({
    records: {
      [service]: { spec: formSpecStub(spec), state: "loaded", violations: [], error: null },
    },
  })
}

beforeEach(() => {
  useSpecContractStore.setState({ records: {} })
  vi.mocked(familiesForForm).mockReturnValue([
    { familyId: "qwen-edit", primaryRoute: "qwen-img-edit-2511", label: "Image Edit" },
    { familyId: "krea2", primaryRoute: "krea2", label: "Krea 2" },
  ])
})

afterEach(() => {
  cleanup()
})

describe("CardDetailBody — the zone anatomy (card-studio-pattern.md §4)", () => {
  it("edit mode renders the zones in anatomy order: Inputs → Model → Parameters → Mods → Outputs (outputs right rail)", async () => {
    seedSpecRecord("qwen-img-edit-2511", IMAGE_EDIT_SPEC)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn() }}
      />,
    )
    // The Outputs zone renders LAST — the right rail (2026-09-05
    // operator order: outputs sit RIGHT of the form). Its label above
    // the artifact area (the "No output yet" empty state renders
    // INSIDE it).
    const outputs = await waitFor(() => screen.getByText("Outputs"))
    const preview = await waitFor(() => screen.getByText(/No output yet/))
    const inputs = screen.getByText("Inputs")
    const model = screen.getByText("Model")
    const parameters = screen.getByText("Parameters")
    const mods = screen.getByText("Modifiers")
    expect(before(inputs, model)).toBe(true)
    expect(before(model, parameters)).toBe(true)
    expect(before(parameters, mods)).toBe(true)
    expect(before(mods, outputs)).toBe(true)
    expect(before(outputs, preview)).toBe(true)
    // The Parameters header belongs to the editor (the outer drilldown
    // label is suppressed in edit mode) — exactly ONE "Parameters".
    expect(screen.getAllByText("Parameters").length).toBe(1)
  })

  it("skip-empty: no model choices + no mods → no Model / Mods headers; Parameters still renders", async () => {
    vi.mocked(familiesForForm).mockReturnValue([{ familyId: "kimodo", primaryRoute: "kimodo", label: "Kimodo" }])
    // The record IS loaded (features have no variants/modifiers) — the
    // absence is skip-empty, not absence-of-data.
    seedSpecRecord("kimodo", KIMODO_SPEC)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage({ service: "kimodo", subtitle: "kimodo", params: { prompt: "dance", cfg: 4.5 } })}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn() }}
      />,
    )
    await waitFor(() => screen.getByLabelText("Prompt"))
    expect(screen.queryByText("Model")).toBeNull()
    expect(screen.queryByText("Mods")).toBeNull()
    expect(screen.getByText("Parameters")).toBeTruthy()
  })

  it("the Enhance wand stays inline with its field's label (same row, same wrapper)", async () => {
    seedSpecRecord("qwen-img-edit-2511", IMAGE_EDIT_SPEC)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn() }}
      />,
    )
    // getByLabelText("Prompt") would match BOTH the textarea AND the
    // Enhance button — the wrapping <label>'s content is exactly "Prompt"
    // (getLabelContent excludes the button's own text), and both are its
    // form controls. Role-scoped instead: textbox = the textarea.
    const textarea = await waitFor(() => screen.getByRole("textbox", { name: "Prompt" }))
    const enhance = screen.getByRole("button", { name: "Enhance" })
    // The prompt <label> wraps the label row (span + button) AND the
    // textarea — the wand is adjacent to the field, not hoisted away.
    expect(enhance.closest("label")).toBe(textarea.closest("label"))
  })

  it("read-only (no edit actions): no Model zone header; the drilldown Parameters label stays", async () => {
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage()}
        upstreams={[]}
        running={false}
        actions={{}}
      />,
    )
    expect(screen.getByText("Parameters")).toBeTruthy()
    expect(screen.queryByText("Model")).toBeNull()
    expect(screen.queryByText("Mods")).toBeNull()
    // The read-only grid shows the params it owns (steps, cfg — prompt
    // and the image slot belong to the editor / slot surfaces).
    expect(screen.getByText("steps")).toBeTruthy()
  })

  it("the Model zone renders ONE dropdown per variant axis — the folder rows, driven by features", async () => {
    seedSpecRecord("qwen-img-edit-2511-two-axis", TWO_AXIS_SPEC)
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage({ service: "qwen-img-edit-2511-two-axis", subtitle: "qwen-img-edit-2511" })}
        upstreams={[]}
        running={false}
        actions={{ onEditSave: vi.fn() }}
      />,
    )
    // Both axis headings from variant_groups (the yaml axis labels).
    await waitFor(() => screen.getByText("Variant"))
    expect(screen.getByText("Quant")).toBeTruthy()
    // The Variant axis lists the TWO FOLDER rows — the folder yaml
    // labels, exactly as the folder structure shows. Kit-Select
    // options portal on open: sweep every combobox (retry until the
    // async Model list populates) and collect the union.
    const options = new Set<string>()
    await waitFor(async () => {
      for (const box of screen.getAllByRole("combobox")) {
        fireEvent.click(box)
        const listbox = await screen.findByRole("listbox")
        for (const o of within(listbox).queryAllByRole("option")) {
          options.add(o.textContent ?? "")
        }
        fireEvent.keyDown(listbox, { key: "Escape", code: "Escape" })
        await waitFor(() => {
          expect(screen.queryByRole("listbox")).toBeNull()
        })
      }
      expect(options.has("⚡ Lightning (4-step)")).toBe(true)
    })
    expect(options).toContain("⚡ Lightning (4-step)")
    expect(options).toContain("Standard (20-step)")
    expect(options).toContain("Q8")
    // Three comboboxes on the row: the family select + one per axis.
    expect(screen.getAllByRole("combobox").length).toBe(3)
  })
})
