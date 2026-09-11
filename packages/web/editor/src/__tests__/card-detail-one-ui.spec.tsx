//
// "After a card is loaded or used, the card completely changes when you zoom
// in. You literally can't even change the input image. Why does the drill
// down mode get over written?" — "Having two UIs is insane for drilldown
// view. That is a disaster."
//
// Root cause: CardDetailBody auto-flipped between TWO UIs keyed on
// stage.result — no result → edit mode (ParamEditor), result attached
// (after generation OR revive) → a read-only view (param grid + prompt
// block + an "Edit params" toggle). The zoomed card thus CHANGED the moment
// a run finished or a saved run loaded, and the input image stopped being
// editable.
//
// The contract this file pins: the drilldown is ONE UI — the editor. The
// ParamEditor (Prompt textarea + input slots) renders IDENTICALLY with and
// without a result; the input image stays changeable after generation.
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
// THE FORM IS THE CARD (2026-08-18): only spec-DECLARED fields render —
// the form-spec must resolve before Prompt/steps paint (the old
// undeclared-draft fallback painted them pre-spec on a network race).
// Stub the wire the contract store fetches through (Door B pattern).
vi.mock("../rpc/editorClient", () => ({
  editorClient: {
    getFormSpec: vi.fn().mockResolvedValue({
      defaults: {},
      fields: [
        { name: "prompt", type: "textarea" },
        { name: "steps", type: "number" },
      ],
      schema_groups: [],
      features: {},
    }),
  },
}))

function makeStage(over: Partial<CardStage> = {}): CardStage {
 return {
 id: "s0",
 title: "Edit image",
 subtitle: "qwen-edit",
 kind: "generation",
 service: "qwen-edit-base",
 // steps keeps ParamGrid's entry list non-empty so the editor branch
 // (ParamEditor) mounts — prompt + input_image are both skipped by the
 // grid's filter (the editor owns them).
 params: { prompt: "make it blue", steps: 28, input_image: null },
 inputs: [],
 inputIndices: [],
 result: null,
 status: "pending",
 meta: {},
 ...over,
 }
}

/** The editor UI that MUST be present in BOTH states — the ONE drilldown. */
async function expectEditorUI() {
 // The ParamEditor's prompt textarea (labeled) — the editor is the card.
 // Await the form-spec's async resolution (the card paints declared
 // fields once the spec lands — 2026-08-18).
 const prompt = (await screen.findByLabelText("Prompt")) as HTMLTextAreaElement
 expect(prompt).toBeTruthy()
 // Input slots — the wireable squares (the input image's home).
 expect(document.querySelectorAll("[data-slot-square]").length).toBe(1)
 // The old view-mode chrome is GONE: no "Edit params" toggle, no read-only
 // prompt <p> (the editor's textarea owns the prompt).
 expect(screen.queryByText("Edit params")).toBeNull()
 expect(document.querySelector('[data-card-detail] p.whitespace-pre-wrap')).toBeNull()
}

describe("CardDetailInline — ONE drilldown UI (2026-08-08)", () => {
 it("no result: the editor renders (prompt + input slot squares)", async () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 await expectEditorUI()
 })

 it("WITH a result (after generation / revive): the SAME editor renders — the card does NOT change", async () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 status: "done",
 result: {
 assetUrls: ["/assets/runs/r_1/edited.png"],
 artifacts: {},
 metadata: { runId: "r_1" },
 durationSec: 12.3,
 },
 })}
 upstreams={[]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 await expectEditorUI()
 })

 it("RUNNING: no status text, no spinner button — the EXISTING header icon spins (2026-08-08)", async () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 status: "running",
 progress: { value: 3, max: 10 },
 })}
 upstreams={[]}
 running={true}
 actions={{ onEditSave: vi.fn(), onRun: vi.fn() }}
 />,
 )
 // No status TEXT anywhere — "the crap" is gone.
 expect(screen.queryByText("Running")).toBeNull()
 expect(screen.queryByText("Running…")).toBeNull()
 // The icon that was ALREADY in the header just spins — the whole
 // running signal ("we already have an icon in the top right").
 const icon = document.querySelector('[aria-label="Running"]')
 expect(icon).toBeTruthy()
 expect(icon!.classList.contains("animate-spin")).toBe(true)
 // NO loading spinner on the Run button: it stays a plain disabled
 // "Run" (the spinner is the icon, not the button).
 const run = screen.getByRole("button", { name: /^Run$/i })
 expect(run.hasAttribute("disabled")).toBe(true)
 expect(run.querySelector(".animate-spin")).toBeNull()
 // The editor is still the card — one UI, always.
 await expectEditorUI()
 })

 it("after generation the input image is STILL changeable — the file pick writes through onEditSave", async () => {
 const onEditSave = vi.fn()
 vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  text: async () => JSON.stringify({ path: "data/input/new_input-abc12345.png" }),
 })))
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 status: "done",
 result: {
 assetUrls: ["/assets/runs/r_1/edited.png"],
 artifacts: {},
 metadata: { runId: "r_1" },
 durationSec: 12.3,
 },
 })}
 upstreams={[]}
 running={false}
 actions={{ onEditSave }}
 />,
 )
 const input = document.querySelector('[data-slot-grid] input[type="file"]') as HTMLInputElement
 expect(input).toBeTruthy()
 const file = new File(["fake"], "new_input.png", { type: "image/png" })
 act(() => {
 fireEvent.change(input, { target: { files: [file] } })
 })
 await waitFor(() => expect(onEditSave).toHaveBeenCalled())
 const last = onEditSave.mock.calls.at(-1)![1] as Record<string, unknown>
 expect(last.input_image).toBe("data/input/new_input-abc12345.png")
 vi.unstubAllGlobals()
 })

 it("the prompt stays EDITABLE with a result — a typed value flushes through onEditSave", async () => {
 const onEditSave = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage({
 status: "done",
 result: {
 assetUrls: ["/assets/runs/r_1/edited.png"],
 artifacts: {},
 metadata: { runId: "r_1" },
 durationSec: 12.3,
 },
 })}
 upstreams={[]}
 running={false}
 actions={{ onEditSave, onRun: vi.fn() }}
 />,
 )
 const prompt = (await screen.findByLabelText("Prompt")) as HTMLTextAreaElement
 fireEvent.change(prompt, { target: { value: "edited after generation" } })
 await waitFor(() => { expect(prompt.value).toBe("edited after generation") })
 // status "done" → the header's primary action reads "Re-run".
 fireEvent.click(screen.getByText("Re-run"))
 const flushed = onEditSave.mock.calls[0][1] as Record<string, unknown>
 expect(flushed.prompt).toBe("edited after generation")
 })
})

// ── Rename (2026-08-09) — the drilldown title row is THE rename surface
// (ONE card form: the tile title stays inert). The tagKit inline-rename
// contract: pencil → input prefilled + select-all, Enter/blur commits the
// TRIMmed value, Esc cancels, empty = no-op. Presence-gated on
// actions.onRename — surfaces without it render the plain h3 (regression).
describe("CardDetailInline — rename a card (2026-08-09)", () => {
 const renameActions = (onRename = vi.fn()) => ({ onEditSave: vi.fn(), onRename })

 it("pencil → prefilled input; Enter commits the trimmed name via onRename", () => {
 const onRename = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={renameActions(onRename)}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Rename card" }))
 const input = screen.getByLabelText("Rename card") as HTMLInputElement
 expect(input).toBeTruthy()
 expect(input.value).toBe("Edit image") // prefilled with the current title
 fireEvent.change(input, { target: { value: " Edit the image " } })
 fireEvent.keyDown(input, { key: "Enter" })
 expect(onRename).toHaveBeenCalledTimes(1)
 expect(onRename).toHaveBeenCalledWith("s0", "Edit the image")
 })

 it("blur commits the rename (same contract as tagKit rows)", () => {
 const onRename = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={renameActions(onRename)}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Rename card" }))
 const input = screen.getByLabelText("Rename card") as HTMLInputElement
 fireEvent.change(input, { target: { value: "Blur Commit" } })
 fireEvent.blur(input)
 expect(onRename).toHaveBeenCalledWith("s0", "Blur Commit")
 })

 it("Esc cancels — no onRename call, back to the plain title", () => {
 const onRename = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={renameActions(onRename)}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Rename card" }))
 const input = screen.getByLabelText("Rename card") as HTMLInputElement
 fireEvent.keyDown(input, { key: "Escape" })
 expect(onRename).not.toHaveBeenCalled()
 expect(screen.getByText("Edit image")).toBeTruthy()
 })

 it("empty commit is a no-op (tagKit contract: empty = cancel, keep the old name)", () => {
 const onRename = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={renameActions(onRename)}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Rename card" }))
 const input = screen.getByLabelText("Rename card") as HTMLInputElement
 fireEvent.change(input, { target: { value: " " } })
 fireEvent.keyDown(input, { key: "Enter" })
 expect(onRename).not.toHaveBeenCalled()
 expect(screen.getByText("Edit image")).toBeTruthy()
 })

 it("unchanged value commits as a no-op (no spurious store write)", () => {
 const onRename = vi.fn()
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={renameActions(onRename)}
 />,
 )
 fireEvent.click(screen.getByRole("button", { name: "Rename card" }))
 const input = screen.getByLabelText("Rename card") as HTMLInputElement
 fireEvent.keyDown(input, { key: "Enter" })
 expect(onRename).not.toHaveBeenCalled()
 })

 it("regression: no onRename wiring → no pencil, the plain h3 title", () => {
 renderWithTooltip(
 <CardDetailInline
 stage={makeStage()}
 upstreams={[]}
 running={false}
 actions={{ onEditSave: vi.fn() }}
 />,
 )
 expect(screen.queryByRole("button", { name: "Rename card" })).toBeNull()
 expect(screen.getByText("Edit image")).toBeTruthy()
 })
})
