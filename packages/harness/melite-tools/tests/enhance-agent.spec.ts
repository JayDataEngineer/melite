// enhance-agent walls (vitest, fake llm seam + the live form-spec
// SSOT — no host, no key, no network). Pins fetchDeclaredFields
// mapping, enhanceOneField routing, and the in-process sweep
// (formSpecArm live: unknown keys refuse, recipe-less models sweep
// ONE generic 'prompt' field). F-1 2026-11-05: fetchDeclaredFields
// rides the in-process formSpecArm — the retired URL lane named a
// path the seat plane never served, so its two URL-spelling arms
// re-rolled to the SSOT + refusal pair.
import "../../../../tests/helpers/boot-models.ts";
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  agenticSweep,
  declaredFieldsFromSpec,
  enhanceOneField,
  fetchDeclaredFields,
  GENERIC_ENHANCE_RECIPE,
  type LlmSeam,
} from '../src/enhance-agent.ts'

const JSON_REPLY = '{"positive":"P","negative":"N"}'

function fakeLlm(): LlmSeam & { seen: Array<{ provider: string; model: string }> } {
  const seen: Array<{ provider: string; model: string }> = []
  const providers = [
    { id: 'deepseek-official', models: ['deepseek-chat'] },
    { id: 'opencode-go', models: ['muse-spark'] },
  ]
  return {
    seen,
    listProviders: () => providers.map((p) => ({ id: p.id })),
    listModels: async (provider: string) =>
      (providers.find((p) => p.id === provider)?.models ?? []).map((id) => ({ id })),
    stream: (o: { provider: string; model: string }) => {
      seen.push({ provider: o.provider, model: o.model })
      async function* gen(): AsyncGenerator<unknown> {
        yield { type: 'text-delta', text: JSON_REPLY }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
      return gen() as AsyncIterable<never>
    },
  } as unknown as LlmSeam & { seen: Array<{ provider: string; model: string }> }
}

const SIG = AbortSignal.timeout(5000)
const DEFAULT = 'opencode-go/muse-spark'

describe('declaredFieldsFromSpec', () => {
  test('enhance_prompts keeps only non-empty strings', () => {
    assert.deepEqual(
      declaredFieldsFromSpec({ enhance_prompts: { a: 'ra', b: '', c: 42, d: null } }),
      { fields: { a: 'ra' }, names: ['a'] },
    )
  })

  test('an array enhance_prompts falls to the singular spell', () => {
    assert.deepEqual(
      declaredFieldsFromSpec({ enhance_prompts: ['ra'], enhance_prompt: 'solo' }),
      { fields: { prompt: 'solo' }, names: ['prompt'] },
    )
  })

  test('null prompts plus an empty singular yields no fields', () => {
    assert.deepEqual(
      declaredFieldsFromSpec({ enhance_prompts: null, enhance_prompt: '' }),
      { fields: {}, names: [] },
    )
  })

  test('a non-object prompts with no singular yields no fields', () => {
    assert.deepEqual(declaredFieldsFromSpec({ enhance_prompts: 'x' }), { fields: {}, names: [] })
    assert.deepEqual(declaredFieldsFromSpec({}), { fields: {}, names: [] })
  })
})

describe('fetchDeclaredFields', () => {
  test('the recipes ride the in-process form-spec SSOT; the mapping is shared', async () => {
    // F-1: the URL lane named /v1/form-spec — a path the seat plane
    // never served; the sweep already read formSpecArm, and this does
    // now too. A recipe-less model maps to NO fields through the ONE
    // declaredFieldsFromSpec spelling.
    const out = await fetchDeclaredFields('tts')
    assert.deepEqual(out, { fields: {}, names: [] })
  })

  test('an unknown model refuses with the sweep\u2019s voice', async () => {
    await assert.rejects(
      () => fetchDeclaredFields('no-such-model'),
      /'no-such-model' does not resolve \(unknown, unoffered, or retired\)/,
    )
  })
})

describe('enhanceOneField', () => {
  test('an explicit llmWant wins over the host default', async () => {
    const llm = fakeLlm()
    const out = await enhanceOneField(
      llm, 'recipe', 'a red boat', 0.5, SIG, 'deepseek-official/deepseek-chat', DEFAULT,
    )
    assert.deepEqual(out, { positive: 'P', negative: 'N', via: 'deepseek-official/deepseek-chat' })
    assert.deepEqual(llm.seen, [{ provider: 'deepseek-official', model: 'deepseek-chat' }])
  })

  test('an absent llmWant serves the host default', async () => {
    const llm = fakeLlm()
    const out = await enhanceOneField(llm, 'recipe', 'a red boat', undefined, SIG, undefined, DEFAULT)
    assert.equal(out.via, DEFAULT)
  })

  test('an empty llmWant serves the host default, never a blind walk', async () => {
    const llm = fakeLlm()
    const out = await enhanceOneField(llm, 'recipe', 'a red boat', undefined, SIG, '', DEFAULT)
    assert.equal(out.via, DEFAULT)
  })
})

describe('agenticSweep (live form-spec SSOT)', () => {
  test('a recipe-less model sweeps ONE generic prompt field', async () => {
    const llm = fakeLlm()
    const out = await agenticSweep({ get: () => undefined }, llm, {
      model: 'tts',
      prompt: 'hello world',
      signal: SIG,
      defaultLlm: DEFAULT,
    })
    assert.equal(out.model, 'tts')
    assert.deepEqual(Object.keys(out.results), ['prompt'])
    assert.deepEqual(out.results['prompt'], { positive: 'P', negative: 'N', via: DEFAULT })
    assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
  })

  test('the generic recipe is the shared fallback spelling', () => {
    assert.ok(GENERIC_ENHANCE_RECIPE.includes('{"positive"'))
  })

  test('an unknown model refuses loud, same body as the HTTP door', async () => {
    const llm = fakeLlm()
    await assert.rejects(
      () => agenticSweep({ get: () => undefined }, llm, {
        model: 'no-such-model',
        prompt: 'hi',
        signal: SIG,
        defaultLlm: DEFAULT,
      }),
      /'no-such-model' does not resolve/,
    )
    assert.deepEqual(llm.seen, [])
  })
})
