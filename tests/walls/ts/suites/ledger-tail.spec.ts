import { onTestFinished, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context, type Plugin } from '@deepseek-ai/cordis'
import timerPlugin from '@deepseek-ai/cordis-plugin-timer'
import queuePlugin, { appendLedger } from '../../../../packages/harness/estate-queue/src/index.ts'
import { engineDirs, modelRows } from '../../../../packages/harness/estate-queue/src/skillRows.ts'
import { hSkillRead } from '../../../../packages/harness/estate-queue/src/skillPlane.ts'
import { tailLedger } from '../../../../packages/harness/estate-queue/src/ledgerTail.ts'
import type { EstateMethod } from '../../../../packages/harness/melite-tools/src/estate.ts'

/** THE LEDGER-TAIL WALL (REBUILD-19, the gateway kill): the dead
 *  GET /v1/ledger arm re-homes as the queue seat's own tail —
 *  limit default 50 / clamp 1..500 / garbage -> 50 (NEVER a 400),
 *  event prefix on the RAW line, oldest -> newest within the tail,
 *  unparseable lines match but never serve, a missing journal
 *  reads empty. The lane serves it over the ctx.get probe. */

test('the queue seat ledger tail — the door\'s law verbatim (REBUILD-19)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ledger-wall-'))
  const ctx = new Context()
  // J12: the state root rides the queue config (the retired seam)
  await ctx.plugin(timerPlugin as unknown as Plugin)
  const fiberP = ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot: root })
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

  // 5. THE MISSING-JOURNAL LAW, for real (the walls audit's row 13,
  // 2026-10-10): the old arm queried the journal the earlier steps
  // WROTE, so the missing path was never exercised — and the arm
  // only asserted Array.isArray, which any answer satisfies. The
  // door's own law is per FILE: with no ledger file on disk the
  // tail is empty, and an event that matches nothing is empty too.
  // Both are pinned: the matcher refuses to invent entries.
  const t6 = queue.ledger('50', 'event-nobody-ever-wrote')
  assert.ok(Array.isArray(t6.entries), 'the door answers an array')
  assert.equal(t6.entries.length, 0, 'an unmatched event answers EMPTY (no phantom entries)')
  assert.equal(t6.matched, 0, 'an unmatched event matches nothing')
  // and the MISSING-FILE arm, through the REAL door over a root
  // that never wrote a journal — a second queue seat, booted here
  // (a wall re-implementing the reader would be its own oracle)
  const emptyRoot = mkdtempSync(join(tmpdir(), 'ledger-empty-'))
  const ctx2 = new Context()
  await ctx2.plugin(timerPlugin as unknown as Plugin)
  await ctx2.plugin(queuePlugin as unknown as Plugin, { stateRoot: emptyRoot })
  const queue2 = ctx2.get('queue', false) as {
    ledger(rawLimit: string, rawEvent: string): { entries: Array<{ ts?: number; event?: string }>; shown: number; matched: number }
  }
  const missing = queue2.ledger('50', '')
  // C-L15 (the wall audit, 2026-09-28): `!== undefined` cannot fail
  // against a call that either returns or throws — the arm said
  // nothing about what the seat answered. The SHAPE is the law: the
  // envelope exists and is an object (a throw is the failure this
  // arm exists to catch, and the reads below judge it).
  assert.equal(typeof missing, 'object', 'the missing-journal seat answers with an envelope (never throws)')
  assert.notEqual(missing, null, 'the answer is an envelope, not null')
  assert.deepEqual(missing.entries, [], 'a root with no ledger file answers EMPTY')
  assert.equal(missing.matched, 0, 'a missing file matches nothing')
  assert.equal(missing.shown, 0, 'a missing file shows nothing')

  // 6. the lane serves the tail over the ctx.get probe.
  const { makeEstateRequest } = await import('../../../../packages/harness/melite-tools/src/estate.ts')
  // the impl serves (method, path, body, signal) — EstateRequest's
  // trailing timeoutMs never reaches the seats; narrow the callable
  // to the runtime truth instead of inventing a value.
  const request = makeEstateRequest(ctx) as (method: EstateMethod, path: string, body: unknown, signal: AbortSignal) => Promise<unknown>
  const lane = (await request('GET', '/v1/ledger?limit=2&event=run.x', undefined, new AbortController().signal)) as { shown?: number; matched?: number }
  assert.equal(lane.shown, 2)
  assert.equal(lane.matched, 5)
})

// C-C4 (the wall audit, 2026-09-28): the clamp law was pinned on a
// 5-row fixture — `shown 5` cannot tell "clamped to 500" from "all
// there were", so raising the cap to 5000 or dropping it entirely
// kept the wall green. This fixture writes MORE rows than the cap:
// 600, so limit '999' PROVES the clamp (500 < 600 ≤ 999) and the
// floor arms prove the minimum ('0', '-3' -> 1, never 0 — an
// empty answer from a non-empty journal is the vacuous-pass bug).
test('the ledger clamp is 1..500 — proven against a journal LARGER than the cap', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ledger-clamp-'))
  const ctx = new Context()
  await ctx.plugin(timerPlugin as unknown as Plugin)
  // J12: the state root rides the queue config (the retired seam)
  await ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot: root })
  const queue = ctx.get('queue', false) as {
    ledger(rawLimit: string, rawEvent: string): { entries: unknown[]; shown: number; matched: number }
  }
  for (let i = 1; i <= 600; i++) {
    appendLedger(root, 'clamp.x' + i, { i }, 1700000000 + i)
  }
  // the ceiling: a limit ABOVE the cap shows exactly the cap (600
  // rows exist, so 500 is the clamp, not the census)
  for (const over of ['999', '501']) {
    const t = queue.ledger(over, '')
    assert.equal(t.shown, 500, `limit '${over}' clamps to 500 (600 rows exist — this is the cap, not the census)`)
    assert.equal(t.entries.length, 500, `limit '${over}': 500 entries serve`)
  }
  // garbage falls to the DEFAULT (50 — the door's own law; never a
  // 400, never the cap), and 600 rows make 50 distinguishable from
  // "everything" for the first time
  const junk = queue.ledger('junk', '')
  assert.equal(junk.shown, 50, "garbage limit falls to the default 50 (600 rows exist — this is the default, not the census)")
  assert.equal(junk.entries.length, 50, 'garbage limit: 50 entries serve')
  // the floor: below 1 clamps UP to 1, never 0
  for (const under of ['0', '-3']) {
    const t = queue.ledger(under, '')
    assert.equal(t.shown, 1, `limit '${under}' clamps up to 1 (an empty answer from a non-empty journal is the vacuous-pass bug)`)
  }
  // and a within-range limit takes the N newest
  const t = queue.ledger('3', '')
  assert.equal(t.shown, 3)
  const first = t.entries[0] as { event?: string }
  const last = t.entries[2] as { event?: string }
  assert.equal(first.event, 'clamp.x598')
  assert.equal(last.event, 'clamp.x600')
})

// U4 ARM 1 (2026-10-31, the ledger's skill-read event class): a real
// melite_skill_read lands skill.read in the journal, and the tail's
// skill. filter serves it. The read id DERIVES from the live walks
// (the first non-spawn model row — never a frozen literal), the tail
// is read both sides of the read (the matched DELTA, never a bare
// count), and the journal is a real one on a temp stateRoot. The
// emission site (hSkillRead → appendLedger, skillPlane.ts:395) fires
// on its real door; the tail (tailLedger) reads on its real door.
test('U4 ARM 1 — a real skill read ledgers skill.read and the skill. filter serves it', async () => {
  const ROOT = join(import.meta.dirname, '../../../..')
  const state = mkdtempSync(join(tmpdir(), 'ledger-u4-'))
  const journal = join(state, 'output', '_ledger.jsonl')
  let sid: string | null = null
  for (const engine of engineDirs(join(ROOT, 'packages', 'engines'))) {
    for (const row of modelRows(engine)) {
      if (row.row.scope.endsWith('-spawn')) continue
      sid = row.row.id
      break
    }
    if (sid !== null) break
  }
  assert.ok(sid !== null, 'the live tree serves at least one readable skill row')
  const before = tailLedger(journal, '50', 'skill.')
  assert.equal(before.matched, 0, 'the fresh journal names no skill rows (else the delta proves nothing)')
  const ans = hSkillRead(ROOT, state, sid)
  assert.equal(ans.status, 200, 'the derived skill id reads on the real door: ' + JSON.stringify(ans.payload).slice(0, 200))
  const after = tailLedger(journal, '50', 'skill.')
  assert.equal(after.matched, before.matched + 1, 'exactly the read landed (a seeded journal would pass a bare count)')
  assert.equal(after.entries.length, 1, 'the filter serves exactly the read')
  const row = after.entries[0] as { event?: unknown; data?: unknown }
  assert.equal(row.event, 'skill.read', 'the landed row carries the skill-read class')
  assert.equal((row.data as { id?: unknown } | null | undefined)?.id, sid, 'the landed row names the read id')
})

// U4 ARM 2 (2026-10-31, the dead filter vocabulary): every event
// class the ledger_tail surface names is emitted by its owner seat.
// The emitted set derives from the estate-queue appendLedger call
// sites (static literals plus the dynamic run. prefix family); the
// named set derives from the tool surface text (dotted classes plus
// quoted filter examples). A name no seat emits — server.boot,
// run.registered, run.state, prov.state, the bare prov prefix — reds
// BY NAME.
test('U4 ARM 2 — every event class the ledger filter vocabulary names has an emitting seat', () => {
  const ROOT = join(import.meta.dirname, '../../../..')
  const srcDir = join(ROOT, 'packages/harness/estate-queue/src')
  const literals = new Set<string>()
  const dynamicPrefixes = new Set<string>()
  for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(join(srcDir, file), 'utf8')
    for (const m of text.matchAll(/appendLedger\(\s*[\w$]+\s*,\s*"([^"]+)"(\s*\+)?/g)) {
      if (m[2] !== undefined) dynamicPrefixes.add(m[1]!)
      else literals.add(m[1]!)
    }
  }
  assert.ok(literals.size > 0, 'the census found emitters (else the arm judges nothing)')
  const surface = readFileSync(join(ROOT, 'packages/harness/melite-tools/src/tools/ledger-tail.ts'), 'utf8')
  const named = new Set<string>()
  for (const m of surface.matchAll(/\b(server|prov|run|skill)\.[a-z_*]*/g)) named.add(m[0])
  for (const m of surface.matchAll(/"(server|prov|run|skill)"/g)) named.add(m[1]!)
  const live = (token: string): boolean => {
    const base = token.endsWith('*') ? token.slice(0, -1) : token
    if (literals.has(base) || dynamicPrefixes.has(base)) return true
    for (const lit of literals) if (lit.startsWith(base)) return true
    return false
  }
  const dead = [...named].filter((t) => !live(t)).sort()
  assert.deepEqual(dead, [], 'dead filter vocabulary (a named class no seat emits): ' + JSON.stringify(dead))
})

// U4 ARM 3 (2026-11-01, the vocab-audit W1 wall — the ARM 2 blind
// spot): every ledgerEvent CONSTRUCTED anywhere in estate-queue
// (not only appendLedger literals) is emitted by an appendLedger
// site, and every ledger("…")-shaped comment promises an emitted
// class. ARM 2 derives the emitted set only from
// appendLedger(…,"…") literals + the dynamic run. prefix — a
// RetryNote.ledgerEvent string never passes that regex, so the
// census was blind to the constructed literal that promised the
// journal row run.stage_retry no seat ever emitted (rank 3 MEDIUM:
// the journal promised an audit row that never lands). A
// reintroduced constructed-but-unemitted literal REDS BY NAME.
test('U4 ARM 3 — every constructed ledgerEvent literal is emitted (the stage_retry class)', () => {
  const ROOT = join(import.meta.dirname, '../../../..')
  const srcDir = join(ROOT, 'packages/harness/estate-queue/src')
  const literals = new Set<string>()
  const dynamicPrefixes = new Set<string>()
  const constructed = new Set<string>()
  let scanned = 0
  for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.ts'))) {
    scanned += 1
    const text = readFileSync(join(srcDir, file), 'utf8')
    for (const m of text.matchAll(/appendLedger\(\s*[\w$]+\s*,\s*"([^"]+)"(\s*\+)?/g)) {
      if (m[2] !== undefined) dynamicPrefixes.add(m[1]!)
      else literals.add(m[1]!)
    }
    // RetryNote-style construction: ledgerEvent: "run.stage_retry"
    for (const m of text.matchAll(/ledgerEvent:\s*"([^"]+)"/g)) constructed.add(m[1]!)
    // comment promises: ledger("run.stage_retry", ...) — the
    // lowercase spelling (appendLedger's capital L never matches)
    for (const m of text.matchAll(/(?<![A-Za-z])ledger\("([^"]+)"/g)) constructed.add(m[1]!)
  }
  assert.ok(scanned > 20, 'the census swept the seat sources (else the arm judges nothing)')
  assert.ok(literals.size > 0, 'the census found emitters (else the arm judges nothing)')
  const live = (token: string): boolean => {
    if (literals.has(token) || dynamicPrefixes.has(token)) return true
    for (const lit of literals) if (lit.startsWith(token)) return true
    return false
  }
  const dead = [...constructed].filter((t) => !live(t)).sort()
  assert.deepEqual(dead, [], 'constructed-but-unemitted ledger class (a journal promise no seat keeps): ' + JSON.stringify(dead))
})
