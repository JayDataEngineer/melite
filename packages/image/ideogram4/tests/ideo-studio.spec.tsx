// @vitest-environment happy-dom
/**
 * ideo-studio — IdeoCanvasSlot + IdeogramCanvasEditor + IdeogramCanvas +
 * IdeoPanels, driven as the operator drives them (no module mocks: the
 * canvas geometry rides a getBoundingClientRect fake, PNGs are crafted
 * bytes, clipboard failure rides a navigator without clipboard).
 *
 * Button map (empty mount): 0 Object, 1 Text, 2 aspect trigger, 3-9
 * aspect rows, 10 grid toggle, 11 snap toggle, 12 Load PNG, 13
 * fullscreen, 14-16 Elements/Style/JSON tabs, 17-19 empty-state adds.
 * A mounted element appends Clear after Load PNG and 4 row buttons
 * (front/back/duplicate/delete) per list row after the tabs.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createElement as h, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IdeoCanvasSlot } from '../src/ui/studio/slot.tsx'
import { IdeogramCanvasEditor } from '../src/ui/studio/component.tsx'
import { IdeogramCanvas } from '../src/ui/studio/IdeogramCanvas.tsx'
import { ColorPaletteInput } from '../src/ui/studio/IdeoPanels.tsx'
import { useToastStore } from '@melite/card-base/toast'

const MUG = JSON.stringify({
  compositional_deconstruction: {
    background: 'desk',
    elements: [{ type: 'obj', desc: 'mug', bbox: [100, 100, 400, 400], color_palette: ['#FF0000'] }],
  },
})
const ELS_PAIR = JSON.stringify([
  { type: 'obj', desc: 'alpha', bbox: [100, 100, 300, 300] },
  { type: 'text', desc: 'sign', text: 'OPEN', bbox: [500, 500, 800, 800] },
])
/** A wholesale replacement layout (stale-selection + mid-drag races). */
const ELS_NEWPAIR = JSON.stringify([
  { type: 'obj', desc: 'cee', bbox: [100, 100, 200, 200] },
  { type: 'obj', desc: 'dee', bbox: [700, 700, 900, 900] },
])
const PAIR = JSON.stringify({
  compositional_deconstruction: {
    background: '',
    elements: [
      { type: 'obj', desc: 'alpha', bbox: [100, 100, 300, 300] },
      { type: 'text', desc: 'sign', text: 'OPEN', bbox: [500, 500, 800, 800] },
    ],
  },
})

function stubGeometry(): void {
  vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 1000, height: 1000,
    right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {},
  } as DOMRect)
}

function mountSlot(value: unknown, commit?: (...a: never[]) => void, width = 1024, height = 1024) {
  const onCommit = commit ?? vi.fn()
  render(h(IdeoCanvasSlot, {
    name: 'prompt', value, width, height, commit: onCommit as (next: Record<string, unknown>) => void,
  }))
  return onCommit as ReturnType<typeof vi.fn>
}

function lastPrompt(commit: ReturnType<typeof vi.fn>): Array<{ desc?: string; bbox: number[]; text?: string; color_palette?: string[] }> {
  const patch = commit.mock.calls.at(-1)![0] as Record<string, unknown>
  return (JSON.parse(patch.prompt as string) as {
    compositional_deconstruction: { elements: Array<{ desc?: string; bbox: number[]; text?: string }> },
  }).compositional_deconstruction.elements
}

function toastsSince(n: number): Array<{ type: string; message: string }> {
  return useToastStore.getState().toasts.slice(n).map((t) => ({ type: t.type, message: t.message }))
}

/** Direct children of the canvas container that carry a positioned box. */
function boxes(): HTMLElement[] {
  const bg = document.querySelector('[data-canvas-bg="1"]')!
  return Array.from(bg.parentElement!.children).filter((c) =>
    c instanceof HTMLElement && c !== bg && !c.hasAttribute('data-grid') && c.style.left !== '',
  ) as HTMLElement[]
}

function outlineOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll('div')).find((d) =>
    (d as HTMLElement).style.cursor === 'grab' || (d as HTMLElement).style.cursor === 'grabbing')
  if (!found) throw new Error('outline not found')
  return found as HTMLElement
}

function seHandleOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll('div')).find((d) =>
    (d as HTMLElement).style.left === '100%' && (d as HTMLElement).style.top === '100%')
  if (!found) throw new Error('se handle not found')
  return found as HTMLElement
}

function nwHandleOf(box: HTMLElement): HTMLElement {
  const found = Array.from(box.querySelectorAll('div')).find((d) =>
    (d as HTMLElement).style.left === '0%' && (d as HTMLElement).style.top === '0%')
  if (!found) throw new Error('nw handle not found')
  return found as HTMLElement
}

/** Click a list row by its exact bbox caption (rows are plain divs). */
function clickRow(bboxText: string): void {
  fireEvent.click(screen.getByText(bboxText))
}

/** PNG bytes: signature + chunks (CRC left zeroed — the parser never checks). */
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
const PNG_MUG = () => pngFile([
  pngText('prompt', JSON.stringify({
    compositional_deconstruction: {
      background: 'desk',
      elements: [{ type: 'obj', desc: 'pngmug', bbox: [10, 10, 100, 100] }],
    },
  })),
  pngChunk('IEND', new Uint8Array(0)),
])

function dropFile(node: Element, file: File | null, types: string[] = ['Files']): void {
  const ev = createEvent.drop(node)
  Object.defineProperty(ev, 'dataTransfer', {
    value: { files: file ? [file] : [], types },
  })
  fireEvent(node, ev)
}

function dragOver(node: Element, types: string[] = ['Files']): void {
  const ev = createEvent.dragOver(node)
  Object.defineProperty(ev, 'dataTransfer', {
    value: { files: [], types, dropEffect: 'none' },
  })
  fireEvent(node, ev)
}

function pickFile(input: HTMLInputElement, file: File | null): void {
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true })
  fireEvent.change(input)
}

beforeEach(() => {
  stubGeometry()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─── Slot bridge ────────────────────────────────────────────────────────────

describe('IdeoCanvasSlot', () => {
  test('mounts the editor from a caption string (canvas label + list row)', () => {
    mountSlot(MUG)
    // the rail list shows the element; the canvas draws its label
    expect(screen.getByText('bbox [100, 100, 400, 400]')).toBeTruthy()
    expect(screen.getAllByText('mug').length).toBeGreaterThan(0)
  })

  test('an empty caption mounts the blank editor', () => {
    mountSlot('')
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('a caption object rides through (not only strings)', () => {
    mountSlot(JSON.parse(MUG) as Record<string, unknown>)
    expect(screen.getByText('bbox [100, 100, 400, 400]')).toBeTruthy()
  })

  test('a re-seated caption recomputes the flat values', () => {
    const commit = vi.fn()
    const { rerender } = render(h(IdeoCanvasSlot, {
      name: 'prompt', value: '', width: 1024, height: 1024,
      commit: commit as (next: Record<string, unknown>) => void,
    }))
    expect(screen.getByText('No elements yet')).toBeTruthy()
    rerender(h(IdeoCanvasSlot, {
      name: 'prompt', value: MUG, width: 1024, height: 1024,
      commit: commit as (next: Record<string, unknown>) => void,
    }))
    expect(screen.getByText('bbox [100, 100, 400, 400]')).toBeTruthy()
  })

  test('an inspector edit reassembles the prompt (dims ride unchanged)', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    const desc = screen.getByPlaceholderText('a ceramic coffee mug, steam rising')
    fireEvent.change(desc, { target: { value: 'a chipped mug' } })
    const patch = commit.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(JSON.parse(patch.prompt as string).compositional_deconstruction.elements[0].desc)
      .toBe('a chipped mug')
    // width/height match the props: no dim keys ride the patch
    expect('width' in patch).toBe(false)
    expect('height' in patch).toBe(false)
  })

  test('an aspect change propagates width/height through the functional bridge', () => {
    const commit = mountSlot(MUG)
    fireEvent.click(screen.getByText('16:9'))
    const patch = commit.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(patch.width).toBe(1280)
    expect(patch.height).toBe(768)
    expect(typeof patch.prompt).toBe('string')
  })

  test('an approximate aspect seats the nearest preset (no exact match)', () => {
    mountSlot(MUG, undefined, 500, 1000)
    // 500×1000 matches no preset: the trigger computes 9:16 (nearest ratio)
    expect(screen.getAllByText('9:16').length).toBeGreaterThan(1)
  })
})

// ─── Element CRUD ───────────────────────────────────────────────────────────

describe('element CRUD', () => {
  test('+Object adds a centered box and selects it (inspector opens)', () => {
    const commit = mountSlot('')
    fireEvent.click(screen.getAllByRole('button')[0]!) // toolbar Object
    expect(lastPrompt(commit).length).toBe(1)
    // selection flips to the inspector: the object placeholder shows
    expect(screen.getByPlaceholderText('a ceramic coffee mug, steam rising')).toBeTruthy()
  })

  test('+Text adds a text box (empty text falls back to its type)', () => {
    mountSlot('')
    fireEvent.click(screen.getAllByRole('button')[1]!) // toolbar Text
    expect(screen.getByText('TXT')).toBeTruthy()
    expect(screen.getAllByText('“text”').length).toBeGreaterThan(0)
  })

  test('+Logo rides the empty-state add (logo badge + OBJ tag)', () => {
    mountSlot('')
    fireEvent.click(screen.getByText('Logo').closest('button')!)
    expect(screen.getAllByText('“logo”').length).toBeGreaterThan(0)
    // back on the list the logo row seats its own badge + icon faces
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getByText('bbox [400, 250, 600, 750]')).toBeTruthy()
  })

  test('the list empty-state adds ride the list callbacks (Object, then Text)', () => {
    const first = render(h(IdeoCanvasSlot, {
      name: 'prompt', value: '', width: 1024, height: 1024, commit: (() => {}) as never,
    }))
    const emptyState = screen.getByText('No elements yet').parentElement!
    fireEvent.click(within(emptyState).getByText('Object'))
    expect(screen.getByPlaceholderText('a ceramic coffee mug, steam rising')).toBeTruthy()
    first.unmount()
    render(h(IdeoCanvasSlot, {
      name: 'prompt', value: '', width: 1024, height: 1024, commit: (() => {}) as never,
    }))
    const emptyState2 = screen.getByText('No elements yet').parentElement!
    fireEvent.click(within(emptyState2).getByText('Text'))
    expect(screen.getByText('TXT')).toBeTruthy()
  })

  test('the background field seats through the commit', () => {
    const commit = mountSlot(MUG)
    fireEvent.change(screen.getByPlaceholderText('A natural wood desk against a white wall.'), {
      target: { value: 'studio loft' },
    })
    const prompt = JSON.parse(
      (commit.mock.calls.at(-1)![0] as Record<string, unknown>).prompt as string,
    ) as { compositional_deconstruction: { background: string } }
    expect(prompt.compositional_deconstruction.background).toBe('studio loft')
  })

  test('list duplicate + bring-to-front + send-to-back + delete', () => {
    const commit = mountSlot(PAIR)
    const dups = screen.getAllByRole('button', { name: 'Duplicate' })
    expect(dups.length).toBe(2)
    fireEvent.click(dups[0]!) // top row = beta (display reverses the array)
    expect(lastPrompt(commit).length).toBe(3)
    // duplicating selects the copy (inspector opens): Escape back to the list
    fireEvent.keyDown(document.body, { key: 'Escape' })
    const fronts = screen.getAllByRole('button', { name: 'Bring to front' })
    fireEvent.click(fronts[0]!)
    expect(commit).toHaveBeenCalled()
    const backs = screen.getAllByRole('button', { name: 'Send to back' })
    fireEvent.click(backs[0]!)
    expect(commit).toHaveBeenCalled()
    const dels = screen.getAllByRole('button', { name: 'Delete' })
    const before = lastPrompt(commit).length
    fireEvent.click(dels[0]!)
    expect(lastPrompt(commit).length).toBe(before - 1)
  })

  /** The inspector's icon buttons carry no accessible names (DSH Tooltip
   *  keeps the label in the hover layer), so the suite addresses them by
   *  panel order: send-to-back, bring-to-front, duplicate, delete ride the
   *  type row first, ahead of the palette's own buttons. */
  function inspectorButtons(): HTMLElement[] {
    const desc = screen.getByPlaceholderText('a ceramic coffee mug, steam rising')
    const stack = desc.parentElement!.parentElement!
    const btns = Array.from(stack.querySelectorAll('button')).slice(0, 4)
    expect(btns.length).toBe(4)
    return btns
  }

  test('inspector duplicate + front + back + delete', () => {
    const commit = mountSlot(MUG)
    const before = screen.getAllByText(/bbox \[/).length
    clickRow('bbox [100, 100, 400, 400]')
    const [send, bring, dup] = inspectorButtons()
    fireEvent.click(dup!) // the copy selects itself: the inspector stays open
    expect(lastPrompt(commit).length).toBe(before + 1)
    fireEvent.click(bring!)
    fireEvent.click(send!)
    expect(commit).toHaveBeenCalled()
    const [, , , delCopy] = inspectorButtons()
    fireEvent.click(delCopy!) // the copy goes; the original lists again
    expect(lastPrompt(commit).length).toBe(before)
    clickRow('bbox [100, 100, 400, 400]')
    const [, , , delOrig] = inspectorButtons()
    fireEvent.click(delOrig!)
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('inspector bbox inputs clamp and re-order crossed axes', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    const ymin = screen.getAllByDisplayValue('100')[0]!
    const xmin = screen.getAllByDisplayValue('100')[1]!
    const ymax = screen.getAllByDisplayValue('400')[0]!
    const xmax = screen.getAllByDisplayValue('400')[1]!
    // plain move inside the box: order kept
    fireEvent.change(ymin, { target: { value: '150' } })
    expect(lastPrompt(commit)[0]!.bbox[0]).toBe(150)
    // ymin past ymax: ymax re-seats above it
    fireEvent.change(ymin!, { target: { value: '500' } })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([500, 100, 530, 400])
    // xmax before xmin: xmin re-seats below it
    fireEvent.change(xmax!, { target: { value: '50' } })
    expect(lastPrompt(commit)[0]!.bbox[1]).toBe(20)
    // empty input degrades to zero
    fireEvent.change(xmin!, { target: { value: '' } })
    expect(lastPrompt(commit)[0]!.bbox[1]).toBe(0)
    // ymax below ymin: ymin re-seats below it (then clamps to the grid)
    fireEvent.change(ymax, { target: { value: '10' } })
    expect(lastPrompt(commit)[0]!.bbox[0]).toBe(0)
  })

  test('xmin past xmax pushes xmax above it', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    const xmin = screen.getAllByDisplayValue('100')[1]!
    fireEvent.change(xmin, { target: { value: '900' } })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 900, 400, 930])
  })

  test('text content + font style + a font chip', () => {
    const commit = mountSlot(PAIR)
    clickRow('bbox [500, 500, 800, 800]')
    const content = screen.getByPlaceholderText('COFFEE TIME')
    expect((content as HTMLInputElement).value).toBe('OPEN')
    fireEvent.change(content, { target: { value: 'CLOSED' } })
    expect(lastPrompt(commit)[1]!.text).toBe('CLOSED')
    const font = screen.getByPlaceholderText('bold geometric sans-serif, all caps')
    fireEvent.change(font, { target: { value: 'condensed' } })
    expect(commit).toHaveBeenCalled()
    // clearing the font seats undefined (the key drops off the wire)
    fireEvent.change(font, { target: { value: '' } })
    expect(commit).toHaveBeenCalled()
    // the first font preset seats via its short chip label
    fireEvent.click(screen.getByText('bold geometric sans-serif').closest('button')!)
    expect(commit).toHaveBeenCalled()
  })

  test('clear-all asks first: yes clears, no keeps', () => {
    mountSlot(MUG)
    vi.stubGlobal('confirm', () => true)
    fireEvent.click(screen.getByText('Clear').closest('button')!)
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('clear-all refusal keeps the layout', () => {
    mountSlot(MUG)
    vi.stubGlobal('confirm', () => false)
    fireEvent.click(screen.getByText('Clear').closest('button')!)
    expect(screen.getByText('bbox [100, 100, 400, 400]')).toBeTruthy()
  })
})

/** Direct editor render over frozen values (ingest + fallback faces). */
function EditorStatic({ values }: { values: Record<string, unknown> }) {
  return h(IdeogramCanvasEditor, { values, setValues: () => {} })
}

// ─── Palette ────────────────────────────────────────────────────────────────

describe('ColorPaletteInput', () => {
  test('an invalid seated color shows the ? mark and a black swatch fallback', () => {
    // the caption parser scrubs invalid entries, so only a direct seat
    // (a parent-owned palette the scrub never saw) reaches the mark
    const onChange = vi.fn()
    render(h(ColorPaletteInput, { colors: ['bogus'], onChange }))
    expect(screen.getByText('?')).toBeTruthy()
    // the hex field drops the invalid entry on the next edit
    fireEvent.change(screen.getByPlaceholderText('#RRGGBB,...'), { target: { value: '#00FF00' } })
    expect(onChange).toHaveBeenCalledWith(['#00FF00'])
  })

  test('hex text seats scrubbed colors; add appends; remove drops', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    const hex = screen.getByPlaceholderText('#RRGGBB,...')
    // the seated palette round-trips through the hex field
    expect((hex as HTMLInputElement).value).toBe('#FF0000')
    fireEvent.change(hex, { target: { value: '#00ff00, bogus' } })
    expect(lastPrompt(commit)[0]).toMatchObject({ color_palette: ['#00FF00'] })
    // add appends the default swatch
    fireEvent.click(screen.getByRole('button', { name: 'Add color' }))
    expect(lastPrompt(commit)[0]!.color_palette!.length).toBe(2)
    // remove drops it again (each swatch carries its own remove)
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove color' })[0]!)
    expect(lastPrompt(commit)[0]!.color_palette!.length).toBe(1)
  })

  test('the swatch picker normalizes through uppercase hex', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    const swatch = screen.getByRole('button', { name: 'Remove color' })
      .parentElement!.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.change(swatch, { target: { value: '#00ff00' } })
    expect(lastPrompt(commit)[0]).toMatchObject({ color_palette: ['#00FF00'] })
  })

  test('the preset popover opens, seats a preset, and the scrim closes it', () => {
    const onChange = vi.fn()
    render(h(ColorPaletteInput, { colors: ['#FF0000'], onChange }))
    fireEvent.click(screen.getByRole('button', { name: 'Preset palettes' }))
    expect(screen.getByText('Palettes')).toBeTruthy()
    // the scrim dismisses without seating
    const scrim = screen.getByText('Palettes').parentElement!
      .previousElementSibling as HTMLElement
    fireEvent.click(scrim)
    expect(screen.queryByText('Palettes')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    // reopening and picking a row seats its colors (capped at max)
    fireEvent.click(screen.getByRole('button', { name: 'Preset palettes' }))
    fireEvent.click(screen.getAllByText('Sunset')[0]!)
    expect(onChange).toHaveBeenCalled()
    expect(screen.queryByText('Palettes')).toBeNull()
  })

  test('a full palette hides the add button (the max guard rides the gate)', () => {
    const onChange = vi.fn()
    render(h(ColorPaletteInput, {
      colors: ['#111111', '#222222', '#333333', '#444444', '#555555'], onChange,
    }))
    expect(screen.queryByRole('button', { name: 'Add color' })).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('a preset palette seats wholesale (scrim path closes the popover)', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    fireEvent.click(screen.getByRole('button', { name: 'Preset palettes' }))
    expect(screen.getByText('Palettes')).toBeTruthy()
    fireEvent.click(screen.getByText('Sunset').closest('button')!)
    expect(lastPrompt(commit)[0]).toMatchObject({ color_palette: ['#FF6B35', '#F7B801', '#7B2D26'] })
  })

  test('a full palette hides the add button (max 5)', () => {
    mountSlot(JSON.stringify({
      compositional_deconstruction: {
        background: '',
        elements: [{ type: 'obj', desc: 'full', bbox: [10, 10, 100, 100],
          color_palette: ['#111111', '#222222', '#333333', '#444444', '#555555'] }],
      },
    }))
    clickRow('bbox [10, 10, 100, 100]')
    expect(screen.queryByRole('button', { name: 'Add color' })).toBeNull()
  })

  test('compact renders the tight swatches', () => {
    const onChange = vi.fn()
    render(h(ColorPaletteInput, { colors: ['#FF0000'], onChange, compact: true }))
    expect(screen.getByPlaceholderText('#RRGGBB,...')).toBeTruthy()
  })
})

// ─── Style tab ──────────────────────────────────────────────────────────────

describe('StylePanel', () => {
  test('a preset seeds every style field through the commit', () => {
    const commit = mountSlot(MUG)
    fireEvent.click(screen.getByText('Style'))
    fireEvent.click(screen.getByText('Cinematic photo').closest('button')!)
    // style fields fold into the assembled prompt (the slot lifts only dims)
    const patch = commit.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(JSON.parse(patch.prompt as string)).toMatchObject({
      style_description: {
        aesthetics: 'cinematic, dramatic, shallow depth of field',
        photo: 'shot on Kodak Portra 400, grainy, natural color',
      },
    })
  })

  test('mode pills flip the block (photo fields, then art, then none)', () => {
    // the slot never feeds commits back, so the pills assert through the
    // wire: each pill re-seats the assembled prompt's style block
    const commit = mountSlot(JSON.stringify({
      style_description: { photo: 'portra', aesthetics: 'grainy' },
      compositional_deconstruction: { background: '', elements: [] },
    }))
    const promptOf = () => JSON.parse(
      (commit.mock.calls.at(-1)![0] as Record<string, unknown>).prompt as string,
    ) as { style_description?: Record<string, unknown>; high_level_description?: string }
    fireEvent.click(screen.getByText('Style'))
    // photo fields render from the seated values
    const detail = screen.getByPlaceholderText('Kodak Portra 400, grainy')
    fireEvent.change(detail, { target: { value: 'portra-x' } })
    expect(promptOf().style_description?.photo).toBe('portra-x')
    // the Art pill re-seats the frozen value under art_style (the slot
    // never feeds commits back, so the editor still holds 'portra')
    fireEvent.click(screen.getByText('Art Style').closest('button')!)
    expect(promptOf().style_description?.art_style).toBe('portra')
    // the high-level line rides the top level
    const hld = screen.getByPlaceholderText('A cinematic shot of a workspace')
    fireEvent.change(hld, { target: { value: 'still life' } })
    expect(promptOf().high_level_description).toBe('still life')
    // None drops the style block wholesale
    fireEvent.click(screen.getByText('None').closest('button')!)
    expect(promptOf().style_description).toBeUndefined()
  })

  test('an art-seeded caption renders the art face (label + placeholder)', () => {
    mountSlot(JSON.stringify({
      style_description: { art_style: 'impasto', aesthetics: 'thick' },
      compositional_deconstruction: { background: '', elements: [] },
    }))
    fireEvent.click(screen.getByText('Style'))
    expect(screen.getByPlaceholderText('Impressionist, Baroque')).toBeTruthy()
  })

  test('the style palette seats through the max-8 input', () => {
    const commit = mountSlot(JSON.stringify({
      style_description: { photo: 'portra', aesthetics: 'grainy' },
      compositional_deconstruction: { background: '', elements: [] },
    }))
    fireEvent.click(screen.getByText('Style'))
    const hex = screen.getByPlaceholderText('#RRGGBB,...')
    fireEvent.change(hex, { target: { value: '#123456' } })
    const patch = commit.mock.calls.at(-1)![0] as Record<string, unknown>
    expect(JSON.parse(patch.prompt as string)).toMatchObject({
      style_description: { color_palette: ['#123456'] },
    })
  })

  test('the style detail fields seat through the wire', () => {
    const commit = mountSlot(JSON.stringify({
      style_description: { photo: 'portra' },
      compositional_deconstruction: { background: '', elements: [] },
    }))
    const sdOf = () => (JSON.parse(
      (commit.mock.calls.at(-1)![0] as Record<string, unknown>).prompt as string,
    ) as { style_description?: Record<string, unknown> }).style_description
    fireEvent.click(screen.getByText('Style'))
    fireEvent.change(screen.getByPlaceholderText('cinematic, vibrant…'), { target: { value: 'grainy' } })
    expect(sdOf()?.aesthetics).toBe('grainy')
    fireEvent.change(screen.getByPlaceholderText('golden hour, neon…'), { target: { value: 'soft' } })
    expect(sdOf()?.lighting).toBe('soft')
    fireEvent.change(screen.getByPlaceholderText('35mm film, oil on canvas…'), { target: { value: 'film' } })
    expect(sdOf()?.medium).toBe('film')
  })
})

// ─── JSON tab ───────────────────────────────────────────────────────────────

describe('JsonPanel', () => {
  test('the caption pre shows the assembled background', () => {
    mountSlot(MUG)
    fireEvent.click(screen.getByText('JSON'))
    expect(screen.getByText(/"background": "desk"/)).toBeTruthy()
  })

  test('a blank caption still assembles (the placeholder background)', () => {
    render(h(EditorStatic, { values: { elements: '[]' } }))
    fireEvent.click(screen.getByText('JSON'))
    expect(screen.getByText(/"background": "\(describe the scene background\)"/)).toBeTruthy()
  })

  test('elements JSON edits apply to the canvas (singular toast)', async () => {
    mountSlot(MUG)
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    const edited = (area as HTMLTextAreaElement).value.replace('"mug"', '"cup"')
    fireEvent.change(area, { target: { value: edited } })
    fireEvent.click(screen.getByText('Apply'))
    fireEvent.click(screen.getByText('Elements'))
    await waitFor(() => {
      expect(screen.getByText('bbox [100, 100, 400, 400]')).toBeTruthy()
      expect(screen.getAllByText('cup').length).toBeGreaterThan(0)
    })
    expect(toastsSince(0).some((t) => t.message === 'Imported 1 element')).toBe(true)
  })

  test('applying two elements toasts the plural', async () => {
    mountSlot('')
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    fireEvent.change(area, { target: { value: ELS_PAIR } })
    fireEvent.click(screen.getByText('Apply'))
    fireEvent.click(screen.getByText('Elements'))
    await waitFor(() => {
      expect(screen.getByText('bbox [100, 100, 300, 300]')).toBeTruthy()
    })
    expect(toastsSince(0).some((t) => t.message === 'Imported 2 elements')).toBe(true)
  })

  test('invalid JSON flags the hint, disables Apply; fast Apply errors loud', async () => {
    mountSlot(MUG)
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    fireEvent.change(area, { target: { value: 'nope' } })
    // the debounce has not fired yet: Apply is live and refuses loud
    fireEvent.click(screen.getByText('Apply'))
    expect(toastsSince(before).some((t) => t.message === 'Cannot apply — JSON is invalid')).toBe(true)
    // the debounce lands: the hint flags and Apply locks
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON — must be an array of {type, desc, bbox}')).toBeTruthy()
    })
    expect(screen.getByText('Apply').closest('button')!.disabled).toBe(true)
  })

  test('clearing the textarea resets the error (empty arm)', async () => {
    mountSlot(MUG)
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    fireEvent.change(area, { target: { value: 'nope' } })
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON — must be an array of {type, desc, bbox}')).toBeTruthy()
    })
    fireEvent.change(area, { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getByText('Edit and click Apply to sync with canvas')).toBeTruthy()
    })
  })

  test('copy seats the caption (success toast + check flip)', async () => {
    mountSlot(MUG)
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    const btn = screen.getByText('Copy').closest('button')!
    const idle = btn.innerHTML
    fireEvent.click(btn)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Copied to clipboard')).toBe(true)
    })
    // the check shows while copied, then flips back after 1200ms
    expect(btn.innerHTML).not.toBe(idle)
    await waitFor(() => {
      expect(btn.innerHTML).toBe(idle)
    }, { timeout: 3000 })
  })

  test('valid differing JSON clears the hint after the debounce', async () => {
    mountSlot(MUG)
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    fireEvent.change(area, { target: { value: 'nope' } })
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON — must be an array of {type, desc, bbox}')).toBeTruthy()
    })
    // valid JSON lands after the debounce: the error clears, Apply unlocks
    fireEvent.change(area, {
      target: { value: JSON.stringify([{ type: 'obj', desc: 'fresh', bbox: [10, 10, 50, 50] }]) },
    })
    await waitFor(() => {
      expect(screen.getByText('Edit and click Apply to sync with canvas')).toBeTruthy()
    }, { timeout: 3000 })
    expect(screen.getByText('Apply').closest('button')!.disabled).toBe(false)
  })

  test('copy from the elements tab seats the raw JSON', async () => {
    mountSlot(MUG)
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    fireEvent.click(screen.getByText('Copy'))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Copied to clipboard')).toBe(true)
    })
  })

  test('copy without a clipboard errors loud', async () => {
    const prev = (navigator as unknown as { clipboard?: unknown }).clipboard
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    try {
      mountSlot(MUG)
      const before = useToastStore.getState().toasts.length
      fireEvent.click(screen.getByText('JSON'))
      fireEvent.click(screen.getByText('Copy'))
      await waitFor(() => {
        expect(toastsSince(before).some((t) => t.message === 'Clipboard unavailable')).toBe(true)
      })
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true })
    }
  })

  test('the JSON dropzone restores a PNG layout (singular toast)', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    const zone = screen.getByRole('button', { name: /Drop or click/ })
    dropFile(zone, PNG_MUG())
    await waitFor(() => {
      expect(screen.getAllByText('pngmug').length).toBeGreaterThan(0)
    })
    expect(toastsSince(before).some((t) => t.message === 'Restored 1 element from PNG')).toBe(true)
  })

  test('the JSON dropzone refuses non-PNG, caption-less PNG, and empty drops', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    const zone = screen.getByRole('button', { name: /Drop or click/ })
    dropFile(zone, new File(['hello'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Only PNG files can be re-inflated')).toBe(true)
    })
    dropFile(zone, pngFile([pngText('prompt', 'just words'), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'No Ideogram caption found in PNG metadata')).toBe(true)
    })
    dropFile(zone, null)
    fireEvent.click(screen.getByText('Elements'))
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('a drop whose bytes cannot be read errors loud', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    const zone = screen.getByRole('button', { name: /Drop or click/ })
    const bad = PNG_MUG()
    Object.defineProperty(bad, 'arrayBuffer', { value: async () => { throw new Error('boom') } })
    dropFile(zone, bad)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'boom')).toBe(true)
    })
    // a non-Error throw lands on the fallback message
    const worse = PNG_MUG()
    Object.defineProperty(worse, 'arrayBuffer', { value: async () => { throw 'zone-string' } })
    dropFile(zone, worse)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Failed to read PNG')).toBe(true)
    })
  })

  test('a zone drop of two elements pluralizes the toast', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    fireEvent.click(screen.getByText('JSON'))
    const zone = screen.getByRole('button', { name: /Drop or click/ })
    dropFile(zone, pngFile([
      pngText('prompt', JSON.stringify({ compositional_deconstruction: { background: '', elements: [
        { type: 'obj', desc: 'one', bbox: [10, 10, 100, 100] },
        { type: 'obj', desc: 'two', bbox: [200, 200, 300, 300] },
      ] } })),
      pngChunk('IEND', new Uint8Array(0)),
    ]))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Restored 2 elements from PNG')).toBe(true)
    })
  })

  test('the zone picks files, ignores empty picks, reacts to keys and hover', async () => {
    mountSlot('')
    fireEvent.click(screen.getByText('JSON'))
    const zone = screen.getByRole('button', { name: /Drop or click/ })
    const inputs = document.querySelectorAll('input[type="file"]')
    const zoneInput = inputs[inputs.length - 1] as HTMLInputElement
    pickFile(zoneInput, PNG_MUG())
    await waitFor(() => {
      expect(screen.getAllByText('pngmug').length).toBeGreaterThan(0)
    })
    pickFile(zoneInput, null)
    // hover without files never arms the overlay
    dragOver(zone, ['text/plain'])
    expect(screen.queryByText('Drop PNG to restore layout')).toBeNull()
    // hover with files arms it; leaving clears it
    dragOver(zone)
    expect(screen.getByText('Drop PNG to restore layout')).toBeTruthy()
    fireEvent.dragLeave(zone)
    expect(screen.queryByText('Drop PNG to restore layout')).toBeNull()
    // keyboard opens the picker (covers the key arms); other keys rest
    fireEvent.keyDown(zone, { key: 'Enter' })
    fireEvent.keyDown(zone, { key: ' ' })
    fireEvent.keyDown(zone, { key: 'a' })
    fireEvent.click(zone)
  })
})

// ─── Canvas: draw / move / resize ───────────────────────────────────────────

describe('IdeogramCanvas pointer work', () => {
  test('a background drag draws a box (readout rides along, then selects)', () => {
    const commit = mountSlot('')
    const bg = document.querySelector('[data-canvas-bg="1"]')!
    fireEvent.pointerDown(bg, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(bg, { clientX: 300, clientY: 300 })
    // the draw readout narrates the drag
    expect(screen.getByText(/draw 100,/)).toBeTruthy()
    fireEvent.pointerUp(bg, { pointerId: 1 })
    expect(lastPrompt(commit).length).toBe(1)
    // the new box selects itself: the inspector opens
    expect(screen.getByPlaceholderText('a ceramic coffee mug, steam rising')).toBeTruthy()
  })

  test('a grid-layer drag draws too (the grid counts as background)', () => {
    const commit = mountSlot('')
    const grid = document.querySelector('[data-grid="1"]')!
    fireEvent.pointerDown(grid, { button: 0, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(grid, { clientX: 700, clientY: 700 })
    fireEvent.pointerUp(grid, { pointerId: 1 })
    expect(lastPrompt(commit).length).toBe(1)
  })

  test('a tiny drag draws nothing; a right-click draws nothing', () => {
    const commit = mountSlot('')
    const bg = document.querySelector('[data-canvas-bg="1"]')!
    fireEvent.pointerDown(bg, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(bg, { clientX: 105, clientY: 105 })
    fireEvent.pointerUp(bg, { pointerId: 1 })
    expect(commit).not.toHaveBeenCalled()
    fireEvent.pointerDown(bg, { button: 2, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(bg, { pointerId: 1 })
    expect(commit).not.toHaveBeenCalled()
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('a label pointerdown never starts a draw (not background)', () => {
    const commit = mountSlot(MUG)
    const label = within(boxes()[0]!).getByText('mug')
    fireEvent.pointerDown(label, { button: 0, clientX: 200, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 400, clientY: 400 })
    fireEvent.pointerUp(label, { pointerId: 1 })
    expect(commit).not.toHaveBeenCalled()
  })

  test('a box drag moves with snap on (30px lands on the 25 grid)', () => {
    const commit = mountSlot(MUG)
    const outline = outlineOf(boxes()[0]!)
    fireEvent.pointerDown(outline, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(outline, { clientX: 130, clientY: 100 })
    // the move readout narrates the dragged box
    expect(screen.getByText(/bbox = \[/)).toBeTruthy()
    fireEvent.pointerUp(outline, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 125, 400, 425])
  })

  test('a box drag moves raw with snap off', () => {
    const commit = mountSlot(MUG)
    fireEvent.click(screen.getAllByRole('button')[11]!) // snap toggle off
    const outline = outlineOf(boxes()[0]!)
    fireEvent.pointerDown(outline, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(outline, { clientX: 130, clientY: 112 })
    fireEvent.pointerUp(outline, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([112, 130, 412, 430])
  })

  test('the se handle grows, the nw handle shrinks (both readouts)', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    commit.mockClear()
    const se = seHandleOf(boxes()[0]!)
    fireEvent.pointerDown(se, { button: 0, clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(se, { clientX: 450, clientY: 450 })
    expect(screen.getByText(/se → \[/)).toBeTruthy()
    fireEvent.pointerUp(se, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 100, 450, 450])
    const nw = nwHandleOf(boxes()[0]!)
    fireEvent.pointerDown(nw, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(nw, { clientX: 50, clientY: 50 })
    expect(screen.getByText(/nw → \[/)).toBeTruthy()
    fireEvent.pointerUp(nw, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([50, 50, 450, 450])
  })

  test('a resize with snap off moves raw', () => {
    const commit = mountSlot(MUG)
    fireEvent.click(screen.getAllByRole('button')[11]!) // snap toggle off
    clickRow('bbox [100, 100, 400, 400]')
    commit.mockClear()
    const se = seHandleOf(boxes()[0]!)
    fireEvent.pointerDown(se, { button: 0, clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(se, { clientX: 462, clientY: 400 })
    fireEvent.pointerUp(se, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 100, 400, 462])
  })

  test('a right-click on box and handle never grabs', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    commit.mockClear()
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 2, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerDown(seHandleOf(boxes()[0]!), { button: 2, clientX: 400, clientY: 400, pointerId: 1 })
    expect(commit).not.toHaveBeenCalled()
  })

  test('a drag still lands when pointer capture throws (silent-catch law)', () => {
    const commit = mountSlot('')
    const proto = HTMLDivElement.prototype as unknown as {
      setPointerCapture(id: number): void
      releasePointerCapture(id: number): void
    }
    const setSpy = vi.spyOn(proto, 'setPointerCapture').mockImplementation(() => {
      throw new DOMException('released', 'NotFoundError')
    })
    const relSpy = vi.spyOn(proto, 'releasePointerCapture').mockImplementation(() => {
      throw new DOMException('released', 'NotFoundError')
    })
    try {
      const bg = document.querySelector('[data-canvas-bg="1"]')!
      fireEvent.pointerDown(bg, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(bg, { clientX: 300, clientY: 300 })
      fireEvent.pointerUp(bg, { pointerId: 1 })
      expect(lastPrompt(commit).length).toBe(1)
      // the box drag path swallows the same failure
      const outline = outlineOf(boxes()[0]!)
      fireEvent.pointerDown(outline, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(outline, { pointerId: 1 })
      // the draw selected its box (inspector open): Escape back to the list
      fireEvent.keyDown(document.body, { key: 'Escape' })
      // and the resize path too
      clickRow('bbox [100, 100, 300, 300]')
      const se = seHandleOf(boxes()[0]!)
      fireEvent.pointerDown(se, { button: 0, clientX: 400, clientY: 400, pointerId: 1 })
      fireEvent.pointerUp(se, { pointerId: 1 })
      expect(setSpy).toHaveBeenCalled()
    } finally {
      setSpy.mockRestore()
      relSpy.mockRestore()
    }
  })

  test('double-clicking text edits inline: Enter commits, Escape cancels', () => {
    const commit = mountSlot(PAIR)
    const textBox = boxes()[1]!
    const outline = outlineOf(textBox)
    fireEvent.doubleClick(outline)
    const editor = within(textBox).getByDisplayValue('OPEN')
    // shift+Enter never commits (multiline rest); plain Enter does
    fireEvent.keyDown(editor, { key: 'Enter', shiftKey: true })
    expect(commit).not.toHaveBeenCalled()
    fireEvent.change(editor, { target: { value: 'SHUT' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(lastPrompt(commit)[1]!.text).toBe('SHUT')
    // reopen, then cancel: the text survives
    fireEvent.doubleClick(outlineOf(boxes()[1]!))
    const editor2 = within(boxes()[1]!).getByDisplayValue('SHUT')
    fireEvent.change(editor2, { target: { value: 'GONE' } })
    fireEvent.keyDown(editor2, { key: 'Escape' })
    expect(lastPrompt(commit)[1]!.text).toBe('SHUT')
  })

  test('double-clicking an object never edits (no text seat)', () => {
    mountSlot(MUG)
    fireEvent.doubleClick(outlineOf(boxes()[0]!))
    expect(boxes()[0]!.querySelector('textarea')).toBeNull()
  })

  test('blur commits the inline text', () => {
    const commit = mountSlot(PAIR)
    fireEvent.doubleClick(outlineOf(boxes()[1]!))
    const editor = within(boxes()[1]!).getByDisplayValue('OPEN')
    fireEvent.change(editor, { target: { value: 'BLURRY' } })
    fireEvent.blur(editor)
    expect(lastPrompt(commit)[1]!.text).toBe('BLURRY')
  })

  test('pointer and double-click never escape the inline editor', () => {
    const commit = mountSlot(PAIR)
    fireEvent.doubleClick(outlineOf(boxes()[1]!))
    const editor = within(boxes()[1]!).getByDisplayValue('OPEN')
    fireEvent.change(editor, { target: { value: 'KEEP' } })
    // a pointer press inside the editor never starts a draw behind it
    fireEvent.pointerDown(editor)
    // a double-click inside never re-seats (the draft survives intact)
    fireEvent.doubleClick(editor)
    expect((within(boxes()[1]!).getByDisplayValue('KEEP') as HTMLTextAreaElement).value).toBe('KEEP')
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(lastPrompt(commit)[1]!.text).toBe('KEEP')
  })

  test('double-clicking a logo edits its text with the logo face', () => {
    const commit = mountSlot('')
    const emptyState = screen.getByText('No elements yet').parentElement!
    fireEvent.click(within(emptyState).getByText('Logo'))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.doubleClick(outlineOf(boxes()[0]!))
    const editor = screen.getByPlaceholderText('Logo text…')
    fireEvent.change(editor, { target: { value: 'ACME' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(lastPrompt(commit)[0]!.text).toBe('ACME')
  })

  test('opening the inline editor hides the resize handles', () => {
    mountSlot(PAIR)
    fireEvent.doubleClick(outlineOf(boxes()[1]!))
    expect(
      Array.from(boxes()[1]!.querySelectorAll('div')).some((d) =>
        (d as HTMLElement).style.left === '100%' && (d as HTMLElement).style.top === '100%'),
    ).toBe(false)
  })

  test('a group drag over stale ids drags only the live member', () => {
    const seen: string[] = []
    const seat = (j: string) => { seen.push(j) }
    const { rerender } = render(h(EditorDriven, { elementsJson: ELS_PAIR, onSeated: seat }))
    // two-select the pair through the canvas
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(screen.getByText('2 elements selected')).toBeTruthy()
    // the parent swaps the whole layout: the selection goes stale
    rerender(h(EditorDriven, { elementsJson: ELS_NEWPAIR, onSeated: seat }))
    expect(boxes().length).toBe(2)
    // toggle a live box into the stale group, then drag it plainly
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, ctrlKey: true, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    expect(screen.getByText('3 elements selected')).toBeTruthy()
    const outline = outlineOf(boxes()[0]!)
    fireEvent.pointerDown(outline, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(outline, { clientX: 150, clientY: 100 })
    fireEvent.pointerUp(outline, { pointerId: 1 })
    // the stale ids fell out of the subjects; only the live box moved
    const last = JSON.parse(seen.at(-1)!) as Array<{ desc: string; bbox: number[] }>
    expect(last.length).toBe(2)
    expect(last[0]).toMatchObject({ desc: 'cee', bbox: [100, 150, 200, 250] })
    expect(last[1]).toMatchObject({ desc: 'dee', bbox: [700, 700, 900, 900] })
  })

  test('an ingest landing mid-drag blanks the stale readout, not the canvas', () => {
    const { rerender } = render(h(EditorDriven, { elementsJson: ELS_PAIR }))
    // move readout first
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(outlineOf(boxes()[0]!), { clientX: 130, clientY: 100 })
    expect(screen.getByText(/bbox = \[/)).toBeTruthy()
    // the parent swaps the layout mid-drag: the readout loses its subject
    rerender(h(EditorDriven, { elementsJson: ELS_NEWPAIR }))
    fireEvent.pointerMove(outlineOf(boxes()[0]!), { clientX: 140, clientY: 100 })
    expect(screen.queryByText(/bbox = \[/)).toBeNull()
    expect(boxes().length).toBe(2)
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    // the ingest orphaned the selection: pick a live box for the resize race
    clickRow('bbox [100, 100, 200, 200]')
    // resize readout, same race
    fireEvent.pointerDown(seHandleOf(boxes()[0]!), { button: 0, clientX: 200, clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(seHandleOf(boxes()[0]!), { clientX: 230, clientY: 200 })
    expect(screen.getByText(/→ \[/)).toBeTruthy()
    rerender(h(EditorDriven, { elementsJson: ELS_PAIR }))
    // the outline is always live (handles need selection, moves do not)
    fireEvent.pointerMove(outlineOf(boxes()[0]!), { clientX: 240, clientY: 200 })
    expect(screen.queryByText(/→ \[/)).toBeNull()
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
  })

  test('ctrl-click toggles a two-selection (group panel, group drag, delete-all)', () => {
    const commit = mountSlot(PAIR)
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    commit.mockClear()
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(screen.getByText('2 elements selected')).toBeTruthy()
    // group drag moves both (readout counts the group)
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(outlineOf(boxes()[1]!), { clientX: 530, clientY: 500 })
    expect(screen.getByText(/2 els · bbox = \[/)).toBeTruthy()
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    const els = lastPrompt(commit)
    expect(els[0]!.bbox).toEqual([100, 125, 300, 325])
    expect(els[1]!.bbox).toEqual([500, 525, 800, 825])
    // delete-all clears the group; deselect path covered on the fresh pick
    fireEvent.click(screen.getByText('Delete all'))
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('ctrl-click again untoggles; Deselect clears the group', () => {
    mountSlot(PAIR)
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(screen.getByText('2 elements selected')).toBeTruthy()
    fireEvent.click(screen.getByText('Deselect'))
    expect(screen.queryByText('2 elements selected')).toBeNull()
    expect(screen.getByText('Layout stack')).toBeTruthy()
    // back to two, then untoggle one: the single inspector returns
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(screen.queryByText('2 elements selected')).toBeNull()
    expect(screen.getByPlaceholderText('a ceramic coffee mug, steam rising')).toBeTruthy()
  })

  test('a group drag keeps the unselected off the delta', () => {
    const commit = mountSlot(JSON.stringify({
      compositional_deconstruction: {
        background: '',
        elements: [
          { type: 'obj', desc: 'a', bbox: [100, 100, 300, 300] },
          { type: 'obj', desc: 'b', bbox: [400, 400, 600, 600] },
          { type: 'obj', desc: 'c', bbox: [700, 700, 900, 900] },
        ],
      },
    }))
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    commit.mockClear()
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(outlineOf(boxes()[1]!), { clientX: 430, clientY: 400 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    const els = lastPrompt(commit)
    expect(els[0]!.bbox).toEqual([100, 125, 300, 325])
    expect(els[1]!.bbox).toEqual([400, 425, 600, 625])
    expect(els[2]!.bbox).toEqual([700, 700, 900, 900])
  })

  test('the grid toggle hides the grid layers', () => {
    mountSlot(MUG)
    expect(document.querySelectorAll('[data-grid]').length).toBe(2)
    fireEvent.click(screen.getAllByRole('button')[10]!) // grid toggle
    expect(document.querySelectorAll('[data-grid]').length).toBe(0)
    fireEvent.click(screen.getAllByRole('button')[10]!)
    expect(document.querySelectorAll('[data-grid]').length).toBe(2)
  })

  test('a canvas PNG drop restores the layout', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    const bg = document.querySelector('[data-canvas-bg="1"]')!
    const container = bg.parentElement!
    dragOver(container)
    expect(screen.getByText('Drop PNG to restore layout')).toBeTruthy()
    // leaving from a child never clears the overlay (happy-dom's dragLeave
    // helper does not bubble, so dispatch a real bubbling leave by hand)
    bg.dispatchEvent(new Event('dragleave', { bubbles: true }))
    expect(screen.getByText('Drop PNG to restore layout')).toBeTruthy()
    // leaving the container itself clears it
    fireEvent.dragLeave(container)
    expect(screen.queryByText('Drop PNG to restore layout')).toBeNull()
    dragOver(container)
    dropFile(container, PNG_MUG())
    await waitFor(() => {
      expect(screen.getAllByText('pngmug').length).toBeGreaterThan(0)
    })
    expect(toastsSince(before).some((t) => t.message === 'Restored 1 element from PNG')).toBe(true)
  })

  test('a canvas drop without files and a hover without files rest', () => {
    mountSlot('')
    const container = document.querySelector('[data-canvas-bg="1"]')!.parentElement!
    dropFile(container, null)
    dragOver(container, ['text/plain'])
    expect(screen.queryByText('Drop PNG to restore layout')).toBeNull()
    expect(screen.getByText('No elements yet')).toBeTruthy()
    // a second hover while the overlay is already up never flickers it
    dragOver(container)
    dragOver(container)
    expect(screen.getByText('Drop PNG to restore layout')).toBeTruthy()
  })

  test('canvas drops refuse non-PNG, caption-less PNG, and unreadable bytes', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    const container = document.querySelector('[data-canvas-bg="1"]')!.parentElement!
    dropFile(container, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Only PNG files can be re-inflated')).toBe(true)
    })
    dropFile(container, pngFile([pngText('prompt', 'words'), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'No Ideogram caption found in PNG metadata')).toBe(true)
    })
    const bad = PNG_MUG()
    Object.defineProperty(bad, 'arrayBuffer', { value: async () => { throw new Error('canvas-boom') } })
    dropFile(container, bad)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'canvas-boom')).toBe(true)
    })
    const worse = PNG_MUG()
    Object.defineProperty(worse, 'arrayBuffer', { value: async () => { throw 'canvas-string' } })
    dropFile(container, worse)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Failed to read PNG')).toBe(true)
    })
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('a canvas drop of two elements pluralizes the toast', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    const container = document.querySelector('[data-canvas-bg="1"]')!.parentElement!
    dropFile(container, pngFile([
      pngText('prompt', JSON.stringify({ compositional_deconstruction: { background: '', elements: [
        { type: 'obj', desc: 'one', bbox: [10, 10, 100, 100] },
        { type: 'obj', desc: 'two', bbox: [200, 200, 300, 300] },
      ] } })),
      pngChunk('IEND', new Uint8Array(0)),
    ]))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Restored 2 elements from PNG')).toBe(true)
    })
    expect(screen.getAllByText(/bbox \[/).length).toBe(2)
  })

  test('a drag with a bystander exercises the whole map', () => {
    const commit = mountSlot(PAIR)
    const outline = outlineOf(boxes()[0]!)
    fireEvent.pointerDown(outline, { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(outline, { clientX: 130, clientY: 100 })
    fireEvent.pointerUp(outline, { pointerId: 1 })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 125, 300, 325])
    expect(lastPrompt(commit)[1]!.bbox).toEqual([500, 500, 800, 800])
  })
})

// ─── Canvas: keyboard ───────────────────────────────────────────────────────

describe('editor keyboard shortcuts', () => {
  test('arrows nudge (shift steps 50), Delete removes, ⌘D duplicates, Esc clears', () => {
    const commit = mountSlot(PAIR)
    clickRow('bbox [100, 100, 300, 300]')
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 110, 300, 310])
    fireEvent.keyDown(document.body, { key: 'ArrowDown', shiftKey: true })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([150, 110, 350, 310])
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true })
    expect(lastPrompt(commit).length).toBe(3)
    fireEvent.keyDown(document.body, { key: 'd', metaKey: true })
    expect(lastPrompt(commit).length).toBe(4)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('a ceramic coffee mug, steam rising')).toBeNull()
    // re-pick and delete
    clickRow('bbox [500, 500, 800, 800]')
    fireEvent.keyDown(document.body, { key: 'Backspace' })
    expect(screen.queryByText('bbox [500, 500, 800, 800]')).toBeNull()
  })

  test('all four arrows land; other keys rest', () => {
    const commit = mountSlot(PAIR)
    clickRow('bbox [100, 100, 300, 300]')
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([100, 90, 300, 290])
    fireEvent.keyDown(document.body, { key: 'ArrowUp' })
    expect(lastPrompt(commit)[0]!.bbox).toEqual([90, 90, 290, 290])
    const n = commit.mock.calls.length
    fireEvent.keyDown(document.body, { key: 'a' })
    fireEvent.keyDown(document.body, { key: 'd' }) // no modifier: rests
    expect(commit.mock.calls.length).toBe(n)
  })

  test('typing in fields never nudges (Escape still deselects)', () => {
    const commit = mountSlot(PAIR)
    clickRow('bbox [100, 100, 300, 300]')
    const desc = screen.getByPlaceholderText('a ceramic coffee mug, steam rising')
    const n = commit.mock.calls.length
    fireEvent.keyDown(desc, { key: 'ArrowRight' })
    expect(commit.mock.calls.length).toBe(n)
    fireEvent.keyDown(desc, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('a ceramic coffee mug, steam rising')).toBeNull()
  })

  test('an empty selection rests on every key but Escape', () => {
    const commit = mountSlot(PAIR)
    const n = commit.mock.calls.length
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    fireEvent.keyDown(document.body, { key: 'Delete' })
    fireEvent.keyDown(document.body, { key: 'a' })
    expect(commit.mock.calls.length).toBe(n)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(commit.mock.calls.length).toBe(n)
  })
})

// ─── Toolbar Load PNG ───────────────────────────────────────────────────────

describe('toolbar Load PNG', () => {
  test('a picked PNG imports (toolbar input path)', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    // the Load PNG button seats the hidden input (its own click face)
    fireEvent.click(screen.getByText('Load PNG').closest('button')!)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    pickFile(input, PNG_MUG())
    await waitFor(() => {
      expect(screen.getAllByText('pngmug').length).toBeGreaterThan(0)
    })
    expect(toastsSince(before).some((t) => t.message === 'Loaded 1 element from PNG metadata (gen.png)')).toBe(true)
  })

  test('the picker refuses non-PNG, caption-less PNG, empty picks, unreadable bytes', async () => {
    mountSlot('')
    const before = useToastStore.getState().toasts.length
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    pickFile(input, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Only PNG files can be re-inflated')).toBe(true)
    })
    pickFile(input, pngFile([pngText('prompt', 'words'), pngChunk('IEND', new Uint8Array(0))]))
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'No Ideogram caption found in PNG metadata')).toBe(true)
    })
    pickFile(input, null)
    const bad = PNG_MUG()
    Object.defineProperty(bad, 'arrayBuffer', { value: async () => { throw new Error('nope-bytes') } })
    pickFile(input, bad)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'nope-bytes')).toBe(true)
    })
    // a non-Error throw lands on the fallback message
    const worse = PNG_MUG()
    Object.defineProperty(worse, 'arrayBuffer', { value: async () => { throw 'string-boom' } })
    pickFile(input, worse)
    await waitFor(() => {
      expect(toastsSince(before).some((t) => t.message === 'Failed to read PNG')).toBe(true)
    })
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })
})

// ─── Ingest / echo / fallbacks ──────────────────────────────────────────────

/** Stateful editor harness: the elementsJson prop models a parent preset load. */
function EditorDriven({ elementsJson, onSeated }: { elementsJson: string; onSeated?: (json: string) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({ elements: elementsJson })
  useEffect(() => {
    setValues((p) => ({ ...p, elements: elementsJson }))
  }, [elementsJson])
  const set: Dispatch<SetStateAction<Record<string, unknown>>> = (u) => {
    setValues((p) => {
      const next = typeof u === 'function' ? (u as (x: typeof p) => typeof p)(p) : u
      onSeated?.(String(next.elements))
      return next
    })
  }
  return h(IdeogramCanvasEditor, { values, setValues: set })
}

describe('external ingest + dimension fallbacks', () => {
  test('a stale parent echo never clobbers a local write (already-ingested rest)', () => {
    let written = ''
    const { rerender } = render(h(EditorDriven, { elementsJson: '[]', onSeated: (j) => { written = j } }))
    fireEvent.click(screen.getAllByRole('button')[0]!) // toolbar Object
    expect(written).not.toBe('[]')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getAllByText(/bbox \[/).length).toBe(1)
    // the parent seats a preset: the canvas ingests it wholesale
    rerender(h(EditorDriven, { elementsJson: ELS_PAIR, onSeated: (j) => { written = j } }))
    expect(screen.getAllByText(/bbox \[/).length).toBe(2)
    // the parent echoes the local write back: already-written rest
    rerender(h(EditorDriven, { elementsJson: written, onSeated: (j) => { written = j } }))
    expect(screen.getAllByText(/bbox \[/).length).toBe(2)
    // the parent re-seats the preset it already sent: already-ingested rest,
    // the ingested pair survives untouched (no re-parse, no wipe)
    rerender(h(EditorDriven, { elementsJson: ELS_PAIR, onSeated: (j) => { written = j } }))
    expect(screen.getByText('bbox [100, 100, 300, 300]')).toBeTruthy()
    expect(screen.getByText('bbox [500, 500, 800, 800]')).toBeTruthy()
    // invalid JSON never wipes the canvas
    rerender(h(EditorDriven, { elementsJson: 'nope', onSeated: (j) => { written = j } }))
    expect(screen.getAllByText(/bbox \[/).length).toBe(2)
  })

  test('missing dims fall back to the 1024 square', () => {
    render(h(EditorStatic, { values: { elements: '[]' } }))
    expect(screen.getAllByText('1:1').length).toBeGreaterThan(0)
  })

  test('a non-numeric width falls back too', () => {
    render(h(EditorStatic, { values: { elements: '[]', width: 'abc', height: 'xyz' } }))
    expect(screen.getAllByText('1:1').length).toBeGreaterThan(0)
  })
})

// ─── Direct canvas + misc faces ─────────────────────────────────────────────

describe('IdeogramCanvas direct faces', () => {
  const base = {
    selectedIds: [] as string[],
    onSelect: () => {},
    showGrid: false,
    snapEnabled: true,
    background: '',
    width: 1024,
    height: 1024,
  }

  test('a bare canvas renders (no toggle, no drop, no import)', () => {
    const onCommit = vi.fn()
    const onSelect = vi.fn()
    const els = JSON.parse(PAIR).compositional_deconstruction.elements as Array<{
      id?: string; type: 'obj' | 'text' | 'logo'; desc: string; text?: string;
      bbox: [number, number, number, number]; color_palette?: string[];
    }>
    render(h(IdeogramCanvas, {
      ...base, elements: els.map((e, i) => ({ ...e, id: `e${i}`, color_palette: [] })), onCommit,
      onSelect, onToggleSelect: undefined, onImportElements: undefined, className: 'extra', maxHeight: 400,
    }))
    // no import seat: hovering files never arms an overlay
    const container = document.querySelector('[data-canvas-bg="1"]')!.parentElement!
    dragOver(container)
    expect(screen.queryByText('Drop PNG to restore layout')).toBeNull()
    // ctrl-click without a toggle still selects (falls through to the drag)
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(onSelect).toHaveBeenCalledWith('e1')
  })

  test('a tiny box skips its label; a palette box shows its strip', () => {
    const onCommit = vi.fn()
    render(h(IdeogramCanvas, {
      ...base,
      elements: [
        { id: 't', type: 'obj', desc: 'tiny', bbox: [0, 0, 20, 20], color_palette: [] },
        { id: 'p', type: 'obj', desc: 'striped', bbox: [100, 100, 400, 400], color_palette: ['#FF0000'] },
      ],
      onCommit,
    }))
    expect(within(boxes()[0]!).queryByText('tiny')).toBeNull()
    expect(within(boxes()[1]!).getByText('striped')).toBeTruthy()
  })

  test('the background text shows when seated', () => {
    const onCommit = vi.fn()
    render(h(IdeogramCanvas, { ...base, elements: [], onCommit, background: 'a desk at dusk' }))
    expect(screen.getByText('a desk at dusk')).toBeTruthy()
  })
})

// ─── Fullscreen ─────────────────────────────────────────────────────────────

describe('fullscreen dialog', () => {
  test('an empty canvas opens the dialog list and closes it', async () => {
    mountSlot('')
    fireEvent.click(screen.getAllByRole('button')[13]!) // fullscreen
    await waitFor(() => {
      expect(screen.getByText('Ideogram 4 Canvas')).toBeTruthy()
    })
    // the dialog seats its own list copy (main canvas keeps the other)
    expect(screen.getAllByText('No elements yet').length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByText('Ideogram 4 Canvas')).toBeNull()
    })
  })

  test('a selection opens the dialog inspector', async () => {
    mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    fireEvent.click(screen.getAllByRole('button')[14]!) // fullscreen (Clear shifts it)
    await waitFor(() => {
      expect(screen.getByText('Ideogram 4 Canvas')).toBeTruthy()
    })
    expect(screen.getAllByPlaceholderText('a ceramic coffee mug, steam rising').length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByText('Ideogram 4 Canvas')).toBeNull()
    })
  })
})

// ─── Dialog mirrors (side panel without the group branch) ───────────────────

describe('fullscreen dialog mirrors', () => {
  /** Inspector buttons inside the dialog (same order law as the main one). */
  function dialogInspectorButtons(placeholder: string): HTMLElement[] {
    const inputs = screen.getAllByPlaceholderText(placeholder)
    const desc = inputs[inputs.length - 1]!
    const btns = Array.from(desc.parentElement!.parentElement!.querySelectorAll('button')).slice(0, 4)
    expect(btns.length).toBe(4)
    return btns
  }

  test('the dialog inspector updates, reorders, duplicates, and deletes', () => {
    const commit = mountSlot(MUG)
    clickRow('bbox [100, 100, 400, 400]')
    fireEvent.click(screen.getAllByRole('button')[14]!) // fullscreen (Clear shifts it)
    // the dialog seats its own inspector copy
    expect(screen.getAllByPlaceholderText('a ceramic coffee mug, steam rising').length).toBe(2)
    const ph = 'a ceramic coffee mug, steam rising'
    fireEvent.change(screen.getAllByPlaceholderText(ph)[1]!, { target: { value: 'dialog mug' } })
    expect((lastPrompt(commit)[0] as { desc?: string }).desc).toBe('dialog mug')
    const [send, bring, dup] = dialogInspectorButtons(ph)
    fireEvent.click(bring!)
    fireEvent.click(send!)
    expect(commit).toHaveBeenCalled()
    fireEvent.click(dup!)
    expect(lastPrompt(commit).length).toBe(2)
    const [, , , del] = dialogInspectorButtons(ph)
    fireEvent.click(del!)
    expect(lastPrompt(commit).length).toBe(1)
  })

  test('the dialog empty-state adds ride the dialog list callbacks', () => {
    for (const label of ['Object', 'Text', 'Logo']) {
      const { unmount } = render(h(IdeoCanvasSlot, {
        name: 'prompt', value: '', width: 1024, height: 1024, commit: (() => {}) as never,
      }))
      fireEvent.click(screen.getAllByRole('button')[13]!) // fullscreen
      const titles = screen.getAllByText('No elements yet')
      expect(titles.length).toBe(2) // main canvas + dialog copy
      const dialogEmpty = titles[1]!.parentElement!
      fireEvent.click(within(dialogEmpty).getByText(label))
      expect(screen.queryByText('No elements yet')).toBeNull()
      unmount()
    }
  })

  test('a two-selection renders selected rows in the dialog list', () => {
    mountSlot(PAIR)
    fireEvent.pointerDown(outlineOf(boxes()[0]!), { button: 0, clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[0]!), { pointerId: 1 })
    fireEvent.pointerDown(outlineOf(boxes()[1]!), { button: 0, ctrlKey: true, clientX: 500, clientY: 500, pointerId: 1 })
    fireEvent.pointerUp(outlineOf(boxes()[1]!), { pointerId: 1 })
    expect(screen.getByText('2 elements selected')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button')[14]!) // fullscreen (Clear shifts it)
    // the dialog list (no group branch) shows both selected rows
    expect(screen.getByText('bbox [100, 100, 300, 300]')).toBeTruthy()
    expect(screen.getByText('bbox [500, 500, 800, 800]')).toBeTruthy()
  })
})

// ─── Direct editor faces (frozen values, unwired parents) ───────────────────

describe('direct editor faces', () => {
  test('a photo seat with no style keys renders empty photo fields', () => {
    render(h(EditorStatic, { values: { elements: '[]', style_type: 'photo' } }))
    fireEvent.click(screen.getByText('Style'))
    expect((screen.getByPlaceholderText('Kodak Portra 400, grainy') as HTMLInputElement).value).toBe('')
  })

  test('seated lighting, medium, and palette assemble into the caption', () => {
    render(h(EditorStatic, {
      values: {
        elements: '[]', style_type: 'photo',
        lighting: 'soft', medium: 'film', style_palette: '#123456',
      },
    }))
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Full caption'))
    const pre = document.querySelector('pre')!
    expect(pre.textContent).toContain('soft')
    expect(pre.textContent).toContain('film')
    expect(pre.textContent).toContain('#123456')
  })

  test('a seated high-level line assembles at the top level', () => {
    const commit = mountSlot(JSON.stringify({
      high_level_description: 'a quiet desk',
      compositional_deconstruction: { background: '', elements: [] },
    }))
    expect(commit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Full caption'))
    expect(document.querySelector('pre')!.textContent).toContain('a quiet desk')
  })

  test('a missing elements key mounts empty; invalid JSON mounts empty too', () => {
    const first = render(h(EditorStatic, { values: {} }))
    expect(screen.getByText('No elements yet')).toBeTruthy()
    // with no style_type seated the style tab falls back to the none pill
    fireEvent.click(screen.getByText('Style'))
    expect(screen.getByText('Style presets')).toBeTruthy()
    expect(screen.getByText('None')).toBeTruthy()
    first.unmount()
    render(h(EditorStatic, { values: { elements: '{oops' } }))
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('dropping the elements key never wipes the canvas', () => {
    const setValues = () => {}
    const { rerender } = render(h(IdeogramCanvasEditor, { values: { elements: '[]' }, setValues }))
    expect(screen.getByText('No elements yet')).toBeTruthy()
    rerender(h(IdeogramCanvasEditor, { values: {}, setValues }))
    expect(screen.getByText('No elements yet')).toBeTruthy()
  })

  test('a text element without text previews its type', () => {
    mountSlot('')
    fireEvent.click(screen.getByText('JSON'))
    fireEvent.click(screen.getByText('Elements JSON'))
    const area = screen.getByPlaceholderText('[{"type":"obj","desc":"...","bbox":[...]}]')
    fireEvent.change(area, {
      target: { value: JSON.stringify([{ type: 'text', desc: 'x', bbox: [10, 10, 100, 100] }]) },
    })
    fireEvent.click(screen.getByText('Apply'))
    fireEvent.click(screen.getByText('Elements'))
    // the canvas box and the list row both fall back to the type name
    expect(screen.getAllByText('“text”').length).toBeGreaterThan(1)
  })
})
