import type { LoRAEntry } from "./loraTypes.js";
import type { ModifierFieldSpec, ModifierKindSpec, ModifierOptionSpec } from "./wireTypes.js";
export type { ModifierFieldSpec, ModifierKindSpec, ModifierOptionSpec };
export interface ControlNetEntry {
    id: string;
    type: string;
    model?: string;
    preprocessor?: string;
    image_b64: string;
    strength: number;
    enabled: boolean;
    source: "workflow" | "user";
    start_percent?: number;
    end_percent?: number;
}
export interface ControlNetSchemaEntry {
    type: string;
    label: string;
    tooltip?: string;
    model?: string;
    default_strength?: number;
    preprocessor?: string;
    installed?: boolean;
}
export declare const NO_CN_SCHEMA: ControlNetSchemaEntry;
/** Catalog adapter entry — a lora kind's option projected to the legacy
 * adapter shape (the shape the old ``features.loras.adapters`` carried, so
 * the graduated LoRA tile editor reads the same fields). Produced 1:1 by
 * loraAdaptersOf from the kind's options; ``name`` is the wire value. */
export interface LoRAAdapter {
    name: string;
    filename?: string;
    label?: string;
    category?: string;
    default_strength?: number;
    prompt_hint?: string | null;
    installed?: boolean;
}
export interface FormSpecFeatures {
    /** The generic arbitrary-kind list — the ONLY feature key (Phase A
    * finalé). The backend emits it whenever the catalog declares a
    * ``modifiers:`` block (family-level or per-model); ``lora`` /
    * ``controlnet`` are the first two instances of the OPEN kind
    * vocabulary, not separate features. The legacy ``loras`` /
    * ``controlnet`` keys are gone — the bespoke tile editors derive their
    * shapes from the kind spec via loraAdaptersOf / cnEntriesOf (ONE
    * entry point: kindSpecOf — no parallel formSpec extractors, 2026-08-11). */
    modifiers?: ModifierKindSpec[];
}
export type ModifierFieldType = "integer" | "float" | "string" | "select" | "image" | "boolean";
/** Arbitrary kind — open string. ``lora`` / ``controlnet`` are the first two
 * instances, not the whole vocabulary (see ModifierKindSpec). */
export type SubcardKind = string;
export interface ModifierSubcard {
    id: string;
    kind: SubcardKind;
    /** Display label — LoRA file base name or the CN schema label. */
    label: string;
    /** LoRA-only — the wire entry name (subcard id = `lora-${name}`). */
    name?: string;
    enabled: boolean;
    strength: number;
    /** LoRA-only — false when the wire row carried NO strength (the
     * recipe landing stamps {id}); the tile then displays the adapter's
     * default_strength — the effective value compose seeds server-side. */
    strengthSet?: boolean;
    /** ControlNet-only — the type key (schema lookup) + conditioning image. */
    type?: string;
    model?: string;
    preprocessor?: string;
    image_b64?: string;
    start_percent?: number;
    end_percent?: number;
}
/** Stable drag id. Both entry kinds key by `id` (the lora entry's id IS
 * the adapter catalog id). `?? name` tolerates pre-2026-09-06 drafts so
 * old cards load; the next save rewrites them as id-keyed rows. */
export declare function subcardId(kind: SubcardKind, entry: {
    id?: string;
    name?: string;
}): string;
/** Normalize a wire lora row: id wins, the fossil `name` key migrates.
 * An empty id passes through — compose refuses it loudly; the tile still
 * renders so the operator can see and delete the broken entry. */
export declare function loraIdOf(entry: {
    id?: string;
    name?: string;
}): string;
/** The migration shape: a pre-2026-09-06 wire row carried `name`
 * instead of `id`. READ boundaries accept it (loraIdOf /
 * normalizeLoraEntry / subcardId); WRITE boundaries emit ONLY
 * LoRAEntry — the fossil key is never re-emitted. This is the ONE
 * declared boundary type (no `as never` / `as {name?: string}`
 * hand-casts at call sites). */
export type LoraWireInput = {
    id?: string;
    name?: string;
    strength?: number;
};
/** A fossil `{name, strength}` row (pre-2026-09-06 wire) becomes an
 * id-keyed row — ONE shape leaves every boundary (modal draft, bag
 * commit, run body). The fossil key is dropped, never re-emitted.
 * A row missing `strength` (never emitted by the pre-flip UI, but a
 * hand-edited draft may carry one) takes 1.0 — the same house default
 * the catalog row seeds at compose. */
export declare function normalizeLoraEntry(entry: LoraWireInput): LoRAEntry;
/** Derive the subcard view from the param bag — a pure projection. */
export declare function subcardsFromParams(params: Record<string, unknown>): ModifierSubcard[];
/** Human label for a LoRA entry (file base name, extension stripped). */
export declare function loraLabel(name: string): string;
/** Total subcard count on a card — the collapsed-tile "+N" hint. */
export declare function subcardCount(params: Record<string, unknown>): number;
/** Pure array move — the ONLY way order changes (dragEnd → this). */
export declare function moveItem<T>(arr: T[], from: number, to: number): T[];
/**
 * Resolve which declared kind a draggable subcard id belongs to. Walks each
 * LIST-kind's wire array (scalar kinds aren't draggable — no reorder
 * semantics on a single value). Returns the kind spec or null when the id
 * isn't a known subcard (e.g. a stale drag handle). Generic over arbitrary
 * kinds — the param_key comes from the spec, not a hardcoded kind→key map.
 */
export declare function kindForId(params: Record<string, unknown>, id: string, kinds: ModifierKindSpec[]): ModifierKindSpec | null;
/**
 * Apply a drag drop to the param bag. Cross-kind drops are no-ops (each kind
 * has its own wire array at ``params[kind.param_key]``; a LoRA cannot swap
 * places with a ControlNet, nor with a clip_skip). Returns the same params
 * object when nothing moved (stable identity → no re-render).
 *
 * The ``kinds`` list is the declared modifier vocabulary (from
 * modifiersFeatureOf) — the param_key lookup is data-driven, not a hardcoded
 * ``kind === "lora" ? "loras" : "controlnets"`` ternary. A novel kind's drag
 * works the day it's declared, with zero code change here.
 */
export declare function applySubcardDrop(params: Record<string, unknown>, activeId: string, overId: string, kinds: ModifierKindSpec[]): Record<string, unknown>;
/**
 * New ControlNet entry from a schema entry — honors the catalog's declared
 * defaults (model, preprocessor, default_strength) with ControlNetApplyAdvanced
 * defaults for the step range. Returns null when the stack is full (max_stack).
 * Takes the KIND SPEC (the one contract entry) — no parallel feature shape.
 */
export declare function newControlnetEntry(entries: ControlNetEntry[], type: string, cnKind: ModifierKindSpec | null): ControlNetEntry | null;
/** New LoRA entry from an adapter name — default strength 1.0 (the
 * LoRA stack's own default when the spec omits it). */
export declare function newLoraEntry(id: string, strength?: number): LoRAEntry;
/**
 * New generic entry for a NOVEL modifier kind (not lora / controlnet — those
 * keep their bespoke templates above). Renders from ``kind.fields``: the
 * selected option's ``defaults`` win over field-level ``default`` over the
 * raw type zero (0 / "" / false). Returns null when the list is full
 * (``max_stack``, cardinality=list only). Scalar kinds return a single dict
 * at ``params[kind.param_key]`` — no id, no stack check.
 *
 * This is the proof the user demanded: a YAML block declaring a new kind
 * (clip_skip, sampler_override, …) gets a working create-template with ZERO
 * code beyond the catalog edit + the one ``@register`` applier. The generic
 * grid row + generic modal editor render from the same ``kind.fields``.
 */
export declare function newGenericEntry(kind: ModifierKindSpec, stackLength: number, optionValue?: string): Record<string, unknown> | null;
/** The lora kind's options as the legacy adapter list — the LoRA dropdown. */
export declare function loraAdaptersOf(kind: ModifierKindSpec | null): LoRAAdapter[];
/** The controlnet kind's options as the legacy schema-entry list — the CN dropdown. */
export declare function cnEntriesOf(kind: ModifierKindSpec | null): ControlNetSchemaEntry[];
/** LoRA strength bounds — from the kind's strength field (one source). */
export declare function loraStrengthBoundsOf(kind: ModifierKindSpec | null): {
    min: number;
    max: number;
    step: number;
};
/**
 * The generic arbitrary-kind list — the ONE key the frontend reads to decide
 * which modifier rows to render. Declared-only (Phase A finalé): the backend
 * emits ``features.modifiers`` from the catalog's ``modifiers:`` block and
 * nothing else — the legacy client-side projection is deleted (rule 4).
 * Returns ``[]`` when the family declares no modifier capability.
 */
export declare function modifiersFeatureOf(formSpec: Record<string, any> | null): ModifierKindSpec[];
/** The family declares at least one modifier kind. The grid renders iff true. */
export declare function hasModifierCapability(formSpec: Record<string, any> | null): boolean;
/** Find a kind's spec by its discriminator — convenience for the grid/modal. */
export declare function kindSpecOf(formSpec: Record<string, any> | null, kind: string): ModifierKindSpec | null;
//# sourceMappingURL=modifierSubcards.d.ts.map
