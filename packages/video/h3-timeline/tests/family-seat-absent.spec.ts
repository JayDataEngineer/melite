// family-seat-absent.spec.ts — the h3-timeline card's L3 arms (the
// plugin law, card-without-family audit 2026-11-16; the
// mask/input-prep package-local seat is the template). THE CARD
// EXISTS WITHOUT ITS FAMILY: the family package actually fails to
// load through the poisoned namespace, exactly as it would on disk
// (every face of the one package — main, mods/loras, schema,
// actions — resolves or fails together), and the blast radius is the
// one SEAT: the card's own registration serves the card-local kinds
// alone (no LoRA seat), omits the carrier and the JSON-array rows,
// and every door that needs a family face refuses loud, by name.
//
// The card's registerCard is driven DIRECTLY (a capturing registrar
// stub): the estate's compose rim adds its own flow-contract walk
// over the served schema carrier, and an absent carrier cannot serve
// the declared flow ports there — the card-side degrade arms under
// test live below that walk, on the def the card itself builds.
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

vi.doMock('@melite/models-h3', () => deadModule('@melite/models-h3'))
vi.doMock('@melite/models-h3/mods/loras', () => deadModule('@melite/models-h3/mods/loras'))
vi.doMock('@melite/models-h3/schema', () => deadModule('@melite/models-h3/schema'))
vi.doMock('@melite/models-h3/actions', () => deadModule('@melite/models-h3/actions'))

const { registerCard } = await import('../src/card.ts')
const seats = await import('../src/family-seats.ts')
await seats.primeFamilySeats()

// THE CAPTURING REGISTRAR (the cordis effect rim, stubbed): the card
// builds its def against the poisoned registry and hands it to the
// service face — the stub records it instead of walking the flow
// contract.
let def: Record<string, unknown> | undefined
registerCard(
  { effect: (fn: () => void) => fn() } as never,
  { registerCard: (served: Record<string, unknown>) => { def = served } } as never,
)

const MODEL_ROW = { id: 'h3', card: 'h3-timeline', defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] }
const NO_GRAPH = { toJSON: () => ({}) } as never

test('THE PLUGIN LAW: the card builds its def without its family package, at the card-local degrade', () => {
  expect(def, 'the card registers — a family package is never a load cost').toBeDefined()
  expect(seats.seatOf('h3'), 'the dead family costs its own seat').toBeUndefined()

  // THE SERVED ROSTER (seat-derived): the card-local kinds alone —
  // the family-owned loras kind is the seat's own cost.
  const mods = (def!.mods as ReadonlyArray<{ kind: string }>) ?? []
  expect(mods.map((m) => m.kind), 'the served mods are the card-local kinds only').toEqual(['reshoot', 'edit'])
  // THE FAMILY FACES: the JSON-array unwrap roster and the schema
  // carrier ride the seat — an absent family omits both.
  expect(def!.jsonArrayParams, 'the family JSON list is omitted').toBeUndefined()
  expect(def!.schemaCarrier, 'the schema carrier is omitted').toBeUndefined()
})

test('ABSENT FAMILY: the compose gate refuses loud, by name, before any doc read', () => {
  expect(() => (def!.compose as (p: unknown, m: unknown, g: unknown, runId: string) => void)(
    { prompt: 'a poisoned-registry probe' },
    MODEL_ROW,
    NO_GRAPH,
    'r_absent_family',
  ), 'the compose door refuses, by name').toThrowError(
    /no seat for family 'h3' on the h3-timeline card — the card's compose gate rides the '@melite\/models-h3' family package, and that package is absent from the install \(a family package absent from the install refuses here, by name\)/,
  )
})
