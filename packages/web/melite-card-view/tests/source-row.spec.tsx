// source-row.spec.tsx — THE SLOT ROW LAW + THE MULTI-IMAGE ROW (hour 24,
// the operator's lane report: "the images aren't even in a row… a slot
// for REFERENCE IMAGES and the PLUS????"). Pins:
//  1. the slot-shaped fields of one group render side-by-side in ONE
//     row container (labels under squares, no stacked key rows);
//  2. image_list renders one SourceRow square per entry + a trailing
//     add square (the mods' dynamically-addable grammar), capped at 3;
//  3. the add square's menu appends (From flow); detach removes the
//     index (the array rewrite, never a string clobber).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { SpecForm, type SpecField, type SpecValues } from '../src/client/spec-form.tsx'

afterEach(cleanup)

const imgFields: SpecField[] = [
  { name: 'image2', label: 'Image 2', type: 'image' },
  { name: 'image3', label: 'Image 3', type: 'image' },
]
const listField: SpecField = { name: 'reference_images', label: 'Reference Images', type: 'image_list' }

function Host({ fields, values, onEdit }: {
  fields: SpecField[]
  values: SpecValues
  onEdit: ReturnType<typeof vi.fn>
}): ReturnType<typeof createElement> {
  return createElement(SpecForm, {
    fields,
    values,
    onEdit,
    square: undefined,
  })
}

test('THE SLOT ROW: one group\'s image squares sit side-by-side in ONE row container', () => {
  const { container } = render(createElement(Host, {
    fields: imgFields,
    values: {},
    onEdit: vi.fn(),
  }))
  const rows = container.querySelectorAll('[class*="specSlotRow"]')
  expect(rows.length).toBe(1) // both squares share ONE row
  const row = rows[0] as HTMLElement
  expect(row.querySelectorAll('[role="button"][aria-label*="source"]').length).toBe(2)
  // their labels ride under the squares (aria), not as stacked key rows
  expect(row.querySelector('[class*="specFieldKey"]')).toBeNull()
})

test('THE MULTI-IMAGE ROW: entries render as squares + the trailing add, capped at 3', () => {
  const { container } = render(createElement(Host, {
    fields: [listField],
    values: { reference_images: ['/melite-media/runs/r1/a.png', '/melite-media/runs/r1/b.png'] },
    onEdit: vi.fn(),
  }))
  const block = container.querySelector('[data-image-list="reference_images"]') as HTMLElement
  expect(block).toBeTruthy()
  // the named key line survives (a NAMED multi-slot row)
  expect(screen.getByText('Reference Images')).toBeTruthy()
  const squares = block.querySelectorAll('[role="button"][aria-label*="source"]')
  expect(squares.length).toBe(3) // 2 entries + the add square
  // the entries carry thumbnails
  expect(block.querySelectorAll('img').length).toBe(2)
})

test('the add square appends through the menu (From flow) — the array grows, never clobbers', async () => {
  const onEdit = vi.fn()
  const user = userEvent.setup()
  const wire = {
    candidates: [{ id: 's1', label: 'image-gen', url: '/melite-media/runs/r8/gen_00001_.png' }],
  }
  render(createElement(SpecForm, {
    fields: [listField],
    values: { reference_images: ['keep.png'] },
    onEdit,
    wire,
  }))
  const block = document.querySelector('[data-image-list="reference_images"]') as HTMLElement
  // the ADD square is the TRAILING one — last in the row by construction
  const add = Array.from(block.querySelectorAll('[role="button"][aria-label*="source"]')).pop() as HTMLElement
  expect(add).toBeTruthy()
  await user.click(add)
  const flow = await screen.findByText('From flow', {}, { timeout: 2000 })
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const row = (await screen.findAllByTestId('source-pick-row'))[0] as HTMLElement
  fireEvent.click(row)
  await waitFor(() => {
    // the rewrite is the ARRAY with the pick appended — the entry kept
    expect(onEdit).toHaveBeenCalledWith('reference_images', ['keep.png', '/melite-media/runs/r8/gen_00001_.png'])
  })
})

test('the cap: three entries render NO add square (the frozen picker law)', () => {
  const { container } = render(createElement(Host, {
    fields: [listField],
    values: { reference_images: ['a.png', 'b.png', 'c.png'] },
    onEdit: vi.fn(),
  }))
  const block = container.querySelector('[data-image-list="reference_images"]') as HTMLElement
  const squares = block.querySelectorAll('[role="button"][aria-label*="source"]')
  expect(squares.length).toBe(3) // full — no fourth
})

// ── THE INPUT RAIL (the operator's second lane report: "an input rail
//    with images 2 and 3, then ANOTHER rail for reference images and
//    image 1 stacked vertically") — the signature builds ONE rail ──
const railSpec = {
  inputs: [
    { name: 'image1', kind: 'image', required: true },
    { name: 'image2', kind: 'image' },
    { name: 'image3', kind: 'image' },
    { name: 'reference_images', kind: 'image' },
  ],
} as never

const railFields: SpecField[] = [
  { name: 'image2', label: 'Image 2', type: 'image' },
  { name: 'image3', label: 'Image 3', type: 'image' },
  { name: 'reference_images', label: 'Reference Images', type: 'image_list' },
  { name: 'image1', label: 'Image 1', type: 'image' },
]

test('THE INPUT RAIL: the declared signature renders ONE rail in signature order — image1 first, no second input group', () => {
  const { container } = render(createElement(SpecForm, {
    fields: railFields,
    values: { reference_images: ['a.png'] },
    onEdit: vi.fn(),
    spec: railSpec,
  }))
  const rail = container.querySelector('[data-input-rail]') as HTMLElement
  expect(rail).toBeTruthy()
  const squares = Array.from(rail.querySelectorAll('[role="button"][aria-label*="source"]'))
  expect(squares.length).toBe(3 + 2) // image1/2/3 + the list entry + its add
  // SIGNATURE order: the anchor (Image 1) rides FIRST, not after the list
  const labels = squares.map((s) => (s as HTMLElement).getAttribute('aria-label'))
  expect(labels.indexOf('Image 1 source')).toBe(0)
  // the list row lives IN the rail zone (its own named block)
  expect(rail.querySelector('[data-image-list="reference_images"]')).toBeTruthy()
  // the param groups EXCLUDE the rail names — no second input group, no stray squares
  const groups = container.querySelectorAll('section[class*="specGroup"]:not([class*="inputRail"])')
  groups.forEach((g) => {
    const el = g as HTMLElement
    expect(el.querySelector('[role="button"][aria-label*="source"]')).toBeNull()
    expect(el.textContent).not.toContain('Reference Images')
  })
})

test('without a signature the group grammar still holds (backward face)', () => {
  const { container } = render(createElement(Host, {
    fields: railFields,
    values: {},
    onEdit: vi.fn(),
  }))
  expect(container.querySelector('[data-input-rail]')).toBeNull()
  expect(container.querySelectorAll('[class*="specSlotRow"]').length).toBeGreaterThan(0)
})
