/**
 * poser-figure.spec.tsx — THE NATIVE FIGURE STAGE (stroke 90, the
 * keep-all-features order): the studio viewport's capability on the
 * base form — the /poser bind mesh fetched from the door, built into
 * a raw-three geometry, REPLACING the mesh stage's empty tombstone
 * when the served spec declares preview.figure. Run outputs still
 * take the stage (the figure never competes with a real output).
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
import { MeshStagePreview, PoserFigureStage, figureGeometry, type PoserMeshDoc } from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'

const mountState = vi.hoisted(() => ({
  spy: vi.fn((): { scene: { children: unknown[] }; dispose: () => void } => ({
    scene: { children: [] },
    dispose: () => {},
  })),
}))
vi.mock('../src/stage3d.ts', () => ({ mountStage3D: (...a: unknown[]) => mountState.spy(...a) }))

afterEach(cleanup)

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
  bind_joints: [[0, 90, 0]],
  identity_model: 'anny',
}

describe('figureGeometry (pure: door JSON → three geometry)', () => {
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

describe('PoserFigureStage (DOM states)', () => {
  test('loading while the door is in flight, canvas never mounts', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
    expect(screen.queryByTestId('stage-preview-figure')).toBeNull()
    vi.unstubAllGlobals()
  })

  test('a refused door voices itself (loud errors, never a silent blank)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503 })))
    render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('HTTP 503')
    vi.unstubAllGlobals()
  })

  test('a landed doc builds the figure scene and disposes clean (the 3js preview is BACK)', async () => {
    const disposed = vi.fn()
    mountState.spy.mockImplementationOnce((): { scene: unknown; dispose: () => void } => {
      const scene = new THREE.Scene()
      return { scene, dispose: disposed }
    })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(DOC) })))
    const { unmount } = render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(mountState.spy).toHaveBeenCalled()
    const scene = (mountState.spy.mock.results.at(-1)?.value as { scene: THREE.Scene }).scene
    // the rig: hemisphere + key + fill + grid + THE FIGURE MESH
    expect(scene.children.length).toBeGreaterThanOrEqual(5)
    expect(scene.children.some((o) => o instanceof THREE.Mesh)).toBe(true)
    unmount()
    expect(disposed).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  test('a context failure mid-mount voices itself (the loud-refusal law)', async () => {
    mountState.spy.mockImplementationOnce(((_canvas: unknown, opts: { onContextFailure: (m: string) => void }) => {
      const scene = new THREE.Scene()
      const stage = { scene, dispose: vi.fn() }
      opts.onContextFailure('WebGL refused (test)')
      return stage
    }) as unknown as typeof mountState.spy)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(DOC) })))
    render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('WebGL refused (test)')
    vi.unstubAllGlobals()
  })

  test('a null mount (the core refused) never crashes — nothing renders', async () => {
    mountState.spy.mockImplementationOnce(() => null as never)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(DOC) })))
    const { container } = render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    await waitFor(() => screen.getByTestId('stage-preview-figure'))
    expect(container.textContent).toBe('')
    vi.unstubAllGlobals()
  })

  test('unmount mid-flight: the alive guards swallow both settle arms (no dead setState)', async () => {
    let resolveFetch!: (v: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((res) => { resolveFetch = res as typeof resolveFetch })))
    const first = render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
    first.unmount()
    // the success settle runs post-mortem — alive=false swallows it
    resolveFetch({ ok: true, json: () => Promise.resolve(DOC) })
    await new Promise((r) => setTimeout(r, 10))
    // the reject settle too
    let rejectFetch!: (v: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_res, rej) => { rejectFetch = rej as never })))
    const second = render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    second.unmount()
    rejectFetch(new Error('late'))
    await new Promise((r) => setTimeout(r, 10))
    // the non-Error rejection arm (a string throw) — the fallback voice
    let rejectStr!: (v: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_res, rej) => { rejectStr = rej as never })))
    const third = render(h(PoserFigureStage, { door: '/v1/poser/mesh', identityModel: 'anny' }))
    rejectStr('a string, not an Error')
    await waitFor(() => screen.getByTestId('figure-failed'))
    expect(screen.getByTestId('figure-failed').textContent).toContain('figure fetch failed')
    third.unmount()
    vi.unstubAllGlobals()
  })
})

describe('MeshStagePreview dispatch (the tombstone dies only when the card declares a figure)', () => {
  test('no figure, no artifacts → the classic empty hint stands', () => {
    const { container } = render(h(MeshStagePreview, owner()))
    expect(container.textContent).toContain('No render yet — run lands the mesh here')
  })

  test('a declared figure replaces the tombstone with the figure stage', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const { container } = render(h(MeshStagePreview, owner({
      figure: { door: '/v1/poser/mesh', identityModel: 'anny' },
    })))
    expect(screen.getByTestId('figure-loading')).toBeDefined()
    expect(container.textContent).not.toContain('No render yet')
    vi.unstubAllGlobals()
  })

  test('run OUTPUTS still take the stage over the figure (the real result wins)', () => {
    const { container } = render(h(MeshStagePreview, owner({
      artifacts: [{ name: 'turnaround', url: '/runs/cur/turnaround.glb' }],
      figure: { door: '/v1/poser/mesh', identityModel: 'anny' },
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
      figure: { door: '/v1/poser/mesh', identityModel: 'anny' },
    })))
    expect(screen.queryByTestId('figure-loading')).toBeNull()
    expect(container.textContent).not.toContain('No render yet')
  })

  test('the strip still renders under the figure (the history law survives)', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const { container } = render(h(MeshStagePreview, owner({
      history: [[{ name: 'past', url: '/runs/old/past.glb' }]],
      figure: { door: '/v1/poser/mesh', identityModel: 'anny' },
    })))
    const tile = container.querySelector('[data-testid="stage-output-history"] button')
    expect(tile).not.toBeNull()
    fireEvent.click(tile!)
    expect(screen.queryByTestId('figure-loading')).toBeNull()
    vi.unstubAllGlobals()
  })
})

