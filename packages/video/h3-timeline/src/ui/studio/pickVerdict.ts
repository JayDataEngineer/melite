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
 * rebase — nothing to rebase). Spread semantics are the
 * candidate's own (an undefined still overwrites — the unset
 * signal, unchanged).
 */
import { composeCandidateDoc } from "@melite/card-base/client"

/** The pick verdict's document: held (persisted truth) under user
 *  (the shown layerA, serialized — sparse: unstated keys absent)
 *  under frame (the pick's stamps — null deletes, the candidate
 *  law). */
export function resolvePickVerdictDoc(
  held: Record<string, unknown>,
  user: Record<string, unknown>,
  frame: Record<string, unknown>,
): Record<string, unknown> {
  return composeCandidateDoc(held, user, frame)
}
