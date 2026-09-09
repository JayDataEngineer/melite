// mask-studio-editor.test.tsx — locks the rebuilt MaskStudioEditor contract
// (2026-08-09 + the 2026-08-10 three-producer rework). The editor is built
// to the Canvas app's standard: a ToolDock, a context-sensitive
// ToolOptionsBar, and a proper EmptyState image-import (Upload button +
// drag-drop + paste) — but the right rail is a MASK STRIP, not a layer
// panel ("layers don't make sense to be honest, but exporting the paint
// brush / mask does").
//
// The contract under test:
// * the mask strip renders produced masks ONLY (no phantom rows) + the
// live paint row — export is AUTOMATIC (no switches anywhere),
// * detect modes are face / hands / body / NONE (the producer off
// switch); arming none CLEARS the detector exports (the brick
// hard-errors on exports under "none"),
// * SAM3: a text prompt + Segment persists sam3_prompt + roi and runs —
// one gesture, same as Segm/Bbox,
// * image import (upload + drop) writes input_image through onSave,
// * detect/export controls write params (the same onEditSave path),
// * under detect_mode=none the selection bar demotes to a SAM3-scope
// hint (Segm/Bbox would hard-error in the brick).
// Canvas pixel drawing is jsdom-untestable; the stub getContext lets the
// redraw + paint-canvas init paths run without throwing. This guards the
// WIRING (the part that matters for the closed-loop validator).
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"
import { render as renderBase, screen, fireEvent, within, waitFor, act } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { MaskStudioEditor, shellDeclaration } from "../../../../../packages/engines/comfyui-cordis/src/cards/image/mask-studio/ui/studio/component"
import type { CardStage } from "@melite/contracts"
// MaskStudioEditor mounts the Radix Tip (tooltip unification 2026-08-14) —
// render under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
 return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

// jsdom has no real canvas implementation — stub getContext so the redraw +
// paint-canvas init paths run without throwing. Returns a proxy no-op ctx.
beforeAll(() => {
 const stub = new Proxy({}, { get: () => () => stub }) as unknown as CanvasRenderingContext2D
 HTMLCanvasElement.prototype.getContext =
 ((() => stub) as unknown) as typeof HTMLCanvasElement.prototype.getContext
})

afterEach(() => { vi.restoreAllMocks() })

function makeStage(overrides: Partial<CardStage> = {}): CardStage {
 return {
 id: "stage-mask-1",
 title: "Mask Studio",
 kind: "generation",
 service: "mask-studio",
 params: {
 input_image: "data:image/png;base64,AAAA",
 detect_mode: "body",
 detection_threshold: 0.35,
 sam_threshold: 0.93,
 sam_dilation: 0,
 export_face: false,
 export_hands: false,
 export_body: false,
 export_paint: false,
 },
 inputs: [],
 inputIndices: [],
 // Default result carries ALL four detector artifacts — the layer panel
 // renders a detector layer ONLY when its artifact is present, so this is
 // the "full run came back" fixture.
 result: {
 assetUrls: ["data:image/png;base64,AAAA"],
 artifacts: {
 mask_combined: "data:image/png;base64,AAAA",
 mask_face: "data:image/png;base64,BBBB",
 mask_hands: "data:image/png;base64,CCCC",
 mask_body: "data:image/png;base64,DDDD",
 },
 metadata: {},
 completedAt: Date.now(),
 durationSec: 1.2,
 },
 status: "pending",
 ...overrides,
 } as CardStage
}

const maskRows = (container: HTMLElement) =>
 Array.from(container.querySelectorAll("[data-mask-row]")).map((r) => r.getAttribute("data-mask-row"))

/** Which recipe subcards are FILLED (data-filled="true") — the recipe
 *  bar's "subcards fill up" contract (phase A, 2026-08-16): one card per
 *  ARMED recipe renders; the artifact URL (or a brush stroke, for paint)
 *  is what fills it. */
const filledRows = (container: HTMLElement) =>
 Array.from(container.querySelectorAll('[data-mask-row][data-filled="true"]')).map((r) =>
   r.getAttribute("data-mask-row"),
 )

/** A dim filter chip (no manifest yet) renders with the opacity marker. */
const nonce_dim = (el: Element) => el.className.includes("opacity-40")

describe("MaskStudioEditor", () => {
 it("renders the run's RECIPE — one subcard per ARMED mask, not fixed slots", () => {
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 // Phase A (2026-08-16): the bar is DYNAMIC. makeStage arms body (the
 // primary class) and face+hands (their artifacts landed — the OR rule;
 // the export_* flags lag the run by one write). SAM3 + paint are NOT
 // armed → NO cards (the fixed-slot bar is gone; the emittable-output
 // contract lives in the schema, not this bar).
 expect(maskRows(container).sort()).toEqual(
 ["mask_combined", "mask_face", "mask_hands", "mask_body"].sort(),
 )
 expect(container.querySelector('[data-mask-row="mask_sam3"]')).toBeNull()
 expect(container.querySelector('[data-mask-row="mask_paint"]')).toBeNull()
 expect(screen.getByText("Combined")).toBeTruthy()
 // Each card narrates its recipe: FILTER over SELECTION — the owner's
 // "'BBox1, Person' next to 'Hands'" grammar (per-instance filters land
 // with the backend phase; today Filter reads Full / Scope).
 const bodyCard = container.querySelector('[data-mask-row="mask_body"]') as HTMLElement
 expect(bodyCard.getAttribute("data-filter")).toBe("Full")
 expect(bodyCard.getAttribute("data-selection")).toBe("Body")
 })

 it("a slot FILLS iff its artifact landed — the rest stay dim placeholders", () => {
 const stage = makeStage({
 result: {
 assetUrls: ["data:image/png;base64,AAAA"],
 artifacts: { mask_face: "data:image/png;base64,BBBB", mask_sam3: "data:image/png;base64,SSSS" },
 metadata: {},
 durationSec: 1.2,
 },
 })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={() => {}} />)
 // Armed: body (the primary class) + face + sam3 (their artifacts landed).
 // Hands has neither a flag nor an artifact → no card at all.
 expect(maskRows(container).sort()).toEqual(
 ["mask_combined", "mask_body", "mask_face", "mask_sam3"].sort(),
 )
 // Only the two whose artifacts landed read as filled.
 expect(filledRows(container).sort()).toEqual(["mask_face", "mask_sam3"].sort())
 const combined = container.querySelector('[data-mask-row="mask_combined"]') as HTMLElement
 expect(combined.getAttribute("data-filled")).toBe("false")
 })

 it("the paint card appears only once strokes exist — no phantom slot", () => {
 // No strokes, no export flag → no paint card (the dynamic bar renders
 // what's armed, not what's emittable).
 const a = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 expect(a.container.querySelector('[data-mask-row="mask_paint"]')).toBeNull()
 a.unmount()
 // A persisted brush (paint_mask + export_paint — what commitPaint
 // writes on the first stroke) → the LIVE card, filled, filter=Canvas.
 const stage = makeStage({
 params: { ...makeStage().params, paint_mask: "data:image/png;base64,PPPP", export_paint: true },
 })
 const b = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={() => {}} />)
 const paintRow = b.container.querySelector('[data-mask-row="mask_paint"]') as HTMLElement
 expect(paintRow).toBeTruthy()
 expect(paintRow.getAttribute("data-filled")).toBe("true")
 expect(paintRow.getAttribute("data-filter")).toBe("Canvas")
 })

 it("a card-scope roi relabels the recipe Scope; the prompt rides on the SAM3 card", () => {
 const stage = makeStage({
 params: { ...makeStage().params, roi: [0.1, 0.1, 0.5, 0.5], sam3_prompt: "red shirt" },
 })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={() => {}} />)
 // An agent-written roi (no live marquee) scopes every producer: the
 // detect + sam3 cards read Scope; paint would read Canvas.
 for (const key of ["mask_combined", "mask_body", "mask_sam3"]) {
 expect(container.querySelector(`[data-mask-row="${key}"]`)!.getAttribute("data-filter")).toBe("Scope")
 }
 // The SAM3 card carries its prompt; Combined names its winner (the
 // brick's detect > sam3 > paint priority, narrated).
 const sam3Card = container.querySelector('[data-mask-row="mask_sam3"]') as HTMLElement
 expect(within(sam3Card).getByText(/red shirt/)).toBeTruthy()
 const combined = container.querySelector('[data-mask-row="mask_combined"]') as HTMLElement
 expect(within(combined).getByText(/← Body/)).toBeTruthy()
 })

 it("renders the THREE-STAGE rail — BBox stage first, types as classes (text included)", () => {
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 // The owner's design (2026-08-16): STAGE 1 BBox (count BEFORE the run +
 // an isolated play), STAGE 2 the type buttons (face/hands/body/paint/
 // text — TEXT IS A CLASS), STAGE 3 params + ADD on press. The source
 // radio (Person/Box/Text/Brush) is GONE.
 expect(container.querySelector("[data-stage-bbox]")).toBeTruthy()
 expect(container.querySelector("[data-bbox-count]")).toBeTruthy()
 expect(container.querySelector("[data-bbox-run]")).toBeTruthy()
 expect(container.querySelector("[data-stage-type]")).toBeTruthy()
 // Detect classes use the class-chip selector; text/paint are data-type.
 for (const t of ["face", "hands", "body"]) {
 expect(container.querySelector(`[data-detect-mode="${t}"]`)).toBeTruthy()
 }
 for (const t of ["text", "paint"]) {
 expect(container.querySelector(`[data-type="${t}"]`)).toBeTruthy()
 }
 // No stage-3 section until a type is pressed (zero cards to start).
 expect(container.querySelector("[data-stage-params]")).toBeNull()
 expect(container.querySelector('[data-source="person"]')).toBeNull()
 })

 it("writes detect_mode when a class is pressed + ADDed (the two-gesture commit)", () => {
 const onSave = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} />)
 // STAGE 2 opens the type's params; STAGE 3's ADD commits — the press
 // alone writes nothing (params may still be tuned before the commit).
 fireEvent.click(container.querySelector('[data-detect-mode="face"]')!)
 expect(onSave).not.toHaveBeenCalled()
 expect(container.querySelector("[data-stage-params]")).toBeTruthy()
 fireEvent.click(container.querySelector("[data-stage-add]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.detect_mode).toBe("face")
 // The ADD arms the class: Combined + its own export (one write).
 expect(last.export_face).toBe(true)
 // Detect-threshold preserved across the write.
 expect(last.detection_threshold).toBe(0.35)
 // The stage-3 section closed — zero cards until the next press.
 expect(container.querySelector("[data-stage-params]")).toBeNull()
 })

 it("TEXT IS A CLASS — press + prompt + ADD commits it; it composes with detect, never disarms it", () => {
 const onSave = vi.fn()
 const stage = makeStage({
 params: { ...makeStage().params, export_face: true, export_body: true, detect_mode: "face" },
 })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 fireEvent.click(container.querySelector('[data-type="text"]')!)
 fireEvent.change(container.querySelector("[data-stage-prompt]")!, { target: { value: "red shirt" } })
 fireEvent.click(container.querySelector("[data-stage-add]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.sam3_prompt).toBe("red shirt")
 // The owner's rule: text composes with BBox/detect — it does NOT turn
 // the detect producer off (that was the old source-radio behavior).
 expect(last.detect_mode).toBe("face")
 })

 it("STAGE 1's isolated play — 'Find boxes' runs BBox ALONE (bbox mode, exports off, manifest on)", () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={makeStage()} onSave={onSave} onRun={onRun} />,
 )
 fireEvent.click(container.querySelector("[data-bbox-run]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.output_mode).toBe("bbox")
 expect(last.detect_mode).toBe("body")        // YOLO needs a class
 expect(last.export_boxes).toBe(true)         // the manifest is the product
 expect(last.export_face).toBe(false)         // no class masks — ISOLATED
 expect(last.export_body).toBe(false)
 expect(onRun).toHaveBeenCalledTimes(1)
 // The count stepper is settable BEFORE the run (0 = all).
 fireEvent.click(container.querySelector("[data-bbox-inc]")!)
 fireEvent.click(container.querySelector("[data-bbox-run]")!)
 const second = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(second.output_mode).toBe("bbox")
 // BEFOREHAND, not after: the count CARRIES — the isolated run caps
 // at the N biggest (max_instances rides the write).
 expect(second.max_instances).toBe(1)
 })

 it("PLAY at the very bottom left — the rail's own run button (2026-08-16)", () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} onRun={onRun} />)
 const rail = container.querySelector("[data-mask-source-rail]")!
 expect(rail).toBeTruthy()
 const play = rail.querySelector("[data-rail-play]") as HTMLElement
 expect(play).toBeTruthy()
 // The play block is the LAST child of the rail — very bottom left.
 expect(rail.lastElementChild).toBe(play)
 const btn = play.querySelector("[data-rail-run]") as HTMLButtonElement
 expect(btn).toBeTruthy()
 expect(btn.textContent).toMatch(/play/i)
 fireEvent.click(btn)
 expect(onRun).toHaveBeenCalledTimes(1)
 expect(onSave).not.toHaveBeenCalled() // PLAY runs; it writes nothing
 })

 /** An INTERACTIVE mount: every onSave round-trips back into stage.params
 * via rerender. The source/class rules are STATE MACHINES over params —
 * a bare vi.fn() writer never updates the stage, so every second tap
 * would read stale params. */
 function renderInteractive(overrides: Partial<Record<string, unknown>> = {}) {
 let params: Record<string, unknown> = { ...makeStage().params, ...overrides }
 const writes: Record<string, unknown>[] = []
 const onSave = (p: Record<string, unknown>) => { writes.push(p); params = p }
 const view = renderWithTooltip(
 <MaskStudioEditor stage={makeStage({ params: { ...params } })} onSave={onSave} />,
 )
 const rerender = () =>
 view.rerender(
 <TooltipProvider>
 <MaskStudioEditor stage={makeStage({ params: { ...params } })} onSave={onSave} />
 </TooltipProvider>,
 )
 return { container: view.container, writes, rerender, getParams: () => params }
 }

 it("the geometry toggle rides stage 3 — Traced/Rectangles writes the ADD commit", () => {
 const t = renderInteractive()
 fireEvent.click(t.container.querySelector('[data-detect-mode="body"]')!)
 fireEvent.click(t.container.querySelector('[data-stage-geometry="bbox"]')!)
 fireEvent.click(t.container.querySelector("[data-stage-add]")!)
 t.rerender()
 expect(t.getParams().detect_mode).toBe("body")
 expect(t.getParams().output_mode).toBe("bbox")
 })

 it("class buttons: ADD arms export + primary; the last-class guard is gone (a press without ADD writes nothing)", () => {
 const t = renderInteractive()
 // Press + ADD face → face owns Combined, exports on.
 fireEvent.click(t.container.querySelector('[data-detect-mode="face"]')!)
 fireEvent.click(t.container.querySelector("[data-stage-add]")!); t.rerender()
 expect(t.getParams().detect_mode).toBe("face")
 expect(t.getParams().export_face).toBe(true)
 // Press + ADD body → body takes the primary, exports on; face stays
 // exported as a ride-along (both classes are cards now).
 fireEvent.click(t.container.querySelector('[data-detect-mode="body"]')!)
 fireEvent.click(t.container.querySelector("[data-stage-add]")!); t.rerender()
 expect(t.getParams().detect_mode).toBe("body")
 expect(t.getParams().export_body).toBe(true)
 expect(t.getParams().export_face).toBe(true)
 })

 it("auto-exports every available mask on a detection run — no checkboxes", () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} onRun={onRun} />)
 // The export checkboxes are GONE — zero checkboxes on the page.
 expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
 // makeStage carries all four detector artifacts → all export on, even
 // though the stored export_* flags are false (the flags are derived at
 // run time, never persisted as user state).
 fireEvent.click(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" }))
 const canvas = container.querySelector('canvas[class*="select-none"]') as HTMLCanvasElement
 fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, button: 0, pointerId: 1 })
 fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.pointerUp(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.click(container.querySelector("[data-detect-segm]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.export_face).toBe(true)
 expect(last.export_hands).toBe(true)
 expect(last.export_body).toBe(true)
 // No paint strokes yet → paint stays off.
 expect(last.export_paint).toBe(false)
 expect(onRun).toHaveBeenCalledTimes(1)
 })

 it("arms the export of the current detect mode before its first run", () => {
 // Fresh card, no run back yet (no artifacts): the armed detect mode
 // still exports — otherwise the first detection would export nothing
 // and the artifact would never appear.
 const stage = makeStage({ result: undefined })
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} onRun={onRun} />)
 fireEvent.click(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" }))
 const canvas = container.querySelector('canvas[class*="select-none"]') as HTMLCanvasElement
 fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, button: 0, pointerId: 1 })
 fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.pointerUp(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.click(container.querySelector("[data-detect-segm]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 // makeStage's detect_mode is "body" — the armed mode exports.
 expect(last.export_body).toBe(true)
 expect(last.export_face).toBe(false)
 expect(last.export_hands).toBe(false)
 expect(last.export_paint).toBe(false)
 })

 it("detect scrub commits ONCE on release — zero per-step param writes (perf lock)", () => {
 const onSave = vi.fn()
 renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} />)
 // The Threshold NumberField (drag right across the range: 40px at
 // 0.05/px sensitivity clamps 0.35 → 0.95).
 const field = screen.getByLabelText(/threshold/i).closest("[data-numberfield]") as HTMLElement
 fireEvent.pointerDown(field, { clientX: 100, button: 0 })
 fireEvent.pointerMove(field, { clientX: 140 })
 // The scrub burst is absorbed by the local draft — the store must NOT
 // have seen any per-step value. This locks the "stuck on detect" fix:
 // every store write re-hashes paint_mask (a multi-MB data URL) via
 // _recomputeKeys, so a 60×/sec write storm froze the editor (2026-08-10).
 expect(onSave).not.toHaveBeenCalled()
 fireEvent.pointerUp(field, { clientX: 140 })
 // Drag release commits EXACTLY ONE write, with the final value.
 expect(onSave).toHaveBeenCalledTimes(1)
 const last = onSave.mock.calls[0][0] as Record<string, unknown>
 expect(last.detection_threshold).toBe(0.95)
 })

 it("renders the ToolDock with the four tools (Move / Brush / Eraser / Rect)", () => {
 renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 expect(screen.getByRole("button", { name: "Move / Pan (V)" })).toBeTruthy()
 expect(screen.getByRole("button", { name: "Paint mask (B)" })).toBeTruthy()
 expect(screen.getByRole("button", { name: "Erase paint (E)" })).toBeTruthy()
 expect(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" })).toBeTruthy()
 })

 it("selecting the Rectangle tool does NOT show the brush-size slider (rect has no size)", () => {
 renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 fireEvent.click(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" }))
 // Rect mode: no "Size" label (the rect's extent IS the input). The
 // detect-control sliders (Threshold/SAM/Dilation) are always present,
 // so the Size LABEL is the discriminator, not input[type=range] count.
 expect(screen.queryByText("Size")).toBeNull()
 })

 it("switching to the Brush tool reveals the brush-size control", () => {
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={() => {}} />)
 expect(screen.queryByText("Size")).toBeNull()
 fireEvent.click(screen.getByRole("button", { name: "Paint mask (B)" }))
 expect(screen.getByText("Size")).toBeTruthy()
 // NumberField hybrid (drag + type) — the slider was replaced by the
 // shared scrub+type control (2026-08-10).
 expect(container.querySelector("[data-numberfield]")).toBeTruthy()
 })

 it("auto-export OR rule: produced artifact OR armed detect mode exports", () => {
 // makeStage: detect_mode "body"; result carries ONLY the face artifact.
 const stage = makeStage({
 result: {
 assetUrls: ["data:image/png;base64,AAAA"],
 artifacts: { mask_face: "data:image/png;base64,BBBB" },
 metadata: {},
 durationSec: 1.2,
 },
 })
 const onSave = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 fireEvent.click(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" }))
 const canvas = container.querySelector('canvas[class*="select-none"]') as HTMLCanvasElement
 fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, button: 0, pointerId: 1 })
 fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.pointerUp(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.click(container.querySelector("[data-detect-segm]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 // Face: produced artifact → export. Body: armed mode → export.
 // Hands: neither → off. Paint: no strokes → off.
 expect(last.export_face).toBe(true)
 expect(last.export_body).toBe(true)
 expect(last.export_hands).toBe(false)
 expect(last.export_paint).toBe(false)
 })

 it("shows the empty-state import card when no input_image is set", () => {
 const stage = makeStage({
 params: {
 detect_mode: "body",
 detection_threshold: 0.35,
 sam_threshold: 0.93,
 sam_dilation: 0,
 export_face: false,
 export_hands: false,
 export_body: false,
 export_paint: false,
 },
 })
 renderWithTooltip(<MaskStudioEditor stage={stage} onSave={() => {}} />)
 // The #1 fix: a DISCOVERABLE import card — Upload button + drop hint.
 expect(screen.getByText(/drop an image/i)).toBeTruthy()
 expect(screen.getByRole("button", { name: "Upload image" })).toBeTruthy()
 })

 it("imports an image via the empty-state Upload input → writes input_image", async () => {
 const onSave = vi.fn()
 const stage = makeStage({
 params: { detect_mode: "body" },
 })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 const input = container.querySelector('input[type="file"]') as HTMLInputElement
 const file = new File(["fake-png"], "photo.png", { type: "image/png" })
 fireEvent.change(input, { target: { files: [file] } })
 await waitFor(() => {
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(typeof last.input_image).toBe("string")
 expect((last.input_image as string).startsWith("data:image/png")).toBe(true)
 })
 })

 it("imports an image via drag-drop on the canvas → writes input_image", async () => {
 const onSave = vi.fn()
 const stage = makeStage({
 params: { detect_mode: "body" },
 })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 // The drop target is the canvas wrapper — the parent of the empty-state card.
 const wrapper = container.querySelector("[data-empty-state]")!.parentElement!
 const file = new File(["fake-png"], "drop.png", { type: "image/png" })
 fireEvent.drop(wrapper, { dataTransfer: { files: [file], types: ["Files"] } })
 await waitFor(() => {
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect((last.input_image as string).startsWith("data:image/png")).toBe(true)
 })
 })

 // ── Input sourcing parity (2026-08-10): file / asset / wire ──────────────
 //
 // The mask studio's base image accepts the SAME three input methods every
 // other image slot does. The wire path is goofy-by-design: it only resolves
 // once the upstream runs, so a wired+pending stage shows a WaitingState
 // (blocks painting) until then.
 const ASSET_MIME = "application/tech-noir-asset"
 const emptyParams = {
 detect_mode: "body",
 detection_threshold: 0.35,
 sam_threshold: 0.93,
 sam_dilation: 0,
 export_face: false,
 export_hands: false,
 export_body: false,
 export_paint: false,
 }

 it("renders the Wire-from-card button in the empty state when onWireSlot is passed", () => {
 renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({ params: { ...emptyParams } })}
 onSave={() => {}}
 upstreams={[]}
 onWireSlot={() => {}}
 />,
 )
 expect(screen.getByRole("button", { name: /wire from card/i })).toBeTruthy()
 })

 it("does NOT render the Wire-from-card button when onWireSlot is omitted (display-only)", () => {
 renderWithTooltip(<MaskStudioEditor stage={makeStage({ params: { ...emptyParams } })} onSave={() => {}} />)
 expect(screen.queryByRole("button", { name: /wire from card/i })).toBeNull()
 })

 it("attaches an image via asset-tray drop on the empty state → writes input_image + unwires", () => {
 const onSave = vi.fn()
 const onWireSlot = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({ params: { ...emptyParams } })}
 onSave={onSave}
 upstreams={[]}
 onWireSlot={onWireSlot}
 />,
 )
 const empty = container.querySelector("[data-empty-state]")! as HTMLElement
 fireEvent.drop(empty, {
 dataTransfer: {
 types: [ASSET_MIME],
 getData: (mime: string) =>
 mime === ASSET_MIME
 ? JSON.stringify({ url: "/v1/assets/runs/r1/out.png" })
 : "",
 files: [],
 },
 })
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.input_image).toBe("/v1/assets/runs/r1/out.png")
 // Mutual-exclusion: an attach unwires any stale wire (null upstream).
 expect(onWireSlot).toHaveBeenCalledWith("input_image", null, null)
 })

 it("attaches an image via asset-tray drop on the canvas → writes input_image", () => {
 const onSave = vi.fn()
 const stage = makeStage() // has input_image → canvas renders
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 const canvasWrap = container.querySelector("canvas")!.parentElement! as HTMLElement
 fireEvent.drop(canvasWrap, {
 dataTransfer: {
 types: [ASSET_MIME],
 getData: (mime: string) =>
 mime === ASSET_MIME
 ? JSON.stringify({ url: "/v1/assets/runs/r2/drop.png" })
 : "",
 files: [],
 },
 })
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.input_image).toBe("/v1/assets/runs/r2/drop.png")
 })

 it("opening the wire picker lists prior stages and wires input_image on pick", () => {
 const onSave = vi.fn()
 const onWireSlot = vi.fn()
 const upstream = {
 id: "stage-gen-0",
 title: "01 Generate",
 kind: "generation",
 service: "generate_image",
 params: {},
 inputs: [],
 inputIndices: [],
 result: {
 assetUrls: ["data:image/png;base64,GEN"],
 artifacts: {},
 metadata: {},
 durationSec: 2,
 },
 status: "pending",
 } as CardStage
 renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({ id: "stage-mask-1", params: { ...emptyParams } })}
 onSave={onSave}
 upstreams={[upstream, makeStage({ id: "stage-mask-1", params: { ...emptyParams } })]}
 onWireSlot={onWireSlot}
 />,
 )
 // Open the picker from the empty state's Wire button.
 fireEvent.click(screen.getByRole("button", { name: /wire from card/i }))
 // The picker is titled with the slot key.
 expect(screen.getByText(/Wire input_image from an earlier card/i)).toBeTruthy()
 // The prior stage's title renders as an option.
 const option = screen.getByText("01 Generate")
 fireEvent.click(option)
 // Wire write: onWireSlot(input_image, upstreamId, null) + param cleared.
 expect(onWireSlot).toHaveBeenCalledWith("input_image", "stage-gen-0", null)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.input_image).toBeNull()
 })

 it("a wired + pending upstream (no result) shows the WaitingState and blocks painting", () => {
 const onWireSlot = vi.fn()
 const upstream = {
 id: "stage-gen-0",
 title: "01 Generate",
 kind: "generation",
 service: "generate_image",
 params: {},
 inputs: [],
 inputIndices: [],
 result: null, // not run yet
 status: "pending",
 } as CardStage
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({
 params: { ...emptyParams },
 inputs: ["stage-gen-0"],
 })}
 onSave={() => {}}
 upstreams={[upstream]}
 onWireSlot={onWireSlot}
 />,
 )
 // The waiting card renders (not the empty-state, not the canvas). The
 // title spans a nested <span> (the upstream name), so read textContent
 // off the waiting card rather than cross-element getByText.
 const waiting = container.querySelector("[data-wired-waiting]")! as HTMLElement
 expect(waiting.textContent?.toLowerCase()).toContain("waiting for")
 expect(waiting.textContent).toContain("01 Generate")
 // No paint canvas in the canvas area while blocked. Scope to the canvas
 // wrapper (the waiting card's parent) — the layer-panel thumbnails are
 // ALSO <canvas>, but they live in the right rail, not the canvas area.
 const canvasArea = waiting.parentElement!
 expect(canvasArea.querySelector("canvas")).toBeNull()
 // Unwire unblocks: clicking the Unwire button calls onWireSlot null.
 fireEvent.click(within(waiting).getByRole("button", { name: /unwire/i }))
 expect(onWireSlot).toHaveBeenCalledWith("input_image", null, null)
 })

 it("a wired + resolved upstream (has result) renders the canvas with the wired image", () => {
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({
 params: { ...emptyParams },
 inputs: ["stage-gen-0"],
 })}
 onSave={() => {}}
 upstreams={[
 {
 id: "stage-gen-0",
 title: "01 Generate",
 kind: "generation",
 service: "generate_image",
 params: {},
 inputs: [],
 inputIndices: [],
 result: {
 assetUrls: ["data:image/png;base64,WIRED"],
 artifacts: {},
 metadata: {},
 durationSec: 2,
 },
 status: "pending",
 } as CardStage,
 ]}
 onWireSlot={() => {}}
 />,
 )
 // Canvas renders (resolved wire → base image present).
 expect(container.querySelector("canvas")).toBeTruthy()
 // No waiting card.
 expect(container.querySelector("[data-wired-waiting]")).toBeNull()
 // Wired badge shows the upstream title.
 expect(container.querySelector("[data-wired-badge]")).toBeTruthy()
 expect(screen.getByText("01 Generate")).toBeTruthy()
 })

 it("a wired + resolved upstream with a named output uses the named artifact", () => {
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({
 params: { ...emptyParams },
 inputs: ["stage-prep-0"],
 inputOutputs: ["mask"],
 })}
 onSave={onSave}
 upstreams={[
 {
 id: "stage-prep-0",
 title: "01 Input",
 kind: "input",
 service: "input_prep",
 params: {},
 inputs: [],
 inputIndices: [],
 result: {
 assetUrls: ["data:image/png;base64,PRIMARY"],
 artifacts: { mask: "data:image/png;base64,NAMED_MASK" },
 metadata: {},
 durationSec: 1,
 },
 status: "pending",
 } as CardStage,
 ]}
 onWireSlot={() => {}}
 />,
 )
 // The named artifact path resolves — the view canvas renders the wired
 // base (no empty-state import card, no waiting state), and the wired
 // badge names the upstream. The artifact URL itself is only observable
 // via pixels, so presence + no-fallback is the contract here.
 const canvas = container.querySelector('canvas[class*="select-none"]')
 expect(canvas).toBeTruthy()
 expect(container.querySelector("[data-empty-state]")).toBeNull()
 expect(container.querySelector("[data-wired-badge]")).toBeTruthy()
 expect(screen.getByText("01 Input")).toBeTruthy()
 })

 // ─── 2026-08-10 rework: rect → selection marquee → Segm/Bbox ─────────────
 // rectangle selection because it's a layer. Then they are presented
 // buttons, they have segm and bbox options, for the yolo model to detect.
 // Base layer is always locked, and you can't edit it but you can do
 // selections." The marquee commits on drag release (NO param write), and
 // ONE click on Segm/Bbox writes output_mode + normalized roi AND runs.
 describe("selection marquee rework (2026-08-10)", () => {
 beforeAll(() => {
 // jsdom can't decode raster data — fake the Image class so the load
 // effect sees a real 100×80 photo. That drives imgSizeRef, which the
 // drag clamp + roi normalization run against (the real dims, not
 // jsdom's decode-less 0×0).
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 // jsdom elements have no pointer-capture API — the rect drag calls
 // setPointerCapture on pointer down.
 HTMLCanvasElement.prototype.setPointerCapture = vi.fn() as never
 HTMLCanvasElement.prototype.releasePointerCapture = vi.fn() as never
 })
 afterAll(() => vi.unstubAllGlobals())

 // Drag a 50×40 marquee from (10,10) → (60,50). jsdom's
 // getBoundingClientRect is all-zero (Infinity scale) — stub the view
 // canvas's box to 100×80 = its pixel size, so clientX/Y are pixels.
 const commitDrag = async (container: HTMLElement) => {
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 fireEvent.click(screen.getByRole("button", { name: "Select region (R) — drag a rectangle, then pick Segm or Bbox" }))
 const canvas = container.querySelector('canvas[class*="select-none"]') as HTMLCanvasElement
 expect(canvas).toBeTruthy()
 vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 100, bottom: 80, width: 100, height: 80, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, button: 0, pointerId: 1 })
 fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 fireEvent.pointerUp(canvas, { clientX: 60, clientY: 50, pointerId: 1 })
 return canvas
 }

 it("rect drag commits a marquee → the Segm button writes output_mode+roi AND runs the card", async () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} onRun={onRun} />)
 await commitDrag(container)
 // The marquee commits → the action bar appears with the size readout.
 const bar = container.querySelector("[data-selection-bar]") as HTMLElement
 expect(bar).toBeTruthy()
 expect(within(bar).getByText("50×40 px")).toBeTruthy()
 // ONE gesture: click Segm → params + run, nothing in between.
 fireEvent.click(container.querySelector("[data-detect-segm]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.output_mode).toBe("segm")
 // roi normalized against the REAL dims: 10/100, 10/80, 50/100, 40/80.
 expect(last.roi).toEqual([0.1, 0.125, 0.5, 0.5])
 expect(onRun).toHaveBeenCalledTimes(1)
 })

 it("the Bbox button writes output_mode=bbox with the same roi", async () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} onRun={onRun} />)
 await commitDrag(container)
 fireEvent.click(container.querySelector("[data-detect-bbox]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.output_mode).toBe("bbox")
 expect(last.roi).toEqual([0.1, 0.125, 0.5, 0.5])
 expect(onRun).toHaveBeenCalledTimes(1)
 })

 it("with detect_mode=none the marquee scopes the SAM3 prompt, not Segm/Bbox", async () => {
 const onSave = vi.fn()
 const stage = makeStage({ params: { ...makeStage().params, detect_mode: "none" } })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 await commitDrag(container)
 const bar = container.querySelector("[data-selection-bar]") as HTMLElement
 expect(bar).toBeTruthy()
 // The bar explains the re-scope — and the detect buttons are GONE.
 expect(within(bar).getByText(/scopes a SAM3 prompt/)).toBeTruthy()
 expect(container.querySelector("[data-detect-segm]")).toBeNull()
 expect(container.querySelector("[data-detect-bbox]")).toBeNull()
 })

 it("TEXT class: press + prompt + ADD commits the prompt (Enter commits too)", () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const stage = makeStage({ params: { ...makeStage().params, detect_mode: "none" } })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} onRun={onRun} />)
 fireEvent.click(container.querySelector('[data-type="text"]')!)
 // No marquee yet — the commit is unscoped.
 fireEvent.change(container.querySelector("[data-stage-prompt]")!, { target: { value: "shirt, jeans" } })
 fireEvent.keyDown(container.querySelector("[data-stage-prompt]")!, { key: "Enter" })
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.sam3_prompt).toBe("shirt, jeans")
 expect(last.roi).toBe("") // no marquee — the commit writes full-image scope
 expect(onRun).toHaveBeenCalledTimes(0) // ADD commits the card; PLAY runs
 })

 it("a committed marquee still scopes the next run (the stage flow keeps the marquee write)", async () => {
 const onSave = vi.fn()
 const onRun = vi.fn()
 const stage = makeStage({ params: { ...makeStage().params, detect_mode: "none" } })
 const { container } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} onRun={onRun} />)
 await commitDrag(container)
 // Under detect OFF the bar has no Segm/Bbox (those buttons are the
 // detect ON contract, pinned above) — the marquee instead scopes the
 // STAGE FLOW: press TEXT, and ADD commits the prompt WITH the marquee's
 // roi. The marquee is canvas-surface; every authoring path carries it.
 fireEvent.click(container.querySelector('[data-type="text"]')!)
 fireEvent.change(container.querySelector("[data-stage-prompt]")!, { target: { value: "shirt" } })
 fireEvent.click(container.querySelector("[data-stage-add]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.sam3_prompt).toBe("shirt")
 expect(last.roi).toEqual([0.1, 0.125, 0.5, 0.5])
 expect(onRun).toHaveBeenCalledTimes(0) // ADD commits; PLAY runs
 })

 it("the set TEXT card re-syncs from the card when the prompt changes externally", () => {
 const onSave = vi.fn()
 const stage = makeStage({ params: { ...makeStage().params, detect_mode: "none", sam3_prompt: "old" } })
 const { container, rerender } = renderWithTooltip(<MaskStudioEditor stage={stage} onSave={onSave} />)
 // A COMMITTED prompt renders the ride-along box; a fresh stage-3 press
 // starts an EMPTY draft (new card, new prompt).
 fireEvent.click(container.querySelector('[data-type="text"]')!)
 const input = container.querySelector("[data-stage-prompt]") as HTMLInputElement
 expect(input.value).toBe("")
 fireEvent.change(input, { target: { value: "draft text" } })
 expect(onSave).not.toHaveBeenCalled() // the draft is LOCAL until ADD
 // Revive / agent write changes the param → the committed card follows.
 rerender(
 <TooltipProvider>
 <MaskStudioEditor
 stage={makeStage({ params: { ...makeStage().params, detect_mode: "none", sam3_prompt: "hat" } })}
 onSave={onSave}
 />
 </TooltipProvider>,
 )
 const box = container.querySelector("[data-sam3-input]") as HTMLInputElement
 expect(box).toBeTruthy()
 expect(box).toHaveValue("hat")
 })

 it("clear-selection drops the marquee and writes roi: ''", async () => {
 const onSave = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} />)
 await commitDrag(container)
 expect(container.querySelector("[data-selection-bar]")).toBeTruthy()
 fireEvent.click(container.querySelector("[data-clear-selection]")!)
 expect(container.querySelector("[data-selection-bar]")).toBeNull()
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.roi).toBe("")
 })

 it("the rail's Scope chip mirrors the marquee and clears it (2026-08-16)", async () => {
 const onSave = vi.fn()
 const { container } = renderWithTooltip(<MaskStudioEditor stage={makeStage()} onSave={onSave} />)
 // No marquee → the chip reads Full image and offers no clear button.
 const chip = container.querySelector("[data-scope-chip]") as HTMLElement
 expect(chip).toBeTruthy()
 expect(within(chip).getByText("Full image")).toBeTruthy()
 expect(container.querySelector("[data-clear-scope]")).toBeNull()
 // Commit a marquee → the chip mirrors its size…
 await commitDrag(container)
 expect(within(chip).getByText(/Sel 50×40/)).toBeTruthy()
 expect(container.querySelector("[data-clear-scope]")).toBeTruthy()
 // …and clearing through the chip is the SAME gesture as the bar's ✕
 // (both drop the marquee + write roi: "").
 fireEvent.click(container.querySelector("[data-clear-scope]")!)
 expect(container.querySelector("[data-selection-bar]")).toBeNull()
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.roi).toBe("")
 expect(within(chip).getByText("Full image")).toBeTruthy()
 })
 })

 // ─── Phase B (2026-08-16): instances — the detect_boxes manifest ──────────
 // "if there were two people in shot, we'd be good… the user can see the
 // bboxes and just select one." The run emits detect_boxes.json; the
 // numbered badges + amber canvas overlays derive from it; a badge tap
 // writes instance_filter and re-runs — the SAME param the agent writes
 // ("all" | "largest" | "0,2"), one vocabulary with two authors.
 describe("instance manifest (phase B)", () => {
 const MANIFEST = {
 class: "body",
 count: 2,
 boxes: [
 { index: 0, class: "body", bbox: [0.1, 0.125, 0.4, 0.375], area: 0.15 },
 { index: 1, class: "body", bbox: [0.7, 0.5, 0.2, 0.25], area: 0.05 },
 ],
 }
 function manifestStage(params: Record<string, unknown> = {}, artifacts: Record<string, string> = {
 mask_combined: "data:image/png;base64,AAAA",
 mask_body: "data:image/png;base64,DDDD",
 detect_boxes: "/v1/assets/runs/r1/detect_boxes.json",
 }): CardStage {
 return makeStage({
 params: { ...makeStage().params, export_boxes: true, ...params },
 result: {
 assetUrls: ["data:image/png;base64,AAAA"],
 artifacts,
 metadata: {},
 durationSec: 1.2,
 },
 })
 }
 /** jsdom rects are all-zero → fitView bails and viewSize stays null
 * (the badges' position gate). Spy the canvas COLUMN's box to 220×220
 * right after render: the load flow re-measures it once the
 * FakeImage resolves, so fitView lands at the native 100×80. */
 const stubColumnBox = (container: HTMLElement) => {
 const col = container.querySelector("div.flex.min-w-0.flex-1.flex-col")! as HTMLElement
 vi.spyOn(col, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 220, bottom: 220, width: 220, height: 220, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 }
 beforeAll(() => {
 // Same jsdom shims the marquee block uses — the badges are positioned
 // off viewSize, which needs the load effect to complete against a
 // real-sized Image.
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 HTMLCanvasElement.prototype.setPointerCapture = vi.fn() as never
 HTMLCanvasElement.prototype.releasePointerCapture = vi.fn() as never
 })
 // Each test stubs its own fetch; the afterAll clears every global at
 // once (unstubbing per-test would also drop the Image shim mid-block).
 afterAll(() => vi.unstubAllGlobals())

 it("renders one tappable badge per manifest entry — 1-based, amber when selected", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST }) as unknown as Response,
 ))
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={manifestStage()} onSave={() => {}} />,
 )
 stubColumnBox(container)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelectorAll("[data-instance-badge]")).toHaveLength(2)
 })
 // Display is 1-BASED (BBox1 = index 0, the biggest detection)…
 expect(container.querySelector('[data-instance-badge="0"]')!.textContent).toBe("1")
 expect(container.querySelector('[data-instance-badge="1"]')!.textContent).toBe("2")
 // …and every instance is selected by default ("all" — zero drift).
 expect(container.querySelector('[data-instance-badge="0"]')!.className).toContain("bg-amber-400")
 })

 it("a badge tap writes instance_filter and re-runs — ONE gesture, same param as the agent", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST }) as unknown as Response,
 ))
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={manifestStage()} onSave={onSave} onRun={onRun} />,
 )
 stubColumnBox(container)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelector('[data-instance-badge="1"]')).toBeTruthy()
 })
 fireEvent.click(container.querySelector('[data-instance-badge="1"]')!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 // Dropping BBox2 keeps index 0 — the 0-based param vocabulary.
 expect(last.instance_filter).toBe("0")
 expect(onRun).toHaveBeenCalledTimes(1)
 })

 it("toggling the LAST selected instance writes all — an empty mask is not a recipe", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST }) as unknown as Response,
 ))
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={manifestStage({ instance_filter: "0" })} onSave={onSave} />,
 )
 stubColumnBox(container)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelector('[data-instance-badge="0"]')).toBeTruthy()
 })
 fireEvent.click(container.querySelector('[data-instance-badge="0"]')!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 // "0" was the only selection; dropping it returns to all (never "" —
 // the brick treats that as a hard error, not a silent fallback).
 expect(last.instance_filter).toBe("all")
 })

 it("the recipe bar names the instance filter — BBox 1 replaces Full on the detect cards", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST }) as unknown as Response,
 ))
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={manifestStage({ instance_filter: "0" })} onSave={() => {}} />,
 )
 stubColumnBox(container)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelector('[data-instance-badge="0"]')).toBeTruthy()
 })
 expect(
 container.querySelector('[data-mask-row="mask_body"]')!.getAttribute("data-filter"),
 ).toBe("BBox 1")
 expect(
 container.querySelector('[data-mask-row="mask_combined"]')!.getAttribute("data-filter"),
 ).toBe("BBox 1")
 })

 it("badges hide when the detect producer is off — the manifest describes ITS run", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST }) as unknown as Response,
 ))
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={manifestStage({ detect_mode: "none" })} onSave={() => {}} />,
 )
 // The manifest fetched fine — but Text/Brush own no instances.
 await waitFor(() => {
 expect((globalThis as { fetch?: unknown }).fetch).toBeTruthy()
 })
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 expect(container.querySelector("[data-instance-badge]")).toBeNull()
 })

 it("a data: manifest URL never fetches — run artifacts are asset URLs", async () => {
 const fetchMock = vi.fn()
 vi.stubGlobal("fetch", fetchMock)
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={manifestStage({}, {
 mask_combined: "data:image/png;base64,AAAA",
 detect_boxes: "data:application/json;base64,e30=",
 })}
 onSave={() => {}}
 />,
 )
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 expect(fetchMock).not.toHaveBeenCalled()
 expect(container.querySelector("[data-instance-badge]")).toBeNull()
 })
 })

 // ─── Phase C (2026-08-16): the outputs recipe — the agent's form ─────────
 // "I bet the AI agent will like this better too, because the model is
 // simpler." params.outputs (authored by the AGENT, validated by
 // mask_recipe.py) IS the recipe when non-empty: the bar renders it
 // VERBATIM, the badges select from the primary entry's keep, and any
 // editor gesture re-flattens it to [] — except badge taps, which refine
 // the recipe in place (the ride-alongs survive).
 describe("the outputs recipe (phase C)", () => {
 const MANIFEST_B = {
 class: "body",
 count: 2,
 boxes: [
 { index: 0, class: "body", bbox: [0.1, 0.125, 0.4, 0.375], area: 0.15 },
 { index: 1, class: "body", bbox: [0.7, 0.5, 0.2, 0.25], area: 0.05 },
 ],
 }
 /** Local twin of the phase-B harness (block-scoped there): a run whose
  * artifacts carry the detect_boxes manifest (fetched, not data:). */
 function manifestStageC(
 params: Record<string, unknown> = {},
 ): CardStage {
 return makeStage({
 params: { ...makeStage().params, export_boxes: true, ...params },
 result: {
 assetUrls: ["data:image/png;base64,AAAA"],
 artifacts: {
 mask_combined: "data:image/png;base64,AAAA",
 mask_body: "data:image/png;base64,DDDD",
 detect_boxes: "/v1/assets/runs/r1/detect_boxes.json",
 },
 metadata: {},
 durationSec: 1.2,
 },
 })
 }
 const AGENT_RECIPE = [
 { filter: { kind: "instance", keep: [0] },
   selection: { kind: "detect", class: "body", mode: "segm" } },
 { selection: { kind: "detect", class: "hands" } },
 { filter: { kind: "scope", roi: [0.1, 0.1, 0.5, 0.5] },
   selection: { kind: "sam3", prompt: "hat" } },
 { filter: { kind: "canvas" }, selection: { kind: "paint" } },
 ]

 it("the bar renders the agent's recipe VERBATIM — one card per entry", () => {
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({ params: { ...makeStage().params, outputs: AGENT_RECIPE } })}
 onSave={() => {}}
 />,
 )
 expect(maskRows(container)).toEqual([
 "mask_combined", "mask_hands", "mask_sam3", "mask_paint",
 ])
 // The first detect entry IS Combined (names its class); the FILTER
 // lines narrate each entry's own filter — "BBox1, Person next to
 // Hands", the owner's grammar, now agent-authored.
 const combined = container.querySelector('[data-mask-row="mask_combined"]')!
 expect(combined.getAttribute("data-filter")).toBe("BBox 1")
 expect(combined.getAttribute("data-selection")).toBe("Combined")
 expect(container.querySelector('[data-mask-row="mask_hands"]')!.getAttribute("data-filter")).toBe("Full")
 expect(container.querySelector('[data-mask-row="mask_hands"]')!.getAttribute("data-selection")).toBe("Hands")
 expect(container.querySelector('[data-mask-row="mask_sam3"]')!.getAttribute("data-filter")).toBe("Scope")
 expect(container.querySelector('[data-mask-row="mask_sam3"]')!.getAttribute("data-selection")).toBe("SAM3")
 expect(container.querySelector('[data-mask-row="mask_paint"]')!.getAttribute("data-filter")).toBe("Canvas")
 })

 it("a rail gesture FLATTENS the recipe — the editor authors flat", () => {
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={makeStage({ params: { ...makeStage().params, outputs: AGENT_RECIPE } })}
 onSave={onSave}
 />,
 )
 // The ordinary editor gesture is press + ADD now (three-stage rail):
 // the ADD's flat write lands AND the recipe is cleared — outputs: []
 // is the flat form's signature.
 fireEvent.click(container.querySelector('[data-detect-mode="hands"]')!)
 fireEvent.click(container.querySelector("[data-stage-add]")!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 expect(last.export_hands).toBe(true)
 expect(last.detect_mode).toBe("hands")
 expect(last.outputs).toEqual([])
 })

 it("badges follow the recipe's primary keep — even with detect_mode none", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST_B } as unknown as Response),
 ))
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={manifestStageC({ detect_mode: "none", outputs: AGENT_RECIPE.slice(0, 2) })}
 onSave={() => {}}
 />,
 )
 const col = container.querySelector("div.flex.min-w-0.flex-1.flex-col")! as HTMLElement
 vi.spyOn(col, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 220, bottom: 220, width: 220, height: 220, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 // The flat detect_mode says "none" — but the recipe arms detect, so
 // the badges render (the recipe OVERRIDES the flat params).
 expect(container.querySelectorAll("[data-instance-badge]")).toHaveLength(2)
 })
 expect(container.querySelector('[data-instance-badge="0"]')!.className).toContain("bg-amber-400")
 expect(container.querySelector('[data-instance-badge="1"]')!.className).not.toContain("bg-amber-400")
 vi.unstubAllGlobals()
 })

 it("a badge tap REFINES the recipe — the ride-alongs survive", async () => {
 // THREE boxes: keep [0] + a tap on BBox2 lands on keep [0,1] (with two
 // boxes both taps collapse to all — the zero-drift rule).
 const MANIFEST_3 = {
 class: "body",
 count: 3,
 boxes: [
 { index: 0, class: "body", bbox: [0.1, 0.125, 0.4, 0.375], area: 0.15 },
 { index: 1, class: "body", bbox: [0.7, 0.5, 0.2, 0.25], area: 0.05 },
 { index: 2, class: "body", bbox: [0.2, 0.7, 0.1, 0.1], area: 0.01 },
 ],
 }
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST_3 } as unknown as Response),
 ))
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 const onSave = vi.fn()
 const onRun = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={manifestStageC({ detect_mode: "none", outputs: AGENT_RECIPE.slice(0, 2) })}
 onSave={onSave}
 onRun={onRun}
 />,
 )
 const col = container.querySelector("div.flex.min-w-0.flex-1.flex-col")! as HTMLElement
 vi.spyOn(col, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 220, bottom: 220, width: 220, height: 220, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelector('[data-instance-badge="1"]')).toBeTruthy()
 })
 fireEvent.click(container.querySelector('[data-instance-badge="1"]')!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 const outs = last.outputs as Array<Record<string, unknown>>
 // Surgical: the PRIMARY entry's filter becomes keep [1]…
 expect(outs).toHaveLength(2)
 expect((outs[0].filter as Record<string, unknown>).keep).toEqual([0, 1])
 // …and the hands ride-along is UNTOUCHED (not flattened, not dropped).
 expect(outs[1]).toEqual({ selection: { kind: "detect", class: "hands" } })
 expect(onRun).toHaveBeenCalledTimes(1)
 vi.unstubAllGlobals()
 })

 it("the FILTER TIER renders before any run — Full live, BBox visible-but-dim", () => {
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={makeStage()} onSave={() => {}} />,
 )
 // Level a) of the hierarchy is ALWAYS in the bar: the switch ability
 // is visible before the first run — never discovered by accident.
 const tier = container.querySelector("[data-filter-tier]")!
 expect(tier).toBeTruthy()
 expect(container.querySelector('[data-filter-chip="full"]')!.textContent).toBe("Full")
 const none = container.querySelector('[data-filter-chip="bbox-none"]')!
 expect(none.textContent).toBe("BBox —")
 expect(nonce_dim(none)).toBe(true) // dim placeholder, not a switch
 })

 it("a BBox chip SWITCHES in one tap — exactly that instance, then back to all", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST_B } as unknown as Response),
 ))
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 // The APP feeds every save back into the stage (updateStageParams) —
 // a bare vi.fn() writer never updates params, so the SECOND tap would
 // read a stale filter. Same contract as renderInteractive.
 let params: Record<string, unknown> = {
 ...makeStage().params, export_boxes: true, instance_filter: "all",
 }
 const writes: Record<string, unknown>[] = []
 const onSave = (p: Record<string, unknown>) => { writes.push(p); params = p }
 const onRun = vi.fn()
 const view = renderWithTooltip(
 <MaskStudioEditor stage={manifestStageC(params)} onSave={onSave} onRun={onRun} />,
 )
 const rerender = () => view.rerender(
 <TooltipProvider>
 <MaskStudioEditor stage={manifestStageC(params)} onSave={onSave} onRun={onRun} />
 </TooltipProvider>,
 )
 const col = view.container.querySelector("div.flex.min-w-0.flex-1.flex-col")! as HTMLElement
 vi.spyOn(col, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 220, bottom: 220, width: 220, height: 220, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(view.container.querySelector('[data-filter-chip="bbox-0"]')).toBeTruthy()
 })
 // From all → BBox2 ONLY (a switch, not a toggle-add).
 fireEvent.click(view.container.querySelector('[data-filter-chip="bbox-1"]')!)
 rerender()
 expect(writes.at(-1)!.instance_filter).toBe("1")
 expect(onRun).toHaveBeenCalledTimes(1)
 // The lone active chip taps back to all.
 fireEvent.click(view.container.querySelector('[data-filter-chip="bbox-1"]')!)
 rerender()
 expect(writes.at(-1)!.instance_filter).toBe("all")
 vi.unstubAllGlobals()
 })

 it("the rail's numeric knobs collapse behind ONE Tune expander (closed)", () => {
 const { container } = renderWithTooltip(
 <MaskStudioEditor stage={makeStage()} onSave={() => {}} />,
 )
 const tune = container.querySelector("[data-tune-section]")!
 expect(tune).toBeTruthy()
 const inner = tune.querySelector("div")! // the hidden wrapper
 expect(inner.className).toContain("hidden")
 fireEvent.click(container.querySelector("[data-tune-toggle]")!)
 expect(inner.className).not.toContain("hidden")
 })

 it("tapping to all-or-none DROPS the filter — absent filter is the grammar's all", async () => {
 vi.stubGlobal("fetch", vi.fn(async () =>
 ({ ok: true, json: async () => MANIFEST_B } as unknown as Response),
 ))
 class FakeImage {
 crossOrigin = ""
 complete = true
 naturalWidth = 100
 naturalHeight = 80
 onload: (() => void) | null = null
 onerror: (() => void) | null = null
 set src(_v: string) { this.onload?.() }
 }
 vi.stubGlobal("Image", FakeImage)
 const onSave = vi.fn()
 const { container } = renderWithTooltip(
 <MaskStudioEditor
 stage={manifestStageC({ detect_mode: "none", outputs: AGENT_RECIPE.slice(0, 2) })}
 onSave={onSave}
 />,
 )
 const col = container.querySelector("div.flex.min-w-0.flex-1.flex-col")! as HTMLElement
 vi.spyOn(col, "getBoundingClientRect").mockReturnValue({
 left: 0, top: 0, right: 220, bottom: 220, width: 220, height: 220, x: 0, y: 0,
 toJSON: () => ({}),
 } as unknown as DOMRect)
 await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
 await waitFor(() => {
 expect(container.querySelector('[data-instance-badge="0"]')).toBeTruthy()
 })
 fireEvent.click(container.querySelector('[data-instance-badge="0"]')!)
 const last = onSave.mock.calls.at(-1)?.[0] as Record<string, unknown>
 const outs = last.outputs as Array<Record<string, unknown>>
 expect(outs[0].filter).toBeUndefined()  // all selected → no filter
 expect(outs[0].selection).toEqual({ kind: "detect", class: "body", mode: "segm" })
 vi.unstubAllGlobals()
 })
 })
})

// ── stroke 4 (2026-09-07): the typed shell table, coherent with the ride ──
describe("MaskStudio shell declaration (stroke 4)", () => {
  it("declares a FROZEN table (data, not code — rung-7)", () => {
    expect(Object.isFrozen(shellDeclaration)).toBe(true)
  })
  it("center: the paint2d viewport (PaintCanvas2D, stroke 3)", () => {
    expect(shellDeclaration.center.kind).toBe("paint2d")
  })
  it("bottom: the recipe bar (OutputStrip)", () => {
    expect(shellDeclaration.bottom?.kind).toBe("recipe")
  })
  it("rail: the input_image producer slot the studio renders", () => {
    expect([...shellDeclaration.rail.slots]).toEqual(["input_image"])
  })
})
