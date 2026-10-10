/**
 * poserSkin — THE shared bind-mesh module for the body studio lanes
 * (2026-09-05 dedup order).
 *
 * The /poser/skin/mesh surface feeds both studios that shape bodies:
 *   • Body Studio (3d/body — MeshPreviewCanvas, BodyShapePanel)
 *   • Pose Studio's viewer (motion/viewer3d — PoseViewer3D)
 * Two byte-adjacent copies of fetchBindMesh + per-coefficient caches
 * lived one plugin apart, drifting already (the 3d copy carried the
 * Anny always-send-custom_targets fix and preview_pose support; the
 * motion copy had neither — the same mesh dragged in Pose Studio
 * could render differently than in Body Studio). One module, one
 * cache, one behavior; the studios import it from here.
 *
 * The /poser prefix reaches the poser pack through the gateway's
 * studio bridge (rebuilt 2026-09-05; vite proxies
 * /poser → gateway → the engine endpoint's poser routes).
 */
import { apiFetch } from "@melite/catalog"

export interface SkinMeshData {
  vertices: number[][]
  faces: number[][]
}

export interface IdentityGroup {
  label: string
  start: number
  count: number
}

export interface LocalChangeGroup {
  label: string
  indices: number[]
  category: "body" | "face"
}

export interface LocalChangeSpace {
  dims: number
  labels: string[]
  defaults: number[]
  range: [number, number]
  groups: LocalChangeGroup[]
}

/**
 * A community MakeHuman .target blendshape exposed as a single slider.
 *
 * Each entry corresponds to a .target file in media/motion's
 * references/makehuman_targets/ directory. The `id` is the slider key sent
 * back to POST /poser/skin/mesh as `custom_targets[id]`. The `name` and
 * `description` power the slider row UI.
 */
export interface CustomTargetItem {
  id: string
  name: string
  description: string
  glyph: string
  /** Absolute path on the server (debug only - not used by the UI). */
  file?: string
}

export interface CustomTargetSpace {
  /** Ordered list - one slider row per entry. */
  items: CustomTargetItem[]
  defaults: number[]
  range: [number, number]
}

export interface IdentitySpace {
  identity_model: string
  dims: number
  labels: string[]
  defaults: number[]
  range: [number, number]
  groups: IdentityGroup[] | null
  local_changes: LocalChangeSpace | null
  /**
   * Community .target blendshapes (Anny only). null for MHR/SOMA - the UI
   * hides the Stylization tab in that case.
   */
  custom_targets: CustomTargetSpace | null
}

// Per-coefficient-signature cache — ONE for the whole estate (both
// studios share it: previewing a shape in Body Studio primes the exact
// entry Pose Studio needs, zero network). All shaped meshes share SOMA's
// 18056-vertex layout; the cache key incorporates identity_model +
// coeffs + local_changes + custom_targets + preview_pose so identical
// shapes hit the cache on re-fetch. BOUNDED (the registry-growth law):
// one entry is a full mesh (megabytes), a slider drag mints a
// signature per stop, so an unbounded module Map would grow with the
// session — LRU at MESH_CACHE_CAP, the oldest insertion pruned.
const MESH_CACHE_CAP = 16
const _meshCache: Map<string, SkinMeshData> = new Map()

export type PreviewPose = "tpose" | "arms_down"

/** One bind-mesh request. Object-shaped ON PURPOSE (2026-09-05): the
 *  positional form is how the two pre-dedup copies drifted — motion's
 *  copy had no preview_pose, so custom_targets sat one slot left of
 *  the body copy's. An options object cannot be mis-slotted. */
export interface BindMeshQuery {
  identityModel?: string
  identityCoeffs?: number[] | null
  localChanges?: Record<string, number> | null
  previewPose?: PreviewPose | null
  customTargets?: Record<string, number> | null
}

export async function fetchBindMesh(
  query: BindMeshQuery = {},
): Promise<SkinMeshData> {
  const {
    identityModel, identityCoeffs, localChanges,
    previewPose, customTargets,
  } = query
  const key = identityModel || "anny"
  // Round coeffs to 1 decimal for the signature - visually-identical shapes
  // share a cache entry without exploding it on every micro-drag.
  const coeffsSig = identityCoeffs && identityCoeffs.length > 0
    ? identityCoeffs.map(v => v.toFixed(1)).join(",")
    : null
  const lcEntries = localChanges && Object.keys(localChanges).length > 0
    ? Object.entries(localChanges)
        // Object keys are unique, so the equal-key arm is unreachable:
        // a two-arm comparator sorts identically here (proof: distinct
        // strings are always ordered one way or the other).
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  // Custom .target blendshape weights (e.g. {"anime_stylized_enhanced": 0.5}).
  // Rounded to 2 decimals - same convention as localChanges.
  const ctEntries = customTargets && Object.keys(customTargets).length > 0
    ? Object.entries(customTargets)
        // Same unique-keys proof as lcEntries above: two arms suffice.
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const poseSig = previewPose && previewPose !== "tpose" ? previewPose : null
  const cacheKey = [key, coeffsSig, lcEntries, ctEntries, poseSig].filter(Boolean).join("|")
  const cached = _meshCache.get(cacheKey)
  if (cached) {
    // LRU, not FIFO-of-birth: a re-read refreshes the insertion
    _meshCache.delete(cacheKey)
    _meshCache.set(cacheKey, cached)
    return cached
  }

  const posePayload = poseSig ? { preview_pose: poseSig } : {}
  let data: SkinMeshData
  if (coeffsSig || lcEntries || ctEntries) {
    const res = await apiFetch("/v1/poser/mesh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_model: key,
        ...posePayload,
        ...(coeffsSig ? { identity_coeffs: identityCoeffs } : {}),
        ...(lcEntries ? { local_changes: localChanges } : {}),
        // Always send custom_targets for Anny POSTs, even when empty.
        // The backend's set_identity treats a MISSING custom_targets
        // field as "preserve previous state" (so phenotype-only edits
        // don't wipe stylization). But the frontend always sends the
        // full desired state - so omitting the field when the user
        // drags a slider to 0 leaves the old weight active (the
        // "slider at 0 shows ~50%" bug). Sending {} explicitly clears.
        ...(key === "anny" ? { custom_targets: customTargets ?? {} } : {}),
      }),
    })
    if (!res.ok) throw new Error(`Failed to fetch shaped mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  } else {
    const qs = new URLSearchParams({ identity_model: key })
    if (poseSig) qs.set("preview_pose", poseSig)
    const res = await apiFetch(`/v1/poser/mesh?${qs.toString()}`)
    if (!res.ok) throw new Error(`Failed to fetch mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  }
  if (_meshCache.size >= MESH_CACHE_CAP) {
    // the map is non-empty at cap — take the OLDEST insertion
    for (const oldest of _meshCache.keys()) {
      _meshCache.delete(oldest)
      break
    }
  }
  _meshCache.set(cacheKey, data)
  return data
}

export async function fetchIdentitySpace(model: string): Promise<IdentitySpace> {
  const res = await apiFetch(`/v1/poser/identity-space?identity_model=${encodeURIComponent(model)}`)
  if (!res.ok) throw new Error(`Failed to fetch identity-space (${model}): ${res.status}`)
  return (await res.json()) as IdentitySpace
}

// Lift the bind pose so feet clear the floor (matches Kimodo scene.py:
// bind_pos.y -= min_height; bind_pos.y += 0.02).
const FLOOR_LIFT_Y = 0.02

// SOMA-X/ANNY mesh vertices arrive in centimeters (~170 units tall). The
// Three.js scene (camera, grid, lights) is authored in meters (~1.7 units).
// Convert at ingestion so downstream code never sees raw cm.
const CM_TO_M = 0.01

/** SkinMeshData → flat Float32Array positions (V*3) in METERS with the
 *  floor lift applied (the body-studio preview geometry path). */
export function buildFlatPositions(meshData: SkinMeshData): Float32Array {
  const verts = meshData.vertices
  const arr = new Float32Array(verts.length * 3)
  let minY = Infinity
  for (let i = 0; i < verts.length; i++) {
    const yMeters = verts[i][1] * CM_TO_M
    if (yMeters < minY) minY = yMeters
  }
  if (!isFinite(minY)) minY = 0
  for (let i = 0; i < verts.length; i++) {
    arr[i * 3] = verts[i][0] * CM_TO_M
    arr[i * 3 + 1] = verts[i][1] * CM_TO_M - minY + FLOOR_LIFT_Y
    arr[i * 3 + 2] = verts[i][2] * CM_TO_M
  }
  return arr
}
