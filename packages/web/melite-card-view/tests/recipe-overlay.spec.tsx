// @vitest-environment happy-dom
/**
 * recipe-overlay.spec.tsx — THE VISIBLE RECIPE LAW (operator
 * 2026-09-14: "when I do dropdown there, it should change
 * parameters"). The run-time cascade already layered the card
 * recipe under explicit values (the engine's applyRecipe) — but the
 * client never SAW the catalog, so the recipe dropdown stored a key
 * with no visible effect (and anything touched silently outranked
 * it). Now the form-spec serves the catalog (`recipes`), and
 * picking the dropdown stamps the overlay into the VISIBLE fields —
 * the same cascade, mirrored: a recipe fills a param when it is
 * recipe-owned, missing, or still at the field default; a value the
 * user set wins and is never clobbered; stale stamps from a
 * previous recipe lift back to the field default.
 *
 * Cover: the pure pick patch (stamp / manual-wins / switch-lifts /
 * re-pick / unknown-key) and the rendered drill (the Steps input
 * MOVES when the dropdown moves; a hand-set Steps survives the
 * switch; switching recipes moves owned keys).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement, type ReactElement } from 'react'

import {
  recipePickPatch,
  SpecForm,
  type FormSpecDoc,
  type SpecValues,
} from '../src/client/spec-form.tsx'

/** image-gen's shape: sampling fields + the card-owned recipe field
 *  + the served catalog (no matrix — the axes are pinned elsewhere). */
const STAMP: FormSpecDoc = {
  form: 'image-gen',
  fields: [
    { name: 'prompt', label: 'Prompt', type: 'textarea', group: 'prompt' },
    { name: 'steps', label: 'Steps', type: 'number', default: 8, group: 'sampling' },
    { name: 'cfg', label: 'CFG', type: 'slider', default: 4.5, group: 'sampling' },
    { name: 'negative_prompt', label: 'Negative Prompt', type: 'textarea', group: 'prompt' },
    { name: 'recipe', label: 'Recipe', type: 'select', default: 'standard', group: 'sampling', options: ['standard', 'fast_draft', 'cinematic'] },
  ],
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

const DEFAULTS = { prompt: '', steps: 8, cfg: 4.5, recipe: 'standard' } as SpecValues

afterEach(cleanup)

// ── the pure pick patch ─────────────────────────────────────────────

test('a pick stamps the overlay onto untouched fields + owns them', () => {
  const { patch, owned } = recipePickPatch(STAMP, 'fast_draft', { ...DEFAULTS }, {})
  expect(patch).toEqual({ recipe: 'fast_draft', steps: 6, cfg: 3.5 })
  expect(owned).toEqual({ steps: 'fast_draft', cfg: 'fast_draft' })
})

test('a value the user set wins — never clobbered by the pick', () => {
  const { patch, owned } = recipePickPatch(
    STAMP, 'cinematic', { ...DEFAULTS, steps: 20, negative_prompt: 'blurry' }, {},
  )
  // steps + negative_prompt are the user's: only cfg stamps
  expect(patch).toEqual({ recipe: 'cinematic', cfg: 6 })
  expect(owned).toEqual({ cfg: 'cinematic' })
})

test('switching recipes moves owned keys; stale stamps lift to the field default', () => {
  // cinematic stamped steps/cfg/negative_prompt this session
  const first = recipePickPatch(STAMP, 'cinematic', { ...DEFAULTS },
    {})
  expect(first.patch['negative_prompt']).toBe('flat lighting, low contrast, snapshot')
  // …then the pick moves to fast_draft: shared keys re-stamp,
  // negative_prompt (owned by cinematic, undefined by fast_draft)
  // lifts — the field declares no default, so the honest empty
  const second = recipePickPatch(STAMP, 'fast_draft',
    { ...DEFAULTS, steps: 12, cfg: 6, negative_prompt: 'flat lighting, low contrast, snapshot' },
    first.owned)
  expect(second.patch).toEqual({ recipe: 'fast_draft', steps: 6, cfg: 3.5, negative_prompt: '' })
  expect(second.owned).toEqual({ steps: 'fast_draft', cfg: 'fast_draft' })
})

test('switching back to standard lifts every stamp (standard IS the schema defaults)', () => {
  const first = recipePickPatch(STAMP, 'cinematic', { ...DEFAULTS }, {})
  const back = recipePickPatch(STAMP, 'standard',
    { ...DEFAULTS, steps: 12, cfg: 6, negative_prompt: 'flat lighting, low contrast, snapshot' },
    first.owned)
  expect(back.patch).toEqual({ recipe: 'standard', steps: 8, cfg: 4.5, negative_prompt: '' })
  expect(back.owned).toEqual({})
})

test('re-picking the same recipe re-stamps idempotently; a manual edit between picks wins', () => {
  const first = recipePickPatch(STAMP, 'fast_draft', { ...DEFAULTS }, {})
  // the user hand-sets steps 20 after the stamp (the wrapper
  // un-owns on manual edits — modeled here by dropping the ledger row)
  const owned = { ...first.owned }
  delete owned['steps']
  const second = recipePickPatch(STAMP, 'fast_draft', { ...DEFAULTS, steps: 20 }, owned)
  expect(second.patch).toEqual({ recipe: 'fast_draft', cfg: 3.5 })
})

// ── the rendered drill ──────────────────────────────────────────────

function mount(initial: SpecValues): { state: { values: SpecValues } } {
  const state = { values: initial }
  // the drill is controlled — every edit re-renders with the new
  // values (multi-step picks read live fields, like the real drill)
  let root: ReturnType<typeof render>
  const ui = (): ReactElement => createElement(SpecForm, {
    spec: STAMP,
    fields: STAMP.fields,
    values: state.values,
    onEdit: (name: string, v: unknown): void => {
      state.values = { ...state.values, [name]: v }
      root.rerender(ui())
    },
  })
  root = render(ui())
  return { state }
}

test('the Steps input MOVES when the recipe dropdown moves (the operator\'s ask)', async () => {
  const { state } = mount({ ...DEFAULTS })
  expect((screen.getByDisplayValue('8') as HTMLInputElement).value).toBe('8')
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'fast_draft' } })
  await waitFor(() => { expect(state.values['steps']).toBe(6) })
  expect((screen.getByDisplayValue('6') as HTMLInputElement).value).toBe('6')
  expect(state.values['cfg']).toBe(3.5)
  expect(state.values['recipe']).toBe('fast_draft')
})

test('a hand-set Steps survives the recipe switch; the rest still stamps', async () => {
  const { state } = mount({ ...DEFAULTS })
  fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '20' } })
  await waitFor(() => { expect(state.values['steps']).toBe('20') })
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'cinematic' } })
  await waitFor(() => { expect(state.values['cfg']).toBe(6) })
  // the user's 20 stands; the recipe's 12 never lands
  expect(state.values['steps']).toBe('20')
  expect(state.values['negative_prompt']).toBe('flat lighting, low contrast, snapshot')
})

test('switching recipes in the drill moves owned keys (cinematic → fast_draft)', async () => {
  const { state } = mount({ ...DEFAULTS })
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'cinematic' } })
  await waitFor(() => { expect(state.values['steps']).toBe(12) })
  fireEvent.change(screen.getByLabelText('Recipe'), { target: { value: 'fast_draft' } })
  await waitFor(() => { expect(state.values['steps']).toBe(6) })
  expect(state.values['cfg']).toBe(3.5)
  // fast_draft defines no negative prompt — the cinematic stamp lifts
  expect(state.values['negative_prompt']).toBe('')
})
