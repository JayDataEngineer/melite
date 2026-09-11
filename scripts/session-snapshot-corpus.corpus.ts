/**
 * Repository-wide ownership and storage invariants for the
 * recorded-session corpus — the Melife subset of DSH's corpus gate
 * (references/deepseek-harness/scripts/session-snapshot-corpus.corpus.ts):
 * every scenario declares a parseable snapshot.yml, every session
 * fixture follows the generation grammar, every session scenario
 * selects a parent whose header class matches its manifest, and a web
 * scenario without its own fixture borrows a declared canonical
 * session that exists.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  parseSessionFixtureName,
  parseSnapshotManifest,
  selectGeneration,
} from '../tests/snapshot-support/storage.ts'

const SNAPSHOTS = resolve(import.meta.dirname, '..', 'snapshots')

const profiles = ['session', 'web'] as const

function scenarioDirs(): { key: string; profile: string; dir: string }[] {
  const result: { key: string; profile: string; dir: string }[] = []
  for (const profile of profiles) {
    for (const entry of readdirSync(join(SNAPSHOTS, profile), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      result.push({ key: `${profile}/${entry.name}`, profile, dir: join(SNAPSHOTS, profile, entry.name) })
    }
  }
  return result
}

function manifestOf(key: string, dir: string) {
  const path = join(dir, 'snapshot.yml')
  assert.ok(existsSync(path), `${key}/snapshot.yml: missing`)
  return parseSnapshotManifest(readFileSync(path, 'utf8'), path)
}

describe('snapshot corpus (storage + ownership)', () => {
  const scenarios = scenarioDirs()

  it('has at least one scenario per profile', () => {
    for (const profile of profiles) {
      assert.ok(scenarios.some((s) => s.profile === profile), `no ${profile} scenarios`)
    }
  })

  it('every scenario declares a parseable snapshot.yml', () => {
    for (const s of scenarios) manifestOf(s.key, s.dir)
  })

  it('every session fixture filename follows the generation grammar', () => {
    for (const s of scenarios) {
      for (const file of readdirSync(s.dir)) {
        if (!file.endsWith('.jsonl')) continue
        assert.ok(parseSessionFixtureName(file) !== null, `${s.key}/${file}: filename outside the session grammar`)
      }
    }
  })

  it('every session scenario selects a parent whose header class matches the manifest', () => {
    for (const s of scenarios.filter((x) => x.profile === 'session')) {
      const manifest = manifestOf(s.key, s.dir)
      const parent = selectGeneration(s.dir, 'parent')
      assert.equal(
        String(parent.rows[0].format),
        manifest.headerClass,
        `${s.key}: selected ${parent.file} header class disagrees with snapshot.yml`,
      )
    }
  })

  it('a web scenario without its own fixture borrows a declared canonical session', () => {
    for (const s of scenarios.filter((x) => x.profile === 'web')) {
      const manifest = manifestOf(s.key, s.dir)
      const own = readdirSync(s.dir).some((f) => f.endsWith('.jsonl'))
      if (own) continue
      assert.ok(manifest.borrows, `${s.key}: no local session fixture and no borrows declaration`)
      const borrowed = join(SNAPSHOTS, manifest.borrows!)
      assert.ok(existsSync(borrowed), `${s.key}: borrows target ${manifest.borrows} does not exist`)
      // The borrowed generation selection must succeed read-only.
      selectGeneration(borrowed, 'parent')
    }
  })
})
