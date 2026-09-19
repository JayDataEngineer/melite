// @vitest-environment happy-dom
// gate-r7b-resolved.spec.tsx — GATE R7b: useResolvedForm's fieldOf
// with a null spec (use-resolved.ts:60 `spec !== null` path 2/2 —
// the pre-fetch render). The seam answers undefined before the doc
// lands (never a fieldsOf crash on null); once the doc lands the
// same lookup grounds on the declared field.
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test } from 'vitest'
import { useResolvedForm } from '../src/use-resolved.ts'
import type { FormSpecDoc } from '../src/spec.ts'

afterEach(cleanup)

/** A served-doc stand-in (mirrors use-resolved.spec's shape — steps
 *  is a declared numeric field). */
function doc(): FormSpecDoc {
  return {
    form: 'h3',
    model: 'h3-timeline',
    model_defaults: { shift_video: 3, steps: 30 },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { shift_video: 1, shift_audio: 2, steps: 3, loras: 4 } },
        1: { type: 'number', meta: { default: 2.5, min: 0, max: 10, step: 0.1, extra: { group: 'engine' } } },
        2: { type: 'number', meta: { default: 1.5, min: 0, max: 10, step: 0.1, extra: { group: 'engine' } } },
        3: { type: 'number', meta: { default: 30, min: 1, max: 100, step: 1, extra: { group: 'engine' } } },
        4: { type: 'array', meta: {}, inner: 5 },
        5: { type: 'object', meta: {}, dict: {} },
      },
    },
  } as unknown as FormSpecDoc
}

function FieldHarness({ family, name }: { family: string; name: string }): ReturnType<typeof h> {
  const { fieldOf } = useResolvedForm(family, {}, () => {})
  return h('span', { 'data-testid': 'field' }, fieldOf(name) === undefined ? 'none' : 'found')
}

test('FIELDOF: pre-fetch (spec null) answers undefined; the landed spec answers the field', async () => {
  const realFetch = globalThis.fetch
  let release!: (v: Response) => void
  const gate = new Promise<Response>((resolve) => { release = resolve })
  globalThis.fetch = ((_input: unknown) => gate) as typeof fetch
  try {
    render(h(FieldHarness, { family: 'h3-timeline', name: 'steps' }))
    expect(screen.getByTestId('field').textContent).toBe('none')
    release(Response.json(doc()))
    await waitFor(() => { expect(screen.getByTestId('field').textContent).toBe('found') })
  } finally {
    globalThis.fetch = realFetch
  }
})
