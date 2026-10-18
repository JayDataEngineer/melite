import Schema from '@deepseek-ai/schemastery';
export { ComposeRefusal } from './errors.js';
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
export declare function callableSchema(schema: Schema): (v: unknown) => Record<string, unknown>;
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
export declare function gatedResolve(cardId: string, schema: (v: unknown) => Record<string, unknown>, riders: readonly string[], params: unknown): Record<string, unknown>;
//# sourceMappingURL=admission.d.ts.map
