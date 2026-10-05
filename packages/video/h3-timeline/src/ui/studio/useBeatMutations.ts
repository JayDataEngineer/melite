/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import { KIND_OF_TRACK } from "./docModel.ts"
import type { DocKeyframe } from "./docModel.ts"
import { kfIndexOf } from "./docCalls.ts"

/** Legacy keyframe gestures (tenant §9) — prompt segments cut 2026-09-15. */
export function useBeatMutations(
  keyframes: DocKeyframe[],
  setKeyframes: Dispatch<SetStateAction<DocKeyframe[]>>,
) {
  // (2026-09-15, the operator's cut: NO prompt segments, NO prompt
  // beats — the four segment mutators (handleBeatAdd / addBeatSegment
  // / setBeatSegment / deleteBeatSegment) are deleted; the call's
  // prompt is ONE textarea. This hook now owns the legacy keyframe
  // gestures only.)

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
    handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource,
  }
}
