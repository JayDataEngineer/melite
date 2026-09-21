// @vitest-environment happy-dom
/**
 * RunRescue — the run-gate rescue's face (roadmap item 4): the
 * banner under a failed run's error, offering the install through
 * the manage seat. Pins the three laws at the UI level —
 *
 *   a non-rescueable error renders NOTHING (never a wrong install);
 *   a missing-extension refusal renders the offer, the confirm
 *   rides the ONE manage wire (names only — the links-in-code law);
 *   a successful install flips to the Run-again face, and the
 *   re-run rides the CALLER's press (never an automatic re-fire).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import type { Rescue } from '../src/client/run-rescue.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/wire', () => wire)

const STAGES = [{ params: { model: 'h3-timeline', prompt: 'x' } }]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('a non-rescueable error renders nothing', () => {
  const { container } = render(
    <RunRescue error="CUDA out of memory" stages={STAGES} onRun={() => {}} />,
  )
  expect(container.textContent).toBe('')
})

test('a missing-extension refusal offers the install; the confirm rides the wire; the re-run rides the caller', async () => {
  const onRun = vi.fn()
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'queued: 1 pack(s)' })
  render(
    <RunRescue
      error="card 'h3-timeline' requires 'ComfyUI-MiniMaxH3-TimelineDirector' (nodes A) — none live on the engine"
      stages={STAGES}
      onRun={onRun}
    />,
  )
  expect(screen.getByText(/Missing extension pack "ComfyUI-MiniMaxH3-TimelineDirector"/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText(/queued: 1 pack/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('install_extension', {
    nodes: ['ComfyUI-MiniMaxH3-TimelineDirector'],
  })
  expect(onRun).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Run again' }))
  expect(onRun).toHaveBeenCalledTimes(1)
})

test('a refused install surfaces the detail inline, never a silent ok', async () => {
  wire.postManageAction.mockResolvedValue({ ok: false, detail: 'pack unknown to the manager list' })
  render(
    <RunRescue
      error="card 'x' requires 'GhostPack' (nodes A)"
      stages={STAGES}
      onRun={() => {}}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText(/pack unknown to the manager list/)).toBeTruthy() })
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
})

test('a model miss without a family stays honest: the offer is disabled', () => {
  render(
    <RunRescue error="x.safetensors not found in loras/h3" stages={[{ params: { prompt: 'x' } }]} onRun={() => {}} />,
  )
  const btn = screen.getByRole('button', { name: 'Install & continue' }) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
})

test('a model miss on a model-less card provisions the CARD (the card-id fallback — the mask SAM2 law)', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: sam2.1_hiera_large.pt' })
  render(
    <RunRescue error="sam2.1_hiera_large.pt not found in sams" stages={[{ card: 'mask', params: { input_image: '/m/p.png' } }]} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "sam2.1.hiera.large.pt" \(card mask\)/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText(/downloaded: sam2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('provision_model', { model: 'mask' })
})

test('a model miss with a family provisions the family (the DECL owns the URL)', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: 2' })
  render(
    <RunRescue error="x.safetensors not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "x.safetensors" \(family h3-timeline\)/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText(/downloaded: 2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('provision_model', { model: 'h3-timeline' })
})

test('a wire that rejects with a non-Error still surfaces a word', async () => {
  wire.postManageAction.mockRejectedValue('gateway down')
  render(
    <RunRescue error="card 'x' requires 'P' (nodes A)" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText('install failed')).toBeTruthy() })
})
