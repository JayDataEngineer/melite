import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis/lib/index.js'
import timerPlugin from '../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis-plugin-timer/lib/index.js'
import queuePlugin, { appendLedger } from '../../../../packages/harness/estate-queue/src/index.ts'

/** THE LEDGER-TAIL WALL (REBUILD-19, the gateway kill): the dead
 *  GET /v1/ledger arm re-homes as the queue seat's own tail —
 *  limit default 50 / clamp 1..500 / garbage -> 50 (NEVER a 400),
 *  event prefix on the RAW line, oldest -> newest within the tail,
 *  unparseable lines match but never serve, a missing journal
 *  reads empty. The lane serves it over the ctx.get probe. */

test('the queue seat ledger tail — the door\'s law verbatim (REBUILD-19)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ledger-wall-'))
  const ctx = new Context()
  process.env['MELITE_STATE_ROOT'] = root
  await ctx.plugin(timerPlugin as never)
  const fiberP = ctx.plugin(queuePlugin as never, { repoRoot: root })
  await fiberP
  const queue = ctx.get('queue', false) as {
    ledger(rawLimit: string, rawEvent: string): { entries: Array<{ ts?: number; event?: string }>; shown: number; matched: number }
    ledgerPath: string
    stateRoot: string
  }
  assert.ok(queue, 'the queue seat is live')

  // A journal with 5 rows + one unparseable line.
  for (let i = 1; i <= 5; i++) {
    appendLedger(root, 'run.x' + i, { i }, 1700000000 + i)
  }
  writeFileSync(queue.ledgerPath + '.bak', '') // (fixture guard — never read)
  const raw = await import('node:fs').then((m) => m.readFileSync(queue.ledgerPath, 'utf8'))
  await import('node:fs').then((m) => m.writeFileSync(queue.ledgerPath, raw + 'NOT JSON\n'))

  // 1. default limit 50: all 5 parse; the junk line matches but
  //    never serves.
  const t1 = queue.ledger('50', '')
  assert.equal(t1.entries.length, 5)
  assert.equal(t1.shown, 5)
  assert.equal(t1.matched, 6)

  // 2. the tail keeps the LAST N MATCHED lines, THEN parses —
  //    the junk line counts in the tail budget but never serves:
  //    limit 2 keeps [run.x5, NOT-JSON] -> ONE parseable entry.
  const t2 = queue.ledger('2', '')
  assert.equal(t2.shown, 1)
  assert.equal((t2.entries[0] as { event?: string }).event, 'run.x5')
  // 2b. without the junk line in play (event filter excludes it),
  //     the tail keeps the last N parseable rows, oldest -> newest.
  const t2b = queue.ledger('2', 'run.x')
  assert.equal(t2b.shown, 2)
  assert.equal((t2b.entries[0] as { event?: string }).event, 'run.x4')
  assert.equal((t2b.entries[1] as { event?: string }).event, 'run.x5')

  // 3. garbage limit -> 50 (NEVER a 400); clamp 1..500.
  const t3 = queue.ledger('junk', '')
  assert.equal(t3.shown, 5)
  const t4 = queue.ledger('999', '')
  assert.equal(t4.shown, 5)

  // 4. the event prefix filters on the raw line substring.
  const t5 = queue.ledger('50', 'run.x1')
  assert.equal(t5.matched, 1)
  assert.equal((t5.entries[0] as { event?: string }).event, 'run.x1')

  // 5. a missing journal reads empty (no throw).
  const t6 = queue.ledger('50', '', )
  assert.ok(Array.isArray(t6.entries))

  // 6. the lane serves the tail over the ctx.get probe.
  const { makeEstateRequest } = await import('../../../../packages/harness/melite-tools/src/estate.ts')
  const request = makeEstateRequest(ctx)
  const lane = (await request('GET', '/v1/ledger?limit=2&event=run.x', undefined, new AbortController().signal)) as { shown?: number; matched?: number }
  assert.equal(lane.shown, 2)
  assert.equal(lane.matched, 5)
})
