/**
 * poser-figure.spec.tsx — THE NATIVE FIGURE STAGE (stroke 90 + the
 * live follow-up, 2026-09-17: "these knobs do LITERALLY NOTHING —
 * they are supposed to CHANGE THE [REDACTED 2026-11-05] BODY"). The figure rides
 * the SHARED bind-mesh module (@melite/formats/poserSkin — mocked
 * here; its own contract lives in web-kit/formats/test), and it
 * RESHAPES from the card's LIVE identity coeffs + local changes:
 * a signature change re-fetches, an identical one does not, the
 * geometry swaps in place without a scene remount.
 *
 * The shared stage core (mountStage3D) is ITS OWN contract, covered
 * by stage3d.spec.ts; here it is MOCKED so this file covers its own
 * rig (lights, grid, geometry, auto-fit, dispose) WebGL-free.
 */
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { createElement as h } from 'react'
import * as THREE from 'three'
import {
  MeshStagePreview, PoserFigureStage, figureGeometry,
  figureCoeffsOf, figureLocalChangesOf, figureShapeSig,
  type PoserMeshDoc,
} from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'
import type { FormSpecDoc, SpecValues } from '../src/spec.ts'

const mountState = vi.hoisted(() => ({
  spy: vi.fn((): { scene: { children: unknown[] }; dispose: () => void } => ({
    scene: { children: [] },
    dispose: () => {},
  })),
}))
vi.mock('../src/stage3d.ts', () => ({ mountStage3D: (...a: unknown[]) => mountState.spy(...a) }))

// THE SHARED MODULE (mocked — its own spec owns the real wire law):
// tests drive resolves/rejects and read the query it received.
const bindState = vi.hoisted(() => ({ spy: vi.fn() }))
vi.mock('@melite/formats/poserSkin', () => ({ fetchBindMesh: (...a: unknown[]) => bindState.spy(...a) }))

afterEach(() => {
  cleanup()
  bindState.spy.mockReset()
  mountState.spy.mockClear()
})

const owner = (over: Partial<PreviewOwnerProps> = {}): PreviewOwnerProps => ({
  kind: 'mesh',
  artifacts: [],
  runStatus: '',
  stageId: 's_0',
  ...over,
})

const DOC: PoserMeshDoc = {
  vertices: [[0, 140, 0], [10, 90, 5], [-10, 90, -5], [0, 5, 8]],
  faces: [[0, 1, 2], [0, 2, 3]],
}

/** advance past the 120ms drag debounce */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 170))

describe('figureGeometry (pure: the bind-mesh JSON → three geometry)', () => {
  test('positions, indices, and smooth normals from the soup', () => {
    const g = figureGeometry(DOC)
    const pos = g.getAttribute('position')
    expect(pos.count).toBe(4)
    expect(pos.getX(1)).toBe(10)
    expect(g.getIndex()!.count).toBe(6)
    expect(g.getAttribute('normal')).toBeDefined()
    g.dispose()
  })
})

describe('the shape signature (the refetch dep)', () => {
  test('coeffs and local changes fold into one stable string', () => {
    expect(figureShapeSig([0.5, 0.5], null)).toBe(figureShapeSig([0.5, 0.5], null))
    expect(figureShapeSig([0.9, 0.5], null)).not.toBe(figureShapeSig([0.5, 0.5], null))
    expect(figureShapeSig(null, { brow: 0.2 })).not.toBe(figureShapeSig(null, null))
    // key order is irrelevant — the entries sort
    expect(figureShapeSig(null, { a: 0.1, b: 0.2 })).toBe(figureShapeSig(null, { b: 0.2, a: 0.1 }))
  })
})

describe('the live-arm derivations (pure: resolved params → fetch arms)', () => {
  // a served envelope (refs shape — the schemastery toJSON form):
  // identity fields declared OUT OF ORDER (age order 0, gender order 1)
  const refs: Record<number, { type: string; meta?: Record<string, unknown>; dict?: Record<string, number> }> = {
    0: { type: 'object', dict: { gender: 1, age: 2, brow_inner: 3, brow_outer: 4, resolution: 5 } },
    1: { type: 'number', meta: { description: 'Gender', min: 0, max: 1, extra: { order: 1, group: 'identity' } } },
    2: { type: 'number', meta: { description: 'Age', min: 0, max: 1, extra: { order: 0, group: 'identity' } } },
    3: { type: 'number', meta: { description: 'brow_inner', default: 0, min: -1, max: 2, extra: { order: 1000, group: 'morph' } } },
    4: { type: 'number', meta: { description: 'brow_outer', default: 0, min: -1, max: 2, extra: { order: 1001, group: 'morph' } } },
    5: { type: 'number', meta: { description: 'View resolution', default: 768, extra: { order: 0, group: 'turnaround' } } },
  }
  const spec = { form: 'anny', schema: { uid: 0, refs } } as unknown as FormSpecDoc

  test('identity coeffs arrive ORDER-SORTED (order 0 first, not dict order)', () => {
    const value: SpecValues = { gender: 0.7, age: 0.2 }
    expect(figureCoeffsOf(spec, value)).toEqual([0.2, 0.7])
  })

  test('fields without an order sort at 0 (the ?? 0 arm)', () => {
    const noOrder = { form: 'x', schema: { uid: 0, refs: {
      0: { type: 'object', dict: { dim_a: 1, dim_b: 2, dim_c: 3 } },
      1: { type: 'number', meta: { description: 'dim_a', extra: { group: 'identity' } } },
      2: { type: 'number', meta: { description: 'dim_b', extra: { order: 1, group: 'identity' } } },
      3: { type: 'number', meta: { description: 'dim_c', extra: { group: 'identity' } } },
    } } } as unknown as FormSpecDoc
    expect(figureCoeffsOf(noOrder, { dim_a: 0.3, dim_b: 0.9, dim_c: 0.1 })).toEqual([0.3, 0.1, 0.9])
  })

  test('a PARTIAL vector refuses (every dim rides or none do)', () => {
    expect(figureCoeffsOf(spec, { gender: 0.7 })).toBeNull()
    expect(figureCoeffsOf(spec, {})).toBeNull()
  })

  test('no identity group → null (the neutral GET)', () => {
    expect(figureCoeffsOf(null, {})).toBeNull()
    // a served spec with NO identity fields (only morphs/turnaround)
    const bare = { form: 'x', schema: { uid: 0, refs: { 0: { type: 'object', dict: { resolution: 1 } }, 1: { type: 'number', meta: { description: 'View resolution', extra: { order: 0, group: 'turnaround' } } } } } } as unknown as FormSpecDoc
    expect(figureCoeffsOf(bare, { resolution: 768 })).toBeNull()
    // and the morph-side bare arm: no morph fields → null sparse map
    expect(figureLocalChangesOf(bare, { resolution: 768 })).toBeNull()
  })

  test('local changes ride SPARSE (non-zero morphs only, other groups ignored)', () => {
    const value: SpecValues = { brow_inner: 0.3, brow_outer: 0, resolution: 768, gender: 0.5 }
    expect(figureLocalChangesOf(spec, value)).toEqual({ brow_inner: 0.3 })
    expect(figureLocalChangesOf(spec, { brow_outer: 0 })).toBeNull()
    expect(figureLocalChangesOf(null, {})).toBeNull()
  })
})

describe('PoserFigureStage (DOM states + LIVE reshaping)', () => {
  test('loading while the bind mesh is in flight, canvas never mounts', () => {
    bindState.spy.mockReturnValue(new Promise(() => {}))
    render(h(PoserFigureStage, { identityModel: 'anny' }))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
    expect(screen.queryByTestId('stage-preview-figure')).toBeNull()
  })

  test('a refused fetch voices itself (loud errors, never a silent blank)', async () => {
    bindState.spy.mockRejectedValue(new Error('shaped mesh HTTP 503'))
    render(h(PoserFigureStage, { identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('shaped mesh HTTP 503')
  })

  test('a landed doc builds the figure scene and disposes clean (the 3js preview is BACK)', async () => {
    const disposed = vi.fn()
    mountState.spy.mockImplementationOnce((): { scene: unknown; dispose: () => void } => {
      const scene = new THREE.Scene()
      return { scene, dispose: disposed }
    })
    bindState.spy.mockResolvedValue(DOC)
    const { unmount } = render(h(PoserFigureStage, { identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(mountState.spy).toHaveBeenCalled()
    const scene = (mountState.spy.mock.results.at(-1)?.value as { scene: THREE.Scene }).scene
    // the rig: hemisphere + key + fill + grid + THE FIGURE MESH
    expect(scene.children.length).toBeGreaterThanOrEqual(5)
    expect(scene.children.some((o) => o instanceof THREE.Mesh)).toBe(true)
    unmount()
    expect(disposed).toHaveBeenCalled()
  })

  test('THE LIVE ARMS RIDE THE FETCH: coeffs + local changes reach the shared module', async () => {
    bindState.spy.mockResolvedValue(DOC)
    render(h(PoserFigureStage, {
      identityModel: 'anny',
      identityCoeffs: [0.2, 0.7],
      localChanges: { brow_inner: 0.3 },
    }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(bindState.spy).toHaveBeenCalledWith({
      identityModel: 'anny',
      identityCoeffs: [0.2, 0.7],
      localChanges: { brow_inner: 0.3 },
    })
  })

  test('A SIGNATURE CHANGE RE-FETCHES AND SWAPS THE GEOMETRY IN PLACE (the body CHANGES)', async () => {
    mountState.spy.mockImplementation(() => {
      const scene = new THREE.Scene()
      return { scene, dispose: vi.fn() }
    })
    bindState.spy.mockResolvedValue(DOC)
    const { rerender } = render(h(PoserFigureStage, { identityModel: 'anny', identityCoeffs: [0.5] }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(bindState.spy).toHaveBeenCalledTimes(1)
    const canvas = screen.getByTestId('stage-preview-figure')
    // the drag: coeffs move → new signature → re-fetch → geometry swap
    const shaped: PoserMeshDoc = { vertices: [[0, 150, 0], [12, 95, 5], [-12, 95, -5], [0, 6, 9]], faces: [[0, 1, 2], [0, 2, 3]] }
    bindState.spy.mockResolvedValue(shaped)
    rerender(h(PoserFigureStage, { identityModel: 'anny', identityCoeffs: [0.9] }))
    await settle()
    await waitFor(() => expect(bindState.spy).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      const mesh = (mountState.spy.mock.results.at(-1)?.value as { scene: THREE.Scene }).scene.children.find((o) => o instanceof THREE.Mesh) as THREE.Mesh
      expect((mesh.geometry.getAttribute('position') as THREE.BufferAttribute).getX(1)).toBe(12)
    })
    // the SCENE never remounted (no flicker) and the CANVAS survived
    expect(mountState.spy).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('stage-preview-figure')).toBe(canvas)
  })

  test('AN IDENTICAL SIGNATURE DOES NOT RE-FETCH (the drag settles, the cache law)', async () => {
    bindState.spy.mockResolvedValue(DOC)
    const { rerender } = render(h(PoserFigureStage, { identityModel: 'anny', identityCoeffs: [0.5] }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    // a NEW array object, the SAME values — the signature holds
    rerender(h(PoserFigureStage, { identityModel: 'anny', identityCoeffs: [0.5] }))
    await settle()
    expect(bindState.spy).toHaveBeenCalledTimes(1)
  })

  test('a context failure mid-mount voices itself (the loud-refusal law)', async () => {
    mountState.spy.mockImplementationOnce(((_canvas: unknown, opts: { onContextFailure: (m: string) => void }) => {
      const scene = new THREE.Scene()
      const stage = { scene, dispose: vi.fn() }
      opts.onContextFailure('WebGL refused (test)')
      return stage
    }) as unknown as typeof mountState.spy)
    bindState.spy.mockResolvedValue(DOC)
    render(h(PoserFigureStage, { identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('WebGL refused (test)')
  })

  test('a null mount (the core refused) never crashes — nothing renders', async () => {
    mountState.spy.mockImplementationOnce(() => null as never)
    bindState.spy.mockResolvedValue(DOC)
    const { container } = render(h(PoserFigureStage, { identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(container.textContent).toBe('')
  })

  test('unmount before the debounce fires: the fetch never leaves (the drag law)', async () => {
    bindState.spy.mockResolvedValue(DOC)
    const { unmount } = render(h(PoserFigureStage, { identityModel: 'anny' }))
    unmount()
    await settle()
    expect(bindState.spy).not.toHaveBeenCalled()
  })

  test('a settle after unmount is swallowed (no dead setState); a non-Error rejection takes the fallback voice', async () => {
    let resolveIt!: (v: unknown) => void
    bindState.spy.mockReturnValue(new Promise((res) => { resolveIt = res as typeof resolveIt }))
    const first = render(h(PoserFigureStage, { identityModel: 'anny' }))
    await settle()
    first.unmount()
    resolveIt(DOC) // post-mortem success — alive=false swallows
    let rejectIt!: (v: unknown) => void
    bindState.spy.mockReturnValue(new Promise((_res, rej) => { rejectIt = rej as never }))
    const second = render(h(PoserFigureStage, { identityModel: 'anny' }))
    await settle()
    second.unmount()
    rejectIt(new Error('late')) // post-mortem reject — swallowed
    bindState.spy.mockRejectedValue('a string, not an Error')
    render(h(PoserFigureStage, { identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('figure fetch failed')
  })
})

describe('MeshStagePreview dispatch (the tombstone dies only when the card declares a figure)', () => {
  test('no figure, no artifacts → the classic empty hint stands', () => {
    const { container } = render(h(MeshStagePreview, owner()))
    expect(container.textContent).toContain('No render yet — run lands the mesh here')
  })

  test('a declared figure replaces the tombstone with the figure stage', () => {
    bindState.spy.mockReturnValue(new Promise(() => {}))
    const { container } = render(h(MeshStagePreview, owner({
      figure: { identityModel: 'anny' },
    })))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
    expect(container.textContent).not.toContain('No render yet')
  })

  test('the live arms pass through the dispatch (owner → stage)', () => {
    bindState.spy.mockReturnValue(new Promise(() => {}))
    render(h(MeshStagePreview, owner({
      figure: { identityModel: 'anny', identityCoeffs: [0.2], localChanges: { brow: 0.1 } },
    })))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
  })

  test('run OUTPUTS still take the stage over the figure (the real result wins)', () => {
    const { container } = render(h(MeshStagePreview, owner({
      artifacts: [{ name: 'turnaround', url: '/runs/cur/turnaround.glb' }],
      figure: { identityModel: 'anny' },
    })))
    expect(container.textContent).not.toContain('No render yet')
    expect(screen.queryByTestId('figure-loading')).toBeNull()
    // the GLB load is in flight (loading mesh…) — the figure is gone,
    // the OUTPUT owns the stage
    expect(container.textContent).toContain('loading mesh…')
  })

  test('artifacts WHILE RUNNING: the live-run hint rides the output arm', () => {
    const { container } = render(h(MeshStagePreview, owner({
      artifacts: [{ name: 'turnaround', url: '/runs/cur/turnaround.glb' }],
      runStatus: 'running',
    })))
    expect(container.textContent).toContain('loading mesh…')
  })

  test('history entries view the same way (the figure is only the empty state)', () => {
    const { container } = render(h(MeshStagePreview, owner({
      history: [[{ name: 'past', url: '/runs/old/past.glb' }]],
      figure: { identityModel: 'anny' },
    })))
    expect(screen.queryByTestId('figure-loading')).toBeNull()
    expect(container.textContent).not.toContain('No render yet')
  })

  test('the strip still renders under the figure (the history law survives)', () => {
    bindState.spy.mockReturnValue(new Promise(() => {}))
    const { container } = render(h(MeshStagePreview, owner({
      history: [[{ name: 'past', url: '/runs/old/past.glb' }]],
      figure: { identityModel: 'anny' },
    })))
    const tile = container.querySelector('[data-testid="stage-output-history"] button')
    expect(tile).not.toBeNull()
    fireEvent.click(tile!)
    expect(screen.queryByTestId('figure-loading')).toBeNull()
  })
})
