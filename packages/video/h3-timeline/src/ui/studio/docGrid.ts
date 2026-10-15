/**
 * docGrid.ts — THE AUTHORING GRID (studio side, 2026-09-25).
 *
 * WHY THIS FILE EXISTS: the card's admission gate became UNIFORM
 * (`assertSpanGrid` — every window shape refuses an off-grid authored
 * span instead of silently re-framing it). A refusal-only card would
 * break the authoring surface: the bar drag, the span number inputs
 * and the call splitter all move frames by hand, and every one of them
 * used to hand the engine whatever the operator's pixel resolved to.
 * So the authoring boundary snaps, VISIBLY, to the same law the card
 * refuses against — the number inputs and the bar show the snapped
 * frames, and the card never has to repair a doc this surface built.
 *
 * THE LAW (one owner, imported from the card's own contract — no
 * duplicated constants):
 *   - a window generates 22+17k frames in [22,362];
 *   - a CARRIED window (i>0, non-cut) generates span+22, so its
 *     authored span must be 17k;
 *   - a FIRST or CUT window generates its span verbatim, so its
 *     authored span must be 22+17k;
 *   - calls TILE: every call starts where the previous one ended.
 *
 * The seam toggle re-frames by exactly 22 frames (a carried span
 * loses 22, a cut span gains 22) because both shapes cannot be legal
 * for one span — arithmetic, not policy. The operator sees the new end
 * frame in the input; nothing is repaired behind their back.
 */
import {
  GRID_BASE_FRAMES,
  GRID_MAX_FRAMES,
  GRID_STEP_FRAMES,
  SEAM_OVERLAP_FRAMES,
  gridSnap,
  isGridLength,
  transitionOverlap,
} from '@melite/models-h3/timelineContract'
import type { DocCall } from "./docModel.ts"

/** The span editors' string→number parse: SpecAtom hands the RAW
 *  edit string (card-base atoms pass strings only, the no-coercion
 *  proof); an empty or non-finite edit is no edit. */
export function parseSpecNumber(v: string): number | undefined {
  const t = v.trim()
  if (t === "") return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** The span seat's ONE narrowing of the atom grammar's unknown edit
 *  value into a frame write (both span inputs shared this guard
 *  inline before — the parallel-values extraction law). Non-string
 *  values and non-numeric strings are no write, never a NaN frame.
 * @param v the atom's edit value, unknown at the grammar seam.
 * @returns the rounded frame, or undefined when the edit writes nothing. */
export function parseFrameEdit(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined
  const n = parseSpecNumber(v)
  return n === undefined ? undefined : Math.round(n)
}

/** Is this window's seam a carried join? Index-aware, exactly the
 *  card's own `chainLike` law (filmMix's stanzaSecs reads the same). */
export function isCarriedShape(index: number, call: Pick<DocCall, "transition">): boolean {
  return index > 0 && transitionOverlap(call.transition) > 0
}

/** Is this authored LENGTH legal for the window's shape? */
export function isLegalCallLength(length: number, carried: boolean): boolean {
  if (carried) {
    return Number.isInteger(length) && length >= GRID_STEP_FRAMES &&
      length + SEAM_OVERLAP_FRAMES <= GRID_MAX_FRAMES && length % GRID_STEP_FRAMES === 0
  }
  return isGridLength(length)
}

/** Nearest legal authored length for the window's shape. */
export function snapCallLength(length: number, carried: boolean): number {
  if (carried) {
    const k = Math.max(1, Math.round(length / GRID_STEP_FRAMES))
    return Math.min(GRID_MAX_FRAMES - SEAM_OVERLAP_FRAMES, GRID_STEP_FRAMES * k)
  }
  return gridSnap(Math.max(GRID_BASE_FRAMES, length))
}

/** The grid's step, re-exported so the authoring setters never grow a
 *  second copy of the number. Both length families advance by 17. */
export const GRID_STEP = GRID_STEP_FRAMES

/** The grid's base — the shortest first/cut window. */
export const GRID_BASE = GRID_BASE_FRAMES

/** The shortest legal authored length for this window's shape. */
export function shortestCallLength(index: number, call: Pick<DocCall, "transition">): number {
  return isCarriedShape(index, call) ? GRID_STEP_FRAMES : GRID_BASE_FRAMES
}

/** The exclusive end this call would carry at the requested end: the
 *  length snaps, the start is the operator's. */
export function snapCallEnd(call: DocCall, index: number, end: number): number {
  return call.start_frame + snapCallLength(end - call.start_frame, isCarriedShape(index, call))
}

/** The splice frame for a split where BOTH halves must be legal — the
 *  gesture's frame when it already qualifies, else the nearest one that
 *  does. Never returns a frame that leaves an off-grid half. */
export function snapSplitFrame(
  start: number,
  end: number,
  leftCarried: boolean,
  rightCarried: boolean,
  gesture: number,
): number {
  let best = gesture
  let bestDistance = Number.POSITIVE_INFINITY
  for (let frame = start + 1; frame < end; frame++) {
    if (!isLegalCallLength(frame - start, leftCarried)) continue
    if (!isLegalCallLength(end - frame, rightCarried)) continue
    const distance = Math.abs(frame - gesture)
    if (distance < bestDistance) {
      bestDistance = distance
      best = frame
    }
  }
  return best
}

/** The seam toggle's re-frame: the 22-frame carry moves from the
 *  generation head to (or from) the authored span. A first window has
 *  no carry either way, so its toggle never moves frames. */
export function reflowSeamSpan(call: DocCall, index: number, next: "extend" | "cut"): number {
  const wasCarried = isCarriedShape(index, call)
  const willCarried = isCarriedShape(index, { transition: next })
  if (wasCarried === willCarried) return call.end_frame
  const length = call.end_frame - call.start_frame
  return call.start_frame + (willCarried ? length - SEAM_OVERLAP_FRAMES : length + SEAM_OVERLAP_FRAMES)
}

// ── THE KEYFRAME CHIP'S SEAT VERDICT (slice 3, 2026-11-05) ─────────────
// The UI mirrors NOTHING compose-side: the pin→seat/ pin→node mapping
// lives ONLY in models/h3 actions.ts (applyKeyframeCompose), and the
// gap refusal fires at the plan door (the plan gate's `covered`
// clause). What the UI needs to SURFACE — the strip's gap face and the
// chip's drop hint — is the plan gate's own window predicate, restated
// here as data over the shared grid law's step (GRID_STEP_FRAMES: a
// pin within one grid step of a boundary reads "snap to window edge",
// the distance a boundary nudge is worth). No second mapping grows:
// these return verdicts, never seats.

/** The window that would cover a pin at `frame` — the plan gate's own
 *  predicate (f ∈ [start_frame, end_frame), the first matching call).
 *
 * @param calls the document's calls (the windows).
 * @param frame the FILM-absolute pin frame.
 * @returns the covering call, or null when the frame falls outside
 *   every window (the plan door's gap — the strip surfaces the
 *   refusal; the write still lands). */
export function pinWindowOf(
  calls: ReadonlyArray<Pick<DocCall, "start_frame" | "end_frame">>,
  frame: number,
): Pick<DocCall, "start_frame" | "end_frame"> | null {
  return calls.find((c) => frame >= c.start_frame && frame <= c.end_frame - 1) ?? null
}

/** The keyframe chip's drop verdict, over the shared grid law:
 *  "snap" when the pin sits within one GRID_STEP_FRAMES of its
 *  window's boundary (the anchor/end-anchor seats), "interior" when
 *  it stays mid-window, null when no window covers it (the gap — the
 *  refusal face's seat, never a hint).
 *
 * @param calls the document's calls (the windows).
 * @param frame the FILM-absolute pin frame.
 * @returns the verdict for the chip's hint face. */
export function pinDropVerdict(
  calls: ReadonlyArray<Pick<DocCall, "start_frame" | "end_frame">>,
  frame: number,
): "snap" | "interior" | null {
  const w = pinWindowOf(calls, frame)
  if (w === null) return null
  const toStart = Math.abs(frame - w.start_frame)
  const toEnd = Math.abs(frame - (w.end_frame - 1))
  return Math.min(toStart, toEnd) <= GRID_STEP_FRAMES ? "snap" : "interior"
}
