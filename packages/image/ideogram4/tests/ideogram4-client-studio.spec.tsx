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
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import type { ReactElement } from 'react'

import { apply as ideogram4Apply, Ideogram4Studio, name as studioName } from '../src/client/index.ts'
import { schemaEnvelope } from '@melite/card-base'

const SPEC = {
  form: 'ideogram4',
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    width: { type: 'number', meta: { description: 'Width', default: 1024, step: 1, extra: { wtype: 'number', group: 'resolution' } } },
    height: { type: 'number', meta: { description: 'Height', default: 1024, step: 1, extra: { wtype: 'number', group: 'resolution' } } },
    seed: { type: 'number', meta: { description: 'Seed', extra: { wtype: 'seed', group: 'resolution' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, step: 1, extra: { wtype: 'number', group: 'sampling' } } },
  }),
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

/** The served spec PLUS an elements passthrough: typing in its generic
 * row is the client's only external elements channel (the echo-guard
 * driver — params.elements never lands, the flatten seed wins). */
const SPEC_ELEMENTS = {
  ...SPEC,
  schema: schemaEnvelope({
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
    width: { type: 'number', meta: { description: 'Width', default: 1024, step: 1, extra: { wtype: 'number', group: 'resolution' } } },
    height: { type: 'number', meta: { description: 'Height', default: 1024, step: 1, extra: { wtype: 'number', group: 'resolution' } } },
    seed: { type: 'number', meta: { description: 'Seed', extra: { wtype: 'seed', group: 'resolution' } } },
    steps: { type: 'number', meta: { description: 'Steps', default: 8, step: 1, extra: { wtype: 'number', group: 'sampling' } } },
    elements: { type: 'string', meta: { description: 'Element JSON', extra: { wtype: 'textarea', group: 'layout' } } },
  }),
}

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      return new Response(JSON.stringify(SPEC), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200 })
  })
}

function stubWireElements(): void {
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    if (String(url).includes('/v1/form-spec')) {
      return new Response(JSON.stringify(SPEC_ELEMENTS), { status: 200, headers: { 'content-type': 'application/json' } })
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
  expect(studioName).toBe('ideogram4Studio')
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
  await screen.findByRole('button', { name: 'Clear' }, { timeout: 4000 })
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
  await screen.findByRole('button', { name: 'Clear' }, { timeout: 4000 })
  expect(onSurface).toHaveBeenCalledWith('huge')
})

// ─── Extended coverage (2026-09-16: per-file 100% mission) ───────────────────
// The client is a condensed single-component port of ui/studio with two
// host translations: feedback rides inline status text (no toasts), and
// the only commit channel is Run (prompt reassembled into the patch).
// Helpers below mirror the composite spec's, adapted to the client's faces.

function stdParams(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { prompt: JSON.stringify(CAPTION), width: 1024, height: 1024, steps: 8, ...extra }
}

type StudioMocks = {
  onPatch: ReturnType<typeof vi.fn>
  onRun: ReturnType<typeof vi.fn>
  onStop: ReturnType<typeof vi.fn>
  onRemove: ReturnType<typeof vi.fn>
  rerender: (ui: ReactElement) => void
}

/** Mount the full studio over explicit params; waits for nothing (callers wait).
 * `spec: 'elements'` serves the passthrough spec (the echo-guard driver). */
function mountStudio(params: Record<string, unknown>, over: Record<string, unknown> = {}, spec: 'std' | 'elements' = 'std'): StudioMocks {
  if (spec === 'elements') stubWireElements()
  else stubWire()
  vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {},
  } as DOMRect)
  const o = owner({ row: { id: 's_i', params }, ...over })
  const r = render(createElement(Ideogram4Studio, o as never))
  return {
    onPatch: o.onPatch as ReturnType<typeof vi.fn>,
    onRun: o.onRun as ReturnType<typeof vi.fn>,
    onStop: o.onStop as ReturnType<typeof vi.fn>,
    onRemove: o.onRemove as ReturnType<typeof vi.fn>,
    rerender: r.rerender,
  }
}

async function readyCount(n: number): Promise<void> {
  await screen.findByText(`Elements (${n})`, {}, { timeout: 4000 })
}

async function readyEmpty(): Promise<void> {
  await screen.findByText(/Drag on the canvas/, {}, { timeout: 4000 })
}

/** Click Run; the patch is the client's only commit channel. */
function runPatch(m: StudioMocks): Record<string, unknown> {
  fireEvent.click(screen.getByText('Run'))
  return m.onPatch.mock.calls.at(-1)![0] as Record<string, unknown>
}

function promptEls(patch: Record<string, unknown>): Array<Record<string, unknown>> {
  const cap = JSON.parse(patch['prompt'] as string) as {
    compositional_deconstruction: { elements: Array<Record<string, unknown>> },
  }
  return cap.compositional_deconstruction.elements
}

function promptSd(patch: Record<string, unknown>): Record<string, unknown> | undefined {
  const cap = JSON.parse(patch['prompt'] as string) as { style_description?: Record<string, unknown> }
  return cap.style_description
}

/** Positioned box divs (canvas container children with % offsets). */
function cBoxes(): HTMLElement[] {
  const bg = document.querySelector('[data-canvas-bg="1"]')!
  return Array.from(bg.parentElement!.children).filter((c) =>
    c instanceof HTMLElement && c !== bg && !c.hasAttribute('data-grid') && (c as HTMLElement).style.left !== '',
  ) as HTMLElement[]
}

/** The box's main surface (the only child carrying content). */
function boxMainOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.children).find((c) => c.childElementCount > 0)
  if (!found) throw new Error('boxMain not found')
  return found as HTMLElement
}

function handleOf(box: HTMLElement, left: string, top: string): HTMLElement {
  const found = Array.from(box.querySelectorAll('div')).find((d) =>
    (d as HTMLElement).style.left === left && (d as HTMLElement).style.top === top)
  if (!found) throw new Error(`handle ${left}/${top} not found`)
  return found as HTMLElement
}
const seHandleOf = (box: HTMLElement): HTMLElement => handleOf(box, '100%', '100%')
const nwHandleOf = (box: HTMLElement): HTMLElement => handleOf(box, '0%', '0%')
const nHandleOf = (box: HTMLElement): HTMLElement => handleOf(box, '50%', '0%')

/** An inspector field input by its label text. */
function fieldInput(label: string): HTMLInputElement {
  const input = screen.getByText(label).parentElement!.querySelector('input')
  if (!input) throw new Error(`no input for ${label}`)
  return input as HTMLInputElement
}

/** PNG bytes: signature + chunks (CRC zeroed — the parser never checks). */
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  new DataView(out.buffer).setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  return out
}
function pngFile(chunks: Uint8Array[], name = 'gen.png', type = 'image/png'): File {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const buf = new Uint8Array(sig.length + chunks.reduce((a, c) => a + c.length, 0))
  buf.set(sig, 0)
  let o = sig.length
  for (const c of chunks) { buf.set(c, o); o += c.length }
  return new File([buf], name, { type })
}
function pngText(keyword: string, value: string): Uint8Array {
  const enc = new TextEncoder()
  const kw = enc.encode(keyword)
  const val = enc.encode(value)
  const data = new Uint8Array(kw.length + 1 + val.length)
  data.set(kw, 0)
  data[kw.length] = 0
  data.set(val, kw.length + 1)
  return pngChunk('tEXt', data)
}
const MUG_INNER = JSON.stringify({
  compositional_deconstruction: {
    background: 'desk',
    elements: [{ type: 'obj', desc: 'pngmug', bbox: [10, 10, 100, 100] }],
  },
})
const PNG_MUG = () => pngFile([pngChunk('IHDR', new Uint8Array(13)), pngText('prompt', MUG_INNER), pngChunk('IEND', new Uint8Array(0))])
const PNG_PAIR = () => pngFile([
  pngText('prompt', JSON.stringify({ compositional_deconstruction: { background: '', elements: [
    { type: 'obj', desc: 'one', bbox: [10, 10, 100, 100] },
    { type: 'obj', desc: 'two', bbox: [200, 200, 300, 300] },
  ] } })),
  pngChunk('IEND', new Uint8Array(0)),
])
/** Raw-deflate bytes of a one-element caption (the corrupt-zTXt path). */
/** zlib-wrapped bytes of the same caption: Node's DecompressionStream
 * ('deflate') demands the wrapper while browsers take raw deflate — the
 * suite inflates through the wrapper so the success arm runs under happy-dom. */
const ZTXT_WRAPPED = new Uint8Array([120, 156, 53, 202, 203, 10, 131, 48, 16, 70, 225, 119, 249, 215, 41, 88, 232, 42, 175, 34, 82, 204, 100, 16, 47, 201, 136, 51, 1, 219, 144, 119, 47, 82, 92, 124, 155, 195, 169, 32, 73, 187, 232, 108, 179, 228, 113, 123, 71, 38, 201, 106, 71, 161, 43, 192, 87, 132, 145, 214, 233, 144, 146, 35, 60, 190, 118, 218, 35, 178, 174, 112, 224, 141, 19, 103, 83, 248, 190, 194, 62, 59, 195, 67, 194, 2, 135, 200, 74, 247, 156, 202, 4, 135, 16, 228, 132, 239, 159, 93, 231, 46, 175, 191, 161, 13, 173, 253, 0, 33, 101, 44, 1])
const ZTXT_RAW = new Uint8Array([53, 202, 203, 10, 131, 48, 16, 70, 225, 119, 249, 215, 41, 88, 232, 42, 175, 34, 82, 204, 100, 16, 47, 201, 136, 51, 1, 219, 144, 119, 47, 82, 92, 124, 155, 195, 169, 32, 73, 187, 232, 108, 179, 228, 113, 123, 71, 38, 201, 106, 71, 161, 43, 192, 87, 132, 145, 214, 233, 144, 146, 35, 60, 190, 118, 218, 35, 178, 174, 112, 224, 141, 19, 103, 83, 248, 190, 194, 62, 59, 195, 67, 194, 2, 135, 200, 74, 247, 156, 202, 4, 135, 16, 228, 132, 239, 159, 93, 231, 46, 175, 191, 161, 13, 173, 253, 0])
function ztxtChunk(keyword: string, compData: Uint8Array): Uint8Array {
  const enc = new TextEncoder()
  const kw = enc.encode(keyword)
  const data = new Uint8Array(kw.length + 2 + compData.length)
  data.set(kw, 0)
  data[kw.length] = 0
  data[kw.length + 1] = 0 // compression method: deflate
  data.set(compData, kw.length + 2)
  return pngChunk('zTXt', data)
}
const PNG_ZTXT = () => pngFile([ztxtChunk('prompt', ZTXT_WRAPPED), pngChunk('IEND', new Uint8Array(0))])

function pickInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('png input not found')
  return input as HTMLInputElement
}
function pickFile(file: File | null): void {
  Object.defineProperty(pickInput(), 'files', { value: file ? [file] : [], configurable: true })
  fireEvent.change(pickInput())
}

const ELS_EXT = JSON.stringify([{ type: 'obj', desc: 'ext', bbox: [100, 100, 200, 200] }])

describe('client caption bridge faces', () => {
  test('a prompt seated as an object inflates (the object arm)', async () => {
    mountStudio({ ...stdParams(), prompt: CAPTION as unknown as string })
    await readyCount(1)
    expect(screen.getAllByText('a ceramic mug').length).toBeGreaterThan(0)
  })

  test('garbage, numeric, and non-object params mount empty', async () => {
    mountStudio(stdParams({ prompt: '{oops' }))
    await readyEmpty()
    cleanup()
    mountStudio(stdParams({ prompt: 42 as unknown as string }))
    await readyEmpty()
    cleanup()
    // the row itself is not an object: params fall back to {}
    stubWire()
    const o = owner({ row: 'nope' as never })
    render(createElement(Ideogram4Studio, o as never))
    await readyEmpty()
  })

  test('zero and missing width ride 1024 into the footer', async () => {
    mountStudio(stdParams({ width: 0 }))
    await screen.findByText(/1024×1024 · 1 element/, {}, { timeout: 4000 })
    cleanup()
    mountStudio({ prompt: JSON.stringify(CAPTION), height: 1024, steps: 8 })
    await screen.findByText(/1024×1024 · 1 element/, {}, { timeout: 4000 })
    cleanup()
    mountStudio(stdParams({ height: 0 }))
    await screen.findByText(/1024×1024 · 1 element/, {}, { timeout: 4000 })
    cleanup()
    mountStudio({ prompt: JSON.stringify(CAPTION), width: 1024, steps: 8 })
    await screen.findByText(/1024×1024 · 1 element/, {}, { timeout: 4000 })
  })

  test('photo and art prompts seat the style face', async () => {
    mountStudio(stdParams({ prompt: JSON.stringify({ style_description: { photo: 'portra' }, compositional_deconstruction: { background: '', elements: [] } }) }))
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    expect(screen.getByText('Photo detail')).toBeTruthy()
    cleanup()
    mountStudio(stdParams({ prompt: JSON.stringify({ style_description: { art_style: 'oils' }, compositional_deconstruction: { background: '', elements: [] } }) }))
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    expect(screen.getByText('Art style')).toBeTruthy()
  })

  test('a prompt without a layout mounts empty; a string palette rides blank', async () => {
    mountStudio(stdParams({ prompt: '{}' }))
    await readyEmpty()
    cleanup()
    mountStudio(stdParams({
      prompt: JSON.stringify({
        style_description: { color_palette: 'x' },
        compositional_deconstruction: {},
      }),
    }))
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    expect((screen.getByPlaceholderText('#FF6B35, #F7B801') as HTMLInputElement).value).toBe('')
  })

  test('served resolved layers under the edits (object, junk, and null)', async () => {
    // object, string, array, and null resolved maps all mount the canvas
    for (const resolved of [{ steps: 99 }, 'str', [], null]) {
      const o = owner({ row: { id: 's_i', params: stdParams(), resolved } as never })
      stubWire()
      render(createElement(Ideogram4Studio, o as never))
      await readyCount(1)
      cleanup()
    }
  })

  test('a string cardName feeds the spec hook', async () => {
    mountStudio(stdParams(), { cardName: 'ideogram4' })
    expect(await screen.findByText('Seed', {}, { timeout: 4000 })).toBeTruthy()
  })
})

describe('client elements document + ingest', () => {
  /** The served spec's elements row is the only external channel. */
  async function elementsField(): Promise<HTMLElement> {
    return screen.findByLabelText('Element JSON', {}, { timeout: 4000 })
  }

  test('external elements seed through the ingest', async () => {
    mountStudio(stdParams(), {}, 'elements')
    await readyCount(1)
    fireEvent.change(await elementsField(), { target: { value: ELS_EXT } })
    await screen.findAllByText('ext', {}, { timeout: 4000 })
    expect(cBoxes().length).toBe(1)
  })

  test('an invalid external elements value keeps the canvas; Run sends []', async () => {
    const m = mountStudio(stdParams(), {}, 'elements')
    await readyCount(1)
    fireEvent.change(await elementsField(), { target: { value: 'oops' } })
    await waitFor(() => {
      expect(screen.getAllByText('a ceramic mug').length).toBe(2)
    })
    expect(promptEls(runPatch(m)).length).toBe(0)
  })

  test('an empty-string external elements clears to empty', async () => {
    mountStudio(stdParams(), {}, 'elements')
    await readyCount(1)
    fireEvent.change(await elementsField(), { target: { value: '' } })
    await readyEmpty()
  })

  test('retyping an ingested value replays the ingest (external reseed wins)', async () => {
    mountStudio(stdParams(), {}, 'elements')
    await readyCount(1)
    fireEvent.change(await elementsField(), { target: { value: ELS_EXT } })
    await screen.findAllByText('ext', {}, { timeout: 4000 })
    // a local commit lands on top…
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    // …then the parent re-seeds the ingested value: the ingest replays
    // and the local box falls out (the twin's second guard is deleted —
    // see the source proof: its taken arm can never fire)
    fireEvent.change(await elementsField(), { target: { value: ELS_EXT } })
    await waitFor(() => {
      expect(cBoxes().length).toBe(1)
    }, { timeout: 4000 })
    expect(screen.getAllByText('ext').length).toBeGreaterThan(0)
  })
})

describe('client inspector + list', () => {
  test('bbox inputs cross through the swap', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    // a second row rides along for the map passthrough
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    // mug bbox [100,200,400,600]: the row caption is its WxH
    fireEvent.click(screen.getByText('400×300'))
    const xmin = fieldInput('xmin')
    fireEvent.change(xmin, { target: { value: '700' } })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 600, 400, 700])
    const ymin = fieldInput('ymin')
    fireEvent.change(ymin, { target: { value: '500' } })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([400, 600, 500, 700])
    // clearing an input rides 0 through the clamp
    fireEvent.change(fieldInput('xmin'), { target: { value: '' } })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([400, 0, 500, 700])
  })

  test('text content + font + a font chip ride the wire', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getAllByRole('button', { name: '+ Text' })[0]!)
    await screen.findByText('Text content')
    const textEl = screen.getByText('Text content').parentElement!.querySelector('input')!
    fireEvent.change(textEl, { target: { value: 'MELITE' } })
    const fontEl = screen.getByText('Font').parentElement!.querySelector('input')!
    fireEvent.change(fontEl, { target: { value: 'futura' } })
    fireEvent.change(screen.getByPlaceholderText('what this element depicts'), { target: { value: 'a slogan' } })
    expect(promptEls(runPatch(m))[0]).toMatchObject({ type: 'text', desc: 'a slogan', text: 'MELITE', font: 'futura' })
    // a font chip seats its preset descriptor
    fireEvent.click(screen.getByText('bold geometric sans-serif'))
    expect(promptEls(runPatch(m))[0]).toMatchObject({ font: 'bold geometric sans-serif, all caps' })
  })

  test('an obj inspector hides the text faces', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    expect(screen.queryByText('Text content')).toBeNull()
    expect(screen.queryByText('Font')).toBeNull()
  })

  test('inspector reorder + duplicate + delete ride the order', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    // the copy seats behind the source, selected
    fireEvent.click(screen.getByText('Dup'))
    expect(promptEls(runPatch(m)).length).toBe(3)
    // send the copy to back, then to front, then drop it
    fireEvent.click(screen.getByText('↓'))
    expect(promptEls(runPatch(m)).map((e) => e['desc'])).toEqual(['', 'a ceramic mug', ''])
    fireEvent.click(screen.getByText('↑'))
    expect(promptEls(runPatch(m)).map((e) => e['desc'])).toEqual(['a ceramic mug', '', ''])
    fireEvent.click(screen.getByText('✕'))
    expect(promptEls(runPatch(m)).length).toBe(2)
  })

  test('row actions flip the order and drop rows', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    // rows reverse: the fresh box rides on top
    fireEvent.click(screen.getAllByTitle('send to back')[0]!)
    expect(promptEls(runPatch(m))[0]!.desc).toBe('')
    fireEvent.click(screen.getAllByTitle('send to back')[0]!)
    expect(promptEls(runPatch(m))[0]!.desc).toBe('a ceramic mug')
    fireEvent.click(screen.getAllByTitle('duplicate')[0]!)
    expect(promptEls(runPatch(m)).length).toBe(3)
    // the duplicate selects its copy (inspector up): escape back to the rows
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(3)
    fireEvent.click(screen.getAllByTitle('delete')[0]!)
    expect(promptEls(runPatch(m)).length).toBe(2)
    // the mug rides last (back): bringing it forward seats it front
    fireEvent.click(screen.getAllByTitle('bring to front').at(-1)!)
    expect(promptEls(runPatch(m))[1]!.desc).toBe('a ceramic mug')
  })

  test('row click selects; ctrl-click toggles a pair', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    const rows = () => document.querySelectorAll('[class*="ideoRowOn"]')
    // plain row click selects into the inspector…
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    // a row ctrl-click toggles a single selection (the row arm)…
    fireEvent.click(screen.getByText('400×300'), { ctrlKey: true })
    await screen.findByText('Description')
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    // …canvas ctrl-clicks toggle a two-selection that keeps the list up
    const mugMain = () => boxMainOf(cBoxes()[0]!)
    const boxMain = () => boxMainOf(cBoxes()[1]!)
    fireEvent.pointerDown(mugMain(), { button: 0, ctrlKey: true, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(mugMain(), { pointerId: 1 })
    fireEvent.pointerDown(boxMain(), { button: 0, ctrlKey: true, clientX: 325, clientY: 350, pointerId: 1 })
    fireEvent.pointerUp(boxMain(), { pointerId: 1 })
    await waitFor(() => {
      expect(rows().length).toBe(2)
    })
    // toggling one off falls back to the single inspector
    fireEvent.pointerDown(mugMain(), { button: 0, ctrlKey: true, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(mugMain(), { pointerId: 1 })
    await screen.findByText('Description')
  })

  test('palette: enter-adds, invalid rest, swatch removes, preset seats', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    const add = await screen.findByPlaceholderText('#RRGGBB')
    fireEvent.change(add, { target: { value: '#00ff00' } })
    fireEvent.keyDown(add, { key: 'Enter' })
    expect(promptEls(runPatch(m))[0]!.color_palette).toEqual(['#00FF00'])
    // junk never seats
    fireEvent.change(add, { target: { value: 'bogus' } })
    fireEvent.keyDown(add, { key: 'Enter' })
    expect(promptEls(runPatch(m))[0]!.color_palette).toEqual(['#00FF00'])
    // short hex expands
    fireEvent.change(add, { target: { value: 'abc' } })
    fireEvent.keyDown(add, { key: 'Enter' })
    expect(promptEls(runPatch(m))[0]!.color_palette).toEqual(['#00FF00', '#AABBCC'])
    // the swatch removes its own entry
    fireEvent.click(screen.getByTitle('#00FF00 — click to remove'))
    expect(promptEls(runPatch(m))[0]!.color_palette).toEqual(['#AABBCC'])
    // a preset chip seats its colors wholesale
    fireEvent.click(screen.getByText('Sunset'))
    expect(promptEls(runPatch(m))[0]!.color_palette).toEqual(['#FF6B35', '#F7B801', '#7B2D26'])
  })

  test('a full palette hides the add input', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]')
    fireEvent.change(area, {
      target: { value: JSON.stringify([{ type: 'obj', desc: 'full', bbox: [10, 10, 100, 100], color_palette: ['#111111', '#222222', '#333333', '#444444', '#555555'] }]) },
    })
    fireEvent.click(screen.getByText('Apply elements'))
    await screen.findByText('full')
    fireEvent.click(screen.getByText('Elements (1)'))
    fireEvent.click(screen.getByText('90×90'))
    await screen.findByText('Description')
    expect(screen.queryByPlaceholderText('#RRGGBB')).toBeNull()
  })

  test('the add input ignores non-Enter keys', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    const add = await screen.findByPlaceholderText('#RRGGBB')
    fireEvent.change(add, { target: { value: '#00ff00' } })
    fireEvent.keyDown(add, { key: 'a' })
    expect(promptEls(runPatch(m))[0]).not.toHaveProperty('color_palette')
  })

  test('an obj row without desc shows the dash; text without text shows its type', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    await screen.findByText('—')
    fireEvent.click(screen.getAllByRole('button', { name: '+ Text' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await screen.findByText('“text”')
  })

  test('+ Logo rides the empty state (never the toolbar)', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    expect(screen.getAllByRole('button', { name: '+ Text' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: '+ Logo' }).length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: '+ Logo' }))
    await screen.findByText('Text content')
    // logo: 500 wide, 200 tall → xmin 250, ymin 400
    expect((screen.getByDisplayValue('250') as HTMLInputElement)).toBeTruthy()
    expect((screen.getByDisplayValue('400') as HTMLInputElement)).toBeTruthy()
    expect(m.onPatch).not.toHaveBeenCalled()
  })

  test('the empty state seats boxes without the toolbar', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' }).at(-1)!)
    await readyCount(1)
    expect(promptEls(runPatch(m)).length).toBe(1)
    cleanup()
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getAllByRole('button', { name: '+ Text' }).at(-1)!)
    await readyCount(1)
    expect(screen.getByText('Text content')).toBeTruthy()
  })
})

describe('client style tab', () => {
  test('a style preset seeds every field', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    fireEvent.click(screen.getByText('Cinematic photo'))
    expect((screen.getByDisplayValue('cinematic, dramatic, shallow depth of field') as HTMLInputElement)).toBeTruthy()
    const patch = runPatch(m)
    expect(promptSd(patch)).toMatchObject({
      aesthetics: 'cinematic, dramatic, shallow depth of field',
      lighting: 'golden hour rim light, soft fill',
      medium: '35mm film, anamorphic',
      photo: 'shot on Kodak Portra 400, grainy, natural color',
      color_palette: ['#2B1810', '#C9A063', '#F2E8DC'],
    })
  })

  test('a style pill with every field blank drops the style block', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    fireEvent.click(screen.getByText('photo'))
    expect(promptSd(runPatch(m))).toBeUndefined()
  })

  test('HLD + detail fields + pills round-trip', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('Style'))
    fireEvent.change(screen.getByDisplayValue('a still life'), { target: { value: '' } })
    expect(JSON.parse(runPatch(m)['prompt'] as string)).not.toHaveProperty('high_level_description')
    expect(promptSd(runPatch(m))?.art_style).toBe('loose watercolor washes')
    fireEvent.change(screen.getByDisplayValue('loose watercolor washes'), { target: { value: 'portra-x' } })
    expect(promptSd(runPatch(m))?.art_style).toBe('portra-x')
    // the photo pill swaps the face and the key
    fireEvent.click(screen.getByText('photo'))
    expect(screen.getByText('Photo detail')).toBeTruthy()
    expect(promptSd(runPatch(m))?.photo).toBe('portra-x')
    // back to art, then none drops the style block wholesale
    fireEvent.click(screen.getByText('art_style'))
    expect(screen.getByText('Art style')).toBeTruthy()
    fireEvent.click(screen.getByText('none'))
    expect(screen.queryByText('Photo detail')).toBeNull()
    expect(promptSd(runPatch(m))).toBeUndefined()
  })

  test('the style palette scrubs and caps at eight swatches', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getByText('Style'))
    const hex = screen.getByPlaceholderText('#FF6B35, #F7B801')
    fireEvent.change(hex, { target: { value: 'red, #00ff00, #111111, #222222, #333333, #444444, #555555, #666666, #777777, #888888, #999999' } })
    await waitFor(() => {
      expect(document.querySelectorAll('span[style*="background"]').length).toBe(8)
    })
    expect((hex as HTMLInputElement).value).toContain('red')
  })
})

describe('client JSON tab', () => {
  test('invalid JSON warns and locks Apply; valid unlocks', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]')
    expect(screen.getByText('Apply elements').closest('button')!.disabled).toBe(true)
    for (const bad of ['"str"', '[1]', '[{"type":"x","desc":"d"}]', '[{"type":"obj"}]', '[{"type":"obj","desc":"d","bbox":{}}]']) {
      fireEvent.change(area, { target: { value: bad } })
      expect(await screen.findByText('invalid elements JSON')).toBeTruthy()
      expect(screen.getByText('Apply elements').closest('button')!.disabled).toBe(true)
    }
    fireEvent.change(area, { target: { value: '[{"type":"obj","desc":"ok","bbox":[1,1,50,50]}]' } })
    await waitFor(() => {
      expect(screen.queryByText('invalid elements JSON')).toBeNull()
    })
    expect(screen.getByText('Apply elements').closest('button')!.disabled).toBe(false)
  })

  test('Apply imports the paste with a status', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    fireEvent.click(screen.getByText('JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]')
    fireEvent.change(area, { target: { value: '[{"type":"obj","desc":"pasted","bbox":[10,10,60,60]}]' } })
    fireEvent.click(screen.getByText('Apply elements'))
    await screen.findByText('Loaded 1 element from JSON paste')
    expect(cBoxes().length).toBe(1)
  })

  test('copy caption flips the status; a missing clipboard stays silent', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Copy caption'))
    await screen.findByText('caption copied')
    cleanup()
    const prev = (navigator as unknown as { clipboard?: unknown }).clipboard
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    try {
      mountStudio(stdParams())
      await readyCount(1)
      fireEvent.click(screen.getByText('JSON'))
      fireEvent.click(screen.getByText('Copy caption'))
      await waitFor(() => {
        expect(screen.queryByText('caption copied')).toBeNull()
      })
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true })
    }
  })

  test('imports cover every element shape (logo/desc-key/font/coerced/default-bbox)', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.change(screen.getByPlaceholderText('[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]'), { target: { value: JSON.stringify([
      { type: 'logo', description: 'via-key', palette: ['#FF6B35', 'bogus', 42], font: 'serif', bbox: [10, 10, 60, 60] },
      { type: 'text', desc: 123, description: 'tee', text: 456, bbox: [100, 100, 300, 300] },
      { type: 'obj', desc: 'plain', bbox: [1, 2] },
      { type: 'obj', desc: 'nopal', color_palette: 'red', bbox: [700, 700, 800, 800] },
    ]) } })
    fireEvent.click(screen.getByText('Apply elements'))
    await screen.findByText('Elements (4)')
    fireEvent.click(screen.getByText('Elements (4)'))
    expect(screen.getByText('“logo”')).toBeTruthy()
    expect(screen.getByText('“456”')).toBeTruthy()
    expect(screen.getByText('300×300')).toBeTruthy()
    const els = promptEls(runPatch(m))
    expect(els.length).toBe(4)
    expect(els[0]).toMatchObject({ type: 'logo', desc: 'via-key', font: 'serif', color_palette: ['#FF6B35'] })
    expect(els[1]).toMatchObject({ desc: '123', text: '456' })
    expect(els[2]!.bbox).toEqual([200, 200, 500, 500])
    expect('color_palette' in els[3]!).toBe(false)
  })
})

describe('client canvas pointer work', () => {
  function container(): HTMLElement {
    return document.querySelector('[data-canvas-bg="1"]')!.parentElement! as HTMLElement
  }

  test('a draw creates a box; a tiny draw rests', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    const c = container()
    fireEvent.pointerDown(c, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(c, { clientX: 400, clientY: 400 })
    // the draw preview rides the container while drawing
    expect(c.querySelectorAll('div[style*="width"]').length).toBeGreaterThan(0)
    fireEvent.pointerUp(c, { pointerId: 1 })
    await readyCount(1)
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 100, 400, 400])
    // a sub-MIN_BOX draw never seats
    fireEvent.pointerDown(c, { button: 0, clientX: 100, clientY: 100, pointerId: 2 })
    fireEvent.pointerMove(c, { clientX: 110, clientY: 110 })
    fireEvent.pointerUp(c, { pointerId: 2 })
    expect(promptEls(runPatch(m)).length).toBe(1)
  })

  test('right-click and the background text never start draws', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    const c = container()
    fireEvent.pointerDown(c, { button: 2, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(c, { pointerId: 1 })
    // the canvas hint is a plain child: pressing there is not a background press
    const bgText = screen.getAllByText('a natural wood desk').at(-1)!
    fireEvent.pointerDown(bgText, { button: 0, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(bgText, { pointerId: 1 })
    // right-clicking a box or a handle never grabs; an idle move draws nothing
    const mugMain = boxMainOf(cBoxes()[0]!)
    fireEvent.pointerDown(mugMain, { button: 2, clientX: 200, clientY: 100, pointerId: 2 })
    fireEvent.pointerUp(mugMain, { pointerId: 2 })
    const mugSe = seHandleOf(cBoxes()[0]!)
    fireEvent.pointerDown(mugSe, { button: 2, clientX: 325, clientY: 350, pointerId: 2 })
    fireEvent.pointerUp(mugSe, { pointerId: 2 })
    fireEvent.pointerMove(c, { clientX: 500, clientY: 500, pointerId: 3 })
    fireEvent.pointerUp(c, { pointerId: 3 })
    expect(cBoxes().length).toBe(1)
    // the selection survived both presses
    expect(screen.getByText('Description')).toBeTruthy()
  })

  test('a box drag snaps; snap-off drags raw', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    const main = boxMainOf(cBoxes()[0]!)
    fireEvent.pointerDown(main, { button: 0, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(main, { clientX: 230, clientY: 100 })
    fireEvent.pointerUp(main, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 225, 400, 625])
    // snap off: the delta rides raw
    fireEvent.click(screen.getByText('Snap ✓'))
    const main2 = boxMainOf(cBoxes()[0]!)
    fireEvent.pointerDown(main2, { button: 0, clientX: 225, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(main2, { clientX: 238, clientY: 100 })
    fireEvent.pointerUp(main2, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 238, 400, 638])
  })

  test('se grows, nw shrinks, n pulls the top edge', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    const se = seHandleOf(cBoxes()[0]!)
    fireEvent.pointerDown(se, { button: 0, clientX: 600, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(se, { clientX: 650, clientY: 400 })
    fireEvent.pointerUp(se, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 200, 400, 650])
    const nw = nwHandleOf(cBoxes()[0]!)
    fireEvent.pointerDown(nw, { button: 0, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(nw, { clientX: 150, clientY: 50 })
    fireEvent.pointerUp(nw, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([50, 150, 400, 650])
    // the lone-n handle moves only the top (x rides through)
    const n = nHandleOf(cBoxes()[0]!)
    fireEvent.pointerDown(n, { button: 0, clientX: 400, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(n, { clientX: 400, clientY: 120 })
    fireEvent.pointerUp(n, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([125, 150, 400, 650])
  })

  test('a snap-off resize moves raw', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    // a second row rides along for the patch passthrough
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    fireEvent.click(screen.getByText('Snap ✓'))
    const se = seHandleOf(cBoxes()[0]!)
    fireEvent.pointerDown(se, { button: 0, clientX: 600, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(se, { clientX: 612, clientY: 400 })
    fireEvent.pointerUp(se, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 200, 400, 612])
  })

  test('pointer-capture throws never break grabs', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    const c = container()
    vi.spyOn(c, 'setPointerCapture').mockImplementation(() => { throw new Error('nope') })
    vi.spyOn(c, 'releasePointerCapture').mockImplementation(() => { throw new Error('nope') })
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    const main = boxMainOf(cBoxes()[0]!)
    fireEvent.pointerDown(main, { button: 0, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(main, { clientX: 250, clientY: 100 })
    fireEvent.pointerUp(main, { pointerId: 1 })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 250, 400, 650])
  })

  test('a group drag moves both; stale ids fall out', async () => {
    const E1 = JSON.stringify([
      { type: 'obj', desc: 'cee', bbox: [100, 100, 200, 200] },
      { type: 'obj', desc: 'dee', bbox: [700, 700, 800, 800] },
    ])
    const E2 = JSON.stringify([
      { type: 'obj', desc: 'eff', bbox: [100, 100, 200, 200] },
      { type: 'obj', desc: 'gee', bbox: [700, 700, 800, 800] },
    ])
    const m = mountStudio(stdParams(), {}, 'elements')
    await readyCount(1)
    fireEvent.change(await screen.findByLabelText('Element JSON', {}, { timeout: 4000 }), { target: { value: E1 } })
    await screen.findAllByText('cee', {}, { timeout: 4000 })
    // two-select the live pair through the canvas
    const boxC = () => cBoxes()[0]!
    const boxD = () => cBoxes()[1]!
    fireEvent.pointerDown(boxMainOf(boxC()), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(boxMainOf(boxC()), { pointerId: 1 })
    fireEvent.pointerDown(boxMainOf(boxD()), { button: 0, ctrlKey: true, clientX: 700, clientY: 700, pointerId: 1 })
    fireEvent.pointerUp(boxMainOf(boxD()), { pointerId: 1 })
    await waitFor(() => {
      expect(document.querySelectorAll('[class*="ideoRowOn"]').length).toBe(2)
    })
    // the parent swaps the whole layout: the selection goes stale
    fireEvent.change(await screen.findByLabelText('Element JSON'), { target: { value: E2 } })
    await screen.findAllByText('eff', {}, { timeout: 4000 })
    // toggle a live box into the stale group, then drag it plainly
    const boxG = () => cBoxes()[1]!
    fireEvent.pointerDown(boxMainOf(boxG()), { button: 0, ctrlKey: true, clientX: 700, clientY: 700, pointerId: 1 })
    fireEvent.pointerUp(boxMainOf(boxG()), { pointerId: 1 })
    const drag = boxMainOf(boxG())
    fireEvent.pointerDown(drag, { button: 0, clientX: 700, clientY: 700, pointerId: 1 })
    fireEvent.pointerMove(drag, { clientX: 750, clientY: 700 })
    fireEvent.pointerUp(drag, { pointerId: 1 })
    const els = promptEls(runPatch(m))
    expect(els[0]).toMatchObject({ desc: 'eff', bbox: [100, 100, 200, 200] })
    expect(els[1]).toMatchObject({ desc: 'gee', bbox: [700, 750, 800, 850] })
  })

  test('double-click edits text; obj ignores it', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]')
    fireEvent.change(area, { target: { value: '[{"type":"obj","desc":"blk","bbox":[10,10,60,60]},{"type":"text","desc":"a slogan","text":"MELITE","bbox":[100,100,300,300]}]' } })
    fireEvent.click(screen.getByText('Apply elements'))
    fireEvent.click(screen.getByText('Elements (2)'))
    await screen.findByText('“MELITE”')
    const textBox = cBoxes()[1]!
    fireEvent.doubleClick(boxMainOf(textBox))
    const editor = await screen.findByDisplayValue('MELITE')
    fireEvent.change(editor, { target: { value: 'SHUT' } })
    // shift+Enter never commits; a letter never commits nor closes
    fireEvent.keyDown(editor, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(editor, { key: 'a' })
    expect(screen.getByDisplayValue('SHUT')).toBeTruthy()
    fireEvent.keyDown(editor, { key: 'Enter' })
    await waitFor(() => {
      expect(promptEls(runPatch(m))[1]!.text).toBe('SHUT')
    })
    // Escape abandons the draft
    fireEvent.doubleClick(boxMainOf(cBoxes()[1]!))
    const editor2 = await screen.findByDisplayValue('SHUT')
    fireEvent.change(editor2, { target: { value: 'GONE' } })
    fireEvent.keyDown(editor2, { key: 'Escape' })
    expect(promptEls(runPatch(m))[1]!.text).toBe('SHUT')
    // blur commits too
    fireEvent.doubleClick(boxMainOf(cBoxes()[1]!))
    const editor3 = await screen.findByDisplayValue('SHUT')
    fireEvent.change(editor3, { target: { value: 'BLURRY' } })
    fireEvent.blur(editor3)
    expect(promptEls(runPatch(m))[1]!.text).toBe('BLURRY')
    // obj boxes never open the editor
    fireEvent.doubleClick(boxMainOf(cBoxes()[0]!))
    expect(screen.queryByDisplayValue('BLURRY')).toBeNull()
    // an inspector text edit with a second row present crosses the passthrough
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByText('“BLURRY”'))
    const content = screen.getByText('Text content').parentElement!.querySelector('input')!
    fireEvent.change(content, { target: { value: 'BLURRY!!' } })
    expect(promptEls(runPatch(m))[1]!.text).toBe('BLURRY!!')
  })
})

describe('client keyboard', () => {
  test('arrows nudge, shift strides, dups, deletes, escape clears', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getAllByRole('button', { name: '+ Object' })[0]!)
    await readyCount(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    await readyCount(2)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    // an unmapped key rests
    fireEvent.keyDown(window, { key: 'x' })
    expect(cBoxes().length).toBe(2)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 210, 400, 610])
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 260, 400, 660])
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([90, 260, 390, 660])
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([90, 250, 390, 650])
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(promptEls(runPatch(m))[0]!.bbox).toEqual([100, 250, 400, 650])
    // ctrl+D copies the selection and skips the rest (the map passthrough)
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    expect(promptEls(runPatch(m)).length).toBe(3)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(promptEls(runPatch(m)).length).toBe(2)
    // Backspace keeps its own arm through the inspector selection
    fireEvent.click(screen.getByText('350×300'))
    await screen.findByText('Description')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(promptEls(runPatch(m)).length).toBe(1)
    // escape with nothing selected rests; so does a plain arrow
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(promptEls(runPatch(m)).length).toBe(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(promptEls(runPatch(m)).length).toBe(1)
  })

  test('typing in a field swallows keys; Escape still clears', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('400×300'))
    await screen.findByText('Description')
    const desc = screen.getByDisplayValue('a ceramic mug')
    fireEvent.keyDown(desc, { key: 'ArrowDown' })
    expect(screen.getByDisplayValue('100')).toBeTruthy()
    fireEvent.keyDown(desc, { key: 'Escape' })
    await readyCount(1)
    expect(screen.queryByText('Description')).toBeNull()
  })

  test('selecting from the style tab jumps back to elements', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('Style'))
    await screen.findByText('High-level description')
    fireEvent.pointerDown(boxMainOf(cBoxes()[0]!), { button: 0, clientX: 200, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(boxMainOf(cBoxes()[0]!), { pointerId: 1 })
    await screen.findByText('Description')
  })
})

describe('client rail + run row', () => {
  test('the aspect select denies unknown values', async () => {
    const m = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1x1' } })
    expect(promptEls(runPatch(m)).length).toBe(1)
    await screen.findByText(/1024×1024 · 1 element/)
  })

  test('the grid toggle hides the overlay', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    expect(document.querySelectorAll('[data-grid]').length).toBe(2)
    fireEvent.click(screen.getByText('Grid ✓'))
    expect(document.querySelectorAll('[data-grid]').length).toBe(0)
    fireEvent.click(screen.getByText('Grid'))
    expect(document.querySelectorAll('[data-grid]').length).toBe(2)
  })

  test('clear wipes the layout; the button hides when empty', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('Clear'))
    await readyEmpty()
    cleanup()
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    expect(screen.queryByText('Clear')).toBeNull()
  })

  test('a broken spec still runs: missing keys ride nulls, elements drops', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500 }))
    const o = owner({ row: { id: 's_i', params: stdParams() }, cardName: undefined })
    render(createElement(Ideogram4Studio, o as never))
    await readyCount(1)
    // the generic drill never serves
    expect(screen.queryByText('Seed')).toBeNull()
    fireEvent.click(screen.getByText('Run'))
    const patch = (o.onPatch as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as Record<string, unknown>
    expect(patch['width']).toBe(1024)
    expect(patch['steps']).toBeNull()
    expect(patch).not.toHaveProperty('elements')
    expect(JSON.parse(patch['prompt'] as string)).toHaveProperty('compositional_deconstruction')
  })

  test('an extra row param rides the patch verbatim', async () => {
    const m = mountStudio(stdParams({ cfg: 7 }))
    await readyCount(1)
    // the seeding lands the param into the user layer first
    await screen.findByText('Seed', {}, { timeout: 4000 })
    expect(runPatch(m)['cfg']).toBe(7)
  })

  test('a steps edit coerces to a number at the boundary', async () => {
    const m = mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    expect(await screen.findByText('Seed', {}, { timeout: 4000 })).toBeTruthy()
    fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '12' } })
    const patch = runPatch(m)
    expect(patch['steps']).toBe(12)
  })

  test('running locks Run and offers Stop; Remove drops the stage', async () => {
    const onStop = vi.fn()
    const o = owner({ runStatus: 'running', onStop, row: { id: 's_i', params: stdParams() } })
    stubWire()
    render(createElement(Ideogram4Studio, o as never))
    await screen.findByText('Rendering…', {}, { timeout: 4000 })
    fireEvent.click(screen.getByText('Rendering…'))
    expect((o.onPatch as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Stop'))
    expect(onStop).toHaveBeenCalled()
    cleanup()
    const m2 = mountStudio(stdParams())
    await readyCount(1)
    fireEvent.click(screen.getByText('Remove stage'))
    expect(m2.onRemove).toHaveBeenCalled()
  })

  test('apply registers the stage view under ideogram4', () => {
    const register = vi.fn()
    ideogram4Apply({ slots: { inject: (_name: string, fn: () => unknown) => { fn() }, register } } as never)
    expect(register).toHaveBeenCalledWith(
      { name: 'cards.stage.view', key: 'ideogram4' },
      expect.any(Function),
    )
  })
})

describe('client PNG pick', () => {
  test('a tagged PNG imports; two elements pluralize', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(PNG_MUG())
    await screen.findByText('Loaded 1 element from PNG metadata (gen.png)')
    expect(screen.getAllByText('pngmug').length).toBeGreaterThan(0)
    pickFile(PNG_PAIR())
    await screen.findByText('Loaded 2 elements from PNG metadata (gen.png)')
  })

  test('non-PNG, empty, caption-less, short, and garbage picks rest', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(new File(['x'], 'a.txt', { type: 'text/plain' }))
    await screen.findByText('Only PNG files can be re-inflated')
    pickFile(null)
    await waitFor(() => {
      expect(screen.queryByText('Only PNG files can be re-inflated')).toBeTruthy()
    })
    // a bare IEND carries no caption
    pickFile(pngFile([pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    // truncated files and garbage bytes land the same way
    pickFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'short.png', { type: 'image/png' }))
    await waitFor(() => {
      expect(cBoxes().length).toBe(0)
    })
    expect(screen.getByText('No Ideogram caption found in PNG metadata')).toBeTruthy()
    pickFile(new File(['not a png at all, just words'], 'junk.png', { type: 'image/png' }))
    await waitFor(() => {
      expect(cBoxes().length).toBe(0)
    })
    expect(screen.getByText('No Ideogram caption found in PNG metadata')).toBeTruthy()
  })

  test('parameters, a1111 prose, and caption-shaped JSON without elements', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(pngFile([pngText('parameters', MUG_INNER), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('Loaded 1 element from PNG metadata (gen.png)')
    pickFile(pngFile([pngText('prompt', `a photo of a mug, ${MUG_INNER}`), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(screen.queryAllByText('pngmug').length).toBeGreaterThan(0)
    })
    // valid JSON with no elements array is not a caption
    pickFile(pngFile([pngText('prompt', '{"a":1}'), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    // plain words never match either
    pickFile(pngFile([pngText('prompt', 'just some words'), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(cBoxes().length).toBe(1)
    })
  })

  test('a nul-less tEXt and a truncated chunk fall through', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    const enc = new TextEncoder()
    const payload = enc.encode('prompt-hint')
    const noNul = new Uint8Array([0, ...payload])
    pickFile(pngFile([pngChunk('tEXt', noNul), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    // declared length overshoots the buffer: the walk breaks
    const trunc = new Uint8Array(12 + 5)
    new DataView(trunc.buffer).setUint32(0, 100)
    trunc.set(enc.encode('tEXt'), 4)
    trunc.set(enc.encode('abcde'), 8)
    pickFile(pngFile([trunc]))
    await waitFor(() => {
      expect(cBoxes().length).toBe(0)
    })
    expect(screen.getByText('No Ideogram caption found in PNG metadata')).toBeTruthy()
  })

  test('zTXt inflates; blind or corrupt falls back to the status', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(PNG_ZTXT())
    await screen.findByText('Loaded 1 element from PNG metadata (gen.png)')
    expect(screen.getAllByText('ztxt-mug').length).toBeGreaterThan(0)
    cleanup()
    vi.stubGlobal('DecompressionStream', undefined)
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(PNG_ZTXT())
    await screen.findByText('No Ideogram caption found in PNG metadata')
    cleanup()
    vi.unstubAllGlobals()
    // corrupt deflate: the chunk errors and the walk continues past it
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(pngFile([ztxtChunk('prompt', new Uint8Array([1, 2, 3, 4, 5])), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    // no NUL at all: the chunk is skipped
    pickFile(pngFile([pngChunk('zTXt', new TextEncoder().encode('abc')), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(cBoxes().length).toBe(0)
    })
  })

  test('unreadable bytes error loud, strings fall back', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    const bad = PNG_MUG()
    Object.defineProperty(bad, 'arrayBuffer', { value: async () => { throw new Error('pick-boom') } })
    pickFile(bad)
    await screen.findByText('pick-boom')
    const worse = PNG_MUG()
    Object.defineProperty(worse, 'arrayBuffer', { value: async () => { throw 'pick-string' } })
    pickFile(worse)
    await screen.findByText('Failed to read PNG')
  })

  test('a caption without elements falls back to the status', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(pngFile([pngChunk('IHDR', new Uint8Array(13)), pngText('prompt', '{"nope": 1}'), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    expect(cBoxes().length).toBe(0)
  })

  test('a regex-only caption without elements falls back to the status', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    pickFile(pngFile([pngText('prompt', 'sure {"compositional_deconstruction": {"background": "x"}} thanks'), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    expect(cBoxes().length).toBe(0)
  })

  test('a caption whose elements fail validation falls back to the status', async () => {
    mountStudio({ width: 1024, height: 1024, steps: 8 })
    await readyEmpty()
    const bad = JSON.stringify({ compositional_deconstruction: { background: 'x', elements: [{ type: 'bogus', desc: 'x' }] } })
    pickFile(pngFile([pngText('prompt', bad), pngChunk('IEND', new Uint8Array(0))]))
    await screen.findByText('No Ideogram caption found in PNG metadata')
    expect(cBoxes().length).toBe(0)
  })

  test('Load PNG opens the chooser', async () => {
    mountStudio(stdParams())
    await readyCount(1)
    const click = vi.spyOn(pickInput(), 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByText('Load PNG'))
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})
