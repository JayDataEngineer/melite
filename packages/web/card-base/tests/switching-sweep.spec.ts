/** THE SWITCHING SWEEP (operator 2026-11-05: "YOU PIN THAT IN
 * TESTS AS HARD AND DEEP AS IT GOES. THIS IS A CORE FEATURE OF
 * MELITE" — switching model/variant/recipe is the card's spine, and
 * the live estate red-bricked every switch while the frozen-fixture
 * suites stayed green). DEPTH is the cure this wall exists to hold:
 * NO frozen spec literal anywhere — the sweep rides EVERY real
 * family DECL through the discovery serialization (mirrored
 * verbatim from melite-tools/src/discovery.ts: variantRow +
 * specVariants' cell expansion + the head-claim row) into the REAL
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
import { DECL as anima } from '../../../models/anima/src/index.ts'
import { DECL as anny } from '../../../models/anny/src/index.ts'
import { DECL as anycreature } from '../../../models/anycreature/src/index.ts'
import { DECL as concat } from '../../../models/concat/src/index.ts'
import { DECL as fit } from '../../../models/fit/src/index.ts'
import { DECL as florence2 } from '../../../models/florence2/src/index.ts'
import { DECL as fluxKlein } from '../../../models/flux-klein/src/index.ts'
import { DECL as gemSoma } from '../../../models/gem_soma/src/index.ts'
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
import { DECL as seedvr2 } from '../../../models/seedvr2_ema/src/index.ts'
import { DECL as skin } from '../../../models/skin/src/index.ts'
import { DECL as somax } from '../../../models/somax/src/index.ts'
import { DECL as transferRig } from '../../../models/transfer_rig/src/index.ts'
import { DECL as trellis2 } from '../../../models/trellis2-native/src/index.ts'
import { DECL as wd14 } from '../../../models/wd14/src/index.ts'
import { DECL as yue2 } from '../../../models/yue2/src/index.ts'
import { DECL as zImage } from '../../../models/z-image/src/index.ts'
import type { SamplerEnvelope } from '@melite/contracts/laneRelations'

/** The DECL's served shape (the structural slice the discovery
 * serialization reads — packages/models/<family>/src/index.ts DECL). */
interface DeclCell {
  quant: string
  label?: string
  route?: string
  engine?: string
  vram_peak_gb?: number
  hide_from_dropdown?: boolean
  resolver_defaults?: Record<string, unknown>
}
interface DeclRow {
  id: string
  label: string
  group: string
  route?: string
  hint?: string
  engine?: string
  hide_from_dropdown?: boolean
  // (the sampler envelope rides the REAL contract type — the
  // mirror drifted when discovery's envelope became structured
  // {steps, cfg}; re-spelling it here would re-drift silently.)
  sampler_envelope?: SamplerEnvelope | null
  resolver_defaults?: Record<string, unknown>
  wire_defaults?: Record<string, unknown> | null
  cells?: DeclCell[]
}
interface FamilyDecl { id: string; engine?: string; variants?: DeclRow[] }

/** Every family DECL in the tree — the census law: a new family
 * package that exports DECL owes this list a row (adding a family
 * without boarding it here leaves its switching face unjudged). */
const FAMILIES: readonly FamilyDecl[] = [
  anima, anny, anycreature, concat, fit, florence2, fluxKlein, gemSoma, h3,
  input, joycaption, joytag, kimodo, krea2, mask, mossSfx, music3, pixal3d,
  qwenImg21, qwenImgEdit21, qwenImgEdit2511, qwen3Tts, seedvr2, skin, somax,
  transferRig, trellis2, wd14, yue2, zImage,
]

/** The discovery serialization, mirrored VERBATIM (melite-tools/
 * src/discovery.ts variantRow + specVariants): resolver_defaults +
 * wire_defaults merge into the pick stamp; cells expand into Quant
 * rows owned by their variant (composite id only on collision); the
 * head-claim alias serves when no row routes the family id. The
 * mirror is deliberate DEPTH, not duplication: this wall judges the
 * CLIENT machinery against the exact row shapes the door serves —
 * when discovery's serialization changes, this mirror changes WITH
 * it or the wall reds on the first drifted pick. */
function servedSpec(decl: FamilyDecl): FormSpecDoc {
  const rows: FormVariantRow[] = []
  const seen = new Set<string>()
  const declEngine = decl.engine ?? ''
  for (const v of decl.variants ?? []) {
    if (v.hide_from_dropdown === true) continue
    rows.push({
      id: v.id, label: v.label, group: v.group,
      defaults: { ...(v.resolver_defaults ?? {}), ...(v.wire_defaults ?? {}) },
      route: v.route ?? '', hint: v.hint ?? null, engine: v.engine ?? declEngine,
      sampler_envelope: v.sampler_envelope ?? null,
      quant: null, vram_peak_gb: null, owner: '',
    })
    seen.add(v.id)
    for (const c of v.cells ?? []) {
      if (c.hide_from_dropdown === true) continue
      if (!c.route) continue
      const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant
      seen.add(id)
      rows.push({
        id, label: c.label || c.quant, group: 'Quant',
        defaults: c.resolver_defaults ?? {}, route: c.route, hint: null,
        engine: c.engine ?? declEngine, quant: c.quant,
        vram_peak_gb: c.vram_peak_gb ?? null, owner: v.id,
      })
    }
  }
  const routed = new Set<string>()
  for (const v of decl.variants ?? []) {
    if (v.route) routed.add(v.route)
    for (const c of v.cells ?? []) if (c.route) routed.add(c.route)
  }
  if (!routed.has(decl.id)) {
    const resolving = (decl.variants ?? []).find((v) => (v.cells ?? []).length > 0)
      ?? (decl.variants ?? [])[0]
    if (resolving !== undefined && resolving.hide_from_dropdown !== true) {
      const id = seen.has(resolving.id) ? `${resolving.id}__head` : resolving.id
      rows.push({
        id, label: resolving.label, group: 'Variant', defaults: {},
        route: decl.id, hint: resolving.hint ?? null,
        engine: resolving.engine ?? declEngine,
        sampler_envelope: resolving.sampler_envelope ?? null,
        quant: null, vram_peak_gb: null, owner: '',
      })
    }
  }
  return { model: decl.id, variants: rows, label: null, form: decl.id }
}

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
        const doc = composeCandidateDoc({}, { ...held, ...patch }, {})
        // the departing family's judged numerics ride as NULL writes
        // (the unset law) — the doc carries none of them
        const violations = composeValidate(specTo, doc)
        expect(violations, `${from.id} → ${to.id}: ${JSON.stringify(doc)} judged ${JSON.stringify(violations)}`).toEqual([])
      }
    }
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
    const STATED: SpecValues = { cfg: 3.5, steps: 52 }
    for (const from of FAMILIES) {
      const specFrom = servedSpec(from)
      const variants = (specFrom.variants ?? []).filter((r) => r.group === 'Variant')
      const held: SpecValues = variants.length > 0
        ? { model: from.id, variant: variants[0].id, ...STATED }
        : { model: from.id, ...STATED }
      for (const to of FAMILIES) {
        if (to.id === from.id) continue
        const specTo = servedSpec(to)
        const patch = modelSwitchPatch(specFrom, to.id, held)
        // the drill's re-key arm: the arrival seed + the reseat
        const seeded = seedUser(specTo, { ...held, ...patch } as SpecValues)
        const seated = reseatEnvelopeKeys(specTo, seeded)
        const doc = composeCandidateDoc({}, seated, {})
        const violations = composeValidate(specTo, doc)
        expect(violations, `${from.id} → ${to.id}: stated ${JSON.stringify(STATED)} seated ${JSON.stringify(seated)} judged ${JSON.stringify(violations)}`).toEqual([])
        // and the seated numerics sit INSIDE the resolved variant's
        // own envelope (the lane never wakes up refusable)
        const resolved = (specTo.variants ?? []).find((r) =>
          r.id === seated['variant'] && r.group === 'Variant')
        if (resolved !== undefined) expectInsideEnvelope(resolved, seated, to.id)
      }
    }
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
