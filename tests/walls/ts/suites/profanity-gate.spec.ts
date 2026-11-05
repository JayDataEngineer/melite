// profanity-gate.spec.ts — THE PROFANITY GATE WALL (owed-fixes round,
// 2026-11-05, operator order): every kind of profanity, judged on push
// (lefthook pre-push, tools/profanity-gate.mjs) and on publish (G10 in
// tools/release-artifacts.mjs), riding MAINTAINED lists (leo-profanity
// + naughty-words). Fixture law: NO profanity is planted in real tree
// files — dirty fixtures are runtime-built in mkdtemp dirs, with the
// words PICKED AT RUNTIME from the maintained lists themselves, so the
// spec's own face stays clean and the picks track list updates.
//
// Red-proof receipts (2026-11-05): (1) the lefthook job toggled out →
// the WIRING arm reds; (2) the G10 mint call toggled out → the WIRING
// arm reds; (3) the history blob walk toggled to tip-only → the
// DELETED-FILE arm reds; (4) the matcher build toggled to null → the
// dirty-fixture + engine arms red (red-by-construction on a gateless
// tree). See dev_docs/audits/contracts/profanity-gate-2026-11-05.md.
//
// Red-proofs (2026-11-15, the exposure audit's history + faces cures):
// (5) the message phase toggled out (commitMessages replaced by an
// empty Map in scanHistory) → "names the MESSAGE hit on a clean tree"
// reds (messages 1→0: "expected +0 to be 1") and the clean-messages
// twin reds ("expected +0 to be 2"); (6) the hook run line toggled
// back to the pre-audit faces (`packages scripts tools lefthook.yml`)
// → "lefthook pre-push carries the two-phase profanity job" reds
// (substring misses the widened literal) AND "the hook run-line faces
// EQUAL the gate DEFAULT_FACES" reds ("expected [ Array(4) ] to
// deeply equal [ Array(5) ]" — the parse arm catches a one-face
// drift the substring probe was built to miss). Restored green:
// 20/20, gate 0 hit(s) over packages scripts tools tests lefthook.yml.
import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const gate = req('../../../../tools/profanity-gate.mjs') as {
  TEXT_EXTS: Set<string>
  EXCLUDED_PREFIXES: string[]
  SEGMENT_EXCLUDED: Set<string>
  REPO_ONLY_SEGMENTS: Set<string>
  DEFAULT_FACES: string[]
  ALLOWLIST: { word: string, reason: string }[]
  sourceLists: () => { name: string, words: string[] }[]
  engineUniverse: () => string[]
  applyAllowlist: (words: string[], allowlist?: { word: string, reason: string }[]) => string[]
  compileMatcher: (list: { name: string, words: string[] }) => { name: string, res: RegExp[], count: number } | null
  MATCHER_CHUNK: number
  buildMatchers: () => { matchers: { name: string, res: RegExp[], count: number }[], any: RegExp[], index: Map<string, string> }
  scanText: (text: string, matchers: unknown) => { line: number, word: string, list: string }[]
  pathExcluded: (path: string, opts?: { repoMode?: boolean }) => boolean
  scanPaths: (root: string, paths: string[], matchers?: unknown) => { file: string, line: number, word: string, list: string }[]
  scanTarball: (tarPath: string, matchers?: unknown) => { file: string, line: number, word: string, list: string }[]
  historyCommits: (root: string, range: string) => string[]
  scanHistory: (root: string, range: string, matchers?: unknown) => {
    hits: { commit: string, file: string, line: number, word: string, list: string }[]
    commits: number, blobs: number, messages: number
  }
  resolveHistoryRange: (root: string, wanted: string) => { range: string, skip?: boolean, why?: string }
}
const gates = req('../../../../tools/release-artifacts.mjs') as {
  profanityRefusal: (tarName: string, f: string) => void
}
const ROOT = join(__dirname, '..', '..', '..', '..')
const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' })

/** Real entries PICKED AT RUNTIME from the maintained lists: first
 *  entry matching the shape, absent from every earlier list (stable
 *  attribution) and from the allowlist (a pick must FIRE). The spec's
 *  own file never carries a literal. */
const lists = gate.sourceLists()
const allowlisted = new Set(gate.ALLOWLIST.map((a) => a.word.toLowerCase()))
const earlierWords = (name: string) => {
  const seen = new Set<string>()
  for (const l of lists) {
    if (l.name === name) break
    for (const w of l.words) seen.add(w.toLowerCase())
  }
  return seen
}
const pick = (name: string, re: RegExp): string => {
  const l = lists.find((x) => x.name === name)
  if (!l) throw new Error(`list missing: ${name}`)
  const w = l.words.find((w) => re.test(w) &&
    !allowlisted.has(w.toLowerCase()) && !earlierWords(name).has(w.toLowerCase()))
  if (!w) throw new Error(`no pickable entry in ${name} for ${String(re)}`)
  return w
}
const EN = pick('leo:en', /^[a-z]{4,}$/)
const ES = pick('naughty:es', /^[a-záéíóúñ]{5,}$/i)
const FR = pick('naughty:fr', /^[a-zàâäéèêëîïôùûüç]{5,}$/i)
const DE = pick('naughty:de', /^[a-zäöüß]{5,}$/i)

const leet = (w: string) => w.replace(/[aeio]/g, (c) => ({ a: '4', e: '3', i: '1', o: '0' }[c] ?? c))

/** A dirty tmpdir fixture with SEVERAL KINDS (md + json faces). */
function dirtyFixture () {
  const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-fx-'))
  writeFileSync(join(dir, 'dirty.md'), [
    `review note: ${EN} ahead`,
    `foreign face: ${ES}`,
    `mixed case: ${FR.toUpperCase()}`,
    `obfuscated: ${leet(EN)}`,
  ].join('\n') + '\n')
  writeFileSync(join(dir, 'dirty.json'), JSON.stringify({ note: DE }, null, 2) + '\n')
  return { dir }
}

/** A tarball-shaped fixture (the G10 input): real tar, real listing. */
function tarFixture (libJs: string): { f: string, dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-tar-fx-'))
  const pkg = join(dir, 'package')
  mkdirSync(join(pkg, 'lib'), { recursive: true })
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'fx', version: '0.0.0', type: 'module' }))
  writeFileSync(join(pkg, 'lib', 'index.js'), libJs)
  const f = join(dir, 'fx.tgz')
  execFileSync('tar', ['-czf', f, '-C', dir, 'package'])
  return { f, dir }
}

describe('PRECISION — the boundary law (the header probes, pinned live)', () => {
  it('never substring-fires: assess / class / Scunthorpe / classic are clean', () => {
    const bundle = gate.buildMatchers()
    expect(gate.scanText('assess the class of Scunthorpe classic assets\n', bundle)).toEqual([])
  })

  it('fires mixed case and punctuation-adjacent forms (the leo.check holes)', () => {
    const bundle = gate.buildMatchers()
    // leo's own check() misses the punctuated form (its tokenizer keeps
    // the '!'); the boundary wrap is the cure — both lines must hit.
    const hits = gate.scanText(`I have ${EN}\n(${EN})!\n`, bundle)
    expect(hits).toHaveLength(2)
    expect(hits[0]).toMatchObject({ line: 1, list: 'leo:en' })
    expect(hits[1]).toMatchObject({ line: 2, list: 'leo:en' })
  })

  it('THE CHUNK LAW (the 2026-11-05 CI burn): every compiled matcher partitions its words into maximal MATCHER_CHUNK-sized regexes — never one giant alternation', () => {
    // The measured cliff: on Node 22 (V8 12.4) a 5221-entry unicode
    // lookbehind alternation scanned the authored tree for ~2000 s
    // (the CI unit tier's 240 s timeout red); the SAME words in
    // ≤2048-entry chunks scanned it in seconds. This arm reds the
    // moment a matcher ships as one un-chunked regex: the packing
    // identity (ceil(count / CHUNK) regexes) breaks first at the
    // union — 5221 words in 1 regex instead of 6.
    const bundle = gate.buildMatchers()
    const chunk = gate.MATCHER_CHUNK
    expect(Number.isInteger(chunk) && chunk > 0 && chunk <= 2048).toBe(true)
    const packings = [
      ...bundle.matchers.map((m) => `${m.name}: ${m.count} words → ${m.res.length} regex(es)`),
      `any: ${bundle.matchers.reduce((n, m) => n + m.count, 0)}+ words → ${bundle.any.length} regex(es)`,
    ]
    for (const m of bundle.matchers) {
      expect(m.res.length, `${m.name} rides maximal ${chunk}-entry chunks (${packings.join('; ')})`)
        .toBe(Math.ceil(m.count / chunk))
    }
    // the union is the every-line prefilter — the cliff's exact seat.
    // Its word count is the allowlisted universe; it cannot pack into
    // fewer than ceil(universe / chunk) regexes without dropping
    // words (the coverage arm below owns that half).
    const universe = [...new Set(lists.flatMap((l) => l.words))]
      .filter((w) => !allowlisted.has(w.toLowerCase()))
    expect(bundle.any.length, `the union's ${universe.length}-word universe rides maximal ${chunk}-entry chunks`)
      .toBe(Math.ceil(universe.length / chunk))
  })

  it('THE CHUNK COVERAGE: chunking loses no words — every allowlisted-surviving universe entry still fires on its own line', () => {
    // A chunking bug that silently drops a partition boundary would
    // un-curse the gate with a green face. One body, every surviving
    // word on its own line, through the REAL scanText door: every
    // line must FIRE. The hit may name a SHORTER overlapping entry
    // (the lists carry leet variants where one entry is a proper
    // prefix of another; leftmost-match reports the first) —
    // attribution identity is not the law, FIRING is: a silent line
    // is a word the gate can no longer see.
    const bundle = gate.buildMatchers()
    const universe = [...new Set(lists.flatMap((l) => l.words))]
      .filter((w) => !allowlisted.has(w.toLowerCase()))
    const hits = gate.scanText(universe.join('\n'), bundle)
    const firedLines = new Set(hits.map((h) => h.line))
    const missing = universe
      .map((w, i) => (firedLines.has(i + 1) ? null : `line ${i + 1}: ${w}`))
      .filter((s): s is string => s !== null)
    expect(missing, `every universe word fires through the chunked union (${missing.length} silent lines)`).toEqual([])
  })

  it('LEET LIMIT (documented, never silent): obfuscation is NOT caught', () => {
    // The maintained lists carry no leetspeak variants; expanding them
    // ourselves would be the hand-rolled list the dependency policy
    // bans. This arm pins the limit: if it ever reds, someone added
    // obfuscation mappings and this wall's comment must be updated.
    const bundle = gate.buildMatchers()
    expect(gate.scanText(`obfuscated: ${leet(EN)}\n`, bundle)).toEqual([])
    expect(gate.scanText(`plain: ${EN}\n`, bundle)).toHaveLength(1)
  })
})

describe('THE DIRTY FIXTURE — several kinds, file+line+list named', () => {
  it('flags en / es / fr (mixed case) / de across .md and .json faces', () => {
    const fx = dirtyFixture()
    try {
      const bundle = gate.buildMatchers()
      const hits = gate.scanPaths(fx.dir, ['dirty.md', 'dirty.json'], bundle)
      expect(hits).toContainEqual({ file: 'dirty.md', line: 1, word: EN, list: 'leo:en' })
      expect(hits).toContainEqual(expect.objectContaining({ file: 'dirty.md', line: 2, list: 'naughty:es' }))
      expect(hits).toContainEqual({ file: 'dirty.md', line: 3, word: FR.toUpperCase(), list: 'naughty:fr' })
      expect(hits).toContainEqual(expect.objectContaining({ file: 'dirty.json', line: 2, list: 'naughty:de' }))
      // the leet line stays invisible (the documented limit)
      expect(hits.some((h) => h.line === 4)).toBe(false)
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('the CLI exits 1 naming file:line + word + list; a clean dir exits 0', () => {
    const fx = dirtyFixture()
    const clean = mkdtempSync(join(tmpdir(), 'melite-profanity-clean-'))
    try {
      writeFileSync(join(clean, 'fine.md'), 'assess class Scunthorpe classic\nplain prose only\n')
      const dirty = spawnSync(process.execPath, [join(ROOT, 'tools', 'profanity-gate.mjs'), fx.dir], { encoding: 'utf8', cwd: ROOT })
      expect(dirty.status).toBe(1)
      expect(dirty.stdout).toContain(`dirty.md:1: "${EN}" [leo:en]`)
      expect(dirty.stdout).toContain('[naughty:es]')
      expect(dirty.stdout).toContain('[naughty:de]')
      const ok = spawnSync(process.execPath, [join(ROOT, 'tools', 'profanity-gate.mjs'), clean], { encoding: 'utf8', cwd: ROOT })
      expect(ok.status).toBe(0)
      expect(ok.stdout).toContain('0 hit(s)')
    } finally {
      rmSync(fx.dir, { recursive: true, force: true })
      rmSync(clean, { recursive: true, force: true })
    }
  })

  // THE WHOLE-TREE SWEEP (the 2026-11-16 CI cure): the arm scans the
  // FULL authored tree through the gate binary — under CI's cold cache
  // the sweep's tail crossed vitest's 30s default and the gate died as
  // a timeout, not a verdict. The budget names the sweep reality
  // (real-card-wire's spawn-budget precedent); the gate is NEVER
  // skipped — a clean verdict must be produced and judged.
  it('the AUTHORED FACES of the real tree are clean TODAY (the ruling held)', { timeout: 240_000 }, () => {
    // The gate's first live catch (2 quoted profanities) was cured by
    // the operator's 2026-11-05 redact-both ruling — the scan exits 0.
    // A future profane face lands red RIGHT HERE. A crash (no verdict
    // line — e.g. a transient OOM while a baseline scan runs) retries
    // once with stderr surfaced; a real dirty exit (status 1 WITH hit
    // lines) is never retried away.
    const argv = [join(ROOT, 'tools', 'profanity-gate.mjs'), ...gate.DEFAULT_FACES]
    let r = spawnSync(process.execPath, argv, { encoding: 'utf8', cwd: ROOT })
    if (r.status !== 0 && !(r.stdout ?? '').includes('hit(s)')) {
      r = spawnSync(process.execPath, argv, { encoding: 'utf8', cwd: ROOT })
    }
    if (r.status !== 0) throw new Error(`authored faces are dirty (status ${r.status}):\n${r.stdout}\n${r.stderr}`)
    expect(r.stdout).toContain('0 hit(s)')
  })
})

describe('TAR MODE — the publish face', () => {
  it('judges packed text entries', () => {
    const fx = tarFixture(`export const x = 1 // carries ${EN}\nconst y = 'assess'\n`)
    try {
      const hits = gate.scanTarball(fx.f)
      expect(hits).toHaveLength(1)
      expect(hits[0].file).toContain('fx.tgz!package/lib/index.js')
      expect(hits[0]).toMatchObject({ line: 1, list: 'leo:en' })
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })
})

describe('G10 — the mint gate drives the same engine', () => {
  it('a dirty tarball REFUSES (same refusal voice as G9); a clean one passes', () => {
    const dirty = tarFixture(`export const x = '${ES}'\n`)
    const clean = tarFixture('export const x = 1\n')
    try {
      expect(() => gates.profanityRefusal('fx.tgz', dirty.f))
        .toThrow(/profanity gate: fx\.tgz — 1 hit\(s\):/)
      expect(gates.profanityRefusal('fx.tgz', clean.f)).toBeUndefined()
    } finally {
      rmSync(dirty.dir, { recursive: true, force: true })
      rmSync(clean.dir, { recursive: true, force: true })
    }
  })
})

describe('HISTORY MODE — the range judges commits in their own trees', () => {
  const historyRepo = () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-hist-'))
    const cfg = ['-c', 'user.email=fx@fx', '-c', 'user.name=fx', '-c', 'commit.gpgsign=false']
    execFileSync('git', ['-C', dir, 'init', '-q'])
    execFileSync('git', ['-C', dir, 'symbolic-ref', 'HEAD', 'refs/heads/main'])
    writeFileSync(join(dir, 'dirty.md'), `carried: ${EN}\n`)
    execFileSync('git', ['-C', dir, 'add', '-A'])
    execFileSync('git', ['-C', dir, ...cfg, 'commit', '-qm', 'one adds the blob'])
    const shaAdd = git(dir, 'rev-parse', 'HEAD').trim()
    execFileSync('git', ['-C', dir, 'rm', '-q', 'dirty.md'])
    execFileSync('git', ['-C', dir, ...cfg, 'commit', '-qm', 'two removes the blob'])
    return { dir, shaAdd }
  }

  it("names the DELETED blob's commit (the hole a live-only scanner passes)", () => {
    const fx = historyRepo()
    try {
      // the tip tree is clean — the file does not exist at HEAD
      expect(existsSync(join(fx.dir, 'dirty.md'))).toBe(false)
      const all = gate.scanHistory(fx.dir, '--all')
      expect(all.commits).toBe(2)
      expect(all.hits).toContainEqual(expect.objectContaining({
        commit: fx.shaAdd, file: 'dirty.md', list: 'leo:en',
      }))
      // the range semantic: only the REMOVING commit is in HEAD~1..HEAD
      const range = gate.scanHistory(fx.dir, 'HEAD~1..HEAD')
      expect(range.commits).toBe(1)
      expect(range.hits).toEqual([])
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('NO UPSTREAM: the range phase skips LOUDLY, never silently', () => {
    const fx = historyRepo()
    try {
      const resolved = gate.resolveHistoryRange(fx.dir, '@{push}..HEAD')
      expect(resolved.skip).toBe(true)
      expect(resolved.why).toMatch(/no upstream/)
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  // THE MESSAGE ARM (the 2026-11-15 exposure audit, cure 4a): the
  // blob walk never sees a quote that rode the commit TEXT — a clean
  // tree with a profane %B body passed the pre-push history phase
  // (the PM-GAP class: real commits carried burn quotes in bodies
  // under clean subjects). The gate judges every message with the
  // same lists; the hit names the sha and reads file '(commit
  // message)'.
  const messageRepo = () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-msg-'))
    const cfg = ['-c', 'user.email=fx@fx', '-c', 'user.name=fx', '-c', 'commit.gpgsign=false']
    execFileSync('git', ['-C', dir, 'init', '-q'])
    execFileSync('git', ['-C', dir, 'symbolic-ref', 'HEAD', 'refs/heads/main'])
    writeFileSync(join(dir, 'clean.md'), 'plain prose only\n')
    execFileSync('git', ['-C', dir, 'add', '-A'])
    execFileSync('git', ['-C', dir, ...cfg, 'commit', '-qm', 'one: clean subject, clean body'])
    execFileSync('git', ['-C', dir, ...cfg, 'commit', '--allow-empty', '-qm', 'two: clean subject', '-m', `the burn quote said ${EN} in the body`])
    return { dir, shaDirty: git(dir, 'rev-parse', 'HEAD').trim() }
  }

  it('names the MESSAGE hit on a clean tree (the quote that rode the commit text)', () => {
    const fx = messageRepo()
    try {
      // the tip TREE is clean of profanity — but the range judges
      // each commit in its OWN FULL TREE (not its diff), so the
      // second commit's clean.md is still one judged blob; the ONLY
      // hit below can come from the message phase
      const range = gate.scanHistory(fx.dir, 'HEAD~1..HEAD')
      expect(range.commits).toBe(1)
      expect(range.blobs).toBe(1)
      expect(range.messages).toBe(1)
      // %B is the raw message: line 1 the subject, line 2 the blank
      // separator, line 3 the body — the quote rode the BODY
      expect(range.hits).toEqual([{
        commit: fx.shaDirty, file: '(commit message)', line: 3, word: EN, list: 'leo:en',
      }])
      // --all sees both messages; the clean first commit stays green
      const all = gate.scanHistory(fx.dir, '--all')
      expect(all.commits).toBe(2)
      expect(all.messages).toBe(2)
      expect(all.hits).toHaveLength(1)
      expect(all.hits[0].commit).toBe(fx.shaDirty)
    } finally { rmSync(fx.dir, { recursive: true, force: true }) }
  })

  it('a repo of clean messages stays green and the messages phase still counts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-msgclean-'))
    try {
      const cfg = ['-c', 'user.email=fx@fx', '-c', 'user.name=fx', '-c', 'commit.gpgsign=false']
      execFileSync('git', ['-C', dir, 'init', '-q'])
      execFileSync('git', ['-C', dir, 'symbolic-ref', 'HEAD', 'refs/heads/main'])
      writeFileSync(join(dir, 'clean.md'), 'plain prose only\n')
      execFileSync('git', ['-C', dir, 'add', '-A'])
      execFileSync('git', ['-C', dir, ...cfg, 'commit', '-qm', 'one'])
      execFileSync('git', ['-C', dir, ...cfg, 'commit', '--allow-empty', '-qm', 'two', '-m', 'the body restates the contract plainly'])
      const r = gate.scanHistory(dir, '--all')
      expect(r.commits).toBe(2)
      expect(r.messages).toBe(2)
      expect(r.hits).toEqual([])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})

describe('PATH + ALLOWLIST LAW', () => {
  it('whitelisting is BY PATH: vendored/dependency/generated faces never scan', () => {
    expect(gate.pathExcluded('packages/web-kit/timeline/src/timeline/viser-timeline/a.ts')).toBe(true)
    expect(gate.pathExcluded('packages/x/vendor/upstream.js')).toBe(true)
    expect(gate.pathExcluded('packages/models/m/node_modules/dep/index.js')).toBe(true)
    expect(gate.pathExcluded('packages/x/lib/bundle.js')).toBe(true) // repo mode
    expect(gate.pathExcluded('packages/x/lib/bundle.js', { repoMode: false })).toBe(false) // tar face
    expect(gate.pathExcluded('packages/x/src/authored.ts')).toBe(false)
  })

  it("the typecheck tier's synthesized .tsconfig.test.<pid>.json never scans (the 2026-11-06 gate-B race: judging the tier's scratch config raced its rmSync)", () => {
    const dir = mkdtempSync(join(tmpdir(), 'melite-profanity-synth-'))
    try {
      // present AND profane: the exclusion decides, not the words.
      // A skipped file is never listed by the walk, so the tier's
      // finally-rm can no longer land between listing and reading —
      // the exclusion IS the race cure for the known writer.
      // (scanPaths additionally tolerates an ENOENT on a walked file
      // for unknown concurrent deleters; node snapshots builtin named
      // imports at link time, so that belt is proven by a manually
      // staged race, not mockable in-process — receipt:
      // dev_docs/audits/contracts/profanity-gate-race-2026-11-06.md.)
      writeFileSync(join(dir, '.tsconfig.test.424242.json'), JSON.stringify({ note: DE }, null, 2) + '\n')
      writeFileSync(join(dir, 'real.md'), `carried: ${EN}\n`)
      const bundle = gate.buildMatchers()
      expect(gate.scanPaths(dir, [dir], bundle).map((h) => h.file)).toEqual(['real.md'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the allowlist is word-level and every entry names a dated reason', () => {
    for (const a of gate.ALLOWLIST) {
      expect(a.word.length).toBeGreaterThan(0)
      expect(a.reason).toMatch(/20\d\d-\d\d-\d\d/)
    }
  })

  it('the allowlist mechanism removes exactly its words (never more)', () => {
    const keeper = 'fxunlistedword'
    const banned = gate.ALLOWLIST[0].word
    const m = gate.compileMatcher({ name: 'fx', words: [banned, keeper] })
    expect(m).not.toBeNull()
    const anyMatcher = gate.compileMatcher({ name: 'any', words: [banned, keeper] })
    const bundle = { matchers: [m], any: anyMatcher?.res ?? [] }
    expect(gate.scanText(`${banned} and ${keeper}\n`, bundle))
      .toEqual([{ line: 1, word: keeper, list: 'fx' }])
  })
})

describe('DEPTH — the engine genuinely holds the merged universe', () => {
  it("leo's list() answers with leo AND naughty-words entries after the merge", () => {
    const universe = gate.engineUniverse().map((w) => w.toLowerCase())
    expect(universe).toContain(EN.toLowerCase()) // leo:en native
    expect(universe).toContain(ES.toLowerCase()) // merged in via add()
    expect(universe).not.toContain('assess') // sanity: not a list word
  })
})

describe('WIRING — the gate fires at push AND at publish (toggle-out reds)', () => {
  it('lefthook pre-push carries the two-phase profanity job', () => {
    const hook = readFileSync(join(ROOT, 'lefthook.yml'), 'utf8')
    const job = hook.split('- name: profanity')[1] ?? ''
    expect(job, 'the pre-push profanity job exists').not.toBe('')
    expect(job).toContain('node tools/profanity-gate.mjs')
    // PHASE 1: the authored faces WHOLESALE (superset of the push set)
    expect(job).toContain('packages scripts tools tests lefthook.yml')
    // PHASE 2: the push range, resolved against @{push}
    expect(job).toContain("--history '@{push}..HEAD'")
  })

  it('the hook run-line faces EQUAL the gate DEFAULT_FACES (parsed, not substring — the 2026-11-15 tests/ widening)', () => {
    // A substring probe passes while the run line drifts (a face
    // added to one side only). Parse the actual argv out of the
    // lefthook run line and judge it against the gate's own export:
    // the hook judges exactly the faces the gate declares, both ways.
    const hook = readFileSync(join(ROOT, 'lefthook.yml'), 'utf8')
    const job = hook.split('- name: profanity')[1] ?? ''
    const run = job.split('\n').find((l) => l.trim().startsWith('run:')) ?? ''
    const argv = run.replace(/^.*node tools\/profanity-gate\.mjs /, '').trim()
    const facePart = argv.split('--history')[0].trim()
    const faces = facePart.split(/\s+/).filter(Boolean)
    expect(faces).toEqual([...gate.DEFAULT_FACES])
    // the widened face is present by name (the exposure audit's cure:
    // tests/ is authored prose and rides the live phase)
    expect(faces).toContain('tests')
  })

  it('the mint carries G10 after G9, calling the refusal over every tarball', () => {
    const rel = readFileSync(join(ROOT, 'tools', 'release-artifacts.mjs'), 'utf8')
    expect(rel).toContain("import { scanTarball } from './profanity-gate.mjs'")
    expect(rel).toContain('export function profanityRefusal')
    const g9 = rel.indexOf('G9: publint over the packed publication views')
    const g10 = rel.indexOf('G10: profanity gate over the packed tarballs')
    expect(g9).toBeGreaterThan(-1)
    expect(g10).toBeGreaterThan(g9)
    const loop = rel.slice(g10, rel.indexOf('The publish order'))
    expect(loop).toContain('profanityRefusal(tarName, f)')
    expect(loop).toContain('of innerFiles')
  })
})
