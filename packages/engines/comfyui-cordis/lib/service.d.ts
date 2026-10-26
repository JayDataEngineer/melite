import { ComfyUIWiringService, type WiringInputSpec } from './wiringWall.js';
export { ComposeRefusal } from '@melite/comfyui-card-kit/errors';
import { Context, Service } from '@deepseek-ai/cordis';
import type { PromptGraph } from '@melite/comfyui-card-kit/graph';
import type { FactsFile } from '@melite/comfyui-card-kit/facts';
export { resolveControlNetEntry } from "./serviceMods.js";
import type { LoraRowDecl, AbsorbedMod, VerbRegistration, FlavorRegistration } from '@melite/comfyui-card-kit/service-faces';
import type { CardDefinition, ComposeEstate } from '@melite/comfyui-card-kit/card-definition';
import type { PackContract } from "@melite/comfyui-card-kit/pack-fields";
/**
 * The wire tool name derived from a card id (hyphens→underscores +
 * "_card"). ONE spelling of the law (M2′ stroke 2, 2026-09-09):
 * the gateway projection (toolProjection) and every card package's
 * in-package tool emission consume this — the derivation is never
 * restated.
 */
export declare const cardWireName: (id: string) => string;
/** One card-declared modifier kind (the declarer face of the served
 *  ModifierKind — structural, the JSON wire shape). `entry` follows
 *  the served vocabulary: 'option' | 'hybrid' | undefined = field. */
export interface DeclaredModifierKind {
    kind: string;
    label: string;
    param_key: string;
    entry?: string;
    option_key?: string;
    scalar_key?: string;
    cardinality: string;
    max_stack?: number;
    fields?: readonly Record<string, unknown>[];
    kindFields?: readonly Record<string, unknown>[];
    options?: readonly Record<string, unknown>[];
    /** THE CATEGORY (the mods-abstraction law, stroke 78):
     *  'standalone' = every entry applies to the SAME base image and
     *  provides its OWN output (sam2/sam3 mask sources — order is
     *  semantically void); 'ordered' (default, the stacking law every
     *  pack kind follows — loras/controlnet) = entries STACK in array
     *  order, each receiving the previous outputs, modifying the
     *  model call — no independent inference. Served verbatim; the
     *  section renders the drag stack ONLY on ordered kinds. */
    category?: 'standalone' | 'ordered';
    /** THE LEAF FACE (paint-leaf-canvas.md): 'paint-canvas' = the
     *  kind's payload field offers the brush verb beside the square
     *  (the modal arrives from the host; absent host degrades to the
     *  three-source square — the payload PNG is the contract either
     *  way). 'bbox-canvas' (stroke 78) = the entry's bbox_x/y/w/h
     *  fields offer the rectangle verb — an image preview the user
     *  drags a selection on (absent host degrades to the four number
     *  inputs). Served verbatim like every declared row. */
    leaf_face?: 'paint-canvas' | 'bbox-canvas';
    /** THE SECTION CAPTION (2026-10-08, the operator's filter demand —
     *  "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): a one-line caption
     *  the leaf seats ABOVE the field stack, naming what the stack
     *  IS. The detector arms use it to NAME the bbox filter (the
     *  class chips + confidence ARE the filter — automated, Impact
     *  Pack boxes + YOLO; a caption-less stack reads as loose
     *  inputs). Served verbatim; absent = no caption. */
    section?: string;
    /** THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law,
     *  2026-09-19 — the operator: "declared, then auto provisioned"):
     *  pack ids this KIND's arm needs live (impact-pack nodes for the
     *  SAM2 chain). The compose door enforces them ONLY when the
     *  kind's bag is non-empty — an unused arm never blocks a run
     *  (the card-level `requires` above stays the always-on gate).
     *  Served verbatim; absent = no arm requirements. */
    requires?: readonly string[];
}
export declare function resolveCardFlowOutputs(def: Pick<CardDefinition, 'id' | 'flowKinds' | 'flowOutputBindings'>, params: Record<string, unknown>, graph: Record<string, unknown>): {
    outputs: Record<string, string>;
    outputNodes: Record<string, string>;
};
declare module '@deepseek-ai/cordis' {
    interface Context {
        comfyuiWiring: ComfyUIWiringService;
    }
}
export declare class ComfyUIService extends Service {
    private readonly cards;
    private readonly packs;
    private readonly flavors;
    private readonly verbs;
    private facts;
    /** Live object_info node names — set before compose to arm the gate. */
    /** The engine's declared node census, published so ANY seat can walk a
     *  graph against it (2026-10-10, the bypass audit's HIGH-3: the wall
     *  used to be reachable only from this class, so the merge and splice
     *  paths — which produce the graph that actually reaches the engine —
     *  went unwalked). Null before the doc lands; the wall stands down. */
    objectInfoNodes: Set<string> | null;
    /** The wiring doc's DECLARED inputs per node (required ∪
     *  optional, value facts attached) — compose's final wall
     *  (assertWiring) walks every built graph against it: input
     *  names, combo enums, numeric bounds. Null = names-only
     *  snapshot (the node gate stands, the input gate waits — never
     *  a guessed refusal). */
    objectInfoInputs: Map<string, Map<string, WiringInputSpec>> | null;
    /** Models-tree presence reader — set before compose to arm the
     *  arm-weight gate (mirrors objectInfoNodes: null = fail-open). */
    private weightPresent;
    /** Autofill defaults map (class → input → default), derived
     *  from the live node-definitions doc. */
    private pinDefaults;
    constructor(ctx: Context);
    /** Register one card. REVERTIBLE (the paper's effect shape, Def. 8:
     *  the mutation RETURNS its inverse — Γ → Γ × (Γ→Γ)). The card's
     *  plugin wraps this in ctx.effect(() => svc.registerCard(def)):
     *  the FIBER owns the disposer, unload runs it, the card plane
     *  reverts to the pre-registration state. LOUD: duplicate ids
     *  refuse (one card, one plugin). */
    registerCard(def: CardDefinition): (() => void);
    /** Register one PACK CONTRACT — the category (the Mod parent).
     *  LOUD: field gates at registration (the metaclass's
     *  import-time validation); ONE SHAPE per pack name (a second
     *  contract for the same pack with different fields is drift
     *  one declaration per name means one shape per name). */
    registerPack(contract: PackContract): (() => void);
    /** Register one FLAVOR — a family's boarding of a pack (the
     *  Model.mods tuple entry; the family's own mods/<pack>.ts file).
     *  Fields are INHERITED from the pack contract — a flavor never
     *  carries fields. LOUD: the pack must exist (a flavor for an
     *  unknown pack is drift); every family id non-empty. The
     *  flavor↔DECL.mods interlock runs boot-loud on the models side
     *  (validateBootContracts). */
    registerFlavor(flavor: FlavorRegistration): (() => void);
    /** The registered pack names (the category taxonomy — the boot
     *  gate reads this to refuse dead DECL.mods refs). */
    packNames(): string[];
    /** The flavor registrations (the boot gate's side of the
     *  flavor↔boarding interlock). */
    flavorRegistrations(): readonly FlavorRegistration[];
    /** The registered verb ids (SubActionMods — the anny plane; the
     *  boot gate reads this to satisfy DECL.mods verb entries). */
    verbIds(): string[];
    /** The verb registrations (the boot gate's side of the
     *  verb↔boarding interlock — a verb naming a family that never
     *  boarded it is an undeclared mutation). */
    verbRegistrations(): readonly VerbRegistration[];
    /** Register one verb. LOUD: the plane law (exactly one engine
     *  arm per engine row) and one registration per verb id (two
     *  classes mounting one id is the's loud refusal). */
    registerVerb(verb: VerbRegistration): (() => void);
    /** THE ABSORPTION (dsl._absorb_models, read-side): for every
     *  PACK, the fields (the category contract — inherited by every
     *  boarding) join the card surface scoped to the families whose
     *  FLAVORS intersect the card's boarded set — THE MODEL-LEVEL
     *  MUTATION: one join per family, inherited by every variant and
     *  quant of that family (the cascade rides below this surface). */
    cardModFields(cardId: string): AbsorbedMod[];
    /** The mod's catalog rows for one family (lora picks). THE
     *  RUNTIME CATALOG LAW: a flavor with runtimeCatalog and no own
     *  rows serves the UNION of every flavor's declared rows of the
     *  same pack; family rows always win over the union. */
    modRows(pack: string, family: string): readonly LoraRowDecl[];
    /** The mod catalog rows plus their provenance (the discovery
     *  door's modifier tooltip: union-served rows carry the shared
     *  suffix, family rows do not). ONE spelling of the runtime
     *  catalog law — modRows rides this. */
    modCatalog(pack: string, family: string): {
        rows: readonly LoraRowDecl[];
        shared: boolean;
    };
    /** The mod catalog for a COMPOSE (route-aware): variant routes
     *  compose under their own address (the BROKEN-C resolved
     *  address), but flavors key by FAMILY — a routed compose matches
     *  no flavor and every mod id refuses unknown-*. When the route
     *  address serves no rows, resolve against the card's boarded
     *  families (board order, first match wins — the cardVerbs
     *  precedent). Non-routed composes match directly and never reach
     *  the fallback, so no settled card changes voice. */
    modCatalogForCompose(pack: string, modelId: string, boarded: readonly string[]): {
        rows: readonly LoraRowDecl[];
        shared: boolean;
    };
    /** THE VALUE PLANE's family-of-a-value read (journey-closure D5,
     *  2026-10-17): the families a mod VALUE is registered to,
     *  derived from the live flavor registrations — the real DECL
     *  mods trees' compositions (each family's own mods/<pack>.ts),
     *  never a hand list. A row belongs to the families whose OWN
     *  rows carry the id; the runtime-catalog union (modCatalog's
     *  shared arm) re-serves other families' rows but never re-homes
     *  them. */
    private valueFamilies;
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
    private assertValueFamily;
    /** The verbs mounted on a card (SubActionMods of its boarded
     *  families — knobs NEVER on the card surface). */
    cardVerbs(cardId: string): VerbRegistration[];
    /** THE SCHEMA ENVELOPE FACE (the parameter audit, 2026-09-14:
     *  the frozen 15-key wire row and its re-derivation helpers died —
     *  the card's own schemastery toJSON() IS the served form, the
     *  SSOT one serializer). Returns the card schema's serialized
     *  envelope plus the family-absorbed mod contracts' envelopes
     *  keyed by pack; null when the card is unknown. Families-scoped
     *  card fields and every presentation fact derive CLIENT-side off
     *  the envelope (fieldsOf in card-base) — the server invents no
     *  intermediate row anymore. */
    formSchemas(cardId: string, family: string): {
        schema: unknown;
        mods: Record<string, unknown>;
    } | null;
    setFacts(facts: FactsFile): void;
    /** Registry read for the serving surfaces (params_schema emitter):
     * the registered definition by card id. Read-only — registration
     * still rides registerCard only. */
    getCardDef(id: string): CardDefinition | undefined;
    /** Registered card ids (sorted) — census + refusal text reuse. */
    cardIds(): string[];
    setObjectInfo(objectInfo: Record<string, unknown> | null): void;
    /** Legacy: node-name set only (gate arming without autofill). */
    setObjectInfoNodes(nodes: Iterable<string> | null): void;
    /** THE WEIGHT PRESENCE READER (the silent-truncation law,
     *  2026-10-09): arms the arm-weight gate. The harness seats the
     *  models-tree reader here before compose (null = fail-open for
     *  walls and fixtures, the absent-pin degrade). */
    setWeightPresent(fn: ((relativePath: string, name: string) => boolean) | null): void;
    /** THE PACK PRESENCE READ (the no-silent-drop law's extension
     *  half, hour 26 stroke 18): the EXTENSION-LAW gate's own check as
     *  a READ for the serving surfaces (the spec's packs block, the
     *  load bundle's pack hints). Same semantics, one spelling — a
     *  pack is present when at least one of its declared node types
     *  (facts.extension_node_types) is live on the engine; a pack with
     *  NO declared node types, or engine facts not loaded, is UNKNOWN
     *  (null — the gate cannot see it either; never a guessed mark). */
    packPresence(packs: readonly string[]): Array<{
        id: string;
        present: boolean | null;
    }>;
    /** THE PACK FIELD-NAMES READ (022's self-critique #3, 2026-09-24):
     *  the registered contract's own field names, declaration order —
     *  the agent-facing load surface serves the pack grammar (param_key
     *  + fields) without re-deriving anything; this read IS the
     *  contract (the same map registerPack validates loudly, one shape
     *  per name). Unknown pack = empty (the grammar table's consumer
     *  drops the row, same as an unregistered flavor). */
    packFieldNames(pack: string): string[];
    compose(cardId: string, modelId: string | null, params: unknown, runId: string, estate?: ComposeEstate): PromptGraph;
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
    assertWiring(cardId: string, graph: unknown): void;
}
/** Narrow every stack field's max_stack in a serialized schema
 *  envelope (schemastery toJSON: {uid, refs}) to the boarded lane's
 *  declared image capacity — the card declares the ROOMIEST boarded
 *  cap; the lane's own max_images is the truth the face must render
 *  (the image-edit law, stated on the card itself). PURE and
 *  immutable: refs carrying no stack cap ride verbatim; the bare
 *  meta spelling narrows with the extra-bag spelling. */
export declare function narrowStackCap(schema: unknown, cap: number): unknown;
//# sourceMappingURL=service.d.ts.map
