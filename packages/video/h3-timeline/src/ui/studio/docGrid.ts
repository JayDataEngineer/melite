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
