/**
 * useTimelineEnvelope — the timeline synthesis + persistence cluster moved
 * verbatim from `component.tsx` (MotionCardEditor lines ~1189–1372).
 *
 * Owns: persisted-constraints hydration, the authoring envelope
 * (baseT/tlExtendT/targetT + pull-the-tail extend), the prompt seed effect
 * with THE AUTHORING GUARD (promptsAuthoredRef law — a late envelope settle
 * never rewrites authored frames), the no-overlap heal, and the two persist
 * effects (constraints + prompts → stage.params).
 *
 * Owns no primitive authoring state (the remnant orchestrates all
 * useState/useRef); promptsAuthoredRef is shared and passed in, the rest of
 * the envelope refs live here. Behavior is IDENTICAL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type * as React from "react"
import type { MotionNpz } from "@melite/formats"
import type {
  TimelineInterval, TimelineKeyframe, TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import {
  hydrateConstraints, hydrateMotionPrompts, serializeConstraints,
  serializeMotionPrompts, untanglePrompts,
  MOTION_CONSTRAINTS_PARAM, MOTION_PROMPTS_PARAM,
  type MotionConstraint,
} from "@melite/formats/motionConstraints"
import type { CardStage } from "@melite/contracts"
import type { ToastFn } from "./useMotionStage.ts"

export interface TimelineEnvelopeArgs {
  stage: CardStage
  effectiveNpz: MotionNpz | null
  onSave: (params: Record<string, unknown>) => void
  toast: ToastFn
  promptsAuthoredRef: React.MutableRefObject<boolean>
  tlPrompts: TimelinePrompt[]
  setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>
  tlKeyframes: TimelineKeyframe[]
  setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>
  constraintPayloads: Record<string, MotionConstraint>
  setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>
  setTlIntervals: React.Dispatch<React.SetStateAction<TimelineInterval[]>>
}

export function useTimelineEnvelope({
  stage, effectiveNpz, onSave, toast, promptsAuthoredRef,
  tlPrompts, setTlPrompts, tlKeyframes, setTlKeyframes,
  constraintPayloads, setConstraintPayloads, setTlIntervals,
}: TimelineEnvelopeArgs) {
  // Hydrate persisted constraints ONCE per card (stage.id). The
  // motion_constraints param holds the serialized keyframes + pose payloads
  // from a prior session; without this the bar would reset on every reload
  // (flow UX hard rule: persist always). Tolerant of a missing/corrupt
  // param — hydrateConstraints returns null → empty state, never a crash.
  useEffect(() => {
    const raw = stage.params?.[MOTION_CONSTRAINTS_PARAM]
    const hydrated = raw ? hydrateConstraints(raw) : null
    if (hydrated) {
      setTlKeyframes(hydrated.keyframes as TimelineKeyframe[])
      setConstraintPayloads(hydrated.payloads)
    } else {
      setTlKeyframes([])
      setConstraintPayloads({})
    }
    setTlIntervals([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id, setTlKeyframes, setConstraintPayloads, setTlIntervals])

  // Seed the prompts row whenever the target frame count changes (default
  // duration before any run, the real T after). One EMPTY prompt spans
  // [0, targetT-1]; the user types INTO it (dblclick → contentEditable) and
  // can split/resize/append more cards in the timeline.
  // NOTE: constraints (tlKeyframes + constraintPayloads) are NOT cleared on
  // a new motion — they're the authoring surface that survives re-runs and
  // drives the NEXT generation (matching the demo's session.constraints,
  // which persist across Generate clicks). The backend drops frames outside
  // the new motion's range (generation.py:52), so stale frames are safe.
  // The frame count the timeline + seed operate on: the real run's T once a
  // motion exists, else the form's duration_sec × fps (default 5s × 30 = 150)
  // so the user can author + Generate BEFORE any GPU inference. The rest
  // pose (T=1) is the playback fallback, NOT the authoring envelope.
  const baseT = useMemo(() => {
    if (effectiveNpz && effectiveNpz.T > 1) return effectiveNpz.T
    const d = typeof stage.params?.duration_sec === "number" ? stage.params.duration_sec : 5.0
    return Math.max(1, Math.round(d * 30))
  }, [effectiveNpz, stage.params?.duration_sec])
  // PULL-THE-TAIL (2026-08-14, DaVinci Resolve model): the envelope is no
  // longer a wall. Dragging the LAST prompt card's right edge past the end
  // EXTENDS the timeline (tlExtendT override) and syncs the form's
  // duration_sec so the next Run generates the longer motion — the pose
  // studio's own rule: "the furthest clip end IS the animation, nothing
  // beyond the bubbles exists" (useTextToPoseStudio rangeSec). Without this
  // the scrollbar dead-ends at the authored duration ("stuck at 5 seconds").
  // The override only ever WINS over baseT until baseT catches up (the
  // duration save or a new run), then it clears — so shrinking duration in
  // the form later still works.
  const [tlExtendT, setTlExtendT] = useState(0)
  const targetT = Math.max(baseT, tlExtendT)
  useEffect(() => { setTlExtendT(0) }, [baseT])
  const lastExtendToastRef = useRef(0)
  const lastSeededT = useRef<number>(-1)
  const onTimelineExtend = useCallback((newTotal: number) => {
    const t = Math.max(1, Math.floor(newTotal))
    // Mark the new envelope as seeded so the [targetT] effect below does NOT
    // proportionally rescale the prompt cards (that effect is for envelope
    // CHANGES from outside — a new run's T — not for a tail the user pulled).
    lastSeededT.current = t
    setTlExtendT(t)
    onSave({ duration_sec: t / 30 })
    // VISIBLE SIGNAL (2026-08-14): a continuous pull fires onExtend on every
    // pointermove — throttle to one toast/second so the drag doesn't spam.
    const now = Date.now()
    if (now - lastExtendToastRef.current > 1000) {
      lastExtendToastRef.current = now
      toast("info", `Timeline extended to ${(t / 30).toFixed(1)}s`)
    }
  }, [onSave, toast])
  const didHydratePrompts = useRef(false)
  // THE AUTHORING GUARD (hour 15 flake fix): once the user has authored
  // the prompts row (any gesture or edit verb), a later envelope settle
  // (the async npz's real T landing after the default duration's T) must
  // NOT rewrite their frames — the rescale below maps round(1 * 4/150)
  // back to 0, silently erasing a committed drag. Same law the hydrate
  // branch above already documents: authored state is never re-seeded.
  useEffect(() => {
    // First mount: try to hydrate from persisted params.
    if (!didHydratePrompts.current) {
      didHydratePrompts.current = true
      const fps = effectiveNpz?.fps ?? 30
      const raw = stage.params?.[MOTION_PROMPTS_PARAM]
      const hydrated = hydrateMotionPrompts(raw, fps, targetT)
      if (hydrated && hydrated.length > 0) {
        lastSeededT.current = targetT
        setTlPrompts(hydrated.map((s, i): TimelinePrompt => ({
          uuid: `motion-prompt-${i}-${Date.now()}`,
          text: s.text,
          start_frame: s.start_frame,
          end_frame: s.end_frame,
          color: null,
        })))
        return
      }
      // No multi-segment payload → check single `prompt` param for text.
      const singlePrompt = typeof stage.params?.prompt === "string" ? stage.params.prompt : ""
      lastSeededT.current = targetT
      setTlPrompts([{ uuid: "motion-prompt", text: singlePrompt, start_frame: 0, end_frame: Math.max(0, targetT - 1), color: null }])
      return
    }
    // Subsequent targetT changes (e.g. after a new run produces a different T):
    // rescale existing prompts to the new range, don't wipe them.
    if (targetT === lastSeededT.current) return
    lastSeededT.current = targetT
    if (promptsAuthoredRef.current) return // authored frames survive settles
    setTlPrompts((prev) => {
      /* v8 ignore next 4 -- the seed prompt always exists before any rescale (probe 2026-09-19) */
      if (prev.length === 0) {
        return [{ uuid: "motion-prompt", text: "", start_frame: 0, end_frame: Math.max(0, targetT - 1), color: null }]
      }
      // Rescale: map [0, oldT-1] → [0, newT-1] proportionally.
      const oldT = prev.reduce((max, p) => Math.max(max, p.end_frame), 0) + 1
      /* v8 ignore next 1 -- end_frame ≥ 0 from every constructor ⟹ oldT ≥ 1 (probe 2026-09-19) */
      if (oldT <= 0) return prev
      const scale = targetT / oldT
      return prev.map((p) => ({
        ...p,
        start_frame: Math.round(p.start_frame * scale),
        end_frame: Math.min(targetT - 1, Math.round((p.end_frame + 1) * scale) - 1),
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetT])

  // NO-OVERLAP HEAL (2026-08-15, "the prompt cards can overlap — they get
  // tangled; they should automatically get untangled"): the bar clamps every
  // gesture so crossings can't be DRAGGED into being, but other writers exist
  // — the envelope rescale above rounds frames (Math.round can land two cards
  // on the same frame), legacy persisted params, future code. This effect is
  // the invariant itself: any tlPrompts that overlap get pushed into a strict
  // sequence (order + duration preserved, nothing truncated). CANNOT LOOP:
  // untanglePrompts returns the SAME array reference when the state is already
  // clean, so the setState settles on the first pass.
  useEffect(() => {
    setTlPrompts((prev) => untanglePrompts(prev))
  }, [tlPrompts, setTlPrompts])

  // Persist constraints to stage.params whenever they change. Guarded by a
  // last-serialized ref to avoid a write loop (onSave → stage.params change
  // → re-render → this effect). The serialized JSON is BOTH the persistence
  // form and the backend transport form: compile.ts accepts
  // motion_constraints (it's in the kimodo_motion family signature now), so
  // on Run it reaches melite-kimodo-nodes, which deserializes it into
  // FullBodyConstraintSet/EndEffectorConstraintSet/Root2DConstraintSet and
  // feeds raw()'s constraint_lst. This is what makes the bar DRIVE generation.
  const lastPersistedRef = useRef<string>("")
  useEffect(() => {
    const json = serializeConstraints(
      tlKeyframes.map((k) => ({ uuid: k.uuid, track_id: k.track_id, frame: k.frame })),
      constraintPayloads,
    )
    const isEmpty = !json.fullbody && !json.end_effectors && !json.root2d
    const candidate = isEmpty ? "" : JSON.stringify(json)
    if (candidate === lastPersistedRef.current) return
    lastPersistedRef.current = candidate
    // BUGFIX (2026-08-14): save `candidate` (the STRING), NOT `json` (the
    // object). The backend kimodo_motion signature declares
    // motion_constraints: str — an object fails Pydantic validation with
    // "Input should be a valid string" and crashes the whole flow.
    // Previously this passed `json` (the MotionConstraintsJSON object),
    // ignoring the `candidate = JSON.stringify(json)` computed one line
    // above — the stringified form never reached stage.params.
    onSave({ [MOTION_CONSTRAINTS_PARAM]: candidate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tlKeyframes, constraintPayloads, onSave])

  // Persist the timeline's PROMPT segments to stage.params.motion_prompts.
  // This is the demo's primary authoring surface: each prompt segment is a
  // motion "card" stitched into one multi-segment clip. serializeMotionPrompts
  // applies the demo's frame→duration convention and returns "" below the
  // 2-segment override threshold (the single `prompt` param covers that case).
  // Guarded by its own ref so it doesn't loop or fight the constraints effect.
  const lastPromptsPersistedRef = useRef<string>("")
  useEffect(() => {
    const fps = effectiveNpz?.fps ?? 30
    const candidate = serializeMotionPrompts(tlPrompts, fps)
    if (candidate === lastPromptsPersistedRef.current) return
    lastPromptsPersistedRef.current = candidate
    onSave({ [MOTION_PROMPTS_PARAM]: candidate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tlPrompts, effectiveNpz, onSave])

  return { baseT, targetT, onTimelineExtend }
}
