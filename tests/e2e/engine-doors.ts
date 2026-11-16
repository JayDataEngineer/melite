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
  const ctx = {
    repoRoot: process.env.MELITE_REPO_ROOT ?? process.cwd(),
    stateRoots: [w.stateRoot],
    endpoint: () => ({ provision: 'managed', url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }),
    models: { allDecls: () => [] },
    timeout: (cb: () => void) => { const t = setTimeout(cb, 0); return () => clearTimeout(t) },
  } as never
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
  const ctx = {
    repoRoot: process.env.MELITE_REPO_ROOT ?? process.cwd(),
    stateRoots: [w.stateRoot],
    endpoint: () => ({ provision: 'managed', url: `http://${ENGINE_HOST}:${ENGINE_PORT}` }),
    models: { allDecls: () => [] },
    timeout: (cb: () => void) => { const t = setTimeout(cb, 0); return () => clearTimeout(t) },
  } as never
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
