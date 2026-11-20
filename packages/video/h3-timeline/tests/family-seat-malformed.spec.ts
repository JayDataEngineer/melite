// family-seat-malformed.spec.ts — the h3-timeline card's L3
// malformed-face arm (the plugin law, card-without-family audit):
// ONE PACKAGE, ONE SEAT. A family package whose faces LOAD but
// carry a malformed face (here: the actions module exports no
// parseH3Facts) skips the seat named — never a half-seated card.
// The guard's own return is the judge: seatOf stays undefined even
// though every import resolved.
import { expect, test, vi } from 'vitest'

vi.doMock('@melite/models-h3', () => ({
  DECL: { id: 'h3' },
  h3DefaultLoraEntry: () => ({}),
  finalizeH3: () => ({}),
  renderH3Edit: () => ({}),
  reshootArmed: () => ({}),
  assertOverlayGated: () => {},
  filmAdmissionNotices: () => [],
  SEAM_OVERLAP_FRAMES: 12,
  REFINE_DEFAULT_CLIP_SECONDS: 5,
}))
vi.doMock('@melite/models-h3/mods/loras', () => ({ H3_LORA_ROWS: [] }))
vi.doMock('@melite/models-h3/schema', () => ({
  paramSchema: () => ({}),
  schema: () => ({}),
  coerceWireBoolean: () => true,
  JSON_ARRAY_PARAMS: [],
}))
// The malformed face: the actions module resolves but exports no
// parseH3Facts — the seat guard's last leg fires and the seat is
// skipped whole.
vi.doMock('@melite/models-h3/actions', () => ({ parseH3Facts: undefined }))

const seats = await import('../src/family-seats.ts')
await seats.primeFamilySeats()

test('a malformed family face skips the seat whole — never a half-seated card', () => {
  expect(seats.seatOf('h3'), 'every face loaded, one was malformed: no seat').toBeUndefined()
})
