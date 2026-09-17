// @vitest-environment happy-dom
/**
 * anny verbs — the photo well, the HMR estimate, the fit-seat pair,
 * the SOMAX convert, the skin coat. Every queue door rides a stubbed
 * fetch router (method-aware keys, per-URL sequences, string-throw
 * faults); the poll door serves contract-valid docs; the identity
 * space serves a matching recipe world.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useBodyStudio } from '@melite/cards/3d/body/ui/studio/bodyStudio'

import {
  AnnyFitVerbs, AnnyHmrVerb, AnnyPhotoUpload, AnnySkinVerbs, AnnySomaxVerb,
} from '../src/ui/studio/component.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useBodyStudio.getState().resetEditing()
})

/* ── the stubbed estate ─────────────────────────────────────── */

interface Door { status?: number; json?: unknown; text?: string }

const PHENO = [1, 2, 3, 4, 5, 6]
const LABELS = Array.from({ length: 139 }, (_, i) => `morph${i}`)
const SPACE = {
  identity_model: 'anny', dims: 11, labels: [], defaults: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  range: [0, 1], groups: null, local_changes: { labels: LABELS }, custom_targets: null,
}
const RECIPE = {
  dialect: 'estimated', phenotype: PHENO,
  scale: Array.from({ length: 139 }, (_, i) => 0.1 + i * 0.001),
}

function doneDoc(urls: string[]) {
  return {
    run_id: 'r1', status: 'completed',
    stages: [{ id: 's', name: 'mesh', index: 0, status: 'done', url: urls[0], gallery: urls.slice(1).map((url) => ({ url })) }],
  }
}
const GLB_DONE = doneDoc(['https://host/body.glb'])

function stubEstate(
  map: Record<string, Door | Door[]>,
  faults: string[] = [],
  bodies: unknown[] = [],
  hangs: string[] = [],
): void {
  const counts: Record<string, number> = {}
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit): Promise<Response> => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    if (hangs.some((hh) => u.includes(hh))) return new Promise<Response>(() => {})
    if (faults.some((f) => u.includes(f))) throw 'boom-string'
    const method = (init?.method ?? 'GET').toUpperCase()
    const key = Object.keys(map).find((k) => {
      const [m, ...rest] = k.split(' ')
      return rest.length > 0 ? (m === method && u.includes(rest.join(' '))) : u.includes(k)
    })
    if (init?.method === 'POST' && init.body) bodies.push(JSON.parse(String(init.body)) as unknown)
    if (!key) return new Response('nope', { status: 500 })
    const entry = map[key]!
    const door = (Array.isArray(entry) ? entry[Math.min(counts[key] ?? 0, entry.length - 1)] : entry) as Door
    counts[key] = (counts[key] ?? 0) + 1
    if (door.text !== undefined) return new Response(door.text, { status: door.status ?? 200 })
    return new Response(JSON.stringify(door.json ?? {}), { status: door.status ?? 200 })
  })
}

/** The standard open doors: validate ok, birth ok, start queued, poll done. */
function openDoors(
  over: Record<string, Door | Door[]> = {},
  faults: string[] = [],
  bodies: unknown[] = [],
  hangs: string[] = [],
): void {
  stubEstate({
    '/v1/flows/validate': { json: {} },
    '/v1/flows/drafts': { json: { draftId: 'd1' } },
    '/v1/flows/start': { json: { run_id: 'r1', status: 'queued' } },
    '/v1/flows/status/': { json: GLB_DONE },
    ...over,
  }, faults, bodies, hangs)
}

/* ── the photo well ─────────────────────────────────────────── */

function pickFile(container: HTMLElement, file: File): void {
  const input = container.querySelector('[data-slot-input]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

describe('AnnyPhotoUpload', () => {
  function mount(photo: string | null, onSave: (p: Record<string, unknown>) => void = vi.fn()) {
    const rendered = render(h(AnnyPhotoUpload, { photo, onSave }))
    return { onSave, ...rendered }
  }

  test('refusals land before any POST', () => {
    const { container } = mount(null)
    pickFile(container, new File(['x'], 'n.txt', { type: 'text/plain' }))
    expect(screen.getAllByText(/not an image \(got text\/plain\)/)).toHaveLength(2)
    pickFile(container, new File(['x'], 'u.png', { type: '' }))
    expect(screen.getAllByText(/got unknown/)).toHaveLength(2)
    Object.defineProperty(File.prototype, 'size', { value: 21 * 1024 * 1024, configurable: true })
    pickFile(container, new File(['x'], 'big.png', { type: 'image/png' }))
    expect(screen.getAllByText(/over 20 MB/)).toHaveLength(2)
    Object.defineProperty(File.prototype, 'size', { value: 1, configurable: true })
  })

  test('the happy path uploads, previews, and points the slot', async () => {
    stubEstate({ '/v1/uploads': { json: { path: 'data/input/p.png' } } })
    const { container, onSave } = mount(null)
    pickFile(container, new File(['bytes'], 'p.png', { type: 'image/png' }))
    await screen.findAllByText(/now points at data\/input\/p\.png/).then((els) => {
      expect(els).toHaveLength(2)
    })
    expect(onSave).toHaveBeenCalledWith({ source_image: 'data/input/p.png' })
    // the bytes preview; the slot is still empty so the clear rides preview
    const img = container.querySelector('[data-slot-square] img') as HTMLImageElement
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    fireEvent.click(screen.getByRole('button', { name: 'Detach' }))
    expect(onSave).toHaveBeenCalledWith({ source_image: '' })
    expect(screen.queryByText(/now points at/)).toBeNull()
  })

  test('door failures voice verbatim', async () => {
    stubEstate({ '/v1/uploads': { text: 'nope{', status: 200 } })
    const { container } = mount(null)
    pickFile(container, new File(['b'], 'p.png', { type: 'image/png' }))
    expect(await screen.findAllByText(/non-JSON body/)).toHaveLength(2)
    cleanup()

    stubEstate({ '/v1/uploads': { status: 500, json: { error: 'disk full' } } })
    const second = mount(null)
    pickFile(second.container, new File(['b'], 'p.png', { type: 'image/png' }))
    expect(await screen.findAllByText('disk full')).toHaveLength(2)
    cleanup()

    stubEstate({ '/v1/uploads': { status: 500, json: {} } })
    const third = mount(null)
    pickFile(third.container, new File(['b'], 'p.png', { type: 'image/png' }))
    expect(await screen.findAllByText(/upload refused \(500\)/)).toHaveLength(2)
    cleanup()

    stubEstate({ '/v1/uploads': { json: { nope: 1 } } })
    const fourth = mount(null)
    pickFile(fourth.container, new File(['b'], 'p.png', { type: 'image/png' }))
    expect(await screen.findAllByText(/returned no path/)).toHaveLength(2)
    fourth.unmount()
  })

  test('a string rejection voices verbatim; the square mirrors its source', () => {
    stubEstate({}, ['/v1/uploads'])
    const { container, unmount } = mount(null)
    pickFile(container, new File(['b'], 'p.png', { type: 'image/png' }))
    return screen.findAllByText('boom-string').then((els) => {
      expect(els).toHaveLength(2)
      unmount()
      // https photos show; estate paths stay empty; nothing shows nothing
      const https = mount('https://host/p.png')
      expect(https.container.querySelector('[data-slot-square] img')).not.toBeNull()
      expect(screen.queryByRole('button', { name: 'Detach' })).not.toBeNull()
      https.unmount()
      const estate = mount('data/input/p.png')
      expect(estate.container.querySelector('[data-slot-square] img')).toBeNull()
      // the square is empty (estate paths are not preview URLs) — no Detach
      expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
      estate.unmount()
      mount('data:image/png;base64,AAA')
      expect(container.querySelector('[data-slot-square] img')).toBeNull()
      cleanup()
      mount(null)
      expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
    })
  })
})

/* ── HMR ────────────────────────────────────────────────────── */

describe('AnnyHmrVerb', () => {
  function mount(photo: string | null) {
    const onSave = vi.fn()
    const rendered = render(h(AnnyHmrVerb, { photo, onSave }))
    return { onSave, ...rendered }
  }
  function estimate(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Estimate body from photo (queue run)' }))
  }

  test('gates refuse before the queue', () => {
    const { unmount } = mount(null)
    estimate()
    expect(screen.getByText(/Pick a source photo/)).not.toBeNull()
    unmount()
    mount('data:image/png;base64,AAA')
    estimate()
    expect(screen.getByText(/browser-local \(data:\/blob:\)/)).not.toBeNull()
  })

  test('the happy path estimates, seeds the levers, and persists the draft', async () => {
    openDoors({
      '/v1/flows/status/': { json: doneDoc(['https://host/body.glb', 'https://host/anny_preset.json']) },
      'anny_preset.json': { json: RECIPE },
      '/v1/poser/identity-space': { json: SPACE },
    })
    const { onSave } = mount('data/input/p.png')
    estimate()
    await screen.findByText(/the blue figure is your body now/)
    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0]![0] as Record<string, unknown>
    expect(saved.body_glb).toBe('https://host/body.glb')
    const sculpt = saved.sculpt as { dialect: string; phenotype: number[]; local_changes: Record<string, number> }
    expect(sculpt.dialect).toBe('authored')
    expect(sculpt.phenotype).toEqual([1, 2, 3, 4, 5, 6, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(Object.keys(sculpt.local_changes)).toHaveLength(139)
    // the levers hold the seed too
    expect(useBodyStudio.getState().editing.coeffs).toEqual(sculpt.phenotype)
  })

  test('a running start ticks; a seed failure keeps the GLB', async () => {
    openDoors({
      '/v1/flows/start': { json: { run_id: 'r1', status: 'running' } },
      '/v1/flows/status/': [
        { json: { run_id: 'r1', status: 'running', stages: [] } },
        { json: doneDoc(['https://host/body.glb', 'https://host/anny_preset.json']) },
      ],
      'anny_preset.json': { json: { dialect: 'estimated', phenotype: [1, 2], scale: [] } },
      '/v1/poser/identity-space': { json: SPACE },
    })
    const { onSave } = mount('data/input/p.png')
    estimate()
    await screen.findByText(/Lever seed skipped:.*phenotype wants 6/, {}, { timeout: 8000 })
    expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/body.glb' })
  }, 15000)

  test('the queued flag shows while the poll hangs', async () => {
    // a hanging run id of its own — apiFetch dedups in-flight GETs by
    // URL, so a shared id would poison every later poll of that run
    openDoors({ '/v1/flows/start': { json: { run_id: 'r-hang-verbs', status: 'queued' } } }, [], [], ['/v1/flows/status/'])
    const { unmount } = mount('data/input/p.png')
    estimate()
    await screen.findByText('Queued…')
    unmount()
  })

  test('compile + queue refusals fail loud', async () => {
    openDoors({ '/v1/flows/validate': { status: 400, json: { error: 'ghost photo' } } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/Photo refused before the queue: ghost photo/)
    cleanup()

    openDoors({ '/v1/flows/validate': { status: 400, text: 'raw refuse' } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/Photo refused before the queue: raw refuse/)
    cleanup()

    openDoors({ '/v1/flows/drafts': { status: 500, text: 'birth down' } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/card compose refused: HTTP 500: birth down/)
    cleanup()

    openDoors({ '/v1/flows/start': { status: 500, text: 'queue full' } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/HMR queue refused: HTTP 500: queue full/)
    cleanup()

    openDoors({ '/v1/flows/start': { status: 500, text: '' } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/HMR queue refused: HTTP 500$/)
    cleanup()

    openDoors({ '/v1/flows/start': { text: 'garbage{' } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/HMR queue returned a non-JSON body/)
    cleanup()

    openDoors({ '/v1/flows/start': { json: {} } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/HMR queue returned no run_id/)
    cleanup()

    openDoors({ '/v1/flows/status/': { json: doneDoc(['https://host/x.png']) } })
    mount('data/input/p.png')
    estimate()
    await screen.findByText(/completed with no body GLB artifact/)
    cleanup()

    openDoors({}, ['/v1/flows/validate'])
    mount('data/input/p.png')
    estimate()
    await screen.findByText('boom-string')
  })

  test('recipe drift voices through the seed catch', async () => {
    const glbOnly = async (recipe: Door | null, space: unknown, match: string | RegExp, faults: string[] = []) => {
      const urls = recipe
        ? ['https://host/body.glb', 'https://host/anny_preset.json']
        : ['https://host/body.glb']
      openDoors({
        '/v1/flows/status/': { json: doneDoc(urls) },
        ...(recipe ? { 'anny_preset.json': recipe } : {}),
        '/v1/poser/identity-space': { json: space },
      }, faults)
      const { onSave } = mount('data/input/p.png')
      estimate()
      await screen.findByText(match)
      expect(onSave).toHaveBeenCalledWith({ body_glb: 'https://host/body.glb' })
      cleanup()
    }
    // no recipe beside the GLB
    await glbOnly(null, SPACE, /exposed no recipe artifact/)
    // the recipe door 404s
    await glbOnly({ status: 404, text: 'gone' }, SPACE, /recipe artifact HTTP 404/)
    // a foreign dialect refuses
    await glbOnly({ json: { dialect: 'authored', phenotype: PHENO, scale: RECIPE.scale } }, SPACE, /want "estimated"/)
    // a string fault voices verbatim through the seed catch
    await glbOnly({ json: RECIPE }, SPACE, /boom-string/, ['anny_preset.json'])
    // a labelless space still seeds (the labels ride empty)
    openDoors({
      '/v1/flows/status/': { json: doneDoc(['https://host/body.glb', 'https://host/anny_preset.json']) },
      'anny_preset.json': { json: { dialect: 'estimated', phenotype: PHENO, scale: [] } },
      '/v1/poser/identity-space': { json: { ...SPACE, local_changes: null } },
    })
    const { onSave } = mount('data/input/p.png')
    estimate()
    await screen.findByText(/the blue figure is your body now/)
    const saved = onSave.mock.calls[0]![0] as { sculpt: { local_changes: Record<string, number> } }
    expect(saved.sculpt.local_changes).toEqual({})
  })
})
