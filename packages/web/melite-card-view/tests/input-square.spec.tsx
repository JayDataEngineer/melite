// @vitest-environment happy-dom
/**
 * The shared input square (the old SlotSquare law on the DSH
 * substrate) + the options normalization — the two shared-atom fixes
 * every card inherits (generic form AND registered studios).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement, useRef } from 'react'

import { InputSquare, isImageUrl, readAsDataUrl } from '../src/client/input-square.tsx'
import { SpecForm, useSquareProvider, type SpecField, type SpecValues } from '../src/client/spec-form.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ── the options normalization (the door serves BOTH shapes) ──────────

test('select options render text for BOTH door shapes', () => {
  const fields: SpecField[] = [
    { name: 'resolution', label: 'Resolution', type: 'select', options: ['512', '1024'] },
    { name: 'bg', label: 'BG', type: 'select', options: [{ value: 'auto', label: 'Auto removal' }] },
  ]
  const values: SpecValues = { resolution: '512', bg: 'auto' }
  render(createElement(SpecForm, { fields, values, onEdit: () => {} }))
  const s1 = screen.getByLabelText('Resolution') as HTMLSelectElement
  expect([...s1.options].map((o) => o.textContent)).toEqual(['512', '1024'])
  const s2 = screen.getByLabelText('BG') as HTMLSelectElement
  expect([...s2.options].map((o) => o.textContent)).toEqual(['Auto removal'])
})

// ── the square atom (the old law verbatim) ────────────────────────────

test('empty square: paperclip glyph, label, click opens the FILE picker', async () => {
  const onFile = vi.fn()
  const user = userEvent.setup()
  render(createElement(InputSquare, { label: 'input_image', value: null, onFile }))
  expect(screen.getByRole('button', { name: /input_image source/ })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /input_image source/ }))
  // the hidden input exists (the picker opened through it)
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  expect(input).toBeTruthy()
})

test('set square: thumbnail + detach; the click ALWAYS opens the picker', async () => {
  const onPick = vi.fn()
  const onClear = vi.fn()
  const user = userEvent.setup()
  render(createElement(InputSquare, {
    label: 'input_image',
    value: 'data:image/png;base64,AAA',
    onPick, onClear,
  }))
  const img = screen.getByRole('img', { name: 'input_image' }) as HTMLImageElement
  expect(img.src.startsWith('data:image/png')).toBe(true)
  // the slot IS the wire: a set square still opens the picker on click
  await user.click(screen.getByRole('button', { name: /input_image source/ }))
  expect(onPick).toHaveBeenCalledTimes(1)
  const anchor = onPick.mock.calls[0][0]
  expect(anchor instanceof HTMLElement).toBe(true) // the Menu anchors on the square
  await user.click(screen.getByRole('button', { name: 'Detach input_image' }))
  expect(onClear).toHaveBeenCalledTimes(1)
})

test('drops: OS file → onFile, asset MIME → onAsset', () => {
  const onFile = vi.fn()
  const onAsset = vi.fn()
  render(createElement(InputSquare, { label: 'src', value: null, onFile, onAsset }))
  const box = screen.getByRole('button', { name: /src source/ })
  const drop = (mime: string, payload: string, files: File[] = []): void => {
    const dt = new DataTransfer()
    if (mime !== '') dt.setData(mime, payload)
    for (const f of files) dt.items.add(f)
    fireEvent.drop(box, { dataTransfer: dt })
  }
  drop('application/tech-noir-asset', JSON.stringify({ url: '/v1/assets/runs/r1/mesh.png' }))
  expect(onAsset).toHaveBeenCalledWith('/v1/assets/runs/r1/mesh.png')
  const f = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })
  drop('', '', [f])
  expect(onFile).toHaveBeenCalledWith(f)
})

test('isImageUrl / readAsDataUrl — the ONE rules (SlotSquare law, kept)', async () => {
  expect(isImageUrl('data:image/png;base64,A')).toBe(true)
  expect(isImageUrl('blob:http://x/y')).toBe(true)
  expect(isImageUrl('/v1/assets/runs/r/Poster.png')).toBe(true)
  expect(isImageUrl('mesh_body_001.glb')).toBe(false)
  const url = await readAsDataUrl(new Blob([new Uint8Array([1])], { type: 'image/png' }))
  expect(url.startsWith('data:image/png')).toBe(true)
})

// ── the ONE provider (drill and studios ride the same hook) ──────────

function stubUpload(path: string): void {
  vi.stubGlobal('fetch', async (): Promise<Response> =>
    new Response(JSON.stringify({ path }), { status: 200, headers: { 'content-type': 'application/json' } }))
}

let hostEdit: ReturnType<typeof vi.fn>
function HostSquare(): ReturnType<typeof createElement> {
  const values: SpecValues = { input_image: 'mesh.png' }
  // ONE edit fn across renders (a fresh vi.fn() per render would
  // leave the assertion holding a stale reference)
  const editRef = useRef<ReturnType<typeof vi.fn> | null>(null)
  if (editRef.current === null) editRef.current = vi.fn()
  hostEdit = editRef.current
  const onEdit = editRef.current
  const wire = {
    candidates: [
      { id: 's_img', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
      { id: 's_tag', label: 'tagger', url: '/melite-media/runs/r7/tag/tag_00001_.png' },
    ],
  }
  const { square, wireMenu } = useSquareProvider(onEdit, wire)
  return createElement('div', null,
    wireMenu,
    createElement(SpecForm, {
      fields: [{ name: 'input_image', label: 'Input image', type: 'image' }],
      values,
      onEdit,
      square,
    }),
  )
}

test("the provider: THE SLOT IS THE WIRE — the picker writes the picked url into the param", async () => {
  const user = userEvent.setup()
  render(createElement(HostSquare))
  // the square click opens the picker (Menu) — even with a value set
  const box = screen.getByRole('button', { name: /Input image source/ })
  await user.click(box)
  // the Menu opened: candidates as menu rows + upload + clear
  const tagRow = await screen.findByText('tagger', {}, { timeout: 2000 })
  expect(tagRow).toBeTruthy()
  expect(screen.getByText('Upload a file…')).toBeTruthy()
  const menuRow = screen.getAllByText('image-gen')
    .find((el) => el.closest('[role="menuitem"], [role="option"], li') !== null)
  expect(menuRow).toBeTruthy()
  // a plain click (the Menu's outside-pointerdown guard would eat
  // userEvent's pointer dance before the click lands)
  fireEvent.click(menuRow as HTMLElement)
  // THE LAW: picking writes the field's param to the output's url
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('input_image', '/melite-media/runs/r8/img/gen_00001_.png')
  })
  await waitFor(() => { expect(screen.queryByText('tagger')).toBeNull() }, { timeout: 2000 })
})

test('the provider: upload mirrors locally, patches with the estate path', async () => {
  stubUpload('/v1/uploads/input_dir/img_99.png')
  const user = userEvent.setup()
  render(createElement(HostSquare))
  // the field carries a non-URL value → metric line shows it
  expect(screen.getByText('mesh.png')).toBeTruthy()
  // upload through the hidden picker (the real gesture)
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  const f = new File([new Uint8Array([1, 2])], 'photo.png', { type: 'image/png' })
  await user.upload(input, f)
  await waitFor(() => {
    const img = screen.queryByRole('img', { name: 'Input image' }) as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.src.startsWith('data:image/png')).toBe(true) // the mirror
  }, { timeout: 3000 })
})
