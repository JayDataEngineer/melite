// The editor-dist depth gate (2026-09-10). The default EDITOR_DIST is
// FAMILY-RELATIVE from the built lib: <pkg>/lib → packages/web →
// editor/dist. A wrong '..' count resolves to a nonexistent directory
// and /editor 404s at runtime while boot stays silent — this gate
// fails the build instead. (Restores the depth assertion the deleted
// tests/test_web_family.py once carried.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, realpathSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// from test/ → package root's built lib
const lib = resolve(here, '..', 'lib', 'index.js')
const libReal = realpathSync(lib)
const distDefault = resolve(dirname(libReal), '..', '..', 'editor', 'dist')

test('default EDITOR_DIST depth lands on the real editor dist', () => {
  assert.equal(existsSync(distDefault + '/index.html'), true,
    `expected ${distDefault}/index.html — the '..' count in src/index.ts EDITOR_DIST drifted`)
})
