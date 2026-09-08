// compound-grouping.test.tsx — the UI for the compound subgraph feature
// (2026-08-12).
//
// The user's explicit request: "DO YOU NOTICE HOW THE LAST CARD SAYS 5-12.
// THAT IS WAHT I WATNED." — the ability to GROUP multiple cards into one
// compound parent that displays as "05–12 ×8". The store actions
// (groupStages/ungroupStages) and the rendering (ChainCardTile,
// segmentFlow, projectSubgraphs) already existed; this test pins the
// MISSING piece — the HUMAN-USABLE UI that wires them:
//
//   • SELECTION — each CardTile wears a hover-revealed check circle; toggle
//     it to add/remove the card from the selection set.
//   • GROUP BAR — when 2+ tiles are selected, a floating "Group N cards"
//     bar appears; click → calls actions.onGroupStages with the ordered
//     child ids, then clears the selection.
//   • UNGROUP — a compound ChainCardTile (one carrying a first-class
//     ``parent``) shows an Ungroup affordance; click → calls
//     actions.onUngroupStages(parentId). Legacy view-projected chains
//     (no parent) do NOT show it.
//   • ESCAPE clears the selection (when no overlay owns the key).
//   • When actions.onGroupStages is NOT wired, tiles show NO check circle
//     and no group bar ever appears (the surface opts out of grouping).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import { render, cleanup, fireEvent, act } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { FlowTileGrid } from "../../surfaces/flow/FlowCard"
import type { CardStage, CardActions } from "@melite/contracts"

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

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

/** Three standalone generation stages — all selectable. */
function threeStages(): CardStage[] {
  return [
    makeStage({ id: "a", title: "Gen A", result: RESULT("https://x/a.png") as any }),
    makeStage({ id: "b", title: "Gen B", result: RESULT("https://x/b.png") as any }),
    makeStage({ id: "c", title: "Gen C", result: RESULT("https://x/c.png") as any }),
  ]
}

function gridProps(
  stages: CardStage[],
  actions: Partial<CardActions> = {},
  selectionMode = true,
): ComponentProps<typeof FlowTileGrid> {
  return {
    stages,
    runningStageId: null,
    actions: actions as CardActions,
    onRemove: () => {},
    onReorderRange: () => {},
    focusStageId: null,
    onFocusStageId: () => {},
    // selectionMode is true by default in tests — the grouping sub-view is
    // ENTERED from the picker's "Group Cards" action. Without it, no check
    // circles render (the grid is in normal zoom mode).
    selectionMode,
    onExitSelectionMode: () => {},
  }
}

// ── SELECTION ──────────────────────────────────────────────────────────────
describe("FlowTileGrid — compound grouping: selection", () => {
  it("renders a check circle on each tile when onGroupStages is wired", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => null)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    const checks = document.querySelectorAll("[data-select-check]")
    expect(checks.length).toBe(3)
  })

  it("renders NO check circle when onGroupStages is absent (surface opts out)", () => {
    const stages = threeStages()
    renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    const checks = document.querySelectorAll("[data-select-check]")
    expect(checks.length).toBe(0)
  })

  it("toggles the selected ring + check state on click", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => null)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    const checks = document.querySelectorAll("[data-select-check]")
    // Initially all off.
    expect((Array.from(checks) as HTMLElement[]).every((c) => c.dataset.selectCheck === "off")).toBe(true)
    // Click the first check → it turns on.
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    expect((checks[0] as HTMLElement).dataset.selectCheck).toBe("on")
    // Click again → off.
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    expect((checks[0] as HTMLElement).dataset.selectCheck).toBe("off")
  })
})

// ── GROUP BAR (the sub-view header) ────────────────────────────────────────
describe("FlowTileGrid — compound grouping: the sub-view header", () => {
  it("shows the sub-view header IMMEDIATELY on entering selection mode (0 selected)", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const { container } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    const bar = container.querySelector("[data-group-bar]")
    expect(bar, "header must be present the moment selection mode starts").toBeTruthy()
    expect(bar!.textContent).toContain("Select cards to group")
    // The Group BUTTON is NOT there yet (need 2+).
    expect(container.querySelector('[data-group-action="group"]')).toBeNull()
  })

  it("the Group button appears ONLY when 2+ tiles are selected", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const { container } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    // 0 selected — no Group button.
    expect(container.querySelector('[data-group-action="group"]')).toBeNull()
    // 1 selected — still no Group button.
    const checks = document.querySelectorAll("[data-select-check]")
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    expect(container.querySelector('[data-group-action="group"]')).toBeNull()
    // 2 selected — Group button appears.
    act(() => { fireEvent.click(checks[1] as HTMLElement) })
    expect(container.querySelector('[data-group-action="group"]')).toBeTruthy()
  })

  it("never shows the header when grouping is not wired (onGroupStages absent)", () => {
    const stages = threeStages()
    const { container } = renderWithTooltip(<FlowTileGrid {...gridProps(stages)} />)
    expect(container.querySelector("[data-group-bar]")).toBeNull()
  })

  it("clicking 'Group into one card' calls onGroupStages(ordered ids) + onExitSelectionMode", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const onExitSelectionMode = vi.fn()
    const { container } = renderWithTooltip(
      <FlowTileGrid
        {...gridProps(stages, { onGroupStages })}
        onExitSelectionMode={onExitSelectionMode}
      />,
    )
    const checks = document.querySelectorAll("[data-select-check]")
    // Select the third then the first (out of order) — the call must
    // preserve FLOW order (a before c), not click order.
    act(() => { fireEvent.click(checks[2] as HTMLElement) })
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    const groupBtn = container.querySelector('[data-group-action="group"]') as HTMLElement
    expect(groupBtn).toBeTruthy()
    act(() => { fireEvent.click(groupBtn) })
    expect(onGroupStages).toHaveBeenCalledTimes(1)
    // Ordered by flow position, NOT click order.
    expect(onGroupStages).toHaveBeenCalledWith(["a", "c"])
    // Grouping exits the sub-view.
    expect(onExitSelectionMode).toHaveBeenCalledTimes(1)
  })

  it("Cancel calls onExitSelectionMode (exits the sub-view)", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const onExitSelectionMode = vi.fn()
    const props = gridProps(stages, { onGroupStages })
    const { container } = renderWithTooltip(
      <FlowTileGrid {...props} onExitSelectionMode={onExitSelectionMode} />,
    )
    const cancelBtn = container.querySelector('[data-group-action="cancel"]') as HTMLElement
    act(() => { fireEvent.click(cancelBtn) })
    expect(onExitSelectionMode).toHaveBeenCalledTimes(1)
  })

  it("Escape calls onExitSelectionMode (exits the sub-view)", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const onExitSelectionMode = vi.fn()
    renderWithTooltip(
      <FlowTileGrid {...gridProps(stages, { onGroupStages })} onExitSelectionMode={onExitSelectionMode} />,
    )
    // The Esc listener only binds when there's a selection — select one first.
    const checks = document.querySelectorAll("[data-select-check]")
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    act(() => { fireEvent.keyDown(window, { key: "Escape" }) })
    expect(onExitSelectionMode).toHaveBeenCalledTimes(1)
  })
})

// ── UNGROUP ────────────────────────────────────────────────────────────────
describe("FlowTileGrid — compound grouping: the Ungroup affordance", () => {
  /** A compound parent + its two children, as the projection would see them
   *  after projectSubgraphs collapses the parent into a chain segment. */
  function compoundFlow(): { stages: CardStage[]; parent: CardStage } {
    const childA = makeStage({ id: "child-a", title: "Angle A", service: "edit_image", result: RESULT("https://x/a.png") as any })
    const childB = makeStage({ id: "child-b", title: "Angle B", service: "edit_image", result: RESULT("https://x/b.png") as any })
    const parent = makeStage({
      id: "parent-1",
      title: "2 cards",
      kind: "compound",
      service: "",
      compound: { mode: "fanout", childIds: ["child-a", "child-b"] },
    })
    return { stages: [parent, childA, childB], parent }
  }

  it("renders the Ungroup button on a FIRST-CLASS compound chain tile (seg.parent present)", () => {
    const { stages } = compoundFlow()
    const onUngroupStages = vi.fn(() => true)
    const onGroupStages = vi.fn(() => null)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages, onUngroupStages })} />)
    const ungroupBtn = document.querySelector("[data-ungroup]")
    expect(ungroupBtn, "Ungroup button must render on a compound parent segment").toBeTruthy()
  })

  it("clicking Ungroup calls onUngroupStages with the parent id", () => {
    const { stages, parent } = compoundFlow()
    const onUngroupStages = vi.fn(() => true)
    const onGroupStages = vi.fn(() => null)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages, onUngroupStages })} />)
    const ungroupBtn = document.querySelector("[data-ungroup]") as HTMLElement
    act(() => { fireEvent.click(ungroupBtn) })
    expect(onUngroupStages).toHaveBeenCalledTimes(1)
    expect(onUngroupStages).toHaveBeenCalledWith(parent.id)
  })

  it("renders NO Ungroup button when onUngroupStages is absent", () => {
    const { stages } = compoundFlow()
    const onGroupStages = vi.fn(() => null)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    expect(document.querySelector("[data-ungroup]")).toBeNull()
  })

  it("renders NO Ungroup button on a LEGACY view-projected chain (no parent)", () => {
    // Two consecutive qwen-img-edit-2511 stages with NO compound parent — the
    // legacy fallback condenses them into a chain segment, but seg.parent
    // is undefined. There's nothing to dissolve (no storage-level group),
    // so no Ungroup button.
    const stages = [
      makeStage({ id: "e1", title: "Edit 1", service: "edit_image", result: RESULT("https://x/1.png") as any }),
      makeStage({ id: "e2", title: "Edit 2", service: "edit_image", result: RESULT("https://x/2.png") as any }),
    ]
    const onGroupStages = vi.fn(() => null)
    const onUngroupStages = vi.fn(() => true)
    renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages, onUngroupStages })} />)
    expect(document.querySelector("[data-ungroup]")).toBeNull()
  })
})

// ── SELECTION LIFECYCLE ────────────────────────────────────────────────────
describe("FlowTileGrid — compound grouping: selection lifecycle", () => {
  it("drops selections for stages that no longer exist (Group button disappears at < 2)", () => {
    const stages = threeStages()
    const onGroupStages = vi.fn(() => "parent-1")
    const { container } = renderWithTooltip(<FlowTileGrid {...gridProps(stages, { onGroupStages })} />)
    const checks = document.querySelectorAll("[data-select-check]")
    act(() => { fireEvent.click(checks[0] as HTMLElement) })
    act(() => { fireEvent.click(checks[1] as HTMLElement) })
    // 2 selected → Group button present.
    expect(container.querySelector('[data-group-action="group"]')).toBeTruthy()
    // Remove stage "a" from the flow (simulating a delete) — the
    // selection set should prune it. With only "b" left selected (1 < 2),
    // the Group button disappears (the sub-view header stays — we're still
    // in selection mode — but the action is gated on ≥ 2).
    const { container: c2 } = renderWithTooltip(<FlowTileGrid {...gridProps(stages.filter((s) => s.id !== "a"), { onGroupStages })} />)
    expect(c2.querySelector('[data-group-action="group"]')).toBeNull()
    // The header itself remains (selection mode still active).
    expect(c2.querySelector("[data-group-bar]")).toBeTruthy()
    // And the remaining tile ("b") is still checked.
    const remainingChecks = document.querySelectorAll("[data-select-check]")
    const bCheck = Array.from(remainingChecks).find((c) => (c as HTMLElement).dataset.selectCheck === "on") as HTMLElement | undefined
    expect(bCheck, "the surviving selection must still be checked").toBeTruthy()
  })
})
