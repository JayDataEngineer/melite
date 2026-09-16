/**
 * The run-status PURE laws' ragged arms + the catalog door's plane
 * (stroke 81: transport walls live in melite-card-view now; this
 * spec stays transport-free except the catalog's own door).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultFamilyForCard,
  fetchCardFamilies,
  listRowMediaUrl,
  readRunStatus,
  resetCardFamiliesCache,
  toRunMediaUrl,
} from '../src/index.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetCardFamiliesCache()
})

describe('the catalog door (GET /v1/model-catalog)', () => {
  it('the catalog fetch forwards its signal too', async () => {
    const seen: Array<RequestInit | undefined> = []
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
      seen.push(init)
      return new Response(JSON.stringify({ cards: {} }), { status: 200 })
    }) as typeof fetch
    const ctrl = new AbortController()
    await fetchCardFamilies(ctrl.signal)
    expect(seen[0]?.signal).toBe(ctrl.signal)
  })
})

describe('the status law — ragged docs', () => {
  it('a missing stages array, a numeric status, and an empty draft_id read honest', () => {
    const row = readRunStatus('r1', { status: 42, draft_id: '' })
    expect(row.stages).toEqual([])
    expect(row.status).toBe('unknown')
    expect(row.draftId).toBeNull()
  })

  it('an empty-string stage url is left alone (never rewritten)', () => {
    const row = readRunStatus('r1', { status: 'failed', stages: [{ id: 's', status: 'error', url: '' }] })
    expect(row.stages[0]?.url).toBe('')
    expect(toRunMediaUrl('r1', '')).toBe('')
  })
})


describe('the list-row url law (pure)', () => {
  it('listRowMediaUrl skips junk artifacts and empty urls', () => {
    expect(listRowMediaUrl({})).toBeNull()
    expect(listRowMediaUrl({ artifacts: [null, 42, { url: '' }, { url: 'r1/a.png' }] })).toBe(
      '/melite-media/runs/r1/a.png',
    )
  })

  it('listRowMediaUrl skips object rows whose url is not a string (never a throw on drift)', () => {
    expect(listRowMediaUrl({ artifacts: [{ url: 7 }, { noUrl: true }] })).toBeNull()
    expect(listRowMediaUrl({ artifacts: [{ url: 7 }, { url: 'r1/a.png' }] })).toBe(
      '/melite-media/runs/r1/a.png',
    )
  })
})

describe('the family currency — ragged catalogs', () => {
  it('a garbage catalog body reads an empty table', async () => {
    globalThis.fetch = vi.fn(async (): Promise<Response> => new Response('garbage{{{', { status: 200 }))
    await expect(fetchCardFamilies()).resolves.toEqual({})
    await expect(defaultFamilyForCard('img-to-mesh')).resolves.toBe('img-to-mesh')
  })

  it('a non-object body and ragged rows distill honestly', async () => {
    globalThis.fetch = vi.fn(async (): Promise<Response> =>
      new Response(JSON.stringify({
        cards: {
          broken: 42,
          bare: { id: 'bare' },
          good: { id: 'good', families: ['fam', 7] },
        },
      }), { status: 200 }),
    )
    expect(await fetchCardFamilies()).toEqual({ bare: ['bare'], good: ['fam'] })
    globalThis.fetch = vi.fn(async (): Promise<Response> => new Response('"str"', { status: 200 }))
    resetCardFamiliesCache()
    await expect(fetchCardFamilies()).resolves.toEqual({})
  })
})
