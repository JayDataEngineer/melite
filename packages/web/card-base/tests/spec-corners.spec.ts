// spec-corners.spec.ts — batch 15: the spec walker's corner arms
// that no behavioral suite had spoken for (the schema-envelope
// const-union serialization, the visible_when grammar's empty-key
// guard, the lane accessors' no-lanes shapes, the stated merge's
// null-skip, and the stamper's illegal-Quant refusal).
import { describe, expect, it } from 'vitest'
import {
  axisPickPatch,
  axisStampOf,
  axisUnset,
  dropStaleReopenCarry,
  familyScopedAwayKeysOf,
  fieldVisible,
  laneBoundsFor,
  laneRelationsFor,
  laneViolations,
  mergeSwitchFrame,
  modelSwitchPatch,
  modOwnedFields,
  resolvedLaneCoordinate,
  reseatEnvelopeKeys,
  schemaEnvelope,
  seedAxisValues,
  seedRecipeStamp,
  seedUser,
  type FormSpecDoc,
  type FormVariantRow,
  type SpecField,
} from '../src/spec.ts'
import { laneContractOf } from '@melite/contracts/laneRelations'

describe('schemaEnvelope: the union-of-consts serialization', () => {
  it('a consts array becomes the node\'s list of const refs — strings verbatim, {value,label} rows with their label as description', () => {
    const env = schemaEnvelope({
      flavor: { meta: { description: 'Flavor' }, consts: ['sour', { value: 'sweet', label: 'Sweet' }] },
    })
    const node = env.refs[env.refs[0].dict!['flavor']!]
    expect(node.type).toBe('union')
    expect(node.list).toEqual([2, 3])
    expect(env.refs[2]).toEqual({ type: 'const', value: 'sour' })
    expect(env.refs[3]).toEqual({ type: 'const', value: 'sweet', meta: { description: 'Sweet' } })
  })

  it('a stated type survives the consts ride (only the typeless node defaults to union)', () => {
    const env = schemaEnvelope({
      preset: { type: 'string', consts: [{ value: 'x' }] },
    })
    expect(env.refs[env.refs[0].dict!['preset']!].type).toBe('string')
  })
})

describe('fieldVisible: the grammar\'s empty-key guard', () => {
  const f = (rule?: string): SpecField => ({ name: 'q', label: 'Q', type: 'text', visible_when: rule }) as SpecField
  it('a guard with an empty key (both = and !=) is a dead guard — never a hidden field', () => {
    expect(fieldVisible(f('=true'), {})).toBe(true)
    expect(fieldVisible(f('!=x'), { q: 'y' })).toBe(true)
  })
  it('the literal null want matches the unset face — and only the unset face', () => {
    expect(fieldVisible(f('q=null'), { q: '' })).toBe(true)
    expect(fieldVisible(f('q=null'), { q: undefined })).toBe(true)
    expect(fieldVisible(f('q=null'), { q: 'x' })).toBe(false)
    expect(fieldVisible(f('q!=null'), { q: 'x' })).toBe(true)
    expect(fieldVisible(f('q!=null'), { q: '' })).toBe(false)
  })
})

describe('the lane accessors\' no-lanes shapes', () => {
  const bare = { form: 'x', schema: schemaEnvelope({ prompt: { type: 'string', meta: { description: 'Prompt' } } }) } as never as FormSpecDoc

  it('a spec with no lanes plane serves no relations and no bounds', () => {
    expect(laneRelationsFor(bare, null)).toEqual([])
    expect(laneBoundsFor(bare, null)).toBe(null)
  })

  it('family relations and variant relations are both served (the DECL cascade)', () => {
    const lanes = laneContractOf({
      relations: { required: [{ fields: ['prompt'], cure: 'write the prompt' }] },
      variants: [
        { id: 'turbo', relations: { conflicts: [{ a: 'cfg', b: 'denoise', cure: 'drop cfg' }] } },
        { id: 'raw' },
      ],
    })
    const doc = { ...bare, lanes } as FormSpecDoc
    const family = laneRelationsFor(doc, null)
    expect(family).toHaveLength(1)
    expect((family[0] as { required?: unknown }).required).toBeDefined()
    const both = laneRelationsFor(doc, 'turbo')
    expect(both).toHaveLength(2)
    expect((both[1] as { conflicts?: unknown }).conflicts).toBeDefined()
    expect(laneRelationsFor(doc, 'raw')).toHaveLength(1)
  })

  it('a family that declares NEITHER relations NOR bounds serves the variant\'s own alone (both accessors\' empty-family arms)', () => {
    const lanes = laneContractOf({
      variants: [{ id: 'turbo', relations: { together: [{ fields: ['cfg'], cure: 'pair cfg' }] } }],
    })
    const doc = { ...bare, lanes } as FormSpecDoc
    const onlyVariant = laneRelationsFor(doc, 'turbo')
    expect(onlyVariant).toHaveLength(1)
    expect((onlyVariant[0] as { together?: unknown }).together).toBeDefined()
    expect(laneRelationsFor(doc, null)).toEqual([])
  })

  it('laneBoundsFor runs the numbers\' replace-law: the variant\'s own replaces per-field, the un-stated inherits', () => {
    const lanes = laneContractOf({
      bounds: { steps: { min: 1, max: 50 }, cfg: { min: 1, max: 10 } },
      variants: [
        { id: 'turbo', bounds: { steps: { min: 2, max: 10 } } },
        { id: 'raw' },
      ],
    })
    const doc = { ...bare, lanes } as FormSpecDoc
    // family + no variant pick: the family's own bounds
    expect(laneBoundsFor(doc, null)).toEqual({ steps: { min: 1, max: 50 }, cfg: { min: 1, max: 10 } })
    // the variant replaces steps, cfg inherits (numbers replace, never add)
    expect(laneBoundsFor(doc, 'turbo')).toEqual({ steps: { min: 2, max: 10 }, cfg: { min: 1, max: 10 } })
    // a variant that states no bounds rides the family's verbatim
    expect(laneBoundsFor(doc, 'raw')).toEqual({ steps: { min: 1, max: 50 }, cfg: { min: 1, max: 10 } })
    // a boundsless family with a bounds-carrying variant serves the variant's alone
    const solo = laneContractOf({ variants: [{ id: 'turbo', bounds: { steps: { min: 2, max: 10 } } }] })
    expect(laneBoundsFor({ ...bare, lanes: solo } as FormSpecDoc, 'turbo')).toEqual({ steps: { min: 2, max: 10 } })
  })
})

describe('laneViolations: the stated merge skips null stamps', () => {
  it('a null stamp on the base layer is inherit, not stated — the bench judges the same body', () => {
    const lanes = laneContractOf({
      relations: { required: [{ fields: ['prompt'], cure: 'write the prompt' }] },
      variants: [{ id: 'turbo' }],
    })
    const doc = {
      form: 'x',
      schema: schemaEnvelope({
        prompt: { type: 'string', meta: { description: 'Prompt' } },
        voice: { type: 'string', meta: { description: 'Voice' } },
      }),
      variants: [{ id: 'turbo', label: 'Turbo' }],
      lanes,
    } as never as FormSpecDoc
    const fields = Object.keys((doc.schema as unknown as { refs: Record<number, { dict?: Record<string, number> }> }).refs[0]!.dict!)
      .map((name): SpecField => ({ name, label: name, type: 'text' }))
    // voice: null rides the base (the variant's own "no persona"
    // stamp) — the merge skips it, and only the real refusal fires
    const violations = laneViolations(doc, fields, { variant: 'turbo', prompt: 'a cat' }, { voice: null })
    expect(violations).toEqual([])
  })
})

describe('axisUnset: the tri-state\'s clear face', () => {
  const spec = {
    form: 'x',
    schema: schemaEnvelope({ variant: { type: 'string', meta: { description: 'Variant' } } }),
    variants: [{ id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'r' }],
  } as never as FormSpecDoc
  it('only a materialized empty value on a declared axis key reads unset', () => {
    expect(axisUnset('variant', '', spec)).toBe(true)
    expect(axisUnset('variant', 'turbo', spec)).toBe(false)
    expect(axisUnset('variant', '', null)).toBe(false)
    expect(axisUnset('prompt', '', spec)).toBe(false)
  })
})

describe('axisStampOf: the illegal-Quant refusal', () => {
  it('a Quant row without its coordinate refuses loud, naming the owner honestly (empty when unowned)', () => {
    expect(() => axisStampOf({ id: 'fp8', label: 'FP8', group: 'Quant', defaults: {}, route: 'r' }))
      .toThrow(/illegal Quant row "fp8" \(owner ""\): no quant coordinate/)
    expect(() => axisStampOf({ id: 'int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'r', owner: 'raw' }))
      .toThrow(/illegal Quant row "int8" \(owner "raw"\): no quant coordinate/)
    // the legal coordinate stamps verbatim — never the composite id
    expect(axisStampOf({ id: 'raw__int8', label: 'Raw INT8', group: 'Quant', defaults: {}, route: 'r', quant: 'int8' })).toBe('int8')
  })
})

// ── THE WALKER'S SCHEMA-ROOT CORNERS (batch 16): a served doc whose
// schema root ref dangles (uid names no ref) and whose dict names
// missing refs degrade to empty walks — never a throw, never a
// phantom main face. ──
describe('the schema-root corners: a dangling root degrades to an empty walk', () => {
  const dangling = { uid: 9, refs: {} }

  it('modOwnedFields walks a dangling root as an empty main face — the modifier keys keep their seat', () => {
    const spec = {
      model: 'x',
      schema: dangling,
      features: { modifiers: [{ param_key: 'mk' }] },
    } as never as FormSpecDoc
    expect(modOwnedFields(spec)).toEqual(new Set(['mk']))
  })

  it('familyScopedAwayKeysOf seats the arrival by LONGEST prefix (a composed catalog row) and skips refs the dict does not own', () => {
    const spec = {
      model: 'pixal3d',
      families: [{ id: 'pixal3d' }, { id: 'pixal3d-1536' }],
      schema: {
        uid: 0,
        refs: {
          0: { type: 'object', dict: { rig: 1, ghosted: 2 } },
          1: { type: 'string', meta: { extra: { families: ['pixal3d'] } } },
        },
      },
    } as never as FormSpecDoc
    // the arrival names the LONGER boarded atom ('pixal3d-1536-int8')
    // — the longest-prefix law seats that base, so the base-family
    // rig departs
    expect(familyScopedAwayKeysOf(spec, 'pixal3d-1536-int8')).toEqual(new Set(['rig']))
    // the shorter arrival keeps the rig; the missing ref degrades to
    // unscoped on every arrival
    expect(familyScopedAwayKeysOf(spec, 'pixal3d')).toEqual(new Set())
    // an arrival NO boarded atom claims keeps ITSELF as the base —
    // every family-scoped field of the boarded families departs
    expect(familyScopedAwayKeysOf(spec, 'unrelated-model')).toEqual(new Set(['rig']))
  })

  it('familyScopedAwayKeysOf walks a dangling root as an empty dict — nothing is ever family-scoped-away', () => {
    const spec = { model: 'x', schema: dangling } as never as FormSpecDoc
    expect(familyScopedAwayKeysOf(spec, 'x')).toEqual(new Set())
  })

  it('modelSwitchPatch walks a dangling root as an EMPTY mod bag — the envelope vocabulary still dies with the model', () => {
    const spec = {
      model: 'old',
      schema: dangling,
      params: ['prompt'],
      variants: [{
        id: 'a', label: 'A', group: 'Variant', defaults: {}, route: 'r',
        sampler_envelope: { steps: [1, 4] },
      }],
    } as never as FormSpecDoc
    const patch = modelSwitchPatch(spec, 'new-family', { prompt: 'x', loras: ['l'] }, { params: ['prompt'] } as never as FormSpecDoc)
    // the envelope key is the departing family's word; the bag walk
    // finds nothing to null (no dict); the row's own axis departs as
    // a null (a switch clears the axes); the shared word rides
    expect(patch).toEqual({ model: 'new-family', steps: null, variant: null })
  })
})

// ── THE SEED CORNERS (batch 16): an empty or absent matrix seeds
// NOTHING (the empty-selection law); a non-string axis value rides
// the pass-along law; a coherent held coordinate never ghosts. ──
describe('the seed corners: an empty matrix is unstated, a non-string rides', () => {
  const mx = {
    form: 'x',
    model: '',
    features: { variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } } },
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'r' },
      { id: 'int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'r2', quant: 'int8', owner: 'turbo' },
    ],
  } as never as FormSpecDoc

  it('seedAxisValues seeds NOTHING over an absent matrix and an empty pool — an axis with no composing row is unstated, never stated-empty', () => {
    const noVariants = { model: '', features: mx.features } as never as FormSpecDoc
    expect(seedAxisValues(noVariants, {})).toEqual({})
    expect(seedAxisValues({ ...mx, variants: [] } as never as FormSpecDoc, {})).toEqual({})
  })

  it('seedUser rides a non-string axis value verbatim (the pass-along law never ghosts a number), and ghosts only a string no composing chain names', () => {
    const empty = { model: '', features: mx.features, variants: [] } as never as FormSpecDoc
    expect(seedUser(empty, { variant: 42 })).toEqual({ variant: 42 })
    // a coherent held coordinate composes on both axes — nothing drops
    expect(seedUser(mx, { variant: 'turbo', quant: 'int8' })).toEqual({ variant: 'turbo', quant: 'int8' })
    // a string no composing row names IS a ghost: the cell departs with
    // its variant unstated, the pass-along number above it survives
    expect(seedUser(empty, { variant: 42, quant: 'int8' })).toEqual({ variant: 42 })
  })

  it('a Recipe default naming no composing row stamps NOTHING (the birth-stamp blank law)', () => {
    const spec = {
      features: { variant_groups: { Recipe: { label: 'Recipe', default: 'ghost-row' } } },
      variants: [{ id: 'author-base', label: 'A', group: 'Recipe', defaults: { steps: 50 }, route: 'r' }],
    } as never as FormSpecDoc
    const seeds = { steps: 20 }
    expect(seedRecipeStamp(spec, seeds)).toBe(seeds)
  })
})

// ── THE RESEAT CORNERS (batch 16): a malformed envelope entry skips
// its judgment (never a NaN clamp); an empty pool reconciles the
// picked row against its OWN envelope. ──
describe('the reseat corners: malformed envelopes skip, empty pools fall back to the row', () => {
  it('a non-array range and non-number bounds are skipped — the judgeable key still clamps into its declared range', () => {
    const spec = {
      variants: [{
        id: 'v', label: 'V', group: 'Variant', defaults: {}, route: 'r',
        sampler_envelope: { broken: 'oops', trio: [1, 2, 3], words: ['a', 'b'], steps: [4, 8] },
      }],
    } as never as FormSpecDoc
    const seated = reseatEnvelopeKeys(spec, { variant: 'v', steps: 99 })
    expect(seated.steps).toBe(8)
    // the malformed keys never judged — nothing was invented for them
    expect(Object.keys(seated).sort()).toEqual(['steps', 'variant'])
  })

  it('an empty pool (an all-Recipe matrix) reconciles the pick against the PICKED row own envelope — the clamp still lands', () => {
    const spec = { variants: [] } as never as FormSpecDoc
    const row = { id: 'cut', label: 'Cut', group: 'Recipe', defaults: { cfg: 9 }, route: 'r', sampler_envelope: { cfg: [1, 2] } } as never as FormVariantRow
    expect(axisPickPatch(spec, row, { cfg: 9 })).toEqual({ cfg: 2 })
  })

  it('an envelope-less departure rides the seed VERBATIM — the reseat nulls nothing it cannot judge', () => {
    const spec = { variants: [{ id: 'v', label: 'V', group: 'Variant', defaults: {}, route: 'r' }] } as never as FormSpecDoc
    const seeded = { variant: 'v', cfg: 3.5 }
    expect(reseatEnvelopeKeys(spec, seeded)).toBe(seeded)
  })
})

// ── THE DEPARTED-PRESET CORNERS (batch 16): the D4 reseat reads the
// held durable stamp through the sibling roster — a stamp naming the
// INCOMING row is no departure; one naming a sibling unstated its
// residue; an absent matrix walks an empty roster. ──
describe('the departed-preset corners: the held stamp names the departure', () => {
  const spec = {
    features: { variant_groups: { Recipe: { label: 'Recipe' } } },
    variants: [
      { id: 'author-base', label: 'A', group: 'Recipe', defaults: { steps: 50 }, route: 'r' },
      { id: 'final-cut', label: 'F', group: 'Recipe', defaults: { cfg: 4 }, route: 'r' },
    ],
  } as never as FormSpecDoc

  it('a stamp naming the PICKED row itself is no departure — the row stamps, nothing unstates', () => {
    const row = { id: 'author-base', label: 'A', group: 'Recipe', defaults: { steps: 50 }, route: 'r' } as FormVariantRow
    expect(axisPickPatch(spec, row, { recipe: 'author-base', steps: 50 })).toEqual({ steps: 50 })
  })

  it('a stamp naming a SIBLING row unstated its residue (the deep-equal departure) and the new pick stamps', () => {
    const row = { id: 'final-cut', label: 'F', group: 'Recipe', defaults: { cfg: 4 }, route: 'r' } as FormVariantRow
    expect(axisPickPatch(spec, row, { recipe: 'author-base', steps: 50 })).toEqual({ cfg: 4, steps: null })
  })

  it('a doc without variants still picks its row — the reseat walks an empty sibling roster', () => {
    const bare = { model: 'x' } as never as FormSpecDoc
    const row = { id: 'cut', label: 'Cut', group: 'Recipe', defaults: { steps: 5 }, route: 'r' } as FormVariantRow
    expect(axisPickPatch(bare, row, { recipe: 'prev', steps: 5 })).toEqual({ steps: 5 })
  })
})

// ── THE SAME-COORDINATE REPAIR (batch 17): a pick that does not
// re-key the resolved lane is a no-op in the carry drop — the
// authored carry stands, nothing nulls, nothing guesses. ──
describe('the same-coordinate repair: a no-rekey pick drops no carry', () => {
  const spec = {
    model: 'synth',
    lanes: { base: ['prompt'], variants: {} },
    features: { variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } } },
    variants: [
      { id: 'big', label: 'Big', group: 'Variant', defaults: { steps: 20 }, route: 'synth-big' },
      { id: 'big__large', label: 'L', group: 'Quant', defaults: {}, route: 'synth-big-large', quant: 'large', owner: 'big' },
    ],
  } as never as FormSpecDoc
  const row = { id: 'big', label: 'Big', group: 'Variant', defaults: { steps: 20 }, route: 'synth-big' } as FormVariantRow

  it('re-picking the seated coordinate keeps the authored carry stated — the drop law never fires on its own lane', () => {
    const patch = axisPickPatch(spec, row, { variant: 'big', quant: 'large', persona: 'keeper' })
    expect(patch).toEqual({ variant: 'big', quant: 'large' })
    expect(patch['persona']).toBeUndefined()
  })
})

// ── THE ADDRESS CORNER (batch 16): a head-spelling address (the
// served key IS a boarded family) claims NO cell — the unstated
// quant rides the variant's first cell, never a guessed claim. ──
describe('the address corner: a family-head claim is pool-first, cell-unclaimed', () => {
  it('resolvedLaneCoordinate rides the unstated quant to the variant FIRST cell when the address names the family itself', () => {
    const spec = {
      model: 'synth',
      families: [{ id: 'synth' }],
      variants: [
        { id: 'big', label: 'Big', group: 'Variant', defaults: {}, route: 'synth-big' },
        { id: 'big__large', label: 'Large', group: 'Quant', defaults: {}, route: 'synth-big-large', quant: 'large', owner: 'big' },
      ],
    } as never as FormSpecDoc
    expect(resolvedLaneCoordinate(spec, { variant: 'big' })).toEqual({ variantId: 'big', quantId: 'large' })
  })

  it('a foreign address over a CELL-LESS variant claims no cell from an absent plane — the coordinate is the variant alone', () => {
    const spec = {
      model: 'unrelated',
      families: [{ id: 'synth' }],
      variants: [{ id: 'big', label: 'Big', group: 'Variant', defaults: {}, route: 'synth-big' }],
    } as never as FormSpecDoc
    expect(resolvedLaneCoordinate(spec, { variant: 'big' })).toEqual({ variantId: 'big', quantId: null })
  })
})

// ── THE SWITCH-FRAME MERGE (batch 17): the patch's null verdicts
// beat the caller's frame — a re-planted departed stamp dies at the
// merge, every other key rides caller-wins. ──
describe('mergeSwitchFrame: the null verdict beats the caller frame', () => {
  it('a frame re-planting a departed stamp dies; the patch stamps and untouched frame keys ride', () => {
    expect(mergeSwitchFrame({ steps: null, cfg: 4 }, { steps: 30, prompt: 'x' }))
      .toEqual({ steps: null, cfg: 4, prompt: 'x' })
  })
})

// ── THE REOPEN HEAL'S NO-DOC FACE (batch 16): a reopen without held
// params drops nothing — there is nothing to heal. ──
describe('dropStaleReopenCarry: the held-less reopen drops nothing', () => {
  it('held === undefined returns the empty null-set, never a throw', () => {
    expect(dropStaleReopenCarry({ model: 'x' } as never as FormSpecDoc, undefined)).toEqual({})
  })
})
