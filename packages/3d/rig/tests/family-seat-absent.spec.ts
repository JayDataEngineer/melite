// family-seat-absent.spec.ts — the rig card's L3 arms (the plugin
// law, card-without-family audit 2026-11-16; the mask/input-prep
// package-local seats are the template, doubled here because the rig
// card's two mode lanes each resolve their OWN family seat). THE
// CARD EXISTS WITHOUT ITS FAMILIES: the family modules actually fail
// to load through the poisoned namespace, exactly as they would on
// disk, and the blast radius is the one SEAT per family — the card
// still registers, and each lane whose family is absent refuses
// loud, by name, at its compose door (the copy lane's transfer-rig
// seat, the auto lane's gem-soma seat).
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

vi.doMock('@melite/models-transfer-rig', () => deadModule('@melite/models-transfer-rig'))
vi.doMock('@melite/models-gem-soma', () => deadModule('@melite/models-gem-soma'))

const cardDefs = await import('@melite/comfyui-cordis')
const defs = await cardDefs.loadCardDefs()
const seats = await import('../src/family-seats.ts')
await seats.primeFamilySeats()

const MODEL_ROW = { id: 'x', card: 'rig', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] }
const NO_GRAPH = { toJSON: () => ({}) } as never

test('THE PLUGIN LAW: the rig card registers without its family packages', () => {
  expect(defs.has('rig'), 'the card registers — a family package is never a load cost').toBe(true)
  expect(seats.seatOf('transfer-rig'), 'the dead copy family costs its own seat').toBeUndefined()
  expect(seats.seatOf('gem-soma'), 'the dead auto family costs its own seat').toBeUndefined()
})

test('ABSENT COPY FAMILY: the transfer-rig seat refuses the copy lane loud, by name', () => {
  const def = defs.get('rig')!
  expect(() => def.compose(
    def.schema({ mesh_glb: '/m/clothed.glb', mode: 'copy', donor_glb: '/m/rigged-donor.glb' }),
    MODEL_ROW,
    NO_GRAPH,
    'r_absent_transfer_rig',
  ), 'the copy door refuses, by name').toThrowError(
    /no declared action for family 'transfer-rig' on the rig card — the copy lane composes the donor family's own declared segment; this address owns none \(a family package absent from the install refuses here, by name\)/,
  )
})

test('ABSENT AUTO FAMILY: the gem-soma seat refuses the auto lane loud, by name', () => {
  const def = defs.get('rig')!
  expect(() => def.compose(
    def.schema({ mesh_glb: '/m/body.glb' }),
    MODEL_ROW,
    NO_GRAPH,
    'r_absent_gem_soma',
  ), 'the auto door refuses, by name').toThrowError(
    /no declared action for family 'gem-soma' on the rig card — the auto lane composes the SOMA family's own declared segment; this address owns none \(a family package absent from the install refuses here, by name\)/,
  )
})
