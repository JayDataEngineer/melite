// motion-image-store.spec.tsx — THE motion render-snapshot cache: publish,
// retract, persist, hydrate, the two degradation arms (a stored value that is
// not a record, a refused write), and the React subscription the collapsed
// motion tile rides.
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import type { BoundStore } from '@melite/catalog/clientStore'
import type { MotionImageState } from '@melite-plugin/motion/ui/viewers/motionImageStore'
import { act, cleanup19, h, render19 } from './harness.tsx'

const KEY = "motion-images"
const STORE = "@melite-plugin/motion/ui/viewers/motionImageStore"

/** A module-fresh copy of the cache: the record is module state, so each arm
 *  re-imports to read the localStorage it will hydrate from. */
async function freshStore(): Promise<BoundStore<MotionImageState>> {
  vi.resetModules()
  const mod = await import(STORE) as { useMotionImageStore: BoundStore<MotionImageState> }
  return mod.useMotionImageStore
}

describe('useMotionImageStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(async () => {
    await cleanup19()
  })

  test('set publishes; clear retracts; strangers stay absent', async () => {
    const store = await freshStore()
    let api!: { set: (id: string, url: string) => void; clear: (id: string) => void }
    function ApiGrab(): React.JSX.Element {
      api = { set: store((state) => state.setImage), clear: store((state) => state.clearImage) }
      return h('i', {})
    }
    function Probe({ id }: { id: string }): React.JSX.Element {
      const src = store((state) => state.images[id] ?? 'none')
      return h('i', { 'data-probe': id }, src)
    }
    const { container } = await render19(h('div', {}, h(ApiGrab, {}), h(Probe, { id: 's1' })))
    await act(async () => {
      api.set('s1', 'data:image/png;base64,AAA')
    })
    expect(container.querySelector('[data-probe]')?.textContent).toBe('data:image/png;base64,AAA')
    await act(async () => {
      api.clear('s1')
    })
    expect(container.querySelector('[data-probe]')?.textContent).toBe('none')
    api.clear('ghost')
    expect(store.getState().images['ghost']).toBeUndefined()
  })

  test('notifies subscribers until unsubscribe', async () => {
    const store = await freshStore()
    const seen: string[] = []
    const unsub = store.subscribe(() => seen.push(store.getState().images['s1'] ?? '-'))
    store.getState().setImage('s1', 'data:image/png;base64,AAA')
    store.getState().clearImage('s1')
    unsub()
    store.getState().setImage('s1', 'data:image/png;base64,BBB')
    expect(seen).toEqual(['data:image/png;base64,AAA', '-'])
  })

  test('writes through to localStorage', async () => {
    const store = await freshStore()
    store.getState().setImage('s1', 'data:image/png;base64,AAA')
    expect(localStorage.getItem(KEY)).toContain('s1')
    store.getState().clearImage('s1')
    expect(localStorage.getItem(KEY)).toBe('{}')
  })

  test('seeded storage shapes hydrate or fall back', async () => {
    localStorage.setItem(KEY, JSON.stringify({ s9: 'data:image/png;base64,AAA' }))
    const store = await freshStore()
    expect(store.getState().images['s9']).toBe('data:image/png;base64,AAA')
    for (const seed of ['[1,2]', '"just"', 'garbage{']) {
      localStorage.setItem(KEY, seed)
      const fresh = await freshStore()
      expect(fresh.getState().images).toEqual({})
    }
  })

  test('a refused write leaves the in-memory record serving', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string) => {
      if (key === KEY) throw new Error('quota')
    })
    const store = await freshStore()
    store.getState().setImage('s2', 'data:image/png;base64,AAA')
    expect(store.getState().images['s2']).toBe('data:image/png;base64,AAA')
    vi.restoreAllMocks()
  })
})
