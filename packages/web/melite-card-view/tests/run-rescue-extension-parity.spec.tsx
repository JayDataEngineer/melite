// @contract cards-run-rescue-extension-parity
// @vitest-environment happy-dom
// run-rescue-extension-parity.spec.tsx — THE EXTENSION-FACE PARITY WALL
// (recon 2026-11-11 round 22: the download popup's `:extension` face in
// packages/web/melite-card-view/src/client/run-rescue.tsx (:231-253) is a
// bare banner with installContinue — no progress tracker, no retry/delete
// exits — while the model face (:314+ weight-popup Modal, weight-progress/
// meter-fill tracker, exitsRow :509-534) has the full UI).
//
// THE GAP: the extension drive shows no ledger while it runs and leaves a
// refused install with no exits — the operator cannot see what the install
// did nor retry/discard it from the face. The cure mirrors the model face's
// seats on the extension face: the SAME ledger (the manage wire's own
// operation/state vocabulary — install_extension seeds the same progress
// ledger the acquire_weight poll reads, no new download path) and the SAME
// voices (the shared tracker seats + retry/delete words) — just the face.
//
//   E1  the Install press renders the progress tracker while the install
//       is in flight (the weight-progress/meter seats — indeterminate,
//       never fake bytes — until the ledger answers);
//   E2  a refused install lands the failed face with the cause AND the
//       Retry + Delete exits — never a silent banner, never Run again;
//   E3  Retry re-issues install_extension with the same pack naming the
//       pack id (names only) through the ONE wire;
//   E4  Delete reaches the manage door with the failed operation's id
//       (acquire_discard — the SAME discard door the model face rides)
//       and re-arms the install offer;
//   E5  a refused install that names NO operation id still offers Delete,
//       which re-arms locally with no discard call (the door named no
//       row — nothing to discard, the face still clears);
//   E6  the done face keeps the landed ledger row visible (the terminal
//       count stays mounted, mirroring the weight popup's done face) with
//       the poll riding the SAME ledger read;
//   E7  a landed install whose ledger poll misses still lands on the
//       answer's truth (the undeclared-total voice, never a stranded
//       busy drive);
//   E8  a detail-less refused install with null data still lands the
//       failed face with the default voice (never an empty note) and
//       both exits;
//   E9  a Delete whose discard is refused voices the refusal and the
//       face re-arms anyway (the local clear stands, exactly like the
//       model delete);
//   E10 THE × PARITY (operator 2026-11-05): the extension face
//       carries the dismissal every rescue face owes — press retires
//       the miss, the retirement outlives the remount (per-pack
//       memory), a different pack's miss re-voices. Runs LAST: the
//       dismissal memory is module-global.
//
// Red pre-cure: E1-E9 (the extension face carries none of these seats;
// the RED run captured E1-E6 failing — E7-E9 pin the cure's own honesty
// branches).
// The real component runs; only the manage wire is faked (the boundary
// run-rescue.spec.tsx already fakes).
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

const STAGES = [{ params: { model: 'h3-timeline', prompt: 'x' } }]
const MISS = "card 'h3-timeline' requires 'ComfyUI-MiniPack' (nodes A) — none live on the engine"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('E1 — the Install press renders the progress tracker while the install is in flight', async () => {
  wire.postManageAction.mockReset()
  // the drive shows its ledger: the press answers the tracker seats at
  // once (indeterminate — the blocking install names no bytes yet), not
  // just a disabled button.
  let release!: (reply: unknown) => void
  wire.postManageAction.mockImplementationOnce(() => new Promise((resolve) => { release = resolve as (reply: unknown) => void }))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  // the in-flight face: the SAME tracker seats the model face owns
  await waitFor(() => { expect(screen.getByTestId('weight-progress')).toBeTruthy() })
  expect(screen.getByTestId('weight-meter')).toBeTruthy()
  expect(screen.getByTestId('weight-meter-fill')).toBeTruthy()
  // indeterminate honesty: no fake fraction, no fake bounds (the
  // undeclared-total pattern — a track with no measure)
  expect(screen.queryByRole('progressbar')).toBe(null)
  expect(screen.getByTestId('weight-progress').textContent).toMatch(/installing/i)
  // settle so the flight does not leak past the test
  await act(async () => { release({ ok: true, detail: '1 installed pack(s)', data: { state: 'active' } }) })
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Run again' })).toBeTruthy() })
})

test('E2 — a refused install lands the failed face with the cause AND the Retry + Delete exits', async () => {
  wire.postManageAction.mockReset()
  // the refused drive must not strand the operator on a dead banner: the
  // cause voices AND both exits serve — never the success face.
  wire.postManageAction.mockResolvedValueOnce({
    ok: false, detail: 'pack unknown to the manager list',
    data: { state: 'failed', operation_id: 'op-ext-fail' },
  })
  // the ledger poll fills the failed row's bytes/total (the same ledger
  // the model tracker reads — no new path)
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-fail', state: 'failed', bytes: 3, total: 9 },
  })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByText(/pack unknown to the manager list/)).toBeTruthy() })
  // the failed face: the cause AND both exits, never the success lie
  expect(screen.queryByText(/run again when ready/i)).toBe(null)
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
  expect(screen.getByTestId('weight-progress').textContent).toMatch(/3 B\/9 B \(33%\)/)
  expect(screen.getByRole('button', { name: 'Retry the download' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Delete stuck operation' })).toBeTruthy()
})

test('E3 — Retry re-issues install_extension with the same pack through the ONE wire', async () => {
  wire.postManageAction.mockReset()
  wire.postManageAction.mockResolvedValueOnce({
    ok: false, detail: 'manager refused install_extension',
    data: { state: 'failed', operation_id: 'op-ext-retry' },
  })
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-retry', state: 'failed', bytes: 0, total: 0 },
  })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Retry the download' })).toBeTruthy() })
  wire.postManageAction.mockResolvedValueOnce({ ok: true, detail: '1 installed pack(s)', data: { state: 'active' } })
  fireEvent.click(screen.getByRole('button', { name: 'Retry the download' }))
  // the retry is the same install, names only, through the same door
  await waitFor(() => {
    expect(wire.postManageAction).toHaveBeenCalledWith('install_extension', { nodes: ['ComfyUI-MiniPack'] })
  })
  expect(wire.postManageAction.mock.calls.filter((c) => c[0] === 'install_extension')).toHaveLength(2)
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Run again' })).toBeTruthy() })
})

test('E4 — Delete discards the failed op through the manage door and re-arms the install offer', async () => {
  wire.postManageAction.mockReset()
  wire.postManageAction.mockResolvedValueOnce({
    ok: false, detail: 'manager refused install_extension',
    data: { state: 'failed', operation_id: 'op-ext-del' },
  })
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-del', state: 'failed', bytes: 1, total: 4, detail: 'manager refused install_extension' },
  })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Delete stuck operation' })).toBeTruthy() })
  wire.postManageAction.mockResolvedValueOnce({ ok: true, detail: 'discarded acquire_weight op-ext-del (failed)' })
  fireEvent.click(screen.getByRole('button', { name: 'Delete stuck operation' }))
  // the SAME discard door the model face rides, carrying the failed row's id
  await waitFor(() => {
    expect(wire.postManageAction).toHaveBeenCalledWith('acquire_discard', { operation_id: 'op-ext-del' })
  })
  // the face re-arms: the failure clears, the install offer serves again
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Install & continue' })).toBeTruthy() })
  expect(screen.queryByText(/manager refused install_extension/)).toBe(null)
  expect(screen.queryByRole('button', { name: 'Retry the download' })).toBe(null)
})

test('E5 — a refused install naming NO operation id still offers Delete, which re-arms locally with no discard call', async () => {
  wire.postManageAction.mockReset()
  // the 404 shape (extension is not declared): the door named no ledger
  // row — Delete clears the failed face without reaching a discard door
  // that would 404.
  wire.postManageAction.mockResolvedValueOnce({ ok: false, detail: 'extension is not declared: GhostPack' })
  render(
    <RunRescue
      error="card 'x' requires 'GhostPack' (nodes A) — none live on the engine"
      stages={STAGES}
      onRun={() => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Delete stuck operation' })).toBeTruthy() })
  fireEvent.click(screen.getByRole('button', { name: 'Delete stuck operation' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Install & continue' })).toBeTruthy() })
  expect(wire.postManageAction.mock.calls.some((c) => c[0] === 'acquire_discard')).toBe(false)
  expect(screen.queryByText(/extension is not declared/)).toBe(null)
})

test('E7 — a landed install whose ledger poll misses still lands on the answer\'s truth', async () => {
  wire.postManageAction.mockReset()
  // the answer names an id the ledger never held (a lane without the
  // progress seat): the poll 404s and the face keeps the answer's own
  // truth — the done face with the undeclared-total voice, never a
  // stranded busy drive. The answer carries no state and no detail,
  // so the face falls back to both defaults (active + "<pack>
  // installed").
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-ghost' },
  })
  wire.postManageAction.mockRejectedValueOnce(new Error('unknown acquire_weight operation: op-ext-ghost'))
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Run again' })).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-ext-ghost' })
  expect(screen.getByTestId('weight-progress').textContent).toMatch(/total undeclared/)
  expect(screen.getByText(/ComfyUI-MiniPack installed/)).toBeTruthy()
})

test('E8 — a detail-less refused install with null data still lands the failed face with the default voice', async () => {
  wire.postManageAction.mockReset()
  // the barest refusal: no detail, null data (no row, no state) — the
  // failed face still serves with both exits, voicing the door's own
  // default instead of an empty note.
  wire.postManageAction.mockResolvedValueOnce({ ok: false, data: null })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Retry the download' })).toBeTruthy() })
  expect(screen.getByText(/install_extension refused/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
  expect(screen.getByTestId('weight-progress').textContent).toMatch(/total undeclared/)
  expect(screen.getByRole('button', { name: 'Delete stuck operation' })).toBeTruthy()
})
test('E9 — a Delete whose discard is refused voices the refusal and the face re-arms anyway', async () => {
  wire.postManageAction.mockReset()
  // the local wedge clears FIRST (the face re-arms), exactly like the
  // model delete — a refused discard voices its cause on the re-armed
  // offer instead of stranding the failed face.
  wire.postManageAction.mockResolvedValueOnce({
    ok: false, detail: 'manager refused install_extension',
    data: { state: 'failed', operation_id: 'op-ext-delrej' },
  })
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-delrej', state: 'failed', bytes: 1, total: 4, detail: 'manager refused install_extension' },
  })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Delete stuck operation' })).toBeTruthy() })
  wire.postManageAction.mockRejectedValueOnce(new Error('lane down'))
  fireEvent.click(screen.getByRole('button', { name: 'Delete stuck operation' }))
  await waitFor(() => { expect(screen.getByText(/lane down/)).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenLastCalledWith('acquire_discard', { operation_id: 'op-ext-delrej' })
  // re-armed (the local clear stands), never stranded, never Run again
  expect(screen.getByRole('button', { name: 'Install & continue' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Retry the download' })).toBe(null)
  expect(screen.queryByRole('button', { name: 'Run again' })).toBe(null)
})

test('E6 — the done face keeps the landed ledger row visible', async () => {
  wire.postManageAction.mockReset()
  // mirrors the weight popup's done face (trackerFaces above doneFace):
  // the terminal count stays mounted, never unmounting at completion.
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, detail: '1 installed pack(s)', data: { state: 'active', operation_id: 'op-ext-ok' },
  })
  wire.postManageAction.mockResolvedValueOnce({
    ok: true, data: { operation_id: 'op-ext-ok', state: 'active', bytes: 9, total: 9 },
  })
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Install & continue' }))
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Run again' })).toBeTruthy() })
  expect(wire.postManageAction).toHaveBeenNthCalledWith(2, 'acquire_weight', { operation_id: 'op-ext-ok' })
  expect(screen.getByTestId('weight-progress').textContent).toMatch(/9 B\/9 B \(100%\)/)
  expect((screen.getByTestId('weight-meter-fill') as HTMLElement).style.width).toBe('100%')
})

test('E10 — THE × PARITY: the extension face carries the dismissal every rescue face owes, and it outlives the mount', async () => {
  wire.postManageAction.mockReset()
  // THE E2-2 LAW RE-FIRED (operator 2026-11-05: "YOU GOT RID OF THE
  // CLOSE BUTTON ON ERROR MESSAGES"): the extension face was rebuilt
  // (b2979ed38) with Retry/Delete exits but NO ×, while the file's
  // own runtime-face law says every rescue face carries the same
  // dismissal. This arm MUST run last: the dismissal memory is
  // module-global and retires the MiniPack face for every later
  // render in this file.
  const { unmount } = render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  // the × serves, with its own accessible name
  const close = screen.getByRole('button', { name: 'Close extension notice' })
  fireEvent.click(close)
  // the miss retires for this pack — no note, no install offer
  await waitFor(() => { expect(screen.queryByText(/Missing extension pack "ComfyUI-MiniPack"/)).toBe(null) })
  expect(screen.queryByRole('button', { name: 'Install & continue' })).toBe(null)
  unmount()
  // THE RE-POP CURE (the dismissal outlives the mount): the tab's
  // error-strip retire/re-arm remounts the same miss — it stays
  // retired until a NEW refusal
  render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
  expect(screen.queryByText(/Missing extension pack "ComfyUI-MiniPack"/)).toBe(null)
  expect(screen.queryByRole('button', { name: 'Install & continue' })).toBe(null)
  // a DIFFERENT pack's miss re-voices — the memory is per-pack,
  // never a global mute
  const OTHER = "card 'h3-timeline' requires 'ComfyUI-OtherPack' (nodes B) — none live on the engine"
  render(<RunRescue error={OTHER} stages={STAGES} onRun={() => {}} />)
  expect(screen.getByText(/Missing extension pack "ComfyUI-OtherPack"/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Install & continue' })).toBeTruthy()
})
