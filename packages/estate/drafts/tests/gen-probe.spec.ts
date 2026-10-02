import { expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { onBenchChange, notifyBenchChange } from '../src/bench.ts'
import { BenchRemoteService, installBenchChangeSeam } from '../src/remote.ts'

// The typed `bench.changed` seam (the hand-roll row 1.2): this probe
// calls the subscribe prototype with a fake `this`, so it installs the
// seam on its own Context — the same installer the plugin uses.
installBenchChangeSeam(new Context())

test('decorated probe with logs', async () => {
  console.log('TYPE of proto method:', typeof (BenchRemoteService.prototype as never as Record<string, unknown>)['subscribe'])
  const controller = new AbortController()
  const rows = [
    { draft_id: 'bench-main', session: 'main', rev: 3, intent: null, stages: [], log: [] },
    { draft_id: 'bench-main', session: 'main', rev: 4, intent: null, stages: [], log: [] },
  ]
  const fake = { get: async (): Promise<unknown> => { console.log('GET called'); return rows.shift() ?? rows[0] } }
  const gen = (BenchRemoteService.prototype as never as { subscribe: (this: unknown, s: string, sig: AbortSignal) => AsyncGenerator<unknown> }).subscribe.call(
    fake, 'main', controller.signal)
  const first = await gen.next()
  console.log('TEST first:', JSON.stringify(first))
  const secondP = gen.next()
  await new Promise((r) => setTimeout(r, 25))
  console.log('TEST about to notify; listeners directly:', 'n/a')
  notifyBenchChange('main')
  const second = await Promise.race([secondP, new Promise((r) => setTimeout(() => r('TIMEOUT'), 500))])
  console.log('TEST second:', JSON.stringify(second))
  expect(second).not.toBe('TIMEOUT')
}, 3000)
