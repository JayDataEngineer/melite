// flowCardTile — THE card, the dense Library tile, moved VERBATIM from
// FlowCard.tsx (Cut 2, C3). CardTile IS the card — rendered 1:1 by
// FlowTileGrid on every surface. The live-feedback lines
// (CardActivityLine / CardProgressBar) are imported ALIASED from
// CardActivity.tsx (their own module, so the CardStudio rail can share
// them) exactly as the original module did; CardErrorLine comes from
// flowCardErrorLine.
// ELEMENT SLOTS (2026-08-19, the overrides doctrine): the tile is a
// COMPOSITION — its icon, preview cell, and run affordance are SLOT
// claims (cardElementSeams), with melite-core's defaults registered in
// cardElements.tsx at precedence 10. This file names NO renderer; it
// consults the walk.
import { useState } from "react"
import {
  Trash2, Link2,
  Save, SaveOff, Check, Square,
} from "lucide-react"
import { cn } from "@melite/ui"
import { readAsDataURL } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { subcardCount } from "@melite/contracts"
import { CAPABILITY_DRAG_MIME } from "@melite/formats"
import { ProvenanceBadge } from "@melite/ui/ProvenanceBadge"
import { firstInputSlot } from "@melite/catalog"
import {
  familyCardSummary, familyLabel, routeCoordinates, variantLabel,
} from "@melite/catalog"
import { CardActivityLine as _CardActivityLine, CardProgressBar as _CardProgressBar } from "./CardActivity"
import { CardErrorLine } from "./flowCardErrorLine"
import type { CardStage } from "@melite/contracts"
import { useCardKindsVersion } from "./pluginKinds"
import { cardIconSlot, cardPreviewSlot, cardRunSlot } from "@melite/slots"
import "./cardElements"

// ── THE ONE CARD — the dense tile ─────────────────────────────────────────
// ONE WAY TO SEE THE CARD. THE LIBRARY WAY… IT IS 1:1 TO WHAT WE SEE IN
// AGENT VIEW." CardTile IS the card. The full-width FlowCard that used
// to live here was the SECOND design — deleted (rule 4: no two designs, no
// legacy). Every surface (Library canvas, Agent chat) renders the SAME tile
// and the SAME inline expand via FlowTileGrid below. The icon glyph
// chain (kind icon → genre glyph) lives in cardElements.tsx now — a slot
// claim, not a tile constant.

// LAYOUT LAW (2026-08-26, "the entire card IS the preview — no blank
// square below it"): the visual card (INNER) is ONE flex column with
// exactly two flow children:
//   1. the PREVIEW CELL — flex-1 min-h-0: it owns EVERY pixel the caption
//      strip doesn't need. The media branches (cardElements.tsx) fill it
//      (flex-1 + object-cover), so a generated card shows its artifact
//      edge to edge — when a taller sibling stretches the row, the image
//      GROWS to meet the caption instead of leaving dead background.
//   2. the CAPTION STRIP — shrink-0, natural height: the declared summary
//      lines + the live run feedback (activity / progress / error).
// The old anatomy had the body as a SIBLING of the h-full INNER with
// flex-1: the inner's height:100% basis consumed the whole row, the body
// resolved to ZERO height (its text painted OUTSIDE the frame), and the
// inner's leftover stretch rendered as a blank band under the preview —
// the "massive square below the preview" the operator reported. Do not
// reintroduce a flex-1 sibling of a h-full card.
// SQUARE LAW (2026-08-23, "Action Cards need a more square shape, they
// are too tall"): the PREVIEW CELL carries aspect-square. Its content
// contribution is WIDTH×1 (~198px at the 200px basis), so an intrinsically
// PORTRAIT artifact can no longer drive the ROW height — against an
// indefinite container a zero/percentage flex-basis falls back to CONTENT
// size, so a 2:3 img used to demand ~300px of cell and stretch every
// sibling into a tower. The resting face lands ≈square (preview + caption
// strip); object-cover crops whatever the artifact's native ratio is.
// flex-1 STAYS: when a row still stretches (a sibling's expanded error
// line), the cell grows to fill — media rides it object-cover, no blank
// band. This SUPERSEDES the "cell preserves the artifact's natural
// aspect" reading of the fill law (card-preview-fill.spec.ts updated in
// the same edit — rule 4).
// The IMAGE-ANCHORED overlays (select check, upstream badge, tile Run,
// tile Stop) live INSIDE the preview cell so their bottom-* anchors ride
// the artifact's corner — the documented "thumbnail's bottom-right"
// contract — not the caption strip's. The TOP overlays (status dot,
// save, remove) stay on the INNER: the cell is the first child, so the
// coordinates coincide.


/** THE card — the dense Library tile, rendered 1:1 on every surface.
* Compact rectangle; click EXPANDS it inline (no modal — "instead of a
* modal popup, the card expands with the other cards shrinking",
* 2026-08-07). The compact face is EXACTLY the
* DECLARED summary (2026-08-09): Card Name / Model, Variant / output size
* (W×H for generation families, or a single resolution / scale for the
* Enhance / upscale families) + run duration inline — no raw-param chips
* (the "seed=42 sampler=euler" noise was freehand policy: Object.entries
* order decided what showed; deleted). */
export function CardTile({
  stage, running, index, upstreamTitle, onOpen, onRemove, onRun, onAttachToSlot,
  onToggleSaveToAssets,
  selected, onToggleSelect, onCancel,
}: {
  stage: CardStage
  running: boolean
  index: number
  upstreamTitle?: string
  onOpen: () => void
  onRemove: () => void
/**
    * Drop-target hook (Phase 3c, 2026-08-07): an asset or file dropped on
    * the tile resolves to its first input slot (lib/inputSlots.ts →
    * firstInputSlot) and fires this callback. null = the card carries no
    * slot → the drop is rejected with a toast (no silent drop). When
    * unset, the tile is NOT a drop target (other surfaces that don't
    * wire the store stay drop-free).
*/
  onAttachToSlot?: (slot: string, url: string) => void
/**
* Run / re-run the stage from the TILE itself.
   * When supplied, a small affordance renders at the thumbnail's bottom-right
   * — see `showTilePlay` for the exact visibility rule. Click STOP-PROPAGATION
   * keeps it from opening the inline detail (click-to-expand stays for
   * preview/zoom).
*/
  onRun?: () => void
  /** Cancel the in-flight run (2026-08-13). When supplied AND the card is
   *  running, the play affordance is replaced by a STOP (Square) button at
   *  the thumbnail's bottom-right — same corner, same stop-propagation contract
   *  (click never opens the inline detail). The whole-run cancel is correct
   *  here: only one stage runs at a time inline, and a chain run is all-stages. */
  onCancel?: () => void
  /** Toggle whether the card's output appears in the left sidebar (2026-08-12).
   * When unset, the card shows no toggle (the surface doesn't wire the store
   * action — e.g. the Library canvas preview). */
  onToggleSaveToAssets?: (value: boolean) => void
  /** Selection state for compound grouping (2026-08-12). When true, the tile
   *  wears a brand ring + the check stays visible. */
  selected?: boolean
  /** Toggle this tile in/out of the selection set (2026-08-12). When unset,
   *  the tile shows no check button (the surface doesn't wire grouping). */
  onToggleSelect?: () => void
}) {
  // Kinds lane: subscribe so a mid-session flip re-renders the icon.
  useCardKindsVersion()
  // Element slots: subscribe so a mid-session claim FLIP re-renders the
  // tile's claimed cells (a plugin override landing on the wire).
  cardIconSlot.useVersion()
  cardPreviewSlot.useVersion()
  cardRunSlot.useVersion()
  const genre = stage.genre ?? "image"
  const url = stage.result?.assetUrls[0]
  // The claimed cells — melite-core defaults at precedence 10, a louder
  // plugin claim shadows. Unclaimed → undefined → the cell renders
  // nothing (the DEFAULT claim IS the fail-safe, so this is only the
  // torn-down state between dispose and re-register).
  const Preview = cardPreviewSlot.resolve({ stage, url, genre })?.Preview
  const Run = cardRunSlot.resolve({ stage, running, onRun })?.Run
  // The drop target resolves an asset/file drop to the card's FIRST
  // input slot. lib/inputSlots.ts → firstInputSlot walks INPUT_SLOTS in
  // declaration order (input_image > reference_image > end_image > …).
  // null = the card has no slot → drop rejected (no silent drop).
  const dropSlot = firstInputSlot(stage.params)
  const [dragOver, setDragOver] = useState(false)
  const onDropAsset = (e: React.DragEvent) => {
    // Capability drops belong to the CANVAS ("drag a capability tile from
    // the sidebar onto the middle → a new card appears"), not to the card.
    // Don't claim them — let the event bubble so the canvas can create the
    // card. The card's onDragOver already ignores the capability MIME, so
    // this just keeps the drop event flowing upward. 2026-08-08.
    if (e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)) {
    setDragOver(false)
      return // NO preventDefault, NO stopPropagation
}
          e.preventDefault()
    e.stopPropagation() // don't bubble to the canvas-level handler
    setDragOver(false)
    if (!onAttachToSlot || !dropSlot) return // not a drop target / no slot
    const DRAG_MIME = "application/tech-noir-asset"
    const asset = e.dataTransfer.getData(DRAG_MIME)
    if (asset) {
    try {
        const payload = JSON.parse(asset) as { url?: string }
        if (payload.url) {
          onAttachToSlot(dropSlot, payload.url)
        return
}
      } catch { /* malformed — fall through to file */ }
}
    const file = e.dataTransfer.files?.[0]
    if (file) {
      // Shared readAsDataURL — the ONE read path every slot-shaped
      // attach uses (read failures surface on the console, never a
      // half-written slot).
      void readAsDataURL(file).then((url) => onAttachToSlot(dropSlot, url))
        .catch((err: unknown) => console.error("[flowCardTile] drop read failed:", err))
}
}
  return (
        <div
      data-card-tile={stage.id}
      data-drop-target={dropSlot ?? undefined}
      onClick={onOpen}
      // Drop target (Phase 3c): when onAttachToSlot is wired AND the
      // card has an input slot, the tile accepts asset/file drops. The
      // dragOver state highlights the border; the handler resolves the
      // first slot + writes the URL through onAttachToSlot.
      onDragOver={(e) => {
        if (!onAttachToSlot || !dropSlot) return
        if (e.dataTransfer.types.includes("application/tech-noir-asset") || e.dataTransfer.types.includes("Files")) {
          e.preventDefault()
          setDragOver(true)
}
        }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDropAsset}
      // OUTER = positioning context (relative) + height (h-full, so the
      // items-stretch tiling grid yields UNIFORM tile heights — the row
      // stretches every wrapper to the tallest, and h-full propagates that
      // down through the handle + into this card). The interactive handlers
      // (click/drag) stay on this outer so the whole tile is one hit target.
      className="group relative flex h-full w-full cursor-pointer flex-col"
              >
        <div
        // INNER = the visual card: border + bg + rounded + clip. overflow-
        // hidden here is what keeps the preview + caption clipped to the
        // card's rounded-lg corners. h-full fills the stretched row; the
        // PREVIEW CELL (flex-1) absorbs every pixel above the caption.
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card transition-all",
          "border-sidebar-border/60 hover:border-brand/50 hover:shadow-md hover:shadow-brand/10",
          stage.status === "done" && "ring-1 ring-emerald-500/30",
          stage.status === "error" && "ring-1 ring-destructive/40",
          stage.status === "stale" && "ring-1 ring-amber-500/30",
          dragOver && "border-brand/70 ring-2 ring-brand/40",
          // Selection ring (2026-08-12 compound grouping) — the brand ring
          // wins over the status ring so the user sees WHAT they've picked.
          selected && "ring-2 ring-brand border-brand/60",
      )}
              >
      {/* Preview cell — THE FACE of the card (LAYOUT LAW above): flex-1
          min-h-0 so it owns all the height the caption strip doesn't
          claim; the slot-rendered media fills it edge to edge.
          aspect-square (SQUARE LAW above) makes the resting cell WIDTH×1 —
          a portrait artifact CROPS cover instead of stretching the row.
          min-h-28 stays purely as the collapse floor (an empty row never
          goes under ~112px).
          No input-slot strip on the TILE — the squares live ONLY in the
          expanded card (SlotGrid at the top of the detail). The
          whole-tile drop target still resolves to the first slot; the
          UpstreamBadge chip still shows a wired card's upstream. */}
      <div className="relative flex aspect-square min-h-28 w-full flex-col overflow-hidden bg-sidebar-accent/40">
        {Preview ? <Preview stage={stage} url={url} genre={genre} /> : null}
        {/* Selection check — compound grouping sub-view (2026-08-12). Only
            renders when the grid is in SELECTION MODE (triggered from the
            "Group Cards" action in the picker). NOT always visible — this
            is a MODE the user explicitly enters, not a permanent fixture.
            Anchored to the IMAGE (inside the cell), bottom-left. */}
        {onToggleSelect && (
          <Tip tip={selected ? "Remove from selection" : "Select to group"}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            aria-label={selected ? "Remove from selection" : "Select to group"}
            aria-pressed={selected ?? false}
            data-select-check={selected ? "on" : "off"}
            className={cn(
              "absolute bottom-1.5 left-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 backdrop-blur-sm transition-all",
              selected
                ? "border-brand bg-brand text-white shadow-md shadow-brand/40 scale-110"
                : "border-brand/50 bg-background/90 text-brand/40 hover:border-brand hover:text-brand/70",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          </Tip>
        )}
        {/* Upstream wire indicator — bottom-left of the IMAGE, shifted right
            when the selection check is present (always-visible grouping
            circle). Inside the cell so it rides the artifact corner. */}
        {upstreamTitle && (
          <span className={cn(
            "absolute bottom-1.5 z-10 flex items-center gap-0.5 rounded bg-background/80 px-1 py-0.5 text-[8px] font-medium text-brand/90 backdrop-blur-sm",
            onToggleSelect ? "left-9" : "left-1.5",
          )}>
            <Link2 className="h-2.5 w-2.5" />
            {upstreamTitle}
    </span>
      )}
        {/* Tile-level play / reroll (2026-08-07: "cards need to have a small
            play button on them, even when they are collapsed") — an ELEMENT
            SLOT claim: melite-core/tile-run owns the seed-visibility rule; an
            override plugin decides for itself. Click STOP-PROPAGATION lives
            inside the claim. Bottom-right of the IMAGE (inside the cell). */}
        {Run && <Run stage={stage} running={running} onRun={onRun} />}
        {/* Tile-level STOP (2026-08-13: "play button becomes stop button to
            cancel"). The play affordance is null while running
            (tilePlayAffordance), so this takes its corner for the run's
            duration — same absolute position, same stop-propagation (click
            cancels, never opens the detail). Calls the store's cancelRun:
            stop door per live runId + abort the in-flight poll. */}
        {running && onCancel && (
              <Tip tip="Cancel run">
              <button
                type="button"
            onClick={(e) => { e.stopPropagation(); onCancel() }}
            aria-label="Cancel run"
            data-tile-stop="cancel"
            className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-md shadow-destructive/30 transition-all hover:bg-destructive/85 hover:scale-105 active:scale-95"
              >
            <Square className="h-3 w-3 fill-current" />
        </button>
              </Tip>
      )}
      </div>
        {/* Status dot — top-left, color-coded. The agent-marker (Sparkles)
            rides this cluster so an agent-built card is scannable at a
            glance: "03 ✨" vs a plain "03". Rendered only when
            stage.provenance === "agent" (the user default is silent). */}
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 backdrop-blur-sm">
    <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            running ? "bg-brand animate-pulse" :
            stage.status === "done" ? "bg-emerald-500" :
            stage.status === "error" ? "bg-destructive" :
            stage.status === "stale" ? "bg-amber-500" :
            stage.status === "cached" ? "bg-sky-500" :
            "bg-muted-foreground/40",
          )} />
          <span className="text-[9px] font-bold tabular-nums text-foreground/80">{String(index + 1).padStart(2, "0")}</span>
          <ProvenanceBadge provenance={stage.provenance} compact />
    </span>
        {/* Save-to-assets toggle — top-right, hover only (2026-08-12).
            Save = the card's output lands in the left sidebar (the
            default). SaveOff = the output is hidden from the sidebar — it
            still persists on disk + renders on the card, but doesn't clog
            the library. (2026-08-16: Save/SaveOff icons — was Bookmark/
            BookmarkCheck; a save affordance should read as SAVE, not as a
            bookmark.) Click STOP-PROPAGATION so it never opens the inline
            detail. */}
        {onToggleSaveToAssets && (
          <Tip tip={stage.saveToAssets === false
              ? "Hidden from sidebar — click to show in library"
              : "Saved to library — click to hide from sidebar"}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSaveToAssets(stage.saveToAssets === false) }}
            aria-label={stage.saveToAssets === false ? "Show in library" : "Hide from library"}
            data-save-to-assets={stage.saveToAssets === false ? "off" : "on"}
            className={cn(
              "absolute right-7 top-1 flex h-5 w-5 items-center justify-center rounded bg-background/80 backdrop-blur-sm transition-all group-hover:opacity-100",
              stage.saveToAssets === false
                ? "opacity-60 text-muted-foreground hover:text-foreground"
                : "opacity-0 text-brand hover:text-brand/80",
            )}
          >
            {stage.saveToAssets === false
              ? <SaveOff className="h-3 w-3" />
              : <Save className="h-3 w-3" />}
          </button>
          </Tip>
        )}
        {/* Remove — top-right, hover only. */}
              <Tip tip="Remove card">
              <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label="Remove card"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-destructive hover:text-white group-hover:opacity-100"
              >
          <Trash2 className="h-3 w-3" />
              </button>
              </Tip>
        {/* Caption strip — the 3-line compact card (2026-08-09): Card Name /
            Model, Variant / output size. INSIDE the frame now (LAYOUT LAW
            above), shrink-0 at natural height — the preview cell takes
            everything above it. Line 3's size is DECLARED
            (familyCardSummary — the same card_summary block pydantic
            validates server-side): "WIDTH×HEIGHT" for generation families,
            a single resolution / scale for the Enhance / upscale families.
            The run duration (seconds) sits at the BOTTOM-RIGHT, IN LINE
            with this last line — never its own row. */}
      <div className="flex shrink-0 flex-col gap-0.5 border-t border-sidebar-border/40 p-1.5">
        {/* Line 1 — Card Name. */}
        <h3 className="truncate text-[11px] font-medium leading-tight text-foreground">{stage.title}</h3>
        {/* Line 2 — "Model, Variant" (the family LABEL, NOT the raw route key,
            + the variant descriptor) with the +N subcard badge at the right.
            Each axis contributes its label ONCE: variant from variantLabel,
            quant from routeCoordinates. */}
        {(() => {
          const model = familyLabel(stage.service)
          const sib = variantLabel(stage.service)
          const coords = routeCoordinates(stage.service)
          const vParts: string[] = []
          if (sib && sib !== stage.service) vParts.push(sib)
          if (coords?.quant) vParts.push(coords.quant.toUpperCase())
          const variant = vParts.join(" · ")
          const line2 = [model, variant].filter(Boolean).join(", ")
          const subs = subcardCount(stage.params)
          if (!line2 && subs === 0) return null
  return (
            <div className="flex items-center gap-1">
              {line2 && <span className="truncate text-[9px] leading-tight text-muted-foreground/80">{line2}</span>}
              {subs > 0 && (
                <Tip tip="Modifier subcards">
                <span className="ml-auto shrink-0 rounded bg-brand/10 px-1 py-px font-mono text-[8px] font-semibold text-brand/90" aria-label="Modifier subcards">
                  +{subs}
    </span>
                </Tip>
      )}
    </div>
  )
        })()}
        {/* Line 3 — output size (DECLARED, left) + run duration (right). The
            size is "WIDTH×HEIGHT" when the family declares width_param +
            height_param (every generation family), OR a single value when it
            declares size_param (the Enhance / upscale families — a target
            resolution "2048px" or a scale "4×"). The seconds sit IN LINE with
            this line, bottom-right — NOT their own row. Renders when either
            the size or the duration is present. */}
        {(() => {
          const summary = familyCardSummary(stage.service)
          const w = summary?.width_param ? stage.params?.[summary.width_param] : null
          const h = summary?.height_param ? stage.params?.[summary.height_param] : null
          const s = summary?.size_param ? stage.params?.[summary.size_param] : null
          const dims =
            w != null && h != null ? `${w}×${h}`
            : s != null ? `${s}${summary?.size_suffix ?? ""}`
            : null
          const dur = stage.result?.durationSec
          const durText = dur !== undefined ? `${dur.toFixed(1)}s` : null
          if (!dims && !durText) return null
  return (
            <div className="flex items-center gap-1">
              {dims && <span className="truncate font-mono text-[9px] leading-tight text-muted-foreground/60">{dims}</span>}
              {durText && <span className="ml-auto shrink-0 text-[9px] tabular-nums text-muted-foreground/60">{durText}</span>}
    </div>
  )
        })()}
        {/* Live WS activity line (2026-08-10) + per-card PROGRESS bar
            (2026-08-08) — the SAME shared pieces the zoomed detail renders
            (2026-08-14), so the tile and the drilldown read the live
            ComfyUI connection identically. See CardActivityLine /
            CardProgressBar below for the exact no-lie contracts. */}
        <_CardActivityLine stage={stage} running={running} />
        <_CardProgressBar stage={stage} running={running} />
        {/* Failure text (2026-08-10; full-text toggle 2026-08-15) — the
            run's error surfaced ON the card, never hidden in the console
            panel. Truncated by default (a tile stays a tile); ONE click
            expands the FULL message inline — the hover tip was the only
            full-text affordance and tooltips clip long ComfyUI stack
            traces ("(full error on the card)" must be true ON the card). */}
        <CardErrorLine stage={stage} />
    </div>
    </div>
    </div>
  )
}
