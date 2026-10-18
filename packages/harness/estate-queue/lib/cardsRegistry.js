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
// the survey's verdict: import
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
//   5. R1 variant/quant wire contract (survey §5.3 + §6 R1): body `variant`/`quant` keys select the matrix cell when stated (matched against facts variant id/route + cell quant).
//      Unstated coordinates fall to the FIRST non-Recipe variant / first cell (selectCardVariant in cardsVariant.ts, re-exported through this file's surface).
//      Route-id-as-model is preserved (resolveCardFamily).
//      The keys are CONSUMED (never reach compose — no card declares them).
//   6. envelope lift (card_compose_body 363-372: body minus
//      CARD_ENVELOPE_KEYS restaged as {params}) + the nested-stanza
//      unwrap (cli.ts:82-91 — a `params` dict key IS the stanza).
//   7. $spell phase-1 rule (composeOnce in cardsCompose.ts): a phaseless call (run_id "") whose spell params carry $ values composes NO graph.
//   8. admission-contract gate (the cli door's verbatim voice).
//   9. in-process compose: ONE Context + ComfyUIService +
//      auto-loaded cards (the cli loop), setFacts +
//      setObjectInfo (live /object_info doc via the SDK client —
//      R3: an unreachable engine refuses CLOSED, never composes
//      unauthenticated), ctx.comfyui.compose(card, family, params,
//      runId) — the same call the cli door makes. ComposeRefusal.code
//      maps to the refusal detail.
//  10. Stage-row wrap (the rim, composeOnce in cardsCompose.ts): {id: skeleton (the card definition, fallback: the posted mid), engine comfyui, params: {workflow: graph}}.
//      The row rides the EXISTING engine layer (engine/comfyui.ts executeFlow) exactly like flow_inline runs (L3 routing, upload walk, harvest, interrupt, timeout all reused untouched).
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
import { bootModels, cardDefsNow, ComposeRefusal, getModel, liveScanOrder, loadCardDefs, loadFacts, owningAtom, registryIds, registryModel, resolveCardFlowOutputs, theService } from "@melite/comfyui-cordis";
import { DOOR_KEYS } from "./runsGates.js";
import { CardArmError, EnvelopeRefusal, phaseRefusalCode } from "./cardsArmError.js";
export { CardArmError } from "./cardsArmError.js";
import { factsPath, deriveDecls } from "./cardsFacts.js";
import { WIRE_STAGE_KEYS } from "@melite/contracts/benchStage";
import { isUnstatedRequiredVoice, judgeLaneBounds, judgeLaneRelations, judgeLaneSurface, laneBoundsOf, laneStaleCarry, laneSurfaceOf, laneTogetherClosure, RELATION_WORDS } from "@melite/contracts/laneRelations";
import { lanePresenceRefusal } from "./cardsLanes.js";
import { selectCardVariant, liftCardParams } from "./cardsVariant.js";
// the extracted planes re-export through the registry's public
// surface (the walls import these names from here — one door)
export { selectCardVariant, stampCardOverlay, liftCardParams } from "./cardsVariant.js";
import { deriveWiringDoc, liveObjectInfo, resolveEngineBaseUrl } from "@melite/comfyui-cordis";
import { admissionRefusal, composeOnce, liftStanza, prepareCardParams } from "./cardsCompose.js";
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
export const CARD_ENVELOPE_KEYS = [
    ...DOOR_KEYS,
    // …every wire coordinate EXCEPT `params` — and the exception is the
    // load-bearing one. `params` is the row's knob CONTAINER: the run
    // body's `{model, params:{…}}` stanza is what liftCardParams
    // unwraps (the stanza law, benchStage's own), and filtering the
    // container BEFORE that unwrap would drop every knob a caller sent
    // — the first cut of this list did exactly that and turned every
    // run into "this lane requires 'prompt'". A coordinate selects the
    // graph; the knobs ride inside `params`, never as a key of it.
    ...WIRE_STAGE_KEYS.filter((k) => k !== "params"),
    "draft_id",
    "test",
    "service",
    // press_key is the submit door's retry-dedup coordinate
    // (queueSubmit names ONE press across retries) — door
    // vocabulary, never a card knob. It rode unregistered and the
    // live Run press refused "unknown param(s) … press_key" while
    // the whole suite stayed green (the contract-depth red,
    // 2026-10-24): no wall drove a press_key-carrying body.
    "press_key",
    // the bench row's own non-wire coordinates (benchStage's stage row
    // carries these beside the wire keys; they select, they never ride)
    "author",
    "rev",
    "stage",
    "title",
    "inputOutputs",
    "result",
    "runStatus",
    "expect_rev",
    "provenance",
    "capability",
];
/** The card-lane refusal: status + the _refusal envelope shape
 *  (error, code, then loc/expected/got) — the door maps it through
 *  the local refusal path. */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
 * guard (it THROWS on unknown ids); the id is the fallback.
 * Exported for the wall (both arms pin: the face serves, the
 * unknown degrades to the id — never a throw into a serve). */
export function familyFace(fam) {
    try {
        return registryModel(fam).label;
    }
    catch {
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
/** THE INCOMPLETE-DRAFT LAW (2026-10-10, the operator's second
 *  face — "Generate Image: lane 'krea-2/turbo' refuses the state:
 *  this lane requires 'prompt'" AT THE ADD DOOR, and "I CAN'T ADD
 *  CARDS"): a required word that is simply UNSTATED is not a
 *  write-door refusal — a card under construction is bench state,
 *  and the add door seeds the axes (model/variant) with no content
 *  because the operator types the prompt next. A write-door
 *  required-word refusal made adding an image impossible, which is
 *  the opposite of the contract the operator asked for ("THERE
 *  SHOULD HAVE BEEN A CONTRACT, SO USERS CAN ADD CARDS").
 *
 *  The split, one line: an UNSTATED required word is the RUN door's
 *  voice (it judges the same words in the same sentence when the
 *  press composes); a STATED-but-wrong state (a knob that fires
 *  nothing on this lane, a number out of its declared bounds, a
 *  conflict, an unknown selection) still refuses HERE — that state
 *  can never compose and the operator learns at the keystroke. The
 *  judge is the contracts' own (laneRelations): the required class
 *  is the one whose sentence opens "this lane requires".
 *
 *  THE FILTER IS SEAT-SCOPED (the four-agent law audit, 2026-10-10,
 *  its one violation): the first cut filtered inside the SHARED
 *  judge, so the run and validate seats stopped hearing the
 *  required word too and the DECL went decorative — enforcement
 *  survived only because every live card duplicates the word as an
 *  imperative belt. Only the WRITE door's call passes
 *  admitIncomplete=true; every other seat judges the declaration
 *  strict (li-o's own law: "no card needs a hand-written copy of
 *  the law to be safe at Run"). The belt remains as backstop for
 *  families that declare nothing. */
/** The unstated-required-word class test: the contracts' judge owns
 *  the sentence stem (isUnstatedRequiredVoice — the one spelling).
 *  Named — the run seat's refusal code and the write door's filter
 *  spell the same class through it. */
function isUnstatedRequiredWord(message) {
    return isUnstatedRequiredVoice(message);
}
function incompleteDraftViolations(violations) {
    return violations.filter((v) => !isUnstatedRequiredWord(v.message));
}
/** THE OUTPUT-RESOLUTION SEAM (round-22 compose audit Q4a,
 *  VALIDATE-RESOLVES-OUTPUTS): phase 2's def lookup + output
 *  resolution with the run seat's exact voices, shared by the run
 *  seat (phase2Card, thrown as CardArmError) and the validate seat
 *  (composeValidateCard, folded to its verdict). Validate composed
 *  the graph and discarded it, so every phase-2 output refusal
 *  answered validate-green/start-refuse on the binding cards; the
 *  seat resolves over its phase-1 graph now — same overlaid
 *  params, same graph, same refusal. Cards without bindings
 *  resolve vacuously (the resolver returns {}), so their seats
 *  answer exactly as before.
 * @param defs the card definitions table
 * @param card the card id (prepare already admitted it)
 * @param params the prepared params (the overlaid truth both doors hold)
 * @param graph the composed graph
 */
export function resolveCardOutputsOrThrow(defs, card, params, graph) {
    const def = defs.get(card);
    if (def === undefined) {
        throw new CardArmError(400, `unknown card ${card}`, "card_compose");
    }
    try {
        return resolveCardFlowOutputs(def, params, graph);
    }
    catch (error) {
        if (error instanceof ComposeRefusal) {
            throw new CardArmError(400, `${error.code}: ${error.message}`, "card_compose");
        }
        // PHASE2-CATCH-ALL (round-22 compose audit Q5a): a non-refusal
        // throw here — a flowKinds-less def, a binding `when` that
        // throws — is this card's output resolution failing on the
        // request, and it rides the same 400 envelope as the refusal
        // arm: both doors catch CardArmError only, so a raw rethrow
        // surfaced as a 500.
        const why = error instanceof Error ? error.message : String(error);
        throw new CardArmError(400, `flow-output: ${card}: ${why}`, "card_compose");
    }
}
export class CardRegistryService extends Service {
    static inject = ["queue"];
    /** The primed card definitions (null until prime()). */
    defs = null;
    /** The frozen model facts (lazy — strict load, throws LOUD). */
    facts = null;
    /** Route address → family owner from the registry-derived facts. */
    owners = {};
    /** Registry reads for the row derivation (primed with the models boot). */
    reads = null;
    /** The decl projection (lazy — derived from defs + facts). */
    decls = null;
    /** The engine's live node-definitions doc (/object_info via the
     *  SDK client, cached per process on the engine side; primed by
     *  primeObjectInfo before any compose). null = not yet primed or
     *  the engine is unreachable. */
    oi = null;
    /** The doc the process singleton was last armed with (the re-arm
     *  guard — auditor G's row: a weight landing changes the doc
     *  identity, and the singleton must follow it; an unchanged doc
     *  re-arms nothing). null = never armed (or a boot re-prime). */
    singletonArmedOi = null;
    /** The catalog existence set (lazy — strict load, throws LOUD). */
    mids = null;
    constructor(ctx) {
        super(ctx, "cardRegistry");
    }
    /** The §23 manifest for the compose gate's dangling sweep (the
     *  ComposeSeat seam): one law from the queue seat — config-named
     *  roots, never the retired env seam (J12). */
    stateRoots() {
        return this.ctx.queue.stateRoots;
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
    async prime() {
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
        // the boot arm rides the guard too: primeObjectInfo just armed
        // the fresh doc (or skipped an unchanged one — a skip means the
        // singleton already serves that exact doc)
        this.armSingletonFromDoc(this.oi);
    }
    /** Re-arm the process singleton when the primed doc CHANGED (the
     *  re-arm row, 2026-10-22): prime() boots the singleton once; the
     *  re-primes that follow a weight landing (the landing arms drop
     *  the live doc, so the next read is a fresh fetch — a NEW doc
     *  identity) keep the serving surfaces — the spec door's packs
     *  block, the load bundle's pack hints — current without a
     *  reboot. The identity guard keeps the hot-cache path free: an
     *  unchanged doc re-arms nothing (no per-run facts read). An
     *  unresolvable singleton degrades the serving surfaces to
     *  unknown marks — never a throw on the prime path. */
    armSingletonFromDoc(doc) {
        if (doc === this.singletonArmedOi)
            return;
        this.singletonArmedOi = doc;
        try {
            const svc = theService();
            svc.setObjectInfo(doc);
            svc.setFacts(loadFacts(factsPath(), this.readsSync()));
        }
        catch {
            // the singleton is not resolvable in this context — the
            // serving surfaces degrade to unknown marks (compose still
            // arms its own fresh service)
        }
    }
    /** Test seam: drop all registry state (walls boot fresh processes;
     *  belt-and-braces for in-process reuse — the RunsService behavior). */
    resetForTests() {
        this.defs = null;
        this.facts = null;
        this.owners = {};
        this.reads = null;
        this.decls = null;
        this.oi = null;
        this.singletonArmedOi = null;
        this.mids = null;
    }
    /** Sync read of the primed registry (the disclosure projection
     *  serves from the registry, and the disclosure doors are sync —
     *  unprimed access throws LOUD, never a fallback). */
    defsSync() {
        if (this.defs === null) {
            throw new Error("[card_registry] unprimed: boot must await the estate-card-registry " +
                "provider (or ctx.cardRegistry.prime()) before the " +
                "disclosure rim serves (the estate composition's " +
                "estate-card-registry row primes; boot rigs settle-poll " +
                "for the seats)");
        }
        // THE ONE TRUTH (the G2 receipt, 2026-10-11): /v1/forms serves
        // loadCardDefs()'s module cache and refreshCardDefs() swaps it;
        // this seat used to return its own boot-time copy, so a
        // live-mounted hot card served in forms and REFUSED at
        // POST /v1/flows/validate ("is not a registered card") — the
        // boot snapshot forked the truth. The prime stays (boot must
        // still build the cache + models + object info, and this.defs
        // is the primed proof); the READ rides the one cache. Cold and
        // steady-state boots are byte-identical: cardDefsNow() is the
        // same object prime() captured until a refresh swaps it.
        /* v8 ignore next -- prime() takes this.defs FROM loadCardDefs(),
         * the same module cache cardDefsNow() returns — the ?? arm wants
         * a null module cache beside a non-null primed table, and no
         * seat can build one (audit 2026-10-13, call-site proof). */
        return cardDefsNow() ?? this.defs;
    }
    /** The frozen model facts (strict — a missing file throws LOUD;
     *  the validate door keeps its absent-file degrade by catching
     *  this at its own call site). */
    /** Sync read of the primed registry reads (unprimed access throws LOUD). */
    readsSync() {
        if (this.reads === null) {
            throw new Error("[card_registry] unprimed: boot must await the estate-card-registry " +
                "provider (or ctx.cardRegistry.prime()) before rows derive " +
                "(the models boot feeds facts.ts through these reads)");
        }
        return this.reads;
    }
    modelFacts() {
        if (this.facts !== null)
            return this.facts;
        // rows assemble from the registry + frozen card slices (the
        // derivation is the single matrix — no frozen spelling).
        const doc = loadFacts(factsPath(), this.readsSync());
        this.facts = doc.models;
        this.owners = { ...doc.owners };
        return this.facts;
    }
    /** The decl projection — derived from defs + the strict facts, or
     *  from defs + caller-supplied facts (the validate door's
     *  degraded read; derived fresh, never cached over foreign facts). */
    cardDecls(facts) {
        if (facts !== undefined)
            return deriveDecls(this.defsSync(), facts);
        // THE HOT-SWAP EPOCH (audit 2026-10-22, the serve-yes/run-no
        // cure): refreshCardDefs() swaps the defs module cache —
        // defsSync() follows it, but this projection keyed on nothing
        // and kept serving the boot snapshot (a hot card served in
        // forms, then refused at validate/run). The cache re-derives
        // once when the cache identity differs from the primed proof;
        // facts/owners/mids stay untouched (disk/boot derived, not
        // defs-derived).
        const now = cardDefsNow() ?? this.defs;
        if (this.decls === null || now !== this.defs) {
            const derived = deriveDecls(this.defsSync(), this.modelFacts());
            this.decls = derived;
            this.defs = now;
        }
        return this.decls;
    }
    /** The primed live doc (sync face for the sweeps/spec fakes).
     *  null = never primed, or the engine was unreachable at prime. */
    objectInfo() {
        return this.oi;
    }
    /** Prime the live node-definitions doc off the engine (/object_info
     *  via the SDK, cached per process). Never throws: false = the
     *  engine is unreachable (or the census outruns the bound) and
     *  the doc stays null (the compose gate refuses CLOSED on that;
     *  the serving surfaces degrade).
     *
     *  THE PRIME BOUND (the gate-37 flake cure, 2026-11-07): the boot
     *  census is the ONLY unbounded fetch on the estate boot path —
     *  no signal, no boundMs — so a wedged engine hangs every boot
     *  behind it forever (the 15s settle polls red first, but the
     *  hang is the production wound). 60s is 300× the quiet 0.2s
     *  fetch and past every loaded-but-alive observation; past it
     *  the prime degrades instead of hanging. */
    async primeObjectInfo(boundMs = 60_000) {
        try {
            this.oi = await liveObjectInfo(resolveEngineBaseUrl(), undefined, boundMs);
            this.armWiringFromDoc(this.oi);
            this.armSingletonFromDoc(this.oi);
            return true;
        }
        catch {
            this.oi = null;
            this.armWiringFromDoc(null);
            // the singleton keeps its last armed doc — an unreachable
            // engine never degrades a healthy serving surface
            return false;
        }
    }
    /** Arm the shared wiring doc from a landed /object_info body —
     *  THE PRODUCTION ARMER (the second wiringWall reseat: the estate
     *  bundle mounts this registry, not the card-plane service, so
     *  THIS seat's prime is where the live lane's doc lands). ONE
     *  derivation, shared with the card-plane service, so every walk
     *  seat judges the same census. A composition that mounts no
     *  wiring provider reads undefined and every wall stands down —
     *  the documented law, never a guessed refusal. */
    armWiringFromDoc(doc) {
        const wiring = this.ctx.get("comfyuiWiring");
        if (wiring === undefined)
            return;
        if (doc === null) {
            wiring.disarm();
            return;
        }
        const { nodes, inputs } = deriveWiringDoc(doc);
        wiring.arm(nodes, inputs);
    }
    /** resolve_model's existence half — the LIVE offer (the same
     *  served key set the catalog door answers: buildCatalog's served
     *  models in scan order). It replaces the retired per-model
     *  declaration scan (the declarations are table rows now — a
     *  missing row refuses LOUD, never an empty compose
     *  refused) and the frozen-catalog re-home (2026-09-08 — the blob
     *  is deleted 2026-09-10). A build throw resolves empty (the
     *  validate door's degraded read, same as before). */
    modelMids() {
        if (this.mids !== null)
            return this.mids;
        let ids;
        try {
            ids = liveScanOrder();
        }
        catch {
            /* v8 ignore start -- liveScanOrder reads the booted class tree
               (never throws in practice): the degrade never fires (2026-09-12) */
            ids = [];
            /* v8 ignore stop */
        }
        this.mids = new Set(ids);
        return this.mids;
    }
    /** THE LANDING RE-ARM (the cards-plane batch's weight-landing row):
     *  every presence face (cardFamilies' present flags, admitModel's
     *  downloaded list) reads this.mids, and the cache froze at boot —
     *  a weight landed mid-process (provision_model, download_model,
     *  acquire_weight) served present:false until a reboot. This drops
     *  the cache; the NEXT read re-derives from the live scan order.
     *  The manage plane calls it on every model landing under a living
     *  process. No truth outside mids changes: facts/owners/defs are
     *  DECL-derived, and a landing moves files, not declarations. */
    rearmWeights() {
        this.mids = null;
    }
    /** The owning family for mid: mid itself, or the facts model whose
     *  variant/cell route owns mid (mirrors _route_family;
     *  route-id-as-model is preserved — the graph is addressed by the
     *  family). Reads the strict facts unless the caller passes its
     *  own (the validate door's degraded read). */
    resolveCardFamily(mid, facts) {
        const table = facts ?? this.modelFacts();
        if (facts === undefined || facts === this.facts) {
            const owner = this.owners[mid];
            if (owner !== undefined && owner !== mid && owner in table)
                return owner;
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
            if (typeof owner === "string" && owner !== mid && owner in table)
                return owner;
            return mid;
        }
        // (every real route is also a catalog mid — the mid/family/mids
        // hits above always win. Census 2026-09-12: zero routes outside
        // mids — the lens arms never fire through this path.)
        for (const [fam, row] of Object.entries(table)) {
            for (const v of row.variants ?? []) {
                /* v8 ignore next */
                if (v.route === mid)
                    return fam;
                for (const c of v.cells ?? []) {
                    /* v8 ignore next */
                    if (c.route === mid)
                        return fam;
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
    cardFamilies(card) {
        const def = this.defsSync().get(card);
        const mids = this.modelMids();
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
    admitStageModel(card, model) {
        // THE CARD ITSELF IS ADMITTED FIRST (2026-09-15 — a compose
        // agent loaded flow 'image-upscale' as a card stage and wiped
        // the live bench): model-less rows used to pass unchecked, so a
        // flow id (or a typo) sailed onto the bench unquestioned. An
        // unknown card refuses AT WRITE TIME with the flow hint when
        // the id names a flow.
        const def = this.defsSync().get(card);
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
                const seated = this.seatedMcpEngines();
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
                        error: "model '" + model + "' is not a seated MCP server (seated: " + seated.join(", ") + ")",
                        offered: seated,
                    };
                }
                return { ok: true };
            }
            const flow = this.ctx.get("meliteFlows").get(card);
            if (flow !== undefined) {
                // The stage list names BOTH planes' riders: card stages by
                // card id, family stages by family.action (the five census
                // flows carry no card at all — compose-at-expansion, stroke 4).
                const cardRiders = [];
                const familyRiders = [];
                for (const s of flow.stages) {
                    const stage = s;
                    if (typeof stage.card === "string" && stage.card !== "") {
                        cardRiders.push(stage.card);
                    }
                    else if (typeof stage.family === "string" && stage.family !== "") {
                        familyRiders.push(stage.family + "." +
                            (typeof stage.action === "string" ? stage.action : "?"));
                    }
                }
                return {
                    ok: false,
                    // The honest split: card riders compose onto the bench
                    // with add_stage; family riders (family.action) compose
                    // at expansion when the FLOW runs — the bench has no
                    // family-stage seat, so promising add_stage for them
                    // sent makers hunting a door that does not exist (the
                    // census commission, 2026-10-10).
                    error: "'" + card + "' is a flow, not a card — run it through the run doors " +
                        "(melite_flow) where its stages compose at expansion: card riders (" +
                        ([...new Set(cardRiders)].join(", ") || "none") +
                        ") may also be benched with add_stage; family riders (" +
                        ([...new Set(familyRiders)].join(", ") || "none") +
                        ") ride the flow itself (melite_load names the wiring)",
                    offered: [],
                };
            }
            return {
                ok: false,
                error: "card '" + card + "' has no registered card definition",
                offered: [],
            };
        }
        if (typeof model !== "string" || model === "")
            return { ok: true };
        // (CardDefinition pins boarded: readonly string[] — required, and
        // every live def carries it — so no undefined fallback here.)
        const boarded = def.boarded;
        // THE CARD-UNIT ALIAS (the minted-model regression kill,
        // 2026-10-12): a card that boards NOTHING is its own routing
        // key — the GUI's Run press names the card id (stage-run's
        // defaultFamilyForCard), the compose seam lanes it on
        // modelId==='' (cardsCompose's familyless arm), and this
        // check used to refuse the very id that arm requires ("model
        // 'mask' is not offered by card 'mask'", boards: none) — every
        // model-less card's Run died HERE. The card's OWN id is the
        // card-unit arm, never a model offer; any other unboarded id
        // keeps refusing below (the address-must-be-the-offer law).
        if (boarded.length === 0 && model === card)
            return { ok: true };
        const mids = this.modelMids();
        const downloaded = boarded.filter((fam) => mids.has(fam));
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
                error: "model '" + model + "' is not offered by card '" + card +
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
    admitStageRelations(card, params) {
        // THE WRITE DOOR'S OWN CALL passes admitIncomplete — the ONLY
        // seat that admits an unstated required word (the law above).
        const verdict = this.laneVerdict(card, params, true);
        return verdict === null ? { ok: true } : { ok: false, error: verdict };
    }
    /** THE FAMILY ADMISSION (journey-closure B5, 2026-10-17 — hop 3's
     *  first judge, the write doors' arm of the walk): the card's own
     *  family clause (CardDefinition.admitFamily — h3-timeline
     *  declares the t4r inject-keys clause its compose walk enforces)
     *  judges the MERGED params view — the params the next run would
     *  compose — and the refusal speaks the run door's own voice one
     *  hop earlier. Where the model and lane admissions judge
     *  dict membership (board, surface, relation words), THIS judge
     *  runs the family-conditional walk the run door runs, so the
     *  patch door's "the params the NEXT run would compose" claim is
     *  true for family-conditional cards. A card with no definition,
     *  or with no family contract (the optional face absent), passes —
     *  the clause is a no-op for every card that declares no family
     *  walk. A JUDGE, NOT A GUARD (the operator's no-blocker ruling,
     *  CONTRACTS.md §4-17): the verdict refuses the WRITE at the
     *  write door; the stored bench state keeps its own law (loads,
     *  reads, and the restore carve are the drafts side's to honor). */
    admitStageFamily(card, params) {
        const def = this.defsSync().get(card);
        if (def === undefined || def.admitFamily === undefined)
            return { ok: true };
        return def.admitFamily(params);
    }
    /** THE LANE MIGRATION (operator 2026-10-12, the stuck-switch
     *  incident — live on :3088): a write that CHANGES the resolved
     *  lane (the variant axis, the model axis, or both) is a
     *  MIGRATION, never a refusal. Stated members the PRIOR lane's
     *  surface declared but the new lane's does not take are stale
     *  carry — they ride nothing at compose, so the write door DROPS
     *  them and lands the switch (the live wedge: a CustomVoice
     *  draft carrying `voice`, the variant switched to VoiceDesign,
     *  and the write refused "drop it or switch lane" while the form
     *  HIDES the voice row on the new lane — the named cure
     *  unclickable, the switch unlandable). The a priori refusal
     *  keeps its teeth: a member no prior lane declared is authored
     *  state and still refuses at admitStageRelations. The undo
     *  contract: dropped members are NOT resurrected by undoing the
     *  patch that switched the lane — the author re-picks on the lane
     *  they return to (the row's other members survive untouched).
     *  @param card the stage's card id
     *  @param params the MERGED view the write door would judge
     *  @param priorParams the stored row's params BEFORE the merge
     *  @returns the cleaned merged view (a NEW object when members
     *  were dropped; the input reference otherwise) */
    laneMigrate(card, params, priorParams) {
        // one seat's tolerance, both sides: any selection/prepare fault
        // on either view is the ADMISSION's voice, never this seat's —
        // an unresolvable state passes through untouched and refuses
        // (or tolerates) exactly as it did before this seat existed.
        let prepNext;
        let prepPrior = null;
        try {
            const midNext = params["model"];
            if (typeof midNext !== "string" || midNext === "")
                return params;
            prepNext = prepareCardParams(this, params, midNext, "admission");
            // THE MODEL-LESS PRIOR (operator 2026-11-05, the 2511→21
            // wedge): a stage whose family is spec-implied never states
            // `model`, so no prior lane resolves — the old seat returned
            // here and the write refused downstream (the variant's
            // declared surface names nothing the prior lane's words
            // explain). The carry is still identifiable without the prior
            // lane (any member SOME lane declares that the next lane does
            // not take), so the seat continues to the union fallback
            // below; a member NO lane declares stays authored and still
            // refuses.
            const midPrior = priorParams["model"];
            if (typeof midPrior === "string" && midPrior !== "") {
                prepPrior = prepareCardParams(this, priorParams, midPrior, "admission");
            }
        }
        catch {
            return params;
        }
        const facts = this.modelFacts();
        const famNext = facts[prepNext.fam];
        if (famNext === undefined)
            return params;
        const famPrior = prepPrior !== null ? facts[prepPrior.fam] : undefined;
        const cellOf = (fam, sel) => 
        // THE CELL IS PART OF THE LANE (the size-at-quant reshape,
        // operator 2026-10-26): a quant change re-keys the surface
        // when the two cells' surfaces differ — a cell change with a
        // stale member is a MIGRATION, never a refusal.
        fam.variants.find((v) => v.id === sel.variantId)?.cells.find((c) => c.quant === sel.quant)?.params;
        // THE UNION PREV (the model-less prior's surface): every member
        // any lane declares (family ∪ variant ∪ cell, the same cascade
        // laneSurfaceOf reads). A member of the union that the next
        // lane does not take is stale carry from SOMEWHERE — the write
        // drops it and lands. A member of nothing is authored state and
        // survives to refuse.
        const unionPrevSurface = () => {
            const acc = new Set();
            for (const f of Object.values(facts)) {
                for (const n of f.params ?? [])
                    acc.add(n);
                for (const v of f.variants) {
                    for (const n of v.params ?? [])
                        acc.add(n);
                    for (const c of v.cells) {
                        for (const n of c.params ?? [])
                            acc.add(n);
                    }
                }
            }
            return [...acc];
        };
        let selNext;
        let selPrior = null;
        let prevSurface;
        try {
            selNext = selectCardVariant(prepNext.mid, famNext, params, "admission");
            if (prepPrior === null) {
                prevSurface = unionPrevSurface();
            }
            else {
                // A resolved prior whose family the facts do not know is the
                // tolerance law's own shape (a card-addressed Run-press
                // prior, a retired mid): the union would misread its words
                // as some other lane's, so the seat stands aside exactly as
                // it always did.
                if (famPrior === undefined)
                    return params;
                const priorSel = selectCardVariant(prepPrior.mid, famPrior, priorParams, "admission");
                selPrior = priorSel;
                prevSurface = laneSurfaceOf(famPrior.params, famPrior.variants.find((v) => v.id === priorSel.variantId)?.params, cellOf(famPrior, priorSel));
            }
        }
        catch {
            return params;
        }
        // same lane, no migration — a same-lane patch judges exactly as
        // it always did (an off-surface member stated ON the lane it
        // was authored on refuses; this seat never softens that). A
        // model-less prior is never the same lane: the next lane
        // resolves, the prior cannot equal it, so the seat always
        // continues to the union below.
        if (selPrior !== null &&
            prepPrior !== null &&
            prepNext.fam === prepPrior.fam &&
            selNext.variantId === selPrior.variantId &&
            selNext.quant === selPrior.quant) {
            return params;
        }
        const nextSurface = laneSurfaceOf(famNext.params, famNext.variants.find((v) => v.id === selNext.variantId)?.params, cellOf(famNext, selNext));
        // THE TAKEN SETS (operator 2026-11-05, the recipe-switch wedge):
        // the stale rule judges what each side TAKES — the lane surface
        // PLUS that side's absorbed mod fold. Deliberately NOT the
        // card's static words (schemaNames/admits): the lane door judges
        // the variant surface, so a static-carried member the next lane
        // does not take still refuses downstream (the 2511 pair ride the
        // image-edit schema AND the 2511 surface — on the 21 lane the
        // surface is what fires). A mod rider the prior fold absorbed
        // but the next does not take is stale carry exactly like a
        // departed surface member (the image-gen `loras` write refusal);
        // a rider neither fold absorbs is authored state and still
        // refuses downstream. The fold reads theService: it throws in
        // the test fiber (never booted there), so the fold bodies ride
        // the v8-ignored precedent of cardsCompose's own admission —
        // the rule itself stays wallable with literal sets at
        // laneStaleCarry, which takes the sets as plain arrays.
        const takenOf = (surface, atom) => {
            // No surfaceless model family ships in facts (the legacy
            // truth has no live rows) — the null arm is the lane judge's
            // own "declares nothing, judges nothing", exercised with
            // literal sets at laneStaleCarry's wall.
            /* v8 ignore next */
            if (surface === null)
                return null;
            const taken = new Set(surface);
            // (comment corrected 2026-11-06, lane-migration audit finding 4:
            // the old text claimed theService() never boots in the test
            // fiber — FALSE since loadCardDefs sets the globalThis cell at
            // prime(); the fold CONTRIBUTES here (voice_name et al). The
            // v8-ignore regions dropped with the lie: this code executes
            // under the booted registry and owes its coverage.)
            try {
                if (atom === null) {
                    // model-less prior: the generous prev — every pack field
                    // the card absorbs anywhere (a rider absorbed SOMEWHERE is
                    // prior carry, never authored; the next side still judges).
                    for (const pack of theService().cardModFields(card)) {
                        for (const n of Object.keys(pack.fields.dict ?? {}))
                            taken.add(n);
                    }
                }
                else {
                    for (const pack of theService().cardModFields(card)) {
                        if (!pack.families.includes(atom))
                            continue;
                        for (const n of Object.keys(pack.fields.dict ?? {}))
                            taken.add(n);
                    }
                }
            }
            catch (modFoldFault) {
                // modFoldFault: card defs genuinely absent (a bare fiber
                // without prime()) — the absorbed surface is empty here;
                // surfaces + statics judge.
            }
            return [...taken];
        };
        const stale = laneStaleCarry(takenOf(prevSurface, prepPrior !== null ? owningAtom(prepPrior.fam) : null), takenOf(nextSurface, owningAtom(prepNext.fam)), params);
        // THE ORPHANED HALF (the export-pair wedge, voicedesign →
        // customvoice carrying a named export): a together-group is
        // all-or-none at the admission this seat migrates toward — one
        // member dropped as stale while a stated sibling survives (kept
        // because the next lane's absorbed fold takes it) GUARANTEES
        // the downstream refusal ("state all or none"). The relations'
        // own cure is "or drop both": a stale member takes its
        // together-group with it. Groups read from the TARGET lane's
        // judged relations (family + resolved variant — the same rows
        // the admission judges), never the prior's; a sibling already
        // blank is not carried state and stays put.
        // (T2, 2026-11-06) the closure rides the CONTRACTS floor's
        // fixpoint verb — a single pass strands transitively-dropped
        // siblings when overlapping groups declare in the wrong order;
        // the seat and the pure wall now share one spelling.
        const staleSet = laneTogetherClosure([famNext.relations, famNext.variants.find((v) => v.id === selNext.variantId)?.relations], new Set(stale), params);
        if (staleSet.size === 0)
            return params;
        const cleaned = { ...params };
        for (const name of staleSet)
            delete cleaned[name];
        return cleaned;
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
    /** The lane verdict as its sentence (the write door's and the
     *  validate seat's currency — the class rides only where the run
     *  seat needs it, via laneVerdictDetailed). */
    laneVerdict(card, params, admitIncomplete = false) {
        return this.laneVerdictCore(card, params, admitIncomplete)?.message ?? null;
    }
    /** A lane verdict with its class: `incomplete` is true exactly
     *  when EVERY violation is an UNSTATED required word — the
     *  incomplete-draft class the write door admits and the client
     *  keeps off the run face (the replayed-refusal bug, 2026-10-18).
     *  Every other refusal (undeclared keys, selections, envelopes,
     *  bounds) is authored state and stays a failure carry. */
    laneVerdictDetailed(card, params, admitIncomplete = false, factsArg) {
        return this.laneVerdictCore(card, params, admitIncomplete, factsArg);
    }
    /** The draft (model-less) row's verdict: the words EVERY boarded
     *  declaring family states, judged over the raw params — the
     *  intersection law (see the model-less branch above). Bounds
     *  intersect per field (the tightest span all families agree
     *  holds); relation rows bind when every family states the row
     *  verbatim. A card with no declaring family stays null (the
     *  familyless tolerance). */
    modellessDraftVerdict(card, params, admitIncomplete, factsArg) {
        const def = this.defsSync().get(card);
        /* v8 ignore next -- laneVerdict's own defsSync-miss guard (the
         * same lookup, earlier in the same request) already returned on
         * a missing card — this arm wants a table that mutates between
         * two same-request reads, which the frozen cache forbids. */
        if (def === undefined)
            return null;
        // ONE-FACTS-READ (round-22 compose audit Q3b): the validate
        // door threads its one facts read through the whole arm, so the
        // draft verdict judges the same table the door's prepare did —
        // never a second strict read beside a degraded first.
        const facts = factsArg ?? this.modelFacts();
        // (boarded is required on every live def — same reasoning as
        // admitStageModel's read above; no undefined fallback.)
        const boarded = def.boarded;
        const declaring = [
            ...new Set(boarded.map((id) => this.resolveCardFamily(id, facts))),
        ]
            .map((fam) => facts[fam])
            .filter((row) => row !== undefined && row.params !== undefined);
        if (declaring.length === 0)
            return null;
        const lift = liftCardParams(params);
        // relation rows: serialized-row intersection across families
        // A row AGREES by its MEMBERS, not its prose: the cure text may
        // differ between two families stating the same word (and did —
        // the first cut's verbatim JSON key emptied the intersection
        // and the word silently stopped judging). The key is the row
        // minus `cure`, every array sorted.
        const rowKey = (r) => {
            if (r === null || typeof r !== "object")
                return JSON.stringify(r);
            const row = { ...r };
            delete row["cure"];
            for (const k of Object.keys(row)) {
                const v = row[k];
                if (Array.isArray(v))
                    row[k] = [...v].map((x) => JSON.stringify(x)).sort();
            }
            return JSON.stringify(row);
        };
        // THE WORDS COME FROM THE DECLARED SHAPE (2026-10-10, the
        // four-agent contract audit): this tuple was a THIRD hand
        // enumeration of the vocabulary — a seventh word would intersect
        // only the words this list happened to name, silently emptying
        // every word it missed. One key list, derived from the judged
        // floor, so the intersection cannot fall behind the grammar.
        const WORDS = Object.keys(RELATION_WORDS);
        const perFamily = declaring.map((row) => {
            const fam = row.relations;
            const rows = [];
            for (const word of WORDS) {
                const list = fam?.[word] ?? [];
                for (const r of list)
                    rows.push({ key: word + ":" + rowKey(r), word, row: r });
            }
            return rows;
        });
        /* v8 ignore next 2 -- declaring.length > 0 built perFamily, so
         * [0] always exists; the ?? [] is the noUncheckedIndexedAccess
         * artifact (audit 2026-10-13). */
        const first = perFamily[0] ?? [];
        const agreed = first.filter((x) => perFamily.every((rows) => rows.some((y) => y.key === x.key)));
        const relations = {};
        for (const entry of agreed) {
            const list = relations[entry.word] ?? [];
            list.push(entry.row);
            relations[entry.word] = list;
        }
        // bounds: per-field intersection (the tightest common span)
        let bounds = null;
        for (const row of declaring) {
            const famBounds = row.bounds ?? null;
            if (famBounds === null) {
                bounds = null;
                break;
            }
            if (bounds === null) {
                bounds = { ...famBounds };
                continue;
            }
            for (const field of Object.keys(bounds)) {
                const other = famBounds[field];
                if (other === undefined) {
                    delete bounds[field];
                    continue;
                }
                const cur = bounds[field];
                const min = Math.max(cur.min ?? -Infinity, other.min ?? -Infinity);
                const max = Math.min(cur.max ?? Infinity, other.max ?? Infinity);
                if (min > max) {
                    delete bounds[field];
                    continue;
                }
                bounds[field] = {
                    ...(Number.isFinite(min) ? { min } : {}),
                    ...(Number.isFinite(max) ? { max } : {}),
                };
            }
        }
        // the surface judgment stays the undeclared-key gate's voice
        // (it already ran above); only the WORDS and the SPANS judge here
        // — the incomplete-draft filter applies ONLY at the write seat
        const judged = [
            ...judgeLaneRelations([relations], lift),
            ...judgeLaneBounds(bounds, lift),
        ];
        const violations = admitIncomplete
            ? incompleteDraftViolations(judged)
            : [...judged];
        if (violations.length > 0) {
            return {
                message: "lane (draft, model-less) refuses the state: " +
                    violations.map((v) => v.message).join("; "),
                incomplete: violations.every((v) => isUnstatedRequiredWord(v.message)),
            };
        }
        return null;
    }
    laneVerdictCore(card, params, admitIncomplete = false, factsArg) {
        const def = this.defsSync().get(card);
        if (def === undefined)
            return null; // mcp/flow ids — not lane-admitted
        const mid = params["model"];
        if (typeof mid !== "string" || mid === "") {
            // THE UNDECLARED-KEY GATE HAS ITS OWN SEAT (the behavioural
            // re-check's BYPASS 3: the contract's self-naming strip removes
            // `model: 'anny'` at store, so a patched row became model-less
            // and the model-less tolerance below stood the whole judgment
            // down — `frobnicate` landed). A key no card declares needs no
            // family and no lane: it is judged here, over the raw params
            // minus the envelope, before any tolerance.
            try {
                admissionRefusal(this, card, "", liftCardParams(params), "admission", factsArg);
            }
            catch (e) {
                // a CardArmError is this seat's own refusal; anything else —
                // a facts file that will not read, a shape fault — stays loud
                // and keeps its identity instead of becoming a verdict string
                if (!(e instanceof CardArmError))
                    throw e;
                return { message: e.message, incomplete: false };
            }
            // THE MODEL-LESS ROW STILL MEETS THE WORDS EVERY FAMILY AGREES
            // ON (the audit's GAP 7: the form judged a model-less tts
            // row's `required: text` while the bench returned null — a
            // state the authoring surface refused was bench-admitted, the
            // parity law's false admit). A model-less row is a draft (no
            // variant selected), so the only honest law is the
            // INTERSECTION: a word every boarded declaring family states
            // binds the draft too (whichever family later composes, the
            // word was already declared); a word only some families state
            // stays the run door's voice. No union — a union would refuse
            // states the composing family admits.
            return this.modellessDraftVerdict(card, params, admitIncomplete, factsArg); // null when no family agrees on any word
        }
        let prep;
        try {
            prep = prepareCardParams(this, params, mid, "admission", factsArg);
        }
        catch (e) {
            // THE ENVELOPE IS A DECL-OWN WORD (the audit's GAP 1: this
            // catch used to swallow it with the selection tolerance, so
            // the bench admitted krea-2 turbo `steps: 50` — envelope
            // [4,8] — and the run refused it: a write the door accepted
            // became a run the bench could not produce, the exact false
            // admit the parity law forbids). It refuses HERE, at the
            // write seat, in the same voice the run door speaks.
            if (e instanceof EnvelopeRefusal)
                return { message: e.message, incomplete: false };
            // THE EMPTY-SELECTION LAW (2026-10-10, the operator's live
            // bench: 'bench stage "s_0": card_compose phase 1: unknown
            // quant "" for model "z-image" variant "turbo" (known: int8)')
            // — a stated EMPTY variant/quant/model is not a selection, it
            // is an authoring surface's unchosen control written as a
            // value. The run door refuses it, so admitting it here is the
            // false admit the parity law forbids (the envelope GAP-1
            // shape, one axis over). Refuse HERE, in the run door's own
            // voice — one spelling, both seats. A stated WRONG selection
            // still passes (the tolerance below: repairable, the run
            // names it); an ABSENT one still passes (compose defaults
            // it). The form's own half of the law: seedAxisValues omits
            // an empty axis key (card-base/src/spec.ts) so the GUI never
            // authors the empty string in the first place.
            if (e instanceof CardArmError &&
                (params["variant"] === "" || params["quant"] === "" || params["model"] === "")) {
                return { message: e.message, incomplete: false };
            }
            // selection/dangling failures keep the run door's voice —
            // this seat judges only the DECL's own words
            return null;
        }
        // THE UNDECLARED-KEY GATE, family side (a key no card declares
        // needs no family — but with a family named, the same gate judges
        // the LIFTED view the run seat composes).
        try {
            admissionRefusal(this, prep.card, prep.fam, prep.params, "admission", factsArg);
        }
        catch (e) {
            /* v8 ignore next -- admissionRefusal throws only
             * CardArmError, so the rethrow keeps an unknown error loud,
             * never read as a verdict. */
            if (!(e instanceof CardArmError))
                throw e;
            return { message: e.message, incomplete: false };
        }
        const facts = factsArg ?? this.modelFacts();
        const famRow = prep.fam === "" ? undefined : facts[prep.fam];
        if (famRow === undefined)
            return null; // familyless card unit — no lane
        // A FAMILY THAT DECLARES RELATIONS BUT NO SURFACE still gets its
        // words judged (2026-10-10, the DECL audit's MEDIUM-7): the early
        // return here used to skip relation collection entirely, so a
        // surface-less family with a declared law bound NOTHING, silently.
        // laneSurfaceOf(null, …) already returns null, and judgeLane-
        // Surface(null, …) judges nothing — dropping the return costs
        // legacy families exactly the nothing they had.
        let sel;
        try {
            sel = selectCardVariant(mid, famRow, params, "admission");
        }
        catch {
            /* v8 ignore next -- prepareCardParams already ran the SAME
             * selection on the same mid/famRow/body (cardsCompose.ts:296)
             * one statement above; every refusal it can raise was raised
             * there and absorbed by the tolerance catch above, so a throw
             * here is the same refusal arriving twice. */
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
        const variantRow = famRow.variants.find((v) => v.id === laneVariantId);
        // THE CELL SURFACE (the size-at-quant reshape, operator
        // 2026-10-26: "THEN QUANT, THAT IS WHERE YOU CHOSE 1.7 OR .6"):
        // the selected (variant × quant) cell's additions ride the
        // judged surface — a size cell may take a member its sibling
        // size does not (style_instruction on the 1.7B customvoice cell
        // only). selectCardVariant already resolved the cell (stated or
        // first); an off-surface member stated on the sibling cell's
        // lane refuses HERE, at the write seat, in the run door's voice.
        const cellRow = variantRow?.cells.find((c) => c.quant === sel.quant);
        const relations = [];
        if (famRow.relations !== undefined)
            relations.push(famRow.relations);
        if (variantRow?.relations !== undefined)
            relations.push(variantRow.relations);
        const surface = laneSurfaceOf(famRow.params, variantRow?.params, cellRow?.params);
        // THE RANGE RULE (the 2.1 width burn, 2026-10-10): the model's
        // own numeric domains ride the DECL beside the words — family
        // rows, per-field REPLACED by a variant row that states the
        // field, per-ENDPOINT within it (the family's floor survives a
        // ceiling-only variant; laneBoundsOf is the one spelling — the
        // docs, this seat and the served contract all state the same
        // grain). width -50 admitted at every door while the engine
        // produced garbage; the floor and the ceiling are the
        // declaration's, judged in the same voice as the words.
        const bounds = laneBoundsOf(famRow.bounds ?? null, variantRow?.bounds ?? null);
        // THE INCOMPLETE-DRAFT LAW rides the family arm too (see the
        // helper): the unstated required word is the run door's voice —
        // so the filter applies ONLY when the WRITE seat is asking.
        const judgedFam = [
            ...judgeLaneSurface(surface, prep.decl.schemaNames, prep.params),
            ...judgeLaneRelations(relations, prep.params),
            ...judgeLaneBounds(bounds, prep.params),
        ];
        const violations = admitIncomplete
            ? incompleteDraftViolations(judgedFam)
            : [...judgedFam];
        if (violations.length > 0) {
            return {
                message: "lane '" + prep.fam + "/" + laneVariantId + "' refuses the state: " +
                    violations.map((v) => v.message).join("; "),
                incomplete: violations.every((v) => isUnstatedRequiredWord(v.message)),
            };
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
            admissionRefusal(this, prep.card, prep.fam, prep.params, "admission", factsArg);
        }
        catch (e) {
            // the gate speaks by THROWING on the run seat; this door's
            // contract is a VERDICT, so the refusal is translated here
            // rather than escaping as an unmapped error. The FIRST
            // admissionRefusal call above judged the same prepared state
            // and already returned on a throw; this repeat is the recorded
            // belt (the undeclared-key gate rides both seats), so neither
            // line below runs: the gate throws only CardArmError — its
            // decls and facts are loaded and cached by the first call —
            // and that refusal would have left this function above.
            /* v8 ignore next -- the belt's unknown-error guard. */
            if (!(e instanceof CardArmError))
                throw e;
            /* v8 ignore next -- the belt's verdict line. */
            return { message: e.message, incomplete: false };
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
    repairStageModel(card, model) {
        const def = this.defsSync().get(card);
        if (def === undefined)
            return null;
        const facts = this.modelFacts();
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
        const candidates = def.boarded
            .filter((fam) => model.startsWith(fam + "-"))
            .sort((a, b) => b.length - a.length);
        const fam = candidates[0];
        if (fam === undefined)
            return null;
        const suffix = model.slice(fam.length + 1);
        const variant = (facts[fam]?.variants ?? []).some((v) => v.id === suffix)
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
    seatedMcpEngines() {
        const seat = this.ctx.get("engines");
        if (seat === undefined || typeof seat.ids !== "function")
            return [];
        return seat
            .ids()
            .filter((id) => id.startsWith("mcp:"))
            .sort();
    }
    resolveStageParams(body) {
        const mid = body["model"];
        if (typeof mid !== "string" || mid === "")
            return null;
        try {
            return prepareCardParams(this, body, mid, "serve").params;
        }
        catch {
            return null;
        }
    }
    /** In-process validate compose (the CLI subprocess retired,
     *  2026-09-09): the SAME composeOnce pipeline the start path
     *  rides — facts + pin snapshot + stanza unwrap + admission gate
     *  + ctx.comfyui.compose + output resolution — surfaced as the
     *  validate door's Refusal shape (null = composed OK; the graph
     *  resolves outputs, then drops — validate keeps no graph).
     *  One plane composes for both doors (start + validate); the
     *  per-request execFileSync subprocess (one node boot per
     *  validate call) is dead. */
    async composeValidateCard(card, fam, params, 
    // the body's OWN model address, when the caller still holds it: the
    // `params` this arm receives has been through the overlay, so
    // `model` is already consumed — deriving it from there fell back
    // to the FAMILY and both run-seat fixes were skipped (the live
    // verification caught exactly that: an unoffered address still
    // answered ok, and a lawful `variant: base` clone still refused).
    mid, 
    // the RAW body, when the caller has already overlaid: `variant`
    // is consumed by the overlay (it is a selection coordinate, never
    // a param), so the prepare must see the body to select the lane —
    // preparing from the overlay's product silently composed the head
    // and refused a lawful `variant: base` clone.
    rawBody, 
    // ONE-FACTS-READ (round-22 compose audit Q3b): the validate
    // door's one facts read (degraded-or-fresh), threaded through
    // the internal prepare and the lane verdict so the whole arm
    // judges a single table. Omitted by every other seat (start
    // keeps its strict reads).
    factsArg) {
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
        const spellSweep = (v, found) => {
            if (typeof v === "string") {
                if (v.startsWith("$") && v.length > 1)
                    found.add(v);
            }
            else if (Array.isArray(v)) {
                for (const x of v)
                    spellSweep(x, found);
            }
            else if (typeof v === "object" && v !== null) {
                for (const x of Object.values(v)) {
                    spellSweep(x, found);
                }
            }
        };
        const spells = new Set();
        spellSweep(params, spells);
        if (spells.size > 0) {
            return {
                message: "params carry " +
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
        const address = mid ??
            (typeof params["model"] === "string"
                ? params["model"]
                : fam);
        const boardCheck = this.admitStageModel(card, address);
        if (!boardCheck.ok)
            return { message: boardCheck.error, code: "invalid_request" };
        let prep;
        try {
            prep = prepareCardParams(this, rawBody ?? params, address, "1", factsArg);
        }
        catch (e) {
            // the threaded facts (or prepare's own strict load for seats
            // that omit it) sit inside this try: a CardArmError is this
            // seat's refusal, and every other throw keeps its identity
            if (!(e instanceof CardArmError))
                throw e;
            return { message: e.message, code: e.code };
        }
        // THE LANE JUDGES THE BODY, NEVER THE OVERLAY (the work audit's
        // CRITICAL — a THIRD half-landed fix, and the exact one phase1's
        // own comment warns about: `model` is an envelope key, so the
        // overlaid params carry no address, laneVerdict's model-less arm
        // stands down, and the lane surface + relation laws NEVER RAN at
        // validate — an export conflict answered ok:true here while the
        // bench and the start door both refused it). The run seat already
        // judges `body`; the seats now judge the same thing.
        // ONE CODE SET, BOTH SEATS (wire-chain F1, 2026-10-20): this
        // seat once answered its own `lane_refusal` code — a spelling
        // RUNS_ERROR_CODES never tabled, so the runs validate door's
        // unmapped-code guard LOUD-threw and crashed the door on the
        // very refusal it existed to answer. The verdict now rides the
        // SAME incomplete-distinct codes the run seat's phaseRefusalCode
        // throws, so validate predicts start verbatim.
        const laneRefusal = this.laneVerdictDetailed(card, rawBody ?? params, false, factsArg);
        if (laneRefusal !== null) {
            return {
                message: laneRefusal.message,
                code: laneRefusal.incomplete
                    ? "card_compose_incomplete"
                    : "card_compose",
            };
        }
        // THE PRESENCE GATE RIDES VALIDATE TOO (audit 2026-10-22, the
        // validate-green/start-red twin): phase 1 refuses a missing lane
        // file (lane_input_missing); this seat answered ok for the same
        // body. Same gate, same voice — validate predicts start on
        // weights, not just on shape.
        if (prep.familyless !== true) {
            const miss = lanePresenceRefusal(prep.fam);
            if (miss !== null)
                return { message: miss.message, code: miss.code };
        }
        try {
            const graph = await composeOnce(this, prep.card, prep.modelId, prep.params, "", "1");
            // VALIDATE-RESOLVES-OUTPUTS (round-22 compose audit Q4a): the
            // seat composed the graph and discarded it, so every phase-2
            // output refusal answered validate-green/start-refuse. The
            // phase-1 graph resolves through the shared seam — the
            // CardArmError fold below speaks the run seat's exact voice
            // as this seat's verdict.
            resolveCardOutputsOrThrow(this.defsSync(), prep.card, prep.params, graph);
            return null;
        }
        catch (e) {
            if (e instanceof CardArmError) {
                return { message: e.message, code: e.code };
            }
            throw e;
        }
    }
    /** Phase 1 (run_id ""): validates shape/admission/boarding before
     *  registration. The $spell branch composes NO graph (the pool
     *  passes — the two-card-flow handoff). */
    async phase1Card(body, mid) {
        const prep = prepareCardParams(this, body, mid, "1");
        // THE BOARD CHECK RIDES THE RUN SEAT TOO (the behavioural
        // re-check's BYPASS 1: the bench refused an unoffered model
        // address, but `validate` with the SAME address composed the
        // family HEAD and answered ok — two seats, one law, opposite
        // verdicts). The same exact-address check the write door runs,
        // here at the door that composes.
        const boardCheck = this.admitStageModel(prep.card, body["model"]);
        if (!boardCheck.ok) {
            // the constructor takes the code as its THIRD param (the
            // object-literal spelling passed `{code: undefined}` as the
            // code — the runs door then answered "unmapped refusal code
            // undefined"); same code the write door stamps for a board
            // refusal.
            throw new CardArmError(400, boardCheck.error, "invalid_request");
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
        const laneRefusal = this.laneVerdictDetailed(prep.card, body);
        if (laneRefusal !== null) {
            // THE INCOMPLETE-DRAFT CLASS CODES DISTINCTLY (2026-10-18, the
            // replayed-refusal bug): an UNSTATED required word is bench
            // state under construction (the incomplete-draft law above) —
            // the client must not carry it onto the run face as a terminal
            // failure, or every later open replays a refusal the operator
            // cured by typing. The code names the class; a stated-wrong
            // verdict keeps the compose code and carries as a failure.
            throw phaseRefusalCode(laneRefusal.message, laneRefusal.incomplete ? "card_compose_incomplete" : "card_compose");
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
        const spells = prep.decl.spells;
        const pool = {};
        for (const k of spells) {
            const v = prep.params[k];
            if (k in prep.params && typeof v === "string" && v.startsWith("$"))
                pool[k] = v;
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
    async phase2Card(p1, runId) {
        const graph = await composeOnce(this, p1.card, p1.modelId, p1.params, runId, "2");
        /* v8 ignore next -- compose's contract returns the graph object
           (a non-object is an engine bug): the refusal never fires (2026-09-12) */
        if (typeof graph !== "object" || graph === null || Array.isArray(graph)) {
            throw new CardArmError(400, "card_compose produced an empty graph for " + p1.mid, "invalid_request");
        }
        // VALIDATE-RESOLVES-OUTPUTS shares this mapping (round-22
        // compose audit Q4a): one seam, both seats, the run seat's
        // exact voices.
        const flow = resolveCardOutputsOrThrow(this.defsSync(), p1.card, p1.params, graph);
        return { graph, skeleton: p1.skeleton, spell: p1.spell, ...flow };
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
    // J12: the §23 manifest read (stateRoots) rides the queue seat's
    // config — the registry's own ctx must carry the inject to read it.
    inject: ["queue"],
    // NO comfyui inject: the compose rim property-reads ctx.comfyui on
    // its OWN throwaway EngineContext (which mounts ComfyUIService
    // itself at the rim head) — never on the host fiber, so no read
    // contract is owed to the composition.
    async apply(ctx) {
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
export function needCardRegistry(cards, where) {
    if (cards === null || cards === undefined) {
        throw new Error("[card_registry] no CardRegistryService for " + where +
            " — doors inject 'cardRegistry' and pass ctx.cardRegistry " +
            "(the manifest's estate-card-registry row primes at boot)");
    }
    return cards;
}
//# sourceMappingURL=cardsRegistry.js.map