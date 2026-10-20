import { axisPickPatch, fieldsOf, type FormSpecDoc } from "@melite/card-base/client"
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

/**
 * THE GATE-DEAD OMIT (the ERROR h cure, 2026-11-08): a field whose
 * own visibility gate NAMES a family-dead key is never served on the
 * lane that refuses that key — its presence gate is a key the lane
 * cannot honor, so the face would render (or hide) on STATED state
 * nobody can see or unset once the master row omits: the operator's
 * burn ("the second-pass option DISAPPEARS from the UI randomly").
 * The refine_* quartet rides visible_when `second_pass_enabled`
 * (T4_ONLY) while surviving the name filter — the orphan face. One
 * rule, every gate-dead member: presence is a pure function of the
 * LANE, never of invisible state.
 *
 * The key extractor reads the visibility grammar's left-hand sides
 * only ("key=value" guards, &-ANDed, one guard's value may be a
 * |-set — the read-only half of fieldVisible's interpreter; this
 * judgment never re-implements the guard SEMANTICS, it only asks
 * WHICH keys the gate names).
 *
 * @param spec the served form spec (the fields' visible_when is the
 *   declaration's own grammar); `null` never omits (the spec-null
 *   render never hands the gate out).
 * @param name the field name the omit predicate is judging.
 * @returns true when the field's visible_when names any T4_ONLY key.
 */
export function omitT4GateDead(spec: FormSpecDoc | null, name: string): boolean {
  if (spec === null) return false
  const field = fieldsOf(spec).find((f) => f.name === name)
  if (field === undefined || field.visible_when === undefined || field.visible_when === '') return false
  const named = field.visible_when.split('&').map((guard) => guard.trim().split(/[=<>!]/)[0] ?? '')
  return named.some((k) => (T4_ONLY_KEYS as readonly string[]).includes(k))
}
