// The ComfyUI service (Tier 3's mount point). One service instance
// per Cordis context; cards register into it, the compose door
// reads from it. The EXTENSION-LAW requires gate rides here: card
// requires resolve against live object_info node sets BEFORE any
// graph is emitted (never an assumed install).
import Schema from '@deepseek-ai/schemastery'
import { validateDeclaredMods } from './mods-schema.ts'
import { Context, Service } from '@deepseek-ai/cordis'
import { GraphBuilder, deriveDefaults } from '@melite/comfyui-card-kit/graph'
import type { PromptGraph, JsonValue } from '@melite/comfyui-card-kit/graph'
import { assertControlNetSchedule } from '@melite/comfyui-card-kit/guard'
import type { FactsFile, ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { ProvisionRow } from './models/families/contract.ts'
import { validateFields, validateVerb, resolveControlNetEntry } from "./serviceMods.ts";
import { unwalkedParams, declaredDefaults as declaredDefaultsFor } from "./no-cheat.ts";
// the mod/verb plane re-exports through the service door (one surface)
export { resolveControlNetEntry } from "./serviceMods.ts";
import type { ModFields } from "./serviceMods.ts";
import type { LoraRowDecl } from "./serviceMods.ts";
import type { AbsorbedMod } from "./serviceMods.ts";
import type { VerbRegistration } from "./serviceMods.ts";
import type { FlavorRegistration } from "./serviceMods.ts";
import type { PackContract } from "./serviceMods.ts";

/** Loud refusal — the estate's rc=-3 door shape, never a silent default. */
export class ComposeRefusal extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** THE NO-CHEAT DOOR (2026-09-20, the operator's order: "you edit
 *  the shared library to always walk every single parameter no
 *  matter what — that way you can't cheat"): after the full cascade,
 *  every knob DECLARED with a non-null default must hold a non-null
 *  value in the merged doc. A declared default the walk drops (the
 *  union-null arm, the buried inner default, the family-literal
 *  resolution path) is a broken card, refused loud by name — the
 *  renderer's silent `??` floors are outlawed, not trusted. Knobs
 *  declared without a default keep their own lawful optionality.
 *  Card-agnostic: both compose paths, every card, no opt-out. */
function assertNoCheat(cardId: string, def: Pick<CardDefinition, 'schema' | 'schemaCarrier' | 'boarded'>, merged: Record<string, unknown>, rawParams?: unknown): void {
  const carrier = (def.schemaCarrier ?? def.schema) as unknown as import('./params-emit.ts').Schema
  // THE NO-SILENT-REPAIR ARM: schemastery's walk quietly resolves an
  // explicit user null to the declared default — a repair the user
  // never sees. The door refuses the null BEFORE the walk can hide
  // it: send a real value or omit the key, never null-on-a-default.
  const raw = (rawParams ?? {}) as Record<string, unknown>
  const declared = declaredDefaultsFor(carrier, def.boarded)
  const nulled = Object.keys(declared).filter((k) => Object.prototype.hasOwnProperty.call(raw, k) && raw[k] === null)
  if (nulled.length > 0) {
    throw new ComposeRefusal('nulled-param', `card '${cardId}' refused params: ${nulled.map((k) => `'${k}' is null but its declaration carries a default (${JSON.stringify(declared[k])}) — send a real value or omit the key, never null`).join(', ')}`)
  }
  const offenders = unwalkedParams(carrier, def.boarded, merged)
  if (offenders.length > 0) {
    const rows = offenders.map((o) => `'${o.name}' (declared default ${JSON.stringify(o.declared)}, walked ${o.walked === undefined ? 'absent' : 'null'})`).join(', ')
    throw new ComposeRefusal('unwalked-param', `card '${cardId}' declared defaults the walk did not deliver: ${rows} — the card's schema is broken; fix the declaration, never the renderer`)
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

/** One card-declared modifier kind (the declarer face of the served
 *  ModifierKind — structural, the JSON wire shape). `entry` follows
 *  the served vocabulary: 'option' | 'hybrid' | undefined = field. */
export interface DeclaredModifierKind {
  kind: string
  label: string
  param_key: string
  entry?: string
  option_key?: string
  scalar_key?: string
  cardinality: string
  max_stack?: number
  fields?: readonly Record<string, unknown>[]
  kindFields?: readonly Record<string, unknown>[]
  options?: readonly Record<string, unknown>[]
  /** THE CATEGORY (the mods-abstraction law, stroke 78):
   *  'standalone' = every entry applies to the SAME base image and
   *  provides its OWN output (sam2/sam3 mask sources — order is
   *  semantically void); 'ordered' (default, the stacking law every
   *  pack kind follows — loras/controlnet) = entries STACK in array
   *  order, each receiving the previous outputs, modifying the
   *  model call — no independent inference. Served verbatim; the
   *  section renders the drag stack ONLY on ordered kinds. */
  category?: 'standalone' | 'ordered'
  /** THE LEAF FACE (paint-leaf-canvas.md): 'paint-canvas' = the
   *  kind's payload field offers the brush verb beside the square
   *  (the modal arrives from the host; absent host degrades to the
   *  three-source square — the payload PNG is the contract either
   *  way). 'bbox-canvas' (stroke 78) = the entry's bbox_x/y/w/h
   *  fields offer the rectangle verb — an image preview the user
   *  drags a selection on (absent host degrades to the four number
   *  inputs). Served verbatim like every declared row. */
  leaf_face?: 'paint-canvas' | 'bbox-canvas'
}

export interface CardDefinition {
  id: string
  /** Stage-row id the compose emits (retired compose.skeleton=
   *  verbatim, SSOT'd from the decls; TS owns the truth post-flip
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
  /** Admission extras (the class-attr `admits` half): params the
   *  compose door admits BEYOND the schema knobs (route stamps,
   *  renderer vocab, studio writes flattened at port time). Most
   *  cards carry none — the schema IS the surface. */
  admits?: readonly string[]
  /** $spell-eligible params (the `spell_params` half): file slots
   *  whose "$name" values pool for two-card-flow handoff instead of
   *  composing. Empty/absent = no spell pooling. */
  spells?: readonly string[]
  /** Extension packs the card's renderers ride (EXTENSION LAW). */
  requires?: readonly string[]
  /** Per-family extension packs — the requires_by_family declaration.
   *  (2026-09-08: declared on the base interface — the compose door
   *  below already read it; tagger.ts / img-to-mesh.ts module
   *  augmentations merge the identical shape. Type-level only.) */
  requiresByFamily?: Record<string, readonly string[]>
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
    historyStrip?: boolean
    figure?: { identityModel: string }
    /** the OPTIONAL BOTTOM SEAM (the form-seams stroke 2026-09-17):
     *  claim a scrub timeline along the shell's bottom slot, wired
     *  to the video preview's shared player. Video-output cards. */
    timeline?: boolean
  }
  /** Card-declared modifier kinds (the MODs generalization, stroke
   *  63 — docs/design/mods-contracts.md CONTRACT A): action kinds
   *  the CARD owns (MASK's mask sources), served through the ONE
   *  features.modifiers channel beside the family-DECL pack kinds.
   *  fields/kindFields are the served spec rows (the JSON wire
   *  shape SpecField projects); options carry static catalog rows —
   *  the card IS the catalog for its action kinds. Served VERBATIM
   *  by specModifiers; the leaf never learns the declarer. */
  mods?: readonly DeclaredModifierKind[]
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
   *  (stripAutofill / stripEmptyAutofill). Cards whose renderer
   *  strips port the table here. */
  finalize?(graph: PromptGraph): PromptGraph
  /** THE IDENTITY RUNG — NATIVE (since 2026-09-10; the frozen ring
   *  DELETED 2026-09-18): EVERY card declares its identity inline
   *  (loadCardDefs refuses a card without one).
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
    key: string
    order: number
    hidden?: boolean
  }
  /** THE STUDIO SURFACE (the size/layout half): the
   *  form-spec envelope's size/layout derive here — huge cards
   *  render the wide body frame, studio cards the studio frame.
   *  Absent = the plain panel (size null, layout null). */
  surface?: {
    size?: 'huge'
    layout?: 'studio'
  }
  /** THE FLOW-STAGE I/O (the stage half): the /v1/schema
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

export class ComfyUIService extends Service {
  private readonly cards = new Map<string, CardDefinition>()
  private readonly packs = new Map<string, PackContract>()
  private readonly flavors: FlavorRegistration[] = []
  private readonly verbs = new Map<string, VerbRegistration>()
  private facts: FactsFile | null = null
  /** Live object_info node names — set before compose to arm the gate. */
  private objectInfoNodes: Set<string> | null = null
  /** Autofill defaults map (class → input → default), derived
   *  from the live node-definitions doc — comfy-script behavior. */
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
    // THE DECLARED MOD-KIND SCHEMA GATE (hour 16): the card's mods
    // rows answer to a schemastery master here — the third mod
    // door's validation (packs and flavors already gated; the card's
    // own declared kinds rode unvalidated until now).
    validateDeclaredMods(def.id, def.mods);
    this.cards.set(def.id, def)
    return () => { this.cards.delete(def.id) }
  }

  // ── THE MOD/VERB REGISTRATION (dsl.py port: the Model.mods
  //  interlock — fields absorb onto the OWNING CARD's surface
  //  scoped to the declaring families; verbs mount by id) ──

  /** Register one PACK CONTRACT — the category (the Mod parent).
   *  LOUD: field gates at registration (the metaclass's
   *  import-time validation); ONE SHAPE per pack name (a second
   *  contract for the same pack with different fields is drift
   *  one declaration per name means one shape per name). */
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

  /** Register one FLAVOR — a family's boarding of a pack (the
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
   *  classes mounting one id is the's loud refusal). */
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

  /** THE ABSORPTION (dsl._absorb_models, read-side): for every
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
    const matching = this.flavors.filter(
      (m) => m.pack === pack && m.families.includes(family),
    )
    if (matching.length === 0) return { rows: [], shared: false }
    // THE FLAVOR MERGE (#39, the hotload seam): several flavors may
    // board the same (pack, family) — the family's own table plus
    // hot-root rows — and they MERGE (id-keyed, registration order,
    // first wins). Before, find() took the first match and a later
    // flavor was invisible; one flavor serves exactly as before.
    const merged: LoraRowDecl[] = []
    const seen = new Set<string>()
    let runtime = false
    for (const m of matching) {
      if (m.runtimeCatalog === true) runtime = true
      for (const row of m.rows ?? []) {
        if (!seen.has(row.id)) {
          seen.add(row.id)
          merged.push(row)
        }
      }
    }
    if (merged.length > 0 || runtime !== true) return { rows: merged, shared: false }
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
      assertNoCheat(cardId, def, merged, params)
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
    assertNoCheat(cardId, def, merged, params)

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
        // declared weight at silent full strength. An UNSTATED
        // strength defers to the flavor row's own default_strength
        // when the id resolves one (the GPU receipt finding,
        // 2026-09-18: krea-2's strength-less realism recipe promised
        // the row's 0.7 in its hint while this seed stacked 1.0 —
        // the row's declared default is the family's truth, the
        // same law the controlnet seed serves); filename rows and
        // default-less flavor rows keep full strength.
        const stated = typeof e?.strength === 'number' ? (e.strength as number)
          : typeof e?.weight === 'number' ? (e.weight as number) : undefined
        // steps applied (2026-09-18): a distill adapter's step count
        // rides the entry when stated — the row's catalog default
        // seeds it, the sampler honors it when the caller pins
        // nothing. Unstated stays unstated (a non-distill lora has
        // no count to claim).
        const steps = typeof e?.steps === 'number' && Number.isFinite(e.steps) ? e.steps : undefined
        if (typeof e?.name === 'string' && (e.name as string) !== '') {
          const strength = stated ?? 1.0
          return steps === undefined ? { name: e.name as string, strength } : { name: e.name as string, strength, steps }
        }
        const id = typeof e?.id === 'string' ? (e.id as string) : ''
        const row = cat.rows.find((r) => r.id === id)
        if (row === undefined) {
          throw new ComposeRefusal('unknown-lora', `card '${cardId}' names lora id '${id}' with no '${modelId}' flavor row (registered: ${cat.rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`)
        }
        const resolved = row.steps === undefined ? steps : (steps ?? row.steps)
        const strength = stated ?? row.default_strength ?? 1.0
        return resolved === undefined ? { name: row.filename, strength } : { name: row.filename, strength, steps: resolved }
      })
    }

    // ── THE T3 REFINE RIDER RESOLUTION (roadmap item 2) — the
    // SAME law as the loras bag above: refine_lora is a catalog
    // id resolved against the SAME served rows (never a
    // hand-spelled filename); unknown ids refuse LOUD. Strength
    // and steps default from the ROW (the row is the family's
    // truth — taomate: 0.7 @ 3); explicit refine_strength /
    // refine_steps override. A row that declares no step count
    // AND no explicit refine_steps REFUSES — the closing pass
    // needs a count, and none is invented silently. The resolved
    // row rides params as `refine` (compose mounts the second
    // sampler only when it is present; absent = the window cache
    // keys stay untouched — existing films keep their hits).
    const refineId = typeof merged.refine_lora === 'string' && (merged.refine_lora as string) !== ''
      ? merged.refine_lora as string : undefined
    if (refineId !== undefined) {
      const refineCat = this.modCatalog('loras', modelId)
      const row = refineCat.rows.find((r) => r.id === refineId)
      if (row === undefined) {
        throw new ComposeRefusal('unknown-refine-lora', `card '${cardId}' names refine_lora '${refineId}' with no '${modelId}' flavor row (registered: ${refineCat.rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`)
      }
      const statedStrength = typeof merged.refine_strength === 'number' ? merged.refine_strength as number : undefined
      const statedSteps = typeof merged.refine_steps === 'number' ? merged.refine_steps as number : undefined
      const steps = statedSteps ?? row.steps
      if (steps === undefined) {
        throw new ComposeRefusal('refine-steps', `refine_lora '${refineId}' declares no step count and refine_steps is unset — the closing pass needs a count (pin refine_steps or pick a row that declares one)`)
      }
      merged.refine = { name: row.filename, strength: statedStrength ?? row.default_strength ?? 1.0, steps }
    } else {
      delete merged.refine
    }

    // CONTROLNET WIRE RESOLUTION (the z-image restoration — the
    // type/model split, the LoRA law above): the leaf emits
    // catalog-keyed rows ({type, strength, ...} — model + preprocessor
    // stamped from the served option); run records carry the retired
    // shape (model, preprocessor, image_b64/artifact, step range,
    // enabled, source). Both normalize to the lane's resolved row
    // (artifact already won over image_b64 here — the retired
    // precedence); unknown types refuse LOUD, never a silent plain
    // run.
    if (Array.isArray(merged.controlnets)) {
      const cat = this.modCatalog('controlnet', modelId)
      merged.controlnets = (merged.controlnets as Array<Record<string, unknown>>).map((e) =>
        resolveControlNetEntry(e, cat.rows, cardId, modelId))
    }

    // EXTENSION LAW gate: family slice wins when present (the
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
