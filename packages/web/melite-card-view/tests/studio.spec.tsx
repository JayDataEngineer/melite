// @vitest-environment happy-dom
/**
 * The first-party studio surface (img-to-mesh) — the ui-tool built-in
 * law: the host package ships its own cards' views. Pins the view's
 * composition (exposed groups vs folded groups, the SSOT feeding it,
 * the patch-then-run law) and the registration itself (keyed under
 * 'img-to-mesh', the readToolview shape verbatim).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement, useEffect } from 'react'

import { ImgToMeshStudio, imgToMeshStudio } from '../src/client/img-to-mesh-studio.tsx'

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

const OWNER = {
  stageId: 's_0',
  cardName: 'img-to-mesh',
  row: { id: 's_0', params: { steps: 20 } },
  runStatus: '',
  onPatch: vi.fn(),
  onRun: vi.fn(),
  onStop: () => {},
  onRemove: vi.fn(),
  onSurface: () => {},
  upstream: [],
  wiredFrom: null,
  onWire: vi.fn(),
  runId: null,
}

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      return new Response(JSON.stringify(SPEC), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200 })
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

test('the studio composes the SSOT: exposed groups open, deep groups folded', async () => {
  stubWire()
  render(createElement(ImgToMeshStudio, { ...OWNER }))
  // the exposed head renders once the spec lands
  expect(await screen.findByText('Resolution', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.getByText('generation')).toBeTruthy()
  expect(screen.getByText('input')).toBeTruthy()
  // the folded groups ride DisclosureRow titles
  expect(screen.getByText('Stage passes')).toBeTruthy()
  expect(screen.getByText('Bake maps')).toBeTruthy()
  // folded fields do NOT render until the row is clicked (row-click law)
  expect(screen.queryByText('Shape steps')).toBeNull()
  expect(screen.queryByText('Atlas size')).toBeNull()
})

test('row-click opens a fold and reveals its SSOT fields', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(ImgToMeshStudio, { ...OWNER }))
  await screen.findByText('Bake maps', {}, { timeout: 4000 })
  await user.click(screen.getByText('Bake maps'))
  expect(await screen.findByText('Atlas size', {}, { timeout: 2000 })).toBeTruthy()
})

test('Run patches the domain FIRST, then starts (the generic drill law, kept)', async () => {
  stubWire()
  const user = userEvent.setup()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  render(createElement(ImgToMeshStudio, { ...OWNER, onPatch, onRun }))
  await screen.findByText('Run', {}, { timeout: 4000 })
  await user.click(screen.getByText('Run'))
  expect(onPatch).toHaveBeenCalledTimes(1)
  expect(onRun).toHaveBeenCalledTimes(1)
  // order: patch BEFORE run
  expect(onPatch.mock.invocationCallOrder[0]).toBeLessThan(onRun.mock.invocationCallOrder[0])
  // the seeded values: spec defaults UNDER the frozen row params
  const patch = onPatch.mock.calls[0][0] as Record<string, unknown>
  expect(patch['steps']).toBe(20) // frozen row wins
  expect(patch['resolution']).toBe('1024') // spec default seeds the rest
  // Remove rides the currency too
  await user.click(screen.getByText('Remove stage'))
  expect(OWNER.onRemove).toHaveBeenCalledTimes(1)
})

test('the registration is keyed under img-to-mesh (the readToolview shape)', () => {
  const registered: Array<{ name: string; key?: string }> = []
  const ctx = {
    slots: {
      inject: (_name: string, run: () => unknown) => { run() },
      register: (spec: { name: string; key?: string }) => { registered.push(spec); return () => {} },
    },
  }
  imgToMeshStudio.apply(ctx as never)
  expect(registered).toEqual([{ name: 'cards.stage.view', key: 'img-to-mesh' }])
})

test('the envelope lift: the detail reports, the card law answers', async () => {
  stubWire()
  const { CardZoomOverlay, zoomWidthFor } = await import('../src/client/zoom.tsx')
  const { BenchStageRow, CardsBenchValue } = await import('../src/client/cards-resource.ts')
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
  expect(zoomWidthFor(null)).toBe('min(760px, 88vh)')
  expect(zoomWidthFor('huge')).toBe('min(1160px, 94vw)')
})

test('the envelope is parsed through the spec doc (surface rides)', async () => {
  stubWire()
  const { fetchFormSpec } = await import('../src/client/spec-form.tsx')
  const doc = await fetchFormSpec('img-to-mesh')
  expect(doc.layout).toBe('studio')
  expect(doc.size).toBe('huge')
})
