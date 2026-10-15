/**
 * useTimelineEnvelope — the authoring envelope math (baseT/targetT +
 * pull-the-tail extend). The doc cluster that used to live beside it —
 * the once-only constraints hydration, the didHydratePrompts seed latch,
 * the rescale guard, and the two echo-guard persist effects — died in
 * the one-truth rework (2026-11-05, nativity audit F7): the doc is
 * projected by useMotionDoc from stage.params (external writes
 * re-hydrate naturally), persistence rides the gesture commits, and the
 * seed is the projection's own default. What remains here is the frame
 * envelope: the real run's T once a motion exists, else the form's
 * duration_sec × fps, plus the pull-the-tail override that extends the
 * envelope and syncs duration_sec.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MotionNpz } from "@melite/formats"
import type { CardStage } from "@melite/contracts"
import type { ToastFn } from "./useMotionStage.ts"

export interface TimelineEnvelopeArgs {
  stage: CardStage
  effectiveNpz: MotionNpz | null
  onSave: (params: Record<string, unknown>) => void
  toast: ToastFn
}

export function useTimelineEnvelope({
  stage, effectiveNpz, onSave, toast,
}: TimelineEnvelopeArgs) {
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
  const onTimelineExtend = useCallback((newTotal: number) => {
    const t = Math.max(1, Math.floor(newTotal))
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

  return { targetT, onTimelineExtend }
}
