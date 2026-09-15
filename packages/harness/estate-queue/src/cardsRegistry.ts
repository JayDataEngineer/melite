// cardsRegistry.ts — the card registry as a HOST Cordis service
// (REBUILD-9, gateway kill): the dead flowsCard.ts second-move
// verbatim (the registry, the resolve/prepare/overlay pipeline, the
// in-process compose — py line cites riding along). The runs
// plane's {model:} arms (start phase-1/phase-2 + validate) ride
// this service; the estate row mounts it before the runs registry.
//
// PATHS: facts + object_info ride the ENGINE package's data dir
// (the Decl x Facts unification — same as the door). The service
// name stays "cardRegistry" (ctx.cardRegistry).
// doors/flowsCard.ts — the {model:} card composer arm (TS-native card
// lane, 2026-09-08).
//
// WHAT THIS PORTS (line-cited against python/gateway.py + the cordis
// plane): the card-run derivation resolve_card_model (598-682) +
// submit's phase-2 arm (1273-1305) + the rim wrap (infra/python/plugins.py
// card_hooks.compose 525-600), with the survey's verdict
// (docs/design/card-lane-port-survey-2026-09-08.md §0 + §5): import
// @melite/comfyui IN-PROCESS — no template SSOT, no subprocess, no
// class-tree port. The graph truth already lives in TS
// (packages/engines/comfyui/src — 19 cards, golden-pinned);
// this arm only changes the CALL PATH (subprocess shell -> import).
//
// THE CHAIN (py order, mirrored step-for-step):
//   1. envelope/draft/strict/exclusivity — OWNED by flowsRun.ts
//      (handleFlowsStart, already ported); this arm starts past it.
//   2. model-id legality (validate-door voice, flowsValidate.ts
//      modelArm) + existence (resolve_model's voice: "no model
//      unit ...", infra/python/plugins.py:394) + the non-cordis arm
//      refusal (python schema arm — unported half, code-identical).
//   3. artifact-ref sweep (py 610-630, infra/python/artifact_refs.py
//      find_dangling_refs semantics — every /v1/assets/... URL must
//      exist on served mounts BEFORE compose).
//   4. route-lens stamp overlay (py _route_stamp_overlay 705-751):
//      family defaults + the SELECTED variant's resolver_defaults,
//      absent-keys-only, filtered to the card field surface
//      (schema keys + admits). Facts carry every input
//      (model-facts.json variants[].resolver_defaults).
//   5. R1 variant/quant wire contract (survey §5.3 + §6 R1): body
//      `variant`/`quant` keys select the matrix cell when stated
//      (matched against facts variant id/route + cell quant);
//      unstated coordinates fall to the FIRST non-Recipe variant /
//      first cell (Model.resolve, grammar.py:1102-1121). Route-id-
//      as-model is preserved (resolveCardFamily). The keys are
//      CONSUMED (never reach compose — no card declares them).
//   6. envelope lift (card_compose_body 363-372: body minus
//      CARD_ENVELOPE_KEYS restaged as {params}) + the nested-stanza
//      unwrap (cli.ts:82-91 — a `params` dict key IS the stanza).
//   7. $spell phase-1 rule (compose/__init__.py spell block): a
//      phaseless call (run_id "") whose spell params carry $ values
//      composes NO graph.
//   8. admission-contract gate (cli.ts:102-116 verbatim voice).
//   9. in-process compose: ONE Context + ComfyUIService +
//      auto-loaded cards (the cli.ts:59-63 loop), setFacts +
//      setObjectInfo (snapshot: packages/engines/comfyui/data/
//      object_info.json — R3: absent refuses CLOSED, never proceeds
//      unauthenticated), ctx.comfyui.compose(card, family, params,
//      runId) — the same call cli.ts:118 makes. ComposeRefusal.code
//      maps to the refusal detail.
//  10. stage-row wrap (the rim, plugins.py:566-588): {id: skeleton
//      (the card definition, fallback: the posted mid), engine comfyui,
//      params: {workflow: graph}} — submitted through the EXISTING
//      engine layer (engine/comfyui.ts executeFlow) exactly like
//      flow_inline runs (L3 routing, upload walk, harvest,
//      interrupt, timeout all reused untouched).
//
// REFUSAL VOICES: every card-lane failure carries
// `card_compose phase <N>: <detail>` (the py phase framing; the
// subprocess-era `rc=%d (%s.%s)` mimicry retired 2026-09-09 with
// the execFileSync itself), where <detail> is the CLI-line shape
// (`<code>: <msg>` for ComposeRefusal; `compose-door: ...` for the
// admission die). The
// (comfyui.comfyui) prefix rides the ENGINE_TABLE derivation
// (plugin dir name + engine type, as scan_engines reports them —
// the flowsValidate.ts header pins the same table). Pre-compose
// request failures (illegal id, no unit, dangling ref) keep their
// existing validate-door voices (code invalid_request) so
// start+validate agree field-for-field.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
// CROSS-COPY LAW (the estate's documented topology): the engine
// package resolves the REGISTRY cordis instance; this package's
// "@deepseek-ai/cordis" is the vendor instance. The service TYPE
// and the compose-rim Context CLASS come from the engine's own
// copy (the deep path — the walls' established pattern), so the
// engine's ComfyUIService mounts on the instance it was built for.
/** The engine's OWN cordis Context — re-exported by the engine
 *  package (the registry-keyed instance ComfyUIService mounts on),
 *  imported through the engine's public surface like every other
 *  engine dep. No deep path, no runtime-only dodge. */
import { EngineContext } from "@melite/comfyui-cordis";
import { bootModels, buildCatalog, checkModelPresent, ComfyUIService, ComposeRefusal, composeCards, composeModPlane, getModel, liveScanOrder, loadCardDefs, loadEndpointConfig, loadFacts, modelIds, registryIds, registryModel, theService } from "@melite/comfyui-cordis";
import type { CardDefinition, FactsFile, FactsReads } from "@melite/comfyui-cordis";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { DOOR_KEYS } from "./runsGates.ts";
import { FLOW_ID_RE } from "./runsGates.ts";
import { getRegistryFlow } from "./flowsData.ts";
import { pyReprStr, resolveRepoRoot } from "@melite/comfyui-cordis";
/** The card-envelope keys (gateway.py:360 CARD_ENVELOPE_KEYS =
 *  DOOR_KEYS + draft/test/service): select the graph, never ride it. */
export const CARD_ENVELOPE_KEYS: readonly string[] = [
  ...DOOR_KEYS,
  "draft_id",
  "test",
  "service",
];

/** The card-lane refusal: status + the py _refusal envelope shape
 *  (error, code, then loc/expected/got) — the door maps it through
 *  the local refusal() + serializePy path (byte parity). */
export class CardArmError extends Error {
  readonly status: number;
  readonly code: string;
  readonly loc?: string;
  readonly expected?: string;
  readonly got?: string;
  constructor(
    status: number,
    message: string,
    code: string,
    loc?: string,
    expected?: string,
    got?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    if (loc !== undefined) this.loc = loc;
    if (expected !== undefined) this.expected = expected;
    if (got !== undefined) this.got = got;
  }
}

/** Phase-N compose failure (py _compose_refusal 191-210 over the rim
 *  546-551, the subprocess framing retired 2026-09-09): `card_compose phase <N>
 *  (comfyui.comfyui): <detail>`. */
function phaseRefusal(phase: string, detail: string): CardArmError {
  return new CardArmError(
    400,
    "card_compose phase " + phase + ": " + detail,
    "card_compose",
  );
}


// ── frozen data paths (facts + pin snapshot) ───────────────────────
// (Stroke 2a, DSH-AS-LANGUAGE LAW: the module-level caches that used
// to live here — factsCache/declsCache/defsCache/oiCache/oiPathCache/
// modelMidsCache — are CardRegistryService instance state below. No
// module-level mutable singleton remains in this file.)

export interface VariantCellRow {
  readonly quant: string;
  readonly route: string;
}

export interface VariantRow {
  readonly id: string;
  readonly group: string;
  readonly route: string;
  readonly resolver_defaults: Record<string, unknown>;
  readonly cells: VariantCellRow[];
}

export interface ModelFactsRow {
  readonly card: string;
  readonly defaults: Record<string, unknown>;
  readonly variants: VariantRow[];
  /** The assembly-studio declaration (hand-owned model-facts.json
   *  carries it; the projection unions its writes into admits). */
  readonly studio?: { readonly writes?: readonly unknown[] };
}

export interface CardDeclRow {
  readonly skeleton: string;
  readonly boarded: readonly string[];
  readonly schemaNames: readonly string[];
  readonly admits: readonly string[];
  readonly spells: readonly string[];
}

function factsPath(): string {
  // Merged 2026-09-08 (reversed: the models plane folds into the
  // cordis package): the compose plane lives in
  // packages/engines/comfyui-cordis/src, its card-owned fact slices
  // in packages/engines/comfyui-cordis/data (Decl x Facts
  // unification — loadFacts derives model-owned rows from the
  // registry at load).
  return join(
    resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
  );
}

function objectInfoPath(): string {
  return join(resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "object_info.json");
}

// ── the decl projection (pure: defs + facts in, rows out) ─────────
// (Was loadCardDecls' body; the cache it fed is service state now.)
function deriveDecls(
  defs: Map<string, CardDefinition>,
  facts: Record<string, ModelFactsRow>,
): Record<string, CardDeclRow> {
  const out: Record<string, CardDeclRow> = {};
  for (const [id, def] of defs) {
    // The emitter's carrier line (toolsEmit.ts mirror): normal cards
    // carry the Schemastery object as .schema; wrapped cards (h3)
    // project .schemaCarrier. schemaNames = the knob surface.
    // Schemastery schemas are CALLABLE (def types .schema as a
    // function) — typeof is 'function', not 'object'.
    const carrier: unknown =
      (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema;
    // (every real carrier projects .dict — the emitter's contract.)
    const dict: Record<string, unknown> =
      (typeof carrier === "object" || typeof carrier === "function") && carrier !== null
        ? ((carrier as { dict?: unknown }).dict as Record<string, unknown>)
        : /* v8 ignore next */ {};
    const names: string[] = Object.keys(dict);
    // The admits rule (the retired exporter's gathering, inlined —
    // purge S-decls: the exporter is deleted, this projection is the
    // rule's home): admits = class-attr extras (def.admits) ∪ the
    // families' studio writes (trailing-* ride verbatim — the
    // admission gate matches them as prefixes). Schema knobs are
    // NOT admits members — the gate checks knobs separately.
    const seen = new Set<string>();
    const admits: string[] = [];
    const take = (v: unknown): void => {
      if (typeof v === "string" && !seen.has(v)) {
        seen.add(v);
        admits.push(v);
      }
    };
    for (const a of def.admits ?? []) take(a);
    for (const fam of def.boarded) {
      const writes: unknown = facts[fam]?.studio?.writes;
      if (Array.isArray(writes)) for (const w of writes) take(w);
    }
    out[id] = {
      skeleton: def.skeleton,
      boarded: [...def.boarded],
      schemaNames: names,
      admits,
      spells: [...(def.spells ?? [])],
    };
  }
  return out;
}

// ── the CardRegistry as a Cordis Service (stroke 2a,
 // DSH-AS-LANGUAGE LAW) ────────────────────────────────────────────
 // SERVICE NAME: 'cardRegistry' (ctx.cardRegistry) — the short
 // camelCase service key per the sibling-stroke precedent and the
 // sibling stroke 2b ('runs'). Defined where the registry lives
 // (this file, the cards side) for the same cycle reason 2b records:
 // doors import this module; defining the service anywhere doorside
 // would force this file to import it back.
 //
 // OWNS: the primed defs map, the facts/decls projections, the
 // mtime-keyed object_info pin snapshot, the catalog mids set, and
 // every registry-derived operation (resolve/prepare/overlay/
 // phase-1/phase-2). The pure helpers below (select/stamp/lift/
 // sweep/pyStrMid) stay module functions — they take explicit args
 // and hold no state. Every door with registry reads injects
 // 'cardRegistry' and uses ctx.cardRegistry; request-path helpers
 // take an explicit service param (no module handle, no ACTIVE
 // fallback — nothing reaches the cards plane without a Context
 // except the boot sites, which route through
 // ctx.get('cardRegistry') — see main.ts).
// ── THE LANE PRESENCE GATE (2026-09-13, the one-pattern law) ───────
// The operator's alarm: "If Img Gen works and Img Edit doesn't,
// that's really bad — that means we are handrolling and not
// enforcing one pattern." It was true. Every family DECLARES its
// lane files (lane_inputs) and the store check existed
// (checkModelPresent) but nothing in the run path consulted it —
// Img Gen worked because its weights happened to be on disk, Img
// Edit died at ComfyUI validation with the reason swallowed by the
// UI. Presence is now ENFORCED at phase-1 for EVERY card run, one
// gate, one voice — the refusal names the family, the lane key,
// the missing file, the folders checked, and the provision URL
// when the family declares one (the fetch hint).

/** lane_inputs keys that name FILES the stock loaders read, mapped
 * to their ComfyUI folder sets (text_encoders folds legacy clip;
 * unet folds diffusion_models). Keys absent here are declaration-
 * only — model_path/texture_vae ride pack-specific loaders whose
 * folders the estate cannot name without inventing a mapping. */
const LANE_FOLDERS: Readonly<Record<string, readonly string[]>> = {
  text_encoder: ["text_encoders", "clip"],
  vae: ["vae"],
  unet: ["unet", "diffusion_models"],
  unet_unconditional: ["unet", "diffusion_models"],
  checkpoint: ["checkpoints"],
  clip_vision: ["clip_vision"],
  background_removal: ["background_removal"],
};

/** The endpoint's pack categories (extra_model_folders keys) — the
 * custom-node weight homes (SEEDVR2, anny, …). A lane file may
 * legally live in a pack the stock map doesn't name (seedvr2's
 * unet/vae ride the SEEDVR2 pack), so every key's folder set unions
 * these. Same config findModelPresent's mount leg reads — one
 * truth, no second mapping. Unparseable/absent config = no packs
 * (the stock sets stand alone; the gate errs loud, never blocks on
 * a config read). */
function lanePackFolders(): readonly string[] {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return [];
  }
  const extras: unknown = cfg["extra_model_folders"];
  if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
    return [];
  }
  return Object.keys(extras as Record<string, unknown>);
}

/** THE GATE (pure over the registry + the store probes): null when
 * every declared lane file stands on disk; else the CardArmError a
 * card start refuses with.getModel's own unknown-family throw is
 * NOT swallowed here — phase-1's resolution gates own that voice
 * (this runs after prepareCardParams resolved the family).
 *
 * HERMETIC DEFERRAL (the same rule loadEndpointConfig serves, one
 * seam two consumers): a sandboxed test world with no explicit
 * endpoint fixture has no store to enforce against — the gate
 * stands down and ComfyUI's own validation (UI-surfaced since
 * 2026-09-13) remains the backstop. A fixture endpoint env always
 * re-arms the gate (the gate specs drive it that way). */
function lanePresenceRefusal(fam: string): CardArmError | null {
  const sandbox: string = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  if (sandbox !== "" && envPath === "") return null;
  const decl = getModel(fam);
  const li = (decl.lane_inputs ?? {}) as Record<string, unknown>;
  const packs = lanePackFolders();
  for (const [key, stock] of Object.entries(LANE_FOLDERS)) {
    const raw: unknown = li[key];
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (name === "") continue;
    const folders: readonly string[] = [
      ...stock,
      ...packs.filter((p) => !stock.includes(p)),
    ];
    const hit = folders.some(
      (folder) => checkModelPresent("models/" + folder, name) !== null,
    );
    if (hit) continue;
    const prov = (decl.provisions ?? []).find((p) => p.name === name);
    throw new CardArmError(
      400,
      "lane presence: family '" + fam + "' declares " + key + " '" + name +
        "' but no store copy exists (folders checked: " + folders.join(", ") + ")" +
        (prov !== undefined ? " — fetch it: " + prov.url : ""),
      "lane_input_missing",
    );
  }
  return null;
}

export class CardRegistryService extends Service {
  /** The primed card definitions (null until prime()). */
  private defs: Map<string, CardDefinition> | null = null;
  /** The frozen model facts (lazy — strict load, throws LOUD). */
  private facts: Record<string, ModelFactsRow> | null = null;
  /** Registry reads for the row derivation (primed with the models boot). */
  private reads: FactsReads | null = null;
  /** The decl projection (lazy — derived from defs + facts). */
  private decls: Record<string, CardDeclRow> | null = null;
  /** The pin snapshot (mtime-keyed). */
  private oi: { mtimeMs: number; doc: Record<string, unknown> } | null = null;
  private oiPath: string | null = null;
  /** The catalog existence set (lazy — strict load, throws LOUD). */
  private mids: Set<string> | null = null;

  constructor(ctx: Context) {
    super(ctx, "cardRegistry");
  }

  /** Prime the registry (service init — replaces the retired
   *  primeCardRegistry()): the registry loads async (dynamic
   *  card-module imports) but the validate/disclosure rims are sync,
   *  so every boot primes and the request path projects
   *  synchronously. Safe to call multiple times (unconditional
   *  reload — mirrors the old both-boot-sites prime); re-prime
   *  drops the defs-derived decls (facts/mids are disk-derived and
   *  stay). The provider's apply primes, and both main.ts boot
   *  sites re-prime belt-and-braces. */
  async prime(): Promise<void> {
    this.defs = await loadCardDefs();
    this.decls = null;
    // the models boot feeds the row derivation (facts.ts renders
    // rows through these reads — one spelling, no frozen matrix).
    await bootModels();
    this.reads = { getModel, registryIds, registryModel };
    this.facts = null;
    // ARM THE SINGLETON for the presence reads (stroke 18): the
    // compose path builds a FRESH service per run (armed with the
    // snapshot below), but the serving surfaces (the spec's packs
    // block, the load bundle's pack hints) read theService() —
    // without this arm every pack marks unknown (null) on a healthy
    // lane. Same snapshot + same facts file the compose gate reads:
    // one truth, two seats, one spelling of the check.
    try {
      const svc = theService();
      svc.setObjectInfo(this.objectInfo());
      svc.setFacts(loadFacts(factsPath(), this.readsSync()));
    } catch {
      // the singleton is not resolvable in this context — the
      // serving surfaces degrade to unknown marks (never a throw on
      // the prime path; compose still arms its own fresh service)
    }
  }

  /** Test seam: drop all registry state (walls boot fresh processes;
   *  belt-and-braces for in-process reuse — the RunsService parity). */
  resetForTests(): void {
    this.defs = null;
    this.facts = null;
    this.reads = null;
    this.decls = null;
    this.oi = null;
    this.oiPath = null;
    this.mids = null;
  }

  /** Sync read of the primed registry (the disclosure projection
   *  serves from the registry, and the disclosure doors are sync —
   *  unprimed access throws LOUD, never a fallback). */
  defsSync(): Map<string, CardDefinition> {
    if (this.defs === null) {
      throw new Error(
        "[card_registry] unprimed: boot must await the estate-card-registry " +
          "provider (or ctx.cardRegistry.prime()) before the " +
          "disclosure rim serves (the estate composition's " +
          "estate-card-registry row primes; boot rigs settle-poll " +
          "for the seats)",
      );
    }
    return this.defs;
  }

  /** The frozen model facts (strict — a missing file throws LOUD;
   *  the validate door keeps its absent-file degrade by catching
   *  this at its own call site). */
  /** Sync read of the primed registry reads (unprimed access throws LOUD). */
  readsSync(): FactsReads {
    if (this.reads === null) {
      throw new Error(
        "[card_registry] unprimed: boot must await the estate-card-registry " +
          "provider (or ctx.cardRegistry.prime()) before rows derive " +
          "(the models boot feeds facts.ts through these reads)",
      );
    }
    return this.reads;
  }

  modelFacts(): Record<string, ModelFactsRow> {
    if (this.facts !== null) return this.facts;
    // rows assemble from the registry + frozen card slices (the
    // derivation is the single matrix — no frozen spelling).
    const doc: FactsFile = loadFacts(factsPath(), this.readsSync());
    this.facts = doc.models as unknown as Record<string, ModelFactsRow>;
    return this.facts;
  }

  /** The decl projection — derived from defs + the strict facts, or
   *  from defs + caller-supplied facts (the validate door's
   *  degraded read; derived fresh, never cached over foreign facts). */
  cardDecls(facts?: Record<string, ModelFactsRow>): Record<string, CardDeclRow> {
    if (facts !== undefined) return deriveDecls(this.defsSync(), facts);
    if (this.decls !== null) return this.decls;
    const derived: Record<string, CardDeclRow> = deriveDecls(
      this.defsSync(),
      this.modelFacts(),
    );
    this.decls = derived;
    return this.decls;
  }

  /** The pin snapshot (R3 — mtime-keyed: a re-pin must never serve a
   *  stale autofill map). null = absent on disk. */
  objectInfo(): Record<string, unknown> | null {
    const path: string = objectInfoPath();
    let mtimeMs = 0;
    try {
      mtimeMs = statSync(path).mtimeMs;
    } catch {
      this.oi = null;
      this.oiPath = path;
      return null;
    }
    if (this.oi !== null && this.oiPath === path && this.oi.mtimeMs === mtimeMs) {
      return this.oi.doc;
    }
    try {
      const doc: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (typeof doc !== "object" || doc === null || Array.isArray(doc)) return null;
      this.oi = { mtimeMs, doc: doc as Record<string, unknown> };
      this.oiPath = path;
      return this.oi.doc;
    } catch {
      return null;
    }
  }

  /** resolve_model's existence half — the LIVE offer (the same
   *  served key set the catalog door answers: buildCatalog's served
   *  models in scan order). It replaces the models/<genre>/<mid>/
   *  model.py fs scan (estate-python purge deleted every model.py —
   *  the scan resolved the empty set and every {model:} compose
   *  refused) and the frozen-catalog re-home (2026-09-08 — the blob
   *  is deleted 2026-09-10). A build throw resolves empty (the
   *  validate door's degraded read, same as before). */
  modelMids(): Set<string> {
    if (this.mids !== null) return this.mids;
    let ids: string[];
    try {
      ids = liveScanOrder();
    } catch {
      /* v8 ignore start -- liveScanOrder reads the booted class tree
         (never throws in practice): the degrade never fires (2026-09-12) */
      ids = [];
      /* v8 ignore stop */
    }
    this.mids = new Set(ids);
    return this.mids;
  }

  /** The owning family for mid: mid itself, or the facts model whose
   *  variant/cell route owns mid (mirrors _route_family;
   *  route-id-as-model is preserved — the graph is addressed by the
   *  family). Reads the strict facts unless the caller passes its
   *  own (the validate door's degraded read). */
  resolveCardFamily(mid: string, facts?: Record<string, ModelFactsRow>): string {
    const table: Record<string, ModelFactsRow> = facts ?? this.modelFacts();
    if (mid in table) return mid;
    // (every real route is also a catalog mid — the mid/family/mids
    // hits above always win. Census 2026-09-12: zero routes outside
    // mids — the lens arms never fire through this path.)
    for (const [fam, row] of Object.entries(table)) {
      for (const v of row.variants ?? []) {
        /* v8 ignore next */
        if (v.route === mid) return fam;
        for (const c of v.cells ?? []) {
          /* v8 ignore next */
          if (c.route === mid) return fam;
        }
      }
    }
    return mid;
  }

  /** Resolve + sweep + select + overlay + lift (steps 2-6):
   *  everything before compose. Throws CardArmError (the door maps
   *  it to the refusal envelope). `phase` stamps the phase-N voice
   *  on R1 selection refusals ("1" for validate/phase-1). Order
   *  mirrors resolve_card_model + the validate modelArm: artifact
   *  sweep FIRST (fail fast — a sloppy compose never runs), then
   *  legality, existence, the non-cordis arm check, selection,
   *  overlay, lift. */
  prepareCardParams(
    body: Record<string, unknown>,
    mid: string,
    phase: string,
  ): PreparedCard {
    const dangling = findCardDangling(body);
    if (dangling !== null) {
      const [location, ref, why] = dangling;
      throw new CardArmError(
        400,
        "dangling artifact ref at " + pyReprStr(location) + ": " + ref + " (" + why + ")",
        "invalid_request",
      );
    }
    if (!FLOW_ID_RE.test(mid)) {
      throw new CardArmError(
        400,
        "model id " + pyReprStr(mid) + " is not a legal identifier",
        "invalid_request",
      );
    }
    const facts: Record<string, ModelFactsRow> = this.modelFacts();
    const resolves: boolean =
      mid in facts || this.resolveCardFamily(mid, facts) in facts || this.modelMids().has(mid);
    if (!resolves) {
      throw new CardArmError(
        400,
        "no model unit for model: " + mid + " (no .catalog.models row " + mid +
          " in the frozen discovery catalog and no family declares route " + mid +
          " in its variants' cells — checked the class tree's _routes map)",
        "invalid_request",
      );
    }
    const fam: string = this.resolveCardFamily(mid, facts);
    const famRow: ModelFactsRow | undefined = facts[fam];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (famRow === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": model " + pyReprStr(mid) +
          " composes outside the cordis plane (python schema arm — unported half in this stroke)",
        "card_compose",
      );
    }
    const decls: Record<string, CardDeclRow> = this.cardDecls(facts);
    const decl: CardDeclRow | undefined = decls[famRow.card];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (decl === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown card " + pyReprStr(famRow.card) +
          " (no registered card definition for the card model " + pyReprStr(mid) + " names)",
        "card_compose",
      );
    }
    const sel: VariantSelection = selectCardVariant(mid, famRow, body, phase);
    const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel);
    return {
      mid,
      fam,
      card: famRow.card,
      skeleton: decl.skeleton !== "" ? decl.skeleton : /* v8 ignore next -- every real decl carries a skeleton (probe 2026-09-12) */ mid,
      decl,
      params: liftCardParams(stamped),
    };
  }

  /** THE RESOLVED SERVE (hour-26 stroke 15, the 1:1 run law): the
   *  map the NEXT RUN composes from a stage row — prepareCardParams'
   *  stamped + lifted body (variant resolver_defaults + family
   *  defaults injected for absent keys, surface-filtered, envelope
   *  keys + variant/quant consumed), the exact input the {model:}
   *  door hands compose. The drafts serve carries it on the stage
   *  row; the form renders it UNDER the user layer — ONE resolver,
   *  served to the visual, never a second client-side truth. Null
   *  when the row names no resolvable unit (registry-less lanes and
   *  model-less rows fall back to the client derive; the wall pins
   *  parity on the golden families). */
  /** The card's boarded families WITH PRESENCE (the no-silent-drop
   *  law, hour 26 stroke 17: a boarded family the machine has not
   *  downloaded is SERVED, marked absent — never silently dropped
   *  from any surface). Present = the live catalog offer
   *  (buildCatalog's served keys, route-id-as-model). */
  cardFamilies(card: string): Array<{ id: string; present: boolean }> {
    const def: CardDefinition | undefined = this.defsSync().get(card);
    const mids: Set<string> = this.modelMids();
    // ids + presence ONLY (stroke 19): the DECL label is prose
    // describing a variant+quant config, never a model name — no
    // serving surface may render it as one
    return (def?.boarded ?? []).map((fam) => ({ id: fam, present: mids.has(fam) }));
  }

  /** ADMISSION (the door half of the no-silent-drop law, re-cut
   *  hour 26 stroke 18 per the operator: a BOARDED model is
   *  OFFERED — the write lands even when the weights are not yet
   *  downloaded; absence is a DOWNLOAD PROMPT on the surfaces, never
   *  a block). The model's OWNING family (resolveCardFamily —
   *  variant routes resolve to their family) must be BOARDED on the
   *  card; anything else refuses AT WRITE TIME with the card's
   *  board — the writer (agent or human patch) gets the error the
   *  moment it lands, never at run time. Model-less rows pass (they
   *  compose on the card's default family). */
  admitStageModel(
    card: string,
    model: unknown,
  ): { ok: true } | { ok: false; error: string; offered: string[] } {
    // THE CARD ITSELF IS ADMITTED FIRST (2026-09-15 — a compose
    // agent loaded flow 'image-upscale' as a card stage and wiped
    // the live bench): model-less rows used to pass unchecked, so a
    // flow id (or a typo) sailed onto the bench unquestioned. An
    // unknown card refuses AT WRITE TIME with the flow hint when
    // the id names a flow.
    const def: CardDefinition | undefined = this.defsSync().get(card);
    if (def === undefined) {
      const flow = getRegistryFlow(card);
      if (flow !== undefined) {
        const cards: string[] = [...new Set(
          flow.stages
            .map((s) => (s as { card?: unknown }).card)
            .filter((c): c is string => typeof c === "string" && c !== ""),
        )];
        return {
          ok: false,
          error:
            "'" + card + "' is a flow, not a card — stages take card ids; " +
            "compose its cards (" + (cards.join(", ") || "none listed") + ") " +
            "with add_stage (melite_load names the flow's stages and wiring)",
          offered: [],
        };
      }
      return {
        ok: false,
        error: "card '" + card + "' has no registered card definition",
        offered: [],
      };
    }
    if (typeof model !== "string" || model === "") return { ok: true };
    const boarded: readonly string[] = def.boarded ?? [];
    const mids: Set<string> = this.modelMids();
    const downloaded: string[] = boarded.filter((fam) => mids.has(fam));
    const fam: string = this.resolveCardFamily(model, this.modelFacts());
    if (!boarded.includes(fam)) {
      return {
        ok: false,
        error:
          "model '" + model + "' is not offered by card '" + card +
          "' (boards: " + (boarded.join(", ") || "none") +
          "; downloaded here: " + (downloaded.join(", ") || "none") + ")",
        // the OFFER is the board itself (absent weights are
        // offered too — downloadable; the prompt handles them)
        offered: [...boarded],
      };
    }
    // boarded = offered = admitted. Not-yet-downloaded weights are
    // the user's download prompt (provision_model), never a refusal
    return { ok: true };
  }

  resolveStageParams(
    body: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const mid: unknown = body["model"];
    if (typeof mid !== "string" || mid === "") return null;
    try {
      return this.prepareCardParams(body, mid, "serve").params;
    } catch {
      return null;
    }
  }

  /** The validate-door overlay (the SAME overlay, phase-1 voice) —
   *  R1 selection + the route-lens stamp overlay + lift, so
   *  start+validate compose the identical params (phase-1 with
   *  run_id "" on both). Precondition: mid is legal and resolves to
   *  a cordis family (the caller's own checks refuse first, same
   *  voices). Throws CardArmError on unknown variant/quant or an
   *  unregistered card. */
  overlayCardParams(
    body: Record<string, unknown>,
    mid: string,
  ): OverlaidCard {
    const facts: Record<string, ModelFactsRow> = this.modelFacts();
    const fam: string = this.resolveCardFamily(mid, facts);
    const famRow: ModelFactsRow | undefined = facts[fam];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (famRow === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase 1: model " + pyReprStr(mid) +
          " composes outside the cordis plane (python schema arm — unported half in this stroke)",
        "card_compose",
      );
    }
    const decl: CardDeclRow | undefined = this.cardDecls(facts)[famRow.card];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (decl === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase 1: unknown card " + pyReprStr(famRow.card) +
          " (no registered card definition for the card model " + pyReprStr(mid) + " names)",
        "card_compose",
      );
    }
    const sel: VariantSelection = selectCardVariant(mid, famRow, body, "1");
    const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel);
    return { fam, card: famRow.card, params: liftCardParams(stamped) };
  }

  /** In-process compose (the core: steps 7-9) — per-call throwaway
   *  Context + ComfyUIService (owned by the call, never shared). */
  private async composeOnce(
    card: string,
    fam: string,
    params: Record<string, unknown>,
    runId: string,
    phase: string,
  ): Promise<Record<string, unknown>> {
    const oi: Record<string, unknown> | null = this.objectInfo();
    /* v8 ignore next -- R3: the snapshot ships in-repo (never absent
       in practice): the closed refusal never fires (2026-09-12) */
    if (oi === null) {
      throw phaseRefusal(
        phase,
        "comfyui object_info snapshot absent (" +
          objectInfoPath() +
          ") — refusing closed (EXTENSION LAW: never compose unauthenticated)",
      );
    }
    const ctx = new EngineContext();
    await ctx.plugin({
      apply(c: EngineContext): void {
        new ComfyUIService(c);
      },
    });
    // THE CARD PACKAGES (the card sweep, 2026-09-09): the compose
    // boot rides the SAME composition table as loadCardDefs —
    // composeCards (exported from @melite/comfyui; the engine
    // src/cards readdir glob died with the sweep). A card lands by
    // adding its package + one table row; no shared-file edit.
    await composeCards(ctx);
    // THE MOD PLANE (2026-09-10 — the flavorless compose): this fresh
    // service composed cards ONLY, so flavor rows were absent and
    // every mod id refused at compose. Same composeModPlane as
    // loadCardDefs — one composition, two riders.
    await composeModPlane(ctx);
    ctx.comfyui.setFacts(loadFacts(factsPath(), this.readsSync()));
    ctx.comfyui.setObjectInfo(oi);
    // THE NESTED STANZA UNWRAP (cli.ts:82-91): a `params` dict key in
    // the incoming params IS the stanza; siblings merge over it.
    let lifted: Record<string, unknown> = params;
    {
      const inner: unknown = lifted["params"];
      if (
        typeof inner === "object" && inner !== null && !Array.isArray(inner)
      ) {
        lifted = {
          ...(inner as Record<string, unknown>),
          ...Object.fromEntries(Object.entries(lifted).filter(([k]) => k !== "params")),
        };
      }
    }
    // THE ADMISSION CONTRACT GATE (cli.ts admission verbatim voice):
    // every param key must be a declared knob or ride the admits row.
    const decls: Record<string, CardDeclRow> = this.cardDecls();
    // (prepareCardParams guarantees a registered card — its
    // unknown-card arm refuses first — so the lookup never misses.)
    const decl: CardDeclRow = decls[card] as CardDeclRow;
    {
    const knobs: Set<string> = new Set(decl.schemaNames);
    const admits: readonly string[] = decl.admits;
    // THE ABSORBED MOD SURFACE (the py interlock, 2026-09-08):
    // admission is the declared surface — and the mod fields a
    // family ABSORBS are part of that surface (registerMod through
    // the service; scope = declaring ∩ boarded, filtered to THIS
    // run's family exactly as the emission scopes).
    let modNames: Set<string> = new Set();
    /* v8 ignore start -- theService() boots in the engine fiber, never
       the test fiber (always throws here): the mod surface stays empty
       in tests; knobs+admits still gate (2026-09-12) */
    try {
      modNames = new Set(
        theService()
          .cardModFields(card)
          .filter((a) => a.families.includes(fam))
          .flatMap((a) => Object.keys(a.fields.dict ?? {})),
      );
      /* v8 ignore stop */
    } catch {
      // card defs not booted in this fiber — the mod surface is
      // empty here; the knobs+admits rows still gate.
    }
    const admitted = (key: string): boolean =>
      knobs.has(key) ||
      modNames.has(key) ||
      admits.some((a) => a === key || (a.endsWith("*") && key.startsWith(a.slice(0, -1))));
    const unknown: string[] = Object.keys(lifted).filter((k) => !admitted(k)).sort();
    if (unknown.length > 0) {
      throw phaseRefusal(
        phase,
        "compose-door: unknown param(s) on the " + card + " card: " + unknown.join(", ") +
          " (admission is the declared surface — knobs + contract admits; see the card's TS definition)",
      );
    }
    }
    try {
      return ctx.comfyui.compose(card, fam, lifted, runId) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof ComposeRefusal) {
        throw phaseRefusal(phase, e.code + ": " + e.message);
      }
      throw phaseRefusal(
        phase,
        e instanceof Error
          ? e.message
          : /* v8 ignore next -- compose throws Errors: the String
               fallback never fires (2026-09-12) */ String(e),
      );
    }
  }

  /** In-process validate compose (the CLI subprocess retired,
   *  2026-09-09): the SAME composeOnce pipeline the start path
   *  rides — facts + pin snapshot + stanza unwrap + admission gate
   *  + ctx.comfyui.compose — surfaced as the validate door's
   *  Refusal shape (null = composed OK; validate needs no graph).
   *  One plane composes for both doors (start + validate); the
   *  per-request execFileSync subprocess (one node boot per
   *  validate call) is dead. */
  async composeValidateCard(
    card: string,
    fam: string,
    params: Record<string, unknown>,
  ): Promise<{ message: string; code: string } | null> {
    try {
      await this.composeOnce(card, fam, params, "", "1");
      return null;
    } catch (e) {
      if (e instanceof CardArmError) {
        return { message: e.message, code: e.code };
      }
      throw e;
    }
  }

  /** Phase 1 (run_id ""): validates shape/admission/boarding before
   *  registration. The $spell branch composes NO graph (the pool
   *  passes — the two-card-flow handoff). */
  async phase1Card(
    body: Record<string, unknown>,
    mid: string,
  ): Promise<Phase1Card> {
    const prep: PreparedCard = this.prepareCardParams(body, mid, "1");
    // THE LANE PRESENCE GATE (one pattern, every family): before any
    // graph composes, the family's declared lane files must stand on
    // disk. Img Gen vs Img Edit was luck, not law — this is the law.
    const gate: CardArmError | null = lanePresenceRefusal(prep.fam);
    if (gate !== null) throw gate;
    const spells: readonly string[] = prep.decl.spells;
    const pool: Record<string, unknown> = {};
    for (const k of spells) {
      const v: unknown = prep.params[k];
      if (k in prep.params && typeof v === "string" && v.startsWith("$")) pool[k] = v;
    }
    if (Object.keys(pool).length > 0) {
      return { ...prep, spell: { skeleton: prep.skeleton, inputs: pool } };
    }
    await this.composeOnce(prep.card, prep.fam, prep.params, "", "1");
    return { ...prep, spell: null };
  }

  /** Phase 2 (the real run id): composes the SAME overlaid body phase
   *  1 validated (py submit 1294-1301 — idempotent, absent-keys-only;
   *  the editor's seeded stamps pass through byte-identical).
   *  A $spell body composes VERBATIM here (run context — the $spell
   *  wires into the Load* file slot; the merged path refuses a
   *  link-in-file-slot LOUDLY, test_two_card_flow). */
  async phase2Card(p1: Phase1Card, runId: string): Promise<ComposedCard> {
    const graph: Record<string, unknown> = await this.composeOnce(
      p1.card,
      p1.fam,
      p1.params,
      runId,
      "2",
    );
    /* v8 ignore next -- compose's contract returns the graph object
       (a non-object is an engine bug): the refusal never fires (2026-09-12) */
    if (typeof graph !== "object" || graph === null || Array.isArray(graph)) {
      throw new CardArmError(
        400,
        "card_compose produced an empty graph for " + p1.mid,
        "invalid_request",
      );
    }
    return { graph, skeleton: p1.skeleton, spell: p1.spell };
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    cardRegistry: CardRegistryService;
  }
}

/** The provider plugin (fiber-owned): owns the CardRegistryService
 *  lifetime and primes it at load, so inject-gated consumers apply
 *  only after the registry is primed. Manifest row
 *  estate-card-registry rides BEFORE every consumer (validate,
 *  flows-start, chrome, planes — the stroke-2b row placement rule).
 *  (The DSH leaf discipline — addressed code loads by address,
 *  never as a `cordis:` builtin.) */
/** The host row (estate naming — the gateway manifest died with
 *  the app; this is what the estate composition mounts). */
export const cardRegistryProvider = {
  name: "estate-card-registry",
  // NO comfyui inject: the compose rim property-reads ctx.comfyui on
  // its OWN throwaway EngineContext (which mounts ComfyUIService
  // itself at the rim head) — never on the host fiber, so no read
  // contract is owed to the composition.
  async apply(ctx: Context): Promise<void> {
    const svc = new CardRegistryService(ctx);
    await svc.prime();
  },
};

/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.cardRegistry — a
 *  bug, so reads throw LOUD (a registry read without a registry is
 *  never an empty answer). Door listeners MUST pass
 *  ctx.cardRegistry (their inject declares it). */
export function needCardRegistry(
  cards: CardRegistryService | null | undefined,
  where: string,
): CardRegistryService {
  if (cards === null || cards === undefined) {
    throw new Error(
      "[card_registry] no CardRegistryService for " + where +
        " — doors inject 'cardRegistry' and pass ctx.cardRegistry " +
        "(the manifest's estate-card-registry row primes at boot)",
    );
  }
  return cards;
}

// ── R1 variant/quant selection + route-lens stamp overlay ──────────

export interface VariantSelection {
  readonly variantId: string;
  readonly quant: string;
  readonly resolverDefaults: Record<string, unknown>;
}

function knownVariantIds(row: ModelFactsRow): string[] {
  return (row.variants ?? []).map((v) => v.id);
}

/** Select the matrix cell (R1 wire contract): explicit body
 *  variant/quant keys win when stated (matched against facts
 *  variant id/route + cell quant); unstated coordinates fall to
 *  the FIRST non-Recipe variant / first cell (Model.resolve —
 *  the family default). Unknown coordinates refuse LOUD (never a
 *  silent neighbor cell). */
export function selectCardVariant(
  mid: string,
  famRow: ModelFactsRow,
  body: Record<string, unknown>,
  phase: string,
): VariantSelection {
  const variants: VariantRow[] = famRow.variants ?? [];
  const configured: VariantRow[] = variants.filter((v) => v.group !== "Recipe");
  const pool: VariantRow[] = configured.length > 0 ? configured : variants;
  const rawVariant: unknown = body["variant"];
  const rawQuant: unknown = body["quant"];
  let variant: VariantRow | undefined;
  if (rawVariant === undefined || rawVariant === null) {
    variant = pool[0];
  } else {
    if (typeof rawVariant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": variant must be a string (got " +
          (Array.isArray(rawVariant) ? "list" : typeof rawVariant) + ")",
        "card_compose",
      );
    }
    variant = variants.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (variant === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown variant " + pyReprStr(rawVariant) +
          " for model " + pyReprStr(mid) + " (known: " + knownVariantIds(famRow).join(", ") + ")",
        "card_compose",
      );
    }
  }
  let quant = "";
  if (rawQuant !== undefined && rawQuant !== null) {
    if (typeof rawQuant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": quant must be a string (got " +
          (Array.isArray(rawQuant) ? "list" : typeof rawQuant) + ")",
        "card_compose",
      );
    }
    const cells: VariantCellRow[] = variant !== undefined ? (variant.cells ?? []) : [];
    const hit: VariantCellRow | undefined = cells.find((c) => c.quant === rawQuant);
    if (hit === undefined) {
      const known: string = cells.map((c) => c.quant).join(", ");
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown quant " + pyReprStr(rawQuant) +
          " for model " + pyReprStr(mid) + " variant " +
          pyReprStr(variant !== undefined ? variant.id : "") +
          (known !== "" ? " (known: " + known + ")" : " (the variant declares no cells)"),
        "card_compose",
      );
    }
    quant = hit.quant;
  } else if (variant !== undefined && (variant.cells ?? []).length > 0) {
    quant = String((variant.cells as VariantCellRow[])[0]?.quant ?? "");
  }
  return {
    variantId: variant !== undefined ? variant.id : "",
    quant,
    resolverDefaults: variant !== undefined ? { ...(variant.resolver_defaults ?? {}) } : {},
  };
}

/** The route-lens stamp overlay (py _route_stamp_overlay 705-751):
 *  family defaults + the selected variant's resolver_defaults,
 *  injected ONLY for absent keys, filtered to the owning card's
 *  field surface (schema keys + admits, exact or trailing-*
 *  prefix). None/"" stamps never ride (UNSET markers — riding
 *  them would refuse the str fields the row leaves open).
 *  variant/quant contract keys are CONSUMED (never ride compose —
 *  no card declares them). Returns the STAMPED body (a copy). */
export function stampCardOverlay(
  body: Record<string, unknown>,
  famRow: ModelFactsRow,
  decl: CardDeclRow,
  sel: VariantSelection,
): Record<string, unknown> {
  const stamps: Record<string, unknown> = { ...(famRow.defaults ?? {}) };
  for (const [k, v] of Object.entries(sel.resolverDefaults)) stamps[k] = v;
  const names: Set<string> = new Set(decl.schemaNames);
  const admits: readonly string[] = decl.admits;
  const onSurface = (k: string): boolean => {
    if (names.has(k)) return true;
    return admits.some((a) => a === k || (a.endsWith("*") && k.startsWith(a.slice(0, -1))));
  };
  const out: Record<string, unknown> = { ...body };
  for (const [k, v] of Object.entries(stamps)) {
    if (v === null || v === undefined || v === "") continue;
    if (!onSurface(k)) continue;
    if (k in out) continue;
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export function liftCardParams(body: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    if (k === "variant" || k === "quant") continue;
    params[k] = v;
  }
  return params;
}

// ── artifact-ref sweep (infra/python/artifact_refs.py find_dangling_refs
// semantics — the flowsValidate.ts mirror, same roots) ─────────────

const ASSET_RUNS_PREFIX: string = "/v1/assets/runs/";

function sweepRoots(): { outRoot: string; testOutRoot: string } {
  const runs: string = join(resolveRepoRoot(), "data", "runs");
  return { outRoot: join(runs, "output"), testOutRoot: join(runs, "test-output") };
}

function resolveArtifactFile(ref: string, outRoot: string): string {
  // (refLocations yields non-empty strings only — ref is always a string here.)
  const raw: string = String(ref).trim();
  /* v8 ignore next -- the empty fence never fires (refLocations
     yields prefix-strings only): kept as the rim's contract (2026-09-12) */
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + pyReprStr(raw));
  let cand: string;
  if (raw.startsWith(ASSET_RUNS_PREFIX)) {
    const rel: string = raw.slice(ASSET_RUNS_PREFIX.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want /v1/assets/runs/<run_id>/<file>): " + pyReprStr(raw),
      );
    }
    cand = join(outRoot, rel);
    /* v8 ignore start -- refLocations yields artifact-URL strings only:
       the shape arm never fires through the one caller (2026-09-12) */
  } else {
    throw new Error(
      "artifact ref is not an artifact URL (/v1/assets/runs/<run>/<file>): " + pyReprStr(raw),
    );
    /* v8 ignore stop */
  }
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  const relToRoot: string = relative(absRoot, absCand);
  /* v8 ignore next -- the traversal fence above pre-empts every ".."
     (a lexical escape needs one): the check never fires (2026-09-12) */
  if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
    throw new Error("artifact ref escapes the output root: " + pyReprStr(raw));
  }
  let isFile = false;
  try {
    isFile = statSync(absCand).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    // (raw is a well-formed artifact URL here — the slice always yields a run id.)
    const run: string = raw.startsWith(ASSET_RUNS_PREFIX)
      ? (raw.slice(ASSET_RUNS_PREFIX.length).split("/", 2)[0] as string)
      : /* v8 ignore next -- refLocations yields artifact-URL strings
           only: the fallback never fires (2026-09-12) */ "?";
    throw new Error(
      "artifact not found on disk: " + pyReprStr(raw) + " (looked up " + absCand + ") — the " +
        "upstream run may have been pruned, or the ref was never an output of run " + run,
    );
  }
  return absCand;
}

function refLocations(body: unknown): Array<{ location: string; ref: string }> {
  const out: Array<{ location: string; ref: string }> = [];
  const stack: Array<{ node: unknown; path: string }> = [{ node: body, path: "$" }];
  while (stack.length > 0) {
    const top = stack.pop() as { node: unknown; path: string };
    const node: unknown = top.node;
    const path: string = top.path;
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        stack.push({ node: value, path: path + "." + key });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        stack.push({ node: node[i], path: path + "[" + i + "]" });
      }
    } else if (typeof node === "string" && node.startsWith(ASSET_RUNS_PREFIX)) {
      out.push({ location: path, ref: node });
    }
  }
  return out;
}

/** find_dangling_refs semantics: the first dangling (location, ref,
 *  why), or null when every wired artifact URL is live under
 *  EITHER served root (the test root serves too — a test:true run
 *  may wire a test artifact). */
export function findCardDangling(
  body: Record<string, unknown>,
): [string, string, string] | null {
  const { outRoot, testOutRoot } = sweepRoots();
  for (const { location, ref } of refLocations(body)) {
    let live = false;
    let primaryErr: Error | null = null;
    for (const root of [outRoot, testOutRoot]) {
      try {
        resolveArtifactFile(ref, root);
        live = true;
        break;
      } catch (e) {
        if (primaryErr === null) primaryErr = e as Error;
      }
    }
    if (!live) return [location, ref, (primaryErr as Error).message];
  }
  return null;
}

// ── resolution front half (shared by start phase-1 + validate) ────
// (Lives on the service now — prepareCardParams is
// CardRegistryService.prepareCardParams; the module keeps only the
// result shapes below.)

export interface PreparedCard {
  readonly mid: string;
  readonly fam: string;
  readonly card: string;
  readonly skeleton: string;
  readonly decl: CardDeclRow;
  readonly params: Record<string, unknown>;
}

/** Python str() for the mid coercion (resolve_request's
 *  `mid = str(body["model"])` — None -> "None", True -> "True";
 *  the flowsValidate.ts pyStr mirror). */
export function pyStrMid(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (typeof v === "number") return String(v);
  // (booleans ride the true/false arms above — no boolean reaches here.)
  return JSON.stringify(v) ?? String(v);
}

// ── validate-door entry (the SAME overlay, phase-1 voice) ─────────
// (Lives on the service now — overlayCardParams is
// CardRegistryService.overlayCardParams.)

export interface OverlaidCard {
  readonly fam: string;
  readonly card: string;
  readonly params: Record<string, unknown>;
}

// ── in-process compose (the core: steps 7-9) ───────────────────────
// (Lives on the service now — composeOnce is a private
// CardRegistryService method, phase1Card/phase2Card are public
// methods; rows derive in modelFacts(), no raw file readers.)

export interface ComposedCard {
  readonly graph: Record<string, unknown>;
  readonly skeleton: string;
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}

// ── the two phases (steps 7 + 9, shared by start; phase-1 shared
// by validate's in-process future — today validate shells the CLI
// with the same prepared params) ───────────────────────────────────

export interface Phase1Card extends PreparedCard {
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}
