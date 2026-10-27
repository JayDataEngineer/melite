// queueSubmit.ts — the refusal envelope + the submit pre-registration chain (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { draftIdOf } from "@melite/contracts/benchStage";
export function refusal(status, error, code, loc, expected, got) {
    const payload = { error, code };
    if (loc !== undefined)
        payload["loc"] = loc;
    if (expected !== undefined)
        payload["expected"] = expected;
    if (got !== undefined)
        payload["got"] = got;
    return { status, payload };
}
/** The envelope refusal texts (door-verbatim, the ONE voice — both
 *  the submit envelope validator below and the registry's envelope
 *  walk delegate here; one copy, no drift). Kept as a table — one
 *  voice each, like the admission gate's static tables. */
export function envelopeRefusal(kind, doc, detail) {
    switch (kind) {
        case "not-object":
            return refusal(400, "request body must be a JSON object", "bad_envelope", "body", "object", Array.isArray(doc) ? "array" : typeof doc);
        case "bad-test":
            return refusal(400, "test flag must be a boolean (got " +
                (typeof detail?.testFlag) +
                " " +
                JSON.stringify(detail?.testFlag) +
                ")", "bad_envelope", "test", "boolean", (typeof detail?.testFlag));
        case "missing-draft":
            return refusal(400, "draft_id is required — every run is born from an " +
                "action card (CARD BIRTH LAW); compose the card first: " +
                "POST /v1/flows/drafts, then start with its draft_id", "draft_required", "draft_id", "doc-backed draft id", "absent");
        case "malformed-draft":
            return refusal(400, "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): " +
                JSON.stringify(detail?.draftId ?? ""), "draft_malformed", "draft_id", "[A-Za-z0-9_-]{1,96}", (detail?.draftId ?? "").slice(0, 60));
        default:
            // Closed union: a new refusal kind fails loud at compile, not
            // silently undefined at the door. assertNever from
            // @deepseek-ai/dsh-util-values (maintained helper, not a handroll).
            return assertNever(kind, "queueSubmit.envelopeRefusal");
    }
}
/** The unknown-draft refusal (door-verbatim; the probe rides the
 *  caller's drafts domain — the remote hops the ctx seat). Takes the
 *  branded id: the walker mints it off the validated wire body. */
export function unknownDraftRefusal(draftId) {
    return refusal(400, "unknown draft_id " +
        JSON.stringify(draftId) +
        " — no card doc at drafts/" +
        draftId +
        ".json; compose the card first: POST /v1/flows/drafts", "draft_unknown", "draft_id", "existing card doc", draftId.slice(0, 60));
}
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
// ── the submit pre-registration chain ────────────────
// Vocab SSOT (ledger row 27, 2026-09-10): the retired-knob /
// carry-key / door-key sets live ONCE in ./vocab.ts;
// these re-exports keep the @melite/gateway-queue barrel stable.
export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS, } from "./vocab.js";
import { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS, } from "./vocab.js";
import { assertNever } from "@deepseek-ai/dsh-util-values";
import { draftIdOk } from "@melite/estate-drafts";
/** The strict-body gate (_strict_body 248-276). */
export function strictBodyCheck(body) {
    const bad = Object.keys(body)
        .filter((k) => RETIRED_RUNNER_KNOBS.includes(k) ||
        (k.startsWith("_") && !DOOR_KEYS.includes(k)))
        .sort();
    if (bad.length > 0) {
        return refusal(400, "request body carries retired runner knob(s) " +
            JSON.stringify(bad) +
            " — the runner never reads these (silent-drop class); remove them", "invalid_request");
    }
    const carry = Object.keys(body)
        .filter((k) => RETIRED_CARRY_KEYS.includes(k))
        .sort();
    if (carry.length > 0) {
        return refusal(400, "request body carries retired pipe-carry key(s) " +
            JSON.stringify(carry) +
            " — the 2026-08-10 stowaway wire: no gateway ever " +
            "stashed it (flow_doc was never emitted). The revive " +
            "rail is the draft (draft_id) + the run registry; card " +
            "bodies carry params only", "invalid_request");
    }
    return null;
}
/** THE TEST-FLAG RESOLVE SEAT (purge §7 P7 F-1, single-resolve): the
 *  door's ONE place where the test envelope default is decided —
 *  absent/null means false (a chat tool's start doc may carry
 *  test:null, an LLM serializer emits nulls for omitted booleans —
 *  the live lane receipt 2026-09-12 where a drifted bare read
 *  refused legal calls). No caller hides its own `?? false`: the
 *  walk routes ONLY through here, and the walled value (absent/null
 *  proceeds, non-bool refuses) is pinned at
 *  tests/walls/ts/suites/run-door-single-resolve.spec.ts F-1b. */
export function resolveTestFlag(body) {
    if (!("test" in body) || body["test"] === null)
        return false;
    return body["test"];
}
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
export function submitEnvelopeStructuralRefusal(doc) {
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
        return envelopeRefusal("not-object", doc);
    }
    const body = doc;
    const testFlag = resolveTestFlag(body);
    if (typeof testFlag !== "boolean") {
        return envelopeRefusal("bad-test", doc, { testFlag });
    }
    const draftId = body["draft_id"];
    if (typeof draftId !== "string" || draftId === "") {
        return envelopeRefusal("missing-draft", doc);
    }
    if (!draftIdOk(draftId)) {
        return envelopeRefusal("malformed-draft", doc, { draftId });
    }
    // THE PRESS KEY (audit N-E1): an OPTIONAL client-minted id naming
    // THE PRESS — a transport retry or a double-fire of one press
    // replays the same key, and the registry answers the FIRST run
    // instead of minting a second one. Absent = the legacy behavior
    // (every call is a new press). Opaque: bounded length, safe
    // charset, never interpreted.
    const pressKey = body["press_key"];
    if (pressKey !== undefined) {
        if (typeof pressKey !== "string" || !/^[-A-Za-z0-9_.]{8,128}$/.test(pressKey)) {
            return refusal(400, "press_key must be 8-128 chars of [-A-Za-z0-9_.] — it names ONE press across retries", "invalid_request", "press_key");
        }
    }
    return null;
}
/** Door-selection order (resolve_request 302: flow/flow_inline/
 *  model fixed order — ambiguity lists in DOOR order, not sorted). */
export const SUBMIT_DOORS = [
    "flow",
    "flow_inline",
    "model",
];
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
export function submitDoorsOf(body) {
    return SUBMIT_DOORS.filter((k) => Object.prototype.hasOwnProperty.call(body, k));
}
/** The too-many-doors refusal (text is the wire contract). */
export function ambiguousDoorsRefusal(doors) {
    return refusal(400, "ambiguous request: names " +
        JSON.stringify(doors) +
        " — provide exactly one of flow, flow_inline, model", "invalid_request");
}
/** The no-door refusal (text is the wire contract). */
export function noDoorRefusal() {
    return refusal(400, "no flow selected: provide flow, flow_inline or model", "invalid_request");
}
/** THE ONE ENVELOPE WALKER (the S3 twin cure): the structural
 *  faces, the draft probe ordering and the ok face live HERE and
 *  the runs registration delegates — there is no second sync face
 *  to drift against. draftExists is the caller's probe (the runs
 *  seat hops to the drafts service and awaits; a sync caller passes
 *  a sync probe — one signature carries both). Returns the ok face
 *  when the envelope may proceed to door selection, which the live
 *  face owns at startReserved (strict then doors, after the
 *  replay/reservation verdict). */
export async function walkSubmitEnvelope(doc, draftExists) {
    const structural = submitEnvelopeStructuralRefusal(doc);
    if (structural !== null)
        return { kind: "refusal", refusal: structural };
    const body = doc;
    // THE PARSE EDGE: the draft_id arrived on the wire and passed the
    // structural walk above (present, non-empty, draftIdOk) — branded
    // here (the DraftId seating; the brand is compile-time-only).
    const draftId = draftIdOf(body["draft_id"]);
    if (!(await draftExists(draftId))) {
        return { kind: "refusal", refusal: unknownDraftRefusal(draftId) };
    }
    // (one-seat law §7 P7 F-1: the flag resolves ONLY through the
    // named seat — the structural face above already refused
    // non-bool, so the seat's unknown is boolean on this domain.)
    return { kind: "ok", body, testFlag: resolveTestFlag(body), draftId };
}
//# sourceMappingURL=queueSubmit.js.map