// @contract cards-tts-surface-merge
// tts-gate-surface-merge.spec.ts — THE OPERATOR'S LOCKOUT WALLS
// (2026-11-09/10 burn, verbatim on the receipt): the compose gate
// refused 'voice' AND 'style_instruction' on the qwen3-tts card and
// the operator could not run TTS at all. Three walls on the three
// seams the gesture crosses:
//   D1 — the client compose mirror judged the FAMILY BASE surface
//        (the served `params`, discovery.ts:1035) and never folded
//        the resolved VARIANT's params (voice) nor the resolved
//        CELL's params (style_instruction) — while the estate write
//        door judges the merged surface (cardsRegistry.ts:1376,
//        laneSurfaceOf) and the engine node takes voice on every
//        lane (live /object_info: AudiocoreTTS optional `voice`).
//   D2 — the axis pick (variant AND quant) carried stated cell-
//        exclusive params across the switch (axisPickPatch reconciles
//        only sampler envelopes): the 1.7B→0.6B quant pick left
//        style_instruction stated and the gate refused the ghost the
//        estate's own laneMigrate would have dropped.
//   THE GESTURES (operator, verbatim): "A) PARAMETER SWITCH IS
//   BROKEN. B) VOICE CHANGE TO DEFAULT IS BROKEN." Every arm below
//   rides one of those two gestures on the REAL DECL.
//
// THE PRE-REGISTERED REDS (first run IS the receipt; the suite ran
// red on 2026-11-10 before the cure — /tmp/red-toggle-tts-gate.txt):
//   ARM 2/3/4 red: the mirror refused 'voice' on the 0.6B lane (the
//   family base does not name it). ARM 6/7/8 red: axisPickPatch
//   carried the ghost verbatim. GREEN on the cured tree; the cure
//   toggled out re-reds the same arms (the receipt's toggle proof).
import { describe, expect, test } from 'vitest'
import {
  axisPickPatch,
  composeValidate,
  type FormSpecDoc,
  type SpecValues,
} from '../../card-base/src/spec.ts'
import { laneContractOf, laneSurfaceOf } from '@melite/contracts/laneRelations'
import { specVariants } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { DECL } from '../../../models/qwen3-tts/src/index.ts'

/** THE SERVED SPEC, FOR REAL — the same projection the form-spec
 *  door serves for the tts card: the flat variant matrix
 *  (specVariants), the DECL's base params (discovery.ts:1035), and
 *  the lane contract (discovery.ts:1100 — laneContractOf verbatim).
 *  The family base ALONE is what the broken mirror judged; the lanes
 *  block is the truth it refused to read. */
function servedTtsSpec(): FormSpecDoc {
  return {
    model: DECL.id,
    label: null,
    form: 'form_tts',
    params: DECL.params,
    variants: specVariants(DECL, DECL.id),
    lanes: laneContractOf(DECL),
  }
}

/** The quant row for a cell pick (the axis the operator flipped). */
function quantRow(quant: string): FormSpecDoc['variants'] extends (infer R)[] | undefined ? R : never {
  const rows = servedTtsSpec().variants ?? []
  const row = rows.find((r) => r.group === 'Quant' && r.quant === quant)
  if (row === undefined) throw new Error(`fixture break: no served Quant row for ${quant}`)
  return row
}

/** The variant row for a variant pick. */
function variantRow(id: string): FormSpecDoc['variants'] extends (infer R)[] | undefined ? R : never {
  const rows = servedTtsSpec().variants ?? []
  const row = rows.find((r) => r.group === 'Variant' && r.id === id)
  if (row === undefined) throw new Error(`fixture break: no served Variant row for ${id}`)
  return row
}

const mirrorVoiceHits = (violations: ReturnType<typeof composeValidate>): string[] =>
  violations.filter((v) => v.field === 'voice').map((v) => v.message)
const mirrorStyleHits = (violations: ReturnType<typeof composeValidate>): string[] =>
  violations.filter((v) => v.field === 'style_instruction').map((v) => v.message)

describe('the tts gate walls (2026-11-09/10 lockout) — the mirror and the pick seam on the REAL qwen3-tts DECL', () => {
  test('THE SURFACE FLOOR — the DECL declares voice on BOTH customvoice cells and style_instruction on the 1.7B cell only (the arms cannot pass vacuously)', () => {
    const merged06 = laneSurfaceOf(DECL.params, ['voice'], undefined)
    expect(merged06, 'the merged 0.6B surface must name voice (the variant owns the persona picker at BOTH sizes)').toContain('voice')
    expect(merged06).not.toContain('style_instruction')
    const cell17 = DECL.variants.find((v) => v.id === 'customvoice')?.cells.find((c) => c.quant === '1_7b')
    expect(cell17?.params, 'the 1.7B cell declares the instruct input').toEqual(['style_instruction'])
    // THE ESTATE DOOR'S OWN CALL (cardsRegistry.ts:1376-1380): the
    // write door judges exactly this merged surface — the mirror must
    // agree with it or the studio refuses what the bench admits.
    const doorSurface = laneSurfaceOf(
      DECL.params,
      DECL.variants.find((v) => v.id === 'customvoice')?.params,
      DECL.variants.find((v) => v.id === 'customvoice')?.cells.find((c) => c.quant === '0_6b')?.params,
    )
    expect(doorSurface).toContain('voice')
  })

  test('ARM 2 (THE MIRROR HALF OF THE LOCKOUT) — a stated voice (vivian among the choices, never a seed since the no-default-voice ruling) composes on the 0.6B cell: the mirror admits the variant-declared voice', () => {
    const doc: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '0_6b',
      voice: 'vivian',
      text: 'the operator speaks again',
    }
    const violations = composeValidate(servedTtsSpec(), doc)
    expect(mirrorVoiceHits(violations), `the mirror refused the voice the variant declares:\n  ${mirrorVoiceHits(violations).join('\n  ')}`).toEqual([])
  })

  test('ARM 3 (GESTURE B, THE RED) — a CHANGED voice (not the default) composes on the 0.6B cell too: the pick, not the value, is the law', () => {
    const doc: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '0_6b',
      voice: 'ryan',
      text: 'a different persona, same small lane',
    }
    const violations = composeValidate(servedTtsSpec(), doc)
    expect(mirrorVoiceHits(violations)).toEqual([])
  })

  test('ARM 4 (THE CELL LAW HOLDS) — a stated style_instruction still refuses on the 0.6B cell, field-named for the affordance', () => {
    const doc: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '0_6b',
      voice: 'vivian',
      style_instruction: 'whisper, excited',
      text: 'styled text on the small lane',
    }
    const violations = composeValidate(servedTtsSpec(), doc)
    const hits = mirrorStyleHits(violations)
    expect(hits.length, 'the 0.6B cell declares no instruct input — the refusal keeps its teeth').toBeGreaterThan(0)
    const viol = violations.find((v) => v.field === 'style_instruction')
    expect(viol?.field, 'SD-7: the refusal names the field so the words can ACT').toBe('style_instruction')
  })

  test('ARM 5 — style_instruction composes on the 1.7B cell (the large cell owns it; the cure must not over-drop)', () => {
    const doc: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '1_7b',
      voice: 'vivian',
      style_instruction: 'immense excitement, laughing slightly',
      text: 'styled text on the large lane',
    }
    const violations = composeValidate(servedTtsSpec(), doc)
    expect(mirrorStyleHits(violations)).toEqual([])
    expect(mirrorVoiceHits(violations)).toEqual([])
  })

  test('ARM 6 (GESTURE A, THE RED) — the QUANT pick 1.7B→0.6B drops the stated cell-exclusive style_instruction (the carry seam)', () => {
    const held: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '1_7b',
      voice: 'vivian',
      style_instruction: 'stated on the large cell',
      text: 'carry me across the size switch',
    }
    const patch = axisPickPatch(servedTtsSpec(), quantRow('0_6b'), held)
    expect(patch['quant'], 'the pick stamps the raw coordinate the door judges').toBe('0_6b')
    expect(patch['style_instruction'], `the ghost rode the pick verbatim: ${JSON.stringify(patch['style_instruction'])} — the pick must null the carry the resolved cell does not declare (absent is not the unset law's null)`).toBeNull()
  })

  test('ARM 7 (GESTURE A, GUARD) — the same pick never nulls what the 0.6B lane declares (voice, text, sampling)', () => {
    const held: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '1_7b',
      voice: 'vivian',
      temperature: 0.05,
      style_instruction: 'stated on the large cell',
      text: 'carry me across the size switch',
    }
    const patch = axisPickPatch(servedTtsSpec(), quantRow('0_6b'), held)
    expect(patch, 'voice is declared at both sizes — never carry').not.toHaveProperty('voice')
    expect(patch, 'text is family base — never carry').not.toHaveProperty('text')
    expect(patch, 'temperature is family base — never carry').not.toHaveProperty('temperature')
  })

  test('ARM 8 (GESTURE A, THE VARIANT PICK) — customvoice→Base drops the stated persona AND instruct; Base→customvoice re-seeds clean', () => {
    const held: SpecValues = {
      model: DECL.id,
      variant: 'customvoice',
      quant: '1_7b',
      voice: 'ryan',
      style_instruction: 'stated on the large cell — legal there',
      text: 'switch the flavor',
    }
    const toBase = axisPickPatch(servedTtsSpec(), variantRow('base'), held)
    expect(toBase['voice'], 'the clone lane takes no persona — the stated voice nulls at the pick (the resurrect cure, client half)').toBeNull()
    expect(toBase['style_instruction']).toBeNull()
    // the compose after the drop is clean: the null mark consumes at
    // the candidate (composeCandidateDoc's unset law — the consumed
    // key is ABSENT, never a null or undefined rider)
    const candidate: SpecValues = { ...held, ...toBase }
    delete candidate.voice
    delete candidate.style_instruction
    const after = composeValidate(servedTtsSpec(), candidate)
    expect(after.filter((v) => v.field === 'voice' || v.field === 'style_instruction')).toEqual([])
  })
})
