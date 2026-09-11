// flowCardBadges — the condensed chain tile + the small status/service/
// upstream chips, moved VERBATIM from FlowCard.tsx (Cut 2, C8):
// ChainCardTile condenses N consecutive same-family cards into one block
// (CHAIN_MAX_CHIPS chip cap); StatusChip/ServiceBadge/UpstreamBadge are
// the one-glance signal chips (running spinner / genre icon / input-wire
// provenance). CardTile is imported from its home module (flowCardTile
// after Cut 2 completes) — NEVER through the aggregator shim.
import { Loader2, ArrowRight, Image as ImageIcon, Box, Film, Activity, Music, FileText, Sparkles, Wand2, Ungroup, Shapes, type LucideIcon } from "lucide-react"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { familyGenre, familyLabel } from "@melite/catalog"
import type { CardGenre } from "@melite/contracts"
import { aggregateStatus } from "./subgraph"
import { useState } from "react"
import { MissingArtifactCell } from "./cardElements"
import { segmentId, type ChainSegment, type ProjectableStage } from "./multiEditGroup"
import type { CardStage } from "@melite/contracts"
import { kindDef } from "@melite/slots"
import { useCardKindsVersion } from "./pluginKinds"

const CHAIN_MAX_CHIPS = 4

/** THE condensed chain tile — one visual block for N consecutive
 * same-family cards (qwen-img-edit-2511 pass, upscale pass). Face: cover thumbnail
 * (first completed output) + aggregate status dot + index range ("03–09") +
 * "×N" badge; body = first member's title, the family label, and the
 * per-angle chip row (each member's title — "Back", "Left", … — truncated,
 * +N more). No remove button (removing 7 cards in one click is a footgun —
 * removal is per-member inside the overlay), no play affordance (group-run
 * semantics live on the members). */
export function ChainCardTile({
  seg, indexStart, indexEnd, onOpen, onUngroup,
}: {
  seg: ChainSegment<ProjectableStage>
  indexStart: number
  indexEnd: number
  onOpen: () => void
  /** Dissolve this compound parent (2026-08-12). Only wired when ``seg.parent``
   *  is present (a first-class compound stage); legacy view-projected runs
   *  never carry this callback. */
  onUngroup?: () => void
}) {
  const stages = seg.stages
  const n = stages.length
  const first = stages[0]
  // The ONE aggregate reducer (subgraph.ts) — replaces the inline
  // anyRunning/doneCount/allDone/cover logic that ChainCardTile used to
  // carry. Same outputs, one source of truth shared with every other
  // compound/subgraph consumer.
  const agg = aggregateStatus(stages)
  const { anyRunning, anyError, anyStale, allDone, doneCount, coverUrl: cover } = agg
  // Pruned-run state (2026-09-05): a dead cover URL swaps to the missing
  // cell at onError — a bare <img> would render alt text as content.
  // Compared by url so a new cover (re-run) renders without a reset.
  const [deadCover, setDeadCover] = useState<string | null>(null)
  const pad = (i: number) => String(i + 1).padStart(2, "0")
  const idxText = `${pad(indexStart)}–${pad(indexEnd)}`
  const label = familyLabel(first.service)

  return (
    <div
      data-chain-tile={segmentId(seg)}
      data-subgraph-tile={segmentId(seg)}
      data-subgraph-mode={seg.mode ?? "fanout"}
      onClick={onOpen}
      className="group relative flex h-full w-full cursor-pointer flex-col"
    >
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card transition-all",
          "border-sidebar-border/60 hover:border-brand/50 hover:shadow-md hover:shadow-brand/10",
          anyError ? "ring-1 ring-destructive/40"
            : anyStale ? "ring-1 ring-amber-500/30"
            : allDone ? "ring-1 ring-emerald-500/30"
            : undefined,
        )}
      >
        {/* Cover / placeholder — dense aspect-square, same shape as CardTile
            (SQUARE LAW, 2026-08-23 — the chain tile rides the row next to
            plain tiles, so its cover ratio must match theirs). */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-sidebar-accent/40">
          {cover && deadCover !== cover ? (
            <img
              src={cover}
              alt={first.title}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setDeadCover(cover)}
            />
          ) : cover ? (
            <MissingArtifactCell label={first.title} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/25">
              <Wand2 className="h-7 w-7" />
            </div>
          )}
          {/* Aggregate status dot + index range (the 7 tiles' positions). */}
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 backdrop-blur-sm">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              anyRunning ? "bg-brand animate-pulse"
                : anyError ? "bg-destructive"
                : anyStale ? "bg-amber-500"
                : allDone ? "bg-emerald-500"
                : "bg-muted-foreground/40",
            )} />
            <span className="text-[9px] font-bold tabular-nums text-foreground/80">{idxText}</span>
          </span>
          {/* Count badge — always visible (no remove button here). */}
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded bg-background/80 px-1 font-mono text-[9px] font-semibold text-brand backdrop-blur-sm">
            ×{n}
          </span>
          {/* Ungroup — dissolves the compound parent (2026-08-12). Renders
              ONLY for first-class compound segments (seg.parent present) —
              legacy view-projected runs can't be ungrouped (nothing to
              dissolve). Hover-revealed, sits just below the count badge;
              STOP-PROPAGATION so it never opens the chain overlay. */}
          {onUngroup && (
            <Tip tip="Ungroup — split back into individual cards">
            <button
              onClick={(e) => { e.stopPropagation(); onUngroup() }}
              aria-label="Ungroup"
              data-ungroup={segmentId(seg)}
              className="absolute right-1.5 top-8 z-10 flex h-5 w-5 items-center justify-center rounded bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-destructive hover:text-white group-hover:opacity-100"
            >
              <Ungroup className="h-3 w-3" />
            </button>
            </Tip>
          )}
          {/* "+N more" over the cover when only some members have results. */}
          {doneCount > 0 && doneCount < n && (
            <span className="absolute bottom-1 right-1.5 rounded bg-background/80 px-1 py-0.5 text-[8px] font-medium text-muted-foreground backdrop-blur-sm">
              +{n - doneCount} to run
            </span>
          )}
        </div>
        {/* Body — the condensed readout. */}
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-1.5">
          <h3 className="truncate text-[11px] font-medium leading-tight text-foreground">{first.title}</h3>
          <span className="truncate text-[9px] leading-tight text-muted-foreground/80">{label}</span>
          {/* The angle chips — the N sub-edit titles at a glance. */}
          <div className="flex flex-wrap items-center gap-0.5 overflow-hidden">
            {stages.slice(0, CHAIN_MAX_CHIPS).map((s) => (
              <Tip tip={s.title}>
              <span
                key={s.id}
                className="max-w-[64px] truncate rounded bg-sidebar-accent/70 px-1 py-px text-[8px] leading-tight text-muted-foreground/80"
              >
                {s.title}
              </span>
              </Tip>
            ))}
            {n > CHAIN_MAX_CHIPS && (
              <span className="shrink-0 rounded bg-brand/10 px-1 py-px font-mono text-[8px] font-semibold text-brand/90">
                +{n - CHAIN_MAX_CHIPS}
              </span>
            )}
          </div>
          {/* Progress readout — how many of the N edits have run. */}
          {doneCount > 0 && (
            <div className="mt-auto flex items-center gap-1">
              <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/60">
                {doneCount}/{n}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function StatusChip({ running }: { running: boolean }) {
  if (running) {
    // Running = the EXISTING header icon, just spinning (2026-08-08: "we
    // already have an icon in the top right that can just spin"). No text
    // pill, no spinner button — the icon spins, that's the signal.
  return (
      <Loader2
        aria-label="Running"
        className="h-3.5 w-3.5 animate-spin text-brand"
        />
  )
}
// NO status text, period (2026-08-09: "I DON'T NEED THIS stuff ") — the
  // output image IS done, the error banner IS failed, the re-run button
  // label carries stale, and a card with no output is pending. The tile's
  // color-coded status dot is the quiet at-a-glance signal; text pills
  // narrating what the eye can already see are gone.
  return null
}

export function ServiceBadge({ service, genre, kind }: { service: string; genre?: CardGenre; kind: string }) {
  // Kinds lane: subscribe so a mid-session flip re-renders the tone.
  useCardKindsVersion()
  // Genre-driven icon — the family YAML declares `genre:` (image|video|
  // audio|3d|motion), the catalog passthrough emits it verbatim. The
  // surface adapters resolve it from the model route; model-route service
  // strings resolve here as a fallback; unknown services → Sparkles.
  // No engine-name substring classifiers.
          //
  // ICON-ONLY (2026-08-10): the raw service route key (e.g. "krea-2") is
  // an implementation detail the user shouldn't see at the top of the
  // detail — the card TITLE is the prominent label now (the header carries
  // it next to this icon chip). The genre icon stays: it's the one-glance
  // media-type signal (image / video / audio / 3d / motion).
  const byGenre: Record<CardGenre, LucideIcon> = {
    image: ImageIcon,
    video: Film,
    "3d": Box,
    motion: Activity,
    audio: Music,
    other: Shapes,
    text: FileText,
}
  const resolved = genre ?? familyGenre(service)
  const Icon = resolved ? byGenre[resolved] : Sparkles
  return (
    <span className={cn(
      "flex items-center justify-center rounded-md px-1.5 py-0.5",
      kindDef(kind).badgeTone === "brand" ? "bg-brand/15 text-brand" : "bg-sidebar-accent/60 text-muted-foreground",
    )}>
      <Icon className="h-3 w-3" />
    </span>
  )
}

/**
 * A small "← from 01" badge showing which upstream stages feed this card.
 * Rendered when stage.inputIndices is non-empty — makes the data-wiring
 * visible (the user can see that stage 02's input_image comes from stage
 * 01's output). Indices are precomputed by the surface's adapter.
 */
export function UpstreamBadge({ stage }: { stage: CardStage }) {
  const indices = stage.inputIndices
  if (indices.length === 0) return null
  return (
              <Tip tip={`Auto-wires output from stage${indices.length > 1 ? "s" : ""} ${indices.map((i) => String(i + 1).padStart(2, "0")).join(", ")} as input_image`}>
              <span
      aria-label={`Auto-wires output from stage${indices.length > 1 ? "s" : ""} ${indices.map((i) => String(i + 1).padStart(2, "0")).join(", ")} as input_image`}
      className="flex items-center gap-1 rounded-full border border-brand/30 bg-brand/8 px-1.5 py-0.5 text-[9px] font-medium text-brand/90"
              >
      <ArrowRight className="h-2.5 w-2.5 rotate-180" />
      from {indices.map((i) => String(i + 1).padStart(2, "0")).join(",")}
    </span>
    </Tip>
  )
}
