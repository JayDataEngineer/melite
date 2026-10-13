// runs-policy.spec.ts — THE RUN VERBS OVER THE ONE LANE: every
// exported verb rides the mounted runs namespace through
// estateRemote (the bind grammar mirrors wire.spec.ts — honest
// fakes, no module mocks) and every refusal class settles by law:
// refusals consult the file-era list, transports rethrow or
// keep polling, terminal words settle silent. Each wall states the
// invariant it guards and fails when the behavior breaks.
import { afterEach, expect, test } from 'vitest'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'

import {
  fetchLatestRunForDraft,
  fetchListRow,
  fetchRunStageUrl,
  fetchRunStatus,
  fetchRunTerminal,
  pollRunStageUrl,
  probeRunGone,
  startCardRun,
  startFlowInlineRun,
  stopRun,
} from '../src/runs-policy.ts'
import { bindEstateRemoteFromRemote, unbindEstateRemote, type EstateNamespaces } from '../src/estate-remote.ts'

afterEach(() => {
  unbindEstateRemote()
})

const ok = (value: unknown): unknown => ({ ok: true, value })

/** A domain refusal off the wire (a real RemoteError — the error
 *  branch unwrapRemote reads for real). */
const gone = (message: string): unknown => ({
  ok: false,
  error: new RemoteError('gateway/bad-request', message, {}),
})

/** A refusal carrying a door-stable code + details (structural: the
 *  runs domain codes merge in the harness's registry, not in this
 *  package's compilation — unwrapRemote reads the branch
 *  structurally, so the fake exercises the real read path). */
const codedRefusal = (message: string, code: string, details?: Record<string, unknown>): unknown => ({
  ok: false,
  error: { message, code, ...(details === undefined ? {} : { details }) },
})

const transportDown = async (): Promise<unknown> => {
  throw new Error('wire down')
}

const statusDoc = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  status: 'completed',
  draft_id: 'd1',
  stages: [],
  ...over,
})

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 's_0',
  status: 'completed',
  ...over,
})

const listValue = (runs: unknown[]): unknown => ok({ count: runs.length, runs })

interface RunsRecord {
  statusCalls: Array<{ runId: string; signal?: AbortSignal }>
  listArgs: Array<{ limit: string; signal?: AbortSignal }>
  listCalls: number
  startDocs: Record<string, unknown>[]
  stopCalls: Array<{ runId: string; signal?: AbortSignal }>
}

/** Bind the lane with per-verb fakes (absent verbs answer the empty
 *  success — callers override only the verb under test). */
function bindRuns(impl: {
  status?: (runId: string, signal?: AbortSignal) => Promise<unknown>
  list?: (limit: string, signal?: AbortSignal) => Promise<unknown>
  start?: (doc: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>
  stop?: (runId: string, signal?: AbortSignal) => Promise<unknown>
} = {}): RunsRecord {
  const rec: RunsRecord = { statusCalls: [], listArgs: [], listCalls: 0, startDocs: [], stopCalls: [] }
  const runs = {
    status: async (runId: string, signal?: AbortSignal): Promise<unknown> => {
      rec.statusCalls.push({ runId, signal })
      return impl.status !== undefined ? impl.status(runId, signal) : ok(statusDoc())
    },
    list: async (limit: string, signal?: AbortSignal): Promise<unknown> => {
      rec.listCalls += 1
      rec.listArgs.push({ limit, signal })
      return impl.list !== undefined ? impl.list(limit, signal) : listValue([])
    },
    start: async (doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> => {
      rec.startDocs.push(doc)
      return impl.start !== undefined
        ? impl.start(doc, signal)
        : ok({ run_id: 'r-new', status: 'queued', queue_position: 0 })
    },
    stop: async (runId: string, signal?: AbortSignal): Promise<unknown> => {
      rec.stopCalls.push({ runId, signal })
      return impl.stop !== undefined ? impl.stop(runId, signal) : ok({})
    },
  }
  bindEstateRemoteFromRemote({
    bench: { list: (): null => null } as unknown as EstateNamespaces['bench'],
    drafts: { get: (): null => null } as unknown as EstateNamespaces['drafts'],
    runs: runs as unknown as EstateNamespaces['runs'],
    media: { list: (): null => null } as unknown as EstateNamespaces['media'],
  })
  return rec
}

// ── fetchRunStatus ───────────────────────────────────────────────

test('THE STATUS READ: one normalization — bare rels rewrite onto the media route, draft + stages ride', async () => {
  const rec = bindRuns({
    status: async () => ok(statusDoc({ draft_id: 'd9', stages: [stage({ url: 'rel/out.png' })] })),
  })
  const ctl = new AbortController()
  const row = await fetchRunStatus('r1', ctl.signal)
  expect(row.runId).toBe('r1')
  expect(row.status).toBe('completed')
  expect(row.draftId).toBe('d9')
  expect(row.stages).toEqual([{ id: 's_0', status: 'completed', url: '/melite-media/runs/r1/rel/out.png' }])
  expect(rec.statusCalls[0]).toEqual({ runId: 'r1', signal: ctl.signal })
})

test('THE VOCABULARY GUARD: a word outside RUN_STATUS_WORDS refuses (never folds to a fake state)', async () => {
  bindRuns({ status: async () => ok(statusDoc({ status: 'bogus' })) })
  await expect(fetchRunStatus('r1')).rejects.toThrow(/outside the vocabulary/)
})

// ── fetchListRow (listRunRows's only consumer face) ─────────────

test('THE FILE-ERA FACE: the row matches run_id exactly, and the list limit rides', async () => {
  const rec = bindRuns({
    list: async () => listValue([{ run_id: 'r1', status: 'completed' }, { run_id: 'r2', status: 'failed' }]),
  })
  expect(await fetchListRow('r2')).toEqual({ run_id: 'r2', status: 'failed' })
  expect(rec.listArgs[0]!.limit).toBe('500')
})

test('THE ID FALLBACK: a legacy row carrying only `id` still answers', async () => {
  bindRuns({ list: async () => listValue([{ id: 'r9', status: 'completed' }]) })
  expect(await fetchListRow('r9')).toEqual({ id: 'r9', status: 'completed' })
})

test('THE MISS: no row by either key is null (never a fabricated row)', async () => {
  bindRuns({
    list: async () => listValue([
      { run_id: 'other', status: 'completed' },
      { run_id: 7, status: 'completed' },
      { run_id: '', id: 'r1', status: 'completed' },
    ]),
  })
  expect(await fetchListRow('r1')).toBeNull()
})

test('THE SHAPE GUARD: a shapeless list is no rows (never a crash on foreign bodies)', async () => {
  bindRuns({ list: async () => ok({ count: 0 }) })
  expect(await fetchListRow('r1')).toBeNull()
  unbindEstateRemote()
  bindRuns({ list: async () => listValue([7, null, 'a-row', { run_id: 'r1', status: 'completed' }]) })
  expect(await fetchListRow('r1')).toEqual({ run_id: 'r1', status: 'completed' })
})

// ── fetchRunStageUrl ─────────────────────────────────────────────

test('THE LIVE MATCH: the asked stage answers its rewritten url', async () => {
  bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ url: 'out.png' })] })) })
  expect(await fetchRunStageUrl('r1', 's_0')).toBe('/melite-media/runs/r1/out.png')
})

test('THE SINGLE-STAGE FALLBACK: one stage IS the asked stage under any label', async () => {
  // the {model:} door names the skeleton ('img-to-mesh'), the caller
  // holds the bench row id ('s_1') — the fallback keeps card runs answering
  bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ id: 'img-to-mesh', url: 'm.glb' })] })) })
  expect(await fetchRunStageUrl('r1', 's_1')).toBe('/melite-media/runs/r1/m.glb')
  // multi-stage runs stay exact: a wrong label under two stages is no answer
  unbindEstateRemote()
  bindRuns({
    status: async () => ok(statusDoc({
      stages: [stage({ id: 's_0', url: 'a.png' }), stage({ id: 's_1', url: 'b.png' })],
    })),
  })
  expect(await fetchRunStageUrl('r1', 's_9')).toBeNull()
})

test('THE EMPTY ANSWER: a live row with no url yet is null (the poll keeps going)', async () => {
  bindRuns({ status: async () => ok(statusDoc({ stages: [] })) })
  expect(await fetchRunStageUrl('r1', 's_0')).toBeNull()
  unbindEstateRemote()
  bindRuns({ status: async () => ok(statusDoc({ status: 'running', stages: [stage({ status: 'running' })] })) })
  expect(await fetchRunStageUrl('r1', 's_0')).toBeNull()
  unbindEstateRemote()
  bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ url: '' })] })) })
  expect(await fetchRunStageUrl('r1', 's_0')).toBeNull()
})

test('THE FILE-ERA FALLBACK: a refused live map falls back to the list row artifact', async () => {
  bindRuns({
    status: async () => gone('no such run'),
    list: async () => listValue([{ run_id: 'r1', artifacts: [{ url: 'r1/out.png' }] }]),
  })
  expect(await fetchRunStageUrl('r1', 's_0')).toBe('/melite-media/runs/r1/out.png')
})

test('THE DOUBLE MISS: refused live, absent from the list — null, never a throw', async () => {
  bindRuns({ status: async () => gone('no such run'), list: async () => listValue([]) })
  expect(await fetchRunStageUrl('r1', 's_0')).toBeNull()
})

test('THE LIST-TRANSPORT MISS: a dead list read answers null (the caller retries)', async () => {
  bindRuns({ status: async () => gone('no such run'), list: transportDown })
  expect(await fetchRunStageUrl('r1', 's_0')).toBeNull()
})

test('THE TRANSPORT RETHROW: a dead wire is the caller\'s decision, never a verdict', async () => {
  bindRuns({ status: transportDown })
  await expect(fetchRunStageUrl('r1', 's_0')).rejects.toThrow(/wire down/)
})

// ── fetchRunTerminal ─────────────────────────────────────────────

test('THE TERMINAL READ: completed stops poll loops, running does not', async () => {
  bindRuns({ status: async () => ok(statusDoc({ status: 'completed' })) })
  expect(await fetchRunTerminal('r1')).toBe(true)
  unbindEstateRemote()
  bindRuns({ status: async () => ok(statusDoc({ status: 'running' })) })
  expect(await fetchRunTerminal('r1')).toBe(false)
})

// ── probeRunGone ─────────────────────────────────────────────────

test('THE LIVE VERDICT: a known run is live', async () => {
  bindRuns({ status: async () => ok(statusDoc({ status: 'running' })) })
  expect(await probeRunGone('r1')).toBe('live')
})

test('THE GONE VERDICT: refused live and absent from the list — nothing will ever write its terminal', async () => {
  const rec = bindRuns({ status: async () => gone('no such run'), list: async () => listValue([]) })
  expect(await probeRunGone('r1')).toBe('gone')
  expect(rec.listCalls).toBe(1)
})

test('THE FILE-ERA STATUS: a listed row answers its own status word', async () => {
  bindRuns({
    status: async () => gone('no such run'),
    list: async () => listValue([{ run_id: 'r1', status: 'failed' }]),
  })
  expect(await probeRunGone('r1')).toBe('failed')
})

test('THE UNKNOWABLE ROW: a listed row with no readable status is unknown, never completed', async () => {
  bindRuns({
    status: async () => gone('no such run'),
    list: async () => listValue([{ run_id: 'r1' }]),
  })
  expect(await probeRunGone('r1')).toBe('unknown')
  unbindEstateRemote()
  bindRuns({
    status: async () => gone('no such run'),
    list: async () => listValue([{ run_id: 'r1', status: '' }]),
  })
  expect(await probeRunGone('r1')).toBe('unknown')
})

test('THE GONE TRANSPORT RETHROW: a dead wire is not a verdict', async () => {
  bindRuns({ status: transportDown })
  await expect(probeRunGone('r1')).rejects.toThrow(/wire down/)
})

test('THE LIST-TRANSPORT VERDICT: a dead list read after a refusal is gone', async () => {
  bindRuns({ status: async () => gone('no such run'), list: transportDown })
  expect(await probeRunGone('r1')).toBe('gone')
})

// ── fetchLatestRunForDraft ───────────────────────────────────────

test('THE NEWEST WINS: the draft\'s latest run by created_at', async () => {
  bindRuns({
    list: async () => listValue([
      { run_id: 'old', draft_id: 'd1', created_at: 10 },
      { run_id: 'new', draft_id: 'd1', created_at: 30 },
      { run_id: 'mid', draft_id: 'd1', created_at: 20 },
    ]),
  })
  expect(await fetchLatestRunForDraft('d1')).toBe('new')
})

test('THE DRAFT FILTER: foreign drafts, empty ids, and legacy id rows sort correctly', async () => {
  bindRuns({
    list: async () => listValue([
      { run_id: 'foreign', draft_id: 'd2', created_at: 99 },
      { run_id: '', draft_id: 'd1', created_at: 100 },
      { run_id: 7, draft_id: 'd1', created_at: 101 },
      { id: 'legacy', draft_id: 'd1', created_at: 5 },
    ]),
  })
  expect(await fetchLatestRunForDraft('d1')).toBe('legacy')
  unbindEstateRemote()
  bindRuns({ list: async () => listValue([{ run_id: 'x', draft_id: 'd2' }]) })
  expect(await fetchLatestRunForDraft('d1')).toBeNull()
})

test('THE TIMELESS ROW: a non-number created_at counts as epoch (never a crash, never the newest)', async () => {
  bindRuns({
    list: async () => listValue([
      { run_id: 'timeless', draft_id: 'd1', created_at: 'yesterday' },
      { run_id: 'dated', draft_id: 'd1', created_at: 1 },
    ]),
  })
  expect(await fetchLatestRunForDraft('d1')).toBe('dated')
})

// ── stopRun ──────────────────────────────────────────────────────

test('THE CANCEL DOOR: the run id and signal ride to runs/stop', async () => {
  const rec = bindRuns({})
  const ctl = new AbortController()
  await stopRun('r1', ctl.signal)
  expect(rec.stopCalls).toEqual([{ runId: 'r1', signal: ctl.signal }])
})

// ── startCardRun / startFlowInlineRun ────────────────────────────

test('THE CARD DOOR: knobs ride top-level beside the envelope keys (test defaults false)', async () => {
  const rec = bindRuns({})
  expect(await startCardRun({ model: 'trellis2', params: { steps: 20 }, draftId: 'd1' }))
    .toEqual({ runId: 'r-new' })
  expect(rec.startDocs[0]).toMatchObject({ steps: 20, model: 'trellis2', draft_id: 'd1', test: false })
  expect('params' in rec.startDocs[0]!).toBe(false)
  await startCardRun({ model: 'trellis2', params: {}, draftId: 'd1', test: true })
  expect(rec.startDocs[1]!['test']).toBe(true)
})

test('THE FLOW DOOR: pre-composed stages ride the flow_inline envelope', async () => {
  const rec = bindRuns({})
  const stages = [{ workflow: 'w', steps: 3 }]
  expect(await startFlowInlineRun({ flowId: 'f', stages, draftId: 'd1' })).toEqual({ runId: 'r-new' })
  expect(rec.startDocs[0]).toMatchObject({ flow_inline: { id: 'f', stages }, draft_id: 'd1', test: false })
  await startFlowInlineRun({ flowId: 'f', stages, draftId: 'd1', test: true })
  expect(rec.startDocs[1]!['test']).toBe(true)
})

test('THE PRESS KEY: one mint per press — absent mints, present stays', async () => {
  const rec = bindRuns({})
  const input = { model: 'trellis2', params: {}, draftId: 'd1' }
  await startCardRun(input)
  await startCardRun(input)
  const [first, second] = [rec.startDocs[0]!['press_key'], rec.startDocs[1]!['press_key']]
  expect(typeof first).toBe('string')
  expect(first !== '').toBe(true)
  expect(second !== '').toBe(true)
  // a transport retry replays the same doc — the seat answers the
  // FIRST run instead of minting a second (never a double GPU spend)
  expect(first).not.toBe(second)
  unbindEstateRemote()
  const kept = bindRuns({})
  await startCardRun({ model: 'trellis2', params: { press_key: 'fixed' }, draftId: 'd1' })
  expect(kept.startDocs[0]!['press_key']).toBe('fixed')
  // an empty press_key is no key — it mints like an absent one
  await startCardRun({ model: 'trellis2', params: { press_key: '' }, draftId: 'd1' })
  expect(typeof kept.startDocs[1]!['press_key']).toBe('string')
  expect(kept.startDocs[1]!['press_key'] !== '').toBe(true)
})

test('THE RUNLESS ANSWER: an ok without run_id is a refusal (never a silent undefined run)', async () => {
  bindRuns({ start: async () => ok({ status: 'queued', queue_position: 0 }) })
  expect(await startCardRun({ model: 'm', params: {}, draftId: 'd' }))
    .toEqual({ refused: 'run refused: no run_id in the answer' })
  unbindEstateRemote()
  bindRuns({ start: async () => ok({ run_id: '', status: 'queued', queue_position: 0 }) })
  expect(await startCardRun({ model: 'm', params: {}, draftId: 'd' }))
    .toEqual({ refused: 'run refused: no run_id in the answer' })
})

test('THE CODED REFUSAL: the door\'s code and details ride beside the voice', async () => {
  bindRuns({
    start: async () => codedRefusal('bench incomplete: prompt unstated', 'runs/card-compose-incomplete', { missing: ['prompt'] }),
  })
  expect(await startCardRun({ model: 'm', params: {}, draftId: 'd' })).toEqual({
    refused: 'bench incomplete: prompt unstated',
    refusedCode: 'runs/card-compose-incomplete',
    refusedDetails: { missing: ['prompt'] },
  })
})

test('THE EMPTY DETAILS BAG IS NO FACT: a details-less refusal carries no refusedDetails key', async () => {
  bindRuns({ start: async () => codedRefusal('engine busy', 'runs/lifecycle-inflight', {}) })
  const outcome = await startCardRun({ model: 'm', params: {}, draftId: 'd' })
  expect(outcome).toEqual({ refused: 'engine busy', refusedCode: 'runs/lifecycle-inflight' })
  expect('refusedDetails' in outcome).toBe(false)
  unbindEstateRemote()
  bindRuns({ start: async () => codedRefusal('engine busy', 'runs/lifecycle-inflight') })
  const bare = await startCardRun({ model: 'm', params: {}, draftId: 'd' })
  expect('refusedDetails' in bare).toBe(false)
})

test('THE TRANSPORT VOICE: a dead wire voices its words with no code (never a code-shaped lie)', async () => {
  bindRuns({
    start: async () => {
      throw new Error('socket hung')
    },
  })
  const outcome = await startCardRun({ model: 'm', params: {}, draftId: 'd' })
  expect(outcome).toEqual({ refused: 'socket hung' })
  expect('refusedCode' in outcome).toBe(false)
})

test('THE LANE-MISS CLASS: the missing-artifact refusal names its download fields', async () => {
  bindRuns({
    start: async () => codedRefusal(
      'model weights missing',
      'runs/lane-input-missing',
      { artifact: 'weights.safetensors', url: 'https://manager/fetch/x' },
    ),
  })
  expect(await startCardRun({ model: 'm', params: {}, draftId: 'd' })).toEqual({
    refused: 'model weights missing',
    refusedCode: 'runs/lane-input-missing',
    refusedDetails: { artifact: 'weights.safetensors', url: 'https://manager/fetch/x' },
  })
})

// ── pollRunStageUrl ──────────────────────────────────────────────

test('THE IMMEDIATE LAND: a present url fires once and settles', async () => {
  const rec = bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ url: 'out.png' })] })) })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual(['/melite-media/runs/r1/out.png'])
  expect(rec.statusCalls.length).toBe(1)
  expect(rec.listCalls).toBe(0)
})

test('THE POLL SINGLE-STAGE FALLBACK: the skeleton label answers mid-poll too', async () => {
  bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ id: 'img-to-mesh', url: 'm.glb' })] })) })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_9', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual(['/melite-media/runs/r1/m.glb'])
})

test('THE TERMINAL SILENCE: a run that settles url-less resolves without firing', async () => {
  const rec = bindRuns({ status: async () => ok(statusDoc({ stages: [stage({ status: 'completed' })] })) })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual([])
  expect(rec.statusCalls.length).toBe(1)
})

test('THE LIVE WAIT: a running row sleeps and lands on the next cadence', async () => {
  let calls = 0
  const rec = bindRuns({
    status: async () => {
      calls += 1
      return calls === 1
        ? ok(statusDoc({ status: 'running', stages: [stage({ status: 'running' })] }))
        : ok(statusDoc({ stages: [stage({ url: 'done.png' })] }))
    },
  })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual(['/melite-media/runs/r1/done.png'])
  expect(calls).toBe(2)
  expect(rec.listCalls).toBe(0)
})

test('THE FILE-ERA POLL: a refused live map settles from the list row once', async () => {
  const rec = bindRuns({
    status: async () => gone('no such run'),
    list: async () => listValue([{ run_id: 'r1', artifacts: [{ url: 'r1/out.png' }] }]),
  })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual(['/melite-media/runs/r1/out.png'])
  expect(rec.listCalls).toBe(1)
})

test('THE FILE-ERA SILENCE: refused live and no list row settles silent (file rows never update)', async () => {
  bindRuns({ status: async () => gone('no such run'), list: async () => listValue([]) })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual([])
})

test('THE LIST-REFUSAL SILENCE: the list refusing too settles silent the same way', async () => {
  bindRuns({ status: async () => gone('no such run'), list: async () => gone('no list row') })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual([])
})

test('THE TRANSPORT BLIP: a dead read never settles the poll — the next cadence recovers', async () => {
  let calls = 0
  const rec = bindRuns({
    status: async () => {
      calls += 1
      if (calls === 1) throw new Error('blip')
      return ok(statusDoc({ stages: [stage({ url: 'late.png' })] }))
    },
  })
  const fired: string[] = []
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 })
  expect(fired).toEqual(['/melite-media/runs/r1/late.png'])
  // a failed READ never consults the list (nothing proved the run
  // left the live map) — the poll simply waits
  expect(rec.listCalls).toBe(0)
})

test('THE DEAD WIRE: transport failures on both doors keep the poll alive until abort', async () => {
  bindRuns({ status: transportDown, list: transportDown })
  const fired: string[] = []
  const ctl = new AbortController()
  setTimeout(() => { ctl.abort() }, 20)
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 }, ctl.signal)
  expect(fired).toEqual([])
})

test('THE REFUSED-BUT-UNREADABLE LIST: a refused live map with a dead list read stays alive (the answer may land next cadence)', async () => {
  // status REFUSES (the run left the live map — the file-era arm
  // runs) but the list read dies on TRANSPORT: neither silence nor
  // the url is proven, so the poll waits instead of settling
  const rec = bindRuns({ status: async () => gone('no such run'), list: transportDown })
  const fired: string[] = []
  const ctl = new AbortController()
  setTimeout(() => { ctl.abort() }, 20)
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 }, ctl.signal)
  expect(fired).toEqual([])
  expect(rec.listCalls >= 2).toBe(true)
  expect(rec.statusCalls.length >= 2).toBe(true)
})

test('THE PRE-ABORTED POLL: an aborted signal never reads (no run, no read)', async () => {
  const rec = bindRuns({})
  const fired: string[] = []
  const ctl = new AbortController()
  ctl.abort()
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 1 }, ctl.signal)
  expect(fired).toEqual([])
  expect(rec.statusCalls.length).toBe(0)
})

test('THE MID-POLL ABORT: a live-but-url-less run settles on abort', async () => {
  const rec = bindRuns({
    status: async () => ok(statusDoc({ status: 'running', stages: [stage({ status: 'running' })] })),
  })
  const fired: string[] = []
  const ctl = new AbortController()
  setTimeout(() => { ctl.abort() }, 15)
  await pollRunStageUrl('r1', 's_0', { onUrl: (u) => { fired.push(u) }, intervalMs: 5 }, ctl.signal)
  expect(fired).toEqual([])
  expect(rec.statusCalls.length >= 1).toBe(true)
})
