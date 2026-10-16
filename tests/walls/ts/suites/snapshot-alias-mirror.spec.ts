/**
 * THE SNAPSHOT ALIAS MIRROR (audit-followups M6, 2026-11-06): the
 * snapshot tier's react/gateway aliases are a MIRROR of the
 * battery's dom project — narrated as mirrored, never judged. A
 * future dom-riding scenario needing the NEXT alias (react-dom/client
 * is mirrored in vitest.config.ts but not here) reds at import with
 * no wall naming the law.
 *
 * This wall executes BOTH configs (the real entry path — no text
 * re-parse) and judges the mirror against its source:
 * 1. every mirrored alias target EXISTS on disk (a dangle fails
 *    loud, but the law gets a home);
 * 2. the react pair EQUALS the dom project's card-view-rooted
 *    copies after realpath (one React for the snapshot lane is the
 *    same one React the battery pins — the dual-React trap).
 */
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import snapshotConfig from '../../../../vitest.snapshot.config.ts'
import batteryConfig from '../../../../vitest.config.ts'

// the MIRROR set — the keys the dom project itself pins. The
// snapshot lane's @testing-library/react pin is lane-specific (the
// scenarios render outside the card-view package root; the battery's
// dom project resolves it through node resolution) — it rides the
// existence arm only, never the equality arm.
const MIRRORED_KEYS = [
  'react',
  'react-dom',
  'react/jsx-runtime',
] as const

type AliasMap = Record<string, unknown>

function snapshotAliases(): AliasMap {
  const alias = (snapshotConfig as { resolve?: { alias?: AliasMap } }).resolve?.alias
  assert.ok(alias !== undefined, 'the snapshot config declares resolve.alias')
  return alias
}

function domAliases(): AliasMap {
  const projects = (batteryConfig as { test?: { projects?: Array<Record<string, unknown>> } }).test?.projects
  // the project's name rides ITS OWN test block (vitest.config.ts:340)
  const dom = (projects ?? []).find((p) => (p['test'] as { name?: string } | undefined)?.['name'] === 'dom')
  assert.ok(dom !== undefined, 'the battery declares the dom project')
  const alias = (dom.resolve as { alias?: AliasMap } | undefined)?.alias
  assert.ok(alias !== undefined, 'the dom project declares resolve.alias')
  return alias
}

describe('the snapshot tier mirrors the battery dom project exactly', () => {
  test('every mirrored alias target exists on disk', () => {
    const alias = snapshotAliases()
    for (const [key, target] of Object.entries(alias)) {
      assert.equal(typeof target, 'string', `${key} aliases a string`)
      const t = target as string
      assert.equal(isAbsolute(t), true, `${key} aliases an absolute path (${t})`)
      // a subpath alias (react/jsx-runtime) lands on the .js file the
      // resolver completes — the bare spelling is the idiom both
      // configs share; existence judges the completed path
      assert.equal(existsSync(t) || existsSync(t + '.js'), true, `${key} dangles: ${t} (+ .js) does not exist`)
    }
  })

  test('the react mirror equals the dom project’s copies (one React, realpath-equal)', () => {
    const snap = snapshotAliases()
    const dom = domAliases()
    for (const key of MIRRORED_KEYS) {
      const s = snap[key]
      const d = dom[key]
      assert.equal(typeof s, 'string', `the snapshot mirror carries ${key}`)
      assert.equal(typeof d, 'string', `the dom project carries ${key}`)
      // subpath aliases complete to their .js file before realpath
      const realp = (t: string): string => realpathSync(existsSync(t) ? t : t + '.js')
      assert.equal(
        realp(s as string),
        realp(d as string),
        `${key}: the snapshot lane’s copy diverges from the battery’s pinned copy`,
      )
    }
  })

  test('the gateway stand-in points at the card-view tests fixture', () => {
    const t = snapshotAliases()['@deepseek-ai/dsh-api-gateway/client']
    assert.equal(typeof t, 'string', 'the gateway stand-in is declared')
    assert.match(t as string, /melite-card-view\/tests\/fixtures\/gateway-client\.ts$/, 'the stand-in is the card-view tests fixture')
    assert.equal(existsSync(t as string), true, 'the stand-in fixture exists')
  })
})
