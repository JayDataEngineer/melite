// @contract gates-engine-idle-handoff
// engine-idle-law.spec.ts — THE QUIET LAW's battery seat (B4,
// 2026-11-27: the restart-under-a-press burn). The pre-push battery's
// cold-card handoff restarts melite-comfyui.service ONLY after a
// QUIET engine: the engine's own queue empty and staying empty for
// the window, and no live run sidecar under any lane's declared state
// root. The wall drives tools/engine-idle.mjs on a virtual clock with
//
// DEAD IS POSITIVE EVIDENCE (2026-11-28, the browser-tier red): the
// first face of the stand-down arm modeled a DEAD engine as
// /system_stats answering 503 — an answering server — and the tool
// read every failed liveness read as death. On a box at 56/59 GB with
// a four-job queue on the engine both reads TIMED OUT; the handoff
// said "the engine went down" over a unit that had run untouched for
// twenty hours and stood down at once, the browser tier started
// against the still-busy engine, its host's seats never settled, and
// the tier red. Death is now the transport's own word (the B4b law's
// code set, parity pinned against the real classifier below); a
// timeout is unknown and rides the fail-closed wait.
// a scripted queue and real temp sidecars: the lane-root declaration
// reader (every profile spelling, unknown ⇒ stand down), the census
// (fail-closed like the plane's own), the wait (re-arm on a press,
// the census holding the gap between two windows, the budget's loud
// stand-down, a dead engine's at-once stand-down), the handoff's
// spawn discipline (one restart only on a quiet verdict), the pair
// with the manage provider's own default, and the hook's wiring.
import { describe, it, expect } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  HANDOFF_QUIESCE_MS, HANDOFF_WAIT_MS, QUIET_POLL_MS,
  awaitEngineIdle, coldCardHandoff, laneStateRoots, liveRunClaims, readQueue,
  GONE_CODES, goneCode,
} from '../../../../tools/engine-idle.mjs'
import { ManageConfig } from '../../../../packages/harness/estate-queue/src/manageRegistry.ts'
import { isTransportDownError } from '../../../../packages/engines/comfyui-cordis/src/supervisor.ts'

type Queue = { queue_running: unknown[]; queue_pending: unknown[] }
const EMPTY: Queue = { queue_running: [], queue_pending: [] }
const busy = (running: number, pending: number): Queue => ({
  queue_running: Array.from({ length: running }, () => ({})),
  queue_pending: Array.from({ length: pending }, () => ({})),
})
const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })

/** A virtual clock: sleep advances it, never the wall clock. */
function clock() {
  let t = 1_700_000_000_000
  return { now: () => t, sleep: async (ms: number) => { t += ms } }
}

/** A scripted engine: the queue serves the script per read (the last
 *  row holds); /system_stats answers while `alive`. */
function engine(script: Queue[], alive = true) {
  const reads: Queue[] = []
  const fetchImpl = async (url: URL): Promise<Response> => {
    if (url.pathname === '/queue') {
      const q = script[Math.min(reads.length, script.length - 1)]!
      reads.push(q)
      return json(q)
    }
    if (url.pathname === '/system_stats') return alive ? json({}) : json({}, 503)
    return json({}, 500)
  }
  return { fetchImpl, reads }
}

/** A temp state root with run sidecars the arms flip mid-wait. */
function claims() {
  const root = mkdtempSync(join(tmpdir(), 'engine-idle-claims-'))
  const out = join(root, 'output')
  mkdirSync(out, { recursive: true })
  const set = (name: string, status: string | null): void => {
    mkdirSync(join(out, name), { recursive: true })
    if (status !== null) writeFileSync(join(out, name, '_flow.json'), JSON.stringify({ status }))
  }
  return { roots: [root], root, set, rm: () => rmSync(root, { recursive: true, force: true }) }
}

const BASE = 'http://engine:8188'

describe('laneStateRoots — every declared state root on the box, every spelling', () => {
  it('reads the literal, the profileContext expression, and the repoRoot fallback; names what it cannot resolve', () => {
    const home = mkdtempSync(join(tmpdir(), 'engine-idle-home-'))
    try {
      const write = (rel: string, text: string): void => {
        mkdirSync(dirname(join(home, rel)), { recursive: true })
        writeFileSync(join(home, rel), text)
      }
      write('.dsh-a/profiles/web/cordis.patch.yml', 'plugins:\n- id: melite-estate\n  config:\n    stateRoot: !!js \'ctx.get("profileContext").dir + "/data/melite-runs"\'\n')
      write('.dsh-b/profiles/melite-test/cordis.patch.yml', '    repoRoot: "/home/user/lane-tree"\n    stateRoot: "/home/user/.dsh-b/runs"\n')
      write('.dsh-c/profiles/headless/cordis.patch.yml', '    repoRoot: "/home/user/somewhere"\n')
      write('.dsh-d/profiles/x/cordis.patch.yml', "    stateRoot: !!js 'ctx.get(\"somethingElse\")'\n")
      mkdirSync(join(home, '.dsh-e'))
      mkdirSync(join(home, 'not-a-dsh-home'), { recursive: true })
      const { roots, unknown } = laneStateRoots(home)
      expect(roots).toEqual([
        join(home, '.dsh-a/profiles/web/data/melite-runs'),
        '/home/user/.dsh-b/runs',
        '/home/user/somewhere/data/runs',
      ])
      expect(unknown).toEqual([join(home, '.dsh-d/profiles/x') + ' (stateRoot expression unresolved: !!js \'ctx.get("somethingElse")\')'])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe('liveRunClaims — the plane\'s own census law in the battery\'s spelling', () => {
  it('live words claim, settled words do not, unreadable state is live and named, an absent root is nothing', () => {
    const c = claims()
    try {
      c.set('run-live', 'running')
      c.set('run-queued', 'queued')
      c.set('run-stopping', 'stopping')
      c.set('run-done', 'completed')
      mkdirSync(join(c.root, 'output', 'run-mystery', '_flow.json'), { recursive: true })
      mkdirSync(join(c.root, 'output', 'run-fresh'))
      mkdirSync(join(c.root, 'test-output', 'run-test'), { recursive: true })
      writeFileSync(join(c.root, 'test-output', 'run-test', '_flow.json'), JSON.stringify({ status: 'running' }))
      expect(liveRunClaims([...c.roots, join(c.root, 'never-created')])).toEqual([
        'run-live', 'run-mystery (state unreadable: EISDIR)', 'run-queued', 'run-stopping', 'run-test',
      ])
    } finally {
      c.rm()
    }
  })
})

describe('awaitEngineIdle — the quiet verdict', () => {
  it('an empty queue with no live claim is idle only after the WHOLE window (polled, never one reading)', async () => {
    const ck = clock()
    const e = engine([EMPTY])
    const verdict = await awaitEngineIdle({ ...e, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, quiesceMs: HANDOFF_QUIESCE_MS })
    expect(verdict.idle).toBe(true)
    expect(verdict.waitedMs).toBeGreaterThanOrEqual(HANDOFF_QUIESCE_MS)
    expect(e.reads.length).toBeGreaterThanOrEqual(2)
  })

  it('a busy queue is waited on; a press landing INSIDE the window re-arms the clock (the film-between-windows burn)', async () => {
    const ck = clock()
    // empty (the gap), empty, BUSY (the next window presses), empty…
    const e = engine([EMPTY, EMPTY, busy(1, 0), EMPTY])
    const waits: string[] = []
    const verdict = await awaitEngineIdle({
      ...e, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, quiesceMs: 5000, onWait: (l: string) => waits.push(l),
    })
    expect(verdict.idle).toBe(true)
    expect(verdict.busyReads).toBe(1)
    // the verdict came at least a full window AFTER the busy read
    expect(verdict.waitedMs).toBeGreaterThanOrEqual(3 * QUIET_POLL_MS + 5000)
  })

  it('THE GAP: a live lane sidecar holds an otherwise-empty queue until the claim settles', async () => {
    const ck = clock()
    const c = claims()
    try {
      c.set('run-film', 'running')
      const e = engine([EMPTY])
      // the film settles its row two polls in
      let sleeps = 0
      const verdict = await awaitEngineIdle({
        ...e, baseUrl: BASE, stateRoots: c.roots, quiesceMs: 3000,
        now: ck.now,
        sleep: async (ms: number) => { await ck.sleep(ms); if (++sleeps === 2) c.set('run-film', 'completed') },
      })
      expect(verdict.idle).toBe(true)
      expect(verdict.busyReads).toBeGreaterThanOrEqual(1)
      expect(verdict.waitedMs).toBeGreaterThanOrEqual(2 * QUIET_POLL_MS + 3000)
    } finally {
      c.rm()
    }
  })

  it('a queue that never goes quiet answers busy with the rows and the claims it waited on', async () => {
    const ck = clock()
    const e = engine([busy(1, 2)])
    const waits: string[] = []
    const verdict = await awaitEngineIdle({
      ...e, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, quiesceMs: 1000, budgetMs: 70_000,
      onWait: (l: string) => waits.push(l),
    })
    expect(verdict.idle).toBe(false)
    expect(verdict.reason).toBe('busy')
    expect([verdict.running, verdict.pending]).toEqual([1, 2])
    expect(verdict.waitedMs).toBeGreaterThanOrEqual(70_000)
    expect(waits.some((w) => /engine queue busy — 1 running, 2 pending/.test(w))).toBe(true)
  })

  it('an unanswerable queue on an engine that ANSWERS — ok or 503, a server that listens is alive — is unknown ⇒ busy (fail-closed): the wait runs its budget', async () => {
    for (const status of [200, 503]) {
      const ck = clock()
      const fetchImpl = async (url: URL): Promise<Response> =>
        url.pathname === '/system_stats' ? json({}, status) : json({ error: 'no queue' }, 500)
      const v = await awaitEngineIdle({ fetchImpl, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, budgetMs: 10_000 })
      expect(v.idle).toBe(false)
      expect(v.reason).toBe('busy')
      expect(v.waitedMs).toBeGreaterThanOrEqual(10_000)
    }
  })

  it('THE 2026-11-28 BURN: a SLOW engine — every read times out — is NOT dead; unknown ⇒ busy, the budget runs, the handoff waits, and no voice says gone', async () => {
    const ck = clock()
    const timedOut = async (): Promise<Response> => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError') }
    const v = await awaitEngineIdle({ fetchImpl: timedOut, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, budgetMs: 10_000 })
    expect(v.idle).toBe(false)
    expect(v.reason).toBe('busy')
    expect(v.waitedMs).toBeGreaterThanOrEqual(10_000)
    expect('goneCode' in v).toBe(false)
    const waits: string[] = []
    await awaitEngineIdle({ fetchImpl: timedOut, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, budgetMs: 10_000, onWait: (l: string) => waits.push(l) })
    expect(waits.some((w) => /engine queue unreadable — the engine answers nothing in time \(slow, or gone unproven\); unknown counts as busy/.test(w))).toBe(true)
    const notes: string[] = []
    const out = await coldCardHandoff({
      fetchImpl: timedOut, baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async () => ({ status: 0 }), log: (l: string) => notes.push(l), sleep: ck.sleep, now: ck.now, budgetMs: 6_000,
    })
    expect(out.restarted).toBe(false)
    expect(out.reason).toBe('busy')
    expect(notes.at(-1)).toMatch(/SKIP-LOUD: engine busy for 6s/)
    expect(notes.some((n) => /went down|GONE/.test(n))).toBe(false)
  })

  it('a GONE engine — the transport REFUSES on undici\'s cause hop — stands the wait down at once, carrying the code; the note names the address and the code', async () => {
    const ck = clock()
    const refused = async (): Promise<Response> => {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8188'), { code: 'ECONNREFUSED' }) })
    }
    const v = await awaitEngineIdle({ fetchImpl: refused, baseUrl: BASE, stateRoots: [], sleep: ck.sleep, now: ck.now, budgetMs: HANDOFF_WAIT_MS })
    expect(v.idle).toBe(false)
    expect(v.reason).toBe('engine-down')
    expect(v.goneCode).toBe('ECONNREFUSED')
    expect(v.waitedMs).toBe(0)
    const calls: Array<[string, string[]]> = []
    const notes: string[] = []
    const out = await coldCardHandoff({
      fetchImpl: refused, baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async (cmd: string, args: string[]) => { calls.push([cmd, args]); return { status: 0 } }, log: (l: string) => notes.push(l), sleep: ck.sleep, now: ck.now,
    })
    expect(out.restarted).toBe(false)
    expect(calls).toEqual([])
    expect(notes.at(-1)).toBe('SKIP-LOUD: the engine is GONE at ' + BASE + ' (ECONNREFUSED) — nobody listens, nothing to restart; the browser tier runs against whatever answers (its own boot grace covers a re-spawn)')
  })

  it('goneCode reads the code on the error itself or on the cause hop, and says nothing for a timeout, an abort, or a code-less failure', () => {
    expect(goneCode(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe('ECONNRESET')
    expect(goneCode(new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'EPIPE' }) }))).toBe('EPIPE')
    expect(goneCode(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))).toBeNull()
    expect(goneCode(new DOMException('This operation was aborted', 'AbortError'))).toBeNull()
    expect(goneCode(new TypeError('fetch failed'))).toBeNull()
    expect(goneCode(Object.assign(new Error('x'), { code: 'UND_ERR_CONNECT_TIMEOUT' }))).toBeNull()
    expect(goneCode(undefined)).toBeNull()
  })

  it('PARITY WITH THE B4b LAW (the real classifier, imported): every gone code is transport-dead there, and the timeout codes are in neither set', () => {
    expect([...GONE_CODES].sort()).toEqual(['EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTDOWN', 'EHOSTUNREACH', 'ENETDOWN', 'ENETUNREACH', 'ENOTFOUND', 'EPIPE'])
    for (const code of GONE_CODES) expect(isTransportDownError({ code }), code).toBe(true)
    expect(GONE_CODES.has('UND_ERR_CONNECT_TIMEOUT')).toBe(false)
    expect(isTransportDownError({ code: 'UND_ERR_CONNECT_TIMEOUT' })).toBe(false)
    expect(isTransportDownError(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))).toBe(false)
  })
})

describe('coldCardHandoff — the spawn discipline', () => {
  it('restarts ONCE, with the estate unit, only on a quiet verdict', async () => {
    const ck = clock()
    const calls: Array<[string, string[]]> = []
    const notes: string[] = []
    const e = engine([busy(1, 0), EMPTY, EMPTY])
    const out = await coldCardHandoff({
      ...e, baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async (cmd: string, args: string[]) => { calls.push([cmd, args]); return { status: 0 } },
      log: (l: string) => notes.push(l), sleep: ck.sleep, now: ck.now, quiesceMs: 2000, bootProbeMs: 12_000,
    })
    expect(out.restarted).toBe(true)
    expect(calls).toEqual([['systemctl', ['--user', 'restart', 'melite-comfyui.service']]])
    expect(notes.at(-1)).toMatch(/HANDOFF: engine restarted cold/)
  })

  it('NEVER restarts under a press: a busy engine is left running and the note says so LOUD', async () => {
    const ck = clock()
    const calls: Array<[string, string[]]> = []
    const notes: string[] = []
    const e = engine([busy(2, 1)])
    const out = await coldCardHandoff({
      ...e, baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async (cmd: string, args: string[]) => { calls.push([cmd, args]); return { status: 0 } },
      log: (l: string) => notes.push(l), sleep: ck.sleep, now: ck.now, quiesceMs: 1000, budgetMs: 5000,
    })
    expect(out.restarted).toBe(false)
    expect(out.reason).toBe('busy')
    expect(calls).toEqual([])
    expect(notes.at(-1)).toMatch(/SKIP-LOUD: engine busy for 5s \(2 running, 1 pending; live lane runs: none\) — NOT restarted/)
  })

  it('an unknown lane declaration stands the handoff down before any read', async () => {
    const calls: Array<[string, string[]]> = []
    const notes: string[] = []
    const out = await coldCardHandoff({
      fetchImpl: async () => json({}), baseUrl: BASE, stateRoots: [], unknown: ['/x (stateRoot expression unresolved: y)'],
      spawn: async (cmd: string, args: string[]) => { calls.push([cmd, args]); return { status: 0 } },
      log: (l: string) => notes.push(l), sleep: clock().sleep, now: clock().now,
    })
    expect(out.restarted).toBe(false)
    expect(out.reason).toBe('unknown-lane')
    expect(calls).toEqual([])
    expect(notes.at(-1)).toMatch(/SKIP-LOUD: a lane's declared state root is unreadable/)
  })

  it('an absent unit is the warm-card skip (spawn non-zero), a GONE engine mid-wait — the transport refuses — the down skip', async () => {
    const ck = clock()
    const e = engine([EMPTY])
    const absent = await coldCardHandoff({
      ...e, baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async () => ({ status: 1 }), log: () => {}, sleep: ck.sleep, now: ck.now, quiesceMs: 0,
    })
    expect(absent.reason).toBe('unit-absent')
    // death is the transport's word — a 503 is an answering server (alive ⇒ busy, the arm above)
    const dead = await coldCardHandoff({
      fetchImpl: async () => { throw new TypeError('fetch failed', { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) }) },
      baseUrl: BASE, stateRoots: [], unknown: [],
      spawn: async () => ({ status: 0 }), log: () => {}, sleep: ck.sleep, now: ck.now,
    })
    expect(dead.reason).toBe('engine-down')
    expect(dead.restarted).toBe(false)
  })
})

describe('the pair with the manage plane + the hook\'s wiring', () => {
  it('the handoff\'s quiet window IS the manage provider\'s default (one law, two seats, one number)', () => {
    expect(HANDOFF_QUIESCE_MS).toBe(ManageConfig({}).engineQuiesceMs)
    expect(QUIET_POLL_MS).toBe(1000)
  })

  it('readQueue answers null for an unanswerable or malformed queue and counts for a parseable one', async () => {
    expect(await readQueue(async () => json({}, 500), BASE)).toBeNull()
    expect(await readQueue(async () => json({ queue_running: [] }), BASE)).toBeNull()
    expect(await readQueue(async () => { throw new Error('down') }, BASE)).toBeNull()
    expect(await readQueue(async () => json(busy(1, 3)), BASE)).toEqual({ running: 1, pending: 3 })
  })

  it('the battery rides the handoff module — no raw systemctl restart survives beside it', () => {
    const hook = readFileSync(join(process.cwd(), 'tools/hook-full-battery.mjs'), 'utf8')
    expect(hook).toContain('from "./engine-idle.mjs"')
    expect(hook).toMatch(/coldCardHandoff\(\{/)
    expect(hook).toMatch(/laneStateRoots\(\)/)
    expect(hook).not.toMatch(/spawnTee\("systemctl"/)
    const leases = readFileSync(join(process.cwd(), 'tools/battery-leases.mjs'), 'utf8')
    expect(leases).toContain('"tools/engine-idle.mjs"')
  })

  it('the wait reads liveness through the cause-hop reader only — a failed read is never read as death by itself', () => {
    const tool = readFileSync(join(process.cwd(), 'tools/engine-idle.mjs'), 'utf8')
    expect(tool).toContain('const liveness = await engineLiveness(fetchImpl, baseUrl);')
    expect(tool).toContain('if (liveness.state === "gone") {')
    expect(tool).not.toMatch(/\bengineAlive\b/)
    expect(tool).not.toMatch(/catch\s*\{\s*return false;/)
  })
})
