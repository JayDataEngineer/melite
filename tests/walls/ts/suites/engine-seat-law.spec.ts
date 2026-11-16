/**
 * engine-seat-law.spec.ts — THE VRAM-ADMISSION SEAT WALL (operator
 * order 2026-11-17: VRAM-aware admission as the successor to the
 * battery's blunt DSH_E2E_MAX_WORKERS=1). The seat is the law:
 * one engine, one seated consumer, admitted on the card's ACTUAL
 * free VRAM with the estate's free/restart doors as the pressure
 * ladder. Every door is injected here — the wall judges the LAW,
 * never a live engine. The final arms judge the succession itself:
 * the battery's cap is 2 (not the blunt 1) and the e2e project's
 * own env activates the seat.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { createEngineSeat, type EngineSeatDeps } from '../../../e2e/engine-seat.ts'

const ROOT = resolveRoot()
function resolveRoot(): string {
  return join(import.meta.dirname, '..', '..', '..', '..')
}

/** Spied doors + scripted probe sequences (shift per call). */
function fakeDeps(dir: string, over: Partial<EngineSeatDeps> = {}) {
  const calls = { free: 0, restart: 0 }
  const freeMb: number[] = []
  const busy: boolean[] = []
  const deps: EngineSeatDeps = {
    dir,
    floorMb: 8_000,
    pollMs: 20,
    settleTries: 3,
    settleWaitMs: 10,
    busyDrainTries: 3,
    busyDrainWaitMs: 10,
    probeAlive: async () => true,
    probeFreeMb: async () => (freeMb.length > 1 ? (freeMb.shift() as number) : (freeMb[0] ?? 24_000)),
    probeBusy: async () => (busy.length > 1 ? (busy.shift() as boolean) : (busy[0] ?? false)),
    freeDoor: async () => { calls.free += 1 },
    restartDoor: async () => { calls.restart += 1; freeMb.length = 0; freeMb.push(24_000) },
    ...over,
  }
  return { deps, calls, freeMb, busy }
}

function seatDir(): string {
  return mkdtempSync(join(tmpdir(), 'engine-seat-law-'))
}

describe('the seat admits on the card\'s truth — the VRAM fast path and the pressure ladder', () => {
  it('free VRAM over the floor admits WITHOUT touching the free door (the fast path is the common case)', async () => {
    const { deps, calls, freeMb } = fakeDeps(seatDir(), { floorMb: 8_000 })
    freeMb.push(16_000)
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('held')
    expect(calls.free).toBe(0)
    await seat.release()
  })

  it('under the floor the free door fires, the settle re-probes, and a fitting card admits', async () => {
    const { deps, calls, freeMb } = fakeDeps(seatDir(), { floorMb: 8_000, settleTries: 3, settleWaitMs: 10 })
    freeMb.push(1_000, 1_000, 9_000)
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('held')
    expect(calls.free).toBe(1)
    expect(calls.restart).toBe(0)
    await seat.release()
  })

  it('a pressure-locked card with the escape disarmed defers NAMED and releases the seat for the next consumer', async () => {
    const dir = seatDir()
    const { deps, calls, freeMb } = fakeDeps(dir, { floorMb: 8_000, pressureEscape: 'defer', settleTries: 2, settleWaitMs: 10 })
    freeMb.push(1_000)
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('vram-locked')
    expect(calls.free).toBe(1)
    expect(calls.restart).toBe(0)
    expect(seat.isHeld()).toBe(false)
    // the seat is FREE — the next consumer takes it (a defer never wedges the tier)
    const next = createEngineSeat({ ...deps, probeAlive: async () => false })
    expect(await next.acquire()).toBe('no-engine')
  })

  it('the restart escape is the ladder\'s last rung: the estate door fires once and the rebooted card admits', async () => {
    const { deps, calls, freeMb } = fakeDeps(seatDir(), { floorMb: 8_000, settleTries: 2, settleWaitMs: 10 })
    freeMb.push(1_000, 1_000, 1_000)
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('held')
    expect(calls.restart).toBe(1)
    await seat.release()
  })
})

describe('the seat is exclusive across consumers — one engine, one seated presser', () => {
  it('a second acquire WAITS while a live holder holds, and takes the seat at release', async () => {
    const { deps } = fakeDeps(seatDir())
    const a = createEngineSeat(deps)
    expect(await a.acquire()).toBe('held')
    const b = createEngineSeat(deps)
    let bVerdict = 'pending'
    const race = b.acquire().then((v) => { bVerdict = v; return v })
    await new Promise((r) => setTimeout(r, 120))
    expect(bVerdict).toBe('pending')
    await a.release()
    expect(await race).toBe('held')
    await b.release()
  })

  it('a DEAD holder\'s lock is takable (pid death frees the seat — no wedged tier)', async () => {
    const dir = seatDir()
    writeFileSync(join(dir, 'engine.lock'), JSON.stringify({ pid: 999_999_999, heldSince: Date.now() }))
    const { deps } = fakeDeps(dir)
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('held')
    await seat.release()
  })

  it('a WEDGED holder (pid alive, heartbeat stopped) loses the seat at the stale bound — a live holder never does', async () => {
    const dir = seatDir()
    // our own pid (alive) with a heartbeat mtime past the stale bound
    writeFileSync(join(dir, 'engine.lock'), JSON.stringify({ pid: process.pid, heldSince: Date.now() }))
    const past = new Date(Date.now() - 60 * 60 * 1000)
    utimesSync(join(dir, 'engine.lock'), past, past)
    const { deps } = fakeDeps(dir, { staleMs: 120_000 })
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('held')
    await seat.release()
  })

  it('a live holder with a fresh heartbeat is NEVER stolen from (the stale bound alone does not fire)', async () => {
    const dir = seatDir()
    writeFileSync(join(dir, 'engine.lock'), JSON.stringify({ pid: process.pid, heldSince: Date.now() }))
    const { deps } = fakeDeps(dir, { staleMs: 60_000, pollMs: 20 })
    const seat = createEngineSeat(deps)
    let verdict = 'pending'
    const race = seat.acquire().then((v) => { verdict = v; return v })
    await new Promise((r) => setTimeout(r, 150))
    expect(verdict).toBe('pending') // still waiting on the live, fresh holder
    expect(existsSync(join(dir, 'engine.lock'))).toBe(true)
    race.catch(() => { /* the held promise never settles in this arm */ })
  })

  it('THE HEARTBEAT KEEPS A LIVE HOLDER FRESH past the stale bound (the no-op-open regression that stole every holder at 120s)', async () => {
    const dir = seatDir()
    const { deps } = fakeDeps(dir, { staleMs: 300, heartbeatMs: 60, pollMs: 20 })
    const a = createEngineSeat(deps)
    expect(await a.acquire()).toBe('held')
    // idle WELL past the stale bound — only the heartbeat's appended
    // bytes keep the holder fresh (a bare open never moves mtime)
    await new Promise((r) => setTimeout(r, 700))
    const b = createEngineSeat(deps)
    let bVerdict = 'pending'
    const race = b.acquire().then((v) => { bVerdict = v; return v })
    await new Promise((r) => setTimeout(r, 200))
    expect(bVerdict).toBe('pending') // the live holder was never stale
    await a.release()
    expect(await race).toBe('held')
    await b.release()
  })

  it('a MID-WRITE holder record (wx-created, JSON not yet landed) never crashes the waiter — torn reads wait, complete records judge', async () => {
    const dir = seatDir()
    // the exact window the first 2-worker tier burned on: the file
    // exists, its bytes have not landed
    writeFileSync(join(dir, 'engine.lock'), '')
    const { deps } = fakeDeps(dir, { pollMs: 20 })
    const seat = createEngineSeat(deps)
    let verdict = 'pending'
    const race = seat.acquire().then((v) => { verdict = v; return v })
    await new Promise((r) => setTimeout(r, 100))
    expect(verdict).toBe('pending') // waited, never threw
    // the write completes as a DEAD holder — the waiter takes over
    writeFileSync(join(dir, 'engine.lock'), JSON.stringify({ pid: 999_999_999, heldSince: Date.now() }))
    expect(await race).toBe('held')
    await seat.release()
  })
})

describe('the seat\'s first laws — no-engine and the drain-aware busy probe', () => {
  it('a dead engine answers no-engine and never touches the lock (a skip is not a cost signal)', async () => {
    const dir = seatDir()
    const { deps } = fakeDeps(dir, { probeAlive: async () => false })
    const seat = createEngineSeat(deps)
    expect(await seat.acquire()).toBe('no-engine')
    expect(existsSync(join(dir, 'engine.lock'))).toBe(false)
  })

  it('a DRAINING queue (a sibling\'s last stopped run) admits — sustained foreign work defers and releases', async () => {
    const draining = fakeDeps(seatDir(), { busyDrainTries: 3, busyDrainWaitMs: 10 })
    draining.busy.push(true, false)
    const drainSeat = createEngineSeat(draining.deps)
    expect(await drainSeat.acquire()).toBe('held')
    await drainSeat.release()

    const foreign = fakeDeps(seatDir(), { busyDrainTries: 2, busyDrainWaitMs: 10 })
    foreign.busy.push(true, true, true)
    const busySeat = createEngineSeat(foreign.deps)
    expect(await busySeat.acquire()).toBe('busy')
    expect(busySeat.isHeld()).toBe(false)
  })
})

describe('the succession itself — the blunt cap is dead, the seat is the law', () => {
  it('the battery runs the e2e tier at TWO workers behind the seat (the blunt DSH_E2E_MAX_WORKERS=1 is gone)', () => {
    const src = readFileSync(join(ROOT, 'tools/hook-full-battery.mjs'), 'utf8')
    expect(src, 'the blunt serial cap must not return').not.toMatch(/DSH_E2E_MAX_WORKERS.*"1"/)
    expect(src).toContain('DSH_E2E_MAX_WORKERS: "2"')
    expect(src, 'the cap ride must name its law (the seat), never a bare number').toContain('VRAM-ADMISSION SEAT')
  })

  it('the default floor judges the TIER\'S HEAVIEST press, never its average (the 8 GB floor admitted the h3 cold-load onto a pressured card)', () => {
    const gate = readFileSync(join(ROOT, 'tests/e2e/engine-gate.ts'), 'utf8')
    expect(gate).toContain("?? '16000'")
  })

  it('the e2e project activates the seat through its own env — walls and production importers keep the plain gate', () => {
    const cfg = readFileSync(join(ROOT, 'vitest.e2e.config.ts'), 'utf8')
    expect(cfg).toContain("MELITE_E2E_SEAT: '1'")
    const gate = readFileSync(join(ROOT, 'tests/e2e/engine-gate.ts'), 'utf8')
    expect(gate, 'the seat is env-gated — no importer outside the e2e project seats').toContain("MELITE_E2E_SEAT'] === '1'")
  })
})
