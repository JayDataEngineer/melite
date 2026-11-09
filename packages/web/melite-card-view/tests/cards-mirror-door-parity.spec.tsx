// cards-mirror-door-parity.spec.tsx — THE TWO-DOOR PARITY LAW (the
// @contract cards-mirror-door-parity
// 2026-11-09 timeline audit, client-mirror §4): the estate write
// door's first disjunct is the card's WHOLE schema carrier
// (cardAdmits → decl.schemaNames, cardsFacts.ts), while the compose
// mirror judges the doc's RESOLVED lane surface plus its own
// sanctions. Nothing judged their agreement: at HEAD `last_frame`
// was schema-admitted (the FL2VA end-anchor wiring slot rides the
// carrier dict) and off the served lane base — the door admitted a
// doc the mirror banners, and the banner's own message claimed 'the
// estate admission gate refuses the same key field-named at the
// write door', a sentence that was FALSE for exactly that key.
//
// THE WALL derives both truths from the real boot (no hand-lists):
// every card, every schema knob, the real served spec, the real
// verdict. A knob the door admits must never banner at the mirror —
// with ONE honest carve: a VARIANT-SCOPED knob (served by some
// resolved lane — tts's design_prompt belongs to the voicedesign
// lane) banners OFF its variant BY LANE LAW, and that banner is the
// lane's own truth, not drift. The wall judges the LANE-DEAD set:
// knobs NO resolution of the card ever serves — those banner on
// EVERY doc while the door admits every one of them, the exact
// two-truths drift §4 named, and the sweep REDS BY NAME on the first.
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, test } from 'vitest'
import { composeValidate, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import { deriveDecls } from '../../../../packages/harness/estate-queue/src/cardsFacts.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'

/** Every variant id the spec serves (the resolutions a doc can take). */
function variantIds(spec: FormSpecDoc): string[] {
  const ids: string[] = []
  for (const v of spec.variants ?? []) {
    if (typeof v.id === 'string' && v.id !== '' && !ids.includes(v.id)) ids.push(v.id)
  }
  return ids
}

/** Whether ANY resolution of the spec serves the key — base, every
 *  variant id, AND every boarded model's lane (music's `mode` is the
 *  seated lesson: a card boards two families and the second family's
 *  action serves the knob the first never mentions; a probe pinned to
 *  spec.model would call that lane-scoped knob LANE-DEAD and demand a
 *  cure for a door that already agrees), through the mirror's own
 *  verdict — the probe doc rides each resolution in turn. */
function anyLaneServes(spec: FormSpecDoc, key: string, boarded: readonly string[]): boolean {
  const models = [spec.model, ...boarded].filter((m): m is string => typeof m === 'string' && m !== '')
  const probes: SpecValues[] = []
  for (const model of models) {
    probes.push({ model, [key]: 'x' })
    for (const id of variantIds(spec)) probes.push({ model, variant: id, [key]: 'x' } as SpecValues)
  }
  return probes.some((doc) => {
    const v = composeValidate(spec, doc)
    return !v.some((x) => x.field === key && x.message.includes('fires nothing on this lane'))
  })
}

describe('THE TWO-DOOR PARITY LAW (door-admitted ⊆ mirror-sanctioned, the lane-dead set)', () => {
  test('ARM 1 — THE SWEEP: a schema knob NO lane ever serves must never banner (the door admits it on every doc)', async () => {
    const decls = deriveDecls(await loadCardDefs(), {})
    const offenders: string[] = []
    const defs = await loadCardDefs()
    for (const [id, decl] of Object.entries(decls)) {
      // the knob surface this card's DOOR admits (cardAdmits' first
      // disjunct — the whole schema carrier)
      const knobs: readonly string[] = decl.schemaNames
      if (knobs.length === 0) continue
      // the card's served spec — a card with no served mirror has no
      // parity to judge (the door is the only judge)
      let spec: FormSpecDoc | null
      try {
        spec = (await formSpecArm(id)) as FormSpecDoc | null
      } catch {
        continue
      }
      if (spec === null || spec.model === undefined || spec.model === '') continue
      // the card's boarded families — every lane a doc can resolve to
      const boarded: readonly string[] = defs.get(id)?.boarded ?? []
      for (const k of knobs) {
        // the carve: a knob SOME resolution serves is lane-scoped —
        // its off-lane banner is the lane's own truth
        if (anyLaneServes(spec, k, boarded)) continue
        const doc: SpecValues = { model: spec.model, [k]: 'x' }
        const v = composeValidate(spec, doc)
        const refused = v.some((x) => x.field === k && x.message.includes('fires nothing on this lane'))
        if (refused) offenders.push(`${id}: ${k}`)
      }
    }
    expect(offenders,
      'schema knobs the DOOR admits on every doc but NO lane of the card ever serves and the MIRROR banners — the two doors disagree by name (admit the knob on the card row or strip it from the carrier; then this wall keeps them agreed)').toEqual([])
  })

  test('ARM 2 — THE CONTROL: a key in NEITHER surface still refuses field-named (parity never unseats the mirror\'s teeth)', async () => {
    const spec = (await formSpecArm('h3-timeline')) as FormSpecDoc
    const doc: SpecValues = { model: 'h3-timeline', steps: 6, nonsense_key: 1 }
    const v = composeValidate(spec, doc)
    expect(v.length, 'the unknown key still refuses').toBe(1)
    expect(v[0]!.field).toBe('nonsense_key')
    expect(v[0]!.message).toMatch(/fires nothing on this lane/)
  })

  test('ARM 3 — THE CARVE\'S OWN TRUTH: a variant-scoped knob banners off its variant and passes on it (the lane law stays the lane law)', async () => {
    const spec = (await formSpecArm('tts')) as FormSpecDoc
    const off = composeValidate(spec, { model: spec.model, design_prompt: 'warm' })
    expect(off.some((x) => x.field === 'design_prompt' && x.message.includes('fires nothing on this lane')),
      'design_prompt off the voicedesign lane banners (the lane\'s own truth)').toBe(true)
    const on = composeValidate(spec, { model: spec.model, variant: 'voicedesign', design_prompt: 'warm' })
    expect(on.filter((x) => x.field === 'design_prompt'),
      'design_prompt on the voicedesign lane passes clean (variant-scoped, not drift)').toEqual([])
  })

  test('ARM 4 — THE ADMITS UNION: every key the write door unions in (def.admits ∪ boarded studio.writes) is sanctioned at the mirror (client-mirror §6.1)', async () => {
    // The door's cardAdmits (cardsFacts.ts) unions the card's
    // declared admits row with EVERY boarded family's
    // facts.studio.writes; the mirror's discovery serves the card's
    // own rows (admits verbatim + the card's studio.writes). The
    // two spellings are not one list — their agreement is judged,
    // never assumed (the audit's finding: the comment claimed an
    // identity the code does not carry). Today no boarded family
    // writes beyond the card row (17 cards, union == row); the day
    // one does, this sweep reds by name until the mirror serves it.
    const decls = deriveDecls(await loadCardDefs(), {})
    const offenders: string[] = []
    for (const [id, decl] of Object.entries(decls)) {
      const union: readonly string[] = decl.admits
      if (union.length === 0) continue
      let spec: FormSpecDoc | null
      try {
        spec = (await formSpecArm(id)) as FormSpecDoc | null
      } catch {
        continue
      }
      if (spec === null || spec.model === undefined || spec.model === '') continue
      for (const k of union) {
        const v = composeValidate(spec, { model: spec.model, [k]: 'x' } as SpecValues)
        if (v.some((x) => x.field === k && x.message.includes('fires nothing on this lane'))) {
          offenders.push(`${id}: ${k}`)
        }
      }
    }
    expect(offenders,
      'keys the write door admits through its union (a boarded family\'s studio.writes the card\'s own admits row never declared) that the compose mirror banners — serve the union at discovery or declare the key on the card row; then this wall keeps them agreed (client-mirror §6.1)').toEqual([])
  })
})
