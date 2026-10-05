import type { DeclaredModifierKind } from './service.js';
/** The carrier dict shape (shared with the no-cheat door). */
export type Schema = {
    type: string;
    meta?: Record<string, unknown>;
    dict?: Record<string, Schema>;
    list?: Schema[];
    value?: unknown;
};
export type ParamsSchema = {
    type: 'object';
    properties: Record<string, Record<string, unknown>>;
    required?: string[];
};
/** One knob's JSON-schema projection (shared: the tools door's
 *  params_schema AND the discovery door's family param-schemas ride
 *  this — one spelling, never a second projector). */
export declare const emitKnob: (s: Schema) => Record<string, unknown>;
/**
 * The DSH tool-parameter projection (M2′ stroke 2c, 2026-09-09):
 * the IMPLICIT PROPERTY MAP the dsh-tools defineTool contract
 * consumes — { knob: { type, description?, enum?, default?,
 * required? } } — derived from the served params_schema
 * projection (one walking family, two projections; never a second
 * walk of the Schemastery carrier). The spec form carries the
 * default NATIVELY (ValueSchemaAnnotations.default — projected to
 * the model JSON and non-validating, verified against the packed
 * dsh-tools runtime) and numeric enums NATIVELY (Number/Integer
 * specs take number enums — no String() collapse). What the DSL
 * has no keys for stays folded into the description (minimum/
 * maximum — no bounds keys in the DSL) or stays served-form-only
 * (format/bounds/x-* ride /v1/tools, which serves the full
 * JSON-schema form). `object`/`array` knobs project as the
 * unconstrained lossless node (`json`) — the carrier walk drops
 * internals one layer down, identically for both projections.
 */
export interface ParamSpecNode {
    type: "string" | "number" | "integer" | "boolean" | "json";
    description?: string;
    enum?: (string | number)[];
    default?: unknown;
    required?: true;
}
export type ParamsSpec = Record<string, ParamSpecNode>;
export declare const emitParamsSpec: (carrier: Schema, boarded: readonly string[]) => ParamsSpec;
/** Project a registered card's schema + boarded list to the served
 * params_schema dialect. `schemaFn` is the card's registered schema
 * (the callable); we walk its carrier via the .dict of the declared
 * object — cards register the schema object itself, and a card that
 * wraps its schema (h3 normalizes through a function) carries the
 * inner one at def.schemaCarrier. The registry's own reader of that
 * field is models/service.ts:987, which resolves
 * `def?.schemaCarrier ?? def?.schema`. */
export declare const emitParamsSchema: (schemaCarrier: Schema, boarded: readonly string[]) => ParamsSchema;
/** THE MODS PROJECTION (stroke 79 — the seam-law unification): the
 *  declared kinds as the AGENT plane consumes them. ONE emitter,
 *  TWO doors (the /v1/tools manifest row and the /v1/load bundle's
 *  signature — never a re-derivation in either). The mod bags are
 *  NOT flat-schema keys: params_schema alone cannot compose a card
 *  whose complexity lives in mods, and an agent that never learns
 *  the kinds hits compose's loud refusals blind. Verbatim off the
 *  card's own declared rows; leaf_face is a UI concern and never
 *  rides (the agent composes VALUES, never faces). */
export declare const emitModifierKinds: (mods: readonly DeclaredModifierKind[] | undefined) => Array<Record<string, unknown>>;
