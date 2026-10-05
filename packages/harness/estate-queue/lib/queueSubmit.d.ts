export interface QueueRefusal {
    readonly status: number;
    readonly payload: Record<string, unknown>;
}
export declare function refusal(status: number, error: string, code: string, loc?: string, expected?: string, got?: string): QueueRefusal;
/** editor_runs.draft_id_ok (<=96, [A-Za-z0-9_-]; the TS doors carry
 *  their own copy — this core re-checks nothing, it BUILDS the
 *  refusal for a caller-computed verdict... no: the check is one
 *  regex, owned here so envelope validation is whole. Callers pass
 *  the raw draft_id; the malformed/unknown split needs the
 *  existence probe too — see validateSubmitEnvelope.)
 *
 * DEDUP (2026-09-10, ledger row 27): draftIdOk + the three vocab
 * sets below had parallel copies in gateway-core params.ts and
 * here — drift failed nowhere. The SSOT is core's params.ts
 * ("One list now" — its header already claimed it); queue re-exports
 * for barrel consumers. */
export { draftIdOk } from "@melite/estate-drafts";
export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS, } from "./vocab.js";
/** The strict-body gate (_strict_body 248-276). */
export declare function strictBodyCheck(body: Record<string, unknown>): QueueRefusal | null;
/** Door-selection order (resolve_request 302: flow/flow_inline/
 *  model fixed order — ambiguity lists in DOOR order, not sorted). */
export declare const SUBMIT_DOORS: readonly string[];
/** The whole pre-registration chain in order: non-object body
 *  (bad_envelope/body) -> non-bool test (bad_envelope/test) ->
 *  draft required (draft_required) -> malformed (draft_malformed)
 *  -> unknown doc (draft_unknown) -> strict knobs/carry ->
 *  ambiguity (verbatim) -> no-door. draftExists is the caller's
 *  `drafts/<id>.json is_file` probe (existence is I/O — the core
 *  owns the TEXT, the door owns the fs). Returns null when the
 *  envelope may proceed to graph resolution. */
export declare function validateSubmitEnvelope(doc: unknown, draftExists: (draftId: string) => boolean): QueueRefusal | null;
//# sourceMappingURL=queueSubmit.d.ts.map
