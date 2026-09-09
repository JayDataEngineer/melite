/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import type { DocCall, DocBeatSegment } from "./docModel"
import { KIND_OF_TRACK } from "./docModel"
import type { DocKeyframe } from "./docModel"
import { kfIndexOf } from "./docCalls"
import type { TimelineSelection } from "./useViewSelection"

/** Layer C segments + legacy keyframes (tenant §9). Verbatim lines 2262–2436
 *  and 2438–2472. */
export function useBeatMutations(
  calls: DocCall[],
  setCalls: Dispatch<SetStateAction<DocCall[]>>,
  setSelected: Dispatch<SetStateAction<TimelineSelection | null>>,
  keyframes: DocKeyframe[],
  setKeyframes: Dispatch<SetStateAction<DocKeyframe[]>>,
) {
  // ── Layer C within a call: prompt SEGMENTS (2026-08-16, the B/C
  // conflation fix — a beat is a subset of a call, never the timeline
  // entity). Segments join into the call's ONE prompt with time markers
  // and never cut (cuts land on call boundaries). Frames are absolute
  // (the planner validates them inside the call's span; gaps allowed).

  /** Double-click the beats row at a frame → ADD a beat there (the row
   * is the entry point — 2026-08-16: "it looks blank and unaddable";
   * the buried rail "+" was the ONLY path). The CALL whose span owns
   * the frame is the authoring call: text-mode → its text heads
   * [start, F) and a new empty beat starts AT F (degenerate frames
   * promote only — never a 0-frame segment); segment-mode → the
   * segment covering F splits at F (its text stays in the head half);
   * a frame in a GAP or past the last segment appends an empty beat to
   * the next bound. New beats stay INSIDE their call — crossing is a
   * deliberate span edit (setBeatSegment), never an add. The new beat
   * AUTO-SELECTS (the sidebar shifts straight into its editor). */
  const handleBeatAdd = (frame: number) => {
    const i = calls.findIndex((c) => c.start_frame <= frame && frame < c.end_frame)
    if (i < 0) return
    const call = calls[i]!
    const segs = call.beats ? [...call.beats] : []
    const next = [...calls]
    if (segs.length === 0) {
      const head = { text: call.text ?? "", start_frame: call.start_frame, end_frame: call.end_frame }
      if (frame > call.start_frame && frame < call.end_frame) {
        next[i] = {
          ...call,
          text: undefined,
          beats: [{ ...head, end_frame: frame }, { text: "", start_frame: frame, end_frame: call.end_frame }],
        }
        setCalls(next)
        setSelected({ callIdx: i, beatIdx: 1 })
      } else {
        next[i] = { ...call, text: undefined, beats: [head] }
        setCalls(next)
        setSelected({ callIdx: i, beatIdx: 0 })
      }
      return
    }
    // Segment mode: split the covering segment at the frame.
    const k = segs.findIndex((s) => s.start_frame < frame && frame < s.end_frame)
    if (k >= 0) {
      const s = segs[k]!
      next[i] = {
        ...call,
        beats: [
          ...segs.slice(0, k),
          { ...s, end_frame: frame },
          { text: "", start_frame: frame, end_frame: s.end_frame },
          ...segs.slice(k + 1),
        ],
      }
      setCalls(next)
      setSelected({ callIdx: i, beatIdx: k + 1 })
      return
    }
    // A gap (or past the last segment): append an empty beat up to
    // the next bound. Exactly ON a bound → no-op (never 0 frames).
    const bound = segs.find((s) => s.start_frame >= frame)?.start_frame ?? call.end_frame
    if (frame < bound) {
      next[i] = { ...call, beats: [...segs, { text: "", start_frame: frame, end_frame: bound }] }
      setCalls(next)
      setSelected({ callIdx: i, beatIdx: segs.length })
    }
  }

  /** Add a segment to call i. First click on a text-mode call promotes
   * its text into segment 0 (lossless — a lone full-span segment
   * serializes back to `text`; an EMPTY call promotes to one empty
   * segment — the amber TODO — the + is never a no-op). Later clicks:
   * room after the last segment → the new segment fills the gap (start
   * = last end, end = the call's end); no room → the last segment's
   * tail half splits into the new empty one (any ≥2-frame segment can
   * halve; a 1-frame segment is already minimal → no-op). The segments
   * never overlap a sibling; the free edges may cross a boundary
   * (setBeatSegment). */
  const addBeatSegment = (i: number) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = prev[i]!
      const segs = call.beats ? [...call.beats] : []
      const next = [...prev]
      if (segs.length === 0) {
        const promo = [{ text: call.text ?? "", start_frame: call.start_frame, end_frame: call.end_frame }]
        next[i] = { ...call, text: undefined, beats: promo }
        return next
      }
      const last = segs[segs.length - 1]!
      if (last.end_frame < call.end_frame) {
        next[i] = {
          ...call,
          beats: [...segs, { text: "", start_frame: last.end_frame, end_frame: call.end_frame }],
        }
        return next
      }
      const split = Math.min(
        last.end_frame - 1,
        last.start_frame + Math.max(1, Math.floor((last.end_frame - last.start_frame) / 2)),
      )
      if (split <= last.start_frame) return prev
      next[i] = {
        ...call,
        beats: [
          ...segs.slice(0, -1),
          { ...last, end_frame: split },
          { text: "", start_frame: split, end_frame: last.end_frame },
        ],
      }
      return next
    })
  }

  /** Edit one segment (text or span). Spans follow the compiler's rules
   * (2026-08-16 crossing): a segment keeps ≥1 frame inside its OWN call
   * (ownership) and may CROSS a call boundary at its free edges — the
   * FIRST segment's start, the LAST segment's end. The user authors one
   * unbroken bar; the compiler slices it at the window cut with
   * re-based markers (never a manual slice). Never leaves the timeline,
   * never overlaps a sibling. */
  const setBeatSegment = (i: number, j: number, patch: Partial<DocBeatSegment>) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = prev[i]!
      const segs = call.beats ?? []
      if (j < 0 || j >= segs.length) return prev
      const seg = segs[j]!
      const nextSeg = { ...seg, ...patch }
      const timelineEnd = prev[prev.length - 1]!.end_frame
      if (patch.start_frame !== undefined) {
        // The free LEFT edge (segment 0) may cross into the previous
        // call, down to frame 0; interior edges stop at the sibling.
        const min = j === 0 ? 0 : segs[j - 1]!.end_frame
        nextSeg.start_frame = Math.min(Math.max(nextSeg.start_frame, min), seg.end_frame - 1)
        // Ownership: never slide the whole bar out of its call.
        if (j === 0) nextSeg.start_frame = Math.min(nextSeg.start_frame, call.end_frame - 1)
      }
      if (patch.end_frame !== undefined) {
        // The free RIGHT edge (the last segment) may cross into the
        // next call, up to the timeline end; interior edges stop at the
        // sibling.
        const max = j === segs.length - 1 ? timelineEnd : segs[j + 1]!.start_frame
        nextSeg.end_frame = Math.max(nextSeg.end_frame, seg.start_frame + 1)
        if (nextSeg.end_frame > max) nextSeg.end_frame = max
        // Ownership: the bar always keeps a frame inside its call.
        if (j === segs.length - 1) nextSeg.end_frame = Math.max(nextSeg.end_frame, call.start_frame + 1)
      }
      if (nextSeg.text === seg.text
          && nextSeg.start_frame === seg.start_frame
          && nextSeg.end_frame === seg.end_frame) return prev
      const newSegs = segs.map((s, k) => (k === j ? nextSeg : s))
      const next = [...prev]
      next[i] = { ...call, beats: newSegs }
      return next
    })
  }

  /** Delete one segment. Deleting the last one returns the call to text
   * mode (empty — the visible-TODO state, never a silent prompt). */
  const deleteBeatSegment = (i: number, j: number) => {
    setCalls((prev) => {
      if (i < 0 || i >= prev.length) return prev
      const call = prev[i]!
      const segs = call.beats ?? []
      if (j < 0 || j >= segs.length) return prev
      const newSegs = segs.filter((_, k) => k !== j)
      const next = [...prev]
      next[i] = {
        ...call,
        beats: newSegs.length ? newSegs : undefined,
        text: newSegs.length ? undefined : (call.text ?? ""),
      }
      return next
    })
  }
  // ── Keyframe gestures (legacy/frame-exact escape hatch — beats carry
  // their guides now; hand keyframes render + edit only when present) ─────

  const handleKeyframeAdd = (trackId: string, frame: number): string => {
    const kind = KIND_OF_TRACK[trackId] ?? "image"
    // Return the index-derived uuid of the slot the new keyframe will
    // occupy (the bar binds the diamond to it immediately).
    const id = `kf-${keyframes.length}`
    setKeyframes((prev) => [...prev, { frame, kind, source: "" }])
    return id
  }

  const handleKeyframeMove = (id: string, frame: number) => {
    const i = kfIndexOf(id)
    setKeyframes((prev) => {
      if (i < 0 || i >= prev.length || prev[i]!.frame === frame) return prev
      const next = [...prev]
      next[i] = { ...prev[i]!, frame }
      return next
    })
  }

  const handleKeyframeDelete = (id: string) => {
    const i = kfIndexOf(id)
    setKeyframes((prev) => (i < 0 || i >= prev.length ? prev : prev.filter((_, j) => j !== i)))
  }

  const setKeyframeSource = (i: number, source: string) => {
    setKeyframes((prev) => {
      if (i < 0 || i >= prev.length || prev[i]!.source === source) return prev
      const next = [...prev]
      next[i] = { ...prev[i]!, source }
      return next
    })
  }
  return {
    handleBeatAdd, addBeatSegment, setBeatSegment, deleteBeatSegment,
    handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource,
  }
}
