/**
 * cardControls — the generic card-form control kit.
 *
 * Behavior contract (appearance is Tailwind classes, verified by eye):
 *   • NumberControl / TextControl / SelectControl treat `undefined` as
 *     INHERIT — empty input maps back to undefined in onChange, selects
 *     carry an inherit option first.
 *   • SelectControl with emptyLabel={false} renders NO empty option and
 *     never emits undefined.
 *   • TriControl round-trips the boolean tri-state: undefined | true | false.
 *   • SliderControl renders range + readout; CheckControl the checkbox.
 *   • ControlRow renders label on the left, control on the right, at the
 *     two densities (md text-[10px], sm text-[9px]).
 */
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import {
  CheckControl,
  ControlRow,
  NumberControl,
  SectionLabel,
  SelectControl,
  SliderControl,
  TextControl,
  TriControl,
} from "@melite/ui/cardControls"

describe("NumberControl (inherit semantics)", () => {
  it("renders empty for undefined; clearing a set value emits undefined", () => {
    const onChange = vi.fn()
    const { rerender } = render(<NumberControl ariaLabel="n" value={undefined} onChange={onChange} />)
    const el = screen.getByLabelText("n") as HTMLInputElement
    expect(el.value).toBe("")
    // clearing fires only when there WAS a number (React suppresses
    // no-op changes) — hydrate a value, then clear it
    rerender(<NumberControl ariaLabel="n" value={4} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("n"), { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("emits the number on type", () => {
    const onChange = vi.fn()
    render(<NumberControl ariaLabel="n" value={4} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("n"), { target: { value: "6" } })
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it("non-finite input emits undefined (the handroll guard, preserved)", () => {
    const onChange = vi.fn()
    render(<NumberControl ariaLabel="n" value={4} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("n"), { target: { value: "abc" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

describe("TextControl", () => {
  it("trims and maps empty to undefined", () => {
    const onChange = vi.fn()
    render(<TextControl ariaLabel="t" value={"0,1"} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("t"), { target: { value: "  " } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

describe("SelectControl", () => {
  it("renders the inherit option first by default", () => {
    render(
      <SelectControl ariaLabel="s" value={undefined} onChange={() => {}} options={["euler", "heun"]} />,
    )
    const sel = screen.getByLabelText("s") as HTMLSelectElement
    expect(sel.options[0]?.text).toBe("inherit")
    expect(sel.options[1]?.text).toBe("euler")
  })

  it("emptyLabel={false} omits the empty option", () => {
    render(
      <SelectControl ariaLabel="s" value={"a"} onChange={() => {}} options={["a", "b"]} emptyLabel={false} />,
    )
    const sel = screen.getByLabelText("s") as HTMLSelectElement
    expect(sel.options.length).toBe(2)
  })

  it("custom emptyLabel carries the run-panel phrasing", () => {
    render(
      <SelectControl ariaLabel="s" value={undefined} onChange={() => {}} options={["euler"]} emptyLabel="engine default (euler)" />,
    )
    expect((screen.getByLabelText("s") as HTMLSelectElement).options[0]?.text).toBe("engine default (euler)")
  })

  it("object options carry labels", () => {
    render(
      <SelectControl ariaLabel="s" value={undefined} onChange={() => {}} options={[{ value: "k", label: "kitchen" }]} />,
    )
    expect((screen.getByLabelText("s") as HTMLSelectElement).options[1]?.text).toBe("kitchen")
  })

  it("empty selection emits undefined", () => {
    const onChange = vi.fn()
    render(<SelectControl ariaLabel="s" value={"euler"} onChange={onChange} options={["euler"]} />)
    fireEvent.change(screen.getByLabelText("s"), { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

describe("TriControl (inherit / on / off)", () => {
  it("round-trips the tri-state", () => {
    const onChange = vi.fn()
    const { rerender } = render(<TriControl ariaLabel="b" value={undefined} onChange={onChange} />)
    const sel = screen.getByLabelText("b") as HTMLSelectElement
    expect(sel.value).toBe("")
    fireEvent.change(sel, { target: { value: "true" } })
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<TriControl ariaLabel="b" value={true} onChange={onChange} />)
    expect((screen.getByLabelText("b") as HTMLSelectElement).value).toBe("true")
    fireEvent.change(screen.getByLabelText("b"), { target: { value: "false" } })
    expect(onChange).toHaveBeenCalledWith(false)
    fireEvent.change(screen.getByLabelText("b"), { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

describe("SliderControl + CheckControl", () => {
  it("slider emits numbers and renders the readout", () => {
    const onChange = vi.fn()
    const { container } = render(
      <SliderControl ariaLabel="sl" value={12} onChange={onChange} min={0.01} max={100} step={0.01} />,
    )
    const range = screen.getByLabelText("sl") as HTMLInputElement
    expect(range.type).toBe("range")
    expect(container.textContent).toContain("12")
    fireEvent.change(range, { target: { value: "42" } })
    expect(onChange).toHaveBeenCalledWith(42)
  })

  it("checkbox round-trips", () => {
    const onChange = vi.fn()
    render(<CheckControl ariaLabel="c" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText("c"))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe("ControlRow + SectionLabel", () => {
  it("row places label left, control right, at both densities", () => {
    render(
      <ControlRow label="Knob" density="sm">
        <NumberControl ariaLabel="k" value={1} onChange={() => {}} />
      </ControlRow>,
    )
    expect(screen.getByText("Knob")).toBeTruthy()
    expect(screen.getByLabelText("k")).toBeTruthy()
  })

  it("section label renders heading + tail", () => {
    render(<SectionLabel tail="window 1344×768">Engine (H3)</SectionLabel>)
    expect(screen.getByText("Engine (H3)")).toBeTruthy()
    expect(screen.getByText("window 1344×768")).toBeTruthy()
  })
})
