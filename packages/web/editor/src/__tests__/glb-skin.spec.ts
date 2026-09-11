/**
 * glb-skin — the GLB character adapter for the motion card's preview body
 * (2026-08-15 character import).
 *
 * The REAL fixture: public/assets/somax_default_mannequin.glb — a genuine
 * SOMAX-rigged GLB (one mesh, one "SOMA-Mixamo" skin, 77 joints, 18056
 * verts, VEC4 JOINTS_0/WEIGHTS_0, no textures). fetch is stubbed to serve
 * its bytes, so the test exercises the FULL path — GLTFLoader.parse →
 * SkinnedMesh collection → boneInverses transpose → invert4 →
 * restPoseFromBind — against bytes a user would actually drop on the card.
 *
 * The parity proof is the rest-pose identity: deformFrame(restRots,
 * restJoints, skin) == bindVertices. That is the SAME invariant
 * motion-npz.spec.ts pins for the neutral npz skin — if it holds for the
 * glTF-derived substrate, the adapter's column-major→row-major handling
 * and the W=4 (VEC4) influence count are wired correctly, and the card's
 * whole preview flow (deform/scrub/refine/export) runs unchanged on
 * the imported body.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { loadGlbSkin, NotSomaxGlbError } from "@melite/formats"
import { deformFrame } from "@melite/formats"

const HERE = resolve(__dirname)
const MANNEQUIN = readFileSync(
  resolve(HERE, "../../public/assets/somax_default_mannequin.glb"),
)

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
    const u = String(url)
    if (u.includes("mannequin") || u.startsWith("data:") === false && u === "/body.glb") {
      return new Response(MANNEQUIN, { status: 200 })
    }
    if (u.startsWith("data:")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Buffer } = await import("node:buffer")
      const b64 = u.slice(u.indexOf(",") + 1)
      const bytes = Uint8Array.from(Buffer.from(b64, "base64"))
      return new Response(bytes, { status: 200 })
    }
    return new Response("not found", { status: 404 })
  }) as unknown as typeof fetch)
})
afterAll(() => vi.unstubAllGlobals())

/** Pack a minimal GLB: one JSON chunk + one BIN chunk. */
function makeGlb(json: unknown, bin: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json))
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4
  const binPad = (4 - (bin.length % 4)) % 4
  const jsonLen = jsonBytes.length + jsonPad
  const binLen = bin.length + binPad
  const total = 12 + 8 + jsonLen + 8 + binLen
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546c67, true) // "glTF"
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  let o = 12
  dv.setUint32(o, jsonLen, true); dv.setUint32(o + 4, 0x4e4f534a, true); o += 8 // "JSON"
  out.set(jsonBytes, o)
  // JSON padding is SPACES (0x20), never NUL — GLTFLoader JSON.parses the
  // whole chunk incl. padding, and a trailing NUL is a SyntaxError.
  for (let i = 0; i < jsonPad; i++) out[o + jsonBytes.length + i] = 0x20
  o += jsonLen
  dv.setUint32(o, binLen, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8 // "BIN"
  out.set(bin, o)
  return out
}

/** A GLB with a 2-joint rig — a legal glTF skin, NOT SOMAX-77. Rejects. */
function makeTwoJointGlb(): Uint8Array {
  // 3 verts at the origin, one triangle, all weight on joint 0, two
  // identity inverse-bind matrices. Layout (offsets mirrored in bufferViews):
  // pos 0..36, idx 36..42 (+2 pad), joints 44..68, weights 68..116, ibm 116..244.
  const bin = new Uint8Array(244)
  const f = new DataView(bin.buffer)
  let o = 0
  for (let i = 0; i < 9; i++) { f.setFloat32(o, 0, true); o += 4 } // POSITION (3×VEC3)
  for (let i = 0; i < 3; i++) { f.setUint16(o, i, true); o += 2 }  // indices (3×u16)
  f.setUint16(o, 0, true); o += 2 // pad
  for (let v = 0; v < 3; v++) {  // JOINTS_0 (3×VEC4 u16)
    for (let c = 0; c < 4; c++) { f.setUint16(o, 0, true); o += 2 }
  }
  for (let v = 0; v < 3; v++) {  // WEIGHTS_0 (3×VEC4 f32) — [1,0,0,0]
    f.setFloat32(o, 1, true); o += 4
    for (let c = 0; c < 3; c++) { f.setFloat32(o, 0, true); o += 4 }
  }
  for (let j = 0; j < 2; j++) {  // 2× identity MAT4 (f32)
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      f.setFloat32(o, r === c ? 1 : 0, true); o += 4
    }
  }
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    // node 0 = skinned mesh holder; nodes 1,2 = the two joints.
    nodes: [{ mesh: 0, skin: 0 }, {}, {}],
    skins: [{ joints: [1, 2], inverseBindMatrices: 4, skeleton: 1 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, JOINTS_0: 2, WEIGHTS_0: 3 },
        indices: 1,
      }],
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [0, 0, 0] },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
      { bufferView: 2, componentType: 5123, count: 3, type: "VEC4" },
      { bufferView: 3, componentType: 5126, count: 3, type: "VEC4" },
      { bufferView: 4, componentType: 5126, count: 2, type: "MAT4" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 },
      { buffer: 0, byteOffset: 44, byteLength: 24 },
      { buffer: 0, byteOffset: 68, byteLength: 48 },
      { buffer: 0, byteOffset: 116, byteLength: 128 },
    ],
    buffers: [{ byteLength: bin.length }],
  }
  return makeGlb(json, bin)
}

describe("loadGlbSkin — the real SOMAX mannequin GLB", () => {
  it("exposes the SOMA-77 contract on the glTF substrate", async () => {
    const skin = await loadGlbSkin("/body.glb")
    expect(skin.jointCount).toBe(77)          // SOMA-77, same as the npz skin
    expect(skin.influences).toBe(4)           // glTF VEC4 (npz skin is 8)
    expect(skin.vertexCount).toBe(18056)      // the fixture's POSITION count
    expect(skin.faceCount).toBe(108324 / 3)   // indices / 3
    expect(skin.bindVertices.length).toBe(18056 * 3)
    expect(skin.lbsIndices.length).toBe(18056 * 4)
    // Real character bind — joints span a human height (~1.7m), not zeros.
    let maxY = -Infinity
    for (let j = 0; j < 77; j++) maxY = Math.max(maxY, skin.restJoints[j * 3 + 1])
    expect(maxY).toBeGreaterThan(1.0)
    expect(maxY).toBeLessThan(2.2)
  })

  it("rest-pose identity: deformFrame(restRots, restJoints) == bindVertices", async () => {
    const skin = await loadGlbSkin("/body.glb")
    const out = new Float32Array(skin.vertexCount * 3)
    deformFrame(skin.restRots, skin.restJoints, skin, out)
    let maxDelta = 0
    let sumDelta = 0
    for (let i = 0; i < out.length; i++) {
      const d = Math.abs(out[i] - skin.bindVertices[i])
      if (d > maxDelta) maxDelta = d
      sumDelta += d
    }
    // float32 round-trips through invert4; per-vertex error stays microscopic.
    expect(sumDelta / out.length).toBeLessThan(1e-4)
    expect(maxDelta).toBeLessThan(2e-3)
  })

  it("glTF weights are normalized (sum to 1 per vertex)", async () => {
    const skin = await loadGlbSkin("/body.glb")
    let worst = 0
    for (let v = 0; v < skin.vertexCount; v++) {
      let sum = 0
      for (let w = 0; w < 4; w++) sum += skin.lbsWeights[v * 4 + w]
      worst = Math.max(worst, Math.abs(sum - 1))
    }
    expect(worst).toBeLessThan(1e-4)
  })

  it("poses a frame: a non-rest global move displaces the mesh", async () => {
    const skin = await loadGlbSkin("/body.glb")
    // Root joint (0) translated +1m in Y: the mesh must move with it.
    const rots = Float32Array.from(skin.restRots)
    const joints = Float32Array.from(skin.restJoints)
    joints[1] += 1
    const out = new Float32Array(skin.vertexCount * 3)
    deformFrame(rots, joints, skin, out)
    const rest = new Float32Array(skin.vertexCount * 3)
    deformFrame(skin.restRots, skin.restJoints, skin, rest)
    let maxMove = 0
    for (let i = 0; i < out.length; i++) {
      maxMove = Math.max(maxMove, Math.abs(out[i] - rest[i]))
    }
    expect(maxMove).toBeGreaterThan(0.1)
  })
})

describe("loadGlbSkin — the SOMAX contract rejects foreign rigs", () => {
  it("throws NotSomaxGlbError for a 2-joint skin", async () => {
    const bytes = makeTwoJointGlb()
    const b64 = Buffer.from(bytes).toString("base64")
    await expect(loadGlbSkin(`data:model/gltf-binary;base64,${b64}`))
      .rejects.toBeInstanceOf(NotSomaxGlbError)
  })
})
