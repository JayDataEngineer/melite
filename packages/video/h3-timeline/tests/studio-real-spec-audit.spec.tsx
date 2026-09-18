// @vitest-environment happy-dom
// studio-real-spec-audit.spec.tsx — THE AUDIT WALL (operator,
// 2026-09-18: "NO SCHEMA VALIDATION, NO AUDITS OR CHECKS... what is
// the point of a schema or tests if you don't actually use them?").
// The studio mounted against the REAL served doc (the live lane's
// /v1/form-spec capture — ground truth, never a hand stand-in),
// pinning the three laws the raw pass broke:
//   1. DEFAULTS FILL — a fresh document renders every Engine row's
//      declared default (shift_video, shift_audio, steps...), NEVER
//      a blank ("MOST ARE BLANK, WITHOUT EVEN DEFAULTS").
//   2. THE DROPDOWN — recipes are ONE SELECT (never link-buttons),
//      seated with its derived selection.
//   3. A PICK VISIBLY MOVES THE ROWS — turbo_lightx2v stamps the
//      lora bag (the mod rows change) and a geometry recipe moves
//      the window rows ("DON'T EVEN CHANGE AUDIO SHIFT OR MOTION
//      SHIFT? ... LORA MODS??").
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, assert, beforeEach, test } from 'vitest'
import { RunRecipeEngine } from '../src/ui/studio/RunRecipeEngine.tsx'
import type { LayerA } from '../src/ui/studio/docModel.ts'

// the golden capture of the LIVE door's /v1/form-spec?model=h3-timeline
// (regoldable: curl -s localhost:3088/v1/form-spec?model=h3-timeline >
// tests/fixtures/h3-form-spec.golden.json). Ground truth, never a
// hand stand-in — the wall audits what the lane actually serves.
import REAL_SPEC_JSON from './fixtures/h3-form-spec.golden.json' with { type: 'json' }
const REAL_SPEC = REAL_SPEC_JSON as never

function serve(): void {
  const wire = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('/v1/form-spec')) return Response.json(REAL_SPEC)
    return wire(input)
  }) as unknown as typeof fetch
}

function mount(layerA: LayerA): ReturnType<typeof render> {
  return render(h(RunRecipeEngine, {
    stage: {} as never,
    layerA,
    setLayerAKey: () => {},
    isRef2va: false,
  }))
}

beforeEach(serve)
afterEach(cleanup)

test('DEFAULTS FILL: a fresh document shows every Engine row default — never blanks', async () => {
  mount({ fps: 24 } as LayerA)
  await screen.findByText('Clock')
  // the shift knobs — the operator's named burn — show their
  // DECLARED defaults (8 / 3 from the live door), not blanks. The
  // row chrome owns the label (served description); the slider
  // rides under it (the studio spec's own scope law).
  const inputOf = (label: string): HTMLInputElement =>
    screen.getByLabelText(label) as HTMLInputElement
  assert.equal(inputOf('Video Shift').value, '8', 'shift_video shows its declared default 8')
  assert.equal(inputOf('Audio Shift').value, '3', 'shift_audio shows its declared default 3')
  // steps rides resolved too (the whole panel, not one row)
  assert.equal(inputOf('Steps').value, '12', 'steps shows its declared default 12')
})

test('THE DROPDOWN: recipes are one select with the family rows — never links', async () => {
  mount({ fps: 24 } as LayerA)
  await screen.findByText('Clock')
  const select = document.querySelector('[data-recipe-select]') as HTMLSelectElement | null
  assert.ok(select !== null, 'the recipe select renders')
  const ids = Array.from(select.querySelectorAll('option')).map((o) => o.getAttribute('value'))
  assert.ok(ids.includes('turbo_lightx2v'), `turbo_lightx2v rides: ${JSON.stringify(ids)}`)
  assert.ok(ids.includes('final_hd'), `final_hd rides: ${JSON.stringify(ids)}`)
  assert.ok(!ids.includes('default'), 'stamp-less default renders no dead option')
})

test('A PICK MOVES THE ROWS: turbo stamps the lora bag; geometry moves the window', async () => {
  const held: Record<string, unknown> = {}
  const setKey = (n: string, v: unknown): void => { held[n] = v }
  const view = render(h(RunRecipeEngine, {
    stage: {} as never,
    layerA: { fps: 24 } as unknown as LayerA,
    setLayerAKey: setKey as never,
    isRef2va: false,
  }))
  await screen.findByText('Clock')
  const select = document.querySelector('[data-recipe-select]') as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'turbo_lightx2v' } })
  await waitFor(() => { assert.ok(Array.isArray(held['loras']), 'the bag stamped') })
  const bag = held['loras'] as Array<{ id?: string }>
  assert.ok(bag.some((r) => typeof r.id === 'string' && r.id.includes('lightx2v')),
    `the turbo lora rides: ${JSON.stringify(bag)}`)
  // the geometry recipe: picking draft_02mp moves the window rows
  fireEvent.change(select, { target: { value: 'draft_02mp' } })
  await waitFor(() => {
    assert.ok(typeof held['width'] === 'number' && typeof held['height'] === 'number',
      'geometry stamped')
  })
  view.unmount()
})
