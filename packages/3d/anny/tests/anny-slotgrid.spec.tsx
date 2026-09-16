// @vitest-environment happy-dom
/**
 * anny SlotGrid — the wiring-aware slot squares. Pins the contract
 * through the real seams: stageSlots/formOf compute the squares (the
 * spec derives the same vocabulary — green under fallback or booted
 * catalogs), uploads ride a stubbed /v1/uploads fetch, toasts read
 * the live store.
 */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'
import { formOf, stageSlots } from '@melite/catalog'
import { useToastStore } from '@melite/card-base/toast'

import { SlotGrid } from '../src/ui/studio/slotGrid.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useToastStore.setState({ toasts: [] })
})

function mkStage(over: Record<string, unknown> = {}): CardStage {
  return {
    id: 's1', title: 'Anny', kind: 'txt2img', service: 'anny',
    params: { source_glb: null }, inputs: [], inputIndices: [], inputOutputs: [],
    result: null, ...over,
  } as unknown as CardStage
}

/** The squares the grid will render for these params (same function). */
function slotsFor(params: Record<string, unknown>): string[] {
  return stageSlots(params, formOf('anny'), 'anny')
}

function mountGrid(stage: CardStage, upstreams: CardStage[] = [], handlers: Record<string, unknown> = {}) {
  const onSaveParams = vi.fn()
  const onWireSlot = vi.fn()
  const props = {
    stage, upstreams, onSaveParams, onWireSlot, ...handlers,
  }
  const rendered = render(h(SlotGrid, props as never))
  const labels = (): string[] =>
    [...rendered.container.querySelectorAll('[data-slot-label]')].map((n) => n.textContent ?? '')
  return { onSaveParams, onWireSlot, container: rendered.container, unmount: rendered.unmount, labels }
}

function stubUpload(path = 'data/input/up.png', status = 200): void {
  vi.stubGlobal('fetch', async (): Promise<Response> =>
    new Response(JSON.stringify({ path }), { status }))
}

describe('SlotGrid', () => {
  test('no slot keys — the grid renders nothing', () => {
    const { container } = mountGrid(mkStage({ params: { seed: 1 } }))
    expect(slotsFor({ seed: 1 })).toEqual([])
    expect(container.querySelector('[data-slot-grid]')).toBeNull()
  })

  test('an empty square carries its label and no actions', () => {
    const { labels } = mountGrid(mkStage())
    expect(labels()).toEqual(slotsFor({ source_glb: null }))
    expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
  })

  test('an estate path previews through the inputs door', () => {
    mountGrid(mkStage({ params: { source_glb: 'data/input/up.png' } }))
    const img = document.querySelector('[data-slot-square] img') as HTMLImageElement | null
    expect(img?.getAttribute('src')).toBe('/v1/assets/inputs/up.png')
  })

  test('a mount path falls back to raw text; empty/non-strings stay empty', () => {
    const { unmount } = mountGrid(mkStage({ params: { source_glb: '/mnt/take/model.glb' } }))
    expect(document.querySelector('[data-slot-square] img')).toBeNull()
    expect(screen.getByText('model.glb')).not.toBeNull()
    unmount()
    mountGrid(mkStage({ params: { source_glb: '' } }))
    expect(document.querySelector('[data-slot-square] img')).toBeNull()
    cleanup()
    mountGrid(mkStage({ params: { source_glb: 5 } }))
    expect(document.querySelector('[data-slot-square] img')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
  })

  test('a wired upstream badges live; its artifact thumbnails', () => {
    const up = mkStage({
      id: 'u0', title: 'Prep',
      result: { assetUrls: ['https://host/p.png'], artifacts: {} },
    })
    const slots = slotsFor({ source_glb: null })
    mountGrid(
      mkStage({ params: { source_glb: null }, inputs: ['u0'] }),
      [up, mkStage()],
      {},
    )
    expect(screen.getByText('Prep')).not.toBeNull()
    expect(screen.queryByText('not run yet')).toBeNull()
    const img = document.querySelector('[data-slot-square] img') as HTMLImageElement | null
    expect(img?.getAttribute('src')).toBe('https://host/p.png')
    expect(slots.length).toBe(1)
  })

  test('a wired-but-unrun upstream waits; a stale wire id unwires soft', () => {
    const { unmount } = mountGrid(
      mkStage({ params: { source_glb: null }, inputs: ['u0'] }),
      [mkStage({ id: 'u0', title: 'Prep' }), mkStage()],
    )
    expect(screen.getByText('Prep')).not.toBeNull()
    expect(screen.getByText('not run yet')).not.toBeNull()
    unmount()
    // the wire points at a ghost — the square renders empty, never loud
    mountGrid(mkStage({ params: { source_glb: null }, inputs: ['ghost'] }), [mkStage()])
    expect(screen.queryByText('Prep')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
  })

  test('the wire button opens the picker; the pick writes both sides', () => {
    const ups = [mkStage({ id: 'u0', title: 'Prep' }), mkStage()]
    const { onSaveParams, onWireSlot } = mountGrid(mkStage(), ups)
    fireEvent.click(screen.getByRole('button', { name: /Wire source_glb from an earlier card/ }))
    expect(screen.getByText(/Wire source_glb from an earlier card/)).not.toBeNull()
    // only the backward stage lists (self excluded)
    const options = [...document.querySelectorAll('[data-wire-option]')]
    expect(options.length).toBe(1)
    fireEvent.click(options[0]!)
    expect(onWireSlot).toHaveBeenCalledWith('source_glb', 'u0', null)
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: null })
    expect(screen.queryByText(/Wire source_glb from an earlier card/)).toBeNull()
  })

  test('the square click opens the picker too; Escape closes it', () => {
    mountGrid(mkStage(), [mkStage({ id: 'u0', title: 'Prep' }), mkStage()])
    fireEvent.click(document.querySelector('[data-slot-square]') as HTMLElement)
    expect(screen.getByText(/Wire source_glb from an earlier card/)).not.toBeNull()
    // an unmapped key rests with the picker open
    fireEvent.keyDown(window, { key: 'x' })
    expect(screen.queryByText(/Wire source_glb from an earlier card/)).not.toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText(/Wire source_glb from an earlier card/)).toBeNull()
  })

  test('the labelled close shuts the picker; a stageless rail lists none', () => {
    const { unmount } = mountGrid(mkStage(), [mkStage({ id: 'u0', title: 'Prep' }), mkStage()])
    fireEvent.click(screen.getByRole('button', { name: /Wire source_glb from an earlier card/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close wire picker' }))
    expect(screen.queryByText(/Wire source_glb from an earlier card/)).toBeNull()
    unmount()
    // the stage rides outside the rail — nothing is prior to it
    mountGrid(mkStage(), [])
    fireEvent.click(screen.getByRole('button', { name: /Wire source_glb from an earlier card/ }))
    expect(screen.getByText(/No earlier cards yet/)).not.toBeNull()
  })

  test('the unwire clears both sides', () => {
    const ups = [mkStage({ id: 'u0', title: 'Prep' }), mkStage()]
    const { onSaveParams, onWireSlot } = mountGrid(
      mkStage({ params: { source_glb: null }, inputs: ['u0'], inputOutputs: [null] }),
      ups,
    )
    fireEvent.click(screen.getByRole('button', { name: /Wire source_glb from an earlier card/ }))
    fireEvent.click(document.querySelector('[data-wire-unwire]') as HTMLElement)
    expect(onWireSlot).toHaveBeenCalledWith('source_glb', null, null)
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: null })
  })

  test('Detach clears the attached value and the wire', () => {
    const { onSaveParams, onWireSlot } = mountGrid(
      mkStage({ params: { source_glb: 'data/input/up.png' }, inputs: ['u0'] }),
      [mkStage({ id: 'u0', title: 'Prep' }), mkStage()],
    )
    fireEvent.click(screen.getByRole('button', { name: 'Detach' }))
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: null })
    expect(onWireSlot).toHaveBeenCalledWith('source_glb', null, null)
  })

  test('a picked file uploads, previews, unwires, and toasts', async () => {
    stubUpload()
    const { onSaveParams, onWireSlot } = mountGrid(mkStage(), [mkStage()])
    const input = document.querySelector('[data-slot-input]') as HTMLInputElement
    const file = new File(['bytes'], 'up.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    // toasts render through the viewport (unmounted here) — the store
    // is the assertion surface, and its arrival marks the rail done
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0)
    })
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: 'data/input/up.png' })
    expect(onWireSlot).toHaveBeenCalledWith('source_glb', null, null)
    const toasts = useToastStore.getState().toasts
    expect(toasts.some((t) => t.type === 'success' && t.message === 'Uploaded up.png')).toBe(true)
    // the fresh object URL previews immediately
    const img = document.querySelector('[data-slot-square] img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toMatch(/^blob:/)
    // a second upload to the same slot revokes the first preview
    const first = img!.getAttribute('src')!
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const file2 = new File(['more'], 'up2.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file2], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      expect(revoke).toHaveBeenCalledWith(first)
    })
    revoke.mockRestore()
  })

  test('a refused file toasts the error and saves nothing', async () => {
    stubUpload()
    const { onSaveParams } = mountGrid(mkStage(), [mkStage()])
    const input = document.querySelector('[data-slot-input]') as HTMLInputElement
    const file = new File(['nope'], 'up.txt', { type: 'text/plain' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0)
    })
    expect(useToastStore.getState().toasts[0]!.message).toMatch(/only png \/ jpeg \/ webp upload/)
    expect(onSaveParams).not.toHaveBeenCalled()
    const toasts = useToastStore.getState().toasts
    expect(toasts.some((t) => t.type === 'error')).toBe(true)
  })

  test('a dropped file uploads the same rail', async () => {
    stubUpload('data/input/drop.png')
    const { onSaveParams } = mountGrid(mkStage(), [mkStage()])
    const target = document.querySelector('[data-slot-square]') as HTMLElement
    const ev = createEvent.drop(target)
    const file = new File(['bytes'], 'drop.png', { type: 'image/png' })
    Object.defineProperty(ev, 'dataTransfer', {
      value: { getData: () => '', files: [file], types: ['Files'] },
    })
    fireEvent(target, ev)
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0)
    })
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: 'data/input/drop.png' })
  })

  test('display-only still takes the asset drop', () => {
    const onSaveParams = vi.fn()
    render(h(SlotGrid, {
      stage: mkStage(), upstreams: [mkStage()], onSaveParams,
    } as never))
    expect(screen.queryByRole('button', { name: /Wire source_glb/ })).toBeNull()
    const target = document.querySelector('[data-slot-square]') as HTMLElement
    const ev = createEvent.drop(target)
    Object.defineProperty(ev, 'dataTransfer', {
      value: { getData: (t: string) => (t === 'application/tech-noir-asset' ? JSON.stringify({ url: 'https://host/a.png' }) : ''), files: [], types: ['application/tech-noir-asset'] },
    })
    fireEvent(target, ev)
    expect(onSaveParams).toHaveBeenCalledWith({ source_glb: 'https://host/a.png' })
    // and the square click opens nothing without a wire channel
    fireEvent.click(target)
    expect(screen.queryByText(/Wire source_glb from an earlier card/)).toBeNull()
  })

  test('unmount revokes the upload previews', async () => {
    stubUpload()
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const { unmount } = mountGrid(mkStage(), [mkStage()])
    const input = document.querySelector('[data-slot-input]') as HTMLInputElement
    const file = new File(['bytes'], 'up.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0)
    })
    unmount()
    expect(revoke).toHaveBeenCalled()
    revoke.mockRestore()
  })
})
