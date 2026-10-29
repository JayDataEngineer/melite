// deliverable-size-mirror.spec.ts — THE DELIVERABLE-SIZE MIRROR
// WALL (the resize order, operator 2026-11-12): the client face of
// the surfaced deliverable. The image-edit card serves width/height
// visible under its match_input_resolution toggle AND every edit
// lane surfaces them as run params (the kit's ImageScale tail
// consumes the lawful pair) — so the form gate and the compose
// mirror judge the pair's VALUES with the shared size law, exactly
// as the bench write door does, while the reopen heal keeps the
// persisted pair through the GENERIC surface seat (no carve: a
// surfaced key is kept, a ghost still nulls). Each arm below reds
// with the size law toggled out (the surface admits, so the flip
// voice goes silent and the unlawful pair passes).
import { describe, expect, test } from 'vitest'
import {
  composeValidate,
  dropStaleReopenCarry,
  fieldsOf,
  laneViolations,
  type FormSpecDoc,
  type SpecValues,
} from '../src/spec.ts'
import type { LaneContractRow } from '@melite/contracts/laneRelations'

/** An image-edit-shaped served spec: the schema serves the toggle
 *  + both axes, and the lane surface OWNS the pair (surfaced run
 *  params — the resize order's final shape). */
function editSpec(): FormSpecDoc {
  const refs = {
    0: { type: 'object', dict: { prompt: 1, match_input_resolution: 2, width: 3, height: 4 } },
    1: { type: 'string', meta: { description: 'Prompt' } },
    2: { type: 'boolean', meta: { description: 'Match Input Resolution' } },
    3: { type: 'number', meta: { description: 'Width' } },
    4: { type: 'number', meta: { description: 'Height' } },
  }
  return {
    form: 'image-edit',
    model: 'qwen-img-edit-21',
    label: null,
    schema: { uid: 0, refs },
    variants: [],
    lanes: { base: ['prompt', 'match_input_resolution', 'width', 'height'] },
  } as unknown as FormSpecDoc
}

const hits = (violations: Array<{ field?: string }>, field: string): number =>
  violations.filter((v) => v.field === field).length

describe('THE FORM GATE judges the deliverable values (laneViolations)', () => {
  test('THE FLOOR — the fixture serves the toggle and the pair, and the surface owns the pair', () => {
    const spec = editSpec()
    expect(fieldsOf(spec).map((f) => f.name).sort()).toEqual(
      ['height', 'match_input_resolution', 'prompt', 'width'],
    )
    expect(spec.lanes).toMatchObject({ base: ['prompt', 'match_input_resolution', 'width', 'height'] })
  })

  test('match OFF + both axes voices nothing (the lawful resize types clean)', () => {
    const spec = editSpec()
    const out = laneViolations(spec, fieldsOf(spec), {
      match_input_resolution: false,
      width: 832,
      height: 1216,
    })
    expect(out, `the form flagged the lawful pair:\n${out.map((v) => v.message).join('\n')}`).toEqual([])
  })

  test('match OFF with neither axis voices nothing (flip-then-type)', () => {
    const spec = editSpec()
    expect(laneViolations(spec, fieldsOf(spec), { match_input_resolution: false })).toEqual([])
  })

  test('match ON + a stated axis refuses with the flip (never the surface echo)', () => {
    const spec = editSpec()
    const out = laneViolations(spec, fieldsOf(spec), { width: 1024, height: 768 })
    expect(hits(out, 'width')).toBe(1)
    expect(out[0]?.message ?? '').toContain('flip match_input_resolution to false')
    expect(out[0]?.message ?? '').not.toContain('fires nothing on this lane')
  })

  test('a half pair under OFF refuses with the state-both voice', () => {
    const spec = editSpec()
    const out = laneViolations(spec, fieldsOf(spec), { match_input_resolution: false, width: 1024 })
    expect(hits(out, 'width')).toBe(1)
    expect(out[0]?.message ?? '').toContain('state both width and height')
  })
})

describe('THE COMPOSE MIRROR judges the deliverable values (composeValidate)', () => {
  test('match OFF + both axes composes (no width voice before the wire)', () => {
    const doc: SpecValues = {
      model: 'qwen-img-edit-21',
      prompt: 'make it night',
      match_input_resolution: false,
      width: 832,
      height: 1216,
    }
    const out = composeValidate(editSpec(), doc)
    expect(hits(out, 'width')).toBe(0)
    expect(hits(out, 'height')).toBe(0)
  })

  test('match ON + stated refuses EXACTLY once, with the flip in the mirror voice', () => {
    const doc: SpecValues = { model: 'qwen-img-edit-21', prompt: 'make it night', width: 1024, height: 768 }
    const out = composeValidate(editSpec(), doc)
    expect(hits(out, 'width')).toBe(1)
    const voice = out.find((v) => v.field === 'width')?.message ?? ''
    expect(voice).toContain('card_compose: ')
    expect(voice).toContain('flip match_input_resolution to false')
    expect(voice).not.toContain('does not declare it')
  })

  test('a key no lane declares still refuses (the mirror keeps its departed-surface teeth)', () => {
    const doc: SpecValues = {
      model: 'qwen-img-edit-21',
      prompt: 'make it night',
      match_input_resolution: false,
      width: 832,
      height: 1216,
      frobnicate: 1,
    }
    const out = composeValidate(editSpec(), doc)
    expect(hits(out, 'frobnicate')).toBe(1)
    expect(hits(out, 'width')).toBe(0)
  })
})

describe('THE REOPEN HEAL keeps the persisted deliverable (dropStaleReopenCarry)', () => {
  test('a persisted Match-OFF pair is sanctioned surface (the reopen keeps the numbers)', () => {
    const held: SpecValues = {
      model: 'qwen-img-edit-21',
      prompt: 'make it night',
      match_input_resolution: false,
      width: 832,
      height: 1216,
    }
    expect(dropStaleReopenCarry(editSpec(), held)).toEqual({})
  })

  test('an ON doc carrying a stale pair keeps it surfaced — the GATE voices the flip (never a silent null)', () => {
    // No carve: the pair is surfaced, so the heal keeps it like any
    // knob; the form gate refuses the ON + stated state field-named
    // with the fix (the strip names the hidden carried value — the
    // user flips the toggle, the numbers appear).
    const held: SpecValues = {
      model: 'qwen-img-edit-21',
      prompt: 'make it night',
      match_input_resolution: true,
      width: 1024,
      height: 768,
    }
    expect(dropStaleReopenCarry(editSpec(), held)).toEqual({})
    const gate = laneViolations(editSpec(), fieldsOf(editSpec()), held)
    expect(hits(gate, 'width')).toBe(1)
    expect(gate[0]?.message ?? '').toContain('flip match_input_resolution to false')
  })

  test('a ghost key still nulls under the kept pair (the heal keeps its teeth)', () => {
    const held: SpecValues = {
      model: 'qwen-img-edit-21',
      prompt: 'make it night',
      match_input_resolution: false,
      width: 832,
      height: 1216,
      ghost: 'stale',
    }
    expect(dropStaleReopenCarry(editSpec(), held)).toEqual({ ghost: null })
  })
})
