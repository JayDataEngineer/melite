// @vitest-environment happy-dom
// studio.spec.tsx — THE DECLARATIVE STUDIO (primitive ④): one
// data-driven renderer over the form-spec SSOT — exposed groups
// open, deep groups folded, the patch-then-run law, the served-base
// layering, the mesh preview. Cards contribute ONLY the
// declaration (img-to-mesh is the first); every wall below rides
// the base, never a card package.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { DeclarativeStudio, defineStudioDeclaration } from '../src/studio.tsx'
import { schemaEnvelope } from '../src/spec.ts'

const DECLARATION = defineStudioDeclaration({
  model: 'img-to-mesh',
  expose: ['input', 'generation'],
  folds: {
    stage: { title: 'Stage passes', icon: 'branch' },
    mesh: { title: 'Mesh', icon: 'box' },
    bake: { title: 'Bake maps', icon: 'layers' },
    lab: { title: 'Lab (samplers & overrides)', icon: 'sliders' },
  },
  preview: 'mesh',
})

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
      stage: { title: 'Stage passes', icon: 'branch' },
      mesh: { title: 'Mesh', icon: 'box' },
      bake: { title: 'Bake maps', icon: 'layers' },
      lab: { title: 'Lab (samplers & overrides)', icon: 'sliders' },
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
  // each rendered fold row carries its OWN semantic glyph (the
  // ToolRow law: one svg per row, never a blanket fold icon; the
  // 'mesh'/'lab' folds render null here — their groups have no
  // fields in this SPEC)
  const foldRows = [screen.getByText('Stage passes'), screen.getByText('Bake maps')]
  for (const title of foldRows) {
    const row = title.closest('button, [role="button"], div')
    expect(row?.querySelector('svg')).toBeTruthy()
  }
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

// ── THE FAMILY AXIS (the schema-contract cure, 2026-10-18) ────────────
// The served spec's families arm is the card's declared model menu. A
// studio face that drops it serves a multi-family card with no way to
// switch family — the contract held on the wire and died at the face
// (img-to-mesh: three families, zero-axis drill). The axis renders
// from the SERVED arm, every declared family visible and pickable.
const FAMILIES_SPEC = {
  ...SPEC,
  families: [
    { id: 'pixal3d', present: true },
    { id: 'trellis2-native', present: false },
    { id: 'transfer-rig', present: false },
  ],
}

test("the served families render as the studio's Model axis (the schema contract's face half)", async () => {
  stubWire(FAMILIES_SPEC)
  render(studio())
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  fireEvent.click(screen.getByLabelText('Model'))
  const rows = screen.getAllByRole('menuitem')
  expect(rows.map((row) => row.textContent ?? ''))
    .toEqual(['Pixal3d', 'Trellis2 Native — not downloaded on this machine', 'Transfer Rig — not downloaded on this machine'])
  // not-downloaded families stay VISIBLE and pickable — the machine
  // truth rides the label, never a silent drop
  expect(rows[1]!.textContent).toContain('not downloaded on this machine')
})

test('a spec without families renders no Model axis (the axis is the contract, not decoration)', async () => {
  stubWire(SPEC)
  render(studio())
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  expect(screen.queryByRole('combobox', { name: 'Model' })).toBeNull()
})

test('a family pick lands as the run patch (the pick is a write, one atomic verb)', async () => {
  stubWire(FAMILIES_SPEC)
  const onPatch = vi.fn()
  const onRun = vi.fn()
  const bound: Array<() => void> = []
  render(studio({ onPatch, onRun, bindRun: (r: () => void) => { bound.push(r) } }))
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  fireEvent.click(screen.getByLabelText('Model'))
  fireEvent.click(screen.getByRole('menuitem', { name: /Trellis2 Native/ }))
  await waitFor(() => { expect(bound.length).toBeGreaterThan(0) })
  bound[bound.length - 1]!()
  // the pick stamps the model key; the run verb carries it in ONE patch
  expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ model: 'trellis2-native' }))
  expect(onRun).toHaveBeenCalledTimes(1)
})

test('a picked family survives the re-landed doc (the re-seed never snaps back to the row\'s family)', async () => {
  // THE HELD-KEY EXCEPTION (the family-axis cure's own wall): the
  // pick re-keys the spec hook on the picked family; when that
  // family's own doc LANDS, the user layer re-seeds from the frozen
  // row — the picked model key must survive the re-seed or the face
  // snaps back to the row's old family and lies. The re-landed doc
  // carries its own marker knob, so the wall waits on the DOC, not
  // on the combobox the pick already set.
  const FAMILY_DOC = {
    ...FAMILIES_SPEC,
    form: 'trellis2-native',
    schema: schemaEnvelope({
      input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', group: 'input' } } },
      resolution: { consts: ['1024', '2048'], meta: { description: 'Resolution', default: '1024', extra: { group: 'generation' } } },
      picked_knob: { type: 'number', meta: { description: 'Picked family knob', extra: { group: 'generation' } } },
    }),
  }
  const served = [FAMILIES_SPEC, FAMILY_DOC]
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      const doc = served.length > 1 ? served.shift()! : served[0]!
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200 })
  })
  render(studio())
  await screen.findByText('Resolution', {}, { timeout: 4000 })
  fireEvent.click(screen.getByLabelText('Model'))
  fireEvent.click(screen.getByRole('menuitem', { name: /Trellis2 Native/ }))
  // the picked family's own doc lands (its marker knob renders)
  await screen.findByText('Picked family knob', {}, { timeout: 4000 })
  // and the pick SURVIVED the re-seed — the axis still reads the
  // picked family, never the row's old one
  expect((screen.getByLabelText('Model') as HTMLButtonElement).textContent).toContain('Trellis2 Native')
})

describe('THE SETTINGS-EATER LAW (every edit fires through the door, 2026-10-21)', () => {
  // THE BURN CLASS (write-through.ts's own docstring, never wired):
  // an edit that lives only in component state dies with the view —
  // flip the tab, lose the knobs. The studio mounts the
  // write-through seat: every edit lands on the drafts door inside
  // the trailing window, discrete gestures fire NOW, and the press
  // routes its full patch through the seat's NOW (superseding every
  // queued row — one door write, never a stale re-fire after it).
  test('THE RED — a typed edit reaches the door WITHOUT a press (the trailing window)', async () => {
    stubWire()
    const onPatch = vi.fn()
    render(studio({ onPatch }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '24' } })
    await waitFor(() => {
      const edit = onPatch.mock.calls.map((c) => c[0] as Record<string, unknown>).find((p) => p['steps'] === 24)
      if (edit === undefined) throw new Error('the edit never reached the door; calls: ' + JSON.stringify(onPatch.mock.calls))
    }, { timeout: 4000 })
    expect(onPatch).toHaveBeenCalledTimes(1)
  })

  test('THE UNMOUNT SURVIVAL — the queued write fires after the studio dies (module-level rows)', async () => {
    stubWire()
    const onPatch = vi.fn()
    const view = render(studio({ onPatch }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '31' } })
    view.unmount()
    await waitFor(() => {
      const edit = onPatch.mock.calls.map((c) => c[0] as Record<string, unknown>).find((p) => p['steps'] === 31)
      if (edit === undefined) throw new Error('the queued write died with the mount; calls: ' + JSON.stringify(onPatch.mock.calls))
    }, { timeout: 4000 })
  })

  test('THE PRESS SUPERSEDE — a queued edit never re-fires after the press (one door write, the fresh value)', async () => {
    stubWire()
    const onPatch = vi.fn()
    const onRun = vi.fn()
    const bound: Array<() => void> = []
    render(studio({
      onPatch, onRun,
      bindRun: (r: () => void) => { bound.push(r) },
    }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '40' } })
    await waitFor(() => { if (bound.length === 0) throw new Error('run not bound') })
    bound[bound.length - 1]!()
    await waitFor(() => {
      const press = onPatch.mock.calls.map((c) => c[0] as Record<string, unknown>).find((p) => p['steps'] === 40)
      if (press === undefined) throw new Error('the press patch never fired; calls: ' + JSON.stringify(onPatch.mock.calls))
    }, { timeout: 4000 })
    // never a stale re-fire after the press write
    await new Promise((r) => setTimeout(r, 500))
    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onRun).toHaveBeenCalledTimes(1)
  })
})

describe('THE WRITE-REFUSAL FACE (R2-4-SYNC re-seated 2026-10-21 — a refused write voices, never escapes, never composes)', () => {
  // The r2 accuracy finding, REGRESSED by the studio collapse: r3's
  // catch was deleted whole, and the seat wiring re-landed with a
  // BARE send — a sync-throwing door escapes into the timer and the
  // press. The law: a refused write VOICES (console.warn), never
  // crashes its caller, and the press NEVER composes a row whose
  // own write did not land (the press-stops law) — but a refused
  // TRAILING write never kills a later healthy press (recovery).
  test('THE SYNC THROW — a door that throws at the press stops the run (no onRun), voices, and never escapes run()', async () => {
    stubWire()
    const onPatch = vi.fn(() => { throw new Error('door refused: cas lost') })
    const onRun = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bound: Array<() => void> = []
    render(studio({
      onPatch, onRun,
      bindRun: (r: () => void) => { bound.push(r) },
    }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '7' } })
    await waitFor(() => { if (bound.length === 0) throw new Error('run not bound') })
    let escaped: unknown = null
    try { bound[bound.length - 1]!() } catch (e) { escaped = e }
    expect(escaped).toBe(null)  // the throw never escapes the press
    await new Promise((r) => setTimeout(r, 500))
    expect(onRun).not.toHaveBeenCalled()  // a row whose write refused never composes
    expect(warn).toHaveBeenCalled()  // the refusal VOICES
    warn.mockRestore()
  })

  test('THE TRAILING THROW — a door that throws inside the trailing window voices and never crashes the timer', async () => {
    stubWire()
    const onPatch = vi.fn(() => { throw new Error('door refused: cas lost') })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(studio({ onPatch }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '9' } })
    await waitFor(() => {
      if (!onPatch.mock.calls.some((c) => (c[0] as Record<string, unknown>)['steps'] === 9)) {
        throw new Error('the trailing write never fired; calls: ' + JSON.stringify(onPatch.mock.calls))
      }
    }, { timeout: 4000 })
    await waitFor(() => { if (warn.mock.calls.length === 0) throw new Error('the refusal never voiced') }, { timeout: 4000 })
    warn.mockRestore()
  })

  test('THE PRESS RECOVERY — a refused trailing write never kills a later healthy press', async () => {
    stubWire()
    let refuse = true
    const onPatch = vi.fn((patch: Record<string, unknown>) => {
      if (refuse && patch['steps'] === 11) throw new Error('door refused: cas lost')
      return true
    })
    const onRun = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bound: Array<() => void> = []
    render(studio({
      onPatch, onRun,
      bindRun: (r: () => void) => { bound.push(r) },
    }))
    const field = await screen.findByLabelText('Steps', {}, { timeout: 4000 })
    fireEvent.change(field, { target: { value: '11' } })  // refused at the trailing window
    await waitFor(() => { if (warn.mock.calls.length === 0) throw new Error('the refusal never voiced') }, { timeout: 4000 })
    refuse = false  // the door heals
    await waitFor(() => { if (bound.length === 0) throw new Error('run not bound') })
    bound[bound.length - 1]!()
    await waitFor(() => { if (onRun.mock.calls.length === 0) throw new Error('the healthy press never ran') }, { timeout: 4000 })
    warn.mockRestore()
  })
})
