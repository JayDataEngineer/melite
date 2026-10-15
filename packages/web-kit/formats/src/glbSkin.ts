/**
 * glbSkin — a SOMAX-rigged character GLB → the SomaSkin LBS substrate.
 *
 * The motion card's preview was born on the NEUTRAL mannequin (the
 * skin_standard.npz template — somaSkin.ts). This adapter imports a REAL
 * character (a Trellis / composite_character / transfer-rig output, or a
 * user upload) so the SAME preview flow — deformFrame, the scrubber,
 * refine, repose, export — skins the user's body instead.
 *
 * WHY THIS IS A PURE ADAPTER: glTF skinning IS the same LBS the demo's
 * SOMASkin does —
 *   v' = Σ_w weight_w · (jointGlobal_w · inverseBind_w · v)
 * The GLTF skin carries every term natively:
 *   bindVertices  ← geometry.position        (mesh space, meters)
 *   faces         ← geometry.index
 *   lbsIndices/   ← geometry.attributes.skinIndex / skinWeight  (VEC4 → W=4)
 *   lbsWeights
 *   bindRigInv    ← skeleton.boneInverses[j] (glTF stores the INVERSE bind
 *                   matrices — exactly bindRigInv; column-major in the
 *                   file / three.js Matrix4.elements → transposed to the
 *                   row-major 16-float layout somaSkin expects)
 *   restJoints/   ← invert(boneInverses) — the forward bind, whose
 *   restRots         translation column + 3×3 block ARE the rest pose
 *                   (same extraction as the npz loader, restPoseFromBind)
 * deformFrame is W-generic (skin.influences), so a W=4 GLB skin runs
 * through the unmodified deform code.
 *
 * THE CONTRACT (the adapter REJECTS anything else): the rig must be
 * SOMAX — 77 joints, the SOMA-77 skeleton the motion NPZs speak (the same
 * contract bake_motion's somax_bake enforces server-side; the runner vets
 * imports with _is_somax_glb). A static mesh or a Blender-retargeted rig
 * fails LOUD with a clear message — never a spaghetti preview.
 *
 * Units: meters (glTF native — same as the npz skin; RaySomaxBake bakes
 * NPZ motion onto these GLBs 1:1, which proves the unit + bind-pose
 * match). Multi-mesh characters (composite_character's body + outfit +
 * hair layers share ONE rig) merge: vertices/faces concatenate, indices
 * offset — one SomaSkin, one deform pass.
 */
import type { GLTF } from '@melite/three-client/client'
import type { Object3D, SkinnedMesh } from '@melite/three-client/client'
import { makeGLTFLoader } from "./glbLoad.ts"
import { invert4, restPoseFromBind, type SomaSkin } from "./somaSkin.ts"

/** SOMA-77 — the rig every SOMAX GLB carries (skin.name "SOMA-Mixamo"). */
const SOMA_JOINTS = 77
/** glTF skins are VEC4 — four influences per vertex. */
const GLTF_INFLUENCES = 4

export class NotSomaxGlbError extends Error {
  constructor(reason: string) {
    super(`Not a SOMAX-rigged GLB (77-joint SOMA skeleton required): ${reason}`)
    this.name = "NotSomaxGlbError"
  }
}

/** Column-major 16 (three.js Matrix4.elements) → row-major Float32Array. */
function colMajorToRowMajor(elements: ArrayLike<number>): Float32Array {
  const out = new Float32Array(16)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r * 4 + c] = elements[c * 4 + r]
    }
  }
  return out
}

/**
 * Load a SOMAX-rigged character GLB as a SomaSkin.
 *
 * @param url a data: URL (studio upload) or a same-origin asset URL
 *            (/editor/assets/... — asset tray or a wired upstream card).
 * @throws NotSomaxGlbError when the GLB has no 77-joint skinned mesh.
 * @throws Error on fetch/parse failures.
 */
export async function loadGlbSkin(url: string): Promise<SomaSkin> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch character GLB: ${res.status}`)
  const buffer = await res.arrayBuffer()
  // The shared loader kernel — DRACO-configured (a compressed character
  // GLB parses identically here and in every viewer; before the kernel,
  // this bare loader was the ONE GLB path in the estate with no decoder).
  const loader = makeGLTFLoader()
  const gltf = await new Promise<GLTF>(
    (resolve, reject) => loader.parse(buffer, "", resolve, reject),
  )

  // Collect EVERY 77-joint skinned mesh (composite characters layer
  // body + outfit + hair on one shared rig).
  const meshes: SkinnedMesh[] = []
  gltf.scene.traverse((obj: Object3D) => {
    const m = obj as SkinnedMesh
    if (!m.isSkinnedMesh || !m.geometry) return
    if (m.skeleton?.bones?.length === SOMA_JOINTS) meshes.push(m)
  })
  if (meshes.length === 0) {
    throw new NotSomaxGlbError(
      "no skinned mesh with 77 joints found (static meshes and other rigs cannot play SOMA-77 motion)",
    )
  }

  // ── The rig terms (shared by every merged mesh — one rig per SOMAX GLB)
  const skeleton = meshes[0]!.skeleton
  const J = skeleton.bones.length
  const bindRigInv = new Float32Array(J * 16)
  for (let j = 0; j < J; j++) {
    // boneInverses ARE the inverse bind matrices — bindRigInv verbatim,
    // transposed from three.js column-major into somaSkin's row-major.
    bindRigInv.set(colMajorToRowMajor(skeleton.boneInverses[j]!.elements), j * 16)
  }
  // Forward bind = invert(inverse bind); its translation + rotation blocks
  // are the rest pose (the same extraction the npz loader runs).
  const bindRigFwd = new Float32Array(J * 16)
  for (let j = 0; j < J; j++) {
    bindRigFwd.set(invert4(bindRigInv.subarray(j * 16, j * 16 + 16)), j * 16)
  }
  const { restJoints, restRots } = restPoseFromBind(bindRigFwd, J)

  // ── Merge the meshes: positions + faces + per-vertex skin attributes
  let vertexCount = 0
  let faceCount = 0
  for (const m of meshes) {
    vertexCount += m.geometry.attributes.position.count
    if (!m.geometry.index) {
      throw new NotSomaxGlbError(
        `mesh "${m.name}" is not triangulated (no index buffer)`,
      )
    }
    faceCount += m.geometry.index.count / 3
  }
  const bindVertices = new Float32Array(vertexCount * 3)
  const faces = new Uint32Array(faceCount * 3)
  const lbsIndices = new Uint32Array(vertexCount * GLTF_INFLUENCES)
  const lbsWeights = new Float32Array(vertexCount * GLTF_INFLUENCES)

  let vOff = 0
  let iOff = 0
  for (const m of meshes) {
    const pos = m.geometry.attributes.position
    bindVertices.set(pos.array as ArrayLike<number>, vOff * 3)
    const si = m.geometry.attributes.skinIndex
    const sw = m.geometry.attributes.skinWeight
    if (!si || !sw) {
      throw new NotSomaxGlbError(
        `mesh "${m.name}" has no skinIndex/skinWeight attributes (not skinned)`,
      )
    }
    if (si.itemSize !== GLTF_INFLUENCES || sw.itemSize !== GLTF_INFLUENCES) {
      throw new NotSomaxGlbError(
        `mesh "${m.name}" skin attributes are ${si.itemSize}-wide (glTF requires VEC4)`,
      )
    }
    lbsIndices.set(si.array as ArrayLike<number>, vOff * GLTF_INFLUENCES)
    lbsWeights.set(sw.array as ArrayLike<number>, vOff * GLTF_INFLUENCES)
    // Non-null by the counting pass's own refusal (`!m.geometry.index`
    // threw above) — the assertion rides that enforced invariant, not
    // an assumption (2026-09-12).
    const idx = m.geometry.index!
    const base = vOff
    for (let i = 0; i < idx.count; i++) {
      faces[iOff + i] = idx.array[i]! + base
    }
    iOff += idx.count
    vOff += pos.count
  }

  return {
    bindVertices,
    faces,
    lbsIndices,
    lbsWeights,
    bindRigInv,
    restJoints,
    restRots,
    vertexCount,
    faceCount,
    jointCount: J,
    influences: GLTF_INFLUENCES,
  }
}
