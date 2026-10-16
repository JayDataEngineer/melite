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
import { extraOf, type ExtraBag, type ExtraKey, type Wtype } from '@melite/contracts/extraKeys'
import { deepEqualJson } from '@deepseek-ai/dsh-util-values'

import type {
  FormSpecDoc,
  InputEdge,
  ModifierKind,
  ModifierOption,
  SchemaEnvelope,
  SchemaRef,
  SpecField,
  FormVariantRow,
} from '@melite/contracts/formSpec'
// THE SERVED CONTRACT (form-spec wire): the types live one plane down
// in @melite/contracts/formSpec — the node door builds the body, the
// browser reads it, and no package's src crosses the /client door to
// reach them. Re-exported here so every `@melite/card-base` importer
// keeps its one spelling.
export type {
  FormSpecDoc,
  InputEdge,
  ModifierKind,
  ModifierOption,
  SchemaEnvelope,
  SchemaRef,
  SpecField,
  FormVariantRow,
} from '@melite/contracts/formSpec'

import {
  judgeLaneBounds,
  judgeLaneRelations,
  judgeLaneSurface,
  laneBoundsOf,
  laneSurfaceOf,
  judgeSamplerEnvelope,
  samplerEnvelopeCure,
  unknownQuantVoice,
  unknownVariantVoice,
  type LaneBounds,
  type LaneRelations,
  type LaneViolation,
  type SamplerEnvelope,
} from '@melite/contracts/laneRelations'


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
 *  the engine's compose floor); the dict's honesty word only when
 *  nothing composes. */
import { chromeCopy } from './locales/chromeCopy.ts'
export function unsetFaceLabel(face: UnsetFace): string {
  if (face.composed === undefined) return chromeCopy.inheritPlaceholder
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
    // THE DANGLING-REF REFUSAL (G9-half, 2026-10-12): a dict id the
    // refs table does not carry is a corrupt envelope — the old walk
    // dropped the field and the form rendered with a hole and no
    // diagnostic. The producer mints a ref for every dict id, so this
    // arm is unreachable for a well-formed envelope; refusing here is
    // the earliest client-side point. The UNION members are exempt by
    // design (non-string consts mint no ref — the bare-union law,
    // pinned below), and the hybrid projection's own short-envelope
    // guard answers [] before this walk.
    if (node === undefined) {
      throw new Error(
        'form-spec: field ' + JSON.stringify(name)
        + ' points at ref ' + JSON.stringify(id)
        + ' the envelope\'s refs table does not carry — the form is refused rather than rendered with a hole',
      )
    }
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
    // presentation type: declared hint wins, else derive. The hint's
    // WTYPE_SET membership is enforced ONE STEP UP, inside extraOf
    // (strictness fix 5, 2026-10-01): every face narrows through the
    // floor's typed read, so the check lives there — never twice.
    const hint: string | undefined = extra.wtype
    let type: string
    if (hint !== undefined && hint !== '') type = hint
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
      required_when: str('required_when'),
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
/** THE NUMERIC PARSE, shared by both blank laws (2026-10-13, the card-UI
 *  duplication audit): a finite parse is a number, anything else is
 *  NOT one. The blank SEMANTICS then differ by seat and stay there —
 *  this file rides an unparseable value VERBATIM (never a silent 0),
 *  while the drill modal keeps the prior value (a typed "x" must
 *  never reach a number param). One parse, two named laws; the two
 *  copies of the parse itself are gone. */
export function parseNumericInput(v: string): number | undefined {
  if (v.trim() === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function coerceFieldEdit(f: SpecField | undefined, v: unknown): unknown {
  if (v === undefined) return undefined
  if (f !== undefined && (f.type === 'number' || f.type === 'seed' || f.type === 'slider')
      && typeof v === 'string') {
    const n = parseNumericInput(v)
    if (n !== undefined) return n
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

/** THE MOD-BAG KEYS (the per-model law's truth seat, operator
 *  2026-10-16: "MODS (LIKE LORAS) ARE PER MODEL"): the envelope
 *  root's ARRAY-node names — mod currency, however the field's
 *  wtype presents. Presentation types lie (a bare lora bag projects
 *  'loras', a mod list projects 'image_list'); the NODE is the
 *  truth. Nulls ride modelSwitchPatch's cross-model arm: the bag
 *  dies with its model, never seeds the arrival. */
function bagKeysOf(spec: FormSpecDoc): Set<string> {
  const env = spec.schema
  if (env == null) return new Set()
  const root = env.refs[env.uid]
  const dict = root?.dict ?? {}
  const out = new Set<string>()
  for (const [name, id] of Object.entries(dict)) {
    if (env.refs[id]?.type === 'array') out.add(name)
  }
  return out
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

/** THE CONDITIONAL-REQUIRED (2026-10-12, the operator's catch: the
 *  mask card's sam3 prompt threw at compose while the form showed a
 *  lawful-looking optional blank): a field the compose demands only
 *  in some states declares WHICH through the SAME grammar
 *  fieldVisible interprets — the required star paints exactly when
 *  the guards hold. `required: true` stays the unconditional face;
 *  this is its scoped sibling, never a second interpreter. */
export function fieldRequired(f: SpecField, values: SpecValues): boolean {
  if (f.required === true) return true
  if (typeof f.required_when !== 'string' || f.required_when === '') return false
  return fieldVisible({ ...f, visible_when: f.required_when }, values)
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
  quantId: string | null = null,
): readonly string[] | null {
  const lanes = spec.lanes
  if (lanes === undefined) return null
  const extra = variantId === null ? undefined : lanes.variants?.[variantId]?.params
  // THE CELL AXIS (the size-at-quant reshape, operator 2026-10-26:
  // "THEN QUANT, THAT IS WHERE YOU CHOSE 1.7 OR .6"): a size cell
  // may take a member its sibling size does not — the same
  // family ∪ variant ∪ cell resolution the bench door refuses
  // with (one spelling, laneSurfaceOf). An unknown/absent quant
  // inherits the variant's own surface (selectCardVariant's
  // first-cell law), never a refusal here.
  const cell = variantId !== null && quantId !== null
    ? lanes.variants?.[variantId]?.cells?.[quantId]?.params
    : undefined
  return laneSurfaceOf(lanes.base, extra, cell)
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
  // The QUANT pick rides the lane resolution too (the cell axis —
  // a size cell's surface is the truth when a size is chosen).
  const quantId = typeof values['quant'] === 'string' && values['quant'] !== ''
    ? values['quant']
    : null
  const surface = laneSurfaceFor(spec, variantId, quantId)
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
  // THE QUANT, same tri-state law (the cell axis): an unknown or
  // cleared quant inherits the variant's own surface — the RUN
  // door resolves the cleared one to the first cell.
  const rawQuant = carried('quant')
  const quantId = typeof rawQuant === 'string' && rawQuant !== '' ? rawQuant : null
  const surface = laneSurfaceFor(spec, variantId, quantId)
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
export function rowsFor(spec: FormSpecDoc, group: string): FormVariantRow[] {
  return (spec.variants ?? []).filter((v) => v.group === group)
}

/** THE CHAIN (one direction: an axis filters the axes BELOW it): a
 *  row composes with the current selection when its `owner` is empty
 *  (composes with everything — patch-only rows) or names the ACTIVE
 *  row of another axis. */
/** The row the doc's durable axis stamp names for the picked row's
 *  group — the DEPARTED preset (the departed-preset reseat's input,
 *  2026-11-06). The stamp's reverse: a non-Quant stamp IS the row
 *  id; a Quant stamp is the row's quant coordinate (axisStampOf's
 *  mirror, spelled WITHOUT its throw — a departed-row lookup never
 *  refuses a pick over an unrelated illegal sibling). undefined
 *  when the doc names no row, names the picked row itself (no
 *  departure), or names a stamp no row owns (a stale doc — nothing
 *  to reseat against). PURE. */
function departedRowOf(spec: FormSpecDoc, incoming: FormVariantRow, held?: SpecValues): FormVariantRow | undefined {
  if (held === undefined) return undefined
  const siblings = (spec.variants ?? []).filter((r) => r.group === incoming.group)
  // THE AXIS ARM: an axis group's identity IS its durable stamp
  // (variant/quant ride the doc). A stamp naming the incoming row is
  // no departure; a stamp naming no row is a stale doc — for an AXIS
  // group that is the whole answer (nothing to reseat against).
  const stamp = held[axisKey(incoming.group)]
  if (typeof stamp === 'string' && stamp !== '') {
    const named = siblings.find((r) => (r.group === 'Quant' ? r.quant === stamp : r.id === stamp))
    if (named !== undefined) return named.id === incoming.id ? undefined : named
    if (axisGroups(spec).includes(incoming.group)) return undefined
  }
  // THE DERIVED ARM (the Recipe group — the yield refuses its durable
  // key, so a recipe has no stamp to read). THE BURN this cures
  // (2026-10-16, audit 0be61df8 F2): the D4 reseat read
  // `held['recipe']` — a key NO writer produces (the vocabulary guard
  // refuses it, seedUser deletes it) — so the reseat was DEAD CODE and
  // a departed preset's stamps rode forever (the operator's
  // four-times-reported "THEY ARE ALL LOSE RESOLUTION": Draft's
  // 768×448 under Standard and Final Cut).
  // The identity is DERIVED instead, from the roster the held layer
  // still carries: the sibling whose declared stamps the doc still
  // holds is the preset the face was showing before this pick. A held
  // value equal to a sibling's stamp IS the departure (the pick owns
  // its roster in both directions); a value the user edited AWAY from
  // every stamp matches nothing and stands. Ties resolve by served
  // order (first declared) — deterministic, never a coin flip. Keys
  // the incoming row also declares are the incoming's own and never
  // count as departure evidence.
  let best: FormVariantRow | undefined
  let bestHits = 0
  for (const r of siblings) {
    if (r.id === incoming.id) continue
    let hits = 0
    for (const [k, v] of Object.entries(r.defaults)) {
      if (k === 'model') continue
      if (k in incoming.defaults) continue
      if (deepEqualJson(held[k], v)) hits++
    }
    if (hits > bestHits) { bestHits = hits; best = r }
  }
  return bestHits > 0 ? best : undefined
}

export function composingRows(spec: FormSpecDoc, group: string, active: Record<string, string | undefined>): FormVariantRow[] {  return rowsFor(spec, group).filter((v) => {
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
export function variantRows(spec: FormSpecDoc): FormVariantRow[] {
  return rowsFor(spec, 'Variant')
}

/** The Quant cells composing with a variant (THE CHAIN). */
export function quantRowsFor(spec: FormSpecDoc, variantId: string | null): FormVariantRow[] {
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
    // held rides (the override law): the stamp the pill DERIVES must
    // be the stamp the pick WRITES — stamps clamp through the
    // resolved variant's envelope, so a derivation without the held
    // layer would light no pill after a reconciled pick
    const patch = axisPickPatch(spec, row, values)
    let holds = true
    for (const [k, v] of Object.entries(patch)) {
      if (k === axisKey('Recipe')) continue
      if (!deepEqualJson(values[k], v)) { holds = false; break }
    }
    if (holds && Object.keys(patch).length > 0) return row.id
  }
  return undefined
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

/** THE AXIS STAMP VOCABULARY (2026-09-29, caught LIVE by the
 *  compose gate in the CI seat: the client stamped the Quant row's
 *  composed catalog id — 'raw__int8' — where the door's contract
 *  speaks the CELL's quant field — 'int8'; the gate refused with the
 *  door's own voice and the write never left the studio, which is
 *  exactly the law working). The value an axis pick stamps on the
 *  durable key is the value the DOOR reads: the variant id for
 *  Variant, the cell quant for Quant. Never the flat-catalog id.
 * PURE. */
export function axisStampOf(row: FormVariantRow): string {
  if (row.group !== 'Quant') return row.id
  if (typeof row.quant === 'string' && row.quant !== '') return row.quant  // NO FALLBACK (2026-09-29, the second live break): the old
  // `?? row.id` arm was the second vocabulary's doorway — it
  // legalized stamping the catalog's composite address ('raw__int8')
  // where the door's contract speaks the cell coordinate ('int8').
  // A Quant row without its coordinate is an ILLEGAL ROW: discovery
  // refuses it at birth, and if a hole ever reopens the stamper
  // REFUSES LOUD here rather than construct a contract the door
  // would refuse a millisecond later.
  throw new Error(
    'illegal Quant row ' + JSON.stringify(row.id)
    + ' (owner ' + JSON.stringify(row.owner ?? '') + '): no quant coordinate —'
    + ' the row is refused at the stamp; the spec server must refuse it at birth',
  )
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
export function axisPickPatch(spec: FormSpecDoc, row: FormVariantRow, held?: SpecValues): SpecValues {
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
  if (groups.includes(row.group)) patch[axisKey(row.group)] = axisStampOf(row)
  // ONLY the axes BELOW the picked one re-seed (the chain runs one
  // direction); the axes above stay exactly as the user set them. A
  // group outside the axes (Recipe since the yield) has nothing
  // below it — no reseed at all.
  if (at < 0) {
    // THE DEPARTED-PRESET RESEAT (D4, 2026-11-06 — operator: "switch
    // between recipes. THEY ARE ALL LOSE RESOLUTION", reported four
    // times): a preset OWNS its stamps while it is the named pick.
    // When the doc's held layer names a DIFFERENT row of the same
    // group (departedRowOf — the durable stamp for an axis group, the
    // DERIVED roster for the Recipe group since the yield), every key
    // the DEPARTED row stamped that the incoming row does not carry is
    // preset residue — Draft's 768×448 rode under Standard and Final
    // Cut forever (patch-only rows never unstate). A key whose held
    // value still EQUALS the departed stamp unstated (null deletes at
    // compose — modelSwitchPatch's spelling); a hand-edited value is
    // the USER's word and stands.
    // THE VALUE COMPARISON IS DEEP (2026-10-16, the same audit's F3):
    // the check was `===`, which is REFERENCE equality for arrays —
    // an array bag (loras, ref_mods) never compared equal, so a
    // departed recipe's bag ALWAYS rode and could never be unstated.
    // deepEqualJson is the comparison the rest of this file already
    // uses for held-vs-stamp judgments.
    // Scoped to NON-AXIS groups: the chain groups' values are the
    // envelope law's (reconcilePick) — this cures the one seam that
    // had no reconciler at all.
    const departed = departedRowOf(spec, row, held)
    if (departed !== undefined) {
      for (const [k, v] of Object.entries(departed.defaults)) {
        if (k === 'model') continue
        if (k in row.defaults) continue
        if (held !== undefined && deepEqualJson(held[k], v)) patch[k] = null
      }
    }
    reconcilePick(patch, spec, row, held)
    return patch
  }
  for (const g of groups.slice(at + 1)) {
    const composing = composingRows(spec, g, active)
    if (composing.length > 0) patch[axisKey(g)] = axisStampOf(composing[0])
    else patch[axisKey(g)] = ''
  }
  // THE PICK RECONCILES (operator 2026-11-05: "when I switch
  // variant, it should switch the values so they make sense" — the
  // live break: switching to turbo with stated steps 52/cfg 3.5
  // bricked the card behind the compose gate instead of switching).
  // THE SAME DAY'S SECOND LAW (the multi-level cure): the reconcile
  // judges against the RESOLVED VARIANT's envelope, and the latest
  // selection OVERRIDES — the new choice's declared defaults land,
  // the departed choice's numbers never survive a judged key (the
  // overrideEnvelopeKeys priority chain).
  reconcilePick(patch, spec, row, held)
  return patch
}

/** THE OVERRIDE RECONCILE (operator 2026-11-05: "THE LATEST
 *  SELECTION MUST OVERRIDE" — the multi-level live break: model,
 *  variant, recipe, and quant switches EACH bricked the card at the
 *  compose gate while the frozen-fixture suites stayed green). The
 *  judge reads the doc against the RESOLVED VARIANT's
 *  sampler_envelope — so the pick's ONE write must land every
 *  judged key on a truth the envelope admits, priority:
 *  1. the picked row's stamps: TRUSTED verbatim when the row IS the
 *     law-holder (a variant pick — a row whose declared default
 *     falls outside its own envelope is a lying DECL, the gate's to
 *     refuse); otherwise clamped through the variant's envelope (a
 *     recipe's 50 composes to 8 under a 4-step distill);
 *  2. the value the doc already carries: inside the envelope it
 *     STANDS unwritten (a pick overrides only what it speaks — a
 *     quant pick that declares no steps never tramples the recipe's
 *     50), outside it clamps to the nearest bound;
 *  3. nothing carried: the RESOLVED VARIANT's declared default for
 *     the key, else the family row's (spec.model_defaults) — the
 *     absent-key seed (flux's numbers on a fresh switch, never a
 *     departed family's 52 resurrected by the schema).
 *  A switch never leaves a judged key outside the envelope. Mutates
 *  the patch. */
function overrideEnvelopeKeys(patch: SpecValues, spec: FormSpecDoc, offered: FormVariantRow, held?: SpecValues, trustStamps = false): void {
  const env = offered.sampler_envelope
  if (env === undefined || env === null) return
  const familyDefaults = (spec.model_defaults ?? {}) as Record<string, unknown>
  for (const [k, range] of Object.entries(env)) {
    if (!Array.isArray(range) || range.length !== 2) continue
    const [lo, hi] = range as [number, number]
    if (typeof lo !== 'number' || typeof hi !== 'number') continue
    const clamp = (v: number): number => (v < lo ? lo : v > hi ? hi : v)
    const stamp = patch[k]
    if (typeof stamp === 'number' && Number.isFinite(stamp)) {
      if (!trustStamps) patch[k] = clamp(stamp)
      continue
    }
    const doc = held?.[k]
    if (typeof doc === 'number' && Number.isFinite(doc)) {
      // inside-envelope carried values stand unwritten (the
      // minimal-write law + the speaks-only-what-it-declares law);
      // outside ones clamp in the same write
      const c = clamp(doc)
      if (c !== doc) patch[k] = c
      continue
    }
    const declared = offered.defaults[k] ?? familyDefaults[k]
    if (typeof declared === 'number' && Number.isFinite(declared)) patch[k] = clamp(declared)
  }
}

/** A pick's full reconcile: resolve the variant the DOOR will judge
 *  (offeredVariantOf — the door's own resolution over the doc the
 *  pick produces), then land its envelope keys on a truth the
 *  envelope admits (overrideEnvelopeKeys). A VARIANT pick's own
 *  stamps are TRUSTED against its own envelope — a row whose
 *  declared default falls outside its own envelope is a lying DECL,
 *  the compose gate's to refuse live (stage-drill-gates' no-write
 *  law), never clamped here. Cross-row picks (recipe/quant stamps
 *  under the variant's law) reconcile. Shared by every
 *  axisPickPatch exit and the model switch. Mutates the patch. */
function reconcilePick(patch: SpecValues, spec: FormSpecDoc, row: FormVariantRow, held?: SpecValues): void {
  const doc: SpecValues = { ...(held ?? {}), ...patch }
  const offered = offeredVariantOf(spec.variants ?? [], doc) ?? row
  const trustStamps = offered.id === row.id && row.group === 'Variant'
  overrideEnvelopeKeys(patch, spec, offered, held, trustStamps)
}

/** A model switch's full value patch (the stale-variant cure,
 *  operator 2026-09-14: model anima + variant turbo refused at
 *  compose — a switch that keeps the old family's axes is a broken
 *  stage). Every axis re-seeds to its FIRST row re-pointing at the
 *  new model (else its first composing row), and the picked rows'
 *  defaults overlay rides (raw → {model, steps, cfg} — the pick
 *  law, same as axisPickPatch). THE OVERRIDE LAW (2026-11-05, the
 *  multi-level cure): with `held` the switch lands the SEEDED
 *  variant's envelope keys on the new choice's own truth
 *  (reconcilePick), and a CROSS-FAMILY switch nulls the departing
 *  vocabulary — every envelope key this spec's rows name that the
 *  patch does not own (the unset law: null deletes at compose; the
 *  new family's seed re-derives on spec-land, never the departed
 *  family's 52 riding under a 4-step distill). The caller writes
 *  every key through onEdit. PURE. */
export function modelSwitchPatch(spec: FormSpecDoc, model: string, held?: SpecValues): SpecValues {
  const patch: SpecValues = { model }
  const groups = axisGroups(spec)
  const active: Record<string, string | undefined> = {}
  let seededVariant: FormVariantRow | undefined
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
    if (g === 'Variant' && seededVariant === undefined) seededVariant = row
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
  if (crossSpec) {
    // THE DEPARTING VOCABULARY DIES (the override law's cross-family
    // face): this spec's envelope keys are the OLD family's words.
    // Null them unless the patch owns them — the compose doc drops
    // the key and the new family's spec-land seed re-derives it.
    const vocab = new Set<string>()
    for (const r of spec.variants ?? []) {
      for (const k of Object.keys(r.sampler_envelope ?? {})) vocab.add(k)
    }
    for (const k of vocab) {
      if (!(k in patch)) patch[k] = null
    }
    // THE MOD BAG DIES WITH ITS MODEL (operator, 2026-10-16: "MODS
    // (LIKE LORAS) ARE PER MODEL. IF I SWITCH MODEL, KEEPING THE
    // LORA ON MAKES ZERO SENSE"): the departing spec's ARRAY-node
    // fields are mod currency (the bag law — user arrays are mod
    // picks: loras, ref_mods), picked FOR the departed model's
    // weights. A cross-model switch nulls them — the arrival model
    // starts clean, its own bag its own. Unconditional: even a
    // family that boards the same mod KIND never inherits another
    // model's picks. The NODE is the truth, never the presentation
    // type (an image_list mod and a bare lora bag are both bags).
    for (const k of bagKeysOf(spec)) {
      if (!(k in patch)) patch[k] = null
    }
  } else if (seededVariant !== undefined) {
    reconcilePick(patch, spec, seededVariant, held)
  }
  patch['model'] = model
  return patch
}
/** THE EMPTY-SELECTION LAW's authoring decision (2026-10-10, the
 *  operator's live bench: a stage carrying quant:"" — born when a
 *  model switch CLEARED the axis to '' — which the RUN door refused:
 *  'unknown quant "" for model "z-image" variant "turbo" (known:
 *  int8)'). A stated EMPTY selection is UNSTATED: the authoring
 *  seat unsets the key instead of writing the empty string, so
 *  compose defaults the cell. ONE pure decision, shared by the seed
 *  (seedAxisValues omits) and the write (the drill's onSet unsets)
 *  — the form's rendering is untouched (a missing axis key reads
 *  as '' on screen). */
export function axisUnset(name: string, v: unknown, spec: FormSpecDoc | null): boolean {
  if (v !== "" || spec === null) return false;
  return axisGroups(spec).some((g) => axisKey(g) === name);
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
    // THE EMPTY-SELECTION LAW's form half (2026-10-10, the
    // operator's live bench: a stage born with quant:"" that the
    // RUN door refused — "unknown quant \"\"" for a lane whose only
    // cell is int8). An axis with no composing row is UNSTATED, not
    // stated-empty: the key is omitted so compose defaults it. The
    // "" value was a form's unchosen control written as a value —
    // the form rendering never changes (an axisKey the values lack
    // reads as '' on the form side; the seed is params).
    if (active[g] !== "") out[axisKey(g)] = active[g]
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
  // THE GHOST DROP (2026-10-16, the model-switch lock): a held axis
  // value that names no row of THIS spec's composing chain is a
  // departed family's ghost — krea-2's quant int8 riding anima's
  // cell-less turbo through a refused write, refusing every later
  // edit at the compose gate ('the write never left the studio')
  // while the studio shows the new family. The pass-along law
  // protects USER WORDS; a departed family's row id is not one.
  // Axes walk in order and the chain reads the LIVE map, so a ghost
  // variant also unseats the quant that composed only under it.
  for (const g of axisGroups(spec)) {
    const k = axisKey(g)
    const v = out[k]
    if (typeof v !== 'string' || v === '') continue
    const active: Record<string, string | undefined> = {}
    for (const g2 of axisGroups(spec)) {
      if (g2 === g) continue
      const v2 = out[axisKey(g2)]
      if (typeof v2 === 'string' && v2 !== '') active[g2] = v2
    }
    if (!composingRows(spec, g, active).some((r) => r.id === v || (r.quant ?? '') === v)) delete out[k]
  }
  // THE MOD BAG DIES WITH ITS MODEL (operator, 2026-10-16: "MODS
  // (LIKE LORAS) ARE PER MODEL"): a held ARRAY is mod currency (the
  // bag law — user arrays are mod picks: loras, ref_mods), picked
  // for the model that held it. When the held doc's model is not
  // THIS spec's model — the ghost's own entry: a failed switch left
  // the departed family's state under the arrival's spec — the bag
  // drops at the seed instead of riding into a compose that either
  // refuses every later write or silently mis-feeds the new weights.
  // Same model: the bag is that model's own and stays.
  const heldModel = typeof held['model'] === 'string' ? held['model'] as string : ''
  if (heldModel !== '' && heldModel !== spec.model) {
    for (const k of Object.keys(out)) {
      if (Array.isArray(out[k])) delete out[k]
    }
  }
  return out
}

/** THE MODEL-REKEY RESEAT (order d, operator 2026-11-06: "model-switch
 *  leaves stale cfg 3.5 outside the new lane envelope [1,2] — re-seat
 *  envelope-bound params to new lane defaults on switch"). The
 *  cross-family null set in modelSwitchPatch reads only the
 *  DEPARTING spec's envelope keys — an envelope-less departure
 *  (anima/z-image/h3) nulls nothing, so a stated cfg 3.5 rides the
 *  seed VERBATIM into the arrival family's first lane (krea-2
 *  turbo, cfg [1,2]) and every door refuses it. This verb runs at
 *  the ARRIVAL re-spec seed's re-key arm only: the seeded user
 *  layer's envelope-bound numerics reconcile against the RESOLVED
 *  VARIANT's envelope (overrideEnvelopeKeys — outside clamps to the
 *  nearest bound, absent keys seed from the offered row's own
 *  truth), exactly what a pick at that seat would do. A fresh open
 *  NEVER rides it (the reopen rides verbatim — seedUser's law).
 *  PURE — the caller owns the write. */
export function reseatEnvelopeKeys(spec: FormSpecDoc, seeded: SpecValues): SpecValues {
  const offered = offeredVariantOf(spec.variants ?? [], seeded)
  if (offered === undefined || offered.sampler_envelope == null) return seeded
  const patch: SpecValues = {}
  overrideEnvelopeKeys(patch, spec, offered, seeded, false)
  if (Object.keys(patch).length === 0) return seeded
  return { ...seeded, ...patch }
}

/** THE RECIPE BIRTH-STAMP (D12, 2026-10-23, the operator's "Default
 *  needs to be a 4 step LORA"): a fresh card is born stamped with
 *  the first composing Recipe row's payload. The axis seed writes
 *  axis KEYS only (seedAxisValues — and the Recipe group YIELDS,
 *  never an axis), and compose never applies recipe wire_defaults
 *  server-side (the card carries recipe as a rider); without this,
 *  a payload-carrying default recipe would compose unstamped. The
 *  stamp mirrors the pick verb (axisPickPatch minus the re-point:
 *  the `model` route resolves server-side, never lands in the user
 *  layer) for keys the seed does not hold — seeded axes win, so a
 *  DECL-authored axis key inside a payload can never corrupt the
 *  chain. The bag rides the USER layer on purpose (resolveValue
 *  skips base/model arrays — a resolver-stamped bag would compose
 *  invisible). PURE — the caller owns the write (the add door). */
export function seedRecipeStamp(spec: FormSpecDoc, seeds: SpecValues): SpecValues {
  const active: Record<string, string | undefined> = {}
  for (const g of axisGroups(spec)) {
    const held = seeds[axisKey(g)]
    if (typeof held === 'string' && held !== '') active[g] = held
  }
  const row = composingRows(spec, 'Recipe', active)[0]
  if (row === undefined) return seeds
  const out: SpecValues = { ...seeds }
  for (const [k, v] of Object.entries(row.defaults)) {
    if (k === 'model') continue
    if (k in out) continue
    out[k] = v
  }
  return out
}


// ── THE CLIENT'S COMPOSE GATE (2026-09-29, the operator's law: "IF
//    THE CARD IS A CONTRACT/SCHEMA, HOW DOES THE SYSTEM
//    ALLOW CONSTRUCTING BAD CONTRACTS? IT CAN ALL BE VALIDATED
//    BEFOREHAND, IN THE CODE") ───────────────────────────────────
// The estate door has always held this law (cardsVariant.ts:
// selectVariant + envelopeRefusal) — but the door judges AFTER the
// wire, on the merged doc. The client was a DELTA-EMITTER: per-key
// patches over state held elsewhere, so no full doc existed at the
// composer and validation could only live at the state-holder. The
// composer now assembles the CANDIDATE doc and runs the door's OWN
// law over the SERVED spec BEFORE any frame exists.
//
// THE MIRROR DISCIPLINE: exactly the door's clauses, no stricter, no
// looser. A client gate stricter than the door refuses writes the
// estate would admit (a new lie); looser lets the door be the first
// line again (the old lie). When the door's law changes, this mirror
// changes WITH it — pinned by the mirror wall.
//   clause 1 (marriage): a stated variant must be an offered
//     Variant-row id of this spec (the door: selectVariant's
//     unknown-variant refusal);
//   clause 2 (quant cell): a stated quant must be a Quant row owned
//     by the stated variant (the door: selectVariant's cell refusal);
//   clause 3 (envelope): a numeric steps/cfg stated in the doc must
//     sit inside the STATED variant's sampler_envelope — the door:
//     envelopeRefusal, the exact break that fired the operator's
//     live incident ('stated cfg 3.5 is OUTSIDE the route envelope
//     for variant "turbo" — the declared envelope is [1, 2]').
//   The door's own skips mirror verbatim: an unstated variant
//   RESOLVES to the door's pool[0] (never skipped — the second live
//   break: the gate once skipped the quant clause on unstated
//   variants while the door judged against pool[0], and a poisoned
//   quant sailed through); a non-numeric stated knob is skipped
//   (the door's own typeof guard); a variant with no envelope
//   declares nothing; a doc whose model points at another family is
//   judged by THAT family's spec, not this one.

/** The door's offered-variant pool (selectVariant mirrored):
 *  non-Recipe/non-Quant rows, else every non-Quant row when the
 *  family configures none — the discovery-expanded Quant CELLS
 *  never carry an envelope to judge against. */
function variantPool(all: readonly FormVariantRow[]): FormVariantRow[] {
  const configured = all.filter((r) => r.group !== 'Recipe' && r.group !== 'Quant')
  return configured.length > 0 ? configured : all.filter((r) => r.group !== 'Quant')
}

/** The door's variant resolution, ONE spelling (the dragbar clamp,
 *  2026-10-13): the stated variant matched by id OR route over the
 *  offered pool, else pool[0] — the row whose sampler_envelope the
 *  judge and the form's dragbar clamps BOTH read. Undefined only
 *  when the pool itself is empty or the stated id matches no row
 *  (the miss voice is composeValidate's own).
 *  @param all the spec's full variants array, cells included.
 *  @param doc the resolved display doc (the held variant key). */
export function offeredVariantOf(
  all: readonly FormVariantRow[],
  doc: Readonly<Record<string, unknown>>,
): FormVariantRow | undefined {
  const pool = variantPool(all)
  const rawVariant = doc['variant']
  if (typeof rawVariant === 'string' && rawVariant !== '') {
    return pool.find((r) => r.id === rawVariant || r.route === rawVariant)
  }
  return pool[0]
}

export interface ComposeViolation {
  /** the door's own voice — the same message the estate would send,
   *  prefixed by the gate that caught it (BEFORE the wire). */
  message: string
}

export function composeValidate(
  spec: FormSpecDoc | null,
  doc: SpecValues,
): ComposeViolation[] {
  if (spec === null) return []
  const heldModel = doc['model']
  if (typeof heldModel === 'string' && heldModel !== '' && spec.model !== undefined
    && spec.model !== '' && heldModel !== spec.model) {
    // this spec is not the law-holder for that doc — the door will
    // read the doc's own family spec (the drill refetches per model)
    return []
  }
  const out: ComposeViolation[] = []
  const all = spec.variants ?? []
  // THE DOOR'S POOL, mirrored (selectVariant): offered non-Recipe
  // rows — the served list mixes the discovery-expanded Quant CELLS
  // into the same array, and the door's facts row never sees those;
  // an all-Recipe family falls back to the whole offered list (the
  // door's own configured.length gate).
  const pool = variantPool(all)
  const rawVariant = doc['variant']
  let offered: FormVariantRow | undefined
  if (typeof rawVariant === 'string' && rawVariant !== '') {
    // the door matches id OR route (selectVariant: v.id === x ||
    // v.route === x) — a route-spelled variant is LEGAL at the door
    // and must be legal here.
    offered = pool.find((r) => r.id === rawVariant || r.route === rawVariant)
    if (offered === undefined) {
      out.push({
        message: 'card_compose: ' + unknownVariantVoice(rawVariant, spec.model ?? '', pool.map((r) => r.id)),
      })
      return out
    }
  } else {
    // THE DOOR'S DEFAULT (selectVariant: variant = pool[0]) — the
    // second live break (2026-09-29, 'unknown quant "raw__int8"'):
    // the gate SKIPPED the quant clause when variant was unstated,
    // while the door resolves pool[0] and REFUSES the quant against
    // it. An unstated variant is never a skip — it is a resolution,
    // exactly the door's.
    offered = pool[0]
  }
  if (offered !== undefined) {
    // clause 2 — the stated quant must be a cell of THIS variant
    const rawQuant = doc['quant']
    if (typeof rawQuant === 'string' && rawQuant !== '') {
      const cells = all.filter(
        (r) => r.group === 'Quant' && r.owner === offered.id,
      )
      if (!cells.some((c) => c.quant === rawQuant)) {
        out.push({
          message: 'card_compose: ' + unknownQuantVoice(rawQuant, spec.model ?? '', offered.id, cells.map((c) => c.quant).filter((q): q is string => typeof q === 'string')),
        })
      }
    }
    // clause 3 — the envelope, against the RESOLVED variant (the
    // stated one, else the door's pool[0] — never the still-held
    // one: the half-switch's whole failure was the door judging
    // raw's cfg against turbo's envelope). The door judges the RAW
    // body BEFORE the overlay stamps (stampCardOverlay calls
    // envelopeRefusal first) — so only EXPLICIT numeric knobs count,
    // never composed defaults.
    // THE ONE JUDGE (the voice audit, 2026-10-11): the body
    // composes in @melite/contracts — the door's envelopeRefusal
    // asks the same judge, so the mirror and the door can no
    // longer spell two truths. The client's frame stays phase-less
    // (the press-side lint never knows the door's phase); the
    // door adds the marriage clause + lane-read tail it owns.
    const off = judgeSamplerEnvelope(doc, offered.sampler_envelope ?? null, {
      id: offered.id,
      route: offered.route,
    })
    if (off !== null) {
      out.push({
        message: 'card_compose: ' + off.voice
          + '. ' + samplerEnvelopeCure(),
      })
    }
  }
  return out
}

/** Compose the CANDIDATE doc the door would judge: the bench row's
 *  held params, the user layer's overrides, then the in-flight frame
 *  — later layers win, and a null value DELETES the key (the wire's
 *  own unset law). This is composition: the full doc, assembled
 *  where the edit happens, so the law can run BEFORE the write. */
export function composeCandidateDoc(
  held: SpecValues,
  user: SpecValues,
  frame: Record<string, unknown>,
): SpecValues {
  const doc: SpecValues = { ...held, ...user }
  for (const [k, v] of Object.entries(frame)) {
    if (v === null) delete doc[k]
    else doc[k] = v
  }
  return doc
}
