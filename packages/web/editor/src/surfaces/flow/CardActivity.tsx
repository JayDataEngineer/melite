/**
 * CardActivity — the shared LIVE-feedback pieces every card surface
 * renders: the WS activity line + the KSampler progress bar (2026-08-15
 * extraction from FlowCard.tsx).
 *
 * WHY A MODULE: three surfaces now render these — the compact tile, the
 * zoomed detail (both inside FlowCard.tsx), and the CardStudio rail
 * (the studio's own live ComfyUI feedback, 2026-08-15). Extracting breaks
 * what would otherwise be a VALUE cycle: FlowCard renders CardStudio,
 * so CardStudio cannot value-import from FlowCard — a type-only
 * import (CardStage, erased at runtime) is fine, functions are not.
 *
 * THE NO-LIE CONTRACTS (unchanged from their FlowCard originals):
 *   • CardActivityLine renders ONLY while running AND a real activity
 *     frame is stamped — never a fake status.
 *   • CardProgressBar renders ONLY on a real {value, max} frame from
 *     ComfyUI's /ws — no shimmer, no spinner.
 */
import type { CardStage } from "@melite/contracts"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"

/** The activity-line label matrix (2026-08-10) — ONE label per consumed
 * ComfyUI frame, streamed through the backend's protocol sink: model loads
 * ("loading CheckpointLoaderSimple"), sampling ("sampling 5/20"), output,
 * waiting, errors. Shared by the tile and the zoomed detail so both read
 * the SAME live line (2026-08-14): error → message only, sampling →
 * value/max, node_class → "phase class", else "phase: message", else bare
 * phase. Exported for the unit tests to pin the matrix independently of
 * DOM. */
export function cardActivityLabel(a: CardStage["activity"]): string {
  if (!a) return ""
  if (a.phase === "error") return a.message ?? "error"
  if (a.phase === "sampling") return `sampling ${a.value ?? ""}/${a.max ?? ""}`
  if (a.node_class) return `${a.phase} ${a.node_class}`
  if (a.message) return `${a.phase}: ${a.message}`
  return a.phase
}

/** Live WS activity line (2026-08-10) — ONE line per consumed ComfyUI
 * frame: model loads ("loading CheckpointLoaderSimple"), sampling
 * ("sampling 5/20"), output, waiting, errors. THE SAME component renders on
 * the compact tile, the zoomed detail AND the CardStudio rail (2026-08-15)
 * so the surfaces can never drift. Renders only while running AND activity
 * is stamped — never a fake status. Error phases show the ComfyUI message
 * (red); everything else reads the cardActivityLabel matrix in brand. */
export function CardActivityLine({ stage, running }: { stage: CardStage; running: boolean }) {
  if (!running || !stage.activity) return null
  const a = stage.activity
  const label = cardActivityLabel(a)
  return (
    <Tip tip={typeof a.message === "string" ? a.message : undefined}>
    <div
      data-card-activity={stage.id}
      className={cn(
        "truncate font-mono text-[8px] leading-tight",
        a.phase === "error" ? "text-destructive" : "text-brand/80",
      )}
    >
      {label}
    </div>
    </Tip>
  )
}

/** Per-card PROGRESS bar (2026-08-08). The bar exists ONLY to show real
 * ComfyUI KSampler step progress — never a fake animation. It renders
 * exclusively when stage.progress carries a real {value, max} frame
 * streamed from ComfyUI's /ws. No progress data = no bar (NOT a shimmer or
 * spinner — those lie about what's happening). THE SAME bar renders on the
 * compact tile, the zoomed detail AND the CardStudio rail (2026-08-15).
 * Fills proportionally with a `step value/max` + `%` readout. */
export function CardProgressBar({ stage, running }: { stage: CardStage; running: boolean }) {
  if (!running || !stage.progress || typeof stage.progress.max !== "number" || stage.progress.max <= 0) return null
  const pct = Math.min(
    100,
    Math.max(0, Math.round((stage.progress.value / stage.progress.max) * 100)),
  )
  return (
    <div className="mt-0.5" data-card-progress={stage.id}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-sidebar-accent/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-0.5 flex items-center justify-between font-mono text-[8px] tabular-nums text-muted-foreground/70">
        <span>step {Math.round(stage.progress.value)}/{Math.round(stage.progress.max)}</span>
        <span>{pct}%</span>
      </div>
    </div>
  )
}
