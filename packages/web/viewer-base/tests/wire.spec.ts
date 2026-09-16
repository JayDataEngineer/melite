// wire.spec.ts — the run-scoped proxy URL facts, spelled once and
// pinned once: the client half polls/fetches these same-origin
// routes, the host half serves them.
import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  ASSET_ROUTE_PREFIX,
  RUN_ROUTE_PREFIX,
  assetProxyUrl,
  runProxyUrl,
} from '../src/wire.ts'

test('the proxy prefixes are run-scoped (one pair for every run card)', () => {
  assert.equal(RUN_ROUTE_PREFIX, '/melite-viewer/run/')
  assert.equal(ASSET_ROUTE_PREFIX, '/melite-viewer/asset/')
})

test('runProxyUrl encodes the run id', () => {
  assert.equal(runProxyUrl('r 9'), '/melite-viewer/run/r%209')
})

test('assetProxyUrl encodes the run id and every rel segment, never the slashes', () => {
  assert.equal(
    assetProxyUrl('r_9', 'out/image 1.png'),
    '/melite-viewer/asset/r_9/out/image%201.png',
  )
})
