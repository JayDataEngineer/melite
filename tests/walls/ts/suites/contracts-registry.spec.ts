/**
 * contracts-registry — THE REGISTRY WALL (AGENTS.md LAW 4, the
 * two-tier contract tracking, operator 2026-10-16): a gate that
 * refuses an unaccounted law.
 *
 * Arm 1 — INTEGRITY: every registry row's wall spec file exists.
 *   A registry row with no wall is a lie.
 * Arm 2 — RECEIPTS: every non-null receipt_ref resolves to a file.
 *   A contract claiming proof with no receipt is a lie.
 * Arm 3 — THE UNACCOUNTED-LAW INVENTORY: every suite under
 *   tests/walls/ts/suites/ appears in some row's wall spec or in
 *   registry/UNREGISTERED.yaml (the visible debt list, growing
 *   toward zero). A wall outside the registry is a law nobody
 *   tracks; the allowlist makes the gap a NAMED debt, never a
 *   silent one.
 * Arm 4 — THE PACKAGE HEADER MAP (journey audit A5, 2026-11-07):
 *   every `// @contract <id>` header in a package suite names a
 *   registry row id. The enforcement seat for the package-suite
 *   convention — the header cannot name a law nobody tracks.
 * Arm 5 — THE YAML LINT (recent-commits sweep F3, 2026-10-26): every
 *   tier yaml parses WITH NAMED diagnostics, and every prose field
 *   (invariant / wall.arms / depth) parses to a STRING. The burn:
 *   a ": " inside an unquoted multi-line scalar ("LAW (x): text")
 *   parsed the row into a nested mapping — and the crash inside
 *   rows() masked all five arms' own voices. dev_docs is untracked
 *   and invisible to every push-set job, so THIS wall is the class's
 *   only pre-landing judge.
 * Arm 6 — INVARIANTS DRIFT (recent-commits sweep F2, 2026-10-26):
 *   every ACTIVE row id appears in dev_docs/contracts/INVARIANTS.md.
 *   The burn: a hand-edit to a tier yaml bypassed the CLI, INVARIANTS
 *   regenerated 14 minutes earlier, and the cheat sheet went stale
 *   with the registry carrying the law. The cure seats the drift as
 *   a red naming the missing ids.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import YAML from 'yaml'

const ROOT = join(import.meta.dirname, '../../../..')
const REGISTRY = join(ROOT, 'dev_docs/contracts/registry')
const TIERS = ['models', 'cards', 'gates', 'flows', 'infra']

function rows(): Array<Record<string, unknown> & { tier?: string }> {
  const out: Array<Record<string, unknown> & { tier?: string }> = []
  for (const tier of TIERS) {
    const file = join(REGISTRY, `${tier}-tier.yaml`)
    if (!existsSync(file)) continue
    const doc = YAML.parse(readFileSync(file, 'utf8')) as unknown
    const list = Array.isArray(doc) ? doc : (doc as { rows?: unknown })?.rows
    if (!Array.isArray(list)) throw new Error(`${tier}-tier.yaml: no rows`)
    for (const r of list as Array<Record<string, unknown>>) out.push({ ...r, tier })
  }
  return out
}

// a row's wall.spec may name several files (a YAML list or the
// comma-separated spelling)
function specsOf(r: Record<string, unknown>): string[] {
  const spec = (r.wall as { spec?: string | string[] } | undefined)?.spec
  if (spec === undefined) return []
  if (Array.isArray(spec)) return spec.map((s) => s.trim()).filter(Boolean)
  return String(spec).split(',').map((s) => s.trim()).filter(Boolean)
}

const base = (p: string) => p.slice(p.lastIndexOf('/') + 1)

describe('THE REGISTRY WALL (every law accounted, every account true)', () => {
  it('every registry row names a wall spec that exists — a row with no wall is a lie', () => {
    const all = rows()
    expect(all.length, 'the registry is migrated (§3 ledger retired 2026-10-16)').toBeGreaterThan(0)
    for (const r of all) {
      const specs = specsOf(r)
      expect(specs.length, `row ${String(r.id)}: no wall spec`).toBeGreaterThan(0)
      for (const spec of specs) {
        expect(existsSync(join(ROOT, spec)), `row ${String(r.id)}: wall spec ${spec} does not exist`).toBe(true)
      }
    }
  })

  it('every wall spec is a single clean path — the folded-scalar comma class reds NAMED (lint arm, dead-code audit D4, 2026-10-24)', () => {
    // THE CLASS (two live corruptions, infra-tier.yaml:50/:659): a
    // multi-line YAML `spec:` scalar FOLDS to one space-joined
    // string — "a.spec.ts b.spec.ts" — which the existence arm
    // above refuses only with a confusing "does not exist" voice.
    // This arm names the disease: an entry carrying an embedded
    // space is the comma/fold class (or a hand-typo'd path), and
    // the cure is a YAML LIST row, never a scalar join. Walls live
    // in many lawful homes (tests/walls, tests/e2e, package tests
    // and e2e dirs, snapshots/, scripts/ census burners) — the
    // ROOT is not this arm's law; single-path cleanliness is.
    for (const r of rows()) {
      for (const spec of specsOf(r)) {
        expect(spec, `row ${String(r.id)}: wall spec "${spec}" carries an embedded space — the folded-scalar class; write wall.spec as a YAML LIST of single paths`).not.toMatch(/\s/)
        expect(spec.startsWith('/'), `row ${String(r.id)}: wall spec "${spec}" must be repo-rooted, never absolute`).toBe(false)
        expect(spec, `row ${String(r.id)}: wall spec "${spec}" must be repo-rooted, never ./`).not.toMatch(/^\.\//)
      }
    }
  })

  it('every receipt_ref resolves — a contract claiming proof with no receipt is a lie', () => {
    for (const r of rows()) {
      const ref = r.receipt_ref as string | null | undefined
      if (ref === null || ref === undefined) continue
      // refs may be repo-rooted or contracts-rooted
      const rooted = ref.startsWith('dev_docs/') ? join(ROOT, ref) : join(ROOT, 'dev_docs/contracts', ref)
      expect(
        existsSync(rooted),
        `row ${String(r.id)}: receipt_ref ${ref} does not resolve`,
      ).toBe(true)
    }
  })

  it('every walls-tier suite is registered or a NAMED unregistered debt — never silently outside the law', () => {
    const dir = join(ROOT, 'tests/walls/ts/suites')
    const suites = readdirSync(dir).filter((f) => f.endsWith('.spec.ts')).sort()
    expect(suites.length, 'the walls tier carries suites to account for').toBeGreaterThan(0)
    const registered = new Set(rows().flatMap((r) => specsOf(r).map(base)))
    const allowFile = join(REGISTRY, 'UNREGISTERED.yaml')
    const allow: string[] = existsSync(allowFile)
      ? (YAML.parse(readFileSync(allowFile, 'utf8')) as { unregistered?: string[] })?.unregistered ?? []
      : []
    const allowSet = new Set(allow)
    const unaccounted = suites.filter((s) => !registered.has(s) && !allowSet.has(s))
    expect(unaccounted, `suites no registry row carries and UNREGISTERED.yaml does not name: ${unaccounted.join(', ')}`).toEqual([])
    // every allowlist entry must be a real suite — the debt list
    // cannot name ghosts
    for (const name of allow) {
      expect(existsSync(join(dir, name)), `UNREGISTERED.yaml names ${name}: no such suite`).toBe(true)
    }
  })

  it('every @contract header in a package suite maps to a registry row — a declared law with no row is a lie (arm 4, journey audit A5 2026-11-07)', () => {
    // THE HEADER SPELLING: a line `// @contract <id>` (the id is the
    // registry row's id, any tier). Package suites declare it the day
    // they carry a law worth tracking; this arm fires the moment one
    // names an id the registry does not carry. Today zero headers
    // exist — the arm is the enforcement SEAT for the convention,
    // landing before the first header, not after the first drift.
    // The accounting debt itself (the package-local suites that name
    // no row at all — the seat-rowing wave) is ROADMAP-owed.
    const ids = new Set(rows().map((r) => String(r.id)))
    expect(ids.size, 'the registry carries rows to map to').toBeGreaterThan(0)
    const declared: Array<{ file: string; id: string }> = []
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
          walk(p)
        } else if (/\.spec\.(ts|tsx)$/.test(e.name)) {
          const text = readFileSync(p, 'utf8')
          for (const m of text.matchAll(/\/\/\s*@contract\s+([a-z0-9-]+)/g)) {
            declared.push({ file: p.slice(ROOT.length + 1), id: m[1]! })
          }
        }
      }
    }
    walk(join(ROOT, 'packages'))
    for (const d of declared) {
      expect(ids.has(d.id), `@contract ${d.id} in ${d.file}: no registry row carries that id`).toBe(true)
    }
  })

  it('every tier yaml parses with named diagnostics, and prose fields parse to strings — a nested mapping is the colon class, red NAMED (arm 5, sweep F3)', () => {
    // THE BURN (models-tier.yaml, 2026-10-26): "LAW (x): text" inside
    // an unquoted multi-line scalar — YAML read it as a nested
    // mapping, YAMLParseError "Nested mappings in compact mappings"
    // crashed inside rows(), and every arm above died with the parse
    // error instead of its own voice. This arm parses each tier FILE
    // on its own line so the failure names the file + the parser's
    // position, then walks the parsed rows asserting the prose fields
    // stayed STRINGS — the exact shape the colon class corrupts.
    for (const tier of TIERS) {
      const file = join(REGISTRY, `${tier}-tier.yaml`)
      let doc: unknown
      try {
        doc = YAML.parse(readFileSync(file, 'utf8'))
      } catch (e) {
        // the parser's own message carries line/col — surface it whole
        expect.fail(`${tier}-tier.yaml does not parse: ${String((e as Error).message).split('\n')[0]} — the colon-in-unquoted-scalar class writes prose mappings; quote the scalar or drop the ": "`)
      }
      const list = Array.isArray(doc) ? doc : (doc as { rows?: unknown })?.rows
      expect(Array.isArray(list), `${tier}-tier.yaml: no rows list`).toBe(true)
      for (const r of (list as Array<Record<string, unknown>>)) {
        const id = String(r.id)
        expect(typeof r.invariant, `${tier} row ${id}: invariant parsed to ${typeof r.invariant}, not a string — a ": " inside the unquoted scalar made it a mapping`).toBe('string')
        const arms = (r.wall as { arms?: unknown } | undefined)?.arms
        if (arms !== undefined) {
          expect(typeof arms, `${tier} row ${id}: wall.arms parsed to ${typeof arms}, not a string — the colon class`).toBe('string')
        }
        expect(typeof r.depth, `${tier} row ${id}: depth parsed to ${typeof r.depth}, not a string — the colon class`).toBe('string')
      }
    }
  })

  it('every ACTIVE row id appears in INVARIANTS.md — a hand-edited yaml that skipped regenerate reds NAMED (arm 6, sweep F2)', () => {
    // THE BURN (2026-10-26): the ANCHOR-AT-THE-DOOR law was hand-added
    // to models-tier.yaml at 21:26; INVARIANTS.md last regenerated
    // 21:12 — the cheat sheet went stale (zero ANCHOR hits) and no
    // verb noticed, because regenerate() only rides the CLI verbs and
    // hand edits skip them. This arm is the drift's judge: the
    // registry is the truth, the cheat sheet must carry every ACTIVE
    // id, and the cure for a red here is `pnpm contract regenerate`.
    const sheet = readFileSync(join(ROOT, 'dev_docs/contracts/INVARIANTS.md'), 'utf8')
    const missing = rows()
      .filter((r) => r.status === undefined || r.status === 'active')
      .map((r) => String(r.id))
      .filter((id) => !sheet.includes(`**${id}**`))
    expect(missing, `INVARIANTS.md is stale — these ACTIVE ids are absent (run: pnpm contract regenerate): ${missing.join(', ')}`).toEqual([])
  })
})
