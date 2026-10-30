export { RETIRED_RUNNER_KNOBS, RETIRED_CARRY_KEYS, DOOR_KEYS } from "./vocab.js";
import { executeCeilOf, type ExecuteCeilVerdict } from "./queueSubmit.js";
export { executeCeilOf, type ExecuteCeilVerdict };
import { STAGE_PATCH_KEYS } from "@melite/contracts/benchStage";
export { STAGE_PATCH_KEYS };
/** flow_inline top-level keys (the served shape). */
export declare const INLINE_TOP_KEYS: readonly string[];
/** flow_inline stage keys (extra=forbid at the door) — the
 *  CONTRACT'S list now (benchStage.ts WIRE_STAGE_KEYS): the agent's
 *  bench projection needs the same rule to build a wire row, and two
 *  copies of a door's key list is how a reader and a writer drift. */
export declare const STAGE_KEYS: readonly string[];
/** Stage/flow identifier shape. */
export declare const FLOW_ID_RE: RegExp;
/** PATCH .../stages/:sid accepted keys — the CONTRACT's list, in the
 *  voice's order (B-M9: this was a second copy in a different order;
 *  the two doors disagreed about what the door wants). */
/** Draft id shape (DRAFT_ID_RE in @melite/estate-drafts spec.ts): 1..96 chars of [A-Za-z0-9_-]. */
export { DRAFT_ID_RE };
/** The strict-wire outcome: decoded text, or the exact 400 shape. */
export type StrictWire = {
    text: string;
} | {
    status: number;
    payload: Record<string, unknown>;
};
/** Decode one strict body: "" decodes as {} (body.decode() or
 *  "{}"). The TEXT embeds the host parser's message — walls assert
 *  status + code + prefix, never bytes. */
export declare function decodeStrictBody(body: Uint8Array): StrictWire;
/** The strict JSON body parse — mirrors route() 4335-4340. Owned
 *  here; doors/uploads.ts re-exports it (wall-pinned address). */
export declare function parseStrictJson(body: Uint8Array): {
    doc: unknown;
} | {
    status: number;
    payload: Record<string, unknown>;
};
/** Estate record check: a plain-prototype mapping, never an array,
 *  never null, never a class instance. */
export declare function isRecord(v: unknown): v is Record<string, unknown>;
/** typeof v === "string" (absent/null/non-strings refuse). */
export declare function isStringField(v: unknown): v is string;
/** typeof v === "boolean" — strict: 0/1/"true" refuse (gate). */
export declare function isBoolField(v: unknown): v is boolean;
/** typeof v === "number" — pure-JSON domain only. */
export declare function isNumberField(v: unknown): v is number;
/** Array.isArray — the closed-list shape gate. */
export declare function isListField(v: unknown): v is unknown[];
/** Dict gate: the estate isRecord FIRST (class-instance exclusion), then the
 *  schema (intent declaration — the guard carries the invariant). */
export declare function isDictField(v: unknown): v is Record<string, unknown>;
import { draftIdOk, DRAFT_ID_RE } from "@melite/estate-drafts";
export { draftIdOk };
/** The strict-body offense lists for one body. */
export interface StrictBodyOffense {
    readonly bad: string[];
    readonly carry: string[];
}
/** Split one body's keys into retired-knob vs pipe-carry offenses. */
export declare function checkStrictBody(body: Record<string, unknown>): StrictBodyOffense;
/** The uploads-body structure verdict. */
export type UploadsStructure = {
    kind: "ok";
    filename: string;
    dataUrl: string;
} | {
    kind: "not-object";
} | {
    kind: "bad-filename";
} | {
    kind: "bad-data";
};
/** Structure-gate one uploads doc (content rules stay in the door). */
export declare function checkUploadsStructure(doc: unknown): UploadsStructure;
/** Static verdict→voice table for the uploads door (every arm is
 *  fully static — the door does one lookup, no if-chain). */
export declare const UPLOADS_VOICE: Record<Exclude<UploadsStructure["kind"], "ok">, string>;
/** The start-envelope structure verdict. */
export type FlowsStartEnvelope = {
    kind: "ok";
    body: Record<string, unknown>;
    testFlag: boolean;
} | {
    kind: "not-object";
    doc: unknown;
} | {
    kind: "bad-test";
    testFlag: unknown;
} | {
    kind: "missing-draft";
} | {
    kind: "malformed-draft";
    draftId: string;
};
/** Structure-gate one start doc (draft lookup stays in the door).
 *  The test-flag default rides the single seat (resolveTestFlag in
 *  ./queueSubmit.ts — purge §7 P7 F-1): no twin `??` here. */
export declare function checkFlowsStartEnvelope(doc: unknown): FlowsStartEnvelope;
/** The flow_inline top-structure verdict. */
export type FlowInlineTop = {
    kind: "ok";
    rec: Record<string, unknown>;
} | {
    kind: "not-object";
} | {
    kind: "unknown-keys";
    dead: string[];
} | {
    kind: "missing-id-stages";
    keys: string[];
} | {
    kind: "bad-stages";
};
/** Structure-gate one flow_inline value. */
export declare function checkFlowInlineTop(inline: unknown): FlowInlineTop;
/** Static verdict→voice table for the flow_inline top gate (the
 *  two fully static arms — unknown-keys and missing-id-stages
 *  interpolate request values, so their mapping stays in the
 *  door). */
export declare const FLOW_INLINE_TOP_VOICE: Record<"not-object" | "bad-stages", string>;
/** One flow_inline stage's door-level structure verdict. */
export type FlowStageCheck = {
    kind: "ok";
    st: Record<string, unknown>;
} | {
    kind: "not-object";
} | {
    kind: "unknown-fields";
    st: Record<string, unknown>;
    extras: string[];
} | {
    kind: "bad-id";
    st: Record<string, unknown>;
};
/** Structure-gate one stage row (id legality via FLOW_ID_RE). */
export declare function checkFlowStage(st: unknown): FlowStageCheck;
/** The stage-patch structure verdict. */
export type DraftPatchCheck = {
    kind: "ok";
    patch: Record<string, unknown>;
} | {
    kind: "not-object";
} | {
    kind: "unknown-keys";
    unknown: string[];
} | {
    kind: "bad-result";
} | {
    kind: "bad-runStatus";
} | {
    kind: "bad-params";
} | {
    kind: "bad-inputs";
} | {
    kind: "bad-inputOutputs";
};
/** Structure-gate one stage patch value. */
export declare function checkDraftPatch(patch: unknown): DraftPatchCheck;
/** Static verdict→voice table for the stage-patch gate (every arm
 *  but unknown-keys is fully static — the door does one lookup for
 *  those; unknown-keys interpolates the request keys, so its
 *  mapping stays in the door). */
export declare const DRAFT_PATCH_VOICE: Record<Exclude<DraftPatchCheck["kind"], "ok" | "unknown-keys">, string>;
//# sourceMappingURL=runsGates.d.ts.map
