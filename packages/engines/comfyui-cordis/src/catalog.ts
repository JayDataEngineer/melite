// engine/catalog.ts — the TS-native model catalog (NO-ESTATE-PYTHON
// LAW: the 47 packages/engines/comfyui/models/*/model.py files are
// dead; this module over the FROZEN REGISTRY (models/registry.
// generated.ts, dumped from the 034e1f97 units) is the catalog now).
//
// Two entry points mirror the two halves of the condemned
// infra/python/manage.py provision_model path (spec reference,
// read-only, stays dead: git show c0aa2187~1:infra/python/manage.py):
//   - resolveCatalogArtifact — _resolve_catalog_artifact (the rows
//     provision_model downloads): provisions-first, else the
//     resolve(variant, quant) matrix cell's artifact. Misses throw
//     the legacy LookupError texts the manage door depends on
//     (dispatch maps LookupError -> 404, so the texts ARE the wire).
//   - checkModelPresent — _model_present (the already-on-disk gate):
//     the runtime models tree first, then the mount bindings from
//     the endpoint machine statement (model_base_path +
//     extra_model_folders in data/comfyui_endpoint.json — stock
//     folders map to themselves, never a restated folder list).
//
// FAITHFUL MIRRORS (line-cited against manage.py unless noted):
//   - model lookup: exact id (the sorted engines/genres scan's
//     first-match collapses to keyed lookup — one row per id).
//     Miss -> "model 'X' not found in catalog" (manage 262 —
//     Python %r of a str: single quotes).
//   - provisions rows: name/url non-empty gate, folder strip("/"),
//     dest = folder if it starts with "models" else
//     "models/<folder>" (bare "models" when empty) — manage
//     275-290. All-filtered -> "model 'X' declares no downloadable
//     provisions" (manage 292).
//   - matrix fallback: variant defaults to the FIRST declared
//     variant, quant to the variant's FIRST cell (grammar
//     Model.resolve: unspecified coordinates fall to the family
//     default — krea-2's head body IS turbo/int8). Unknown variant
//     id resolves to no-variant (grammar _variant_: miss -> None),
//     never a throw. Unknown quant on a found variant throws the
//     ValueError-class ("'q' is not a valid Quant" — grammar
//     _cell_'s Quant(quant) construction; dispatch maps it to 500,
//     NOT a catalog-miss 404). Cell None or artifact None ->
//     "model 'X' has no artifact at (VAR, QUANT)" with None for
//     the empty coordinate (manage 264-273).
//   - artifact row: name = source_url basename, url = source_url,
//     relative_path = "models/<dest_sub stripped>" or "models".
//   - presence: join(runtime, folder, name) where folder =
//     relative_path minus the "models/" head (manage 240-244),
//     then the mount leg (manage 245-251): head/rest split on the
//     FIRST "/", head through extra_model_folders (identity for
//     stock folders), joined under model_base_path. Returns the
//     hit path, else null (manage returns None; SystemExit from
//     an unconfigured root is also None — here: no base == null).
//     No root-config inheritance yet (estate_config has no TS
//     port): an endpoint without model_base_path skips the mount
//     leg — see FOLLOWUPS in the stroke record.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";

import {
  type EngineJson,
  loadEndpointConfig,
  resolveRepoRoot,
} from "./comfyui.ts";
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
export class CatalogMiss extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogMiss";
  }
}

/** True for the catalog-miss channel (404), false for everything
 *  else (bad quant ValueErrors, IO failures — the 500 class). */
export function isCatalogMiss(exc: unknown): boolean {
  return exc instanceof CatalogMiss;
}

/** Python %r of a model id (single-quoted — ids are [a-z0-9_-]). */
function pyRepr(mid: string): string {
  return "'" + mid + "'";
}

function isRecord(v: EngineJson | unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

let CACHE: CatalogModel[] | null = null;

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
export function loadCatalogModels(
  decls: readonly ModelDecl[],
  _repoRoot: string = resolveRepoRoot(),
): CatalogModel[] {
  if (CACHE !== null) return CACHE;
  CACHE = decls.map(
    (d: ModelDecl): CatalogModel => ({
      id: d.id,
      genre: d.genre,
      provisions: (d.provisions ?? []).map(
        (p): CatalogProvision => ({
          name: p.name,
          url: p.url,
          folder: p.folder,
        }),
      ),
      variants: d.variants.map(
        (v): CatalogVariant => ({
          id: v.id,
          cells: v.cells.map((c): CatalogCell => {
            const cell: CatalogCell = { quant: c.quant };
            if (c.artifact !== undefined && c.artifact !== null) {
              (cell as { artifact?: CatalogCellArtifact }).artifact = {
                source_url: c.artifact.source_url,
                dest_sub: c.artifact.dest_sub,
              };
            }
            return cell;
          }),
        }),
      ),
    }),
  );
  return CACHE;
}

/** Drop the process cache (kept for API compatibility — the
 *  registry is compiled-in; nothing rewrites it, but walls reset
 *  anyway). */
export function resetCatalogCache(): void {
  CACHE = null;
}

/** Strip leading/trailing slashes (py str.strip("/")). */
function stripSlashes(s: string): string {
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

/** The provisions dest derivation (manage 275-290). */
function provisionDest(folder: string): string {
  const clean: string = stripSlashes(folder);
  if (clean.startsWith("models")) return clean;
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
export function resolveCatalogArtifact(
  decls: readonly ModelDecl[],
  mid: string,
  variant = "",
  quant = "",
  repoRoot: string = resolveRepoRoot(),
): CatalogArtifactRow[] {
  return resolveArtifactRows(loadCatalogModels(decls, repoRoot), mid, variant, quant);
}

/** The pure resolution core (no I/O, no cache): the model table in,
 *  rows out. Shared by the module function (non-plugin callers) and
 *  ModelsService.resolveCatalogArtifact (plugin paths). */
export function resolveArtifactRows(
  models: CatalogModel[],
  mid: string,
  variant = "",
  quant = "",
): CatalogArtifactRow[] {
  const model: CatalogModel | undefined = models.find((m) => m.id === mid);
  if (model === undefined) {
    throw new CatalogMiss("model " + pyRepr(mid) + " not found in catalog");
  }
  if (model.provisions.length > 0) {
    const rows: CatalogArtifactRow[] = [];
    for (const p of model.provisions) {
      const name: string = p.name.trim();
      const url: string = p.url.trim();
      if (name === "" || url === "") continue;
      rows.push({ name, url, relative_path: provisionDest(p.folder) });
    }
    if (rows.length === 0) {
      throw new CatalogMiss(
        "model " + pyRepr(mid) + " declares no downloadable provisions",
      );
    }
    return rows;
  }
  const vrow: CatalogVariant | undefined =
    variant !== ""
      ? model.variants.find((v) => v.id === variant)
      : (model.variants[0] as CatalogVariant | undefined);
  let cell: CatalogCell | undefined;
  if (vrow !== undefined) {
    if (quant !== "") {
      const known: Set<string> = new Set();
      for (const m of models)
        for (const v of m.variants)
          for (const c of v.cells) known.add(c.quant);
      if (!known.has(quant)) {
        // grammar _cell_'s Quant(quant) construction — a ValueError,
        // the 500 class, never a catalog-miss 404.
        throw new Error("'" + quant + "' is not a valid Quant");
      }
      cell = vrow.cells.find((c) => c.quant === quant);
    } else {
      cell = vrow.cells[0] as CatalogCell | undefined;
    }
  }
  if (cell === undefined || cell.artifact === undefined) {
    const vText: string = variant !== "" ? variant : "None";
    const qText: string = quant !== "" ? quant : "None";
    throw new CatalogMiss(
      "model " +
        pyRepr(mid) +
        " has no artifact at (" +
        vText +
        ", " +
        qText +
        ")",
    );
  }
  const sourceUrl: string = cell.artifact.source_url;
  /* v8 ignore next -- split() always yields >= 1 part, so pop() is
   * never undefined here; the ?? is the type-system's toll
   * (noUncheckedIndexedAccess), not a runtime arm. */
  const name: string = sourceUrl.split("/").pop() ?? "";
  const destSub: string = stripSlashes(cell.artifact.dest_sub);
  return [
    {
      name,
      url: sourceUrl,
      relative_path: destSub !== "" ? "models/" + destSub : "models",
    },
  ];
}

/** The runtime models tree root (data/runtime/comfyui — the py RUNTIME). */
export function runtimeModelsRoot(repoRoot: string = resolveRepoRoot()): string {
  return join(repoRoot, "data", "runtime", "comfyui", "models");
}

/**
 * The on-disk hit for (relativePath, name), else null — mirrors
 * manage._model_present. Runtime tree first, then the mount leg
 * (model_base_path + extra_model_folders from the endpoint machine
 * statement; stock folders map to themselves). No base configured
 * = mount leg skipped (the py SystemExit collapses to None).
 *
 * NON-PLUGIN callers only (walls/probes/unit — no Context). Plugin
 * paths read through ModelsService.checkModelPresent (same pure core
 * below). Documented split, never two truths.
 */
export function checkModelPresent(
  relativePath: string,
  name: string,
  repoRoot: string = resolveRepoRoot(),
): string | null {
  let cfg: Record<string, EngineJson> | null;
  try {
    cfg = loadEndpointConfig();
  } catch {
    cfg = null;
  }
  return findModelPresent(relativePath, name, repoRoot, cfg);
}

/** The pure presence core (I/O: existsSync probes only, no cache):
 *  cfg null = mount leg skipped (unparseable endpoint collapses to
 *  None, same as the module function's try/catch). Shared by the
 *  module function (non-plugin callers) and
 *  ModelsService.checkModelPresent (plugin paths). */
export function findModelPresent(
  relativePath: string,
  name: string,
  repoRoot: string,
  cfg: Record<string, EngineJson> | null,
): string | null {
  const folder: string = relativePath.startsWith("models/")
    ? relativePath.slice("models/".length)
    : relativePath;
  const runtimeHit: string = join(runtimeModelsRoot(repoRoot), folder, name);
  if (existsSync(runtimeHit)) return runtimeHit;
  if (cfg === null) return null;
  const rawBase: unknown = cfg["model_base_path"];
  const base: string =
    typeof rawBase === "string" ? rawBase.trim() : String(rawBase ?? "").trim();
  if (base === "" || base === "undefined") return null;
  const extras: Record<string, unknown> =
    isRecord(cfg["extra_model_folders"]) && cfg["extra_model_folders"] !== null
      ? (cfg["extra_model_folders"] as Record<string, unknown>)
      : {};
  const slash: number = folder.indexOf("/");
  const head: string = slash < 0 ? folder : folder.slice(0, slash);
  const rest: string = slash < 0 ? "" : folder.slice(slash + 1);
  const mapped: unknown = extras[head];
  const sub: string =
    typeof mapped === "string" && stripSlashes(mapped) !== ""
      ? stripSlashes(mapped)
      : head;
  const mountHit: string =
    rest !== "" ? join(base, sub, rest, name) : join(base, sub, name);
  if (existsSync(mountHit)) return mountHit;
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

