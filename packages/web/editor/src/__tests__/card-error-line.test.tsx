/**
 * CardErrorLine — the tile's FULL-ERROR affordance (2026-08-15).
 *
 * THE LIE THIS KILLS: the run-failure toast says "(full error on the
 * card)" while the card itself clipped the message to one truncated
 * line with the full text only in a hover tip (which itself clips long
 * ComfyUI stack traces). Contract now:
 *   • default: single truncated line (data-card-error preserved — the
 *     2026-08-10 pin keeps passing)
 *   • ONE click: the complete message inline — wrapping, pre-wrap,
 *     scroll-capped (a stack trace can't blow out the tile grid)
 *   • second click: collapse back
 *   • never rendered for non-error stages
 */
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { CardErrorLine } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
const FULL =
  'RuntimeError: kimodo_motion[text_to_pose]: ComfyUI workflow failed: ' +
  'Error in call to target \'kimodo.model.llm2vec.llm2vec_wrapper.LLM2VecEncoder\': ' +
  'ValueError("Can\'t find \'adapter_config.json\' at \'McGill-NLP/LLM2Vec-Meta-Llama-3-8B-Instruct-mntp-supervised\'")'

const stage = (over: Partial<CardStage> = {}): CardStage => ({
  id: "s0", title: "Motion", kind: "generation", service: "kimodo-motion",
  genre: "motion", params: {}, inputs: [], inputIndices: [], result: null,
  status: "error", error: FULL, meta: {}, ...over,
})

const renderLine = (s: CardStage) =>
  render(<TooltipProvider><CardErrorLine stage={s} /></TooltipProvider>)

describe("CardErrorLine — full error on the card", () => {
  it("renders the truncated line by default (the 2026-08-10 pin's shape)", () => {
    const { container } = renderLine(stage())
    const el = container.querySelector('[data-card-error="s0"]') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.getAttribute("data-open")).toBe("false")
    // One line, clipped via CSS truncate — the full-text block is absent.
    expect(container.querySelector('[data-testid="card-error-full"]')).toBeNull()
    expect(el.textContent).toContain("RuntimeError: kimodo_motion")
  })

  it("ONE click expands the COMPLETE message inline", () => {
    const { container } = renderLine(stage())
    fireEvent.click(screen.getByTestId("card-error-toggle"))
    const el = container.querySelector('[data-card-error="s0"]') as HTMLElement
    expect(el.getAttribute("data-open")).toBe("true")
    const full = screen.getByTestId("card-error-full")
    // The tail — exactly what a truncation eats — is present verbatim.
    expect(full.textContent).toBe(FULL)
    expect(full.textContent.endsWith("-mntp-supervised\'\")")).toBe(true)
    // Scroll-capped so a stack trace can't blow out the tile grid.
    expect(full.className).toContain("max-h-40")
    expect(full.className).toContain("whitespace-pre-wrap")
  })

  it("expanded state renders the message ONCE — never duplicated (2026-08-15)", () => {
    // THE BUG: open flipped the toggle span to break-words/pre-wrap while
    // the expanded block below rendered the same text again — the user saw
    // the full error TWICE on the card ("Seeing an error twice. Should
    // never see it like this."), and the wrapping span's unbounded height
    // stretched the tile row. The toggle line must stay the ONE truncated
    // line in every state; the complete text lives only in the block.
    const { container } = renderLine(stage())
    fireEvent.click(screen.getByTestId("card-error-toggle"))
    const toggle =
      screen.getByTestId("card-error-toggle").querySelector("span")!
    // The toggle span is truncated in BOTH states — the wrapping form is
    // gone from the span entirely (this is the class the bug removed).
    expect(toggle.className).toContain("truncate")
    expect(toggle.className).not.toContain("whitespace-pre-wrap")
    // Exactly ONE wrapping element carries the message: the block.
    const full = screen.getByTestId("card-error-full")
    expect(full.textContent).toBe(FULL)
    // The whole error line contains exactly 2 elements whose text starts
    // with the message (the truncated toggle + the full block) and only
    // the block wraps — visually the message reads once + its one-line
    // teaser. A regression to the duplicate renders the span in pre-wrap.
    const el = container.querySelector('[data-card-error="s0"]') as HTMLElement
    expect(el.getAttribute("data-open")).toBe("true")
  })

  it("second click collapses back to the truncated line", () => {
    renderLine(stage())
    const toggle = screen.getByTestId("card-error-toggle")
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(screen.queryByTestId("card-error-full")).toBeNull()
  })

  it("never renders for non-error stages (or empty errors)", () => {
    const { container } = renderLine(stage({ status: "running", error: null }))
    expect(container.querySelector('[data-card-error="s0"]')).toBeNull()
    const { container: c2 } = renderLine(stage({ error: "" }))
    expect(c2.querySelector('[data-card-error="s0"]')).toBeNull()
  })

  // 2026-08-23: the toast appends "… (full error on the card)" only past
  // 300 chars — at that SAME threshold the card must open ALREADY showing
  // the complete message. The promise is made exactly when it is kept.
  const LONG =
    "ValueError: generate_image: controlnets declares type='depth' " +
    "(-> artifact 'depth') but no upstream brick produced that artifact. " +
    "Available artifacts in ctx: []. Either add an upstream brick that outputs 'depth', " +
    "or remove this CN from controlnets. Refusing to silently skip. " +
    "Rejected BEFORE the run started — no GPU work done, no run_id created. " +
    "(padding to push this well past the three-hundred character threshold)"

  it("long errors (>300ch) start OPEN — the full text IS on the card", () => {
    expect(LONG.length).toBeGreaterThan(300)
    const { container } = renderLine(stage({ error: LONG }))
    const el = container.querySelector('[data-card-error="s0"]') as HTMLElement
    expect(el.getAttribute("data-open")).toBe("true")
    const full = screen.getByTestId("card-error-full")
    expect(full.textContent).toBe(LONG)
    // The truncated teaser line still renders above the block.
    expect(el.textContent).toContain("ValueError: generate_image")
  })

  it("short errors keep the one-line default (no auto-expand)", () => {
    const { container } = renderLine(stage({ error: "short failure" }))
    expect(container.querySelector('[data-card-error="s0"]')!.getAttribute("data-open")).toBe("false")
    expect(screen.queryByTestId("card-error-full")).toBeNull()
  })
})
