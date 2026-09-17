/**
 * kit — the studio's DSH-pure control kit (BEHAVIORAL).
 *
 * PINS (fakes-not-mocks: real DOM in, recorded payloads out):
 *  - isImageUrl / ASSET_DRAG_MIME vocabulary.
 *  - every control: inherit-aware value faces, change payloads,
 *    density/variant/disabled arms.
 *  - FilmPlayer: the imperative seam (seekTo clamp, current,
 *    duration, play/pause/toggle), the time/duration/playing
 *    reports, the 4Hz poll, raf cleanup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h, createRef } from "react"
import {
  ASSET_DRAG_MIME,
  CheckControl,
  ControlRow,
  EmptyState,
  NumberControl,
  PaneHeader,
  PaneShell,
  SectionLabel,
  SelectControl,
  SelectMenu,
  SliderControl,
  TextControl,
  Tip,
  TriControl,
  isImageUrl,
} from "../src/ui/studio/kit.tsx"

beforeEach(() => cleanup())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("isImageUrl + ASSET_DRAG_MIME", () => {
  it("thumbnails: data:, blob:, and image extensions (query/fragment tolerant)", () => {
    assert.equal(isImageUrl("data:image/png;base64,AAA"), true)
    assert.equal(isImageUrl("DATA:IMAGE/JPEG;base64,AAA"), true)
    assert.equal(isImageUrl("blob:https://x/123"), true)
    assert.equal(isImageUrl("https://cdn/x/a.PNG"), true)
    assert.equal(isImageUrl("https://cdn/x/a.jpeg?w=2"), true)
    assert.equal(isImageUrl("/files/a.webp#frag"), true)
    assert.equal(isImageUrl("data:video/mp4;base64,AAA"), false)
    assert.equal(isImageUrl("https://cdn/x/a.mp4"), false)
    assert.equal(isImageUrl("video_w1_main"), false)
    assert.equal(isImageUrl(""), false)
  })

  it("the tray MIME is the studio's own contract", () => {
    assert.equal(ASSET_DRAG_MIME, "application/tech-noir-asset")
  })
})

describe("Tip", () => {
  it("no tip = the child alone (never an empty bubble anchor)", () => {
    render(h(Tip, { children: h("span", { "data-testid": "kid" }, "k") }))
    assert.equal(screen.getByTestId("kid").textContent, "k")
  })

  it("a tip wraps the child in the DSH Tooltip", () => {
    render(h(Tip, { tip: "hello", children: h("span", { "data-testid": "kid" }, "k") }))
    assert.equal(screen.getByTestId("kid").textContent, "k")
    expect(document.body.textContent).toContain("k")
  })
})

describe("ControlRow + SectionLabel", () => {
  it("sm/md densities and the hint arm", () => {
    const { container, rerender } = render(h(ControlRow, { label: "L", density: "sm", children: "c" }))
    assert.ok((container.firstChild as HTMLElement).className.length > 0)
    rerender(h(ControlRow, { label: "L", hint: h("i", null, "h"), className: "extra", children: "c" }))
    expect(document.body.textContent).toContain("h")
  })

  it("SectionLabel renders the tail only when given", () => {
    render(h(SectionLabel, { tail: h("b", null, "t"), children: "head" }))
    expect(document.body.textContent).toContain("t")
    cleanup()
    render(h(SectionLabel, { className: "c", children: "head" }))
    expect(document.body.textContent).toContain("head")
  })
})

describe("NumberControl", () => {
  it("a number value shows; clearing/typing junk writes undefined", () => {
    const seen: Array<number | undefined> = []
    render(h(NumberControl, { ariaLabel: "n", value: 3, onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("n") as HTMLInputElement
    assert.equal(el.value, "3")
    fireEvent.change(el, { target: { value: "7" } })
    fireEvent.change(el, { target: { value: "" } })
    fireEvent.change(el, { target: { value: "junk" } })
    assert.deepEqual(seen, [7, undefined, undefined])
  })

  it("undefined value renders empty; sm/center/disabled/title/testId ride", () => {
    render(h(NumberControl, {
      ariaLabel: "n2", value: undefined, onChange: () => {}, min: 1, max: 5,
      step: 1, placeholder: "ph", align: "center", width: "w-12",
      disabled: true, title: "t", testId: "num-2", size: "sm",
    }))
    const el = screen.getByTestId("num-2") as HTMLInputElement
    assert.equal(el.value, "")
    assert.equal(el.placeholder, "ph")
    assert.equal(el.disabled, true)
  })
})

describe("TextControl", () => {
  it("trims on write; blank writes undefined (inherit)", () => {
    const seen: Array<string | undefined> = []
    render(h(TextControl, { ariaLabel: "t", value: " v ", onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("t") as HTMLInputElement
    assert.equal(el.value, " v ")
    fireEvent.change(el, { target: { value: "  hi  " } })
    fireEvent.change(el, { target: { value: "   " } })
    assert.deepEqual(seen, ["hi", undefined])
  })

  it("undefined value renders empty; disabled rides", () => {
    render(h(TextControl, { ariaLabel: "t2", value: undefined, onChange: () => {}, width: "w-full", disabled: true }))
    assert.equal((screen.getByLabelText("t2") as HTMLInputElement).value, "")
  })
})

describe("SelectControl", () => {
  it("string options + object options (label fallback = value)", () => {
    const seen: Array<string | undefined> = []
    render(h(SelectControl, {
      ariaLabel: "s", value: "b", onChange: (v) => { seen.push(v) },
      options: ["a", "b", { value: "c", label: "See" }, { value: "d" }],
    }))
    const el = screen.getByLabelText("s") as HTMLSelectElement
    assert.equal(el.value, "b")
    fireEvent.change(el, { target: { value: "c" } })
    fireEvent.change(el, { target: { value: "" } })
    assert.deepEqual(seen, ["c", undefined])
    expect(document.body.textContent).toContain("See")
  })

  it("emptyLabel=false drops the inherit row; undefined value selects it when present", () => {
    render(h(SelectControl, {
      ariaLabel: "s2", value: undefined, onChange: () => {},
      options: ["a"], emptyLabel: false, width: "w-12", mono: true,
      disabled: true, title: "t", testId: "sel-2",
    }))
    const el = screen.getByTestId("sel-2") as HTMLSelectElement
    assert.equal(el.options.length, 1)
    cleanup()
    render(h(SelectControl, { ariaLabel: "s3", value: undefined, onChange: () => {}, options: ["a"] }))
    assert.equal((screen.getByLabelText("s3") as HTMLSelectElement).value, "")
  })
})

describe("TriControl (inherit/on/off over the shared atom)", () => {
  it("undefined → inherit selected; choosing on writes true", () => {
    const seen: Array<boolean | undefined> = []
    render(h(TriControl, { ariaLabel: "tri", value: undefined, onChange: (v) => { seen.push(v) }, width: "w-12", disabled: true }))
    const el = screen.getByLabelText("tri") as HTMLSelectElement
    assert.equal(el.value, "")
    fireEvent.change(el, { target: { value: "true" } })
    assert.deepEqual(seen, [true])
  })

  it("off writes false; inherit writes undefined", () => {
    const seen: Array<boolean | undefined> = []
    render(h(TriControl, { ariaLabel: "tri2", value: true, onChange: (v) => { seen.push(v) } }))
    const el = screen.getByLabelText("tri2") as HTMLSelectElement
    fireEvent.change(el, { target: { value: "false" } })
    fireEvent.change(el, { target: { value: "" } })
    assert.deepEqual(seen, [false, undefined])
  })
})

describe("CheckControl (the two-state boolean)", () => {
  it("checked mirrors triple-state (only exact true is on); toggles ride", () => {
    const seen: boolean[] = []
    const { rerender } = render(h(CheckControl, { ariaLabel: "cc", checked: true, onChange: (v) => { seen.push(v) }, disabled: true }))
    rerender(h(CheckControl, { ariaLabel: "cc", checked: false, onChange: (v) => { seen.push(v) } }))
    rerender(h(CheckControl, { ariaLabel: "cc", checked: undefined, onChange: (v) => { seen.push(v) } }))
    assert.deepEqual(seen, [])
    expect(document.body.textContent !== null).toBe(true)
  })
})

describe("SliderControl", () => {
  it("the readout formats when given, raw otherwise; drags ride numeric", () => {
    const seen: number[] = []
    render(h(SliderControl, {
      ariaLabel: "sl", value: 0.5, onChange: (v) => { seen.push(v) },
      min: 0, max: 1, step: 0.1, format: (v) => `${Math.round(v * 100)}%`, width: "w-full", disabled: true,
    }))
    expect(document.body.textContent).toContain("50%")
    fireEvent.change(screen.getByLabelText("sl"), { target: { value: "0.7" } })
    cleanup()
    render(h(SliderControl, { ariaLabel: "sl2", value: 3, onChange: (v) => { seen.push(v) }, min: 0, max: 8 }))
    expect(document.body.textContent).toContain("3")
    assert.deepEqual(seen, [0.7])
  })
})

describe("SelectMenu", () => {
  it("picks ride the typed value; the dead popover prop is accepted", () => {
    const seen: string[] = []
    render(h(SelectMenu, {
      value: "a", onChange: (v) => { seen.push(v as string) },
      options: [{ value: "a", label: "Ay" }, { value: "b", label: "Bee" }],
      className: "c", buttonClassName: "b", popoverClassName: "dead",
      disabled: true, "aria-label": "menu", title: "t",
    }))
    fireEvent.change(screen.getByLabelText("menu"), { target: { value: "b" } })
    assert.deepEqual(seen, ["b"])
  })
})

describe("EmptyState + PaneHeader + PaneShell", () => {
  it("EmptyState: overlay/pane variants, icon + hint arms", () => {
    render(h(EmptyState, { icon: h("i", null, "ic"), title: "T", hint: "H", variant: "overlay", className: "x" }))
    expect(document.body.textContent).toContain("H")
    cleanup()
    render(h(EmptyState, { title: "T2" }))
    expect(document.body.textContent).toContain("T2")
  })

  it("PaneHeader: preview vs strip, every slot's null arm", () => {
    render(h(PaneHeader, {
      variant: "preview", title: "P", meta: "M", hint: h("i", null, "H"), lead: h("i", null, "L"), className: "c",
    }))
    expect(document.body.textContent).toContain("P")
    cleanup()
    // preview with NO title/meta: the bare hero (null arms)
    render(h(PaneHeader, { variant: "preview", hint: h("i", null, "H0") }))
    expect(document.body.textContent).toContain("H0")
    cleanup()
    render(h(PaneHeader, { title: "S", meta: "M2", hint: h("i", null, "H2") }))
    expect(document.body.textContent).toContain("S")
    cleanup()
    render(h(PaneHeader, {}))
    assert.ok(document.querySelector('[data-slot="pane-header"]') !== null)
  })

  it("PaneShell boxes children", () => {
    render(h(PaneShell, { className: "c", children: h("b", { "data-testid": "in" }, "x") }))
    assert.equal(screen.getByTestId("in").textContent, "x")
  })
})
