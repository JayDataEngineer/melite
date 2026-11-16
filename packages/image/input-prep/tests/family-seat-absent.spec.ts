// family-seat-absent.spec.ts — the input-prep card's L3 arm (the
// plugin law, card-without-family audit 2026-11-16; the walls tier's
// optional-lane-law-engine-family arm is the template, seated here
// package-local). THE CARD EXISTS WITHOUT ITS FAMILY: the family
// module actually fails to load through the poisoned namespace,
// exactly as it would on disk, and the blast radius is the one SEAT
// — the card still registers, the vocabularies serve empty, the
// min-dim gate carries no floor, and the compose door refuses loud,
// by name.
import { expect, test, vi } from 'vitest'

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

test('ABSENT FAMILY PACKAGE: the card registers, the gate carries no floor, the door refuses loud', async () => {
  vi.doMock('@melite/models-input', () => deadModule('@melite/models-input'))
  const cardDefs = await import('@melite/comfyui-cordis')
  const defs = await cardDefs.loadCardDefs()
  expect(defs.has('input-prep'), 'THE PLUGIN LAW: the card registers without its family package').toBe(true)

  // The cost is the family's own seat: input holds none, the schema
  // rails serve empty, the gate floor is absent (0 — the gates pass
  // through; the degrade never substitutes a card-authored number
  // for the family's law), and the compose door refuses loud — by
  // name.
  const seats = await import('../src/family-seats.ts')
  await seats.primeFamilySeats()
  expect(seats.seatOf('input'), 'the dead family costs its own seat').toBeUndefined()
  expect(seats.scaleMethods(), 'the scale rail serves the degenerate default (the kit refuses an empty closed set)').toEqual(['lanczos'])
  expect(seats.scaleModelOptions(), 'the model rail serves the degenerate sentinel').toEqual([''])
  expect(seats.minDim(), 'the gate carries no floor').toBe(0)

  const def = defs.get('input-prep')!
  expect(() => def.compose(
    { source: '/m/pic.png' },
    { id: 'x', family: 'input', card: 'input-prep', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] },
    { toJSON: () => ({}) } as never,
    'r_absent_family',
  ), 'the compose door refuses, by name').toThrowError(
    /no declared action for family 'input' on the input-prep card — every boarded family \(input\).*a family package absent from the install refuses here, by name/,
  )
})
