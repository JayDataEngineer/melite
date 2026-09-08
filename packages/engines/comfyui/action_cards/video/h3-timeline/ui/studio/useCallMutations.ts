/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import type { BeatKnobs, CallRefs, DocCall, GuideKind } from "./docModel"

/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
 *  Verbatim lines 2088–2260. */
export function useCallMutations(setCalls: Dispatch<SetStateAction<DocCall[]>>, fps: number) {
  /** Pull-the-tail: the bar grew the envelope — the last call's end
   * follows (exclusive count straight from the bar's onExtend). */
  const handleExtend = (newTotal: number) => {
    setCalls((prev) => {
      if (!prev.length) return prev
      const last = prev.length - 1
      const cur = prev[last]!
      if (newTotal <= cur.end_frame) return prev
      const next = [...prev]
      next[last] = { ...cur, end_frame: Math.round(newTotal) }
      return next
    })
  }

  /** Add call — TIMELINE-NATIVE (2026-08-16: "We don't need the add-call
   *  button. We can use the timeline to do this"): double-click the ruler
   *  or the calls row's empty area at a frame → split the call containing
   *  that frame there (both halves ≥1 frame), or append a fresh 2 s call
   *  when the frame sits on a boundary / past the end. The new call starts
   *  EMPTY: a call with no prompt is a TODO the plan names before any GPU
   *  work — never silent junk prompt. */
  const addCallAt = (frame: number) => {
    setCalls((prev) => {
      const i = prev.findIndex((c) => frame > c.start_frame && frame < c.end_frame)
      if (i >= 0) {
        const cur = prev[i]!
        const next = [...prev]
        next[i] = { ...cur, end_frame: frame }
        next.splice(i + 1, 0, { text: "", start_frame: frame, end_frame: cur.end_frame })
        return next
      }
      const T = prev.length ? prev[prev.length - 1]!.end_frame : 0
      return [...prev.map((c) => ({ ...c })), { text: "", start_frame: T, end_frame: T + Math.max(1, Math.round(fps * 2)) }]
    })
  }

  /** Wire a call's guide source (the guide kinds + the last-frame
   * subcard — the closing still rides the identical blank-never rule).
   * Empty = none (the planner's contract: blank guide keys never
   * materialize — clearing the input detaches the guide; there is no
   * "wired-but-unwired" TODO state for calls, sources are typed, not
   * dropped-then-wired like lane keyframes). */
  const setCallGuide = (i: number, kind: GuideKind | "last_frame", source: string) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = kind === "last_frame" ? (prev[i]!.last_frame ?? "") : (prev[i]![kind] ?? "")
      if (cur === source) return prev
      const next = [...prev]
      const call = { ...prev[i]! }
      if (kind === "last_frame") {
        if (source.trim()) call.last_frame = source
        else delete call.last_frame
      } else {
        if (source.trim()) call[kind] = source
        else delete call[kind]
      }
      next[i] = call
      return next
    })
  }

  /** Toggle the call's prev-video opener (the compiler's rule 3b): the
   * last X seconds of the PREVIOUS window's rendered video carry the
   * call's opening motion. null deletes the key (absent = no opener —
   * the run's continuity toggle decides); the seconds input writes the
   * raw value VERBATIM (the compiler snaps it to the guide-clip packing
   * rule and refuses impossible tails — never a client-side silent
   * snap). Enabling defaults to 2 s. */
  /** Seam mode per call: 'extend' = seamless latent chain (prev-sec reads
   * as SECONDS OF LATENT carried from the previous window's tail via the
   * motion-context node); 'cut' = fresh window + prev-video opener clip. */
  const setCallTransition = (i: number, t: "extend" | "cut") => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = { ...prev[i]! }
      if (call.transition === t) return prev
      call.transition = t
      // Switching modes re-bases the carry default so the plan always
      // has sane numbers: extend defaults to a 3 s latent carry, cut to
      // a 2 s video tail.
      if (call.first_frame_prev_sec != null) {
        call.first_frame_prev_sec = t === "extend" ? 3 : 2
      }
      const next = [...prev]
      next[i] = call
      return next
    })
  }
  const setCallPrevSec = (i: number, sec: number | null) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = { ...prev[i]! }
      if (sec == null || !Number.isFinite(sec) || sec <= 0) {
        if (call.first_frame_prev_sec === undefined) return prev
        delete call.first_frame_prev_sec
      } else {
        if (call.first_frame_prev_sec === sec) return prev
        call.first_frame_prev_sec = sec
      }
      const next = [...prev]
      next[i] = call
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
   * call's start; the LAST call's end grows/shrinks the envelope). */
  const setCallSpan = (i: number, which: "start" | "end", frame: number) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const cur = prev[i]!
      const next = [...prev]
      if (which === "start") {
        const min = i === 0 ? 0 : prev[i - 1]!.start_frame + 1
        const f = Math.min(Math.max(frame, min), cur.end_frame - 1)
        if (f === cur.start_frame) return prev
        next[i] = { ...cur, start_frame: f }
        if (i > 0) next[i - 1] = { ...next[i - 1]!, end_frame: f }
      } else {
        const f = Math.max(frame, cur.start_frame + 1)
        if (f === cur.end_frame) return prev
        next[i] = { ...cur, end_frame: f }
        if (i < prev.length - 1) next[i + 1] = { ...next[i + 1]!, start_frame: f }
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
    setCallGuide, setCallTransition, setCallPrevSec, setCallRefs,
    setCallSpan, setCallKnob,
  }
}
