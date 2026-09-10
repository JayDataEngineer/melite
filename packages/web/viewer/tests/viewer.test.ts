// THE GATEWAY KILL (2026-09-10): proxyDoor's lane far side is dead.
// These tests pin the kill voice — every proxy answers 502 LOUD
// (estate_killed + the path) until the viewer rides named remotes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { proxyDoor } from '../src/index.ts'
import type { Context } from '@deepseek-ai/cordis'

const makeCtx = (): Context => ({ runtime: {} }) as unknown as Context

interface Captured {
  status: number
  headers: Record<string, string>
  body: string | Buffer
}

async function capture(path: string, json: boolean): Promise<Captured[]> {
  const got: Captured[] = []
  await proxyDoor(makeCtx(), path, json,
    (status, headers, body) => { got.push({ status, headers, body }) })
  return got
}

test('proxyDoor answers 502 estate_killed for a run-status path', async () => {
  const got = await capture('/v1/flows/runs/r_9', true)
  assert.equal(got.length, 1)
  assert.equal(got[0]!.status, 502)
  const parsed = JSON.parse(String(got[0]!.body)) as { error: string; path: string }
  assert.equal(parsed.error, 'estate_killed')
  assert.equal(parsed.path, '/v1/flows/runs/r_9')
})

test('proxyDoor answers 502 estate_killed for an asset path', async () => {
  const got = await capture('/v1/assets/runs/r_9/out/img.png', false)
  assert.equal(got.length, 1)
  assert.equal(got[0]!.status, 502)
  const parsed = JSON.parse(String(got[0]!.body)) as { error: string }
  assert.equal(parsed.error, 'estate_killed')
})
