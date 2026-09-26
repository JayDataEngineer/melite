// discovery.ts — the discovery arms, LIVE-derived (port 2026-09-11).
//
// The gateway died with its route table (operator order, 40b57f94)
// and its discovery door with it. The editor's spec-contract store
// (the ONE projection the lora picker reads — LORA LAW) needs
// /v1/form-spec and /v1/model-catalog as HTTP the DSH serves; the
// derivation law is referee-pinned from the dead door's
// discoveryLive.ts (byte-faithful where possible — the frozen row
// shapes are not mine to redesign). Mounted by doors.ts under the
// /v1 prefix alongside the estate seat lanes.
//
// LORA LAW (operator verbatim 2026-09-10: "THERE SHOULD NOT BE A
// LORAS REMOTE / IT'S ALL BUILT IN"): the lora options in
// features.modifiers come from svc.modCatalog("loras", family) —
// the family-owned rows in packages/models/<family>/mods/loras.ts
// composed server-side. NO second spelling, no remote fetch.
import {
  buildCatalog,
  CARD_KINDS,
  emitParamsSchema,
  enhanceRecipeFor,
  getModel,
  isServedFamily,
  liveScanOrder,
  owningAtom,
  registryModel,
  loadCardDefs,
  modelIds,
  theService,
  emitModifierKinds,
  declaredDefaults,
} from '@melite/comfyui-cordis'
import type {
  CardDefinition,
  ComfyUIService,
  DeclaredModifierKind,
  ModelDecl,
} from '@melite/comfyui-cordis'
import { agentFormDoc } from '@melite/engine-agent'
import { faceStamp } from './faceStamp.ts'

/** The boarded map (family -> the card that boards it, first-seen).
 *  Exported for the flow tool's bench pass (the card-id alias
 *  resolution rides the SAME table form-spec serves — one truth). */
export function boardedMap(defs: Map<string, CardDefinition>): Map<string, string> {
  const out = new Map<string, string>()
  for (const [cardId, def] of defs) {
    for (const fam of def.boarded ?? []) {
      if (!out.has(fam)) out.set(fam, cardId)
    }
  }
  return out
}

/** Every route address a family's declaration names (variant routes
 *  + cell routes) — the route->owner back edge. */
function declRoutes(decl: ModelDecl): Set<string> {
  const out = new Set<string>()
  for (const v of decl.variants ?? []) {
    if (v.route) out.add(v.route)
    for (const c of v.cells ?? []) {
      if (c.route) out.add(c.route)
    }
  }
  return out
}

/** One form-spec key's resolution: the rendering card + the boarded
 *  service family. Self-boarded first, else the boarded family whose
 *  declaration routes to the key (krea-2-raw rides krea-2), else
 *  null (unknown / unoffered / retired / fragment — the door 404s,
 *  same body as ever). */
export interface SpecResolution {
  card: string
  service: string
  /** The envelope's model id: the key itself, except card-id alias
   *  keys (?model=tts serves the default family's envelope). */
  model: string
}

export function resolveSpecKey(
  key: string,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
): SpecResolution | null {
  const def = defs.get(key)
  if (def !== undefined && !isFamilyKey(key)) {
    // A card-id alias key (?model=tts): the card's envelope for its
    // default family (boarded[0] ?? the card itself — mask-studio
    // boards nothing and IS its own service).
    const boardedFams = def.boarded ?? []
    const service = boardedFams.length > 0 ? boardedFams[0] : key
    return { card: key, service, model: service }
  }
  let decl: ModelDecl
  try {
    decl = getModel(key)
  } catch {
    return null
  }
  if (!isServedFamily(decl)) return null
  const self = boarded.get(key)
  if (self !== undefined) return { card: self, service: key, model: key }
  for (const [fam, card] of boarded) {
    let fdecl: ModelDecl
    try {
      fdecl = getModel(fam)
    } catch {
      continue
    }
    if (declRoutes(fdecl).has(key)) return { card, service: fam, model: key }
  }
  return null
}

/** A key is a family key when a DECL names it (routes and owners
 *  alike); otherwise a defs hit is a card-id alias. */
function isFamilyKey(key: string): boolean {
  try {
    getModel(key)
    return true
  } catch {
    return false
  }
}

// ── form-spec bodies ──────────────────────────────────────────────

/** One DECL variant's wire row (the editor Variant contract: all ten
 *  keys, always — null/"" for absent, never a missing key). */
function variantRow(
  v: {
    id: string
    label: string
    group: string
    hide_from_dropdown?: boolean
    resolver_defaults?: Record<string, unknown>
    wire_defaults?: Record<string, unknown> | null
    route?: string
    hint?: string
    engine?: string
  },
  declEngine: string,
): Record<string, unknown> {
  return {
    id: v.id,
    label: v.label,
    group: v.group,
    // THE MACRO PAYLOAD (stroke 34): the served defaults are the
    // row's FULL stamp — resolver knobs + wire payloads (the
    // realism row's lora stack). The client's pick verb writes
    // exactly this onto the user layer: what a family row stamps is
    // what the run composes, declared keys only.
    defaults: { ...(v.resolver_defaults ?? {}), ...(v.wire_defaults ?? {}) },
    route: v.route ?? '',
    hint: v.hint ?? null,
    engine: v.engine ?? declEngine,
    quant: null,
    vram_peak_gb: null,
    owner: '',
  }
}

function capQuant(quant: string): string {
  // The !c.quant gate above guarantees non-empty — the fallback is
  // unreachable, kept only so the helper is total (2026-09-12).
  return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : /* v8 ignore next -- !c.quant gate */ quant
}

/** The key family's variants + its offered quant cells (a cell
 *  serves the envelope iff its route is the key, the service owner,
 *  or the key is the card's default family. Routeless cells are
 *  unaddressable, never offered. Variant rows serve whole (all ten
 *  keys, always) regardless of route.) */
function specVariants(
  decl: ModelDecl,
  key: string,
  service: string,
  primary: boolean,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const seen = new Set<string>()
  const declEngine = decl.engine ?? ''
  for (const v of decl.variants ?? []) {
    if (v.hide_from_dropdown === true) continue
    rows.push(variantRow(v, declEngine))
    seen.add(v.id)
    for (const c of v.cells ?? []) {
      if (!c.quant || c.hide_from_dropdown === true) continue
      if (!c.route) continue
      if (c.route !== key && c.route !== service && !primary) continue
      const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant
      seen.add(id)
      rows.push({
        id,
        label: c.label || capQuant(c.quant),
        group: 'Quant',
        defaults: c.resolver_defaults ?? {},
        // The !c.route gate above narrows this to string (2026-09-12).
        route: c.route,
        hint: null,
        engine: c.engine ?? declEngine,
        quant: c.quant,
        vram_peak_gb: c.vram_peak_gb ?? null,
        owner: v.id,
      })
    }
  }
  return rows
}

/** The variant-group contract from the DECL's groups. */
function groupContract(decl: ModelDecl | null): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const g of decl?.variant_groups ?? []) {
    const entry: Record<string, unknown> = { label: g.label }
    if (g.tooltip) entry.tooltip = g.tooltip
    if (g.default) entry.default = g.default
    out[g.id] = entry
  }
  return out
}

/** The modifier-pack table (the subcard packs). controlnet waits
 *  unboarded (the phantom-capability gate). kind/label/cardinality
 *  are UI strings with no other live source — one row per pack,
 *  stated once.
 *  LANPAINT'S ROW (stroke 32 — the operator's missing-seat report:
 *  image-edit's required image1 never rendered): the port moved the
 *  anchor out of the schema into the lanpaint mod, so the old
 *  "rides inline" exemption became a dropped seat — the family
 *  boards lanpaint, mod_schemas serves it, compose requires it, but
 *  no modifiers entry ever offered the brick. The rail seats the
 *  anchor (the client half); this row offers the knobs.
 *  EXPORTED (022's self-critique #3, 2026-09-24): the load bundle's
 *  mods line serves the SAME grammar for DECL-boarded packs (the
 *  qvoice seats) — one table, two consumers, never a copy. */
export const MODIFIER_PACKS: Record<
  string,
  {
    kind: string
    label: string
    cardinality: string
    max_stack?: number
    param_key?: string
    /** THE ENTRY MODE (pack vocabulary, same status as kind/label:
     *  option = the entry is { id, strength } against the served
     *  catalog; hybrid = the entry is the bag element object with
     *  its option_key field bound to the catalog; field = the entry
     *  IS the contract object, no catalog. The leaf switches on the
     *  SERVED value, never the kind name). */
    entry?: string
    option_key?: string
    /** THE SCALAR DIAL (the bag element's weight field): strength
     *  for lora/controlnet, weight for ip_adapter — served so the
     *  leaf never guesses off the kind name. */
    scalar_key?: string
  }
> = {
  loras: { kind: 'lora', label: 'LoRAs', cardinality: 'list', entry: 'option', option_key: 'id' },
  // THE WIRE IS PLURAL (the retired bag: params.controlnets[] —
  // the kind stays singular, the storage stays plural; schema_key
  // names the pack envelope for the client's field walk).
  controlnet: { kind: 'controlnet', label: 'ControlNet', cardinality: 'list', max_stack: 5, param_key: 'controlnets', entry: 'hybrid', option_key: 'type' },
  mask: { kind: 'mask', label: 'Region Mask', cardinality: 'list', max_stack: 1 },
  lanpaint: { kind: 'brick', label: 'Lanpaint', cardinality: 'list', max_stack: 1 },
  // THE SAME PLURAL LAW (the retired bag: params.ip_adapters[] —
  // kind singular, storage plural, schema_key names the pack
  // envelope). Hybrid like controlnet: the entry binds its option
  // field (kind) to the served rows; the rows are vocabulary only
  // — the firing gate refuses every stated entry loud (fate
  // 'refused', the ray receipt in guard.ts).
  ip_adapter: { kind: 'ip_adapter', label: 'IP-Adapter', cardinality: 'list', max_stack: 5, param_key: 'ip_adapters', entry: 'hybrid', option_key: 'kind', scalar_key: 'weight' },
  // THE VOICE SEAT (born the voice-lock mod catch 2026-09-21 —
  // the card died the same stroke, the seat is the TTS card's LOAD
  // half now): the
  // qvoice pack — a saved persona artifact (.qvoice file + the
  // clone pipeline's identity-strength knob) — boards qwen3-tts,
  // fires the studio generate lane in ttsT1 (the round-trip
  // stroke 2026-09-20: the AudiocoreTTS embedding path is dead at
  // the C ABI), serves its
  // envelope, but no row ever offered it (the lanpaint missing-seat
  // disease verbatim). Field mode (the mask precedent): the entry
  // IS the contract object, no catalog.
  qvoice: { kind: 'qvoice', label: 'Voice', cardinality: 'list', max_stack: 1 },
  // THE DESIGN SEAT (the README stroke 2026-09-21 — the voice-lock
  // card dies, SAVE moves into the TTS card's mods): the
  // qvoice_save pack — name + VoiceDesign prompt + sampling —
  // boards qwen3-tts-voicedesign, fires the 1.7B export lane.
  // Field mode, same precedent: the entry IS the contract.
  qvoice_save: { kind: 'qvoice_save', label: 'Design', cardinality: 'list', max_stack: 1 },
}

function optionTooltip(
  row: { category?: string; filename: string; tooltip?: string },
  shared: boolean,
): string {
  // A row-served tooltip wins (the controlnet catalog's own prose
  // the retired options' tooltip, 1:1); otherwise the category
  // filename face lora rows have always worn.
  const base = row.tooltip ?? (row.category ? `${row.category} — ${row.filename}` : row.filename)
  return shared ? `${base} — runtime catalog` : base
}

/** The modifiers offer: one entry per boarded modifier pack (the
 *  DECL's mods order, filtered to the pack table). Options ride the
 *  pack rows (union-served rows carry the shared suffix); the
 *  entry's param rows derive client-side off `mod_schemas[pack]`
 *  (the absorbed contract's own toJSON — same walker as the card
 *  fields, one meta path). THE ENVELOPE MIRROR (born the
 *  voice-lock mod catch 2026-09-21, same stroke as the seat): a
 *  pack with no envelope for THIS family
 *  serves no entry — the client walks mod_schemas[pack] for rows,
 *  so a seat with no envelope is a brick by construction (the
 *  qvoice pack boards the DECL but the base lane's envelope is
 *  dropped by owner-scoping — the entry must drop with it). */
function specModifiers(
  svc: ComfyUIService,
  card: string,
  key: string,
  decl: ModelDecl | null,
  def: CardDefinition | undefined,
  enveloped: ReadonlySet<string>,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const m of decl?.mods ?? []) {
    // THE MARRIAGE GRAMMAR (#36): entries are pack names or
    // {pack, marries} declarations — normalized once here, served
    // verbatim on the kind (the client face mirrors compose).
    const pack = typeof m === 'string' ? m : m.pack
    const marries = typeof m === 'string' ? undefined : m.marries
    const meta = MODIFIER_PACKS[pack]
    if (meta === undefined) continue
    if (!enveloped.has(pack)) continue
    const cat = svc.modCatalog(pack, key)
    // THE PARAM FIELDS ARE THE ENVELOPE'S (the parameter audit): the
    // entry carries the pack's catalog facts; its param rows derive
    // client-side off mod_schemas[pack] (the absorbed contract's own
    // toJSON — same walker as the card fields, one meta path).
    const entry: Record<string, unknown> = {
      kind: meta.kind,
      label: meta.label,
      param_key: meta.param_key ?? pack,
      // THE ENVELOPE KEY (the wire/envelope split: the bag lives at
      // param_key, the absorbed contract's envelope at the pack name —
      // identical for loras, split for controlnet).
      schema_key: pack,
      cardinality: meta.cardinality,
    }
    if (marries !== undefined) entry.marries = marries
    if (meta.max_stack !== undefined) entry.max_stack = meta.max_stack
    // THE ENTRY MODE rides verbatim (the leaf's switch — served,
    // never client-switched on the kind name).
    if (meta.entry !== undefined) entry.entry = meta.entry
    if (meta.option_key !== undefined) entry.option_key = meta.option_key
    if (meta.scalar_key !== undefined) entry.scalar_key = meta.scalar_key
    entry.options = cat.rows.map((r) => ({
      value: r.id,
      label: r.label ?? r.id,
      tooltip: optionTooltip(r, cat.shared),
      // STEPS APPLIED rides the defaults when the row claims one
      // (2026-09-18): a distill adapter is married to its step
      // count — boarding it stamps {strength, steps} onto the entry.
      // RANGE FACTS (the 4-to-8 correction): steps_min/steps_max
      // ride alongside when the adapter's domain is not a fixed
      // point (Turbo 4-to-8) — the leaf's dial bounds itself to
      // them; the married default stays `steps`.
      defaults:
        r.default_strength === undefined && r.default_weight === undefined && r.steps === undefined
          && r.steps_min === undefined && r.steps_max === undefined
          ? {}
          : Object.fromEntries(Object.entries({
              [meta.scalar_key ?? 'strength']: r.default_strength ?? r.default_weight,
              steps: r.steps,
              steps_min: r.steps_min,
              steps_max: r.steps_max,
            }).filter(([, v]) => v !== undefined)),
      // THE RESOLVED FACTS (the hybrid leaf stamps these onto new
      // entries so the run record carries the retired wire shape —
      // model + upstream-map note; the lane re-validates them
      // against the row, never trusts them).
      model: r.filename,
      ...(r.preprocessor !== undefined ? { preprocessor: r.preprocessor } : {}),
    }))
    out.push(entry)
  }
  // CARD-DECLARED KINDS (stroke 63 — docs/design/mods-contracts.md
  // CONTRACT A): the card's own action kinds ride the SAME channel,
  // VERBATIM (fields/kindFields/options are the served rows — the
  // card IS the catalog; no mod_schemas envelope derives them, the
  // entry IS the schema). Validated LOUD at serve: a malformed kind
  // refuses the whole form-spec (never a silently half-rendered
  // mod row).
  for (const k of def?.mods ?? []) {
    if (typeof k.kind !== 'string' || k.kind === '' || typeof k.label !== 'string' || k.label === '' || typeof k.param_key !== 'string' || k.param_key === '' || typeof k.cardinality !== 'string' || k.cardinality === '') {
      throw new Error(`form-spec: card '${card}' declares a malformed mod kind (kind/label/param_key/cardinality required) — ${JSON.stringify(k).slice(0, 120)}`)
    }
    const entry: Record<string, unknown> = {
      kind: k.kind,
      label: k.label,
      param_key: k.param_key,
      cardinality: k.cardinality,
    }
    if (k.entry !== undefined) entry.entry = k.entry
    if (k.option_key !== undefined) entry.option_key = k.option_key
    if (k.scalar_key !== undefined) entry.scalar_key = k.scalar_key
    if (k.max_stack !== undefined) entry.max_stack = k.max_stack
    // THE CATEGORY (stroke 78 — the mods-abstraction law): standalone
    // (same base image, own output) vs ordered (the stacking law).
    // Served verbatim; absent = ordered (the default every pack kind
    // already follows — no served row changes shape).
    if (k.category !== undefined) entry.category = k.category
    if (k.fields !== undefined) entry.fields = k.fields
    if (k.kindFields !== undefined) entry.kindFields = k.kindFields
    if (k.options !== undefined) entry.options = k.options
    // THE LEAF FACE (paint-leaf-canvas.md): served verbatim — the
    // section renderer offers the brush verb only on a declared
    // face; never sniffed from the kind name.
    if (k.leaf_face !== undefined) entry.leaf_face = k.leaf_face
    // THE SECTION CAPTION (2026-10-08, the operator's demand —
    // "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): served verbatim —
    // the leaf seats the kind's own name for its field stack above
    // the fields (the detector arms NAME their bbox filter).
    if (k.section !== undefined) entry.section = k.section
    // THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law):
    // served verbatim — the compose door enforces them only when
    // the kind's bag is non-empty.
    if (k.requires !== undefined) entry.requires = k.requires
    out.push(entry)
  }
  return out
}

export type { DeclaredModifierKind }

/** One form-spec envelope (the /v1/form-spec?model= body — the
 *  editor's render truth for one served key). Everything scopes to
 *  the KEY family; the owner supplies only the service
 *  attribution. Keys insert alphabetically (the frozen shape). */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
 * guard, degrading to the id (the module singleton's law: a read
 * that can miss never throws — same shape as the getModel guard
 * above). Never the composed variant+quant row. The variant-route
 * scan died here 2026-09-21 (the README stroke: qwen3-tts-base was
 * never a variant route — it is the 0.6B Base FAMILY, and every
 * boarded id now names a family DECL; a scan for variant faces
 * would only re-legitimize the fiction). */
function familyFace(fam: string): string {
  try {
    return registryModel(fam).label
  } catch {
    // A ROUTE ADDRESS (qwen3-tts-base, the qvoice-across-all
    // boarding 2026-09-23): the DECL face belongs to its owning
    // atom; the route faces the COMPOSED view label — model +
    // variant tokens joined at the derived read ("Qwen3-TTS 0.6B
    // Base"), never the raw id.
    try {
      return getModel(fam).label
    } catch {
      return fam
    }
  }
}

/** THE CATALOG-FED SELECT STAMP (2026-09-21): walks the envelope's
 * root dict; any field whose node declares extra.optionsFrom gets
 * its options stamped from the named mod pack's LIVE catalog rows
 * for this family (value = row id, label = row id). The empty arm
 * rides first when the field's default is '' so a pick can clear.
 * Mutates the freshly-toJSON'd envelope in place — formSchemas
 * serializes per call, so no shared carrier is touched. */
interface StampNode {
  dict?: Record<string, unknown>
  meta?: { default?: unknown; extra?: Record<string, unknown> }
}
interface StampEnv {
  uid?: number | string
  refs?: Record<string, StampNode>
}
export function stampOptionsFrom(
  schema: unknown,
  svc: { modCatalog(pack: string, family: string): { rows: ReadonlyArray<{ id: string }> } },
  family: string,
): void {
  const env = schema as StampEnv | null
  if (env == null || env.refs == null || env.uid == null) return
  const root = env.refs[String(env.uid)] ?? env.refs[env.uid as never]
  if (root?.dict == null) return
  for (const refId of Object.values(root.dict)) {
    const node = env.refs[String(refId)]
    if (node == null || node.meta == null) continue
    const extra = node.meta.extra
    if (extra == null || typeof extra.optionsFrom !== 'string') continue
    const pack = extra.optionsFrom
    let rows: ReadonlyArray<{ id: string }> = []
    try {
      rows = svc.modCatalog(pack, family).rows
    } catch {
      /* v8 ignore next -- an unregistered pack name on a live lane
         degrades to an empty select (visible, honest); the compose
         door remains the loud backstop for a picked-then-refused id */
      rows = []
    }
    const options: Array<{ value: string; label: string }> = []
    if (node.meta.default === '' || node.meta.default === undefined) {
      options.push({ value: '', label: '— none —' })
    }
    for (const r of rows) options.push({ value: r.id, label: r.id })
    const clone: Record<string, unknown> = { ...extra, options }
    delete clone.optionsFrom
    node.meta.extra = clone
  }
}

export function specBody(
  svc: ComfyUIService,
  defs: Map<string, CardDefinition>,
  res: SpecResolution,
): Record<string, unknown> {
  const def = defs.get(res.card)
  if (def === undefined) {
    throw new Error(`form-spec: unknown card '${res.card}'`)
  }
  const ident = def.identity
  if (ident === undefined) {
    throw new Error(`form-spec: card '${res.card}' declares no identity`)
  }
  // The envelope's family: the model id (card-id alias keys serve
  // the default family's envelope — ?model=tts IS qwen3-tts).
  const key = res.model
  let decl: ModelDecl | null = null
  try {
    decl = getModel(key)
  } catch {
    decl = null
  }
  // THE SCHEMA ENVELOPE (the parameter audit, 2026-09-14): the
  //  card's own toJSON IS the served form — the flat field walk and
  //  its frozen 15-key row are gone. The client derives fields,
  //  groups, defaults, and presentation off the envelope
  //  (card-base fieldsOf); this body projects card meta only.
  // THE ROUTE→ATOM FOLD (operator 2026-09-23, qvoice across ALL
  //  qwen3-tts): the envelope's mod filter matches registered ATOMS,
  //  and mods board at the FAMILY level (the fold law) — a variant
  //  route address (qwen3-tts-base) asks with its OWNING ATOM
  //  (owningAtom: a route composes through its owner) so every
  //  address a family serves carries the family's packs exactly
  //  like the head. Without the fold the route's envelope starves
  //  and the modifier entry dies with it (the envelope-mirror kill
  //  — the qvoice base-lane hole this fold closed). An unknown name
  //  asks as named and the filters speak for themselves.
  const envelopeKey = owningAtom(key)
  const schemas = svc.formSchemas(res.card, envelopeKey)
  if (schemas === null) {
    throw new Error(`form-spec: card '${res.card}' unknown`)
  }
  // THE CATALOG-FED SELECT (2026-09-21, the freeform-lie kill): a
  // field declaring extra.optionsFrom names a MOD PACK — the door
  // stamps its options from the pack's LIVE flavor rows at serve
  // time (the schema cannot close what the runtime serves; the
  // compose door keeps refusing unknown ids loud). The empty arm
  // rides first when the field's default is '' (a refine pick must
  // be clearable). LORAS ARE ONLY MODS: the ids come from the
  // served rows, never a hand-spelled string.
  stampOptionsFrom(schemas.schema, svc, envelopeKey)
  // THE MOD SYSTEM OWNS MODS (the old SubcardGrid law, 2026-08-09:
  // "LoRA is a MOD, never a standalone addition — the free-text
  // grid must not render the mod bags as raw JSON rows; the
  // SubcardGrid owns them"). Mod params ride mod_schemas (keyed by
  // pack) and render ONLY through the mod surface. ControlNet
  // proves the law by absence: the pack waits unboarded and no
  // envelope, no entry, no endpoint ever names it.
  const modifiers = specModifiers(svc, res.card, envelopeKey, decl, def, new Set(Object.keys(schemas.mods)))
  // the machine truth (one spelling: liveScanOrder, the registry's
  // own admission read) — presence marks ride the families block
  let liveMids: Set<string>
  try {
    liveMids = new Set(liveScanOrder())
  } catch {
    /* v8 ignore next -- the booted registry serves in practice; an
       empty set degrades to all-absent marks, never a throw */
    liveMids = new Set()
  }
  const surface = def.surface ?? {}
  const boarded = def.boarded ?? []
  const primary = (boarded.length > 0 ? boarded[0] : res.card) === key
  // THE EDGE EMISSION (operator order, 2026-09-12: "whenever a card
  // emits via the package system, it needs to have 'input'
  // 'required=True', or 'output', so the edges are defined"). The
  // declaration lives on every card (flowKinds — the card
  // stage half); the emission serves it so the card-UI BASE
  // constructs input components and wires pickers from DECLARED
  // edges, never from result-URL sniffing. The required join moved
  // client-side with the envelope (fieldsOf owns the schema's
  // required facts now — the law: required:True emits,
  // False omits).
  const inputs = Object.entries(def.flowKinds.inputs).map(([name, kind]) => ({
    name,
    kind,
  }))
  return {
    contract: null,
    // THE BASE LAYER INPUT (the parameter audit, re-owned 2026-09-20
    // per the no-silent-resolution law): the WALKED DECLARED DEFAULTS
    // (the same enumeration the compose door enforces and the tool
    // face serves — one spelling) under the family row's own
    // defaults (nulls and arrays never ride, the engine's compose
    // order verbatim: schema defaults <- this <- recipe <- user).
    // Before this, the row served decl.defaults alone — the UI
    // prefilled {seed: 42} while the door walked 30+ real defaults,
    // and the operator read BLANK knobs over a healthy compose.
    model_defaults: {
      // (a schema-less synthetic def carries no declared defaults —
      // nothing to layer; real cards always carry the carrier)
      ...(def.schema === undefined ? {} : declaredDefaults(
        ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as never,
        def.boarded ?? [],
      )),
      ...Object.fromEntries(
        Object.entries(decl?.defaults ?? {}).filter(([, v]) => v !== null && !Array.isArray(v)),
      ),
    },
    engine: decl?.engine ?? 'comfyui',
    enhance_prompt: null,
    // THE RECIPE SEAT (hour 24 stroke 10): the model's prompt-enhance
    // SKILL.md composed (role + notes + tree-wide shared base blocks)
    // — served as enhance_prompts.prompt, the sweep's SSOT read. A
    // recipe-less model serves the stub and the sweep falls to the
    // generic recipe (the no-file law).
    enhance_prompts: enhanceRecipeFor(key, res.service) !== null
      ? { prompt: enhanceRecipeFor(key, res.service) }
      : { prompt: null, lyrics: '' },
    features: {
      modifiers,
      variant_groups: groupContract(decl),
    },
    // THE PREVIEW CLAIMS (gap 4, stroke 67): the card's own
    // preview arm, served verbatim (historyStrip: false claims the
    // bottom bar); absent = the strip is ON (the default).
    ...(def.preview !== undefined ? { preview: def.preview } : {}),
    form: res.card,
    genre: ident.genre,
    guide: null,
    inputs,
    label: ident.label,
    layout: surface.layout === 'studio' ? 'studio' : null,
    loader_info: null,
    // THE MOD CONTRACT ENVELOPES (keyed by pack — the absorbed
    //  contracts' own toJSON; the modifier surface walks these for
    //  its param rows, the same walker as the card fields).
    mod_schemas: schemas.mods,
    model: res.model,
    outputs: def.flowKinds.outputs,
    // THE CARD'S OWN SERIALIZED SCHEMA — the served form's SSOT.
    schema: schemas.schema,
    service: res.service,
    size: surface.size === 'huge' ? 'huge' : null,
    variants: decl ? specVariants(decl, key, res.service, primary) : [],
    // THE FAMILIES BLOCK (the no-silent-drop law, hour 26 stroke 17):
    // every family the card BOARDS, presence-marked against the live
    // catalog offer. A boarded-but-not-downloaded model SERVES —
    // visible and marked — never silently dropped from the surface
    // (the Model rail renders it disabled with its reason; the bench
    // doors refuse it loudly at write time with the same list).
    // THE PACKS BLOCK (the no-silent-drop law's extension half,
    // stroke 18): the card's DECLARED extension packs for the spec's
    // own family (the EXTENSION-LAW gate's slice semantics mirrored:
    // requiresByFamily[key] wins when declared, else the flat
    // requires), presence-marked by the gate's own read
    // (svc.packPresence — one spelling). A missing pack SERVES —
    // visible, marked, prompting install — never a silently empty
    // modifier bag or a run-time surprise. null = unknown (engine
    // facts not loaded; the gate cannot see it either).
    packs: svc.packPresence(def.requiresByFamily?.[key] ?? def.requires ?? []),
    // THE FAMILY FACE (operator, 2026-09-16 — supersedes the
    // stroke-19 ids-only law): every family row serves the DECL's
    // own label (registryModel — "MOSS-SFX v2"), version included;
    // an id-only face drops the version ("Moss Sfx" is ambiguous
    // between v1 and v2). The COMPOSED variant+quant row ("Krea 2
    // Turbo INT8 ConvRot") still never serves — the DECL face is
    // the model's face; the variant axes stay the axes.
    families: (def.boarded ?? []).map((fam) => ({
      id: fam,
      present: liveMids.has(fam),
      label: familyFace(fam),
    })),
  }
}

// ── forms / kinds ─────────────────────────────────────────────────

/** The forms table (the /v1/forms body — card meta only, no fields).
 *  Sorted by (sidebar order, card id) — deterministic. */
export function formsTable(
  defs: Map<string, CardDefinition>,
): Record<string, unknown> {
  const rows: Array<{ id: string; order: number; row: Record<string, unknown> }> =
    []
  for (const [id, def] of defs) {
    const sidebar = def.sidebar ?? { key: '', order: 0 }
    const boarded = [...(def.boarded ?? [])]
    rows.push({
      id,
      order: typeof sidebar.order === 'number' ? sidebar.order : 0,
      row: {
        label: def.identity?.label ?? id,
        genre: def.identity?.genre ?? '',
        order: sidebar.order,
        plugin: 'comfyui',
        sidebar_key: sidebar.key,
        default_service: boarded.length > 0 ? boarded[0] : id,
        hidden: sidebar.hidden === true,
        covers: boarded.length > 0 ? boarded : [id],
        // THE EDGE EMISSION on the meta table too (the same
        // operator order): a card's declared input/output edges are
        // CARD META — surfaces kind-match candidates from THIS
        // without fetching per-card form-specs. Strict (no ?.):
        // an undeclared card is a wall violation and refuses LOUD
        // at serve time, never a silent {}.
        inputs: def.flowKinds.inputs,
        outputs: def.flowKinds.outputs,
      },
    })
  }
  // Map keys are unique, so equal ids never compare (2026-09-12).
  rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1))
  const out: Record<string, unknown> = {}
  for (const r of rows) out[r.id] = r.row
  return out
}

/** The kinds arm (the /v1/kinds body — CARD_KINDS in its own
 *  alphabetical order, projected to the served seven keys). */
export function kindsArm(): Record<string, unknown> {
  return {
    kinds: CARD_KINDS.map((k) => ({
      kind: k.kind,
      runnable: k.runnable,
      executable: k.executable,
      formSpec: k.formSpec,
      compound: k.compound,
      opensStudio: k.opensStudio,
      badgeTone: k.badgeTone,
    })),
  }
}

// ── catalog cards / capabilities ──────────────────────────────────

/** The live card sections (the catalog arm's cards + capabilities —
 *  alphabetical by card id). families/default ride boarding
 *  (boarded[0] ?? the card itself); principles ride the identity
 *  rung. */
export function cardSections(
  defs: Map<string, CardDefinition>,
): { cards: Record<string, unknown>; capabilities: Record<string, unknown> } {
  const cards: Record<string, unknown> = {}
  const capabilities: Record<string, unknown> = {}
  for (const id of [...defs.keys()].sort()) {
    const def = defs.get(id)!
    const ident = def.identity
    if (ident === undefined) {
      throw new Error(`catalog: card '${id}' declares no identity`)
    }
    const boarded = [...(def.boarded ?? [])]
    const fams = boarded.length > 0 ? boarded : [id]
    const df = fams[0]
    cards[id] = {
      id,
      label: ident.label,
      description: ident.description,
      genre: ident.genre,
      families: fams,
      principles: [...(ident.principles ?? [])],
      skills: [],
      has_inference: false,
      has_rubric: false,
    }
    capabilities[id] = {
      label: ident.label,
      description: ident.description,
      default_family: df,
      families: fams,
      kind: 'generation',
      icon: ident.icon ?? '',
      resolved: { family: df, model: df, params: {} },
    }
  }
  return { cards, capabilities }
}

/** /v1/card-tools — the 1:1 flow port's picker manifests: one row
 * per card package, the manifest shape the old ServicePicker renders
 * (name/model/stage_title/description/params_schema with declared
 * defaults). Projected from the live card defs via emitParamsSchema
 * — the same SSOT the form-spec door rides, never a re-derivation. */
export async function cardToolsArm(): Promise<unknown[]> {
  const defs = await loadCardDefs()
  const out: Record<string, unknown>[] = []
  for (const id of [...defs.keys()].sort()) {
    const def = defs.get(id)!
    const ident = def.identity
    /* v8 ignore next -- loadCardDefs asserts identity (the m1 wall), so live defs always carry it (2026-09-12) */
    if (ident === undefined) continue
    const boarded = [...(def.boarded ?? [])]
    const fams = boarded.length > 0 ? boarded : [id]
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
    const schema = emitParamsSchema(carrier as never, fams) as Record<string, unknown>
    // THE MODS CONTRACT (stroke 79 — the seam-law unification): the
    // declared kinds ride beside params_schema so the AGENT plane
    // sees the same contract the UI form-spec serves — the mod bags
    // are NOT flat-schema keys, and an agent that never learns the
    // kinds hits compose's loud refusals blind (params alone cannot
    // compose a card whose complexity lives in mods). Verbatim off
    // the card's own rows; leaf_face stays a UI concern and never
    // rides (the agent composes VALUES, never faces).
    const mods = emitModifierKinds(def.mods)
    out.push({
      name: id,
      version: 1,
      kind: 'generation',
      model: fams[0],
      stage_title: ident.label,
      description: ident.description,
      genre: ident.genre,
      families: fams,
      params_schema: schema,
      ...(mods.length > 0 ? { modifiers: mods } : {}),
      // F-7 (the stale-face drill): the serving process's tree
      // version rides every face — an agent compares it against
      // the disk HEAD and a stale module is visible, never silent.
      // `version` stays the frozen protocol number (not mine to
      // redesign); the stamp is its own key.
      face_stamp: faceStamp(),
    })
  }
  return out
}

/** The full live catalog section (models/families ride the registry
 *  emission; cards/capabilities ride the cards; the vocabulary rides
 *  the slot SSOT). The GENERIC MCP card row folds into CARDS with
 * the same live census /v1/forms rides (the picker reads this
 * section — ONE surface; a row only here is invisible, a row only
 * there was). */
export function catalogSection(
  defs: Map<string, CardDefinition>,
  mcpServers: readonly string[] = [],
): Record<string, unknown> {
  const live = buildCatalog(modelIds().map((id) => getModel(id))) as unknown as Record<
    string,
    unknown
  >
  const { cards, capabilities } = cardSections(defs)
  // THE GENERIC MCP CARD FOLD (2026-09-21, the operator's law: "it
  // was supposed to be a generic MCP card… ALWAYS spawn a
  // completely standalone DSH subagent"): ONE cards row, id 'mcp',
  // NO families — the card's face is self-contained at the bare key
  // 'mcp' (the AGENT card doc: MCPs/Skills/Inputs plus-boxes + the
  // Task brief; the servers to provide are the MCP tiles' OWN live
  // census, never a picker row or rail per server). The census is
  // the caller's LIVE fold (never static), so no seats = no row and
  // the tree stays seat-free.
  if (mcpServers.length > 0) {
    cards['mcp'] = {
      id: 'mcp',
      label: 'MCP',
      description:
        'Spawn a standalone DSH subagent provisioned with the chosen MCP servers\u2019 tools \u2014 ' +
        'stack MCP tiles to grant servers, hand it artifacts through Inputs, the Task is its brief.',
      genre: '3d',
      families: [],
      principles: [],
      skills: [],
      has_inference: false,
      has_rubric: false,
    }
  }
  return {
    models: live['models'],
    families: live['families'],
    capabilities,
    cards,
  }
}

// ── door arms (the HTTP-facing surface doors.ts mounts) ──────────

/** /v1/model-catalog — the live catalog section (the seated MCP
 * servers fold LIVE — the door passes the tools-seat census, the
 * same read formsArm rides; empty seats fold nothing). */
export async function modelCatalogArm(
  mcpServers: readonly string[] = [],
): Promise<Record<string, unknown>> {
  return catalogSection(await loadCardDefs(), mcpServers)
}

/** /v1/forms — the forms table (card rows + the GENERIC MCP row:
 *  ONE engine-served row, id 'mcp' — the subagent-spawn card; the
 *  surface the cards tab lists; the census is the caller's LIVE
 *  fold, never static). */
export function formsWithEngines(
  cardRows: Record<string, unknown>,
  mcpServers: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...cardRows }
  // ONE row (the generic card's own meta; the same fold
  // catalogSection serves — no seats = no row). The row covers
  // ITSELF (the bare key 'mcp' — the agent card doc): every seated
  // server is a TILE inside the card's MCPs plus-box, never a
  // service row of its own.
  if (mcpServers.length > 0) {
    out['mcp'] = {
      label: 'MCP',
      genre: '3d',
      order: 23,
      plugin: 'mcp',
      sidebar_key: '3d',
      default_service: 'mcp',
      hidden: false,
      covers: ['mcp'],
      inputs: {},
      outputs: { default: 'text' },
    }
  }
  return out
}

/** /v1/forms — the forms table. */
export async function formsArm(mcpServers: readonly string[] = []): Promise<Record<string, unknown>> {
  return formsWithEngines(formsTable(await loadCardDefs()), mcpServers)
}

/** /v1/kinds — the kinds arm. */
export async function kindsDoorArm(): Promise<Record<string, unknown>> {
  return kindsArm()
}

/** /v1/form-spec?model=<key> — the envelope, or null when the key
 *  does not resolve (the door 404s, same body as ever). */
export async function formSpecArm(
  model: string,
  engineDocs?: ReadonlyMap<string, () => Record<string, unknown>>,
): Promise<Record<string, unknown> | null> {
  // THE ENGINE ARM (stroke 66, generalized stroke 69 — the
  // card-seam completion): an engine id resolves to the ENGINE's
  // own form doc (no card, no family) built by the door's LIVE
  // factory (agent's census reads the tools seat + the skill index
  // per request — never a static list). Every doc serializes the
  // same declared contract its executor's gate validates.
  const buildEngine = engineDocs?.get(model)
  if (buildEngine !== undefined) {
    return buildEngine()
  }
  const defs = await loadCardDefs()
  const res = resolveSpecKey(model, defs, boardedMap(defs))
  if (res === null) return null
  return specBody(theService(), defs, res)
}
