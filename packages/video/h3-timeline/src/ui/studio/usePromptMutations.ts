/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import type { DocCall } from "./docModel.ts"
import { STARTER_CALLS } from "./docModel.ts"
import { callIndexOf } from "./docCalls.ts"
import { snapCallEnd, snapCutDelta } from "./docGrid.ts"
import { patchAt } from "./docPatch.ts"

/** Bar↔card prompt gestures (tenant §6). Verbatim lines 1948–2042. */
export function usePromptMutations(setCalls: Dispatch<SetStateAction<DocCall[]>>) {
  // ── Beat gestures (the ripple — a packed timeline's edits are CUT
  // moves; contiguity is maintained BY CONSTRUCTION, so plan_windows
  // never sees a gap from a UI gesture) ──────────────────────────────────

  const handlePromptResize = (id: string, s: number, e: number) => {
    const i = callIndexOf(id)
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]!
      const next = [...prev]
      if (s !== cur.start_frame && i > 0) {
        // LEFT edge → the cut shared with the PREVIOUS call. (The
        // grid snap, 2026-11-05: a dragged cut lands on the 17-frame
        // lattice — both adjacent windows stay legal by arithmetic,
        // so the compose's span gate never refuses a bar gesture.)
        const cut = cur.start_frame + snapCutDelta(s - cur.start_frame)
        if (cut === cur.start_frame) return prev
        next[i] = { ...cur, start_frame: cut }
        next[i - 1] = { ...prev[i - 1]!, end_frame: cut }
      } else if (e !== cur.end_frame - 1) {
        // RIGHT edge → the cut shared with the NEXT call (or the tail:
        // i is last → the sequence grows; e+1 is the new total — the
        // tail's own length snaps to its shape's grid, same law).
        const end = i < prev.length - 1
          ? cur.end_frame + snapCutDelta(e + 1 - cur.end_frame)
          : snapCallEnd(cur, i, e + 1)
        if (end === cur.end_frame) return prev
        next[i] = { ...cur, end_frame: end }
        if (i < prev.length - 1) {
          next[i + 1] = { ...prev[i + 1]!, start_frame: end }
        }
      } else {
        return prev
      }
      return next
    })
  }

  const handlePromptMove = (id: string, s: number, e: number) => {
    const i = callIndexOf(id)
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]!
      // Packed: a body drag TRANSLATES the card — the two cuts it
      // shares travel with it (the neighbors absorb; contiguity by
      // construction, the handlePromptResize ripple). The bar bounds
      // the move within the neighbors' spans (prevStart+1 .. nextEnd-1),
      // so the tiling stays exact and nothing overlaps.
      if (s === cur.start_frame && e + 1 === cur.end_frame) return prev
      const next = [...prev]
      next[i] = { ...cur, start_frame: s, end_frame: e + 1 }
      if (i > 0) next[i - 1] = { ...next[i - 1]!, end_frame: s }
      if (i < prev.length - 1) next[i + 1] = { ...next[i + 1]!, start_frame: e + 1 }
      return next
    })
  }

  const handlePromptDelete = (id: string) => {
    const i = callIndexOf(id)
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      if (prev.length === 1) {
        // The only call: deleting it would empty the document (the plan
        // REQUIRES ≥1 call) — reset to the starter instead of an invalid
        // empty doc.
        return STARTER_CALLS.map((c) => ({ ...c }))
      }
      const next = prev.filter((_, j) => j !== i)
      // Merge the freed span into the neighbor (prev absorbs; the first
      // call's span rolls into the new first) — the tiling stays exact.
      if (i > 0) {
        next[i - 1] = { ...next[i - 1]!, end_frame: prev[i]!.end_frame }
      } else {
        next[0] = { ...next[0]!, start_frame: prev[0]!.start_frame }
      }
      return next
    })
  }

  const handlePromptUpdate = (id: string, text: string) => {
    const i = callIndexOf(id)
    // Empty text is a VISIBLE TODO (amber card + the rail warning + the
    // plan gate naming the call) — the card shows exactly what the
    // compiler would refuse, so the state to fix is the state on screen.
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]!
      // (text is always a string here: hydrateCalls initializes "" and
      // only ever writes strings — the `!` records that proof, no dead
      // `?? ""` arm.)
      if (cur.text! === text) return prev
      return patchAt(prev, i, { ...cur, text })
    })
  }
  return { handlePromptResize, handlePromptMove, handlePromptDelete, handlePromptUpdate }
}
