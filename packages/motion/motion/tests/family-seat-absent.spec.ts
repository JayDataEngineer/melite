// family-seat-absent.spec.ts — the motion card's L3 absent-seat
// arm (the plugin law, card-without-family audit): the kimodo
// binding resolves the family SEAT at compose time — a family
// package absent from the install refuses at the dispatch's own
// loud voice naming the family, never at the card's load.
import { expect, test, vi } from 'vitest'

vi.mock('../src/family-seats.ts', () => ({
  primeFamilySeats: async () => {},
  seatOf: () => undefined,
}))

const { ACTION_BINDINGS } = await import('../src/card.ts')

test('the kimodo dispatch refuses loud when the family seat is absent', () => {
  expect(() => {
    const bound = ACTION_BINDINGS['kimodo'] as (p: unknown, m: unknown, g: unknown, r: string) => void
    bound({}, {}, { toJSON: () => ({}) }, 'r-absent-seat')
  }, 'the refusal names the family and the boarding law').toThrow(
    /no declared action for family 'kimodo' on the motion card/,
  )
})
