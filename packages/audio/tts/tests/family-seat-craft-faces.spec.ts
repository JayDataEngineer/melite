// family-seat-craft-faces.spec.ts — the tts card's L3 craft-face
// arm (the plugin law, card-without-family audit): a family module
// that seats (its DECL id is real) but exports no route reader
// must fail AT ITS OWN USE SITE, never at priming — the seat stays
// total through missingCraftFace, and the offered-routes door
// refuses loud naming the law (the seat carries the family package
// exports, never a reimplementation).
import { expect, test, vi } from 'vitest'

vi.doMock('@melite/models-qwen3-tts', () => ({
  // A DECL that seats plus the topology reader — but NO variant or
  // cell route reader: exactly the malformed family the degrade law
  // describes (present package, absent craft face).
  DECL: { id: 'qwen3-tts' },
  laneTopologyOf: () => ({ lanes: [] }),
  variantRoute: undefined,
  cellRoute: undefined,
}))

const seats = await import('../src/family-seats.ts')
await seats.primeFamilySeats()

test('a seated family lacking a craft face refuses at the use site, never at priming', () => {
  expect(seats.seatOf('qwen3-tts'), 'the malformed family still seats — the seat is total').toBeDefined()
  expect(() => seats.offeredRoutes(), 'the route reader door names the law at its own use site')
    .toThrow(/the family module exports no such craft face/)
})
