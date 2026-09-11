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
  getModel,
  isServedFamily,
  loadCardDefs,
  modelIds,
  SLOT_VOCABULARY,
  theService,
} from '@melite/comfyui-cordis'
import type {
  CardDefinition,
  ComfyUIService,
  ModelDecl,
} from '@melite/comfyui-cordis'

/** The boarded map (family -> the card that boards it, first-seen). */
function boardedMap(defs: Map<string, CardDefinition>): Map<string, string> {
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
    defaults: v.resolver_defaults ?? {},
    route: v.route ?? '',
    hint: v.hint ?? null,
    engine: v.engine ?? declEngine,
    quant: null,
    vram_peak_gb: null,
    owner: '',
  }
}

function capQuant(quant: string): string {
  return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : quant
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
        route: c.route ?? '',
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

/** The modifier-pack table (the subcard packs). lanpaint/qvoice ride
 *  the spec fields inline, never as subcards, so they have no row
 *  here; controlnet waits unboarded (the phantom-capability gate).
 *  kind/label/cardinality are UI strings with no other live source —
 *  one row per pack, stated once. */
const MODIFIER_PACKS: Record<
  string,
  { kind: string; label: string; cardinality: string; max_stack?: number }
> = {
  loras: { kind: 'lora', label: 'LoRAs', cardinality: 'list' },
  controlnet: { kind: 'controlnet', label: 'ControlNet', cardinality: 'list' },
  mask: { kind: 'mask', label: 'Region Mask', cardinality: 'list', max_stack: 1 },
}

function optionTooltip(
  row: { category?: string; filename: string },
  shared: boolean,
): string {
  const base = row.category ? `${row.category} — ${row.filename}` : row.filename
  return shared ? `${base} — runtime catalog` : base
}

/** The modifiers offer: one entry per boarded modifier pack (the
 *  DECL's mods order, filtered to the pack table). Options ride the
 *  pack rows (union-served rows carry the shared suffix); fields
 *  ride the pack's schema_groups member rows minus the pack's own
 *  stack knob. */
function specModifiers(
  svc: ComfyUIService,
  card: string,
  key: string,
  decl: ModelDecl | null,
  schemaGroups: Array<{ id: string; fields: unknown[] }>,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const pack of decl?.mods ?? []) {
    const meta = MODIFIER_PACKS[pack]
    if (meta === undefined) continue
    const cat = svc.modCatalog(pack, key)
    // The pack's groups (walked off its contract — never hardcoded):
    // the absorbed pack fields on this card, scoped to the key.
    const groups = new Set<string>()
    for (const absorbed of svc.cardModFields(card)) {
      if (absorbed.pack !== pack) continue
      if (!absorbed.families.includes(key)) continue
      const dict = (absorbed.fields as { dict?: Record<string, unknown> })
        ?.dict
      for (const node of Object.values(dict ?? {})) {
        const extra = (
          ((node as { meta?: { extra?: Record<string, unknown> } }).meta
            ?.extra ?? {}) as Record<string, unknown>
        )
        if (typeof extra.group === 'string') groups.add(extra.group)
      }
    }
    const fields: unknown[] = []
    for (const g of schemaGroups) {
      if (!groups.has(g.id)) continue
      for (const f of g.fields) {
        if ((f as { name?: unknown }).name === pack) continue
        fields.push(f)
      }
    }
    const entry: Record<string, unknown> = {
      kind: meta.kind,
      label: meta.label,
      param_key: pack,
      cardinality: meta.cardinality,
    }
    if (meta.max_stack !== undefined) entry.max_stack = meta.max_stack
    entry.fields = fields
    entry.options = cat.rows.map((r) => ({
      value: r.id,
      label: r.label ?? r.id,
      tooltip: optionTooltip(r, cat.shared),
      defaults:
        r.default_strength === undefined
          ? {}
          : { strength: r.default_strength },
    }))
    out.push(entry)
  }
  return out
}

/** Card schema defaults for card-only keys (mask-studio declares no
 *  DECL — its envelope defaults ride the schema's declared
 *  defaults, native JSON types). DECL keys ride the DECL defaults
 *  verbatim. */
function schemaDefaults(def: CardDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
    def.schema
  const dict = (carrier as { dict?: Record<string, { meta?: { default?: unknown } }> })
    ?.dict
  for (const [name, node] of Object.entries(dict ?? {})) {
    const dflt = node?.meta?.default
    if (dflt !== undefined) out[name] = dflt as unknown
  }
  return out
}

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
  const fs = svc.formSpec(res.card, key) as {
    fields: unknown[]
    schema_groups: Array<{ id: string; fields: unknown[] }>
  } | null
  if (fs === null) {
    throw new Error(`form-spec: card '${res.card}' unknown`)
  }
  const surface = def.surface ?? {}
  const boarded = def.boarded ?? []
  const primary = (boarded.length > 0 ? boarded[0] : res.card) === key
  return {
    contract: null,
    defaults: decl?.defaults ?? schemaDefaults(def),
    engine: decl?.engine ?? 'comfyui',
    enhance_prompt: null,
    enhance_prompts: { prompt: null, lyrics: '' },
    features: {
      modifiers: specModifiers(svc, res.card, key, decl, fs.schema_groups),
      variant_groups: groupContract(decl),
    },
    fields: fs.fields,
    form: res.card,
    genre: ident.genre,
    guide: null,
    label: ident.label,
    layout: surface.layout === 'studio' ? 'studio' : null,
    loader_info: null,
    model: res.model,
    schema_groups: fs.schema_groups,
    service: res.service,
    size: surface.size === 'huge' ? 'huge' : null,
    variants: decl ? specVariants(decl, key, res.service, primary) : [],
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
      },
    })
  }
  rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
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
): Promise<Record<string, unknown> | null> {
  const defs = await loadCardDefs()
  const res = resolveSpecKey(model, defs, boardedMap(defs))
  if (res === null) return null
  return specBody(theService(), defs, res)
}
