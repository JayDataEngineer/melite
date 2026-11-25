import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TIER_INPUTS, carryDecision, expandGlobs, globMatch, hashTree, loadLeases, rmTree, tierGlobs,
} from '../../../../tools/battery-leases.mjs'

/**
 * THE TIER-LEASE LAW (operator order 2026-11-17: "FIX THE PIPELINE
 * NOW"). The battery's tiers carry prior greens when the inputs they
 * judge are unchanged. A lease that carries a tier whose inputs
 * CHANGED is a silent gate bypass — the exact class the operator
 * burned on. This wall owns both directions plus the disjointness
 * that makes the carry sound: the three expensive tiers judge
 * disjoint spec trees, so a cure in one plane must never ride (or
 * needlessly re-fire) another's green.
 */
describe('battery-leases: hash sensitivity — the carry key must move with the judged surface', () => {
  function fabricate(): string {
    const root = mkdtempSync(join(tmpdir(), 'battery-lease-'))
    mkdirSync(join(root, 'tests/e2e'), { recursive: true })
    mkdirSync(join(root, 'packages/web/melite-card-view/e2e'), { recursive: true })
    writeFileSync(join(root, 'tests/e2e/row.spec.ts'), 'row one\n')
    writeFileSync(join(root, 'packages/web/melite-card-view/e2e/leaf.spec.ts'), 'leaf one\n')
    writeFileSync(join(root, 'unjudged.txt'), 'not in any glob\n')
    return root
  }
  const E2E = ['tests/e2e/**']

  it('a judged file edit moves the hash', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'tests/e2e/row.spec.ts'), 'row one EDITED\n')
      expect(hashTree(root, E2E)).not.toBe(before)
    } finally { rmTree(root) }
  })

  it('a judged file rename moves the hash (the file set is keyed, not just contents)', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'tests/e2e/renamed.spec.ts'), 'row one\n')
      writeFileSync(join(root, 'tests/e2e/row.spec.ts'), '')
      expect(hashTree(root, E2E)).not.toBe(before)
    } finally { rmTree(root) }
  })

  it('an unjudged file change does NOT move the hash (the carry is sound: unrelated edits fire nothing)', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'unjudged.txt'), 'changed but nobody judges it\n')
      writeFileSync(join(root, 'packages/web/melite-card-view/e2e/leaf.spec.ts'), 'leaf one EDITED\n')
      expect(hashTree(root, E2E)).toBe(before)
    } finally { rmTree(root) }
  })
})

describe('battery-leases: the carry/fire decision table — only a green lease on the SAME hash carries', () => {
  it('green lease + same hash → carry', () => {
    expect(carryDecision({ status: 'green', hash: 'abc' }, 'abc')).toBe('carry')
  })
  it('green lease + different hash → fire (the burn class: inputs outgrew the green)', () => {
    expect(carryDecision({ status: 'green', hash: 'abc' }, 'def')).toBe('fire')
  })
  it('red lease → fire even on the same hash (a flake may never ride its own stale green)', () => {
    expect(carryDecision({ status: 'red', hash: 'abc' }, 'abc')).toBe('fire')
  })
  it('missing or malformed lease → fire (the store is a cache, never a source of truth)', () => {
    expect(carryDecision(null, 'abc')).toBe('fire')
    expect(carryDecision(undefined, 'abc')).toBe('fire')
    expect(carryDecision('green' as unknown as null, 'abc')).toBe('fire')
    expect(carryDecision({ hash: 'abc' }, 'abc')).toBe('fire')
  })
})

describe('battery-leases: the store fails open — corrupt JSON fires every tier', () => {
  it('loadLeases on garbage answers {}', () => {
    const p = join(tmpdir(), `battery-lease-corrupt-${Date.now()}.json`)
    writeFileSync(p, '{not json')
    try {
      expect(loadLeases(p)).toEqual({})
    } finally { rmTree(p) }
  })
})

// THE LOAD LAW (2026-11-19, the push-kill): expandGlobs walks the
// whole tree once per tier, and the per-tier loops below paid it
// ~twenty times inside one 30s default window — under the full
// fleet's CPU load the battery red on a TIMEOUT over a green tree
// (the same suite runs inside CI's shared runners, which are
// slower still). The tree is frozen while a suite runs (vitest owns
// it), so each tier's expansion is computed ONCE and the heaviest
// arms carry explicit budgets; the judged invariants are unchanged.
const expanded = new Map<string, string[]>()
const filesFor = (id: string): string[] => {
  const cached = expanded.get(id)
  if (cached) return cached
  const files = expandGlobs(process.cwd(), tierGlobs(id))
  expanded.set(id, files)
  return files
}

describe('battery-leases: the tier table — conservative inputs, self-keyed, disjoint spec trees', () => {
  it('every declared tier has a non-empty input set', () => {
    for (const [id, globs] of Object.entries(TIER_INPUTS)) {
      expect(globs.length, `tier ${id} judges nothing — a leased tier with no inputs would carry forever`).toBeGreaterThan(0)
    }
  })

  it('the self-input law: the battery scripts, the lockfile, and the ROOT CONTROL FILES key EVERY tier (a battery or root-wiring rework invalidates every lease)', () => {
    const SELF = ['tools/hook-full-battery.mjs', 'tools/battery-leases.mjs', 'pnpm-lock.yaml', 'package.json', 'tsconfig*.json', '.github/workflows/**']
    for (const id of Object.keys(TIER_INPUTS)) {
      for (const s of SELF) {
        expect(tierGlobs(id), `tier ${id} must self-key ${s}`).toContain(s)
      }
    }
    // The widened self-set expands on the real tree: every tier hashes
    // the root package.json + at least one root tsconfig + at least one
    // workflow file (a glob that matches nothing is a dead self-key).
    for (const id of Object.keys(TIER_INPUTS)) {
      const files = filesFor(id)
      expect(files.some((f) => f === 'package.json'), `tier ${id} hashes the root package.json`).toBe(true)
      expect(files.some((f) => /tsconfig[^/]*\.json$/.test(f) && !f.includes('/')), `tier ${id} hashes a root tsconfig`).toBe(true)
      expect(files.some((f) => f.startsWith('.github/workflows/')), `tier ${id} hashes the workflow tree`).toBe(true)
    }
  }, 120_000)

  it('THE DISJOINTNESS (the 24h burn class): the e2e tier judges no browser spec and the browser tier judges no e2e row — a cure in one plane never rides the other green', () => {
    const e2eFiles = filesFor('e2e')
    const browserFiles = filesFor('browser')
    expect(e2eFiles.some((f) => f.startsWith('packages/web/melite-card-view/e2e/')),
      'the e2e tier hashes browser specs — a browser cure would re-fire the GPU tier').toBe(false)
    expect(browserFiles.some((f) => f.startsWith('tests/e2e/')),
      'the browser tier hashes GPU rows — a GPU cure would re-fire the browser tier').toBe(false)
  })

  it('the big tiers hash real trees on this repo (a glob that matches nothing hashes nothing — that carries forever)', () => {
    for (const id of ['tsc', 'walls', 'e2e', 'browser', 'coverage', 'knip']) {
      const files = filesFor(id)
      expect(files.length, `tier ${id} matched zero files — its glob table drifted from the tree`).toBeGreaterThan(10)
    }
  }, 120_000)

  it('THE JUDGED-SURFACE LAW (pipeline audit 2026-11-17): every spec the e2e tier RUNS is hashed by its lease — the config includes are the truth, the glob table may never be narrower', () => {
    const cfg = readFileSync(join(process.cwd(), 'vitest.e2e.config.ts'), 'utf8')
    const include = cfg.match(/include:\s*\[([^\]]*)\]/s)
    expect(include, 'vitest.e2e.config.ts carries an include list').not.toBeNull()
    const patterns = [...include![1]!.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]!)
    expect(patterns.length).toBeGreaterThan(0)
    const lease = tierGlobs('e2e')
    const run = expandGlobs(process.cwd(), patterns)
    expect(run.length, 'the e2e config matched zero specs on this tree').toBeGreaterThan(10)
    const unhashed = run.filter((f) => !lease.some((g) => globMatch(g, f)))
    expect(unhashed,
      `the e2e tier RUNS but does not HASH (a green carry would ride an edit here):\n  ${unhashed.join('\n  ')}`).toEqual([])
  })

  it('THE JUDGED-SURFACE LAW, knip leg: every file knip can report on is hashed by the knip lease', () => {
    // The 2026-11-25 burn (CI 45492709450): a type twin added under
    // packages/harness/provisioner/bin/ grew knip's file count 1 over
    // budget, and the knip lease carried green — its row hashed src/
    // alone while knip judges every file of every admitted workspace.
    // The judge's own admission doors are the truth: the workspace
    // globs admit, knip.jsonc's ignoreWorkspaces exclude.
    const yaml = readFileSync(join(process.cwd(), 'pnpm-workspace.yaml'), 'utf8')
    const globs = [...yaml.matchAll(/^\s*-\s*['"]?([^'"\s#]+)/gm)].map((m) => m[1]!).filter((g) => !g.startsWith('!'))
    expect(globs.length, 'pnpm-workspace.yaml declares globs').toBeGreaterThan(3)
    const knipCfg = readFileSync(join(process.cwd(), 'knip.jsonc'), 'utf8')
    const ignoreBlock = knipCfg.match(/"ignoreWorkspaces":\s*\[([^\]]*)\]/s)
    const ignored = ignoreBlock ? [...ignoreBlock[1]!.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]!) : []
    const admitted = (f: string): boolean =>
      ignored.some((w) => f === w || f.startsWith(w.replace(/\/$/, '') + '/')) ? false
        : globs.some((g) => globMatch(g + '/**', f) || globMatch(g, f.slice(0, f.lastIndexOf('/'))))
    const judged = expandGlobs(process.cwd(), [...globs.map((g) => g + '/**'), ...globs]).filter(admitted)
    expect(judged.length, 'the admitted workspace surface matched zero files').toBeGreaterThan(500)
    const lease = tierGlobs('knip')
    const unhashed = judged.filter((f) => !lease.some((g) => globMatch(g, f)))
    expect(unhashed,
      `knip JUDGES but its lease does not HASH (a green carry would ride an edit here):\n  ${unhashed.slice(0, 25).join('\n  ')}`).toEqual([])
  }, 120_000)

  it('THE PACKAGE-CODE LAW (the 2026-11-25 burn): every tier that hashes a package\'s src/ hashes the bins and scripts beside it', () => {
    // A bin is code the tiers read: the typecheck wall resolves its type
    // twin, knip counts it, and suites import it (the lane-pairing
    // fence imports bin/infer-provision.mjs). The burn: a .d.mts under
    // packages/harness/provisioner/bin/ red both CI judges while every
    // leased tier carried a green.
    const srcTiers = Object.entries(TIER_INPUTS)
      .filter(([, gs]) => (gs as string[]).includes('packages/**/src/**')).map(([id]) => id)
    expect(srcTiers.length, 'some tier hashes packages/**/src/**').toBeGreaterThan(4)
    for (const id of srcTiers) {
      const gs = tierGlobs(id)
      for (const need of ['packages/**/bin/**', 'packages/**/scripts/**']) {
        expect(gs, `tier ${id} hashes src/ but not ${need} — a bin edit would ride its green`).toContain(need)
      }
    }
    // …and the widened rows find real files (a glob matching nothing
    // is a dead row that carries forever).
    for (const id of ['tsc', 'walls', 'knip']) {
      const files = filesFor(id)
      expect(files.some((f) => f.startsWith('packages/harness/provisioner/bin/')),
        `tier ${id} hashes the provisioner bin tree`).toBe(true)
    }
  }, 120_000)

  it('THE BUILD-OUTPUT RULE: a lib/dist directory is skipped only under a manifest, so a SOURCE folder named lib is hashed', () => {
    // The walker skipped any directory literally named lib or dist, at
    // any depth — which left tests/walls/ts/lib (the walls' own source
    // lib, imported by the suites) and scripts/lib (named by the
    // browser row's own globs) unhashed. The rule is "build output",
    // and build output is what a manifest owns.
    const root = mkdtempSync(join(tmpdir(), 'battery-lease-built-'))
    try {
      mkdirSync(join(root, 'pkg/lib'), { recursive: true })
      writeFileSync(join(root, 'pkg/package.json'), '{}\n')
      writeFileSync(join(root, 'pkg/lib/built.js'), 'build output\n')
      mkdirSync(join(root, 'src/lib'), { recursive: true })
      writeFileSync(join(root, 'src/lib/source.ts'), 'source\n')
      const files = expandGlobs(root, ['**/*'])
      expect(files, 'build output under a manifest stays out').not.toContain('pkg/lib/built.js')
      expect(files, 'a source folder named lib is an input').toContain('src/lib/source.ts')
    } finally { rmTree(root) }
  })

  it('THE GENERATED-OUTPUT RULE: coverage/test-results/__pycache__/.venv never key a lease (a run must not re-fire every tier)', () => {
    const root = mkdtempSync(join(tmpdir(), 'battery-lease-gen-'))
    try {
      for (const d of ['coverage', 'test-results', 'playwright-report', '__pycache__', '.venv/lib']) {
        mkdirSync(join(root, 'x', d), { recursive: true })
        writeFileSync(join(root, 'x', d, 'emitted.txt'), 'emitted\n')
      }
      writeFileSync(join(root, 'x/real.ts'), 'real\n')
      expect(expandGlobs(root, ['**/*'])).toEqual(['x/real.ts'])
    } finally { rmTree(root) }
  })


  it('THE JUDGED-SURFACE LAW, browser leg: both playwright legs\' spec trees are hashed by the browser lease', () => {
    const lease = tierGlobs('browser')
    const legs = [
      'packages/web/melite-card-view/e2e/**',
      'packages/web/melite-card-deck/e2e/**',
    ]
    const run = expandGlobs(process.cwd(), legs)
    expect(run.length, 'the two playwright legs matched zero specs on this tree').toBeGreaterThan(5)
    const unhashed = run.filter((f) => !lease.some((g) => globMatch(g, f)))
    expect(unhashed,
      `the browser tier RUNS but does not HASH (a green carry would ride an edit here):\n  ${unhashed.join('\n  ')}`).toEqual([])
  })

  it('THE DEAD-ROW LAW (pipeline audit 2026-11-17): every declared tier input is actually RUN — a declared-but-never-run row is a lease that never fires', () => {
    const battery = readFileSync(join(process.cwd(), 'tools/hook-full-battery.mjs'), 'utf8')
    // THE PRE-PUSH SEATS (push-pipeline rework, 2026-11-17): the
    // walls-node tier is the lefthook walls job's own lease — it
    // fires from tools/hook-walls-leased.mjs, not the battery. A
    // declared tier must be run by ONE named runner; a row no
    // runner invokes is a dead lease.
    const seats = readFileSync(join(process.cwd(), 'tools/hook-walls-leased.mjs'), 'utf8')
    for (const id of Object.keys(TIER_INPUTS)) {
      expect(battery.includes(`tier("${id}"`) || battery.includes(`"${id}"`) || battery.includes(`tier('${id}'`) || seats.includes(`"${id}"`),
        `tier ${id} is declared in TIER_INPUTS but neither the battery nor a pre-push seat runs it — delete the row or run the tier`).toBe(true)
    }
  })

  it('THE SHOW-ALL SHAPE (operator 2026-11-17: "A GOOD PIPELINE NEEDS TO BE RUN ONCE, THEN ALL ERRORS ARE SHOWING, ALL"): the report is the only exit door and every red tier lands in the ledger', () => {
    const battery = readFileSync(join(process.cwd(), 'tools/hook-full-battery.mjs'), 'utf8')
    // The exit seats: reportAndExit's own definition is the ONLY
    // process.exit in the file. A bare process.exit anywhere else is
    // the exit-ladder reborn.
    const exits = [...battery.matchAll(/process\.exit\(/g)]
    expect(exits.length, 'the battery must exit through exactly one door (reportAndExit) — found ' + exits.length).toBe(1)
    // The ledger is recorded before the decision to continue: tier()
    // pushes redTiers. A rework that drops the push shows all NO
    // errors and exits 0 — the worst lie.
    expect(battery.includes('redTiers.push'), 'tier() must record every red into the ledger before continuing').toBe(true)
    // And the report prints the ledger it collected.
    expect(/for \(const \{ id, tail \} of redTiers\)/.test(battery), 'the report must print every red tier with its tail').toBe(true)
  })

  it('THE NO-RETRY LAW (operator 2026-11-17: "RETRIES??? IN A TEST PIPELINE????"): no vitest config carries a retry key and every playwright config says retries: 0', () => {
    const cfgDir = readdirSync(process.cwd()).filter((f) => /^vitest.*\.(ts|mts)$/.test(f))
    expect(cfgDir.length).toBeGreaterThan(5)
    for (const f of cfgDir) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      // strip comments — the no-retry WALL COMMENT names the word it bans
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      expect(code.includes('retry'), `${f} carries a retry key — a red is an ERROR, never a masked attempt`).toBe(false)
    }
    const pw = expandGlobs(process.cwd(), ['packages/web/**/playwright*.ts'])
    expect(pw.length).toBeGreaterThan(3)
    for (const p of pw) {
      const src = readFileSync(join(process.cwd(), p), 'utf8')
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
      const m = code.match(/retries:\s*(\d+)/)
      expect(m?.[1], `${p} must declare retries: 0 — found ${m?.[1] ?? 'no key'}`).toBe('0')
    }
  })
})

describe('battery-leases: globMatch — `**` spans directories, `*` stays in one segment', () => {
  it('matches nested trees and single segments exactly', () => {
    expect(globMatch('tests/e2e/**', 'tests/e2e/deep/nested/row.ts')).toBe(true)
    expect(globMatch('packages/**/package.json', 'packages/web/a/package.json')).toBe(true)
    expect(globMatch('packages/**/package.json', 'packages/a/package.json')).toBe(true)
    expect(globMatch('vitest*.ts', 'vitest.e2e.config.ts')).toBe(true)
    expect(globMatch('*.py', 'a/b.py')).toBe(false)
    expect(globMatch('tests/e2e/**', 'tests/walls/x.ts')).toBe(false)
  })
})
