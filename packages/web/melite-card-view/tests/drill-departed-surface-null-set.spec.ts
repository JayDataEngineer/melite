// @contract cards-drill-departed-surface-arrival
// drill-departed-surface-null-set.spec.ts — THE DRILL NULL-SET ARMS
// (2026-11-08) — the verb seats behind ERRORS.md item h / B8
// ("2511 → recipe click → back to 21 strands double_reference — THE
// WRITE DID NOT LAND"), study finding dev_docs/audits/
// refmod-deep-study-2026-11-08.md §6 (the drill's null-set misses
// the plain boolean DECL params) and the purge's P4
// (dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §2.1, §7:
// "departed-minus-arrival surface nulls AND merge-order precedence").
//
// THE SEAT THESE ARMS JUDGE: the switch verbs the drill (and every
// Model rail / pick face) share — card-base modelSwitchPatch's
// cross-family null set, the drill's own re-point merge order
// (stage-drill.tsx rePointFrame: {…modelSwitchPatch(…), …frame} —
// the caller's frame WINS), seedUser's pass-along, reseatEnvelopeKeys,
// composeCandidateDoc, and the client mirror composeValidate.
//
// (2026-11-09) THE PAIR RE-SEAT: the burned pair's FROM family was
// removed at the operator's order ("that model is too old") and the
// two surviving edit lanes share an IDENTICAL declared surface, so
// the edit card can no longer witness this law. The law is generic
// — it re-seats on the MUSIC pair, whose DECLs differ today exactly
// the way the burned pair did: music3 declares
// guidance_scale/lm_cfg_scale/tiled_decode that yue2 does NOT
// (packages/models/music3/src/index.ts:203-207;
// packages/models/yue2/src/index.ts — yue2's own `mode` rides the
// arrival's side). The departed-minus-arrival surface is DERIVED
// from those DECL arrays; nothing here is a frozen key list.
//
// THE PRE-REGISTERED REDS (first run IS the receipt; the suite runs
// `npx vitest run packages/web/melite-card-view/tests/drill-departed-surface-null-set.spec.ts`):
// all three verb arms red on the pre-cure tree —
//   1. the switch verb's null set (card-base spec.ts) read only the
//      departing ENVELOPE vocabulary and the schema's ARRAY-node
//      bags — a plain scalar DECL param was in NEITHER set (study
//      §6, verbatim).
//   2. the re-point merge order (stage-drill.tsx) let an incoming
//      frame RE-PLANT a departed stamp over the verb's verdicts —
//      the P4 merge-order half.
//   3. seedUser's pass-along rode the departed pair verbatim into
//      the arrival holding and composeValidate (the client mirror)
//      greened the doc — while the estate's admission gate refused
//      it field-named (the all-green fraud face; the door's voice is
//      named on the arm).
//
// THE CURE ALREADY LANDED — AND WHERE: commit a5da22c6c ("the P4
// departed-scalar cure") deletes the departed fields at the DRILL
// COMPONENT's spec-land seed (stage-drill.tsx, the effect), judged by
// stage-drill-gates.spec.tsx:1108 on a SYNTHETIC fixture
// (fam-a/fam-b). The shared VERBS that seat calls keep the hole, on
// the REAL DECL pair, and every other consumer of those verbs (the
// generic CardForm lanes, tool/agent patch faces) has no component
// cure to stand on. These arms are the verb-level wall P4 demanded —
// they red until the null set and the merge order carry the law
// themselves.
import { describe, expect, test } from 'vitest'
import { axisGroups, axisKey, composeCandidateDoc, composeValidate, mergeSwitchFrame, modelSwitchPatch, schemaEnvelope, seedUser,
  type FormSpecDoc, type SpecValues } from '../../card-base/src/spec.ts'
import { specVariants } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { DECL as music3Decl } from '../../../models/music3/src/index.ts'
import { DECL as yue2Decl } from '../../../models/yue2/src/index.ts'

/** THE SERVED SPEC, FOR REAL (the switching-sweep precedent): the
 *  serializer the form-spec door drives, over the family's own face —
 *  carrying the family's DECLARED SURFACE (`params`, straight from
 *  the DECL: the wire field the form-spec door serves since the drill
 *  null-set cure). */
function servedSpec(decl: typeof music3Decl): FormSpecDoc {
  return { model: decl.id, variants: specVariants(decl, decl.id), label: null, form: decl.id, params: decl.params }
}

const FROM_DECL = music3Decl
const TO_DECL = yue2Decl
const FROM_SPEC = servedSpec(FROM_DECL)
const TO_SPEC = servedSpec(TO_DECL)

/** THE DEPARTED SURFACE, DERIVED: every param the departing family's
 *  DECL declares that the arrival's DECL does not. The floor assert
 *  pins the witness pair so an emptied surface can never pass the
 *  arms vacuously (LAW 4 axis 1: an always-true judge is a finding). */
function departedSurface(): string[] {
  const arrival = new Set<string>(TO_DECL.params)
  const out = (FROM_DECL.params ?? []).filter((k) => !arrival.has(k))
  return out
}
const SURFACE = departedSurface()
const DEPARTED_KEYS = ['guidance_scale', 'lm_cfg_scale', 'tiled_decode'] as const

/** The holding the operator's gesture produces: a recipe's stamps
 *  ridden through a real pick on the music3 face, the model rail
 *  pointed at yue2. */
function burnedHolding(): SpecValues {
  const held: SpecValues = {
    model: FROM_DECL.id,
    prompt: 'a quiet waltz',
    lyrics: 'hold the line',
    duration: 90,
    n_diffusion_steps: 60,
    seed: 424243,
  }
  for (const k of DEPARTED_KEYS) held[k] = true
  return held
}

describe('the drill null-set arms (ERRORS h; study §6; purge P4) — the switch verbs on the REAL music3/yue2 DECLs', () => {
  // ── THE IMAGE-SUBJECT EXEMPTION (operator, 2026-10-21: "When I
  // switch image edit models in the Image Edit card, the input
  // images drop, and I have to re put in the image edit model. I
  // want it to not drop the image") ──────────────────────────────
  // An array whose wtype is image_list is the edit's SUBJECT — the
  // photo being edited, model-agnostic. The mod-bag law ("keeping
  // the lora on makes zero sense") kills mod currency; it must never
  // kill the subject. The arm rides a synthetic schema envelope (the
  // law is the verb's wtype judgment, generic across cards) over the
  // real served doc.
  test('THE SUBJECT SURVIVES THE SWITCH — image_list arrays never null; mod bags still die', () => {
    const subjectSpec: FormSpecDoc = {
      ...FROM_SPEC,
      schema: schemaEnvelope({
        input_images: { type: 'array', meta: { extra: { wtype: 'image_list', zone: 'inputs' } } },
        reference_images: { type: 'array', meta: { extra: { wtype: 'image_list', zone: 'params' } } },
        ref_mods: { type: 'array', meta: {} },
      }),
    }
    const patch = modelSwitchPatch(subjectSpec, TO_DECL.id, burnedHolding(), TO_SPEC)
    // the edit's subject NEVER nulls — held input_images ride through
    expect(patch['input_images'], 'the INPUT image must survive the model switch (the operator\'s law)').not.toBeNull()
    expect(patch['reference_images'], 'a params-zone image_list (reference anchors) is subject too').not.toBeNull()
    if ('input_images' in patch) throw new Error('the switch must not even carry the subject key — the held value rides untouched')
    // and the mod currency still dies with its model (the law's other half)
    expect(patch['ref_mods'], 'a mod array still nulls on the cross-model switch').toBeNull()
  })

  test('THE SURFACE FLOOR — the derivation finds the departed trio (the arms cannot pass vacuously)', () => {
    for (const k of DEPARTED_KEYS) {
      expect(SURFACE, `the derived departed surface must contain '${k}' (music3 params: [${(FROM_DECL.params ?? []).join(', ')}]; yue2 params: [${(TO_DECL.params ?? []).join(', ')}])`).toContain(k)
    }
  })

  test('ARM 1 (THE RED) — the switch verb’s cross-family null set covers the departed surface: every departed key leaves as an explicit null (the unset law)', () => {
    // THE HOP: [1] UI seat → the switch verb → the write the bench
    // receives. The law: a cross-family switch nulls the DEPARTING
    // vocabulary — every envelope key this spec’s rows name (the
    // override law), every schema ARRAY-node bag (the per-model
    // mod-bag law), and — the cure — every key the DEPARTING doc’s
    // DECLARED SURFACE (`params`) names that the ARRIVAL doc’s
    // declared surface does not (modelSwitchPatch’s crossSpec block:
    // the verb refuses to guess, nulling only when both surfaces are
    // on the wire). The arm passes the arrival as the verb’s fourth
    // argument — the served lane always knows it.
    const patch = modelSwitchPatch(FROM_SPEC, TO_DECL.id, burnedHolding(), TO_SPEC)
    const failures: string[] = []
    for (const k of SURFACE) {
      if (!(k in patch) || patch[k] !== null) {
        failures.push(`${k}: the patch ${k in patch ? `carries ${JSON.stringify(patch[k])}` : 'does not carry the key at all'} — absent is not the unset law’s null; the holding keeps the departed knob and the run door refuses it field-named`)
      }
    }
    expect(failures, `the switch verb’s null set misses the departed surface (card-base src/spec.ts — the crossSpec null loop):\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('ARM 2 (THE RED) — the re-point merge order: the incoming frame never re-plants a key the verb nulled (the P4 merge-order half)', () => {
    // THE MERGE IS ONE HOME: the drill’s re-point seam (stage-drill.tsx
    // rePointFrame, “THE MERGE IS ONE HOME”) routes through
    // mergeSwitchFrame — the caller’s frame wins EXCEPT under the
    // patch’s null verdicts. A frame that re-points the family WHILE
    // stamping the departed recipe key (a recipe re-point, a tool or
    // agent patch routed through the drill’s atomic pick) re-planted
    // the stamp over the verb’s nulls when the merge was a bare
    // spread; the law: the nulled departed-surface keys BEAT the
    // incoming frame.
    const patch = modelSwitchPatch(FROM_SPEC, TO_DECL.id, burnedHolding(), TO_SPEC)
    const frame: Record<string, unknown> = { model: TO_DECL.id, guidance_scale: 2.5 }
    const merged = mergeSwitchFrame(patch, frame) as SpecValues
    const failures: string[] = []
    for (const k of DEPARTED_KEYS) {
      if (merged[k] === true) {
        failures.push(`${k}: the incoming frame re-planted the departed stamp over the verb’s verdicts (mergeSwitchFrame — the null verdicts must beat the frame) — the write lands on the ${TO_DECL.id} lane carrying a field its DECL does not declare`)
      }
    }
    expect(failures, `the merge order re-plants the departed stamps:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('ARM 3 (THE RED) — the arrival holding never carries the departed trio: seedUser pass-along, the composed doc, and the client mirror’s raw-ride refusal', () => {
    // THE FULL CHAIN the drill rides on spec-land: the reseed seeds
    // the arrival’s rows OVER the cured patch (seedUser consumes the
    // null verdicts — THE UNSET MARK IS CONSUMED AT THE SEED), the
    // composed candidate doc is what the run flush judges. The cured
    // chain ends clean by construction; the mirror clause therefore
    // judges the RAW-RIDE doc — what a non-verb writer produces (a
    // tool or agent patch that swaps `model` without the switch
    // verb): the estate’s admission gate refuses it field-named
    // ("field 'guidance_scale' fires nothing on this lane" — the
    // ERRORS.md item h class, the live banner), and the client
    // mirror — the fraud face of the first cut — greened exactly
    // that doc.
    const patch = modelSwitchPatch(FROM_SPEC, TO_DECL.id, burnedHolding(), TO_SPEC)
    const seeded = seedUser(TO_SPEC, { ...burnedHolding(), ...patch })
    const doc = composeCandidateDoc({}, seeded, {})
    // THE RAW RIDE: no switch verb — a bare model swap over the
    // holding (the old drill bug, any direct patch writer).
    const rawDoc = { ...burnedHolding(), model: TO_DECL.id }
    const violations = composeValidate(TO_SPEC, rawDoc)
    const failures: string[] = []
    for (const k of DEPARTED_KEYS) {
      if (seeded[k] !== undefined) failures.push(`seedUser: the ${TO_DECL.id} holding carries the departed '${k}' verbatim (card-base src/spec.ts — the seed must consume the null verdicts)`)
      if (doc[k] !== undefined) failures.push(`the composed candidate doc carries '${k}' on the ${TO_DECL.id} lane — the run flush sends it and the door refuses it field-named`)
      if (!violations.some((v) => v.message.includes(`'${k}'`))) {
        failures.push(`composeValidate (the client mirror) refuses the raw-ride '${k}' nothing — while the estate admission gate refuses it field-named; the mirror needs the declared-surface clause`)
      }
    }
    expect(failures, `the arrival holding rides the departed trio:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('ARM 4 — the gesture-time 3-arg seats refuse to guess (DRILL (a) remainder): arrival unknown → axes clear, bag dies, the params surface waits for the settle', () => {
    // THE TWO SEATS THAT STAY 3-ARG (stage-drill.tsx rePointFrame +
    // card-base axes.tsx:273 Model rail): at gesture time the arrival
    // SPEC DOC does not exist yet — the re-point IS what triggers its
    // fetch — so the verb cannot judge the departed-minus-arrival
    // surface and MUST NOT (a wrong null deletes a shared word's user
    // intent). The pinned law: the 3-arg form still clears the axes
    // (crossSpec), still nulls the departing envelope vocabulary and
    // the mod bag — but carries NO params-surface verdicts. The
    // settle seat (stage-drill.tsx:386, 4-arg with the fetched doc)
    // owns the surface nulls (ARM 1), and the arrival-window fence
    // owns the gesture→settle round trip — that interplay is the
    // complete DRILL (a), and this arm is why the gesture seats are
    // 3-arg BY LAW rather than by omission.
    const patch = modelSwitchPatch(FROM_SPEC, TO_DECL.id, burnedHolding())
    const failures: string[] = []
    if (patch.model !== TO_DECL.id) failures.push(`model: the patch does not re-point at '${TO_DECL.id}'`)
    const CLEARED: ReadonlyArray<unknown> = ['', null]
    for (const g of axisGroups(FROM_SPEC)) {
      const k = axisKey(g)
      if (!CLEARED.includes(patch[k])) failures.push(`axis '${k}': a cross-family switch must CLEAR the departing axis (saw ${JSON.stringify(patch[k])}) — the arrival's rows seed fresh at spec-land`)
    }
    for (const k of DEPARTED_KEYS) {
      if (k in patch) {
        failures.push(`'${k}': the arrival-unknown verb rendered a params-surface verdict (${JSON.stringify(patch[k])}) — with no arrival surface the verb must refuse to guess (spec.ts: the null loop is arrival-gated); the settle seat owns this null (ARM 1)`)
      }
    }
    expect(failures, `the gesture-time verb guesses or keeps:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('ARM 5 (THE REMAINDER) — the unnamed-arrival mirror stays silent (the stage-drill arrival floor at the mirror: arrival !== "")', () => {
    // (h2) REMAINDER: stage-drill.tsx:374 carries `arrival !== ''`
    // (an unnamed arrival must never clobber the user's model) but
    // the mirror clause judged the doc against WHATEVER surface the
    // spec carried — including an unnamed one, voicing violations
    // that name the empty lane ('the served surface (' + '' + ')
    // does not declare it'). The mirror refuses to guess until the
    // arrival names itself: a spec with params but model '' yields
    // NO mirror violations (the family clause above keeps its own
    // humility — this floor is the mirror's).
    const unnamed = { ...TO_SPEC, model: '' }
    const rawDoc = { ...burnedHolding(), model: TO_DECL.id }
    const violations = composeValidate(unnamed, rawDoc)
    const mirrorHits = violations.filter((v) => v.message.includes('does not declare it'))
    expect(mirrorHits, `the unnamed-arrival mirror voiced the empty lane instead of staying silent — an arrival that has not named itself must never clobber the doc's voice`).toEqual([])
  })

  test('THE PIN THAT STANDS — the arrival lane’s own words: the trio is music3’s recipe seat and NOT on the yue2 surface (the DECL is the truth home)', () => {
    // The DECL-side fact the whole file leans on, pinned so a surface
    // change re-pins the arms deliberately (the purge §2.1 rows).
    expect((FROM_DECL.params ?? [])).toEqual(expect.arrayContaining([...DEPARTED_KEYS]))
    expect(TO_DECL.params ?? []).not.toContain('guidance_scale')
    expect(TO_DECL.params ?? []).not.toContain('lm_cfg_scale')
    expect(TO_DECL.params ?? []).not.toContain('tiled_decode')
  })
})
