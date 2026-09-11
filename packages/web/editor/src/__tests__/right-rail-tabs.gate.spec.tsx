// right-rail-tabs.gate.spec.tsx — H-RIGHT browser tabs.
//
// Pins the browser-style top bar contract END TO END against the REAL
// registry (first-party seams + one registered probe pane):
//   1. every mode-visible pane renders as a tab chip;
//   2. closing a tab HIDES it (persisted), its content unmounts, the
//      rail stays open on the remaining tab;
//   3. the "+" menu lists EXACTLY the hidden panes; picking one re-adds,
//      selects it and clears its hidden record;
//   4. closing the LAST tab closes the rail AND clears that mode's
//      curation — reopening shows the defaults again (a browser closes
//      the window with its last tab);
//   5. panes stay MOUNTED through rail close/open (width-0 + inert):
//      local UI state survives the toggle — the DSH rule.
import { StrictMode, createElement, useState } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"

import { shellSlots } from "../shell/seats"
// The production wiring chain (side-effect imports): centerEntries seeds
// the supported set; rightPanelEntries registers the first-party panes.
import "../shell/centerEntries"
import "../shell/rightPanelEntries"
import { RightPanelHost } from "../surfaces/shared/RightPanelHost"
import { useRightPanelStore } from "../surfaces/shared/rightPanelStore"

const HIDDEN_KEY = "melite:right-panel-hidden:v1"

/** Probe pane carrying LOCAL state — the keep-mounted proof. */
function ProbePane() {
  const [v, setV] = useState("")
  return (
    <div>
      <div>PROBE_CONTENT</div>
      <input aria-label="probe-input" value={v} onChange={(e) => setV(e.target.value)} />
    </div>
  )
}
const Probe = Object.assign(ProbePane, {
  label: "Probe",
  px: 300,
  modes: ["library"] as readonly string[],
})

let disposeProbe: (() => void) | null = null

function renderHost() {
  // TooltipProvider: the app mounts it at the root (App.tsx); the workspace
  // pane's content renders Radix Tips and needs the context once it becomes
  // the active pane.
  return render(
    createElement(
      StrictMode,
      null,
      createElement(TooltipProvider, null, createElement(RightPanelHost, { tab: "library" })),
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  act(() => {
    disposeProbe = shellSlots.register(
      { name: "right.panels", id: "probe", order: 99, registrant: "test/rail-tabs" },
      Probe,
    )
    useRightPanelStore.setState({ hidden: {}, widths: {}, pane: {}, open: {} })
    useRightPanelStore.getState().setOpen("library", true)
    // Make the probe the ACTIVE tab so its content is on screen.
    useRightPanelStore.getState().setPane("library", "probe")
  })
})

afterEach(() => {
  cleanup()
  act(() => {
    disposeProbe?.()
    disposeProbe = null
    useRightPanelStore.setState({ hidden: {}, widths: {} })
  })
})

describe("right rail — browser-style tabs", () => {
  it("mode-visible panes render as tab chips", async () => {
    renderHost()
    await screen.findByText("PROBE_CONTENT")
    expect(screen.getByRole("tab", { name: "Library" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Probe" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add a pane" })).toBeNull()
  })

  it("closing a tab hides it, persists the record, keeps the rail open", async () => {
    renderHost()
    await screen.findByText("PROBE_CONTENT")

    fireEvent.click(screen.getByRole("button", { name: "Close Probe tab" }))

    expect(screen.queryByRole("tab", { name: "Probe" })).toBeNull()
    expect(screen.queryByText("PROBE_CONTENT")).toBeNull()
    const hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "{}") as Record<string, string[]>
    expect(hidden.library).toContain("probe")
    expect(useRightPanelStore.getState().open.library).toBe(true)
  })

  it("the + menu lists exactly the hidden panes; picking re-adds + selects", async () => {
    renderHost()
    await screen.findByText("PROBE_CONTENT")
    fireEvent.click(screen.getByRole("button", { name: "Close Probe tab" }))
    expect(screen.queryByText("PROBE_CONTENT")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Add a pane" }))
    const menu = screen.getByRole("menu", { name: "Available panes" })
    // Exactly ONE item — the pane that was closed, nothing else.
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(1)
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Probe/ }))

    expect(screen.getByText("PROBE_CONTENT")).toBeTruthy()
    const selected = screen.getByRole("tab", { selected: true })
    expect(selected.getAttribute("aria-label")).toBe("Probe")
    expect(useRightPanelStore.getState().hidden.library ?? []).not.toContain("probe")
  })

  it("closing the LAST tab closes the rail and clears the curation", async () => {
    renderHost()
    await screen.findByText("PROBE_CONTENT")

    fireEvent.click(screen.getByRole("button", { name: "Close Probe tab" }))
    fireEvent.click(screen.getByRole("button", { name: "Close Library tab" }))

    expect(useRightPanelStore.getState().open.library).toBe(false)
    expect(useRightPanelStore.getState().hidden.library ?? []).toHaveLength(0)

    // Reopening restores the mode's defaults — no stale curation.
    act(() => useRightPanelStore.getState().setOpen("library", true))
    expect(screen.getByRole("tab", { name: "Library" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Probe" })).toBeTruthy()
  })

  it("panes stay MOUNTED through close/open — local state survives", async () => {
    renderHost()
    const input = (await screen.findByLabelText("probe-input")) as HTMLInputElement
    fireEvent.change(input, { target: { value: "hello" } })
    expect(input.value).toBe("hello")

    act(() => useRightPanelStore.getState().setOpen("library", false))

    // Width-0 inert wrapper — out of layout and tab order, still mounted.
    const rail = document.querySelector("[data-right-rail]") as HTMLElement | null
    expect(rail).toBeTruthy()
    expect(rail!.style.width).toBe("0px")
    expect(rail!.getAttribute("inert")).not.toBeNull()
    // The SAME input node (identity — no remount), value intact.
    expect(screen.getByLabelText("probe-input")).toBe(input)

    act(() => useRightPanelStore.getState().setOpen("library", true))
    expect((screen.getByLabelText("probe-input") as HTMLInputElement).value).toBe("hello")
  })
})
