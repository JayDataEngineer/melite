import { expect, test, vi } from 'vitest'

/** optional-lane-law-engine arm 3 — a card package that EXISTS but
 *  fails to load is a DEFECT, not an absence: the boot refuses
 *  loud (a non-ERR_MODULE_NOT_FOUND failure never rides the
 *  ledger — swallowing real defects behind the plugin law would be
 *  the silent-skip disease the plugin law itself forbids). */
const brokenModule = () => new Proxy({ __esModule: true }, {
  get(_, prop: string | symbol) {
    if (prop === '__esModule') return true
    throw new Error('card module defect: top-level throw')
  },
})

test('BROKEN CARD STAYS LOUD: a load failure that is not absence rejects the boot', async () => {
  vi.doMock('@melite/image-image-gen', () => brokenModule())
  const cardDefs = await import('../src/cardDefs.ts')
  await expect(cardDefs.loadCardDefs(), 'a real defect never rides the absence ledger').rejects.toThrow('card module defect')
})
