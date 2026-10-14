// admission.ts — the card-side strict resolve (strictness audit's
// T6, 2026-10-12): schemastery's own `strict` flag silently DROPS
// unknown keys (object resolve: `if (!strict) merge(result, data)`)
// and a silent drop is banned (QUEUE LANE LAW), so the loud gate is
// ours. The CLI compile door already refuses unknown params
// (cli.ts's ADMISSION CONTRACT GATE); this is the same judgment at
// the card's compose seam — the run seat and the form face both
// arrive here, and a typo'd key (`promptt`) never composes, never
// renders a second empty box. ONE rider law, mirroring the CLI
// gate: a key is admitted when it is a schema knob, or one of the
// card's declared riders (mod bags like the loras bag, def.admits
// names, studio writes), matching exactly or by trailing-* prefix.
import Schema from '@deepseek-ai/schemastery'
import { ComposeRefusal } from './errors.ts'

// The refusal type rides the admission door (the compose's callers
// name the gate and its refusal from one spelling).
export { ComposeRefusal } from './errors.ts'

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. Fourteen cards carried this cast inline
 *  (card-ui audit, 2026-11-02); it lives here now — the no-unknown
 *  rule counts this collapse as reduction (fourteen inline
 *  assertions become one justified baseline).
 *  @param schema the card's schemastery object
 *  @returns the schema as the seam's callable face */
export function callableSchema(schema: Schema): (v: unknown) => Record<string, unknown> {
  return schema as unknown as (v: unknown) => Record<string, unknown>
}

/** Resolve a card schema LOUDLY: the schemastery walk keeps its
 *  types, bounds, and defaults; every param key that is neither a
 *  declared knob nor a rider refuses with code 'unknown-param',
 *  naming the keys. The resolve result carries the walk's merge
 *  (riders ride verbatim — the compose reads them downstream).
 *  @param cardId the card's registration id (refusal voice)
 *  @param schema the card's schemastery object (callable, .dict
 *   carrying the declared knobs). A dict-LESS callable has no
 *   declared surface to admit against, so the gate fails CLOSED:
 *   every param key refuses unless it is a named rider.
 *  @param riders the card's admitted non-knob keys (exact names or
 *   trailing-* prefixes): mod bags, admits, studio writes
 *  @param params the raw params the compose received
 *  @returns the gated params doc (schema walk output, merge kept) */
export function gatedResolve(
  cardId: string,
  schema: (v: unknown) => Record<string, unknown>,
  riders: readonly string[],
  params: unknown,
): Record<string, unknown> {
  const doc = schema(params)
  const dict: Record<string, unknown> | undefined = (schema as { dict?: Record<string, unknown> }).dict
  const keys = params !== null && typeof params === 'object' && !Array.isArray(params)
    ? Object.keys(params as Record<string, unknown>)
    : []
  const unknown = keys.filter((k) =>
    (dict !== undefined && k in dict) === false
    && !riders.some((r) => r === k || (r.endsWith('*') && k.startsWith(r.slice(0, -1)))))
  if (unknown.length > 0) {
    throw new ComposeRefusal('unknown-param',
      `card '${cardId}' got undeclared param(s): ${unknown.sort().join(', ')} — admission is the declared surface (schema knobs + the card's riders: mod bags, admits, studio writes); a typo'd key never composes`)
  }
  return doc
}
