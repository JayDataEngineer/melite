// @vitest-environment happy-dom
/**
 * anny client entry — the thin adapter over AnnyStudio (toCardStage +
 * toUpstreams + AnnyStageView + the slots registration). Same discipline
 * as the panels spec: real mounts, fetch is a tiny stub. The mapping
 * arms are pure translations with no DOM surface of their own (the
 * studio reads stage.params; title/kind/status/result ride the stage
 * object), so each row mounts the surface (health: the character band
 * stands) while the params-driven and onPatch arms assert observably.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useBodyStudio } from '@melite/cards/3d/body/ui/studio/bodyStudio'

import {
  AnnyStageView, apply, inject, name,
} from '../src/client/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useBodyStudio.getState().resetEditing()
})

function stubPresets(): void {
  vi.stubGlobal('fetch', async (input: unknown): Promise<Response> => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    if (u.includes('/v1/studios/3d/anny/presets')) {
      return new Response(JSON.stringify({ presets: [] }), { status: 200 })
    }
    return new Response('nope', { status: 500 })
  })
}

function owner(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    stageId: 's_a',
    row: { id: 's_a', params: {}, result: {}, card: 'anny', title: 'My Anny', runStatus: '' },
    onPatch: vi.fn(),
    upstream: [],
    ...over,
  }
}

function mount(over: Record<string, unknown> = {}): { onPatch: ReturnType<typeof vi.fn> } {
  stubPresets()
  const props = owner(over)
  render(h(AnnyStageView, props as never))
  // health: the character band stands on every row shape
  expect(screen.getByText('Expand')).not.toBeNull()
  return { onPatch: props.onPatch as ReturnType<typeof vi.fn> }
}

describe('AnnyStageView', () => {
  test('a full row translates params, artifacts, urls, title, and upstreams', () => {
    const { onPatch } = mount({
      row: {
        id: 's_a',
        params: { resolution: 1024 },
        result: {
          artifacts: { body: 'https://host/b.glb', empty: '', count: 5 },
          assetUrls: ['https://host/a.glb', 42],
          metadata: { m: 1 },
        },
        card: 'anny',
        title: 'My Anny',
        runStatus: 'done',
      },
      upstream: [{ id: 'u1', title: 'ph', url: 'https://host/ph.png' }],
    })
    // params ride the document: the render tab shows the carried knob
    fireEvent.click(screen.getByRole('tab', { name: 'Render' }))
    expect(screen.getByDisplayValue('1024')).not.toBeNull()
    expect(onPatch).not.toHaveBeenCalled()
  })

  test('a bare row falls back to defaults and a null result', () => {
    mount({ row: { id: 's_a' } })
  })

  test('title falls back to the card, then the stage id', () => {
    mount({ row: { id: 's_a', params: {}, card: 'anny' } })
    cleanup()
    mount({ row: { id: 's_a', params: {} } })
  })

  test('non-object params/result/card shapes fall back empty', () => {
    mount({ row: { id: 's_a', params: 'nope', result: 'nope', card: 7 } })
  })

  test('run statuses map onto the card lifecycle', () => {
    for (const runStatus of ['failed', 'running', 'queued', 'melted']) {
      mount({ row: { id: 's_a', params: {}, runStatus } })
      cleanup()
    }
  })

  test('an explicit empty upstream list mounts like an absent one', () => {
    mount({ upstream: [] })
    cleanup()
    const props = owner()
    delete props.upstream
    stubPresets()
    render(h(AnnyStageView, props as never))
    expect(screen.getByText('Expand')).not.toBeNull()
  })

  test('knob writes ride onSave into onPatch', () => {
    const { onPatch } = mount({ row: { id: 's_a', params: {} } })
    fireEvent.click(screen.getByRole('tab', { name: 'Render' }))
    fireEvent.change(screen.getByDisplayValue('768'), { target: { value: '1024' } })
    expect(onPatch).toHaveBeenCalledWith({ resolution: 1024 })
  })
})

describe('registration', () => {
  test('the module ships the ui-tool law shape and registers the anny key', () => {
    expect(name).toBe('annyStudio')
    expect(inject).toEqual(['slots'])
    const factories: Array<() => unknown> = []
    const registered: unknown[] = []
    apply({
      slots: {
        inject: (_key: string, factory: () => unknown) => { factories.push(factory) },
        register: (seam: unknown, view: unknown) => { registered.push([seam, view]) },
      },
    } as never)
    expect(factories).toHaveLength(1)
    factories[0]!()
    expect(registered).toHaveLength(1)
    const [seam, view] = registered[0] as [unknown, unknown]
    expect(seam).toEqual({ name: 'cards.stage.view', key: 'anny' })
    expect(view).toBe(AnnyStageView)
  })
})
