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
 * fact joined per the py law (dsl.py Field.emit: `required: True
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
  list?: number[]
  dict?: Record<string, number>
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
  group?: string
  zone?: string
  required?: boolean
  placeholder?: string
  tooltip?: string
  visible_when?: string
  /** The DECL's LAYOUT VOCABULARY (stroke 22, the operator's law:
   *  the card package owns the form's geometry — "smaller things
   *  like width/height need to take up one row"): `columns` = the
   *  group's grid columns (declared on the group's fields —
   *  first-seen wins), `width` = this field's column span. A group
   *  without columns stacks one-per-row (today's face). */
  columns?: number
  width?: number
}

/** One DECLARED input edge: `name` is the schema param the edge feeds
 *  (the flowKinds key), `kind` the lane kind it carries (image/text/
 *  ...), and `required` present ONLY when the edge must exist before
 *  a run (True emits, False omits — the py law). */
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
   *  (strength for lora/controlnet, weight for ip_adapter). */
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
  families?: ReadonlyArray<{ id: string; present: boolean }>
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

/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
 *
 * One pure projection: serialized schemastery schema -> derived
 * SpecFields. Every presentation fact lives in the nodes' meta (the
 * declaration IS the UI contract — the py Field.emit law); this
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
 * meta.description (the py emitter's label law) — the declared
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
    const extra: Record<string, unknown> =
      typeof meta['extra'] === 'object' && meta['extra'] !== null && !Array.isArray(meta['extra'])
        ? meta['extra'] as Record<string, unknown> : {}
    const families = Array.isArray(extra['families'])
      ? extra['families'] as unknown[] : null
    if (families !== null && family !== undefined
        && !families.includes(family)) continue
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
    if (Array.isArray(extra['options'])) {
      options = (extra['options'] as unknown[]).map((o) =>
        typeof o === 'string' ? o
          : typeof o === 'object' && o !== null && 'value' in (o as Record<string, unknown>) && 'label' in (o as Record<string, unknown>)
            ? { value: String((o as Record<string, unknown>)['value']), label: String((o as Record<string, unknown>)['label']) }
            : String(o))
    }
    // presentation type: declared hint wins, else derive
    const hint = typeof extra['wtype'] === 'string' ? extra['wtype'] : ''
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
    const str = (k: string): string | undefined =>
      typeof extra[k] === 'string' ? extra[k] as string
        : typeof meta[k] === 'string' ? meta[k] as string : undefined
    out.push({
      name,
      label: typeof meta['description'] === 'string' && meta['description'] !== ''
        ? meta['description'] as string : name,
      order: typeof extra['order'] === 'number' ? extra['order'] : undefined,
      type,
      default: meta['default'] === undefined ? undefined : meta['default'],
      min: num('min'), max: num('max'),
      step: type === 'seed' ? undefined : num('step'),
      options,
      group: str('group') ?? '',
      zone: str('zone'),
      required: extra['required'] === true || meta['required'] === true,
      placeholder: str('placeholder'),
      tooltip: str('tooltip'),
      visible_when: str('visible_when'),
      columns: typeof extra['columns'] === 'number' ? extra['columns'] as number : undefined,
      width: typeof extra['width'] === 'number' ? extra['width'] as number : undefined,
    })
  }
  // declared order first, dict insertion order as tie-break (stable)
  return out.map((f, i) => [f, i] as const).sort((a, b) =>
    (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0])
}

/** THE EDIT COERCION (the one specPatch duty that survives, moved
 * to the edit boundary): atoms emit raw strings while typing; a
 * numeric field's edit rides the user layer as a NUMBER. An
 * unparseable/empty numeric string rides VERBATIM (the run's schema
 * parse refuses loud, naming the field — never a silent 0). `v ===
 * undefined` stays undefined (the tri-state's inherit — the caller's
 * unset signal). PURE. */
export function coerceFieldEdit(f: SpecField | undefined, v: unknown): unknown {
  if (v === undefined) return undefined
  if (f !== undefined && (f.type === 'number' || f.type === 'seed' || f.type === 'slider')
      && typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return v
}

/** The card's own derived fields (the schema envelope walked,
 * families-scoped to the served family). Memoize at the caller for
 * hot loops — the walk is pure. */
export function fieldsOf(spec: FormSpecDoc): SpecField[] {
  return fieldsOfEnvelope(spec.schema, typeof spec.model === 'string' ? spec.model : undefined)
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
 * base = the registry-less lane derive (the wall pins parity on
 * the golden families). PURE. */
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
  Object.assign(out, user)
  return out
}

/** evalVisibleWhen's serving shape: "key=value" (a field shows when its
 *  guard key holds the value). A field with no visible_when always
 *  shows. Unknown guard keys: show (never hide on a typo). */
export function fieldVisible(f: SpecField, values: SpecValues): boolean {
  const rule = f.visible_when
  if (typeof rule !== 'string' || rule === '') return true
  const eq = rule.indexOf('=')
  if (eq < 0) return true
  const key = rule.slice(0, eq)
  const want = rule.slice(eq + 1)
  const held = values[key]
  return String(held ?? '') === want
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

