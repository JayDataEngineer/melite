// host.spec — the null host marker (the card-base law): the row's
// node face registers NOTHING; apply runs against a stub ctx and
// touches nothing.
import { expect, it } from 'vitest'
import { apply, inject, name } from '../src/host.ts'

it('the host marker names the package and registers nothing', () => {
  expect(name).toBe('@melite/media-preview')
  expect(inject).toEqual([])
  const touched: string[] = []
  apply({
    on: (..._args: unknown[]) => { touched.push('on') },
    effect: () => { touched.push('effect') },
  } as never)
  expect(touched).toEqual([])
})
