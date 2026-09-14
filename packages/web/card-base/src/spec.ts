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
 *  fields never carry a mod's param_key (the SubcardGrid law).
 *
 *  TWO KIND SHAPES (the wire, lane-read 2026-09-12 — operator: "the
 *  mod system is core, never hardcoded"):
 *   - OPTION kinds (lora): a served options catalog + strength; the
 *     entry is { id, strength }.
 *   - FIELD kinds (mask): the kind's OWN fields (full spec fields —
 *     image squares, selects, sliders); the entry IS the params
 *     object. The leaf editor renders kind.fields through the same
 *     constructor atoms — the fields NEVER ride the card form flat. */
export interface ModifierKind {
  kind: string
  label: string
  param_key: string
  cardinality: string
  max_stack?: number
  fields?: SpecField[]
  options?: Array<{ value: string; label: string; tooltip?: string; defaults?: { strength?: number } }>
}

/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
 *  served modifier kind owns — its fields' names plus its param_key
 *  (the bag storage). CardForm EXCLUDES these from the flat param
 *  groups: mod params render ONLY inside the mod system. PURE. */
export function modOwnedFields(spec: FormSpecDoc): Set<string> {
  const owned = new Set<string>()
  for (const k of spec.features?.modifiers ?? []) {
    owned.add(k.param_key)
    for (const f of k.fields ?? []) owned.add(f.name)
  }
  return owned
}

/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
 *  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
export function isOptionKind(k: ModifierKind): boolean {
  return (k.options ?? []).length > 0
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

/** One served card recipe (the form-spec `recipes` map — the card's
 *  own catalog projected: label/description/params. The engine
 *  layers params under explicit values at compose (applyRecipe);
 *  the constructor stamps the same overlay into the VISIBLE fields
 *  so the dropdown's effect reads on the card, not just in the run.
 *  Lora stacks stay server-applied (they render in the mod
 *  surface, never as flat params). */
export interface CardRecipeRow {
  label?: string
  description?: string
  params?: Record<string, unknown>
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
   *  (served when the family boards mod packs). Also carries the
   *  variant-axis GROUPS contract (variant_groups, the old wire law:
   *  label/tooltip/filters_on per group) when the family declares
   *  axis groups. */
  features?: {
    modifiers?: ModifierKind[]
    variant_groups?: Record<string, { label?: string, tooltip?: string, filters_on?: string | null, default?: string }>
  }
  /** THE CARD-RECIPE CATALOG (the card's own `recipes` emission —
   *  null when the card declares none). The constructor stamps the
   *  picked recipe's params into the visible fields (recipePickPatch
   *  below); the engine layers the same params at compose. */
  recipes?: Record<string, CardRecipeRow> | null
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
//    (a cell's `owner` IS its filter — one direction). The axes are
//    the SERVED GROUPS, ALL of them (Variant, Quant, Recipe, Precision,
//    … — the declaration's vocabulary, never a hardcoded list; the
//    operator's lane proof 2026-09-12 caught the hardcoded Quant-only
//    list dropping seedvr2's and qwen's Recipe/Precision axes). PURE
//    projections only; the selects render in form.tsx's ModelAxes. ───

/** THE RECIPE-YIELD LAW (operator, 2026-09-14: "IMG GEN UI CARD
 *  HAS TWO RECIPES"): the card's own `recipe` schema field and the
 *  family matrix's `Recipe` axis group share the `recipe` values key
 *  — two selects writing one key (the family's pick clobbers the
 *  card's, and the axis seed stamps `default` where the card catalog
 *  only knows `standard/...`). When the card declares its own recipe
 *  field, the card OWNS the name: the family axis yields (hidden,
 *  never seeded). PURE. */
export function cardOwnsRecipe(spec: FormSpecDoc): boolean {
  return (spec.fields ?? []).some((f) => f.name === 'recipe')
}

/** The axis groups in declaration order: features.variant_groups'
 *  key order when the door serves it, else the rows' distinct groups
 *  in first-seen order. Empty group names never ride. The Recipe
 *  group yields when the card owns its own recipe field (the
 *  recipe-yield law above). */
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
  if (cardOwnsRecipe(spec)) return groups.filter((g) => g !== 'Recipe')
  return groups
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
  const patch: SpecValues = { ...row.defaults }
  const groups = axisGroups(spec)
  const at = groups.indexOf(row.group)
  const active: Record<string, string | undefined> = {}
  for (const g of groups) {
    if (g === row.group) active[g] = row.id
    else if (typeof row.defaults['model'] === 'string') active[g] = undefined
  }
  patch[axisKey(row.group)] = row.id
  // ONLY the axes BELOW the picked one re-seed (the chain runs one
  // direction); the axes above stay exactly as the user set them.
  for (const g of groups.slice(at + 1)) {
    const composing = composingRows(spec, g, active)
    if (composing.length > 0) patch[axisKey(g)] = composing[0].id
    else patch[axisKey(g)] = ''
  }
  return patch
}

/** Heal a bench POISONED by the double-recipe era (the recipe-yield
 *  law's migration half): when the card owns its recipe field, a held
 *  `recipe` value naming a FAMILY recipe row (`default`, `realism` —
 *  stamped by the old axis seed) is not a card recipe. Fall it back
 *  to the field default so the next Run patches the healed value and
 *  the bench converges. Judged against the field's own options when
 *  the emission carries them; option-less emissions pass through
 *  untouched (never refuse on a guess). PURE. */
export function healOwnedRecipe(spec: FormSpecDoc, values: SpecValues): SpecValues {
  if (!cardOwnsRecipe(spec)) return values
  const field = (spec.fields ?? []).find((f) => f.name === 'recipe')
  const cur = values['recipe']
  if (typeof cur !== 'string' || cur === '') return values
  const opts = (field?.options ?? []).map((o) => typeof o === 'string' ? o : o.value)
  if (opts.length > 0 && !opts.includes(cur)) {
    const next = { ...values }
    if (field?.default !== undefined && field.default !== null) next['recipe'] = field.default
    else delete next['recipe']
    return next
  }
  return values
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
  for (const g of groups) {
    // THE CHAIN (one direction, the activeRowId law): only composing
    // rows are pickable — when nothing composes (raw owns no quant
    // cells) the axis rests EMPTY, never a foreign row (int8 belongs
    // to turbo; seating it under raw is turbo-for-anima again).
    const composing = composingRows(spec, g, active)
    if (composing.length === 0) {
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
    Object.assign(patch, row.defaults)
    patch[axisKey(g)] = row.id
    active[g] = row.id
  }
  patch['model'] = model
  return patch
}
/** A recipe pick's full write (THE VISIBLE RECIPE LAW, operator
 *  2026-09-14: "when I do dropdown there, it should change
 *  parameters"): picking the card's recipe dropdown stamps the
 *  catalog params into the values — the SAME cascade the engine
 *  enforces at compose (recipe under explicit), mirrored visibly.
 *  `owned` is the session's stamp ledger (key → recipe key): a
 *  recipe fills a param when it is recipe-owned (re-stamp moves it),
 *  missing, or still at the field default (untouched) — a value the
 *  user set wins and is never clobbered. Keys owned by a PREVIOUS
 *  recipe that the new one does not define fall back to the field
 *  default ('' when the field declares none) so stale stamps lift
 *  instead of accumulating. The recipe key itself always rides the
 *  patch. PURE — the caller writes every patch entry through
 *  onEdit and keeps the returned ledger. */
export function recipePickPatch(
  spec: FormSpecDoc,
  key: string,
  values: SpecValues,
  owned: Record<string, string>,
): { patch: SpecValues, owned: Record<string, string> } {
  const patch: SpecValues = { recipe: key }
  const nextOwned: Record<string, string> = { ...owned }
  const overlay: Record<string, unknown> = spec.recipes?.[key]?.params ?? {}
  const defaults = specDefaults(spec.fields)
  for (const [k, r] of Object.entries(owned)) {
    if (r !== key && !(k in overlay)) {
      patch[k] = k in defaults ? defaults[k] : ''
      delete nextOwned[k]
    }
  }
  for (const [k, v] of Object.entries(overlay)) {
    const cur = values[k]
    if (nextOwned[k] !== undefined || cur === undefined
        || (k in defaults && cur === defaults[k])) {
      patch[k] = v
      nextOwned[k] = key
    }
  }
  return { patch, owned: nextOwned }
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
    // the model rests on the spec family unless a seeded row re-points
    let model = typeof spec.model === 'string' && spec.model !== '' ? spec.model : ''
    for (const g of groups) {
      const row = rowsFor(spec, g).find((x) => x.id === active[g])
      if (row !== undefined && typeof row.defaults['model'] === 'string' && row.defaults['model'] !== '') {
        model = row.defaults['model'] as string
        break
      }
    }
    if (model !== '') out['model'] = model
  }
  return out
}

