import type { CardGenre } from "@melite/contracts";
import type { CapabilityEntryWire, CapabilityRoute, CapabilitySubcategory, CardSummary, CatalogResponse, FamilyEntryWire, ModelEntryWire, OptionalOutput, PresetEntry, PromptGuide, PromptGuideSection, StudioBindingWire, TransformApplicability, VariantEntryWire } from "./wireTypes.js";
export type { PromptGuide, PromptGuideSection, CapabilitySubcategory, CapabilityRoute, PresetEntry };
export type FamilyEntry = FamilyEntryWire;
export type VariantEntry = VariantEntryWire;
export type ModelEntry = ModelEntryWire;
export type CapabilityEntry = CapabilityEntryWire;
export type Catalog = CatalogResponse;
export type TransformApplicabilityEntry = TransformApplicability;
export type CardSummaryEntry = CardSummary;
export type OptionalOutputEntry = OptionalOutput;
/** Source media type a family INGESTS — the closed ingest vocabulary
 * (the TS family DECLs own it), hand-maintained as a SUBSET of
 * CardGenre (no 3d/motion/other): those are output genres, not
 * ingest types. */
export type SourceMediaType = NonNullable<TransformApplicability["applies_to"]>[number];
/** Narrow the wire's plain string genre (string | null — the backend
 * Literal does not survive the wire as a type) onto the view union.
 * Out-of-vocabulary values return undefined (callers fall back) — never a
 * silent cast: an unknown genre must NOT masquerade as a known one. */
export declare function narrowGenre(g: string | null | undefined): CardGenre | undefined;
/** Known defaults keys the frontend reads — a VIEW refinement of the
 * wire's opaque defaults record ({[key: string]: unknown}); unknown keys
 * stay reachable through the index signature. */
export interface ModelDefaults {
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    /** Legacy spellings (2026-08-14 sweep) — pre-sweep saved cards still
     * carry them; the backend translates (sampling_steps→steps, etc). */
    sampling_steps?: number;
    guide_scale?: number;
    negative_prompt?: string;
    [k: string]: unknown;
}
/** CN type keys a family declares — derived from its ``modifiers:`` block
 * (kind=controlnet options; the ONLY source of truth, Phase A finalé).
 * ServicePicker advertises CN support per tile from this — the "weird
 * reason" most models show no CN subcards: only families that declare a
 * controlnet kind have CN support (DiT models without compatible CN
 * trainings correctly declare nothing). */
export declare function controlnetTypesOf(family: FamilyEntry | undefined): {
    type: string;
    label?: string;
}[];
/** Subscribe to catalog readiness. Called when the catalog transitions from
 * null → populated. Returns an unsubscribe fn. */
export declare function onCatalogReady(fn: () => void): () => void;
/** True after the catalog has been successfully loaded at least once. */
export declare function isCatalogLoaded(): boolean;
export declare function loadCatalog(opts?: {
    force?: boolean;
}): Promise<Catalog>;
/** Fire-and-forget background load with auto-retry. If the first attempt
 * fails (gateway reloading, network blip), schedules a retry after 3s.
 * Keeps trying until the catalog loads, then notifies subscribers.
 * Safe to call multiple times — collapses into a single inflight request. */
export declare function ensureCatalog(): void;
export declare function getCachedCatalog(): Catalog | null;
/** Seed the cache with pre-fetched data (test utility — production code uses
 * loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
 * a fake catalog without going to the network. */
export declare function primeCatalog(data: Catalog): void;
export declare function familyOf(routeKey: string, cat?: Catalog): string | undefined;
/**
 * The studio binding a route's family DECLARES (2026-08-17 unification;
 * §16 C0) — the custom-view contract (tenant / owns_params / the E4
 * writes allowlist) declared as the body: claim on the card row under
 * plugins/<id>/cards/ (its ONE definition site) and served on the family
 * entry. Resolves
 * route → family exactly like familyOf; a family that declares no
 * studio (every plain form family) yields undefined → no studio
 * affordance. NO bare-family-id fallback: the service on a card is a
 * ROUTE, and a phantom service that happens to spell a family id must
 * not match its way into a studio.
 */
export type StudioBinding = StudioBindingWire;
export declare function studioOf(routeKey: string, cat?: Catalog): StudioBinding | undefined;
/**
 * The catalog-declared FORM for a route key (the model's ``form`` — the
 * same id _FORM_CONFIGS keys by on the backend). Resolves variants to
 * their parent model like familyOf. The tag routes the model's
 * editor surface (the FORM LAW: a model without a form cannot route
 * or render). The 2026-09-18 retirement: the retired per-form alias
 * tables are gone — forms no longer reshape slot keys.
 */
export declare function formOf(routeKey: string, cat?: Catalog): string | undefined;
export declare function familyLabel(routeKey: string, cat?: Catalog): string;
/**
 * The family-declared media genre for a route key. Resolves model routes
 * AND raw family ids (``detect``) — the catalog passthrough
 * emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
 * brick families) return undefined → callers fall back to their generic
 * badge. The schema-driven replacement for engine-name substring
 * classifiers.
 */
export declare function familyGenre(routeKey: string, cat?: Catalog): CardGenre | undefined;
/**
 * The source-media types a family declares it ingests (FamilyEntry.accepts,
 * a closed literal on the backend). Returns the declared list, or
 * [] when the family declares none / is unknown.
 *
 * THE READER TODAY, STATED HONESTLY (the accepts-consumer audit,
 * 2026-10-10): this gate is SERVED (catalogEmission puts the DECL's
 * accepts on the /v1/model-catalog families block) and READ here,
 * but the promised last-mile consumer — a canvas drop handler
 * spawning an input card only for accepted media types — does not
 * exist in this checkout (the drop surface targets card slots via
 * the shared ASSET_DRAG_MIME contract, never spawns). The DECL's
 * truth is not a lie; the old comment's consumer was. The wiring
 * is owed work on the ROADMAP (canvas drop-spawn), and this
 * reader is the gate it will call — never a free-coded
 * isImageFile prefix check. (authored 2026-08-09; corrected
 * 2026-10-10)
 */
export declare function familyAccepts(routeKey: string, cat?: Catalog): SourceMediaType[];
/**
 * The media-type→param applicability matrix for a family's gated source
 * params: {paramName → [media types it applies to]}. Returns {} when the
 * family declares no transforms / is unknown. The InputCardEditor gates
 * field renders on this (no trim control for an image — no time axis) and
 * applySource strips params whose declared types no longer include the new
 * source's type — both driven ENTIRELY by this declaration, no hardcoded
 * image/video/audio branches. ONE source (input_prep.yaml transforms:),
 * TWO consumers (this editor + backend _validate_params_for_media), zero
 * drift. (2026-08-09)
 */
export declare function familyTransformMatrix(routeKey: string, cat?: Catalog): Record<string, SourceMediaType[]>;
/**
 * The family's declared video conditioning slots ([first_frame,
 * last_frame] for ltx) —
 * schema-driven input-wiring labels (no engine-name classifiers).
 */
/**
 * The compact card's declared size line (FamilyEntry.card_summary, a
 * validated block on the backend). Returns {width_param, height_param}
 * for generation families (rendered "WxH") OR {size_param, size_suffix} for
 * the Enhance / upscale families (rendered as a single value), or null when
 * the family declares no size line / is unknown. The CardTile reads whichever
 * is declared — no free-coded per-family dimension logic in the view.
 * (2026-08-09; size_param added 2026-08-10.)
 */
export declare function familyCardSummary(routeKey: string, cat?: Catalog): CardSummaryEntry | null;
export declare function familyConditioning(routeKey: string, cat?: Catalog): string[] | undefined;
/**
 * The family's declared optional outputs (Option A — the optional-outputs
 * vocabulary). Empty/undefined when the family declares none (legacy
 * single-output compat). Consumers render one editor per entry, keyed by
 * ``genre`` — the input card no longer declares any (mask removed
 * 2026-08-14), so this is the vocabulary for OTHER families that do.
 */
export declare function familyOptionalOutputs(familyId: string, cat?: Catalog): OptionalOutputEntry[];
/**
 * The catalog-declared Canvas default model route — the model whose entry
 * carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
 * CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
 * caller keeps its own pre-catalog bootstrap value).
 */
export declare function canvasDefaultModel(cat?: Catalog): string | undefined;
/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
export declare function variantLabel(routeKey: string, cat?: Catalog): string;
export interface FamilyOption {
    familyId: string;
    /** Route key used as the Select value and written to values.model on family pick. */
    primaryRoute: string;
    /** Human label for the dropdown item. */
    label: string;
}
/**
 * One entry per model family that has dropdown-visible members in the given
 * form. The primaryRoute is the catalog-declared `default_model` if present
 * (and visible), else the member whose key equals the family ID, else the
 * first visible member. Used to drive the family-level dropdown and the
 * empty-model seed. The default is FULLY catalog-declared — the frontend
 * never picks a default itself.
 */
export declare function familiesForForm(formTag: string, cat?: Catalog): FamilyOption[];
/**
 * Given a route key (including quant-tier variants like z-image-sd-q8),
 * return the family's primary route key — the one to use as the dropdown
 * value so the dropdown always shows the family even when a sub-variant is
 * selected.
 */
export declare function familyPrimaryRoute(routeKey: string, cat?: Catalog): string;
export declare function modelLabel(routeKey: string, cat?: Catalog): string;
/** Description for a model route, or undefined. Callers provide their own
 * fallback string — this returns `undefined` so `??` works. Reads the
 * `description:` declared on the model's family in the catalog YAML. */
export declare function modelDescription(routeKey: string, cat?: Catalog): string | undefined;
export declare function promptGuide(routeKey: string, cat?: Catalog): PromptGuide | undefined;
export declare function dropdownModels(formTag?: string, cat?: Catalog): string[];
export declare function variantSiblings(routeKey: string, cat?: Catalog): string[];
/**
 * Models hidden from the dropdown because they're reachable only via a
 * variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
 */
export declare function hiddenFromDropdown(cat?: Catalog): Set<string>;
/**
 * The ``variants:`` list for a model — resolves through the parent if the
 * route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
 * variants). Returns ``[]`` for models without variants.
 */
export declare function variantsForRoute(routeKey: string, cat?: Catalog): VariantEntry[];
/**
 * The route's served recipe presets — the LOAD-TIME per-route merge
 * (2026-08-18, compose model): every route's ``presets`` dict is the
 * head base layer (presets/ on the model head) ⊕ the owning variant's
 * layer (variants/<vid>/presets/), both only_routes-filtered AT LOAD
 * (variant wins on id collision). Own-only read: the backend attaches
 * the merged dict to EVERY route, so a fallback chain (tree-head scan,
 * the retired family-block carve-out) would be a second precedence —
 * the exact two-sources drift the composer's contract forbids. The
 * card and the run door read the SAME per-route dict, so the
 * h3-timeline incident dies by construction. only_routes gating is
 * not re-derived here — the wire never carries a gated-out preset.
 */
export declare function presetsForRoute(routeKey: string, cat?: Catalog): Record<string, PresetEntry> | undefined;
/**
 * Find the variant whose route matches ``routeKey`` — used to highlight the
 * active toggle when the form is hydrated from saved state.
 */
export declare function activeVariantForRoute(routeKey: string, cat?: Catalog): VariantEntry | undefined;
/**
 * The matrix coordinates of a route within its family's variant grid —
 * the values that distinguish it from its siblings. Read from the model
 * spec's ``variant`` (Turbo / Raw / Distilled / Base …) and ``quant``
 * (fp8 / q8 / q5 …) fields, resolving the FP8 default's quant through
 * its variant entries (the default route omits ``quant:`` since it IS
 * the fp8 tier).
 *
 * This is the ONE model for how variant axes compose (2026-08-08): every
 * axis is a labeled toggle row declared in ``variant_groups``, and the
 * routes are the cells of the grid. Krea 2 = Variant (Turbo/Raw) × Quant
 * (FP8/Q8/Q5) → 6 routes. The composer below switches one axis while
 * preserving the others.
 */
export declare function routeCoordinates(routeKey: string, cat?: Catalog): {
    variant: string | undefined;
    quant: string | undefined;
};
export declare function composeVariantRoute(currentRoute: string, clicked: {
    group?: string;
    quant?: string;
    route?: string;
}, cat?: Catalog): string;
/**
 * Only-existing-combinations (2026-08-16 — "ONLY show models combinations
 * that exist"): does clicking `clicked` from `currentRoute` land on a
 * REAL catalog cell?
 *
 * Derives the SAME wanted coordinates as the composer (axisWants — one
 * derivation) and asks the matrix directly whether that cell exists
 * (matrixCell). This is NOT derivable from composeVariantRoute's return:
 * the composer falls back to ``clicked.route`` when the cell is missing,
 * so a phantom combo and a real one return the same string — the silent
 * sibling-axis switch the fallback causes is exactly the phantom
 * combination this check keeps OUT of the axis dropdowns.
 *
 * Patch-only variants (no ``route``) always compose — they layer onto
 * whatever cell is active, so they always exist. An unresolvable family
 * (catalog not loaded yet) also passes: without the matrix we cannot
 * positively know a cell is missing, and the served variants list is
 * itself catalog-derived — hiding is only correct on positive evidence.
 */
export declare function axisCellExists(currentRoute: string, clicked: {
    group?: string;
    quant?: string;
    route?: string;
}, cat?: Catalog): boolean;
/**
 * True when the family owns its version axis via a declared ``Variant``
 * group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
 * matrix system in that case so the two never render duplicate rows
 * (2026-08-08 — one system, not two).
 */
export declare function familyHasVariantAxis(routeKey: string, cat?: Catalog): boolean;
//# sourceMappingURL=modelCatalog.d.ts.map
