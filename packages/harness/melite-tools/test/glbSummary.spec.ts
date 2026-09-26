/**
 * glbSummary — the mesh structural read (the bytes-are-truth twin of
 * the image sniff). These are the numbers `melite_view` reports for a
 * `.glb` when the run emitted no raster poster, so a wrong count here
 * is a wrong claim to the model.
 */
import { describe, expect, it } from 'vitest'

import { meshVoice, summarizeMesh } from '../src/tools/glbSummary.ts'

/** A real-shaped GLB: header + JSON chunk + a BIN chunk, 4-byte padded. */
function glb(gltf: Record<string, unknown>, binBytes = 8): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonPad = (4 - (json.length % 4)) % 4
  const binPad = (4 - (binBytes % 4)) % 4
  const total = 12 + 8 + json.length + jsonPad + 8 + binBytes + binPad
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true) // 'glTF'
  view.setUint32(4, 2, true) // version
  view.setUint32(8, total, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true) // 'JSON'
  out.set(json, 20)
  let off = 20 + json.length + jsonPad
  view.setUint32(off, binBytes, true)
  view.setUint32(off + 4, 0x004e4942, true) // 'BIN'
  return out
}

const ACCESSORS = [
  { count: 412903, min: [-0.49, -0.01, -0.47], max: [0.49, 0.49, 0.47] }, // POSITION
  { count: 1947159 }, // indices
]

const TRELLIS_SHAPED = {
  asset: { generator: 'ComfyUI', version: '2.0' },
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 0, TEXCOORD_0: 0, TANGENT: 0 }, indices: 1, material: 0 }] }],
  materials: [{}],
  textures: [{ source: 0 }, { source: 1 }, { source: 2 }],
  images: [{ mimeType: 'image/png' }, { mimeType: 'image/png' }, { mimeType: 'image/png' }],
  accessors: ACCESSORS,
}

describe('summarizeMesh — the container walk', () => {
  it('reads a GLB JSON chunk past its BIN chunk', () => {
    const s = summarizeMesh(glb(TRELLIS_SHAPED), 'trellis2_native_00004.glb')
    expect(s.version).toBe(2)
    expect(s.generator).toBe('ComfyUI')
    expect(s.meshes).toBe(1)
    expect(s.primitives).toBe(1)
    expect(s.vertices).toBe(412903)
    expect(s.triangles).toBe(649053) // 1947159 / 3, floored
    expect(s.materials).toBe(1)
    expect(s.textures).toBe(3)
    expect(s.images).toBe(3)
    expect(s.textured).toBe(true)
    expect(s.size_bytes).toBeGreaterThan(0)
  })

  it('sums across primitives and meshes (a rig is many primitives)', () => {
    const s = summarizeMesh(glb({
      asset: {},
      meshes: [
        { primitives: [{ attributes: { POSITION: 0 } }, { attributes: { POSITION: 0 } }] },
        { primitives: [{ attributes: { POSITION: 0 } }] },
      ],
      accessors: [{ count: 10, min: [0, 0, 0], max: [1, 1, 1] }],
    }), 'rig.glb')
    expect(s.meshes).toBe(2)
    expect(s.primitives).toBe(3)
    expect(s.vertices).toBe(30)
    expect(s.triangles).toBe(9) // 3 primitives × floor(10/3)
    expect(s.textured).toBe(false)
  })

  it('reads a bare .gltf (JSON, no wrapper)', () => {
    const s = summarizeMesh(new TextEncoder().encode(JSON.stringify(TRELLIS_SHAPED)), 'm.gltf')
    expect(s.vertices).toBe(412903)
    expect(s.version).toBeUndefined()
  })

  it('unions the POSITION accessor bounds', () => {
    const s = summarizeMesh(glb(TRELLIS_SHAPED), 'm.glb')
    expect(s.bounds).toBeDefined()
    expect(s.bounds!.min[0]).toBeCloseTo(-0.49, 5)
    expect(s.bounds!.max[1]).toBeCloseTo(0.49, 5)
  })

  it('omits bounds when no accessor declares them (no invented geometry)', () => {
    const s = summarizeMesh(glb({ asset: {}, meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 3 }] }), 'm.glb')
    expect(s.bounds).toBeUndefined()
  })
})

describe('summarizeMesh — a bad container refuses, never reports zero', () => {
  it('rejects a non-GLB magic', () => {
    expect(() => summarizeMesh(new Uint8Array(20), 'x.glb')).toThrow(/magic is absent/)
  })

  it('rejects a truncated header', () => {
    expect(() => summarizeMesh(new Uint8Array(4), 'x.glb')).toThrow(/shorter than its 12-byte header/)
  })

  it('rejects a declared length past the bytes present (a truncated download)', () => {
    const data = glb(TRELLIS_SHAPED)
    new DataView(data.buffer).setUint32(8, data.length + 1000, true)
    expect(() => summarizeMesh(data, 'x.glb')).toThrow(/only \d+ are present/)
  })

  it('rejects a container with no JSON chunk', () => {
    const out = new Uint8Array(12 + 8 + 4)
    const view = new DataView(out.buffer)
    view.setUint32(0, 0x46546c67, true)
    view.setUint32(4, 2, true)
    view.setUint32(8, out.length, true)
    view.setUint32(12, 4, true)
    view.setUint32(16, 0x004e4942, true) // BIN only
    expect(() => summarizeMesh(out, 'x.glb')).toThrow(/no JSON chunk/)
  })
})

describe('meshVoice — the sentence the model reads', () => {
  it('states the counts, the UV-map and the extents', () => {
    const v = meshVoice(summarizeMesh(glb(TRELLIS_SHAPED), 'm.glb'))
    expect(v).toContain('1 mesh(es)')
    expect(v).toContain('412903 vertices')
    expect(v).toContain('649053 triangles')
    expect(v).toContain('3 texture(s)')
    expect(v).toContain('UV-mapped')
    expect(v).toMatch(/bounds 0\.98\dx0\.50\dx0\.94/)
  })

  it('says "untextured" rather than implying a texture it did not find', () => {
    const v = meshVoice(summarizeMesh(glb({ asset: {}, meshes: [], accessors: [] }), 'm.glb'))
    expect(v).toContain('untextured')
    expect(v).not.toContain('UV-mapped')
  })
})
