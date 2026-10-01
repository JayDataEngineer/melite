// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import { runCompiledGeneration } from '@melite/catalog'

import { apply, inject, name } from '../src/client/index.ts'
import { motionUpstreamStages } from '../src/client/upstream.ts'

describe('motion client adapter', () => {
  test('upstreams are limited to host-declared prior stages', () => {
    const upstream = [
      { id: 'before', title: 'Before', url: '/before.glb' },
      { id: 'after', title: 'After', url: '/after.glb' },
    ]
    expect(motionUpstreamStages({ upstream, priorStageIds: ['before'] }).map((stage) => stage.id))
      .toEqual(['before'])
    expect(motionUpstreamStages({ upstream }).map((stage) => stage.id))
      .toEqual(['before', 'after'])
  })

  test('registration injects the shared compiled-generation runner', () => {
    let pending: (() => void) | null = null
    const registrations: unknown[][] = []
    apply({
      // the reflect-seam face (li-bp: the factory arms its lazy
      // estate bind over ctx.get — the inject-free read cordis
      // documents for services a consumer does not inject)
      slots: {
        inject: (seam: string, callback: () => void) => {
          expect(seam).toBe('cards.stage.view')
          pending = callback
        },
        register: (...args: unknown[]) => registrations.push(args),
      },
      get: (_name: string): unknown => undefined,
    })
    expect(name).toBe('motionStudio')
    expect(inject).toEqual(['slots'])
    expect(pending).not.toBeNull()
    ;(pending as unknown as () => void)()
    expect(registrations).toHaveLength(1)
    const [descriptor] = registrations[0] as [{ name: string; key: string; inject: () => { runCompiledGeneration: typeof runCompiledGeneration } }]
    expect(descriptor).toMatchObject({ name: 'cards.stage.view', key: 'motion' })
    expect(descriptor.inject().runCompiledGeneration).toBe(runCompiledGeneration)
  })
})
