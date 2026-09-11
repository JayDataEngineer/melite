// input-slot-vocabulary.spec.tsx — the DECLARATIVE input vocabulary.
//
// The user's bug (2026-08-08): a revived qwen-image-edit card rendered NO
// input slot in the drilldown. Its params carried ``input_artifact`` — the
// FAMILY's param name (form_edit's input_param, what the agent writes and
// what the run protocol persists) — but the slot gate only knew the card
// vocabulary (input_image), and the frontend's slot list was a hand-
// maintained mirror that could drift. "The whole point of declarative,
// pydantic enforced system is to avoid this disgusting deviation cancer."
//
// The contract pinned here:
// 1. The vocabulary is catalog-fed: compile.py's input_vocabulary()
// (declared next to the forms) REPLACES the boot fallback on load.
// 2. normalizeSlotParams() folds family param names (input_artifact /
// image_artifact / glb_artifact) onto the slot keys at EVERY card
// materializer — addStage, hydrateRunStages, hydrateSpecSteps
// (+ the executed-params overlay). The AGENT path (hydrateDraft) skips
// the fold: the backend (drafts.py) folds before persisting the draft.
// 3. The user's exact card shape — revived qwen-image-edit run with
// input_artifact in the executed params — renders its Inputs section
// with the wireable square, and the input image is changeable.
//
// Mutation-proven: removing normalizeSlotParams from the hydrates (or the
// aliases from the vocabulary) fails the loadRun + render tests below.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

// The real @/lib/api module graph (modelCatalog) fires a background
// catalog fetch at module scope — stub it like the other store tests.
vi.mock("@melite/catalog/api", () => ({
  // getFormSpec uses apiFetch (raw Response) so it can shape the error
  // message with the status + body.error. Route form-spec URLs through
  // the apiJson mock so per-test spec bodies (vi.mocked(apiJson).mock…)
  // flow into getFormSpec without each test also re-mocking apiFetch.
  apiFetch: vi.fn(async (url: string) => {
    if (typeof url === "string" && url.startsWith("/v1/form-spec")) {
      const { apiJson } = await vi.importMock<typeof import("@melite/catalog/api")>("@melite/catalog/api")
      const body = await apiJson(url as never)
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" }
  }),
  apiJson: vi.fn(),
}))

vi.mock("sonner", () => {
  const fn = vi.fn()
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
    }
})

import { setInputVocabulary, normalizeSlotParams, inputSlots, hasInputSlots } from "@melite/catalog"
import { primeCatalog } from "@melite/catalog"
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { makeDraft } from "./__fixtures__/backendDraft"
import type { FlowRunStatus } from "@melite/catalog"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import { apiJson } from "@melite/catalog"

/** The catalog-declared vocabulary (compile.py input_vocabulary — the real
* shape the backend sends). Aliases = _INPUT_PARAM_TO_SLOT verbatim;
* form_aliases = _form_slot_aliases per form (2026-08-09 — the IMAGE1
* contract: form_edit's family params fold onto image1/image2/image3,
* while form_upscale's input_artifact stays on input_image). */
const CATALOG_VOCAB = {
  slots: [
    "first_frame", "last_frame", "input_image", "image1", "image2", "image3",
    "lanpaint_mask", "input_glb", "prev_motion_artifact",
    "reference_image", "input_mask", "source_image", "source_glb",
      ],
        aliases: {
          input_artifact: "input_image",
          image_artifact: "input_image",
          glb_artifact: "input_glb",
          first_frame: "first_frame",
          prev_motion_artifact: "prev_motion_artifact",
          input_image: "input_image",
        },
        form_aliases: {
          form_edit: {
            input_artifact: "image1",
            ref_artifact: "image2",
            image3_artifact: "image3",
        },
    form_upscale: { input_artifact: "input_image" },
        },
  // Per-form DECLARED slots (2026-08-10) — the form's CLOSED vocabulary:
  // the fold purges global-slot keys a form did not declare (stale
  // input_image on an edit card renders TWO squares for one slot).
  form_slots: {
    form_edit: ["image1", "image2", "image3"],
    form_upscale: ["input_image"],
        },
    }
    
  beforeEach(() => {
  // The catalog-fed state — the vocabulary the app has once /v1/model-catalog
  // has loaded (modelCatalog feeds it on every successful load).
    setInputVocabulary(CATALOG_VOCAB)
  useLibraryFlowStore.getState().clear()
})

  afterEach(() => {
  vi.clearAllMocks()
})

// ── normalizeSlotParams: family param names → slot keys ─────────────────

describe("normalizeSlotParams (family param names → slot keys)", () => {
  it("the user's card: input_artifact folds onto input_image, value preserved", () => {
    const out = normalizeSlotParams({
          model: "qwen-image-edit",
            target_size: "1024",
            input_artifact: "edited.png",
            output_artifact: "edited.png",
})
    expect(out.input_image).toBe("edited.png")
    expect("input_artifact" in out).toBe(false)
    // Non-slot params are untouched.
    expect(out.target_size).toBe("1024")
    expect(out.output_artifact).toBe("edited.png")
})

  it("an explicit slot value wins over the alias", () => {
    const out = normalizeSlotParams({ input_image: "picked.png", input_artifact: "old.png" })
    expect(out.input_image).toBe("picked.png")
    expect("input_artifact" in out).toBe(false)
})

  it("a real alias value wins over the null slot placeholder (the picker null-seed)", () => {
    const out = normalizeSlotParams({ input_image: null, input_artifact: "edited.png" })
    expect(out.input_image).toBe("edited.png")
})

  it("all declared aliases fold (image_artifact, glb_artifact); identity keys untouched", () => {
    expect(normalizeSlotParams({ image_artifact: "x.png" })).toEqual({ input_image: "x.png" })
    expect(normalizeSlotParams({ glb_artifact: "m.glb" })).toEqual({ input_glb: "m.glb" })
    const id = normalizeSlotParams({ first_frame: "f1.png", prev_motion_artifact: "p.npz", input_image: "i.png" })
    expect(id).toEqual({ first_frame: "f1.png", prev_motion_artifact: "p.npz", input_image: "i.png" })
})

  it("idempotent — a normalized card passes through unchanged", () => {
    const once = normalizeSlotParams({ input_artifact: "edited.png" })
    expect(normalizeSlotParams(once)).toEqual(once)
})
})

// ── The vocabulary is the catalog's declaration, not a mirror ────────────

describe("the vocabulary is catalog-fed (declarative — no mirrors)", () => {
  it("setInputVocabulary REPLACES the boot fallback — the catalog's declaration wins", () => {
    // end_image exists in the legacy boot fallback but NOT in the declared
    // vocabulary (the video card vocabulary is first_frame/last_frame).
    // After the catalog feeds, the gate must follow the declaration.
    setInputVocabulary({ slots: ["input_image"], aliases: {} })
    expect(inputSlots()).toEqual(["input_image"])
    expect(hasInputSlots({ end_image: "x.png" })).toBe(false)
    expect(hasInputSlots({ input_image: "x.png" })).toBe(true)
    // Restore for the other tests.
    setInputVocabulary(CATALOG_VOCAB)
})

  it("normalizeSlotParams is a no-op without the aliases (nothing hardcoded)", () => {
    setInputVocabulary({ slots: ["input_image"], aliases: {} })
    const out = normalizeSlotParams({ input_artifact: "x.png" })
    expect(out).toEqual({ input_artifact: "x.png" })
    setInputVocabulary(CATALOG_VOCAB)
})
})

// ── The user's card: revived qwen-image-edit run with input_artifact ─────

describe("the user's card — revived qwen-image-edit renders its input slot", () => {
  it("loadRun folds the executed input_artifact onto input_image (brick hydrate)", async () => {
    const status: FlowRunStatus = {
      run_id: "q_1",
        status: "completed",
      stages: [
        {
        id: "edit_image_0",
        name: "edit_image",
        index: 0,
        family_id: "edit_image",
        title: "Edit Image",
        status: "done",
          url: "/assets/runs/q_1/edited.png",
        inputs: [],
        outputs: ["edited_image"],
        params: {
          model: "qwen-image-edit",
            target_size: "1024",
            input_artifact: "edited.png",
            output_artifact: "edited.png",
        },
          secs: 65.2,
        },
      ],
    }
    await useLibraryFlowStore.getState().loadRun("my intent", status as never)
    
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.service).toBe("qwen-image-edit")
    expect(stage.params.input_image).toBe("edited.png")
    expect("input_artifact" in stage.params).toBe(false)
})

  it("the drilldown renders the Inputs section + square for the revived card, and the input image is changeable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ path: "data/input/new_input-abc12345.png" }),
    })))
    // The FULL chain: revive the run through the real store (normalizes
    // the executed input_artifact onto input_image), then render the
    // materialized card — exactly what the user sees.
    const status: FlowRunStatus = {
      run_id: "q_1",
        status: "completed",
      stages: [
        {
        id: "edit_image_0",
        name: "edit_image",
        index: 0,
        family_id: "edit_image",
        title: "Edit Image",
        status: "done",
          url: "/assets/runs/q_1/edited.png",
        inputs: [],
        outputs: ["edited_image"],
        params: {
          model: "qwen-image-edit",
            target_size: "1024",
            input_artifact: "edited.png",
            output_artifact: "edited.png",
        },
          secs: 65.2,
        },
      ],
    }
    await useLibraryFlowStore.getState().loadRun("my intent", status as never)
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    const onEditSave = vi.fn()
    renderWithTooltip(
      <CardDetailInline
        stage={{ ...stage, inputIndices: [] }}
        upstreams={[]}
        running={false}
        actions={{ onEditSave }}
      />,
    )
    // The Inputs section with the wireable square — the user's demand.
    expect(screen.getByText("Inputs")).toBeTruthy()
    expect(document.querySelectorAll("[data-slot-square]").length).toBeGreaterThan(0)
    const fileInput = document.querySelector('[data-slot-grid] input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    // The attached input is shown, and a new file pick writes through
    // onEditSave with the SLOT key (input_image — the backend resolves it).
    const file = new File(["fake"], "new_input.png", { type: "image/png" })
    act(() => {
      fireEvent.change(fileInput, { target: { files: [file] } })
})
    await waitFor(() => expect(onEditSave).toHaveBeenCalled())
    const last = onEditSave.mock.calls.at(-1)![1] as Record<string, unknown>
    expect(last.input_image).toBe("data/input/new_input-abc12345.png")
 vi.unstubAllGlobals()
})

  it("hydrateDraft (the agent path) adopts the backend-folded params AS-IS", async () => {
    // The slot-vocabulary fold (input_artifact → input_image) is BACKEND
    // logic now (drafts.py, covered by test_flow_drafts.py
    // TestSlotVocabularyFold) — the backend folds BEFORE persisting the
    // draft. Hydration must never re-fold: the store is a dumb renderer
    // (no second source of truth). The fixture carries the pre-folded
    // params exactly as the server would return them.
    await useLibraryFlowStore.getState().hydrateDraft(makeDraft("make it blue", [
        {
        title: "Edit Image",
        kind: "generation",
        service: "qwen-image-edit",
        params: { model: "qwen-image-edit", input_image: "img.png" },
        },
    ]))
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    expect(stage.params.input_image).toBe("img.png")
    expect("input_artifact" in stage.params).toBe(false)
})

  it("an edit card drops stale input_image once the form-spec loads", async () => {
    // The form_edit spec declares image1/image2/image3 (via form_slots) —
    // input_image is NOT among them. ParamEditor's purge uses the form's
    // DECLARED slots (formSlotsFor(spec.form)), so a stale input_image
    // key in the draft is dropped at spec-load, not just hidden from the
    // SlotGrid (defense in depth — the rendering fix in stageSlots is the
    // first gate; this is the data-level purge).
    vi.mocked(apiJson).mockResolvedValue({
      form: "form_edit",
      fields: [
        { name: "model", type: "text", label: "Model" },
          { name: "prompt", type: "textarea", label: "Prompt" },
        { name: "target_size", type: "text", label: "Target Size" },
      ],
      schema_groups: [
        { name: "text", label: "Text", fields: [
          { name: "prompt", type: "textarea", label: "Prompt" },
        ]},
      ],
      features: {} as never,
    } as never)
    // form_slots comes from the catalog vocabulary, not the spec — feed it.
    primeCatalog({
      families: {},
      models: { "qwen-image-edit": { family: "edit_image", form: "form_edit" } },
      input_vocabulary: {
        slots: ["input_image", "image1", "image2", "image3"],
        aliases: {},
        form_slots: { form_edit: ["image1", "image2", "image3"] },
        },
    } as never)
    
    const status: FlowRunStatus = {
      run_id: "q_edit_purge",
        status: "completed",
      stages: [{
        id: "edit_image_0",
        name: "edit_image",
        index: 0,
        family_id: "edit_image",
        title: "Edit Image",
        status: "done",
        url: "/assets/runs/q_edit_purge/edited.png",
        inputs: [],
        outputs: ["edited_image"],
        params: {
          model: "qwen-image-edit",
          prompt: "make it blue",
          input_image: "stale.png",
          image1: "real.png",
        },
        secs: 5.0,
      }],
    }
    await useLibraryFlowStore.getState().loadRun("intent", status as never)
    
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    const onEditSave = vi.fn()
    renderWithTooltip(
      <CardDetailInline
        stage={{ ...stage, inputIndices: [] }}
        upstreams={[]}
        running={false}
        actions={{ onEditSave }}
      />,
    )
    
    // The spec-load purge drops the stale input_image from the draft.
    // Wait for the spec to land (Target Size is spec-declared → renders
    // post-load), then assert the phantom square is gone.
    await waitFor(() => {
      expect(screen.queryByText("input_image")).toBeNull()
})
    // The form_edit square renders as image1 — never INPUT_IMAGE.
    expect(screen.getAllByText("image1").length).toBeGreaterThan(0)
})
})
