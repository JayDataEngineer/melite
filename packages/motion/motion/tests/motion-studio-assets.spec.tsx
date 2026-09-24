// @vitest-environment happy-dom
/**
 * motion studio II — assets (background + body slot drops/picks/wire, preview-body convert).
 * Split from motion-studio.spec.tsx: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { fireEvent, getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useToastStore } from '@melite/card-base/toast'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

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
    }, { timeout: 20000 })
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
      if (!queryByText(document.body, 'Clear')) throw new Error('no clear yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Clear').closest('button') as HTMLButtonElement)
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
      if (!queryByText(document.body, 'Clear')) throw new Error('no hydrated clear yet')
    }, { timeout: 10000 })
  })

  test('cancelled bg pick is a no-op', async () => {
    const { onSave } = await mountedNoRun()
    const input = document.body.querySelector('input[accept="image/*"]') as HTMLInputElement
    fireEvent.change(input)
    await new Promise((r) => setTimeout(r, 500))
    const touched = onSave.mock.calls.some(([p]) => 'motion_bg_image' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('slot asset-drop of a GLB attaches, detach clears', { timeout: 90000 }, async () => {
    await mountedNoRun()
    fireEvent.drop(slotSquare(), { dataTransfer: assetTransfer('https://host/slot.glb') })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach preview_glb"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s keeps the evidence point load-robust
    }, { timeout: 90000 })
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
    }, { timeout: 20000 })
  }, 30000)

  test('bg file pick reads and persists', async () => {
    const { onSave } = await mountedNoRun()
    const input = document.body.querySelector('input[accept="image/*"]') as HTMLInputElement
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
    expect(onSave).toHaveBeenCalledWith({ preview_glb: null })
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
    }, { timeout: 20000 })
  }, 30000)

  test('wired detach unwires the slot', { timeout: 90000 }, async () => {
    const onWireSlot = vi.fn()
    const { onSave } = await mountedWired(
      ['up1'],
      { preview_glb: null },
      { onWireSlot, upstreams: [up1({ artifacts: { rig: 'https://host/up.glb' }, assetUrls: [] })] },
    )
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach preview_glb"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s keeps the evidence point load-robust
    }, { timeout: 90000 })
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
    }, { timeout: 20000 })
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
    }, { timeout: 20000 })
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
    }, { timeout: 20000 })
    await waitForText('generate failed')
  }, 30000)

  test('a failed convert run surfaces the run error', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'failed' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('brick blew up'))
      if (!failed) throw new Error('no run-error toast yet')
    }, { timeout: 20000 })
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
    }, { timeout: 20000 })
    expect(seen.some((u) => u.includes('/v1/flows/'))).toBe(false)
  }, 30000)
})
