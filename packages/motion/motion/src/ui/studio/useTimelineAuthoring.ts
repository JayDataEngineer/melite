/**
 * useTimelineAuthoring — the timeline authoring verbs moved verbatim from
 * `component.tsx` (MotionCardEditor lines ~1381–1457).
 *
 * Returns the bar's verbs. THE AUTHORING GUARD is preserved EXACTLY:
 * every verb that set `promptsAuthoredRef` inline still sets it here, and
 * the verbs that never set it (keyframe add/move/delete, prompt resize)
 * still don't — the rescale-guard regression test pins the authored-drag
 * law ("a late envelope settle never erases an authored drag").
 *
 * Free-variable reads became explicit hook args. Behavior is IDENTICAL.
 */
import { useCallback } from "react"
import type * as React from "react"
import type { MotionNpz } from "@melite/formats"
import {
  makeTimelineId,
  type TimelineKeyframe, type TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import {
  carveNewPromptCard, snapshotConstraint,
  type MotionConstraint,
} from "@melite/formats/motionConstraints"
import type { ToastFn } from "./useMotionStage"

export interface TimelineAuthoringArgs {
  effectiveNpz: MotionNpz | null
  toast: ToastFn
  pushUndo: () => void
  maybePushDragUndo: (key: string) => void
  promptsAuthoredRef: React.MutableRefObject<boolean>
  targetT: number
  setFrameIdx: React.Dispatch<React.SetStateAction<number>>
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>
  setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>
  setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>
}

export function useTimelineAuthoring({
  effectiveNpz, toast, pushUndo, maybePushDragUndo, promptsAuthoredRef, targetT,
  setFrameIdx, setPlaying, setConstraintPayloads, setTlKeyframes, setTlPrompts,
}: TimelineAuthoringArgs) {
  // Scrubbing the bar seeks the viewer + pauses (matching the range slider).
  const handleTimelineFrameChange = useCallback((f: number) => {
    setFrameIdx(f)
    setPlaying(false)
  }, [setFrameIdx, setPlaying])

  // ── Constraint CRUD — every keyframe carries a REAL pose snapshot ────────
  // onKeyframeAdd: double-click a lane → snapshot the motion's current pose
  // at that frame (SOMA-77, meters) into constraintPayloads[uuid], then add
  // the lane diamond. This is the functional core: the dot IS a pose constraint,
  // not a null shell. onKeyframeMove updates the frame the constraint applies
  // at (the pose travels with it — matching the demo's drag). Delete
  // evicts both the dot and the payload.
  const onKeyframeAdd = useCallback((trackId: string, frame: number): string => {
    const uuid = makeTimelineId()
    const src = effectiveNpz
    if (!src) {
      toast("error", "Motion still loading — add a keyframe once the stage is live")
      return uuid
    }
    pushUndo()
    const payload = snapshotConstraint(trackId, frame, src)
    /* v8 ignore next 4 -- all six lane uuids are known constants; hydrate drops orphans (probe 2026-09-19) */
    if (!payload) {
      toast("error", `Unknown constraint lane "${trackId}"`)
      return uuid
    }
    setConstraintPayloads((prev) => ({ ...prev, [uuid]: payload }))
    setTlKeyframes((prev) => [...prev, { uuid, track_id: trackId, frame: payload.frame, value: null, opacity: 1, locked: false }])
    return uuid
  }, [effectiveNpz, toast, pushUndo, setConstraintPayloads, setTlKeyframes])
  const onKeyframeMove = useCallback((id: string, frame: number) => {
    const f = Math.max(0, Math.floor(frame))
    maybePushDragUndo(`kf:${id}`)
    setTlKeyframes((prev) => prev.map((k) => (k.uuid === id ? { ...k, frame: f } : k)))
    setConstraintPayloads((prev) => {
      const p = prev[id]
      /* v8 ignore next 1 -- keyframes and payloads are written paired; hydrate drops orphans (probe 2026-09-19) */
      if (!p) return prev
      return { ...prev, [id]: { ...p, frame: f } }
    })
  }, [maybePushDragUndo, setTlKeyframes, setConstraintPayloads])
  const onKeyframeDelete = useCallback((id: string) => {
    pushUndo()
    setTlKeyframes((prev) => prev.filter((k) => k.uuid !== id))
    setConstraintPayloads((prev) => {
      /* v8 ignore next 1 -- keyframes and payloads are written paired; hydrate drops orphans (probe 2026-09-19) */
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [pushUndo, setTlKeyframes, setConstraintPayloads])
  const onPromptUpdate = useCallback((id: string, text: string) => {
    promptsAuthoredRef.current = true
    pushUndo()
    setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, text } : p)))
  }, [promptsAuthoredRef, pushUndo, setTlPrompts])
  const onPromptResize = useCallback((id: string, startFrame: number, endFrame: number) => {
    maybePushDragUndo(`pr:${id}`)
    setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [maybePushDragUndo, setTlPrompts])
  const onPromptMove = useCallback((id: string, startFrame: number, endFrame: number) => {
    promptsAuthoredRef.current = true
    maybePushDragUndo(`pm:${id}`)
    setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [promptsAuthoredRef, maybePushDragUndo, setTlPrompts])
  const onPromptDelete = useCallback((id: string) => {
    promptsAuthoredRef.current = true
    pushUndo()
    setTlPrompts((prev) => prev.filter((p) => p.uuid !== id))
  }, [promptsAuthoredRef, pushUndo, setTlPrompts])
  // Add a NEW prompt card to the lane. This is the explicit, discoverable
  // affordance (the seeded prompt fills [0, T-1], so there is no empty
  // tail to click into). carveNewPromptCard splits the last prompt at its
  // midpoint so the new card is contiguous + immediately editable.
  const addPromptCard = useCallback(() => {
    promptsAuthoredRef.current = true
    pushUndo()
    setTlPrompts((prev) => carveNewPromptCard(prev, targetT))
  }, [targetT, promptsAuthoredRef, pushUndo, setTlPrompts])

  return {
    handleTimelineFrameChange,
    onKeyframeAdd, onKeyframeMove, onKeyframeDelete,
    onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete,
    addPromptCard,
  }
}
