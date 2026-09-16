// @vitest-environment happy-dom
/**
 * Shared motion-studio fixtures: a hand-rolled minimal NPZ writer
 * (stored ZIP + NPY v1 — parseNpz handles method 0 with NO
 * DecompressionStream) for the synthetic SOMA skin, the REAL writeNpz
 * for motion blobs, the stage fixture, and the fetch router.
 */
import { writeNpz } from '@melite/formats'

function npy(descr: string, shape: number[], payload: Uint8Array): Uint8Array {
  const dict = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${shape.join(', ')}${shape.length === 1 ? ',' : ''}), }`
  let header = dict + '\n'
  while ((10 + header.length) % 64 !== 0) header = header.replace(/\n$/, ' \n')
  const hb = new TextEncoder().encode(header)
  const out = new Uint8Array(10 + hb.length + payload.length)
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0])
  out[8] = hb.length & 0xff
  out[9] = (hb.length >> 8) & 0xff
  out.set(hb, 10)
  out.set(payload, 10 + hb.length)
  return out
}

function u32(v: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, v, true)
  return b
}

function zipStored(entries: Array<[string, Uint8Array]>): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const [name, data] of entries) {
    const nb = enc.encode(name)
    const local = new Uint8Array(30 + nb.length + data.length)
    local.set([0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    local.set(u32(data.length), 18)
    local.set(u32(data.length), 22)
    local.set([nb.length & 0xff, (nb.length >> 8) & 0xff, 0, 0], 26)
    local.set(nb, 30)
    local.set(data, 30 + nb.length)
    locals.push(local)
    const central = new Uint8Array(46 + nb.length)
    central.set([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    central.set(u32(data.length), 20)
    central.set(u32(data.length), 24)
    central.set([nb.length & 0xff, (nb.length >> 8) & 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 28)
    central.set(u32(offset), 42)
    central.set(nb, 46)
    centrals.push(central)
    offset += local.length
  }
  const cdSize = centrals.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22)
  end.set([0x50, 0x4b, 5, 6, 0, 0, 0, 0])
  end.set([entries.length & 0xff, (entries.length >> 8) & 0xff], 8)
  end.set([entries.length & 0xff, (entries.length >> 8) & 0xff], 10)
  end.set(u32(cdSize), 12)
  end.set(u32(offset), 16)
  const out = new Uint8Array(offset + cdSize + 22)
  let p = 0
  for (const l of locals) { out.set(l, p); p += l.length }
  for (const c of centrals) { out.set(c, p); p += c.length }
  out.set(end, p)
  return out
}

const V = 8 // toy bind mesh: 8 verts, 2 tris
const W = 8 // skin_standard's influence width

/** A valid SOMA skin NPZ (77 joints, identity+translation binds). */
export function skinNpzBytes(): Uint8Array {
  const bv = new Float32Array(V * 3)
  for (let v = 0; v < V; v++) {
    bv[v * 3] = (v % 4) * 0.1 - 0.15
    bv[v * 3 + 1] = 0.8 + (v % 3) * 0.1
    bv[v * 3 + 2] = ((v / 4) | 0) * 0.1 - 0.05
  }
  const faces = new BigInt64Array([0n, 1n, 2n, 0n, 2n, 3n])
  const bind = new Float32Array(77 * 16)
  for (let j = 0; j < 77; j++) {
    bind[j * 16] = 1
    bind[j * 16 + 5] = 1
    bind[j * 16 + 10] = 1
    bind[j * 16 + 15] = 1
    bind[j * 16 + 3] = j * 0.01
    bind[j * 16 + 7] = 0.9 + (j % 7) * 0.02
    bind[j * 16 + 11] = (j % 5) * 0.01
  }
  const idx = new Uint32Array(V * W) // every vert rides joint 0
  const wts = new Float32Array(V * W)
  for (let v = 0; v < V; v++) wts[v * W] = 1
  return zipStored([
    ['bind_vertices.npy', npy('<f4', [V, 3], new Uint8Array(bv.buffer))],
    ['faces.npy', npy('<i8', [2, 3], new Uint8Array(faces.buffer))],
    ['bind_rig_transform.npy', npy('<f4', [77, 4, 4], new Uint8Array(bind.buffer))],
    ['lbs_indices.npy', npy('<i4', [V, W], new Uint8Array(idx.buffer))],
    ['lbs_weights.npy', npy('<f4', [V, W], new Uint8Array(wts.buffer))],
  ])
}

/** A real motion NPZ (static stand, identity rotations) via writeNpz. */
export async function motionNpzBytes(T = 4, fps = 30): Promise<Uint8Array> {
  const posed = new Float32Array(T * 77 * 3)
  const rots = new Float32Array(T * 77 * 9)
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < 77; j++) {
      posed[(t * 77 + j) * 3] = j * 0.01
      posed[(t * 77 + j) * 3 + 1] = 0.9 + (j % 7) * 0.02
      posed[(t * 77 + j) * 3 + 2] = (j % 5) * 0.01
      const r = (t * 77 + j) * 9
      rots[r] = 1
      rots[r + 4] = 1
      rots[r + 8] = 1
    }
  }
  return writeNpz({
    posed_joints: { data: posed, shape: [T, 77, 3] },
    global_rot_mats: { data: rots, shape: [T, 77, 9] },
    fps: { data: new Float32Array([fps]) },
  })
}

export const SKIN_URL = '/v1/models/kimodo/provisions/skin_standard.npz'
export const MOTION_URL = 'https://host/m.npz'

export function skinResponse(): Response {
  return new Response(skinNpzBytes().slice().buffer as ArrayBuffer)
}

export async function motionResponse(T = 4, fps = 30): Promise<Response> {
  const b = await motionNpzBytes(T, fps)
  return new Response(b.slice().buffer as ArrayBuffer)
}
