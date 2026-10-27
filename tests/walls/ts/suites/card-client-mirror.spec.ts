// card-client-mirror.spec.ts — THE MIRROR ROUTE-CLAIM EDGE (audit
// 015 C1: the mirror resolves lane coordinates with address '' while
// the door claims routes).
//
// The split: the estate door (estate-queue cardsVariant.ts
// selectCardVariant) resolves the UNSTATED coordinate through the
// ADDRESS claim — `const address = familyId !== undefined && mid ===
// familyId ? "" : mid` (cardsVariant.ts:128-129), so a draft pinned
// to a variant-level lane (mid 'krea-2-raw') opens on the raw row —
// while the client mirror (card-base spec.ts offeredVariantOf,
// resolvedLaneCoordinate, composeValidate's clause — the
// resolveVariantRow calls at :1877/:1911/:2122) spells the address ''
// and falls to pool[0] (turbo). One resolver, two spellings: the
// studio offers pool[0]'s coordinate on a lane the run door would
// resolve to the claimed route.
//
// MECHANICS — both verdicts through their REAL judges over the REAL
// boot, never a re-spelling of either law:
//   door — selectCardVariant(mid, famRow, body, phase,
//     familyLanesOf(def.boarded), family): the production call
//     (cardsCompose.ts:346 verbatim — mid, family row, lanes, fam);
//   mirror — offeredVariantOf(routeSpec.variants, doc): the drill's
//     own offered face over the spec the door serves AT THE LANE
//     ADDRESS (formSpecArm(mid) — the studio fetches its spec at the
//     lane address, useFormSpec("h3-timeline") while the door judges
//     the family matrix at every mid).
// ARMS (one invariant, its firing paths):
//   LANE ROSTER + CENSUS — the judged universe is derived (every card
//     def's boarded addresses resolved to families through loadFacts'
//     owners, each expanded to the family row's full lane universe:
//     head + every variant/cell route — never a hand list): every
//     lane address resolves its DECL, its served lane spec, and the
//     door's unstated coordinate. The six live splits are pinned by
//     routing (owners), not by verdict — the arm stays green when the
//     cure lands.
//   STATED PARITY (green today) — per family×cell-carrying-variant,
//     the door and the mirror agree on the stated coordinate. The
//     stated search is one spelling on both sides (id-or-route over
//     the whole matrix); this arm guards it against the cure's blast
//     radius. The cell-less `__head` alias class is out by the
//     pool-parity precedent (a variant with no cells starves no pool —
//     and the door refuses `__head` ids the served spec still offers;
//     that alias-offer seam is its own wall, not this one).
//   ROUTE-CLAIM PARITY (the 015 C1 firing arm, cured 2026-10-27) —
//     per lane address, the door's unstated variant claim equals the
//     mirror's unstated offer. Green at family heads (both spellings
//     read pool[0] — the falsifiable control); the cure threads
//     addressClaimOf(spec) — the door's address law mirror-side,
//     card-base spec.ts — through offeredVariantOf's spec arm. The
//     toggle-out proof: drop the spec argument and the arm splits
//     red on every claimed route again.
//   SEEDING PROBE (the 015 C1b firing arm, cured 2026-10-27) — a
//     fresh drill on a claimed lane seeds the CLAIMED coordinate
//     (the claim pair in seedAxisValues, chain-checked); the door
//     stamps the same. Toggle-out: the claim-pair splice removed,
//     the seed falls to first-declared and the arm splits red.
// Run: npx vitest run --project walls tests/walls/ts/suites/card-client-mirror.spec.ts
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, it } from 'vitest'
import { getModel, loadCardDefs, registryIds, registryModel } from '@melite/comfyui-cordis'
import { loadFacts, type FactsReads, type ModelFacts } from '../../../../packages/engines/comfyui-card-kit/src/facts.ts'
import { factsPath, familyLanesOf } from '../../../../packages/harness/estate-queue/src/cardsFacts.ts'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { selectCardVariant } from '../../../../packages/harness/estate-queue/src/cardsVariant.ts'
import {
  axisGroups,
  offeredVariantOf,
  resolvedLaneCoordinate,
  seedAxisValues,
  type FormSpecDoc,
} from '../../../../packages/web/card-base/src/spec.ts'

const PHASE = 'd4-card-client-mirror'
const reads: FactsReads = { getModel, registryIds, registryModel }
const factsFile = loadFacts(factsPath(), reads)
const facts = factsFile.models
const owners = factsFile.owners

const defs = await loadCardDefs()

/** A lane address with its judging context: the boarded card (for
 *  the production lanes union), the owning family and its facts row. */
interface LaneMid {
  card: string
  mid: string
  family: string
  row: ModelFacts
  lanes: readonly string[] | undefined
}

/** THE LANE UNIVERSE, DERIVED (pool-parity's lane-arm precedent): per
 *  card def, each boarded address resolved to its owning family,
 *  expanded to the family row's full lane universe (head + every
 *  variant/cell route — the door judges the family matrix at EVERY
 *  mid, and the studio fetches its spec at the lane address).
 *  Deduplicated by mid, first card wins. */
const MIDS: LaneMid[] = []
{
  const seen = new Set<string>()
  for (const [card, def] of defs) {
    for (const address of def.boarded ?? []) {
      const family = owners[address] ?? address
      const row = facts[family]
      if (row === undefined) continue
      const lanes = familyLanesOf(def.boarded)
      const mids = new Set<string>([family])
      for (const v of row.variants ?? []) {
        if (typeof v.route === 'string' && v.route !== '') mids.add(v.route)
        for (const c of v.cells ?? []) {
          if (typeof c.route === 'string' && c.route !== '') mids.add(c.route)
        }
      }
      for (const mid of mids) {
        if (seen.has(mid)) continue
        seen.add(mid)
        MIDS.push({ card, mid, family, row, lanes })
      }
    }
  }
}

/** The DOOR's verdict, production-shaped (cardsCompose.ts:346): the
 *  mid, the family row, the lanes union, the family id. */
function doorUnstated(r: LaneMid): { variantId: string; quant: string } {
  const sel = selectCardVariant(r.mid, r.row as never, {}, PHASE, r.lanes, r.family)
  return { variantId: sel.variantId, quant: sel.quant }
}

// THE HIDE-LAW CARVE-OUT (named, never silent): a lane the DECL hides
// (hide_from_dropdown — the all-hidden qwen-img-edit-2511 family, the
// hidden seedvr2-ema-vae-fp16 cell route) is unresolvable BY
// DECLARATION — the door's early hidden refusal is the law's own
// voice, and the hide seats (the door's suites, the served
// projection) own it. This wall judges the route CLAIM on offered
// lanes; a hidden lane skips every arm below on exactly this voice
// (any OTHER refusal is a finding, never a skip).
const HIDDEN_VOICE = /hidden from the dropdown|no offered variants/

function hiddenSkip(e: unknown): boolean {
  return HIDDEN_VOICE.test((e as Error).message)
}

describe('THE MIRROR ROUTE-CLAIM EDGE — the client offers what the door would not resolve', () => {
  it('lane roster + census: every lane address resolves its DECL, its served lane spec, and the door\u2019s unstated coordinate', async () => {
    expect(MIDS.length, 'the lane universe collapsed — no card boards an address, the wall went vacuous').toBeGreaterThan(0)
    // THE SIX LIVE SPLITS, PINNED BY ROUTING (owners — verdict-free,
    // so the arm survives the cure)
    for (const [mid, family] of [
      ['z-image-base', 'z-image'],
      ['krea-2-raw', 'krea-2'],
      ['qwen-img-21-turbo', 'qwen-img-21'],
      ['kroma', 'krea-2'],
      ['kroma-base', 'krea-2'],
      ['flux-klein-base', 'flux-klein'],
    ] as const) {
      expect(owners[mid], `the routing still boards ${mid} on ${family}`).toBe(family)
      expect(MIDS.some((r) => r.mid === mid), `the derived universe carries ${mid}`).toBe(true)
    }
    const dead: string[] = []
    for (const r of MIDS) {
      try {
        getModel(r.family)
      } catch (e) {
        dead.push(`${r.mid}: the registry resolves no DECL for owning family ${r.family} (${(e as Error).message.split('\n')[0]})`)
        continue
      }
      const spec = await formSpecArm(r.mid)
      if (spec === null) {
        dead.push(`${r.mid}: the serve answers no spec at the lane address (the studio fetches here — a dead lane)`)
        continue
      }
      try {
        doorUnstated(r)
      } catch (e) {
        if (hiddenSkip(e)) continue
        dead.push(`${r.mid}: the door refuses the unstated coordinate (${(e as Error).message.slice(0, 120)})`)
      }
    }
    expect(dead, `the derived universe carries ${MIDS.length} lane addresses; the dead ones are named`).toEqual([])
  })

  it('stated parity: per family\u00d7cell-carrying-variant the door and the mirror agree on the stated coordinate', async () => {
    const failures: string[] = []
    let probed = 0
    for (const [family, row] of Object.entries(facts)) {
      if ((row.family ?? family) !== family) continue
      const spec = await formSpecArm(family)
      if (spec === null) continue
      const lanes = MIDS.find((r) => r.family === family)?.lanes
      // THE CELL-CARRYING PRECEDENT (quant-pool-parity's variant-seat
      // census): a variant with no cells starves no pool — the
      // cell-less `__head` alias rows (served for display, refused by
      // the door as stated coordinates) are the alias-offer seam's
      // own wall, not this one.
      for (const v of row.variants ?? []) {
        if ((v.cells ?? []).length === 0) continue
        const mirror = offeredVariantOf((spec.variants ?? []) as never, { variant: v.id } as never)?.id ?? '<mirror-miss>'
        let door: string
        try {
          door = selectCardVariant(family, row as never, { variant: v.id }, PHASE, lanes, family).variantId
        } catch (e) {
          if (hiddenSkip(e)) continue
          failures.push(`${family}/${v.id}: the door refuses a cell-carrying variant the served spec offers (${(e as Error).message.slice(0, 120)})`)
          continue
        }
        probed += 1
        if (door !== mirror) {
          failures.push(`${family}/${v.id}: the stated seat is split — the door claims "${door}", the mirror offers "${mirror}"`)
        }
      }
    }
    expect(probed, 'no family\u00d7variant pair probed — the arm went vacuous').toBeGreaterThan(0)
    expect(failures, `the stated search split across ${probed} probed pairs`).toEqual([])
  })

  it('route-claim parity: on an UNSTATED doc the mirror offers the door\u2019s claimed route — never pool[0]', async () => {
    const splits: string[] = []
    let probed = 0
    for (const r of MIDS) {
      const spec = (await formSpecArm(r.mid)) as FormSpecDoc | null
      if (spec === null) continue
      let door: { variantId: string; quant: string }
      try {
        door = doorUnstated(r)
      } catch (e) {
        if (hiddenSkip(e)) continue
        throw e
      }
      const mirror = offeredVariantOf((spec.variants ?? []) as never, {} as never, spec)?.id ?? '<mirror-miss>'
      probed += 1
      if (door.variantId !== mirror) {
        splits.push(
          `${r.mid} (card ${r.card} \u00d7 ${r.family}): the door claims "${door.variantId}/${door.quant}" but the mirror offers "${mirror}" (pool[0] — the address claim never rode)`,
        )
      }
    }
    expect(probed, 'no lane address probed — the arm went vacuous').toBeGreaterThan(0)
    expect(splits, `the mirror splits the door\u2019s route claim across ${probed} lane addresses (audit 015 C1 — the address claim rides addressClaimOf(spec) at card-base spec.ts)`).toEqual([])
  })

  it('seeding probe: a fresh drill on a claimed lane seeds the door\u2019s coordinate (C1b)', async () => {
    const splits: string[] = []
    let probed = 0
    for (const r of MIDS) {
      const spec = (await formSpecArm(r.mid)) as FormSpecDoc | null
      if (spec === null) continue
      // THE AXIS-LESS CARVE-OUT (named, never silent): a spec with
      // no axis groups (anny — one variant row, group "", no cells)
      // has NO coordinate to seed; the claim composes through the
      // model arm (the door resolves the same single row), and the
      // arm above judges that plane. Skipping is the honest probe.
      if (axisGroups(spec).length === 0) continue
      let door: { variantId: string; quant: string }
      try {
        door = doorUnstated(r)
      } catch (e) {
        if (hiddenSkip(e)) continue
        throw e
      }
      const seeded = seedAxisValues(spec, {})
      probed += 1
      const seedVariant = typeof seeded['variant'] === 'string' ? (seeded['variant'] as string) : '<unseeded>'
      const seedQuant = typeof seeded['quant'] === 'string' ? (seeded['quant'] as string) : '<unseeded>'
      if (seedVariant !== door.variantId || seedQuant !== door.quant) {
        splits.push(
          `${r.mid}: a fresh drill seeds "${seedVariant}/${seedQuant}" but the door stamps "${door.variantId}/${door.quant}" (pool[0] seed under a claimed route)`,
        )
      }
    }
    expect(probed, 'no lane address probed — the arm went vacuous').toBeGreaterThan(0)
    expect(splits, `the fresh-drill seed splits the door\u2019s stamp across ${probed} lane addresses (audit 015 C1b — the claim pair in seedAxisValues rides addressClaimOf(spec))`).toEqual([])
  })

  it('coordinate parity: the form\u2019s resolved lane coordinate equals the door\u2019s unstated stamp (C1c)', async () => {
    const splits: string[] = []
    let probed = 0
    for (const r of MIDS) {
      const spec = (await formSpecArm(r.mid)) as FormSpecDoc | null
      if (spec === null) continue
      // THE AXIS-LESS CARVE-OUT (the seeding arm's precedent): a
      // variant-less spec has no coordinate the form resolves — the
      // door's single row IS the compose, nothing to split.
      if (axisGroups(spec).length === 0) continue
      let door: { variantId: string; quant: string }
      try {
        door = doorUnstated(r)
      } catch (e) {
        if (hiddenSkip(e)) continue
        throw e
      }
      const coordinate = resolvedLaneCoordinate(spec, {})
      probed += 1
      // the honest empty normalizes on both spellings: a cell-less
      // variant's ''/null — every other coordinate must match
      const formVariant = coordinate?.variantId ?? '<unresolved>'
      const formQuant = coordinate == null || coordinate.quantId === null ? '<unresolved>' : coordinate.quantId
      const doorQuant = door.quant === '' ? '<unresolved>' : door.quant
      if (formVariant !== door.variantId || formQuant !== doorQuant) {
        splits.push(
          `${r.mid}: the form resolves "${formVariant}/${formQuant}" but the door stamps "${door.variantId}/${door.quant}" (the lane coordinate split — the form judges the wrong lane surface)`,
        )
      }
    }
    expect(probed, 'no lane address probed — the arm went vacuous').toBeGreaterThan(0)
    expect(splits, `the form\u2019s resolved coordinate splits the door\u2019s stamp across ${probed} lane addresses (audit 015 C1c — the raw-mid cell claim in resolvedLaneCoordinate)`).toEqual([])
  })
})
