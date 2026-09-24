import { expect, test } from 'vitest'

import { defineStageViewRegistration } from '../src/slots.ts'

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
  })
  ;(pending as unknown as () => void)()
  expect(registrations).toEqual([[
    { name: 'cards.stage.view', key: 'motion', inject },
    view,
  ]])
  const descriptor = registrations[0]?.[0] as { inject: () => Injected }
  expect(descriptor.inject()).toEqual({ value: 'injected' })
})
