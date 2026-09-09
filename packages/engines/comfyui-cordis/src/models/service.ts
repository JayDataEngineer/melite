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
} from "./families/contract.ts";
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
  private readonly table = new Map<string, ModelDecl>()
  /** The derived route index: flat id → owning model + variant (the
   *  hierarchy's derived realization — built at registration,
   *  read at serving; dispose retracts). */
  private readonly routes = new Map<string, { modelId: string; variantId: string; cellRoute: boolean }>();
  /** registry rows by repo root (the artifact-reader half merged
   *  from catalog.ts 2026-09-08 — root-independent values,
   *  fiber-owned; fixture roots under MELITE_REPO_ROOT resolve at
   *  request time, never at boot). */
  private rows: Map<string, CatalogModel[]> = new Map();

  constructor(ctx: Context) {
    super(ctx, MODELS_SERVICE);
  }

  /** Register one family. LOUD: duplicate ids refuse (the py
   *  scan's one-owner-per-id law), invalid rows refuse at the gate
   *  (the metaclass's import-time validation, at registration).
   *  REVERTIBLE (the discharge stroke): returns the disposer —
   *  ctx.effect-wrapped at the plugin seam, the fiber owns the
   *  row's lifetime; dispose and the family is gone from the
   *  table (a dynamic re-port can retire a family mid-flight). */
  registerFamily(decl: ModelDecl): () => void {
    validateDecl(decl);
    if (decl.lane_inputs !== undefined && (typeof decl.lane_inputs !== "object" || decl.lane_inputs === null || Array.isArray(decl.lane_inputs))) {
      throw new ModelError(`${decl.id}: lane_inputs must be a plain object (the compose splice table)`);
    }
    if (this.table.has(decl.id)) {
      throw new ModelError(
        `model '${decl.id}' registered twice — one owner per model id (the interlock)`,
      );
    }
    // THE ROUTE INDEX (the hierarchy stroke 2026-09-08): every
    // variant/cell route claims back into its OWNING model — one
    // route owner (a flat id claimed by two models is drift, the
    // flattener's sin refusing to repeat). The head's own route is
    // the model id itself.
    const claims: { route: string; variantId: string; cellRoute: boolean }[] = [];
    // COMPLETENESS (§3.2.2 satisfaction law): the model's own id is
    // an address — if no variant/cell route claims it, the head
    // address composes through the family default (the first
    // variant with cells). A registered atom that serves no
    // address is an unsatisfying boot — refused below, never
    // silently unaddressable.
    const resolving = decl.variants.find((v) => v.cells.length > 0) ?? decl.variants[0]
    if (resolving !== undefined && !decl.variants.some((v) => v.route === decl.id) && !decl.variants.some((v) => v.cells.some((c) => c.route === decl.id))) {
      claims.unshift({ route: decl.id, variantId: resolving.id, cellRoute: false })
    }
    for (const variant of decl.variants) {
      // truthiness, never =="" (the conformance stroke: absent
      // route = unaddressable — undefined must not claim).
      if (variant.route) {
        claims.push({ route: variant.route, variantId: variant.id, cellRoute: false });
      }
      for (const cell of variant.cells) {
        if (cell.route && cell.route !== variant.route) {
          claims.push({ route: cell.route, variantId: variant.id, cellRoute: true })
        }
      }
    }
    for (const claim of claims) {
      // a SELF-ROUTE (the claim equals the model's own id) is the
      // model's composed head — it SUPERSEDES any alias a sibling
      // model's variant laid on the same flat id
      if (claim.route === decl.id) {
        this.routes.set(claim.route, { modelId: decl.id, variantId: claim.variantId, cellRoute: claim.cellRoute })
        continue
      }
      // a route that IS a registered model's id belongs to that
      // model (its own self-route); the sibling variant's claim on
      // the same flat id is its derived alias — the model wins
      if (this.table.has(claim.route)) continue
      const prior = this.routes.get(claim.route);
      // one owner per flat id — but a model may reuse its own route
      // across variants (a shared artifact addressing); only a
      // CROSS-model claim is drift
      if (prior !== undefined && prior.modelId !== decl.id) {
        throw new ModelError(
          `route '${claim.route}' claimed by both '${prior.modelId}' and '${decl.id}' — one owner per flat id (the flattener's sin refuses to repeat)`,
        );
      }
      if (prior === undefined) {
        this.routes.set(claim.route, { modelId: decl.id, variantId: claim.variantId, cellRoute: claim.cellRoute })
      }
    }
    this.table.set(decl.id, decl);
    return (): void => {
      this.table.delete(decl.id);
      for (const claim of claims) this.routes.delete(claim.route)
    };
  }

  /** Every registered declaration, id-sorted (the table read that
   *  replaced registry.generated iteration). */
  allDecls(): ModelDecl[] {
    return [...this.table.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  /** The table size (census + the transaction wall). */
  familyCount(): number {
    return this.table.size;
  }

  /** The SERVED enumeration (derived realization, paper §3.3):
   *  model ids ∪ their variant/cell routes — the flat ids every
   *  downstream address (catalog, doors, facts, flows, specs)
   *  already knows. One component, many addressed cells. */
  modelIds(): string[] {
    return [...new Set([...this.table.keys(), ...this.routes.keys()])].sort();
  }

  /** The MODEL registry ids (the declaration count — one per py
   *  class; the hierarchy's registry plane, vs the served view). */
  registryIds(): string[] {
    return [...this.table.keys()].sort();
  }

  /** The RAW model declaration (the atom as authored — no variant
   *  deltas composed). Registry-plane readers use this. */
  registryModel(id: string): ModelDecl {
    const head = this.table.get(id)
    if (head === undefined) {
      throw new ModelError(`no registered model '${id}' (routes compose; the registry holds atoms)`)
    }
    return head
  }

  /** The declaration for an address — EVERY served id composes
   *  through the cascade (the model id itself carries a route
   *  row: its resolving variant + cell; paper §3.2.3: base ←
   *  variant ← cell, the monoid merge — label/description
   *  resolved cell→variant→model, defaults and lane_inputs
   *  unioned through the intercepts). Derived, never stored:
   *  recovery discards it wholesale. The raw atom is
   *  registryModel. */
  getModel(id: string): ModelDecl {
    const route = this.routes.get(id)
    if (route !== undefined) {
      const model = this.table.get(route.modelId)
      if (model === undefined) {
        throw new ModelError(`route '${id}' points at unregistered model '${route.modelId}' — index drift`)
      }
      const variant = model.variants.find((v) => v.id === route.variantId)
      if (variant === undefined) {
        throw new ModelError(`route '${id}' points at unknown variant '${route.variantId}' of '${model.id}' — index drift`)
      }
      // a variant-level address resolves its DEFAULT CELL (the one
      // routing to the address, else the variant's first cell) —
      // the quant's source/defaults compose the address view
      const cell = variant.cells.find((c) => c.route === id) ?? (route.cellRoute ? undefined : variant.cells[0])
      // attach override keys ONLY when a layer declares them — a
      // spread of absent layers would mint undefined-valued own
      // keys (deepEqual drift vs the golden's JSON round-trip)
      //
      // THE MUTATION SHAPE (operator order 2026-09-08: "THE MODEL
      // ISN'T BEING MUTATED, READ THE DESCRIPTION"): the atom
      // declares its identity ONCE; variants carry TOKENS
      // (Turbo/Base/SFT/XL) + real delta descriptions; cells carry
      // QUANT tokens (Q8/BF16/Native). The flat truth COMPOSES at
      // read: label = model + variant + quant tokens joined;
      // description = the variant's real delta, else the model's.
      const labelTokens = [model.label, variant.label ?? "", cell?.label ?? ""].filter((t) => t !== "")
      // absent ≡ empty (the conformance stroke): a missing model
      // description mints NO key — assigning undefined would mint
      // an undefined-valued own key (the drift above).
      const deltaDesc = (variant.description ?? "") !== "" ? variant.description! : model.description;
      const derived: ModelDecl = {
        ...model,
        id,
        label: labelTokens.join(" "),
        ...(deltaDesc ? { description: deltaDesc } : {}),
      }
      // ONLY THE QUANT CARRIES THE DOWNLOAD: the model's repo +
      // the CELL's artifact filename compose the route's source
      const cellSource: { filename?: string | null } | null | undefined = cell?.source;
      if (cellSource !== null && cellSource !== undefined) {
        derived.source = { ...(model.source ?? {}), filename: cellSource.filename! }
      }
      if (model.defaults !== undefined || Object.keys(variant.resolver_defaults ?? {}).length > 0) {
        // A NULL STAMP UNSETS (the voicedesign meld 2026-09-08): the
        // intercept retracts the base default — a variant that
        // doesn't use an inherited key (voicedesign ≠ persona voice)
        // nulls it, and the key leaves the derived view entirely
        const merged: Record<string, unknown> = { ...(model.defaults ?? {}), ...variant.resolver_defaults, ...(cell?.resolver_defaults ?? {}) }
        for (const k of Object.keys(merged)) {
          if (merged[k] === null || merged[k] === undefined) delete merged[k];
        }
        derived.defaults = merged
      }
      if (model.lane_inputs !== undefined || variant.lane_inputs !== undefined) {
        derived.lane_inputs = { ...(model.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}) }
      }
      // THE ENGINE RIDES THE VARIANT (the moss meld 2026-09-08): a
      // family can span runtimes (comfyui sfx + audio_cpp GGUF) —
      // the address view carries the variant's engine, else the
      // cell's, else the atom's
      if ((variant.engine ?? "") !== "") derived.engine = variant.engine
      else if (cell !== undefined && (cell.engine ?? "") !== "") derived.engine = cell.engine
      return derived
    }
    throw new ModelError(`unknown model '${id}' (registered: ${this.modelIds().slice(0, 12).join(", ")}…)`)
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
      v.resolver_defaults ?? {},
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
      // unaddressable coordinates resolve to the owner (the claim
      // table unshifts decl.id for exactly this variant — a route
      // never renders "").
      route: (c !== null && c.route ? c.route : v.route) ?? decl.id,
      engine: (decl.engine ?? "") !== "" ? (decl.engine as string) : "comfyui",
      cell: c,
      variant: v,
    };
  }

  /** The served catalog rows (OFFERING LAW + LAW 0 engine gate —
   *  one place: catalogEmission's buildCatalog over the SAME
   *  registration set). */
  servedModels(): Record<string, ModelRow> {
    // THE DERIVED SERVING (the hierarchy stroke): every route of
    // every model enumerates (the flat ids the runtime knows +
    // the variant/cell routes one model serves) — getModel
    // resolves the cascade per route; isServedFamily filters as
    // before. The registry (allDecls) is the declaration plane;
    // serving is the derived realization (never stored).
    return buildCatalog(this.modelIds().map((id) => this.getModel(id))).models;
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
    const parsed = loadCatalogModels(this.allDecls(), repoRoot);
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
 *  packages/engines/comfyui-cordis/src/entries/catalog-registry.ts. */
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

/** BOOT-LOUD CONTRACTS (the discharge stroke): after the family
 *  fibers settle, the table cross-validates against BOTH planes
 *  it must agree with — the CARD plane (validate_against_cards:
 *  dead card refs, out-of-domain defaults, enum misses refuse)
 *  and the FACTS plane (the compose contract: facts.models[id]
 *  .card ≡ decl.card). A refusal here is a BOOT refusal — the
 *  table never half-serves (the transactional law).
 *
 * SEAM (no static cross-package dep): the card/facts plane loads through a DYNAMIC import (merged
 *  2026-09-08: one package now — dynamic defers past module
 *  evaluation, cardDefs ↔ service would cycle statically); a
 *  cardless boot skips the card check loudly-noted, the facts
 *  file still gates. */
async function validateBootContracts(svc: ModelsService): Promise<void> {
  const decls = svc.allDecls();
  let domains: import("./validate.ts").CardDomains | null = null;
  const boardings = new Map<string, readonly string[]>();
  let factsModels: Record<string, { card?: string }> | null = null;
  let cardSvc: ReturnType<
    typeof import("../cardDefs.ts").theService
  > | null = null;
  let packFate: Record<string, string> | null = null;
  try {
    const cards = await import("../cardDefs.ts");
    await cards.loadCardDefs();
    cardSvc = cards.theService();
    // the pack fate table (the consumption gate's boot leg — gate
    // (d)): same dynamic seam as the card plane, same degrade.
    const guard = await import("@comfyui/card-kit/guard");
    packFate = guard.PACK_FATE as Record<string, string>;
    const { fieldDomains } = await import("./validate.ts");
    // built as mutable Maps, read as the CardDomains readonly view
    const table = new Map<string, ReturnType<typeof fieldDomains>>();
    for (const id of cardSvc.cardIds()) {
      const def = cardSvc.getCardDef(id);
      const dict = ((def?.schemaCarrier ?? def?.schema) as { dict?: Record<string, unknown> } | undefined)?.dict;
      if (dict !== undefined) table.set(id, fieldDomains(dict as never));
    }
    domains = table;
    // THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
    // only form the relation exists in — models declare nothing
    // about their callers)
    for (const id of cardSvc.cardIds()) {
      const def = cardSvc.getCardDef(id);
      if (def !== undefined) boardings.set(id, def.boarded);
    }
    // the rows assemble from the registry + frozen card slices
    // (facts.ts derivation, same dynamic seam as the card plane:
    // static would cycle service→facts→models→service against
    // the top-level boot) — the boot reads the same contract
    // compose reads, never a second file spelling.
    const { loadFacts } = await import("@comfyui/card-kit/facts");
    factsModels = loadFacts(resolveRepoRoot() + "/packages/engines/comfyui-cordis/data/model-facts.json", {
      getModel: (id: string) => svc.getModel(id),
      registryIds: () => svc.registryIds(),
      registryModel: (id: string) => svc.registryModel(id),
    }).models;
  } catch (err) {
    // the card plane is a sibling that may not ship with every
    // consumer — the boot continues, the check degrades to a
    // logged skip (walls pin the full path)
    console.warn("[models] card-plane cross-validation skipped:", (err as Error).message);
  }
  // §3.2.2 SATISFACTION GATE: every registered atom serves an
  // address — an unaddressable model refuses the boot (named,
  // loud; never a silent hole in the serving plane).
  for (const id of svc.registryIds()) {
    if (!svc.modelIds().includes(id)) {
      throw new ModelError(`model '${id}' registers but serves no address — every atom resolves through its ladder (add a variant/cell route or a resolving default)`)
    }
  }
  if (domains !== null) {
    const { validateRegistryAgainstCards } = await import("./validate.ts");
    validateRegistryAgainstCards(
      decls, domains, ["mode", "variant"], boardings,
      new Set(svc.modelIds()),
      new Map(svc.modelIds().map((id): [string, ModelDecl] => [id, svc.getModel(id)])),
    );
  }
  // ── THE MOD INTERLOCK (the correction stroke 2026-09-08): the
  // flavor↔DECL.mods satisfaction gate — the paper's §3.2.2 law, a
  // component ACTIVATES ONLY AT A SATISFYING STATE. Both directions
  // refuse boot-loud:
  //   (a) DECL.mods entry naming neither a registered pack nor a
  //       registered verb = a DEAD BOARDING (drift, the amnesty is
  //       over);
  //   (b) a flavor/verb registration whose family does not board
  //       that pack = an UNDECLARED MUTATION (the flavor claims a
  //       model that never declared it).
  if (cardSvc !== null) {
    const packs = new Set(cardSvc.packNames());
    const verbs = new Set(cardSvc.verbIds());
    for (const flavor of cardSvc.flavorRegistrations()) {
      for (const fam of flavor.families) {
        const d = svc.registryModel(fam);
        if (!(d.mods ?? []).includes(flavor.pack)) {
          throw new ModelError(
            `model ${fam}: a '${flavor.pack}' flavor is registered for it but DECL.mods does not board the pack — an undeclared mutation (the model declares its mods, nothing else)`,
          );
        }
      }
    }
    // (b)-for-verbs: a verb naming a family that never boarded it
    // is the same undeclared mutation (the verb's families field
    // is its claim; the DECL is the model's answer — both refuse).
    for (const verb of cardSvc.verbRegistrations()) {
      for (const fam of verb.families) {
        const d = svc.registryModel(fam);
        if (!(d.mods ?? []).includes(verb.id)) {
          throw new ModelError(
            `model ${fam}: verb '${verb.id}' claims it but DECL.mods does not board the verb — an undeclared mutation (the model declares its mods, nothing else)`,
          );
        }
      }
    }
    const flavorsOf = cardSvc.flavorRegistrations();
    for (const d of decls) {
      for (const entry of d.mods ?? []) {
        if (packs.has(entry) || verbs.has(entry)) continue;
        throw new ModelError(
          `model ${d.id}: DECL.mods '${entry}' names no registered pack or verb — a dead boarding is drift, not a skip (the amnesty is over)`,
        );
      }
      // the satisfaction law's third edge: a DECLARED pack boarding
      // with no flavor registering for THIS family = the mutation
      // silently never lands (delete the family's mods/<pack>.ts
      // while another family keeps the pack alive — the surface
      // loses the join with no refusal). Drift, refuses.
      //
      // the fourth edge (gate (d), the pack fate): a boarded pack
      // no lane fires or refuses-loud = a surfaced knob with no
      // lane to carry it (controlnet today — registered, waiting,
      // unboardable until a lane lands its fate). Verbs skip:
      // their fate is the family-scoped mount, pinned above.
      for (const entry of d.mods ?? []) {
        if (verbs.has(entry)) continue;
        const mine = flavorsOf.some((f) => f.pack === entry && f.families.includes(d.id));
        if (!mine) {
          throw new ModelError(
            `model ${d.id}: DECL.mods boards '${entry}' but no flavor of that pack registers for it — ship families/${d.genre}/${d.id}/mods/${entry}.ts (a boarding without its flavor is a silent dead mutation)`,
          );
        }
        if (packFate !== null && packFate[entry] === undefined) {
          throw new ModelError(
            `model ${d.id}: DECL.mods boards '${entry}' but the pack has no fate in this plane (no lane fires it, no firing gate refuses it) — land the lane or the loud refusal before any atom boards it (a surfaced knob with no lane is a silent skip)`,
          );
        }
      }
    }
  }
  if (factsModels !== null && boardings.size > 0) {
    const callersOf = new Map<string, string[]>();
    for (const [cardId, boarded] of boardings) {
      for (const mid of boarded) {
        const list = callersOf.get(mid) ?? [];
        list.push(cardId);
        callersOf.set(mid, list);
      }
    }
    for (const d of decls) {
      const f = factsModels[d.id];
      if (f === undefined) continue;
      if (typeof f.card === "string" && !(callersOf.get(d.id) ?? []).includes(f.card)) {
        throw new ModelError(`model ${d.id}: facts card '${f.card}' is not one of its callers [${(callersOf.get(d.id) ?? []).join(", ")}] (the card selects atoms; the facts may not name a caller the cards do not)`);
      }
    }
  }
}

/** Boot the models system once — TRANSACTIONAL (the discharge
 *  stroke): one Context, the service, then every family plugin
 *  through ctx.plugin (each fiber registers through
 *  ctx.effect(() => ctx.models.registerFamily(DECL)) — the
 *  declaration is a REVERTIBLE effect). ANY family refusing
 *  (validation, duplicate, bad shape) DISPOSES the whole context:
 *  the table is empty, the boot throws — all-or-nothing, a broken
 *  family never half-serves. The contracts then cross-validate
 *  boot-loud (above) before the singleton owns the table. */
export async function bootModels(): Promise<ModelsService> {
  if (booted !== null) return booted;
  const ctx = new Context();
  try {
    await ctx.plugin(modelsProvider);
    const { FAMILY_PLUGINS } = await import("./families/index.ts");
    for (const family of FAMILY_PLUGINS) {
      await ctx.plugin(family);
    }
    // Service registration is immediate (service.ts:11) but start
    // settles on a fiber tick — one tick, then every family's
    // effect has run and the table is whole.
    await new Promise((r) => setTimeout(r, 0));
    const svc = (ctx as unknown as Record<string, ModelsService>)[MODELS_SERVICE];
    if (svc === undefined) {
      throw new ModelError("models service failed to register at boot");
    }
    if (svc.familyCount() !== FAMILY_PLUGINS.length) {
      throw new ModelError(
        `boot registered ${svc.familyCount()} families but ${FAMILY_PLUGINS.length} plugins loaded — a family registered nothing (the transactional gate)`,
      );
    }
    await validateBootContracts(svc);
    booted = svc;
    return booted;
  } catch (err) {
    await ctx.fiber.dispose();
    booted = null;
    throw err;
  }
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
