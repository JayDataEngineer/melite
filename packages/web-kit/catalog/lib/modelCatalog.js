// Editor model catalog client — the TS catalog owner (selectors below plus ./wireTypes.ts).
//
// Single source of truth for the webform. All family relationships,
// variant groupings, defaults, prompt guides, and variant declarations
// live in plugins/melite-core/models/ on the backend. This module
// fetches /v1/model-catalog and exposes typed selectors — NO per-model
// or per-family logic lives in component code.
//
// Usage:
// const cat = await loadCatalog()
// familyLabel("krea-2-sd-q8") // → "Krea 2"
// dropdownModels("form_generate") // → ["anima","ideogram4",...]
// variantSiblings("krea-2") // → ["krea-2","krea-2-raw",...]
// variantsForRoute("krea-2") // → [{id:"int8",quant:"int8",route:"krea-2",...}]
// modelLabel("krea-2") // → "Krea 2"
import { apiJson } from "./api.js";
import { CatalogContractError, validateCatalogContract, } from "./catalogContract.js";
import { useCatalogContractStore } from "./catalogContractStore.js";
import { createClientStore } from "./clientStore.js";
/** Media category — VIEW vocabulary for card badges + video gating, NOT a
 * wire mirror: the wire declares genre as a plain string (no literal), so
 * the closed union lives here as a documented narrowing. */
/** The closed CardGenre vocabulary — the membership test for narrowGenre.
 * One source; the union and the list cannot drift apart. */
const CARD_GENRES = ["image", "video", "audio", "3d", "motion", "other", "text"];
/** Narrow the wire's plain string genre (string | null — the backend
 * Literal does not survive the wire as a type) onto the view union.
 * Out-of-vocabulary values return undefined (callers fall back) — never a
 * silent cast: an unknown genre must NOT masquerade as a known one. */
export function narrowGenre(g) {
    return CARD_GENRES.find((genre) => genre === g);
}
/** CN type keys a family declares — derived from its ``modifiers:`` block
 * (kind=controlnet options; the ONLY source of truth, Phase A finalé).
 * ServicePicker advertises CN support per tile from this — the "weird
 * reason" most models show no CN subcards: only families that declare a
 * controlnet kind have CN support (DiT models without compatible CN
 * trainings correctly declare nothing). */
export function controlnetTypesOf(family) {
    const kind = (family?.modifiers ?? []).find((m) => m.kind === "controlnet");
    return (kind?.options ?? []).map((o) => ({ type: o.value, label: o.label }));
}
// ── Loader with in-memory cache + background retry ─────────────────────────
//
// The catalog is the single source of truth for the webform. If the gateway
// is briefly unreachable (dev-mode reload, deploy, network blip), the first
// load fails. Without auto-retry, the UI shows "No models available" and
// stays broken until the user manually reloads the page.
//
// ensureCatalog() fires a background load that retries with backoff until it
// succeeds. Components call it on mount; the subscription mechanism triggers
// a re-render when the catalog finally arrives.
//
// TTL: the cache expires after _CACHE_TTL_MS. The next loadCatalog() call
// after expiry re-fetches in the background while still returning the stale
// cache for immediate responsiveness. This ensures YAML catalog edits are
// picked up without a manual page refresh.
// THE SANCTIONED SEAT (the hand-roll row 1.7): the catalog cache is a
// module-level value with subscribers — `createClientStore` owns the
// record, the observation and the publication. `_cacheTime`, the retry
// timer and the in-flight flag stay module locals: they are not observed
// state, and the seat's contract is about what SUBSCRIBERS see.
const catalogStore = createClientStore({ catalog: null, loaded: false });
let _cacheTime = 0; // Date.now() of last successful fetch
const _CACHE_TTL_MS = 30_000; // 30 seconds
let _inflight = null;
let _bgRetryTimer = null;
/** Subscribe to catalog readiness. Called when the catalog transitions from
 * null → populated. Returns an unsubscribe fn. R-S10 (2026-10-22): the
 * guard honors the doc — background TTL refreshes (setState with a new
 * catalog) re-fire nothing; only the null → populated transition fires. */
export function onCatalogReady(fn) {
    return catalogStore.subscribe((next, prev) => { if (!prev.catalog && next.catalog)
        fn(); });
}
/** True after the catalog has been successfully loaded at least once. */
export function isCatalogLoaded() {
    return catalogStore.getState().loaded;
}
/** Fetch the model catalog. THROWS on non-2xx (no silent empty `{}`).
 * The caller MUST surface the error. Returning a fake empty catalog here
 * is what hid every "model dropdown is empty" bug — the user saw nothing
 * and the console warning was invisible. Loud failure is honest. */
/** The ONE ingest gate (2026-08-11): validate BEFORE caching.
 * A catalog that violates the contract is a BACKEND bug — reported to the
 * contract store, NEVER cached, and the caller gets a
 * CatalogContractError (ensureCatalog will not auto-retry it). */
function _ingest(data) {
    const { valid, violations } = validateCatalogContract(data);
    if (!valid)
        throw new CatalogContractError(violations);
    useCatalogContractStore.getState().reportOk();
    const catalog = data;
    _cacheTime = Date.now();
    catalogStore.setState({ catalog, loaded: true });
    return catalog;
}
export async function loadCatalog(opts) {
    // TTL check: if the cache is older than _CACHE_TTL_MS, re-fetch in the
    // background. The stale cache is returned immediately so the UI stays
    // responsive; listeners fire when the fresh data arrives.
    const cached = catalogStore.getState().catalog;
    if (cached && !opts?.force) {
        const age = Date.now() - _cacheTime;
        if (age > _CACHE_TTL_MS && !_inflight) {
            // Background refresh — don't await, don't block the caller. A failure
            // (fetch error OR contract violation) is REPORTED to the store and the
            // STALE GOOD cache keeps serving — there is no caller to propagate to.
            _inflight = (async () => {
                try {
                    _ingest(await apiJson("/v1/model-catalog"));
                }
                catch (e) {
                    if (e instanceof CatalogContractError) {
                        useCatalogContractStore.getState().reportViolation(e.violations);
                    }
                    else {
                        useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
                    }
                }
                // Resolve with the (possibly stale) cache: on failure the GOOD cache
                // keeps serving, on success it just got replaced by _ingest.
                return catalogStore.getState().catalog;
            })().finally(() => { _inflight = null; });
        }
        return cached;
    }
    if (_inflight)
        return _inflight;
    _inflight = (async () => {
        try {
            // Let apiJson throw on non-2xx (no try/catch around the fetch itself —
            // errors propagate, the caller must surface them).
            return _ingest(await apiJson("/v1/model-catalog"));
        }
        catch (e) {
            if (e instanceof CatalogContractError) {
                useCatalogContractStore.getState().reportViolation(e.violations);
            }
            else {
                useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
            }
            throw e;
        }
    })().finally(() => {
        _inflight = null;
    });
    return _inflight;
}
/** Fire-and-forget background load with auto-retry. If the first attempt
 * fails (gateway reloading, network blip), schedules a retry after 3s.
 * Keeps trying until the catalog loads, then notifies subscribers.
 * Safe to call multiple times — collapses into a single inflight request. */
export function ensureCatalog() {
    if (catalogStore.getState().loaded)
        return;
    if (_inflight)
        return; // already trying
    loadCatalog()
        .then(() => {
        if (_bgRetryTimer) {
            clearTimeout(_bgRetryTimer);
            _bgRetryTimer = null;
        }
    })
        .catch((e) => {
        // A contract VIOLATION is a backend bug — retrying a lying catalog
        // every 3s is theater. The verdict sits in the contract store; the
        // user's Retry (banner) re-fetches once the backend is fixed.
        if (e instanceof CatalogContractError) {
            console.error("[modelCatalog] catalog contract violation — not auto-retrying:", e.message);
            return;
        }
        // The gateway may be briefly unreachable during a dev-mode reload.
        // Schedule a retry — the catalog WILL come back.
        console.warn("[modelCatalog] load failed, will retry in 3s:", e);
        if (_bgRetryTimer)
            clearTimeout(_bgRetryTimer);
        _bgRetryTimer = setTimeout(() => {
            _bgRetryTimer = null;
            ensureCatalog();
        }, 3000);
    });
}
export function getCachedCatalog() {
    return catalogStore.getState().catalog;
}
/** Seed the cache with pre-fetched data (test utility — production code uses
 * loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
 * a fake catalog without going to the network. */
export function primeCatalog(data) {
    catalogStore.setState({ catalog: data, loaded: true });
}
// ── Module-level cache warm: fire the background load immediately on import ──
// This guarantees the catalog starts loading the moment ANY component imports
// from modelCatalog.ts — not just when a specific component's useEffect fires.
// Idempotent: collapses into a single inflight request. Essential for HMR
// resilience — after a hot module replacement, module-level state resets but
// the importing component's useEffect (with [] deps) does NOT re-run.
//
// NOT under Vitest (2026-08-15). Every unit-test file whose import graph
// touches this module used to fire a REAL happy-dom fetch at import, and on
// failure schedule a 3s retry + push the "Catalog unavailable" toast — with
// real timers and real network. Under full-suite worker contention a file's
// lifetime straddles that 3s retry, so the toast landed mid-test and broke
// unrelated toast-absence assertions (flowStore.saveChain 409, three
// deterministic full-suite reproductions). Tests that want the loader call
// ensureCatalog()/loadCatalog() explicitly against their own api mocks
// (model-catalog.test.ts pins the retry + dedup behavior that way). The gate
// is import.meta.env.MODE — the ONE vitest signal that survives Vite's
// transform into src modules (import.meta.vitest is only injected into test
// files themselves; env.VITEST is not injected at all). A normal browser build
// runs MODE "production"/"development", so production + HMR are unchanged.
/* v8 ignore next -- module warm-load runs only in browser builds
 * (Vite sets MODE to exactly "development"/"production"); under vitest
 * MODE is "test", and under a plain-Node import (the release probe)
 * import.meta.env is undefined — both arms never reach the load, so
 * no fetch fires and no retry timer keeps the process alive
 * (2026-09-12). */
if (import.meta.env?.MODE === "development" ||
    import.meta.env?.MODE === "production")
    ensureCatalog();
// ── Selectors (the TS selector owner; ./wireTypes.ts carries the wire) ──
/**
 * For route keys that are NOT top-level catalog entries (e.g. a quant-tier
 * sibling that only appears as a variant route on its parent), find the
 * parent model that owns the route via its ``variants:`` block.
 */
function parentModelForRoute(routeKey, cat) {
    // MODELS PRESENCE (2026-09-12): every caller guarantees models —
    // familyOf/formOf pre-check `!cat?.models`, and variantsForRoute reads
    // cat.models[routeKey] first (which throws on absent models before we
    // are reached). No guard here (its taken arm is unreachable; v8 counts
    // an untaken if-arm as an uncovered branch).
    for (const [key, spec] of Object.entries(cat.models)) {
        if ((spec.variants ?? []).some((v) => v.route === routeKey))
            return key;
    }
    return undefined;
}
export function familyOf(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    if (!cat?.models)
        return undefined;
    const own = cat.models[routeKey]?.family;
    if (own)
        return own;
    const parent = parentModelForRoute(routeKey, cat);
    // PARENT PRESENCE (2026-09-12): parentModelForRoute returns a key from
    // this same cat.models, synchronously — so models[parent] is defined
    // here. Direct access, no `?.` (its short-circuit arm is unreachable,
    // and v8 counts an untaken optional-chain arm as an uncovered branch).
    return parent ? cat.models[parent].family : undefined;
}
export function studioOf(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return undefined;
    return cat.families?.[fam]?.studio ?? undefined;
}
/**
 * The catalog-declared FORM for a route key (the model's ``form`` — the
 * same id _FORM_CONFIGS keys by on the backend). Resolves variants to
 * their parent model like familyOf. The tag routes the model's
 * editor surface (the FORM LAW: a model without a form cannot route
 * or render). The 2026-09-18 retirement: the retired per-form alias
 * tables are gone — forms no longer reshape slot keys.
 */
export function formOf(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    if (!cat?.models)
        return undefined;
    const own = cat.models[routeKey]?.form;
    if (own)
        return own;
    const parent = parentModelForRoute(routeKey, cat);
    // PARENT PRESENCE (2026-09-12): see familyOf — models[parent] is defined
    // here. Direct access, no `?.`.
    return parent ? cat.models[parent].form : undefined;
}
export function familyLabel(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return routeKey;
    return cat.families?.[fam]?.label ?? routeKey;
}
/**
 * The family-declared media genre for a route key. Resolves model routes
 * AND raw family ids (``detect``) — the catalog passthrough
 * emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
 * brick families) return undefined → callers fall back to their generic
 * badge. The schema-driven replacement for engine-name substring
 * classifiers.
 */
export function familyGenre(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    // Wire genre is a plain string — narrow onto the view union (never cast).
    return narrowGenre((fam ? cat.families?.[fam]?.genre : undefined) ?? cat.families?.[routeKey]?.genre);
}
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
export function familyAccepts(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    return cat.families?.[fam ?? routeKey]?.accepts ?? [];
}
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
export function familyTransformMatrix(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    const transforms = cat.families?.[fam ?? routeKey]?.transforms;
    if (!transforms)
        return {};
    const out = {};
    for (const t of transforms)
        out[t.name] = t.applies_to;
    return out;
}
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
export function familyCardSummary(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
}
export function familyConditioning(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return undefined;
    return cat.families?.[fam]?.video?.conditioning ?? undefined;
}
/**
 * The family's declared optional outputs (Option A — the optional-outputs
 * vocabulary). Empty/undefined when the family declares none (legacy
 * single-output compat). Consumers render one editor per entry, keyed by
 * ``genre`` — the input card no longer declares any (mask removed
 * 2026-08-14), so this is the vocabulary for OTHER families that do.
 */
export function familyOptionalOutputs(familyId, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    return cat.families?.[familyId]?.optional_outputs ?? [];
}
/**
 * The catalog-declared Canvas default model route — the model whose entry
 * carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
 * CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
 * caller keeps its own pre-catalog bootstrap value).
 */
export function canvasDefaultModel(cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
}
/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
export function variantLabel(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const m = cat.models?.[routeKey];
    return m?.variant_label ?? m?.label ?? routeKey;
}
/**
 * One entry per model family that has dropdown-visible members in the given
 * form. The primaryRoute is the catalog-declared `default_model` if present
 * (and visible), else the member whose key equals the family ID, else the
 * first visible member. Used to drive the family-level dropdown and the
 * empty-model seed. The default is FULLY catalog-declared — the frontend
 * never picks a default itself.
 */
export function familiesForForm(formTag, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const visible = dropdownModels(formTag, cat);
    const seen = new Set();
    const result = [];
    for (const key of visible) {
        const fam = cat.models[key]?.family ?? key;
        if (seen.has(fam))
            continue;
        seen.add(fam);
        const members = visible.filter((k) => (cat.models[k]?.family ?? k) === fam);
        const declared = cat.families[fam]?.default_model;
        const primary = (declared && members.includes(declared) ? declared : undefined) ??
            members.find((k) => k === fam) ??
            members[0];
        result.push({ familyId: fam, primaryRoute: primary, label: cat.families[fam]?.label ?? fam });
    }
    return result;
}
/**
 * Given a route key (including quant-tier variants like z-image-sd-q8),
 * return the family's primary route key — the one to use as the dropdown
 * value so the dropdown always shows the family even when a sub-variant is
 * selected.
 */
export function familyPrimaryRoute(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return routeKey;
    // Prefer the catalog-declared default_model, then the member whose key
    // equals the family id, then the first member in declaration order.
    //
    // We deliberately do NOT route this through dropdownModels(). That call
    // applies the edit_only filter (kept only to keep the unified Generate
    // dropdown clean), which strips EVERY form_edit model — so on the Edit
    // surface familyPrimaryRoute for an edit-only sibling returned the route
    // key itself instead of the family primary. The dropdown then rendered
    // blank and the validation effect silently fell back to boogu-edit.
    // Family lookup is tag/form driven and independent of the Generate
    // dropdown's edit_only rule.
    const declared = cat.families[fam]?.default_model;
    if (declared && cat.models[declared]?.family === fam)
        return declared;
    const members = Object.entries(cat.models)
        .filter(([, s]) => s.family === fam)
        .map(([k]) => k);
    // MEMBERS NONEMPTY (2026-09-12): `fam` resolved from a model that
    // carries it (the route's own entry, or the parent owning it through
    // variants:), so that model is itself a member — members[0] is always
    // defined. No `?? routeKey` fallback: its right operand is unreachable,
    // and v8 counts an unevaluated `??` operand as an uncovered branch.
    return members.find((k) => k === fam) ?? members[0];
}
export function modelLabel(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const m = cat.models[routeKey];
    if (!m)
        return routeKey;
    // Prefer the model's own label, then family label, then key.
    return m.label ?? cat.families[m.family]?.label ?? routeKey;
}
/** Description for a model route, or undefined. Callers provide their own
 * fallback string — this returns `undefined` so `??` works. Reads the
 * `description:` declared on the model's family in the catalog YAML. */
export function modelDescription(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return undefined;
    return cat.families?.[fam]?.description ?? undefined;
}
export function dropdownModels(formTag, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const out = [];
    for (const [key, spec] of Object.entries(cat.models)) {
        if (spec.hide_from_dropdown)
            continue;
        if (formTag) {
            if (spec.form !== formTag)
                continue;
        }
        else {
            // No formTag — keep the unified dropdown clean (generate only).
            if (spec.edit_only)
                continue;
        }
        out.push(key);
    }
    return out.sort();
}
export function variantSiblings(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    if (!fam)
        return routeKey ? [routeKey] : [];
    return Object.entries(cat.models)
        .filter(([, s]) => s.family === fam)
        .map(([k]) => k);
}
/**
 * Models hidden from the dropdown because they're reachable only via a
 * variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
 */
export function hiddenFromDropdown(cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    return new Set(Object.entries(cat.models)
        .filter(([, m]) => m.hide_from_dropdown)
        .map(([k]) => k));
}
/**
 * The ``variants:`` list for a model — resolves through the parent if the
 * route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
 * variants). Returns ``[]`` for models without variants.
 */
export function variantsForRoute(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const own = cat.models[routeKey]?.variants;
    if (own)
        return own;
    const parent = parentModelForRoute(routeKey, cat);
    // PARENT VARIANTS PRESENCE (2026-09-12): parentModelForRoute returns a
    // key only when that entry's variants list contains routeKey, so the
    // parent's variants are a non-empty array here — no `?.`/`?? []`
    // fallback (both right operands are unreachable, and v8 counts
    // unevaluated operands as uncovered branches).
    return parent ? cat.models[parent].variants : [];
}
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
export function presetsForRoute(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    // MODELS PRESENCE (2026-09-12): see routeCoordinates — models is always
    // present here. Direct access, no `?.` on models.
    const own = cat.models[routeKey]?.presets;
    return own && typeof own === "object" && Object.keys(own).length > 0
        ? own
        : undefined;
}
/**
 * Find the variant whose route matches ``routeKey`` — used to highlight the
 * active toggle when the form is hydrated from saved state.
 */
export function activeVariantForRoute(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    // Direct hit in this model's own variants. A route can be BOTH a
    // variant row's route AND its PRIMARY quant cell's route (krea-2-raw:
    // the raw row and the int8 cell share it). The QUANT entry is the
    // route's cell — the row is the folder — so prefer it (2026-08-17:
    // without the preference, routeCoordinates read quant: null off the
    // variant row and the matrix check hid the INT8 cell from its own
    // Quant row).
    const ownList = variantsForRoute(routeKey, cat);
    const own = ownList.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ??
        ownList.find((v) => v.route === routeKey);
    if (own)
        return own;
    // Global scan — covers quant siblings reached via a parent's variants.
    for (const spec of Object.values(cat.models)) {
        const list = spec.variants ?? [];
        const hit = list.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ??
            list.find((v) => v.route === routeKey);
        if (hit)
            return hit;
    }
    return undefined;
}
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
export function routeCoordinates(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    // MODELS PRESENCE (2026-09-12): every Catalog reaching here carries
    // models — the default parameter literal declares it, _ingest only runs
    // after validation (which refuses a models-less catalog), and
    // primeCatalog callers pass full catalogs. Direct access, no `?.`.
    const m = cat.models[routeKey];
    return {
        variant: m?.variant ?? undefined,
        quant: m?.quant ?? activeVariantForRoute(routeKey, cat)?.quant ?? undefined,
    };
}
/**
 * Resolve the route that combines the clicked variant's axis with the
 * current route's OTHER axes. Scans the family's routes (including the
 * ``hide_from_dropdown`` quant siblings) for the coordinate match, so
 * clicking "Raw" while on Turbo+Q8 lands on Raw+Q8 — never Raw+FP8.
 *
 * Group → axis mapping: a ``Quant`` group switches the quant tier (base
 * variant preserved); a ``Variant`` group switches the base variant (quant
 * preserved). The vocabulary is closed to Variant/Quant (the
 * canonical variant-group law, 2026-08-09 — "Speed" was a duplicate name for
 * the Variant axis). Patch-only entries (Lightning/Standard LoRA style)
 * with no ``route:`` never reach here — the caller handles those as draft
 * overlays.
 *
 * Falls back to the clicked entry's own ``route`` when no matrix sibling
 * matches (single-axis families, or a quant tier with no sibling for the
 * target variant). This is the ONE composition path — there is no longer
 * a separate sibling-picker (2026-08-08).
 */
/** The wanted matrix coordinates after one axis switch — the ONE
 * derivation shared by the composer and the existence check (a second
 * copy of this arithmetic would be the exact two-sources drift the
 * composer's contract forbids). A ``Quant`` click keeps the current
 * variant and takes the clicked quant; a ``Variant`` click keeps the
 * current quant and takes the clicked variant. */
function axisWants(currentRoute, clicked, cat) {
    const cur = routeCoordinates(currentRoute, cat);
    const tgt = routeCoordinates(clicked.route, cat);
    const switchesQuant = clicked.group === "Quant";
    return {
        variant: switchesQuant ? cur.variant : (tgt.variant ?? cur.variant),
        quant: switchesQuant ? (clicked.quant ?? tgt.quant) : cur.quant,
    };
}
/** The ONE matrix-cell lookup: the route in ``fam`` whose coordinates are
 * exactly (variant, quant), or undefined when no such cell exists. */
function matrixCell(fam, variant, quant, cat) {
    // MODELS PRESENCE (2026-09-12): both callers return early unless
    // familyOf resolved, and familyOf returns undefined when cat.models is
    // absent — so models is present here. No `?? {}` fallback: its right
    // operand is unreachable, and v8 counts an unevaluated `??` operand
    // as an uncovered branch.
    for (const [key, spec] of Object.entries(cat.models)) {
        if ((spec.family ?? key) !== fam)
            continue;
        const rc = routeCoordinates(key, cat);
        if (rc.variant === variant && rc.quant === quant)
            return key;
    }
    return undefined;
}
export function composeVariantRoute(currentRoute, clicked, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(currentRoute, cat);
    const clickedRoute = clicked.route;
    if (!fam || !clickedRoute)
        return clickedRoute ?? currentRoute;
    const wants = axisWants(currentRoute, clicked, cat);
    return matrixCell(fam, wants.variant, wants.quant, cat) ?? clickedRoute;
}
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
export function axisCellExists(currentRoute, clicked, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    if (!clicked.route)
        return true;
    const fam = familyOf(currentRoute, cat);
    if (!fam)
        return true;
    const wants = axisWants(currentRoute, clicked, cat);
    return matrixCell(fam, wants.variant, wants.quant, cat) !== undefined;
}
/**
 * True when the family owns its version axis via a declared ``Variant``
 * group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
 * matrix system in that case so the two never render duplicate rows
 * (2026-08-08 — one system, not two).
 */
export function familyHasVariantAxis(routeKey, cat = catalogStore.getState().catalog ?? { families: {}, models: {}, capabilities: null, engine_order: null, quant_order: null }) {
    const fam = familyOf(routeKey, cat);
    const groups = fam ? cat.families?.[fam]?.variant_groups : undefined;
    return !!groups && "Variant" in groups;
}
//# sourceMappingURL=modelCatalog.js.map