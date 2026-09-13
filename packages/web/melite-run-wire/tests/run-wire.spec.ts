/**
 * The runs wire SSOT's unit plane — every verb against a mocked
 * fetch: the frame law, the status law (the ONE rewrite), the
 * single-stage fallback, the start doors' bodies, and the poll loop.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultFamilyForCard,
  fetchCardFamilies,
  fetchLatestRunForDraft,
  fetchListRow,
  fetchRunStageUrl,
  fetchRunTerminal,
  isTerminalRun,
  listArtifactMediaUrl,
  listRowMediaUrl,
  nextRpcId,
  pollRunStageUrl,
  readRunStatus,
  resetCardFamiliesCache,
  startCardRun,
  startFlowInlineRun,
  stopRun,
  toRunMediaUrl,
  wireCall,
  WireRefusedError,
} from '../src/index.ts'

/** One canned answer per call; frames are inspectable after. */
function mockFetch(answers: unknown[]): { calls: Array<{ url: string; body: Record<string, unknown> }> } {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  let i = 0
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> })
    const answer = echoRpcId(answers[Math.min(i, answers.length - 1)], calls, i)
    i += 1
    if (answer instanceof Response) return answer
    return new Response(JSON.stringify(answer), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  return { calls }
}

/** The server-response envelope for a value — the rpcId is rewritten
 *  to ECHO the request's (the frame's correlation law) once the mock
 *  has seen the call. */
function ok(value: unknown): { type: string; rpcId: string; result: unknown } {
  return { type: 'server-response', rpcId: 'R', result: { ok: true, value } }
}

/** Rewrite an answer's rpcId to the Nth observed request's. */
function echoRpcId(answer: unknown, calls: Array<{ body: Record<string, unknown> }>, index: number): unknown {
  if (typeof answer !== 'object' || answer === null || !('rpcId' in answer)) return answer
  const asked = calls[index]?.body['rpcId']
  return typeof asked === 'string' ? { ...answer, rpcId: asked } : answer
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the frame (wireCall)', () => {
  it('posts the client-request frame and returns the value object', async () => {
    const { calls } = mockFetch([ok({ run_id: 'r1' })])
    const row = await wireCall('runs/status', { runId: 'r1' })
    expect(row).toEqual({ run_id: 'r1' })
    expect(calls[0]?.url).toBe('/api/runs/status')
    expect(calls[0]?.body['type']).toBe('client-request')
    expect(calls[0]?.body['method']).toBe('runs/status')
    expect((calls[0]?.body['payload'] as Record<string, unknown>)['args']).toEqual({ runId: 'r1' })
  })

  it('a refusal throws the estate message verbatim', async () => {
    mockFetch([{ type: 'server-response', rpcId: 'R', result: { ok: false, error: { message: 'no model unit for model: x' } } }])
    await expect(wireCall('runs/start', { doc: {} })).rejects.toThrow('no model unit for model: x')
  })

  it('transport failures carry the caller voice (default wire)', async () => {
    mockFetch([new Response('nope', { status: 502 })])
    await expect(wireCall('runs/stop', { runId: 'r1' })).rejects.toThrow('wire: HTTP 502')
    mockFetch([new Response('nope', { status: 500 })])
    await expect(wireCall('runs/stop', { runId: 'r1' }, { voice: 'runs/stop' })).rejects.toThrow('runs/stop: HTTP 500')
  })

  it('a malformed frame refuses loud', async () => {
    mockFetch([{ surprise: true }])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('malformed response frame')
  })

  it('an rpcId mismatch is a channel surprise', async () => {
    // a RAW response (never rewritten by the echo) carrying a foreign id
    mockFetch([new Response(JSON.stringify({ type: 'server-response', rpcId: 'OTHER', result: { ok: true, value: {} } }), { status: 200 })])
    await expect(wireCall('runs/status', { runId: 'r1' })).rejects.toThrow('malformed response frame')
  })

  it('nextRpcId is unique per call', () => {
    expect(nextRpcId()).not.toBe(nextRpcId())
  })
})

describe('the status law (readRunStatus)', () => {
  it('bare run-relative urls ride the media route once; absolute pass verbatim', () => {
    const row = readRunStatus('r/1', {
      status: 'running',
      draft_id: 'bench-main',
      stages: [
        { id: 's_1', status: 'running', url: 'out/mesh.glb' },
        { id: 's_2', status: 'done', url: '/melite-media/runs/r%2F1/flat.png' },
        { id: 's_3', status: 'done', url: 'https://x/y.png' },
        { id: 's_4', status: 'queued' },
      ],
    })
    expect(row.stages[0]?.url).toBe('/melite-media/runs/r%2F1/out/mesh.glb')
    expect(row.stages[1]?.url).toBe('/melite-media/runs/r%2F1/flat.png')
    expect(row.stages[2]?.url).toBe('https://x/y.png')
    expect(row.stages[3]?.url).toBeUndefined()
    expect(row.draftId).toBe('bench-main')
  })

  it('the tap fold rides through: live progress + activity kept, junk dropped', () => {
    // THE PROGRESS CARRY (2026-09-13, the operator's "forward the
    // comfyui progress webhooks like before"): well-formed
    // {value,max} + activity strings pass verbatim; malformed pairs
    // and empty strings drop (terminal rows carry none — the
    // finisher deletes).
    const row = readRunStatus('r1', {
      status: 'running',
      stages: [
        { id: 's_1', status: 'running', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' },
        { id: 's_2', status: 'running', progress: { value: 'x', max: 20 }, activity: '' },
      ],
    })
    expect(row.stages[0]?.progress).toEqual({ value: 7, max: 20 })
    expect(row.stages[0]?.activity).toBe('sampling 7/20')
    expect(row.stages[1]?.progress).toBeUndefined()
    expect(row.stages[1]?.activity).toBeUndefined()
  })

  it('a missing draft_id is null; terminal statuses are the seat vocabulary', () => {
    const row = readRunStatus('r1', { status: 'completed', stages: [] })
    expect(row.draftId).toBeNull()
    expect(isTerminalRun('completed')).toBe(true)
    expect(isTerminalRun('failed')).toBe(true)
    expect(isTerminalRun('stopped')).toBe(true)
    expect(isTerminalRun('running')).toBe(false)
  })

  // THE SILENT-FAILURE CURE (2026-09-13): runs/status serves the
  // ComfyUI refusal on stages[].error + the run-level error — the
  // reader must CARRY it, not drop it (a dropped reason reads as
  // "no response at all" in the UI).
  it('carries the stage error and the run-level error (the silent-failure cure)', () => {
    const row = readRunStatus('r/1', {
      status: 'failed',
      error: 'ComfyError: POST /prompt 400 value_not_in_list',
      stages: [
        { id: 'edit', status: 'error', url: '', error: "clip_name 'x' not in [14 clips]" },
        { id: 'clean', status: 'done', url: 'ok.png', error: '' },
      ],
    })
    expect(row.status).toBe('failed')
    expect(row.error).toBe('ComfyError: POST /prompt 400 value_not_in_list')
    expect(row.stages[0]?.error).toBe("clip_name 'x' not in [14 clips]")
    // empty-string errors are deleted (absent ≡ empty, never a
    // phantom "error:" caption on a healthy stage)
    expect(row.stages[1]?.error).toBeUndefined()
  })

  it('absent errors stay absent (no phantom keys on healthy rows)', () => {
    const row = readRunStatus('r1', {
      status: 'completed',
      stages: [{ id: 's', status: 'done', url: 'a.png' }],
    })
    expect(row.error).toBeUndefined()
    expect(row.stages[0]?.error).toBeUndefined()
  })
})

describe('the single-stage fallback (fetchRunStageUrl)', () => {
  it('a one-stage run answers under any label (the skeleton law)', async () => {
    mockFetch([ok({ status: 'done', stages: [{ id: 'img-to-mesh', status: 'done', url: 'm.glb' }] })])
    await expect(fetchRunStageUrl('r1', 's_1')).resolves.toBe('/melite-media/runs/r1/m.glb')
  })

  it('multi-stage runs match the exact id only', async () => {
    mockFetch([ok({ status: 'running', stages: [
      { id: 'a', status: 'running' },
      { id: 'b', status: 'running' },
    ] })])
    await expect(fetchRunStageUrl('r1', 'zzz')).resolves.toBeNull()
  })

  it('no url yet is null (the poll loop keeps going)', async () => {
    mockFetch([ok({ status: 'running', stages: [{ id: 's_1', status: 'running' }] })])
    await expect(fetchRunStageUrl('r1', 's_1')).resolves.toBeNull()
  })

  it('the terminal read settles poll loops', async () => {
    mockFetch([ok({ status: 'failed', stages: [] })])
    await expect(fetchRunTerminal('r1')).resolves.toBe(true)
  })
})

describe('the adoption (fetchLatestRunForDraft)', () => {
  it('picks the newest matching draft across the wide tail', async () => {
    const { calls } = mockFetch([ok({ runs: [
      { run_id: 'r-old', draft_id: 'bench-main', created_at: 10 },
      { run_id: 'r-new', draft_id: 'bench-main', created_at: 30 },
      { run_id: 'r-other', draft_id: 'other-draft', created_at: 99 },
    ] })])
    await expect(fetchLatestRunForDraft('bench-main')).resolves.toBe('r-new')
    // camelCase args — snake_case is refused by the descriptor
    expect((calls[0]?.body['payload'] as Record<string, unknown>)['args']).toEqual({ rawLimit: '500' })
  })

  it('no matching rows is null', async () => {
    mockFetch([ok({ runs: [] })])
    await expect(fetchLatestRunForDraft('bench-main')).resolves.toBeNull()
  })
})

describe('the start doors', () => {
  it('startCardRun rides the composing {model:} door with TOP-LEVEL knobs', async () => {
    const { calls } = mockFetch([ok({ run_id: 'run-1', status: 'queued', queue_position: 0 })])
    const res = await startCardRun({ model: 'trellis2-native', params: { input_image: 'a.png', resolution: '1024' }, draftId: 'bench-main' })
    expect(res).toEqual({ runId: 'run-1' })
    const doc = (calls[0]?.body['payload'] as Record<string, unknown>)['args']
    // knobs TOP-LEVEL (the door's convention — a nested params stanza
    // merges UNDER the stamped siblings and loses to family defaults)
    expect((doc as Record<string, unknown>)['doc']).toEqual({
      input_image: 'a.png',
      resolution: '1024',
      model: 'trellis2-native',
      draft_id: 'bench-main',
      test: false,
    })
  })

  it('test:true rides when asked (the test plane is explicit)', async () => {
    const { calls } = mockFetch([ok({ run_id: 'run-t', status: 'queued', queue_position: 0 })])
    await startCardRun({ model: 'x', params: {}, draftId: 'd', test: true })
    const doc = (calls[0]?.body['payload'] as Record<string, unknown>)['args']
    expect(((doc as Record<string, unknown>)['doc'] as Record<string, unknown>)['test']).toBe(true)
  })

  it('a start refusal is the outcome, never a throw', async () => {
    mockFetch([{ type: 'server-response', rpcId: 'R', result: { ok: false, error: { message: 'required param \'input_image\' missing' } } }])
    const res = await startCardRun({ model: 'img-to-mesh', params: {}, draftId: 'd' })
    expect(res).toEqual({ refused: 'required param \'input_image\' missing' })
  })

  it('startFlowInlineRun sends the flow_inline doc verbatim', async () => {
    const { calls } = mockFetch([ok({ run_id: 'run-2', status: 'queued', queue_position: 0 })])
    const res = await startFlowInlineRun({ flowId: 'bench-main', stages: [{ id: 's_1', engine: 'comfyui' }], draftId: 'bench-main' })
    expect(res).toEqual({ runId: 'run-2' })
    const doc = (calls[0]?.body['payload'] as Record<string, unknown>)['args']
    expect((doc as Record<string, unknown>)['doc']).toEqual({
      flow_inline: { id: 'bench-main', stages: [{ id: 's_1', engine: 'comfyui' }] },
      draft_id: 'bench-main',
      test: false,
    })
  })

  it('a no-run_id answer is the refused arm', async () => {
    mockFetch([ok({ status: 'queued' })])
    const res = await startFlowInlineRun({ flowId: 'd', stages: [], draftId: 'd' })
    expect(res).toEqual({ refused: 'run refused: no run_id in the answer' })
  })

  it('stopRun throws the estate refusal; ok passes silent', async () => {
    mockFetch([ok({})])
    await expect(stopRun('r1')).resolves.toBeUndefined()
    mockFetch([{ type: 'server-response', rpcId: 'R', result: { ok: false, error: { message: 'run already settled' } } }])
    await expect(stopRun('r1')).rejects.toThrow('run already settled')
  })
})

describe('the artifact poll (pollRunStageUrl)', () => {
  it('a landed url fires onUrl once and resolves', async () => {
    mockFetch([ok({ status: 'done', stages: [{ id: 's_1', status: 'done', url: 'm.glb' }] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledTimes(1)
    expect(onUrl).toHaveBeenCalledWith('/melite-media/runs/r1/m.glb')
  })

  it('a terminal run without a url resolves silent (the empty state is honest)', async () => {
    mockFetch([ok({ status: 'failed', stages: [{ id: 's_1', status: 'failed' }] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('keeps polling on the cadence until the url lands', async () => {
    mockFetch([
      ok({ status: 'running', stages: [{ id: 's_1', status: 'running' }] }),
      ok({ status: 'running', stages: [{ id: 's_1', status: 'running' }] }),
      ok({ status: 'done', stages: [{ id: 's_1', status: 'done', url: 'x.png' }] }),
    ])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledTimes(1)
  })

  it('a mid-poll error is swallowed — the next poll may recover', async () => {
    mockFetch([
      new Response('nope', { status: 502 }),
      ok({ status: 'done', stages: [{ id: 's_1', status: 'done', url: 'y.png' }] }),
    ])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledWith('/melite-media/runs/r1/y.png')
  })

  it('abort ends the loop without onUrl', async () => {
    mockFetch([ok({ status: 'running', stages: [{ id: 's_1', status: 'running' }] })])
    const ctrl = new AbortController()
    ctrl.abort()
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 }, ctrl.signal)
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('toRunMediaUrl is the one rewrite (bare rides the route; absolute and rooted pass)', () => {
    expect(toRunMediaUrl('r1', 'img-to-mesh/f.glb')).toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
    expect(toRunMediaUrl('r1', '/already/rooted.png')).toBe('/already/rooted.png')
    expect(toRunMediaUrl('r1', 'https://cdn/x.png')).toBe('https://cdn/x.png')
  })
})

/** The estate's refusal envelope — runs/status disavows file-era
 *  (completed) runs with unknown run_id. */
function refused(message: string): { type: string; rpcId: string; result: unknown } {
  return { type: 'server-response', rpcId: 'R', result: { ok: false, error: { message } } }
}

describe('the file-era arm (completed runs)', () => {
  const completedRow = {
    run_id: 'r1',
    status: 'completed',
    draft_id: 'bench-main',
    created_at: 1789159481,
    artifacts: [
      { name: 'f.glb', path: './output/r1/img-to-mesh/f.glb', bytes: 8, url: 'r1/img-to-mesh/f.glb', type: 'model', size: 8 },
    ],
  }

  it('fetchListRow finds the run; listRowMediaUrl roots its artifact (no double run prefix)', async () => {
    mockFetch([ok({ runs: [completedRow] })])
    const row = await fetchListRow('r1')
    expect(row?.['status']).toBe('completed')
    expect(row !== null ? listRowMediaUrl(row) : null).toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
  })

  it('listArtifactMediaUrl roots run-prefixed urls; verbatim arms pass', () => {
    expect(listArtifactMediaUrl('r1/img-to-mesh/f.glb')).toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
    expect(listArtifactMediaUrl('')).toBeNull()
    expect(listArtifactMediaUrl('/rooted/x.png')).toBe('/rooted/x.png')
    expect(listArtifactMediaUrl('https://cdn/x.png')).toBe('https://cdn/x.png')
  })

  it('fetchListRow misses null; truncated markers carry no url', async () => {
    mockFetch([ok({ runs: [] })])
    await expect(fetchListRow('r9')).resolves.toBeNull()
    expect(listRowMediaUrl({ artifacts: [{ truncated: true, listed: 0, total: 1 }] })).toBeNull()
  })

  it('a disavowed-then-completed run settles from its list artifact', async () => {
    const { calls } = mockFetch([refused('unknown run_id'), ok({ runs: [completedRow] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 'img-to-mesh', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledTimes(1)
    expect(onUrl).toHaveBeenCalledWith('/melite-media/runs/r1/img-to-mesh/f.glb')
    expect(calls).toHaveLength(2) // status, then the ONE list consult
  })

  it('a finished-good row without artifacts resolves silent', async () => {
    mockFetch([refused('unknown run_id'), ok({ runs: [{ ...completedRow, artifacts: [] }] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 'img-to-mesh', { onUrl, intervalMs: 1 })
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('a failed list row settles too — a refused status proves nothing is executing', async () => {
    // The zombie-override guard died with the typed refusal: a LIVE
    // run answers 200 at the status door (the registry writes the
    // map at enqueue and keeps it for the process life), so a
    // refused status + failed list row is a dead run (a restart
    // survivor), never a blip on a flying one. Settle law matches
    // the live arm: an artifacted row fires its url (a failed live
    // run with a url fires too); an artifact-less one is silent.
    const { calls } = mockFetch([
      refused('unknown run_id'),
      ok({ runs: [{ ...completedRow, status: 'failed', artifacts: [] }] }),
    ])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).not.toHaveBeenCalled()
    expect(calls).toHaveLength(2) // status, then the ONE list consult — the poll is done
  })

  it('a disavowed run with NO list row settles silent (the run does not exist)', async () => {
    const { calls } = mockFetch([refused('unknown run_id'), ok({ runs: [] })])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).not.toHaveBeenCalled()
    expect(calls).toHaveLength(2)
  })

  it('a TRANSPORT-died list read keeps the poll alive — the next cadence recovers', async () => {
    const { calls } = mockFetch([
      refused('unknown run_id'),
      new Response('nope', { status: 502 }),
      ok({ status: 'done', stages: [{ id: 's_1', status: 'done', url: 'rec.png' }] }),
    ])
    const onUrl = vi.fn()
    await pollRunStageUrl('r1', 's_1', { onUrl, intervalMs: 1 })
    expect(onUrl).toHaveBeenCalledWith('/melite-media/runs/r1/rec.png')
    expect(calls.length).toBeGreaterThanOrEqual(3)
  })

  it('fetchRunStageUrl carries the same file-era arm (one-shot parity with the poll)', async () => {
    mockFetch([refused('unknown run_id'), ok({ runs: [completedRow] })])
    await expect(fetchRunStageUrl('r1', 's_1')).resolves.toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
  })

  it('fetchRunStageUrl rethrows transport errors (the caller decides retry)', async () => {
    mockFetch([new Response('nope', { status: 502 })])
    await expect(fetchRunStageUrl('r1', 's_1')).rejects.toThrow('HTTP 502')
  })

  it('WireRefusedError marks domain refusals — transport errors stay plain', async () => {
    mockFetch([refused('nope'), new Response('x', { status: 500 })])
    let domain = false
    try { await wireCall('runs/status', { runId: 'r1' }) } catch (e) { domain = e instanceof WireRefusedError }
    expect(domain).toBe(true)
    domain = true
    try { await wireCall('runs/status', { runId: 'r1' }) } catch (e) { domain = e instanceof WireRefusedError }
    expect(domain).toBe(false)
  })
})

describe('the family currency (fetchCardFamilies)', () => {
  it('reads the catalog once, caches per session; default family is families[0]', async () => {
    resetCardFamiliesCache()
    let gets = 0
    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      gets += 1
      return new Response(JSON.stringify({
        cards: {
          'img-to-mesh': { id: 'img-to-mesh', families: ['trellis2-native', 'pixal3d', 'transfer_rig'] },
          'image-gen': { id: 'image-gen', families: ['flux-dev'] },
          'mask-studio': { id: 'mask-studio', families: [] },
        },
      }), { status: 200 })
    })
    const fams = await fetchCardFamilies()
    await fetchCardFamilies() // cached — one door round trip
    expect(gets).toBe(1)
    expect(fams['img-to-mesh']).toEqual(['trellis2-native', 'pixal3d', 'transfer_rig'])
    // the runs door resolves neither card ids nor aliases — the
    // default family is the currency callers hand startCardRun
    await expect(defaultFamilyForCard('img-to-mesh')).resolves.toBe('trellis2-native')
    // a card boarding nothing IS its own service (the alias law's tail)
    await expect(defaultFamilyForCard('mask-studio')).resolves.toBe('mask-studio')
    await expect(defaultFamilyForCard('unknown-card')).resolves.toBe('unknown-card')
    resetCardFamiliesCache()
  })
})
