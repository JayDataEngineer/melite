// doors-uncovered.spec.ts — arms for the regression heads in doors.ts.
//
// Each arm asserts BEHAVIOR, never a bare reach:
//  - the preset plain-iterable + junk rows still exempt (the Map/values
//    face is not the only honest generation shape);
//  - two fresh wedges still pend (the oldestFresh second-arm evaluation);
//  - exactly-one family lands under <loras>/<family>/ (the shelf law);
//  - zero families land flat with no row (row_seated false, no refusal);
//  - a corrupt rows file refuses the seat but keeps the landed bytes
//    (row_refusal, serves_now false);
//  - GET /v1/boot-facts serves the staleness signal.
import { describe, test, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs/promises'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/doors.ts'

interface Route {
  kind: string
  path: string
  handler: (req: unknown, res: unknown) => void
}

function fakeLlm(): unknown {
  return {
    listProviders: () => [{ id: 'opencode-go' }],
    listModels: async () => [{ id: 'muse-spark' }],
    stream: () => (async function* () {
      yield { type: 'text-delta', text: '{}' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })(),
  }
}

function fakeHost(): { host: unknown; routes: Route[] } {
  const routes: Route[] = []
  const host = {
    effect: (fn: () => void) => {
      fn()
      return () => {}
    },
    llm: fakeLlm(),
    registry: { values: () => [] },
    tools: { schemas: () => [] },
    webServer: {
      port: 0,
      register: (route: Route) => {
        routes.push(route)
        return () => {}
      },
    },
    get: () => undefined,
  }
  return { host, routes }
}

interface ReqOpts {
  method?: string
  url?: string
  raw?: string
  headers?: Record<string, string>
}

function fakeReq(opts: ReqOpts = {}): EventEmitter & { method?: string; url?: string; headers: Record<string, string> } {
  const req = new EventEmitter() as EventEmitter & { method?: string; url?: string; headers: Record<string, string> }
  req.headers = opts.headers ?? {}
  if (opts.method !== undefined) req.method = opts.method
  if (opts.url !== undefined) req.url = opts.url
  process.nextTick(() => {
    if (opts.raw !== undefined) req.emit('data', Buffer.from(opts.raw, 'latin1'))
    req.emit('end')
  })
  return req
}

async function call(
  routes: Route[],
  routePath: string,
  opts: ReqOpts = {},
): Promise<{ status: number; body: unknown }> {
  const route = routes.find((r) => r.path === routePath)
  assert.ok(route, 'no route mounted at ' + routePath)
  const req = fakeReq(opts)
  let status = 0
  const chunks: Buffer[] = []
  let resolve!: (v: { status: number; text: string }) => void
  const done = new Promise<{ status: number; text: string }>((r) => {
    resolve = r
  })
  const res = new EventEmitter() as EventEmitter & {
    writeHead: (s: number) => void
    end: (d?: unknown) => void
    writableEnded: boolean
  }
  res.writableEnded = false
  res.writeHead = (s: number) => {
    status = s
  }
  res.end = (d?: unknown) => {
    if (d !== undefined) chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d as Uint8Array))
    res.writableEnded = true
    resolve({ status, text: Buffer.concat(chunks).toString('utf8') })
    res.emit('close')
  }
  route.handler(req, res)
  const { status: s, text } = await done
  return { status: s, body: text.length > 0 ? JSON.parse(text) : null }
}

describe('preset generations without a Map values face (the plain-iterable fold)', () => {
  test('a plain iterable with one good scope plus junk rows still exempts the inside wedge', async () => {
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
    const scopedCtx = ctx.extend({ baseUrl: 'https://preset.local/' })
    // NO .values function — the false arm of the generations.values
    // probe — plus two junk rows (no ctx) covering the
    // ctx-undefined skip.
    const plainGenerations = {
      *[Symbol.iterator]() {
        yield { scope: { ctx: scopedCtx } }
        yield { scope: {} }
        yield {}
      },
    }
    ctx.provide('agentPresets', { generations: plainGenerations } as never)
    const wedge = scopedCtx.plugin({
      name: 'preset-row',
      inject: ['neverLands'],
      apply: () => {},
    })
    const door = ctx.plugin({ name: 'melite-tools-doors', inject, apply: apply as never })
    try {
      await door
      await Promise.resolve()
      const out = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/flows/validate',
      })
      // inside the retained scope: the gate never closes, even with
      // junk rows beside the good one — the seat's own voice.
      assert.equal(out.status, 502)
      assert.match(String((out.body as { error: string }).error), /no seat on this lane serves/)
    } finally {
      await door.dispose()
      await wedge.dispose()
    }
  })
})

describe('two fresh wedges (the oldestFresh second-arm evaluation)', () => {
  test('two concurrent fresh racers still pend with the typed pending voice', async () => {
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
    const wedgeA = ctx.plugin({
      name: 'wedge-a',
      inject: ['neverLandsA'],
      apply: (child: Context) => {
        child.provide('runs', { validate: async () => ({ ok: true }) })
      },
    })
    const wedgeB = ctx.plugin({
      name: 'wedge-b',
      inject: ['neverLandsB'],
      apply: (child: Context) => {
        child.provide('runs', { validate: async () => ({ ok: true }) })
      },
    })
    const door = ctx.plugin({ name: 'melite-tools-doors', inject, apply: apply as never })
    try {
      await door
      await wedgeA
      await wedgeB
      await Promise.resolve()
      const out = await call(routes, '/v1', {
        method: 'POST',
        url: 'http://localhost/v1/flows/validate',
        raw: '{}',
        headers: { 'content-type': 'application/json', 'content-length': '2' },
      })
      assert.equal(out.status, 503)
      assert.deepEqual(out.body, {
        error: 'estate composition is still activating',
        code: 'estate/pending',
        pending: true,
      })
    } finally {
      await wedgeB.dispose()
      await wedgeA.dispose()
      await door.dispose()
    }
  })
})

// ── the lora shelf + seating arms ──────────────────────────────────

const LORA_BYTES = Buffer.from([0x53, 0x41, 0x46, 0x45, 0x54, 0x45, 0x4e, 0x53])
const TAG = 'doors-uncovered-' + process.pid + '-'
const created: string[] = []
afterEach(async () => {
  while (created.length > 0) {
    const p = created.pop()!
    rmSync(p, { recursive: true, force: true })
  }
})

let savedLorasDir: string | undefined
let savedRows: string | undefined
beforeEach(() => {
  savedLorasDir = process.env['MELITE_COMFYUI_LORAS_DIR']
  savedRows = process.env['MELITE_USER_LORAS']
})
afterEach(() => {
  if (savedLorasDir === undefined) delete process.env['MELITE_COMFYUI_LORAS_DIR']
  else process.env['MELITE_COMFYUI_LORAS_DIR'] = savedLorasDir
  if (savedRows === undefined) delete process.env['MELITE_USER_LORAS']
  else process.env['MELITE_USER_LORAS'] = savedRows
})

function withDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'melite-doors-uncovered-'))
  created.push(dir)
  process.env['MELITE_COMFYUI_LORAS_DIR'] = dir
  process.env['MELITE_USER_LORAS'] = path.join(dir, 'user-loras.json')
  return dir
}

function bootLora(): { routes: Route[] } {
  const h = fakeHost()
  apply(h.host as never, {})
  return h
}

const octet = (n: number): Record<string, string> => ({
  'content-type': 'application/octet-stream',
  'content-length': String(n),
})

describe('lora shelf law (exactly one family lands in its subfolder)', () => {
  test('a single family lands under <loras>/<family>/ and seats the row', async () => {
    const dir = withDir()
    const h = bootLora()
    const { status, body } = await call(h.routes, '/v1/uploads/lora', {
      method: 'POST',
      url: '/v1/uploads/lora?filename=' + encodeURIComponent(TAG + 'single.safetensors') + '&families=h3',
      raw: LORA_BYTES.toString('latin1'),
      headers: octet(LORA_BYTES.byteLength),
    })
    assert.equal(status, 200)
    const out = body as {
      filename: string
      install_dir: string
      row_seated: boolean
      serves_now: boolean
      row: { id: string; filename: string; families: string[] }
    }
    // THE SHELF: one family → the subfolder, the combo id carries it.
    assert.equal(out.filename, 'h3/' + TAG + 'single.safetensors')
    assert.equal(out.install_dir, dir + '/h3')
    assert.equal(out.row_seated, true)
    assert.equal(out.serves_now, true)
    assert.deepEqual(out.row.families, ['h3'])
    assert.equal((await fs.readFile(path.join(dir, 'h3', TAG + 'single.safetensors'))).byteLength, LORA_BYTES.byteLength)
  })

  test('zero families land flat with no row — row_seated false, no refusal, serves_now false', async () => {
    const dir = withDir()
    const h = bootLora()
    const { status, body } = await call(h.routes, '/v1/uploads/lora', {
      method: 'POST',
      url: '/v1/uploads/lora?filename=' + encodeURIComponent(TAG + 'flat.safetensors'),
      raw: LORA_BYTES.toString('latin1'),
      headers: octet(LORA_BYTES.byteLength),
    })
    assert.equal(status, 200)
    const out = body as {
      filename: string
      install_dir: string
      row_seated: boolean
      serves_now: boolean
      row: { families: string[] }
      row_refusal?: string
    }
    assert.equal(out.filename, TAG + 'flat.safetensors')
    assert.equal(out.install_dir, dir)
    assert.equal(out.row_seated, false)
    assert.equal('row_refusal' in out, false)
    assert.equal(out.serves_now, false)
    assert.deepEqual(out.row.families, [])
  })

  test('a corrupt rows file refuses the seat but keeps the landed bytes (row_refusal, serves_now false)', async () => {
    const dir = withDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, 'user-loras.json'), 'not json {{{')
    const h = bootLora()
    const { status, body } = await call(h.routes, '/v1/uploads/lora', {
      method: 'POST',
      url: '/v1/uploads/lora?filename=' + encodeURIComponent(TAG + 'refused.safetensors') + '&families=h3',
      raw: LORA_BYTES.toString('latin1'),
      headers: octet(LORA_BYTES.byteLength),
    })
    assert.equal(status, 200)
    const out = body as {
      filename: string
      row_seated: boolean
      serves_now: boolean
      row_refusal?: string
    }
    // LAND succeeds (the bytes are real) but SEAT refuses by name.
    assert.equal(out.filename, 'h3/' + TAG + 'refused.safetensors')
    assert.equal(out.row_seated, false)
    assert.match(String(out.row_refusal), /rows file refuses the write/)
    assert.equal(out.serves_now, false)
    assert.equal((await fs.readFile(path.join(dir, 'h3', TAG + 'refused.safetensors'))).byteLength, LORA_BYTES.byteLength)
  })
})

describe('GET /v1/boot-facts (the staleness signal)', () => {
  test('serves the card-defs + model-facts staleness without a cardRegistry', async () => {
    const h = fakeHost()
    apply(h.host as never, {})
    const { status, body } = await call(h.routes, '/v1', {
      method: 'GET',
      url: 'http://localhost/v1/boot-facts',
    })
    assert.equal(status, 200)
    const out = body as { card_defs: unknown; model_facts: { error: string } }
    assert.ok(out.card_defs !== undefined, 'the card-defs staleness rides')
    assert.match(String(out.model_facts.error), /cardRegistry/)
  })

  test('a throwing cardRegistry answers the door 500, never a host crash', async () => {
    const h = fakeHost()
    const host = {
      ...(h.host as Record<string, unknown>),
      cardRegistry: {
        factsStaleness: () => {
          throw new Error('registry down')
        },
      },
    }
    apply(host as never, {})
    const { status, body } = await call(h.routes, '/v1', {
      method: 'GET',
      url: 'http://localhost/v1/boot-facts',
    })
    assert.equal(status, 500)
    assert.match(String((body as { error: string }).error), /registry down/)
  })
})
