// modifierSubcards — modifiers as dependent mini-cards.
//
// THE STORAGE IS THE WIRE (2026-08-07, recon revision): params.loras[] /
// params.controlnets[] are already the wire shape (executeGeneration spreads
// stage.params into POST /v1/flows/start), already round-trip through
// run hydration, already agent-writable. A parallel stage.modifiers field
// would be a second source of truth (rule 4). So this module is a VIEW +
// interaction layer over the param-bag entries: types (migrated from the
// deleted ModifiersModal), subcard derivation, reorder, and add-entry
// templates that honor the catalog's schema defaults.
//
// Apply order = array order — structural, not conventional: apply_controlnets
// (media/comfyui/core/controlnets.py) chains ControlNetApply in
// `for cn_spec in controlnets` order; apply_loras (core/loras.py) chains
// LoraLoader nodes in `for spec in loras` order. Drag-reorder rewrites the
// array; the composed ComfyUI graph follows (rule-2). Families, GPU,
// and the wire NEVER change.
import type { LoRAEntry } from "./loraTypes.ts"

// ── Wire entry shapes (the ONLY storage) ──────────────────────────────────

export interface ControlNetEntry {
 id: string
 type: string
 model?: string
 preprocessor?: string
 image_b64: string
 strength: number
 enabled: boolean
 source: "workflow" | "user"
 // Per-card CN step range — ComfyUI ControlNetApplyAdvanced contract.
 // start_percent = 0.0, end_percent = 1.0 means "apply across all steps".
 // Defaults match ControlNetApplyAdvanced.
 start_percent?: number
 end_percent?: number
}

export interface ControlNetSchemaEntry {
 type: string
 label: string
 tooltip?: string
 model?: string
 default_strength?: number
 preprocessor?: string
 installed?: boolean
}

// Fallback for find()/Map.get misses — keeps lookup sites typed instead of
// widening to `{}` via `?? {}`.
export const NO_CN_SCHEMA: ControlNetSchemaEntry = { type: "", label: "" }

/** Catalog adapter entry — a lora kind's option projected to the legacy
 * adapter shape (the shape the old ``features.loras.adapters`` carried, so
 * the graduated LoRA tile editor reads the same fields). Produced 1:1 by
 * loraAdaptersOf from the kind's options; ``name`` is the wire value. */
export interface LoRAAdapter {
 name: string
 filename?: string
 label?: string
 category?: string
 default_strength?: number
 prompt_hint?: string | null
 installed?: boolean
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
 modifiers?: ModifierKindSpec[]
}

// ── Generic modifier-kind spec (mirrors backend ModifierKind) ─────────────
//
// ARBITRARY by design (rule: declarative, no closed union). ``kind`` is an
// OPEN string — ``lora`` / ``controlnet`` are the first two instances, not
// the whole vocabulary. Adding ``clip_skip`` (or any model-modifying
// ComfyUI node) is a YAML block + one ``@register`` applier; this type, the
// grid loop, and the generic field renderer are unchanged. The closed
// ``SubcardKind = "lora" | "controlnet"`` union was the artifact the user
// rejected ("we need a declaritive model validated by pandatic and not
// lazy 'woah! this one thing works when I hard code it!'").

export type ModifierFieldType = "integer" | "float" | "string" | "select" | "image" | "boolean"

// ── Wire contract aliases (2026-08-11) ───────────────────────────────────
// The generic modifier-kind spec IS the backend's strict contract — the
// generated components["schemas"]["ModifierKindSpec"] (from
// catalog_schema.ModifierKind: extra="forbid", options_scanned declared,
// min/max/step float). The hand-written mirrors were duplicates that could
// drift and LIE on the wire — exactly the two-schema disease this
// openapi.json migration exists to kill. The only added field is
// ``disk_subdir``, a FRONTEND-COMPUTED view value (resolve_lora_subdir)
// that never ships on the wire.
import type { components } from "./schema.ts"

type WireModifierFieldSpec = components["schemas"]["ModifierFieldSpec"]
type WireModifierOptionSpec = components["schemas"]["ModifierOptionSpec"]

export type ModifierFieldSpec = WireModifierFieldSpec
export type ModifierOptionSpec = WireModifierOptionSpec

export type ModifierKindSpec = WireModifierKindSpec

type WireModifierKindSpec = components["schemas"]["ModifierKindSpec"] & {
 /** Backend-resolved canonical scan subdir for the lora kind —
 * resolve_lora_subdir(family.lora_dir or _slug(family_id)). The
 * empty-state hint renders /opt/ComfyUI/models/loras/<disk_subdir>/
 * from THIS (not upload_dir, which drifted out of sync and lied). */
 disk_subdir?: string | null
}

// ── The subcard view model ────────────────────────────────────────────────

/** Arbitrary kind — open string. ``lora`` / ``controlnet`` are the first two
 * instances, not the whole vocabulary (see ModifierKindSpec). */
export type SubcardKind = string

export interface ModifierSubcard {
 id: string
 kind: SubcardKind
 /** Display label — LoRA file base name or the CN schema label. */
 label: string
 /** LoRA-only — the wire entry name (subcard id = `lora-${name}`). */
 name?: string
 enabled: boolean
 strength: number
 /** LoRA-only — false when the wire row carried NO strength (the
  * recipe landing stamps {id}); the tile then displays the adapter's
  * default_strength — the effective value compose seeds server-side. */
 strengthSet?: boolean
 /** ControlNet-only — the type key (schema lookup) + conditioning image. */
 type?: string
 model?: string
 preprocessor?: string
 image_b64?: string
 start_percent?: number
 end_percent?: number
}

/** Stable drag id. Both entry kinds key by `id` (the lora entry's id IS
 * the adapter catalog id). `?? name` tolerates pre-2026-09-06 drafts so
 * old cards load; the next save rewrites them as id-keyed rows. */
export function subcardId(kind: SubcardKind, entry: { id?: string; name?: string }): string {
 return kind === "controlnet" ? entry.id ?? "" : `lora-${entry.id ?? entry.name ?? ""}`
}

/** Normalize a wire lora row: id wins, the fossil `name` key migrates.
 * An empty id passes through — compose refuses it loudly; the tile still
 * renders so the operator can see and delete the broken entry. */
export function loraIdOf(entry: { id?: string; name?: string }): string {
 return String(entry.id ?? entry.name ?? "").trim()
}

/** The migration shape: a pre-2026-09-06 wire row carried `name`
 * instead of `id`. READ boundaries accept it (loraIdOf /
 * normalizeLoraEntry / subcardId); WRITE boundaries emit ONLY
 * LoRAEntry — the fossil key is never re-emitted. This is the ONE
 * declared boundary type (no `as never` / `as {name?: string}`
 * hand-casts at call sites). */
export type LoraWireInput = { id?: string; name?: string; strength?: number }

/** A fossil `{name, strength}` row (pre-2026-09-06 wire) becomes an
 * id-keyed row — ONE shape leaves every boundary (modal draft, bag
 * commit, run body). The fossil key is dropped, never re-emitted.
 * A row missing `strength` (never emitted by the pre-flip UI, but a
 * hand-edited draft may carry one) takes 1.0 — the same house default
 * the catalog row seeds at compose. */
export function normalizeLoraEntry(entry: LoraWireInput): LoRAEntry {
 return {
 id: loraIdOf(entry),
 strength: typeof entry.strength === "number" ? entry.strength : 1.0,
 }
}

// ── Derivation ────────────────────────────────────────────────────────────

/** Derive the subcard view from the param bag — a pure projection. */
export function subcardsFromParams(params: Record<string, unknown>): ModifierSubcard[] {
 const loras = (params.loras as LoRAEntry[] | undefined) ?? []
 const cns = (params.controlnets as ControlNetEntry[] | undefined) ?? []
 return [
 ...loras.map((l) => {
 const lid = loraIdOf(l)
 // A strength-less row (the recipe rows land {id} only — compose
 // seeds the LoraRow default server-side) projects the 1.0 fallback
 // so no renderer ever sees undefined; `strengthSet` lets the tile
 // UPGRADE the display to the adapter's default_strength — the same
 // effective value the run uses.
 return {
 id: `lora-${lid}`,
 kind: "lora" as SubcardKind,
 label: loraLabel(lid),
 name: lid,
 enabled: true,
 strength: typeof l.strength === "number" ? l.strength : 1.0,
 strengthSet: typeof l.strength === "number",
 }
 }),
 ...cns.map((c) => ({
 id: subcardId("controlnet", c),
 kind: "controlnet" as SubcardKind,
 label: c.type,
 enabled: c.enabled,
 strength: c.strength,
 type: c.type,
 model: c.model,
 preprocessor: c.preprocessor,
 image_b64: c.image_b64,
 start_percent: c.start_percent,
 end_percent: c.end_percent,
 })),
 ]
}

/** Human label for a LoRA entry (file base name, extension stripped). */
export function loraLabel(name: string): string {
 // String.split() always yields ≥1 element, so pop() is always a string
 // here — the `?? name` fallback this replaces could never fire (proven
 // dead 2026-09-12; behavior identical for every input).
 const base = name.split("/").pop() as string
 return base.replace(/\.(safetensors|pt|ckpt)$/, "")
}

/** Total subcard count on a card — the collapsed-tile "+N" hint. */
export function subcardCount(params: Record<string, unknown>): number {
 const loras = (params.loras as unknown[] | undefined) ?? []
 const cns = (params.controlnets as unknown[] | undefined) ?? []
 return loras.length + cns.length
}

// ── Reorder (the drag-and-drop application) ───────────────────────────────

/** Pure array move — the ONLY way order changes (dragEnd → this). */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
 if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
 const next = [...arr]
 const [moved] = next.splice(from, 1)
 next.splice(to, 0, moved)
 return next
}

/**
 * Resolve which declared kind a draggable subcard id belongs to. Walks each
 * LIST-kind's wire array (scalar kinds aren't draggable — no reorder
 * semantics on a single value). Returns the kind spec or null when the id
 * isn't a known subcard (e.g. a stale drag handle). Generic over arbitrary
 * kinds — the param_key comes from the spec, not a hardcoded kind→key map.
 */
export function kindForId(
 params: Record<string, unknown>,
 id: string,
 kinds: ModifierKindSpec[],
): ModifierKindSpec | null {
 for (const kind of kinds) {
 if (kind.cardinality === "scalar") continue
 const arr = (params[kind.param_key] as Array<{ id?: string; name?: string }> | undefined) ?? []
 if (arr.some((e) => subcardId(kind.kind, e) === id)) return kind
 }
 return null
}

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
export function applySubcardDrop(
 params: Record<string, unknown>,
 activeId: string,
 overId: string,
 kinds: ModifierKindSpec[],
): Record<string, unknown> {
 const spec = kindForId(params, activeId, kinds)
 if (!spec) return params
 if (kindForId(params, overId, kinds)?.kind !== spec.kind) return params
 // kindForId matched activeId inside this very array, so the key is
 // present — the `?? []` fallback this replaces could never fire (proven
 // dead 2026-09-12; behavior identical for every input).
 const arr = params[spec.param_key] as unknown[]
 const from = arr.findIndex((e) => subcardId(spec.kind, e as { id?: string; name?: string }) === activeId)
 const to = arr.findIndex((e) => subcardId(spec.kind, e as { id?: string; name?: string }) === overId)
 const next = moveItem(arr, from, to)
 return next === arr ? params : { ...params, [spec.param_key]: next }
}

// ── Add-entry templates (schema defaults from the form-spec, rule 3) ──────

let _cnIdCounter = 0
function newCnId(): string {
 _cnIdCounter += 1
 return `cn-${Date.now().toString(36)}-${_cnIdCounter}`
}

/**
 * New ControlNet entry from a schema entry — honors the catalog's declared
 * defaults (model, preprocessor, default_strength) with ControlNetApplyAdvanced
 * defaults for the step range. Returns null when the stack is full (max_stack).
 * Takes the KIND SPEC (the one contract entry) — no parallel feature shape.
 */
export function newControlnetEntry(
 entries: ControlNetEntry[],
 type: string,
 cnKind: ModifierKindSpec | null,
): ControlNetEntry | null {
 const maxStack = cnKind?.max_stack ?? 3
 if (entries.length >= maxStack) return null
 const schema = cnEntriesOf(cnKind).find((e) => e.type === type) ?? NO_CN_SCHEMA
 const strengthField = cnKind?.fields.find((f) => f.name === "strength")
 // The generated field spec types `default` as unknown — a non-number
 // would have slipped into `strength` at runtime. typeof guard keeps the
 // honest numeric fallback.
 const declaredDefault = strengthField?.default
 const defaultStrength = typeof declaredDefault === "number" ? declaredDefault : 0.8
 return {
 id: newCnId(),
 type,
 model: schema.model,
 preprocessor: schema.preprocessor,
 image_b64: "",
 strength: schema.default_strength ?? defaultStrength,
 // ComfyUI ControlNetApplyAdvanced defaults — full schedule.
 start_percent: 0.0,
 end_percent: 1.0,
 enabled: true,
 source: "user",
 }
}

/** New LoRA entry from an adapter name — default strength 1.0 (apply_loras'
 * own default when the spec omits it). */
export function newLoraEntry(id: string, strength = 1.0): LoRAEntry {
 return { id, strength }
}

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
export function newGenericEntry(
 kind: ModifierKindSpec,
 stackLength: number,
 optionValue?: string,
): Record<string, unknown> | null {
 if (kind.cardinality === "list") {
 const maxStack = kind.max_stack ?? 5
 if (stackLength >= maxStack) return null
 }
 const option = kind.options?.find((o) => o.value === optionValue)
 const entry: Record<string, unknown> = {}
 for (const field of kind.fields) {
 const fromOption = option?.defaults?.[field.name]
 if (fromOption !== undefined) {
 entry[field.name] = fromOption
 } else if (field.default !== undefined && field.default !== null) {
 entry[field.name] = field.default
 } else {
 entry[field.name] = defaultForType(field.type)
 }
 }
 if (kind.cardinality === "list") {
 entry.id = newCnId()
 }
 if (optionValue !== undefined && !("value" in entry)) {
 // Carry the selected option's value when the kind has an option-picker
 // and no explicit field stores it. The generic modal reads it back to
 // resolve the current option's tooltip/defaults on edit.
 entry.value = optionValue
 }
 return entry
}

/** The type-correct zero for a modifier field with no declared default. */
function defaultForType(type: ModifierFieldType): unknown {
 switch (type) {
 case "integer":
 case "float": return 0
 case "boolean": return false
 case "select": return ""
 case "image": return ""
 case "string": return ""
 }
}

// ── Capability accessors (typed reads over the loose spec, rule 3) ────────
//
// INVERSE PROJECTIONS (Phase A finalé, rule 4): the legacy
// ``features.loras`` / ``features.controlnet`` objects are GONE server-side
// — ``features.modifiers`` is the ONE feature key. These views rebuild the
// bespoke-view shapes (the graduated LoRA/CN tile editors) 1:1 from a KIND
// SPEC — never from the formSpec directly. kindSpecOf(formSpec, kind) is the
// single spec entry point; every view below takes a kind spec, so there are
// NO parallel formSpec extractors to silently diverge (2026-08-11: the
// lorasFeatureOf/cnFeatureOf pair was deleted — the modal read one shape
// while the grid read another, and a divergence rendered empty dropdowns
// with zero signal). The mapping mirrors the backend's ``_option_to_legacy_cn``
// — kept in sync by the tests.

/** The lora kind's options as the legacy adapter list — the LoRA dropdown. */
export function loraAdaptersOf(kind: ModifierKindSpec | null): LoRAAdapter[] {
 if (!kind) return []
 return (kind.options ?? []).map((o): LoRAAdapter => ({
 name: o.value,
 filename: o.model ?? o.value,
 label: o.label,
 category: (o.metadata?.category as string | undefined) ?? "LoRA",
 default_strength: (o.defaults?.strength as number | undefined) ?? 1.0,
 prompt_hint: (o.metadata?.prompt_hint as string | undefined) ?? null,
 installed: o.installed ?? true,
 }))
}

/** The controlnet kind's options as the legacy schema-entry list — the CN dropdown. */
export function cnEntriesOf(kind: ModifierKindSpec | null): ControlNetSchemaEntry[] {
 if (!kind) return []
 const strengthField = kind.fields.find((f) => f.name === "strength")
 return (kind.options ?? []).map((o): ControlNetSchemaEntry => ({
 type: o.value,
 label: o.label,
 tooltip: o.tooltip ?? undefined,
 model: o.model ?? undefined,
 default_strength:
 (o.defaults?.strength as number | undefined)
 ?? (strengthField?.default as number | undefined)
 ?? 0.8,
 preprocessor: (o.metadata?.preprocessor as string | undefined) ?? undefined,
 installed: o.installed ?? undefined,
 }))
}

/** LoRA strength bounds — from the kind's strength field (one source). */
export function loraStrengthBoundsOf(kind: ModifierKindSpec | null): {
 min: number; max: number; step: number
} {
 const strengthField = kind?.fields.find((f) => f.name === "strength")
 return {
 min: strengthField?.min ?? -2,
 max: strengthField?.max ?? 5,
 step: strengthField?.step ?? 0.05,
 }
}

/**
 * The generic arbitrary-kind list — the ONE key the frontend reads to decide
 * which modifier rows to render. Declared-only (Phase A finalé): the backend
 * emits ``features.modifiers`` from the catalog's ``modifiers:`` block and
 * nothing else — the legacy client-side projection is deleted (rule 4).
 * Returns ``[]`` when the family declares no modifier capability.
 */
export function modifiersFeatureOf(formSpec: Record<string, any> | null): ModifierKindSpec[] {
 const raw = formSpec?.features?.modifiers
 return Array.isArray(raw) ? (raw as ModifierKindSpec[]) : []
}

/** The family declares at least one modifier kind. The grid renders iff true. */
export function hasModifierCapability(formSpec: Record<string, any> | null): boolean {
 return modifiersFeatureOf(formSpec).length > 0
}

/** Find a kind's spec by its discriminator — convenience for the grid/modal. */
export function kindSpecOf(formSpec: Record<string, any> | null, kind: string): ModifierKindSpec | null {
 return modifiersFeatureOf(formSpec).find((k) => k.kind === kind) ?? null
}
