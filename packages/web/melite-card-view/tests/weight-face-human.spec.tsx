// @vitest-environment happy-dom
// weight-face-human.spec.tsx — THE WEIGHT POPUP'S HUMAN FACE
// (operator 2026-10-20: "THE TRACKING OF BYTES ALONE IS
// INEXCUSABLE" + "we need to FIND OUT WHY DOWNLOADS RANDOMLY
// CRASH" — the popup showed "5196173399/7343591088 bytes (71%)"
// with no rate, no ETA, and when the fetch died at
// 7343591088/7343591088 the note voiced the generic poll message
// "acquire_weight … (failed)" instead of the engine's own cause
// sitting in data.detail).
//
// THE LAW (this wall):
//   H1  the popup voices the engine's cause: a poll whose data
//       carries `detail` surfaces THAT text, never the generic
//       top-level "bytes (state)" message;
//   H2  the tracker never shows raw byte counts alone: the line
//       reads human sizes (GB/MB) with the percent, plus a live
//       rate and ETA while the flight moves;
//   H3  the stuck/failed faces keep the human sizes (no raw
//       "bytes" ledger anywhere on the popup).
//
// Red today: H1 fails (weightStateOf drops data.detail), H2/H3
// fail (trackerFaces renders raw String(bytes)+'/'+String(total)
// + ' bytes'). Toggles: weightStateOf's detail pick and the
// trackerFaces line in run-rescue.tsx (+ the format helpers in
// run-rescue-core.ts which do not exist yet).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const STAGES = [{ params: { model: 'moss-image', prompt: 'x' } }]
const MISS = "lane presence: family 'moss-image' declares loras 'moss_image_sft_int8_convrot.safetensors' but no store copy exists — fetch it: https://huggingface.co/moss-image/moss_image_sft_int8_convrot.safetensors"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('H1 — the popup voices data.detail (the engine cause), never the generic poll message', async () => {
  const CAUSE = 'the fetch stalled: no bytes landed in 1000ms (stuck at 7343591088 bytes)'
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-h1', state: 'acquiring', bytes: 1, total: 4 } })
    // the poll: top-level message is the generic ledger line, the
    // engine's own cause rides data.detail (today the face drops
    // it and voices the generic line)
    .mockResolvedValueOnce({
      ok: true,
      detail: 'acquire_weight op-h1: 4/4 bytes (failed)',
      data: { operation_id: 'op-h1', state: 'failed', bytes: 4, total: 4, detail: CAUSE },
    })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(CAUSE)).toBeTruthy() })
})

test('H2 — the tracker reads human sizes + rate/ETA, never raw bytes alone', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-h2', state: 'acquiring', bytes: 5_196_173_399, total: 7_343_591_088 } })
    .mockResolvedValue({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-h2', state: 'acquiring', bytes: 5_300_000_000, total: 7_343_591_088 } })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByTestId('weight-progress')).toBeTruthy() })
  const line = screen.getByTestId('weight-progress').textContent ?? ''
  // human sizes with the percent — the operator's verbatim burn
  // "5196173399/7343591088 bytes (71%)" must never render again
  expect(line).not.toMatch(/5196173399\/7343591088 bytes/)
  expect(line).not.toMatch(/5300000000\/7343591088 bytes/)
  expect(line).toMatch(/GB/)
  expect(line).toMatch(/7[12]%/)
  // the live flight names its rate and remaining time
  await waitFor(() => { expect(screen.queryByTestId('weight-rate')).not.toBe(null) }, { timeout: 5000 })
  const rate = screen.getByTestId('weight-rate').textContent ?? ''
  expect(rate).toMatch(/B\/s/)
})

test('H3 — the format helpers speak human (unit wall)', async () => {
  const core = await import('../src/client/run-rescue-core.ts')
  const fmt = (core as Record<string, unknown>)['formatByteSize'] as ((n: number) => string) | undefined
  expect(fmt, 'run-rescue-core.ts owes a formatByteSize helper the tracker renders').toBeDefined()
  // the operator's own numbers: 6.8 GB, not 7343591088
  expect(fmt!(7_343_591_088)).toMatch(/6\.8\s?GB/)
  expect(fmt!(5_196_173_399)).toMatch(/4\.8\s?GB/)
  expect(fmt!(0)).toMatch(/0/)
})
