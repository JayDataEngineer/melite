// @vitest-environment happy-dom
// use-resolved.spec.tsx — THE STUDIO SEAM (the operator's schema-law
// burn): one shared hook serving resolved values + schema-boundary
// edits to every studio panel. Pins the three laws the raw passes
// broke: DEFAULTS FILL (a sparse document renders its declared
// defaults, never blanks), HELD RIDES (presence is the override
// mark), and EDITS COERCE (a numeric string rides as a number at
// the schema boundary; unparseable rides verbatim for the run's
// loud refusal; undeclared keys — the mod bag — ride verbatim).
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { resolveValueLayered, useResolvedForm } from '../src/use-resolved.ts'
import type { FormSpecDoc } from '../src/spec.ts'

afterEach(cleanup)

/** A served-doc stand-in shaped like the real envelope: defaults on
 * the fields + model_defaults under them. */
function doc(): FormSpecDoc {
  return {
    form: 'h3',
    model: 'h3-timeline',
    model_defaults: { shift_video: 3, steps: 30 },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { shift_video: 1, shift_audio: 2, steps: 3, loras: 4, cfg: 6 } },
        1: { type: 'number', meta: { default: 2.5, min: 0, max: 10, step: 0.1, extra: { group: 'engine' } } },
        2: { type: 'number', meta: { default: 1.5, min: 0, max: 10, step: 0.1, extra: { group: 'engine' } } },
        3: { type: 'number', meta: { default: 30, min: 1, max: 100, step: 1, extra: { group: 'engine' } } },
        4: { type: 'array', meta: {}, inner: 5 },
        5: { type: 'object', meta: {}, dict: {} },
        6: { type: 'number', meta: { default: 5, extra: { wtype: 'number' } } },
      },
    },
  } as unknown as FormSpecDoc
}

function Harness({ family, user, onWrite, base }: {
  family: string
  user: Record<string, unknown>
  onWrite: (name: string, v: unknown) => void
  base?: Record<string, unknown>
}): ReturnType<typeof h> {
  const { spec, error, resolved, edit } = useResolvedForm(family, user, onWrite, base)
  return h('div', null,
    h('span', { 'data-testid': 'state' }, JSON.stringify({ spec: spec !== null, error, resolved })),
    h('button', {
      'data-testid': 'edit-num',
      type: 'button',
      onClick: () => { edit('steps', '8') },
    }, 'edit-num'),
    h('button', {
      'data-testid': 'edit-mod',
      type: 'button',
      onClick: () => { edit('loras', [{ id: 'x' }]) },
    }, 'edit-mod'),
    h('button', {
      'data-testid': 'edit-blank-seed',
      type: 'button',
      onClick: () => { edit('steps', '') },
    }, 'edit-blank-seed'),
    h('button', {
      'data-testid': 'edit-blank-slider',
      type: 'button',
      onClick: () => { edit('shift_video', '') },
    }, 'edit-blank-slider'),
    h('button', {
      'data-testid': 'edit-blank-number',
      type: 'button',
      onClick: () => { edit('cfg', '') },
    }, 'edit-blank-number'),
    h('button', {
      'data-testid': 'edit-blank-bag',
      type: 'button',
      onClick: () => { edit('loras', '') },
    }, 'edit-blank-bag'),
    h('button', {
      'data-testid': 'edit-blank-missing',
      type: 'button',
      onClick: () => { edit('missing', '') },
    }, 'edit-blank-missing'),
  )
}

test('DEFAULTS FILL: a sparse document renders its declared defaults, never blanks', async () => {
  const fetchMock = vi.fn(async () => Response.json(doc()))
  const realFetch = globalThis.fetch
  globalThis.fetch = fetchMock as unknown as typeof fetch
  try {
    render(h(Harness, { family: 'h3-timeline', user: {}, onWrite: () => {} }))
    await waitFor(() => { expect(screen.getByTestId('state').textContent).toContain('"spec":true') })
    const state = JSON.parse(screen.getByTestId('state').textContent ?? '{}') as {
      resolved: Record<string, unknown>
    }
    // schema default + model_default both serve under the empty user
    expect(state.resolved['shift_video']).toBe(3)
    expect(state.resolved['shift_audio']).toBe(1.5)
    expect(state.resolved['steps']).toBe(30)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('HELD RIDES: presence is the override mark', async () => {
  const fetchMock = vi.fn(async () => Response.json(doc()))
  const realFetch = globalThis.fetch
  globalThis.fetch = fetchMock as unknown as typeof fetch
  try {
    render(h(Harness, { family: 'h3-timeline', user: { shift_video: 6 }, onWrite: () => {} }))
    await waitFor(() => { expect(screen.getByTestId('state').textContent).toContain('"spec":true') })
    const state = JSON.parse(screen.getByTestId('state').textContent ?? '{}') as {
      resolved: Record<string, unknown>
    }
    expect(state.resolved['shift_video']).toBe(6)
    expect(state.resolved['shift_audio']).toBe(1.5)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('EDITS COERCE at the schema boundary; undeclared keys ride verbatim', async () => {
  const fetchMock = vi.fn(async () => Response.json(doc()))
  const realFetch = globalThis.fetch
  globalThis.fetch = fetchMock as unknown as typeof fetch
  const writes: Array<[string, unknown]> = []
  try {
    render(h(Harness, {
      family: 'h3-timeline', user: {},
      onWrite: (n, v) => { writes.push([n, v]) },
    }))
    await waitFor(() => { expect(screen.getByTestId('state').textContent).toContain('"spec":true') })
    screen.getByTestId('edit-num').click()
    screen.getByTestId('edit-mod').click()
    expect(writes[0]).toEqual(['steps', 8])
    expect(writes[1]).toEqual(['loras', [{ id: 'x' }]])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('THE STUDIOS’ BLANK-INHERITS LAW: empty numeric edits are the unset signal, nothing else', async () => {
  const fetchMock = vi.fn(async () => Response.json(doc()))
  const realFetch = globalThis.fetch
  globalThis.fetch = fetchMock as unknown as typeof fetch
  const writes: Array<[string, unknown]> = []
  try {
    render(h(Harness, {
      family: 'h3-timeline', user: {},
      onWrite: (n, v) => { writes.push([n, v]) },
    }))
    await waitFor(() => { expect(screen.getByTestId('state').textContent).toContain('"spec":true') })
    screen.getByTestId('edit-blank-seed').click()
    screen.getByTestId('edit-blank-slider').click()
    screen.getByTestId('edit-blank-number').click()
    screen.getByTestId('edit-blank-bag').click()
    screen.getByTestId('edit-blank-missing').click()
    expect(writes).toEqual([
      ['steps', undefined],
      ['shift_video', undefined],
      ['cfg', undefined],
      ['loras', ''],
      ['missing', ''],
    ])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('THE UNIVERSAL SYSTEM: base layers under user, pre-fetch included (never a hand ladder)', () => {
  // PRE-FETCH (spec null): the layers still compose — base under
  // user, verbatim. A synchronous render shows the document's own
  // held values; no surface branches on spec-null, no blanks.
  const pre = resolveValueLayered(null, { width: 800, height: 600, steps: 30 }, { steps: 20 })
  expect(pre).toEqual({ width: 800, height: 600, steps: 20 })
  // WITH A SPEC: the one cascade (schema <- model_defaults <- base
  // <- user) — the same shape, defaults filled under the layers.
  const spec = doc()
  const post = resolveValueLayered(spec, { width: 800, height: 600 }, { shift_video: 6 })
  expect(post['width']).toBe(800)
  expect(post['shift_video']).toBe(6)
  expect(post['shift_audio']).toBe(1.5) // schema default fills
})
