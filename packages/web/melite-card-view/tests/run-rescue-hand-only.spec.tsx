// @vitest-environment happy-dom
/**
 * run-rescue-hand-only.spec.tsx — THE WEIGHT-OFFER PARITY, RENDERED
 * (the firing arm; operator 2026-10-22: "A GATE PREVENTS THE ERROR
 * FROM HAPPENING").
 *
 * THE BURN: the run failed on 'Qwen3-TTS-12Hz-1.7B-Base-merged' (a
 * HAND-PLACED tree — an operator merge with no upstream repo), the
 * popup offered Download, the press died on the door's item-not-found.
 * Every tier between the DECL and the button was green: the estate
 * honestly omitted the fetch anchor, the parse DISCARDED the honesty,
 * and the face rendered the press unconditionally. The button was the
 * lie; this arm judges the button.
 *
 * THE LAW: the wire row (missing_all / the lead row) carries
 * fetch_url ONLY for a fetchable weight — cardsLanes emits it from
 * the DECL's provisions row and never for a hand-placed one. The face
 * may render the Download press ONLY for a rescue where every listed
 * file is fetchable; a hand-only rescue renders the hand-place
 * sentence (names + folders + no fetch exists) and NO press. The
 * press itself offers only fetchable files — a hand-only file in the
 * list can never land and the run can never start.
 *
 * JOURNEY (§2): [4] compose door emits the provenance row → this arm
 * rides [1] the UI seat — the felt hop — through the REAL parse
 * (rescueOfLaneDetails) and the REAL face (RunRescue). Toggle: drop
 * the fetchable gate in run-rescue.tsx / the field in
 * run-rescue-core.ts → Arm 1 reds (the press renders for the
 * hand-only row).
 *
 * Reds today: the face renders weight-download for a fetch-less row
 * (the burn verbatim) and the rescue carries no fetchable face.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { rescueOfLaneDetails } from '../src/client/run-rescue-core.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

const HAND_TREE = 'Qwen3-TTS-12Hz-1.7B-Base-merged'

/** The burn's wire row, byte-exact what cardsLanes.lanePresenceMiss
 *  emits for a hand-only tree: NO fetch_url anywhere (the estate's
 *  honesty — a merge has no upstream repo). */
const handOnlyDetails = (): Record<string, unknown> => ({
  family: 'qwen3-tts',
  slot: 'model_path',
  missing: HAND_TREE,
  folders: ['audio/qwen3-tts/hf'],
  kind: 'model',
})

/** The lawful twin: a provisions-backed miss carries the fetch url. */
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

beforeEach(() => {
  wire.postManageAction.mockImplementation(async () => {
    throw new Error('no acquire may start from a hand-only face')
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('Arm 1 — a hand-only rescue renders NO Download press and names the placement (the burn, rendered)', () => {
  const rescue = rescueOfLaneDetails(handOnlyDetails())
  expect(rescue).not.toBeNull()
  const { getByTestId } = render(
    <RunRescue error="" stages={[{ params: { model: 'qwen3-tts' } }]} onRun={() => {}} rescue={rescue ?? undefined} />,
  )
  const face = getByTestId('weight-popup').textContent ?? ''
  expect(face).toContain(HAND_TREE)
  // THE OFFER LAW: no press exists where no fetch exists.
  expect(screen.queryByTestId('weight-download')).toBeNull()
  // the placement truth renders: the operator learns WHERE the bytes
  // go and that no fetch exists — never a dead button.
  expect(face).toMatch(/hand-placed|place the file/i)
})

test('Arm 2 — a provisions-backed rescue keeps its Download press (the lawful class is untouched)', () => {
  const rescue = rescueOfLaneDetails(fetchableDetails())
  expect(rescue).not.toBeNull()
  const { getByTestId } = render(
    <RunRescue error="" stages={[{ params: { model: 'qwen3-tts' } }]} onRun={() => {}} rescue={rescue ?? undefined} />,
  )
  expect(getByTestId('weight-download')).toBeTruthy()
})

test('Arm 3 — the parse keeps provenance both ways: fetchable when the row carries the url, hand-only when it does not', () => {
  const hand = rescueOfLaneDetails(handOnlyDetails()) as { fetchable?: boolean } | null
  expect(hand).not.toBeNull()
  expect(hand!.fetchable).toBe(false)
  const fetchable = rescueOfLaneDetails(fetchableDetails()) as { fetchable?: boolean } | null
  expect(fetchable).not.toBeNull()
  expect(fetchable!.fetchable).not.toBe(false)
})
