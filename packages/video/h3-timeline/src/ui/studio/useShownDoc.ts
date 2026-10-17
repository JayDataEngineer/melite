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
 *
 * THE FLIP WRITER (B2, journey-closure 2026-11-06): commit is
 * family-aware — the D8 reseat's ONE owner (useFamilyReseatHeal is
 * deleted with this change, its mount effect dissolved into the
 * gesture). Any commit whose post-gesture doc derives t4r unstamps
 * the T4_ONLY residue in the SAME onSave: the serializer's delete
 * ride nulls each base-carried stamp (B1's one-owner law — the
 * serializer omits the value side, the commit carries the delete
 * side) and the appended layer-A op clears the shown poles. See the
 * commit body for the full contract.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CardStage } from "@melite/contracts"
import { T4_ONLY_KEYS, deriveWindowFamily } from "@melite/models-h3/timelineContract"
import type { DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { mergeDocLayers } from "./docModel.ts"
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

/** THE FLIP WRITER's unstating payload (B2, journey-closure
 * 2026-11-06): the layer with every T4_ONLY member unstated,
 * serialized against the post-gesture base — the door record whose
 * canonical digest differs from the layer's own serialization
 * exactly when a base-carried stamp gains its delete-ride null (B1's
 * gate deletes the value side; only the unstated state can ride the
 * null). The base is the RAW params under the gesture's structural
 * planes (calls/keyframes view arrays overlaid) — never the full
 * shown view: the delete ride reads base KEYS, and the hydrate's own
 * false poles (sharpen_enabled: false on a doc that never carried
 * the key) would read as stamps and null themselves — phantom
 * deletes. The gate still sees the gesture's planes: serializeLayerA
 * derives the family over mergeDocLayers(base, a), and `calls`/
 * `keyframes` — overlaid here — plus the layer's own ref surface (in
 * `a`) give it the post-gesture truth; serialized against the raw
 * params alone the always-emit poles would ride false in the SAME
 * onSave and the saved doc would refuse on them (the flip arm's
 * verdict).
 *
 * @param layer the post-gesture layer A (shown state, gesture included)
 * @param structBase the persisted raw under the gesture's calls/keyframes
 * @returns the unstated plane's door record, or null when the
 *  unstating states nothing (no base stamps; the hydrate's false
 *  poles serialize identically) — the no-churn law, the gesture
 *  rides alone */
function unstatedLayerA(layer: LayerA, structBase: Record<string, unknown>): Record<string, unknown> | null {
  const cured = { ...(layer as unknown as Record<string, unknown>) }
  for (const k of T4_ONLY_KEYS) cured[k] = undefined
  const payload = serializeLayerA(cured as unknown as LayerA, structBase) as Record<string, unknown>
  // THE ALWAYS-EMIT POLES' SETTLEMENT (E2's real-roundtrip finding,
  // 2026-10-17): sharpen_enabled/interpolate_enabled re-emit false
  // from the serializer's first line (docHydrate's always-emit arm)
  // and the family block deletes them in BOTH serializations — the
  // digest gate below can never see their unstating, so on a base
  // that carries the poles (the studio's own first-save shape) the
  // flip gesture stated no delete and the saved doc kept a T4_ONLY
  // member the walk refuses. The unstated plane states its own
  // deletes: every base-carried T4_ONLY member rides the null here,
  // whatever emit shape the serializer gave it — B1's one-owner law
  // holds (the serializer omits; this seam carries the delete side).
  for (const k of T4_ONLY_KEYS) {
    const carried = structBase[k]
    if (carried !== undefined && carried !== null) payload[k] = null
  }
  if (canonicalJson(payload) === canonicalJson(serializeLayerA(layer, structBase))) return null
  return payload
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
    const shownBefore = overlayDoc(projectedRef.current, liveOps(projectedRef.current, opsRef.current))
    const prev = getShown(shownBefore)
    const next = typeof u === "function" ? (u as (p: V) => V)(prev) : u
    let payload = serialize(next)
    // THE NO-OP LAW (the mirror's `return prev` arms, by value):
    // an update that states nothing sends nothing, appends nothing.
    // Canonical digest (A1) — key order is not a statement.
    if (canonicalJson(payload) === canonicalJson(serialize(prev))) return
    // THE FLIP WRITER (B2, journey-closure 2026-11-06 — the D8
    // reseat's ONE owner; useFamilyReseatHeal dissolved here): the
    // family is re-derived over the POST-GESTURE doc — the base
    // under the gesture's planes and every live op (mergeDocLayers,
    // defined-wins, the one spelling the walk reads) — and a
    // derived-t4r result unstamps the T4_ONLY residue in the SAME
    // onSave. serializeLayerA's delete ride nulls each base-carried
    // stamp (B1's one-owner law: the serializer omits the value
    // side, this gesture carries the delete side); the layer-A op
    // appended below clears the shown poles, so the dead rail reads
    // OFF the moment the gesture lands. The unstating serializes
    // against the raw params under the gesture's structural planes —
    // the gate sees the planes without the hydrate's false poles
    // reading as stamps (see unstatedLayerA). A calls/keyframes
    // commit whose unstating is real rides the whole layer-A plane
    // as its second op (the door's own granularity); a layer-A
    // commit folds the unstating into its own single write. The
    // reseat fires only when the unstating CHANGES the payload
    // (unstatedLayerA's canonical no-churn law): a doc the base
    // never stamped states nothing extra. A strand that arrives
    // between gestures (a stamped legacy doc at mount, a settlement
    // that raced this write) has no writer until the next stating
    // gesture and refuses loud at the door — the honest edge the
    // contract wall's flip arm pins.
    const layerNow = (channel === "layerA" ? next : shownBefore.layerA) as LayerA
    const gesturePlanes = {
      calls: channel === "calls" ? (next as DocCall[]) : shownBefore.calls,
      keyframes: channel === "keyframes" ? (next as DocKeyframe[]) : shownBefore.keyframes,
    }
    // the family trigger: the base under the gesture's planes AND the
    // shown layer (the ref surface rides the layer plane — the walk
    // reads it from the merge)
    const reseat = deriveWindowFamily(mergeDocLayers(baseRef.current, {
      ...(layerNow as unknown as Record<string, unknown>),
      ...gesturePlanes,
    })) === "t4r" ? unstatedLayerA(layerNow, mergeDocLayers(baseRef.current, gesturePlanes)) : null
    if (reseat !== null && channel === "layerA") payload = reseat
    // P7: a door that answers `false` refused the statement — the
    // op never rides (no overlay of a write the bench lacks), and
    // the reseat's deletes never ride without the gesture that
    // earned them.
    const answer = onSave({
      ...channelPayload(channel, payload),
      ...(reseat !== null && channel !== "layerA" ? reseat : {}),
    })
    if (answer === false) return
    const op: PendingOp = { channel, value: payload, seq: seqRef.current++ }
    const seq = op.seq
    // The reseat's second plane rides its own layer-A op; it
    // supersedes any live layer-A op, whose stated content it
    // carries (it serialized from the shown layer that op wins in).
    const reseatOp: PendingOp | undefined = reseat !== null && channel !== "layerA"
      ? { channel: "layerA", value: reseat, seq: seqRef.current++ }
      : undefined
    const reseatSeq = reseatOp?.seq
    // THE ANCESTOR PRUNE (P8, 2026-10-15, the ghost cure, half one):
    // latest-per-channel wins the overlay, and the superseded ops are
    // DROPPED with the successor — a failed op a later gesture already
    // restated must not outlive it: retirement is content-compared, so
    // the dead value (never contained by the doc) would otherwise sit
    // max-seq live forever, masking every later settlement — the
    // permanent one-gesture-behind ghost.
    let kept = opsRef.current.filter((o) => o.channel !== channel)
    if (reseatOp !== undefined) kept = kept.filter((o) => o.channel !== "layerA")
    opsRef.current = reseatOp !== undefined ? [...kept, op, reseatOp] : [...kept, op]
    setOps(opsRef.current)
    // THE ASYNC RETRACTION (P8, half two): the fence's late answer —
    // a refused coalesced write retracts exactly the ops it carried,
    // the reseat's op with the gesture's own. A rejection retracts
    // too (a door that throws refused louder than false). Anything
    // else keeps the ops for the doc to retire.
    if (answer instanceof Promise) {
      const seqs = reseatSeq === undefined ? [seq] : [seq, reseatSeq]
      void answer.then(
        (landed) => { if (landed === false) for (const s of seqs) dropOp(s) },
        () => { for (const s of seqs) dropOp(s) },
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
