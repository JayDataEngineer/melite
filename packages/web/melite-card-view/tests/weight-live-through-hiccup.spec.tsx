// @vitest-environment happy-dom
// weight-live-through-hiccup.spec.tsx — THE NETWORK-HICCUP LAW
// (operator 2026-10-20: "IT GOES 100 MBPS, THEN GETS FUCKING STUCK.
//  NO MORE. I REFUSE TO TEST YOUR TRASH ANYMORE" — the popup wedged
//  to "Weight stuck … state 'verifying' at 6.0 GB/6.8 GB (88%)" mid
//  flight, on transfers the ENGINE was still serving fine).
//
// ROOT: the popup's own byte-freeze guess (frozenPolls >= 2 — 800ms
// of unchanged ledger bytes) fired the stuck face DURING LIVE
// FLIGHTS: the direct arm seats state 'verifying' for the WHOLE
// fetch (service.ts:1396 seats it before the first byte), and a
// multi-GB WAN transfer legitimately freezes its ledger for 800ms
// (a TCP window stall, a redirect, a throttle) while the stream is
// alive. The CLIENT judged stall on its own 800ms budget — a second,
// harsher stall authority competing with the engine's own watchdog
// (the one that owns stall truth: it kills at the budget and the
// state lands 'failed' carrying the cause).
//
// THE LAW: ONE stall authority — the engine. A non-terminal report
// (acquiring/verifying/active) keeps the tracker polling no matter
// how the byte ledger moves; 'failed'/'blocked' carry the engine's
// own cause; the poll ceiling is the only client-side backstop. The
// popup NEVER invents a stuck verdict from its own clock.
//
// Red today: the hiccup arm (frozen 3 polls at 'verifying', then
// landing) renders the stuck face before the landing. Toggle: the
// frozenPolls break in run-rescue.tsx download().
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
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
const HICCUP_AT = 6_012_000_000 // the operator's own wedge point: 6.0 GB of 6.8

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('H1 — a live verifying flight that freezes its ledger through a network hiccup NEVER renders the stuck face — it polls on and lands', async () => {
  vi.useFakeTimers()
  // the engine's own truth: verifying (the direct arm's whole-window
  // state), bytes frozen at 6.0 GB across THREE polls — a WAN hiccup
  // the engine rides out — then the flight resumes and lands.
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring', data: { operation_id: 'op-hic', state: 'verifying', bytes: HICCUP_AT, total: TOTAL } })
    .mockResolvedValue({ ok: true, detail: 'verifying', data: { operation_id: 'op-hic', state: 'verifying', bytes: HICCUP_AT, total: TOTAL } })
    .mockResolvedValueOnce({ ok: true, detail: 'verifying', data: { operation_id: 'op-hic', state: 'verifying', bytes: HICCUP_AT, total: TOTAL } })
    .mockResolvedValueOnce({ ok: true, detail: 'verifying', data: { operation_id: 'op-hic', state: 'verifying', bytes: HICCUP_AT, total: TOTAL } })
    .mockResolvedValueOnce({ ok: true, detail: 'verifying', data: { operation_id: 'op-hic', state: 'verifying', bytes: TOTAL, total: TOTAL } })
    .mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-hic', state: 'installed', bytes: TOTAL, total: TOTAL } })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  await act(async () => { fireEvent.click(screen.getByTestId('weight-download')) })
  // the hiccup: three frozen polls (1.2s of wall) — drive past the
  // old 800ms guess
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
  expect(screen.queryByText(/Weight stuck/i),
    'the popup invented a stuck verdict from its own 800ms byte-freeze clock while the engine still reported a live verifying flight — the operator\'s "goes 100 MB/s then gets stuck"',
  ).toBeNull()
  // the landing: the flight resumes, completes, the ready face serves
  await act(async () => { await vi.advanceTimersByTimeAsync(1_200) })
  await vi.waitFor(() => { expect(screen.getByText('Weight ready')).toBeTruthy() })
})

test('H2 — the engine\'s own failed verdict still lands the cause loudly (one stall authority: the engine, not the client clock)', async () => {
  // the watchdog kills a dead stream: state 'failed' carrying the
  // stall cause in data.detail — the popup voices IT, never its own
  // guess about why
  const CAUSE = 'the fetch stalled: no bytes landed in 10000ms (stuck at 6012000000 bytes)'
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring', data: { operation_id: 'op-dead', state: 'verifying', bytes: HICCUP_AT, total: TOTAL } })
    .mockResolvedValue({ ok: true, detail: 'acquire_weight op-dead: failed', data: { operation_id: 'op-dead', state: 'failed', bytes: HICCUP_AT, total: TOTAL, detail: CAUSE } })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
  // the stuck affordances serve on the ENGINE's verdict
  expect(screen.queryByRole('button', { name: /retry/i })).not.toBeNull()
  expect(screen.queryByRole('button', { name: /delete|discard|remove/i })).not.toBeNull()
})
