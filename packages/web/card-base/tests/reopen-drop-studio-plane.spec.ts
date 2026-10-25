// @contract cards-reopen-drop-studio-plane
// reopen-drop-studio-plane.spec.ts — THE REOPEN DROP'S STUDIO
// SANCTION WALL. The 2026-11-12 ARM2 reopen clobber (five consistent
// lane drives): the drill's reopen carry drop judged the h3 doc's
// persisted `keyframes` pin dead carry — off the form's lane surface
// BY DESIGN, because the pin channel is a STUDIO tenant channel
// (DECL studio.writes), never a form knob — and flushed one silent
// `{keyframes: null}` at drill open; the studio's starter law then
// authored a fresh starter doc over the hole. The compose mirror had
// already been cured to sanction studio_writes (h¹, the mirror-truth
// cure in composeValidate); this heal was the second judge of the
// same surface and still judged the studio's own document plane a
// ghost. One truth, every seat: a key the DECL declares studio-owned
// never drops at reopen.
import { describe, expect, test } from 'vitest'
import { composeValidate, dropStaleReopenCarry, type FormSpecDoc, type SpecValues } from '../src/spec.ts'
import type { LaneContractRow } from '@melite/contracts/laneRelations'

/** The burn's shape: an h3-like card — lanes family base [prompt],
 *  one variant with no additions — carrying the DECL's studio.writes
 *  verbatim as the served spec's studio_writes (discovery.ts serves
 *  them 1:1). The keyframes channel is studio-owned; the form's
 *  surface does not declare it because the FORM never authors it. */
function studioSpec(): FormSpecDoc {
  return {
    model: 'film',
    label: null,
    form: 'form_film',
    params: ['prompt'],
    variants: [
      { id: 'timeline', label: 'Timeline', group: 'Variant', defaults: {}, route: 'film-timeline' },
    ],
    lanes: {
      base: ['prompt'],
      variants: { timeline: { params: [], cells: {} } },
    } as LaneContractRow,
    studio_writes: ['calls', 'keyframes', 'fps', 'seed', 'width', 'height'],
  }
}

describe('the reopen carry drop sanctions the studio-owned document plane (the DECL studio.writes truth)', () => {
  test('THE FLOOR — the fixture carries the burn shape: a studio channel off the lane surface, declared studio-owned', () => {
    const spec = studioSpec()
    expect(spec.studio_writes).toContain('keyframes')
    expect(spec.lanes?.base).not.toContain('keyframes')
  })

  test('THE RED — a persisted studio-owned pin NEVER drops at reopen (the ARM2 clobber verbatim: variant/quant/model + keyframes pin)', () => {
    const spec = studioSpec()
    const held: SpecValues = {
      model: 'film',
      variant: 'timeline',
      quant: 'int8',
      prompt: 'a single shot',
      keyframes: [{ image: 'data:image/png;base64,iVBOR…', frame: 0 }],
    }
    expect(dropStaleReopenCarry(spec, held), 'the pin channel is the studio tenant\'s own document plane — the DECL sanctions it at the write door').toEqual({})
  })

  test('THE TEETH — the same spec still drops a genuinely departed FORM key (an off-lane stamp no seat sanctions)', () => {
    const spec = studioSpec()
    const held: SpecValues = {
      model: 'film',
      variant: 'timeline',
      persona: 'gritty host',
      prompt: 'say it',
    }
    expect(dropStaleReopenCarry(spec, held)).toEqual({ persona: null })
  })

  test('THE NO-STUDIO TRUTH — a spec that declares NO studio keeps the legacy judgment verbatim (the drift is the DECL\'s to cure, never this heal\'s guess)', () => {
    const spec: FormSpecDoc = { ...studioSpec(), studio_writes: undefined }
    const held: SpecValues = {
      model: 'film',
      variant: 'timeline',
      prompt: 'say it',
      keyframes: [{ image: 'data:image/png;base64,iVBOR…', frame: 0 }],
    }
    expect(dropStaleReopenCarry(spec, held)).toEqual({ keyframes: null })
  })

  test('THE PARITY LAW — the two judges of the same surface agree: what the compose mirror sanctions (studio_writes) the reopen drop sanctions too', () => {
    const spec = studioSpec()
    const held: SpecValues = {
      model: 'film',
      variant: 'timeline',
      prompt: 'say it',
      calls: [{ text: 'a single shot', start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: 'data:image/png;base64,iVBOR…', frame: 0 }],
      seed: 42,
    }
    // the mirror refuses NOTHING the doc states
    expect(
      composeValidate(spec, held).filter((v) => ['calls', 'keyframes', 'seed'].includes(v.field ?? '')),
      'the mirror sanctions the studio plane (the h¹ cure)',
    ).toEqual([])
    // and the drop nulls NOTHING the mirror sanctions
    expect(dropStaleReopenCarry(spec, held)).toEqual({})
  })
})
