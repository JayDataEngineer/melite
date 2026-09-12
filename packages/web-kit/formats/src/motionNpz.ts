/**
 * motionNpz — the Motion Card's client-side motion engine.
 *
 * Everything the Motion Card needs beyond the raw NPZ bytes, in one place:
 *
 *   • loadMotionNpz        — fetch + parse a kimodo motion NPZ (meters)
 *   • precomputeDeformedVerts — LBS every frame onto the neutral SOMAX skin
 *                             (extracted from MotionViewer — single source)
 *   • vertsToB64 / cm helpers — the PoseViewer3D boundary (cm + base64)
 *   • AZIMUTH_PRESETS      — the 8 export angles (Blender convention,
 *                            0 = front / 90 = right, matching the vnccs
 *                            flow's front_mesh…front_left_mesh names)
 *   • soma77ToCoco18       — TS port of the poser nodes' SOMA→COCO-18
 *                            mapping + ear extrapolation (library/
 *                            soma_to_coco.py — the DWPose / vnccs contract)
 *   • writeNpz             — a browser-side NPZ WRITER (lib/npz.ts is
 *                            reader-only): NPY v1 '<f4' + ZIP method 8 with
 *                            real CRC32 (numpy validates). Feeds the
 *                            prev_motion_artifact chain slot with an
 *                            edited pose.
 *   • patchFrame           — rotation reconstruction: given edited joint
 *                            positions for one frame, rebuild global_rot_mats
 *                            by arc-aligning each joint's child direction
 *                            along the SOMA-77 hierarchy.
 *
 * Units: METERS everywhere (kimodo's native unit), except functions that
 * cross the PoseViewer3D boundary, which is centimeters (its mesh, skeleton
 * and gizmos all apply CM_TO_M internally). Callers convert explicitly.
 */
import * as THREE from "three"
import { parseNpz, type NpyArray } from "./npz"
import { loadSomaSkin, deformFrame, type SomaSkin } from "./somaSkin"
import { encodeBufferToB64, SOMA77_BONE_CONNECTIONS } from "./poseCodec"

const J = 77 // SOMA-77 joints

// ── Loader ─────────────────────────────────────────────────────────────────

export interface MotionNpz {
  /** (T, 77, 3) joint positions, meters, row-major flat. */
  posedJoints: Float32Array
  /** (T, 77, 3, 3) per-joint rotation matrices, meters space, flat (T, 77, 9). */
  globalRotMats: Float32Array
  fps: number
  T: number
}

/** Fetch + parse a kimodo motion NPZ, validating the SOMA-77 contract. */
export async function loadMotionNpz(url: string): Promise<MotionNpz> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch motion asset: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const arrays = await parseNpz(bytes)

  const joints = arrays.get("posed_joints")
  const rotmats = arrays.get("global_rot_mats")
  if (!joints || joints.shape.length < 2) {
    throw new Error(`NPZ missing 'posed_joints' (got: ${[...arrays.keys()].join(", ") || "empty"})`)
  }
  if (!rotmats || rotmats.shape.length < 3) {
    // No `|| "empty"` fallback here (unlike the joints arm above): the
    // joints gate just passed, so `posed_joints` is always among the keys
    // and the join is never empty (proven dead 2026-09-12).
    throw new Error(`NPZ missing 'global_rot_mats' (got: ${[...arrays.keys()].join(", ")})`)
  }
  const T = joints.shape[0]
  if (joints.shape[1] !== 77 || joints.shape[2] !== 3) {
    throw new Error(`Unexpected posed_joints shape ${joints.shape.join("×")} (expected T×77×3)`)
  }
  const fpsArr = arrays.get("fps")
  const fps = fpsArr && fpsArr.data.length > 0 ? (fpsArr.data as Float32Array)[0] : 30

  return {
    posedJoints: joints.data as Float32Array,
    globalRotMats: rotmats.data as Float32Array,
    fps,
    T,
  }
}

// ── LBS precompute (extracted verbatim from MotionViewer) ──────────────────

/**
 * Run client-side LBS for every frame: allVerts (T, V, 3) meters.
 * global_rot_mats is (T, 77, 9) per-joint row-major; posed_joints is
 * (T, 77, 3) — both METERS (kimodo's native unit, no conversion).
 */
export function precomputeDeformedVerts(npz: MotionNpz, skin: SomaSkin): Float32Array {
  const V = skin.vertexCount
  const allVerts = new Float32Array(npz.T * V * 3)
  for (let t = 0; t < npz.T; t++) {
    deformFrame(
      npz.globalRotMats.subarray(t * J * 9, (t + 1) * J * 9),
      npz.posedJoints.subarray(t * J * 3, (t + 1) * J * 3),
      skin,
      allVerts.subarray(t * V * 3, (t + 1) * V * 3),
    )
  }
  return allVerts
}

/**
 * Chunked async variant of precomputeDeformedVerts. Computes the SAME result
 * but yields to the event loop every `chunkFrames` frames (default 3 frames
 * ≈ 10-20ms per chunk for the 18k-vertex SOMA mesh). This keeps the main
 * thread responsive — the browser can paint, service input, and run rAF
 * between chunks instead of freezing for 1-3 seconds.
 *
 * Set `outputCm` to true to produce centimeters (PoseViewer3D's unit) — this
 * folds the ×100 scale INTO the chunk loop so there's no separate scaling pass.
 */
export async function precomputeDeformedVertsChunked(
  npz: MotionNpz,
  skin: SomaSkin,
  outputCm = false,
  chunkFrames = 10,
): Promise<Float32Array> {
  const V = skin.vertexCount
  const stride = V * 3
  const allVerts = new Float32Array(npz.T * stride)
  for (let t = 0; t < npz.T; t += chunkFrames) {
    const end = Math.min(t + chunkFrames, npz.T)
    for (let frame = t; frame < end; frame++) {
      const off = frame * stride
      deformFrame(
        npz.globalRotMats.subarray(frame * J * 9, (frame + 1) * J * 9),
        npz.posedJoints.subarray(frame * J * 3, (frame + 1) * J * 3),
        skin,
        allVerts.subarray(off, off + stride),
      )
      if (outputCm) {
        for (let i = off; i < off + stride; i++) allVerts[i] *= 100
      }
    }
    // Yield between chunks so the browser can paint + service input.
    if (end < npz.T) {
      await new Promise<void>((r) => setTimeout(r, 0))
    }
  }
  return allVerts
}

// ── PoseViewer3D boundary (cm + base64) ────────────────────────────────────

/** Scale a meters Float32Array by `factor` (×100 → cm) into a new array. */
export function scaledArray(src: Float32Array, factor: number): Float32Array {
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) out[i] = src[i] * factor
  return out
}

/** Base64 of the raw float32 bytes (optionally scaled to cm first). */
export function vertsToB64(verts: Float32Array, toCm = false): string {
  const src = toCm ? scaledArray(verts, 100) : verts
  return encodeBufferToB64(
    new Uint8Array(src.buffer, src.byteOffset, src.byteLength),
  )
}

export function jointsToCm(jointsM: Float32Array): Float32Array {
  return scaledArray(jointsM, 100)
}

export function jointsFromCm(jointsCm: Float32Array): Float32Array {
  return scaledArray(jointsCm, 0.01)
}

// ── Azimuth presets (Blender convention — matches character_vnccs.yaml) ────
// 0 = front (+Z camera), 90 = right (+X), 180 = back, 270 = left. The camera
// circles the figure at the same distance/height as the pose studio's
// "front" view so the 8 angles are the exact familiar ring.

export const AZIMUTH_PRESETS = [
  { angle: 0, cameraView: "az-0", label: "Front" },
  { angle: 45, cameraView: "az-45", label: "F-R" },
  { angle: 90, cameraView: "az-90", label: "Right" },
  { angle: 135, cameraView: "az-135", label: "B-R" },
  { angle: 180, cameraView: "az-180", label: "Back" },
  { angle: 225, cameraView: "az-225", label: "B-L" },
  { angle: 270, cameraView: "az-270", label: "Left" },
  { angle: 315, cameraView: "az-315", label: "F-L" },
] as const

export type MotionAzimuth = (typeof AZIMUTH_PRESETS)[number]["cameraView"]

const AZ_DIST = 3.4
const AZ_HEIGHT = 1.2

/** Camera position for an azimuth view — target is (0, 0.9, 0). */
export function azimuthCameraPos(view: MotionAzimuth): [number, number, number] {
  const az = AZIMUTH_PRESETS.find((p) => p.cameraView === view) ?? AZIMUTH_PRESETS[0]
  const rad = (az.angle * Math.PI) / 180
  return [Math.sin(rad) * AZ_DIST, AZ_HEIGHT, Math.cos(rad) * AZ_DIST]
}

/** Step ±1 preset around the 8-angle ring (wrap-around). Used by the motion
 *  card's rotate arrows. All presets sit on the same ring (AZ_DIST/AZ_HEIGHT),
 *  so stepping is a hard camera snap — no zoom/height preservation needed. */
export function stepAzimuth(view: MotionAzimuth, dir: 1 | -1): MotionAzimuth {
  const i = AZIMUTH_PRESETS.findIndex((p) => p.cameraView === view)
  const next = ((i === -1 ? 0 : i) + dir + AZIMUTH_PRESETS.length) % AZIMUTH_PRESETS.length
  return AZIMUTH_PRESETS[next]!.cameraView
}

// ── SOMA-77 → COCO-18 (port of custom_nodes/melite-poser-nodes/library/soma_to_coco.py) ──
// COCO-18 ordering matches poser.py::_KP_ORDER (the DWPose / vnccs contract).
// COCO "shoulder" = the glenohumeral socket (SOMA LeftArm/RightArm 12/40),
// NOT the clavicle (LeftShoulder/RightShoulder 11/39) — see the canonical
// pose memory (docs/CANONICAL-SOMAX-POSE.md §2.1).
export const COCO_TO_SOMA_IDX = [
  6, // 0  nose        → Head
  4, // 1  neck        → Neck1
  40, // 2  r_shoulder → RightArm (socket)
  41, // 3  r_elbow     → RightForeArm
  42, // 4  r_wrist     → RightHand
  12, // 5  l_shoulder → LeftArm (socket)
  13, // 6  l_elbow     → LeftForeArm
  14, // 7  l_wrist     → LeftHand
  72, // 8  r_hip       → RightLeg
  73, // 9  r_knee      → RightShin
  74, // 10 r_ankle     → RightFoot
  67, // 11 l_hip       → LeftLeg
  68, // 12 l_knee      → LeftShin
  69, // 13 l_ankle     → LeftFoot
  10, // 14 r_eye       → RightEye
  9, // 15 l_eye       → LeftEye
] // 16/17 ears — extrapolated below (SOMA-77 has no ear joints)

// Ear extrapolation constants (soma_to_coco.py) — ears sit ~7cm behind and
// slightly below the eyes at ~half the interocular distance lateral to the
// eye center, scaled by interocular distance so it adapts to body size.
const EAR_LATERAL_RATIO = 0.65
const EAR_VERTICAL_DROP_RATIO = 0.2

/**
 * Project SOMA-77 3D joints to COCO-18 3D joints (view-independent, meters).
 * Input: (77, 3) meters; output: (18, 3) meters — [x,y,z] per COCO joint.
 */
export function soma77ToCoco18(jointsM: Float32Array): Float32Array {
  const out = new Float32Array(18 * 3)
  for (let i = 0; i < 16; i++) {
    const s = COCO_TO_SOMA_IDX[i] * 3
    out[i * 3] = jointsM[s]
    out[i * 3 + 1] = jointsM[s + 1]
    out[i * 3 + 2] = jointsM[s + 2]
  }
  // Ears: right_ear = right_eye + lateral + downward; left_ear = left_eye − lateral.
  const le = 9 * 3 // LeftEye
  const re = 10 * 3 // RightEye
  const iox = jointsM[re] - jointsM[le]
  const ioy = jointsM[re + 1] - jointsM[le + 1]
  const ioz = jointsM[re + 2] - jointsM[le + 2]
  const interocular = Math.max(Math.hypot(iox, ioy, ioz), 1e-6)
  const ux = iox / interocular
  const uy = ioy / interocular
  const uz = ioz / interocular
  const hx = jointsM[6 * 3] - jointsM[4 * 3] // Head − Neck1 (up direction)
  const hy = jointsM[6 * 3 + 1] - jointsM[4 * 3 + 1]
  const hz = jointsM[6 * 3 + 2] - jointsM[4 * 3 + 2]
  const hLen = Math.max(Math.hypot(hx, hy, hz), 1e-6)
  const upx = hx / hLen
  const upy = hy / hLen
  const upz = hz / hLen
  const lat = EAR_LATERAL_RATIO * interocular
  const drop = EAR_VERTICAL_DROP_RATIO * interocular
  // COCO 16 = r_ear, 17 = l_ear (subject's right = SOMA −X side... the eye
  // vector points from left eye → right eye, so +lateral lands on the
  // subject's right — matches soma_to_coco.py exactly).
  out[16 * 3] = jointsM[re] + ux * lat - upx * drop
  out[16 * 3 + 1] = jointsM[re + 1] + uy * lat - upy * drop
  out[16 * 3 + 2] = jointsM[re + 2] + uz * lat - upz * drop
  out[17 * 3] = jointsM[le] - ux * lat - upx * drop
  out[17 * 3 + 1] = jointsM[le + 1] - uy * lat - upy * drop
  out[17 * 3 + 2] = jointsM[le + 2] - uz * lat - upz * drop
  return out
}

// ── NPZ writer (lib/npz.ts is reader-only — this is the missing writer) ────

/** CRC-32 (IEEE 802.3, polynomial 0xEDB88320) — numpy validates NPZ CRCs. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function npyHeader(shape: number[]): Uint8Array {
  // numpy's own header string shape: {'descr': '<f4', 'fortran_order':
  // False, 'shape': (T, 77, 3), } — 1-D arrays get the trailing comma.
  const shapeStr = `(${shape.join(", ")}${shape.length === 1 ? "," : ""})`
  let dict = `{'descr': '<f4', 'fortran_order': False, 'shape': ${shapeStr}, }`
  let header = new TextEncoder().encode(dict)
  // Pad so the full v1 header (6 magic + 2 version + 2 length + header) is
  // 64-byte aligned — numpy requires this for the data offset. Trailing
  // whitespace after the dict is ignored by the reader.
  const align = (64 - ((10 + header.length) % 64)) % 64
  const padded = new Uint8Array(header.length + align + 1)
  padded.set(header)
  padded[padded.length - 1] = 0x0a // trailing newline
  dict = new TextDecoder().decode(padded)
  header = new TextEncoder().encode(dict)
  const out = new Uint8Array(10 + header.length)
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 0x01, 0x00]) // \x93NUMPY v1.0
  out[8] = header.length & 0xff
  out[9] = (header.length >> 8) & 0xff
  out.set(header, 10)
  return out
}

/** Build one NPY v1 float32 array blob. */
function npyFloat32(data: Float32Array, shape: number[]): Uint8Array {
  const header = npyHeader(shape)
  const out = new Uint8Array(header.length + data.byteLength)
  out.set(header)
  out.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), header.length)
  return out
}

const ZIP_LOCAL = 0x04034b50
const ZIP_CENTRAL = 0x02014b50
const ZIP_EOCD = 0x06054b50

function writeU16(out: Uint8Array, off: number, v: number): void {
  out[off] = v & 0xff
  out[off + 1] = (v >> 8) & 0xff
}
function writeU32(out: Uint8Array, off: number, v: number): void {
  out[off] = v & 0xff
  out[off + 1] = (v >> 8) & 0xff
  out[off + 2] = (v >> 16) & 0xff
  out[off + 3] = (v >>> 24) & 0xff
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw")
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(cs)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export interface NpzEntry {
  data: Float32Array
  /** The array's shape (e.g. [T, 77, 3]). Omitted → 1-D [length]. */
  shape?: number[]
}

/**
 * Serialize a map of named float32 arrays to an NPZ (ZIP of NPY v1 entries).
 * Matches np.savez_compressed's container: ZIP method 8 (deflate-raw),
 * entries named "<key>.npy", real CRC32s. `compress: false` → stored (method
 * 0), like np.savez.
 */
export async function writeNpz(
  arrays: Record<string, NpzEntry>,
  compress = true,
): Promise<Uint8Array<ArrayBuffer>> {
  type Entry = {
    name: Uint8Array
    data: Uint8Array
    crc: number
    method: number
    localOff: number
  }
  const entries: Entry[] = []
  for (const [key, entry] of Object.entries(arrays)) {
    const shape = entry.shape ?? [entry.data.length]
    const raw = npyFloat32(entry.data, shape)
    const name = new TextEncoder().encode(`${key}.npy`)
    const crc = crc32(raw)
    let method = 0
    let payload = raw
    if (compress) {
      const deflated = await deflateRaw(raw)
      if (deflated.length < raw.length) {
        method = 8
        payload = deflated
      }
    }
    entries.push({ name, data: payload, crc, method, localOff: 0 })
  }

  // Layout: local headers + data, then central directory, then EOCD.
  let offset = 0
  for (const e of entries) {
    e.localOff = offset
    offset += 30 + e.name.length + e.data.length
  }
  const cdSize = entries.reduce((acc, e) => acc + 46 + e.name.length, 0)
  const total = offset + cdSize + 22
  const out = new Uint8Array(total)

  let p = 0
  for (const e of entries) {
    writeU32(out, p, ZIP_LOCAL)
    writeU16(out, p + 4, 20) // version needed
    writeU16(out, p + 6, 0) // flags
    writeU16(out, p + 8, e.method)
    writeU16(out, p + 10, 0) // mod time
    writeU16(out, p + 12, 0) // mod date
    writeU32(out, p + 14, e.crc)
    writeU32(out, p + 18, e.data.length)
    writeU32(out, p + 22, e.data.length)
    writeU16(out, p + 26, e.name.length)
    writeU16(out, p + 28, 0) // extra len
    out.set(e.name, p + 30)
    out.set(e.data, p + 30 + e.name.length)
    p += 30 + e.name.length + e.data.length
  }

  const cdStart = p
  for (const e of entries) {
    writeU32(out, p, ZIP_CENTRAL)
    writeU16(out, p + 4, 20) // version made by
    writeU16(out, p + 6, 20) // version needed
    writeU16(out, p + 8, 0) // flags
    writeU16(out, p + 10, e.method)
    writeU16(out, p + 12, 0) // mod time
    writeU16(out, p + 14, 0) // mod date
    writeU32(out, p + 16, e.crc)
    writeU32(out, p + 20, e.data.length)
    writeU32(out, p + 24, e.data.length)
    writeU16(out, p + 28, e.name.length)
    writeU16(out, p + 30, 0) // extra
    writeU16(out, p + 32, 0) // comment
    writeU16(out, p + 34, 0) // disk start
    writeU16(out, p + 36, 0) // internal attrs
    writeU32(out, p + 38, 0) // external attrs
    writeU32(out, p + 42, e.localOff)
    out.set(e.name, p + 46)
    p += 46 + e.name.length
  }
  const cdEnd = p

  writeU32(out, p, ZIP_EOCD)
  writeU16(out, p + 4, 0) // disk
  writeU16(out, p + 6, 0) // cd disk
  writeU16(out, p + 8, entries.length)
  writeU16(out, p + 10, entries.length)
  writeU32(out, p + 12, cdEnd - cdStart)
  writeU32(out, p + 16, cdStart)
  writeU16(out, p + 20, 0) // comment len
  return out
}

/** Data URL for the prev_motion_artifact slot (SlotSquare's file-drop shape). */
export function npzToDataUrl(bytes: Uint8Array): string {
  return `data:application/octet-stream;base64,${encodeBufferToB64(bytes)}`
}

// ── Rotation reconstruction (Phase B — drag-refine) ────────────────────────
// SOMA-77 child tables, built from the canonical bone connections (same
// derivation as PoseEditMode's SOMA77_PARENT — text-to-pose is the source).
const SOMA77_CHILDREN: number[][] = (() => {
  const parent: number[] = new Array(J).fill(-1)
  for (const [p, c] of SOMA77_BONE_CONNECTIONS) parent[c] = p
  const children: number[][] = Array.from({ length: J }, (): number[] => [])
  for (let i = 0; i < J; i++) {
    const p = parent[i]
    if (p >= 0) children[p].push(i)
  }
  return children
})()

/**
 * Rebuild one frame's global_rot_mats from edited joint positions.
 *
 * Each joint's new rotation is the original rotation composed with the
 * minimal rotation that aligns its longest child-offset direction from the
 * original pose to the edited pose — the standard arc-align reconstruction.
 * Leaf joints (finger/toe tips, no children) keep their original rotation
 * (documented limitation: EndEffector hand/feet anchors are approximate for
 * translate-gizmo edits).
 *
 * Returns patched COPIES of both arrays (full length, meters). The caller
 * truncates to `frameIdx + 1` when the edited pose should become the chain
 * end.
 */
export function patchFrame(
  posedJoints: Float32Array, // (T, 77, 3) meters
  globalRotMats: Float32Array, // (T, 77, 9) meters
  editedJointsM: Float32Array, // (77, 3) meters — the edited frame's positions
  frameIdx: number,
): { posedJoints: Float32Array; globalRotMats: Float32Array } {
  const T = posedJoints.length / (J * 3)
  const f = Math.max(0, Math.min(frameIdx, T - 1))
  const jb = f * J * 3
  const rb = f * J * 9

  const joints = new Float32Array(posedJoints)
  const rots = new Float32Array(globalRotMats)

  // Original frame positions (meters) for the offset directions.
  const origPos = new Float32Array(J * 3)
  for (let j = 0; j < J; j++) {
    origPos[j * 3] = posedJoints[jb + j * 3]
    origPos[j * 3 + 1] = posedJoints[jb + j * 3 + 1]
    origPos[j * 3 + 2] = posedJoints[jb + j * 3 + 2]
  }

  // Write the edited positions (meters) into the copy.
  joints.set(editedJointsM, jb)

  const q = new THREE.Quaternion()
  const d0 = new THREE.Vector3()
  const d1 = new THREE.Vector3()
  const axis = new THREE.Vector3()

  for (let j = 0; j < J; j++) {
    // Reference child = the one with the longest ORIGINAL offset from j.
    let bestChild = -1
    let bestLen = 1e-4
    for (const c of SOMA77_CHILDREN[j]) {
      const cx = origPos[c * 3] - origPos[j * 3]
      const cy = origPos[c * 3 + 1] - origPos[j * 3 + 1]
      const cz = origPos[c * 3 + 2] - origPos[j * 3 + 2]
      const len = Math.hypot(cx, cy, cz)
      if (len > bestLen) {
        bestLen = len
        bestChild = c
      }
    }
    if (bestChild < 0) continue // leaf — keep original rotation

    d0.set(
      (origPos[bestChild * 3] - origPos[j * 3]) / bestLen,
      (origPos[bestChild * 3 + 1] - origPos[j * 3 + 1]) / bestLen,
      (origPos[bestChild * 3 + 2] - origPos[j * 3 + 2]) / bestLen,
    )
    const dx = editedJointsM[bestChild * 3] - editedJointsM[j * 3]
    const dy = editedJointsM[bestChild * 3 + 1] - editedJointsM[j * 3 + 1]
    const dz = editedJointsM[bestChild * 3 + 2] - editedJointsM[j * 3 + 2]
    const len = Math.hypot(dx, dy, dz)
    if (len < 1e-6) continue // edited child collapsed onto the joint — keep
    d1.set(dx / len, dy / len, dz / len)

    const dot = THREE.MathUtils.clamp(d0.dot(d1), -1, 1)
    const angle = Math.acos(dot)
    if (angle < 1e-4) continue // direction unchanged — keep original rotation
    axis.crossVectors(d0, d1)
    if (axis.lengthSq() < 1e-10) {
      // 180° flip — pick an arbitrary perpendicular axis.
      axis.set(1, 0, 0).cross(d0)
      if (axis.lengthSq() < 1e-6) axis.set(0, 1, 0).cross(d0)
    }
    axis.normalize()
    q.setFromAxisAngle(axis, angle)

    // R_new = Q_align · R_orig (global-space alignment composed with the
    // original global rotation). The rotmat block is ROW-major and
    // Matrix4.set takes its 16 args in row-major groups of 4 — place the
    // block directly, no transpose (deformFrame consumes the same
    // convention: v' = R·v).
    const qRot = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().set(
        globalRotMats[rb + j * 9], globalRotMats[rb + j * 9 + 1], globalRotMats[rb + j * 9 + 2], 0,
        globalRotMats[rb + j * 9 + 3], globalRotMats[rb + j * 9 + 4], globalRotMats[rb + j * 9 + 5], 0,
        globalRotMats[rb + j * 9 + 6], globalRotMats[rb + j * 9 + 7], globalRotMats[rb + j * 9 + 8], 0,
        0, 0, 0, 1,
      ),
    )
    q.multiply(qRot)
    const mOut = new THREE.Matrix4().makeRotationFromQuaternion(q)
    const e = mOut.elements
    // THREE stores column-major; our contract is row-major.
    rots[rb + j * 9] = e[0]
    rots[rb + j * 9 + 1] = e[4]
    rots[rb + j * 9 + 2] = e[8]
    rots[rb + j * 9 + 3] = e[1]
    rots[rb + j * 9 + 4] = e[5]
    rots[rb + j * 9 + 5] = e[9]
    rots[rb + j * 9 + 6] = e[2]
    rots[rb + j * 9 + 7] = e[6]
    rots[rb + j * 9 + 8] = e[10]
  }

  return { posedJoints: joints, globalRotMats: rots }
}

// Re-export for the skin loader's callers (motion card builds its own
// SkinMeshData-shaped bind mesh from the neutral skin).
export { loadSomaSkin, type SomaSkin }
export type { NpyArray }
