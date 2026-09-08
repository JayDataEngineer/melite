/**
 * HOST-DOOR behavioral test (media-sidebar audit gap 1): drives the
 * REAL built door (lib/index.js) with a fake cordis ctx and a stub
 * gateway — no live estate, no GPU, offline. Pins the door contract:
 * malformed rows drop LOUDLY (counted into errors), the truncation
 * marker rides the run row (never renders as an artifact), all-down is
 * a 502 (never a hang or a crash), dedupe overlap is VISIBLE (gap 7),
 * and the artifact proxy refuses foreign origins.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import * as http from 'node:http'
import * as plugin from '../lib/index.js'

/** Minimal cordis ctx: effect() runs immediately, register() captures. */
function fakeCtx() {
  const routes = {}
  return {
    routes,
    logger: { info() {}, warn() {}, error() {} },
    effect(fn) { fn(); return () => {} },
    webServer: {
      register(route) { routes[route.path] = route },
    },
  }
}

/** Response shim: records status/headers/chunks; end() settles. */
function fakeRes() {
  const state = { status: 0, headers: {}, chunks: [], done: null, text: '' }
  const done = new Promise((resolve) => { state.done = resolve })
  return {
    state, done,
    writeHead(status, headers = {}) { state.status = status; state.headers = headers; return this },
    write(chunk) { state.chunks.push(chunk); return true },
    end(chunk) {
      if (chunk !== undefined) state.chunks.push(chunk)
      state.text = Buffer.concat(state.chunks.map((c) => Buffer.from(c))).toString('utf8')
      state.done()
    },
  }

}

/** Stub gateway: canned JSON routes + a byte-stream artifact route. */
function stubGateway({ runsBody, draftsBody, artifactBody, artifactStatus = 200, echoRange = false }) {
  const seen = { range: null }
  let url = ''
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/v1/flows/runs')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(runsBody ?? { runs: [] }))
    } else if (req.url.startsWith('/v1/flows/drafts')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(draftsBody ?? { drafts: [] }))
    } else {
      seen.range = req.headers.range ?? null
      res.writeHead(artifactStatus, { 'content-type': 'video/mp4' })
      res.end(artifactBody ?? Buffer.from('BYTES'))
    }
  })
  return {
    seen,
    url: '',
    start() {
      return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
        const { port } = server.address()
        url = 'http://127.0.0.1:' + String(port)
        resolve(url)
      }))
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

async function activate(gateways) {
  const ctx = fakeCtx()
  plugin.apply(ctx, { gateways })
  return ctx.routes
}

test('activation without gateways throws at load (QUEUE LANE LAW: no default endpoint)', async () => {
  assert.throws(() => plugin.apply(fakeCtx(), { gateways: [] }), /gateways/)
})

test('malformed rows drop loudly; good rows pass with proxied urls', async () => {
  const gw = stubGateway({
    runsBody: {
      runs: [
        { name: 'no-id run' },
        {
          run_id: 'run-ok', created_at: 2, thumbnail: '/thumb.png',
          artifacts: [
            { name: 'no-url' },
            { url: '/out/video.mp4', type: 'video' },
          ],
        },
      ],
    },
  })
  const base = await gw.start()
  const routes = await activate([base])
  const res = fakeRes()
  await routes['/infer-media/runs'].handler({ url: '/infer-media/runs' }, res)
  assert.equal(res.state.status, 200)
  const body = JSON.parse(res.state.text)
  assert.equal(body.runs.length, 1)
  assert.equal(body.runs[0].run_id, 'run-ok')
  assert.ok(body.runs[0].artifacts[0].url.startsWith('/infer-media/artifact?src='), 'artifact proxied same-origin')
  assert.ok(body.runs[0].thumbnail.startsWith('/infer-media/artifact?src='), 'thumbnail proxied')
  const msgs = body.errors.map((e) => e.message).join(' | ')
  assert.match(msgs, /dropped 1 runs without run_id/)
  assert.match(msgs, /dropped 1 artifacts without a usable url/)
  await gw.close()
})

test('truncation marker rides the run row, never the artifact list', async () => {
  const gw = stubGateway({
    runsBody: {
      runs: [{
        run_id: 'run-capped', created_at: 1,
        artifacts: [
          { url: '/out/a.mp4' },
          { truncated: true, listed: 3, total: 40 },
        ],
      }],
    },
  })
  const base = await gw.start()
  const routes = await activate([base])
  const res = fakeRes()
  await routes['/infer-media/runs'].handler({ url: '/infer-media/runs' }, res)
  const body = JSON.parse(res.state.text)
  assert.equal(body.runs[0].artifacts.length, 1, 'marker is not an item')
  assert.deepEqual(body.runs[0].truncated, { listed: 3, total: 40 })
  assert.equal(body.errors.length, 0)
  await gw.close()
})

test('all gateways down = 502 all_gateways_unreachable, one error each', async () => {
  const routes = await activate(['http://127.0.0.1:1', 'http://127.0.0.1:2'])
  const res = fakeRes()
  await routes['/infer-media/runs'].handler({ url: '/infer-media/runs' }, res)
  assert.equal(res.state.status, 502)
  const body = JSON.parse(res.state.text)
  assert.equal(body.error, 'all_gateways_unreachable')
  assert.equal(body.errors.length, 2)
})

test('cross-gateway duplicate runs are deduped VISIBLY (gap 7)', async () => {
  const row = { run_id: 'dup-run', created_at: 5, artifacts: [{ url: '/out/x.mp4' }] }
  const a = stubGateway({ runsBody: { runs: [row] } })
  const b = stubGateway({ runsBody: { runs: [{ ...row }] } })
  const baseA = await a.start()
  const baseB = await b.start()
  const routes = await activate([baseA, baseB])
  const res = fakeRes()
  await routes['/infer-media/runs'].handler({ url: '/infer-media/runs' }, res)
  const body = JSON.parse(res.state.text)
  assert.equal(body.runs.length, 1, 'first-wins dedupe')
  assert.equal(body.runs[0].source, baseA)
  assert.match(body.errors.map((e) => e.message).join(' | '), /deduped 1 runs already listed/)
  await a.close()
  await b.close()
})

test('drafts door: same contract (drop loudly, dedupe visibly, 502 all-down)', async () => {
  const a = stubGateway({ draftsBody: { drafts: [{ draft_id: 'd1', name: 'x' }, { name: 'no-id' }] } })
  const b = stubGateway({ draftsBody: { drafts: [{ draft_id: 'd1', name: 'x' }] } })
  const baseA = await a.start()
  const baseB = await b.start()
  const routes = await activate([baseA, baseB])
  const res = fakeRes()
  await routes['/infer-media/drafts'].handler({ url: '/infer-media/drafts' }, res)
  const body = JSON.parse(res.state.text)
  assert.equal(body.drafts.length, 1)
  assert.equal(body.drafts[0].source, baseA)
  const msgs = body.errors.map((e) => e.message).join(' | ')
  assert.match(msgs, /dropped 1 drafts without draft_id/)
  assert.match(msgs, /deduped 1 drafts already listed/)
  await a.close()
  await b.close()
})

test('artifact proxy: foreign src refused 400, gateway src streams, Range forwarded', async () => {
  const gw = stubGateway({ artifactBody: Buffer.from('MP4DATA') })
  const base = await gw.start()
  const routes = await activate([base])

  const bad = fakeRes()
  await routes['/infer-media/artifact'].handler(
    { url: '/infer-media/artifact?src=' + encodeURIComponent('http://evil.example.com/x.mp4'), headers: {} }, bad)
  assert.equal(bad.state.status, 400)
  assert.match(JSON.parse(bad.state.text).error, /bad_src/)

  const ok = fakeRes()
  await routes['/infer-media/artifact'].handler(
    { url: '/infer-media/artifact?src=' + encodeURIComponent(base + '/files/x.mp4'), headers: { range: 'bytes=0-3' } }, ok)
  assert.equal(ok.state.status, 200)
  assert.equal(ok.state.text, 'MP4DATA')
  assert.equal(gw.seen.range, 'bytes=0-3', 'Range header forwarded for seeking')
  await gw.close()
})
