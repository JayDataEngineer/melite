/** THE SWITCHING SWEEP (operator 2026-11-05: "YOU PIN THAT IN
 * TESTS AS HARD AND DEEP AS IT GOES. THIS IS A CORE FEATURE OF
 * MELITE" — switching model/variant/recipe is the card's spine, and
 * the live estate red-bricked every switch while the frozen-fixture
 * suites stayed green). DEPTH is the cure this wall exists to hold:
 * NO frozen spec literal anywhere — the sweep rides EVERY real
 * family DECL through THE REAL SERIALIZER (the axis-unification
 * cure, 2026-11-06: melite-tools discovery.ts specVariants, itself a
 * projection of the one DECL walk — comfyui-card-kit facts.ts
 * deriveVariants — that the door's facts row projects too; the
 * hand-mirrored copy this file once maintained is deleted — a mirror
 * can drift while the serve drifts differently, and this wall would
 * have judged the mirror green while the burn shipped) into the REAL
 * pick verbs (axisPickPatch, modelSwitchPatch) and the REAL judge
 * (composeValidate, the door's own mirror). A family that boards
 * tomorrow rides this wall the day its DECL lands.
 *
 * The pinned invariant, one sentence: EVERY switch the UI can
 * offer — model, variant, quant cell, recipe — composes CLEAN from
 * EVERY legal holding state, including every sibling row's own
 * knobs (the original live incident: switching to turbo while
 * holding raw's steps 52/cfg 3.5). The pick RECONCILES (the clamp
 * law): a held knob outside the picked row's envelope lands ON the
 * envelope in the same write. If any arm of this wall reds, a card
 * is bricked live — that is the wall's whole voice. */
import { describe, expect, test } from 'vitest'
import { composeCandidateDoc, composeValidate, axisPickPatch, modelSwitchPatch, seedUser, reseatEnvelopeKeys,
  type FormSpecDoc, type FormVariantRow, type SpecValues } from '../src/spec.ts'
// (reseat-chrome M6, 2026-11-06) the DOOR's own relation judge, in
// the seat's own spelling (cardsRegistry.ts:1141 calls exactly
// judgeLaneRelations([relations], lift)). SCOPE: this arm judges the
// judge over the DECL's family-level words — the seat's full
// family+variant merge (laneContractOf → agreed rows) is estate-walled
// at cards-lane-law.spec.ts; the client-side point is that the words
// composeValidate never reads still refuse the seated doc.
import { judgeLaneRelations, type LaneRelations, type SamplerEnvelope } from '@melite/contracts/laneRelations'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
// THE REAL SERIALIZER (the axis-unification cure, 2026-11-06): the
// served flat-variant projection itself — the exact rows
// /v1/form-spec serves, derived from the ONE DECL walk
// (comfyui-card-kit facts.ts deriveVariants) that the door's facts
// row projects too.
import { specVariants } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { DECL as anima } from '../../../models/anima/src/index.ts'
import { DECL as anny } from '../../../models/anny/src/index.ts'
import { DECL as anycreature } from '../../../models/anycreature/src/index.ts'
import { DECL as concat } from '../../../models/concat/src/index.ts'
import { DECL as fit } from '../../../models/fit/src/index.ts'
import { DECL as florence2 } from '../../../models/florence2/src/index.ts'
import { DECL as fluxKlein } from '../../../models/flux-klein/src/index.ts'
import { DECL as gemSoma } from '../../../models/gem-soma/src/index.ts'
import { DECL as h3 } from '../../../models/h3/src/index.ts'
import { DECL as input } from '../../../models/input/src/index.ts'
import { DECL as joycaption } from '../../../models/joycaption/src/index.ts'
import { DECL as joytag } from '../../../models/joytag/src/index.ts'
import { DECL as kimodo } from '../../../models/kimodo/src/index.ts'
import { DECL as krea2 } from '../../../models/krea-2/src/index.ts'
import { DECL as mask } from '../../../models/mask/src/index.ts'
import { DECL as mossSfx } from '../../../models/moss-sfx/src/index.ts'
import { DECL as music3 } from '../../../models/music3/src/index.ts'
import { DECL as pixal3d } from '../../../models/pixal3d/src/index.ts'
import { DECL as qwenImg21 } from '../../../models/qwen-img-21/src/index.ts'
import { DECL as qwenImgEdit21 } from '../../../models/qwen-img-edit-21/src/index.ts'
import { DECL as qwenImgEdit2511 } from '../../../models/qwen-img-edit-2511/src/index.ts'
import { DECL as qwen3Tts } from '../../../models/qwen3-tts/src/index.ts'
import { DECL as seedvr2 } from '../../../models/seedvr2-ema/src/index.ts'
import { DECL as skin } from '../../../models/skin/src/index.ts'
import { DECL as somax } from '../../../models/somax/src/index.ts'
import { DECL as transferRig } from '../../../models/transfer-rig/src/index.ts'
import { DECL as trellis2 } from '../../../models/trellis2-native/src/index.ts'
import { DECL as wd14 } from '../../../models/wd14/src/index.ts'
import { DECL as yue2 } from '../../../models/yue2/src/index.ts'
import { DECL as zImage } from '../../../models/z-image/src/index.ts'

/** Every family DECL in the tree — the census law: a new family
 * package that exports DECL owes this list a row (adding a family
 * without boarding it here leaves its switching face unjudged). The
 * rows are the REAL contract type: the DECL export is ModelDecl, and
 * the serializer this wall drives is the served one — no structural
 * re-spelling of the DECL lives here anymore. */
const FAMILIES: readonly ModelDecl[] = [
  anima, anny, anycreature, concat, fit, florence2, fluxKlein, gemSoma, h3,
  input, joycaption, joytag, kimodo, krea2, mask, mossSfx, music3, pixal3d,
  qwenImg21, qwenImgEdit21, qwenImgEdit2511, qwen3Tts, seedvr2, skin, somax,
  transferRig, trellis2, wd14, yue2, zImage,
]

/** THE SERVED SPEC, FOR REAL (the axis-unification cure, 2026-11-06):
 *  discovery's specVariants driven exactly as the form-spec door
 *  drives it for a family's own face (key === service === decl.id —
 *  the family's own cells always serve). The hand-mirrored
 *  serialization this seat once maintained (variantRow + cell
 *  expansion + the head-claim row, re-spelled line by line, its own
 *  header calling the mirror "deliberate DEPTH") is DELETED: a mirror
 *  is a second serializer, and this wall judged the mirror's rows
 *  while the SERVE's rows shipped — the anima burn crossed exactly
 *  that gap. The rows judged here ARE the rows the door serves. */
function servedSpec(decl: ModelDecl): FormSpecDoc {
  return { model: decl.id, variants: specVariants(decl, decl.id, decl.id), label: null, form: decl.id }
}

/** THE ONE-WALK RECEIPT (the cure's red-proof arm): the served spec
 *  carries EVERY DECL variant and cell — the serializer projects the
 *  DECL's whole matrix, never starves a row. A cell dropped in the
 *  walk (facts.ts deriveVariants) reds HERE and in the sync wall's
 *  DECL arm: the DECL is the truth home, and nothing between it and
 *  the served spec may lose a row. */
test('THE ONE-WALK RECEIPT: the served spec carries every DECL variant and cell', () => {
  const failures: string[] = []
  for (const decl of FAMILIES) {
    const spec = servedSpec(decl)
    const servedVariantIds = new Set((spec.variants ?? []).filter((r) => r.group !== 'Quant').map((r) => r.id))
    const servedCells = (spec.variants ?? []).filter((r) => r.group === 'Quant')
    for (const v of decl.variants ?? []) {
      if (v.hide_from_dropdown === true) continue
      if (!servedVariantIds.has(v.id)) failures.push(`${decl.id}: the served spec is missing the Variant row '${v.id}'`)
      for (const c of v.cells ?? []) {
        if (c.hide_from_dropdown === true) continue
        if (!c.route) continue // routeless cells are unaddressable — never offered
        const served = servedCells.some((r) => r.owner === v.id && r.quant === c.quant)
        if (!served) failures.push(`${decl.id}/${v.id}: the served spec is missing the Quant row for cell '${c.quant}' (route ${c.route}) — A CELL WAS DROPPED BETWEEN THE DECL AND THE SERVE`)
      }
    }
  }
  expect(failures, 'the serializer dropped DECL rows').toEqual([])
})

/** The numeric knobs a row stamps (the envelope's own vocabulary —
 * steps, cfg — plus any other numeric default the row carries). */
function numericStamps(row: FormVariantRow): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(row.defaults)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

/** Validate the composed doc; on violation, name family + row +
 * the door's own voice (the failure message IS the operator's red). */
function expectClean(spec: FormSpecDoc, user: SpecValues, family: string, gesture: string): void {
  const doc = composeCandidateDoc({}, user, {})
  const violations = composeValidate(spec, doc)
  expect(violations, `${family} / ${gesture}: ${JSON.stringify(doc)} judged ${JSON.stringify(violations)}`).toEqual([])
}

/** The clamp law's own judge: after a pick, every numeric the doc
 * carries that the picked row's envelope names sits INSIDE it. */
function expectInsideEnvelope(row: FormVariantRow, user: SpecValues, family: string): void {
  const env = row.sampler_envelope
  if (env === undefined || env === null) return
  for (const [k, range] of Object.entries(env)) {
    if (!Array.isArray(range) || range.length !== 2) continue
    const v = user[k]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    expect(v, `${family} / pick ${row.id}: ${k}=${v} must sit inside the row's envelope [${range[0]}, ${range[1]}]`)
      .toBeGreaterThanOrEqual(range[0])
    expect(v, `${family} / pick ${row.id}: ${k}=${v} must sit inside the row's envelope [${range[0]}, ${range[1]}]`)
      .toBeLessThanOrEqual(range[1])
  }
}

describe('THE SWITCHING SWEEP — every real family × every switch (the core-feature wall)', () => {
  test('every model self-switch composes clean', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const patch = modelSwitchPatch(spec, decl.id)
      expectClean(spec, patch, decl.id, 'model self-switch')
    }
  })

  test('every model self-switch lands the SEEDED variant\'s own defaults over any held knobs (the override law, model face)', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      for (const sibling of variants) {
        // held = the sibling's own knobs — the departed choice's
        // numbers must NEVER survive the switch (the live break:
        // krea raw's steps 52 riding under flux's 4-step distilled)
        const held: SpecValues = { model: decl.id, variant: sibling.id, ...numericStamps(sibling) }
        const patch = modelSwitchPatch(spec, decl.id, held)
        const user: SpecValues = { ...held, ...patch }
        expectClean(spec, user, decl.id, `model self-switch from held ${sibling.id}`)
        const seeded = (spec.variants ?? []).find((r) =>
          r.id === user['variant'] && r.group === 'Variant')
        if (seeded !== undefined) expectInsideEnvelope(seeded, user, decl.id)
      }
    }
  })

  test('THE BASE-RESIDUE COMPOSABILITY WALL (2026-11-06, the model/quant/variant/recipe swap failure): every variant/quant/recipe pick over a NON-EMPTY base composes clean at the door\'s own merge', () => {
    // THE LIVE BURN: the pick patches judged the USER layer alone
    // while the run composes BASE under user — a base-held numeric
    // outside the arrival variant's envelope never clamped, and the
    // compose gate refused naming a value the studio never showed
    // ("Fix the stated value" — the value was the stage row's, not
    // stated anywhere). The cure threads pickHeld (base+user, the
    // composeCandidateDoc shape) through ModelAxes; THIS wall holds
    // the seat: for every family, the base carries a sibling
    // variant's own stamps (the previous pick's landed truth), and
    // every other variant-row pick must land the door doc CLEAN.
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      if (variants.length < 2) continue
      for (const from of variants) {
        // base = the from-row's landed pick (its stamps under its
        // axis id) — what the stage row carries after that pick
        const base: SpecValues = { variant: from.id, ...numericStamps(from) }
        for (const to of variants) {
          if (to.id === from.id) continue
          const patch = axisPickPatch(spec, to, { ...base } as SpecValues)
          // THE DOOR TRUTH: base under user, frame = the patch —
          // nulls delete, stamps land; the composed doc is what the
          // run merges
          const doc = composeCandidateDoc(base, {}, patch)
          const violations = composeValidate(spec, doc)
          expect(violations, `${decl.id} / base ${from.id} -> pick ${to.id}: ${JSON.stringify(doc)} judged ${JSON.stringify(violations)}`).toEqual([])
          // and the clamp law holds on the ARRIVAL row over the
          // door doc (base residue included)
          expectInsideEnvelope(to, doc, decl.id)
        }
      }
      // the same law for RECIPE rows over a variant-held base: a
      // recipe stamp over any variant's landed base composes clean
      const recipes = (spec.variants ?? []).filter((r) => r.group === 'Recipe')
      for (const from of variants) {
        const base: SpecValues = { variant: from.id, ...numericStamps(from) }
        for (const rec of recipes) {
          const patch = axisPickPatch(spec, rec, { ...base } as SpecValues)
          const doc = composeCandidateDoc(base, {}, patch)
          const violations = composeValidate(spec, doc)
          expect(violations, `${decl.id} / base ${from.id} + recipe ${rec.id}: ${JSON.stringify(doc)} judged ${JSON.stringify(violations)}`).toEqual([])
        }
      }
    }
  })

  test('every CROSS-FAMILY switch drops the departing vocabulary and composes clean under the NEW family\'s law', () => {
    for (const from of FAMILIES) {
      const specFrom = servedSpec(from)
      const variants = (specFrom.variants ?? []).filter((r) => r.group === 'Variant')
      const held: SpecValues = variants.length > 0
        ? { model: from.id, variant: variants[0].id, ...numericStamps(variants[0]) }
        : { model: from.id }
      for (const to of FAMILIES) {
        if (to.id === from.id) continue
        const specTo = servedSpec(to)
        const patch = modelSwitchPatch(specFrom, to.id, held)
        // the departing family's judged numerics ride as NULL writes
        // (the unset law) — the doc carries none of them. The
        // required-defaults law moved the variant stamps onto the
        // rows themselves (numericStamps lifts them into held), so
        // the sweep rides the drill's FULL chain like order d below:
        // the arrival re-key arm reseats stated numerics an
        // envelope-less departure carried (anima stamps 52/4 on its
        // own rows now), then the doc composes clean.
        const seeded = seedUser(specTo, { ...held, ...patch } as SpecValues)
        const seated = reseatEnvelopeKeys(specTo, seeded)
        const doc = composeCandidateDoc({}, seated, {})
        const violations = composeValidate(specTo, doc)
        expect(violations, `${from.id} → ${to.id}: ${JSON.stringify(doc)} judged ${JSON.stringify(violations)}`).toEqual([])
      }
    }
  })

  test('THE BURN SHAPE — krea-2\'s lora bag + int8 quant re-pointed under anima die at the laws\' seats (2026-11-06, the anima burn: dev_docs/audits/journey/anima-turbo-quant-burn-2026-11-06 cure 4)', () => {
    // THE BURN HOLDING (the operator's saved doc, hop 3): krea-2's own
    // rows PLUS its realism lora bag PLUS its int8 quant cell — the
    // exact shape the sibling cross-family arms never carried (their
    // held builds from the FROM variant's own stamps, no bag, no
    // foreign quant).
    const specFrom = servedSpec(krea2)
    const specTo = servedSpec(anima)
    const variants = (specFrom.variants ?? []).filter((r) => r.group === 'Variant')
    const turbo = variants.find((r) => r.id === 'turbo') ?? variants[0]
    const held: SpecValues = {
      model: 'krea-2', variant: (turbo ?? variants[0]).id, quant: 'int8',
      loras: [{ id: 'krea2_realism_lora' }],
      ...numericStamps(turbo ?? variants[0]),
    }
    // THE PICK LAW (the write seat): the switch's own derivation
    // clears the axes to the arrival's rows and nulls the departing
    // envelope vocabulary in the SAME frame — the foreign int8 is an
    // axis write, and axis writes die with the family
    const patch = modelSwitchPatch(specFrom, 'anima', held)
    expect(patch['variant']).toBe('')
    expect(patch['quant']).toBe('')
    const envelope = (turbo ?? variants[0]).sampler_envelope ?? {}
    for (const k of Object.keys(envelope)) {
      expect(patch[k], `${k}: the departing envelope numeric rides as a null write`).toBeNull()
    }
    const doc = composeCandidateDoc({}, { ...held, ...patch }, {})
    expect(composeValidate(specTo, doc), `${JSON.stringify(doc)}`).toEqual([])
    // THE BURNED ARRIVAL (the seed seat, the ghost drop): an already
    // re-pointed doc — a write that SKIPPED the switch law — reseeds
    // under anima: the foreign int8 names no composing row, and the
    // arrival stamps a row of ITS OWN resolved variant
    const burned: SpecValues = { ...held, model: 'anima' }
    const seeded = seedUser(specTo, burned)
    expect(seeded['quant'], 'the foreign int8 is a departed family\'s ghost — it cannot survive the seed').not.toBe('int8')
    const stampedOwnRow = (specTo.variants ?? []).some((r) =>
      r.group === 'Quant' && r.owner === (seeded['variant'] ?? '')
      && (r.id === seeded['quant'] || r.quant === seeded['quant']))
    expect(stampedOwnRow, `the seed stamps the resolved variant's own served row (got ${String(seeded['quant'])})`).toBe(true)
    // RESIDUAL CURED (D2, 2026-11-06 — this arm named the debt): the
    // ghost stamp wrote the served ROW ID; for a duplicate cell id
    // the serializer namespaces it (turbo__int8_convrot), while the
    // compose door's clause 2 judges the RAW coordinate (c.quant ===
    // rawQuant) — that stamped reopen refused at the run ('unknown
    // quant "turbo__int8_convrot"'). The stamp seats now write the
    // door's coordinate (seedAxisValues + modelSwitchPatch via
    // axisStampOf — ONE plane with the pick's 2026-09-29 vocabulary
    // law); THE GHOST-STAMP PLANE arm below fires on the finding's
    // shape (a held LATER variant whose rows are namespaced — the
    // anima arrival seed here rides the FIRST variant, whose cell
    // ids are raw, so this arm never crossed it).
    // THE BAG AT THE SEED'S MISMATCH ARM: a held bag whose model
    // still names the DEPARTED family drops at the seed (mods are
    // per model — operator 2026-10-16)
    const mismatched = seedUser(specTo, held)
    expect(mismatched['loras'], 'the krea-2 lora bag dies at the mismatch arm').toBeUndefined()
    // THE WRITE-SEAT DEBT, NAMED NOT PAPERED: the verbs' bag walk
    // reads the SCHEMA's array nodes; the served image-gen schema
    // never declares the loras bag (features.modifiers names it) and
    // this sweep's spec is schema-less by construction — so the
    // cross-family WRITE cannot null it here. The kill at the write
    // seam rides the drill's re-point verb (cards-tab-drill, THE
    // RE-POINT RESCOPE arms) and owes the estate door the same shape.
    expect(modelSwitchPatch(specFrom, 'anima', held)['loras']).toBeUndefined()
  })

  test('THE GHOST-STAMP PLANE — the ghost drop\'s re-seed stamps the DOOR\'s coordinate, never the namespaced row id (2026-11-06, D2: the BURN SHAPE arm\'s named residual, axis-unification + anima-turbo-quant-burn)', () => {
    // THE TWO PLANES, ONE RULING: the serializer namespaces a
    // duplicate cell id's FLAT ROW (`${variant}__${quant}` — the
    // form's select options must stay unique) while the compose
    // door's clause 2 judges the RAW coordinate over the facts row's
    // DECL-walk cells (cardsVariant.ts selectCardVariant:
    // `cells.find((c) => c.quant === rawQuant)` — a namespaced
    // coordinate exists nowhere in the facts row). THE STAMP WRITES
    // THE RAW COORDINATE and the door's clause stays STRICT: the raw
    // coordinate is never ambiguous at the door (the clause judges
    // the cells of the STATED variant only — the variant
    // disambiguates the duplicate), the namespace is presentation.
    // The old row-id stamp made a ghost-dropped reopen whose held
    // variant is a LATER variant refuse at the run ('unknown quant
    // "turbo__int8_convrot"'). The pick seat has spoken this
    // vocabulary since 2026-09-29 (axisStampOf — THE AXIS STAMP
    // VOCABULARY); the seed seats join the same law.
    const judged: string[] = []
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const all = spec.variants ?? []
      const namespaced = all.filter((r) =>
        r.group === 'Quant' && typeof r.quant === 'string' && r.quant !== '' && r.id !== r.quant)
      if (namespaced.length === 0) continue
      judged.push(decl.id)
      // THE GHOST: the burn's own departed value ('int8' — krea-2's
      // cell) when it names no row of THIS family, else a value
      // absent by construction — either way it names no row id and
      // no row quant of this spec, so the ghost drop's clause lets
      // nothing ride and the seed re-derives the lane.
      const ghost = all.some((r) => r.id === 'int8' || r.quant === 'int8') ? '__departed-ghost__' : 'int8'
      const order = all.filter((r) => r.group === 'Variant').map((r) => r.id)
      // one iteration per LATER variant owning a namespaced row (the
      // seed stamps the FIRST composing cell's coordinate — the
      // catalog's first-declared law — never every row)
      const owners = [...new Set(namespaced.map((r) => r.owner).filter((o): o is string => typeof o === 'string'))]
      for (const ownerId of owners) {
        const later = all.find((r) => r.group === 'Variant' && r.id === ownerId)
        if (later === undefined) continue
        expect(order.indexOf(later.id), `${decl.id}: a namespaced row's owner IS a LATER variant (the finding's shape)`)
          .toBeGreaterThan(0)
        const held: SpecValues = { model: decl.id, variant: later.id, quant: ghost, ...numericStamps(later) }
        const seeded = seedUser(spec, held)
        // THE REOPEN COMPOSES (the door's own mirror judges first —
        // its refusal voice IS the operator's red)
        const doc = composeCandidateDoc({}, seeded, {})
        expect(composeValidate(spec, doc), `${decl.id}/${later.id}: the ghost-dropped reopen composes on its re-derived lane — ${JSON.stringify(doc)}`)
          .toEqual([])
        // THE STAMP PLANE: the re-seeded quant is the RAW coordinate
        // of the variant's FIRST composing cell — never that cell's
        // namespaced served row id
        const firstCell = all.find((r) =>
          r.group === 'Quant' && r.owner === ownerId
          && typeof r.quant === 'string' && r.quant !== '')
        expect(firstCell, `${decl.id}/${later.id}: the variant composes a cell`).toBeDefined()
        if (firstCell === undefined) continue
        expect(seeded['quant'], `${decl.id}/${later.id}: the seed stamps the door's coordinate of the first composing cell (got ${String(seeded['quant'])}, cell id ${firstCell.id})`)
          .toBe(firstCell.quant)
      }
      // THE OTHER STAMP SEAT, SAME PLANE: the model switch's own
      // seeding stamps the door's vocabulary too — its quant stamp
      // must name a composing Quant row by the quant COORDINATE
      const patch = modelSwitchPatch(spec, decl.id)
      if (typeof patch['quant'] === 'string' && patch['quant'] !== '') {
        const speaks = all.some((r) =>
          r.group === 'Quant' && r.quant === patch['quant'] && r.owner === patch['variant'])
        expect(speaks, `${decl.id}: the model switch's quant stamp ${JSON.stringify(patch['quant'])} is the door's coordinate, never a namespaced row id`).toBe(true)
      }
    }
    // THE ARRIVAL CENSUS: the families the serializer namespaces
    // today — a family boarding tomorrow with a duplicate cell id
    // rides this arm the day its DECL lands (derived, never frozen).
    expect(judged, 'the ghost-stamp plane is judged on every namespaced family')
      .toEqual(expect.arrayContaining(['anima', 'flux-klein', 'krea-2', 'qwen-img-21', 'qwen-img-edit-21', 'qwen3-tts', 'z-image']))
  })

  test('every CROSS-FAMILY switch lands STATED-BY-HAND envelope-bound numerics inside the arrival lane (order d, 2026-11-06)', () => {
    // THE INCIDENT (operator, third demand): held from an envelope-LESS
    // departure (anima — no sampler_envelope) carries a stated-by-hand
    // cfg 3.5; the cross-family null set in modelSwitchPatch reads only
    // the DEPARTING spec's envelope keys, so nothing nulls, and the
    // arrival seed rode it verbatim into krea-2's turbo lane (cfg
    // [1,2]) — every door refused the card. The sibling cross-family
    // arm above was VACUOUSLY clean for this pair class (its held
    // builds from the FROM variant's own stamps — envelope-less rows
    // carry no cfg). THE CURE JUDGED: the arrival re-spec seed's
    // RE-KEY arm reseats (reseatEnvelopeKeys) — stated numerics clamp
    // into the resolved variant's envelope, the doc composes clean.
    // (reseat-chrome M5, 2026-11-06) THE DERIVED BAG: the incident
    // pair stays the named head; every OTHER key in the arrival's
    // envelope vocabulary rides too — a family boarding tomorrow with
    // a third envelope key walls the day its DECL lands, instead of
    // the frozen-literal vacuity this arm was written to kill.
    const STATED: SpecValues = { cfg: 3.5, steps: 52 }
    const vocabOf = (s: FormSpecDoc): string[] => {
      const keys = new Set<string>()
      for (const row of s.variants ?? []) {
        if (row.group !== 'Variant') continue
        for (const k of Object.keys(row.sampler_envelope ?? {})) keys.add(k)
      }
      return [...keys]
    }
    // M5's own mechanism check: the derivation reads the DECL's
    // vocabulary, never a frozen list — a synthetic third envelope
    // key (the class SamplerEnvelope grows into) derives into the bag
    // the day it boards. Today no real DECL carries one, so this is
    // the live receipt for the mechanism; the pairs above fire it.
    expect(vocabOf({
      form: 'synthetic', model: 'x',
      variants: [{ id: 'v', label: 'v', group: 'Variant', defaults: {}, route: 'x',
        sampler_envelope: { steps: [1, 2], cfg: [1, 2] } }],
    } as unknown as FormSpecDoc)).toEqual(['steps', 'cfg'])
    for (const from of FAMILIES) {
      const specFrom = servedSpec(from)
      const variants = (specFrom.variants ?? []).filter((r) => r.group === 'Variant')
      const heldBase: SpecValues = variants.length > 0
        ? { model: from.id, variant: variants[0].id, ...STATED }
        : { model: from.id, ...STATED }
      for (const to of FAMILIES) {
        if (to.id === from.id) continue
        const specTo = servedSpec(to)
        // (M5) THE DERIVED BAG: the incident pair + one
        // out-of-envelope stated value per arrival-vocabulary key the
        // pair does not name — the held rides it into the switch
        const stated: SpecValues = { ...STATED }
        for (const k of vocabOf(specTo)) {
          if (!(k in stated)) stated[k] = 999
        }
        const held: SpecValues = { ...heldBase, ...stated }
        const patch = modelSwitchPatch(specFrom, to.id, held)
        // the drill's re-key arm: the arrival seed + the reseat
        const seeded = seedUser(specTo, { ...held, ...patch } as SpecValues)
        const seated = reseatEnvelopeKeys(specTo, seeded)
        const doc = composeCandidateDoc({}, seated, {})
        const violations = composeValidate(specTo, doc)
        expect(violations, `${from.id} → ${to.id}: stated ${JSON.stringify(stated)} seated ${JSON.stringify(seated)} judged ${JSON.stringify(violations)}`).toEqual([])
        // and the seated numerics sit INSIDE the resolved variant's
        // own envelope (the lane never wakes up refusable)
        const resolved = (specTo.variants ?? []).find((r) =>
          r.id === seated['variant'] && r.group === 'Variant')
        if (resolved !== undefined) expectInsideEnvelope(resolved, seated, to.id)
      }
    }
  })

  // (reseat-chrome M6, 2026-11-06) THE DOOR'S FULL LAW AT THE SEAT:
  // composeValidate (clauses 1–3: envelope/marriage/quant) is a
  // WEAKER judge than the door that refuses the operator — the
  // relation words (required/together) live only in
  // judgeLaneRelations. This arm ties the re-key seat to the door's
  // own judge over the seated doc: the required half refuses a
  // prompt-less krea-2 doc that composes 'clean', and the together
  // half judges a held pair surviving a re-key.
  test('the door\'s relation judge reads the seated doc: required refuses a prompt-less krea-2 seat; together judges a held pair half', () => {
    // (i) REQUIRED — krea-2's own declaration (models/krea-2
    // src/index.ts:243): every image lane states what the picture is
    const krea = krea2 as ModelDecl
    expect(krea.relations, 'krea-2 declares relations (the audit\'s own receipt)').toBeDefined()
    const rels = krea.relations
    if (rels === undefined) throw new Error('krea-2 declares relations (the audit\'s own receipt)')
    const seated: SpecValues = { model: 'krea-2', variant: 'turbo', cfg: 2, steps: 8 }
    // clauses 1–3 say CLEAN (the weaker client mirror)…
    const spec = servedSpec(krea2)
    expect(composeValidate(spec, composeCandidateDoc({}, seated, {}))).toEqual([])
    // …while the DOOR refuses the same doc: no prompt
    const violations = judgeLaneRelations([rels], seated)
    expect(violations.length, 'the door refuses what the client mirror calls clean').toBeGreaterThanOrEqual(1)
    expect(violations[0].field).toBe('prompt')
    // and the honest doc (prompt stated) admits at BOTH judges
    const honest: SpecValues = { ...seated, prompt: 'a red cube' }
    expect(composeValidate(spec, composeCandidateDoc({}, honest, {}))).toEqual([])
    expect(judgeLaneRelations([rels], honest)).toEqual([])
    // (ii) TOGETHER — qwen3-tts's persona export pair
    // (voice_name + design_prompt): a held HALF surviving a re-key
    // refuses through the door's judge, both halves admit
    const tts = qwen3Tts as ModelDecl
    const ttsRels = tts.relations
    if (ttsRels === undefined) throw new Error('qwen3-tts declares relations (the audit\'s own receipt)')
    expect(ttsRels?.together?.length, 'qwen3-tts declares the persona export pair').toBeGreaterThan(0)
    const half: SpecValues = { model: 'qwen3-tts', voice_name: 'nova' }
    expect(judgeLaneRelations([ttsRels], half).some((v) => v.field === 'voice_name' || v.field === 'design_prompt'),
      'a held together-pair half refuses').toBe(true)
    // (qwen3-tts also requires `text` on every lane — the family's
    // own required word rides alongside the pair)
    expect(judgeLaneRelations([ttsRels], { ...half, design_prompt: 'warm alto', text: 'hello' })).toEqual([])
  })

  test('a variant pick lands the CHOICE\'s declared defaults (the latest selection overrides)', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      for (const row of variants) {
        for (const sibling of variants) {
          const held: SpecValues = { model: decl.id, variant: sibling.id, ...numericStamps(sibling) }
          const patch = axisPickPatch(spec, row, held)
          // every numeric the picked row DECLARES lands exactly on
          // the declaration (clamped through the row's own envelope)
          for (const [k, v] of Object.entries(numericStamps(row))) {
            const env = row.sampler_envelope
            const range = env?.[k as keyof SamplerEnvelope]
            const expected = Array.isArray(range) && v < range[0] ? range[0]
              : Array.isArray(range) && v > range[1] ? range[1] : v
            expect(patch[k], `${decl.id} / pick ${row.id}: ${k} must land on the choice's declared default`)
              .toBe(expected)
          }
        }
      }
    }
  })

  // (reseat-chrome M4, 2026-11-06) THE LYING-DECL CONTRACT: a
  // Variant-row pick whose own declared default sits OUTSIDE its own
  // envelope lands the stamp VERBATIM (trustStamps — the gate's to
  // refuse live), never silently clamped. Over every honest real
  // DECL clamp(v) === v, so the declared-defaults arm above cannot
  // distinguish trustStamps true from false — this synthetic cell
  // can, and the same row as a Recipe pick still clamps.
  test('a lying Variant DECL lands verbatim and the gate refuses it; the same stamp as a Recipe pick clamps', () => {
    const liar: FormVariantRow = {
      id: 'liar', label: 'liar', group: 'Variant', defaults: { cfg: 9 }, route: 'm',
      sampler_envelope: { cfg: [1, 2], steps: [4, 8] },
    }
    const spec: FormSpecDoc = { form: 'x', model: 'm', variants: [liar] } as unknown as FormSpecDoc
    const patch = axisPickPatch(spec, liar, { model: 'm' })
    expect(patch.cfg, 'the variant pick is the law-holder: its own stamp rides VERBATIM').toBe(9)
    const refusal = composeValidate(spec, composeCandidateDoc({}, { model: 'm', variant: 'liar', ...patch }, {}))
    expect(refusal.length, 'the compose gate refuses the lying doc — the cure never silently clamps a variant\'s own declaration').toBe(1)
    expect(JSON.stringify(refusal[0]), 'the offence is the envelope voice (the structured SamplerEnvelopeOffence)').toMatch(/envelope|cfg/i)
    const recipeRow: FormVariantRow = { ...liar, group: 'Recipe', id: 'r-liar' }
    const spec2: FormSpecDoc = { form: 'x', model: 'm', variants: [liar, recipeRow] } as unknown as FormSpecDoc
    const patch2 = axisPickPatch(spec2, recipeRow, { model: 'm', variant: 'liar' })
    expect(patch2.cfg, 'a cross-row (Recipe) stamp clamps through the variant\'s envelope').toBe(2)
  })

  test('every variant pick composes clean from every sibling\'s held knobs (the reconcile law)', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      for (const row of variants) {
        for (const sibling of variants) {
          // held = the sibling's own numeric stamps — the exact
          // gesture that bricked the live card (turbo held while
          // picking raw's steps 52; raw held while picking turbo's 8)
          const held: SpecValues = { model: decl.id, variant: sibling.id, ...numericStamps(sibling) }
          const patch = axisPickPatch(spec, row, held)
          const user: SpecValues = { ...held, ...patch }
          expectClean(spec, user, decl.id, `variant pick ${row.id} from held ${sibling.id}`)
          expectInsideEnvelope(row, user, decl.id)
        }
      }
    }
  })

  test('every recipe stamp composes clean over every variant holding', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      const recipes = (spec.variants ?? []).filter((r) => r.group === 'Recipe')
      for (const recipe of recipes) {
        for (const variant of variants) {
          const held: SpecValues = { model: decl.id, variant: variant.id, ...numericStamps(variant) }
          const patch = axisPickPatch(spec, recipe, held)
          const user: SpecValues = { ...held, ...patch }
          expectClean(spec, user, decl.id, `recipe stamp ${recipe.id} over ${variant.id}`)
        }
      }
    }
  })

  test('every quant cell pick composes clean under its owner variant', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      const cells = (spec.variants ?? []).filter((r) => r.group === 'Quant')
      for (const cell of cells) {
        const owner = variants.find((v) => v.id === cell.owner)
        if (owner === undefined) continue
        const held: SpecValues = { model: decl.id, variant: owner.id, ...numericStamps(owner) }
        const patch = axisPickPatch(spec, cell, held)
        const user: SpecValues = { ...held, ...patch }
        expectClean(spec, user, decl.id, `quant cell ${cell.id} under ${owner.id}`)
      }
    }
  })

  test('THE FULL GESTURE CHAIN — model, then every variant, then its cells, then every recipe — composes clean at EVERY step', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      let user: SpecValues = modelSwitchPatch(spec, decl.id)
      expectClean(spec, user, decl.id, 'chain step 1: model')
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      for (const variant of variants) {
        user = { ...user, ...axisPickPatch(spec, variant, user) }
        expectClean(spec, user, decl.id, `chain step 2: variant ${variant.id}`)
        const cells = (spec.variants ?? []).filter((r) => r.group === 'Quant' && r.owner === variant.id)
        for (const cell of cells) {
          user = { ...user, ...axisPickPatch(spec, cell, user) }
          expectClean(spec, user, decl.id, `chain step 3: cell ${cell.id}`)
        }
      }
      const recipes = (spec.variants ?? []).filter((r) => r.group === 'Recipe')
      for (const recipe of recipes) {
        user = { ...user, ...axisPickPatch(spec, recipe, user) }
        expectClean(spec, user, decl.id, `chain step 4: recipe ${recipe.id}`)
      }
    }
  })

  test('PICK ORDER NEVER MATTERS — variant, quant, recipe in every permutation compose clean and agree on the judged keys', () => {
    const ORDERS: ReadonlyArray<ReadonlyArray<'variant' | 'quant' | 'recipe'>> = [
      ['variant', 'quant', 'recipe'], ['variant', 'recipe', 'quant'],
      ['quant', 'variant', 'recipe'], ['quant', 'recipe', 'variant'],
      ['recipe', 'variant', 'quant'], ['recipe', 'quant', 'variant'],
    ]
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      const recipes = (spec.variants ?? []).filter((r) => r.group === 'Recipe')
      for (const variant of variants) {
        const cell = (spec.variants ?? []).find((r) => r.group === 'Quant' && r.owner === variant.id)
        for (const recipe of recipes) {
          const finals: SpecValues[] = []
          for (const order of ORDERS) {
            let user: SpecValues = { model: decl.id, variant: variant.id, ...numericStamps(variant) }
            for (const step of order) {
              const row = step === 'variant' ? variant : step === 'quant' ? cell : recipe
              if (row === undefined) break
              user = { ...user, ...axisPickPatch(spec, row, user) }
            }
            expectClean(spec, user, decl.id, `order ${order.join('→')} (${variant.id}${cell !== undefined ? '/' + cell.id : ''}${recipe !== undefined ? '/' + recipe.id : ''})`)
            finals.push(user)
          }
          if (finals.length === ORDERS.length) {
            // THE LATEST SELECTION OVERRIDES (the operator's law,
            // pinned positively): for every judged key, the final
            // value is the LAST pick in the order that declares it —
            // its own default, clamped through the variant envelope.
            // Order changes WHO wins a contested key, never the law.
            for (let oi = 0; oi < ORDERS.length; oi++) {
              const order = ORDERS[oi]
              for (const k of Object.keys(variant.sampler_envelope ?? {})) {
                let owner: FormVariantRow | undefined
                for (const step of order) {
                  const row = step === 'variant' ? variant : step === 'quant' ? cell : recipe
                  if (row !== undefined && typeof row.defaults[k] === 'number') owner = row
                }
                if (owner === undefined) continue
                const range = variant.sampler_envelope?.[k as keyof SamplerEnvelope]
                const declared = owner.defaults[k] as number
                const expected = Array.isArray(range) && declared < range[0] ? range[0]
                  : Array.isArray(range) && declared > range[1] ? range[1] : declared
                const finalDoc = finals[oi]
                if (typeof finalDoc[k] === 'number') {
                  expect(finalDoc[k], `${decl.id} / order ${order.join('→')}: ${k} — the LAST pick declaring it (${owner.id}) owns the key`)
                    .toBe(expected)
                }
              }
            }
          }
        }
      }
    }
  })

  test('THE REOPEN FACE — a switched doc reseeds without resurrecting the departed choice\'s numbers', () => {
    for (const decl of FAMILIES) {
      const spec = servedSpec(decl)
      const variants = (spec.variants ?? []).filter((r) => r.group === 'Variant')
      for (const from of variants) {
        for (const to of variants) {
          const held: SpecValues = { model: decl.id, variant: from.id, ...numericStamps(from) }
          const switched: SpecValues = { ...held, ...axisPickPatch(spec, to, held) }
          // seedUser is the drill's reopen verb: held keys ride — the
          // switch's write must already have landed the override, so
          // the reseed carries the NEW choice's truth, never from's
          const reseeded = seedUser(spec, switched)
          expectClean(spec, reseeded, decl.id, `reopen after ${from.id} → ${to.id}`)
        }
      }
    }
  })
})
