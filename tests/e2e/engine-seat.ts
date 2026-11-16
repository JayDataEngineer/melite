/**
 * engine-seat.ts — THE VRAM-ADMISSION SEAT (operator order
 * 2026-11-17: VRAM-aware admission as the successor to the blunt
 * 1-worker law). The battery's e2e tier ran every suite under
 * DSH_E2E_MAX_WORKERS=1 because two heavy suites storming the one
 * engine swap the host to death — a global cap that also serializes
 * rows which never touch the engine. This seat is the successor:
 * admission judged on the CARD'S TRUTH, not a worker count.
 *
 * The law, one acquire:
 *   1. no-engine → the suite self-skips (a skip is not a cost
 *      signal — the gate's own first law).
 *   2. EXCLUSIVE cross-process seat (one engine, one seated
 *      consumer; the lock is a file the OS survives — pid death
 *      or a stopped heartbeat makes it takable, a live holder is
 *      never stolen from).
 *   3. busy probe AFTER the seat (drain-aware: a sibling's last
 *      stopped run drains in seconds; sustained foreign work —
 *      the operator's own render — defers).
 *   4. VRAM ADMISSION: free VRAM ≥ floor → admit. Under the
 *      floor → the estate's free door, settle, re-probe; still
 *      locked → the manage plane's restart door (the escape
 *      ladder the anny row hand-carried, now one law), or a
 *      NAMED defer when the escape is disarmed.
 *
 * Pure core, no module-top effects: the wall injects every door;
 * engine-gate.ts wires the real doors under MELITE_E2E_SEAT=1.
 */
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The holder record inside the lock file. */
interface Holder { pid: number, heldSince: number }

/** The verdict vocabulary (not exported — the wall drives the
 * door functions directly and knip's tracer does not follow the
 * gate's dynamic type import). */
type SeatVerdict = 'held' | 'no-engine' | 'busy' | 'vram-locked'

export interface EngineSeatDeps {
  /** Lock home — one directory per engine (created if absent). */
  dir: string
  /** Admission floor, MiB: under it the pressure ladder fires. */
  floorMb: number
  /** A lock whose heartbeat stopped this long ago is takable. */
  staleMs?: number
  /** Lock retry cadence while a live holder holds. */
  pollMs?: number
  /** Pressure-ladder re-probes after the free door. */
  settleTries?: number
  settleWaitMs?: number
  /** Drain-aware busy probes before declaring foreign work. */
  busyDrainTries?: number
  busyDrainWaitMs?: number
  /** Holder heartbeat cadence — each beat APPENDS a byte (mtime
   * proof the holder lives; an open alone never moves mtime). */
  heartbeatMs?: number
  /** Pressure-locked escape: the estate restart door, or a named defer. */
  pressureEscape?: 'restart' | 'defer'
  probeAlive(): Promise<boolean>
  probeFreeMb(): Promise<number>
  probeBusy(): Promise<boolean>
  freeDoor(): Promise<void>
  restartDoor(): Promise<void>
}

interface EngineSeat {
  acquire(): Promise<SeatVerdict>
  release(): Promise<void>
  isHeld(): boolean
}

const HEARTBEAT_MS = 30_000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** True when the pid answers signal 0 (EPERM = alive, foreign user). */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * @param deps every engine door, injected — the wall spies these
 * @returns the seated verdict plus its release
 */
export function createEngineSeat(deps: EngineSeatDeps): EngineSeat {
  const lockPath = join(deps.dir, 'engine.lock')
  const staleMs = deps.staleMs ?? 120_000
  const pollMs = deps.pollMs ?? 250
  const settleTries = deps.settleTries ?? 24
  const settleWaitMs = deps.settleWaitMs ?? 5_000
  const busyDrainTries = deps.busyDrainTries ?? 3
  const busyDrainWaitMs = deps.busyDrainWaitMs ?? 2_000
  const pressureEscape = deps.pressureEscape ?? 'restart'
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let held = false

  /** One lock attempt: wx-create wins; EEXIST judges the holder
   * (dead pid or stale heartbeat → takeover; live → wait). */
  function tryTake(): boolean {
    try {
      const fd = openSync(lockPath, 'wx')
      writeFileSync(fd, JSON.stringify({ pid: process.pid, heldSince: Date.now() } satisfies Holder))
      closeSync(fd)
      return true
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      if (err.code !== 'EEXIST') throw err
      try {
        const raw = readFileSync(lockPath, 'utf8')
        // an EMPTY or torn read is a holder mid-write (wx-create
        // lands the file before the JSON does) — never a verdict;
        // wait one poll and judge the completed record
        const holder = raw.trim() === '' ? {} : JSON.parse(raw) as Partial<Holder>
        const dead = typeof holder.pid === 'number' && !pidAlive(holder.pid)
        const stale = Date.now() - statSync(lockPath).mtimeMs > staleMs
        if (dead || stale) rmSync(lockPath, { force: true })
      } catch (judge) {
        const j = judge as NodeJS.ErrnoException
        if (j.code === 'ENOENT') {
          // raced away under us — the next wx attempt decides
        } else if (judge instanceof SyntaxError) {
          // torn write — the holder record is still landing; one
          // poll later the read judges the complete record
        } else {
          throw j
        }
      }
      return false
    }
  }

  async function release(): Promise<void> {
    if (heartbeat !== null) {
      clearInterval(heartbeat)
      heartbeat = null
    }
    if (held) {
      held = false
      rmSync(lockPath, { force: true })
    }
  }

  async function acquire(): Promise<SeatVerdict> {
    if (!(await deps.probeAlive())) return 'no-engine'
    mkdirSync(deps.dir, { recursive: true })
    while (!tryTake()) await sleep(pollMs)
    held = true
    // THE HEARTBEAT: one appended byte per beat (JSON tolerates the
    // trailing whitespace) — a write, never a bare open, because
    // mtime moves on WRITE and the stale bound judges mtime. A
    // no-op heartbeat stole live holders at the stale bound (the
    // first 2-worker tier: every sibling deflected onto a pressing
    // queue and the engine files busy-deferred unlawfully).
    const heartbeatMs = deps.heartbeatMs ?? HEARTBEAT_MS
    heartbeat = setInterval(() => {
      try {
        appendFileSync(lockPath, ' ')
      } catch { /* the lock left our hands — nothing to beat */ }
    }, heartbeatMs)
    heartbeat.unref()
    // foreign work, drain-aware: a sibling seat-holder's last
    // stopped run empties in seconds — sustained occupancy is the
    // operator's own render and defers.
    for (let i = 0; i < busyDrainTries; i++) {
      if (!(await deps.probeBusy())) break
      if (i === busyDrainTries - 1) {
        await release()
        return 'busy'
      }
      await sleep(busyDrainWaitMs)
    }
    // VRAM ADMISSION — the card's truth, then the ladder.
    if ((await deps.probeFreeMb()) >= deps.floorMb) return 'held'
    await deps.freeDoor()
    for (let i = 0; i < settleTries; i++) {
      if ((await deps.probeFreeMb()) >= deps.floorMb) return 'held'
      await sleep(settleWaitMs)
    }
    if (pressureEscape === 'restart') {
      await deps.restartDoor()
      if ((await deps.probeFreeMb()) >= deps.floorMb) return 'held'
    }
    await release()
    return 'vram-locked'
  }

  return {
    acquire,
    release,
    isHeld: () => held,
  }
}
