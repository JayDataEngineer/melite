// @vitest-environment happy-dom
// glb-stage-layers.spec.tsx — THE LAYER MODEL (primitive ②, first
// slice): shaded vs wireframe. applyWireframe walks loaded groups
// (mesh flags flip, points/lines/bare nodes untouched); the
// Shaded/Wireframe chips render ONLY on the caller's write channel
// (onLayers + assets) and vote the caller's layer state. The fetch
// door is a FAKE (the load spec's crafted GLB, copied — walls stand
// alone in this repo), never a module mock.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import * as THREE from 'three'

import { applyWireframe, GlbStagePreview, skeletonHelperFor } from '../src/glb-stage.tsx'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

/** A minimal valid GLB: one node → one mesh (parse needs nothing
 *  headless-absent; the wireframe arm walks the LOADED group, which
 *  the unit wall below crafts directly). */
function craftGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'root' }],
    meshes: [{ name: 'm', primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{
      bufferView: 0, componentType: 5126, count: 3, type: 'VEC3',
      max: [1, 1, 0], min: [0, 0, 0],
    }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  })
  const jsonBytes = new TextEncoder().encode(json)
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4
  const bin = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.byteLength
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonBytes.length + jsonPad, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(buf, 20, jsonBytes.length).set(jsonBytes)
  for (let i = 0; i < jsonPad; i++) view.setUint8(20 + jsonBytes.length + i, 0x20)
  const binAt = 20 + jsonBytes.length + jsonPad
  view.setUint32(binAt, bin.byteLength, true)
  view.setUint32(binAt + 4, 0x004e4942, true)
  new Uint8Array(buf, binAt + 8, bin.byteLength).set(new Uint8Array(bin.buffer))
  return buf
}

let urlSeq = 0
/** The fetch door fake: serves the crafted GLB per URL (unique URLs
 *  defeat three's FileLoader cache across tests). */
function stubGlbDoor(): void {
  const glb = craftGlb()
  vi.stubGlobal('fetch', (async (input: unknown) => {
    void input
    urlSeq++
    return new Response(glb, { status: 200, headers: { 'content-type': 'model/gltf-binary' } })
  }) as typeof fetch)
}

test('applyWireframe: mesh flags flip, points and bare nodes are left alone', () => {
  const root = new THREE.Group()
  const meshMat = new THREE.MeshStandardMaterial()
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), meshMat))
  const points = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)),
    new THREE.PointsMaterial())
  root.add(points)
  root.add(new THREE.Object3D()) // bare node: no material, never a throw
  applyWireframe(root, true)
  expect(meshMat.wireframe).toBe(true)
  applyWireframe(root, false)
  expect(meshMat.wireframe).toBe(false)
})

test('THE CHIPS: onLayers + assets seats Shaded/Wireframe, votes ride the channel', async () => {
  stubGlbDoor()
  const onLayers = vi.fn()
  render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-chips.glb' }],
    onLayers,
  }))
  const shaded = await screen.findByRole('button', { name: 'Shaded' })
  const wire = await screen.findByRole('button', { name: 'Wireframe' })
  const skeleton = await screen.findByRole('button', { name: 'Skeleton' })
  // default state: shaded pressed, wireframe loose
  expect(shaded.getAttribute('aria-pressed')).toBe('true')
  expect(wire.getAttribute('aria-pressed')).toBe('false')
  expect(skeleton.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(wire)
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: false })
  fireEvent.click(shaded)
  expect(onLayers).toHaveBeenCalledWith({ wireframe: false, skeleton: false })
})

test('THE LAYER ARM: a seated wireframe flag presses the chip and walks the load without throwing', async () => {
  stubGlbDoor()
  const onLayers = vi.fn()
  render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-arm.glb' }],
    layers: { wireframe: true, skeleton: false },
    onLayers,
  }))
  // headless the mount refuses — the face is honest, the layer arm
  // still ran over the settled load (no throw) and the chip reads it
  await waitFor(() => { expect(screen.getByText(/viewport failed:/)).not.toBeNull() })
  expect(screen.getByRole('button', { name: 'Wireframe' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Shaded' }).getAttribute('aria-pressed')).toBe('false')
  expect(onLayers).not.toHaveBeenCalled()
})

test('NO WRITE CHANNEL, NO CHROME: assets without onLayers seat no chips (read-only layers included)', () => {
  stubGlbDoor()
  const { rerender } = render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-ro.glb' }],
  }))
  expect(screen.queryByRole('button', { name: 'Wireframe' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Shaded' })).toBeNull()
  // a seated read-only flag changes nothing visible, crashes nothing
  rerender(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-ro.glb' }],
    layers: { wireframe: false, skeleton: false },
  }))
  expect(screen.queryByRole('button', { name: 'Wireframe' })).toBeNull()
})

test('NO ASSETS, NO CHROME: onLayers with the empty face seats no chips', () => {
  render(h(GlbStagePreview, { assets: [], onLayers: () => {} }))
  expect(screen.getByText('Run the card to see the mesh')).not.toBeNull()
  expect(screen.queryByRole('button', { name: 'Wireframe' })).toBeNull()
})

test('skeletonHelperFor: a boned group seats an overlay, an unrigged group seats nothing', () => {
  const rigged = new THREE.Group()
  const hip = new THREE.Bone()
  hip.name = 'hip'
  const knee = new THREE.Bone()
  knee.name = 'knee'
  hip.add(knee)
  rigged.add(hip)
  rigged.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()))
  const helper = skeletonHelperFor(rigged)
  expect(helper).not.toBeNull()
  expect(helper instanceof THREE.SkeletonHelper).toBe(true)
  // the honest absence: no bones, no overlay (never an empty helper)
  expect(skeletonHelperFor(new THREE.Group())).toBeNull()
  const bare = new THREE.Group()
  bare.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()))
  expect(skeletonHelperFor(bare)).toBeNull()
})

test('THE OVERLAY VOTE: Skeleton flips its own flag and mode votes preserve it', async () => {
  stubGlbDoor()
  const onLayers = vi.fn()
  render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-skel.glb' }],
    layers: { wireframe: true, skeleton: true },
    onLayers,
  }))
  const skeleton = await screen.findByRole('button', { name: 'Skeleton' })
  // the seated overlay reads pressed; the mode still reads wireframe
  expect(skeleton.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Wireframe' }).getAttribute('aria-pressed')).toBe('true')
  // the overlay vote flips ONLY its flag (the mode rides along)
  fireEvent.click(skeleton)
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: false })
  // the mode votes preserve the overlay (never a silent layer drop)
  fireEvent.click(screen.getByRole('button', { name: 'Shaded' }))
  expect(onLayers).toHaveBeenCalledWith({ wireframe: false, skeleton: true })
})
