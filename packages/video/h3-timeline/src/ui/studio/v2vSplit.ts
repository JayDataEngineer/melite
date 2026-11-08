/** v2vSplit.ts — THE PURE SPLIT LAW (queue 11's form seat, operator
 * 2026-11-08 reopened: "the video2video form that would allow clips
 * to split by timestamp … with the option to select how context is
 * carried"). ONE law, two doors: the strip head's door rides the
 * studio's mutation updaters (useCallMutations — addCallAt's splice
 * + setCallTransition's reframe, walled by
 * studio-v2v-cut-door.spec.tsx); the LEAF FORM's face rides THIS
 * pure function. The two must agree byte-for-byte — the parity arm
 * in the form's wall judges the same fixture through both doors
 * (the orb's one-truth law: ONE truth, two views of one draft).
 *
 * The law itself is §0.5's split + §0.9's reframe, verbatim from
 * the mutation: the gesture frame snaps to the authoring lattice
 * (22+17k), one window becomes its own two halves (text, refs and
 * knobs carry whole into both; the seam the split births states
 * CUT), everything downstream rebases by the 22f cut price, and a
 * selected carry mode re-frames the NEW seam (the right half's end
 * and the next window's start move together — the tiling holds). A
 * gesture with no legal split frame REFUSES (null): the doc keeps
 * its identity, exactly as the mutation's onRefuse path does. */
import { isCarriedShape, reflowSeamSpan, snapSplitFrame } from './docGrid.ts'
import type { DocCall } from './docModel.ts'

/** The three carry states the split seat states (§0.9's vocabulary,
 * the same three the call card's seam seat and the strip head's
 * carry menu serve). */
export type SplitCarry = 'cut' | 'extend' | 'carry+keyframe'

/** Split the doc's calls at a gesture frame with a selected carry.
 * @param calls the doc's own windows (the row's calls param)
 * @param gestureFrame the frame the split is asked at (doc space)
 * @param carry the seam state the NEW split births after the stock
 * cut ("cut" keeps the split's own default seam)
 * @returns the next calls array, or null when no legal split exists
 * (a window too short to halve, or an empty doc — the refusal the
 * caller's own voice names) */
export function splitCallsAt(calls: DocCall[], gestureFrame: number, carry: SplitCarry): DocCall[] | null {
  if (calls.length === 0) return null
  const i = calls.findIndex((c) => gestureFrame > c.start_frame && gestureFrame < c.end_frame)
  if (i < 0) {
    // a boundary or past-the-end gesture resolves the TARGET
    // window's midpoint — the strip head's own resolution law (the
    // press always cuts, never appends)
    const target = calls.find((c) => gestureFrame === c.start_frame) ?? calls[calls.length - 1]!
    return splitCallsAt(calls, Math.round((target.start_frame + target.end_frame) / 2), carry)
  }
  const cur = calls[i]!
  const split = snapSplitFrame(cur.start_frame, cur.end_frame, isCarriedShape(i, cur), true, gestureFrame)
  if (split === null) return null
  // addCallAt's interior branch, verbatim: the right half is a
  // carried window (17k content) seating transition cut — the
  // toggle's own reframe computes its end
  const rightEnd = reflowSeamSpan({ ...cur, start_frame: split, transition: 'extend' }, i + 1, 'cut')
  const next = [...calls]
  next[i] = { ...cur, end_frame: split }
  next.splice(i + 1, 0, { ...cur, start_frame: split, end_frame: rightEnd, transition: 'cut' })
  const delta = rightEnd - cur.end_frame
  for (let j = i + 2; j < next.length; j++) {
    next[j] = { ...next[j]!, start_frame: next[j]!.start_frame + delta, end_frame: next[j]!.end_frame + delta }
  }
  if (carry !== 'cut') {
    // setCallTransition(i + 1, carry), verbatim: the seam re-frames,
    // the next window's start follows (one reflow, tiling preserved).
    // (the fresh seam's transition is provably 'cut' here — the
    // same-transition no-op guard the mutation carries is dead on
    // this path and is not mirrored)
    const seam = { ...next[i + 1]! }
    const end = reflowSeamSpan(seam, i + 1, carry)
    next[i + 1] = { ...seam, transition: carry, end_frame: end }
    if (i + 1 < next.length - 1) next[i + 2] = { ...next[i + 2]!, start_frame: end }
  }
  return next
}
