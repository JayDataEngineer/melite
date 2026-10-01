/**
 * phantom-reconcile.spec.ts — THE PHANTOM-RUNNING CURE (2026-09-13):
 * a bench row stamped running/queued whose run the restarted estate
 * no longer knows (the in-memory registry died with the boot) flips
 * to its honest terminal — the file-era list's answer when it has
 * one, 'stopped' when the run is simply gone. Live rows arm an
 * observer and are never touched by the heal itself. The observer's
 * own poll loop cures the same way (a refused status never polls
 * forever — pinned in the wire-level test below).
 *
 * THE ONE-LANE LAW (stroke 81): the probe rides the mounted
 * namespaces through mountEstateFakes — no fetch stub answers an
 * estate verb. A refused runs/status queues in `refusals` (one entry
 * per refused call — the heal probes once); the file-era list rides
 * `listRows`; a live run rides `runDocs`. Call records are
 * fakes.calls entries {method, args}.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { unbindEstateRemote } from '@melite/card-base/client'
import { mountEstateFakes } from './estate-harness.ts'

import { reconcileBenchRuns } from '../src/client/cards-resource.ts'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

function bench(runStatus: string): CardsBenchValue {
  return {
    kind: 'bench', draftId: 'bench-p', rev: 1,
    sessionKey: 'p',
    stages: [{
      id: 's_h3', card: 'h3-timeline', title: 'the stuck stage', engine: 'comfyui',
      params: {}, runStatus,
      result: { run_id: 'run-dead-1' },
    }],
    log: [],
  }
}

afterEach(() => { unbindEstateRemote(); vi.unstubAllGlobals() })

test('a phantom running row whose run is GONE flips to stopped (the h3 incident)', async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: 'runs/status', message: 'unknown run_id' }],
  })
  try {
    await reconcileBenchRuns(bench('running'), {})
    const patch = fakes.calls.find((c) => c.method === 'drafts/patch')
    expect(patch?.args).toMatchObject({
      draftId: 'bench-p', stageId: 's_h3',
      patch: { runStatus: 'stopped', result: { run_id: 'run-dead-1' } },
    })
  } finally {
    fakes.unmount()
  }
})

test('a phantom row the file-era list still knows answers its real terminal (done)', async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: 'runs/status', message: 'unknown run_id' }],
    listRows: [{ run_id: 'run-dead-1', status: 'completed' }],
  })
  try {
    await reconcileBenchRuns(bench('queued'), {})
    const patch = fakes.calls.find((c) => c.method === 'drafts/patch')
    expect(patch?.args).toMatchObject({ patch: { runStatus: 'done' } })
  } finally {
    fakes.unmount()
  }
})

test('a LIVE row is never patched by the heal (the observer owns it)', async () => {
  const fakes = mountEstateFakes({
    runDocs: [{ run_id: 'run-dead-1', status: 'running', stages: [] }],
  })
  try {
    const ctrl = new AbortController()
    const p = reconcileBenchRuns(bench('running'), { signal: ctrl.signal })
    ctrl.abort()
    await p
    expect(fakes.calls.find((c) => c.method === 'drafts/patch')).toBeUndefined()
  } finally {
    fakes.unmount()
  }
})

test('the armed set makes the probe once-per-run (idempotent across refreshes)', async () => {
  const fakes = mountEstateFakes({
    refusals: [{ method: 'runs/status', message: 'unknown run_id' }],
  })
  try {
    const armed = new Set<string>()
    const b = bench('running')
    await reconcileBenchRuns(b, { armed })
    const statusCalls = () => fakes.calls.filter((c) => c.method === 'runs/status').length
    const first = statusCalls()
    await reconcileBenchRuns(b, { armed })
    expect(statusCalls()).toBe(first)
  } finally {
    fakes.unmount()
  }
})
