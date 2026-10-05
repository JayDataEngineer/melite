// artifact-plane-law.spec.ts — the alpha.3 package cure, pinned. The
// five audits (manifest, testplane, release, buildfaces, workspace)
// found the same disease in five dresses: manifests promising source
// files (or nothing at all), emit faces that drift from their
// typecheck face, one resolution truth per plane, and nothing wired
// to build any of it. This wall holds the cured shape:
//
//   W1  flat lib doors — every exports target is ./lib/** (manifest M1)
//   W2  face shape — emit faces extend the typecheck face and stay
//       on the artifact plane (buildfaces F5, two-plane law)
//   W4  the facade table is fresh — `build-plane paths --check` exits 0
//   W5  typecheck faces carry workspace paths rows that point at
//       real src files (testplane F1/F3)
//   W6  the build is wired — root script + no dead CI filter targets
//   W7  workspace:* names a member (workspace audit M4, re-audit R1)
//   W8  no dangling door — every ./lib target maps back to a source
//       some face includes (re-audit R5/R6, buildfaces F2)
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const PACKAGES = join(ROOT, 'packages')

interface Manifest {
  name?: string
  private?: boolean
  exports?: Record<string, unknown>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

/** The buildable plane: domain-depth members the build-plane walks —
 *  vendor tier and the estate four (drafts/manage/media/runs, whose
 *  typert doors are their own hand-built faces, documented in
 *  pnpm-workspace.yaml) stay out, mirroring tools/build-plane.mjs
 *  OUT_OF_SCOPE. */
function members(): { dir: string; pkg: Manifest }[] {
  const out: { dir: string; pkg: Manifest }[] = []
  for (const domain of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!domain.isDirectory() || domain.name === 'node_modules' || domain.name === 'vendor') continue
    for (const pkgDir of readdirSync(join(PACKAGES, domain.name), { withFileTypes: true })) {
      if (!pkgDir.isDirectory()) continue
      const dir = join(PACKAGES, domain.name, pkgDir.name)
      if (/\/estate\/(drafts|manage|media|runs)$/.test(dir)) continue
      const pj = join(dir, 'package.json')
      if (!existsSync(pj)) continue
      out.push({ dir, pkg: JSON.parse(readFileSync(pj, 'utf8')) as Manifest })
    }
  }
  return out
}

/** Every workspace member by pnpm-workspace globs (all depths, vendor
 *  included) — the set W7 pins dependency names against. */
function allMemberNames(): Set<string> {
  const names = new Set<string>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (entry === 'package.json') {
        const name = (JSON.parse(readFileSync(p, 'utf8')) as Manifest).name
        if (name) names.add(name)
      }
    }
  }
  walk(PACKAGES)
  walk(join(ROOT, 'vendor'))
  return names
}

const memberNames = allMemberNames()

/** Every condition-target inside one exports row value. */
function rowTargets(value: unknown, sink: string[] = []): string[] {
  if (typeof value === 'string') sink.push(value)
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const v of Object.values(value as Record<string, unknown>)) rowTargets(v, sink)
  }
  return sink
}

describe('W1 — flat lib doors (manifest audit M1/M2/M9/M11)', () => {
  it('every exports target is ./lib/** or ./package.json', () => {
    const offenders: string[] = []
    for (const { pkg } of members()) {
      for (const [key, value] of Object.entries(pkg.exports ?? {})) {
        if (key === './package.json') continue
        for (const t of rowTargets(value)) {
          if (!/^\.\//.test(t)) offenders.push(`${pkg.name} ${key}: non-relative target ${t}`)
          else if (t === './package.json') continue
          else if (/^\.\/lib\//.test(t)) {
            if (/\/src\//.test(t)) offenders.push(`${pkg.name} ${key}: lib/src tombstone ${t}`)
            else if (/\.(ts|tsx)$/.test(t) && !/\.d\.ts$/.test(t)) offenders.push(`${pkg.name} ${key}: source-plane target ${t}`)
          } else if (/^\.\/src\//.test(t)) offenders.push(`${pkg.name} ${key}: source-plane target ${t}`)
          else offenders.push(`${pkg.name} ${key}: non-lib target ${t}`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('no mixed plane: a package with exports carries no source-plane main', () => {
    const offenders: string[] = []
    for (const { pkg } of members()) {
      const main = (pkg as { main?: string }).main
      if (pkg.exports && main) offenders.push(`${pkg.name}: main "${main}" survives beside exports`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('every "." door has both types and default', () => {
    const offenders: string[] = []
    for (const { pkg } of members()) {
      const dot = pkg.exports?.['.']
      if (!dot) continue
      const row = typeof dot === 'string' ? { default: dot } : (dot as Record<string, string>)
      if (!row.types || !row.default) offenders.push(`${pkg.name}: incomplete "." door ${JSON.stringify(row)}`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W2 — emit face shape (buildfaces audit)', () => {
  it('every tsconfig.build.json extends the typecheck face and stays on the artifact plane', () => {
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      const face = join(dir, 'tsconfig.build.json')
      if (!existsSync(face)) continue
      const cfg = JSON.parse(readFileSync(face, 'utf8')) as Record<string, unknown>
      const co = (cfg.compilerOptions ?? {}) as Record<string, unknown>
      if (cfg.extends !== './tsconfig.json') offenders.push(`${pkg.name}: face does not extend ./tsconfig.json`)
      if (co.rootDir !== 'src') offenders.push(`${pkg.name}: main face rootDir "${co.rootDir}" — the flat lib law is rootDir src (M1; lib/src layout is the disease)`)
      if (co.outDir !== 'lib') offenders.push(`${pkg.name}: outDir ${String(co.outDir)}`)
      if (co.noEmitOnError !== true) offenders.push(`${pkg.name}: no noEmitOnError — a red build still emits (buildfaces F3)`)
      if (co.declaration !== true) offenders.push(`${pkg.name}: no declaration`)
      if (co.paths === undefined || Object.keys(co.paths as object).length > 0) {
        offenders.push(`${pkg.name}: emit face paths not {} — dependency resolution must ride exports → built lib, never src (two-plane law)`)
      }
      // F5: the face must not sniff — target/lib/jsx stay inherited
      if (co.target !== undefined || co.lib !== undefined || co.jsx !== undefined) {
        offenders.push(`${pkg.name}: face overrides target/lib/jsx instead of inheriting the typecheck face (F5)`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('root faces (mods/scripts/ui) exist only where the root exists', () => {
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      for (const face of readdirSync(dir).filter((f) => /^tsconfig\.build-.*\.json$/.test(f))) {
        const root = face.replace(/^tsconfig\.build-/, '').replace(/\.json$/, '')
        if (!existsSync(join(dir, root))) offenders.push(`${pkg.name}: face ${face} for a root that does not exist`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W4 — the facade table is fresh (one truth)', () => {
  it('build-plane paths --check exits 0', () => {
    const r = spawnSync(process.execPath, ['tools/build-plane.mjs', 'paths', '--check'], { cwd: ROOT, encoding: 'utf8' })
    expect(r.status, `paths drift:\n${r.stdout}${r.stderr}`).toBe(0)
  })

  it('tools/facade-rows.json exists beside the generator', () => {
    expect(existsSync(join(ROOT, 'tools', 'facade-rows.json')), 'the vitest facade has no table to read').toBe(true)
  })
})

/** Faces are JSONC (hand comments survive the surgical merge) — parse
 *  with a string-aware comment stripper, the same shape build-plane.mjs
 *  carries (parseJsonc). */
function parseFace(text: string): { compilerOptions?: { paths?: Record<string, string[]> } } {
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '"' && text[i - 1] !== '\\') {
      const start = i
      i++
      while (i < text.length && (text[i] !== '"' || text[i - 1] === '\\')) i++
      i++
      out += text.slice(start, i)
      continue
    }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue }
    out += c
    i++
  }
  return JSON.parse(out) as { compilerOptions?: { paths?: Record<string, string[]> } }
}

describe('W5 — typecheck faces resolve workspace rows to real src', () => {
  it('every workspace paths row points at an existing file', () => {
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      const face = join(dir, 'tsconfig.json')
      if (!existsSync(face)) continue
      const cfg = parseFace(readFileSync(face, 'utf8'))
      for (const [key, targets] of Object.entries(cfg.compilerOptions?.paths ?? {})) {
        if (!/^@melite(-plugin)?\//.test(key)) continue
        for (const t of targets) {
          if (!existsSync(join(dir, t))) offenders.push(`${pkg.name}: paths row ${key} -> ${t} points at nothing (dead-directory row, buildfaces F8)`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W6 — the build is wired (workspace audit M1/M2)', () => {
  it('root scripts build runs build-plane', () => {
    const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as Manifest
    expect(root.scripts?.build, 'a fresh clone must build lib/ with one command').toContain('build-plane')
  })

  it('no workflow --filter names an undeclared package', () => {
    const offenders: string[] = []
    const workflows = readdirSync(join(ROOT, '.github', 'workflows'))
    for (const wf of workflows) {
      const text = readFileSync(join(ROOT, '.github', 'workflows', wf), 'utf8')
      for (const m of text.matchAll(/--filter\s+([@\w/.-]+)/g)) {
        if (!memberNames.has(m[1])) offenders.push(`${wf}: --filter ${m[1]} matches no member manifest`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W7 — workspace:* names a member (R1 install blocker)', () => {
  it('no workspace dependency row pins a non-member name', () => {
    const offenders: string[] = []
    for (const { pkg } of members()) {
      for (const sec of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
        for (const [name, range] of Object.entries(pkg[sec] ?? {})) {
          if (/^(workspace:|link:|file:)/.test(range) && !memberNames.has(name)) {
            offenders.push(`${pkg.name}: ${sec} ${name} ${range} — no member declares that name; a clean install fails at this row`)
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W8 — no dangling door (re-audit R5/R6, buildfaces F2)', () => {
  it('every ./lib exports target maps back to a source some face includes', () => {
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      for (const [key, value] of Object.entries(pkg.exports ?? {})) {
        if (key === './package.json') continue
        for (const t of rowTargets(value)) {
          if (!/^\.\/lib\//.test(t)) continue
          const noExt = t.replace(/^\.\/lib\//, '').replace(/\.(js|d\.ts)$/, '')
          const cands = /\.d\.ts$/.test(t)
            ? [`${noExt}.d.ts`, `${noExt}.ts`, `${noExt}.tsx`]
            : [`${noExt}.ts`, `${noExt}.tsx`]
          const hit = cands.some((c) => existsSync(join(dir, 'src', c)) || existsSync(join(dir, c)))
          if (!hit) offenders.push(`${pkg.name} ${key}: ${t} — no source produces it`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W9 — the family table is a table of real manifests (the cycle cure pinned)', () => {
  it('every FAMILY_PKGS row names a models member, exactly once, and none is missing', () => {
    const barrel = readFileSync(join(ROOT, 'packages/engines/comfyui-cordis/src/models/families/index.ts'), 'utf8')
    const rows = [...barrel.matchAll(/^\s+"(@melite\/models-[a-zA-Z0-9_-]+)",$/gm)].map((m) => m[1])
    expect(rows.length, 'the string table is the load order — it cannot be empty').toBeGreaterThan(0)
    const dupes = rows.filter((r, i) => rows.indexOf(r) !== i)
    expect(dupes, `duplicate table rows: ${dupes.join(', ')}`).toEqual([])
    // the census: every models-domain member with a family export
    const modelNames = members()
      .filter(({ dir }) => /\/models\//.test(dir))
      .map(({ pkg }) => pkg.name)
      .filter(Boolean) as string[]
    const missing = modelNames.filter((n) => !rows.includes(n))
    expect(missing, `families with no table row (they will never boot): ${missing.join(', ')}`).toEqual([])
    const stale = rows.filter((n) => !modelNames.includes(n))
    expect(stale, `table rows naming no manifest (boot-time ENOENT): ${stale.join(', ')}`).toEqual([])
    // the engine never statically imports its plugins (the cycle law)
    const statics = barrel.match(/import\s+[^"']*from\s+"@melite\/models-/g) ?? []
    expect(statics, `static plugin imports re-introduce the engine↔families cycle: ${statics.join(', ')}`).toEqual([])
    // and the engine manifest declares the closure the table rides
    const engine = JSON.parse(readFileSync(join(ROOT, 'packages/engines/comfyui-cordis/package.json'), 'utf8')) as { dependencies?: Record<string, string> }
    const undeclared = rows.filter((n) => !engine.dependencies?.[n])
    expect(undeclared, `table rows with no dependency declaration (unresolvable at runtime): ${undeclared.join(', ')}`).toEqual([])
  })
})
