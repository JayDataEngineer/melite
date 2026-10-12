/**
 * The gallery host contract — the SAME-ORIGIN doors the media panel
 * rides (/infer-gallery/runs + /drafts + /flow + /artifact +
 * /artifact-delete + /artifact-rename), pinned WITHOUT the estate
 * (fake cordis ctx, stubbed fetch, a tmp runs tree on disk):
 *
 *   posture — cross-host fetches the owning DSH verbatim; in-tree
 *             reads the estate seats, and an ABSENT seat answers a
 *             LOUD 502 naming the fix (never a silent empty);
 *   rewrite — run-relative artifact/thumbnail names ride the artifact
 *             route so the browser stays same-origin;
 *   confine — the artifact door serves ONLY run-relative names, and
 *             resolved-path containment re-checks at the read;
 *   floor   — legacy doubled-quote sidecars repair on read; old runs
 *             without snapshots fall back to their _request.json.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply, type Config } from '../src/index.ts'

interface Route {
  kind: string
  path: string
  handler: (req: unknown, res: unknown) => Promise<void>
}

interface Ctx {
  routes: Route[]
  seats: Record<string, unknown>
  infos: string[]
  warns: string[]
}

function mount(config?: Config, seats: Record<string, unknown> = {}): Ctx {
  const ctx: Ctx = { routes: [], seats, infos: [], warns: [] }
  const cordis = {
    effect(fn: () => unknown) { fn(); return () => {} },
    webServer: {
      register(r: Route) { ctx.routes.push(r); return () => {} },
    },
    get(name: string) { return ctx.seats[name] },
    logger: {
      info(message: string, ...args: unknown[]) {
        ctx.infos.push([message, ...args.map((a) => String(a))].join(' '))
      },
      warn(message: string) { ctx.warns.push(message) },
    },
  }
  apply(cordis as never, config)
  return ctx
}

interface Saw { status: number; headers: Record<string, string>; body: Buffer }

function fakeRes(): { saw: Saw; res: unknown } {
  const saw: Saw = { status: 0, headers: {}, body: Buffer.alloc(0) }
  const res = {
    writeHead(status: number, headers: Record<string, string> = {}) {
      saw.status = status
      saw.headers = headers
    },
    end(body: unknown = Buffer.alloc(0)) {
      saw.body = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body as Uint8Array)
    },
  }
  return { saw, res }
}

async function hit(ctx: Ctx, path: string, url?: string, headers: Record<string, string> = {}): Promise<Saw> {
  const route = ctx.routes.find((r) => r.path === path)
  if (route === undefined) throw new Error('no route for ' + path)
  const { saw, res } = fakeRes()
  await route.handler({ url: url ?? path, headers }, res)
  return saw
}

const json = (saw: Saw): unknown => JSON.parse(saw.body.toString('utf8'))

let flowDir = ''

beforeEach(() => {
  flowDir = mkdtempSync(join(tmpdir(), 'gallery-flow-'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(flowDir, { recursive: true, force: true })
})

function stubFetch(handler: (url: string) => Promise<Response>): string[] {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: unknown): Promise<Response> => {
    calls.push(String(input))
    return handler(String(input))
  }))
  return calls
}

const RUN = 'run-abc123-def'

function writeSidecar(runId: string, flow: string, request?: string): void {
  mkdirSync(join(flowDir, runId), { recursive: true })
  writeFileSync(join(flowDir, runId, '_flow.json'), flow)
  if (request !== undefined) writeFileSync(join(flowDir, runId, '_request.json'), request)
}

describe('registration + posture log', () => {
  it('registers the six exact doors and logs the in-tree posture by default', () => {
    const ctx = mount()
    expect(ctx.routes.map((r) => r.path).sort()).toEqual([
      '/infer-gallery/artifact',
      '/infer-gallery/artifact-delete',
      '/infer-gallery/artifact-rename',
      '/infer-gallery/drafts',
      '/infer-gallery/flow',
      '/infer-gallery/runs',
    ])
    expect(ctx.routes.every((r) => r.kind === 'exact')).toBe(true)
    expect(ctx.infos).toHaveLength(1)
  })

  it('logs the owning DSH with trailing slashes stripped', () => {
    const calls = stubFetch(() => Promise.resolve(new Response('{"runs":[]}', { status: 200 })))
    const ctx = mount({ gatewayUrl: 'https://owner.example///' })
    expect(ctx.infos[0]).toContain('https://owner.example')
    expect(ctx.infos[0]).not.toContain('///')
    expect(calls).toEqual([])
  })
})

describe('GET /infer-gallery/runs', () => {
  const ROWS = [
    { run_id: 'r1', thumbnail: `${RUN}/thumb.png`, artifacts: [{ url: `${RUN}/gen/a.png` }, null, 'bare', { url: 42 }] },
    { run_id: 'r2' },
  ]

  it('rewrites run-relative names to the artifact route (hostile rows pass through bare)', async () => {
    const ctx = mount({ flowDir }, { runs: { list: async () => ({ runs: ROWS }) } })
    const saw = await hit(ctx, '/infer-gallery/runs')
    expect(saw.status).toBe(200)
    const body = json(saw) as { gateway: string; runs: Array<Record<string, unknown>> }
    expect(body.gateway).toBe('')
    expect(body.runs[0]?.thumbnail).toBe(`/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/thumb.png`)}`)
    const arts = body.runs[0]?.artifacts as Array<unknown>
    expect((arts[0] as Record<string, unknown>).url).toBe(`/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/a.png`)}`)
    expect(arts[1]).toBe(null)
    expect(arts[2]).toBe('bare')
    expect((arts[3] as Record<string, unknown>).url).toBe('')
    expect(body.runs[1]).toMatchObject({ run_id: 'r2', thumbnail: '' })
  })

  it('a shapeless payload lists empty', async () => {
    const ctx = mount({ flowDir }, { runs: { list: async () => null } })
    const saw = await hit(ctx, '/infer-gallery/runs')
    expect(saw.status).toBe(200)
    expect((json(saw) as { runs: unknown[] }).runs).toEqual([])
  })

  it('an absent seat answers a loud 502; a failing seat answers gateway_unreachable', async () => {
    const bare = mount({ flowDir })
    const missing = await hit(bare, '/infer-gallery/runs')
    expect(missing.status).toBe(502)
    expect((json(missing) as { error: string }).error).toBe('no_estate_seat')

    const failing = mount({ flowDir }, { runs: { list: async () => { throw new Error('seat down') } } })
    const failed = await hit(failing, '/infer-gallery/runs')
    expect(failed.status).toBe(502)
    expect((json(failed) as { error: string }).error).toBe('gateway_unreachable')

    const bare2 = mount({ flowDir }, { runs: { list: async () => { throw 'bare seat failure' } } })
    const failed2 = await hit(bare2, '/infer-gallery/runs')
    expect((json(failed2) as { error: string; message: string }).message).toBe('bare seat failure')
  })

  it('cross-host fetches the owning DSH verbatim (refusals + garbage ride honestly)', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('runs')) return Promise.resolve(new Response('{"runs":[],"oops":', { status: 200 }))
      return Promise.resolve(new Response('nope', { status: 503 }))
    })
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir, timeoutMs: 1000 })
    const garbage = await hit(ctx, '/infer-gallery/runs')
    expect(garbage.status).toBe(502)
    expect((json(garbage) as { error: string }).error).toBe('gateway_unreachable')
    expect(calls[0]).toBe('https://owner.example/v1/flows/runs?limit=500')

    stubFetch(() => Promise.resolve(new Response('upstream says no', { status: 503 })))
    const refused = await hit(ctx, '/infer-gallery/runs')
    expect(refused.status).toBe(503)
    const body = json(refused) as { error: string; upstream: string; body: string }
    expect(body.error).toBe('gateway_error')
    expect(body.upstream).toBe('https://owner.example/v1/flows/runs')
    expect(body.body).toBe('upstream says no')
  })

  it('a cross-host transport failure answers gateway_unreachable', async () => {
    stubFetch(() => Promise.reject(new Error('socket reset')))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await hit(ctx, '/infer-gallery/runs')
    expect(saw.status).toBe(502)
    expect((json(saw) as { error: string }).error).toBe('gateway_unreachable')
  })
})

describe('GET /infer-gallery/drafts', () => {
  it('caps at 200 newest-first rows with the truncation flag honest', async () => {
    const drafts = Array.from({ length: 250 }, (_, i) => ({ draft_id: 'd' + String(i) }))
    const ctx = mount({ flowDir }, { draftsRemote: { list: async () => ({ drafts }) } })
    const saw = await hit(ctx, '/infer-gallery/drafts')
    expect(saw.status).toBe(200)
    const body = json(saw) as { total: number; truncated: boolean; drafts: unknown[] }
    expect(body.total).toBe(250)
    expect(body.truncated).toBe(true)
    expect(body.drafts).toHaveLength(200)
  })

  it('a short list is untruncated; a shapeless payload lists empty', async () => {
    const ctx = mount({ flowDir }, { draftsRemote: { list: async () => ({ drafts: [{ draft_id: 'd1' }] }) } })
    const body = json(await hit(ctx, '/infer-gallery/drafts')) as { total: number; truncated: boolean }
    expect(body).toMatchObject({ total: 1, truncated: false })

    const shapeless = mount({ flowDir }, { draftsRemote: { list: async () => ({}) } })
    expect((json(await hit(shapeless, '/infer-gallery/drafts')) as { drafts: unknown[] }).drafts).toEqual([])
  })

  it('the error taxonomy rides (refusal, missing seat, transport)', async () => {
    stubFetch(() => Promise.resolve(new Response('denied', { status: 403 })))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const refused = await hit(ctx, '/infer-gallery/drafts')
    expect(refused.status).toBe(403)
    expect((json(refused) as { error: string }).error).toBe('gateway_error')

    const bare = mount({ flowDir })
    const missing = await hit(bare, '/infer-gallery/drafts')
    expect(missing.status).toBe(502)
    expect((json(missing) as { error: string; lane: string }).lane).toBe('/v1/flows/drafts')

    stubFetch(() => Promise.reject('bare transport failure'))
    const failed = await hit(ctx, '/infer-gallery/drafts')
    expect((json(failed) as { error: string; message: string }).message).toBe('bare transport failure')
  })

  it('a failing drafts seat answers gateway_unreachable with its own text', async () => {
    const ctx = mount({ flowDir }, { draftsRemote: { list: async () => { throw new Error('drafts seat down') } } })
    const saw = await hit(ctx, '/infer-gallery/drafts')
    expect(saw.status).toBe(502)
    expect((json(saw) as { error: string; message: string })).toMatchObject({
      error: 'gateway_unreachable',
      message: 'drafts seat down',
    })
  })
})

describe('GET /infer-gallery/flow', () => {
  it('refuses a bad run_id (and a missing url) with a 400', async () => {
    const ctx = mount({ flowDir })
    const bad = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=../x')
    expect(bad.status).toBe(400)
    expect((json(bad) as { error: string }).error).toBe('bad_run_id')
    const bare = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow')
    expect(bare.status).toBe(400)
    // a urlless request defaults to the root (still a bad run_id).
    const route = ctx.routes.find((r) => r.path === '/infer-gallery/flow')
    const { saw, res } = fakeRes()
    await route!.handler({}, res)
    expect(saw.status).toBe(400)
  })

  it('serves the sidecar with its request floor', async () => {
    writeSidecar('abc123', '{"status":"done"}', '{"model":"m","prompt":"p"}')
    const ctx = mount({ flowDir })
    const saw = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=abc123')
    expect(saw.status).toBe(200)
    expect(json(saw)).toEqual({ run_id: 'abc123', flow: { status: 'done' }, request: { model: 'm', prompt: 'p' } })
  })

  it('repairs legacy doubled quotes; a missing request reads null', async () => {
    writeSidecar('old9', '{"status":"done",""seed":7}')
    const ctx = mount({ flowDir })
    const saw = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=old9')
    expect(saw.status).toBe(200)
    expect(json(saw)).toEqual({ run_id: 'old9', flow: { status: 'done', seed: 7 }, request: null })
  })

  it('garbage and missing sidecars answer an honest 404', async () => {
    writeSidecar('junk', 'not json at all {{{')
    const ctx = mount({ flowDir })
    const garbage = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=junk')
    expect(garbage.status).toBe(404)
    expect((json(garbage) as { error: string }).error).toBe('no_sidecar')
    const missing = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=ghost')
    expect(missing.status).toBe(404)
  })
})

describe('GET /infer-gallery/artifact', () => {
  function writeArtifact(target: string, bytes: Uint8Array): void {
    const full = join(flowDir, target)
    mkdirSync(join(flowDir, target.slice(0, target.lastIndexOf('/'))), { recursive: true })
    writeFileSync(full, bytes)
  }

  it('refuses non-run-relative names with a 400', async () => {
    const ctx = mount({ flowDir })
    for (const target of ['', 'noseparator', 'run-xyz/bad.png', `${RUN}/`, `${RUN}/../flow`, `${RUN}/./a.png`]) {
      const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(target)}`)
      expect(saw.status).toBe(400)
      expect((json(saw) as { error: string }).error).toBe('forbidden_path')
    }
    // THE UNIFIED SEGMENT GRAMMAR (the audit's ×3): `a|b.png` is a
    // legal FILENAME byte-wise (the estate media door serves it; the
    // engine can mint pipes, spaces, unicode, parens) — the old
    // private `[A-Za-z0-9._-]+` charset refused it here while the
    // media route served it, so the doors disagreed on the same
    // artifact. It is well-formed and simply absent: 404, not 400.
    const absent = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/a|b.png`)}`)
    // well-formed and ABSENT: the route's unreadable-artifact answer
    // (502 artifact_unreadable), never a grammar 400
    expect(absent.status).toBe(502)
    expect((json(absent) as { error: string }).error).toBe('artifact_unreadable')
    // a param-less request refuses the same way.
    const bare = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact')
    expect(bare.status).toBe(400)
    // a urlless request defaults to the root (still forbidden).
    const route = ctx.routes.find((r) => r.path === '/infer-gallery/artifact')
    const { saw, res } = fakeRes()
    await route!.handler({}, res)
    expect(saw.status).toBe(400)
  })

  it('streams tree files with honest mime types', async () => {
    const cases: Array<[string, string]> = [
      ['a.png', 'image/png'],
      ['b.jpg', 'image/jpeg'],
      ['c.jpeg', 'image/jpeg'],
      ['d.webp', 'image/webp'],
      // the drift fix (the audio-seek stroke): mp4 answered
      // video/webm, audio extensions answered octet-stream — one
      // MIME table in the vocab leaf now serves every route
      ['e.mp4', 'video/mp4'],
      ['f.webm', 'video/webm'],
      ['g.bin', 'application/octet-stream'],
      ['h.mp3', 'audio/mpeg'],
      ['i.wav', 'audio/wav'],
      ['j.flac', 'audio/flac'],
      ['k.ogg', 'audio/ogg'],
      ['l.m4a', 'audio/mp4'],
      ['m.aac', 'audio/aac'],
      ['n.glb', 'model/gltf-binary'],
      // the svg law (the adversarial round): svg is absent from the
      // shared table — a download, never inline executable
      ['o.svg', 'application/octet-stream'],
    ]
    for (const [file, mime] of cases) writeArtifact(`${RUN}/gen/${file}`, new Uint8Array([1, 2, 3]))
    const ctx = mount({ flowDir })
    for (const [file, mime] of cases) {
      const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/${file}`)}`)
      expect(saw.status, file).toBe(200)
      expect(saw.headers['content-type'], file).toBe(mime)
      expect(saw.headers['accept-ranges'], file).toBe('bytes')
      expect(saw.body).toEqual(Buffer.from([1, 2, 3]))
    }
  })

  it('serves the range law: 206 slices, the loud 416, the ignored ask (the audio-seek stroke)', async () => {
    // 10 bytes 0..9 — the canonical window
    writeArtifact(`${RUN}/gen/track.mp3`, Buffer.from('0123456789'))
    const ctx = mount({ flowDir })
    const url = `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/track.mp3`)}`
    const mid = await hit(ctx, '/infer-gallery/artifact', url, { range: 'bytes=2-5' })
    expect(mid.status).toBe(206)
    expect(mid.headers['content-type']).toBe('audio/mpeg')
    expect(mid.headers['content-range']).toBe('bytes 2-5/10')
    expect(mid.headers['accept-ranges']).toBe('bytes')
    expect(mid.headers['content-length']).toBe('4')
    expect(mid.body).toEqual(Buffer.from('2345'))
    const open = await hit(ctx, '/infer-gallery/artifact', url, { range: 'bytes=6-' })
    expect(open.body).toEqual(Buffer.from('6789'))
    const tail = await hit(ctx, '/infer-gallery/artifact', url, { range: 'bytes=-3' })
    expect(tail.body).toEqual(Buffer.from('789'))
    for (const ask of ['bytes=10-', 'bytes=99-200', 'bytes=-0']) {
      const saw = await hit(ctx, '/infer-gallery/artifact', url, { range: ask })
      expect(saw.status, ask).toBe(416)
      expect(saw.headers['content-range'], ask).toBe('bytes */10')
    }
    for (const ask of ['bytes=abc', 'bytes=0-1,3-4', 'bytes=5-2']) {
      const saw = await hit(ctx, '/infer-gallery/artifact', url, { range: ask })
      expect(saw.status, ask).toBe(200)
      expect(saw.body, ask).toEqual(Buffer.from('0123456789'))
    }
  })

  it('cross-host relays a Range ask and passes the upstream range answer through', async () => {
    stubFetch(() => Promise.resolve(new Response(Buffer.from('2345'), {
      status: 206,
      headers: { 'content-type': 'audio/mpeg', 'content-range': 'bytes 2-5/10', 'accept-ranges': 'bytes' },
    })))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/track.mp3`)}`, { range: 'bytes=2-5' })
    expect(saw.status).toBe(206)
    expect(saw.headers['content-range']).toBe('bytes 2-5/10')
    expect(saw.headers['accept-ranges']).toBe('bytes')
    expect(saw.body).toEqual(Buffer.from('2345'))
  })

  it('a missing file answers 502', async () => {
    const ctx = mount({ flowDir })
    const missing = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gone.png`)}`)
    expect(missing.status).toBe(502)
    expect((json(missing) as { error: string }).error).toBe('artifact_unreadable')
  })

  it('cross-host passes an upstream 416 through with its window (never a gateway_error)', async () => {
    stubFetch(() => Promise.resolve(new Response('past eof', {
      status: 416,
      headers: { 'content-range': 'bytes */10' },
    })))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/track.mp3`)}`, { range: 'bytes=99-200' })
    expect(saw.status).toBe(416)
    expect(saw.headers['content-range']).toBe('bytes */10')
    expect(saw.headers['accept-ranges']).toBe('bytes')
    expect((json(saw) as { error: string }).error).toBe('infer-gallery/range-not-satisfiable')
  })

  it('cross-host HEAD relays the upstream metadata with an empty body (a bodiless GET is still refused)', async () => {
    stubFetch(() => Promise.resolve(new Response(null, {
      status: 200,
      headers: { 'content-type': 'audio/mpeg', 'content-length': '3540830', 'accept-ranges': 'bytes' },
    })))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const route = ctx.routes.find((r) => r.path === '/infer-gallery/artifact')
    const url = `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/track.mp3`)}`
    const { saw, res } = fakeRes()
    await route!.handler({ url, headers: {}, method: 'HEAD' }, res)
    expect(saw.status).toBe(200)
    expect(saw.headers['content-type']).toBe('audio/mpeg')
    expect(saw.headers['content-length']).toBe('3540830')
    expect(saw.body.byteLength).toBe(0)
  })

  it('in-tree HEAD answers metadata only: the size rides, no byte ships (the media route law)', async () => {
    writeArtifact(`${RUN}/gen/track.mp3`, Buffer.from('0123456789'))
    const ctx = mount({ flowDir })
    const route = ctx.routes.find((r) => r.path === '/infer-gallery/artifact')
    const url = `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/track.mp3`)}`
    const { saw, res } = fakeRes()
    await route!.handler({ url, headers: { range: 'bytes=2-5' }, method: 'HEAD' }, res)
    expect(saw.status).toBe(200) // HEAD ignores Range: full metadata, never a slice
    expect(saw.headers['content-type']).toBe('audio/mpeg')
    expect(saw.headers['content-length']).toBe('10')
    expect(saw.headers['accept-ranges']).toBe('bytes')
    expect(saw.body.byteLength).toBe(0)
  })

  it('cross-host streams the owning asset tree (content-type falls back honestly)', async () => {
    stubFetch((url) => {
      if (url.endsWith('a.png')) {
        return Promise.resolve(new Response(Buffer.from([9]), { status: 200, headers: { 'content-type': 'image/png' } }))
      }
      return Promise.resolve(new Response(Buffer.from([7]), { status: 200 }))
    })
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const typed = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/a.png`)}`)
    expect(typed.status).toBe(200)
    expect(typed.headers['content-type']).toBe('image/png')
    expect(typed.headers['content-length']).toBe('1')
    const bare = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/b.bin`)}`)
    expect(bare.headers['content-type']).toBe('application/octet-stream')
  })

  it('a refusing upstream answers its own status; a bodiless one refuses too', async () => {
    stubFetch(() => Promise.resolve(new Response('gone', { status: 404 })))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const refused = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/a.png`)}`)
    expect(refused.status).toBe(404)
    expect((json(refused) as { error: string }).error).toBe('gateway_error')

    stubFetch(() => Promise.resolve(new Response(null, { status: 200 })))
    const bodiless = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/a.png`)}`)
    expect(bodiless.status).toBe(200)
    expect((json(bodiless) as { error: string }).error).toBe('gateway_error')
  })

  it('a cross-host transport failure answers artifact_unreadable', async () => {
    stubFetch(() => Promise.reject(new Error('socket reset')))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/a.png`)}`)
    expect(saw.status).toBe(502)
    expect((json(saw) as { error: string }).error).toBe('artifact_unreadable')
  })
})

/** POST-body harness for the mutating doors (the read door's `hit`
 *  passes a bare {url, headers} — the mutating doors read JSON off
 *  the node:http idiom, so the fake request speaks data/end). */
function fakeMutReq(url: string, body: unknown, method = 'POST'): unknown {
  const handlers: Record<string, Array<(...a: never[]) => void>> = {}
  const req: Record<string, unknown> = {
    url,
    method,
    headers: {},
    on: (event: string, fn: (...a: never[]) => void): unknown => {
      ;(handlers[event] ??= []).push(fn)
      return req
    },
  }
  queueMicrotask(() => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    for (const fn of handlers['data'] ?? []) fn(Buffer.from(raw) as never)
    for (const fn of handlers['end'] ?? []) fn()
  })
  return req
}

async function post(ctx: Ctx, path: string, body: unknown, method = 'POST'): Promise<Saw> {
  const route = ctx.routes.find((r) => r.path === path)
  if (route === undefined) throw new Error('no route for ' + path)
  const { saw, res } = fakeRes()
  await route.handler(fakeMutReq(path, body, method), res)
  return saw
}

function writeTreeArtifact(target: string, bytes: Uint8Array): void {
  const full = join(flowDir, target)
  mkdirSync(join(flowDir, target.slice(0, target.lastIndexOf('/'))), { recursive: true })
  writeFileSync(full, bytes)
}

describe('POST /infer-gallery/artifact-delete', () => {
  it('unlinks one run-relative file (200 {ok, path})', async () => {
    writeTreeArtifact(`${RUN}/gen/a.png`, new Uint8Array([1, 2, 3]))
    const ctx = mount({ flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: `${RUN}/gen/a.png` })
    expect(saw.status).toBe(200)
    expect(json(saw)).toEqual({ ok: true, path: `${RUN}/gen/a.png` })
    // the file is gone — the read door now answers 502.
    const gone = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/a.png`)}`)
    expect(gone.status).toBe(502)
  })

  it('refuses non-POST with a 405', async () => {
    const ctx = mount({ flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: `${RUN}/a.png` }, 'GET')
    expect(saw.status).toBe(405)
    expect((json(saw) as { error: string }).error).toBe('method_not_allowed')
  })

  it('refuses hostile paths, sidecars, bad bodies and missing files loudly', async () => {
    const ctx = mount({ flowDir })
    for (const target of ['', 'noseparator', 'run-xyz/bad.png', `${RUN}/../flow`]) {
      const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: target })
      expect(saw.status, target).toBe(400)
      expect((json(saw) as { error: string }).error, target).toBe('forbidden_path')
    }
    for (const target of [`${RUN}/_flow.json`, `${RUN}/_request.json`, `${RUN}/gen/_thumb.png`]) {
      const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: target })
      expect(saw.status, target).toBe(400)
      expect((json(saw) as { error: string }).error, target).toBe('protected_sidecar')
    }
    const garbage = await post(ctx, '/infer-gallery/artifact-delete', 'not json at all {{{')
    expect(garbage.status).toBe(400)
    expect((json(garbage) as { error: string }).error).toBe('forbidden_path')
    const empty = await post(ctx, '/infer-gallery/artifact-delete', '')
    expect(empty.status).toBe(400)
    expect((json(empty) as { error: string }).error).toBe('forbidden_path')
    const missing = await post(ctx, '/infer-gallery/artifact-delete', { path: `${RUN}/gone.png` })
    expect(missing.status).toBe(404)
    expect((json(missing) as { error: string }).error).toBe('no_artifact')
  })

  it('a transport failure answers artifact_unreadable (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket reset') }))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: `${RUN}/a.png` })
    expect(saw.status).toBe(502)
    expect((json(saw) as { error: string }).error).toBe('artifact_unreadable')
  })

  it('cross-host relays the JSON verbatim (status + body ride through)', async () => {
    const seen: Array<{ url: string; init: unknown }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: unknown): Promise<Response> => {
      seen.push({ url: String(input), init })
      return new Response(JSON.stringify({ ok: true, path: `${RUN}/a.png` }), { status: 200 })
    }))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-delete', { path: `${RUN}/a.png` })
    expect(saw.status).toBe(200)
    expect(json(saw)).toEqual({ ok: true, path: `${RUN}/a.png` })
    expect(seen[0]?.url).toBe('https://owner.example/infer-gallery/artifact-delete')
    expect((seen[0]?.init as { body?: string }).body).toBe(JSON.stringify({ path: `${RUN}/a.png` }))
  })
})

describe('POST /infer-gallery/artifact-rename', () => {
  it('renames inside the same directory and answers the new path + url', async () => {
    writeTreeArtifact(`${RUN}/gen/a.png`, new Uint8Array([4, 5, 6]))
    const ctx = mount({ flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/gen/a.png`, name: 'b.png' })
    expect(saw.status).toBe(200)
    expect(json(saw)).toEqual({
      ok: true,
      path: `${RUN}/gen/b.png`,
      url: `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/b.png`)}`,
    })
    const old = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/a.png`)}`)
    expect(old.status).toBe(502)
    const fresh = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(`${RUN}/gen/b.png`)}`)
    expect(fresh.status).toBe(200)
    expect(fresh.body).toEqual(Buffer.from([4, 5, 6]))
  })

  it('refuses non-POST with a 405', async () => {
    const ctx = mount({ flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/a.png`, name: 'b.png' }, 'GET')
    expect(saw.status).toBe(405)
    expect((json(saw) as { error: string }).error).toBe('method_not_allowed')
  })

  it('refuses hostile paths, sidecars, bad names, missing sources and taken targets', async () => {
    const ctx = mount({ flowDir })
    const badPath = await post(ctx, '/infer-gallery/artifact-rename', { path: 'noseparator', name: 'b.png' })
    expect(badPath.status).toBe(400)
    expect((json(badPath) as { error: string }).error).toBe('forbidden_path')
    const sidecar = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/_flow.json`, name: 'b.png' })
    expect(sidecar.status).toBe(400)
    expect((json(sidecar) as { error: string }).error).toBe('protected_sidecar')
    for (const name of ['', 'a/b.png', '..', '_hidden.png', '../x.png', 'a'.repeat(129)]) {
      const saw = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/a.png`, name })
      expect(saw.status, name).toBe(400)
      expect((json(saw) as { error: string }).error, name).toBe('bad_name')
    }
    const same = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/a.png`, name: 'a.png' })
    // same-name refuses at the grammar only when the source is
    // well-formed — here the source is missing but the no-op arm
    // fires first (nothing to do is a caller fault, not a 404).
    expect(same.status).toBe(400)
    expect((json(same) as { error: string }).error).toBe('bad_name')
    const missing = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/gone.png`, name: 'b.png' })
    expect(missing.status).toBe(404)
    expect((json(missing) as { error: string }).error).toBe('no_artifact')

    writeTreeArtifact(`${RUN}/gen/a.png`, new Uint8Array([1]))
    writeTreeArtifact(`${RUN}/gen/taken.png`, new Uint8Array([2]))
    const taken = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/gen/a.png`, name: 'taken.png' })
    expect(taken.status).toBe(409)
    expect((json(taken) as { error: string }).error).toBe('already_exists')
  })

  it('cross-host relays the JSON verbatim (status + body ride through)', async () => {
    const seen: Array<{ url: string; init: unknown }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: unknown): Promise<Response> => {
      seen.push({ url: String(input), init })
      return new Response(JSON.stringify({ ok: true, path: `${RUN}/b.png`, url: '/infer-gallery/artifact?path=x' }), { status: 200 })
    }))
    const ctx = mount({ gatewayUrl: 'https://owner.example', flowDir })
    const saw = await post(ctx, '/infer-gallery/artifact-rename', { path: `${RUN}/a.png`, name: 'b.png' })
    expect(saw.status).toBe(200)
    expect(seen[0]?.url).toBe('https://owner.example/infer-gallery/artifact-rename')
    expect((seen[0]?.init as { body?: string }).body).toBe(JSON.stringify({ path: `${RUN}/a.png`, name: 'b.png' }))
  })
})

// §23 CROSS-ROOTS (the media-bar catch, 2026-09-23): the host's
// run-file doors walk the queue seat's manifest — the configured
// tree first, then every manifest root's output dir, first tree
// holding the file wins. No seat → the single configured tree (the
// legacy walk, byte-identical).
describe('the run-file doors across roots (the §23 manifest)', () => {
  const SEAT = (own: string, maker: string): Record<string, unknown> => ({
    queue: { stateRoot: own, stateRoots: [own, maker] },
  })

  it('an artifact that lives only in the SECOND root serves its bytes', async () => {
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-own-'))
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-mk-'))
    try {
      mkdirSync(join(maker, 'output', 'run-0aa1-mk'), { recursive: true })
      writeFileSync(join(maker, 'output', 'run-0aa1-mk', 'film.mp4'), 'MAKERFILM')
      const ctx = mount({ flowDir }, SEAT(own, maker))
      const saw = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact?path=run-0aa1-mk%2Ffilm.mp4')
      expect(saw.status).toBe(200)
      expect(saw.body.toString()).toBe('MAKERFILM')
    } finally {
      rmSync(own, { recursive: true, force: true })
      rmSync(maker, { recursive: true, force: true })
    }
  })

  it('a run-id collision resolves FIRST-TREE-WINS (the own tree\'s bytes serve)', async () => {
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-c1-'))
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-c2-'))
    try {
      mkdirSync(join(flowDir, 'run-0bb2-dup'), { recursive: true })
      writeFileSync(join(flowDir, 'run-0bb2-dup', 'take.mp4'), 'OWN')
      mkdirSync(join(maker, 'output', 'run-0bb2-dup'), { recursive: true })
      writeFileSync(join(maker, 'output', 'run-0bb2-dup', 'take.mp4'), 'MAKER')
      const ctx = mount({ flowDir }, SEAT(own, maker))
      const saw = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact?path=run-0bb2-dup%2Ftake.mp4')
      expect(saw.body.toString()).toBe('OWN')
    } finally {
      rmSync(own, { recursive: true, force: true })
      rmSync(maker, { recursive: true, force: true })
    }
  })

  it('THE TEST-TREE ARM (the preview-404 cure, 2026-10-24): a test run in test-output/ serves its bytes', async () => {
    // test:true starts land in test-output/, not output/ — the
    // flowTrees that resolved only output/ 404'd every test run's
    // preview while the bytes sat on disk (the anny bake on the
    // lane: test-output/run-…/preset_body.glb).
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-t1-'))
    try {
      mkdirSync(join(own, 'test-output', 'run-0ee5-test'), { recursive: true })
      writeFileSync(join(own, 'test-output', 'run-0ee5-test', 'preset_body.glb'), 'TESTGLB')
      const ctx = mount({ flowDir }, SEAT(own, own))
      const saw = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact?path=run-0ee5-test%2Fpreset_body.glb')
      expect(saw.status).toBe(200)
      expect(saw.body.toString()).toBe('TESTGLB')
    } finally {
      rmSync(own, { recursive: true, force: true })
    }
  })

  it('a miss everywhere keeps the legacy ENOENT answer (the message names the own tree)', async () => {
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-e1-'))
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-e2-'))
    try {
      const ctx = mount({ flowDir }, SEAT(own, maker))
      const saw = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact?path=run-0cc3-ghost%2Fx.png')
      expect(saw.status).toBe(502)
      const doc = json(saw) as { error: string; message: string }
      expect(doc.error).toBe('artifact_unreadable')
      expect(doc.message).toBe(`ENOENT: no such file or directory, open '${join(flowDir, 'run-0cc3-ghost/x.png')}'`)
    } finally {
      rmSync(own, { recursive: true, force: true })
      rmSync(maker, { recursive: true, force: true })
    }
  })

  it('the flow door round-trips a second-root sidecar pair', async () => {
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-f1-'))
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-f2-'))
    try {
      mkdirSync(join(maker, 'output', 'run-0dd4-mk'), { recursive: true })
      writeFileSync(join(maker, 'output', 'run-0dd4-mk', '_flow.json'), '{"status":"completed"}')
      writeFileSync(join(maker, 'output', 'run-0dd4-mk', '_request.json'), '{"model":"h3"}')
      const ctx = mount({ flowDir }, SEAT(own, maker))
      const saw = await hit(ctx, '/infer-gallery/flow', '/infer-gallery/flow?run_id=run-0dd4-mk')
      expect(saw.status).toBe(200)
      const doc = json(saw) as { run_id: string; flow: unknown; request: unknown }
      expect(doc.run_id).toBe('run-0dd4-mk')
      expect((doc.flow as { status: string }).status).toBe('completed')
      expect((doc.request as { model: string }).model).toBe('h3')
    } finally {
      rmSync(own, { recursive: true, force: true })
      rmSync(maker, { recursive: true, force: true })
    }
  })

  it('delete + rename act on the winning tree (the door that lists it manages it)', async () => {
    const own = mkdtempSync(join(tmpdir(), 'gallery-x-m1-'))
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-m2-'))
    const dir = join(maker, 'output', 'run-0ee5-mk')
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'clip.mp4'), 'BYTES')
      const ctx = mount({ flowDir }, SEAT(own, maker))
      // rename through a raw JSON body
      const route = ctx.routes.find((r) => r.path === '/infer-gallery/artifact-rename')
      const { saw: sawRen, res: resRen } = fakeRes()
      const chunks: Uint8Array[] = [Buffer.from(JSON.stringify({ path: 'run-0ee5-mk/clip.mp4', name: 'film.mp4' }))]
      await route!.handler({
        method: 'POST',
        url: '/infer-gallery/artifact-rename',
        headers: {},
        on(event: string, fn: (d?: Uint8Array) => void) {
          if (event === 'data') for (const c of chunks) fn(c)
          else if (event === 'end') fn()
          return this
        },
      } as never, resRen)
      expect(sawRen.status).toBe(200)
      expect(existsSync(join(dir, 'film.mp4'))).toBe(true)
      const del = ctx.routes.find((r) => r.path === '/infer-gallery/artifact-delete')
      const { saw: sawDel, res: resDel } = fakeRes()
      const body2: Uint8Array[] = [Buffer.from(JSON.stringify({ path: 'run-0ee5-mk/film.mp4' }))]
      await del!.handler({
        method: 'POST',
        url: '/infer-gallery/artifact-delete',
        headers: {},
        on(event: string, fn: (d?: Uint8Array) => void) {
          if (event === 'data') for (const c of body2) fn(c)
          else if (event === 'end') fn()
          return this
        },
      } as never, resDel)
      expect(sawDel.status).toBe(200)
      expect(existsSync(join(dir, 'film.mp4'))).toBe(false)
    } finally {
      rmSync(own, { recursive: true, force: true })
      rmSync(maker, { recursive: true, force: true })
    }
  })

  it('no seat → only the configured tree is searched (the legacy walk)', async () => {
    const maker = mkdtempSync(join(tmpdir(), 'gallery-x-n1-'))
    try {
      mkdirSync(join(maker, 'output', 'run-0ff6-mk'), { recursive: true })
      writeFileSync(join(maker, 'output', 'run-0ff6-mk', 'a.mp4'), 'X')
      const ctx = mount({ flowDir })
      const saw = await hit(ctx, '/infer-gallery/artifact', '/infer-gallery/artifact?path=run-0ff6-mk%2Fa.mp4')
      expect(saw.status).toBe(502)
    } finally {
      rmSync(maker, { recursive: true, force: true })
    }
  })
})
