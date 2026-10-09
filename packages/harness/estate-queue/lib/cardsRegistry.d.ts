import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import type { CardDefinition, FactsReads } from "@melite/comfyui-cordis";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.js";
export { CardArmError } from "./cardsArmError.js";
import type { CardDeclRow, ModelFactsRow } from "./cardsFacts.js";
export { selectCardVariant, stampCardOverlay, liftCardParams } from "./cardsVariant.js";
export type { VariantSelection } from "./cardsVariant.js";
export type { CardDeclRow, ModelFactsRow, VariantCellRow, ResolvedVariantRow } from "./cardsFacts.js";
/** The card-envelope keys: SELECT the graph, never ride it.
 *
 *  THE ROW COORDINATES ARE THE CONTRACT'S (the operator's live
 *  refusal, 2026-09-28: "compose-door: unknown param(s) on the
 *  image-gen card: card" — the whole-bench run composes each stage
 *  with `{ ...params, card }` (runsRegistry.ts:516), and `card` was
 *  in NO list here, so the row's own coordinate rode the card's knob
 *  bag and the admission gate refused the operator's Run ALL with a
 *  key the door had just added itself. The envelope now carries the
 *  contract's WIRE_STAGE_KEYS — the ONE list of what a stage row IS
 *  — instead of a hand-picked few, so a coordinate can never ride a
 *  card again, and a new stage key is filtered by derivation rather
 *  than by remembering to add it here.
 *
 *  DOOR_KEYS (yaml/flow/flow_inline/model) and the run/bench
 *  coordinates (draft_id/test/service) stay named beside them: they
 *  are door vocabulary, not row vocabulary. */
export declare const CARD_ENVELOPE_KEYS: readonly string[];
/** The card-lane refusal: status + the _refusal envelope shape
 *  (error, code, then loc/expected/got) — the door maps it through
 *  the local refusal path. */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
 * guard (it THROWS on unknown ids); the id is the fallback.
 * Exported for the wall (both arms pin: the face serves, the
 * unknown degrades to the id — never a throw into a serve). */
export declare function familyFace(fam: string): string;
export declare class CardRegistryService extends Service {
    static inject: string[];
    /** The primed card definitions (null until prime()). */
    private defs;
    /** The frozen model facts (lazy — strict load, throws LOUD). */
    private facts;
    /** Route address → family owner from the registry-derived facts. */
    private owners;
    /** Registry reads for the row derivation (primed with the models boot). */
    private reads;
    /** The decl projection (lazy — derived from defs + facts). */
    private decls;
    /** The engine's live node-definitions doc (/object_info via the
     *  SDK client, cached per process on the engine side; primed by
     *  primeObjectInfo before any compose). null = not yet primed or
     *  the engine is unreachable. */
    private oi;
    /** The catalog existence set (lazy — strict load, throws LOUD). */
    private mids;
    constructor(ctx: Context);
    /** The §23 manifest for the compose gate's dangling sweep (the
     *  ComposeSeat seam): one law from the queue seat — config-named
     *  roots, never the retired env seam (J12). */
    stateRoots(): readonly string[];
    /** Prime the registry (service init — replaces the retired
     *  primeCardRegistry()): the registry loads async (dynamic
     *  card-module imports) but the validate/disclosure rims are sync,
     *  so every boot primes and the request path projects
     *  synchronously. Safe to call multiple times (unconditional
     *  reload — mirrors the old both-boot-sites prime); re-prime
     *  drops the defs-derived decls (facts/mids are disk-derived and
     *  stay). The provider's apply primes, and both main.ts boot
     *  sites re-prime belt-and-braces. */
    prime(): Promise<void>;
    /** Test seam: drop all registry state (walls boot fresh processes;
     *  belt-and-braces for in-process reuse — the RunsService behavior). */
    resetForTests(): void;
    /** Sync read of the primed registry (the disclosure projection
     *  serves from the registry, and the disclosure doors are sync —
     *  unprimed access throws LOUD, never a fallback). */
    defsSync(): Map<string, CardDefinition>;
    /** The frozen model facts (strict — a missing file throws LOUD;
     *  the validate door keeps its absent-file degrade by catching
     *  this at its own call site). */
    /** Sync read of the primed registry reads (unprimed access throws LOUD). */
    readsSync(): FactsReads;
    modelFacts(): Record<string, ModelFactsRow>;
    /** The decl projection — derived from defs + the strict facts, or
     *  from defs + caller-supplied facts (the validate door's
     *  degraded read; derived fresh, never cached over foreign facts). */
    cardDecls(facts?: Record<string, ModelFactsRow>): Record<string, CardDeclRow>;
    /** The primed live doc (sync face for the sweeps/spec fakes).
     *  null = never primed, or the engine was unreachable at prime. */
    objectInfo(): Record<string, unknown> | null;
    /** Prime the live node-definitions doc off the engine (/object_info
     *  via the SDK, cached per process). Never throws: false = the
     *  engine is unreachable and the doc stays null (the compose gate
     *  refuses CLOSED on that; the serving surfaces degrade). */
    primeObjectInfo(): Promise<boolean>;
    /** Arm the shared wiring doc from a landed /object_info body —
     *  THE PRODUCTION ARMER (the second wiringWall reseat: the estate
     *  bundle mounts this registry, not the card-plane service, so
     *  THIS seat's prime is where the live lane's doc lands). ONE
     *  derivation, shared with the card-plane service, so every walk
     *  seat judges the same census. A composition that mounts no
     *  wiring provider reads undefined and every wall stands down —
     *  the documented law, never a guessed refusal. */
    armWiringFromDoc(doc: Record<string, unknown> | null): void;
    /** resolve_model's existence half — the LIVE offer (the same
     *  served key set the catalog door answers: buildCatalog's served
     *  models in scan order). It replaces the retired per-model
     *  declaration scan (the declarations are table rows now — a
     *  missing row refuses LOUD, never an empty compose
     *  refused) and the frozen-catalog re-home (2026-09-08 — the blob
     *  is deleted 2026-09-10). A build throw resolves empty (the
     *  validate door's degraded read, same as before). */
    modelMids(): Set<string>;
    /** The owning family for mid: mid itself, or the facts model whose
     *  variant/cell route owns mid (mirrors _route_family;
     *  route-id-as-model is preserved — the graph is addressed by the
     *  family). Reads the strict facts unless the caller passes its
     *  own (the validate door's degraded read). */
    resolveCardFamily(mid: string, facts?: Record<string, ModelFactsRow>): string;
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
    cardFamilies(card: string): Array<{
        id: string;
        present: boolean;
        label: string;
    }>;
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
    admitStageModel(card: string, model: unknown): {
        ok: true;
    } | {
        ok: false;
        error: string;
        offered: string[];
    };
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
    admitStageRelations(card: string, params: Record<string, unknown>): {
        ok: true;
    } | {
        ok: false;
        error: string;
    };
    /** THE LANE VERDICT (li-o's judgment, ONE spelling, two seats):
     *  the DECL's surface + relation words over the prepared state, or
     *  null when the lane accepts it. The bench-write door refuses on
     *  it at build time; the RUN seat (phase1Card) refuses on it too —
     *  the declaration, not the card's hand-written belt, is what
     *  teaches an archived row that slipped the write door. Everything
     *  that is not the DECL's own words (unknown variant/quant, a
     *  dangling ref, a familyless unit, a legacy family that declares
     *  nothing) returns null and keeps the other door's voice. */
    /** The lane verdict as its sentence (the write door's and the
     *  validate seat's currency — the class rides only where the run
     *  seat needs it, via laneVerdictDetailed). */
    private laneVerdict;
    /** A lane verdict with its class: `incomplete` is true exactly
     *  when EVERY violation is an UNSTATED required word — the
     *  incomplete-draft class the write door admits and the client
     *  keeps off the run face (the replayed-refusal bug, 2026-10-18).
     *  Every other refusal (undeclared keys, selections, envelopes,
     *  bounds) is authored state and stays a failure carry. */
    private laneVerdictDetailed;
    /** The draft (model-less) row's verdict: the words EVERY boarded
     *  declaring family states, judged over the raw params — the
     *  intersection law (see the model-less branch above). Bounds
     *  intersect per field (the tightest span all families agree
     *  holds); relation rows bind when every family states the row
     *  verbatim. A card with no declaring family stays null (the
     *  familyless tolerance). */
    private modellessDraftVerdict;
    private laneVerdictCore;
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
    repairStageModel(card: string, model: string): {
        model: string;
        variant?: string;
    } | null;
    /** The seated mcp:<server> engine ids, sorted — the generic MCP
     * card's LIVE board (the same census the catalog/forms folds
     * serve). The same lane-read spelling runsRegistry's flow_inline
     * compile uses: the implicit seat get returns undefined when no
     * engines service is registered — a registry-only boot (walls,
     * fixtures) folds an empty census and card 'mcp' refuses with its
     * own voice, never a silent pass. */
    private seatedMcpEngines;
    resolveStageParams(body: Record<string, unknown>): Record<string, unknown> | null;
    /** In-process validate compose (the CLI subprocess retired,
     *  2026-09-09): the SAME composeOnce pipeline the start path
     *  rides — facts + pin snapshot + stanza unwrap + admission gate
     *  + ctx.comfyui.compose — surfaced as the validate door's
     *  Refusal shape (null = composed OK; validate needs no graph).
     *  One plane composes for both doors (start + validate); the
     *  per-request execFileSync subprocess (one node boot per
     *  validate call) is dead. */
    composeValidateCard(card: string, fam: string, params: Record<string, unknown>, mid?: string, rawBody?: Record<string, unknown>): Promise<{
        message: string;
        code: keyof typeof RUNS_ERROR_CODES;
    } | null>;
    /** Phase 1 (run_id ""): validates shape/admission/boarding before
     *  registration. The $spell branch composes NO graph (the pool
     *  passes — the two-card-flow handoff). */
    phase1Card(body: Record<string, unknown>, mid: string): Promise<Phase1Card>;
    /** Phase 2 (the real run id): composes the SAME overlaid body phase
     *  1 validated (submit 1294-1301 — idempotent, absent-keys-only;
     *  the editor's seeded stamps pass through byte-identical).
     *  A $spell body composes VERBATIM here (run context — the $spell
     *  wires into the Load* file slot; the merged path refuses a
     *  link-in-file-slot LOUDLY, test_two_card_flow). */
    phase2Card(p1: Phase1Card, runId: string): Promise<ComposedCard>;
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
export declare const cardRegistryProvider: {
    name: string;
    inject: string[];
    apply(ctx: Context): Promise<void>;
};
/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.cardRegistry — a
 *  bug, so reads throw LOUD (a registry read without a registry is
 *  never an empty answer). Door listeners MUST pass
 *  ctx.cardRegistry (their inject declares it). */
export declare function needCardRegistry(cards: CardRegistryService | null | undefined, where: string): CardRegistryService;
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
export interface ComposedCard {
    readonly graph: Record<string, unknown>;
    readonly skeleton: string;
    readonly spell: {
        skeleton: string;
        inputs: Record<string, unknown>;
    } | null;
    readonly outputs: Record<string, string>;
    readonly outputNodes: Record<string, string>;
}
export interface Phase1Card extends PreparedCard {
    readonly spell: {
        skeleton: string;
        inputs: Record<string, unknown>;
    } | null;
}
//# sourceMappingURL=cardsRegistry.d.ts.map
