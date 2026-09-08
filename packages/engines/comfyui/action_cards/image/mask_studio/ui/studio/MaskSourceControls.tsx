// MaskSourceControls — THE RAIL (the whole mask param surface in source
// order). Pure move from component.tsx (props shape unchanged) EXCEPT the
// TUNE expander, which lives in TuneSection.tsx (same JSX + its tuneOpen /
// numeric-draft state, always mounted — identical lifetime).
import { BoxSelect, Brush, Expand, Loader2, Play, Plus, Sparkles } from "lucide-react"
import { Input } from "@melite/ui"
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
import { DETECT_CLASSES } from "./constants"
import type { BoxEntry, DetectClass, MaskSource } from "./constants"
import { ClassChip } from "./ClassChip"
import { Sam3PromptBox } from "./Sam3PromptBox"
import { TuneSection } from "./TuneSection"

// ── The source rail (2026-08-16 — one column, top to bottom: SOURCE →
// CLASSES → SHARED → REFINE → TEXT). Replaces the old DetectControls +
// Sam3Controls pair (two boxes that each showed params the other producer
// ignored). Every section is CONDITIONAL on the armed source, so no knob
// is ever visible while it does nothing — the "things are all over the
// place" complaint, resolved by ownership instead of density.

/** THE RAIL — the whole mask param surface in source order. */
export function MaskSourceControls({
  params, source, detectMode, exportFace, exportHands, exportBody,
  sam3Active, scopeLabel, hasScope, detecting, hasInput,
  boxes, bboxCount, instancesSelected, selectedAll, hasPaint,
  typeDraft, draftPrompt, stageGeometry,
  onBboxCount, onBboxRun, onInstancePick, onStageType,
  onPromptDraft, onGeometry, onAdd, onSegment, onPlay,
  onChange, onClearScope,
}: {
  params: Record<string, unknown>
  source: MaskSource
  detectMode: string
  exportFace: boolean
  exportHands: boolean
  exportBody: boolean
  /** A non-empty sam3_prompt — Text rides along even under Person/Box. */
  sam3Active: boolean
  /** "Full image" | "Sel W×H" | "Scoped (card)" — the marquee mirror. */
  scopeLabel: string
  hasScope: boolean
  detecting: boolean
  hasInput: boolean
  /** STAGE 1: the detect_boxes manifest (null = not run yet). */
  boxes: BoxEntry[] | null
  /** STAGE 1: the BEFORE-the-run count (0 = all). */
  bboxCount: number
  /** STAGE 1: which manifest instances the current filter keeps. */
  instancesSelected: Set<number>
  selectedAll: boolean
  /** STAGE 2's paint gate — a painting exists on the canvas. */
  hasPaint: boolean
  /** STAGE 2/3: the open type draft ("face"|"hands"|"body"|"text"|"paint"|null). */
  typeDraft: "face" | "hands" | "body" | "text" | "paint" | null
  draftPrompt: string
  stageGeometry: "segm" | "bbox"
  onBboxCount: (n: number) => void
  onBboxRun: () => void
  onInstancePick: (keep: Set<number>) => void
  onStageType: (t: "face" | "hands" | "body" | "text" | "paint") => void
  onPromptDraft: (v: string) => void
  onGeometry: (m: "segm" | "bbox") => void
  /** STAGE 3's ADD — commits the selection as a card under the canvas. */
  onAdd: () => void
  /** The ride-along SAM3 box's Segment gesture (committed prompts). */
  onSegment: (prompt: string) => void
  /** PLAY at the very bottom left — the rail's own run ("THEN AT THE
  * VERY BOTTOM LEFT, THERE IS PLAY"). Optional: display-only mounts
  * (tests) disable the button. */
  onPlay: (() => void) | undefined
  onChange: (key: string, value: unknown) => void
  onClearScope: () => void
}) {
  const classOn: Record<DetectClass, boolean> = {
  face: exportFace, hands: exportHands, body: exportBody,
  }
  return (
  <div className="flex max-h-full w-60 shrink-0 flex-col overflow-y-auto pb-1" data-mask-source-rail>

  {/* ═══ STAGE 1 — BBOX (the owner's design, 2026-08-16, verbatim):
   * "FIRST STAGE IS BBOXX. I CAN SELECT THE NUMBER BEFOREHAND. NOT
   * AFTER. BEFOREHAND. THERE IS A LITTLE PLAY BUTTON FOR THIS STAGE AS
   * WELL, SO IF I WANT, I CAN RUN BBOXX ISOLATED."
   * The count is chosen BEFORE the run (a stepper: how many subjects to
   * keep — instance_filter "0..n-1"); the play runs BBox ISOLATED (detect
   * on, boxes ON, no other exports). After a manifest lands, the found
   * instances are CLICKABLE here — tap BBox 1/2/3 to keep exactly that
   * one. OPTIONAL: with no count and no manifest, stage 2 runs full. */}
  <section className="border-b border-white/[0.07] px-0.5 py-2" data-stage-bbox>
  <div className="flex items-center justify-between pb-1.5">
  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  <BoxSelect className="h-3 w-3" /> BBox
  </span>
  {detecting && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
  </div>
  {!boxes ? (
  <>
  <div className="flex items-center gap-1.5">
  <Tip tip="How many subjects to keep — set BEFORE the run. 0 = all.">
  <div className="flex items-center overflow-hidden rounded border border-border/50" data-bbox-count>
  <Button variant="ghost"
  type="button" data-bbox-dec aria-label="Fewer boxes"
  onClick={() => onBboxCount(Math.max(0, bboxCount - 1))}
  className="px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-sidebar/60 hover:text-foreground"
  >−</Button>
  <span className="min-w-[2ch] text-center text-[11px] font-semibold tabular-nums text-foreground">
  {bboxCount === 0 ? "all" : bboxCount}
  </span>
  <Button variant="ghost"
  type="button" data-bbox-inc aria-label="More boxes"
  onClick={() => onBboxCount(Math.min(12, bboxCount + 1))}
  className="px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-sidebar/60 hover:text-foreground"
  >+</Button>
  </div>
  </Tip>
  <Tip tip="Run BBox ISOLATED — find the boxes now; no masks yet">
  <Button variant="ghost"
  type="button" data-bbox-run
  onClick={onBboxRun}
  disabled={!hasInput}
  className="ml-auto flex items-center gap-1 rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
  >
  <Play className="h-2.5 w-2.5" /> Find boxes
  </Button>
  </Tip>
  </div>
  <p className="pt-1.5 text-[9px] leading-relaxed text-muted-foreground/60">
  Stage 1 — find the subjects first (optional). The count caps how
  many BBoxes the next stages use.
  </p>
  </>
  ) : (
  <>
  <div className="flex flex-wrap gap-1">
  <Button variant="ghost"
  type="button" data-bbox-all
  onClick={() => onInstancePick(new Set())}
  className={cn(
  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium transition-colors",
  selectedAll
  ? "border-brand/60 bg-brand/15 text-brand"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/60",
  )}
  >
  <Expand className="h-2.5 w-2.5" /> All {boxes.length}
  </Button>
  {boxes.map((b) => (
  <Tip key={b.index} tip={`Keep exactly BBox ${b.index + 1} (${b.class}) — one tap`}>
  <Button variant="ghost"
  type="button" data-bbox-pick={b.index}
  onClick={() => onInstancePick(new Set([b.index]))}
  className={cn(
  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium transition-colors",
  instancesSelected.has(b.index)
  ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/60",
  )}
  >
  <BoxSelect className="h-2.5 w-2.5" /> {b.index + 1}
  </Button>
  </Tip>
  ))}
  </div>
  <p className="pt-1.5 text-[9px] leading-relaxed text-muted-foreground/60">
  {boxes.length} found — tap one to keep exactly it; stages below
  run scoped to the kept BBoxes.
  </p>
  </>
  )}
  </section>

  {/* ═══ STAGE 2 — MASK TYPE (the owner's design): "SECOND STAGE IS MASK
   * TYPE. THESE ARE FOUR BUTTONS, ALL IN ONE, I PRESS FACE, HANDS, BODY,
   * PAINT (IF I HAVE PAINTNG ON THE CANVAS), TEXT". Selections ARE
   * classes — Text included, Paint when a painting exists. Pressing one
   * opens STAGE 3 below (its params + ADD). */}
  <section className="border-b border-white/[0.07] px-0.5 py-2" data-stage-type>
  <div className="pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  Mask type
  </div>
  <div className="flex flex-wrap gap-1">
  {DETECT_CLASSES.map(({ key, label, Icon }) => {
  const on = classOn[key] || detectMode === key
  const state = detectMode === key ? "primary" : on ? "extra" : "off"
  return (
  <ClassChip
  key={key} cls={key} label={label} Icon={Icon}
  state={state} onTap={() => onStageType(key)}
  />
  )
  })}
  <Tip tip="Text is a CLASS — SAM3 open-vocabulary (GPU)">
  <Button variant="ghost"
  type="button" data-type="text"
  data-type-active={typeDraft === "text" ? "true" : "false"}
  onClick={() => onStageType("text")}
  className={cn(
  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium capitalize transition-colors",
  typeDraft === "text"
  ? "border-violet-400/60 bg-violet-400/15 text-violet-300"
  : sam3Active
  ? "border-violet-400/30 text-violet-300/70"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/50",
  )}
  >
  <Sparkles className="h-3 w-3" /> text
  </Button>
  </Tip>
  <Tip tip={hasPaint ? "Paint is a CLASS — the canvas strokes" : "Paint a stroke on the canvas first"}>
  <Button variant="ghost"
  type="button" data-type="paint"
  data-type-active={typeDraft === "paint" ? "true" : "false"}
  disabled={!hasPaint}
  onClick={() => onStageType("paint")}
  className={cn(
  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-35",
  typeDraft === "paint"
  ? "border-fuchsia-400/60 bg-fuchsia-400/15 text-fuchsia-300"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/50",
  )}
  >
  <Brush className="h-3 w-3" /> paint
  </Button>
  </Tip>
  </div>
  <p className="pt-1.5 text-[9px] leading-relaxed text-muted-foreground/60">
  Stage 2 — what to make the mask from. Text and paint are classes
  here, not modes; a class + a BBox from stage 1 compose.
  </p>
  </section>

  {/* ═══ STAGE 3 — THE PARAMS + ADD (the owner's design): "WHEN I PRESS
   * ONE OF THESE BUTTONS, A THIRD SECTION APPEARS AT THE BOTTOM, THIS
   * CONTAINS MY ACTUAL PARAMTERS... AT THE BOTTOM OF THAT, THERE IS
   * ADD." Pressing ADD commits the selection as a card under the canvas
   * (stage 2's button pops back out — the next class is a new card). */}
  {typeDraft && (
  <section className="border-b border-white/[0.07] px-0.5 py-2" data-stage-params>
  <div className="pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
  {typeDraft === "text" ? "Text params" : typeDraft === "paint" ? "Paint params" : `${typeDraft} params`}
  </div>
  {typeDraft === "text" ? (
  <Input
  type="text" data-stage-prompt
  value={draftPrompt}
  onChange={(e) => onPromptDraft(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") onAdd() }}
  placeholder="What to mask — e.g. shirt, jeans, hat"
  className="h-auto w-full rounded border border-border/50 bg-background px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-violet-400/60"
  />
  ) : typeDraft === "paint" ? (
  <p className="text-[9px] leading-relaxed text-muted-foreground/70">
  The strokes on the canvas are the params — paint, then ADD.
  </p>
  ) : (
  <div className="flex items-center gap-1">
  <Button variant="ghost"
  type="button" data-stage-geometry="segm"
  data-geometry-active={stageGeometry === "segm" ? "true" : "false"}
  onClick={() => onGeometry("segm")}
  className={cn(
  "flex-1 rounded border px-1.5 py-1 text-[10px] font-medium transition-colors",
  stageGeometry === "segm"
  ? "border-brand/60 bg-brand/15 text-brand"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/50",
  )}
  >
  Traced (SAM)
  </Button>
  <Button variant="ghost"
  type="button" data-stage-geometry="bbox"
  data-geometry-active={stageGeometry === "bbox" ? "true" : "false"}
  onClick={() => onGeometry("bbox")}
  className={cn(
  "flex-1 rounded border px-1.5 py-1 text-[10px] font-medium transition-colors",
  stageGeometry === "bbox"
  ? "border-sky-400/60 bg-sky-400/15 text-sky-300"
  : "border-border/40 text-muted-foreground hover:bg-sidebar/50",
  )}
  >
  Rectangles
  </Button>
  </div>
  )}
  <Button variant="ghost"
  type="button" data-stage-add
  onClick={onAdd}
  disabled={typeDraft === "text" && !draftPrompt.trim()}
  className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
  >
  <Plus className="h-3 w-3" /> Add {typeDraft}
  </Button>
  </section>
  )}

  {/* TUNE — ONE expander for every numeric knob (2026-08-16 rail diet):
   * threshold, the scope mirror, SAM refine, dilation. Set-once params
   * were four boxes of chrome between the user and the source picker.
   * Collapsed by default, always mounted. The section header IS the
   * toggle — a hairline row, same convention as the timeline rail. */}
  <TuneSection
  params={params}
  source={source}
  scopeLabel={scopeLabel}
  hasScope={hasScope}
  onChange={onChange}
  onClearScope={onClearScope}
  />

  {/* TEXT — the RIDE-ALONG mirror (a set prompt committed via stage 3's
  * ADD; detect may still run — the brick runs both producers). Stage
  * authoring lives in the three-stage flow above; this is the set
  * state's readout. */}
  {sam3Active && (
  <Sam3PromptBox
  params={params}
  onSegment={onSegment}
  hasInput={hasInput}
  detecting={detecting}
  rideAlong
  />
  )}

  {/* STAGE 3 params live in the rail above; this block intentionally
  * left for the OLD caption post. */}

  {/* BRUSH — no knobs (size lives in the canvas options bar, contextual
  * to the tool); just the pointer at the canvas. */}
  {source === "brush" && (
  <p className="border-b border-white/[0.07] px-0.5 py-2 text-[9px] leading-relaxed text-muted-foreground/70">
  Pick the brush (B) and paint on the canvas — strokes export as the
  Paint mask (and as Combined while Person/Box/Text are off).
  </p>
  )}

  {/* PLAY — the owner's design, 2026-08-16, verbatim: "THEN AT THE VERY
  * BOTTOM LEFT, THERE IS PLAY." The stage flow's run: one button, bottom
  * of the rail, runs the committed cards (ADD commits; PLAY runs). The
  * count / filter / marquee all ride whatever this launches. */}
  <div className="sticky bottom-0 z-10 mt-auto border-t border-white/[0.07] bg-background/95 px-0.5 py-2 backdrop-blur-sm" data-rail-play>
  <Button variant="ghost"
  type="button" data-rail-run
  onClick={onPlay}
  disabled={!onPlay || detecting || !hasInput}
  className="flex w-full items-center justify-center gap-1.5 rounded bg-brand px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
  >
  <Play className="h-3.5 w-3.5" /> Play
  </Button>
  </div>
  </div>
  )
}
