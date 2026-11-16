// family-seat-absent.spec.ts — the mask card's L3 arm (the plugin
// law, card-without-family audit 2026-11-16; the walls tier's
// optional-lane-law-engine-family arm is the template, seated here
// package-local because this card's compose door is FAMILY-CONSTANT:
// it composes the mask family's declared select action on every
// address, so its loud refusal is reachable only through an absent
// family PACKAGE — never through a synthetic row). THE CARD EXISTS
// WITHOUT ITS FAMILY: the family module actually fails to load
// through the poisoned namespace, exactly as it would on disk, and
// the blast radius is the one SEAT — the card still registers, the
// compose door refuses loud, by name.
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

test('ABSENT FAMILY PACKAGE: the mask card registers, the seat refuses loud, by name', async () => {
  vi.doMock('@melite/models-mask', () => deadModule('@melite/models-mask'))
  const cardDefs = await import('@melite/comfyui-cordis')
  const defs = await cardDefs.loadCardDefs()
  expect(defs.has('mask'), 'THE PLUGIN LAW: the card registers without its family package').toBe(true)

  // The cost is the family's own seat: mask-select holds none, and
  // the compose door refuses loud — the degrade law is per family,
  // never per card.
  const seats = await import('../src/family-seats.ts')
  await seats.primeFamilySeats()
  expect(seats.seatOf('mask-select'), 'the dead family costs its own seat').toBeUndefined()

  const def = defs.get('mask')!
  expect(() => def.compose(
    { input_image: '/m/pic.png', sam3: [{ prompt: 'person' }] },
    { id: 'x', card: 'mask', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] },
    { toJSON: () => ({}) } as never,
    'r_absent_family',
  ), 'the compose door refuses, by name').toThrowError(
    /no declared action for family 'mask-select' on the mask card — every boarded family \(mask-select\).*a family package absent from the install refuses here, by name/,
  )
})
