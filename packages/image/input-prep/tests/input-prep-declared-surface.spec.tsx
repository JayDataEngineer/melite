/**
 * input-prep-declared-surface — the card's THREE-PLANE AGREEMENT wall
 * (image-3d genres wave-2, §CURES-OWED 3, the scale-knob
 * disagreement): the studio rail, the card's declaration, and compose
 * must give the SAME answer for every transform knob, per media_type
 * arm. The burn this walls: the rail seated the scale knobs on the
 * audio arm while the declaration hid them (card.ts —
 * `visible_when: media_type=image`) and compose silently dropped them
 * (models-input actions.ts — the audio passthrough returns before any
 * ImageScale builds). Compose is the truth home: it does NOT honor
 * scale on audio, so the rail mirrors the declaration (component.tsx's
 * DECLARED SURFACE LAW). This wall pins the agreement so no plane can
 * move alone: a rail that seats a knob the declaration hides, a
 * declaration that admits a knob compose drops, or a compose that
 * honors a knob the rail hides all red here — each on its own
 * assertion.
 *
 * The second wall pins the run verb's flush (the merge-behavior arm
 * for the deleted JSON-merge deletion loop — component.tsx's bindRun
 * at audit time): the patch is the verbatim user layer. `edit` only
 * merges, so keys never leave the map; cleared knobs ride the card's
 * -1 unset grammar; no null (the merge-patch deletion domain the
 * deleted loop would have written) is ever synthesized. The loop was
 * audit-verified unreachable and deleted (db0d83a58); these arms keep
 * that deletion honest — a flush that drops keys or writes deletion
 * nulls reds here.
 */
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { createElement as h } from 'react'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { fieldVisible } from '@melite/card-base/spec'
import type { SpecField } from '@melite/card-base/spec'
import { InputPrepStudio } from '../src/ui/studio/component.tsx'

const IMG = 'data:image/png;base64,iVBORw0KGgo='

/** The scale face the three planes judge (the rail's scale knobs:
 * the two numeric seats and the resample-model select). */
const SCALE_KNOBS = ['scale_width', 'scale_height', 'scale_method'] as const
const MEDIA_ARMS = ['image', 'audio'] as const

/** Seated scale values inside every gate (≥ MIN_DIM, a declared
 * method) — compose honoring the face means THESE values ride. */
const SEATED_SCALE = { scale_width: 64, scale_height: 32, scale_method: 'bicubic' } as const

const DUMMY: ModelFacts = { id: 'x', family: 'input', card: 'x', defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never

let def: CardDefinition
beforeAll(async () => {
  def = (await loadCardDefs()).get('input-prep')!
  expect(def, 'the composition root serves the input-prep card').toBeTruthy()
})

afterEach(cleanup)

/** The DECL plane: the registered schema's own visible_when rule for
 * one knob (the tts card.spec walk — refs → object root → dict). */
function visibleWhenOf(knob: string): string | undefined {
  const json = (def.schema as unknown as {
    toJSON(): { refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { visible_when?: string } } }> }
  }).toJSON()
  const root = Object.values(json.refs).find((n) => n.type === 'object' && n.dict !== undefined)
  if (root?.dict === undefined) throw new Error('the registered schema serves no object root')
  const refId = root.dict[knob]
  if (refId === undefined) throw new Error(`the registered schema declares no '${knob}' knob`)
  return json.refs[refId]?.meta?.extra?.visible_when
}

/** The DECL rule judged by the form's own evaluator (card-base's
 * fieldVisible — the same function the bench drill renders with). */
function declSeats(knob: string, arm: string): boolean {
  const field = { name: knob, kind: 'text', group: '', required: false, visible_when: visibleWhenOf(knob) } as unknown as SpecField
  return fieldVisible(field, { media_type: arm })
}

/** The COMPOSE plane: the ImageScale node's inputs when a seated
 * scale face reaches the graph on this arm, null when compose drops
 * the face. */
function composeScaleFace(arm: string): Record<string, unknown> | null {
  const g = new GraphBuilder()
  def.compose(
    def.schema({ source: 'upload.png', media_type: arm, ...SEATED_SCALE }),
    DUMMY, g, `agreement_${arm}`,
  )
  const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>
  return Object.values(graph).find((n) => n.class_type === 'ImageScale')?.inputs ?? null
}

/** The RAIL plane: does the studio seat the scale knobs on this arm? */
function railSeatsScale(arm: string): boolean {
  render(h(InputPrepStudio, {
    stageId: 's_0',
    cardName: 'input-prep',
    row: {
      id: 's_0',
      card: 'input-prep',
      params: { source: arm === 'audio' ? 'x.wav' : 'x.png', media_type: arm, ...SEATED_SCALE },
    },
    runStatus: '',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
  } as never))
  return screen.queryByTestId('prep-scale-scale_width') !== null
}

describe('THE THREE-PLANE AGREEMENT (image-3d wave-2 cure 3): rail == declaration == compose, per media_type arm', () => {
  it.each(MEDIA_ARMS)('the %s arm: every scale knob gives the same verdict on all three planes', (arm) => {
    // THE COMPOSE PLANE first — compose is the truth home the cure
    // reads. Honored means HONORED: the seated values ride the node
    // verbatim, not merely tolerated.
    const honored = composeScaleFace(arm)
    if (honored !== null) {
      expect(honored['width']).toBe(SEATED_SCALE.scale_width)
      expect(honored['height']).toBe(SEATED_SCALE.scale_height)
      expect(honored['upscale_method']).toBe(SEATED_SCALE.scale_method)
    }
    // THE DECL PLANE: each knob's registered rule must agree with
    // compose — a knob the declaration hides while compose honors
    // (or vice versa) reds on its own line.
    for (const knob of SCALE_KNOBS) {
      expect(declSeats(knob, arm), `${knob}: the declaration must agree with compose on the ${arm} arm`)
        .toBe(honored !== null)
    }
    // THE RAIL PLANE: the studio seats the knob face exactly when the
    // other two planes seat it (the seat-decay burn: the rail alone
    // said yes on audio).
    expect(railSeatsScale(arm), `the rail must agree with the declaration and compose on the ${arm} arm`)
      .toBe(honored !== null)
  })

  it("the audio arm's compose drops a seated scale row without refusing (the pinned compose verdict — if compose ever honors scale on audio, this arm and the audio agreement arm both red and the declaration owes the knob, never the rail)", () => {
    const g = new GraphBuilder()
    expect(() => def.compose(
      def.schema({ source: 'speech.wav', media_type: 'audio', ...SEATED_SCALE }),
      DUMMY, g, 'audio_drop',
    )).not.toThrow()
    const graph = g.toJSON() as Record<string, { class_type: string }>
    expect(Object.values(graph).some((n) => n.class_type === 'ImageScale')).toBe(false)
    expect(Object.values(graph).some((n) => n.class_type === 'SaveAudio')).toBe(true)
  })
})

describe('THE FLUSH IS THE VERBATIM USER LAYER (the merge behavior unchanged without the deleted JSON-merge loop)', () => {
  function ownerWith(params: Record<string, unknown>, over: Record<string, unknown>) {
    return {
      stageId: 's_0',
      cardName: 'input-prep',
      row: { id: 's_0', card: 'input-prep', params },
      runStatus: '',
      onPatch: vi.fn(),
      onRun: vi.fn(),
      onStop: () => {},
      onRemove: () => {},
      onSurface: () => {},
      upstream: [],
      runId: null,
      ...over,
    } as never
  }

  it('the image arm: cleared knobs ride the -1 grammar — every key stays seated, no null is ever synthesized', () => {
    const onPatch = vi.fn()
    const bindRun = vi.fn()
    render(h(InputPrepStudio, ownerWith(
      { source: IMG, media_type: 'image', crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150, ...SEATED_SCALE },
      { onPatch, bindRun },
    )))
    act(() => { fireEvent.click(screen.getByTestId('prep-clear-crop')) })
    act(() => { fireEvent.click(screen.getByTestId('prep-clear-scale')) })
    const verb = bindRun.mock.calls[0][0] as () => void
    act(() => { verb() })
    expect(onPatch).toHaveBeenCalledTimes(1)
    // The WHOLE patch, deep-equal — not a slice: `edit` only merges, so
    // every key the user layer holds rides; unset rides the card's -1
    // grammar. A deletion null (the JSON-merge loop's domain) or any
    // synthesized key reds here.
    expect(onPatch.mock.calls[0][0]).toEqual({
      source: IMG,
      media_type: 'image',
      crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1,
      scale_width: -1, scale_height: -1,
      scale_method: 'bicubic',
    })
  })

  it('the audio arm: the flush is the frozen row verbatim (no rail to edit, nothing synthesized)', () => {
    const onPatch = vi.fn()
    const bindRun = vi.fn()
    render(h(InputPrepStudio, ownerWith(
      { source: 'x.wav', media_type: 'audio', ...SEATED_SCALE },
      { onPatch, bindRun },
    )))
    const verb = bindRun.mock.calls[0][0] as () => void
    act(() => { verb() })
    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onPatch.mock.calls[0][0]).toEqual({
      source: 'x.wav',
      media_type: 'audio',
      scale_width: 64, scale_height: 32, scale_method: 'bicubic',
    })
  })
})
