// @contract cards-run-rescue-voice-truth
// @vitest-environment happy-dom
// weight-face-titles.spec.tsx — THE TERMINAL TITLES (audit
// download-stack-audit-2026-10-20 F10, the stuck column of the popup
// row: ONE "Weight stuck" title umbrellaing every terminal state,
// so an ENGINE-JUDGED failure wore the wedge's word and the
// Retry/Delete exits read as dead ends while the flight was alive).
//
// THE LAW: each terminal state renders its OWN title —
//   stuck (the ceiling-expired wedge, Retry/Delete exits) keeps
//     "Weight stuck";
//   failed/blocked (the engine's verdict, cause voiced, retry
//     offered) gets its own word;
//   and the stuck-heal settle (F6c) moves the title with the
//     verdict — the stuck title never umbrellas a settled row, and
//     no terminal title ever umbrellas the live/missing face.
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const STAGES = [{ params: { model: 'moss-image', prompt: 'x' } }]
const MISS = "lane presence: family 'moss-image' declares loras 'moss_image_sft_int8_convrot.safetensors' but no store copy exists — fetch it: https://huggingface.co/moss-image/moss_image_sft_int8_convrot.safetensors"
const TOTAL = 7_343_591_088
const HELD_AT = 6_012_000_000
const CAUSE = 'the fetch stalled: no bytes landed in 10000ms (stuck at 6012000000 bytes)'

const reply = (operationId: string, state: string, bytes: number, total: number, extra: Record<string, unknown> = {}) => ({
  ok: true,
  detail: state,
  data: { operation_id: operationId, state, bytes, total, ...extra },
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('ARM T1 — the engine\'s failed verdict wears its own title, never the stuck umbrella', async () => {
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-title', 'acquiring', 1_000, TOTAL))
    .mockResolvedValue(reply('op-title', 'failed', HELD_AT, TOTAL, { detail: CAUSE }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await vi.waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
  expect(screen.getByText('Weight failed'),
    'the engine judged FAILED but the modal title still reads "Weight stuck" — one umbrella title for every terminal state is the audit\'s stuck-column burn',
  ).toBeTruthy()
  expect(screen.queryByText('Weight stuck')).toBeNull()
  // the failed face keeps its doors: retry offered beside the cause
  expect(screen.queryByRole('button', { name: /retry/i })).not.toBeNull()
})

test('ARM T2 — the ceiling-expired wedge keeps "Weight stuck" with its Retry/Delete exits', async () => {
  vi.useFakeTimers()
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-wedge', 'acquiring', 1_000, TOTAL))
    .mockResolvedValue(reply('op-wedge', 'acquiring', HELD_AT, TOTAL))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await act(async () => { await vi.advanceTimersByTimeAsync(62_000) })
  expect(screen.getByText('Weight stuck'),
    'the ceiling-expired non-terminal flight must keep the wedge\'s own title',
  ).toBeTruthy()
  expect(screen.queryByRole('button', { name: /retry/i })).not.toBeNull()
  expect(screen.queryByRole('button', { name: /delete/i })).not.toBeNull()
})

test('ARM T3 — the stuck-heal settle moves the title with the verdict (verify-settle never stays stuck)', async () => {
  vi.useFakeTimers()
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-heal', 'acquiring', 1_000, TOTAL))
    .mockResolvedValue(reply('op-heal', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await act(async () => { await vi.advanceTimersByTimeAsync(62_000) })
  expect(screen.getByText('Weight stuck')).toBeTruthy()
  // the engine settles the hash after the ceiling: the heal flips
  // the face to the engine's verdict — title included
  wire.postManageAction.mockResolvedValue(
    reply('op-heal', 'failed', HELD_AT, TOTAL, { detail: CAUSE }))
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  await vi.waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
  expect(screen.getByText('Weight failed'),
    'the stuck face healed to the engine\'s FAILED verdict but kept the stuck title — the umbrella survives the heal',
  ).toBeTruthy()
  expect(screen.queryByText('Weight stuck')).toBeNull()
})

test('ARM T4 — no terminal title umbrellas the live face: the popup opens "Missing weight"', () => {
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  expect(screen.getByText('Missing weight')).toBeTruthy()
  expect(screen.queryByText('Weight stuck')).toBeNull()
  expect(screen.queryByText('Weight failed')).toBeNull()
})

test('ARM T5 — the engine\'s BLOCKED verdict wears the failed title too (audit F-2: blocked shares failed\'s branch, now armed)', async () => {
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-blocked', 'acquiring', 1_000, TOTAL))
    .mockResolvedValue(reply('op-blocked', 'blocked', HELD_AT, TOTAL, { detail: CAUSE }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await vi.waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
  expect(screen.getByText('Weight failed'),
    'the engine judged BLOCKED but the modal title is not "Weight failed" — the shared failed/blocked branch regressed silently',
  ).toBeTruthy()
  expect(screen.queryByText('Weight stuck')).toBeNull()
})
