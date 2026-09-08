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

/** One mod field row — the wire fragment's shape (dsl.py Field).
 *  UI declaration rows, NOT validated params: the card's
 *  Schemastery schema owns validation; these own the editor
 *  surface (group/zone/order/visible_when have no schemastery
 *  native — typed rows + the registration gates below). */
export interface ModField {
  readonly name: string
  readonly type: string
  readonly label: string
  readonly group?: string
  readonly zone?: string
  readonly order?: number
  readonly width?: number
  readonly columns?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly default?: string | number | boolean | readonly string[]
  readonly required?: boolean
  readonly placeholder?: string
  readonly tooltip?: string
  readonly visible_when?: string
  /** '$samplers' | '$schedulers' | inline options. */
  readonly options?: string | readonly string[]
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

/** A mod registration — one pack flavor declared by ONE family
 *  (the py Model.mods tuple entry; same-pack flavors from
 *  different families merge onto the card surface with their
 *  declaring families as the scope). */
export interface ModRegistration {
  readonly pack: string
  readonly families: readonly string[]
  readonly fields: readonly ModField[]
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
  readonly fields: readonly ModField[]
}

/** A field as absorbed onto a card surface (the family scope
 *  attached — the emission filter). */
export interface AbsorbedField {
  readonly field: ModField
  readonly families: readonly string[]
}

/** The py's field gates (dsl.py _validate_field) — loud at
 *  registration, never a silent drop. */
function validateField(where: string, f: ModField): void {
  if (!/^[a-z_][a-z0-9_]*$/.test(f.name)) {
    throw new ComposeRefusal('bad-field', `${where}: field name '${f.name}' is not a legal identifier`)
  }
  if (typeof f.type !== 'string' || f.type === '') {
    throw new ComposeRefusal('bad-field', `${where}.${f.name}: a field needs a type`)
  }
  if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
    throw new ComposeRefusal('bad-field', `${where}.${f.name}: min ${f.min} > max ${f.max}`)
  }
  if (f.step !== undefined && f.step <= 0) {
    throw new ComposeRefusal('bad-field', `${where}.${f.name}: step ${f.step} <= 0`)
  }
  if (
    f.default !== undefined && typeof f.default === 'number' &&
    ((f.min !== undefined && f.default < f.min) || (f.max !== undefined && f.default > f.max))
  ) {
    throw new ComposeRefusal('bad-field', `${where}.${f.name}: default ${f.default} outside [${f.min ?? '-∞'}, ${f.max ?? '∞'}]`)
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
  for (const f of v.fields) validateField(`verb ${v.id}`, f)
}

function wireType(node: Record<string, unknown>): string {
  const t = String(node.type ?? 'string')
  if (t === 'number') return String((node.meta as Record<string, unknown> | undefined)?.step ?? '') === '1' ? 'seed' : 'slider'
  if (t === 'string') return 'text'
  if (t === 'boolean') return 'boolean'
  if (t === 'array') return 'loras'
  return 'text'
}

export class ComfyUIService extends Service {
  private readonly cards = new Map<string, CardDefinition>()
  private readonly modRegistrations: ModRegistration[] = []
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

  registerCard(def: CardDefinition): void {
    if (this.cards.has(def.id)) {
      throw new ComposeRefusal('duplicate-card', `card '${def.id}' registered twice — one card, one plugin`)
    }
    this.cards.set(def.id, def)
  }

  // ── THE MOD/VERB REGISTRATION (dsl.py port: the Model.mods
  //  interlock — fields absorb onto the OWNING CARD's surface
  //  scoped to the declaring families; verbs mount by id) ──

  /** Register one mod flavor. LOUD: field gates at registration
   *  (the py metaclass's import-time validation); a second flavor
   *  of the same pack must agree in shape (same field names — the
   *  py same-pack merge law; divergence is drift, refuses). */
  registerMod(mod: ModRegistration): void {
    if (mod.families.length === 0) {
      throw new ComposeRefusal('bad-mod', `mod pack '${mod.pack}' declares no families — a mod rides a model`)
    }
    for (const field of mod.fields) validateField(`mod ${mod.pack} (${mod.families.join(',')})`, field)
    for (const prior of this.modRegistrations) {
      if (prior.pack !== mod.pack) continue
      const overlap = prior.families.filter((fam) => mod.families.includes(fam))
      if (overlap.length === 0) continue
      const priorNames = prior.fields.map((f) => f.name).sort().join(',')
      const nowNames = mod.fields.map((f) => f.name).sort().join(',')
      if (priorNames !== nowNames) {
        throw new ComposeRefusal('bad-mod',
          `mod pack '${mod.pack}' has two shapes for [${overlap.join(',')}]: [${priorNames}] vs [${nowNames}] — same-pack flavors must agree`)
      }
    }
    this.modRegistrations.push(mod)
  }

  /** Register one verb. LOUD: the plane law (exactly one engine
   *  arm per engine row) and one registration per verb id (two
   *  classes mounting one id is the py's loud refusal). */
  registerVerb(verb: VerbRegistration): void {
    validateVerb(verb)
    if (this.verbs.has(verb.id)) {
      throw new ComposeRefusal('bad-verb', `verb '${verb.id}' registered twice — one class per verb id`)
    }
    this.verbs.set(verb.id, verb)
  }

  /** THE ABSORPTION (dsl.py _absorb_models, read-side): mod fields
   *  whose declaring families intersect the card's boarded set
   *  join the card surface, scoped to the intersection (a family
   *  filter the emission applies per served model). */
  cardModFields(cardId: string): AbsorbedField[] {
    const def = this.cards.get(cardId)
    if (def === undefined) return []
    const out: AbsorbedField[] = []
    for (const mod of this.modRegistrations) {
      const scope = mod.families.filter((fam) => def.boarded.includes(fam))
      if (scope.length === 0) continue
      for (const field of mod.fields) {
        const existing = out.find((a) => a.field.name === field.name)
        if (existing !== undefined) {
          // same field name from another flavor: the union scope (the
          // py merged same-shape packs by widening the family set)
          const widened = [...new Set([...existing.families, ...scope])]
          out[out.indexOf(existing)] = { field: existing.field, families: widened }
          continue
        }
        out.push({ field, families: scope })
      }
    }
    return out
  }

  /** The mod's catalog rows for one family (lora picks). THE
   *  RUNTIME CATALOG LAW: a flavor with runtimeCatalog and no own
   *  rows serves the UNION of every flavor's declared rows of the
   *  same pack; family rows always win over the union. */
  modRows(pack: string, family: string): readonly LoraRowDecl[] {
    const own = this.modRegistrations.find(
      (m) => m.pack === pack && m.families.includes(family),
    )
    if (own === undefined) return []
    if ((own.rows ?? []).length > 0 || own.runtimeCatalog !== true) return own.rows ?? []
    const union = new Map<string, LoraRowDecl>()
    for (const m of this.modRegistrations) {
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
   *  group labels. Binary types included (NO DROPS — 2026-09-05). */
  formSpec(cardId: string, family: string): Record<string, unknown> | null {
    const def = this.cards.get(cardId)
    if (def === undefined) return null
    const schema = def.schemaCarrier ?? def.schema
    const dict = (schema as { dict?: Record<string, Record<string, unknown>> }).dict
    if (dict === undefined) return null
    const fields: Record<string, unknown>[] = []
    for (const [name, node] of Object.entries(dict)) {
      const meta = (node as { meta?: Record<string, unknown> }).meta ?? {}
      const extra = (meta.extra ?? {}) as Record<string, unknown>
      const fams = extra.families as readonly string[] | undefined
      if (fams !== undefined && !fams.includes(family)) continue
      fields.push({
        name,
        type: wireType(node as Record<string, unknown>),
        label: (meta.description as string) ?? name,
        group: (extra.group as string) ?? '',
        zone: (extra.zone as string) ?? 'params',
        order: fields.length,
        ...(meta.min !== undefined ? { min: meta.min } : {}),
        ...(meta.max !== undefined ? { max: meta.max } : {}),
        ...(meta.default !== undefined && meta.default !== '' ? { default: meta.default } : {}),
        ...(extra.required === true ? { required: true } : {}),
        ...(extra.tooltip !== undefined ? { tooltip: extra.tooltip } : {}),
      })
    }
    // absorbed mod fields (family-scoped) ride AFTER the card's own
    for (const absorbed of this.cardModFields(cardId)) {
      if (!absorbed.families.includes(family)) continue
      const f = absorbed.field
      fields.push({
        name: f.name, type: f.type, label: f.label,
        group: f.group ?? '', zone: f.zone ?? 'params',
        ...(f.order !== undefined ? { order: f.order } : {}),
        ...(f.tooltip !== undefined ? { tooltip: f.tooltip } : {}),
        ...(f.required ? { required: true } : {}),
        ...(f.min !== undefined ? { min: f.min } : {}),
        ...(f.max !== undefined ? { max: f.max } : {}),
        ...(f.step !== undefined ? { step: f.step } : {}),
        ...(f.default !== undefined && f.default !== '' ? { default: f.default } : {}),
        ...(f.options !== undefined ? { options: f.options } : {}),
        ...(f.visible_when !== undefined ? { visible_when: f.visible_when } : {}),
        families: [...absorbed.families],
      })
    }
    // groups: first-seen order, zone from first member, capitalized
    const groups: string[] = []
    for (const f of fields) {
      const g = (f.group as string) ?? ''
      if (!groups.includes(g)) groups.push(g)
    }
    const schemaGroups = groups.map((g, k) => {
      const members = fields.filter((f) => ((f.group as string) ?? '') === g)
      let zone = ''
      for (const m of members) {
        if (m.zone) { zone = m.zone as string; break }
      }
      if (!zone) zone = 'params'
      const memberRows = members.map(({ group: _g, ...rest }) => rest)
      return {
        id: g,
        label: g === '' ? 'Parameters' : (g[0].toUpperCase() + g.slice(1)),
        order: k,
        zone,
        fields: memberRows,
      }
    })
    const flat = fields.map(({ group: _g, ...rest }) => rest)
    return {
      form: cardId,
      service: family,
      fields: flat,
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
      def.compose(merged, { id: '', card: cardId, defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] }, g, runId)
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
