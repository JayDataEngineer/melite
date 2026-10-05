// release-artifact-plane.spec.ts — the mint gates, pinned with
// synthetic tarballs (packages-alpha3-release-audit "Pinning tests").
// The gates live as pure throwing exports in tools/release-artifacts.mjs
// (G2 validateTarballPayload, G3 exportsRows, G4 classifyEntry, G5
// probeExecutability); this wall drives them with fixtures in
// mkdtempSync so CI sees refusals without touching a release.
//
// BUILD DEPENDENCY (case 6, the DSH layout law): the live-tree smoke
// (case 5) consumes BUILT lib/ — it must run after
// `node tools/build-plane.mjs build`. When lib/ is absent it skips
// LOUDLY, by package name; a silent skip would be the wall dying.
import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const gates = req('../../../../tools/release-artifacts.mjs') as {
  exportsRows: (inner: unknown, listing: string[], tarName: string) => string[]
  validateTarballPayload: (inner: unknown, listing: string[], tarName: string) => void
  classifyEntry: (inner: unknown, tarName: string) => void
  probeExecutability: (innerFiles: Map<string, { f: string; literals: string[] }>) => Promise<void>
  stripPackedTarballs: (files: string[]) => void
}
const ROOT = join(__dirname, '..', '..', '..', '..')

/** A tarball-shaped fixture: writes package/ files under a temp dir
 *  and actually tars them, because the gates reason over real
 *  listings and G5 extracts the archive. */
function fixture (files: Record<string, string>): { f: string; inner: Record<string, unknown>; listing: string[]; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'melite-gate-fx-'))
  const pkg = join(dir, 'package')
  mkdirSync(pkg, { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    const p = join(pkg, name)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, body)
  }
  const tgz = join(dir, 'fx.tgz')
  execFileSync('tar', ['-czf', tgz, '-C', dir, 'package'])
  const listing = execFileSync('tar', ['-tzf', tgz], { encoding: 'utf8' }).split('\n').filter(Boolean)
  return { f: tgz, inner: JSON.parse(files['package.json']) as Record<string, unknown>, listing, dir }
}

const okManifest = (extra: Record<string, unknown> = {}): string => JSON.stringify({
  name: 'fx-wellformed', version: '0.0.0', type: 'module',
  exports: { '.': { types: './lib/index.d.ts', default: './lib/index.js' }, './package.json': './package.json' },
  ...extra,
}, null, 2)

describe('G2/G3 — fixture-backed plane rejection (audit case 1)', () => {
  it('accepts a well-formed lib-only tarball and returns its literals', () => {
    const fx = fixture({
      'package.json': okManifest(),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.validateTarballPayload(fx.inner, fx.listing, 'fx.tgz')).not.toThrow()
      const literals = gates.exportsRows(fx.inner, fx.listing, 'fx.tgz')
      expect(literals).toEqual(['lib/index.d.ts', 'lib/index.js'])
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses an exports row that names source (the src plane never ships)', () => {
    // the file itself stays OUT of the tarball so the exports-target
    // check is the one that fires (a carried src file trips the member
    // check first — also a refusal, covered by the next case)
    const fx = fixture({
      'package.json': okManifest({ exports: { '.': './src/index.ts' } }),
    })
    try {
      expect(() => gates.validateTarballPayload(fx.inner, fx.listing, 'fx.tgz'))
        .toThrow('payload gate: fx.tgz . targets source "./src/index.ts"')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses a payload member under src/ even when no exports row names it', () => {
    const fx = fixture({
      'package.json': okManifest(),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
      'src/secret.ts': 'export const y = 2\n',
    })
    try {
      expect(() => gates.validateTarballPayload(fx.inner, fx.listing, 'fx.tgz'))
        .toThrow('payload gate: fx.tgz ships source member package/src/secret.ts')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses an exports promise the tarball does not carry (G3 promise law)', () => {
    const fx = fixture({
      'package.json': okManifest({ exports: { '.': './lib/index.js', './gone': './lib/gone.js' } }),
      'lib/index.js': 'export const x = 1\n',
    })
    try {
      expect(() => gates.exportsRows(fx.inner, fx.listing, 'fx.tgz'))
        .toThrow('entry gate: fx.tgz exports "./lib/gone.js" but the tarball does not contain it')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})

describe('G4 — vacuous-set rejection (audit case 3)', () => {
  it('refuses exports with no "." row and no declaration', () => {
    const inner = { name: 'fx', exports: { './sub': './lib/sub.js' } }
    expect(() => gates.classifyEntry(inner, 'fx.tgz'))
      .toThrow('entry gate: fx.tgz has no "." exports row and no melite.publish.subpathOnly declaration')
  })

  it('accepts the same shape WITH the subpathOnly declaration and reason', () => {
    const inner = { name: 'fx', exports: { './sub': './lib/sub.js' }, melite: { publish: { subpathOnly: true, reason: 'engine-side only' } } }
    expect(() => gates.classifyEntry(inner, 'fx.tgz')).not.toThrow()
  })
})

describe('G3 — wildcard base directory (audit case 4)', () => {
  it('refuses a ./mods/* row whose base dir is absent from the tarball', () => {
    const fx = fixture({
      'package.json': okManifest({ exports: { '.': './lib/index.js', './mods/*': './lib/mods/*' } }),
      'lib/index.js': 'export const x = 1\n',
    })
    try {
      expect(() => gates.exportsRows(fx.inner, fx.listing, 'fx.tgz'))
        .toThrow('exports gate: fx.tgz wildcard "./lib/mods/*" has no base dir "package/lib/mods/" in the tarball')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})

describe('G5 — dep-missing vs in-package discrimination (audit case 2)', () => {
  it('records a bare-specifier miss as an artifact (exit clean) and refuses an in-package miss', async () => {
    const depMiss = fixture({
      'package.json': okManifest(),
      'lib/index.js': 'import "some-external-dep"\nexport const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    const inPkg = fixture({
      'package.json': okManifest(),
      'lib/index.js': 'import "./missing-sibling"\nexport const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      const innerFiles = new Map([['dep-miss.tgz', { f: depMiss.f, literals: ['lib/index.js'] }]])
      await expect(gates.probeExecutability(innerFiles)).resolves.toBeUndefined()
      const innerFiles2 = new Map([['in-pkg.tgz', { f: inPkg.f, literals: ['lib/index.js'] }]])
      await expect(gates.probeExecutability(innerFiles2)).rejects.toThrow('executability gate: in-pkg.tgz')
    } finally {
      rmSync(depMiss.dir, { recursive: true, force: true })
      rmSync(inPkg.dir, { recursive: true, force: true })
    }
  }, 60_000)
})

describe('G5 — live-tree smoke (audit case 5, guarded on built lib/)', () => {
  it('packs three real members and probes them, or skips loudly by name', async () => {
    const probes = ['packages/web-kit/contracts', 'packages/harness/estate-call', 'packages/estate/models']
    const missing = probes.filter((p) => !existsSync(join(ROOT, p, 'lib')))
    if (missing.length > 0) {
      console.log(`  [live-smoke SKIPPED] no built lib/ for: ${missing.join(', ')} — run \`node tools/build-plane.mjs build\` first`)
      return
    }
    const dest = mkdtempSync(join(tmpdir(), 'melite-live-probe-'))
    try {
      const tgzs: string[] = []
      for (const p of probes) {
        execFileSync(join(process.env.HOME ?? '/', '.local/share/pnpm/pnpm'), ['--dir', join(ROOT, p), 'pack', '--pack-destination', dest], { stdio: 'ignore' })
      }
      const listed = execFileSync('bash', ['-c', `ls ${dest}/*.tgz`], { encoding: 'utf8' }).split('\n').filter(Boolean)
      for (const f of listed) {
        const tarName = f.split('/').pop() as string
        const listing = execFileSync('tar', ['-tzf', f], { encoding: 'utf8' }).split('\n').filter(Boolean)
        const inner = JSON.parse(execFileSync('bash', ['-c', `tar -xzOf ${f} package/package.json`], { encoding: 'utf8' }))
        gates.validateTarballPayload(inner, listing, tarName)
        gates.classifyEntry(inner, tarName)
        const literals = gates.exportsRows(inner, listing, tarName)
        await gates.probeExecutability(new Map([[tarName, { f, literals }]]))
      }
      expect(listed.length).toBeGreaterThanOrEqual(3)
    } finally { rmSync(dest, { recursive: true, force: true }) }
  }, 120_000)
})

describe('G1.5 — publish rewrite (hygiene strip + registry manifest)', () => {
  const stripper = req('../../../../tools/strip-artifact-comments.mjs') as {
    stripLeakageComments: (src: string) => string
  }

  it('strips dated, audit-coded, and narration comments; keeps clean contracts', () => {
    const src = [
      '// (decision 3) the old ring',
      '/* M4 audit note */',
      '// the operator law, li-bu, 2026-09-10',
      '/** Returns the sum of both operands. */',
      'const url = "https://x//y" // dated 2026-03-04',
      'const t = `a ${/* mint12 marker 2026-01-02 */ 1} b`',
      'export const f = (a: number) => a + 1 // plain tail',
    ].join('\n')
    const out = stripper.stripLeakageComments(src)
    expect(out).toContain('/** Returns the sum of both operands. */')
    expect(out).toContain('"https://x//y"')
    expect(out).toContain('plain tail')
    expect(out).toContain('`a ${ 1} b`')
    expect(out).not.toContain('decision 3')
    expect(out).not.toContain('M4 audit')
    expect(out).not.toContain('li-bu')
    expect(out).not.toContain('dated 2026-03-04')
    expect(out).not.toContain('mint12')
  })

  it('leaves user-facing string prose untouched — strings are product text', () => {
    const src = 'const msg = "workflow_file retired 2026-09-07; no silent empty render"\nconst t = `no longer ${1} here`'
    const out = stripper.stripLeakageComments(src)
    expect(out).toBe(src)
  })

  it('rewrites a packed tarball: comments stripped, private dropped, access=public', () => {
    const fx = fixture({
      'package.json': okManifest({ private: true }),
      'lib/index.js': '// dated 2026-01-01 note\n/** Contract line stays. */\nexport const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      gates.stripPackedTarballs([fx.f])
      const js = execFileSync('bash', ['-c', `tar -xzOf ${fx.f} package/lib/index.js`], { encoding: 'utf8' })
      const manifest = JSON.parse(execFileSync('bash', ['-c', `tar -xzOf ${fx.f} package/package.json`], { encoding: 'utf8' }))
      expect(js).not.toContain('dated 2026-01-01')
      expect(js).toContain('Contract line stays.')
      expect(manifest.private).toBeUndefined()
      expect(manifest.publishConfig).toEqual({ access: 'public' })
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})
