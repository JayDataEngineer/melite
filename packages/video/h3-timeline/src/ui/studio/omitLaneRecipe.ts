import { axisPickPatch, type FormSpecDoc } from "@melite/card-base/client"
import { FILM_ONLY_KEYS } from "@melite/models-h3/timelineContract"

/**
 * THE FILM-ONLY ROW GATE (2026-11-15, the lane-law retirement's
 * residue; originally the row half of the Final-Cut brick cure,
 * 2026-10-16, audit 0be61df8 F1). The t4r half of that cure is dead:
 * the t4r arm now mounts the post chain, so a Final Cut stamp
 * (sr_switch / second_pass_enabled / upscale_route) lands and fires
 * on a keyframe doc. What survives is the FILM shape's own knob:
 * duck_depth_db is read only inside the multi-window film boundary
 * (computeFilmMix), so a single-window doc whose row stamps it would
 * carry a knob the run never reads — the walk refuses it at the run
 * door, and this row judge withholds the pill one hop earlier.
 * Judged on the row's OWN stamp (never a hand id list), one spelling
 * with the walk's FILM_ONLY gate.
 *
 * @param spec the served form spec (the same doc the pick composes
 *   against at the compose gate); `null` never omits — the caller's
 *   spec-null render hands the gate to CardForm only when spec'd.
 * @param row the recipe row (a FormVariantRow from the DECL).
 * @returns true when the row's stamp intersects FILM_ONLY_KEYS.
 */
export function omitFilmRecipeRow(spec: FormSpecDoc | null, row: unknown): boolean {
  if (spec === null) return false
  const stamp = axisPickPatch(spec, row as never, {})
  return Object.keys(stamp).some((k) => (FILM_ONLY_KEYS as readonly string[]).includes(k))
}

/** THE FIELDS the single-window lanes must not serve (one spelling
 *  with the walk's FILM_ONLY gate): `duck_depth_db` is read only
 *  inside the multi-window film boundary, so a t4r or t4_open rail
 *  omits it; the walk refuses it loud if a doc states it anyway.
 *
 * @param name the field name the omit predicate is judging.
 * @returns true when the field is film-only.
 */
export function omitFilmOnlyField(name: string): boolean {
  return (FILM_ONLY_KEYS as readonly string[]).includes(name)
}
