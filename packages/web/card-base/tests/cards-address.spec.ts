// cards-address.spec.ts — THE RUN ADDRESS MINT (cards-address.ts):
// one function, one grammar — `dsh-resource://cards/run/<runId>`
// with the id URI-encoded to a single path segment. card-view's
// cards-resource.ts parses this grammar back, so the mint's law is
// round-trip stability: every id, however hostile, mints one
// segment that decodes to itself.
import { expect, test } from 'vitest'

import { cardsRunAddress } from '../src/cards-address.ts'

test('THE GRAMMAR: a plain id mints the run address verbatim under the scheme', () => {
  expect(cardsRunAddress('abc123')).toBe('dsh-resource://cards/run/abc123')
})

test('THE SINGLE-SEGMENT LAW: spaces and slashes encode — the id never splits the path', () => {
  expect(cardsRunAddress('a b/c')).toBe('dsh-resource://cards/run/a%20b%2Fc')
  const minted = cardsRunAddress('run 7/draft 2')
  const tail = minted.slice('dsh-resource://cards/run/'.length)
  expect(tail.includes('/')).toBe(false)
  expect(decodeURIComponent(tail)).toBe('run 7/draft 2')
})

test('THE ROUND TRIP: hostile ids decode to themselves (the parser side owns this promise)', () => {
  for (const id of ['a b/c?d#e', 'ünïcodé/✓', 'a+b=c&d', '../up', '']) {
    const minted = cardsRunAddress(id)
    expect(minted.startsWith('dsh-resource://cards/run/')).toBe(true)
    expect(decodeURIComponent(minted.slice('dsh-resource://cards/run/'.length))).toBe(id)
  }
})

test('THE PURE MINT: same id, same address — no state, no counter, no clock', () => {
  expect(cardsRunAddress('r1')).toBe(cardsRunAddress('r1'))
  expect(cardsRunAddress('r1')).not.toBe(cardsRunAddress('r2'))
})
