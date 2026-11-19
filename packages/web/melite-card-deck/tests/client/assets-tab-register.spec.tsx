/**
 * registerAssetsTab — the native right-sidebar registration (the
 * ui-sidebar-right two-stage contract, the shipped documentpreview
 * pattern): the tab TYPE (id/kind/title/guide row + glyph) lands on
 * the type registry, the body lands under the type's id on the keyed
 * `sidebar.right.pane.tab` seat.
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { ComponentType } from 'react'

import { ComfyManagerPanel, registerAssetsTab } from '../../src/client/assets-tab.tsx'

interface TabDef {
  id: string
  kind: string
  title(): string
  guide?: Array<{
    order: number
    title(): string
    description?(): string
    icon?: ComponentType<{ size?: number }>
  }>
}

interface Body {
  name: string
  key: string
  component: unknown
}

function fakeCtx(dispose: unknown): {
  ctx: {
    effect(fn: () => unknown, name?: string): unknown
    sidebarRightTabs: { register(def: TabDef): unknown }
    slots: {
      inject(name: string, declare: () => unknown): unknown
      register(options: { name: string; key: string }, component: unknown): unknown
    }
  }
  types: TabDef[]
  bodies: Body[]
} {
  const types: TabDef[] = []
  const bodies: Body[] = []
  const ctx = {
    effect(fn: () => unknown) {
      return fn()
    },
    sidebarRightTabs: {
      register(def: TabDef) {
        types.push(def)
        return () => {}
      },
    },
    slots: {
      inject(_name: string, declare: () => unknown) {
        return declare()
      },
      register(options: { name: string; key: string }, component: unknown) {
        bodies.push({ name: options.name, key: options.key, component })
        return dispose
      },
    },
  }
  return { ctx, types, bodies }
}

afterEach(() => {})

describe('registerAssetsTab — the native tab contract', () => {
  it('registers the comfy-manager type with its guide row', () => {
    const { ctx, types } = fakeCtx(() => {})
    registerAssetsTab(ctx as never)
    expect(types).toHaveLength(1)
    expect(types[0]?.id).toBe('melite-card-deck:comfy')
    expect(types[0]?.kind).toBe('comfy-manager')
    expect(types[0]?.title()).toBe('ComfyUI Manager')
    expect(types[0]?.guide).toHaveLength(1)
    expect(types[0]?.guide?.[0]?.order).toBe(61)
    expect(types[0]?.guide?.[0]?.title()).toBe('ComfyUI Manager')
    expect(typeof types[0]?.guide?.[0]?.description?.()).toBe('string')
  })

  it('the guide glyph renders the server-rack svg', () => {
    const { ctx, types } = fakeCtx(() => {})
    registerAssetsTab(ctx as never)
    const icon = types[0]?.guide?.[0]?.icon as unknown as (props: { size?: number }) => unknown
    expect(typeof icon).toBe('function')
    const node = icon({ size: 16 }) as { type: string; props: Record<string, unknown> }
    expect(node.type).toBe('svg')
    expect(node.props['width']).toBe(16)
  })

  it('the body registers under the type id on the keyed seat', () => {
    const { ctx, bodies } = fakeCtx(() => {})
    registerAssetsTab(ctx as never)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.name).toBe('sidebar.right.pane.tab')
    expect(bodies[0]?.key).toBe('melite-card-deck:comfy')
    expect(bodies[0]?.component).toBe(ComfyManagerPanel)
  })

  it('a functionless seat dispose degrades to a noop (never a crash)', () => {
    const disposers: unknown[] = []
    const { ctx, bodies } = fakeCtx(undefined)
    const instrumented = {
      ...ctx,
      slots: {
        ...ctx.slots,
        inject(_name: string, declare: () => unknown) {
          disposers.push(declare())
          return () => {}
        },
      },
    }
    expect(() => registerAssetsTab(instrumented as never)).not.toThrow()
    expect(bodies).toHaveLength(1)
    // the returned noop runs clean (the fiber-unload path).
    expect(() => (disposers[0] as () => void)()).not.toThrow()
  })
})
