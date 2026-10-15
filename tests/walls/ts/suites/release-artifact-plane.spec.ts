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
import { pathToFileURL } from 'node:url'

const req = createRequire(import.meta.url)
const gates = req('../../../../tools/release-artifacts.mjs') as {
  exportsRows: (inner: unknown, listing: string[], tarName: string) => string[]
  validateTarballPayload: (inner: unknown, listing: string[], tarName: string) => void
  classifyEntry: (inner: unknown, tarName: string) => void
  validateBuiltEntry: (inner: unknown, entryText: string, tarName: string) => void
  extensionlessImportOffender: (text: string) => string | null
  probeExecutability: (innerFiles: Map<string, { f: string; literals: string[] }>) => Promise<void>
  stripPackedTarballs: (files: string[]) => void
  publishableTarballs: (files: string[]) => string[]
  overlayNameOffender: (packageName: string, overlay: string, packed: Map<string, Set<string>>) => string | null
  versionCoherenceOffender: (innerFiles: Map<string, { inner: { name: string, version: string } }>, tag: string) => string | null
  publintOffender: (tarName: string, f: string) => Promise<void>
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
  name: 'fx-wellformed', version: '0.0.0', type: 'module', license: 'SSPL-1.0',
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

describe('G9 — publint over the publication view (F-8, harness-seam audit)', () => {
  it('accepts a well-formed lib-only tarball (the gate is not always-false)', async () => {
    const fx = fixture({
      'package.json': okManifest(),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      await expect(gates.publintOffender('fx.tgz', fx.f)).resolves.toBeUndefined()
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses a publication the manifest rows cannot satisfy (main names no shipped byte)', async () => {
    // A class the G2/G3/G4/G8 arms deliberately do not cover: the "."
    // exports row is declared subpath-only, so G4 passes; the manifest's
    // `main` names a byte the tarball does not carry — publint's
    // FILE_DOES_NOT_EXIST error, invisible to the exports-target checks.
    const fx = fixture({
      'package.json': JSON.stringify({
        name: 'fx-dangling-main', version: '0.0.0', type: 'module', license: 'SSPL-1.0',
        main: './lib/nope.js',
        exports: { './sub': './lib/sub.js' },
        melite: { publish: { subpathOnly: true } },
      }, null, 2),
      'lib/sub.js': 'export const s = 1\n',
    })
    try {
      await expect(gates.publintOffender('fx.tgz', fx.f))
        .rejects.toThrow(/publint gate: fx\.tgz — \d+ error\(s\):/)
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

describe('G8 — built-entry import law (alpha.3 batch)', () => {
  const dot = (def: unknown): { exports: { '.': unknown } } => ({ exports: { '.': def } })
  const js = './lib/index.js'

  it('accepts a built entry whose relative imports carry extensions', () => {
    expect(() => gates.validateBuiltEntry(
      dot({ types: './lib/index.d.ts', default: js }),
      'import { x } from "./other.js"\nimport "./side.css"\nimport r from "react"\nexport * from "@melite/x"\n',
      'fx.tgz')).not.toThrow()
  })

  it('refuses a "." door targeting source (class (a) backstop at the door)', () => {
    expect(() => gates.validateBuiltEntry(dot({ types: './lib/index.d.ts', default: './src/index.ts' }), '', 'fx.tgz'))
      .toThrow('entry gate: fx.tgz "." targets source "./src/index.ts"')
  })

  it('refuses an extensionless relative import in the built entry', () => {
    expect(() => gates.validateBuiltEntry(dot({ default: js }), 'import { sleep } from "./sleep"\n', 'fx.tgz'))
      .toThrow('entry gate: fx.tgz ./lib/index.js carries extensionless relative import "./sleep"')
  })

  it('refuses a leaked source extension in the built entry', () => {
    expect(() => gates.validateBuiltEntry(dot({ default: js }), 'export * from "./queue.ts"\n', 'fx.tgz'))
      .toThrow('carries extensionless relative import "./queue.ts"')
  })

  it('ignores import-looking prose in comments and strings', () => {
    const prose = '// every symbol stays importable from "./queue.ts".\n/* import a from "./ghost"; */\nconst m = "from \\"./nope\\"";\nexport * from "./queueLock.js"\n'
    expect(() => gates.validateBuiltEntry(dot({ default: js }), prose, 'fx.tgz')).not.toThrow()
  })

  it('passes subpath-only and types-only doors through (G4 / the probe own them)', () => {
    expect(() => gates.validateBuiltEntry({ exports: { './sub': './lib/sub.js' } }, '', 'fx.tgz')).not.toThrow()
    expect(() => gates.validateBuiltEntry(dot({ types: './lib/index.d.ts' }), '', 'fx.tgz')).not.toThrow()
  })

  it('names the first offender (the audit names one defect)', () => {
    expect(gates.extensionlessImportOffender('import a from "./a.js"\nimport b from "./b"\n')).toBe('./b')
    expect(gates.extensionlessImportOffender('export const x = 1\n')).toBeNull()
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


  it('G7: one melite version, and the tag is that version (channel coherence)', () => {
    // GitHub releases, tarball filenames, and the registry must all
    // say the same string; the v0.4.0-alpha tags shipping 0.3.1
    // packages told different stories per channel (operator 2026-10-13)
    const mk = (rows: [string, string, string][]) =>
      new Map(rows.map(([t, name, version]) => [t, { inner: { name, version } }]))
    const coherent = mk([
      ['a.tgz', '@melite/x', '0.1.0-alpha.1'],
      ['b.tgz', '@melite-plugin/y', '0.1.0-alpha.1'],
      ['c.tgz', '@deepseek-ai/vendored', '9.9.9'],
    ])
    expect(gates.versionCoherenceOffender(coherent, 'v0.1.0-alpha.1')).toBeNull()
    const mixed = mk([
      ['a.tgz', '@melite/x', '0.3.1'],
      ['b.tgz', '@melite-plugin/y', '0.1.0-alpha.1'],
    ])
    expect(gates.versionCoherenceOffender(mixed, 'v0.1.0-alpha.1'))
      .toBe('melite packages carry 2 versions (0.3.1×1, 0.1.0-alpha.1×1)')
    expect(gates.versionCoherenceOffender(coherent, 'v0.4.0-alpha.6'))
      .toBe('tag v0.4.0-alpha.6 does not match the set version v0.1.0-alpha.1')
  })

  it('G6: overlay rows must resolve against the packed set — package, or declared subpath (doors seam)', () => {
    // the infer-estate twin class: provisioner's overlay once mounted
    // @melite-plugin/melite-estate, a pre-rescope name absent from the
    // set — cold boots died on the import. The mint refuses the pack.
    // The doors seam mounts @melite/harness-tools/doors — valid only
    // because the packed package declares ./doors in exports.
    const packed = new Map<string, Set<string>>([
      ['@melite-plugin/dsh-estate', new Set([''])],
      ['@melite/harness-tools', new Set(['', 'package.json', 'doors'])],
    ])
    const clean = [
      '- insert:',
      "    - id: melite-estate",
      "      name: '@melite-plugin/dsh-estate'",
      "    - id: melite-tools-doors",
      "      name: '@melite/harness-tools/doors'",
    ].join('\n')
    expect(gates.overlayNameOffender('@melite/harness-provisioner', clean, packed)).toBeNull()
    const dead = clean.replace(/dsh-estate/g, 'melite-estate')
    expect(gates.overlayNameOffender('@melite/harness-provisioner', dead, packed))
      .toBe('@melite/harness-provisioner row melite-estate names "@melite-plugin/melite-estate"')
    const ghost = clean.replace('@melite/harness-tools/doors', '@melite/harness-tools/nope')
    expect(gates.overlayNameOffender('@melite/harness-provisioner', ghost, packed))
      .toBe('@melite/harness-provisioner row melite-tools-doors names "@melite/harness-tools/nope"')
  })

  it('stays synchronized past regex literals holding quotes in classes (square.js law)', () => {
    // A regex literal like /^(?:https?:)?\/[^"'<>]*\./i once desynced the
    // scanner: the quote inside the character class opened a phantom
    // string that swallowed every later comment. The strip must see
    // through the literal and still reach the dated comment after it.
    const src = [
      `const A = (/^(?:https?:)?\\/[^"'<>]*\\./i.test(value) && EXT.test(value));`,
      '/** THE MESH FACE of the same rule (2026-09-21): */',
      'export function isMeshUrl(value) {',
      '    // THE CONTRACT OWNS THIS (2026-10-13): four seats.',
      '    return !!value;',
      '}',
    ].join('\n')
    const out = stripper.stripLeakageComments(src)
    expect(out).not.toMatch(/2026-09-21|2026-10-13/)
    expect(out).toContain('^(?:https?:)?\\/[^')
    expect(out).toContain('export function isMeshUrl')
  })

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

  it('strips previously/formerly narration and lowercase todo markers (verb census arm)', () => {
    // timeline-viewport shipped "Previously this was hard-clamped to
    // 20" — narration without a date sailed past the verb list; a
    // lowercase `// todo:` marker is the same leak as TODO.
    const src = [
      '// Previously this was hard-clamped to 20.',
      '// formerly the retry loop',
      '// todo: revisit the clamp bound',
      '/** Clamps the viewport scale. @param v the raw scale */',
      'export const clamp = (v: number) => Math.min(2, v)\n',
    ].join('\n')
    const out = stripper.stripLeakageComments(src)
    expect(out).not.toContain('Previously')
    expect(out).not.toContain('formerly')
    expect(out).not.toContain('todo:')
    expect(out).toContain('Clamps the viewport scale.')
  })

  it('strips whole-line leakage comments from packed .yml members (overlay arm)', () => {
    const fx = fixture({
      'package.json': okManifest({}),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
      'cordis.patch.yml': [
        '# overlay law (2026-10-11): rows must resolve in-set',
        'insert:',
        '  - id: seat',
        "    name: '@melite/x'",
        '# clean section note stays',
      ].join('\n') + '\n',
    })
    try {
      gates.stripPackedTarballs([fx.f])
      const yml = execFileSync('bash', ['-c', `tar -xzOf ${fx.f} package/cordis.patch.yml`], { encoding: 'utf8' })
      expect(yml).not.toContain('2026-10-11')
      expect(yml).not.toContain('overlay law')
      expect(yml).toContain('clean section note stays')
      expect(yml).toContain("name: '@melite/x'")
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses a manifest description carrying development history (product-copy arm)', () => {
    // The description is registry-facing product copy: a dated merge
    // note ships to every consumer. The gate refuses — copy is fixed
    // at source, never rewritten by the tool.
    const fx = fixture({
      'package.json': okManifest({ description: 'The compose plane (merged 2026-09-08: two services)' }),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.stripPackedTarballs([fx.f]))
        .toThrow('description carries development history')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('injects package/LICENSE from the canonical single-source text (license arm)', () => {
    // The publish terms ride the artifact: every minted tarball
    // carries its manifest-declared license text, sourced from the
    // ONE canonical file under licenses/ — the tree stays one-source.
    const fx = fixture({
      'package.json': okManifest({ license: 'SSPL-1.0' }),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      gates.stripPackedTarballs([fx.f])
      const shipped = execFileSync('bash', ['-c', `tar -xzOf ${fx.f} package/LICENSE`], { encoding: 'utf8' })
      expect(shipped).toBe(readFileSync(join(ROOT, 'licenses', 'SSPL-1.0.txt'), 'utf8'))
      expect(shipped).toContain('13. Offering the Program as a Service')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses a manifest with no license field (license arm)', () => {
    // A licenseless publish is a legal hole; the gate refuses rather
    // than defaulting a license nobody chose.
    const bare = JSON.parse(okManifest())
    delete bare.license
    const fx = fixture({
      'package.json': JSON.stringify(bare, null, 2),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.stripPackedTarballs([fx.f]))
        .toThrow('manifest carries no license field')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses an SPDX id with no canonical text under licenses/ (license arm)', () => {
    const fx = fixture({
      'package.json': okManifest({ license: 'WTFPL' }),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.stripPackedTarballs([fx.f]))
        .toThrow('no canonical text under licenses/')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('refuses a shipped LICENSE that drifts from the canonical text (license arm)', () => {
    const fx = fixture({
      'package.json': okManifest({ license: 'MIT' }),
      LICENSE: 'MIT License\n\nCopyright (c) someone else entirely\n\nNot the canonical text.\n',
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.stripPackedTarballs([fx.f]))
        .toThrow('drifts from the canonical MIT text')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('drops vendored tarballs from the publishable set (vendor-tier arm)', () => {
    // Operator ruling 2026-10-18: upstream-licensed vendored members
    // are not ours to publish. The melite set flows on; the foreign
    // scopes stay out of order, manifest, and upload.
    const kept = gates.publishableTarballs([
      '/tmp/x/melite-viewer-0.4.0.tgz',
      '/tmp/x/melite-cards-0.4.0.tgz',
    ])
    expect(kept).toHaveLength(2)
    const filtered = gates.publishableTarballs([
      '/tmp/x/melite-viewer-0.4.0.tgz',
      '/tmp/x/deepseek-ai-cordis-plugin-timer-1.0.0.tgz',
      '/tmp/x/deepseek-ai-cordis-plugin-group-1.0.0.tgz',
    ])
    expect(filtered).toEqual(['/tmp/x/melite-viewer-0.4.0.tgz'])
  })
})

describe('G2 — bundle overlay law (a declared patch must ship)', () => {
  it('refuses a manifest declaring dsh.bundle.patch without packing the overlay', () => {
    const fx = fixture({
      'package.json': okManifest({ dsh: { bundle: { patch: './cordis.patch.yml' } } }),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      expect(() => gates.validateTarballPayload(fx.inner, fx.listing, 'fx.tgz'))
        .toThrow('declares dsh.bundle.patch "./cordis.patch.yml" but does not pack it')
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('accepts the same manifest when the overlay ships in the tarball', () => {
    const fx = fixture({
      'package.json': okManifest({ dsh: { bundle: { patch: './cordis.patch.yml' } } }),
      'lib/index.js': 'export const x = 1\n',
      'lib/index.d.ts': 'export declare const x: number\n',
      'cordis.patch.yml': 'plugins: []\n',
    })
    try {
      expect(() => gates.validateTarballPayload(fx.inner, fx.listing, 'fx.tgz')).not.toThrow()
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})

describe('G5 — the closure tree (in-set siblings extract as real bytes)', () => {
  it('resolves a sibling dependency from the extracted tarball, not a stub', async () => {
    // a imports the sibling by its manifest name; the probe extracts
    // both into probeDir/node_modules so plain node links REAL bytes
    // (a stub could never satisfy a value the importer computes on).
    const b = fixture({
      'package.json': okManifest({ name: '@melite/fx-closure-real' }),
      'lib/index.js': 'export const real = 41\n',
      'lib/index.d.ts': 'export declare const real: number\n',
    })
    const a = fixture({
      'package.json': okManifest({ name: '@melite/fx-closure-peer', dependencies: { '@melite/fx-closure-real': '0.0.0' } }),
      'lib/index.js': "import { real } from '@melite/fx-closure-real'\nif (real !== 41) throw new Error('stub linked — closure tree broken')\nexport const x = real + 1\n",
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      await gates.probeExecutability(new Map([
        ['a.tgz', { f: a.f, literals: ['./lib/index.js'] }],
        ['b.tgz', { f: b.f, literals: ['./lib/index.js'] }],
      ]))
    } finally {
      rmSync(a.dir, { recursive: true, force: true })
      rmSync(b.dir, { recursive: true, force: true })
    }
  })

  it('records (never refuses) a true external the closure will install', async () => {
    const fx = fixture({
      'package.json': okManifest(),
      'lib/index.js': "import 'fx-true-external-pkg'\nexport const x = 1\n",
      'lib/index.d.ts': 'export declare const x: number\n',
    })
    try {
      await gates.probeExecutability(new Map([['fx.tgz', { f: fx.f, literals: ['./lib/index.js'] }]]))
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})

describe('G5 — stub-loader synthesis (exec-stub-loader.mjs laws)', () => {
  /** Register the probe's loader and import `file` under plain node,
   *  exactly the way probeExecutability boots every exports row. */
  const probeImport = (dir: string, file: string) => {
    const loader = join(ROOT, 'tools', 'exec-stub-loader.mjs')
    const boot = `import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; ` +
      `register(${JSON.stringify(pathToFileURL(loader).href)}, pathToFileURL(${JSON.stringify(dir + '/')})); ` +
      `await import(pathToFileURL(${JSON.stringify(join(dir, file))}).href);`
    return spawnSync(process.execPath, ['--no-warnings', '--import', `data:text/javascript,${encodeURIComponent(boot)}`],
      { encoding: 'utf8', cwd: dir, timeout: 120000 })
  }

  it('synthesizes linkable, constructible, coercible stubs for every clause shape', () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-stub-law-'))
    try {
      // one importer carrying every clause the loader's scanner knows:
      // default + construct, alias law (DECL as local), namespace
      // member (new yaml.Type at module scope), computed key
      // (toPrimitive coercion), re-export clause, mixed clause.
      writeFileSync(join(dir, 'importer.js'), [
        "import Ext from 'fx-absent-ext'",
        "import { DECL as localDecl } from 'fx-absent-ext'",
        "import * as yaml from 'fx-absent-yaml'",
        "import Def, { named } from 'fx-absent-mixed'",
        "export { reexported } from 'fx-absent-reexport'",
        'const built = new Ext()',
        'const type = new yaml.Type("str")',
        'const key = { [Ext]: "coerced" }',
        'if (localDecl === undefined) throw new Error("alias law broken: DECL not exported")',
        'if (typeof named !== "function" && named !== undefined) throw new Error("mixed clause broken")',
        'if (Def === undefined) throw new Error("default broken")',
        'if (key.stub !== "coerced") throw new Error("toPrimitive law broken")',
        'export const done = true',
      ].join('\n'))
      const r = probeImport(dir, 'importer.js')
      expect(r.stderr).toBe('')
      expect(r.status).toBe(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('stubs css-module sidecars plain node cannot load', () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-stub-css-'))
    try {
      writeFileSync(join(dir, 'importer.js'), "import './x.module.css'\nexport const done = true\n")
      const r = probeImport(dir, 'importer.js')
      expect(r.stderr).toBe('')
      expect(r.status).toBe(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('stubs a RESOLVED loader-marked dependency (the browser-door boundary)', () => {
    // RED RECEIPT (2026-11-05, the 0.1.5-pre-alpha mint): the closure
    // tree resolves in-set bare specifiers to real tarball bytes — and
    // three-client's ./client door is window.__ModuleLoader__.load({..}),
    // the host module table's registration: no ESM export clause, so
    // @melite/formats' plain-node glbLoad died at link with "does not
    // provide an export named 'DRACOLoader'". Without this cure the
    // mint refuses the whole set. The stub owns the door per-importer;
    // the named import must still LINK and CONSTRUCT (the synthesis
    // laws above) — the probe keeps proving the importer's own bytes.
    const dir = mkdtempSync(join(tmpdir(), 'melite-stub-browser-door-'))
    try {
      const nm = join(dir, 'node_modules', '@melite', 'fx-browser-door')
      mkdirSync(join(nm, 'lib'), { recursive: true })
      writeFileSync(join(nm, 'package.json'), JSON.stringify({
        name: '@melite/fx-browser-door', type: 'module',
        exports: { './client': './lib/client.js' },
      }))
      writeFileSync(join(nm, 'lib', 'client.js'),
        'window.__ModuleLoader__.load({ id: "@melite/fx-browser-door", factory: () => {} })\n')
      writeFileSync(join(dir, 'importer.js'), [
        "import { DRACOLoader } from '@melite/fx-browser-door/client'",
        'if (typeof DRACOLoader !== "function") throw new Error("browser door stub not constructible")',
        'export const built = new DRACOLoader()',
      ].join('\n'))
      const r = probeImport(dir, 'importer.js')
      expect(r.stderr).toBe('')
      expect(r.status).toBe(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('still links a RESOLVED plain sibling as real bytes (the boundary never widens)', () => {
    // the browser-door cure must not become a blanket stub: a resolved
    // in-set dependency WITHOUT the loader mark links its REAL bytes —
    // a value the importer computes on (the closure tree's own law).
    const dir = mkdtempSync(join(tmpdir(), 'melite-stub-real-door-'))
    try {
      const nm = join(dir, 'node_modules', '@melite', 'fx-real-door')
      mkdirSync(join(nm, 'lib'), { recursive: true })
      writeFileSync(join(nm, 'package.json'), JSON.stringify({
        name: '@melite/fx-real-door', type: 'module',
        exports: { '.': './lib/index.js' },
      }))
      writeFileSync(join(nm, 'lib', 'index.js'), 'export const real = 41\n')
      writeFileSync(join(dir, 'importer.js'), [
        "import { real } from '@melite/fx-real-door'",
        'if (real !== 41) throw new Error("stub linked — real bytes broken")',
        'export const done = real + 1',
      ].join('\n'))
      const r = probeImport(dir, 'importer.js')
      expect(r.stderr).toBe('')
      expect(r.status).toBe(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
