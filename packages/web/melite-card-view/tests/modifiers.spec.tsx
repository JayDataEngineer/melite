// @vitest-environment happy-dom
/**
 * THE MOD SYSTEM (the SubcardGrid port, 2026-09-12): mods NEVER ride
 * the card form — the section owns the mod bags (features.modifiers
 * drives the kinds; the wire IS the storage: params[param_key]).
 * Cover: tile derivation (incl. a landed recipe row's default
 * strength), the + Mod picker (DSH Menu), the leaf editor (create
 * seeds the row's default strength; edit/remove), the max_stack
 * refusal, and the immediate commit (onEdit + onPatch — the old
 * onSaveParams law, never deferred to Run).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { ModifiersSection } from '../src/client/spec-form.tsx'
import { schemaEnvelope, type ModifierKind, type SpecValues } from '../src/client/spec-form.tsx'

const loraKind = (): ModifierKind => ({
  kind: 'lora',
  label: 'LoRAs',
  param_key: 'loras',
  cardinality: 'list',
  options: [
    { value: 'krea2_realism_lora', label: 'Realism', defaults: { strength: 0.7 } },
    { value: 'krea2_darkbrush', label: 'Dark Brush', defaults: { strength: 0.8 } },
  ],
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mount(
  values: SpecValues,
): { onEdit: ReturnType<typeof vi.fn>; onPatch: ReturnType<typeof vi.fn> } {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  render(createElement(ModifiersSection, {
    kinds: [loraKind()],
    values,
    onEdit,
    onPatch,
  }))
  return { onEdit, onPatch }
}

test('renders nothing when the spec serves no mod kinds (controlnet stays absent by law)', () => {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const { container } = render(createElement(ModifiersSection, {
    kinds: [],
    values: {},
    onEdit,
    onPatch,
  }))
  expect(container.textContent).toBe('')
})

test('tiles derive from the bag — a stated strength shows; a landed recipe row shows the option default', () => {
  mount({
    loras: [
      { id: 'krea2_darkbrush', strength: 0.5 },
      { id: 'krea2_realism_lora' },
    ],
  })
  const tiles = Array.from(document.querySelectorAll('[data-mod-tile]'))
  expect(tiles).toHaveLength(2)
  expect(tiles[0].textContent).toContain('Dark Brush')
  expect(tiles[0].textContent).toContain('0.50')
  // the recipe row carries {id} only — the tile never renders undefined
  expect(tiles[1].textContent).toContain('Realism')
  expect(tiles[1].textContent).toContain('0.70')
})

test('+ Mod opens the picker; picking the kind opens the leaf; Add commits the bag with the row-default strength', async () => {
  const { onEdit, onPatch } = mount({})
  await userEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  // the DSH Menu picker (portal) lists every addable kind
  const pick = await screen.findByRole('menuitem', { name: 'LoRAs' })
  fireEvent.click(pick)
  // the leaf: pick the row, leave strength blank (the row default seeds)
  const select = await screen.findByDisplayValue('— pick —')
  await userEvent.selectOptions(select, 'krea2_realism_lora')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenCalledWith({
      loras: [{ id: 'krea2_realism_lora', strength: 0.7 }],
    })
  })
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'krea2_realism_lora', strength: 0.7 }])
})

test('a tile click opens the leaf editor — Save patches the strength; Remove drops the entry', async () => {
  const { onEdit, onPatch } = mount({ loras: [{ id: 'krea2_darkbrush', strength: 0.8 }] })
  fireEvent.click(document.querySelector('[data-mod-tile]') as HTMLElement)
  const input = await screen.findByPlaceholderText('the row default')
  expect((input as HTMLInputElement).value).toBe('0.8')
  await userEvent.clear(input)
  await userEvent.type(input, '0.35')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenCalledWith({ loras: [{ id: 'krea2_darkbrush', strength: 0.35 }] })
  })
  // remove: reopen, delete
  fireEvent.click(document.querySelector('[data-mod-tile]') as HTMLElement)
  await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenLastCalledWith({ loras: [] })
  })
  expect(onEdit).toHaveBeenCalled()
})

test('a create with no picked row is refused LOUD — never a silent entry', async () => {
  const { onPatch } = mount({})
  await userEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'LoRAs' }))
  // no option picked — Add must refuse (a number input cannot yield
  // 'abc' in a real browser; the reachable loud refusal is the
  // empty pick)
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByText(/Pick one from the served rows/)).toBeTruthy()
  expect(onPatch).not.toHaveBeenCalled()
})

test('max_stack refuses a second tile LOUD (the mask cap law)', async () => {
  const onPatch = vi.fn()
  render(createElement(ModifiersSection, {
    kinds: [{ kind: 'mask', label: 'Region Mask', param_key: 'mask', cardinality: 'list', max_stack: 1 }],
    values: { mask: [{ id: 'm1' }] },
    onEdit: vi.fn(),
    onPatch,
  }))
  await userEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Region Mask' }))
  expect(await screen.findByText(/stack limit reached \(1\)/)).toBeTruthy()
  expect(onPatch).not.toHaveBeenCalled()
})

// ── THE CORE LAWS (operator, 2026-09-12: "MOD SYSTEM IS CORE. NEVER
//    HARDCODED. Region masking is a mod. The LORAs should not be on
//    cards, the MOD SYSTEM SHOULD") ──────────────────────────────────

/** The qwen wire shape (the parameter audit): BOTH kind shapes —
 *  lora (option kind: served rows + strength) and mask (FIELD kind:
 *  its param rows derive from mod_schemas, entry IS the params
 *  object). input_mask ALSO sits on the card schema — a legacy-
 *  shaped emission — to pin the hide filter; the law: mod-owned
 *  names NEVER render flat. */
const QWEN_MOD_SPEC = {
  form: 'image-edit',
  model: 'qwen-img-edit-2511',
  schema: schemaEnvelope({
    image1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image', required: true, group: 'input' } } },
    input_mask: { type: 'string', meta: { description: 'Region Mask', extra: { wtype: 'image', group: 'mask' } } },
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'prompt' } } },
  }),
  mod_schemas: {
    mask: schemaEnvelope({
      input_mask: { type: 'string', meta: { description: 'Region Mask', extra: { wtype: 'image' } } },
      mask_mode: { consts: ['auto', 'crop_stitch', 'full_frame'], meta: { description: 'Region Mode', default: 'auto' } },
      mask_feather: { type: 'number', meta: { description: 'Feather', default: 8, step: 1, extra: { wtype: 'number' } } },
    }),
  },
  variants: [],
  features: {
    modifiers: [
      { kind: 'lora', label: 'LoRAs', param_key: 'loras', cardinality: 'list', options: [
        { value: 'krea2_realism_lora', label: 'Realism', defaults: { strength: 0.7 } },
      ] },
      { kind: 'mask', label: 'Region Mask', param_key: 'mask', cardinality: 'list' },
    ],
  },
} as never as import('../src/client/spec-form.tsx').FormSpecDoc

test('THE LAW: mod-owned fields NEVER render flat on the card form — the section owns them', async () => {
  const { SpecForm, modOwnedFields } = await import('../src/client/spec-form.tsx')
  // the pure projection: the mask kind owns its three names + both bags
  const owned = modOwnedFields(QWEN_MOD_SPEC)
  expect([...owned].sort()).toEqual(['input_mask', 'loras', 'mask', 'mask_feather', 'mask_mode'])
  // the rendered form: NO Region Mode / Region Mask / Feather flat
  const values: SpecValues = {}
  render(createElement(SpecForm, {
    spec: QWEN_MOD_SPEC,
    user: values,
    onSet: () => {},
  }))
  expect(screen.queryByLabelText('Region Mode')).toBeNull()
  expect(screen.queryByLabelText('Feather')).toBeNull()
  expect(screen.queryByLabelText('Region Mask')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Region Mask source' })).toBeNull()
  // but the card's OWN fields render + the section rides under them
  // (the prompt group seats behind its submenu tab — stroke 89)
  fireEvent.click(screen.getByRole('tab', { name: 'Prompt' }))
  expect(screen.getByLabelText('Prompt')).toBeTruthy()
  expect(screen.getByText('Modifiers')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add modifier' })).toBeTruthy()
})

test('FIELD kinds: + Mod → Region Mask → the leaf renders the kind\'s OWN fields (image square included)', async () => {
  const { SpecForm } = await import('../src/client/spec-form.tsx')
  const values: SpecValues = {}
  const onEdit = (name: string, v: unknown): void => { values[name] = v }
  render(createElement(SpecForm, {
    spec: QWEN_MOD_SPEC,
    user: values,
    onSet: onEdit,
  }))
  // open the kind picker, pick the mask kind
  fireEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  const maskRow = await screen.findByText('Region Mask', undefined, { timeout: 2000 })
  fireEvent.click(maskRow)
  // THE LEAF: the kind's fields render INSIDE the modal — the image
  // field constructs the square (the construction law holds inside
  // mod leaves), the select renders, never a bare text box
  const square = await screen.findByRole('button', { name: 'Region Mask source' }, { timeout: 2000 })
  expect(square).toBeTruthy()
  expect(screen.getByLabelText('Region Mode')).toBeTruthy()
  // save: the entry is the params object (no id, no strength)
  fireEvent.click(screen.getByText('Add'))
  await waitFor(() => {
    const bag = values['mask'] as Array<Record<string, unknown>>
    expect(Array.isArray(bag)).toBe(true)
    expect(bag[0]?.['mask_mode']).toBe('auto')
    expect(bag[0]?.['mask_feather']).toBe(8)
    expect(bag[0]?.['id']).toBeUndefined()
  })
})

test('OPTION kinds still ride the served rows: lora create seeds the row default strength (core port)', async () => {
  const { SpecForm } = await import('../src/client/spec-form.tsx')
  const values: SpecValues = {}
  const onEdit = (name: string, v: unknown): void => { values[name] = v }
  render(createElement(SpecForm, {
    spec: QWEN_MOD_SPEC,
    user: values,
    onSet: onEdit,
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  fireEvent.click(await screen.findByText('LoRAs', undefined, { timeout: 2000 }))
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'krea2_realism_lora' } })
  fireEvent.click(screen.getByText('Add'))
  await waitFor(() => {
    const bag = values['loras'] as Array<Record<string, unknown>>
    expect(bag).toEqual([{ id: 'krea2_realism_lora', strength: 0.7 }])
  })
})

// ── STROKE 34: THE RECIPE'S MOD PAYLOAD IS THE USER BAG ────────────
//    (the read-only recipe-owned rows died with the card-recipe
//    layer — a family macro pill stamps its loras INTO the bag:
//    visible, editable, removable, exactly like a hand-picked row)

test('a family-macro lora rides the bag as an ORDINARY editable row — no recipe mark, no second stack', () => {
  // the realism pill stamped this row; the user added dark brush after
  mount({ loras: [{ id: 'krea2_realism_lora' }, { id: 'krea2_darkbrush', strength: 0.5 }] })
  const tiles = Array.from(document.querySelectorAll('[data-mod-tile]'))
  expect(tiles).toHaveLength(2)
  // ONE stack, no read-only guests: every row carries the same face
  for (const t of tiles) expect(t.getAttribute('data-mod-recipe')).toBe(null)
  expect(tiles[0].textContent).toContain('Realism')
  expect(tiles[1].textContent).toContain('Dark Brush')
})

test('removing a macro-stamped row commits the plain bag — no guard needed, one stack only', () => {
  const { onEdit } = mount({ loras: [{ id: 'krea2_realism_lora' }, { id: 'krea2_darkbrush', strength: 0.5 }] })
  fireEvent.click(document.querySelector('[data-mod-tile="loras-0"]') as HTMLElement)
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'krea2_darkbrush', strength: 0.5 }])
})

// ── STROKE 95: THE EMBEDDED PAINT CANVAS (docs/design/paint-leaf-canvas.md)
//    The `mask_paint` kind declares leaf_face; the host (CardsTab)
//    delivers the brush canvas — EMBEDDED at the top of the leaf
//    popup (the visual preview, never a Paint button + nested
//    modal). Declared + hosted — never sniffed, never crashing
//    host-less. ──────────────────────────────────────────────────

/** The mask-shaped spec: an input_image card field + the
 *  declared paint kind (leaf_face on the row, payload wtype image —
 *  the served verbatim shape the lane proves). */
const PAINT_SPEC = {
  form: 'mask',
  model: 'mask',
  schema: schemaEnvelope({
    input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', required: true, group: 'input' } } },
  }),
  variants: [],
  features: {
    modifiers: [
      { kind: 'mask_detect', label: 'Detect', param_key: 'mask_detect', cardinality: 'list', max_stack: 8,
        kindFields: [
          { name: 'detection_threshold', label: 'Detection threshold', type: 'number', default: 0.35 },
        ],
        fields: [
          { name: 'primary_class', label: 'Primary class', type: 'string', default: 'person' },
        ] },
      { kind: 'mask_paint', label: 'Paint', param_key: 'mask_paint', cardinality: 'list', max_stack: 4,
        leaf_face: 'paint-canvas',
        fields: [
          { name: 'name', label: 'Export name', type: 'string', default: 'paint' },
          { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '' },
        ] },
    ],
  },
} as never as import('../src/client/spec-form.tsx').FormSpecDoc

/** The hosted face (the CardsTab role in miniature): the embedded
 *  canvas — seeds from the payload value, commits stroke PNGs. */
function FakeFace(p: { referenceUrl: string; value: string; onChange: (u: string) => void }) {
  return createElement('div', { 'data-testid': 'fake-paint-face', 'data-ref': p.referenceUrl, 'data-payload': p.value },
    createElement('button', { type: 'button', onClick: () => { p.onChange('data:image/png;base64,STROKE') } }, 'Fake stroke'),
  )
}

async function openPaintLeaf(values: SpecValues, extra?: Record<string, unknown>) {
  const { SpecForm } = await import('../src/client/spec-form.tsx')
  render(createElement(SpecForm, {
    spec: PAINT_SPEC,
    user: values,
    onSet: (name: string, v: unknown) => { values[name] = v },
    ...(extra ?? {}),
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  fireEvent.click(await screen.findByText('Paint', undefined, { timeout: 2000 }))
}

test('declared face + hosted face: the leaf embeds the canvas at the top; a stroke commits the PNG into the entry', async () => {
  const values: SpecValues = { input_image: 'http://x/in.png' }
  await openPaintLeaf(values, { paintFace: FakeFace, paintReference: 'input_image' })
  // the canvas rides EMBEDDED — no Paint button, no nested modal
  const face = await screen.findByTestId('fake-paint-face', undefined, { timeout: 2000 })
  expect(screen.queryByRole('button', { name: 'Paint' })).toBeNull()
  // the reference is the card's input_image value (resolved, not the field name)
  expect(face.getAttribute('data-ref')).toBe('http://x/in.png')
  fireEvent.click(screen.getByRole('button', { name: 'Fake stroke' }))
  // Add commits the entry — the payload IS the canvas's data URL
  fireEvent.click(screen.getByText('Add'))
  await waitFor(() => {
    const bag = values['mask_paint'] as Array<Record<string, unknown>>
    expect(Array.isArray(bag)).toBe(true)
    expect(bag[0]?.['payload']).toBe('data:image/png;base64,STROKE')
  })
})

test('CONTRACT A: declared kindFields ride verbatim — the section owns the served scalar row', async () => {
  const values: SpecValues = { input_image: 'http://x/in.png' }
  await openPaintLeaf(values, { paintFace: FakeFace, paintReference: 'input_image' })
  // the detect kind's served kindFields render as the section's own
  // row (never re-derived from a mod_schemas envelope it has none of)
  expect(screen.getByLabelText('Detection threshold')).toBeTruthy()
})

test('declared face + NO hosted face: no canvas — the square holds (graceful by design)', async () => {
  const values: SpecValues = { input_image: 'http://x/in.png' }
  await openPaintLeaf(values, { paintReference: 'input_image' })
  // the leaf opened with the three-source square and nothing else
  await screen.findByRole('button', { name: 'Paint payload source' }, { timeout: 2000 })
  expect(screen.queryByTestId('fake-paint-face')).toBeNull()
})

test('undeclared kind + hosted face: no verb — the face is declared, never sniffed', async () => {
  const { SpecForm } = await import('../src/client/spec-form.tsx')
  const plain = {
    ...PAINT_SPEC,
    features: { modifiers: [{ kind: 'mask_paint', label: 'Paint', param_key: 'mask_paint', cardinality: 'list',
      fields: [
        { name: 'name', label: 'Export name', type: 'string', default: 'paint' },
        { name: 'payload', label: 'Paint payload', type: 'path', wtype: 'image', default: '' },
      ] }] },
  } as never as import('../src/client/spec-form.tsx').FormSpecDoc
  const values: SpecValues = { input_image: 'http://x/in.png' }
  render(createElement(SpecForm, {
    spec: plain,
    user: values,
    onSet: (name: string, v: unknown) => { values[name] = v },
    paintFace: FakeFace,
    paintReference: 'input_image',
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Add modifier' }))
  fireEvent.click(await screen.findByText('Paint', undefined, { timeout: 2000 }))
  await screen.findByRole('button', { name: 'Paint payload source' }, { timeout: 2000 })
  expect(screen.queryByTestId('fake-paint-face')).toBeNull()
})
