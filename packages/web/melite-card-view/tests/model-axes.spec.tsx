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
  seedAxisValues,
  SpecForm,
  variantRows,
  type FormSpecDoc,
  type SpecValues,
} from '../src/client/spec-form.tsx'

/** The krea-2 wire shape (lane read 2026-09-12): turbo (default) +
 *  raw Variant rows, int8 Quant cell OWNED by turbo. */
const KREA: FormSpecDoc = {
  form: 'image-gen',
  fields: [
    { name: 'prompt', label: 'Prompt', type: 'textarea', group: 'prompt' },
    { name: 'steps', label: 'Steps', type: 'number', default: 8, group: 'sampling' },
    { name: 'cfg', label: 'CFG', type: 'slider', default: 1.5, group: 'sampling' },
  ],
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

// ── the rendered axes ───────────────────────────────────────────────────────

test('CardForm renders Model, Variant, and Quant selects ABOVE the parameters', async () => {
  const edits: Record<string, unknown> = {}
  const comp = createElement(function Host() {
    const [values, setValues] = useState<SpecValues>({ prompt: 'a cat', steps: 8, cfg: 1.5 })
    return createElement(SpecForm, {
      spec: KREA,
      fields: KREA.fields,
      values,
      onEdit: (name: string, v: unknown) => {
        edits[name] = v
        setValues((m) => ({ ...m, [name]: v }))
      },
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
  // the one-time seed lands (first-declared law) through onEdit
  await waitFor(() => {
    expect(edits['variant']).toBe('turbo')
    expect(edits['quant']).toBe('int8')
    expect(edits['model']).toBe('krea-2')
  })
})

test('picking Raw applies the overlay: model re-points, steps/cfg ride, quant clears', async () => {
  const edits: Record<string, unknown> = {}
  const user = userEvent.setup()
  const comp = createElement(function Host() {
    const [values, setValues] = useState<SpecValues>({ prompt: 'a cat', steps: 8, cfg: 1.5, variant: 'turbo', quant: 'int8', model: 'krea-2' })
    return createElement(SpecForm, {
      spec: KREA,
      fields: KREA.fields,
      values,
      onEdit: (name: string, v: unknown) => {
        edits[name] = v
        setValues((m) => ({ ...m, [name]: v }))
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
    fields: KREA.fields,
    values: { prompt: 'x' },
    onEdit: () => {},
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
    // THE PASS-ALONG: the door's model arm is the HELD krea-2-raw —
    // the raw variant's re-point — never the default family
    expect((calls[0]?.args['doc'] as Record<string, unknown>)['model']).toBe('krea-2-raw')
  } finally {
    ;(globalThis as Record<string, unknown>)['fetch'] = realFetch
  }
})
