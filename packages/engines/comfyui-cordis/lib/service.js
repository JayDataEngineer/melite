import { validateDeclaredMods } from "./mods-schema.js";
import { validateCardDefinition } from "./card-definition-schema.js";
import { ComposeRefusal } from '@melite/comfyui-card-kit/errors';
import { assertWiringAgainst, deriveWiringDoc } from "./wiringWall.js";
export { ComposeRefusal } from '@melite/comfyui-card-kit/errors';
import { Service } from '@deepseek-ai/cordis';
import { GraphBuilder, deriveDefaults } from '@melite/comfyui-card-kit/graph';
import { modelsService } from "./models/service.js";
import { coerceWireArrays, coerceWireNumbers, unwrapItemArrays, wireTypeLedger } from '@melite/comfyui-card-kit';
import { provisionDest } from "./catalog.js";
import { validateFields, validateVerb, resolveControlNetEntry } from "./serviceMods.js";
import { unwalkedParams, declaredDefaults as declaredDefaultsFor } from "./no-cheat.js";
// the mod/verb plane re-exports through the service door (one surface)
export { resolveControlNetEntry } from "./serviceMods.js";
import { assertEnvelopeLaws, assertPackEnvelopeLaws } from "./envelope-laws.js";
/** THE CARRIER NARROW (N4 cure, 2026-10-22): the walk sites read
 *  `.dict` off `def.schemaCarrier ?? def.schema` — the union with
 *  the normalize FUNCTION used to force an `as unknown` at every
 *  site. The function arm carries no dict (every reader treats
 *  dict-undefined as empty), so the narrow spells the empty carrier
 *  as data — the escapes retire, behavior unchanged. (The toJSON
 *  site below keeps the live instance: it needs the METHOD, not
 *  the dict.) */
function carrierOf(def) {
    const raw = def.schemaCarrier ?? def.schema;
    if (typeof raw === 'function') {
        // the callable carries its own .dict (schemastery objects are
        // functions) — a bare normalizer simply has none, and every
        // reader already treats dict-undefined as empty. The single
        // bridge below is the house idiom for schemastery classes
        // (Dict/Meta carry no string index — params-emit:64 rides the
        // same bridge per knob); the walkers only ever Object.entries
        // the dict and read each knob's .type.
        return raw.dict === undefined ? { type: 'object' } : { type: 'object', dict: raw.dict };
    }
    return raw;
}
/** Loud refusal — the estate's rc=-3 door shape, never a silent default. */
/** THE NO-CHEAT DOOR (2026-09-20, the operator's order: "you edit
 *  the shared library to always walk every single parameter no
 *  matter what — that way you can't cheat"): after the full cascade,
 *  every knob DECLARED with a non-null default must hold a non-null
 *  value in the merged doc. A declared default the walk drops (the
 *  union-null arm, the buried inner default, the family-literal
 *  resolution path) is a broken card, refused loud by name — the
 *  renderer's silent `??` floors are outlawed, not trusted. Knobs
 *  declared without a default keep their own lawful optionality.
 *  Card-agnostic: both compose paths, every card, no opt-out. */
function assertNoCheat(cardId, def, merged, rawParams) {
    const carrier = carrierOf(def);
    // THE NO-SILENT-REPAIR ARM: schemastery's walk quietly resolves an
    // explicit user null to the declared default — a repair the user
    // never sees. The door refuses the null BEFORE the walk can hide
    // it: send a real value or omit the key, never null-on-a-default.
    const raw = (rawParams ?? {});
    const declared = declaredDefaultsFor(carrier, def.boarded);
    const nulled = Object.keys(declared).filter((k) => Object.prototype.hasOwnProperty.call(raw, k) && raw[k] === null);
    if (nulled.length > 0) {
        throw new ComposeRefusal('nulled-param', `card '${cardId}' refused params: ${nulled.map((k) => `'${k}' is null but its declaration carries a default (${JSON.stringify(declared[k])}) — send a real value or omit the key, never null`).join(', ')}`);
    }
    const offenders = unwalkedParams(carrier, def.boarded, merged);
    if (offenders.length > 0) {
        const rows = offenders.map((o) => `'${o.name}' (declared default ${JSON.stringify(o.declared)}, walked ${o.walked === undefined ? 'absent' : 'null'})`).join(', ');
        throw new ComposeRefusal('unwalked-param', `card '${cardId}' declared defaults the walk did not deliver: ${rows} — the card's schema is broken; fix the declaration, never the renderer`);
    }
}
/** THE ARM-CONDITIONAL EXTENSION GATE (the mask SAM2 law,
 *  2026-09-19 — the operator: "declared, then auto provisioned"):
 *  every declared kind whose `requires` names packs AND whose bag is
 *  non-empty in the merged params must find ≥1 of each pack's nodes
 *  live — else the missing-extension refusal (the SAME text shape
 *  the card-level gate emits, so RunRescue parses and offers the
 *  install). An empty/absent bag never fires: an unused arm never
 *  blocks a run. Card-agnostic: both compose paths, every card. */
function assertModRequires(cardId, def, merged, objectInfoNodes, extMap) {
    if (objectInfoNodes === null)
        return;
    for (const kind of def.mods ?? []) {
        const packs = kind.requires;
        if (packs === undefined || packs.length === 0)
            continue;
        const bag = merged[kind.param_key];
        if (!Array.isArray(bag) || bag.length === 0)
            continue;
        for (const pack of packs) {
            const expected = extMap[pack] ?? [];
            const found = expected.filter((n) => objectInfoNodes.has(n));
            if (expected.length > 0 && found.length === 0) {
                throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`);
            }
        }
    }
}
/**
 * The wire tool name derived from a card id (hyphens→underscores +
 * "_card"). ONE spelling of the law (M2′ stroke 2, 2026-09-09):
 * the gateway projection (toolProjection) and every card package's
 * in-package tool emission consume this — the derivation is never
 * restated.
 */
export const cardWireName = (id) => id.replace(/-/g, "_") + "_card";
/** THE ARM WEIGHT GATE (the silent-truncation law, 2026-10-09):
 *  the card's armWeights names the provision rows this run touches;
 *  each must be present on the models tree — else the missing-weight
 *  refusal (the file + its declared fetch URL + the provision_model
 *  rescue, so RunRescue parses and offers the fetch). Card-agnostic:
 *  both compose paths, every card. Fail-open (reader null = the
 *  pin-sweep's absent-pin degrade: walls and fixtures compose
 *  without a tree). A named-but-undeclared row is a declaration
 *  bug — refused loud, never skipped. */
function assertArmWeights(cardId, def, merged, weightPresent) {
    if (weightPresent === null || def.armWeights === undefined)
        return;
    const names = def.armWeights(merged);
    for (const name of names) {
        const row = def.provisions?.find((r) => r.name === name);
        if (row === undefined) {
            throw new ComposeRefusal('missing-weight', `card '${cardId}' armWeights names '${name}' — no such provision row declared (the declaration is broken; fix the card, never the gate)`);
        }
        if (!weightPresent(provisionDest(row.folder), row.name)) {
            throw new ComposeRefusal('missing-weight', `card '${cardId}' needs weight '${row.folder}/${row.name}' — absent on the models tree; fetch ${row.url} (provision_model model=${def.provisionOwner ?? cardId})`);
        }
    }
}
export function resolveCardFlowOutputs(def, params, graph) {
    const outputs = {};
    const outputNodes = {};
    for (const binding of def.flowOutputBindings ?? []) {
        if (binding.when !== undefined && !binding.when(params))
            continue;
        if (outputs[binding.channel] !== undefined) {
            throw new ComposeRefusal('flow-output', `card '${def.id}' selected output '${binding.channel}' from more than one producer`);
        }
        const kind = def.flowKinds.outputs[binding.channel];
        if (kind === undefined) {
            throw new ComposeRefusal('flow-output', `card '${def.id}' binds undeclared output '${binding.channel}'`);
        }
        const selected = binding.node === '*'
            ? Object.entries(graph)
                .filter(([, value]) => typeof value === 'object' && value !== null && !Array.isArray(value)
                && value['class_type'] === binding.nodeClass)
                .at(-1)
            : Object.prototype.hasOwnProperty.call(graph, binding.node)
                ? [binding.node, graph[binding.node]]
                : undefined;
        const node = selected?.[1];
        const nodeClass = typeof node === 'object' && node !== null && !Array.isArray(node)
            ? node['class_type']
            : undefined;
        if (selected === undefined || nodeClass !== binding.nodeClass) {
            throw new ComposeRefusal('flow-output', `card '${def.id}' output '${binding.channel}' expects ${binding.node} as ${binding.nodeClass}, got ${String(nodeClass ?? 'missing')}`);
        }
        outputs[binding.channel] = kind;
        outputNodes[binding.channel] = selected[0];
    }
    return { outputs, outputNodes };
}
/** The estate's compose call data (J12): the state-root manifest
 *  the estate's compose rim owns (the queue seat's config-named
 *  trees — never an env read). Cards that rewrite root-relative
 *  asset URLs resolve against it; every other card ignores it. */
function assertFlowContract(def) {
    if (def.flowKinds === undefined) {
        throw new ComposeRefusal('flow-contract', `card '${def.id}' declares no flowKinds contract`);
    }
    const carrier = carrierOf(def);
    const names = new Set(Object.keys(carrier.dict ?? {}));
    const missingInputs = Object.keys(def.flowKinds.inputs).filter((name) => !names.has(name));
    if (missingInputs.length > 0) {
        throw new ComposeRefusal('flow-port', `card '${def.id}' flow inputs ${missingInputs.join(', ')} are absent from its schema`);
    }
    const missingAliases = Object.keys(def.flowKinds.legacyAliases ?? {}).filter((name) => !names.has(name));
    if (missingAliases.length > 0) {
        throw new ComposeRefusal('flow-port', `card '${def.id}' legacy aliases ${missingAliases.join(', ')} are absent from its schema`);
    }
    const unconditional = new Set();
    for (const binding of def.flowOutputBindings ?? []) {
        const kind = def.flowKinds.outputs[binding.channel];
        if (kind === undefined) {
            throw new ComposeRefusal('flow-output', `card '${def.id}' output binding '${binding.channel}' is absent from flowKinds.outputs`);
        }
        if (binding.node === '' || binding.nodeClass === '') {
            throw new ComposeRefusal('flow-output', `card '${def.id}' output '${binding.channel}' needs a node and nodeClass`);
        }
        if (binding.when === undefined) {
            if (unconditional.has(binding.channel)) {
                throw new ComposeRefusal('flow-output', `card '${def.id}' output '${binding.channel}' has duplicate unconditional producers`);
            }
            unconditional.add(binding.channel);
        }
    }
}
export class ComfyUIService extends Service {
    cards = new Map();
    packs = new Map();
    flavors = [];
    verbs = new Map();
    facts = null;
    /** Live object_info node names — set before compose to arm the gate. */
    /** The engine's declared node census, published so ANY seat can walk a
     *  graph against it (2026-10-10, the bypass audit's HIGH-3: the wall
     *  used to be reachable only from this class, so the merge and splice
     *  paths — which produce the graph that actually reaches the engine —
     *  went unwalked). Null before the doc lands; the wall stands down. */
    objectInfoNodes = null;
    /** The wiring doc's DECLARED inputs per node (required ∪
     *  optional, value facts attached) — compose's final wall
     *  (assertWiring) walks every built graph against it: input
     *  names, combo enums, numeric bounds. Null = names-only
     *  snapshot (the node gate stands, the input gate waits — never
     *  a guessed refusal). */
    objectInfoInputs = null;
    /** Models-tree presence reader — set before compose to arm the
     *  arm-weight gate (mirrors objectInfoNodes: null = fail-open). */
    weightPresent = null;
    /** Autofill defaults map (class → input → default), derived
     *  from the live node-definitions doc. */
    pinDefaults = {};
    constructor(ctx) {
        super(ctx, 'comfyui');
    }
    /** Register one card. REVERTIBLE (the paper's effect shape, Def. 8:
     *  the mutation RETURNS its inverse — Γ → Γ × (Γ→Γ)). The card's
     *  plugin wraps this in ctx.effect(() => svc.registerCard(def)):
     *  the FIBER owns the disposer, unload runs it, the card plane
     *  reverts to the pre-registration state. LOUD: duplicate ids
     *  refuse (one card, one plugin). */
    registerCard(def) {
        if (this.cards.has(def.id)) {
            throw new ComposeRefusal('duplicate-card', `card '${def.id}' registered twice — one card, one plugin`);
        }
        // THE ENVELOPE SCHEMA GATE (the strictness audit's T1, mirroring
        // models/service.ts's DECL resolve): a strict schemastery pass —
        // a carried key the interface never declares (a typo'd boardd)
        // refuses LOUD here, named, never boots silent. The semantic
        // doors below own every nested law; this gate owns the envelope.
        validateCardDefinition(def);
        assertFlowContract(def);
        // THE ENVELOPE LAW GATE (2026-10-10, the gap-3 closure): every
        // card — built-in OR hot plugin — passes the same vocabulary,
        // grammar, and coherence laws at the registration door; a
        // foreign spelling refuses LOUD here, never serves silent.
        assertEnvelopeLaws(def);
        // THE FAMILY-TAKEN GATE (ledger #40, the operator's outage: a
        // profile insert's sketch boarded krea-2 and the lane served
        // its 2-field envelope as image-gen). A DROP-IN THAT BOARDS A
        // REAL FAMILY OWNS THAT FAMILY'S FORM — so no second card may
        // board a family another registered card already boards. The
        // packaged set never collides (one owner per family — the
        // census pins it); the refusal fires LOUD here at
        // registration, whatever the second card's source, instead of
        // a silent first-wins downstream in the defs table.
        for (const prior of this.cards.values()) {
            const taken = prior.boarded.find((fam) => def.boarded.includes(fam));
            if (taken !== undefined) {
                throw new ComposeRefusal('family-taken', `card '${def.id}' boards '${taken}' — already boarded by '${prior.id}' (one family, one card; a drop-in that boards a real family owns that family's form)`);
            }
        }
        // THE DECLARED MOD-KIND SCHEMA GATE (hour 16): the card's mods
        // rows answer to a schemastery master here — the third mod
        // door's validation (packs and flavors already gated; the card's
        // own declared kinds rode unvalidated until now).
        validateDeclaredMods(def.id, def.mods);
        // THE DECLARED NODE-CLASS GATE (G2, 2026-10-12): every
        // flowOutputBinding names the node class its bound output must
        // carry — that declaration is judgeable HERE against the engine's
        // own node doc, at the registration door, instead of dying at
        // compose (the flow-output mismatch) or never. Fail-open when the
        // doc is not loaded (null), the same law as assertModRequires —
        // and boot-time cards register BEFORE the live doc arrives, so
        // the gate's real teeth are on LATE registrations (hot plugins,
        // profile inserts — the family-taken outage class), where the doc
        // is already seated. Environmental absence for boot cards stays
        // compose-owned: the managed snapshots differ per lane BY DESIGN
        // (the base engine doc does not know the managed packs), so
        // refusing a boot card there would hide the card on lanes whose
        // pack install is simply late or partial — compose refuses loud
        // per run instead, which is the honest environmental answer.
        if (this.objectInfoNodes !== null && def.flowOutputBindings !== undefined) {
            for (const binding of def.flowOutputBindings) {
                if (!this.objectInfoNodes.has(binding.nodeClass)) {
                    throw new ComposeRefusal('node-class', `card '${def.id}' binds output '${binding.channel}' to node class '${binding.nodeClass}' — the engine's node doc does not know it`);
                }
            }
        }
        // THE REQUIRES-MODEL LIFT (2026-09-21, the phantom model
        // demand): cards declare requiresModel inside flowKinds (the
        // single declaration) while the gates (cardGate, compose's
        // MODEL-LESS path) read the def top-level — an absent top-level
        // lifted straight through, so image-edit (flowKinds false) read
        // undefined and demanded a model every wired flow stage never
        // needed. Both stated and contradictory refuses LOUD (a silent
        // top-level-wins would let one face lie); absent both defaults
        // true (the documented default — unknown cards still hit the
        // model gate first, the wall pins that order).
        const flowRequires = def.flowKinds?.requiresModel;
        if (def.requiresModel !== undefined && flowRequires !== undefined &&
            def.requiresModel !== flowRequires) {
            throw new ComposeRefusal('requires-model-conflict', `card '${def.id}' declares requiresModel ${String(def.requiresModel)} top-level against flowKinds ${String(flowRequires)} — one declaration, no contradictions`);
        }
        const requiresModel = def.requiresModel ?? flowRequires ?? true;
        this.cards.set(def.id, { ...def, requiresModel });
        return () => { this.cards.delete(def.id); };
    }
    // ── THE MOD/VERB REGISTRATION (ported from the RETIRED dsl.py — the TS mod/verb system in serviceMods.ts owns this: the Model.mods interlock).
    //  Fields absorb onto the OWNING CARD's surface scoped to the declaring families; verbs mount by id. ──
    /** Register one PACK CONTRACT — the category (the Mod parent).
     *  LOUD: field gates at registration (the metaclass's
     *  import-time validation); ONE SHAPE per pack name (a second
     *  contract for the same pack with different fields is drift
     *  one declaration per name means one shape per name). */
    registerPack(contract) {
        validateFields(`pack ${contract.pack}`, contract.fields);
        assertPackEnvelopeLaws(contract.pack, contract.fields);
        const prior = this.packs.get(contract.pack);
        if (prior !== undefined) {
            // .dict is present — validateFields above refuses dict-less
            // contracts at this same gate, so the read casts (the ?? {}
            // toll would be an uncoverable arm, never a runtime path).
            const priorNames = Object.keys(prior.fields.dict).sort().join(',');
            const nowNames = Object.keys(contract.fields.dict).sort().join(',');
            if (priorNames !== nowNames) {
                throw new ComposeRefusal('bad-mod', `pack '${contract.pack}' has two shapes: [${priorNames}] vs [${nowNames}] — one pack name means one shape`);
            }
        }
        this.packs.set(contract.pack, contract);
        return () => { this.packs.delete(contract.pack); };
    }
    /** Register one FLAVOR — a family's boarding of a pack (the
     *  Model.mods tuple entry; the family's own mods/<pack>.ts file).
     *  Fields are INHERITED from the pack contract — a flavor never
     *  carries fields. LOUD: the pack must exist (a flavor for an
     *  unknown pack is drift); every family id non-empty. The
     *  flavor↔DECL.mods interlock runs boot-loud on the models side
     *  (validateBootContracts). */
    registerFlavor(flavor) {
        if (!this.packs.has(flavor.pack)) {
            throw new ComposeRefusal('bad-mod', `flavor for pack '${flavor.pack}' — no such pack registered (the category contract lands first; a flavor for an unknown pack is drift)`);
        }
        if (flavor.families.length === 0) {
            throw new ComposeRefusal('bad-mod', `flavor of '${flavor.pack}' declares no families — a flavor rides a model`);
        }
        this.flavors.push(flavor);
        return () => {
            const i = this.flavors.indexOf(flavor);
            if (i >= 0)
                this.flavors.splice(i, 1);
        };
    }
    /** The registered pack names (the category taxonomy — the boot
     *  gate reads this to refuse dead DECL.mods refs). */
    packNames() {
        return [...this.packs.keys()].sort();
    }
    /** The flavor registrations (the boot gate's side of the
     *  flavor↔boarding interlock). */
    flavorRegistrations() {
        return this.flavors;
    }
    /** The registered verb ids (SubActionMods — the anny plane; the
     *  boot gate reads this to satisfy DECL.mods verb entries). */
    verbIds() {
        return [...this.verbs.keys()].sort();
    }
    /** The verb registrations (the boot gate's side of the
     *  verb↔boarding interlock — a verb naming a family that never
     *  boarded it is an undeclared mutation). */
    verbRegistrations() {
        return [...this.verbs.values()];
    }
    /** Register one verb. LOUD: the plane law (exactly one engine
     *  arm per engine row) and one registration per verb id (two
     *  classes mounting one id is the's loud refusal). */
    registerVerb(verb) {
        // duplicate id is the LOUDER signal — it fires before the
        // contract gates (a re-mount of a live verb id is an owner
        // bug, not a declaration bug)
        if (this.verbs.has(verb.id)) {
            throw new ComposeRefusal('bad-verb', `verb '${verb.id}' registered twice — one class per verb id`);
        }
        validateVerb(verb);
        this.verbs.set(verb.id, verb);
        return () => { this.verbs.delete(verb.id); };
    }
    /** THE ABSORPTION (dsl._absorb_models, read-side): for every
     *  PACK, the fields (the category contract — inherited by every
     *  boarding) join the card surface scoped to the families whose
     *  FLAVORS intersect the card's boarded set — THE MODEL-LEVEL
     *  MUTATION: one join per family, inherited by every variant and
     *  quant of that family (the cascade rides below this surface). */
    cardModFields(cardId) {
        const def = this.cards.get(cardId);
        if (def === undefined)
            return [];
        const out = [];
        for (const [pack, contract] of [...this.packs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
            const scope = new Set();
            for (const flavor of this.flavors) {
                if (flavor.pack !== pack)
                    continue;
                for (const fam of flavor.families) {
                    if (def.boarded.includes(fam))
                        scope.add(fam);
                }
            }
            if (scope.size === 0)
                continue;
            out.push({ pack, fields: contract.fields, families: [...scope].sort() });
        }
        return out;
    }
    /** The mod's catalog rows for one family (lora picks). THE
     *  RUNTIME CATALOG LAW: a flavor with runtimeCatalog and no own
     *  rows serves the UNION of every flavor's declared rows of the
     *  same pack; family rows always win over the union. */
    modRows(pack, family) {
        return this.modCatalog(pack, family).rows;
    }
    /** The mod catalog rows plus their provenance (the discovery
     *  door's modifier tooltip: union-served rows carry the shared
     *  suffix, family rows do not). ONE spelling of the runtime
     *  catalog law — modRows rides this. */
    modCatalog(pack, family) {
        const matching = this.flavors.filter((m) => m.pack === pack && m.families.includes(family));
        if (matching.length === 0)
            return { rows: [], shared: false };
        // THE FLAVOR MERGE (#39, the hotload seam): several flavors may
        // board the same (pack, family) — the family's own table plus
        // hot-root rows — and they MERGE (id-keyed, registration order,
        // first wins). Before, find() took the first match and a later
        // flavor was invisible; one flavor serves exactly as before.
        const merged = [];
        const seen = new Set();
        let runtime = false;
        for (const m of matching) {
            if (m.runtimeCatalog === true)
                runtime = true;
            for (const row of m.rows ?? []) {
                if (!seen.has(row.id)) {
                    seen.add(row.id);
                    merged.push(row);
                }
            }
        }
        if (merged.length > 0 || runtime !== true)
            return { rows: merged, shared: false };
        const union = new Map();
        for (const m of this.flavors) {
            if (m.pack !== pack)
                continue;
            for (const row of m.rows ?? [])
                union.set(row.id, row);
        }
        return { rows: [...union.values()], shared: true };
    }
    /** The mod catalog for a COMPOSE (route-aware): variant routes
     *  compose under their own address (the BROKEN-C resolved
     *  address), but flavors key by FAMILY — a routed compose matches
     *  no flavor and every mod id refuses unknown-*. When the route
     *  address serves no rows, resolve against the card's boarded
     *  families (board order, first match wins — the cardVerbs
     *  precedent). Non-routed composes match directly and never reach
     *  the fallback, so no settled card changes voice. */
    modCatalogForCompose(pack, modelId, boarded) {
        const direct = this.modCatalog(pack, modelId);
        if (direct.rows.length > 0)
            return direct;
        for (const fam of boarded) {
            const fb = this.modCatalog(pack, fam);
            if (fb.rows.length > 0)
                return fb;
        }
        return direct;
    }
    /** THE VALUE PLANE's family-of-a-value read (journey-closure D5,
     *  2026-10-17): the families a mod VALUE is registered to,
     *  derived from the live flavor registrations — the real DECL
     *  mods trees' compositions (each family's own mods/<pack>.ts),
     *  never a hand list. A row belongs to the families whose OWN
     *  rows carry the id; the runtime-catalog union (modCatalog's
     *  shared arm) re-serves other families' rows but never re-homes
     *  them. */
    valueFamilies(pack, id) {
        const owned = new Set();
        for (const m of this.flavors) {
            if (m.pack !== pack)
                continue;
            if ((m.rows ?? []).some((r) => r.id === id)) {
                for (const f of m.families)
                    owned.add(f);
            }
        }
        return [...owned].sort();
    }
    /** THE VALUE-PLANE REFUSAL (journey-closure D5, 2026-10-17): a
     *  bag VALUE registered outside the run's active family never
     *  composes — the door refuses it named (value + its registered
     *  family + the run's family), the unknown-* voice's family
     *  clause. The tile (the bag KEY) is card-wide legal by
     *  admission; the VALUE is judged HERE, where the run's family is
     *  known and the compose catalog's boarded-families fallback
     *  (modCatalogForCompose — load-bearing for routed composes)
     *  would otherwise absorb a foreign pick silently (the Krea2-tile
     *  class: image-gen boards krea-2 first, so an anima run's
     *  row-less catalog fell through to krea-2's rows and stacked
     *  them). ONE OWNER, the DOOR: the client's modelSwitchPatch
     *  MOD-CURRENCY clause stays the gesture-hop mirror — it nulls
     *  bags only on a cross-spec SWITCH gesture; the model-key
     *  re-point path and hand-authored payloads never cross it (the
     *  B5/D3 pattern: the door refuses loud, the client mirrors one
     *  hop earlier). */
    assertValueFamily(pack, id, runFamily, cardId) {
        const owned = this.valueFamilies(pack, id);
        // the 'none' naming is defensive-unreached today: catalog rows
        // come only from flavor rows, so a FOUND row always has an owner;
        // a future catalog source that serves rows without flavor
        // ownership reaches it.
        if (owned.includes(runFamily))
            return;
        const noun = pack === 'loras' ? 'lora id' : `${pack} type`;
        throw new ComposeRefusal('foreign-family-value', `card '${cardId}' names ${noun} '${id}' registered to family ` +
            `'${owned.join(', ') || 'none'}', not the run's family '${runFamily}' — ` +
            `a value picked for another family's weights composes poison here; ` +
            `pick from the '${runFamily}' catalog, never carry the tile across a switch`);
    }
    /** The verbs mounted on a card (SubActionMods of its boarded
     *  families — knobs NEVER on the card surface). */
    cardVerbs(cardId) {
        const def = this.cards.get(cardId);
        if (def === undefined)
            return [];
        return [...this.verbs.values()].filter((v) => v.families.some((fam) => def.boarded.includes(fam)));
    }
    /** THE SCHEMA ENVELOPE FACE (the parameter audit, 2026-09-14:
     *  the frozen 15-key wire row and its re-derivation helpers died —
     *  the card's own schemastery toJSON() IS the served form, the
     *  SSOT one serializer). Returns the card schema's serialized
     *  envelope plus the family-absorbed mod contracts' envelopes
     *  keyed by pack; null when the card is unknown. Families-scoped
     *  card fields and every presentation fact derive CLIENT-side off
     *  the envelope (fieldsOf in card-base) — the server invents no
     *  intermediate row anymore. */
    formSchemas(cardId, family) {
        const def = this.cards.get(cardId);
        if (def === undefined)
            return null;
        const carrier = def.schemaCarrier ?? def.schema;
        let schema = typeof carrier.toJSON === 'function' ? carrier.toJSON() : null;
        const mods = {};
        // THE ROUTE→ATOM FOLD (2026-11-09, the h3-timeline board==offer
        // cure: boarding the lane addresses exposed it — the recipe wall
        // judged h3-singularity's own stamps against a mod-less
        // envelope — "stamps loras, the card declares no such param").
        // Flavors register for the FAMILY ATOM; a serve at a VARIANT
        // ROUTE address asks with its owning atom or the absorbed
        // surface drops and every mod param reads dead (compose's
        // cardsCompose.ts envelopeAtom arm, cardsVariant.ts, and
        // flowsParamsOverlay.ts all ride this same fold — this serve
        // was the lone unfold seat). Atoms pass through unchanged
        // (owningAtom: routes.get(id)?.modelId ?? id). An unbooted
        // models table (the service-plane unit seam) skips the fold —
        // the gate reads the raw family, exactly as before.
        let envelopeAtom = family;
        try {
            envelopeAtom = modelsService().owningAtom(family);
        }
        catch {
            envelopeAtom = family;
        }
        for (const absorbed of this.cardModFields(cardId)) {
            if (!absorbed.families.includes(envelopeAtom))
                continue;
            const c = absorbed.fields;
            mods[absorbed.pack] = typeof c.toJSON === 'function' ? c.toJSON() : null;
        }
        // THE LANE CAP NARROW (2026-10-11, the operator's wall: "the
        // 2511 model is still showing 18 input images even though it
        // only has 3 by design"): a multi-family card declares its
        // stack face at the ROOMIEST boarded cap (image-edit: 16), and
        // the card's own law says "the list capacity rides each lane
        // DECL's max_images" — the served form narrows every stack
        // field's max_stack to THIS family's lane_inputs.max_images so
        // the face renders the boarded lane's truth (2511: 3, 2.1: 16)
        // and the form refuses past it INLINE, never at the door.
        if (schema !== null) {
            let cap;
            try {
                cap = modelsService().getModel(family).lane_inputs?.max_images;
            }
            catch {
                cap = undefined;
            }
            if (typeof cap === 'number' && cap > 0)
                schema = narrowStackCap(schema, cap);
        }
        return { schema, mods };
    }
    setFacts(facts) {
        this.facts = facts;
    }
    /** Registry read for the serving surfaces (params_schema emitter):
     * the registered definition by card id. Read-only — registration
     * still rides registerCard only. */
    getCardDef(id) {
        return this.cards.get(id);
    }
    /** Registered card ids (sorted) — census + refusal text reuse. */
    cardIds() {
        return [...this.cards.keys()].sort();
    }
    setObjectInfo(objectInfo) {
        // THE WIRING DOC (2026-10-10, the YOU_ARE_A_LIAR fix shape 4):
        // per node, its DECLARED input names (required ∪ optional — the
        // doc's own truth), ONE derivation shared with the estate
        // registry's prime so no seat judges a differently-shaped doc.
        // A names-only snapshot (setObjectInfoNodes) keeps the node
        // gate and skips the input gate — never a guessed refusal.
        const derived = objectInfo ? deriveWiringDoc(objectInfo) : null;
        this.objectInfoNodes = derived?.nodes ?? null;
        this.objectInfoInputs = derived?.inputs ?? null;
        // The pin-autofill derivation reads the same doc's input sections
        // (its own probes validate the shape — the wire boundary's law).
        this.pinDefaults = objectInfo
            ? deriveDefaults(objectInfo)
            : {};
        // THE DOC IS CONTEXT STATE (the second reseat): this class and
        // the host share the seat name `comfyui` and cannot look each
        // other up — the wiring service under its OWN name is how every
        // seat (compose here, the run seat's fence, the adapter's
        // post-splice walk) reads the same census. A composition that
        // mounts no wiring provider stands the walls down (documented).
        const wiring = this.ctx.get('comfyuiWiring');
        if (wiring !== undefined) {
            if (derived === null)
                wiring.disarm();
            else
                wiring.arm(derived.nodes, derived.inputs);
        }
    }
    /** Legacy: node-name set only (gate arming without autofill). */
    setObjectInfoNodes(nodes) {
        this.objectInfoNodes = nodes ? new Set(nodes) : null;
        this.objectInfoInputs = null;
    }
    /** THE WEIGHT PRESENCE READER (the silent-truncation law,
     *  2026-10-09): arms the arm-weight gate. The harness seats the
     *  models-tree reader here before compose (null = fail-open for
     *  walls and fixtures, the absent-pin degrade). */
    setWeightPresent(fn) {
        this.weightPresent = fn;
    }
    /** THE PACK PRESENCE READ (the no-silent-drop law's extension
     *  half, hour 26 stroke 18): the EXTENSION-LAW gate's own check as
     *  a READ for the serving surfaces (the spec's packs block, the
     *  load bundle's pack hints). Same semantics, one spelling — a
     *  pack is present when at least one of its declared node types
     *  (facts.extension_node_types) is live on the engine; a pack with
     *  NO declared node types, or engine facts not loaded, is UNKNOWN
     *  (null — the gate cannot see it either; never a guessed mark). */
    packPresence(packs) {
        if (this.objectInfoNodes === null) {
            return packs.map((id) => ({ id, present: null }));
        }
        const extMap = this.facts?.extension_node_types ?? {};
        const nodes = this.objectInfoNodes;
        return packs.map((id) => {
            const expected = extMap[id] ?? [];
            if (expected.length === 0)
                return { id, present: null };
            const found = expected.filter((n) => nodes.has(n));
            return { id, present: found.length > 0 };
        });
    }
    /** THE PACK FIELD-NAMES READ (022's self-critique #3, 2026-09-24):
     *  the registered contract's own field names, declaration order —
     *  the agent-facing load surface serves the pack grammar (param_key
     *  + fields) without re-deriving anything; this read IS the
     *  contract (the same map registerPack validates loudly, one shape
     *  per name). Unknown pack = empty (the grammar table's consumer
     *  drops the row, same as an unregistered flavor). */
    packFieldNames(pack) {
        const contract = this.packs.get(pack);
        if (contract === undefined)
            return [];
        return Object.keys(contract.fields.dict);
    }
    compose(cardId, modelId, params, runId, estate) {
        const def = this.cards.get(cardId);
        if (!def)
            throw new ComposeRefusal('unknown-card', `unknown card '${cardId}' (registered: ${[...this.cards.keys()].sort().join(', ') || 'none'})`);
        // MODEL-LESS path (requiresModel: false — pure-tool cards with no
        // families): no board, no facts row, no model defaults. The
        // schema parse below still runs — the single declaration guards
        // the params, never a second truth.
        if (def.requiresModel === false && (modelId === null || modelId === '')) {
            // THE FAMILY RESOLVE (the atom vocabulary's interlock): compose
            // derives from a family DECL, so a model-less row names the
            // family when the card boards exactly one — the declared
            // single-family arm, resolved here where the row is built (an
            // explicit resolve, never a default hidden in the card). A
            // zero- or multi-family board names no family: the caller's
            // family picker is the choice there (emitParamsSchema
            // synthesizes the knob), and a card whose compose needs a
            // family refuses loud at its own dispatch.
            const family = def.boarded.length === 1 ? def.boarded[0] : undefined;
            let merged;
            try {
                // THE NUMERIC-STRING FILL (commission 035, 2026-09-24):
                // schema-derived through the carrier — the same seat
                // assertNoCheat reads — card-agnostic, both compose paths,
                // every card, no opt-out. Receipt: `$.width expected number
                // but got 768` (the wire stringified a nested number).
                merged = def.schema(coerceWireNumbers(carrierOf(def), coerceWireArrays(carrierOf(def), unwrapItemArrays(params))));
            }
            catch (e) {
                // THE WIRE-TYPE LEDGER (035's maker gap #2): the bare
                // `got 768` named no type — the receipt could not
                // distinguish string from box. The ledger appends the
                // RECEIVED typeof for every mismatched key.
                throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${e.message}` + wireTypeLedger(carrierOf(def), params));
            }
            assertNoCheat(cardId, def, merged, params);
            assertModRequires(cardId, def, merged, this.objectInfoNodes, this.facts?.extension_node_types ?? {});
            assertArmWeights(cardId, def, merged, this.weightPresent);
            // The same slice law as the model-ful arm: a declared slice
            // map scopes the inferred family too — absent slice is EMPTY,
            // not the union. A zero/multi-board model-less card (no
            // inferred family) keeps the flat gate: refusing loud beats
            // letting a run through ungated.
            const packs = family !== undefined && def.requiresByFamily
                ? (def.requiresByFamily[family] ?? [])
                : def.requires;
            if (packs?.length && this.objectInfoNodes) {
                const extMap = this.facts?.extension_node_types ?? {};
                for (const pack of packs) {
                    const expected = extMap[pack] ?? [];
                    const found = expected.filter((n) => this.objectInfoNodes.has(n));
                    if (expected.length > 0 && found.length === 0) {
                        throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`);
                    }
                }
            }
            const g = new GraphBuilder(this.pinDefaults);
            def.compose(merged, { id: '', family, card: cardId, defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [] }, g, runId, estate);
            const graph = g.toJSON();
            const finalized = def.finalize ? def.finalize(graph) : graph;
            this.assertWiring(cardId, finalized);
            return finalized;
        }
        if (modelId === null || modelId === '') {
            throw new ComposeRefusal('no-model', `card '${cardId}' requires a model id (the {model:} door) — see GET /v1/models`);
        }
        // THE BOARD ADMITS A ROUTE'S OWNING FAMILY (the behavioural
        // re-check's BYPASS 2: a variant's own route is RESOLVED by its
        // DECL, never offered as a model key — so `{model:
        // qwen3-tts-voicedesign, variant: base}` composes the route
        // 'qwen3-tts-voicedesign-base', which is not itself on the
        // board, and the gate refused it in a voice the bench never
        // spoke: the same state admitted here and refused there. A
        // route whose family the card boards IS boarded.)
        if (!def.boarded.includes(modelId)) {
            const owner = this.facts?.owners?.[modelId] ?? modelId;
            if (!def.boarded.includes(owner)) {
                throw new ComposeRefusal('not-boarded', `model '${modelId}' is not boarded on the ${cardId} card (boarded: ${[...def.boarded].sort().join(', ')})`);
            }
        }
        if (!this.facts)
            throw new ComposeRefusal('no-facts', 'model facts not loaded — the compose door requires --facts');
        const model = this.facts.models[modelId];
        if (!model)
            throw new ComposeRefusal('no-model-facts', `model '${modelId}' has no facts row (rows assemble in facts.ts from the registry roster + card slices in packages/engines/comfyui/data/model-facts.json)`);
        if (model.card !== cardId)
            throw new ComposeRefusal('card-mismatch', `model '${modelId}' facts name card '${model.card}', not '${cardId}'`);
        // THE VALUE PLANE'S FAMILY (journey-closure D5, 2026-10-17):
        // the run's ACTIVE family — the facts row's ladder owner (a
        // route address composes under its family; the atom is its own
        // owner). The value clauses below judge against THIS, never the
        // raw address: a routed compose must keep resolving its own
        // family's rows through the fallback.
        const runFamily = model.family ?? modelId;
        // THE ONE param cascade (stroke 34 — the card-recipe layer is
        // DEAD, recipes are family macros now): schema defaults ←
        // model-folder defaults (the family rail feeds through HERE —
        // rail selection resolves this model row; arrays never ride) ←
        // explicit params. The merge below IS the whole law.
        let merged;
        // THE NUMERIC-STRING FILL — the model path shares the same
        // seat (see the model-less arm above for the receipt). Coerced
        // ONCE into a local: the defaults merge below re-spreads THE
        // COERCED body — spreading raw params here re-introduced the
        // stringified number AFTER the walk and a downstream walk
        // refused it bare-voiced (attempt-035's live receipt: walk
        // passed, merge poisoned, `$.width expected number but got
        // 768` surfaced from past the wrap — 2026-09-24).
        const coerced = coerceWireNumbers(carrierOf(def), coerceWireArrays(carrierOf(def), unwrapItemArrays(params)));
        try {
            merged = def.schema(coerced);
        }
        catch (e) {
            throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${e.message}` + wireTypeLedger(carrierOf(def), params));
        }
        merged = { ...merged, ...Object.fromEntries(Object.entries(model.defaults).filter(([, v]) => v !== null && !Array.isArray(v))), ...(coerced ?? {}) };
        assertNoCheat(cardId, def, merged, params);
        // LORA WIRE RESOLUTION (2026-09-10 — the id/name split): the UI
        // boundary emits id-keyed rows ({id, strength} — LoRAEntry, the
        // ONE wire shape since the 2026-09-06 flip); the kit consumes
        // filenames ({name, strength}). The 09-06 flip moved the UI but
        // never the engine consumer — fireLoras read .name off id-keyed
        // rows (undefined) and every LoRA run silently stacked nothing.
        // Resolved HERE — the service owns the flavors via modCatalog —
        // filename-shaped rows (card-authored recipe payloads) pass
        // through; unknown ids refuse LOUD, never a silent plain run.
        // THE LANE BOUNDARY (named 2026-10-15): the `name` arm is the
        // CARD-AUTHORING lane — a recipe payload authored against the
        // engine's own combo, auditable in the card's source. The
        // picker/user lane (hand-typed input) never reaches it: the
        // leaf refuses a typed name and ids resolve against the served
        // rows. Compose stays offline (no live combo fetch); the name
        // the engine lacks dies at /prompt with core's own 400.
        if (Array.isArray(merged.loras)) {
            const cat = this.modCatalogForCompose('loras', modelId, def.boarded);
            merged.loras = merged.loras.map((e) => {
                // strength first (the UI bag's wire shape); hand-authored
                // JSON rows may carry `weight` — honor it, never stack a
                // declared weight at silent full strength. An UNSTATED
                // strength defers to the flavor row's own default_strength
                // when the id resolves one (the GPU receipt finding,
                // 2026-09-18: krea-2's strength-less realism recipe promised
                // the row's 0.7 in its hint while this seed stacked 1.0 —
                // the row's declared default is the family's truth, the
                // same law the controlnet seed serves); filename rows and
                // default-less flavor rows keep full strength.
                const stated = typeof e?.strength === 'number' ? e.strength
                    : typeof e?.weight === 'number' ? e.weight : undefined;
                // steps applied (2026-09-18): a distill adapter's step count
                // rides the entry — the row's catalog default seeds it, an
                // explicit claim overrides it, the sampler honors it when
                // the caller pins no steps of their own. THE STEP-CLAIMING
                // DISTINCTION (007 L2): ONLY a row that declares steps may
                // claim or inherit them — a functional (step-less) row
                // resolves step-LESS even when the entry states a count
                // (a stated count on such a row is refused nowhere — it is
                // ignored, never married — so the face can hide the field
                // for rows that declare none).
                const steps = typeof e?.steps === 'number' && Number.isFinite(e.steps) ? e.steps : undefined;
                if (typeof e?.name === 'string' && e.name !== '') {
                    const strength = stated ?? 1.0;
                    return steps === undefined ? { name: e.name, strength } : { name: e.name, strength, steps };
                }
                const id = typeof e?.id === 'string' ? e.id : '';
                const row = cat.rows.find((r) => r.id === id);
                if (row === undefined) {
                    // THE SHAPE VOICE (friction-report #4, 2026-10-28): an empty
                    // id usually means the ENTRY is mis-shaped (a bare string,
                    // `{loras: ...}`), not that the catalog lacks the row — say
                    // what an entry carries before listing the catalog.
                    const shape = id === '' && typeof e?.name !== 'string'
                        ? ` — the entry carries neither 'name' (raw filename) nor 'id' (catalog row); entries are shaped {id | name, strength?, steps?}, e.g. {id: "krea2_darkbrush"}`
                        : '';
                    throw new ComposeRefusal('unknown-lora', `card '${cardId}' names lora id '${id}' with no '${modelId}' flavor row${shape} (registered: ${cat.rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`);
                }
                // THE VALUE PLANE (D5): the row was found — by THIS family's
                // own flavor, or by the boarded fallback (another family's).
                // Only the first composes.
                this.assertValueFamily('loras', id, runFamily, cardId);
                const resolved = row.steps === undefined ? undefined : (steps ?? row.steps);
                // THE ROW DOMAIN (007 L4): steps_min/steps_max are SERVICE
                // law, not leaf-only — a recipe (or hand payload) may state
                // any count, but a count outside the row's declared domain
                // refuses LOUD here, naming the domain (the leaf's range
                // gate is the face's courtesy; this is the door's).
                if (resolved !== undefined && (row.steps_min !== undefined || row.steps_max !== undefined)) {
                    const lo = row.steps_min, hi = row.steps_max;
                    if ((lo !== undefined && resolved < lo) || (hi !== undefined && resolved > hi)) {
                        throw new ComposeRefusal('lora-steps-range', `card '${cardId}' lora '${id}' steps = ${resolved} is outside the row's declared domain [${lo ?? '…'}, ${hi ?? '…'}] (row default ${row.steps}) — pick a count inside the domain; the call knob stays free, this is the row's own dial`);
                    }
                }
                const strength = stated ?? row.default_strength ?? 1.0;
                // THE MARRIED SHIFT STAMP (SOTA limb 2, the steps stamp's
                // heir): the row's own sigma-shift grid rides the resolved
                // entry when the row declares one and the entry states
                // none — the same stated-first law as steps, so the wire is
                // self-describing for the run record; compose's catalog
                // fallback reads the same column for hand-shaped bags.
                const shiftStated = typeof e?.shift_video === 'number' && Number.isFinite(e.shift_video) ? e.shift_video : undefined;
                const shift = shiftStated ?? row.shift_video;
                const out = { name: row.filename, strength };
                if (resolved !== undefined)
                    out.steps = resolved;
                if (shift !== undefined)
                    out.shift_video = shift;
                return out;
            });
        }
        // THE REFINE SEATS (purge F2, 2026-11-08 — one owner, one
        // voice): the service assembles NO `refine` key — the refine
        // seats (refine_lora / _strength / _steps) pass through to the
        // card door untouched, and the door (h3's resolveRefineSeat)
        // resolves the row, enforces the domain, and mounts the rider.
        // A stale `refine` key (pre-F2 films) is deleted, never honored:
        // two assemblers was the split brain; the door is the one owner.
        // THE FIFTH BAG (2026-10-29 — the h3 second-pass refine arm): the
        // card serves a `refine` MOD BAG (an ARRAY of entries) on this
        // same top-level key. The purge's stale class was the
        // service-assembled OBJECT ({name, strength, steps} — the old
        // second assembler, never an array, never card-authored): a
        // non-array `refine` is still deleted, never honored. An ARRAY
        // is the card's own bag and passes through to the card door
        // untouched — the door (renderH3Refine) validates the seats,
        // enforces max_stack 1, and owns the emission. One owner per
        // shape; the service still assembles nothing.
        if (!Array.isArray(merged.refine))
            delete merged.refine;
        // THE SIXTH BAG (F19, the whole-film deferred upscale): the same
        // one-owner law — the service assembles no `upscale` key; the
        // card's own ARRAY bag passes through to the card door untouched
        // (renderH3ChainUpscale validates the seats and owns the
        // emission), and any non-array spelling is deleted, never
        // honored.
        if (!Array.isArray(merged.upscale))
            delete merged.upscale;
        // CONTROLNET WIRE RESOLUTION (the z-image restoration — the
        // type/model split, the LoRA law above): the leaf emits
        // catalog-keyed rows ({type, strength, ...} — model + preprocessor
        // stamped from the served option); run records carry the retired
        // shape (model, preprocessor, image_b64/artifact, step range,
        // enabled, source). Both normalize to the lane's resolved row
        // (artifact already won over image_b64 here — the retired
        // precedence); unknown types refuse LOUD, never a silent plain
        // run.
        if (Array.isArray(merged.controlnets)) {
            const cat = this.modCatalogForCompose('controlnet', modelId, def.boarded);
            merged.controlnets = merged.controlnets.map((e) => {
                const resolved = resolveControlNetEntry(e, cat.rows, cardId, modelId);
                // THE VALUE PLANE (D5), the controlnet half: the resolved
                // row's type is family truth the same way a lora id is.
                this.assertValueFamily('controlnet', resolved.type, runFamily, cardId);
                return resolved;
            });
        }
        // EXTENSION LAW gate: when the card declares family slices, the
        // ACTIVE family's slice is the WHOLE truth — a family absent
        // from the map needs NO pack (its slice is empty), never the
        // flat union (the cold-start r9 burn: z-image — no slice —
        // inherited qwen-img-21's mask slice through the `?? requires`
        // fallback and refused on a thin engine the graph never touched;
        // the union stays the FLAT face's truth, H4, and the gate of a
        // card that declares no slices). The arm-conditional kind gate
        // rides alongside (bags present in the merged params only — an
        // unused arm never blocks a run).
        assertModRequires(cardId, def, merged, this.objectInfoNodes, this.facts.extension_node_types ?? {});
        assertArmWeights(cardId, def, merged, this.weightPresent);
        const packs = def.requiresByFamily ? (def.requiresByFamily[modelId] ?? []) : (def.requires ?? []);
        if (packs?.length && this.objectInfoNodes) {
            const extMap = this.facts.extension_node_types ?? {};
            for (const pack of packs) {
                const expected = extMap[pack] ?? [];
                const found = expected.filter((n) => this.objectInfoNodes.has(n));
                if (expected.length > 0 && found.length === 0) {
                    throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`);
                }
            }
        }
        const g = new GraphBuilder(this.pinDefaults);
        def.compose(merged, model, g, runId, estate);
        const graph = g.toJSON();
        const finalized = def.finalize ? def.finalize(graph) : graph;
        this.assertWiring(cardId, finalized);
        return finalized;
    }
    /** THE WIRING WALL (2026-10-10, the YOU_ARE_A_LIAR fix shape 4:
     *  "compose wiring validates against the /object_info doc the
     *  estate already holds" — before this the doc fed exactly three
     *  reads (mod-pack node presence, pin autofill, refuse-if-empty)
     *  and NEVER judged the graph a card had just built; a typo'd
     *  class_type or input name sailed to the engine and died there,
     *  in the engine's voice, far from the declaration that authored
     *  it). Walks the built graph: every node's class_type must live
     *  in the doc; every input name must be one the node DECLARES
     *  (when the full doc is held — a names-only snapshot skips the
     *  input gate); a declared input's combo enum and numeric bounds
     *  are judged (staged-artifact references and connection arrays
     *  are carved out — wiringWall's value gate owns that law).
     *  Unarmed (no doc) the wall stands down, the existing law. */
    /** The card-compose seat's wall (the one owner is wiringWall.ts —
     *  the host calls the same function for the merge and splice
     *  seams, so every graph reaching the engine is walked). */
    assertWiring(cardId, graph) {
        assertWiringAgainst(this.objectInfoNodes, this.objectInfoInputs, cardId, graph);
    }
}
/** Narrow every stack field's max_stack in a serialized schema
 *  envelope (schemastery toJSON: {uid, refs}) to the boarded lane's
 *  declared image capacity — the card declares the ROOMIEST boarded
 *  cap; the lane's own max_images is the truth the face must render
 *  (the image-edit law, stated on the card itself). PURE and
 *  immutable: refs carrying no stack cap ride verbatim; the bare
 *  meta spelling narrows with the extra-bag spelling. */
export function narrowStackCap(schema, cap) {
    if (schema === null || typeof schema !== 'object')
        return schema;
    const env = schema;
    if (typeof env.refs !== 'object' || env.refs === null)
        return schema;
    const refs = env.refs;
    const next = {};
    let touched = false;
    for (const [id, ref] of Object.entries(refs)) {
        // a ref with no meta carries no stack cap to narrow — it rides
        // verbatim (both cur sources live under meta; the explicit guard
        // keeps the narrowing path free of unreachable fallback arms)
        if (ref.meta === undefined) {
            next[Number(id)] = ref;
            continue;
        }
        const extra = ref.meta.extra;
        const bare = ref.meta.max_stack;
        const cur = typeof extra?.max_stack === 'number' ? extra.max_stack : typeof bare === 'number' ? bare : undefined;
        if (cur === undefined || cur <= cap) {
            next[Number(id)] = ref;
            continue;
        }
        touched = true;
        const meta = { ...ref.meta, max_stack: cap };
        if (extra !== undefined)
            meta.extra = { ...extra, max_stack: cap };
        next[Number(id)] = { ...ref, meta };
    }
    return touched ? { ...env, refs: next } : schema;
}
//# sourceMappingURL=service.js.map