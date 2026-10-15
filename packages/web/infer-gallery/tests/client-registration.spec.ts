/**
 * The client registration contract — the ported SINGLE tab (the
 * single-tab shape, operator order: the deleted package's standalone
 * Flows tab is not restored; drafts live behind the Media panel's
 * segmented Flows/Artifacts toggle): apply() waits on ['slots',
 * 'sidebarRightTabs'], registers the Media (kind 'media', guide 51,
 * icon) tab TYPE on the native registry and the one pane body under
 * the type's id on the keyed `sidebar.right.pane.tab` seat. A genuine
 * double apply collides at the shared registries and the per-site
 * catch logs it while the first registration keeps its seat (the
 * DOUBLE-APPLY LAW, nativity audit 2026-11-05 D3 — no module-global
 * claim guard). Failures are logged, never thrown (the shell law: a
 * dead lane must not brick boot).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { estateArtifactAddress } from '../src/client/artifact-address.ts'

interface GuideRow {
  order: number
  title(): string
  description?(): string
  icon?: { (props: { size?: number }): unknown }
}

interface TabType {
  id: string
  kind: string
  title: (() => string) | ((address: string) => string)
  patterns?: readonly string[]
  priority?: 'extension' | 'builtin' | 'fallback'
  guide?: GuideRow[]
}

interface Registration {
  tabTypes: TabType[]
  bodies: Array<{ name: string; key: string; component: unknown }>
  injectWaits: string[]
}

/** The registries' seat stores — shared across the fake contexts of a
 *  double-apply arm, the way the real client registries survive across
 *  plugin constructions. */
interface GalleryRegistry {
  tabIds: Set<string>
  slotKeys: Set<string>
  tabTypes: TabType[]
  bodies: Array<{ name: string; key: string; component: unknown }>
  injectWaits: string[]
}

function freshRegistry(): GalleryRegistry {
  return { tabIds: new Set(), slotKeys: new Set(), tabTypes: [], bodies: [], injectWaits: [] }
}

interface FakeCtx {
  effect(fn: () => unknown, name?: string): unknown
  sidebarRightTabs: { register(def: TabType): () => void }
  slots: {
    inject(name: string, declare: () => unknown): unknown
    register(options: { name: string; key: string }, component: unknown): () => void
  }
}

function fakeCtx(registry: GalleryRegistry = freshRegistry()): { ctx: FakeCtx; reg: Registration } {
  const ctx: FakeCtx = {
    effect(fn) { return fn() },
    sidebarRightTabs: {
      register(def) {
        // ui-sidebar-right's own law: register() throws on a duplicate
        // id (the second apply's collision face).
        if (registry.tabIds.has(def.id)) throw new Error(`slot "${def.id}" has been registered`)
        registry.tabIds.add(def.id)
        registry.tabTypes.push(def)
        return () => {}
      },
    },
    slots: {
      inject(name, declare) {
        registry.injectWaits.push(name)
        // SlotRegistry.inject semantics: when the declaration already
        // exists the callback runs synchronously (the shipped
        // ui-sidebar-right declares the slot).
        const disposer = declare()
        return () => { if (typeof disposer === 'function') disposer() }
      },
      register(options, component) {
        if (typeof component !== 'function') throw new Error('component missing for ' + options.name)
        // The keyed seat's own law: a duplicate key throws.
        if (registry.slotKeys.has(options.key)) throw new Error(`slot "${options.key}" has been registered`)
        registry.slotKeys.add(options.key)
        registry.bodies.push({ name: options.name, key: options.key, component })
        return () => {}
      },
    },
  }
  return { ctx, reg: registry }
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

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

  it('apply registers the Media page type and the estate-artifact resource type', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    const kinds = reg.tabTypes.map((t) => t.kind)
    expect(kinds).toEqual(['media', 'estate-artifact'])
    const media = reg.tabTypes[0]
    expect(media.id).toBe('infer-media:media')
    expect((media.title as () => string)()).toBe('Media')
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
    expect(reg.injectWaits).toEqual(['sidebar.right.pane.tab', 'sidebar.right.pane.tab'])
    expect(reg.bodies.map((b) => b.key)).toEqual(['infer-media:media', 'infer-media:estate-artifact'])
    expect(reg.bodies.every((b) => b.name === 'sidebar.right.pane.tab')).toBe(true)
    expect(reg.bodies.every((b) => typeof b.component === 'function')).toBe(true)
  })

  it('a double-apply conflict logs per site (the first registration keeps the seat)', async () => {
    const mod = await loadClient()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // ONE shared registry pair — the real client's registries survive
    // across plugin constructions, so the second application's
    // registrations collide on the same ids/keys.
    const shared = freshRegistry()
    const first = fakeCtx(shared)
    const second = fakeCtx(shared)
    expect(() => mod.apply(first.ctx as never)).not.toThrow()
    expect(() => mod.apply(second.ctx as never)).not.toThrow()
    // The first application's seats stand; the second's four collision
    // sites each logged, never threw (the shell law).
    expect(shared.tabTypes).toHaveLength(2)
    expect(shared.bodies).toHaveLength(2)
    const voices = errSpy.mock.calls.map((args) => args.join(' ')).join(' ')
    expect(voices).toContain('[melite-gallery] media tab type registration failed')
    expect(voices).toContain('[melite-gallery] media tab body registration failed')
    expect(voices).toContain('[melite-gallery] estate-artifact tab type registration failed')
    expect(voices).toContain('[melite-gallery] estate-artifact tab body registration failed')
    errSpy.mockRestore()
  })

  it('a failing registry is logged, never thrown (the shell law)', async () => {
    const mod = await loadClient()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = {
      effect(fn: () => unknown) { return fn() },
      sidebarRightTabs: { register(): never { throw new Error('registry down') } },
      slots: {
        // The real seat runs the declaration synchronously — the
        // declare throws (the seat is down), stage two logs it.
        inject(_name: string, declare: () => unknown): unknown { return declare() },
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

describe('the estate-artifact resource type (the claim the model tiles ride)', () => {
  it('claims the address kind at the builtin band', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    const t = reg.tabTypes.find((x) => x.kind === 'estate-artifact')
    expect(t).toBeDefined()
    expect(t!.id).toBe('infer-media:estate-artifact')
    expect(t!.patterns).toEqual(['dsh-resource://estate-artifact/**'])
    expect(t!.priority).toBe('builtin')
    expect(t!.guide).toBeUndefined()
  })

  it('titles each tab with the decoded artifact\'s REAL file name', async () => {
    const mod = await loadClient()
    const { ctx, reg } = fakeCtx()
    mod.apply(ctx as never)
    const t = reg.tabTypes.find((x) => x.kind === 'estate-artifact')
    const title = t!.title as (address: string) => string
    expect(title(estateArtifactAddress('/infer-gallery/artifact?path=run-9/prop_final.glb'))).toBe('prop_final.glb')
    expect(title('dsh-resource://estate-artifact/%%%%')).toBe('artifact')
  })
})
