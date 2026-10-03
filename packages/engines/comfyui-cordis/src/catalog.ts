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

/** Strip leading/trailing slashes (str.strip("/")). */
function stripSlashes(s: string): string {
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

/** The provisions dest derivation (manage 275-290). Exported —
 *  the manage door resolves CARD-owned provision rows (card DECL
 *  provisions) through the same derivation: one spelling of the
 *  folder → models-tree path, never a second copy. */
export function provisionDest(folder: string): string {
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
    throw new CatalogMiss("model " + JSON.stringify(mid) + " not found in catalog");
  }
  // UNION LAW (2026-10-12 model audit, fix 1): provisions and the
  // variant-cell artifact are PARALLEL download channels, never
  // either-or shadows. The qwen families declare both — provisions
  // (TE/VAE) plus the cell artifact (the primary UNET) — and the old
  // `if (provisions.length > 0) return` arm left every artifact row
  // unreachable, while loadPlane's every()-presence check read
  // TE+VAE alone as the family being fully present.
  const rows: CatalogArtifactRow[] = [];
  for (const p of model.provisions) {
    const name: string = p.name.trim();
    const url: string = p.url.trim();
    if (name === "" || url === "") continue;
    rows.push({ name, url, relative_path: provisionDest(p.folder) });
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
  if (cell !== undefined && cell.artifact !== undefined) {
    const sourceUrl: string = cell.artifact.source_url;
    /* v8 ignore next -- split() always yields >= 1 part, so pop() is
     * never undefined here; the ?? is the type-system's toll
     * (noUncheckedIndexedAccess), not a runtime arm. */
    const name: string = sourceUrl.split("/").pop() ?? "";
    const destSub: string = stripSlashes(cell.artifact.dest_sub);
    rows.push({
      name,
      url: sourceUrl,
      relative_path: destSub !== "" ? "models/" + destSub : "models",
    });
  }
  if (rows.length === 0) {
    const vText: string = variant !== "" ? variant : "None";
    const qText: string = quant !== "" ? quant : "None";
    throw new CatalogMiss(
      "model " +
        JSON.stringify(mid) +
        " declares no downloadable provisions or artifact at (" +
        vText +
        ", " +
        qText +
        ")",
    );
  }
  return rows;
}

/** The runtime models tree root (data/runtime/comfyui — the RUNTIME). */
export function runtimeModelsRoot(repoRoot: string = resolveRepoRoot()): string {
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

export function findModelPathPresent(
  modelPath: string,
  repoRoot: string,
  cfg: Record<string, EngineJson> | null,
): string | null {
  const clean = modelPath.trim().replace(/^\/+|\/+$/gu, "");
  if (clean === "" || clean.split("/").some((part) => part === "..")) return null;
  const runtime = join(runtimeModelsRoot(repoRoot), clean);
  if (existsSync(runtime)) return runtime;
  if (cfg === null) return null;
  const rawBase: unknown = cfg["model_base_path"];
  const base = typeof rawBase === "string" ? rawBase.trim() : "";
  const mountBase = base !== "" && base !== "undefined" ? base : rootModelsReadRoot(repoRoot);
  if (mountBase === "" || mountBase === "undefined") return null;
  const candidates: string[] = [join(mountBase, clean)];
  const extras: unknown = cfg["extra_model_folders"];
  if (isRecord(extras)) {
    for (const mapped of Object.values(extras)) {
      if (typeof mapped !== "string" || mapped.trim() === "") continue;
      candidates.push(join(mountBase, stripSlashes(mapped), clean));
    }
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function checkModelPathPresent(
  modelPath: string,
  repoRoot: string = resolveRepoRoot(),
): string | null {
  let cfg: Record<string, EngineJson> | null;
  try {
    cfg = loadEndpointConfig();
  } catch {
    cfg = null;
  }
  return findModelPathPresent(modelPath, repoRoot, cfg);
}

/** The root inheritance base: the OVERLAY law (the portability fix,
 *  2026-10-12) — data/inference.local.json when present, else the
 *  tracked inference.config.json; models.read_root joined with
 *  engines.comfyui.base, anchored to the repo root when relative.
 *  Machine-local absolutes live in the untracked overlay ONLY (the
 *  provision script's loadRoot + the estate door's loadStoreRoot
 *  are the twins); the tracked tree ships portable repo-relative
 *  defaults, so a fresh clone never inherits another machine's
 *  /mnt. Empty string = no root statement (missing files, no
 *  models block, non-string read_root) — the mount leg then needs
 *  the endpoint's own base. One deterministic read, no cache. */
function rootModelsReadRoot(repoRoot: string): string {
  try {
    const overlayPath = join(repoRoot, "data", "inference.local.json");
    const rootPath = join(repoRoot, "inference.config.json");
    const raw: unknown = JSON.parse(
      readFileSync(existsSync(overlayPath) ? overlayPath : rootPath, "utf8"),
    );
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return "";
    const models: unknown = (raw as Record<string, unknown>)["models"];
    if (typeof models !== "object" || models === null || Array.isArray(models)) return "";
    const rr: unknown = (models as Record<string, unknown>)["read_root"];
    if (typeof rr !== "string" || rr.trim() === "") return "";
    let store = rr.trim();
    const engines: unknown = (raw as Record<string, unknown>)["engines"];
    if (typeof engines === "object" && engines !== null && !Array.isArray(engines)) {
      const comfy: unknown = (engines as Record<string, unknown>)["comfyui"];
      if (typeof comfy === "object" && comfy !== null && !Array.isArray(comfy)) {
        const base: unknown = (comfy as Record<string, unknown>)["base"];
        if (typeof base === "string" && base.trim() !== "") store = join(store, base.trim());
      }
    }
    return isAbsolute(store) ? store : join(repoRoot, store);
  } catch {
    return "";
  }
}

/** The pure presence core (I/O: existsSync probes + the one
 *  root-inheritance read, no cache): cfg null = mount leg skipped
 *  (unparseable endpoint collapses to None, same as the module
 *  function's try/catch). Shared by the module function
 *  (non-plugin callers) and ModelsService.checkModelPresent
 *  (plugin paths). */
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
  // ROOT-CONFIG INHERITANCE: an endpoint machine statement without
  // model_base_path inherits the root config's models.read_root —
  // the machine's own statement always wins.
  const mountBase: string = base !== "" && base !== "undefined" ? base : rootModelsReadRoot(repoRoot);
  if (mountBase === "" || mountBase === "undefined") return null;
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
    rest !== "" ? join(mountBase, sub, rest, name) : join(mountBase, sub, name);
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

