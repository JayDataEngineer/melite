// The ComfyUI service (Tier 3's mount point). One service instance
// per Cordis context; cards register into it, the compose door
// reads from it. The EXTENSION-LAW requires gate rides here: card
// requires resolve against live object_info node sets BEFORE any
// graph is emitted (never an assumed install).
import { Context, Service } from '@deepseek-ai/cordis'
import { GraphBuilder, deriveDefaults } from './graph.ts'
import type { PromptGraph, JsonValue } from './graph.ts'
import type { FactsFile, ModelFacts } from './facts.ts'

/** Loud refusal — the estate's rc=-3 door shape, never a silent default. */
export class ComposeRefusal extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export interface CardDefinition {
  id: string
  /** Stage-row id the compose emits (retired compose.py skeleton=
   *  verbatim, SSOT'd from the py decls; TS owns the truth post-flip
   *  — required on every card, never a fallback). */
  skeleton: string
  /** Boarded model ids (the board gate; unboarded models refuse). */
  boarded: readonly string[]
  /** Pure-tool cards (boarded: [], no model families — the Blender
   *  card precedent): skip the {model:} demand everywhere (cardGate,
   *  compose, CLI). Default true — every existing card needs one. */
  requiresModel?: boolean
  /** Admission extras (the py class-attr `admits` half): params the
   *  compose door admits BEYOND the schema knobs (route stamps,
   *  renderer vocab, studio writes flattened at port time). Most
   *  cards carry none — the schema IS the surface. */
  admits?: readonly string[]
  /** $spell-eligible params (the py `spell_params` half): file slots
   *  whose "$name" values pool for two-card-flow handoff instead of
   *  composing. Empty/absent = no spell pooling. */
  spells?: readonly string[]
  /** Extension packs the card's renderers ride (EXTENSION LAW). */
  requires?: readonly string[]
  /** Per-family extension packs — the py requires_by_family mirror.
   *  (2026-09-08: declared on the base interface — the compose door
   *  below already read it; tagger.ts / img-to-mesh.ts module
   *  augmentations merge the identical shape. Type-level only.) */
  requiresByFamily?: Record<string, readonly string[]>
  /** Schemastery schema of the card params (validated before compose). */
  schema: (v: unknown) => Record<string, unknown>
  /** When the registered schema is a hand-written normalizer, the
   *  underlying Schemastery object whose .dict the emitters walk
   *  (formSpec/params-emit). Cards with plain schemas leave this
   *  unset — schema is the carrier. */
  schemaCarrier?: unknown
  /** Build the graph. Order of node creation IS the node-id order. */
  compose(params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void
  /** Post-serialize pass — the lane's autofill-strip calibration
   *  (stripAutofill / stripEmptyAutofill). Cards whose python
   *  renderer strips must port the table here; parity pins it. */
  finalize?(graph: PromptGraph): PromptGraph
  /** THE IDENTITY RUNG (card DSL phase 2, 2026-09-08): the py
   *  card.py identity (label/description/genre/icon/ability) died
   *  with the authoring plane. The frozen ring
   *  (engine-comfyui models/cardIdentity.generated.ts — extracted
   *  by the golden's own builder) attaches here at loadCardDefs
   *  time: ONE spelling, carried by the def itself. New cards
   *  declare identity inline; the ring thins as cards absorb
   *  theirs natively. */
  identity?: {
    label: string
    description: string
    genre: string
    icon?: string
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    comfyui: ComfyUIService
  }
}

// ── THE MOD/VERB SYSTEM (melite_cards dsl.py port, 2026-09-08) ──
//
// The py interlock: Model classes declared mods (fields + catalog
// rows joining the OWNING CARD's surface, scoped to the declaring
// families); SubActionMods mounted as verbs (engine rows, never on
// the card surface). Ported under the PORT LAW: registration
// through this service, validation LOUD at registration (the
// metaclass's gates), absorption derives at read.

/** A mod's field contract: a Schemastery OBJECT schema (the
 *  dual-declaration pattern — the same z.object({...}) style the
 *  cards declare; UI meta rides .extra('extra', {group, zone,
 *  order, visible_when}) exactly like card fields). ONE meta path
 *  walks both card and mod surfaces; same-pack flavor merging is
 *  Schema.intersect semantics (constraints merge per key). */
export type ModFields = {
  (v: unknown): Record<string, unknown>
  dict?: Record<string, Record<string, unknown>>
}

/** A lora catalog row (grammar.py LoraRow — no link, no row). */
export interface LoraRowDecl {
  readonly id: string
  readonly filename: string
  readonly source_url: string
  readonly label?: string
  readonly category?: string
  readonly default_strength?: number
}

// ── THE MOD MUTATION SYSTEM (corrected 2026-09-08, operator
// order): mods are a DISTINCT CATEGORY — packs (loras, controlnets,
// lan-inpaint, mask, qvoice in that vein). The PACK is the category
// contract (its field schema, the py Mod parent — engine-owned,
// melite_cards role); the FLAVOR is a family's boarding of the pack
// (the py Model.mods tuple entry + the family's mods/<pack>.py
// subclass — FAMILY-owned data: rows, runtime door, or a bare
// boarding). Fields live ONLY on the pack; a flavor never re-declares
// them (inheritance — py subclassing). Scope comes from the
// DECLARATION SITE: the flavor's families, cross-gated boot-loud
// against the model's own DECL.mods (the paper's satisfaction law).

/** A pack contract — the CATEGORY (the py Mod parent: LorasMod,
 *  ControlNetMod, LanPaintMod, MaskMod, the qvoice pack). Fields
 *  are the pack's knob block, inherited by every boarding family. */
export interface PackContract {
  readonly pack: string
  readonly fields: ModFields
}

/** A flavor registration — ONE family's boarding of a pack (the py
 *  Model.mods tuple entry): bare (fields-only boarding), row-bearing
 *  (the family's catalog rows), or the runtime-catalog door. The
 *  file lives in the family's own mods/ dir — the scope below IS
 *  the owning declaration, gated ≡ the model's DECL.mods at boot. */
export interface FlavorRegistration {
  readonly pack: string
  readonly families: readonly string[]
  readonly rows?: readonly LoraRowDecl[]
  /** The RUNTIME CATALOG door (estate qwen loras.py): no own rows —
   *  the union of every family's declared rows serves; family rows
   *  always win over the union. */
  readonly runtimeCatalog?: boolean
}

/** A verb engine row (dsl.py VerbEngine — exactly one arm). */
export interface VerbEngineRow {
  readonly id: string
  readonly flow?: string
  readonly local?: string
  readonly refusal?: string
}

/** A verb registration (SubActionMod: knobs NEVER join the card
 *  surface; they ride the engine invocation). */
export interface VerbRegistration {
  readonly id: string
  readonly label: string
  readonly families: readonly string[]
  readonly engines: readonly VerbEngineRow[]
  readonly writes: readonly string[]
  readonly requires: readonly string[]
  readonly fields: ModFields
}

/** A mod's absorbed contract (the family scope attached — the
 *  emission filter). */
export interface AbsorbedMod {
  readonly pack: string
  readonly fields: ModFields
  readonly families: readonly string[]
}

/** The py's field gates (dsl.py _validate_field), on the
 *  Schemastery meta — loud at registration, never a silent drop. */
function validateFields(where: string, fields: ModFields): void {
  const dict = fields.dict
  if (dict === undefined) {
    throw new ComposeRefusal('bad-field', `${where}: fields must be a z.object contract (no .dict to walk)`)
  }
  for (const [name, node] of Object.entries(dict)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      throw new ComposeRefusal('bad-field', `${where}: field name '${name}' is not a legal identifier`)
    }
    const meta = (node as { meta?: Record<string, unknown> }).meta ?? {}
    if (meta.min !== undefined && meta.max !== undefined && (meta.min as number) > (meta.max as number)) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: min ${String(meta.min)} > max ${String(meta.max)}`)
    }
    if (meta.step !== undefined && (meta.step as number) <= 0) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: step ${String(meta.step)} <= 0`)
    }
    const dv = meta.default
    if (
      typeof dv === 'number' &&
      ((meta.min !== undefined && dv < (meta.min as number)) || (meta.max !== undefined && dv > (meta.max as number)))
    ) {
      throw new ComposeRefusal('bad-field', `${where}.${name}: default ${String(dv)} outside [${String(meta.min ?? '-∞')}, ${String(meta.max ?? '∞')}]`)
    }
  }
}

/** The verb plane law (dsl.py _validate_verbs): every engine row
 *  carries EXACTLY one arm. */
function validateVerb(v: VerbRegistration): void {
  if (!v.id || !v.label) throw new ComposeRefusal('bad-verb', `verb needs id + label`)
  for (const e of v.engines) {
    const arms = [e.flow, e.local, e.refusal].filter((x) => x !== undefined && x !== null && x !== '')
    if (arms.length !== 1) {
      throw new ComposeRefusal('bad-verb', `verb '${v.id}' engine '${e.id}': exactly one of flow/local/refusal (got ${arms.length})`)
    }
  }
  validateFields(`verb ${v.id}`, v.fields)
}

/** A union-of-consts node's option list (declared order = serve
 *  order; null when the node is not a closed vocabulary). The
 *  alternatives live at .list, each const carrying .value; a null
 *  const is the nullable marker, never an enum option. */
function unionOptions(node: Record<string, unknown>): readonly string[] | null {
  const t = String(node.type ?? '')
  if (t !== 'union') return null
  const list = node.list
  if (!Array.isArray(list)) return null
  const opts: string[] = []
  for (const sub of list as Array<{ value?: unknown }>) {
    if (sub?.value !== undefined && sub?.value !== null) opts.push(String(sub.value))
  }
  return opts.length > 0 ? opts : null
}

/** nullable(X) — a union of exactly [X, const(null)] — WIRES as X
 *  (type/label/bounds/default off the inner row; null stays a legal
 *  value at the parse level, invisible on the wire row). */
function unwrapNullable(node: Record<string, unknown>): Record<string, unknown> {
  if (String(node.type ?? '') !== 'union') return node
  const list = node.list
  if (!Array.isArray(list) || list.length !== 2) return node
  const inner = list.find((s) => !(s && s.type === 'const' && (s as { value?: unknown }).value === null))
  const nullArm = list.find((s) => s && s.type === 'const' && (s as { value?: unknown }).value === null)
  if (!inner || !nullArm) return node
  // the outer's own meta (description/default applied after the
  // wrap) wins over the inner's
  const outer = { ...(inner as Record<string, unknown>) }
  const outerMeta = (node.meta ?? {}) as Record<string, unknown>
  const innerMeta = (outer.meta ?? {}) as Record<string, unknown>
  outer.meta = { ...innerMeta, ...outerMeta }
  return outer
}

function wireType(node: Record<string, unknown>): string {
  // declared wire type wins (mod contracts carry the py's exact
  // type: image/mask/file/select/number/slider/textarea/loras)
  const extra = ((node.meta as Record<string, unknown> | undefined)?.extra ?? {}) as Record<string, unknown>
  if (typeof extra.wtype === 'string' && extra.wtype !== '') return extra.wtype
  const t = String(node.type ?? 'string')
  if (t === 'union' && unionOptions(node) !== null) return 'select'
  if (t === 'number') return String((node.meta as Record<string, unknown> | undefined)?.step ?? '') === '1' ? 'seed' : 'slider'
  if (t === 'string') return 'text'
  if (t === 'boolean') return 'boolean'
  if (t === 'array') return 'loras'
  return 'text'
}

export class ComfyUIService extends Service {
  private readonly cards = new Map<string, CardDefinition>()
  private readonly packs = new Map<string, PackContract>()
  private readonly flavors: FlavorRegistration[] = []
  private readonly verbs = new Map<string, VerbRegistration>()
  private facts: FactsFile | null = null
  /** Live object_info node names — set before compose to arm the gate. */
  private objectInfoNodes: Set<string> | null = null
  /** Pin defaults map (class → input → default), derived from the
   *  same snapshot — comfy-script autofill parity. */
  private pinDefaults: Record<string, Record<string, JsonValue>> = {}

  constructor(ctx: Context) {
    super(ctx, 'comfyui')
  }

  /** Register one card. REVERTIBLE (the paper's effect shape, Def. 8:
   *  the mutation RETURNS its inverse — Γ → Γ × (Γ→Γ)). The card's
   *  plugin wraps this in ctx.effect(() => svc.registerCard(def)):
   *  the FIBER owns the disposer, unload runs it, the card plane
   *  reverts to the pre-registration state. LOUD: duplicate ids
   *  refuse (one card, one plugin). */
  registerCard(def: CardDefinition): (() => void) {
    if (this.cards.has(def.id)) {
      throw new ComposeRefusal('duplicate-card', `card '${def.id}' registered twice — one card, one plugin`)
    }
    this.cards.set(def.id, def)
    return () => { this.cards.delete(def.id) }
  }

  // ── THE MOD/VERB REGISTRATION (dsl.py port: the Model.mods
  //  interlock — fields absorb onto the OWNING CARD's surface
  //  scoped to the declaring families; verbs mount by id) ──

  /** Register one PACK CONTRACT — the category (the py Mod parent).
   *  LOUD: field gates at registration (the py metaclass's
   *  import-time validation); ONE SHAPE per pack name (a second
   *  contract for the same pack with different fields is drift —
   *  py: one declaration per name means one shape per name). */
  registerPack(contract: PackContract): (() => void) {
    validateFields(`pack ${contract.pack}`, contract.fields)
    const prior = this.packs.get(contract.pack)
    if (prior !== undefined) {
      const priorNames = Object.keys(prior.fields.dict ?? {}).sort().join(',')
      const nowNames = Object.keys(contract.fields.dict ?? {}).sort().join(',')
      if (priorNames !== nowNames) {
        throw new ComposeRefusal('bad-mod',
          `pack '${contract.pack}' has two shapes: [${priorNames}] vs [${nowNames}] — one pack name means one shape`)
      }
    }
    this.packs.set(contract.pack, contract)
    return () => { this.packs.delete(contract.pack) }
  }

  /** Register one FLAVOR — a family's boarding of a pack (the py
   *  Model.mods tuple entry; the family's own mods/<pack>.ts file).
   *  Fields are INHERITED from the pack contract — a flavor never
   *  carries fields. LOUD: the pack must exist (a flavor for an
   *  unknown pack is drift); every family id non-empty. The
   *  flavor↔DECL.mods interlock runs boot-loud on the models side
   *  (validateBootContracts). */
  registerFlavor(flavor: FlavorRegistration): (() => void) {
    if (!this.packs.has(flavor.pack)) {
      throw new ComposeRefusal('bad-mod',
        `flavor for pack '${flavor.pack}' — no such pack registered (the category contract lands first; a flavor for an unknown pack is drift)`)
    }
    if (flavor.families.length === 0) {
      throw new ComposeRefusal('bad-mod', `flavor of '${flavor.pack}' declares no families — a flavor rides a model`)
    }
    this.flavors.push(flavor)
    return () => {
      const i = this.flavors.indexOf(flavor)
      if (i >= 0) this.flavors.splice(i, 1)
    }
  }

  /** The registered pack names (the category taxonomy — the boot
   *  gate reads this to refuse dead DECL.mods refs). */
  packNames(): string[] {
    return [...this.packs.keys()].sort()
  }

  /** The flavor registrations (the boot gate's side of the
   *  flavor↔boarding interlock). */
  flavorRegistrations(): readonly FlavorRegistration[] {
    return this.flavors
  }

  /** The registered verb ids (SubActionMods — the anny plane; the
   *  boot gate reads this to satisfy DECL.mods verb entries). */
  verbIds(): string[] {
    return [...this.verbs.keys()].sort()
  }

  /** Register one verb. LOUD: the plane law (exactly one engine
   *  arm per engine row) and one registration per verb id (two
   *  classes mounting one id is the py's loud refusal). */
  registerVerb(verb: VerbRegistration): (() => void) {
    // duplicate id is the LOUDER signal — it fires before the
    // contract gates (a re-mount of a live verb id is an owner
    // bug, not a declaration bug)
    if (this.verbs.has(verb.id)) {
      throw new ComposeRefusal('bad-verb', `verb '${verb.id}' registered twice — one class per verb id`)
    }
    validateVerb(verb)
    this.verbs.set(verb.id, verb)
    return () => { this.verbs.delete(verb.id) }
  }

  /** THE ABSORPTION (dsl.py _absorb_models, read-side): for every
   *  PACK, the fields (the category contract — inherited by every
   *  boarding) join the card surface scoped to the families whose
   *  FLAVORS intersect the card's boarded set — THE MODEL-LEVEL
   *  MUTATION: one join per family, inherited by every variant and
   *  quant of that family (the cascade rides below this surface). */
  cardModFields(cardId: string): AbsorbedMod[] {
    const def = this.cards.get(cardId)
    if (def === undefined) return []
    const out: AbsorbedMod[] = []
    for (const [pack, contract] of [...this.packs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const scope = new Set<string>()
      for (const flavor of this.flavors) {
        if (flavor.pack !== pack) continue
        for (const fam of flavor.families) {
          if (def.boarded.includes(fam)) scope.add(fam)
        }
      }
      if (scope.size === 0) continue
      out.push({ pack, fields: contract.fields, families: [...scope].sort() })
    }
    return out
  }

  /** The mod's catalog rows for one family (lora picks). THE
   *  RUNTIME CATALOG LAW: a flavor with runtimeCatalog and no own
   *  rows serves the UNION of every flavor's declared rows of the
   *  same pack; family rows always win over the union. */
  modRows(pack: string, family: string): readonly LoraRowDecl[] {
    const own = this.flavors.find(
      (m) => m.pack === pack && m.families.includes(family),
    )
    if (own === undefined) return []
    if ((own.rows ?? []).length > 0 || own.runtimeCatalog !== true) return own.rows ?? []
    const union = new Map<string, LoraRowDecl>()
    for (const m of this.flavors) {
      if (m.pack !== pack) continue
      for (const row of m.rows ?? []) union.set(row.id, row)
    }
    return [...union.values()]
  }

  /** The verbs mounted on a card (SubActionMods of its boarded
   *  families — knobs NEVER on the card surface). */
  cardVerbs(cardId: string): VerbRegistration[] {
    const def = this.cards.get(cardId)
    if (def === undefined) return []
    return [...this.verbs.values()].filter((v) => v.families.some((fam) => def.boarded.includes(fam)))
  }

  /** The wire form fragment for one card + family (serialize.py
   *  field_spec, 1:1): card schema meta fields + absorbed mod
   *  fields, grouped first-seen, zone from members, capitalized
   *  group labels. Binary types included (NO DROPS — 2026-09-05).
   *  ONE meta path walks both planes (cards' schemas and mods'
   *  contracts are the same Schemastery shape — the dual-decl
   *  pattern; group/zone/visible_when ride .extra on both). */
  formSpec(cardId: string, family: string): Record<string, unknown> | null {
    const def = this.cards.get(cardId)
    if (def === undefined) return null
    const fields: Record<string, unknown>[] = []
    // group -> zone (rows wire zone '' — the frozen row shape — but
    // schema_groups carry the zone; first declaration wins)
    const groupZones = new Map<string, string>()
    const walk = (schema: unknown, scoped: boolean): void => {
      const carrier = (schema as { dict?: Record<string, Record<string, unknown>> }) ?? {}
      const dict = carrier.dict
      if (dict === undefined) return
      // FROZEN ROW SHAPE (the py emitter's, referee-pinned): every
      // row carries the SAME 15 keys in the SAME order — absent
      // values ride as null/''. The order number is the frozen
      // group-local ordinal (extra.order; group counter as the
      // fallback) — gaps are referee truth (py declared, spec
      // filtered). zone is ALWAYS '' on the wire (the py never set
      // it; zone lives in schema_groups).
      for (const [name, node0] of Object.entries(dict)) {
        const node = unwrapNullable(node0 as Record<string, unknown>)
        const meta = (node as { meta?: Record<string, unknown> }).meta ?? {}
        const extra = (meta.extra ?? {}) as Record<string, unknown>
        const fams = extra.families as readonly string[] | undefined
        if (fams !== undefined && !fams.includes(family)) continue
        const wtype = wireType(node as Record<string, unknown>)
        const group = (extra.group as string) ?? ''
        if (!groupZones.has(group)) groupZones.set(group, (extra.zone as string | undefined) ?? 'params')
        const order = typeof extra.order === 'number' ? extra.order : null
        // SEED SHAPE (referee-faithful): the seed identity wires
        // through the TYPE — its step never keys the row (bounds
        // stay whatever the declaration carries).
        const step = wtype === 'seed' ? null : (((meta.step ?? extra.step) as number | undefined) ?? null)
        const noDefault = Array.isArray(meta.default) && (meta.default as unknown[]).length === 0 && extra.default === null
        fields.push({
          name,
          type: wtype,
          label: (meta.description as string) ?? name,
          default: noDefault || meta.default === undefined || meta.default === '' ? null : (meta.default as unknown),
          // options ALWAYS keys the row: declared x-options win,
          // else the union-of-consts row, else the empty list.
          options: extra.options ?? unionOptions(node as Record<string, unknown>) ?? [],
          group,
          zone: '',
          order,
          required: extra.required === true || meta.required === true ? true : null,
          columns: (extra.columns as number | undefined) ?? null,
          width: (extra.width as number | undefined) ?? null,
          min: (meta.min as number | undefined) ?? null,
          max: (meta.max as number | undefined) ?? null,
          step,
          placeholder: (extra.placeholder as string | undefined) ?? '',
          tooltip: (extra.tooltip as string | undefined) ?? '',
          visible_when: (extra.visible_when as string | null | undefined) ?? null,
        })
      }
    }
    walk(def.schemaCarrier ?? def.schema, false)
    // absorbed mod contracts (family-scoped) ride AFTER the card's own
    for (const absorbed of this.cardModFields(cardId)) {
      if (!absorbed.families.includes(family)) continue
      walk(absorbed.fields, false)
    }
    // groups: first-seen order, capitalized labels, zone from the
    // group's first declaration (the frozen schema_groups shape:
    // {id, label, fields, order, zone}; member rows drop the flat
    // row's group/zone/options and the null/''-valued keys).
    const groups: string[] = []
    for (const f of fields) {
      const g = (f.group as string) ?? ''
      if (!groups.includes(g)) groups.push(g)
    }
    // member rows: the frozen member order (name,type,label,order,
    // width,columns,required,min,max,step,default,visible_when,
    // tooltip,placeholder) with null/'' values dropped
    const MEMBER_KEYS = ['name', 'type', 'label', 'order', 'width', 'columns', 'required', 'min', 'max', 'step', 'default', 'visible_when', 'placeholder', 'tooltip', 'options']
    const memberRow = (f: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {}
      for (const k of MEMBER_KEYS) {
        const v = f[k]
        if (v === null || v === '' || v === undefined) continue
        // options ride members only when NON-EMPTY (the py emitter's
        // member shape — closed vocabularies announce, empties drop)
        if (k === 'options' && Array.isArray(v) && v.length === 0) continue
        out[k] = v
      }
      return out
    }
    const schemaGroups = groups.map((g, k) => ({
      id: g,
      label: g === '' ? 'Parameters' : (g[0].toUpperCase() + g.slice(1)),
      fields: fields.filter((f) => ((f.group as string) ?? '') === g).map((f) => memberRow(f as Record<string, unknown>)),
      order: k,
      zone: groupZones.get(g) ?? 'params',
    }))
    return {
      form: cardId,
      service: family,
      fields,
      schema_groups: schemaGroups,
    }
  }



  setFacts(facts: FactsFile): void {
    this.facts = facts
  }

  /** Registry read for the serving surfaces (params_schema emitter):
   * the registered definition by card id. Read-only — registration
   * still rides registerCard only. */
  getCardDef(id: string): CardDefinition | undefined {
    return this.cards.get(id)
  }

  /** Registered card ids (sorted) — census + refusal text reuse. */
  cardIds(): string[] {
    return [...this.cards.keys()].sort()
  }

  setObjectInfo(objectInfo: Record<string, any> | null): void {
    if (!objectInfo) {
      this.objectInfoNodes = null
      this.pinDefaults = {}
      return
    }
    this.objectInfoNodes = new Set(Object.keys(objectInfo))
    this.pinDefaults = deriveDefaults(objectInfo)
  }

  /** Legacy: node-name set only (gate arming without autofill). */
  setObjectInfoNodes(nodes: Iterable<string> | null): void {
    this.objectInfoNodes = nodes ? new Set(nodes) : null
  }

  compose(cardId: string, modelId: string | null, params: unknown, runId: string): PromptGraph {
    const def = this.cards.get(cardId)
    if (!def) throw new ComposeRefusal('unknown-card', `unknown card '${cardId}' (registered: ${[...this.cards.keys()].sort().join(', ') || 'none'})`)
    // MODEL-LESS path (requiresModel: false — pure-tool cards with no
    // families): no board, no facts row, no model defaults. The
    // schema parse below still runs — the single declaration guards
    // the params, never a second truth.
    if (def.requiresModel === false && (modelId === null || modelId === '')) {
      let merged: Record<string, unknown>
      try {
        merged = def.schema(params)
      } catch (e) {
        throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${(e as Error).message}`)
      }
      const packs = def.requires
      if (packs?.length && this.objectInfoNodes) {
        const extMap = this.facts?.extension_node_types ?? {}
        for (const pack of packs) {
          const expected = extMap[pack] ?? []
          const found = expected.filter((n) => this.objectInfoNodes!.has(n))
          if (expected.length > 0 && found.length === 0) {
            throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`)
          }
        }
      }
      const g = new GraphBuilder(this.pinDefaults)
      def.compose(merged, { id: '', card: cardId, defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [], mods: [] }, g, runId)
      const graph = g.toJSON()
      return def.finalize ? def.finalize(graph) : graph
    }
    if (modelId === null || modelId === '') {
      throw new ComposeRefusal('no-model', `card '${cardId}' requires a model id (the {model:} door) — see GET /v1/models`)
    }
    if (!def.boarded.includes(modelId)) {
      throw new ComposeRefusal('not-boarded', `model '${modelId}' is not boarded on the ${cardId} card (boarded: ${[...def.boarded].sort().join(', ')})`)
    }
    if (!this.facts) throw new ComposeRefusal('no-facts', 'model facts not loaded — the compose door requires --facts')
    const model = this.facts.models[modelId]
    if (!model) throw new ComposeRefusal('no-model-facts', `model '${modelId}' has no facts row (hand-edit packages/engines/comfyui-cordis/data/model-facts.json — it is hand-owned frozen data, never regenerated)`)
    if (model.card !== cardId) throw new ComposeRefusal('card-mismatch', `model '${modelId}' facts name card '${model.card}', not '${cardId}'`)

    // params cascade: schema defaults ← model defaults ← explicit params
    let merged: Record<string, unknown>
    try {
      merged = def.schema(params)
    } catch (e) {
      throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${(e as Error).message}`)
    }
    merged = { ...merged, ...Object.fromEntries(Object.entries(model.defaults).filter(([, v]) => v !== null && !Array.isArray(v))), ...((params ?? {}) as Record<string, unknown>) }

    // EXTENSION LAW gate: family slice wins when present (py
    // requires_by_family precedent); flat union otherwise.
    const packs = def.requiresByFamily?.[modelId] ?? def.requires
    if (packs?.length && this.objectInfoNodes) {
      const extMap = this.facts.extension_node_types ?? {}
      for (const pack of packs) {
        const expected = extMap[pack] ?? []
        const found = expected.filter((n) => this.objectInfoNodes!.has(n))
        if (expected.length > 0 && found.length === 0) {
          throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`)
        }
      }
    }

    const g = new GraphBuilder(this.pinDefaults)
    def.compose(merged, model, g, runId)
    const graph = g.toJSON()
    return def.finalize ? def.finalize(graph) : graph
  }
}
