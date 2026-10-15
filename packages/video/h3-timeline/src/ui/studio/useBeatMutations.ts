/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react"
import type { DocKeyframe } from "./docModel.ts"
import { kfIndexOf } from "./docCalls.ts"
import { patchAt } from "./docPatch.ts"

/** Keyframe gestures — the pin channel's writers (the lane's slices
 *  1–3: doc model + spine riders first, the drag/lane UI lands on
 *  top). Every write rides patchAt (the single-index patch spine). */
export function useBeatMutations(
  keyframes: DocKeyframe[],
  setKeyframes: Dispatch<SetStateAction<DocKeyframe[]>>,
) {
  // (2026-09-15, the operator's cut: NO prompt segments, NO prompt
  // beats — the four segment mutators (handleBeatAdd / addBeatSegment
  // / setBeatSegment / deleteBeatSegment) are deleted; the call's
  // prompt is ONE textarea. This hook owns the keyframe gestures.)

  // ── Keyframe gestures (the pin channel: image pins at film-absolute
  // frames; the bar's track argument is the gesture's lane, the channel
  // itself has one pin kind) ─────

  /** (operator 2026-11-05: the keyframes lane works EXACTLY like the
   *  audio inputs — the upload icon lands a pin WITH its image) —
   *  ONE atomic write: the pin and its image ride together, never an
   *  imageless pin followed by a second write (the atomic law). */
  const addKeyframeWithImage = (image: string, frame: number): string => {
    const id = `kf-${keyframes.length}`
    setKeyframes((prev) => [...prev, { image, frame }])
    return id
  }

  const handleKeyframeAdd = (trackId: string, frame: number): string => {
    // Return the index-derived uuid of the slot the new keyframe will
    // occupy (the bar binds the diamond to it immediately).
    const id = `kf-${keyframes.length}`
    setKeyframes((prev) => [...prev, { image: "", frame }])
    return id
  }

  const handleKeyframeMove = (id: string, frame: number) => {
    const i = kfIndexOf(id)
    setKeyframes((prev) => {
      if (i < 0 || i >= prev.length || prev[i]!.frame === frame) return prev
      return patchAt(prev, i, { ...prev[i]!, frame })
    })
  }

  const handleKeyframeDelete = (id: string) => {
    const i = kfIndexOf(id)
    setKeyframes((prev) => (i < 0 || i >= prev.length ? prev : prev.filter((_, j) => j !== i)))
  }

  const setKeyframeImage = (i: number, image: string) => {
    setKeyframes((prev) => {
      if (i < 0 || i >= prev.length || prev[i]!.image === image) return prev
      return patchAt(prev, i, { ...prev[i]!, image })
    })
  }
  return {
    handleKeyframeAdd, addKeyframeWithImage, handleKeyframeMove, handleKeyframeDelete, setKeyframeImage,
  }
}
