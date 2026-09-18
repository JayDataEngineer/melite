// compose-smoke.e2e.ts — THE COMPOSE-DOOR RECIPE LAW (the probe
// that decided the dropdown's shape, 2026-09-18): the door REFUSES
// an undeclared `recipe` param ("admission is the declared surface")
// — therefore the recipe select's selection can never ride a
// persisted key; it DERIVES from the held stamp (activeRecipeId).
// If this ever flips (a card declares its own recipe field), the
// dropdown law revisits — this wall names the day.
import { expect, it } from 'vitest'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mintSandbox } from '../harness.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'

it('compose door: a durable recipe key is REFUSED — the selection must derive, never persist', async () => {
  const sandbox = mintSandbox('compose-smoke-')
  const ctx = new Context()
  try {
    ;(ctx as never as { queue: unknown }).queue = { core: { runs: new Map() }, stateRoot: join(sandbox.root, 'state') }
    ;(ctx as never as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
    await ctx.plugin(cardRegistryProvider)
    const cards = (ctx as never as { cardRegistry: { phase1Card: Function } }).cardRegistry
    await expect(cards.phase1Card({
      model: 'krea-2', prompt: 'a red cube', width: 512, height: 512,
      recipe: 'turbo_distill',
      loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
    }, 'krea-2')).rejects.toThrow(/recipe/)
  } finally {
    await ctx.fiber.dispose()
  }
})
