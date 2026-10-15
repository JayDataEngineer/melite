/**
 * The run-status PURE laws' ragged arms + the catalog door's plane
 * (stroke 81: transport walls live in melite-card-view now; this
 * spec stays transport-free except the catalog's own door).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultFamilyForCard,
  fetchCardCatalogRows,
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

describe('the catalog door (GET /v1/model-catalog — the ONE reader, D6)', () => {
  it('the catalog fetch rides the read dial — the caller signal is ANDed, its lift still aborts the socket', async () => {
    const seen: Array<RequestInit | undefined> = []
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
      seen.push(init)
      return new Response(JSON.stringify({ cards: {} }), { status: 200 })
    }) as typeof fetch
    const ctrl = new AbortController()
    await fetchCardFamilies(ctrl.signal)
    // the X-E1 law (the card-base wire's shape): the socket carries a
    // composed bound, never the bare caller signal — and the caller's
    // lift propagates through the composition.
    expect(seen[0]?.signal).toBeInstanceOf(AbortSignal)
    expect(seen[0]?.signal).not.toBe(ctrl.signal)
    ctrl.abort()
    expect((seen[0]!.signal as AbortSignal).aborted).toBe(true)
  })

  it('concurrent cold starts share the one in-flight read (one GET total)', async () => {
    let calls = 0
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, 5))
      return new Response(JSON.stringify({ cards: { bare: { families: ['fam'] } } }), { status: 200 })
    }) as typeof fetch
    const [a, b] = await Promise.all([fetchCardFamilies(), fetchCardFamilies()])
    expect(calls).toBe(1)
    expect(a).toEqual({ bare: ['fam'] })
    expect(b).toEqual({ bare: ['fam'] })
  })
})

describe('the status law — ragged docs', () => {
  it('a missing stages array and an empty draft_id read honest; an out-of-vocabulary status THROWS (strictness fix 3)', () => {
    const row = readRunStatus('r1', { status: 'completed', draft_id: '' })
    expect(row.stages).toEqual([])
    expect(row.status).toBe('completed')
    expect(row.draftId).toBeNull()
    expect(() => readRunStatus('r1', { status: 42 })).toThrow(/outside the vocabulary/)
    expect(() => readRunStatus('r1', { status: 'bananized' })).toThrow(/outside the vocabulary/)
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

describe('the family currency — the ONE door\'s judgments', () => {
  it('a garbage catalog body refuses LOUD (the served plane misconfigured — never a silent empty table)', async () => {
    globalThis.fetch = vi.fn(async (): Promise<Response> => new Response('garbage{{{', { status: 200 }))
    await expect(fetchCardFamilies()).rejects.toThrow(/\/v1\/model-catalog: unreadable body/)
    // the refused read left nothing cached — the next caller re-reads
    await expect(defaultFamilyForCard('img-to-mesh')).rejects.toThrow(/unreadable body/)
  })

  it('a text body refuses loud too; ragged ROWS still distill honestly', async () => {
    globalThis.fetch = vi.fn(async (): Promise<Response> => new Response('"str"', { status: 200 }))
    await expect(fetchCardFamilies()).rejects.toThrow(/unreadable body/)
    globalThis.fetch = vi.fn(async (): Promise<Response> =>
      new Response(JSON.stringify({
        cards: {
          broken: 42,
          bare: { id: 'bare' },
          good: { id: 'good', families: ['fam', 7] },
        },
      }), { status: 200 }),
    )
    resetCardFamiliesCache()
    expect(await fetchCardFamilies()).toEqual({ bare: ['bare'], good: ['fam'] })
  })

  it('a reset mid-flight drops the stale resolve — the next read fetches fresh (never a refilled stale)', async () => {
    // the re-scan race: a read starts, the cache is dropped (models
    // re-scanned), a SECOND read starts on the cold cache, THEN the
    // stale answer lands. The stale answer must not refill the
    // cache — and it must not disturb the second seat either.
    let releaseStale!: (v: Response) => void
    let releaseFresh!: (v: Response) => void
    let calls = 0
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      calls += 1
      if (calls === 1) return new Promise<Response>((resolve) => { releaseStale = resolve })
      return new Promise<Response>((resolve) => { releaseFresh = resolve })
    })
    const stale = fetchCardCatalogRows()
    // the stale read is in flight (the fetch was called, no answer
    // yet) — now the re-scan drops the cache mid-flight…
    await vi.waitFor(() => { expect(calls).toBe(1) })
    resetCardFamiliesCache()
    // …and a second read starts cold (its own seat, its own fetch).
    const fresh = fetchCardCatalogRows()
    await vi.waitFor(() => { expect(calls).toBe(2) })
    // the stale answer lands FIRST (the orphan's finally finds a
    // foreign seat — it clears nothing but its own).
    releaseStale(new Response(JSON.stringify({ cards: { stale: { label: 'Stale' } } }), { status: 200 }))
    expect(await stale).toEqual({ stale: { label: 'Stale' } })
    // the fresh answer lands and caches — the cache never held
    // stale (one stale fetch, one fresh fetch, nothing more).
    releaseFresh(new Response(JSON.stringify({ cards: { fresh: { label: 'Fresh' } } }), { status: 200 }))
    expect(await fresh).toEqual({ fresh: { label: 'Fresh' } })
    expect(await fetchCardCatalogRows()).toEqual({ fresh: { label: 'Fresh' } })
    expect(calls).toBe(2)
  })
})
