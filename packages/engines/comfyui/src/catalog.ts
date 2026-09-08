// engine/catalog.ts — the TS-native model catalog (NO-ESTATE-PYTHON
// LAW: the 47 packages/engines/comfyui/models/*/model.py files are
// dead; this module + models/provisions.json are the catalog now).
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

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type EngineJson,
  loadEndpointConfig,
  resolveRepoRoot,
} from "./comfyui.ts";

/** One downloadable row — the manage door's download contract. */
export interface CatalogArtifactRow {
  readonly name: string;
  readonly url: string;
  readonly relative_path: string;
}

/** A provision declaration row (models/provisions.json DATA). */
export interface CatalogProvision {
  readonly name: string;
  readonly url: string;
  readonly folder: string;
}

/** A matrix cell's downloadable body (models/provisions.json DATA). */
export interface CatalogCellArtifact {
  readonly source_url: string;
  readonly dest_sub: string;
}

/** One (variant x quant) matrix place (models/provisions.json DATA). */
export interface CatalogCell {
  readonly quant: string;
  readonly artifact?: CatalogCellArtifact;
}

/** One variant row (models/provisions.json DATA). */
export interface CatalogVariant {
  readonly id: string;
  readonly cells: CatalogCell[];
}

/** One model row (models/provisions.json DATA). */
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

/** Parse + shape-check the DATA file (loud on a malformed tree —
 *  a half-written catalog refuses, never serves partial rows). */
function parseCatalog(text: string, path: string): CatalogModel[] {
  let doc: unknown;
  try {
    doc = JSON.parse(text) as unknown;
  } catch (exc: unknown) {
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    throw new Error(
      "model catalog " + path + " exists but will not parse (" + msg + ")",
    );
  }
  if (!isRecord(doc) || !Array.isArray(doc["models"])) {
    throw new Error(
      "model catalog " + path + " has no models[] array — fix the file",
    );
  }
  const out: CatalogModel[] = [];
  for (const entry of doc["models"] as unknown[]) {
    if (!isRecord(entry) || typeof entry["id"] !== "string") {
      throw new Error(
        "model catalog " + path + " holds a row without a string id",
      );
    }
    const provisions: CatalogProvision[] = [];
    if (Array.isArray(entry["provisions"])) {
      for (const p of entry["provisions"] as unknown[]) {
        if (!isRecord(p)) continue;
        provisions.push({
          name: typeof p["name"] === "string" ? (p["name"] as string) : "",
          url: typeof p["url"] === "string" ? (p["url"] as string) : "",
          folder:
            typeof p["folder"] === "string" ? (p["folder"] as string) : "",
        });
      }
    }
    const variants: CatalogVariant[] = [];
    if (Array.isArray(entry["variants"])) {
      for (const v of entry["variants"] as unknown[]) {
        if (!isRecord(v) || typeof v["id"] !== "string") continue;
        const cells: CatalogCell[] = [];
        if (Array.isArray(v["cells"])) {
          for (const c of v["cells"] as unknown[]) {
            if (!isRecord(c) || typeof c["quant"] !== "string") continue;
            const cell: CatalogCell = { quant: c["quant"] as string };
            if (isRecord(c["artifact"])) {
              const art = c["artifact"] as Record<string, unknown>;
              if (
                typeof art["source_url"] === "string" &&
                typeof art["dest_sub"] === "string"
              ) {
                (cell as { artifact?: CatalogCellArtifact }).artifact = {
                  source_url: art["source_url"] as string,
                  dest_sub: art["dest_sub"] as string,
                };
              }
            }
            cells.push(cell);
          }
        }
        variants.push({ id: v["id"] as string, cells });
      }
    }
    out.push({
      id: entry["id"] as string,
      genre: typeof entry["genre"] === "string" ? (entry["genre"] as string) : "",
      provisions,
      variants,
    });
  }
  return out;
}

let CACHE: CatalogModel[] | null = null;

/** The catalog rows (cached per process — DATA file, live-read). */
export function loadCatalogModels(
  repoRoot: string = resolveRepoRoot(),
): CatalogModel[] {
  if (CACHE !== null) return CACHE;
  const path: string = join(
    repoRoot,
    "packages",
    "engines",
    "comfyui",
    "models",
    "provisions.json",
  );
  CACHE = parseCatalog(readFileSync(path, "utf8"), path);
  return CACHE;
}

/** Drop the process cache (walls that rewrite the DATA file). */
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
 */
export function resolveCatalogArtifact(
  mid: string,
  variant = "",
  quant = "",
  repoRoot: string = resolveRepoRoot(),
): CatalogArtifactRow[] {
  const models: CatalogModel[] = loadCatalogModels(repoRoot);
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
 */
export function checkModelPresent(
  relativePath: string,
  name: string,
  repoRoot: string = resolveRepoRoot(),
): string | null {
  const folder: string = relativePath.startsWith("models/")
    ? relativePath.slice("models/".length)
    : relativePath;
  const runtimeHit: string = join(runtimeModelsRoot(repoRoot), folder, name);
  if (existsSync(runtimeHit)) return runtimeHit;
  let cfg: Record<string, EngineJson>;
  try {
    cfg = loadEndpointConfig();
  } catch {
    return null;
  }
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
