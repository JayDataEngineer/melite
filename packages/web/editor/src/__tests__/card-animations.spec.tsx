/**
 * Card visual + motion contract (2026-08-08).
 *
 * Two regressions the operator asked to pin so they cannot drift back:
 *
 * 1. THE GROW/SHRINK IS A SHARED ELEMENT (framer-motion layoutId,
 * 2026-08-08 rewrite) — the operator's words, verbatim: "SMALL CARD,
 * IT GROWS, THERE IS NO MAGIC TRANSPOSITION — IT JUST GROWS" /
 * "THINK OF A SPONGE FILLING WITH WATER, IT EXPANDS AND CONTRACTS".
 * The resting tile and the zoomed card carry the SAME layoutId
 * (cardLayoutId = `stage-card-<id>`); framer-motion projects the card
 * FROM the tile's real screen rect (grow) and BACK into it (shrink).
 * No WAAPI, no rAF, no inline-style juggling, no CSS keyframe classes —
 * all of which teleported on the frame-skipping GPU box. During the
 * morph the box holds a SKELETON (data-card-skeleton); the real detail
 * (data-card-detail) swaps in when the morph settles (data-card-ready).
 *
 * THE SHRINK IS THE GROW, REVERSED (2026-08-08, binding policy —
 * verbatim: "LITERALLY JUST REVERSE THE ANIMATION THAT DOES THE
 * DRILLDOWN, THAT IS ALL YOU HAVE TO DO"). The SAME layoutId morph that
 * grows the card FROM the tile on mount projects it BACK into the tile on
 * exit. AnimatePresence + usePresence hold the overlay mounted while the
 * morph-back plays (the box is visible every frame — it shrinks on every
 * frame); onLayoutAnimationComplete fires the instant it lands →
 * safeToRemove → unmount. Three prior attempts at hand-rolled exit
 * machinery (a BasicShrinkBody content swap; an explicit framer `animate`
 * with measured-rect scale+translate; a WAAPI FLIP before those) EACH
 * produced "the box DISAPPEARS at the end" — the bare morph reversed is
 * the one that works (frame-by-frame diagnostic: box shrinks 680→200px,
 * visible every frame, clean unmount).
 *
 * 2. NO FADE — "THERE SHOULD BE AN ANIMATION THAT GROWS AND SHRINKS
 * CARDS. THERE SHOULD BE NO FADE. HARDCODE THIS INTO TESTS SO WHEN
 * [IT] BREAKS MY stuff IT WILL SAY 'ERROR ERROR'." The backdrop is
 * SOLID (var(--background)); the box morph is transform-only.
 *
 * The kit is store-free; FlowTileGrid takes focusStageId as a prop, so
 * these tests drive the open/close lifecycle by re-rendering with a new prop
 * (exactly how FlowCanvas and InlineFlowCards drive it in prod).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { useState, StrictMode, type ReactElement } from "react"
import {
  FlowTileGrid,
} from "../surfaces/flow/FlowCard"
import type { ComponentProps } from "react"
import type { CardStage } from "@melite/contracts"
import { editorClient } from "../rpc/editorClient"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"
// THE SINGLE-POP GATE (2026-08-22): the zoom door FIRES the form-spec load
// at open and HOLDS the skeleton until its verdict lands. Mock the client so
// the verdict arrives on microtasks — deterministic under fake timers.
// `features: {}` is a contract-valid no-capability spec (state "loaded").
vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn(async () => ({ fields: [], schema_groups: [], features: {} })) },
}))
// THE CATALOG GATE (2026-08-22): the zoom door also awaits loadCatalog (the
// Inputs zone reads formOf from the catalog cache). Resolve it instantly so
// the reveal timing here pins the SPEC hold, not network latency.
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
// THE SPEC STORE IS A SINGLETON (2026-08-22 flake fix): every test here opens
// the zoom door for service "krea2", and a verdict landing AFTER a test ended
// poisoned the NEXT test's gate — a leftover "loading" record deduped the
// door's fetch away (SINGLE POP's count delta read 0), a leftover "loaded"
// record let the detail mount before the held-fetch choreography ran. The
// suite only passed when scheduling luck held; under parallel load it flipped
// test-to-test. Reset the records, clear call history, and DRAIN pending
// fetches before cleanup so no verdict ever crosses a test boundary.
beforeEach(() => {
  useSpecContractStore.setState({ records: {} })
  vi.mocked(editorClient.getFormSpec).mockClear()
})
afterEach(async () => {
  await act(async () => {}) // flush in-flight form-spec verdicts NOW — not in the next test
  cleanup()
})

// Tip-bearing components (CardTile/FlowTileGrid) require the global
// TooltipProvider.
const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

// ── shared-element test plumbing (2026-08-08) ──────────────────────────────
// framer-motion measures rects to compute the projection delta. jsdom has no
// layout engine (getBoundingClientRect returns zeros), so the tests mock
// distinct rects: the tile is a small top-left box, the expanded card a
// large centered box. The PROJECTION MATH itself is framer's — the contract
// pinned here is the SHARED layoutId (both elements carry the same key), the
// skeleton→ready swap, and the no-fade/no-teleport guards below.
const TILE_RECT = { left: 100, top: 100, width: 200, height: 150, right: 300, bottom: 250, x: 100, y: 100, toJSON: () => {} }
const CARD_RECT = { left: 360, top: 240, width: 680, height: 500, right: 1040, bottom: 740, x: 360, y: 240, toJSON: () => {} }

function mockRects() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    // The expanded card matches BOTH selectors — check it first.
    if (this.matches && this.matches("[data-card-expanded]")) return CARD_RECT as DOMRect
    if (this.matches && this.matches("[data-layout-id]")) return TILE_RECT as DOMRect
    if (this.matches && this.matches("[data-card-tile]")) return TILE_RECT as DOMRect
    return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {} } as DOMRect
})
    }
    
/** The shared-element key a stage's tile AND its zoomed card must both
* carry — they are the SAME layoutId by contract. A desync means the morph
* breaks (the card would teleport to center instead of growing from the
* tile). Mirrors `cardLayoutId` in FlowCard.tsx. */
const layoutIdOf = (id: string) => `stage-card-${id}`

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
    
/** Stateful wrapper — FlowCanvas / InlineFlowCards drive focus via
* onFocusStageId; the grid never holds focus itself. Clicking a tile must
* go through the same prod path (tile onClick → onFocusStageId). */
function FocusHarness({ stages }: { stages: CardStage[] }) {
  const [focus, setFocus] = useState<string | null>(null)
  return (
        <FlowTileGrid
        stages={stages}
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
      focusStageId={focus}
      onFocusStageId={setFocus}
    />
  )
    }
    
// ── 1. ZOOM OVERLAY: the shared-element GROW/SHRINK (framer-motion) ────────
describe("FlowTileGrid — zoom overlay: shared-element grow/shrink (2026-08-08)", () => {
  it("opening a card mounts a full-focus overlay — the expanded card SHARES the tile's layoutId", () => {
      const { container } = renderWithTooltip(
        <FlowTileGrid
          stages={[makeStage({ id: "a", title: "Gen A" })]}
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
          focusStageId="a"
        onFocusStageId={() => {}}
        />,
  )
    // The overlay is portaled to document.body (createPortal escapes every
    // ancestor so `absolute inset-0` truly covers the content area — the
    // grid, the chat, AND the chat input).
      const overlay = document.body.querySelector("[data-card-zoom-overlay]")
      expect(overlay, "the zoom overlay mounts in the document body").toBeTruthy()
    const expanded = overlay!.querySelector("[data-card-expanded]")
    expect(expanded, "the zoomed card is mounted").toBeTruthy()
    // THE GROW CONTRACT: the tile and the zoomed card carry the SAME
    // layoutId — framer-motion projects the card FROM the tile's real
    // screen rect (grow) and BACK into it (shrink). A desync = teleport.
    expect(container.querySelector("[data-layout-id]")!.getAttribute("data-layout-id")).toBe(layoutIdOf("a"))
    expect(expanded!.getAttribute("data-layout-id")).toBe(layoutIdOf("a"))
    // Open: not closing (AnimatePresence exit has not started).
    expect(expanded!.getAttribute("data-card-closing")).toBeNull()
    // The resting grid tile is STILL mounted in the container (behind the
    // overlay's solid backdrop) — the grid never re-flows; zoom is a layer.
    expect(container.querySelector("[data-card-tile]")).toBeTruthy()
})

  // ── THE GROW CONTRACT ("SMALL CARD, IT GROWS, THERE IS NO MAGIC
  // TRANSPOSITION — IT JUST GROWS"): clicking a tile mounts the
  // zoomed card on the tile's shared layoutId — the projection IS the grow.
  // While it plays, the box holds the SKELETON; the real detail waits.
  it("clicking a tile GROWS the card from the tile's shared layoutId — skeleton first, no teleport classes", () => {
    mockRects()
    try {
      const { container } = renderWithTooltip(<FocusHarness stages={[makeStage({ id: "a", title: "Gen A" })]} />)
      fireEvent.click(container.querySelector("[data-card-tile]")!)
      
      const overlay = document.body.querySelector("[data-card-zoom-overlay]")
      expect(overlay, "the zoom overlay mounts in the document body").toBeTruthy()
      const expanded = overlay!.querySelector("[data-card-expanded]") as HTMLElement
      expect(expanded.dataset.layoutId, "the zoomed card must share the tile's layoutId").toBe(layoutIdOf("a"))
      expect(expanded.dataset.layoutId).toBe(
        container.querySelector("[data-layout-id]")!.getAttribute("data-layout-id"),
  )
      // The morph is playing: the box holds the SKELETON, not the detail.
      expect(expanded.querySelector("[data-card-skeleton]"), "the skeleton holds the box during the grow").toBeTruthy()
      expect(expanded.getAttribute("data-card-ready"), "the detail waits for the morph to settle").toBeNull()
      // NO TELEPORT: the old CSS keyframe classes are DEAD — these classes
      // never appear, asserting them fails the suite.
      expect(expanded.className).not.toContain("animate-card-expand")
      expect(expanded.className).not.toContain("animate-card-collapse")
    } finally {
      vi.restoreAllMocks()
    }
})

  it("the skeleton is PURE placeholder — ALL card content is replaced during the morph (2026-08-09)", () => {
    // content replaced with skeletons to prevent a jarring view." The old
    // skeleton rendered the real title/service/output image (2026-08-08) —
    // that real content is GONE. Every block is a shadcn Skeleton; not even
    // the title, service, or output image survives the animation.
      const { container } = renderWithTooltip(
        <FlowTileGrid
        stages={[makeStage({
          id: "a",
          title: "Gen A",
          service: "krea2",
          result: { assetUrls: ["https://x/a.png"], artifacts: {}, metadata: {} },
        })]}
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
          focusStageId="a"
        onFocusStageId={() => {}}
        />,
  )
    const skeleton = document.body.querySelector("[data-card-skeleton]")!
    // Every block is a shadcn Skeleton placeholder.
    expect(skeleton.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(skeleton.textContent, "no real title while the morph plays").not.toContain("Gen A")
    expect(skeleton.textContent, "no real service while the morph plays").not.toContain("krea2")
    expect(skeleton.querySelector("img, video"), "no output image while the morph plays").toBeNull()
    expect(document.body.querySelector("[data-card-zoom-overlay] [data-card-detail]")).toBeNull()
    // The real detail is NOT yet mounted — the overlay holds the skeleton.
    void container
})

  it("the skeleton yields to the real detail when the morph settles AND the card's elements have landed (data-card-ready)", async () => {
    vi.useFakeTimers()
    try {
      const stages = [makeStage({ id: "a", title: "Gen A" })]
    const props = (focus: string | null): ComponentProps<typeof FlowTileGrid> => ({
      stages,
      runningStageId: null,
      actions: {},
      onRemove: () => {},
      onReorderRange: () => {},
      focusStageId: focus,
      onFocusStageId: () => {},
})
      renderWithTooltip(<FlowTileGrid {...props("a")} />)
      const expanded = document.body.querySelector("[data-card-expanded]") as HTMLElement
      expect(expanded.querySelector("[data-card-skeleton]")).toBeTruthy()
      
      // The morph settles (ZOOM_SKELETON_MS) and the element fetch's verdict
      // lands (mocked microtask) → skeleton out, detail in. ONE reveal.
      await act(async () => { vi.advanceTimersByTime(500) })
      expect(expanded.getAttribute("data-card-ready")).toBe("true")
      expect(expanded.querySelector("[data-card-skeleton]")).toBeNull()
      expect(expanded.querySelector("[data-card-detail]"), "the real drilldown swaps in").toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
})

  it("THE SINGLE POP: the box stays skeleton until the elements land, then reveals ONCE — no post-reveal refetch", async () => {
    // 2026-08-22 operator verdict: "the card stays a skeleton until all
    // elements on the card are ready to go, THEN the card expands with
    // everything loaded." The old gate flipped at morph settle ALONE —
    // half-loaded elements kept arriving after the reveal and the popup
    // popped twice. Pinned here: skeleton past the settled morph while the
    // fetch is in flight; ONE swap when the verdict lands; and the body
    // never re-fires the fetch behind the reveal (the zoom door owns
    // open-time freshness — the body subscribes passively).
    vi.useFakeTimers()
    try {
      let releaseSpec!: (spec: unknown) => void
      const held = new Promise((resolve) => { releaseSpec = resolve })
      vi.mocked(editorClient.getFormSpec).mockImplementationOnce(
        () => held as Promise<unknown>,
      )
      // Call-count DELTAS: the module mock accumulates across this file's
      // earlier tests — only the delta within THIS test is the contract.
      const callsAtStart = vi.mocked(editorClient.getFormSpec).mock.calls.length
      renderWithTooltip(
        <FlowTileGrid
          stages={[makeStage({ id: "a", title: "Gen A" })]
          }
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
          focusStageId="a"
          onFocusStageId={() => {}}
        />,
      )
      const expanded = () =>
        document.body.querySelector("[data-card-expanded]") as HTMLElement
      // The morph's jsdom fallback has fired — the grow is OVER — but the
      // element fetch is still in flight: THE SKELETON HOLDS.
      await act(async () => { vi.advanceTimersByTime(500) })
      expect(
        expanded().querySelector("[data-card-skeleton]"),
        "the skeleton holds past the morph settle while the elements load",
      ).toBeTruthy()
      expect(expanded().getAttribute("data-card-ready")).toBeNull()
      expect(expanded().querySelector("[data-card-detail]")).toBeNull()
      // THE DOOR FIRED at open. The pre-verdict CALL COUNT is the store's
      // in-flight-dedup contract — spec-contract-store.spec.ts pins it — and
      // proved LOAD-SENSITIVE here: with gate:1's arms running in parallel,
      // one full-suite run saw 5 concurrent openers where four solo reruns
      // (whole file, -t filter, idle full suite, warm-store probe) each saw
      // exactly 1 (2026-08-22 incident). What THIS component owns is the
      // gate + the single pop, not the dedup counter — so pin the door
      // fired, then hold the line at ZERO refetches once the verdict lands.
      expect(vi.mocked(editorClient.getFormSpec).mock.calls.length - callsAtStart).toBeGreaterThanOrEqual(1)
      const callsAtReveal = vi.mocked(editorClient.getFormSpec).mock.calls.length
      // The verdict lands → the ONE reveal: fully-loaded detail, no
      // skeleton, nothing half-mounted.
      await act(async () => { releaseSpec({ fields: [], schema_groups: [], features: {} }) })
      expect(expanded().getAttribute("data-card-ready")).toBe("true")
      expect(expanded().querySelector("[data-card-skeleton]")).toBeNull()
      expect(expanded().querySelector("[data-card-detail]")).toBeTruthy()
      // ...and NOTHING re-fires the fetch behind the reveal — ever (the
      // second pop this design killed): not on the swap, not on time passing.
      await act(async () => { vi.advanceTimersByTime(1000) })
      expect(vi.mocked(editorClient.getFormSpec).mock.calls.length).toBe(callsAtReveal)
    } finally {
      // Reinstate the module default for the later tests in this file
      // (mockRestore would leave the vi.fn with NO implementation).
      vi.mocked(editorClient.getFormSpec).mockImplementation(
        async () => ({ features: {} }),
      )
      vi.useRealTimers()
    }
})

  it("StrictMode-safe: the dev double-invoke still GROWS — shared layoutId + skeleton survive the double render", async () => {
    // DEV regression (2026-08-08, user: "it stays to the side and doesn't
    // grow enough"): main.tsx wraps the app in <StrictMode>, and dev React
    // double-invokes mount effects (effect → cleanup → effect). The OLD
    // implementations (rAF+inline transform, then WAAPI behind a flipDone
    // gate) could swallow the second run and leave the card stuck at the
    // tile, off to the side, forever. The framer shared element has no such
    // phase: the layoutId is declarative — double-invocation just
    // re-projects. Pin that: under StrictMode the overlay opens on the
    // shared layoutId AND the skeleton→ready flow still completes.
    mockRects()
    vi.useFakeTimers()
    try {
      const { container } = renderWithTooltip(
        <StrictMode>
          <FocusHarness stages={[makeStage({ id: "a", title: "Gen A" })]} />
        </StrictMode>,
  )
      fireEvent.click(container.querySelector("[data-card-tile]")!)
      const expanded = document.body.querySelector("[data-card-expanded]") as HTMLElement
      expect(expanded.dataset.layoutId).toBe(layoutIdOf("a"))
      expect(expanded.querySelector("[data-card-skeleton]")).toBeTruthy()
      // The OLD gate bug: the second run early-returned and the card never
      // left the tile state. Now the flow completes — advance the skeleton
      // fallback, flush the element verdict, and the detail arrives.
      await act(async () => { vi.advanceTimersByTime(500) })
      expect(expanded.getAttribute("data-card-ready")).toBe("true")
      expect(expanded.querySelector("[data-card-detail]")).toBeTruthy()
    } finally {
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
})

  it("close SHRINKS back: AnimatePresence holds the overlay mounted (data-card-closing) while the exit plays, then unmounts", async () => {
    mockRects()
    try {
      const { container } = renderWithTooltip(<FocusHarness stages={[makeStage({ id: "a", title: "Gen A" })]} />)
      fireEvent.click(container.querySelector("[data-card-tile]")!)
      expect(document.body.querySelector("[data-card-expanded]")).toBeTruthy()
      
      // Escape (prod path — the overlay's keydown handler closes directly,
      // the presence flip starts the exit shrink).
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" })
        await new Promise((r) => setTimeout(r, 30))
})
      const collapsing = document.body.querySelector("[data-card-expanded]") as HTMLElement
      expect(collapsing, "the overlay must STAY MOUNTED to play its shrink-back").toBeTruthy()
      expect(collapsing.getAttribute("data-card-closing"), "the exit shrink is playing").toBe("true")
      
      // The exit projection completes → AnimatePresence unmounts the layer.
      await waitFor(() => {
        expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeNull()
      }, { timeout: 3000 })
      expect(document.body.querySelector("[data-card-expanded]")).toBeNull()
    } finally {
      vi.restoreAllMocks()
    }
})

  it("close is the SAME morph reversed: the box stays mounted (data-card-closing) through the entire shrink, then unmounts", async () => {
    // 2026-08-08: "LITERALLY JUST REVERSE THE ANIMATION THAT DOES THE
    // DRILLDOWN." The grow is a framer-motion layoutId morph (the card
    // projects FROM the tile). The shrink is the SAME morph reversed — the
    // card projects BACK into the tile. AnimatePresence + usePresence hold
    // the overlay mounted while the morph-back plays (the box is ALWAYS
    // visible — it shrinks on every frame); onLayoutAnimationComplete fires
    // when it lands → safeToRemove → unmount. NO hand-rolled scale/translate,
    // NO content swap, NO second animation system — just the one morph.
    mockRects()
    try {
      const { container } = renderWithTooltip(<FocusHarness stages={[makeStage({ id: "a", title: "Gen A" })]} />)
      fireEvent.click(container.querySelector("[data-card-tile]")!)
      await waitFor(() => {
        expect(document.body.querySelector("[data-card-detail]")).toBeTruthy()
      }, { timeout: 3000 })
      
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" })
        await new Promise((r) => setTimeout(r, 30))
})
      const exiting = document.body.querySelector("[data-card-expanded]") as HTMLElement
      // The box STAYS MOUNTED — data-card-closing is set (the morph-back is
      // playing). It does NOT disappear.
      expect(exiting, "the box stays mounted to play its shrink-back").toBeTruthy()
      expect(exiting.getAttribute("data-card-closing"), "the exit morph is playing").toBe("true")
      
      // The morph lands → AnimatePresence unmounts (or the jsdom timer).
      await waitFor(() => {
        expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeNull()
      }, { timeout: 3000 })
      expect(document.body.querySelector("[data-card-expanded]")).toBeNull()
      // The resting tile is intact — the box projected back into it.
      expect(container.querySelectorAll("[data-card-tile]").length).toBe(1)
    } finally {
      vi.restoreAllMocks()
    }
})

  it("shrink swaps ALL content for the skeleton (2026-08-09: 'all the card content replaced with skeletons')", async () => {
    // must hold NOTHING real: no detail body, not even title/service/image —
    // a pure skeleton, so the morph never scales live content. On close the
    // exit starts (isPresent flips false) → the box snaps to the skeleton
    // for the shrink-back; the real detail must be GONE while closing.
    mockRects()
    try {
      const { container } = renderWithTooltip(<FocusHarness stages={[makeStage({ id: "a", title: "Gen A" })]} />)
      fireEvent.click(container.querySelector("[data-card-tile]")!)
      await waitFor(() => {
        expect(document.body.querySelector("[data-card-detail]")).toBeTruthy()
      }, { timeout: 3000 })
      
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" })
        await new Promise((r) => setTimeout(r, 30))
})
      const exiting = document.body.querySelector("[data-card-expanded]") as HTMLElement
      expect(exiting.getAttribute("data-card-closing"), "the exit shrink is playing").toBe("true")
      // ALL content is the skeleton during the shrink — no live detail.
      expect(exiting.querySelector("[data-card-skeleton]"), "the skeleton holds the box during the shrink").toBeTruthy()
      expect(exiting.querySelector("[data-card-detail]"), "the real detail is NOT scaling down").toBeNull()
      expect(exiting.getAttribute("data-card-ready"), "the box is not 'ready' while closing").toBeNull()
      // The Collapse button is part of the detail — gone with it (2026-08-09).
      expect(exiting.querySelector('[aria-label="Collapse"]'), "the X is NOT part of the shrink").toBeNull()
    } finally {
      vi.restoreAllMocks()
    }
})

  it("closing hides the side arrows (the exit is playing — navigation is over)", () => {
    const stages = [makeStage({ id: "a", title: "Gen A" }), makeStage({ id: "b", title: "Gen B" })]
    const props = (focus: string | null): ComponentProps<typeof FlowTileGrid> => ({
      stages,
      runningStageId: null,
      actions: {},
      onRemove: () => {},
      onReorderRange: () => {},
      focusStageId: focus,
      onFocusStageId: () => {},
})
    const { rerender } = renderWithTooltip(<FlowTileGrid {...props("b")} />)
    expect(screen.getByLabelText("Previous card (←)")).toBeTruthy()
    
    rerender(
      <TooltipProvider>
        <FlowTileGrid {...props(null)} />
      </TooltipProvider>,
    )
    expect(screen.queryByLabelText("Previous card (←)")).toBeNull()
    expect(screen.queryByLabelText("Next card (→)")).toBeNull()
})

  it("the zoom is an absolute overlay scoped to the workspace content area — never an in-place basis change", () => {
    const stages = [makeStage({ id: "a", title: "Gen A" }), makeStage({ id: "b", title: "Gen B" })]
      const { container } = renderWithTooltip(
        <FlowTileGrid
        stages={stages}
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
          focusStageId="a"
        onFocusStageId={() => {}}
        />,
  )
    // The overlay is inset-0 over the workspace CONTENT AREA when one exists
    // (absolute, 2026-08-08). Outside the editor — jsdom suites and the DSH
    // chat embed — there is no [data-workspace-content], so the portal lands
    // on document.body and the overlay goes FIXED to track the viewport at
    // any scroll height (2026-08-22 embed fallback: the embed is auto-height
    // and often taller than the viewport; absolute covered only the first).
    // It morphs ONLY transform (the shared-element projection), which is the
    // smoothness contract — the old flex-basis in-place expansion animated
    // layout during a content swap and was the jank source.
    const overlay = document.body.querySelector("[data-card-zoom-overlay]") as HTMLElement
    expect(overlay).toBeTruthy()
    expect(overlay.className).toContain("fixed")
    expect(overlay.className).not.toContain("absolute")
    expect(overlay.className).toContain("inset-0")
    // No wrapper changes its flex-basis anymore — the resting grid is untouched
    // behind the backdrop (both wrappers stay at their 200px resting basis; the
    // focused card does NOT grow in place, the sibling does NOT shrink).
    const a = container.querySelector('[data-card-wrap="a"]') as HTMLElement
    const b = container.querySelector('[data-card-wrap="b"]') as HTMLElement
    expect(a.style.flexBasis).toBe("200px")
    expect(b.style.flexBasis).toBe("200px")
})

  it("the Collapse button appears WITH the settled detail and closes through onFocusStageId(null)", async () => {
    // 2026-08-09: the X is part of the detail — it mounts with it (only
    // after the morph settles, ready && isPresent) and unmounts when the
    // exit begins. It is NEVER part of the skeleton/morph frames.
    vi.useFakeTimers()
    try {
      const onFocus = vi.fn()
      renderWithTooltip(
        <FlowTileGrid
          stages={[makeStage({ id: "a", title: "Gen A" })]}
          runningStageId={null}
          actions={{}}
          onRemove={() => {}}
          onReorderRange={() => {}}
          focusStageId="a"
          onFocusStageId={onFocus}
        />,
  )
      // While the box holds the skeleton (the grow morph), there is NO X.
      expect(document.body.querySelector('[data-card-expanded] [aria-label="Collapse"]'), "no X during the morph").toBeNull()
      // The morph settles (and the element verdict lands) → the detail
      // (and its X) mount.
      await act(async () => { vi.advanceTimersByTime(500) })
      expect(document.body.querySelector('[data-card-expanded] [aria-label="Collapse"]')).toBeTruthy()
      // Clicking X closes directly (the exit morph IS the shrink — no
      // arming frame needed since the box already belongs to this card's
      // shared-element stack).
      fireEvent.click(document.body.querySelector('[data-card-expanded] [aria-label="Collapse"]')!)
      expect(onFocus).toHaveBeenCalledWith(null)
    } finally {
      vi.useRealTimers()
    }
})
})

// "THERE SHOULD BE AN ANIMATION THAT GROWS AND SHRINKS CARDS. THERE SHOULD BE
// NO FADE. HARDCODE THIS INTO TESTS SO WHEN [it] BREAKS MY stuff IT WILL SAY
// ERROR ERROR."
    //
// The framer-motion rewrite (2026-08-08) DELETED the WAAPI FLIP effects, the
// rAF+inline-transform approach before them, and the @keyframes
// cardExpand/cardCollapse CSS zoom — every one of those teleported on the
// frame-skipping GPU box. The grow/shrink now lives in the shared layoutId:
// `layoutId={cardLayoutId(stage.id)}` appears on the TILE (SortableCardWrap)
// and on the ZOOMED CARD (CardZoomOverlay), and framer projects between
// them. This block reads the SOURCE and pins that contract: the shared
// layoutId wiring, AnimatePresence for the exit, the skeleton→ready swap,
// and NO opacity anywhere in the zoom path (the backdrop is a SOLID theme
// background). A future "add a nice fade" change fails HERE, loudly, before
// ship.
import fs from "node:fs"
import path from "node:path"

describe("Card zoom -- shared layoutId, scale ONLY, NO opacity fade (2026-08-08 hard guard)", () => {
  // Cut 2 split (2026-08-17): the zoom contract now spans two modules —
  // CardZoomOverlay (the overlay/box/morph machinery) lives in
  // flowCardZoom.tsx, the tile-side wrap (SortableCardWrap) in
  // flowCardGrid.tsx. Read BOTH and pin the concatenation: the
  // shared-element layoutId appears in each, and the negative guards
  // (no rAF, no hand-rolled transforms) must hold across the whole
  // morph path.
  const tsx = [
    "../surfaces/flow/flowCardZoom.tsx",
    "../surfaces/flow/flowCardGrid.tsx",
  ].map((p) => fs.readFileSync(path.resolve(__dirname, p), "utf8")).join("\n")
  const css = fs.readFileSync(
    path.resolve(__dirname, "../index.css"), "utf8",
  )
  // The overlay backdrop: from the overlay root marker to the scroll region.
  const backdrop = tsx.split("data-card-zoom-overlay")[1].split("<div className=\"min-h-0")[0]
  // The morphing card region: from the expanded-card marker to its
  // onLayoutAnimationComplete callback (the card's classes + props).
  const cardRegion = tsx.split("data-card-expanded")[1].split("onLayoutAnimationComplete")[0]
  
  it("GROW: the tile AND the zoomed card share the SAME layoutId — framer projects the grow from the tile", () => {
    // The shared-element wiring: the TILE carries layoutId={cardLayoutId(stage.id)}
    // and the ZOOMED CARD carries the SAME id — framer projects the
    // grow/shrink between them.
    const tileWired = tsx.match(/layoutId=\{cardLayoutId\(stage\.id\)\}/g) ?? []
    expect(tileWired.length, "the TILE AND the zoomed card must bind layoutId={cardLayoutId(stage.id)}").toBeGreaterThanOrEqual(2)
    expect(tsx, "the DOM anchor binds the layoutId").toMatch(/data-layout-id=\{cardLayoutId\(stage\.id\)\}/)
    // REMOUNT-PER-CARD (2026-08-10): the box MUST remount on every focus
    // change (key={stage.id}). framer v13 fixes shared-element stack membership
    // at MOUNT — a layoutId prop change is inert, so without the remount the
    // exit always projects into the stale opened card's tile. The remount
    // joins the CURRENT card's stack; the exit re-legates into ITS tile.
    expect(tsx, "the box MUST carry key={stage.id} (a fresh node joins the current card's stack)").toMatch(/<motion\.div[^>]*\n\s*key=\{stage\.id\}/)
    // NAV-JOIN INSTANT (2026-08-10): the nav remount joins the new card's
    // stack with a 0-duration transition (invisible — no size-up on switch);
    // open + close spring. prevStageIdRef detects the nav mount (the overlay
    // persists — key="zoom" — only the box remounts).
    expect(tsx, "navMountRef detects a stage change while the overlay is alive").toMatch(/prevStageIdRef\.current !== stage\.id/)
    expect(tsx, "the box binds the nav-instant / spring transition").toMatch(/transition=\{navMountRef\.current \? ZOOM_JOIN_INSTANT : ZOOM_SPRING\}/)
    // REGRESSION GUARD: the old dynamic-transition machinery must STAY dead.
    // If any of these return, the close-after-nav bug comes back.
    expect(tsx, "NO ZOOM_NAV_INSTANT constant (the duration:0 cache poison)").not.toMatch(/ZOOM_NAV_INSTANT/)
    expect(tsx, "NO isArrowNav detection").not.toMatch(/\bisArrowNav\b/)
    expect(tsx, "NO zoomTransition variable").not.toMatch(/\bzoomTransition\b/)
    expect(tsx, "NO armed close (the remount makes the two-phase arming obsolete)").not.toMatch(/\bcloseArmed\b/)
    expect(tsx, "NO armClose").not.toMatch(/\barmClose\b/)
    expect(tsx, "NO openedStageIdRef (the layoutId is always the current card now)").not.toMatch(/\bopenedStageIdRef\b/)
    // The exit is AnimatePresence's (the shrink-back plays, then unmount).
    expect(tsx).toMatch(/<AnimatePresence>/)
    expect(tsx).toMatch(/motion\.div/)
    // The spring is the explicit morph tuning (the "sponge" feel).
    expect(tsx).toMatch(/stiffness: 300/)
    expect(tsx).toMatch(/damping: 30/)
    // The old hand-rolled animation machinery is DEAD — each one of these
    // teleported on frame skip. If any returns, the grow contract is broken.
    // (The two-phase close's armClose is gone, so rAF must not appear at all.)
    expect(tsx).not.toMatch(/card\.animate\(/)
    expect(tsx).not.toMatch(/style\.transform/)
    expect(tsx, "NO rAF — the armed close frame is gone").not.toMatch(/requestAnimationFrame/)
    expect(tsx).not.toMatch(/\.getAnimations\(/)
    expect(tsx).not.toMatch(/flipInverse/)
    expect(tsx).not.toMatch(/data-flip/)
})

  it("SHRINK: the exit is AnimatePresence + usePresence — the overlay holds mounted (data-card-closing) while the card shrinks back", () => {
    expect(tsx).toMatch(/usePresence\(\)/)
    expect(tsx).toMatch(/data-card-closing=\{isPresent \? undefined : "true"\}/)
})

  it("SHRINK IS THE GROW, REVERSED: the SAME layoutId morph projects the card back into the tile on exit — NO hand-rolled scale/translate (2026-08-08)", () => {
    // THE ANIMATION THAT DOES THE DRILLDOWN, THAT IS ALL YOU HAVE TO DO."
    // The grow (mount) and the shrink (exit) are the SAME framer-motion
    // shared-element morph — the layoutId on the tile + the zoomed card makes
    // framer project BETWEEN them in both directions on the browser's own
    // frame loop. There is NO hand-rolled exit: no explicit `animate` target,
    // no measured rects, no BasicShrinkBody content swap. Three prior
    // attempts at hand-rolled exit machinery EACH produced "the box
    // DISAPPEARS at the end" — the bare morph reversed is the one that works
    // (proven by a frame-by-frame diagnostic: the box shrinks 680→200px,
    // visible every frame, clean unmount). Pin the bare contract here.
    //
    // (1) The exit hook is AnimatePresence's: usePresence gives safeToRemove,
    // and the overlay stays mounted while isPresent=false so the morph-back
    // can play. The refs hold the live values so the layout-complete
    // callback can read them without re-creating.
    expect(tsx, "usePresence drives the exit hold").toMatch(/const \[isPresent, safeToRemove\] = usePresence\(\)/)
    expect(tsx, "a ref holds safeToRemove for the callback").toMatch(/safeToRemoveRef = useRef\(safeToRemove\)/)
    expect(tsx, "a ref holds isPresent for the callback").toMatch(/isPresentRef = useRef\(isPresent\)/)
    // (2) The morph's own completion fires the unmount: when the shrink
    // lands, onLayoutAnimationComplete runs → if !isPresent, safeToRemove.
    // This is the "the spring carries it out the same way it carried it in"
    // path — the box is visible every frame until the morph settles, THEN
    // unmounts (the cut is invisible because the box IS on the tile).
    expect(tsx, "the layout-complete callback unmounts when the shrink lands").toMatch(/if \(!isPresentRef\.current\) safeToRemoveRef\.current\(\)/)
    expect(tsx, "the motion.div wires onLayoutAnimationComplete to that callback").toMatch(/onLayoutAnimationComplete=\{onLayoutComplete\}/)
    // (3) The jsdom fallback (no layout engine → the morph never fires in
    // the unit-test runner). In a real browser this timer never wins —
    // onLayoutAnimationComplete fires first. Pin the constant so a future
    // rename doesn't silently break the test-suite unmount.
    expect(tsx, "the jsdom fallback timer constant is named").toMatch(/ZOOM_CLOSE_UNMOUNT_MS/)
    expect(tsx, "the fallback fires safeToRemove after the timer").toMatch(/setTimeout\(\(\) => safeToRemoveRef\.current\(\), ZOOM_CLOSE_UNMOUNT_MS\)/)
    // (4) THE SPRING DRIVES BOTH DIRECTIONS — ZOOM_SPRING carries the grow in
    // and the shrink out. The ONLY instant is the NAV JOIN (2026-08-10): the
    // box remounts per card (key={stage.id}) so a fresh projection node joins
    // the CURRENT card's stack — that nav-mount join is 0-duration (invisible,
    // no size-up on switch); the exit always samples ZOOM_SPRING. The old
    // dynamic switching (ZOOM_NAV_INSTANT on nav, ZOOM_SPRING otherwise)
    // poisoned framer's exit cache after arrow-nav (snap instead of spring).
    const boxRegion = tsx.split("data-card-expanded")[1].split("</motion.div>")[0]
    expect(boxRegion, "the box binds the nav-instant / spring transition").toMatch(/transition=\{navMountRef\.current \? ZOOM_JOIN_INSTANT : ZOOM_SPRING\}/)
    expect(tsx, "NO ZOOM_NAV_INSTANT — the old cache-poisoning instant is gone").not.toMatch(/ZOOM_NAV_INSTANT/)
    // (5) THE HAND-ROLLED EXIT MACHINERY IS DEAD. Each of these was the
    // "box STILL disappears" culprit in a prior attempt — explicit animate
    // targets, measured-rect math, a swapped-in basic-shrink body. If ANY
    // broken and this guard fails loudly.
    expect(tsx, "NO box ref measuring the expanded card").not.toMatch(/const boxRef = useRef<HTMLDivElement>/)
    expect(tsx, "NO exit animate target with scale").not.toMatch(/exitTarget.*scale/)
    expect(tsx, "NO explicit framer animate prop on the box").not.toMatch(/animate=\{exitTarget/)
    expect(tsx, "NO hand-rolled onAnimationComplete on the box").not.toMatch(/onAnimationComplete=/)
    expect(tsx, "NO BasicShrinkBody component").not.toMatch(/BasicShrinkBody/)
    expect(tsx, "NO basic-shrink DOM marker").not.toMatch(/data-card-basic-shrink/)
    expect(tsx, "NO tile-scale constant").not.toMatch(/ZOOM_TILE_SCALE/)
    expect(tsx, "NO rect measurement in the zoom path").not.toMatch(/getBoundingClientRect\(\)/)
    // (6) NO opacity in the exit path (the hard no-fade rule).
    expect(boxRegion, "the morphing card MUST NOT fade").not.toMatch(/opacity/i)
})

  it("SKELETON: the box holds a skeleton during the morph; the real detail swaps in when it settles", () => {
    expect(tsx).toMatch(/data-card-skeleton/)
    expect(tsx).toMatch(/data-card-ready/)
    expect(tsx).toMatch(/onLayoutAnimationComplete/)
    expect(tsx).toMatch(/ZOOM_SKELETON_MS/)
})

  it("NO FADE: neither the backdrop nor the morphing card's TSX touches opacity — AND the CSS PINS the card at opacity:1 !important to kill framer's crossfade", () => {
    expect(backdrop, "the overlay root must carry the solid backdrop").toMatch(/var\(--background\)/)
    expect(backdrop, "the backdrop MUST NOT fade -- no opacity allowed").not.toMatch(/opacity/i)
    expect(cardRegion, "the morphing card's TSX MUST NOT animate opacity").not.toMatch(/opacity/i)
    // THE CROSSFADE KILLER (2026-08-09, frame-by-frame-proven): framer-motion's
    // shared-element system crossfades the exiting copy's opacity 1→0 during
    // the exit morph — "the box disappears" (invisible from ~frame 14 for
    // ~400ms until unmount). The crossfade lives in framer's layout projection
    // layer, which writes inline `style.opacity`; React props can't override
    // it. The ONLY thing that beats an inline style is `!important`. This CSS
    // rule is the fix — if it's removed, the fade returns and the operator's
    // policy ("PROVE TO ME THE CARD NEVER DISAPPEARS") is broken.
    expect(css, "the CSS MUST pin [data-card-expanded] opacity to 1 !important").toMatch(/\[data-card-expanded\]\s*\{\s*opacity:\s*1\s*!important/)
})

  it("the faded keyframe classes are DEAD -- they must never come back", () => {
    // The rewrite deleted @keyframes cardExpand/cardCollapse from
    // index.css (they were the teleport+wiggle + the fade source). If a
    // future change re-adds them, the zoom is fading again — fail loudly.
    expect(css).not.toMatch(/@keyframes\s+cardExpand/)
    expect(css).not.toMatch(/@keyframes\s+cardCollapse/)
    // And FlowCard must not re-apply the classes in markup.
    expect(tsx).not.toMatch(/className=.*animate-card-(expand|collapse)/)
})
})
