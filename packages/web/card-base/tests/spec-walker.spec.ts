// @vitest-environment happy-dom
// spec-walker.spec.ts — THE ENVELOPE WALKER (spec.ts half 1): the
// served schemastery envelope walks to derived SpecFields through
// ONE meta path; the declaration IS the UI contract — the walk
// reads, never invents.
import { expect, test } from 'vitest'

import {
  coerceFieldEdit,
  entryFieldsOfEnvelope,
  fieldsOf,
  fieldsOfEnvelope,
  isHybridKind,
  isOptionKind,
  kindScalarFieldsOfEnvelope,
  modOwnedFields,
  optionKeyOf,
  scalarKeyOf,
  schemaEnvelope,
  specDefaults,
  titleCaseId,
  type FormSpecDoc,
  type ModifierKind,
  type SchemaEnvelope,
  type SchemaRef,
  type SpecField,
} from '../src/spec.ts'

test('schemaEnvelope: fields assign ids in insertion order off the object root', () => {
  const env = schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', default: 'hi' } },
    steps: { type: 'number', meta: { default: 20, step: 1 } },
  })
  expect(env.uid).toBe(0)
  expect(env.refs[0]).toEqual({ type: 'object', dict: { prompt: 1, steps: 2 } })
  expect(env.refs[1]).toEqual({ type: 'string', meta: { description: 'Prompt', default: 'hi' } })
})

test('schemaEnvelope: string consts expand to const refs wired on the union list', () => {
  const env = schemaEnvelope({ sampler: { type: 'union', consts: ['euler', 'dpm'] } })
  expect(env.refs[1]).toMatchObject({ type: 'union' })
  const list = (env.refs[1] as { list: number[] }).list
  expect(list.length).toBe(2)
  expect(env.refs[list[0]]).toEqual({ type: 'const', value: 'euler' })
  expect(env.refs[list[1]]).toEqual({ type: 'const', value: 'dpm' })
})

test('schemaEnvelope: {value,label} const rows carry the label as description; labelless rows carry none', () => {
  const env = schemaEnvelope({
    res: { type: 'union', consts: [{ value: '1024', label: '1K' }, { value: '512' }] },
  })
  const list = (env.refs[1] as { list: number[] }).list
  expect(env.refs[list[0]]).toEqual({ type: 'const', value: '1024', meta: { description: '1K' } })
  expect(env.refs[list[1]]).toEqual({ type: 'const', value: '512' })
})

test('schemaEnvelope: a consts union without a type becomes a union; a typed node keeps its type', () => {
  const untyped = schemaEnvelope({ a: { consts: ['x'] } })
  expect(untyped.refs[1]!.type).toBe('union')
  const typed = schemaEnvelope({ a: { type: 'union', consts: ['x'] } })
  expect(typed.refs[1]!.type).toBe('union')
})

test('schemaEnvelope: non-string non-object consts mint no ref (the id still wires — the walk skips it)', () => {
  const env = schemaEnvelope({ a: { consts: [7, null] } })
  expect(env.refs[1]).toMatchObject({ type: 'union', list: [2, 3] })
  expect(env.refs[2]).toBeUndefined()
  expect(env.refs[3]).toBeUndefined()
  // the walk: dangling union ids never invent an option — the union stands bare
  expect(fieldsOfEnvelope(env)).toEqual([
    expect.objectContaining({ name: 'a', type: 'union', options: undefined }),
  ])
})

test('schemaEnvelope: the consts key is constructor-only — stripped when not an array', () => {
  const env = schemaEnvelope({ a: { type: 'string', consts: 'not-a-list' } })
  expect(env.refs[1]).toEqual({ type: 'string' })
})

test('fieldsOfEnvelope: nullish envelopes walk to no fields', () => {
  expect(fieldsOfEnvelope(null)).toEqual([])
  expect(fieldsOfEnvelope(undefined)).toEqual([])
})

test('fieldsOfEnvelope: a missing root walks to no fields (never a throw on a short envelope)', () => {
  expect(fieldsOfEnvelope({ uid: 9, refs: {} })).toEqual([])
})

test('fieldsOfEnvelope: a dangling dict id skips (the walker never invents a field)', () => {
  const env: SchemaEnvelope = { uid: 0, refs: { 0: { type: 'object', dict: { ghost: 99 } } } }
  expect(fieldsOfEnvelope(env)).toEqual([])
})

test('THE WALK: one meta path — native wins, the extra bag fills, label falls to the name', () => {
  const env = schemaEnvelope({
    steps: { type: 'number', meta: { description: '', default: 20, min: 1, max: 60, step: 1, extra: { group: 'Run', order: 2, required: true } } },
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { placeholder: 'a cat', tooltip: 'tip', zone: 'top', visible_when: 'mode=pro', columns: 2, width: 1 } } },
    nameless: { type: 'boolean', meta: {} },
  })
  const fields = fieldsOfEnvelope(env)
  // declared order 2 sorts after undeclared (0), insertion breaks ties
  expect(fields.map((f) => f.name)).toEqual(['prompt', 'nameless', 'steps'])
  const steps = fields.find((f) => f.name === 'steps')!
  expect(steps).toMatchObject({ label: 'steps', type: 'seed', default: 20, min: 1, max: 60, group: 'Run', order: 2, required: true })
  expect(steps.step).toBeUndefined()
  const prompt = fields.find((f) => f.name === 'prompt')!
  expect(prompt).toMatchObject({
    label: 'Prompt', type: 'text', placeholder: 'a cat', tooltip: 'tip',
    zone: 'top', visible_when: 'mode=pro', columns: 2, width: 1,
  })
  expect(fields.find((f) => f.name === 'nameless')).toMatchObject({ label: 'nameless', type: 'boolean' })
})

test('THE WALK: meta carries group/zone/required when extra stays silent', () => {
  const env = schemaEnvelope({
    a: { type: 'string', meta: { group: 'Meta', zone: 'side', required: true, description: 'A' } },
  })
  expect(fieldsOfEnvelope(env)[0]).toMatchObject({ group: 'Meta', zone: 'side', required: true })
})

test('THE WALK: presentation derivation — slider, loras, the unknown type, the missing type', () => {
  const env = schemaEnvelope({
    cfg: { type: 'number', meta: { step: 0.5 } },
    bare: { type: 'number', meta: {} },
    bags: { type: 'array', meta: {} },
    weird: { type: 'path', meta: {} },
    typeless: { meta: {} },
  })
  const byName = Object.fromEntries(fieldsOfEnvelope(env).map((f) => [f.name, f.type]))
  expect(byName).toEqual({ cfg: 'slider', bare: 'slider', bags: 'loras', weird: 'path', typeless: 'string' })
})

test('THE WALK: the declared wtype wins over every derivation', () => {
  const env = schemaEnvelope({
    img: { type: 'string', meta: { extra: { wtype: 'image' } } },
    n: { type: 'number', meta: { step: 1, extra: { wtype: 'text' } } },
  })
  const byName = Object.fromEntries(fieldsOfEnvelope(env).map((f) => [f.name, f.type]))
  expect(byName).toEqual({ img: 'image', n: 'text' })
})

test('THE WALK: union-of-consts becomes a select; labels ride meta.description, ids stay raw', () => {
  const env = schemaEnvelope({
    sampler: { type: 'union', consts: [{ value: 'euler', label: 'Euler' }, 'dpm'] },
  })
  const f = fieldsOfEnvelope(env)[0]!
  expect(f.type).toBe('select')
  expect(f.options).toEqual([{ value: 'euler', label: 'Euler' }, 'dpm'])
})

test('THE WALK: null/undefined const members never become options; an option-less union is no select', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { a: 1, b: 2 } },
      1: { type: 'union', list: [3, 4, 5, 6] },
      2: { type: 'union', list: [] },
      3: { type: 'const', value: null },
      4: { type: 'const' },
      5: { type: 'string' },
      6: { type: 'const', value: 'ok', meta: { description: 'ok' } },
    },
  }
  const byName = Object.fromEntries(fieldsOfEnvelope(env).map((f) => [f.name, [f.type, f.options]]))
  expect(byName['a']).toEqual(['select', ['ok']])
  // an option-less union is no select — the union stands, options stay absent
  expect(byName['b']).toEqual(['union', undefined])
})

test('THE WALK: declared extra.options override the const labels (both spellings)', () => {
  const env = schemaEnvelope({
    a: { type: 'union', consts: ['x'], meta: { extra: { options: ['p', 'q'] } } },
    b: { type: 'string', meta: { extra: { options: [{ value: 'v', label: 'V' }, 7] } } },
  })
  const byName = Object.fromEntries(fieldsOfEnvelope(env).map((f) => [f.name, f.options]))
  expect(byName['a']).toEqual(['p', 'q'])
  expect(byName['b']).toEqual([{ value: 'v', label: 'V' }, '7'])
})

test('THE WALK: nullable pairs wire as the inner type with the OUTER meta', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { maybe: 1, maybe2: 5, pair: 8, lone: 10 } },
      1: { type: 'union', list: [2, 3], meta: { description: 'Maybe steps', default: 5 } },
      2: { type: 'const', value: null },
      3: { type: 'number', meta: { step: 1 } },
      5: { type: 'union', list: [6, 7], meta: { description: 'Trailing null' } },
      6: { type: 'string' },
      7: { type: 'const', value: null },
      8: { type: 'union', list: [9, 11] },
      9: { type: 'const', value: null },
      10: { type: 'union', list: [3] },
      11: { type: 'const', value: 'x' },
    },
  }
  const byName = Object.fromEntries(fieldsOfEnvelope(env).map((f) => [f.name, [f.type, f.label, f.options]]))
  // [null, X] and [X, null] both unwrap to the inner node — the walk
  // reads the UNWRAPPED node's meta (the served nullable shape keeps
  // the facts on the inner schema; a bare outer falls to the name)
  expect(byName['maybe']).toEqual(['seed', 'maybe', undefined])
  expect(byName['maybe2']).toEqual(['text', 'maybe2', undefined])
  // a null paired with a CONST never unwraps — the union stands and
  // walks its options (the null skips, the const offers); an unwrap
  // would have collapsed to the const itself
  expect(byName['pair']).toEqual(['select', 'pair', ['x']])
  // a one-long list is no pair — the union stands
  expect(byName['lone']![0]).toBe('union')
})

test('THE WALK: family scoping — foreign families skip, the unscoped walk keeps', () => {
  const env = schemaEnvelope({
    shared: { type: 'string', meta: {} },
    gated: { type: 'string', meta: { extra: { families: ['krea-2'] } } },
  })
  expect(fieldsOfEnvelope(env, 'other').map((f) => f.name)).toEqual(['shared'])
  expect(fieldsOfEnvelope(env, 'krea-2').map((f) => f.name)).toEqual(['shared', 'gated'])
  expect(fieldsOfEnvelope(env).map((f) => f.name)).toEqual(['shared', 'gated'])
})

test('THE WALK: non-array families never gate (never hide on a typo)', () => {
  const env = schemaEnvelope({ a: { type: 'string', meta: { extra: { families: 'krea-2' } } } })
  expect(fieldsOfEnvelope(env, 'other').map((f) => f.name)).toEqual(['a'])
})

test('THE HYBRID PROJECTION: the bag element dict projects; non-bags project empty', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { loras: 1, plain: 4, strength: 5 } },
      1: { type: 'array', inner: 2 } as SchemaRef,
      2: { type: 'object', dict: { type: 3, strength: 5 } },
      3: { type: 'string', meta: { description: 'Type' } },
      4: { type: 'string', meta: {} },
      5: { type: 'number', meta: { default: 0.8 } },
    },
  }
  expect(entryFieldsOfEnvelope(env, 'loras').map((f) => f.name)).toEqual(['type', 'strength'])
  expect(entryFieldsOfEnvelope(null, 'loras')).toEqual([])
  expect(entryFieldsOfEnvelope(env, 'missing')).toEqual([])
  expect(entryFieldsOfEnvelope(env, 'plain')).toEqual([])
  expect(entryFieldsOfEnvelope(env, 'strength')).toEqual([])
})

test('THE PACK-LEVEL PROJECTION: root scalars outside the bag project; the bag and arrays never ride', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { loras: 1, floor: 4, bags: 5 } },
      1: { type: 'array', inner: 2 } as SchemaRef,
      2: { type: 'object', dict: {} },
      4: { type: 'number', meta: { description: 'Floor', default: 0.5 } },
      5: { type: 'array' },
    },
  }
  expect(kindScalarFieldsOfEnvelope(env, 'loras').map((f) => f.name)).toEqual(['floor'])
  expect(kindScalarFieldsOfEnvelope(null, 'loras')).toEqual([])
})

test('modOwnedFields: the bag storages plus every absorbed envelope root name', () => {
  const spec = {
    form: 'x',
    features: { modifiers: [{ kind: 'lora', label: 'L', param_key: 'loras', cardinality: 'multi' }] },
    mod_schemas: {
      loras: { uid: 0, refs: { 0: { type: 'object', dict: { type: 1, strength: 2 } }, 1: {}, 2: {} } },
      dead: null,
    },
  } as unknown as FormSpecDoc
  expect([...modOwnedFields(spec)].sort()).toEqual(['loras', 'strength', 'type'])
  expect(modOwnedFields({ form: 'x' })).toEqual(new Set())
})

test('modOwnedFields: a rootless absorbed envelope contributes no names (never a throw)', () => {
  const spec = {
    form: 'x',
    features: { modifiers: [{ kind: 'lora', label: 'L', param_key: 'loras', cardinality: 'multi' }] },
    mod_schemas: { loras: { uid: 9, refs: {} }, other: undefined },
  } as unknown as FormSpecDoc
  expect([...modOwnedFields(spec)]).toEqual(['loras'])
})

test('THE KIND TESTS: option/hybrid/key/scalar read the served row, never the kind name', () => {
  const lora = { kind: 'lora', label: 'L', param_key: 'loras', cardinality: 'multi', options: [{ value: 'a', label: 'A' }] } as ModifierKind
  const mask = { kind: 'mask', label: 'M', param_key: 'mask', cardinality: 'one' } as ModifierKind
  const hybrid = { kind: 'controlnet', label: 'C', param_key: 'cn', cardinality: 'multi', entry: 'hybrid', option_key: 'type', scalar_key: 'weight', options: [] } as ModifierKind
  expect(isOptionKind(lora)).toBe(true)
  expect(isOptionKind(mask)).toBe(false)
  expect(isHybridKind(hybrid)).toBe(true)
  expect(isHybridKind(lora)).toBe(false)
  expect(optionKeyOf(hybrid)).toBe('type')
  expect(optionKeyOf(lora)).toBe('id')
  expect(optionKeyOf({ ...lora, option_key: '' })).toBe('id')
  expect(optionKeyOf({ ...lora, option_key: 7 } as unknown as ModifierKind)).toBe('id')
  expect(scalarKeyOf(hybrid)).toBe('weight')
  expect(scalarKeyOf(lora)).toBe('strength')
  expect(scalarKeyOf({ ...lora, scalar_key: '' })).toBe('strength')
})

test('titleCaseId: the eye gets prose, the door keeps the id', () => {
  expect(titleCaseId('krea-2')).toBe('Krea 2')
  expect(titleCaseId('euler_cfg-fast')).toBe('Euler Cfg Fast')
  expect(titleCaseId('INT8')).toBe('INT8')
  expect(titleCaseId('already Titled')).toBe('Already Titled')
  expect(titleCaseId('')).toBe('')
  expect(titleCaseId('--a__b  c--')).toBe('A B C')
})

test('specDefaults: declared non-null defaults seed; nulls and absents never invent', () => {
  const fields = [
    { name: 'steps', label: 's', type: 'seed', default: 20 },
    { name: 'n', label: 'n', type: 'text', default: null },
    { name: 'm', label: 'm', type: 'text' },
    { name: 'z', label: 'z', type: 'slider', default: 0 },
    { name: 'f', label: 'f', type: 'boolean', default: false },
  ] as SpecField[]
  expect(specDefaults(fields)).toEqual({ steps: 20, z: 0, f: false })
})

test('THE EDIT COERCION: numeric strings ride as numbers; poison rides verbatim; inherit stays undefined', () => {
  const num = { name: 'steps', label: 's', type: 'slider' } as SpecField
  const seed = { name: 'seed', label: 's', type: 'seed' } as SpecField
  const count = { name: 'n', label: 'n', type: 'number' } as SpecField
  const text = { name: 'prompt', label: 'p', type: 'text' } as SpecField
  expect(coerceFieldEdit(num, '3.5')).toBe(3.5)
  expect(coerceFieldEdit(seed, '42')).toBe(42)
  expect(coerceFieldEdit(count, ' 7 ')).toBe(7)
  expect(coerceFieldEdit(num, '')).toBe('')
  expect(coerceFieldEdit(num, '  ')).toBe('  ')
  expect(coerceFieldEdit(num, 'abc')).toBe('abc')
  expect(coerceFieldEdit(num, '1e3')).toBe(1000)
  expect(coerceFieldEdit(num, 5)).toBe(5)
  expect(coerceFieldEdit(text, '07')).toBe('07')
  expect(coerceFieldEdit(undefined, '07')).toBe('07')
  expect(coerceFieldEdit(num, undefined)).toBeUndefined()
  expect(coerceFieldEdit(undefined, undefined)).toBeUndefined()
})

test('fieldsOf: the card fields walk families-scoped to the served family', () => {
  const spec = {
    form: 'x',
    model: 'krea-2',
    schema: schemaEnvelope({
      shared: { type: 'string', meta: {} },
      gated: { type: 'string', meta: { extra: { families: ['krea-2'] } } },
    }),
  } as FormSpecDoc
  expect(fieldsOf(spec).map((f) => f.name)).toEqual(['shared', 'gated'])
  expect(fieldsOf({ form: 'x', schema: spec.schema }).map((f) => f.name)).toEqual(['shared', 'gated'])
  expect(fieldsOf({ form: 'x' })).toEqual([])
})

test('THE HYBRID PROJECTION: a dangling bag id projects empty (never a throw on a short envelope)', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: { 0: { type: 'object', dict: { loras: 99 } } },
  }
  expect(entryFieldsOfEnvelope(env, 'loras')).toEqual([])
})

test('THE HYBRID PROJECTION: a bag inner without its own dict projects empty', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { loras: 1 } },
      1: { type: 'array', inner: 2 } as SchemaRef,
      2: { type: 'object' },
    },
  }
  expect(entryFieldsOfEnvelope(env, 'loras')).toEqual([])
})

test('THE HYBRID PROJECTION: a non-object bag inner is no bag (never projected as one)', () => {
  const env: SchemaEnvelope = {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { loras: 1, bags: 4 } },
      1: { type: 'array', inner: 2 } as SchemaRef,
      2: { type: 'string' },
      4: { type: 'array', inner: 5 } as SchemaRef,
    },
  }
  expect(entryFieldsOfEnvelope(env, 'loras')).toEqual([])
  // an inner id that resolves to nothing is no bag either
  expect(entryFieldsOfEnvelope(env, 'bags')).toEqual([])
})

test('THE PACK-LEVEL PROJECTION: a rootless envelope projects empty (never a throw)', () => {
  expect(kindScalarFieldsOfEnvelope({ uid: 9, refs: {} }, 'loras')).toEqual([])
})
