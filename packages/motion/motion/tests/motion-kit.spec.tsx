// @vitest-environment happy-dom
/**
 * motion kit — isImageUrl, Tip, Skeleton, ViewportAnchor, ViewportFrame,
 * PaneHeader/PaneShell, SlotSquare (verbatim drop logic), the wire
 * picker, and the zustand-free thumbnail store. Renders through the
 * lane's React-19-pure harness (see tests/harness.tsx for why RTL's
 * own renderer cannot run here); gestures ride @testing-library/dom's
 * fireEvent inside act, role queries bind a container at a time.
 */
import {
  createEvent, fireEvent, getByLabelText, getByRole, queryByText,
} from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h, useEffect } from 'react'

import {
  ASSET_DRAG_MIME, PaneHeader, PaneShell, Skeleton, SlotSquare, Tip,
  ViewportAnchor, ViewportFrame, WirePickerModal, isImageUrl, useMotionThumbStore,
} from '../src/ui/studio/kit.tsx'
import { act, cleanup19, render19, waitForText } from './harness.tsx'

afterEach(async () => {
  await cleanup19()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function dt(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    getData: (_t: string) => '',
    files: [],
    types: [],
    ...over,
  }
}

function dropOn(node: Element, data: Record<string, unknown>): void {
  const ev = createEvent.drop(node)
  Object.defineProperty(ev, 'dataTransfer', { value: data })
  fireEvent(node, ev)
}

describe('isImageUrl', () => {
  test('the thumbnail rule', () => {
    expect(isImageUrl('data:image/png;base64,AAA')).toBe(true)
    expect(isImageUrl('blob:https://host/x')).toBe(true)
    expect(isImageUrl('https://host/a.png')).toBe(true)
    expect(isImageUrl('https://host/a.jpg?v=2')).toBe(true)
    expect(isImageUrl('/v1/assets/inputs/3.webp')).toBe(true)
    expect(isImageUrl('data/input/mine.glb')).toBe(false)
    expect(isImageUrl('https://host/b.glb')).toBe(false)
    expect(isImageUrl('')).toBe(false)
    expect(isImageUrl('not a url')).toBe(false)
  })
})

describe('chrome atoms', () => {
  test('Tip without a tip renders children bare', async () => {
    const { container } = await render19(h(Tip, { children: h('b', {}, 'raw') }))
    expect(container.querySelector('b')?.textContent).toBe('raw')
  })

  test('Tip with a tip keeps the child mounted', async () => {
    const { container } = await render19(h(Tip, { tip: 'hello', children: h('b', {}, 'raw') }))
    expect(container.querySelector('b')?.textContent).toBe('raw')
  })

  test('Skeleton carries the slot hook', async () => {
    const { container } = await render19(h(Skeleton, { className: 'x' }))
    const el = container.querySelector('[data-slot="skeleton"]') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.className).toContain('x')
  })

  test('ViewportAnchor docks by name, top-right by default', async () => {
    const { container } = await render19(h(ViewportAnchor, { dock: 'bottom-center' }, 'c'))
    const el = container.querySelector('[data-slot="viewport-anchor"]') as HTMLElement
    expect(el.dataset.dock).toBe('bottom-center')
    await cleanup19()
    const second = await render19(h(ViewportAnchor, {}, 'c'))
    expect((second.container.querySelector('[data-slot="viewport-anchor"]') as HTMLElement).dataset.dock)
      .toBe('top-right')
  })

  test('ViewportFrame labels, empties, and forwards the ref', async () => {
    const ref = { current: null as HTMLDivElement | null }
    const { container } = await render19(
      h(ViewportFrame, { label: 'stage', empty: h('i', {}, 'nothing'), ref }, 'kid'),
    )
    const frame = container.querySelector('[data-slot="viewport-frame"]') as HTMLElement
    expect(frame.getAttribute('aria-label')).toBe('stage')
    expect(frame.textContent).toContain('nothing')
    expect(ref.current).toBe(frame)
  })

  test('PaneHeader strip vs preview, nulls stay out', async () => {
    const { container } = await render19(h(PaneHeader, { title: 'T', meta: 'M', hint: 'H' }))
    const head = container.querySelector('[data-slot="pane-header"]') as HTMLElement
    expect(head.dataset.variant).toBe('strip')
    expect(head.textContent).toContain('TMH')
    await cleanup19()
    const bare = await render19(h(PaneHeader, {}))
    expect(bare.container.querySelector('[data-slot="pane-header"]')?.textContent).toBe('')
    await cleanup19()
    const preview = await render19(h(PaneHeader, { variant: 'preview', title: 'T', meta: 'M' }))
    expect((preview.container.querySelector('[data-slot="pane-header"]') as HTMLElement).dataset.variant)
      .toBe('preview')
    await cleanup19()
    // null title/meta stay out of the preview row too
    const barePreview = await render19(h(PaneHeader, { variant: 'preview' }))
    expect(barePreview.container.querySelector('[data-slot="pane-header"]')?.textContent).toBe('')
  })

  test('PaneShell wraps children', async () => {
    const { container } = await render19(h(PaneShell, { className: 'p', children: 'kid' }))
    expect(container.querySelector('[data-slot="pane-shell"]')?.textContent).toBe('kid')
  })
})

describe('SlotSquare', () => {
  test('empty, image, and url values', async () => {
    const { container } = await render19(h(SlotSquare, { label: 'in' }))
    expect(container.querySelector('[data-slot-square]')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
    await cleanup19()
    const img = await render19(h(SlotSquare, { label: 'in', value: 'https://host/a.png' }))
    expect((img.container.querySelector('img') as HTMLImageElement).src).toContain('https://host/a.png')
    await cleanup19()
    const url = await render19(h(SlotSquare, { label: 'in', value: 'data:application/octet-stream;base64,AAAA' }))
    expect(url.container.textContent).toContain('data:applicatio')
    await cleanup19()
    const path = await render19(h(SlotSquare, { label: 'in', value: 'data/input/mine.glb' }))
    expect(path.container.textContent).toContain('mine.glb')
  })

  test('custom empty icon and the sm scale', async () => {
    const { container } = await render19(
      h(SlotSquare, { label: 'in', size: 'sm', emptyIcon: h('em', {}, 'E') }),
    )
    expect(container.querySelector('em')?.textContent).toBe('E')
    await cleanup19()
    // the default glyph at the sm scale (the inner size ternary)
    const bare = await render19(h(SlotSquare, { label: 'in', size: 'sm' }))
    expect(bare.container.querySelector('[data-slot-square] svg')).not.toBeNull()
    await cleanup19()
    // enabled actions ride the overlay
    const wired = await render19(
      h(SlotSquare, { label: 'in', actions: h('b', {}, 'A') }),
    )
    expect(wired.container.querySelector('b')?.textContent).toBe('A')
  })

  test('badge string, badge node, metric', async () => {
    const { container } = await render19(
      h(SlotSquare, { label: 'in', badge: 'wired', metric: '12f' }),
    )
    expect(container.textContent).toContain('wired')
    expect(container.textContent).toContain('12f')
    await cleanup19()
    const node = await render19(h(SlotSquare, { label: 'in', badge: h('b', {}, 'B') }))
    expect(node.container.querySelector('b')?.textContent).toBe('B')
  })

  test('Detach fires without tripping the square click', async () => {
    const onClear = vi.fn()
    const onClick = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'in', value: 'https://host/a.png', onClear, onClick }),
    )
    await act(async () => {
      fireEvent.click(getByRole(container, 'button', { name: 'Detach' }))
    })
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('the square click is void while disabled', async () => {
    const onClick = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'in', onClick, disabled: true }),
    )
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot-square]') as HTMLElement)
    })
    expect(onClick).not.toHaveBeenCalled()
  })

  test('actions hide while disabled', async () => {
    const { container } = await render19(
      h(SlotSquare, { label: 'in', actions: h('b', {}, 'A'), disabled: true }),
    )
    expect(container.querySelector('b')).toBeNull()
  })

  test('pick button opens the hidden input; change carries the file', async () => {
    const onPickFile = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'photo', onPickFile }),
    )
    const clicks: string[] = []
    const input = container.querySelector('[data-slot-input]') as HTMLInputElement
    input.click = () => { clicks.push('open') }
    await act(async () => {
      fireEvent.click(getByLabelText(container, 'Pick a file for photo'))
    })
    expect(clicks).toEqual(['open'])
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => {
      fireEvent.change(input)
    })
    expect(onPickFile).toHaveBeenCalledWith(file)
  })

  test('change with no file just clears', async () => {
    const onPickFile = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'photo', onPickFile }),
    )
    const input = container.querySelector('[data-slot-input]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [], configurable: true })
    await act(async () => {
      fireEvent.change(input)
    })
    expect(onPickFile).not.toHaveBeenCalled()
  })

  test('asset drop wins; malformed payload falls through to the file', async () => {
    const onDropAsset = vi.fn()
    const onDropFile = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'in', onDropAsset, onDropFile }),
    )
    const square = container.querySelector('[data-slot-square]') as HTMLElement
    await act(async () => {
      dropOn(square, dt({
        getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: 'https://host/a.glb' }) : ''),
        types: [ASSET_DRAG_MIME],
      }))
    })
    expect(onDropAsset).toHaveBeenCalledWith('https://host/a.glb')
    expect(onDropFile).not.toHaveBeenCalled()
    await act(async () => {
      const file = new File(['x'], 'b.glb')
      dropOn(square, dt({
        getData: () => 'garbage{',
        files: [file],
        types: [ASSET_DRAG_MIME, 'Files'],
      }))
    })
    expect(onDropFile).toHaveBeenCalledTimes(1)
  })

  test('asset payloads without a url fall through; url-less drops stay quiet', async () => {
    const onDropAsset = vi.fn()
    const onDropFile = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'in', onDropAsset, onDropFile }),
    )
    const square = container.querySelector('[data-slot-square]') as HTMLElement
    const file = new File(['x'], 'c.glb')
    await act(async () => {
      dropOn(square, dt({
        getData: () => JSON.stringify({ nope: 1 }),
        files: [file],
        types: [ASSET_DRAG_MIME],
      }))
    })
    expect(onDropAsset).not.toHaveBeenCalled()
    expect(onDropFile).toHaveBeenCalledWith(file)
    await act(async () => {
      dropOn(square, dt({ files: [], types: ['Files'] }))
    })
    expect(onDropFile).toHaveBeenCalledTimes(1)
  })

  test('drops die while disabled, even with a payload', async () => {
    const onDropFile = vi.fn()
    const { container } = await render19(
      h(SlotSquare, { label: 'in', onDropFile, disabled: true }),
    )
    const square = container.querySelector('[data-slot-square]') as HTMLElement
    await act(async () => {
      dropOn(square, dt({ files: [new File(['x'], 'd.glb')], types: ['Files'] }))
    })
    expect(onDropFile).not.toHaveBeenCalled()
  })

  test('dragover highlights asset/files types only; leave cools', async () => {
    const { container } = await render19(h(SlotSquare, { label: 'in', onDropFile: () => {} }))
    const square = container.querySelector('[data-slot-square]') as HTMLElement
    const over = (types: string[]): boolean => {
      const ev = createEvent.dragOver(square)
      Object.defineProperty(ev, 'dataTransfer', { value: dt({ types }) })
      let dead = false
      ev.preventDefault = () => { dead = true }
      fireEvent(square, ev)
      return dead
    }
    await act(async () => { expect(over(['Files'])).toBe(true) })
    await act(async () => { expect(over(['text/plain'])).toBe(false) })
    await act(async () => {
      fireEvent(square, new Event('dragleave', { bubbles: true }))
    })
  })

  test('dragover dies while disabled', async () => {
    const { container } = await render19(
      h(SlotSquare, { label: 'in', onDropFile: () => {}, disabled: true }),
    )
    const square = container.querySelector('[data-slot-square]') as HTMLElement
    await act(async () => {
      const ev = createEvent.dragOver(square)
      Object.defineProperty(ev, 'dataTransfer', { value: dt({ types: ['Files'] }) })
      let dead = false
      ev.preventDefault = () => { dead = true }
      fireEvent(square, ev)
      expect(dead).toBe(false)
    })
  })
})

describe('WirePickerModal', () => {
  const prior = (over: Record<string, unknown> = {}): Array<Record<string, unknown>> => ([
    {
      id: 'u1', title: 'Up One',
      result: { artifacts: { mesh: 'https://host/m.glb' }, assetUrls: ['https://host/m.glb'], metadata: {} },
      ...over,
    },
  ])

  function mountModal(over: Record<string, unknown> = {}): Record<string, ReturnType<typeof vi.fn>> {
    const onPick = vi.fn()
    const onUnwire = vi.fn()
    const onClose = vi.fn()
    void render19(h(WirePickerModal, {
      slot: 'preview_glb', priorStages: prior() as never, onPick, onUnwire, onClose, ...over,
    }))
    return { onPick, onUnwire, onClose }
  }

  test('scrim and X close; the card itself does not', async () => {
    const { onClose } = mountModal()
    await waitForText(/Wire preview_glb from an earlier card/)
    await act(async () => {
      fireEvent.click(document.querySelector('[data-wire-modal]') as HTMLElement)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    await cleanup19()
    const second = mountModal()
    await waitForText(/Wire preview_glb from an earlier card/)
    await act(async () => {
      const card = document.querySelector('[data-wire-modal] > div') as HTMLElement
      fireEvent.click(card)
    })
    expect(second.onClose).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(getByRole(document.body, 'button', { name: 'Close wire picker' }))
    })
    expect(second.onClose).toHaveBeenCalledTimes(1)
  })

  test('unwire shows only while wired', async () => {
    mountModal()
    await waitForText(/Wire preview_glb/)
    expect(queryByText(document.body, /Unwire/)).toBeNull()
    await cleanup19()
    const { onUnwire } = mountModal({ currentId: 'u1' })
    await waitForText(/Unwire/)
    await act(async () => {
      fireEvent.click(document.querySelector('[data-wire-unwire]') as HTMLElement)
    })
    expect(onUnwire).toHaveBeenCalledTimes(1)
  })

  test('empty priors stay honest', async () => {
    mountModal({ priorStages: [] })
    await waitForText(/No earlier cards yet/)
  })

  test('single-output rows pick the primary; thumbs show for images', async () => {
    const { onPick } = mountModal()
    await waitForText(/Up One/)
    const option = document.querySelector('[data-wire-option="primary"]') as HTMLElement
    expect(option.textContent).toContain('01')
    expect(option.querySelector('img')).toBeNull()
    await act(async () => {
      fireEvent.click(option)
    })
    expect(onPick).toHaveBeenCalledWith('u1', null)
  })

  test('image thumbs render; missing results read not-run', async () => {
    mountModal({
      priorStages: [
        { id: 'u1', title: 'Pic', result: { artifacts: {}, assetUrls: ['https://host/p.png'], metadata: {} } },
        { id: 'u2', title: 'Fresh', result: null },
        { id: 'u3', title: 'Bare', result: { artifacts: {}, assetUrls: [], metadata: {} } },
      ] as never,
    })
    await waitForText(/Up One|Pic/)
    expect(document.querySelector('[data-wire-option="primary"] img')).not.toBeNull()
    await waitForText(/not run yet/)
    await waitForText(/no artifacts/)
  })

  test('multi-artifact stages fan out with the wired badge', async () => {
    const { onPick } = mountModal({
      priorStages: [{
        id: 'u1', title: 'Up One',
        result: { artifacts: { a: 'https://host/a.glb', b: 'https://host/b.glb' }, assetUrls: [], metadata: {} },
      }] as never,
      currentId: 'u1',
      currentOutput: 'b',
    })
    await waitForText(/Up One/)
    expect(document.querySelector('[data-wire-option="a"]')).not.toBeNull()
    const b = document.querySelector('[data-wire-option="b"]') as HTMLElement
    expect(b.textContent).toContain('wired')
    expect(b.textContent).toContain('01')
    await act(async () => {
      fireEvent.click(document.querySelector('[data-wire-option="a"]') as HTMLElement)
    })
    expect(onPick).toHaveBeenCalledWith('u1', 'a')
  })

  test('a null output matches the primary row', async () => {
    mountModal({ currentId: 'u1', currentOutput: null })
    await waitForText(/wired/)
  })
})

describe('useMotionThumbStore', () => {
  // the store fns are module-stable — grab them at render (no loop)
  let api!: { setThumbnail: (id: string, url: string) => void; clearThumbnail: (id: string) => void }
  function ApiGrab(): React.JSX.Element {
    const setThumbnail = useMotionThumbStore((s) => s.setThumbnail)
    const clearThumbnail = useMotionThumbStore((s) => s.clearThumbnail)
    api = { setThumbnail, clearThumbnail }
    return h('i', {})
  }
  function Probe({ id }: { id: string }): React.JSX.Element {
    const thumb = useMotionThumbStore((s) => s.thumbnails[id] ?? 'none')
    useEffect(() => {
      api.setThumbnail(id, 'data:image/png;base64,AAA')
    }, [id])
    return h('i', { 'data-probe': id }, thumb)
  }
  async function mountProbe(id: string): Promise<{ container: HTMLElement }> {
    const { container } = await render19(h('div', {}, h(ApiGrab, {}), h(Probe, { id })))
    return { container }
  }

  test('set publishes; clear retracts; strangers stay none', async () => {
    const { container } = await mountProbe('s1')
    await vi.waitFor(() => {
      expect(container.querySelector('[data-probe]')?.textContent).toBe('data:image/png;base64,AAA')
    })
    expect(localStorage.getItem('motion-card-thumbnails')).toContain('s1')
    await act(async () => {
      api.clearThumbnail('s1')
    })
    await vi.waitFor(() => {
      expect(container.querySelector('[data-probe]')?.textContent).toBe('none')
    })
    // clearing a stranger is a silent no-op
    await act(async () => {
      api.clearThumbnail('ghost')
    })
  })

  test('seeded storage shapes hydrate or fall back', async () => {
    // a valid object hydrates the fresh module's snapshot
    localStorage.setItem('motion-card-thumbnails', JSON.stringify({ s9: 'data:image/png;base64,AAA' }))
    vi.resetModules()
    const valid = await import('../src/ui/studio/kit.tsx')
    function Seeded(): React.JSX.Element {
      const thumb = valid.useMotionThumbStore((s) => s.thumbnails['s9'] ?? 'none')
      return h('i', { 'data-seed': 's9' }, thumb)
    }
    const { container } = await render19(h(Seeded, {}))
    expect(container.querySelector('[data-seed]')?.textContent).toBe('data:image/png;base64,AAA')
    await cleanup19()
    // arrays and bare strings are not maps — start fresh
    for (const seed of ['[1,2]', '"just"']) {
      localStorage.setItem('motion-card-thumbnails', seed)
      vi.resetModules()
      const fresh = await import('../src/ui/studio/kit.tsx')
      expect(fresh.isImageUrl('https://host/a.png')).toBe(true)
    }
  })

  test('corrupt storage starts fresh', async () => {
    // a fresh module evaluation against seeded storage (the static
    // module evaluated once at import against an empty store)
    localStorage.setItem('motion-card-thumbnails', 'garbage{')
    vi.resetModules()
    const fresh = await import('../src/ui/studio/kit.tsx')
    expect(fresh.isImageUrl('https://host/a.png')).toBe(true)
  })

  test('quota failures stay in memory', async () => {
    const real = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((k: string, v: string) => {
      if (k === 'motion-card-thumbnails') throw new Error('quota')
      real(k, v)
    })
    const { container } = await mountProbe('s2')
    await vi.waitFor(() => {
      expect(container.querySelector('[data-probe]')?.textContent).toBe('data:image/png;base64,AAA')
    })
  })
})
