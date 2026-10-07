// package-files-law.spec.ts — a `files` allowlist that omits the
// package's own exports entry ships a tarball that cannot be
// imported (estate media/manage/runs 0.3.1: `Cannot find module
// .../lib/index.js` — the consumer-side receipt, 2026-10-16). npm
// pack drops everything not listed; the DSH reference pattern is
// the entry literal first (`lib/index.js`), then the support rows.
// This wall walks every package pnpm would pack and refuses any
// manifest whose exports targets fall outside its files allowlist.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const PACKAGES = join(ROOT, 'packages')

// pnpm -r pack packs EVERY workspace member — private:true included
// (manage/runs shipped as tarballs while marked private). The pack
// set is pnpm-workspace.yaml's member globs; mirror them, not npm
// folklore.
function workspaceMembers(): string[] {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
  const globs: { pattern: string; negate: boolean }[] = []
  let inPackages = false
  for (const line of yaml.split('\n')) {
    if (/^packages:/.test(line)) { inPackages = true; continue }
    if (inPackages && /^\S/.test(line) && line.trim() && !line.trim().startsWith('#')) inPackages = false
    if (!inPackages) continue
    const t = line.trim().replace(/^-\s*/, '').replace(/\s#.*$/, '').replace(/^['"]|['"]$/g, '')
    if (!t || t.startsWith('#')) continue
    const negate = t.startsWith('!')
    globs.push({ pattern: negate ? t.slice(1) : t, negate })
  }
  const match = (rel: string): boolean => globs.some(({ pattern, negate }) => {
    if (negate) return false
    const rx = new RegExp('^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\u0000')
      .replace(/\*/g, '[^/]*')
      .replace(/\u0000/g, '.*') + '$')
    const negHit = globs.some((g) => g.negate && new RegExp('^' + g.pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\u0000')
      .replace(/\*/g, '[^/]*')
      .replace(/\u0000/g, '.*') + '$').test(rel))
    return rx.test(rel) && !negHit
  })
  const members: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (entry === 'package.json') {
        const rel = relative(ROOT, dirname(p))
        if (match(rel)) members.push(p)
      }
    }
  }
  walk(PACKAGES)
  walk(join(ROOT, 'vendor'))
  return members
}

// npm files-glob semantics: a bare dir covers its subtree; a
// star-star component matches zero-or-more path segments (so a
// glob of lib + star-star + single-star .js DOES cover
// lib/index.js — node-glob, not the shell's stricter star-star).
function filesCover(files: string[], target: string): boolean {
  const t = target.replace(/^\.\//, '')
  return files.some((f) => {
    if (!f.includes('*')) return t === f || t.startsWith(f.replace(/\/$/, '') + '/')
    let rx = '^'
    const segs = f.split('/')
    for (let i = 0; i < segs.length; i++) {
      if (segs[i] === '**') { rx += '(?:[^/]+/)*'; continue }
      rx += segs[i].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
      if (i < segs.length - 1) rx += '/'
    }
    return new RegExp(rx + '$').test(t)
  })
}

interface Manifest { name: string; files?: string[]; exports?: Record<string, unknown> }

// collect literal file targets from an exports value (string or
// condition map); wildcard targets yield their leading dir
function exportTargets(value: unknown, out: { files: string[]; dirs: string[] }): void {
  if (typeof value === 'string') {
    const t = value.replace(/^\.\//, '')
    if (t === 'package.json') return // npm always packs it
    if (t.includes('*')) out.dirs.push(t.split('*')[0].replace(/\/$/, ''))
    else out.files.push(t)
  } else if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) exportTargets(v, out)
  }
}

describe('package-files law — every exports target ships', () => {
  it('no packable package omits its own entry from files', () => {
    const offenders: string[] = []
    let checked = 0
    for (const pj of workspaceMembers()) {
      const pkg = JSON.parse(readFileSync(pj, 'utf8')) as Manifest
      // W3 (testplane audit): an exports map with NO files block used
      // to skip the law entirely — that early-continue was the wall
      // dying silently. Only a package with no exports (unbuildable
      // seat) may skip; a packable package with no files row fails on
      // its uncovered entry.
      if (!pkg.exports) continue
      checked++
      pkg.files ??= []
      const targets: { files: string[]; dirs: string[] } = { files: [], dirs: [] }
      for (const [key, value] of Object.entries(pkg.exports)) {
        if (key === 'package.json') continue
        exportTargets(value, targets)
      }
      const dir = dirname(pj)
      for (const t of targets.files) {
        if (!filesCover(pkg.files, t) && existsSync(join(dir, t))) {
          offenders.push(`${pkg.name}: exports target "${t}" not in files allowlist`)
        }
      }
      for (const d of targets.dirs) {
        if (!filesCover(pkg.files, d) && existsSync(join(dir, d))) {
          offenders.push(`${pkg.name}: exports dir "${d}" not in files allowlist`)
        }
      }
    }
    expect(offenders, `${offenders.join('\n')}\n(checked ${checked} packable manifests with files+exports)`).toEqual([])
    expect(checked, 'the walk must find the estate manifests — a vacuous pass is the wall dying silently').toBeGreaterThanOrEqual(4)
  })

  it('files glob semantics: star-star covers zero segments', () => {
    expect(filesCover(['lib/**/*.js'], 'lib/index.js')).toBe(true)
    expect(filesCover(['lib/**/*.js'], 'lib/deep/nested/x.js')).toBe(true)
    expect(filesCover(['lib/**/*.js'], 'src/index.js')).toBe(false)
    expect(filesCover(['lib'], 'lib/index.js')).toBe(true)
    expect(filesCover(['lib/*.js'], 'lib/deep/x.js')).toBe(false)
  })

  it('every dsh.bundle.patch declaration packs its patch and allows it in files', () => {
    // The alpha.3 mint catch (G2's class, mint21): card-base and
    // three-client declared dsh.bundle.patch but omitted the file
    // from files — the tarball shipped a declaration with no bytes
    // behind it. The mint's payload gate owns the packed-tarball
    // half; this arm owns the manifest half so the battery catches
    // the rot before a mint run does.
    const offenders: string[] = []
    let checked = 0
    for (const pj of workspaceMembers()) {
      const pkg = JSON.parse(readFileSync(pj, 'utf8')) as Manifest & { dsh?: { bundle?: { patch?: string } } }
      const patch = pkg.dsh?.bundle?.patch
      if (!patch) continue
      checked++
      const dir = dirname(pj)
      const rel = patch.replace(/^\.\//u, '')
      if (!existsSync(join(dir, rel))) {
        offenders.push(`${pkg.name}: dsh.bundle.patch "${patch}" does not exist on disk`)
        continue
      }
      if (!filesCover(pkg.files ?? [], rel)) {
        offenders.push(`${pkg.name}: dsh.bundle.patch "${rel}" not in files allowlist`)
      }
    }
    expect(offenders, `${offenders.join('\n')}\n(checked ${checked} bundle-patch declarations)`).toEqual([])
    expect(checked, 'the walk must find the bundle-patch seats — a vacuous pass is the wall dying silently').toBeGreaterThanOrEqual(4)
  })

  it('no exports row is a dangling promise — every literal target exists on disk', () => {
    // 39 rows died for this (2026-10-16): 36 model families carried
    // template "./mods/loras" rows with no mods tree (mods is
    // OPTIONAL per make-model), comfyui-cordis named a src/graph.ts
    // that never existed, formats named two. An exports row is a
    // promise to the importer; the mint entry gate reads it from
    // inside every tarball. This wall catches the lie at commit time.
    const liars: string[] = []
    for (const pj of workspaceMembers()) {
      const pkg = JSON.parse(readFileSync(pj, 'utf8')) as Manifest
      if (!pkg.exports) continue
      const dir = dirname(pj)
      for (const [key, value] of Object.entries(pkg.exports)) {
        if (key === 'package.json') continue
        const targets = typeof value === 'string' ? [value]
          : typeof value === 'object' && value !== null ? Object.values(value).filter((t) => typeof t === 'string') : []
        for (const t of targets) {
          const norm = t.replace(/^\.\//, '')
          if (norm === 'package.json') continue
          if (norm.includes('*')) {
            // the wildcard's base dir is the promise — it must exist
            const base = norm.split('*')[0].replace(/\/$/, '')
            if (!existsSync(join(dir, base))) liars.push(`${pkg.name}: ${key} -> ${t} (no ${base}/ tree)`)
            continue
          }
          if (!existsSync(join(dir, norm))) liars.push(`${pkg.name}: ${key} -> ${t} (no such file)`)
        }
      }
    }
    expect(liars, liars.join('\n')).toEqual([])
  })

  it('the member walk mirrors pnpm: private siblings included, the excluded vendor not', () => {
    const names = workspaceMembers().map((p) => JSON.parse(readFileSync(p, 'utf8')).name)
    expect(names).toContain('@melite/estate-manage') // private:true, still packed by pnpm -r
    expect(names).toContain('@melite/estate-media')
    expect(names).not.toContain('@deepseek-ai/dsh-typert-protocol') // the yaml's negative glob
  })
})
