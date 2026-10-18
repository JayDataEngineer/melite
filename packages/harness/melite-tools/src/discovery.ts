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
import { laneContractOf as sharedLaneContractOf } from '@melite/contracts/laneRelations'
import {
  buildCatalog,
  CARD_KINDS,
  emitParamsSchema,
  enhanceRecipeFor,
  getModel,
  isServedFamily,
  liveScanOrder,
  modelsBooted,
  owningAtom,
  registryModel,
  loadCardDefs,
  modelIds,
  theService,
  emitModifierKinds,
  declaredDefaults,
} from '@melite/comfyui-cordis'
import type { ComfyUIService } from '@melite/comfyui-cordis'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import type { DeclaredModifierKind } from '@melite/comfyui-card-kit/params-emit'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { deriveVariants, type MatrixVariant } from '@melite/comfyui-card-kit/facts'
import { agentFormDoc } from '@melite/engine-agent'
import type { ExtraBag } from '@melite/contracts/extraKeys'
import { faceStamp } from './faceStamp.ts'
import type {
  FormSpecDoc,
  ModifierKind,
  SchemaEnvelope,
  ModifierOption,
  SpecField,
  FormVariantRow,
} from '@melite/contracts/formSpec'

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
   *  keys (?model=tts serves the default family's envelope).
   *  UNDEFINED for a card that boards no models (the minted-model
   *  kill, 2026-10-12): resolving model-less cards to their own id
   *  minted `model: 'mask'`, the client sent the phantom seat, and
   *  the run door refused the card's own id against an empty board
   *  — a model-less card serves NO model seat, it never names one. */
  model: string | undefined
}

export function resolveSpecKey(
  key: string,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
): SpecResolution | null {
  const def = defs.get(key)
  if (def !== undefined && !isFamilyKey(key)) {
    // A card-id alias key (?model=tts): the card's envelope for its
    // default family (boarded[0] ?? the card itself — rig and mask
    // board nothing and ARE their own service). A card boarding
    // nothing resolves WITHOUT a model (the minted-model kill,
    // 2026-10-12): the alias names the card, never a model seat.
    const boardedFams = def.boarded ?? []
    const service = boardedFams.length > 0 ? boardedFams[0] : key
    return { card: key, service, model: boardedFams.length > 0 ? service : undefined }
  }
  let decl: ModelDecl
  try {
    decl = getModel(key)
  } catch (e) {
    // THE CENSUS ARM SPLIT (2026-10-13 — the old comment's claim was
    // the reverted fix's residue: the door never asked the seat, so
    // an unbooted table routed every model through the 404): two
    // throws land here, and they are NOT one answer. A booted
    // table's unknown name is this arm's null (404). An unbooted
    // table's throw is the TABLE's own refusal — the family arm
    // alone may speak it, so it rides to the door verbatim (the
    // seat's words, never a hand-copied message).
    if (!modelsBooted()) throw e
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
      /* an unbootable family DECL — it can never serve this key; the walk continues to the next candidate */
      continue
    }
    if (declRoutes(fdecl).has(key)) return { card, service: fam, model: key }
  }
  return null
}

/** The TOOL arm's resolution (melite_flow's card question): the
 *  card census with the family fallback, SILENT on an unbooted
 *  models table. The tool's own census is the CARD table
 *  (loadCardDefs — always booted by the time it asks), and the
 *  live estate boots the models seat before tools serve, so an
 *  unbooted table here is a cold test process's state: the tool
 *  keeps its own refusal voice, never the table's. Only the
 *  form-spec family arm (resolveSpecKey itself) may speak the
 *  table's voice.
 *
 * @param key the tool's card or family id.
 * @param defs the booted card definitions.
 * @param boarded family id → owning card id.
 * @returns the resolution, or null when neither census answers. */
export function resolveSpecKeyForTool(
  key: string,
  defs: Map<string, CardDefinition>,
  boarded: Map<string, string>,
): SpecResolution | null {
  try {
    return resolveSpecKey(key, defs, boarded)
  } catch (e: unknown) {
    if (!modelsBooted()) return null
    throw e
  }
}

/** A key is a family key when a DECL names it (routes and owners
 *  alike); otherwise a defs hit is a card-id alias. */
function isFamilyKey(key: string): boolean {  try {
    getModel(key)
    return true
  } catch {
    /* an unbootable id is the negative answer — the probe IS the predicate */
    return false
  }
}

// ── form-spec bodies ──────────────────────────────────────────────

/** One DECL variant's wire row (the editor Variant contract: all ten
 *  keys, always — null/"" for absent, never a missing key). Takes the
 *  ONE-WALK matrix row (facts.ts deriveVariants) — the served spec
 *  projects the same walk the door's facts row projects, never a
 *  second walk of the DECL (the axis-unification cure, 2026-11-06:
 *  the seats' separate walks drifted, and the served spec starved
 *  anima's cells while the facts row carried them). */
function variantRow(
  v: MatrixVariant,
  declEngine: string,
): FormVariantRow {
  return {
    id: v.id,
    label: v.label,
    group: v.group,
    // THE MACRO PAYLOAD (stroke 34): the served defaults are the
    // row's FULL stamp — resolver knobs + wire payloads (the
    // realism row's lora stack). The client's pick verb writes
    // exactly this onto the user layer: what a family row stamps is
    // what the run composes, declared keys only.
    defaults: { ...v.resolver_defaults, ...(v.wire_defaults ?? {}) },
    route: v.route,
    hint: v.hint ?? null,
    engine: v.engine ?? declEngine,
    // THE VARIANT'S OWN SAMPLER DOMAIN (2026-10-10, the DECL
    // audit's row 3): the DECL declares the envelope (turbo lives
    // in [4,8] steps / [1,2] cfg) and the bench judges it — a face
    // that drops it leaves the composing agent to guess the domain
    // and learn the refusal by hitting it. Null for absent, the
    // row's own law.
    sampler_envelope: v.sampler_envelope ?? null,
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

/** THE LANE CONTRACT SERVE (2026-10-10, the fix shape 2+4): the
 *  family's declared surface + relation words, verbatim, for the
 *  form plane — the client resolves (family base ∪ variant
 *  additions) with laneSurfaceOf and judges with
 *  judgeLaneRelations, the same calls the bench-write door uses.
 *  Served ONLY when the family declares a base surface (the
 *  spread at the call site gates it). */
/** The key family's variants + its offered quant cells — THE SERVED
 *  PROJECTION OF THE ONE WALK (facts.ts deriveVariants). A cell
 *  serves the envelope iff its route is addressable at the key: a
 *  ROUTE key scopes to its own lane (cells addressed at the key or
 *  the owning family); a served FAMILY key (key === service) serves
 *  its OWN DECL's cells ALWAYS — the boarded[0] gate may scope only
 *  foreign lanes, never starve (the anima burn cure, 2026-11-06: the
 *  old `primary` form dropped EVERY cell of a non-first-boarded
 *  family — image-gen boards krea-2 first, so the served anima spec
 *  carried zero Quant rows while the DECL declared two, and the
 *  mirror refused with a voice that blamed the DECL). A routeless
 *  cell serves its own family's row — the variant row IS its lane
 *  (the D4 pool-parity cure, 2026-10-17); routed cells serve by
 *  addressability. Variant rows serve whole
 *  (all ten keys, always) regardless of route. Exported as the one
 *  serializer the walls ride (the switching sweep; the sync wall's
 *  P2 face is formSpecArm, this door's own body). */
export function specVariants(
  decl: ModelDecl,
  key: string,
  service: string,
): FormVariantRow[] {
  const rows: FormVariantRow[] = []
  const seen = new Set<string>()
  const declEngine = decl.engine ?? ''
  const matrix = deriveVariants(decl)
  for (const v of matrix) {
    if (v.hide_from_dropdown === true) continue
    rows.push(variantRow(v, declEngine))
    seen.add(v.id)
    for (const c of v.cells) {
      if (c.hide_from_dropdown === true) continue
      if (!c.quant) {
        // THE BIRTH WALL (2026-09-29, the second live break): a
        // Quant cell without its quant coordinate is an ILLEGAL ROW.
        // The DECL validator refuses it upstream; if one ever
        // reaches here the expander REFUSES LOUD — never silently
        // skips (a skipped cell is a hidden vocabulary hole, and a
        // stamped composite id is the live break the door caught).
        throw new Error(
          `${decl.id}/${v.id}: a cell needs a quant (refused at the spec's birth — an axis row without its coordinate must never serve)`,
        )
      }
      // THE ROUTELESS CELL'S OWN LANE (the D4 pool-parity cure,
      // 2026-10-17 — the integrator's ruling on the pool-parity
      // finding): a cell without a route has no lane address — the
      // variant row IS its lane (the pixal3d 1024 precedent) — so it
      // serves the family's own row (key === service) and never a
      // foreign route lane's. Routed cells keep the burn cure's
      // addressability filter below. One law, two shapes.
      if (!c.route) {
        if (key !== service) continue
      } else if (key !== service && c.route !== key && c.route !== service) {
        continue
      }
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
  // THE HEAD CLAIM (fold law + plane canon L1, 2026-11-02): the
  // family id is an address even when no row routes it — the
  // engine's auto-head claim serves the default lane (the first
  // variant with cells) at the models table (service.ts
  // registerFamily: the head's own route is the model id itself).
  // The rail serves the SAME address set the table resolves: a
  // migration address old drafts name must ride the served doc,
  // never table-only. The row is an ALIAS, not a lane — it stamps
  // nothing (empty defaults; the lane is already the lane) and
  // carries the lane's own label/hint. The resolving rule mirrors
  // the engine's (first variant with cells, else the first row) —
  // the engine owns the rule; this is its served-face projection.
  const routed = new Set<string>()
  for (const v of matrix) {
    if (v.route) routed.add(v.route)
    for (const c of v.cells) {
      if (c.route) routed.add(c.route)
    }
  }
  if (!routed.has(decl.id)) {
    const resolving = matrix.find((v) => v.cells.length > 0) ?? matrix[0]
    if (resolving !== undefined && resolving.hide_from_dropdown !== true) {
      // resolving is non-hidden (the guard above), and every non-hidden
      // variant's id joined `seen` in the row loop — the plain-id arm
      // is dead by control flow; the head row is always the alias.
      const id = `${resolving.id}__head`
      rows.push({
        id,
        label: resolving.label,
        group: 'Variant',
        defaults: {},
        route: decl.id,
        hint: resolving.hint ?? null,
        engine: resolving.engine ?? declEngine,
        sampler_envelope: resolving.sampler_envelope ?? null,
        quant: null,
        vram_peak_gb: null,
        owner: '',
      })
    }
  }
  return rows
}

/** The variant-group contract from the DECL's groups. */
function groupContract(decl: ModelDecl | null): Record<string, { label?: string; tooltip?: string; filters_on?: string | null; default?: string }> {
  const out: Record<string, { label?: string; tooltip?: string; filters_on?: string | null; default?: string }> = {}
  for (const g of decl?.variant_groups ?? []) {
    const entry: { label?: string; tooltip?: string; filters_on?: string | null; default?: string } = { label: g.label }
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
/** THE ENVELOPE PREDICATE (schema-strictness fix 5, 2026-10-01):
 *  the serialized schemastery envelope arrives from the ENGINE plane
 *  as `unknown` (its toJSON), and the served contract types it.
 *  The envelope's two facts are checked here; the ref table's per-node
 *  facts ride the client's walker and the client's own wtype gate. */
function isSchemaEnvelope(e: unknown): e is SchemaEnvelope {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return false
  const env = e as { uid?: unknown; refs?: unknown }
  return typeof env.uid === 'number' && typeof env.refs === 'object' && env.refs !== null && !Array.isArray(env.refs)
}

/** The engine's own form doc (the engine-doc arm) narrowed to the
 *  served contract — same predicate, the form's own name checked. */
/** One envelope off the engine's formSchemas — a malformed
 *  envelope refuses (the served contract is never a lie). */
function servedEnvelope(e: unknown, card: string): SchemaEnvelope | null {
  if (e === null || e === undefined) return null
  if (!isSchemaEnvelope(e)) {
    throw new Error(`form-spec: card '${card}' serialized a malformed schema envelope (uid number + refs object)`)
  }
  return e
}

/** The absorbed mod envelopes, keyed by pack (the same check, per
 *  pack). */
function servedModEnvelopes(mods: Record<string, unknown>, card: string): Record<string, SchemaEnvelope | null> {
  const out: Record<string, SchemaEnvelope | null> = {}
  for (const [pack, env] of Object.entries(mods)) out[pack] = servedEnvelope(env, card)
  return out
}

function isFormSpecDoc(e: unknown): e is FormSpecDoc {
  // No object/null guard: the only caller hands a value from the
  // engineDocs factory seam, statically () => Record<string,
  // unknown> (typed same-process boundary — typeof-object is what
  // that interface states). Shape stays checked below.
  const doc = e as { form?: unknown; schema?: unknown }
  if (typeof doc.form !== 'string') return false
  if (doc.schema !== null && doc.schema !== undefined && !isSchemaEnvelope(doc.schema)) return false
  return true
}

/** THE SERVED-KIND NARROW (schema-strictness fix 5, 2026-10-01):
 *  the card-declared kind rows arrive from the ENGINE plane as loose
 *  records (the engine cannot name card-base's field rows), and the
 *  served contract types them. The three required keys are checked
 *  here, at the serve boundary — a malformed row refuses instead of
 *  riding as `Record<string, unknown>`. */
function servedFields(
  rows: readonly Record<string, unknown>[] | undefined,
  where: string,
): readonly SpecField[] | undefined {
  if (rows === undefined) return undefined
  return rows.map((row, i) => {
    const name = row['name']
    const label = row['label']
    const type = row['type']
    if (typeof name !== 'string' || typeof label !== 'string' || typeof type !== 'string') {
      throw new Error(
        `form-spec: ${where} field ${i} must carry string name/label/type — ${JSON.stringify(row).slice(0, 120)}`,
      )
    }
    return { ...row, name, label, type }
  })
}

/** The pick-option narrow (the served kind's option rows: value +
 *  label are the two the leaf renders). */
function servedOptions(
  rows: readonly Record<string, unknown>[] | undefined,
  where: string,
): readonly ModifierOption[] | undefined {
  if (rows === undefined) return undefined
  return rows.map((row, i) => {
    const value = row['value']
    const label = row['label']
    if (typeof value !== 'string' || typeof label !== 'string') {
      throw new Error(
        `form-spec: ${where} option ${i} must carry string value/label — ${JSON.stringify(row).slice(0, 120)}`,
      )
    }
    return { ...row, value, label }
  })
}

function specModifiers(
  svc: ComfyUIService,
  card: string,
  key: string,
  decl: ModelDecl | null,
  def: CardDefinition | undefined,
  enveloped: ReadonlySet<string>,
): ModifierKind[] {
  const out: ModifierKind[] = []
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
    const entry: ModifierKind = {
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
  // CARD-DECLARED KINDS (CONTRACT A): the card's own action kinds
  // ride the SAME channel,
  // VERBATIM (fields/kindFields/options are the served rows — the
  // card IS the catalog; no mod_schemas envelope derives them, the
  // entry IS the schema). Validated LOUD at serve: a malformed kind
  // refuses the whole form-spec (never a silently half-rendered
  // mod row).
  for (const k of def?.mods ?? []) {
    if (typeof k.kind !== 'string' || k.kind === '' || typeof k.label !== 'string' || k.label === '' || typeof k.param_key !== 'string' || k.param_key === '' || typeof k.cardinality !== 'string' || k.cardinality === '') {
      throw new Error(`form-spec: card '${card}' declares a malformed mod kind (kind/label/param_key/cardinality required) — ${JSON.stringify(k).slice(0, 120)}`)
    }
    const entry: ModifierKind = {
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
    const servedFieldsRow = servedFields(k.fields, `mod kind ${k.kind}`)
    if (servedFieldsRow !== undefined) entry.fields = servedFieldsRow
    const servedKindFields = servedFields(k.kindFields, `mod kind ${k.kind} kindFields`)
    if (servedKindFields !== undefined) entry.kindFields = servedKindFields
    const servedOptionsRow = servedOptions(k.options, `mod kind ${k.kind}`)
    if (servedOptionsRow !== undefined) entry.options = servedOptionsRow
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
    // the kind's bag is non-empty. `requires` is `readonly string[]`
    // on the card's own declaration, so the served kind carries it
    // as declared (the re-audit, 2026-10-16).
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
 * never a variant route — but that was PRE-FOLD law: THE QWEN
 * FOLD (2026-10-26) made Base a CELL ROUTE under the one qwen3-tts
 * family (F6 audit 2026-10-12-audit-display-fold — the header
 * taught the dead two-family world while the fold code below served
 * one); a route address reaching here faces the COMPOSED view label,
 * and DISPLAY surfaces fold it to its owning atom before it ever
 * renders (owningAtom, the 645e77e0b law). */
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

/** THE CATALOG-FED SELECT STAMP (2026-09-21; referent-checked
 * 2026-10-12): walks the envelope's root dict; any field whose node
 * declares extra.optionsFrom gets its options stamped from the named
 * mod pack's LIVE catalog rows for this family (value = row id,
 * label = row id). The empty arm rides first when the field's default
 * is '' so a pick can clear. @param boardedPacks — the packs the
 * envelope's mods table boards (the sweep's Object.keys(schemas.mods)
 * set); a field naming a pack outside it THROWS the form-spec refusal —
 * the provider's empty-rows return never degrades to an unexplained
 * empty select. Mutates the freshly-toJSON'd envelope in place —
 * formSchemas serializes per call, so no shared carrier is touched. */
interface StampNode {
  dict?: Record<string, unknown>
  // THE ONE VOCABULARY: the bag's shape owns the floor contract
  // (@melite/contracts/extraKeys) — optionsFrom reads and options
  // writes spell the same keys every other face spells.
  meta?: { default?: unknown; extra?: Partial<ExtraBag> & Record<string, unknown> }
}
interface StampEnv {
  uid?: number | string
  refs?: Record<string, StampNode>
}
export function stampOptionsFrom(
  schema: unknown,
  svc: { modCatalog(pack: string, family: string): { rows: ReadonlyArray<{ id: string }> } },
  family: string,
  boardedPacks: ReadonlySet<string>,
): void {
  const env = schema as StampEnv | null
  if (env == null || env.refs == null || env.uid == null) return
  const root = env.refs[String(env.uid)] ?? env.refs[env.uid as never]
  if (root?.dict == null) return
  for (const [field, refId] of Object.entries(root.dict)) {
    const node = env.refs[String(refId)]
    if (node == null || node.meta == null) continue
    const extra = node.meta.extra
    if (extra == null || typeof extra.optionsFrom !== 'string') continue
    const pack = extra.optionsFrom
    // THE REFERENT REFUSAL (T5, 2026-10-12): optionsFrom names a mod
    // pack the envelope must BOARD — a name the envelope's own mod
    // schemas do not carry is a missing referent, and the door
    // refuses in the field's voice instead of serving an empty
    // select that reads as "nothing installed" (the old degradation
    // laundered a misconfiguration into an honest-looking dropdown;
    // the sweep is the earliest resolvable point — the pack, the
    // field, and the boarded set are all in hand here). A boarded
    // pack with zero live rows stays the honest empty arm.
    if (!boardedPacks.has(pack)) {
      const boarded = [...boardedPacks].sort().join(', ')
      throw new Error(
        `form-spec: field '${field}' names optionsFrom pack '${pack}' the ${family} envelope does not board (${boarded === '' ? 'no packs boarded' : `boarded: ${boarded}`})`,
      )
    }
    // no catch: a provider that throws past a proven referent is a
    // provider fault — the refusal propagates in its own voice
    const rows = svc.modCatalog(pack, family).rows
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

/** THE UNKNOWN-CARD VOICE, SPOKEN ONCE (one voice per refusal):
 *  the defs guard and the formSchemas miss are the same condition, so
 *  both build the same sentence from this function. Two literals is
 *  how they drifted apart in the first place. */
export const unknownCardVoice = (card: string): string =>
  `form-spec: card '${card}' unknown`

export function specBody(
  svc: ComfyUIService,
  defs: Map<string, CardDefinition>,
  res: SpecResolution,
): FormSpecDoc {
  // ONE VOICE FOR AN UNKNOWN CARD: the defs map is this function's
  // own input and its only caller builds res.card FROM it, so a miss
  // here was unreachable — and the reachable miss (formSchemas
  // answering null) already speaks below. Two sentences for one
  // condition is the drift this removes.
  const def = defs.get(res.card)
  if (def === undefined) {
    throw new Error(unknownCardVoice(res.card))
  }
  const ident = def.identity
  if (ident === undefined) {
    throw new Error(`form-spec: card '${res.card}' declares no identity`)
  }
  // The envelope's family: the model id (card-id alias keys serve
  // the default family's envelope — ?model=tts IS qwen3-tts). A
  // model-less card (res.model undefined, the minted-model kill)
  // addresses its own card id internally — the schema envelope and
  // its filters speak for the card — while the SERVED doc carries
  // no model seat at all.
  const key = res.model ?? res.card
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
    throw new Error(unknownCardVoice(res.card))
  }
  // THE CATALOG-FED SELECT (2026-09-21, the freeform-lie kill): a
  // field declaring extra.optionsFrom names a MOD PACK — the door
  // stamps its options from the pack's LIVE flavor rows at serve
  // time (the schema cannot close what the runtime serves; the
  // compose door keeps refusing unknown ids loud). The empty arm
  // rides first when the field's default is '' (a refine pick must
  // be clearable). LORAS ARE ONLY MODS: the ids come from the
  // served rows, never a hand-spelled string — the USER lane's
  // law; a card-authored recipe payload carrying `name` (not
  // `id`) is the authoring lane and rides compose's filename arm
  // (service.ts names the boundary). The referent law
  // (T5): the pack must be one the envelope boards — the mod
  // schemas' key set, built once here and shared with the
  // modifiers walk below.
  const boardedPacks = new Set(Object.keys(schemas.mods))
  stampOptionsFrom(schemas.schema, svc, envelopeKey, boardedPacks)
  // THE MOD SYSTEM OWNS MODS (the old SubcardGrid law, 2026-08-09:
  // "LoRA is a MOD, never a standalone addition — the free-text
  // grid must not render the mod bags as raw JSON rows; the
  // SubcardGrid owns them"). Mod params ride mod_schemas (keyed by
  // pack) and render ONLY through the mod surface. ControlNet
  // proves the law by absence: the pack waits unboarded and no
  // envelope, no entry, no endpoint ever names it.
  const modifiers = specModifiers(svc, res.card, envelopeKey, decl, def, boardedPacks)
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
    mod_schemas: servedModEnvelopes(schemas.mods, res.card),
    // NO MINTED MODEL (the minted-model kill, 2026-10-12): a card
    // that boards no models serves null here — the old body minted
    // the card id as the model and the run door refused the card's
    // own id against its empty board (the mask run refusal).
    model: res.model ?? null,
    // THE FAMILY'S DECLARED SURFACE (the no-silent-drop law's client
    // face, 2026-11-08): the DECL's own param names, served so the
    // client switch verbs can null a departed family's own knobs
    // (declared-here, not-declared-there) and the client compose
    // mirror can refuse a doc key no surface owns — the estate
    // admission's field-named voice, mirrored client-side. Absent
    // when the DECL is unreachable (the legacy surface-less shape).
    params: decl?.params,
    outputs: def.flowKinds.outputs,
    // THE CARD'S OWN SERIALIZED SCHEMA — the served form's SSOT.
    schema: servedEnvelope(schemas.schema, res.card),
    service: res.service,
    size: surface.size === 'huge' ? 'huge' : null,
    variants: decl ? specVariants(decl, key, res.service) : [],
    // THE LANE CONTRACT (2026-10-10, the YOU_ARE_A_LIAR fix shape 2
    // + 4: "cards consume: zones, order, craft recipes, compose
    // wiring — no per-model field tables" + "the form gates inline
    // from the same declaration"). The family's declared parameter
    // surface + relation words, served with the spec so the form
    // hides what the lane does not declare and renders relation
    // violations INLINE (the same judged grammar the bench-write
    // door refuses with: @melite/contracts/laneRelations — one
    // declaration, every face). Absent = the family declares no
    // surface (the legacy truth: the card's union table owns
    // visibility) — the form falls back to visible_when.
    // A family that declares a SURFACE serves it; a family that
    // declares NO surface while judging LAWS (krea-2's shape since
    // the envelope wall, 2026-10-11: relations + variant envelopes,
    // params undeclared) still serves its contract — base ABSENT
    // (laneContractOf's optional-base law): the laws judge, the
    // form falls back to the card's own visibility for fields.
    // Before this gate widen, an envelope-only family served NO
    // lanes block — the form judged nothing while the compose door
    // refused the write 300ms after the press ("THE WRITE DID NOT
    // LAND — stated cfg 3.5 is OUTSIDE the route envelope").
    ...(decl !== null && (
      decl.params !== undefined ||
      decl.relations !== undefined ||
      decl.bounds !== undefined ||
      (decl.variants ?? []).some((v) =>
        v.params !== undefined || v.relations !== undefined || v.bounds !== undefined || v.sampler_envelope !== undefined ||
        // THE CELL SURFACE (the size-at-quant reshape, operator
        // 2026-10-26): a variant that declares additions at a SIZE
        // CELL only still declares — its lanes block serves so the
        // form's inline gate and the bench door judge one truth.
        (v.cells ?? []).some((c) => c.params !== undefined))
    ) ? {
      lanes: sharedLaneContractOf(decl),
    } : {}),
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
    // ATOMS ONLY ON THE DISPLAY FACE (operator 2026-10-26, MODEL =
    // QWEN / VARIANT = flavor / QUANT = size): a card's boarded may
    // carry retained ROUTE ADDRESSES (the offered-set law, 2026-09
    // -23 — the bench door and the tool enum offer atoms + routes
    // so an old draft or the qvoice enum can name any address);
    // a route is a CELL SELECTOR, not a model — serving it here
    // re-expands one family into five Model-axis rows (the tts
    // card's display defect, 2026-10-12 operator catch). The fold
    // is the registry's own truth (owningAtom: a route composes
    // through its owner — the same law the lanes block above and
    // models/service.ts:543 ride); insertion order keeps the ATOM
    // first (cards board their atom first by the M5 law), so the
    // display row order is unchanged for folded and unfolded cards
    // alike.
    families: [...new Set((def.boarded ?? []).map((fam) => owningAtom(fam)))].map((atom) => ({
      id: atom,
      present: liveMids.has(atom),
      label: familyFace(atom),
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
    // THE MINTED-MODEL KILL (PROOF-12's class, the sibling faces —
    // 2026-10-12): a model-less card (boarded: []) serves NO family.
    // The old `?? [id]` minted the card's own id as a family — the
    // same body then carried families:["mask"] beside a families
    // census in which "mask" did not exist (the catalog disproved
    // its own rows). The honest spellings: families [], a null
    // default, and a null resolved — the card-id alias is the RUN
    // plane's law (admitStageModel's card-unit arm, PROOF-13), never
    // a catalog family.
    const boarded = [...(def.boarded ?? [])]
    const df = boarded[0] ?? null
    // THE DISPLAY FOLD (the naming law, operator 2026-10-26): the
    // faces below DISPLAY families — they serve the owning atoms
    // only (owningAtom: the registry's route→owner truth). The raw
    // boarded list stays the offered set for the bench door and the
    // tool enum (never this face — a route is a cell selector, not
    // a model; serving it re-expands one family into five rows).
    const atomFamilies = [...new Set(boarded.map((fam) => owningAtom(fam)))]
    cards[id] = {
      id,
      label: ident.label,
      description: ident.description,
      genre: ident.genre,
      families: atomFamilies,
      principles: [...(ident.principles ?? [])],
      skills: [],
      has_inference: false,
      has_rubric: false,
    }
    capabilities[id] = {
      label: ident.label,
      description: ident.description,
      // THE OMISSION SPELLING (the GPU tier's first live catch,
      // 2026-10-12): a model-less card (families []) OMITS both keys —
      // the §11 shape the wire type carries (default_family?: string;
      // no null arm) and the browser contract admits. The kill's first
      // landing wrote explicit nulls; validateCatalogContract red them
      // as present-but-not-a-string on every lane boot — the GPU
      // pilot's zero-error ledger caught it through the console arm.
      ...(df !== null
        ? { default_family: df, resolved: { family: df, model: df, params: {} } }
        : {}),
      families: atomFamilies,
      kind: 'generation',
      icon: ident.icon ?? '',
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
    // THE MINTED-MODEL KILL rides here too (PROOF-12's class): a
    // model-less card serves NO family and NO model — the row's
    // model is null, its families empty, and emitParamsSchema takes
    // the empty board (no synthesized model knob: the card-unit
    // alias is the run plane's law, not a served pick).
    const boarded = [...(def.boarded ?? [])]
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
    const schema = emitParamsSchema(carrier as never, boarded) as Record<string, unknown>
    // THE MODS CONTRACT (stroke 79 — the seam-law unification): the
    // declared kinds ride beside params_schema so the AGENT plane
    // sees the same contract the UI form-spec serves — the mod bags
    // are NOT flat-schema keys, and an agent that never learns the
    // kinds hits compose's loud refusals blind (params alone cannot
    // compose a card whose complexity lives in mods). Verbatim off
    // the card's own rows; leaf_face stays a UI concern and never
    // rides (the agent composes VALUES, never faces).
    const mods = emitModifierKinds(def.mods)
    // THE LANE CONTRACT, AGENT PLANE (2026-10-10, the liar report's
    // fix shape 2, closing the last asymmetry): the form reads the
    // DECL's surface from the form-spec, the bench door refuses on
    // it, and the AGENT used to get only the flat union schema —
    // so the one consumer that writes WITHOUT a live form learned
    // the law by hitting its refusal. Every declaring family on this
    // card rides its own lane contract (keyed by family id, verbatim
    // the same shared laneContractOf the form-spec serves); a card whose
    // families declare nothing carries no `lanes` key at all, which
    // is the legacy truth, not a silent empty.
    const lanes: Record<string, unknown> = {};
    for (const fam of boarded) {
      // FAMILY ATOMS ONLY (the route-lens law, same as the registry
      // seat): a route address's derived view re-addresses the
      // family's HEAD, so its variant table would publish the head's
      // surface as if it were the route's own lane. The agent gets
      // the family's contract and picks the variant itself.
      // owningAtom is a Map read plus `?? id` (models/service.ts:543)
      // — it cannot throw for any id, so the guard that wrapped it is
      // dead (the re-audit, 2026-10-16).
      const atom = owningAtom(fam)
      if (atom in lanes) continue;
      let fdecl: ModelDecl | null = null;
      try { fdecl = getModel(atom); } catch { fdecl = null; }
      // SAME LAW AS THE FORM FACE (the design audit's F5, 2026-10-10):
      // `params: []` ≡ undeclared — both faces fall back to the
      // legacy truth. Serving a strictly-empty base to the agent
      // while the form falls back to the card's union table is two
      // truths for one declaration.
      if (fdecl !== null && (fdecl.params?.length ?? 0) > 0) lanes[atom] = sharedLaneContractOf(fdecl);
    }
    out.push({
      name: id,
      version: 1,
      kind: 'generation',
      model: boarded[0] ?? null,
      stage_title: ident.label,
      description: ident.description,
      genre: ident.genre,
      // THE DISPLAY FOLD (the naming law — same as the cards face
      // above): the agent catalog row displays owning atoms; the
      // offered route set lives on the bench door and tool enum.
      families: [...new Set(boarded.map((fam) => owningAtom(fam)))],
      params_schema: schema,
      ...(Object.keys(lanes).length > 0 ? { lanes } : {}),
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
      label: 'MCP (experimental)',
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
      label: 'MCP (experimental)',
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
 *  does not resolve (the door 404s, same body as ever). A model
 *  FAMILY name against an unbooted table THROWS the table's own
 *  refusal (never a 404 — the census-arm split, 2026-10-13). */
export async function formSpecArm(
  model: string,
  engineDocs?: ReadonlyMap<string, () => Record<string, unknown>>,
): Promise<FormSpecDoc | null> {
  // THE ENGINE ARM (stroke 66, generalized stroke 69 — the
  // card-seam completion): an engine id resolves to the ENGINE's
  // own form doc (no card, no family) built by the door's LIVE
  // factory (agent's census reads the tools seat + the skill index
  // per request — never a static list). Every doc serializes the
  // same declared contract its executor's gate validates.
  const buildEngine = engineDocs?.get(model)
  if (buildEngine !== undefined) {
    const engineDoc = buildEngine()
    if (!isFormSpecDoc(engineDoc)) {
      throw new Error(`form-spec: engine '${model}' built a form doc without a form name / malformed schema envelope`)
    }
    return engineDoc
  }
  // THE MCP NAMESPACE — its own census arm, decided BEFORE any
  // family lookup (the reverted-fix lesson, 2026-10-13): 'mcp' and
  // 'mcp:<server>' are SERVER census keys. A seated one was served
  // by the engine arm above; an absent one is the CENSUS's answer
  // (404) — never the models table's voice and never a getModel
  // lookup, whatever the table's boot state.
  if (model === 'mcp' || model.startsWith('mcp:')) return null
  const defs = await loadCardDefs()
  const res = resolveSpecKey(model, defs, boardedMap(defs))
  if (res === null) return null
  return specBody(theService(), defs, res)
}
