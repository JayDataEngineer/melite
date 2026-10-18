// runsGates.ts — the gateway-plane admission gate.
//
// THE HEADER BELOW ADDRESSES THE DEAD GATEWAY (2026-09-10): the
// Python-era paths it names (core/params.ts, doors/*, runs.ts,
// bridges.ts) are gone with the gateway itself; the gates they
// described are the ones implemented here, and the path references
// are provenance, not addresses.
//
// CORDIS CORE law: the card plane
// admits params through schemastery (the card plane's Schemastery
// schemas, direct — the knob vocabulary; cli.ts's admission-contract
// gate refuses unknown keys
// LOUD). The gateway plane admits request bodies through THIS module:
// schemastery owns STRUCTURE (which keys, which types), the doors
// keep the pinned VOICE (shaped refusal bytes), and the refusal
// envelope rides the door plugins — structure moves, bytes do
// not.
//
// THE SPLIT (why schemastery cannot own the voice): schemastery
// ValidationError messages differ from the texts the walls pin
// byte-exact. So every helper returns a STRUCTURE verdict (boolean
// or a `kind`-tagged union) and the door maps it to its existing
// refusal text VERBATIM — no ValidationError message ever reaches
// the wire. Fully static mappings live HERE as voice tables (one
// door lookup); interpolating texts stay door if-chains.
//
// WHAT LIVES HERE vs WHAT STAYS:
//   - HERE: the strict-body vocab SSOT (was duplicated across
//     the old doors — one list now),
//     the strict-wire decode (route() 4335-4340 — was triplicated),
//     the draft_id_ok shape (was triplicated; the law now lives
//     in @melite/estate-drafts),
//     schemastery field/composite STRUCTURE verdicts for the
//     pure-JSON-domain doors, and the static verdict→voice DATA
//     tables (UPLOADS_VOICE, DRAFT_PATCH_VOICE,
//     FLOW_INLINE_TOP_VOICE, DRAFT_PATCH_FIELDS).
//   - STAYS in the doors (byte-pinned): value-content checks, 
//     mirroring coercions, dynamic refusal STRINGS, every refusal
//     STRING (a formatting mini-language would be new machinery
//     for zero byte gain — named residual).
//   - STAYS hand-rolled by necessity (documented, not ported):
//     isRecord — cosmokit's isPlainObject (which schemastery's
//     object resolver uses) returns true for CLASS INSTANCES, so
//     the prototype check stays estate-owned.
//     runs.ts parseIntOrNull, the studios lax-coercion family, and
//     bridges.ts manageActionName's .get-crash 500 leg likewise.
//
// Schemas are side-effect-free: no transforms, no autofix, results
// discarded except where returned — input docs are never mutated
// (the doors reuse `doc` after the verdict).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, .ts specifiers for relative imports.
import z from "@deepseek-ai/schemastery";
// ── shared vocab SSOT ──────────
// The retired-runner-knob + pipe-carry + door-key sets were
// copy-pasted across the old doors (and
// draft_id_ok thrice). One list now — drift fails at the import,
// never silently at one door.
// Vocab SSOT (ledger row 27): the knob/carry/door sets live ONCE in
// ./vocab.ts — re-exported here for the gates' callers.
export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS } from "./vocab.js";
import { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS } from "./vocab.js";
import { resolveTestFlag } from "./queueSubmit.js";
import { WIRE_STAGE_KEYS, STAGE_PATCH_KEYS } from "@melite/contracts/benchStage";
export { STAGE_PATCH_KEYS };
/** flow_inline top-level keys (the served shape). */
export const INLINE_TOP_KEYS = ["description", "id", "stages"];
/** flow_inline stage keys (extra=forbid at the door) — the
 *  CONTRACT'S list now (benchStage.ts WIRE_STAGE_KEYS): the agent's
 *  bench projection needs the same rule to build a wire row, and two
 *  copies of a door's key list is how a reader and a writer drift. */
export const STAGE_KEYS = WIRE_STAGE_KEYS;
/** Stage/flow identifier shape. */
export const FLOW_ID_RE = /^[a-z_][a-z0-9_-]*$/;
/** PATCH .../stages/:sid accepted keys — the CONTRACT's list, in the
 *  voice's order (B-M9: this was a second copy in a different order;
 *  the two doors disagreed about what the door wants). */
/** Draft id shape (DRAFT_ID_RE in @melite/estate-drafts spec.ts): 1..96 chars of [A-Za-z0-9_-]. */
// THE DRAFT ID GRAMMAR MIRRORS ITS OWNER (the census's H13: this copy
// had NO length cap, so a 200-char id passed this door and was
// refused by the next with a different voice). The drafts package
// OWNS the rule (DRAFT_ID_RE, 1..96) and this module re-exports that
// exact object — the drafts spec's own JSDoc says the queue
// re-exports it, which was false while the queue kept its own
// byte-identical copy. (The draft-id-grammar wall's old equality
// arm is deleted — with the mirror gone it compared one object
// with itself; the one-declaration law lives in closure-gate
// RULE 4d, and the sampling arms exercise the ONE grammar.)
export { DRAFT_ID_RE };
/** Decode one strict body: "" decodes as {} (body.decode() or
 *  "{}"). The TEXT embeds the host parser's message — walls assert
 *  status + code + prefix, never bytes. */
export function decodeStrictBody(body) {
    const text = Buffer.from(body).toString("utf-8");
    const src = text === "" ? "{}" : text;
    try {
        JSON.parse(src);
    }
    catch (exc) {
        const msg = exc instanceof Error ? exc.message : /* v8 ignore next -- JSON.parse throws SyntaxError only (an Error); the String arm has no honest trigger (2026-09-12) */ String(exc);
        return {
            status: 400,
            payload: { error: "bad JSON: " + msg, code: "bad_json" },
        };
    }
    return { text: src };
}
/** The strict JSON body parse — mirrors route() 4335-4340. Owned
 *  here; doors/uploads.ts re-exports it (wall-pinned address). */
export function parseStrictJson(body) {
    const wire = decodeStrictBody(body);
    if (!("text" in wire))
        return { status: wire.status, payload: wire.payload };
    return { doc: JSON.parse(wire.text) };
}
// ── the object gate schemastery cannot own ──────────────────────
// See header: cosmokit isPlainObject accepts class instances, so a
// bare z.object() would take a class instance for a record.
// The prototype check excludes class instances; on the pure-JSON
// wire domain it agrees with typeof exactly (JSON.parse yields
// only plain-prototype values).
/** Estate record check: a plain-prototype mapping, never an array,
 *  never null, never a class instance. */
export function isRecord(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
}
// ── schemastery leaf schemas (STRUCTURE owners) ─────────────────
// `.required()` matters: without it, absent/undefined PASSES (the
// doors treat absent as a refusal, so the schema must too). Voices
// never escape — verdicts are booleans, messages stay in the doors.
/** The leaf vocabulary as data: gate name → required schema. One
 *  table, one runner — the five isXField helpers below are thin
 *  typed addresses over it (wall-pinned call sites). */
const LEAF = {
    string: z.string().required(),
    boolean: z.boolean().required(),
    number: z.number().required(),
    list: z.array(z.any()).required(),
    dict: z.object({}).required(),
};
/** Run one leaf schema, returning the structure verdict only. */
function tryLeaf(schema, v) {
    try {
        z.resolve(v, schema, {});
        return true;
    }
    catch {
        return false;
    }
}
/** typeof v === "string" (absent/null/non-strings refuse). */
export function isStringField(v) {
    return tryLeaf(LEAF.string, v);
}
/** typeof v === "boolean" — strict: 0/1/"true" refuse (gate). */
export function isBoolField(v) {
    return tryLeaf(LEAF.boolean, v);
}
/** typeof v === "number" — pure-JSON domain only. */
export function isNumberField(v) {
    return tryLeaf(LEAF.number, v);
}
/** Array.isArray — the closed-list shape gate. */
export function isListField(v) {
    return tryLeaf(LEAF.list, v);
}
/** Dict gate: the estate isRecord FIRST (class-instance exclusion), then the
 *  schema (intent declaration — the guard carries the invariant). */
export function isDictField(v) {
    if (!isRecord(v))
        return false;
    return tryLeaf(LEAF.dict, v);
}
// draft_id_ok: the ONE address is @melite/estate-drafts (spec.ts —
// the SSOT re-home; the dead core's own copy is gone). Re-exported
// for the gates' callers.
import { draftIdOk, DRAFT_ID_RE } from "@melite/estate-drafts";
export { draftIdOk };
// ── shared key-set helper ───────────────────────────────────────
// Three composite gates refuse sorted unknown-key lists (flow top,
// stage, draft patch) — one helper, three tables.
/** Sorted keys of `v` outside `allowed`. */
function unknownKeys(v, allowed) {
    return Object.keys(v).filter((k) => !allowed.includes(k)).sort();
}
/** Split one body's keys into retired-knob vs pipe-carry offenses. */
export function checkStrictBody(body) {
    const bad = Object.keys(body).filter((k) => RETIRED_RUNNER_KNOBS.includes(k) ||
        (k.startsWith("_") && !DOOR_KEYS.includes(k)));
    const carry = Object.keys(body).filter((k) => RETIRED_CARRY_KEYS.includes(k));
    return { bad, carry };
}
/** Structure-gate one uploads doc (content rules stay in the door). */
export function checkUploadsStructure(doc) {
    if (!isRecord(doc))
        return { kind: "not-object" };
    const rawName = doc["filename"];
    const dataUrl = doc["data"];
    if (!isStringField(rawName))
        return { kind: "bad-filename" };
    if (!isStringField(dataUrl))
        return { kind: "bad-data" };
    return { kind: "ok", filename: rawName, dataUrl: dataUrl };
}
/** Static verdict→voice table for the uploads door (every arm is
 *  fully static — the door does one lookup, no if-chain). */
export const UPLOADS_VOICE = {
    "not-object": "uploads: body must be a JSON object {filename, data}",
    "bad-filename": "uploads: filename is required",
    "bad-data": "uploads: data must be a FileReader data: URL",
};
/** Structure-gate one start doc (draft lookup stays in the door).
 *  The test-flag default rides the single seat (resolveTestFlag in
 *  ./queueSubmit.ts — purge §7 P7 F-1): no twin `??` here. */
export function checkFlowsStartEnvelope(doc) {
    if (!isRecord(doc))
        return { kind: "not-object", doc };
    const testFlag = resolveTestFlag(doc);
    if (!isBoolField(testFlag))
        return { kind: "bad-test", testFlag };
    const draftId = doc["draft_id"];
    if (typeof draftId !== "string" || draftId === "")
        return { kind: "missing-draft" };
    if (!draftIdOk(draftId))
        return { kind: "malformed-draft", draftId };
    return { kind: "ok", body: doc, testFlag };
}
/** Structure-gate one flow_inline value. */
export function checkFlowInlineTop(inline) {
    if (!isRecord(inline))
        return { kind: "not-object" };
    const dead = unknownKeys(inline, INLINE_TOP_KEYS);
    if (dead.length > 0)
        return { kind: "unknown-keys", dead };
    if (!("id" in inline) || !("stages" in inline)) {
        return { kind: "missing-id-stages", keys: Object.keys(inline).sort() };
    }
    if (!Array.isArray(inline["stages"]) || inline["stages"].length === 0) {
        return { kind: "bad-stages" };
    }
    return { kind: "ok", rec: inline };
}
/** Static verdict→voice table for the flow_inline top gate (the
 *  two fully static arms — unknown-keys and missing-id-stages
 *  interpolate request values, so their mapping stays in the
 *  door). */
export const FLOW_INLINE_TOP_VOICE = {
    "not-object": "flow body must be a JSON object",
    "bad-stages": "flow stages must be a non-empty list",
};
/** Structure-gate one stage row (id legality via FLOW_ID_RE). */
export function checkFlowStage(st) {
    if (!isRecord(st))
        return { kind: "not-object" };
    const extras = unknownKeys(st, STAGE_KEYS);
    if (extras.length > 0)
        return { kind: "unknown-fields", st, extras };
    const sid = String(st["id"] ?? "");
    if (!FLOW_ID_RE.test(sid))
        return { kind: "bad-id", st };
    return { kind: "ok", st };
}
/** Per-field gates as data: key → leaf gate → refusal verdict, in
 *  the door's fixed shape-check order. The loop below walks this
 *  table; the isRecord pre-guard + unknown-keys arm stay explicit
 *  (different shapes, not table rows). */
const DRAFT_PATCH_FIELDS = [
    ["result", "dict", "bad-result"],
    ["runStatus", "string", "bad-runStatus"],
    ["params", "dict", "bad-params"],
    ["inputs", "list", "bad-inputs"],
    ["inputOutputs", "list", "bad-inputOutputs"],
];
/** Leaf gate by table name. */
const FIELD_GATES = {
    string: isStringField,
    list: isListField,
    dict: isDictField,
};
/** Structure-gate one stage patch value. */
export function checkDraftPatch(patch) {
    if (!isRecord(patch))
        return { kind: "not-object" };
    const unknown = unknownKeys(patch, STAGE_PATCH_KEYS);
    if (unknown.length > 0)
        return { kind: "unknown-keys", unknown };
    for (const [key, gate, verdict] of DRAFT_PATCH_FIELDS) {
        if (key in patch && !FIELD_GATES[gate](patch[key])) {
            return { kind: verdict };
        }
    }
    return { kind: "ok", patch };
}
/** Static verdict→voice table for the stage-patch gate (every arm
 *  but unknown-keys is fully static — the door does one lookup for
 *  those; unknown-keys interpolates the request keys, so its
 *  mapping stays in the door). */
export const DRAFT_PATCH_VOICE = {
    "not-object": "patch body must be an object",
    "bad-result": "stage patch 'result' must be dict",
    "bad-runStatus": "stage patch 'runStatus' must be str",
    "bad-params": "stage patch 'params' must be dict",
    "bad-inputs": "stage patch 'inputs' must be list",
    "bad-inputOutputs": "stage patch 'inputOutputs' must be list",
};
//# sourceMappingURL=runsGates.js.map