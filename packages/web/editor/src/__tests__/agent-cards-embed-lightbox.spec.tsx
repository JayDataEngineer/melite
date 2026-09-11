// agent-cards-embed-lightbox — THE OUTPUT CLICK OPENS THE LIGHTBOX IN CHAT
// (2026-08-25 bugfix).
//
// Operator bug, verbatim: "a) I open an action card in the chat view.
// b) I click on the output image. c) It is not going into modal view."
//
// Root cause: clicking a zoomed card's output publishes to the
// assetPreviewBus — whose default opener is a documented NO-OP — and the
// bare chat embed (?meliteCards=) renders WITHOUT WorkspaceLayout, the only
// place that provided the real opener + mounted AssetPreviewDialog. The
// Library canvas worked; the chat embed silently did nothing.
//
// Fix: AgentCardsEmbed provides its own bus opener + mounts the REAL
// AssetPreviewDialog (in-frame is honest while the zoom overlay holds the
// toolview's fullscreen promotion). This file pins the USER-VISIBLE path
// end to end: store-hydrated draft → tile click → zoom detail → output
// click → the dialog EXISTS with the clicked card's output.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, cleanup, fireEvent, act } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// The embed pulls its own lanes on mount — stub ONLY the loaders (both are
// failure-logged); the modules' other exports (useCardKindsVersion,
// useUiSlotsVersion) are live hooks the tiles subscribe to.
vi.mock("../surfaces/flow/pluginKinds", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../surfaces/flow/pluginKinds")>()),
  loadPluginKinds: vi.fn(async () => undefined),
}))
vi.mock("@/shell/pluginUi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shell/pluginUi")>()),
  loadPluginUi: vi.fn(async () => undefined),
}))
// THE SINGLE-POP GATE (2026-08-22): the zoom door holds the skeleton until
// the form-spec verdict lands — mock the client so it resolves on
// microtasks (deterministic under fake timers), and reset the singleton
// spec store between tests so no verdict crosses a boundary.
vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn(async () => ({ features: {} })) },
}))
// THE CATALOG GATE (2026-08-22): the zoom door also awaits loadCatalog (the
// Inputs zone reads formOf from the catalog cache) — resolve instantly so
// the reveal lands on microtasks under fake timers.
vi.mock("@melite/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@melite/catalog")>()),
  loadCatalog: vi.fn(async () => ({
    families: {},
    models: {},
    capabilities: null,
    engine_order: null,
    quant_order: null,
    input_vocabulary: null,
  })),
}))
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

import { AgentCardsEmbed } from "../surfaces/flow/AgentCardsEmbed"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { makeDraft, resetDraftIds } from "./__fixtures__/backendDraft"
import type { StageResult } from "@melite/contracts"

/** A complete done-stage result for one output URL — the full StageResult
 *  shape the store carries (tsc-checked, not a partial). */
const doneResult = (url: string): StageResult => ({
  assetUrls: [url],
  artifacts: {},
  metadata: {},
  completedAt: 0,
  durationSec: 0,
})

function renderWithTooltip(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

beforeEach(() => {
  resetDraftIds()
  vi.useFakeTimers()
  useAgentFlowStore.getState().clear()
  useSpecContractStore.setState({ records: {} })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("AgentCardsEmbed — clicking a zoomed card's output opens the lightbox", () => {
  it("the embed's bus opener mounts the REAL AssetPreviewDialog (no silent no-op)", async () => {
    // Seed the store directly (the fast path: same draft id + complete
    // results → zero network inside InlineFlowCards).
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("lightbox doc", [
      { title: "Out card", kind: "generation", service: "krea2", params: {} },
    ]))
    const flow = useAgentFlowStore.getState().flow!
    const stageId = flow.stages[0].id
    // Mark the stage done with a primary output — the run result shape
    // snapshotResultsComplete gates on (assetUrls present).
    useAgentFlowStore.setState((s) => ({
      flow: s.flow
        ? {
            ...s.flow,
            stages: s.flow.stages.map((st) =>
              st.id === stageId
                ? { ...st, status: "done" as const, result: doneResult("https://x/b.png") }
                : st,
            ),
          }
        : s.flow,
    }))

    const { container } = renderWithTooltip(<AgentCardsEmbed draftId={flow.id} />)

    // a) open the action card — click the tile, the zoom drilldown mounts.
    fireEvent.click(container.querySelector("[data-card-tile]")!)
    expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()
    // The box holds a skeleton during the shared-element morph; the detail
    // (with the real output image) swaps in when it settles.
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    const expanded = document.body.querySelector("[data-card-expanded]")
    expect(expanded, "the zoomed card box is up").toBeTruthy()

    // b) click the output image…
    const img = expanded!.querySelector("img")
    expect(img, "the focused card's output image must render").toBeTruthy()
    fireEvent.click(img!)

    // c) …and the modal view OPENS — the real lightbox, not the old no-op.
    // (Direct asserts: the opener runs synchronously in the click handler,
    // and waitFor would need real timers we've faked.)
    expect(document.querySelector("[data-asset-preview-dialog]")).toBeTruthy()
    // It shows the clicked card's output…
    const dialog = document.querySelector("[data-asset-preview-dialog]")!
    expect(dialog.querySelector("img")?.getAttribute("src")).toBe("https://x/b.png")
    // …layered ON TOP of the still-mounted drilldown (close returns to it).
    expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()
  })

  it("closing the lightbox unmounts it and keeps the zoom below", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("lightbox close", [
      { title: "Out card", kind: "generation", service: "krea2", params: {} },
    ]))
    const flow = useAgentFlowStore.getState().flow!
    useAgentFlowStore.setState((s) => ({
      flow: s.flow
        ? {
            ...s.flow,
            stages: s.flow.stages.map((st) => ({
              ...st,
              status: "done" as const,
              result: doneResult("https://x/a.png"),
            })),
          }
        : s.flow,
    }))

    const { container } = renderWithTooltip(<AgentCardsEmbed draftId={flow.id} />)
    fireEvent.click(container.querySelector("[data-card-tile]")!)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    fireEvent.click(document.body.querySelector("[data-card-expanded] img")!)
    expect(document.querySelector("[data-asset-preview-dialog]")).toBeTruthy()

    // Escape is owned by the TOPMOST layer — the lightbox closes first.
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    expect(document.querySelector("[data-asset-preview-dialog]")).toBeNull()
    // Back to the drilldown — not everything collapsed.
    expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()
  })
})
