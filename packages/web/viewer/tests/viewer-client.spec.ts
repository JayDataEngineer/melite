// viewer-client.spec — the client half claims the default run-card
// view for every composed card (one line per card): the image_gen
// wire tool name lands on tool.call.toolview through viewer-base's
// claimRunCardToolview. Fake client ctx (effect + slots); no shell,
// no DOM.
//
// SEAM NOTE: the spec pins the composition's OWN behavior — which
// tool name, which label, through which claim — with the runCard leaf
// stubbed at its module seam. Importing the real leaf would drag the
// primitives leaf's .css into the node lane (unloadable here; the DOM
// lanes inline it via vitest.config server.deps.inline, unchangeable
// from here). The real claim (slot key, component identity) is pinned
// in viewer-base's runCard.spec.ts; the real row renders there too.
import { expect, it, vi } from 'vitest'

vi.mock('@melite/viewer-base/runCard', async () => {
  const { vi: vitest } = await import('vitest')
  return { claimRunCardToolview: vitest.fn() }
})

import { apply } from '../src/client/index.ts'
import { claimRunCardToolview } from '@melite/viewer-base/runCard'

it('claims the image_gen run-card view with the viewer label', () => {
  const ctx = {
    effect: (fn: () => unknown, _name?: string): unknown => fn(),
    slots: {
      inject: (_key: string, callback: () => unknown): unknown => callback(),
      register: (_options: unknown, _component: unknown): unknown => () => {},
    },
  }
  apply(ctx as never)
  // the composition's line: ctx rides through, name + label pinned.
  // (The effect/inject seam the claim rides inside is captured live
  // and pinned in viewer-base's runCard.spec.ts.)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledTimes(1)
  expect(vi.mocked(claimRunCardToolview)).toHaveBeenCalledWith(
    ctx,
    'image_gen',
    '@melite/viewer: image_gen run-card claim',
  )
})
