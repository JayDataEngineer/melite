/**
 * BeatKnobControl — the schema-driven knob fold (BEHAVIORAL).
 *
 * PINS (labels/options are the schema's, never hand lists): the
 * boolean face (on/off + the inherited ghost), the enum face
 * (declaration-order options), the number/integer faces (steps +
 * ghosts), the string face, unknown knobs (label = the key), and
 * REPLACE onChange (unset → undefined, never a sentinel).
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { BeatKnobControl } from "../src/ui/studio/BeatKnobControl.tsx"
import type { KnobKey, LayerA } from "../src/ui/studio/docModel.ts"
import { hydrateLayerA } from "../src/ui/studio/docHydrate.ts"

function ghosted(extra: Record<string, unknown>): LayerA {
  return { ...hydrateLayerA(undefined), ...extra } as LayerA
}

describe("the boolean face (on/off selects)", () => {
  it("renders on/off; the ghost names what unset inherits", () => {
    const seen: unknown[][] = []
    const { unmount } = render(
      <BeatKnobControl callIndex={0} knob="sharpen_enabled" value={undefined} onChange={(k, v) => { seen.push([k, v]) }} />,
    )
    const sel = screen.getByLabelText("Call 0 knob: sharpen_enabled") as HTMLSelectElement
    assert.equal(sel.value, "")
    assert.equal(sel.options[0]!.text, "inherit")
    assert.equal(sel.title, "unset — the engine default applies")
    // on → true, off → false, inherit → undefined (REPLACE, no sentinel)
    fireEvent.change(sel, { target: { value: "true" } })
    fireEvent.change(sel, { target: { value: "false" } })
    fireEvent.change(sel, { target: { value: "" } })
    assert.deepEqual(seen, [["sharpen_enabled", true], ["sharpen_enabled", false], ["sharpen_enabled", undefined]])
    unmount()
  })

  it("a set value selects; ghosts translate on/off", () => {
    const layerA = ghosted({ sharpen_enabled: true })
    const r1 = render(
      <BeatKnobControl callIndex={1} knob="sharpen_enabled" value={true} layerA={layerA} onChange={() => {}} />,
    )
    const sel = screen.getByLabelText("Call 1 knob: sharpen_enabled") as HTMLSelectElement
    assert.equal(sel.value, "true")
    assert.equal(sel.options[0]!.text, "← on")
    assert.ok(sel.title.includes("inherits on"))
    r1.unmount()
    const r2 = render(
      <BeatKnobControl callIndex={1} knob="sharpen_enabled" value={false} layerA={ghosted({ sharpen_enabled: false })} onChange={() => {}} />,
    )
    const sel2 = screen.getByLabelText("Call 1 knob: sharpen_enabled") as HTMLSelectElement
    assert.equal(sel2.value, "false")
    assert.equal(sel2.options[0]!.text, "← off")
    assert.ok(sel2.title.includes("inherits off"))
    r2.unmount()
    expect(sel2.options.length).toBe(3)
  })
})

describe("the enum face (the schema's options, in order)", () => {
  it("options ride declaration order; numbers stringify; ghosts show", () => {
    const seen: unknown[][] = []
    render(
      <BeatKnobControl callIndex={0} knob="sampler_name" value="euler" layerA={ghosted({ sampler_name: "euler" })} onChange={(k, v) => { seen.push([k, v]) }} />,
    )
    const sel = screen.getByLabelText("Call 0 knob: sampler_name") as HTMLSelectElement
    assert.equal(sel.value, "euler")
    const texts = [...sel.options].map((o) => o.text)
    assert.ok(texts.indexOf("euler") < texts.indexOf("heun"), "declaration order kept")
    assert.equal(sel.options[0]!.text, "← euler")
    fireEvent.change(sel, { target: { value: "dpmpp_2m" } })
    assert.deepEqual(seen, [["sampler_name", "dpmpp_2m"]])
  })

  it("a numeric value stringifies into the select; unset selects inherit", () => {
    const r1 = render(
      <BeatKnobControl callIndex={0} knob="sla_block_size" value={64} onChange={() => {}} />,
    )
    const sel = screen.getByLabelText("Call 0 knob: sla_block_size") as HTMLSelectElement
    assert.equal(sel.value, "64")
    r1.unmount()
    render(
      <BeatKnobControl callIndex={0} knob="sla_block_size" value={undefined} onChange={() => {}} />,
    )
    const sel2 = screen.getByLabelText("Call 0 knob: sla_block_size") as HTMLSelectElement
    assert.equal(sel2.value, "")
  })
})

describe("the number face (card gate owns the floors)", () => {
  it("reals step 0.1, integers step 1; ghosts ride the placeholder", () => {
    const seen: unknown[][] = []
    const r1 = render(
      <BeatKnobControl callIndex={2} knob="denoise" value={0.7} layerA={ghosted({ denoise: 0.5 })} onChange={(k, v) => { seen.push([k, v]) }} />,
    )
    const num = screen.getByLabelText("Call 2 knob: denoise") as HTMLInputElement
    assert.equal(num.step, "0.1")
    assert.equal(num.value, "0.7")
    assert.equal(num.placeholder, "0.5")
    assert.ok(num.title.includes("inherits 0.5"))
    fireEvent.change(num, { target: { value: "0.9" } })
    assert.deepEqual(seen, [["denoise", 0.9]])
    r1.unmount()
    render(
      <BeatKnobControl callIndex={2} knob="sla_dense_last_steps" value={undefined} onChange={() => {}} />,
    )
    const int = screen.getByLabelText("Call 2 knob: sla_dense_last_steps") as HTMLInputElement
    assert.equal(int.step, "1")
    assert.equal(int.value, "")
    assert.equal(int.placeholder, "inherit")
  })
})

describe("the string face + unknown knobs", () => {
  it("free text rides; unset rides undefined", () => {
    const seen: unknown[][] = []
    render(
      <BeatKnobControl callIndex={0} knob="sla_dense_steps" value="1-3" layerA={ghosted({ sla_dense_steps: "2-4" })} onChange={(k, v) => { seen.push([k, v]) }} />,
    )
    const inp = screen.getByLabelText("Call 0 knob: sla_dense_steps") as HTMLInputElement
    assert.equal(inp.value, "1-3")
    assert.equal(inp.placeholder, "2-4")
    fireEvent.change(inp, { target: { value: "  " } })
    assert.deepEqual(seen, [["sla_dense_steps", undefined]])
  })

  it("a carrier-absent knob renders a labeled string face (never a crash)", () => {
    render(
      <BeatKnobControl callIndex={3} knob={"mystery_knob" as KnobKey} value={undefined} onChange={() => {}} />,
    )
    const inp = screen.getByLabelText("Call 3 knob: mystery_knob") as HTMLInputElement
    assert.equal(inp.type, "text")
    assert.equal(inp.placeholder, "inherit")
    // null/empty ghosts read as unset too
    const { unmount } = render(
      <BeatKnobControl callIndex={3} knob={"mystery_knob" as KnobKey} value={42} layerA={ghosted({ mystery_knob: null })} onChange={() => {}} />,
    )
    void unmount
    expect(inp.value).toBe("")
  })
})
