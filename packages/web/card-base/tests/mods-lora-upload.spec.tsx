// @vitest-environment happy-dom
// mods-lora-upload.spec.tsx — THE MODS-PLANE HAND-UPLOAD WALL (the
// operator's 2026-11-15 feature: a lora upload button on the mods
// plane + a default strength, scoped in
// dev_docs/audits/features/lora-mod-upload-button-2026-11-05.md).
//
// THE LAW: the OPTION-kind leaf carries the Manager sidebar's
// upload gesture SEATED WHERE THE BAG IS AUTHORED — a hidden file
// input + drag-drop + a default-strength dial, wired to a
// host-injected transport. The seated combo name IS the bag id
// (never a hand-spelled one); the refresh seam re-serves the picker
// the SAME session; absent wire = NO affordance (the degrade law).
//
// Axes (LAW 4): ACCURACY — the arms judge the gesture's outcomes
// (the wire's call shape, the picker's refreshed row, the bag's
// committed entry), never a render census. COVERAGE — the dial's
// pass-through, the refusal voice, and the degrade law each judge
// on their own path. ENFORCEMENT — every toggle named below reds
// its own arm. DEPTH — the arms ride the REAL leaf (openCreate →
// input → Add), the same door the operator's click walks.
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

/** the REAL gesture's first half: answer the hidden input. */
function answerUploadInput(file: File): void {
  const row = document.querySelector('[data-testid="mod-lora-upload"]')
  if (row === null) throw new Error('the upload row must render when the wire is present')
  const inp = row.querySelector('input[type="file"]')
  if (inp === null) throw new Error('the hidden file input must ride the upload row')
  Object.defineProperty(inp, 'files', { value: [file], configurable: true })
  fireEvent.change(inp)
}

test('UPLOAD: the wire carries the file + dial; the seated combo name seeds the picker and the refreshed row SERVES (W3)', async () => {
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
  // the dial BEFORE the gesture — the operator's default rides the
  // wire (blank = the door's own 1, judged by the estate walls)
  fireEvent.change(screen.getByLabelText(chromeCopy.loraUploadStrengthLabel), { target: { value: '0.6' } })
  answerUploadInput(new File(['%MEL'], 'op-pick.safetensors'))
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

test('UPLOAD BLANK DIAL: no strength key rides the wire — the door owns the default (never a client-side 1)', async () => {
  const uploadLora = vi.fn().mockResolvedValue({ id: 'h3/x.safetensors', row_seated: true })
  const refreshSpec = vi.fn().mockResolvedValue(undefined)
  openLeaf({ uploadLora, refreshSpec })
  openCreate()
  answerUploadInput(new File(['%MEL'], 'x.safetensors'))
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
  answerUploadInput(new File(['%MEL'], 'y.safetensors'))
  await waitFor(() => {
    expect(screen.getByText('the rows file refuses the write: broken')).not.toBeNull()
  })
  expect(refreshSpec).not.toHaveBeenCalled()
})

test('DEGRADE LAW: absent wire renders NO upload affordance — the leaf arms stay byte-identical (W5)', () => {
  const { onEdit } = openLeaf({})
  openCreate()
  expect(document.querySelector('[data-testid="mod-lora-upload"]')).toBeNull()
  expect(document.querySelector('[data-testid="mod-lora-upload-verb"]')).toBeNull()
  // the leaf still owns its whole face: the picker serves, Add commits
  fireEvent.click(screen.getByLabelText('LoRA'))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Detail' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'detail', strength: 0.8 }])
})
