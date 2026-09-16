/**
 * CallCardPrompt — one call's prompt editor (BEHAVIORAL).
 *
 * PINS: the textarea writes through, the ✨ button fires enhanceOne
 * (and locks while enhancing or when the text is blank), undo
 * appears only with a banked pre-text and writes back through the
 * same update door, errors render inline, empties wear the empty
 * class.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { CallCardPrompt } from "../src/ui/studio/CallCardPrompt.tsx"
import type { DocCall } from "../src/ui/studio/docModel.ts"

function base(over?: Partial<DocCall>) {
  return { text: "rain over neon", start_frame: 0, end_frame: 48, ...over }
}

function props(over?: Record<string, unknown>) {
  const calls: unknown[][] = []
  const ones: unknown[][] = []
  const undos: unknown[][] = []
  const p = {
    c: base(),
    i: 0,
    handlePromptUpdate: (id: string, text: string) => { calls.push([id, text]) },
    enhanceOne: (key: string, text: string, apply: (t: string) => void) => { ones.push([key, text, apply]) },
    undoEnhance: (key: string, apply: (t: string) => void) => { undos.push([key, apply]) },
    enhancing: {} as Record<string, boolean>,
    enhanceErr: {} as Record<string, string | null>,
    enhanceUndo: {} as Record<string, string>,
    ...over,
  }
  return { p, calls, ones, undos }
}

describe("the textarea (the call's ONE text)", () => {
  it("writes through the update door; empties wear the empty class", () => {
    const { p, calls } = props()
    const { unmount } = render(<CallCardPrompt {...p} />)
    const ta = screen.getByLabelText("Call 0 prompt") as HTMLTextAreaElement
    assert.equal(ta.value, "rain over neon")
    assert.ok(!ta.className.includes("promptBoxEmpty"))
    fireEvent.change(ta, { target: { value: "sun" } })
    assert.deepEqual(calls, [["call-0", "sun"]])
    unmount()
    const e = props({ c: base({ text: "   " }) })
    render(<CallCardPrompt {...e.p} />)
    const ta2 = screen.getByLabelText("Call 0 prompt") as HTMLTextAreaElement
    assert.equal(ta2.value, "   ")
    assert.ok(ta2.className.includes("promptBoxEmpty"))
    // blank text locks the ✨ button
    const btn = screen.getByLabelText("Enhance call 0 prompt") as HTMLButtonElement
    assert.equal(btn.disabled, true)
  })

  it("an undefined text degrades to empty (never uncontrolled)", () => {
    const { p } = props({ c: base({ text: undefined }) })
    render(<CallCardPrompt {...p} />)
    const ta = screen.getByLabelText("Call 0 prompt") as HTMLTextAreaElement
    assert.equal(ta.value, "")
    assert.ok(ta.className.includes("promptBoxEmpty"))
    // undefined text locks the ✨ door (the click can never carry undefined)
    assert.equal((screen.getByLabelText("Enhance call 0 prompt") as HTMLButtonElement).disabled, true)
    expect(screen.getByLabelText("Enhance call 0 prompt")).toBeTruthy()
  })
})

describe("✨ enhance (H3 style, one press)", () => {
  it("fires enhanceOne with the key + text; the apply door writes back", () => {
    const { p, ones, calls } = props()
    render(<CallCardPrompt {...p} />)
    const btn = screen.getByLabelText("Enhance call 0 prompt") as HTMLButtonElement
    assert.equal(btn.disabled, false)
    assert.equal(btn.textContent, "✨ H3 style")
    fireEvent.click(btn)
    assert.equal(ones.length, 1)
    assert.equal(ones[0]![0], "call-0")
    assert.equal(ones[0]![1], "rain over neon")
    ;(ones[0]![2] as (t: string) => void)("CINEMATIC rain")
    assert.deepEqual(calls, [["call-0", "CINEMATIC rain"]])
  })

  it("locks mid-flight (label + disabled), errors render inline", () => {
    const { p } = props({
      enhancing: { "call-0": true },
      enhanceErr: { "call-0": "boom" },
    })
    render(<CallCardPrompt {...p} />)
    const btn = screen.getByLabelText("Enhance call 0 prompt") as HTMLButtonElement
    assert.equal(btn.disabled, true)
    assert.equal(btn.textContent, "enhancing…")
    assert.equal(screen.getByTestId("tl-call-enhance-error").textContent, "boom")
  })
})

describe("↩ undo (the banked pre-text)", () => {
  it("absent without a banked text; present with one, writing back", () => {
    const { p } = props()
    const r1 = render(<CallCardPrompt {...p} />)
    assert.equal(screen.queryByLabelText("Undo enhance call 0 prompt"), null)
    r1.unmount()
    const banked = props({ enhanceUndo: { "call-0": "orig" } })
    render(<CallCardPrompt {...banked.p} />)
    fireEvent.click(screen.getByLabelText("Undo enhance call 0 prompt"))
    assert.equal(banked.undos.length, 1)
    ;(banked.undos[0]![1] as (t: string) => void)("orig")
    assert.deepEqual(banked.calls, [["call-0", "orig"]])
    expect(banked.undos[0]![0]).toBe("call-0")
  })
})
