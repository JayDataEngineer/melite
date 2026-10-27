// models-quant-axis-cells.spec.ts — THE QUANT-AXIS CELLS WALL,
// ESTATE-WIDE (audit 018 C1, re-homed by C3 onto row
// MODELS-QUANT-AXIS-CELLS): the 7B dead-door class can never land
// again. The 2026-11-12 burn: seedvr2-ema's "7B" row was OFFERED with
// `cells: []` and no provision anywhere — any quant under it refused
// "declares no cells for this variant — DECL/projection sync break"
// at the operator's run press, and UNSTATED it would have fallen to
// the family lane_inputs and silently run the 3B file. Every prior
// wall certified a copy (parities of projections); the DECL's own
// servability — every offered coordinate resolves to a servable
// cell/route/weights — had NO judge. THIS is that judge, derived
// over EVERY booted family (zero literals): a row whose wall is one
// package's spec is a bypass for the other 31 families.
//
// ARMS (one invariant, four firing paths):
//   SERVABILITY — every offered Variant row carries ≥1 offered cell,
//     and every offered (variant × quant) coordinate resolves through
//     the three REAL judges (the door's selectCardVariant off the
//     facts row, the mirror's composeValidate over the SERVED spec,
//     the artifact resolver's rows) with no cell-less voice. The
//     pool-parity wall SKIPS the cell-less shape (`cells.length===0`
//     continue) — this arm judges exactly the skipped shape.
//   REVERSE PHANTOM — every served Quant row names a DECL cell (the
//     declaration plane, never the facts projection).
//   BURN RECEIPT — seedvr2-ema pinned by name: the Quant axis, the
//     3B pair, all offered rows cellular. Toggle, TWO levels (probed
//     2026-10-27): replants of the 7b row (`git show
//     6aef24295:packages/models/seedvr2-ema/src/index.ts` lines
//     69-76) never reach this suite — the C2 registration gate
//     (validateDecl's servability law, 998dc25ed) refuses the boot
//     with the dead-door voice, which IS the stronger receipt. This
//     suite's OWN firing proof is the phantom-weights toggle (3b
//     fp8's unet → phantom_7b_toggle.safetensors): the SERVABILITY
//     arm reds naming the phantom file; restore → green.
//   ROUTING CENSUS — the judged roster IS the boot: every catalog
//     family resolves its DECL and its facts row; coordinates run
//     where a served spec resolves, unboarded families are counted
//     by name (boarding is family-coverage's jurisdiction).
// NAMED CARVE-OUTS (derived classes, counted, never silent):
//   the native fold (pool-parity's own law): "native" probes measure
//     the door's legacy fold, never the cell pool — the mirror arm
//     skips quant === 'native', the door arm keeps it.
//   the engine-default plane: a cell naming no *.safetensors file
//     inherits the variant/family weights plane (single-native
//     utility families) — the artifact arm counts those coordinates
//     instead of judging them; the positive downloadability join is
//     catalog-provisions-join's law.
// Run: npx vitest run --project walls tests/walls/ts/suites/models-quant-axis-cells.spec.ts
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, it } from 'vitest'
import { getModel, loadCardDefs, registryIds, registryModel } from '@melite/comfyui-cordis'
import { loadFacts, type FactsReads, type ModelFacts } from '../../../../packages/engines/comfyui-card-kit/src/facts.ts'
import { factsPath } from '../../../../packages/harness/estate-queue/src/cardsFacts.ts'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { selectCardVariant } from '../../../../packages/harness/estate-queue/src/cardsVariant.ts'
import { composeValidate, type FormSpecDoc } from '../../../../packages/web/card-base/src/spec.ts'
import { modelsService, type ModelsService } from '../../../../packages/engines/comfyui-cordis/src/models/service.ts'

const reads: FactsReads = { getModel, registryIds, registryModel }
const factsFile = loadFacts(factsPath(), reads)
const facts = factsFile.models

// THE BOARDING (loadCardDefs — the composition root's own serve):
// a facts-less family BOARDED on a card is a dead door at the facts
// seam (pool-parity would red it too); a facts-less UNBOARDED family
// is the facts-derivation seat — family-coverage's jurisdiction,
// counted by name here, never silently shrunk.
const defs = await loadCardDefs()
const BOARDED = new Set<string>()
for (const def of defs.values()) {
  for (const address of def.boarded ?? []) BOARDED.add(factsFile.owners[address] ?? address)
}

// THE CELL-LESS VOICE (cards-variant.spec.ts:112-133 pins it as the
// door's honest refusal): any coordinate answering in this voice is
// the burn's shape — refused at press instead of impossible at boot.
const CELL_LESS = /declares no cells for this variant/
const NATIVE_FOLD = 'native'
const FILE_VALUE = /\.safetensors$/i

interface OfferedCell { quant: string; route?: string; laneInputs: Record<string, unknown> }
interface OfferedVariant { id: string; label: string; cells: OfferedCell[] }

function offeredVariants(decl: { variants: unknown[] }): OfferedVariant[] {
  const out: OfferedVariant[] = []
  for (const v of decl.variants as Array<Record<string, unknown>>) {
    if (v['group'] !== 'Variant' || v['hide_from_dropdown'] === true) continue
    const cells: OfferedCell[] = []
    for (const c of (v['cells'] as Array<Record<string, unknown>> | undefined) ?? []) {
      if (c['hide_from_dropdown'] === true) continue
      cells.push({
        quant: String(c['quant'] ?? ''),
        route: typeof c['route'] === 'string' ? c['route'] : undefined,
        laneInputs: (c['lane_inputs'] as Record<string, unknown> | undefined) ?? {},
      })
    }
    out.push({ id: String(v['id']), label: String(v['label'] ?? ''), cells })
  }
  return out
}

function namedFiles(laneInputs: Record<string, unknown>): string[] {
  return Object.values(laneInputs).filter((x): x is string => typeof x === 'string' && FILE_VALUE.test(x))
}

describe('THE QUANT-AXIS CELLS WALL — every offered coordinate serves (audit 018 C1, row MODELS-QUANT-AXIS-CELLS)', () => {
  it('SERVABILITY — every offered Variant row carries an offered cell, and every offered (variant x quant) resolves through door + mirror + artifacts', async () => {
    const svc: ModelsService = modelsService()
    const rows = svc.catalogModels()
    expect(rows.length, 'the real boot serves the family table (a silent empty catalog would make the wall vacuous)').toBeGreaterThanOrEqual(32)
    const failures: string[] = []
    let families = 0
    let variants = 0
    let coordinates = 0
    let engineDefault = 0
    let nativeFold = 0
    const factsLess: string[] = []
    for (const row of rows) {
      const decl = svc.getModel(row.id)
      families += 1
      const frow: ModelFacts | undefined = (facts as Record<string, ModelFacts>)[decl.id]
      if (frow === undefined) {
        if (BOARDED.has(decl.id)) {
          failures.push(`${decl.id}: BOARDED with no facts row — the door serves a family it cannot judge (a dead door at the facts seam)`)
        } else {
          factsLess.push(decl.id)
        }
        continue
      }
      const offered = offeredVariants(decl)
      for (const v of offered) {
        variants += 1
        if (v.cells.length === 0) {
          // THE 7B SHAPE — the burn's exact silhouette, named aloud.
          failures.push(`${decl.id}/${v.id}: OFFERED with zero offered cells — a dead door (the 7B class, 2026-11-12): land its provision + cell or hide the row`)
          continue
        }
        for (const c of v.cells) {
          coordinates += 1
          // THE DOOR (selectCardVariant off the facts row — the run's
          // own judge): a declared coordinate resolves, never in the
          // cell-less voice.
          try {
            selectCardVariant(decl.id, frow as never, { variant: v.id, quant: c.quant }, 'd4-quant-axis-cells')
          } catch (e) {
            failures.push(`${decl.id}/${v.id} x ${c.quant}: the door refuses a DECLARED coordinate: ${(e as Error).message.split('\n')[0]}`)
          }
          // THE ARTIFACTS (the real resolver's rows): a named weights
          // file must ride the resolved rows — no phantom weights.
          const named = namedFiles(c.laneInputs)
          if (named.length === 0) {
            engineDefault += 1
          } else {
            let resolved: string[] = []
            try {
              resolved = svc.resolveCatalogArtifact(decl.id, v.id, c.quant).map((r: { name: string }) => r.name)
            } catch (e) {
              failures.push(`${decl.id}/${v.id} x ${c.quant}: the artifact resolver throws on a file-naming coordinate (${(e as Error).message.split('\n')[0]}) — the cell names weights nothing serves`)
            }
            for (const f of named) {
              if (!resolved.includes(f)) {
                failures.push(`${decl.id}/${v.id} x ${c.quant}: phantom weights — ${f} is named by the cell but rides no resolved artifact row`)
              }
            }
          }
        }
      }
      // THE MIRROR (composeValidate over the SERVED spec — the
      // form-seat judge): every declared coordinate the door admits,
      // the mirror accepts. Needs the served doc, so it runs where a
      // served spec resolves; unboarded families are the census's
      // count, never this arm's silence.
      const spec: FormSpecDoc | null = await formSpecArm(decl.id)
      if (spec === null) continue
      const model = typeof spec.model === 'string' ? spec.model : ''
      expect(model.length, `the served spec for ${decl.id} carries no model key — the mirror could not judge it (every probe would be vacuous)`).toBeGreaterThan(0)
      for (const v of offered) {
        for (const c of v.cells) {
          if (c.quant === NATIVE_FOLD) {
            nativeFold += 1
            continue
          }
          const doc: Record<string, unknown> = { model, variant: v.id, quant: c.quant }
          const violations = composeValidate(spec, doc as never)
          for (const violation of violations) {
            failures.push(`${decl.id}/${v.id} x ${c.quant}: STARVE — the mirror refuses a DECLARED coordinate through the served spec: ${violation.message}`)
          }
        }
      }
    }
    expect(families, 'the roster collapsed to zero families — the wall went vacuous').toBeGreaterThan(0)
    expect(variants, 'no offered Variant row anywhere — the wall went vacuous').toBeGreaterThan(0)
    expect(coordinates, 'no offered coordinate anywhere — the wall went vacuous').toBeGreaterThan(0)
    expect(failures, `servability broke on ${coordinates} offered coordinates across ${variants} offered variants / ${families} families (${engineDefault} engine-default, ${nativeFold} native-fold, facts-less unboarded: ${factsLess.join(', ') || 'none'})`).toEqual([])
  })

  it('REVERSE PHANTOM — every served Quant row names a DECL cell (the declaration plane, never the projection)', async () => {
    const svc: ModelsService = modelsService()
    const failures: string[] = []
    let servedRows = 0
    for (const row of svc.catalogModels()) {
      const decl = svc.getModel(row.id)
      const spec: FormSpecDoc | null = await formSpecArm(decl.id)
      if (spec === null) continue
      const byVariant = new Map(offeredVariants(decl).map((v) => [v.id, new Set(v.cells.map((c) => c.quant))]))
      for (const r of spec.variants ?? []) {
        if ((r as { group?: string }).group !== 'Quant') continue
        servedRows += 1
        const owner = (r as { owner?: string }).owner
        const quant = (r as { quant?: string }).quant
        if (owner === undefined || !(byVariant.get(owner)?.has(quant))) {
          failures.push(`${decl.id}: the served spec carries a Quant row (owner ${String(owner)}, quant ${String(quant)}) no DECL cell declares — the projection invented a cell`)
        }
      }
    }
    expect(servedRows, 'no served Quant row anywhere — the reverse arm went vacuous').toBeGreaterThan(0)
    expect(failures, 'the served plane invents Quant rows the DECLs never declared').toEqual([])
  })

  it('BURN RECEIPT — seedvr2-ema still seats the law that burned it (the 7B row, 2026-11-12)', () => {
    const svc: ModelsService = modelsService()
    const decl = svc.getModel('seedvr2-ema')
    expect((decl.variant_groups ?? []).some((g: { id: string }) => g.id === 'Quant'), 'seedvr2-ema declares the Quant axis group — the law\'s seat').toBe(true)
    const offered = offeredVariants(decl)
    expect(offered.length, 'seedvr2-ema offers no Variant row — the receipt went vacuous').toBeGreaterThan(0)
    for (const v of offered) {
      expect(v.cells.length, `seedvr2-ema/${v.id} is offered with zero offered cells — THE 7B SHAPE, replanted`).toBeGreaterThan(0)
    }
    const three = offered.find((v) => v.id === '3b')
    expect(three, 'the 3B row seats the receipt').toBeTruthy()
    expect(three!.cells.map((c) => c.quant), '3B serves BOTH real provisioned bodies').toEqual(['fp16', 'fp8'])
  })

  it('ROUTING CENSUS — the judged roster IS the boot: every catalog family resolves its DECL and its facts row', async () => {
    const svc: ModelsService = modelsService()
    const rows = svc.catalogModels()
    const dead: string[] = []
    let specced = 0
    const unboarded: string[] = []
    const factsLess: string[] = []
    for (const row of rows) {
      try {
        svc.getModel(row.id)
      } catch (e) {
        dead.push(`${row.id}: the registry resolves no DECL (${(e as Error).message.split('\n')[0]})`)
        continue
      }
      if ((facts as Record<string, ModelFacts>)[row.id] === undefined) {
        if (BOARDED.has(row.id)) dead.push(`${row.id}: BOARDED with no facts row — a dead door at the facts seam`)
        else factsLess.push(row.id)
        continue
      }
      const spec = await formSpecArm(row.id)
      if (spec === null) unboarded.push(row.id)
      else specced += 1
    }
    expect(dead, 'boarded-but-unresolvable families — dead doors').toEqual([])
    expect(specced, 'no family resolved a served spec — every coordinate arm went vacuous').toBeGreaterThan(0)
    // Unboarded families are family-coverage's jurisdiction — counted
    // by NAME here so the census never silently shrinks. Facts-less
    // unboarded families are the facts-derivation seat, same counting.
    expect(unboarded.length, `unboarded families (family-coverage's seat, counted): ${unboarded.join(', ')}; facts-less unboarded (facts-derivation seat, counted): ${factsLess.join(', ') || 'none'}`).toBeLessThanOrEqual(3)
  })
})

