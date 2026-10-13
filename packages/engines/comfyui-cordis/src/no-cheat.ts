// THE NO-CHEAT LAW (2026-09-20, the operator's order): the DOOR —
// never the card — guarantees the walk. A card declares a knob with
// a non-null default; the schema walk (or the merged cascade) must
// deliver a non-null value for that knob in every walked doc. A
// declared default the walk drops (the union-null arm, the buried
// inner default, the family-literal resolution path) is a BROKEN
// CARD, refused loud by name at compose. There is no card-side
// spelling of this check; there is no opt-out.
//
// Knobs declared WITHOUT a default (or with a null default) are the
// card's own lawful optionality — absent/null is their declared
// truth and the door does not touch them. The crime this catches is
// the MISMATCH: declaration says 8, the doc walks null, and some
// renderer floor silently invents the 8 back.
import type { Schema, ParamsSchema } from '@melite/comfyui-card-kit/params-emit'
import { emitParamsSchema } from '@melite/comfyui-card-kit/params-emit'

/** The declared non-null defaults, by knob name, from the SAME
 *  enumeration (emitParamsSchema's projection carries each knob's
 *  resolved default — one spelling, three consumers: the tool face,
 *  the discovery serve, and this door). */
export const declaredDefaults = (
  schemaCarrier: Schema,
  boarded: readonly string[],
): Record<string, unknown> => {
  const served: ParamsSchema = emitParamsSchema(schemaCarrier, boarded)
  const out: Record<string, unknown> = {}
  const dict = schemaCarrier.dict ?? {}
  for (const [k, knob] of Object.entries(served.properties)) {
    if (k === 'model') {
      // the projection SYNTHESIZES the family-picker 'model' knob for
      // multi-family cards — never a declared default. A card that
      // declares its own knob literally named 'model' is rare but
      // lawful, and then the door holds it to its word like any knob.
      if (!(k in dict)) continue
    }
    // HIDDEN KNOBS NEVER ARRIVE HERE: emitParamsSchema `continue`s
    // every extra.hidden knob before writing properties, so this
    // enumeration — served.properties — carries no hidden row (the
    // re-audit, 2026-10-16). The declared key still VALIDATES —
    // compose reads it and its refusals fire verbatim when a draft
    // carries it. (dict[k] is non-null here: the projection's only
    // synthesized key is 'model', excluded above — every remaining
    // served key is a declared knob.)
    const d = (knob as Record<string, unknown>).default
    if (d !== undefined && d !== null) out[k] = d
  }
  return out
}

/** The door's check (both compose paths): every knob carrying a
 *  declared non-null default must hold a non-null, non-undefined
 *  value in the merged doc. Returns the offenders, name + declared
 *  default + walked value — the refusal names them verbatim. */
export const unwalkedParams = (
  schemaCarrier: Schema,
  boarded: readonly string[],
  merged: Record<string, unknown>,
): { name: string, declared: unknown, walked: unknown }[] => {
  const offenders: { name: string, declared: unknown, walked: unknown }[] = []
  for (const [name, declared] of Object.entries(declaredDefaults(schemaCarrier, boarded))) {
    const walked = merged[name]
    if (walked === undefined || walked === null) offenders.push({ name, declared, walked })
  }
  return offenders
}
