import * as THREE from "three"
import { apiFetch } from "@melite/catalog"
import { CM_TO_M } from "./poseStageSkeleton"
import type { SkinMeshData } from "./poseStageTypes"

const FLOOR_LIFT_Y = 0.02

/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
export function computeMeshLiftY(meshData: SkinMeshData): number {
  let minY = Infinity
  const verts = meshData.vertices
  for (let i = 0; i < verts.length; i++) {
    if (verts[i][1] < minY) minY = verts[i][1]
  }
  return isFinite(minY) ? FLOOR_LIFT_Y - minY * CM_TO_M : FLOOR_LIFT_Y
}

export function buildGeometry(meshData: SkinMeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const verts = meshData.vertices
  const arr = new Float32Array(verts.length * 3)
  for (let i = 0; i < verts.length; i++) {
    // Bind pose is raw cm — scaled to meters in the shared buffer so the
    // lift group + deformed frames share one space.
    arr[i * 3] = verts[i][0] * CM_TO_M
    arr[i * 3 + 1] = verts[i][1] * CM_TO_M
    arr[i * 3 + 2] = verts[i][2] * CM_TO_M
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3))
  const idx = meshData.faces.flat(2)
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// ── API: the per-identity bind-mesh fetch + cache (verbatim) ──────────────
// All meshes share SOMA's 18056-vertex layout but have DIFFERENT face
// triangulations, so we cache per model and refetch when the user switches
// mesh (soma / mhr / anny). Shaped variants (coeffs / detail morphs /
// custom .target blends) get their own cache entries.
const _meshCache: Map<string, SkinMeshData> = new Map()

export async function fetchBindMesh(
  identityModel: string = "anny",
  identityCoeffs?: number[] | null,
  localChanges?: Record<string, number> | null,
  customTargets?: Record<string, number> | null,
): Promise<SkinMeshData> {
  const key = identityModel || "anny"
  const coeffsSig = identityCoeffs && identityCoeffs.length > 0
    ? identityCoeffs.map(v => v.toFixed(1)).join(",")
    : null
  const lcEntries = localChanges && Object.keys(localChanges).length > 0
    ? Object.entries(localChanges)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const ctEntries = customTargets && Object.keys(customTargets).length > 0
    ? Object.entries(customTargets)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const cacheKey = [key, coeffsSig, lcEntries, ctEntries].filter(Boolean).join("|")
  const cached = _meshCache.get(cacheKey)
  if (cached) return cached

  let data: SkinMeshData
  if (coeffsSig || lcEntries || ctEntries) {
    const res = await apiFetch("/v1/poser/mesh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_model: key,
        ...(coeffsSig ? { identity_coeffs: identityCoeffs } : {}),
        ...(lcEntries ? { local_changes: localChanges } : {}),
        ...(ctEntries ? { custom_targets: customTargets } : {}),
      }),
    })
    if (!res.ok) throw new Error(`Failed to fetch shaped mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  } else {
    const res = await apiFetch(`/v1/poser/mesh?identity_model=${encodeURIComponent(key)}`)
    if (!res.ok) throw new Error(`Failed to fetch mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  }
  _meshCache.set(cacheKey, data)
  return data
}
