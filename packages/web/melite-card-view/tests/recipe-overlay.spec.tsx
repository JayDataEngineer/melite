// @vitest-environment happy-dom
// recipe-overlay.spec.tsx — THE CARD-RECIPE LAYER'S DEATH
// CERTIFICATE + the surviving cascade walls (stroke 34).
//
// THE LAW (operator, 2026-09-14: "the recipe doesn't take into
// account models, so it makes bad parameters — you built it all
// wrong"): the card-recipe overlay is GONE. resolveValue is the
// honest three-plane merge (schema defaults <- model defaults <-
// served stamps <- user); no recipe key derives anything, no
// catalog exists, no select renders. One-click presets are FAMILY
// Recipe rows — macro pills that stamp their payload onto DECLARED
// keys (see model-axes.spec.tsx for the pill walls). These walls
// pin the resolution plane:
//
//  1. no recipe layering — a stray key rides inert, nothing moves;
//  2. presence still wins (the settings law, unchanged);
//  3. model_defaults + the served base keep their order (1:1 with
//     the engine's merge).
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { resolveValue, schemaEnvelope, seedUser, SpecForm, type FormSpecDoc, type SpecValues } from '../src/client/spec-form.tsx'

/** image-gen's stroke-34 shape: sampling fields, NO recipe field,
 *  NO catalog — the family rows are the only recipe concept. */
const GEN: FormSpecDoc = {
  form: 'image-gen',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, step: 1, extra: { group: 'sampling', wtype: 'number' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 4.5, step: 0.1, extra: { group: 'sampling' } } },
  }),
  model: 'krea-2',
  variants: [
    { id: 'realism', label: 'Realism', group: 'Recipe', defaults: { loras: [{ id: 'krea2_realism_lora' }] }, route: '', hint: 'the realism one-click' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

afterEach(cleanup)

// ── the pure resolution: the overlay leg is gone ────────────────────

test('stroke 34: a stray recipe key derives NOTHING — every visible value stands on its own layers', () => {
  const value = resolveValue(GEN, { recipe: 'fast_draft' } as SpecValues)
  expect(value['steps']).toBe(8) // the schema default — no overlay ever fires
  expect(value['cfg']).toBe(4.5)
  expect(value['negative_prompt']).toBeUndefined() // no derived negative
})

test('presence still wins — a hand-set value is never clobbered (unchanged law)', () => {
  const value = resolveValue(GEN, { steps: 8 })
  // steps 8 is EXPLICITLY the schema default's value — presence, not
  // value, marks the override
  expect(value['steps']).toBe(8)
})

test('the model_defaults layer sits under the user (the engine compose order, unchanged)', () => {
  const doc: FormSpecDoc = { ...GEN, model_defaults: { steps: 10, cfg: 5 } }
  const value = resolveValue(doc, {})
  expect(value['steps']).toBe(10)
  expect(value['cfg']).toBe(5)
  const owned = resolveValue(doc, { steps: 8 })
  expect(owned['steps']).toBe(8)
})

test('the SERVED BASE sits over model_defaults, under the user (the 1:1 law, unchanged)', () => {
  const doc: FormSpecDoc = { ...GEN, model_defaults: { steps: 10, cfg: 5 } }
  // the server's stamps replace the client's guesses
  const served = resolveValue(doc, {}, { steps: 52, cfg: 7 })
  expect(served['steps']).toBe(52)
  expect(served['cfg']).toBe(7)
  // presence still wins over everything
  const owned = resolveValue(doc, { steps: 8 }, { steps: 52 })
  expect(owned['steps']).toBe(8)
  // arrays ride the overlay filter, never the base
  const bag = resolveValue(doc, {}, { steps: 52, loras: ['a', 'b'] } as unknown as SpecValues)
  expect(bag['steps']).toBe(52)
  expect(bag['loras']).toBeUndefined()
})

// ── the heal: poisoned benches open clean ───────────────────────────

test('seedUser drops a held recipe key — the flush deletes it, the card composes again', () => {
  const healed = seedUser(GEN, { recipe: 'cinematic', steps: 20 })
  expect(healed['recipe']).toBeUndefined()
  expect(healed['steps']).toBe(20) // held truth rides untouched
})

// ── the rendered drill: no seat ─────────────────────────────────────

test('the drill renders NO recipe select — the dead layer has no face', () => {
  render(createElement(SpecForm, {
    spec: GEN,
    user: {},
    onSet: vi.fn(),
  }))
  expect(screen.queryByLabelText('Recipe')).toBeNull()
})
