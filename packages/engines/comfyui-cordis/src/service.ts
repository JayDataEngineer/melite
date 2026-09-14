// The ComfyUI service (Tier 3's mount point). One service instance
// per Cordis context; cards register into it, the compose door
// reads from it. The EXTENSION-LAW requires gate rides here: card
// requires resolve against live object_info node sets BEFORE any
// graph is emitted (never an assumed install).
import Schema from '@deepseek-ai/schemastery'
import { Context, Service } from '@deepseek-ai/cordis'
import { GraphBuilder, deriveDefaults } from '@melite/comfyui-card-kit/graph'
import type { PromptGraph, JsonValue } from '@melite/comfyui-card-kit/graph'
import type { FactsFile, ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { ProvisionRow } from './models/families/contract.ts'

/** Loud refusal — the estate's rc=-3 door shape, never a silent default. */
export class ComposeRefusal extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * The wire tool name derived from a card id (hyphens→underscores +
 * "_card"). ONE spelling of the law (M2′ stroke 2, 2026-09-09):
 * the gateway projection (toolProjection) and every card package's
 * in-package tool emission consume this — the derivation is never
 * restated.
 */
export const cardWireName = (id: string): string =>
  id.replace(/-/g, "_") + "_card";

export interface CardDefinition {
  id: string
  /** Stage-row id the compose emits (retired compose.py skeleton=
   *  verbatim, SSOT'd from the py decls; TS owns the truth post-flip
   *  — required on every card, never a fallback). */
  skeleton: string
  /** Boarded model ids (the board gate; unboarded models refuse). */
  boarded: readonly string[]
  /** Retrieval tags (the card-catalog search key, 2026-09-09): the
   *  card DECLARES these — modality + operation words the agent
   *  searches ({image, upscale}) — never derived, never the ring's.
   *  Sibling of boarded, NOT identity prose: identity merges with
   *  the frozen ring, tags are orthogonal and always card-owned. */
  tags?: readonly string[]
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
   *  unset — schema is the carrier. (Ledger row 23, 2026-09-10:
   *  typed as Schema — the field's whole job is carrying .dict;
   *  the old `unknown` forced cast-throughs at every walk site.) */
  schemaCarrier?: Schema
  compose(params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void
  /** Post-serialize pass — the lane's autofill-strip calibration
   *  (stripAutofill / stripEmptyAutofill). Cards whose python
   *  renderer strips must port the table here; parity pins it. */
  finalize?(graph: PromptGraph): PromptGraph
  /** THE IDENTITY RUNG (card DSL phase 2, 2026-09-08 — NATIVE
   *  since 2026-09-10): the py card.py identity (label/description/
   *  genre/icon/ability) died with the authoring plane, and the
   *  frozen ring (engine-comfyui models/cardIdentity.generated.ts)
   *  thinned out as cards absorbed theirs: EVERY card declares its
   *  identity inline now (loadCardDefs refuses a card without one).
   *  icon is the capability-tile glyph; principles are the agent
   *  guidance lines the catalog cards arm serves (empty/absent =
   *  none — most cards carry none). */
  identity?: {
    label: string
    description: string
    genre: string
    icon?: string
    principles?: readonly string[]
  }
  /** Card-owned download rows (the mask-studio precedent): a
   *  card that is a tool, not weights (boarded: []), still needs
   *  weight bytes through the provision door — it declares them
   *  HERE (same row shape as the family DECL provisions). Family
   *  weights stay on the DECL; card tools carry their own. */
  provisions?: ProvisionRow[]
  /** THE UNIVERSAL-SIDEBAR TRIO (the py card.py sidebar_order /
   *  sidebar / sidebar_hidden half, 2026-09-10): the /v1/forms arm
   *  derives its order/plugin/sidebar_key/hidden row from the CARD,
   *  never a frozen export — one card, one row, REQUIRED (a card
   *  with no sidebar declaration is a declaration bug, refused
   *  loud by the discovery door). key is the sidebar section
   *  (the closed SIDEBAR_SECTIONS vocabulary); order is the global
   *  sidebar position (gaps are retired cards — never renumbered);
   *  hidden keeps utility cards off the rail (they still serve). */
  sidebar: {
    key: string
    order: number
    hidden?: boolean
  }
  /** THE STUDIO SURFACE (the py card.py size/layout half): the
   *  form-spec envelope's size/layout derive here — huge cards
   *  render the wide body frame, studio cards the studio frame.
   *  Absent = the plain panel (size null, layout null). */
  surface?: {
    size?: 'huge'
    layout?: 'studio'
  }
  /** THE FLOW-STAGE I/O (the py card.py stage half): the /v1/schema
   *  snapshot's per-card row derives here — the flow kinds the
   *  card consumes/produces plus whether a flow stage running this
   *  card routes a model (REQUIRED, even when false — the sfx
   *  precedent: boarding a family and requiring a stage model are
   *  different declarations). */
  flowKinds: {
    inputs: Record<string, string>
    outputs: Record<string, string>
    requiresModel: boolean
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
      // .dict is present — validateFields above refuses dict-less
      // contracts at this same gate, so the read casts (the ?? {}
      // toll would be an uncoverable arm, never a runtime path).
      const priorNames = Object.keys(prior.fields.dict as Record<string, Record<string, unknown>>).sort().join(',')
      const nowNames = Object.keys(contract.fields.dict as Record<string, Record<string, unknown>>).sort().join(',')
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

  /** The verb registrations (the boot gate's side of the
   *  verb↔boarding interlock — a verb naming a family that never
   *  boarded it is an undeclared mutation). */
  verbRegistrations(): readonly VerbRegistration[] {
    return [...this.verbs.values()]
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
    return this.modCatalog(pack, family).rows
  }

  /** The mod catalog rows plus their provenance (the discovery
   *  door's modifier tooltip: union-served rows carry the shared
   *  suffix, family rows do not). ONE spelling of the runtime
   *  catalog law — modRows rides this. */
  modCatalog(pack: string, family: string): { rows: readonly LoraRowDecl[]; shared: boolean } {
    const own = this.flavors.find(
      (m) => m.pack === pack && m.families.includes(family),
    )
    if (own === undefined) return { rows: [], shared: false }
    if ((own.rows ?? []).length > 0 || own.runtimeCatalog !== true) return { rows: own.rows ?? [], shared: false }
    const union = new Map<string, LoraRowDecl>()
    for (const m of this.flavors) {
      if (m.pack !== pack) continue
      for (const row of m.rows ?? []) union.set(row.id, row)
    }
    return { rows: [...union.values()], shared: true }
  }

  /** The verbs mounted on a card (SubActionMods of its boarded
   *  families — knobs NEVER on the card surface). */
  cardVerbs(cardId: string): VerbRegistration[] {
    const def = this.cards.get(cardId)
    if (def === undefined) return []
    return [...this.verbs.values()].filter((v) => v.families.some((fam) => def.boarded.includes(fam)))
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
  formSchemas(cardId: string, family: string): { schema: unknown, mods: Record<string, unknown> } | null {
    const def = this.cards.get(cardId)
    if (def === undefined) return null
    const carrier = (def.schemaCarrier ?? def.schema) as { toJSON?: () => unknown }
    const schema = typeof carrier.toJSON === 'function' ? carrier.toJSON() : null
    const mods: Record<string, unknown> = {}
    for (const absorbed of this.cardModFields(cardId)) {
      if (!absorbed.families.includes(family)) continue
      const c = absorbed.fields as { toJSON?: () => unknown }
      mods[absorbed.pack] = typeof c.toJSON === 'function' ? c.toJSON() : null
    }
    return { schema, mods }
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

  /** THE PACK PRESENCE READ (the no-silent-drop law's extension
   *  half, hour 26 stroke 18): the EXTENSION-LAW gate's own check as
   *  a READ for the serving surfaces (the spec's packs block, the
   *  load bundle's pack hints). Same semantics, one spelling — a
   *  pack is present when at least one of its declared node types
   *  (facts.extension_node_types) is live on the engine; a pack with
   *  NO declared node types, or engine facts not loaded, is UNKNOWN
   *  (null — the gate cannot see it either; never a guessed mark). */
  packPresence(
    packs: readonly string[],
  ): Array<{ id: string; present: boolean | null }> {
    if (this.objectInfoNodes === null) {
      return packs.map((id) => ({ id, present: null }))
    }
    const extMap = this.facts?.extension_node_types ?? {}
    const nodes = this.objectInfoNodes
    return packs.map((id) => {
      const expected = extMap[id] ?? []
      if (expected.length === 0) return { id, present: null }
      const found = expected.filter((n) => nodes.has(n))
      return { id, present: found.length > 0 }
    })
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
    if (!model) throw new ComposeRefusal('no-model-facts', `model '${modelId}' has no facts row (rows assemble in facts.ts from the registry roster + card slices in packages/engines/comfyui/data/model-facts.json)`)
    if (model.card !== cardId) throw new ComposeRefusal('card-mismatch', `model '${modelId}' facts name card '${model.card}', not '${cardId}'`)

    // THE ONE param cascade (stroke 34 — the card-recipe layer is
    // DEAD, recipes are family macros now): schema defaults ←
    // model-folder defaults (the family rail feeds through HERE —
    // rail selection resolves this model row; arrays never ride) ←
    // explicit params. The merge below IS the whole law.
    let merged: Record<string, unknown>
    try {
      merged = def.schema(params)
    } catch (e) {
      throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${(e as Error).message}`)
    }
    merged = { ...merged, ...Object.fromEntries(Object.entries(model.defaults).filter(([, v]) => v !== null && !Array.isArray(v))), ...((params ?? {}) as Record<string, unknown>) }

    // LORA WIRE RESOLUTION (2026-09-10 — the id/name split): the UI
    // boundary emits id-keyed rows ({id, strength} — LoRAEntry, the
    // ONE wire shape since the 2026-09-06 flip); the kit consumes
    // filenames ({name, strength}). The 09-06 flip moved the UI but
    // never the engine consumer — fireLoras read .name off id-keyed
    // rows (undefined) and every LoRA run silently stacked nothing.
    // Resolved HERE — the service owns the flavors via modCatalog —
    // filename-shaped rows (card-authored recipe payloads) pass
    // through; unknown ids refuse LOUD, never a silent plain run.
    if (Array.isArray(merged.loras)) {
      const cat = this.modCatalog('loras', modelId)
      merged.loras = (merged.loras as Array<Record<string, unknown>>).map((e) => {
        // strength first (the UI bag's wire shape); hand-authored
        // JSON rows may carry `weight` — honor it, never stack a
        // declared weight at silent full strength.
        const strength = typeof e?.strength === 'number' ? (e.strength as number)
          : typeof e?.weight === 'number' ? (e.weight as number) : 1.0
        if (typeof e?.name === 'string' && (e.name as string) !== '') return { name: e.name as string, strength }
        const id = typeof e?.id === 'string' ? (e.id as string) : ''
        const row = cat.rows.find((r) => r.id === id)
        if (row === undefined) {
          throw new ComposeRefusal('unknown-lora', `card '${cardId}' names lora id '${id}' with no '${modelId}' flavor row (registered: ${cat.rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`)
        }
        return { name: row.filename, strength }
      })
    }

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
