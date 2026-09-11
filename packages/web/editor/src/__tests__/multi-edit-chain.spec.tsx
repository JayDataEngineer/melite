// Multi-edit condensation (2026-08-12) — the CHAIN rendering contract.
//
// Tracker: "show N img-edit calls at different angles as one visual block".
// The 7 consecutive edit_image bricks from character_cards.yaml (the
// multi-angle pattern) render as ONE condensed chain tile; the chain opens
// an overlay whose member tiles are FULL CardTiles (zoom, remove, play all
// behave like a standalone card). What is proven here:
//   • 7 consecutive edit stages → ONE chain tile, ZERO member tiles in the
//     resting grid; the condensed readout (index range "01–07", "×7" badge,
//     angle chips, "+N more");
//   • aggregate face: first done member's output is the cover + done/total;
//   • chain overlay: click → overlay with all 7 member tiles;
//   • member click inside the overlay zooms THAT member (own CardZoomOverlay
//     on top, chain overlay still beneath);
//   • Escape layer guard: closes the member when a member zoom is open,
//     closes the chain otherwise;
//   • removing a member inside the overlay re-groups (×6) and auto-closes;
//   • a lone edit stage un-groups back to a normal card tile;
//   • mixed flow: two chains around a standalone card, which still zooms.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useState, type ComponentProps, type ReactElement } from "react"
import { render, cleanup, fireEvent, act } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { FlowTileGrid } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
vi.mock("@melite/formats", () => ({ readWorkflowFromPng: (): null => null }))

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

// Tip-bearing components (FlowCard) require the global TooltipProvider.
const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

function editStage(id: string, title: string, over: Partial<CardStage> = {}): CardStage {
  return {
    id,
    title,
    kind: "generation",
    service: "edit_image",
    params: { prompt: "Turn the person in Picture 1 to match the angle shown in Picture 2" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

const ANGLE_TITLES = ["Back", "Left", "Right", "Front-right", "Back-right", "Back-left", "Front-left"]
const sevenAngles = (): CardStage[] => ANGLE_TITLES.map((t, i) => editStage(`m${i}`, t))

function gridProps(stages: CardStage[], focus: string | null = null): ComponentProps<typeof FlowTileGrid> {
  return {
    stages,
    runningStageId: null,
    actions: {} as const,
    onRemove: () => {},
    onReorderRange: () => {},
    focusStageId: focus,
    onFocusStageId: () => {},
  }
}

/** Stateful harness — the grid's own props are reactive (focus + removal),
 *  exactly how the real surfaces own them. */
function StatefulHarness({ initial }: { initial: CardStage[] }) {
  const [stages, setStages] = useState(initial)
  const [focus, setFocus] = useState<string | null>(null)
  return (
    <FlowTileGrid
      stages={stages}
      runningStageId={null}
      actions={{}}
      onRemove={(id) => setStages((prev) => prev.filter((s) => s.id !== id))}
      onReorderRange={() => {}}
      focusStageId={focus}
      onFocusStageId={setFocus}
    />
  )
}

const chainTile = () => document.body.querySelector("[data-chain-tile]") as HTMLElement | null
const chainOverlay = () => document.body.querySelector("[data-chain-zoom-overlay]") as HTMLElement | null

describe("FlowTileGrid — multi-edit condensation (2026-08-12)", () => {
  it("7 consecutive edit stages render as ONE chain tile — no member tiles at rest", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps(sevenAngles())} />)
    expect(chainTile()).toBeTruthy()
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(1)
    // Members are CONTAINED in the chain — nothing else in the resting grid.
    expect(document.body.querySelectorAll("[data-card-tile]")).toHaveLength(0)
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(0)

    // The condensed readout: block index range, ×N badge, the angle chips.
    const tile = chainTile()!
    expect(tile.textContent).toContain("01–07")
    expect(tile.textContent).toContain("×7")
    for (const t of ANGLE_TITLES.slice(0, 4)) expect(tile.textContent).toContain(t)
    expect(tile.textContent).toContain("+3")
  })

  it("aggregate face: the first done member's output is the cover, with a done/total readout", () => {
    const stages = sevenAngles()
    stages[2].status = "done"
    stages[2].result = { assetUrls: ["data:image/png;base64,COVER"], artifacts: {}, metadata: {} }
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    const tile = chainTile()!
    expect(tile.querySelector("img")!.getAttribute("src")).toBe("data:image/png;base64,COVER")
    expect(tile.textContent).toContain("1/7")
    expect(tile.textContent).toContain("+6 to run")
  })

  it("clicking the chain tile opens the overlay with ALL member tiles — each a full card", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps(sevenAngles())} />)
    fireEvent.click(chainTile()!)
    const overlay = chainOverlay()
    expect(overlay).toBeTruthy()
    expect(overlay!.querySelectorAll("[data-card-tile]")).toHaveLength(7)
    expect(overlay!.textContent).toContain("7 consecutive edit_image cards — one edit pass")
    // The member cards carry their own index badges (01..07) — position in
    // the REAL flow, so the drilldown knows where it sits.
    for (const i of [0, 1, 2, 3, 4, 5, 6]) {
      const pad = String(i + 1).padStart(2, "0")
      expect(overlay!.querySelectorAll("[data-card-tile]")[i]!.textContent).toContain(pad)
    }
  })

  it("clicking a MEMBER tile inside the overlay zooms THAT member — its own overlay on top", () => {
    renderWithTooltip(<StatefulHarness initial={sevenAngles()} />)
    fireEvent.click(chainTile()!)
    const memberTiles = chainOverlay()!.querySelectorAll("[data-card-tile]")
    fireEvent.click(memberTiles[3]!) // "Front-right" (m3)

    const memberZoom = document.body.querySelector("[data-card-zoom-overlay]")
    expect(memberZoom).toBeTruthy()
    expect(memberZoom!.querySelector("[data-card-expanded]")!.getAttribute("data-layout-id"))
      .toBe("stage-card-m3")
    // The chain overlay stays underneath — the member zoom layered on top.
    expect(chainOverlay()).toBeTruthy()
  })

  it("Escape collapses the chain overlay when no member zoom is open", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps(sevenAngles())} />)
    fireEvent.click(chainTile()!)
    expect(chainOverlay()).toBeTruthy()
    // Instant close — the chain overlay is a plain conditional (no
    // AnimatePresence: no exit morph to play, and the member tiles'
    // layoutIds would freeze a ghost in jsdom forever).
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    expect(chainOverlay()).toBeNull()
  })

  it("Escape with a member zoom open closes the MEMBER only — the top layer owns the key", () => {
    renderWithTooltip(<StatefulHarness initial={sevenAngles()} />)
    fireEvent.click(chainTile()!)
    fireEvent.click(chainOverlay()!.querySelectorAll("[data-card-tile]")[1]!)
    expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()

    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    // The member zoom starts its close…
    expect(document.body.querySelector("[data-card-expanded]")!.getAttribute("data-card-closing")).toBe("true")
    // …and the chain overlay is STILL up (Escape belongs to the top layer).
    expect(chainOverlay()).toBeTruthy()
  })

  it("removing a member inside the overlay re-groups: ×6, overlay auto-closes", () => {
    renderWithTooltip(<StatefulHarness initial={sevenAngles()} />)
    fireEvent.click(chainTile()!)
    const memberTiles = chainOverlay()!.querySelectorAll("[data-card-tile]")
    fireEvent.click(memberTiles[3]!.querySelector('[aria-label="Remove card"]')!)

    // Re-grouped to 6 members; the focused chain's id changed, so the
    // overlay auto-closes (stale chainFocusId effect) — instantly.
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(1)
    expect(chainTile()!.textContent).toContain("×6")
    expect(chainOverlay()).toBeNull()
  })

  it("a lone edit stage un-groups — back to a normal card tile", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps([editStage("m0", "Back")])} />)
    expect(chainTile()).toBeNull()
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(1)
  })

  it("mixed flow: two chains around a standalone card, which still zooms", () => {
    const stages = [
      editStage("m0", "Back"),
      editStage("m1", "Left"),
      editStage("k0", "Krea", { service: "krea-2" }),
      editStage("m2", "Right"),
      editStage("m3", "Front-right"),
    ]
    renderWithTooltip(<StatefulHarness initial={stages} />)
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(2)
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(1)

    // The standalone card still zooms exactly like before the feature.
    // (Click the TILE inside the wrapper — the sortable wrapper itself has
    // no click handler; jsdom has no hit-testing, so the tile must be the
    // target.)
    const wrap = document.body.querySelector("[data-card-wrap]")!
    fireEvent.click(wrap.querySelector("[data-card-tile]")!)
    expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeTruthy()
    expect(document.body.querySelector("[data-card-expanded]")!.getAttribute("data-layout-id"))
      .toBe("stage-card-k0")
  })
})

// ── Upscale condensation (2026-08-13) — the SAME chain rendering contract,
// for the Nomos upscale pass. User directive: "we have a bunch of upscaling
// actions. They need to go under the chain card like the img edit one".
// character_cards.yaml GROUP D: 9 consecutive upscale_image bricks.

function upStage(id: string, title: string, over: Partial<CardStage> = {}): CardStage {
  return {
    id,
    title,
    kind: "generation",
    service: "upscale_image",
    params: { model: "pixel_upscale" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

const VIEW_TITLES = ["front", "back", "left", "right", "front_right", "back_right", "back_left", "front_left"]
const nineUpscales = (): CardStage[] => [
  upStage("u0", "halftone-fix blue mesh (Nomos2 pixel SR)"),
  ...VIEW_TITLES.map((t, i) => upStage(`u${i + 1}`, t)),
]

describe("FlowTileGrid — upscale condensation (2026-08-13)", () => {
  it("9 consecutive upscale stages render as ONE chain tile — zero member tiles at rest", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps(nineUpscales())} />)
    expect(chainTile()).toBeTruthy()
    expect(document.body.querySelectorAll("[data-chain-tile]")).toHaveLength(1)
    expect(document.body.querySelectorAll("[data-card-tile]")).toHaveLength(0)

    const tile = chainTile()!
    expect(tile.textContent).toContain("01–09")
    expect(tile.textContent).toContain("×9")
    // Chips: first member's title + the next 3 (CHAIN_MAX_CHIPS = 4 total).
    expect(tile.textContent).toContain("halftone-fix blue mesh (Nomos2 pixel SR)")
    for (const t of VIEW_TITLES.slice(0, 3)) expect(tile.textContent).toContain(t)
    expect(tile.textContent).toContain("+5")
  })

  it("clicking the chain tile opens the overlay with ALL 9 member tiles — 'one upscale pass'", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps(nineUpscales())} />)
    fireEvent.click(chainTile()!)
    const overlay = chainOverlay()
    expect(overlay).toBeTruthy()
    expect(overlay!.querySelectorAll("[data-card-tile]")).toHaveLength(9)
    expect(overlay!.textContent).toContain("9 consecutive upscale_image cards — one upscale pass")
  })

  it("THE user scenario: the edit pass AND the upscale pass side by side — TWO chain tiles", () => {
    // character_cards.yaml GROUP C (edit ×2, the collapsed form) + GROUP D
    // (upscale ×3) — adjacent in the stage array. Family-scoped keys keep
    // them apart; a combined boolean predicate would have merged them.
    const stages = [
      editStage("e0", "Back"),
      editStage("e1", "Left"),
      upStage("u0", "front"),
      upStage("u1", "back"),
      upStage("u2", "left"),
    ]
    renderWithTooltip(<StatefulHarness initial={stages} />)
    const tiles = document.body.querySelectorAll("[data-chain-tile]")
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.textContent).toContain("×2")
    expect(tiles[1]!.textContent).toContain("×3")
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(0)
  })

  it("a lone upscale stage un-groups — back to a normal card tile", () => {
    renderWithTooltip(<FlowTileGrid {...gridProps([upStage("u0", "front")])} />)
    expect(chainTile()).toBeNull()
    expect(document.body.querySelectorAll("[data-card-wrap]")).toHaveLength(1)
  })
})
