/**
 * useShownDoc — THE COLLAPSE (the rework, 2026-10-27: one truth).
 *
 * THE LAW (DSH doc law: presenters are pure functions of durable
 * truth; the adapter owns writes; live incrementality is transient
 * and marked): the bench doc is the ONLY document state. This hook
 * holds NO mirror — it projects the row (projectDoc), overlays the
 * transient op log (overlayDoc), and commits every gesture
 * straight through the adapter (onSave) while appending the exact
 * sent value as an op. An op retires when the durable doc itself
 * contains it. No guard, no resend epoch, no unsettled probe, no
 * touched set — a stale refresh cannot rewrite stated content
 * because there is no second state to rewrite into.
 *
 * REPLACES useDocState (mirror + guard + epoch + probe + touched)
 * and useDocEffects' three persist arms (moved to the gesture).
 * The view-sync thirds (playhead clamp, selection scroll/guard)
 * live in useStudioViewSync — no save, no guards.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CardStage } from "@melite/contracts"
import type { DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { serializeLayerA } from "./docHydrate.ts"
import { serializeCalls, corruptCallsField } from "./docCalls.ts"
import {
  liveOps, overlayDoc, projectDoc,
  type OpChannel, type PendingOp, type ProjectedDoc,
} from "./pendingOps.ts"

function channelPayload(channel: OpChannel, value: unknown): Record<string, unknown> {
  // THE DOOR SHAPES (verbatim from the deleted persist arms):
  // calls/keyframes ride whole arrays; Layer A rides its whole
  // serialized global set (untouched-optional keys absent).
  if (channel === "calls") return { calls: value }
  if (channel === "keyframes") return { keyframes: value }
  return value as Record<string, unknown>
}

export function useShownDoc(
  stage: CardStage,
  onSave: (params: Record<string, unknown>) => void,
) {
  const projected: ProjectedDoc = useMemo(
    () => projectDoc(stage.params as Record<string, unknown> | undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(stage.params)],
  )
  const [ops, setOps] = useState<PendingOp[]>([])
  const seqRef = useRef(0)
  // LIVE REFS (the within-tick composer): two gestures in one tick
  // must compose (the mirror's setState queue did) — writers read
  // the overlay of the CURRENT refs, never a render-captured copy.
  const projectedRef = useRef(projected)
  projectedRef.current = projected
  const opsRef = useRef(ops)
  opsRef.current = ops

  // A stage switch clears the transient half (ops state another
  // stage's gestures) + persists the sticky starter for calls-less
  // stages (stroke 41's law, moved from the deleted persist arm —
  // the sentinel below is its verbatim guard).
  const params = stage.params as Record<string, unknown> | undefined
  const rawList: unknown = Array.isArray(params?.calls) && (params?.calls as unknown[]).length > 0
    ? params?.calls
    : Array.isArray(params?.beats) && (params?.beats as unknown[]).length > 0
      ? params?.beats
      : null
  const starterOwed = rawList === null
    && corruptCallsField({ calls: params?.calls, beats: params?.beats }) === null
  useEffect(() => {
    opsRef.current = []
    setOps([])
    if (starterOwed) {
      const payload = serializeCalls(projectedRef.current.calls)
      onSave({ calls: payload })
      const op: PendingOp = { channel: "calls", value: payload, seq: seqRef.current++ }
      opsRef.current = [op]
      setOps([op])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id])

  const live = useMemo(() => liveOps(projected, ops), [projected, ops])
  const shown: ProjectedDoc = useMemo(() => overlayDoc(projected, live), [projected, live])

  const commit = <V>(
    channel: OpChannel,
    serialize: (v: V) => unknown,
    getShown: (doc: ProjectedDoc) => V,
  ): Dispatch<SetStateAction<V>> => (u) => {
    const prev = getShown(overlayDoc(projectedRef.current, liveOps(projectedRef.current, opsRef.current)))
    const next = typeof u === "function" ? (u as (p: V) => V)(prev) : u
    const payload = serialize(next)
    // THE NO-OP LAW (the mirror's `return prev` arms, by value):
    // an update that states nothing sends nothing, appends nothing.
    if (JSON.stringify(payload) === JSON.stringify(serialize(prev))) return
    onSave(channelPayload(channel, payload))
    const op: PendingOp = { channel, value: payload, seq: seqRef.current++ }
    opsRef.current = [...opsRef.current, op]
    setOps(opsRef.current)
  }

  const updateCalls = useMemo(
    () => commit<DocCall[]>("calls", serializeCalls, (d) => d.calls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )
  const updateKeyframes = useMemo(
    () => commit<DocKeyframe[]>("keyframes", (v) => v.map((k) => ({ ...k })), (d) => d.keyframes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )
  const updateLayerA = useMemo(
    () => commit<LayerA>("layerA", serializeLayerA, (d) => d.layerA),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )
  const setLayerAKey = useMemo(
    () => <K extends keyof LayerA>(k: K, v: LayerA[K]): void => {
      updateLayerA((prev) => (prev[k] === v ? prev : { ...prev, [k]: v }))
    },
    [updateLayerA],
  )

  return { calls: shown.calls, keyframes: shown.keyframes, layerA: shown.layerA, updateCalls, updateKeyframes, updateLayerA, setLayerAKey }
}
