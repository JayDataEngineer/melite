import type { ModifierKindSpec } from "@melite/contracts";
export interface ParamContractViolation {
    /** The param path, e.g. "motion_constraints" or "step#3.params.prompt". */
    path: string;
    /** Human-readable reason, e.g. "expected string, got object". */
    message: string;
}
type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "array" | "object" | "null";
interface ParamFieldSchema {
    type?: JsonSchemaType;
    default?: unknown;
    enum?: unknown[];
}
export interface FamilyParamSchema {
    properties: Record<string, ParamFieldSchema>;
    required?: string[];
    additionalProperties?: boolean;
}
/** The bulk response: family_id → JSON Schema. */
export type FamilyParamSchemaIndex = Record<string, FamilyParamSchema>;
/**
 * Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
 * level cache, inflight dedup, idempotent. Call at boot (alongside
 * loadCatalog) so the validator never blocks on a fetch.
 *
 * Returns the cached index on subsequent calls (no refetch). Use
 * { force: true } to bypass the cache.
 */
export declare function loadFamilySchemas(opts?: {
    force?: boolean;
}): Promise<FamilyParamSchemaIndex>;
/** Sync lookup — returns the cached schema for a family, or null if the
 * cache isn't loaded yet or the family is unknown. Pure, no fetch. */
export declare function getFamilySchema(familyId: string): FamilyParamSchema | null;
/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
 * family)? Distinguishes "transmission worked and the family is absent"
 * (a phantom family — throw) from the cache-cold/failed branch (defer). */
export declare function isFamilySchemaCachePopulated(): boolean;
/**
 * Coerce a params dict to a family's schema types — the TYPED RUN BODY.
 * Canonical coercions ONLY (2026-09-05 compile-time incident: form state,
 * stale drafts and legacy editors carry strings for numbers/booleans and
 * "" for empty arrays — the class admits the canonical forms, so the
 * boundary normalizes them instead of refusing what the backend takes):
 *   - integer/number: numbers kept (integer rejects fractions); a trimmed
 *     canonical numeric string becomes Number; "" means UNSET (falls into
 *     the null path: default-or-omit — "" is NEVER 0); anything else is
 *     a violation (never NaN into the wire).
 *   - boolean: booleans kept; "true"/"false" become bool; else violation.
 *   - array: arrays kept; "" becomes [] (the unowned picker's empty
 *     serialization — the class coerces the same); a non-empty string is
 *     a violation (ambiguous — never a split-guess).
 *   - string/object: kept on exact type; anything else is a violation
 *     (never String()-collapse, never JSON.parse-guess).
 *   - null / UNSET-"": OMITTED when the field declares a default —
 *     absent rides the backend default (the class's own semantics:
 *     explicit null refuses on numerics, so the boundary must never
 *     POST a null the click gate waved through — 2026-09-06
 *     frontend-impossible incident). A null/UNSET with NO default is
 *     kept so the validator refuses it loudly. Untyped fields (the
 *     loras/mask tile bags) pass null through untouched — the class's
 *     own None-coercion owns them, and it runs on explicit values.
 *   - fields with NO declared type (the loras/mask tile bags {}): passed
 *     through untouched — the compose door owns them.
 * Returns the typed copy + violations against the TYPED values (empty =
 * the body is exactly what the class admits — the POST must send THIS
 * body, never the raw draft).
 */
export declare function coerceParamsToSchema(schema: FamilyParamSchema, params: Record<string, unknown>, opts?: {
    pathPrefix?: string;
}): {
    params: Record<string, unknown>;
    violations: ParamContractViolation[];
};
/**
 * Validate a params dict against a family's param schema. Pure + synchronous.
 * Returns violations (empty = clean). A null for a field WITH a default is
 * treated as "use the default" (no violation) — coerce strips such nulls
 * to absent before this runs, and absent rides the backend default; the
 * tolerance here is defense-in-depth for direct callers (the boundary
 * must NEVER POST a null the class would refuse — explicit null 400s
 * on every numeric row, so coerce omits, it never forwards). A null for
 * a field WITHOUT a default IS a violation.
 *
 * WHAT IT CATCHES (the motion_constraints bug class):
 *   - TYPE mismatches: a str param sent an object/number/array.
 *   - EXTRA fields: unknown param names (additionalProperties: false).
 *   - null for NON-defaulted fields.
 *
 * WHAT IT LEAVES TO THE BACKEND (no false positives):
 *   - REQUIRED-field presence — the frontend doesn't know which keys are
 *     injected from flow.shared via the consumes axis (comfy_url, model).
 *     The backend's card phase-1 compose knows the consumes set, so it
 *     knows. The frontend defers required-checking to the hard wire gate.
 */
export declare function validateParamsAgainstSchema(schema: FamilyParamSchema, params: Record<string, unknown>, opts?: {
    pathPrefix?: string;
}): ParamContractViolation[];
/**
 * Validate a stage's modifier entries against the family's declared kinds.
 * validateModifierEntries (this file) is the owner: per declared kind with a
 * param_key, params[param_key] must honor the cardinality (list kinds take
 * a list of entry dicts bounded by max_stack; scalar kinds take ONE value),
 * and each entry's keys/required/type/bounds/select-membership must match
 * the declared fields. Empty = clean; never throws. No kinds → no-op.
 */
export declare function validateModifierEntries(kinds: ModifierKindSpec[] | null | undefined, params: Record<string, unknown>): ParamContractViolation[];
/**
 * Pre-submit gate: resolve model → family → schema (from the ONE cache),
 * validate params, throw on any violation. Called before EVERY GPU-starting
 * fetch so the crash comes before the button press, not after a round-trip.
 *
 * Ensures the schema cache is loaded (loadFamilySchemas) on the first call,
 * then validates synchronously.
 *
 * NO SILENT DEFERS (2026-08-16): the old gate no-op'd when the model was
 * missing from the catalog or the family had no schema — silently
 * shipping UNKNOWN params to the backend and calling that "the backend's
 * backstop". That is the silent-drop class this contract exists to kill:
 *   - catalog LOADED + model missing → THROW. The picker is showing a
 *     model that DOES NOT EXIST (the original operator complaint) — the
 *     catalog is the source of truth and the model is not in it.
 *   - family resolved + no schema → THROW. The schema transmission is
 *     broken (bulk fetch dropped it); deferring would validate against
 *     NOTHING. (The workflow:* exemption died with the workflow lane —
 *     §12.2; a workflow is a plugin card with a REAL signature now.)
 * The ONE honest defer left: the catalog cache is still cold at boot
 * (nothing fetched yet — cannot resolve anything, backend gate decides).
 */
export declare function assertParamsMatchFamilySchema(model: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=familyParamContract.d.ts.map
