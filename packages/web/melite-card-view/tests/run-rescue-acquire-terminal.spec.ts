// @vitest-environment happy-dom
// run-rescue-acquire-terminal.spec.ts — ACQUIRE TERMINAL TRUTH
// (ERRORS.md k2/m + the purge plan's P5 rescue honesty:
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7 P5).
//
// THE BURN: a download stuck at X% is declared COMPLETE by the
// rescue — `ACQUIRE_TERMINAL` counts the NON-terminal 'active' state
// as terminal (run-rescue-core.ts:132), so a first poll answering
// `state: 'active'` finishes the rescue with an "acquired" success
// before a single further poll; a fetch frozen at X% rides the poll
// ceiling into the same success (the loop exits on expiry and falls
// through to the success return); and a DECL with no declared total
// voices a dead "0/0 bytes" success. The face then tells the operator
// to run again on a weight that is not there, and the run wedges.
//
// THE LAW (P5): completion is judged off ENGINE TRUTH, never a stale
// state word or a byte count —
//   1. 'active' is NOT terminal: a first poll returning 'active'
//      must keep the rescue polling, never complete it;
//   2. ceiling expiry (still non-terminal at the poll ceiling) ends
//      in a FAILURE the face can offer Retry on, never a resolved
//      success;
//   3. total=0 (no DECLared size) never voices the dead "0/0 bytes"
//      success.
// The existing suite (run-rescue.spec.ts) MOCKS first-poll-'active'
// as success — its arms answer polls with state 'active' and expect
// the call to RESOLVE. This file is the unmocked wall: red today on
// all three arms. Toggles: ACQUIRE_TERMINAL's 'active' row and the
// loop's expiry/settle arms in run-rescue-core.ts.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ACQUIRE_TERMINAL } from '../src/client/run-rescue-core.ts'

// THE WIRE FAKE (the boundary the suite already fakes —
// run-rescue.spec.ts mocks exactly this module): every arm drives the
// REAL runRescueCall loop through a fake postManageAction.
const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  wire.postManageAction = vi.fn()
  vi.doMock('@melite/card-base/client', () => ({ postManageAction: wire.postManageAction }))
})

afterEach(() => {
  vi.useRealTimers()
})

const reply = (operationId: string, state: string, bytes: number, total: number, detail?: string) => ({
  ok: true,
  ...(detail === undefined ? {} : { detail }),
  data: { operation_id: operationId, state, bytes, total },
})

const pollCalls = (): number =>
  wire.postManageAction.mock.calls.filter((call) =>
    (call[1] as Record<string, unknown>)['operation_id'] !== undefined).length

/** Attach settle observers without letting a rejection escape as an
 *  unhandled rejection; `settled()` reads the state synchronously. */
function observe(flight: Promise<unknown>): { settled: () => boolean; outcome: () => { ok: boolean; value?: unknown; error?: unknown } } {
  const state: { done: boolean; ok: boolean; value?: unknown; error?: unknown } = { done: false, ok: false }
  void flight.then(
    (value) => { state.done = true; state.ok = true; state.value = value },
    (error) => { state.done = true; state.ok = false; state.error = error },
  )
  return {
    settled: () => state.done,
    outcome: () => ({ ok: state.ok, value: state.value, error: state.error }),
  }
}

describe('ACQUIRE TERMINAL TRUTH (P5: completion off engine truth, never a state word or a byte count)', () => {
  it("ARM 1 — 'active' is NOT terminal: a first poll returning active must NOT complete the rescue", async () => {
    // The toggle receipt's own fixture (P5): the START answers
    // 'acquiring', the FIRST POLL answers 'active' at PARTIAL bytes —
    // the rescue must keep polling and only settle on a genuinely
    // terminal state. Today 'active' sits in ACQUIRE_TERMINAL, so the
    // flight settles at the first poll — the "assumes X% is complete"
    // burn (ERRORS.md k2) and the "(verifying) — run again when
    // ready" lie (ERRORS.md m).
    expect(ACQUIRE_TERMINAL.has('active')).toBe(false)
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-active', 'acquiring', 2_096_567_476, 5_413_698_958))
      .mockResolvedValueOnce(reply('op-active', 'active', 3_000_000_000, 5_413_698_958, 'acquire_weight op-active: 3000000000/5413698958 bytes (verifying)'))
      // post-cure the tracker keeps polling; this is the real landing
      // the rescue may finally settle on
      .mockResolvedValue(reply('op-active', 'installed', 5_413_698_958, 5_413_698_958))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    // wait until the wire has ANSWERED the first poll, then judge the
    // flight: an 'active' answer is not a landing
    for (let i = 0; i < 200 && pollCalls() < 1; i += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 5) })
    }
    expect(pollCalls()).toBeGreaterThanOrEqual(1)
    expect(flight.settled()).toBe(false)
    // and the rescue must poll PAST the 'active' answer — terminal
    // truth reads the door again, never the stale word
    for (let i = 0; i < 200 && pollCalls() < 2; i += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 5) })
    }
    expect(pollCalls()).toBeGreaterThanOrEqual(2)
  })

  it('ARM 2 — ceiling expiry with a frozen fetch ends in a FAILURE, never a resolved success', async () => {
    // THE STUCK BURN (k2): bytes frozen at 39%, state never terminal —
    // the loop rides its poll ceiling and today RESOLVES
    // "moss-image acquired (2096567476/5413698958 bytes)". The law:
    // expiry is a failed acquire the face can offer Retry on.
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-stuck', 'acquiring', 2_096_567_476, 5_413_698_958))
      .mockResolvedValue(reply('op-stuck', 'acquiring', 2_096_567_476, 5_413_698_958))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    vi.useFakeTimers()
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    // the loop: 150 attempts × 200ms — drive the whole ceiling
    await vi.advanceTimersByTimeAsync(31_000)
    const outcome = flight.outcome()
    // the red: today the ceiling RESOLVES the success lie
    expect(outcome.ok).toBe(false)
    expect(String(outcome.error)).toMatch(/stuck|stalled|no longer progressing|ceiling|timed? ?out|retry/i)
  })

  it('ARM 3 — total=0 (no DECLared size) never voices the dead "0/0 bytes" success', async () => {
    // P5's total=0 face: a DECL row without size_bytes seeds the
    // ledger with total 0; today a landing on such a row resolves
    // "moss-image acquired (0/0 bytes)" — a dead meter dressed as
    // success.
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-zero', 'acquiring', 0, 0))
      .mockResolvedValue(reply('op-zero', 'installed', 5_413_698_958, 0))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    await vi.waitFor(() => { expect(flight.settled()).toBe(true) })
    const detail = String((flight.outcome().value as { detail?: string } | undefined)?.detail ?? '')
    expect(detail).not.toContain('0/0 bytes')
    expect(detail).toMatch(/total.{0,24}undeclared|no declared total|size unknown|verif/i)
  })
})
