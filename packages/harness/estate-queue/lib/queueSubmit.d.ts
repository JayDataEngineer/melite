import { type DraftId } from "@melite/contracts/benchStage";
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
 *  caller's drafts domain — the remote hops the ctx seat). Takes the
 *  branded id: the walker mints it off the validated wire body. */
export declare function unknownDraftRefusal(draftId: DraftId): QueueRefusal;
/** Draft id rule (draftIdOk in @melite/estate-drafts, re-exported below): <=96 chars of [A-Za-z0-9_-]. */
/** This core re-checks nothing: it BUILDS the refusal for a caller-computed verdict (the check is one regex, owned by the drafts package so envelope validation is whole). */
/** Callers pass the raw draft_id; the malformed/unknown split needs the existence probe too — see walkSubmitEnvelope. */
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
/** THE TEST-FLAG RESOLVE SEAT (purge §7 P7 F-1, single-resolve): the
 *  door's ONE place where the test envelope default is decided —
 *  absent/null means false (a chat tool's start doc may carry
 *  test:null, an LLM serializer emits nulls for omitted booleans —
 *  the live lane receipt 2026-09-12 where a drifted bare read
 *  refused legal calls). No caller hides its own `?? false`: the
 *  walk routes ONLY through here, and the walled value (absent/null
 *  proceeds, non-bool refuses) is pinned at
 *  tests/walls/ts/suites/run-door-single-resolve.spec.ts F-1b. */
export declare function resolveTestFlag(body: Record<string, unknown>): unknown;
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
/** THE SEED-SWEEP CAP (the GPU-spend law): one press fans out to at
 *  most this many runs — a runaway array mints that many runs, each
 *  a full render. Larger compares split across presses. */
export declare const SEED_SWEEP_MAX = 16;
/** The door's KNOB PRESENCE-PROBES (the envelope wall's counterpart
 *  list): card knob names the submit door reads the PRESENCE of to
 *  refuse an ambiguous press — never consumed, never lifted, and
 *  deliberately NEVER envelope-registered (a registered probe would
 *  stop being a knob and liftCardParams would drop it from the
 *  card's params). Today: `seed`, probed so a `seeds` sweep never
 *  silently overrides a stated single seed at either seat (the
 *  sibling top-level key or the params stanza — siblings win the
 *  lift, so the override would be silent). */
export declare const DOOR_KNOB_PROBES: readonly string[];
/** The seed-sweep expansion's verdict: no `seeds` key (the legacy
 *  single run), a judged sweep, or a loud refusal. */
export type SeedSweep = {
    kind: "single";
} | {
    kind: "sweep";
    seeds: readonly number[];
} | {
    kind: "refusal";
    refusal: QueueRefusal;
};
/** THE SEED-SWEEP EXPANSION (friction #9, the melite friction report
 *  2026-10-28: "no batch/seed-sweep primitive" — each seed roll was
 *  a separate press + status + view cycle, and ~5 of 7 generation
 *  rounds were seed iterations): a {model:} card body may carry
 *  `seeds: [...]` — the press fans out to ONE run per seed, the same
 *  card and params with the seed alone varying, under one shared
 *  run-id prefix. Judged HERE, in the shared envelope's one home,
 *  BEFORE any run registers — a malformed sweep mints nothing.
 * @param body the admitted request body.
 * @returns the expansion's verdict (never throws). */
export declare function expandSeedSweep(body: Record<string, unknown>): SeedSweep;
/** The walker's chain in order: non-object body (bad_envelope/body)
 *  -> non-bool test (bad_envelope/test) -> draft required
 *  (draft_required) -> malformed (draft_malformed) -> unknown doc
 *  (draft_unknown). The probe is the caller's seat (existence is
 *  I/O — the walker owns the TEXT, the seat owns the fs). Strict
 *  knobs and door selection judge past the walk, at startReserved. */
/** The door-selection helpers, ONE HOME (the envelope-twin cure's
 *  doors half): the shared door set and the runs seat's
 *  selectSubmitDoor derive the door set and both
 *  refusal texts from HERE — the wire contract cannot drift
 *  between the two seats. hasOwnProperty (never `in`): a door is a
 *  body-own key, not a prototype inheritance. */
export declare function submitDoorsOf(body: Record<string, unknown>): string[];
/** The too-many-doors refusal (text is the wire contract). */
export declare function ambiguousDoorsRefusal(doors: string[]): QueueRefusal;
/** The no-door refusal (text is the wire contract). */
export declare function noDoorRefusal(): QueueRefusal;
/** THE ONE ENVELOPE WALKER (the S3 twin cure): the structural
 *  faces, the draft probe ordering and the ok face live HERE and
 *  the runs registration delegates — there is no second sync face
 *  to drift against. draftExists is the caller's probe (the runs
 *  seat hops to the drafts service and awaits; a sync caller passes
 *  a sync probe — one signature carries both). Returns the ok face
 *  when the envelope may proceed to door selection, which the live
 *  face owns at startReserved (strict then doors, after the
 *  replay/reservation verdict). */
export declare function walkSubmitEnvelope(doc: unknown, draftExists: (draftId: DraftId) => boolean | Promise<boolean>): Promise<{
    kind: "ok";
    body: Record<string, unknown>;
    testFlag: boolean;
    draftId: DraftId;
} | {
    kind: "refusal";
    refusal: QueueRefusal;
}>;
//# sourceMappingURL=queueSubmit.d.ts.map