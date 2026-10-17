import { axisPickPatch, type FormSpecDoc } from "@melite/card-base/client"
import { FILM_ONLY_KEYS, T4_ONLY_KEYS } from "@melite/models-h3/timelineContract"

/**
 * THE ROW GATE (2026-10-16, the Final Cut brick — audit 0be61df8
 * F1): the field gate stops serving the t4r-dead KNOBS, but the
 * recipe PILLS need their own judge — h3's Final Cut row stamps
 * sr_switch, a one-call guided doc derives t4r, and the walk refuses
 * the stamp ('unsanctioned inject keys: sr_switch'): the pick would
 * land, and every later run would brick. Judged on the ROW'S OWN
 * stamp (never a hand id list): a recipe whose pick stamp intersects
 * the family-dead keys is not offered on that lane. The lane
 * condition (t4r) stays at the caller — this is the row judgment
 * only, so the contract wall can drive the served spec + the DECL's
 * own rows through it (the J4 negative control).
 *
 * @param spec the served form spec (the same doc the pick composes
 *   against at the compose gate); `null` never omits — the caller's
 *   spec-null render hands the gate to CardForm only when spec'd.
 * @param row the recipe row (a FormVariantRow from the DECL).
 * @returns true when the row's stamp intersects T4_ONLY ∪ FILM_ONLY
 *   (the film-only keys are legal on a chain, so only the t4r lane
 *   consults this gate — a t4r doc cannot honor either set).
 */
export function omitT4RecipeRow(spec: FormSpecDoc | null, row: unknown): boolean {
  if (spec === null) return false
  const stamp = axisPickPatch(spec, row as never, {})
  return Object.keys(stamp).some((k) =>
    (T4_ONLY_KEYS as readonly string[]).includes(k)
    || (FILM_ONLY_KEYS as readonly string[]).includes(k))
}
