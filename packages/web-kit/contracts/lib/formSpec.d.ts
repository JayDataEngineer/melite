/**
 * formSpec.ts — @melite/contracts: the served form-spec contract.
 *
 * One home for the wire both planes speak: the node door builds the
 * body (melite-tools' specBody returns FormSpecDoc, not an untyped
 * record), the browser reads it (card-base re-exports this module, so
 * every `@melite/card-base` importer keeps its one spelling). The
 * types live here — not in card-base — because the node door is a
 * node-plane package and the one-row walls refuse a node package's
 * src importing the web plane's `/client` door.
 */
import type { Wtype } from './extraKeys.ts';
import type { LaneRelations, SamplerEnvelope } from './laneRelations.ts';
/** One node of a serialized schemastery schema (toJSON's refs entry):
 *  `type` discriminates, `meta` carries the declaration's facts
 *  (description/min/max/step/default + the UI bag under meta.extra),
 *  `value` a const's value, `list` a union's member ref ids, `dict`
 *  an object's field-name -> ref-id map. */
export interface SchemaRef {
    type?: string;
    meta?: Record<string, unknown>;
    value?: unknown;
    /** Ref-table ids for list/dict members (schemastery's toJSON
     *  resolves nested schemas to their uid — probed live 2026-10-10:
     *  {"type":"array","meta":{…},"inner":2}). */
    list?: number[];
    dict?: Record<string, number>;
    /** The array/dict INNER schema's ref id — the same uid
     *  resolution as list/dict (declared 2026-10-10: the walker
     *  already cast-read it for entry fields; the interface now
     *  names what rides the wire). */
    inner?: number;
}
/** A serialized schemastery schema (toJSON's envelope): the root
 *  object's ref id plus the ref table. The served form's SSOT — the
 *  walker (fieldsOfEnvelope) derives every field fact from it. */
export interface SchemaEnvelope {
    uid: number;
    refs: Record<number, SchemaRef>;
}
/** One DERIVED form field (fieldsOfEnvelope's output — the client's
 *  presentation descriptor, never a wire row): every fact reads off
 *  the schema node's meta (native wins, the extra bag fills), the
 *  presentation type derives from the node type + declared hint. */
export interface SpecField {
    name: string;
    label: string;
    /** The declaration's extra.order (0 when undeclared) — row order
     *  within the group; dict insertion order is the tie-break. */
    order?: number;
    type: string;
    default?: unknown;
    min?: number;
    max?: number;
    step?: number;
    /** The door's BOTH shapes (lane-read 2026-09-12): plain strings
     *  (img-to-mesh resolution/bg_removal/samplers) or {value,label}
     *  rows. The atom normalizes — the ONE spelling rule. */
    options?: Array<string | {
        value: string;
        label: string;
    }>;
    /** select-only: the closed vocabulary renders as TOGGLE CHIPS
     *  (multi-pick); the wire stays a comma-joined string in the
     *  options' declared order. The YOLO-classes law, 2026-10-08. */
    multi?: boolean;
    group?: string;
    zone?: string;
    required?: boolean;
    placeholder?: string;
    tooltip?: string;
    /** The DECL's OWN VISIBILITY GRAMMAR ("key=value" guards, `&`-ANDed,
     *  one guard's value may be a `|`-SET — fieldVisible interprets; the
     *  declaration owns the leaf law, cards never hand-roll predicates). */
    visible_when?: string;
    /** The DECL's LAYOUT VOCABULARY (stroke 22, the operator's law:
     *  the card package owns the form's geometry — "smaller things
     *  like width/height need to take up one row"): `columns` = the
     *  group's grid columns (declared on the group's fields —
     *  first-seen wins), `width` = this field's column span. A group
     *  without columns stacks one-per-row (today's face). */
    columns?: number;
    width?: number;
    /** The declared layout verb (card-declared kind fields carry it
     *  verbatim — 'image' = the square; the paint verb rides it).
     *  WTYPE_SET's union ('' = the explicit no-hint spelling) — the
     *  write-side bag guard refuses foreign spellings at the
     *  declaration and extraOf refuses them at the read
     *  (strictness fix 5, 2026-10-01). */
    wtype?: Wtype | '';
    /** FACE-OWNED (stroke 95, the embedded leaf): the kind's declared
     *  canvas owns this field's VALUE (the bbox quad under a
     *  bbox-canvas face) — the leaf hides it when the canvas
     *  renders, and shows it when the host degrades (absent face =
     *  the plain inputs hold). */
    faceOwned?: boolean;
    /** THE STACK CAP (the progressive input rail — the operator's law,
     * 2026-09-20: "a generic input row for input squares… adding one
     * causes it to add another available slot one at a time", the mods'
     * own max_stack grammar reused): an image_list field renders one
     * square per entry plus the add-cell until this cap. */
    max_stack?: number;
    /** THE STACK'S MEDIA HINT ('video' | 'audio'; images default): the
     * cell's picker kind + accept posture — typed stacks, one rail. */
    media?: string;
}
/** One DECLARED input edge: `name` is the schema param the edge feeds
 *  (the flowKinds key), `kind` the lane kind it carries (image/text/
 *  ...), and `required` present ONLY when the edge must exist before
 *  a run (True emits, False omits — the law). */
export interface InputEdge {
    name: string;
    kind: string;
    required?: boolean;
}
/** One mod kind (the estate's features.modifiers entry — the old
 *  ModifierKindSpec, the OPEN kind vocabulary: lora/controlnet are
 *  the first instances, never the whole set). The mod surface (the
 *  subcard grid in the drill) renders from THIS; the flat card
 *  fields never carry a mod's param_key (the SubcardGrid law).
 *
 *  THREE KIND SHAPES (the wire, lane-read 2026-09-12 — operator: "the
 *  mod system is core, never hardcoded"):
 *   - OPTION kinds (lora): a served options catalog + strength; the
 *     entry is { id, strength }.
 *   - HYBRID kinds (controlnet): a served options catalog AND entry
 *     fields (the catalog TYPE plus per-entry conditioning image,
 *     strength, step range); the entry is the params object keyed by
 *     its catalog type.
 *   - FIELD kinds (mask): the kind's OWN fields (full spec fields —
 *     image squares, selects, sliders); the entry IS the params
 *     object. The leaf editor renders kind.fields through the same
 *     constructor atoms — the fields NEVER ride the card form flat.
 *
 * DECIDED split, recorded (the dry-sweep's N7, the J13 precedent):
 * this is the FORM-SPEC face, not the wire face — ModifierKindSpec
 * (wireTypes.ts) is the generated wire contract the catalog serves.
 * The two are a projection, not a duplicate: this face adds the
 * envelope split (schema_key, absent on the wire) and widens
 * cardinality to string because the client parses it, while the
 * wire face owns the closed "list" | "scalar" union. Merging them
 * would weld a generated face to a hand-authored one. */
export interface ModifierKind {
    kind: string;
    label: string;
    param_key: string;
    /** THE ENVELOPE KEY (the wire/envelope split: the bag lives at
     *  param_key, the absorbed contract's envelope at schema_key —
     *  identical for loras, split for controlnet). Absent = param_key. */
    schema_key?: string;
    cardinality: string;
    max_stack?: number;
    /** THE ENTRY MODE (served pack vocabulary — the leaf switches on
     *  THIS, never the kind name): 'option' (lora), 'hybrid'
     *  (controlnet), absent = 'field' (mask). option_key names the
     *  catalog-bound field (the hybrid type / the option id). */
    entry?: string;
    option_key?: string;
    /** THE SCALAR FIELD (the bag element's weight dial): 'strength'
     *  for lora/controlnet, 'weight' for ip_adapter — served by the
     *  pack, never client-guessed off the kind name. */
    scalar_key?: string;
    fields?: readonly SpecField[];
    /** Pack-level scalar rows (the controlnet strength floor — envelope
     *  root fields OUTSIDE the bag array). The section renders these
     *  above the tiles; they never ride the flat form (mod-owned). */
    kindFields?: readonly SpecField[];
    options?: readonly ModifierOption[];
    /** THE CATEGORY (the mods-abstraction law, stroke 78): 'standalone'
     *  = every entry applies to the same base image with its OWN
     *  output (order void — no drag stack); 'ordered' (default, the
     *  loras/controlnet stacking law) = entries stack in array order,
     *  each receiving the previous outputs — modifying the model call,
     *  never independent inference. Served verbatim. */
    category?: 'standalone' | 'ordered';
    /** THE MARRIAGE DECLARATION (#36, served from the family DECL):
     *  knob → aggregation — a flavor row in this pack carries a value
     *  for the named card knob (the distill adapters' married step
     *  counts); while a counting bag row rides, the knob is the
     *  BAG's, not the cascade's. 'max' mirrors compose's layering
     *  (Math.max — "8 on a 4-step distill is fine, 4 on an 8-step
     *  is undercooked"). The resolver applies it; every face mirrors
     *  the film. */
    marries?: Record<string, 'max'>;
    /** THE LEAF FACE (paint-leaf-canvas.md, embedded stroke 95):
     *  'paint-canvas' = the kind's first image field gains the
     *  EMBEDDED brush canvas at the top of the mod leaf popup (the
     *  host-delivered component; absent host degrades to the
     *  three-source square). 'bbox-canvas' (stroke 78) = the
     *  entry's faceOwned bbox fields belong to the EMBEDDED
     *  selection canvas — the reference image the user drags a
     *  rectangle on (absent host degrades to the four number
     *  inputs). */
    leaf_face?: 'paint-canvas' | 'bbox-canvas';
    /** THE SECTION CAPTION (2026-10-08, the operator's demand —
     *  "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): the kind's declared
     *  one-line name for what the field stack IS, seated ABOVE the
     *  fields by the leaf (the detector arms name their bbox
     *  filter). Served verbatim; absent = no caption. */
    section?: string;
    /** THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law):
     *  pack ids this kind's arm needs live on the engine. Served
     *  verbatim; the compose door enforces them only when the kind's
     *  bag is non-empty (an unused arm never blocks a run). */
    requires?: readonly string[];
}
/** One served catalog row (the discovery options projection — the
 *  row's resolved facts ride along so the hybrid leaf can stamp
 *  them; the lane re-validates, never trusts). */
export interface ModifierOption {
    value: string;
    label: string;
    tooltip?: string;
    /** The row's scalar default, keyed by the pack's scalar field
     *  (strength for lora/controlnet, weight for ip_adapter) — plus
     *  the MARRIED step counts the distill adapters carry (steps,
     *  steps_min/max — the discovery face serves them verbatim). */
    defaults?: {
        [scalar: string]: number | undefined;
    };
    model?: string;
    preprocessor?: string;
}
/** One variant-matrix row (the spec ROOT's `variants` — the flattened
 *  variant×quant matrix the door serves; wire shape pinned by the old
 *  card-detail-variant-axes test, 2026-08-18): a `group: 'Variant'`
 *  row is an axis entry; a `group: 'Quant'` row is a matrix CELL whose
 *  `owner` names the Variant row it composes with (THE CHAIN: variant
 *  filters quant, one direction). `defaults` is the resolver overlay
 *  applied on pick (raw → {model: krea-2-raw, steps: 52, cfg: 3.5}). */
export interface FormVariantRow {
    id: string;
    label: string;
    group: string;
    defaults: Record<string, unknown>;
    route: string;
    hint?: string | null;
    engine?: string | null;
    /** THE VARIANT'S SAMPLER DOMAIN (2026-10-10, the DECL audit's
     *  row 3): the DECL's sampler_envelope — [min,max] for steps and
     *  cfg, the domain the bench judges. Null when the variant
     * declares none (the family's own domain rides). */
    sampler_envelope?: SamplerEnvelope | null;
    quant?: string | null;
    vram_peak_gb?: number | null;
    owner?: string;
}
/** The served form-spec document — the card package's emission as the
 *  base consumes it. */
export interface FormSpecDoc {
    /** Served card label (the discovery identity's label — null when
     *  the door serves no display name). */
    label?: string | null;
    /** The estate service key that owns the card's runs. */
    service?: string | null;
    /** The card's guide document (served null when none). */
    guide?: unknown;
    /** The loader's own info row (served null when none). */
    loader_info?: unknown;
    /** The enhance-prompt claim (served null when none). */
    enhance_prompt?: unknown;
    /** The per-mode enhance prompts (the sweep's SSOT read: prompt +
     *  optional lyrics). */
    enhance_prompts?: {
        prompt: unknown;
        lyrics?: string;
    } | null;
    /** The card's served contract row (null when none). */
    contract?: unknown;
    form: string;
    genre?: string;
    engine?: string;
    /** THE CARD'S SERIALIZED SCHEMA (schemastery toJSON — the served
     *  form's SSOT; null only for a carrier that cannot serialize).
     *  fieldsOf derives the field list; every layering fact reads off
     *  the envelope. THE FLAT FIELD ROW IS GONE (the parameter
     *  audit): no parallel serialization survives. */
    schema?: SchemaEnvelope | null;
    /** THE ABSORBED MOD CONTRACTS' envelopes, keyed by pack (the
     *  family-scoped absorption server-side). The modifier surface
     *  derives its param rows from THESE — same walker, one meta
     *  path. */
    mod_schemas?: Record<string, SchemaEnvelope | null>;
    /** THE BASE LAYER INPUT (the family row's own defaults —
     *  resolveValue layers it over the schema defaults, under the
     *  user). */
    model_defaults?: Record<string, unknown>;
    /** THE FAMILY the spec serves (?model=<key> resolution) — the Model
     *  axis' resting value and the run's family when no variant re-point
     *  has ridden (the pass-along law, 2026-09-12). */
    model?: string | null;
    /** THE FAMILIES BLOCK (the no-silent-drop law, hour 26 stroke 17):
     *  every family the card BOARDS, presence-marked against the
     *  machine's live catalog. A boarded-but-not-downloaded model
     *  serves HERE — visible and marked — so the Model rail can offer
     *  it disabled with its reason instead of silently dropping it
     *  (the bench doors refuse it loudly at write time with the same
     *  list). */
    families?: ReadonlyArray<{
        id: string;
        present: boolean;
        label?: string;
    }>;
    /** THE PACKS BLOCK (the no-silent-drop law's extension half,
     *  stroke 18): the card's declared extension packs for this
     *  family, presence-marked by the EXTENSION-LAW gate's own read.
     *  present:false = the run will refuse (missing extension) — the
     *  rail prompts install; present:null = unknown (engine facts not
     *  loaded — no mark, no guess). Never a silently absent pack. */
    packs?: ReadonlyArray<{
        id: string;
        present: boolean | null;
    }>;
    /** THE VARIANT MATRIX rows (spec ROOT — the old wire law f8d5ea7):
     *  Variant rows + Quant cells, flattened. Empty when the family
     *  declares no matrix. */
    variants?: FormVariantRow[];
    /** THE INPUT EDGES — declared on every card (flowKinds.inputs),
     *  each joined with the schema's required fact. */
    inputs?: InputEdge[];
    /** THE OUTPUT EDGES — declared on every card (flowKinds.outputs):
     *  what a completed run of this card delivers, keyed by slot. */
    outputs?: Record<string, string>;
    /** THE CARD'S PREVIEW CLAIMS (served verbatim off the card's own
     *  declaration — CardDefinition.preview): `historyStrip: false`
     *  claims the bottom bar; `figure` claims the native shaped mesh
     *  for the empty state (the client derives the LIVE coeff arms
     *  from the resolved params — see poser-figure.tsx). */
    preview?: {
        historyStrip?: boolean;
        figure?: {
            identityModel: string;
        };
        timeline?: boolean;
    };
    /** The mod system's kind vocabulary — the dynamic mods offer
     *  (served when the family boards mod packs). Also carries the
     *  variant-axis GROUPS contract (variant_groups, the old wire law:
     *  label/tooltip/filters_on per group) when the family declares
     *  axis groups. */
    features?: {
        modifiers?: ModifierKind[];
        variant_groups?: Record<string, {
            label?: string;
            tooltip?: string;
            filters_on?: string | null;
            default?: string;
        }>;
    };
    /** The estate's surface envelope (served TOP-LEVEL by the door —
     *  2026-09-12 lane read): layout='studio' means a registered view
     *  exists (the client's business is the keyed slot, not this flag);
     *  size='huge' is the estate's only size class — the zoom card's
     *  width law consumes it. */
    layout?: string | null;
    size?: string | null;
    /** THE LANE CONTRACT (2026-10-10, the YOU_ARE_A_LIAR fix shape 2:
     *  the family's declared parameter surface + relation words,
     *  served with the spec — "a variant's field set IS its
     *  declaration"). Present only when the family declares a base
     *  surface; the form resolves the lane (family base ∪ variant
     *  additions, laneSurfaceOf) and judges the words
     *  (judgeLaneRelations) — the SAME declaration the bench-write
     *  door refuses with, one spelling (@melite/contracts/
     *  laneRelations). Absent = the legacy truth (visible_when owns
     *  visibility; nothing binds the card's union table). */
    lanes?: {
        /** ABSENT = the family declares no surface (krea-2's shape:
         * relations + variant envelopes only) — the form falls back to
         * the card's own visibility; `base: []` stays the explicit
         * black-form statement. */
        base?: readonly string[];
        relations?: LaneRelations;
        /** The model's own numeric domains (the RANGE RULE — served so
         *  the form renders the floor/ceiling inline, the same
         *  declaration the bench door refuses with). */
        bounds?: Readonly<Record<string, {
            min?: number;
            max?: number;
        }>>;
        variants?: Record<string, {
            params?: readonly string[];
            relations?: LaneRelations;
            bounds?: Readonly<Record<string, {
                min?: number;
                max?: number;
            }>>;
        }>;
    };
}
//# sourceMappingURL=formSpec.d.ts.map
