#!/usr/bin/env node
// release-artifacts.mjs — the release IS the artifact source (operator
// order, 2026-10-16: "I want releases to work now"). Two verbs:
//
//   mint    pack every workspace package from the CURRENT tree, hash
//           each tarball, write release-manifest.json (commit, tag,
//           package digests), upload all of it to the GitHub release
//           of the tag at HEAD. Refuses a dirty tree, a tag that does
//           not point at HEAD, and a missing release object (prints
//           the exact gh command to create it).
//   verify  answer "is the latest build actually up there?": the
//           release's manifest must name the tag's commit, every
//           listed tarball must exist on the release with a matching
//           sha256, and the local HEAD is compared against the
//           release commit (drift is reported in plain words — a
//           release behind HEAD is a stale artifact source).
//
// Plain node, no deps beyond git + pnpm + gh (the same trio every
// gate already rides). Exit 0 = verified; exit 1 = anything short.
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripLeakageComments, stripLeakageYaml, isLeak } from './strip-artifact-comments.mjs'

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim()
const git = (...a) => run('git', a)
const gh = (args) => run('gh', args) // array — jq expressions carry spaces
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1) }
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const REPO = 'JayDataEngineer/melite'
const PRERELEASE_PAT = /-(alpha|beta|rc|pre)\d*\.?\d*/i

/** pnpm lives on PATH in dev shells but not in bare hook/node spawns;
 *  the box-installed location is the fallback. */
function pnpmBin () {
  for (const c of ['pnpm', join(homedir(), '.local/share/pnpm/pnpm')]) {
    try { run('which', [c], { stdio: ['ignore', 'pipe', 'pipe'] }); return c } catch { /* try next */ }
  }
  fail('pnpm not found (PATH or ~/.local/share/pnpm/pnpm)')
}

function headTag () {
  const tags = git('tag', '--points-at', 'HEAD').split('\n').filter(Boolean)
  return tags.length === 1 ? tags[0] : null
}

function resolveTag (want) {
  const tag = want || headTag()
  if (!tag) fail('HEAD carries no tag — tag first (git tag -a vX.Y.Z -m "notes"), then mint')
  return tag
}

function releaseJson (tag) {
  try { return JSON.parse(run('gh', ['api', `repos/${REPO}/releases/tags/${tag}`])) } catch { return null }
}

/** G3 — exports rows, extracted from the entry gate: promise law
 *  (every literal target ships in the tarball), plus the alpha.2
 *  tightenings: wildcard rows require their base dir in the listing,
 *  and the verified literals feed G5. Pure: throws on violation, so
 *  the wall suite (release-artifact-plane.spec.ts) can drive it with
 *  synthetic tarballs. */
export function exportsRows (inner, listing, tarName) {
  const literals = []
  if (!inner.exports) return literals
  for (const [key, value] of Object.entries(inner.exports)) {
    if (key === 'package.json') continue
    const targets = typeof value === 'string' ? [value]
      : typeof value === 'object' && value !== null ? Object.values(value).filter((t) => typeof t === 'string') : []
    for (const t of targets) {
      const norm = t.replace(/^\.\//, '')
      if (norm === 'package.json') continue
      if (norm.includes('*')) {
        const base = norm.split('*')[0]
        if (!listing.some((l) => l.startsWith(`package/${base}`))) {
          throw new Error(`exports gate: ${tarName} wildcard "${t}" has no base dir "package/${base}" in the tarball`)
        }
        continue
      }
      if (!listing.includes(`package/${norm}`)) {
        throw new Error(`entry gate: ${tarName} exports "${t}" but the tarball does not contain it — fix package.json files`)
      }
      literals.push(norm)
    }
  }
  return literals
}

/** G2 — PAYLOAD PLANE (the DSH pack.ts law, ported): source never
 *  ships. Any src/** member, .ts/.tsx exports target or main, or
 *  source-map file refuses the mint. Declarations (.d.ts) are
 *  artifacts, not source; directory entries are not files. Pure:
 *  throws on violation. */
export function validateTarballPayload (inner, listing, tarName) {
  for (const member of listing) {
    if (member.endsWith('/')) continue
    if (/^package\/src\//.test(member)) throw new Error(`payload gate: ${tarName} ships source member ${member}`)
    if (/\.(js|d\.ts)\.map$/.test(member)) throw new Error(`payload gate: ${tarName} ships source map ${member}`)
  }
  const sourceTarget = (t) => /\.(ts|tsx)$/.test(t) && !/\.d\.ts$/.test(t)
  for (const [key, value] of Object.entries(inner.exports ?? {})) {
    const targets = typeof value === 'string' ? [value] : Object.values(value ?? {}).filter((t) => typeof t === 'string')
    for (const t of targets) if (sourceTarget(t)) throw new Error(`payload gate: ${tarName} ${key} targets source "${t}"`)
  }
  if (typeof inner.main === 'string' && sourceTarget(inner.main)) {
    throw new Error(`payload gate: ${tarName} main targets source "${inner.main}"`)
  }
  // BUNDLE OVERLAY LAW: a manifest declaring dsh.bundle.patch makes
  // the plugin loader read that file at the INSTALLED root — a
  // tarball that omits it boots to ENOENT.
  const patch = inner.dsh?.bundle?.patch
  if (typeof patch === 'string') {
    const rel = patch.replace(/^\.\//, '')
    if (!listing.includes(`package/${rel}`)) {
      throw new Error(`payload gate: ${tarName} declares dsh.bundle.patch "${patch}" but does not pack it`)
    }
  }
}

/**
 * G7 — CHANNEL COHERENCE (operator 2026-10-13): every melite-owned
 * package in the set carries ONE identical version, and the release
 * tag is exactly v<that version>. A tag claiming one number while
 * tarballs ship another (the v0.4.0-alpha tags around 0.3.1 packages)
 * shows consumers a different story per channel — GitHub releases,
 * tarball filenames, and the registry must all say the same string.
 * @param {Map<string, {inner: {name: string, version: string}}>} innerFiles
 * @param {string} tag the release tag being minted
 * @returns {string | null} the coherence offender, or null
 */
export function versionCoherenceOffender (innerFiles, tag) {
  const versions = new Map()
  for (const { inner } of innerFiles.values()) {
    if (!inner.name?.startsWith('@melite')) continue
    versions.set(inner.name, inner.version)
  }
  const set = new Set(versions.values())
  if (set.size !== 1) {
    const counts = {}
    for (const v of versions.values()) counts[v] = (counts[v] ?? 0) + 1
    return `melite packages carry ${set.size} versions (${Object.entries(counts).map(([v, n]) => `${v}×${n}`).join(', ')})`
  }
  const only = set.values().next().value
  if (tag !== `v${only}`) {
    return `tag ${tag} does not match the set version v${only}`
  }
  return null
}

/**
 * G6 — pure half of the overlay name law: scan one overlay's plugin
 * rows and return the first offender whose name cannot resolve for a
 * cold consumer (null when clean). Valid is an in-set package name,
 * or an in-set package's declared exports subpath (the doors seam
 * mounts @melite/harness-tools/doors, a real ./doors row). Anything
 * else — a pre-rescope name, a typo, a dropped package, a bare
 * subpath that no packed package declares — refuses the mint.
 * @param {string} packageName the overlay's owning package, for the message
 * @param {string} overlay the overlay YAML text as packed
 * @param {Map<string, Set<string>>} packed name -> valid mount suffixes
 *   ('' for the package root, plus each exports key without './')
 * @returns {string | null} "row <id> names \"<name>\"" or null
 */
export function overlayNameOffender (packageName, overlay, packed) {
  const rows = [...overlay.matchAll(/^\s*-\s*id:\s*(\S+)[\s\S]*?^\s*name:\s*['\"]?([^'\"\s]+)/gm)]
  for (const m of rows) {
    // a scoped name's FIRST '/' belongs to the scope; the subpath
    // split lands at the SECOND ('@scope/pkg' is whole, '@scope/pkg/sub'
    // splits into '@scope/pkg' + 'sub'); unscoped names split at the first
    const parts = m[2].split('/')
    const take = m[2].startsWith('@') ? 2 : 1
    const head = parts.slice(0, take).join('/')
    const tail = parts.slice(take).join('/')
    const suffixes = packed.get(head)
    if (!suffixes || !suffixes.has(tail)) {
      return `${packageName} row ${m[1]} names "${m[2]}"`
    }
  }
  return null
}

/** G4 — ENTRY CLASSIFICATION: no `.` row is importable-dead for a
 *  plain-Node consumer unless declared subpath-only with a reason.
 *  Pure: throws on violation, logs the declared pass. */
export function classifyEntry (inner, tarName) {
  if (inner.exports && !inner.exports['.']) {
    const decl = inner.melite?.publish?.subpathOnly
    if (decl !== true || typeof inner.melite?.publish?.reason !== 'string' || !inner.melite.publish.reason) {
      throw new Error(`entry gate: ${tarName} has no "." exports row and no melite.publish.subpathOnly declaration — give it a real entry`)
    }
    console.log(`  ${tarName}: subpath-only (${inner.melite.publish.reason})`)
  }
}

/** G8 — BUILT-ENTRY IMPORT LAW (alpha.3 batch, the consumer's preset
 *  audit): the "." door's built JS carries no extensionless relative
 *  import, and the door itself targets built JS, never source.
 *  Plain-Node ESM resolves no `./x` without its file extension, so a
 *  `./x` (or a leaked `./x.ts`) in emitted JS is the in-package byte
 *  defect class (b) — loadable in-workspace through tsx, dead in the
 *  tarball. The `.ts`-target half is the class (a) backstop at the
 *  entry door (the payload gate refuses every .ts target repo-wide;
 *  this names the door). Pure: throws on violation, so the wall suite
 *  (release-artifact-plane.spec.ts) drives it with synthetic strings. */
export function validateBuiltEntry (inner, entryText, tarName) {
  const dot = inner.exports?.['.']
  if (dot === undefined) return // subpath-only seats pass at classifyEntry
  const target = typeof dot === 'string' ? dot : dot?.default
  if (typeof target === 'string' && /\.(ts|tsx|mts|cts)$/.test(target) && !/\.d\.ts$/.test(target)) {
    throw new Error(`entry gate: ${tarName} "." targets source "${target}" — ship built lib/ (the estate-* pattern)`)
  }
  if (typeof target !== 'string' || !/\.(js|mjs|cjs)$/.test(target)) return // types-only door: the probe skips .d.ts loudly
  const offender = extensionlessImportOffender(entryText ?? '')
  if (offender) {
    throw new Error(`entry gate: ${tarName} ${target} carries extensionless relative import "${offender}" — emit must rewrite to its file extension`)
  }
}

/** First relative specifier in JS text with no resolvable runtime file
 *  extension (or a leaked source extension), or null when clean.
 *  Import/export clauses are parsed structurally in code position:
 *  comments are skipped (entry files narrate their own module graph
 *  in prose — estate-queue's "importable from ./queue.ts" line is not
 *  an import) and every other string is opaque (an import-looking
 *  string literal is not an import). Template spans are fully opaque —
 *  an import built inside `${}` stays out of the static gate's sight
 *  and the executability probe executes it. Exported for the wall
 *  suite. */
export function extensionlessImportOffender (text) {
  const RUNTIME_EXT = /\.(js|mjs|cjs|json|css|wasm)$/
  const n = text.length
  let bad = null
  const isId = (ch) => /[A-Za-z0-9_$]/.test(ch ?? '')

  const skipString = (i, q) => {
    let j = i + 1
    while (j < n) {
      if (text[j] === '\\') { j += 2; continue }
      if (text[j] === q) return j + 1
      j++
    }
    return j
  }

  const readLiteral = (i) => {
    const q = text[i]
    if (q !== "'" && q !== '"') return null
    let j = i + 1
    let spec = ''
    while (j < n) {
      if (text[j] === '\\') { spec += text[j + 1] ?? ''; j += 2; continue }
      if (text[j] === q) return { spec, end: j + 1 }
      spec += text[j]
      j++
    }
    return { spec, end: j }
  }

  const skipTrivia = (i) => {
    for (;;) {
      while (i < n && /\s/.test(text[i])) i++
      if (text[i] === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue }
      if (text[i] === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue }
      return i
    }
  }

  const checkSpec = (spec) => {
    if (spec.startsWith('.') && !RUNTIME_EXT.test(spec) && bad === null) bad = spec
  }

  // `from "..."` at the current statement's top level (the clause's
  // own from — strings, templates, comments, and bracket depth hide
  // every lookalike). Returns the index past the clause.
  const scanFrom = (i) => {
    let depth = 0
    while (i < n && bad === null) {
      const c = text[i]
      if (c === "'" || c === '"') { i = skipString(i, c); continue }
      if (c === '`') { i = skipTemplate(i); continue }
      if (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) { i = skipTrivia(i); continue }
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') {
        if (depth === 0) return i
        depth--
      } else if (c === ';') return i + 1
      else if (depth === 0 && c === 'f' && text.startsWith('from', i) && !isId(text[i - 1]) && !isId(text[i + 4])) {
        i = skipTrivia(i + 4)
        const tgt = readLiteral(i)
        if (tgt) { checkSpec(tgt.spec); return tgt.end }
        return i
      }
      i++
    }
    return i
  }

  // past `import`: side-effect string, dynamic (, or a named/default
  // list whose `from` scanFrom finds. import.meta is not an import.
  const scanImport = (i) => {
    i = skipTrivia(i)
    if (text[i] === '.') return i // import.meta
    const lit = readLiteral(i)
    if (lit) { checkSpec(lit.spec); return lit.end }
    if (text[i] === '(') {
      i = skipTrivia(i + 1)
      const dyn = readLiteral(i)
      if (dyn) { checkSpec(dyn.spec); return dyn.end }
      return i
    }
    return scanFrom(i)
  }

  // past `export`: only `*` and `{}` forms carry a specifier
  const scanExport = (i) => {
    i = skipTrivia(i)
    if (text[i] !== '*' && text[i] !== '{') return i
    return scanFrom(i)
  }

  // past `require`: ( "..." )
  const scanRequire = (i) => {
    i = skipTrivia(i)
    if (text[i] !== '(') return i
    i = skipTrivia(i + 1)
    const lit = readLiteral(i)
    if (lit) { checkSpec(lit.spec); return lit.end }
    return i
  }

  // past the opening backtick: template text is opaque, no descent
  const skipTemplate = (i) => {
    let j = i + 1
    while (j < n) {
      if (text[j] === '\\') { j += 2; continue }
      if (text[j] === '`') return j + 1
      j++
    }
    return j
  }

  let i = 0
  while (i < n && bad === null) {
    const c = text[i]
    if (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) { i = skipTrivia(i); continue }
    if (/\s/.test(c)) { i++; continue }
    if (c === "'" || c === '"') { i = skipString(i, c); continue }
    if (c === '`') { i = skipTemplate(i); continue }
    if (!isId(text[i - 1])) {
      if (c === 'i' && text.startsWith('import', i) && !isId(text[i + 6])) { i = scanImport(i + 6); continue }
      if (c === 'e' && text.startsWith('export', i) && !isId(text[i + 6])) { i = scanExport(i + 6); continue }
      if (c === 'r' && text.startsWith('require', i) && !isId(text[i + 7])) { i = scanRequire(i + 7); continue }
    }
    i++
  }
  return bad
}

/** The "." door's built JS bytes from inside a packed tarball (the G8
 *  scan input), or '' when the door is subpath-only, types-only, or
 *  otherwise unscannable — validateBuiltEntry returns early there.
 *  Module-private: the wall suite drives validateBuiltEntry with
 *  synthetic strings, never tarballs. */
function builtEntryText (f, inner) {
  const dot = inner.exports?.['.']
  const target = typeof dot === 'string' ? dot : dot?.default
  if (typeof target !== 'string' || !/\.(js|mjs|cjs)$/.test(target)) return ''
  return run('bash', ['-c', `tar -xzOf ${f} package/${target.replace(/^\.\//, '')}`])
}

/** G1.5: rewrite every packed tarball for publication. Two rewrites in
 *  one repack, so the gates below and the manifest sha256s describe the
 *  exact published bytes:
 *  - leakage comments stripped from js/mjs/cjs/css/.d.ts members;
 *  - whole-line leakage `#` comments stripped from .yml members
 *    (overlay patches carried dated developer notes through G1.5);
 *  - package/package.json: drop `private` (a workspace invariant, not a
 *    publish fact), set publishConfig.access=public — the registry
 *    shape, produced at the same door DSH's release pack produces it.
 *    A `description` carrying a leakage marker REFUSES the tarball:
 *    product copy is fixed at source, never rewritten by the gate.
 *  Exported for the wall suite (release-artifact-plane.spec.ts). */
export function stripPackedTarballs (files) {
  const walk = (dir, out) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p, out)
      else if (/\.(js|mjs|cjs|css|d\.ts|ya?ml)$/.test(ent.name)) out.push(p)
    }
    return out
  }
  for (const f of files) {
    const dir = mkdtempSync(join(tmpdir(), 'melite-strip-'))
    try {
      run('tar', ['-xzf', f, '-C', dir])
      for (const p of walk(join(dir, 'package'), [])) {
        const raw = readFileSync(p, 'utf8')
        const next = /\.(ya?ml)$/.test(p) ? stripLeakageYaml(raw) : stripLeakageComments(raw)
        if (next !== raw) writeFileSync(p, next)
      }
      const manifestPath = join(dir, 'package', 'package.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if (typeof manifest.description === 'string' && isLeak(manifest.description)) {
        throw new Error(`strip gate: ${f.split('/').pop()} description carries development history (${JSON.stringify(manifest.description)}) — product copy is fixed at source`)
      }
      delete manifest.private
      manifest.publishConfig = { ...manifest.publishConfig, access: 'public' }
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      run('bash', ['-c', `tar -czf ${f}.new -C ${dir} package && mv ${f}.new ${f}`])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
}

async function mint (opts) {
  const dirty = git('status', '--porcelain')
  if (dirty) fail(`work tree is dirty — commit first:\n${dirty}`)
  const tag = resolveTag(opts.tag)
  const commit = git('rev-parse', 'HEAD')
  const rel = releaseJson(tag)
  if (!rel) {
    fail(`no GitHub release for ${tag} — create it first:\n` +
      `gh release create ${tag} --title "${tag}" --notes "$(git tag -l --format='%(contents)' ${tag})"` +
      (PRERELEASE_PAT.test(tag) ? ' --prerelease' : ''))
  }
  const dest = mkdtempSync(join(tmpdir(), 'melite-release-'))
  try {
    // G1 — BUILD PLANE (packages-alpha3-release-audit): the mint packs
    // built lib/, never source. Every workspace member builds from the
    // CURRENT tree before pack; the estate/vendor tier ships tracked,
    // reference-built lib and is asserted by G2/G5 below.
    console.log('G1: building every workspace member (artifact plane) …')
    execFileSync(process.execPath, [join(import.meta.dirname, 'build-plane.mjs'), 'build'], { stdio: 'inherit' })
    console.log(`packing workspace @ ${commit.slice(0, 8)} …`)
    execFileSync(pnpmBin(), ['-r', 'pack', '--pack-destination', dest], { stdio: 'inherit' })
    const files = run('bash', ['-c', `ls ${dest}/*.tgz`]).split('\n').filter(Boolean)
    if (files.length === 0) fail('pnpm packed zero tarballs — refusing an empty artifact set')
    // G1.5 — COMMENT HYGIENE (publish plane): compiled lib inherits the
    // source plane's dated rationale comments; the artifact must not ship
    // development history. Strip leakage markers from every packed
    // js/mjs/css/declaration BEFORE the gates below run, so G2/G5 assert
    // the stripped bytes — the executability probe is the proof the
    // strip is behavior-neutral.
    console.log('G1.5: stripping leakage comments from packed artifacts …')
    stripPackedTarballs(files)
    const innerFiles = new Map()

    for (const f of files) {
      const tarName = f.split('/').pop()
      const listing = run('tar', ['-tzf', f]).split('\n').filter(Boolean)
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${f} package/package.json`]))

      try {
        validateTarballPayload(inner, listing, tarName)
        classifyEntry(inner, tarName)
        const literals = exportsRows(inner, listing, tarName)
        validateBuiltEntry(inner, builtEntryText(f, inner), tarName)
        innerFiles.set(tarName, { f, literals, inner })
      } catch (e) { fail(e.message) }
    }

    // G6 — OVERLAY NAME LAW (release-plane re-audit): a packed overlay's
    // plugin rows must name packages that ship in this same set. A row
    // naming anything else (a pre-rescope name, a typo, a dropped
    // package) cannot resolve for a cold consumer and kills the boot —
    // the infer-estate twin's whole failure class, caught at mint time.
    const packed = new Map([...innerFiles.values()].map((x) => [
      x.inner.name,
      new Set(['', ...Object.keys(x.inner.exports ?? {}).map((k) => k.replace(/^\.\//, ''))]),
    ]))
    for (const { f, inner } of innerFiles.values()) {
      const patch = inner.dsh?.bundle?.patch
      if (typeof patch !== 'string') continue
      const overlay = run('bash', ['-c', `tar -xzOf ${f} package/${patch.replace(/^\.\//, '')}`])
      const offender = overlayNameOffender(inner.name, overlay, packed)
      if (offender) fail(`overlay gate: ${offender} — cannot resolve in the packed set`)
    }
    console.log('overlay gate: every packed overlay row names an in-set package')

    // G7 — CHANNEL COHERENCE: one version for every melite seat, and
    // the tag is that version
    const coherence = versionCoherenceOffender(innerFiles, tag)
    if (coherence) fail(`version gate: ${coherence}`)
    console.log(`entry gate: ${files.length} tarballs carry every exports target; payload plane clean`)

    // G5 — EXECUTABILITY PROBE (the alpha.2 killer): every literal
    // exports row of every tarball imports under PLAIN NODE from a
    // bare extract with deps stubbed. See probeExecutability.
    try {
      await probeExecutability(innerFiles)
    } catch (e) { fail(e.message) }

    // The publish order: dependencies before consumers (depth-first
    // postorder over in-set dependencies + peerDependencies), one
    // tarball name per line. tools/publish-npm.mjs consumes it so the
    // registry never sees a consumer whose dependency is still missing.
    const byName = new Map([...innerFiles.values()].map((v) => [v.inner.name, v.f.split('/').pop()]))
    const ordered = []
    const seen = new Set()
    const visit = (name) => {
      if (seen.has(name)) return
      seen.add(name)
      const entry = [...innerFiles].find(([, v]) => v.inner.name === name)
      if (!entry) return
      const deps = [...Object.keys(entry[1].inner.dependencies ?? {}), ...Object.keys(entry[1].inner.peerDependencies ?? {})]
      for (const d of deps.sort()) if (byName.has(d)) visit(d)
      ordered.push(byName.get(name))
    }
    for (const name of [...byName.keys()].sort()) visit(name)
    if (ordered.length !== files.length) fail(`publish order covers ${ordered.length}/${files.length} tarballs — refusing an incomplete order`)
    const orderPath = join(dest, 'order.txt')
    writeFileSync(orderPath, ordered.join('\n') + '\n')

    const manifest = {
      manifest: 1,
      tag,
      commit,
      packedAt: new Date().toISOString(),
      packages: files.map((f) => ({
        file: f.split('/').pop(),
        bytes: Number(run('stat', ['-c', '%s', f])),
        sha256: sha256(f),
      })),
    }
    const manifestPath = join(dest, 'release-manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    if (opts.out) {
      // The publish plane's copy of the exact gated bytes: tarballs +
      // manifest + order. The release-publish workflow feeds this dir
      // to tools/publish-npm.mjs unchanged.
      mkdirSync(opts.out, { recursive: true })
      for (const f of [...files, manifestPath, orderPath]) {
        copyFileSync(f, join(opts.out, f.split('/').pop()))
      }
      console.log(`gated publish set copied to ${opts.out}`)
    }
    console.log(`uploading ${files.length} tarballs + manifest to ${tag} …`)
    run('gh', ['release', 'upload', tag, ...files.map((f) => f), manifestPath, '--clobber'])
    console.log(`✓ ${tag}: ${files.length} tarballs + release-manifest.json @ ${commit.slice(0, 8)}`)
  } finally { rmSync(dest, { recursive: true, force: true }) }
}

/** G5: bare-extract + plain-node import of every literal exports row.
 *  External deps are stubbed through the module.register() loader pair
 *  in tools/exec-stub-loader.mjs (tracked file — no inline source).
 *  A bare-specifier miss is a probe artifact (the release closure
 *  installs deps); a relative miss inside the extract is an in-package
 *  byte defect and refuses the mint. */
export async function probeExecutability (innerFiles) {
  const probeDir = mkdtempSync(join(tmpdir(), 'melite-exec-probe-'))
  try {
    const loader = join(import.meta.dirname, 'exec-stub-loader.mjs')
    // THE CLOSURE TREE (the data-derived seats): a card whose schema
    // rides family DECLs (image-edit's EDIT_LIST_CAP) executes DOMAIN
    // validation at import — a stubbed sibling can never satisfy it,
    // and refusing the mint would outlaw the law. Every @melite /
    // @melite-plugin / vendored @deepseek-ai tarball in the release
    // extracts ONCE into probeDir/node_modules (recursive, bounded by
    // the tarball set), so plain-node resolution finds the REAL
    // packages. The stub stays the fallback for true externals.
    const byName = new Map()
    for (const [tarName, meta] of innerFiles) {
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${meta.f} package/package.json`]))
      byName.set(inner.name, meta.f)
    }
    const nmDir = join(probeDir, 'node_modules')
    const extracted = new Set()
    const extractPkg = (name) => {
      if (extracted.has(name)) return
      extracted.add(name)
      const tgz = byName.get(name)
      if (!tgz) return
      const destDir = join(nmDir, name)
      run('mkdir', ['-p', destDir])
      run('tar', ['-xzf', tgz, '-C', destDir, '--strip-components=1'])
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${tgz} package/package.json`]))
      for (const dep of [...Object.keys(inner.dependencies ?? {}), ...Object.keys(inner.peerDependencies ?? {})]) {
        if (byName.has(dep)) extractPkg(dep)
      }
    }
    for (const name of byName.keys()) extractPkg(name)
    for (const [tarName, { f, literals }] of innerFiles) {
      const extract = join(probeDir, tarName.replace(/\.tgz$/, ''))
      run('mkdir', ['-p', extract])
      run('tar', ['-xzf', f, '-C', extract])
      const pkgDir = join(extract, 'package')
      for (let row of literals) {
        if (!row.startsWith('./')) row = './' + row
        // types rows (.d.ts) are compile-time doors — plain Node cannot
        // import a declaration file, and their internal specifiers are
        // proven by the entry gate (existence; G8 proves the built
        // entry's specifiers carry extensions) plus the consumer-side
        // typecheck walls. Skip loudly, never silently.
        if (row.endsWith('.d.ts')) {
          console.log(`  probe: ${tarName} ${row} — types door (compile-time; entry gate proved it ships)`)
          continue
        }
        const entry = join(pkgDir, row)
        // Loader-marked rows are browser-plane bundles (the tsdown
        // consolidation's client doors): the host runtime's module
        // table loads them under window, so a plain-Node import is
        // the wrong proof for them. The marker — first bytes
        // window.__ModuleLoader__.load( — is the same ownership
        // boundary build-plane.mjs stashes bundles by. Skip loudly,
        // never silently.
        if (readFileSync(entry, 'utf8').startsWith('window.__ModuleLoader__.load(')) {
          console.log(`  probe: ${tarName} ${row} — browser bundle door (loader-marked; the host runtime loads it)`)
          continue
        }
        const boot = `import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; ` +
          `register(${JSON.stringify(pathToFileURL(loader).href)}, pathToFileURL(${JSON.stringify(pkgDir + '/')})); ` +
          `await import(pathToFileURL(${JSON.stringify(entry)}).href);`
        const r = spawnSync(process.execPath, ['--no-warnings', '--import', `data:text/javascript,${encodeURIComponent(boot)}`], { encoding: 'utf8', cwd: pkgDir })
        if (r.status === 0) continue
        const errText = r.stderr || ''
        const pkgMiss = errText.match(/Cannot find package '([^']+)'/)
        if (pkgMiss && !pkgMiss[1].startsWith('.') && !pkgMiss[1].startsWith('@melite') && !pkgMiss[1].startsWith('@melite-plugin')) {
          console.log(`  probe: ${tarName} ${row} — dep "${pkgMiss[1]}" not stubbed (closure installs it; recorded, not refused)`)
          continue
        }
        throw new Error(`executability gate: ${tarName} ${row} does not import under plain node:\n${errText.split('\n').slice(0, 12).join('\n')}`)
      }
      console.log(`  probe: ${tarName} — ${literals.length} rows import under plain node`)
    }
  } finally { rmSync(probeDir, { recursive: true, force: true }) }
}

function verify (opts) {
  // /releases/latest EXCLUDES prereleases — an alpha-only repo 404s.
  // "Latest" for this tool = newest by the releases list (newest first).
  const tag = opts.tag || gh(['api', `repos/${REPO}/releases`, '--jq', '.[0].tag_name'])
  const rel = releaseJson(tag)
  if (!rel) fail(`no release for ${tag}`)
  const manifestAsset = rel.assets.find((a) => a.name === 'release-manifest.json')
  if (!manifestAsset) fail(`${tag} carries no release-manifest.json — mint it: node tools/release-artifacts.mjs mint`)
  // REST asset listings return content: "" — the manifest bytes
  // come down the same wire every asset does.
  const mdir = mkdtempSync(join(tmpdir(), 'melite-verify-manifest-'))
  let manifest
  try {
    run('gh', ['release', 'download', tag, '--repo', REPO, '--pattern', 'release-manifest.json', '--dir', mdir])
    manifest = JSON.parse(readFileSync(join(mdir, 'release-manifest.json'), 'utf8'))
  } finally { rmSync(mdir, { recursive: true, force: true }) }
  const tagCommit = git('rev-list', '-1', tag)
  if (manifest.commit !== tagCommit) {
    fail(`manifest commit ${manifest.commit} ≠ tag commit ${tagCommit} — the manifest was minted from a different tree`)
  }
  let missing = 0
  let mismatched = 0
  for (const p of manifest.packages) {
    const asset = rel.assets.find((a) => a.name === p.file)
    if (!asset) { console.error(`✗ missing asset ${p.file}`); missing++; continue }
    const want = `sha256:${p.sha256}`
    let have = asset.digest
    if (!have) { // digest field absent — hash the bytes ourselves
      const d = mkdtempSync(join(tmpdir(), 'melite-verify-'))
      try {
        run('gh', ['release', 'download', tag, '--repo', REPO, '--pattern', p.file, '--dir', d])
        have = `sha256:${sha256(join(d, p.file))}`
      } finally { rmSync(d, { recursive: true, force: true }) }
    }
    if (have !== want) { console.error(`✗ digest mismatch ${p.file}: release ${have} ≠ manifest ${want}`); mismatched++ }
  }
  const localHead = git('rev-parse', 'HEAD')
  const ahead = git('rev-list', '--count', `${tag}..HEAD`)
  console.log(`release ${tag} @ ${manifest.commit.slice(0, 8)}: ` +
    `${manifest.packages.length - missing - mismatched}/${manifest.packages.length} assets verified against the manifest`)
  if (missing || mismatched) fail(`${missing} missing, ${mismatched} mismatched`)
  console.log(ahead === '0'
    ? `local HEAD ${localHead.slice(0, 8)} IS the release tag — the latest build is up there`
    : `local HEAD ${localHead.slice(0, 8)} is ${ahead} commit(s) PAST ${tag} — the release does not carry those; tag + mint when you want them shipped`)
}

// CLI boundary: only dispatch when invoked directly — the wall suite
// (release-artifact-plane.spec.ts) requires this module for its gates
// and must not run mint/verify against vitest's argv.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  const [verb, ...rest] = process.argv.slice(2)
  const opts = {}
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--tag') opts.tag = rest[++i]
    else if (rest[i] === '--out') opts.out = rest[++i]
  }
  if (verb === 'mint') mint(opts).catch((err) => { console.error(err); process.exitCode = 1 })
  else if (verb === 'verify') verify(opts)
  else fail('usage: node tools/release-artifacts.mjs <mint|verify> [--tag vX.Y.Z] [--out DIR]')
}
