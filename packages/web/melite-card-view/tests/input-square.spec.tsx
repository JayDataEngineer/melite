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
import { schemaEnvelope, SpecForm, useSquareProvider, type FormSpecDoc, type SpecValues } from '../src/client/spec-form.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// THE ONE-ENVELOPE FIXTURE (three mounts share it)
const IMAGE_DOC: FormSpecDoc = {
  form: 'square-fixture',
  schema: schemaEnvelope({
    input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image' } } },
  }),
}

// ── the options normalization (the door serves BOTH shapes) ──────────

test('select options render text for BOTH door shapes', () => {
  // the walker's option law: plain strings label themselves; const
  // members with meta.description carry their labels
  const doc: FormSpecDoc = {
    form: 'options-fixture',
    schema: schemaEnvelope({
      resolution: { consts: ['512', '1024'], meta: { description: 'Resolution' } },
      bg: { consts: [{ value: 'auto', label: 'Auto removal' }], meta: { description: 'BG' } },
    }),
  }
  const user: SpecValues = { resolution: '512', bg: 'auto' }
  render(createElement(SpecForm, { spec: doc, user, onSet: () => {} }))
  const s1 = screen.getByLabelText('Resolution') as HTMLSelectElement
  expect([...s1.options].map((o) => o.textContent)).toEqual(['512', '1024'])
  const s2 = screen.getByLabelText('BG') as HTMLSelectElement
  // THE TITLE-CASE FACE (the operator's sweep law): the declared
  // prose renders titled — the option VALUE rides verbatim.
  expect([...s2.options].map((o) => o.textContent)).toEqual(['Auto Removal'])
  expect([...s2.options].map((o) => o.value)).toEqual(['auto'])
})

// ── the square atom (the old law verbatim) ────────────────────────────

test('empty square: plus glyph, label, bare click opens the FILE picker (no picker attached)', async () => {
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
      spec: IMAGE_DOC,
      user: values,
      onSet: onEdit,
      square,
    }),
  )
}

test("the provider: THE THREE-ENTRY SOURCE MENU — flat pick is dead, From flow opens the picker modal and writes the picked url", async () => {
  const user = userEvent.setup()
  render(createElement(HostSquare))
  // the square click opens the SOURCE MENU — even with a value set
  const box = screen.getByRole('button', { name: /Input image source/ })
  await user.click(box)
  // THE LAW: three entries + clear — never a flat candidates list
  const flowItem = await screen.findByText('From flow', {}, { timeout: 2000 })
  expect(screen.getByText('From media')).toBeTruthy()
  expect(screen.getByText('From file')).toBeTruthy()
  expect(screen.queryByText('Upload a file…')).toBeNull()
  expect(screen.queryByText('tagger')).toBeNull() // no flat rows on the first page
  fireEvent.click(flowItem.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  // the picker MODAL lists the flow candidates (edge-law narrowed)
  const row = (await screen.findAllByTestId('source-pick-row'))
    .find((el) => el.textContent?.includes('image-gen') === true)
  expect(row).toBeTruthy()
  fireEvent.click(row as HTMLElement)
  // THE LAW: picking writes the field's param to the output's url
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('input_image', '/melite-media/runs/r8/img/gen_00001_.png')
  })
})

test('the provider: From media lists the runs library and writes the picked url', async () => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    if (url.endsWith('/api/media/list')) {
      // the frame law: the response ECHOES the minted rpcId
      const sent = JSON.parse(String(init?.body ?? '{}')) as { rpcId?: string }
      return new Response(JSON.stringify({
        type: 'server-response', rpcId: sent.rpcId ?? '',
        result: { ok: true, value: { count: 2, items: [
          { url: '/melite-media/runs/r9/gen_00002_.png', name: 'gen_00002_.png', kind: 'image', runId: 'r9' },
          { url: '/melite-media/runs/r9/out.mp4', name: 'out.mp4', kind: 'video', runId: 'r9' },
        ] } },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('unexpected fetch ' + url)
  })
  const user = userEvent.setup()
  render(createElement(HostSquare))
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  fireEvent.click(screen.getByText('From media').closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const row = (await screen.findAllByTestId('source-pick-row'))
    .find((el) => el.textContent?.includes('gen_00002_.png') === true)
  expect(row).toBeTruthy()
  // an image row carries a thumbnail
  expect((row as HTMLElement).querySelector('img')).toBeTruthy()
  fireEvent.click(row as HTMLElement)
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('input_image', '/melite-media/runs/r9/gen_00002_.png')
  })
})

test('the seam: renderSourcePick claims the picker face — the host override beats the default', async () => {
  vi.stubGlobal('fetch', async (): Promise<Response> =>
    new Response(JSON.stringify({
      type: 'server-response', rpcId: 'r2',
      result: { ok: true, value: { count: 0, items: [] } },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
  const seam = vi.fn((req: { mode: string; kind: string }, fallback: unknown) =>
    req.mode === 'media' ? createElement('div', { 'data-testid': 'host-picker' }, 'host face ' + req.kind) : fallback)
  function SeamHost(): ReturnType<typeof createElement> {
    const { square, wireMenu } = useSquareProvider(vi.fn(), { candidates: [], renderSourcePick: seam as never })
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, {
        spec: IMAGE_DOC,
        user: {},
        onSet: vi.fn(),
        square,
      }),
    )
  }
  const user = userEvent.setup()
  render(createElement(SeamHost))
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  fireEvent.click(screen.getByText('From media').closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const host = await screen.findByTestId('host-picker')
  expect(host.textContent).toBe('host face image') // the claim; the default modal never renders
  expect(screen.queryByTestId('source-pick-row')).toBeNull()
})

test('the provider: From file rides the hidden OS picker', async () => {
  const user = userEvent.setup()
  render(createElement(HostSquare))
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  // spy EVERY file input (the square's bare arm renders one too);
  // the law: the menu's From file drives ONE of them
  const inputs = Array.from(document.querySelectorAll('input[type=file]'))
  expect(inputs.length > 0).toBe(true)
  const spies = inputs.map((i) => vi.spyOn(i, 'click').mockImplementation(() => {}))
  const item = screen.getByText('From file').closest('[role="menuitem"], [role="option"], li')
  expect(item !== null).toBe(true)
  fireEvent.click(item as HTMLElement)
  expect(spies.filter((s) => s.mock.calls.length === 1).length).toBe(1)
  for (const s of spies) s.mockRestore()
})

test('the provider: upload mirrors locally, patches with the estate path', async () => {
  stubUpload('/v1/uploads/input_dir/img_99.png')
  const user = userEvent.setup()
  render(createElement(HostSquare))
  // the field carries a non-URL value → metric line shows it
  expect(screen.getByText('mesh.png')).toBeTruthy()
  // the real gesture under the source-menu law: menu → From file →
  // the OS dialog's change lands with the menu already closed
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  fireEvent.click(screen.getByText('From file').closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  const f = new File([new Uint8Array([1, 2])], 'photo.png', { type: 'image/png' })
  await user.upload(input, f)
  await waitFor(() => {
    const img = screen.queryByRole('img', { name: 'Input image' }) as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.src.startsWith('data:image/png')).toBe(true) // the mirror
  }, { timeout: 3000 })
})
