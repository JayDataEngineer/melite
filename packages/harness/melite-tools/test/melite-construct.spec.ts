// melite_construct walls (vitest, estate mocked — no gateway, no
// GPU). Pins THE AUTHOR VERB over the one shared bench:
//   1. BENCH KEY: a valid bench rides the path; anything else is
//      the default bench ("main") — zero ids on the surface.
//   2. READ: GET; missing bench births via ensure then GETs again;
//      other failures refuse as values, never throws.
//   3. VERBS: read ('' defaults to read) | validate (empty refuses,
//      compiles maps ok|valid) | load | patch | add_stage |
//      remove_stage | rewire (from clears when absent) | undo |
//      unknown refuses with the verb vocabulary.
//   4. CAS LAW: the refusal voice carries code + message +
//      current_rev exactly when the remote names one; plain
//      failures ride error_kind remote.
//   5. PRESENTATION: Bench <verb>[ · <stage|card>] card; render
//      refuses loud or names verb → rev.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { meliteConstruct, projectStages } from '../src/tools/melite-construct.ts'
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

function stubRequest(): EstateRequest {
  return (async () => ({})) as unknown as EstateRequest
}

const ROW = { session: 'main', rev: 4, intent: 'make art', stages: [{ id: 's0' }], log: [{ rev: 4 }] }

describe('melite_construct presentCall — the Bench card', () => {
  test('verb + stage ride the title', () => {
    const tool = meliteConstruct(stubRequest())
    const view = tool.presentCall!({ verb: 'patch', stage: 's1' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Bench patch · s1')
    assert.equal(view?.kind, 'execute')
  })

  test('the card falls back when no stage rides', () => {
    const tool = meliteConstruct(stubRequest())
    assert.equal(tool.presentCall!({ verb: 'add_stage', card: 'image-gen' })?.title, 'Bench add_stage · image-gen')
  })

  test('a bare verb renders alone', () => {
    const tool = meliteConstruct(stubRequest())
    assert.equal(tool.presentCall!({ verb: 'read' })?.title, 'Bench read')
  })

  test('junk verbs/stages fall back', () => {
    const tool = meliteConstruct(stubRequest())
    assert.equal(tool.presentCall!({})?.title, 'Bench ?')
    assert.equal(tool.presentCall!(null)?.title, 'Bench ?')
    assert.equal(tool.presentCall!({ verb: 7, stage: '', card: '' })?.title, 'Bench ?')
  })
})

describe('melite_construct — THE PER-CONVERSATION BENCH (stroke 44: the flow belongs to the conversation)', () => {
  test("the agent's own session IS the bench key — ToolExecution.agent.id binds it", async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/s_chat7') return { ...ROW, session: 's_chat7' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, { signal: AbortSignal.timeout(5000), agent: { id: 's_chat7' } }) as Record<string, unknown>
    assert.equal(out.bench, 's_chat7')
    assert.equal(out.ok, true)
    assert.ok(seen.some((r) => r.path === '/v1/bench/s_chat7'))
  })

  test('the conversation WINS over an explicit bench key — cross-conversation state is unreachable, not merely discouraged', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/s_chat7') return { ...ROW, session: 's_chat7' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read', bench: 'main' }, { signal: AbortSignal.timeout(5000), agent: { id: 's_chat7' } }) as Record<string, unknown>
    assert.equal(out.bench, 's_chat7')
  })

  test('no agent (headless/script seats) — the explicit key applies, else main', async () => {
    const a = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/probe') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const outA = await meliteConstruct(a.request).execute({ verb: 'read', bench: 'probe' }, exec()) as Record<string, unknown>
    assert.equal(outA.bench, 'probe')

    const b = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const outB = await meliteConstruct(b.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(outB.bench, 'main')
  })

  test('a junk agent id refuses to leak — sanitized to main', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, { signal: AbortSignal.timeout(5000), agent: { id: 'not a key/..' } }) as Record<string, unknown>
    assert.equal(out.bench, 'main')
    assert.ok(seen.some((r) => r.path === '/v1/bench/main'))
  })
})

describe('melite_construct read — freshness first', () => {
  test('read GETs the bench row', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.verb, 'read')
    assert.equal(out.bench, 'main')
    assert.equal(out.ok, true)
    assert.equal(out.rev, 4)
    assert.equal(out.intent, 'make art')
    assert.deepEqual(out.stages, [{ id: 's0' }])
    assert.deepEqual(out.log, [{ rev: 4 }])
    assert.equal(out.hint, 'mutate with expect_rev=4')
    assert.equal(seen[0]!.timeoutMs, 15_000)
  })

  test('a missing verb reads (the default verb IS read)', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.verb, '')
    assert.equal(out.rev, 4)
  })

  test('a named side-bench rides the path', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/side_1') return { ...ROW, session: 'side_1' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read', bench: 'side_1' }, exec()) as Record<string, unknown>
    assert.equal(out.bench, 'side_1')
    assert.equal(seen[0]!.path, '/v1/bench/side_1')
  })

  test('an invalid bench falls back to the shared bench', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read', bench: 'bad bench!' }, exec()) as Record<string, unknown>
    assert.equal(out.bench, 'main')
    assert.equal(seen[0]!.path, '/v1/bench/main')
  })

  test('a missing bench births via ensure, then reads', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') {
        if (seen.filter((c) => c.method === 'GET').length === 1) {
          throw new RemoteError('bench/not-found', 'no such bench', { session: 'main' })
        }
        return ROW
      }
      if (method === 'POST' && path === '/v1/bench/ensure') return { rev: 0 }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.rev, 4)
    assert.deepEqual(
      seen.map((c) => c.method + ' ' + c.path),
      ['GET /v1/bench/main', 'POST /v1/bench/ensure', 'GET /v1/bench/main'],
    )
    assert.deepEqual(seen[1]!.body, { session: 'main' })
  })

  test('a foreign remote on the read refuses, never births', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') {
        throw new RemoteError('bench/broken', 'seat blew up', { session: 'main' })
      }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error, 'seat blew up')
    assert.equal(out.error_kind, 'bench/broken')
    assert.equal(seen.some((c) => c.path === '/v1/bench/ensure'), false)
  })

  test('a plain failure on the read refuses as a value', async () => {
    const { request } = mockRequest(() => { throw new Error('down') })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.verb, 'read')
    assert.equal(out.bench, 'main')
    assert.equal(out.ok, false)
    assert.equal(out.error, 'down')
    assert.equal(out.error_kind, 'remote')
  })
})

describe('melite_construct validate — compile, no GPU', () => {
  test('an empty bench refuses without touching the door', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET') return { ...ROW, stages: [] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.equal(out.rev, 4)
    assert.equal(out.compiles, false)
    assert.equal(out.note, 'bench is empty')
    assert.equal(seen.some((c) => c.path === '/v1/flows/validate'), false)
  })

  test('stages project onto the wire contract and compile', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'GET') {
        return {
          ...ROW,
          stages: [{ id: 'a', engine: '', params: { p: 1 }, card: 'c', title: 't', result: 1 }],
        }
      }
      if (method === 'POST' && path === '/v1/flows/validate') return { ok: true }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    assert.deepEqual(out.report, { ok: true })
    const validate = seen.find((c) => c.path === '/v1/flows/validate')!
    assert.equal(validate.timeoutMs, 20_000)
    // 2026-09-21: the tool supplies the flow id itself (the bench's
    // intent when legal, else 'bench') — the caller never spells one.
    assert.deepEqual(validate.body, {
      flow_inline: {
        id: 'bench',
        stages: [{ id: 'a', engine: 'comfyui', params: { p: 1 }, inputs: {}, outputs: { default: 'image' } }],
      },
    })
  })

  test('the valid flag compiles too', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET') return { ...ROW, stages: [{ id: 'a' }] }
      if (method === 'POST' && path === '/v1/flows/validate') return { ok: false, valid: true }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
  })

  test('a refused compile rides compiles:false', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET') return { ...ROW, stages: [{ id: 'a' }] }
      if (method === 'POST' && path === '/v1/flows/validate') return { ok: false, valid: false }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, false)
  })
})

describe('melite_construct mutations — every verb', () => {
  test('load replaces stages wholesale', async () => {
    const stages = [{ id: 's1', engine: 'comfyui' }]
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/ensure') return { rev: 5, stages }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'load', stages, intent: 'make art', expect_rev: 4 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 5)
    assert.deepEqual(out.stages, stages)
    assert.deepEqual(seen[0]!.body, { session: 'main', stages, intent: 'make art', expect_rev: 4 })
  })

  test('load defaults to empty stages and drops a blank intent', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/ensure') return { rev: 1, stages: [] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    await tool.execute({ verb: 'load', intent: '', expect_rev: 0 }, exec())
    assert.deepEqual(seen[0]!.body, { session: 'main', stages: [], expect_rev: 0 })
  })

  test('load with overwrite:true confirms wholesale replacement (the overwrite law)', async () => {
    const stages = [{ id: 's1', engine: 'comfyui' }]
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/ensure') return { rev: 6, stages }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'load', stages, intent: 'make art', overwrite: true, expect_rev: 4 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 6)
    assert.deepEqual(out.stages, stages)
    assert.deepEqual(seen[0]!.body, { session: 'main', stages, intent: 'make art', overwrite: true, expect_rev: 4 })
  })

  test('patch merges params onto one stage', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/patch') return { rev: 6, stage: 's1', patched: ['p'] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: { p: 1 }, expect_rev: 5 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 6)
    assert.equal(out.stage, 's1')
    assert.deepEqual(seen[0]!.body, { stage: 's1', params: { p: 1 }, expect_rev: 5 })
  })

  test('add_stage carries the optional wiring', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/add_stage') return { rev: 7, stage: 's2' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'add_stage', card: 'c', engine: 'comfyui', params: { p: 1 }, inputs: { x: 1 }, expect_rev: 6 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.stage, 's2')
    assert.deepEqual(seen[0]!.body, {
      card: 'c', engine: 'comfyui', params: { p: 1 }, inputs: { x: 1 }, expect_rev: 6,
    })
  })

  test('add_stage drops absent wiring', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/add_stage') return { rev: 7, stage: 's2' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    await tool.execute({ verb: 'add_stage', card: 'c', expect_rev: 6 }, exec())
    assert.deepEqual(seen[0]!.body, { card: 'c', expect_rev: 6 })
  })

  test('remove_stage splices one stage out', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/remove_stage') return { rev: 8, stage: 's1' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'remove_stage', stage: 's1', expect_rev: 7 }, exec()) as Record<string, unknown>
    assert.equal(out.stage, 's1')
    assert.deepEqual(seen[0]!.body, { stage: 's1', expect_rev: 7 })
  })

  test('rewire sets a binding', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/rewire') return { rev: 9, stage: 's1', input: 'in' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'rewire', stage: 's1', input: 'in', from: { stage: 's0', output: 'default' }, expect_rev: 8 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.input, 'in')
    assert.deepEqual(seen[0]!.body, {
      stage: 's1', input: 'in', from: { stage: 's0', output: 'default' }, expect_rev: 8,
    })
  })

  test('rewire without from clears the binding', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/rewire') return { rev: 9, stage: 's1', input: 'in' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    await tool.execute({ verb: 'rewire', stage: 's1', input: 'in', expect_rev: 8 }, exec())
    assert.deepEqual(seen[0]!.body, { stage: 's1', input: 'in', expect_rev: 8 })
  })

  test('undo walks the log', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/undo') return { rev: 10, undone: 2, stages: [] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'undo', n: 2, author: 'user', expect_rev: 11 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 10)
    assert.equal(out.undone, 2)
    assert.deepEqual(seen[0]!.body, { n: 2, author: 'user', expect_rev: 11 })
  })

  test('undo defaults ride omitted', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/undo') return { rev: 10, undone: 1, stages: [] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    await tool.execute({ verb: 'undo', expect_rev: 11 }, exec())
    assert.deepEqual(seen[0]!.body, { expect_rev: 11 })
  })

  test('an unknown verb refuses with the vocabulary', async () => {
    const { seen, request } = mockRequest(() => ({ rev: 1 }))
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'bogus' }, exec()) as Record<string, unknown>
    assert.equal(out.verb, 'bogus')
    assert.equal(out.bench, 'main')
    assert.equal(out.ok, false)
    assert.ok(String(out.error).includes('unknown verb'), String(out.error))
    assert.equal(out.error_kind, 'args')
    assert.equal(seen.length, 0)
  })
})

describe('melite_construct refusals — the CAS voice', () => {
  test('a moved bench carries current_rev', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 7, caller held 6', {
        current_rev: 7,
        expect_rev: 6,
      })
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: {}, expect_rev: 6 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.verb, 'patch')
    assert.equal(out.ok, false)
    assert.equal(out.error, 'bench moved: rev is 7, caller held 6')
    assert.equal(out.error_kind, 'bench/cas-conflict')
    assert.equal(out.current_rev, 7)
  })

  test('a remote without a rev carries none', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved')
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'patch', stage: 's1', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'bench moved')
    assert.equal(out.current_rev, undefined)
  })

  test('a non-numeric rev carries none', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved', { current_rev: 'seven' })
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'patch', stage: 's1', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'bench moved')
    assert.equal(out.current_rev, undefined)
  })

  test('a bare throw refuses remote', async () => {
    const { request } = mockRequest(() => { throw 'bare failure' })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error, 'bare failure')
    assert.equal(out.error_kind, 'remote')
  })
})

describe('melite_construct render — refused or revved', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'patch' },
      { verb: 'patch', bench: 'main', ok: false, error: 'bench moved' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_construct REFUSED: bench moved')
  })

  test('a success renders verb → rev', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'read' },
      { verb: 'read', bench: 'main', ok: true, rev: 5 } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench read → rev 5')
  })

  // STROKE 85 (the blind read that wrecked the operator's bench):
  // the render MUST disclose the stages the payload carries — a
  // model that cannot see the bench probes it destructively.
  test('read discloses its stages one line each', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 47,
        intent: 'the working set',
        hint: 'mutate with expect_rev=47',
        stages: [
          { id: 's_1', card: 'image-gen', engine: 'comfyui' },
          { id: 's_2', card: 'image-edit', engine: 'comfyui' },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 47\nstages: 2\n  s_1 — image-gen [comfyui]\n  s_2 — image-edit [comfyui]\nintent: the working set\nhint: mutate with expect_rev=47',
    )
  })

  test('an empty bench says so — never silence', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'load' },
      { verb: 'load', bench: 'main', ok: true, rev: 41, stages: [] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench load → rev 41\nstages: (bench is empty)',
    )
  })

  test('undo/load disclose the restored stages (the probing cure)', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'undo' },
      { verb: 'undo', bench: 'main', ok: true, rev: 48, stages: [{ id: 's_1', card: 'image-gen', engine: 'comfyui' }] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench undo → rev 48\nstages: 1\n  s_1 — image-gen [comfyui]',
    )
  })

  // the placeholder arms: a malformed stage row renders honest '?'
  // cells, never a crash and never silence (the render wall's law)
  test('malformed stage rows render placeholders, never crash', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 3,
        stages: [
          { engine: 'mcp:blender' },
          { id: 's_9', card_id: 'image-gen' },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 3\nstages: 2\n  ? — ? [mcp:blender]\n  s_9 — image-gen [?]',
    )
  })

  test('missing verb/rev fall back to ?', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render({ verb: 'read' }, { bench: 'main', ok: true } as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench ? → rev ?')
  })

  test('an empty error renders the success line', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'read' },
      { verb: 'read', bench: 'main', error: '' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench read → rev ?')
  })
})

describe('projectStages — the wire projection', () => {
  test('non-arrays project to empty', () => {
    assert.deepEqual(projectStages(undefined), [])
    assert.deepEqual(projectStages('x'), [])
    assert.deepEqual(projectStages({}), [])
  })

  test('rows normalize, default, and strip presentation extras', () => {
    assert.deepEqual(
      projectStages([
        {
          id: 'a', engine: 'custom', params: { p: 1 },
          inputs: { x: { stage: 's', output: 'o' } }, outputs: { default: 'video' },
          expected: { x: 'text' },
          card: 'c', provenance: 'p', runStatus: 'r', result: 1, title: 't',
        },
        { id: 'b', engine: 5, params: 'nope', inputs: null, outputs: ['arr'], expected: 'nope' },
        { engine: '', params: null, inputs: ['arr'], outputs: null, expected: null },
        { id: 7, params: ['arr'], inputs: 'nope', outputs: 42, expected: ['arr'] },
        'junk', null, ['nested'], 42,
      ]),
      [
        {
          id: 'a', engine: 'custom', params: { p: 1 },
          inputs: { x: { stage: 's', output: 'o' } }, outputs: { default: 'video' },
          expected: { x: 'text' },
        },
        { id: 'b', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
        { id: '', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
        { id: '7', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
      ],
    )
  })
})

describe('melite_construct — THE INTERFACE LAW (the agent-mode breakdown, 2026-09-13)', () => {
  // The description names the run door the mount owns: the browser
  // face ends the contract AT THE BENCH (the user's Run press is the
  // start door — melite_flow is not the browser agent's verb); the
  // headless face keeps the delegated-operator phrasing. A phantom
  // verb in the description sent the caught session hunting a run
  // door it was never given.
  test('the browser face (default) never names melite_flow', async () => {
    const tool = meliteConstruct((async () => ({})) as unknown as EstateRequest)
    assert.ok(!tool.description.includes('melite_flow'), tool.description)
    assert.ok(tool.description.includes('You compose the flow and edit its state here, live with the user'), tool.description)
    assert.ok(tool.description.includes("runs start at the user's Run press, never yours"), tool.description)
  })

  test('the headless face keeps the delegated-operator phrasing', async () => {
    const tool = meliteConstruct((async () => ({})) as unknown as EstateRequest, { headless: true })
    assert.ok(tool.description.includes('melite_flow runs what is here'), tool.description)
  })
})

describe('melite_construct read — last_run (the lookup the agent cannot do itself)', () => {
  // Runs are born from drafts (the start door refuses cardless
  // runs), so the bench's draft_id joins to the runs list
  // server-side — the read annotates, the agent never hunts.
  const BENCH = {
    session: 'main', rev: 2, intent: 'bench', draft_id: 'bench-main',
    stages: [{ id: 's_0', card: 'image-gen' }, { id: 's_1', card: 'image-edit' }],
    log: [],
  }
  const RUNS = {
    count: 3,
    runs: [
      { run_id: 'run-old-0001', draft_id: 'bench-main', status: 'done', created_at: 100, thumbnail: 't1', artifacts: [{ name: 'a.png' }] },
      { run_id: 'run-new-0002', draft_id: 'bench-main', status: 'done', created_at: 200, thumbnail: 't2', artifacts: [{ name: 'b.png' }] },
      { run_id: 'run-foreign-0003', draft_id: 'bench-other', status: 'done', created_at: 300, thumbnail: 't3', artifacts: [{ name: 'c.png' }] },
    ],
  }

  test('stages carry the draft\'s NEWEST run; foreign drafts never leak', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return RUNS
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out = await meliteConstruct(request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const stages = out.stages as Array<Record<string, unknown>>
    assert.equal(stages.length, 2)
    for (const s of stages) {
      const last = s.last_run as Record<string, unknown>
      assert.equal(last.run_id, 'run-new-0002')
      assert.equal(last.status, 'done')
      assert.deepEqual(last.artifacts, [{ name: 'b.png' }])
    }
  })

  test('a failed runs call degrades to verbatim stages — the read never refuses for garnish', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      throw new Error('runs seat down')
    })
    const out = await meliteConstruct(request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.deepEqual(out.stages, BENCH.stages)
  })

  test('no draft match, no draft_id — stages ride without the key', async () => {
    const norun = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { count: 1, runs: [RUNS.runs[2]] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out = await meliteConstruct(norun.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    for (const s of out.stages as Array<Record<string, unknown>>) {
      assert.ok(!('last_run' in s))
    }
    const nodraft = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out2 = await meliteConstruct(nodraft.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.stages, ROW.stages)
  })
})
