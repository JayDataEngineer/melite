/**
 * The gallery host contract — the SAME-ORIGIN doors the media panel
 * rides (/infer-gallery/runs + /drafts + /flow + /artifact), pinned
 * WITHOUT the estate (fake cordis ctx, stubbed fetch, a tmp runs
 * tree on disk):
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
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
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
  it('registers the four exact doors and logs the in-tree posture by default', () => {
    const ctx = mount()
    expect(ctx.routes.map((r) => r.path).sort()).toEqual([
      '/infer-gallery/artifact',
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
    for (const target of ['', 'noseparator', 'run-xyz/bad.png', `${RUN}/`, `${RUN}/../flow`, `${RUN}/./a.png`, `${RUN}/a|b.png`]) {
      const saw = await hit(ctx, '/infer-gallery/artifact', `/infer-gallery/artifact?path=${encodeURIComponent(target)}`)
      expect(saw.status).toBe(400)
      expect((json(saw) as { error: string }).error).toBe('forbidden_path')
    }
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
