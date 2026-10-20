// @contract cards-run-rescue-runtime
// @vitest-environment happy-dom
// run-rescue-face-contract.spec.tsx — THE POPUP'S FACE CONTRACT
// (ERRORS.md k2/m + the purge plan's P5 rescue honesty:
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7 P5).
//
// THE BURN (m, verbatim): the missing-weight popup showed raw bytes
// ("2096567476/5413698958 bytes (39%)"), froze with no message, and
// re-popped endlessly; the "Weight ready … (verifying) — run again
// when ready" face lied about readiness. These arms pin the face:
//
//   F1  the tracker renders a PROGRESS BAR carrying the fraction —
//       and a total=0 row (no DECLared size) must NOT render a dead
//       0-of-0 meter dressed as 0%: the face voices the undeclared
//       total honestly;
//   F2  a first poll answering 'active' (still landing) must NOT
//       flip the popup to "Weight ready"/"Run again" — the lie face;
//   F3  a download frozen at X% that rides the poll ceiling must end
//       in a STUCK message with Retry and Delete/discard verbs —
//       never the success face;
//   F4  after a failed/stuck acquire, dismissing the popup must not
//   F4  re-pop it while the state is unchanged — the parent's
//       error-strip retire/re-arm (the next refusal) remounts this
//       component fresh, so the dismissal has to outlive the mount.
//
// Red today: F1's total=0 arm, F2, F3, F4. The real component runs;
// only the manage wire is faked (the boundary run-rescue.spec.tsx
// already fakes).
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const STAGES = [{ params: { model: 'moss-image', prompt: 'x' } }]
const MISS = "lane presence: family 'moss-image' declares loras 'moss_image_sft_int8_convrot.safetensors' but no store copy exists"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

const reply = (operationId: string, state: string, bytes: number, total: number, detail?: string) => ({
  ok: true,
  ...(detail === undefined ? {} : { detail }),
  data: { operation_id: operationId, state, bytes, total },
})

test('F1a — the live tracker renders the fraction bar with the percent face (the contract guard)', async () => {
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-f1', 'acquiring', 2_096_567_476, 5_413_698_958))
    .mockResolvedValue(reply('op-f1', 'acquiring', 2_096_567_476, 5_413_698_958))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  // the human ledger: human sizes with the percent (the operator's
  // verbatim "2096567476/5413698958 bytes" wall never renders again)
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/2\.0 GB\/5\.0 GB \(39%\)/) })
  expect(screen.getByTestId('weight-progress').textContent).not.toMatch(/2096567476\/5413698958/)
  // the HUMAN line rides with the bar: the bar carries the fraction
  const meter = screen.getByRole('progressbar')
  expect(meter.getAttribute('aria-valuemax')).toBe('5413698958')
  expect(meter.getAttribute('aria-valuenow')).toBe('2096567476')
  const fill = screen.getByTestId('weight-meter-fill') as HTMLElement
  expect(fill.style.width).toBe('39%')
  // the Modal portals to document.body — the face reads from there
  expect(document.body.textContent).toMatch(/39%/)
})

test('F1b — a total=0 row renders NO dead meter: the face voices the undeclared total', async () => {
  // P5's total=0 face: no DECLared size seeds the ledger with total 0
  // — today the popup renders a 0-of-0 progressbar and "X/0 bytes
  // (0%)" — a dead meter dressed as 0% progress.
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-f1b', 'acquiring', 2_096_567_476, 0))
    .mockResolvedValue(reply('op-f1b', 'acquiring', 2_096_567_476, 0))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/2\.0 GB downloaded/) })
  expect(screen.queryByRole('progressbar')).toBe(null)
  expect(document.body.textContent).toMatch(/total.{0,24}undeclared|no declared total|size unknown/i)
})

test("F2 — a first poll answering 'active' must NOT flip the popup to Weight ready", async () => {
  // THE LIE FACE (m): "(verifying) — run again when ready" while the
  // weight is still landing. The 'active' poll is not a landing.
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-f2', 'acquiring', 1, 4))
    .mockResolvedValueOnce(reply('op-f2', 'active', 2, 4, 'acquire_weight op-f2: 2/4 bytes (verifying)'))
    // post-cure the tracker keeps polling; this is the real landing
    .mockResolvedValue(reply('op-f2', 'installed', 4, 4))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  // the 'active' answer landed and the tracker shows its human ledger…
  await waitFor(() => { expect(screen.getByTestId('weight-progress').textContent).toMatch(/2 B\/4 B \(50%\)/) })
  // …and the popup must STILL be the tracker: no Weight ready, no
  // Run again, no "acquired" voice. Red today: the lie face renders.
  expect(screen.queryByText('Weight ready')).toBe(null)
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
  expect(screen.queryByText(/run again when ready/)).toBe(null)
})

test('F3 — a download frozen at X% ends in a stuck message with Retry and Delete verbs, never the success face', async () => {
  // THE STUCK BURN (k2): bytes frozen at 39% across every poll; the
  // loop rides its ceiling and today the popup flips to "Weight
  // ready … acquired (…)" — the face that wedges the operator. The
  // law: ceiling expiry is a STUCK face with a message and BOTH verbs.
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-f3', 'acquiring', 2_096_567_476, 5_413_698_958))
    .mockResolvedValue(reply('op-f3', 'acquiring', 2_096_567_476, 5_413_698_958))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  vi.useFakeTimers()
  fireEvent.click(screen.getByTestId('weight-download'))
  // the poll ceiling: 150 attempts × 400ms — drive the whole flight
  // (act-wrapped: the loop's state updates land inside the flush)
  await act(async () => { await vi.advanceTimersByTimeAsync(61_000) })
  // the Modal portals to document.body — the face reads from there
  const face = document.body.textContent ?? ''
  // never the success lie
  expect(face).not.toMatch(/Weight ready/)
  expect(face).not.toMatch(/acquired \(/)
  // the stuck truth: a message naming the stop, and both verbs
  expect(face).toMatch(/stuck|stalled|no longer progressing/i)
  expect(face).toMatch(/retry/i)
  expect(face).toMatch(/delete|discard|remove/i)
})

test('F4 — after a failed acquire, dismissing the popup must not re-pop it while the state is unchanged', async () => {
  // THE RE-POP LOOP (m): the acquire fails, the operator closes the
  // popup, the parent's error strip re-arms on the next look — and
  // today a fresh mount (dismissed state lost) POPS THE MODAL AGAIN,
  // forever. The dismissal must outlive the mount until the acquire
  // state changes.
  wire.postManageAction
    .mockResolvedValueOnce(reply('op-f4', 'acquiring', 1, 4))
    .mockResolvedValueOnce({ ok: true, detail: 'disk full', data: { operation_id: 'op-f4', state: 'failed' } })
  const first = render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByTestId('weight-download'))
  await waitFor(() => { expect(screen.getByText('disk full')).toBeTruthy() })
  // the operator dismisses the failed popup
  fireEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
  expect(screen.queryByTestId('weight-popup')).toBe(null)
  // the parent retires and re-arms the strip: a FRESH mount with the
  // SAME error and an UNCHANGED acquire state
  first.unmount()
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  // RED today: the modal re-pops on the fresh mount
  expect(screen.queryByTestId('weight-popup')).toBe(null)
  // the inline offer serves instead (the miss is never lost)
  expect(screen.getByText(/download through the manage seat\?/)).toBeTruthy()
})

const RUNTIME_MISS = "ComfyError: ComfyUI run failed: RuntimeError: anny-estimator runtime not found at /home/user/tools/data/runtime/anny-estimator. Provision it: pnpm run provision -- estimator (SAM 3D Body venv + SOMA-X checkout — see dev_docs/design/estimator-chain.md). Missing: /home/user/tools/data/runtime/anny-estimator/estimator_chain.py. Or point ANNY_ESTIMATOR_ROOT at an existing runtime. @ anny::Sam3dBodyImageToAnny.0 (Sam3dBodyImageToAnny, 1 nodes executed before the failure)"

test('F5 (E2-2, Piece B) — the runtime face FIRES provision_runtime through the manage wire', async () => {
  // THE FIRING ARM (Piece B, operator 2026-10-20): the face grew a
  // provision button — the estate DOES own a runtime-provision door
  // now (provision_runtime links the engine tree to the repo seed).
  // The press rides the ONE manage wire with the runtime NAME only
  // (names only, always — the family scan is server-side); success
  // retires the miss face and voices "provisioned — press Run
  // again"; the re-run rides the CALLER's press (never auto-run).
  const onRun = vi.fn()
  wire.postManageAction.mockResolvedValue({ ok: true, detail: 'linked', data: { state: 'active', runtime: 'anny-estimator' } })
  render(<RunRescue error={RUNTIME_MISS} stages={STAGES} onRun={onRun} />)
  expect(screen.getByText(/anny-estimator/)).toBeTruthy()
  // RED before cure: the face offered no wire — no provision button existed.
  fireEvent.click(screen.getByRole('button', { name: /provision/i }))
  await waitFor(() => { expect(screen.getByText(/provisioned — press Run again/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenCalledWith('provision_runtime', { runtime: 'anny-estimator' })
  expect(onRun).not.toHaveBeenCalled()
  // the miss face retired with the success — the old command/env
  // notes are gone with it
  expect(screen.queryByText(/Provision it where the engine lives/)).toBe(null)
  // the re-run rides the caller's own press
  fireEvent.click(screen.getByRole('button', { name: 'Run again' }))
  expect(onRun).toHaveBeenCalledTimes(1)
})

test('F5b (E2-2, Piece B) — a refused provision voices the returned detail, never a fake success', async () => {
  wire.postManageAction.mockResolvedValue({ ok: false, detail: 'provision_runtime: target blocked — /eng/data/runtime/anny-estimator holds a foreign dir; remove it first' })
  render(<RunRescue error={RUNTIME_MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /provision/i }))
  await waitFor(() => { expect(screen.getByText(/target blocked/)).toBeTruthy() })
  expect(screen.queryByText(/provisioned — press Run again/)).toBe(null)
})

test('F6 (E2-2) — the runtime-miss face dismisses with the × and stays dismissed', () => {
  // THE × (E2-2's second sentence — "THERE IS NO MORE X FOR ERRORS
  // IN CARD ANYMORE"): the provision face carries the same
  // dismissal law as every rescue face — the miss retires on press
  // and never re-pops for the same miss.
  const first = render(<RunRescue error={RUNTIME_MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(screen.queryByText(/pnpm run provision -- estimator/)).toBe(null)
  first.unmount()
  render(<RunRescue error={RUNTIME_MISS} stages={STAGES} onRun={() => {}} />)
  expect(screen.queryByText(/pnpm run provision -- estimator/)).toBe(null)
})
