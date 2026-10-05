// engine/catalog.ts — the TS-native model catalog over the frozen
// registry (models/registry.generated.ts is the catalog now).
//
// Two entry points, one per provision half:
//   - resolveCatalogArtifact (the rows provision_model downloads):
//     provisions-first, else the resolve(variant, quant) matrix
//     cell's artifact. Misses throw CatalogMiss (dispatch maps it
//     to 404 — the texts ARE the wire).
//   - checkModelPresent (the already-on-disk gate): the runtime
//     models tree first, then the mount bindings from the endpoint
//     machine statement (model_base_path + extra_model_folders in
//     data/comfyui_endpoint.json — stock folders map to themselves,
//     never a restated folder list).
//
// THE CATALOG LAWS:
//   - model lookup: exact id, one row per id. Miss refuses
//     "model \"X\" not found in catalog".
//   - provisions rows: name/url non-empty gate, folder strip("/"),
//     dest = folder if it starts with "models" else
//     "models/<folder>" (bare "models" when empty). All-filtered ->
//     "model \"X\" declares no downloadable provisions".
//   - matrix fallback: variant defaults to the FIRST declared
//     variant, quant to the variant's FIRST cell (unspecified
//     coordinates fall to the family default — krea-2's head body
//     IS turbo/int8). Unknown variant id resolves to no-variant,
//     never a throw. Unknown quant on a found variant refuses
//     the 500-class value error ("\"q\" is not a valid Quant"),
//     NOT a catalog-miss 404. No provisions row AND no cell
//     artifact -> "model \"X\" declares no downloadable provisions
//     or artifact at (VAR, QUANT)" with null for the empty
//     coordinate (the union miss, 2026-10-12).
//   - artifact row: name = source_url basename, url = source_url,
//     relative_path = "models/<dest_sub stripped>" or "models".
//   - presence: join(runtime, folder, name) where folder =
//     relative_path minus the "models/" head, then the mount leg:
//     head/rest split on the FIRST "/", head through
//     extra_model_folders (identity for stock folders), joined
//     under model_base_path. Returns the hit path, else null (no
//     configured base == null — the mount leg is skipped).
//
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { loadEndpointConfig, resolveRepoRoot, } from "./comfyui.js";
/** The catalog-miss channel (the condemned LookupError): the manage
 *  door maps these to 404 — a miss is a typed throw, never a null. */
export class CatalogMiss extends Error {
    constructor(message) {
        super(message);
        this.name = "CatalogMiss";
    }
}
/** True for the catalog-miss channel (404), false for everything
 *  else (bad quant ValueErrors, IO failures — the 500 class). */
export function isCatalogMiss(exc) {
    return exc instanceof CatalogMiss;
}
function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
let CACHE = null;
/** The catalog rows (cached per process) — MAPPED FROM THE FROZEN
 *  REGISTRY (convergence 2026-09-08: the P37 class killed —
 *  provisions.json was a second frozen compile of the same registry
 *  the units declared; models/registry.generated.ts, dumped from
 *  the 034e1f97 units by the metaclasses themselves, is the ONE
 *  truth now, compiled-in — no DATA file read, no ENOENT seam,
 *  fixtures need no seeding). The CatalogModel projection keeps the
 *  manage rail's row shape; resolveArtifactRows below is UNCHANGED
 *  (the legacy texts ARE the wire).
 *
 *  Provenance receipt: h3's audio-vae provision URL differs from
 *  the dead provisions.json (deAPI-ai mirror -> Comfy-Org) — the
 *  unit at 034e1f97 carries Comfy-Org with the SAME sha256 (a
 *  mirror swap the compile predated); the registry is the fresher
 *  authoring truth (models/video/h3/model.py line 56).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context). Plugin
 *  paths (the manage door) thread ctx.models and read through
 *  ModelsService.models() — the service owns its own per-fiber
 *  cache below, so the door never touches this module handle
 *  (DSH-AS-LANGUAGE LAW: the seam is the service, never the import).
 *
 *  The repoRoot parameter is kept for signature compatibility and
 *  ignored: the registry is compiled-in, root-independent.
 */
export function loadCatalogModels(decls, _repoRoot = resolveRepoRoot()) {
    if (CACHE !== null)
        return CACHE;
    CACHE = decls.map((d) => ({
        id: d.id,
        genre: d.genre,
        provisions: (d.provisions ?? []).map((p) => ({
            name: p.name,
            url: p.url,
            folder: p.folder,
        })),
        variants: d.variants.map((v) => ({
            id: v.id,
            cells: v.cells.map((c) => {
                const cell = { quant: c.quant };
                if (c.artifact !== undefined && c.artifact !== null) {
                    cell.artifact = {
                        source_url: c.artifact.source_url,
                        dest_sub: c.artifact.dest_sub,
                    };
                }
                return cell;
            }),
        })),
    }));
    return CACHE;
}
/** Drop the process cache (kept for API compatibility — the
 *  registry is compiled-in; nothing rewrites it, but walls reset
 *  anyway). */
export function resetCatalogCache() {
    CACHE = null;
}
/** Strip leading/trailing slashes (str.strip("/")). */
function stripSlashes(s) {
    return s.replace(/^\/+/, "").replace(/\/+$/, "");
}
/** The provisions dest derivation (manage 275-290). Exported —
 *  the manage door resolves CARD-owned provision rows (card DECL
 *  provisions) through the same derivation: one spelling of the
 *  folder → models-tree path, never a second copy. */
export function provisionDest(folder) {
    const clean = stripSlashes(folder);
    if (clean.startsWith("models"))
        return clean;
    return clean !== "" ? "models/" + clean : "models";
}
/**
 * The downloadable rows for (model, variant, quant) — mirrors
 * manage._resolve_catalog_artifact. Variant "" = family default
 * (first variant); quant "" = variant default (first cell).
 * Throws CatalogMiss with the legacy texts on a catalog miss.
 *
 * NON-PLUGIN callers only (walls/probes/unit — no Context). Plugin
 * paths read through ModelsService.resolveCatalogArtifact (same pure
 * core below, service-owned cache). Documented split, never two truths.
 */
export function resolveCatalogArtifact(decls, mid, variant = "", quant = "", repoRoot = resolveRepoRoot()) {
    return resolveArtifactRows(loadCatalogModels(decls, repoRoot), mid, variant, quant);
}
/** The pure resolution core (no I/O, no cache): the model table in,
 *  rows out. Shared by the module function (non-plugin callers) and
 *  ModelsService.resolveCatalogArtifact (plugin paths). */
export function resolveArtifactRows(models, mid, variant = "", quant = "") {
    const model = models.find((m) => m.id === mid);
    if (model === undefined) {
        throw new CatalogMiss("model " + JSON.stringify(mid) + " not found in catalog");
    }
    // UNION LAW (2026-10-12 model audit, fix 1): provisions and the
    // variant-cell artifact are PARALLEL download channels, never
    // either-or shadows. The qwen families declare both — provisions
    // (TE/VAE) plus the cell artifact (the primary UNET) — and the old
    // `if (provisions.length > 0) return` arm left every artifact row
    // unreachable, while loadPlane's every()-presence check read
    // TE+VAE alone as the family being fully present.
    const rows = [];
    for (const p of model.provisions) {
        const name = p.name.trim();
        const url = p.url.trim();
        if (name === "" || url === "")
            continue;
        rows.push({ name, url, relative_path: provisionDest(p.folder) });
    }
    const vrow = variant !== ""
        ? model.variants.find((v) => v.id === variant)
        : model.variants[0];
    let cell;
    if (vrow !== undefined) {
        if (quant !== "") {
            const known = new Set();
            for (const m of models)
                for (const v of m.variants)
                    for (const c of v.cells)
                        known.add(c.quant);
            if (!known.has(quant)) {
                // grammar _cell_'s Quant(quant) construction — a ValueError,
                // the 500 class, never a catalog-miss 404.
                throw new Error("'" + quant + "' is not a valid Quant");
            }
            cell = vrow.cells.find((c) => c.quant === quant);
        }
        else {
            cell = vrow.cells[0];
        }
    }
    if (cell !== undefined && cell.artifact !== undefined) {
        const sourceUrl = cell.artifact.source_url;
        /* v8 ignore next -- split() always yields >= 1 part, so pop() is
         * never undefined here; the ?? is the type-system's toll
         * (noUncheckedIndexedAccess), not a runtime arm. */
        const name = sourceUrl.split("/").pop() ?? "";
        const destSub = stripSlashes(cell.artifact.dest_sub);
        rows.push({
            name,
            url: sourceUrl,
            relative_path: destSub !== "" ? "models/" + destSub : "models",
        });
    }
    if (rows.length === 0) {
        const vText = variant !== "" ? variant : "None";
        const qText = quant !== "" ? quant : "None";
        throw new CatalogMiss("model " +
            JSON.stringify(mid) +
            " declares no downloadable provisions or artifact at (" +
            vText +
            ", " +
            qText +
            ")");
    }
    return rows;
}
/** The runtime models tree root (data/runtime/comfyui — the RUNTIME). */
export function runtimeModelsRoot(repoRoot = resolveRepoRoot()) {
    return join(repoRoot, "data", "runtime", "comfyui", "models");
}
/**
 * The on-disk hit for (relativePath, name), else null — mirrors
 * manage._model_present. Runtime tree first, then the mount leg
 * (model_base_path + extra_model_folders from the endpoint machine
 * statement; stock folders map to themselves). No base configured
 * = mount leg skipped (the SystemExit collapses to None).
 *
 * NON-PLUGIN callers only (walls/probes/unit — no Context). Plugin
 * paths read through ModelsService.checkModelPresent (same pure core
 * below). Documented split, never two truths.
 */
export function checkModelPresent(relativePath, name, repoRoot = resolveRepoRoot()) {
    let cfg;
    try {
        cfg = loadEndpointConfig();
    }
    catch {
        cfg = null;
    }
    return findModelPresent(relativePath, name, repoRoot, cfg);
}
export function findModelPathPresent(modelPath, repoRoot, cfg) {
    const clean = modelPath.trim().replace(/^\/+|\/+$/gu, "");
    if (clean === "" || clean.split("/").some((part) => part === ".."))
        return null;
    const runtime = join(runtimeModelsRoot(repoRoot), clean);
    if (existsSync(runtime))
        return runtime;
    if (cfg === null)
        return null;
    const rawBase = cfg["model_base_path"];
    const base = typeof rawBase === "string" ? rawBase.trim() : "";
    const mountBase = base !== "" && base !== "undefined" ? base : rootModelsReadRoot(repoRoot);
    if (mountBase === "" || mountBase === "undefined")
        return null;
    const candidates = [join(mountBase, clean)];
    const extras = cfg["extra_model_folders"];
    if (isRecord(extras)) {
        for (const mapped of Object.values(extras)) {
            if (typeof mapped !== "string" || mapped.trim() === "")
                continue;
            candidates.push(join(mountBase, stripSlashes(mapped), clean));
        }
    }
    for (const candidate of candidates) {
        if (existsSync(candidate))
            return candidate;
    }
    return null;
}
export function checkModelPathPresent(modelPath, repoRoot = resolveRepoRoot()) {
    let cfg;
    try {
        cfg = loadEndpointConfig();
    }
    catch {
        cfg = null;
    }
    return findModelPathPresent(modelPath, repoRoot, cfg);
}
/** Joins the engine base under a models root, never twice: overlays
 *  written under the old replacement semantics bake the base into
 *  read_root, and the merge law must not re-append it (mirrors
 *  provision-config.ts joinBase — the twin law). The caller
 *  guarantees a non-empty root and a non-empty base.
 *  @param root the models root (non-empty)
 *  @param base the engines.comfyui.base subdirectory (non-empty)
 *  @returns the joined store, unchanged when it already ends with
 *           the base */
function joinBaseOnce(root, base) {
    if (root === base || root.endsWith("/" + base) || root.endsWith("\\" + base))
        return root;
    return join(root, base);
}
/** Merges the machine-local overlay OVER the tracked root config:
 *  object branches merge, scalars and arrays replace. The overlay
 *  shadows KEYS, never the whole file (mirrors provision-config.ts
 *  mergeOverlay — the twin law).
 *  @param tracked the parsed inference.config.json value
 *  @param overlay the parsed data/inference.local.json value
 *  @returns the merged configuration value */
function mergeRootOverlay(tracked, overlay) {
    if (typeof tracked !== "object" || tracked === null || Array.isArray(tracked) ||
        typeof overlay !== "object" || overlay === null || Array.isArray(overlay)) {
        return overlay;
    }
    const out = { ...tracked };
    for (const [k, v] of Object.entries(overlay)) {
        out[k] = mergeRootOverlay(out[k], v);
    }
    return out;
}
/** The root inheritance base: the OVERLAY law (the portability fix,
 *  2026-10-12) — data/inference.local.json merged OVER the tracked
 *  inference.config.json (the overlay shadows keys, never the whole
 *  file); models.read_root joined with engines.comfyui.base,
 *  anchored to the repo root when relative. Machine-local absolutes
 *  live in the untracked overlay ONLY (the provision script's
 *  loadRoot + the estate door's loadStoreRoot are the twins); the
 *  tracked tree ships portable repo-relative defaults, so a fresh
 *  clone never inherits another machine's /mnt. Empty string = no
 *  root statement (missing files, no models block, non-string
 *  read_root) — the mount leg then needs the endpoint's own base.
 *  One deterministic read, no cache. */
function rootModelsReadRoot(repoRoot) {
    try {
        const overlayPath = join(repoRoot, "data", "inference.local.json");
        const rootPath = join(repoRoot, "inference.config.json");
        let raw;
        if (existsSync(overlayPath) && existsSync(rootPath)) {
            raw = mergeRootOverlay(JSON.parse(readFileSync(rootPath, "utf8")), JSON.parse(readFileSync(overlayPath, "utf8")));
        }
        else {
            raw = JSON.parse(readFileSync(existsSync(overlayPath) ? overlayPath : rootPath, "utf8"));
        }
        if (typeof raw !== "object" || raw === null || Array.isArray(raw))
            return "";
        const models = raw["models"];
        if (typeof models !== "object" || models === null || Array.isArray(models))
            return "";
        const rr = models["read_root"];
        if (typeof rr !== "string" || rr.trim() === "")
            return "";
        let store = rr.trim();
        const engines = raw["engines"];
        if (typeof engines === "object" && engines !== null && !Array.isArray(engines)) {
            const comfy = engines["comfyui"];
            if (typeof comfy === "object" && comfy !== null && !Array.isArray(comfy)) {
                const base = comfy["base"];
                if (typeof base === "string" && base.trim() !== "")
                    store = joinBaseOnce(store, base.trim());
            }
        }
        return isAbsolute(store) ? store : join(repoRoot, store);
    }
    catch {
        return "";
    }
}
/** The pure presence core (I/O: existsSync probes + the one
 *  root-inheritance read, no cache): cfg null = mount leg skipped
 *  (unparseable endpoint collapses to None, same as the module
 *  function's try/catch). Shared by the module function
 *  (non-plugin callers) and ModelsService.checkModelPresent
 *  (plugin paths). */
export function findModelPresent(relativePath, name, repoRoot, cfg) {
    const folder = relativePath.startsWith("models/")
        ? relativePath.slice("models/".length)
        : relativePath;
    const runtimeHit = join(runtimeModelsRoot(repoRoot), folder, name);
    if (existsSync(runtimeHit))
        return runtimeHit;
    if (cfg === null)
        return null;
    const rawBase = cfg["model_base_path"];
    const base = typeof rawBase === "string" ? rawBase.trim() : String(rawBase ?? "").trim();
    // ROOT-CONFIG INHERITANCE: an endpoint machine statement without
    // model_base_path inherits the root config's models.read_root —
    // the machine's own statement always wins.
    const mountBase = base !== "" && base !== "undefined" ? base : rootModelsReadRoot(repoRoot);
    if (mountBase === "" || mountBase === "undefined")
        return null;
    const extras = isRecord(cfg["extra_model_folders"]) && cfg["extra_model_folders"] !== null
        ? cfg["extra_model_folders"]
        : {};
    const slash = folder.indexOf("/");
    const head = slash < 0 ? folder : folder.slice(0, slash);
    const rest = slash < 0 ? "" : folder.slice(slash + 1);
    const mapped = extras[head];
    const sub = typeof mapped === "string" && stripSlashes(mapped) !== ""
        ? stripSlashes(mapped)
        : head;
    const mountHit = rest !== "" ? join(mountBase, sub, rest, name) : join(mountBase, sub, name);
    if (existsSync(mountHit))
        return mountHit;
    return null;
}
// ── the models catalog as a Cordis Service (stroke 4a,
// DSH-AS-LANGUAGE LAW) ───────────────────────────────────────────
// SERVICE NAME: 'models' (ctx.models) — the short camelCase service
// key per the sibling-stroke precedent and the sibling strokes 2a
// ('cardRegistry') / 2b ('runs'). The long form 'modelCatalog' was
// considered and declined: the short name matches the models-plane
// lane. Documented here per the task.
//
// OWNS: the per-fiber registry row cache (keyed by repoRoot for
// signature continuity — the registry is compiled-in and
// root-INDEPENDENT now, so all keys map to the same table) and
// every catalog-derived operation (resolve/check). The frozen
// registry (models/registry.generated.ts) stays frozen data —
// untouched. The pure cores above
// (resolveArtifactRows/findModelPresent/loadCatalogModels) stay
// module functions — they take explicit args and hold no state.
// The module-level CACHE + loadCatalogModels stay for NON-PLUGIN
// callers (walls/probes/unit — no Context); every door with
// catalog reads injects 'models' and uses ctx.models (never the
// module handle, never a dynamic import — the manage door's old
// catalogModule() non-literal-specifier dodge is deleted: a
// missing provider fails the door LOUD at inject, the framework's
// answer).
// ── THE SERVICE (moved 2026-09-08 to src/models/service.ts: ONE
// ctx.models — the artifact readers merged with the registry
// registration/resolution/cascade system behind the PORT LAW).
// The pure cores above stay here; the service, its provider, and
// needModels live in the models module; the package index
// re-exports both, so "@melite/comfyui-cordis" surface is
// unchanged.
//# sourceMappingURL=catalog.js.map
