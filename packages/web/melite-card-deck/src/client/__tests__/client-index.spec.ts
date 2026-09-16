/**
 * The deck client entry — the ComfyUI Manager tab registration: apply
 * claims the single-mount slot (a duplicated injection is a no-op),
 * releases the claim on fiber unload, and registers the assets tab;
 * a registration throw is logged, never thrown (the shell law).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

interface FakeCtx {
  effect(fn: () => unknown, name?: string): unknown
  sidebarRightTabs: { register(def: unknown): () => void }
  slots: {
    inject(name: string, declare: () => unknown): unknown
    register(options: { name: string; key: string }, component: unknown): () => void
  }
}

function fakeCtx(): { ctx: FakeCtx; effects: Array<() => unknown>; disposers: unknown[]; tabs: unknown[] } {
  const effects: Array<() => unknown> = []
  const disposers: unknown[] = []
  const tabs: unknown[] = []
  const ctx: FakeCtx = {
    effect(fn) {
      effects.push(fn)
      disposers.push(fn())
      return () => {}
    },
    sidebarRightTabs: {
      register(def) {
        tabs.push(def)
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
  return { ctx, effects, disposers, tabs }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function loadEntry(): Promise<typeof import('../index.ts')> {
  return await import('../index.ts')
}

describe('the deck client entry', () => {
  it('inject waits on the slot seat + the tab registry', async () => {
    const mod = await loadEntry()
    expect(mod.inject).toContain('slots')
    expect(mod.inject).toContain('sidebarRightTabs')
  })

  it('apply registers the comfy-manager tab type and releases the claim on unload', async () => {
    const mod = await loadEntry()
    const { ctx, disposers, tabs } = fakeCtx()
    mod.apply(ctx as never)
    expect(tabs).toHaveLength(1)
    expect((tabs[0] as { id: string }).id).toBe('melite-card-deck:comfy')
    // the claim effect's disposer is the release — running it frees
    // the slot so a rebuilt bundle can claim again.
    expect(disposers.length).toBeGreaterThan(0)
    ;(disposers[0] as () => void)()
    const guard = await import('../apply-guard.ts')
    expect(guard.claimDeckApply()).toBe(true)
  })

  it('a duplicated application is a no-op (the apply guard)', async () => {
    const mod = await loadEntry()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = fakeCtx()
    const second = fakeCtx()
    mod.apply(first.ctx as never)
    mod.apply(second.ctx as never)
    expect(first.tabs).toHaveLength(1)
    expect(second.tabs).toHaveLength(0)
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
