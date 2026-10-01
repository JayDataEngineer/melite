/**
 * img-to-mesh-envelope — HOST envelope laws for the img-to-mesh card
 * (the zoom overlay's surface-size report + the spec doc's studio
 * shape). These test the BENCH host, not the card's studio (which
 * lives in @melite/3d-img-to-mesh's own tests since the
 * composition-root correction, 2026-09-12).
 */
import { render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { createElement, useEffect } from 'react'
import { CardZoomOverlay, zoomWidthFor } from '../src/client/zoom.tsx'
import type { BenchStageView, CardsBenchValue } from '../src/client/cards-resource.ts'
import { fetchFormSpec, schemaEnvelope } from '../src/client/spec-form.tsx'

const SPEC = {
  form: 'img-to-mesh',
  layout: 'studio',
  size: 'huge',
  schema: schemaEnvelope({
    input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', group: 'input' } } },
    // 'seed' is DERIVED (step 1 on a number), never a declared wtype
    seed: { type: 'number', meta: { description: 'Seed', step: 1, extra: { group: 'input' } } },
    resolution: { consts: ['1024', '2048'], meta: { description: 'Resolution', default: '1024', extra: { group: 'generation' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 12, step: 1, extra: { wtype: 'number', group: 'generation' } } },
    shape_steps: { type: 'number', meta: { description: 'Shape steps', default: 8, step: 1, extra: { wtype: 'number', group: 'stage' } } },
    atlas_size: { consts: ['1024', '2048', '4096'], meta: { description: 'Atlas size', default: '2048', extra: { group: 'bake' } } },
  }),
}

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      return new Response(JSON.stringify(SPEC), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200 })
  })
}

test('the envelope lift: the detail reports, the card law answers', async () => {
  stubWire()
  const stage = { id: 's_h', card: 'img-to-mesh', engine: 'comfyui', params: {} } as BenchStageView
  const bench = { kind: 'bench', draftId: 'd', rev: 1, stages: [stage], log: [] } as unknown as CardsBenchValue
  const reported: string[] = []
  const Detail = (p: { onSurface?: (s: string) => void }): ReturnType<typeof createElement> => {
    useEffect(() => { p.onSurface?.('huge'); reported.push('mounted') }, [])
    return createElement('div', null, 'DETAIL')
  }
  render(createElement(CardZoomOverlay, {
    stage, bench, running: false, onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
    onPatchParams: () => {}, renderStageView: (_o, fb) => fb,
    detail: Detail as never,
  }))
  // the detail mounted through the skeleton gate and its report rode.
  // GATE ON THE SIDE EFFECT, NOT THE DOM COMMIT (2026-09-12 flake
  // fix): findByText resolves the instant 'DETAIL' hits the DOM, but
  // the passive effect that pushes 'mounted' flushes a tick later —
  // under full-suite coverage instrumentation that tick once lost the
  // race and reported read [] with the text already found. waitFor on
  // the effect's own observable is deterministic at any speed; the
  // 4s cap stays as the LOUD break, never the mechanism.
  await screen.findByText('DETAIL', {}, { timeout: 4000 })
  await waitFor(() => { expect(reported).toEqual(['mounted']) })
  // the width law (framer strips inline width headless; the lane
  // proves the paint — this proves the decision)
  expect(zoomWidthFor(null)).toBe('min(760px, 94vw)') // width caps by vw (a vh cap clipped the right column)
  expect(zoomWidthFor('huge')).toBe('min(1160px, 94vw)')
})

test('the envelope is parsed through the spec doc (surface rides)', async () => {
  stubWire()
  const doc = await fetchFormSpec('img-to-mesh')
  expect(doc.layout).toBe('studio')
  expect(doc.size).toBe('huge')
})


afterEach(() => { cleanup(); vi.unstubAllGlobals() })
