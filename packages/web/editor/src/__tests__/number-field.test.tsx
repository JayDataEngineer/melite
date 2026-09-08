/**
 * NumberField — the unified numeric parameter control (2026-08-10).
 *
 * Pins the three interactions the component unifies:
 *   1. CLICK the value → edit-in-place → type exact → Enter commits
 *   2. DRAG horizontally → scrubs ±delta (snaps to step, clamps to range)
 *   3. RANGE FILL → a fill bar renders when min/max are declared
 *
 * Replaces the old split between a bare <input type="number"> (type-only)
 * and a full-width <input type="range"> (drag-only, ate a whole row).
 * jsdom lacks real pointer capture; we stub setPointerCapture for the
 * drag test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { NumberField } from "@melite/ui/NumberField"

// jsdom doesn't implement pointer capture — stub it so the drag handler's
// setPointerCapture/releasePointerCapture don't throw.
beforeEach(() => {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  }
})
afterEach(cleanup)

describe("NumberField — rendering + range fill", () => {
  it("renders the label + current value", () => {
    renderWithTooltip(<NumberField value={42} onChange={() => {}} label="Steps" />)
    expect(screen.getByLabelText(/steps/i)).toHaveValue("42")
    expect(screen.getByText(/steps/i)).toBeTruthy()
  })

  it("shows a range-fill bar when min/max are declared (the slider's visual gift)", () => {
    const { container } = renderWithTooltip(
      <NumberField value={0.5} onChange={() => {}} min={0} max={1} step={0.01} label="Temp" />,
    )
    expect(container.querySelector("[data-numberfield-fill]")).toBeTruthy()
  })

  it("hides the fill bar for unbounded fields (seed, batch_size — no range)", () => {
    const { container } = renderWithTooltip(
      <NumberField value={-1} onChange={() => {}} label="Seed" />,
    )
    expect(container.querySelector("[data-numberfield-fill]")).toBeNull()
  })
})

describe("NumberField — type exact (the precision path)", () => {
  it("click → type → Enter commits the typed value", () => {
    const onChange = vi.fn()
    renderWithTooltip(<NumberField value={10} onChange={onChange} label="Steps" />)
    const field = screen.getByLabelText(/steps/i).closest("[data-numberfield]")!

    // Pointer down + up with no movement = click → enters edit mode.
    fireEvent.pointerDown(field, { clientX: 100, button: 0 })
    fireEvent.pointerUp(field, { clientX: 100 })
    const input = screen.getByLabelText(/steps/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: "42" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onChange).toHaveBeenCalledWith(42)
  })

  it("Esc cancels the edit (reverts to the prior value, no onChange)", () => {
    const onChange = vi.fn()
    renderWithTooltip(<NumberField value={10} onChange={onChange} label="Steps" />)
    const field = screen.getByLabelText(/steps/i).closest("[data-numberfield]")!

    fireEvent.pointerDown(field, { clientX: 100, button: 0 })
    fireEvent.pointerUp(field, { clientX: 100 })
    const input = screen.getByLabelText(/steps/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: "999" } })
    fireEvent.keyDown(input, { key: "Escape" })

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("NumberField — drag to scrub (the slider's ease)", () => {
  it("horizontal drag updates the value, snapped to step + clamped to range", () => {
    const onChange = vi.fn()
    const { container } = renderWithTooltip(
      <NumberField value={0.5} onChange={onChange} min={0} max={1} step={0.1} label="Temp" />,
    )
    const field = container.querySelector("[data-numberfield]")!

    // Pointer down, move ~50px right (bounded range crosses full span in
    // ~200px, so 50px ≈ +0.25 → snapped to 0.1 → +0.3 from start 0.5).
    fireEvent.pointerDown(field, { clientX: 100, button: 0 })
    fireEvent.pointerMove(field, { clientX: 150 })
    fireEvent.pointerUp(field, { clientX: 150 })

    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last).toBeGreaterThan(0.5)
    expect(last).toBeLessThanOrEqual(1)
  })

  it("Shift drag = fine (0.1× speed)", () => {
    const onChange = vi.fn()
    const { container } = renderWithTooltip(
      <NumberField value={0.5} onChange={onChange} min={0} max={1} step={0.01} label="Temp" />,
    )
    const field = container.querySelector("[data-numberfield]")!

    // Same 100px drag with Shift → ~10× smaller delta than without.
    fireEvent.pointerDown(field, { clientX: 100, button: 0 })
    fireEvent.pointerMove(field, { clientX: 200, shiftKey: true })
    fireEvent.pointerUp(field, { clientX: 200 })

    const fineDelta = Math.abs((onChange.mock.calls.at(-1)?.[0] ?? 0.5) - 0.5)

    cleanup()
    const onChange2 = vi.fn()
    const { container: c2 } = renderWithTooltip(
      <NumberField value={0.5} onChange={onChange2} min={0} max={1} step={0.01} label="Temp" />,
    )
    const field2 = c2.querySelector("[data-numberfield]")!
    fireEvent.pointerDown(field2, { clientX: 100, button: 0 })
    fireEvent.pointerMove(field2, { clientX: 200 })
    fireEvent.pointerUp(field2, { clientX: 200 })
    const coarseDelta = Math.abs((onChange2.mock.calls.at(-1)?.[0] ?? 0.5) - 0.5)

    expect(fineDelta).toBeLessThan(coarseDelta)
  })
})

// ── 2026-09-06 gap plug — the guard rails the unification also owns ──

describe("NumberField — scrub guard rails", () => {
 it("below the 3px threshold nothing changes (a jitter is not a scrub)", () => {
 const onChange = vi.fn()
 const { container } = renderWithTooltip(
 <NumberField value={8} onChange={onChange} min={1} max={30} step={2} label="Steps" />,
 )
 const field = container.querySelector("[data-numberfield]")!
 fireEvent.pointerDown(field, { clientX: 100, button: 0 })
 fireEvent.pointerMove(field, { clientX: 102 }) // 2px — under threshold
 expect(onChange).not.toHaveBeenCalled()
 fireEvent.pointerUp(field, { clientX: 102 })
 })

 it("past the threshold the value SNAPS to the step grid", () => {
 const onChange = vi.fn()
 const { container } = renderWithTooltip(
 <NumberField value={8} onChange={onChange} min={1} max={30} step={2} label="Steps" />,
 )
 const field = container.querySelector("[data-numberfield]")!
 fireEvent.pointerDown(field, { clientX: 100, button: 0 })
 // sensitivity = step (2/px when step > range/200); the threshold is
 // STRICTLY >3px, so +4px = +8 → 16
 fireEvent.pointerMove(field, { clientX: 104 })
 const last = onChange.mock.calls.at(-1)?.[0]
 expect(last).toBe(16)
 fireEvent.pointerUp(field, { clientX: 104 })
 })

 it("a non-primary button never starts a scrub", () => {
 const onChange = vi.fn()
 const { container } = renderWithTooltip(
 <NumberField value={8} onChange={onChange} min={1} max={30} step={1} label="Steps" />,
 )
 const field = container.querySelector("[data-numberfield]")!
 fireEvent.pointerDown(field, { clientX: 100, button: 2 })
 fireEvent.pointerMove(field, { clientX: 200 })
 expect(onChange).not.toHaveBeenCalled()
 })

 it("onCommit fires ONCE on drag release, never mid-move", () => {
 const onChange = vi.fn()
 const onCommit = vi.fn()
 const { container } = renderWithTooltip(
 <NumberField value={8} onChange={onChange} onCommit={onCommit} min={1} max={30} step={1} label="Steps" />,
 )
 const field = container.querySelector("[data-numberfield]")!
 fireEvent.pointerDown(field, { clientX: 100, button: 0 })
 fireEvent.pointerMove(field, { clientX: 130 })
 fireEvent.pointerMove(field, { clientX: 160 })
 expect(onCommit).not.toHaveBeenCalled()
 fireEvent.pointerUp(field, { clientX: 160 })
 expect(onCommit).toHaveBeenCalledTimes(1)
 })

 it("a typed Enter COMMITS clamped (999 → max), garbage text never NaNs", () => {
 const onChange = vi.fn()
 const onCommit = vi.fn()
 const { container } = renderWithTooltip(
 <NumberField value={8} onChange={onChange} onCommit={onCommit} min={1} max={30} step={1} label="Steps" />,
 )
 const field = container.querySelector("[data-numberfield]")!
 // clean click → edit mode
 fireEvent.pointerDown(field, { clientX: 100, button: 0 })
 fireEvent.pointerUp(field, { clientX: 100 })
 const input = field.querySelector("input")!
 expect(input.style.pointerEvents).toBe("auto") // the input owns it now
 fireEvent.change(input, { target: { value: "999" } })
 fireEvent.keyDown(input, { key: "Enter" })
 expect(onChange).toHaveBeenLastCalledWith(30)
 expect(onCommit).toHaveBeenLastCalledWith(30)
 // rest state returns: the container owns pointer events again
 expect(input.style.pointerEvents).toBe("none")

 // garbage: no commit, no NaN leak
 const c2 = renderWithTooltip(
 <NumberField value={3} onChange={onChange} onCommit={onCommit} min={1} max={30} step={1} label="Steps" />,
 ).container
 const f2 = c2.querySelector("[data-numberfield]")!
 fireEvent.pointerDown(f2, { clientX: 100, button: 0 })
 fireEvent.pointerUp(f2, { clientX: 100 })
 const i2 = f2.querySelector("input")!
 fireEvent.change(i2, { target: { value: "abc" } })
 fireEvent.keyDown(i2, { key: "Enter" })
 expect(onChange).not.toHaveBeenCalledWith(NaN)
 })
})
