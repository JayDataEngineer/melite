// Modifier subcards — the L2/L3 gate (docs/design/modifier-subcards.md).
//
// What is proven here (and what is NOT):
// • Pure order semantics (applySubcardDrop / moveItem) — the drag contract.
// jsdom cannot simulate pointer drags; the drop-application logic is
// proven pure, the wiring is proven by the components below, and the
// physical drag is proven in the browser.
// • The mini-grid renders from the param bag (params.loras[] /
// params.controlnets[] ARE the storage — the wire shape, unchanged).
// • The leaf modal is the ONE editor: create (schema defaults honored),
// edit (patch → save), delete. All writes go through onSaveParams →
// updateStageParams (the existing cache-key/stale machinery).
// • The +N collapsed-tile hint.
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import type { ReactElement } from "react"
import { SubcardGrid } from "../surfaces/flow/SubcardGrid"
import { CardTile } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
import { loraIdOf, normalizeLoraEntry, subcardId, kindForId } from "@melite/contracts"
import {
 subcardsFromParams, subcardCount, loraLabel, moveItem,
 applySubcardDrop, newControlnetEntry, newLoraEntry, newGenericEntry,
 hasModifierCapability, modifiersFeatureOf, kindSpecOf,
 loraAdaptersOf, loraStrengthBoundsOf, cnEntriesOf,
 type ControlNetEntry,
 type ModifierKindSpec,
} from "@melite/contracts"

// Tip-bearing components (SubcardGrid/CardTile) require the global
// TooltipProvider.
const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

// ── Fixtures ───────────────────────────────────────────────────────────────
//
// Phase A finalé: the spec carries ONLY features.modifiers (the generic
// arbitrary-kind list — the legacy loras/controlnet feature keys are
// deleted server-side). The bespoke tile editors read their view shapes via
// the inverse projections (lorasFeatureOf / cnFeatureOf).

const SPEC = {
 features: {
 modifiers: [
 {
 kind: "controlnet", label: "ControlNet Stack", cardinality: "list",
 max_stack: 3, param_key: "controlnets",
 fields: [
 { name: "type", type: "select", label: "Type" },
 { name: "image_b64", type: "image", label: "Conditioning" },
 { name: "strength", type: "float", min: 0, max: 2, step: 0.05, default: 0.8, label: "Strength" },
 { name: "start_percent", type: "float", min: 0, max: 1, step: 0.05, default: 0, label: "Start" },
 { name: "end_percent", type: "float", min: 0, max: 1, step: 0.05, default: 1, label: "End" },
 ],
 options: [
 {
 value: "canny", label: "Canny", model: "canny.safetensors",
 defaults: { strength: 0.6 }, metadata: { preprocessor: "canny" },
 tooltip: "Edge preservation",
 },
 {
 value: "depth", label: "Depth", model: "depth.safetensors",
 metadata: { preprocessor: "depth_midas" },
 },
 ],
 },
 {
 kind: "lora", label: "LoRA Adapters", cardinality: "list",
 param_key: "loras", upload_dir: "loras",
 fields: [
 { name: "name", type: "string", label: "Adapter" },
 { name: "strength", type: "float", min: -2, max: 5, step: 0.05, default: 1, label: "Strength" },
 ],
 options: [
 { value: "anime.safetensors", label: "anime.safetensors", model: "loras/anime.safetensors" },
 { value: "detail.safetensors", label: "detail.safetensors", model: "loras/detail.safetensors" },
 ],
 },
 ],
 },
}

function cnEntry(over: Partial<ControlNetEntry> = {}): ControlNetEntry {
 return {
 id: "cn-1", type: "canny", model: "canny.safetensors",
 preprocessor: "canny", image_b64: "", strength: 0.8,
 enabled: true, source: "user", start_percent: 0, end_percent: 1,
 ...over,
 }
}

function stageWith(params: Record<string, unknown>): CardStage {
 return {
 id: "s1", title: "Test card", kind: "generation", service: "sd15",
 params, inputs: [], inputIndices: [], result: null,
 status: "pending", error: null,
 }
}

// ── Pure helpers ───────────────────────────────────────────────────────────

describe("modifierSubcards — derivation", () => {
 it("a strength-less lora row (the recipe landing's {id} stamp) projects a number — never undefined", () => {
 // The 2026-09-06 crash: LoraTile called .toFixed on undefined when a
 // recipe row landed without strength. The projection carries the 1.0
 // floor + strengthSet=false (the tile upgrades to the adapter default).
 const subs = subcardsFromParams({ loras: [{ id: "krea2_realism_lora" }] })
 expect(subs[0].strength).toBe(1.0)
 expect(subs[0].strengthSet).toBe(false)
 })
 it("an explicit strength row projects it verbatim with strengthSet=true", () => {
 const subs = subcardsFromParams({ loras: [{ id: "krea2_realism_lora", strength: 0.8 }] })
 expect(subs[0].strength).toBe(0.8)
 expect(subs[0].strengthSet).toBe(true)
 })
 it("subcardsFromParams projects the param bag 1:1", () => {
 const params = {
 loras: [{ id: "loras/anime.safetensors", strength: 1.2 }],
 controlnets: [cnEntry({ id: "cn-9", enabled: false })],
 }
 const subs = subcardsFromParams(params)
 expect(subs).toHaveLength(2)
 expect(subs[0]).toEqual(expect.objectContaining({
 id: "lora-loras/anime.safetensors", kind: "lora",
 label: "anime", enabled: true, strength: 1.2,
 }))
 expect(subs[1]).toEqual(expect.objectContaining({
 id: "cn-9", kind: "controlnet", label: "canny",
 enabled: false, strength: 0.8, type: "canny",
 }))
 })

 it("subcardCount counts both kinds; empty bag = 0", () => {
 expect(subcardCount({
 loras: [{ id: "a", strength: 1 }],
 controlnets: [cnEntry(), cnEntry({ id: "cn-2" })],
 })).toBe(3)
 expect(subcardCount({})).toBe(0)
 })

 it("loraLabel strips paths + extensions", () => {
 expect(loraLabel("loras/anime.safetensors")).toBe("anime")
 expect(loraLabel("styles/v2/x.pt")).toBe("x")
 expect(loraLabel("plain")).toBe("plain")
 })

 it("hasModifierCapability gates on the declared modifiers list", () => {
 expect(hasModifierCapability(SPEC)).toBe(true)
 // Explicit empty list = deliberate opt-out (a model that declares a
 // modifiers block with no kinds), same as absent.
 expect(hasModifierCapability({ features: { modifiers: [] } })).toBe(false)
 expect(hasModifierCapability({ features: {} })).toBe(false)
 expect(hasModifierCapability(null)).toBe(false)
 })

 // ── Phase C: arbitrary-kind proof ───────────────────────────────────────
 // The contract: features.modifiers (the generic list) drives the grid;
 // loras/controlnet are the first two instances, not the vocabulary. A
 // novel kind (clip_skip) passes the SAME shape and is rendered generically.

 it("modifiersFeatureOf reads features.modifiers when present (the new world)", () => {
 const clipSkip: ModifierKindSpec = {
 kind: "clip_skip", label: "CLIP Skip", cardinality: "scalar",
 param_key: "clip_skip",
 fields: [{ name: "count", type: "integer", min: -2, max: 12, default: -1 }],
 }
 const spec = { features: { modifiers: [clipSkip] } }
 expect(modifiersFeatureOf(spec)).toEqual([clipSkip])
 expect(hasModifierCapability(spec)).toBe(true)
 expect(kindSpecOf(spec, "clip_skip")).toEqual(clipSkip)
 expect(kindSpecOf(spec, "lora")).toBeNull()
 })

 it("loraAdaptersOf projects the lora kind spec to the adapter shape — the LoRA dropdown list", () => {
 // ONE contract entry: kindSpecOf(formSpec, "lora") — then the view.
 // The bespoke LoRA editor reads the SAME adapter shape the pre-finalé
 // features.loras carried — rebuilt 1:1 from the kind's options. This is
 // the frontend mirror of the backend's _option_to_legacy_cn (the
 // opposite direction), field-for-field.
 const kind = kindSpecOf(SPEC, "lora")
 expect(loraAdaptersOf(kind)).toEqual([
 {
 name: "anime.safetensors", filename: "loras/anime.safetensors",
 label: "anime.safetensors", category: "LoRA",
 default_strength: 1.0, prompt_hint: null, installed: true,
 },
 {
 name: "detail.safetensors", filename: "loras/detail.safetensors",
 label: "detail.safetensors", category: "LoRA",
 default_strength: 1.0, prompt_hint: null, installed: true,
 },
 ])
 // Strength bounds come from the kind's strength FIELD (one source).
 expect(loraStrengthBoundsOf(kind)).toEqual({ min: -2, max: 5, step: 0.05 })
 expect(loraAdaptersOf(null)).toEqual([])
 })

 it("cnEntriesOf projects the controlnet kind spec to the entries shape — the CN dropdown list", () => {
 const kind = kindSpecOf(SPEC, "controlnet")
 expect(kind?.max_stack).toBe(3)
 expect(cnEntriesOf(kind)).toEqual([
 {
 // Keys present-but-undefined: the fixture's canny option declares
 // no installed flag → the projection emits installed: undefined
 // (consumers read it as absent; newControlnetEntry stamps
 // installed: true on user-added entries).
 type: "canny", label: "Canny", tooltip: "Edge preservation",
 model: "canny.safetensors", default_strength: 0.6,
 preprocessor: "canny", installed: undefined,
 },
 {
 // Same for depth: no tooltip, no installed flag — both undefined.
 type: "depth", label: "Depth", tooltip: undefined,
 model: "depth.safetensors", default_strength: 0.8,
 preprocessor: "depth_midas", installed: undefined,
 },
 ])
 expect(cnEntriesOf(null)).toEqual([])
 })

 it("modifiersFeatureOf returns [] when no modifier capability is declared", () => {
 expect(modifiersFeatureOf({ features: {} })).toEqual([])
 expect(modifiersFeatureOf(null)).toEqual([])
 expect(hasModifierCapability({ features: {} })).toBe(false)
 })

 it("newGenericEntry builds a clip_skip scalar from the kind schema (no option)", () => {
 const clipSkip: ModifierKindSpec = {
 kind: "clip_skip", label: "CLIP Skip", cardinality: "scalar",
 param_key: "clip_skip",
 fields: [{ name: "count", type: "integer", min: -2, max: 12, default: -1 }],
 }
 const entry = newGenericEntry(clipSkip, 0)
 expect(entry).toEqual({ count: -1 }) // scalar: no id, field default applied
 })

 it("newGenericEntry refuses when a list kind is full (max_stack)", () => {
 const kind: ModifierKindSpec = {
 kind: "sampler_override", label: "Sampler", cardinality: "list",
 max_stack: 2, param_key: "sampler_overrides",
 fields: [{ name: "sampler", type: "select", options: ["euler"], default: "euler" }],
 }
 expect(newGenericEntry(kind, 2)).toBeNull() // full
 const entry = newGenericEntry(kind, 0)
 expect(entry).toEqual(expect.objectContaining({ sampler: "euler" }))
 expect(entry!.id).toMatch(/^cn-/) // list-kind entries get a drag id
 })
})

describe("modifierSubcards — order (the drag contract)", () => {
 it("moveItem preserves array order semantics", () => {
 const arr = ["a", "b", "c"]
 expect(moveItem(arr, 0, 2)).toEqual(["b", "c", "a"])
 expect(moveItem(arr, 2, 0)).toEqual(["c", "a", "b"])
 expect(moveItem(arr, 1, 1)).toBe(arr) // same position → same reference
 expect(moveItem(arr, -1, 1)).toBe(arr) // out of range → same reference
 expect(moveItem(arr, 0, 9)).toBe(arr)
 })

 it("applySubcardDrop reorders within a kind and leaves the other kind untouched", () => {
 const params = {
 loras: [{ id: "a.safetensors", strength: 1 }],
 controlnets: [cnEntry({ id: "cn-1" }), cnEntry({ id: "cn-2" })],
 }
 // The kinds list is the declared modifier vocabulary (from
 // modifiersFeatureOf) — the param_key lookup is data-driven now, not a
 // hardcoded kind→key ternary. A minimal fixture exercises the contract.
 const kinds: ModifierKindSpec[] = [
 { kind: "controlnet", label: "CN", cardinality: "list", param_key: "controlnets", fields: [] },
 { kind: "lora", label: "LoRA", cardinality: "list", param_key: "loras", fields: [] },
 ]
 const next = applySubcardDrop(params, "cn-1", "cn-2", kinds)
 expect((next.controlnets as ControlNetEntry[]).map((c) => c.id)).toEqual(["cn-2", "cn-1"])
 expect(next.loras).toBe(params.loras) // untouched reference
 })

 it("applySubcardDrop rejects cross-kind and unknown drops (same reference)", () => {
 const params = {
 loras: [{ id: "a.safetensors", strength: 1 }],
 controlnets: [cnEntry({ id: "cn-1" })],
 }
 const kinds: ModifierKindSpec[] = [
 { kind: "controlnet", label: "CN", cardinality: "list", param_key: "controlnets", fields: [] },
 { kind: "lora", label: "LoRA", cardinality: "list", param_key: "loras", fields: [] },
 ]
 expect(applySubcardDrop(params, "lora-a.safetensors", "cn-1", kinds)).toBe(params)
 expect(applySubcardDrop(params, "nope", "cn-1", kinds)).toBe(params)
 })
})

describe("modifierSubcards — add templates honor schema defaults", () => {
 // The bespoke CN editor consumes the kind spec directly (ONE contract
 // entry: kindSpecOf — no parallel feature shapes, 2026-08-11).
 const cnKind = kindSpecOf(SPEC, "controlnet")

 it("newControlnetEntry takes model/preprocessor/strength from the schema entry", () => {
 const e = newControlnetEntry([], "canny", cnKind)
 expect(e).toEqual(expect.objectContaining({
 type: "canny", model: "canny.safetensors", preprocessor: "canny",
 strength: 0.6, // option default_strength beats the feature default
 start_percent: 0, end_percent: 1, enabled: true, source: "user",
 }))
 expect(e!.id).toMatch(/^cn-/)
 })

 it("newControlnetEntry falls back to the feature default_strength when the entry has none", () => {
 const e = newControlnetEntry([], "depth", cnKind)
 expect(e!.strength).toBe(0.8) // the strength field's declared default
 expect(e!.model).toBe("depth.safetensors")
 })

 it("newControlnetEntry refuses when the stack is full (max_stack)", () => {
 const full = [cnEntry(), cnEntry({ id: "cn-2" }), cnEntry({ id: "cn-3" })]
 expect(newControlnetEntry(full, "depth", cnKind)).toBeNull()
 })

 it("newLoraEntry defaults strength to 1.0 (apply_loras' own default)", () => {
 expect(newLoraEntry("anime.safetensors")).toEqual({ id: "anime.safetensors", strength: 1.0 })
 })
})

// ── SubcardGrid (L2) + leaf modal (L3) ─────────────────────────────────────

describe("SubcardGrid — render", () => {
 it("renders mini tiles from the param bag with add tiles per capability", () => {
 const params = {
 loras: [{ id: "anime.safetensors", strength: 1.2 }],
 controlnets: [cnEntry({ image_b64: "data:image/png;base64,AAA" })],
 }
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={vi.fn()} toast={vi.fn()} />,
 )
 expect(container.querySelector('[data-subcard="lora-anime.safetensors"]')).toBeTruthy()
 const cnTile = container.querySelector('[data-subcard="cn-1"]')
 expect(cnTile).toBeTruthy()
 // CN hero renders the conditioning image
 expect(cnTile!.querySelector("img")).toHaveAttribute("src", "data:image/png;base64,AAA")
 // Strength readouts
 expect(cnTile!.textContent).toContain("0.80")
 // to say + mod and not + lora"). Picking a kind happens via the
 // [data-mod-pick] modal (portaled to document.body), not per-kind add tiles.
 expect(container.querySelector('[data-subcard-add="mod"]')).toBeTruthy()
 expect(container.querySelector('[data-subcard-add="lora"]')).toBeNull()
 expect(container.querySelector('[data-subcard-add="controlnet"]')).toBeNull()
 })

 it("disabled ControlNets dim (opacity-50)", () => {
 const params = { controlnets: [cnEntry({ enabled: false })] }
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={vi.fn()} toast={vi.fn()} />,
 )
 expect(container.querySelector('[data-subcard="cn-1"]')!.className).toContain("opacity-50")
 })

 it("renders only the capabilities the spec declares (rule 3)", () => {
 // A lora-only spec: the modifiers block declares the lora kind but no
 // controlnet kind → the lora row renders, the CN row does not.
 const loraOnly: Record<string, any> = {
 features: {
 modifiers: [
 {
 kind: "lora", label: "LoRA Adapters", cardinality: "list",
 param_key: "loras", upload_dir: "loras",
 fields: [{ name: "name", type: "string", label: "Adapter" }],
 options: [],
 },
 ],
 },
 }
 const { container } = renderWithTooltip(
 // One lora entry — 2026-08-14: EMPTY kind rows render nothing (a 0px
 // row still ate a full space-y slot — the dead-air fix), so the
 // declared-capability proof needs the row populated.
 <SubcardGrid
 stage={stageWith({ loras: [{ id: "anime.safetensors", strength: 1.2 }] })}
 formSpec={loraOnly}
 onSaveParams={vi.fn()}
 toast={vi.fn()}
 />,
 )
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard^="lora"]')).toBeTruthy()
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard^="controlnet"]')).toBeNull()
 })

 it("EMPTY kinds render no row — no dead air between the heading and the tiles (2026-08-14)", () => {
 // A 0px-tall empty row still ate a full space-y slot under its root:
 // a card declaring cn+lora+ip+ops stacked up to 3 phantom slots
 // between the "Modifiers" heading and the first tile (the user's
 // "way too much space" report). Rows render content or nothing —
 // the + Mod picker is the capability advertisement.
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith({})} formSpec={SPEC} onSaveParams={vi.fn()} toast={vi.fn()} />,
 )
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard]')).toBeNull()
 // The grid + the ONE add affordance stay — an empty card is never a
 // missing mod surface.
 expect(container.querySelector("[data-subcard-grid]")).toBeTruthy()
 expect(container.querySelector('[data-subcard-add="mod"]')).toBeTruthy()
 })

 // ── Phase C: arbitrary-kind render proof ────────────────────────────────
 // A NOVEL kind (clip_skip — not lora, not controlnet) declared in the
 // form-spec renders a row from the generic renderer with ZERO per-kind
 // code. This is the user's named example + the contract: a YAML block +
 // one @register applier = a working UI row. Inline scalar edit writes
 // params[param_key] (the wire the applier reads).

 it("renders a novel clip_skip row from features.modifiers (arbitrary-kind proof)", () => {
 const clipSkipSpec: Record<string, any> = {
 features: {
 modifiers: [
 {
 kind: "clip_skip", label: "CLIP Skip", cardinality: "scalar",
 param_key: "clip_skip",
 fields: [
 { name: "count", type: "integer", min: -2, max: 12, default: -1,
 label: "Skip layers", tooltip: "Negative = count from the last layer." },
 ],
 },
 ],
 },
 }
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid
 stage={stageWith({ clip_skip: { count: -1 } })}
 formSpec={clipSkipSpec}
 onSaveParams={onSave}
 toast={vi.fn()}
 />,
 )
 // The generic scalar row renders — data-subcard-row={kind} is the hook
 // the e2e + this test assert against. No lora/controlnet rows (the spec
 // declares only clip_skip).
 const row = container.querySelector('[data-subcard-row="clip_skip"]')
 expect(row).toBeTruthy()
 expect(row!.getAttribute("data-modifier-cardinality")).toBe("scalar")
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard^="lora"]')).toBeNull()
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard^="controlnet"]')).toBeNull()
 // The inline integer control seeds from params.clip_skip.count.
 const input = row!.querySelector('input[type="number"]') as HTMLInputElement
 expect(input).toBeTruthy()
 expect(input.value).toBe("-1")

 // Edit fires onScalarChange → commit params.clip_skip = { count: N }.
 fireEvent.change(input, { target: { value: "-2" } })
 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
 clip_skip: { count: -2 },
 }))
 })

 it("CN power toggle flips enabled without editing", () => {
 const params = { controlnets: [cnEntry()] }
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={onSave} toast={vi.fn()} />,
 )
 const toggle = container.querySelector('[data-subcard="cn-1"] button[aria-label="Disable (keep settings)"]')
 fireEvent.click(toggle!)
 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
 controlnets: [expect.objectContaining({ id: "cn-1", enabled: false })],
 }))
 })
})

describe("SubcardGrid — leaf modal edit flow", () => {
 it("clicking a CN tile opens the modal; editing strength + Save patches the entry", async () => {
 const params = { controlnets: [cnEntry({ strength: 0.8 })] }
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={onSave} toast={vi.fn()} />,
 )
 fireEvent.click(container.querySelector('[data-subcard="cn-1"]')!)

 // Modal opens (dialog portal) with the strength number input seeded.
 // Scoped by name: the CN modal also renders Start/End percent inputs
 // (all spinbuttons) — "spinbutton" alone is no longer unique.
 const input = await waitFor(() => screen.getByRole("spinbutton", { name: "Strength" }))
 expect(input).toBeTruthy()
 fireEvent.change(input, { target: { value: "1.5" } })

 // The modal's footer Save button
 const saveBtn = screen.getAllByRole("button", { name: "Save" })[0]
 fireEvent.click(saveBtn)

 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
 controlnets: [expect.objectContaining({ id: "cn-1", strength: 1.5 })],
 }))
 })

 it("edit-mode Remove deletes the entry", () => {
 const params = { controlnets: [cnEntry(), cnEntry({ id: "cn-2" })] }
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={onSave} toast={vi.fn()} />,
 )
 fireEvent.click(container.querySelector('[data-subcard="cn-1"]')!)
 fireEvent.click(screen.getByRole("button", { name: /Remove/ }))
 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
 controlnets: [expect.objectContaining({ id: "cn-2" })],
 }))
 })

 it("create mode appends an entry honoring schema defaults", async () => {
 const params: Record<string, unknown> = { controlnets: [] }
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={onSave} toast={vi.fn()} />,
 )
 // The generic "+ Mod" button opens a kind-picker MODAL (portaled to
 // document.body — the kind buttons live there, not in this container);
 // picking "controlnet" hands off to the SubcardModal create flow (same
 // as the old per-kind add tile did).
 fireEvent.click(container.querySelector('[data-subcard-add="mod"]')!)
 await waitFor(() => document.body.querySelector('[data-mod-pick="controlnet"]'))
 fireEvent.click(document.body.querySelector('[data-mod-pick="controlnet"]')!)

 // Choose "Depth" from the catalog-driven select
 // (base-ui SelectTrigger is role=combobox, not button)
 const trigger = await waitFor(() => screen.getByRole("combobox", { name: /Choose a ControlNet type/ }))
 fireEvent.click(trigger)
 const option = await waitFor(() => screen.getByRole("option", { name: /Depth/ }))
 // Real user gesture: pointerdown arms base-ui's mouse selection
 // (allowMouseSelectionRef), then the click commits. jsdom's bare
 // fireEvent.click is a "virtual" click that only commits the
 // auto-highlighted FIRST option — Depth is index 1, so the bare
 // event is correctly ignored (same as a keyboard activation would be).
 fireEvent.pointerDown(option)
 fireEvent.click(option)

 fireEvent.click(screen.getByRole("button", { name: "Add" }))
 expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
 controlnets: [expect.objectContaining({
 type: "depth", model: "depth.safetensors",
 preprocessor: "depth_midas", strength: 0.8, enabled: true,
 })],
 }))
 })

 it("create mode hides LoRA adapters already on the card", async () => {
 const params = { loras: [{ id: "anime.safetensors", strength: 1 }] }
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith(params)} formSpec={SPEC} onSaveParams={vi.fn()} toast={vi.fn()} />,
 )
 // Generic "+ Mod" → pick "lora" from the kind-picker modal → create modal.
 fireEvent.click(container.querySelector('[data-subcard-add="mod"]')!)
 await waitFor(() => document.body.querySelector('[data-mod-pick="lora"]'))
 fireEvent.click(document.body.querySelector('[data-mod-pick="lora"]')!)
 const trigger = await waitFor(() => screen.getByRole("combobox", { name: /Choose a LoRA/ }))
 fireEvent.click(trigger)
 const options = await waitFor(() => screen.getAllByRole("option"))
 // anime already stacked → only detail offered
 expect(options.map((o) => o.textContent)).toEqual([expect.stringContaining("detail")])
 })
})

// ── CardTile +N hint ───────────────────────────────────────────────────────

describe("CardTile — modifier count hint", () => {
 it("shows +N when the card carries modifier subcards", () => {
 const stage = stageWith({
 controlnets: [cnEntry(), cnEntry({ id: "cn-2" })],
 loras: [{ id: "anime.safetensors", strength: 1 }],
 })
 const { container } = renderWithTooltip(
 <CardTile stage={stage} running={false} index={0} onOpen={() => {}} onRemove={() => {}} />,
 )
 const hint = container.querySelector('[aria-label="Modifier subcards"]')
 expect(hint).toBeTruthy()
 expect(hint!.textContent).toBe("+3")
 })

 it("no hint when the card has no modifiers", () => {
 const { container } = renderWithTooltip(
 <CardTile stage={stageWith({ prompt: "hello" })} running={false} index={0} onOpen={() => {}} onRemove={() => {}} />,
 )
 expect(container.querySelector('[aria-label="Modifier subcards"]')).toBeNull()
 })
})

// ── 2026-09-06 fossil heal: a pre-flip {name} row must open, edit, and
// re-save as an id row — the crash class (loraLabel(undefined)) came from
// a fossil draft entering the modal with no id.
describe("SubcardGrid — fossil lora rows", () => {
 it("renders a {name} row's tile (label projected through loraIdOf) — no crash", () => {
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith({ loras: [{ name: "krea2_darkbrush", strength: 0.8 }] })}
 formSpec={SPEC} onSaveParams={vi.fn()} toast={vi.fn()} />,
 )
 expect(container.querySelector('[data-subcard-row="flow"] [data-subcard="lora-krea2_darkbrush"]')).toBeTruthy()
 })

 it("an edit commit MIGRATES the bag: the fossil leaves as {id}", () => {
 const save = vi.fn()
 const { container } = renderWithTooltip(
 <SubcardGrid stage={stageWith({ loras: [{ name: "krea2_darkbrush", strength: 0.8 }] })}
 formSpec={SPEC} onSaveParams={save} toast={vi.fn()} />,
 )
 fireEvent.click(container.querySelector('[data-subcard="lora-krea2_darkbrush"]')!)
 fireEvent.click(screen.getByRole("button", { name: /^Save$/ }))
 expect(save).toHaveBeenCalled()
 const saved = save.mock.calls[0][0] as { loras: Array<Record<string, unknown>> }
 expect(saved.loras).toEqual([{ id: "krea2_darkbrush", strength: 0.8 }])
 })
})

// the declared boundary type: fossils enter WITHOUT hand-casts, and a
// missing strength takes the 1.0 house default (the same default the
// catalog row seeds at compose).
describe("normalizeLoraEntry — the declared migration boundary", () => {
 it("takes LoraWireInput with no casts; fossil key migrates, strength defaults", () => {
 expect(loraIdOf({ name: "x" })).toBe("x")
 expect(normalizeLoraEntry({ name: "x", strength: 0.5 })).toEqual({ id: "x", strength: 0.5 })
 expect(normalizeLoraEntry({ name: "y" })).toEqual({ id: "y", strength: 1 })
 expect(normalizeLoraEntry({ id: "z" })).toEqual({ id: "z", strength: 1 })
 })
})

// the drag-id seam and the kind lookup (2026-09-06 gap plug) — the
// tile's stable identity and the modifier-bag kind resolution.
describe("subcardId / kindForId", () => {
 it("subcardId: id wins, the fossil name tolerates, controlnets key raw", () => {
 expect(subcardId("lora", { id: "x" })).toBe("lora-x")
 expect(subcardId("lora", { name: "x" })).toBe("lora-x")
 expect(subcardId("controlnet", { id: "cn" })).toBe("cn")
 expect(subcardId("controlnet", {})).toBe("")
 })

 it("kindForId: finds the owning many-bag, scalars never match", () => {
 const kinds = [
 { kind: "lora", param_key: "loras", cardinality: "many" },
 { kind: "controlnet", param_key: "controlnets", cardinality: "many" },
 { kind: "solo", param_key: "solo", cardinality: "scalar" },
 ] as unknown as ModifierKindSpec[]
 const params: Record<string, unknown> = { loras: [{ id: "a" }], controlnets: [], solo: {} }
 expect(kindForId(params, "lora-a", kinds)?.kind).toBe("lora")
 expect(kindForId(params, "lora-missing", kinds)).toBeNull()
 expect(kindForId(params, "cn-anything", kinds)).toBeNull()
 expect(kindForId(params, "solo", kinds)).toBeNull()
 })
})
