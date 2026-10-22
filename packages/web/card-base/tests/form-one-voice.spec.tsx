// form-one-voice.spec.tsx — THE ONE-VOICE LAW ON THE CARD FACE.
//
// The burn (operator, 2026-10-21): "I am honestly shocked you were
// able to sneak double rendering of errors on cards" — the same
// crime painted twice on one face. The lesion: CardForm renders TWO
// violation banners from OVERLAPPING judges with no cross-mute —
// the compose-gate banner (data-compose-gate, composeValidate: the
// mirror's "fires nothing on this lane" for keys no surface owns)
// and the lane banner (data-lane-warn, laneViolations: "stated
// fields the lane hides"). A stated knob the lane's surface neither
// declares nor renders fires BOTH: one crime, two rows, two
// spellings — the operator reads two errors where one truth lives.
//
// THE LAW: one crime, one row. For any rendered card face, the
// total violation rows naming a knob (across ALL alert seats —
// banners and field-level strips alike) is AT MOST ONE. The
// refusing authority is the compose gate (the door's mirror — its
// voice is the one the write refuses with); the lane strip stands
// down for any knob the gate already voices.
//
// Run: npx vitest run packages/web/card-base/tests/form-one-voice.spec.tsx
import { describe, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { CardForm } from '../src/form.tsx'
import type { FormSpecDoc, SchemaRef } from '@melite/contracts/formSpec'

/** A served doc: prompt (declared on the lane) + dead_knob (declared
 *  in the schema dict but on NO lane surface — the hidden-stated
 *  class). */
function doc(over: Partial<FormSpecDoc> = {}): FormSpecDoc {
  const refs: Record<number, SchemaRef> = {
    0: { type: 'object', dict: { prompt: 1, dead_knob: 2 } },
    1: { type: 'string', meta: { description: 'Prompt', required: true } },
    2: { type: 'string', meta: { description: 'Dead Knob' } },
  }
  return {
    form: 'txt2img',
    model: 'krea-2',
    schema: { uid: 0, refs },
    lanes: {
      base: ['prompt'],
    },
    ...over,
  }
}

function form(props: Partial<Parameters<typeof CardForm>[0]> = {}) {
  return render(h(CardForm, {
    spec: doc(props.spec),
    user: props.user ?? {},
    base: props.base,
    onSet: props.onSet ?? (() => {}),
    onUnset: props.onUnset ?? (() => {}),
    onPick: props.onPick ?? (() => {}),
  }))
}

/** Every violation row across every alert seat on the face. */
function violationRows(): HTMLElement[] {
  // the package lib is DOM without DOM.Iterable (src never spreads
  // collections) — Array.from is the identical read
  return Array.from(document.querySelectorAll<HTMLElement>('[role="alert"] p'))
    .filter((p) => p.textContent !== null && p.textContent !== '')
}

afterEach(cleanup)

describe('THE ONE-VOICE LAW: one crime, one row on the card face', () => {
  test('a stated knob the lane hides voices EXACTLY ONE row — never the gate banner AND the lane strip', () => {
    form({ user: { model: 'krea-2', dead_knob: 'a value the lane refuses' } })
    const rows = violationRows().filter((p) => (p.textContent ?? '').includes('dead_knob'))
    expect(rows.length).toBe(1)
  })

  test('the single row is the COMPOSE GATE\'s voice (the refusing authority — the same message the write door refuses with)', () => {
    form({ user: { model: 'krea-2', dead_knob: 'a value the lane refuses' } })
    const gate = document.querySelector('[data-compose-gate]')
    const lane = document.querySelector('[data-lane-warn]')
    expect(gate === null || lane === null).toBe(true)
  })

  test('a together HALF voices ZERO rows at the form (2026-11-11 ruling: halves save, the run press owns the complete pair)', () => {
    // re-derived from "the together pair fires once": the
    // frictionless-authoring ruling moved the together half out of
    // every write/form seat — dropAuthoringIncomplete is the one
    // spelling, so the form renders nothing for the half; the run
    // door refuses it strict
    form({
      spec: {
        form: 'txt2img',
        lanes: {
          base: ['prompt', 'notes'],
          relations: {
            together: [{
              fields: ['prompt', 'notes'],
              cure: 'the pair is all-or-nothing',
            }],
          },
        },
      },
      user: { model: 'krea-2', prompt: 'half the pair' },
    })
    const rows = violationRows().filter((p) => (p.textContent ?? '').includes('prompt') || (p.textContent ?? '').includes('notes'))
    expect(rows.length, 'no row for the half-stated pair at the form').toBe(0)
  })
})
