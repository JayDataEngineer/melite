// cardsRegistry.ts — the card registry as a HOST Cordis service
// (REBUILD-9, gateway kill): the dead flowsCard.ts second-move
// verbatim (the registry, the resolve/prepare/overlay pipeline, the
// in-process compose — line cites riding along). The runs
// plane's {model:} arms (start phase-1/phase-2 + validate) ride
// this service; the estate row mounts it before the runs registry.
//
// PATHS: facts + object_info ride the ENGINE package's data dir
// (the Decl x Facts unification — same as the door). The service
// name stays "cardRegistry" (ctx.cardRegistry).
// the {model:} card composer arm (TS-native card lane, 2026-09-08).
//
// WHAT THIS SERVES (the cordis
// plane): the card-run derivation resolve_card_model +
// submit's phase-2 arm + the rim wrap (card_hooks.compose), with
// the survey's verdict
// (docs/design/card-lane-port-survey-2026-09-08.md §0 + §5): import
// @melite/comfyui IN-PROCESS — no template SSOT, no subprocess, no
// class-tree port. The graph truth already lives in TS
// (the card packages — stable);
// this arm only changes the CALL PATH (subprocess shell -> import).
//
// THE CHAIN (order, mirrored step-for-step):
//   1. envelope/draft/strict/exclusivity — OWNED by the start
//      door (handleFlowsStart, already ported); this arm starts past it.
//   2. model-id legality (validate-door voice) + existence
//      (resolve_model's voice: "no model unit ...") + the
//      non-cordis arm refusal.
//   3. artifact-ref sweep (find_dangling_refs semantics — every
//      /v1/assets/... URL must
//      exist on served mounts BEFORE compose).
//   4. route-lens stamp overlay (_route_stamp_overlay 705-751):
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
//   8. admission-contract gate (the cli door's verbatim voice).
//   9. in-process compose: ONE Context + ComfyUIService +
//      auto-loaded cards (the cli loop), setFacts +
//      setObjectInfo (live /object_info doc via the SDK client —
//      R3: an unreachable engine refuses CLOSED, never composes
//      unauthenticated), ctx.comfyui.compose(card, family, params,
//      runId) — the same call the cli door makes. ComposeRefusal.code
//      maps to the refusal detail.
//  10. stage-row wrap (the rim, plugins.py:566-588): {id: skeleton
//      (the card definition, fallback: the posted mid), engine comfyui,
//      params: {workflow: graph}} — submitted through the EXISTING
//      engine layer (engine/comfyui.ts executeFlow) exactly like
//      flow_inline runs (L3 routing, upload walk, harvest,
//      interrupt, timeout all reused untouched).
//
// REFUSAL VOICES: every card-lane failure carries
// `card_compose phase <N>: <detail>` (the phase framing; the
// subprocess-era `rc=%d (%s.%s)` mimicry retired 2026-09-09 with
// the execFileSync itself), where <detail> is the CLI-line shape
// (`<code>: <msg>` for ComposeRefusal; `compose-door: ...` for the
// admission die). The
// (comfyui.comfyui) prefix rides the ENGINE_TABLE derivation
// (plugin dir name + engine type, as scan_engines reports them —
// the validate door pins the same table). Pre-compose
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
import { bootModels, buildCatalog, checkModelPresent, ComfyUIService, ComposeRefusal, composeCards, composeModPlane, getModel, liveScanOrder, loadCardDefs, loadEndpointConfig, loadFacts, modelIds, registryIds, registryModel, resolveCardFlowOutputs, theService } from "@melite/comfyui-cordis";
import type { CardDefinition, FactsFile, FactsReads } from "@melite/comfyui-cordis";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { DOOR_KEYS } from "./runsGates.ts";
import { FLOW_ID_RE } from "./runsGates.ts";
import { getRegistryFlow } from "./flowsData.ts";
import { CardArmError, phaseRefusal } from "./cardsArmError.ts";
export { CardArmError } from "./cardsArmError.ts";
import type { CardDeclRow, ModelFactsRow, VariantCellRow, VariantRow } from "./cardsFacts.ts";
import { factsPath, deriveDecls } from "./cardsFacts.ts";
import type { LaneRelations, LaneViolation } from "@melite/contracts/laneRelations";
import { judgeLaneRelations, judgeLaneSurface, laneSurfaceOf } from "@melite/contracts/laneRelations";
import { lanePackFolders, lanePresenceRefusal } from "./cardsLanes.ts";
import { selectCardVariant, stampCardOverlay, liftCardParams } from "./cardsVariant.ts";
import type { VariantSelection } from "./cardsVariant.ts";
import { findCardDangling } from "./cardsDangling.ts";

// the extracted planes re-export through the registry's public
// surface (the walls import these names from here — one door)
export { selectCardVariant, stampCardOverlay, liftCardParams } from "./cardsVariant.ts";
export type { VariantSelection } from "./cardsVariant.ts";
export { findCardDangling } from "./cardsDangling.ts";
export type { CardDeclRow, ModelFactsRow, VariantCellRow, VariantRow } from "./cardsFacts.ts";
import { liveObjectInfo, resolveEngineBaseUrl, resolveRepoRoot } from "@melite/comfyui-cordis";
import { admissionRefusal, composeOnce, liftStanza, prepareCardParams, type ComposeSeat } from "./cardsCompose.ts";
/** The card-envelope keys (CARD_ENVELOPE_KEYS =
 *  DOOR_KEYS + draft/test/service): select the graph, never ride it. */
export const CARD_ENVELOPE_KEYS: readonly string[] = [
  ...DOOR_KEYS,
  "draft_id",
  "test",
  "service",
];

/** The card-lane refusal: status + the _refusal envelope shape
 *  (error, code, then loc/expected/got) — the door maps it through
 *  the local refusal path. */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
 * guard (it THROWS on unknown ids); the id is the fallback.
 * Exported for the wall (both arms pin: the face serves, the
 * unknown degrades to the id — never a throw into a serve). */
export function familyFace(fam: string): string {
  try {
    return registryModel(fam).label;
  } catch {
    return fam;
  }
}


/** Phase-N compose failure (_compose_refusal 191-210 over the rim
 *  546-551, the subprocess framing retired 2026-09-09): `card_compose phase <N>
 *  (comfyui.comfyui): <detail>`. */


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
 // sweep) stay module functions — they take explicit args
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
  /** Route address → family owner from the registry-derived facts. */
  private owners: Record<string, string> = {};
  /** Registry reads for the row derivation (primed with the models boot). */
  private reads: FactsReads | null = null;
  /** The decl projection (lazy — derived from defs + facts). */
  private decls: Record<string, CardDeclRow> | null = null;
  /** The engine's live node-definitions doc (/object_info via the
   *  SDK client, cached per process on the engine side; primed by
   *  primeObjectInfo before any compose). null = not yet primed or
   *  the engine is unreachable. */
  private oi: Record<string, unknown> | null = null;
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
    this.owners = {};
    // ARM THE SINGLETON for the presence reads (stroke 18): the
    // compose path builds a FRESH service per run (armed with the
    // live doc below), but the serving surfaces (the spec's packs
    // block, the load bundle's pack hints) read theService() —
    // without this arm every pack marks unknown (null) on a healthy
    // lane. Same live doc + same facts file the compose gate reads:
    // one truth, two seats, one spelling of the check.
    await this.primeObjectInfo();
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
   *  belt-and-braces for in-process reuse — the RunsService behavior). */
  resetForTests(): void {
    this.defs = null;
    this.facts = null;
    this.owners = {};
    this.reads = null;
    this.decls = null;
    this.oi = null;
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
    this.owners = { ...doc.owners };
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

  /** The primed live doc (sync face for the sweeps/spec fakes).
   *  null = never primed, or the engine was unreachable at prime. */
  objectInfo(): Record<string, unknown> | null {
    return this.oi;
  }

  /** Prime the live node-definitions doc off the engine (/object_info
   *  via the SDK, cached per process). Never throws: false = the
   *  engine is unreachable and the doc stays null (the compose gate
   *  refuses CLOSED on that; the serving surfaces degrade). */
  async primeObjectInfo(): Promise<boolean> {
    try {
      this.oi = await liveObjectInfo(resolveEngineBaseUrl());
      return true;
    } catch {
      this.oi = null;
      return false;
    }
  }

  /** resolve_model's existence half — the LIVE offer (the same
   *  served key set the catalog door answers: buildCatalog's served
   *  models in scan order). It replaces the retired per-model
   *  declaration scan (the declarations are table rows now — a
   *  missing row refuses LOUD, never an empty compose
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
    if (facts === undefined || facts === this.facts) {
      const owner = this.owners[mid];
      if (owner !== undefined && owner !== mid && owner in table) return owner;
    }
    if (mid in table) {
      // THE ROUTE-ADDRESS FOLD (ROADMAP §36.5, 2026-09-24 — the
      // operator's "(registered: …)" receipt's twin): the facts
      // projection registers per-ROUTE rows (the flattener's one-
      // owner-per-route picker rows, receipt: the address row
      // 'qwen3-tts-voicedesign-design' exists as its own facts key
      // with defaults {model: 'qwen3-tts-voicedesign', variant:
      // 'voicedesign'}) — a KEY hit used to return the ADDRESS as
      // if it were a family, and every family-resolution consumer
      // downstream answered the models registry's unknown-model
      // voice. The row's OWN defaults name the owning atom: fold
      // to it. The address row itself keeps serving the picker
      // (this is the resolution lens, never the serve table); a
      // real family row's defaults point at itself and returns
      // unchanged.
      const owner = table[mid].defaults?.["model"];
      if (typeof owner === "string" && owner !== mid && owner in table) return owner;
      return mid;
    }
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


  /** THE RESOLVED SERVE (hour-26 stroke 15, the 1:1 run law): the
   *  map the NEXT RUN composes from a stage row — prepareCardParams'
   *  stamped + lifted body (variant resolver_defaults + family
   *  defaults injected for absent keys, surface-filtered, envelope
   *  keys + variant/quant consumed), the exact input the {model:}
   *  door hands compose. The drafts serve carries it on the stage
   *  row; the form renders it UNDER the user layer — ONE resolver,
   *  served to the visual, never a second client-side truth. Null
   *  when the row names no resolvable unit (registry-less lanes and
   *  model-less rows fall back to the client derive). */
  /** The card's boarded families WITH PRESENCE (the no-silent-drop
   *  law, hour 26 stroke 17: a boarded family the machine has not
   *  downloaded is SERVED, marked absent — never silently dropped
   *  from any surface). Present = the live catalog offer
   *  (buildCatalog's served keys, route-id-as-model). */
  cardFamilies(card: string): Array<{ id: string; present: boolean; label: string }> {
    const def: CardDefinition | undefined = this.defsSync().get(card);
    const mids: Set<string> = this.modelMids();
    // Label = the family DECL's own face (registryModel —
    // "MOSS-SFX v2", never the composed variant+quant row):
    // SUPERSEDES the stroke-19 ids-only law (the operator,
    // 2026-09-16: an id-only face drops the VERSION — "Moss Sfx"
    // is ambiguous between v1 and v2; the family label is the
    // model's face, the variant axes stay the axes).
    return (def?.boarded ?? []).map((fam) => ({
      id: fam,
      present: mids.has(fam),
      // registryModel THROWS on an unknown id (never returns
      // undefined) — the guard catches, the id is the label-less
      // fallback. The catch arm fires only on a boarded-but-
      // unregistered family (no live caller boards one — the walls
      // refuse it); it stays armed for the honest degrade.
      label: familyFace(fam),
    }));
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
      // THE GENERIC MCP CARD (2026-09-21 — "nor does this fake card
      // even load"): the ONE engine-served card with NO card
      // definition (the picker's row and its form ride the engine
      // arm, never the registry's defs). It is admitted against the
      // LIVE engines-seat census: the card exists iff at least one
      // mcp:<server> engine is seated — the standalone-subagent
      // spawn needs a server to provide (the card's face is the
      // AGENT card doc; the servers are its MCPs tiles' census, the
      // same fold the catalog/forms doors serve). A dead server
      // pick refuses AT WRITE TIME with the seated list, same
      // voice as a card board.
      if (card === "mcp") {
        const seated: string[] = this.seatedMcpEngines();
        if (seated.length === 0) {
          return {
            ok: false,
            error: "card 'mcp' has no seated MCP server on this lane (no mcp:<server> engine registered) — the card composes nothing",
            offered: [],
          };
        }
        if (typeof model === "string" && model !== "" && !seated.includes(model)) {
          return {
            ok: false,
            error:
              "model '" + model + "' is not a seated MCP server (seated: " + seated.join(", ") + ")",
            offered: seated,
          };
        }
        return { ok: true };
      }
      const flow = getRegistryFlow(card);
      if (flow !== undefined) {
        const cards: string[] = [...new Set(
          flow.stages
            .map((s) => (s as { card?: unknown }).card)
            .filter((c): c is string => typeof c === "string" && c !== ""),
        )];
        return {
          ok: false,
          /* v8 ignore next -- every registered flow carries at least one card stage (probe 2026-09-19, flowsData REGISTRY): the empty-list toll never fires through live data */
          error: "'" + card + "' is a flow, not a card — stages take card ids; compose its cards (" + (cards.join(", ") || "none listed") + ") with add_stage (melite_load names the flow's stages and wiring)",
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
    // (CardDefinition pins boarded: readonly string[] — required, and
    // every live def carries it — so no undefined fallback here.)
    const boarded: readonly string[] = def.boarded;
    const mids: Set<string> = this.modelMids();
    const downloaded: string[] = boarded.filter((fam) => mids.has(fam));
    const fam: string = this.resolveCardFamily(model, this.modelFacts());
    // THE ADDRESS MUST BE THE OFFER (2026-10-10, the behavioural
    // audit's BROKEN-A: this folded ANY declared route onto its
    // owning family, so `qwen3-tts-voicedesign-base` — a variant
    // route the card does NOT offer — was admitted, and then
    // composed the family HEAD's lane: the stored id named base while
    // the run spoke. The card's board and the tool's offer are the
    // SAME set (the tts card's own law); an address the board does
    // not name is not offered, however valid a route it is.
    if (!boarded.includes(model)) {
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

  /** THE LANE ADMISSION (2026-10-10, the YOU_ARE_A_LIAR fix shapes
   *  1+3+5 — "bench-write enforces the DECL's relations: refusal in
   *  the field's voice at the moment a state is built"). Resolves
   *  the stage's (family × variant) lane through the SAME selection
   *  the run composes with (prepareCardParams — one spelling), then
   *  judges the DECL's declaration over the stamped body:
   *  - the LANE SURFACE: a stated card field outside the variant's
   *    declared surface fires nothing at compose — refused here, a
   *    priori, named;
   *  - the RELATION WORDS: requires / conflicts / together /
   *    either_or (the judged grammar at @melite/contracts/
   *    laneRelations — the same call the form gates inline with).
   *  Families that declare no surface judge NOTHING (the legacy
   *    truth: the card's union table authors the fields); a
   *  selection error (unknown variant/quant, dangling refs) is NOT
   *  this door's voice — the write passes and the run door refuses
   *    with its own (the tolerance law, li-j: the write door never
   *    grew the run door's other refusals). */
  admitStageRelations(
    card: string,
    params: Record<string, unknown>,
  ): { ok: true } | { ok: false; error: string } {
    const verdict = this.laneVerdict(card, params);
    return verdict === null ? { ok: true } : { ok: false, error: verdict };
  }

  /** THE LANE VERDICT (li-o's judgment, ONE spelling, two seats):
   *  the DECL's surface + relation words over the prepared state, or
   *  null when the lane accepts it. The bench-write door refuses on
   *  it at build time; the RUN seat (phase1Card) refuses on it too —
   *  the declaration, not the card's hand-written belt, is what
   *  teaches an archived row that slipped the write door. Everything
   *  that is not the DECL's own words (unknown variant/quant, a
   *  dangling ref, a familyless unit, a legacy family that declares
   *  nothing) returns null and keeps the other door's voice. */
  private laneVerdict(
    card: string,
    params: Record<string, unknown>,
  ): string | null {
    const def: CardDefinition | undefined = this.defsSync().get(card);
    if (def === undefined) return null; // mcp/flow ids — not lane-admitted
    const mid: unknown = params["model"];
    if (typeof mid !== "string" || mid === "") {
      // THE UNDECLARED-KEY GATE HAS ITS OWN SEAT (the behavioural
      // re-check's BYPASS 3: the contract's self-naming strip removes
      // `model: 'anny'` at store, so a patched row became model-less
      // and the model-less tolerance below stood the whole judgment
      // down — `frobnicate` landed). A key no card declares needs no
      // family and no lane: it is judged here, over the raw params
      // minus the envelope, before any tolerance.
      try {
        admissionRefusal(this, card, "", liftCardParams(params), "admission");
      } catch (e) {
        if (e instanceof CardArmError) return e.message;
        throw e;
      }
      return null; // the lane's own tolerance for a model-less row
    }
    let prep: PreparedCard;
    try {
      prep = prepareCardParams(this, params, mid, "admission");
    } catch {
      // selection/dangling failures keep the run door's voice —
      // this seat judges only the DECL's own words
      return null;
    }
    // THE UNDECLARED-KEY GATE, family side (a key no card declares
    // needs no family — but with a family named, the same gate judges
    // the LIFTED view the run seat composes).
    try {
      admissionRefusal(this, prep.card, prep.fam, prep.params, "admission");
    } catch (e) {
      if (e instanceof CardArmError) return e.message;
      throw e;
    }
    const facts: Record<string, ModelFactsRow> = this.modelFacts();
    const famRow: ModelFactsRow | undefined = prep.fam === "" ? undefined : facts[prep.fam];
    if (famRow === undefined) return null; // familyless card unit — no lane
    // A FAMILY THAT DECLARES RELATIONS BUT NO SURFACE still gets its
    // words judged (2026-10-10, the DECL audit's MEDIUM-7): the early
    // return here used to skip relation collection entirely, so a
    // surface-less family with a declared law bound NOTHING, silently.
    // laneSurfaceOf(null, …) already returns null, and judgeLane-
    // Surface(null, …) judges nothing — dropping the return costs
    // legacy families exactly the nothing they had.
    let sel: VariantSelection;
    try {
      sel = selectCardVariant(mid, famRow, params, "admission");
    } catch {
      return null; // the run door's voice, same tolerance as above
    }
    // THE LANE IS THE SELECTED VARIANT (probe receipt, corrected
    // 2026-10-10 — the first cut got this backwards): a route
    // address ('qwen3-tts-base') does NOT by itself name the clone
    // lane. The run composes from the FAMILY row plus the selected
    // variant's resolver_defaults, and a route's own lane_inputs
    // reach the card only when those stamps carry the route address
    // (variant:'base' → model:'qwen3-tts-base'). A bare route
    // address with no body variant selects the family HEAD and
    // composes the synth lane, where a stated ref_audio fires
    // nothing. So the judged lane is exactly the selection, never
    // the address: reading the address' facts row (which does carry
    // synth_lane:'clone') admitted states the run then refused — a
    // false admit, the worse half of the two errors.
    const laneVariantId = sel.variantId;
    const variantRow: VariantRow | undefined = famRow.variants.find(
      (v) => v.id === laneVariantId,
    );
    const relations: LaneRelations[] = [];
    if (famRow.relations !== undefined) relations.push(famRow.relations);
    if (variantRow?.relations !== undefined) relations.push(variantRow.relations);
    const surface: readonly string[] | null = laneSurfaceOf(
      famRow.params,
      variantRow?.params,
    );
    const violations: LaneViolation[] = [
      ...judgeLaneSurface(surface, prep.decl.schemaNames, prep.params),
      ...judgeLaneRelations(relations, prep.params),
    ];
    if (violations.length > 0) {
      return "lane '" + prep.fam + "/" + laneVariantId + "' refuses the state: " +
        violations.map((v) => v.message).join("; ");
    }
    // THE UNDECLARED-KEY GATE RIDES HERE TOO (2026-10-10, the
    // behavioural audit's BROKEN-B: `params: {model, text,
    // frobnicate: 1}` was ADMITTED at the bench and refused only at
    // the run door — so a write the door accepted became a run the
    // bench could not produce. The bench and the run must speak the
    // same voice about a key no card declares; admissionRefusal is
    // that voice, and it now runs on BOTH seats (the lane voice
    // first, because it is the more specific law).
    try {
      admissionRefusal(this, prep.card, prep.fam, prep.params, "admission");
    } catch (e) {
      // the gate speaks by THROWING on the run seat; this door's
      // contract is a VERDICT, so the refusal is translated here
      // rather than escaping as an unmapped error
      if (e instanceof CardArmError) return e.message;
      throw e;
    }
    return null;
  }

  /** THE SCHEMA-MASTER REPAIR (operator law 2026-09-24 — receipt:
   *  restoring the design-era history refused "unknown model
   *  'qwen3-tts-voicedesign-design'" at the load door; the era's
   *  compose wrote route-address ids the running board never
   *  offered, so the archive died at the restore gesture). ONE
   *  repair law, namespaced to RESTORES (the admission caller
   *  gates on provenance 'restored' — a live composer's typo still
   *  gets the loud refusal with the board). Two ladders, first
   *  match wins:
   *  1. THE ROUTE LADDER (the DECL's own truth): a facts variant
   *     or cell whose ROUTE equals the poisoned id folds to its
   *     family + its variant id (receipt: route
   *     qwen3-tts-voicedesign-design → family qwen3-tts-voicedesign
   *     + variant 'voicedesign' — the DECL's
   *     resolver_defaults, never a string guess).
   *  2. THE PREFIX LADDER (era junk): the LONGEST boarded family
   *     that prefixes the id at a '-' boundary wins; a suffix
   *     naming a declared variant restores the variant coordinate;
   *     any other suffix strips.
   *  No match on either → null (the caller rethrows the original
   *  refusal — never a fuzzy guess across boards). */
  repairStageModel(card: string, model: string): { model: string; variant?: string } | null {
    const def: CardDefinition | undefined = this.defsSync().get(card);
    if (def === undefined) return null;
    const facts: Record<string, ModelFactsRow> = this.modelFacts();
    // Ladder 1 — the route table (the facts' own address rows and
    // the owning family's variants BOTH carry the route; the owner
    // with the variant that DECLARES the route wins over a bare
    // address-row default).
    for (const [fam, row] of Object.entries(facts)) {
      for (const v of row.variants ?? []) {
        if (v.route === model && def.boarded.includes(fam)) {
          return { model: fam, variant: v.id };
        }
        for (const c of v.cells ?? []) {
          if (c.route === model && def.boarded.includes(fam)) {
            return { model: fam, variant: v.id };
          }
        }
      }
    }
    // Ladder 2 — the boarded-family dash-prefix (era junk suffix).
    const candidates: string[] = def.boarded
      .filter((fam: string): boolean => model.startsWith(fam + "-"))
      .sort((a: string, b: string): number => b.length - a.length);
    const fam: string | undefined = candidates[0];
    if (fam === undefined) return null;
    const suffix: string = model.slice(fam.length + 1);
    const variant: string | undefined = (facts[fam]?.variants ?? []).some(
      (v): boolean => v.id === suffix,
    )
      ? suffix
      : undefined;
    return variant === undefined ? { model: fam } : { model: fam, variant };
  }

  /** The seated mcp:<server> engine ids, sorted — the generic MCP
   * card's LIVE board (the same census the catalog/forms folds
   * serve). The same lane-read spelling runsRegistry's flow_inline
   * compile uses: the implicit seat get returns undefined when no
   * engines service is registered — a registry-only boot (walls,
   * fixtures) folds an empty census and card 'mcp' refuses with its
   * own voice, never a silent pass. */
  private seatedMcpEngines(): string[] {
    const seat: unknown = this.ctx.get("engines");
    if (seat === undefined || typeof (seat as { ids?: unknown }).ids !== "function") return [];
    return (seat as { ids(): string[] })
      .ids()
      .filter((id) => id.startsWith("mcp:"))
      .sort();
  }

  resolveStageParams(
    body: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const mid: unknown = body["model"];
    if (typeof mid !== "string" || mid === "") return null;
    try {
      return prepareCardParams(this, body, mid, "serve").params;
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
    // THE CARD-UNIT ARM (2026-10-08, the Run-press law — prepare's
    // twin): a family-less card id (the bench Run press's own
    // shape) overlays NOTHING — no family row, no variants, no
    // model defaults — the params lift verbatim and the card's
    // declaration owns every default.
    if (!(mid in facts) && !(this.resolveCardFamily(mid, facts) in facts) && !this.modelMids().has(mid)) {
      const decls: Record<string, CardDeclRow> = this.cardDecls(facts);
      if (Object.prototype.hasOwnProperty.call(decls, mid)) {
        // fam '' — the engine's model-less marker (service.ts:617),
        // never the card id (the not-boarded gate would refuse).
        return { fam: "", card: mid, params: liftCardParams(body) };
      }
    }
    const fam: string = this.resolveCardFamily(mid, facts);
    const famRow: ModelFactsRow | undefined = facts[fam];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (famRow === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase 1: model " + JSON.stringify(mid) +
          " composes outside the cordis plane (no family row — the model resolves but the facts file declares nothing for it)",
        "card_compose",
      );
    }
    const decl: CardDeclRow | undefined = this.cardDecls(facts)[famRow.card];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (decl === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase 1: unknown card " + JSON.stringify(famRow.card) +
          " (no registered card definition for the card model " + JSON.stringify(mid) + " names)",
        "card_compose",
      );
    }
    const sel: VariantSelection = selectCardVariant(mid, famRow, body, "1");
    const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel);
    return { fam, card: famRow.card, params: liftCardParams(stamped) };
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
    // the body's OWN model address, when the caller still holds it: the
    // `params` this arm receives has been through the overlay, so
    // `model` is already consumed — deriving it from there fell back
    // to the FAMILY and both run-seat fixes were skipped (the live
    // verification caught exactly that: an unoffered address still
    // answered ok, and a lawful `variant: base` clone still refused).
    mid?: string,
    // the RAW body, when the caller has already overlaid: `variant`
    // is consumed by the overlay (it is a selection coordinate, never
    // a param), so the prepare must see the body to select the lane —
    // preparing from the overlay's product silently composed the head
    // and refused a lawful `variant: base` clone.
    rawBody?: Record<string, unknown>,
  ): Promise<{ message: string; code: string } | null> {
    // THE VALIDATE-START PARITY LAW (2026-10-10, the operator's
    // question: "HOW DID THE VALIDATE RETURN SUCCESS WHEN THE INPUT
    // IMAGE DID NOT GO"): the {model:} door composes ONE stage and
    // resolves NO wires — a $spell param is a promise only a flow's
    // FromStage links can keep. composeOnce TOLERATES spells (the
    // lane bakes them into the graph; legal on the flow path, lethal
    // on a single-card run — run 880aaa85d928 died at the merge
    // while validate passed this very body). The door's start arm
    // refuses spells (runsRegistry li-c); validate refuses the SAME
    // bodies with the SAME voice — the two doors can never disagree.
    const spellSweep = (v: unknown, found: Set<string>): void => {
      if (typeof v === "string") {
        if (v.startsWith("$") && v.length > 1) found.add(v);
      } else if (Array.isArray(v)) {
        for (const x of v) spellSweep(x, found);
      } else if (typeof v === "object" && v !== null) {
        for (const x of Object.values(v as Record<string, unknown>)) {
          spellSweep(x, found);
        }
      }
    };
    const spells: Set<string> = new Set();
    spellSweep(params, spells);
    if (spells.size > 0) {
      return {
        message:
          "params carry " +
          JSON.stringify([...spells].sort()) +
          " but a single-card run resolves no wires and no initials — the merge would refuse them at run time. Wire the input (run the bench flow so FromStage links ride) or replace the $spell with a concrete value.",
        code: "invalid_request",
      };
    }
    // THE VALIDATE SEAT RIDES THE SAME PREPARED CARD (the final live
    // verification, FIX A: this arm composed the raw FAMILY atom, so
    // it missed BOTH run-seat fixes — an unoffered address answered
    // ok:true here while the bench refused it, and a LAWFUL
    // `variant: base` clone was refused here ("fires nothing outside
    // the Base variant") while the bench admitted the same state. The
    // seats disagreed in BOTH directions because this one door never
    // shared the run seat's preparation: the board check, the lane
    // judgment and the resolved route all live there.)
    const address: string = mid ??
      (typeof (params as Record<string, unknown>)["model"] === "string"
        ? (params as Record<string, unknown>)["model"] as string
        : fam);
    const boardCheck = this.admitStageModel(card, address);
    if (!boardCheck.ok) return { message: boardCheck.error, code: "invalid_request" };
    let prep: PreparedCard;
    try {
      prep = prepareCardParams(this, rawBody ?? params, address, "1");
    } catch (e) {
      if (e instanceof CardArmError) return { message: e.message, code: e.code };
      throw e;
    }
    // THE LANE JUDGES THE BODY, NEVER THE OVERLAY (the work audit's
    // CRITICAL — a THIRD half-landed fix, and the exact one phase1's
    // own comment warns about: `model` is an envelope key, so the
    // overlaid params carry no address, laneVerdict's model-less arm
    // stands down, and the lane surface + relation laws NEVER RAN at
    // validate — an export conflict answered ok:true here while the
    // bench and the start door both refused it). The run seat already
    // judges `body`; the seats now judge the same thing.
    const laneRefusal = this.laneVerdict(card, rawBody ?? params);
    if (laneRefusal !== null) {
      return { message: laneRefusal, code: "lane_refusal" };
    }
    try {
      await composeOnce(this, prep.card, prep.modelId, prep.params, "", "1");
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
    const prep: PreparedCard = prepareCardParams(this, body, mid, "1");
    // THE BOARD CHECK RIDES THE RUN SEAT TOO (the behavioural
    // re-check's BYPASS 1: the bench refused an unoffered model
    // address, but `validate` with the SAME address composed the
    // family HEAD and answered ok — two seats, one law, opposite
    // verdicts). The same exact-address check the write door runs,
    // here at the door that composes.
    const boardCheck = this.admitStageModel(prep.card, body["model"]);
    if (!boardCheck.ok) {
      throw new CardArmError(400, boardCheck.error, { code: boardCheck.code });
    }
    // THE REFUSAL-ORDER LAW (2026-09-21, roadmap §10's e2e debt):
    // ADMISSION runs before the lane-presence gate — a body-shape
    // refusal is knowable without any weights (box-independent);
    // presence is an environment question and follows. Before this
    // order a weight-absent box heard the presence voice even for
    // garbage bodies, and the compose-smoke /recipe/ wall held only
    // on boxes carrying the encoders.
    admissionRefusal(this, prep.card, prep.fam, liftStanza(prep.params), "1");
    // THE LANE GATE RIDES THE RUN TOO (li-o, 2026-10-10): the
    // bench-write door judges the DECL's surface + relation words
    // when a state is BUILT, but a RESTORED row (the archive loads,
    // Run teaches) and any writer that predates the door arrive here
    // unjudged. The run seat is where the declaration gets its second
    // voice — ONE spelling (laneVerdict), the same judgment the form
    // renders and the write door refuses on, so no card needs a
    // hand-written copy of the law to be safe at Run.
    //
    // THE BODY, NOT THE PREPARED PARAMS (the second probe, the same
    // hour): `model` is a card-envelope key — liftCardParams consumes
    // it — so judging prep.params here reads no model at all and
    // judges NOTHING. The write door judges the body, so the run seat
    // judges the body: laneVerdict runs its own prepareCardParams (one
    // resolution, the same one composeOnce gets) and reaches the same
    // verdict. (Confirmed by the door audit's receipt: judging
    // prep.params made every state admit.)
    const laneRefusal = this.laneVerdict(prep.card, body);
    if (laneRefusal !== null) {
      throw phaseRefusal("1", laneRefusal);
    }
    // THE LANE PRESENCE GATE (one pattern, every family): before any
    // graph composes, the family's declared lane files must stand on
    // disk. Img Gen vs Img Edit was luck, not law — this is the law.
    // (The gate throws on a missing lane file and returns null when
    // the lane stands — the refusal is a throw, never a value, so
    // there is no return-value arm here.) A FAMILYLESS card-unit
    // (the Run-press compose) skips it: no family row declares
    // lanes, and the card's own pins gate loud at the engine's load
    // (the YOLO/SAM2 checkpoints refuse hard when absent).
    if (prep.familyless !== true) {
      lanePresenceRefusal(prep.fam);
    }
    const spells: readonly string[] = prep.decl.spells;
    const pool: Record<string, unknown> = {};
    for (const k of spells) {
      const v: unknown = prep.params[k];
      if (k in prep.params && typeof v === "string" && v.startsWith("$")) pool[k] = v;
    }
    if (Object.keys(pool).length > 0) {
      return { ...prep, spell: { skeleton: prep.skeleton, inputs: pool } };
    }
    // the RESOLVED address, not the family atom (BROKEN-C)
    await composeOnce(this, prep.card, prep.modelId, prep.params, "", "1");
    return { ...prep, spell: null };
  }

  /** Phase 2 (the real run id): composes the SAME overlaid body phase
   *  1 validated (submit 1294-1301 — idempotent, absent-keys-only;
   *  the editor's seeded stamps pass through byte-identical).
   *  A $spell body composes VERBATIM here (run context — the $spell
   *  wires into the Load* file slot; the merged path refuses a
   *  link-in-file-slot LOUDLY, test_two_card_flow). */
  async phase2Card(p1: Phase1Card, runId: string): Promise<ComposedCard> {
    const graph: Record<string, unknown> = await composeOnce(this, 
      p1.card,
      p1.modelId,
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
    const def = this.defsSync().get(p1.card)
    if (def === undefined) {
      throw new CardArmError(400, `unknown card ${p1.card}`, "card_compose")
    }
    let flow: { outputs: Record<string, string>; outputNodes: Record<string, string> }
    try {
      flow = resolveCardFlowOutputs(def, p1.params, graph)
    } catch (error) {
      if (error instanceof ComposeRefusal) {
        throw new CardArmError(400, `${error.code}: ${error.message}`, "card_compose")
      }
      throw error
    }
    return { graph, skeleton: p1.skeleton, spell: p1.spell, ...flow };
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



// ── resolution front half (shared by start phase-1 + validate) ────
// (Lives on the service now — prepareCardParams is
// CardRegistryService.prepareCardParams; the module keeps only the
// result shapes below.)

export interface PreparedCard {
  readonly mid: string;
  readonly fam: string;
  /** THE ADDRESS THE ENGINE COMPOSES (2026-10-10, the behavioural
   *  audit's BROKEN-C — the sharpest find of the sweep). The variant
   *  coordinate is CONSUMED at the lift (`model` is an envelope key,
   *  so the base variant's re-point `model: 'qwen3-tts-base'` was
   *  dropped), and composeOnce passed the FAMILY ATOM instead — so
   *  the engine composed the head lane's facts row and a bench-
   *  ADMITTED clone state (`variant: base` + the reference pair)
   *  refused at Run with "fires nothing outside the Base variant".
   *  Bench and run disagreed about a state both had accepted. The
   *  resolved route rides here, and the compose takes it. */
  readonly modelId: string;
  readonly card: string;
  readonly skeleton: string;
  readonly decl: CardDeclRow;
  readonly params: Record<string, unknown>;
  /** THE CARD-UNIT MARK (2026-10-08, the Run-press law): true when
   *  this PreparedCard composes a family-less card addressed by its
   *  own id (the bench Run press's shape) — no family row stands
   *  behind it, so the family-keyed gates (lane presence) skip and
   *  the card's declaration owns every default. */
  readonly familyless?: boolean;
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
  readonly outputs: Record<string, string>;
  readonly outputNodes: Record<string, string>;
}

// ── the two phases (steps 7 + 9, shared by start; phase-1 shared
// by validate's in-process future — today validate shells the CLI
// with the same prepared params) ───────────────────────────────────

export interface Phase1Card extends PreparedCard {
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}
