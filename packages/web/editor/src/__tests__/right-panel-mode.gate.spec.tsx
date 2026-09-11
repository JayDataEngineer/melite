// right-panel-mode.gate.spec.tsx — the right rail FOLLOWS the active tab.
//
// The user report (2026-08-21): "the right panel is stuck on Agent
// Settings; it used to switch when I switched tabs." This gate renders
// the REAL WorkspaceLayout and drives the center tab exactly the way the
// rail click does (useActiveSurfaceStore.setActiveTab), then proves the
// right-rail CONTENT tracks the mode:
//
//   library (the one first-party center surface)
//     → the ONE registered pane: "Library" (the settings + comfy-manager
//     panes died with their dialogs — the rail is workspace/Library only).
//
// The chat mode ("flow") died 2026-08-21 with the native-agent chat;
// its settings pane now rides library alongside the workspace pane. A
// stale persisted id (the deleted "flow") must fall back to the
// startup pick at the render — never a blank center.
//
// Proven here, not narrated: one layout mount, one store write, the rail
// tracks. No shortcuts (no direct tab-component mounts).
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"

// jsdom lacks Element.getAnimations (base-ui ScrollArea calls it on a timer).
if (typeof Element !== "undefined" && !(Element.prototype as { getAnimations?: unknown }).getAnimations) {
  ;(Element.prototype as { getAnimations: () => unknown[] }).getAnimations = () => []
}

// Health/model fetches reject → panes render their degraded states (the
// rail still mounts; this just keeps the gate free of network flake).
vi.mock("@melite/catalog/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/catalog/api")>()
  return { ...actual, apiFetch: vi.fn() }
})
vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn(), listRuns: vi.fn() },
}))

import { apiFetch } from "@melite/catalog"
import { editorClient } from "../rpc/editorClient"
import { WorkspaceLayout } from "../surfaces/shared/WorkspaceLayout"
// The production wiring chain (side-effect imports: centerEntries,
// activityEntries, rightPanelEntries) — same graph the browser loads.
import { useActiveSurfaceStore } from "../surfaces/shared/activeSurfaceStore"
import { useRightPanelStore } from "../surfaces/shared/rightPanelStore"

const LIBRARY_RAIL_MARKER = "Library" // LibrarySidebar pane label (exact)

beforeEach(() => {
  localStorage.clear()
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockRejectedValue(new Error("gateway down (gate)"))
  vi.mocked(editorClient.getFormSpec).mockReset()
  vi.mocked(editorClient.getFormSpec).mockResolvedValue({
    fields: [],
    features: { modifiers: [] },
  } as never)
  vi.mocked(editorClient.listRuns).mockReset()
  vi.mocked(editorClient.listRuns).mockResolvedValue([] as never)
})

afterEach(() => {
  cleanup()
})

describe("WorkspaceLayout — the right rail follows the active tab", () => {
  it("library (workspace) mounts ALL registered panes as rail tabs", async () => {
    act(() => {
      useActiveSurfaceStore.getState().setActiveTab("library")
      useRightPanelStore.getState().setOpen("library", true)
    })
    render(
      <TooltipProvider>
        <StrictMode>
          <WorkspaceLayout />
        </StrictMode>
      </TooltipProvider>,
    )

    expect(await screen.findByRole("tab", { name: LIBRARY_RAIL_MARKER })).toBeTruthy()
    // The center is the canvas (the workspace mode's surface)…
    expect(await screen.findByText("Author a flow")).toBeTruthy()
  })

  it("a stale persisted tab id (the deleted 'flow') falls back to the startup pick — never a blank center", async () => {
    act(() => {
      useActiveSurfaceStore.getState().setActiveTab("flow")
      useRightPanelStore.getState().setOpen("library", true)
    })
    render(
      <TooltipProvider>
        <StrictMode>
          <WorkspaceLayout />
        </StrictMode>
      </TooltipProvider>,
    )

    // The render pick degrades to STARTUP_TAB's entry: the canvas mounts…
    expect(await screen.findByText("Author a flow")).toBeTruthy()
    // …but the RAIL serves the RAW active mode — no panes register for the
    // dead id, so the host renders null (no chrome for a ghost mode).
    expect(screen.queryByRole("tab", { name: LIBRARY_RAIL_MARKER })).toBeNull()
    expect(document.querySelector("[data-right-rail]")).toBeNull()
  })
})
