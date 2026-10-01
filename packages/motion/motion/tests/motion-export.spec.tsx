// @vitest-environment happy-dom
/**
 * motion export dialog — the manual-framing export surface. Renders
 * through the lane's React-19-pure harness (see tests/harness.tsx);
 * the 3D context is a headless fake (a real PerspectiveCamera + Scene
 * for the projection math, a stub gl for the screenshot passes),
 * canvas 2d + Image + anchor-click + object-URL are platform fakes,
 * downloads assert through the captured anchor attrs. No module mocks.
 */
import { fireEvent, getByLabelText, getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h, type ReactElement } from 'react'
import * as THREE from 'three'

import {
  DEFAULT_STAGE_RECT, MotionExportDialog, type StageRect,
} from '../src/ui/studio/MotionExportDialog.tsx'
import { useToastStore } from '@melite/card-base/client'
import { act, cleanup19, render19 } from './harness.tsx'

const SHOT = 'data:image/png;base64,SHOT'

afterEach(async () => {
  FakeImage.mode = 'load'
  await cleanup19()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  useToastStore.setState({ toasts: [] })
  localStorage.clear()
})

/** The 2d stub (every member the dialog + openpose canvas touch). */
function stub2d(record?: { fillStyles: string[] }) {
  const store: Record<string, unknown> = {}
  const ctx = new Proxy(store, {
    get: (t, p) => {
      if (typeof p !== 'string') return undefined
      const key = `__fn_${p}`
      if (!(key in t)) t[key] = vi.fn()
      return p in t ? t[p] : t[key]
    },
    set: (t, p, v) => {
      t[p as string] = v
      if (p === 'fillStyle' && record) record.fillStyles.push(v as string)
      return true
    },
  })
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}

/** Image with a scriptable load (happy-dom never fires onload). */
class FakeImage {
  static mode: 'load' | 'error' | 'hang' = 'load'
  width = 64
  height = 64
  onload: (() => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  private _src = ''
  set src(v: string) {
    this._src = v
    if (FakeImage.mode === 'load') queueMicrotask(() => this.onload?.())
    else if (FakeImage.mode === 'error') queueMicrotask(() => this.onerror?.(new Error('bad png')))
  }
  get src(): string { return this._src }
}

/** Captured browser downloads (the ONE delivery path). */
const downloads: Array<{ href: string; download: string }> = []
function stubDelivery() {
  downloads.length = 0
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ href: this.href, download: this.download })
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
}

function makeNpz(T = 3, fps = 60) {
  const posedJoints = new Float32Array(T * 77 * 3)
  const roots = [[0, 0.9, 0], [0.5, 0.9, 0.3], [-0.2, 0.9, 0.1]]
  for (let f = 0; f < T; f++) {
    posedJoints.set(roots[f % roots.length]!, f * 77 * 3)
    for (let j = 1; j < 77; j++) {
      posedJoints[(f * 77 + j) * 3] = Math.sin(j) * 0.3
      posedJoints[(f * 77 + j) * 3 + 1] = 0.9 + (j % 10) * 0.05
      posedJoints[(f * 77 + j) * 3 + 2] = Math.cos(j) * 0.3
    }
  }
  return { posedJoints, globalRotMats: new Float32Array(T * 77 * 9), fps, T }
}

function makeDisplay(noseBehindCamera = false) {
  const a = new Float32Array(77 * 3)
  for (let j = 0; j < 77; j++) {
    a[j * 3] = Math.sin(j) * 0.3
    a[j * 3 + 1] = 0.9 + (j % 10) * 0.05
    a[j * 3 + 2] = Math.cos(j) * 0.3
  }
  if (noseBehindCamera) {
    a[6 * 3] = 0
    a[6 * 3 + 1] = 1.6
    a[6 * 3 + 2] = 10 // behind the camera — the invisible arm
  }
  return a
}

function makeGl(over: Record<string, number> = {}) {
  const domElement = {
    clientWidth: 800, clientHeight: 600, width: 800, height: 600,
    toDataURL: (_t: string) => SHOT,
    ...over,
  }
  return {
    domElement,
    setSize: vi.fn((w: number, hh: number) => {
      domElement.width = w
      domElement.height = hh
    }),
    render: vi.fn(),
  }
}

function makeCtx(bg: THREE.Color | null = new THREE.Color('#101018')) {
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 100)
  camera.position.set(0, 1.2, 3.4)
  camera.lookAt(0, 0.9, 0)
  camera.updateMatrixWorld()
  const scene = new THREE.Scene()
  scene.background = bg
  const gl = makeGl()
  return { camera, scene, gl }
}

function baseProps(over: Record<string, unknown> = {}): Record<string, unknown> {
  const ctx = makeCtx()
  return {
    open: true,
    onClose: vi.fn(),
    npz: makeNpz(),
    npzUrl: 'https://host/m.npz',
    glbUrl: 'https://host/m.glb',
    frameIdx: 0,
    onFrameChange: vi.fn(),
    displayJointsM: makeDisplay(),
    liftY: 0.05,
    inPlace: false,
    threeCtxRef: { current: { gl: ctx.gl, scene: ctx.scene, camera: ctx.camera } },
    stageRect: { x: 0.25, y: 0.1, w: 0.5, h: 0.8 } as StageRect,
    onStageRectChange: vi.fn(),
    outW: 768,
    outH: 1024,
    onOutSize: vi.fn(),
    ...over,
  }
}

async function mountDialog(over: Record<string, unknown> = {}) {
  const props = baseProps(over)
  const { container, rerender } = await render19(h(MotionExportDialog, props as never))
  return { container, rerender, props }
}

function exportBtn(label: string | RegExp): HTMLElement {
  return getByRole(document.body, 'button', { name: label })
}

async function enableMode(label: string): Promise<void> {
  await act(async () => {
    fireEvent.click(getByText(document.body, label))
  })
}

describe('chrome', () => {
  test('closed renders nothing', async () => {
    await mountDialog({ open: false })
    expect(document.body.textContent).not.toContain('Export Motion')
  })

  test('header chip, scopes, and the downloads door', async () => {
    await mountDialog()
    expect(document.body.textContent).toContain('frame 1/3')
    await act(async () => {
      fireEvent.click(getByText(document.body, '8-angle batch'))
    })
    expect(exportBtn(/Export 8 angles/)).toBeTruthy()
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    expect(exportBtn(/Export files/)).toBeTruthy()
    expect(document.body.textContent).toContain('NPZ + GLB')
  })

  test('downloads stays shut pre-run (disabled + titled)', async () => {
    await mountDialog({ npzUrl: null })
    const btn = getByText(document.body, 'Downloads').closest('button') as HTMLButtonElement
    expect(btn.hasAttribute('disabled')).toBe(true)
    expect(btn.getAttribute('title')).toContain('Run the card first')
    expect(document.body.textContent).toContain('needs a run')
  })

  test('both close paths call onClose', async () => {
    const { props } = await mountDialog()
    const onClose = props.onClose as ReturnType<typeof vi.fn>
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Close').closest('button') as HTMLButtonElement)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    await act(async () => {
      fireEvent.click(document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement)
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('framing inputs', () => {
  test('rect percents clamp the far edge inside', async () => {
    const { props } = await mountDialog()
    const x = getByLabelText(document.body, 'Rectangle x position (percent)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(x, { target: { value: '90' } })
    })
    // 90% clamps to 1 - w = 0.5
    expect(props.onStageRectChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ x: 0.5 }),
    )
    const y = getByLabelText(document.body, 'Rectangle y position (percent)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(y, { target: { value: '200' } })
    })
    expect(props.onStageRectChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ y: 0.19999999999999996 }),
    )
    expect(document.body.textContent).toContain('768 × 1024')
  })

  test('rect inputs disarm without the write channel', async () => {
    await mountDialog({ onStageRectChange: undefined })
    const x = getByLabelText(document.body, 'Rectangle x position (percent)') as HTMLInputElement
    expect(x.hasAttribute('disabled')).toBe(true)
  })

  test('output pixels clamp 8..4096 and round', async () => {
    const { props } = await mountDialog()
    const w = getByLabelText(document.body, 'Output width (pixels)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(w, { target: { value: '5000' } })
    })
    expect(props.onOutSize as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(4096, 1024)
    const hh = getByLabelText(document.body, 'Output height (pixels)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(hh, { target: { value: '1' } })
    })
    expect(props.onOutSize as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(768, 8)
  })

  test('non-numeric values hit the finite backstops', async () => {
    const { props } = await mountDialog()
    const onRect = props.onStageRectChange as ReturnType<typeof vi.fn>
    const onSize = props.onOutSize as ReturnType<typeof vi.fn>
    // number inputs sanitize (happy-dom: 'abc' -> ''), so coerce past
    // the platform the way a non-sanitizing browser would surface it
    const coerce = (el: HTMLInputElement): void => {
      let v = 'abc'
      Object.defineProperty(el, 'value', {
        get: () => v,
        set: (nv: string) => { v = nv },
        configurable: true,
      })
    }
    const x = getByLabelText(document.body, 'Rectangle x position (percent)') as HTMLInputElement
    coerce(x)
    await act(async () => {
      fireEvent.change(x)
    })
    const w = getByLabelText(document.body, 'Output width (pixels)') as HTMLInputElement
    coerce(w)
    await act(async () => {
      fireEvent.change(w)
    })
    expect(onRect).not.toHaveBeenCalled()
    expect(onSize).not.toHaveBeenCalled()
  })

  test('forced changes on disarmed inputs hit the backstops', async () => {
    const { props } = await mountDialog({ onStageRectChange: undefined, onOutSize: undefined })
    const x = getByLabelText(document.body, 'Rectangle x position (percent)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(x, { target: { value: '50' } })
    })
    expect(props.onStageRectChange as unknown).toBeUndefined()
    const w = getByLabelText(document.body, 'Output width (pixels)') as HTMLInputElement
    await act(async () => {
      fireEvent.change(w, { target: { value: '500' } })
    })
    expect(props.onOutSize as unknown).toBeUndefined()
  })

  test('out inputs disarm without the write channel', async () => {
    await mountDialog({ onOutSize: undefined })
    expect(
      (getByLabelText(document.body, 'Output width (pixels)') as HTMLInputElement).hasAttribute('disabled'),
    ).toBe(true)
  })

  test('frame presets call through, or fall back to the rect channel', async () => {
    const onFramePreset = vi.fn()
    await mountDialog({ onFramePreset })
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Reset frame'))
    })
    expect(onFramePreset).toHaveBeenCalledWith('reset')
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Whole stage'))
    })
    expect(onFramePreset).toHaveBeenCalledWith('whole')
    await cleanup19()
    const { props } = await mountDialog()
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Reset frame'))
    })
    expect(props.onStageRectChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(DEFAULT_STAGE_RECT)
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Whole stage'))
    })
    expect(props.onStageRectChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ x: 0, y: 0, w: 1, h: 1 })
  })
})

describe('render modes', () => {
  test('toggle on/off drives the warn + the export gate', async () => {
    await mountDialog()
    expect(document.body.textContent).toContain('pick at least one')
    expect((exportBtn(/Export the frame/) as HTMLButtonElement).hasAttribute('disabled')).toBe(true)
    await enableMode('Raw mesh')
    expect(queryByText(document.body, 'pick at least one')).toBeNull()
    expect((exportBtn(/Export the frame/) as HTMLButtonElement).hasAttribute('disabled')).toBe(false)
    await enableMode('Raw mesh')
    expect(document.body.textContent).toContain('pick at least one')
  })

  test('summary names the files per scope', async () => {
    await mountDialog()
    expect(document.body.textContent).toContain('no modes selected')
    await enableMode('Depth')
    expect(document.body.textContent).toContain('stage_depth.png')
    await act(async () => {
      fireEvent.click(getByText(document.body, '8-angle batch'))
    })
    expect(document.body.textContent).toContain('{angle}_depth.png')
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    expect(document.body.textContent).toContain('Raw motion NPZ + baked GLB')
    expect(document.body.textContent).toContain('GLB preview available for download')
  })

  test('downloads summary without a GLB', async () => {
    await mountDialog({ glbUrl: null })
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    expect(document.body.textContent).toContain('Raw motion NPZ')
    expect(document.body.textContent).not.toContain('GLB preview available')
  })
})

describe('frame scrubber', () => {
  test('hidden at T=1 and without the write channel', async () => {
    await mountDialog({ npz: makeNpz(1) })
    expect(document.querySelector('input[type="range"]')).toBeNull()
    await cleanup19()
    await render19(h(MotionExportDialog, baseProps({ onFrameChange: undefined }) as never))
    expect(document.querySelector('input[type="range"]')).toBeNull()
  })

  test('steps walk the ends; the slider writes through', async () => {
    const { props } = await mountDialog({ frameIdx: 0 })
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider).not.toBeNull()
    await act(async () => {
      fireEvent.change(slider, { target: { value: '2' } })
    })
    expect(props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(2)
  })

  test('step buttons disarm at the rails and walk inside', async () => {
    const { props } = await mountDialog({ frameIdx: 0 })
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement
    const [back, fwd] = [...(slider.parentElement as HTMLElement).querySelectorAll('button')]
    expect((back as HTMLButtonElement).hasAttribute('disabled')).toBe(true)
    await act(async () => {
      fireEvent.click(fwd as HTMLButtonElement)
    })
    expect(props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(1)
    await cleanup19()
    const last = await mountDialog({ frameIdx: 2 })
    const slider2 = document.querySelector('input[type="range"]') as HTMLInputElement
    const [back2, fwd2] = [...(slider2.parentElement as HTMLElement).querySelectorAll('button')]
    expect((fwd2 as HTMLButtonElement).hasAttribute('disabled')).toBe(true)
    await act(async () => {
      fireEvent.click(back2 as HTMLButtonElement)
    })
    expect(last.props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(1)
  })

  test('play advances at fps then parks at T', async () => {
    const npz = makeNpz(2, 120)
    let rerender!: (ui: ReactElement) => Promise<void>
    const seen: number[] = []
    const onFrameChange = (f: number): void => {
      seen.push(f)
      // the parent's half of the contract: the new frame re-renders in
      void rerender(h(MotionExportDialog, baseProps({ npz, frameIdx: f, onFrameChange }) as never))
    }
    const mounted = await render19(
      h(MotionExportDialog, baseProps({ npz, frameIdx: 0, onFrameChange }) as never),
    )
    rerender = mounted.rerender
    await act(async () => {
      fireEvent.click(exportBtn('Play preview'))
    })
    expect(exportBtn('Pause preview')).toBeTruthy()
    await vi.waitFor(() => {
      expect(seen).toContain(1)
    })
    // parks at T=2: next=2 >= 2 stops the loop, label flips back
    await vi.waitFor(() => {
      expect(document.body.querySelector('[aria-label="Play preview"]')).not.toBeNull()
    }, { timeout: 4000 })
    expect(seen).toEqual([1])
  })

  test('fps 0 falls back to 30', async () => {
    const { props } = await mountDialog({ npz: makeNpz(2, 0) })
    await act(async () => {
      fireEvent.click(exportBtn('Play preview'))
    })
    await vi.waitFor(() => {
      expect(props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    }, { timeout: 4000 })
  })

  test('closing the dialog parks the loop', async () => {
    const { rerender, props } = await mountDialog({ npz: makeNpz(5, 120) })
    await act(async () => {
      fireEvent.click(exportBtn('Play preview'))
    })
    await vi.waitFor(() => {
      expect(props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
    await rerender(h(MotionExportDialog, { ...props, open: false } as never))
    const seen = (props.onFrameChange as ReturnType<typeof vi.fn>).mock.calls.length
    await new Promise((r) => setTimeout(r, 120))
    expect((props.onFrameChange as ReturnType<typeof vi.fn>).mock.calls.length).toBe(seen)
  })

  test('dropping the write channel mid-preview stops the loop', async () => {
    const { rerender, props } = await mountDialog({ npz: makeNpz(5, 120) })
    await act(async () => {
      fireEvent.click(exportBtn('Play preview'))
    })
    await vi.waitFor(() => {
      expect(props.onFrameChange as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
    const next = { ...props, onFrameChange: undefined }
    await rerender(h(MotionExportDialog, next as never))
    const seen = (props.onFrameChange as ReturnType<typeof vi.fn>).mock.calls.length
    await new Promise((r) => setTimeout(r, 120))
    expect((props.onFrameChange as ReturnType<typeof vi.fn>).mock.calls.length).toBe(seen)
  })
})

describe('single-view exports', () => {
  test('no 3D context fails loud (error toast, no download)', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog({ threeCtxRef: { current: null } })
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.startsWith('Export failed:'))).toBe(true)
    })
    expect(downloads).toHaveLength(0)
  })

  test('mesh: framed rect at typed pixels (preserve bg, restore after)', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    const { props } = await mountDialog()
    const ref = props.threeCtxRef as { current: { gl: ReturnType<typeof makeGl>; scene: THREE.Scene } }
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.type === 'success')).toBe(true)
    })
    expect(downloads.map((d) => d.download)).toEqual(['stage_mesh.png'])
    expect(downloads[0]!.href).toContain('data:image/png')
    // the buffer restores the live size after the upscale
    const sizes = ref.current.gl.setSize.mock.calls
    expect(sizes[sizes.length - 1]).toEqual([800, 600, false])
    // the flat hex swap restores the stage background object
    expect(ref.current.scene.background).toBeInstanceOf(THREE.Color)
  })

  test('openpose: skeleton at the same camera (transparent bg)', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog({ inPlace: true, displayJointsM: makeDisplay(true) })
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Transparent'))
    })
    await enableMode('OpenPose')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(downloads.map((d) => d.download)).toEqual(['stage_openpose.png'])
    })
    expect(downloads[0]!.href).toBe('blob:fake')
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('openpose'))).toBe(true)
    })
  })

  test('depth: grayscale pass, material singleton survives the rerun', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog()
    await enableMode('Depth')
    const btn = /Export the frame/
    await act(async () => {
      fireEvent.click(exportBtn(btn))
    })
    await vi.waitFor(() => {
      expect(downloads.map((d) => d.download)).toEqual(['stage_depth.png'])
    })
    await vi.waitFor(() => {
      expect(exportBtn(btn)).toBeTruthy()
    })
    await act(async () => {
      fireEvent.click(exportBtn(btn))
    })
    await vi.waitFor(() => {
      expect(downloads.map((d) => d.download)).toEqual(['stage_depth.png', 'stage_depth.png'])
    })
  })

  test('transparent bg nulls the stage for the mesh pass', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    const { props } = await mountDialog()
    const ref = props.threeCtxRef as { current: { gl: ReturnType<typeof makeGl>; scene: THREE.Scene } }
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Transparent'))
    })
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(downloads.map((d) => d.download)).toEqual(['stage_mesh.png'])
    })
    // the null swaps back to the stage's own background object
    expect(ref.current.scene.background).toBeInstanceOf(THREE.Color)
  })

  test('hex bg swaps a flat color in and restores it', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    const { props } = await mountDialog()
    const ref = props.threeCtxRef as { current: { scene: THREE.Scene } }
    const before = ref.current.scene.background
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Black'))
    })
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(1)
    })
    expect(ref.current.scene.background).toBe(before)
  })

  test('preserve over a non-color stage falls back to the studio dark', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    const seen: { fillStyles: string[] } = { fillStyles: [] }
    stub2d(seen)
    const ctx = makeCtx(null)
    await mountDialog({
      threeCtxRef: { current: { gl: ctx.gl, scene: ctx.scene, camera: ctx.camera } },
    })
    await enableMode('OpenPose')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(1)
    })
    expect(seen.fillStyles[0]).toBe('#0e0e1a')
  })

  test('stage dims fall back to element size, then to 1px', async () => {
    for (const dims of [{ clientWidth: 0, clientHeight: 0, width: 640, height: 480 }, { clientWidth: 0, clientHeight: 0, width: 0, height: 0 }]) {
      stubDelivery()
      vi.stubGlobal('Image', FakeImage as never)
      stub2d()
      const ctx = makeCtx()
      ctx.gl = makeGl(dims) as never
      await mountDialog({
        threeCtxRef: { current: { gl: ctx.gl, scene: ctx.scene, camera: ctx.camera } },
      })
      await enableMode('Raw mesh')
      await act(async () => {
        fireEvent.click(exportBtn(/Export the frame/))
      })
      await vi.waitFor(() => {
        expect(downloads).toHaveLength(1)
      })
      await cleanup19()
    }
  })

  test('exporting parks the button on the transient label', async () => {
    stubDelivery()
    FakeImage.mode = 'hang'
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog()
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Exporting…')
    })
    expect((exportBtn(/Exporting…/) as HTMLButtonElement).hasAttribute('disabled')).toBe(true)
  })

  // Unplugging the stage mid-export: the first pass runs sync inside
  // the click; the null lands in its awaits, past the entry check, so
  // the SECOND render call's guard is the one that fires.
  async function unplugMidlands(kind: 'single-openpose' | 'single-depth' | 'batch'): Promise<void> {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    const mounted = await mountDialog()
    const ref = mounted.props.threeCtxRef as { current: unknown }
    await enableMode('Raw mesh')
    if (kind === 'single-openpose') await enableMode('OpenPose')
    else await enableMode('Depth')
    if (kind === 'batch') {
      await act(async () => {
        fireEvent.click(getByText(document.body, '8-angle batch'))
      })
      await act(async () => {
        fireEvent.click(exportBtn(/Export 8 angles/))
      })
    } else {
      await act(async () => {
        fireEvent.click(exportBtn(/Export the frame/))
      })
    }
    ref.current = null
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.startsWith('Export failed:'))).toBe(true)
    }, { timeout: 15000 })
    expect(downloads).toHaveLength(1)
    await cleanup19()
  }

  test('unplugging the stage mid-export fails loud (the async-gap guards)', async () => {
    await unplugMidlands('single-openpose') // projectToPixelsLive guard
    await unplugMidlands('single-depth') // renderDepthLive guard
    await unplugMidlands('batch') // withCameraAt guard (two modes: past stageDims)
  })

  test('a broken shot fails loud', async () => {
    stubDelivery()
    FakeImage.mode = 'error'
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog()
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(exportBtn(/Export the frame/))
    })
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.startsWith('Export failed:'))).toBe(true)
    })
    expect(downloads).toHaveLength(0)
  })
})

describe('batch + downloads', () => {
  test('batch walks the ring, restores the camera, repaints', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    const { props } = await mountDialog()
    const ref = props.threeCtxRef as {
      current: { gl: ReturnType<typeof makeGl>; camera: THREE.PerspectiveCamera }
    }
    const px = ref.current.camera.position.x
    const py = ref.current.camera.position.y
    const pz = ref.current.camera.position.z
    await enableMode('Raw mesh')
    await act(async () => {
      fireEvent.click(getByText(document.body, '8-angle batch'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export 8 angles/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(8)
    }, { timeout: 15000 })
    expect(downloads.map((d) => d.download)).toEqual(
      ['0', '45', '90', '135', '180', '225', '270', '315'].map((a) => `${a}_mesh.png`),
    )
    // the live camera is back where the user left it
    expect(ref.current.camera.position.x).toBeCloseTo(px)
    expect(ref.current.camera.position.y).toBeCloseTo(py)
    expect(ref.current.camera.position.z).toBeCloseTo(pz)
    expect(ref.current.gl.render).toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('8 angles'))).toBe(true)
    })
  })

  test('openpose batch walks the ring from the pinned root', async () => {
    stubDelivery()
    vi.stubGlobal('Image', FakeImage as never)
    stub2d()
    await mountDialog({ inPlace: true })
    await enableMode('OpenPose')
    await act(async () => {
      fireEvent.click(getByText(document.body, '8-angle batch'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export 8 angles/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(8)
    }, { timeout: 15000 })
    expect(downloads[0]!.download).toBe('0_openpose.png')
    expect(downloads[7]!.download).toBe('315_openpose.png')
  })

  function stubFetch(mode: 'ok' | 'npz-down' | 'glb-down') {
    vi.stubGlobal('fetch', (async (url: string) => {
      if (url.endsWith('.npz')) {
        if (mode === 'npz-down') return { ok: false, status: 500 }
        return { ok: true, blob: async () => new Blob(['npz']) }
      }
      if (mode === 'glb-down') return { ok: false, status: 404 }
      return { ok: true, blob: async () => new Blob(['glb']) }
    }) as never)
  }

  test('downloads delivers NPZ + GLB', async () => {
    stubDelivery()
    stubFetch('ok')
    await mountDialog()
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export files/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(2)
    })
    expect(downloads[0]!.download.endsWith('.npz')).toBe(true)
    expect(downloads[1]!.download.endsWith('.glb')).toBe(true)
    await vi.waitFor(() => {
      expect(
        useToastStore.getState().toasts.some((t) => t.message === 'Motion NPZ + GLB downloaded'),
      ).toBe(true)
    })
  })

  test('downloads without a GLB still ships the NPZ', async () => {
    stubDelivery()
    stubFetch('ok')
    await mountDialog({ glbUrl: null })
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export files/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(1)
    })
    expect(downloads[0]!.download.endsWith('.npz')).toBe(true)
    await vi.waitFor(() => {
      expect(
        useToastStore.getState().toasts.some((t) => t.message === 'Motion NPZ downloaded'),
      ).toBe(true)
    })
  })

  test('a failed GLB fetch skips the GLB, a failed NPZ fails loud', async () => {
    stubDelivery()
    stubFetch('glb-down')
    await mountDialog()
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export files/))
    })
    await vi.waitFor(() => {
      expect(downloads).toHaveLength(1)
    })
    await cleanup19()
    stubDelivery()
    stubFetch('npz-down')
    await mountDialog()
    await act(async () => {
      fireEvent.click(getByText(document.body, 'Downloads'))
    })
    await act(async () => {
      fireEvent.click(exportBtn(/Export files/))
    })
    await vi.waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('Motion asset fetch failed: 500'))).toBe(true)
    })
    expect(downloads).toHaveLength(0)
  })
})
