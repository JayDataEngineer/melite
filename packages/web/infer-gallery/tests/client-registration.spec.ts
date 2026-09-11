/**
 * The client registration contract — the ported SINGLE tab (the
 * single-tab shape, operator order: the deleted package's standalone
 * Flows tab is not restored; drafts live behind the Media panel's
 * segmented Flows/Artifacts toggle): apply() waits on ['slots',
 * 'sidebarRightTabs'], registers the Media (kind 'media', guide 51,
 * icon) tab TYPE on the native registry and the one pane body under
 * the type's id on the keyed `sidebar.right.pane.tab` seat, and the
 * apply guard makes a duplicated injection a no-op. Failures are
 * logged, never thrown (the shell law: a dead lane must not brick
 * boot).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

interface GuideRow {
  order: number
  title(): string
  description?(): string
  icon?: { (props: { size?: number }): unknown }
}

interface TabType {
  id: string
  kind: string
  title(): string
  guide?: GuideRow[]
}

interface Registration {
  tabTypes: TabType[]
  bodies: Array<{ name: string; key: string; component: unknown }>
  injectWaits: string[]
  logs: unknown[]
}

interface FakeCtx {
  effect(fn: () => unknown, name?: string): unknown
  sidebarRightTabs: { register(def: TabType): () => void }
  slots: {
    inject(name: string, declare: () => unknown): unknown
    register(options: { name: string; key: string }, component: unknown): () => void
  }
}

function fakeCtx(): { ctx: FakeCtx; reg: Registration } {
  const reg: Registration = { tabTypes: [], bodies: [], injectWaits: [], logs: [] }
  const ctx: FakeCtx = {
    effect(fn) { return fn() },
    sidebarRightTabs: {
      register(def) {
        reg.tabTypes.push(def)
        return () => {}
      },
    },
    slots: {
      inject(name, declare) {
        reg.injectWaits.push(name)
        // SlotRegistry.inject semantics: when the declaration already
        // exists the callback runs synchronously (the shipped
        // ui-sidebar-right declares the slot).
        const disposer = declare()
        return () => { if (typeof disposer === 'function') disposer() }
      },
      register(options, component) {
        if (typeof component !== 'function') throw new Error('component missing for ' + options.name)
        reg.bodies.push({ name: options.name, key: options.key, component })
        return () => {}
      },
    },
  }
  return { ctx, reg }
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

/** The client module FRESH per test — the apply guard is module state
 *  (one application per page lifetime), so every assertion loads its
 *  own module instance exactly like a fresh page. */
async function loadClient(): Promise<typeof import('../src/client/index.ts') > {
  return await import('../src/client/index.ts')
}

describe('the gallery client registration (the full port)', () => {
  it('inject waits on the tab registry + the slot seat', async () => {
    const mod = await loadClient()
    expect(Array.isArray(mod.inject)).toBe(true)
    expect(mod.inject).toContain('slots')
    expect(mod.inject).toContain('sidebarRightTabs')
  })

  it('apply registers the single Media tab type with guide row + icon', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    const kinds = reg.tabTypes.map((t) => t.kind)
    expect(kinds).toEqual(['media'])
    const media = reg.tabTypes[0]
    expect(media.id).toBe('infer-media:media')
    expect(media.title()).toBe('Media')
    expect(media.guide).toHaveLength(1)
    expect(media.guide![0].order).toBe(51)
    expect(media.guide![0].title()).toBe('Media')
    expect(typeof media.guide![0].description!()).toBe('string')
    expect(media.guide![0].description!()).toMatch(/archive/i)
    expect(typeof media.guide![0].icon).toBe('function')
  })

  it('the pane body registers under the type\'s id on the keyed seat', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    expect(reg.injectWaits).toEqual(['sidebar.right.pane.tab'])
    expect(reg.bodies.map((b) => b.key)).toEqual(['infer-media:media'])
    expect(reg.bodies.every((b) => b.name === 'sidebar.right.pane.tab')).toBe(true)
    expect(reg.bodies.every((b) => typeof b.component === 'function')).toBe(true)
  })

  it('a duplicated application is a no-op (the apply guard)', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    mod.apply(ctx as never)
    expect(reg.tabTypes).toHaveLength(1)
    expect(reg.bodies).toHaveLength(1)
  })

  it('a failing registry is logged, never thrown (the shell law)', async () => {
    const mod = await loadClient()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = {
      effect(fn: () => unknown) { return fn() },
      sidebarRightTabs: { register(): never { throw new Error('registry down') } },
      slots: {
        inject(): unknown { return undefined },
        register(): never { throw new Error('seat down') },
      },
    }
    expect(() => mod.apply(ctx as never)).not.toThrow()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('the guide icon renders an svg glyph (JSX-free entry stays JSX-free)', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    const node = reg.tabTypes[0].guide![0].icon!({}) as { type: string }
    expect(node.type).toBe('svg')
  })
})
