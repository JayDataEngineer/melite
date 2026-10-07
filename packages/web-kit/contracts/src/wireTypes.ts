// wireTypes.ts — the modifier wire rows, TYPE-ONLY (batch AS,
// 2026-10-17): these interfaces were the surviving members of the
// retired python-era gateway's generated openapi contract
// (src/schema.ts, deleted with this move). Their one consumer is
// modifierSubcards (this package) and the test pin at
// test/types.spec.ts — the members below are the transitive closure
// of that consumption, re-homed at the owning package as plain
// exported types. No generator, no central artifact: the owner's
// types are the contract.
export type FormField = {
    /** Name */
    name: string;
    /**
     * Type
     * @enum {string}
     */
    type: "textarea" | "text" | "number" | "seed" | "select" | "file" | "boolean" | "stringlist" | "image" | "image_list" | "video" | "audio" | "voice_file";
    /** Label */
    label?: string | null;
    /** Default */
    default?: unknown;
    /** Options */
    options?: (string | FormFieldOption)[] | null;
    /** Required */
    required?: boolean | null;
    /** Step */
    step?: number | null;
    /** Tooltip */
    tooltip?: string | null;
    /** Section */
    section?: ("input" | "core" | "advanced") | null;
    /** Order */
    order?: number | null;
} & {
    [key: string]: unknown;
};
/**
 * ModifierField
 * @description One editor field on a modifier entry — data-driven render.
 *
 *     The frontend's field-type→component map (SchemaForm) renders this. A
 *     kind declares its fields; the editor renders them. No per-kind code.
 */

export type FormFieldOption = {
    /** Value */
    value: string;
    /** Label */
    label: string;
} & {
    [key: string]: unknown;
};
/**
 * FormField
 * @description One flat form field — mirrors CANONICAL_WIRE_TYPES (13 values).
 */

export type ModifierField = {
    /** Name */
    name: string;
    /**
     * Type
     * @enum {string}
     */
    type: "integer" | "float" | "string" | "select" | "image" | "boolean";
    /** Label */
    label?: string | null;
    /** Min */
    min?: number | null;
    /** Max */
    max?: number | null;
    /** Step */
    step?: number | null;
    /** Options */
    options?: string[] | null;
    /** Default */
    default?: unknown | null;
    /** Tooltip */
    tooltip?: string | null;
};
/**
 * ModifierOption
 * @description One catalog-declared option for a modifier kind.
 *
 *     For ``controlnet``: the CN types (depth, pose, canny, …) each binding a
 *     weights file + label + per-option defaults. For ``lora``: curated
 *     adapters. For a scalar kind (clip_skip): ``options`` is None.
 */

export type ModifierFieldSpec = {
    /** Name */
    name: string;
    /**
     * Type
     * @enum {string}
     */
    type: "integer" | "float" | "string" | "select" | "image" | "boolean";
    /** Label */
    label?: string | null;
    /** Min */
    min?: number | null;
    /** Max */
    max?: number | null;
    /** Step */
    step?: number | null;
    /** Options */
    options?: string[] | null;
    /** Default */
    default?: unknown | null;
    /** Tooltip */
    tooltip?: string | null;
};
/**
 * ModifierOption
 * @description One catalog-declared option for a modifier kind.
 *
 *     For ``controlnet``: the CN types (depth, pose, canny, …) each binding a
 *     weights file + label + per-option defaults. For ``lora``: curated
 *     adapters. For a scalar kind (clip_skip): ``options`` is None.
 */

export type ModifierKindSpec = {
    /** Kind */
    kind: string;
    /** Label */
    label: string;
    /**
     * Cardinality
     * @default list
     * @enum {string}
     */
    cardinality: "list" | "scalar";
    /** Max Stack */
    max_stack?: number | null;
    /** Param Key */
    param_key: string;
    /** Fields */
    fields: ModifierField[];
    /** Options */
    options?: ModifierOption[] | null;
    /** Upload Dir */
    upload_dir?: string | null;
    /** Options Scanned */
    options_scanned?: boolean | null;
    /** Tooltip */
    tooltip?: string | null;
    /** Declaration Only */
    declaration_only?: boolean | null;
    /** Order */
    order?: number | null;
};
/**
 * VariantDef
 * @description The form-spec toggle-row variant — the catalog's strict VariantEntry
 *     plus the request-time ``live`` annotation: form_spec.py writes
 *     ``v["live"] = route in live_routes`` when the pool answered, and leaves
 *     it ABSENT when the pool wasn't queried (dev workstation) — the frontend
 *     treats absence as "show the entry". Same real-class-plus-one-wire-field
 *     pattern as VariantEntryWire; strict extra="forbid" inherited.
 */

export type ModifierOption = {
    /** Value */
    value: string;
    /** Label */
    label: string;
    /** Tooltip */
    tooltip?: string | null;
    /** Model */
    model?: string | null;
    /** Source */
    source?: string | null;
    /** Defaults */
    defaults?: {
        [key: string]: unknown;
    } | null;
    /** Installed */
    installed?: boolean | null;
    /** Metadata */
    metadata?: {
        [key: string]: unknown;
    } | null;
};
/**
 * ModifierKind
 * @description One modifier kind declaration on a family — ARBITRARY by design.
 *
 *     ``kind`` discriminates the param-bag key + the Python applier. The
 *     editor renders from ``fields`` + ``options`` (no per-kind frontend code).
 */

export type ModifierOptionSpec = {
    /** Value */
    value: string;
    /** Label */
    label: string;
    /** Tooltip */
    tooltip?: string | null;
    /** Model */
    model?: string | null;
    /** Source */
    source?: string | null;
    /** Defaults */
    defaults?: {
        [key: string]: unknown;
    } | null;
    /** Installed */
    installed?: boolean | null;
    /** Metadata */
    metadata?: {
        [key: string]: unknown;
    } | null;
};
/**
 * ModifierField
 * @description One editor field on a modifier entry — data-driven render.
 *
 *     The frontend's field-type→component map (SchemaForm) renders this. A
 *     kind declares its fields; the editor renders them. No per-kind code.
 */
