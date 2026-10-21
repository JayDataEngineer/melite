// @vitest-environment happy-dom
/**
 * run-rescue-missing-all.spec.tsx — THE SEQUENTIAL MISSING-WEIGHT
 * REVEAL (the client half; the wall).
 *
 * THE BURN (operator, 2026-11-09 night): the popup fetched ONE file,
 * the face never accepted the landing, the next press died on the
 * NEXT file — the operator paid one wedge per weight because the
 * face named one file per refusal.
 *
 * THE LAW: the rescue face mirrors the gate's ONE face — EVERY
 * missing declared weight, name and human size, listed before the
 * first download press, with the count ("2 files · 7.0 GB + 249 MB");
 * the Download press fetches them IN ORDER, one settled operation at
 * a time, and only the last landing lands the done face. The list
 * rides the structured wire row (missing_all through
 * rescueOfLaneDetails) — never prose parsing.
 *
 * Reds today: rescueOfLaneDetails drops missing_all (the face names
 * one file) and download() fetches one file. The toggle is
 * run-rescue-core.ts (Rescue model variant + the mapping) and
 * run-rescue.tsx (the face + the sequential download).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { rescueOfLaneDetails } from '../src/client/run-rescue-core.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const MOSS_TE = 'qwen3.5_9b_w4a8_gptq.safetensors'
const MOSS_VAE = 'flux2-vae_small.safetensors'
const TE_TOTAL = 7343591088
const VAE_TOTAL = 249521340

/** The burn's wire row, exactly as the cured gate emits it. */
const laneDetails = (): Record<string, unknown> => ({
  family: 'moss-image',
  slot: 'text_encoder',
  missing: MOSS_TE,
  folders: ['text_encoders', 'clip'],
  kind: 'model',
  missing_all: [
    { slot: 'text_encoder', name: MOSS_TE, size_bytes: TE_TOTAL, fetch_url: 'https://example/te' },
    { slot: 'vae', name: MOSS_VAE, size_bytes: VAE_TOTAL, fetch_url: 'https://example/vae' },
  ],
})

const starts: string[] = []
beforeEach(() => {
  starts.length = 0
  let op = 0
  wire.postManageAction.mockImplementation(async (action: string, payload: Record<string, unknown>) => {
    expect(action).toBe('acquire_weight')
    if (typeof payload['model'] === 'string') {
      const file = typeof payload['file'] === 'string' ? payload['file'] : ''
      starts.push(file)
      op += 1
      const total = file === MOSS_TE ? TE_TOTAL : VAE_TOTAL
      return { ok: true, detail: '', data: { operation_id: 'op-' + String(op), state: 'active', bytes: 0, total } }
    }
    // a poll: the same door, the operation's ledger — full bytes
    // (the landed word over the engine's own total is the settle)
    const id = String(payload['operation_id'])
    const total = id === 'op-1' ? TE_TOTAL : VAE_TOTAL
    return { ok: true, detail: '', data: { operation_id: id, state: 'active', bytes: total, total } }
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('the face lists every missing declared weight with its human size before any download', () => {
  const rescue = rescueOfLaneDetails(laneDetails())
  expect(rescue).not.toBeNull()
  const { getByTestId } = render(
    <RunRescue error="" stages={[{ params: { model: 'moss-image' } }]} onRun={() => {}} rescue={rescue ?? undefined} />,
  )
  const face = getByTestId('weight-popup').textContent ?? ''
  expect(face).toContain(MOSS_TE)
  expect(face).toContain(MOSS_VAE)
  expect(face).toMatch(/2 files/)
  expect(face).toMatch(/6\.8 GB/)
  expect(face).toMatch(/238\.0 MB/)
  expect(starts).toEqual([])
})

test('download fetches both weights in order, one settled operation at a time, then the done face', async () => {
  const rescue = rescueOfLaneDetails(laneDetails())
  const onRun = vi.fn()
  const { getByTestId } = render(
    <RunRescue error="" stages={[{ params: { model: 'moss-image' } }]} onRun={onRun} rescue={rescue ?? undefined} />,
  )
  await userEvent.click(getByTestId('weight-download'))
  await waitFor(() => { expect(starts).toEqual([MOSS_TE]) })
  // the second weight starts only after the first settled
  await waitFor(() => { expect(starts).toEqual([MOSS_TE, MOSS_VAE]) })
  await waitFor(() => { expect(screen.getByText(/run again when ready/i)).toBeTruthy() })
  expect(onRun).not.toHaveBeenCalled()
})
