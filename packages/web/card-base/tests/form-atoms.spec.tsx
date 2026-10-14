// @vitest-environment happy-dom
// form-atoms.spec.tsx — THE CONSTRUCTOR's atoms (form.tsx part 1):
// TriStateAtom, SpecSliderAtom (+ the settle law), SpecAtom's full
// type switch, SpecFieldRow (+ the seed dice), SourceRow. Every atom
// renders from its declaration; coercion happens once at patch.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, test, vi } from 'vitest'
import type { SpecField } from '../src/spec.ts'

import {
  SourceRow,
  SpecAtom,
  SpecFieldRow,
  SpecSliderAtom,
  TriStateAtom,
} from '../src/form.tsx'
import { OverlayKnob } from '../src/rows.tsx'

// THE MENU SELECT helpers (S7h): the tri/enum atoms ride the DSH
// Menu — picks open the trigger (aria-label = the field label) and
// click the menuitem row; face reads read the trigger's text.
function pickRow(label: string, rowName: string | RegExp): void {
  fireEvent.click(screen.getByLabelText(label))
  fireEvent.click(screen.getByRole('menuitem', { name: rowName }))
}
function menuRows(label: string): string[] {
  fireEvent.click(screen.getByLabelText(label))
  const rows = screen.getAllByRole('menuitem').map((r) => r.textContent ?? '')
  fireEvent.click(screen.getByLabelText(label)) // owner bit toggles closed
  return rows
}

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
  expect(screen.getByLabelText('T').textContent).toBe('inherit')
  pickRow('T', 'on')
  expect(onEdit).toHaveBeenCalledWith('t', true)
  pickRow('T', 'off')
  expect(onEdit).toHaveBeenCalledWith('t', false)
  rerender(h(TriStateAtom, { label: 'T', value: true, onEdit, name: 't' }))
  expect(screen.getByLabelText('T').textContent).toBe('on')
  pickRow('T', 'inherit')
  expect(onEdit).toHaveBeenCalledWith('t', undefined)
  rerender(h(TriStateAtom, { label: 'T', value: false, onEdit, name: 't', disabled: true }))
  expect((screen.getByLabelText('T') as HTMLButtonElement).disabled).toBe(true)
})

test('SLIDER: the drag shows locally AND voices (React settles range onChange per input event)', () => {
  const onEdit = vi.fn()
  render(h(SpecSliderAtom, { f: F({ name: 'cfg', label: 'Cfg', type: 'slider', min: 0, max: 10, step: 0.5 }), value: 5, onEdit }))
  // (the mixed knob: the range is '<label> slider', the typed box
  // is '<label>' — the drag's local echo shows in the typed face)
  const slider = screen.getByLabelText('Cfg slider') as HTMLInputElement
  expect(slider.value).toBe('5')
  fireEvent.input(slider, { target: { value: '7' } })
  expect((screen.getByLabelText('Cfg') as HTMLInputElement).value).toBe('7')
  expect(onEdit).toHaveBeenCalledWith('cfg', '7')
  fireEvent.change(slider, { target: { value: '8' } })
  expect(onEdit).toHaveBeenCalledWith('cfg', '8')
})

test('SLIDER: an outside move reclaims the bubble; a held non-number refuses AS ITSELF', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'cfg', label: 'Cfg', type: 'slider' })
  const { rerender } = render(h(SpecSliderAtom, { f, value: 5, onEdit }))
  fireEvent.input(screen.getByLabelText('Cfg slider'), { target: { value: '9' } })
  expect((screen.getByLabelText('Cfg') as HTMLInputElement).value).toBe('9')
  rerender(h(SpecSliderAtom, { f, value: 6, onEdit }))
  expect((screen.getByLabelText('Cfg') as HTMLInputElement).value).toBe('6')
  rerender(h(SpecSliderAtom, { f, value: 'poison', onEdit }))
  expect(screen.getByText('poison — REFUSED: not a number')).not.toBeNull()
  expect(document.querySelector('[data-refused="cfg"]')).not.toBeNull()
})

test('SLIDER: undeclared bounds fall to 0..10 × 0.1 (never an unbound drag)', () => {
  render(h(SpecSliderAtom, { f: F({ name: 's', label: 'S', type: 'slider' }), value: 1, onEdit: () => {} }))
  const slider = screen.getByLabelText('S slider') as HTMLInputElement
  expect(slider.min).toBe('0')
  expect(slider.max).toBe('10')
  expect(slider.step).toBe('0.1')
})

// THE DRAGBAR CLAMP (the form-must-not-author row, 2026-10-13): the
// form never offers what the compose gate refuses — the track clamps
// to the ACTIVE variant's envelope, and a held out-of-envelope value
// renders AS ITSELF, refused (never a clamped neighbor painted over).
test('SLIDER: the track clamps to the variant envelope (turbo cfg 1-2 inside a 0-10 field)', () => {
  render(h(SpecSliderAtom, {
    f: F({ name: 'cfg', label: 'Cfg', type: 'slider', min: 0, max: 10, step: 0.1 }),
    value: 1.5, onEdit: () => {}, envelope: [1, 2],
  }))
  const slider = screen.getByLabelText('Cfg') as HTMLInputElement
  expect(slider.min).toBe('1')
  expect(slider.max).toBe('2')
  expect(slider.value).toBe('1.5')
})

test('SLIDER: a held out-of-envelope value refuses AS ITSELF (the no-clamp-over lie)', () => {
  render(h(SpecSliderAtom, {
    f: F({ name: 'cfg', label: 'Cfg', type: 'slider', min: 0, max: 10, step: 0.1 }),
    value: 3.8, onEdit: () => {}, envelope: [1, 2],
  }))
  expect(screen.getByText('3.8 — OUTSIDE the variant envelope [1, 2]')).not.toBeNull()
  expect(document.querySelector('[data-refused="cfg"]')).not.toBeNull()
  // no track at all — the impossible contract offers no drag
  expect(document.querySelector('input[type="range"]')).toBeNull()
})

test('SLIDER: a null envelope keeps the field bounds; a disjoint envelope refuses outright', () => {
  render(h(SpecSliderAtom, {
    f: F({ name: 'steps', label: 'Steps', type: 'slider', min: 1, max: 50 }),
    value: 20, onEdit: () => {}, envelope: null,
  }))
  expect((screen.getByLabelText('Steps') as HTMLInputElement).max).toBe('50')
  render(h(SpecSliderAtom, {
    f: F({ name: 'steps', label: 'Steps', type: 'slider', min: 1, max: 50 }),
    value: 20, onEdit: () => {}, envelope: [60, 80],
  }))
  // disjoint: the envelope (60-80) meets the field (1-50) in nothing —
  // the refused face names the gap's own span, the knob admits nothing
  expect(screen.getByText('20 — OUTSIDE the variant envelope [50, 60]')).not.toBeNull()
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

test('SPEC ATOM: the detach law — an unrenderable value is HELD, the ✕ armed, never PLUS', () => {
  const onEdit = vi.fn()
  const f = F({ name: 'img', label: 'Image', type: 'image' })
  const box = render(h(SpecAtom, {
    f, value: 'ghost-name.png', onEdit,
    square: { verbs: { onClear: () => { onEdit('') } }, display: '' },
  })).container
  // the box carries the raw value as the held face — no thumb, no PLUS glyph
  expect(box.querySelector('img')).toBeNull()
  expect(box.querySelector('svg')).toBeNull()
  expect(screen.getByText('ghost-name.png')).not.toBeNull()
  // the verb is armed and voices the clear
  fireEvent.click(screen.getByRole('button', { name: 'Detach Image' }))
  expect(onEdit).toHaveBeenCalledWith('')
})

test('SOURCE ROW: the detach law — the seat passes the value verbatim; the square owns the face', () => {
  const onEdit = vi.fn()
  const { container } = render(h(SourceRow, {
    label: 'ref', kind: 'image', value: 'ghost-name.png', onEdit,
  }))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).toBeNull()
  expect(screen.getByText('ghost-name.png')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Detach ref' }))
  expect(onEdit).toHaveBeenCalledWith('')
})

test('SPEC ATOM: a committed image upload previews — the estate path resolves to the assets door (never a blank square)', () => {
  // THE WALL (the operator's live burn: "upload succeeds, no
  // preview"): the upload provider commits 'data/input/x.png' and
  // DELETES the data-URL mirror on success — the rail's square must
  // resolve the persisted path to /v1/assets/inputs/<name>, the
  // same arm SourceRow carries. A blank square here is the shipped
  // bug: isImageUrl rejects the relative path, so the value must
  // ride estateInputUrl BEFORE the gate. Toggle the cure out of
  // SpecAtom and this reds (no <img> renders).
  const onEdit = vi.fn()
  const f = F({ name: 'img', label: 'Image', type: 'image' })
  const view = render(h(SpecAtom, {
    f, value: 'data/input/x.png', onEdit, square: { verbs: {} },
  }))
  expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/v1/assets/inputs/x.png')
  view.unmount()
  const spaced = render(h(SpecAtom, {
    f, value: 'data/input/my file (1).webp', onEdit, square: { verbs: {} },
  }))
  expect(spaced.container.querySelector('img')?.getAttribute('src')).toBe('/v1/assets/inputs/my%20file%20(1).webp')
  spaced.unmount()
  // the non-image estate path still refuses the thumb (junk rides metric, never <img>)
  const junk = render(h(SpecAtom, {
    f, value: 'data/input/x.txt', onEdit, square: { verbs: {} },
  }))
  expect(junk.container.querySelector('img')).toBeNull()
})

test('SPEC ATOM: the multi chips — a closed vocabulary toggles a SET; the wire stays a canonical comma string', () => {
  // the YOLO-classes law (2026-10-08): a detector-owned vocabulary
  // is NEVER a freeform text box — chips toggle, commas ride.
  const onEdit = vi.fn()
  const f = F({
    name: 'labels', label: 'YOLO classes', type: 'select', multi: true,
    options: ['person', { value: 'dog', label: 'dog' }, 'car'],
    tooltip: 'Pick',
  })
  const view = render(h(SpecAtom, { f, value: 'dog, person,dog,', onEdit }))
  const group = screen.getByRole('group', { name: 'YOLO classes' })
  expect(group.getAttribute('title')).toBe('Pick')
  expect(screen.getByText('Person').getAttribute('aria-pressed')).toBe('true')
  // adding voices the SET in declaration order (never click order)
  fireEvent.click(screen.getByText('Car'))
  expect(onEdit).toHaveBeenCalledWith('labels', 'person,dog,car')
  view.rerender(h(SpecAtom, { f, value: 'person,dog,car', onEdit }))
  expect(screen.getByText('Car').getAttribute('aria-pressed')).toBe('true')
  // removing voices the remainder; the last chip clears to EMPTY
  // (the card's compose refuses it LOUD — the face never vetoes)
  fireEvent.click(screen.getByText('Person'))
  expect(onEdit).toHaveBeenCalledWith('labels', 'dog,car')
  view.rerender(h(SpecAtom, { f, value: 'dog', onEdit }))
  fireEvent.click(screen.getByText('Dog'))
  expect(onEdit).toHaveBeenCalledWith('labels', '')
  view.unmount()
  // multi-word values title-case AND toggle (the COCO 'traffic
  // light' face — spaced options are first-class chips)
  const spaced = F({
    name: 'labels', label: 'YOLO classes', type: 'select', multi: true,
    options: ['traffic light', 'person'],
  })
  const sview = render(h(SpecAtom, { f: spaced, value: 'traffic light', onEdit }))
  expect(screen.getByText('Traffic Light').getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByText('Person'))
  expect(onEdit).toHaveBeenCalledWith('labels', 'traffic light,person')
  sview.unmount()
  // no tooltip, no held value: the group still names itself, the
  // unset binds to no chip (never the painted-first lie)
  const plain = render(h(SpecAtom, {
    f: F({ name: 'labels', label: 'YOLO classes', type: 'select', multi: true, options: ['person', 'dog'] }),
    value: undefined, onEdit,
  }))
  expect(screen.getByRole('group', { name: 'YOLO classes' }).getAttribute('title')).toBeNull()
  expect(screen.getByText('Person').getAttribute('aria-pressed')).toBe('false')
  plain.unmount()
})

test('SPEC ATOM: multi rides select WITH a vocabulary only — no-options and non-select fields degrade honestly', () => {
  const onEdit = vi.fn()
  const bare = render(h(SpecAtom, {
    f: F({ name: 'labels', label: 'YOLO classes', type: 'select', multi: true }), value: 'person', onEdit,
  }))
  expect((screen.getByLabelText('YOLO classes') as HTMLInputElement).value).toBe('person')
  bare.unmount()
  render(h(SpecAtom, {
    f: F({ name: 'note', label: 'Note', type: 'text', multi: true }), value: 'x', onEdit,
  }))
  expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('x')
})

test('SPEC ATOM: select normalizes string + object rows; the value rides verbatim, the face title-cases', () => {
  const onEdit = vi.fn()
  render(h(SpecAtom, {
    f: F({ name: 'size', label: 'Size', type: 'select', options: ['draft_02mp', { value: 'hd', label: 'high-def' }] }),
    value: 'hd', onEdit,
  }))
  expect(menuRows('Size')).toEqual(['Draft 02mp', 'High Def'])
  pickRow('Size', 'Draft 02mp')
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
  // the trigger face IS the ghost (verbatim — never title-cased)
  expect(screen.getByLabelText('Mode').textContent).toBe('\u2190 on')
  expect(menuRows('Mode')).toEqual(['\u2190 on', 'On'])
  pickRow('Mode', 'On')
  expect(onEdit).toHaveBeenCalledWith('mode', 'on')
  unmount()
  // without the ghost, no '' option exists — the option list is the
  // authored set alone (the required-valued selects: route/preset)
  render(h(SpecAtom, {
    f: F({ name: 'route', label: 'Route', type: 'select', options: ['a', 'b'] }),
    value: 'a', onEdit,
  }))
  expect(menuRows('Route')).toEqual(['A', 'B'])
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
  expect(screen.getByLabelText('T').textContent).toBe('inherit')
  rerender(h(SpecAtom, { f: tri, value: 'true', onEdit }))
  expect(screen.getByLabelText('T').textContent).toBe('on')
  rerender(h(SpecAtom, { f: F({ name: 's', label: 'S', type: 'slider' }), value: 2, onEdit }))
  expect((screen.getByLabelText('S slider') as HTMLInputElement).type).toBe('range')
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
  expect(document.querySelector('button[aria-label="t"]')).not.toBeNull()
})

test('SPEC ATOM: a select with no held value passes empty (the trigger faces blank, never a pick)', () => {
  render(h(SpecAtom, {
    f: F({ name: 'size', label: 'Size', type: 'select', options: ['a', 'b'] }),
    value: undefined, onEdit: () => {},
  }))
  // the source passes value '' (absence seeds downstream); the Menu
  // trigger faces blank — a PAINTED first row would be the 1:1 lie
  // the ghost law exists to kill (S7h: the platform-seats-first-row
  // quirk died with the native select)
  expect(screen.getByLabelText('Size').textContent).toBe('')
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
    const trigger = r.container.querySelector('button[aria-label="Sampler"]') as HTMLButtonElement
    expect(trigger.textContent).toBe('euler')
    expect(menuRows('Sampler')).toEqual(['euler', 'Euler', 'Heun'])
    expect(trigger.title).toContain('composes euler')
  })

  it('boolean knobs: on/off vocabulary rides the composed default', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: undefined, onEdit: () => {},
    }))
    const trigger = r.container.querySelector('button[aria-label="Sharpen"]') as HTMLButtonElement
    expect(trigger.textContent).toBe('off')
    expect(trigger.title).toContain('composes off')
  })

  it('no schema field, no base: the honest inherit (never invented facts)', () => {
    const r = render(h(OverlayKnob, { name: 'mystery', value: undefined, onEdit: () => {} }))
    const inp = r.container.querySelector('input') as HTMLInputElement
    expect(inp.placeholder).toBe('inherit')
  })
})

// ── THE MIXED KNOB (the operator's bug sweep, 2026-11-05: "if we
// could change to the swipe and type in mix parameters selection
// knobs that would be ideal") — a knob is ONE control that both
// swipes and types, the two faces sharing one value. ──

test('MIXED KNOB: the slider kind swipes AND types — one value, two faces', () => {
  const onEdit = vi.fn()
  render(h(SpecSliderAtom, { f: F({ name: 'cfg', label: 'Cfg', type: 'slider', min: 0, max: 10, step: 0.5 }), value: 5, onEdit }))
  // the two faces carry distinct names: the range is 'Cfg slider',
  // the typed box is 'Cfg' — both hold 5
  const range = screen.getByLabelText('Cfg slider') as HTMLInputElement
  const typed = screen.getByLabelText('Cfg') as HTMLInputElement
  expect(range.value).toBe('5')
  expect(typed.value).toBe('5')
  // swipe: the drag shows in BOTH faces and voices raw
  fireEvent.input(range, { target: { value: '7' } })
  fireEvent.change(range, { target: { value: '7' } })
  expect(onEdit).toHaveBeenCalledWith('cfg', '7')
  // type: the typed box voices raw AND the track follows
  fireEvent.change(typed, { target: { value: '3.5' } })
  expect(onEdit).toHaveBeenCalledWith('cfg', '3.5')
  expect((screen.getByLabelText('Cfg slider') as HTMLInputElement).value).toBe('3.5')
})

test('MIXED KNOB: a BOUNDED number field renders the knob (swipe + type); unbounded stays typed-only', () => {
  const onEdit = vi.fn()
  // bounded: min+max declared → the knob
  const { rerender } = render(h(SpecAtom, {
    f: F({ name: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.05 }),
    value: 0.75, onEdit,
  }))
  const range = screen.getByLabelText('Threshold slider') as HTMLInputElement
  const typed = screen.getByLabelText('Threshold') as HTMLInputElement
  expect(range.value).toBe('0.75')
  expect(typed.value).toBe('0.75')
  fireEvent.change(range, { target: { value: '0.9' } })
  expect(onEdit).toHaveBeenCalledWith('threshold', '0.9')
  // unbounded: no min+max → the typed face alone (no track to drag)
  rerender(h(SpecAtom, {
    f: F({ name: 'seed', label: 'Seed', type: 'number' }),
    value: 42, onEdit,
  }))
  expect(screen.queryByLabelText('Seed slider')).toBeNull()
  expect((screen.getByLabelText('Seed') as HTMLInputElement).value).toBe('42')
})

// THE BLANK LAW (the clear's contract): a clear writes '' through —
// the draft coerces at patch — but the knob KEEPS ITS SEAT (a route
// flap would unmount the control mid-edit and swallow the next
// keystroke; the box owns its local text, the track holds a bound).
test('MIXED KNOB: a clear writes the blank through and the knob keeps its seat', async () => {
  const onEdit = vi.fn()
  const { rerender } = render(h(SpecAtom, {
    f: F({ name: 'steps', label: 'Steps', type: 'number', min: 1, max: 150, step: 1 }),
    value: 8, onEdit,
  }))
  const typed = screen.getByLabelText('Steps') as HTMLInputElement
  expect((screen.getByLabelText('Steps slider') as HTMLInputElement).value).toBe('8')
  // the clear: '' writes through, the box shows blank, the track parks
  fireEvent.change(typed, { target: { value: '' } })
  expect(onEdit).toHaveBeenCalledWith('steps', '')
  rerender(h(SpecAtom, {
    f: F({ name: 'steps', label: 'Steps', type: 'number', min: 1, max: 150, step: 1 }),
    value: '', onEdit,
  }))
  expect((screen.getByLabelText('Steps') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Steps slider') as HTMLInputElement).value).toBe('1')
  // the type lands: the draft re-syncs, both faces hold the number
  fireEvent.change(screen.getByLabelText('Steps'), { target: { value: '20' } })
  expect(onEdit).toHaveBeenCalledWith('steps', '20')
  rerender(h(SpecAtom, {
    f: F({ name: 'steps', label: 'Steps', type: 'number', min: 1, max: 150, step: 1 }),
    value: 20, onEdit,
  }))
  expect((screen.getByLabelText('Steps') as HTMLInputElement).value).toBe('20')
  expect((screen.getByLabelText('Steps slider') as HTMLInputElement).value).toBe('20')
})
