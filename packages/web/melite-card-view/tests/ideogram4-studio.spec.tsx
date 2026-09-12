// @vitest-environment happy-dom
/**
 * The ideogram4 studio (the compositional-deconstruction editor ported
 * 1:1 from packages/image/ideogram4/src/ui/studio — the all-cards
 * order, 2026-09-12). Pins:
 *   - the registration itself (keyed under 'ideogram4', the ui-tool law)
 *   - THE SLOT BRIDGE: params.prompt IS the caption JSON string — the
 *     studio inflates it (flattenCaption), edits ride local values,
 *     Run reassembles (assembleCaption) into the patch FIRST, then runs
 *   - the canvas law: boxes render at % offsets from the 0–1000 bbox
 *   - element add → select → inspector; keyboard nudge (the grid law)
 *   - the aspect presets ride width/height (multiples of 16)
 *   - the generic fields (seed/steps) serve inside the rail; prompt/
 *     width/height NEVER render as generic fields (the studio owns them)
 *   - onSurface('huge')
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { Ideogram4Studio, ideogram4Studio } from '../src/client/ideogram4-studio.tsx'

const SPEC = {
  form: 'ideogram4',
  fields: [
    { name: 'prompt', label: 'Prompt', type: 'textarea', group: 'prompt' },
    { name: 'width', label: 'Width', type: 'number', default: 1024, group: 'resolution' },
    { name: 'height', label: 'Height', type: 'number', default: 1024, group: 'resolution' },
    { name: 'seed', label: 'Seed', type: 'seed', group: 'resolution' },
    { name: 'steps', label: 'Steps', type: 'number', default: 8, group: 'sampling' },
  ],
  model: 'ideogram',
  variants: [],
  size: 'huge',
}

/** A caption carrying one obj element (the wire spelling). */
const CAPTION = {
  high_level_description: 'a still life',
  style_description: { aesthetics: 'clean', art_style: 'loose watercolor washes', color_palette: ['#FF6B35'] },
  compositional_deconstruction: {
    background: 'a natural wood desk',
    elements: [
      { type: 'obj', desc: 'a ceramic mug', bbox: [100, 200, 400, 600] },
    ],
  },
}

function owner(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stageId: 's_i',
    cardName: 'ideogram4',
    row: { id: 's_i', params: { prompt: JSON.stringify(CAPTION), width: 1024, height: 1024, steps: 8 } },
    runStatus: '',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: vi.fn(),
    onSurface: vi.fn(),
    upstream: [],
    runId: null,
    ...over,
  }
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

test('registration: keyed under ideogram4 (the ui-tool built-in law)', () => {
  // the plugin object's apply injects the keyed registration
  expect(ideogram4Studio.name).toBe('ideogram4-studio')
})

test('the canvas inflates the caption: one obj box at the bbox % offsets, background as hint', async () => {
  stubWire()
  render(createElement(Ideogram4Studio, owner() as never))
  // the background renders BOTH halves (rail textarea + canvas hint)
  const bgHits = await screen.findAllByText('a natural wood desk', {}, { timeout: 4000 })
  expect(bgHits.length).toBe(2)
  // the element box: positioned left=20% top=10% w=40% h=30%
  // (bbox [100,200,400,600] ÷ 10) — queried by its % offsets (the tag
  // text also matches the list badge)
  const box = document.querySelector('[style*="left: 20%"]')
  expect(box).toBeTruthy()
  const st = (box as HTMLElement).style
  expect(st.left).toBe('20%')
  expect(st.top).toBe('10%')
  expect(st.width).toBe('40%')
  expect(st.height).toBe('30%')
  // the desc renders in BOTH halves (canvas box + list row)
  expect(screen.getAllByText('a ceramic mug').length).toBe(2)
})

test('+ Object adds a centered box, selects it, opens the inspector', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(Ideogram4Studio, owner({ row: { id: 's_i', params: { width: 1024, height: 1024 } } }) as never))
  await screen.findByText('Elements', {}, { timeout: 4000 })
  await user.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
  // the inspector opens: the type badge + the four bbox inputs
  expect(await screen.findByText('ymin')).toBeTruthy()
  expect(screen.getByText('xmax')).toBeTruthy()
  // centered: 350 wide/300 tall → xmin 325, ymin 350
  expect((screen.getByDisplayValue('350') as HTMLInputElement)).toBeTruthy()
  expect((screen.getByDisplayValue('325') as HTMLInputElement)).toBeTruthy()
})

test('keyboard nudge moves the selection by 10 grid units (the grid law)', async () => {
  stubWire()
  render(createElement(Ideogram4Studio, owner() as never))
  // select the mug's box by clicking it (the canvas tag — the one
  // whose box wrapper carries % offsets)
  await screen.findAllByText('obj', {}, { timeout: 4000 })
  const boxWrap = document.querySelector('[style*="left: 20%"]')
  expect(boxWrap).toBeTruthy()
  fireEvent.pointerDown(boxWrap?.querySelector('div div') as HTMLElement, { button: 0 })
  const before = (screen.getByDisplayValue('100') as HTMLInputElement).value
  fireEvent.keyDown(window, { key: 'ArrowDown' })
  await waitFor(() => {
    expect((screen.getByDisplayValue('110') as HTMLInputElement).value).toBe('110')
  })
  expect(before).toBe('100')
})

test('the aspect dropdown rides width/height into the Run patch (multiples of 16)', async () => {
  stubWire()
  const user = userEvent.setup()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  render(createElement(Ideogram4Studio, owner({ onPatch, onRun }) as never))
  await screen.findByRole('button', { name: 'Clear' }, {}, { timeout: 4000 })
  await user.selectOptions(screen.getByRole('combobox'), '1216x832')
  await user.click(screen.getByText('Run'))
  expect(onPatch).toHaveBeenCalledTimes(1)
  const patch = onPatch.mock.calls[0][0] as Record<string, unknown>
  expect(patch['width']).toBe(1216)
  expect(patch['height']).toBe(832)
  // patch-then-run (the drill's law)
  expect(onRun).toHaveBeenCalled()
})

test('THE SLOT BRIDGE round-trip: Run reassembles the edited caption into prompt', async () => {
  stubWire()
  const user = userEvent.setup()
  const onPatch = vi.fn()
  const onRun = vi.fn()
  render(createElement(Ideogram4Studio, owner({ onPatch, onRun }) as never))
  // edit the background (the rail textarea)
  const bg = await screen.findByDisplayValue('a natural wood desk', {}, { timeout: 4000 })
  await user.clear(bg)
  await user.type(bg, 'a marble counter')
  await user.click(screen.getByText('Run'))
  expect(onPatch).toHaveBeenCalledTimes(1)
  const patch = onPatch.mock.calls[0][0] as Record<string, unknown>
  const caption = JSON.parse(patch['prompt'] as string) as Record<string, unknown>
  expect(caption['high_level_description']).toBe('a still life')
  expect((caption['compositional_deconstruction'] as Record<string, unknown>)['background']).toBe('a marble counter')
  // the element rides the wire spelling: type/bbox/desc, NO local id
  const els = (caption['compositional_deconstruction'] as Record<string, unknown>)['elements'] as Array<Record<string, unknown>>
  expect(els.length).toBe(1)
  expect(els[0]).toEqual({ type: 'obj', desc: 'a ceramic mug', bbox: [100, 200, 400, 600] })
  // the style palette survives the round-trip
  const sd = caption['style_description'] as Record<string, unknown>
  expect(sd['aesthetics']).toBe('clean')
  // style_type derives from art_style (flatten) and re-derives the key (assemble)
  expect(sd['art_style']).toBe('loose watercolor washes')
  expect(sd['color_palette']).toEqual(['#FF6B35'])
})

test('the generic fields serve in the rail; the studio-owned keys never render as fields', async () => {
  stubWire()
  render(createElement(Ideogram4Studio, owner() as never))
  // seed + steps serve (the generic drill)
  expect(await screen.findByText('Seed', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.getByText('Steps')).toBeTruthy()
  // prompt/width/height NEVER render as generic fields — the studio owns them
  expect(screen.queryByLabelText('Prompt')).toBeNull()
  expect(screen.queryByLabelText('Width')).toBeNull()
  expect(screen.queryByLabelText('Height')).toBeNull()
})

test('the JSON tab previews the assembled caption; Apply imports pasted elements', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(Ideogram4Studio, owner({ row: { id: 's_i', params: { width: 1024, height: 1024 } } }) as never))
  await screen.findByText('Elements', {}, { timeout: 4000 })
  await user.click(screen.getByRole('button', { name: 'JSON' }))
  // the caption preview shows the wire shape
  expect(await screen.findByText(/compositional_deconstruction/)).toBeTruthy()
  // paste an elements array + Apply → the canvas gains the box
  const area = screen.getByPlaceholderText(/\[\{"type":"obj"/)
  fireEvent.change(area, { target: { value: '[{"type":"text","desc":"a slogan","text":"MELITE","bbox":[100,100,200,900]}]' } })
  await user.click(screen.getByRole('button', { name: 'Apply elements' }))
  expect(await screen.findByText('text')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /^Elements/ }))
  expect(screen.getByText('“MELITE”')).toBeTruthy()
})

test('the studio lifts the surface: onSurface(huge)', async () => {
  stubWire()
  const onSurface = vi.fn()
  render(createElement(Ideogram4Studio, owner({ onSurface }) as never))
  await screen.findByRole('button', { name: 'Clear' }, {}, { timeout: 4000 })
  expect(onSurface).toHaveBeenCalledWith('huge')
})
