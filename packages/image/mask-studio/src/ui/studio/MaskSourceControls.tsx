// MaskSourceControls — THE RAIL (the whole mask param surface in source
// order). Pure move from component.tsx (props shape unchanged) EXCEPT the
// TUNE expander, which lives in TuneSection.tsx (same JSX + its tuneOpen /
// numeric-draft state, always mounted — identical lifetime).
import { Button, Input, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { BoxSelect, Brush, Expand, Loader2, Play, Plus, WandSparkles as Sparkles } from "@melite/card-base/icons"
import { DETECT_CLASSES } from "./constants"
import type { BoxEntry, DetectClass, MaskSource } from "./constants"
import { ClassChip } from "./ClassChip"
import { Sam3PromptBox } from "./Sam3PromptBox"
import { TuneSection } from "./TuneSection"
import styles from "./mask.module.css"

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
  <div className={styles.rail} data-mask-source-rail>

  {/* ═══ STAGE 1 — BBOX (the owner's design, 2026-08-16, verbatim):
   * "FIRST STAGE IS BBOXX. I CAN SELECT THE NUMBER BEFOREHAND. NOT
   * AFTER. BEFOREHAND. THERE IS A LITTLE PLAY BUTTON FOR THIS STAGE AS
   * WELL, SO IF I WANT, I CAN RUN BBOXX ISOLATED."
   * The count is chosen BEFORE the run (a stepper: how many subjects to
   * keep — instance_filter "0..n-1"); the play runs BBox ISOLATED (detect
   * on, boxes ON, no other exports). After a manifest lands, the found
   * instances are CLICKABLE here — tap BBox 1/2/3 to keep exactly that
   * one. OPTIONAL: with no count and no manifest, stage 2 runs full. */}
  <section className={styles.stageSection} data-stage-bbox>
  <div className={styles.stageHead}>
  <span className={styles.stageTitle}>
  <BoxSelect className={styles.sz12} /> BBox
  </span>
  {detecting && <Loader2 className={clsx(styles.sz12, styles.accentInk, styles.spin)} />}
  </div>
  {!boxes ? (
  <>
  <div className={styles.countRow}>
  <Tooltip label="How many subjects to keep — set BEFORE the run. 0 = all." side="top">
  <div className={styles.stepper} data-bbox-count>
  <Button variant="ghost"
  type="button" data-bbox-dec aria-label="Fewer boxes"
  onClick={() => onBboxCount(Math.max(0, bboxCount - 1))}
  className={styles.stepBtn}
  >−</Button>
  <span className={styles.stepVal}>
  {bboxCount === 0 ? "all" : bboxCount}
  </span>
  <Button variant="ghost"
  type="button" data-bbox-inc aria-label="More boxes"
  onClick={() => onBboxCount(Math.min(12, bboxCount + 1))}
  className={styles.stepBtn}
  >+</Button>
  </div>
  </Tooltip>
  <Tooltip label="Run BBox ISOLATED — find the boxes now; no masks yet" side="top">
  <Button variant="ghost"
  type="button" data-bbox-run
  onClick={onBboxRun}
  disabled={!hasInput}
  className={styles.findBtn}
  >
  <Play className={styles.sz10} /> Find boxes
  </Button>
  </Tooltip>
  </div>
  <p className={styles.stageNote}>
  Stage 1 — find the subjects first (optional). The count caps how
  many BBoxes the next stages use.
  </p>
  </>
  ) : (
  <>
  <div className={styles.pickRow}>
  <Button variant="ghost"
  type="button" data-bbox-all
  onClick={() => onInstancePick(new Set())}
  className={clsx(
  styles.pickBtn,
  selectedAll ? styles.pickAllOn : styles.pickAllOff,
  )}
  >
  <Expand className={styles.sz10} /> All {boxes.length}
  </Button>
  {boxes.map((b) => (
  <Tooltip key={b.index} label={`Keep exactly BBox ${b.index + 1} (${b.class}) — one tap`} side="top">
  <Button variant="ghost"
  type="button" data-bbox-pick={b.index}
  onClick={() => onInstancePick(new Set([b.index]))}
  className={clsx(
  styles.pickBtn,
  instancesSelected.has(b.index)
  ? styles.pickOneOn
  : styles.pickOneOff,
  )}
  >
  <BoxSelect className={styles.sz10} /> {b.index + 1}
  </Button>
  </Tooltip>
  ))}
  </div>
  <p className={styles.stageNote}>
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
  <section className={styles.stageSection} data-stage-type>
  <div className={styles.stagePlainTitle}>
  Mask type
  </div>
  <div className={styles.pickRow}>
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
  <Tooltip label="Text is a CLASS — SAM3 open-vocabulary (GPU)" side="top">
  <Button variant="ghost"
  type="button" data-type="text"
  data-type-active={typeDraft === "text" ? "true" : "false"}
  onClick={() => onStageType("text")}
  className={clsx(
  styles.typeBtn,
  typeDraft === "text"
  ? styles.typeTextOn
  : sam3Active
  ? styles.typeTextArmed
  : styles.typeTextOff,
  )}
  >
  <Sparkles className={styles.sz12} /> text
  </Button>
  </Tooltip>
  <Tooltip label={hasPaint ? "Paint is a CLASS — the canvas strokes" : "Paint a stroke on the canvas first"} side="top">
  <Button variant="ghost"
  type="button" data-type="paint"
  data-type-active={typeDraft === "paint" ? "true" : "false"}
  disabled={!hasPaint}
  onClick={() => onStageType("paint")}
  className={clsx(
  styles.typeBtn,
  typeDraft === "paint"
  ? styles.typePaintOn
  : styles.typePaintOff,
  )}
  >
  <Brush className={styles.sz12} /> paint
  </Button>
  </Tooltip>
  </div>
  <p className={styles.stageNote}>
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
  <section className={styles.stageSection} data-stage-params>
  <div className={styles.stagePlainTitle}>
  {typeDraft === "text" ? "Text params" : typeDraft === "paint" ? "Paint params" : `${typeDraft} params`}
  </div>
  {typeDraft === "text" ? (
  <Input
  type="text" data-stage-prompt
  value={draftPrompt}
  onChange={(e) => onPromptDraft(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") onAdd() }}
  placeholder="What to mask — e.g. shirt, jeans, hat"
  className={styles.promptInput}
  />
  ) : typeDraft === "paint" ? (
  <p className={styles.paintParamsNote}>
  The strokes on the canvas are the params — paint, then ADD.
  </p>
  ) : (
  <div className={styles.geomRow}>
  <Button variant="ghost"
  type="button" data-stage-geometry="segm"
  data-geometry-active={stageGeometry === "segm" ? "true" : "false"}
  onClick={() => onGeometry("segm")}
  className={clsx(
  styles.geomBtn,
  stageGeometry === "segm"
  ? styles.geomSegmOn
  : styles.geomSegmOff,
  )}
  >
  Traced (SAM)
  </Button>
  <Button variant="ghost"
  type="button" data-stage-geometry="bbox"
  data-geometry-active={stageGeometry === "bbox" ? "true" : "false"}
  onClick={() => onGeometry("bbox")}
  className={clsx(
  styles.geomBtn,
  stageGeometry === "bbox"
  ? styles.geomBboxOn
  : styles.geomBboxOff,
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
  className={styles.addBtn}
  >
  <Plus className={styles.sz12} /> Add {typeDraft}
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
  <p className={styles.brushHint}>
  Pick the brush (B) and paint on the canvas — strokes export as the
  Paint mask (and as Combined while Person/Box/Text are off).
  </p>
  )}

  {/* PLAY — the owner's design, 2026-08-16, verbatim: "THEN AT THE VERY
  * BOTTOM LEFT, THERE IS PLAY." The stage flow's run: one button, bottom
  * of the rail, runs the committed cards (ADD commits; PLAY runs). The
  * count / filter / marquee all ride whatever this launches. */}
  <div className={styles.playDock} data-rail-play>
  <Button variant="ghost"
  type="button" data-rail-run
  onClick={onPlay}
  disabled={!onPlay || detecting || !hasInput}
  className={styles.playBtn}
  >
  <Play className={styles.sz14} /> Play
  </Button>
  </div>
  </div>
  )
}
