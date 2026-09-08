// card-detail-input-slots.test.tsx — proves the wireable slot squares
// (SlotGrid) in CardDetailInline (Phase A/B, 2026-08-08).
//
// Every input slot a card declares (input_image / reference_image /
// first_frame / last_frame / …) renders ONE SlotSquare at the top of the
// card — file / asset / WIRE to an earlier card (a LIVE reference,
// wireable BEFORE the upstream has run). A slot is wired OR manually
// attached, never both: wiring writes inputs[i] via onWireSlot AND clears
// params[slot] via onEditSave; manual attach writes params[slot] AND
// unwires. The picker lists PRIOR stages by ARRAY INDEX (F4 — ids are
// random, the old id<compare was broken), no-result stages included.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
import { editorClient } from "../rpc/editorClient"
import { setInputVocabulary } from "@melite/catalog"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

// The drilldown fetches the form-spec per service through the CONTRACT
// store (useSpecContractStore.loadFormSpec → editorClient.getFormSpec →
// validateSpecContract). Stub the wire: `{ features: {} }` is a contract
// VIOLATION (no modifiers array) — deliberately NOT cached, so the LoRA
// test's per-test MODIFIER_SPEC stub (via editorClient.getFormSpec) always
// refetches. The old direct loadFormSpec mock died with Door B.
vi.mock("../rpc/editorClient", () => ({
 editorClient: { getFormSpec: vi.fn().mockResolvedValue({ fields: [], schema_groups: [], features: {} }) },
}))

/** The edit card's declared modifier spec — LoRA/ControlNet are MOD wire
 * locations (param_keys loras/controlnets), never standalone params. */
const MODIFIER_SPEC: Record<string, any> = {
 // THE FORM IS THE CARD (2026-08-18): only spec-declared fields render.
 // seed is a genuine scalar param the spec must DECLARE (label falls back
 // to the key, "seed") — the old undeclared-draft fallback row is gone.
 fields: [{ name: "seed", type: "number" }],
 schema_groups: [], // spec-contract gate: validator refuses an absent groups array
 features: {
 modifiers: [
 {
 kind: "controlnet", label: "ControlNet Stack", cardinality: "list",
 max_stack: 3, param_key: "controlnets",
 fields: [{ name: "type", type: "select", label: "Type" }],
 options: [{ value: "depth", label: "Depth", model: "x" }],
 },
 {
 kind: "lora", label: "LoRA Adapters", cardinality: "list",
 param_key: "loras", upload_dir: "loras",
 fields: [{ name: "name", type: "string", label: "Adapter" }],
 options: [{ value: "anime.safetensors", label: "anime.safetensors" }],
 },
 ],
 },
}

function makeStage(over: Partial<CardStage> = {}): CardStage {
 return {
 id: "s0",
 title: "Edit image",
 subtitle: "qwen-edit",
 kind: "generation",
 service: "qwen-edit-base",
 params: { prompt: "make it blue", input_image: null },
 inputs: [],
 inputIndices: [],
 result: null,
 status: "pending",
 meta: {},
 ...over,
 }
}

describe("CardDetailInline — wireable slot squares (SlotGrid)", () => {
 it("renders an Inputs section with one square per declared slot", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(screen.getByText("Inputs")).toBeTruthy()
 expect(screen.getByText("input_image")).toBeTruthy()
 })

 it("lays video-gen's slots side by side — one square per declared slot", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 id: "s1",
 title: "Video gen",
 params: { prompt: "", first_frame: null, last_frame: null },
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 // Both squares render — the "card within card" layout.
 expect(screen.getByText("first_frame")).toBeTruthy()
 expect(screen.getByText("last_frame")).toBeTruthy()
 const squares = document.querySelectorAll("[data-slot-square]")
 expect(squares.length).toBe(2)
 })

 it("edit cards render FOUR squares — image1/image2/image3 + lanpaint_mask side by side", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 id: "s-edit",
 params: { prompt: "", image1: null, image2: null, image3: null, lanpaint_mask: null },
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 // The 4-slot grid (2026-08-08/09): Edit Image receives up to 3 images —
 // the IMAGE1 vocabulary (the edit card's primary slot is image1, NOT
 // (lanpaint_mask — wireable from input_prep's ``mask`` optional
 // output). Null-seeded so the card renders all squares from the start;
 // the wire picker threads the named output through.
 expect(screen.getByText("image1")).toBeTruthy()
 expect(screen.getByText("image2")).toBeTruthy()
 expect(screen.getByText("image3")).toBeTruthy()
 expect(screen.getByText("lanpaint_mask")).toBeTruthy()
 expect(screen.queryByText("input_image")).toBeNull()
 expect(document.querySelectorAll("[data-slot-square]").length).toBe(4)
 })

 it("the OUTPUT preview renders RIGHT of the form — AFTER the Inputs section in DOM", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 result: { assetUrls: ["/out.png"], artifacts: {}, metadata: {} },
 status: "done",
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 // The hero preview is an img with the title-based alt (the service
 // route is never alt text — a dead <img> renders its alt as document
 // content, the 2026-09-05 "krea-2" cards); the Inputs section header
 // is the "Inputs" label. Output follows inputs in the DOM (2026-09-05
 // operator order: the outputs rail sits RIGHT of the form).
 const preview = document.querySelector('img[alt="Edit image output"]') as HTMLImageElement
 const inputsHeader = screen.getByText("Inputs")
 expect(preview).toBeTruthy()
 const position = preview.compareDocumentPosition(inputsHeader)
 expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
 })

 it("does NOT render the section for kind:input (InputCardEditor owns source)", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 kind: "input",
 service: "input",
 title: "Input / Media Prep",
 params: { source: null },
 })}
 upstreams={[]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(screen.queryByText("Inputs")).toBeNull()
 // The InputCardEditor is rendered instead.
 expect(screen.getByText("Source")).toBeTruthy()
 })

 it("does NOT render the section when the stage has no input slots", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({ params: { prompt: "no slots here" } })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(screen.queryByText("Inputs")).toBeNull()
 })

 it("wire BEFORE the upstream has run: the picker lists no-result stages as 'not run yet'", () => {
 const onEditSave = vi.fn()
 const onWireSlot = vi.fn()
 const gen: CardStage = makeStage({ id: "s-gen", title: "Generate image", params: { prompt: "" } })
 const edit: CardStage = makeStage({ id: "s-edit" })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[gen, edit]}
 running={false}
 actions={{ onEditSave, onWireSlot }}
 />,
 )
 // Open the wire picker via the square's wire button.
 fireEvent.click(screen.getByRole("button", { name: "Wire input_image from an earlier card" }))
 // The upstream is listed even though it has NOT run — that's the point
 // of a live wire (the old frozen-URL picker only offered stages with
 // results).
 expect(screen.getByText("Generate image")).toBeTruthy()
 expect(screen.getByText("not run yet")).toBeTruthy()
 // Wiring writes BOTH sides of the contract: inputs[i] = id (store) and
 // params[slot] = null (cleared — the falsy injection guard reads params).
 fireEvent.click(screen.getByText("Generate image"))
 expect(onWireSlot).toHaveBeenCalledWith("s-edit", "input_image", "s-gen", null)
 expect(onEditSave).toHaveBeenCalledWith("s-edit", { input_image: null }, undefined, { userEdit: true })
 })

 it("the picker excludes the stage itself and later stages (array index)", () => {
 const onEditSave = vi.fn()
 const onWireSlot = vi.fn()
 const gen: CardStage = makeStage({ id: "s-gen", title: "Generate image", params: { prompt: "" } })
 const edit: CardStage = makeStage({ id: "s-edit" })
 const later: CardStage = makeStage({
 id: "s-later",
 title: "Later stage",
 params: { prompt: "" },
 result: { assetUrls: ["/later.png"], artifacts: {}, metadata: {} },
 status: "done",
 })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[gen, edit, later]}
 running={false}
 actions={{ onEditSave, onWireSlot }}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Wire input_image from an earlier card" }))
 expect(screen.getByText("Generate image")).toBeTruthy()
 expect(screen.queryByText("Later stage")).toBeNull()
 })

 it("a wired square shows the upstream's LIVE title + thumbnail", () => {
 const gen: CardStage = makeStage({
 id: "s-gen",
 title: "Generate image",
 params: { prompt: "" },
 result: { assetUrls: ["/gen.png"], artifacts: {}, metadata: {} },
 status: "done",
 })
 const edit: CardStage = makeStage({
 id: "s-edit",
 inputs: ["s-gen"],
 })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[gen, edit]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(screen.getByText("Generate image")).toBeTruthy()
 // The live artifact renders as the square's thumbnail.
 const img = document.querySelector('[data-slot-square] img') as HTMLImageElement
 expect(img?.src).toMatch(/gen\.png$/)
 })

 it("manual attach (asset drop) unwires the slot — onWireSlot(slot, null) + save", () => {
 const onEditSave = vi.fn()
 const onWireSlot = vi.fn()
 const gen: CardStage = makeStage({
 id: "s-gen",
 title: "Generate image",
 params: { prompt: "" },
 result: { assetUrls: ["/gen.png"], artifacts: {}, metadata: {} },
 status: "done",
 })
 const edit: CardStage = makeStage({ id: "s-edit", inputs: ["s-gen"] })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[gen, edit]}
 running={false}
 actions={{ onEditSave, onWireSlot }}
 />,
 )
 const square = document.querySelector("[data-slot-square]") as HTMLElement
 const payload = JSON.stringify({
 url: "/v1/assets/cat.png",
 type: "image",
 name: "cat.png",
 id: "asset_1",
 })
 act(() => {
 fireEvent.drop(square, {
 dataTransfer: {
 types: ["application/tech-noir-asset"],
 files: [],
 getData: (mime: string) =>
 mime === "application/tech-noir-asset" ? payload : "",
 },
 } as unknown as React.DragEvent)
 })
 // Manual attach writes params AND unwires — never both populated.
 expect(onEditSave).toHaveBeenCalledWith("s-edit", { input_image: "/v1/assets/cat.png" }, undefined, { userEdit: true })
 expect(onWireSlot).toHaveBeenCalledWith("s-edit", "input_image", null, null)
 vi.unstubAllGlobals()
 })

 it("file pick UPLOADS and writes the estate path (never a data: URL) — 2026-09-06 rail", async () => {
 const onEditSave = vi.fn()
 const onWireSlot = vi.fn()
 // the upload door: bytes in, estate path out
 const uploads = vi.fn(async () => ({
 ok: true,
 text: async () => JSON.stringify({ path: "data/input/cat-abc12345.png" }),
 }))
 vi.stubGlobal("fetch", uploads)
 const edit: CardStage = makeStage({ id: "s-edit" })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[edit]}
 running={false}
 actions={{ onEditSave, onWireSlot }}
 />,
 )
 const file = new File(["fake"], "cat.png", { type: "image/png" })
 const input = document.querySelector('[data-slot-grid] input[type="file"]') as HTMLInputElement
 expect(input).toBeTruthy()
 act(() => {
 fireEvent.change(input, { target: { files: [file] } })
 })
 await waitFor(() => expect(onEditSave).toHaveBeenCalled())
 // the upload door was actually called
 expect(uploads).toHaveBeenCalledWith("/v1/uploads", expect.objectContaining({ method: "POST" }))
 const last = onEditSave.mock.calls.at(-1)![1] as Record<string, unknown>
 expect(last.input_image).toBe("data/input/cat-abc12345.png")
 expect(onWireSlot).toHaveBeenCalledWith("s-edit", "input_image", null, null)
 })


 it("Detach clears both sides — params null + unwire", () => {
 const onEditSave = vi.fn()
 const onWireSlot = vi.fn()
 const gen: CardStage = makeStage({
 id: "s-gen",
 title: "Generate image",
 params: { prompt: "" },
 result: { assetUrls: ["/gen.png"], artifacts: {}, metadata: {} },
 status: "done",
 })
 const edit: CardStage = makeStage({ id: "s-edit", inputs: ["s-gen"] })
 renderWithTooltip(
 <CardDetailInline
 stage={edit}
 upstreams={[gen, edit]}
 running={false}
 actions={{ onEditSave, onWireSlot }}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Detach" }))
 expect(onEditSave).toHaveBeenCalledWith("s-edit", { input_image: null }, undefined, { userEdit: true })
 expect(onWireSlot).toHaveBeenCalledWith("s-edit", "input_image", null, null)
 })

 it("no wire affordance when actions.onWireSlot is absent (manual-attach-only)", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(document.querySelector("[data-slot-wire]")).toBeNull()
 // File + drop paths still work (onSaveParams is wired to onEditSave).
 expect(document.querySelector('[data-slot-grid] input[type="file"]')).toBeTruthy()
 })
})

describe("LoRA is a MOD, never a standalone row (2026-08-09)", () => {
 // The verdict store is a module-level singleton — a "loaded" record for
 // qwen-edit-base would short-circuit the per-test getFormSpec stubs below
 // (loadFormSpec returns early on cached loaded/loading). Each test starts
 // from a clean verdict map so its wire stub actually fires.
 beforeEach(() => {
  useSpecContractStore.setState({ records: {} })
 })

 const MOD_CARD = () =>
 makeStage({
 service: "qwen-edit-base",
 params: {
 prompt: "make it blue",
 seed: 42,
 loras: [{ name: "anime.safetensors", strength: 0.8 }],
 controlnets: [{ id: "cn-1", type: "depth", strength: 0.6 }],
 },
 })

 it("edit mode: mod bags render as subcards only — no raw JSON rows in the free-text grid", async () => {
 // addition." Both param surfaces (the read-only grid AND the edit-mode
 // free-text grid) skip the spec's DECLARED modifier param_keys —
 // nothing hardcoded. The edit surface renders ParamEditor (editing is
 // derived from onEditSave) and the SubcardGrid.
 // The contract store fetches via editorClient.getFormSpec — the single
 // wire stub. (The old direct loadFormSpec mock died with Door B.)
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(MODIFIER_SPEC as never)
 renderWithTooltip(
 <CardDetailInline
 stage={MOD_CARD()}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 // The specs land async — the skips (and the SubcardGrid gate) follow.
 await waitFor(() => expect(editorClient.getFormSpec).toHaveBeenCalled())
 // No standalone rows for the mod bags — not in the edit grid, either.
 expect(screen.queryByText("loras")).toBeNull()
 expect(screen.queryByText("controlnets")).toBeNull()
 // The subcard grid (the declared home of the mods) IS rendered — the
 // "Modifiers" section with the LoRA entry as a TILE (extension-stripped
 // label "anime"), not a param row.
 expect(screen.getByText("Modifiers")).toBeTruthy()
 expect(screen.getByText("anime")).toBeTruthy()
 // The genuine scalar param still renders.
 expect(screen.getByText("seed")).toBeTruthy()
 })

 it("read-only mode: no raw loras/controlnets rows, and no subcard grid (no authoring)", async () => {
 // Without onEditSave the drilldown is read-only — the read-only grid
 // must still skip the DECLARED modifier bags (the spec is fetched for
 // every drilldown now, 2026-08-09), and the SubcardGrid stays hidden.
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(MODIFIER_SPEC as never)
 renderWithTooltip(
 <CardDetailInline
 stage={MOD_CARD()}
 upstreams={[makeStage()]}
 running={false}
 actions={{}}
 />,
 )
 await waitFor(() => expect(editorClient.getFormSpec).toHaveBeenCalled())
 expect(screen.queryByText("loras")).toBeNull()
 expect(screen.queryByText("controlnets")).toBeNull()
 // The subcard grid is authoring-only — the mods are declared mods,
 // so read-only shows neither rows nor a grid (never raw JSON).
 expect(screen.queryByText("Modifiers")).toBeNull()
 expect(screen.queryByText("anime")).toBeNull()
 // The genuine scalar param still renders.
 expect(screen.getByText("seed")).toBeTruthy()
 })

 it("spec fetch failure renders a visible error banner — never a silent drop (2026-08-11)", async () => {
 // z-image incident: the endpoint 500'd (families-import NameError) and
 // the mod grid vanished with zero signal — the catalog declared 7
 // controlnets, the UI showed none. A fetch failure MUST render a
 // visible error with the server's message; the drop can never be
 // invisible again.
 vi.mocked(editorClient.getFormSpec).mockReset()
 vi.mocked(editorClient.getFormSpec).mockRejectedValue(
 new Error(
 "form-spec z-image failed (500): name 'ExtensionRequirement' is not " +
 "defined [at llm_text.py:228]",
 ),
 )
 renderWithTooltip(
 <CardDetailInline
 stage={MOD_CARD()}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 await waitFor(() => expect(editorClient.getFormSpec).toHaveBeenCalled())
 // 2026-08-11: the store pauses for its ONE automatic re-probe before
 // recording error (the gateway-flap self-heal) — during that pause the
 // LOADING face is up. A failed fetch is never an invisible empty form.
 await waitFor(() => expect(screen.getByTestId("modifiers-spec-loading")).toBeTruthy())
 expect(screen.queryByTestId("modifiers-spec-error")).toBeNull()
 // The re-probe also fails (gateway genuinely down) → the red banner
 // lands, still with the server's error text (actionable).
 await waitFor(() => expect(screen.getByTestId("modifiers-spec-error")).toBeTruthy(), { timeout: 6000 })
 expect(screen.getByText(/Modifiers failed to load/)).toBeTruthy()
 // The mods face carries the actionable server text… (scoped: the
 // ParamEditor form-level verdict face renders the SAME message — both
 // surfaces fail loud, 2026-08-12).
 expect(within(screen.getByTestId("modifiers-spec-error")).getByText(/llm_text\.py:228/)).toBeTruthy()
 // …and so does the FORM-level verdict face (the whole card form is
 // replaced, never a degraded raw draft next to a failed mod grid).
 expect(screen.getByTestId("card-spec-verdict")).toBeTruthy()
 expect(screen.getByText(/Card form unavailable/)).toBeTruthy()
 // The subcard grid itself must NOT render (no phantom "Modifiers"
 // section claiming capabilities that failed to load).
 expect(screen.queryByText("Modifiers")).toBeNull()
 // Retry affordances exist — both the mods face and the form face have
 // one; the next service change isn't the only way back.
 expect(screen.getAllByText("Retry").length).toBeGreaterThanOrEqual(1)
 })
})

// ── the mask is a MOD via the ADD BUTTON, never a main input (2026-09-05) ─
// Operator order, verbatim: "THERE WAS A BUTTON WE HAD TO ADD [REDACTED 2026-11-05]
// MODS... YOU ADDED A MENU, I DIDN'T WANT THAT" + "THE LORAS DON'T MAP,
// I DON'T SEE MY KREA2 LORAS... RUNTIME VALIDATION" + outputs right of
// the form. The menu sections are DELETED: the mask rides the Mods
// button beside LoRA/ControlNet as an addable tile kind (features.
// modifiers), the lora picker lists the served catalog (krea2 rows
// included), and Outputs sits RIGHT of the form.
const BUTTON_MOD_SPEC: Record<string, any> = {
 fields: [
 { name: "prompt", type: "textarea", label: "Prompt" },
 { name: "input_image", type: "image", label: "Image" },
 ],
 schema_groups: [
 { id: "input", label: "Input", order: 1, zone: "inputs",
 fields: [{ name: "input_image", type: "image", label: "Image" }] },
 ],
 features: {
 modifiers: [
 {
 kind: "lora", label: "LoRA Adapters", cardinality: "list",
 param_key: "loras", upload_dir: "models/loras",
 fields: [{ name: "name", type: "string", label: "Adapter" }],
 options: [
 { value: "krea2_realism_lora", label: "krea2_realism_lora" },
 { value: "krea2_turbo_lora_rank_64_bf16", label: "krea2_turbo_lora_rank_64_bf16" },
 ],
 },
 {
 kind: "mask", label: "Region Mask", cardinality: "list",
 max_stack: 1, param_key: "mask",
 fields: [
 { name: "input_mask", type: "image", label: "Region Mask" },
 { name: "mask_mode", type: "select", label: "Mode", default: "auto",
 options: [{ value: "auto", label: "Auto" }] },
 { name: "mask_grow", type: "float", label: "Grow / Shrink", default: 8, min: -64, max: 64 },
 ],
 },
 ],
 },
 defaults: {},
}

it("mask rides the ADD button — no menu section, never in the main Inputs grid", async () => {
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(BUTTON_MOD_SPEC as never)
 setInputVocabulary({
 slots: ["input_image", "image2", "image3", "input_mask"],
 form_slots: {},
 model_slots: { "qwen-img-edit-2511": ["image2", "image3", "input_image"] },
 })
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 id: "s-mask",
 service: "qwen-img-edit-2511",
 params: { prompt: "", input_image: null },
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 await waitFor(() => expect(editorClient.getFormSpec).toHaveBeenCalled())
 // the Mods zone is up with the ONE add affordance. The zone
 // carries NO text header in the shipped tree (the grid + button
 // ARE the zone; CardDetailModal's "no capability → no zone" gate
 // is the zone's only presence contract) — wait on the button
 // itself, the zone's stable data hook. (2026-09-07 hardening:
 // this waited on a "Mods" header text that never rendered — the
 // case was red-by-design from birth, not a flake.)
 await waitFor(() => {
 expect(
 document.querySelector('[data-subcard-add="mod"]'),
 ).toBeTruthy()
 })
 // …and NO menu section anywhere (the deleted ModGroupSections surface)
 expect(document.querySelector("[data-mod-group]")).toBeNull()
 // the MAIN Inputs grid carries only the input-zoned square
 const mainText = (document.querySelector("[data-slot-grid]") as HTMLElement)
 .textContent ?? ""
 expect(mainText.includes("input_image")).toBe(true)
 expect(mainText.includes("input_mask")).toBe(false)
 expect(mainText.includes("Region Mask")).toBe(false)
 vi.mocked(editorClient.getFormSpec).mockReset()
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(
 { fields: [], schema_groups: [], features: {} } as never)
})

it("the add picker offers the mask kind — Add writes params.mask and tiles 'Region Mask'", async () => {
 const onEditSave = vi.fn()
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(BUTTON_MOD_SPEC as never)
 setInputVocabulary({
 slots: ["input_image"],
 form_slots: {},
 model_slots: { "qwen-img-edit-2511": ["input_image"] },
 })
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 id: "s-mask-add",
 service: "qwen-img-edit-2511",
 params: { prompt: "", input_image: null },
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave }}
 />,
 )
 await waitFor(() => {
 expect(document.querySelector('[data-subcard-add="mod"]')).toBeTruthy()
 })
 fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
 // the picker lists the mask kind beside lora (portaled to body)
 await waitFor(() => {
 expect(document.querySelector('[data-mod-pick="mask"]')).toBeTruthy()
 })
 expect(document.querySelector('[data-mod-pick="lora"]')).toBeTruthy()
 fireEvent.click(document.querySelector('[data-mod-pick="mask"]') as HTMLElement)
 // optionless kind → bare-field create: the Add button commits defaults
 await waitFor(() => {
 expect(screen.getByText("Add", { selector: "button" })).toBeTruthy()
 })
 fireEvent.click(screen.getByText("Add", { selector: "button" }))
 await waitFor(() => {
 expect(onEditSave).toHaveBeenCalled()
 })
 const written = onEditSave.mock.calls.map((c) => c[1])
 const maskWrite = written.find((p) => p && Array.isArray((p as any).mask))
 expect(maskWrite).toBeTruthy()
 expect(((maskWrite as any).mask[0].mask_mode)).toBe("auto")
 vi.mocked(editorClient.getFormSpec).mockReset()
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(
 { fields: [], schema_groups: [], features: {} } as never)
})

it("Outputs sits RIGHT of the form — the rail follows the scroll column in DOM", async () => {
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(BUTTON_MOD_SPEC as never)
 setInputVocabulary({
 slots: ["input_image"],
 form_slots: {},
 model_slots: { "qwen-img-edit-2511": ["input_image"] },
 })
 const { container } = renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 id: "s-rail",
 service: "qwen-img-edit-2511",
 params: { prompt: "", input_image: null },
 result: {
 assetUrls: ["http://localhost:1/out.png"],
 metadata: {},
 } as never,
 })}
 upstreams={[makeStage()]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 await waitFor(() => expect(editorClient.getFormSpec).toHaveBeenCalled())
 const body = container.querySelector("[data-card-detail-body]") as HTMLElement
 expect(body).toBeTruthy()
 const kids = Array.from(body.children)
 const outputsIdx = kids.findIndex((k) =>
 (k as HTMLElement).querySelector('[data-zone="outputs"]'))
 // the outputs rail is the LAST column (form scrolls left of it)
 expect(outputsIdx).toBe(kids.length - 1)
 vi.mocked(editorClient.getFormSpec).mockReset()
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(
 { fields: [], schema_groups: [], features: {} } as never)
})
