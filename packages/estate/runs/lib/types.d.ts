/** The wire-honest JSON value (the drafts remote's own spelling —
 *  payloads are honestly JSON all the way down). */
/** The WIRE plane's JSON tree (readonly members — the run row is an
 *  immutable persisted record, never a builder's value). The writer
 *  plane (card-kit graph.ts) spells the same value mutable; the
 *  variance is deliberate per plane (DRY sweep J13 decision,
 *  2026-10-18 — recorded, not merged).
 *  @mode host */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    readonly [key: string]: JsonValue;
};
/** The submit doc's constrained wire shape (the remote boundary law —
 * assertRemoteJsonType refuses unconstrained unknown; values are
 * JSON-flat: the submit chain reads draft_id, everything else rides
 * for the registry's own envelope walk). */
export type RunStartDoc = {
    readonly [key: string]: JsonValue;
};
/** The run status/stop answer + the list row — JSON-flat rows (the
 *  registry's envelope is honestly JSON all the way down). */
export type RunRow = {
    readonly [key: string]: JsonValue;
};
//# sourceMappingURL=types.d.ts.map
