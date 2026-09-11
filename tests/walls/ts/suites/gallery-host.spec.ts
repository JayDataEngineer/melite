import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'

/** THE GALLERY WALL (REBUILD-18, the gateway kill): the host half
 *  answers in-tree over the estate seats (per-request optional
 *  probes — never an apply-time read), cross-host fetches the
 *  pinned owning DSH, and a missing seat is a LOUD 502 naming the
 *  fix. Artifacts stream from the runs output tree confined to
 *  run-relative names. The webServer seat is a minimal fake
 *  (register captures handlers); the estate seats are stubs with
 *  the seats' own shapes. */

interface Captured {
  route: string
  handler: (req: { url?: string }, res: FakeRes) => Promise<void> | void
}

class FakeRes {
  status = 0
  headers: Record<string, string> = {}
  body: Buffer | string | null = null
  writeHead(status: number, headers: Record<string, string>): FakeRes {
    this.status = status
    this.headers = headers
    return this
  }
  end(body?: Buffer | string): FakeRes {
    if (body !== undefined) this.body = body
    return this
  }
}

/** The minimal webServer service (register captures the rows). */
class FakeWebServer extends Service {
  captured: Captured[] = []
  constructor(ctx: Context) {
    super(ctx, 'webServer')
  }
  register(_row: unknown, route?: string): () => void {
    const row = _row as { path?: string; handler?: Captured['handler'] }
    this.captured.push({ route: route ?? row.path ?? '?', handler: row.handler! })
    return () => {}
  }
}

test('the gallery host answers in-tree over seats; missing seats are LOUD (REBUILD-18)', async () => {
  const ctx = new Context()
  new FakeWebServer(ctx)
  const gallery: Plugin = (await import('@infer-media/dsh-gallery')).default ?? (await import('@infer-media/dsh-gallery'))
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  await ctx.plugin(gallery as never, { flowDir })
  const server = ctx.get('webServer', true) as FakeWebServer
  const routes = new Map(server.captured.map((c) => [c.route.replace(/^infer-gallery: | route$/, ''), c]))
  const byPath = (p: string): Captured => server.captured.find((c) => c.route.includes(p))!
  assert.ok(byPath('/runs'), 'runs route registered')
  assert.ok(byPath('/drafts'), 'drafts route registered')
  assert.ok(byPath('/flow'), 'flow route registered')
  assert.ok(byPath('/artifact'), 'artifact route registered')
  assert.ok(routes.size >= 0)

  // 1. IN-TREE, estate absent: LOUD 502 naming the fix.
  const res1 = new FakeRes()
  await byPath('/runs').handler({ url: '/infer-gallery/runs' }, res1 as never)
  assert.equal(res1.status, 502)
  assert.match(String(res1.body), /no estate seat/)
  assert.match(String(res1.body), /melite-estate/)

  // 2. IN-TREE, the runs seat present: the list answers, artifact
  //    names rewrite to the same-origin route.
  class StubRuns extends Service {
    constructor(ctx: Context) {
      super(ctx, 'runs')
    }
    async list(limit: string, _signal: AbortSignal): Promise<unknown> {
      // THE RUNS-WINDOW LAW (restored with the media full port): the
      // host always pulls the door's hard max — a smaller window lets
      // sidecar floods push artifact rows out of the listing.
      assert.equal(limit, '500')
      return {
        runs: [
          { run_id: 'run-abc123-tag', thumbnail: 'run-abc123-tag/img.png', artifacts: [{ url: 'run-abc123-tag/out.png' }] },
        ],
      }
    }
  }
  new StubRuns(ctx)
  const res2 = new FakeRes()
  await byPath('/runs').handler({ url: '/infer-gallery/runs' }, res2 as never)
  assert.equal(res2.status, 200)
  const payload = JSON.parse(String(res2.body)) as { runs: Array<{ thumbnail: string; artifacts: Array<{ url: string }> }> }
  assert.equal(payload.runs[0]?.thumbnail, '/infer-gallery/artifact?path=run-abc123-tag%2Fimg.png')

  // 3. the artifact route: run-relative confinement — escape
  //    refuses 400; a real leaf streams from the output tree.
  const res3 = new FakeRes()
  await byPath('/artifact').handler({ url: '/infer-gallery/artifact?path=..%2Fsecret.txt' }, res3 as never)
  assert.equal(res3.status, 400)
  assert.match(String(res3.body), /run-relative/)
  mkdirSync(join(flowDir, 'run-abc123-tag'), { recursive: true })
  writeFileSync(join(flowDir, 'run-abc123-tag', 'img.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const res4 = new FakeRes()
  await byPath('/artifact').handler({ url: '/infer-gallery/artifact?path=run-abc123-tag%2Fimg.png' }, res4 as never)
  assert.equal(res4.status, 200)
  assert.equal(res4.headers['content-type'], 'image/png')

  // 4. the flow sidecar door keeps its own law (bad run_id → 400).
  const res5 = new FakeRes()
  await byPath('/flow').handler({ url: '/infer-gallery/flow?run_id=../x' }, res5 as never)
  assert.equal(res5.status, 400)
  assert.match(String(res5.body), /bad_run_id/)
})

test('cross-host posture: the pinned owning DSH serves every lane (config.gatewayUrl)', async () => {
  const ctx = new Context()
  new FakeWebServer(ctx)
  const galleryMod = await import('@infer-media/dsh-gallery')
  const gallery: Plugin = galleryMod.default ?? galleryMod
  // A local owning-DSH stand-in: fetch hits it verbatim.
  let hit = ''
  const standIn = (await import('node:http')).createServer((req, res) => {
    hit = req.url ?? ''
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ runs: [{ run_id: 'r1', thumbnail: 'run-r1/t.png' }] }))
  })
  await new Promise<void>((resolve) => standIn.listen(0, '127.0.0.1', resolve))
  const port = (standIn.address() as { port: number }).port
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  await ctx.plugin(gallery as never, { flowDir, gatewayUrl: `http://127.0.0.1:${port}` })
  const server = ctx.get('webServer', true) as FakeWebServer
  const runsRoute = server.captured.find((c) => c.route.includes('/runs'))!
  const res = new FakeRes()
  await runsRoute.handler({ url: '/infer-gallery/runs' }, res as never)
  assert.equal(res.status, 200)
  // THE RUNS-WINDOW LAW (both postures): the hard max rides the
  // upstream lane too — a smaller window lets sidecar floods push
  // artifact rows out of the listing.
  assert.equal(hit, '/v1/flows/runs?limit=500')
  const payload = JSON.parse(String(res.body)) as { runs: Array<{ thumbnail: string }> }
  assert.equal(payload.runs[0]?.thumbnail, '/infer-gallery/artifact?path=run-r1%2Ft.png')
  standIn.close()
})

test('the artifact grammar accepts subdir names and refuses traversal (the live-probe 400)', async () => {
  const ctx = new Context()
  new FakeWebServer(ctx)
  const gallery: Plugin = (await import('@infer-media/dsh-gallery')).default ?? (await import('@infer-media/dsh-gallery'))
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  // a real artifact in a SUBDIR (the shape every generate run emits)
  mkdirSync(join(flowDir, 'run-abc123-word', 'generate'), { recursive: true })
  writeFileSync(join(flowDir, 'run-abc123-word', 'generate', 'img.png'), Buffer.from([1, 2, 3, 4]))
  await ctx.plugin(gallery as never, { flowDir })
  const server = ctx.get('webServer', true) as FakeWebServer
  const art = server.captured.find((c) => c.route.includes('/artifact'))!
  const t = async (qs: string): Promise<FakeRes> => {
    const r = new FakeRes()
    await art.handler({ url: '/infer-gallery/artifact?' + qs }, r as never)
    return r
  }
  // 1. the nested real name SERVES (was 400 before the fix — the
  //    runs-list rewrite emits subdir names the grammar refused).
  const ok = await t('path=' + encodeURIComponent('run-abc123-word/generate/img.png'))
  assert.equal(ok.status, 200)
  assert.equal(Buffer.byteLength(String(ok.body)), 4)
  // 2. traversal refuses (grammar first, containment second).
  for (const evil of [
    'path=' + encodeURIComponent('run-abc123-word/../run-abc123-word/generate/img.png'),
    'path=' + encodeURIComponent('run-abc123-word/generate/../../etc/passwd'),
    'path=/etc/passwd',
    'path=' + encodeURIComponent('../flowDir/run-abc123-word/generate/img.png'),
  ]) {
    const bad = await t(evil)
    assert.equal(bad.status, 400, 'must refuse: ' + evil)
    assert.match(String(bad.body), /forbidden_path/)
  }
})
