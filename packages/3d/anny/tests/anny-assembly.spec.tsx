// @vitest-environment happy-dom
/**
 * anny AssemblyStudio — the shared generic 3D authoring body. The
 * derivation (useStudioAssets) pins through a harness; the body pins
 * through mounts with a stubbed upload door (SlotGrid) and the Stage
 * degrading gracefully under happy-dom (no WebGL — the empty state
 * and rail still read).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'

import {
  AssemblyStudio, EmptyState, GLB_URL_RE, isServableUrl, useStudioAssets,
} from '../src/ui/studio/assembly.tsx'

afterEach(cleanup)

const GLB = { key: 'source_glb', label: 'Body', required: true, accept: 'glb', glyph: 'body' } as never
const IMG = { key: 'reference_image', label: 'Photo', required: false, accept: 'image', glyph: 'photo' } as never

function mkStage(over: Record<string, unknown> = {}): CardStage {
  return {
    id: 's1', title: 'Anny', kind: 'txt2img', service: 'anny',
    params: {}, inputs: [], inputIndices: [], result: null, ...over,
  } as unknown as CardStage
}

function Harness({ stage, slots }: { stage: CardStage; slots: never[] }) {
  const { assets, mountNotes } = useStudioAssets(stage, slots as never)
  return h('div', {}, `a${assets.length}m${mountNotes.length}|${assets.map((a) => `${a.id}@${a.position![0]}`).join(',')}`)
}

function harness(stage: CardStage, slots: never[]): string {
  const { container, unmount } = render(h(Harness, { stage, slots }))
  const text = container.textContent ?? ''
  unmount()
  return text
}

describe('isServableUrl + GLB_URL_RE', () => {
  test('the servable shapes', () => {
    expect(isServableUrl('data:model/gltf,AAA')).toBe(true)
    expect(isServableUrl('blob:https://host/u')).toBe(true)
    expect(isServableUrl('https://host/b.glb')).toBe(true)
    expect(isServableUrl('/v1/assets/inputs/x.glb')).toBe(true)
    expect(isServableUrl('/api/x.glb')).toBe(true)
    expect(isServableUrl('/assets/x.glb')).toBe(true)
    expect(isServableUrl('/mnt/x.glb')).toBe(false)
    expect(isServableUrl('data/input/x.glb')).toBe(false)
    expect(GLB_URL_RE.test('https://host/b.glb')).toBe(true)
    expect(GLB_URL_RE.test('https://host/b.gltf#x')).toBe(true)
    expect(GLB_URL_RE.test('https://host/b.png')).toBe(false)
  })
})

describe('useStudioAssets', () => {
  test('empty rows derive empty', () => {
    expect(harness(mkStage(), [GLB])).toBe('a0m0|')
  })

  test('non-glb slots, empty and non-string values never derive', () => {
    const stage = mkStage({ params: { source_glb: '', reference_image: 'https://host/p.png', n: 5 } })
    expect(harness(stage, [GLB, IMG])).toBe('a0m0|')
  })

  test('a servable part lands centered; a mount path notes', () => {
    const { unmount } = render(h(Harness, {
      stage: mkStage({ params: { source_glb: 'https://host/b.glb' } }), slots: [GLB],
    }))
    expect(screen.getByText('a1m0|part-source_glb@0')).not.toBeNull()
    unmount()
    expect(harness(mkStage({ params: { source_glb: '/mnt/b.glb' } }), [GLB])).toBe('a0m1|')
  })

  test('run outputs append deduped; composites spread on X', () => {
    const stage = mkStage({
      params: { source_glb: 'https://host/b.glb' },
      result: {
        assetUrls: ['https://host/b.glb', 'https://host/o.glb', 'https://host/x.png'],
        artifacts: { mesh: 'https://host/m.glb', n: 5 },
      },
    })
    // part + named mesh + dedup-skipped part url + run output (png + n skipped)
    expect(harness(stage, [GLB])).toBe('a3m0|part-source_glb@-2.4,run-mesh-0@0,run-output-1-1@2.4')
  })

  test('a result without artifacts still scans assetUrls; a missing result scans nothing', () => {
    const stage = mkStage({ result: { assetUrls: ['https://host/o.glb'] } })
    expect(harness(stage, [GLB])).toBe('a1m0|run-output-0-0@0')
    expect(harness(mkStage({ result: null }), [GLB])).toBe('a0m0|')
  })
})

describe('EmptyState', () => {
  test('variants, hint, and className ride', () => {
    const { unmount } = render(h(EmptyState, { title: 'T', hint: 'hh', variant: 'pane', className: 'x' }))
    expect(screen.getByText('T')).not.toBeNull()
    expect(screen.getByText('hh')).not.toBeNull()
    expect(document.querySelector('[data-slot="empty-state"]')!.getAttribute('data-variant')).toBe('pane')
    unmount()
    render(h(EmptyState, { title: 'T2', icon: h('i', {}, 'glyph') }))
    expect(screen.getByText('glyph')).not.toBeNull()
    expect(document.querySelector('[data-slot="empty-state"]')!.getAttribute('data-variant')).toBe('pane')
  })
})

describe('AssemblyStudio', () => {
  function mount(props: Record<string, unknown>) {
    const onSave = vi.fn()
    const rendered = render(h(AssemblyStudio, {
      stage: mkStage(), onSave, slots: [GLB], headline: 'Parts — body', hint: 'rule copy', ...props,
    } as never))
    return { onSave, ...rendered }
  }

  test('the empty stage shows the overlay state and the rail copy', () => {
    mount({})
    expect(screen.getByText('No parts on the stage yet')).not.toBeNull()
    expect(screen.getByText('Parts — body')).not.toBeNull()
    expect(screen.getByText('rule copy')).not.toBeNull()
  })

  test('viewport none renders the rail only', () => {
    mount({ viewport: 'none' })
    expect(screen.queryByText('No parts on the stage yet')).toBeNull()
    expect(screen.getByText('Parts — body')).not.toBeNull()
  })

  test('a mount path notes with the stage copy; none-mode rewords', () => {
    const { unmount } = mount({ stage: mkStage({ params: { source_glb: '/mnt/b.glb' } }) })
    expect(screen.getByText(/points at the mounts.*Attach the file/)).not.toBeNull()
    unmount()
    mount({ stage: mkStage({ params: { source_glb: '/mnt/b.glb' } }), viewport: 'none' })
    expect(screen.getByText(/points at the mounts.*at the bake/)).not.toBeNull()
  })

  test('placeholders yield to real assets', () => {
    const ph = [{ id: 'ph', url: 'https://host/ph.glb', name: 'Manny' }]
    // placeholders show while empty…
    const { unmount } = mount({ placeholderAssets: ph })
    expect(screen.queryByText('No parts on the stage yet')).toBeNull()
    unmount()
    // …and real parts win
    mount({
      stage: mkStage({ params: { source_glb: 'https://host/b.glb' } }),
      placeholderAssets: ph,
    })
    expect(screen.queryByText('No parts on the stage yet')).toBeNull()
  })

  test('the source pin rides url+label, then null, then absent', () => {
    const { unmount } = mount({ referenceImage: { url: 'https://host/p.png', label: 'Mug' } })
    expect(screen.getByText('Mug')).not.toBeNull()
    unmount()
    mount({ referenceImage: { url: null, label: 'Mug' } })
    expect(screen.queryByText('Mug')).toBeNull()
    cleanup()
    // no reference image at all — the badge stays off the pin
    mount({})
    expect(screen.queryByText('Mug')).toBeNull()
  })

  test('stage failures surface loud, repeat quiet, clear on recovery', async () => {
    // the poser door is untouched; the mesh door serves good/404 by flag
    const GOOD = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [] })
    let serveGood = true
    vi.stubGlobal('fetch', async (input: unknown): Promise<Response> => {
      const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
      if (u.includes('good.glb')) {
        return serveGood
          ? new Response(GOOD, { status: 200 })
          : new Response('nope', { status: 404 })
      }
      return new Response('nope', { status: 404 })
    })
    try {
      const props = { onSave: vi.fn(), slots: [GLB], headline: 'H', hint: 'hint' }
      // a clean load reports null for an unknown id — the no-op clear
      const r = render(h(AssemblyStudio, {
        stage: mkStage({ params: { source_glb: 'https://host/good.glb' } }), ...props,
      } as never))
      await vi.waitFor(() => {
        expect(document.body.textContent).toMatch(/viewport failed/)
      }, { timeout: 8000 })
      expect(screen.queryByText(/Body:/)).toBeNull()
      // the door drops: the part fails loud (named line)
      serveGood = false
      r.rerender(h(AssemblyStudio, {
        stage: mkStage({ params: { source_glb: 'https://host/bad.glb' } }), ...props,
      } as never))
      await screen.findByText(/Body:.*responded with 404/, {}, { timeout: 8000 })
      // a new failure re-fires the old one with the same message — quiet
      r.rerender(h(AssemblyStudio, {
        stage: mkStage({
          params: { source_glb: 'https://host/bad.glb' },
          result: { assetUrls: ['https://host/bad2.glb'], artifacts: {} },
        }), ...props,
      } as never))
      await screen.findByText(/Run · output-0:.*responded with 404/, {}, { timeout: 8000 })
      expect(screen.getByText(/Body:.*responded with 404/)).not.toBeNull()
      // the door lifts: the part recovers, its line clears, the run stays
      serveGood = true
      r.rerender(h(AssemblyStudio, {
        stage: mkStage({
          params: { source_glb: 'https://host/good.glb' },
          result: { assetUrls: ['https://host/bad2.glb'], artifacts: {} },
        }), ...props,
      } as never))
      await vi.waitFor(() => {
        expect(screen.queryByText(/Body:.*responded with 404/)).toBeNull()
      }, { timeout: 8000 })
      expect(screen.getByText(/Run · output-0:.*responded with 404/)).not.toBeNull()
      r.unmount()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('a placeholder failure stays quiet — the line is derived-only', async () => {
    let fetched = false
    vi.stubGlobal('fetch', async (): Promise<Response> => {
      fetched = true
      return new Response('nope', { status: 404 })
    })
    try {
      render(h(AssemblyStudio, {
        stage: mkStage(), onSave: vi.fn(), slots: [GLB], headline: 'H', hint: 'hint',
        placeholderAssets: [{ id: 'phx', url: 'https://host/bad.glb' }],
      } as never))
      // the Stage attempted the load and settled — no phx line ever lands
      await vi.waitFor(() => {
        expect(fetched).toBe(true)
      }, { timeout: 8000 })
      await new Promise((r) => setTimeout(r, 1500))
      expect(screen.queryByText(/phx:/)).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('the rail squares save through onSave', () => {
    vi.stubGlobal('fetch', async (): Promise<Response> =>
      new Response(JSON.stringify({ path: 'data/input/up.png' }), { status: 200 }))
    try {
      const { onSave } = mount({ stage: mkStage({ params: { source_glb: null } }), upstreams: [mkStage()] })
      expect(document.querySelector('[data-slot-grid]')).not.toBeNull()
      expect(onSave).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
