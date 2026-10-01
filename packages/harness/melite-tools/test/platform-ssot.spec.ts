// platform-ssot (cruft index row 3.4, 2026-10-12): melite's
// PLATFORM_MODULES hand-copies the DSH shell's seed-table SSOT, and
// nothing enforced the copy — the audit's row recorded "the contents
// match today and nothing enforces tomorrow." Two teeth now:
// the ALWAYS-ON census pins the tracked list's exact entries (an
// accidental edit here is red whatever the reference state), and
// the RECONCILIATION arm — skipped only where the vendored DSH
// checkout is absent (references/deepseek-harness is gitignored, so
// a clean clone carries no copy to compare against) — asserts the
// two lists are 1:1, which is the LAW 1 claim in web-platform.ts's
// own header. Importing the SSOT from the package instead would be
// the truer gate, but @deepseek-ai/dsh-client-web is in no manifest
// here and not installed: the platform words are runtime externals
// resolved by the DSH shell's frozen module table, never build-time
// dependencies of this repository.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const MELITE_PLATFORM = join(REPO, 'packages', 'web', 'shared', 'web-platform.ts')
const DSH_SSOT = join(REPO, 'references', 'deepseek-harness', 'packages', 'client', 'web', 'src', 'platform.ts')

/** Parse a `export const PLATFORM_MODULES = [ ... ] as const` literal
 *  into its quoted entries. Never returns an empty list silently: a
 *  file whose array cannot be read THROWS, because comparing two
 *  parse failures as "equal empties" would be a green over nothing
 *  (the same zero-list law the ship's typecheck net guards under). */
const parsePlatformModules = (path: string): string[] => {
  const src = readFileSync(path, 'utf8')
  const open = src.indexOf('export const PLATFORM_MODULES = [')
  const close = src.indexOf('] as const', open)
  assert.ok(open !== -1 && close !== -1, `${path}: no PLATFORM_MODULES array literal found`)
  const body = src.slice(open, close)
  const entries = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
  assert.ok(entries.length > 0, `${path}: the array literal parsed to zero entries — refusing to compare nothing`)
  return entries
}

describe('PLATFORM_MODULES (web-platform.ts vs the DSH SSOT)', () => {
  test('the tracked census: nine entries, exact order (an accidental edit is red with no reference needed)', () => {
    assert.deepEqual(parsePlatformModules(MELITE_PLATFORM), [
      'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-dockkit',
    ])
  })

  describe.skipIf(!existsSync(DSH_SSOT))('reconciliation (the vendored DSH checkout is present)', () => {
    test('the copy is 1:1 with the SSOT — LAW 1 in web-platform.ts holds', () => {
      assert.deepEqual(parsePlatformModules(MELITE_PLATFORM), parsePlatformModules(DSH_SSOT))
    })
  })
})
