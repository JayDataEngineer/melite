// Fallback for find()/Map.get misses — keeps lookup sites typed instead of
// widening to `{}` via `?? {}`.
export const NO_CN_SCHEMA = { type: "", label: "" };
/** Stable drag id. Both entry kinds key by `id` (the lora entry's id IS
 * the adapter catalog id). `?? name` tolerates pre-2026-09-06 drafts so
 * old cards load; the next save rewrites them as id-keyed rows. */
export function subcardId(kind, entry) {
    return kind === "controlnet" ? entry.id ?? "" : `lora-${entry.id ?? entry.name ?? ""}`;
}
/** Normalize a wire lora row: id wins, the fossil `name` key migrates.
 * An empty id passes through — compose refuses it loudly; the tile still
 * renders so the operator can see and delete the broken entry. */
export function loraIdOf(entry) {
    return String(entry.id ?? entry.name ?? "").trim();
}
/** A fossil `{name, strength}` row (pre-2026-09-06 wire) becomes an
 * id-keyed row — ONE shape leaves every boundary (modal draft, bag
 * commit, run body). The fossil key is dropped, never re-emitted.
 * A row missing `strength` (never emitted by the pre-flip UI, but a
 * hand-edited draft may carry one) takes 1.0 — the same house default
 * the catalog row seeds at compose. */
export function normalizeLoraEntry(entry) {
    return {
        id: loraIdOf(entry),
        strength: typeof entry.strength === "number" ? entry.strength : 1.0,
    };
}
// ── Derivation ────────────────────────────────────────────────────────────
/** Derive the subcard view from the param bag — a pure projection. */
export function subcardsFromParams(params) {
    const loras = params.loras ?? [];
    const cns = params.controlnets ?? [];
    return [
        ...loras.map((l) => {
            const lid = loraIdOf(l);
            // A strength-less row (the recipe rows land {id} only — compose
            // seeds the LoraRow default server-side) projects the 1.0 fallback
            // so no renderer ever sees undefined; `strengthSet` lets the tile
            // UPGRADE the display to the adapter's default_strength — the same
            // effective value the run uses.
            return {
                id: `lora-${lid}`,
                kind: "lora",
                label: loraLabel(lid),
                name: lid,
                enabled: true,
                strength: typeof l.strength === "number" ? l.strength : 1.0,
                strengthSet: typeof l.strength === "number",
            };
        }),
        ...cns.map((c) => ({
            id: subcardId("controlnet", c),
            kind: "controlnet",
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
    ];
}
/** Human label for a LoRA entry (file base name, extension stripped). */
export function loraLabel(name) {
    // String.split() always yields ≥1 element, so pop() is always a string
    // here — the `?? name` fallback this replaces could never fire (proven
    // dead 2026-09-12; behavior identical for every input).
    const base = name.split("/").pop();
    return base.replace(/\.(safetensors|pt|ckpt)$/, "");
}
/** Total subcard count on a card — the collapsed-tile "+N" hint. */
export function subcardCount(params) {
    const loras = params.loras ?? [];
    const cns = params.controlnets ?? [];
    return loras.length + cns.length;
}
// ── Reorder (the drag-and-drop application) ───────────────────────────────
/** Pure array move — the ONLY way order changes (dragEnd → this). */
export function moveItem(arr, from, to) {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length)
        return arr;
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}
/**
 * Resolve which declared kind a draggable subcard id belongs to. Walks each
 * LIST-kind's wire array (scalar kinds aren't draggable — no reorder
 * semantics on a single value). Returns the kind spec or null when the id
 * isn't a known subcard (e.g. a stale drag handle). Generic over arbitrary
 * kinds — the param_key comes from the spec, not a hardcoded kind→key map.
 */
export function kindForId(params, id, kinds) {
    for (const kind of kinds) {
        if (kind.cardinality === "scalar")
            continue;
        const arr = params[kind.param_key] ?? [];
        if (arr.some((e) => subcardId(kind.kind, e) === id))
            return kind;
    }
    return null;
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
export function applySubcardDrop(params, activeId, overId, kinds) {
    const spec = kindForId(params, activeId, kinds);
    if (!spec)
        return params;
    if (kindForId(params, overId, kinds)?.kind !== spec.kind)
        return params;
    // kindForId matched activeId inside this very array, so the key is
    // present — the `?? []` fallback this replaces could never fire (proven
    // dead 2026-09-12; behavior identical for every input).
    const arr = params[spec.param_key];
    const from = arr.findIndex((e) => subcardId(spec.kind, e) === activeId);
    const to = arr.findIndex((e) => subcardId(spec.kind, e) === overId);
    const next = moveItem(arr, from, to);
    return next === arr ? params : { ...params, [spec.param_key]: next };
}
// ── Add-entry templates (schema defaults from the form-spec, rule 3) ──────
let _cnIdCounter = 0;
function newCnId() {
    _cnIdCounter += 1;
    return `cn-${Date.now().toString(36)}-${_cnIdCounter}`;
}
/**
 * New ControlNet entry from a schema entry — honors the catalog's declared
 * defaults (model, preprocessor, default_strength) with ControlNetApplyAdvanced
 * defaults for the step range. Returns null when the stack is full (max_stack).
 * Takes the KIND SPEC (the one contract entry) — no parallel feature shape.
 */
export function newControlnetEntry(entries, type, cnKind) {
    const maxStack = cnKind?.max_stack ?? 3;
    if (entries.length >= maxStack)
        return null;
    const schema = cnEntriesOf(cnKind).find((e) => e.type === type) ?? NO_CN_SCHEMA;
    const strengthField = cnKind?.fields.find((f) => f.name === "strength");
    // The generated field spec types `default` as unknown — a non-number
    // would have slipped into `strength` at runtime. typeof guard keeps the
    // honest numeric fallback.
    const declaredDefault = strengthField?.default;
    const defaultStrength = typeof declaredDefault === "number" ? declaredDefault : 0.8;
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
    };
}
/** New LoRA entry from an adapter name — default strength 1.0 (the
 * LoRA stack's own default when the spec omits it). */
export function newLoraEntry(id, strength = 1.0) {
    return { id, strength };
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
export function newGenericEntry(kind, stackLength, optionValue) {
    if (kind.cardinality === "list") {
        const maxStack = kind.max_stack ?? 5;
        if (stackLength >= maxStack)
            return null;
    }
    const option = kind.options?.find((o) => o.value === optionValue);
    const entry = {};
    for (const field of kind.fields) {
        const fromOption = option?.defaults?.[field.name];
        if (fromOption !== undefined) {
            entry[field.name] = fromOption;
        }
        else if (field.default !== undefined && field.default !== null) {
            entry[field.name] = field.default;
        }
        else {
            entry[field.name] = defaultForType(field.type);
        }
    }
    if (kind.cardinality === "list") {
        entry.id = newCnId();
    }
    if (optionValue !== undefined && !("value" in entry)) {
        // Carry the selected option's value when the kind has an option-picker
        // and no explicit field stores it. The generic modal reads it back to
        // resolve the current option's tooltip/defaults on edit.
        entry.value = optionValue;
    }
    return entry;
}
/** The type-correct zero for a modifier field with no declared default. */
function defaultForType(type) {
    switch (type) {
        case "integer":
        case "float": return 0;
        case "boolean": return false;
        case "select": return "";
        case "image": return "";
        case "string": return "";
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
export function loraAdaptersOf(kind) {
    if (!kind)
        return [];
    return (kind.options ?? []).map((o) => ({
        name: o.value,
        filename: o.model ?? o.value,
        label: o.label,
        category: o.metadata?.category ?? "LoRA",
        default_strength: o.defaults?.strength ?? 1.0,
        prompt_hint: o.metadata?.prompt_hint ?? null,
        installed: o.installed ?? true,
    }));
}
/** The controlnet kind's options as the legacy schema-entry list — the CN dropdown. */
export function cnEntriesOf(kind) {
    if (!kind)
        return [];
    const strengthField = kind.fields.find((f) => f.name === "strength");
    return (kind.options ?? []).map((o) => ({
        type: o.value,
        label: o.label,
        tooltip: o.tooltip ?? undefined,
        model: o.model ?? undefined,
        default_strength: o.defaults?.strength
            ?? strengthField?.default
            ?? 0.8,
        preprocessor: o.metadata?.preprocessor ?? undefined,
        installed: o.installed ?? undefined,
    }));
}
/** LoRA strength bounds — from the kind's strength field (one source). */
export function loraStrengthBoundsOf(kind) {
    const strengthField = kind?.fields.find((f) => f.name === "strength");
    return {
        min: strengthField?.min ?? -2,
        max: strengthField?.max ?? 5,
        step: strengthField?.step ?? 0.05,
    };
}
/**
 * The generic arbitrary-kind list — the ONE key the frontend reads to decide
 * which modifier rows to render. Declared-only (Phase A finalé): the backend
 * emits ``features.modifiers`` from the catalog's ``modifiers:`` block and
 * nothing else — the legacy client-side projection is deleted (rule 4).
 * Returns ``[]`` when the family declares no modifier capability.
 */
export function modifiersFeatureOf(formSpec) {
    const raw = formSpec?.features?.modifiers;
    return Array.isArray(raw) ? raw : [];
}
/** The family declares at least one modifier kind. The grid renders iff true. */
export function hasModifierCapability(formSpec) {
    return modifiersFeatureOf(formSpec).length > 0;
}
/** Find a kind's spec by its discriminator — convenience for the grid/modal. */
export function kindSpecOf(formSpec, kind) {
    return modifiersFeatureOf(formSpec).find((k) => k.kind === kind) ?? null;
}
//# sourceMappingURL=modifierSubcards.js.map
