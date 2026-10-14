// @vitest-environment happy-dom
// spec-panel.spec.tsx — THE SHARED DYNAMIC PARAMETER PANEL (2026-09-17,
// the operator's shared-component law: "shared components across
// cards — other cards may need the exact same functionality of
// dynamic parameter showing"). PINS: sections of the SERVED
// form-spec's rows at their wire names; `when` predicates gate the
// leaves on the live values; an undeclared row renders NOTHING (no
// ghost, no twin); a refused door renders AS an error — never a
// thinner panel; a host-handed doc skips the fetch (one door hit).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { SpecPanel, schemaEnvelope } from '../src/index.ts'

afterEach(cleanup)

function doc(): unknown {
  const num = (description: string, dflt: number, vis?: string) => ({
    type: 'number', meta: { description, default: dflt, extra: { ...(vis ? { visible_when: vis } : {}) } },
  })
  const sel = (description: string, consts: string[], dflt: string) => ({
    consts, meta: { description, default: dflt, extra: { wtype: 'select' } },
  })
  return {
    form: 'any-card',
    schema: schemaEnvelope({
      engine_power: num('Engine power', 3),
      mode: sel('Mode', ['a', 'b'], 'a'),
      leaf_on: num('Leaf on', 1, 'mode=a'),
      leaf_off: num('Leaf off', 2, 'mode=b'),
      leaf_set: num('Leaf set', 4, 'mode=a|z&engine_power=3'),
    }),
    variants: [],
  }
}

function serve(body: unknown = doc()): void {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })))
}

const SECTIONS = [
  { title: 'Engine', testid: 'p-engine', rows: [{ name: 'engine_power' }, { name: 'mode' }] },
  { title: 'Leaves', testid: 'p-leaves', rows: [{ name: 'leaf_on' }, { name: 'leaf_off' }, { name: 'leaf_set' }] },
]

function panel(values: Record<string, unknown>, over: Partial<Parameters<typeof SpecPanel>[0]> = {}) {
  const keys: Array<[string, unknown]> = []
  const rendered = render(h(SpecPanel, {
    model: 'any-card',
    sections: SECTIONS as never,
    values,
    onEdit: (n, v) => { keys.push([n, v]) },
    ...over,
  }))
  return { keys, ...rendered }
}

test('SECTIONS OF THE SERVED ROWS: titles + wire-named fields render off the door', async () => {
  serve()
  panel({ mode: 'a' })
  expect(await screen.findByText('Engine power')).not.toBeNull()
  expect(screen.getByText('Mode')).not.toBeNull()
  expect(document.querySelector('[data-testid="p-engine"]')).not.toBeNull()
  expect(document.querySelector('[data-testid="p-leaves"]')).not.toBeNull()
})

test('THE DECLARATION GATES THE LEAVES (visible_when: guards &-ANDed, values |-SET — one schema, zero predicates)', async () => {
  serve()
  panel({ mode: 'a', engine_power: 3 })
  await screen.findByText('Leaf on')
  expect(screen.queryByText('Leaf off')).toBeNull()
  // "mode=a|z&engine_power=3": the |-SET accepts a, the &-guard holds
  expect(screen.getByText('Leaf set')).not.toBeNull()
  cleanup()
  serve()
  // the guard reads the LIVE values — a missing guard key hides the leaf
  panel({ mode: 'a' })
  await screen.findByText('Leaf on')
  expect(screen.queryByText('Leaf set')).toBeNull()
  cleanup()
  serve()
  panel({ mode: 'b' })
  await screen.findByText('Leaf off')
  expect(screen.queryByText('Leaf on')).toBeNull()
  expect(screen.queryByText('Leaf set')).toBeNull()
})

test('AN UNDECLARED ROW RENDERS NOTHING (no ghost, no twin — never a fallback)', async () => {
  serve()
  const sections = [{ title: 'S', rows: [{ name: 'engine_power' }, { name: 'never_declared' }] }]
  const keys: Array<[string, unknown]> = []
  render(h(SpecPanel, {
    model: 'any-card', sections: sections as never, values: {},
    onEdit: (n, v) => { keys.push([n, v]) },
  }))
  await screen.findByText('Engine power')
  expect(document.body.textContent).not.toContain('never_declared')
})

test('A REFUSED DOOR RENDERS AS AN ERROR — NEVER A THINNER PANEL', async () => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('door refused (503)')))
  panel({})
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toContain('door refused (503)')
  expect(screen.queryByText('Engine power')).toBeNull()
})

test('A HOST-HANDED DOC SKIPS THE FETCH (one door hit — the co-located mod lane)', async () => {
  vi.stubGlobal('fetch', () => { throw new Error('the door must not be hit when the host hands the doc') })
  const spec = doc() as never
  panel({}, { spec } as never)
  expect(await screen.findByText('Engine power')).not.toBeNull()
})

test('EDITS FLOW AT THE WIRE NAME (the select row writes its wire spelling)', async () => {
  serve()
  const { keys } = panel({ mode: 'a' })
  await screen.findByText('Mode')
  // S7h: the enum seat rides the DSH Menu — pick by titled face
  fireEvent.click(screen.getByLabelText('Mode'))
  fireEvent.click(screen.getByRole('menuitem', { name: 'B' }))
  expect(keys).toEqual([['mode', 'b']])
})

test('A SLIDER ROW SCOPES TO ITS LABELLED ROW (the atom writes raw strings; coercion is the patch\'s)', async () => {
  serve()
  const { keys } = panel({ mode: 'a', engine_power: 3 })
  await screen.findByText('Engine power')
  const slider = within(screen.getByText('Engine power').parentElement!).getByRole('slider')
  fireEvent.change(slider, { target: { value: '6' } })
  expect(keys).toEqual([['engine_power', '6']])
})

test('THE MODEL GUARD (the base seeds the serving family into the grammar — a leaf may declare model=<family>)', async () => {
  const guarded = (model = 'fam-a'): unknown => ({
    form: 'any-card',
    model,
    schema: schemaEnvelope({
      plain: { type: 'number', meta: { description: 'Plain', default: 1 } },
      bespoke_a: { type: 'number', meta: { description: 'Bespoke A', default: 2, extra: { visible_when: 'model=fam-a' } } },
      bespoke_b: { type: 'number', meta: { description: 'Bespoke B', default: 3, extra: { visible_when: 'model=fam-b' } } },
    }),
    variants: [],
  })
  // serving fam-a: its bespoke leaf shows, the other family's hides —
  // the values carry NO model key (the BASE seeds it, never the host)
  const guardSections = [{ title: 'G', rows: [{ name: 'plain' }, { name: 'bespoke_a' }, { name: 'bespoke_b' }] }]
  serve(guarded())
  panel({ plain: 1 }, { model: 'fam-a', sections: guardSections as never })
  await screen.findByText('Bespoke A')
  expect(screen.queryByText('Bespoke B')).toBeNull()
  cleanup()
  // serving fam-b: the mirror (the door serves the doc for the
  // requested key — the fixture mirrors that, model rides the doc)
  serve(guarded('fam-b'))
  panel({ plain: 1 }, { model: 'fam-b', sections: guardSections as never })
  await screen.findByText('Bespoke B')
  expect(screen.queryByText('Bespoke A')).toBeNull()
  // the ungoverned plain row rides on BOTH (a shared surface never hides)
  expect(screen.getByText('Plain')).not.toBeNull()
  cleanup()
  // THE COMPOSED KEY (the FAMILIES-DRY law): a variant/quant row
  // walks as its base — the leaf declaring model=fam-a shows under
  // the served 'fam-a-1536-int8' key, never hidden by the suffix
  serve({
    form: 'any-card',
    model: 'fam-a-1536-int8',
    families: [{ id: 'fam-a' }, { id: 'fam-b' }],
    schema: schemaEnvelope({
      plain: { type: 'number', meta: { description: 'Plain', default: 1 } },
      bespoke_a: { type: 'number', meta: { description: 'Bespoke A', default: 2, extra: { visible_when: 'model=fam-a' } } },
      bespoke_b: { type: 'number', meta: { description: 'Bespoke B', default: 3, extra: { visible_when: 'model=fam-b' } } },
    }),
    variants: [],
  })
  panel({ plain: 1 }, { model: 'fam-a-1536-int8', sections: guardSections as never })
  await screen.findByText('Bespoke A')
  expect(screen.queryByText('Bespoke B')).toBeNull()
})
