import { expect, test } from 'vitest'
import { onBenchChange, notifyBenchChange } from '../src/bench.ts'
import { BenchRemoteService } from '../src/remote.ts'

test('decorated probe with logs', async () => {
  console.log('TYPE of proto method:', typeof (BenchRemoteService.prototype as never as Record<string, unknown>)['remoteExportSubscribe'])
  const controller = new AbortController()
  const rows = [
    { draft_id: 'bench-main', session: 'main', rev: 3, intent: null, stages: [], log: [] },
    { draft_id: 'bench-main', session: 'main', rev: 4, intent: null, stages: [], log: [] },
  ]
  const fake = { get: async (): Promise<unknown> => { console.log('GET called'); return rows.shift() ?? rows[0] } }
  const gen = (BenchRemoteService.prototype as never as { remoteExportSubscribe: (this: unknown, s: string, sig: AbortSignal) => AsyncGenerator<unknown> }).remoteExportSubscribe.call(
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
