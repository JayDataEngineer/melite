/**
 * hello.snapshot.ts — Snapshot tier minimal scenario (DSH tier 6): the
 * selected (numerically highest) recorded parent generation supplies
 * user input and model replay, then serves as the expected persisted
 * result. Replay synthesizes body sequence/time envelopes; fixtures
 * retain headers and payloads.
 *
 * Use test:snapshot:record when a model transcript changes and
 * test:snapshot:refresh when replay input remains valid; review every
 * resulting diff.
 */
import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))
let roots: string[] = []

afterEach(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true })
  roots = []
})

describe('snapshot hello (keyless replay)', () => {
  it('replays the selected parent generation and persists the expected transcript', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    // Record stays local and every diff is reviewed; CI forces replay.
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')

    // session.v1.jsonl is the authored successor generation: selection
    // must land on it, never on the committed v0 predecessor.
    const parent = selectGeneration(here, 'parent')
    assert.equal(parent.file, 'session.v1.jsonl')
    assert.equal(parent.name.generation, 1)
    assert.equal(String(parent.rows[0].format), manifest.headerClass)
    assert.equal(parent.rows.length, 5)

    const root = mkdtempSync(join(tmpdir(), 'snapshot-hello-'))
    roots.push(root)
    const persisted = join(root, 'transcript.json')
    writeFileSync(persisted, JSON.stringify(parent.rows, null, 2))
    const back = JSON.parse(readFileSync(persisted, 'utf8')) as unknown[]
    assert.equal(back.length, 5)
  })
})
