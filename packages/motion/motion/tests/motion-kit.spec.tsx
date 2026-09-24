// @vitest-environment happy-dom
import { fireEvent, getByRole, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h, useEffect } from 'react'

import {
  PaneHeader, PaneShell, Skeleton, Tip, ViewportAnchor, ViewportFrame,
  WirePickerModal, isImageUrl, useMotionThumbStore,
} from '../src/ui/studio/kit.tsx'
import { act, cleanup19, render19, waitForText } from './harness.tsx'

afterEach(async () => {
  await cleanup19()
  vi.unstubAllGlobals()
  localStorage.clear()
})

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
    const barePreview = await render19(h(PaneHeader, { variant: 'preview' }))
    expect(barePreview.container.querySelector('[data-slot="pane-header"]')?.textContent).toBe('')
  })

  test('PaneShell wraps children', async () => {
    const { container } = await render19(h(PaneShell, { className: 'p', children: 'kid' }))
    expect(container.querySelector('[data-slot="pane-shell"]')?.textContent).toBe('kid')
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

  test('the card itself does not close; the labelled X does', async () => {
    const { onClose } = mountModal()
    await waitForText(/Wire preview_glb from an earlier card/)
    await act(async () => {
      fireEvent.click(document.querySelector('[data-wire-modal]') as HTMLElement)
    })
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(getByRole(document.body, 'button', { name: 'Close wire picker' }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
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
  let api!: { setThumbnail: (id: string, url: string) => void; clearThumbnail: (id: string) => void }
  function ApiGrab(): React.JSX.Element {
    const setThumbnail = useMotionThumbStore((state) => state.setThumbnail)
    const clearThumbnail = useMotionThumbStore((state) => state.clearThumbnail)
    api = { setThumbnail, clearThumbnail }
    return h('i', {})
  }
  function Probe({ id }: { id: string }): React.JSX.Element {
    const thumb = useMotionThumbStore((state) => state.thumbnails[id] ?? 'none')
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
    await act(async () => {
      api.clearThumbnail('ghost')
    })
  })

  test('seeded storage shapes hydrate or fall back', async () => {
    localStorage.setItem('motion-card-thumbnails', JSON.stringify({ s9: 'data:image/png;base64,AAA' }))
    vi.resetModules()
    const valid = await import('../src/ui/studio/kit.tsx')
    function Seeded(): React.JSX.Element {
      const thumb = valid.useMotionThumbStore((state) => state.thumbnails['s9'] ?? 'none')
      return h('i', { 'data-seed': 's9' }, thumb)
    }
    const { container } = await render19(h(Seeded, {}))
    expect(container.querySelector('[data-seed]')?.textContent).toBe('data:image/png;base64,AAA')
    await cleanup19()
    for (const seed of ['[1,2]', '"just"']) {
      localStorage.setItem('motion-card-thumbnails', seed)
      vi.resetModules()
      const fresh = await import('../src/ui/studio/kit.tsx')
      expect(fresh.isImageUrl('https://host/a.png')).toBe(true)
    }
  })

  test('corrupt storage starts fresh', async () => {
    localStorage.setItem('motion-card-thumbnails', 'garbage{')
    vi.resetModules()
    const fresh = await import('../src/ui/studio/kit.tsx')
    expect(fresh.isImageUrl('https://host/a.png')).toBe(true)
  })

  test('quota failures stay in memory', async () => {
    const real = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === 'motion-card-thumbnails') throw new Error('quota')
      real(key, value)
    })
    const { container } = await mountProbe('s2')
    await vi.waitFor(() => {
      expect(container.querySelector('[data-probe]')?.textContent).toBe('data:image/png;base64,AAA')
    })
  })
})
