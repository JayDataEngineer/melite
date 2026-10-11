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
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mintSandbox } from '../harness.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'
import { QueueService } from '../../packages/harness/estate-queue/src/service.ts'

it('compose door: a durable recipe key is REFUSED — the selection must derive, never persist', async () => {
  const sandbox = mintSandbox('compose-smoke-')
  const ctx = new Context()
  try {
    // THE REAL QUEUE SEAT (J12 — the 2026-10-11 stale-world cure):
    // the registry provider's inject reads the queue seat; the old
    // plain {core, stateRoot} object seats NOTHING (ctx.cardRegistry
    // stays undefined and phase1Card dies before it can refuse).
    ;(ctx as never as { queue: unknown }).queue = new QueueService(ctx, { stateRoot: join(sandbox.root, 'state') })
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
    ;(ctx as never as { queue: unknown }).queue = new QueueService(ctx, { stateRoot: join(sandbox.root, 'state') })
    ;(ctx as never as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
    await ctx.plugin(cardRegistryProvider)
    const cards = (ctx as never as { cardRegistry: { phase1Card: Function } }).cardRegistry
    // every key admitted; whatever speaks next is an environment
    // question, and BOTH answers are honest (this file's own law:
    // box-independent, never a body-shape refusal): weights absent
    // → a presence refusal; everything present and the engine
    // healthy → a CLEAN COMPOSE. The 2026-10-13 drift cures made
    // the estate box the second case (krea-2's weights + turbo
    // lora enumerate at the engine), and the old `.rejects` pin
    // failed the smoke on exactly the health it was built to
    // prove. The only forbidden outcome stays the body-shape
    // refusal.
    const outcome = await cards.phase1Card({
      model: 'krea-2', prompt: 'a red cube', width: 512, height: 512,
      loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
    }, 'krea-2').then(
      () => ({ refused: false, error: '' }),
      (e: unknown) => ({ refused: true, error: String(e) }),
    )
    if (outcome.refused) {
      assert.ok(!/unknown param|declared surface/.test(outcome.error),
        `the body refused a fully-admitted request on shape: ${outcome.error}`)
    }
  } finally {
    await ctx.fiber.dispose()
  }
})
