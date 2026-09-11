/**
 * InlineFlowCards — the "+ Add a card" tile (2026-08-15).
 *
 * "when agent makes card for us to use, it would be nice if we had a
 * 'plus' sort of card next to it so we can add a new card like the
 * library view." The chat's grid is the SAME FlowTileGrid the Library
 * canvas renders (ONE design, 1:1) — so the affordance is the SAME
 * trailing addTile the canvas passes, wired to the SAME ServicePicker +
 * the SAME shared store (useAgentFlowStore IS the Library store).
 *
 * Contract under test:
 * 1. The + tile renders alongside agent-built cards (same dashed style),
 *    and hides while a card is zoomed (canvas parity).
 * 2. Clicking it opens the ServicePicker dialog.
 * 3. A picked card appends a stage to the SHARED store (it shows up in
 *    the chat grid AND is what the Library canvas renders).
 * 4. The tile stays ENABLED while the flow runs (2026-08-22:
 *    "generating blocks me from adding new cards" — appending mid-pass is
 *    safe: composer runAll iterates a snapshot; chain onTick ignores
 *    index-less bricks; addStage preserves the active status).
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { createElement, StrictMode } from "react"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ families: {}, capabilities: {} }),
  }),
  // ServicePicker's loadCatalog uses apiJson for /v1/model-catalog.
  apiJson: vi.fn().mockResolvedValue({ families: {}, capabilities: {} }),
}))

import { TooltipProvider } from "@melite/ui/tooltip"
import { InlineFlowCards } from "../surfaces/flow/InlineFlowCards"
import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import type { BackendDraft } from "@melite/contracts"

function strictRender(el: React.ReactElement) {
  // InlineFlowCards renders Tip tooltips (Radix) — the app mounts
  // ONE TooltipProvider at the root; mirror that here.
  return render(createElement(StrictMode, null, createElement(TooltipProvider, null, el)))
}

function makeDraft(intent: string, stages: Array<Record<string, unknown>>): BackendDraft {
  return {
    draft_id: `draft_${Math.random().toString(36).slice(2)}`,
    intent,
    stages: stages.map((s, i) => ({
      id: `s${i}`,
      title: s.title as string,
      kind: (s.kind ?? "generation") as BackendDraft["stages"][number]["kind"],
      service: s.service as string,
      params: (s.params ?? {}) as Record<string, unknown>,
      inputs: [] as string[],
      provenance: "agent",
    })),
    status: "ready" as const,
    createdAt: Date.now(),
    completedAt: null,
  }
}

beforeEach(async () => {
  cleanup()
  useAgentFlowStore.getState().clear()
  await useAgentFlowStore.getState().hydrateDraft(makeDraft("Make me a waifu", [
    { title: "Generate", kind: "generation", service: "krea2", params: { prompt: "waifu" } },
  ]))
})

describe("InlineFlowCards — the + add-card tile", () => {
  it("renders the add-card tile alongside the agent-built cards", () => {
    strictRender(createElement(InlineFlowCards))
    expect(screen.getAllByRole("button", { name: "Add a card" }).length).toBe(1)
  })

  it("clicking the tile opens the ServicePicker", async () => {
    strictRender(createElement(InlineFlowCards))
    fireEvent.click(screen.getByRole("button", { name: "Add a card" }))
    // The picker dialog mounts (its DialogTitle reads "Add a card").
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy()
    })
  })

  it("a picked card appends to the SHARED store (chat grid + Library canvas render it)", async () => {
    // The picker's onPick → handlePick → addStage path is the SAME store
    // call the Library canvas makes (ONE store, rendered 1:1) — exercise
    // it directly: an appended stage must appear in the chat's grid.
    strictRender(createElement(InlineFlowCards))
    expect(useAgentFlowStore.getState().flow?.stages.length).toBe(1)

    await useAgentFlowStore.getState().addStage({
      kind: "generation",
      service: "upscale",
      title: "Upscale",
      params: {},
    })
    await waitFor(() => {
      expect(useAgentFlowStore.getState().flow?.stages.length).toBe(2)
    })
    // The new card renders in the chat grid (titles in order).
    await waitFor(() => {
      const titles = [...document.querySelectorAll("h3")].map((h) => h.textContent)
      expect(titles).toEqual(["Generate", "Upscale"])
    })
  })

  it("the tile stays ENABLED while the flow runs — adding cards mid-generation is allowed", async () => {
    // A stage mid-run (hasRunningStage derives from stage statuses — the
    // same signal the Run-all button uses). 2026-08-22: appending a card
    // during a pass is SAFE (composer runAll iterates a snapshot; chain
    // onTick ignores index-less bricks), so the + tile must NOT lock.
    useAgentFlowStore.setState((s) => ({
      flow: s.flow
        ? { ...s.flow, stages: s.flow.stages.map((st) => ({ ...st, status: "running" as const })) }
        : s.flow,
    }))
    strictRender(createElement(InlineFlowCards))
    const tile = screen.getByRole("button", { name: "Add a card" }) as HTMLButtonElement
    expect(tile.disabled).toBe(false)
    // And it still WORKS mid-run: clicking opens the same picker.
    fireEvent.click(tile)
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy()
    })
  })
})
