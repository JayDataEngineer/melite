// skill-index.spec.ts — THE NO-DUMP LAW (2026-09-21): melite_skill_index
// NEVER lists skill rows. The flat dump taught agents wrong paths
// (an agent scanned 63 rows, read a card-scoped generic instead of
// the family's lane doc, and ran a distilled turbo at 25 steps).
// The tool serves the BINDING VOCABULARY — families + cards + flow
// count, each row carrying its ENTRANCE id — and disclosure of
// actual skills flows through the owning surface (melite_load's
// tier-1 lines). These walls pin the vocabulary end to end.
import { test, describe } from 'vitest'
import assert from 'node:assert/strict'
import { skillIndex } from '../src/tools/skill-index.ts'
import type { EstateRequest } from '../src/estate.ts'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'

const exec = { signal: new AbortController().signal, sessionId: 's' } as never

function mockRequest(handle: (method: string, path: string) => unknown): { request: EstateRequest; calls: string[] } {
  const calls: string[] = []
  const request = (async (method: string, path: string) => {
    calls.push(method + ' ' + path)
    return handle(method, path)
  }) as unknown as EstateRequest
  return { request, calls }
}

describe('melite_skill_index — the static face', () => {
  test('the scan has one static face', () => {
    const tool = skillIndex((async () => ({})) as EstateRequest)
    assert.deepEqual(tool.presentCall!(), { card: 'generic', title: 'Skill index', kind: 'search' })
  })
})

describe('melite_skill_index execute — the binding vocabulary', () => {
  test('the vocabulary rides verbatim with a count echo', async () => {
    const payload = {
      count: 7,
      families: [{ id: 'krea-2', genre: 'image', skills: 1, entrance: 'model:krea-2' }], // seat serves it; the tool DROPS it
      cards: [{ id: 'image-gen', genre: 'image', skills: 0, entrance: 'card:image-gen' }],
      flows: { count: 5, ids: ['flow:a'] },
      note: 'skills bind to its owner',
    }
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/skills')
      return payload
    })
    const tool = skillIndex(seen.request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.equal(out.cards.length, 1)
    assert.equal(JSON.stringify(out).includes('krea-2'), false, 'THE CARD ABSTRACTION: family rows never ride')
    assert.deepEqual(out.cards, payload.cards)
    assert.deepEqual(out.flows, payload.flows)
    assert.equal(out.error, undefined)
  })

  test('a sparse payload scans empty (never a crash)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = skillIndex(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.equal(out.count, 0)
    assert.deepEqual(out.cards, [])
  })

  test('a legacy rows-only payload renders ZERO skill lines (the dump is dead)', async () => {
    // a seat still serving the OLD flat shape must not leak rows
    // through the tool: families/cards default empty, and the row
    // ids never ride the result.
    const { request } = mockRequest(() => ({ count: 2, skills: [{ id: 'card:image-gen:image-craft' }] }))
    const tool = skillIndex(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.equal(JSON.stringify(out).includes('image-craft'), false)
  })

  test('non-object args throw at the wrapper gate (presence contract)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = skillIndex(request)
    await assert.rejects(tool.execute(undefined as never, exec), ToolArgsError)
  })
})

describe('melite_skill_index render — the vocabulary, never rows', () => {
  const tool = skillIndex((async () => ({})) as EstateRequest)
  const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''

  test('an empty selection lists NOTHING — the discover pointer only', () => {
    assert.equal(text({}), 'melite_skill_index: THE CATALOG IS THE SELECTION — nothing is listed while the bench is empty. Call melite_discover (the paid door) to find a card or flow; craft rows appear here only for what the bench holds.')
  })

  test('cards render with their ENTRANCE ids; family rows NEVER render', () => {
    const out = text({
      count: 3,
      families: [
        { id: 'krea-2', genre: 'image', skills: 1, entrance: 'model:krea-2' },
        { id: 'music3', genre: 'audio', skills: 2, entrance: 'model:music3' },
      ], // served but DEAD at the render
      cards: [{ id: 'image-gen', genre: 'image', skills: 0, entrance: 'card:image-gen' }],
      flows: { count: 5, ids: [] },
    })
    assert.ok(out.includes('melite_skill_index: 3 skills across 1 card · 5 flows'), 'the header counts cards + flows only')
    assert.equal(out.includes('krea-2'), false, 'THE CARD ABSTRACTION: a family id never renders')
    assert.equal(out.includes('model:music3'), false)
    assert.ok(out.includes('  image-gen (image) — entrance card:image-gen, no skills'), 'card lines ride')
  })

  test('an entrance-less owner names no row id', () => {
    const out = text({ count: 1, families: [{ id: 'm3', genre: null, skills: 0, entrance: null }], cards: [], flows: { count: 0, ids: [] } })
    assert.equal(out.includes('m3'), false, 'family rows never render, entrance or not')
  })

  test('a refused scan renders REFUSED (the refusal is the honest answer)', () => {
    assert.equal(text({ error: 'seat says no' }), 'melite_skill_index REFUSED: seat says no')
  })

  test('rows-shaped junk NEVER renders skill lines (no phantom entries)', () => {
    const out = text({ count: 2, skills: [{ id: 'card:image-gen:image-craft' }], families: [], cards: [], flows: { count: 0, ids: [] } })
    assert.equal(out.includes('image-craft'), false, 'the legacy dump never rides the render')
  })

  test('card rows cover empty ids, genres, skill counts, and entrance forms', () => {
    const out = text({
      count: 5,
      cards: [
        { id: '', genre: 'image', skills: 0, entrance: 'card:empty' },
        { id: 'zero', genre: '', skills: 0, entrance: '' },
        { id: 'one', genre: 'audio', skills: 1, entrance: 'card:one' },
        { id: 'many', genre: null, skills: 3, entrance: null },
        { id: 'junk', genre: 4, skills: 'many', entrance: 8 },
        null,
      ],
      flows: { count: 1, ids: [] },
    })
    assert.ok(out.includes('6 cards'))
    assert.ok(out.includes('zero — no entrance doc'))
    assert.ok(out.includes('one (audio) — entrance card:one, 1 skill'))
    assert.ok(out.includes('many — no entrance doc'))
    assert.ok(out.includes('junk — no entrance doc'))
    assert.equal(out.includes('empty'), false)
  })
})
