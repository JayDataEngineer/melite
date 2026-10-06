// @vitest-environment happy-dom
// glb-stage-load.spec.tsx — THE MESH LOAD PATH (glb-stage.tsx half
// 2): the loader fans one GLTF load per asset off the fetch door;
// successes settle (overrides applied, scene normalized, errors
// cleared); failures voice per-asset (never a dead stage); the
// WebGL mount then refuses headless with its honest face. The GLB
// bytes are CRAFTED (one triangle mesh + one points cloud — the
// standard-material and non-emissive tint arms both walk); the fetch
// door is a FAKE, never a module mock.
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import * as THREE from '@melite/three-client/client'

import { autoFitToHeight, GlbStagePreview, meshAssetUrl } from '../src/glb-stage.tsx'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

/** A minimal valid GLB: one node → one mesh of two primitives (a
 *  default-material triangle + a POINTS cloud). No images, no
 *  skins — parse needs nothing headless-absent. */
function craftGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'root' }],
    meshes: [{
      name: 'm',
      primitives: [
        { attributes: { POSITION: 0 } },
        { attributes: { POSITION: 0 }, mode: 0 },
      ],
    }],
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
 *  defeat three's FileLoader cache across tests), records calls. */
function installGlbDoor(fail?: (url: string) => Response | Promise<never>): {
  calls: string[]
  restore: () => void
} {
  const realFetch = globalThis.fetch
  const calls: string[] = []
  const glb = craftGlb()
  globalThis.fetch = (async (input: unknown) => {
    const url = typeof input === 'string' ? input : String((input as Request).url)
    calls.push(url)
    if (fail !== undefined) return fail(url)
    return new Response(glb, { status: 200, headers: { 'content-type': 'model/gltf-binary' } })
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = realFetch } }
}

test('meshAssetUrl: estate input paths use the input asset door', () => {
  expect(meshAssetUrl('data/input/donor.glb')).toBe('/v1/assets/inputs/donor.glb')
  expect(meshAssetUrl('data/input/donor.gltf')).toBe('/v1/assets/inputs/donor.gltf')
  expect(meshAssetUrl('/melite-media/runs/r1/mesh.glb')).toBe('/melite-media/runs/r1/mesh.glb')
})

test('autoFitToHeight: an empty root never scales (no largest dimension — no divide, no throw)', () => {
  const root = new THREE.Group()
  const { height } = autoFitToHeight(root)
  expect(height > 0).toBe(false)
})

test('THE LOAD: successes settle — overrides ride, the scene normalizes, the error clears', async () => {
  const door = installGlbDoor()
  try {
    const onAssetError = vi.fn()
    const urlA = `/mesh-a-${urlSeq++}.glb`
    const urlB = `/mesh-b-${urlSeq++}.glb`
    render(h(GlbStagePreview, {
      assets: [
        { id: 'a', url: urlA, scale: 2, rotation: [0, 1, 0] as const, position: [1, 0, 0] as const },
        { id: 'b', url: urlB },
      ],
      onAssetError,
    }))
    // both urls fan out (one load per asset, overrides or bare)
    await waitFor(() => { expect(door.calls.filter((u) => u.includes(urlA) || u.includes(urlB)).length).toBe(2) })
    // WebGL is absent headless — the honest failure face, per asset settled
    await waitFor(() => { expect(screen.getByText(/viewport failed:/)).not.toBeNull() })
    expect(onAssetError).toHaveBeenCalledWith('a', null)
    expect(onAssetError).toHaveBeenCalledWith('b', null)
  } finally {
    door.restore()
  }
})

test('THE LOAD ERROR: a refusing door voices per-asset (never a dead stage, never a false ready)', async () => {
  const door = installGlbDoor(() => new Response('gone', { status: 404 }))
  try {
    const onAssetError = vi.fn()
    const url = `/mesh-404-${urlSeq++}.glb`
    render(h(GlbStagePreview, { assets: [{ id: 'a', url }], onAssetError }))
    await waitFor(() => {
      expect(onAssetError).toHaveBeenCalledTimes(1)
    })
    const [id, msg] = onAssetError.mock.calls[0] as [string, string | null]
    expect(id).toBe('a')
    expect(typeof msg).toBe('string')
    expect((msg as string).length).toBeGreaterThan(0)
    // the failed load settles ready-with-nothing (the bare canvas
    // shell seats — the layout stands down, never a mount on emptiness)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="stage-preview-glb"]')).not.toBeNull()
    })
  } finally {
    door.restore()
  }
})

test('THE LOAD ERROR: a non-Error rejection voices the fallback (never an empty voice)', async () => {
  const door = installGlbDoor(() => Promise.reject('door-exploded') as Promise<never>)
  try {
    const onAssetError = vi.fn()
    render(h(GlbStagePreview, { assets: [{ id: 'a', url: `/mesh-rej-${urlSeq++}.glb` }], onAssetError }))
    await waitFor(() => { expect(onAssetError).toHaveBeenCalledTimes(1) })
    expect(onAssetError).toHaveBeenCalledWith('a', 'glb load failed')
  } finally {
    door.restore()
  }
})

test('THE UNMOUNT RACE: settling after unmount voices nothing (the dead never speak)', async () => {
  let release!: () => void
  const gate = new Promise<never>(() => {})
  void gate
  const realCraft = craftGlb()
  const realFetch = globalThis.fetch
  globalThis.fetch = ((_input: unknown) => new Promise<Response>((resolve) => {
    release = () => { resolve(new Response(realCraft, { status: 200 })) }
  })) as typeof fetch
  try {
    const onAssetError = vi.fn()
    const { unmount } = render(h(GlbStagePreview, {
      assets: [{ id: 'a', url: `/mesh-gated-${urlSeq++}.glb` }],
      onAssetError,
    }))
    unmount()
    release()
    await new Promise((r) => { setTimeout(r, 50) })
    expect(onAssetError).not.toHaveBeenCalled()
  } finally {
    globalThis.fetch = realFetch
  }
})

test('THE KEY CHANGE: new assets refetch (the stale never show); same assets never refetch', async () => {
  const door = installGlbDoor()
  try {
    const urlA = `/mesh-key-a-${urlSeq++}.glb`
    const urlB = `/mesh-key-b-${urlSeq++}.glb`
    const { rerender } = render(h(GlbStagePreview, { assets: [{ id: 'a', url: urlA }] }))
    await waitFor(() => { expect(door.calls.filter((u) => u.includes(urlA)).length).toBe(1) })
    rerender(h(GlbStagePreview, { assets: [{ id: 'a', url: urlA }] }))
    await new Promise((r) => { setTimeout(r, 30) })
    expect(door.calls.filter((u) => u.includes(urlA)).length).toBe(1)
    rerender(h(GlbStagePreview, { assets: [{ id: 'b', url: urlB }] }))
    await waitFor(() => { expect(door.calls.filter((u) => u.includes(urlB)).length).toBe(1) })
  } finally {
    door.restore()
  }
})

test('THE CUSTOM CHROME: label + empty hint ride the faces (never the defaults when claimed)', () => {
  render(h(GlbStagePreview, { assets: [], label: 'my-stage', emptyHint: 'nothing here yet' }))
  expect(document.querySelector('[data-viewport="my-stage"]')).not.toBeNull()
  expect(screen.getByText('nothing here yet')).not.toBeNull()
})

test('THE SELECTION: picking an asset re-tints without remounting (the load set stands)', async () => {
  const door = installGlbDoor()
  try {
    const url = `/mesh-sel-${urlSeq++}.glb`
    const { rerender } = render(h(GlbStagePreview, {
      assets: [{ id: 'a', url }, { id: 'b', url }],
      selectedId: 'a',
    }))
    await waitFor(() => { expect(screen.getByText(/viewport failed:/)).not.toBeNull() })
    const callsBefore = door.calls.length
    rerender(h(GlbStagePreview, {
      assets: [{ id: 'a', url }, { id: 'b', url }],
      selectedId: 'b',
    }))
    await new Promise((r) => { setTimeout(r, 30) })
    // the selection walks the loaded set — no reload, the face stands
    expect(door.calls.length).toBe(callsBefore)
    expect(screen.getByText(/viewport failed:/)).not.toBeNull()
  } finally {
    door.restore()
  }
})

test('THE ALL-FAIL: every asset failing still settles ready (the layout stands down, the stage waits)', async () => {
  const door = installGlbDoor(() => new Response('gone', { status: 404 }))
  try {
    const url = `/mesh-allfail-${urlSeq++}.glb`
    render(h(GlbStagePreview, { assets: [{ id: 'a', url }] }))
    // ready with nothing loaded seats the bare canvas shell (no mount attempt on emptiness)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="stage-preview-glb"]')).not.toBeNull()
    })
    expect(door.calls.length).toBe(1)
  } finally {
    door.restore()
  }
})

test('THE UNMOUNT RACE (ERROR HALF): failing after unmount voices nothing (the dead never speak)', async () => {
  let release!: (reason: unknown) => void
  const realFetch = globalThis.fetch
  globalThis.fetch = ((_input: unknown) => new Promise<Response>((_resolve, reject) => {
    release = reject
  })) as typeof fetch
  try {
    const onAssetError = vi.fn()
    const { unmount } = render(h(GlbStagePreview, {
      assets: [{ id: 'a', url: `/mesh-gated-err-${urlSeq++}.glb` }],
      onAssetError,
    }))
    unmount()
    release(new Error('door slammed'))
    await new Promise((r) => { setTimeout(r, 50) })
    expect(onAssetError).not.toHaveBeenCalled()
  } finally {
    globalThis.fetch = realFetch
  }
})
