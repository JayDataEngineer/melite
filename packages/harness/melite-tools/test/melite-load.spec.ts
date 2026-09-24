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

  test('a nullish seat answer echoes the args (never a crash)', async () => {
    const { seen, request } = mockRequest(() => null)
    const tool = meliteLoad(request)
    const out = await tool.execute({ name: 'c', inference_type: 'card' }, exec()) as Record<string, unknown>
    assert.equal(out.name, 'c')
    assert.equal(out.inference_type, 'card')
    assert.equal(out.bundle, undefined)
    assert.equal(seen.length, 1)
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
      'loaded card c — compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press\n'
      + 'weights: 0/1 boarded checkpoints present on this machine (provisioning is the estate\'s business — compose the card)\n'
      + 'params: prompt*, seed (* required)\n'
      + 'skills: 1 — read one with melite_skill_read: s1\n'
      + 'digest: abc123 (quote it to skip a reload)\n'
      + 'agents md:\n'
      + 'craft doc',
    )
  })

  test('THE EDGE CELLS RIDE (label-less hints, junk required rows, ref-fallback skills, the 9-row clamp, stages, signature model)', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const skills = [{ id: 'a' }, { ref: 'r-only' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }, { id: 'h' }]
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: {
          kind: 'card', name: 'c',
          model_hints: [{ id: 'm1' }],
          signature: {
            model: 'fam-x',
            params_schema: { properties: { prompt: {}, seed: {} }, required: ['prompt', 7] },
          },
          stages: [{ id: 's1', card: 'c1' }],
          skills,
          digest: 'abc123',
          agents: [{ path: 'AGENT.md', text: 'craft doc' }],
        },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'loaded card c — compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press\n'
      + 'weights: 0/1 boarded checkpoints present on this machine (provisioning is the estate\'s business — compose the card)\n'
      + 'params: prompt*, seed (* required)\n'
      + 'signature model: fam-x\n'
      + 'stages: s1:c1\n'
      + 'skills: 9 — read one with melite_skill_read: a, r-only, b, c, d, e, f, g …\n'
      + 'digest: abc123 (quote it to skip a reload)\n'
      + 'agents md:\n'
      + 'craft doc',
    )
  })

  test('a null-properties signature renders no params and no model line', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      {
        name: 'c', inference_type: 'card',
        bundle: { kind: 'card', name: 'c', signature: { params_schema: { properties: null } } },
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded card c — compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })

  test('a bundless value renders the header alone', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })

  test('a nullish value still renders the header line', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render({ name: 'c', inference_type: 'card' }, null as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'loaded ? ? — compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press')
  })
})

describe('melite_load render — THE INTERFACE LAW (the agent-mode breakdown, 2026-09-13)', () => {
  // The browser interface registers NO melite_flow (compose-only —
  // the user's Run press is the start door). A load hint naming
  // melite_flow there sends the model hunting a phantom verb until
  // it breaks down (the caught trajectory: load → add_stage lands →
  // no run verb anywhere → flailing into comfy_manage). The hint
  // names the door THIS agent actually has.
  test('the browser face (default) never names melite_flow', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c' } } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(!text.includes('melite_flow'), 'the browser face must not name the headless verb: ' + text)
    assert.ok(text.includes('melite_construct') && text.includes("live in the user's cards tab") && text.includes("user's Run press"), text)
  })

  test('the headless face keeps the execution verb', () => {
    const tool = meliteLoad((async () => ({})) as unknown as EstateRequest, { headless: true })
    const parts = tool.output.render(
      { name: 'c', inference_type: 'card' },
      { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c' } } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(text.startsWith('loaded card c — open with melite_flow'), text)
  })
})

test('THE MODS LINE RIDES (stroke 79 — the agent sees the kinds beside params)', () => {
  const tool = meliteLoad((async () => ({})) as unknown as EstateRequest)
  const parts = tool.output.render(
    { name: 'mask', inference_type: 'card' },
    {
      name: 'mask', inference_type: 'card',
      bundle: {
        kind: 'card', name: 'mask',
        signature: {
          params_schema: { properties: { input_image: {} }, required: ['input_image'] },
          modifiers: [
            { kind: 'sam3', category: 'standalone', fields: ['prompt'] },
            { kind: 'draw', category: 'ordered', fields: ['payload'] },
            null,
          ],
        },
      },
    } as never,
  ) as Array<{ text?: string }>
  const text = parts.map((p) => p?.text ?? '').join('\n')
  assert.ok(text.includes('params: input_image* (* required)'), 'params still ride')
  // THE FAMILY-PACK SEATS (022's self-critique #3): the mods line
  // carries each kind's FIELD names beside the category — the
  // compose grammar the maker had to grep card.ts for.
  assert.ok(text.includes('mods: sam3[] (standalone; fields: prompt), draw[] (ordered; fields: payload)'), 'the kinds + categories + fields ride')
  assert.ok(text.includes('ordered kinds stack in array order, standalone kinds each provide their own output'), 'the stacking law names itself')
  // THE VARIANT SEAT (025's self-critique #4): the lane select
  // rides inside card-mode params — stated, never guessed.
  assert.ok(text.includes('card-mode lane select'), 'the variant seat is stated')
  assert.ok(text.includes("params {variant: 'customvoice'}"), 'the seat shape is spelled')
  // kindless cards stay line-less (never an empty mods line)
  const plain = tool.output.render(
    { name: 'c', inference_type: 'card' },
    { name: 'c', inference_type: 'card', bundle: { kind: 'card', name: 'c', signature: { params_schema: { properties: { p: {} } } } } },
  ) as Array<{ text?: string }>
  assert.ok(!(plain.map((p) => p?.text ?? '').join('\n').includes('mods:')), 'no mods line without kinds')
})
