// right-rail-resize.gate.test.tsx — the rail's layout engine.
//
// Two layers, one file:
//   1. concedeRailWidth — the DSH concession contract as PURE units
//      (no DOM): clamped preference → shrink toward the floor → auto-
//      close; recovery automatic because there is no hysteresis.
//   2. RailResizeHandle through the REAL host: keyboard nudges clamp at
//      the contract bounds, double-click resets to the pane's declared
//      px, pointer drags widen when pulled left (rAF-throttled dx).
import { StrictMode, createElement } from "react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

// Production wiring chain (the registry IS the vocabulary).
import "../shell/centerEntries"
import "../shell/rightPanelEntries"
import { RightPanelHost } from "../surfaces/shared/RightPanelHost"
import { useRightPanelStore } from "../surfaces/shared/rightPanelStore"
import {
  RAIL_MAX_PX,
  RAIL_MIN_PX,
  clampRailWidth,
  concedeRailWidth,
} from "../surfaces/shared/railGeometry"

function renderHost() {
  return render(
    createElement(
      TooltipProvider,
      null,
      createElement(StrictMode, null, createElement(RightPanelHost, { tab: "library" })),
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  act(() => {
    useRightPanelStore.setState({ hidden: {}, widths: {}, pane: {}, open: {} })
    useRightPanelStore.getState().setOpen("library", true)
    // The resize contract below pins the WORKSPACE pane's declared px
    // (256) — the rail's only remaining pane.
    useRightPanelStore.getState().setPane("library", "workspace")
  })
})

afterEach(() => {
  cleanup()
  act(() => useRightPanelStore.setState({ hidden: {}, widths: {} }))
})

describe("concedeRailWidth — the DSH concession contract (pure)", () => {
  it("a closed preference solves to 0 at any viewport", () => {
    expect(concedeRailWidth(2000, 0)).toBe(0)
    expect(concedeRailWidth(400, 0)).toBe(0)
  })

  it("a roomy viewport grants the clamped preference exactly", () => {
    expect(concedeRailWidth(1600, 288)).toBe(288)
  })

  it("the preference clamps into the contract range before solving", () => {
    expect(concedeRailWidth(2000, 100)).toBe(RAIL_MIN_PX)
    expect(concedeRailWidth(2000, 9999)).toBe(RAIL_MAX_PX)
    expect(clampRailWidth(287.6)).toBe(288)
  })

  it("narrow: shrinks toward the floor before conceding", () => {
    // want 400; 980 − 640 = 340 ≥ floor → the rail concedes to 340.
    expect(concedeRailWidth(980, 400)).toBe(340)
  })

  it("no room: auto-close WITHOUT consuming the preference", () => {
    expect(concedeRailWidth(900, 400)).toBe(0)
  })

  it("recovery is automatic — a pure function keeps no hysteresis", () => {
    expect(concedeRailWidth(700, 360)).toBe(0)
    expect(concedeRailWidth(1400, 360)).toBe(360)
  })
})

describe("RailResizeHandle — through the real host", () => {
  it("keyboard nudges adjust the width and clamp at the max", () => {
    renderHost()
    const handle = screen.getByRole("separator", { name: "Resize right panel" })
    expect(handle.getAttribute("aria-valuenow")).toBe("256") // workspace' declared px

    for (let i = 0; i < 30; i++) fireEvent.keyDown(handle, { key: "ArrowLeft" })

    expect(useRightPanelStore.getState().widths["workspace"]).toBe(RAIL_MAX_PX)
    expect(handle.getAttribute("aria-valuemax")).toBe(String(RAIL_MAX_PX))
  })

  it("double-click resets to the pane's declared px", () => {
    act(() => useRightPanelStore.setState({ widths: { workspace: 500 } }))
    renderHost()
    const handle = screen.getByRole("separator", { name: "Resize right panel" })
    expect(handle.getAttribute("aria-valuenow")).toBe("500")

    fireEvent.doubleClick(handle)

    expect(useRightPanelStore.getState().widths["workspace"]).toBeUndefined()
    expect(handle.getAttribute("aria-valuenow")).toBe("256")
  })

  it("pointer drag widens when pulled left (rAF-throttled dx)", async () => {
    renderHost()
    const handle = screen.getByRole("separator", { name: "Resize right panel" })

    fireEvent.pointerDown(handle, { clientX: 100, button: 0 })
    fireEvent.pointerMove(handle, { clientX: 84 }) // dx −16 → wider
    // Flush the rAF-throttled report.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    fireEvent.pointerUp(handle, { clientX: 84 })

    expect(useRightPanelStore.getState().widths["workspace"]).toBe(272)
  })
})
