// @vitest-environment happy-dom
// run-rescue-verify-liveness.spec.ts — THE VERIFY LIVENESS ON THE
// FACE (audit download-stack-audit-2026-10-20 F1+F2+F6c, operator
// 2026-10-20: the weights popup ended STUCK at 0% with no liveness —
// "the engine last reported state 'verifying' at 6.0 GB/6.8 GB
// (88%)" — and the retry re-stuck at 0%).
//
// THE MECHANISM: the service mirrors verify flow into the poll
// ledger as a live phase (stream/queue/verify/recheck), the manage
// door carries it in the poll envelope, and the tracker's snapshots
// keep it. A frozen byte count with a LIVE phase is flight, not
// death. And the stuck face — the poll ceiling expiring with the
// ledger still unsettled — is not the end of the story: a
// background poll keeps reading, and when the engine settles the
// face heals to done/failed instead of wedging on Retry/Delete.
//
// ARMS:
// 0 — the tracker's snapshots carry the ledger's live phase
//     (weightStateOf keeps `phase`; RED: the field is dropped).
// 1 — the burn's journey with the phase on the wire: frozen bytes
//     in a live phase poll on to the done face, never the stuck
//     face (the hiccup law, phase-carrying edition).
// 2 — STUCK HEALS TO DONE (F6c): ceiling-expiry lands the stuck
//     face, the engine settles installed, the face heals to done
//     (RED: no background poll — the stuck face wedges).
// 3 — STUCK HEALS TO FAILED (F6c): the same, but the engine lands
//     failed carrying its cause — the failed face voices the cause
//     (RED: the stuck face keeps hiding the engine's verdict).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { acquireWeightPoll } from '../src/client/run-rescue-core.ts'

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('ARM 0 — the tracker keeps the ledger live phase (the poll vocabulary carries the phase to the face)', async () => {
  wire.postManageAction.mockResolvedValueOnce(
    reply('op-ph', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
  const snapshot = await acquireWeightPoll('op-ph')
  expect(snapshot.phase,
    "weightStateOf dropped the ledger's live phase — the face's only liveness window is phaseless (audit F2: mirror verify flow into the poll ledger, carry it through)",
  ).toBe('verify')
})

test('ARM 1 — the burn journey with the phase on the wire: frozen bytes in a live phase poll on to done, never stuck', async () => {
  vi.useFakeTimers()
  // the engine's truth: verifying at 6.0/6.8 GB, phase live, bytes
  // frozen across polls (a multi-GB hash — zero stream movement is
  // the phase, not a stall), then the landing
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-live', 'acquiring', 1_000, TOTAL, { phase: 'stream' }))
    .mockResolvedValue(reply('op-live', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
    .mockResolvedValueOnce(reply('op-live', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
    .mockResolvedValueOnce(reply('op-live', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
    .mockResolvedValueOnce(reply('op-live', 'verifying', TOTAL, TOTAL, { phase: 'verify' }))
    .mockResolvedValue(reply('op-live', 'installed', TOTAL, TOTAL))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
  // ride out the frozen window past the old 800ms guess
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
  expect(screen.queryByText(/Weight stuck/i),
    'a frozen ledger in a LIVE phase landed the stuck face — the burn, with the phase on the wire',
  ).toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  await vi.waitFor(() => { expect(screen.getByText('Weight ready')).toBeTruthy() })
})

test('ARM 2 — STUCK HEALS TO DONE (F6c): the ceiling lands stuck, the engine settles, the face heals — no wedged Retry loop', async () => {
  vi.useFakeTimers()
  // the ledger never settles inside the ceiling (a hash slower than
  // the popup's patience) — then the engine lands it
  wire.postManageAction.mockResolvedValue(reply('op-slow', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
  await act(async () => { await vi.advanceTimersByTimeAsync(65_000) })
  expect(screen.queryByText(/Weight stuck/i),
    'the ceiling expired on an unsettled ledger but no stuck face landed — the backstop itself broke',
  ).not.toBeNull()
  // the engine settles AFTER the stuck face: the background poll
  // heals the face to done instead of wedging on Retry
  wire.postManageAction.mockResolvedValue(reply('op-slow', 'installed', TOTAL, TOTAL))
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  await vi.waitFor(() => { expect(screen.getByText('Weight ready')).toBeTruthy() })
  expect(screen.queryByText(/Weight stuck/i),
    'the engine settled installed but the stuck face never healed — the mid-verify "stuck" wedges forever (audit F6: the stuck face keeps a background poll so mid-verify "stuck" heals)',
  ).toBeNull()
})

test('ARM 3 — STUCK HEALS TO FAILED (F6c): the engine lands failed carrying its cause — the face voices the cause, not the old stuck guess', async () => {
  vi.useFakeTimers()
  const CAUSE = 'the fetch stalled: no bytes landed in 10000ms (stuck at 6012000000 bytes)'
  wire.postManageAction.mockResolvedValue(reply('op-doom', 'verifying', HELD_AT, TOTAL, { phase: 'verify' }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
  await act(async () => { await vi.advanceTimersByTimeAsync(65_000) })
  expect(screen.queryByText(/Weight stuck/i)).not.toBeNull()
  wire.postManageAction.mockResolvedValue(
    { ok: true, detail: 'failed', data: { operation_id: 'op-doom', state: 'failed', bytes: HELD_AT, total: TOTAL, detail: CAUSE } })
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  await vi.waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
  // the failed face wears its OWN modal title since the terminal-
  // titles cure (audit F10 stuck column — the one "Weight stuck"
  // umbrella retired; weight-face-titles.spec.tsx pins the titles) —
  // what this arm pins is the STUCK BODY: the ceiling-guess note
  // yields to the engine's cause
  expect(screen.queryByText(/no longer progressing/i),
    "the engine judged FAILED but the stuck face hides the verdict — the operator's cause never arrives (audit F6)",
  ).toBeNull()
})
