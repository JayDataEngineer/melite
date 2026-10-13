export { ComposeRefusal } from './errors.js';
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
