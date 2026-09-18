import { it } from 'vitest'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mintSandbox } from '../harness.ts'
import { cardRegistryProvider } from '../../packages/harness/estate-queue/src/cardsRegistry.ts'

it('compose smoke: a durable recipe key rides the card door', async () => {
  const sandbox = mintSandbox('compose-smoke-')
  const ctx = new Context()
  try {
    ;(ctx as never as { queue: unknown }).queue = { core: { runs: new Map() }, stateRoot: join(sandbox.root, 'state') }
    ;(ctx as never as { draftsRemote: unknown }).draftsRemote = { get: async () => ({}) }
    await ctx.plugin(cardRegistryProvider)
    const cards = (ctx as never as { cardRegistry: { phase1Card: Function, phase2Card: Function } }).cardRegistry
    const p1 = await cards.phase1Card({
      model: 'krea-2', prompt: 'a red cube', width: 512, height: 512,
      recipe: 'turbo_distill',
      loras: [{ id: 'krea2_turbo_lora_rank_64_bf16', strength: 1.0 }],
    }, 'krea-2')
    const p2 = await cards.phase2Card(p1, 'smoke')
    const g = p2.graph as Record<string, { class_type?: string, inputs?: Record<string, unknown> }>
    const lora = Object.values(g).find((r) => r.class_type === 'LoraLoaderModelOnly')
    console.log('RECIPE KEY OK | lora:', lora ? JSON.stringify(lora.inputs).slice(0, 120) : 'none')
  } catch (e) {
    console.log('RECIPE KEY REFUSED:', e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200))
  } finally {
    await ctx.fiber.dispose()
  }
})
