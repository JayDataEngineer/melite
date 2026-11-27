/**
 * engine-doors.ts — THE ESTATE ENGINE DOORS (hoisted from
 * gpu-harness.ts for the VRAM-admission seat: the seat wires the
 * real doors, the gate seats above the harness, and the harness
 * re-exports these for its row callers — no import cycle).
 *
 * Both doors ride the manage plane only — never a raw engine HTTP
 * poke, never systemctl from a test.
 */
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'

/** The seat's manage context (B4, 2026-11-27): a REAL timer seat —
 *  the teardown doors' quiet law polls the engine's queue on it
 *  (a zero-delay seat spun that poll hot) — the queue seat's own
 *  lifecycle latch class (the doors hold it across the vendor call;
 *  the seat owns no queue fiber, so it mints the latch itself), the
 *  estate's engine unit, and the production quiet window: the dev
 *  host's seat shares its engine with the operator's live lanes. */
async function seatManageCtx(stateRoot: string): Promise<ManageCtx> {
  const { LifecycleLatch } = await import('../../packages/harness/estate-queue/src/lifecycleLatch.ts')
  return {
    latch: new LifecycleLatch(),
    repoRoot: process.env.MELITE_REPO_ROOT ?? process.cwd(),
    stateRoots: [stateRoot],
    comfyUnit: 'melite-comfyui.service',
    autoProvision: false,
    engineQuiesceMs: 10_000,
    endpoint: () => ({ provision: 'managed', url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }),
    models: { allDecls: () => [] },
    timeout: (cb: () => void, ms: number) => { const t = setTimeout(cb, ms); return () => clearTimeout(t) },
  } as unknown as ManageCtx
}

type ManageCtx = import('../../packages/harness/estate-queue/src/managePlane.ts').ManageCtx

/** THE ENGINE-OWNED FREE DOOR (the rc.3 render lane, 2026-11-16):
 * the serial render lane's deepest rows (film-run's full stack)
 * leave residency the estate never evicts — and the engine's OWN
 * eviction path crashes under that pressure (upstream
 * model_management.free_memory indexes current_loaded_models out of
 * range, verbatim in the engine log; Layer B is not ours to patch).
 * The user path is the manage plane's free door: native /free
 * CHAINED with the warmed-seat release, answering what it released.
 * A consumer that needs the card calls THIS before it presses. */
export async function freeEngineResidency(w: { stateRoot: string }): Promise<void> {
  const { dispatchManage } = await import('../../packages/harness/estate-queue/src/managePlane.ts')
  const ctx = await seatManageCtx(w.stateRoot)
  const [, env] = await dispatchManage({ action: 'free' }, ctx)
  console.log(`[free-door] ${String((env as { detail?: string }).detail ?? 'residency freed')}`)
}

/** THE ESTATE-OWNED COLD-CARD HANDOFF: native /free answers
 * "issued (next worker iteration)" — on an IDLE queue no worker turn
 * comes, and under deep residency the engine's OWN eviction crashes
 * (upstream model_management.free_memory IndexError, verbatim in
 * the engine log — Layer B is not ours to patch). A consumer whose
 * budget probe still refuses after free + settle is pressure-locked:
 * the lawful cure is the manage plane's restart door
 * (/manager/reboot — systemd re-spawns the engine), then the
 * engine-up poll. Estate doors only, never systemctl from a test. */
export async function restartEngineResidency(w: { stateRoot: string }): Promise<void> {
  const { dispatchManage } = await import('../../packages/harness/estate-queue/src/managePlane.ts')
  const ctx = await seatManageCtx(w.stateRoot)
  const [, env] = await dispatchManage({ action: 'restart' }, ctx)
  console.log(`[restart-door] ${String((env as { detail?: string }).detail ?? 'reboot issued')}`)
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/system_stats`)
      if (r.ok) { console.log(`[restart-door] engine up after ${i * 2}s`); return }
    } catch { /* booting */ }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('[restart-door] engine never came back after reboot (120s)')
}

/** The seat's scratch state root — the doors' engine-side effect
 * needs no suite world; a pinned scratch dir keeps the manage
 * plane's state writes off the suites' sandboxes. */
export const SEAT_STATE_ROOT = join(tmpdir(), 'melite-engine-seat-state')
