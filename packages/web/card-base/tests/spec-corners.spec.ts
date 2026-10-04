// spec-corners.spec.ts — batch 15: the spec walker's corner arms
// that no behavioral suite had spoken for (the schema-envelope
// const-union serialization, the visible_when grammar's empty-key
// guard, the lane accessors' no-lanes shapes, the stated merge's
// null-skip, and the stamper's illegal-Quant refusal).
import { describe, expect, it } from 'vitest'
import {
  axisStampOf,
  axisUnset,
  fieldVisible,
  laneBoundsFor,
  laneRelationsFor,
  laneViolations,
  schemaEnvelope,
  type FormSpecDoc,
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
