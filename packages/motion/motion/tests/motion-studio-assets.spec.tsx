// @vitest-environment happy-dom
/**
 * motion studio II — assets (background + body slot drops/picks/wire, preview-body convert).
 * Split from the motion-studio suite: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { LOADED_WAIT } from '../../../../tests/helpers/loaded-wait.ts';
import { fireEvent, getByRole } from '@testing-library/dom'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { bindEstateRemote, unbindEstateRemote, useToastStore } from '@melite/card-base/client'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor, mkStage, mounted } from './helpers.ts'
import { createRoot } from 'react-dom/client'
import { MotionCardEditor } from '../src/ui/studio/component.tsx'
import { runCompiledGeneration } from '@melite/catalog'

afterEach(() => resetStudio())

describe('background + body slot (drops / picks / wire)', () => {
  const MIME = 'application/tech-noir-asset'

  function assetTransfer(url: string | null, raw?: string) {
    return {
      types: [MIME],
      getData: () => (raw !== undefined ? raw : JSON.stringify({ url })),
      files: [],
    }
  }

  function slotSquare(): HTMLElement {
    return document.body.querySelector('[data-motion-body] [data-slot-square]') as HTMLElement
  }

  /** Drop target INSIDE the stage frame (rail + transport live in
   *  separate panes — drops on them never reach the frame's onDrop).
   *  The export rect renders only in-stage, so open it on a run. */
  async function stageTarget(): Promise<HTMLElement> {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    return document.body.querySelector('[data-export-rect]') as HTMLElement
  }

  async function mountedNoRun(params: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
    stubLoads()
    const m = mountEditor({ params }, props)
    await waitForText('No motion yet')
    return m
  }

  test('stage drop of a GLB attaches the preview body', async () => {
    const target = await stageTarget()
    // drop on a live in-stage child — the event bubbles to the frame's onDrop
    fireEvent.drop(target, {
      dataTransfer: assetTransfer('https://host/dropped.glb'),
    })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no body fallback toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('stage drop of an image sets the background, clear removes it', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    const target = await (async () => {
      fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
      await vi.waitFor(() => {
        if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
      }, { timeout: 10000 })
      return document.body.querySelector('[data-export-rect]') as HTMLElement
    })()
    fireEvent.drop(target, {
      dataTransfer: assetTransfer('https://host/bg.png'),
    })
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => (p as Record<string, unknown>).motion_bg_image === 'https://host/bg.png')
      if (!call) throw new Error('bg not persisted yet')
    }, { timeout: 10000 })
    await vi.waitFor(() => {
      // THE ESTATE SQUARE'S DETACH (the bg pick rode SourceRow — the
      // motion-params audit F4): the held square's ✕ is the clear.
      if (!document.body.querySelector('[aria-label="Detach Background"]')) throw new Error('no detach yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Detach Background"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => (p as Record<string, unknown>).motion_bg_image === '')
      if (!call) throw new Error('bg not cleared yet')
    }, { timeout: 10000 })
  })

  test('stage drop with a malformed payload falls through silently', async () => {
    const target = await stageTarget()
    const before = useToastStore.getState().toasts.length
    fireEvent.drop(target, {
      dataTransfer: assetTransfer(null, 'not-json{'),
    })
    await new Promise((r) => setTimeout(r, 800))
    await new Promise((r) => setTimeout(r, 800))
    // silent: no new toasts, no body/bg writes from this mount
    expect(useToastStore.getState().toasts.length).toBe(before)
  })

  test('background hydrates from params', async () => {
    await mountedNoRun({ motion_bg_image: 'https://host/bg.png' })
    await vi.waitFor(() => {
      // the square seat's detach verb is the hydrated clear (SourceRow).
      if (!document.body.querySelector('[aria-label="Detach Background"]')) throw new Error('no hydrated detach yet')
    }, { timeout: 10000 })
  })

  test('cancelled bg pick is a no-op', async () => {
    const { onSave } = await mountedNoRun()
    // the square seat's own hidden input (the one read path every
    // slot-shaped attach shares) — a change with no files writes nothing.
    const input = document.body.querySelector('[data-motion-bg] input[data-slot-input]') as HTMLInputElement
    fireEvent.change(input)
    await new Promise((r) => setTimeout(r, 500))
    const touched = onSave.mock.calls.some(([p]) => 'motion_bg_image' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('slot asset-drop of a GLB attaches, detach clears', { timeout: LOADED_WAIT() * 6 }, async () => {
    await mountedNoRun()
    fireEvent.drop(slotSquare(), { dataTransfer: assetTransfer('https://host/slot.glb') })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach preview_glb"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s kept the evidence point load-robust until the 2026-10-23 green-triple gate (flake-slowness-wave3) starved the dom loop past 180s. The multiple doubles again — the stall is scheduler starvation, never a slower claim.
    }, { timeout: LOADED_WAIT() * 6 })
    fireEvent.click(document.body.querySelector('[aria-label="Detach preview_glb"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[aria-label="Detach preview_glb"]')) throw new Error('detach did not clear yet')
    }, { timeout: 10000 })
  })

  test('slot asset-drop of a non-GLB refuses', async () => {
    await mountedNoRun()
    fireEvent.drop(slotSquare(), { dataTransfer: assetTransfer('https://host/bg.png') })
    await vi.waitFor(() => {
      const refused = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body must be a .glb'))
      if (!refused) throw new Error('no refusal toast yet')
    }, { timeout: 10000 })
  })

  test('slot pick of a GLB reads the file and attaches', async () => {
    await mountedNoRun()
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['glb-bytes'], 'body.glb', { type: 'model/gltf-binary' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no attach fallback toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('bg file pick reads and persists', async () => {
    const { onSave } = await mountedNoRun()
    const input = document.body.querySelector('[data-motion-bg] input[data-slot-input]') as HTMLInputElement
    const file = new File(['png-bytes'], 'bg.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) =>
        typeof (p as Record<string, unknown>).motion_bg_image === 'string' &&
        ((p as Record<string, unknown>).motion_bg_image as string).startsWith('data:'))
      if (!call) throw new Error('bg file not persisted yet')
    }, { timeout: 10000 })
  })

  test('a From-media pick seats the estate name through the square\u2019s onEdit seam', async () => {
    // The other value arm of the square seat: a library pick flows
    // onEdit(<name>) — the value itself, not a detach — and persists
    // verbatim (the file pick covers the data-URL arm). The library
    // rides the mounted media namespace (the one-fake law: bind the
    // honest envelope fake, never a fetch stub carrying an estate
    // envelope); the unbind keeps the fake out of sibling tests.
    bindEstateRemote({
      media: {
        list: async () => ({ ok: true, value: { items: [{ url: 'data/input/bg-from-media.png', name: 'bg-from-media.png' }] } }),
      },
    } as unknown as Parameters<typeof bindEstateRemote>[0])
    try {
      const { onSave } = await mountedNoRun()
      fireEvent.click(getByRole(document.body, 'button', { name: 'Background source' }))
      await vi.waitFor(() => {
        const row = [...document.body.querySelectorAll('[role="menuitem"]')]
          .find((m) => (m.textContent ?? '').trim() === 'From media')
        if (row === undefined) throw new Error('no From media entry yet')
        fireEvent.click(row)
      }, { timeout: 10000 })
      await vi.waitFor(() => {
        const row = document.body.querySelector('[data-testid="source-pick-row"]')
        if (row === null) throw new Error('the media library never listed its row')
        fireEvent.click(row)
      }, { timeout: 10000 })
      await vi.waitFor(() => {
        const call = onSave.mock.calls.find(([p]) =>
          (p as Record<string, unknown>).motion_bg_image === 'data/input/bg-from-media.png')
        if (!call) throw new Error('the media pick never persisted the estate name')
        if (document.body.querySelector('[aria-label="Detach Background"]') === null) {
          throw new Error('the picked value never rendered the held face')
        }
      }, { timeout: 10000 })
    } finally {
      unbindEstateRemote()
    }
  })

  test('slot pick of a non-GLB refuses without reading', async () => {
    await mountedNoRun()
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['x'], 'body.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const refused = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body must be a .glb'))
      if (!refused) throw new Error('no refusal toast yet')
    }, { timeout: 10000 })
  })

  function up1(result: unknown = null) {
    return { id: 'up1', title: 'Up One', kind: 'x', service: 's', params: {}, inputs: [], inputIndices: [], result }
  }

  /** Stage-level mount (inputs live beside params, not inside them). */
  async function mountedWired(wireInputs: string[], params: Record<string, unknown>, props: Record<string, unknown>) {
    stubLoads()
    const m = mountEditor({ params, inputs: wireInputs }, props)
    await waitForText('No motion yet')
    return m
  }

  test('EXTERNAL PARAM WRITES RE-HYDRATE WHILE MOUNTED (CURE-3): a bg param change on the same stage repaints without remount', async () => {
    // THE LESION (motion-journey wave-2): the media pair hydrated
    // once per stage.id — an external write (the drill's wire verb,
    // a bench re-target) left the studio rendering the stale image
    // until remount. The cure keys the hydrate on the param VALUE;
    // this arm is its firing proof (stage id UNCHANGED).
    stubLoads()
    const onSave = vi.fn()
    const stage = mkStage({ params: { motion_bg_image: 'https://host/a.png' } })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    mounted.push(root)
    const editorFor = (params: Record<string, unknown>) =>
      h(MotionCardEditor, { stage: { ...stage, params }, onSave, runCompiledGeneration } as never)
    root.render(editorFor({ motion_bg_image: 'https://host/a.png' }))
    await vi.waitFor(() => {
      const img = document.body.querySelector('img[aria-hidden]') as HTMLImageElement | null
      if (img?.src !== 'https://host/a.png') throw new Error('bg a not painted yet')
    }, { timeout: 10000 })
    // the EXTERNAL write: same stage id, new param value
    root.render(editorFor({ motion_bg_image: 'https://host/b.png' }))
    await vi.waitFor(() => {
      const img = document.body.querySelector('img[aria-hidden]') as HTMLImageElement | null
      if (img?.src !== 'https://host/b.png') throw new Error('external bg write did NOT re-hydrate (stale image still painted)')
    }, { timeout: 10000 })
  })

  test('wire button opens the picker, pick wires the slot', async () => {
    const onWireSlot = vi.fn()
    const { onSave } = await mountedNoRun(
      { preview_glb: 'https://host/old.glb' },
      { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-wire-option]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[data-wire-option]') as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', 'up1', null)
    // ONE WRITER PER GESTURE (motion-journey CURE-4): the wire verb
    // (onWireSlot → the drill's patchStageParams with the settled
    // url-or-null) is the ONLY write — the studio's companion
    // onSave({preview_glb: null}) was a second write of the same
    // key from one click, and this assert once pinned it as law.
    expect(onSave).not.toHaveBeenCalled()
  })

  test('picker close shuts it without wiring', async () => {
    const onWireSlot = vi.fn()
    await mountedNoRun(
      { preview_glb: 'https://host/old.glb' },
      { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Close wire picker"]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Close wire picker"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-wire-option]')) throw new Error('picker still open')
    }, { timeout: 10000 })
    expect(onWireSlot).not.toHaveBeenCalled()
  })

  test('wired slot badges the upstream and waits for its run', async () => {
    await mountedWired(['up1'], { preview_glb: null }, { onWireSlot: vi.fn(), upstreams: [up1()] })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('waiting for upstream')) throw new Error('no waiting metric yet')
    }, { timeout: 10000 })
  })

  test('wired slot resolves the upstream GLB, falls back loud on fetch loss', async () => {
    await mountedWired(
      ['up1'],
      { preview_glb: null },
      { onWireSlot: vi.fn(), upstreams: [up1({ artifacts: { rig: 'https://host/up.glb' }, assetUrls: [] })] },
    )
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no wired fallback toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('wired detach unwires the slot', { timeout: LOADED_WAIT() * 3 }, async () => {
    const onWireSlot = vi.fn()
    const { onSave } = await mountedWired(
      ['up1'],
      { preview_glb: null },
      { onWireSlot, upstreams: [up1({ artifacts: { rig: 'https://host/up.glb' }, assetUrls: [] })] },
    )
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach preview_glb"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s keeps the evidence point load-robust
    }, { timeout: LOADED_WAIT() * 3 })
    fireEvent.click(document.body.querySelector('[aria-label="Detach preview_glb"]') as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', null, null)
    expect(onSave.mock.calls.some(([p]) => (p as Record<string, unknown>).preview_glb === null)).toBe(true)
  })

  test('picker unwire drops the wire', async () => {
    const onWireSlot = vi.fn()
    await mountedWired(
      ['up1'], { preview_glb: null }, { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-wire-option]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    const unwire = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Unwire'))
    expect(unwire).toBeTruthy()
    fireEvent.click(unwire as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', null, null)
  })
})

describe('preview body (attach / convert / fall back)', () => {
  async function mountedWithBody(previewGlb: string, loadOpts: Record<string, never> = {}) {
    stubLoads({ bodies: { 'bare.glb': 'glb', 'rigged.glb': 404 }, ...loadOpts })
    const m = mountEditor({ params: { preview_glb: previewGlb } })
    await waitForText('No motion yet')
    return m
  }

  test('a rigless mesh rides the convert queue, fails loud, holds the mannequin', async () => {
    await mountedWithBody('https://host/bare.glb')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert-failure toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    // the notice names the dead rigged asset; the stage never empties
    await waitForText('previewing on the neutral mannequin')
    expect(document.body.textContent).toContain('No motion yet')
  }, 30000)

  test('conversion delegates the exact flow body and abort signal to the shared runner', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' } })
    const runCompiledGeneration = vi.fn(async (
      _body: Record<string, unknown>,
      _signal?: AbortSignal,
    ) => ({
      kind: 'started' as const,
      runId: 'run-shared',
      status: {},
      urls: [],
    }))
    mountEditor(
      { params: { preview_glb: 'https://host/bare.glb' } },
      { runCompiledGeneration },
    )
    await vi.waitFor(() => {
      expect(runCompiledGeneration).toHaveBeenCalledTimes(1)
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    expect(runCompiledGeneration.mock.calls[0]?.[0]).toEqual({
      flow: 'body-to-somax',
      glb: 'https://host/bare.glb',
    })
    expect(runCompiledGeneration.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)
  })

  test('a refused queue start surfaces the refusal', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert-failure toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    await waitForText('generate failed')
  }, 30000)

  test('a failed convert run surfaces the run error', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'failed' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('brick blew up'))
      if (!failed) throw new Error('no run-error toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('an unfetchable body falls back without touching the queue', async () => {
    const seen: string[] = []
    stubLoads({ bodies: { 'missing.glb': 404 } })
    const origFetch = globalThis.fetch
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
      seen.push(u)
      return (origFetch as typeof fetch)(input as RequestInfo, init)
    })
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no fallback toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    expect(seen.some((u) => u.includes('/v1/flows/'))).toBe(false)
  }, 30000)
})
