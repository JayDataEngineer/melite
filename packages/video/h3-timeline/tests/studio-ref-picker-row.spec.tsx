/**
 * RefPickerRow — one ref bucket row (BEHAVIORAL).
 *
 * PINS (the ARTIFACT SYSTEM, not freetext): picked chips exclude
 * themselves from candidates, genre filters, remove × drops one
 * chip (last removal unsets), the empty option narrates (at cap /
 * none-yet / pick), uploads ride inline as data: URLs (gated by
 * size, never throwing), over-cap wears the over class.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { RefPickerRow } from "../src/ui/studio/RefPickerRow.tsx"

const ARTS = [
  { name: "still-a", url: "https://u/a.png" },
  { name: "still-b", url: "https://u/b.jpg" },
  { name: "clip-a", url: "https://u/c.mp4" },
]

function row(over?: Record<string, unknown>) {
  const seen: (string | undefined)[] = []
  const p = {
    label: "Still",
    ariaLabel: "still refs",
    testId: "tl-ref-still",
    value: undefined as string | undefined,
    onChange: (n: string | undefined) => { seen.push(n) },
    genre: "image" as const,
    cap: 2,
    artifacts: ARTS,
    ...over,
  }
  return { p, seen }
}

describe("candidates (genre-filtered, picked-excluded)", () => {
  it("offers only unpicked images; picking appends", () => {
    const { p, seen } = row({ value: "still-a" })
    render(<RefPickerRow {...p} />)
    const sel = screen.getByLabelText("Add still refs") as HTMLSelectElement
    const vals = [...sel.options].map((o) => o.value)
    // still-a picked (excluded), clip-a wrong genre (excluded)
    assert.deepEqual(vals, ["", "still-b"])
    assert.equal(sel.options[0]!.text, "+ pick image artifact…")
    fireEvent.change(sel, { target: { value: "still-b" } })
    assert.deepEqual(seen, ["still-a, still-b"])
    // choosing the placeholder adds nothing
    fireEvent.change(sel, { target: { value: "" } })
    assert.deepEqual(seen, ["still-a, still-b"])
  })

  it("no candidates + room = 'none yet'; no candidates + full = 'at cap'", () => {
    const r1 = row({ value: undefined, artifacts: [{ name: "clip-a", url: "https://u/c.mp4" }] })
    const h1 = render(<RefPickerRow {...r1.p} />)
    const sel = screen.getByLabelText("Add still refs") as HTMLSelectElement
    assert.equal(sel.options[0]!.text, "no image artifacts yet")
    assert.equal(sel.disabled, true)
    h1.unmount()
    const r2 = row({ value: "still-a, still-b" })
    render(<RefPickerRow {...r2.p} />)
    const sel2 = screen.getByLabelText("Add still refs") as HTMLSelectElement
    assert.equal(sel2.options[0]!.text, "at cap")
    assert.equal(sel2.disabled, true)
    expect(sel2.options.length).toBe(1)
  })
})

describe("chips (the serialized comma string, live)", () => {
  it("named + uploaded chips render; × drops one, last removal unsets", () => {
    const dataUrl = `data:image/png;base64,${"A".repeat(1365)}`
    const seen: (string | undefined)[] = []
    function Live() {
      const [value, setValue] = useState<string | undefined>(`still-a, ${dataUrl}`)
      return (
        <RefPickerRow
          label="Still" ariaLabel="still refs" testId="tl-ref-still"
          value={value}
          onChange={(n) => { seen.push(n); setValue(n) }}
          genre="image" cap={2} artifacts={ARTS}
        />
      )
    }
    render(<Live />)
    assert.ok(screen.getByText("still-a"))
    assert.ok(screen.getByText("upload (1kB)"))
    assert.equal(screen.getByTestId("tl-ref-still").textContent!.includes("2/2"), true)
    fireEvent.click(screen.getByLabelText("Remove Still still-a"))
    assert.deepEqual(seen, [dataUrl])
    // the row re-renders from state: the second × drops the last chip → unset
    fireEvent.click(screen.getByLabelText("Remove Still upload"))
    assert.deepEqual(seen, [dataUrl, undefined])
    assert.ok(screen.getByTestId("tl-ref-still").textContent!.includes("0/2"))
  })

  it("over cap wears the over class and says so", () => {
    const { p } = row({ value: "still-a, still-b, still-c" })
    render(<RefPickerRow {...p} />)
    const count = screen.getByText("3/2 over cap")
    assert.ok(count.className.includes("refCountOver"))
  })

  it("no chips = no chips row, clean count", () => {
    const { p } = row()
    render(<RefPickerRow {...p} />)
    const box = screen.getByTestId("tl-ref-still")
    assert.ok(box.textContent!.includes("0/2"))
    // no × buttons without chips (the chips row never renders)
    assert.equal(screen.queryByLabelText("Remove Still still-a"), null)
    assert.ok(!box.textContent!.includes("over cap"))
  })
})

describe("upload (every bucket, gated, never throwing)", () => {
  it("an image file rides inline as a data: URL; the input resets", async () => {
    const { p, seen } = row()
    render(<RefPickerRow {...p} />)
    const input = screen.getByLabelText("Upload still refs") as HTMLInputElement
    assert.equal(input.accept, "image/*")
    fireEvent.change(input, { target: { files: [new File(["bytes"], "up.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(seen.length, 1) })
    assert.ok(seen[0]!.startsWith("data:image/png;base64,"))
    assert.equal(input.value, "")
  })

  it("oversize files refuse silently; no file = no-op", async () => {
    const { p, seen } = row()
    render(<RefPickerRow {...p} />)
    const input = screen.getByLabelText("Upload still refs") as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File([new ArrayBuffer(21 * 1024 * 1024)], "big.png", { type: "image/png" })] },
    })
    fireEvent.change(input, { target: { files: [] } })
    // let any async intake settle, then confirm silence
    await waitFor(() => { assert.equal(input.value, "") })
    assert.deepEqual(seen, [])
  })

  it("an unreadable file never throws the picker", async () => {
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      const { p, seen } = row()
      render(<RefPickerRow {...p} />)
      const input = screen.getByLabelText("Upload still refs") as HTMLInputElement
      fireEvent.change(input, { target: { files: [new File(["x"], "bad.png", { type: "image/png" })] } })
      await waitFor(() => { assert.equal(input.value, "") })
      assert.deepEqual(seen, [])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
