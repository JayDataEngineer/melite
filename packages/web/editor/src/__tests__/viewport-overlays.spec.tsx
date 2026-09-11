/**
 * viewportOverlays — the OVERLAY seam unit pins (row 5 stroke 6;
 * design record docs/design/studio-shell.md §2.5).
 *
 * The renderer owns positioning, grouping, ghosting, and the
 * per-kind chip shape; the card declares rows and handles onAct.
 * These cases pin the runtime behavior the compiler cannot (docks
 * group, segmented fires per option, status never fires, empty
 * renders nothing).
 */
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ViewportOverlays } from "@melite/ui"
import type { ViewportOverlay } from "@melite/ui"

describe("ViewportOverlays (stroke 6)", () => {
  it("renders one dock stack per corner, rows grouped in order", () => {
    const rows: ViewportOverlay[] = [
      { id: "hair", kind: "toggle", dock: "tl", group: "parts", label: "Hair" },
      { id: "face", kind: "toggle", dock: "tl", group: "parts", label: "Face" },
      { id: "cam", kind: "segmented", dock: "tr", options: ["front", "3/4", "back"], value: "3/4", onAct: () => {} },
    ]
    const { container } = render(<ViewportOverlays overlays={rows} />)
    const docks = container.querySelectorAll("[data-overlay-dock]")
    expect(docks).toHaveLength(2)
    const tl = container.querySelector('[data-overlay-dock="tl"]')!
    expect(tl.querySelectorAll("button")).toHaveLength(2)
    expect(container.querySelector('[data-overlay-dock="tr"]')!).toBeTruthy()
  })

  it("toggle: aria-pressed carries active, onAct fires with the row id", () => {
    const onAct = vi.fn()
    const { getByText } = render(
      <ViewportOverlays
        overlays={[{ id: "hair", kind: "toggle", dock: "tl", label: "Hair", active: true, onAct }]}
      />,
    )
    const chip = getByText("Hair").closest("button")!
    expect(chip.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(chip)
    expect(onAct).toHaveBeenCalledWith("hair")
  })

  it("segmented: every option renders, the lit one is pressed, onAct carries the option", () => {
    const onAct = vi.fn()
    render(
      <ViewportOverlays
        overlays={[{ id: "cam", kind: "segmented", dock: "tr", options: ["front", "3/4", "back"], value: "3/4", onAct }]}
      />,
    )
    const mid = screen.getByText("3/4").closest("button")!
    expect(mid.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText("front").closest("button")!.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(screen.getByText("front"))
    expect(onAct).toHaveBeenCalledWith("front")
  })

  it("status: renders the label + busy spinner, never fires", () => {
    const rows: ViewportOverlay[] = [
      { id: "detect", kind: "status", dock: "tl", label: "Detecting…", busy: true },
    ]
    const { container, getByText } = render(<ViewportOverlays overlays={rows} />)
    expect(getByText("Detecting…")).toBeTruthy()
    // the spinner glyph rides inside the pill (no button to press)
    expect(container.querySelector("button")).toBeNull()
  })

  it("empty rows render nothing (the seam is opt-in)", () => {
    const { container } = render(<ViewportOverlays overlays={[]} />)
    expect(container.querySelector("[data-overlay-dock]")).toBeNull()
  })

  it("the dock recedes: ghosted at rest, full opacity on hover (§5)", () => {
    const rows: ViewportOverlay[] = [
      { id: "run", kind: "status", dock: "tl", label: "Detecting…" },
    ]
    const { container } = render(<ViewportOverlays overlays={rows} />)
    const dock = container.querySelector("[data-overlay-dock]")!
    expect(dock.className).toContain("opacity-60")
    expect(dock.className).toContain("hover:opacity-100")
  })
})
