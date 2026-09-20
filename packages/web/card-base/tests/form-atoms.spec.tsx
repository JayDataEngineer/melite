// @vitest-environment happy-dom
// form-atoms.spec.tsx — THE CONSTRUCTOR's atoms (form.tsx part 1):
// TriStateAtom, SpecSliderAtom (+ the settle law), SpecAtom's full
// type switch, SpecFieldRow (+ the seed dice), SourceRow. Every atom
// renders from its declaration; coercion happens once at patch.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { SpecField } from '../src/spec.ts'

import {
  SourceRow,
  SpecAtom,
  SpecFieldRow,
  SpecSliderAtom,
  TriStateAtom,
} from '../src/form.tsx'
import { OverlayKnob } from '../src/rows.tsx'

afterEach(cleanup)

const F = (over: Partial<SpecField> = {}): SpecField =>
  ({ name: 'prompt', label: 'Prompt', type: 'text', ...over }) as SpecField

test('ATOM: the number face — type=number carries the field facts; text stays text (2026-09-18, the conviction)', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'shift_video', label: 'Shift video', type: 'number', min: 0, max: 24, step: 0.5 })
  render(h(SpecAtom, { f, value: 8, onEdit }))
  const input = screen.getByLabelText('Shift video') as HTMLInputElement
  expect(input.type).toBe('number')
  expect(input.min).toBe('0')
  expect(input.max).toBe('24')
  expect(input.step).toBe('0.5')
  // the value still travels as the RAW STRING — coerce once at patch, the estate's law
  fireEvent.change(input, { target: { value: '9.5' } })
  expect(onEdit).toHaveBeenCalledWith('shift_video', '9.5')
  cleanup()
  const t = render(h(SpecAtom, { f: F({ name: 'note', label: 'Note' }), value: '', onEdit: vi.fn() }))
  expect((t.getByLabelText('Note') as HTMLInputElement).type).toBe('text')
})

test('TRI-STATE: inherit / on / off round-trip (the unset path is native undefined)', () => {
  const onEdit = vi.fn()
  const { rerender } = render(h(TriStateAtom, { label: 'T', value: undefined, onEdit, name: 't' }))
  expect((screen.getByLabelText('T') as HTMLSelectElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('T'), { target: { value: 'true' } })
  expect(onEdit).toHaveBeenCalledWith('t', true)
  fireEvent.change(screen.getByLabelText('T'), { target: { value: 'false' } })
  expect(onEdit).toHaveBeenCalledWith('t', false)
  rerender(h(TriStateAtom, { label: 'T', value: true, onEdit, name: 't' }))
  expect((screen.getByLabelText('T') as HTMLSelectElement).value).toBe('true')
  fireEvent.change(screen.getByLabelText('T'), { target: { value: '' } })
  expect(onEdit).toHaveBeenCalledWith('t', undefined)
  rerender(h(TriStateAtom, { label: 'T', value: false, onEdit, name: 't', disabled: true }))
  expect((screen.getByLabelText('T') as HTMLSelectElement).disabled).toBe(true)
})

test('SLIDER: the drag shows locally AND voices (React settles range onChange per input event)', () => {
  const onEdit = vi.fn()
  render(h(SpecSliderAtom, { f: F({ name: 'cfg', label: 'Cfg', type: 'slider', min: 0, max: 10, step: 0.5 }), value: 5, onEdit }))
  const slider = screen.getByLabelText('Cfg') as HTMLInputElement
  expect(slider.value).toBe('5')
  fireEvent.input(slider, { target: { value: '7' } })
  expect(screen.getByText('7')).not.toBeNull()
  expect(onEdit).toHaveBeenCalledWith('cfg', '7')
  fireEvent.change(slider, { target: { value: '8' } })
  expect(onEdit).toHaveBeenCalledWith('cfg', '8')
})

test('SLIDER: an outside move reclaims the bubble; a held non-number refuses AS ITSELF', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'cfg', label: 'Cfg', type: 'slider' })
  const { rerender } = render(h(SpecSliderAtom, { f, value: 5, onEdit }))
  fireEvent.input(screen.getByLabelText('Cfg'), { target: { value: '9' } })
  expect(screen.getByText('9')).not.toBeNull()
  rerender(h(SpecSliderAtom, { f, value: 6, onEdit }))
  expect(screen.getByText('6')).not.toBeNull()
  rerender(h(SpecSliderAtom, { f, value: 'poison', onEdit }))
  expect(screen.getByText('poison — REFUSED: not a number')).not.toBeNull()
  expect(document.querySelector('[data-refused="cfg"]')).not.toBeNull()
})

test('SLIDER: undeclared bounds fall to 0..10 × 0.1 (never an unbound drag)', () => {
  render(h(SpecSliderAtom, { f: F({ name: 's', label: 'S', type: 'slider' }), value: 1, onEdit: () => {} }))
  const slider = screen.getByLabelText('S') as HTMLInputElement
  expect(slider.min).toBe('0')
  expect(slider.max).toBe('10')
  expect(slider.step).toBe('0.1')
})

test('SPEC ATOM: the image square builds when claimed; bare text when not (never a bare URL input)', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'img', label: 'Image', type: 'image' })
  const square = { verbs: {}, display: undefined }
  const { unmount } = render(h(SpecAtom, { f, value: 'https://host/a.png', onEdit, square }))
  expect(screen.getByRole('button', { name: 'Image source' })).not.toBeNull()
  unmount()
  render(h(SpecAtom, { f, value: 'https://host/a.png', onEdit }))
  expect(screen.getByLabelText('Image')).not.toBeNull()
})

test('SPEC ATOM: a mesh field rides the same square — the inline viewport, never a URL input', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'rig', label: 'Rig', type: 'mesh' })
  render(h(SpecAtom, { f, value: 'data/input/donor.glb', onEdit, square: { verbs: {} } }))
  expect(screen.getByRole('button', { name: 'Rig source' })).not.toBeNull()
  expect(document.querySelector('[data-viewport="square-mesh"]')).not.toBeNull()
})

test('SPEC ATOM: the square face — mirror wins, then the value; junk values show the metric', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'img', label: 'Image', type: 'image' })
  const first = render(h(SpecAtom, {
    f, value: 'stale-value', onEdit,
    square: { verbs: {}, display: 'https://host/fresh.png' },
  }))
  expect(document.querySelector('img')?.getAttribute('src')).toBe('https://host/fresh.png')
  first.unmount()
  render(h(SpecAtom, {
    f, value: 'stale-value', onEdit, square: { verbs: {}, display: '' },
  }))
  expect(screen.getByText('stale-value')).not.toBeNull()
})

test('SPEC ATOM: select normalizes string + object rows; the value rides verbatim, the face title-cases', () => {
  const onEdit = vi.fn()
  render(h(SpecAtom, {
    f: F({ name: 'size', label: 'Size', type: 'select', options: ['draft_02mp', { value: 'hd', label: 'high-def' }] }),
    value: 'hd', onEdit,
  }))
  expect(screen.getByText('Draft 02mp')).not.toBeNull()
  expect(screen.getByText('High Def')).not.toBeNull()
  fireEvent.change(screen.getByLabelText('Size'), { target: { value: 'draft_02mp' } })
  expect(onEdit).toHaveBeenCalledWith('size', 'draft_02mp')
})

test('SPEC ATOM: the select GHOST — the inherit option binds undefined to \'\' (never the painted-first lie)', () => {
  // THE ONE SEMANTIC ADDITION (2026-09-18, the operator's ruling):
  // ghost renders a leading value='' option; undefined binds to it;
  // picking it voices '' (the call site's adapter coerces to unset).
  const onEdit = vi.fn()
  const { unmount } = render(h(SpecAtom, {
    f: F({ name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'on', label: 'on' }] }),
    value: undefined, ghost: '\u2190 on', onEdit,
  }))
  const sel = screen.getByLabelText('Mode') as HTMLSelectElement
  expect(sel.value).toBe('')
  expect(screen.getByText('\u2190 on')).not.toBeNull()
  fireEvent.change(sel, { target: { value: 'on' } })
  expect(onEdit).toHaveBeenCalledWith('mode', 'on')
  unmount()
  // without the ghost, no '' option exists — the option list is the
  // authored set alone (the required-valued selects: route/preset)
  render(h(SpecAtom, {
    f: F({ name: 'route', label: 'Route', type: 'select', options: ['a', 'b'] }),
    value: 'a', onEdit,
  }))
  expect((screen.getByLabelText('Route') as HTMLSelectElement).options).toHaveLength(2)
})

test('SPEC ATOM: a select without options falls to the raw input (never an empty select)', () => {
  const onEdit = vi.fn()
  render(h(SpecAtom, { f: F({ name: 's', label: 'S', type: 'select' }), value: 'v', onEdit }))
  expect((screen.getByLabelText('S') as HTMLInputElement).value).toBe('v')
  const bare = render(h(SpecAtom, {
    f: F({ name: 's2', label: 'S2', type: 'select', options: [] }), value: 'w', onEdit,
  }))
  void bare
  expect((screen.getByLabelText('S2') as HTMLInputElement).value).toBe('w')
})

test('SPEC ATOM: slider + tri route to their atoms (null tri drafts inherit)', () => {
  const onEdit = vi.fn()
  const tri = F({ name: 't', label: 'T', type: 'tri' })
  const { rerender } = render(h(SpecAtom, { f: tri, value: null, onEdit }))
  expect((screen.getByLabelText('T') as HTMLSelectElement).value).toBe('')
  rerender(h(SpecAtom, { f: tri, value: 'true', onEdit }))
  expect((screen.getByLabelText('T') as HTMLSelectElement).value).toBe('true')
  rerender(h(SpecAtom, { f: F({ name: 's', label: 'S', type: 'slider' }), value: 2, onEdit }))
  expect((screen.getByLabelText('S') as HTMLInputElement).type).toBe('range')
})

test('SPEC ATOM: the switch — poison refuses AS ITSELF; the toggle writes booleans', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'turbo', label: 'Turbo', type: 'switch' })
  const { rerender } = render(h(SpecAtom, { f, value: 5, onEdit }))
  expect(screen.getByText('Turbo: 5 — REFUSED: not a boolean')).not.toBeNull()
  rerender(h(SpecAtom, { f, value: 'yes', onEdit }))
  expect(screen.getByText('Turbo: yes — REFUSED: not a boolean')).not.toBeNull()
  rerender(h(SpecAtom, { f, value: 'true', onEdit }))
  const sw = screen.getByRole('switch', { name: 'Turbo' })
  expect(sw.getAttribute('aria-checked')).toBe('true')
  fireEvent.click(sw)
  expect(onEdit).toHaveBeenCalledWith('turbo', false)
  rerender(h(SpecAtom, { f: F({ name: 'b', label: 'B', type: 'boolean' }), value: undefined, onEdit }))
  expect(screen.getByRole('switch', { name: 'B' }).getAttribute('aria-checked')).toBe('false')
})

test('SPEC ATOM: the textarea starts two rows, grows with content, and writes', () => {
  const onEdit = vi.fn()
  render(h(SpecAtom, {
    f: F({ name: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'describe…' }),
    value: 'a cat', onEdit,
  }))
  const area = screen.getByLabelText('Prompt') as HTMLTextAreaElement
  expect(area.getAttribute('rows')).toBe('2')
  expect(area.placeholder).toBe('describe…')
  fireEvent.change(area, { target: { value: 'a cat, four lines tall' } })
  expect(onEdit).toHaveBeenCalledWith('prompt', 'a cat, four lines tall')
})

test('SPEC ATOM: the raw input — absent shows empty, the placeholder override wins', () => {
  const onEdit = vi.fn()
  const { rerender } = render(h(SpecAtom, { f: F({}), value: undefined, onEdit, placeholder: 'seeded?' }))
  const input = screen.getByLabelText('Prompt') as HTMLInputElement
  expect(input.value).toBe('')
  expect(input.placeholder).toBe('seeded?')
  fireEvent.change(input, { target: { value: '3.5' } })
  expect(onEdit).toHaveBeenCalledWith('prompt', '3.5')
  rerender(h(SpecAtom, { f: F({ placeholder: 'field ph' }), value: 'x', onEdit }))
  expect((screen.getByLabelText('Prompt') as HTMLInputElement).placeholder).toBe('field ph')
})

test('FIELD ROW: the seed dice — random fills, fixed hollows, the toggle mints both ways', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'seed', label: 'Seed', type: 'number' })
  const { rerender } = render(h(SpecFieldRow, { f, value: -1, onEdit }))
  expect(document.querySelector('[data-seed-dice="random"]')).not.toBeNull()
  expect((screen.getByLabelText('Seed') as HTMLInputElement).placeholder).toBe('random — new every run')
  const guess = vi.spyOn(Math, 'random').mockReturnValue(0.5)
  fireEvent.click(screen.getByRole('button', { name: 'seed dice' }))
  expect(onEdit).toHaveBeenCalledWith('seed', 1073741823)
  guess.mockRestore()
  rerender(h(SpecFieldRow, { f, value: 42, onEdit }))
  expect(document.querySelector('[data-seed-dice="fixed"]')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'seed dice' }))
  expect(onEdit).toHaveBeenCalledWith('seed', -1)
  rerender(h(SpecFieldRow, { f, value: '-1', onEdit }))
  expect(document.querySelector('[data-seed-dice="random"]')).not.toBeNull()
})

test('FIELD ROW: the stacked face — key, required star, the hover (i), and the passthrough seams', () => {
  const onEdit = vi.fn()
  const square = { verbs: {} }
  render(h(SpecFieldRow, {
    f: F({ required: true, tooltip: 'be nice' }), value: 'x', onEdit, square,
    wireCandidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }],
  }))
  expect(screen.getByText('*')).not.toBeNull()
  // HOUR 21 — the operator's law: help prose rides a hover (i) beside
  // the label (aria-carried; the DSH Tooltip paints on hover), NEVER
  // a flat always-visible line under the field
  const glyph = document.querySelector('[class*="specInfo"]')
  expect(glyph).not.toBeNull()
  expect(glyph!.getAttribute('aria-label')).toBe('info: be nice')
  expect(glyph!.textContent).toBe('i')
  // the glyph sits INSIDE the key line, right of the label
  expect(document.querySelector('[class*="specFieldKey"] [class*="specInfo"]')).not.toBeNull()
  const plain = render(h(SpecFieldRow, { f: F({ tooltip: '' }), value: 'x', onEdit }))
  void plain
  // absent prose, NO glyph (space confirmed only when info exists)
  expect(plain.container.querySelector('[class*="specInfo"]')).toBeNull()
})

test('SOURCE ROW: the image rail — thumbnail for urls, the metric for junk, silence for null', () => {
  const onEdit = vi.fn()
  const { rerender } = render(h(SourceRow, { label: 'Input', kind: 'image', value: 'https://host/a.png', onEdit }))
  expect(document.querySelector('[data-source-row="Input"]')).not.toBeNull()
  expect(document.querySelector('img')?.getAttribute('src')).toBe('https://host/a.png')
  rerender(h(SourceRow, { label: 'Input', kind: 'image', value: 'stale-path', onEdit }))
  expect(screen.getByText('stale-path')).not.toBeNull()
  rerender(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit, hideLabel: true }))
  expect(document.querySelector('[data-source-row="Input"]')).not.toBeNull()
})

test('SOURCE ROW: the file face + candidates ride the same verbs (one grammar, zero bespoke slots)', () => {
  const onEdit = vi.fn()
  render(h(SourceRow, {
    label: 'Doc', kind: 'file', value: null, onEdit,
    candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }],
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Doc source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(screen.getByText('From flow')).not.toBeNull()
  fireEvent.click(screen.getByTestId('source-pick-row'))
  expect(onEdit).toHaveBeenCalledWith('https://host/a.png')
})

test('SOURCE ROW: a host file law + a claimed pick face ride through (the seams hold)', () => {
  const onEdit = vi.fn()
  const onFile = vi.fn()
  const renderSourcePick = vi.fn((_req: unknown, _fallback: unknown) => h('p', null, 'claimed face'))
  render(h(SourceRow, {
    label: 'Input', kind: 'image', value: null, onEdit, onFile,
    renderSourcePick: renderSourcePick as never,
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(screen.getByText('claimed face')).not.toBeNull()
  expect(renderSourcePick).toHaveBeenCalled()
})

test('SPEC ATOM: an empty label falls back to the field name (a control never ships unnamed)', () => {
  const onEdit = vi.fn()
  render(h(SpecAtom, {
    f: F({ name: 'img', label: '', type: 'image' }),
    value: 'https://host/a.png', onEdit, square: { verbs: {} },
  }))
  expect(screen.getByRole('button', { name: 'img source' })).not.toBeNull()
  const tri = render(h(SpecAtom, { f: F({ name: 't', label: '', type: 'tri' }), value: true, onEdit }))
  void tri
  expect(document.querySelector('select[aria-label="t"]')).not.toBeNull()
})

test('SPEC ATOM: a select with no held value passes empty (the platform seats the first row)', () => {
  render(h(SpecAtom, {
    f: F({ name: 'size', label: 'Size', type: 'select', options: ['a', 'b'] }),
    value: undefined, onEdit: () => {},
  }))
  // the source passes value '' (absence seeds downstream); the DOM
  // seats the first option itself — platform behavior, never a pick
  expect((screen.getByLabelText('Size') as HTMLSelectElement).value).toBe('a')
})

test('FIELD ROW: the seed dice carries the required star (a mandatory mint is marked)', () => {
  render(h(SpecFieldRow, { f: F({ name: 'seed', label: 'Seed', type: 'number', required: true }), value: 7, onEdit: () => {} }))
  expect(screen.getByText('*')).not.toBeNull()
})

/** THE OVERRIDE PARAMETER LAYER (hour 22): OverlayKnob — ONE generic
 * primitive for layered faces (overlay over base over schema floor).
 * The receipts: unset shows EXACTLY what composes (base stamp, else
 * the schema's own default the admission gate fills, else — only
 * then — 'inherit'); REPLACE writes serialize absent (undefined);
 * the schema's bounds/options ride verbatim. */
describe('OverlayKnob: the override parameter layer, one generic face', () => {
  it('unset with a schema default shows THE COMPOSED DEFAULT — never a bare inherit', () => {
    const edits: unknown[][] = []
    const r = render(h(OverlayKnob, {
      name: 'steps', field: { name: 'steps', label: 'Steps', type: 'integer', default: 12, min: 4, max: 30, step: 1 },
      value: undefined, onEdit: (v) => { edits.push([v]) },
    }))
    const inp = r.container.querySelector('input[type="number"]') as HTMLInputElement
    expect(inp.placeholder).toBe('12')
    expect(inp.title).toContain('composes 12')
    expect(inp.min).toBe('4')
    expect(inp.max).toBe('30')
    fireEvent.input(inp, { target: { value: '20' } })
    expect(edits).toEqual([[20]])
    // rerender to the held value first: React's controlled-input
    // tracker dedupes '' against its last render value (a stub-parent
    // artifact — in a live form the state update re-renders anyway)
    r.rerender(h(OverlayKnob, {
      name: 'steps', field: { name: 'steps', label: 'Steps', type: 'integer', default: 12, min: 4, max: 30, step: 1 },
      value: 20, onEdit: (v) => { edits.push([v]) },
    }))
    fireEvent.input(inp, { target: { value: '' } })
    expect(edits).toEqual([[20], [undefined]])
  })

  it('a base stamp wins the face (← 28) and the tooltip names the run', () => {
    const r = render(h(OverlayKnob, {
      name: 'steps', field: { name: 'steps', label: 'Steps', type: 'number', default: 12 },
      value: undefined, base: 28, onEdit: () => {},
    }))
    const inp = r.container.querySelector('input[type="number"]') as HTMLInputElement
    expect(inp.placeholder).toBe('28')
    expect(inp.title).toContain('inherits 28')
  })

  it('enum knobs: the ghost option carries the composed enum default', () => {
    const r = render(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'select', default: 'euler', options: ['euler', 'heun'] },
      value: undefined, onEdit: () => {},
    }))
    const sel = r.container.querySelector('select') as HTMLSelectElement
    expect(sel.value).toBe('')
    expect(sel.options[0]!.text).toBe('euler')
    expect(sel.title).toContain('composes euler')
  })

  it('boolean knobs: on/off vocabulary rides the composed default', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: undefined, onEdit: () => {},
    }))
    const sel = r.container.querySelector('select') as HTMLSelectElement
    expect(sel.options[0]!.text).toBe('off')
    expect(sel.title).toContain('composes off')
  })

  it('no schema field, no base: the honest inherit (never invented facts)', () => {
    const r = render(h(OverlayKnob, { name: 'mystery', value: undefined, onEdit: () => {} }))
    const inp = r.container.querySelector('input') as HTMLInputElement
    expect(inp.placeholder).toBe('inherit')
  })
})
