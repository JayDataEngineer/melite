// @vitest-environment happy-dom
// form-provider.spec.tsx — THE ONE square provider (form.tsx part
// 2): the three-entry menu (From flow / From media / From file /
// clear), the picker modal's two faces, the upload door + mirror,
// the host seams. Driven through SourceRow + a hook-capture
// harness for the verb closures themselves.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { SpecField } from '../src/spec.ts'
import type { SquareWire } from '../src/form.tsx'

import { InputSquare } from '../src/square.tsx'
import { SourceRow, useSquareProvider } from '../src/form.tsx'

afterEach(cleanup)

const IMG = { name: 'img', label: 'Image', type: 'image' } as SpecField
const DOC = { name: 'doc', label: 'Doc', type: 'file' } as SpecField
const TXT = { name: 'prompt', label: 'Prompt', type: 'text' } as SpecField

type Captured = { square: (f: SpecField) => unknown; wireMenu: unknown }

function Capture(props: {
  onEdit: (name: string, v: unknown) => void
  wire: SquareWire
  capture: (c: Captured) => void
}): ReturnType<typeof h> {
  const r = useSquareProvider(props.onEdit, props.wire)
  props.capture(r as unknown as Captured)
  return h('div', null, r.wireMenu)
}

function captureProvider(wire: SquareWire): { onEdit: ReturnType<typeof vi.fn>; cap: () => Captured } {
  const onEdit = vi.fn()
  let latest: Captured | null = null
  render(h(Capture, { onEdit, wire, capture: (c) => { latest = c } }))
  return { onEdit, cap: () => latest! }
}

function png(name = 'a.png'): File {
  return new File(['bits'], name, { type: 'image/png' })
}

function fakeReader(dataUrl = 'data:image/png;base64,AAA'): typeof FileReader {
  return class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(_f: Blob): void {
      this.result = dataUrl
      queueMicrotask(() => { this.onload?.() })
    }
  } as unknown as typeof FileReader
}

/** fetch fake routing the three doors this file's tests touch. */
function fakeFetch(opts: {
  mediaItems?: Array<Record<string, unknown>>
  mediaStatus?: number
  uploadPath?: string
  uploadStatus?: number
  uploadThrow?: unknown
  seen?: Array<{ url: string; body: string }>
}): typeof fetch {
  return (async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input)
    opts.seen?.push({ url, body: String((init as { body?: unknown } | undefined)?.body ?? '') })
    if (url.startsWith('/api/media/list')) {
      const rpcId = (JSON.parse(String((init as { body?: string }).body)) as { rpcId: number }).rpcId
      if ((opts.mediaStatus ?? 200) !== 200) return new Response('nope', { status: opts.mediaStatus })
      return Response.json({ type: 'server-response', rpcId, result: { ok: true, value: { items: opts.mediaItems ?? [] } } })
    }
    if (url === '/v1/uploads') {
      if (opts.uploadThrow !== undefined) throw opts.uploadThrow
      if ((opts.uploadStatus ?? 200) !== 200) return new Response('no', { status: opts.uploadStatus })
      return Response.json({ path: opts.uploadPath ?? 'data/input/a.png' })
    }
    throw new Error('unexpected fetch ' + url)
  }) as typeof fetch
}

test('THE HOOK: a non-slot field builds no square (never a square on a text field)', () => {
  const { cap } = captureProvider({ candidates: [] })
  expect(cap().square(TXT)).toBeUndefined()
})

test('THE HOOK: onPick seats the menu — default rect without an anchor, the element rect with one', () => {
  const { cap } = captureProvider({ candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }] })
  const host = cap().square(IMG) as { verbs: { onPick: (a?: unknown) => void } }
  act(() => { host.verbs.onPick() })
  expect(screen.getByRole('menuitem', { name: 'From flow' })).not.toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menuitem', { name: 'From flow' })).toBeNull()
  act(() => { host.verbs.onPick(document.createElement('div')) })
  expect(screen.getByRole('menuitem', { name: 'From media' })).not.toBeNull()
})

test('FROM FLOW: rows write the param; an empty row only closes (never a blank write)', () => {
  const onEdit = vi.fn()
  render(h(SourceRow, {
    label: 'Input', kind: 'image', value: null, onEdit,
    candidates: [
      { id: 'a', label: 'A', url: 'https://host/a.png' },
      { id: 'b', label: 'B', url: '' },
    ],
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(screen.getByText('From flow')).not.toBeNull()
  expect(screen.getByText(/latest outputs \(image\)/)).not.toBeNull()
  const rows = screen.getAllByTestId('source-pick-row')
  expect(rows.length).toBe(2)
  expect(rows[0]!.querySelector('img')?.getAttribute('src')).toBe('https://host/a.png')
  fireEvent.click(rows[1]!)
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.queryByText('From flow')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  fireEvent.click(screen.getAllByTestId('source-pick-row')[0]!)
  expect(onEdit).toHaveBeenCalledWith('https://host/a.png')
})

test('FROM FLOW: no candidates — the empty face, never a dead list', () => {
  render(h(SourceRow, { label: 'Doc', kind: 'file', value: null, onEdit: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'Doc source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(screen.getByText('nothing to pick yet')).not.toBeNull()
  expect(screen.getByText('The other stages’ latest outputs')).not.toBeNull()
})

test('FROM FLOW: candidatesFor narrows per field (the edge law, not the static list)', () => {
  const onEdit = vi.fn()
  let latest: Captured | null = null
  const seen: SpecField[] = []
  render(h(Capture, {
    onEdit,
    wire: {
      candidates: [
        { id: 'a', label: 'A', url: 'https://host/a.png' },
        { id: 'b', label: 'B', url: 'https://host/b.png' },
      ],
      candidatesFor: (f: SpecField) => {
        seen.push(f)
        return [{ id: 'b', label: 'B', url: 'https://host/b.png' }]
      },
    },
    capture: (c) => { latest = c },
  }))
  const host = latest!.square(IMG) as { verbs: { onPick: () => void } }
  act(() => { host.verbs.onPick() })
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(seen.length).toBe(1)
  expect(seen[0]!.name).toBe('img')
  expect(screen.getAllByTestId('source-pick-row').length).toBe(1)
  fireEvent.click(screen.getByTestId('source-pick-row'))
  expect(onEdit).toHaveBeenCalledWith('img', 'https://host/b.png')
})

test('FROM FLOW: the seam claim receives the whole request (mode, kind, field, rows)', () => {
  const seen: Array<{ mode: string; kind: string; field: SpecField; candidates: unknown[] }> = []
  render(h(SourceRow, {
    label: 'Input', kind: 'image', value: null, onEdit: () => {},
    candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }],
    renderSourcePick: ((req: { mode: 'flow' | 'media'; kind: string; field: SpecField; candidates: unknown[] }, _fb: unknown) => {
      seen.push(req)
      return h('p', null, 'claimed')
    }) as never,
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  expect(screen.getByText('claimed')).not.toBeNull()
  expect(seen.length).toBe(1)
  expect(seen[0]!.mode).toBe('flow')
  expect(seen[0]!.kind).toBe('image')
  expect(seen[0]!.field.name).toBe('__source_row__')
  expect(seen[0]!.candidates.length).toBe(1)
})

test('FROM MEDIA: the library rows — thumbs for images, glyphs for the rest; the pick writes', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({
    mediaItems: [
      { url: 'https://host/a.png', name: 'a', kind: 'image', runId: 'r1' },
      { url: 'data/input/b.txt', name: 'b', kind: 'file', runId: 'r2' },
    ],
  })
  try {
    const onEdit = vi.fn()
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    expect(screen.getByText('loading…')).not.toBeNull()
    const rows = await screen.findAllByTestId('source-pick-row')
    expect(rows.length).toBe(2)
    expect(rows[0]!.querySelector('img')?.getAttribute('src')).toBe('https://host/a.png')
    expect(rows[1]!.textContent).toContain('B')
    expect(screen.getByText(/runs library \(image\)/)).not.toBeNull()
    fireEvent.click(rows[0]!)
    expect(onEdit).toHaveBeenCalledWith('https://host/a.png')
    expect(screen.queryByText('From media')).toBeNull()
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FROM MEDIA: a refused door lists nothing (never a stuck spinner)', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({ mediaStatus: 500 })
  try {
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {} }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    await screen.findByText('nothing to pick yet')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FROM MEDIA: the picker closes without writing (never a stray pick)', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({ mediaItems: [] })
  try {
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {} }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    await screen.findByText('nothing to pick yet')
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }))
    expect(screen.queryByText('From media')).toBeNull()
  } finally {
    globalThis.fetch = realFetch
  }
})

function providerFileInput(): HTMLInputElement {
  const all = [...document.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
  const found = all.find((el) => (el.style as CSSStyleDeclaration).display === 'none')
  if (found === undefined) throw new Error('no provider file input')
  return found
}

test('FROM FILE: the OS dialog answers into the upload door; the estate path lands', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({})
  try {
    const onEdit = vi.fn()
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From file' }))
    const inp = providerFileInput()
    const file = png()
    Object.defineProperty(inp, 'files', { value: [file], configurable: true })
    fireEvent.change(inp)
    await waitFor(() => { expect(onEdit).toHaveBeenCalledWith('data/input/a.png') })
  } finally {
    globalThis.FileReader = RealReader
    globalThis.fetch = realFetch
  }
})

test('FROM FILE: an empty answer writes nothing (never a write from thin air)', () => {
  const onEdit = vi.fn()
  render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
  const inp = providerFileInput()
  Object.defineProperty(inp, 'files', { value: [], configurable: true })
  fireEvent.change(inp)
  expect(onEdit).not.toHaveBeenCalled()
  expect(inp.value).toBe('')
})

test('THE DROP: files ride the default door (mirror first, estate path on the param)', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({})
  try {
    const onEdit = vi.fn()
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
    fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
      dataTransfer: { getData: () => '', files: [png()] },
    })
    await waitFor(() => { expect(onEdit).toHaveBeenCalledWith('data/input/a.png') })
  } finally {
    globalThis.FileReader = RealReader
    globalThis.fetch = realFetch
  }
})

test('THE DROP: a host file law owns the file (the default door never fires)', () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: unknown) => { seen.push(String(input)); throw new Error('must not fire') }) as typeof fetch
  try {
    const onFile = vi.fn()
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {}, onFile }))
    const file = png()
    fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
      dataTransfer: { getData: () => '', files: [file] },
    })
    expect(onFile).toHaveBeenCalledWith(file)
    expect(seen.length).toBe(0)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('THE UPLOAD: refusals land ON the field (the door names itself, never a silent square)', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const cases: Array<{ fake: ReturnType<typeof fakeFetch>; message: string }> = [
    { fake: fakeFetch({ uploadStatus: 500 }), message: 'upload refused: HTTP 500' },
    { fake: fakeFetch({ uploadThrow: new Error('door down') }), message: 'door down' },
    { fake: fakeFetch({ uploadThrow: 'boom' }), message: 'upload failed' },
  ]
  for (const c of cases) {
    const realFetch = globalThis.fetch
    globalThis.fetch = c.fake
    try {
      const onEdit = vi.fn()
      const r = render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
      fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
        dataTransfer: { getData: () => '', files: [png()] },
      })
      await waitFor(() => { expect(onEdit).toHaveBeenCalledWith(c.message) })
      r.unmount()
    } finally {
      globalThis.fetch = realFetch
    }
  }
  globalThis.FileReader = RealReader
})

test('THE UPLOAD: wrong kinds refuse at the door (audio has no door; text is not media)', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({})
  try {
    const onEdit = vi.fn()
    const r = render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
    const box = screen.getByRole('button', { name: 'Input source' })
    fireEvent.drop(box, {
      dataTransfer: { getData: () => '', files: [new File(['x'], 'a.mp3', { type: 'audio/mpeg' })] },
    })
    await waitFor(() => { expect(onEdit).toHaveBeenCalledWith(expect.stringContaining('no door yet')) })
    r.unmount()
    const onEdit2 = vi.fn()
    const r2 = render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: onEdit2 }))
    fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
      dataTransfer: { getData: () => '', files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    await waitFor(() => { expect(onEdit2).toHaveBeenCalledWith(expect.stringContaining('drop an image or audio file')) })
    r2.unmount()
  } finally {
    globalThis.FileReader = RealReader
    globalThis.fetch = realFetch
  }
})

test('THE CLEAR: the danger row wipes the param (the mirror dies with it)', () => {
  const onEdit = vi.fn()
  render(h(SourceRow, { label: 'Input', kind: 'image', value: 'https://host/a.png', onEdit }))
  fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '— clear —' }))
  expect(onEdit).toHaveBeenCalledWith('')
})

test('THE HOOK: a reached square renders through the host (the capture harness holds)', () => {
  const onEdit = vi.fn()
  const seen: Captured[] = []
  render(h(Capture, { onEdit, wire: { candidates: [] }, capture: (c) => { seen.push(c) } }))
  const host = seen[0]!.square(IMG) as { verbs: { onClear: () => void } }
  act(() => { host.verbs.onClear() })
  expect(onEdit).toHaveBeenCalledWith('img', '')
})

test('FROM FLOW: the media door stays shut on the flow face (never a speculative fetch)', () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: unknown) => { seen.push(String(input)); return Response.json({}) }) as typeof fetch
  try {
    render(h(SourceRow, {
      label: 'Input', kind: 'image', value: null, onEdit: () => {},
      candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }],
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
    expect(seen.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }))
  } finally {
    globalThis.fetch = realFetch
  }
})

test('THE ASSET DROP: a bench-row drag writes its url verbatim (the slot is the wire)', () => {
  const onEdit = vi.fn()
  render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
  fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
    dataTransfer: {
      getData: (mime: string) => mime === 'application/tech-noir-asset' ? '{"url":"https://host/bench.png"}' : '',
      files: [],
    },
  })
  expect(onEdit).toHaveBeenCalledWith('https://host/bench.png')
})

test('FROM MEDIA: a file field fetches the whole library (accept narrows client-side per row)', async () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input)
    seen.push(url + ' :: ' + String((init as { body?: string } | undefined)?.body ?? ''))
    const rpcId = (JSON.parse(String((init as { body?: string }).body)) as { rpcId: number }).rpcId
    return Response.json({ type: 'server-response', rpcId, result: { ok: true, value: { items: [] } } })
  }) as typeof fetch
  try {
    render(h(SourceRow, { label: 'Doc', kind: 'file', value: null, onEdit: () => {} }))
    fireEvent.click(screen.getByRole('button', { name: 'Doc source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    await screen.findByText('The runs library')
    expect(seen.some((s) => s.includes('"kind":"all"'))).toBe(true)
  } finally {
    globalThis.fetch = realFetch
  }
})
