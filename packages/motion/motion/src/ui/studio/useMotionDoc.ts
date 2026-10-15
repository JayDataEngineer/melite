/**
 * useMotionDoc — the one-truth hook (the h3-timeline useShownDoc pattern
 * ported to motion's channels; nativity audit F7, 2026-11-05).
 *
 * THE LAW (DSH doc law: presenters are pure functions of durable truth;
 * the adapter owns writes; live incrementality is transient and marked):
 * the bench doc (stage.params) is the ONLY document state. This hook
 * holds NO mirror — it projects the row (projectMotionDoc), overlays the
 * transient op log (overlayMotionDoc), and commits every gesture
 * straight through onSave while appending the exact channel statement as
 * an op. An op retires when the durable doc itself contains it, so an
 * external bench write re-hydrates naturally (the projection re-reads
 * stage.params on every change — there is no once-only hydration gate).
 * No guard, no echo ref, no seed-once latch — a stale refresh cannot
 * rewrite stated content because there is no second state to rewrite.
 *
 * REPLACES the tlPrompts/tlKeyframes/tlIntervals/constraintPayloads
 * mirrors, the once-only constraints hydration + didHydratePrompts seed
 * latch, the echo-guard persist effects, and the derived `prompt`
 * write-back (the prompts door now carries motion_prompts + prompt in
 * ONE fused statement).
 */
import { useMemo, useRef, useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import type { MotionConstraint } from "@melite/formats/motionConstraints"
import {
  canonicalJson, healPrompts, liveOps, overlayMotionDoc, projectMotionDoc,
  promptsSettle, serializeConstraintsParam, serializePromptsParams, supersedeOps,
  type MotionDoc, type PendingOp, type SettleCtx, type SemanticPromptRow,
} from "./motionDoc.ts"

export interface MotionDocHooks {
  /** The shown document: the projection with the live ops applied. */
  shown: MotionDoc
  /** The prompts channel's write door. The updater receives the shown
   *  rows; the commit heals overlaps, derives the fused wire params
   *  (motion_prompts + prompt), and skips no-op statements. */
  commitPrompts: (update: (prev: TimelinePrompt[]) => TimelinePrompt[]) => void
  /** The constraints channel's write door (keyframes + payloads commit
   *  as one statement — the wire's own granularity). */
  commitConstraints: (update: (prev: MotionDoc) => MotionDoc) => void
}

export function useMotionDoc(
  stage: CardStage,
  onSave: (params: Record<string, unknown>) => void,
  fps: number,
  targetT: number,
): MotionDocHooks {
  const projected: MotionDoc = useMemo(
    () => projectMotionDoc(stage.params as Record<string, unknown> | undefined, fps, targetT),
    // canonical digest (the h3 A1 law): key-order-only refresh churn must
    // not reproject — and must not MISS a settle whose keys reordered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canonicalJson(stage.params), fps, targetT],
  )
  const [ops, setOps] = useState<PendingOp[]>([])
  const seqRef = useRef(0)
  // LIVE REFS (the within-tick composer): two gestures in one tick must
  // compose — writers read the overlay of the CURRENT refs, never a
  // render-captured copy.
  const projectedRef = useRef(projected)
  projectedRef.current = projected
  const opsRef = useRef(ops)
  opsRef.current = ops
  const fpsRef = useRef(fps)
  fpsRef.current = fps
  // The settlement context is LIVE: retirement normalizes in doc space at
  // the CURRENT envelope, so an op settled by the doc retires however the
  // envelope has since moved (the stretch law applied to both sides).
  const settleCtxRef = useRef<SettleCtx>({ fps, targetT })
  settleCtxRef.current = { fps, targetT }

  const shownOf = (): MotionDoc => {
    const base = projectedRef.current
    return overlayMotionDoc(base, liveOps(base, opsRef.current, settleCtxRef.current), settleCtxRef.current)
  }

  // A stage switch clears the transient half DURING RENDER (the h3 P6
  // law): ops state another stage's gestures, and clearing them in an
  // effect let stage B's FIRST frame overlay stage A's still-live op.
  const stageIdRef = useRef(stage.id)
  if (stageIdRef.current !== stage.id) {
    stageIdRef.current = stage.id
    opsRef.current = []
    setOps([])
  }

  const live = useMemo(
    () => liveOps(projected, ops, settleCtxRef.current),
    [projected, ops, fps, targetT],
  )
  const shown: MotionDoc = useMemo(() => overlayMotionDoc(projected, live, settleCtxRef.current), [projected, live, fps, targetT])

  const appendOp = (op: PendingOp): void => {
    opsRef.current = supersedeOps(opsRef.current, op)
    setOps(opsRef.current)
  }

  const commitPrompts = useMemo(
    () => (update: (prev: TimelinePrompt[]) => TimelinePrompt[]): void => {
      const prevRows = shownOf().prompts
      // THE NO-OVERLAP HEAL rides the write door: every committed shape
      // is a strict sequence (the dead untangle effect's law, kept).
      const next = healPrompts(update(prevRows))
      const semantic: SemanticPromptRow[] = next.map((p) => ({ text: p.text, start_frame: p.start_frame, end_frame: p.end_frame }))
      // THE NO-OP LAW: an update that states nothing sends nothing,
      // appends nothing. The NEXT side normalizes through the SAME
      // settlement law as retirement (promptsSettle); the PREV side is
      // already doc space (the projection). A statement the wire cannot
      // express (a single-card resize below the 2-segment threshold) is
      // a no-op, never a wedge-forever op.
      const prevSemantic: SemanticPromptRow[] = prevRows.map((p) => ({ text: p.text, start_frame: p.start_frame, end_frame: p.end_frame }))
      if (canonicalJson(promptsSettle(semantic, settleCtxRef.current)) === canonicalJson(prevSemantic)) return
      onSave(serializePromptsParams(next, fpsRef.current))
      appendOp({ channel: "prompts", value: semantic, seq: seqRef.current++ })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )

  const commitConstraints = useMemo(
    () => (update: (prev: MotionDoc) => MotionDoc): void => {
      const prevDoc = shownOf()
      const nextDoc = update(prevDoc)
      const wire = serializeConstraintsParam(nextDoc)
      if (wire === serializeConstraintsParam(prevDoc)) return
      onSave({ motion_constraints: wire })
      appendOp({ channel: "constraints", value: wire, seq: seqRef.current++ })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )

  return { shown, commitPrompts, commitConstraints }
}
