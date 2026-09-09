// viewer.test.ts — the run-viewer composition's proxy doors against
// a stub gateway: the route shapes (run-scoped, no card prefix), the
// JSON pass-through, the byte pass-through, and the 404 arm.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { proxyDoor } from '../src/index.ts'

interface Captured {
  status: number
  headers: Record<string, string>
  body: string | Buffer
}

test('proxyDoor passes a run-status JSON body through verbatim', async () => {
  let hit = ''
  const srv = createServer((req, res) => {
    hit = req.url ?? ''
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      run_id: 'r_9', status: 'completed', stages: [], skipped_stages: [],
      artifacts: ['out/img.png'], error: '', queue_position: 0,
    }))
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  const got: Captured[] = []
  try {
    await proxyDoor(`http://127.0.0.1:${port}`, '/v1/flows/runs/r_9', true,
      (status, headers, body) => { got.push({ status, headers, body }) })
    assert.equal(hit, '/v1/flows/runs/r_9')
    assert.equal(got.length, 1)
    assert.equal(got[0]!.status, 200)
    const parsed = JSON.parse(String(got[0]!.body)) as { artifacts: string[] }
    assert.deepEqual(parsed.artifacts, ['out/img.png'])
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})

test('proxyDoor streams asset bytes with the upstream content type', async () => {
  const srv = createServer((req, res) => {
    res.setHeader('content-type', 'image/png')
    res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  try {
    const got: Captured[] = []
    await proxyDoor(`http://127.0.0.1:${port}`, '/v1/assets/runs/r_9/out/img.png', false,
      (status, headers, body) => { got.push({ status, headers, body }) })
    assert.equal(got[0]!.status, 200)
    assert.equal(got[0]!.headers['content-type'], 'image/png')
    assert.equal(Buffer.from(got[0]!.body as Buffer).byteLength, 4)
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})

test('proxyDoor surfaces an unreachable gateway as 502 gateway_unreachable', async () => {
  const got: Captured[] = []
  await proxyDoor('http://127.0.0.1:1', '/v1/flows/runs/x', true,
    (status, headers, body) => { got.push({ status, headers, body }) })
  assert.equal(got[0]!.status, 502)
  const parsed = JSON.parse(String(got[0]!.body)) as { error: string }
  assert.equal(parsed.error, 'gateway_unreachable')
})

test('proxyDoor passes an upstream 404 status through (the unknown-run arm)', async () => {
  const srv = createServer((_req, res) => {
    res.statusCode = 404
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'unknown run_id' }))
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  try {
    const got: Captured[] = []
    await proxyDoor(`http://127.0.0.1:${port}`, '/v1/flows/runs/nope', true,
      (status, _headers, body) => { got.push({ status, headers: {}, body }) })
    assert.equal(got[0]!.status, 404)
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})
