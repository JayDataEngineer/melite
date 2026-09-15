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
  loadCardDefs,
  modelIds,
  SLOT_VOCABULARY,
  theService,
} from '@melite/comfyui-cordis'
import type {
  CardDefinition,
  ComfyUIService,
  DeclaredModifierKind,
  ModelDecl,
} from '@melite/comfyui-cordis'
import { agentFormDoc } from '@melite/engine-agent'

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
 *  anchor (the client half); this row offers the knobs. */
const MODIFIER_PACKS: Record<
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
}

function optionTooltip(
  row: { category?: string; filename: string; tooltip?: string },
  shared: boolean,
): string {
  // A row-served tooltip wins (the controlnet catalog's own prose —
  // the retired options' tooltip, 1:1); otherwise the category —
  // filename face lora rows have always worn.
  const base = row.tooltip ?? (row.category ? `${row.category} — ${row.filename}` : row.filename)
  return shared ? `${base} — runtime catalog` : base
}

/** The modifiers offer: one entry per boarded modifier pack (the
 *  DECL's mods order, filtered to the pack table). Options ride the
 *  pack rows (union-served rows carry the shared suffix); the
 *  entry's param rows derive client-side off `mod_schemas[pack]`
 *  (the absorbed contract's own toJSON — same walker as the card
 *  fields, one meta path). */
function specModifiers(
  svc: ComfyUIService,
  card: string,
  key: string,
  decl: ModelDecl | null,
  def: CardDefinition | undefined,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const pack of decl?.mods ?? []) {
    const meta = MODIFIER_PACKS[pack]
    if (meta === undefined) continue
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
      defaults:
        r.default_strength === undefined && r.default_weight === undefined
          ? {}
          : { [meta.scalar_key ?? 'strength']: r.default_strength ?? r.default_weight },
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
    if (k.fields !== undefined) entry.fields = k.fields
    if (k.kindFields !== undefined) entry.kindFields = k.kindFields
    if (k.options !== undefined) entry.options = k.options
    out.push(entry)
  }
  return out
}

export type { DeclaredModifierKind }

/** One form-spec envelope (the /v1/form-spec?model= body — the
 *  editor's render truth for one served key). Everything scopes to
 *  the KEY family; the owner supplies only the service
 *  attribution. Keys insert alphabetically (the frozen shape). */
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
  const schemas = svc.formSchemas(res.card, key)
  if (schemas === null) {
    throw new Error(`form-spec: card '${res.card}' unknown`)
  }
  // THE MOD SYSTEM OWNS MODS (the old SubcardGrid law, 2026-08-09:
  // "LoRA is a MOD, never a standalone addition — the free-text
  // grid must not render the mod bags as raw JSON rows; the
  // SubcardGrid owns them"). Mod params ride mod_schemas (keyed by
  // pack) and render ONLY through the mod surface. ControlNet
  // proves the law by absence: the pack waits unboarded and no
  // envelope, no entry, no endpoint ever names it.
  const modifiers = specModifiers(svc, res.card, key, decl, def)
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
  // declaration lives on every card (flowKinds — the py card.py
  // stage half); the emission serves it so the card-UI BASE
  // constructs input components and wires pickers from DECLARED
  // edges, never from result-URL sniffing. The required join moved
  // client-side with the envelope (fieldsOf owns the schema's
  // required facts now — the py law verbatim: required:True emits,
  // False omits).
  const inputs = Object.entries(def.flowKinds.inputs).map(([name, kind]) => ({
    name,
    kind,
  }))
  return {
    contract: null,
    // THE BASE LAYER INPUT (the parameter audit): the family row's
    // own defaults — resolveValue layers schema defaults <- this <-
    // recipe params <- user, the engine's compose order verbatim.
    model_defaults: decl?.defaults ?? {},
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
    // ids + presence ONLY (the operator's burn, stroke 19: the DECL
    // label is PROSE describing a variant+quant config — "Krea 2
    // Turbo INT8 ConvRot" is NOT a model name; it must never render
    // as a Model option). The rail speaks ids; descriptions live on
    // the load surface where they have context.
    families: (def.boarded ?? []).map((fam) => ({ id: fam, present: liveMids.has(fam) })),
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
    })
  }
  return out
}

/** The full live catalog section (models/families ride the registry
 *  emission; cards/capabilities ride the cards; the vocabulary rides
 *  the slot SSOT). */
export function catalogSection(
  defs: Map<string, CardDefinition>,
): Record<string, unknown> {
  const live = buildCatalog(modelIds().map((id) => getModel(id))) as unknown as Record<
    string,
    unknown
  >
  const { cards, capabilities } = cardSections(defs)
  return {
    models: live['models'],
    families: live['families'],
    capabilities,
    cards,
    input_vocabulary: SLOT_VOCABULARY,
  }
}

// ── door arms (the HTTP-facing surface doors.ts mounts) ──────────

/** /v1/model-catalog — the live catalog section. */
export async function modelCatalogArm(): Promise<Record<string, unknown>> {
  return catalogSection(await loadCardDefs())
}

/** /v1/forms — the forms table. */
export async function formsArm(): Promise<Record<string, unknown>> {
  return formsTable(await loadCardDefs())
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
