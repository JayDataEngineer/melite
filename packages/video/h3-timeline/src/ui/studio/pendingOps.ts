/**
 * pendingOps.ts — the studio's live incrementality (THE REWORK,
 * 2026-10-27: one truth, f(doc, pendingOps)).
 *
 * THE LAW (DSH architecture: the session log is the source of
 * truth; live UI incrementality is explicitly separated from
 * durable settlements — never a second state joined by a guard):
 * the bench doc is the ONLY document state. React holds no mirror
 * (no calls/keyframes/layerA useState, no dirty guard, no resend
 * epoch, no unsettled probe, no touched set). What the operator
 * stated but the doc does not yet carry rides an explicit op log —
 * the transient half, marked as transient:
 *
 * - every gesture commits straight through: onSave(payload) AND one
 *   op appended ({channel, value = exactly what was sent}).
 * - the shown document is the pure overlay: the projected doc with
 *   the live ops applied (latest op per channel wins).
 * - an op retires the moment the projected doc CONTAINS its value
 *   (persistence from durable settlements — the doc, not a ledger
 *   whisper, is the retirement judge; content-compared, so
 *   out-of-order refreshes can never un-state what was stated).
 *
 * A stale refresh therefore can never wipe visible edits or flash
 * faces: the shown content is stated-truth-by-construction, and
 * faces judge only the shown doc. No guard can flap — there is no
 * guard. Whole-channel granularity (calls/keyframes/layerA): the
 * write door already persists whole channels, and the overlay rides
 * the same granularity.
 */
import type { DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { hydrateCalls, hydrateKeyframes, serializeCalls } from "./docCalls.ts"
import { hydrateLayerA, serializeLayerA } from "./docHydrate.ts"

/** The three writable channels — the write door's own granularity. */
export type OpChannel = "calls" | "keyframes" | "layerA"

/** Canonical JSON for content comparison (A1, 2026-10-27): keys
 * sorted recursively, arrays order-preserved (row order is
 * semantic), undefined-valued keys SKIPPED (the door's own JSON
 * serialization drops them — `{k: undefined}` ≡ `{}` at the wire;
 * an explicit null is NOT undefined and stays, until patchView
 * strips it for retirement). JSON.stringify's key-order dependence
 * made retirement a coin flip — a settlement that wrote equal
 * content in a different key order left its op live forever.
 * Every comparison in this file (and useShownDoc's no-op law)
 * rides this digest. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`
  if (v !== null && typeof v === "object") {
    const rec = v as Record<string, unknown>
    const keys = Object.keys(rec).filter((k) => rec[k] !== undefined).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`
  }
  return JSON.stringify(v) ?? "null"
}

/** The merge-patch view of a layer-A payload: an explicit null IS
 * the delete — after the door settles it, the key is simply ABSENT.
 * Retirement therefore compares both sides with nulls stripped: an
 * op carrying `{k: null}` retires exactly when the settled doc's
 * payload carries no `k` (P2's delete ride, 2026-10-27). */
function patchView(v: unknown): unknown {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== null) out[k] = val
    }
    return out
  }
  return v
}

/** Content-equal under the door's merge-patch semantics. */
function settledEquals(a: unknown, b: unknown): boolean {
  return canonicalJson(patchView(a)) === canonicalJson(patchView(b))
}

/** One stated-but-unsettled write: exactly what onSave carried. */
export interface PendingOp {
  channel: OpChannel
  /** The serialized channel payload (serializeCalls / raw keyframes /
   *  serializeLayerA — the door's shape, comparable by canonical
   *  digest). */
  value: unknown
  /** Mount-local commit order (latest per channel wins the overlay —
   * load-bearing: overlayDoc picks the max-seq op, never array
   * position; A2, 2026-10-27 — the field was written never read). */
  seq: number
}

/** The projected doc — the bench row hydrated, no state. */
export interface ProjectedDoc {
  calls: DocCall[]
  keyframes: DocKeyframe[]
  layerA: LayerA
}

/** Pure projection: the bench row hydrated (the doc, verbatim). */
export function projectDoc(params: Record<string, unknown> | undefined): ProjectedDoc {
  return {
    calls: hydrateCalls({ calls: params?.calls, beats: params?.beats }),
    keyframes: hydrateKeyframes(params?.keyframes),
    layerA: hydrateLayerA(params),
  }
}

/** Serialize one projected channel into the door's shape (the
 *  retirement comparison's common currency). */
export function serializeChannel(doc: ProjectedDoc, channel: OpChannel): unknown {
  switch (channel) {
    case "calls": return serializeCalls(doc.calls)
    case "keyframes": return doc.keyframes.map((k) => ({ ...k }))
    case "layerA": return serializeLayerA(doc.layerA)
  }
}

/** The live ops: ops whose value the projected doc does not yet
 *  contain. Derived per render — never bookkept, so nothing can
 *  leak or go stale (an op is retired by the settlement itself). */
export function liveOps(doc: ProjectedDoc, ops: PendingOp[]): PendingOp[] {
  return ops.filter((op) => !settledEquals(serializeChannel(doc, op.channel), op.value))
}

/** The shown document: the projection with the live ops applied
 *  (latest op per channel wins; hydration re-runs so the shown doc
 *  is always well-formed view state, never raw payload). */
export function overlayDoc(doc: ProjectedDoc, ops: PendingOp[]): ProjectedDoc {
  const live = liveOps(doc, ops)
  const latest = (channel: OpChannel): PendingOp | undefined => {
    let out: PendingOp | undefined
    // MAX SEQ, never array position (A2): seq is the declared commit
    // order — a reordered array (state batching, concurrent writers)
    // must not change which op wins.
    for (const op of live) {
      if (op.channel === channel && (out === undefined || op.seq > out.seq)) out = op
    }
    return out
  }
  const callsOp = latest("calls")
  const kfOp = latest("keyframes")
  const layerOp = latest("layerA")
  if (callsOp === undefined && kfOp === undefined && layerOp === undefined) return doc
  return {
    calls: callsOp === undefined
      ? doc.calls
      : hydrateCalls({ calls: callsOp.value as DocCall[] | undefined, beats: undefined }),
    keyframes: kfOp === undefined
      ? doc.keyframes
      : hydrateKeyframes(kfOp.value as DocKeyframe[] | undefined),
    layerA: layerOp === undefined
      ? doc.layerA
      : hydrateLayerA(layerOp.value as Record<string, unknown> | undefined),
  }
}
