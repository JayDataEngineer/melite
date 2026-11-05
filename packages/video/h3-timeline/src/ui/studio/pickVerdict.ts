/**
 * pickVerdict — the recipe/axis pick's truth-in-hand law (the
 * collapse: the touched ledger is dead with the mirror).
 *
 * THE MECHANISM IT REPLACED (Cure 3's touched-keys law): the old
 * mirror was a whole-channel snapshot, so keys the operator never
 * touched could sit stale beside the persisted row — the verdict
 * spread the whole mirror over truth and a stale key both refused
 * legal picks and rode the next persist back over truth. The cure
 * filtered the mirror through the touched set.
 *
 * THE COLLAPSE: there is no mirror. The user layer IS the shown
 * document (durable projection + live ops — stated-or-settled by
 * construction), so it composes over the held row WHOLE: no stale
 * value can refuse a legal pick (nothing unstated reaches the
 * gate), and the commit writes the shown value it already has (no
 * rebase — nothing to rebase).
 *
 * G3 (timeline-plane wave-2): the unset signal is the DOOR'S
 * spelling, not the spread's — a materialized undefined in the
 * shown layer is the unset gesture, not a statement, so the held
 * value rides (serializeLayerA's `v !== undefined` skip,
 * docHydrate.ts:312). The plain spread let an undefined overwrite
 * held: after any axis-unset the pick judged `steps: undefined`
 * where the run composes the held 20 — the 94aaa9b74 class at the
 * studio's own seat. Deletion stays the frame's explicit null.
 */
import { composeCandidateDoc } from "@melite/card-base/client"

/** The pick verdict's document: held (persisted truth) under user
 *  (the shown layerA, serialized — sparse: unstated keys absent,
 *  materialized undefineds dropped as unset) under frame (the
 *  pick's stamps — null deletes, the candidate law). */
export function resolvePickVerdictDoc(
  held: Record<string, unknown>,
  user: Record<string, unknown>,
  frame: Record<string, unknown>,
): Record<string, unknown> {
  const stated: Record<string, unknown> = {}
  for (const k of Object.keys(user)) {
    if (user[k] !== undefined) stated[k] = user[k]
  }
  return composeCandidateDoc(held, stated, frame)
}
