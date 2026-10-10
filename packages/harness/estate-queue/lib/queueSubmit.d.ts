export interface QueueRefusal {
    readonly status: number;
    readonly payload: Record<string, unknown>;
}
export declare function refusal(status: number, error: string, code: string, loc?: string, expected?: string, got?: string): QueueRefusal;
/** The envelope refusal texts (door-verbatim, the ONE voice — both
 *  the submit envelope validator below and the registry's envelope
 *  walk delegate here; one copy, no drift). Kept as a table — one
 *  voice each, like the admission gate's static tables. */
export declare function envelopeRefusal(kind: "not-object" | "bad-test" | "missing-draft" | "malformed-draft", doc: unknown, detail?: {
    testFlag?: unknown;
    draftId?: string;
}): QueueRefusal;
/** The unknown-draft refusal (door-verbatim; the probe rides the
 *  caller's drafts domain — the remote hops the ctx seat). */
export declare function unknownDraftRefusal(draftId: string): QueueRefusal;
/** Draft id rule (draftIdOk in @melite/estate-drafts, re-exported below): <=96 chars of [A-Za-z0-9_-]. */
/** This core re-checks nothing: it BUILDS the refusal for a caller-computed verdict (the check is one regex, owned by the drafts package so envelope validation is whole). */
/** Callers pass the raw draft_id; the malformed/unknown split needs the existence probe too — see validateSubmitEnvelope. */
/**
 * DEDUP (2026-09-10, ledger row 27): draftIdOk + the three vocab
 * sets below had parallel copies in gateway-core params.ts and
 * here — drift failed nowhere. The SSOT is core's params.ts
 * ("One list now" — its header already claimed it); queue re-exports
 * for barrel consumers. */
export { draftIdOk } from "@melite/estate-drafts";
export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS, } from "./vocab.ts";
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