import { expect, test, vi } from 'vitest'

/** optional-lane-law-engine arm 2 — the family package is absent
 *  (L3, card-without-family audit 2026-11-16): the card's own
 *  import of the family DECL dies at module scope. The blast
 *  radius is the ONE card (its row in the ledger), never the
 *  estate boot, never the other cards. This arm is fully real:
 *  the card module actually fails to load through the poisoned
 *  namespace, exactly as it would on disk. */
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

test('ABSENT FAMILY PACKAGE: the blast radius is the one card, never the estate', async () => {
  vi.doMock('@melite/models-krea-2', () => deadModule('@melite/models-krea-2'))
  const cardDefs = await import('../src/cardDefs.ts')
  const defs = await cardDefs.loadCardDefs()
  expect(defs.has('image-gen'), 'the card whose family package is missing skips alone').toBe(false)
  expect(cardDefs.cardPackageAbsences, 'the skip is named at the card row').toContain('@melite/image-image-gen')
  expect(defs.size, 'the estate continued').toBeGreaterThanOrEqual(15)
})
