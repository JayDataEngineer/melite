// @vitest-environment happy-dom
// glb-stage-layers.spec.tsx — THE LAYER MODEL + STAGE BEHAVIORS
// (primitive ② walls): shaded vs wireframe + the skeleton overlay
// (applyWireframe/skeletonHelperFor walk loaded groups; the chips
// vote the caller's state), and the turntable (turntableTick: pure
// per-frame spin). The fetch door is a FAKE (the load spec's
// crafted GLB, copied — walls stand alone in this repo), never a
// module mock.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import * as THREE from 'three'

import { applyWeightsHeat, applyWireframe, GlbStagePreview, heatColor, skeletonHelperFor, slotLabelOf, TURNTABLE_SPEED, turntableTick } from '../src/glb-stage.tsx'

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
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: false, weights: false })
  fireEvent.click(shaded)
  expect(onLayers).toHaveBeenCalledWith({ wireframe: false, skeleton: false, weights: false })
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
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: false, weights: false })
  // the mode votes preserve the overlay (never a silent layer drop)
  fireEvent.click(screen.getByRole('button', { name: 'Shaded' }))
  expect(onLayers).toHaveBeenCalledWith({ wireframe: false, skeleton: true, weights: false })
})

test('THE WEIGHTS VOTE: pressed reads the caller flag, votes flip only themselves, siblings preserve it', async () => {
  stubGlbDoor()
  const onLayers = vi.fn()
  // THE CALLER-STATE LOOP (the real studio shape): every vote feeds
  // back through `layers` — the stage is a pure function of its
  // props, so a vote the caller never acknowledged NEVER compounds.
  const seat = (layers: { wireframe: boolean; skeleton: boolean; weights?: boolean }, rerender: (ui: ReturnType<typeof h>) => void): void => {
    rerender(h(GlbStagePreview, {
      assets: [{ id: 'a', url: '/mesh-layer-w.glb' }], layers, onLayers,
    }))
  }
  const { rerender } = render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-layer-w.glb' }],
    layers: { wireframe: false, skeleton: true, weights: true },
    onLayers,
  }))
  const weights = await screen.findByRole('button', { name: 'Weights' })
  expect(weights.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Skeleton' }).getAttribute('aria-pressed')).toBe('true')
  // the weights vote flips ONLY its own flag (sibling flags ride along)
  fireEvent.click(weights)
  expect(onLayers).toHaveBeenCalledWith({ wireframe: false, skeleton: true, weights: false })
  // the caller seats the vote; every sibling vote carries it (never a drop)
  seat({ wireframe: false, skeleton: true, weights: false }, rerender)
  fireEvent.click(screen.getByRole('button', { name: 'Wireframe' }))
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: true, weights: false })
  seat({ wireframe: true, skeleton: true, weights: false }, rerender)
  fireEvent.click(screen.getByRole('button', { name: 'Skeleton' }))
  expect(onLayers).toHaveBeenCalledWith({ wireframe: true, skeleton: false, weights: false })
})

test('heatColor: the 5-stop ramp — blue→cyan→green→yellow→red, clamped at both ends', () => {
  const eq = (a: readonly number[], b: readonly number[]): void => {
    for (let i = 0; i < 3; i++) expect(Math.abs(a[i]! - b[i]!)).toBeLessThan(1e-9)
  }
  eq(heatColor(0), [0, 0, 1])
  eq(heatColor(0.25), [0, 1, 1])
  eq(heatColor(0.5), [0, 1, 0])
  eq(heatColor(0.75), [1, 1, 0])
  eq(heatColor(1), [1, 0, 0])
  // clamp: outside the domain reads as the stop it points past
  eq(heatColor(-1), [0, 0, 1])
  eq(heatColor(2), [1, 0, 0])
  // mid-segment lerps (halfway blue→cyan)
  eq(heatColor(0.125), [0, 0.5, 1])
})

/** A skinned test mesh: position (3 verts) + skinWeight (4 comps/vert). */
function skinnedMesh(): { group: THREE.Group; geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial } {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  // vert 0: bone A dominates (1.0 → red); vert 1: split 0.5/0.5 (mid ramp);
  // vert 2: 0.25 across four (the floor → blue)
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array([
    1, 0, 0, 0,
    0.5, 0.5, 0, 0,
    0.25, 0.25, 0.25, 0.25,
  ]), 4))
  const mat = new THREE.MeshStandardMaterial()
  const group = new THREE.Group()
  group.add(new THREE.Mesh(geo, mat))
  return { group, geo, mat }
}

test('applyWeightsHeat: paints dominant-weight heat, restores originals, skips unskinned', () => {
  const { group, geo, mat } = skinnedMesh()
  const bare = new THREE.Group()
  const bareMat = new THREE.MeshStandardMaterial()
  bare.add(new THREE.Mesh(new THREE.BoxGeometry(), bareMat))
  applyWeightsHeat(group, true)
  expect(mat.vertexColors).toBe(true)
  const colors = geo.getAttribute('color') as THREE.BufferAttribute
  expect(colors).not.toBeUndefined()
  // dominant weight per vert: 1 → red, 0.5 → green, 0.25 → blue
  const c = (i: number): readonly number[] => [colors.getX(i), colors.getY(i), colors.getZ(i)]
  for (let i = 0; i < 3; i++) {
    const [r, g, b] = c(i)
    expect(Math.abs(r - heatColor([1, 0.5, 0.25][i]!)[0])).toBeLessThan(1e-6)
    expect(Math.abs(g - heatColor([1, 0.5, 0.25][i]!)[1])).toBeLessThan(1e-6)
    expect(Math.abs(b - heatColor([1, 0.5, 0.25][i]!)[2])).toBeLessThan(1e-6)
  }
  // the unskinned neighbor never paints (no skinWeight — no lane)
  applyWeightsHeat(bare, true)
  expect(bareMat.vertexColors).toBe(false)
  // OFF with no original color: ours deletes, the flag clears
  applyWeightsHeat(group, false)
  expect(geo.getAttribute('color')).toBeUndefined()
  expect(mat.vertexColors).toBe(false)
})

test('applyWeightsHeat: a pre-existing color attribute is restored verbatim (identity, not a copy)', () => {
  const { group, geo, mat } = skinnedMesh()
  const original = new THREE.BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3)
  geo.setAttribute('color', original)
  applyWeightsHeat(group, true)
  expect(geo.getAttribute('color')).not.toBe(original) // ours, the heat
  applyWeightsHeat(group, false)
  expect(geo.getAttribute('color')).toBe(original) // the caller's, back
  expect(mat.vertexColors).toBe(false)
})

test('slotLabelOf: a named slot reads its label; missing/blank read null (unlabeled seat)', () => {
  expect(slotLabelOf({ id: 'a', url: '/a.glb', slot: 'source' })).toBe('source')
  expect(slotLabelOf({ id: 'a', url: '/a.glb' })).toBeNull()
  expect(slotLabelOf({ id: 'a', url: '/a.glb', slot: '' })).toBeNull()
})

test('TURNTABLE TICK: every group spins by speed×delta about its own Y (pure, additive)', () => {
  const a = new THREE.Group()
  a.rotation.y = 0.25 // a declared rotation — the spin ADDS, never resets
  const b = new THREE.Group()
  turntableTick([a, b], 2)
  expect(a.rotation.y).toBeCloseTo(0.25 + TURNTABLE_SPEED * 2, 12)
  expect(b.rotation.y).toBeCloseTo(TURNTABLE_SPEED * 2, 12)
  // a zero delta is a no-op; an empty set is a no-op (never a throw)
  const before = a.rotation.y
  turntableTick([a], 0)
  expect(a.rotation.y).toBe(before)
  turntableTick([], 1)
})

test('THE TURNTABLE PROP: seats without a throw headless (the honest mount-refusal face stands)', async () => {
  stubGlbDoor()
  const { rerender } = render(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-turntable.glb' }],
    turntable: true,
  }))
  // WebGL is absent headless — the mount refuses, the face is honest,
  // and the tick registration arm never threw on the way there
  await waitFor(() => { expect(screen.getByText(/viewport failed:/)).not.toBeNull() })
  // the flag flips without remount cost (the ref law — never a throw)
  rerender(h(GlbStagePreview, {
    assets: [{ id: 'a', url: '/mesh-turntable.glb' }],
    turntable: false,
  }))
  expect(screen.getByText(/viewport failed:/)).not.toBeNull()
})
