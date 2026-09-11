// S4f stroke 1 — the IdeoPanels tooltip port rides the DSH Tooltip.
// Proves in isolation: focus shows the bubble immediately, hover shows
// it after the preserved 700ms delay, and the anchor survives (kit
// Button/span anchors keep working under the DSH clone-element seam).
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react"
import { MicroLabel } from "@melite/image-ideogram4/ui/studio/IdeoPanels"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("S4f — DSH Tooltip port (IdeoPanels MicroLabel)", () => {
  it("focus shows the bubble immediately (DSH focus path, no delay)", () => {
    render(<MicroLabel tooltip="hint text">Name</MicroLabel>)
    expect(screen.queryByText("hint text")).toBeNull()
    fireEvent.focus(screen.getByText("ⓘ"))
    expect(screen.getByText("hint text")).not.toBeNull()
  })

  it("hover shows the bubble only after the 700ms delay (radix parity)", () => {
    vi.useFakeTimers()
    render(<MicroLabel tooltip="delayed hint">Name</MicroLabel>)
    fireEvent.mouseEnter(screen.getByText("ⓘ"))
    expect(screen.queryByText("delayed hint")).toBeNull()
    act(() => {
      vi.advanceTimersByTime(699)
    })
    expect(screen.queryByText("delayed hint")).toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText("delayed hint")).not.toBeNull()
  })

  it("no tooltip prop renders the bare label (untouched path)", () => {
    const { container } = render(<MicroLabel>Name</MicroLabel>)
    expect(container.textContent).toContain("Name")
    expect(screen.queryByText("ⓘ")).toBeNull()
  })
})
