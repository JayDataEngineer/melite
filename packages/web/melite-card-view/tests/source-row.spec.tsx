// source-row.spec.tsx — THE SLOT ROW LAW + THE UNCLAIMED-SLOT LAW
// (hour 24 strokes 4-6; the operator's lane reports drove each cut).
// Pins:
//  1. the slot-shaped fields of one group render side-by-side in ONE
//     row container (labels under squares, no stacked key rows);
//  2. THE INPUT RAIL renders from the declared signature
//     (= the old yaml's input_slots) in signature order;
//  3. image_list is DECLARATION-ONLY: the old tree declared it but no
//     surface ever claimed it (no input_slots entry, no slot
//     component, the params flow excluded non-params zone fields) —
//     the default form renders NOTHING for it, 1:1.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { schemaEnvelope, SpecForm, type FormSpecDoc, type SpecValues } from '../src/client/spec-form.tsx'

afterEach(cleanup)

// THE ENVELOPE FIXTURES (the parameter audit): the served schema,
// walked by fieldsOf — the flat field row is gone.
const imgSpec: FormSpecDoc = {
  form: 'source-row-fixture',
  schema: schemaEnvelope({
    image2: { type: 'string', meta: { description: 'Image 2', extra: { wtype: 'image' } } },
    image3: { type: 'string', meta: { description: 'Image 3', extra: { wtype: 'image' } } },
  }),
}

function Host({ spec, user, onSet }: {
  spec: FormSpecDoc
  user: SpecValues
  onSet: ReturnType<typeof vi.fn>
}): ReturnType<typeof createElement> {
  return createElement(SpecForm, {
    spec,
    user,
    onSet,
    square: undefined,
  })
}

test('THE SLOT ROW: one group\'s image squares sit side-by-side in ONE row container', () => {
  const { container } = render(createElement(Host, {
    spec: imgSpec,
    user: {},
    onSet: vi.fn(),
  }))
  const rows = container.querySelectorAll('[class*="specSlotRow"]')
  expect(rows.length).toBe(1) // both squares share ONE row
  const row = rows[0] as HTMLElement
  expect(row.querySelectorAll('[role="button"][aria-label*="source"]').length).toBe(2)
  // their labels ride under the squares (aria), not as stacked key rows
  expect(row.querySelector('[class*="specFieldKey"]')).toBeNull()
})

// ── THE INPUT RAIL (the operator's second lane report: "an input rail
//    with images 2 and 3, then ANOTHER rail for reference images and
//    image 1 stacked vertically") — the signature builds ONE rail ──
const railSpec: FormSpecDoc = {
  form: 'rail-fixture',
  // = the old yaml's input_slots, VERBATIM — reference_images is not a slot
  inputs: [
    { name: 'image1', kind: 'image', required: true },
    { name: 'image2', kind: 'image' },
    { name: 'image3', kind: 'image' },
  ],
  schema: schemaEnvelope({
    image2: { type: 'string', meta: { description: 'Image 2', extra: { wtype: 'image' } } },
    image3: { type: 'string', meta: { description: 'Image 3', extra: { wtype: 'image' } } },
    reference_images: { type: 'array', meta: { description: 'Reference Images', extra: { wtype: 'image_list' } } },
    image1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image' } } },
  }),
}

test('THE INPUT RAIL: the declared signature renders ONE rail in signature order — image1 first, no second input group', () => {
  const { container } = render(createElement(SpecForm, {
    user: { reference_images: ['a.png'] },
    onSet: vi.fn(),
    spec: railSpec,
  }))
  const rail = container.querySelector('[data-input-rail]') as HTMLElement
  expect(rail).toBeTruthy()
  const squares = Array.from(rail.querySelectorAll('[role="button"][aria-label*="source"]'))
  expect(squares.length).toBe(3) // input_slots: image1/2/3 — nothing else
  // SIGNATURE order: the anchor (Image 1) rides FIRST
  const labels = squares.map((s) => (s as HTMLElement).getAttribute('aria-label'))
  expect(labels.indexOf('Image 1 source')).toBe(0)
  // DECLARATION-ONLY: reference_images renders NOWHERE — not the rail,
  // not the groups, not even its label text (the old unclaimed-slot law)
  expect(container.textContent).not.toContain('Reference Images')
  expect(container.querySelector('[data-image-list]')).toBeNull()
})

test('without a signature the group grammar still holds (backward face)', () => {
  const { container } = render(createElement(Host, {
    spec: { ...railSpec, inputs: undefined },
    user: {},
    onSet: vi.fn(),
  }))
  expect(container.querySelector('[data-input-rail]')).toBeNull()
  expect(container.querySelectorAll('[class*="specSlotRow"]').length).toBeGreaterThan(0)
  // and the unclaimed list stays invisible there too — 1:1, no seam leak
  expect(container.textContent).not.toContain('Reference Images')
})

// ── STROKE 32: THE MOD-OWNED SLOT LAW (the operator's missing-seat
//    report: image-edit's REQUIRED image1 never rendered — the rail
//    looked up signature names in schema fields only, and the
//    lanpaint brick's anchor is mod-owned) ──
// THE LANE SHAPE: image1 rides the lanpaint mod (not the schema);
// image2/3 are schema fields; the signature names all three.
const modSlotSpec: FormSpecDoc = {
  form: 'mod-slot-fixture',
  inputs: [
    { name: 'image1', kind: 'image', required: true },
    { name: 'image2', kind: 'image' },
    { name: 'image3', kind: 'image' },
  ],
  schema: schemaEnvelope({
    image2: { type: 'string', meta: { description: 'Image 2', extra: { wtype: 'image' } } },
    image3: { type: 'string', meta: { description: 'Image 3', extra: { wtype: 'image' } } },
  }),
  features: {
    modifiers: [{ kind: 'brick', label: 'Lanpaint', param_key: 'lanpaint', cardinality: 'one' }],
  },
  mod_schemas: {
    lanpaint: schemaEnvelope({
      image1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image', group: 'input', zone: 'inputs', order: -1, width: 1, required: true } } },
      lanpaint_enabled: { type: 'boolean', meta: { description: 'Force LanPaint', extra: { wtype: 'boolean', group: 'lanpaint', order: 1 } } },
    }),
  },
}

test('STROKE 32: a mod-owned signature slot seats in the rail — the required anchor renders, first', () => {
  const { container } = render(createElement(SpecForm, {
    user: {},
    onSet: vi.fn(),
    spec: modSlotSpec,
  }))
  const rail = container.querySelector('[data-input-rail]') as HTMLElement
  expect(rail).toBeTruthy()
  const squares = Array.from(rail.querySelectorAll('[role="button"][aria-label*="source"]'))
  expect(squares.length).toBe(3) // image1 joins image2/3 — nothing silently dropped
  const labels = squares.map((s) => (s as HTMLElement).getAttribute('aria-label'))
  expect(labels.indexOf('Image 1 source')).toBe(0) // the anchor rides FIRST
})

test('STROKE 32: the brick keeps its knobs — the leaf never double-faces the rail-seated anchor', async () => {
  const user = userEvent.setup()
  render(createElement(SpecForm, {
    user: {},
    onSet: vi.fn(),
    spec: modSlotSpec,
  }))
  await user.click(screen.getByRole('button', { name: 'Add modifier' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Lanpaint' }))
  // the leaf opens on the brick's KNOBS…
  expect(await screen.findByText('Force LanPaint')).toBeTruthy()
  // …never the rail-seated anchor (one seat, no double face — the
  // rail behind the modal keeps its own square, out of scope here)
  const dialog = screen.getByRole('dialog')
  expect(dialog.textContent).toContain('Force LanPaint')
  expect(dialog.textContent).not.toContain('Image 1')
})
