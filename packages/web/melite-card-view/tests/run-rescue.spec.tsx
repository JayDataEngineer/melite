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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={[{ params: { prompt: 'x' } }]} onRun={() => {}} />,
  )
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  const btn = screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
})

test('a bare filename with no provision bearing renders nothing (RISK-2)', () => {
  const { container } = render(
    <RunRescue error="x.safetensors not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  expect(container.firstChild).toBe(null)
})

test('a model miss on a model-less card provisions the CARD (the card-id fallback — the mask SAM2 law)', async () => {
  // state 'installed' — the genuinely terminal word (the unmocked-
  // success move: 'active' is the engine's live state, never a
  // landing; run-rescue-acquire-terminal.spec.ts is the wall)
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: sam2.1_hiera_large.pt', data: { operation_id: 'op-mask', state: 'installed', bytes: 9, total: 9 } })
  render(
    <RunRescue error="card 'mask' needs weight 'sam2.1_hiera_large.pt' — not found in sams" stages={[{ card: 'mask', params: { input_image: '/m/p.png' } }]} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "sam2.1.hiera.large.pt" \(card mask\)/)).toBeTruthy()
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/downloaded: sam2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'sam2.1_hiera_large.pt' }, expect.anything())
})

test('a model miss with a family provisions the family (the DECL owns the URL)', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'downloaded: 2', data: { operation_id: 'op-fam', state: 'installed', bytes: 2, total: 2 } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  expect(screen.getByText(/Missing model file "x.safetensors" \(family h3-timeline\)/)).toBeTruthy()
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/downloaded: 2/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' }, expect.anything())
})

test('the current missing-weight target is the declared model, not the fetch source', async () => {
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'installed', data: { operation_id: 'op-t', state: 'installed', bytes: 3, total: 3 } })
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
  expect(wire.postManageAction).toHaveBeenCalledWith('acquire_weight', { model: 'mask', file: 'sams/sam2.1_hiera_large.pt' }, expect.anything())
})

test('the Download press opens a live bytes/total tracker that polls the same door', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-live', state: 'acquiring', bytes: 1, total: 4 } })
    .mockResolvedValue({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-live', state: 'installed', bytes: 4, total: 4 } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  // the opening ledger lands first (real bytes over the DECL total)
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/1\/4 bytes/) })
  // the tracker polls the SAME action with ONLY the operation id
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/4\/4 bytes/) })
  // the download flight's controller rides as the third arg (the
  // L-ERROR-3 teardown signal)
  expect(wire.postManageAction).toHaveBeenNthCalledWith(1, 'acquire_weight', { model: 'h3-timeline', file: 'x.safetensors' }, expect.anything())
  expect(wire.postManageAction).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-live' }, expect.anything())
  const fill = screen.getByTestId('weight-meter-fill') as HTMLElement
  expect(fill.style.width).toBe('100%')
})

test('a dismissed popup falls back to the inline offer and reopens on demand (the miss is never lost)', async () => {
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  expect(screen.queryByTestId('weight-popup')).toBe(null)
  expect(screen.getByText(/download through the manage seat\?/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Download weight' }))
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
})

test('a dismissed miss with NO owning family or card stays offered but disabled (the agent door owns it)', async () => {
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={[{ params: { prompt: 'p' } }]} onRun={() => {}} />,
  )
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  const inline = screen.getByRole('button', { name: 'Download weight' }) as HTMLButtonElement
  expect(inline.disabled).toBe(true)
  expect(inline.title).toBe('no stage names the owning family or card — provision via the agent door')
})

test('a poll rejection lands as the popup voice with the press un-busied', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-f', state: 'acquiring', bytes: 1, total: 4 } })
    .mockRejectedValueOnce(new Error('registry hiccup'))
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText('registry hiccup')).toBeTruthy() })
  expect((screen.getByTestId('weight-download') as HTMLButtonElement).disabled).toBe(false)
  expect(screen.getByTestId('weight-download').textContent).toBe('Download')
})

test('the popup close aborts the in-flight download and falls back to the inline offer (L-ERROR-3)', async () => {
  // OBSOLETE-PIN REWRITE (2026-10-22): this test pinned the OLD law
  // — close ignored mid-download, which is exactly the audit's wound
  // (the popup left a 150-attempt poll loop running behind it). The
  // new law: the close kills the flight and the inline offer serves;
  // the miss is never lost and the calls stop.
  let releasePoll: (reply: { ok: true, data: { operation_id: string, state: string } }) => void = () => {}
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-s', state: 'acquiring', bytes: 1, total: 9 } })
    .mockImplementationOnce(() => new Promise((resolve) => { releasePoll = resolve }))
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByTestId('weight-download').textContent).toBe('downloading…') })
  // the first poll is the PARKED one — wait until it was CALLED, so
  // the close lands mid-poll deterministically (not mid-sleep, which
  // would exit before any poll and make the pins below timing-luck)
  await waitFor(() => { expect(wire.postManageAction.mock.calls.length).toBe(2) })
  await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  // the popup is gone; the inline offer serves (the miss is not lost)
  expect(screen.queryByTestId('weight-popup')).toBeNull()
  expect(screen.getByText(/download through the manage seat/)).toBeTruthy()
  // release the parked poll: the aborted flight must not answer it
  // with another call
  releasePoll({ ok: true, data: { operation_id: 'op-s', state: 'active' } })
  await new Promise((r) => { setTimeout(r, 900) })
  expect(wire.postManageAction.mock.calls.length).toBe(2)
})

test('an installed poll with no detail voices the acquired bytes and the restart face', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-i', state: 'installed', bytes: 4, total: 4 } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/h3-timeline acquired \(4\/4 bytes\)/)).toBeTruthy() })
  expect(screen.getByRole('button', { name: 'Restart to activate' })).toBeTruthy()
})

test('the Weight-ready popup closes to nothing (the run face owns the next move)', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'downloaded: 2', data: { operation_id: 'op-d', state: 'installed', bytes: 2, total: 2 } })
  const { container } = render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText(/downloaded: 2/)).toBeTruthy() })
  await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  expect(container.textContent).toBe('')
})

test('a failed poll voices the estate detail', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-x', state: 'acquiring', bytes: 1, total: 4 } })
    .mockResolvedValueOnce({ ok: true, detail: 'disk full', data: { operation_id: 'op-x', state: 'failed' } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText('disk full')).toBeTruthy() }, { timeout: 3000 })
})

test('a blocked poll without a detail voices the state itself', async () => {
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring x', data: { operation_id: 'op-b', state: 'acquiring', bytes: 0, total: 4 } })
    .mockResolvedValueOnce({ ok: true, data: { operation_id: 'op-b', state: 'blocked' } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  await userEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText('weight acquisition blocked')).toBeTruthy() })
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

test('THE DOWNLOAD TELEMETRY TEARDOWN (audit L-ERROR-3): unmount mid-poll stops the manage calls', async () => {
  vi.useFakeTimers()
  try {
    wire.postManageAction
      .mockResolvedValueOnce({ ok: true, detail: 'acquiring', data: { operation_id: 'op-t', state: 'acquiring', bytes: 0, total: 4 } })
      .mockResolvedValue({ ok: true, detail: 'acquiring', data: { operation_id: 'op-t', state: 'acquiring', bytes: 1, total: 4 } })
    const { unmount } = render(
      <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
    )
    fireEvent.click(screen.getByTestId('weight-download'))
    // the start answers; the first poll lands one interval in
    await vi.advanceTimersByTimeAsync(450)
    const settled = wire.postManageAction.mock.calls.length
    expect(settled).toBeGreaterThanOrEqual(2)
    // unmount: the mount cleanup aborts the flight — the loop must
    // stop paying polls (the old loop ran to its 150-attempt ceiling)
    unmount()
    await vi.advanceTimersByTimeAsync(2000)
    expect(wire.postManageAction.mock.calls.length).toBe(settled)
  } finally {
    vi.useRealTimers()
  }
})

test('THE DOWNLOAD TELEMETRY TEARDOWN (audit L-ERROR-3): closing the popup aborts the flight — no further polls', async () => {
  // REAL timers: the Modal's close chrome is entrance-timer-gated —
  // under fake timers the click reaches the button but never the
  // handler (probed 2026-10-22); the poll cadence is short enough
  // to wait out for real.
  wire.postManageAction
    .mockResolvedValueOnce({ ok: true, detail: 'acquiring', data: { operation_id: 'op-c', state: 'acquiring', bytes: 0, total: 4 } })
    .mockResolvedValue({ ok: true, detail: 'acquiring', data: { operation_id: 'op-c', state: 'acquiring', bytes: 1, total: 4 } })
  render(
    <RunRescue error="flow needs weight 'x.safetensors' — not found in loras/h3" stages={STAGES} onRun={() => {}} />,
  )
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(wire.postManageAction.mock.calls.length).toBeGreaterThanOrEqual(2) }, { timeout: 3000 })
  const settled = wire.postManageAction.mock.calls.length
  fireEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  // the dismissed fallback's inline offer serves; the aborted
  // flight polls nothing more
  await new Promise((r) => { setTimeout(r, 1600) })
  expect(wire.postManageAction.mock.calls.length).toBe(settled)
})
