import type { SemanticModelEntry } from './semanticModelKnob.ts';
/** One card-declared modifier kind (the declarer face of the served
 *  ModifierKind — structural, the JSON wire shape). `entry` follows
 *  the served vocabulary: 'option' | 'hybrid' | undefined = field. */
export interface DeclaredModifierKind {
    kind: string;
    label: string;
    param_key: string;
    entry?: string;
    option_key?: string;
    scalar_key?: string;
    cardinality: string;
    max_stack?: number;
    fields?: readonly Record<string, unknown>[];
    kindFields?: readonly Record<string, unknown>[];
    options?: readonly Record<string, unknown>[];
    /** THE CATEGORY (the mods-abstraction law, stroke 78):
     *  'standalone' = every entry applies to the SAME base image and
     *  provides its OWN output (sam2/sam3 mask sources — order is
     *  semantically void); 'ordered' (default, the stacking law every
     *  pack kind follows — loras/controlnet) = entries STACK in array
     *  order, each receiving the previous outputs, modifying the
     *  model call — no independent inference. Served verbatim; the
     *  section renders the drag stack ONLY on ordered kinds. */
    category?: 'standalone' | 'ordered';
    /** THE LEAF FACE (paint-leaf-canvas.md): 'paint-canvas' = the
     *  kind's payload field offers the brush verb beside the square
     *  (the modal arrives from the host; absent host degrades to the
     *  three-source square — the payload PNG is the contract either
     *  way). 'bbox-canvas' (stroke 78) = the entry's bbox_x/y/w/h
     *  fields offer the rectangle verb — an image preview the user
     *  drags a selection on (absent host degrades to the four number
     *  inputs). Served verbatim like every declared row. */
    leaf_face?: 'paint-canvas' | 'bbox-canvas';
    /** THE SECTION CAPTION (2026-10-08, the operator's filter demand —
     *  "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): a one-line caption
     *  the leaf seats ABOVE the field stack, naming what the stack
     *  IS. The detector arms use it to NAME the bbox filter (the
     *  class chips + confidence ARE the filter — automated, Impact
     *  Pack boxes + YOLO; a caption-less stack reads as loose
     *  inputs). Served verbatim; absent = no caption. */
    section?: string;
    /** THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law,
     *  2026-09-19 — the operator: "declared, then auto provisioned"):
     *  pack ids this KIND's arm needs live (impact-pack nodes for the
     *  SAM2 chain). The compose door enforces them ONLY when the
     *  kind's bag is non-empty — an unused arm never blocks a run
     *  (the card-level `requires` above stays the always-on gate).
     *  Served verbatim; absent = no arm requirements. */
    requires?: readonly string[];
}
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
/** The implicit property map (`/v1/tools`'s JSON-schema form):
 *  the schema's own fields plus the synthesized model enum.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — served as the model
 *   enum when present; the bare boarded enum otherwise
 *  @returns the served properties + required list
 */
export declare const emitParamsSpec: (carrier: Schema, boarded: readonly string[], semantic?: readonly SemanticModelEntry[]) => ParamsSpec;
/** Project a registered card's schema + boarded list to the served
 * params_schema dialect. `schemaFn` is the card's registered schema
 * (the callable); we walk its carrier via the .dict of the declared
 * object — cards register the schema object itself, and a card that
 * wraps its schema (h3 normalizes through a function) carries the
 * inner one at def.schemaCarrier. The registry's own reader of that
 * field is models/service.ts:987, which resolves
 * `def?.schemaCarrier ?? def?.schema`. */
/** The JSON-schema form of the same walk.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — the model enum +
 *   default (the first entry) + label-carrying description when
 *   present; the bare boarded enum otherwise
 *  @returns properties, required, and (when the carrier declares
 *   them) additionalProperties
 */
export declare const emitParamsSchema: (schemaCarrier: Schema, boarded: readonly string[], semantic?: readonly SemanticModelEntry[]) => ParamsSchema;
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
//# sourceMappingURL=params-emit.d.ts.map