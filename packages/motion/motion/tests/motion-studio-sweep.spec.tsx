// @vitest-environment happy-dom
/**
 * motion studio II — coverage sweep (scans / convert errors / guards).
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
import { fireEvent, getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useToastStore } from '@melite/card-base/client'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

describe('coverage sweep (scans / convert errors / guards)', () => {
  async function mountedNoRun(params: Record<string, unknown> = {}) {
    stubLoads()
    const m = mountEditor({ params })
    await waitForText('No motion yet')
    return m
  }

  test('npz resolves via the artifacts scan', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { render: 'https://host/r.npz' } } })
    await waitForText('30 fps · 4f')
  })

  test('npz resolves via assetUrls', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: {}, assetUrls: ['https://host/a.npz'] } })
    await waitForText('30 fps · 4f')
  })

  test('no npz anywhere holds the rest pose', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: {}, assetUrls: [] } })
    await waitForText('No motion yet')
    expect(document.body.textContent).not.toContain('fps ·')
    expect((document.body.querySelector('[aria-label="Play (Space)"]') as HTMLButtonElement).disabled).toBe(true)
  })

  test('empty undo and redo stacks are silent no-ops', async () => {
    await mountedNoRun()
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true })
    await new Promise((r) => setTimeout(r, 300))
    expect(document.body.querySelectorAll('[data-prompt-clip]').length).toBe(1)
  })

  test('meta-key undo and ctrl-Y redo travel the stack', async () => {
    await mountedNoRun()
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 1) throw new Error('no meta-undo yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no ctrl-Y redo yet')
    }, { timeout: 10000 })
  })

  test('prompts hydrate from a persisted multi-segment payload', async () => {
    await mountedNoRun({
      motion_prompts: JSON.stringify([
        { text: 'hello', duration_sec: 2 },
        { text: 'world', duration_sec: 3 },
      ]),
    })
    await waitForText('hello')
    await waitForText('world')
    expect(document.body.querySelectorAll('[data-prompt-clip]').length).toBe(2)
  })

  test('a single prompt param seeds the blank card text', async () => {
    await mountedNoRun({ prompt: 'solo take' })
    await waitForText('solo take')
  })

  test('retyping then splitting keeps three cards', async () => {
    await mountedNoRun()
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    const clips = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    for (const [i, c] of clips.entries()) {
      fireEvent.doubleClick(c, { button: 0 })
      await vi.waitFor(() => {
        if (!c.querySelector('input')) throw new Error('no editor yet')
      }, { timeout: 10000 })
      const input = c.querySelector('input') as HTMLInputElement
      fireEvent.change(input, { target: { value: `take ${i}` } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    await waitForText('take 1')
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 3) throw new Error('no third card yet')
    }, { timeout: 10000 })
  })

  test('double stamp updates the bound keyframe', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    // pin frame 0: the live-bind only writes while the stamped frame is current
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
    const stamp = () => getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement
    fireEvent.click(stamp())
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no stamped kf yet')
    }, { timeout: 10000 })
    fireEvent.click(stamp())
    await vi.waitFor(() => {
      const updated = useToastStore.getState().toasts.some((t) => t.message.includes('Updated keyframe'))
      if (!updated) throw new Error('no update toast yet')
    }, { timeout: 10000 })
    // a further authoring op snapshots the non-empty payload map
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
  })

  test('a slow queue ticks before landing', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'slow' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    // the rigged fetch 404s after the ticked run completes
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no slow-convert toast yet')
    }, { timeout: LOADED_WAIT() * 5 / 6 })
  }, 40000)

  test('a typed duration seeds the envelope', async () => {
    stubLoads()
    mountEditor({ params: { duration_sec: 7 } })
    await waitForText('No motion yet')
  })

  test('an artifact-less upstream harvests to nothing', async () => {
    stubLoads()
    mountEditor({ params: {} }, {
      upstreams: [{ id: 'g0', title: 'older', kind: 'image', service: 'x', params: {}, result: {} }],
    })
    await waitForText('No motion yet')
  })

  test('a self-led upstream list slices the past only', async () => {
    stubLoads()
    const self = { id: 'm1', title: 'Motion', kind: 'motion', service: 'x', params: {}, result: {} }
    const down = { id: 'd9', title: 'later', kind: 'image', service: 'x', params: {}, result: {} }
    mountEditor({ params: {} }, { upstreams: [self, down] })
    await waitForText('No motion yet')
  })

  test('a body-less refusal still fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500, startEmptyBody: true })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('generate failed: HTTP 500'))
      if (!failed) throw new Error('no empty-refusal toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a kept refine re-enters from the payload', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no stamped kf yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Done').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Refine pose')) throw new Error('not out of edit yet')
    }, { timeout: 10000 })
    // re-entering at the same pinned frame reads the kept joints and the
    // bound payload back out
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not back in edit yet')
    }, { timeout: 10000 })
  })

  test('a refused queue start fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('generate failed: HTTP 500'))
      if (!failed) throw new Error('no refused toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a non-JSON queue answer fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startRaw: 'not-json{' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('non-JSON body'))
      if (!failed) throw new Error('no non-JSON toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a run_id-less queue answer fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startRaw: '{}' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('no run_id'))
      if (!failed) throw new Error('no run_id toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a refused draft compose fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, draftsStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('card compose refused'))
      if (!failed) throw new Error('no compose toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a vanished run fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 404 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('is gone'))
      if (!failed) throw new Error('no gone toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a rigless run result fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'completed-noglb' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('produced no rigged GLB'))
      if (!failed) throw new Error('no noglb toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)



  test('stage file drops route by type', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const target = document.body.querySelector('[data-export-rect]') as HTMLElement
    const glb = new File(['glb-bytes'], 'drop.glb', { type: 'model/gltf-binary' })
    fireEvent.drop(target, { dataTransfer: { types: ['Files'], getData: () => '', files: [glb] } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no drop-body toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    const png = new File(['png-bytes'], 'drop.png', { type: 'image/png' })
    fireEvent.drop(target, { dataTransfer: { types: ['Files'], getData: () => '', files: [png] } })
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) =>
        typeof (p as Record<string, unknown>).motion_bg_image === 'string' &&
        ((p as Record<string, unknown>).motion_bg_image as string).startsWith('data:'))
      if (!call) throw new Error('drop bg not persisted yet')
    }, { timeout: 10000 })
  }, 30000)

  test('bg pick square arms the source menu — never a private pick', async () => {
    const { onSave } = await mountedNoRun()
    // THE ESTATE SQUARE (the motion-params audit F4): the click opens
    // the ONE source menu (From flow / From media / From file) — the
    // seat, not a bespoke button; an open menu writes no param.
    fireEvent.click(getByRole(document.body, 'button', { name: 'Background source' }))
    await vi.waitFor(() => {
      if (!getByRole(document.body, 'menuitem', { name: 'From file' })) throw new Error('no From file row yet')
    }, { timeout: 10000 })
    expect(getByRole(document.body, 'menuitem', { name: 'From media' })).toBeTruthy()
    const touched = onSave.mock.calls.some(([p]) => 'motion_bg_image' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('stage drag-over and leave are silent', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const target = document.body.querySelector('[data-export-rect]') as HTMLElement
    const dt = { types: ['application/tech-noir-asset'], getData: () => '', files: [] }
    fireEvent.dragOver(target, { dataTransfer: dt })
    fireEvent.dragLeave(target)
    await new Promise((r) => setTimeout(r, 300))
    const touched = onSave.mock.calls.some(([p]) =>
      'motion_bg_image' in (p as Record<string, unknown>) || 'preview_glb' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('rect right-click never starts a drag', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const rect = document.body.querySelector('[data-export-rect]') as HTMLElement
    const before = `${rect.style.left}|${rect.style.top}|${rect.style.width}|${rect.style.height}`
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      fireEvent.pointerDown(rect, { clientX: 400, clientY: 50, button: 2 })
      fireEvent.pointerMove(rect, { clientX: 460, clientY: 50 })
      fireEvent.pointerUp(rect, { clientX: 460, clientY: 50 })
      fireEvent.pointerMove(rect, { clientX: 500, clientY: 50 })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
    await new Promise((r) => setTimeout(r, 500))
    const after = `${rect.style.left}|${rect.style.top}|${rect.style.width}|${rect.style.height}`
    expect(after).toBe(before)
  })

  test('other corners anchor their opposites', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const styleOf = () => {
      const r = document.body.querySelector('[data-export-rect]') as HTMLElement
      return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
    }
    const drag = (corner: string, fx: number, tx: number, fy: number, ty: number) => {
      const proto = Element.prototype.getBoundingClientRect
      Element.prototype.getBoundingClientRect = function () {
        return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
      }
      try {
        const el = document.body.querySelector(`[data-export-corner="${corner}"]`) as HTMLElement
        fireEvent.pointerDown(el, { clientX: fx, clientY: fy, button: 0 })
        fireEvent.pointerMove(el, { clientX: tx, clientY: ty })
        fireEvent.pointerUp(el, { clientX: tx, clientY: ty })
      } finally {
        Element.prototype.getBoundingClientRect = proto
      }
    }
    // inward per anchor: nw shrinks down-right, ne shrinks left-down
    // (growing hits the full-height cap and re-derives identically)
    const before = styleOf()
    drag('nw', 400, 440, 225, 250)
    await vi.waitFor(() => {
      if (styleOf() === before) throw new Error('nw did not move yet')
    }, { timeout: 10000 })
    const mid = styleOf()
    drag('ne', 400, 360, 225, 250)
    await vi.waitFor(() => {
      if (styleOf() === mid) throw new Error('ne did not move yet')
    }, { timeout: 10000 })
  })

  test('a tall output floors the corner math the other way', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
    const w = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
    fireEvent.change(w, { target: { value: '4096' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
      if (cur.value !== '4096') throw new Error('width not set yet')
    }, { timeout: 10000 })
    // retyping the settled value hits the same-value arm (no-op write)
    fireEvent.change(document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement, { target: { value: '4096' } })
    await new Promise((r) => setTimeout(r, 300))
    const styleOf = () => {
      const r = document.body.querySelector('[data-export-rect]') as HTMLElement
      return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
    }
    const before = styleOf()
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      const el = document.body.querySelector('[data-export-corner="se"]') as HTMLElement
      fireEvent.pointerDown(el, { clientX: 400, clientY: 225, button: 0 })
      fireEvent.pointerMove(el, { clientX: 360, clientY: 200 })
      fireEvent.pointerUp(el, { clientX: 360, clientY: 200 })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
    await vi.waitFor(() => {
      if (styleOf() === before) throw new Error('tall corner did not move yet')
    }, { timeout: 10000 })
  })

  test('slot file drops route by type', async () => {
    await mountedNoRun()
    const square = document.body.querySelector('[data-motion-body] [data-slot-square]') as HTMLElement
    const glb = new File(['glb-bytes'], 'square.glb', { type: 'model/gltf-binary' })
    fireEvent.drop(square, { dataTransfer: { types: ['Files'], getData: () => '', files: [glb] } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no square-body toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  })

  test('stage drag-over parades the drop veil', async () => {
    await mountedNoRun()
    const frame = document.body.querySelector('[data-slot="viewport-frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    fireEvent.dragOver(frame, { dataTransfer: { types: ['text/plain'], getData: () => '' } })
    await new Promise((r) => setTimeout(r, 300))
    expect(queryByText(document.body, /Drop a GLB to set the preview body/)).toBeNull()
    fireEvent.dragOver(frame, { dataTransfer: { types: ['Files'], getData: () => '' } })
    await waitForText('Drop a GLB to set the preview body')
    fireEvent.dragLeave(frame)
    await vi.waitFor(() => {
      if (queryByText(document.body, /Drop a GLB to set the preview body/)) throw new Error('veil still there')
    }, { timeout: 10000 })
  }, 20000)

  test('existing preview urls ride into the dialog', async () => {
    stubLoads()
    mountEditor({
      result: {
        artifacts: { motion_npz: MOTION_URL },
        motionPreviews: [{ url: 'https://host/p.glb' }],
      },
    })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
  })

  test('a urlless preview list yields no dialog preview', async () => {
    stubLoads()
    mountEditor({
      result: {
        artifacts: { motion_npz: MOTION_URL },
        motionPreviews: [{ name: 'no-url-here' }],
      },
    })
    await waitForText('30 fps · 4f')
  })

  test('dialog close drops the curtain', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Close"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('still open')
    }, { timeout: 10000 })
  })

  test('dialog frame slider seeks and pauses', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    // RULE B: the rail's SpecPanel now owns range inputs too (the
    // generic form's sliders) — the DIALOG's scrub slider is the one
    // inside the scrub row, never "first range in body".
    const scrubSel = '[class*="scrubRow"] input[type="range"]'
    await vi.waitFor(() => {
      if (!document.body.querySelector(scrubSel)) throw new Error('no slider yet')
    }, { timeout: 10000 })
    const range = document.body.querySelector(scrubSel) as HTMLInputElement
    fireEvent.change(range, { target: { value: '2' } })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('00:00:02')) throw new Error('no seek yet')
    }, { timeout: 10000 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
  })
})
