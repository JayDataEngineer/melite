// @vitest-environment happy-dom
// studio.spec.tsx — THE DECLARATIVE STUDIO (primitive ④): one
// data-driven renderer over the form-spec SSOT — exposed groups
// open, deep groups folded, the patch-then-run law, the served-base
// layering, the mesh preview. Cards contribute ONLY the
// declaration (img-to-mesh is the first); every wall below rides
// the base, never a card package.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { DeclarativeStudio, defineStudioDeclaration } from '../src/studio.tsx'
import { schemaEnvelope } from '../src/spec.ts'

const DECLARATION = defineStudioDeclaration({
  model: 'img-to-mesh',
  expose: ['input', 'generation'],
  folds: {
    stage: 'Stage passes',
    mesh: 'Mesh',
    bake: 'Bake maps',
    lab: 'Lab (samplers & overrides)',
  },
  preview: 'mesh',
})

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

function studio(props: Record<string, unknown> = {}) {
  return createElement(DeclarativeStudio, { declaration: DECLARATION, ...OWNER, ...props } as never)
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

test('the declaration freezes (data, never machinery)', () => {
  expect(Object.isFrozen(DECLARATION)).toBe(true)
  expect(DECLARATION).toEqual({
    model: 'img-to-mesh',
    expose: ['input', 'generation'],
    folds: {
      stage: 'Stage passes',
      mesh: 'Mesh',
      bake: 'Bake maps',
      lab: 'Lab (samplers & overrides)',
    },
    preview: 'mesh',
  })
})

test('the studio composes the SSOT: exposed groups open, deep groups folded', async () => {
  stubWire()
  render(studio())
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
  render(studio())
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
  render(studio({
    onPatch, onRun,
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
  render(studio({
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

test("THE SLOT IS THE WIRE: picking an upstream output writes the param", async () => {
    stubWire()
    const onPatch = vi.fn()
    const onRun = vi.fn()
    const bound: Array<() => void> = []
    render(studio({
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
  render(studio())
  // the door's own words ride the head error face
  expect(await screen.findByText('estate door down', {}, { timeout: 4000 })).toBeTruthy()
})

test('the bound verb before the spec lands never patches (no spec, no run)', () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  render(studio({
    onPatch, onRun,
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
  render(studio({
    row: { id: 's_0' } as never, onPatch, onRun,
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
  render(studio({ onSurface }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(onSurface).toHaveBeenCalledWith('')
})

test('the served resolved map layers UNDER the user (never over it)', async () => {
  stubWire()
  const { rerender } = render(studio({
    row: { ...OWNER.row, params: { steps: 20 }, resolved: { steps: 99 } } as never,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the frozen user value wins; the served base only fills gaps
  expect(screen.getByDisplayValue('20')).toBeTruthy()
  expect(screen.queryByDisplayValue('99')).toBeNull()
  // degenerate bases stay degenerate (never a crash, never a layer):
  // null and array resolved maps both read as no base
  rerender(studio({ row: { ...OWNER.row, params: { steps: 20 }, resolved: null } as never }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(screen.getByDisplayValue('20')).toBeTruthy()
  rerender(studio({ row: { ...OWNER.row, params: { steps: 20 }, resolved: [] } as never }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(screen.getByDisplayValue('20')).toBeTruthy()
})

test('a key the frozen row drops patches null (the unset path)', async () => {
  stubWire()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  const props = (params: Record<string, unknown>) => ({
    row: { id: 's_0', params } as never, onPatch, onRun,
    bindRun: (r: () => void) => { bound.push(r) },
  })
  const { rerender } = render(studio(props({})))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the frozen row gains a key the user map never held: JSON Merge
  // Patch deletes it (null) on the next run
  rerender(studio(props({ steps: 20 })))
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
  render(studio())
  // the input section owns no fields in this doc: the honest note
  expect(await screen.findByText('no declared fields', {}, { timeout: 4000 })).toBeTruthy()
})

test('a landed artifact url leaves the empty preview face', async () => {
  stubWire()
  render(studio({
    row: { ...OWNER.row, result: { run_id: 'r1', url: '/m/mesh.glb' } } as never,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the row's own url seats the stage: the empty hint is gone
  expect(screen.queryByText('Run the card to see the mesh')).toBeNull()
})

test('blank run ids and urls seat nothing (never a poll on an empty string)', async () => {
  stubWire()
  const { rerender } = render(studio({
    row: { ...OWNER.row, result: { run_id: '', url: '' } } as never,
  }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  // the empty hint stays: no artifact, no poll
  expect(screen.getByText('Run the card to see the mesh')).toBeTruthy()
  // a null result is the same empty face (never a crash on the shape)
  rerender(studio({ row: { ...OWNER.row, result: null } as never }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(screen.getByText('Run the card to see the mesh')).toBeTruthy()
})
