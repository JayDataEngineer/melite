// @vitest-environment happy-dom
/**
 * seed-dice.spec.tsx — STROKE 39 (the operator's QOL law: "For the
 * Seed field, there should be a dice icon to the top right, across
 * from 'Seed' name. This dice icon should have 'filled' state and
 * unfilled state. When we click, it will toggle state. When it is
 * filled in, there is a random seed every time").
 *
 * The dice rides the seed knob's key line (name left, dice right).
 * The state DERIVES from the resolved value alone — filled ⇔ the
 * GATE S sentinel (-1: the lane mints a fresh seed every run); no
 * hidden mode, no drift. The click writes the value: fixed → -1
 * (random), random → a minted concrete int (the kit's own mint
 * law). The input never paints the sentinel — random shows the
 * placeholder. Typing a number while random fixes it; the dice
 * unfills by derivation.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement } from 'react'

import { schemaEnvelope, CardForm, type FormSpecDoc } from '@melite/card-base/client'

afterEach(cleanup)

/** image-gen's serving shape: a seed knob (type seed) + ordinary
 *  number knobs (width/steps) that must NEVER carry the dice.
 *  FLATTENED to one panel (stroke 89): these tests pin DICE
 *  mechanics across fields — under the parameter submenu law the
 *  groups would seat behind tabs; the submenu's own law is pinned
 *  in card-base's form-card spec. */
const DICE: FormSpecDoc = {
  form: 'image-gen-shape',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
    seed: { type: 'seed', meta: { description: 'Seed', default: -1, extra: {} } },
    width: { type: 'number', meta: { description: 'Width', default: 1024, extra: {} } },
    steps: { type: 'number', meta: { description: 'Steps', default: 30, extra: {} } },
  }),
  model: 'krea-2',
}

function mount(onSet: (n: string, v: unknown) => void, user: Record<string, unknown> = {}): HTMLElement {
  const { container } = render(createElement(CardForm, { spec: DICE, user, onSet, onPick: () => {} }))
  return container
}

test('THE SEAT: the dice rides the SEED key line only — name left, dice right, never on width/steps', () => {
  const container = mount(() => {})
  const dice = container.querySelectorAll('[data-seed-dice]')
  expect(dice.length).toBe(1) // seed carries it; width/steps never do
  // across from the name: the dice sits INSIDE the seed row's header
  const head = dice[0]?.parentElement
  expect(head?.textContent).toContain('Seed')
})

test('THE DEFAULT STATE: the served sentinel (-1 = random) renders FILLED, and the input never paints -1', () => {
  const container = mount(() => {})
  const dice = container.querySelector('[data-seed-dice]') as HTMLElement
  expect(dice.getAttribute('data-seed-dice')).toBe('random')
  expect(dice.getAttribute('aria-pressed')).toBe('true')
  // the sentinel never paints: the input is EMPTY with the random
  // placeholder — the dice carries the state's face
  const input = screen.getByLabelText('Seed') as HTMLInputElement
  expect(input.value).toBe('')
  expect(input.placeholder).toContain('random')
})

test('THE TOGGLE, fixed → random: a concrete seed dice is HOLLOW; the click writes the -1 sentinel', () => {
  const sets: Array<[string, unknown]> = []
  const container = mount((n, v) => { sets.push([n, v]) }, { seed: 3445 })
  const dice = container.querySelector('[data-seed-dice]') as HTMLElement
  expect(dice.getAttribute('data-seed-dice')).toBe('fixed')
  expect(dice.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(dice)
  expect(sets).toContainEqual(['seed', -1])
})

test('THE TOGGLE, random → fixed: the click MINTS a concrete int (the kit mint law) — never the sentinel back', () => {
  const sets: Array<[string, unknown]> = []
  const container = mount((n, v) => { sets.push([n, v]) }, { seed: -1 })
  const dice = container.querySelector('[data-seed-dice]') as HTMLElement
  expect(dice.getAttribute('data-seed-dice')).toBe('random')
  fireEvent.click(dice)
  const minted = sets.find(([n]) => n === 'seed')?.[1]
  expect(typeof minted).toBe('number')
  expect(Number.isInteger(minted as number)).toBe(true)
  expect(minted as number).toBeGreaterThanOrEqual(0)
  expect(minted as number).toBeLessThan(2147483647)
})

test('TYPING FIXES: a number typed while random flips the dice hollow by DERIVATION (one source of truth)', async () => {
  const holder: { user: Record<string, unknown> } = { user: { seed: -1 } }
  const { container } = render(createElement(CardForm, {
    spec: DICE,
    user: holder.user,
    onSet: (n, v) => { holder.user = { ...holder.user, [n]: v } },
    onPick: () => {},
  }))
  expect((container.querySelector('[data-seed-dice]') as HTMLElement).getAttribute('data-seed-dice')).toBe('random')
  // the user layer now holds a concrete seed (what typing lands after
  // coerceFieldEdit) — re-render derives the hollow dice
  const { container: next } = render(createElement(CardForm, {
    spec: DICE,
    user: { ...holder.user, seed: 9127 },
    onSet: () => {},
    onPick: () => {},
  }))
  const dice = next.querySelector('[data-seed-dice]') as HTMLElement
  expect(dice.getAttribute('data-seed-dice')).toBe('fixed')
  const input = next.querySelector('input[aria-label="Seed"]') as HTMLInputElement
  expect(input.value).toBe('9127')
  await waitFor(() => {})
})
