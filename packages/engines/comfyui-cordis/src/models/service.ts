// models/service.ts — THE MODELS SYSTEM AS A CORDIS SERVICE
// (operator order, 2026-09-08: "the Models are not cordis" — the
// charge that named the PORT LAW violation this file fixes).
//
// THE PORT LAW (AGENTS.md, THE CORDIS STDLIB): a ported retired system
// is REGISTERED THROUGH SERVICES with boot-loud validation — never
// a module const + free functions over it. The frozen registry
// (the retired registry.generated module) is DATA (catalog rows may be frozen);
// the SYSTEM — registration, validation, resolution, the cascade —
// lives here, on a Service, reached through ctx.models.
//
// Mapping from the (melite_models grammar @ 034e1f97):
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
  checkModelPathPresent,
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
  ModelDecl as ModelDeclSchema,
  VariantRow as VariantRowSchema,
  ParamRequiresRow as ParamRequiresRowSchema,
  ParamConflictsRow as ParamConflictsRowSchema,
  ParamTogetherRow as ParamTogetherRowSchema,
  ParamAtMostOneRow as ParamAtMostOneRowSchema,
  ParamEitherOrRow as ParamEitherOrRowSchema,
  ParamRelationWords as ParamRelationWordsSchema,
  type CellRow,
  type ModelDecl,
  type VariantRow,
} from "./families/contract.ts";
import Schema from "@deepseek-ai/schemastery";
import { buildCatalog } from "./catalogEmission.ts";

export const MODELS_SERVICE = "models";

/** One registration's validation — the declaration gates,
 *  refusal-for-refusal (grammar @ 034e1f97).
 *
 *  SCHEMA LEG (ledger row 16, 2026-09-10): the DECL resolves through
 *  the ModelDecl schema STRICTLY first. The strict resolve strips
 *  unknown keys — the `extra: forbid` rule made honest: a stripped
 *  key is DRIFT and refuses loud (the plain object resolver merges
 *  unknown keys by default; the old handroll checked four fields and
 *  let everything else ride). The semantic predicates below stay:
 *  lowercase ids, the genre wire value, quant presence — laws a
 *  shape schema cannot express. */
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
  if (decl.lane_inputs !== undefined && (typeof decl.lane_inputs !== "object" || decl.lane_inputs === null || Array.isArray(decl.lane_inputs))) {
    throw new ModelError(`${decl.id}: lane_inputs must be a plain object (the compose splice table)`);
  }
  if (!Array.isArray(decl.variants)) {
    throw new ModelError(`${decl.id}: variants must be an array (got ${typeof decl.variants})`);
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
  // THE RECIPE↔WEIGHTS LAW (2026-09-29, the third live break's
  // silent half): a cell's artifact is the DOWNLOAD; the run loads
  // (atom ∪ variant) lane_inputs. A cell downloading a file the
  // lane truth never loads is a silent wrong-weights run — krea-2
  // raw shipped exactly that for 20 days (turbo's unet under a
  // 52-step marriage, masked behind the missing facts row). The
  // registry-wide sweep held at ZERO violators the day this wall
  // landed; the qwen lightning + tts melds declare the override
  // precedent (variant lane_inputs re-spell the swapped
  // checkpoint). A mismatch refuses HERE, at registration, forever.
  const WEIGHTS_FILE = /\.(safetensors|gguf|pth|bin|ckpt)$/i;
  const atomLoads = new Set(
    Object.values(decl.lane_inputs ?? {}).filter(
      (x): x is string => typeof x === "string" && WEIGHTS_FILE.test(x),
    ),
  );
  for (const v of decl.variants) {
    const loads = new Set([
      ...atomLoads,
      ...Object.values(v.lane_inputs ?? {}).filter(
        (x): x is string => typeof x === "string" && WEIGHTS_FILE.test(x),
      ),
    ]);
    for (const c of v.cells) {
      const art = c.artifact;
      if (art === undefined || art === null) continue;
      const fn = art.filename ?? (art.source_url !== undefined ? art.source_url.split("/").pop() : undefined);
      if (fn === undefined || fn === "") continue;
      if (!loads.has(fn)) {
        throw new ModelError(
          `${decl.id}/${v.id}: cell downloads '${fn}' but no lane_input loads it ` +
            `(the recipe↔weights law — a variant that swaps checkpoints overrides lane_inputs; ` +
            `a download the lane never loads is a silent wrong-weights run)`,
        );
      }
    }
  }
  // THE ACTION ADMISSION GATE (the atom vocabulary's family door,
  // stroke 0): a declared action's facts parse runs at REGISTRATION
  // over the family row AND every variant merge — the merge a run
  // actually composes (getModel splices variant over atom at read
  // time; the bf16 precedent re-spells two door-read keys). Drift
  // refuses HERE, at boot, in the door's own voice — the family's
  // parse throw, never reworded by the service.
  if (decl.actions !== undefined) {
    for (const action of decl.actions) {
      // spread of undefined yields {} — a door may face an empty
      // row only when the family omits lane_inputs entirely
      action.facts({ ...decl.lane_inputs });
      for (const v of decl.variants) {
        action.facts({ ...decl.lane_inputs, ...v.lane_inputs });
      }
    }
  }
  // SCHEMA LEG runs AFTER the predicates (wall law: the refusal
  // TEXTS are the contract — a corrupt id/genre must keep refusing
  // with the words, not a schemastery ValidationError). Strict
  // resolve THROWS on a shape miss (it never returns the error leg),
  // so the wrap rides a catch (fixed 2026-09-12: the old tuple read
  // let the ValidationError escape unwrapped).
  let strict: Record<string, unknown>;
  try {
    strict = (Schema.resolve(decl, ModelDeclSchema, {}, true) as [Record<string, unknown>, unknown])[0];
  } catch (err: unknown) {
    /* v8 ignore next -- schemastery always throws ValidationError (an
       Error); the String(err) half is the non-Error defense, never
       constructible through this call (2026-09-12). */
    const detail = err instanceof Error ? err.message : String(err);
    throw new ModelError(`model row ${String(decl.id)}: schema refused — ${detail}`);
  }
  // Drift = a CARRIED key the strict resolve stripped (subset test —
  // the schema legitimately admits keys this DECL simply doesn't set).
  const stripped = Object.keys(decl).filter((k) => !(k in strict));
  if (stripped.length > 0) {
    throw new ModelError(
      `model row ${String(decl.id)}: unknown key(s) refused (extra: forbid — the law): ${stripped.sort().join(", ")}`,
    );
  }
  // THE NESTED DRIFT LAW (2026-10-10, the DECL audit's HIGH-1): the
  // strip check above is TOP-LEVEL only, and schemastery drops
  // `strict` inside a nested property()/array resolve — so
  // `{variants:[{id:'v', parmas:['voice']}]}` booted clean, with the
  // typo MERGED and the lane's surface silently off by one field. A
  // relation word misspelled the same way (`requiers`) bound nothing
  // at all while its author believed a law held. Each nested level
  // gets the same subset test the top level has always had, using
  // the sub-schemas this module already exports.
  for (const [i, v] of decl.variants.entries()) {
    strippedKeys(v as unknown as Record<string, unknown>, VariantRowSchema, `${String(decl.id)}/variants[${String(i)}]`).forEach((k) => {
      throw new ModelError(
        `model row ${String(decl.id)} variant ${String(v.id)}: unknown key(s) refused (extra: forbid — the law): ${k}`,
      );
    });
  }
  if (decl.relations !== undefined) {
    relationDrift(decl.relations as unknown as Record<string, unknown>, `${String(decl.id)}/relations`).forEach((k) => {
      throw new ModelError(
        `model row ${String(decl.id)} relations: unknown relation word/key refused (extra: forbid — the law): ${k}`,
      );
    });
  }
  // THE VARIANT'S OWN RELATIONS GET THE SAME GATE (the DECL audit's
  // gap 5, 2026-10-10): relationDrift ran only on the FAMILY's rows,
  // so a variant row with a misspelled word (`requiers`) or a
  // misspelled member booted clean and bound NOTHING while its author
  // believed a law held — the same silence the family-level gate
  // was written to kill, one level down. Every declared row is
  // checked where it is declared.
  for (const [i, v] of decl.variants.entries()) {
    const vrel = (v as unknown as Record<string, unknown>)["relations"];
    if (vrel === undefined || vrel === null) continue;
    relationDrift(vrel as Record<string, unknown>, `${String(decl.id)}/variants[${String(i)}]/relations`).forEach((k) => {
      throw new ModelError(
        `model row ${String(decl.id)} variant ${String(v.id)} relations: unknown relation word/key refused (extra: forbid — the law): ${k}`,
      );
    });
  }
  if (decl.params !== undefined && !Array.isArray(decl.params)) {
    throw new ModelError(`${String(decl.id)}: params must be an array of field names`);
  }
}

/** The keys a nested object carries that its own schema strips (the
 *  top-level drift test, one level down). A shape the schema refuses
 *  outright throws above; this catches what it MERGES. */
function strippedKeys(
  row: Record<string, unknown>,
  schema: unknown,
  where: string,
): string[] {
  let resolved: Record<string, unknown>;
  try {
    resolved = (Schema.resolve(row, schema as never, {}, true) as [Record<string, unknown>, unknown])[0];
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ModelError(`${where}: schema refused — ${detail}`);
  }
  return Object.keys(row).filter((k) => !(k in resolved));
}

/** The same subset test across the four relation words, per level. */
/** Each relation word's ROW schema, read from the grammar's own
 *  wrapper (2026-10-10). A word added to the grammar and not to this
 *  gate made a LEGAL declaration refuse at boot; enumerating the
 *  vocabulary twice is the same bug in a different coat. The wrapper's
 *  members ARE the words; each member's resolved shape is the row
 *  schema the drift check wants. */
function relationRowSchemas(): Record<string, unknown> {
  // THE WORDS ARE READ, NOT RETYPED (2026-10-10, the four-agent
  // contract audit's Step 0). This function used to return a
  // hand-written object literal listing all six words — the second
  // enumeration of the vocabulary, under a comment claiming it read
  // the schema's own keys. A seventh word landing in the grammar
  // would pass this gate's enumeration and boot an unbound law.
  //
  // The wrapper IS a schemastery object, so it carries its own .dict
  // (the pattern the codebase already reads at service.ts's own
  // formSchemas leg and in facts.ts) — the enumeration now comes from
  // the declaration itself, and the import of the six row schemas
  // disappears with the literal.
  const dict = (ParamRelationWordsSchema as unknown as { dict?: Record<string, unknown> }).dict;
  if (dict === undefined) {
    throw new ModelError(
      "the relation grammar's own wrapper carries no dict — the word enumeration would be a second hand list; refusing",
    );
  }
  // Each word's value is `z.array(<row>)` — the ROW schema is the
  // array's element (schemastery keeps it on `.inner`, the same
  // accessor the card seat already reads for array-of-object dicts).
  return Object.fromEntries(
    Object.entries(dict).map(([word, schema]) => [
      word,
      (schema as { inner?: unknown }).inner ?? schema,
    ]),
  );
}

function relationDrift(relations: Record<string, unknown>, where: string): string[] {
  // THE RELATION WORDS, FROM THE CONTRACT'S SCHEMA (2026-10-10 — a
  // word added to the grammar and not to this gate made a legal
  // declaration refuse at boot: "unknown relation word/key refused:
  // required". The gate enumerated the vocabulary a second time; it
  // now READS the schema object's own keys, so a word cannot land in
  // one place and not the other.
  const words: Record<string, unknown> = relationRowSchemas();
  const out: string[] = [];
  for (const key of Object.keys(relations)) {
    const schema = words[key];
    if (schema === undefined) { out.push(key); continue }
    const rows = relations[key];
    if (!Array.isArray(rows)) continue;
    rows.forEach((row, i) => {
      if (row === null || typeof row !== 'object') return;
      for (const k of strippedKeys(row as Record<string, unknown>, schema, `${where}/${key}[${String(i)}]`)) {
        out.push(`${key}[${String(i)}].${k}`);
      }
      // THE EITHER_OR FLOOR, AT THE ADMISSION SEAT (the schema
      // auditor, 2026-09-28): schemastery does not enforce `.min()`
      // on a NESTED array, so the two-alternative floor the grammar
      // claims was never applied — a one-alternative (or empty)
      // either_or registered and then judged nothing at run time,
      // which is a word that means nothing. A word's shape is a
      // DECLARATION question, so it is refused HERE, where the row is
      // written, with the row's own coordinates in the voice. (The
      // judge keeps its pinned law: a malformed row judges nothing —
      // it never invents a claim. One admission per door.)
      if (key === "either_or") {
        const groups = (row as { groups?: unknown }).groups;
        const n = Array.isArray(groups) ? groups.length : 0;
        if (n < 2) {
          out.push(`${key}[${String(i)}].groups (${String(n)} alternative${n === 1 ? "" : "s"} — either_or is a choice between at least two sources; one source is the 'required' word)`);
        }
      }
    });
  }
  return out;
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

  /** Register one family. LOUD: duplicate ids refuse (the
   *  scan's one-owner-per-id law), invalid rows refuse at the gate
   *  (the metaclass's import-time validation, at registration).
   *  REVERTIBLE (the discharge stroke): returns the disposer —
   *  ctx.effect-wrapped at the plugin seam, the fiber owns the
   *  row's lifetime; dispose and the family is gone from the
   *  table (a dynamic re-port can retire a family mid-flight). */
  registerFamily(decl: ModelDecl): () => void {
    validateDecl(decl);
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
      // model's variant laid on the same flat id. FIRST SELF-ROUTE
      // WINS (the 1.7B head theft, transcript-014: customvoice and
      // voicedesign both claim 'qwen3-tts-voicedesign' — the
      // unconditional set let the SECOND claimant silently flip the
      // head to the design lane, contradicting the declaration-
      // order default law two lines up; a second head claim of the
      // SAME model is a shared-address alias, never a default flip)
      if (claim.route === decl.id) {
        const priorHead = this.routes.get(claim.route);
        if (priorHead === undefined || priorHead.modelId !== decl.id) {
          this.routes.set(claim.route, { modelId: decl.id, variantId: claim.variantId, cellRoute: claim.cellRoute });
        }
        continue;
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

  /** The MODEL registry ids (the declaration count — one per class
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

  /** The OWNING ATOM of an address (the fold read, operator
   *  2026-09-23 — qvoice across ALL qwen3-tts): a route composes
   *  through its owner, an atom owns itself. Mods board at the
   *  ATOM (the interlock: families name atoms), so every envelope
   *  plane folds an address through this read — a variant route
   *  (qwen3-tts-base) carries its family's packs exactly like the
   *  head. Unknown ids return the name as given (the callers' own
   *  filters refuse). */
  owningAtom(id: string): string {
    return this.routes.get(id)?.modelId ?? id
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
      /* v8 ignore start -- index drift is unconstructible: routes
         claim only own-table models (a foreign claim refuses at
         registration, dispose retracts both halves together), so
         both throws below never fire through the public API
         (2026-09-12). */
      if (model === undefined) {
        throw new ModelError(`route '${id}' points at unregistered model '${route.modelId}' — index drift`)
      }
      const variant = model.variants.find((v) => v.id === route.variantId)
      if (variant === undefined) {
        throw new ModelError(`route '${id}' points at unknown variant '${route.variantId}' of '${model.id}' — index drift`)
      }
      /* v8 ignore stop */
      // a variant-level address resolves its DEFAULT CELL (the one
      // routing to the address, else the variant's first cell) —
      // the quant's source/defaults compose the address view.
      // (The undefined half: a cellRoute claim always names its own
      // cell — the index builds the claim FROM the cell's route —
      // so the miss half only fires for variant addresses, which
      // fall back to the head cell. Unreachable defense,
      // v8-ignored 2026-09-12.)
      const cell = variant.cells.find((c) => c.route === id) ?? (route.cellRoute
        ? /* v8 ignore next */ undefined
        : variant.cells[0])
      // attach override keys ONLY when a layer declares them — a
      // spread of absent layers would mint undefined-valued own
      // keys (no drift vs the served JSON round-trip)
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
   *  the matrix law). */
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
   *  contract). The ENGINE_TRUTH triple ("mode", "variant",
   *  "model") is validate.ts's export — the compose's own
   *  declaration; the cascade never touches it. (The comment
   *  drifted from the SSOT it described until the schema audit
   *  named it: two words where the export carries three.) */
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
      // never renders ""). ||, not ??: an explicitly-passed
      // unrouted variant carries route "" (fixed 2026-09-12 — the
      // old ?? let "" through, breaking the contract above).
      route: (c !== null && c.route ? c.route : v.route) || decl.id,
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

  checkModelPathPresent(modelPath: string, repoRoot: string = resolveRepoRoot()): string | null {
    return checkModelPathPresent(modelPath, repoRoot);
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

/** THE MOD INTERLOCK (the correction stroke 2026-09-08): the
 *  flavor↔DECL.mods satisfaction gate — the paper's §3.2.2 law, a
 *  component ACTIVATES ONLY AT A SATISFYING STATE. Pure over the
 *  registration sets (extracted 2026-09-12 for unit teeth — the
 *  boot feeds it the live sets below). Both directions refuse:
 *    (a) DECL.mods entry naming neither a registered pack nor a
 *        registered verb = a DEAD BOARDING (drift, the amnesty is
 *        over);
 *    (b) a flavor/verb registration whose family does not board
 *        that pack = an UNDECLARED MUTATION (the flavor claims a
 *        model that never declared it).
 *  Plus the satisfaction law's third edge (a declared pack
 *  boarding with no flavor for THIS family) and fourth edge (gate
 *  (d), the pack fate — verbs skip: their fate is the
 *  family-scoped mount). */
export function assertModInterlock(
  decls: readonly ModelDecl[],
  packs: ReadonlySet<string>,
  verbs: ReadonlySet<string>,
  flavorsOf: readonly { pack: string; families: readonly string[] }[],
  verbRegs: readonly { id: string; families: readonly string[] }[],
  packFate: Record<string, string> | null,
): void {
  // THE MARRIAGE GRAMMAR (#36): DECL.mods entries are pack names or
  // {pack, marries} objects — the boarding test reads the pack name
  // either way (one normalizer, never two truths).
  const boardedPacks = (mods: ModelDecl['mods']): string[] =>
    (mods ?? []).map((m) => (typeof m === 'string' ? m : m.pack))
  for (const flavor of flavorsOf) {
    for (const fam of flavor.families) {
      const d = decls.find((x) => x.id === fam);
      if (d === undefined) {
        throw new ModelError(`no registered model '${fam}' (routes compose; the registry holds atoms)`);
      }
      if (!boardedPacks(d.mods).includes(flavor.pack)) {
        throw new ModelError(
          `model ${fam}: a '${flavor.pack}' flavor is registered for it but DECL.mods does not board the pack — an undeclared mutation (the model declares its mods, nothing else)`,
        );
      }
    }
  }
  // (b)-for-verbs: a verb naming a family that never boarded it
  // is the same undeclared mutation (the verb's families field
  // is its claim; the DECL is the model's answer — both refuse).
  for (const verb of verbRegs) {
    for (const fam of verb.families) {
      const d = decls.find((x) => x.id === fam);
      if (d === undefined) {
        throw new ModelError(`no registered model '${fam}' (routes compose; the registry holds atoms)`);
      }
      if (!boardedPacks(d.mods).includes(verb.id)) {
        throw new ModelError(
          `model ${fam}: verb '${verb.id}' claims it but DECL.mods does not board the verb — an undeclared mutation (the model declares its mods, nothing else)`,
        );
      }
    }
  }
  for (const d of decls) {
    for (const pack of boardedPacks(d.mods)) {
      if (packs.has(pack) || verbs.has(pack)) continue;
      throw new ModelError(
        `model ${d.id}: DECL.mods '${pack}' names no registered pack or verb — a dead boarding is drift, not a skip (the amnesty is over)`,
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
    // lane to carry it. Verbs skip: their fate is the
    // family-scoped mount, pinned above.
    for (const entry of boardedPacks(d.mods)) {
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

/** §3.2.2 SATISFACTION (pure half): every registered atom serves
 *  an address. The only trigger is a routeless row (variants: []
 *  claims nothing) — the live registry never carries one, so the
 *  boot's call above only ever passes silent; the refusal arm is
 *  unit-pinned here, never wall-reachable. */
export function assertAddressesServe(modelIds: readonly string[], registryIds: readonly string[]): void {
  for (const id of registryIds) {
    if (!modelIds.includes(id)) {
      throw new ModelError(`model '${id}' registers but serves no address — every atom resolves through its ladder (add a variant/cell route or a resolving default)`)
    }
  }
}
/** THE FACTS-CALLER CHECK (the compose contract: facts.models[id]
 *  .card must be one of the model's caller cards — the card
 *  selects atoms; the facts may not name a caller the cards do
 *  not). Pure over the boot's assembled maps (extracted
 *  2026-09-12 for unit teeth). */
export function assertFactsCallers(
  decls: readonly ModelDecl[],
  factsModels: Record<string, { card?: string }>,
  boardings: ReadonlyMap<string, readonly string[]>,
): void {
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
async function validateBootContracts(svc: ModelsService): Promise<void> {
  const decls = svc.allDecls();
  let domains: import("./validate.ts").CardDomains | null = null;
  const cardAdmits = new Map<string, readonly string[]>()
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
    const guard = await import("@melite/comfyui-card-kit/guard");
    packFate = guard.PACK_FATE as Record<string, string>;
    const { fieldDomains } = await import("./validate.ts");
    // built as mutable Maps, read as the CardDomains readonly view
    const table = new Map<string, ReturnType<typeof fieldDomains>>();
    for (const id of cardSvc.cardIds()) {
      const def = cardSvc.getCardDef(id);
      const dict = ((def?.schemaCarrier ?? def?.schema) as { dict?: Record<string, unknown> } | undefined)?.dict;
      /* v8 ignore next -- every live card carries .dict (the card
         wall refuses carrier-less contracts), so the skip half
         never fires in a healthy boot; the check degrades, never
         poisons (2026-09-12). */
      if (dict !== undefined) table.set(id, fieldDomains(dict as never));
    }
    domains = table;
    // THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
    // only form the relation exists in — models declare nothing
    // about their callers)
    for (const id of cardSvc.cardIds()) {
      const def = cardSvc.getCardDef(id);
      /* v8 ignore next -- ids and defs read from the same service
         handle, so the miss half never fires (defense, 2026-09-12). */
      if (def !== undefined) boardings.set(id, def.boarded);
      // THE ADMISSION LAW: the same def carries its admitted
      // route-stamped keys — the validator honors them (2026-09-22)
      const admits = (def as { admits?: readonly string[] } | undefined)?.admits;
      if (def !== undefined && admits !== undefined) cardAdmits.set(id, admits);
    }
    // the rows assemble from the registry + frozen card slices
    // (facts.ts derivation, same dynamic seam as the card plane:
    // static would cycle service→facts→models→service against
    // the top-level boot) — the boot reads the same contract
    // compose reads, never a second file spelling.
    const { loadFacts } = await import("@melite/comfyui-card-kit/facts");
    factsModels = loadFacts(resolveRepoRoot() + "/packages/engines/comfyui-cordis/data/model-facts.json", {
      getModel: (id: string) => svc.getModel(id),
      registryIds: () => svc.registryIds(),
      registryModel: (id: string) => svc.registryModel(id),
    }).models;
  /* v8 ignore start -- the cardless-consumer degrade: this catch
     fires only when the card plane fails to import (a consumer
     shipping models without cards). In this repo the plane always
     ships, the imports always succeed, and the walls pin the full
     path — unconstructible here (2026-09-12). */
  } catch (err) {
    // the card plane is a sibling that may not ship with every
    // consumer — the boot continues, the check degrades to a
    // logged skip (walls pin the full path)
    console.warn("[models] card-plane cross-validation skipped:", (err as Error).message);
  }
  /* v8 ignore stop */
  // §3.2.2 SATISFACTION GATE: every registered atom serves an
  // address — an unaddressable model refuses the boot (named,
  // loud; never a silent hole in the serving plane). Pure below
  // (extracted 2026-09-12 for unit teeth — a routeless variants:[]
  // row is the only trigger, and the live registry never carries
  // one).
  assertAddressesServe(svc.modelIds(), svc.registryIds());
  /* v8 ignore next -- the degrade's other half: domains is null
     only when the catch above fired (unconstructible here —
     see the range note). */
  if (domains !== null) {
    const { validateRegistryAgainstCards, ENGINE_TRUTH } = await import("./validate.ts");
    // ENGINE_TRUTH ("mode", "variant", "model"): the compose's own
    // declaration keys, never card fields. "model" is the ROUTE
    // RE-POINT token (resolver_defaults.model, the krea-2-raw
    // precedent — a variant pick resolves server-side); a card
    // boarding a route address (qvoice across ALL qwen3-tts,
    // operator 2026-09-23) walks that view's defaults and the
    // token must skip like "variant" does.
    validateRegistryAgainstCards(
      decls, domains, ENGINE_TRUTH, boardings,
      new Set(svc.modelIds()),
      new Map(svc.modelIds().map((id): [string, ModelDecl] => [id, svc.getModel(id)])),
      cardAdmits,
    );
  }
  // ── THE MOD INTERLOCK + THE FACTS-CALLER CHECK (pure halves
  //  above, unit-pinned): the boot feeds the live sets, never a
  //  second spelling of the refusal texts. The null halves ride
  //  the same degrade (cardSvc/factsModels null only when the
  //  catch above fired — unconstructible here).
  /* v8 ignore next -- see above. */
  if (cardSvc !== null) {
    assertModInterlock(
      decls,
      new Set(cardSvc.packNames()),
      new Set(cardSvc.verbIds()),
      cardSvc.flavorRegistrations(),
      cardSvc.verbRegistrations(),
      packFate,
    );
  }
  /* v8 ignore next -- see above (factsModels null / empty boardings
     only on the degrade path). */
  if (factsModels !== null && boardings.size > 0) {
    assertFactsCallers(decls, factsModels, boardings);
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
    /* v8 ignore next -- service registration is synchronous and
       immediate (service.ts:11); undefined is the impossible half
       (2026-09-12). */
    if (svc === undefined) {
      throw new ModelError("models service failed to register at boot");
    }
    /* v8 ignore next -- the transactional gate: every plugin
       registers exactly one family through its effect (a silent
       family breaks its own wall first); the mismatch half never
       fires in a green tree (2026-09-12). */
    if (svc.familyCount() !== FAMILY_PLUGINS.length) {
      throw new ModelError(
        `boot registered ${svc.familyCount()} families but ${FAMILY_PLUGINS.length} plugins loaded — a family registered nothing (the transactional gate)`,
      );
    }
    await validateBootContracts(svc);
    booted = svc;
    return booted;
  /* v8 ignore start -- the transactional discharge: fires only
     when a family refuses or the contracts refuse (a corrupt
     registry). The walls + the boot test pin the healthy path;
     a corrupt-family boot is unconstructible without breaking
     the tree's own gates first (2026-09-12). */
  } catch (err) {
    await ctx.fiber.dispose();
    booted = null;
    throw err;
  }
  /* v8 ignore stop */
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
