// THE SPEC-FACTS SYNC WALL (the axis-unification cure, 2026-11-06 —
// the audit's "missing wall": discoverySerialization(family).variants ≡
// factsRow(family).variants over the real boot).
//
// The lesion it exists to kill: the operator's live Anima burn —
// image-gen boards krea-2 FIRST, so the served form-spec's primary
// flag was false for anima and the cell-emission filter dropped EVERY
// anima cell: the served spec carried ZERO Quant rows while the DECL
// declares two (turbo: int8_convrot + bf16) and the door's facts row
// carried both. The mirror (card-base composeValidate) judged the
// starved pool and refused with the FALSE voice "the variant declares
// no cells" — a DECL fact the caller's matrix could not see. Every
// wall that swore the matrix was green fed BOTH of its sides from the
// SAME mirror; the seam between the two emit seats (door facts vs
// served spec) had no judge at all. THIS wall is that judge.
//
// Both sides derive from the real boot, each through its own seat:
//   P1 — the door-facts projection: loadFacts → deriveRow, the exact
//        assembly the estate's cardsRegistry.modelFacts() serves
//        (factsPath + FactsReads over the booted registry).
//   P2 — the discovery-served spec: formSpecArm, the exact body
//        /v1/form-spec?model=<family> serves (resolveSpecKey →
//        specBody over theService).
// Three arms, each with its own firing path (canon: one invariant,
// one arm):
//   DECL ARM   — the DECL (getModel) ≡ P1: the walk loses nothing
//                (a dropped cell reds HERE and in the sweep's
//                completeness arm; P1≡P2 stays green by design — the
//                seats agree, the walk is the liar).
//   SERVE ARM  — P1 ≡ P2 per family: the served spec's variant/quant
//                rows equal the door-facts projection of the same DECL
//                over cells, quants, routes, envelopes,
//                resolver_defaults (the burn's divergence class — this
//                arm fired on today's bytes: anima served zero Quant
//                rows against the facts row's two).
//   VOICE ARM  — the honest-voice cure: a served matrix stripped of a
//                variant's Quant rows must refuse a stated quant with
//                the SYNC-BREAK voice, never the DECL lie ("the
//                variant declares no cells") — the mirror seat the
//                burn's refusal fired through.
// Run: vitest run --project node tests/walls/ts/suites/spec-facts-sync.spec.ts
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, it } from 'vitest'
import { getModel, registryIds, registryModel } from '@melite/comfyui-cordis'
import { loadFacts, type FactsReads, type ModelFacts } from '../../../../packages/engines/comfyui-card-kit/src/facts.ts'
import { factsPath } from '../../../../packages/harness/estate-queue/src/cardsFacts.ts'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { composeValidate, type FormSpecDoc, type FormVariantRow } from '../../../../packages/web/card-base/src/spec.ts'

/** A DECL variant row as the registry serves it to the walk (the
 *  walked slice — the sync law's tuple: cells, quants, routes,
 *  envelopes, resolver_defaults, wire_defaults). */
interface DeclVariantSlice {
  id: string
  label: string
  group: string
  hide_from_dropdown?: boolean
  route?: string
  resolver_defaults?: Record<string, unknown>
  wire_defaults?: Record<string, unknown> | null
  sampler_envelope?: Record<string, unknown> | null
  cells?: DeclCellSlice[]
}
interface DeclCellSlice {
  quant: string
  label?: string
  route?: string
  hide_from_dropdown?: boolean
  vram_peak_gb?: number
  resolver_defaults?: Record<string, unknown>
}
interface DeclSlice {
  id: string
  variants?: DeclVariantSlice[]
}

const reads: FactsReads = { getModel, registryIds, registryModel }
const facts: Record<string, ModelFacts> = loadFacts(factsPath(), reads).models
/** The FAMILY rows only (id === family owner): route-address rows
 *  re-point their routes (the exporter rule) and ride their own serve
 *  law — this wall pins the family seam the burn crossed. */
const families = Object.entries(facts)
  .filter(([id, row]) => row.family === id)
  .map(([id, row]) => ({ id, row }))

/** One compared P2 row: the sync tuple projected off the wire row. */
interface SyncRow {
  id: string
  group: string
  owner: string
  quant: string | null
  route: string
  label: string
  vram: number | null
  envelope: unknown
  defaults: Record<string, unknown>
}

function projectServed(r: FormVariantRow): SyncRow {
  return {
    id: r.id,
    group: r.group,
    owner: r.owner ?? '',
    quant: r.quant ?? null,
    route: r.route,
    label: r.label,
    vram: r.vram_peak_gb ?? null,
    envelope: r.sampler_envelope ?? null,
    defaults: r.defaults,
  }
}

/** THE SPELLLED PROJECTION: P1 (the door-facts row) → the flat served
 *  shape, the law the serializer must satisfy — non-hidden variants
 *  serve whole; their non-hidden cells serve as Quant rows owned by the
 *  variant (a family's own cells ALWAYS serve — the boarded[0] gate may
 *  scope only foreign lanes, the burn's cure); a ROUTELESS cell serves
 *  its own family row — the variant row IS its lane (the D4 pool-parity
 *  cure, 2026-10-17; this wall walks family-keyed rows only, so the
 *  route lane's shape never applies here); composite ids only on
 *  collision (the seen set); the head-claim alias serves when no row
 *  routes the family id (the resolving rule: first variant with cells,
 *  else the first row). */
function expectedServedRows(fam: string, row: ModelFacts): SyncRow[] {
  const rows: SyncRow[] = []
  const seen = new Set<string>()
  for (const v of row.variants) {
    if (v.hide_from_dropdown === true) continue
    rows.push({
      id: v.id,
      group: v.group,
      owner: '',
      quant: null,
      route: v.route,
      label: v.label,
      vram: null,
      envelope: v.sampler_envelope ?? null,
      defaults: { ...v.resolver_defaults, ...v.defaults },
    })
    seen.add(v.id)
    for (const c of v.cells) {
      if (c.hide_from_dropdown === true) continue
      if (!c.quant) continue
      const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant
      seen.add(id)
      rows.push({
        id,
        group: 'Quant',
        owner: v.id,
        quant: c.quant,
        route: c.route,
        label: c.label,
        vram: c.vram_peak_gb ?? null,
        envelope: null,
        defaults: c.resolver_defaults ?? {},
      })
    }
  }
  const routed = new Set<string>()
  for (const v of row.variants) {
    if (v.route) routed.add(v.route)
    for (const c of v.cells) if (c.route) routed.add(c.route)
  }
  if (!routed.has(fam)) {
    const resolving = row.variants.find((v) => v.cells.length > 0) ?? row.variants[0]
    if (resolving !== undefined && resolving.hide_from_dropdown !== true) {
      rows.push({
        id: seen.has(resolving.id) ? `${resolving.id}__head` : resolving.id,
        group: 'Variant',
        owner: '',
        quant: null,
        route: fam,
        label: resolving.label,
        vram: null,
        envelope: resolving.sampler_envelope ?? null,
        defaults: {},
      })
    }
  }
  return rows
}

describe('THE SPEC-FACTS SYNC WALL (the served spec ≡ the door facts, every family, the real boot)', () => {
  it('THE DECL ARM: the walk loses nothing — every DECL variant and cell lands in the facts row verbatim', () => {
    const failures: string[] = []
    let judged = 0
    for (const { id, row } of families) {
      let decl: DeclSlice
      try {
        decl = getModel(id) as unknown as DeclSlice
      } catch {
        continue // an unbootable id cannot serve or compose — nothing to sync
      }
      judged += 1
      const declVariants = decl.variants ?? []
      if ((row.variants ?? []).length !== declVariants.length) {
        failures.push(`${id}: facts row carries ${row.variants?.length ?? 0} variants, the DECL declares ${declVariants.length}`)
        continue
      }
      for (const [vi, dv] of declVariants.entries()) {
        const fv = (row.variants ?? [])[vi]
        if (fv === undefined) break
        const factsCell = (k: string): string =>
          `${id}/${dv.id}: facts ${k} vs DECL ${k}`
        if (fv.id !== dv.id) failures.push(factsCell('variant id') + ` = ${fv.id}/${dv.id}`)
        if (fv.group !== dv.group) failures.push(factsCell('group') + ` = ${fv.group}/${dv.group}`)
        if ((fv.hide_from_dropdown === true) !== (dv.hide_from_dropdown === true)) failures.push(factsCell('hide_from_dropdown'))
        if (fv.route !== (dv.route ?? '')) failures.push(factsCell('route') + ` = ${fv.route}/${dv.route ?? ''}`)
        expect(fv.resolver_defaults, `${id}/${dv.id} resolver_defaults`).toEqual(dv.resolver_defaults ?? {})
        expect(fv.defaults, `${id}/${dv.id} wire_defaults`).toEqual(dv.wire_defaults ?? {})
        expect(fv.sampler_envelope ?? null, `${id}/${dv.id} sampler_envelope`).toEqual(dv.sampler_envelope ?? null)
        const fCells = fv.cells ?? []
        const dCells = dv.cells ?? []
        if (fCells.length !== dCells.length) {
          failures.push(`${id}/${dv.id}: facts row carries ${fCells.length} cells, the DECL declares ${dCells.length} — THE WALK DROPPED A CELL (the burn's divergence class, door side)`)
          continue
        }
        for (const [ci, dc] of dCells.entries()) {
          const fc = fCells[ci]
          if (fc === undefined) break
          if (fc.quant !== dc.quant) failures.push(`${id}/${dv.id} cell ${ci}: quant ${String(fc.quant)}/${dc.quant}`)
          if (fc.route !== (dc.route ?? '')) failures.push(`${id}/${dv.id} cell ${dc.quant}: route ${fc.route}/${dc.route ?? ''}`)
          if ((fc.hide_from_dropdown === true) !== (dc.hide_from_dropdown === true)) failures.push(`${id}/${dv.id} cell ${dc.quant}: hide_from_dropdown`)
          expect(fc.resolver_defaults ?? {}, `${id}/${dv.id}/${dc.quant} cell resolver_defaults`).toEqual(dc.resolver_defaults ?? {})
        }
      }
    }
    expect(judged, 'no family judged — the wall went vacuous').toBeGreaterThan(0)
    expect(failures, 'the facts walk diverged from the DECL').toEqual([])
  })

  it('THE SERVE ARM: the served spec ≡ the door-facts projection, every served family', async () => {
    const failures: string[] = []
    let served = 0
    let quantRows = 0
    for (const { id, row } of families) {
      const spec = await formSpecArm(id)
      if (spec === null) continue // no card boards this family — no served spec, no seam
      served += 1
      const actual = (spec.variants ?? []).map(projectServed)
      const expected = expectedServedRows(id, row)
      quantRows += actual.filter((r) => r.group === 'Quant').length
      const verdict = (() => {
        for (const e of expected) {
          const a = actual.find((r) => r.id === e.id && r.group === e.group && r.owner === e.owner)
          if (a === undefined) return `the served spec is MISSING the ${e.group} row '${e.id}'${e.owner ? ` (owner ${e.owner})` : ''}`
          for (const k of ['quant', 'route', 'label', 'vram', 'envelope', 'defaults'] as const) {
            // An undeclared label is the served face's own display
            // default (the capitalized quant id) — a display face,
            // never a sync fact; only a DECLARED label is judged.
            if (k === 'label' && e.label === '') continue
            if (JSON.stringify(a[k]) !== JSON.stringify(e[k])) {
              return `the served ${e.group} row '${e.id}'${e.owner ? ` (owner ${e.owner})` : ''} drifted on ${k}: served ${JSON.stringify(a[k])} vs facts ${JSON.stringify(e[k])}`
            }
          }
        }
        for (const a of actual) {
          const e = expected.find((r) => r.id === a.id && r.group === a.group && r.owner === a.owner)
          if (e === undefined) return `the served spec carries a PHANTOM ${a.group} row '${a.id}'${a.owner ? ` (owner ${a.owner})` : ''} the facts row never projected`
        }
        return null
      })()
      if (verdict !== null) failures.push(`${id}: ${verdict}`)
    }
    expect(served, 'no served family judged — the wall went vacuous').toBeGreaterThan(0)
    expect(quantRows, 'no Quant row served anywhere — the matrix starved wholesale').toBeGreaterThan(0)
    expect(failures, 'the served spec diverged from the door facts').toEqual([])
  })

  it('THE BURN RECEIPT: the served anima spec carries turbo\'s Quant rows ≡ the DECL\'s turbo cells (image-gen boards krea-2 first)', async () => {
    const spec = await formSpecArm('anima')
    expect(spec, 'formSpecArm(anima) resolves (image-gen boards anima)').not.toBeNull()
    const servedQuants = (spec!.variants ?? []).filter((r) => r.group === 'Quant' && r.owner === 'turbo')
    const declTurbo = (getModel('anima') as unknown as DeclSlice).variants?.find((v) => v.id === 'turbo')
    expect(declTurbo, 'the DECL declares turbo').toBeDefined()
    const declCells = declTurbo!.cells ?? []
    expect(servedQuants.map((r) => [r.quant, r.route])).toEqual(declCells.map((c) => [c.quant, c.route]))
    // and the facts row agrees — all three copies of the matrix, one truth
    const factsTurbo = facts['anima']!.variants.find((v) => v.id === 'turbo')
    expect((factsTurbo?.cells ?? []).map((c) => [c.quant, c.route])).toEqual(declCells.map((c) => [c.quant, c.route]))
  })

  it('THE VOICE ARM: a starved matrix refuses with the SYNC-BREAK voice, never the DECL lie', async () => {
    // The mirror seat the burn's refusal fired through: the served
    // anima spec with its Quant rows stripped IS today's pre-cure
    // bytes — a stated foreign quant must voice the projection break
    // (the caller's matrix genuinely has no cells), never assert the
    // DECL's absence (turbo declares two).
    const spec = await formSpecArm('anima')
    expect(spec).not.toBeNull()
    const starved: FormSpecDoc = {
      ...spec!,
      variants: (spec!.variants ?? []).filter((r) => r.group !== 'Quant'),
    }
    const violations = composeValidate(starved, { model: 'anima', variant: 'turbo', quant: 'int8' })
    expect(violations.length, 'the starved pool refuses the stated quant').toBeGreaterThan(0)
    for (const v of violations) {
      expect(v.message).toContain('DECL/projection sync break')
      expect(v.message).not.toContain('the variant declares no cells')
    }
    // and the CURED spec refuses the same foreign quant with the DOOR's
    // own voice — the known cells named (the facts row's truth)
    const cured = composeValidate(spec!, { model: 'anima', variant: 'turbo', quant: 'int8' })
    expect(cured.length, 'the cured spec still refuses the foreign quant').toBeGreaterThan(0)
    expect(cured[0]!.message).toContain('known: int8_convrot, bf16')
  })
})
