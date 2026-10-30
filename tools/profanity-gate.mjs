#!/usr/bin/env node
// profanity-gate.mjs — THE PROFANITY GATE (owed-fixes round, 2026-11-05,
// operator order): every authored face, every packed tarball, and every
// commit a push would add is judged against MAINTAINED multilingual
// profanity lists — never a hand-rolled word list (AGENTS.md policy:
// prefer maintained dependencies when they delete owned code).
//
// ENGINE RECEIPT (verified after install, 2026-11-05):
//   leo-profanity@1.9.0 — Shutterstock-based en dictionary (253 entries);
//   its optional dictionaries carry french-badwords-list (fr, 2432) and
//   russian-bad-words (ru). check() is TOKEN-based, NOT substring:
//   probes class / assess / Scunthorpe / classic all clean, mixed-case
//   forms caught. BUT its tokenizer keeps attached punctuation: a
//   profanity followed by '!' or wrapped in parens MISSES check().
//   This gate therefore uses leo as the list owner (reset/
//   getDictionary/add/list API — list() ends up the merged universe)
//   and compiles the attributed lists into unicode word-boundary
//   regexes at init: the precision law's sanctioned wrap. Boundary =
//   (?<![\p{L}\p{N}_]) … (?![\p{L}\p{N}_]) — JS \b is ASCII-only and
//   the lists carry accented entries, so a plain \b would mis-fence
//   them. This header names no literal entries on purpose: the tool
//   judges its own authored face too.
//   naughty-words@1.2.0 (LDNOOBW, CC-BY-4.0) — 28 per-locale arrays
//   (en es fr de ru ja zh tr …) merged in as additional attributed
//   lists, so a hit names the list it came from.
//
// DOCUMENTED LIMITS (pinned by the wall, never silent holes):
//   - leetspeak/obfuscation ('b00b', 'sh1t') is absent from the
//     maintained lists and is NOT caught. Expanding it ourselves would
//     be exactly the hand-rolled list the dependency policy bans; the
//     wall asserts the limit stays a limit.
//   - cross-script transliteration and non-listed languages are not
//     caught.
//
// PATH LAW — whitelisting is BY PATH only: node_modules/, .git/, the
// vendored upstream mirrors (vendor/, the viser-timeline face) and —
// repo mode only — build outputs (dist/, lib/) are never scanned:
// upstream's bytes are not ours to edit and a build output is judged
// at its source. A packed tarball has no source plane, so its built
// faces ARE the publish faces and the build-output exclusions do NOT
// apply in tar/history modes.
//
// ALLOWLIST LAW: word-level only; every entry carries a dated reason
// (a linguistic or technical collision, e.g. a common word that is
// profanity in another language). A content-based allowance (file,
// line, context) that could hide a real hit is banned.
//
// HISTORY LAW: --history <range>|--all judges every commit in the
// range in its OWN tree (git ls-tree + one git cat-file --batch per
// commit, streamed — never a checkout), so commit A adding profanity
// and commit B removing it cannot ride a clean tip through a push.
// History cures (filter-repo, rewrites) are OPERATOR-ONLY — the
// PR-history law bans raw --force — the gate reports, it never
// rewrites.
//
// CLI:
//   node tools/profanity-gate.mjs <paths…>            repo mode
//   node tools/profanity-gate.mjs --tar <path.tgz>    packed tarball
//   node tools/profanity-gate.mjs --history <range>   commit range
//   node tools/profanity-gate.mjs --history --all     whole history
// Modes compose: the pre-push job scans the authored faces AND the
// push range in one run with one exit code. Exit 1 with one line per
// hit (file:line + word + source list); exit 0 with a one-line count.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, relative, resolve } from 'node:path'
import leo from 'leo-profanity'
import naughtyWords from 'naughty-words'

/** Extensions judged as text. d.ts rides .ts; cjs rides .js. */
export const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md',
  '.yaml', '.yml', '.css', '.html', '.svg', '.txt',
])

/** Never scanned, every mode: vendored upstream mirrors are upstream's
 *  bytes, not ours to edit (the vendor/ tree and the viser-timeline
 *  face). vendor/node_modules/.git are excluded at ANY path segment
 *  (pnpm nests dependency trees inside every workspace member) — see
 *  SEGMENT_EXCLUDED. */
export const EXCLUDED_PREFIXES = [
  'packages/web-kit/timeline/src/timeline/viser-timeline/',
]

/** Excluded at any path segment, every mode: dependency trees, VCS
 *  state, and vendored upstream mirrors live inside the tree too. */
export const SEGMENT_EXCLUDED = new Set(['node_modules', '.git', 'vendor'])

/** Repo mode only: build outputs are judged at their source, at ANY
 *  path segment (packages/<pkg>/lib reference builds, vite dist/, the
 *  istanbul coverage/ trees). Tarball and history modes judge built
 *  faces directly (a packed tarball has no source plane — the built
 *  face IS the publish face). */
export const REPO_ONLY_SEGMENTS = new Set(['lib', 'dist', 'coverage'])

/** The authored faces of the pre-push live phase. */
export const DEFAULT_FACES = ['packages', 'scripts', 'tools', 'lefthook.yml']

/** ALLOWLIST — word-level false positives only; every entry names its
 *  dated reason (the colliding language and OUR legitimate usage).
 *  Content-based allowances (file, line, context) are banned: they
 *  could hide a real hit. Entries land here only on a proven
 *  collision; profane content itself is NEVER allowlisted — it is
 *  reported. */
export const ALLOWLIST = [
  // 2026-11-05 — the landing-day collisions (each: legitimate English /
  // technical usage vs a maintained non-en list entry or an en word's
  // other sense). The evidence trail lives in
  // dev_docs/audits/contracts/profanity-gate-2026-11-05.md.
  { word: 'trio', reason: '2026-11-05: en "trio" (group of three: audio-trio prose, fixture words) vs naughty:es entry' },
  { word: 'minus', reason: '2026-11-05: en "minus" (arithmetic keys, MINUS test labels) vs leo:fr entry' },
  { word: 'am', reason: '2026-11-05: en "am" (verb + 05:01 AM clock labels) vs naughty:tr entry' },
  { word: 'sm', reason: '2026-11-05: en "sm" (responsive CSS breakpoint + bundle identifiers) vs naughty:ja entry' },
  { word: 'xx', reason: '2026-11-05: en "xx" (fixture placeholders) vs leo:en entry' },
  { word: 'del', reason: '2026-11-05: en "del" (delete operation rows) vs naughty:nl entry' },
  { word: 'fan', reason: '2026-11-05: en "fan" (fan-out prose, FAN test ids) vs naughty:no entry' },
  { word: 'cu', reason: '2026-11-05: test identifier "cu" (const helper) vs naughty:pt entry' },
  { word: 'bite', reason: '2026-11-05: en "bite" (prose: "makes this arm bite") vs leo:fr entry' },
  { word: 'sale', reason: '2026-11-05: en "sale" ("license-cleared for sale") vs leo:fr entry' },
  { word: 'noun', reason: '2026-11-05: en "noun" (grammar rule text) vs leo:ru entry' },
  { word: 'kutta', reason: '2026-11-05: "Runge-Kutta" solver name vs naughty:hi entry' },
  { word: 'stake', reason: '2026-11-05: en "stake" (proxy-risk prose) vs naughty:sv entry' },
  { word: 'gol', reason: '2026-11-05: prompt-token example "gol" in docstrings vs naughty:ru entry' },
  { word: 'cyc', reason: '2026-11-05: test identifier "cyc" (cycle) vs naughty:pl entry' },
  { word: 'dupa', reason: '2026-11-05: test identifier "dupA" (duplicate A) vs naughty:pl entry' },
  { word: '13.', reason: '2026-11-05: date fragment "13." (a 2026-10-13. prose date) vs naughty:zh entry' },
  { word: 'sexual', reason: '2026-11-05: content-moderation safety prompts ("Do NOT include anything sexual; keep it PG") vs naughty:en entry' },
  { word: 'nsfw', reason: '2026-11-05: content-moderation flag (sfw/nsfw tagger seat) vs naughty:en entry' },
  { word: 'girl on', reason: '2026-11-05: innocuous prompt fixture ("a girl on the left side") vs naughty:en phrase entry' },
  { word: 'butt', reason: '2026-11-05: NLE editing term "butt" (butt cut/join, h3 timeline copy) vs leo:en entry' },
  { word: 'xxx', reason: '2026-11-05: FIXME/TODO/XXX marker census vocabulary vs leo:en entry' },
  { word: 'pot', reason: "2026-11-05: three.js JSDoc acronym \"POT\" (power of two) inside the built three-client bundle vs naughty:nl entry" },
]

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts })

const dedupeWords = (words) => [...new Set(words.filter((w) => typeof w === 'string' && w.length > 0))]

/**
 * The attributed source lists: leo's native dictionaries first
 * (attribution priority), then every naughty-words locale
 * alphabetically. leo.add() merges the whole universe into the engine,
 * so leo.list() IS the merged set (the add/list API is the merge
 * mechanism, not a decoration).
 * @returns {{ name: string, words: string[] }[]} attributed lists
 */
export function sourceLists () {
  leo.reset() // leo:en (Shutterstock) active
  const lists = [{ name: 'leo:en', words: dedupeWords(leo.list()) }]
  for (const native of ['fr', 'ru']) {
    if (native in leo.wordDictionary) {
      lists.push({ name: `leo:${native}`, words: dedupeWords(leo.wordDictionary[native]) })
    }
  }
  for (const locale of Object.keys(naughtyWords).sort()) {
    lists.push({ name: `naughty:${locale}`, words: dedupeWords(naughtyWords[locale]) })
  }
  leo.add(lists.flatMap((l) => l.words))
  return lists
}

/** The merged universe leo's list() holds after sourceLists(). */
export const engineUniverse = () => leo.list()

/**
 * Drop allowlisted entries (word-level, case-insensitive) from one
 * list's words. Exported for the wall's mechanism proof.
 * @param {string[]} words candidate entries
 * @param {{ word: string, reason: string }[]} [allowlist]
 * @returns {string[]} entries that survive the allowlist
 */
export function applyAllowlist (words, allowlist = ALLOWLIST) {
  const banned = new Set(allowlist.map((a) => a.word.toLowerCase()))
  return words.filter((w) => !banned.has(w.toLowerCase()))
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compile one attributed list into a unicode word-boundary matcher.
 * @param {{ name: string, words: string[] }} list
 * @returns {{ name: string, re: RegExp, count: number } | null}
 */
export function compileMatcher (list) {
  const kept = applyAllowlist(list.words)
  if (kept.length === 0) return null
  const body = kept.map(escapeRe).join('|')
  return {
    name: list.name,
    re: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`, 'giu'),
    count: kept.length,
  }
}

/** All matchers, in attribution order, plus `any` (the union regex —
 *  a superset of every list, so the per-line prefilter can never hide
 *  a hit) and `index` (lowercased entry → first list in load order):
 *  attribution becomes a map lookup instead of 31 regex passes over
 *  the same line — the difference between minutes and hours on
 *  multi-megabyte minified lines. */
export function buildMatchers () {
  const lists = sourceLists()
  const matchers = lists.map(compileMatcher).filter(Boolean)
  const index = new Map()
  for (const { name, words } of lists) {
    for (const w of applyAllowlist(words)) {
      if (!index.has(w.toLowerCase())) index.set(w.toLowerCase(), name)
    }
  }
  const unionWords = [...new Set(lists.flatMap((l) => l.words))]
  const union = compileMatcher({ name: 'any', words: unionWords })
  return { matchers, any: union.re, index }
}

/**
 * Scan one text body. A word matching several lists is attributed to
 * the first list in load order (dedupe per line): through the index
 * map when the bundle carries one, else the per-list regex loop (the
 * wall's synthetic bundles).
 * @param {string} text the file/blob bytes as utf8
 * @param {{ matchers?: { name: string, re: RegExp }[], any: RegExp, index?: Map<string, string> }} matchers
 * @returns {{ line: number, word: string, list: string }[]} hits
 */
export function scanText (text, matchers) {
  const hits = []
  const lines = text.split('\n')
  const { matchers: lists, any, index } = matchers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    any.lastIndex = 0
    if (!any.test(line)) continue
    const seen = new Set()
    if (index) {
      any.lastIndex = 0
      let match
      while ((match = any.exec(line)) !== null) {
        const key = match[0].toLowerCase()
        if (!seen.has(key) && index.has(key)) {
          seen.add(key)
          hits.push({ line: i + 1, word: match[0], list: index.get(key) })
        }
        if (match[0].length === 0) any.lastIndex++ // zero-width guard
      }
    } else {
      for (const m of lists) {
        m.re.lastIndex = 0
        let match
        while ((match = m.re.exec(line)) !== null) {
          const key = match[0].toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            hits.push({ line: i + 1, word: match[0], list: m.name })
          }
          if (match[0].length === 0) m.re.lastIndex++ // zero-width guard
        }
      }
    }
  }
  return hits
}

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '')

/**
 * The BY-PATH law. repoMode adds the build-output prefixes (their
 * source is the judged face); tarball/history modes do not.
 * @param {string} path repo- or entry-relative path
 * @param {{ repoMode?: boolean }} [opts]
 * @returns {boolean} true when the path is upstream/generated territory
 */
export function pathExcluded (path, { repoMode = true } = {}) {
  const p = norm(path)
  const segs = p.split('/')
  if (segs.some((seg) => SEGMENT_EXCLUDED.has(seg))) return true
  if (repoMode && segs.some((seg) => REPO_ONLY_SEGMENTS.has(seg))) return true
  return EXCLUDED_PREFIXES.some((pre) => p.startsWith(pre))
}

const isText = (p) => TEXT_EXTS.has(extname(p).toLowerCase())

// The typecheck wall synthesizes .tsconfig.test.<pid>.json in each
// package dir for its per-package tsc pass and rmSyncs it in a
// finally (scripts/typecheck-tests.mjs:84). Generated debris that
// mirrors its package's own tsconfig — never an authored face — and
// judging it races the delete: the walk lists it, the tier's finally
// removes it, the read ENOENTs (the 2026-11-06 gate-B red, "authored
// faces are dirty" on a file no author wrote).
const SYNTHESIZED_CONFIG_RE = /^\.tsconfig\.test\.\d+\.json$/

function collectFiles (absDir, rel, out) {
  for (const ent of readdirSync(absDir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${ent.name}` : ent.name
    if (pathExcluded(r)) continue
    if (SYNTHESIZED_CONFIG_RE.test(ent.name)) continue
    const abs = join(absDir, ent.name)
    if (ent.isDirectory()) collectFiles(abs, r, out)
    // isFile only: symlinks (pnpm's links into node_modules) are not
    // authored bytes to judge
    else if (ent.isFile() && isText(r)) out.push(abs)
  }
  return out
}

/**
 * Repo mode: scan the given paths (files or directories, relative to
 * root or absolute) under root. Hits report root-relative when the
 * file lives under root, absolutely otherwise.
 * @param {string} root scan root (the checkout)
 * @param {string[]} paths files/directories
 * @param {{ matchers: { name: string, re: RegExp }[], any: RegExp }} [matchers]
 * @returns {{ file: string, line: number, word: string, list: string }[]}
 */
export function scanPaths (root, paths, matchers = buildMatchers()) {
  const hits = []
  const relOf = (f) => {
    const r = relative(root, f)
    return r && !r.startsWith('..') ? r : f
  }
  for (const p of paths) {
    const abs = resolve(root, p)
    if (!existsSync(abs)) throw new Error(`profanity-gate: path not found: ${p}`)
    let files = []
    if (statSync(abs).isDirectory()) {
      files = collectFiles(abs, '', [])
    } else {
      const r = relative(root, abs)
      const judged = r && !r.startsWith('..') ? r : norm(p)
      if (isText(judged) && !pathExcluded(judged)) files = [abs]
    }
    for (const f of files) {
      // A concurrent tier may delete a walked file before this read
      // (the finally-rm above is one writer) — a file gone between
      // the walk and the read is transient debris, not an authored
      // face; only a present-but-unreadable file still throws.
      let text
      try {
        text = readFileSync(f, 'utf8')
      } catch (err) {
        if (err.code === 'ENOENT') continue
        throw err
      }
      for (const h of scanText(text, matchers)) {
        hits.push({ file: relOf(f), ...h })
      }
    }
  }
  return hits
}

/**
 * Tar mode (the publish side): extract once, judge every text entry
 * under the BY-PATH law (repoMode false — the built faces are the
 * publish faces). Entry names report as <tarball>!<entry>.
 * @param {string} tarPath packed .tgz
 * @param {{ matchers: { name: string, re: RegExp }[], any: RegExp }} [matchers]
 * @returns {{ file: string, line: number, word: string, list: string }[]}
 */
export function scanTarball (tarPath, matchers = buildMatchers()) {
  const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-tar-'))
  try {
    run('tar', ['-xzf', tarPath, '-C', dir])
    const listing = run('tar', ['-tzf', tarPath]).split('\n').filter(Boolean)
    const hits = []
    for (const entry of listing) {
      if (entry.endsWith('/')) continue
      const rel = entry.replace(/^package\//, '')
      if (pathExcluded(rel, { repoMode: false }) || !isText(rel)) continue
      let text
      try { text = readFileSync(join(dir, entry), 'utf8') } catch { continue } // listing/extract drift
      for (const h of scanText(text, matchers)) {
        hits.push({ file: `${tarPath.split('/').pop()}!${entry}`, ...h })
      }
    }
    return hits
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

const gitIn = (cwd, ...args) => run('git', ['-C', cwd, ...args])

/**
 * Commit shas in a range ('all' = every commit reachable from HEAD).
 * @param {string} root repo root
 * @param {string} range a git rev-range or 'all'
 * @returns {string[]} commit shas, newest first (git rev-list order)
 */
export function historyCommits (root, range) {
  const out = gitIn(root, 'rev-list', ...(range === 'all' ? ['HEAD'] : [range]))
  return out.split('\n').filter(Boolean)
}

/**
 * History mode: judge every commit in the range in its OWN tree. Each
 * commit's text paths stream through one git cat-file --batch (never a
 * checkout); non-blob entries (submodule pointers) and binary-looking
 * bodies are skipped. The FULL repo path law applies per commit —
 * every commit carries its own source tree, so build outputs
 * (lib/dist/coverage) are judged at their source commit; the packed
 * tarball remains the only place built bytes are judged (they are what
 * ships).
 * @param {string} root repo root
 * @param {string} range a git rev-range or 'all'
 * @param {{ matchers: { name: string, re: RegExp }[], any: RegExp }} [matchers]
 * @returns {{ hits: { commit: string, file: string, line: number, word: string, list: string }[], commits: number, blobs: number }}
 */
export function scanHistory (root, range, matchers = buildMatchers()) {
  const commits = historyCommits(root, range)
  const hits = []
  let blobs = 0
  let done = 0
  for (const sha of commits) {
    // stderr keeps the stdout contract (exit-0 silence) while a
    // whole-history baseline stays observable
    if (++done % 250 === 0) console.error(`profanity-gate: history … ${done}/${commits.length} commits, ${hits.length} hits so far`)
    const paths = gitIn(root, 'ls-tree', '-r', '--name-only', '-z', sha)
      .split('\0').filter(Boolean)
      .filter((p) => isText(p) && !pathExcluded(p))
    if (paths.length === 0) continue
    // batched: one cat-file --batch per CHUNK, so a commit carrying a
    // multi-megabyte reference tree can never overrun the spawn's
    // maxBuffer — the batch dies, the scan must not
    const CHUNK = 40
    const blobsOf = (chunk) => {
      const r = spawnSync('git', ['-C', root, 'cat-file', '--batch'], {
        input: chunk.map((p) => `${sha}:${p}`).join('\n') + '\n',
        maxBuffer: 1 << 26,
      })
      if (r.status !== 0) throw new Error(`profanity-gate: git cat-file --batch failed on ${sha.slice(0, 10)}: ${r.stderr}`)
      return r.stdout
    }
    for (let c = 0; c < paths.length; c += CHUNK) {
      const chunk = paths.slice(c, c + CHUNK)
      const buf = blobsOf(chunk)
      // parse <oid> <type> <size>\n<body>\n sequences, in input order
      let cur = 0
      let idx = 0
      while (cur < buf.length && idx < chunk.length) {
        const nl = buf.indexOf(0x0a, cur)
        if (nl === -1) break
        const header = buf.slice(cur, nl).toString('utf8')
        cur = nl + 1
        const parts = header.split(' ')
        const size = Number(parts[parts.length - 1])
        const body = buf.slice(cur, cur + size)
        cur += size + 1 // the trailing \n after the body
        const path = chunk[idx++]
        if (parts[1] !== 'blob') continue // submodule pointer or tag
        blobs++
        for (const h of scanText(body.toString('utf8'), matchers)) {
          hits.push({ commit: sha, file: path, ...h })
        }
      }
    }
  }
  return { hits, commits: commits.length, blobs }
}

/**
 * Resolve the pre-push range request. '@{push}..HEAD' judges exactly
 * the commits the push would add; when the branch tracks no upstream
 * (the UPSTREAM-TRACKING LAW), the range phase skips LOUDLY — the
 * caller logs the why, never a silent no-op.
 * @param {string} root repo root
 * @param {string} wanted 'all' or a rev-range (may contain @{push})
 * @returns {{ range: string, skip?: boolean, why?: string }}
 */
export function resolveHistoryRange (root, wanted) {
  if (wanted === 'all') return { range: 'all' }
  if (wanted.includes('@{push}')) {
    const r = spawnSync('git', ['-C', root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{push}'], { encoding: 'utf8' })
    if (r.status !== 0 || !r.stdout.trim()) {
      return { range: wanted, skip: true, why: 'no upstream tracking (@{push} unresolved) — the push range cannot be derived; live faces were judged' }
    }
    return { range: wanted }
  }
  return { range: wanted }
}

const hitLine = (h) => `${h.file}:${h.line}: "${h.word}" [${h.list}]`

function main (argv) {
  const paths = []
  let tar = null
  let history = null
  let all = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tar') tar = argv[++i]
    else if (argv[i] === '--history') {
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) { history = next; i++ } else history = 'HEAD'
    } else if (argv[i] === '--all') all = true
    else paths.push(argv[i])
  }
  if (all) history = 'all'
  if (tar === null && history === null && paths.length === 0) {
    console.error('usage: node tools/profanity-gate.mjs <paths…> | --tar <path.tgz> | --history <range|all> [--all]')
    process.exit(2)
  }

  const bundle = buildMatchers()
  const matchers = bundle.matchers
  const coverage = matchers.reduce((n, m) => n + m.count, 0)

  if (tar !== null) {
    const hits = scanTarball(tar, bundle)
    for (const h of hits) console.log(`profanity-gate: ${hitLine(h)}`)
    console.log(`profanity-gate: ${tar.split('/').pop()} — ${coverage} entries from ${matchers.length} lists — ${hits.length} hit(s)`)
    process.exitCode = hits.length > 0 ? 1 : 0
    return
  }

  if (history !== null) {
    const resolved = resolveHistoryRange(process.cwd(), history)
    if (resolved.skip) {
      console.log(`profanity-gate: history — SKIPPED LOUDLY: ${resolved.why}`)
      return
    }
    const { hits, commits, blobs } = scanHistory(process.cwd(), resolved.range, bundle)
    for (const h of hits) console.log(`profanity-gate: history ${h.commit.slice(0, 10)} ${h.file}:${h.line}: "${h.word}" [${h.list}]`)
    console.log(`profanity-gate: history ${resolved.range} — ${commits} commits / ${blobs} text blobs — ${hits.length} hit(s)`)
    process.exitCode = hits.length > 0 ? 1 : 0
    return
  }

  const hits = scanPaths(process.cwd(), paths, bundle)
  for (const h of hits) console.log(`profanity-gate: ${hitLine(h)}`)
  console.log(`profanity-gate: ${paths.join(' ')} — ${coverage} entries from ${matchers.length} lists — ${hits.length} hit(s)`)
  process.exitCode = hits.length > 0 ? 1 : 0
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('profanity-gate.mjs')
if (invokedDirectly) main(process.argv.slice(2))
