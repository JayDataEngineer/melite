/**
 * edges.spec.tsx — THE EDGE LAW's client proof (operator order,
 * 2026-09-12: "whenever a card emits via the package system, it
 * needs to have 'input' 'required=True', or 'output', so the edges
 * are defined"): the square provider's picker narrows PER FIELD —
 * only rows whose card DECLARES an output of the field's input-edge
 * kind serve in the menu. The base constructs the narrowing; the
 * emission defines the edges.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { SpecForm, useSquareProvider, type SpecField, type SpecValues } from '../src/client/spec-form.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// the drill-side narrowing the CardsTab builds from the emission:
// spec.inputs (declared edge kinds) × the forms-table's declared
// outputs — exactly the candidatesFor the drill passes the provider.
function edgeNarrow(
  spec: { inputs: Array<{ name: string; kind: string }> },
  edgeMeta: Record<string, { outputs?: Record<string, string> }>,
  rows: Array<{ id: string; card: string; label: string; url: string }>,
): (f: { name: string }) => Array<{ id: string; label: string; url: string }> {
  return (f) => {
    const edge = spec.inputs.find((e) => e.name === f.name)
    if (edge === undefined) return rows.map(({ id, label, url }) => ({ id, label, url }))
    return rows
      .filter((r) => {
        const outs = edgeMeta[r.card]?.outputs
        return outs !== undefined && Object.values(outs).includes(edge.kind)
      })
      .map(({ id, label, url }) => ({ id, label, url }))
  }
}

test('THE EDGE LAW: the picker offers only kind-matching outputs — a text-output row never serves an image edge', async () => {
  const user = userEvent.setup()
  let hostEdit: ReturnType<typeof vi.fn> = vi.fn()
  // the emission: input_image declares an IMAGE edge; input_text
  // declares a TEXT edge (both required — True emits)
  const spec = {
    inputs: [
      { name: 'input_image', kind: 'image', required: true },
      { name: 'notes', kind: 'text' },
    ],
  }
  // the forms table's declared outputs: img declares image, tts
  // declares audio (a PNG-url row from a TEXT-output card is the
  // corruption the law kills — url shapes NEVER decide, the
  // DECLARATION does)
  const edgeMeta = {
    'image-gen': { outputs: { default: 'image' } },
    'tts': { outputs: { default: 'audio' } },
  }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
    { id: 's_tts', card: 'tts', label: 'tts', url: '/melite-media/runs/r9/tts/out_00001_.wav' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  function Host(): ReturnType<typeof createElement> {
    const editRef = useRef<ReturnType<typeof vi.fn> | null>(null)
    if (editRef.current === null) editRef.current = vi.fn()
    hostEdit = editRef.current
    const { square, wireMenu } = useSquareProvider(editRef.current, {
      candidates: rows.map(({ id, label, url }) => ({ id, label, url })),
      candidatesFor,
    })
    const fields: SpecField[] = [
      { name: 'input_image', label: 'Input image', type: 'image' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ]
    const values: SpecValues = {}
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, { fields, values, onEdit: editRef.current, square }),
    )
  }
  render(createElement(Host))
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  const imgRow = await screen.findByText('image-gen', {}, { timeout: 2000 })
  expect(imgRow.closest('[role="menuitem"], [role="option"], li')).toBeTruthy()
  // THE LAW: the tts row (audio-declared output) NEVER serves the
  // image edge — not because of its url, because of its declaration
  await waitFor(() => {
    const rows = [...document.querySelectorAll('[role="menuitem"], [role="option"], li')]
    expect(rows.some((el) => (el.textContent ?? '').includes('tts'))).toBe(false)
    expect(rows.some((el) => (el.textContent ?? '').includes('image-gen'))).toBe(true)
  })
  // the narrowing does not eat the law-abiding pick
  fireEvent.click(screen.getByText('image-gen'))
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('input_image', '/melite-media/runs/r8/img/gen_00001_.png')
  })
})

test('THE EDGE LAW: a field with no declared edge falls to the full list (the picker never blocks)', async () => {
  const user = userEvent.setup()
  const spec = { inputs: [] }
  const edgeMeta = { 'image-gen': { outputs: { default: 'image' } } }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  function Host(): ReturnType<typeof createElement> {
    const { square, wireMenu } = useSquareProvider(vi.fn(), {
      candidates: rows.map(({ id, label, url }) => ({ id, label, url })),
      candidatesFor,
    })
    const fields: SpecField[] = [{ name: 'extra', label: 'Extra', type: 'image' }]
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, { fields, values: {}, onEdit: () => {}, square }),
    )
  }
  render(createElement(Host))
  await user.click(screen.getByRole('button', { name: /Extra source/ }))
  const row = await screen.findByText('image-gen', {}, { timeout: 2000 })
  expect(row.closest('[role="menuitem"], [role="option"], li')).toBeTruthy()
})
