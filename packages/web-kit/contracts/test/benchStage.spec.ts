// benchStage.spec.ts — the normalizer's writers' array arm (the
// 2026-10-14 re-audit's ranked #3: no suite had ever handed
// normalizeBenchStages a GROUP row). Group rows ride as they are
// beyond the derived fields: the engine is never theirs, and a
// params bag that is not a real non-empty object falls away — the
// children are the row's only cargo. The single-row inputs degrade
// rides the same seat (an inputs array or null heals to {}).
import { describe, expect, test } from 'vitest'
import { normalizeBenchStage, normalizeBenchStages } from '../src/benchStage.ts'

describe('normalizeBenchStages: the group-row arm', () => {
  test('a children row drops its engine and its empty-shaped params; the children ride', () => {
    const rows = normalizeBenchStages([
      { id: 'g', card: 'group', children: [{ id: 'c1', card: 'tts' }] },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!['children']).toEqual([{ id: 'c1', card: 'tts' }])
    expect('engine' in rows[0]!).toBe(false)
    expect('params' in rows[0]!).toBe(false)
  })

  test('params shapes that are not a real object all fall away (null, string, empty object)', () => {
    for (const params of [null, 'not-an-object', {}]) {
      const rows = normalizeBenchStages([
        { id: 'g', children: [], params, engine: 'comfyui' },
      ])
      expect('params' in rows[0]!).toBe(false)
      expect('engine' in rows[0]!).toBe(false)
    }
  })

  test('a real params bag on a children row rides untouched', () => {
    const rows = normalizeBenchStages([
      { id: 'g', children: [{ id: 'c1' }], params: { note: 'kept' } },
    ])
    expect(rows[0]!['params']).toEqual({ note: 'kept' })
  })

  test('a non-array input is the empty bench (never a throw)', () => {
    expect(normalizeBenchStages(undefined)).toEqual([])
    expect(normalizeBenchStages('nope')).toEqual([])
    expect(normalizeBenchStages({})).toEqual([])
  })
})

describe('normalizeBenchStage: the single-row degrade', () => {
  test('inputs that are an array or null heal to the empty object', () => {
    for (const inputs of [[1, 2], null]) {
      const row = normalizeBenchStage({ id: 's', card: 'tts', inputs }, 0)
      expect(row['inputs']).toEqual({})
    }
  })
  test('an id-less row becomes addressable by its index', () => {
    const row = normalizeBenchStage({ card: 'tts' }, 3)
    expect(row['id']).toBe('s_3')
  })
})
