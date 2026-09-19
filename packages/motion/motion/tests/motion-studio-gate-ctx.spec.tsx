// @vitest-environment happy-dom
/**
 * motion studio IV — gate tails behind a stubbed 3D viewer
 * (useMotionMedia thumbnail + background arms, usePoseEditing joint-move
 * arms, handleBodyFile read arms).
 *
 * PoseViewer3D needs a real WebGL stage to hand back a three context, so
 * headless it never sets threeCtxRef — the thumbnail/background effects
 * can only run their context arms against a stub. The stub stands in for
 * the viewer ONLY: it publishes a test-driven fake context (real
 * THREE.Scene, scripted canvas toBlob), exposes onJointMove triggers for
 * the FK/IK/empty joint rows, and echoes editableJoints into the DOM so
 * each move asserts a real prop flow. Everything else (skin, motion,
 * timeline, toasts, stores) is the real editor, mounted with the standard
 * no-act pattern (vi.waitFor / waitForText polls, resetStudio() after).
 */
import { fireEvent, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { useToastStore } from '@melite/card-base/toast'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

const viewerCtl = vi.hoisted(() => ({
  ctx: null as unknown,
  toBlob: null as null | ((cb: (b: Blob | null) => void) => void),
}))

vi.mock('@melite-plugin/motion/ui/viewer3d', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>()
  const ReactMod = await import('react')
  const h = ReactMod.createElement
  function StubViewer(props: Record<string, any>) {
    ReactMod.useEffect(() => {
      if (props.threeCtxRef) props.threeCtxRef.current = viewerCtl.ctx
      return () => {
        if (props.threeCtxRef) props.threeCtxRef.current = null
      }
    }, [])
    const ej = props.editableJoints as Float32Array | null | undefined
    return h(
      'div',
      { 'data-viewer-stub': '1' },
      h('div', { 'data-stub-editable': ej ? Array.from(ej.slice(0, 2)).join(',') : 'none' }),
      h(
        'button',
        {
          'data-stub-fk': '1',
          onClick: () =>
            props.onJointMove?.({ idx: 0, position: { x: 11.5, y: 22.5, z: 33.5 } }),
        },
        'stub-fk-move',
      ),
      h(
        'button',
        {
          'data-stub-ik': '1',
          onClick: () =>
            props.onJointMove?.({
              idx: 1,
              position: { x: 1, y: 2, z: 3 },
              fullJoints: new Float32Array(77 * 3).fill(7),
            }),
        },
        'stub-ik-move',
      ),
    )
  }
  return { ...mod, PoseViewer3D: StubViewer }
})

const readCtl = vi.hoisted(() => ({
  fn: null as null | ((f: Blob) => Promise<string>),
}))

vi.mock('@melite/card-base/chrome', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>()
  const real = mod.readAsDataURL as (f: Blob) => Promise<string>
  return {
    ...mod,
    readAsDataURL: (f: Blob) => (readCtl.fn ? readCtl.fn(f) : real(f)),
  }
})

afterEach(() => {
  viewerCtl.ctx = null
  viewerCtl.toBlob = null
  readCtl.fn = null
  resetStudio()
})

const MIME = 'application/tech-noir-asset'

const THUMB_KEY = 'motion-card-thumbnails'

function makeCtx() {
  return {
    gl: {
      render: () => {},
      domElement: { toBlob: (cb: (b: Blob | null) => void) => viewerCtl.toBlob?.(cb) },
    },
    scene: new THREE.Scene(),
    camera: {},
  }
}

function thumbs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(THUMB_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function stubEditable(): string | null {
  return document.body.querySelector('[data-stub-editable]')?.getAttribute('data-stub-editable') ?? null
}

/** Buttons by visible label — the edit-mode hint bar repeats some labels
 *  (Repose, Stamp) as prose, so getByText is ambiguous; buttons are unique. */
function railButton(label: string): HTMLButtonElement {
  const hit = [...document.body.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  )
  if (!hit) throw new Error(`no button labelled ${label}`)
  return hit as HTMLButtonElement
}

function click(query: string): void {
  const el = document.body.querySelector(query) as HTMLButtonElement
  if (!el) throw new Error(`missing ${query}`)
  fireEvent.click(el)
}

async function mountedRun(id: string, motionT = 4) {
  stubLoads({ motionT })
  const m = mountEditor(
    { id, result: { artifacts: { motion_npz: MOTION_URL } } },
  )
  await waitForText(`30 fps · ${motionT}f`)
  return m
}

async function refine(): Promise<void> {
  fireEvent.click(railButton('Refine pose'))
  await vi.waitFor(() => {
    getByText(document.body, 'Done')
  }, { timeout: 10000 })
}

describe('thumbnail capture', () => {
  test('a rendered stage captures a thumbnail for the card', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(new Blob(['x'.repeat(400)], { type: 'image/png' }))
    await mountedRun('thumb-cap')
    await vi.waitFor(() => {
      const t = thumbs()['thumb-cap']
      if (typeof t !== 'string' || !t.startsWith('data:')) throw new Error('no thumbnail yet')
    }, { timeout: 20000 })
  }, 60000)

  test('a null canvas blob captures nothing', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(null)
    await mountedRun('thumb-null')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1500))
    expect(thumbs()['thumb-null']).toBeUndefined()
  }, 60000)

  test('a runt canvas blob captures nothing', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(new Blob(['tiny'], { type: 'image/png' }))
    await mountedRun('thumb-tiny')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1500))
    expect(thumbs()['thumb-tiny']).toBeUndefined()
  }, 60000)

  test('a short data URL captures nothing', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(new Blob(['x'.repeat(400)], { type: 'image/png' }))
    readCtl.fn = async () => 'data:short'
    await mountedRun('thumb-short')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1500))
    expect(thumbs()['thumb-short']).toBeUndefined()
  }, 60000)

  test('a failed data-URL read captures nothing', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(new Blob(['x'.repeat(400)], { type: 'image/png' }))
    readCtl.fn = async () => { throw new Error('thumb blew up') }
    await mountedRun('thumb-fail')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1500))
    expect(thumbs()['thumb-fail']).toBeUndefined()
  }, 60000)

  test('a settled load never captures the same URL twice', async () => {
    // allVertsM lands twice per load (frame-0 seed, then the full
    // precompute) — the thumbnail effect re-runs for the second landing,
    // sees the capture ref already stamped for this URL, and skips. A
    // long (T=600) load with instant reads makes the order deterministic:
    // the seed capture completes mid-precompute, so exactly one read
    // happens for the whole mount.
    let reads = 0
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(new Blob(['x'.repeat(400)], { type: 'image/png' }))
    readCtl.fn = async () => {
      reads++
      return `data:image/png;base64,${'y'.repeat(200)}`
    }
    stubLoads({ motionT: 600 })
    mountEditor({ id: 'thumb-once', result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 600f')
    await vi.waitFor(() => {
      if (typeof thumbs()['thumb-once'] !== 'string') throw new Error('no thumbnail yet')
    }, { timeout: 20000 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 60000 })
    await new Promise((r) => setTimeout(r, 1500))
    expect(reads).toBe(1)
  }, 90000)
})

describe('background effect', () => {
  test('a dropped image textures the scene; clear disposes back to the void color', async () => {
    const ctx = makeCtx()
    viewerCtl.ctx = ctx
    const disposeSpy = vi.spyOn(THREE.Texture.prototype, 'dispose')
    await mountedRun('bg-life')
    // mount with no background: the void color arm.
    await vi.waitFor(() => {
      const bg = (ctx.scene.background as unknown as { isColor?: boolean }) ?? null
      if (!bg || bg.isColor !== true) throw new Error('no void color yet')
    }, { timeout: 10000 })
    // drop an image on the live export rect → bgImage → texture arm.
    fireEvent.click(railButton('Export'))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    fireEvent.drop(document.body.querySelector('[data-export-rect]') as HTMLElement, {
      dataTransfer: {
        types: [MIME],
        getData: () => JSON.stringify({ url: 'https://host/bg.png' }),
        files: [],
      },
    })
    await vi.waitFor(() => {
      const bg = (ctx.scene.background as unknown as { isTexture?: boolean }) ?? null
      if (!bg || bg.isTexture !== true) throw new Error('no bg texture yet')
    }, { timeout: 10000 })
    expect(disposeSpy).not.toHaveBeenCalled()
    fireEvent.click(railButton('Clear'))
    await vi.waitFor(() => {
      const bg = (ctx.scene.background as unknown as { isColor?: boolean }) ?? null
      if (!bg || bg.isColor !== true) throw new Error('no void color after clear yet')
    }, { timeout: 10000 })
    // the old texture was disposed (no GPU leak) — the dispose arm.
    expect(disposeSpy).toHaveBeenCalled()
  }, 60000)
})

describe('joint moves', () => {
  test('an FK drag edits one joint and stays live-bind free without a keyframe', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(null)
    await mountedRun('joint-fk-free')
    await refine()
    const before = stubEditable()
    click('[data-stub-fk]')
    await vi.waitFor(() => {
      const after = stubEditable()
      if (after === null || after === before) throw new Error('joint did not move yet')
    }, { timeout: 10000 })
    // the FK write lands on joint 0 (11.5, 22.5 echoed in cm).
    expect(stubEditable()).toContain('11.5')
    // no keyframe at frame 1: no Stamp toast, no constraint save.
    const stamped = useToastStore.getState().toasts.some((t) => t.message.includes('keyframe'))
    expect(stamped).toBe(false)
  }, 60000)

  test('an FK drag into a bound keyframe rewrites its payload', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(null)
    const { onSave } = await mountedRun('joint-fk-bound')
    await refine()
    fireEvent.click(railButton('Stamp'))
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) => t.message.includes('Stamped authored pose'))
      if (!hit) throw new Error('no stamp yet')
    }, { timeout: 10000 })
    const constraints = () =>
      onSave.mock.calls
        .map(([p]) => p as Record<string, unknown>)
        .filter((p) => typeof p.motion_constraints === 'string')
        .map((p) => JSON.parse(p.motion_constraints as string) as {
          fullbody: { frame: number; jp: string }[]
        })
    const firstJp = constraints().at(-1)?.fullbody[0]?.jp
    click('[data-stub-fk]')
    await vi.waitFor(() => {
      const last = constraints().at(-1)
      if (!last || last.fullbody.length !== 1 || last.fullbody[0].frame !== 0) {
        throw new Error('no rebound payload yet')
      }
      if (last.fullbody[0].jp === firstJp) throw new Error('payload not rewritten yet')
    }, { timeout: 10000 })
  }, 60000)

  test('an IK report replaces the whole joint set', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(null)
    await mountedRun('joint-ik')
    await refine()
    click('[data-stub-ik]')
    await vi.waitFor(() => {
      if (stubEditable() !== '7,7') throw new Error('IK set not applied yet')
    }, { timeout: 10000 })
  }, 60000)

  test('a move with no edit session is a silent no-op', async () => {
    viewerCtl.ctx = makeCtx()
    viewerCtl.toBlob = (cb) => cb(null)
    await mountedRun('joint-none')
    expect(stubEditable()).toBe('none')
    click('[data-stub-fk]')
    await new Promise((r) => setTimeout(r, 800))
    expect(stubEditable()).toBe('none')
    expect(useToastStore.getState().toasts).toEqual([])
  }, 60000)
})

describe('body file reads', () => {
  test('an unreadable GLB toasts the read error', async () => {
    readCtl.fn = async () => { throw new Error('disk blew up') }
    stubLoads()
    mountEditor()
    await waitForText('No motion yet')
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['glb-bytes'], 'body.glb', { type: 'model/gltf-binary' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) => t.message.includes('Could not read GLB: disk blew up'))
      if (!hit) throw new Error('no read toast yet')
    }, { timeout: 10000 })
  }, 30000)

  test('an off-Error read failure toasts the raw value', async () => {
    readCtl.fn = async () => { throw 'string-disk-blowup' }
    stubLoads()
    mountEditor()
    await waitForText('No motion yet')
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['glb-bytes'], 'body.glb', { type: 'model/gltf-binary' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) =>
        t.message.includes('Could not read GLB: string-disk-blowup'))
      if (!hit) throw new Error('no raw read toast yet')
    }, { timeout: 10000 })
  }, 30000)
})
