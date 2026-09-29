import { afterEach, expect, test } from 'vitest'

import { unbindEstateRemote, type EstateNamespaces } from '../src/estate-remote.ts'
import { defineStageViewRegistration } from '../src/slots.ts'

// THE REFLECT-SEAM FAKE: the factory arms its lazy getter over the
// inject-free ctx.get seam, so each spec's ctx carries a small store
// pre-loaded with honest namespace shapes — the same face the real
// apply reads.
function fakeStore(): { get: (name: string) => unknown } {
  const ns: EstateNamespaces = {
    bench: {} as EstateNamespaces['bench'],
    drafts: {} as EstateNamespaces['drafts'],
    runs: {} as EstateNamespaces['runs'],
    media: {} as EstateNamespaces['media'],
  }
  return { get: (name: string): unknown => ({ 'remote.bench': ns.bench, 'remote.drafts': ns.drafts, 'remote.runs': ns.runs, 'remote.media': ns.media })[name] }
}

afterEach(unbindEstateRemote)

test('defineStageViewRegistration injects and registers the keyed view', () => {
  const view = (): null => null
  const apply = defineStageViewRegistration('motion', view)
  const registrations: unknown[][] = []
  let pending: (() => void) | null = null
  apply({
    slots: {
      inject: (seam, callback) => {
        expect(seam).toBe('cards.stage.view')
        pending = callback
      },
      register: (...args: unknown[]) => registrations.push(args),
    },
    get: fakeStore().get,
  })
  expect(pending).not.toBeNull()
  ;(pending as unknown as () => void)()
  expect(registrations).toEqual([[{ name: 'cards.stage.view', key: 'motion' }, view]])
})

test('defineStageViewRegistration carries registration-injected values', () => {
  type Injected = { value: string }
  const view = (_props: Injected): null => null
  const inject = (): Injected => ({ value: 'injected' })
  const apply = defineStageViewRegistration('motion', view, inject)
  const registrations: unknown[][] = []
  let pending: (() => void) | null = null
  apply({
    slots: {
      inject: (_seam, callback) => { pending = callback },
      register: (...args: unknown[]) => registrations.push(args),
    },
    get: fakeStore().get,
  })
  ;(pending as unknown as () => void)()
  expect(registrations).toEqual([[
    { name: 'cards.stage.view', key: 'motion', inject },
    view,
  ]])
  const descriptor = registrations[0]?.[0] as { inject: () => Injected }
  expect(descriptor.inject()).toEqual({ value: 'injected' })
})
