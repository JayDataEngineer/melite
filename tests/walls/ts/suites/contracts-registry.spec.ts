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
})
