// compose-smoke.e2e.ts — THE COMPOSE-DOOR RECIPE LAW (the probe
// that decided the dropdown's shape, 2026-09-18): the door REFUSES
// an undeclared `recipe` param ("admission is the declared surface")
// — therefore the recipe select's selection can never ride a
// persisted key; it DERIVES from the held stamp (activeRecipeId).
// If this ever flips (a card declares its own recipe field), the
// dropdown law revisits — this wall names the day.
//
// THE REFUSAL-ORDER LAW (roadmap §10's e2e debt, pinned 2026-09-21):
// admission is a BODY-SHAPE question (knowable without any weights)
// and precedes the lane-presence ENVIRONMENT question — the wall is
// box-independent, holding identically on boxes with and without
// the family's encoders. Before the reorder this wall only held on
// boxes carrying the weights (presence refused first, shadowing the
// /recipe/ voice).
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

it('THE ORDER: a fully-admitted body hears the ENVIRONMENT voice (presence or engine) — never a body-shape refusal', async () => {
  const sandbox = mintSandbox('compose-smoke-order-')
  const ctx = new Context()
  try {
    ;(ctx as never as { queue: unknown }).queue = { core: { runs: new Map() }, stateRoot: join(sandbox.root, 'state') }
    ;(ctx as never as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
    await ctx.plugin(cardRegistryProvider)
    const cards = (ctx as never as { cardRegistry: { phase1Card: Function } }).cardRegistry
    // every key admitted; whatever refuses next is an environment
    // question (weights present → the engine gate; absent → presence)
    await expect(cards.phase1Card({
      model: 'krea-2', prompt: 'a red cube', width: 512, height: 512,
      loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
    }, 'krea-2')).rejects.not.toThrow(/unknown param|declared surface/)
  } finally {
    await ctx.fiber.dispose()
  }
})
