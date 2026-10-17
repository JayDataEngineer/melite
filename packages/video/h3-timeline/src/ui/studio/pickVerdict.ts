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
import { deriveWindowFamily, T4_ONLY_KEYS } from "@melite/models-h3/timelineContract"

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

/** THE FAMILY CLAUSE (journey-closure B5 — hop 3's first judge, the
 *  pick gate's arm of the walk): the candidate doc is judged through
 *  the SAME clause the run door's walk enforces — deriveWindowFamily
 *  over the candidate, and on a derived-t4r doc every STATED
 *  T4_ONLY key refuses with the walk's own voice. ONE OWNER (the
 *  mirror discipline's ruling, recorded for the journey audit): the
 *  clause lives HERE, not in card-base's composeValidate, because
 *  the clause must ride the REAL walk — @melite/models-h3/
 *  timelineContract — and card-base's mirror seam is @melite/
 *  contracts (the floor's shared judges, laneRelations); the h3
 *  family walk is the DECL's own law, not a floor law, so the
 *  generic gate would need either a web→models dependency (a
 *  layering inversion) or a second spelling of the walk in the
 *  floor (the two-vocabulary disease). This package already rides
 *  the contract everywhere the family is judged (docHydrate's B1
 *  emit law, RunRecipeEngine's rail gate, the reseat heal) — the
 *  pick gate joins them on the same import, and the bench door's
 *  admitFamily face (card.ts) rides the same contract, so pick
 *  gate, patch door and walk cannot spell two truths.
 *
 *  THE SIBLING OWNERS (what this judge is NOT): B1's emit law
 *  (docHydrate.ts serializeLayerA) owns the SAVE — on a derived-t4r
 *  doc it omits every T4_ONLY member and rides a base-carried
 *  stamp's delete-null once; the walk owns the RUN. This judge owns
 *  the PICK VERDICT — the composition truth (held row under shown
 *  state under the pick), the doc the door would judge. A
 *  base-carried stamp the state still holds rides every seat of
 *  that composition (the serializer states nothing about it — B1's
 *  one-owner-per-key law), so a refusal here is exactly the run
 *  door's verdict, one hop earlier; the emit law's omission of a
 *  state-stated key is the save's own gesture and never re-lands a
 *  value the walk would see. A null-valued key does not refuse: the
 *  null is the wire's delete spelling (composeCandidateDoc drops a
 *  frame null; the bench's merge-patch deletes it) — the run never
 *  composes it.
 *
 *  @param doc the pick verdict's candidate doc
 *  @returns the door's own refusal voice, or null when the candidate
 *  composes on its derived lane */
export function pickFamilyRefusal(doc: Record<string, unknown>): string | null {
  if (deriveWindowFamily(doc) !== "t4r") return null
  const stated = Object.keys(doc)
    .filter((k) => (T4_ONLY_KEYS as readonly string[]).includes(k) && doc[k] !== null)
    .sort()
  if (stated.length === 0) return null
  return (
    "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: "
    + stated.join(", ")
  )
}
