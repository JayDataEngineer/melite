/**
 * spec.ts — @melite/card-base: THE EMISSION CONTRACT.
 *
 * A card package EMITS; the base CONSTRUCTS (operator order,
 * 2026-09-12: "The package to construct the card ui should see that
 * the card package emits an image input, then constructs the input
 * component automatically"). This module is the emission's client-side
 * shape — the served form-spec document as the base consumes it —
 * plus the PURE projections. No fetchers here (wire.ts), no
 * components (form.tsx): types and derivations only.
 *
 * THE LAYERED-PARAMS LAW (the parameter audit, 2026-09-14 — the
 * DSH settings model, subsystems/settings.md): the form-spec serves
 * the card's own SERIALIZED SCHEMA (schemastery toJSON — the SSOT,
 * one serializer server-side) and the bench's stage params ARE the
 * USER layer: a key's PRESENCE is the override mark, never its
 * value. resolveValue layers schema defaults <- model defaults <-
 * served stamps <- user — the engine's compose cascade verbatim,
 * resolved client-side so the form shows exactly what a run
 * composes. Edits are set/unset ops over the user layer; a family
 * Recipe macro pick is an ordinary multi-set of declared keys —
 * no stamp ledger, no value-compare heuristics, no heal walk
 * (seedUser's one validation clause aside).
 *
 * THE EDGE LAW (operator order, 2026-09-12: "whenever a card emits
 * via the package system, it needs to have 'input' 'required=True',
 * or 'output', so the edges are defined"): every card's emission
 * carries `inputs` — one row per declared input edge, the required
 * fact joined per the law (dsl.py Field.emit: `required: True
 * emits, False omits`) — and `outputs`, the declared output edges.
 * The base constructs input components and picker candidates from
 * THESE, never from result-URL sniffing.
 */

/** One node of a serialized schemastery schema (toJSON's refs entry):
 *  `type` discriminates, `meta` carries the declaration's facts
 *  (description/min/max/step/default + the UI bag under meta.extra),
 *  `value` a const's value, `list` a union's member ref ids, `dict`
 *  an object's field-name -> ref-id map. */
export interface SchemaRef {
  type?: string
  meta?: Record<string, unknown>
  value?: unknown
  /** Ref-table ids for list/dict members (schemastery's toJSON
   *  resolves nested schemas to their uid — probed live 2026-10-10:
   *  {"type":"array","meta":{…},"inner":2}). */
  list?: number[]
  dict?: Record<string, number>
  /** The array/dict INNER schema's ref id — the same uid
   *  resolution as list/dict (declared 2026-10-10: the walker
   *  already cast-read it for entry fields; the interface now
   *  names what rides the wire). */
  inner?: number
}

/** A serialized schemastery schema (toJSON's envelope): the root
 *  object's ref id plus the ref table. The served form's SSOT — the
 *  walker (fieldsOfEnvelope) derives every field fact from it. */
export interface SchemaEnvelope {
  uid: number
  refs: Record<number, SchemaRef>
}

/** Build an envelope from raw dict nodes — the TEST-side and
 *  migration-side constructor; the served envelopes come from
 *  schemastery's own toJSON. Ids assign in insertion order; a node
 *  carrying `consts` (string labels or {value,label} rows) expands
 *  into minted const refs with the union's `list` wired to them —
 *  the shape schemastery's union-of-consts serializes to. */
export function schemaEnvelope(dict: Record<string, SchemaRef & { consts?: unknown }>): SchemaEnvelope {
  const refs: Record<number, SchemaRef> = { 0: { type: 'object', dict: {} } }
  let uid = 0
  for (const [name, raw] of Object.entries(dict)) {
    uid += 1
    const nodeId = uid
    const node: SchemaRef = { ...raw }
    const consts = (node as Record<string, unknown>)['consts']
    delete (node as Record<string, unknown>)['consts']
    if (Array.isArray(consts)) {
      const list: number[] = []
      for (const c of consts) {
        uid += 1
        if (typeof c === 'string') {
          refs[uid] = { type: 'const', value: c }
        } else if (typeof c === 'object' && c !== null) {
          const row = c as { value: unknown; label?: unknown }
          refs[uid] = {
            type: 'const', value: row.value,
            ...(row.label !== undefined ? { meta: { description: String(row.label) } } : {}),
          }
        }
        list.push(uid)
      }
      node.list = list
      if (node.type === undefined) node.type = 'union'
    }
    refs[nodeId] = node
    refs[0].dict![name] = nodeId
  }
  return { uid: 0, refs }
}


// THE ONE VOCABULARY (2026-10-10): the extra-bag contract lives at
// the floor (@melite/contracts/extraKeys — zero deps, one spelling
// shared by the web tier, the engine tier, and every card
// declaration; before it, the form spelled visible_when while the
// tool face spelled visibleWhen — a dead read for every card).
import { extraOf, type ExtraBag, type ExtraKey } from '@melite/contracts/extraKeys'
import {
  judgeLaneBounds,
  judgeLaneRelations,
  judgeLaneSurface,
  laneBoundsOf,
  laneSurfaceOf,
  type LaneBounds,
  type LaneRelations,
  type LaneViolation,
} from '@melite/contracts/laneRelations'

/** One DERIVED form field (fieldsOfEnvelope's output — the client's
 *  presentation descriptor, never a wire row): every fact reads off
 *  the schema node's meta (native wins, the extra bag fills), the
 *  presentation type derives from the node type + declared hint. */
export interface SpecField {
  name: string
  label: string
  /** The declaration's extra.order (0 when undeclared) — row order
   *  within the group; dict insertion order is the tie-break. */
  order?: number
  type: string
  default?: unknown
  min?: number
  max?: number
  step?: number
  /** The door's BOTH shapes (lane-read 2026-09-12): plain strings
   *  (img-to-mesh resolution/bg_removal/samplers) or {value,label}
   *  rows. The atom normalizes — the ONE spelling rule. */
  options?: Array<string | { value: string; label: string }>
  /** select-only: the closed vocabulary renders as TOGGLE CHIPS
   *  (multi-pick); the wire stays a comma-joined string in the
   *  options' declared order. The YOLO-classes law, 2026-10-08. */
  multi?: boolean
  group?: string
  zone?: string
  required?: boolean
  placeholder?: string
  tooltip?: string
  /** The DECL's OWN VISIBILITY GRAMMAR ("key=value" guards, `&`-ANDed,
   *  one guard's value may be a `|`-SET — fieldVisible interprets; the
   *  declaration owns the leaf law, cards never hand-roll predicates). */
  visible_when?: string
  /** The DECL's LAYOUT VOCABULARY (stroke 22, the operator's law:
   *  the card package owns the form's geometry — "smaller things
   *  like width/height need to take up one row"): `columns` = the
   *  group's grid columns (declared on the group's fields —
   *  first-seen wins), `width` = this field's column span. A group
   *  without columns stacks one-per-row (today's face). */
  columns?: number
  width?: number
  /** The declared layout verb (card-declared kind fields carry it
   *  verbatim — 'image' = the square; the paint verb rides it). */
  wtype?: string
  /** FACE-OWNED (stroke 95, the embedded leaf): the kind's declared
   *  canvas owns this field's VALUE (the bbox quad under a
   *  bbox-canvas face) — the leaf hides it when the canvas
   *  renders, and shows it when the host degrades (absent face =
   *  the plain inputs hold). */
  faceOwned?: boolean
  /** THE STACK CAP (the progressive input rail — the operator's law,
   * 2026-09-20: "a generic input row for input squares… adding one
   * causes it to add another available slot one at a time", the mods'
   * own max_stack grammar reused): an image_list field renders one
   * square per entry plus the add-cell until this cap. */
  max_stack?: number
  /** THE STACK'S MEDIA HINT ('video' | 'audio'; images default): the
   * cell's picker kind + accept posture — typed stacks, one rail. */
  media?: string
}

/** One DECLARED input edge: `name` is the schema param the edge feeds
 *  (the flowKinds key), `kind` the lane kind it carries (image/text/
 *  ...), and `required` present ONLY when the edge must exist before
 *  a run (True emits, False omits — the law). */
export interface InputEdge {
  name: string
  kind: string
  required?: boolean
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
 *     constructor atoms — the fields NEVER ride the card form flat. */
export interface ModifierKind {
  kind: string
  label: string
  param_key: string
  /** THE ENVELOPE KEY (the wire/envelope split: the bag lives at
   *  param_key, the absorbed contract's envelope at schema_key —
   *  identical for loras, split for controlnet). Absent = param_key. */
  schema_key?: string
  cardinality: string
  max_stack?: number
  /** THE ENTRY MODE (served pack vocabulary — the leaf switches on
   *  THIS, never the kind name): 'option' (lora), 'hybrid'
   *  (controlnet), absent = 'field' (mask). option_key names the
   *  catalog-bound field (the hybrid type / the option id). */
  entry?: string
  option_key?: string
  /** THE SCALAR FIELD (the bag element's weight dial): 'strength'
   *  for lora/controlnet, 'weight' for ip_adapter — served by the
   *  pack, never client-guessed off the kind name. */
  scalar_key?: string
  fields?: SpecField[]
  /** Pack-level scalar rows (the controlnet strength floor — envelope
   *  root fields OUTSIDE the bag array). The section renders these
   *  above the tiles; they never ride the flat form (mod-owned). */
  kindFields?: SpecField[]
  options?: ModifierOption[]
  /** THE CATEGORY (the mods-abstraction law, stroke 78): 'standalone'
   *  = every entry applies to the same base image with its OWN
   *  output (order void — no drag stack); 'ordered' (default, the
   *  loras/controlnet stacking law) = entries stack in array order,
   *  each receiving the previous outputs — modifying the model call,
   *  never independent inference. Served verbatim. */
  category?: 'standalone' | 'ordered'
  /** THE MARRIAGE DECLARATION (#36, served from the family DECL):
   *  knob → aggregation — a flavor row in this pack carries a value
   *  for the named card knob (the distill adapters' married step
   *  counts); while a counting bag row rides, the knob is the
   *  BAG's, not the cascade's. 'max' mirrors compose's layering
   *  (Math.max — "8 on a 4-step distill is fine, 4 on an 8-step
   *  is undercooked"). The resolver applies it; every face mirrors
   *  the film. */
  marries?: Record<string, 'max'>
  /** THE LEAF FACE (paint-leaf-canvas.md, embedded stroke 95):
   *  'paint-canvas' = the kind's first image field gains the
   *  EMBEDDED brush canvas at the top of the mod leaf popup (the
   *  host-delivered component; absent host degrades to the
   *  three-source square). 'bbox-canvas' (stroke 78) = the
   *  entry's faceOwned bbox fields belong to the EMBEDDED
   *  selection canvas — the reference image the user drags a
   *  rectangle on (absent host degrades to the four number
   *  inputs). */
  leaf_face?: 'paint-canvas' | 'bbox-canvas'
  /** THE SECTION CAPTION (2026-10-08, the operator's demand —
   *  "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): the kind's declared
   *  one-line name for what the field stack IS, seated ABOVE the
   *  fields by the leaf (the detector arms name their bbox
   *  filter). Served verbatim; absent = no caption. */
  section?: string
  /** THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law):
   *  pack ids this kind's arm needs live on the engine. Served
   *  verbatim; the compose door enforces them only when the kind's
   *  bag is non-empty (an unused arm never blocks a run). */
  requires?: string[]
}

/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
 *  served modifier kind owns — its fields' names plus its param_key
 *  (the bag storage). CardForm EXCLUDES these from the flat param
 *  groups: mod params render ONLY inside the mod system. PURE. */
export function modOwnedFields(spec: FormSpecDoc): Set<string> {
  const owned = new Set<string>()
  for (const k of spec.features?.modifiers ?? []) owned.add(k.param_key)
  for (const env of Object.values(spec.mod_schemas ?? {})) {
    if (env == null) continue
    const root = env.refs[env.uid]
    for (const name of Object.keys(root?.dict ?? {})) owned.add(name)
  }
  return owned
}


/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
 *  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
export function isOptionKind(k: ModifierKind): boolean {
  return (k.options ?? []).length > 0
}

/** THE HYBRID TEST (the served entry mode — never the kind name):
 *  catalog rows AND bag-element entry fields. */
export function isHybridKind(k: ModifierKind): boolean {
  return k.entry === 'hybrid'
}

/** The catalog-bound field (the hybrid type / the option id) —
 *  'id' when the door serves no key (the lora backstop). */
export function optionKeyOf(k: ModifierKind): string {
  return typeof k.option_key === 'string' && k.option_key !== '' ? k.option_key : 'id'
}

/** The scalar dial of a bag element (the pack's own name —
 *  'strength' backstop when the door serves none). */
export function scalarKeyOf(k: ModifierKind): string {
  return typeof k.scalar_key === 'string' && k.scalar_key !== '' ? k.scalar_key : 'strength'
}

/** One served catalog row (the discovery options projection — the
 *  row's resolved facts ride along so the hybrid leaf can stamp
 *  them; the lane re-validates, never trusts). */
export interface ModifierOption {
  value: string
  label: string
  tooltip?: string
  /** The row's scalar default, keyed by the pack's scalar field
   *  (strength for lora/controlnet, weight for ip_adapter) — plus
   *  the MARRIED step counts the distill adapters carry (steps,
   *  steps_min/max — the discovery face serves them verbatim). */
  defaults?: { [scalar: string]: number | undefined }
  model?: string
  preprocessor?: string
}

/** One variant-matrix row (the spec ROOT's `variants` — the flattened
 *  variant×quant matrix the door serves; wire shape pinned by the old
 *  card-detail-variant-axes test, 2026-08-18): a `group: 'Variant'`
 *  row is an axis entry; a `group: 'Quant'` row is a matrix CELL whose
 *  `owner` names the Variant row it composes with (THE CHAIN: variant
 *  filters quant, one direction). `defaults` is the resolver overlay
 *  applied on pick (raw → {model: krea-2-raw, steps: 52, cfg: 3.5}). */
export interface VariantRow {
  id: string
  label: string
  group: string
  defaults: Record<string, unknown>
  route: string
  hint?: string | null
  engine?: string | null
  /** THE VARIANT'S SAMPLER DOMAIN (2026-10-10, the DECL audit's
   *  row 3): the DECL's sampler_envelope — [min,max] for steps and
   *  cfg, the domain the bench judges. Null when the variant
   * declares none (the family's own domain rides). */
  sampler_envelope?: { steps: number[]; cfg: number[] } | null
  quant?: string | null
  vram_peak_gb?: number | null
  owner?: string
}

/** The served form-spec document — the card package's emission as the
 *  base consumes it. */
export interface FormSpecDoc {
  form: string
  genre?: string
  engine?: string
  /** THE CARD'S SERIALIZED SCHEMA (schemastery toJSON — the served
   *  form's SSOT; null only for a carrier that cannot serialize).
   *  fieldsOf derives the field list; every layering fact reads off
   *  the envelope. THE FLAT FIELD ROW IS GONE (the parameter
   *  audit): no parallel serialization survives. */
  schema?: SchemaEnvelope | null
  /** THE ABSORBED MOD CONTRACTS' envelopes, keyed by pack (the
   *  family-scoped absorption server-side). The modifier surface
   *  derives its param rows from THESE — same walker, one meta
   *  path. */
  mod_schemas?: Record<string, SchemaEnvelope | null>
  /** THE BASE LAYER INPUT (the family row's own defaults —
   *  resolveValue layers it over the schema defaults, under the
   *  user). */
  model_defaults?: Record<string, unknown>
  /** THE FAMILY the spec serves (?model=<key> resolution) — the Model
   *  axis' resting value and the run's family when no variant re-point
   *  has ridden (the pass-along law, 2026-09-12). */
  model?: string | null
  /** THE FAMILIES BLOCK (the no-silent-drop law, hour 26 stroke 17):
   *  every family the card BOARDS, presence-marked against the
   *  machine's live catalog. A boarded-but-not-downloaded model
   *  serves HERE — visible and marked — so the Model rail can offer
   *  it disabled with its reason instead of silently dropping it
   *  (the bench doors refuse it loudly at write time with the same
   *  list). */
  families?: ReadonlyArray<{ id: string; present: boolean; label?: string }>
  /** THE PACKS BLOCK (the no-silent-drop law's extension half,
   *  stroke 18): the card's declared extension packs for this
   *  family, presence-marked by the EXTENSION-LAW gate's own read.
   *  present:false = the run will refuse (missing extension) — the
   *  rail prompts install; present:null = unknown (engine facts not
   *  loaded — no mark, no guess). Never a silently absent pack. */
  packs?: ReadonlyArray<{ id: string; present: boolean | null }>
  /** THE VARIANT MATRIX rows (spec ROOT — the old wire law f8d5ea7):
   *  Variant rows + Quant cells, flattened. Empty when the family
   *  declares no matrix. */
  variants?: VariantRow[]
  /** THE INPUT EDGES — declared on every card (flowKinds.inputs),
   *  each joined with the schema's required fact. */
  inputs?: InputEdge[]
  /** THE OUTPUT EDGES — declared on every card (flowKinds.outputs):
   *  what a completed run of this card delivers, keyed by slot. */
  outputs?: Record<string, string>
  /** THE CARD'S PREVIEW CLAIMS (served verbatim off the card's own
   *  declaration — CardDefinition.preview): `historyStrip: false`
   *  claims the bottom bar; `figure` claims the native shaped mesh
   *  for the empty state (the client derives the LIVE coeff arms
   *  from the resolved params — see poser-figure.tsx). */
  preview?: { historyStrip?: boolean; figure?: { identityModel: string }; timeline?: boolean }
  /** The mod system's kind vocabulary — the dynamic mods offer
   *  (served when the family boards mod packs). Also carries the
   *  variant-axis GROUPS contract (variant_groups, the old wire law:
   *  label/tooltip/filters_on per group) when the family declares
   *  axis groups. */
  features?: {
    modifiers?: ModifierKind[]
    variant_groups?: Record<string, { label?: string, tooltip?: string, filters_on?: string | null, default?: string }>
  }
  /** The estate's surface envelope (served TOP-LEVEL by the door —
   *  2026-09-12 lane read): layout='studio' means a registered view
   *  exists (the client's business is the keyed slot, not this flag);
   *  size='huge' is the estate's only size class — the zoom card's
   *  width law consumes it. */
  layout?: string | null
  size?: string | null
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
    base: readonly string[]
    relations?: LaneRelations
    /** The model's own numeric domains (the RANGE RULE — served so
     *  the form renders the floor/ceiling inline, the same
     *  declaration the bench door refuses with). */
    bounds?: Readonly<Record<string, { min?: number; max?: number }>>
    variants?: Record<string, { params?: readonly string[]; relations?: LaneRelations; bounds?: Readonly<Record<string, { min?: number; max?: number }>> }>
  }
}

/** One catalog card (/v1/model-catalog's cards section). */
export interface CatalogCard {
  id: string
  label: string
  description: string
  genre: string
  families: string[]
}

/** THE TITLE-CASE FACE (the operator's sweep law): machine ids
 *  (krea-2, z-image, euler, comfyui…) render titled — never raw.
 *  FACES ONLY: option values, param keys, and wire bodies keep the
 *  verbatim id (the 1:1 law — the eye gets prose, the door gets the
 *  id). First letter of each separator-bound word upper, the rest
 *  untouched (INT8 stays INT8); idempotent on titled prose. */
export function titleCaseId(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter((w) => w !== '')
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(' ')
}

export type SpecValues = Record<string, unknown>

/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
 *  resolveValue's first layer; the base never invents one). */
export function specDefaults(fields: SpecField[]): SpecValues {
  const out: SpecValues = {}
  for (const f of fields) {
    if (f.default !== undefined && f.default !== null) out[f.name] = f.default
  }
  return out
}

/** ── THE UNSET-FACE LAW (hour 22 — the operator's catch: "steps is
 *  blank… the UI doesn't even reflect the call that will be sent") ──
 *
 * An unset field serializes ABSENT from the wire doc and the
 * ADMISSION GATE fills the SCHEMA'S OWN DEFAULT at compose. Every
 * face must therefore show EXACTLY what composes for an unset field:
 * the explicit inherited stamp first (a run-level override sitting
 * over the floor), else the schema's declared default, else nothing
 * — a bare "inherit" is honest ONLY when no schema truth exists.
 * ONE law in the generic surface; no face hand-rolls this chain
 * again (the h3 knob fold's private copy silently dropped the
 * default and showed "inherit" while the engine sent 12). PURE. */
export type UnsetFace = { composed: string | undefined; from: 'stamp' | 'schema' | 'none' }

export function composeUnset(inherited: unknown, schemaDefault: unknown): UnsetFace {
  if (inherited !== undefined && inherited !== null && inherited !== '') {
    return { composed: String(inherited), from: 'stamp' }
  }
  if (schemaDefault !== undefined && schemaDefault !== null) {
    return { composed: String(schemaDefault), from: 'schema' }
  }
  return { composed: undefined, from: 'none' }
}

/** The unset face's LABEL: a run stamp names its source ('← 28'); the
 *  schema default rides plain (it is not inheriting anything — it IS
 *  the engine's compose floor); 'inherit' only when nothing
 *  composes. */
export function unsetFaceLabel(face: UnsetFace): string {
  if (face.composed === undefined) return 'inherit'
  return face.from === 'stamp' ? `← ${face.composed}` : face.composed
}

/** The unset face's PROSE (the tooltip): names in words what unset
 *  composes. `render` adapts the vocabulary (e.g. boolean on/off). */
export function unsetFaceTip(face: UnsetFace, render?: (v: string) => string): string {
  const v = (render ?? ((x) => x))(face.composed ?? '')
  if (face.from === 'stamp') return `unset — inherits ${v} from the run`
  if (face.from === 'schema') return `unset — the engine composes ${v} (the schema's default)`
  return 'unset — the engine default applies'
}

/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
 *
 * One pure projection: serialized schemastery schema -> derived
 * SpecFields. Every presentation fact lives in the nodes' meta (the
 * declaration IS the UI contract — the Field.emit law); this
 * walk reads, never invents. THE ORDER: dict insertion order with
 * the declared `order` hint as tie-break (a stable sort — equal
 * keys keep insertion order).
 *
 * Families scoping: a node whose extra.families names families the
 * spec does NOT serve skips (the absorption is family-scoped —
 * the card serves only the boarded plane).
 *
 * Nullable pairs: a union of [X, const(null)] wires as X — the
 * OUTER meta wins (schemastery's nullable() shape, probed live on
 * image-gen 2026-09-14).
 *
 * Presentation types (the audit's client-side derivation — a view
 * choice over typed meta, never a server row): extra.wtype wins
 * (declared presentation); union-of-consts -> select; number ->
 * step 1 -> seed, any other step -> slider, no step -> slider;
 * string -> text; boolean -> boolean; array -> loras.
 *
 * Option labels: a union's const members carry their own
 * meta.description (the emitter's label law) — the declared
 * extra.options override when present. */
export function fieldsOfEnvelope(
  env: SchemaEnvelope | null | undefined,
  family?: string,
): SpecField[] {
  if (env == null) return []
  const root = env.refs[env.uid]
  return projectDict(env, root?.dict ?? {}, family)
}

/** THE HYBRID PROJECTION (the controlnet restoration): the envelope
 *  root's bag array (param_key) holds entry OBJECTS — project the
 *  ELEMENT's dict as the kind's entry fields (the catalog select
 *  joins them in the leaf). Empty when the bag is absent or its
 *  element is not an object (a pure OPTION kind like lora). */
export function entryFieldsOfEnvelope(
  env: SchemaEnvelope | null | undefined,
  paramKey: string,
  family?: string,
): SpecField[] {
  if (env == null) return []
  const root = env.refs[env.uid]
  const at = root?.dict?.[paramKey]
  const node = at === undefined ? undefined : env.refs[at]
  const innerId = (node as { inner?: unknown } | undefined)?.inner
  const inner = typeof innerId === 'number' ? env.refs[innerId] : undefined
  if (node?.type !== 'array' || inner?.type !== 'object') return []
  return projectDict(env, inner.dict ?? {}, family)
}

/** THE PACK-LEVEL PROJECTION (the controlnet strength floor): the
 *  envelope root's fields OUTSIDE the bag array — the section's own
 *  rows above the tiles. Bag-external arrays are not section rows
 *  (no atom renders a bag) — scalars only. */
export function kindScalarFieldsOfEnvelope(
  env: SchemaEnvelope | null | undefined,
  paramKey: string,
  family?: string,
): SpecField[] {
  if (env == null) return []
  const root = env.refs[env.uid]
  const dict = { ...(root?.dict ?? {}) }
  delete dict[paramKey]
  for (const [name, id] of Object.entries(dict)) {
    if (env.refs[id]?.type === 'array') delete dict[name]
  }
  return projectDict(env, dict, family)
}

/** The dict projector (the walker's body — one meta path for the
 *  root, the hybrid element, and the pack-level rows). */
function projectDict(
  env: SchemaEnvelope,
  dict: Record<string, number>,
  family?: string,
): SpecField[] {
  const out: SpecField[] = []
  for (const [name, id] of Object.entries(dict)) {
    let node: SchemaRef | undefined = env.refs[id]
    if (node === undefined) continue
    // nullable unwrap: union [inner, const(null)] -> inner, outer meta wins
    if (node.type === 'union' && Array.isArray(node.list) && node.list.length === 2) {
      const a = env.refs[node.list[0]]
      const b = env.refs[node.list[1]]
      const nullConst = (r: SchemaRef | undefined): boolean =>
        r?.type === 'const' && r.value === null
      if (a !== undefined && b !== undefined
          && ((nullConst(a) && b.type !== 'const') || (nullConst(b) && a.type !== 'const'))) {
        node = nullConst(a) ? b : a
      }
    }
    const meta: Record<string, unknown> = node.meta ?? {}
    // ONE VOCABULARY (2026-10-10, the operator's law: "literally
    // impossible to speak two vocabularies"): the bag narrows
    // through the floor's typed read — every key below spells the
    // contract's own constant spelling, never a second string
    // literal (the visible_when/visibleWhen dead-read crime's
    // structural cure).
    const extra: Partial<ExtraBag> = extraOf(node)
    const families = Array.isArray(extra.families)
      ? extra.families as unknown[] : null
    if (families !== null && family !== undefined
        && !families.includes(family)) continue
    // THE HIDDEN ARM (2026-09-21, the blank-rows catch): a field
    // declaring extra.hidden is VALIDATION-ONLY — the schema walk
    // still refuses garbage for it (the operator's vocabulary
    // law: "the schema enforces EVERY key the renderer reads"),
    // but it NEVER renders: renderer vocabulary (k, noise_seed),
    // legacy aliases (interp_switch), and renderer spellings
    // (image_name) are gate keys, not surface fields. A blank
    // default-less row on the form face is a lie.
    if (extra.hidden === true) continue
    // union options: const members, labels from their meta.description
    let options: Array<string | { value: string; label: string }> | undefined
    if (node.type === 'union' && Array.isArray(node.list)) {
      const opts: Array<string | { value: string; label: string }> = []
      for (const mid of node.list) {
        const m = env.refs[mid]
        if (m?.type !== 'const') continue
        const v = m.value
        if (v === null || v === undefined) continue
        const label = typeof m.meta?.['description'] === 'string'
          ? m.meta['description'] as string : String(v)
        if (label === String(v)) opts.push(String(v))
        else opts.push({ value: String(v), label })
      }
      if (opts.length > 0) options = opts
    }
    if (Array.isArray(extra.options)) {
      options = (extra.options as unknown[]).map((o) =>
        typeof o === 'string' ? o
          : typeof o === 'object' && o !== null && 'value' in (o as Record<string, unknown>) && 'label' in (o as Record<string, unknown>)
            ? { value: String((o as Record<string, unknown>)['value']), label: String((o as Record<string, unknown>)['label']) }
            : String(o))
    }
    // presentation type: declared hint wins, else derive
    const hint = typeof extra.wtype === 'string' ? extra.wtype : ''
    let type: string
    if (hint !== '') type = hint
    else if (options !== undefined && node.type === 'union') type = 'select'
    else if (node.type === 'number') type = String(meta['step'] ?? '') === '1' ? 'seed' : 'slider'
    else if (node.type === 'string') type = 'text'
    else if (node.type === 'boolean') type = 'boolean'
    else if (node.type === 'array') type = 'loras'
    else type = node.type ?? 'string'
    const num = (k: string): number | undefined =>
      typeof meta[k] === 'number' ? meta[k] as number : undefined
    // the str() reads ride the TYPED bag first (the contract's own
    // spelling), the raw meta as the schemastery-native fallback
    // (description-class keys) — one vocabulary, two layers
    const str = (k: ExtraKey, m?: string): string | undefined => {
      const b = extra[k]
      if (typeof b === 'string') return b
      const mk = m ?? k
      return typeof meta[mk] === 'string' ? meta[mk] as string : undefined
    }
    out.push({
      name,
      label: typeof meta['description'] === 'string' && meta['description'] !== ''
        ? meta['description'] as string : name,
      order: typeof extra.order === 'number' ? extra.order : undefined,
      type,
      default: meta['default'] === undefined ? undefined : meta['default'],
      min: num('min'), max: num('max'),
      step: type === 'seed' ? undefined : num('step'),
      options,
      group: str('group') ?? '',
      zone: str('zone'),
      required: extra.required === true || meta['required'] === true,
      placeholder: str('placeholder'),
      tooltip: str('tooltip'),
      visible_when: str('visible_when'),
      columns: typeof extra.columns === 'number' ? extra.columns as number : undefined,
      width: typeof extra.width === 'number' ? extra.width as number : undefined,
      max_stack: typeof extra.max_stack === 'number' ? extra.max_stack as number : undefined,
      media: str('media'),
    })
  }
  // declared order first, dict insertion order as tie-break (stable)
  return out.map((f, i) => [f, i] as const).sort((a, b) =>
    (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0])
}

/** THE EDIT COERCION (the one specPatch duty that survives, moved
 * to the edit boundary): atoms emit raw strings while typing; a
 * numeric field's edit rides the user layer as a NUMBER. An
 * unparseable/empty numeric string rides VERBATIM (display
 * continuity through clear-and-retype — the bench drill's law; a
 * blank that reaches the run's schema parse refuses loud, naming
 * the field — never a silent 0). `v === undefined` stays undefined
 * (the tri-state's inherit — the caller's unset signal). The
 * STUDIOS' blank-inherits law lives one door up, at their own edit
 * verb (useResolvedForm) — each face owns its blank semantics.
 * PURE. */
export function coerceFieldEdit(f: SpecField | undefined, v: unknown): unknown {
  if (v === undefined) return undefined
  if (f !== undefined && (f.type === 'number' || f.type === 'seed' || f.type === 'slider')
      && typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return v
}

/** THE FAMILY-KEY RESOLUTION (the families-DRY law, 2026-09-21):
 * a field's `families` declares BASE family ids — the card's
 * boarded ids — while the served model key may be a COMPOSED
 * catalog row (family-variant-quant, e.g. 'pixal3d-1536-int8').
 * Resolve the active key to its base against the spec's OWN
 * boarded-families rows: the longest id matching the key at a
 * '-' boundary wins (a 'pixal3d' + 'pixal3d-pro' board resolves
 * to the longer). An unresolved key passes through verbatim —
 * single-family cards and keys with no boarded base walk
 * unchanged; the resolution never drops a field, it only widens
 * what a declared base id covers. */
export function resolveFamilyKey(spec: FormSpecDoc): string | undefined {
  const key = typeof spec.model === 'string' ? spec.model : undefined
  if (key === undefined || key === '') return undefined
  const boarded = spec.families
  if (boarded === undefined) return key
  let best: string | undefined
  for (const row of boarded) {
    const exact = key === row.id
    const prefixed = key.startsWith(row.id + '-')
      && (best === undefined || row.id.length > best.length)
    if (exact || prefixed) best = row.id
  }
  return best ?? key
}

/** The card's own derived fields (the schema envelope walked,
 * families-scoped to the served family). Memoize at the caller for
 * hot loops — the walk is pure. */
export function fieldsOf(spec: FormSpecDoc): SpecField[] {
  return fieldsOfEnvelope(spec.schema, resolveFamilyKey(spec))
}

/** THE LAYERED RESOLUTION — the engine's compose cascade mirrored
 * client-side (stroke 34 — the card-recipe layer is dead): schema
 * defaults <- model defaults <- SERVED STAMPS <- user. The form
 * SHOWS exactly what a run composes; `user` rides verbatim by key
 * presence (a PRESENCE is the override mark, never its value — the
 * settings law). Arrays (lora bags) and nulls in model_defaults
 * skip, matching the engine's overlay filter.
 *
 * THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
 * stage row's `resolved` map — prepareCardParams' own stamped +
 * lifted body, served by the drafts doors. It layers UNDER the user
 * (presence still wins) and OVER model_defaults (the server's own
 * family/variant stamps replace the client's guesses — variant
 * resolver_defaults, family defaults, the surface filter). Absent
 * base = the registry-less lane derive. PURE. */
export function resolveValue(spec: FormSpecDoc, user: SpecValues, base?: SpecValues): SpecValues {
  const out: SpecValues = specDefaults(fieldsOf(spec))
  for (const [k, v] of Object.entries(spec.model_defaults ?? {})) {
    if (v === null || Array.isArray(v)) continue
    out[k] = v
  }
  if (base !== undefined) {
    for (const [k, v] of Object.entries(base)) {
      if (v === null || v === undefined || Array.isArray(v)) continue
      out[k] = v
    }
  }
  // THE INHERIT LAW (the blank-rows cure's own header: "undefined is
  // the tri-state's inherit signal — the unset"): a materialized
  // undefined/null key on the user layer INHERITS the resolved
  // default — it never overwrites it. The raw Object.assign wrote
  // undefined over every declared default for any surface whose
  // state materializes its knobs (the h3 studio's LayerA does —
  // every optNum key is an own undefined when unset), blanking
  // Steps/Denoise/Shift on a fresh document while every wall ran
  // green (they pass sparse fixtures, never materialized ones).
  // Arrays RIDE (the mod bag is a user pick; only base/model layers
  // skip arrays — their owners are the DECL, not the user).
  for (const [k, v] of Object.entries(user)) {
    if (v === null || v === undefined) continue
    out[k] = v
  }
  // THE MARRIAGE MIRROR (#36, the recipes rework — compose card.ts's
  // own layering verbatim: "a call's own knobs > the lora entry's
  // steps > this steps row"): when a served kind declares a knob
  // marriage and a counting bag rides, the knob is the BAG's —
  // stated on the row first, else the catalog row's default, Math.max
  // across the bag ("8 on a 4-step distill is fine, 4 on an 8-step
  // is undercooked"). The film already runs this law server-side
  // (the service resolves bag ids against the family catalog); the
  // face shows what the film runs — Steps reads 8 with the plaguekind
  // turbo riding, 4 with dareties, NEVER the neutral 12. A bag id
  // the catalog does not serve contributes nothing HERE (the mod
  // plane and the compose door refuse unknown ids loudly — the
  // resolver never invents a refusal of its own).
  for (const kind of spec.features?.modifiers ?? []) {
    if (kind.marries === undefined) continue
    const bag = out[kind.param_key]
    if (!Array.isArray(bag) || bag.length === 0) continue
    const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]))
    for (const knob of Object.keys(kind.marries)) {
      const counts: number[] = []
      for (const row of bag as Array<Record<string, unknown>>) {
        const stated = row?.[knob]
        if (typeof stated === 'number' && Number.isFinite(stated)) {
          counts.push(stated)
          continue
        }
        const id = typeof row?.['id'] === 'string' ? row['id'] : undefined
        const fromCatalog = id === undefined ? undefined
          : (catalog.get(id)?.defaults as Record<string, unknown> | undefined)?.[knob]
        if (typeof fromCatalog === 'number' && Number.isFinite(fromCatalog)) counts.push(fromCatalog)
      }
      if (counts.length > 0) out[knob] = Math.max(...counts)
    }
  }
  return out
}

/** evalVisibleWhen's serving shape: "key=value" guards, `&`-ANDed;
 * one guard's value may be a `|`-SET ("key=a|b" = key ∈ {a,b}).
 * (The ONE schema grammar — a field declares its own visibility;
 * the walker interprets, cards never hand-rolled predicates.) A
 * field with no visible_when always shows. Unknown guard keys:
 * show (never hide on a typo). Examples:
 *   "sharpen_enabled=true"
 *   "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass" */
export function fieldVisible(f: SpecField, values: SpecValues): boolean {
  const rule = f.visible_when
  if (typeof rule !== 'string' || rule === '') return true
  for (const guard of rule.split('&')) {
    const g = guard.trim()
    // THE GRAMMAR'S FULL LAW (deep pass 2026-10-10, pinned by the
    // estate law suite's LAW 7): guards are `key=want|want` or
    // `key!=want|want`; keys and wants TRIM; the literal `null` is
    // the UNSET face (undefined/empty). Before this pass the
    // interpreter honored `=` alone — every `!= null` guard on the
    // wire parsed as key `image1 ` (trailing space) wanting
    // `! null`, NEVER true: dead grammar the law suite caught.
    const ne = g.indexOf('!=')
    const eq = ne >= 0 ? -1 : g.indexOf('=')
    let key: string
    let wants: string[]
    let negate = false
    if (ne >= 0) {
      key = g.slice(0, ne).trim()
      wants = g.slice(ne + 2).split('|').map((w) => w.trim())
      negate = true
    } else if (eq >= 0) {
      key = g.slice(0, eq).trim()
      wants = g.slice(eq + 1).split('|').map((w) => w.trim())
    } else {
      continue
    }
    if (key === '') continue
    const val = String(values[key] ?? '')
    // `null` matches the unset face ('' | undefined | null)
    const hit = wants.some((w) => (w === 'null' ? val === '' : w === val))
    if (negate === hit) return false
  }
  return true
}

// ── THE LANE CONTRACT (2026-10-10, the YOU_ARE_A_LIAR fix shape 2)
// ─────────────────────────────────────────────────────────────────
// "a variant's field set IS its declaration": when the spec serves
// `lanes`, the DECLARED surface owns field visibility for the
// resolved lane (family base ∪ variant additions — laneSurfaceOf,
// the same call the bench door resolves with) and the relation
// words gate INLINE (judgeLaneRelations — the same judgment the
// bench-write refusal rides). One declaration, two faces.
//
// THE visible_when TRUTH (li-aq.3, the design audit's F6): for a
// declaring family the lane surface and visible_when BOTH judge —
// they AND (a field hidden by either is hidden; a lane whose
// surface omits a field never shows it no matter what the table
// says). Nothing "retires": the table stays live for non-declaring
// families, and fails SAFE under the declaration.
//
// THE BASE-ABSENT SHAPE (F8, stated so nobody rediscovers it):
// `laneSurfaceOf` derives the family BASE from the declaration's
// params list — a family that declares variants but leaves the
// family base EMPTY surfaces ONLY the variant additions (the base
// is a statement, not a guess); the bench door resolves the same
// way (one call), so the two faces cannot diverge.

/** The resolved lane surface for the current variant, or null when
 *  the family declares none (the legacy truth — visibility falls
 *  back to visible_when). `variantId` is the RESOLVED variant
 *  value (values.variant); an unknown id inherits the family base
 *  verbatim (a Quant-only or unset axis). */
export function laneSurfaceFor(
  spec: FormSpecDoc,
  variantId: string | null,
): readonly string[] | null {
  const lanes = spec.lanes
  if (lanes === undefined) return null
  const extra = variantId === null ? undefined : lanes.variants?.[variantId]?.params
  return laneSurfaceOf(lanes.base, extra)
}

/** The relation words that judge the resolved lane: the family's
 *  own + the variant's own (both layers fire — the DECL cascade). */
export function laneRelationsFor(
  spec: FormSpecDoc,
  variantId: string | null,
): LaneRelations[] {
  const lanes = spec.lanes
  if (lanes === undefined) return []
  const out: LaneRelations[] = []
  if (lanes.relations !== undefined) out.push(lanes.relations)
  const v = variantId === null ? undefined : lanes.variants?.[variantId]?.relations
  if (v !== undefined) out.push(v)
  return out
}

/** The numeric bounds that judge the resolved lane: family rows,
 *  per-field replaced by the variant's own (the DECL cascade's
 *  replace-law for numbers). */
export function laneBoundsFor(
  spec: FormSpecDoc,
  variantId: string | null,
): LaneBounds | null {
  const lanes = spec.lanes
  if (lanes === undefined) return null
  return laneBoundsOf(
    lanes.bounds ?? null,
    variantId === null ? undefined : lanes.variants?.[variantId]?.bounds ?? null,
  )
}

/** Field visibility UNDER the lane contract: a declared surface
 *  hides every field it does not name (the declaration is the
 *  author — the field set IS the variant); a family that declares
 *  no surface keeps the visible_when grammar. */
export function fieldOnLane(
  spec: FormSpecDoc,
  paramName: string,
  values: SpecValues,
): boolean {
  const variantId = typeof values['variant'] === 'string' && values['variant'] !== ''
    ? values['variant']
    : null
  const surface = laneSurfaceFor(spec, variantId)
  if (surface === null) return true
  return surface.includes(paramName)
}

/** THE INLINE GATE: the lane's relation + surface violations over
 *  what the state CARRIES — rendered under the named field while the
 *  user types, refused by the bench door when the state is saved.
 *  Empty = a state the run accepts.
 *
 *  THE CARRIED LAYERS, NOT THE RESOLVED MAP (2026-10-10, the
 *  form-plane audit's CRITICAL-1): the resolved `values` map
 *  materializes schema defaults and model_defaults as own
 *  properties, so a defaulted field reads as STATED whether the user
 *  ever touched it. On a lane that excludes a defaulted field that
 *  produced a perpetual, UNCURABLE warning: the row was hidden
 *  (fieldOnLane) so the cure ("drop it") was unclickable, and
 *  unsetting it re-materialized the default. The bench judges the
 *  PREPARED body — the operator's own params plus the stamps that
 *  survive the null-skip — so the form judges the same thing: the
 *  user layer over the base layer, non-null keys only. A schema
 *  default is a PREFILL the operator never sent, and a variant's
 *  `voice: null` stamp is exactly how the bench says "no persona on
 *  this lane". */
export function laneViolations(
  spec: FormSpecDoc,
  fields: readonly SpecField[],
  user: SpecValues,
  base?: SpecValues,
): LaneViolation[] {
  // THE VARIANT, tri-state (2026-10-10, the audit's HIGH-3): the
  // axes write `variant: ''` when a family switch clears the pick,
  // and a pick can name a row this spec never served. Both are the
  // RUN door's voice (selectCardVariant refuses an unknown variant;
  // the run resolves the cleared one), so this gate stands down —
  // judging the family base there flagged states the bench admits.
  // An ABSENT variant key is different: the family default (the
  // head) is what composes, and the family base is its surface.
  const carried = (key: string): unknown =>
    Object.prototype.hasOwnProperty.call(user, key) ? user[key] : (base ?? {})[key]
  const rawVariant = carried('variant')
  if (rawVariant !== undefined && rawVariant !== null) {
    if (typeof rawVariant !== 'string' || rawVariant === '' || !laneVariantServed(spec, rawVariant)) return []
  }
  const variantId = typeof rawVariant === 'string' && rawVariant !== '' ? rawVariant : null
  const surface = laneSurfaceFor(spec, variantId)
  // A FAMILY THAT DECLARES RELATIONS BUT NO SURFACE still gets its
  // words judged (2026-10-10, the DECL audit's HIGH-2): the bench
  // judges relations regardless of surface, so returning here would
  // leave the form silently building what the door refuses — the
  // exact failure this whole shape exists to kill. Latent today (no
  // such DECL), fatal the day one lands.
  const relations = laneRelationsFor(spec, variantId)
  if (surface === null && relations.length === 0) return []
  const names = fields.map((f) => f.name)
  const stated: Record<string, unknown> = {}
  for (const src of [base ?? {}, user]) {
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined) continue
      stated[k] = v
    }
  }
  // THE RANGE RULE'S FORM FACE (2026-10-10): the model's numeric
  // domains judge here too — the same declaration, the same voice,
  // the cure rendered under the field while the user types instead
  // of at the save. (The bounds see the STATED map, not the raw
  // user layer: a stated field over its ceiling is a refusal at
  // every seat; a defaulted field inside its row never fires.)
  const bounds = laneBoundsFor(spec, variantId)
  return [
    ...judgeLaneSurface(surface, names, stated),
    ...judgeLaneRelations(relations, stated),
    ...judgeLaneBounds(bounds, stated),
  ]
}

/** Does the served doc offer this variant id? The VARIANT rows are
 *  the served truth — a recipe row and a surface-less variant
 *  (voicedesign) legitimately carry no `lanes.variants` entry and
 *  still inherit the family base, so the check reads spec.variants
 *  ids, never the lanes map's keys. */
function laneVariantServed(spec: FormSpecDoc, variantId: string): boolean {
  const rows = Array.isArray(spec.variants) ? spec.variants : []
  return rows.some((row) => {
    const rec = row as { id?: unknown; key?: unknown }
    return rec?.id === variantId || rec?.key === variantId
  })
}

/** Group the visible fields (the spec's own group key, first-appearance
 *  order — ungrouped first under no heading). */
export function groupFields(fields: SpecField[], values: SpecValues): Array<{ group: string | null; fields: SpecField[] }> {
  const out: Array<{ group: string | null; fields: SpecField[] }> = []
  for (const f of fields) {
    if (!fieldVisible(f, values)) continue
    const g = typeof f.group === 'string' && f.group !== '' ? f.group : null
    const known = out.find((x) => x.group === g)
    if (known === undefined) out.push({ group: g, fields: [f] })
    else known.fields.push(f)
  }
  return out
}

/** The declared input edge for a param, if the emission names one
 *  (THE EDGE LOOKUP — the constructor's one way to know a field is
 *  slot-shaped: the DECLARATION says so, the wtype never guesses). */
export function inputEdgeOf(spec: FormSpecDoc, paramName: string): InputEdge | undefined {
  return (spec.inputs ?? []).find((e) => e.name === paramName)
}

/** The axis groups in declaration order: features.variant_groups'
 *  key order when the door serves it, else the rows' distinct groups
 *  in first-seen order. Empty group names never ride. The Recipe
 *  group never rides (the recipe-axis yield above). */
export function axisGroups(spec: FormSpecDoc): string[] {
  const rows = spec.variants ?? []
  const groups: string[] = []
  const declared = variantGroupsContract(spec)
  if (declared.length > 0) {
    for (const g of declared) if (g !== '' && !groups.includes(g)) groups.push(g)
  }
  for (const v of rows) {
    if (v.group !== '' && !groups.includes(v.group)) groups.push(v.group)
  }
  // THE RECIPE-AXIS YIELD (strokes 33+34): the Recipe MATRIX group
  // NEVER rides as an axis — no card owns a `recipe` field anymore
  // (the card-recipe layer is dead), so the key has no legal seat
  // anywhere. Family Recipe rows serve as MACRO PILLS (the stamp
  // verb writes their payload onto declared keys); the stamp-less
  // `default` row is display metadata and renders nothing.
  return groups.filter((g) => g !== 'Recipe')
}

/** The variant_groups contract's keys, in served order (the door
 *  serves it under features when the family declares axis groups). */
export function variantGroupsContract(spec: FormSpecDoc): string[] {
  const feats = spec.features as Record<string, unknown> | undefined
  const vg = feats?.['variant_groups']
  if (vg === null || typeof vg !== 'object' || Array.isArray(vg)) return []
  return Object.keys(vg as Record<string, unknown>)
}

/** One axis' rows (served order). */
export function rowsFor(spec: FormSpecDoc, group: string): VariantRow[] {
  return (spec.variants ?? []).filter((v) => v.group === group)
}

/** THE CHAIN (one direction: an axis filters the axes BELOW it): a
 *  row composes with the current selection when its `owner` is empty
 *  (composes with everything — patch-only rows) or names the ACTIVE
 *  row of another axis. */
export function composingRows(spec: FormSpecDoc, group: string, active: Record<string, string | undefined>): VariantRow[] {
  return rowsFor(spec, group).filter((v) => {
    if (v.owner === undefined || v.owner === '') return true
    for (const g of axisGroups(spec)) {
      if (g === group) continue
      const row = rowsFor(spec, g).find((x) => x.id === v.owner)
      if (row !== undefined) return active[g] === v.owner
    }
    return true
  })
}

/** The Variant axis' rows (group 'Variant', served order). */
export function variantRows(spec: FormSpecDoc): VariantRow[] {
  return rowsFor(spec, 'Variant')
}

/** The Quant cells composing with a variant (THE CHAIN). */
export function quantRowsFor(spec: FormSpecDoc, variantId: string | null): VariantRow[] {
  return composingRows(spec, 'Quant', { Variant: variantId ?? undefined })
}

/** The Model select's options (stroke 21, the operator's law:
 *  "WHY IS KREA-2 AND KREA-2-RAW MODELS! THAT IS A VARIANT") — THE
 *  FAMILY THE SPEC SERVES, full stop. A variant row's re-point
 *  (krea-2-raw) is the DECL's compose stamp, resolved server-side
 *  into the run's params — it is NOT a model and never renders as
 *  one. The rail's other options are the card's boarded families
 *  (spec.families, served from the card package). */
export function modelChoices(spec: FormSpecDoc): string[] {
  return typeof spec.model === 'string' && spec.model !== '' ? [spec.model] : []
}

/** THE ACTIVE-ENTRY LAW (activeVariantId, generalized to the served
 *  shape): a row is active when its re-pointed model (defaults.model
 *  ?? route) matches the held `model` value AND its owner chain
 *  holds. Nothing matches → undefined (the caller falls to the first
 *  composing row — the catalog's first-declared law). */
export function activeVariantId(spec: FormSpecDoc, values: SpecValues, group: 'Variant' | 'Quant'): string | undefined {
  const held = typeof values['model'] === 'string' ? values['model'] as string : undefined
  if (held === undefined) return undefined
  const active: Record<string, string | undefined> = {}
  for (const g of axisGroups(spec)) {
    active[g] = activeRowId(spec, values, g, active)
  }
  return active[group] ?? undefined
}

/** The ACTIVE RECIPE (the dropdown's selection state, derived from
 * the ONE truth -- never a persisted key): a recipe row is active
 * when EVERY key its pick stamps (axisPickPatch, minus the durable
 * axis keys -- the run door refuses an undeclared `recipe` param)
 * deep-equals the user layer's held value. Stamp-for-stamp matches
 * are naturally exclusive (a two-row bag matches only the row that
 * stamps two rows); first-declared wins on a tie. NOTHING matches ->
 * undefined (the dropdown shows its placeholder -- a hand-edited
 * layer is not a recipe, and the form never lies about it). */
export function activeRecipeId(spec: FormSpecDoc, values: SpecValues): string | undefined {
  for (const row of rowsFor(spec, 'Recipe')) {
    const patch = axisPickPatch(spec, row)
    let holds = true
    for (const [k, v] of Object.entries(patch)) {
      if (k === axisKey('Recipe')) continue
      if (!deepEqualHeld(values[k], v)) { holds = false; break }
    }
    if (holds && Object.keys(patch).length > 0) return row.id
  }
  return undefined
}

/** Deep equality over JSON-shaped held values (arrays compared
 * element-wise -- the lora bag rows; primitives by Object.is). */
function deepEqualHeld(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqualHeld(a[i], b[i])) return false
    return true
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const ka = Object.keys(a as Record<string, unknown>)
    const kb = Object.keys(b as Record<string, unknown>)
    if (ka.length !== kb.length) return false
    for (const k of ka) {
      if (!deepEqualHeld((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false
    }
    return true
  }
  return false
}

/** One group's active row under the owner chain (inner recursion of
 *  activeVariantId — Variant resolves first, chained groups after). */
export function activeRowId(spec: FormSpecDoc, values: SpecValues, group: string, active: Record<string, string | undefined>): string | undefined {
  const held = typeof values['model'] === 'string' ? values['model'] as string : undefined
  if (held === undefined) return undefined
  for (const v of rowsFor(spec, group)) {
    const rePoint = typeof v.defaults['model'] === 'string' ? v.defaults['model'] as string : v.route
    if (rePoint === '' || rePoint !== held) continue
    if (v.owner !== undefined && v.owner !== '') {
      let chainHolds = false
      for (const g of axisGroups(spec)) {
        if (g === group) continue
        if (rowsFor(spec, g).find((x) => x.id === v.owner) !== undefined) {
          chainHolds = active[g] === v.owner
          break
        }
      }
      if (!chainHolds) continue
    }
    return v.id
  }
  return undefined
}

/** The durable param key an axis rides (the group's id, lowercased —
 *  'variant', 'quant', 'recipe', 'precision'). */
export function axisKey(group: string): string {
  return group.toLowerCase()
}

/** A pick's full value patch — the old onPick law: the row's
 *  `defaults` overlay rides (model re-point + every resolver default),
 *  plus the durable axis keys themselves so a reopened stage restores
 *  its selects. Picking a row also re-seeds the axes BELOW it (their
 *  first composing row). */
export function axisPickPatch(spec: FormSpecDoc, row: VariantRow): SpecValues {
  // THE USER PLANE SPEAKS THE CARD'S VOCABULARY (stroke 21): the
  // row's re-point stamp (model: krea-2-raw) never lands in the user
  // layer — the server's compose resolves the route into the run's
  // params. The row's other defaults (steps, cfg) ride as the pick's
  // visible stamps.
  const patch: SpecValues = {}
  for (const [k, v] of Object.entries(row.defaults)) {
    if (k === 'model') continue
    patch[k] = v
  }
  const groups = axisGroups(spec)
  const at = groups.indexOf(row.group)
  const active: Record<string, string | undefined> = {}
  for (const g of groups) {
    if (g === row.group) active[g] = row.id
    else if (typeof row.defaults['model'] === 'string') active[g] = undefined
  }
  // THE VOCABULARY GUARD (stroke 33): the durable axis key stamps
  // only when the group rides as an axis — a Recipe-row pick on a
  // card without the field keeps its declared-knob defaults, never
  // the undeclareable `recipe` key (the compose-door refusal).
  if (groups.includes(row.group)) patch[axisKey(row.group)] = row.id
  // ONLY the axes BELOW the picked one re-seed (the chain runs one
  // direction); the axes above stay exactly as the user set them. A
  // group outside the axes (Recipe since the yield) has nothing
  // below it — no reseed at all.
  if (at < 0) return patch
  for (const g of groups.slice(at + 1)) {
    const composing = composingRows(spec, g, active)
    if (composing.length > 0) patch[axisKey(g)] = composing[0].id
    else patch[axisKey(g)] = ''
  }
  return patch
}

/** A model switch's full value patch (the stale-variant cure,
 *  operator 2026-09-14: model anima + variant turbo refused at
 *  compose — a switch that keeps the old family's axes is a broken
 *  stage). Every axis re-seeds to its FIRST row re-pointing at the
 *  new model (else its first composing row), and the picked rows'
 *  defaults overlay rides (raw → {model, steps, cfg} — the pick
 *  law, same as axisPickPatch). The caller writes every key through
 *  onEdit. PURE. */
export function modelSwitchPatch(spec: FormSpecDoc, model: string): SpecValues {
  const patch: SpecValues = { model }
  const groups = axisGroups(spec)
  const active: Record<string, string | undefined> = {}
  // FAMILY SWITCH (stroke 21: a model pick is either the spec's own
  // family or a switch — routes are not models, so the re-point union
  // is gone). A switch CLEARS the axes (stroke 19's law): this
  // spec's rows belong to another family; seeding them under the new
  // model is poison. The drill refetches the family's spec and the
  // absent axis keys seed from ITS first-declared rows.
  const crossSpec = model !== '' && model !== spec.model
  for (const g of groups) {
    // THE CHAIN (one direction, the activeRowId law): only composing
    // rows are pickable — when nothing composes (raw owns no quant
    // cells) the axis rests EMPTY, never a foreign row (int8 belongs
    // to turbo; seating it under raw is turbo-for-anima again).
    const composing = composingRows(spec, g, active)
    if (composing.length === 0 || crossSpec) {
      // cross-spec: EVERY axis clears (variant and quant filter to
      // the NEW family's rows once its spec lands — never this
      // spec's rows carried over)
      patch[axisKey(g)] = ''
      active[g] = ''
      continue
    }
    const match = composing.find((r) => {
      const rePoint = typeof r.defaults['model'] === 'string' && r.defaults['model'] !== ''
        ? r.defaults['model'] as string : r.route
      return rePoint === model
    })
    const row = match ?? composing[0]
    // THE USER PLANE SPEAKS THE CARD'S VOCABULARY (model = family,
    // variant/quant = row ids): a row's re-point stamp (model:
    // krea-2-raw) is the DECL's compose business — the server
    // resolves it into the run's params. It NEVER lands in the user
    // layer, so the Model rail never shows routes and a reopened
    // stage never holds one. The row's OTHER defaults (steps, cfg)
    // still ride — they are the pick's visible stamps.
    for (const [k, v] of Object.entries(row.defaults)) {
      if (k === 'model') continue
      patch[k] = v
    }
    patch[axisKey(g)] = row.id
    active[g] = row.id
  }
  patch['model'] = model
  return patch
}
/** Seed the axis keys for a fresh stage (the catalog's first-declared
 *  law: each axis defaults to its FIRST composing row). Held values
 *  win (a reopened stage never re-seeds). */
export function seedAxisValues(spec: FormSpecDoc, held: SpecValues): SpecValues {
  const out: SpecValues = {}
  const groups = axisGroups(spec)
  if (groups.length === 0) return out
  const active: Record<string, string | undefined> = {}
  for (const g of groups) {
    const heldKey = typeof held[axisKey(g)] === 'string' ? held[axisKey(g)] as string : ''
    const rows = rowsFor(spec, g)
    const heldRow = rows.find((x) => x.id === heldKey)
    if (heldRow !== undefined) {
      active[g] = heldRow.id
    } else {
      // first COMPOSING row (the chain law); when nothing composes the
      // axis rests empty — never a non-composing row
      const composing = composingRows(spec, g, active)
      active[g] = composing.length > 0 ? composing[0].id : ''
    }
    out[axisKey(g)] = active[g]
  }
  const heldModel = held['model']
  if (typeof heldModel !== 'string' || heldModel === '') {
    // THE MODEL ARM IS THE FAMILY (stroke 21): the seeded row's
    // re-point (qwen-img-edit-2511-lightning4) is the server's
    // compose stamp — the user plane never holds a route
    const model = typeof spec.model === 'string' && spec.model !== '' ? spec.model : ''
    if (model !== '') out['model'] = model
  }
  return out
}

/** Seed a stage's USER layer from its held params (the bench's
 * stage.params — the only migration seam). Presence-based, per the
 * settings law: every HELD key rides verbatim (the override marks
 * survived the reopen), the absent axis keys seed per the axis law
 * (seedAxisValues above — first composing row, one direction).
 *
 * THE ONE VALIDATION CLAUSE (never value-compare): a held `recipe`
 * the card's schema does not declare is poison — the dead
 * card-recipe layer's stamp (strokes 33+34). Dropped on open, so
 * the run flush's null-domain half deletes the bench key and the
 * card composes again. Everything else rides untouched.
 *
 * PURE — the caller owns the write (onSet per fresh key). */
export function seedUser(spec: FormSpecDoc, held: SpecValues): SpecValues {
  const out: SpecValues = { ...held, ...seedAxisValues(spec, held) }
  if (!fieldsOf(spec).some((f) => f.name === 'recipe')) delete out['recipe']
  return out
}

