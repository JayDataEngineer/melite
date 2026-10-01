// @vitest-environment happy-dom
/**
 * The first-party studio surface (img-to-mesh) — the ui-tool built-in
 * law: the host package ships its own cards' views.
 *
 * Primitive ④ (2026-09-21): the card owns ONLY its surface
 * declaration + the seam registration. Every behavior wall (SSOT
 * composition, patch-then-run, polling, preview) rides the base's
 * DeclarativeStudio (`@melite/card-base` studio.spec) — this file
 * pins that the declaration seats the card's groups and that the
 * registration keys under 'img-to-mesh'.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { apply as imgToMeshApply, ImgToMeshStudio } from '../src/client/index.ts'
import { schemaEnvelope } from '@melite/card-base/client'

const SPEC = {
  form: 'img-to-mesh',
  layout: 'studio',
  size: 'huge',
  schema: schemaEnvelope({
    input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', group: 'input' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 12, step: 1, extra: { wtype: 'number', group: 'generation' } } },
    shape_steps: { type: 'number', meta: { description: 'Shape steps', default: 8, step: 1, extra: { wtype: 'number', group: 'stage' } } },
  }),
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

test("the declaration seats the card's partition over the base renderer", async () => {
  stubWire()
  render(createElement(ImgToMeshStudio, { ...OWNER }))
  // the base's loading face proves the machinery is the base's
  expect(screen.getByText('loading the declared knob surface…')).toBeTruthy()
  // the card's partition: generation exposed, stage folded
  expect(await screen.findByText('Steps', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.getByText('generation')).toBeTruthy()
  expect(screen.getByText('Stage passes')).toBeTruthy()
  expect(screen.queryByText('Shape steps')).toBeNull()
  // the mesh preview's empty face
  expect(screen.getByText('Run the card to see the mesh')).toBeTruthy()
})

test('the registration is keyed under img-to-mesh (the readToolview shape)', () => {
  const registered: Array<{ name: string; key?: string }> = []
  const ctx = {
    slots: {
      inject: (_name: string, run: () => unknown) => { run() },
      register: (spec: { name: string; key?: string }) => { registered.push(spec); return () => {} },
    },
  }
  imgToMeshApply(ctx as never)
  expect(registered).toEqual([{ name: 'cards.stage.view', key: 'img-to-mesh' }])
})
