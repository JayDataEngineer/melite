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
/** The start answer's row (friction #9's sweep face): the first
 *  run's summary plus, on a seed-sweep press, every run id the ONE
 *  press minted (seed order) — `sweep_runs` is absent on every
 *  single-run press. */
export interface RunStartRow {
    run_id: string;
    status: string;
    queue_position: number;
    /** The sweep family (seed order); undefined on a single press. */
    readonly sweep_runs?: readonly string[];
}
//# sourceMappingURL=types.d.ts.map
