// @contract cards-download-seats-voice
// @vitest-environment happy-dom
// run-rescue-stuck-watch.spec.tsx — THE ONE STUCK WATCH, BOTH SEATS
// (audit download-stack-audit-2026-10-20 F8 / fix #7, the F10 seats
// slice; the agent seat is F10 table row 376).
//
// THE BURN: the two download seats carried two laws for one wedge.
// The agent seat's runRescueCall rode its whole 150×200ms ceiling and
// threw the ceiling error; the popup answered the same frozen ledger
// on its own clock. Neither shared a rule with the other, and an
// extension-shaped flight (0/0 bytes — a Manager queue drain owns its
// bytes) had NO wedge at all: a dead drain rode the full ceiling in
// both seats while nothing moved.
//
// THE LAW: ONE stuck watch lives in run-rescue-core.ts — frozen
// bytes with NO live phase over N polls (N=15) trip it; a poll that
// carries a live phase (stream/queue/verify/recheck, the
// infra-acquire-phase-honesty law) resets it, so a healthy hash or a
// draining queue never trips it. BOTH seats ride the same watch: the
// popup lands its stuck face at watch speed (its fast face, well
// before its 60s ceiling), and the agent seat throws the SAME stuck
// verdict — the popup's own stuckNote words, same detail shape —
// instead of the ceiling error when the watch trips first. The
// ceiling remains the backstop for a flight the watch can never
// judge (a server that keeps moving bytes but never settles): it
// still lands, with the ceiling voice.
//
// REAL SEATS, FAKED WIRE ONLY (the boundary every run-rescue spec
// fakes): every state word, phase, and byte count here is one the
// FAKE ENGINE reported verbatim through the manage door.
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { chromeCopy } from '../src/chromeCopy.ts'
import { formatWeightProgress } from '../src/client/run-rescue-core.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))

vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const STAGES = [{ params: { model: 'moss-image', prompt: 'x' } }]
const MISS = "lane presence: family 'moss-image' declares loras 'moss_image_sft_int8_convrot.safetensors' but no store copy exists"
const TOTAL = 7_343_591_088
const HELD_AT = 2_096_567_476
// the watch's patience: 15 frozen phaseless polls — 3s at the agent
// seat's 200ms cadence, 6s at the popup's 400ms cadence. The arms
// drive windows far above the trip and far below the ceilings
// (30s agent / 60s popup), so only a watch landing the verdict can
// green them.
const WATCH_WINDOW_MS = 12_000

const reply = (operationId: string, state: string, bytes: number, total: number, extra: Record<string, unknown> = {}) => ({
  ok: true,
  detail: state,
  data: { operation_id: operationId, state, bytes, total, ...extra },
})

const pollCalls = (): number =>
  wire.postManageAction.mock.calls.filter((call) =>
    (call[1] as Record<string, unknown>)['operation_id'] !== undefined).length

/** Attach settle observers without letting a rejection escape as an
 *  unhandled rejection; `outcome()` reads the state synchronously. */
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

const startDownload = async (): Promise<void> => {
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('THE ONE STUCK WATCH, BOTH SEATS (audit F8/fix #7): one wedge, one verdict, two seats', () => {
  it('ARM S1a — the AGENT seat: the frozen phaseless wedge throws the SAME stuck verdict as the popup face, at watch speed (never the ceiling error)', async () => {
    vi.useFakeTimers()
    // the wedge: every poll answers the identical frozen row with NO
    // phase — the silent server shape the watch exists for
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-agent', 'acquiring', HELD_AT, TOTAL))
      .mockResolvedValue(reply('op-agent', 'acquiring', HELD_AT, TOTAL))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_WINDOW_MS) })
    expect(flight.settled(),
      'the frozen phaseless wedge left the agent seat riding past the watch window — no stuck watch sits between the seats and the ceiling',
    ).toBe(true)
    const outcome = flight.outcome()
    expect(outcome.ok, 'the watch tripped but the agent seat did not throw').toBe(false)
    // THE SAME VERDICT: the thrown detail is the popup's own stuck
    // face sentence for the same last snapshot — same words, same
    // detail shape, not a ceiling-flavoured cousin.
    expect((outcome.error as Error | undefined)?.message).toBe(
      chromeCopy.stuckNote({ state: 'acquiring', progress: formatWeightProgress(HELD_AT, TOTAL) }),
    )
  })

  it('ARM S1b — the POPUP seat: the same wedge lands the stuck face at watch speed, voicing the same stuck sentence', async () => {
    vi.useFakeTimers()
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-popup', 'acquiring', HELD_AT, TOTAL))
      .mockResolvedValue(reply('op-popup', 'acquiring', HELD_AT, TOTAL))
    await startDownload()
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_WINDOW_MS) })
    expect(screen.getByText(/Weight stuck/i),
      'the same wedge left the popup without the stuck face inside the watch window — the popup kept no fast face',
    ).toBeTruthy()
    expect(screen.getByText(
      chromeCopy.stuckNote({ state: 'acquiring', progress: formatWeightProgress(HELD_AT, TOTAL) }),
    ), 'the popup stuck face did not voice the shared stuck sentence for the frozen row').toBeTruthy()
  })

  it('ARM S1c — a LIVE-PHASE flight trips NEITHER seat\'s watch (no always-true): both keep polling past the window, neither seat lands stuck', async () => {
    vi.useFakeTimers()
    // frozen bytes WITH a live verify phase — the healthy multi-GB
    // hash the phase law exempts (infra-acquire-phase-honesty)
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-live', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
      .mockResolvedValue(reply('op-live', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    await startDownload()
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_WINDOW_MS) })
    // the agent seat: still polling, no verdict — the phase reset the watch
    expect(flight.settled(),
      'the live-phase flight ended in the agent seat inside the watch window — the watch is always-true',
    ).toBe(false)
    expect(pollCalls()).toBeGreaterThan(15)
    // the popup: no stuck face, the phase voice serves instead
    expect(screen.queryByText(/Weight stuck/i),
      'the live-phase flight landed the popup stuck face — the watch never exempts a live phase',
    ).toBeNull()
    expect(screen.getByTestId('weight-phase'),
      'the live-phase flight voiced no phase on the popup — the exemption arm rode no real phase face',
    ).toBeTruthy()
  })

  it('ARM S1d — THE CEILING BACKSTOP: a silent server that keeps MOVING bytes but never settles still lands the ceiling, with the ceiling voice', async () => {
    vi.useFakeTimers()
    // bytes advance every poll — the watch can never call this
    // frozen — and no terminal state ever arrives: only the ceiling
    // may end this flight (the agent seat's full 150×200ms ride)
    let n = 0
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-backstop', 'acquiring', HELD_AT, TOTAL))
      .mockImplementation(() => {
        n += 1
        return Promise.resolve(reply('op-backstop', 'acquiring', HELD_AT + n * 100_000_000, TOTAL))
      })
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    expect(flight.settled(), 'the never-settling moving flight did not end at the ceiling — the backstop is gone').toBe(true)
    const outcome = flight.outcome()
    expect(outcome.ok).toBe(false)
    expect(String(outcome.error)).toMatch(/across the full 150-poll ceiling/)
  })

  it('ARM S1e — the EXTENSION-SHAPE wedge (a stalled 0/0 drain, no phase) trips the SAME watch and the SAME verdict', async () => {
    vi.useFakeTimers()
    // an extension seat's ledger shape: no declared total, no landed
    // bytes, no phase word — a Manager drain that stopped flowing
    // before its queue budget dies. The frozen law must not demand a
    // total>0 to see it: 0/0 frozen and silent IS the wedge.
    wire.postManageAction
      .mockResolvedValueOnce(reply('op-ext', 'acquiring', 0, 0))
      .mockResolvedValue(reply('op-ext', 'acquiring', 0, 0))
    const { runRescueCall } = await import('../src/client/run-rescue-core.ts')
    const flight = observe(runRescueCall({ kind: 'model', file: 'moss_image_sft_int8_convrot.safetensors' }, 'moss-image'))
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_WINDOW_MS) })
    expect(flight.settled(),
      'the stalled extension-shape drain rode past the watch window — the watch is blind to the 0/0 ledger',
    ).toBe(true)
    const outcome = flight.outcome()
    expect(outcome.ok).toBe(false)
    expect((outcome.error as Error | undefined)?.message).toBe(
      chromeCopy.stuckNote({ state: 'acquiring', progress: formatWeightProgress(0, 0) }),
    )
  })
})
