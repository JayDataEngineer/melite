
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
import { unbindEstateRemote } from '@melite/card-base/client'

import {
  activeVariantId,
  axisPickPatch,
  composeValidate,
  modelChoices,
  quantRowsFor,
  resolveValue,
  titleCaseId,
  schemaEnvelope,
  seedAxisValues,
  seedUser,
  CardForm,
  variantRows,
  type FormSpecDoc,
  type FormVariantRow,
  type SpecValues,
} from '@melite/card-base/client'
import { DECL as animaDecl } from '../../../models/anima/src/index.ts'

// THE MENU-SELECT DRIVERS (S7e): the spec axes ride the DSH Menu —
// open the trigger, click the menuitem row. axisFace reads the
// trigger's row label (what the user sees).
const axisFace = (label: string): string => (screen.getByLabelText(label) as HTMLElement).textContent ?? ''
const pickAxisRow = async (label: string, rowName: string | RegExp): Promise<void> => {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText(label))
  await user.click(screen.getByRole('menuitem', { name: rowName }))
}
const recipeTrigger = (container: HTMLElement): HTMLButtonElement => container.querySelector('[data-recipe-select]') as HTMLButtonElement
const pickRecipe = (rowName: string | RegExp): void => {
  fireEvent.click(screen.getByLabelText('Recipe'))
  fireEvent.click(screen.getByRole('menuitem', { name: rowName }))
}

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

afterEach(() => {
  cleanup()
  unbindEstateRemote()
  vi.unstubAllGlobals()
})

// ── the pure projections ────────────────────────────────────────────────────

test('variantRows keeps the served Variant rows; the quant chain filters by owner', () => {
  expect(variantRows(KREA).map((v) => v.id)).toEqual(['turbo', 'raw'])
  // THE CHAIN (one direction): int8 composes with turbo, not raw
  expect(quantRowsFor(KREA, 'turbo').map((q) => q.id)).toEqual(['int8'])
  expect(quantRowsFor(KREA, 'raw')).toEqual([])
})

test('modelChoices: THE FAMILY THE SPEC SERVES — a variant route is never a model (stroke 21)', () => {
  // krea-2-raw is the raw VARIANT's re-point (the DECL's compose
  // stamp) — it never renders in the Model rail
  expect(modelChoices(KREA)).toEqual(['krea-2'])
})

test('activeVariantId: exact route match; quant chains under the active variant', () => {
  expect(activeVariantId(KREA, { model: 'krea-2-raw' } as SpecValues, 'Variant')).toBe('raw')
  expect(activeVariantId(KREA, { model: 'krea-2' } as SpecValues, 'Variant')).toBe('turbo')
  expect(activeVariantId(KREA, { model: 'krea-2' } as SpecValues, 'Quant')).toBe('int8')
  expect(activeVariantId(KREA, { model: 'krea-2-raw' } as SpecValues, 'Quant')).toBeUndefined()
})

test('axisPickPatch: the visible stamps ride; the route NEVER lands in the user plane (stroke 21)', () => {
  // a Variant pick overlays steps/cfg and lands variant + the
  // reseeded quant — the model key is NEVER written (the re-point
  // krea-2-raw is the server's compose business)
  expect(axisPickPatch(KREA, KREA.variants![2]!)).toEqual({
    steps: 52, cfg: 3.5, variant: 'raw', quant: '',
  })
  expect('model' in axisPickPatch(KREA, KREA.variants![2]!)).toBe(false)
  // a Quant pick overlays the cell's own defaults + quant
  expect(axisPickPatch(KREA, KREA.variants![1]!)).toEqual({ quant: 'int8' })
})

test('seedAxisValues: the first-declared law; held values win on reopen', () => {
  expect(seedAxisValues(KREA, {})).toEqual({ variant: 'turbo', quant: 'int8', model: 'krea-2' })
  // a reopened stage holds its axes — no re-seed, model untouched.
  // The 'raw' variant declares no quant cells, so the quant axis is
  // UNSTATED and the seed OMITS the key (2026-10-10's empty-selection
  // law: this arm used to expect quant: '' — the stated-empty that
  // the add door wrote into a stage's params and the run door
  // refused, 'unknown quant "" for model "z-image" variant "turbo"')
  expect(seedAxisValues(KREA, { variant: 'raw', model: 'krea-2-raw' }))
    .toEqual({ variant: 'raw' })
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
    return createElement(CardForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  // the three axis selects (the old test law: comboboxes named
  // Model/Variant/Quant) + the parameter fields still render
  const model = await screen.findByLabelText('Model')
  const variant = screen.getByLabelText('Variant')
  const quant = screen.getByLabelText('Quant')
  // THE TITLE-CASE FACE (the operator's sweep law): the eye gets
  // prose, the door gets the id — text titled, value verbatim.
  expect(model.textContent ?? '').toContain('Krea 2')
  expect(model.textContent ?? '').not.toContain('krea-2')
  expect(axisFace('Model')).toContain('Krea 2')
  expect(axisFace('Variant')).toContain('Turbo')
  expect(axisFace('Quant')).toContain('INT8 ConvRot')
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeTruthy()
  // the axes sit ABOVE the parameter groups in the DOM. (The old
  // walk — model.closest('div').firstElementChild — dated from
  // before the Model+Variant PAIR div (6f9c22e2): the select's
  // nearest div became the pair, never the form. Walk the axes
  // SECTION and prove document order against every parameter
  // group instead.)
  const axes = model.closest('section[data-model-axes]')
  expect(axes).toBeTruthy()
  const paramGroups = axes!.parentElement!.querySelectorAll(
    'section:not([data-model-axes]):not([data-pack-prompt])')
  expect(paramGroups.length).toBeGreaterThan(0)
  paramGroups.forEach((g) => {
    expect(
      axes!.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

test('picking Raw applies the overlay: steps/cfg ride, quant clears, the model NEVER moves (stroke 21)', async () => {
  const edits: Record<string, unknown> = {}
  const user = userEvent.setup()
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ prompt: 'a cat', steps: 8, cfg: 1.5, variant: 'turbo', quant: 'int8', model: 'krea-2' })
    return createElement(CardForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => {
        edits[name] = v
        setUser((m) => ({ ...m, [name]: v }))
      },
      // THE ATOMIC PICK SEAT (required by construction)
      onPick: (patch: Record<string, unknown>) => {
        Object.assign(edits, patch)
        setUser((m) => ({ ...m, ...patch }))
      },
    })
  })
  render(comp)
  await pickAxisRow('Variant', /^Raw/)
  // THE VARIANT/MODEL DISTINCTION: a variant pick writes the variant
  // and its stamps — the model key is untouched (krea-2 stays)
  expect(edits['model']).toBeUndefined()
  expect(edits['steps']).toBe(52)
  expect(edits['cfg']).toBe(3.5)
  expect(edits['variant']).toBe('raw')
  expect(edits['quant']).toBe('')
})

test('no matrix, no axes — the plain form is unchanged', () => {
  const comp = createElement(CardForm, {
    spec: { ...KREA, variants: [] },
    user: { prompt: 'x' },
    onSet: () => {},
    onPick: () => {},
  })
  render(comp)
  expect(screen.queryByLabelText('Model')).toBeNull()
  expect(screen.queryByLabelText('Variant')).toBeNull()
  expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeTruthy()
})

// ── the run pass-along (the door contract) ─────────────────────────────────

test('runCardStage composes the HELD model; the default family is only the resting value', async () => {
  // local import: the door-contract seam under test
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  // THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
  // namespaces; fetch answers ONLY the /v1 discovery doors.
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const fakes = mountEstateFakes()
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url) === '/v1/model-catalog') {
      return { ok: true, json: async () => ({ cards: { 'image-gen': { id: 'image-gen', families: ['krea-2'] } } }) }
    }
    if (String(url).includes('/v1/form-spec')) {
      return { ok: true, json: async () => KREA }
    }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_v', title: 'Image gen', card: 'image-gen', engine: 'comfyui',
      params: { prompt: 'a cat', model: 'krea-2-raw', variant: 'raw', quant: '', steps: 52, cfg: 3.5 },
      result: null,
    })
    // ADAPTED (reported): the old lane's stub minted run-77; the live
    // seam's default start mints run-1 — the pinned law is the pass
    // along, not the id value.
    expect(res).toEqual({ runId: 'run-1' })
    // THE FRESH-READ FIRST (2026-09-13 drop law): the composing door
    // reads the estate row before starting — find the START call.
    const start = fakes.calls.find((c) => c.method === 'runs/start')
    // THE PASS-ALONG: the door's model arm is the HELD krea-2-raw —
    // the raw variant's re-point — never the default family
    expect((start?.args['doc'] as Record<string, unknown>)['model']).toBe('krea-2-raw')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

// ── THE WIRE RESOLUTION LAW (2026-10-10, the operator's
//    extermination order: NO SILENT BEHAVIOR — run 880aaa85d928
//    proved the seam: the bench wired input_images from s_0, the
//    stage's Run sent the $spell through the {model:} door, the
//    wire was silently discarded, the merge died with a stranger's
//    voice). The single-stage run resolves wires to the upstream's
//    LAST RESULT or refuses naming them — never drops them. ──────

/** The operator's exact bench shape: s_0 (image-gen, RAN — a result
 *  url) + the wired edit stage carrying the mandated $spell. */
function wiredBenchStages(s0Result: Record<string, unknown> | null): Array<Record<string, unknown>> {
  return [
    { id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a cat' }, ...(s0Result === null ? {} : { result: s0Result }) },
    {
      id: 's_1', card: 'image-edit', title: 'edit', engine: 'comfyui',
      params: { input_images: ['$input_images'], prompt: 'make the hair crimson', model: 'krea-2' },
      inputs: { input_images: { stage: 's_0', output: 'default' } },
    },
  ]
}

test('THE WIRE RESOLUTION: a wired stage runs on the upstream\'s last result — the $spell never crosses to the {model:} door', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const artifact = '/melite-media/runs/run-880aaa85d928-dfa2dc59/generate/SaveImage.0_gen_00001_.png'
  const fakes = mountEstateFakes({ draftStages: wiredBenchStages({ url: artifact }) })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { input_images: ['$input_images'], prompt: 'make the hair crimson' },
      inputs: { input_images: { stage: 's_0', output: 'default' } },
      result: null,
    })
    expect(res).toEqual({ runId: 'run-1' })
    const start = fakes.calls.find((c) => c.method === 'runs/start')
    const doc = (start?.args['doc'] as Record<string, unknown>) ?? {}
    // THE CONCRETE VALUE: the spell resolved to the upstream's url
    expect(doc['input_images']).toEqual([artifact])
    expect(JSON.stringify(doc)).not.toContain('$input_images')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

test('THE WIRE RESOLUTION: an upstream with no output REFUSES at the press — named, never a doomed run', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const fakes = mountEstateFakes({ draftStages: wiredBenchStages(null) })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { input_images: ['$input_images'], prompt: 'make the hair crimson' },
      inputs: { input_images: { stage: 's_0', output: 'default' } },
      result: null,
    })
    if (!('refused' in res)) throw new Error('expected a refusal, got ' + JSON.stringify(res))
    expect(res.refused).toContain('input_images')
    expect(res.refused).toContain('s_0')
    // THE NEVER-DOOMED LAW: the start door was never called
    expect(fakes.calls.some((c) => c.method === 'runs/start')).toBe(false)
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

test('THE WIRE RESOLUTION: a wire row of an unknown shape REFUSES naming it — never a silent skip', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const fakes = mountEstateFakes({
    draftStages: [
      { id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a cat' } },
      {
        id: 's_1', card: 'image-edit', title: 'edit', engine: 'comfyui',
        params: { input_images: ['$input_images'] },
        inputs: { input_images: { weird: true } },
      },
    ],
  })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url) === '/v1/model-catalog') {
      return { ok: true, json: async () => ({ cards: { 'image-edit': { id: 'image-edit', families: ['krea-2'] } } }) }
    }
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { input_images: ['$input_images'] },
      inputs: { input_images: { weird: true } },
      result: null,
    })
    if (!('refused' in res)) throw new Error('expected a refusal, got ' + JSON.stringify(res))
    expect(res.refused).toContain('input_images')
    expect(fakes.calls.some((c) => c.method === 'runs/start')).toBe(false)
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

// A NULL wire entry is legal on the bench row's own type
// (cards-resource.ts:89 — inputs is Record<string, unknown>) and the
// bench's wiring law can write it while an upstream is being picked.
// The resolver must NAME the entry it cannot map, and the null word
// it prints is the row's own value — never an empty string and never
// a silent skip.
test('THE WIRE RESOLUTION: a NULL wire entry refuses naming it — the voice prints the null', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const fakes = mountEstateFakes({
    draftStages: [
      { id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a cat' }, result: { url: '/x/out.png' } },
      {
        id: 's_1', card: 'image-edit', title: 'edit', engine: 'comfyui',
        params: { input_images: ['$input_images'] },
        inputs: { input_images: null },
      },
    ],
  })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url) === '/v1/model-catalog') {
      return { ok: true, json: async () => ({ cards: { 'image-edit': { id: 'image-edit', families: ['krea-2'] } } }) }
    }
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { input_images: ['$input_images'] },
      inputs: { input_images: null },
      result: null,
    })
    if (!('refused' in res)) throw new Error('expected a refusal, got ' + JSON.stringify(res))
    expect(res.refused).toContain('input "input_images" is neither {stage, output} nor a resolvable binding')
    // the printed value is the row's own null — `got null`, not `got ""`
    expect(res.refused).toContain('(got null)')
    expect(fakes.calls.some((c) => c.method === 'runs/start')).toBe(false)
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

// THE EVERY-DEPTH SUBSTITUTION. The resolver walks a param value, not
// just a top-level key: a spell nested in an OBJECT param, in an
// ARRAY param, and bare. The wire means ONE THING at every depth —
// this input IS that stage's output — so no depth may cross to the
// door with the $spell still in it.
test('THE WIRE RESOLUTION: a spell nested in an OBJECT param resolves at every depth', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  const artifact = '/melite-media/runs/run-880aaa85d928-dfa2dc59/generate/SaveImage.0_gen_00001_.png'
  // The composing door reads the estate row BEFORE composing (the
  // fresh-read law), so the spell rides the SERVED s_1 params — the
  // held row only names the stage.
  const nested: Record<string, unknown> = {
    mask: { image: '$input_images' },
    list: ['$input_images'],
    bare: '$input_images',
    keep: 'a literal $input_images suffix is not the spell',
  }
  const fakes = mountEstateFakes({
    draftStages: [
      { id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a cat' }, result: { url: artifact } },
      {
        id: 's_1', card: 'image-edit', title: 'edit', engine: 'comfyui',
        params: { ...nested, prompt: 'make the hair crimson', model: 'krea-2' },
        inputs: { input_images: { stage: 's_0', output: 'default' } },
      },
    ],
  })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { ...nested },
      inputs: { input_images: { stage: 's_0', output: 'default' } },
      result: null,
    })
    expect(res).toEqual({ runId: 'run-1' })
    const start = fakes.calls.find((c) => c.method === 'runs/start')
    const doc = (start?.args['doc'] as Record<string, unknown>) ?? {}
    // THE OBJECT DEPTH — the arm the bare/array walks never reached
    expect(doc['mask']).toEqual({ image: artifact })
    // ...and the two shallower depths still resolve from the same walk
    expect(doc['list']).toEqual([artifact])
    expect(doc['bare']).toBe(artifact)
    // substitution is exact-match only: a string that merely CONTAINS
    // the spell is not a wire and rides verbatim
    expect(doc['keep']).toBe('a literal $input_images suffix is not the spell')
    expect(JSON.stringify(doc['mask'])).not.toContain('$input_images')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

test('THE WIRE RESOLUTION: an upstream RESULT with no url reads as no output — the refusal names the stage', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  // a result object that carries no url (an error row, a pending
  // row): the resolver must read it as NO OUTPUT, never as a
  // resolved-but-empty binding
  const fakes = mountEstateFakes({ draftStages: wiredBenchStages({ ok: false, error: 'the engine refused' }) })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    if (String(url).includes('/v1/form-spec')) return { ok: true, json: async () => KREA }
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { input_images: ['$input_images'], prompt: 'make the hair crimson' },
      inputs: { input_images: { stage: 's_0', output: 'default' } },
      result: null,
    })
    if (!('refused' in res)) throw new Error('expected a refusal, got ' + JSON.stringify(res))
    expect(res.refused).toContain('s_0')
    expect(res.refused).toContain('no output yet')
    expect(fakes.calls.some((c) => c.method === 'runs/start')).toBe(false)
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
  }
})

test('THE SPEC-DOOR LAW: a downed form-spec door REFUSES the run, naming the door\'s own failure — never a silent verbatim compose', async () => {
  const { runCardStage } = await import('../src/client/CardsTab.tsx')
  const { mountEstateFakes } = await import('./estate-harness.ts')
  // unwired rows: the spec door is the FIRST thing this run asks
  const fakes = mountEstateFakes({
    draftStages: [
      { id: 's_1', card: 'image-edit', title: 'edit', engine: 'comfyui', params: { prompt: 'make the hair crimson' } },
    ],
  })
  const realFetch = globalThis.fetch
  ;(globalThis as Record<string, unknown>)['fetch'] = async (url: unknown): Promise<unknown> => {
    // the catalog door ANSWERS (the family currency — the one door,
    // D6 2026-11-05, reads it fresh per test now that the isolation
    // valve resets it); the SPEC door is DOWN — the probe's subject.
    if (String(url).includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: { 'image-edit': { families: ['image-edit'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (String(url).includes('/v1/form-spec')) throw new Error('door down')
    throw new Error('estate door on the fetch lane: ' + String(url))
  }
  try {
    const res = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { prompt: 'make the hair crimson' },
      result: null,
    })
    if (!('refused' in res)) throw new Error('expected a refusal, got ' + JSON.stringify(res))
    expect(res.refused).toContain('unreachable')
    expect(res.refused).toContain('door down')
    expect(fakes.calls.some((c) => c.method === 'runs/start')).toBe(false)
    // a rejection carrying a NON-Error (the transport's own spelling)
    // still names itself in the sentence — String(e) rides
    ;(globalThis as Record<string, unknown>)['fetch'] = async (): Promise<unknown> => {
      throw 'door down (a bare string)'
    }
    const res2 = await runCardStage('bench-main', {
      id: 's_1', title: 'edit', card: 'image-edit', engine: 'comfyui',
      params: { prompt: 'make the hair crimson' },
      result: null,
    })
    if (!('refused' in res2)) throw new Error('expected a refusal, got ' + JSON.stringify(res2))
    expect(res2.refused).toContain('door down (a bare string)')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
    fakes.unmount()
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
  model: 'seedvr2-ema',
  features: {
    variant_groups: {
      Variant: { label: 'Variant' },
      Recipe: { label: 'Recipe', tooltip: 'One-click recipes — patch-only rows that stamp picks onto the draft.', default: 'default' },
    },
  },
  variants: [
    { id: '3b', label: '3B FP16', group: 'Variant', defaults: { model: 'seedvr2-ema' }, route: 'seedvr2-ema', hint: '3B EMA fp16 — fast, ~7 GB VRAM (DEFAULT)' },
    { id: '7b', label: '7B', group: 'Variant', defaults: { model: 'seedvr2-ema-7b' }, route: 'seedvr2-ema-7b', hint: '7B EMA fp8_e4m3fn' },
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
    { id: 'lightning4', label: 'FP8 Lightning', group: 'Quant', defaults: {}, route: 'qwen-img-edit-2511-lightning4', quant: 'lightning4', owner: 'lightning' },
    { id: 'standard', label: 'Standard', group: 'Variant', defaults: { model: 'qwen-img-edit-2511' }, route: 'qwen-img-edit-2511', hint: '20 steps, cfg 2.5' },
    { id: 'int8', label: 'INT8 ConvRot', group: 'Quant', defaults: {}, route: 'qwen-img-edit-2511-int8', quant: 'int8', owner: 'standard' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

test('axisGroups: the Recipe group NEVER rides as an axis (stroke 33 — the compose-door refused the stamped key)', async () => {
  const { axisGroups } = await import('@melite/card-base/client')
  // neither fixture owns a recipe field: the served `default` row is
  // stamp-less display metadata — seating it stamped `recipe` onto
  // cards that cannot declare it (image-edit's compose refusal)
  expect(axisGroups(SEEDVR)).toEqual(['Variant'])
  expect(axisGroups(QWEN)).toEqual(['Variant', 'Quant'])
  // no groups contract → first-seen row order (KREA has no features)
  expect(axisGroups(KREA)).toEqual(['Variant', 'Quant'])
  // stroke 34: the family rows carry the payloads — still no axis
  expect(axisGroups(PILLS)).toEqual(['Variant'])
})

test('the seedvr2 drill renders Model + Variant and NO Recipe seat — nothing persists what the card cannot declare', async () => {
  const state = { user: seedUser(SEEDVR, {}) as SpecValues }
  // the seed carries no recipe key (stroke 33)
  expect(state.user['recipe']).toBeUndefined()
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  render(createElement(CardForm, {
    spec: SEEDVR,
    user: state.user,
    onSet,
    onPick,
  }))
  expect(axisFace('Model')).toContain('Seedvr2 Ema')
  expect(axisFace('Variant')).toContain('3B FP16')
  // NO SEAT: the card owns no recipe field — a Recipe select here
  // could only ever persist the compose-door's poison key
  expect(screen.queryByLabelText('Recipe')).toBeNull()
  // picking 7B rides the VARIANT key — the model NEVER moves (the
  // route seedvr2-ema-7b is the server's compose stamp, stroke 21)
  await pickAxisRow('Variant', /^7B/)
  await waitFor(() => { expect(state.user['variant']).toBe('7b') })
  expect(state.user['model']).toBe('seedvr2-ema')
  expect(state.user['recipe']).toBeUndefined()
})

test('the qwen drill chains Quant by owner — the user layer never gains a recipe key', async () => {
  const state = { user: seedUser(QWEN, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  render(createElement(CardForm, {
    spec: QWEN,
    user: state.user,
    onSet,
    onPick,
  }))
  expect(axisFace('Variant')).toContain('Lightning')
  expect(axisFace('Quant')).toContain('FP8 Lightning')
  expect(screen.queryByLabelText('Recipe')).toBeNull()
  // switch to Standard: the Quant axis re-seeds to int8 (the standard
  // chain) — and still no recipe key anywhere in the user layer
  await pickAxisRow('Variant', /^Standard/)
  await waitFor(() => { expect(state.user['quant']).toBe('int8') })
  // the model stays the FAMILY (the lightning route never rode)
  expect(state.user['model']).toBe('qwen-img-edit-2511')
  expect(state.user['recipe']).toBeUndefined()
})

test('a Recipe pick keeps its declared-knob defaults but NEVER stamps the recipe key (the vocabulary guard)', async () => {
  const { axisPickPatch } = await import('@melite/card-base/client')
  const patch = axisPickPatch(SEEDVR, SEEDVR.variants![2]!)
  // the group rides no axis — no durable key, no below-reseed, no model move
  expect(patch['recipe']).toBeUndefined()
  expect(patch['model']).toBeUndefined()
  expect(patch['variant']).toBeUndefined()
})

test('seedAxisValues seeds variant/quant — never recipe (the card cannot declare it)', async () => {
  const seedQ = seedAxisValues(QWEN, {})
  expect(seedQ['variant']).toBe('lightning')
  expect(seedQ['quant']).toBe('lightning4')
  expect(seedQ['recipe']).toBeUndefined()
  // the model arm is THE FAMILY — never the seeded row's route
  // (qwen-img-edit-2511-lightning4 is the lightning variant's stamp)
  expect(seedQ['model']).toBe('qwen-img-edit-2511')
})

test('STROKE 33 HEAL: a held recipe on a card without the field is dropped — the poisoned stage composes again', async () => {
  // the operator's live stage held recipe:'default' (the old seed's
  // stamp) — the drill opens onto a user layer the compose-door admits
  const healed = seedUser(QWEN, { recipe: 'default', variant: 'lightning' })
  expect(healed['recipe']).toBeUndefined()
  expect(healed['variant']).toBe('lightning') // held truth rides untouched
})

// ── STROKE 34+38: THE FAMILY MACRO PILLS (recipes are macros,
//    never a mode) — a Recipe row that CARRIES a knob payload
//    stamps it onto declared knob keys. STROKE 38 — the operator's
//    law: "LORA IS NEVER STANDALONE. IT IS ALWAYS A SUBSET OF THE
//    MOD SYSTEM." A stamp that is ENTIRELY mod-owned renders NO
//    pill (the Modifiers menu is that payload's one surface — it
//    serves every flavor row already); the stamp-less `default`
//    row renders nothing. ────────────────────────────────────────
const PILLS: FormSpecDoc = {
  form: 'image-gen-shape',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, extra: { group: 'sampling' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 1.5, step: 0.1, extra: { group: 'sampling' } } },
  }),
  model: 'krea-2',
  features: {
    // the SERVED truth (form-spec?model=krea-2 carries the lora
    // kind) — without it modOwnedFields owns nothing and the
    // stroke-38 gate could never fire
    modifiers: [{ kind: 'lora', label: 'LoRAs', param_key: 'loras', cardinality: 'list' }],
  },
  variants: [
    { id: 'base', label: 'Base', group: 'Variant', defaults: { model: 'krea-2' }, route: 'krea-2', hint: 'base' },
    // the family's lora one-click (the krea-2 realism row) — ALL
    // mod-owned: the Modifiers menu's row, never a pill
    { id: 'realism', label: 'Realism', group: 'Recipe', defaults: { loras: [{ id: 'krea2_realism_lora' }] }, route: '', hint: 'the realism one-click' },
    // a knob one-click — the pill's own domain
    { id: 'quick', label: 'Quick', group: 'Recipe', defaults: { steps: 6, cfg: 1.2 }, route: '', hint: 'the quick knob stamp' },
    // a MIXED row — knobs ride the pill, mod entries never do
    { id: 'cine', label: 'Cine', group: 'Recipe', defaults: { steps: 12, loras: [{ id: 'krea2_darkbrush' }] }, route: '', hint: 'the cine stamp' },
    // the stamp-less family default — display metadata, NO pill
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

test('RULE A: a stamp that is ENTIRELY mod-owned STILL renders its pill — the lora bag IS the preset (the menu stays its editor)', async () => {
  // (2026-09-18, the recipe law — AMENDS the stroke-38 drop: the
  // operator ruled "This *includes* LORAs being setup this way, which
  // you haven't done." A lora-only recipe renders its pill and
  // stamps the bag; the Modifiers menu stays the bag's editor.
  // Stroke 38's letter — the LORA rides the mod system's bag, never
  // a bespoke card field — survives intact.)
  const state = { user: seedUser(PILLS, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  const { container } = render(createElement(CardForm, {
    spec: PILLS,
    user: state.user,
    onSet,
    onPick,
  }))
  // THE DROPDOWN (operator, 2026-09-18): one select, never links
  expect(recipeTrigger(container)).not.toBeNull()
  fireEvent.click(recipeTrigger(container))
  const ids = screen.getAllByRole('menuitem').map((row) => (row.textContent ?? '').trim())
  expect(ids).toEqual(['Blank — no recipe', 'Realism — the realism one-click', 'Quick — the quick knob stamp', 'Cine — the cine stamp']) // (k, 2026-11-08) the blank row is a selectable WRITE (departure); the TRIGGER keeps the '-- recipe --' resting face
  fireEvent.click(screen.getByRole('menuitem', { name: /Realism/ }))
  await waitFor(() => { expect(state.user['loras']).toEqual([{ id: 'krea2_realism_lora' }]) })
})

test('KNOB STAMP: the pill click writes its full payload — no recipe key, ever', async () => {
  const state = { user: seedUser(PILLS, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  const { container } = render(createElement(CardForm, {
    spec: PILLS,
    user: state.user,
    onSet,
    onPick,
  }))
  pickRecipe(/Quick/)
  await waitFor(() => {
    expect(state.user['steps']).toBe(6)
    expect(state.user['cfg']).toBe(1.2)
  })
  expect(state.user['loras']).toBeUndefined() // the mod bag NEVER rides a pill
  expect(state.user['recipe']).toBeUndefined() // the dead layer's key never rides
})

test('RULE A MIXED: a row carrying knobs AND the lora bag stamps BOTH — the full payload is the preset', async () => {
  const state = { user: seedUser(PILLS, {}) as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  const { container } = render(createElement(CardForm, {
    spec: PILLS,
    user: state.user,
    onSet,
    onPick,
  }))
  expect(recipeTrigger(container)).not.toBeNull()
  pickRecipe(/Cine/)
  await waitFor(() => {
    expect(state.user['steps']).toBe(12)
    expect(state.user['loras']).toEqual([{ id: 'krea2_darkbrush' }])
  })
})

// ── the recipe-yield law (operator 2026-09-14: "IMG GEN UI CARD HAS
//    TWO RECIPES") — the card's own `recipe` field and the family
//    Recipe axis share one values key; the card owns the name. ─────

// image-gen's serving shape (stroke 34): NO card recipe field — the
// family Recipe rows (realism/default) are the only recipe concept.
const IMGGEN: FormSpecDoc = {
  ...KREA,
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, extra: { group: 'sampling' } } },
    cfg: { type: 'number', meta: { description: 'CFG', default: 1.5, step: 0.1, extra: { group: 'sampling' } } },
  }),
  features: {
    variant_groups: {
      Variant: { label: 'Variant' },
      Quant: { label: 'Quant' },
      Recipe: { label: 'Recipe', default: 'default' },
    },
    // the served truth (form-spec?model=krea-2 carries the lora
    // kind) — the stroke-38 gate's ownership source
    modifiers: [{ kind: 'lora', label: 'LoRAs', param_key: 'loras', cardinality: 'list' }],
  },
  variants: [
    ...(KREA.variants ?? []),
    { id: 'realism', label: 'Realism', group: 'Recipe', defaults: { loras: [{ id: 'krea2_realism_lora' }] }, route: '', hint: 'the realism one-click' },
    { id: 'default', label: 'Default', group: 'Recipe', defaults: {}, route: '', hint: 'no extra stamps' },
  ],
}

test('recipe-yield (stroke 34): NO card owns a recipe field — the group never rides, nothing seeds', async () => {
  const { axisGroups } = await import('@melite/card-base/client')
  // the card-recipe layer is dead: even a schema that still declares
  // a plain `recipe` knob gets NO Recipe axis (it renders as an
  // ordinary param field if it exists — image-gen's is deleted)
  expect(axisGroups(IMGGEN)).toEqual(['Variant', 'Quant'])
  const seed = seedAxisValues(IMGGEN, {})
  expect(seed['recipe']).toBeUndefined()
  expect(seed['variant']).toBe('turbo')
  expect(axisGroups(QWEN)).toEqual(['Variant', 'Quant'])
})

test('stroke 34: the drill renders NO recipe select — the dead layer has no seat anywhere', async () => {
  const state = { user: { ...seedUser(IMGGEN, { recipe: 'standard' }) } as SpecValues }
  // the heal dropped the poison before the mount
  expect(state.user['recipe']).toBeUndefined()
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  const { container } = render(createElement(CardForm, {
    spec: IMGGEN,
    user: state.user,
    onSet,
    onPick,
  }))
  // 2026-09-18: the FAMILY axis renders as the dropdown select —
  // the dead CARD layer (`recipe` param knob) still has no seat
  expect(screen.getByLabelText('Recipe')).not.toBeNull()
  expect(container.querySelector('[data-recipe-seat]')).toBeNull()
  expect(state.user['recipe']).toBeUndefined() // the poison stays dropped
})

test('seedUser drops every held recipe key (stroke 34 — no card declares the field)', async () => {
  // the family stamp…
  expect(seedUser(IMGGEN, { recipe: 'default' })['recipe']).toBeUndefined()
  // …and the dead card layer's stamp — both poison, both dropped
  expect(seedUser(IMGGEN, { recipe: 'cinematic' })['recipe']).toBeUndefined()
  expect(seedUser(QWEN, { recipe: 'default' })['recipe']).toBeUndefined()
})

// ── the stale-variant cure (operator 2026-09-14: model anima +
//    variant turbo refused at compose) ─────────────────────────────

test('modelSwitchPatch: a model switch re-seeds every axis (never the old family\'s variant)', async () => {
  const { modelSwitchPatch } = await import('@melite/card-base/client')
  // the spec's own family seats the chain (turbo + its cell); the
  // route never rides (krea-2-raw is not a model — stroke 21)
  expect(modelSwitchPatch(KREA, 'krea-2')).toMatchObject({ model: 'krea-2', variant: 'turbo', quant: 'int8' })
  expect(modelSwitchPatch(KREA, 'krea-2')['steps']).toBeUndefined()
})

test('switching the Model select resets the Variant axis (the drill never holds turbo-for-anima)', async () => {
  const state = { user: { prompt: 'a cat', model: 'krea-2', variant: 'turbo', quant: 'int8' } as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction): the host
  // merges the WHOLE patch — picks are one contract, one write
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  render(createElement(CardForm, {
    spec: { ...KREA, families: [{ id: 'anima', present: true }] },
    user: state.user,
    onSet,
    onPick,
  }))
  // a FAMILY switch clears the axes (the refetched family's rows
  // seed — stroke 19/20's law); krea-2-raw is not an option at all
  await pickAxisRow('Model', /^Anima/)
  await waitFor(() => { expect(state.user['model']).toBe('anima') })
  expect(state.user['variant']).toBe('')
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
    return createElement(CardForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  const model = await screen.findByLabelText('Model')
  // the Model select renders the HELD model — anima, refused — the
  // run shoots anima and the engine refuses; the visual says the
  // same. NEVER the first row (krea-2) painted over it.
  expect(axisFace('Model')).toContain('Anima — not an offered model')
  expect(model.getAttribute('data-refused')).toBe('model')
  // THE TITLE-CASE FACE: the eye gets Anima, the door keeps anima
  expect(model.textContent ?? '').toContain('Anima — not an offered model of this card')
  // the held coords are REAL rows of the card's matrix — they render
  // grounded, their own values (the run composes variant=turbo,
  // quant=int8; the visual shows exactly that). The PAIR's
  // incoherence lives visibly in the refused Model row.
  expect(axisFace('Variant')).toContain('Turbo')
  expect(screen.getByLabelText('Variant').getAttribute('data-refused')).toBe(null)
  expect(axisFace('Quant')).toContain('INT8 ConvRot')
  expect(screen.getByLabelText('Quant').getAttribute('data-refused')).toBe(null)
})

test('a held INVALID axis on a VALID model refuses too — the ungated union no longer lends rows', async () => {
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2', variant: 'nonsense' })
    return createElement(CardForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  const model = await screen.findByLabelText('Model')
  expect(axisFace('Model')).toContain('Krea 2')
  expect(model.getAttribute('data-refused')).toBe(null)
  // nonsense is not a krea-2 variant row → refused AS ITSELF; the
  // raw row (another model's face) never paints over it
  expect(axisFace('Variant')).toMatch(/^Nonsense — invalid/)
  expect(screen.getByLabelText('Variant').getAttribute('data-refused')).toBe('Variant')
})

test('a held coord that breaks the OWNER CHAIN refuses as itself — the first-row substitution is dead', async () => {
  // int8 is owned by turbo; holding it under raw never composed —
  // the old form silently painted the first quant row over it
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2', variant: 'raw', quant: 'int8' })
    return createElement(CardForm, {
      spec: KREA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  const quant = await screen.findByLabelText('Quant')
  expect(axisFace('Quant')).toContain('Int8 — invalid')
  expect(quant.getAttribute('data-refused')).toBe('Quant')
})

test('one pick repairs a refused stage — the pick\'s overlay re-points the model coherently', async () => {
  const edits: Record<string, unknown> = {}
  const comp = createElement(function Host() {
    return createElement(CardForm, {
      spec: KREA,
      user: { model: 'anima', variant: 'turbo', quant: 'int8' },
      onSet: (name: string, v: unknown) => { edits[name] = v },
      onPick: (patch: Record<string, unknown>) => { Object.assign(edits, patch) },
    })
  })
  render(comp)
  // the refused model select still offers the card's real models —
  // the repair is one gesture, never a rewrite of the held state
  await pickAxisRow('Model', /^Krea 2$/)
  await waitFor(() => {
    expect(edits['model']).toBe('krea-2')
    // the stale-variant cure rides the same patch: axes re-seed
    expect(edits['variant']).toBe('turbo')
  })
})


// ── THE FAMILIES BLOCK (no-silent-drop law, hour 26 stroke 17) ──
test('a boarded-but-not-downloaded family SERVES in the Model rail — visible, marked, PICKABLE (stroke 18: absence prompts, never blocks)', async () => {
  const spec = { ...KREA, families: [
    { id: 'krea-2', present: true },
    { id: 'anima', present: false },
  ] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2' })
    return createElement(CardForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  await screen.findByLabelText('Model')
  fireEvent.click(screen.getByLabelText('Model'))
  const opt = screen.getByRole('menuitem', { name: /Anima — not downloaded/ })
  // visible + the machine truth in the label + PICKABLE (the
  // download prompt handles absence — offered is offered)
  expect((opt as HTMLElement).hasAttribute('disabled')).toBe(false)
})

test('a HELD absent family grounds through the families block — the rail shows it, not krea-2', async () => {
  const spec = { ...KREA, families: [
    { id: 'krea-2', present: true },
    { id: 'anima', present: false },
  ] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'anima', variant: 'turbo', quant: 'int8' })
    return createElement(CardForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  const model = await screen.findByLabelText('Model')
  // the held model renders AS ITSELF (a row exists — the families
  // block grounds it); no data-refused (it is boarded), never
  // krea-2 painted over it
  expect(axisFace('Model')).toBe('Anima — not downloaded on this machine')
  expect(model.getAttribute('data-refused')).toBe(null)
})

// ── THE PACK PROMPT (no-silent-drop law's extension half, stroke 18) ──
test('a DECLARED extension pack the engine cannot see renders AS ITSELF — marked missing, install one click away', async () => {
  const spec = { ...KREA, packs: [{ id: 'SEEDVR2', present: false }, { id: 'pack-live', present: true }] }
  let fired = ''
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2' })
    return createElement(CardForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
      onInstallPack: (id: string) => { fired = id; return Promise.resolve(true) },
    })
  })
  render(comp)
  const row = await screen.findByText(/SEEDVR2 is required by this card but not installed/)
  expect(row).toBeTruthy()
  const btn = screen.getByText('Install SEEDVR2')
  fireEvent.click(btn)
  expect(fired).toBe('SEEDVR2')
  await waitFor(() => { expect(screen.getByText(/Install queued/)).toBeTruthy() })
  // present packs render NOTHING (nothing to act on — no false alarm)
  expect(screen.queryByText(/pack-live/)).toBe(null)
})

test('no install arm, no prompt chrome — and absent boarded family option is PICKABLE (stroke 18: offered is offered)', async () => {
  const spec = { ...KREA, families: [
    { id: 'krea-2', present: true },
    { id: 'anima', present: false },
  ], packs: [{ id: 'SEEDVR2', present: false }] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2' })
    return createElement(CardForm, {
      spec,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  // the mark without the verb is truth, not dead chrome: the prompt
  // row hides (no arm), but nothing blocks the pick
  expect(screen.queryByText(/Install SEEDVR2/)).toBe(null)
  await screen.findByLabelText('Model')
  fireEvent.click(screen.getByLabelText('Model'))
  expect(screen.getByRole('menuitem', { name: /Anima — not downloaded/ })).toBeTruthy()
})


// ── STROKE 19: ids only + the cross-spec filter ──
test('the Model rail NEVER renders a family\'s prose label — ids only (the DECL label names a variant+quant config, not a model)', async () => {
  const spec = { ...KREA, families: [{ id: 'z-image', present: true }, { id: 'anima', present: false }] }
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2' })
    return createElement(CardForm, { spec, user, onSet: (n: string, v: unknown) => { setUser((m) => ({ ...m, [n]: v })) }, onPick: () => {} })
  })
  render(comp)
  await screen.findByLabelText('Model')
  fireEvent.click(screen.getByLabelText('Model'))
  const opts = screen.getAllByRole('menuitem').map((row) => (row.textContent ?? '').trim())
  // TITLED ids only — no prose anywhere in the Model rail (the
  // title-case face); every row's face rides the titled id.
  for (const face of opts) expect(face).toMatch(/^(Krea 2|Z Image|Anima)( — not downloaded on this machine)?$/)
  expect(opts.length).toBe(3)
})

test('SELECTING A FAMILY FILTERS VARIANT+QUANT: the cross-spec pick clears the axes (never the old spec\'s rows under a foreign model)', async () => {
  // krea-2's matrix: turbo/int8 + raw/raw__int8; anima boards as a
  // family (the cross-spec pick's only legal seat)
  const spec = { ...KREA, families: [{ id: 'anima', present: true }] }
  const picked: SpecValues[] = []
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>({ model: 'krea-2', variant: 'turbo', quant: 'int8' })
    return createElement(CardForm, {
      spec, user,
      onSet: (n: string, v: unknown) => {
        setUser((m) => {
          const next = { ...m, [n]: v }
          picked.push({ ...next })
          return next
        })
      },
      // THE ATOMIC PICK SEAT (required by construction): the switch
      // lands as ONE frame — model + cleared axes, never per-key
      onPick: (patch: Record<string, unknown>) => {
        setUser((m) => {
          const next = { ...m, ...patch }
          picked.push({ ...next })
          return next
        })
      },
    })
  })
  render(comp)
  await pickAxisRow('Model', /Anima/)
  // the patch modelSwitchPatch produced: axes CLEARED — turbo/int8
  // (krea's rows) never ride under anima
  const after = picked[picked.length - 1]
  expect(after['model']).toBe('anima')
  expect(after['variant']).toBe('')
  expect(after['quant']).toBe('')
})

test('THE FILTER, END TO END: a cleared cross-spec pick seeds the NEW family\'s rows on its own spec (select krea-2 → variant/quant become krea\'s)', async () => {
  const { seedUser } = await import('@melite/card-base/client')
  // the drill's post-refetch state: model=krea-2 landed, axes cleared
  // by modelSwitchPatch; seedUser over the KREA spec (what the
  // form-spec?model=krea-2 fetch serves) seeds krea's OWN rows —
  // never a foreign family's variant under krea
  const seeded = seedUser(KREA, { model: 'krea-2', variant: '', quant: '' })
  expect(seeded['variant']).toBe('turbo')
  expect(seeded['quant']).toBe('int8')
  expect(seeded['model']).toBe('krea-2')
})


// ── STROKE 20: RECIPE'S SEAT (the operator's placement law:
//    "recipe is supposed to be under the model section") ────────
test('SEAT: the pills render UNDER THE MODEL SECTION — the lora row\'s pill included (Rule A)', async () => {
  // IMGGEN (stroke-38 shape): no card recipe field; the family
  // serves realism (lora-only — the mod menu's row, stroke 38),
  // default (stamp-less), and a knob row to carry the seat law.
  const SEAT: FormSpecDoc = {
    ...IMGGEN,
    variants: [
      ...(IMGGEN.variants ?? []),
      { id: 'quick', label: 'Quick', group: 'Recipe', defaults: { steps: 6 }, route: '', hint: 'the quick knob stamp' },
    ],
  }
  const sets: Array<[string, unknown]> = []
  // THE ATOMIC PICK LAW (2026-09-29): recipe picks ride ONE onPick
  // write carrying the row's FULL stamp — the per-key onSet face is
  // retired at this surface too
  const picks: Record<string, unknown>[] = []
  const { container } = render(createElement(CardForm, {
    spec: SEAT, user: { model: 'krea-2' },
    onSet: (n: string, v: unknown) => { sets.push([n, v]) },
    onPick: (patch: Record<string, unknown>) => { picks.push(patch) },
  }))
  // RULE A: the lora-only row RENDERS its option — the bag IS the
  // preset (the stroke-38 drop amended 2026-09-18; the lora still
  // rides the mod system's bag, never a bespoke card field)
  const select = recipeTrigger(container)
  expect(select).not.toBeNull()
  fireEvent.click(select)
  const ids = screen.getAllByRole('menuitem').map((row) => (row.textContent ?? '').trim())
  expect(ids).toEqual(['Blank — no recipe', 'Realism — the realism one-click', 'Quick — the quick knob stamp']) // realism + quick carry the seat; the blank row rides (k)
  fireEvent.click(screen.getByLabelText('Recipe')) // close: the owner bit toggles
  // THE SEAT: inside the model axes section (under Model, Variant,
  // Quant — never a sampling-group row at the bottom)
  expect(select.closest('[data-model-axes]')).not.toBeNull()
  // THE FAMILY DROPDOWN exists; the dead CARD layer still has no
  // writer — no `recipe` param ever stamps (the probe's compose
  // door refuses it; the selection DERIVES from the stamped payload)
  // RULE A: the quick row stamps its knob; the realism row stamps
  // its bag — each row's FULL payload is its preset, in ONE write
  pickRecipe(/Quick/)
  await waitFor(() => { expect(picks).toContainEqual({ steps: 6 }) })
  pickRecipe(/Realism/)
  await waitFor(() => { expect(picks).toContainEqual({ loras: [{ id: 'krea2_realism_lora' }] }) })
  expect(sets).toEqual([]) // the per-key verb never carries a pick
  expect(picks.every((p) => !('recipe' in p))).toBe(true) // the dead key never rides
})


// ── STROKE 22: THE DECL GRID (the operator's law: "smaller things
//    like width/height need to take up one row and not 2") — the
//    card package declares columns/width; the form renders them. ──
test('a DECLared columns group grids its fields — Width and Height share ONE row; undeclared groups stack', async () => {
  const spec: FormSpecDoc = {
    ...KREA,
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
      width: { type: 'number', meta: { description: 'Width', default: 1024, extra: { group: 'resolution', columns: 3, width: 1, wtype: 'number' } } },
      height: { type: 'number', meta: { description: 'Height', default: 1024, extra: { group: 'resolution', columns: 3, width: 1, wtype: 'number' } } },
      steps: { type: 'number', meta: { description: 'Steps', default: 8, extra: { group: 'sampling' } } },
    }),
  }
  render(createElement(CardForm, { spec, user: {}, onSet: () => {}, onPick: () => {} }))
  // THE SUBMENU LAW (stroke 89): multi-group specs seat each group
  // behind its tab — the columns group renders in ITS panel.
  fireEvent.click(screen.getByRole('tab', { name: 'Resolution' }))
  const panel = document.querySelector('[data-form-group-panel="resolution"]') as HTMLElement
  expect(panel).not.toBeNull()
  const grid = panel.querySelector('div[class*="specGrid"]') as HTMLElement
  expect(grid).not.toBeNull()
  // the DECL's grid: 3 columns (width/height/seed-shaped thirds)
  // STROKE 24 — THE OVERFLOW LAW: tracks are minmax(0,1fr) so a
  // columns:3 group in a narrow card SHRINKS (1fr alone carries an
  // auto min-content floor ~185px/cell → horizontal scroll) and
  // every cell wrapper carries minWidth 0.
  expect(grid.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
  for (const c of Array.from(grid.children)) {
    expect((c as HTMLElement).style.minWidth).toBe('0')
  }
  // Width + Height are grid SIBLINGS on one row (spans declared 1)
  const cells = [...grid.children]
  const labels = cells.map((c) => c.textContent ?? '')
  expect(labels.some((t) => t.includes('Width'))).toBe(true)
  expect(labels.some((t) => t.includes('Height'))).toBe(true)
  expect((cells[0] as HTMLElement).style.gridColumn).toBe('span 1')
  // THE GRID IS THE LAW (2026-09-21, the operator's catch: "WHY
  // WHY IS WIDTH AND HEIGHT ON DIFFERENT VERTICAL ROWS?"): an
  // UNDECLARED group grids 2 by DEFAULT — the form-card grammar is
  // the system law at the card level, never per-card decoration a
  // card can forget. (A card that wants a stack declares columns: 1.)
  fireEvent.click(screen.getByRole('tab', { name: 'Sampling' }))
  const sampPanel = document.querySelector('[data-form-group-panel="sampling"]') as HTMLElement
  const sampGrid = sampPanel.querySelector('div[class*="specGrid"]') as HTMLElement
  expect(sampGrid).not.toBeNull()
  expect(sampGrid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
})


// ── STROKE 23: THE TEXTAREA LAW — prompts never share a row; they
//    start two lines and grow with text. ────────────────────────
test('textareas span the FULL row in a columns group (prompts never sit side by side) and start at rows=2', async () => {
  const spec: FormSpecDoc = {
    ...KREA,
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt', columns: 2, width: 1 } } },
      negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea', group: 'prompt', columns: 2, width: 1 } } },
    }),
  }
  render(createElement(CardForm, { spec, user: {}, onSet: () => {}, onPick: () => {} }))
  const ta = (await screen.findByLabelText('Prompt')) as HTMLTextAreaElement
  // STARTS two lines
  expect(ta.getAttribute('rows')).toBe('2')
  // the group grids (columns: 2 served) but the textarea cells span
  // FULL rows — stacked, never side by side
  const grid = ta.closest('div[class*="specGrid"]') as HTMLElement
  expect(grid).not.toBeNull()
  expect((ta.closest('div[style*="grid-column"]') as HTMLElement)?.style.gridColumn).toBe('1 / -1')
  const cells = [...grid.children].filter((c) => (c as HTMLElement).style.gridColumn !== '')
  expect(cells.length).toBe(2)
  for (const c of cells) expect((c as HTMLElement).style.gridColumn).toBe('1 / -1')
})


// ── STROKE 24b: THE GRID IS PARAMETRIC — the operator's question:
//    "when different cards have different numbers of parameters, it
//    will fail?" NO. The track law is scale-free: ANY declared
//    column count renders the same physics, spans distribute over
//    the same shrinkable tracks, and the row can never outgrow its
//    card. This wall pins a DIFFERENT card shape than image-gen's
//    (columns:4, one field spanning 2 tracks) to prove no constant
//    is wired to the 3.
test('the grid law is parametric — columns:4 with a width:2 span, no overflow constants', async () => {
  const spec: FormSpecDoc = {
    ...KREA,
    schema: schemaEnvelope({
      // a DIFFERENT card's DECL: four small params, one eating half
      x: { type: 'number', meta: { description: 'X', default: 0, extra: { group: 'frame', columns: 4, width: 1, wtype: 'number' } } },
      y: { type: 'number', meta: { description: 'Y', default: 0, extra: { group: 'frame', columns: 4, width: 1, wtype: 'number' } } },
      scale: { type: 'number', meta: { description: 'Scale', default: 1, extra: { group: 'frame', columns: 4, width: 2, wtype: 'number' } } },
      denoise: { type: 'number', meta: { description: 'Denoise', default: 0.7, extra: { group: 'frame', columns: 4, width: 1, wtype: 'number' } } },
    }),
  }
  render(createElement(CardForm, { spec, user: {}, onSet: () => {}, onPick: () => {} }))
  const head = await screen.findByText('Frame')
  const grid = head.parentElement?.querySelector('div[class*="specGrid"]') as HTMLElement
  expect(grid).not.toBeNull()
  // the DECL's OWN count renders — 4, not 3: nothing in the form is
  // wired to image-gen's shape
  expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
  const cells = [...grid.children] as Array<HTMLElement>
  expect(cells.length).toBe(4)
  for (const c of cells) expect(c.style.minWidth).toBe('0')
  // spans ride the same tracks: scale eats TWO, the rest eat one
  const byLabel = (t: string): HTMLElement => cells.find((c) => (c.textContent ?? '').includes(t)) as HTMLElement
  expect(byLabel('X').style.gridColumn).toBe('span 1')
  expect(byLabel('Y').style.gridColumn).toBe('span 1')
  expect(byLabel('Scale').style.gridColumn).toBe('span 2')
  expect(byLabel('Denoise').style.gridColumn).toBe('span 1')
  // surplus spans AUTO-WRAP (grid semantics, not failure): 1+1+2+1
  // = 5 spans over 4 tracks — denoise opens row 2 on its own
  const spanSum = cells.reduce((acc, c) => acc + Number(/span (\d+)/.exec(c.style.gridColumn)?.[1] ?? 1), 0)
  expect(spanSum).toBe(5)
  expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
})

// ── STROKE 30: THE TITLE-CASE FACE (the operator's sweep law) ──
test('titleCaseId titles machine ids and leaves titled prose alone', () => {
  expect(titleCaseId('krea-2')).toBe('Krea 2')
  expect(titleCaseId('z-image')).toBe('Z Image')
  expect(titleCaseId('anima')).toBe('Anima')
  expect(titleCaseId('krea-2-raw')).toBe('Krea 2 Raw')
  expect(titleCaseId('euler')).toBe('Euler')
  expect(titleCaseId('comfyui')).toBe('Comfyui')
  expect(titleCaseId('image-gen')).toBe('Image Gen')
  expect(titleCaseId('sampling')).toBe('Sampling')
  // idempotent on the prose the DECLs already carry
  expect(titleCaseId('Turbo')).toBe('Turbo')
  expect(titleCaseId('INT8 ConvRot')).toBe('INT8 ConvRot')
  expect(titleCaseId('')).toBe('')
})

// ── AXIS UNIFICATION (P0#3 + P1#5, audit
//    dev_docs/audits/journey/axis-unification-2026-11-06.md) ────────
// The REAL anima DECL expanded through the discovery serialization's
// shape (variantRow + specVariants' cell expansion — mirrored
// verbatim from melite-tools/src/discovery.ts, the switching-sweep's
// flagged P3 idiom until item 2's one-serializer lands). A stage
// authored before wave 31 (376c13a4c) carries the DEAD quant
// spelling "int8"; the current matrix serves int8_convrot + bf16 —
// the operator's exact burn, recorded in the audit's verdict.
const ANIMA: FormSpecDoc = (() => {
  const rows: FormVariantRow[] = []
  for (const v of animaDecl.variants ?? []) {
    if (v.hide_from_dropdown === true) continue
    // variantRow: the served defaults are resolver ∪ wire (the full
    // stamp a pick lands — discovery.ts:208)
    rows.push({
      id: v.id,
      label: v.label,
      group: v.group,
      defaults: { ...(v.resolver_defaults ?? {}), ...(v.wire_defaults ?? {}) },
      route: v.route ?? '',
      hint: v.hint ?? null,
      engine: animaDecl.engine ?? '',
      sampler_envelope: v.sampler_envelope ?? null,
      quant: null,
      vram_peak_gb: null,
      owner: '',
    })
    for (const c of v.cells ?? []) {
      if (c.hide_from_dropdown === true || !c.quant || !c.route) continue
      const id = rows.some((r) => r.id === c.quant) ? `${v.id}__${c.quant}` : c.quant
      rows.push({
        id,
        label: c.label || c.quant,
        group: 'Quant',
        defaults: c.resolver_defaults ?? {},
        route: c.route,
        hint: null,
        engine: animaDecl.engine ?? '',
        quant: c.quant,
        vram_peak_gb: c.vram_peak_gb ?? null,
        owner: v.id,
      })
    }
  }
  return {
    form: 'image-gen',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
      steps: { type: 'number', meta: { description: 'Steps', default: 52, extra: { group: 'sampling' } } },
      cfg: { type: 'number', meta: { description: 'CFG', default: 4, step: 0.1, extra: { group: 'sampling' } } },
    }),
    model: animaDecl.id,
    features: {
      variant_groups: {
        Variant: { label: 'Variant' },
        Quant: { label: 'Quant' },
        Recipe: { label: 'Recipe', default: 'default' },
      },
    },
    variants: rows,
  }
})()

test('AXIS-UNIFICATION P0#3 — THE REFUSED-COORD REPAIR VERB: a pre-wave-31 doc (quant "int8") renders the affordance; the click writes int8_convrot; the composed doc passes the mirror judge', async () => {
  // THE SAVED DOC (the burn): authored before 376c13a4c's rename,
  // held verbatim by the drill's ride — the run refuses it.
  const held: SpecValues = { model: 'anima', variant: 'turbo', quant: 'int8', prompt: 'a lighthouse' }
  // THE JUDGE BITES (the control — never an always-green wall): the
  // stale doc refuses with the door's own voice, known cells named.
  const before = composeValidate(ANIMA, held)
  expect(before.length).toBe(1)
  expect(before[0]!.message).toContain('unknown quant "int8"')
  expect(before[0]!.message).toContain('"turbo"')
  expect(before[0]!.message).toContain('int8_convrot')
  expect(before[0]!.message).toContain('bf16')
  const patches: Array<Record<string, unknown>> = []
  const comp = createElement(function Host() {
    const [user, setUser] = useState<SpecValues>(held)
    return createElement(CardForm, {
      spec: ANIMA,
      user,
      onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
      onPick: (patch: Record<string, unknown>) => { patches.push(patch); setUser((m) => ({ ...m, ...patch })) },
    })
  })
  render(comp)
  // the refused coord renders AS ITSELF (the standing law)
  const quant = await screen.findByLabelText('Quant')
  expect(axisFace('Quant')).toContain('Int8 — invalid')
  expect(quant.getAttribute('data-refused')).toBe('Quant')
  // THE VERB: the repair affordance rides the refused row, naming
  // the nearest current cell (turbo's first composing cell)
  expect(screen.getByText('Not an offered coordinate of the held matrix — the nearest current cell is one click away:')
    .getAttribute('data-axis-repair')).toBe('Quant')
  fireEvent.click(screen.getByRole('button', { name: 'Write INT8 ConvRot' }))
  // THE ATOMIC PICK lands the cell coordinate the door reads — the
  // row's own stamp (axisStampOf), never the composite catalog id
  await waitFor(() => { expect(patches[0]?.['quant']).toBe('int8_convrot') })
  // THE COMPOSE-GREEN: the repaired doc passes the mirror judge —
  // the run would compose where the burn was refused
  expect(composeValidate(ANIMA, { ...held, ...patches[0] })).toEqual([])
})

test('AXIS-UNIFICATION P1#5 (the form half) — a turbo pick stamps the variant\'s resolver_defaults (steps 8, cfg 1) and the form shows them; a grounded matrix renders NO repair chrome', async () => {
  const state = { user: { model: 'anima', prompt: 'a lighthouse' } as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  // THE ATOMIC PICK SEAT (required by construction)
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  render(createElement(CardForm, { spec: ANIMA, user: state.user, onSet, onPick }))
  // grounded rest: base + its first cell — no refusal, no repair
  await screen.findByLabelText('Model')
  expect(screen.queryByText(/nearest current cell/)).toBe(null)
  // THE PICK: turbo's served row carries the variant's
  // resolver_defaults as its defaults (discovery.ts:208) — the pick
  // stamps them and the quant chain re-seeds to turbo's first cell
  await pickAxisRow('Variant', /^Turbo/)
  await waitFor(() => {
    expect(state.user['variant']).toBe('turbo')
    expect(state.user['steps']).toBe(8)
    expect(state.user['cfg']).toBe(1)
    expect(state.user['quant']).toBe('int8_convrot')
  })
  // THE FORM SHOWS IT: the resolved layer — exactly what the screen
  // renders per render (the one-truth press) — carries the stamps
  const resolved = resolveValue(ANIMA, state.user)
  expect(resolved['steps']).toBe(8)
  expect(resolved['cfg']).toBe(1)
  // and the stamped whole composes clean
  expect(composeValidate(ANIMA, resolved)).toEqual([])
})
