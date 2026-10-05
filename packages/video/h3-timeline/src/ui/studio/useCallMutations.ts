/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import type { BeatKnobs, CallRefs, DocCall, GuideKind } from "./docModel.ts"
import { GRID_BASE, GRID_STEP, isCarriedShape, isLegalCallLength, reflowSeamSpan, snapCallEnd, snapCallLength, snapSplitFrame, shortestCallLength } from "./docGrid.ts"

/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
 *  Verbatim lines 2088–2260, plus the authoring grid (2026-09-25):
 *  every gesture that writes a frame lands on the card's own span law
 *  (docGrid.ts), so a studio-built doc never trips the card's uniform
 *  off-grid refusal. */
export function useCallMutations(setCalls: Dispatch<SetStateAction<DocCall[]>>, fps: number) {
  /** Pull-the-tail: the bar grew the envelope — the last call's end
   * follows (exclusive count straight from the bar's onExtend), snapped
   * to the window's legal length. */
  const handleExtend = (newTotal: number) => {
    setCalls((prev) => {
      if (!prev.length) return prev
      const last = prev.length - 1
      const cur = prev[last]!
      if (newTotal <= cur.end_frame) return prev
      const next = [...prev]
      next[last] = { ...cur, end_frame: snapCallEnd(cur, last, Math.round(newTotal)) }
      return next
    })
  }

  /** Add call — TIMELINE-NATIVE (2026-08-16: "We don't need the add-call
   *  button. We can use the timeline to do this"): double-click the ruler
   *  or the calls row's empty area at a frame → split the call containing
   *  that frame there (both halves on the grid), or append a fresh call
   *  at the tail on the grid. The new call starts EMPTY: a call with no
   *  prompt is a TODO the plan names before any GPU work — never silent
   *  junk prompt. */
  const addCallAt = (frame: number) => {
    setCalls((prev) => {
      const i = prev.findIndex((c) => frame > c.start_frame && frame < c.end_frame)
      if (i >= 0) {
        const cur = prev[i]!
        const next = [...prev]
        const split = snapSplitFrame(cur.start_frame, cur.end_frame, isCarriedShape(i, cur), isCarriedShape(i + 1, cur), Math.round(frame))
        next[i] = { ...cur, end_frame: split }
        next.splice(i + 1, 0, { text: "", start_frame: split, end_frame: cur.end_frame })
        return next
      }
      const T = prev.length ? prev[prev.length - 1]!.end_frame : 0
      const shape = isCarriedShape(prev.length, { transition: "extend" })
      return [...prev.map((c) => ({ ...c })), {
        text: "",
        start_frame: T,
        end_frame: T + snapCallLength(Math.max(1, Math.round(fps * 2)), shape),
      }]
    })
  }

  /** Wire a call's guide source. Empty = none (the planner's
   * contract: blank guide keys never materialize — clearing the input
   * detaches the guide; sources are typed, not dropped-then-wired
   * like lane keyframes). The last-frame subcard was CUT 2026-09-15 —
   * the PlagueKind gen lane owns no last-frame input, so the control
   * wrote wire nothing reads. */
  const setCallGuide = (i: number, kind: GuideKind, source: string) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]![kind] ?? ""
      if (cur === source) return prev
      const next = [...prev]
      const call = { ...prev[i]! }
      if (source.trim()) call[kind] = source
      else delete call[kind]
      next[i] = call
      return next
    })
  }

  /** Seam mode per call (2026-09-20: the seam is AUTOMATIC —
   * 'extend' = the drift-control continuation carries the previous
   * window's latent at the director's proven 22-frame overlap with
   * the soft AV audio release; 'cut' = independent window, a true
   * butt. The seconds picker died with the MotionContext seam.)
   *
   * THE SEAM TOGGLE RE-FRAMES (2026-09-25, the uniform span gate): a
   * carried span is 17k and a cut span is 22+17k, so one span cannot
   * be legal in both states. Toggling moves the window's end by the
   * carry (22f) so the doc stays runnable — the operator's end frame
   * shows the new value; the neighbor's start follows as it always
   * did. A first window carries nothing either way and never moves. */
  const setCallTransition = (i: number, t: "extend" | "cut") => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = { ...prev[i]! }
      if (call.transition === t) return prev
      const end = reflowSeamSpan(call, i, t)
      if (end === call.end_frame) {
        call.transition = t
        const next = [...prev]
        next[i] = call
        return next
      }
      const next = [...prev]
      next[i] = { ...call, transition: t, end_frame: end }
      if (i < next.length - 1) next[i + 1] = { ...next[i + 1]!, start_frame: end }
      return next
    })
  }

  /** Edit a call's identity refs (Ref2VA route): REPLACE the run-level
   * refs for THIS call's windows. Empty string = the key drops from the
   * serialized call (inherit the Layer A refs). */
  const setCallRefs = (i: number, key: keyof CallRefs, value: string) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      if ((prev[i]!.refs?.[key] ?? "") === value) return prev
      const call = { ...prev[i]! }
      const refs = { ...(call.refs ?? {}) }
      if (value.trim()) refs[key] = value.trim()
      else delete refs[key]
      if (Object.keys(refs).length) call.refs = refs
      else delete call.refs
      const next = [...prev]
      next[i] = call
      return next
    })
  }

  /** Edit a call's span from the card's number inputs. The cut ripples
   * into the neighbor (start → the previous call's end; end → the next
   * call's start; the LAST call's end grows/shrinks the envelope), and
   * the written frame lands on the window's legal length — the number
   * input shows the snapped frame, the card never re-frames it. */
  const setCallSpan = (i: number, which: "start" | "end", frame: number) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]!
      const next = [...prev]
      // THE LIVE-STEP RULE: a gesture that snaps back onto the frame the
      // window already holds would read as "the input ignored me". One
      // grid step in the gesture's direction keeps every keystroke and
      // every drag visible AND on the grid (both families step by 17).
      if (which === "start" && i > 0) {
        // a seam gesture moves BOTH windows' lengths, so the nearest
        // frame where BOTH are legal is the frame that lands
        const prevCall = prev[i - 1]!
        const leftCarried = isCarriedShape(i - 1, prevCall)
        const rightCarried = isCarriedShape(i, cur)
        const gesture = Math.round(frame)
        let boundary = snapSplitFrame(prevCall.start_frame, cur.end_frame, leftCarried, rightCarried, gesture)
        if (boundary === prevCall.end_frame && gesture !== boundary) {
          const stepped = boundary + GRID_STEP * Math.sign(gesture - boundary)
          if (stepped > prevCall.start_frame && stepped < cur.end_frame &&
            isLegalCallLength(stepped - prevCall.start_frame, leftCarried) &&
            isLegalCallLength(cur.end_frame - stepped, rightCarried)) {
            boundary = stepped
          }
        }
        if (boundary === prevCall.end_frame) return prev
        next[i - 1] = { ...prevCall, end_frame: boundary }
        next[i] = { ...cur, start_frame: boundary }
      } else if (which === "start") {
        // the first window has no carry: its OWN length snaps, and the
        // head may never run past the shortest legal window
        const gesture = Math.min(Math.max(Math.round(frame), 0), cur.end_frame - GRID_BASE)
        let start = cur.end_frame - snapCallLength(cur.end_frame - gesture, false)
        if (start === cur.start_frame) {
          // A +17 step can never eat the window: the gesture clamp caps
          // at `end - 22`, so a snapped-back gesture is either at `start`
          // itself (a no-op) or inside `start`'s snap bucket, and the
          // step it takes leaves at least the 22f base behind.
          start += GRID_STEP * Math.sign(gesture - start)
        }
        if (start === cur.start_frame) return prev
        next[i] = { ...cur, start_frame: start }
      } else {
        const gesture = Math.max(Math.round(frame), cur.start_frame + 1)
        let end = snapCallEnd(cur, i, gesture)
        if (end === cur.end_frame) {
          const stepped = end + GRID_STEP * Math.sign(gesture - end)
          if (stepped >= cur.start_frame + shortestCallLength(i, cur)) end = stepped
        }
        if (end === cur.end_frame) return prev
        next[i] = { ...cur, end_frame: end }
        if (i < prev.length - 1) next[i + 1] = { ...next[i + 1]!, start_frame: end }
      }
      return next
    })
  }

  /** Set (or clear — undefined) one per-call knob override. Clearing the
   * last knob removes the whole `knobs` dict: absent = inherit. */
  const setCallKnob = (
    i: number,
    key: string,
    value: number | string | boolean | undefined,
  ) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = { ...prev[i]! }
      // Raw-record writes at the setter boundary: the value union is
      // inherently heterogenous and a string key can't narrow — the
      // VOCABULARY gate lives in the control layer (KNOB_ORDER) + the
      // hydration gate (CALL_KNOB_KEYS), exactly like the backend's
      // validated dict. The final spread re-typed onto BeatKnobs.
      const knobs: Record<string, number | string | boolean> = { ...(call.knobs ?? {}) }
      if (value === undefined) delete knobs[key]
      else knobs[key] = value
      if (Object.keys(knobs).length === 0) delete call.knobs
      else call.knobs = { ...(knobs as BeatKnobs) }
      const next = [...prev]
      next[i] = call
      return next
    })
  }
  return {
    handleExtend, addCallAt,
    setCallGuide, setCallTransition, setCallRefs,
    setCallSpan, setCallKnob,
  }
}
