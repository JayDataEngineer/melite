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
export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS, } from "./vocab.js";
/** The strict-body gate (_strict_body 248-276). */
export declare function strictBodyCheck(body: Record<string, unknown>): QueueRefusal | null;
/** THE SHARED ENVELOPE STRUCTURE (one-envelope law, the twin-walker
 *  cure 2026-10-22): the four structural faces BOTH submit faces
 *  run, in byte-identical order — non-object body, non-bool test
 *  (absent/null means false: a chat tool's start doc may carry
 *  test:null, an LLM serializer emits nulls for omitted booleans —
 *  the live lane receipt 2026-09-12 where a drifted bare read
 *  refused legal calls), draft required, draft malformed. The
 *  existence probe stays each face's own (the live seat hop is
 *  async; this core face syncs) — the unknown-draft refusal
 *  CONSTRUCTOR is shared, so no voice can drift, only the probe
 *  fiber differs. @param doc — the raw request body.
 *  @returns the structural refusal, or null when the envelope may
 *  proceed to its face's existence probe. */
export declare function submitEnvelopeStructuralRefusal(doc: unknown): QueueRefusal | null;
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
/** The door-selection helpers, ONE HOME (the envelope-twin cure's
 *  doors half): the sync core's validateSubmitEnvelope and the runs
 *  registration's selectSubmitDoor derive the door set and both
 *  refusal texts from HERE — the wire contract cannot drift
 *  between the two seats. hasOwnProperty (never `in`): a door is a
 *  body-own key, not a prototype inheritance. */
export declare function submitDoorsOf(body: Record<string, unknown>): string[];
/** The too-many-doors refusal (text is the wire contract). */
export declare function ambiguousDoorsRefusal(doors: string[]): QueueRefusal;
/** The no-door refusal (text is the wire contract). */
export declare function noDoorRefusal(): QueueRefusal;
export declare function validateSubmitEnvelope(doc: unknown, draftExists: (draftId: string) => boolean): QueueRefusal | null;
//# sourceMappingURL=queueSubmit.d.ts.map
