// lane-envelope.spec.ts — THE ROUTE ENVELOPE IS BOUNDS, the form's
// seat (2026-10-11, the operator's wall: "the entire point of the
// schema rework was so this was impossible by design"). The live
// proof it was broken: krea-2's turbo variant declares
// sampler_envelope cfg [1,2]; the family declares NO bounds; the
// form's inline gate read bounds only — it judged NOTHING while
// the compose door refused the write 300ms after the press ("THE
// WRITE DID NOT LAND — card_compose: stated cfg 3.5 is OUTSIDE the
// route envelope for variant 'turbo'"). The contract now projects
// the envelope into the served variant bounds (laneContractOf);
// this pin derives the lanes face through the SAME construction
// the estate serves, then holds the form's gate to the numbers the
// door refuses with — one truth end to end.
import { describe, expect, it } from 'vitest'
import { laneContractOf } from '@melite/contracts/laneRelations'
import { fieldsOf, laneBoundsFor, laneViolations, schemaEnvelope } from '../src/spec.ts'

// the krea-2 DECL shape VERBATIM: no declared surface (params
// undeclared — base rides absent), relations + envelope-only
// variants — served through the one construction the estate rides
const lanes = laneContractOf({
  relations: { required: [{ fields: ['prompt'], cure: 'write the prompt' }] },
  variants: [
    { id: 'turbo', sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
  ],
})

const envelopeDoc = {
  form: 'image-gen',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt' } },
    steps: { type: 'number', meta: { description: 'Steps' } },
    cfg: { type: 'number', meta: { description: 'Cfg' } },
  }),
  variants: [{ id: 'turbo', label: 'Turbo' }],
  // the form-spec doc serves ONE family's row (the doc is fetched
  // per card+family) — the same singular shape discovery.ts serves
  lanes,
} as never

describe('the route envelope is bounds — the form judges what the door refuses (schema-contract law)', () => {
  it('an envelope-only family serves its contract with base ABSENT (the krea-2 shape)', () => {
    expect(lanes.base).toBeUndefined()
    expect(lanes.relations).toBeDefined()
  })

  it('an envelope-only variant (the krea-2 shape) serves bounds — never a blind gate', () => {
    expect(laneBoundsFor(envelopeDoc, 'turbo')).toEqual({
      steps: { min: 4, max: 8 },
      cfg: { min: 1, max: 2 },
    })
  })

  it('a stated cfg 3.5 over turbo [1,2] fires UNDER the field while typing — impossible by design', () => {
    const fields = fieldsOf(envelopeDoc)
    const violations = laneViolations(
      envelopeDoc,
      fields,
      { variant: 'turbo', prompt: 'a cat', cfg: 3.5, steps: 6 },
    )
    expect(violations).toHaveLength(1)
    expect(violations[0]!.field).toBe('cfg')
    expect(violations[0]!.message).toMatch(/'cfg': 3\.5 is outside this lane's range \(1–2\)/)
  })

  it('an in-envelope state (cfg 1.5, steps 6) judges clean — the gate never blocks the legal', () => {
    const fields = fieldsOf(envelopeDoc)
    expect(laneViolations(envelopeDoc, fields, { variant: 'turbo', prompt: 'a cat', cfg: 1.5, steps: 6 })).toEqual([])
  })

  it('the family base (no variant picked) stays unjudged — the envelope belongs to the variant only', () => {
    expect(laneBoundsFor(envelopeDoc, null)).toBeNull()
  })
})
