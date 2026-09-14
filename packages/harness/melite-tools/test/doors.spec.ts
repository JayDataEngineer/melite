// doors.ts walls, live plane (vitest, fake host + fake llm seam +
// real fs fixtures under data/input, cleaned up — no network): apply
// wiring, catalog, enhance one-shot + sweep, uploads, input preview,
// and the /v1 prefix door's discovery + seat lanes.
import { describe, test, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { apply, inject } from '../src/doors.ts'
import { resolveRepoRoot } from '@melite/comfyui-cordis'
import type { LlmStreamSeam } from '../src/llm-complete.ts'

const JSON_REPLY = '{"positive":"P","negative":"N"}'
const TAG = 'doors-' + process.pid + '-'

// ── fakes ─────────────────────────────────────────────────────────

interface SeenLlm {
  systems: string[]
  temps: unknown[]
}

function fakeLlm(opts?: { dead?: boolean; explode?: boolean }): LlmStreamSeam & SeenLlm {
  const systems: string[] = []
  const temps: unknown[] = []
  const providers = [
    { id: 'opencode-go', models: ['muse-spark'] },
    { id: 'deepseek-official', models: ['deepseek-chat'] },
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
    tools: {
      schemas: () => [
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

interface ReqOpts {
  method?: string
  url?: string
  body?: unknown
  raw?: string
  emitError?: string
  emitRawError?: unknown
  junkData?: boolean
}

function fakeReq(opts: ReqOpts = {}): EventEmitter & { method?: string; url?: string } {
  const req = new EventEmitter() as EventEmitter & { method?: string; url?: string }
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
  test('inject names the web-only plane; six routes mount with labels', () => {
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
})

// ── catalog ───────────────────────────────────────────────────────

describe('catalog route', () => {
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

  test('absent llm serves the host default; non-number temperature drops', async () => {
    const llm = fakeLlm()
    const h = boot({ llm, defaultModel: DEFAULT_MODEL })
    const { status, body } = await call(h.routes, '/melite-tools/enhance', {
      method: 'POST',
      url: '/',
      body: { system_prompt: 's', prompt: 'p', temperature: 'hot' },
    })
    assert.equal(status, 200)
    assert.equal((body as { via: string }).via, 'opencode-go/muse-spark')
    assert.deepEqual(llm.temps, [undefined])
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

  test('a stale host default is a 502 naming the live routes', async () => {
    const h = boot({ defaultModel: { currentSelection: () => ({ provider: 'gone', model: 'model' }) } })
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

  test('no llm and no host default is a 502, never a walk', async () => {
    for (const opts of [{ getThrows: true }, { defaultModel: null }, { defaultModel: {} },
      { defaultModel: { currentSelection: () => ({ provider: 'x', model: 7 }) } },
      { defaultModel: { currentSelection: () => null } }]) {
      const h = boot(opts as Parameters<typeof fakeHost>[0])
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
  test('a recipe-less model sweeps ONE generic field through the default', async () => {
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
    assert.equal(b.results['prompt']!.via, 'opencode-go/muse-spark')
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

  test('a sweep with no llm anywhere is a 502, never a walk', async () => {
    const h = boot({})
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
  test('serves png/jpeg/webp bytes with content types', async () => {
    const h = boot({})
    const dir = await inputDir()
    const cases: Array<[string, string]> = [
      [TAG + 'a.png', 'image/png'],
      [TAG + 'b.jpg', 'image/jpeg'],
      [TAG + 'c.jpeg', 'image/jpeg'],
      [TAG + 'd.bmp', 'image/webp'],
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
    const ref = gb.inputs.find((x) => x.name === 'reference_image')
    assert.ok(ref !== undefined && ref.required !== true, 'non-required inputs omit the flag (reference_image)')
  })

  test('an unparseable url is a 500, never a crash', async () => {
    const h = boot({})
    const r = await call(h.routes, '/v1', { method: 'GET', url: 'http://[' })
    assert.equal(r.status, 500)
    assert.ok(String((r.body as { error: string }).error).includes('discovery door'))
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
    assert.ok(String((bad.body as { error: string }).error).includes('no remote serves'))
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
