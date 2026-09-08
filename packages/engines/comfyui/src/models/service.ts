// models/service.ts — THE MODELS SYSTEM AS A CORDIS SERVICE
// (operator order, 2026-09-08: "the Models are not cordis" — the
// charge that named the PORT LAW violation this file fixes).
//
// THE PORT LAW (AGENTS.md, THE CORDIS STDLIB): a ported py system
// is REGISTERED THROUGH SERVICES with boot-loud validation — never
// a module const + free functions over it. The frozen registry
// (registry.generated.ts) is DATA (catalog rows may be frozen);
// the SYSTEM — registration, validation, resolution, the cascade —
// lives here, on a Service, reached through ctx.models.
//
// Mapping from the py (melite_models grammar @ 034e1f97):
//   Model class construction (metaclass validation, loud at
//     import)  → registerModel (loud at registration — a broken
//     row never serves, the same refusal shapes)
//   resolve_model / variant_of / cell_of → service members
//   merged_defaults (the cascade) → rides ctx.intercept +
//     Service[symbols.resolveConfig] (the inherency primitive —
//     base=family, intercept=variant, head=cell; see cascade.ts)
//   the catalog scan (OFFERING LAW + engine gate) → servedModels()
//
// Boot: models.ts (the compatibility facade) loads this service
// once per process and registers every frozen row through it.

import { Context, Service, symbols } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import {
  type CatalogArtifactRow,
  type CatalogModel,
  findModelPresent,
  loadCatalogModels,
  resolveArtifactRows,
} from "../catalog.ts";
import { resolveRepoRoot } from "../comfyui.ts";
import { loadEndpointConfig } from "../comfyui.ts";
import type { EngineJson } from "../comfyui.ts";
import {
  ModelError,
  ModelRow,
  type CellRow,
  type ModelDecl,
  type VariantRow,
} from "./contract.ts";
import { MODEL_REGISTRY } from "./registry.generated.ts";
import { buildCatalog } from "./catalogEmission.ts";

export const MODELS_SERVICE = "models";

/** One registration's validation — the py metaclass's gates,
 *  refusal-for-refusal (grammar @ 034e1f97). */
function validateDecl(decl: ModelDecl): void {
  if (typeof decl.id !== "string" || decl.id === "") {
    throw new ModelError(`model row needs an id (got '${String(decl.id)}')`);
  }
  if (decl.id !== decl.id.toLowerCase()) {
    throw new ModelError(`${decl.id}: ids are lowercase (the wire contract)`);
  }
  if (typeof decl.label !== "string" || decl.label === "") {
    throw new ModelError(`${decl.id}: a model needs a label`);
  }
  const genre: string = decl.genre ?? "";
  if (!/^[a-z0-9]*$/.test(genre) || genre === "") {
    throw new ModelError(
      `${decl.id}: genre '${genre}' is not a wire value (the enum-repr corruption refuses here, forever)`,
    );
  }
  for (const v of decl.variants) {
    if (typeof v.id !== "string" || v.id === "") {
      throw new ModelError(`${decl.id}: a variant needs an id`);
    }
    for (const c of v.cells) {
      if (typeof c.quant !== "string" || c.quant === "") {
        throw new ModelError(`${decl.id}/${v.id}: a cell needs a quant`);
      }
    }
  }
}

export class ModelsService extends Service {
  private readonly table = new Map<string, ModelDecl>();
  /** registry rows by repo root (the artifact-reader half merged
   *  from catalog.ts 2026-09-08 — root-independent values,
   *  fiber-owned; fixture roots under MELITE_REPO_ROOT resolve at
   *  request time, never at boot). */
  private rows: Map<string, CatalogModel[]> = new Map();

  constructor(ctx: Context) {
    super(ctx, MODELS_SERVICE);
  }

  /** Register one model row. LOUD: duplicate ids refuse (the py
   *  scan's one-owner-per-id law), invalid rows refuse at the gate
   *  (the metaclass's import-time validation, at registration). */
  registerModel(decl: ModelDecl): void {
    validateDecl(decl);
    if (this.table.has(decl.id)) {
      throw new ModelError(
        `model '${decl.id}' registered twice — one owner per model id (the interlock)`,
      );
    }
    this.table.set(decl.id, decl);
  }

  /** Register the frozen registry through the service (boot path —
   *  the DATA is frozen; the SYSTEM is this registration). */
  registerFrozenRegistry(): void {
    for (const decl of Object.values(MODEL_REGISTRY)) {
      this.registerModel(decl);
    }
  }

  /** Registered ids, scan order. */
  modelIds(): string[] {
    return [...this.table.keys()].sort();
  }

  /** The registered declaration (loud on unknown — the py
   *  find_model refusal). */
  getModel(id: string): ModelDecl {
    const decl = this.table.get(id);
    if (decl === undefined) {
      throw new ModelError(`unknown model '${id}' (registered: ${this.modelIds().slice(0, 12).join(", ")}…)`);
    }
    return decl;
  }

  /** The variant coordinate (first declared = the family default,
   *  the py matrix law). */
  variantOf(decl: ModelDecl, variant: string | null): VariantRow {
    if (variant === null) return decl.variants[0];
    const hit = decl.variants.find((v) => v.id === variant);
    if (hit === undefined) {
      throw new ModelError(
        `model '${decl.id}' has no variant '${variant}' (declared: ${decl.variants.map((v) => v.id).join(", ")})`,
      );
    }
    return hit;
  }

  /** The quant coordinate (first declared = the variant default). */
  cellOf(variantRow: VariantRow, quant: string | null): CellRow | null {
    if (quant === null) return variantRow.cells[0] ?? null;
    const hit = variantRow.cells.find((c) => c.quant === quant);
    if (hit === undefined) {
      throw new ModelError(
        `variant '${variantRow.id}' has no quant '${quant}' (declared: ${variantRow.cells.map((c) => c.quant).join(", ")})`,
      );
    }
    return hit;
  }

  /** THE CASCADE on the inherency primitive: family = base, the
   *  resolving variant = the INTERCEPT (its resolver_defaults dict
   *  is the intercept entry — cordis merges root-closer-first, so
   *  the variant's keys win over the family's), the resolving cell
   *  = head. Service[symbols.resolveConfig] (cordis service.ts:86)
   *  merges base → intercepts → head per-KEY — no hand-rolled
   *  Object.assign chain, no whole-dict replacement. */
  mergedDefaults(id: string, variant?: string | null, quant?: string | null): Record<string, unknown> {
    const decl = this.getModel(id);
    if (variant === undefined && quant === undefined) {
      return { ...(decl.defaults ?? {}) };
    }
    const v = this.variantOf(decl, variant ?? null);
    const c = this.cellOf(v, quant ?? null);
    return this.cascade(
      decl.defaults ?? {},
      v.resolver_defaults,
      c !== null && c.resolver_defaults !== undefined ? c.resolver_defaults : null,
    );
  }

  /** base → intercept → head through the framework's own chain
   *  (the wall pins the precedence, isolation, and the shipped
   *  symbol identity). */
  cascade(
    base: Record<string, unknown>,
    intercept: Record<string, unknown> | null,
    head: Record<string, unknown> | null,
  ): Record<string, unknown> {
    let view: Context = this.ctx;
    if (intercept !== null && Object.keys(intercept).length > 0) {
      view = this.ctx.intercept(MODELS_SERVICE, intercept);
    }
    const svc = (view as unknown as Record<string, unknown>)[MODELS_SERVICE] as {
      [symbols.resolveConfig]: (b?: unknown, h?: unknown) => Record<string, unknown>;
    };
    return svc[symbols.resolveConfig](
      base,
      head !== null && Object.keys(head).length > 0 ? head : undefined,
    );
  }

  /** Matrix coordinates → { route, engine, cell } (the R1
   *  contract). ENGINE_TRUTH is ("mode", "variant") — the py
   *  compose's own declaration; the cascade never touches it. */
  resolve(id: string, variant?: string | null, quant?: string | null): {
    route: string;
    engine: string;
    cell: CellRow | null;
    variant: VariantRow;
  } {
    const decl = this.getModel(id);
    const v = this.variantOf(decl, variant ?? null);
    const c = this.cellOf(v, quant ?? null);
    return {
      route: c !== null && c.route !== "" ? c.route : v.route,
      engine: (decl.engine ?? "") !== "" ? (decl.engine as string) : "comfyui",
      cell: c,
      variant: v,
    };
  }

  /** The served catalog rows (OFFERING LAW + LAW 0 engine gate —
   *  one place: catalogEmission's buildCatalog over the SAME
   *  registration set). */
  servedModels(): Record<string, ModelRow> {
    return buildCatalog().models;
  }

  // ── the artifact-reader half (merged from catalog.ts, the same
  //  pure cores — one ctx.models owns the whole registry plane) ──

  /** Test seam: drop catalog state (walls boot fresh processes). */
  resetForTests(): void {
    this.rows.clear();
  }

  /** The catalog rows for one repo root (the compiled-in registry —
   *  never a silent empty catalog; malformed rows died at the
   *  registration gate above, the only place a refusal belongs). */
  catalogModels(repoRoot: string = resolveRepoRoot()): CatalogModel[] {
    const hit = this.rows.get(repoRoot);
    if (hit !== undefined) return hit;
    const parsed = loadCatalogModels(repoRoot);
    this.rows.set(repoRoot, parsed);
    return parsed;
  }

  /** The downloadable rows for (model, variant, quant) — the
   *  manage door's rail. Throws CatalogMiss with the legacy texts
   *  (the door maps them to 404). */
  resolveCatalogArtifact(mid: string, variant = "", quant = "", repoRoot: string = resolveRepoRoot()): CatalogArtifactRow[] {
    return resolveArtifactRows(this.catalogModels(repoRoot), mid, variant, quant);
  }

  /** The on-disk hit for (relativePath, name), else null (mount
   *  bindings are deploy truth, loaded live per call). */
  checkModelPresent(relativePath: string, name: string, repoRoot: string = resolveRepoRoot()): string | null {
    let cfg: Record<string, EngineJson> | null;
    try {
      cfg = loadEndpointConfig();
    } catch {
      cfg = null;
    }
    return findModelPresent(relativePath, name, repoRoot, cfg);
  }
}

/** The provider plugin (fiber-owned): owns the ModelsService
 *  lifetime. No prime step (rows load lazily per repo root).
 *  Manifest row engine-model-catalog rides BEFORE every consumer
 *  (the manage door via gateway-bridges). Loadable entry:
 *  packages/engines/comfyui/src/entries/catalog-registry.ts. */
export const modelsProvider: Plugin = {
  name: "engine-model-catalog",
  apply(ctx: Context): void {
    new ModelsService(ctx);
  },
};

/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param: an explicit arg wins. Null = the caller
 *  forgot to thread ctx.models — a bug, so reads throw LOUD. */
export function needModels(
  models: ModelsService | null | undefined,
  where: string,
): ModelsService {
  if (models === null || models === undefined) {
    throw new Error(
      "[models] no ModelsService for " + where +
        " — doors inject 'models' and pass ctx.models " +
        "(the manifest's engine-model-catalog row provides at boot)",
    );
  }
  return models;
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    models: ModelsService;
  }
}

// ── process singleton (the compatibility facade models.ts rides) ──

let booted: ModelsService | null = null;

/** Boot the models system once: one Context, the service, every
 *  frozen row registered THROUGH it (boot-loud validation). The
 *  awaited fiber settles once loading finished (registry.ts:185)
 * — apply has run, the service is live on ctx. */
export async function bootModels(): Promise<ModelsService> {
  if (booted !== null) return booted;
  const ctx = new Context();
  await ctx.plugin({
    apply(c: Context): void {
      const s = new ModelsService(c);
      s.registerFrozenRegistry();
    },
  });
  // Service registration is immediate (service.ts:11) but start
  // settles on a fiber tick — one tick, then the sync facade owns
  // a fully-live service forever after.
  await new Promise((r) => setTimeout(r, 0));
  booted = (ctx as unknown as Record<string, ModelsService>)[MODELS_SERVICE];
  if (booted === undefined) {
    throw new ModelError("models service failed to register at boot");
  }
  return booted;
}

/** The booted service (throws if bootModels has not settled). */
export function modelsService(): ModelsService {
  if (booted === null) {
    throw new ModelError("models service not booted — await bootModels() first");
  }
  return booted;
}

/** The cascade through the booted service (the wall's entry). */
export function resolveCascade(
  base: Record<string, unknown>,
  intercept: Record<string, unknown> | null,
  head: Record<string, unknown> | null,
): Record<string, unknown> {
  return modelsService().cascade(base, intercept, head);
}
