// quant-pool-parity.spec.ts — THE POOL-PARITY EDGE (the anima
// turbo-quant-burn audit's §CURES-OWED 5, the COVERAGE cure, row 51).
//
// FOR EVERY family×card: the client mirror's Quant pool equals the
// facts row's cells — the served projection cannot starve silently
// again. The burn lived 21 days exactly HERE, on the [2]↔[3] hop
// between the walls: the DECL was healthy, the facts row was healthy,
// and discovery's primary filter starved the SERVED spec's Quant rows
// (55ef13c14's deleted `if (c.route !== key && c.route !== service &&
// !primary) continue`) — so the mirror (card-base spec.ts composeValidate
// clause 2, the pool it reads off the SERVED rows) judged an empty pool
// and refused with a voice that blamed the DECL, while the door's own
// judge (estate-queue cardsVariant selectCardVariant, reading the FACTS
// row) would have admitted the cell. Every wall certified a copy; the
// edge between the served spec and the facts row had no judge. THIS is
// that judge.
//
// MECHANICS — no copy of either projection is reimplemented; both
// pools are measured through their REAL judges over the REAL boot:
//   mirror pool(variant) — the quants composeValidate accepts for that
//     variant, probing the form-spec body /v1/form-spec actually
//     serves (discovery formSpecArm — the door's own body);
//   facts pool(variant) — the quants selectCardVariant admits for that
//     variant, reading the loadFacts→deriveRow projection the estate's
//     cardsRegistry serves. The door's own visibility law (its
//     hide_from_dropdown filter) rides inside its judge — the wall
//     never re-speaks it.
//   probe universe — every cell quant any facts row declares anywhere
//     in the registry, plus the served spec's own Quant spellings, plus
//     one plainly-bogus spelling. Set equality is asserted BOTH
//     directions through the probes: a cell the run admits and the
//     mirror refuses is a STARVE (the burn's verdict class); a quant
//     the mirror accepts and the run refuses is an INVENTION. The bogus
//     and foreign spellings make every accept-probe falsifiable.
// ARMS (one invariant, its three firing paths):
//   POOL PARITY — per family×card, both directions above, plus the
//     variant-seat census that guards the probes (a variant one judge
//     resolves and the other cannot is the same starvation one seat up)
//     and the structural phantom check (a served Quant row must name a
//     facts cell). A mismatch on the real tree is a FINDING: the arm
//     fires naming the family, the variant, the quant and the mirror's
//     own voice — the integrator decides the cure.
//   ROUTING CENSUS — the judged roster is derived from the cards' live
//     boarding (loadCardDefs, never a hand list) and every pair must be
//     LIVE: the family's DECL, facts row and served spec all resolve.
//     A boarded-but-unservable pair is the family-coverage dead door.
//   BURN RECEIPT — the historical seat pinned by name: image-gen boards
//     anima (boarded after krea-2 — the boarding order that seated the
//     burn), turbo's mirror pool is its declared pair {int8_convrot,
//     bf16}, and krea-2's persisted "int8" still refuses with the
//     door's voice naming the declared cells. Red-proof: re-plant the
//     55ef13c14 primary filter in discovery.ts specVariants/specBody →
//     the parity arm reds naming anima (boarded[1+] starved, boarded[0]
//     green — the historical signature); remove → the anima findings
//     vanish.
// Run: npx vitest run --project node tests/walls/ts/suites/quant-pool-parity.spec.ts
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, it } from 'vitest'
import { getModel, loadCardDefs, registryIds, registryModel } from '@melite/comfyui-cordis'
import { loadFacts, type FactsReads, type ModelFacts } from '../../../../packages/engines/comfyui-card-kit/src/facts.ts'
import { factsPath } from '../../../../packages/harness/estate-queue/src/cardsFacts.ts'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { selectCardVariant } from '../../../../packages/harness/estate-queue/src/cardsVariant.ts'
import { composeValidate, type FormSpecDoc } from '../../../../packages/web/card-base/src/spec.ts'

const reads: FactsReads = { getModel, registryIds, registryModel }
const factsFile = loadFacts(factsPath(), reads)
const facts = factsFile.models
// THE ROUTING RESOLUTION: a card's board may name a route ADDRESS (the
// tts ladder boards qwen3-tts-voicedesign-base); the door's facts row
// for the address is a route row — the burn's seam is the FAMILY row
// (the sync wall's own scoping), so the roster resolves each boarded
// address to its owner through loadFacts' owners map and judges the
// family seam once per card.
const owners = factsFile.owners

// THE SERVED DOC'S GATE KEY: composeValidate skips its clauses unless
// the held model names the spec's own model — every probe passes the
// served doc's own key, and this guard refuses to probe a doc that
// cannot be judged (a null model would make every accept vacuous).
const heldKey = (spec: FormSpecDoc, family: string): string => {
  const key = typeof spec.model === 'string' ? spec.model : ''
  expect(key.length, `the served spec for ${family} carries no model key — the mirror could not judge it (every probe would be vacuous)`).toBeGreaterThan(0)
  return key
}

/** The MIRROR's verdict: does composeValidate accept this doc? The
 *  first violation's voice rides out — the findings quote it. */
function mirrorVerdict(spec: FormSpecDoc, model: string, variant: string, quant?: string): { ok: boolean; voice: string } {
  const doc: Record<string, unknown> = { model, variant }
  if (quant !== undefined) doc['quant'] = quant
  const violations = composeValidate(spec, doc as never)
  return { ok: violations.length === 0, voice: violations[0]?.message ?? '' }
}

/** The DOOR's verdict: does selectCardVariant resolve this body off
 *  the facts row? Its refusals carry the facts row's truth. */
function doorResolves(row: ModelFacts, family: string, body: Record<string, unknown>): boolean {
  try {
    selectCardVariant(family, row as never, body, 'd4-pool-parity')
    return true
  } catch {
    return false
  }
}

// THE ROSTER, DERIVED (never a hand list): every card def the
// composition root serves × every family it boards, addresses resolved
// to their owner families, deduped in served order.
const defs = await loadCardDefs()
const ROSTER: Array<{ card: string; family: string }> = []
for (const [card, def] of defs) {
  for (const address of def.boarded ?? []) {
    const family = owners[address] ?? address
    if (!ROSTER.some((p) => p.card === card && p.family === family)) ROSTER.push({ card, family })
  }
}

// THE PROBE UNIVERSE: every cell quant any facts row declares, plus
// the served specs' own Quant spellings (a phantom served cell must be
// probed to be caught), plus one plainly-bogus spelling.
// THE NATIVE CARVE-OUT (named, not silent): the door's legacy fold
// (cardsVariant.ts, operator 2026-10-26) resolves the spelling
// "native" as UNSTATED on EVERY variant — "the only size this family
// ships, which the address already says". A "native" probe therefore
// measures the fold, never the cell pool: the door admits it where no
// cell exists and the mirror refuses it where the fold's own contract
// says the address means it. The fold's parity is the fold's law (and
// the sync wall's row-level serve arm owns any served↔facts drift for
// "native"-spelled cells); this wall judges the declared-cell pool.
const NATIVE_FOLD = 'native'
const GLOBAL_QUANTS = new Set<string>()
for (const row of Object.values(facts)) {
  for (const v of row.variants ?? []) {
    for (const c of v.cells ?? []) {
      if (typeof c.quant === 'string' && c.quant !== '' && c.quant !== NATIVE_FOLD) GLOBAL_QUANTS.add(c.quant)
    }
  }
}

describe('THE POOL-PARITY EDGE — the mirror cell pool equals the facts row cells, every family×card', () => {
  it('pool parity: per family×card the mirror accepts exactly the cells the run admits — starvation and invention both red, the real judges, the real served spec', async () => {
    const failures: string[] = []
    let probedPairs = 0
    let totalProbes = 0
    for (const { card, family } of ROSTER) {
      const spec = await formSpecArm(family)
      if (spec === null) {
        failures.push(`${card}×${family}: boarded but the served form-spec does not resolve — a dead door (the family-coverage class)`)
        continue
      }
      const row = facts[family]
      if (row === undefined) {
        failures.push(`${card}×${family}: boarded but the door's facts row does not derive — the mirror has a spec with no facts twin`)
        continue
      }
      const model = heldKey(spec, family)
      // THE VARIANT-SEAT CENSUS (the probes' guard): for every variant
      // carrying cells, the two judges must agree the variant exists —
      // a variant the door resolves and the mirror refuses starves its
      // whole cell pool one seat up; the reverse invents one.
      for (const v of row.variants ?? []) {
        const cells = v.cells ?? []
        if (cells.length === 0) continue
        const door = doorResolves(row, family, { variant: v.id })
        const mirror = mirrorVerdict(spec, model, v.id).ok
        if (door !== mirror) {
          failures.push(`${card}×${family}/${v.id}: the variant seat is split — the door ${door ? 'resolves' : 'refuses'} it, the mirror ${mirror ? 'offers' : 'refuses'} it, and ${cells.length} cell(s) ride the seat`)
          continue
        }
        if (!door) continue
        // THE CELL PROBES, both directions over the full universe.
        const universe = new Set(GLOBAL_QUANTS)
        for (const r of spec.variants ?? []) {
          if (r.group === 'Quant' && typeof r.quant === 'string' && r.quant !== NATIVE_FOLD) universe.add(r.quant)
        }
        universe.add('d4-no-such-quant')
        probedPairs += 1
        for (const q of universe) {
          totalProbes += 1
          const d = doorResolves(row, family, { variant: v.id, quant: q })
          const m = mirrorVerdict(spec, model, v.id, q)
          if (d && !m.ok) {
            failures.push(`${card}×${family}/${v.id}: STARVE — the run admits quant "${q}" but the mirror refuses it through the served spec: ${m.voice}`)
          }
          if (!d && m.ok) {
            failures.push(`${card}×${family}/${v.id}: INVENTION — the mirror accepts quant "${q}" through the served spec but the run refuses it: the pool offered a cell the facts row never declared`)
          }
        }
      }
      // THE STRUCTURAL PHANTOM CHECK: a served Quant row must name a
      // variant of the facts row and one of its cells — a Quant row
      // whose (owner, quant) pair the facts row never declared cannot
      // ride the probes (its variant may not be selectable) and is
      // already an invention at the row level.
      for (const r of spec.variants ?? []) {
        if (r.group !== 'Quant') continue
        const owner = (row.variants ?? []).find((v) => v.id === r.owner)
        const declared = owner?.cells?.some((c) => c.quant === r.quant) ?? false
        if (!declared) {
          failures.push(`${card}×${family}: the served spec carries a Quant row (owner ${String(r.owner)}, quant ${String(r.quant)}) the facts row never declared — the projection invented a cell`)
        }
      }
    }
    expect(ROSTER.length, `the roster collapsed to zero pairs — the wall went vacuous (derived: ${JSON.stringify(ROSTER)})`).toBeGreaterThan(0)
    expect(GLOBAL_QUANTS.size, 'the probe universe is empty — no facts row declares a cell, so every probe would be vacuous').toBeGreaterThan(0)
    expect(probedPairs, `no family×card pair probed a single cell — the wall went vacuous (${ROSTER.length} pairs walked)`).toBeGreaterThan(0)
    expect(failures, `the mirror's pool diverged from the facts rows across ${probedPairs} probed pairs / ${totalProbes} probes`).toEqual([])
  })

  it('routing census: the judged roster IS the cards\u2019 live boarding — every pair resolves its DECL, its facts row and its served spec', async () => {
    const dead: string[] = []
    for (const { card, family } of ROSTER) {
      try {
        getModel(family)
      } catch (e) {
        dead.push(`${card}×${family}: the registry resolves no DECL (${(e as Error).message.split('\n')[0]})`)
        continue
      }
      if (facts[family] === undefined) {
        dead.push(`${card}×${family}: the door's facts row does not derive`)
        continue
      }
      if ((await formSpecArm(family)) === null) {
        dead.push(`${card}×${family}: the served form-spec does not resolve — a dead door`)
      }
    }
    expect(ROSTER.length, 'the roster collapsed — nothing was judged').toBeGreaterThan(0)
    expect(dead, `the derived roster carries ${ROSTER.length} pairs; the dead ones are named`).toEqual([])
  })

  it('burn receipt: anima×image-gen turbo\u2019s mirror pool is its declared cell pair, and krea-2\u2019s persisted "int8" refuses with the door\u2019s voice', async () => {
    // THE HISTORICAL SEAT, PINNED BY NAME (param-bounds-parity's
    // "the values, not a range" precedent): the routing that seated
    // the burn, the cells the DECL declares, and both judges' verdicts
    // on the burn's exact value. The generic arm above derives
    // everything; this arm cannot quietly pass a regression that
    // empties BOTH pools symmetrically.
    const gen = defs.get('image-gen')
    assertBoarded(gen, 'image-gen')
    expect([...(gen?.boarded ?? [])]).toContain('anima')
    const row = facts['anima']
    expect(row, 'the facts row for anima derives').toBeDefined()
    const turbo = row?.variants.find((v) => v.id === 'turbo')
    expect(turbo, 'the facts row declares turbo').toBeDefined()
    expect(
      [...(turbo?.cells ?? [])].map((c) => c.quant).sort(),
      'the facts row\u2019s turbo cells are the DECL\u2019s declared pair',
    ).toEqual(['bf16', 'int8_convrot'])
    const spec = await formSpecArm('anima')
    expect(spec, 'the served anima spec resolves (image-gen boards anima)').not.toBeNull()
    const model = heldKey(spec as FormSpecDoc, 'anima')
    const servedTurbo = (spec?.variants ?? []).filter((r) => r.group === 'Quant' && r.owner === 'turbo').map((r) => r.quant).sort()
    expect(servedTurbo, 'the served spec\u2019s turbo pool carries the declared pair — the projection did not starve').toEqual(['bf16', 'int8_convrot'])
    for (const q of ['int8_convrot', 'bf16']) {
      expect(mirrorVerdict(spec as FormSpecDoc, model, 'turbo', q).ok, `the mirror accepts the declared cell "${q}" under turbo`).toBe(true)
      expect(doorResolves(row as ModelFacts, 'anima', { variant: 'turbo', quant: q }), `the door admits the declared cell "${q}" under turbo`).toBe(true)
    }
    // THE BURN VALUE: krea-2's own cell id, persisted into the
    // operator's stage doc — refused by BOTH judges, and the mirror's
    // voice must name the DECLARED cells (the door's truth), never
    // claim the variant declares none.
    const refused = mirrorVerdict(spec as FormSpecDoc, model, 'turbo', 'int8')
    expect(refused.ok, 'the mirror refuses krea-2\u2019s "int8" under anima turbo').toBe(false)
    expect(refused.voice).toContain('known: int8_convrot, bf16')
    expect(refused.voice).not.toContain('declares no cells')
    expect(doorResolves(row as ModelFacts, 'anima', { variant: 'turbo', quant: 'int8' }), 'the door refuses krea-2\u2019s "int8" off the facts row').toBe(false)
    // THE ROUTELESS RECEIPT (the D4 finding's seat, cured 2026-10-17 —
    // the integrator's ruling: the variant row IS a routeless cell's
    // lane): the served projection carries the tagger families' f32 on
    // their own variants and both judges admit it. A re-skip reds HERE
    // naming wd14 — the cure's own firing path, beside the STARVE
    // probes that catch the same regression generically.
    expect(
      [...(defs.get('tagger')?.boarded ?? [])],
      'the tagger card boards wd14 and florence2 — the finding\u2019s routing',
    ).toEqual(expect.arrayContaining(['wd14', 'florence2']))
    const wd = facts['wd14']
    expect(wd, 'the facts row for wd14 derives').toBeDefined()
    const moat = wd?.variants.find((v) => v.id === 'wd-v1-4-moat-tagger-v2')
    expect(moat?.cells.map((c) => [c.quant, c.route]), 'the facts cell is the routeless f32').toEqual([['f32', '']])
    const wdSpec = await formSpecArm('wd14')
    expect(wdSpec, 'the served wd14 spec resolves').not.toBeNull()
    const wdModel = heldKey(wdSpec as FormSpecDoc, 'wd14')
    expect(
      (wdSpec?.variants ?? []).filter((r) => r.group === 'Quant' && r.owner === 'wd-v1-4-moat-tagger-v2').map((r) => [r.quant, r.route]),
      'the served spec carries the routeless cell on its own variant — the projection did not re-starve',
    ).toEqual([['f32', '']])
    expect(mirrorVerdict(wdSpec as FormSpecDoc, wdModel, 'wd-v1-4-moat-tagger-v2', 'f32').ok, 'the mirror admits the routeless cell — the press gate no longer blocks a lawful run').toBe(true)
    expect(doorResolves(wd as ModelFacts, 'wd14', { variant: 'wd-v1-4-moat-tagger-v2', quant: 'f32' }), 'the door admits the routeless cell').toBe(true)
    const flSpec = await formSpecArm('florence2')
    expect(
      (flSpec?.variants ?? []).filter((r) => r.group === 'Quant').length,
      'florence2 serves its 14 routeless cells, one per variant',
    ).toBe(14)
  })
})

/** image-gen's def must exist for the receipt arm to pin its boarding. */
function assertBoarded(def: unknown, card: string): asserts def is { boarded: string[] } {
  expect(def, `the composition root serves the ${card} card`).toBeDefined()
}
