/**
 * mesh-view — the 3D viewport in the media drilldown.
 *
 * The two shared kernels are MOCKED (jsdom has no WebGL, and the
 * kernels have their own specs): what this file proves is the viewer's
 * own contract — it mounts the estate's stage core, loads through the
 * estate's ONE GLB parse policy, frames the mesh, disposes both, and
 * says something TRUE when it cannot render. The "never a blank box"
 * arms are the point: a 3D artifact that renders an empty div is how a
 * mesh looked like a broken image for a release.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import * as THREE from 'three'

const mountStage3D = vi.fn()
const disposeStage = vi.fn()
const controlsTarget = new THREE.Vector3()
const cameraPosition = new THREE.Vector3()
const camera = {
  position: cameraPosition,
  near: 0,
  far: 0,
  updateProjectionMatrix: vi.fn(),
}
const controls = { target: controlsTarget, update: vi.fn() }
const scene = new THREE.Scene()

const loadGLB = vi.fn()
const autoFitToHeight = vi.fn()

vi.mock('@melite/card-base/stage3d', () => ({
  mountStage3D: (...args: unknown[]) => mountStage3D(...args),
}))
vi.mock('@melite/formats/glbLoad', () => ({
  loadGLB: (...args: unknown[]) => loadGLB(...args),
  autoFitToHeight: (...args: unknown[]) => autoFitToHeight(...args),
}))

import { MeshView } from '../src/client/mesh-view.tsx'

/** A minimal loaded-gltf stand-in: one mesh child under the scene root,
 *  OFFSET so the framing assertions can tell "moved the camera to the
 *  mesh" from "left it at the origin". */
function fakeGltf(): { scene: THREE.Group, geometry: THREE.BufferGeometry } {
  const root = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()))
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  box.position.set(5, 1, 0)
  root.add(box)
  return { scene: root, geometry }
}

const URL_GLB = '/melite-media/runs/run-1/img-to-mesh/trellis2_native_00004.glb'

beforeEach(() => {
  scene.clear()
  mountStage3D.mockReset()
  disposeStage.mockReset()
  loadGLB.mockReset()
  autoFitToHeight.mockReset()
  controls.update.mockReset()
  camera.updateProjectionMatrix.mockReset()
  camera.near = 0
  camera.far = 0
  controlsTarget.set(0, 0, 0)
  cameraPosition.set(0, 0, 0)
  mountStage3D.mockReturnValue({ scene, camera, controls, dispose: disposeStage, addTick: () => () => {}, resize: () => {} })
  loadGLB.mockResolvedValue(fakeGltf())
})

afterEach(() => {
  cleanup()
})

describe('MeshView — the visual door renders the mesh in place', () => {
  it('mounts the stage, loads through the shared loader, frames the mesh, drops the loading line', async () => {
    render(<MeshView url={URL_GLB} file="trellis2_native_00004.glb" />)
    // the canvas is the seat, painted before the bytes land
    expect(screen.getByTestId('mesh-view-canvas')).toBeTruthy()
    expect(screen.getByTestId('mesh-view-loading')).toBeTruthy()
    // THE SHARED KERNELS: the estate's stage core + the estate's ONE
    // GLB parse policy. A second loader here would be a second parse
    // policy, which is the duplication the shared kernel exists to kill.
    expect(mountStage3D).toHaveBeenCalledTimes(1)
    expect(loadGLB).toHaveBeenCalledWith(URL_GLB)
    await waitFor(() => { expect(screen.queryByTestId('mesh-view-loading')).toBeNull() })
    expect(autoFitToHeight).toHaveBeenCalledTimes(1)
    // framed: the controls target sits ON the mesh (the box is offset
    // to x=5, so a target still at the origin means no framing) and the
    // camera pulled back by its bounding sphere
    expect(controlsTarget.x).toBeCloseTo(5, 3)
    expect(controlsTarget.y).toBeCloseTo(1, 3)
    expect(controls.update).toHaveBeenCalled()
    expect(cameraPosition.length()).toBeGreaterThan(0)
    // near/far track the model scale, or a 40m prop clips
    expect(camera.near).toBeLessThan(camera.far)
    // a light rig, or the mesh renders black inside a chrome-less modal
    expect(scene.children.some((c) => c instanceof THREE.HemisphereLight)).toBe(true)
    expect(scene.children.some((c) => c instanceof THREE.DirectionalLight)).toBe(true)
  })

  it('unmount disposes the stage AND the mesh buffers (the modal walks artifacts)', async () => {
    const gltf = fakeGltf()
    loadGLB.mockResolvedValue(gltf)
    const spy = vi.spyOn(gltf.geometry, 'dispose')
    const { unmount } = render(<MeshView url={URL_GLB} file="m.glb" />)
    await waitFor(() => { expect(loadGLB).toHaveBeenCalled() })
    unmount()
    expect(disposeStage).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalled()
  })
})

describe('MeshView — the honest-failure law (never a blank box)', () => {
  it('a WebGL refusal states itself and drops the canvas', async () => {
    mountStage3D.mockImplementation((_canvas: unknown, opts: { onContextFailure?: (m: string) => void }) => {
      opts.onContextFailure?.('WebGL unavailable')
      return null
    })
    render(<MeshView url={URL_GLB} file="m.glb" />)
    await waitFor(() => { expect(screen.getByTestId('mesh-view-failure')).toBeTruthy() })
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('WebGL refused the canvas')
    expect(screen.queryByTestId('mesh-view-canvas')).toBeNull()
  })

  it('a non-mesh url refuses WITHOUT mounting a canvas (no wasted WebGL context)', () => {
    render(<MeshView url="/melite-media/runs/run-1/thing.png" file="thing.png" />)
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('is not a .glb/.gltf artifact')
    expect(mountStage3D).not.toHaveBeenCalled()
  })

  it('a .gltf names the sidecar-buffer case instead of failing as a decode error', () => {
    render(<MeshView url="/melite-media/runs/run-1/m.gltf" file="m.gltf" />)
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('external buffers')
  })

  it('a load failure carries the reason and keeps the artifact downloadable', async () => {
    loadGLB.mockRejectedValue(new Error('Unexpected token at 0x1'))
    render(<MeshView url={URL_GLB} file="m.glb" />)
    await waitFor(() => { expect(screen.getByTestId('mesh-view-failure')).toBeTruthy() })
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('Unexpected token at 0x1')
    // the drilldown keeps its download anchor under the viewer, so a
    // viewer that cannot render never means a lost artifact
    expect(disposeStage).not.toHaveBeenCalled()
  })
})
