// WirePickerModal — the shared "link to a previous output" picker (2026-08-10).
//
// Extracted from SlotGrid so the Mask Studio's input_image source picker (and
// any future bespoke editor that owns its own slot surface) reuses the EXACT
// wire UX the card-detail SlotGrid renders: prior stages by ARRAY INDEX, named
// outputs expanded per-row, "not run yet" for un-run upstreams. One wire
// surface, every input — the same policy that produced SlotSquare.
//
// The picker is PRESENTATIONAL: it knows nothing about the store. Callers
// own the write contract (onPick → setSlotInput + clear the slot param;
// onUnwire → setSlotInput null + clear). The mutual-exclusion (wire vs
// manual-attach) is enforced by the caller.
import { Link2, X } from "lucide-react"
import type { CardStage } from "@melite/contracts"
import { isImageUrl } from "./SlotSquare"
import { cn } from "./utils"

export interface WirePickerModalProps {
 /** Slot key being wired (display only — "Wire {slot} from …"). */
 slot: string
 /** Prior stages by ARRAY INDEX (the caller already filtered forward of the
 * current stage — F4: wires only point backwards). */
 priorStages: CardStage[]
 /** Currently-wired upstream id (undefined = nothing wired). */
 currentId?: string
 /** Currently-selected named output (null = primary assetUrls[0]). */
 currentOutput?: string | null
 /** Pick an upstream (+ optional named output). The caller writes the wire
 * AND clears the slot param (mutual-exclusion). */
 onPick: (upstreamId: string, outputName?: string | null) => void
 /** Unwire — the slot returns to manual-attach / empty. */
 onUnwire: () => void
 onClose: () => void
}

/** The wire picker — prior stages by ARRAY INDEX, including ones that
 * haven't run yet ("not run yet" — wire BEFORE the upstream runs).
 *
 * Named outputs: when an upstream stage produced >1 named artifact
 * (input_prep → media + mask), it expands into ONE ROW PER output so the
 * user can wire mask → lanpaint_mask specifically. Upstreams with 0–1
 * named artifacts render as a single row (legacy — primary via
 * assetUrls[0]). The output name rides onPick → setSlotInput →
 * inputOutputs → collectUpstreamResults. */
export function WirePickerModal({
 slot,
 priorStages,
 currentId,
 currentOutput,
 onPick,
 onUnwire,
 onClose,
}: WirePickerModalProps) {
 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
 onClick={onClose}
 data-wire-modal
 >
 <div
 className="max-h-[60vh] w-full max-w-md overflow-y-auto rounded-lg border border-sidebar-border/60 bg-sidebar shadow-xl"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center gap-2 border-b px-3 py-2">
 <Link2 className="h-3.5 w-3.5 text-brand/70" />
 <span className="text-xs font-semibold text-foreground">
 Wire {slot} from an earlier card
 </span>
 <button
 type="button"
 onClick={onClose}
 className="ml-auto rounded text-muted-foreground hover:text-foreground"
 aria-label="Close wire picker"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 {currentId && (
 <button
 type="button"
 onClick={onUnwire}
 data-wire-unwire
 className="flex w-full items-center gap-2 border-b border-sidebar-border/40 px-3 py-2 text-left text-[11px] text-destructive hover:bg-sidebar-accent/40"
 >
 Unwire — this slot will ask for a file or wire again
 </button>
 )}
 <ul className="divide-y divide-sidebar-border/40">
 {priorStages.length === 0 && (
 <li className="px-3 py-3 text-[11px] text-muted-foreground/60">
 No earlier cards yet — add a card before this one to wire from it.
 </li>
 )}
 {priorStages.map((u, i) => {
 // Named artifacts the upstream produced (media, mask, …). When
 // >1, expand into per-output rows; else a single primary row.
 const named = u.result?.artifacts ?? {}
 const namedEntries = Object.entries(named)
 const multi = namedEntries.length > 1
 const rows: Array<{ outputName: string | null; thumb?: string; label: string }> = multi
 ? namedEntries.map(([name, url]) => ({ outputName: name, thumb: url, label: name }))
 : [{ outputName: null, thumb: u.result?.assetUrls[0], label: "primary" }]
 return rows.map((row, ri) => {
 const selected = u.id === currentId && (currentOutput ?? null) === (row.outputName ?? null)
 return (
 <li key={u.id + (ri > 0 ? `:${row.outputName}` : "")}>
 <button
 type="button"
 onClick={() => onPick(u.id, row.outputName)}
 data-wire-option={row.outputName ?? "primary"}
 className={cn(
 "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-sidebar-accent/40",
 selected && "bg-brand/8",
 )}
 >
 <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/60 text-[9px] font-bold tabular-nums text-muted-foreground">
 {String(i + 1).padStart(2, "0")}
 </span>
 {row.thumb && isImageUrl(row.thumb) ? (
 <img src={row.thumb} alt="" className="h-8 w-8 rounded border border-sidebar-border/60 object-cover" />
 ) : (
 <div className="flex h-8 w-8 items-center justify-center rounded border border-sidebar-border/60 bg-sidebar-accent/40">
 <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
 </div>
 )}
 <div className="min-w-0 flex-1">
 <div className="truncate text-[11px] font-medium text-foreground">
 {u.title}
 {multi && <span className="ml-1 font-mono text-[9px] text-brand/80">· {row.label}</span>}
 </div>
 <div className="truncate font-mono text-[9px] text-muted-foreground/60">
 {u.result ? (row.thumb ?? "no artifacts") : "not run yet"}
 </div>
 </div>
 {selected && (
 <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand">
 wired
 </span>
 )}
 </button>
 </li>
 )
 })
 })}
 </ul>
 </div>
 </div>
 )
}
