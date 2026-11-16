import { expect, test, vi } from 'vitest'

/** optional-lane-law-engine arm 2 — the family package is absent
 *  (L3, card-without-family audit 2026-11-16; the image-gen lazy
 *  surgery landed the same night). THE CARD EXISTS WITHOUT ITS
 *  FAMILIES: the card holds zero static family imports, each family
 *  resolves through a guarded dynamic seat, and a dead family
 *  package costs ITS OWN SEAT alone — the card still registers, the
 *  surviving families still serve, the estate still boots. This arm
 *  is fully real: the family module actually fails to load through
 *  the poisoned namespace, exactly as it would on disk. */
const deadModule = (name: string) => {
  const err = new Error(`Cannot find module '${name}'`)
  ;(err as NodeJS.ErrnoException).code = 'ERR_MODULE_NOT_FOUND'
  const dead: Record<string, unknown> = { __esModule: true }
  return new Proxy(dead, {
    get(_, prop: string | symbol) {
      if (prop === '__esModule') return true
      throw err
    },
  })
}

test('ABSENT FAMILY PACKAGE: the blast radius is the one SEAT, never the card, never the estate', async () => {
  vi.doMock('@melite/models-krea-2', () => deadModule('@melite/models-krea-2'))
  const cardDefs = await import('../src/cardDefs.ts')
  const defs = await cardDefs.loadCardDefs()
  expect(defs.has('image-gen'), 'THE PLUGIN LAW: the card registers without its family package').toBe(true)
  expect(defs.size, 'the estate continued').toBeGreaterThanOrEqual(15)

  // The cost is the family's own seat: krea-2 holds none, the knob
  // serves none of its addresses, and the surviving families still
  // do — the degrade law is per family, never per card.
  const seats = await import('../../../image/image-gen/src/family-seats.ts')
  await seats.primeFamilySeats()
  expect(seats.seatOf('krea-2'), 'the dead family costs its own seat').toBeUndefined()
  expect(seats.seatOf('moss-image'), 'a surviving family keeps its seat').toBeDefined()
  const served = seats.semanticModels().map((e) => String(e.value))
  expect(served.some((v) => v.includes('krea-2')), 'no krea-2 address is served').toBe(false)
  expect(served.length, 'the knob still serves the surviving families').toBeGreaterThan(0)
})
