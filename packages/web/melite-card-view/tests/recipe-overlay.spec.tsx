// @vitest-environment happy-dom
/**
 * recipe-overlay.spec.tsx — THE VISIBLE RECIPE LAW, REBORN ON THE
 * LAYERED MODEL (the parameter audit, 2026-09-14). The operator's
 * ask stands: "when I do dropdown there, it should change
 * parameters." The MECHANISM is the settings law now: picking the
 * recipe sets ONE key (`recipe`); every recipe param DERIVES through
 * resolveValue (schema defaults <- model defaults <- recipe <- user)
 * — the engine's compose cascade mirrored. No stamp ledger, no
 * value-compare heuristics: a value the user SET wins by presence
 * (the reset chips retired hour-26 — the unset path is the
 * tri-state's native undefined); switching recipes re-derives every
 * derived key; stale stamps cannot exist (nothing is stamped).
 *
 * Cover: the pure resolution (layering order, manual-wins-by-
 * presence, recipe-switch re-derives, default recipe at rest) and
 * the rendered drill (the Steps input MOVES when the dropdown
 * moves; a hand-set Steps survives the switch; switching recipes
 * moves derived keys).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement, type ReactElement } from 'react'

import {
  resolveValue,
  schemaEnvelope,
  SpecForm,
  type FormSpecDoc,
  type SpecValues,
} from '../src/client/spec-form.tsx'

/** image-gen's shape: sampling fields + the card-owned recipe field
 *  + the served catalog (no matrix — the axes are pinned elsewhere). */
const STAMP: FormSpecDoc = {
  form: 'image-gen',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, step: 1, extra: { group: 'sampling', wtype: 'number' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 4.5, step: 0.1, extra: { group: 'sampling' } } },
    recipe: {
      consts: ['standard', 'fast_draft', 'cinematic'],
      meta: { description: 'Recipe', default: 'standard', extra: { group: 'sampling' } },
    },
  }),
  model: 'krea-2',
  recipes: {
    standard: { label: 'Standard', description: 'The schema defaults as authored — no overlay.', params: {} },
    fast_draft: { label: 'Fast Draft', description: 'Quick low-step iteration.', params: { steps: 6, cfg: 3.5 } },
    cinematic: {
      label: 'Cinematic', description: 'Moody rendering.',
      params: { steps: 12, cfg: 6, negative_prompt: 'flat lighting, low contrast, snapshot' },
    },
  },
  variants: [],
}

afterEach(cleanup)

// ── the pure resolution ─────────────────────────────────────────────

test('a pick derives the overlay onto untouched fields — the ONE key rides the user layer', () => {
  // the pick wrote exactly one key; everything else derives
  const value = resolveValue(STAMP, { recipe: 'fast_draft' })
  expect(value['steps']).toBe(6)
  expect(value['cfg']).toBe(3.5)
  expect(value['recipe']).toBe('fast_draft')
})

test('a value the user set wins BY PRESENCE — never value-compared, never clobbered', () => {
  const value = resolveValue(STAMP, { recipe: 'cinematic', steps: 8 })
  // steps 8 is EXPLICITLY the schema default's value — presence, not
  // value, marks the override: the recipe's 12 never lands
  expect(value['steps']).toBe(8)
  expect(value['cfg']).toBe(6)
})

test('switching recipes re-derives every derived key; nothing stamps, nothing goes stale', () => {
  const cinematic = resolveValue(STAMP, { recipe: 'cinematic' })
  expect(cinematic['negative_prompt']).toBe('flat lighting, low contrast, snapshot')
  const fast = resolveValue(STAMP, { recipe: 'fast_draft' })
  // fast_draft defines no negative — the field declares no default,
  // so the honest undefined (renders empty)
  expect(fast['negative_prompt']).toBeUndefined()
  expect(fast['steps']).toBe(6)
})

test('at rest (no recipe key) the declared default recipe derives — the same cascade', () => {
  const value = resolveValue(STAMP, {})
  expect(value['recipe']).toBe('standard')
  expect(value['steps']).toBe(8)
})

test('the model_defaults layer sits UNDER the recipe (the engine compose order)', () => {
  const doc: FormSpecDoc = {
    ...STAMP,
    model_defaults: { steps: 10, cfg: 5 },
  }
  const value = resolveValue(doc, {})
  expect(value['steps']).toBe(10)
  expect(value['cfg']).toBe(5)
  const picked = resolveValue(doc, { recipe: 'fast_draft' })
  expect(picked['steps']).toBe(6)
  expect(picked['cfg']).toBe(3.5)
})

test('the SERVED BASE sits over model_defaults, under the recipe and the user (the 1:1 law)', () => {
  const doc: FormSpecDoc = {
    ...STAMP,
    model_defaults: { steps: 10, cfg: 5 },
  }
  // the server's stamps replace the client's guesses
  const served = resolveValue(doc, {}, { steps: 52, cfg: 7 })
  expect(served['steps']).toBe(52)
  expect(served['cfg']).toBe(7)
  // the recipe still overlays the served base (compose order)
  const picked = resolveValue(doc, { recipe: 'fast_draft' }, { steps: 52, cfg: 7 })
  expect(picked['steps']).toBe(6)
  // presence still wins over everything
  const owned = resolveValue(doc, { steps: 8 }, { steps: 52 })
  expect(owned['steps']).toBe(8)
  // the stamped recipe key wins when the user never touched it
  const stamped = resolveValue(doc, {}, { recipe: 'cinematic' })
  expect(stamped['steps']).toBe(12)
  expect(stamped['cfg']).toBe(6)
  // arrays ride the overlay filter, never the base
  const bag = resolveValue(doc, {}, { steps: 52, loras: ['a', 'b'] } as unknown as SpecValues)
  expect(bag['steps']).toBe(52)
  expect(bag['loras']).toBeUndefined()
})

// ── the rendered drill ──────────────────────────────────────────────

function mount(initial: SpecValues): { state: { user: SpecValues } } {
  const state = { user: initial }
  // the drill is controlled — every edit re-renders with the new
  // user layer (multi-step picks read live fields, like the real drill)
  let root: ReturnType<typeof render>
  const ui = (): ReactElement => createElement(SpecForm, {
    spec: STAMP,
    user: state.user,
    onSet: (name: string, v: unknown): void => {
      state.user = { ...state.user, [name]: v }
      root.rerender(ui())
    },
  })
  root = render(ui())
  return { state }
}

test("the Steps input MOVES when the recipe dropdown moves (the operator's ask)", async () => {
  const { state } = mount({})
  expect((screen.getByDisplayValue('8') as HTMLInputElement).value).toBe('8')
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'fast_draft' } })
  await waitFor(() => { expect(state.user['recipe']).toBe('fast_draft') })
  expect((screen.getByDisplayValue('6') as HTMLInputElement).value).toBe('6')
  // the derived cfg composes the recipe's 3.5 (the slider's backing
  // value — happy-dom's range input does not mirror the property, so
  // the resolved map is the evidence)
  expect(resolveValue(STAMP, state.user)['cfg']).toBe(3.5)
})

test('a hand-set Steps survives the recipe switch; the rest still derives', async () => {
  const { state } = mount({})
  fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '20' } })
  await waitFor(() => { expect(state.user['steps']).toBe(20) })
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'cinematic' } })
  await waitFor(() => { expect(resolveValue(STAMP, state.user)['cfg']).toBe(6) })
  // the user's 20 stands (presence wins); the recipe's 12 never lands
  expect(state.user['steps']).toBe(20)
  expect((screen.getByDisplayValue('20') as HTMLInputElement).value).toBe('20')
  // the recipe's negative derives into the visible field
  expect((screen.getByLabelText('Negative Prompt') as HTMLTextAreaElement).value)
    .toBe('flat lighting, low contrast, snapshot')
})

test('switching recipes in the drill moves derived keys (cinematic → fast_draft)', async () => {
  const { state } = mount({})
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'cinematic' } })
  await waitFor(() => { expect((screen.getByDisplayValue('12') as HTMLInputElement).value).toBe('12') })
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'fast_draft' } })
  await waitFor(() => { expect((screen.getByDisplayValue('6') as HTMLInputElement).value).toBe('6') })
  // fast_draft defines no negative prompt — the cinematic value lifts
  expect((screen.getByLabelText('Negative Prompt') as HTMLTextAreaElement).value).toBe('')
})
