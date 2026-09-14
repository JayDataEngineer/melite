// @vitest-environment happy-dom
/**
 * THE MODEL AXES (the pass-along law, 2026-09-12 — operator order:
 * "the card-ui package is supposed to pass along the model, variant,
 * and quant fields"): the spec ROOT's `variants` matrix renders as
 * Model/Variant/Quant selects ABOVE the parameters (the old
 * flowAxisRows law), picks apply the row's defaults overlay, and the
 * run composes the held `model` as the {model:} door's family.
 *
 * Cover: the pure projections (the owner chain, modelChoices dedup,
 * active detection, the pick patch, the first-declared seed), the
 * rendered axes (aria-labels above the fields, a Raw pick applies
 * model/steps/cfg + durable variant/quant keys), and runCardStage's
 * model pass-along (held model rides the door; default family only
 * as the resting value).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement, useState } from 'react'

import {
  activeVariantId,
  axisPickPatch,
  modelChoices,
  quantRowsFor,
  schemaEnvelope,
  seedAxisValues,
  seedUser,
  SpecForm,
  variantRows,
  type FormSpecDoc,
  type SpecValues,
} from '../src/client/spec-form.tsx'

/** The krea-2 wire shape (lane read 2026-09-12): turbo (default) +
 *  raw Variant rows, int8 Quant cell OWNED by turbo. */
const KREA: FormSpecDoc = {
  form: 'image-gen',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, extra: { group: 'sampling' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 1.5, step: 0.1, extra: { group: 'sampling' } } },
  }),
  model: 'krea-2',
  variants: [
    { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2' }, route: 'krea-2', hint: '8-step distilled — fast, photorealistic (DEFAULT)' },
    { id: 'int8', label: 'INT8 ConvRot', group: 'Quant', defaults: {}, route: 'krea-2', quant: 'int8', owner: 'turbo' },
    { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw', hint: '52-step base checkpoint' },
  ],
}

afterEach(cleanup)

// ── the pure projections ────────────────────────────────────────────────────

test('variantRows keeps the served Variant rows; the quant chain filters by owner', () => {
  expect(variantRows(KREA).map((v) => v.id)).toEqual(['turbo', 'raw'])
  // THE CHAIN (one direction): int8 composes with turbo, not raw
  expect(quantRowsFor(KREA, 'turbo').map((q) => q.id)).toEqual(['int8'])
  expect(quantRowsFor(KREA, 'raw')).toEqual([])
})

test('modelChoices dedups the matrix routes, family first', () => {
  expect(modelChoices(KREA)).toEqual(['krea-2', 'krea-2-raw'])
})

test('activeVariantId: exact route match; quant chains under the active variant', () => {
  expect(activeVariantId(KREA, { model: 'krea-2-raw' } as SpecValues, 'Variant')).toBe('raw')
  expect(activeVariantId(KREA, { model: 'krea-2' } as SpecValues, 'Variant')).toBe('turbo')
  expect(activeVariantId(KREA, { model: 'krea-2' } as SpecValues, 'Quant')).toBe('int8')
  expect(activeVariantId(KREA, { model: 'krea-2-raw' } as SpecValues, 'Quant')).toBeUndefined()
})

test('axisPickPatch: the defaults overlay rides + the durable axis keys', () => {
  // a Variant pick re-points the model, overlays steps/cfg, and lands
  // variant + the first quant of the new variant
  expect(axisPickPatch(KREA, KREA.variants![2]!)).toEqual({
    model: 'krea-2-raw', steps: 52, cfg: 3.5, variant: 'raw', quant: '',
  })
  // a Quant pick overlays the cell's own defaults + quant
  expect(axisPickPatch(KREA, KREA.variants![1]!)).toEqual({ quant: 'int8' })
})

test('seedAxisValues: the first-declared law; held values win on reopen', () => {
  expect(seedAxisValues(KREA, {})).toEqual({ variant: 'turbo', quant: 'int8', model: 'krea-2' })
  // a reopened stage holds its axes — no re-seed, model untouched
  expect(seedAxisValues(KREA, { variant: 'raw', quant: '', model: 'krea-2-raw' }))
    .toEqual({ variant: 'raw', quant: '' })
  // a matrix-less spec seeds nothing
  expect(seedAxisValues({ ...KREA, variants: [] }, {})).toEqual({})
})

test('seedUser: the user-layer seed is the axis seed over held params (presence law)', () => {
  // a fresh stage: axis seeds only — defaults derive, never ride
  expect(seedUser(KREA, {})).toEqual({ variant: 'turbo', quant: 'int8', model: 'krea-2' })
  // a reopened stage holds EVERY key verbatim (presence survived)
  expect(seedUser(KREA, { steps: 52, variant: 'raw', quant: '', model: 'krea-2-raw' }))
    .toEqual({ steps: 52, variant: 'raw', quant: '', model: 'krea-2-raw' })
})

// ── the rendered axes ───────────────────────────────────────────────────────

test('CardForm renders Model, Variant, and Quant selects ABOVE the parameters', async () => {
  // THE HOST SEEDS (the settings law): seedUser at open — the form
  // never seeds; it renders the resolved value of the user layer.
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>(seedUser(KREA, { prompt: 'a cat' }))
    return createElement(SpecForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  // the three axis selects (the old test law: comboboxes named
  // Model/Variant/Quant) + the parameter fields still render
  const model = await screen.findByLabelText('Model')
  const variant = screen.getByLabelText('Variant')
  const quant = screen.getByLabelText('Quant')
  expect(model.textContent ?? '').toContain('krea-2')
  expect((model as HTMLSelectElement).value).toBe('krea-2')
  expect((variant as HTMLSelectElement).value).toBe('turbo')
  expect((quant as HTMLSelectElement).value).toBe('int8')
  expect(screen.getByLabelText('Prompt')).toBeTruthy()
  // the axes sit ABOVE the parameter groups in the DOM
  const form = model.closest('div')
  expect(form?.firstElementChild?.getAttribute('data-model-axes')).toBe('1')
})

test('picking Raw applies the overlay: model re-points, steps/cfg ride, quant clears', async () => {
  const edits: Record<string, unknown> = {}
  const user = userEvent.setup()
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ prompt: 'a cat', steps: 8, cfg: 1.5, variant: 'turbo', quant: 'int8', model: 'krea-2' })
    return createElement(SpecForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => {
        edits[name] = v
        setUser((m) => ({ ...m, [name]: v }))
      },
    })
  })
  render(comp)
  await user.selectOptions(screen.getByLabelText('Variant'), 'raw')
  expect(edits['model']).toBe('krea-2-raw')
  expect(edits['steps']).toBe(52)
  expect(edits['cfg']).toBe(3.5)
  expect(edits['variant']).toBe('raw')
  expect(edits['quant']).toBe('')
})

test('no matrix, no axes — the plain form is unchanged', () => {
  const comp = createElement(SpecForm, {
    spec: { ...KREA, variants: [] },
    user: { prompt: 'x' },
    onSet: () => {},
  })
  render(comp)
  expect(screen.queryByLabelText('Model')).toBeNull()
  expect(screen.queryByLabelText('Variant')).toBeNull()
  expect(screen.getByLabelText('Prompt')).toBeTruthy()
})

// ── the run pass-along (the door contract) ─────────────────────────────────

test('runCardStage composes the HELD model; the default family is only the resting value', async () => {
  // local import: the door-contract seam under test
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const calls: Array<{ method: string; args: Record<string, unknown> }> = []
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
    if (String(url) === '/v1/model-catalog') {
      return { ok: true, json: async () => ({ cards: { 'image-gen': { id: 'image-gen', families: ['krea-2'] } } }) }
    }
    if (String(url).includes('/v1/form-spec')) {
      return { ok: true, json: async () => KREA }
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } }
    calls.push({ method: frame.method, args: frame.payload.args })
    return { ok: true, json: async () => ({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value: { run_id: 'run-77', status: 'queued', queue_position: 0 } } }) }
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_v', title: 'Image gen', card: 'image-gen', engine: 'comfyui',
      params: { prompt: 'a cat', model: 'krea-2-raw', variant: 'raw', quant: '', steps: 52, cfg: 3.5 },
      result: null,
    })
    expect(res).toEqual({ runId: 'run-77' })
    // THE FRESH-READ FIRST (2026-09-13 drop law): the composing door
    // reads the estate row before starting — find the START call.
    const start = calls.find((c) => c.method === 'runs/start')
    // THE PASS-ALONG: the door's model arm is the HELD krea-2-raw —
    // the raw variant's re-point — never the default family
    expect((start?.args['doc'] as Record<string, unknown>)['model']).toBe('krea-2-raw')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
  }
})

// ── the multi-axis law (operator lane proof 2026-09-12: the hardcoded
//    Quant-only list dropped seedvr2's Recipe axis and qwen's — the
//    axes are the SERVED GROUPS, ALL of them, chained by owner). ──────

/** The seedvr2 wire shape (lane read 2026-09-12): Variant rows only +
 *  patch-only Recipe rows (owner '' — compose with everything). */
const SEEDVR: FormSpecDoc = {
  form: 'upscale-tools',
  schema: schemaEnvelope({
    image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', required: true, group: 'input' } } },
    target: { type: 'number', meta: { description: 'Target short side', default: 1080, extra: { group: 'resolution' } } },
  }),
  model: 'seedvr2_ema',
  features: {
    variant_groups: {
      Variant: { label: 'Variant' },
      Recipe: { label: 'Recipe', tooltip: 'One-click recipes — patch-only rows that stamp picks onto the draft.', default: 'default' },
    },
  },
  variants: [
    { id: '3b', label: '3B FP16', group: 'Variant', defaults: { model: 'seedvr2_ema' }, route: 'seedvr2_ema', hint: '3B EMA fp16 — fast, ~7 GB VRAM (DEFAULT)' },
    { id: '7b', label: '7B', group: 'Variant', defaults: { model: 'seedvr2_ema_7b' }, route: 'seedvr2_ema_7b', hint: '7B EMA fp8_e4m3fn' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'The family default — no extra stamps' },
  ],
}

/** The qwen wire shape (lane read 2026-09-12): Variant + Quant +
 *  Recipe — three axes, Quant owned by Variant. */
const QWEN: FormSpecDoc = {
  form: 'image-edit',
  schema: schemaEnvelope({
    image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', required: true, group: 'input' } } },
  }),
  model: 'qwen-img-edit-2511',
  features: {
    variant_groups: {
      Variant: { label: 'Variant' },
      Quant: { label: 'Quant' },
      Recipe: { label: 'Recipe', default: 'default' },
    },
  },
  variants: [
    { id: 'lightning', label: 'Lightning', group: 'Variant', defaults: { model: 'qwen-img-edit-2511-lightning4' }, route: 'qwen-img-edit-2511-lightning4', hint: '4-step distilled checkpoint' },
    { id: 'lightning4', label: 'FP8 Lightning', group: 'Quant', defaults: {}, route: 'qwen-img-edit-2511-lightning4', owner: 'lightning' },
    { id: 'standard', label: 'Standard', group: 'Variant', defaults: { model: 'qwen-img-edit-2511' }, route: 'qwen-img-edit-2511', hint: '20 steps, cfg 2.5' },
    { id: 'int8', label: 'INT8 ConvRot', group: 'Quant', defaults: {}, route: 'qwen-img-edit-2511-int8', owner: 'standard' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

test('axisGroups: every served group is an axis — no hardcoded Quant-only list', async () => {
  const { axisGroups } = await import('../src/client/spec-form.tsx')
  // seedvr2's second axis is RECIPE, not Quant — the hardcoded list
  // dropped it on the lane (the operator's catch)
  expect(axisGroups(SEEDVR)).toEqual(['Variant', 'Recipe'])
  expect(axisGroups(QWEN)).toEqual(['Variant', 'Quant', 'Recipe'])
  // no groups contract → first-seen row order (KREA has no features)
  expect(axisGroups(KREA)).toEqual(['Variant', 'Quant'])
})

test('the seedvr2 drill renders Model + Variant + Recipe axes — the Recipe axis the hardcoded list dropped', async () => {
  const state = { user: seedUser(SEEDVR, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  render(createElement(SpecForm, {
    spec: SEEDVR,
    user: state.user,
    onSet,
  }))
  const model = screen.getByLabelText('Model')
  expect(model.value).toBe('seedvr2_ema')
  const variant = screen.getByLabelText('Variant')
  expect(variant.value).toBe('3b')
  // THE DROPPED AXIS — renders now
  const recipe = screen.getByLabelText('Recipe')
  expect(recipe.value).toBe('default')
  // picking 7B re-points the model
  fireEvent.change(screen.getByLabelText('Variant'), { target: { value: '7b' } })
  await waitFor(() => { expect(state.user['model']).toBe('seedvr2_ema_7b') })
})

test('the qwen drill chains Quant by owner and keeps Recipe composing with both variants', async () => {
  const state = { user: seedUser(QWEN, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  render(createElement(SpecForm, {
    spec: QWEN,
    user: state.user,
    onSet,
  }))
  expect(screen.getByLabelText('Variant').value).toBe('lightning')
  expect(screen.getByLabelText('Quant').value).toBe('lightning4')
  expect(screen.getByLabelText('Recipe').value).toBe('default')
  // switch to Standard: the Quant axis re-seeds to int8 (the standard
  // chain), the Recipe axis is untouched (owner '' composes always)
  fireEvent.change(screen.getByLabelText('Variant'), { target: { value: 'standard' } })
  await waitFor(() => { expect(state.user['model']).toBe('qwen-img-edit-2511') })
  expect(state.user['quant']).toBe('int8')
  expect(state.user['recipe']).toBe('default')
})

test('a Recipe pick stamps its overlay WITHOUT re-pointing the model (patch-only law)', async () => {
  const { axisPickPatch } = await import('../src/client/spec-form.tsx')
  const patch = axisPickPatch(SEEDVR, SEEDVR.variants![2]!)
  expect(patch['recipe']).toBe('default')
  expect(patch['model']).toBeUndefined()
})

test('seedAxisValues seeds EVERY axis key (variant/quant/recipe — the group ids lowercased)', async () => {
  const seedQ = seedAxisValues(QWEN, {})
  expect(seedQ['variant']).toBe('lightning')
  expect(seedQ['quant']).toBe('lightning4')
  expect(seedQ['recipe']).toBe('default')
  expect(seedQ['model']).toBe('qwen-img-edit-2511-lightning4')
})

// ── the recipe-yield law (operator 2026-09-14: "IMG GEN UI CARD HAS
//    TWO RECIPES") — the card's own `recipe` field and the family
//    Recipe axis share one values key; the card owns the name. ─────

// image-gen serves BOTH: the card recipe field (standard/…) AND the
// krea-2 family Recipe rows (realism/default) — the double select.
const IMGGEN: FormSpecDoc = {
  ...KREA,
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, extra: { group: 'sampling' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 1.5, step: 0.1, extra: { group: 'sampling' } } },
    // the card's own recipe field: a union of consts (labels ride the
    // const members' meta.description — the walker's option law)
    recipe: {
      consts: ['standard', 'fast_draft', 'cinematic'],
      meta: { description: 'Recipe', default: 'standard', extra: { group: 'sampling' } },
    },
  }),
  features: {
    variant_groups: {
      Variant: { label: 'Variant' },
      Quant: { label: 'Quant' },
      Recipe: { label: 'Recipe', default: 'default' },
    },
  },
  variants: [
    ...(KREA.variants ?? []),
    { id: 'realism', label: 'Realism', group: 'Recipe', defaults: {}, route: '', hint: 'the realism one-click' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

test('recipe-yield: the family Recipe axis hides when the card owns a recipe field', async () => {
  const { axisGroups, cardOwnsRecipe } = await import('../src/client/spec-form.tsx')
  expect(cardOwnsRecipe(IMGGEN)).toBe(true)
  expect(cardOwnsRecipe(KREA)).toBe(false)
  // the family axis is gone — ONE recipe (the card's own field)
  expect(axisGroups(IMGGEN)).toEqual(['Variant', 'Quant'])
  // …and never seeded (the old seed stamped family `default` where
  // the card catalog only knows standard/fast_draft/cinematic)
  const seed = seedAxisValues(IMGGEN, {})
  expect(seed['recipe']).toBeUndefined()
  expect(seed['variant']).toBe('turbo')
  // cards without their own recipe field keep the family axis
  expect(axisGroups(QWEN)).toEqual(['Variant', 'Quant', 'Recipe'])
})

test('recipe-yield: the drill renders ONE Recipe — the card field, never the family axis', async () => {
  const state = { user: { ...seedUser(IMGGEN, { recipe: 'standard' }) } as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  render(createElement(SpecForm, {
    spec: IMGGEN,
    user: state.user,
    onSet,
  }))
  // exactly one Recipe combobox — the card's own field
  expect(screen.getAllByLabelText('Recipe')).toHaveLength(1)
  expect((screen.getByLabelText('Recipe') as HTMLSelectElement).value).toBe('standard')
})

test('seedUser heals double-recipe-era benches (family `default` → card default)', async () => {
  // a bench holding the family's `default` heals to the card default
  // (the one validation clause — the option list judges, presence
  // rides verbatim otherwise)
  expect(seedUser(IMGGEN, { recipe: 'default' })['recipe']).toBe('standard')
  // a lawful card recipe passes through untouched
  expect(seedUser(IMGGEN, { recipe: 'cinematic' })['recipe']).toBe('cinematic')
  // cards without their own recipe field never heal
  expect(seedUser(QWEN, { recipe: 'default' })['recipe']).toBe('default')
})

// ── the stale-variant cure (operator 2026-09-14: model anima +
//    variant turbo refused at compose) ─────────────────────────────

test('modelSwitchPatch: a model switch re-seeds every axis (never the old family\'s variant)', async () => {
  const { modelSwitchPatch } = await import('../src/client/spec-form.tsx')
  // krea-2 → krea-2-raw: variant/quant follow + the overlay rides
  expect(modelSwitchPatch(KREA, 'krea-2-raw')).toEqual({
    model: 'krea-2-raw', steps: 52, cfg: 3.5, variant: 'raw', quant: '',
  })
  // …and back: turbo re-seats with its cell
  expect(modelSwitchPatch(KREA, 'krea-2')).toMatchObject({ model: 'krea-2', variant: 'turbo', quant: 'int8' })
})

test('switching the Model select resets the Variant axis (the drill never holds turbo-for-anima)', async () => {
  const state = { user: { prompt: 'a cat', model: 'krea-2', variant: 'turbo', quant: 'int8' } as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  render(createElement(SpecForm, {
    spec: KREA,
    user: state.user,
    onSet,
  }))
  fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'krea-2-raw' } })
  await waitFor(() => { expect(state.user['model']).toBe('krea-2-raw') })
  expect(state.user['variant']).toBe('raw')
  expect(state.user['quant']).toBe('')
})

// ── THE NO-FALLBACK LAW (operator, hour 26: "NO. MORE. FALLBACKS.
//    You don't understand the difference between error and
//    fallback") — the lane proof wall ────────────────────────────
// A stage held model=anima + variant=turbo + quant=int8 on the
// image-gen card; the form painted krea-2 (first <option> over the
// unmatched value) and krea's turbo blurb (the held id matched
// ANOTHER family's row in the ungated union) while the run shot
// anima and the engine refused. A held value that cannot be honored
// is an ERROR and renders AS ITSELF — never a plausible neighbor.

test('THE LANE PROOF: the Model select renders the HELD model as itself, refused — never paints krea-2 over it', async () => {
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({
      model: 'anima', variant: 'turbo', quant: 'int8', prompt: 'beach',
    })
    return createElement(SpecForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  const quant = screen.getByLabelText('Quant') as HTMLSelectElement
  // the Model select renders the HELD model — anima, refused — the
  // run shoots anima and the engine refuses; the visual says the
  // same. NEVER the first <option> (krea-2) painted over it.
  expect(model.value).toBe('anima')
  expect(model.getAttribute('data-refused')).toBe('model')
  expect(model.selectedOptions[0]?.textContent).toContain('anima — not an offered model of this card')
  // the held coords are REAL rows of the card's matrix — they render
  // grounded, their own values (the run composes variant=turbo,
  // quant=int8; the visual shows exactly that). The PAIR's
  // incoherence lives visibly in the refused Model row.
  expect(variant.value).toBe('turbo')
  expect(variant.getAttribute('data-refused')).toBe(null)
  expect(quant.value).toBe('int8')
  expect(quant.getAttribute('data-refused')).toBe(null)
})

test('a held INVALID axis on a VALID model refuses too — the ungated union no longer lends rows', async () => {
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2', variant: 'nonsense' })
    return createElement(SpecForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  expect(model.value).toBe('krea-2')
  expect(model.getAttribute('data-refused')).toBe(null)
  // nonsense is not a krea-2 variant row → refused AS ITSELF; the
  // raw row (another model's face) never paints over it
  expect(variant.value).toBe('nonsense')
  expect(variant.getAttribute('data-refused')).toBe('Variant')
})

test('a held coord that breaks the OWNER CHAIN refuses as itself — the first-row substitution is dead', async () => {
  // int8 is owned by turbo; holding it under raw never composed —
  // the old form silently painted the first quant row over it
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2', variant: 'raw', quant: 'int8' })
    return createElement(SpecForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  const quant = (await screen.findByLabelText('Quant')) as HTMLSelectElement
  expect(quant.value).toBe('int8')
  expect(quant.getAttribute('data-refused')).toBe('Quant')
  expect(quant.selectedOptions[0]?.textContent).toContain('int8 — invalid')
})

test('one pick repairs a refused stage — the pick\'s overlay re-points the model coherently', async () => {
  const edits: Record<string, unknown> = {}
  const comp = createElement(function Host() {
    return createElement(SpecForm, {
      spec: KREA,
      user: { model: 'anima', variant: 'turbo', quant: 'int8' },
      onSet: (name: string, v: unknown) => { edits[name] = v },
    })
  })
  render(comp)
  const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
  // the refused model select still offers the card's real models —
  // the repair is one gesture, never a rewrite of the held state
  fireEvent.change(model, { target: { value: 'krea-2' } })
  await waitFor(() => {
    expect(edits['model']).toBe('krea-2')
    // the stale-variant cure rides the same patch: axes re-seed
    expect(edits['variant']).toBe('turbo')
  })
})


// ── THE FAMILIES BLOCK (no-silent-drop law, hour 26 stroke 17) ──
test('a boarded-but-not-downloaded family SERVES in the Model rail — visible, disabled, marked; never dropped', async () => {
  const spec = { ...KREA, families: [
    { id: 'krea-2', label: 'Krea 2', present: true },
    { id: 'anima', label: 'Anima', present: false },
  ] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2' })
    return createElement(SpecForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
  const opt = model.querySelector('option[value="anima"]') as HTMLOptionElement
  // visible + disabled + the machine truth in the label
  expect(opt).toBeTruthy()
  expect(opt.disabled).toBe(true)
  expect(opt.textContent).toContain('Anima — not downloaded on this machine')
})

test('a HELD absent family grounds through the families block — the rail shows it, not krea-2', async () => {
  const spec = { ...KREA, families: [
    { id: 'krea-2', label: 'Krea 2', present: true },
    { id: 'anima', label: 'Anima', present: false },
  ] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'anima', variant: 'turbo', quant: 'int8' })
    return createElement(SpecForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    })
  })
  render(comp)
  const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
  // the held model renders AS ITSELF (an option exists — the
  // families block grounds it); no data-refused (it is boarded),
  // never krea-2 painted over it
  expect(model.value).toBe('anima')
  expect(model.getAttribute('data-refused')).toBe(null)
  const opt = model.querySelector('option[value="anima"]') as HTMLOptionElement
  expect(opt.textContent).toContain('not downloaded')
})
