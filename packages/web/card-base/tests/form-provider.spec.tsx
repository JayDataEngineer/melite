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
import type { FormSpecDoc } from '../src/spec.ts'
import type { SquareWire } from '../src/form.tsx'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { fetchMediaLibrary } from '../src/media-library.ts'

import { InputSquare } from '../src/square.tsx'
import { acceptOfField } from '../src/square-provider.tsx'
import { CardForm, SourceRow, useSquareProvider } from '../src/form.tsx'

afterEach(cleanup)
afterEach(unbindEstateRemote)

const IMG = { name: 'img', label: 'Image', type: 'image' } as SpecField
const DOC = { name: 'doc', label: 'Doc', type: 'file' } as SpecField
const MESH = { name: 'rig', label: 'Rig', type: 'mesh' } as SpecField
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

/** THE MEDIA BIND (the one-lane law): the picker's rows ride the
 *  mounted media namespace — this spec binds a local fake (the
 *  card-view harness is that surface's own fixture) and injects the
 *  REAL fetchMediaLibrary, so the kind threading + row shaping run
 *  for real. Unused namespaces throw (never silently serve). */
function bindMedia(items?: Array<{ url: string; name: string }>, refuse?: string): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error('unused namespace in this wall: ' + method) }
  bindEstateRemote({
    bench: { get: dead('bench/get'), 'add-stage': dead('bench/add-stage'), 'remove-stage': dead('bench/remove-stage') },
    drafts: { get: dead('drafts/get'), patch: dead('drafts/patch') },
    runs: {
      list: dead('runs/list'), start: dead('runs/start'), status: dead('runs/status'),
      stop: dead('runs/stop'), validate: dead('runs/validate'),
    },
    media: {
      list: async (kind: string) => {
        void kind
        return refuse !== undefined
          ? { ok: false, error: new RemoteError('gateway/bad-request', refuse, {}) }
          : { ok: true, value: { items: items ?? [] } }
      },
    },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

/** fetch fake routing the two doors this file's tests still touch
 *  (uploads + the flow-face tripwire — media rides the bind above). */
function fakeFetch(opts: {
  uploadPath?: string
  uploadStatus?: number
  uploadThrow?: unknown
  seen?: Array<{ url: string; body: string }>
}): typeof fetch {
  return (async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input)
    opts.seen?.push({ url, body: String((init as { body?: unknown } | undefined)?.body ?? '') })
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

test('THE MESH HOOK: a mesh field is slot-shaped and retargets the file dialog to GLB', () => {
  const { cap } = captureProvider({ candidates: [] })
  const host = cap().square(MESH) as { display: string | null; verbs: { onPick: () => void } }
  expect(host.display).toBeNull()
  expect(acceptOfField(MESH)).toBe('.glb,.gltf')
  expect(acceptOfField(null)).toBe('image/png,image/jpeg,image/webp')
  act(() => { host.verbs.onPick() })
  fireEvent.click(screen.getByRole('menuitem', { name: 'From file' }))
  expect(providerFileInput().getAttribute('accept')).toBe('.glb,.gltf')
})

test('FROM MEDIA: a mesh field asks the list door for the MODEL kind', async () => {
  // THE KIND SPELLING (2026-09-26): the media list door admits
  // image/audio/video/model/all and refuses anything else. `mesh` is
  // the client PREVIEW kind, a different vocabulary — asking the door
  // for it guaranteed a `media/kind` refusal, which the picker caught
  // into an empty list, so every mesh field's "From media" was
  // mysteriously empty with no error anywhere.
  const seen: string[] = []
  const loadMedia = async (kind: string, _signal: AbortSignal): Promise<Array<{ url: string; name: string }>> => {
    seen.push(kind)
    return []
  }
  const { cap } = captureProvider({ candidates: [], loadMedia })
  const host = cap().square(MESH) as { verbs: { onPick: () => void } }
  act(() => { host.verbs.onPick() })
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  expect(await screen.findByText(/runs library \(model\)/)).not.toBeNull()
  expect(seen).toEqual(['model'])
})

test('FROM MEDIA: a door REFUSAL is stated, not rendered as an empty library', async () => {
  // The no-silent-drop arm: the catch used to swallow the refusal into
  // "nothing to pick yet", which is how the kind mismatch above shipped
  // unnoticed. A refusal must be legible in the picker.
  const loadMedia = async (): Promise<Array<{ url: string; name: string }>> => {
    throw new Error('no seat on this lane serves GET /v1/media/list')
  }
  const { cap } = captureProvider({ candidates: [], loadMedia })
  const host = cap().square(MESH) as { verbs: { onPick: () => void } }
  act(() => { host.verbs.onPick() })
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  expect(await screen.findByText(/media library unavailable/)).not.toBeNull()
})

test('FROM MEDIA: a non-Error door refusal still states its reason (never "[object Object]")', async () => {
  // The String(e) arm: a door that rejects with a bare string (a
  // worker boundary posting the reason, not an Error) must read
  // verbatim in the picker — the instanceof arm alone would print
  // the object stringification instead of the reason.
  const loadMedia = async (): Promise<Array<{ url: string; name: string }>> => {
    throw 'the media seat is down for restart'
  }
  const { cap } = captureProvider({ candidates: [], loadMedia })
  const host = cap().square(MESH) as { verbs: { onPick: () => void } }
  act(() => { host.verbs.onPick() })
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  expect(await screen.findByText(/media library unavailable — the media seat is down for restart/)).not.toBeNull()
})

test('MESH UPLOADS: no extension-less data-URL mirror; the named estate path lands', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader('data:application/octet-stream;base64,AAA')
  const realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch({ uploadPath: 'data/input/donor.glb' })
  try {
    const { onEdit, cap } = captureProvider({ candidates: [] })
    const host = cap().square(MESH) as { display: string | null; verbs: { onFile: (file: File) => void } }
    host.verbs.onFile(new File(['glTF'], 'donor.glb', { type: 'model/gltf-binary' }))
    await waitFor(() => { expect(onEdit).toHaveBeenCalledWith('rig', 'data/input/donor.glb') })
    expect((cap().square(MESH) as { display: string | null }).display).toBeNull()
  } finally {
    globalThis.FileReader = RealReader
    globalThis.fetch = realFetch
  }
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
  bindMedia([
    { url: 'https://host/a.png', name: 'a' },
    { url: 'data/input/b.txt', name: 'b' },
  ])
  try {
    const onEdit = vi.fn()
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit, loadMedia: fetchMediaLibrary }))
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
    unbindEstateRemote()
  }
})

test('FROM MEDIA: a refused door STATES the refusal (never a stuck spinner, never a fake empty)', async () => {
  // THE CONTRACT CHANGED (2026-09-26), deliberately: this test used to
  // pin "a refused door lists nothing", which is how a broken media
  // list looked identical to an empty one — the mesh picker's
  // `mesh`-vs-`model` refusal shipped as a silently empty picker. The
  // anti-spinner intent is kept; the refusal is now legible.
  bindMedia(undefined, 'media/list refused')
  try {
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {}, loadMedia: fetchMediaLibrary }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    expect(await screen.findByText(/media library unavailable/)).not.toBeNull()
  } finally {
    unbindEstateRemote()
  }
})

test('FROM MEDIA: no injected source degrades to the honest empty (never a hidden fetch)', async () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: unknown) => { seen.push(String(input)); return Response.json({}) }) as typeof fetch
  try {
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {} }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    // the degrade law: absent loadMedia = empty rows immediately (no
    // loading spinner, no transport of the base's own)
    expect(screen.getByText('nothing to pick yet')).not.toBeNull()
    expect(seen.length).toBe(0)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FROM MEDIA: the picker closes without writing (never a stray pick)', async () => {
  bindMedia([])
  try {
    render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: () => {}, loadMedia: fetchMediaLibrary }))
    fireEvent.click(screen.getByRole('button', { name: 'Input source' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
    await screen.findByText('nothing to pick yet')
    fireEvent.click(screen.getByRole('button', { name: 'Close picker' }))
    expect(screen.queryByText('From media')).toBeNull()
  } finally {
    unbindEstateRemote()
  }
})

function providerFileInput(): HTMLInputElement {
  const all = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[] // same DOM-without-Iterable read as the axes wall
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
    { fake: fakeFetch({ uploadThrow: 'boom' }), message: 'boom' },
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
      // THE LAW (the operator burn, 2026-10-24: "two image references
      // go in"): a failed upload renders a refusal FACE under the
      // square and NEVER calls onEdit — the stack gains no phantom
      // reference beside the retry's real path.
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toBe(c.message)
      })
      expect(onEdit).not.toHaveBeenCalled()
      r.unmount()
    } finally {
      globalThis.fetch = realFetch
    }
  }
  globalThis.FileReader = RealReader
})

test('THE REFUSAL FACE: a refusal CLEARS on the next successful upload (one retry, one value)', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const realFetch = globalThis.fetch
  let refuse = true
  globalThis.fetch = (async (input: unknown) => {
    if (String(input) === '/v1/uploads') {
      if (refuse) { refuse = false; return new Response('no', { status: 500 }) }
      return Response.json({ path: 'data/input/a.png' })
    }
    throw new Error('unexpected fetch ' + String(input))
  }) as typeof fetch
  try {
    const onEdit = vi.fn()
    const r = render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit }))
    const box = screen.getByRole('button', { name: 'Input source' })
    fireEvent.drop(box, { dataTransfer: { getData: () => '', files: [png()] } })
    await waitFor(() => { expect(screen.getByRole('alert')).toBeTruthy() })
    // the retry: the door answers, the face dies, exactly ONE value
    fireEvent.drop(box, { dataTransfer: { getData: () => '', files: [png()] } })
    await waitFor(() => { expect(onEdit).toHaveBeenCalledTimes(1) })
    expect(onEdit).toHaveBeenCalledWith('data/input/a.png')
    expect(screen.queryByRole('alert')).toBeNull()
    r.unmount()
  } finally {
    globalThis.fetch = realFetch
    globalThis.FileReader = RealReader
  }
})

test('THE MIRROR DIES WITH THE COMMIT (one upload, one visible reference — the add-cell never keeps the preview)', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: unknown) => {
    if (String(input) === '/v1/uploads') return Response.json({ path: 'data/input/a.png' })
    throw new Error('unexpected fetch ' + String(input))
  }) as typeof fetch
  try {
    const onEdit = vi.fn()
    const r = render(h(SourceRow, { label: 'Add', kind: 'image', value: null, onEdit }))
    const box = screen.getByRole('button', { name: 'Add source' })
    // mid-flight the data-URL mirror is the square's face (the only
    // preview a not-yet-committed pick can have)
    fireEvent.drop(box, { dataTransfer: { getData: () => '', files: [png()] } })
    await waitFor(() => { expect(onEdit).toHaveBeenCalledTimes(1) })
    expect(onEdit).toHaveBeenCalledWith('data/input/a.png')
    // after the commit the mirror MUST be gone: the stack's new
    // entry owns the only thumbnail, and this empty cell goes back
    // to empty — an uncleaned mirror rendered a SECOND image
    // reference beside the entry (cured only by a refresh, the
    // operator's "two image references go in", 2026-10-24)
    const thumbs = box.querySelectorAll('img')
    expect(thumbs.length).toBe(0)
    r.unmount()
  } finally {
    globalThis.fetch = realFetch
    globalThis.FileReader = RealReader
  }
})

test('THE UPLOAD: wrong kinds refuse AT THE FACE (audio has no door; text is not media)', async () => {
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
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('no door yet')
    })
    expect(onEdit).not.toHaveBeenCalled()
    r.unmount()
    const onEdit2 = vi.fn()
    const r2 = render(h(SourceRow, { label: 'Input', kind: 'image', value: null, onEdit: onEdit2 }))
    fireEvent.drop(screen.getByRole('button', { name: 'Input source' }), {
      dataTransfer: { getData: () => '', files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('drop an image, audio, or .glb/.gltf file')
    })
    expect(onEdit2).not.toHaveBeenCalled()
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

test('FROM MEDIA: a file field asks for the whole library (accept narrows client-side per row)', async () => {
  const seen: string[] = []
  const loadMedia = async (kind: string, _signal: AbortSignal): Promise<Array<{ url: string; name: string }>> => {
    seen.push(kind)
    return []
  }
  render(h(SourceRow, { label: 'Doc', kind: 'file', value: null, onEdit: () => {}, loadMedia }))
  fireEvent.click(screen.getByRole('button', { name: 'Doc source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  await screen.findByText('The runs library')
  expect(seen).toEqual(['all'])
})

// THE CONSTRUCTOR THREAD (form.tsx — the loadMedia seam): a wire
// carrying loadMedia seats it through the constructor into the mod
// section's leaves (the defined arm) — the leaf's media pick rides
// the one lane end to end.
test('CARDFORM THREAD: wire.loadMedia seats into the mod leaf — the served row lands on save', async () => {
  bindMedia([{ url: 'https://host/m.png', name: 'the mask' }])
  try {
    const spec = {
      form: 'masker', model: 'k', schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } },
      inputs: [], packs: [],
      features: {
        modifiers: [{
          kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
          fields: [
            { name: 'image', type: 'image', label: 'Image' },
            { name: 'feather', type: 'number', label: 'Feather', default: 5 },
          ],
        }],
      },
    } as unknown as FormSpecDoc
    const onSet = vi.fn()
    render(h(CardForm, {
      spec, user: {}, onSet, onPick: () => {}, onUnset: () => {},
      wire: { candidates: [], loadMedia: fetchMediaLibrary },
    }))
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mask' }))
    fireEvent.click(screen.getByRole('button', { name: 'Image source' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'From media' }))
    const pick = await screen.findByTestId('source-pick-row')
    expect(pick.textContent).toContain('the mask')
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onSet).toHaveBeenCalledWith('masks', [expect.objectContaining({ image: 'https://host/m.png' })])
  } finally {
    unbindEstateRemote()
  }
})
