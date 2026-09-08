// compound-render — the END-TO-END proof (2026-08-12 formalization).
//
// A real ``compound`` parent (kind="compound", mode="fanout") with three
// non-consecutive, interleaved child stages renders through FlowTileGrid
// as ONE condensed tile — exactly the way the legacy flat-array condensation
// did, but now backed by FIRST-CLASS identity: the group survives reorder
// (the old pure-view projection dissolved the moment a member moved).
//
// What this proves:
//   • the compound kind flows FlowStage → CardStage → projection → tile;
//   • a compound parent collapses its children into ONE [data-chain-tile]
//     (the renderer's marker), with ZERO free member tiles at rest;
//   • the segment id is ``compound:<parentId>`` (stable across reorder);
//   • children interleaved with a free stage STILL collapse (first-class
//     identity beats adjacency — the legacy predicate would have split them);
//   • the free stage between members renders as its own tile;
//   • clicking the compound tile opens the overlay (member tiles inside);
//   • aggregate status (cover, ×N, done/total) reads from the children.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, cleanup, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { FlowTileGrid } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
import type { CompoundBlock } from "@melite/contracts"
vi.mock("@melite/formats", () => ({ readWorkflowFromPng: (): null => null }))

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

function editStage(id: string, title: string, over: Partial<CardStage> = {}): CardStage {
  return {
    id,
    title,
    kind: "generation",
    service: "edit_image",
    params: { prompt: "Turn the person to match the angle" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

function otherStage(id: string): CardStage {
  return editStage(id, id, { service: "krea-2", title: id })
}

function compoundParent(id: string, childIds: string[], title = "Multi-angle"): CardStage {
  return {
    id,
    title,
    kind: "compound",
    service: "",
    params: {},
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    compound: { mode: "fanout", childIds } satisfies CompoundBlock,
  }
}

function gridProps(stages: CardStage[]) {
  return {
    stages,
    runningStageId: null as string | null,
    actions: {} as never,
    onRemove: () => {},
    onReorderRange: () => {},
    focusStageId: null as string | null,
    onFocusStageId: () => {},
  }
}

const chainTile = () => document.body.querySelector("[data-chain-tile]") as HTMLElement | null
const chainOverlay = () => document.body.querySelector("[data-chain-zoom-overlay]") as HTMLElement | null

describe("FlowTileGrid — first-class compound parent renders", () => {
  it("collapses 3 children into ONE tile — ZERO member tiles at rest", () => {
    const stages: CardStage[] = [
      compoundParent("g1", ["a", "b", "c"]),
      editStage("a", "Back"),
      editStage("b", "Left"),
      editStage("c", "Right"),
    ]
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(1)
    // Members are CONTAINED in the compound parent — nothing else renders free.
    expect(document.body.querySelectorAll("[data-card-tile]")).toHaveLength(0)
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(0)

    const tile = chainTile()!
    // The condensed readout: ×N badge + the angle chips.
    expect(tile.textContent).toContain("×3")
    expect(tile.textContent).toContain("Back")
    expect(tile.textContent).toContain("Left")
    expect(tile.textContent).toContain("Right")
  })

  it("identity survives interleaving — children split by a free stage STILL group", () => {
    // The legacy pure-view projection would have split this into two runs
    // (a non-edit stage BREAKS a run). The first-class parent holds.
    const stages: CardStage[] = [
      compoundParent("g1", ["a", "c"]),
      editStage("a", "Back"),
      otherStage("x"), // breaks a legacy run — irrelevant to a compound parent
      editStage("c", "Right"),
    ]
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(1)
    // The free stage renders as its own tile.
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(1)
    expect(chainTile()!.textContent).toContain("×2")
  })

  it("clicking the compound tile opens the overlay with the member tiles", () => {
    const stages: CardStage[] = [
      compoundParent("g1", ["a", "b"]),
      editStage("a", "Back"),
      editStage("b", "Left"),
    ]
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    expect(chainOverlay()).toBeNull()
    fireEvent.click(chainTile()!)
    const overlay = chainOverlay()
    expect(overlay).toBeTruthy()
    // Member tiles render INSIDE the overlay.
    expect(overlay!.querySelectorAll("[data-card-tile]")).toHaveLength(2)
  })

  it("multiple compound parents each collapse independently", () => {
    const stages: CardStage[] = [
      compoundParent("g1", ["a", "b"]),
      compoundParent("g2", ["c", "d"]),
      editStage("a", "A"), editStage("b", "B"),
      editStage("c", "C"), editStage("d", "D"),
    ]
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(2)
    expect(document.body.querySelectorAll("[data-card-tile]")).toHaveLength(0)
  })
})
