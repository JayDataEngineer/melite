// @contract cards-run-rescue-voice-truth
// @vitest-environment happy-dom
// weight-phase-voice.spec.tsx — THE POPUP'S PHASE VOICE (audit
// download-stack-audit-2026-10-20 F10, popup rows 372-373).
//
// THE BURN: during verify the byte line + meter freeze while the
// rate line keeps showing the AVERAGE-SINCE-START rate with a
// climbing ETA — fake motion over a frozen bar — and the honest
// "stalled — no bytes landing" branch can only fire on a zero
// average, i.e. almost never mid-hash. The poll already carries the
// live phase (infra-acquire-phase-honesty); the face ignored it.
//
// THE LAW: when the poll carries a live verify phase, the popup
// voices the phase INSTEAD of rate/ETA (no average-rate lie over a
// frozen bar); rate/ETA return for live streaming; and a frozen
// flight with NO live phase is untouched — the ceiling still lands
// the stuck face (the stuck law keeps its teeth, the phase voice is
// never always-true).
//
// REAL COMPONENT, FAKED WIRE ONLY (the boundary every run-rescue
// spec fakes): every state word, phase, and byte count here is one
// the FAKE ENGINE reported verbatim through the manage door.
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const STAGES = [{ params: { model: 'moss-image', prompt: 'x' } }]
const MISS = "lane presence: family 'moss-image' declares loras 'moss_image_sft_int8_convrot.safetensors' but no store copy exists"
const TOTAL = 7_343_591_088
const HELD_AT = 6_012_000_000

const reply = (operationId: string, state: string, bytes: number, total: number, extra: Record<string, unknown> = {}) => ({
  ok: true,
  detail: state,
  data: { operation_id: operationId, state, bytes, total, ...extra },
})

const startDownload = async (): Promise<void> => {
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('ARM P1 — a frozen byte count with a live verify phase voices the phase and NO rate line', async () => {
  vi.useFakeTimers()
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-phase', 'acquiring', 1_000, TOTAL, { phase: 'stream' }))
    .mockResolvedValue(reply('op-phase', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
  await startDownload()
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  const phase = screen.getByTestId('weight-phase')
  expect(phase.textContent,
    'the poll carried the live verify phase and the popup voiced neither it nor retired the rate line — fake motion over a frozen bar (audit F10 popup rows)',
  ).toMatch(/erifying/i)
  expect(screen.queryByTestId('weight-rate'),
    'a rate/ETA line rendered over a frozen verify bar — the average-since-start rate is the lie the audit named',
  ).toBeNull()
})

test('ARM P2 — frozen bytes with NO live phase are untouched: no phase voice, and the ceiling still lands the stuck face', async () => {
  vi.useFakeTimers()
  // the phaseless freeze (pre-phase-law rows, the hiccup spec's
  // shape): the phase voice must NOT always-true, and the stuck law
  // keeps its teeth — the ceiling expiry lands the stuck face.
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-frozen', 'acquiring', 1_000, TOTAL))
    .mockResolvedValue(reply('op-frozen', 'acquiring', HELD_AT, TOTAL))
  await startDownload()
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  expect(screen.queryByTestId('weight-phase'),
    'a phaseless frozen row rendered the phase voice — the word went always-true',
  ).toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(62_000) })
  expect(screen.getByText(/Weight stuck/i),
    'the frozen-bytes flight with no live phase rode the ceiling and did NOT land the stuck face — the stuck law lost its teeth',
  ).toBeTruthy()
})

test('ARM P3 — rate/ETA return for live streaming: a moving byte count renders the rate line, never the phase voice', async () => {
  vi.useFakeTimers()
  let n = 0
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-live', 'acquiring', 1_000, TOTAL, { phase: 'stream' }))
    .mockImplementation(() => {
      n += 1
      return Promise.resolve(reply('op-live', 'acquiring', 1_000 + n * 250_000_000, TOTAL, { phase: 'stream' }))
    })
  await startDownload()
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  const rate = screen.getByTestId('weight-rate')
  expect(rate.textContent).toMatch(/B\/s/)
  expect(screen.queryByTestId('weight-phase'),
    'a live streaming flight rendered the phase voice over a moving bar — the phase word stopped naming the hash',
  ).toBeNull()
})

test('ARM P4 — a verify→stream transition on ONE flight retires the phase voice and returns the rate (audit F-2)', async () => {
  vi.useFakeTimers()
  let n = 0
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-trans', 'acquiring', 1_000, TOTAL, { phase: 'stream' }))
    .mockImplementation(() => {
      n += 1
      // polls 1-3: frozen verify; then the stream resumes on the
      // SAME operation — the word tracks the live phase, never
      // the flight (three verify polls so the 1200ms assertion
      // still lands mid-verify at ~400ms cadence)
      return n <= 3
        ? Promise.resolve(reply('op-trans', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
        : Promise.resolve(reply('op-trans', 'acquiring', HELD_AT + (n - 2) * 250_000_000, TOTAL, { phase: 'stream' }))
    })
  await startDownload()
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  expect(screen.getByTestId('weight-phase'),
    'the frozen verify polls never voiced the phase — the transition flight started silent',
  ).toBeTruthy()
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
  expect(screen.queryByTestId('weight-phase'),
    'the stream resumed but the phase voice stuck around — the word latched the flight instead of tracking the live phase',
  ).toBeNull()
  expect(screen.getByTestId('weight-rate').textContent,
    'the resumed stream renders no rate line — the flight went mute after the transition',
  ).toMatch(/B\/s/)
})
