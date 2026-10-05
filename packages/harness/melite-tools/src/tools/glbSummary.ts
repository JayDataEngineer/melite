/**
 * glbSummary — the 3D artifact's STRUCTURAL summary, read from bytes.
 *
 * WHY IT EXISTS (the operator's 2026-09-26 order, paraphrased: 3d output
 * must be reachable from the media doors, visually"): `melite_view`'s image /
 * film / audio arms all end in an IMAGE the model can see. A `.glb` has
 * no raster, so before the 3D lanes emitted a poster the agent's only
 * honest observation of a mesh was a refusal that said nothing about
 * the artifact. This parser is what makes the door say something true:
 * it is the same glTF JSON chunk the viewer parses, read as DATA.
 *
 * THE CONTAINER WALK: a GLB is a 12-byte header (`glTF`, version, total
 * length) then length-prefixed chunks — JSON (0x4E4F534A) and BIN
 * (0x004E4942). Only the JSON chunk is read; the BIN chunk is skipped by
 * its declared length, never by seeking for a magic. A bare `.gltf` is
 * the same JSON without the wrapper, so one core serves both.
 *
 * THE CONTAINMENT + CAP LAWS are the caller's (the run walk builds the
 * path from its own root + runId + name); this module never sees a
 * caller-supplied path.
 */

/** One number triple / count set — the fields a caller reports. */
export interface MeshSummary {
  /** The artifact name (echoed for the refusal voice). */
  file: string
  /** Byte length as read. */
  size_bytes: number
  /** glTF version (GLB header), when the container carried one. */
  version?: number
  /** The generator string, when present. */
  generator?: string
  /** Mesh / primitive / material / texture / image counts. */
  meshes: number
  primitives: number
  materials: number
  textures: number
  images: number
  /** Summed POSITION accessor counts across every primitive. */
  vertices: number
  /** Triangle count (indexed count / 3, else positions / 3). */
  triangles: number
  /** Whether any primitive carries a TEXCOORD_0 (a textured mesh). */
  textured: boolean
  /** Union of POSITION accessor min/max, when the accessors declare it. */
  bounds?: { min: [number, number, number], max: [number, number, number] }
  /** True when the bytes were a JSON `.gltf` rather than a GLB. */
  gltf_json?: boolean
}

const GLB_MAGIC = 0x46546c67 // 'glTF' little-endian
const CHUNK_JSON = 0x4e4f534a // 'JSON'
const GLB_HEADER = 12

/** One little-endian u32 at `at`. Every call site is LENGTH-GUARDED
 *  by its caller — the header read past the 12-byte check (:73) and the
 *  chunk reads past `off + 8 <= total` with `total <= data.length`
 *  (:77-81) — so the four bytes are in range and the read never
 *  coerces a missing byte to zero (the re-audit, 2026-10-16). */
function readU32(data: Uint8Array, at: number): number {
  return data[at] | (data[at + 1] << 8) | (data[at + 2] << 16) | (data[at + 3] << 24)
}

/** The glTF JSON out of GLB bytes (or the bytes themselves when they
 *  are already JSON). Throws with a legible voice on a bad container —
 *  a silent zero summary would be a lie about the artifact. */
function gltfJsonOf(data: Uint8Array): { json: Record<string, unknown>, version?: number } {
  // A bare .gltf is JSON text; the first non-space byte decides.
  const first = data.find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d)
  if (first === 0x7b /* '{' */) {
    return { json: JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown> }
  }
  if (data.length < GLB_HEADER) throw new Error('not a GLB: shorter than its 12-byte header')
  if (readU32(data, 0) !== GLB_MAGIC) throw new Error('not a GLB: the "glTF" magic is absent')
  const version = readU32(data, 4)
  const total = readU32(data, 8)
  if (total > data.length) {
    throw new Error('not a GLB: the header declares ' + String(total) + ' bytes but only ' + String(data.length) + ' are present')
  }
  let off = GLB_HEADER
  while (off + 8 <= total) {
    const len = readU32(data, off)
    const type = readU32(data, off + 4)
    if (type === CHUNK_JSON) {
      const end = Math.min(off + 8 + len, data.length)
      const text = new TextDecoder().decode(data.subarray(off + 8, end))
      return { json: JSON.parse(text) as Record<string, unknown>, version }
    }
    // 4-byte alignment: chunks pad to a 4-byte boundary.
    off += 8 + len + ((4 - (len % 4)) % 4)
  }
  throw new Error('not a GLB: no JSON chunk in the container')
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

/** Summarize a mesh artifact's bytes. Throws on a non-mesh container. */
export function summarizeMesh(data: Uint8Array, file: string): MeshSummary {
  const { json, version } = gltfJsonOf(data)
  const accessors = Array.isArray(json['accessors']) ? json['accessors'] as Array<Record<string, unknown>> : []
  const meshes = Array.isArray(json['meshes']) ? json['meshes'] as Array<Record<string, unknown>> : []
  const materials = Array.isArray(json['materials']) ? json['materials'] : []
  const textures = Array.isArray(json['textures']) ? json['textures'] : []
  const images = Array.isArray(json['images']) ? json['images'] : []

  let vertices = 0
  let triangles = 0
  let primitives = 0
  let textured = false
  let hasBounds = false
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]

  for (const mesh of meshes) {
    const prims = Array.isArray(mesh['primitives']) ? mesh['primitives'] as Array<Record<string, unknown>> : []
    for (const prim of prims) {
      primitives += 1
      const attrs = prim['attributes'] !== null && typeof prim['attributes'] === 'object'
        ? prim['attributes'] as Record<string, unknown>
        : {}
      if (attrs['TEXCOORD_0'] !== undefined) textured = true
      const posIndex = num(attrs['POSITION'])
      if (posIndex === undefined) continue
      const pos = accessors[posIndex]
      if (pos === undefined) continue
      const count = num(pos['count']) ?? 0
      vertices += count
      const idxIndex = num(prim['indices'])
      const idx = idxIndex === undefined ? undefined : accessors[idxIndex]
      const triSrc = idx === undefined ? count : (num(idx['count']) ?? 0)
      triangles += Math.floor(triSrc / 3)
      const pmin = pos['min']
      const pmax = pos['max']
      if (Array.isArray(pmin) && Array.isArray(pmax)) {
        for (let i = 0; i < 3; i += 1) {
          const lo = num(pmin[i])
          const hi = num(pmax[i])
          if (lo === undefined || hi === undefined) continue
          if (lo < (min[i] as number)) min[i] = lo
          if (hi > (max[i] as number)) max[i] = hi
          hasBounds = true
        }
      }
    }
  }

  const asset = json['asset'] !== null && typeof json['asset'] === 'object' ? json['asset'] as Record<string, unknown> : {}
  const out: MeshSummary = {
    file,
    size_bytes: data.length,
    meshes: meshes.length,
    primitives,
    materials: materials.length,
    textures: textures.length,
    images: images.length,
    vertices,
    triangles,
    textured,
  }
  if (version !== undefined) out.version = version
  const generator = asset['generator']
  if (typeof generator === 'string') out.generator = generator
  if (hasBounds) out.bounds = { min, max }
  return out
}

/** The one-line voice the agent reads when the mesh has no raster. */
export function meshVoice(s: MeshSummary): string {
  const bits = [
    String(s.meshes) + ' mesh(es)',
    String(s.vertices) + ' vertices',
    String(s.triangles) + ' triangles',
    String(s.materials) + ' material(s)',
    String(s.textures) + ' texture(s)',
    s.textured ? 'UV-mapped' : 'untextured',
    String(s.size_bytes) + ' bytes',
  ]
  if (s.bounds !== undefined) {
    const size = [0, 1, 2].map((i) => (s.bounds!.max[i] as number) - (s.bounds!.min[i] as number))
    bits.push('bounds ' + size.map((v) => v.toFixed(3)).join('x'))
  }
  return bits.join(', ')
}
