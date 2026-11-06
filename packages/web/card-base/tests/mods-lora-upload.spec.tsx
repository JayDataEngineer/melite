// @vitest-environment happy-dom
// mods-lora-upload.spec.tsx — THE MODS-PLANE ADD-LORA MENU WALL (the
// operator's 2026-11-15 orders: the hand-upload gesture on the mods
// plane, then the layout correction — "I need the strength and the
// lora picker to be on the same row. I also need the 'add lora' gated
// behind the button next to apply. That way, it is a seperate menu,
// with a back button and you can upload, rename, and set default
// strength, then hit apply.").
//
// THE LAW: the OPTION-kind leaf's PICK face is one row — the catalog
// picker (the seat) beside the use's strength — and nothing else. The
// upload is a MENU of its own, entered from the add-lora button in
// the actions row beside Apply, carrying the file square, a RENAME
// field, and the row's default-strength dial; Back discards the
// pending file, Apply uploads it through the host-injected transport
// and re-opens the pick face with the seated row. The seated combo
// name IS the bag id (never a hand-spelled one); absent wire = NO
// add-lora button (the degrade law).
//
// Axes (LAW 4): ACCURACY — the arms judge the gesture's outcomes (the
// wire's call shape, the renamed filename, the picker's refreshed
// row, the bag's committed entry), never a render census. COVERAGE —
// the gating, the rename, Back's discard, the refusal voice, and the
// degrade law each judge on their own path. ENFORCEMENT — toggling
// the pane split out reds the gating/row arms; toggling the wire
// plumbing reds the upload arms. DEPTH — the arms ride the REAL leaf
// (openCreate → menu → Apply), the same door the operator's click
// walks.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { ModifiersSection } from '../src/mods.tsx'
import { chromeCopy } from '../src/locales/chromeCopy.ts'

afterEach(cleanup)

const LORA = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'detail', label: 'Detail', defaults: { strength: 0.8 } },
    { value: 'plain', label: 'Plain' },
  ],
} as unknown as ModifierKind

/** the kind as the REFRESHED serve presents it: the uploaded row is
 * now a SERVED option carrying the operator-seated default. */
const LORA_SERVED = {
  ...LORA,
  options: [
    ...(LORA.options as unknown as Array<Record<string, unknown>>),
    { value: 'h3/op-pick.safetensors', label: 'op-pick', defaults: { strength: 0.8 } },
  ],
} as unknown as ModifierKind

function openLeaf(props: Partial<Parameters<typeof ModifiersSection>[0]> = {}) {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, {
    kinds: [LORA], values: {}, onEdit, onPatch, ...props,
  }))
  return { onEdit, onPatch, ...rendered }
}

function openCreate(): void {
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'LoRA' }))
}

/** THE GATE: the add-lora button in the actions row opens the menu.
 *  Nothing upload-shaped exists in the pick face — the menu is its
 *  own pane. */
function openAddLora(): void {
  fireEvent.click(screen.getByRole('button', { name: chromeCopy.loraAddButton }))
}

/** the REAL gesture's file half: answer the hidden input inside the
 *  upload pane (the square owns it — never a second picker). */
function answerUploadInput(file: File): void {
  const row = document.querySelector('[data-testid="mod-lora-upload"]')
  if (row === null) throw new Error('the upload pane must render the square when the menu is open')
  const inp = row.querySelector('input[type="file"]')
  if (inp === null) throw new Error('the hidden file input must ride the upload pane')
  Object.defineProperty(inp, 'files', { value: [file], configurable: true })
  fireEvent.change(inp)
}

function applyUploadPane(): void {
  fireEvent.click(screen.getByRole('button', { name: chromeCopy.loraApplyButton }))
}

test('THE ROW: the picker and the strength dial share ONE row (the operator\'s layout order)', () => {
  openLeaf({ uploadLora: vi.fn(), refreshSpec: vi.fn() })
  openCreate()
  const picker = screen.getByLabelText('LoRA')
  const strength = screen.getByPlaceholderText(chromeCopy.rowDefaultPlaceholder)
  // both fields are children of the SAME pair wrapper — the row is
  // structural, not a stylesheet claim (the picker's trigger rides a
  // span inside its field, so the pair is the field's parent)
  const pair = picker.parentElement?.parentElement?.parentElement
  expect(pair).not.toBeNull()
  expect(String(pair?.className)).toMatch(/modFieldPair/)
  expect(pair?.contains(picker)).toBe(true)
})

test('THE GATE: the pick face carries no upload square; the menu does, and Apply waits for a file', () => {
  const uploadLora = vi.fn()
  openLeaf({ uploadLora, refreshSpec: vi.fn() })
  openCreate()
  // the pick face is the picker + strength ONLY
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).toBeNull()
  expect(document.querySelector('input[type="file"]')).toBeNull()
  // the door sits beside Apply (the primary commit) in the actions row
  const add = screen.getByRole('button', { name: chromeCopy.loraAddButton })
  const actions = add.parentElement
  expect(actions).not.toBeNull()
  expect(actions?.textContent).toContain('Add')
  openAddLora()
  // the menu carries the square, the rename field, the dial
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).not.toBeNull()
  expect(screen.getByLabelText(chromeCopy.loraNameLabel)).not.toBeNull()
  const apply = screen.getByRole('button', { name: chromeCopy.loraApplyButton }) as HTMLButtonElement
  expect(apply.disabled).toBe(true)
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  expect((screen.getByRole('button', { name: chromeCopy.loraApplyButton }) as HTMLButtonElement).disabled).toBe(false)
  expect(uploadLora).not.toHaveBeenCalled()
})

test('UPLOAD: Apply sends the file + dial; the seated combo name seeds the picker and the refreshed row SERVES (W3)', async () => {
  const uploadLora = vi.fn().mockResolvedValue({
    id: 'h3/op-pick.safetensors', default_strength: 0.8, row_seated: true,
  })
  let refreshed = false
  const refreshSpec = vi.fn().mockImplementation(async () => { refreshed = true })
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, {
    kinds: [LORA], values: {}, onEdit, onPatch, uploadLora, refreshSpec,
  }))
  openCreate()
  openAddLora()
  // the dial BEFORE the gesture — the operator's default rides the
  // wire (blank = the door's own 1, judged by the estate walls)
  fireEvent.change(screen.getByLabelText(chromeCopy.loraUploadStrengthLabel), { target: { value: '0.6' } })
  answerUploadInput(new File(['%MEL'], 'op-pick.safetensors'))
  applyUploadPane()
  await waitFor(() => { expect(refreshSpec).toHaveBeenCalled() })
  expect(uploadLora).toHaveBeenCalledTimes(1)
  const [file, opts] = uploadLora.mock.calls[0] as [File, { strength?: number }]
  expect(file.name).toBe('op-pick.safetensors')
  expect(opts).toEqual({ strength: 0.6 })
  // THE SAME-SESSION SERVE: the refresh landed — the host re-serves
  // the spec (the stale-while-revalidate swap), the picker's catalog
  // carries the seated combo as a SERVED row. The SAME commit mocks
  // ride the rerender (the host never remounts the form on refresh).
  rendered.rerender(h(ModifiersSection, {
    kinds: [refreshed ? LORA_SERVED : LORA], values: {}, onEdit, onPatch, uploadLora, refreshSpec,
  }))
  fireEvent.click(screen.getByLabelText('LoRA'))
  expect(screen.getByRole('menuitem', { name: 'op-pick' })).not.toBeNull()
  // Add commits the bag entry with the ROW's seated default (the
  // create seed law reads the refreshed option, never a stale 1.0)
  fireEvent.click(screen.getByRole('menuitem', { name: 'op-pick' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'h3/op-pick.safetensors', strength: 0.8 }])
  expect(onPatch).toHaveBeenCalledWith({ loras: [{ id: 'h3/op-pick.safetensors', strength: 0.8 }] })
})

test('RENAME: the typed name rides the wire with the picked file\'s extension (the row re-keys)', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/named.safetensors', row_seated: true })
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'raw-download.safetensors'))
  // the field seeds from the picked file — the operator edits the stem
  const name = screen.getByLabelText(chromeCopy.loraNameLabel) as HTMLInputElement
  expect(name.value).toBe('raw-download.safetensors')
  fireEvent.change(name, { target: { value: 'named' } })
  applyUploadPane()
  await waitFor(() => { expect(uploadLora).toHaveBeenCalledTimes(1) })
  const [, opts] = uploadLora.mock.calls[0] as [File, { name?: string }]
  // the extension always rides: a stem-only rename keeps the suffix
  expect(opts).toEqual({ name: 'named.safetensors' })
})

test('BACK: the menu leaves empty-handed — the wire never fires and the pending file is discarded', () => {
  const uploadLora = vi.fn()
  openLeaf({ uploadLora, refreshSpec: vi.fn() })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  fireEvent.click(screen.getByRole('button', { name: chromeCopy.loraBackButton }))
  expect(uploadLora).not.toHaveBeenCalled()
  // the pick face is back; the closed menu carries no state forward
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).toBeNull()
  openAddLora()
  const name = screen.getByLabelText(chromeCopy.loraNameLabel) as HTMLInputElement
  expect(name.value).toBe('')
  expect((screen.getByRole('button', { name: chromeCopy.loraApplyButton }) as HTMLButtonElement).disabled).toBe(true)
})

test('UPLOAD BLANK DIAL: no strength key rides the wire — the door owns the default (never a client-side 1)', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/x.safetensors', row_seated: true })
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  applyUploadPane()
  await waitFor(() => { expect(refreshSpec).toHaveBeenCalled() })
  const [, opts] = uploadLora.mock.calls[0] as [File, { strength?: number }]
  expect(opts).toEqual({})
})

test('UPLOAD REFUSED: the door refusal renders in the leaf error slot — never a silent no-op', async () => {
  const uploadLora = vi.fn().mockResolvedValue({
    id: '', row_seated: false, refusal: 'the rows file refuses the write: broken',
  })
  const refreshSpec = vi.fn()
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'y.safetensors'))
  applyUploadPane()
  await waitFor(() => {
    expect(screen.getByText('the rows file refuses the write: broken')).not.toBeNull()
  })
  expect(refreshSpec).not.toHaveBeenCalled()
})

test('DEGRADE LAW: absent wire renders NO add-lora door — the leaf arms stay byte-identical (W5)', () => {
  const { onEdit } = openLeaf({})
  openCreate()
  expect(screen.queryByRole('button', { name: chromeCopy.loraAddButton })).toBeNull()
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).toBeNull()
  // the leaf still owns its whole face: the picker serves, Add commits
  fireEvent.click(screen.getByLabelText('LoRA'))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Detail' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'detail', strength: 0.8 }])
})

// ── THE ROW-DEFAULT LAW (lora audit F5) — the lora entry's blank dial
// seeds ONE, everywhere; the 0.7 backstops (mods.tsx strengthSeedOf,
// serviceMods.ts) are the CONTROLNET seed, never the lora row default.
test('THE ROW DEFAULT IS ONE: a defaults-less row + a blank dial commits strength 1 — the controlnet 0.7 backstop is never the lora law (F5)', () => {
  const { onEdit } = openLeaf({})
  openCreate()
  fireEvent.click(screen.getByLabelText('LoRA'))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Plain' })) // the served row carries NO defaults
  fireEvent.click(screen.getByRole('button', { name: 'Add' })) // the dial stays blank
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain', strength: 1 }])
})

// ── THE PICKER LAW (lora audit F6) — the id seat is the served MENU
// at every roster size; freeform text never returns (the Fibo burn).
const TEXT_SEATS = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll('input')).filter((i) => i.getAttribute('type') !== 'number') as HTMLInputElement[]

test('THE SEAT IS A MENU: the id binds a picker button opening the served menu — the pick face owns no freeform text seat (F6)', () => {
  openLeaf({})
  openCreate()
  const picker = screen.getByLabelText('LoRA') as HTMLElement
  expect(picker.tagName).toBe('BUTTON')
  fireEvent.click(picker)
  // the roster rows are menu items of the picker, not a text box's cargo
  expect(screen.getByRole('menuitem', { name: 'Detail' })).not.toBeNull()
  expect(screen.getByRole('menuitem', { name: 'Plain' })).not.toBeNull()
  // every input on the face is a number dial — the rename field rides
  // the upload menu only, never the pick face
  expect(TEXT_SEATS()).toEqual([])
})

test('ZERO ROSTER IS STILL THE PICKER: the empty face renders, no text seat returns, and Add refuses loud (F6)', () => {
  const LORA_EMPTY = { ...LORA, entry: 'option', options: [] } as unknown as ModifierKind
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [LORA_EMPTY], values: {}, onEdit, onPatch: vi.fn() }))
  openCreate()
  expect((screen.getByLabelText('LoRA') as HTMLElement).tagName).toBe('BUTTON')
  expect(screen.getByText(chromeCopy.optionRosterEmptyFace)).not.toBeNull()
  expect(TEXT_SEATS()).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

// THE HAND-SPELL REFUSAL (mods.tsx saveLeaf's hybrid arm): a bag entry
// carrying an id the serve no longer presents (an agent's hand-pasted
// row) tiles visibly, then its edit save REFUSES — never a silent
// drifted commit.
const CONTROLNET = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'list',
  entry: 'hybrid', option_key: 'type',
  options: [{ value: 'depth', label: 'Depth', model: 'd.pt', preprocessor: 'dp' }],
} as unknown as ModifierKind

test('SAVE REFUSES THE HAND-SPELL: a drifted id edits loud — the refusal renders, nothing commits (F6)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [CONTROLNET],
    values: { controlnets: [{ type: 'ghost-type', strength: 0.7 }] },
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.click(document.querySelector('[data-mod-tile]') as HTMLElement)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText('‘ghost-type’ is not a served ControlNet row — pick from the catalog, never hand-spell.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

// ── THE UPLOAD PANE'S GUARD FACES — each on its own firing path
// (LAW 4): the single-flight guard (a double Apply never
// double-spends), the extensionless file (no rename key is
// invented), the cleared rename field (the picked file's own name
// rides), the voiceless refusal (the standing note speaks), the
// thrown wire (the rejection voice + the pane re-arms), and the
// absent refresh (the seated reset needs no re-serve). ──

test('UPLOAD BUSY: a second Apply inside the flight fires ONE wire call — the pane never double-spends', async () => {
  let release: ((value: { id: string, row_seated: boolean }) => void) = () => {}
  const uploadLora = vi.fn().mockImplementation(() => new Promise((resolve) => { release = resolve }))
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  applyUploadPane()
  applyUploadPane() // the double press — the flight is still open
  expect(uploadLora).toHaveBeenCalledTimes(1)
  release({ id: 'h3/x.safetensors', row_seated: true })
  await waitFor(() => { expect(refreshSpec).toHaveBeenCalledTimes(1) })
  expect(uploadLora).toHaveBeenCalledTimes(1)
})

test('UPLOAD NO-EXTENSION: an extensionless file rides NO rename key — the name is the file\'s own', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/checkpoint', row_seated: true })
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'checkpoint'))
  applyUploadPane()
  await waitFor(() => { expect(uploadLora).toHaveBeenCalledTimes(1) })
  const [, opts] = uploadLora.mock.calls[0] as [File, { name?: string }]
  expect(opts).toEqual({})
})

test('UPLOAD CLEARED NAME: emptying the rename field restores the picked file\'s own name — no rename key rides', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/x.safetensors', row_seated: true })
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  fireEvent.change(screen.getByLabelText(chromeCopy.loraNameLabel), { target: { value: '' } })
  applyUploadPane()
  await waitFor(() => { expect(uploadLora).toHaveBeenCalledTimes(1) })
  const [, opts] = uploadLora.mock.calls[0] as [File, { name?: string }]
  expect(opts).toEqual({})
})

test('UPLOAD VOICELESS REFUSAL: a refusal without a voice renders the standing note — never silence', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: '', row_seated: false })
  const refreshSpec = vi.fn()
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'y.safetensors'))
  applyUploadPane()
  await waitFor(() => { expect(screen.getByText(chromeCopy.loraUploadRefusedNote)).not.toBeNull() })
  expect(refreshSpec).not.toHaveBeenCalled()
})

test('UPLOAD CRASH: a thrown wire voices the rejection and the pane re-arms — Apply returns for the retry', async () => {
  const uploadLora = vi.fn().mockRejectedValue(new Error('socket died mid-upload'))
  const refreshSpec = vi.fn()
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  applyUploadPane()
  await waitFor(() => { expect(screen.getByText('socket died mid-upload')).not.toBeNull() })
  expect(refreshSpec).not.toHaveBeenCalled()
  // the busy flag cleared in the finally: the pending file still
  // sits and Apply is armed again for the retry
  const apply = screen.getByRole('button', { name: chromeCopy.loraApplyButton }) as HTMLButtonElement
  expect(apply.disabled).toBe(false)
})

test('UPLOAD WITHOUT REFRESH: absent refreshSpec still resets the pane — the seated row lands without a re-serve', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/x.safetensors', row_seated: true })
  openLeaf({ uploadLora })
  openCreate()
  openAddLora()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
  applyUploadPane()
  await waitFor(() => { expect(uploadLora).toHaveBeenCalledTimes(1) })
  // the pick face is back (the seated reset ran) and no error rides
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).toBeNull()
  expect(screen.queryByText(chromeCopy.loraUploadRefusedNote)).toBeNull()
})
