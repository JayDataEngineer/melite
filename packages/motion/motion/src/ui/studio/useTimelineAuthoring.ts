/**
 * useTimelineAuthoring — the timeline authoring verbs, re-homed onto the
 * one-truth commit doors (2026-11-05, nativity audit F7). Every verb is
 * ONE statement through commitConstraints / commitPrompts — there are no
 * mirror setters and no authoring guard: the doc hook owns hydration,
 * persistence, and the shown overlay, so a verb's only job is to compute
 * the next shape. The rescale-guard law ("a late envelope settle never
 * erases an authored drag") holds by construction — there is no effect
 * left that writes the doc channel.
 *
 * Free-variable reads became explicit hook args. Gesture/undo cadence is
 * IDENTICAL (pushUndo on the same verbs, maybePushDragUndo on drags).
 */
import { useCallback } from "react"
import type * as React from "react"
import type { MotionNpz } from "@melite/formats"
import {
  makeTimelineId,
} from "@melite-plugin/timeline/ui/timeline"
import {
  carveNewPromptCard, snapshotConstraint,
} from "@melite/formats/motionConstraints"
import type { ToastFn } from "./useMotionStage.ts"
import type { MotionDocHooks } from "./useMotionDoc.ts"

export type TimelineAuthoringArgs = {
  effectiveNpz: MotionNpz | null
  toast: ToastFn
  pushUndo: () => void
  maybePushDragUndo: (key: string) => void
  targetT: number
  setFrameIdx: React.Dispatch<React.SetStateAction<number>>
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
} & Pick<MotionDocHooks, "commitConstraints" | "commitPrompts">

export function useTimelineAuthoring({
  effectiveNpz, toast, pushUndo, maybePushDragUndo, targetT,
  setFrameIdx, setPlaying, commitConstraints, commitPrompts,
}: TimelineAuthoringArgs) {
  // Scrubbing the bar seeks the viewer + pauses (matching the range slider).
  const handleTimelineFrameChange = useCallback((f: number) => {
    setFrameIdx(f)
    setPlaying(false)
  }, [setFrameIdx, setPlaying])

  // ── Constraint CRUD — every keyframe carries a REAL pose snapshot ────────
  // onKeyframeAdd: double-click a lane → snapshot the motion's current pose
  // at that frame (SOMA-77, meters) into payloads[uuid], then add the lane
  // diamond — one commitConstraints statement (the dot and its payload are
  // one fact). onKeyframeMove updates the frame the constraint applies at
  // (the pose travels with it — matching the demo's drag). Delete evicts
  // both the dot and the payload.
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
    // THE SEAT LAW (the wire's own identity): a keyframe is identified by
    // (track_id, frame) — re-hydration collapses a same-seat pair to one
    // dot. Adding onto an occupied seat UPDATES the seated dot's payload
    // (the stamp path's law), it never emits a dot the wire would drop.
    commitConstraints((prev) => {
      const seated = prev.keyframes.find((k) => k.track_id === trackId && k.frame === payload.frame)
      if (seated) {
        return { ...prev, payloads: { ...prev.payloads, [seated.uuid]: payload } }
      }
      return {
        ...prev,
        keyframes: [...prev.keyframes, { uuid, track_id: trackId, frame: payload.frame, value: null, opacity: 1, locked: false }],
        payloads: { ...prev.payloads, [uuid]: payload },
      }
    })
    return uuid
  }, [effectiveNpz, toast, pushUndo, commitConstraints])
  const onKeyframeMove = useCallback((id: string, frame: number) => {
    const f = Math.max(0, Math.floor(frame))
    maybePushDragUndo(`kf:${id}`)
    commitConstraints((prev) => {
      const p = prev.payloads[id]
      /* v8 ignore next 1 -- keyframes and payloads are written paired; hydrate drops orphans (probe 2026-09-19) */
      if (!p) return { ...prev, keyframes: prev.keyframes.map((k) => (k.uuid === id ? { ...k, frame: f } : k)) }
      return {
        ...prev,
        keyframes: prev.keyframes.map((k) => (k.uuid === id ? { ...k, frame: f } : k)),
        payloads: { ...prev.payloads, [id]: { ...p, frame: f } },
      }
    })
  }, [maybePushDragUndo, commitConstraints])
  const onKeyframeDelete = useCallback((id: string) => {
    pushUndo()
    commitConstraints((prev) => {
      /* v8 ignore next 2 -- keyframes and payloads are written paired
       * and hydrate drops orphans (probe 2026-09-19), so a payload-less
       * delete never reaches the doc door (infra-coverage #10,
       * 2026-11-06: deletion adjudication, same law as the move arm) */
      if (!(id in prev.payloads)) {
        return { ...prev, keyframes: prev.keyframes.filter((k) => k.uuid !== id) }
      }
      const payloads = { ...prev.payloads }
      delete payloads[id]
      return { ...prev, keyframes: prev.keyframes.filter((k) => k.uuid !== id), payloads }
    })
  }, [pushUndo, commitConstraints])
  const onPromptUpdate = useCallback((id: string, text: string) => {
    pushUndo()
    commitPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, text } : p)))
  }, [pushUndo, commitPrompts])
  const onPromptResize = useCallback((id: string, startFrame: number, endFrame: number) => {
    maybePushDragUndo(`pr:${id}`)
    commitPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [maybePushDragUndo, commitPrompts])
  const onPromptMove = useCallback((id: string, startFrame: number, endFrame: number) => {
    maybePushDragUndo(`pm:${id}`)
    commitPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [maybePushDragUndo, commitPrompts])
  const onPromptDelete = useCallback((id: string) => {
    pushUndo()
    commitPrompts((prev) => prev.filter((p) => p.uuid !== id))
  }, [pushUndo, commitPrompts])
  // Add a NEW prompt card to the lane. This is the explicit, discoverable
  // affordance (the seeded prompt fills [0, T-1], so there is no empty
  // tail to click into). carveNewPromptCard splits the last prompt at its
  // midpoint so the new card is contiguous + immediately editable.
  const addPromptCard = useCallback(() => {
    pushUndo()
    commitPrompts((prev) => carveNewPromptCard(prev, targetT))
  }, [targetT, pushUndo, commitPrompts])

  return {
    handleTimelineFrameChange,
    onKeyframeAdd, onKeyframeMove, onKeyframeDelete,
    onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete,
    addPromptCard,
  }
}
