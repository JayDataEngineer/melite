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

vi.mock('@melite/card-base/client', () => ({
  mountStage3D: (...args: unknown[]) => mountStage3D(...args),
}))
vi.mock('@melite/formats/glbLoad', () => ({
  loadGLB: (...args: unknown[]) => loadGLB(...args),
  autoFitToHeight: (...args: unknown[]) => autoFitToHeight(...args),
}))

import { MeshView, artifactNameFor, unsupportedCopy, ArtifactTabBody } from '../src/client/mesh-view.tsx'
import { estateArtifactAddress } from '../src/client/artifact-address.ts'

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

  it('a refused ENVIRONMENT probe still renders (an enhancement is never a dependency)', async () => {
    // The stage fake carries no real WebGLRenderer, so the PMREM probe
    // throws — which is exactly the constrained-WebGL case. The door
    // must come up anyway: flatter metals, working canvas. (This is the
    // arm that caught the unguarded probe crashing the whole effect.)
    render(<MeshView url={URL_GLB} file="m.glb" />)
    await waitFor(() => { expect(screen.queryByTestId('mesh-view-loading')).toBeNull() })
    expect(screen.getByTestId('mesh-view-canvas')).toBeTruthy()
    expect(screen.queryByTestId('mesh-view-failure')).toBeNull()
    expect(loadGLB).toHaveBeenCalledWith(URL_GLB)
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

describe('ArtifactTabBody — the estate-artifact tab seat (the address IS the data)', () => {
  it('decodes its own address and renders the mesh under the REAL file name', async () => {
    const url = '/infer-gallery/artifact?path=run-77/trellis2_native.glb'
    render(<ArtifactTabBody useTabInfo={() => ({ tab: { navigation: { address: estateArtifactAddress(url) }, actions: { openResource() {} } } })} />)
    // the viewer received the decoded URL, and the caption names the
    // artifact (the ?path= tail), never the route segment
    await waitFor(() => { expect(loadGLB).toHaveBeenCalledWith(url) })
    expect(screen.getByTestId('mesh-view-canvas')).toBeTruthy()
    expect(screen.getByLabelText('3D view of trellis2_native.glb')).toBeTruthy()
  })

  it('a malformed segment voices the honest refusal, never a blank pane', () => {
    render(<ArtifactTabBody useTabInfo={() => ({ tab: { navigation: { address: 'dsh-resource://estate-artifact/%%%%' }, actions: { openResource() {} } } })} />)
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('unreadable')
  })

  it('an absent hook (headless harness) voices the same refusal', () => {
    render(<ArtifactTabBody />)
    expect(screen.getByTestId('mesh-view-failure').textContent).toContain('unreadable')
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

  // THE ARTIFACT-NAME LAW (the operator's report: a real .glb refused
  // as `"artifact" is not a .glb/.gltf artifact`): the media plane
  // serves artifacts at `/infer-gallery/artifact?path=<run>/<file>`,
  // so the URL path is the ROUTE's word and the real name is in the
  // query. Judged by the path, EVERY studio mesh was refused.
  it('an artifact-route URL with a .glb in its query IS viewable (the operator\'s exact shape)', () => {
    const url = '/infer-gallery/artifact?path=' + encodeURIComponent('run-x/img-to-mesh/pixal3d_00003.glb')
    expect(unsupportedCopy(url)).toBeNull()
    render(<MeshView url={url} file="pixal3d_00003.glb" />)
    expect(screen.queryByTestId('mesh-view-failure')).toBeNull()
  })

  it('a directly-served .glb still opens (the plain URL form is unchanged)', () => {
    expect(unsupportedCopy('/melite-media/runs/run-1/creature.glb')).toBeNull()
    expect(unsupportedCopy('/v1/assets/runs/run-1/x.glb')).toBeNull()
  })

  it('the refusal names the REAL artifact, never the route segment', () => {
    const url = '/infer-gallery/artifact?path=' + encodeURIComponent('run-x/notes.txt')
    const copy = unsupportedCopy(url)
    expect(copy).toContain('notes.txt')
    expect(copy).not.toContain('"artifact"')
    // and the .gltf arm reads the query too
    expect(unsupportedCopy('/infer-gallery/artifact?path=' + encodeURIComponent('run-x/scene.gltf')))
      .toContain('external buffers')
    // a non-mesh in a direct url keeps the old shape
    expect(unsupportedCopy('/melite-media/runs/run-1/thing.png')).toContain('thing.png')
  })

  it('artifactNameFor reads the name from the route query first, then the path', () => {
    expect(artifactNameFor('/infer-gallery/artifact?path=' + encodeURIComponent('run-x/a/b.glb'))).toBe('b.glb')
    expect(artifactNameFor('/melite-media/runs/run-1/creature.glb')).toBe('creature.glb')
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
