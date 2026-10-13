/**
 * docPatch.ts — THE SINGLE-INDEX PATCH SPINE (the rail-law audit's
 * H7, 2026-10-31).
 *
 * WHY THIS FILE EXISTS: thirteen setters across the studio's four
 * mutation hooks re-rolled the identical three-line spine — copy the
 * array, replace the element at `i`, return the copy. The copy was
 * the law and the copy was hand-rolled, so every new setter re-rolled
 * it again. One spelling now.
 *
 * THE LAW'S BOUND: this spine patches EXACTLY ONE index. Setters
 * that re-frame neighbors (a seam move writes i-1/i/i+1; a delete
 * merges the freed span) are a DIFFERENT law — the ripple — and
 * they keep their explicit copies, by design. Guards (bounds,
 * same-value identity) stay at each seat: they differ per setter
 * and that is the seat's own contract, not this spine's.
 */
import type { Dispatch, SetStateAction } from "react"

/** Copy the array with the element at `i` replaced by `next` — the
 *  single-index patch every one-field setter rides.
 *
 * @param xs the array to copy (the state's previous value).
 * @param i the index to replace (bounds-guarded at the seat).
 * @param next the replacement element.
 * @returns the copied array with `next` seated at `i`. */
export function patchAt<T>(xs: readonly T[], i: number, next: T): T[] {
  const copy = [...xs]
  copy[i] = next
  return copy
}

/** The same spine behind a setState: patch one index of the state
 *  array. Identical to `setX((prev) => patchAt(prev, i, next))` with
 *  the setter threaded once.
 *
 * @param set the React state setter for the array.
 * @param i the index to replace (bounds-guarded at the seat).
 * @param next the replacement element. */
export function setPatchAt<T>(set: Dispatch<SetStateAction<T[]>>, i: number, next: T): void {
  set((prev) => patchAt(prev, i, next))
}
