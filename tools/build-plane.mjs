#!/usr/bin/env node
/**
 * build-plane: the artifact-plane cure (alpha.3 batch).
 *
 * DSH layout law (AGENTS.md base): "Use package names across packages and
 * .ts in local relative imports. Config subprocesses run built lib/ under
 * plain Node"; "Static gates and tests resolve workspace imports through
 * tsconfig paths to src and pass on a clean tree; gates consuming built
 * lib/ declare that dependency."
 *
 * Subcommands:
 *   rewrite    add .ts/.tsx extensions to extensionless relative imports
 *              in every workspace package's src/ and mods/ (on-disk truth)
 *   emit       write tsconfig.build.json per package (NodeNext emit face,
 *              rewriteRelativeImportExtensions, noEmitOnError, outDir lib)
 *   flip       rewrite package.json exports src→lib, add build script,
 *              files arrays led by the entry (packaging law li-ep)
 *   build      run tsc per package in dependency order; fail loud
 *   facade     print the SOURCE_PLANE_ALIAS rows vitest spreads (JSON)
 *
 * Idempotent: every step converges; re-running is a no-op on a cured tree.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { sep } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Workspace member dirs from pnpm-workspace.yaml (globs expanded on disk). */
export function memberDirs() {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
  const pats = yaml.split('\n')
    .filter((l) => /^\s*-\s/.test(l) && !/^\s*-\s*!/.test(l))
    .map((l) => l.replace(/^\s*-\s*/, '').replace(/\s+#.*$/, '').replace(/["']/g, '').trim())
    .filter(Boolean)
  const out = new Set()
  const walk = (base, parts) => {
    if (!existsSync(base)) return
    if (parts.length === 0) {
      if (existsSync(join(base, 'package.json'))) out.add(base)
      return
    }
    const [head, ...rest] = parts
    if (head === '*') {
      for (const e of readdirSync(base, { withFileTypes: true }))
        if (e.isDirectory() && !e.name.startsWith('.')) walk(join(base, e.name), rest)
    } else walk(join(base, head), rest)
  }
  for (const p of pats) walk(ROOT, p.split('/'))
  return [...out].sort()
}

function pkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
}

/** Source roots with TypeScript files for a package (src first, then mods). */
function sourceRoots(dir) {
  const roots = []
  for (const cand of ['src', 'mods']) {
    const p = join(dir, cand)
    if (existsSync(p) && readdirSync(p, { recursive: false }).some((f) => /\.tsx?$/.test(f))) roots.push(cand)
  }
  // face-derived roots (the timeline seat law): a package whose
  // typecheck face includes <root>/**/*.ts(x) dirs beyond src/mods
  // (timeline/, playback/, store/) owns those roots — the face is the
  // truth, never a filesystem sniff. test/tests never count.
  if (!outOfScope(dir)) {
    let include = null
    try { include = parseJsonc(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))?.include } catch { include = null }
    if (Array.isArray(include)) {
      for (const pat of include) {
        const m = /^([a-zA-Z0-9_-]+)\/\*\*/.exec(pat)
        if (!m) continue
        const root = m[1]
        if (root === 'src' || root === 'mods' || root === 'test' || root === 'tests') continue
        if (existsSync(join(dir, root)) && !roots.includes(root)) roots.push(root)
      }
    }
  }
  return roots
}

function hasTsx(dir) {
  for (const root of sourceRoots(dir)) {
    const stack = [join(dir, root)]
    while (stack.length) {
      const d = stack.pop()
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) stack.push(join(d, e.name))
        else if (/\.tsx$/.test(e.name)) return true
      }
    }
  }
  return false
}

/* ---------------------------------------------------------------- rewrite */

/** Add the on-disk extension to every extensionless relative import. */
function rewriteImports(pkgDir) {
  let touched = 0
  for (const root of sourceRoots(pkgDir)) {
    const stack = [join(pkgDir, root)]
    while (stack.length) {
      const d = stack.pop()
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) { stack.push(p); continue }
        if (!/\.tsx?$/.test(e.name) || e.name.endsWith('.d.ts')) continue
        const before = readFileSync(p, 'utf8')
        const after = before.replace(
          /(\bfrom\s+|\bimport\s+|\bexport\s+\*\s+from\s+|(?<=\bimport\s*\())(['"])(\.[^'"]+)(['"])/g,
          (m, pre, q1, spec, q2) => {
            if (/\.(ts|tsx|js|jsx|mjs|cjs|json|css|svg)$/.test(spec)) return m
            const from = dirname(p)
            // .d.ts-only modules (schema doors) import as './schema.d.ts';
            // type-only imports erase at emit, so the runtime never sees it
            const cands = [spec + '.ts', spec + '.tsx', spec + '.d.ts', spec + '.js', spec + '.jsx', spec + '.json', spec + '/index.ts', spec + '/index.tsx', spec + '/index.d.ts']
            const hit = cands.find((c) => existsSync(join(from, c)))
            return hit ? `${pre}${q1}${hit}${q2}` : m
          })
        if (after !== before) { writeFileSync(p, after); touched++ }
      }
    }
  }
  return touched
}


/** Root-level mods trees are imported from src via the package's own
 *  name — '\.\./mods/x.ts' inside src becomes '<name>/mods/x',
 *  resolved through the exports row to the mods face's lib/mods/x.js.
 *  A relative ../mods import cannot survive rootDir 'src' (TS6059),
 *  and a mixed-root program is the layout the manifest audit refuses. */
function rewriteSelfMods(pkgDir) {
  if (!sourceRoots(pkgDir).includes('mods')) return 0
  const name = pkg(pkgDir).name
  let touched = 0
  const stack = [join(pkgDir, 'src')]
  while (stack.length) {
    const d = stack.pop()
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) { stack.push(p); continue }
      if (!/\.tsx?$/.test(e.name) || e.name.endsWith('.d.ts')) continue
      const before = readFileSync(p, 'utf8')
      const after = before.replace(
        /(\bfrom\s+|\bimport\s+)(['"])(\.\.\/mods\/[^'"]+?)\.ts(['"])/g,
        (m, pre, q1, spec, q2) => pre + q1 + name + spec.slice(2) + q2)
      if (after !== before) { writeFileSync(p, after); touched++ }
    }
  }
  return touched
}

/* ------------------------------------------------------------------ emit */

function emitConfig(pkgDir) {
  if (outOfScope(pkgDir)) return false
  const roots = sourceRoots(pkgDir)
  if (!roots.includes('src')) return false
  // EXTENDS the package's own typecheck face — and INHERITS it
  // (buildfaces audit F5): target/lib/jsx/types stay the face's
  // truth, never a filesystem sniff beside it; a green --noEmit
  // then proves the emit program compiles. Only emit knobs flip
  // (DSH layout law: faces stay explicit, one per plane).
  // FLAT layout (manifest audit M1): rootDir 'src' → lib/index.js, the
  // shape every reference package and the estate four use. Root-level
  // mods/ trees get their own face (emitModsFace) — a file outside
  // rootDir is a TS6059, never a mixed-root program.
  // paths:{} — the emit face stays on the artifact plane: dependency
  // resolution rides exports → the dependency's built lib, never its
  // src (two-plane law).
  const cfg = {
    extends: './tsconfig.json',
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      allowImportingTsExtensions: true,
      rewriteRelativeImportExtensions: true,
      noEmit: false,
      noEmitOnError: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      emitDeclarationOnly: false,
      incremental: false,
      composite: false,
      outDir: 'lib',
      rootDir: 'src',
      paths: {},
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
  }
  const p = join(pkgDir, 'tsconfig.build.json')
  const want = JSON.stringify(cfg, null, 2) + '\n'
  if (existsSync(p) && readFileSync(p, 'utf8') === want) return false
  writeFileSync(p, want)
  return true
}

/** Root-level mods/ tree face: include mods, rootDir '.', outDir lib →
 *  lib/mods/*.js — imported from src via the package's own name
 *  (self-reference through exports, the DSH package-name law), which
 *  the fixpoint build satisfies by building mods faces first. */
/** The non-src roots an exports row names (mods/, scripts/, ui/) —
 *  each gets its own emit face: rootDir '.', include <root>/**, outDir
 *  lib → lib/<root>/*.js (buildfaces audit F2: a door no face can
 *  produce is a dangling promise). mods keeps its historical face name. */
function extraRoots(pkgDir, p) {
  const roots = new Set()
  for (const value of Object.values(p?.exports ?? {})) {
    const rows = typeof value === 'string' ? [value] : typeof value === 'object' && value ? Object.values(value) : []
    for (const spec of rows) {
      if (typeof spec !== 'string' || !/^\.\//.test(spec)) continue
      const clean = spec.replace(/^\.\//, '')
      // src-plane or already-lib rows map back to a non-src root
      const srcLike = clean.replace(/^src\//, '').replace(/^lib\//, '').replace(/\.(js|d\.ts|tsx)$/, '.ts')
      const seg = srcLike.split('/')[0]
      if (seg && seg !== 'src' && existsSync(join(pkgDir, seg)) && !/\.(ts|js|json)$/.test(seg)) roots.add(seg)
    }
  }
  return [...roots].filter((r) => existsSync(join(pkgDir, r)) && readdirSync(join(pkgDir, r)).some((f) => /\.(ts|tsx)$/.test(f)))
}

function emitRootFace(pkgDir, root, allRoots = [root]) {
  const face = root === 'mods' ? 'tsconfig.build-mods.json' : `tsconfig.build-${root}.json`
  const cfg = {
    extends: './tsconfig.json',
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      allowImportingTsExtensions: true,
      rewriteRelativeImportExtensions: true,
      noEmit: false,
      noEmitOnError: true,
      declaration: true,
      emitDeclarationOnly: false,
      sourceMap: true,
      incremental: false,
      composite: false,
      outDir: 'lib',
      rootDir: '.',
      paths: {},
    },
    // root-level .d.ts (the css-modules declaration) rides the include —
    // wildcard module declares must be IN the program for subdir imports
    include: ['*.d.ts', ...allRoots.flatMap((r) => [`${r}/**/*.ts`, `${r}/**/*.tsx`])],
  }
  const p = join(pkgDir, face)
  const want = JSON.stringify(cfg, null, 2) + '\n'
  if (existsSync(p) && readFileSync(p, 'utf8') === want) return false
  writeFileSync(p, want)
  return true
}

// emitRootsFace — a package whose only roots are face-derived (the
// timeline seat: timeline/ + playback/ + store/, no src/ and no
// mods/) gets ONE build face over all its roots, rootDir '.' so the
// doors' lib/<root>/ targets land exactly (same shape as the mods face).
function emitRootsFace(pkgDir) {
  if (outOfScope(pkgDir)) return false
  const roots = sourceRoots(pkgDir)
  if (roots.includes('src') || roots.includes('mods') || roots.length === 0) return false
  // named by the FIRST root (W2's law: the main face name is reserved
  // for the rootDir src flat-lib shape; a multi-root package carries
  // root faces, one name, all roots in ONE program)
  return emitRootFace(pkgDir, roots[0], roots)
}
// emitDoorRootsFace — a manifest door targeting ./lib/<root>/... (the
// comfyui-cordis provisioning-manifest door → lib/scripts/) names a
// REAL source root the src face never emits. Root face per door-declared
// root: rootDir '.', include <root>/**, so the door's artifact lands
// exactly. TWO guards keep this narrow: the package owns a tsconfig.json
// (the face inherits it — a bundle-only seat without one is outside this
// law), and the door resolves to NO src-side source (findSrcForExport)
// — flat-lib subpaths the src face already emits never qualify.
function emitDoorRootsFace(pkgDir) {
  if (outOfScope(pkgDir)) return false
  if (!existsSync(join(pkgDir, 'tsconfig.json'))) return false
  let wrote = false
  const p = pkg(pkgDir)
  const roots = sourceRoots(pkgDir)
  const doorRoots = new Set()
  for (const [sub, v] of Object.entries(p.exports ?? {})) {
    if (sub === './package.json') continue
    if (findSrcForExport(pkgDir, v)) continue // src face owns the door
    for (const t of [typeof v === 'string' ? v : v?.default, typeof v === 'string' ? null : v?.types]) {
      if (typeof t !== 'string') continue
      const m = /^\.\/lib\/([a-zA-Z0-9_-]+)\//.exec(t)
      if (!m) continue
      const root = m[1]
      if (root === 'src' || roots.includes(root)) continue
      // the root must carry a DIRECT ts/tsx input (the engine's models/
      // is a download tree, not a source root — TS18003 guard)
      const rd = join(pkgDir, root)
      if (existsSync(rd) && readdirSync(rd).some((f) => /\.tsx?$/.test(f))) doorRoots.add(root)
    }
  }
  for (const root of doorRoots) { if (emitRootFace(pkgDir, root)) wrote = true }
  return wrote
}

// pinNoEmitOnError — the F3 law on the TYPECHECK face: a red build
// must not emit, and the ship's wall reads tsconfig.json literally.
// Surgical: insert after the compilerOptions opening brace, only when
// the pin is absent. Faces with comments stay untouched elsewhere.
function pinNoEmitOnError(pkgDir) {
  const p = join(pkgDir, 'tsconfig.json')
  if (!existsSync(p)) return false
  const raw = readFileSync(p, 'utf8')
  if (raw.includes('"noEmitOnError"')) return false
  const m = /("compilerOptions"\s*:\s*\{)/.exec(raw)
  if (!m) return false
  const out = raw.slice(0, m.index + m[1].length) + '\n    "noEmitOnError": true,' + raw.slice(m.index + m[1].length)
  // self-check: a surgical write that cannot re-parse is refused
  parseJsonc(out)
  writeFileSync(p, out)
  return true
}

function emitModsFace(pkgDir) {
  if (outOfScope(pkgDir)) return false
  if (!sourceRoots(pkgDir).includes('mods')) return false
  return emitRootFace(pkgDir, 'mods')
}

/* ------------------------------------------------------------------ flip */

/** src/mods .ts specifier → the emitted FLAT lib target (manifest audit
 *  M1). './src/a/b.ts' → './lib/a/b.js'; root './mods/x.ts' →
 *  './lib/mods/x.js'; './src/schema.d.ts' (types-only source, M11) →
 *  './lib/schema.d.ts'. NEVER re-matches emitted .d.ts rows (the
 *  double-flip trap). */
const SRC_SPEC = /(?<!\.d)\.(ts|tsx)$/
function libTarget(spec) {
  const clean = spec.replace(/^\.\//, '')
  const flat = clean.replace(/^src\//, '')
  const noExt = flat.replace(/\.(ts|tsx)$/, '')
  return { js: `./lib/${noExt}.js`, dts: `./lib/${noExt}.d.ts` }
}

/** Never-touched tiers: the vendored reference plugins (their own faces,
 *  reference-built) and the four estate packages that shipped artifact-plane
 *  from day one. Everything else in this batch gets the emit face. */
const OUT_OF_SCOPE = [/\/vendor\//, /\/estate\/(drafts|manage|media|runs)$/]
function outOfScope(pkgDir) {
  return OUT_OF_SCOPE.some((re) => re.test(pkgDir))
}

function emitsLibSingleFace(pkgDir, p) {
  const emitsLib = p.exports !== undefined && Object.values(p.exports).some((v) => String(typeof v === 'string' ? v : v?.default ?? v?.types ?? '').startsWith('./lib/'))
  if (!emitsLib) return false
  let face = null
  try { face = parseJsonc(readFileSync(join(pkgDir, 'tsconfig.json'), 'utf8')) } catch { return false }
  return face?.compilerOptions?.outDir === 'lib' && face?.compilerOptions?.noEmit !== true
}

export function flipManifest(pkgDir) {
  if (outOfScope(pkgDir)) return false
  const p = pkg(pkgDir)
  // src-plane CLIENT doors are a design, not debt: a package with no
  // emit face (the viewer — hot-loaded from src by the web host, the
  // gate wall pins it as the one NOT built) keeps its ./src doors.
  // flip only normalizes packages the build actually emits for.
  const hasBuildFace = readdirSync(pkgDir).some((f) => /^tsconfig\.build.*\.json$/.test(f)) || emitsLibSingleFace(pkgDir, p)
  if (!hasBuildFace) return false
  let changed = false
  const mapExports = (value) => {
    if (typeof value === 'string') {
      if (/^\.\//.test(value) && SRC_SPEC.test(value)) {
        const t = libTarget(value)
        changed = true
        return { types: t.dts, default: t.js }
      }
      // types-only source row (M11): './src/schema.d.ts' ships as the
      // emitted declaration — no .js twin exists for it.
      if (/^\.\//.test(value) && /\.d\.ts$/.test(value) && !/^\.\/lib\//.test(value)) {
        changed = true
        return { types: value.replace(/^\.\//, './lib/').replace(/^\.\/lib\/src\//, './lib/') }
      }
      return value
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out = {}
      for (const [k, v] of Object.entries(value)) {
        if (k === 'default' && typeof v === 'string' && /^\.\//.test(v) && SRC_SPEC.test(v)) {
          const t = libTarget(v); out[k] = t.js; changed = true
        } else if (k === 'types' && typeof v === 'string' && SRC_SPEC.test(v)) {
          const t = libTarget(v); out[k] = t.dts; changed = true
        } else out[k] = mapExports(v)
      }
      return out
    }
    return value
  }
  if (p.exports) p.exports = Object.fromEntries(Object.entries(p.exports).map(([k, v]) => [k, mapExports(v)]))
  // DOOR LAW (buildfaces F2 + re-audit R5/R6): every row must name a
  // target some face produces. A lib row whose source is missing is a
  // dangling promise — re-point it to its index sibling when that
  // source exists (bundler relics like ./lib/client.js), else drop it
  // (dead rows: 36 never-written ./mods/loras declares, legacy mains).
  const srcFor = (spec) => {
    if (typeof spec !== 'string' || !/^\.\/lib\//.test(spec)) return spec
    const noExt = spec.replace(/^\.\/lib\//, '').replace(/\.(js|d\.ts)$/, '')
    const cands = /\.d\.ts$/.test(spec)
      ? [`${noExt}.d.ts`, `${noExt}.ts`, `${noExt}.tsx`]
      : [`${noExt}.ts`, `${noExt}.tsx`]
    for (const c of cands) {
      if (existsSync(join(pkgDir, 'src', c)) || existsSync(join(pkgDir, c))) return spec
    }
    return null
  }
  const reindex = (spec) => {
    if (typeof spec !== 'string' || !/^\.\/lib\//.test(spec) || /\.d\.ts$/.test(spec)) return spec
    const base = spec.replace(/^\.\/lib\//, '').replace(/\.js$/, '')
    for (const cand of [`src/${base}/index.ts`, `${base}/index.ts`, `src/${base}/index.tsx`, `${base}/index.tsx`]) {
      if (existsSync(join(pkgDir, cand))) return `./lib/${base}/index.js`
    }
    return spec
  }
  for (const [key, value] of Object.entries(p.exports ?? {})) {
    if (key === './package.json') continue
    const specs = typeof value === 'string' ? { default: value } : value
    if (!specs || typeof specs !== 'object') continue
    const resolved = {}
    for (const [cond, v] of Object.entries(specs)) {
      if (typeof v !== 'string') { resolved[cond] = v; continue }
      const r = reindex(v)
      resolved[cond] = srcFor(r) !== null ? r : undefined
      if (resolved[cond] === undefined) { console.log(`  drop ${p.name} ${key} ${cond}: ${v} (no source)`); changed = true }
      else if (r !== v) { changed = true }
    }
    const kept = Object.fromEntries(Object.entries(resolved).filter(([, v]) => v !== undefined))
    if (Object.keys(kept).length === 0) { delete p.exports[key]; changed = true; console.log(`  drop row ${p.name} ${key} (empty)`) }
    else if (typeof value === 'string') { if (kept.default !== value) { p.exports[key] = kept.default; } }
    else p.exports[key] = kept
  }
  // build script + files (packaging law: entry first) + plane purity
  if (!p.scripts) p.scripts = {}
  const faces = ['mods', ...extraRoots(pkgDir, p).filter((r) => r !== 'mods')]
    .map((r) => (r === 'mods' ? 'tsconfig.build-mods.json' : `tsconfig.build-${r}.json`))
    .filter((f) => existsSync(join(pkgDir, f)))
  if (existsSync(join(pkgDir, 'tsconfig.build.json'))) faces.push('tsconfig.build.json')
  const buildCmd = faces.map((f) => `tsc -p ${f}`).join(' && ')
  if (p.scripts.build !== buildCmd && existsSync(join(pkgDir, 'tsconfig.build.json'))) {
    p.scripts.build = buildCmd
    p.scripts = Object.keys(p.scripts).sort((a, b) => (a === 'build' ? -1 : b === 'build' ? 1 : a.localeCompare(b)))
      .reduce((acc, k) => ((acc[k] = p.scripts[k]), acc), {})
    changed = true
  }
  // M2: a source-plane `main` beside artifact-plane exports is a mixed
  // plane — the reference gates it at exact literals. The exports map
  // is the entry truth now.
  if (p.main && p.exports) { delete p.main; changed = true }
  if (p.exports?.['.']) {
    const dot = p.exports['.']
    const entry = typeof dot === 'string' ? dot : dot?.default
    if (typeof entry === 'string' && entry.startsWith('./lib/')) {
      const files0 = entry.replace(/^\.\//, '')
      const want = [files0, 'lib/**/*.js', 'lib/**/*.d.ts']
      if (!p.files || JSON.stringify(p.files) !== JSON.stringify(want)) {
        p.files = want
        changed = true
      }
    }
  }
  // M7: the ./package.json row is mandatory on every exports map.
  if (p.exports && !('./package.json' in p.exports)) {
    const keys = Object.keys(p.exports)
    p.exports = Object.fromEntries([['.', p.exports['.'] ?? undefined], ['./package.json', './package.json'], ...keys.filter((k) => k !== '.' && k !== './package.json').map((k) => [k, p.exports[k]])].filter(([k, v]) => v !== undefined || k === '.'))
    changed = true
  }
  // M8: a buildable entry with no exports map at all gets the standard
  // door shape (flat lib pair), never a source-plane main.
  if (!p.exports && existsSync(join(pkgDir, 'tsconfig.build.json')) && existsSync(join(pkgDir, 'src/index.ts'))) {
    p.exports = { '.': { types: './lib/index.d.ts', default: './lib/index.js' }, './package.json': './package.json' }
    delete p.main
    changed = true
  }
  // M2/M4: cordis is a PEER of every consumer (the reference law:
  // harness packages declare @deepseek-ai/cordis in peerDependencies/
  // devDependencies at one identical range, never dependencies).
  if (p.dependencies?.['@deepseek-ai/cordis']) {
    const range = p.dependencies['@deepite-ai/cordis'] ?? p.dependencies['@deepseek-ai/cordis']
    delete p.dependencies['@deepseek-ai/cordis']
    p.peerDependencies ??= {}
    p.devDependencies ??= {}
    p.peerDependencies['@deepseek-ai/cordis'] = range
    p.devDependencies['@deepseek-ai/cordis'] = range
    if (Object.keys(p.dependencies).length === 0) delete p.dependencies
    changed = true
  }
  // vendor-tier law: private manifests never ship.
  if (p.private === undefined && !p.name?.startsWith('@melite')) { p.private = true; changed = true }
  if (changed) writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(p, null, 2) + '\n')
  return changed
}

/* ----------------------------------------------------------------- build */

const tscBin = (() => {
  const hit = readdirSync(join(ROOT, 'node_modules/.pnpm')).find((d) => d.startsWith('typescript@'))
  if (!hit) throw new Error('typescript not installed')
  return join(ROOT, 'node_modules/.pnpm', hit, 'node_modules/typescript/bin/tsc')
})()

export function buildFaces(pkgDir) {
  const build = readdirSync(pkgDir).filter((f) => /^tsconfig\.build.*\.json$/.test(f)).sort()
  if (build.length > 0) return build
  // single-face emit packages (the estate four): the one tsconfig.json
  // IS the build face when it is emit-shaped (outDir lib) and the
  // manifest exports ./lib/ doors — same flat-lib law, no second face.
  const p = pkg(pkgDir)
  const emitsLib = p.exports !== undefined && Object.values(p.exports).some((v) => String(typeof v === 'string' ? v : v?.default ?? v?.types ?? '').startsWith('./lib/'))
  if (!emitsLib) return []
  let face = null
  try { face = parseJsonc(readFileSync(join(pkgDir, 'tsconfig.json'), 'utf8')) } catch { return [] }
  return face?.compilerOptions?.outDir === 'lib' && face?.compilerOptions?.noEmit !== true ? ['tsconfig.json'] : []
}

// Exactly one trailing newline on every emitted text file (see
// buildOne) — the pre-commit final-newline gate reads them all.
function ensureFinalNewlines(libDir) {
  let touched = 0
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) { walk(full); continue }
      if (!/\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(e.name)) continue
      let text
      try { text = readFileSync(full, 'utf8') } catch { continue }
      // a file with NO trailing newline matches /\n+$/ never — add it
      const trued = text.endsWith('\n') ? text.replace(/\n+$/u, '\n') : text + '\n'
      if (trued !== text) { writeFileSync(full, trued); touched++ }
    }
  }
  walk(libDir)
  return touched
}

// Mirror every .css asset to the path its emitted JS imports it from:
// a css under src/ lands at lib/<rel-from-src> (the rootDir src
// collapse), a css in a legacy source tree OUTSIDE src (the
// action-card viewers faces, whose rootDir is the package dir) lands
// at lib/<package-rel>. tsc emits JS/DTS only — without the mirror
// every built css import dangles.
function copyCssSidecars(pkgDir, libDir) {
  let copied = 0
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'lib' || e.name === 'node_modules' || e.name === 'dist') continue
        walk(full)
        continue
      }
      if (!e.name.endsWith('.css')) continue
      const relFromPkg = relative(pkgDir, full)
      const inSrc = relFromPkg.startsWith('src' + sep)
      const libRel = inSrc ? relFromPkg.slice('src/'.length) : relFromPkg
      const dest = join(libDir, libRel)
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(full, dest)
      copied++
    }
  }
  walk(pkgDir)
  return copied
}

// Rewrite relative .ts/.tsx specifiers inside emitted .d.ts files to
// their .js twins (see buildOne). Walks the whole lib tree.
function rewriteDeclSpecifiers(libDir) {
  let touched = 0
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) { walk(full); continue }
      if (!e.name.endsWith('.d.ts')) continue
      const src = readFileSync(full, 'utf8')
      const out = src
        .replace(/(from\s*["'])(\.[^"']+)\.tsx?(["'])/gu, '$1$2.js$3')
        .replace(/(import\s*\(["'])(\.[^"']+)\.tsx?(["']\))/gu, '$1$2.js$3')
      if (out !== src) { writeFileSync(full, out); touched++ }
    }
  }
  walk(libDir)
  return touched
}

export function buildOne(pkgDir) {
  const faces = buildFaces(pkgDir)
  if (faces.length === 0) return { dir: pkgDir, skipped: true }
  // CLEAN emit (manifest audit M3): tsc never prunes; a stale flat or
  // lib/src build beside the new one is exactly the mixed-plane rot the
  // dangling-promise wall catches. lib is fully derived state.
  rmSync(join(pkgDir, 'lib'), { recursive: true, force: true })
  let code = 0, out = ''
  for (const face of faces) {
    const r = spawnSync(process.execPath, [tscBin, '-p', face], { cwd: pkgDir, encoding: 'utf8' })
    if (r.status !== 0) { code = r.status; out = (r.stdout + r.stderr).slice(0, 4000); break }
  }
  // typert pass (the estate four): the generator OWNS two lib doors the
  // tsc faces never emit — regenerate into the fresh lib so the clean
  // rmSync above cannot orphan them (generator self-validates exports)
  if (code === 0 && existsSync(join(pkgDir, 'scripts/typert.mjs'))) {
    const r = spawnSync(process.execPath, ['scripts/typert.mjs'], { cwd: pkgDir, encoding: 'utf8' })
    if (r.status !== 0) { code = r.status ?? 1; out = (r.stdout + r.stderr).slice(0, 4000) }
  }
  // FINAL-NEWLINE FINISHER: editorconfig (and the pre-commit gate)
  // requires exactly one trailing newline on text files; tsc's emit
  // and the declaration rewriter both leave files bare. One pass over
  // lib/**/*.{js,d.ts,map} trues them.
  if (code === 0 && existsSync(join(pkgDir, 'lib'))) {
    ensureFinalNewlines(join(pkgDir, 'lib'))
  }
  // CSS SIDECAR MIRROR: tsc emits JS/DTS only — a `import x from
  // './y.module.css'` in the built graph resolves NEXT TO THE JS, so
  // every src css asset must land at its mirrored lib path or the
  // served client's css import dangles (the media-sidebar byte probe
  // caught overlay.module.css missing from lib/client/).
  if (code === 0 && existsSync(join(pkgDir, 'lib'))) {
    copyCssSidecars(pkgDir, join(pkgDir, 'lib'))
  }
  // DECLARATION REWRITE FINISHER: rewriteRelativeImportExtensions
  // (TS 5.9) rewrites relative .ts/.tsx specifiers in emitted .js but
  // NOT in .d.ts star-exports — a published types door carrying
  // "./x.ts" breaks every external consumer under NodeNext (the G5
  // bare-extract probe caught lib/index.d.ts exporting "./extraKeys.ts").
  // Finish the job byte-level: every relative .ts/.tsx specifier in
  // emitted declarations becomes its .js twin.
  if (code === 0 && existsSync(join(pkgDir, 'lib'))) {
    rewriteDeclSpecifiers(join(pkgDir, 'lib'))
  }
  // CONTENT STAMP (the lane audit's P0-3 cure, owned by the BUILD now):
  // lib/.src-stamp records the src hash this lib was built from. The
  // ship recomputes and refuses on mismatch — a --no-build ship can no
  // longer run a stale build of this tree. Same recipe as
  // scripts/ship-lane.sh stamp_src (16 hex chars).
  if (code === 0 && existsSync(join(pkgDir, 'src'))) {
    writeSrcStamp(pkgDir)
  }
  return { dir: pkgDir, code, out }
}

// The stamp recipe mirrors ship-lane.sh stamp_src byte-for-byte: the
// sorted src/*.ts(x) list, sha256 of the sha256sum lines, first 16.
// SHELLED, not reimplemented — a JS sort collates differently from
// the shell's sort and the stamp must match the ship's verifier
// byte-for-byte (the motion seat proved the drift).
function writeSrcStamp(pkgDir) {
  const r = spawnSync('bash', ['-c', "find src \\( -name '*.ts' -o -name '*.tsx' \\) | sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16"], { cwd: pkgDir, encoding: 'utf8' })
  const stamp = (r.stdout || '').trim()
  writeFileSync(join(pkgDir, 'lib/.src-stamp'), stamp + '\n')
  return stamp
}

/* ---------------------------------------------------------------- facade */

function facadeRows(dirs) {
  const rows = {}
  for (const d of dirs) {
    const p = pkg(d)
    if (!p.exports) continue
    for (const [key, value] of Object.entries(p.exports)) {
      if (key === './package.json') continue
      const spec = typeof value === 'string' ? value : value?.default ?? value?.types
      if (typeof spec !== 'string' || !/^\.\//.test(spec)) continue
      // FLAT lib layout: './lib/a/b.js' → './src/a/b.ts';
      // './lib/mods/x.js' → './mods/x.ts' (root mods) or './src/mods/x.ts'
      const inner = spec.replace(/^\.\/lib\//, '').replace(/\.(js|d\.ts)$/, '')
      const cands = /\.d\.ts$/.test(spec) ? [inner + '.d.ts', inner + '.ts', inner + '.tsx'] : [inner + '.ts', inner + '.tsx']
      for (const cand of cands.map((c) => [join('src', c), c]).flat()) {
        if (existsSync(join(d, cand))) {
          rows[p.name + (key === '.' ? '' : key.slice(1))] = join(d, cand)
          break
        }
      }
    }
  }
  return rows
}


/* ------------------------------------------------------------ paths */

/** The one-table cure (testplane audit F1+F2+F3): every workspace
 *  specifier resolves to its src file for every TYPECHECK face and
 *  every vitest lane. tsc never merges inherited paths, and package
 *  faces carry their own vendor rows (react/three), so the rows are
 *  merged INTO each face's paths block. Emit faces override paths:{}
 *  to stay on the artifact plane (exports -> built lib). */
function workspacePathRows(dirs) {
  const rows = {}
  for (const d of dirs) {
    const p = pkg(d)
    if (!p.name || !p.exports) continue
    for (const key of Object.keys(p.exports)) {
      if (key === 'package.json') continue
      const rel = key === '.' ? '' : key.slice(1)
      const srcPath = findSrcForExport(d, p.exports[key])
      if (srcPath) rows[p.name + rel] = ['./' + relative(ROOT, join(d, srcPath))]
    }
  }
  return rows
}

/** The src truth behind one exports row (flat lib layout). */
function findSrcForExport(d, value) {
  // A door whose runtime half is generator-owned (the estate four's
  // ./remote: lib/typert.remote-client.js has NO src twin — only the
  // .d.ts does) must still land its row: try the default spec first,
  // then the types spec, so declaration-only srcs resolve.
  const specs = typeof value === 'string' ? [value] : [value?.default, value?.types]
  for (const spec of specs) {
    const hit = findSrcForSpec(d, spec)
    if (hit) return hit
  }
  return null
}

function findSrcForSpec(d, spec) {
  if (typeof spec !== 'string' || !/^\.\/lib\//.test(spec)) return null
  // a .d.ts target's source may BE a declaration (schema.d.ts); a .js
  // target's source is .ts/.tsx. Collapsing .d.ts to .ts lost every
  // types-only row (the catalog/comfyui-cordis TS2307 class).
  const inner = spec.replace(/^\.\/lib\//, '').replace(/\.(js|d\.ts)$/, '')
  const cands = /\.d\.ts$/.test(spec)
    ? [inner + '.d.ts', inner + '.ts', inner + '.tsx']
    : [inner + '.ts', inner + '.tsx']
  for (const cand of cands) {
    for (const base of [join('src', cand), cand]) {
      if (existsSync(join(d, base))) return base
    }
  }
  return null
}

/** Strip // and /* comments for READING only — writes stay surgical
 *  (many faces carry explanatory JSONC; a full rewrite would burn it). */
export function parseJsonc(text) {
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
  return JSON.parse(out)
}

function mergePaths(pkgDir, rows) {
  const p = join(pkgDir, 'tsconfig.json')
  const raw = readFileSync(p, 'utf8')
  const cfg = parseJsonc(raw)
  const existing = cfg.compilerOptions?.paths ?? {}
  const ordered = {}
  for (const k of Object.keys(rows)) if (!(k in existing)) ordered[k] = rows[k].map((v) => './' + relative(pkgDir, join(ROOT, v)))
  // F8 purge: a row the door table no longer owns whose target is GONE
  // (a moved module — schema.d.ts→schema.ts, text-to-pose→formats) is
  // dead weight the W5 wall catches; delete it, never carry it.
  const live = {}
  for (const [k, v] of Object.entries(existing)) {
    if (k in rows) { live[k] = rows[k].map((x) => './' + relative(pkgDir, join(ROOT, x))); continue }
    const targets = (Array.isArray(v) ? v : [v]).map((t) => join(pkgDir, String(t)))
    if (targets.some((t) => existsSync(t))) live[k] = v
  }
  const want = { ...ordered, ...live }
  if (JSON.stringify(existing) === JSON.stringify(want)) return false
  const block = Object.entries(want).map(([k, v]) => `        ${JSON.stringify(k)}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`).join(',\n')
  let out
  const anchor = /\n([ \t]*)"paths": \{/.exec(raw)
  if (anchor) {
    // replace the paths VALUE span exactly: from its opening brace to
    // its matching close (brace-counted from the anchor itself).
    const open = raw.indexOf('{', anchor.index)
    let depth = 0, endIx = -1
    for (let i = open; i < raw.length; i++) {
      if (raw[i] === '{') depth++
      else if (raw[i] === '}') { depth--; if (depth === 0) { endIx = i; break } }
    }
    if (endIx < 0) throw new Error(p + ': unbalanced paths block')
    out = raw.slice(0, open + 1) + '\n' + block + '\n' + anchor[1] + raw.slice(endIx)
  } else {
    const co = raw.indexOf('"compilerOptions"')
    const open = raw.indexOf('{', co)
    out = raw.slice(0, open + 1) + '\n      "paths": {\n' + block + '\n      },' + raw.slice(open + 1)
  }
  // self-check: a surgical write that cannot re-parse is refused, never
  // landed (the patch7 splice wrote 22 comma-eaten faces before this).
  try { parseJsonc(out) } catch (e) { throw new Error(p + ': surgical splice produced unparseable output — ' + e.message) }
  if (out !== raw) { writeFileSync(p, out); return true }
  return false
}

function writeBasePaths(rows) {
  const p = join(ROOT, 'tsconfig.base.json')
  const raw = readFileSync(p, 'utf8')
  // the base carries explanatory comments (JSONC) — regenerate the
  // paths block by slicing around the generated markers
  const OPEN = '    "paths": {'
  const i = raw.indexOf(OPEN)
  if (i < 0) throw new Error('tsconfig.base.json paths anchor missing')
  const j = raw.indexOf('    }', i)
  const block = Object.entries(rows).map(([k, v]) => `      ${JSON.stringify(k)}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`).join(',\n')
  const out = raw.slice(0, i + OPEN.length) + '\n' + block + '\n' + raw.slice(j)
  if (out !== raw) { writeFileSync(p, out); return true }
  return false
}

function runPaths(dirs, check) {
  const rows = workspacePathRows(dirs)
  let n = 0
  for (const d of dirs) {
    if (outOfScope(d) || !existsSync(join(d, 'tsconfig.json'))) continue
    if (mergePaths(d, rows)) n++
  }
  const baseChanged = writeBasePaths(rows)
  writeFileSync(join(ROOT, 'tools/facade-rows.json'), JSON.stringify(rows, null, 2) + '\n')
  console.log(`paths: ${n} faces merged, ${Object.keys(rows).length} rows, base ${baseChanged ? 'rewritten' : 'stable'}`)
  if (check && (n > 0 || baseChanged)) { console.error('paths drift — re-run: node tools/build-plane.mjs paths'); process.exit(1) }
}

/* ------------------------------------------------------------------ main */

// CLI dispatch fires only when EXECUTED, not when a wall require()s
// the module for its law (the release-artifacts pattern)
import { pathToFileURL } from 'node:url'
const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
const cmd = invokedDirectly ? (process.argv[2] ?? '') : ''
if (invokedDirectly) {
const dirs = memberDirs()
switch (cmd) {
  case 'rewrite': {
    let n = 0
    for (const d of dirs) n += rewriteImports(d)
    console.log(`rewrite: ${n} files`)
    break
  }
  case 'emit': {
    let n = 0
    let pins = 0
    for (const d of dirs) { if (emitConfig(d)) n++; if (emitModsFace(d)) n++; if (emitRootsFace(d)) n++; if (emitDoorRootsFace(d)) n++; if (buildFaces(d).length > 0 && pinNoEmitOnError(d)) pins++ }
    // prune: any tsconfig.build*.json whose root is gone is dangling
    for (const d of dirs) {
      for (const face of readdirSync(d).filter((x) => /^tsconfig\.build.*\.json$/.test(x))) {
        const root = face.replace(/^tsconfig\.build-/, '').replace(/\.json$/, '')
        if (root === 'tsconfig.build' || face === 'tsconfig.build.json') continue
        if (!existsSync(join(d, root))) { rmSync(join(d, face)); n-- }
      }
    }
    console.log(`emit: ${n} configs, ${pins} noEmitOnError pins`)
    break
  }
  case 'selfmods': {
    let n = 0
    for (const d of dirs) n += rewriteSelfMods(d)
    console.log(`selfmods: ${n} files`)
    break
  }
  case 'flip': {
    let n = 0
    for (const d of dirs) if (flipManifest(d)) n++
    console.log(`flip: ${n} manifests`)
    break
  }
  case 'build': {
    const pending = new Set(dirs.filter((d) => buildFaces(d).length > 0))
    let round = 0, totalFail = 0
    while (pending.size) {
      round++
      let progressed = 0
      const still = []
      for (const d of [...pending].sort()) {
        const r = buildOne(d)
        // a success LEAVES the set (build4 spun 35 rounds rebuilding
        // the same 7 packages because successes were never retired)
        if (r.code === 0) { progressed++; pending.delete(d); console.log('ok   ' + relative(ROOT, d)) }
        else still.push({ d, r })
      }
      for (const { d, r } of still) pending.delete(d) // re-added below only if a dep may still land
      if (progressed === 0) {
        for (const { d, r } of still) { totalFail++; console.log('FAIL ' + relative(ROOT, d) + '\n' + (r.out || '').split('\n').slice(0, 6).join('\n')) }
        break
      }
      for (const { d } of still) pending.add(d)
    }
    console.log('build: ' + (totalFail ? totalFail + ' FAILED' : 'all green') + ' (fixpoint in ' + round + ' rounds)')
    if (totalFail) process.exit(1)
    break
  }
  case 'paths': {
    runPaths(dirs, process.argv.includes('--check'))
    break
  }
  case 'facade':
    console.log(JSON.stringify(facadeRows(dirs), null, 2))
    break
  default:
    console.error('usage: build-plane.mjs rewrite|emit|flip|build|facade')
    process.exit(2)
}
}
