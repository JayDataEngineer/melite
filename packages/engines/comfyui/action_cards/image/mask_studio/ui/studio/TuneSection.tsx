// TuneSection — the rail's TUNE expander (numeric knobs + scope mirror).
//
// Extracted from MaskSourceControls (the 2870-line monolith split) so the
// rail file stays under ~400 lines. The extraction is behavior-neutral:
// tuneOpen + the numeric draft + its resync effect moved WITH the JSX that
// reads them (the section is always mounted, never keyed — state lifetime
// is identical to when it lived in the parent).
import { useEffect, useState } from "react"
import { ChevronDown, Focus, X } from "lucide-react"
import { NumberField } from "@melite/ui/NumberField"
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
import type { MaskSource } from "./constants"

export function TuneSection({
  params, source, scopeLabel, hasScope, onChange, onClearScope,
}: {
  params: Record<string, unknown>
  source: MaskSource
  /** "Full image" | "Sel W×H" | "Scoped (card)" — the marquee mirror. */
  scopeLabel: string
  hasScope: boolean
  onChange: (key: string, value: unknown) => void
  onClearScope: () => void
}) {
  const isDetect = source === "person" || source === "box"
  // TUNE (2026-08-16 diet — "I want to throw up when I see that left
  // sidebar"): the numeric knobs live behind ONE expander, CLOSED by
  // default. The rail leads with what the user actually picks — source,
  // classes — not set-once thresholds. Always MOUNTED (hidden, not
  // unmounted) so the scope state stays in the DOM.
  const [tuneOpen, setTuneOpen] = useState(false)
  // Local draft for the numeric scrub params. Dragging a NumberField fires
  // onChange on every pointer step — if that wrote straight to the card,
  // updateStageParams → _recomputeKeys would hash paint_mask (a multi-MB
  // data URL) 60×/sec and freeze the editor (the "stuck on detect" lag,
  // 2026-08-10). The draft absorbs the burst; onCommit (drag release /
  // Enter) is the ONE persist. Source/class taps are click, not scrub —
  // they write immediately (one recompute per click is fine).
  const [draft, setDraft] = useState({
  detection_threshold: (params.detection_threshold as number) ?? 0.35,
  sam_threshold: (params.sam_threshold as number) ?? 0.93,
  sam_dilation: (params.sam_dilation as number) ?? 0,
  })
  // Re-sync from the card when the params change externally (agent write,
  // revive, a different card opened) — but NOT on every render, only when
  // the backing value actually moves.
  useEffect(() => {
  setDraft({
  detection_threshold: (params.detection_threshold as number) ?? 0.35,
  sam_threshold: (params.sam_threshold as number) ?? 0.93,
  sam_dilation: (params.sam_dilation as number) ?? 0,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.detection_threshold, params.sam_threshold, params.sam_dilation])
  return (
  <section className="border-b border-white/[0.07] px-0.5 py-1.5" data-tune-section>
  <Button variant="ghost"
  type="button" data-tune-toggle
  onClick={() => setTuneOpen((v) => !v)}
  aria-expanded={tuneOpen}
  className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
  >
  Tune
  <ChevronDown className={cn("h-3 w-3 transition-transform", !tuneOpen && "-rotate-90")} />
  </Button>
  <div className={cn("space-y-2 pt-1.5", !tuneOpen && "hidden")}>
  {/* SHARED — the two knobs more than one producer reads. Threshold is
  * literally ONE param feeding YOLO and SAM3 (the brick reuses it);
  * Scope is the marquee's always-visible answer. */}
  <div>
  <div className="flex items-center justify-between pb-1">
  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  Shared
  </span>
  <span className="text-[9px] text-muted-foreground/50">person + text</span>
  </div>
  <NumberField label="Threshold" tooltip="Detection confidence — YOLO (Person/Box) and SAM3 (Text)"
  value={draft.detection_threshold}
  onChange={(v) => setDraft((d) => ({ ...d, detection_threshold: v }))}
  onCommit={(v) => onChange("detection_threshold", v)}
  min={0.05} max={0.95} step={0.05} />
  <Tip tip="The marquee (R tool) scopes every producer — Person/Box crop to it, Text constrains to it. Clearing it returns to the full image.">
  <div
  data-scope-chip
  className="mt-1.5 flex items-center justify-between rounded border border-border/40 bg-sidebar/20 px-1.5 py-1"
  >
  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
  <Focus className="h-3 w-3" /> Scope
  </span>
  <span className="flex items-center gap-1">
  <span className="text-[10px] tabular-nums text-foreground/80">{scopeLabel}</span>
  {hasScope && (
  <Button variant="ghost"
  type="button" data-clear-scope onClick={onClearScope} aria-label="Clear scope"
  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
  >
  <X className="h-3 w-3" />
  </Button>
  )}
  </span>
  </div>
  </Tip>
  </div>

  {/* REFINE — Person/Box only, and only the knobs the mode actually
  * reads: Box skips SAM (no refine field — dilation grows the
  * rectangles instead), Person gets both. */}
  {isDetect && (
  <div>
  <div className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  Refine
  </div>
  {source === "person" ? (
  <div className="grid grid-cols-2 gap-1.5">
  <NumberField label="SAM refine" tooltip="SAM mask refinement threshold — tighter masks"
  value={draft.sam_threshold}
  onChange={(v) => setDraft((d) => ({ ...d, sam_threshold: v }))}
  onCommit={(v) => onChange("sam_threshold", v)}
  min={0.5} max={0.99} step={0.01} />
  <NumberField label="Dilation" tooltip="Dilate the mask by N px"
  value={draft.sam_dilation}
  onChange={(v) => setDraft((d) => ({ ...d, sam_dilation: v }))}
  onCommit={(v) => onChange("sam_dilation", v)}
  min={0} max={50} step={1} />
  </div>
  ) : (
  <div className="space-y-1">
  <NumberField label="Dilation" tooltip="Grow each rectangle by N px"
  value={draft.sam_dilation}
  onChange={(v) => setDraft((d) => ({ ...d, sam_dilation: v }))}
  onCommit={(v) => onChange("sam_dilation", v)}
  min={0} max={50} step={1} />
  <p className="text-[9px] leading-relaxed text-muted-foreground/60">
  Box mode skips SAM refinement — switch to Person for traced masks.
  </p>
  </div>
  )}
  </div>
  )}
  </div>
  </section>
  )
}
