// gateway.test.ts — the wiring helpers against a stub door, pinning
// the REAL route shapes (routes.ts template /v1/flows/runs/{run_id};
// ASSET_URL_PREFIX /v1/assets/runs/<run>/<rel>; artifacts are rel
// paths in the status body).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { assetUrl, fetchRunStatus, runStatusPath, RunDoorError } from '../src/gateway.ts'

test('runStatusPath is the routes.ts template', () => {
  assert.equal(runStatusPath('r_9'), '/v1/flows/runs/r_9')
  assert.equal(runStatusPath('a b'), '/v1/flows/runs/a%20b')
})

test('assetUrl composes ASSET_URL_PREFIX/run/rel (slash-safe encode of rel segments)', () => {
  assert.equal(
    assetUrl('http://g:1/', 'r_9', 'out/image 1.png'),
    'http://g:1/v1/assets/runs/r_9/out/image%201.png',
  )
})

test('fetchRunStatus returns the named-explicit status body', async () => {
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
  try {
    const body = await fetchRunStatus(`http://127.0.0.1:${port}`, 'r_9')
    assert.equal(hit, '/v1/flows/runs/r_9')
    assert.equal(body.status, 'completed')
    assert.deepEqual(body.artifacts, ['out/img.png'])
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})

test('a 404 run door raises RunDoorError carrying the named refusal', async () => {
  const srv = createServer((_req, res) => {
    res.statusCode = 404
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'unknown run_id' }))
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  try {
    await assert.rejects(
      fetchRunStatus(`http://127.0.0.1:${port}`, 'nope'),
      (e: unknown) => e instanceof RunDoorError && e.status === 404 && e.named === 'unknown run_id',
    )
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})
