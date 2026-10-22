// @vitest-environment happy-dom
/**
 * run-rescue-weight-close.spec.tsx — THE WEIGHT-POPUP × (the firing
 * arm; operator 2026-10-22: "the close button here to close out the
 * error in card is not working").
 *
 * THE BURN: the run failed on 'Qwen3-TTS-12Hz-1.7B-Base-merged' (a
 * hand-only tree), the Missing-weight popup named the placement and
 * offered no Download (the offer parity) — but the popup carried no
 * inner × (only the Modal's chrome close), and collapsing it fell
 * back to an inline face that re-offered Download for an unfetchable
 * tree with no × of its own. Close → inline → Download → popup, in
 * a loop; the error could never be closed out.
 *
 * THE LAW (the E2-2 × parity, extended): every rescue face carries
 * the same dismissal — the missing face seats an inner × that
 * collapses to the inline offer, and the inline face seats its own
 * × that retires outright (a hand-only miss has no re-offer: no
 * fetch exists, so the collapsed face renders the placement note
 * and NO press). A new refusal re-arms (the dismissal key changes).
 *
 * JOURNEY (§2): [press] the run refusal → this arm rides [1] the UI
 * seat — the felt hop — through the REAL parse and the REAL face.
 * Toggle: drop the popup's inner × or the inline retire (or
 * re-offer Download for the hand-only inline) → Arm 1 reds.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { rescueOfLaneDetails } from '../src/client/run-rescue-core.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const HAND_TREE = 'Qwen3-TTS-12Hz-1.7B-Base-merged'

const handOnlyDetails = (): Record<string, unknown> => ({
  family: 'qwen3-tts',
  slot: 'model_path',
  missing: HAND_TREE,
  folders: ['audio/qwen3-tts/hf'],
  kind: 'model',
})

const fetchableDetails = (): Record<string, unknown> => ({
  family: 'qwen3-tts',
  slot: 'model_path',
  missing: 'Qwen3-TTS-12Hz-1.7B-VoiceDesign',
  folders: ['audio/qwen3-tts/hf'],
  kind: 'model',
  missing_all: [
    { slot: 'model_path', name: 'Qwen3-TTS-12Hz-1.7B-VoiceDesign', fetch_url: 'https://example/vd' },
  ],
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('Arm 1 — the hand-only popup closes out: inner × collapses, inline × retires, no Download loop', async () => {
  const rescue = rescueOfLaneDetails(handOnlyDetails())
  expect(rescue).not.toBeNull()
  render(
    <RunRescue error="" stages={[{ params: { model: 'qwen3-tts' } }]} onRun={() => {}} rescue={rescue ?? undefined} />,
  )
  const popup = screen.getByTestId('weight-popup')
  expect(popup.textContent ?? '').toContain(HAND_TREE)
  // the popup seats its own × (never chrome-only): this is the
  // button the burn was missing.
  await userEvent.click(within(popup).getByRole('button', { name: 'Dismiss error' }))
  // collapsed: the popup is gone, the placement note stays, and NO
  // Download press loops back to the popup (the offer law holds
  // collapsed too).
  expect(screen.queryByTestId('weight-popup')).toBe(null)
  expect(screen.queryByText(/Hand-placed weight/)).not.toBe(null)
  expect(document.body.textContent ?? '').toContain(HAND_TREE)
  expect(screen.queryByTestId('weight-download')).toBe(null)
  // the inline face seats its own ×: the error closes OUT.
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
  expect(document.body.textContent ?? '').not.toContain(HAND_TREE)
})

test('Arm 2 — a new refusal re-arms the face on the same mount', async () => {
  const first = rescueOfLaneDetails(handOnlyDetails())
  expect(first).not.toBeNull()
  const second = rescueOfLaneDetails(fetchableDetails())
  expect(second).not.toBeNull()
  const view = render(
    <RunRescue error="" stages={[{ params: { model: 'qwen3-tts' } }]} onRun={() => {}} rescue={first ?? undefined} />,
  )
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  await userEvent.click(within(screen.getByTestId('weight-popup')).getByRole('button', { name: 'Dismiss error' }))
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
  expect(document.body.textContent ?? '').not.toContain(HAND_TREE)
  // a new refusal on the same mount pops again (the retire was for
  // the old miss, never a latch).
  view.rerender(
    <RunRescue error="" stages={[{ params: { model: 'qwen3-tts' } }]} onRun={() => {}} rescue={second ?? undefined} />,
  )
  expect(screen.getByTestId('weight-popup')).toBeTruthy()
  expect(screen.getByTestId('weight-download')).toBeTruthy()
})
