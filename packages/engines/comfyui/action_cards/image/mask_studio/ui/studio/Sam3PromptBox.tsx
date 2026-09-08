// Sam3PromptBox — the Text (SAM3) prompt box. Pure move from
// component.tsx (props shape unchanged).
import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Input, VerbChip } from "@melite/ui"
import { Tip } from "@melite/ui/tip"

/** The Text (SAM3) prompt box. Rendered when Text is the SOURCE — or when
 * a non-empty sam3_prompt is RIDING ALONG beside a Person/Box run (the
 * brick runs both; the box says so and stays editable). The prompt is a
 * LOCAL DRAFT until Segment — same one-gesture contract as Segm/Bbox
 * (per-keystroke writes would re-hash paint_mask through _recomputeKeys
 * on every letter; the run persists ONCE). */
export function Sam3PromptBox({
  params, onSegment, hasInput, detecting, rideAlong,
}: {
  params: Record<string, unknown>
  onSegment: (prompt: string) => void
  hasInput: boolean
  detecting: boolean
  /** True when Text is NOT the source but a prompt is set — the header
  * says "also running" and the box never steals focus. */
  rideAlong: boolean
}) {
  const [draft, setDraft] = useState((params.sam3_prompt as string) ?? "")
  // Re-sync from the card when the prompt changes externally (revive, an
  // agent write) — but not on every render.
  useEffect(() => {
  setDraft((params.sam3_prompt as string) ?? "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sam3_prompt])
  const canRun = hasInput && draft.trim().length > 0
  return (
  <section className="border-b border-white/[0.07] px-0.5 py-2">
  <div className="flex items-center justify-between">
  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  <Sparkles className="h-3 w-3 text-violet-400" /> Text mask
  {rideAlong && (
  <span className="ml-1 rounded bg-violet-400/15 px-1 py-px text-[8px] font-medium normal-case tracking-normal text-violet-300">
  also running
  </span>
  )}
  </span>
  {detecting && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
  </div>
  <Input
  type="text" data-sam3-input
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter" && canRun) onSegment(draft) }}
  placeholder="What to mask — e.g. shirt, jeans, hat"
  disabled={!hasInput}
  // Focus the box the moment Text becomes the source (empty draft) —
  // the picker click is the intent to type. A ride-along box (Text not
  // the source, prompt already set) never steals focus.
  autoFocus={!rideAlong && draft === ""}
  className="h-auto w-full rounded border border-border/50 bg-background px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-violet-400/60 disabled:opacity-50"
  />
  <Tip tip={!hasInput
  ? "Add an image first"
  : draft.trim() ? "Segment by text prompt (scoped to the selection when one is committed)" : "Type what to mask"}>
  {/* ONE VERB UX (stroke 5): the Segment gesture rides the shared
   * VerbChip (wide violet shape, the ride-along tone); the prompt
   * box keeps its draft + Enter wiring — the chip owns bones only. */}
  <VerbChip
  wide tone="violet"
  data-sam3-run
  onClick={() => canRun && onSegment(draft)}
  disabled={!canRun}
  label="Segment"
  />
  </Tip>
  <p className="text-[9px] leading-relaxed text-muted-foreground/60">
  Open-vocabulary segmentation — exports as its own mask (and as the
  Combined mask when Person/Box are off).
  </p>
  </section>
  )
}
