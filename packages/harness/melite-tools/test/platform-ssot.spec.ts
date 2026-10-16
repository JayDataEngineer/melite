// platform-ssot (cruft index row 3.4, 2026-10-12; resealed 2026-10-16
// after the boot death): melite's PLATFORM_MODULES hand-copies the DSH
// shell's seed-table SSOT, and nothing enforced the copy — then wave 34
// "enforced" it against the WRONG FACE: the reconciliation arm compared
// the tracked list to the vendored upstream-MAIN mirror, which had
// gained `zod` + `@tanstack/react-virtual` after the last published
// release. The rebuild followed main, card-view externalized zod, and
// the next lane boot died on `require("zod") missed the module table`
// through three green full gates — the wall was green because its
// oracle chased a face the lanes never boot.
//
// Four teeth now:
// 1. the ALWAYS-ON census pins the tracked list's exact entries (an
//    accidental edit here is red whatever the reference state);
// 2. THE SEATED TABLE (the tooth that was missing): the tracked list is
//    asserted 1:1 against the seed-table literal in the seated shell's
//    SHIPPED FRONTEND BYTES — the map the browser loader actually
//    answers from. Wave 34's `zod` addition reds here by name. Skipped
//    only where the seated profile is absent (clean CI clones);
// 3. the RECONCILIATION arm still compares against the upstream mirror,
//    which may run AHEAD by exactly the LEDGERED PENDING_SHELL_WORDS —
//    upstream words the seated shell has not shipped yet. A word leaves
//    the ledger (and may join the tracked list) only after tooth 2
//    sees it in the seated bytes (a live boot receipt by construction);
// 4. the COMMITTED-BYTES REQUIRE CENSUS: every require target in every
//    committed lib/client.js must be a platform word or that package's
//    declared row external — the boot contract stated over the bytes
//    that actually serve (list membership alone is not seatability).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const MELITE_PLATFORM = join(REPO, 'packages', 'web', 'shared', 'web-platform.ts')
const DSH_SSOT = join(REPO, 'references', 'deepseek-harness', 'packages', 'client', 'web', 'src', 'platform.ts')

/** The seated DSH profile's shipped frontend (the browser loader's own
 *  bytes). Overridable for machines that seat the profile elsewhere. */
const SEATED_FRONTEND = process.env['DSH_SEATED_FRONTEND']
  ?? '/home/user/.dsh/profiles/web/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets'

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

/** Parse the seed-table literal out of the seated frontend's minified
 *  bundle: the object mapping platform words to their module instances
 *  (`{react:E,"react/jsx-runtime":I,...}`). The anchor is the one word
 *  that cannot be a bare JS key — "react/jsx-runtime" — and the region
 *  is bounded by the `return{` before it and the closing `}` after. */
const parseSeatedTable = (assetsDir: string): string[] => {
  const files = readdirSync(assetsDir).filter((f) => f.startsWith('index-') && f.endsWith('.js'))
  assert.ok(files.length > 0, `${assetsDir}: no shipped index-*.js to read the seed table from`)
  const words = new Set<string>()
  for (const file of files) {
    const src = readFileSync(join(assetsDir, file), 'utf8')
    const anchor = src.indexOf('"react/jsx-runtime"')
    if (anchor === -1) continue
    const start = src.lastIndexOf('return{', anchor)
    const end = src.indexOf('}', anchor)
    assert.ok(start !== -1 && end !== -1, `${file}: seed-table literal found but unparseable`)
    const body = src.slice(start, end)
    for (const m of body.matchAll(/"([^"]+)"\s*:/g)) words.add(m[1]!)
    for (const m of body.matchAll(/([{,])([A-Za-z_$][\w$]*)\s*:/g)) words.add(m[2]!)
  }
  assert.ok(words.has('react') && words.has('@deepseek-ai/cordis') && words.has('@deepseek-ai/dsh-client-ui-primitives'),
    'the seated seed table parsed without its core words — refusing a vacuous compare')
  return [...words]
}

/** Upstream-main words the SEATED shell has not shipped. The mirror
 *  may run ahead by exactly this set; a word joins the tracked list
 *  only after the seated-table tooth sees it in the shipped bytes. */
const PENDING_SHELL_WORDS: readonly string[] = [
  // gained upstream after the 0.2.0-rc.2 publish; externalizing either
  // today reproduces the 2026-10-16 card-view boot death
  'zod',
  '@tanstack/react-virtual',
]

/** Walk every workspace package (packages/<group>/<name> and
 *  packages/<name>) and yield its bundle + declared row externals when
 *  the package ships a browser bundle. */
function* committedClientBundles(): Generator<{ pkg: string; bundle: string; rowExternals: string[] }> {
  const groups = readdirSync(join(REPO, 'packages'), { withFileTypes: true })
  for (const group of groups) {
    if (!group.isDirectory() || group.name === 'node_modules' || group.name.startsWith('.')) continue
    const groupDir = join(REPO, 'packages', group.name)
    const manifestOf = (dir: string): { pkg: string; bundle: string; rowExternals: string[] } | null => {
      const manifest = join(dir, 'package.json')
      const bundle = join(dir, 'lib', 'client.js')
      if (!existsSync(manifest) || !existsSync(bundle)) return null
      let rows: string[] = []
      try {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { dsh?: { client?: { external?: string[] } } }
        rows = parsed.dsh?.client?.external ?? []
      } catch { /* unreadable manifests surface in their own package gates */ }
      return { pkg: dir, bundle, rowExternals: rows }
    }
    const direct = manifestOf(groupDir)
    if (direct !== null) yield direct
    for (const pkg of readdirSync(groupDir, { withFileTypes: true })) {
      if (!pkg.isDirectory() || pkg.name === 'node_modules' || pkg.name.startsWith('.')) continue
      const found = manifestOf(join(groupDir, pkg.name))
      if (found !== null) yield found
    }
  }
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

  describe.skipIf(!existsSync(SEATED_FRONTEND))('the seated table (the shipped frontend is present on this machine)', () => {
    test("the tracked list IS the seated shell's seed table — 1:1 with the bytes the browser loader answers from", () => {
      const tracked = parsePlatformModules(MELITE_PLATFORM)
      const seated = parseSeatedTable(SEATED_FRONTEND)
      const unSeated = tracked.filter((w) => !seated.includes(w))
      const unTracked = seated.filter((w) => !tracked.includes(w))
      assert.deepEqual(unSeated, [],
        'tracked words the seated shell does not seed — these died at boot on 2026-10-16 '
        + `(externalized requires the frozen table cannot answer): ${unSeated.join(', ')}`)
      assert.deepEqual(unTracked, [],
        `seated words the tracked list misses (inlining duplicates of them): ${unTracked.join(', ')}`)
    })
  })

  describe.skipIf(!existsSync(DSH_SSOT))('reconciliation (the vendored DSH checkout is present)', () => {
    test('the mirror runs ahead of the tracked list by exactly PENDING_SHELL_WORDS — no more, no fewer', () => {
      const tracked = new Set(parsePlatformModules(MELITE_PLATFORM))
      const mirror = new Set(parsePlatformModules(DSH_SSOT))
      const ledger = new Set(PENDING_SHELL_WORDS)
      const unLedgeredAhead = [...mirror].filter((w) => !tracked.has(w) && !ledger.has(w))
      const staleLedger = [...ledger].filter((w) => !mirror.has(w) || tracked.has(w))
      assert.deepEqual(unLedgeredAhead, [],
        'upstream words the ledger does not name (seat them via the seated-table tooth or ledger them): '
        + unLedgeredAhead.join(', '))
      assert.deepEqual(staleLedger, [],
        'ledger entries the mirror no longer carries (or that already joined the tracked list) — retire them: '
        + staleLedger.join(', '))
    })
  })

  test('the committed-bytes require census: every shipped client bundle requires only seated words (the boot contract over the bytes that serve)', () => {
    const platform = new Set(parsePlatformModules(MELITE_PLATFORM))
    let judged = 0
    for (const { pkg, bundle, rowExternals } of committedClientBundles()) {
      const allowed = new Set([...platform, ...rowExternals])
      const code = readFileSync(bundle, 'utf8')
      const offenders = new Set<string>()
      for (const m of code.matchAll(/\brequire\((['"])([^'"]+)\1\)/g)) {
        const spec = m[2]!
        if (spec.startsWith('./') || spec.startsWith('../')) continue
        if (!allowed.has(spec)) offenders.add(spec)
      }
      const rel = bundle.slice(REPO.length + 1)
      assert.deepEqual([...offenders], [],
        `${rel} requires words the frozen module table cannot answer (${[...offenders].join(', ')}) — `
        + `this is the 2026-10-16 boot-death class: inline the dependency or seat the word, never externalize silently `
        + `(package: ${pkg})`)
      judged += 1
    }
    assert.ok(judged >= 8, `the census must judge the served bundles (found ${judged}) — a vacuous walk is a green over nothing`)
  })
})
