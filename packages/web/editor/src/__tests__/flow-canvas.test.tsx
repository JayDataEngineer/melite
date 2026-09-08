// flow-canvas.test.tsx — proves the USER-AUTHORING card surface is real.
//
// The canvas (FlowCanvas) reads from useLibraryFlowStore. The authoring
// methods (startFlow / addStage / removeStage / setStageInput) are the
// user-driven equivalent of the agent's buildFlow. This test drives them
// directly and asserts the canvas renders the result — the same render path
// the browser uses, no shortcuts.
//
// Design (2026-08-07): cards are DENSE TILES that tile in a flex-wrap. Clicking
// a tile EXPANDS IT INLINE — no modal popup. The focused card grows to full
// width and shows the same detail body the modal used to (CardDetailInline →
// CardDetailBody — 1:1 with the agent tab's detail); every other card shrinks
// to a compact tile. Wiring + the schema-driven Modifiers trigger live in the
// inline expand.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import type { ReactElement } from "react"
import { FlowCanvas } from "../surfaces/flow/FlowCanvas"
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { editorClient } from "../rpc/editorClient"

// jsdom lacks Element.getAnimations (base-ui ScrollArea calls it on a timer).
if (typeof Element !== "undefined" && !(Element.prototype as { getAnimations?: unknown }).getAnimations) {
 ;(Element.prototype as { getAnimations: () => unknown[] }).getAnimations = () => []
}

vi.mock("../rpc/editorClient", () => ({
 editorClient: { getFormSpec: vi.fn() },
}))

// THE CATALOG GATE (2026-08-22): the zoom door awaits loadCatalog too (the
// Inputs zone reads formOf from the catalog cache) — resolve instantly so
// the reveal lands within the tests' waitFor windows.
vi.mock("@melite/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@melite/catalog")>()),
  loadCatalog: vi.fn(async () => ({
    families: {},
    models: {},
    capabilities: null,
    engine_order: null,
    quant_order: null,
    input_vocabulary: null,
  })),
}))

const IMAGE_CAPABILITY_SPEC: Record<string, any> = {
 fields: [] as unknown[], schema_groups: [] as unknown[],
 features: {
 // Phase A finalé: the spec carries ONLY features.modifiers (the generic
 // arbitrary-kind list — the legacy loras/controlnet feature keys are
 // deleted server-side). Same shape as modifier-subcards.test.tsx.
 modifiers: [
 {
 kind: "controlnet", label: "ControlNet Stack", cardinality: "list",
 max_stack: 3, param_key: "controlnets",
 fields: [
 { name: "type", type: "select", label: "Type" },
 { name: "strength", type: "float", min: 0, max: 2, step: 0.05, default: 0.8, label: "Strength" },
 ],
 options: [
 { value: "depth", label: "Depth", model: "x", metadata: { preprocessor: "depth" } },
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
 ],
 },
 ],
 },
}

beforeEach(() => {
 // Reset the store between tests so flows don't leak.
 useLibraryFlowStore.getState().clear()
 vi.mocked(editorClient.getFormSpec).mockReset()
 vi.mocked(editorClient.getFormSpec).mockResolvedValue(IMAGE_CAPABILITY_SPEC as never)
})

// Tip-bearing components (FlowCanvas) require the global TooltipProvider.
const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

describe("FlowCanvas — user authoring", () => {
 it("renders the empty state when no flow exists", () => {
 renderWithTooltip(<FlowCanvas />)
 expect(screen.getByText("Author a flow")).toBeTruthy()
 expect(screen.getByText("Add your first card")).toBeTruthy()
 })

 it("renders a dense tile after addStage (the user authors a card)", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: "krea-2-sd-q8",
 title: "Krea 2",
 params: { prompt: "a test", width: 1024, height: 1024 },
 })
 })
 // The card title renders on the dense tile.
 expect(screen.getByText("Krea 2")).toBeTruthy()
 // The tile has the data-card-tile attribute (the tiling grid element).
 const tile = container.querySelector('[data-card-tile]')
 expect(tile).toBeTruthy()
 // The "+ Add a card" entry slots into the grid alongside tiles.
 expect(screen.getByText("Add a card")).toBeTruthy()
 })

 it("opens the card in a zoom overlay when clicked (portaled to body, not a modal dialog)", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: "krea-2",
 title: "Krea",
 params: { prompt: "a cat in neon rain" },
 })
 })
 // Before the click: no detail, no overlay, and never a [role="dialog"]
 // modal. The zoom overlay is an absolute inset-0 layer (the sole focus),
 // not a dialog role.
 expect(container.querySelector("[data-card-detail]")).toBeNull()
 expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeNull()
 expect(document.body.querySelector('[role="dialog"]')).toBeNull()
 // Click the tile -> the zoom overlay mounts, portaled to document.body
 // (createPortal escapes the canvas subtree so the fixed backdrop can
 // cover the full viewport).
 const tile = container.querySelector("[data-card-tile]") as HTMLElement
 expect(tile).toBeTruthy()
 await act(async () => {
 fireEvent.click(tile)
 })
 // The detail lives in the portaled overlay in document.body, NOT in the
 // render container. The box holds the SKELETON during the shared-element
 // morph; the real detail swaps in when it settles (data-card-ready).
 expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()
 expect(document.body.querySelector("[data-card-zoom-overlay] [data-card-skeleton]"), "the skeleton holds the box during the grow").toBeTruthy()
 await waitFor(() => {
 expect(document.body.querySelector("[data-card-zoom-overlay] [data-card-detail]")).toBeTruthy()
 }, { timeout: 3000 })
 expect(container.querySelector("[data-card-detail]")).toBeNull()
 expect(document.body.querySelector('[role="dialog"]')).toBeNull()
 })
 it("wires an upstream card via setSlotInput (stringing cards together)", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 let firstId = ""
 let secondId = ""
 await act(async () => {
 useLibraryFlowStore.getState().startFlow("img then upscale")
 await useLibraryFlowStore.getState().addStage({ kind: "generation", service: "krea-2", title: "Generate", params: { prompt: "x" } })
 // The upscale card carries its REAL seeded shape (input_image: null)
 // — the slot the wire targets, exactly as seededParams builds cards.
 await useLibraryFlowStore.getState().addStage({ kind: "generation", service: "tile_upscale", title: "Upscale", params: { input_image: null } })
 const stages = useLibraryFlowStore.getState().flow!.stages
 firstId = stages[0].id
 secondId = stages[1].id
 })
 // Initially the second card has no upstream (addStage starts unwired;
 // the first setSlotInput pads to the slot count).
 expect(useLibraryFlowStore.getState().flow!.stages[1].inputs).toEqual([])

 // Wire card 2's input slot to card 1 (the "string them together" action).
 await act(async () => {
 await useLibraryFlowStore.getState().setSlotInput(secondId, "input_image", firstId)
 })
 expect(useLibraryFlowStore.getState().flow!.stages[1].inputs).toEqual([firstId])

 // The second tile shows the upstream indicator (Link2 icon + upstream title).
 const tiles = container.querySelectorAll('[data-card-tile]')
 expect(tiles.length).toBe(2)
 // The second tile carries the upstream card's title as a wire indicator.
 expect(tiles[1].textContent).toContain("Generate")
 })

 it("removes a card + strips it from downstream inputs (removeStage)", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 let firstId = ""
 let secondId = ""
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({ kind: "generation", service: "krea-2", title: "Generate", params: { prompt: "x" } })
 await useLibraryFlowStore.getState().addStage({ kind: "generation", service: "tile_upscale", title: "Upscale", params: { input_image: null } })
 firstId = useLibraryFlowStore.getState().flow!.stages[0].id
 secondId = useLibraryFlowStore.getState().flow!.stages[1].id
 await useLibraryFlowStore.getState().setSlotInput(secondId, "input_image", firstId)
 })
 expect(useLibraryFlowStore.getState().flow!.stages.length).toBe(2)

 // Remove card 1 via the store (the remove button is hover-only on tiles).
 await act(async () => {
 useLibraryFlowStore.getState().removeStage(firstId)
 })
 const stages = useLibraryFlowStore.getState().flow!.stages
 expect(stages.length).toBe(1)
 expect(stages[0].id).toBe(secondId)
 // Card 1 was stripped from card 2's inputs — as a "" HOLE, not a
 // filter (per-slot invariant: inputs[i] ↔ stageSlots[i]).
 expect(stages[0].inputs).toEqual([""])
 // Only one tile remains.
 expect(container.querySelectorAll('[data-card-tile]').length).toBe(1)
 })

 it("image-capability card renders the subcard mini-grid from the zoom overlay", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: "z-image",
 title: "Generate",
 params: { prompt: "a cat in neon rain" },
 })
 })

 // Open the zoom overlay (no result → auto-enter edit mode).
 const tile = container.querySelector('[data-card-tile]') as HTMLElement
 await act(async () => { fireEvent.click(tile) })

 // The form-spec for the card's service was fetched (schema gate) and the
 // subcard mini-grid (docs/design/modifier-subcards.md) renders because the
 // spec declares the capability. (The old "Add Modifiers" modal trigger
 // died with ModifiersModal; subcards are the L2 drill-down layer now —
 // always visible, no Edit-mode click.)
 // 2026-09-06 flowing-row flip: the ONE flex row always exists (it
 // carries the + Mod tile inline after the last card) — EMPTY means
 // no TILES inside it, not a missing row. Dead air still impossible:
 // an empty row renders exactly the + tile, nothing else.
 await waitFor(() => {
 expect(vi.mocked(editorClient.getFormSpec)).toHaveBeenCalledWith("z-image")
 expect(document.body.querySelector('[data-subcard-grid]')).toBeTruthy()
 expect(document.body.querySelector('[data-subcard-row] [data-subcard]')).toBeNull()
 // ONE generic "+ Mod" button (not per-kind add tiles).
 expect(document.body.querySelector('[data-subcard-add="mod"]')).toBeTruthy()
 })
 })

 it("a service without loras/controlnet capability never renders subcards", async () => {
 vi.mocked(editorClient.getFormSpec).mockResolvedValue({ fields: [], features: {} } as never)
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: "tile_upscale",
 title: "Upscale",
 params: { prompt: "x" },
 })
 })

 const tile = container.querySelector('[data-card-tile]') as HTMLElement
 await act(async () => { fireEvent.click(tile) })

 // Give the spec fetch a beat to resolve — the grid must stay absent
 // (rule 3: no declared capability → no subcard surface at all).
 await waitFor(() => {
 expect(vi.mocked(editorClient.getFormSpec)).toHaveBeenCalledWith("tile_upscale")
 })
 await new Promise((r) => setTimeout(r, 50))
 expect(document.body.querySelector('[data-subcard-row]')).toBeNull()
 expect(document.body.querySelector('[data-subcard-add]')).toBeNull()
 })
})

describe("FlowCanvas — the gated flow rename (2026-08-09)", () => {
 async function renderWithFlow(intent: string, name?: string) {
 // Set up the store FIRST (a flow authored before the canvas mounts —
 // the uncontrolled input reads its value at mount time, so a rename made
 // after render would never surface). Mirrors the real flow: the store is
 // the single surface, the canvas is a view over it.
 await act(async () => {
 useLibraryFlowStore.getState().startFlow(intent)
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: "krea-2",
 title: "Krea",
 params: { prompt: "x" },
 })
 })
 if (name !== undefined) {
 // Author the name the same way the surface does (through the gate).
 const res = useLibraryFlowStore.getState().applyDocMutation({
 kind: "rename",
 value: name,
 })
 expect(res.ok).toBe(true)
 }
 const { container } = renderWithTooltip(<FlowCanvas />)
 return container
 }

 it("shows the intent when no name is authored; the intent-only fallback", async () => {
 await renderWithFlow("make a waifu")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 expect(input.value).toBe("make a waifu")
 })

 it("shows the authored name when set (name wins over intent)", async () => {
 await renderWithFlow("make a waifu", "My Character Run")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 expect(input.value).toBe("My Character Run")
 })

 it("a valid blur commits the trimmed name through the store gate", async () => {
 await renderWithFlow("make a waifu")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 fireEvent.change(input, { target: { value: " My Run " } })
 fireEvent.blur(input)
 expect(input.value).toBe("My Run") // normalized to the trimmed commit
 const doc = useLibraryFlowStore.getState().flow!
 expect(doc.name).toBe("My Run")
 expect(doc.intent).toBe("make a waifu") // intent untouched
 })

 it("an empty blur reverts in place; the store is untouched", async () => {
 await renderWithFlow("make a waifu")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 fireEvent.change(input, { target: { value: " " } })
 fireEvent.blur(input)
 expect(input.value).toBe("make a waifu") // reverted, not cleared
 const doc = useLibraryFlowStore.getState().flow!
 expect(doc.name).toBeUndefined()
 expect(doc.intent).toBe("make a waifu")
 })

 it("an over-length blur (121 chars) reverts in place; the store is untouched", async () => {
 await renderWithFlow("make a waifu")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 const long = "x".repeat(121)
 fireEvent.change(input, { target: { value: long } })
 fireEvent.blur(input)
 expect(input.value).toBe("make a waifu")
 const doc = useLibraryFlowStore.getState().flow!
 expect(doc.name).toBeUndefined()
 })

 it("blurring with the committed value is a no-op (no gate call, no re-set)", async () => {
 await renderWithFlow("make a waifu")
 const input = screen.getByLabelText("Flow name") as HTMLInputElement
 const storeBefore = useLibraryFlowStore.getState().flow!
 fireEvent.change(input, { target: { value: "make a waifu" } })
 fireEvent.blur(input)
 expect(useLibraryFlowStore.getState().flow).toBe(storeBefore)
 })

 // ── Clear-flow X: clobber guard + alignment (2026-08-10) ───────────────
 // The X is the MOST destructive button on the canvas (clear() nulls the doc,
 // and storePersistence then mirrors null to localStorage → gone for good).
 // It MUST confirm on a non-empty flow, same as loadRun.
 // The guard lives in the UI (not the store) so clear() stays a pure reset
 // for the ~12 tests that call it in a beforeEach on an empty canvas.
 it("the Clear-flow X CONFIRMS on a non-empty canvas and preserves work on Cancel", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation", service: "krea-2", title: "Keep me", params: { prompt: "x" },
 })
 })
 const before = useLibraryFlowStore.getState().flow!
 // happy-dom doesn't define window.confirm — install a stub (default: cancel).
 const confirm = vi.fn().mockReturnValue(false)
 const origConfirm = (window as { confirm?: unknown }).confirm
 ;(window as { confirm?: unknown }).confirm = confirm
 try {
 const xBtn = container.querySelector('button[aria-label="Clear flow"]') as HTMLButtonElement
 expect(xBtn).toBeTruthy()
 await act(async () => { fireEvent.click(xBtn) })
 // Cancel → the doc is ref-equal to itself; nothing was destroyed.
 expect(useLibraryFlowStore.getState().flow).toBe(before)
 expect(confirm).toHaveBeenCalledTimes(1)
 // The message must NOT lie "not saved" — auto-save runs on every change.
 expect(confirm.mock.calls[0][0]).toMatch(/Clear the flow \(1 card\)\?/)
 expect(confirm.mock.calls[0][0]).not.toMatch(/not saved/)
 } finally {
 ;(window as { confirm?: unknown }).confirm = origConfirm
 }
 })

 it("the Clear-flow X clears when the user confirms", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation", service: "krea-2", title: "Bye", params: { prompt: "x" },
 })
 })
 const confirm = vi.fn().mockReturnValue(true)
 const origConfirm = (window as { confirm?: unknown }).confirm
 ;(window as { confirm?: unknown }).confirm = confirm
 try {
 const xBtn = container.querySelector('button[aria-label="Clear flow"]') as HTMLButtonElement
 await act(async () => { fireEvent.click(xBtn) })
 expect(useLibraryFlowStore.getState().flow).toBeNull()
 } finally {
 ;(window as { confirm?: unknown }).confirm = origConfirm
 }
 })

 it("the Clear-flow X is h-7 w-7 — the actions row's control scale", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation", service: "krea-2", title: "Align", params: { prompt: "x" },
 })
 })
 const xBtn = container.querySelector('button[aria-label="Clear flow"]') as HTMLButtonElement
 // The X lives in the ACTIONS ROW now (next to Save), not the name row's
 // right edge; h-7 w-7 keeps its box on the row's control scale.
 expect(xBtn.className).toMatch(/h-7/)
 expect(xBtn.className).toMatch(/w-7/)
 })

 it("the Clear-flow X sits RIGHT of Run all in the actions row (Save retired)", async () => {
 const { container } = renderWithTooltip(<FlowCanvas />)
 await act(async () => {
 useLibraryFlowStore.getState().startFlow()
 await useLibraryFlowStore.getState().addStage({
 kind: "generation", service: "krea-2", title: "Order", params: { prompt: "x" },
 })
 })
 const xBtn = container.querySelector('button[aria-label="Clear flow"]') as HTMLButtonElement
 expect(xBtn).toBeTruthy()
 // Header button order: … Run all · Clear — the Save button (the yaml
 // spec save door) retired with the library 2026-09-05; nothing sits
 // between Run all and the exit.
 const runAllBtn = screen.getByRole("button", { name: /Run all/i }) as HTMLButtonElement
 const all = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]
 expect(all.indexOf(xBtn)).toBe(all.indexOf(runAllBtn) + 1)
 // The Save door is GONE — no ghost control.
 expect(screen.queryByRole("button", { name: /^Save$/ })).toBeNull()
 })
})
