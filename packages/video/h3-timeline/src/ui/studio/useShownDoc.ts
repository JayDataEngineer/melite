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
import { serializeCalls, serializeKeyframes, corruptCallsField } from "./docCalls.ts"
import {
  liveOps, overlayDoc, projectDoc, canonicalJson,
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
  /** The write door. May return `false` to REFUSE the statement
   * (P7, 2026-10-27): a refused write never rides the op overlay —
   * the studio shows what the bench holds, never a stated-value
   * lie. A void/undefined return is not a refusal. A PROMISE settles
   * the async fence's own answer (P8, 2026-10-15, the ghost cure):
   * `false` — or a rejection — retracts the op this commit appended,
   * so a write the bench refused past its rebase budget cannot haunt
   * the overlay as a stranded max-seq live op; anything else leaves
   * retirement to the durable doc as before. */
  onSave: (params: Record<string, unknown>) => boolean | void | Promise<boolean | void>,
) {
  const projected: ProjectedDoc = useMemo(
    () => projectDoc(stage.params as Record<string, unknown> | undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // canonical digest (A1): key-order-only refresh churn must not
    // reproject — and must not MISS a settle whose keys reordered.
    [canonicalJson(stage.params)],
  )
  const [ops, setOps] = useState<PendingOp[]>([])
  const seqRef = useRef(0)
  // LIVE REFS (the within-tick composer): two gestures in one tick
  // must compose (the mirror's setState queue did) — writers read
  // the overlay of the CURRENT refs, never a render-captured copy.
  const projectedRef = useRef(projected)
  projectedRef.current = projected
  // The persisted raw (the delete ride's base, P2): at gesture time
  // this is the pre-settlement doc — serializeLayerA emits the
  // door's explicit null for base keys the state just cleared.
  const baseRef = useRef<Record<string, unknown> | undefined>(stage.params as Record<string, unknown> | undefined)
  baseRef.current = stage.params as Record<string, unknown> | undefined
  const opsRef = useRef(ops)
  opsRef.current = ops

  // A stage switch clears the transient half DURING RENDER (P6,
  // 2026-10-27): ops state another stage's gestures, and clearing
  // them in an effect let stage B's FIRST frame overlay stage A's
  // still-live op (one frame of wrong content — the flash). The
  // same-component setState-during-render is React's own pattern:
  // the re-render happens before the commit, so no frame ever
  // shows A's content on B. The starter persist stays in the
  // EFFECT below (onSave during render would be a side effect in a
  // presenter — stroke 41's law, moved from the deleted persist
  // arm; the sentinel below is its verbatim guard).
  const stageIdRef = useRef(stage.id)
  if (stageIdRef.current !== stage.id) {
    stageIdRef.current = stage.id
    opsRef.current = []
    setOps([])
  }
  const params = stage.params as Record<string, unknown> | undefined
  const rawList: unknown = Array.isArray(params?.calls) && (params?.calls as unknown[]).length > 0
    ? params?.calls
    : Array.isArray(params?.beats) && (params?.beats as unknown[]).length > 0
      ? params?.beats
      : null
  // THE ARRIVAL LAW (H2, 2026-10-27): a doc that GAINS calls content
  // displaces the provisional view. The starter op (and any op
  // composed over it while the doc was absent) was provisional — a
  // durable doc carrying real calls supersedes it, in the same
  // during-render seat as the switch clear: the FIRST frame after
  // arrival shows the doc verbatim, never one masked frame.
  const docArrivedRef = useRef(rawList !== null)
  if (!docArrivedRef.current && rawList !== null) {
    docArrivedRef.current = true
    opsRef.current = opsRef.current.filter((o) => o.channel !== "calls")
    setOps(opsRef.current)
  } else if (docArrivedRef.current && rawList === null) {
    docArrivedRef.current = false
  }
  const starterOwed = rawList === null
    && corruptCallsField({ calls: params?.calls, beats: params?.beats }) === null
  useEffect(() => {
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

  /** Retract one appended op by its commit order (the P8 async arm —
   *  a mount-local helper, never a render read: refs stay the
   *  within-tick truth, state follows). */
  function dropOp(seq: number): void {
    opsRef.current = opsRef.current.filter((o) => o.seq !== seq)
    setOps(opsRef.current)
  }

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
    // Canonical digest (A1) — key order is not a statement.
    if (canonicalJson(payload) === canonicalJson(serialize(prev))) return
    // P7: a door that answers `false` refused the statement — the
    // op never rides (no overlay of a write the bench lacks).
    const answer = onSave(channelPayload(channel, payload))
    if (answer === false) return
    const op: PendingOp = { channel, value: payload, seq: seqRef.current++ }
    const seq = op.seq
    // THE ANCESTOR PRUNE (P8, 2026-10-15, the ghost cure, half one):
    // latest-per-channel wins the overlay, and the superseded ops are
    // DROPPED with the successor — a failed op a later gesture already
    // restated must not outlive it: retirement is content-compared, so
    // the dead value (never contained by the doc) would otherwise sit
    // max-seq live forever, masking every later settlement — the
    // permanent one-gesture-behind ghost.
    opsRef.current = [...opsRef.current.filter((o) => o.channel !== channel), op]
    setOps(opsRef.current)
    // THE ASYNC RETRACTION (P8, half two): the fence's late answer —
    // a refused coalesced write retracts exactly the op it carried.
    // A rejection retracts too (a door that throws refused louder
    // than false). Anything else keeps the op for the doc to retire.
    if (answer instanceof Promise) {
      void answer.then(
        (landed) => { if (landed === false) dropOp(seq) },
        () => { dropOp(seq) },
      )
    }
  }

  const updateCalls = useMemo(
    () => commit<DocCall[]>("calls", serializeCalls, (d) => d.calls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )
  const updateKeyframes = useMemo(
    // THE SORTED-WRITE LAW: the door payload rides serializeKeyframes —
    // vocabulary-only rows, sorted by frame (the retirement digest is
    // order-sensitive; both doors share the one serializer).
    () => commit<DocKeyframe[]>("keyframes", serializeKeyframes, (d) => d.keyframes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSave],
  )
  const updateLayerA = useMemo(
    // The delete ride's base: the persisted raw AT GESTURE TIME
    // (P2) — a cleared key emits the door's explicit null.
    () => commit<LayerA>("layerA", (v) => serializeLayerA(v, baseRef.current), (d) => d.layerA),
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
