/**
 * spec.ts — @melite/card-base: THE EMISSION CONTRACT.
 *
 * A card package EMITS; the base CONSTRUCTS (operator order,
 * 2026-09-12: "The package to construct the card ui should see that
 * the card package emits an image input, then constructs the input
 * component automatically"). This module is the emission's client-side
 * shape — the served form-spec document as the base consumes it —
 * plus the PURE projections (defaults seeding, visibility, grouping,
 * patch coercion). No fetchers here (wire.ts), no components
 * (form.tsx): types and derivations only.
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

/** One served form-spec field (/v1/form-spec — the params_emit contract:
 *  type/format/enum/default/minimum/maximum/description + the editor's
 *  own serving keys: group, zone, order, placeholder, tooltip,
 *  visible_when, options, step, required). */
export interface SpecField {
  name: string
  label: string
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
 *  fields never carry a mod's param_key (the SubcardGrid law). */
export interface ModifierKind {
  kind: string
  label: string
  param_key: string
  cardinality: string
  max_stack?: number
  fields?: Array<{ name: string; label?: string; type?: string; options?: unknown[] }>
  options?: Array<{ value: string; label: string; tooltip?: string; defaults?: { strength?: number } }>
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
  fields: SpecField[]
  /** THE FAMILY the spec serves (?model=<key> resolution) — the Model
   *  axis' resting value and the run's family when no variant re-point
   *  has ridden (the pass-along law, 2026-09-12). */
  model?: string | null
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
   *  (served when the family boards mod packs). */
  features?: { modifiers?: ModifierKind[] }
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

export type SpecValues = Record<string, unknown>

/** Seed the editable values from the spec's declared defaults (the old
 *  picker's law: pick → defaults seeded → the user edits from there).
 *  DEFAULTS PROPAGATE FROM THE EMISSION — the base never invents one. */
export function specDefaults(fields: SpecField[]): SpecValues {
  const out: SpecValues = {}
  for (const f of fields) {
    if (f.default !== undefined && f.default !== null) out[f.name] = f.default
  }
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

/** Coerce the raw edit strings to the spec's declared types — ONCE, at
 *  patch time (the editPatch law). Only keys that CHANGED from the
 *  stage's held params ride the patch. */
export function specPatch(fields: SpecField[], values: SpecValues, held: SpecValues): SpecValues {
  const out: SpecValues = {}
  for (const f of fields) {
    const v = values[f.name]
    if (v === undefined) continue
    const before = held[f.name] ?? f.default
    const same = String(v) === String(before ?? '')
    if (same) continue
    if (f.type === 'number' || f.type === 'seed' || f.type === 'slider') {
      const n = Number(v)
      out[f.name] = Number.isFinite(n) ? n : v
    } else if (f.type === 'switch' || f.type === 'boolean') {
      out[f.name] = v === true || v === 'true'
    } else {
      out[f.name] = v
    }
  }
  return out
}

// ── the variant axes (the pass-along law, 2026-09-12: "the card-ui
//    package is supposed to pass along the model, variant, and quant
//    fields") — the old flowCardAxes/flowAxisRows law, translated to
//    the SERVED shape alone: the flattened rows carry the whole chain
//    (a Quant cell's `owner` IS the Variant filter — no catalog matrix
//    needed client-side). PURE projections only; the selects render in
//    form.tsx's ModelAxes. ─────────────────────────────────────────────

/** The Variant axis' rows (group 'Variant', served order). */
export function variantRows(spec: FormSpecDoc): VariantRow[] {
  return (spec.variants ?? []).filter((v) => v.group === 'Variant')
}

/** The Quant cells composing with a variant — THE CHAIN (one
 *  direction: variant filters quant). Cells with no `owner` compose
 *  with every variant (an unowned cell is family-wide). */
export function quantRowsFor(spec: FormSpecDoc, variantId: string | null): VariantRow[] {
  return (spec.variants ?? []).filter((v) =>
    v.group === 'Quant' && (v.owner === undefined || v.owner === '' || v.owner === variantId))
}

/** The Model select's options — the distinct model ROUTES the matrix
 *  can land on: the spec root's family + every row's defaults.model
 *  (dedup, first-seen order; the family leads). */
export function modelChoices(spec: FormSpecDoc): string[] {
  const out: string[] = []
  const push = (m: unknown): void => {
    if (typeof m !== 'string' || m === '') return
    if (!out.includes(m)) out.push(m)
  }
  push(spec.model)
  for (const v of spec.variants ?? []) push(v.defaults['model'])
  return out
}

/** THE ACTIVE-ENTRY LAW (activeVariantId, simplified to the served
 *  shape): a row is active when its re-pointed model (defaults.model
 *  ?? route) matches the held `model` value. Quant rows additionally
 *  chain — active only under the active variant. Nothing matches →
 *  undefined (the caller falls to the first row — the catalog's
 *  first-declared law). */
export function activeVariantId(spec: FormSpecDoc, values: SpecValues, group: 'Variant' | 'Quant'): string | undefined {
  const held = typeof values['model'] === 'string' ? values['model'] as string : undefined
  if (held === undefined) return undefined
  const rows = (spec.variants ?? []).filter((v) => v.group === group)
  for (const v of rows) {
    const rePoint = typeof v.defaults['model'] === 'string' ? v.defaults['model'] as string : v.route
    if (rePoint !== held) continue
    if (group === 'Quant') {
      const ownerActive = activeVariantId(spec, values, 'Variant')
      if (v.owner !== undefined && v.owner !== '' && v.owner !== ownerActive) continue
    }
    return v.id
  }
  return undefined
}

/** A pick's full value patch — the old onPick law: the row's
 *  `defaults` overlay rides (model re-point + every resolver default),
 *  plus the durable axis keys themselves (`variant`, `quant`) so a
 *  reopened stage restores its selects. A Quant pick chains: the
 *  cell's own defaults overlay the active variant's resting state. */
export function axisPickPatch(spec: FormSpecDoc, row: VariantRow): SpecValues {
  const patch: SpecValues = { ...row.defaults }
  if (row.group === 'Variant') {
    patch['variant'] = row.id
    const quants = quantRowsFor(spec, row.id)
    if (quants.length > 0) patch['quant'] = quants[0].id
    else patch['quant'] = ''
  } else if (row.group === 'Quant') {
    patch['quant'] = row.id
  }
  return patch
}

/** Seed the axis keys for a fresh stage (the catalog's first-declared
 *  law: variant defaults to the FIRST declared variant, quant to its
 *  FIRST cell). Held values win (a reopened stage never re-seeds). */
export function seedAxisValues(spec: FormSpecDoc, held: SpecValues): SpecValues {
  const out: SpecValues = {}
  const variants = variantRows(spec)
  if (variants.length === 0) return out
  const heldVariant = typeof held['variant'] === 'string' ? held['variant'] as string : ''
  const v = variants.find((x) => x.id === heldVariant) ?? variants[0]
  out['variant'] = v.id
  const heldQuant = typeof held['quant'] === 'string' ? held['quant'] as string : ''
  const cells = quantRowsFor(spec, v.id)
  const q = cells.find((c) => c.id === heldQuant) ?? (cells.length > 0 ? cells[0] : undefined)
  out['quant'] = q !== undefined ? q.id : ''
  if (typeof held['model'] !== 'string' || held['model'] === '') {
    out['model'] = typeof v.defaults['model'] === 'string' && v.defaults['model'] !== ''
      ? v.defaults['model'] as string
      : (typeof spec.model === 'string' && spec.model !== '' ? spec.model : v.route)
  }
  return out
}

