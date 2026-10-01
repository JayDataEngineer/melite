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
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { meliteConstruct, projectStages } from '../src/tools/melite-construct.ts'
import type { EstateRequest } from '../src/estate.ts'
import { fakeExec } from './fake-exec.ts'

// The foreign seat's undeclared failure code this wall simulates —
// declared here (type-only, erased at runtime) so the RemoteError seam
// accepts the shape a real seat would throw.
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'bench/broken': { readonly session?: string };
  }
}

function mockRequest(handler: (method: string, path: string, body: unknown) => unknown): {
  seen: Array<{ method: string; path: string; body: unknown; timeoutMs?: number }>;
  request: EstateRequest;
} {
  const seen: Array<{ method: string; path: string; body: unknown; timeoutMs?: number }> = []
  // Contextually typed by the EstateRequest seam — params inherit the
  // transport signature, so no implicit-any and no casts ride.
  const request: EstateRequest = async (method, path, body, _signal, timeoutMs) => {
    seen.push({ method, path, body, timeoutMs })
    return handler(method, path, body)
  }
  return { seen, request }
}

function exec() {
  return fakeExec(AbortSignal.timeout(5000))
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
    const out = await tool.execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 's_chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ verb: 'read', bench: 'main' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 's_chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'not a key/..' } })) as Record<string, unknown>
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
    // The echo carries the documented default by name (T11's residual
    // cured, 2026-10-12): the description says "read (default when
    // absent)", so the echo is 'read', not the old contradicted ''.
    assert.equal(out.verb, 'read')
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
    // card RIDES (the phantom-refusal cure): the kinds pass derives
    // wired-input kinds from the card's flowKinds — the doors admit
    // card (STAGE_KEYS), only provenance/runStatus/result/title strip.
    // THE CARD-PORTS LAW (2026-09-26): outputs stay {} on a card
    // stage (channels derive from the card's own ports at compile —
    // the fabricated image default mis-kinded video/tts cards).
    assert.deepEqual(validate.body, {
      flow_inline: {
        id: 'bench',
        stages: [{ id: 'a', engine: 'comfyui', params: { p: 1 }, inputs: {}, outputs: {}, card: 'c' }],
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

  // THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
  // — the bench wedge left no way out but the wedge).
  test('clear empties the bench in one verb (the demanded clear all)', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/clear') return { rev: 12, cleared: 6 }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'clear', expect_rev: 11 }, exec()) as Record<string, unknown>
    assert.equal(out.cleared, 6)
    assert.equal(out.rev, 12)
    // no stage arg: the verb is the bench itself
    assert.deepEqual(seen[0]!.body, { expect_rev: 11 })
  })

  test('the verb table ADVERTISES clear (an unlisted door is a door the agent never finds)', () => {
    const tool = meliteConstruct(stubRequest())
    const schema = JSON.stringify(tool.parameters ?? {})
    assert.match(schema, /clear/)
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
    // The refusal moved to the schema boundary (the strictness
    // audit's fix 8): the verb is a literal enum now, so
    // validateArgs fires BEFORE execute with the same vocabulary —
    // ToolArgsError instead of the execute-side unknown-verb row.
    const { request } = mockRequest(() => ({ rev: 1 }))
    const tool = meliteConstruct(request)
    await assert.rejects(
      tool.execute({ verb: 'bogus' }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message,
          /"verb" must be one of \["read","load","patch","add_stage","remove_stage","clear","rewire","undo","validate"\]/)
        return true
      },
    )
  })

  test('rewire from-rows and load stage-rows refuse undeclared keys at the wrapper gate (fix 8)', async () => {
    const { request } = mockRequest(() => ({ rev: 1 }))
    const tool = meliteConstruct(request)
    await assert.rejects(
      tool.execute({ verb: 'rewire', stage: 's', input: 'image', from: { stage: 'a', output: 'image', zeta: 1 } }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"from\.zeta" is not a declared property/)
        return true
      },
    )
    await assert.rejects(
      tool.execute({ verb: 'load', stages: [{ id: 's1', boardd: 'x' }], overwrite: true, expect_rev: 1 }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"stages\[0\]\.boardd" is not a declared property/)
        return true
      },
    )
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
      throw new RemoteError('bench/cas-conflict', 'bench moved', undefined as never) // no details at runtime — the carry-none arm
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute({ verb: 'patch', stage: 's1', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'bench moved')

  })

  // THE ONE-RETRY REBASE (the operator's stuck-agent cure, 2026-10-09:
  // "I can't even change models in the cards — it breaks"): the tool
  // face inherits the GUI's withRebase law. A held expect_rev goes
  // stale the moment anything else writes the bench — the browser
  // edits, a concurrent agent, or the caller's own prior patch whose
  // new rev it never folded. On the door's cas-conflict the tool
  // re-reads the fresh rev and re-applies ONCE; the agent's model
  // switch lands instead of stranding on a stale hold.
  test('THE REBASE: a stale expect_rev re-reads the fresh rev and re-applies once — the model switch lands', async () => {
    let posts = 0
    const { seen, request } = mockRequest((method, path, body) => {
      const b = body as Record<string, unknown>
      if (method === 'GET') return { rev: 23, stages: [] }
      posts += 1
      if (posts === 1) {
        // the door's verdict: the bench moved under the caller's hold
        throw new RemoteError('bench/cas-conflict',
          'bench main moved: rev is 23, caller held 21', { current_rev: 23, expect_rev: 21 })
      }
      assert.equal(b['expect_rev'], 23, 'the retry carries the FRESH rev')
      return { rev: 24, stage: b['stage'], patched: true }
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: { model: 'qwen-img-edit-2511' }, expect_rev: 21 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.verb, 'patch')
    assert.equal(out.rev, 24)
    assert.equal(out.stage, 's_0')
    // the sequence: the refused POST (stale 21), the fresh GET, the
    // landing POST (23) — exactly three calls, one retry, no loops
    assert.deepEqual(seen.map((s) => s.method + ' ' + s.path), [
      'POST /v1/bench/main/patch',
      'GET /v1/bench/main',
      'POST /v1/bench/main/patch',
    ])
  })

  test('THE REBASE SPENDS ONE retry: a second cas-conflict surfaces (never loops)', async () => {
    const { seen, request } = mockRequest((method) => {
      if (method === 'GET') return { rev: 23, stages: [] }
      throw new RemoteError('bench/cas-conflict',
        'bench main moved: rev is 99, caller held 23', { current_rev: 99, expect_rev: 23 })
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: {}, expect_rev: 21 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error_kind, 'bench/cas-conflict')
    // TWO posts only: the stale attempt + the single re-applied retry
    assert.equal(seen.filter((s) => s.method === 'POST').length, 2)
  })

  test('a non-numeric rev carries none', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved', { current_rev: 'seven' as unknown as number }) // intentionally mistyped rev: non-numeric carries none (undefined below)
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

  // THE RECEIPT DETAIL (024's self-critique #5, 2026-09-24): the
  // last_run suffix voices the mint + first artifact — the read
  // answers which .qvoice the draft holds, not just that a run
  // exists. String rows print verbatim; object rows print path;
  // ./ prefixes strip; null stays the honest never-ran line.
  test('read voices last_run mint + first artifact in the suffix', () => {
    const tool = meliteConstruct(stubRequest())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 47,
        stages: [
          { id: 's_1', card: 'qwen3-tts', engine: 'comfyui', last_run: { run_id: 'run-abc', status: 'completed', artifacts: ['output/run-abc/tts/f.flac'], export_name: 'night-keeper', export_path: '/mnt/data/models/audio/voices/night-keeper_17.qvoice' } },
          { id: 's_2', card: 'qwen3-tts', engine: 'comfyui', last_run: { run_id: 'run-def', status: 'completed', artifacts: [{ path: './output/run-def/tts/f.flac' }] } },
          { id: 's_3', card: 'image-gen', engine: 'comfyui', last_run: null },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 47\nstages: 3\n  s_1 — qwen3-tts [comfyui] — last_run run-abc (completed, 1 artifact(s), export \'night-keeper\' @ /mnt/data/models/audio/voices/night-keeper_17.qvoice, output/run-abc/tts/f.flac)\n  s_2 — qwen3-tts [comfyui] — last_run run-def (completed, 1 artifact(s), output/run-def/tts/f.flac)\n  s_3 — image-gen [comfyui] — last_run null (draft has no run in the window)',
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
          expected: { x: 'text' }, card: 'c',
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

  test('a failed runs call degrades to verbatim stages with NO runs key — lookup-failed stays distinct', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      throw new Error('runs seat down')
    })
    const out = await meliteConstruct(request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.deepEqual(out.stages, BENCH.stages)
    assert.ok(!('runs' in out), 'no runs key when the lookup itself died')
  })

  test('no draft match — explicit null + window facts (never-ran vs window-miss reads off the totals)', async () => {
    const norun = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { count: 1372, runs: [RUNS.runs[2]] }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out = await meliteConstruct(norun.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    for (const s of out.stages as Array<Record<string, unknown>>) {
      assert.equal(s.last_run, null)
    }
    // total >> checked: the agent can see the window may have missed.
    assert.deepEqual(out.runs, { checked: 1, total: 1372, matched: 0 })
    const nodraft = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return ROW
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out2 = await meliteConstruct(nodraft.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.stages, ROW.stages)
  })

  test('a hit carries the window facts too', async () => {
    const { request } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return BENCH
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { count: 3, runs: RUNS.runs }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out = await meliteConstruct(request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.runs, { checked: 3, total: 3, matched: 2 })
  })
})

describe('melite_construct projectStages — card rides (the phantom-refusal cure)', () => {
  // The kinds pass derives wired-input kinds from the card's own
  // flowKinds — a projection that stripped `card` manufactured
  // "wired but untyped" refusals on correctly-wired card stages.
  // STAGE_KEYS admit card; only the true extras strip.
  test('card survives, provenance/runStatus/result/title do not', async () => {
    const { projectStages } = await import('../src/tools/melite-construct.ts')
    const out = projectStages([{
      id: 's_1', card: 'image-edit', engine: 'comfyui',
      params: { image1: '$image1' }, inputs: { image1: { stage: 's_0', output: 'default' } },
      provenance: 'x', runStatus: 'done', result: {}, title: 't',
    }])
    assert.equal(out.length, 1)
    assert.equal(out[0]!.card, 'image-edit')
    assert.deepEqual(out[0]!.inputs, { image1: { stage: 's_0', output: 'default' } })
    for (const k of ['provenance', 'runStatus', 'result', 'title']) {
      assert.ok(!(k in out[0]!), k + ' strips')
    }
  })

  test('validate forwards card in flow_inline — derivation can fire', async () => {
    const { request, seen } = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') {
        return {
          session: 'main', rev: 1, intent: 'bench',
          stages: [{
            id: 's_1', card: 'image-edit', engine: 'comfyui',
            params: { image1: '$image1', prompt: 'suit' },
            inputs: { image1: { stage: 's_0', output: 'default' } },
          }],
          log: [],
        }
      }
      if (method === 'POST' && path === '/v1/flows/validate') return { ok: true }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const out = await meliteConstruct(request).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    const post = seen.find((r) => r.path === '/v1/flows/validate')
    const stages = ((post!.body as Record<string, unknown>).flow_inline as Record<string, unknown>).stages as Array<Record<string, unknown>>
    assert.equal(stages[0]!.card, 'image-edit')
  })
})

describe('melite_construct add_stage — expected/outputs ride (the load workaround, retired)', () => {
  // The door admits expected + outputs (ADD_KEYS) but the verb
  // dropped them — chained benches had to route through load to
  // hand-type kinds. Stated keys forward; absent keys stay absent.
  test('stated expected/outputs forward verbatim', async () => {
    const { seen, request } = mockRequest((method, path) => {
      if (method === 'POST' && path === '/v1/bench/main/add_stage') return { rev: 7, stage: 's2' }
      throw new Error('unmocked ' + method + ' ' + path)
    })
    const tool = meliteConstruct(request)
    const out = await tool.execute(
      {
        verb: 'add_stage', card: 'c', expect_rev: 6,
        params: { p: 1 }, inputs: { x: { stage: 's_0', output: 'default' } },
        expected: { x: 'image' }, outputs: { default: 'image' },
      },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.stage, 's2')
    assert.deepEqual(seen[0]!.body, {
      card: 'c', params: { p: 1 }, inputs: { x: { stage: 's_0', output: 'default' } },
      expected: { x: 'image' }, outputs: { default: 'image' }, expect_rev: 6,
    })
  })

  test('stated non-records refuse LOUD at the arg gate — never accept-and-ignore to the bench', async () => {
    const { request } = mockRequest(() => {
      throw new Error('must not reach the bench')
    })
    const tool = meliteConstruct(request)
    // type:object in the schema refuses null/[] before execute —
    // junk the bench's isRecord would shed silently never travels.
    await assert.rejects(
      tool.execute(
        { verb: 'add_stage', card: 'c', expect_rev: 6, expected: null, outputs: [] },
        exec(),
      ),
      (e: unknown) => e instanceof Error && /must be an object/.test(e.message),
    )
  })
})

// ── THE ARRAY WIRE GUARD (P2, ROADMAP §36.4) — commission 034's
// forensic receipts: arrays under free-form params corrupt on the
// wire (`{item:[…]}` non-empty, `""` empty). The tool-boundary
// unwrap runs BEFORE any request: the bench stores clean.
describe('melite_construct execute — the array wire guard', () => {
  test('THE RECEIPT: add_stage params carrying {item:[…]} POST unwrapped', async () => {
    const { seen, request } = mockRequest((_m, _p, _b) => ({}))
    const tool = meliteConstruct(request)
    const r = (await tool.execute(
      {
        verb: 'add_stage', card: 'h3-timeline', expect_rev: 3,
        params: { ref_images: { item: ['/a.png'] }, prompt: 'x' },
      },
      exec(),
    )) as Record<string, unknown>
    assert.equal(r.ok, true)
    const add = seen.find((s) => s.path.endsWith('/add_stage'))
    assert.ok(add !== undefined, 'the add_stage request fired')
    assert.deepEqual(
      (add.body as { params: Record<string, unknown> }).params.ref_images,
      ['/a.png'],
      'the wrapped array reached the estate UNWRAPPED',
    )
    assert.equal((add.body as { params: Record<string, unknown> }).params.prompt, 'x')
  })

  test('load stages[].params unwrap at depth; the "" arm stays for the card seat', async () => {
    const { seen, request } = mockRequest((_m, _p, _b) => ({ rev: 5, stages: [] }))
    const tool = meliteConstruct(request)
    await tool.execute(
      {
        verb: 'load', expect_rev: 4,
        stages: [{ id: 's0', card: 'h3-timeline', params: { calls: { item: [{ text: 'hi' }] } } }],
      },
      exec(),
    )
    const ensure = seen.find((s) => s.path === '/v1/bench/ensure')
    assert.ok(ensure !== undefined)
    const row = (ensure.body as { stages: Array<{ params: Record<string, unknown> }> }).stages[0]
    assert.deepEqual(row.params.calls, [{ text: 'hi' }])
  })

  test('FROZEN wire args never throw and still unwrap (the 035 freeze receipt: Cannot assign to read only property params)', async () => {
    const { seen, request } = mockRequest((_m, _p, _b) => ({}))
    const tool = meliteConstruct(request)
    // the wire may deliver the args object read-only — the rebind
    // law walks a copy and never writes to the caller's object
    const frozen = Object.freeze({ verb: 'add_stage', card: 'c', expect_rev: 1, params: { tags: { item: ['a'] } } })
    let threw: unknown = null
    try { await tool.execute(frozen, exec()) } catch (e) { threw = e }
    assert.equal(threw, null)
    const add = seen.find((s) => s.path.endsWith('/add_stage'))
    assert.deepEqual((add!.body as { params: Record<string, unknown> }).params.tags, ['a'])
  })

  test('a genuine object with an item key never unwraps (two keys = not the wire shape)', async () => {
    const { seen, request } = mockRequest((_m, _p, _b) => ({}))
    const tool = meliteConstruct(request)
    await tool.execute(
      { verb: 'add_stage', card: 'c', expect_rev: 1, params: { meta: { item: 'label', x: 1 } } },
      exec(),
    )
    const add = seen.find((s) => s.path.endsWith('/add_stage'))
    assert.deepEqual(
      (add!.body as { params: Record<string, unknown> }).params.meta,
      { item: 'label', x: 1 },
    )
  })
})

describe("add_stage — the empty-stage drop (035 attempt-14 Probe-A strand)", () => {
  test("a shared-schema stage:'' rides dropped (never the full refusal)", async () => {
    const seen = mockRequest((method, path, body) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, stages: [] }
      if (path.endsWith('/add_stage')) return { rev: 2, stage: 's_0' }
      return undefined
    })
    const tool = meliteConstruct(seen.request)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', stage: '', params: { prompt: 'x' }, expect_rev: 1 }, exec()) as Record<string, unknown>
    assert.equal(out['stage'], 's_0')
    const add = seen.seen.find((c) => c.path.endsWith('/add_stage'))
    assert.equal((add!.body as Record<string, unknown>)['stage'], undefined)
  })
  test("a NON-EMPTY stage on add_stage still refuses loud (addressing intent)", async () => {
    const seen = mockRequest(() => undefined)
    const tool = meliteConstruct(seen.request)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', stage: 's_9', params: { prompt: 'x' } }, exec()) as Record<string, unknown>
    assert.match(String(out['error']), /assigns its own stage id/)
  })
});

describe("read — the params summary (035 attempt-15 gap #3)", () => {
  test("stage rows carry model + array shapes for probe verification", async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') {
        return {
          rev: 2, draft_id: 'd1',
          stages: [{ id: 's_0', card: 'h3-timeline', engine: 'comfyui', params: { model: 'h3', ref_images: ['/a.png', '/b.png'], prompt: 'x' } }],
        }
      }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { runs: [], count: 0 }
      return undefined
    })
    const tool = meliteConstruct(seen.request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const row = (out['stages'] as Array<Record<string, unknown>>)[0]!
    assert.equal(row['model'], 'h3')
    assert.deepEqual(row['arrays'], { ref_images: 'array[2]' })
  })
});

describe("read — the params summary guard paths", () => {
  test("a wrapped {item} array is named 'wrapped{item}' (the Probe-B receipt shape)", async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') {
        return {
          rev: 2, draft_id: 'd1',
          stages: [{ id: 's_0', card: 'h3', params: { ref_images: { item: ['/a.png'] } } }],
        }
      }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { runs: [], count: 0 }
      return undefined
    })
    const tool = meliteConstruct(seen.request)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const row = (out['stages'] as Array<Record<string, unknown>>)[0]!
    assert.deepEqual(row['arrays'], { ref_images: 'wrapped{item}' })
  })
})

describe('read enrichment defensive paths', () => {
  test('empty stages and absent draft ids skip the run lookup', async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, stages: [] }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(seen.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [])
    assert.equal(seen.seen.length, 1)
    const second = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, draft_id: '', stages: [{ id: 's' }] }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out2 = await meliteConstruct(second.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.stages, [{ id: 's' }])
    assert.equal(second.seen.length, 1)
  })

  test('malformed run rows and stage rows degrade to explicit null receipts', async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return {
        rev: 1, draft_id: 'd1', stages: [null, 'bad', { id: 's', params: { model: 'm', list: [1], wrapped: { item: [] } } }],
      }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return {
        count: 5, runs: [null, [], { draft_id: 'other' }, { draft_id: 'd1', created_at: 'old' }],
      }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(seen.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.runs, { checked: 4, total: 5, matched: 1 })
    const rows = out.stages as unknown[]
    assert.equal(rows[0], null)
    assert.equal(rows[1], 'bad')
    assert.deepEqual((rows[2] as Record<string, unknown>).arrays, { list: 'array[1]', wrapped: 'wrapped{item}' })
    assert.equal((rows[2] as Record<string, unknown>).model, 'm')
  })

  test('non-array run envelopes and nonnumeric totals use the honest fallback', async () => {
    const badRows = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, draft_id: 'd1', stages: [{ id: 's' }] }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { runs: {}, count: 4 }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(badRows.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [{ id: 's' }])
    assert.equal('runs' in out, false)
    const badTotal = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, draft_id: 'd1', stages: [{ id: 's' }] }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { runs: [], count: 'many' }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out2 = await meliteConstruct(badTotal.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.runs, { checked: 0, total: 0, matched: 0 })
  })

  test('a no-match read preserves malformed stage rows and exercises no-match summaries', async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, draft_id: 'd1', stages: [null, 'bad', { id: 's', params: null }] }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return { runs: [{ draft_id: 'other' }], count: 1 }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(seen.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [null, 'bad', { id: 's', params: null, last_run: null }])
  })

  test('the newest matching run carries export fields and skips malformed stages', async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return {
        rev: 1, draft_id: 'd1', stages: [null, { id: 's', params: { model: 'm' } }],
      }
      if (method === 'GET' && path === '/v1/flows/runs?limit=100') return {
        count: 2, runs: [
          { draft_id: 'd1', run_id: 'old', created_at: 1 },
          { draft_id: 'd1', run_id: 'new', created_at: 2, status: 'done', artifacts: ['a'], export_name: 'voice', export_path: '/voice.qvoice' },
        ],
      }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(seen.request).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const rows = out.stages as unknown[]
    assert.equal(rows[0], null)
    assert.deepEqual((rows[1] as Record<string, unknown>).last_run, {
      run_id: 'new', status: 'done', created_at: 2, artifacts: ['a'], export_name: 'voice', export_path: '/voice.qvoice',
    })
  })
})

describe('construct render defensive paths', () => {
  test('renders sparse stage receipts and run-window facts', () => {
    const tool = meliteConstruct(stubRequest())
    const render = (stages: unknown[], runs: unknown): string => (tool.output.render({}, {
      verb: 'read', rev: 2, stages, runs,
    } as never) as Array<{ text?: string }>).map((part) => part.text ?? '').join('\n')
    const text = render([
      { id: 's', card: 'c', engine: 'e', last_run: { run_id: 'r', status: '', artifacts: [], export_name: '', export_path: '' } },
    ], { checked: 1, total: 3, matched: 0 })
    assert.ok(text.includes('runs window: checked 1, total 3, matched 0'))
    assert.ok(text.includes('last_run r ()'))
    const noArtifacts = render([{ id: 's', last_run: { run_id: 'r' } }], {})
    assert.ok(noArtifacts.includes('last_run r (?)'))
    const nameOnly = render([{ id: 's', last_run: { run_id: 'r', export_name: 'name' } }], {})
    assert.ok(nameOnly.includes("export 'name'"))
    const pathOnly = render([{ id: 's', last_run: { run_id: 'r', export_path: '/p' } }], {})
    assert.ok(pathOnly.includes('export /p'))
    const missingFacts = render([], {})
    assert.ok(missingFacts.includes('checked ?, total ?, matched ?'))
  })

  test('validate accepts a non-string bench intent and supplies the fallback flow id', async () => {
    const seen = mockRequest((method, path) => {
      if (method === 'GET' && path === '/v1/bench/main') return { rev: 1, intent: 7, stages: [{ id: 's' }] }
      if (method === 'POST' && path === '/v1/flows/validate') return { ok: true }
      throw new Error('unexpected ' + method + ' ' + path)
    })
    const out = await meliteConstruct(seen.request).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    const post = seen.seen.find((row) => row.path === '/v1/flows/validate')
    assert.equal((post!.body as { flow_inline: { id: string } }).flow_inline.id, 'bench')
  })
})
