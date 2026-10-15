/**
 * The deck client entry — the ComfyUI Manager tab registration: apply
 * registers the assets tab behind fiber effects; a genuine double
 * apply collides at the shared tab registry and the per-site catch
 * logs it while the first registration keeps its seat (the
 * DOUBLE-APPLY LAW, nativity audit 2026-11-05 D3 — no module-global
 * claim guard); a registration throw is logged, never thrown (the
 * shell law).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The sidebar tab registry's seat store — shared across the fake
 *  contexts of a double-apply arm, the way the real client registry is
 *  shared across plugin constructions. */
interface DeckRegistry { ids: Set<string>; tabs: unknown[] }

interface FakeCtx {
  effect(fn: () => unknown, name?: string): unknown
  remote: { manage: { act(): Promise<never> } }
  sidebarRightTabs: { register(def: unknown): () => void }
  slots: {
    inject(name: string, declare: () => unknown): unknown
    register(options: { name: string; key: string }, component: unknown): () => void
  }
}

function fakeCtx(registry: DeckRegistry = { ids: new Set(), tabs: [] }): {
  ctx: FakeCtx
  registry: DeckRegistry
} {
  const ctx: FakeCtx = {
    remote: {
      // The seated manage lane (never called by these tests — the
      // entry only seats it).
      manage: { act: (): Promise<never> => new Promise(() => {}) },
    },
    effect(fn) {
      // cordis effect() runs the contribution immediately.
      fn()
      return () => {}
    },
    sidebarRightTabs: {
      register(def) {
        // ui-sidebar-right's own law: register() throws on a duplicate
        // id (the guide entry comment in assets-tab.tsx names it).
        const id = (def as { id: string }).id
        if (registry.ids.has(id)) throw new Error(`slot "${String(id)}" has been registered`)
        registry.ids.add(id)
        registry.tabs.push(def)
        return () => {}
      },
    },
    slots: {
      inject(_name, declare) {
        return declare()
      },
      register() {
        return () => {}
      },
    },
  }
  return { ctx, registry }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function loadEntry(): Promise<typeof import('../../src/client/index.ts')> {
  return await import('../../src/client/index.ts')
}

describe('the deck client entry', () => {
  it('inject waits on the slot seat, the tab registry, and the manage lane', async () => {
    const mod = await loadEntry()
    expect(mod.inject).toContain('slots')
    expect(mod.inject).toContain('sidebarRightTabs')
    expect(mod.inject).toContain('remote.manage')
  })

  it('apply registers the comfy-manager tab type', async () => {
    const mod = await loadEntry()
    const { ctx, registry } = fakeCtx()
    mod.apply(ctx as never)
    expect(registry.tabs).toHaveLength(1)
    expect((registry.tabs[0] as { id: string }).id).toBe('melite-card-deck:comfy')
  })

  it('a double-apply conflict logs per site (the first registration keeps the seat)', async () => {
    const mod = await loadEntry()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    // ONE shared registry — the real client's tab registry survives
    // across plugin constructions, so the second application's
    // register() collides on the same seat id.
    const shared: DeckRegistry = { ids: new Set(), tabs: [] }
    const first = fakeCtx(shared)
    const second = fakeCtx(shared)
    expect(() => mod.apply(first.ctx as never)).not.toThrow()
    expect(() => mod.apply(second.ctx as never)).not.toThrow()
    // The first application's seat stands; the second's collision was
    // logged per site, never thrown (the shell law).
    expect(shared.tabs).toHaveLength(1)
    expect(err).toHaveBeenCalledOnce()
    const voice = err.mock.calls.map((args) => args.join(' ')).join(' ')
    expect(voice).toContain('[melite-card-deck] assets tab registration failed')
    err.mockRestore()
  })

  it('a failing tab registration is logged, never thrown (the shell law)', async () => {
    const mod = await loadEntry()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx } = fakeCtx()
    ctx.sidebarRightTabs.register = (): never => {
      throw new Error('registry down')
    }
    expect(() => mod.apply(ctx as never)).not.toThrow()
    expect(err).toHaveBeenCalledOnce()
    err.mockRestore()
  })
})
