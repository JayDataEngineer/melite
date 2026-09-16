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
import { schemaEnvelope } from '@melite/card-base'

const SPEC = {
  form: 'img-to-mesh',
  layout: 'studio',
  size: 'huge',
  schema: schemaEnvelope({
    input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', group: 'input' } } },
    seed: { type: 'number', meta: { description: 'Seed', extra: { wtype: 'seed', group: 'input' } } },
    resolution: { consts: ['1024', '2048'], meta: { description: 'Resolution', default: '1024', extra: { group: 'generation' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 12, step: 1, extra: { wtype: 'number', group: 'generation' } } },
    shape_steps: { type: 'number', meta: { description: 'Shape steps', default: 8, step: 1, extra: { wtype: 'number', group: 'stage' } } },
    atlas_size: { consts: ['1024', '2048', '4096'], meta: { description: 'Atlas size', default: '2048', extra: { group: 'bake' } } },
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

function stubWire(doc: unknown = SPEC, formStatus = 200): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      const body = formStatus === 200 ? JSON.stringify(doc) : JSON.stringify({ error: 'estate door down' })
      return new Response(body, { status: formStatus, headers: { 'content-type': 'application/json' } })
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

test('the run verb BINDS to the frame: patch the domain FIRST, then start (the drill law, kept)', async () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  // THE GESTURE SEAT MOVED (hour-26): the frame's top-bar pill owns
  // the button; the studio BINDS its patch-first verb through
  // bindRun — the pill can never start past un-flushed domain state
  // (the 1:1 law). No run/stop button renders in the studio body.
  const bound: Array<() => void> = []
  render(createElement(ImgToMeshStudio, {
    ...OWNER, onPatch, onRun,
    bindRun: (r: () => void) => { bound.push(r) },
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  await waitFor(() => { expect(bound.length).toBeGreaterThan(0) })
  expect(screen.queryByRole('button', { name: 'Run stage' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Stop run' })).toBeNull()
  expect(screen.queryByTestId('studio-progress')).toBeNull()
  bound[bound.length - 1]!()
  expect(onPatch).toHaveBeenCalledTimes(1)
  expect(onRun).toHaveBeenCalledTimes(1)
  // order: patch BEFORE run
  expect(onPatch.mock.invocationCallOrder[0]).toBeLessThan(onRun.mock.invocationCallOrder[0])
  // the seeded values: spec defaults UNDER the frozen row params
  const patch = onPatch.mock.calls[0][0] as Record<string, unknown>
  expect(patch['steps']).toBe(20) // frozen row wins
  // THE SETTINGS LAW: spec defaults DERIVE at compose — they never
  // ride the explicit map (presence IS the override mark)
  expect(patch['resolution']).toBeUndefined()
})

test('a live row binds stop; no studio-body progress face (the frame owns the fold)', async () => {
  stubWire()
  const onStop = vi.fn()
  render(createElement(ImgToMeshStudio, {
    ...OWNER,
    runStatus: 'running',
    row: { ...OWNER.row, result: { run_id: 'run-9', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' } },
    onStop,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the webhook strip + Stop pill ride the FRAME (the zoom bar) —
  // the studio body renders no gesture of its own
  expect(screen.queryByTestId('studio-progress')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Stop run' })).toBeNull()
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
    const bound: Array<() => void> = []
    render(createElement(ImgToMeshStudio, { ...OWNER,
      upstream: [{ id: 's_1', title: 'Boat gen', url: '/melite-media/runs/r9/gen/gen_00001_.png' }],
      onPatch, onRun,
      bindRun: (r: () => void) => { bound.push(r) },
    }))
    // the input square (the image field) — click opens the source menu
    const square = await screen.findByRole('button', { name: /Input image source/i })
    fireEvent.click(square)
    // the LIVE picker face is two-step (the flat picker is dead): the
    // menu first, then From flow's selector modal carries the rows
    const fromFlow = await screen.findByRole('menuitem', { name: /From flow/i })
    fireEvent.click(fromFlow)
    const row = await screen.findByTestId('source-pick-row')
    if (!row.textContent?.includes('Boat gen')) throw new Error('row lost its candidate label')
    fireEvent.click(row)
    // run (the BOUND verb — the frame pill's gesture): PATCH FIRST —
    // the picked url rides the params VERBATIM
    await waitFor(() => { expect(bound.length).toBeGreaterThan(0) })
    bound[bound.length - 1]!()
    await waitFor(() => {
      expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({
        input_image: '/melite-media/runs/r9/gen/gen_00001_.png',
      }))
    })
  })

test('a refused form-spec renders the loud error (never a blank rail)', async () => {
  stubWire(SPEC, 500)
  render(createElement(ImgToMeshStudio, { ...OWNER }))
  // the door's own words ride the head error face
  expect(await screen.findByText('estate door down', {}, { timeout: 4000 })).toBeTruthy()
})

test('the bound verb before the spec lands never patches (no spec, no run)', () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  render(createElement(ImgToMeshStudio, {
    ...OWNER, onPatch, onRun,
    bindRun: (r: () => void) => { bound.push(r) },
  }))
  // the spec has not landed: the loading face shows, the verb is a no-op
  expect(screen.getByText('loading the declared knob surface…')).toBeTruthy()
  bound[bound.length - 1]!()
  expect(onPatch).not.toHaveBeenCalled()
  expect(onRun).not.toHaveBeenCalled()
})

test('a row without params seeds the empty user map (the verb patches {})', async () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  render(createElement(ImgToMeshStudio, {
    ...OWNER, row: { id: 's_0' } as never, onPatch, onRun,
    bindRun: (r: () => void) => { bound.push(r) },
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  await waitFor(() => { expect(bound.length).toBeGreaterThan(0) })
  bound[bound.length - 1]!()
  expect(onPatch).toHaveBeenCalledWith({})
  expect(onRun).toHaveBeenCalledTimes(1)
})

test('a non-huge size class surfaces empty (the envelope lift)', async () => {
  stubWire({ ...SPEC, size: 'medium' })
  const onSurface = vi.fn()
  render(createElement(ImgToMeshStudio, { ...OWNER, onSurface }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(onSurface).toHaveBeenCalledWith('')
})

test('the served resolved map layers UNDER the user (never over it)', async () => {
  stubWire()
  render(createElement(ImgToMeshStudio, {
    ...OWNER,
    row: { ...OWNER.row, params: { steps: 20 }, resolved: { steps: 99 } } as never,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the frozen user value wins; the served base only fills gaps
  expect(screen.getByDisplayValue('20')).toBeTruthy()
  expect(screen.queryByDisplayValue('99')).toBeNull()
})

test('a key the frozen row drops patches null (the unset path)', async () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  const props = (params: Record<string, unknown>) => ({
    ...OWNER, row: { id: 's_0', params } as never, onPatch, onRun,
    bindRun: (r: () => void) => { bound.push(r) },
  })
  const { rerender } = render(createElement(ImgToMeshStudio, props({})))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the frozen row gains a key the user map never held: JSON Merge
  // Patch deletes it (null) on the next run
  rerender(createElement(ImgToMeshStudio, props({ steps: 20 })))
  await waitFor(() => { expect(bound.length).toBeGreaterThan(0) })
  bound[bound.length - 1]!()
  expect(onPatch).toHaveBeenCalledWith({ steps: null })
  expect(onRun).toHaveBeenCalled()
})

test('an exposed group with no declared fields says so', async () => {
  stubWire({
    ...SPEC,
    schema: schemaEnvelope({
      steps: { type: 'number', meta: { description: 'Steps', default: 12, step: 1, extra: { wtype: 'number', group: 'generation' } } },
    }),
  })
  render(createElement(ImgToMeshStudio, { ...OWNER }))
  // the input section owns no fields in this doc: the honest note
  expect(await screen.findByText('no declared fields', {}, { timeout: 4000 })).toBeTruthy()
})

test('a landed artifact url leaves the empty preview face', async () => {
  stubWire()
  render(createElement(ImgToMeshStudio, {
    ...OWNER,
    row: { ...OWNER.row, result: { run_id: 'r1', url: '/m/mesh.glb' } } as never,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the row's own url seats the stage: the empty hint is gone
  expect(screen.queryByText('Run the card to see the mesh')).toBeNull()
})


