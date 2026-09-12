// @vitest-environment happy-dom
/**
 * The first-party studio surface (img-to-mesh) — the ui-tool built-in
 * law: the host package ships its own cards' views. Pins the view's
 * composition (exposed groups vs folded groups, the SSOT feeding it,
 * the patch-then-run law) and the registration itself (keyed under
 * 'img-to-mesh', the readToolview shape verbatim).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement, useEffect } from 'react'

import { apply as imgToMeshApply, ImgToMeshStudio } from '../src/client/index.ts'

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
  imgToMeshApply(ctx as never)
  expect(registered).toEqual([{ name: 'cards.stage.view', key: 'img-to-mesh' }])
})

test("THE SLOT IS THE WIRE: picking an upstream output writes the param", async () => {
    stubWire()
    const onPatch = vi.fn()
    const onRun = vi.fn()
    render(createElement(ImgToMeshStudio, { ...OWNER,
      upstream: [{ id: 's_1', title: 'Boat gen', url: '/melite-media/runs/r9/gen/gen_00001_.png' }],
      onPatch, onRun,
    }))
    // the input square (the image field) — click opens the picker
    const square = await screen.findByRole('button', { name: /Input image source/i })
    fireEvent.click(square)
    // the picker menu (portal): the upstream output row
    const item = await screen.findByRole('menuitem', { name: /Boat gen/ })
    fireEvent.click(item)
    // run: PATCH FIRST — the picked url rides the params VERBATIM
    const runBtn = await screen.findByRole('button', { name: /^Run$/ })
    fireEvent.click(runBtn)
    await waitFor(() => {
      expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({
        input_image: '/melite-media/runs/r9/gen/gen_00001_.png',
      }))
    })
  })


