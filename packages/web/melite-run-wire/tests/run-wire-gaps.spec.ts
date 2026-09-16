/**
 * The runs wire SSOT's second plane — the arms the first spec leaves
 * dark: the hand-rolled rpcId, the signal rides, the voice law's body
 * text, every malformed-frame refusal, the gone-verdict, the media
 * library, the catalog's ragged rows, and the poll's sleep/abort
 * cadence. Same mocked-fetch style as run-wire.spec.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultFamilyForCard,
  fetchCardFamilies,
  fetchLatestRunForDraft,
  fetchListRow,
  fetchMediaLibrary,
  fetchRunStageUrl,
  listRowMediaUrl,
  nextRpcId,
  pollRunStageUrl,
  probeRunGone,
  readRunStatus,
  resetCardFamiliesCache,
  startCardRun,
  toRunMediaUrl,
  wireCall,
} from '../src/index.ts'

function mockFetch(answers: unknown[]): void {
  let i = 0
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const answer = echoRpcId(answers[Math.min(i, answers.length - 1)], String(init?.body ?? '{}'))
    i += 1
    if (answer instanceof Response) return answer
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } })
  })
}

function ok(value: unknown): { type: string; rpcId: string; result: unknown } {
  return { type: 'server-response', rpcId: 'R', result: { ok: true, value } }
}

function refused(message: string): { type: string; rpcId: string; result: unknown } {
  return { type: 'server-response', rpcId: 'R', result: { ok: false, error: { message } } }
}

function echoRpcId(answer: unknown, body: string): unknown {
  if (typeof answer !== 'object' || answer === null || !('rpcId' in answer)) return answer
  let asked: unknown
  try {
    asked = (JSON.parse(body) as Record<string, unknown>)['rpcId']
  } catch {
    asked = undefined
  }
  return typeof asked === 'string' ? { ...answer, rpcId: asked } : answer
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetCardFamiliesCache()
})

describe('the hand-rolled rpcId (non-secure contexts)', () => {
  it('mints an rpc- id when the standard is absent', () => {
    vi.stubGlobal('crypto', undefined)
    expect(nextRpcId()).toMatch(/^rpc-/)
  })
})

describe('the signal ride', () => {
  it('wireCall forwards an explicit signal; the voice law reads the body first', async () => {
    const seen: Array<RequestInit | undefined> = []
    globalThis.fetch = vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
      seen.push(init)
      return new Response(JSON.stringify({ error: 'proxy says no' }), { status: 502 })
    })
    const ctrl = new AbortController()
    await expect(wireCall('runs/stop', { runId: 'r1' }, { signal: ctrl.signal })).rejects.toThrow('wire: proxy says no')
    expect(seen[0]?.signal).toBe(ctrl.signal)
  })

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

describe('every malformed frame refuses loud', () => {
  it('a refusal without a message carries the voice fallback', async () => {
    mockFetch([{ type: 'server-response', rpcId: 'R', result: { ok: false, error: { code: 1 } } }])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('wire: refused')
  })

  it('a non-object result is malformed', async () => {
    mockFetch([{ type: 'server-response', rpcId: 'R', result: 'nope' }])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('malformed result')
  })

  it('a non-object value is not a JSON object', async () => {
    mockFetch([ok(42)])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('not a JSON object')
    mockFetch([ok([1])])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('not a JSON object')
  })

  it('a transport-thrown non-Error is the failed-request arm, never a throw', async () => {
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      throw 'cable cut'
    })
    await expect(startCardRun({ model: 'x', params: {}, draftId: 'd' })).resolves.toEqual({
      refused: 'run request failed',
    })
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

describe('the gone-verdict (probeRunGone)', () => {
  it('a live run reads live', async () => {
    mockFetch([ok({ status: 'running', stages: [] })])
    await expect(probeRunGone('r1')).resolves.toBe('live')
  })

  it('a disavowed run with no list row is gone', async () => {
    mockFetch([refused('unknown run_id'), ok({ runs: [] })])
    await expect(probeRunGone('r9')).resolves.toBe('gone')
  })

  it('a disavowed run answers its list status (completed when the row names none)', async () => {
    mockFetch([refused('unknown run_id'), ok({ runs: [{ run_id: 'r1', status: 'failed' }] })])
    await expect(probeRunGone('r1')).resolves.toBe('failed')
    mockFetch([refused('unknown run_id'), ok({ runs: [{ run_id: 'r1' }] })])
    await expect(probeRunGone('r1')).resolves.toBe('completed')
  })

  it('a disavowed run whose list read dies on transport is gone too', async () => {
    mockFetch([refused('unknown run_id'), new Response('nope', { status: 502 })])
    await expect(probeRunGone('r9')).resolves.toBe('gone')
  })

  it('transport errors rethrow (not a verdict)', async () => {
    mockFetch([new Response('nope', { status: 502 })])
    await expect(probeRunGone('r1')).rejects.toThrow('HTTP 502')
  })
})

describe('the list law — ragged rows', () => {
  it('fetchListRow matches the id alias and skips junk rows', async () => {
    mockFetch([ok({ runs: [
      { run_id: 42 },
      { run_id: '' },
      { id: 'r7', status: 'completed' },
    ] })])
    const row = await fetchListRow('r7')
    expect(row?.['status']).toBe('completed')
    mockFetch([ok({ runs: [{ run_id: 42 }] })])
    await expect(fetchListRow('r7')).resolves.toBeNull()
  })

  it('a non-array runs answer is an empty list', async () => {
    mockFetch([ok({})])
    await expect(fetchListRow('r1')).resolves.toBeNull()
  })

  it('fetchRunStageUrl settles null when the list read dies on transport', async () => {
    mockFetch([refused('unknown run_id'), new Response('nope', { status: 502 })])
    await expect(fetchRunStageUrl('r1', 's_1')).resolves.toBeNull()
  })

  it('listRowMediaUrl skips junk artifacts and empty urls', () => {
    expect(listRowMediaUrl({})).toBeNull()
    expect(listRowMediaUrl({ artifacts: [null, 42, { url: '' }, { url: 'r1/a.png' }] })).toBe(
      '/melite-media/runs/r1/a.png',
    )
  })
})

describe('the adoption — ragged rows', () => {
  it('matches the id alias; missing created_at reads oldest', async () => {
    mockFetch([ok({ runs: [
      { id: 'r-alias', draft_id: 'd' },
      { run_id: 'r-new', draft_id: 'd', created_at: 5 },
    ] })])
    // r-alias (at 0) loses to the newer stamp; the alias still matched
    await expect(fetchLatestRunForDraft('d')).resolves.toBe('r-new')
    mockFetch([ok({ runs: [{ id: 'r-only', draft_id: 'd' }] })])
    await expect(fetchLatestRunForDraft('d')).resolves.toBe('r-only')
  })
})

describe('media/list — the runs-tree library', () => {
  it('keeps whole rows, drops junk', async () => {
    mockFetch([ok({ items: [
      { url: '/melite-media/runs/r1/a.png', name: 'a.png', kind: 'image', runId: 'r1' },
      null,
      { url: '/x.png', name: 'x.png' },
      'nope',
    ] })])
    await expect(fetchMediaLibrary('image')).resolves.toEqual([
      { url: '/melite-media/runs/r1/a.png', name: 'a.png', kind: 'image', runId: 'r1' },
    ])
  })

  it('a non-array items answer is an empty library', async () => {
    mockFetch([ok({})])
    await expect(fetchMediaLibrary('all')).resolves.toEqual([])
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

describe('the poll loop — sleep and abort', () => {
  it('a single-stage run answers under any label inside the poll', async () => {
    mockFetch([ok({ status: 'done', stages: [{ id: 'img-to-mesh', status: 'done', url: 'm.glb' }] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_9', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledWith('/melite-media/runs/r1/m.glb')
  })

  it('the default cadence rides without knobs (a pre-aborted signal never polls)', async () => {
    let fetched = false
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      fetched = true
      return new Response(JSON.stringify(ok({ status: 'running', stages: [] })), { status: 200 })
    })
    const ctrl = new AbortController()
    ctrl.abort()
    await pollRunStageUrl('r1', 's_1', { onUrl: vi.fn() }, ctrl.signal)
    expect(fetched).toBe(false)
  })

  it('sleeps through running polls; an abort mid-sleep ends it', async () => {
    mockFetch([ok({ status: 'running', stages: [] })])
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 10)
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 50 }, ctrl.signal)
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('an abort landing mid-fetch still ends the loop (the pre-seeded sleep)', async () => {
    let releaseFetch!: (v: unknown) => void
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          releaseFetch = (v: unknown) =>
            resolve(new Response(JSON.stringify(ok(v)), { status: 200, headers: { 'content-type': 'application/json' } }))
        }),
    )
    const ctrl = new AbortController()
    const done = pollRunStageUrl('r1', 's_1', { onUrl: vi.fn(), intervalMs: 50 }, ctrl.signal)
    await new Promise((r) => setTimeout(r, 10))
    ctrl.abort()
    releaseFetch({ status: 'running', stages: [] })
    await done
  })

  it('a doubly-refused run settles silent (the list disavows too)', async () => {
    mockFetch([refused('unknown run_id'), refused('no such row')])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).not.toHaveBeenCalled()
  })
})
