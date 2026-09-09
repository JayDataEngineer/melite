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
// REFUSAL VOICES: every card-lane failure carries the py shape
// `card_compose phase <N>: card_compose rc=1 (comfyui.comfyui):
// <detail>` (_compose_refusal 191-210 over the rim's
// `card_compose rc=%d (%s.%s)` 546-551), where <detail> is the
// CLI-stderr-line shape (`<code>: <msg>` for ComposeRefusal — the
// cli.ts catch; `compose-door: ...` for the admission die). The
// (comfyui.comfyui) prefix rides the ENGINE_TABLE derivation
// (plugin dir name + engine type, as scan_engines reports them —
// the flowsValidate.ts header pins the same table). Pre-compose
// request failures (illegal id, no unit, dangling ref) keep their
// existing validate-door voices (code invalid_request) so
// start+validate agree field-for-field.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import { bootModels, ComfyUIService, ComposeRefusal, getModel, loadCardDefs, loadFacts, registryIds, registryModel, theService } from "@melite/comfyui";
import type { CardDefinition, FactsFile, FactsReads } from "@melite/comfyui";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOOR_KEYS, FLOW_ID_RE } from "@melite/gateway-core";
import { pyReprStr, resolveRepoRoot } from "@melite/comfyui";

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
 *  546-551): `card_compose phase <N>: card_compose rc=1
 *  (comfyui.comfyui): <detail>`. */
function phaseRefusal(phase: string, detail: string): CardArmError {
  return new CardArmError(
    400,
    "card_compose phase " + phase + ": card_compose rc=1 (comfyui.comfyui): " + detail,
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
    const dict: Record<string, unknown> =
      (typeof carrier === "object" || typeof carrier === "function") && carrier !== null
        ? ((carrier as { dict?: unknown }).dict as Record<string, unknown> ?? {})
        : {};
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
 // camelCase service key per the ctx.gatewayError precedent and the
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
        "[card_registry] unprimed: boot must await the gateway-card-registry " +
          "provider (or ctx.cardRegistry.prime()) before the " +
          "disclosure rim serves (the manifest's gateway-card-registry row " +
          "primes; both main.ts boot sites re-prime; walls boot " +
          "through startServer which primes)",
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
        "[card_registry] unprimed: boot must await the gateway-card-registry " +
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

  /** resolve_model's existence half — RE-HOMED 2026-09-08 on the
   *  frozen discovery catalog (packages/gateway/shell/data/
   *  discovery-catalog.json, .catalog.models keys; hand-owned since
   *  purge S-catalog, wall-pinned). It replaces the
   *  models/<genre>/<mid>/model.py fs scan (estate-python purge
   *  deleted every model.py — the scan resolved the empty set and
   *  every {model:} compose refused). Missing file throws LOUD via
   *  readFileSync (same as modelFacts); a malformed shape resolves
   *  empty (same as modelFacts). */
  modelMids(): Set<string> {
    if (this.mids !== null) return this.mids;
    const path: string = join(
      resolveRepoRoot(), "packages", "gateway", "shell", "data", "discovery-catalog.json",
    );
    const doc: unknown = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const models: unknown =
      typeof doc === "object" && doc !== null
        ? (doc as { catalog?: { models?: unknown } }).catalog?.models
        : undefined;
    this.mids = new Set(
      typeof models === "object" && models !== null && !Array.isArray(models)
        ? Object.keys(models as Record<string, unknown>)
        : [],
    );
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
    for (const [fam, row] of Object.entries(table)) {
      for (const v of row.variants ?? []) {
        if (v.route === mid) return fam;
        for (const c of v.cells ?? []) {
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
      skeleton: decl.skeleton !== "" ? decl.skeleton : mid,
      decl,
      params: liftCardParams(stamped),
    };
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
    if (famRow === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase 1: model " + pyReprStr(mid) +
          " composes outside the cordis plane (python schema arm — unported half in this stroke)",
        "card_compose",
      );
    }
    const decl: CardDeclRow | undefined = this.cardDecls(facts)[famRow.card];
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
    if (oi === null) {
      throw phaseRefusal(
        phase,
        "comfyui object_info snapshot absent (" +
          objectInfoPath() +
          ") — refusing closed (EXTENSION LAW: never compose unauthenticated)",
      );
    }
    const ctx = new Context();
    await ctx.plugin({
      apply(c: Context): void {
        new ComfyUIService(c);
      },
    });
    const cardsDir: string = join(cordisSrcDir(), "cards");
    for (const f of readdirSync(cardsDir).filter((x) => x.endsWith(".ts"))) {
      // the cli.ts:59-63 auto-load loop, in-process: the WHOLE module
      // namespace rides (cards declare `export const inject =
      // ['comfyui']` at module level — passing only { apply } drops
      // the inject declaration and compose dies with "cannot get
      // property comfyui without inject"). A card lands by dropping
      // its file; no shared-file edit.
      const mod = (await import(pathToFileURL(join(cardsDir, f)).href)) as unknown as Plugin;
      if (typeof (mod as { apply?: unknown }).apply === "function") {
        await ctx.plugin(mod);
      }
    }
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
    const decl: CardDeclRow | undefined = decls[card];
    if (decl !== undefined) {
      const knobs: Set<string> = new Set(decl.schemaNames);
      const admits: readonly string[] = decl.admits;
      // THE ABSORBED MOD SURFACE (the py interlock, 2026-09-08):
      // admission is the declared surface — and the mod fields a
      // family ABSORBS are part of that surface (registerMod through
      // the service; scope = declaring ∩ boarded, filtered to THIS
      // run's family exactly as the emission scopes).
      let modNames: Set<string> = new Set();
      try {
        modNames = new Set(
          theService()
            .cardModFields(card)
            .filter((a) => a.families.includes(fam))
            .flatMap((a) => Object.keys(a.fields.dict ?? {})),
        );
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
      throw phaseRefusal(phase, e instanceof Error ? e.message : String(e));
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
    const spells: readonly string[] = prep.decl.spells ?? [];
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
 *  gateway-card-registry rides BEFORE every consumer (validate,
 *  flows-start, chrome, planes — the stroke-2b row placement rule).
 *  Loadable entry: packages/gateway/doors/src/entries/
 *  card-registry.ts (the DSH leaf discipline — addressed code
 *  loads by address, never as a `cordis:` builtin). */
export const cardRegistryProvider = {
  name: "gateway-card-registry",
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
        "(the manifest's gateway-card-registry row primes at boot)",
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
  const raw: string = String(ref ?? "").trim();
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
  } else if (raw.includes("/") && !raw.startsWith("/")) {
    cand = join(outRoot, raw);
  } else if (raw.startsWith("/")) {
    cand = raw;
  } else {
    throw new Error(
      "artifact ref is a bare " + pyReprStr(raw) + " — not an absolute path, an artifact URL " +
        "(/v1/assets/runs/<run>/<file>), or a runs-relative <run>/<file> (a bare filename lives " +
        "in the ComfyUI input dir and is the caller's staging concern, never a disk lookup)",
    );
  }
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  const relToRoot: string = relative(absRoot, absCand);
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
    const run: string = raw.startsWith(ASSET_RUNS_PREFIX)
      ? (raw.slice(ASSET_RUNS_PREFIX.length).split("/", 2)[0] ?? "?")
      : "?";
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
  if (typeof v === "boolean") return v ? "True" : "False";
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

function cordisSrcDir(): string {
  const entry: string = fileURLToPath(import.meta.resolve("@melite/comfyui"));
  return dirname(entry);
}

// ── the two phases (steps 7 + 9, shared by start; phase-1 shared
// by validate's in-process future — today validate shells the CLI
// with the same prepared params) ───────────────────────────────────

export interface Phase1Card extends PreparedCard {
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}
