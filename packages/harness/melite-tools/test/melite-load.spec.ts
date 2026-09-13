// melite_load walls (vitest, estate mocked — no gateway, no
// network). Pins the thin load face over the load seat:
//   1. ARGS: name is required (empty refuses as a VALUE); the
//      inference_type gate admits exactly card|flow, nothing else.
//   2. WIRE: one GET at /v1/load?name=…&inference_type=… on the
//      20s budget; the gateway bundle rides the value verbatim.
//   3. REFUSALS ride the value (body text > message > 'load
//      failed'), echoing the requested name/inference_type.
//   4. PRESENTATION: Load <name> card; render names the loaded
//      bundle (REFUSED on refusal) and never throws on junk.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { meliteLoad } from '../src/tools/melite-load.ts'
import type { EstateRequest } from '../src/estate.ts'

function mockRequest(handler: (method: string, path: string, body: unknown) => unknown): {
  seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }>;
  request: EstateRequest;
} {
  const seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }> = []
  const request = (async (method, path, body, _signal, timeoutMs) => {
    seen.push({ method: method as string, path: path as string, body, timeoutMs: timeoutMs as number })
    return handler(method as string, path as string, body)
  }) as unknown as EstateRequest
  return { seen, request }
}

function exec(): { signal: AbortSignal } {
  return { signal: AbortSignal.timeout(5000) }
}

describe('melite_load presentCall — the Load card', () => {
  test('names the requested bundle', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const view = tool.presentCall!({ name: 'upscale-tools', inference_type: 'card' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Load upscale-tools')
    assert.equal(view?.kind, 'search')
  })

  test('junk names fall back to ?', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    assert.equal(tool.presentCall!({})?.title, 'Load ?')
    assert.equal(tool.presentCall!({ name: '' })?.title, 'Load ?')
    assert.equal(tool.presentCall!(null)?.title, 'Load ?')
  })
})

describe('melite_load execute — the arg gates', () => {
  test('an empty name refuses as a value (discover it first)', async () => {
    const { seen, request } = mockRequest(() => ({ bundle: {} }))
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: '', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'name is required (discover it first)')
    assert.equal(out.name, '')
    assert.equal(out.inference_type, 'card')
    assert.equal(seen.length, 0)
  })

  test('anything but card|flow refuses as a value', async () => {
    const { seen, request } = mockRequest(() => ({ bundle: {} }))
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'bogus' }, exec()) as Record<string, unknown>
    assert.ok(String(out.error).includes('inference_type must be card|flow'))
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'bogus')
    assert.equal(seen.length, 0)
  })
})

describe('melite_load execute — the load lane', () => {
  test('a card load GETs /v1/load on the 20s budget and returns the bundle', async () => {
    const bundle = { kind: 'card', name: 'my card', skills: [{ id: 's1' }] }
    const { seen, request } = mockRequest(() => ({ name: 'my card', inference_type: 'card', bundle }))
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'my card', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.bundle, bundle)
    assert.equal(out.name, 'my card')
    assert.equal(out.inference_type, 'card')
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.method, 'GET')
    assert.equal(seen[0]!.path, '/v1/load?name=my+card&inference_type=card')
    assert.equal(seen[0]!.body, undefined)
    assert.equal(seen[0]!.timeoutMs, 20_000)
  })

  test('a flow load rides inference_type=flow', async () => {
    const { seen, request } = mockRequest(() => ({ name: 'f', inference_type: 'flow', bundle: { kind: 'flow' } }))
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'f', inference_type: 'flow' }, exec()) as Record<string, unknown>
    assert.equal((out.bundle as { kind: string }).kind, 'flow')
    assert.equal(seen[0]!.path, '/v1/load?name=f&inference_type=flow')
  })
})

describe('melite_load execute — refusals ride the value', () => {
  test('a body-carried refusal wins', async () => {
    const { request } = mockRequest(() => { throw { body: 'seat says no', message: 'wrapped' } })
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'seat says no')
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'card')
  })

  test('an empty body falls back to the message', async () => {
    const { request } = mockRequest(() => { throw { body: '', message: 'door message' } })
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'door message')
  })

  test('a plain Error rides its message', async () => {
    const { request } = mockRequest(() => { throw new Error('boom') })
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'flow' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'boom')
  })

  test('a bare throw rides the default text', async () => {
    const { request } = mockRequest(() => { throw 'bare failure' })
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'load failed')
  })
})

describe('melite_load render — the loaded line', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', error: 'nope' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_load REFUSED: nope')
  })

  test('THE BUNDLE RIDES (params, models, skills, digest, agents — the follow-up call needs them)', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          skills: [{ id: 's1' }],
          model_hints: [{ id: 'music-gen', label: 'MusicGen' }],
          signature: { params_schema: { properties: { prompt: {}, seed: {} }, required: ['prompt'] } },
          digest: 'abc123',
          agents: [{ path: 'AGENT.md', text: 'craft doc' }],
        },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'loaded card c — open with melite_flow\n'
      + 'models: music-gen (MusicGen)\n'
      + 'params: prompt*, seed (* required)\n'
      + 'skills: 1 — read one with skill_read: s1\n'
      + 'digest: abc123 (quote it to skip a reload)\n'
      + 'agents md:\n'
      + 'craft doc',
    )
  })

  test('a bundless value renders the header alone', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — open with melite_flow')
  })

  test('a nullish value still renders the header line', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render({ name: 'c', inference_type: 'card' }, null as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — open with melite_flow')
  })
})
