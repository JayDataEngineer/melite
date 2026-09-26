// doors.ts walls, live plane (vitest, fake host + fake llm seam +
// real fs fixtures under data/input, cleaned up — no network): apply
// wiring, catalog, enhance one-shot + sweep, uploads, input preview,
// and the /v1 prefix door's discovery + seat lanes.
import { describe, test, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import * as http from 'node:http'
import * as fs from 'node:fs/promises'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import * as os from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, ESTATE_PENDING_GRACE_MS } from '../src/doors.ts'
import { buildSkillIndex, disclosureRoot } from '@melite/estate-queue'
import { resolveRepoRoot } from '@melite/comfyui-cordis'
import type { LlmStreamSeam } from '../src/llm-complete.ts'

const JSON_REPLY = '{"positive":"P","negative":"N"}'
const TAG = 'doors-' + process.pid + '-'

// ── fakes ─────────────────────────────────────────────────────────

interface SeenLlm {
  systems: string[]
  temps: unknown[]
}

function fakeLlm(opts?: { dead?: boolean; explode?: boolean; zai?: boolean }): LlmStreamSeam & SeenLlm {
  const systems: string[] = []
  const temps: unknown[] = []
  const providers = [
    { id: 'opencode-go', models: ['muse-spark', 'muse-spark-1.3-contributor'] },
    { id: 'deepseek-official', models: ['deepseek-chat'] },
    // The operator's vision route (the host default under vision
    // sessions) — the door preference pins ride this pair.
    ...(opts?.zai === true ? [{ id: 'zai', models: ['glm-5v-turbo'] }] : []),
  ]
  return {
    systems,
    temps,
    listProviders: () => {
      if (opts?.explode) throw new Error('llm seam down')
      return providers.map((p) => ({ id: p.id }))
    },
    listModels: async (provider: string) =>
      (providers.find((p) => p.id === provider)?.models ?? []).map((id) => ({ id })),
    stream: (o: { provider: string; model: string; system?: string; temperature?: number }) => {
      if (typeof o.system === 'string') systems.push(o.system)
      temps.push('temperature' in o ? o.temperature : undefined)
      async function* gen(): AsyncGenerator<unknown> {
        if (opts?.dead) {
          yield { type: 'finish', reason: { kind: 'error', failure: { message: 'quota dead', code: 'AUTH' } } }
          return
        }
        yield { type: 'text-delta', text: JSON_REPLY }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
      return gen() as AsyncIterable<never>
    },
  } as unknown as LlmStreamSeam & SeenLlm
}

interface Route {
  kind: string
  path: string
  handler: (req: unknown, res: unknown) => void
}

interface Host {
  routes: Route[]
  labels: string[]
}

function fakeHost(opts?: {
  llm?: LlmStreamSeam
  defaultModel?: unknown
  getThrows?: boolean
  schemas?: Array<{ name: string; description?: string }>
}): { host: unknown; routes: Route[]; labels: string[] } {
  const routes: Route[] = []
  const labels: string[] = []
  const host = {
    effect: (fn: () => void, label?: string) => {
      labels.push(label ?? '')
      fn()
      return () => {}
    },
    llm: opts?.llm ?? fakeLlm(),
    registry: { values: () => [] },
    tools: {
      schemas: () => opts?.schemas ?? [
        { name: 'melite_discover', description: 'discover things' },
        { name: 'melite_flow' },
      ],
    },
    webServer: {
      port: 3080,
      register: (route: Route) => {
        routes.push(route)
        return () => {}
      },
    },
    get: (serviceName: string) => {
      if (opts?.getThrows) throw new Error('no such service')
      if (serviceName === 'agentDefaultModel') return opts?.defaultModel
      return undefined
    },
  }
  return { host, routes, labels }
}

const DEFAULT_MODEL = {
  currentSelection: () => ({ provider: 'opencode-go', model: 'muse-spark' }),
}

function boot(opts?: Parameters<typeof fakeHost>[0]): Host & { host: unknown } {
  const h = fakeHost(opts)
  apply(h.host as never, {})
  return h as Host & { host: unknown }
}

/** boot with a door CONFIG (the preference arm's carrier). */
function bootCfg(config: Record<string, unknown>, opts?: Parameters<typeof fakeHost>[0]): Host {
  const h = fakeHost(opts)
  apply(h.host as never, config)
  return h as Host
}

interface ReqOpts {
  method?: string
  url?: string
  body?: unknown
  raw?: string
  emitError?: string
  emitRawError?: unknown
  junkData?: boolean
}

function fakeReq(opts: ReqOpts = {}): EventEmitter & { method?: string; url?: string; headers: Record<string, string> } {
  const req = new EventEmitter() as EventEmitter & { method?: string; url?: string; headers: Record<string, string> }
  req.headers = {}
  if (opts.method !== undefined) req.method = opts.method
  if (opts.url !== undefined) req.url = opts.url
  process.nextTick(() => {
    if (opts.emitError) {
      req.emit('error', new Error(opts.emitError))
      return
    }
    if (opts.emitRawError !== undefined) {
      req.emit('error', opts.emitRawError)
      return
    }
    if (opts.junkData) req.emit('data')
    if (opts.raw !== undefined) req.emit('data', Buffer.from(opts.raw))
    else if (opts.body !== undefined) req.emit('data', Buffer.from(JSON.stringify(opts.body)))
    req.emit('end')
  })
  return req
}

interface ResHandle {
  res: EventEmitter & {
    writeHead: (s: number, h: unknown) => unknown
    end: (d?: unknown) => void
    writableEnded: boolean
  }
  done: Promise<{ status: number; text: string }>
  heads: () => number
}

function fakeRes(opts?: { writeHeadThrowsOnce?: boolean }): ResHandle {
  let status = 0
  const chunks: Buffer[] = []
  let writeHeads = 0
  let resolve!: (v: { status: number; text: string }) => void
  const done = new Promise<{ status: number; text: string }>((r) => { resolve = r })
  const res = new EventEmitter() as ResHandle['res']
  res.writableEnded = false
  res.writeHead = (s: number) => {
    writeHeads++
    if (opts?.writeHeadThrowsOnce && writeHeads === 1) throw new Error('socket blew up')
    status = s
    return res
  }
  res.end = (d?: unknown) => {
    if (d !== undefined) chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d as Uint8Array))
    res.writableEnded = true
    resolve({ status, text: Buffer.concat(chunks).toString('utf8') })
    res.emit('close')
  }
  return { res, done, heads: () => writeHeads }
}

async function call(
  routes: Route[],
  routePath: string,
  opts: ReqOpts = {},
  resOpts?: Parameters<typeof fakeRes>[0],
): Promise<{ status: number; body: unknown; text: string; req: unknown; res: unknown }> {
  const route = routes.find((r) => r.path === routePath)
  assert.ok(route, 'no route mounted at ' + routePath)
  const req = fakeReq(opts)
  const { res, done } = fakeRes(resOpts)
  route.handler(req, res)
  const { status, text } = await done
  let body: unknown = null
  try {
    body = text.length > 0 ? JSON.parse(text) : null
  } catch {
    body = null
  }
  return { status, body, text, req, res }
}

// fs fixtures live under the estate input dir (the rail's own law);
// every created path is tracked and removed in afterEach.
const created: string[] = []
afterEach(async () => {
  while (created.length > 0) {
    const p = created.pop()!
    await fs.rm(p, { recursive: true, force: true }).catch(() => {})
  }
})

async function inputDir(): Promise<string> {
  const dir = path.join(resolveRepoRoot(), 'data', 'input')
  await fs.mkdir(dir, { recursive: true })
  return dir
}

const SIG = AbortSignal.timeout(5000)
void SIG

// ── apply wiring ──────────────────────────────────────────────────

describe('doors apply', () => {
  test('inject names the web-only plane; six routes mount with labels (the /poser prefix mount died with the no-proxy law, 2026-09-16)', () => {
    assert.deepEqual(inject, ['webServer', 'llm', 'tools'])
    const h = boot({ defaultModel: DEFAULT_MODEL })
    assert.deepEqual(
      h.routes.map((r) => r.kind + ' ' + r.path),
      [
        'exact /melite-tools/catalog',
        'exact /melite-tools/enhance',
        'exact /v1/llm/enhance',
        'exact /v1/uploads',
        'prefix /v1/assets/inputs',
        'prefix /v1',
      ],
    )
    assert.equal(h.labels.length, 6)
    assert.ok(h.labels[0].includes('catalog'))
  })

  test('config defaults when omitted', () => {
    const h = fakeHost({ defaultModel: DEFAULT_MODEL })
    apply(h.host as never)
    assert.equal(h.routes.length, 6)
  })

  test('a staggered child-fiber composition returns typed pending until its seat is active, then preserves missing-seat 502', async () => {
    const ctx = new Context()
    const routes: Route[] = []
    ctx.provide('webServer', {
      port: 0,
      register: (route: Route) => {
        routes.push(route)
        return () => {}
      },
    } as never)
    ctx.provide('llm', fakeLlm() as never)
    ctx.provide('tools', { schemas: () => [] } as never)
    const estateRuns = ctx.plugin({
      name: 'estate-runs',
      inject: ['queue'],
      apply: (child: Context) => {
        child.provide('runs', {
          validate: async () => ({ ok: true }),
        })
      },
    })
    const door = ctx.plugin({ name: 'melite-tools-doors', inject, apply })
    try {
      await door
      await Promise.resolve()
      const pending = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/flows/validate',
        body: {},
      })
      assert.equal(pending.status, 503)
      assert.deepEqual(pending.body, {
        error: 'estate composition is still activating',
        code: 'estate/pending',
        pending: true,
      })
      ctx.provide('queue', {})
      await estateRuns
      const ready = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/flows/validate',
        body: {},
      })
      assert.equal(ready.status, 200)
      const missing = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/manage',
        body: {},
      })
      assert.equal(missing.status, 502)
      assert.match(String((missing.body as { error: string }).error), /no seat on this lane serves/)
    } finally {
      await estateRuns.dispose()
      await door.dispose()
    }
  })

  test('THE PENDING GRACE (the 3088 brick, 2026-09-26): a fiber WEDGED mid-transition past the grace no longer bricks seat doors — the seat probe\'s own voice answers', async () => {
    // The staggered wall above pins the BOOT RACE (pending until the
    // parent provides the dependency). This wall pins the OTHER side
    // of the same gate: a fiber that NEVER settles — the exact shape
    // a failed plugin-tree reload or a hung MCP seat handshake
    // leaves on a live host (live proof: 10 hours of
    // "still activating" on 3088 while every non-seat door served
    // fine). "Still activating" is honest for seconds; past the
    // grace it is a WEDGE, and the honest answer is the seat
    // probe's own voice, never a permanent 503.
    const ctx = new Context()
    const routes: Route[] = []
    ctx.provide('webServer', {
      port: 0,
      register: (route: Route) => {
        routes.push(route)
        return () => {}
      },
    } as never)
    ctx.provide('llm', fakeLlm() as never)
    ctx.provide('tools', { schemas: () => [] } as never)
    const wedged = ctx.plugin({
      name: 'estate-runs',
      inject: ['queue'],
      apply: (child: Context) => {
        child.provide('runs', {
          validate: async () => ({ ok: true }),
        })
      },
    })
    const door = ctx.plugin({ name: 'melite-tools-doors', inject, apply })
    try {
      await door
      await Promise.resolve()
      // inside the grace: the typed pending answer, verbatim
      const inside = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/flows/validate',
        body: {},
      })
      assert.equal(inside.status, 503)
      assert.deepEqual(inside.body, {
        error: 'estate composition is still activating',
        code: 'estate/pending',
        pending: true,
      })
      // past the grace (the 'queue' dependency NEVER lands — the
      // wedge): the gate opens and the seat probe answers instead
      const realNow = Date.now
      try {
        Date.now = (): number => realNow() + ESTATE_PENDING_GRACE_MS + 1_000
        const after = await call(routes, '/v1', {
          method: 'POST',
          url: 'http://localhost/v1/flows/validate',
          body: {},
        })
        assert.equal(after.status, 502)
        assert.match(String((after.body as { error: string }).error), /no seat on this lane serves/)
      } finally {
        Date.now = realNow
      }
      // (The stamp's RESET path — cleared when the state lifts, so a
      // later boot race gets a fresh window — is a two-line
      // assignment on the idle observation; it cannot be pinned in
      // this fixture because the wedge never lifts. The two arms
      // above are the law: pending inside the grace, the seat's own
      // voice past it.)
    } finally {
      await wedged.dispose()
      await door.dispose()
    }
  })
})

// ── catalog ───────────────────────────────────────────────────────

describe('catalog route', () => {
  test('THE GENERIC MCP CARD (2026-09-21, the operator\'s law: "ALWAYS spawn a completely standalone DSH subagent — the configuration is the MCP tools to provide, the inputs, and the prompts"): ONE row id mcp serving the AGENT card face; per-server direct-call specs still serve (the subagent/flow lane); no per-server ROWS', async () => {
    const h = fakeHost({ schemas: [
      { name: 'melite_discover', description: 'discover things' },
      { name: 'mcp__blender__scene_info', description: 'Scene contents' },
      { name: 'mcp__blender__render', description: 'Render the viewport' },
    ] })
    apply(h.host as never)
    // the forms table: ONE generic row serves, covering ITSELF (the
    // bare key 'mcp' — every seated server is a TILE inside the
    // card's MCPs plus-box, never a service row); the per-server
    // rows are GONE and the CLI-era card rows stay retired
    const forms = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/forms' })
    assert.equal(forms.status, 200)
    const rows = forms.body as Record<string, Record<string, unknown>>
    assert.ok(rows['mcp'] !== undefined, 'the ONE generic mcp row serves')
    assert.equal(rows['mcp']!['label'], 'MCP')
    assert.equal(rows['mcp']!['sidebar_key'], '3d')
    assert.equal(rows['mcp']!['plugin'], 'mcp')
    assert.equal(rows['mcp']!['default_service'], 'mcp')
    assert.deepEqual(rows['mcp']!['covers'], ['mcp'])
    assert.equal(rows['mcp:blender'], undefined, 'the per-server row is retired (the servers live ON the card)')
    assert.equal(rows['unity'], undefined, 'unity retired')
    assert.equal(rows['blender'], undefined, 'blender retired')
    assert.equal(rows['blender-shot'], undefined, 'blender-shot retired')
    // the GENERIC form-spec (the bare key the bench stage's card id
    // resolves): the AGENT card face — the spawn's engine, the
    // MCPs/Skills/Inputs plus-boxes with the LIVE server census, and
    // the Task brief (the prompt spot). NO model field (a card field
    // named 'model' is the estate's model key — the boot route serves)
    const generic = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp' })
    assert.equal(generic.status, 200)
    const doc = generic.body as Record<string, unknown>
    assert.equal(doc['form'], 'mcp')
    assert.equal(doc['label'], 'MCP')
    assert.equal(doc['engine'], 'agent')
    assert.deepEqual(doc['families'], [])
    const kinds = ((doc['features'] as { modifiers: Array<Record<string, unknown>> }).modifiers)
    assert.deepEqual(kinds.map((k) => k['param_key']), ['mcps', 'skills', 'inputs'])
    const mcps = kinds[0]!
    const opts = (mcps['fields'] as Array<{ options: Array<{ value: string }> }>)[0]!.options
    assert.deepEqual(opts.map((o) => o.value), ['blender'], 'the MCPs tile census is the LIVE seated servers')
    const schema = JSON.stringify(doc['schema'])
    assert.match(schema, /task/, 'the brief is a schema field (the prompt spot)')
    assert.equal(schema.includes('"model"'), false, 'no model field on the card face (the boot route serves the spawn)')
    assert.deepEqual(doc['enhance_prompts'], { prompt: 'task', lyrics: '' })
    // the Brain dropdown rides the served schema (a field named
    // `model` would be the estate's model key — the face fields it
    // `brain`, blank-first for the seated brain)
    const senv = doc['schema'] as { uid: number; refs: Record<string, any> }
    const sdict = senv.refs[String(senv.uid)]!.dict! as Record<string, number>
    assert.ok(sdict['brain'] !== undefined, 'the card face carries the Brain dropdown')
    assert.equal(sdict['model'], undefined, 'still no model field on the card face')
    const sbrain = senv.refs[String(sdict['brain'])]!
    assert.equal(sbrain.type, 'union')
    assert.deepEqual((sbrain.list as number[]).map((i) => senv.refs[String(i)]!.value),
      ['', 'opencode-go/muse-spark', 'opencode-go/muse-spark-1.3-contributor'])
    // the per-server direct-call form-spec still serves (the subagent
    // and flow-composed rows ride these)
    const spec = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp:blender' })
    assert.equal(spec.status, 200)
    const per = spec.body as Record<string, unknown>
    assert.equal(per['form'], 'mcp:blender')
    assert.equal(per['label'], 'MCP · blender')
    // an UNSEATED instance refuses 404 (the census is the truth)
    const absent = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp:unity' })
    assert.equal(absent.status, 404)
    assert.match(String((absent.body as { error: string }).error), /does not resolve/)
    // TWO seated servers: the MCPs tile census carries BOTH (the
    // dropdown is interchangeable — unity rides beside blender) and
    // the per-server direct-call spec serves for each
    const h2 = fakeHost({ schemas: [
      { name: 'melite_discover', description: 'discover things' },
      { name: 'mcp__blender__scene_info', description: 'Scene contents' },
      { name: 'mcp__unity__manage_scene', description: 'Scene contents' },
    ] })
    apply(h2.host as never)
    const generic2 = await call(h2.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp' })
    const kinds2 = (((generic2.body as Record<string, unknown>)['features']) as { modifiers: Array<Record<string, unknown>> }).modifiers
    const opts2 = ((kinds2[0]!['fields'] as Array<{ options: Array<{ value: string }> }>)[0]!.options)
    assert.deepEqual(opts2.map((o) => o.value), ['blender', 'unity'], 'both seated servers ride the MCPs tile')
    const per2 = await call(h2.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp:unity' })
    assert.equal(per2.status, 200)
    assert.equal((per2.body as Record<string, unknown>)['form'], 'mcp:unity')
  })

  test('NO SEATED SERVERS = no mcp row at all (the census is the truth, never static)', async () => {
    const h = fakeHost({ schemas: [
      { name: 'melite_discover', description: 'discover things' },
    ] })
    apply(h.host as never)
    const forms = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/forms' })
    const rows = forms.body as Record<string, Record<string, unknown>>
    assert.equal(rows['mcp'], undefined)
    assert.equal(rows['mcp:blender'], undefined)
    const spec = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=mcp' })
    assert.equal(spec.status, 404)
  })

  test('serves live tool schemas plus the live llm routes', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/catalog', { method: 'GET', url: '/melite-tools/catalog' })
    assert.equal(status, 200)
    const b = body as { tools: Array<{ name: string; description: string }>; llmRoutes: string[] }
    assert.deepEqual(b.tools, [
      { name: 'melite_discover', description: 'discover things' },
      { name: 'melite_flow', description: '' },
    ])
    assert.ok(b.llmRoutes.includes('opencode-go/muse-spark'))
  })

  test('a broken llm seam degrades to empty routes, never a 500', async () => {
    const h = boot({ llm: fakeLlm({ explode: true }) })
    const { status, body } = await call(h.routes, '/melite-tools/catalog', { method: 'GET', url: '/' })
    assert.equal(status, 200)
    assert.deepEqual((body as { llmRoutes: string[] }).llmRoutes, [])
  })
})

// ── enhance one-shot ──────────────────────────────────────────────

describe('enhance one-shot', () => {
  const ONE = {
    system_prompt: 'structure rules only, no format word',
    prompt: 'a red boat',
    temperature: 0.5,
    llm: 'opencode-go/muse-spark',
  }

  test('the output contract rides every recipe; via echoes the route', async () => {
    const llm = fakeLlm()
    const h = boot({ llm, defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', body: ONE })
    assert.equal(status, 200)
    assert.deepEqual(body, { positive: 'P', negative: 'N', via: 'opencode-go/muse-spark' })
    assert.ok(llm.systems[0].includes('structure rules only'))
    assert.ok(llm.systems[0].includes('Output contract: reply with ONLY a JSON object'))
    assert.deepEqual(llm.temps, [0.5])
  })

  test('absent llm serves the door preference over the host default; non-number temperature drops', async () => {
    const llm = fakeLlm()
    const h = boot({ llm, defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p', temperature: 'hot' },
    })
    assert.equal(status, 200)
    assert.equal((body as { via: string }).via, 'opencode-go/muse-spark-1.3-contributor')
    assert.deepEqual(llm.temps, [undefined])
  })

  // ── the CARD PREFERENCE ARM (operator order: "muse-spark-1.3-
  //    contributor i want to use over glm-5v-turbo") — the door
  //    config's ordered candidate, between the explicit wire and the
  //    host default ─────────────────────────────────────────────────
  test('unset config rides the operator default: muse-spark-1.3-contributor over the glm-5v host default', async () => {
    const VISION_DEFAULT = { currentSelection: () => ({ provider: 'zai', model: 'glm-5v-turbo' }) }
    const h = bootCfg({}, { llm: fakeLlm({ zai: true }), defaultModel: VISION_DEFAULT })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST', url: '/', body: { system_prompt: 's', prompt: 'p' },
    })
    assert.equal(status, 200)
    assert.equal((body as { via: string }).via, 'opencode-go/muse-spark-1.3-contributor')
  })

  test('an explicit empty string DISABLES the arm — the host default serves', async () => {
    const VISION_DEFAULT = { currentSelection: () => ({ provider: 'zai', model: 'glm-5v-turbo' }) }
    const h = bootCfg({ enhancePreference: '' }, { llm: fakeLlm({ zai: true }), defaultModel: VISION_DEFAULT })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST', url: '/', body: { system_prompt: 's', prompt: 'p' },
    })
    assert.equal(status, 200)
    assert.equal((body as { via: string }).via, 'zai/glm-5v-turbo')
  })

  test('a named preference overrides the operator default; a stale one skips to the host default', async () => {
    const VISION_DEFAULT = { currentSelection: () => ({ provider: 'zai', model: 'glm-5v-turbo' }) }
    const named = bootCfg({ enhancePreference: 'deepseek-official/deepseek-chat' }, { llm: fakeLlm({ zai: true }), defaultModel: VISION_DEFAULT })
    const n = await call(named.routes, '/melite-tools/enhance', { method: 'POST', url: '/', body: { system_prompt: 's', prompt: 'p' } })
    assert.equal((n.body as { via: string }).via, 'deepseek-official/deepseek-chat')
    const stale = bootCfg({ enhancePreference: 'gone/nothing' }, { llm: fakeLlm({ zai: true }), defaultModel: VISION_DEFAULT })
    const s = await call(stale.routes, '/melite-tools/enhance', { method: 'POST', url: '/', body: { system_prompt: 's', prompt: 'p' } })
    assert.equal((s.body as { via: string }).via, 'zai/glm-5v-turbo')
  })

  test('a non-string llm is ignored like an absent one', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const { status } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p', llm: 42 },
    })
    assert.equal(status, 200)
  })

  test('junk data chunks do not disturb the body read', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const { status } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: ONE,
      junkData: true,
    })
    assert.equal(status, 200)
  })

  test('non-JSON bodies refuse with the shape; missing prompts refuse', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const bad = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', raw: '{nope' })
    assert.equal(bad.status, 400)
    assert.ok(String((bad.body as { error: string }).error).includes('body must be JSON'))
    for (const body of [{ system_prompt: 's' }, { system_prompt: 's', prompt: '' }]) {
      const r = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', body })
      assert.equal(r.status, 400)
      assert.ok(String((r.body as { error: string }).error).includes('prompt is a required string'))
    }
  })

  test('missing recipes refuse naming the required form', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    for (const body of [{ prompt: 'p' }, { prompt: 'p', system_prompt: '' }, { prompt: 'p', system_prompt: 7 }]) {
      const r = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', body })
      assert.equal(r.status, 400)
      assert.ok(String((r.body as { error: string }).error).includes('system_prompt'))
    }
  })

  test('a null-JSON body refuses like a missing prompt', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', raw: 'null' })
    assert.equal(r.status, 400)
  })

  test('an unknown explicit llm is a 400 naming the live routes', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p', llm: 'nope/nothing' },
    })
    assert.equal(r.status, 400)
    assert.ok(String((r.body as { error: string }).error).includes('unknown llm route'))
  })

  test('a stale host default is a 502 naming the live routes (preference disabled)', async () => {
    const h = bootCfg({ enhancePreference: '' }, { defaultModel: { currentSelection: () => ({ provider: 'gone', model: 'model' }) } })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p' },
    })
    assert.equal(r.status, 502)
    assert.ok(String((r.body as { error: string }).error).includes('unknown llm route "gone/model"'))
  })

  test('a dead route fails loud as a 502 naming route + cause', async () => {
    const h = boot({ llm: fakeLlm({ dead: true }), defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p' },
    })
    assert.equal(r.status, 502)
    assert.ok(String((r.body as { error: string }).error).includes('quota dead'))
  })

  test('no llm and no host default is a 502, never a walk (preference disabled)', async () => {
    for (const opts of [{ getThrows: true }, { defaultModel: null }, { defaultModel: {} },
      { defaultModel: { currentSelection: () => ({ provider: 'x', model: 7 }) } },
      { defaultModel: { currentSelection: () => null } }]) {
      const h = bootCfg({ enhancePreference: '' }, opts as Parameters<typeof fakeHost>[0])
      const r = await call(h.routes, '/melite-tools/enhance', {
        method: 'POST',
        url: '/',
        body: { system_prompt: 's', prompt: 'p' },
      })
      assert.equal(r.status, 502)
      assert.ok(String((r.body as { error: string }).error).includes('no llm named'))
    }
  })

  test('a non-Error thrown on the wire path rides the 502 verbatim', async () => {
    const base = fakeLlm()
    const llm = {
      ...base,
      stream: () => {
        throw 'wire snapped'
      },
    } as unknown as LlmStreamSeam
    const h = boot({ llm, defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p', llm: 'opencode-go/muse-spark' },
    })
    assert.equal(r.status, 502)
    assert.ok(String((r.body as { error: string }).error).includes('wire snapped'))
  })

  test('a body read failure is a 400, and the alias mount serves identically', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', emitError: 'socket reset' })
    assert.equal(r.status, 400)
    assert.ok(String((r.body as { error: string }).error).includes('body read failed'))
    const a = await call(h.routes, '/v1/llm/enhance', { method: 'POST', url: '/', body: ONE })
    assert.equal(a.status, 200)
    assert.equal((a.body as { via: string }).via, 'opencode-go/muse-spark')
  })

  test('a non-Error body read failure rides the 400 verbatim', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', { method: 'POST', url: '/', emitRawError: 'wire snapped' })
    assert.equal(r.status, 400)
    assert.ok(String((r.body as { error: string }).error).includes('body read failed: wire snapped'))
  })

  test('the single-response guard survives a socket that dies mid-write', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const route = h.routes.find((r) => r.path === '/melite-tools/enhance')!
    const req = fakeReq({ method: 'POST', url: '/', body: ONE })
    const { res, done, heads } = fakeRes({ writeHeadThrowsOnce: true })
    route.handler(req, res)
    // The 200 write dies; the guard swallows the 502 fallback instead
    // of writing twice — so no response ever completes.
    const winner = await Promise.race([
      done.then(() => 'responded'),
      new Promise((r) => setTimeout(() => r('unfinished'), 200)),
    ])
    assert.equal(winner, 'unfinished')
    assert.equal(heads(), 1)
  })
})

// ── enhance sweep ─────────────────────────────────────────────────

describe('enhance sweep', () => {
  test('a recipe-less model sweeps ONE generic field through the door preference', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: 'tts', prompt: 'hello' },
    })
    assert.equal(status, 200)
    const b = body as { model: string; results: Record<string, { via: string }> }
    assert.equal(b.model, 'tts')
    assert.deepEqual(Object.keys(b.results), ['prompt'])
    // the door preference serves over the host default (the arm's law)
    assert.equal(b.results['prompt']!.via, 'opencode-go/muse-spark-1.3-contributor')
  })

  test('an explicit llm rides the sweep legs', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: 'tts', prompt: 'hello', llm: 'deepseek-official/deepseek-chat' },
    })
    assert.equal(status, 200)
    const b = body as { results: Record<string, { via: string }> }
    assert.equal(b.results['prompt']!.via, 'deepseek-official/deepseek-chat')
  })

  test('an unknown sweep model is a 502', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: 'nope', prompt: 'hi' },
    })
    assert.equal(r.status, 502)
    assert.ok(String((r.body as { error: string }).error).includes('does not resolve'))
  })

  test('an empty-string model falls back to the one-shot form', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: '', system_prompt: 's', prompt: 'p' },
    })
    assert.equal(r.status, 200)
  })

  test('a sweep with no llm anywhere is a 502, never a walk (preference disabled)', async () => {
    const h = bootCfg({ enhancePreference: '' }, {})
    const r = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: 'tts', prompt: 'hi' },
    })
    assert.equal(r.status, 502)
    assert.ok(String((r.body as { error: string }).error).includes('no llm named'))
  })

  test('caller close + abort fuse the sweep signal without failing the press', async () => {
    const h = boot({ defaultModel: DEFAULT_MODEL })
    const out = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { model: 'tts', prompt: 'hi' },
    })
    assert.equal(out.status, 200)
    const req = out.req as EventEmitter
    req.emit('close')
    req.emit('aborted')
  })
})

// ── uploads rail + input preview ──────────────────────────────────

describe('uploads rail', () => {
  const PNG = 'data:image/png;base64,' + Buffer.from([137, 80, 78, 71]).toString('base64')

  test('a png upload lands in data/input and answers its estate path', async () => {
    const h = boot({})
    const dir = await inputDir()
    const file = path.join(dir, TAG + 'up.png')
    created.push(file)
    const { status, body } = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/v1/uploads',
      body: { filename: TAG + 'up.png', data: PNG },
    })
    assert.equal(status, 200)
    assert.deepEqual(body, { path: 'data/input/' + TAG + 'up.png' })
    assert.deepEqual(await fs.readFile(file), Buffer.from([137, 80, 78, 71]))
  })

  test('non-JSON bodies refuse; missing fields refuse', async () => {
    const h = boot({})
    const bad = await call(h.routes, '/v1/uploads', { method: 'POST', url: '/', raw: '{nope' })
    assert.equal(bad.status, 400)
    for (const body of [{}, { filename: 'a.png' }, { data: PNG }, { filename: '', data: '' }]) {
      const r = await call(h.routes, '/v1/uploads', { method: 'POST', url: '/', body })
      assert.equal(r.status, 400)
      assert.ok(String((r.body as { error: string }).error).includes('filename + data are required'))
    }
  })

  test('a null-JSON body refuses like missing fields', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1/uploads', { method: 'POST', url: '/', raw: 'null' })
    assert.equal(r.status, 400)
  })

  test('bad filenames refuse (dots-only, separators)', async () => {
    const h = boot({})
    for (const filename of ['..', '.', 'a/b.png', 'a\\b.png']) {
      const r = await call(h.routes, '/v1/uploads', {
        method: 'POST',
        url: '/',
        body: { filename, data: PNG },
      })
      assert.equal(r.status, 400)
      assert.ok(String((r.body as { error: string }).error).includes('bad filename'))
    }
  })

  test('non-image payloads refuse (gif, raw text)', async () => {
    const h = boot({})
    for (const data of ['data:image/gif;base64,AAAA', 'hello', PNG.replace('image/png', 'image/PNG')]) {
      const r = await call(h.routes, '/v1/uploads', {
        method: 'POST',
        url: '/',
        body: { filename: TAG + 'x.png', data },
      })
      assert.equal(r.status, 400)
      assert.ok(String((r.body as { error: string }).error).includes('only png / jpeg / webp'))
    }
  })

  test('THE MESH ARM (primitive ③): glb uploads ride the door — named mime or extension-paired octet-stream; extension-less octet refuses', async () => {
    const h = boot({})
    const dir = await inputDir()
    const bytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 1, 2]) // 'glTF' magic
    const file = path.join(dir, TAG + 'donor.glb')
    created.push(file)
    // the named mime — model/gltf-binary
    const ok1 = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/v1/uploads',
      body: { filename: TAG + 'donor.glb', data: 'data:model/gltf-binary;base64,' + bytes.toString('base64') },
    })
    assert.equal(ok1.status, 200)
    assert.deepEqual((ok1.body as { path: string }).path, 'data/input/' + TAG + 'donor.glb')
    assert.deepEqual(await fs.readFile(file), bytes)
    const ok2 = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/',
      body: { filename: TAG + 'donor2.glb', data: 'data:application/octet-stream;base64,' + bytes.toString('base64') },
    })
    assert.equal(ok2.status, 200)
    created.push(path.join(dir, TAG + 'donor2.glb'))
    const ok3 = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/',
      body: { filename: TAG + 'donor3.gltf', data: 'data:model/gltf+json;base64,' + Buffer.from('{"asset":{}}').toString('base64') },
    })
    assert.equal(ok3.status, 200)
    created.push(path.join(dir, TAG + 'donor3.gltf'))
    // octet-stream WITHOUT the glb name stays refused — the whitelist
    // never opens to every binary
    const bad = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/',
      body: { filename: TAG + 'x.png', data: 'data:application/octet-stream;base64,' + bytes.toString('base64') },
    })
    assert.equal(bad.status, 400)
    assert.ok(String((bad.body as { error: string }).error).includes('only png / jpeg / webp / glb / gltf'))
  })

  test('a symlinked escape refuses instead of writing outside', async () => {
    const h = boot({})
    const dir = await inputDir()
    const outside = path.join(os.tmpdir(), TAG + 'outside.bin')
    await fs.writeFile(outside, 'outside')
    created.push(outside)
    const link = path.join(dir, TAG + 'evil.png')
    await fs.symlink(outside, link)
    created.push(link)
    const r = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/',
      body: { filename: TAG + 'evil.png', data: PNG },
    })
    assert.equal(r.status, 400)
    assert.ok(String((r.body as { error: string }).error).includes('escapes the input dir'))
    assert.equal(await fs.readFile(outside, 'utf8'), 'outside')
  })

  test('an unwritable target surfaces the 500', async () => {
    const h = boot({})
    const dir = await inputDir()
    const sub = path.join(dir, TAG + 'dir.png')
    await fs.mkdir(sub, { recursive: true })
    created.push(sub)
    const r = await call(h.routes, '/v1/uploads', {
      method: 'POST',
      url: '/',
      body: { filename: TAG + 'dir.png', data: PNG },
    })
    assert.equal(r.status, 500)
    assert.ok(String((r.body as { error: string }).error).includes('uploads:'))
  })

  test('a body read failure surfaces the 500', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1/uploads', { method: 'POST', url: '/', emitError: 'reset' })
    assert.equal(r.status, 500)
  })
})

describe('input preview', () => {
  test('serves image and mesh bytes with content types', async () => {
    const h = boot({})
    const dir = await inputDir()
    const cases: Array<[string, string]> = [
      [TAG + 'a.png', 'image/png'],
      [TAG + 'b.jpg', 'image/jpeg'],
      [TAG + 'c.jpeg', 'image/jpeg'],
      [TAG + 'd.bmp', 'image/webp'],
      [TAG + 'e.glb', 'model/gltf-binary'],
      [TAG + 'f.gltf', 'model/gltf+json'],
    ]
    for (const [file, type] of cases) {
      const full = path.join(dir, file)
      await fs.writeFile(full, Buffer.from([1, 2, 3]))
      created.push(full)
      const route = h.routes.find((r) => r.path === '/v1/assets/inputs')!
      const req = fakeReq({ method: 'GET', url: '/v1/assets/inputs/' + file })
      const { res, done } = fakeRes()
      let contentType = ''
      const origHead = res.writeHead
      res.writeHead = ((s: number, headers: Record<string, string>) => {
        contentType = headers['content-type'] ?? ''
        return origHead(s, headers)
      }) as typeof res.writeHead
      route.handler(req, res)
      const { status, text } = await done
      assert.equal(status, 200)
      assert.equal(contentType, type)
      assert.equal(text, Buffer.from([1, 2, 3]).toString('utf8'))
    }
  })

  test('bad names refuse; missing files 404', async () => {
    const h = boot({})
    for (const url of ['/v1/assets/inputs/..', '/v1/assets/inputs/a/b']) {
      const r = await call(h.routes, '/v1/assets/inputs', { method: 'GET', url })
      assert.equal(r.status, 400)
    }
    const missing = await call(h.routes, '/v1/assets/inputs', {
      method: 'GET',
      url: '/v1/assets/inputs/' + TAG + 'absent.png',
    })
    assert.equal(missing.status, 404)
  })

  test('a symlinked escape 404s instead of serving outside', async () => {
    const h = boot({})
    const dir = await inputDir()
    const outside = path.join(os.tmpdir(), TAG + 'secret.bin')
    await fs.writeFile(outside, 'secret')
    created.push(outside)
    const link = path.join(dir, TAG + 'sneak.png')
    await fs.symlink(outside, link)
    created.push(link)
    const r = await call(h.routes, '/v1/assets/inputs', {
      method: 'GET',
      url: '/v1/assets/inputs/' + TAG + 'sneak.png',
    })
    assert.equal(r.status, 404)
  })

  test('an unreadable target surfaces the 500; a missing url 400s', async () => {
    const h = boot({})
    const dir = await inputDir()
    const sub = path.join(dir, TAG + 'subdir')
    await fs.mkdir(sub, { recursive: true })
    created.push(sub)
    const r = await call(h.routes, '/v1/assets/inputs', {
      method: 'GET',
      url: '/v1/assets/inputs/' + TAG + 'subdir',
    })
    // A directory passes the name gate; realpath resolves inside, but
    // the read fails — the honest 500.
    assert.equal(r.status, 500)
    const nou = await call(h.routes, '/v1/assets/inputs', { method: 'GET' })
    assert.equal(nou.status, 400)
  })
})

// ── /v1 prefix door ───────────────────────────────────────────────

describe('/v1 prefix discovery arms', () => {
  test('card-tools, model-catalog, forms, kinds serve live', async () => {
    const h = boot({})
    for (const p of ['/v1/card-tools', '/v1/model-catalog', '/v1/forms', '/v1/kinds']) {
      const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost' + p })
      assert.equal(r.status, 200, p)
    }
    const kinds = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/kinds' })
    assert.ok(Array.isArray((kinds.body as { kinds: unknown[] }).kinds))
  })

  test('the GENERIC MCP card is VISIBLE in the catalog fold (ONE row; never a row per server)', async () => {
    // ONE seated server (the tools-seat census) → ONE cards row id
    // 'mcp' in /v1/model-catalog — the picker reads THIS section, so
    // the row must fold here exactly as /v1/forms folds it (a row
    // on forms alone was invisible). The card face is SELF-CONTAINED
    // at the bare key 'mcp' (the agent card doc — the spawn), so
    // the row carries NO families: every seated server is a TILE in
    // the card's MCPs plus-box census, never a picker row or rail.
    const seated = boot({ schemas: [
      { name: 'melite_discover' },
      { name: 'mcp__blender__scene_add_cube', description: 'add a cube' },
      { name: 'mcp__blender__render_frame' },
    ] })
    const r = await call(seated.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/model-catalog' })
    assert.equal(r.status, 200)
    const cards = (r.body as { cards: Record<string, Record<string, unknown>> }).cards
    assert.ok(cards['mcp'] !== undefined, 'the generic MCP card lands ONE cards row')
    const row = cards['mcp']!
    assert.equal(row['label'], 'MCP')
    assert.equal(row['genre'], '3d')
    assert.deepEqual(row['families'], [], 'no families — the add door resolves the bare key (the agent face)')
    assert.equal(cards['mcp:blender'], undefined, 'no per-server cards row (the servers live ON the card)')
    // the same fold on /v1/forms (parity — one census, two doors)
    const f = await call(seated.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/forms' })
    assert.ok(((f.body as Record<string, unknown>)['mcp']) !== undefined)
    // TWO seated servers still fold ONE row — the card's MCPs tile
    // census carries both (never a row or family per server)
    const two = boot({ schemas: [
      { name: 'melite_discover' },
      { name: 'mcp__blender__render_frame' },
      { name: 'mcp__unity__build' },
    ] })
    const r2 = await call(two.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/model-catalog' })
    const cards2 = (r2.body as { cards: Record<string, Record<string, unknown>> }).cards
    assert.deepEqual(cards2['mcp']!['families'], [])
    assert.equal(Object.keys(cards2).filter((k) => k.startsWith('mcp:')).length, 0, 'never a per-server cards row')
    // NO seats → NO row (the census is the truth; the tree goldens
    // stay seat-free)
    const bare = await call(boot({}).routes, '/v1', { method: 'GET', url: 'http://localhost/v1/model-catalog' })
    const bareCards = (bare.body as { cards: Record<string, unknown> }).cards
    assert.equal(bareCards['mcp'], undefined)
    assert.equal(Object.keys(bareCards).filter((k) => k.startsWith('mcp')).length, 0)
  })

  test('form-spec serves a key, 400s without one, 404s unknown', async () => {
    const h = boot({})
    const ok = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=tts' })
    assert.equal(ok.status, 200)
    assert.equal((ok.body as { form: string }).form, 'tts')
    const missing = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec' })
    assert.equal(missing.status, 400)
    const unknown = await call(h.routes, '/v1', {
      method: 'GET',
      url: 'http://localhost/v1/form-spec?model=nope',
    })
    assert.equal(unknown.status, 404)
    assert.ok(String((unknown.body as { error: string }).error).includes("'nope' does not resolve"))
  })

  // THE MOD SYSTEM OWNS MODS (the SubcardGrid law, ported 2026-09-12):
  // a mod kind's param_key rides features.modifiers and mod_schemas
  // ONLY — mod params never join the card schema envelope's own
  // field nodes. ControlNet proves the law by absence (the pack
  // waits unboarded; no envelope, no entry, nothing names it).
  test('form-spec keeps mod param_keys off the card fields (the mod system owns mods)', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=image-gen' })
    assert.equal(r.status, 200)
    const body = r.body as {
      schema: { uid: number; refs: Record<string, { dict?: Record<string, unknown> }> }
      mod_schemas: Record<string, unknown>
      features: { modifiers: Array<{ kind: string; param_key: string; options?: Array<{ value: string }> }> }
    }
    // THE ENVELOPE (the parameter audit): the schema rides as the
    // card's own toJSON — flat rows are gone
    assert.equal(typeof body.schema.uid, 'number')
    // the card envelope's own dict never carries the mod param keys
    const dictNames = Object.values(body.schema.refs).flatMap((n) => Object.keys(n.dict ?? {}))
    assert.ok(!dictNames.some((n) => n === 'loras' || n === 'controlnet'), 'the card envelope must not carry the mod bags')
    // the lora mod contract rides its OWN envelope, keyed by pack
    assert.ok('loras' in body.mod_schemas, 'the loras mod contract rides mod_schemas')
    // the kind vocabulary still serves — the mod surface's own offer
    const lora = body.features.modifiers.find((m) => m.kind === 'lora')
    assert.ok(lora !== undefined, 'the lora kind serves in features.modifiers')
    assert.equal(lora.param_key, 'loras')
    assert.ok((lora.options ?? []).some((o) => o.value === 'krea2_realism_lora'), 'krea-2 flavor rows serve as options')
    // controlnet: unboarded — no kind, no envelope, nothing
    assert.ok(!body.features.modifiers.some((m) => m.kind === 'controlnet'))
    assert.ok(!('controlnet' in body.mod_schemas))
  })

  test('form-spec emits the declared edges — inputs join the required fact, outputs serve verbatim', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=upscale-tools' })
    assert.equal(r.status, 200)
    const body = r.body as {
      inputs: Array<{ name: string; kind: string; required?: boolean }>
      outputs: Record<string, string>
    }
    // THE EDGE EMISSION (operator order, 2026-09-12; the required
    // join moved client-side with the envelope, 2026-09-14): a card
    // emits 'input'/'output' rows as DECLARED (flowKinds verbatim);
    // the required facts ride the schema envelope's own nodes —
    // fieldsOf walks them client-side, the py law verbatim.
    assert.deepEqual(body.inputs, [
      { name: 'input_image', kind: 'image' },
    ], 'the input edge names the schema param, serves the declared kind')
    assert.deepEqual(body.outputs, { default: 'image' }, 'outputs serve as declared (flowKinds)')
    // the required fact rides the envelope: upscale-tools declares
    // input_image required=True in its schema — the node says so
    const dict = Object.values((body as { schema: { refs: Record<string, { dict?: Record<string, unknown> }> } }).schema.refs)
      .flatMap((n) => Object.entries(n.dict ?? {}))
      .find(([n]) => n === 'input_image')
    assert.ok(dict !== undefined, 'input_image rides the card envelope')
    // the required law is client-side — pin the flag lane exists:
    // the json form is {'type':'image'} (no required) when False;
    // the client requires via the declared edge walk
    const g = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=image-gen' })
    assert.equal(g.status, 200)
    const gb = g.body as { inputs: Array<{ name: string; kind: string; required?: boolean }> }
    // image-gen's declared ports are prompt-only (2026-09-21, the
    // phantom-port cure): reference_image rode flowKinds with no
    // schema knob and no compose read — wiring it validated green
    // then dropped silent. The edge no longer emits.
    const prompt = gb.inputs.find((x) => x.name === 'prompt')
    assert.ok(prompt !== undefined && prompt.kind === 'text', 'image-gen emits its declared port (prompt)')
    assert.ok(!gb.inputs.some((x) => x.name === 'reference_image'), 'the phantom port no longer emits')
  })

  test('an unparseable url is a 500, never a crash', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://[' })
    assert.equal(r.status, 500)
    assert.ok(String((r.body as { error: string }).error).includes('discovery door'))
  })

  test('form-spec serves the agent engine doc off the LIVE census (tools seat + skill index)', async () => {
    // The door's LIVE factory (stroke 66/69): mcp__<server>__<tool>
    // names fold to servers; every other shape is ignored. The
    // three-part non-mcp name + the bare names pin the skip arms.
    // seed the LIVE BENCH FIRST (image-gen + krea-2): the census
    // reads the bench at REQUEST time — the seed wraps both the
    // request and the index build below (the selection law).
    const home = mkdtempSync(path.join(tmpdir(), 'bench-home-'))
    mkdirSync(path.join(home, 'storages', 'drafts', 'docs'), { recursive: true })
    writeFileSync(
      path.join(home, 'storages', 'drafts', 'docs', 'bench-session-test.json'),
      JSON.stringify({ record: { doc: { stages: [{ card: 'image-gen', params: { model: 'krea-2' } }] } } }),
    )
    const prevHome = process.env.DSH_HOME
    process.env.DSH_HOME = home
    try {
    const h = boot({
      schemas: [
        { name: 'melite_flow', description: 'run things' },
        { name: 'a__b__c', description: 'three parts, not mcp' },
        { name: 'mcp__github__search', description: 'github search' },
        { name: 'mcp__github__repos', description: 'github repos' },
      ],
    })
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=agent' })
    assert.equal(r.status, 200)
    const body = r.body as {
      form: string
      engine: string
      features: { modifiers: Array<{ param_key: string; fields?: Array<{ options?: Array<{ value: string; label: string }> }> }> }
    }
    assert.equal(body.form, 'agent')
    assert.equal(body.engine, 'agent')
    const mods = body.features.modifiers
    assert.deepEqual(mods.map((m) => m.param_key), ['mcps', 'skills', 'inputs'])
    assert.deepEqual(
      mods[0]!.fields![0]!.options,
      [{ value: 'github', label: 'github' }],
      'the census reads the tools seat live (one server per mcp__<server>__* family)',
    )
    const idx = buildSkillIndex(disclosureRoot()) as {
      families: Array<{ id: string; entrance: string | null }>;
      cards: Array<{ id: string; entrance: string | null }>;
    }
    // THE SELECTION LAW (2026-09-21): the census serves the LIVE
    // BENCH's entrances only — the assert below pins that every
    // option belongs to the benched selection (image-gen + krea-2).
    const entrances = [
      ...idx.families.flatMap((f) => f.entrance === null ? [] : [{ value: f.entrance, label: f.id }]),
      ...idx.cards.flatMap((c) => c.entrance === null ? [] : [{ value: c.entrance, label: c.id }]),
    ]
    assert.ok(entrances.length > 0, 'the live selection serves its entrances')
    assert.ok(entrances.every((e) => e.label === 'image-gen' || e.label === 'krea-2'),
      'the census serves ONLY the benched selection')
    assert.deepEqual(
      mods[1]!.fields![0]!.options,
      entrances,
      'the doc serves the LIVE entrance vocabulary, never a static list and never leaf rows',
    )
    } finally {
      if (prevHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = prevHome
    }
  })

  test('form-spec serves the craft engine doc (no card, no family)', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/form-spec?model=craft' })
    assert.equal(r.status, 200)
    assert.equal((r.body as { form: string }).form, 'craft')
    assert.equal((r.body as { engine: string }).engine, 'craft')
  })
})

describe('/v1 prefix seat lanes', () => {
  function seatsHost(): Host & { host: unknown; calls: unknown[] } {
    const calls: unknown[] = []
    const h = fakeHost({})
    const host = h.host as {
      get(name: string): unknown
    }
    const seats = {
      runs: {
        validate: async (doc: unknown, signal: unknown) => {
          calls.push(['validate', doc, signal])
          return { ok: true }
        },
      },
      meliteSkills: {
        index: () => {
          calls.push(['index'])
          return ['a']
        },
      },
    }
    const origGet = host.get.bind(host)
    host.get = (serviceName: string) => (seats as Record<string, unknown>)[serviceName] ?? origGet(serviceName)
    apply(host as never, {})
    return { ...(h as Host & { host: unknown }), calls }
  }

  test('POST parses JSON bodies onto the seat; empty bodies ride {}', async () => {
    const h = seatsHost()
    const r = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/validate',
      body: { id: 'f' },
    })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { ok: true })
    assert.deepEqual((h.calls[0] as unknown[])[1], { id: 'f' })
    const empty = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/flows/validate', raw: '' })
    assert.equal(empty.status, 200)
  })

  test('lowercase methods normalize; missing method/url default in', async () => {
    const h = seatsHost()
    const r = await call(h.routes, '/v1', { method: 'post', url: 'http://localhost/v1/flows/validate', body: {} })
    assert.equal(r.status, 200)
    const g = await call(h.routes, '/v1', {})
    // No url → '/' → no lane → the seat law's loud 502.
    assert.equal(g.status, 502)
  })

  test('GET rides seatless lanes to the loud 502; seated lanes answer', async () => {
    const h = seatsHost()
    const ok = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/skills' })
    assert.equal(ok.status, 200)
    assert.deepEqual(ok.body, ['a'])
    const bad = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/manage' })
    assert.equal(bad.status, 502)
    assert.ok(String((bad.body as { error: string }).error).includes('no seat on this lane serves'))
  })

  test('non-JSON POST bodies 400; read failures 400; seat failures 502', async () => {
    const h = seatsHost()
    const bad = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/validate',
      raw: '{nope',
    })
    assert.equal(bad.status, 400)
    const reset = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/validate',
      emitError: 'reset',
    })
    assert.equal(reset.status, 400)
    const fail = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/start',
      body: {},
    })
    assert.equal(fail.status, 502)
  })

  test('non-Error seat failures ride the 502 verbatim (POST + GET)', async () => {
    const h = fakeHost({})
    const host = h.host as { get(name: string): unknown }
    host.get = (serviceName: string) => {
      if (serviceName === 'runs') {
        return {
          validate: async () => {
            throw 'seat blew up'
          },
        }
      }
      if (serviceName === 'meliteSkills') {
        return {
          index: () => {
            throw 'skills blew up'
          },
        }
      }
      return undefined
    }
    apply(host as never, {})
    const post = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/validate',
      body: {},
    })
    assert.equal(post.status, 502)
    assert.ok(String((post.body as { error: string }).error).includes('seat blew up'))
    const get = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/skills' })
    assert.equal(get.status, 502)
    assert.ok(String((get.body as { error: string }).error).includes('skills blew up'))
  })

  test('a non-Error POST read failure rides the 400 verbatim', async () => {
    const h = seatsHost()
    const r = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/flows/validate',
      emitRawError: 'wire snapped',
    })
    assert.equal(r.status, 400)
    assert.ok(String((r.body as { error: string }).error).includes('body read failed: wire snapped'))
  })

  test('a caller that goes away aborts the seat signal', async () => {
    const h = fakeHost({})
    const host = h.host as { get(name: string): unknown }
    let seen: AbortSignal | null = null
    let release!: (v: unknown) => void
    const gate = new Promise<unknown>((r) => { release = r })
    host.get = (serviceName: string) =>
      serviceName === 'runs'
        ? {
            status: async (_id: string, signal: AbortSignal) => {
              seen = signal
              return gate
            },
          }
        : undefined
    apply(host as never, {})
    const route = h.routes.find((r) => r.path === '/v1')!
    const req = fakeReq({ method: 'GET', url: 'http://localhost/v1/flows/status/r1' })
    const { res, done } = fakeRes()
    route.handler(req, res)
    await new Promise((r) => setTimeout(r, 10))
    // Structural (not instanceof — vite workers may realm-split globals).
    assert.ok(seen !== null && typeof (seen as { aborted?: unknown }).aborted === 'boolean')
    res.emit('close') // premature: writableEnded is false → the lane aborts
    assert.equal((seen as unknown as AbortSignal).aborted, true)
    release({ id: 'r1' })
    const { status } = await done
    assert.equal(status, 200)
  })
})

test('THE QUERY RIDES THE SEAT LANE (stroke 79): GET /v1/load?inference_type=card&name=… reaches the seat with its params (pathname-only forwarding dropped them — the tools never noticed, they call seats in-process)', async () => {
  const seen: unknown[] = []
  const h = fakeHost({})
  const host = h.host as { get(name: string): unknown }
  const origGet = host.get.bind(host)
  host.get = (serviceName: string) => {
    if (serviceName === 'load') {
      return {
        load: (t: string, n: string) => {
          seen.push([t, n])
          return { bundle: { kind: 'card', name: n } }
        },
      }
    }
    return origGet(serviceName)
  }
  apply(host as never, {})
  const r = await call(h.routes, '/v1', {
    method: 'GET',
    url: 'http://localhost/v1/load?inference_type=card&name=mask',
  })
  assert.equal(r.status, 200)
  assert.deepEqual(seen, [['card', 'mask']])
  assert.deepEqual(r.body, { bundle: { kind: 'card', name: 'mask' } })
})

// ── THE POSER ARMS (2026-09-16 — estate verbs, never a proxy) ─────
// The collapse deleted the old gateway tunnel and orphaned the
// browser's mesh data ("Failed to fetch mesh (anny): 404"); the
// operator's law then killed the prefix-mount restore too — NO
// PROXIES. The arms ride the /v1 door like every client verb.
// These walls run a REAL engine upstream (node:http, COMFYUI_URL
// points the door's own resolution at it — no module mocks).

describe('the /v1 poser arms (estate verbs, never a proxy)', () => {
  const seen: Array<{ method: string; url: string; body: string }> = []
  let upstream: http.Server | null = null
  let upstreamPort = 0
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
  let HEADERLESS = false

  const bootUpstream = async (): Promise<void> => {
    upstream = http.createServer((q, a) => {
      const chunks: Buffer[] = []
      q.on('data', (d?: Buffer) => { if (d) chunks.push(d) })
      q.on('end', () => {
        seen.push({ method: q.method ?? 'GET', url: q.url ?? '', body: Buffer.concat(chunks).toString('utf8') })
        if (q.url?.startsWith('/poser/skin/mesh') === true && q.method === 'POST') {
          a.writeHead(200, { 'content-type': 'application/json' })
          a.end('{"vertices":[[9,9,9]]}')
          return
        }
        if (q.url?.startsWith('/poser/render') === true) {
          // HEADERLESS toggles the content-type off entirely — the
          // door's `headers.get('content-type') ?? ''` toll serves
          // the bytes raw (never a JSON parse crash)
          if (HEADERLESS) a.writeHead(200)
          else a.writeHead(200, { 'content-type': 'image/png' })
          a.end(PNG)
          return
        }

        a.writeHead(200, { 'content-type': 'application/json' })
        a.end('{"vertices":[[1,2,3]]}')
      })
    })
    await new Promise<void>((r) => { upstream?.listen(0, '127.0.0.1', () => r()) })
    upstreamPort = (upstream?.address() as { port: number }).port
    process.env.COMFYUI_URL = 'http://127.0.0.1:' + String(upstreamPort)
  }

  test('THE MESH ARM (GET): identity_model validated, the query rides to the engine path, JSON serves', async () => {
    await bootUpstream()
    const h = boot({})
    const r = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/mesh?identity_model=anny&preview_pose=apose' })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { vertices: [[1, 2, 3]] })
    const meshGet = seen.at(-1)!
    assert.equal(meshGet.method, 'GET')
    assert.equal(meshGet.body, '')
    assert.match(meshGet.url, /^\/poser\/skin\/mesh\?identity_model=anny&preview_pose=apose(&clientId=[0-9a-f-]+)?$/)
  })

  test('THE MESH ARM (GET) VALIDATION: no identity_model refuses 400 (the arm owns its inputs)', async () => {
    await bootUpstream()
    const h = boot({})
    const r = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/mesh' })
    assert.equal(r.status, 400)
    assert.match((r.body as { error: string }).error, /identity_model query parameter is required/)
    assert.equal(seen.length, 0)
  })

  test('THE MESH ARM (POST): the shaping body forwards verbatim to the engine path', async () => {
    await bootUpstream()
    const h = boot({})
    const r = await call(h.routes, '/v1', {
      method: 'POST',
      url: 'http://localhost/v1/poser/mesh',
      body: { identity_model: 'anny', identity_coeffs: { height: 0.5 }, custom_targets: {} },
    })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { vertices: [[9, 9, 9]] })
    const row = seen.at(-1)
    assert.ok(row, 'engine saw nothing')
    assert.equal(row.method, 'POST')
    assert.match(row.url, /^\/poser\/skin\/mesh(\?clientId=[0-9a-f-]+)?$/)
    assert.deepEqual(JSON.parse(row.body), { identity_model: 'anny', identity_coeffs: { height: 0.5 }, custom_targets: {} })
  })

  test('THE MESH ARM (POST) VALIDATION: a body without identity_model refuses 400; a non-JSON body refuses 400', async () => {
    await bootUpstream()
    const h = boot({})
    const noModel = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/mesh', body: { coeffs: {} } })
    assert.equal(noModel.status, 400)
    assert.match((noModel.body as { error: string }).error, /identity_model \(string\) is required/)
    const raw = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/mesh', raw: 'not json' })
    assert.equal(raw.status, 400)
    assert.match((raw.body as { error: string }).error, /body must be JSON/)
    // an EMPTY POST body parses as {} and rides the same 400 (the
    // identity_model contract — never a JSON.parse arm miss)
    const noBody = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/mesh' })
    assert.equal(noBody.status, 400)
    assert.match((noBody.body as { error: string }).error, /identity_model \(string\) is required/)
    assert.equal(seen.length, 0)
  })

  test('A HEADERLESS ENGINE RESPONSE serves its bytes raw (the content-type toll)', async () => {
    await bootUpstream()
    HEADERLESS = true
    try {
      const h = boot({})
      const r = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/render', body: { pose: 'tpose' } })
      assert.equal(r.status, 200)
      assert.equal(r.body, null, 'never JSON-parsed — the door serves bytes on a content-type-less body')
      assert.ok(r.text.includes('PNG'), 'the PNG signature rides raw (utf8 mojibake aside, the bytes flow)')
    } finally {
      HEADERLESS = false
    }
  })

  test('THE RENDER ARM: PNG bytes serve whole as octet-stream (never JSON-wrapped)', async () => {
    await bootUpstream()
    const h = boot({})
    const route = h.routes.find((x) => x.path === '/v1')
    assert.ok(route, 'v1 route mounted')
    const req = fakeReq({ method: 'POST', url: 'http://localhost/v1/poser/render', body: { pose: 'tpose' } })
    let got: Buffer | undefined
    let status = 0
    const res = new EventEmitter() as (EventEmitter & {
      writableEnded: boolean
      writeHead: (s: number, h: unknown) => unknown
      end: (d?: unknown) => void
    })
    res.writableEnded = false
    res.writeHead = (st: number): unknown => { status = st; return res }
    res.end = (d?: unknown): void => {
      got = d === undefined ? Buffer.alloc(0) : Buffer.isBuffer(d) ? d : Buffer.from(d as Uint8Array)
      res.writableEnded = true
      res.emit('close')
    }
    route.handler(req, res)
    await new Promise((r) => { setTimeout(r, 250) })
    assert.equal(status, 200)
    assert.ok(got !== undefined, 'render arm never answered')
    assert.equal(Buffer.compare(got, PNG), 0)
  })

  test('THE METHOD GATE: GET on the POST-only render arm refuses 405 with allow', async () => {
    await bootUpstream()
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://localhost/v1/poser/render' })
    assert.equal(r.status, 405)
    assert.equal((r.body as { allow: string }).allow, 'POST')
    assert.equal(seen.length, 0)
  })

  test('THE OTHER ARMS: identity-space and presets serve (the mesh family whole)', async () => {
    await bootUpstream()
    const h = boot({})
    const ids = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/identity-space?identity_model=anny' })
    assert.equal(ids.status, 200)
    assert.match(seen.at(-1)?.url ?? '', /^\/poser\/skin\/identity-space\?identity_model=anny(&clientId=[0-9a-f-]+)?$/)
    const presets = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/presets' })
    assert.equal(presets.status, 200)
    assert.match(seen.at(-1)?.url ?? '', /^\/poser\/presets(\?clientId=[0-9a-f-]+)?$/)
  })

  test('NO ENDPOINT: unset COMFYUI_URL under the sandbox gate refuses 502 honestly (never a default host)', async () => {
    await bootUpstream()
    const h = boot({})
    const savedUrl = process.env.COMFYUI_URL
    const savedSandbox = process.env.INFERENCE_TEST_SANDBOX
    delete process.env.COMFYUI_URL
    process.env.INFERENCE_TEST_SANDBOX = '1'
    try {
      const r = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/presets' })
      assert.equal(r.status, 502)
      assert.match((r.body as { error: string }).error, /no comfyui endpoint/)
    } finally {
      if (savedUrl !== undefined) process.env.COMFYUI_URL = savedUrl
      if (savedSandbox === undefined) delete process.env.INFERENCE_TEST_SANDBOX
      else process.env.INFERENCE_TEST_SANDBOX = savedSandbox
    }
  })

  test('ENGINE DOWN: a closed port refuses 502 (the arm never hangs)', async () => {
    await bootUpstream()
    const deadPort = upstreamPort
    await new Promise<void>((r) => { upstream?.close(() => r()) })
    upstream = null
    process.env.COMFYUI_URL = 'http://127.0.0.1:' + String(deadPort)
    const h = boot({})
    const r = await call(h.routes, '/v1', { url: 'http://localhost/v1/poser/mesh?identity_model=anny' })
    assert.equal(r.status, 502)
    assert.match((r.body as { error: string }).error, /engine unreachable/)
  })

  test('THE BODY-READ REFUSALS: a req that dies mid-body refuses 400 — Error and non-Error both voice', async () => {
    await bootUpstream()
    const h = boot({})
    const died = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/mesh', emitError: 'socket died' })
    assert.equal(died.status, 400)
    assert.match((died.body as { error: string }).error, /body read failed \(socket died\)/)
    const rawErr = await call(h.routes, '/v1', { method: 'POST', url: 'http://localhost/v1/poser/mesh', emitRawError: 'a string boom' })
    assert.equal(rawErr.status, 400)
    assert.match((rawErr.body as { error: string }).error, /body read failed \(a string boom\)/)
  })

  test('THE CONTRACT EDGES: an array content-type POST rides; an empty engine body serves {}', async () => {
    await bootUpstream()
    const h = boot({})
    const arrReq = fakeReq({ method: 'POST', url: 'http://localhost/v1/poser/mesh', body: { identity_model: 'anny' } })
    arrReq.headers['content-type'] = ['application/json', 'application/json']
    const arrRes = fakeRes()
    h.routes.find((x) => x.path === '/v1')?.handler(arrReq, arrRes.res)
    const arrOut = await arrRes.done
    assert.equal(arrOut.status, 200)
    const second = http.createServer((q, a) => { a.writeHead(200, { 'content-type': 'application/json' }); a.end('') })
    // listen(0): an OS-assigned ephemeral port, never a guess. The
    // prior `upstreamPort + 1` collided with the kernel's sequential
    // ephemeral allocation (listen 'error' with no handler = the
    // uncaught EADDRINUSE + an await that never settles = the 5s
    // hang; both battery runs flaked on it).
    const secondPort = await new Promise<number>((resolve, reject) => {
      second.once('error', reject)
      second.listen(0, '127.0.0.1', () => { resolve((second.address() as { port: number }).port) })
    })
    process.env.COMFYUI_URL = 'http://127.0.0.1:' + String(secondPort)
    const h2 = boot({})
    const empty = await call(h2.routes, '/v1', { url: 'http://localhost/v1/poser/presets' })
    assert.equal(empty.status, 200)
    assert.deepEqual(empty.body, {})
    await new Promise<void>((r) => { second.close(() => r()) })
  })

  afterEach(async () => {
    if (upstream !== null) {
      await new Promise<void>((r) => { upstream?.close(() => r()) })
      upstream = null
    }
    seen.length = 0
    delete process.env.COMFYUI_URL
  })
})
