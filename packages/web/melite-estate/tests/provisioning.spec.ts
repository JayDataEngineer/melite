import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import composition from '../src/provisioning.ts'

function contextWithCards(): Context {
  const ctx = new Context()
  const get = ctx.get.bind(ctx)
  ctx.get = ((name: string) => name === 'cardRegistry'
    ? { defsSync: () => new Map() }
    : get(name)) as typeof ctx.get
  return ctx
}

describe('the provisioning declaration path', () => {
  test('resolves a served model route through its owning declaration', async () => {
    const ctx = contextWithCards()
    try {
      composition.apply(ctx)
      for (const id of ['h3-timeline', 'qwen-img-edit-21-int8', 'krea-2-raw']) {
        const plan = await ctx.provisioning.plan({ kind: 'model', owner: 'family', id })
        expect(plan.ref).toEqual({ kind: 'model', owner: 'family', id })
        expect(plan.items.length).toBeGreaterThan(0)
        expect(plan.items.every((item) => item.kind === 'model' && item.owner === 'family' && item.id === id)).toBe(true)
        if (id === 'krea-2-raw') {
          expect(plan.items.some((item) => item.kind === 'model' && item.name === 'krea2_raw_int8_convrot.safetensors' && item.variant === 'raw' && item.quant === 'int8')).toBe(true)
        }
      }
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
