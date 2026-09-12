/**
 * img-to-mesh-envelope — HOST envelope laws for the img-to-mesh card
 * (the zoom overlay's surface-size report + the spec doc's studio
 * shape). These test the BENCH host, not the card's studio (which
 * lives in @melite/3d-img-to-mesh's own tests since the
 * composition-root correction, 2026-09-12).
 */
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { createElement, useEffect } from 'react'
import { CardZoomOverlay, zoomWidthFor } from '../src/client/zoom.tsx'
import type { BenchStageRow, CardsBenchValue } from '../src/client/cards-resource.ts'
import { fetchFormSpec } from '../src/client/spec-form.tsx'

const SPEC = {
  form: 'img-to-mesh',
  layout: 'studio',
  size: 'huge',
  fields: [
    { name: 'input_image', label: 'Input image', type: 'image', group: 'input' },
    { name: 'seed', label: 'Seed', type: 'seed', group: 'input' },
    { name: 'resolution', label: 'Resolution', type: 'select', default: '1024', options: ['1024', '2048'], group: 'generation' },
    { name: 'steps', label: 'Steps', type: 'number', default: 12, group: 'generation' },
    { name: 'shape_steps', label: 'Shape steps', type: 'number', default: 8, group: 'stage' },
    { name: 'atlas_size', label: 'Atlas size', type: 'select', default: '2048', options: ['1024', '2048', '4096'], group: 'bake' },
  ],
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
  const stage = { id: 's_h', card: 'img-to-mesh', engine: 'comfyui', params: {} } as BenchStageRow
  const bench = { kind: 'bench', draftId: 'd', rev: 1, stages: [stage], log: [] } as unknown as CardsBenchValue
  const reported: string[] = []
  const Detail = (p: { onSurface?: (s: string) => void }): ReturnType<typeof createElement> => {
    useEffect(() => { p.onSurface?.('huge'); reported.push('mounted') }, [])
    return createElement('div', null, 'DETAIL')
  }
  render(createElement(CardZoomOverlay, {
    stage, bench, running: false, onRun: () => {}, onClose: () => {}, onRemoved: () => {}, onRewired: () => {},
    onPatchParams: () => {}, renderStageView: (_o, fb) => fb,
    detail: Detail as never,
  }))
  // the detail mounted through the skeleton gate and its report rode
  await screen.findByText('DETAIL', {}, { timeout: 4000 })
  expect(reported).toEqual(['mounted'])
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
