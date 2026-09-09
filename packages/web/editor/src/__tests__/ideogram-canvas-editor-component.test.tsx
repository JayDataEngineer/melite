/** Component-level smoke tests for IdeogramCanvasEditor.
 *
 *  Verifies the React wiring around the pure helpers covered in
 *  ideogram-canvas-editor.test.ts — initial ingest from values.elements,
 *  tab switching, adding elements, two-way JSON sync, and writing back to
 *  the parent's values.
 *
 *  Note on multi-match queries: element descriptions intentionally appear
 *  in BOTH the canvas overlay (sitting inside the bbox) AND the Elements tab
 *  list row — so we use getAllBy* throughout. Same for the +Object / +Text
 *  buttons, which exist in both the toolbar and the empty-state list.
 */
import { describe, it, expect } from "vitest"
import { useEffect, useState } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { IdeogramCanvasEditor } from "@melite/image-ideogram4/ui/studio/component"

// ─── Harness ──────────────────────────────────────────────────────────────
// Wraps the editor in a real React state container so setValues triggers a
// re-render. Forwards a ref so tests can assert what the parent would put
// on the wire after each interaction.
function TestHarness({
  initial,
  onValues,
  rerenderKey,
}: {
  initial: Record<string, unknown>
  onValues?: (v: Record<string, unknown>) => void
  rerenderKey?: unknown
}) {
  const [values, setValues] = useState<Record<string, unknown>>({
    width: 1024,
    height: 1024,
    ...initial,
  })
  useEffect(() => {
    onValues?.(values)
  }, [values, onValues])
  // rerenderKey is just a sink so tests can force re-renders; the parent's
  // values flow through `initial` on first mount only — for true external
  // updates we remount with a new key.
  useEffect(() => {
    /* noop — exists to consume rerenderKey */
  }, [rerenderKey])
  return <IdeogramCanvasEditor values={values} setValues={setValues} />
}

function renderEditor(initial: Record<string, unknown> = {}) {
  const captured: { current: Record<string, unknown> } = { current: { width: 1024, height: 1024, ...initial } }
  const onValues = (v: Record<string, unknown>) => {
    captured.current = v
  }
  const utils = renderWithTooltip(<TestHarness initial={initial} onValues={onValues} />)
  return { ...utils, captured }
}

describe("IdeogramCanvasEditor — initial render", () => {
  it("shows the background field and an aspect ratio indicator", () => {
    renderEditor()
    expect(screen.getByPlaceholderText(/natural wood desk/i)).toBeInTheDocument()
    // The 1:1 aspect shows up both in the toolbar button and the dropdown items
    expect(screen.getAllByText("1:1").length).toBeGreaterThan(0)
  })

  it("ingests elements from values.elements on mount", () => {
    renderEditor({
      elements: JSON.stringify([
        { type: "obj", desc: "a red car", bbox: [100, 100, 500, 500] },
        { type: "text", desc: "headline", text: "HELLO WORLD", bbox: [0, 0, 100, 200] },
      ]),
    })
    // Description appears in canvas + list row → use getAllByText
    expect(screen.getAllByText("a red car").length).toBeGreaterThan(0)
    // Text content rendered with curly quotes in the canvas overlay
    expect(screen.getAllByText(/HELLO WORLD/).length).toBeGreaterThan(0)
  })
})

describe("IdeogramCanvasEditor — adding elements", () => {
  it("creates an object element via any +Object button", () => {
    const { captured } = renderEditor()
    const objButtons = screen.getAllByRole("button", { name: /object/i })
    expect(objButtons.length).toBeGreaterThan(0)
    fireEvent.click(objButtons[0])
    const wire = JSON.parse(String(captured.current.elements))
    expect(wire).toHaveLength(1)
    expect(wire[0].type).toBe("obj")
    expect(Array.isArray(wire[0].bbox)).toBe(true)
    expect(wire[0].bbox).toHaveLength(4)
  })

  it("creates a text element and includes the `text` field on the wire", () => {
    const { captured } = renderEditor()
    const textButtons = screen.getAllByRole("button", { name: /^text$/i })
    expect(textButtons.length).toBeGreaterThan(0)
    fireEvent.click(textButtons[0])
    const wire = JSON.parse(String(captured.current.elements))
    expect(wire).toHaveLength(1)
    expect(wire[0].type).toBe("text")
    // text elements always carry the `text` key, even when empty
    expect(wire[0]).toHaveProperty("text", "")
    // The local-only `id` must NOT appear on the wire
    expect(wire[0]).not.toHaveProperty("id")
  })
})

describe("IdeogramCanvasEditor — tabs", () => {
  it("switches to the JSON tab and shows the live caption", () => {
    renderEditor({
      background: "a wood desk",
      high_level_description: "morning scene",
      style_type: "photo",
      aesthetics: "cinematic",
      elements: "[]",
    })
    fireEvent.click(screen.getByRole("button", { name: /^JSON$/i }))
    const pre = document.querySelector("pre")
    expect(pre).toBeTruthy()
    expect(pre!.textContent).toContain("morning scene")
    expect(pre!.textContent).toContain("a wood desk")
    expect(pre!.textContent).toContain("cinematic")
    expect(pre!.textContent).toContain("compositional_deconstruction")
  })

  it("switches to the Style tab and reveals the aesthetics input after picking Photo", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: /^style$/i }))
    // "Style mode" micro-label only appears in the Style tab
    expect(screen.getByText("Style mode")).toBeInTheDocument()
    // Click the "Photo" toggle in the style-mode segmented control
    fireEvent.click(screen.getByText(/^Photo$/))
    expect(screen.getByPlaceholderText("cinematic, vibrant…")).toBeInTheDocument()
  })
})

describe("IdeogramCanvasEditor — Style tab", () => {
  it("writes style fields back to values when edited", () => {
    const { captured } = renderEditor()
    fireEvent.click(screen.getByRole("button", { name: /^style$/i }))
    fireEvent.click(screen.getByText(/^Art Style$/))
    const aesthetics = screen.getByPlaceholderText("cinematic, vibrant…")
    fireEvent.change(aesthetics, { target: { value: "vaporwave" } })
    expect(captured.current.aesthetics).toBe("vaporwave")
  })

  it("applies a style preset on click", () => {
    const { captured } = renderEditor()
    fireEvent.click(screen.getByRole("button", { name: /^style$/i }))
    fireEvent.click(screen.getByText("Cinematic photo"))
    expect(captured.current.style_type).toBe("photo")
    expect(String(captured.current.aesthetics)).toMatch(/cinematic/i)
    expect(String(captured.current.lighting)).toMatch(/golden hour/i)
  })
})

describe("IdeogramCanvasEditor — element inspector", () => {
  it("opens the inspector when an element is selected from the list", () => {
    renderEditor({
      elements: JSON.stringify([
        { type: "obj", desc: "a ceramic mug", bbox: [200, 200, 600, 600] },
      ]),
    })
    // The description appears in the canvas overlay (pointer-events:none —
    // not clickable) AND in the Elements-tab list row (which IS clickable).
    // The list row is the match NOT inside a pointer-events-none subtree
    // (order-free: the shell-ride stroke moved the rail before the canvas,
    // so DOM order is no longer a stable selector).
    const matches = screen.getAllByText("a ceramic mug")
    const row = matches.find((m) => !m.closest(".pointer-events-none"))
    expect(row).toBeDefined()
    fireEvent.click(row!)
    // The inspector shows the bbox section
    expect(screen.getByText("Bounding box")).toBeInTheDocument()
  })
})

describe("IdeogramCanvasEditor — writeback round-trip", () => {
  it("round-trips an externally-set elements JSON through the canvas", () => {
    // Simulate an external preset by remounting with new initial values.
    const { unmount } = renderEditor({ elements: "[]" })
    unmount()

    const next = JSON.stringify([
      { type: "obj", desc: "external preset", bbox: [50, 50, 950, 950] },
    ])
    renderEditor({ elements: next })
    expect(screen.getAllByText("external preset").length).toBeGreaterThan(0)
  })
})
