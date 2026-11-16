import { expect, test, vi } from 'vitest'

/** optional-lane-law-engine arm 1 — the plugin law's engine seat
 *  (S2/S3 cure, 2026-11-16, core-without-card audit): an absent
 *  cardPackages row costs ITS OWN registration. The estate
 *  composition loads, every present card composes, and the absence
 *  is named in the ledger — never a boot refusal, never a compose
 *  abort for the cards after it. Registry row: optional-lane-law-
 *  engine (tier cards); sibling arms in optional-lane-law-engine-
 *  family.spec.ts and -broken.spec.ts (vitest mock state is
 *  per-file: each arm rides its own mechanism in isolation).
 *
 *  Simulation vehicle (receipt note): vitest cannot propagate a
 *  mock-factory throw, so absence rides a dead namespace —
 *  `__esModule` present, every other export a getter that throws
 *  ERR_MODULE_NOT_FOUND. At the guard this is the identical event
 *  the production import rejection produces: same code, same
 *  catch, same ledger. */
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

test('ABSENT CARD ROW: loadCardDefs composes the estate without the row and names it', async () => {
  vi.doMock('@melite/image-image-gen', () => deadModule('@melite/image-image-gen'))
  const cardDefs = await import('../src/cardDefs.ts')
  const defs = await cardDefs.loadCardDefs()
  expect(defs.has('image-gen'), 'the absent card is not registered').toBe(false)
  expect(cardDefs.cardPackageAbsences, 'the ledger names the absent row').toContain('@melite/image-image-gen')
  expect(defs.size, 'the estate continued — every other card composed').toBeGreaterThanOrEqual(15)
})
