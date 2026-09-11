// enhance-agent sweep shapes (vitest, formSpecArm scripted — the live
// envelopes carry no recipes yet, so multi-field and single-declared
// sweeps ride a mocked discovery module; the llm seam stays a fake).
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'

const mockState = vi.hoisted(() => ({ spec: null as unknown }))

vi.mock('../src/discovery.ts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/discovery.ts')>()
  return { ...orig, formSpecArm: async () => mockState.spec }
})

import { agenticSweep, type LlmSeam } from '../src/enhance-agent.ts'

const JSON_REPLY = '{"positive":"P","negative":"N"}'

function fakeLlm(): LlmSeam & { calls: number } {
  const providers = [{ id: 'p', models: ['m'] }]
  const seam = {
    calls: 0,
    listProviders: () => providers.map((p) => ({ id: p.id })),
    listModels: async (provider: string) =>
      (providers.find((p) => p.id === provider)?.models ?? []).map((id) => ({ id })),
    stream: () => {
      seam.calls++
      async function* gen(): AsyncGenerator<unknown> {
        yield { type: 'text-delta', text: JSON_REPLY }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
      return gen() as AsyncIterable<never>
    },
  }
  return seam as unknown as LlmSeam & { calls: number }
}

const SIG = AbortSignal.timeout(5000)

describe('agenticSweep field shapes', () => {
  test('declared multi-field models enhance every field sequentially', async () => {
    mockState.spec = { enhance_prompts: { prompt: 'recipe-p', lyrics: 'recipe-l' } }
    const llm = fakeLlm()
    const out = await agenticSweep({ get: () => undefined }, llm, {
      model: 'music3',
      prompt: 'a song',
      signal: SIG,
      defaultLlm: 'p/m',
    })
    assert.equal(out.model, 'music3')
    assert.deepEqual(Object.keys(out.results).sort(), ['lyrics', 'prompt'])
    assert.equal(out.results['prompt']?.via, 'p/m')
    assert.equal(llm.calls, 2)
  })

  test('one declared field rides as-is (no generic overwrite)', async () => {
    mockState.spec = { enhance_prompt: 'solo recipe' }
    const llm = fakeLlm()
    const out = await agenticSweep({ get: () => undefined }, llm, {
      model: 'solo',
      prompt: 'hi',
      temperature: 0.3,
      signal: SIG,
      llmWant: 'p/m',
      defaultLlm: 'elsewhere/nope',
    })
    assert.deepEqual(Object.keys(out.results), ['prompt'])
    assert.equal(out.results['prompt']?.via, 'p/m')
    assert.equal(llm.calls, 1)
  })

  test('empty declarations fall back to the single generic field', async () => {
    mockState.spec = { enhance_prompts: { prompt: null, lyrics: '' } }
    const llm = fakeLlm()
    const out = await agenticSweep({ get: () => undefined }, llm, {
      model: 'bare',
      prompt: 'hi',
      signal: SIG,
      defaultLlm: 'p/m',
    })
    assert.deepEqual(Object.keys(out.results), ['prompt'])
    assert.equal(llm.calls, 1)
  })
})
