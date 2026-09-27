// enhance-agent walls (vitest, fake llm seam + fake EstateRequest —
// no host, no key, no network). Pins fetchDeclaredFields mapping,
// enhanceOneField routing, and the in-process sweep (formSpecArm
// live: unknown keys refuse, recipe-less models sweep ONE generic
// 'prompt' field).
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
import type { EstateRequest } from '../src/estate.ts'

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

function fakeRequest(spec: unknown): EstateRequest & { seen: string[] } {
  const seen: string[] = []
  const req = (async (_method: string, path: string) => {
    seen.push(path)
    if (spec instanceof Error) throw spec
    return spec
  }) as EstateRequest
  return Object.assign(req, { seen })
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
  test('the request path carries the encoded model; mapping is shared', async () => {
    const req = fakeRequest({ enhance_prompts: { lyrics: 'sing it' } })
    const out = await fetchDeclaredFields(req, 'music model', SIG)
    assert.deepEqual(out, { fields: { lyrics: 'sing it' }, names: ['lyrics'] })
    assert.deepEqual(req.seen, ['/v1/form-spec?model=' + encodeURIComponent('music model')])
  })

  test('a transport failure propagates', async () => {
    const req = fakeRequest(new Error('lane down'))
    await assert.rejects(() => fetchDeclaredFields(req, 'tts', SIG), /lane down/)
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
