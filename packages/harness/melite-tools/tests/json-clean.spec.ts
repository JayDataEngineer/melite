// jsonClean walls (vitest, pure — no I/O): every typeof arm, the -0
// normalization, sparse/undefined array slots, undefined-field elision,
// and reference cycles (the DSH lossless-JSON boundary).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { jsonClean } from '../src/json-clean.ts'

describe('jsonClean primitives', () => {
  test('null/string/boolean ride verbatim', () => {
    assert.equal(jsonClean(null), null)
    assert.equal(jsonClean('a'), 'a')
    assert.equal(jsonClean(true), true)
    assert.equal(jsonClean(false), false)
  })

  test('numbers ride except -0 which becomes 0', () => {
    assert.equal(jsonClean(42), 42)
    assert.equal(jsonClean(NaN), NaN)
    assert.equal(jsonClean(Infinity), Infinity)
    const neg = jsonClean(-0)
    assert.equal(neg, 0)
    assert.equal(Object.is(neg, -0), false)
  })

  test('bigint stringifies (lossless through the registry)', () => {
    assert.equal(jsonClean(10n), '10')
  })

  test('undefined/function/symbol become null', () => {
    assert.equal(jsonClean(undefined), null)
    assert.equal(jsonClean(() => 1), null)
    assert.equal(jsonClean(Symbol('s')), null)
  })
})

describe('jsonClean arrays', () => {
  test('dense values recurse; undefined slots become null', () => {
    assert.deepEqual(jsonClean([1, 'a', undefined, null]), [1, 'a', null, null])
  })

  test('sparse holes become null at the same length', () => {
    const out = jsonClean(new Array(3)) as unknown[]
    assert.equal(out.length, 3)
    assert.deepEqual(out, [null, null, null])
  })

  test('nested structures recurse', () => {
    assert.deepEqual(jsonClean({ a: [1, { b: 2n }] }), { a: [1, { b: '2' }] })
  })
})

describe('jsonClean objects', () => {
  test('undefined fields are elided; the rest recurse', () => {
    const fn = (): number => 1
    assert.deepEqual(
      jsonClean({ keep: 1, drop: undefined, nil: fn, nest: { x: undefined, y: 'y' } }),
      { keep: 1, nil: null, nest: { y: 'y' } },
    )
  })

  test('a direct cycle resolves to the same cleaned object', () => {
    const src: Record<string, unknown> = { a: 1 }
    src['self'] = src
    const out = jsonClean(src) as Record<string, unknown>
    assert.equal(out['a'], 1)
    assert.equal(out['self'], out)
  })

  test('a shared (diamond) reference resolves once, not twice', () => {
    const inner = { x: 1, skip: undefined as unknown }
    const out = jsonClean({ a: inner, b: inner }) as {
      a: unknown
      b: unknown
    }
    assert.deepEqual(out.a, { x: 1 })
    assert.equal(out.a, out.b)
  })

  test('functions nested in arrays become null', () => {
    assert.deepEqual(jsonClean([() => 1]), [null])
  })
})
