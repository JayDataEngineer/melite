import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
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
  const galleryMod = await import('@melite/infer-gallery') as unknown as Plugin & { default?: Plugin }
  // the module carries no default export — its namespace IS the
  // object plugin (name/inject/apply ride the namespace itself).
  const gallery: Plugin = galleryMod.default ?? galleryMod
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  await ctx.plugin(gallery, { flowDir })
  // the wall mounted a fake under the webServer seat name — the
  // static get() type names the real seat, the runtime truth is the fake.
  const server = ctx.get('webServer', true) as unknown as FakeWebServer
  const routes = new Map(server.captured.map((c) => [c.route.replace(/^infer-gallery: | route$/, ''), c]))
  const byPath = (p: string): Captured => server.captured.find((c) => c.route.includes(p))!
  // C-C3 (the wall audit): four substring pins and a `>= 4` floor
  // guarded a six-route door — artifact-delete and artifact-rename
  // could vanish silently. The expected set is DERIVED from the
  // source now (every `path: '/infer-gallery/...'` literal in
  // index.ts), and the registered set must equal it EXACTLY: a route
  // added at source but not registered, registered but not at
  // source, or renamed on one side only, all fail here.
  const gallerySource = readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', 'packages', 'web', 'infer-gallery', 'src', 'index.ts'),
    'utf8',
  )
  const expected = [...gallerySource.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]!).sort();
  assert.ok(expected.length >= 6, `census floor: the source declares its routes (${expected.length} — the read rotted?)`);
  const registeredPaths = server.captured.map((c) => {
    const m = c.route.match(/'(\/[^']*)'/);
    return m?.[1] ?? c.route;
  }).sort();
  assert.deepEqual(registeredPaths, expected,
    `the gallery registers EXACTLY the source's route set (registered ${JSON.stringify(registeredPaths)} vs source ${JSON.stringify(expected)})`);
  assert.equal(routes.size, new Set(registeredPaths).size,
    'the route map must not collapse a registered route (two routes, one key)');

  // 1. IN-TREE, estate absent: LOUD 502 naming the fix.
  const res1 = new FakeRes()
  await byPath('/runs').handler({ url: '/infer-gallery/runs' }, res1 as never)
  assert.equal(res1.status, 502)
  assert.match(String(res1.body), /no estate seat/)
  assert.match(String(res1.body), /dsh-estate/)

  // 2. IN-TREE, the runs seat present: the list answers, artifact
  //    names rewrite to the same-origin route.
  const listCalls: string[] = []
  class StubRuns extends Service {
    constructor(ctx: Context) {
      super(ctx, 'runs')
    }
    async list(limit: string, _signal: AbortSignal): Promise<unknown> {
      // THE RUNS-WINDOW LAW (restored with the media full port): the
      // host always pulls the door's hard max — a smaller window lets
      // sidecar floods push artifact rows out of the listing.
      //
      // C-M13 (the wall audit, 2026-09-28): the assertion lived
      // INSIDE the stub — a host that never called the door passed it
      // (the law was judged zero times), and a throw from inside a
      // stub can surface as an unrelated error. The window is
      // RECORDED here and asserted OUTSIDE, after the route ran, and
      // the call count is pinned (the door is asked, exactly once).
      listCalls.push(limit)
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
  // C-M13: the window law is asserted OUTSIDE the stub, with the
  // call count pinned — the door is asked exactly once, and it is
  // asked for the door's hard max.
  assert.deepEqual(listCalls, ['500'],
    'the gallery asked the runs door exactly once, for its hard max (the window law, judged outside the stub)')

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
  const galleryMod = await import('@melite/infer-gallery') as unknown as Plugin & { default?: Plugin }
  // the module carries no default export — its namespace IS the
  // object plugin (name/inject/apply ride the namespace itself).
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
  await ctx.plugin(gallery, { flowDir, gatewayUrl: `http://127.0.0.1:${port}` })
  // the wall mounted a fake under the webServer seat name — the
  // static get() type names the real seat, the runtime truth is the fake.
  const server = ctx.get('webServer', true) as unknown as FakeWebServer
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
  const galleryMod = await import('@melite/infer-gallery') as unknown as Plugin & { default?: Plugin }
  // the module carries no default export — its namespace IS the
  // object plugin (name/inject/apply ride the namespace itself).
  const gallery: Plugin = galleryMod.default ?? galleryMod
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  // a real artifact in a SUBDIR (the shape every generate run emits)
  mkdirSync(join(flowDir, 'run-abc123-word', 'generate'), { recursive: true })
  writeFileSync(join(flowDir, 'run-abc123-word', 'generate', 'img.png'), Buffer.from([1, 2, 3, 4]))
  await ctx.plugin(gallery, { flowDir })
  // the wall mounted a fake under the webServer seat name — the
  // static get() type names the real seat, the runtime truth is the fake.
  const server = ctx.get('webServer', true) as unknown as FakeWebServer
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

// C-C3 (the wall audit): the artifact-delete and artifact-rename
// routes had NO behavioural arm — they were the two routes the
// `>= 4` floor was silently missing. These round-trips drive each
// handler's refusal laws directly (the fail-closed half of the
// contract: method discipline, containment, sidecar protection).
test('the delete + rename routes round-trip their refusal laws', async () => {
  const galleryMod = (await import('../../../../packages/web/infer-gallery/src/index.ts')) as {
    default?: Plugin;
  } & Record<string, unknown>
  const gallery: Plugin = galleryMod.default ?? (galleryMod as unknown as Plugin)
  const ctx = new Context()
  const flowDir = mkdtempSync(join(tmpdir(), 'gallery-wall-'))
  const server = new FakeWebServer(ctx)
  await ctx.plugin(gallery, { flowDir })
  const byPath = (p: string): Captured => server.captured.find((c) => c.route.includes(p))!
  // a request whose body is a JSON string (readJsonBody consumes
  // the data/end events)
  const post = (payload: string) => ({
    method: 'POST',
    on(event: string, fn: (d?: Uint8Array) => void): void {
      if (event === 'data') fn(new TextEncoder().encode(payload))
      if (event === 'end') fn()
    },
  })
  for (const route of ['/infer-gallery/artifact-delete', '/infer-gallery/artifact-rename']) {
    // method discipline: GET refuses 405
    const wrong = new FakeRes()
    await byPath(route).handler({ method: 'GET', url: route } as never, wrong)
    assert.equal(wrong.status, 405, route + ': non-POST refuses 405')
    assert.match(String(wrong.body), /method_not_allowed/, route + ': names the law')
    // containment: an absolute path refuses
    const abs = new FakeRes()
    await byPath(route).handler(post(JSON.stringify({ path: '/etc/passwd', name: 'x.png' })) as never, abs)
    assert.equal(abs.status, 400, route + ': non-run-relative path refuses')
    assert.match(String(abs.body), /forbidden_path/, route + ': names the containment law')
    // provenance: sidecars are never media
    const side = new FakeRes()
    await byPath(route).handler(post(JSON.stringify({ path: 'run-abc123-word/_request.json', name: 'x.png' })) as never, side)
    assert.equal(side.status, 400, route + ': protected sidecar refuses')
    assert.match(String(side.body), /protected_sidecar/, route + ': names the provenance law')
  }
})
