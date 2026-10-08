// queueSubmit.ts — the refusal envelope + the submit pre-registration chain (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

// ── refusal envelope (R4.2: 114-155) ─────────────────────────────

export interface QueueRefusal {
  readonly status: number;
  readonly payload: Record<string, unknown>;
}

export function refusal(
  status: number,
  error: string,
  code: string,
  loc?: string,
  expected?: string,
  got?: string,
): QueueRefusal {
  const payload: Record<string, unknown> = { error, code };
  if (loc !== undefined) payload["loc"] = loc;
  if (expected !== undefined) payload["expected"] = expected;
  if (got !== undefined) payload["got"] = got;
  return { status, payload };
}

/** The envelope refusal texts (door-verbatim, the ONE voice — both
 *  the submit envelope validator below and the registry's envelope
 *  walk delegate here; one copy, no drift). Kept as a table — one
 *  voice each, like the admission gate's static tables. */
export function envelopeRefusal(
  kind: "not-object" | "bad-test" | "missing-draft" | "malformed-draft",
  doc: unknown,
  detail?: { testFlag?: unknown; draftId?: string },
): QueueRefusal {
  switch (kind) {
    case "not-object":
      return refusal(
        400,
        "request body must be a JSON object",
        "bad_envelope",
        "body",
        "object",
        Array.isArray(doc) ? "array" : typeof doc,
      );
    case "bad-test":
      return refusal(
        400,
        "test flag must be a boolean (got " +
          (typeof detail?.testFlag) +
          " " +
          JSON.stringify(detail?.testFlag) +
          ")",
        "bad_envelope",
        "test",
        "boolean",
        (typeof detail?.testFlag),
      );
    case "missing-draft":
      return refusal(
        400,
        "draft_id is required — every run is born from an " +
          "action card (CARD BIRTH LAW); compose the card first: " +
          "POST /v1/flows/drafts, then start with its draft_id",
        "draft_required",
        "draft_id",
        "doc-backed draft id",
        "absent",
      );
    case "malformed-draft":
      return refusal(
        400,
        "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): " +
          JSON.stringify(detail?.draftId ?? ""),
        "draft_malformed",
        "draft_id",
        "[A-Za-z0-9_-]{1,96}",
        (detail?.draftId ?? "").slice(0, 60),
      );
    default:
      // Closed union: a new refusal kind fails loud at compile, not
      // silently undefined at the door. assertNever from
      // @deepseek-ai/dsh-util-values (maintained helper, not a handroll).
      return assertNever(kind, "queueSubmit.envelopeRefusal");
  }
}

/** The unknown-draft refusal (door-verbatim; the probe rides the
 *  caller's drafts domain — the remote hops the ctx seat). */
export function unknownDraftRefusal(draftId: string): QueueRefusal {
  return refusal(
    400,
    "unknown draft_id " +
      JSON.stringify(draftId) +
      " — no card doc at drafts/" +
      draftId +
      ".json; compose the card first: POST /v1/flows/drafts",
    "draft_unknown",
    "draft_id",
    "existing card doc",
    draftId.slice(0, 60),
  );
}



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

// ── the submit pre-registration chain ────────────────

// Vocab SSOT (ledger row 27, 2026-09-10): the retired-knob /
// carry-key / door-key sets live ONCE in ./vocab.ts;
// these re-exports keep the @melite/gateway-queue barrel stable.
export {
  RETIRED_RUNNER_KNOBS,
  RETIRED_CARRY_KEYS,
  DOOR_KEYS,
} from "./vocab.ts";
import {
  RETIRED_RUNNER_KNOBS,
  RETIRED_CARRY_KEYS,
  DOOR_KEYS,
} from "./vocab.ts";
import { assertNever } from "@deepseek-ai/dsh-util-values";
import { draftIdOk } from "@melite/estate-drafts";

/** The strict-body gate (_strict_body 248-276). */
export function strictBodyCheck(
  body: Record<string, unknown>,
): QueueRefusal | null {
  const bad: string[] = Object.keys(body)
    .filter(
      (k: string): boolean =>
        RETIRED_RUNNER_KNOBS.includes(k) ||
        (k.startsWith("_") && !DOOR_KEYS.includes(k)),
    )
    .sort();
  if (bad.length > 0) {
    return refusal(
      400,
      "request body carries retired runner knob(s) " +
        JSON.stringify(bad) +
        " — the runner never reads these (silent-drop class); remove them",
      "invalid_request",
    );
  }
  const carry: string[] = Object.keys(body)
    .filter((k: string): boolean => RETIRED_CARRY_KEYS.includes(k))
    .sort();
  if (carry.length > 0) {
    return refusal(
      400,
      "request body carries retired pipe-carry key(s) " +
        JSON.stringify(carry) +
        " — the 2026-08-10 stowaway wire: no gateway ever " +
        "stashed it (flow_doc was never emitted). The revive " +
        "rail is the draft (draft_id) + the run registry; card " +
        "bodies carry params only",
      "invalid_request",
    );
  }
  return null;
}

/** Door-selection order (resolve_request 302: flow/flow_inline/
 *  model fixed order — ambiguity lists in DOOR order, not sorted). */
export const SUBMIT_DOORS: readonly string[] = [
  "flow",
  "flow_inline",
  "model",
];

/** The whole pre-registration chain in order: non-object body
 *  (bad_envelope/body) -> non-bool test (bad_envelope/test) ->
 *  draft required (draft_required) -> malformed (draft_malformed)
 *  -> unknown doc (draft_unknown) -> strict knobs/carry ->
 *  ambiguity (verbatim) -> no-door. draftExists is the caller's
 *  `drafts/<id>.json is_file` probe (existence is I/O — the core
 *  owns the TEXT, the door owns the fs). Returns null when the
 *  envelope may proceed to graph resolution. */
export function validateSubmitEnvelope(
  doc: unknown,
  draftExists: (draftId: string) => boolean,
): QueueRefusal | null {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    return envelopeRefusal("not-object", doc);
  }
  const body = doc as Record<string, unknown>;
  const testFlag: unknown = body["test"] ?? false;
  if (typeof testFlag !== "boolean") {
    return envelopeRefusal("bad-test", doc, { testFlag });
  }
  const draftId: unknown = body["draft_id"];
  if (typeof draftId !== "string" || draftId === "") {
    return envelopeRefusal("missing-draft", doc);
  }
  if (!draftIdOk(draftId)) {
    return envelopeRefusal("malformed-draft", doc, { draftId });
  }
  if (!draftExists(draftId)) {
    return unknownDraftRefusal(draftId);
  }
  const strict: QueueRefusal | null = strictBodyCheck(body);
  if (strict !== null) return strict;
  const doors: string[] = SUBMIT_DOORS.filter((k: string): boolean =>
    Object.prototype.hasOwnProperty.call(body, k),
  );
  if (doors.length > 1) {
    return refusal(
      400,
      "ambiguous request: names " +
        JSON.stringify(doors) +
        " — provide exactly one of flow, flow_inline, model",
      "invalid_request",
    );
  }
  if (doors.length === 0) {
    return refusal(
      400,
      "no flow selected: provide flow, flow_inline or model",
      "invalid_request",
    );
  }
  return null;
}
