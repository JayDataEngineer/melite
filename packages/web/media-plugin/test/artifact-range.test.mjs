/**
 * artifact-range.test.mjs — pins the video-seek fix (2026-09-01).
 *
 * The /infer-media/artifact proxy used to swallow the browser's Range
 * header and buffer the whole file — <video controls> could play but
 * never seek. The fix forwards Range upstream and streams back the
 * upstream status (206), content-range, and accept-ranges.
 *
 * This drives the REAL lib/index.js apply() handler with a stub cordis
 * ctx and a real node:http upstream that implements Range — no DOM, no
 * DSH boot. If the proxy regresses to whole-file buffering or drops the
 * Range header, these assertions fail.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { apply } from '../lib/index.js'

const UPSTREAM_BODY = Buffer.alloc(4096, 7) // 4 KiB of fixed bytes

function bootUpstream() {
  const server = http.createServer((req, res) => {
    const range = req.headers.range
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range)
      if (!m) { res.writeHead(416); res.end(); return }
      const start = Number(m[1])
      const end = m[2] === '' ? UPSTREAM_BODY.length - 1 : Math.min(Number(m[2]), UPSTREAM_BODY.length - 1)
      const slice = UPSTREAM_BODY.subarray(start, end + 1)
      res.writeHead(206, {
        'content-type': 'video/mp4',
        'content-length': String(slice.length),
        'content-range': `bytes ${start}-${end}/${UPSTREAM_BODY.length}`,
        'accept-ranges': 'bytes',
      })
      res.end(slice)
      return
    }
    res.writeHead(200, {
      'content-type': 'video/mp4',
      'content-length': String(UPSTREAM_BODY.length),
      'accept-ranges': 'bytes',
    })
    res.end(UPSTREAM_BODY)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, origin: `http://127.0.0.1:${port}` })
    })
  })
}

/** Stub cordis ctx: executes effects immediately, records registered routes. */
function stubCtx() {
  const routes = new Map()
  return {
    routes,
    logger: { info() {} },
    effect(fn) { fn() },
    webServer: { register(r) { routes.set(r.path, r.handler) } },
  }
}

/** Minimal req/res recorder pair. */
function fakeReq(url, headers = {}) {
  return { url, headers }
}
function fakeRes() {
  const res = {
    status: 0, headers: {}, chunks: [], ended: false,
    writeHead(code, hdrs) { res.status = code; res.headers = hdrs || {} },
    write(b) { res.chunks.push(Buffer.from(b)) },
    end(b) { if (b) res.chunks.push(Buffer.from(b)); res.ended = true },
  }
  res.body = () => Buffer.concat(res.chunks)
  return res
}

test('artifact proxy: Range request → 206 + content-range + accept-ranges', async () => {
  const up = await bootUpstream()
  const ctx = stubCtx()
  apply(ctx, { gateways: [up.origin] })
  const handler = ctx.routes.get('/infer-media/artifact')
  assert.ok(handler, 'artifact route registered')

  const src = encodeURIComponent(up.origin + '/clip.mp4')
  const res = fakeRes()
  await handler(fakeReq(`/infer-media/artifact?src=${src}`, { range: 'bytes=0-1023' }), res)

  assert.equal(res.status, 206, 'must return 206 Partial Content, got ' + res.status)
  assert.equal(res.headers['accept-ranges'], 'bytes', 'must advertise accept-ranges')
  assert.equal(res.headers['content-range'], `bytes 0-1023/${UPSTREAM_BODY.length}`)
  assert.equal(res.body().length, 1024, 'body must be exactly the requested slice')
  up.server.close()
})

test('artifact proxy: no Range → 200 with full body', async () => {
  const up = await bootUpstream()
  const ctx = stubCtx()
  apply(ctx, { gateways: [up.origin] })
  const handler = ctx.routes.get('/infer-media/artifact')

  const src = encodeURIComponent(up.origin + '/clip.mp4')
  const res = fakeRes()
  await handler(fakeReq(`/infer-media/artifact?src=${src}`), res)

  assert.equal(res.status, 200)
  assert.equal(res.body().length, UPSTREAM_BODY.length)
  up.server.close()
})

test('artifact proxy: mid-file Range slice passes through verbatim', async () => {
  const up = await bootUpstream()
  const ctx = stubCtx()
  apply(ctx, { gateways: [up.origin] })
  const handler = ctx.routes.get('/infer-media/artifact')

  const src = encodeURIComponent(up.origin + '/clip.mp4')
  const res = fakeRes()
  await handler(fakeReq(`/infer-media/artifact?src=${src}`, { range: 'bytes=100-199' }), res)

  assert.equal(res.status, 206)
  assert.equal(res.headers['content-range'], `bytes 100-199/${UPSTREAM_BODY.length}`)
  assert.equal(res.body().length, 100)
  assert.deepEqual(res.body(), UPSTREAM_BODY.subarray(100, 200))
  up.server.close()
})

test('artifact proxy: non-gateway src rejected 400', async () => {
  const up = await bootUpstream()
  const ctx = stubCtx()
  apply(ctx, { gateways: [up.origin] })
  const handler = ctx.routes.get('/infer-media/artifact')

  const src = encodeURIComponent('http://evil.example.com/clip.mp4')
  const res = fakeRes()
  await handler(fakeReq(`/infer-media/artifact?src=${src}`), res)

  assert.equal(res.status, 400, 'non-gateway src must be refused')
  up.server.close()
})
