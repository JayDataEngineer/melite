// flowCardGrid — the flow tile grid + the chain overlay, moved
// VERBATIM from FlowCard.tsx (Cut 2, C7): FlowTileGrid (dnd-kit
// reorder rows, selection/group mode, the zoom overlay slot) and
// ChainZoomOverlay (the N member tiles as a sub-grid — ChainCardTile per
// member). SortableCardWrap / ChainCardWrap are the drag wrappers.
// CardZoomOverlay + cardLayoutId + ZOOM_SPRING come from flowCardZoom
// (same constants, one home); CardTile comes from its own module
// (flowCardTile after Cut 2 completes) — NEVER through the shim.
import { useState, useCallback, useMemo, useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  DndContext, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, useSortable, horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { X, Wand2, Layers, Group as GroupIcon } from "lucide-react"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { familyLabel } from "@melite/catalog"
import { segmentFlow, segmentId, condensationKey, type ChainSegment } from "./multiEditGroup"
import type { CardStage, CardActions } from "@melite/contracts"
import { CardZoomOverlay, ZOOM_SPRING, cardLayoutId } from "./flowCardZoom"
import { ChainCardTile } from "./flowCardBadges"
import { CardTile } from "./flowCardTile"

/** THE one card surface — the Library tiling grid, rendered identically on
* every surface (Library canvas, Agent chat). The RESTING grid is a row of
* dense rectangle tiles, uniform height via items-stretch. Clicking a tile
* opens a full-focus ZOOM OVERLAY (CardZoomOverlay) — portaled into the
* workspace content area (sidebars + header stay visible) whose solid
* backdrop covers the grid, the chat, AND the chat input. The overlay
* itself scrolls so a tall detail is fully reachable. Escape /
* backdrop-click / Collapse closes it.
 *
 * ZOOM OVERLAY (2026-08-08 policy — supersedes the prior "siblings shrink
 * to compact but stay visible" model): "WHEN I ZOOM IN ON A CARD, ALL OTHER
 * CARDS SHOULD GO AWAY. CHAT INPUT SHOULD GO AWAY. THE ONLY THING SHOULD BE
 * THE ONE DRILLDOWN CARD. THE SHRINK ANIMATION [REDACTED 2026-11-05], IT'S BUGGY. I NEED
 * SMOOTH EXPAND SMOOTH SHRINK." The old flex-basis in-place expansion
 * animated LAYOUT during a content swap — the literal source of the jank.
 * The morph (2026-08-08 rewrite) is a framer-motion SHARED ELEMENT: the
 * tile and the zoomed card share layoutId, so the card GROWS out of the
 * tile's real screen rect and SHRINKS back into it — transform-only,
 * compositor-only, zero reflow. The resting grid stays mounted behind the
 * solid backdrop; it does not animate, shrink, or reflow. The exit is
 * AnimatePresence's — the overlay holds mounted (data-card-closing) while
 * the shrink plays, then unmounts.
 *
 * `addTile` (Library-only) appends the add-card button (always rendered —
 * it hides behind the backdrop while zoomed). */
export function FlowTileGrid({
  stages, runningStageId, actions, onRemove, focusStageId, onFocusStageId, onReorderRange, addTile,
  selectionMode, onExitSelectionMode,
}: {
  stages: CardStage[]
  runningStageId: string | null
  actions: CardActions
  onRemove: (id: string) => void
  focusStageId: string | null
  onFocusStageId: (id: string | null) => void
  /** Drag a tile onto another → flow order changes (store rewrites the
  * stage array = execution order). Every surface wires this — the grid
  * never reorders itself. 2026-08-12: takes a BLOCK (fromIds) — a
  * collapsed multi-edit chain drags as one contiguous unit; a single
  * card is a 1-element block (identical semantics to the old
  * (fromId, toId) contract). */
  onReorderRange: (fromIds: string[], toId: string) => void
  /** Optional trailing add-card tile (the Library surface only). */
  addTile?: ReactNode
  /** GROUPING SUB-VIEW (2026-08-12): when true, the grid enters selection
  *  mode — tiles show check circles, clicking a tile toggles selection
  *  (not zoom), and the Group bar appears at the top. Triggered from the
  *  "Group Cards" action in the ServicePicker. */
  selectionMode?: boolean
  /** Exit the grouping sub-view (2026-08-12) — called when the user clicks
  *  Group, Cancel, or Escapes. The parent (FlowCanvas) flips its
  *  groupingMode state to false. */
  onExitSelectionMode?: () => void
}) {
  // ── Chain condensation (2026-08-12/13): consecutive same-family stages
  // render as ONE chain tile ("show N img-edit calls at different angles as
  // one visual block"; 2026-08-13: the ×9 Nomos upscale pass gets the same
  // treatment — "upscaling actions … go under the chain card like the img
  // edit one"). condensationKey returns the family-scoped key (qwen-img-edit-2511 /
  // upscale / null) so a run BREAKS when the family changes — the edit pass
  // and the upscale pass are TWO chains, never one blob. Purely a view-layer
  // projection — the stages array, wiring, execution order and run status
  // are untouched; the chain tile opens an overlay with the member tiles
  // (which behave exactly like standalone cards — zoom, remove, play,
  // reorder-in-place all live).
  const segments = useMemo(() => segmentFlow(stages, condensationKey), [stages])
  const indexOf = useMemo(() => new Map(stages.map((s, i) => [s.id, i])), [stages])
  const [chainFocusId, setChainFocusId] = useState<string | null>(null)
  // ── Compound grouping selection (2026-08-12) ──
  // The user selects 2+ tiles (hover-revealed check on each CardTile) → a
  // floating "Group N cards" bar appears → click calls actions.onGroupStages
  // with the ordered ids and clears the selection. Esc / the Cancel pill /
  // focus changing away all clear it too. Only free single stages are
  // selectable (compound parents don't render as free tiles; a child inside
  // a compound is skipped by the projection, so it can't be picked from the
  // main grid — ungroup first to reselect it).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  // Grouping is only active when BOTH the store wires onGroupStages AND the
  // user explicitly entered the selection sub-view (from the picker's
  // "Group Cards" action). selectionMode=false → NO circles on tiles, NO
  // group bar, clicks zoom as usual. The user's explicit request:
  // "THE FEATURE NEEDS TO BE AN ACTION CARD … WHEN I CLICK ON THE ACTION IT
  // GOES INTO A FILTERED VIEW, THE SUB VIEW."
  const groupingEnabled = !!selectionMode && typeof actions.onGroupStages === "function"
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const exitMode = useCallback(() => {
    setSelectedIds(new Set())
    onExitSelectionMode?.()
  }, [onExitSelectionMode])
  const clearSelection = exitMode
  const groupSelection = useCallback(() => {
    if (!actions.onGroupStages) return
    // Preserve flow order: the compound parent lands at the FIRST
    // member's position, and the store expects childIds in array order.
    const ordered = stages
      .map((s) => s.id)
      .filter((id) => selectedIds.has(id))
    if (ordered.length < 2) return
    actions.onGroupStages(ordered)
    exitMode()
  }, [actions, selectedIds, stages, exitMode])
  // Esc clears selection (unless a zoom overlay / lightbox / input owns it).
  useEffect(() => {
    if (selectedIds.size === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      const t = e.target as HTMLElement | null
      if (t && typeof t.closest === "function" &&
          t.closest("input, textarea, select, [contenteditable]")) return
      // Don't fight the zoom overlay / chain overlay / lightbox for Escape.
      if (document.querySelector("[data-card-zoom], [data-asset-preview-dialog], [data-chain-overlay]")) return
      clearSelection()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedIds.size, clearSelection])
  // Drop selections that no longer exist (deleted / consumed by a group).
  useEffect(() => {
    if (selectedIds.size === 0) return
    const live = new Set(stages.map((s) => s.id))
    const stale = [...selectedIds].filter((id) => !live.has(id))
    if (stale.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of stale) next.delete(id)
      return next
    })
  }, [stages, selectedIds])
  // Auto-close when the focused chain stops existing (e.g. members removed
  // down to a single stage inside the overlay → the run un-groups).
  useEffect(() => {
    if (chainFocusId && !segments.some((s) => segmentId(s) === chainFocusId)) {
      setChainFocusId(null)
    }
  }, [segments, chainFocusId])
  const chainSeg = chainFocusId
    ? (segments.find((s) => segmentId(s) === chainFocusId) as ChainSegment<CardStage> | undefined)
    : undefined
  // The GROW/SHRINK ORIGIN (2026-08-08 rewrite): the tile and the zoomed
  // card share layoutId (cardLayoutId) — framer-motion measures the tile's
  // real screen rect itself and projects the card FROM it (grow) and BACK
  // (shrink). No rect capture needed here anymore; the shared element IS
  // the origin. The OLD hand-captured focusRect FLIP is gone (2026-08-08).
  
  // Zoom-overlay keyboard (parity with a modal + the lightbox's ← →):
  // ArrowLeft/ArrowRight hop to the neighboring card (Escape lives in
  // CardZoomOverlay — it owns the close). Arrow nav never
  // fires while the user is typing in an input/select (param editor, prompt,
  // subcard select) — arrow keys there belong to the field. And while the
  // asset lightbox is open on top (opened from a card output), IT owns
  // ← → / Escape — its keys must not also drive the zoom overlay behind it
  // (the guard checks for the dialog's marker element).
  useEffect(() => {
    if (!focusStageId) return
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-asset-preview-dialog]")) return
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const t = e.target as HTMLElement | null
      if (t && typeof t.closest === "function" &&
          t.closest("input, textarea, select, [contenteditable]")) return
      const i = stages.findIndex((s) => s.id === focusStageId)
      const target = stages[e.key === "ArrowLeft" ? i - 1 : i + 1]
      if (target) onFocusStageId(target.id)
}
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focusStageId, onFocusStageId, stages])
  
  // ── Zoom-overlay card navigation (2026-08-08): the side arrows switch the
  // focused card to its prev/next neighbor in flow order. Computed here
  // (the overlay sees only the focused stage; the grid owns the order).
  const focusIdx = focusStageId ? stages.findIndex((s) => s.id === focusStageId) : -1
  
  // Drag vs click (2026-08-08): a 4px pointer travel separates a reorder
  // drag from a click-to-expand — same sensor as the modifier-subcard grid.
  // Clicking without moving still opens the card.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  
  // Reorder locks while a stage is executing — the canvas runs the array in
  // order, so a mid-run drag would desync the in-flight execution. Covers
  // both run modes (composer: runningStageId; chain: all stages "running").
  const locked = runningStageId !== null || stages.some((s) => s.status === "running")
  
  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const fromSeg = segments.find((s) => segmentId(s) === String(active.id))
    const toSeg = segments.find((s) => segmentId(s) === String(over.id))
    if (!fromSeg || !toSeg) return
    if (fromSeg.kind === "chain") {
      // A chain drags as a block; the anchor is the over segment's FIRST
      // stage (arrayMove semantics — insert at the anchor's post-removal
      // index).
      onReorderRange(
        fromSeg.stages.map((s) => s.id),
        toSeg.kind === "chain" ? toSeg.stages[0].id : toSeg.stage.id,
      )
    } else if (toSeg.kind === "chain") {
      // Single dropped onto a chain → lands before the chain's first member.
      onReorderRange([fromSeg.stage.id], toSeg.stages[0].id)
    } else {
      onReorderRange([fromSeg.stage.id], toSeg.stage.id)
    }
  }, [segments, onReorderRange])
  
  const focusedStage = focusStageId
    ? stages.find((s) => s.id === focusStageId)
    : undefined
    
  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext
          items={segments.map(segmentId)}
          strategy={horizontalListSortingStrategy}
              >
          {/* items-stretch: every tile in a row stretches to the tallest —
              UNIFORM card heights (the operator's "cards are different
              heights" fix). content-start keeps rows top-packed. The grid
              itself never expands a card in place anymore — zoom is a
              separate overlay, so this row is always the resting compact
              grid (it hides behind the overlay's solid backdrop while a
              card is zoomed). */}
          {/* data-grid-pin: the DSH promotion machine pins this node's
              max-width to the column width for the zoom lifetime (see
              zoomPromotion GRID_PIN_SELECTOR) so the post-unmount bake
              changes no pixels -- the grid never sees the fullscreen
              viewport, and the exiting card's tile box is identical in
              both layouts. Passive when unpromoted (no rule reads it). */}
          <div data-grid-pin className="flex flex-wrap items-stretch gap-2 content-start">
            {segments.map((seg) =>
              seg.kind === "single" ? (
                <SortableCardWrap
                  key={seg.stage.id}
                  stage={seg.stage}
                  index={indexOf.get(seg.stage.id) ?? 0}
                  locked={locked}
                  stages={stages}
                  runningStageId={runningStageId}
                  actions={actions}
                  onRemove={onRemove}
                  // In selection mode, clicking a tile toggles selection
                  // (NOT zoom). onFocusStageId is overridden per-tile.
                  onFocusStageId={groupingEnabled ? () => toggleSelect(seg.stage.id) : onFocusStageId}
                  selected={groupingEnabled && selectedIds.has(seg.stage.id)}
                  onToggleSelect={groupingEnabled ? () => toggleSelect(seg.stage.id) : undefined}
                />
              ) : (
                <ChainCardWrap
                  key={segmentId(seg)}
                  seg={seg}
                  indexStart={indexOf.get(seg.stages[0].id) ?? 0}
                  indexEnd={indexOf.get(seg.stages[seg.stages.length - 1].id) ?? 0}
                  locked={locked}
                  onOpenChain={() => setChainFocusId(segmentId(seg))}
                  onUngroup={
                    seg.parent && actions.onUngroupStages
                      ? () => { actions.onUngroupStages!(seg.parent!.id); clearSelection() }
                      : undefined
                  }
                />
              ),
            )}
            {addTile}
    </div>
        </SortableContext>
      </DndContext>
      {/* ── Grouping sub-view header (2026-08-12) ──
          A PROMINENT bar at the top of the grid while the user is in the
          filtered selection sub-view. Shows the count + Group action + Cancel.
          The Group action calls onGroupStages with the ordered child ids;
          Cancel (and Esc) exit the sub-view. */}
      {groupingEnabled && (
        <div
          data-group-bar
          className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-brand/40 bg-brand/10 px-4 py-2 backdrop-blur-md"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="h-4 w-4 text-brand" />
            {selectedIds.size === 0
              ? "Select cards to group"
              : `${selectedIds.size} card${selectedIds.size === 1 ? "" : "s"} selected`}
          </span>
          <div className="flex items-center gap-2">
            {selectedIds.size >= 2 && (
              <button
                type="button"
                onClick={groupSelection}
                data-group-action="group"
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-brand/30 transition-all hover:bg-brand/85 active:scale-95"
              >
                <GroupIcon className="h-4 w-4" />
                Group into one card
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              data-group-action="cancel"
              className="rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* ── The chain overlay (multi-edit condensation, 2026-08-12). Rendered
          BEFORE the card zoom overlay so the member zoom always stacks on top
          (both portal to the same root; DOM order decides the layer). The
          chain overlay itself never nests a zoom — clicking a member tile
          inside focuses the MEMBER (focusStageId), and the grid's own
          CardZoomOverlay grows out of the member tile, covering this
          overlay. Escape closes the chain only when no member zoom is on
          top (checked inside ChainZoomOverlay). NO AnimatePresence here on
          purpose: the overlay is a plain container with no shared-element
          exit morph, so close is instant — a presence hold would freeze a
          dead frame on screen (and never unmount in jsdom when the member
          tiles' layoutIds are inside the exiting subtree). */}
      {chainSeg && (
        <ChainZoomOverlay
          seg={chainSeg}
          stages={stages}
          indexOf={indexOf}
          runningStageId={runningStageId}
          actions={actions}
          onRemove={onRemove}
          onFocusStageId={onFocusStageId}
          onClose={() => setChainFocusId(null)}
        />
      )}
      {/* ── The zoom overlay, driven by AnimatePresence (2026-08-08) ──
          Focus → overlay mounts (the card grows out of the tile via the
          shared layoutId). Focus clears → AnimatePresence holds the overlay
          mounted through the exit SHRINK (the card projects back into the
          CURRENT card's tile — data-card-closing via usePresence), then
          unmounts it. The key is CONSTANT ("zoom") so arrow-nav is a
          handoff on the same overlay — never a close/reopen pass-through;
          the box INSIDE remounts per card (key={stage.id}, 2026-08-10) so
          the exit always targets the card the user is on. */}
      <AnimatePresence>
        {focusedStage && (
          <CardZoomOverlay
            key="zoom"
            stage={focusedStage}
            upstreams={stages}
            running={runningStageId === focusedStage.id || focusedStage.status === "running"}
            actions={actions}
            onClose={() => onFocusStageId(null)}
            onPrevCard={focusIdx > 0 ? () => onFocusStageId(stages[focusIdx - 1].id) : undefined}
            onNextCard={focusIdx >= 0 && focusIdx < stages.length - 1
              ? () => onFocusStageId(stages[focusIdx + 1].id)
              : undefined}
        />
      )}
      </AnimatePresence>
    </>
  )
}

/** One stage's grid wrapper — the sortable item. The RESTING grid ONLY: it
* always renders the compact tile (uniform — there is no longer an in-place
* expanded branch; zoom is a separate overlay rendered by FlowTileGrid).
 *
 * Drag contract (2026-08-08, the modifier-subcard precedent): the whole
 * COMPACT tile is the drag handle — "drag order = array order = flow
 * order". setNodeRef stays on the wrapper (the flex item — the drop geometry
 * is the wrapper's); the listeners ride on the tile inside. `locked` (a stage
 * is executing) strips the listeners + attributes entirely — no drag, no
 * sortable semantics. */
function SortableCardWrap({
  stage, index, locked, stages,
  runningStageId, actions, onRemove, onFocusStageId,
  selected, onToggleSelect,
}: {
  stage: CardStage
  index: number
  locked: boolean
  stages: CardStage[]
  runningStageId: string | null
  actions: CardActions
  onRemove: (id: string) => void
  onFocusStageId: (id: string | null) => void
  /** Selection state for compound grouping (2026-08-12). */
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id })
  const upstream = stage.inputs[0]
  const upstreamStage = upstream ? stages.find((s) => s.id === upstream) : undefined
  
  return (
        <div
      ref={setNodeRef}
      data-card-wrap={stage.id}
      // The wrapper is a flex item in an items-stretch row — it stretches to
      // the row's height; the h-full chain (handle → CardTile outer → inner)
      // carries that down so every tile in the row is the SAME height
      // (uniform cards). min-w-0: flex items won't shrink below min-content,
      // so without it a long unbreakable chip would stretch the tile past its
      // basis and break the column rhythm. No flex-basis transitions here
      // anymore — the wrapper is always 200px; growth/shrink lives in the
      // zoom overlay now (transform/opacity, never layout).
      className={cn("min-w-0", isDragging && "z-20")}
      style={{
        flexBasis: "200px",
        // dnd-kit: the in-flight drag transform + its sort transition.
        transform: CSS.Transform.toString(transform),
        transition,
        }}
              >
      {/* The pop-in masks the first-paint mount (staggered per index). This
          div is the drag handle: attributes+listeners from dnd-kit,
          cursor-grab. h-full carries the row stretch into CardTile so the
          uniform-height chain is unbroken. tabIndex -1: the CardTile inside
          stays THE keyboard stop; the handle is mouse/pointer-only. */}
        <Tip tip={locked ? "Flow is running — reorder locked" : "Drag to reorder · click to expand"}>
        <div
        className={cn(
          "animate-tile-pop h-full",
          !locked && "cursor-grab active:cursor-grabbing",
          isDragging && "rounded-lg ring-2 ring-brand/60",
      )}
        style={{ animationDelay: `${index * 25}ms` }}
        aria-label={locked ? "Flow is running — reorder locked" : "Drag to reorder · click to expand"}
        {...(locked ? {} : attributes)}
        tabIndex={-1}
        {...(locked ? {} : listeners)}
              >
        {/* THE SHARED-ELEMENT TILE (2026-08-08): the SAME layoutId as the
            zoomed card → framer-motion morphs the zoom out of this tile's
            rect (grow) and back into it (shrink). The morph box is the
            tile's full size (h-full — the uniform-height chain is
            unbroken); dnd-kit's own transform stays on the wrapper above.
            data-layout-id is the DOM anchor the tests pin. */}
        <motion.div
          layoutId={cardLayoutId(stage.id)}
          data-layout-id={cardLayoutId(stage.id)}
          className="h-full w-full"
          transition={ZOOM_SPRING}
              >
          <CardTile
            stage={stage}
            running={runningStageId === stage.id || stage.status === "running"}
            index={index}
            upstreamTitle={upstreamStage?.title}
            onOpen={() => onFocusStageId(stage.id)}
            onRemove={() => onRemove(stage.id)}
            onRun={actions.onRun ? () => actions.onRun!(stage.id) : undefined}
            // Tile-level stop (2026-08-13): the play button becomes a stop
            // button while this card is running — calls the store's
            // cancelRun (interrupt + abort + force-pending).
            onCancel={actions.onCancel ? () => actions.onCancel!(stage.id) : undefined}
            // Drop target → first input slot → onEditSave (the same
            // wire shape the Input slots section uses; stage.params
            // merge via updateStageParams).
            onAttachToSlot={actions.onEditSave ? (slot, url) => actions.onEditSave!(stage.id, { [slot]: url }, undefined, { userEdit: true }) : undefined}
            // Save-to-assets toggle (2026-08-12) — hide/unhide the card's
            // output in the left sidebar. Present whenever the surface
            // wires the store action (Library + Agent canvases).
            onToggleSaveToAssets={actions.onToggleSaveToAssets ? (value) => actions.onToggleSaveToAssets!(stage.id, value) : undefined}
            // Compound grouping selection (2026-08-12) — the check circle
            // on the tile. Only wired when the grid owns a selection set
            // (i.e. grouping is enabled on this surface).
            selected={selected}
            onToggleSelect={onToggleSelect}
        />
        </motion.div>
    </div>
    </Tip>
    </div>
  )
}

// ── Chain condensation (2026-08-12/13) ───────────────────────────────────
// A chain segment (N consecutive same-family cards — the qwen-img-edit-2511 pass,
// the ×9 upscale pass) renders as ONE tile — the user's "show N img-edit
// calls at different angles as one visual block". The chain tile opens
// ChainZoomOverlay, whose member tiles ARE the existing CardTiles — same
// tile, same zoom, same remove/play — so a chain member behaves identically
// to a standalone card.

/** The chain tile's sortable grid wrapper — mirrors SortableCardWrap's drag
 * contract (whole tile is the handle; locked strips listeners) with the
 * SEGMENT id as the dnd id. No shared-element layoutId: the chain overlay
 * is a plain container (fade), not a card morph. */
function ChainCardWrap({
  seg, indexStart, indexEnd, locked, onOpenChain, onUngroup,
}: {
  seg: ChainSegment<CardStage>
  indexStart: number
  indexEnd: number
  locked: boolean
  onOpenChain: () => void
  /** Dissolve this compound parent (2026-08-12). Only passed when seg.parent
   *  is present; ChainCardTile renders the button only when this is set. */
  onUngroup?: () => void
}) {
  const id = segmentId(seg)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      data-chain-wrap={id}
      className={cn("min-w-0", isDragging && "z-20")}
      style={{
        flexBasis: "200px",
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Tip tip={locked ? "Flow is running — reorder locked" : "Drag to reorder · click to expand"}>
      <div
        className={cn(
          "animate-tile-pop h-full",
          !locked && "cursor-grab active:cursor-grabbing",
          isDragging && "rounded-lg ring-2 ring-brand/60",
        )}
        style={{ animationDelay: `${indexStart * 25}ms` }}
        aria-label={locked ? "Flow is running — reorder locked" : "Drag to reorder · click to expand"}
        {...(locked ? {} : attributes)}
        tabIndex={-1}
        {...(locked ? {} : listeners)}
      >
        <ChainCardTile
          seg={seg}
          indexStart={indexStart}
          indexEnd={indexEnd}
          onOpen={onOpenChain}
          onUngroup={onUngroup}
        />
      </div>
      </Tip>
    </div>
  )
}

/** The chain overlay — the N member tiles as a sub-grid, each a full
 * CardTile (zoom drilldown, remove, play, drop all behave exactly like a
 * standalone card). Plain container overlay (fade, no shared-element morph
 * — the member tiles own the morphs). Escape/backdrop close; Escape is
 * IGNORED while a member zoom or the asset lightbox is open on top. */
function ChainZoomOverlay({
  seg, stages, indexOf, runningStageId, actions, onRemove, onFocusStageId, onClose,
}: {
  seg: ChainSegment<CardStage>
  stages: CardStage[]
  indexOf: Map<string, number>
  runningStageId: string | null
  actions: CardActions
  onRemove: (id: string) => void
  onFocusStageId: (id: string | null) => void
  onClose: () => void
}) {
  // Escape collapses — but never while a member CardZoomOverlay (or the
  // asset lightbox) is on top; the topmost layer owns the key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-card-zoom-overlay]")) return
      if (document.querySelector("[data-asset-preview-dialog]")) return
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // NO presence machinery here: the overlay is a plain container with no
  // shared-element exit morph, and the member tiles' layoutIds inside the
  // exiting subtree would hold an AnimatePresence ghost mounted forever in
  // jsdom. Close is INSTANT — conditional render, no AnimatePresence (the
  // grid renders this overlay without one, deliberately).

  const members = seg.stages
  const first = members[0]

  return createPortal(
    <div
      data-chain-zoom-overlay
      data-subgraph-overlay
      data-subgraph-mode={seg.mode ?? "fanout"}
      className="absolute inset-0 z-[80] flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          className="flex min-h-full flex-col items-center justify-start p-6"
        >
          <div className="w-full" style={{ maxWidth: 920, maxHeight: "100%" }}>
            {/* Header — what this block is + the collapse button. */}
            <div className="mb-4 flex items-center gap-2">
              <Wand2 className="h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">{first.title}</h2>
                <p className="truncate text-[10px] text-muted-foreground/70">
                  {members.length} consecutive {familyLabel(first.service)} cards — one{" "}
                  {condensationKey(first) === "upscale" ? "upscale" : "edit"} pass
                </p>
              </div>
              <Tip tip="Collapse">
              <button
                onClick={onClose}
                aria-label="Collapse chain"
                className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              </Tip>
            </div>
            {/* The member tiles — the SAME tiles the grid renders, each with
                its own layoutId so a member's zoom grows out of ITS tile. */}
            <div className="flex flex-wrap items-stretch gap-2 content-start">
              {members.map((member) => {
                const upstream = member.inputs[0]
                const upstreamStage = upstream ? stages.find((s) => s.id === upstream) : undefined
                return (
                  <div key={member.id} className="min-w-0" style={{ flexBasis: "200px" }}>
                    <div className="h-full">
                      <motion.div
                        layoutId={cardLayoutId(member.id)}
                        data-layout-id={cardLayoutId(member.id)}
                        className="h-full w-full"
                        transition={ZOOM_SPRING}
                      >
                        <CardTile
                          stage={member}
                          running={runningStageId === member.id || member.status === "running"}
                          index={indexOf.get(member.id) ?? 0}
                          upstreamTitle={upstreamStage?.title}
                          onOpen={() => onFocusStageId(member.id)}
                          onRemove={() => onRemove(member.id)}
                          onRun={actions.onRun ? () => actions.onRun!(member.id) : undefined}
                          onCancel={actions.onCancel ? () => actions.onCancel!(member.id) : undefined}
                          onAttachToSlot={actions.onEditSave
                            ? (slot, url) => actions.onEditSave!(member.id, { [slot]: url }, undefined, { userEdit: true })
                            : undefined}
                        />
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.querySelector("[data-workspace-content]") ?? document.body,
  )
}
