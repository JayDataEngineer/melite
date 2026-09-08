// Hard regression tests for the card zoom-overlay navigation (2026-08-08).
//
// The operator's request: "a) I want side arrows, like the image, that
// navigates me around cards when I'm in zoom in mode. b) When I click the
// output of the card when in zoom in mode, it should bring up the 'assets
// view', and when I use the arrows, I instead navigate around the other
// outputs of the other cards in the flow."
//
// Contract pinned here:
//   a) SIDE ARROWS — lightbox-style chevrons in CardZoomOverlay hop the
//      focused card to its prev/next neighbor in FLOW order:
//        • arrows render ONLY when a neighbor exists (none on the first /
//          last card, none while no card is focused);
//        • arrow click = direct focus handoff A→B — the overlay swaps
//          content WITHOUT the close-animation pass-through (data-card-
//          closing stays off);
//        • keyboard ← → mirrors the arrows but NEVER fires while the user
//          is typing in an input/select (the param editor owns those keys);
//        • arrows disappear while the overlay is closing.
//   b) OUTPUT → LIGHTBOX — clicking the focused card's output image opens
//      the AssetPreviewDialog (via the workspace AssetPreviewBus) over the
//      ORDERED outputs of ALL flow cards — one entry per card, flow
//      order, stages without a result skipped — so the lightbox's arrows
//      navigate the other cards' outputs, not the same-category archive.
//      And AssetPreviewDialog with an explicit navList navigates EXACTLY
//      that list and does NOT fetch the archive.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useState, type ComponentProps } from "react"
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { FlowTileGrid } from "../surfaces/flow/FlowCard"
import { AssetPreviewDialog } from "../surfaces/assets/AssetPreviewDialog"
import { AssetPreviewBusContext } from "../surfaces/shared/assetPreviewBus"
import { mediaAssetFromUrl, listMedia } from "../surfaces/library/media"
import type { CardStage } from "@melite/contracts"
// The dialog fetches the archive on mount — stub it so no network, and
// expose the mock so we can assert the fetch is SKIPPED when navList is
// provided. (mediaAssetFromUrl stays real — the nav list builds from it.)
vi.mock("../surfaces/library/media", async (orig) => ({
  ...(await orig<typeof import("../surfaces/library/media")>()),
  listMedia: vi.fn(() => Promise.resolve([])),
}))
vi.mock("@melite/formats", () => ({ readWorkflowFromPng: (): null => null }))
// THE SINGLE-POP GATE (2026-08-22): the zoom door fires the form-spec load
// at open and holds the skeleton until its verdict lands — mock the client
// so the verdict arrives on microtasks (deterministic under fake timers).
vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn(async () => ({ features: {} })) },
}))
// THE CATALOG GATE (2026-08-22): the zoom door also awaits loadCatalog (the
// Inputs zone reads formOf from the catalog cache) — resolve instantly so
// the reveal timing stays deterministic under fake timers.
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
// THE SPEC STORE IS A SINGLETON (2026-08-22 flake fix): the zoom door gates
// the reveal on the form-spec verdict for service "krea2", and a verdict
// landing after a test ended used to seed the NEXT test's gate — skeleton /
// detail states then depended on scheduling luck (these suites flipped under
// parallel load). Reset the records between tests and drain pending fetches
// before cleanup so no verdict crosses a test boundary.
import { useSpecContractStore } from "../surfaces/shared/specContractStore"

beforeEach(() => {
  vi.clearAllMocks()
  useSpecContractStore.setState({ records: {} })
})
afterEach(async () => {
  await act(async () => {}) // flush in-flight form-spec verdicts NOW — not in the next test
  cleanup()
})

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Generate image",
    kind: "generation",
    service: "krea2",
    params: { prompt: "a waifu", seed: 1 },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

const RESULT = (url: string) => ({ assetUrls: [url], artifacts: {}, metadata: {} })

/** The three-stage flow used throughout: a (first) → b (middle) → c (last). */
function threeStages(over: { noResult?: string } = {}): CardStage[] {
  return [
    makeStage({ id: "a", title: "Gen A", result: over.noResult === "a" ? null : RESULT("https://x/a.png") }),
    makeStage({ id: "b", title: "Gen B", result: over.noResult === "b" ? null : RESULT("https://x/b.png") }),
    makeStage({ id: "c", title: "Gen C", result: over.noResult === "c" ? null : RESULT("https://x/c.png") }),
  ]
}

function gridProps(
  stages: CardStage[],
  focus: string | null,
  onFocusStageId = () => {},
): ComponentProps<typeof FlowTileGrid> {
  return {
    stages,
    runningStageId: null,
    actions: {} as const,
    onRemove: () => {},
    onReorderRange: () => {},
    focusStageId: focus,
    onFocusStageId,
  }
}

/** The overlay portals into document.body (no [data-workspace-content] in
 *  jsdom). The expanded card is the drilldown inside it. */
function overlay(): HTMLElement {
  const el = document.body.querySelector("[data-card-zoom-overlay]")
  expect(el, "the zoom overlay must be mounted").toBeTruthy()
  return el as HTMLElement
}

// ── a) SIDE ARROWS ──────────────────────────────────────────────────────────
describe("CardZoomOverlay — side arrows navigate between cards (2026-08-08)", () => {
  it("arrows render ONLY when a neighbor exists: none on the first/last card, both on the middle", () => {
    const stages = threeStages()

    // First card: next only.
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, "a")} />)
    expect(screen.queryByLabelText("Previous card (←)")).toBeNull()
    expect(screen.getByLabelText("Next card (→)")).toBeTruthy()
    cleanup()

    // Middle card: both.
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, "b")} />)
    expect(screen.getByLabelText("Previous card (←)")).toBeTruthy()
    expect(screen.getByLabelText("Next card (→)")).toBeTruthy()
    cleanup()

    // Last card: prev only.
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, "c")} />)
    expect(screen.getByLabelText("Previous card (←)")).toBeTruthy()
    expect(screen.queryByLabelText("Next card (→)")).toBeNull()
  })

  it("no arrows at all when no card is focused (closing state)", () => {
    const stages = threeStages()
    const { rerender } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, "b")} />)
    expect(screen.getByLabelText("Next card (→)")).toBeTruthy()

    // Focus clears → the overlay plays its close; the arrows must vanish
    // with it (the closing card is leaving; navigation is over).
    rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, null)} /></TooltipProvider>)
    expect(overlay().querySelector("[data-card-expanded]")!.getAttribute("data-card-closing")).toBe("true")
    expect(screen.queryByLabelText("Next card (→)")).toBeNull()
    expect(screen.queryByLabelText("Previous card (←)")).toBeNull()
  })

  it("arrow click hands focus to the neighbor card in flow order", () => {
    const stages = threeStages()
    const onFocus = vi.fn()
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, "b", onFocus)} />)

    fireEvent.click(screen.getByLabelText("Next card (→)"))
    expect(onFocus).toHaveBeenCalledWith("c")
    fireEvent.click(screen.getByLabelText("Previous card (←)"))
    expect(onFocus).toHaveBeenCalledWith("a")
  })

  it("navigating swaps the overlay content DIRECTLY — no close pass-through; the box REMOUNTS into the current card's stack (2026-08-10)", async () => {
    vi.useFakeTimers()
    try {
      const stages = threeStages()
      const { rerender } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, "a")} />)

      // The box element at open.
      const boxAtOpen = overlay().querySelector("[data-card-expanded]")!
      expect(boxAtOpen.getAttribute("data-layout-id"), "opened on card a").toBe("stage-card-a")

      // Direct handoff a → b (exactly what the arrow's onFocusStageId does).
      rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, "b")} /></TooltipProvider>)

      // No closing flag — the swap is a content handoff, NOT a collapse.
      const boxAfterNav = overlay().querySelector("[data-card-expanded]")!
      expect(boxAfterNav.getAttribute("data-card-closing")).toBeNull()
      // THE REMOUNT (2026-08-10): key={stage.id} mounts a fresh box whose
      // projection node joins card b's shared-element stack AT MOUNT — the
      // exit will relegate into tile b. framer v13 fixes stack membership at
      // mount (layoutId prop changes are inert), so the remount is the ONLY
      // way to retarget the shrink. The nav join is instant (no size-up).
      expect(boxAfterNav, "the box REMOUNTS on arrow-nav (fresh node in the CURRENT card's stack)").not.toBe(boxAtOpen)
      expect(boxAfterNav.getAttribute("data-layout-id"),
        "honest at all times: the box binds the CURRENT card's layoutId").toBe("stage-card-b")
      // The swap resets the box to its skeleton (2026-08-09: ALL content is
      // skeleton during the morph), then the b detail swaps in when the
      // morph settles AND the element verdict lands (2026-08-22 gate).
      await act(async () => { vi.advanceTimersByTime(500) })
      // The overlay subtree now shows ONLY the b detail (the resting grid's
      // tiles live in the container, outside the portaled overlay).
      expect(overlay().textContent).toContain("Gen B")
      expect(overlay().textContent).not.toContain("Gen A")
      // And the arrows adapt to the new focus (b is a middle card: both).
      expect(screen.getByLabelText("Previous card (←)")).toBeTruthy()
      expect(screen.getByLabelText("Next card (→)")).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it("after arrow-nav the close morph is HONEST — the shrink targets the CURRENT card's tile (2026-08-10)", () => {
    // Remount-per-card: open a, walk to c, collapse → the box has remounted
    // into card c's stack (key={stage.id}, layoutId stage-card-c), so the
    // exit re-legates into tile c — the card the user is ON when collapsing,
    // never the stale opened card.
    vi.useFakeTimers()
    try {
      const stages = threeStages()
      const { rerender } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, "a")} />)
      expect(overlay().querySelector("[data-card-expanded]")!.getAttribute("data-layout-id")).toBe("stage-card-a")

      // a → b → c (the side-arrow path). The box remounts into the CURRENT
      // card's stack on every hop — the layoutId is honest at all times.
      rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, "b")} /></TooltipProvider>)
      expect(overlay().querySelector("[data-card-expanded]")!.getAttribute("data-layout-id"),
        "the box now belongs to card b's stack").toBe("stage-card-b")
      rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, "c")} /></TooltipProvider>)
      expect(overlay().querySelector("[data-card-expanded]")!.getAttribute("data-layout-id"),
        "the box now belongs to card c's stack").toBe("stage-card-c")

      // Collapse. The exit morph projects back into tile c — never the stale a.
      rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, null)} /></TooltipProvider>)
      const exiting = overlay().querySelector("[data-card-expanded]")!
      expect(exiting.getAttribute("data-card-closing"), "the exit shrink is playing").toBe("true")
      expect(exiting.getAttribute("data-layout-id"),
        "honest close: the exit projects back into the CURRENT card's tile (stage-card-c), never the stale opened card").toBe("stage-card-c")
    } finally {
      vi.useRealTimers()
    }
  })

  it("keyboard ← → navigates like the arrows; Escape collapses through the overlay", async () => {
    const stages = threeStages()
    const onFocus = vi.fn()
    const { rerender } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, "b", onFocus)} />)

    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })) })
    expect(onFocus).toHaveBeenLastCalledWith("a")
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })) })
    expect(onFocus).toHaveBeenLastCalledWith("c")

    // Escape (handled by the overlay): closes DIRECTLY — the box already
    // belongs to the current card's shared-element stack, so the exit morph
    // IS the shrink back into its tile (no arming frame needed).
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    expect(onFocus).toHaveBeenLastCalledWith(null)
    // The grid reacts to the focus change (focus null) → the presence flip
    // starts the exit shrink on the box bound to the CURRENT card.
    rerender(<TooltipProvider><FlowTileGrid {...gridProps(stages, null, onFocus)} /></TooltipProvider>)
    const exiting = overlay().querySelector("[data-card-expanded]")!
    expect(exiting.getAttribute("data-card-closing"), "the exit shrink starts immediately").toBe("true")
    expect(exiting.getAttribute("data-layout-id"), "the exit targets the CURRENT card").toBe("stage-card-b")
  })

  it("arrow keys do NOT navigate while typing in an input (the field owns them)", () => {
    const stages = threeStages()
    const onFocus = vi.fn()
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, "b", onFocus)} />)

    // A real input in the page: keydown bubbles from it to the window where
    // the nav listener lives. The param editor's fields must keep their keys.
    const input = document.createElement("input")
    document.body.appendChild(input)
    try {
      act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })) })
      act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })) })
      expect(onFocus).not.toHaveBeenCalled()
    } finally {
      input.remove()
    }
  })
})

// ── b) OUTPUT CLICK → LIGHTBOX OVER THE CARD OUTPUTS ───────────────────────
describe("CardZoomOverlay — clicking the output opens the lightbox over the flow card outputs (2026-08-08)", () => {
  it("clicking the focused card's output opens the bus with its primary + ALL card outputs in flow order", async () => {
    vi.useFakeTimers()
    try {
      const stages = threeStages()
      const open = vi.fn()
      renderWithTooltip(
        <AssetPreviewBusContext.Provider value={open}>
          <FlowTileGrid {...gridProps(stages, "b")} />
        </AssetPreviewBusContext.Provider>,
      )
      // The box holds a pure skeleton during the grow (2026-08-09) — the
      // output image is real only once the detail swaps in.
      await act(async () => { vi.advanceTimersByTime(500) })

      const img = overlay().querySelector("[data-card-expanded] img")!
      expect(img, "the focused card's output image must render").toBeTruthy()
      fireEvent.click(img)

      expect(open).toHaveBeenCalledTimes(1)
      const [asset, nav] = open.mock.calls[0] as [ReturnType<typeof mediaAssetFromUrl>, ReturnType<typeof mediaAssetFromUrl>[]]
      // The lightbox opens AT the focused card's primary output…
      expect(asset.url).toBe("https://x/b.png")
      expect(asset.category).toBe("image")
      // …with the ordered nav list of every card's primary output (one entry
      // per card) — the lightbox arrows then walk the OTHER cards' outputs.
      expect(nav.map((m) => m.url)).toEqual(["https://x/a.png", "https://x/b.png", "https://x/c.png"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("stages without a result are skipped in the nav list", async () => {
    vi.useFakeTimers()
    try {
      const stages = threeStages({ noResult: "b" })
      const open = vi.fn()
      renderWithTooltip(
        <AssetPreviewBusContext.Provider value={open}>
          {/* Focus "a" (which has a result) — b's output is authoring-only. */}
          <FlowTileGrid {...gridProps(stages, "a")} />
        </AssetPreviewBusContext.Provider>,
      )
      // The output image is real only once the detail swaps in.
      await act(async () => { vi.advanceTimersByTime(500) })

      fireEvent.click(overlay().querySelector("[data-card-expanded] img")!)
      const nav = open.mock.calls[0][1] as ReturnType<typeof mediaAssetFromUrl>[]
      expect(nav.map((m) => m.url)).toEqual(["https://x/a.png", "https://x/c.png"])
    } finally {
      vi.useRealTimers()
    }
  })

  it("clicking the card output does NOT collapse the zoom overlay", async () => {
    vi.useFakeTimers()
    try {
      const stages = threeStages()
      renderWithTooltip(
        <AssetPreviewBusContext.Provider value={() => {}}>
          <FlowTileGrid {...gridProps(stages, "b")} />
        </AssetPreviewBusContext.Provider>,
      )
      // The output image is real only once the detail swaps in.
      await act(async () => { vi.advanceTimersByTime(500) })

      fireEvent.click(overlay().querySelector("[data-card-expanded] img")!)
      // The overlay stays mounted and is not closing — the lightbox layered
      // ON TOP; closing it returns to the zoomed card.
      expect(overlay().querySelector("[data-card-expanded]")!.getAttribute("data-card-closing")).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

// ── b) AssetPreviewDialog honors an explicit navList ───────────────────────
describe("AssetPreviewDialog with a navList override (the card-outputs viewer)", () => {
  const nav = [
    mediaAssetFromUrl("https://x/a.png"),
    mediaAssetFromUrl("https://x/b.png"),
    mediaAssetFromUrl("https://x/c.png"),
  ]

  it("navigates EXACTLY the navList with its arrows — and skips the archive fetch", () => {
    // The dialog's index derives from the asset prop (the parent updates it
    // on onSelect). Drive that handoff through a stateful harness — exactly
    // how WorkspaceLayout owns selectedAsset in prod.
    const onSelect = vi.fn()
    function Harness() {
      const [current, setCurrent] = useState(nav[0])
      return (
        <AssetPreviewDialog
          asset={current}
          navList={nav}
          onClose={() => {}}
          onSelect={(a) => { setCurrent(a); onSelect(a) }}
        />
      )
    }
    renderWithTooltip(<Harness />)

    // The counter reflects the navList, not the (unfetched) archive.
    expect(screen.getByText("1 / 3")).toBeTruthy()
    expect(listMedia).not.toHaveBeenCalled()

    // Arrows walk the navList in order — the OTHER cards' outputs.
    fireEvent.click(screen.getByLabelText("Next (→)"))
    expect(onSelect).toHaveBeenCalledWith(nav[1])
    fireEvent.click(screen.getByLabelText("Next (→)"))
    expect(onSelect).toHaveBeenCalledWith(nav[2])
    fireEvent.click(screen.getByLabelText("Previous (←)"))
    expect(onSelect).toHaveBeenCalledWith(nav[1])
  })

  it("without navList the archive is still fetched (left-drawer behavior intact)", () => {
    renderWithTooltip(<AssetPreviewDialog asset={nav[0]} onClose={() => {}} onSelect={() => {}} />)
    expect(listMedia).toHaveBeenCalledTimes(1)
  })
})
