// artifact-plane-law.spec.ts — the alpha.3 package cure, pinned. The
// five audits (manifest, testplane, release, buildfaces, workspace)
// found the same disease in five dresses: manifests promising source
// files (or nothing at all), emit faces that drift from their
// typecheck face, one resolution truth per plane, and nothing wired
// to build any of it. This wall holds the cured shape:
//
//   W1  flat lib doors — every exports target is ./lib/** (manifest M1)
//   W2  face shape — emit faces extend the typecheck face and stay
//       on the artifact plane (buildfaces F5, two-plane law);
//       dual-face packages carry Host + Client leaves under a
//       solution-only root, and no host-plane file voices the
//       client plane (buildfaces F4)
//   W4  the facade table is fresh — `build-plane paths --check` exits 0
//   W5  typecheck faces carry workspace paths rows that point at
//       real src files (testplane F1/F3)
//   W6  the build is wired — root script + no dead CI filter targets
//   W7  workspace:* names a member (workspace audit M4, re-audit R1)
//   W8  no dangling door — every ./lib target maps back to a source
//       some face includes (re-audit R5/R6, buildfaces F2)
//   W9  the family table is real manifests; vendored twins never
//       shadow the registry — the webserver fork is gone (M3), the
//       timer seat rides registry 1.1.6 (M7)
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
      // DUAL-FACE (the DSH layout law): a package with Host + Client
      // leaf faces emits its lib from the HOST program — the build
      // face extends the host leaf. Extending the solution-only root
      // would emit nothing (it carries no program).
      const dual = existsSync(join(dir, 'tsconfig.host.json'))
      const want = dual ? './tsconfig.host.json' : './tsconfig.json'
      if (cfg.extends !== want) offenders.push(`${pkg.name}: face extends ${String(cfg.extends)} — dual-face packages extend ${want}`)
      if (dual && !existsSync(join(dir, 'tsconfig.client.json'))) offenders.push(`${pkg.name}: host leaf without a client leaf — the pair is the face`)
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

  it('dual-face packages carry Host + Client leaves under a solution-only root (F4)', () => {
    // The reference law: a package with both a Host and a Client
    // program exposes face-specific leaf configs and a
    // solution-only root. The root carries no program and no paths
    // block — the leaves own both — so a root-only tsc is
    // vacuously green (the typecheck gate judges the leaves).
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      const host = join(dir, 'tsconfig.host.json')
      const client = join(dir, 'tsconfig.client.json')
      if (!existsSync(host) && !existsSync(client)) continue
      if (!existsSync(host) || !existsSync(client)) {
        offenders.push(`${pkg.name}: a lone leaf — the pair is the face`)
        continue
      }
      const root = parseFace(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))
      if (!Array.isArray(root.files) || root.files.length !== 0) {
        offenders.push(`${pkg.name}: root is not solution-only (files is not [])`)
      }
      const refs = (root.references ?? []).map((r) => r.path).sort()
      if (JSON.stringify(refs) !== JSON.stringify(['./tsconfig.client.json', './tsconfig.host.json'])) {
        offenders.push(`${pkg.name}: root references are not exactly the two leaves (${refs.join(', ')})`)
      }
      if (root.compilerOptions !== undefined) {
        offenders.push(`${pkg.name}: solution-only root carries compilerOptions — the leaves own every knob`)
      }
      // Both leaves carry the merged facade table (leaves-aware
      // mergePaths): a leaf with no paths block resolves workspace
      // rows to nothing.
      for (const leaf of [host, client]) {
        const cfg = parseFace(readFileSync(leaf, 'utf8'))
        if (!cfg.compilerOptions?.paths) offenders.push(`${pkg.name}: ${leaf.split('/').pop()} carries no paths block`)
      }
      // The client leaf is the browser face: it keeps the jsx + DOM
      // program its bundle is built from.
      const cco = parseFace(readFileSync(client, 'utf8'))
      if (cco.compilerOptions?.jsx !== 'react-jsx') {
        offenders.push(`${pkg.name}: client leaf jsx is ${String(cco.compilerOptions?.jsx)} — the browser face stays react-jsx`)
      }
      // The lax-triple wall walks tsconfig.json only — a leaf could
      // turn strict off under it. No leaf turns the triple off.
      for (const leaf of [host, client]) {
        const body = readFileSync(leaf, 'utf8')
        if (/"strict":\s*false/.test(body) || /"strictNullChecks":\s*false/.test(body) || /"noImplicitAny":\s*false/.test(body)) {
          offenders.push(`${pkg.name}: ${leaf.split('/').pop()} turns the lax triple off`)
        }
      }
      // The package's own typecheck script judges both leaves (a
      // bare `tsc --noEmit` would judge the vacuous root).
      const tc = pkg.scripts?.typecheck ?? ''
      if (!tc.includes('tsconfig.host.json') || !tc.includes('tsconfig.client.json')) {
        offenders.push(`${pkg.name}: typecheck script does not judge both leaves (${tc})`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('no host-plane file imports the client plane or a stylesheet (F4 partition)', () => {
    // tsc include splits are soft — a host file importing
    // src/client/** still compiles. The partition is a grep law over
    // the EMIT program (tsconfig.build.json includes src only —
    // e2e/test/configs are harness outside the shipped lib): no
    // host-plane source (src minus src/client) names the client
    // plane or a .css module.
    // The scan is scoped to the HOST LEAF'S OWN PROGRAM (its
    // include/files minus its exclude — files the leaf never covers
    // are judged by the face that covers them, never here): a
    // files-based host (card-base: host.ts + spec.ts) does not drag
    // the client-covered atoms in, and client-covered studio doors
    // (motion/h3 src/ui/studio, gallery drilldown) are not
    // host-plane files.
    const globTest = (pattern: string): ((rel: string) => boolean) => {
      const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp('^' + esc.replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')
      return (rel: string): boolean => rx.test(rel)
    }
    const offenders: string[] = []
    for (const { dir, pkg } of members()) {
      const host = join(dir, 'tsconfig.host.json')
      if (!existsSync(host)) continue
      const leaf = parseFace(readFileSync(host, 'utf8'))
      const inc = [...(leaf.include ?? []), ...(leaf.files ?? [])].map(globTest)
      const exc = (leaf.exclude ?? []).map(globTest)
      const inHost = (rel: string): boolean => inc.some((t) => t(rel)) && !exc.some((t) => t(rel))
      const files: string[] = []
      const walk = (d: string): void => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          if (e.name === 'node_modules') continue
          const p = join(d, e.name)
          if (e.isDirectory()) walk(p)
          else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
            const rel = p.slice(dir.length + 1).replace(/\\/g, '/')
            if (inHost(rel)) files.push(p)
          }
        }
      }
      walk(dir)
      const strip = (body: string): string =>
        body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
      for (const f of files) {
        const body = strip(readFileSync(f, 'utf8'))
        const specs: string[] = []
        for (const m of body.matchAll(/(?:import|export)[^'"]*?['"]([^'"]+)['"]/g)) specs.push(m[1])
        for (const m of body.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1])
        for (const s of specs) {
          if (/(^|\/)client(\/|$)/.test(s) && !s.startsWith('@')) {
            // bare package rows (@melite/x/client) are facade rows,
            // not relative-plane crossings — the crossing this law
            // forbids is a host file reaching INTO a client dir.
            if (s.startsWith('.')) offenders.push(`${pkg.name}: ${f.split('/').slice(-2).join('/')} reaches into the client plane (${s})`)
          } else if (s.startsWith('@') && /\/client(\/|$)/.test(s)) {
            // A host file importing another package's CLIENT door
            // voices browser-plane bundled sources from the node
            // program — the door it may voice is the host marker.
            offenders.push(`${pkg.name}: ${f.split('/').slice(-2).join('/')} imports a client door (${s})`)
          }
          if (/\.css(['"]|$)/.test(s)) {
            offenders.push(`${pkg.name}: ${f.split('/').slice(-2).join('/')} imports a stylesheet (${s})`)
          }
        }
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
function parseFace(text: string): {
  compilerOptions?: { paths?: Record<string, string[]>; jsx?: string; lib?: string[] };
  files?: string[];
  references?: Array<{ path?: string }>;
  include?: string[];
  exclude?: string[];
  extends?: string;
} {
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
  return JSON.parse(out) as {
    compilerOptions?: { paths?: Record<string, string[]>; jsx?: string; lib?: string[] };
    files?: string[];
    references?: Array<{ path?: string }>;
    include?: string[];
    exclude?: string[];
    extends?: string;
  }
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
          // a flat target may be a directory module's emitted index
          // (the client bundles: ./lib/client.js <- src/client/index.ts,
          // GT6-08 2026-10-13) — Node's own resolution rule
          const cands = /\.d\.ts$/.test(t)
            ? [`${noExt}.d.ts`, `${noExt}.ts`, `${noExt}.tsx`, `${noExt}/index.d.ts`, `${noExt}/index.ts`, `${noExt}/index.tsx`]
            : [`${noExt}.ts`, `${noExt}.tsx`, `${noExt}/index.ts`, `${noExt}/index.tsx`]
          const hit = cands.some((c) => existsSync(join(dir, 'src', c)) || existsSync(join(dir, c)))
          if (!hit) offenders.push(`${pkg.name} ${key}: ${t} — no source produces it`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

describe('W9 — the family table is a table of real manifests (the cycle cure pinned); vendored twins never shadow the registry (M3/M7)', () => {
  it('every FAMILY_PKGS row names a models member, exactly once, and none is missing', () => {    const barrel = readFileSync(join(ROOT, 'packages/engines/comfyui-cordis/src/models/families/index.ts'), 'utf8')
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

  it('M3: the webserver fork is gone and nothing names it (delete-or-wire receipt)', () => {
    // The vendored cordis_plugins/webserver carried a forked branch
    // no face reached; its symbols appeared in zero imports. The
    // cure is delete-or-wire, not maintain: the fork is absent from
    // the vendor tier, no manifest declares it, and no face table
    // resolves it (the four former import-by-name files voice the
    // registry dsh-client-connection, which needs no row at all).
    const offenders: string[] = []
    if (existsSync(join(ROOT, 'vendor', 'cordis_plugins', 'webserver'))) {
      offenders.push('vendor/cordis_plugins/webserver exists — the dead fork is back')
    }
    const needle = 'cordis-plugin-webserver'
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        const p = join(d, e.name)
        if (e.isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx|mts|cts|mjs|cjs|js|json|yml|yaml|sh)$/.test(e.name)) continue
        if (e.name === 'pnpm-lock.yaml') continue
        if (readFileSync(p, 'utf8').includes(needle)) offenders.push(`${p.replace(ROOT + '/', '')} names the deleted fork`)
      }
    }
    walk(join(ROOT, 'packages'))
    walk(join(ROOT, 'vendor'))
    walk(join(ROOT, 'tools'))
    // the lockfile carries no webserver importer (delete-or-wire's
    // install half — a stale importer would reinstall the twin)
    const lock = readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf8')
    if (lock.includes(needle)) offenders.push('pnpm-lock.yaml still carries a webserver importer')
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('M7: the timer seat resolves to the registry, never the vendored twin', () => {
    // The timer seat is host-provided (registry 1.1.6, the copy DSH
    // composes); estate-queue voices only its types. A vendor-src
    // row would re-split types (vendored 1.1.3) from runtime
    // (registry 1.1.6). The pin is threefold: the manifest names
    // the registry, no face table carries a vendor-timer row, and
    // the facade carries none (vitest resolves through the facade).
    const offenders: string[] = []
    const eq = JSON.parse(readFileSync(join(ROOT, 'packages/harness/estate-queue/package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const pin = eq.dependencies?.['@deepseek-ai/cordis-plugin-timer']
    if (pin !== '1.1.6') offenders.push(`estate-queue timer pin is ${String(pin)} — the seat rides registry 1.1.6`)
    const faces: string[] = []
    const walkFaces = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        const p = join(d, e.name)
        if (e.isDirectory()) { walkFaces(p); continue }
        if (/^tsconfig(\..*)?\.json$/.test(e.name)) faces.push(p)
      }
    }
    walkFaces(join(ROOT, 'packages'))
    for (const f of faces) {
      const body = readFileSync(f, 'utf8')
      if (body.includes('cordis_plugins/timer')) {
        offenders.push(`${f.replace(ROOT + '/', '')} carries a vendor-timer row`)
      }
    }
    const base = readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8')
    if (base.includes('cordis_plugins/timer')) offenders.push('tsconfig.base.json carries a vendor-timer row')
    const facade = JSON.parse(readFileSync(join(ROOT, 'tools/facade-rows.json'), 'utf8')) as Record<string, string[]>
    for (const [k, v] of Object.entries(facade)) {
      if (k.includes('cordis-plugin-timer') || v.some((t) => t.includes('cordis_plugins/timer'))) {
        offenders.push(`facade row ${k} resolves the timer to vendor src`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
