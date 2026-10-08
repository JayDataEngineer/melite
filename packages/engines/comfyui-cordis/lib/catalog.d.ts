import { type EngineJson } from "./comfyui.ts";
import { type ModelDecl } from "./models/families/contract.ts";
/** One downloadable row — the manage door's download contract. */
export interface CatalogArtifactRow {
    readonly name: string;
    readonly url: string;
    readonly relative_path: string;
}
/** A provision declaration row (registry projection). */
export interface CatalogProvision {
    readonly name: string;
    readonly url: string;
    readonly folder: string;
}
/** A matrix cell's downloadable body (registry projection). */
export interface CatalogCellArtifact {
    readonly source_url: string;
    readonly dest_sub: string;
}
/** One (variant x quant) matrix place (registry projection). */
export interface CatalogCell {
    readonly quant: string;
    readonly artifact?: CatalogCellArtifact;
}
/** One variant row (registry projection). */
export interface CatalogVariant {
    readonly id: string;
    readonly cells: CatalogCell[];
}
/** One model row (registry projection). */
export interface CatalogModel {
    readonly id: string;
    readonly genre: string;
    readonly provisions: CatalogProvision[];
    readonly variants: CatalogVariant[];
}
/** The catalog-miss channel (the condemned LookupError): the manage
 *  door maps these to 404 — a miss is a typed throw, never a null. */
export declare class CatalogMiss extends Error {
    constructor(message: string);
}
/** True for the catalog-miss channel (404), false for everything
 *  else (bad quant ValueErrors, IO failures — the 500 class). */
export declare function isCatalogMiss(exc: unknown): boolean;
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
 *  authoring truth (the h3 DECL in packages/models/h3/src/index.ts).
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
export declare function loadCatalogModels(decls: readonly ModelDecl[], _repoRoot?: string): CatalogModel[];
/** Drop the process cache (kept for API compatibility — the
 *  registry is compiled-in; nothing rewrites it, but walls reset
 *  anyway). */
export declare function resetCatalogCache(): void;
/** The provisions dest derivation (manage 275-290). Exported —
 *  the manage door resolves CARD-owned provision rows (card DECL
 *  provisions) through the same derivation: one spelling of the
 *  folder → models-tree path, never a second copy. */
export declare function provisionDest(folder: string): string;
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
export declare function resolveCatalogArtifact(decls: readonly ModelDecl[], mid: string, variant?: string, quant?: string, repoRoot?: string): CatalogArtifactRow[];
/** The pure resolution core (no I/O, no cache): the model table in,
 *  rows out. Shared by the module function (non-plugin callers) and
 *  ModelsService.resolveCatalogArtifact (plugin paths). */
export declare function resolveArtifactRows(models: CatalogModel[], mid: string, variant?: string, quant?: string): CatalogArtifactRow[];
/** The runtime models tree root (data/runtime/comfyui — the RUNTIME). */
export declare function runtimeModelsRoot(repoRoot?: string): string;
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
export declare function checkModelPresent(relativePath: string, name: string, repoRoot?: string): string | null;
export declare function findModelPathPresent(modelPath: string, repoRoot: string, cfg: Record<string, EngineJson> | null): string | null;
export declare function checkModelPathPresent(modelPath: string, repoRoot?: string): string | null;
/** The pure presence core (I/O: existsSync probes + the one
 *  root-inheritance read, no cache): cfg null = mount leg skipped
 *  (unparseable endpoint collapses to None, same as the module
 *  function's try/catch). Shared by the module function
 *  (non-plugin callers) and ModelsService.checkModelPresent
 *  (plugin paths). */
export declare function findModelPresent(relativePath: string, name: string, repoRoot: string, cfg: Record<string, EngineJson> | null): string | null;
//# sourceMappingURL=catalog.d.ts.map
