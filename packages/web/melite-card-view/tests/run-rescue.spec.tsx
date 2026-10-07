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

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
// the component's rejectionVoice rides the same module (the R4
// shim re-exports it from @melite/card-base/client) — the factory
// must pass the module through, or every catch face calls
// undefined and the refusal note never renders.
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

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
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'queued: 1 pack(s)', data: { state: 'active' } })
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
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  const btn = screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
})

test('a model miss on a model-less card provisions the CARD (the card-id fallback — the mask SAM2 law)', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: sam2.1_hiera_large.pt', data: { operation_id: 'op-mask', state: 'active', bytes: 9, total: 9 } })
  render(
    <RunRescue error="sam2.1_hiera_large.pt not found in sams" stages={[{ card: 'mask', params: { input_image: '/m/p.png' } }]} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "sam2.1.hiera.large.pt" \(card mask\)/)).toBeTruthy()
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/downloaded: sam2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'sam2.1_hiera_large.pt' })
})

test('a model miss with a family provisions the family (the DECL owns the URL)', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: 2', data: { operation_id: 'op-fam', state: 'active', bytes: 2, total: 2 } })
  render(
    <RunRescue error="x.safetensors not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "x.safetensors" \(family h3-timeline\)/)).toBeTruthy()
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/downloaded: 2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' })
})

test('the current missing-weight target is the declared model, not the fetch source', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-t', state: 'active', bytes: 3, total: 3 } })
  render(
    <RunRescue
      error="card 'mask' needs weight 'sams/sam2.1_hiera_large.pt' — absent on the models tree; fetch declared-source (provision_model model=mask)"
      stages={[{ params: { prompt: 'x' } }]}
      onRun={() => {}}
    />,
  )
  expect(screen.getByText(/Missing model file "sams\/sam2\.1_hiera_large\.pt" \(declared target mask\)/)).toBeTruthy()
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/installed/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'sams/sam2.1_hiera_large.pt' })
})

test('the Download press opens a live bytes/total tracker that polls the same door', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-live', state: 'acquiring', bytes: 1, total: 4 } })
    .mockResolvedValue({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-live', state: 'active', bytes: 4, total: 4 } })
  render(
    <RunRescue error="x.safetensors not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  // the opening ledger lands first (real bytes over the DECL total)
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/1\/4 bytes/) })
  // the tracker polls the SAME action with ONLY the operation id
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/4\/4 bytes/) })
  expect(wire.postManageAction).toHaveBeenNthCalledWith(1, 'acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' })
  expect(wire.postManageAction).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-live' })
  const fill = screen.getByTestId('weight-meter-fill') as HTMLElement
  expect(fill.style.width).toBe('100%')
})

test('a restart-required result never offers Run again before the restart', async () => {
  wire.postManageAction.mockReset()
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'installed', data: { state: 'restart_required', restart_required: true } })
    .mockResolvedValueOnce({ ok: true, detail: 'reboot issued' })
  const onRun = vi.fn()
  render(
    <RunRescue
      error="card 'x' requires 'P' (nodes A)"
      stages={STAGES}
      onRun={onRun}
    />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Restart to activate' })).toBeTruthy() })
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
  await userEvent.click(screen.getByRole('button', { name: 'Restart to activate' }))
  await waitFor(() => { expect(screen.getByText(/Restarting.*waiting for the engine to become active/)).toBeTruthy() })
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
  expect(onRun).not.toHaveBeenCalled()
  expect(wire.postManageAction).toHaveBeenNthCalledWith(2, 'restart', {})
})

test('a failed restart remains inline and leaves the rescue waiting for another press', async () => {
  wire.postManageAction.mockReset()
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'installed', data: { state: 'restart_required' } })
    .mockResolvedValueOnce({ ok: false })
  render(
    <RunRescue error="card 'x' requires 'P' (nodes A)" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Restart to activate' }))
  await waitFor(() => { expect(screen.getByText('restart refused')).toBeTruthy() })
  expect(screen.getByRole('button', { name: 'Restart to activate' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
})

test('a non-Error restart rejection stays inline', async () => {
  wire.postManageAction.mockReset()
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'installed', data: { state: 'restart_required' } })
    .mockRejectedValueOnce('restart down')
  render(
    <RunRescue error="card 'x' requires 'P' (nodes A)" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Restart to activate' }))
  // the rejected string surfaces verbatim (the failureText law)
  await waitFor(() => { expect(screen.getByText('restart down')).toBeTruthy() })
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
})

test('a wire that rejects with a non-Error still surfaces a word', async () => {
  wire.postManageAction.mockRejectedValue('gateway down')
  render(
    <RunRescue error="card 'x' requires 'P' (nodes A)" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  // the rejected string surfaces verbatim (the failureText law)
  await waitFor(() => { expect(screen.getByText('gateway down')).toBeTruthy() })
})
