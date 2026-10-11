// catalogContract — the frontend half of the ONE-pattern catalog contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". The catalog is the ONE
// assembly for every discovery surface (Library rail, capability picker,
// model dropdowns) — a malformed catalog (an error body parsed as the
// catalog, a model without a form, an entry without a label) silently
// degrades EVERY surface at once. This validator runs at the loadCatalog
// funnel: a violation is a BACKEND bug. The store keeps the verdict as
// state, the UI renders it, and the catalog can never silently vanish
// into an empty sidebar.
//
// Wire shape (the @melite/contracts catalog types plus ./wireTypes.ts — get_catalog):
//   { "families": { "<id>": {...} }, "models": { "<route_key>": {...} },
//     "capabilities"?: { "<cap_id>": {...} },
//     "engine_order"?, "quant_order"? }
// families/models/capabilities are RECORDS keyed by id — never arrays.
/** Thrown by loadCatalog on a contract violation. Distinct from a fetch
 * error so ensureCatalog does NOT auto-retry it (a violation is a backend
 * bug, not a network blip — retrying a lying catalog every 3s is theater). */
export class CatalogContractError extends Error {
    violations;
    constructor(violations) {
        super(`Catalog contract violation (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
        this.name = "CatalogContractError";
        this.violations = violations;
    }
}
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
export function validateCatalogContract(catalog) {
    const violations = [];
    // ── Shape gate — an error body can never masquerade as a catalog ──────
    // The 500-period class: the endpoint failed, the client parsed the error
    // body as the catalog, families/models were absent, and every surface
    // silently emptied with zero signal.
    if (!isObj(catalog)) {
        return {
            valid: false,
            violations: [{
                    kind: "catalog",
                    message: "Catalog is not an object — this is an error body, not a contract.",
                }],
        };
    }
    // ── Records keyed by id — the core, required ──────────────────────────
    const families = catalog.families;
    if (!isObj(families)) {
        violations.push({
            kind: "catalog",
            message: "Catalog has no `families` record — no family can be located.",
        });
    }
    const models = catalog.models;
    if (!isObj(models)) {
        violations.push({
            kind: "catalog",
            message: "Catalog has no `models` record — no model can be located.",
        });
    }
    const capabilities = catalog.capabilities;
    if (capabilities !== undefined && !isObj(capabilities)) {
        violations.push({
            kind: "catalog",
            message: "`capabilities` is not a record keyed by id — capability routing is dead.",
        });
    }
    if (families === undefined || models === undefined) {
        return { valid: false, violations };
    }
    // ── Entry gates — a label-less/model-less entry is a silent empty ─────
    // dropdown, the exact class this contract exists to refuse.
    if (isObj(families)) {
        for (const [id, entry] of Object.entries(families)) {
            if (!isObj(entry)) {
                violations.push({ kind: id, message: `Family ${id} is not an object.` });
                continue;
            }
            if (!isNonEmptyString(entry.label)) {
                violations.push({
                    kind: id,
                    message: `Family ${id} declares no "label" — it would render as an empty picker entry.`,
                });
            }
            // ── Family modifiers gate (2026-08-11) ────────────────────────────
            // The families payload's `modifiers:` block is the SAME declaration
            // the form-spec enriches — a raw leak (options: [], no scan proof)
            // is the exact empty-lora-dropdown incident. A weights-file kind
            // with zero options is contract-valid ONLY when options_scanned ===
            // true (the backend emission RAN) AND upload_dir gives the upload
            // path. Same rule as specContract.ts — both payloads, one contract.
            const modifiers = entry.modifiers;
            // null = "no modifier capability declared" — contract-valid. The
            // /v1/model-catalog handler serializes through
            // CatalogResponse.model_dump() which emits EVERY declared field with
            // its None default, so ALL 38 families carry a `modifiers` key — null
            // for the 31 that declare none. The generated type is
            // `ModifierKindSpec[] | null`. Treating null as a violation IS the
            // 2026-08-11 banner ("Family moss-tts declares 'modifiers' but it is
            // not an array …and 28 more"). Only a non-null non-array is a leak.
            if (modifiers !== undefined && modifiers !== null && !Array.isArray(modifiers)) {
                violations.push({
                    kind: id,
                    message: `Family ${id} declares "modifiers" but it is not an array — modifier capability is unreadable.`,
                });
            }
            else if (Array.isArray(modifiers)) {
                for (const raw of modifiers) {
                    if (!isObj(raw) || typeof raw.kind !== "string")
                        continue;
                    if (raw.kind !== "controlnet" && raw.kind !== "lora")
                        continue;
                    const options = Array.isArray(raw.options) ? raw.options : [];
                    // CATALOG LEVEL: upload_dir is the proof (NOT options_scanned — that
                    // flag is emission-time only, set AFTER the disk scan;
                    // it CAN'T exist on the raw catalog). A zero-option lora kind with an
                    // upload_dir is honest — options are disk-appended at emission. The
                    // enriched form-spec emission checks options_scanned
                    // too; this catalog gate checks only what the catalog CAN prove.
                    if ((raw.cardinality ?? "list") === "list" &&
                        options.length === 0 &&
                        !raw.upload_dir) {
                        violations.push({
                            kind: id,
                            message: `Family ${id} modifier kind "${raw.kind}" carries ZERO options and no upload_dir — the dropdown would render empty (phantom capability).`,
                        });
                    }
                }
            }
        }
    }
    if (isObj(models)) {
        for (const [id, entry] of Object.entries(models)) {
            if (!isObj(entry)) {
                violations.push({ kind: id, message: `Model ${id} is not an object.` });
                continue;
            }
            // form mirrors the backend's CONSTRUCTION guarantee (python/melite_models:
            // the offering gate + ModelRow.form required — the ltx-2-3 incident,
            // 2026-09-05, shipped form='' rows past every backend gate and only
            // this validator caught them; the gate now refuses at class creation,
            // the serve validator refuses the row) — a model
            // without a form cannot resolve its form-spec and degrades every
            // surface at once.
            const missing = [];
            if (!isNonEmptyString(entry.family))
                missing.push("family");
            if (!isNonEmptyString(entry.form))
                missing.push("form");
            if (!isNonEmptyString(entry.label))
                missing.push("label");
            if (missing.length > 0) {
                violations.push({
                    kind: id,
                    message: `Model ${id} is missing required key(s) ${missing.join(", ")} — it cannot route or render.`,
                });
            }
        }
    }
    if (isObj(capabilities)) {
        for (const [id, entry] of Object.entries(capabilities)) {
            if (!isObj(entry)) {
                violations.push({ kind: id, message: `Capability ${id} is not an object.` });
                continue;
            }
            const missing = [];
            if (!isNonEmptyString(entry.label))
                missing.push("label");
            // §11 (PLUGIN-ARCHITECTURE.md): a capability MAY omit default_family —
            // core config must not name optional plugin ids (the plugin tile has no
            // default_family by design). The routing TRUTH the gateway serves is
            // "resolved" (attachCapabilityRoutes derives it from the first member
            // family and DROPS caps that cannot route). The contract checks the
            // truth, not the spelling: declared OR derived, never neither.
            const declaredFam = entry.default_family;
            if (declaredFam !== undefined && !isNonEmptyString(declaredFam)) {
                missing.push("default_family (present but not a string)");
            }
            const resolved = entry.resolved;
            const hasRoute = isObj(resolved) && isNonEmptyString(resolved.family) && isNonEmptyString(resolved.model);
            if (!hasRoute && !isNonEmptyString(declaredFam)) {
                missing.push("default_family or resolved route");
            }
            if (!Array.isArray(entry.families) || entry.families.length === 0) {
                missing.push("families");
            }
            else if (entry.families.some((f) => !isNonEmptyString(f))) {
                missing.push("families (non-string entries)");
            }
            if (missing.length > 0) {
                violations.push({
                    kind: id,
                    message: `Capability ${id} is missing required key(s) ${missing.join(", ")} — it cannot route.`,
                });
            }
        }
    }
    // ── Optional auxiliaries pass through unvalidated ─────────────────────
    // engine_order / quant_order: consumed defensively — extra catalog
    // evolution must never fail the load.
    return { valid: violations.length === 0, violations };
}
//# sourceMappingURL=catalogContract.js.map