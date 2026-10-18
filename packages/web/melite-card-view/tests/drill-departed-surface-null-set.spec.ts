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
// composeCandidateDoc, and the client mirror composeValidate. The
// arms ride the REAL 2511/21 DECLs — the burned pair: 2511's params
// declare use_stock_nodes/double_reference
// (packages/models/qwen-img-edit-2511/src/index.ts:74-75, defaults
// :34/:38), 21's params DO NOT
// (packages/models/qwen-img-edit-21/src/index.ts:74-78, the declared
// "NOT here"). The departed-minus-arrival surface is DERIVED from
// those DECL arrays; nothing here is a frozen key list.
//
// THE PRE-REGISTERED REDS (first run IS the receipt; the suite runs
// `npx vitest run packages/web/melite-card-view/tests/drill-departed-surface-null-set.spec.ts`):
// all three verb arms red on today's tree —
//   1. the switch verb's null set (card-base spec.ts:1316-1341) reads
//      only the departing ENVELOPE vocabulary (2511's edit rows carry
//      none) and the schema's ARRAY-node bags — a plain boolean DECL
//      param is in NEITHER set (study §6, verbatim).
//   2. the re-point merge order (stage-drill.tsx:507-516) lets an
//      incoming frame RE-PLANT a departed stamp over the verb's
//      verdicts — the P4 merge-order half.
//   3. seedUser's pass-along rides the departed pair verbatim into
//      the 21 holding and composeValidate (the client mirror) greens
//      the doc — while the estate's admission gate refuses it
//      field-named (the all-green fraud face; the door's voice is
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
import { composeCandidateDoc, composeValidate, mergeSwitchFrame, modelSwitchPatch, seedUser,
  type FormSpecDoc, type SpecValues } from '../../card-base/src/spec.ts'
import { specVariants } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { DECL as qwenImgEdit21 } from '../../../models/qwen-img-edit-21/src/index.ts'
import { DECL as qwenImgEdit2511 } from '../../../models/qwen-img-edit-2511/src/index.ts'

// THE RECUT (2026-11-08, the cure session — the canon's ACCURACY axis):
// the first cut built SCHEMA-LESS, PARAM-LESS spec fixtures and demanded
// the departed-surface nulls from a verb that could not see the surface
// from its inputs (a 3-arg modelSwitchPatch over a carrier with neither
// `schema` nor `params` derives nothing — the cure would have needed
// DECL imports inside card-base, a layering violation). The honest law,
// now cured in src: the SERVED DOC carries the family's declared surface
// (`params` — the wire field the form-spec door serves from the DECL),
// the switch verb takes the ARRIVAL doc and nulls the departed surface
// (declared-here, not-declared-there), mergeSwitchFrame is the ONE HOME
// of the merge order (null verdicts beat the frame), seedUser consumes
// the unset mark, and the compose mirror refuses a key no declared
// surface owns. These arms ride that law with DECL-derived fixtures —
// every assertion of the first cut kept byte-for-byte; ARM 3's mirror
// clause now feeds composeValidate the RAW-ride doc (what a non-verb
// writer produces) — the fraud face it exists to catch — because the
// verb-cured chain ends clean by construction.

/** THE SERVED SPEC, FOR REAL (the switching-sweep precedent): the
 *  serializer the form-spec door drives, over the family's own face —
 *  carrying the family's DECLARED SURFACE (`params`, straight from the
 *  DECL: the wire field the form-spec door serves since the drill
 *  null-set cure). */
function servedSpec(decl: typeof qwenImgEdit21): FormSpecDoc {
  return { model: decl.id, variants: specVariants(decl, decl.id, decl.id), label: null, form: decl.id, params: decl.params }
}

const FROM_DECL = qwenImgEdit2511
const TO_DECL = qwenImgEdit21
const FROM_SPEC = servedSpec(FROM_DECL)
const TO_SPEC = servedSpec(TO_DECL)

/** THE DEPARTED SURFACE, DERIVED: every param the departing family's
 *  DECL declares that the arrival's DECL does not. The floor assert
 *  pins the burned pair so an emptied surface can never pass the
 *  arms vacuously (LAW 4 axis 1: an always-true judge is a finding). */
function departedSurface(): string[] {
  const arrival = new Set<string>(TO_DECL.params)
  const out = (FROM_DECL.params ?? []).filter((k) => !arrival.has(k))
  return out
}
const SURFACE = departedSurface()
const BURNED_PAIR = ['double_reference', 'use_stock_nodes'] as const

/** The holding the operator's gesture produces: the Strong Identity
 *  recipe's stamps ridden through a real pick on the 2511 face, the
 *  model rail pointed at 21. */
function burnedHolding(): SpecValues {
  const held: SpecValues = {
    model: FROM_DECL.id,
    steps: 4,
    cfg: 2.5,
    prompt: 'keep the handwriting',
    input_images: ['refs/anchor.png'],
  }
  for (const k of BURNED_PAIR) held[k] = true
  return held
}

describe('the drill null-set arms (ERRORS h; study §6; purge P4) — the switch verbs on the REAL 2511/21 DECLs', () => {
  test('THE SURFACE FLOOR — the derivation finds the burned pair (the arms cannot pass vacuously)', () => {
    for (const k of BURNED_PAIR) {
      expect(SURFACE, `the derived departed surface must contain '${k}' (2511 params: [${(FROM_DECL.params ?? []).join(', ')}]; 21 params: [${(TO_DECL.params ?? []).join(', ')}])`).toContain(k)
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
    const frame: Record<string, unknown> = { model: TO_DECL.id, double_reference: true }
    const merged = mergeSwitchFrame(patch, frame) as SpecValues
    const failures: string[] = []
    for (const k of BURNED_PAIR) {
      if (merged[k] === true) {
        failures.push(`${k}: the incoming frame re-planted the departed stamp over the verb’s verdicts (mergeSwitchFrame — the null verdicts must beat the frame) — the write lands on the ${TO_DECL.id} lane carrying a field its DECL does not declare`)
      }
    }
    expect(failures, `the merge order re-plants the departed stamps:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('ARM 3 (THE RED) — the arrival holding never carries the departed pair: seedUser pass-along, the composed doc, and the client mirror’s raw-ride refusal', () => {
    // THE FULL CHAIN the drill rides on spec-land: the reseed seeds
    // the arrival’s rows OVER the cured patch (seedUser consumes the
    // null verdicts — THE UNSET MARK IS CONSUMED AT THE SEED), the
    // composed candidate doc is what the run flush judges. The cured
    // chain ends clean by construction; the mirror clause therefore
    // judges the RAW-RIDE doc — what a non-verb writer produces (a
    // tool or agent patch that swaps `model` without the switch
    // verb): the estate’s admission gate refuses it field-named
    // ("field 'double_reference' fires nothing on this lane" —
    // ERRORS.md item h, the live banner), and the client mirror —
    // the fraud face of the first cut — greened exactly that doc.
    const patch = modelSwitchPatch(FROM_SPEC, TO_DECL.id, burnedHolding(), TO_SPEC)
    const seeded = seedUser(TO_SPEC, { ...burnedHolding(), ...patch })
    const doc = composeCandidateDoc({}, seeded, {})
    // THE RAW RIDE: no switch verb — a bare model swap over the
    // holding (the old drill bug, any direct patch writer).
    const rawDoc = { ...burnedHolding(), model: TO_DECL.id }
    const violations = composeValidate(TO_SPEC, rawDoc)
    const failures: string[] = []
    for (const k of BURNED_PAIR) {
      if (seeded[k] !== undefined) failures.push(`seedUser: the ${TO_DECL.id} holding carries the departed '${k}' verbatim (card-base src/spec.ts — the seed must consume the null verdicts)`)
      if (doc[k] !== undefined) failures.push(`the composed candidate doc carries '${k}' on the ${TO_DECL.id} lane — the run flush sends it and the door refuses field-named`)
      if (!violations.some((v) => v.message.includes(`'${k}'`))) {
        failures.push(`composeValidate (the client mirror) refuses the raw-ride '${k}' nothing — while the estate admission gate refuses it field-named; the mirror needs the declared-surface clause`)
      }
    }
    expect(failures, `the arrival holding rides the departed pair:\n  ${failures.join('\n  ')}`).toEqual([])
  })

  test('THE PIN THAT STANDS — the arrival lane’s own words: the pair is 2511’s edit-tuning seat and NOT on the 21 surface (the DECL is the truth home)', () => {
    // The DECL-side fact the whole file leans on, pinned so a surface
    // change re-pins the arms deliberately (the purge §2.1 rows).
    expect((FROM_DECL.params ?? [])).toEqual(expect.arrayContaining([...BURNED_PAIR]))
    expect(TO_DECL.params ?? []).not.toContain('double_reference')
    expect(TO_DECL.params ?? []).not.toContain('use_stock_nodes')
    expect((FROM_DECL.defaults as Record<string, unknown>).double_reference).toBeDefined()
    expect((FROM_DECL.defaults as Record<string, unknown>).use_stock_nodes).toBeDefined()
  })
})
