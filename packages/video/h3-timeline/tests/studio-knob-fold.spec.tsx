/**
 * THE OVERRIDE PARAMETER LAYER (hour 22) — the call-knob fold rides
 * the GENERIC OverlayKnob (card-base) over the SERVED envelope's own
 * serialization (carrier.toJSON — schemastery's, never a hand
 * projection). THE COMPOSED-CALL PARITY LAW: what the face shows for
 * an unset knob IS what the admission gate composes (the run's
 * stamp, else the schema's own default; 'inherit' only when no
 * schema truth exists). The receipt on both sides is the card's own
 * carrier — the gate via carrier({}), the face via its toJSON walk.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { OverlayKnob, fieldsOfEnvelope, type SpecField } from "@melite/card-base/client"
import { carrier } from "../src/card.ts"
import { KNOB_ORDER } from "../src/ui/studio/docModel.ts"

// THE SERVED WALK — schemastery's own serialization, the same bytes
// the lane serves and every other face consumes.
const env = (carrier as unknown as { toJSON(): unknown }).toJSON()
const walked = fieldsOfEnvelope(env as never, "h3-timeline")
const fields: Record<string, SpecField> = {}
for (const f of walked) fields[f.name] = f

describe("the fold's schema truth (the envelope walk carries the defaults)", () => {
  it("the walk yields every KNOB_ORDER key with the carrier's own defaults", () => {
    for (const knob of KNOB_ORDER) {
      const f = fields[knob]
      assert.ok(f !== undefined, `${knob}: the served walk must carry the field`)
    }
    assert.equal(fields["steps"]!.default, 12)
    assert.equal(fields["sampler_name"]!.default, "euler")
    assert.equal(fields["sharpen_enabled"]!.default, false)
  })
})

describe("THE COMPOSED-CALL PARITY LAW: the face shows what the gate sends", () => {
  const gate = carrier({}) as unknown as Record<string, unknown>

  it("unset steps, no stamp: the placeholder IS the composed default — never a bare inherit", () => {
    render(h(OverlayKnob, { name: "steps", field: fields["steps"], value: undefined, onEdit: () => {} }))
    const num = screen.getByLabelText(fields["steps"]!.label) as HTMLInputElement
    assert.equal(num.placeholder, String(gate.steps))
    assert.equal(num.placeholder, "12")
    assert.ok(num.title.includes("12"), `title must name the composed default, got: ${num.title}`)
    cleanup()
  })

  it("a run stamp wins the face (the run sits over the schema floor)", () => {
    render(h(OverlayKnob, { name: "steps", field: fields["steps"], value: undefined, base: 28, onEdit: () => {} }))
    const num = screen.getByLabelText(fields["steps"]!.label) as HTMLInputElement
    assert.equal(num.placeholder, "28")
    assert.ok(num.title.includes("inherits 28"))
    cleanup()
  })

  it("unset selects ghost the composed enum default (euler/simple — never a bare inherit)", () => {
    render(h(OverlayKnob, { name: "sampler_name", field: fields["sampler_name"], value: undefined, onEdit: () => {} }))
    // S7h: the enum knob rides the DSH Menu — the trigger Button
    // carries the composed ghost face; rows open as menuitems
    const sel = screen.getByLabelText(fields["sampler_name"]!.label) as HTMLButtonElement
    assert.equal(sel.textContent, String(gate.sampler_name))
    assert.ok(sel.title.includes(String(gate.sampler_name)))
    cleanup()
  })

  it("booleans carry the on/off vocabulary over the composed default", () => {
    render(h(OverlayKnob, { name: "sharpen_enabled", field: fields["sharpen_enabled"], value: undefined, onEdit: () => {} }))
    const sel = screen.getByLabelText(fields["sharpen_enabled"]!.label) as HTMLButtonElement
    assert.equal(sel.textContent, "off")
    assert.ok(sel.title.includes("composes off"))
    cleanup()
  })

  it("THE SWEEP: every knob the gate fills shows its composed value on the unset face", () => {
    for (const knob of KNOB_ORDER) {
      const composed = gate[knob]
      const f = fields[knob]
      if (composed === undefined || f === undefined) continue
      const { unmount } = render(h(OverlayKnob, { name: knob, field: f, value: undefined, onEdit: () => {} }))
      const el = screen.getByLabelText(fields[knob]!.label) as HTMLElement
      // the enum/boolean knobs ride the Menu (S7h): the unset
      // trigger face IS the ghost; number knobs keep the input
      const face = el.tagName === "BUTTON" ? el.textContent ?? "" : (el as HTMLInputElement).value ?? ""
      const ghost = el.tagName === "BUTTON" ? el.textContent ?? "" : (el as HTMLInputElement).placeholder ?? ""
      // booleans compose as true/false but VOICE as on/off — the
      // face's vocabulary, not a different truth
      const shown = typeof composed === "boolean" ? (composed ? "on" : "off") : String(composed)
      assert.ok(
        shown === face || shown === ghost,
        `${knob}: the gate composes ${JSON.stringify(composed)} but the face shows value=${JSON.stringify(face)} ghost=${JSON.stringify(ghost)}`,
      )
      unmount()
    }
  })
})

describe("REPLACE writes (the overlay's own law: unset serializes absent)", () => {
  it("number edits coerce once; blank drops to the unset mark", () => {
    const seen: unknown[] = []
    const r = render(h(OverlayKnob, { name: "denoise", field: fields["denoise"], value: undefined, onEdit: (v) => { seen.push(v) } }))
    const num = screen.getByLabelText(fields["denoise"]!.label) as HTMLInputElement
    fireEvent.input(num, { target: { value: "0.7" } })
    assert.deepEqual([...seen], [0.7])
    // rerender to the held value first (React's controlled-input
    // tracker dedupes '' against its last render value)
    const rec = (x: unknown): void => { seen.push(x) }
    r.rerender(h(OverlayKnob, { name: "denoise", field: fields["denoise"], value: 0.7, onEdit: rec }))
    fireEvent.input(num, { target: { value: "" } })
    assert.deepEqual([...seen], [0.7, undefined])
    r.unmount()
  })

  it("select blanks drop to the unset mark; picks ride verbatim", () => {
    const seen: unknown[] = []
    render(h(OverlayKnob, { name: "sampler_name", field: fields["sampler_name"], value: undefined, onEdit: (v) => { seen.push(v) } }))
    const label = fields["sampler_name"]!.label
    const pick = (row: number | RegExp): void => {
      fireEvent.click(screen.getByLabelText(label))
      const rows = screen.getAllByRole("menuitem")
      fireEvent.click(typeof row === "number" ? rows[row]! : screen.getByRole("menuitem", { name: row }))
    }
    // rows: [ghost 'euler' (composed), 'Euler', 'Heun'] — verbatim ids ride
    pick(/Heun/)
    pick(0)
    assert.deepEqual(seen, ["heun", undefined])
    cleanup()
  })

  it("boolean edits write real booleans; blank drops to the unset mark", () => {
    const seen: unknown[] = []
    render(h(OverlayKnob, { name: "sharpen_enabled", field: fields["sharpen_enabled"], value: undefined, onEdit: (v) => { seen.push(v) } }))
    const label = fields["sharpen_enabled"]!.label
    const pick = (row: number | string): void => {
      fireEvent.click(screen.getByLabelText(label))
      const rows = screen.getAllByRole("menuitem")
      fireEvent.click(typeof row === "number" ? rows[row]! : screen.getByRole("menuitem", { name: row }))
    }
    // rows: [ghost 'off' (composed), 'On', 'Off']
    pick("On")
    pick(0)
    assert.deepEqual(seen, [true, undefined])
    cleanup()
  })
})
