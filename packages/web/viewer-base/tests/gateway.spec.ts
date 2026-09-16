// gateway.spec.ts — the wiring helpers against a stub door, pinning
// the REAL route shapes (routes.ts template /v1/flows/runs/{run_id};
// ASSET_URL_PREFIX /v1/assets/runs/<run>/<rel>; artifacts are rel
// paths in the status body).
import { test } from 'vitest'
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

test('a bare 500 raises RunDoorError with an empty name (message without a colon tail)', async () => {
  const srv = createServer((_req, res) => {
    res.statusCode = 500
    res.setHeader('content-type', 'text/plain')
    res.end('boom')
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  try {
    await assert.rejects(
      fetchRunStatus(`http://127.0.0.1:${port}`, 'r_9'),
      (e: unknown) => e instanceof RunDoorError && e.status === 500 && e.named === '' && e.message === 'run door 500',
    )
    const named = new RunDoorError(404, 'unknown run_id')
    assert.equal(named.message, 'run door 404: unknown run_id')
    assert.equal(named.status, 404)
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})

test('a nameless JSON refusal still raises (the absent error rides empty)', async () => {
  const srv = createServer((_req, res) => {
    res.statusCode = 403
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({}))
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  const { port } = srv.address() as AddressInfo
  try {
    await assert.rejects(
      fetchRunStatus(`http://127.0.0.1:${port}`, 'r_9'),
      (e: unknown) => e instanceof RunDoorError && e.status === 403 && e.named === '',
    )
  } finally {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})
