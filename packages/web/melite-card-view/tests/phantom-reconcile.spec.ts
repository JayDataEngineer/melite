/**
 * phantom-reconcile.spec.ts — THE PHANTOM-RUNNING CURE (2026-09-13):
 * a bench row stamped running/queued whose run the restarted estate
 * no longer knows (the in-memory registry died with the boot) flips
 * to its honest terminal — the file-era list's answer when it has
 * one, 'stopped' when the run is simply gone. Live rows arm an
 * observer and are never touched by the heal itself. The observer's
 * own poll loop cures the same way (a refused status never polls
 * forever — pinned in the wire-level test below).
 */
import { afterEach, expect, test, vi } from 'vitest'

import { reconcileBenchRuns } from '../src/client/cards-resource.ts'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const calls: Array<{ method: string, args: Record<string, unknown> }> = []

function stubWire(answers: {
  status?: { ok: true, row: Record<string, unknown> } | { ok: false },
  list?: Record<string, unknown>[],
}): void {
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
    const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string, payload: { args: Record<string, unknown> } }
    calls.push({ method: frame.method, args: frame.payload.args })
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'runs/status') {
      if (answers.status?.ok === true) value = answers.status.row
      else {
        return new Response(JSON.stringify({
          type: 'server-response', rpcId: frame.rpcId,
          result: { ok: false, error: { message: 'unknown run_id' } },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
    }
    if (frame.method === 'runs/list') value = { runs: answers.list ?? [] }
    if (frame.method === 'drafts/get') value = { draft_id: 'bench-p', stages: [], bench: { rev: 1, log: [] } }
    if (frame.method === 'drafts/patch') value = { draftId: 'bench-p', stageId: 's_h3', delivered: true, patched: ['runStatus'] }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }))
}

function bench(runStatus: string): CardsBenchValue {
  return {
    kind: 'bench', draftId: 'bench-p', rev: 1,
    stages: [{
      id: 's_h3', card: 'h3-timeline', title: 'the stuck stage', engine: 'comfyui',
      params: {}, runStatus,
      result: { run_id: 'run-dead-1' },
    }],
    log: [],
  }
}

afterEach(() => { vi.unstubAllGlobals(); calls.length = 0 })

test('a phantom running row whose run is GONE flips to stopped (the h3 incident)', async () => {
  stubWire({ status: { ok: false }, list: [] })
  await reconcileBenchRuns(bench('running'), {})
  const patch = calls.find((c) => c.method === 'drafts/patch')
  expect(patch?.args).toMatchObject({
    draftId: 'bench-p', stageId: 's_h3',
    patch: { runStatus: 'stopped', result: { run_id: 'run-dead-1' } },
  })
})

test('a phantom row the file-era list still knows answers its real terminal (done)', async () => {
  stubWire({ status: { ok: false }, list: [{ run_id: 'run-dead-1', status: 'completed' }] })
  await reconcileBenchRuns(bench('queued'), {})
  const patch = calls.find((c) => c.method === 'drafts/patch')
  expect(patch?.args).toMatchObject({ patch: { runStatus: 'done' } })
})

test('a LIVE row is never patched by the heal (the observer owns it)', async () => {
  const ctrl = new AbortController()
  stubWire({ status: { ok: true, row: { run_id: 'run-dead-1', status: 'running', stages: [] } } })
  const p = reconcileBenchRuns(bench('running'), { signal: ctrl.signal })
  ctrl.abort()
  await p
  expect(calls.find((c) => c.method === 'drafts/patch')).toBeUndefined()
})

test('the armed set makes the probe once-per-run (idempotent across refreshes)', async () => {
  stubWire({ status: { ok: false }, list: [] })
  const armed = new Set<string>()
  const b = bench('running')
  await reconcileBenchRuns(b, { armed })
  const statusCalls = () => calls.filter((c) => c.method === 'runs/status').length
  const first = statusCalls()
  await reconcileBenchRuns(b, { armed })
  expect(statusCalls()).toBe(first)
})
