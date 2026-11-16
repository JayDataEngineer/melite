/**
 * engine-gate.ts — THE ONE ENGINE GATE (operator order 2026-11-06:
 * lifecycle/queuing/markers — eleven hand-carried engineAlive
 * copies consolidated here; the census wall refuses engine e2e
 * that gates any other way).
 *
 * Three states, one verdict:
 *   - no-engine: nothing answers /system_stats → self-skip (a skip
 *     is not a cost signal; no-engine runs prove nothing).
 *   - busy: the engine answers but /queue holds running or pending
 *     work — the operator's own render, another lane, a bench run.
 *     Automated suites DEFER (self-skip) rather than contend for
 *     the one GPU; MELITE_E2E_FORCE=1 queues behind instead (the
 *     engine's FIFO is correct, just slow).
 *   - open: submit.
 *
 * Pins (the inference-smoke precedent): MELITE_E2E_COMFYUI_HOST
 * (default 127.0.0.1), MELITE_E2E_COMFYUI_PORT (default 8188).
 *
 * Suites gate their describe/it on ENGINE_FREE and import nothing
 * else engine-shaped. Suites that need no engine by design
 * (compose-smoke, estate-smoke) carry `// NO-ENGINE: <reason>`
 * instead of importing this — the wall reads the marker.
 */

export const ENGINE_HOST = process.env['MELITE_E2E_COMFYUI_HOST'] ?? '127.0.0.1'
export const ENGINE_PORT = Number(process.env['MELITE_E2E_COMFYUI_PORT'] ?? '8188')
const ENGINE_URL = `http://${ENGINE_HOST}:${ENGINE_PORT}`

/** Queue behind a busy engine instead of deferring (default 0). */
const FORCE = process.env['MELITE_E2E_FORCE'] === '1'

/** THE RENDER LANE GATE (operator order 2026-11-16, verbatim intent,
 * scrubbed voice): the GPU render rows leave the battery — its
 * minimum-time law. The rows that
 * await a REAL render (artifact bytes from the engine) are the
 * battery's only slow surface — ~40 minutes of engine time against
 * seconds for a compose stamp. They ride the manual render lane
 * (MELITE_GPU_RENDER=1, the same law as FILM_E2E and H3_ARENA); the
 * stamp rows (compose + queue + serialized-graph shape) stay in the
 * battery and own the mint/compose law surface. The gate rides each
 * render row's own skipIf — structural, never a title pattern (a
 * renamed row must never silently leave the lane). */
export const GPU_RENDER = process.env['MELITE_GPU_RENDER'] === '1'

export async function engineAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_URL}/system_stats`, {
      signal: AbortSignal.timeout(30_000),
    })
    return res.ok
  } catch {
    return false
  }
}

interface EngineQueue {
  queue_running?: unknown[]
  queue_pending?: unknown[]
}

/** True while the engine holds running or pending work (someone's
 *  render is on the GPU). Unknown (fetch error, odd shape) reads
 *  NOT busy — the alive gate already skips dead engines, and a
 *  sick engine should fail loud on submit, never hide behind busy. */
export async function engineBusy(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_URL}/queue`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return false
    const q = (await res.json()) as EngineQueue
    return (q.queue_running?.length ?? 0) + (q.queue_pending?.length ?? 0) > 0
  } catch {
    return false
  }
}

const HAS_ENGINE = await engineAlive()
const BUSY = HAS_ENGINE && !FORCE && (await engineBusy())

/** Free VRAM on the engine's primary device, MiB (0 unknown). */
export async function engineVramFreeMb(): Promise<number> {
  try {
    const res = await fetch(`${ENGINE_URL}/system_stats`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return 0
    const stats = (await res.json()) as { devices?: Array<{ vram_free?: number }> }
    return Math.floor(Number(stats.devices?.[0]?.vram_free ?? 0))
  } catch {
    return 0
  }
}

/** The vram-defer verdict for a suite whose stage carries a
 *  vram_budget_mb (the execute door proves headroom and refuses
 *  loud under it; the serial tier's earlier suites leave residency
 *  the estate never evicts — a skip is not a cost signal, the same
 *  law as the busy-defer). Await at module top, gate the describe
 *  on the verdict. */
export const engineVramFits = async (budgetMb: number): Promise<boolean> =>
  !HAS_ENGINE || (await engineVramFreeMb()) >= budgetMb

/** The verdict suites gate on: describe.skipIf(!ENGINE_FREE). */
export const ENGINE_FREE = HAS_ENGINE && !BUSY

/** Why a gated suite skips (null when open) — for logs, not logic. */
export const ENGINE_SKIP_REASON: 'no-engine' | 'busy' | null =
  !HAS_ENGINE ? 'no-engine' : BUSY ? 'busy' : null

declare global {
  // eslint-disable-next-line no-var
  var __meliteEngineGateLogged: boolean | undefined
}
if (!ENGINE_FREE && !globalThis.__meliteEngineGateLogged) {
  globalThis.__meliteEngineGateLogged = true
  console.warn(
    `[engine-gate] engine ${ENGINE_SKIP_REASON === 'busy' ? 'busy (operator work on the GPU — deferring; MELITE_E2E_FORCE=1 queues behind)' : `absent at ${ENGINE_URL} — deferring`}`,
  )
}
