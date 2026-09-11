/**
 * editor-dist.expected.e2e.ts — the editor-dist depth gate (migrated
 * 2026-09-11 from packages/web/melite-card-deck/test/editor-dist.test.mjs,
 * legacy node:test plane removal).
 *
 * The default EDITOR_DIST is FAMILY-RELATIVE from the built lib:
 * <pkg>/lib → packages/web → editor/dist. A wrong '..' count resolves
 * to a nonexistent directory and /editor 404s at runtime while boot
 * stays silent. Two arms:
 *
 *   static (always runs) — pins the two-level resolution in
 *   src/index.ts, so the '..' count cannot drift without failing;
 *   built (runs when built output exists) — resolves exactly like the
 *   source and asserts the real index.html. Keyless CI without a build
 *   runs the static arm; the built arm is build-gated, not key-gated.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..', '..')
const SRC = join(ROOT, 'packages', 'web', 'melite-card-deck', 'src', 'index.ts')
const LIB = join(ROOT, 'packages', 'web', 'melite-card-deck', 'lib', 'index.js')
const DIST_INDEX = join(ROOT, 'packages', 'web', 'editor', 'dist', 'index.html')

const BUILT = existsSync(LIB) && existsSync(DIST_INDEX)

describe('editor-dist depth gate', () => {
  it('src resolves the dist two levels above the built lib', () => {
    const src = readFileSync(SRC, 'utf8')
    assert.match(src, /path\.resolve\(\s*here,\s*'\.\.',\s*'\.\.',\s*'editor',\s*'dist'\s*\)/)
  })

  it.runIf(BUILT)('built default lands on the real editor dist', () => {
    const libReal = realpathSync(LIB)
    const distDefault = resolve(dirname(libReal), '..', '..', 'editor', 'dist')
    assert.equal(
      existsSync(distDefault + '/index.html'),
      true,
      `expected ${distDefault}/index.html — the '..' count in src/index.ts EDITOR_DIST drifted`,
    )
  })
})
