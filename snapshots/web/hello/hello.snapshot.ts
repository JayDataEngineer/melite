/**
 * @vitest-environment happy-dom
 * Web snapshot scenario (DSH tier 7; lane debt: happy-dom, not yet a
 * real Chromium — see vitest.web.config.ts). CI forces read-only
 * DSH_SNAPSHOT=replay, never writing expected outputs; record/refresh
 * stay local and every diff is reviewed. This scenario owns no local
 * fixture: it borrows the canonical session from snapshots/session/hello
 * (declared as `borrows` in its snapshot.yml) and reads the owner's
 * selected parent generation read-only.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsRoot = resolve(here, '..', '..')

describe('web hello (session-driven)', () => {
  it('renders the borrowed canonical session', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.ok(manifest.borrows, 'web scenario without a local fixture must declare borrows')

    const parent = selectGeneration(join(snapshotsRoot, manifest.borrows!), 'parent')
    const assistantText = parent.rows
      .filter((row) => row.type === 'assistant')
      .map((row) => String(row.text))
      .join('\n')
    assert.match(assistantText, /hello back/)

    document.body.innerHTML = '<p>hello back</p>'
    assert.equal(document.querySelector('p')?.textContent, 'hello back')
  })
})
