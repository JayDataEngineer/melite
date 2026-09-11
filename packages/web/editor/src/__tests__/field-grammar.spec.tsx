// field-grammar.spec.tsx — THE GRAMMAR WALL (operator order, 2026-09-06:
// "THESE ARE DIFFERTN CSS FORMATS… THE WORDS AND THE MAGINS.. DIFFERENT!
// YOU ARE HANDROLLING AND NOT REUSING [REDACTED 2026-11-05] WHY"). Every param widget —
// NumberField, select dropdown, chips, boolean pills, textarea, free
// text — renders its label through ONE class and its control box
// through ONE class (@melite/ui/field FIELD_LABEL / FIELD_CONTROL). A
// widget that hand-rolls its own label or control classes FAILS this
// wall, whatever its type.
//
// MARGIN LAW (2026-09-06: "Why is the SPACING DIFFERENT between the
// WORDS and the INPUT PART"): FIELD_LABEL carries NO margin token —
// the label→control gap belongs to the FieldLabel ROW alone (mb-1).
// The first grammar stroke let the span keep mb-1 INSIDE the row's
// mb-1: double-stacked 8px next to NumberField's honest 4px.
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import React from "react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { ParamFields } from "../surfaces/flow/flowParamFields"
import { FIELD_LABEL, FIELD_CONTROL } from "@melite/ui/field"
import type { CardStage } from "@melite/contracts"

vi.mock("@melite/catalog", () => ({ inputSlots: vi.fn(() => []) }))
vi.mock("@melite/ui/tip", () => ({ Tip: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const BOX = FIELD_CONTROL.split(" ").filter((c) =>
 ["block", "rounded", "border", "border-sidebar-border/60", "bg-background/60", "px-1.5", "py-0.5", "text-[11px]"].includes(c),
)

// A spec exercising EVERY widget branch at once: numbers (Width/Height/
// Steps), select >5 options (Sampler), chips ≤5 (Style), boolean
// (Tiling), textarea (Notes), free text (a string with no widget).
const SPEC_FIELDS: Record<string, { type?: string; label?: string; options?: Array<{ value: string; label: string }>; tooltip?: string }> = {
 width: { type: "number", label: "Width" },
 height: { type: "number", label: "Height" },
 steps: { type: "number", label: "Steps" },
 sampler: { type: "select", label: "Sampler", options: ["euler", "euler_ancestral", "heun", "dpm_2", "lms", "ddim"].map((v) => ({ value: v, label: v })) },
 style: { type: "select", label: "Style", options: [{ value: "raw", label: "Raw" }, { value: "art", label: "Art" }] },
 tiling: { type: "boolean", label: "Tiling" },
 notes: { type: "textarea", label: "Notes" },
 reference: { label: "Reference" },
}
const DRAFT: Record<string, unknown> = {
 width: 1024, height: 1024, steps: 8,
 sampler: "euler", style: "raw", tiling: true,
 notes: "hello", reference: "img-42",
}

function renderParams() {
 return render(
 <TooltipProvider>
 <ParamFields
 draft={DRAFT}
 stage={{ id: "s1", params: DRAFT } as unknown as CardStage}
 specFields={SPEC_FIELDS}
 specVw={{}}
 specZones={{}}
 specModifierKeys={[]}
 specFeatures={null}
 specEnhancePrompt=""
 specEnhancePrompts={{}}
 enhancing={false}
 enhanceError={null}
 onFieldChange={vi.fn()}
 onSelectChange={vi.fn()}
 onEnhancePrompt={vi.fn()}
 onAgentEnhancePrompt={vi.fn()}
 serveLabel={null}
 agentEnhancing={false}
 />
 </TooltipProvider>,
 )
}

const wanted = ["Width", "Height", "Steps", "Sampler", "Style", "Tiling", "Notes", "Reference"]

describe("field grammar — ONE class for every widget", () => {
 it("every label span (numbers, selects, chips, boolean, textarea, free text) carries FIELD_LABEL verbatim", () => {
 const { container } = renderParams()
 const got: Record<string, string> = {}
 for (const span of Array.from(container.querySelectorAll("span"))) {
 const t = span.textContent?.trim() ?? ""
 if (wanted.includes(t) && !(t in got)) got[t] = span.className
 }
 for (const w of wanted) expect(got[w], `label "${w}" rendered`).toBeTruthy()
 for (const w of wanted) {
 expect(got[w].split(" ").sort().join(" "), `"${w}" label class`).toBe(FIELD_LABEL.split(" ").sort().join(" "))
 expect(got[w], `"${w}" label carries NO margin token`).not.toMatch(/(^|\s)m[tby]-/)
 }
 })

 it("the label ROW owns the one label→control margin — NumberField's row is the SAME structure", () => {
 const { container } = renderParams()
 const rows: string[] = []
 for (const span of Array.from(container.querySelectorAll("span"))) {
 const t = span.textContent?.trim() ?? ""
 if (!wanted.includes(t)) continue
 const row = span.closest("div")
 expect(row, `"${t}" has a row div`).toBeTruthy()
 rows.push(row!.className)
 }
 // every row: the single mb-1, the flex baseline — identical everywhere
 expect(new Set(rows).size).toBe(1)
 expect(rows[0]).toContain("mb-1")
 })

 it("every control box (number input, select trigger, textarea, free text) carries the FIELD_CONTROL grammar", () => {
 const { container } = renderParams()
 const controls = Array.from(
 container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
 "input, textarea",
 ),
 ).filter((el) => !el.closest("[data-numberfield]") || el.tagName === "INPUT")
 // the number scrubbers' inner input is transparent by design — the
 // BOX is their wrapper; assert the wrapper carries the box border.
 const scrubbers = Array.from(container.querySelectorAll("[data-numberfield]"))
 for (const sc of scrubbers) {
 // wrapper hosts the fill + scrub input → flex (already block-LEVEL,
 // never inline-block). It carries the box border grammar.
 for (const c of ["rounded", "border", "border-sidebar-border/60", "bg-background/60", "flex"]) {
 expect(sc.className, "numberfield wrapper box").toContain(c)
 }
 }
 // the >5-option select rides the kit SelectTrigger (a button, flex
 // value+chevron row — block-LEVEL like the scrubber wrapper, never
 // inline-block): same box border tokens, flex instead of block.
 const sel = container.querySelector('button[data-slot="select-trigger"]')
 expect(sel, "a select trigger rendered").toBeTruthy()
 for (const c of ["rounded", "border", "border-sidebar-border/60", "bg-background/60"]) {
 expect(sel!.className, "select trigger box").toContain(c)
 }
 expect(sel!.className, "select trigger is block-level").toMatch(/(^|\s)(block|flex)($|\s)/)
 const plain = controls.filter((el) => !el.closest("[data-numberfield]"))
 // Base UI Selects render a visually-hidden submission input
 // (id *-hidden-input, no type attr) — not a widget.
 const visible = plain.filter((el) => !el.id.endsWith("-hidden-input"))
 const ta = visible.find((el) => el.tagName === "TEXTAREA")
 const inp = visible.find((el) => el.tagName === "INPUT" && !el.closest("[data-numberfield]"))
 for (const el of [ta, inp]) {
 expect(el, "a control of this kind rendered").toBeTruthy()
 for (const c of BOX) expect(el!.className, `${el!.tagName} control box`).toContain(c)
 }
 })
})

// ── START SMALL, GROW ON DEMAND (operator order, verbatim: "it needs
// to START SMALL, and ONLY EXPAND when it needs more room") — the
// textarea grammar pin: two rows at rest, min-height floor, scrolls
// past the cap instead of growing the form forever.
describe("GrowTextarea — the textarea rest state", () => {
 it("starts at 2 rows with the min-height floor and the shared control box", () => {
 const { container } = renderParams()
 const tas = Array.from(container.querySelectorAll("textarea"))
 expect(tas.length).toBeGreaterThanOrEqual(1)
 for (const ta of tas) {
 expect(ta.getAttribute("rows")).toBe("2")
 expect(ta.className).toContain("min-h-[2.6rem]")
 expect(ta.className).toContain("block") // FIELD_CONTROL grammar
 expect(ta.className).toContain("scrollbar-thin")
 }
 })
})
