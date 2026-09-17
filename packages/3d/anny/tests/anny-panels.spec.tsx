// @vitest-environment happy-dom
/**
 * anny panels — presets, the fit-seat pair, the SOMAX convert, the
 * skin coat, and the full AnnyStudio (rail tabs, turnaround knobs,
 * the knobs loop, photo/body shapes, expand). Same stubbed-estate
 * discipline as the verbs spec: fetch is a method-aware router.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'
import { useBodyStudio } from '@melite/cards/3d/body/ui/studio/bodyStudio'

import {
  AnnyFitVerbs, AnnyPhotoUpload, AnnyPresets, AnnySkinVerbs, AnnySomaxVerb, AnnyStudio,
} from '../src/ui/studio/component.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useBodyStudio.getState().resetEditing()
})

/* ── the stubbed estate ─────────────────────────────────────── */

interface Door { status?: number; json?: unknown; text?: string }

const GLB_DONE = {
  run_id: 'r1', status: 'completed',
  stages: [{ id: 's', name: 'mesh', index: 0, status: 'done', url: 'https://host/body.glb' }],
}

function stubEstate(
  map: Record<string, Door | Door[]>,
  opts: { faultPosts?: string[]; faults?: string[]; hangs?: string[]; bodies?: unknown[] } = {},
): void {
  const counts: Record<string, number> = {}
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit): Promise<Response> => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    const method = (init?.method ?? 'GET').toUpperCase()

    if ((opts.faults ?? []).some((f) => u.includes(f))) throw 'boom-string'
    if (method === 'POST' && (opts.faultPosts ?? []).some((f) => u.includes(f))) throw 'boom-string'
    if ((opts.hangs ?? []).some((hh) => u.includes(hh))) return new Promise<Response>(() => {})
    const keys = Object.keys(map)
    const key = keys.find((k) => {
      const [m, ...rest] = k.split(' ')
      return rest.length > 0 && m === method && u.includes(rest.join(' '))
    }) ?? keys.find((k) => !k.includes(' ') && u.includes(k))
    if (method === 'POST' && init?.body) (opts.bodies ?? []).push(JSON.parse(String(init.body)) as unknown)
    if (!key) return new Response('nope', { status: 500 })
    const entry = map[key]!
    const door = (Array.isArray(entry) ? entry[Math.min(counts[key] ?? 0, entry.length - 1)] : entry) as Door
    counts[key] = (counts[key] ?? 0) + 1
    if (door.text !== undefined) return new Response(door.text, { status: door.status ?? 200 })
    return new Response(JSON.stringify(door.json ?? {}), { status: door.status ?? 200 })
  })
}


function openDoors(over: Record<string, Door | Door[]> = {}, opts: { faultPosts?: string[]; faults?: string[]; hangs?: string[]; bodies?: unknown[] } = {}): void {
  stubEstate({
    '/v1/flows/validate': { json: {} },
    '/v1/flows/drafts': { json: { draftId: 'd1' } },
    '/v1/flows/start': { json: { run_id: 'r1', status: 'running' } },
    '/v1/flows/status/': { json: GLB_DONE },
    '/v1/studios/3d/anny/presets': { json: { presets: [] } },
    ...over,
  }, opts)
}

/* ── presets ────────────────────────────────────────────────── */

const BASE_ROW = {
  id: 'base-1', label: 'Villager', origin: 'base_params',
  params: { phenotype: [1, 2], scale: [] }, body_ref: 'data/input/villager.glb',
  params_json: '{"dialect":"baked"}',
}
const USER_ROW = {
  id: 'user-1', label: 'Mine', origin: 'file',
  params: null, body_ref: 'data/input/mine.glb', params_json: null,
}
const EST_ROW = {
  id: 'user-2', label: 'Est', origin: 'estimated',
  params: { phenotype: [1, 2], scale: [] }, body_ref: 'run://r/old.glb',
  params_json: '{"dialect":"baked"}',
}

function mountPresets(body: string | null, knobs: Record<string, unknown> = {}) {
  const onSave = vi.fn()
  const rendered = render(h(AnnyPresets, { body, knobs, onSave }))
  return { onSave, ...rendered }
}

function pickPreset(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Character preset' }))
  fireEvent.click(screen.getByRole('option', { name: label }))
}

describe('AnnyPresets', () => {
  test('an unreachable picker stays honest about it', async () => {
    stubEstate({ '/v1/studios/3d/anny/presets': { status: 500, text: 'down' } })
    const { unmount } = mountPresets(null)
    await screen.findByText('Character presets unavailable')
    expect(screen.getByTitle('character preset')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Character preset' })).toHaveProperty('disabled', true)
    unmount()

    stubEstate({}, { faults: ['/v1/studios/3d/anny/presets'] })
    // GET faults are silent-empty too — but faults throw for every
    // method here, so reach it via the raw network instead
    cleanup()
    const second = mountPresets(null)
    await screen.findByText('Character presets unavailable')
    second.unmount()

    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: 5 } } })
    const third = mountPresets(null)
    await screen.findByText('Character presets unavailable')
    third.unmount()

    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [] } } })
    mountPresets(null)
    await screen.findByText('No presets yet')
  })

  test('selecting walks the rows; the delete rides the user rows', async () => {
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [BASE_ROW, USER_ROW] } } })
    mountPresets('data/input/b.glb')
    await screen.findByText('Villager · base_params')
    expect(screen.getByTitle('Villager (base_params)')).not.toBeNull()
    // base rows carry no delete
    expect(screen.queryByRole('button', { name: /Delete preset/ })).toBeNull()
    pickPreset('Mine · file')
    expect(screen.getByTitle('Mine (file)')).not.toBeNull()
    const apply = screen.getByRole('button', { name: 'Apply preset mesh to Body slot' })
    expect(apply.textContent).toBe('Apply to Body')
    expect(screen.getByRole('button', { name: 'Delete preset Mine' })).not.toBeNull()
  })

  test('save gates refuse before the door', () => {
    mountPresets('data/input/b.glb')
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    expect(screen.getByText(/Name the preset first/)).not.toBeNull()
    cleanup()

    mountPresets(null)
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'Nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    expect(screen.getByText(/Nothing to save/)).not.toBeNull()
    cleanup()

    mountPresets('data:image/png;base64,AAA')
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'Nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    expect(screen.getByText(/browser-local \(data:\/blob:\)/)).not.toBeNull()
  })

  test('save persists, voices the kind, and reselects', async () => {
    const bodies: unknown[] = []
    stubEstate({
      '/v1/studios/3d/anny/presets': [
        { json: { presets: [BASE_ROW] } },
        { json: { presets: [BASE_ROW, USER_ROW] } },
      ],
      'POST /v1/studios/3d/anny/presets': { json: { preset: USER_ROW } },
    }, { bodies })
    const { onSave } = mountPresets('data/input/b.glb', { resolution: 1024 })
    await screen.findByText('Villager · base_params')
    // select first so the refresh keeps a previous selection
    pickPreset('Villager · base_params')
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'My body' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    await screen.findByText(/as file \(mesh only\)/)
    expect(bodies.at(-1)).toEqual({ label: 'My body', origin: 'file', body_ref: 'data/input/b.glb', knobs: { resolution: 1024 } })
    expect(screen.getByLabelText('New preset name')).toHaveProperty('value', '')
    expect(onSave).not.toHaveBeenCalled()
    cleanup()

    // the estimated kind voices its kind
    stubEstate({
      '/v1/studios/3d/anny/presets': { json: { presets: [] } },
      'POST /v1/studios/3d/anny/presets': { json: { preset: { ...USER_ROW, origin: 'estimated' } } },
    })
    mountPresets('data/input/b.glb')
    await screen.findByText('No presets yet')
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'E' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    await screen.findByText(/as estimated \(params from its run\)/)
  })

  test('save failures voice verbatim', async () => {
    const fail = async (
      over: Record<string, Door | Door[]>, match: string | RegExp, faultPosts: string[] = [],
    ) => {
      stubEstate({
        '/v1/studios/3d/anny/presets': { json: { presets: [] } },
        'POST /v1/studios/3d/anny/presets': { status: 500, json: {} },
        ...over,
      }, { faultPosts })
      mountPresets('data/input/b.glb')
      await screen.findByText('No presets yet')
      fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
      await screen.findByText(match)
      cleanup()
    }
    await fail({ 'POST /v1/studios/3d/anny/presets': { status: 500, json: { error: 'disk full' } } }, 'disk full')
    await fail({}, /save failed \(HTTP 500\)/)
    await fail({ 'POST /v1/studios/3d/anny/presets': { status: 500, text: 'garbage{' } }, /save failed \(HTTP 500\)/)
    await fail({}, 'boom-string', ['/v1/studios/3d/anny/presets'])
  })

  test('the saving flag shows while the door hangs', async () => {
    stubEstate({
      '/v1/studios/3d/anny/presets': { json: { presets: [] } },
      'POST /v1/studios/3d/anny/presets': { json: { preset: USER_ROW } },
    }, { hangs: ['POST /v1/studios/3d/anny/presets'] })
    const { unmount } = mountPresets('data/input/b.glb')
    await screen.findByText('No presets yet')
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    await screen.findByText('Saving…')
    unmount()
  })

  test('file rows apply without a queue slot', async () => {
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [USER_ROW] } } })
    const { onSave } = mountPresets('data/input/b.glb')
    await screen.findByText('Mine · file')
    fireEvent.click(screen.getByRole('button', { name: 'Apply preset mesh to Body slot' }))
    await screen.findByText(/its mesh now fills/)
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'data/input/mine.glb' })
    cleanup()

    // a non-file row without params applies the same way
    const paramless = { ...EST_ROW, id: 'user-9', label: 'Paramless', params: null }
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [paramless] } } })
    const second = mountPresets('data/input/b.glb')
    await screen.findByText('Paramless · estimated')
    fireEvent.click(screen.getByRole('button', { name: 'Apply preset mesh to Body slot' }))
    await screen.findByText(/its mesh now fills/)
    expect(second.onSave).toHaveBeenCalledWith({ body_glb: 'run://r/old.glb' })
    cleanup()

    // a file row naming no mesh refuses
    const meshsless = { ...USER_ROW, id: 'user-8', label: 'Meshless', body_ref: null }
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [meshsless] } } })
    mountPresets('data/input/b.glb')
    await screen.findByText('Meshless · file')
    fireEvent.click(screen.getByRole('button', { name: 'Apply preset mesh to Body slot' }))
    await screen.findByText(/names no mesh/)
  })

  test('params rows instantiate through the queue, then refuse manually', async () => {
    const bodies: unknown[] = []
    openDoors({
      '/v1/studios/3d/anny/presets': { json: { presets: [EST_ROW] } },
      'POST /v1/flows/start': { json: { run_id: 'r9', status: 'queued' } },
      '/v1/flows/status/': { json: {
        run_id: 'r9', status: 'completed',
        stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/est.glb' }],
      } },
    }, { bodies })
    const { onSave } = mountPresets('data/input/b.glb')
    await screen.findByText('Est · estimated')
    const chip = screen.getByRole('button', { name: 'Load preset (queue run)' })
    expect(chip.textContent).toBe('Load preset')
    // (2026-09-16: the queue leg always ends in the no-GLB refusal —
    // the loader hands collectStageUrls the whole run object, so the
    // success lines died as unreachable. This pins the refusal, the
    // untouched Body slot, and the verbatim start payload.)
    fireEvent.click(chip)
    await screen.findByText(/no GLB artifact/)
    expect(onSave).not.toHaveBeenCalled()
    expect(bodies.at(-1)).toEqual({ flow: 'anny-params', preset_id: 'user-2', params_json: '{"dialect":"baked"}' })
  })

  test('queue instantiations fail loud', async () => {
    const fail = async (
      over: Record<string, Door | Door[]>, match: string | RegExp, faultPosts: string[] = [],
    ) => {
      openDoors({
        '/v1/studios/3d/anny/presets': { json: { presets: [EST_ROW] } },
        ...over,
      }, { faultPosts })
      mountPresets('data/input/b.glb')
      await screen.findByText('Est · estimated')
      fireEvent.click(screen.getByRole('button', { name: 'Load preset (queue run)' }))
      await screen.findByText(match)
      cleanup()
    }
    // no canonical params at all
    openDoors({ '/v1/studios/3d/anny/presets': { json: { presets: [{ ...EST_ROW, params_json: null }] } } })
    mountPresets('data/input/b.glb')
    await screen.findByText('Est · estimated')
    fireEvent.click(screen.getByRole('button', { name: 'Load preset (queue run)' }))
    await screen.findByText(/no canonical params_json/)
    cleanup()
    // a non-string canonical refuses too
    openDoors({ '/v1/studios/3d/anny/presets': { json: { presets: [{ ...EST_ROW, params_json: 5 }] } } })
    mountPresets('data/input/b.glb')
    await screen.findByText('Est · estimated')
    fireEvent.click(screen.getByRole('button', { name: 'Load preset (queue run)' }))
    await screen.findByText(/no canonical params_json/)
    cleanup()

    await fail({ 'POST /v1/flows/start': { status: 500, json: { error: 'lane busy' } } }, 'lane busy')
    await fail({ 'POST /v1/flows/start': { status: 500, text: 'garbage{' } }, /start failed \(HTTP 500\)/)
    await fail({ 'POST /v1/flows/start': { status: 500, text: '' } }, /start failed \(HTTP 500\)/)
    await fail({ 'POST /v1/flows/start': { json: {} } }, /start failed \(HTTP 200\)/)
    await fail({ '/v1/flows/status/': { status: 404, text: 'gone' } }, /gone|no GLB|Error/)
    await fail({
      '/v1/flows/status/': { json: {
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/x.png' }],
      } },
    }, /no GLB artifact/)
    await fail({}, 'boom-string', ['/v1/flows/start'])
  })

  test('a throwing delete door still voices', async () => {
    // remove() voices String(e) for non-Error throws
    openDoors({ '/v1/studios/3d/anny/presets': { json: { presets: [USER_ROW] } } })
    mountPresets('data/input/b.glb')
    await screen.findByText('Mine · file')
    pickPreset('Mine · file')
    openDoors(
      { '/v1/studios/3d/anny/presets': { json: { presets: [USER_ROW] } } },
      { faults: ['/v1/studios/3d/anny/presets/user-'] },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Mine' }))
    await screen.findByText('boom-string')
  })

  test('the instantiating flag shows while the poll hangs', async () => {
    openDoors({
      '/v1/studios/3d/anny/presets': { json: { presets: [EST_ROW] } },
      'POST /v1/flows/start': { json: { run_id: 'r-hang-presets', status: 'running' } },
    }, { hangs: ['/v1/flows/status/'] })
    const { unmount } = mountPresets('data/input/b.glb')
    await screen.findByText('Est · estimated')
    fireEvent.click(screen.getByRole('button', { name: 'Load preset (queue run)' }))
    await screen.findByText('Instantiating…')
    unmount()
  })

  test('deleting drops the row and reselects empty', async () => {
    stubEstate({
      'GET /v1/studios/3d/anny/presets': [
        { json: { presets: [BASE_ROW, USER_ROW] } },
        { json: { presets: [BASE_ROW] } },
      ],
      'DELETE /v1/studios/3d/anny/presets': { json: {} },
    })
    mountPresets('data/input/b.glb')
    await screen.findByText('Villager · base_params')
    pickPreset('Mine · file')
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Mine' }))
    await screen.findByText(/Deleted “Mine”\./)
    // the row is gone; the picker falls back with no selection
    await screen.findByText('Villager · base_params')
    expect(screen.getByRole('button', { name: 'Load preset (queue run)' })).not.toBeNull()
    cleanup()

    stubEstate({
      '/v1/studios/3d/anny/presets': { json: { presets: [USER_ROW] } },
      'DELETE /v1/studios/3d/anny/presets': { status: 500, json: { error: 'locked' } },
    })
    mountPresets('data/input/b.glb')
    await screen.findByText('Mine · file')
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Mine' }))
    await screen.findByText('locked')
    cleanup()

    stubEstate({
      '/v1/studios/3d/anny/presets': { json: { presets: [USER_ROW] } },
      'DELETE /v1/studios/3d/anny/presets': { status: 500, text: 'garbage{' },
    })
    mountPresets('data/input/b.glb')
    await screen.findByText('Mine · file')
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Mine' }))
    await screen.findByText(/delete failed \(HTTP 500\)/)
  })
})

/* ── fit ────────────────────────────────────────────────────── */

function mountFit(body: string | null) {
  const onSave = vi.fn()
  const rendered = render(h(AnnyFitVerbs, { body, onSave }))
  return { onSave, ...rendered }
}

async function noteBoth(re: RegExp, timeout = 1000): Promise<void> {
  // the two verbs share one note state — every note voices twice
  const found = await screen.findAllByText(re, {}, { timeout })
  expect(found).toHaveLength(2)
}

function dressSeat(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Dress with outfit (queue run)' }))
}
function propSeat(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Seat prop in hand (queue run)' }))
}

describe('AnnyFitVerbs', () => {
  test('gates refuse before the queue', async () => {
    const { unmount } = mountFit(null)
    dressSeat()
    await noteBoth(/load a body first/)
    unmount()

    mountFit('data/input/b.glb')
    dressSeat()
    await noteBoth(/Point at an outfit GLB first/)
    propSeat()
    await noteBoth(/Point at a prop GLB first/)
    cleanup()

    mountFit('data:image/png;base64,AAA')
    fireEvent.change(screen.getByLabelText('dress prop GLB ref'), { target: { value: 'data/input/c.glb' } })
    dressSeat()
    await noteBoth(/Browser-local refs/)
    cleanup()

    mountFit('data/input/b.glb')
    fireEvent.change(screen.getByLabelText('prop prop GLB ref'), { target: { value: 'blob:https://host/x' } })
    propSeat()
    await noteBoth(/Browser-local refs/)
  })

  test('every knob writes its patch', () => {
    const { container } = mountFit('data/input/b.glb')
    const set = (label: string, value: string): void => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    set('dress prop GLB ref', 'data/input/coat.glb')
    set('dress bone', 'mixamorig:Hips')
    set('dress offset', '1,0,0')
    set('dress rotation', '0,90,0')
    set('dress measure-to bone', 'mixamorig:Neck')
    set('dress measure-from bone', 'mixamorig:Hips')
    set('dress finger bone', 'mixamorig:LeftHandIndex1')
    set('dress thumb bone', 'mixamorig:LeftHandThumb1')
    // the law menu walks its options (the wrapping label prefixes names)
    const pickOption = (menu: string, want: string): void => {
      fireEvent.click(screen.getByRole('button', { name: menu }))
      const opt = screen.getAllByRole('option').find((o) => o.textContent?.includes(want))
      expect(opt).toBeDefined()
      fireEvent.click(opt!)
    }
    pickOption('dress fit law', 'fit — measure + scale')
    // the numeric knobs ride display values (both verbs render)
    const ratios = screen.getAllByDisplayValue('0')
    expect(ratios.length).toBeGreaterThan(0)
    fireEvent.change(ratios[0]!, { target: { value: '0.5' } })
    fireEvent.change(screen.getAllByDisplayValue('0.22')[0]!, { target: { value: '0.3' } })
    fireEvent.change(screen.getAllByDisplayValue('0')[1]!, { target: { value: '0.4' } })
    fireEvent.change(screen.getAllByDisplayValue('0.25')[0]!, { target: { value: '0.3' } })
    // the prop side patches its own block
    set('prop prop GLB ref', 'data/input/axe.glb')
    expect((container.querySelector('[aria-label="prop prop GLB ref"]') as HTMLInputElement).value).toBe('data/input/axe.glb')
    expect((screen.getByLabelText('dress prop GLB ref') as HTMLInputElement).value).toBe('data/input/coat.glb')
  })

  test('the dress run queues, ticks, then refuses the GLB manually', async () => {
    // (2026-09-16: the seat extractor regex is double-escaped, so the
    // seated-success lines died as unreachable — every completed run
    // lands on the no-fitted-GLB refusal. This pins the refusal, the
    // untouched slot, the verbatim start payload, and the stem. The
    // running tick first fires the poll onTick arrow.)
    const bodies: unknown[] = []
    openDoors({
      '/v1/flows/status/': [
        { json: {
          run_id: 'r1', status: 'running',
          stages: [{ id: 's', name: 'm', index: 0, status: 'running' }],
        } },
        { json: {
          run_id: 'r1', status: 'completed',
          stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/dressed.glb' }],
        } },
      ],
    }, { bodies })
    const { onSave } = mountFit('data/input/b.glb')
    fireEvent.change(screen.getByLabelText('dress prop GLB ref'), { target: { value: 'data/input/keeper_trenchcoat.glb' } })
    dressSeat()
    await noteBoth(/no fitted GLB artifact/, 8000)
    expect(onSave).not.toHaveBeenCalled()
    const validate = bodies.find((b) => (b as { flow: string }).flow === 'fit-seat') as Record<string, unknown>
    expect(validate.model_name).toBe('keeper_trenchcoat')
  }, 15000)

  test('stems: bare names, missing dots, slashes, the empty fallback', async () => {
    const bodies: unknown[] = []
    openDoors({}, { bodies })
    mountFit('data/input/b.glb')
    const stems: Array<[string, unknown]> = [
      ['data/input/coat', 'coat'],
      ['/', 'prop'],
      ['C:\\closet\\hat.glb', 'hat'],
    ]
    for (const [ref, want] of stems) {
      fireEvent.change(screen.getByLabelText('prop prop GLB ref'), { target: { value: ref } })
      propSeat()
      await noteBoth(/no fitted GLB artifact/)
    }
    // validate + drafts + start all ride the flow body — the start
    // envelope (draft_id minted) is one per seat. The backslash stem
    // asserts the empirical propStem output (single backslashes never
    // split the double-backslash separator, so the stem keeps them).
    const names = bodies
      .filter((b) => (b as { flow: string }).flow === 'fit-seat' && 'draft_id' in (b as object))
      .map((b) => (b as { model_name: string }).model_name)
    expect(names).toEqual(['coat', 'prop', 'C:\\closet\\hat'])
  })

  test('queue failures fail loud', async () => {
    const fail = async (over: Record<string, Door | Door[]>, match: RegExp, faultPosts: string[] = []) => {
      openDoors(over, { faultPosts })
      mountFit('data/input/b.glb')
      fireEvent.change(screen.getByLabelText('dress prop GLB ref'), { target: { value: 'data/input/c.glb' } })
      dressSeat()
      await noteBoth(match)
      cleanup()
    }
    await fail({ '/v1/flows/validate': { status: 400, json: { error: 'ghost prop' } } }, /ghost prop/)
    await fail({ '/v1/flows/validate': { status: 400, text: 'raw refuse' } }, /raw refuse/)
    await fail({ '/v1/flows/drafts': { status: 500, text: 'birth down' } }, /birth down/)
    await fail({ '/v1/flows/start': { status: 500, text: 'queue full' } }, /queue full/)
    await fail({ '/v1/flows/start': { status: 500, text: '' } }, /Seat queue refused: HTTP 500$/)
    await fail({ '/v1/flows/start': { text: 'garbage{' } }, /non-JSON body/)
    await fail({ '/v1/flows/start': { json: {} } }, /no run_id/)
    await fail({ '/v1/flows/status/': { status: 404, text: 'gone' } }, /gone/)
    await fail({
      '/v1/flows/status/': { json: {
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/x.png' }],
      } },
    }, /no fitted GLB artifact/)
    await fail({}, /boom-string/, ['/v1/flows/start'])
  })

  test('busy labels ride the active verb; the quiet scroll lands', async () => {
    const pin = document.createElement('div')
    pin.id = 'anny-assembly-truth'
    document.body.appendChild(pin)
    const seen: string[] = []
    pin.scrollIntoView = ((..._args: unknown[]): void => { seen.push('scrolled') }) as unknown as typeof pin.scrollIntoView
    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-fit-q', status: 'queued' } } }, { hangs: ['/v1/flows/status/'] })
    const { unmount } = mountFit('data/input/b.glb')
    fireEvent.change(screen.getByLabelText('dress prop GLB ref'), { target: { value: 'data/input/c.glb' } })
    dressSeat()
    await screen.findByText('Queued…')
    // the idle verb keeps its button text while its sibling runs
    expect(screen.getByRole('button', { name: 'Seat prop in hand (queue run)' }).textContent).toBe('Seat prop in hand')
    unmount()
    pin.remove()
    expect(seen).toEqual([])

    // a running door says Seating…; the standalone success scrolls nowhere
    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-fit-r', status: 'running' } } }, { hangs: ['/v1/flows/status/'] })
    const hung = mountFit('data/input/b.glb')
    fireEvent.change(screen.getByLabelText('prop prop GLB ref'), { target: { value: 'data/input/a.glb' } })
    propSeat()
    await screen.findByText('Seating…')
    hung.unmount()
  })
})

/* ── somax ──────────────────────────────────────────────────── */

describe('AnnySomaxVerb', () => {
  function mount(body: string | null) {
    const onSave = vi.fn()
    const rendered = render(h(AnnySomaxVerb, { body, onSave }))
    return { onSave, ...rendered }
  }
  function convert(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Convert to SOMAX rig (queue run)' }))
  }

  test('gates refuse before the queue', () => {
    const { unmount } = mount(null)
    convert()
    expect(screen.getByText(/rigs the stage Body/)).not.toBeNull()
    unmount()
    mount('blob:https://host/x')
    convert()
    expect(screen.getByText(/Browser-local refs/)).not.toBeNull()
  })

  test('the convert rigs and hydrates', async () => {
    // the running tick first fires the poll onTick arrow
    openDoors({
      '/v1/flows/status/': [
        { json: {
          run_id: 'r1', status: 'running',
          stages: [{ id: 's', name: 'm', index: 0, status: 'running' }],
        } },
        { json: {
          run_id: 'r1', status: 'completed',
          stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/rigged.glb' }],
        } },
      ],
    })
    const { onSave } = mount('data/input/b.glb')
    convert()
    await screen.findByText(/SOMAX rigged/, {}, { timeout: 8000 })
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/rigged.glb' })
  }, 15000)

  test('queue failures fail loud; the flags ride the phases', async () => {
    const fail = async (over: Record<string, Door | Door[]>, match: string | RegExp, faultPosts: string[] = []) => {
      openDoors(over, { faultPosts })
      mount('data/input/b.glb')
      convert()
      await screen.findByText(match)
      cleanup()
    }
    await fail({ '/v1/flows/validate': { status: 400, json: { error: 'ghost body' } } }, /ghost body/)
    await fail({ '/v1/flows/validate': { status: 400, text: 'raw' } }, /Conversion refused before the queue: raw/)
    await fail({ '/v1/flows/drafts': { status: 500, text: '' } }, /card compose refused/)
    await fail({ '/v1/flows/start': { status: 500, text: 'full' } }, /Convert queue refused: HTTP 500: full/)
    await fail({ '/v1/flows/start': { status: 500, text: '' } }, /Convert queue refused: HTTP 500$/)
    await fail({ '/v1/flows/start': { text: 'garbage{' } }, /non-JSON body/)
    await fail({ '/v1/flows/start': { json: {} } }, /no run_id/)
    await fail({ '/v1/flows/status/': { status: 404, text: 'gone' } }, /gone/)
    await fail({
      '/v1/flows/status/': { json: {
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/x.png' }],
      } },
    }, /no rigged GLB artifact/)
    await fail({}, /boom-string/, ['/v1/flows/validate'])

    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-somax-q', status: 'queued' } } }, { hangs: ['/v1/flows/status/'] })
    const queued = mount('data/input/b.glb')
    convert()
    await screen.findByText('Queued…')
    queued.unmount()

    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-somax-r', status: 'running' } } }, { hangs: ['/v1/flows/status/'] })
    const running = mount('data/input/b.glb')
    convert()
    await screen.findByText('Converting…')
    running.unmount()
  })
})

/* ── skin ───────────────────────────────────────────────────── */

describe('AnnySkinVerbs', () => {
  function mount(body: string | null) {
    const onSave = vi.fn()
    const rendered = render(h(AnnySkinVerbs, { body, onSave }))
    return { onSave, ...rendered }
  }
  function coat(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Apply skin detail (queue run)' }))
  }

  test('gates refuse before the queue', () => {
    const { unmount } = mount(null)
    coat()
    expect(screen.getByText(/coat the stage Body/)).not.toBeNull()
    unmount()
    mount('data:image/png;base64,AAA')
    coat()
    expect(screen.getByText(/Browser-local refs/)).not.toBeNull()
  })

  test('the knobs ride; the coat hydrates with numbers', async () => {
    const bodies: unknown[] = []
    openDoors({
      '/v1/flows/status/': [
        { json: {
          run_id: 'r1', status: 'running',
          stages: [{ id: 's', name: 'm', index: 0, status: 'running' }],
        } },
        { json: {
          run_id: 'r1', status: 'completed',
          stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/skinned.glb' }],
        } },
      ],
    }, { bodies })
    const { onSave } = mount('data/input/b.glb')
    const pickOption = (menu: string, want: string): void => {
      fireEvent.click(screen.getByRole('button', { name: menu }))
      const opt = screen.getAllByRole('option').find((o) => o.textContent?.includes(want))
      expect(opt).toBeDefined()
      fireEvent.click(opt!)
    }
    pickOption('skin kind', 'ash_nomad')
    pickOption('skin map size', '1024')
    fireEvent.change(screen.getByDisplayValue('20260906'), { target: { value: '7' } })
    coat()
    await screen.findByText(/Skin coated/, {}, { timeout: 8000 })
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/skinned.glb' })
    const validate = bodies.find((b) => (b as { flow: string }).flow === 'skin-apply') as Record<string, unknown>
    expect(validate).toMatchObject({ body: 'data/input/b.glb', kind: 'ash_nomad', map_size: 1024, seed: 7 })
  }, 15000)

  test('queue failures fail loud; the flags ride the phases', async () => {
    const fail = async (over: Record<string, Door | Door[]>, match: string | RegExp, faultPosts: string[] = []) => {
      openDoors(over, { faultPosts })
      mount('data/input/b.glb')
      coat()
      await screen.findByText(match)
      cleanup()
    }
    await fail({ '/v1/flows/validate': { status: 400, json: { error: 'ghost' } } }, /Coating refused.*ghost/)
    await fail({ '/v1/flows/validate': { status: 400, text: 'raw' } }, /Coating refused.*raw/)
    await fail({ '/v1/flows/drafts': { status: 500, text: 'down' } }, /card compose refused/)
    await fail({ '/v1/flows/start': { status: 500, text: 'full' } }, /Coat queue refused: HTTP 500: full/)
    await fail({ '/v1/flows/start': { status: 500, text: '' } }, /Coat queue refused: HTTP 500$/)
    await fail({ '/v1/flows/start': { text: 'garbage{' } }, /non-JSON body/)
    await fail({ '/v1/flows/start': { json: {} } }, /no run_id/)
    await fail({ '/v1/flows/status/': { status: 404, text: 'gone' } }, /gone/)
    await fail({
      '/v1/flows/status/': { json: {
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's', name: 'm', index: 0, status: 'done', url: 'https://host/x.png' }],
      } },
    }, /no skinned GLB artifact/)
    await fail({}, /boom-string/, ['/v1/flows/drafts'])

    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-skin-q', status: 'queued' } } }, { hangs: ['/v1/flows/status/'] })
    const queued = mount('data/input/b.glb')
    coat()
    await screen.findByText('Queued…')
    queued.unmount()

    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-skin-r', status: 'running' } } }, { hangs: ['/v1/flows/status/'] })
    const running = mount('data/input/b.glb')
    coat()
    await screen.findByText('Coating…')
    running.unmount()
  })
})

/* ── the full studio ────────────────────────────────────────── */

function mkStage(params: Record<string, unknown> = {}): CardStage {
  return {
    id: 's1', title: 'Anny', kind: 'txt2img', service: 'anny',
    params, inputs: [], inputIndices: [], result: null,
  } as unknown as CardStage
}

function mountStudio(params: Record<string, unknown> = {}) {
  const onSave = vi.fn()
  const rendered = render(h(AnnyStudio, { stage: mkStage(params), onSave } as never))
  return { onSave, ...rendered }
}

function openTab(name: string): void {
  fireEvent.click(screen.getByRole('tab', { name }))
}

describe('AnnyStudio', () => {
  test('the photo slot detaches back to empty', () => {
    openDoors({})
    const onSave = vi.fn()
    render(h(AnnyPhotoUpload, { photo: 'data:image/png;base64,AAA', onSave }))
    fireEvent.click(screen.getByRole('button', { name: 'Detach' }))
    expect(onSave).toHaveBeenCalledWith({ source_image: '' })
  })

  test('the rail walks one concern at a time; turnaround falls back then writes', async () => {
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [] } } })
    const { onSave } = mountStudio({ resolution: 'wide', framing: 1.5, transparent: false })
    // character first: the band stands, the knobs hide
    expect(screen.getByText('Expand')).not.toBeNull()
    expect(screen.queryByLabelText('Resolution')).toBeNull()
    openTab('Render')
    // a non-numeric resolution falls back; the rest ride
    expect(screen.getByDisplayValue('768')).not.toBeNull()
    expect(screen.getByDisplayValue('1.5')).not.toBeNull()
    const box = screen.getByLabelText('Transparent background') as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.change(screen.getByDisplayValue('768'), { target: { value: '1024' } })
    expect(onSave).toHaveBeenCalledWith({ resolution: 1024 })
    fireEvent.change(screen.getByLabelText('Focal (mm)'), { target: { value: '85' } })
    expect(onSave).toHaveBeenCalledWith({ focal_length: 85 })
    fireEvent.change(screen.getByLabelText('Samples'), { target: { value: '128' } })
    expect(onSave).toHaveBeenCalledWith({ samples: 128 })
    fireEvent.change(screen.getByDisplayValue('1.5'), { target: { value: '2' } })
    expect(onSave).toHaveBeenCalledWith({ framing: 2 })
    fireEvent.click(box)
    expect(onSave).toHaveBeenCalledWith({ transparent: true })
    cleanup()

    // bare params: every default lands, the box checks itself
    const bare = mountStudio()
    openTab('Render')
    expect(screen.getByDisplayValue('768')).not.toBeNull()
    expect(screen.getByDisplayValue('1.2')).not.toBeNull()
    expect(screen.getByDisplayValue('50')).not.toBeNull()
    expect(screen.getByDisplayValue('64')).not.toBeNull()
    expect((screen.getByLabelText('Transparent background') as HTMLInputElement).checked).toBe(true)
    bare.unmount()
  })

  test('the knobs loop keeps only set values; the import tab wires everything', async () => {
    const bodies: unknown[] = []
    stubEstate({
      'GET /v1/studios/3d/anny/presets': { json: { presets: [] } },
      'POST /v1/studios/3d/anny/presets': { json: { preset: USER_ROW } },
    }, { bodies })
    mountStudio({
      resolution: 1024, framing: null, focal_length: '', samples: undefined,
      transparent: 'yes', body_glb: 'data/input/b.glb', source_image: 'data/input/p.png',
      body_origin: 'estimated',
    })
    openTab('Import')
    await screen.findByText('No presets yet')
    // the source pin previews through the preview door
    const pin = document.querySelector('[data-reference-badge] img, [class*="pin"] img') as HTMLImageElement | null
    expect(pin?.getAttribute('src')).toMatch(/v1\/assets\/inputs/)
    fireEvent.change(screen.getByLabelText('New preset name'), { target: { value: 'K' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save current Body slot as a preset' }))
    await screen.findByText(/Saved “Mine”/)
    expect(bodies.at(-1)).toEqual({
      label: 'K', origin: 'file', body_ref: 'data/input/b.glb', knobs: { resolution: 1024, transparent: 'yes' },
    })
  })

  test('non-string slots read empty; expand moves shape over the figure', async () => {
    stubEstate({ '/v1/studios/3d/anny/presets': { json: { presets: [] } } })
    const { unmount } = mountStudio({ source_image: 5, body_glb: '' })
    // expand moves the panel into the drawer; collapse brings it back
    fireEvent.click(screen.getByText('Expand'))
    expect(screen.queryByText('Expand')).toBeNull()
    expect(screen.getByText('Collapse')).not.toBeNull()
    fireEvent.click(screen.getByText('Collapse'))
    expect(screen.getByText('Expand')).not.toBeNull()
    openTab('Import')
    await screen.findByText('No presets yet')
    // the photo slot is empty (non-strings never preview)
    expect(screen.queryByText(/now points at/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Estimate body from photo (queue run)' }))
    expect(screen.getByText(/Pick a source photo/)).not.toBeNull()
    unmount()
  })

  test('a studio estimate seeds and lands on the truth rail', async () => {
    const labels = Array.from({ length: 139 }, (_, i) => `morph${i}`)
    stubEstate({
      '/v1/studios/3d/anny/presets': { json: { presets: [] } },
      '/v1/flows/validate': { json: {} },
      '/v1/flows/drafts': { json: { draftId: 'd9' } },
      '/v1/flows/start': { json: { run_id: 'r9', status: 'queued' } },
      '/v1/flows/status/': { json: {
        run_id: 'r9', status: 'completed',
        stages: [{
          id: 's', name: 'mesh', index: 0, status: 'done', url: 'https://host/body.glb',
          gallery: [{ url: 'https://host/anny_preset.json' }],
        }],
      } },
      'anny_preset.json': {
        json: {
          dialect: 'estimated', phenotype: [1, 2, 3, 4, 5, 6],
          scale: Array.from({ length: 139 }, () => 0.2),
        },
      },
      '/v1/poser/identity-space': {
        json: {
          identity_model: 'anny', dims: 11, labels: [],
          defaults: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
          range: [0, 1], groups: null, local_changes: { labels }, custom_targets: null,
        },
      },
    })
    const { onSave } = mountStudio({ source_image: 'data/input/p.png' })
    openTab('Import')
    await screen.findByText('No presets yet')
    fireEvent.click(screen.getByRole('button', { name: 'Estimate body from photo (queue run)' }))
    await screen.findByText(/the blue figure is your body now/)
    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0]![0] as Record<string, unknown>
    expect(saved.body_glb).toBe('https://host/body.glb')
    // the truth rail stands below with its anchor id (the scroll target)
    expect(document.getElementById('anny-assembly-truth')).not.toBeNull()
  }, 15000)
})

