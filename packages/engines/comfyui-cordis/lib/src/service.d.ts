import Schema from '@deepseek-ai/schemastery';
import { ComfyUIWiringService, type WiringInputSpec } from './wiringWall.ts';
export { ComposeRefusal } from './errors.ts';
import { Context, Service } from '@deepseek-ai/cordis';
import { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { PromptGraph } from '@melite/comfyui-card-kit/graph';
import type { FactsFile, ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { ProvisionRow } from './models/families/contract.ts';
import type { Schema as CarrierSchema } from './params-emit.ts';
export { resolveControlNetEntry } from "./serviceMods.ts";
import type { LoraRowDecl } from "./serviceMods.ts";
import type { AbsorbedMod } from "./serviceMods.ts";
import type { VerbRegistration } from "./serviceMods.ts";
import type { FlavorRegistration } from "./serviceMods.ts";
import type { PackContract } from "./serviceMods.ts";
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
export interface CardFlowOutputBinding {
    channel: string;
    node: string;
    nodeClass: string;
    when?: (params: Record<string, unknown>) => boolean;
}
export declare function resolveCardFlowOutputs(def: Pick<CardDefinition, 'id' | 'flowKinds' | 'flowOutputBindings'>, params: Record<string, unknown>, graph: Record<string, unknown>): {
    outputs: Record<string, string>;
    outputNodes: Record<string, string>;
};
/** The estate's compose call data (J12): the state-root manifest
 *  the estate's compose rim owns (the queue seat's config-named
 *  trees — never an env read). Cards that rewrite root-relative
 *  asset URLs resolve against it; every other card ignores it. */
export interface ComposeEstate {
    stateRoots: readonly string[];
}
export interface CardDefinition {
    id: string;
    /** Stage-row id the compose emits (retired compose.skeleton=
     *  verbatim, SSOT'd from the decls; TS owns the truth post-flip
     *  — required on every card, never a fallback). */
    skeleton: string;
    /** Boarded model ids (the board gate; unboarded models refuse). */
    boarded: readonly string[];
    /** Retrieval tags (the card-catalog search key, 2026-09-09): the
     *  card DECLARES these — modality + operation words the agent
     *  searches ({image, upscale}) — never derived, never the ring's.
     *  Sibling of boarded, NOT identity prose: identity merges with
     *  the frozen ring, tags are orthogonal and always card-owned. */
    tags?: readonly string[];
    /** Pure-tool cards (boarded: [], no model families — the Blender
     *  card precedent): skip the {model:} demand everywhere (cardGate,
     *  compose, CLI). Default true — every existing card needs one. */
    requiresModel?: boolean;
    /** Admission extras (the class-attr `admits` half): params the
     *  compose door admits BEYOND the schema knobs (route stamps,
     *  renderer vocab, studio writes flattened at port time). Most
     *  cards carry none — the schema IS the surface. */
    admits?: readonly string[];
    jsonArrayParams?: readonly string[];
    /** $spell-eligible params (the `spell_params` half): file slots
     *  whose "$name" values pool for two-card-flow handoff instead of
     *  composing. Empty/absent = no spell pooling. */
    spells?: readonly string[];
    /** Extension packs the card's renderers ride (EXTENSION LAW). */
    requires?: readonly string[];
    /** Per-family extension packs — the requires_by_family declaration.
     *  (2026-09-08: declared on the base interface — the compose door
     *  below already read it; tagger.ts / img-to-mesh.ts module
     *  augmentations merge the identical shape. Type-level only.) */
    requiresByFamily?: Record<string, readonly string[]>;
    /** The card's preview claims (output-component gap 4, stroke 67):
     *  `historyStrip: false` claims the bottom bar — an advanced card
     *  whose own face IS the history (h3-timeline's timeline). Served
     *  verbatim on the form-spec doc's `preview` arm; absent = the
     *  strip is ON (the QOL default).
     *
     *  `figure` (stroke 90 + the live follow-up, the keep-all-features
     *  order): the LIVE initial mesh — the native figure the mesh
     *  stage renders BEFORE any run output exists (anny's /poser
     *  shaped bind mesh, never the low-poly GLB export), RESHAPED
     *  live by the card's resolved identity/morph params (the client
     *  derives the coeff arms; the fetch rides the shared
     *  fetchBindMesh surface). Run outputs take the stage once they
     *  land; the figure is the empty state's replacement, never a
     *  second hero. */
    preview?: {
        historyStrip?: boolean;
        figure?: {
            identityModel: string;
        };
        /** the OPTIONAL BOTTOM SEAM (the form-seams stroke 2026-09-17):
         *  claim a scrub timeline along the shell's bottom slot, wired
         *  to the video preview's shared player. Video-output cards. */
        timeline?: boolean;
    };
    /** Card-declared modifier kinds (the MODs generalization,
     *  CONTRACT A): action kinds the CARD owns (MASK's mask sources),
     *  served through the ONE
     *  features.modifiers channel beside the family-DECL pack kinds.
     *  fields/kindFields are the served spec rows (the JSON wire
     *  shape SpecField projects); options carry static catalog rows —
     *  the card IS the catalog for its action kinds. Served VERBATIM
     *  by specModifiers; the leaf never learns the declarer. */
    mods?: readonly DeclaredModifierKind[];
    /** Schemastery schema of the card params (validated before compose).
     *  The callable IS the carrier (N4 cure, 2026-10-22): schemastery
     *  schema objects are functions with `.dict` (+ `.toJSON`), so the
     *  field types the carrier bits it always had — the walk sites no
     *  longer escape through `as unknown` to read them. Cards with
     *  hand-written normalizers leave the bits unset (a card that
     *  WRAPS its schema carries the inner one at schemaCarrier). */
    schema: ((v: unknown) => Record<string, unknown>) & {
        dict?: Record<string, CarrierSchema>;
        toJSON?: () => unknown;
    };
    /** When the registered schema is a hand-written normalizer, the
     *  underlying Schemastery object whose .dict the emitters walk
     *  (formSpec/params-emit). Cards with plain schemas leave this
     *  unset — schema is the carrier. (Ledger row 23, 2026-09-10:
     *  typed as Schema — the field's whole job is carrying .dict;
     *  the old `unknown` forced cast-throughs at every walk site.) */
    schemaCarrier?: Schema;
    compose(params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string, estate?: ComposeEstate): void;
    /** Post-serialize pass — the lane's autofill-strip calibration
     *  (stripAutofill / stripEmptyAutofill). Cards whose renderer
     *  strips port the table here. */
    finalize?(graph: PromptGraph): PromptGraph;
    /** THE IDENTITY RUNG — NATIVE (since 2026-09-10; the frozen ring
     *  DELETED 2026-09-18): EVERY card declares its identity inline
     *  (loadCardDefs refuses a card without one).
     *  icon is the capability-tile glyph; principles are the agent
     *  guidance lines the catalog cards arm serves (empty/absent =
     *  none — most cards carry none). */
    identity?: {
        label: string;
        description: string;
        genre: string;
        icon?: string;
        principles?: readonly string[];
    };
    /** Card-owned download rows (the mask-studio precedent): a
     *  card that is a tool, not weights (boarded: []), still needs
     *  weight bytes through the provision door — it declares them
     *  HERE (same row shape as the family DECL provisions). Family
     *  weights stay on the DECL; card tools carry their own. */
    provisions?: ProvisionRow[];
    /** THE ARM WEIGHTS (the silent-truncation law, 2026-10-09): a
     *  family-less card's pins skip the family presence gate — an
     *  absent weight used to die downstream in silence (the mask
     *  arm truncated with no voice). The card names, per RUN, which
     *  of its provision rows this merged params set actually touches
     *  (the mask card: sam2 bag labels → the sam2 row + the selected
     *  detectors' rows; an unused arm names nothing — an unused arm
     *  never blocks a run). The compose door checks each named row
     *  against the injected presence reader and refuses LOUD with
     *  the missing file + its declared fetch URL. A function like
     *  schema/compose (never serialized — the snapshot serves
     *  derived rows). Absent = no weight gate. */
    armWeights?: (merged: Record<string, unknown>) => readonly string[];
    /** THE UNIVERSAL-SIDEBAR TRIO (sidebar_order /
     *  sidebar / sidebar_hidden half, 2026-09-10): the /v1/forms arm
     *  derives its order/plugin/sidebar_key/hidden row from the CARD,
     *  never a frozen export — one card, one row, REQUIRED (a card
     *  with no sidebar declaration is a declaration bug, refused
     *  loud by the discovery door). key is the sidebar section
     *  (the closed SIDEBAR_SECTIONS vocabulary); order is the global
     *  sidebar position (gaps are retired cards — never renumbered);
     *  hidden keeps utility cards off the rail (they still serve). */
    sidebar: {
        key: string;
        order: number;
        hidden?: boolean;
    };
    /** THE STUDIO SURFACE (the size/layout half): the
     *  form-spec envelope's size/layout derive here — huge cards
     *  render the wide body frame, studio cards the studio frame.
     *  Absent = the plain panel (size null, layout null). */
    surface?: {
        size?: 'huge';
        layout?: 'studio';
    };
    /** THE FLOW-STAGE I/O (the stage half): the /v1/schema
     *  snapshot's per-card row derives here — the flow kinds the
     *  card consumes/produces plus whether a flow stage running this
     *  card routes a model (REQUIRED, even when false — the sfx
     *  precedent: boarding a family and requiring a stage model are
     *  different declarations). */
    flowKinds: {
        inputs: Record<string, string>;
        outputs: Record<string, string>;
        requiresModel: boolean;
        /** THE NAMING LAW (2026-10-09, the operator's catch): one
         *  concept, one visible name. A retired spelling that old
         *  graphs still wire (image-edit's numbered image2/image3)
         *  rides here — the lattice derives its kind so historical
         *  graphs keep validating, but NO face offers it: never a
         *  form row, never a picker seat, never a tool param. The
         *  alias must still exist in the schema carrier (the same
         *  loud gate as inputs) so compose can read it. */
        legacyAliases?: Record<string, string>;
    };
    flowOutputBindings?: readonly CardFlowOutputBinding[];
    /** THE DECLARED HERO (the mask hero defect, 2026-10-09): the
     *  artifact filename STEM that leads the stage gallery (the
     *  history/preview hero is gallery[0] — engine completion order,
     *  which a card saving secondary same-kind artifacts cannot
     *  control). A card whose engine saves more than its product
     *  (the mask card's manifest/crops beside mask_combined)
     *  declares the product's stem here; the harness moves the
     *  matching artifact first (exact stem, stem + "_" counter, or
     *  stem + extension). Generic mechanism, card-owned data — the
     *  engine-film lead is the precedent. Absent = engine order. */
    primaryFile?: string;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        comfyui: ComfyUIService;
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
    setObjectInfo(objectInfo: Record<string, any> | null): void;
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
