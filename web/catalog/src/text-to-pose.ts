/**
 * Text-to-pose client — submit text prompts, poll for results, manage cache.
 *
 * Backend: custom_nodes/melite-poser-nodes/server.py (proxied via melite-head)
 * Endpoints:
 *   POST   /poser/text-to-pose                  Submit generation request
 *   GET    /poser/text-to-pose/jobs/{job_id}    Poll job status
 *   DELETE /poser/text-to-pose/jobs/{job_id}    Cancel running job
 *   GET    /poser/text-to-pose/cache            List cached entries
 *   DELETE /poser/text-to-pose/cache/{hash}     Delete cache entry
 *   POST   /poser/text-to-pose/cache/clear      Clear all cache entries
 */

import { apiFetch } from "./api"
import { decodeB64ToBuffer, downloadBase64Payload, encodeBufferToB64, SOMA_VERTEX_COUNT } from "@melite/formats"

// ── Constants ──────────────────────────────────────────────────────────────

// runs off the main thread.

/** Slice a single frame's vertices out of a multi-frame base64 vertex buffer.
 *
 *  Async because decoding the (potentially huge) multi-frame buffer is offloaded
 *  to the browser's native base64 decoder. Returns a base64 string containing
 *  just the one frame's float32 positions.
 *
 *  @param multiB64    base64-encoded buffer of shape (T, V, 3) float32
 *  @param frameIdx    which frame to slice (clamped to [0, T-1])
 *  @param vertexCount V — defaults to the SOMA-77 canonical count
 *  @returns base64-encoded single-frame buffer, or null on decode failure */
export async function sliceFrameAsB64(
  multiB64: string,
  frameIdx: number,
  vertexCount: number = SOMA_VERTEX_COUNT,
): Promise<string | null> {
  try {
    const stride = vertexCount * 3
    const buf = await decodeB64ToBuffer(multiB64)
    const multi = new Float32Array(buf)
    const totalFrames = Math.floor(multi.length / stride)
    if (totalFrames < 1) return null
    const idx = Math.max(0, Math.min(frameIdx, totalFrames - 1))
    const singleFlat = new Float32Array(stride)
    singleFlat.set(multi.subarray(idx * stride, (idx + 1) * stride))
    return encodeBufferToB64(new Uint8Array(singleFlat.buffer))
  } catch (e) {
    console.error("[text-to-pose] sliceFrameAsB64 failed:", e)
    return null
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type CameraView = "front" | "side" | "three-quarter" | "demo"
export type CfgType = "nocfg" | "regular" | "separated"
export type FrameStrategy = "auto_peak" | "auto_mid" | "manual" | "all"
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

/** A prompt segment for the multi-stack timeline. */
export interface PromptSegmentInput {
  text: string
  duration_sec: number
}

/** A prompt segment with resolved frame ranges — returned by the backend. */
export interface PromptSegmentOutput {
  text: string
  start_frame: number
  end_frame: number
  frame_count: number
}

export interface TextToPoseRequest {
  prompt: string
  seed: number | null
  duration_sec: number
  diffusion_steps?: number
  camera_view?: CameraView
  frame_strategy?: FrameStrategy
  cfg_type?: CfgType
  cfg_weight?: number[] | null
  num_samples?: number
  num_transition_frames?: number
  use_cache?: boolean
  confidence?: number
  ear_confidence?: number
  width?: number
  height?: number
  frame_indices?: number[] | null
  /** Per-segment prompts with explicit durations — "timeline command stacking".
   *  When present, the backend gives each segment its own frame budget instead
   *  of splitting a single prompt evenly. */
  prompt_segments?: PromptSegmentInput[]
  /** Post-processing: foot-contact-based root correction. Default true (non-G1). */
  post_processing?: boolean
  /** Root margin for post-processing (meters). Lower = tighter root pinning. */
  root_margin?: number
}

/** One frame of COCO-18 keypoints: [x0, y0, c0, x1, y1, c1, ...] (54 floats). */
export type FlatKeypoints = number[]

/** One frame of COCO-18 3D keypoints: [[x, y, z], ...] (18 joints). */
export type Coco18_3D = [number, number, number][]

export interface PoseMotion {
  fps: number
  frame_count: number
  duration_sec: number
  skeleton: string
  model: string
  camera_view: CameraView
  width: number
  height: number
  peak_frame_idx: number
  /** Prompt segments with resolved frame ranges — for accurate timeline display. */
  prompt_segments?: PromptSegmentOutput[]
  /** Flat 2D keypoints per frame — ready for /poser/render. */
  frames_flat: FlatKeypoints[]
  /** 3D keypoints per frame — for 3D preview / rotation. */
  frames_coco18_3d: Coco18_3D[]
  /** Full SOMA-77 3D keypoints per frame (T, 77, 3) — lossless, for /poser/skin/deform_soma. */
  frames_soma77_3d?: [number, number, number][][]
  /** Full SOMA-77 global rotation matrices per frame (T, 77, 3, 3) — for correct LBS skinning. */
  frames_soma77_rotmat?: [number, number, number][][][]
  /** Pre-computed deformed mesh vertices per frame — base64-encoded float32 binary (T, V, 3).
   * Decode via: atob() → ArrayBuffer → Float32Array, then reshape [T * V * 3] → [T][V][3].
   * NOT a JSON array — see deformed_vertices_b64 instead. */
  deformed_vertices_b64?: string
  /** Base64-encoded .npz of SOMA-77 joints — for round-tripping to other tools. */
  soma_npz_b64?: string
  /** Foot-contact probabilities per frame (T, 4): [L_heel, R_heel, L_toe, R_toe] in [0,1]. */
  foot_contacts?: number[][]
  /** Number of samples actually generated (may be > 1 when num_samples > 1). */
  num_samples?: number
  /** Alternate samples when num_samples > 1. Each entry is a full SOMA-77 motion
   * with its own deformed verts, so the UI can render clickable alternates. */
  alt_samples?: AltSample[]
  /** Identity model the deformed_vertices were skinned to. Echoed by the
   *  backend so the frontend can detect a mismatch if the user switched
   *  identity after generating (verts/topo would be wrong). Missing = unknown
   *  = do NOT drop (the historical default before this field existed). */
  identity_model?: string
  /** Identity coefficients used for the skinning pass (echoed so capture-
   *  reference can build a matching ReferenceMeshSpec without round-tripping
   *  through the bind/mesh endpoint). Missing = defaults were used. */
  identity_coeffs?: number[] | null
  /** Vertex count of the deformed mesh (V, not V*3). Informational. */
  vertex_count?: number
}

export interface AltSample {
  sample_idx: number
  frames_soma77_3d: [number, number, number][][]
  frames_soma77_rotmat: [number, number, number][][][]
  deformed_vertices_b64: string
}

export interface TextToPoseResult {
  status: "success"
  cache_hit: boolean
  inference_time_sec: number
  motion: PoseMotion
}

export interface SubmitResponse {
  job_id: string
  status: "pending"
  poll_url: string
}

export interface JobStatusResponse {
  job_id: string
  status: JobStatus
  result?: TextToPoseResult
  error?: string
  error_class?: string
}

export interface CacheEntry {
  hash: string
  prompt: string
  seed: number | null
  duration_sec: number
  model_name: string
  created_at: number
  accessed_at: number
  size_bytes: number
  frame_count: number
  peak_frame_idx: number
}

export interface CacheListResponse {
  entries: CacheEntry[]
  total_size_bytes: number
  entry_count: number
}

// ── Submit ─────────────────────────────────────────────────────────────────

/**
 * Submit a text-to-pose generation request.
 * Returns immediately with a job_id — poll via pollJob() or waitForJob().
 */
export async function submitTextToPose(
  req: TextToPoseRequest,
): Promise<SubmitResponse> {
  const res = await apiFetch("/poser/text-to-pose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  // Read text first — the server may return a non-JSON error (405, 502, etc.)
  // and res.json() would throw an opaque V8 parse error that hides the cause.
  const text = await res.text()
  if (!res.ok) {
    let detail = text.slice(0, 300)
    try { const j = JSON.parse(text); detail = j.error || detail } catch { /* not JSON */ }
    throw new Error(`Submit failed: HTTP ${res.status} — ${detail}`)
  }
  try {
    return JSON.parse(text) as SubmitResponse
  } catch (e) {
    throw new Error(`Submit returned invalid JSON: ${text.slice(0, 200)}`)
  }
}

// ── Poll ───────────────────────────────────────────────────────────────────

/**
 * Poll job status once. Returns the current status + result if completed.
 */
export async function pollJob(jobId: string): Promise<JobStatusResponse> {
  const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`)
  if (res.status === 404) {
    throw new Error(`Job ${jobId} not found`)
  }
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Poll failed: HTTP ${res.status} — ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text) as JobStatusResponse
  } catch (e) {
    throw new Error(`Poll returned invalid JSON: ${text.slice(0, 200)}`)
  }
}

/**
 * Wait for a job to reach a terminal state (completed/failed/cancelled).
 * Polls every `intervalMs` until `timeoutMs`.
 *
 * Calls `onUpdate` on each poll if provided — useful for progress UI.
 */
export async function waitForJob(
  jobId: string,
  opts: {
    intervalMs?: number
    timeoutMs?: number
    onUpdate?: (status: JobStatusResponse) => void
  } = {},
): Promise<TextToPoseResult> {
  const interval = opts.intervalMs ?? 500
  const timeout = opts.timeoutMs ?? 120_000  // 2 min default (inference is 15-30s)
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const status = await pollJob(jobId)
    opts.onUpdate?.(status)

    if (status.status === "completed" && status.result) {
      return status.result
    }
    if (status.status === "failed") {
      throw new Error(
        status.error || `Job failed (${status.error_class || "unknown"})`,
      )
    }
    if (status.status === "cancelled") {
      throw new Error("Job was cancelled")
    }
    await sleep(interval)
  }
  throw new Error(`Job ${jobId} timed out after ${timeout}ms`)
}

// ── Cancel ─────────────────────────────────────────────────────────────────

export async function cancelJob(jobId: string): Promise<void> {
  const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`, {
    method: "DELETE",
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Cancel failed: HTTP ${res.status}`)
  }
}

// ── Convenience: submit + wait in one call ─────────────────────────────────

/**
 * Submit a text-to-pose request and wait for the result.
 * This is the simplest call for UI components that just want the final motion.
 */
export async function generatePose(
  req: TextToPoseRequest,
  opts?: {
    intervalMs?: number
    timeoutMs?: number
    onUpdate?: (status: JobStatusResponse) => void
  },
): Promise<TextToPoseResult> {
  const { job_id } = await submitTextToPose(req)
  return waitForJob(job_id, opts)
}

// ── Cache ──────────────────────────────────────────────────────────────────

export async function listPoseCache(): Promise<CacheListResponse> {
  const res = await apiFetch("/poser/text-to-pose/cache")
  if (!res.ok) throw new Error(`Cache list failed: HTTP ${res.status}`)
  return res.json()
}

export async function deletePoseCacheEntry(hash: string): Promise<void> {
  const res = await apiFetch(`/poser/text-to-pose/cache/${hash}`, {
    method: "DELETE",
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Cache delete failed: HTTP ${res.status}`)
  }
}

export async function clearPoseCache(): Promise<number> {
  const res = await apiFetch("/poser/text-to-pose/cache/clear", {
    method: "POST",
  })
  if (!res.ok) throw new Error(`Cache clear failed: HTTP ${res.status}`)
  const body = await res.json()
  return body.cleared as number
}

// ── Models ─────────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string
  label: string
  /** True if the model checkpoint is available locally. */
  local: boolean
  is_default: boolean
}

export async function listModels(): Promise<{ models: ModelInfo[]; default: string }> {
  const res = await apiFetch("/poser/text-to-pose/models")
  if (!res.ok) throw new Error(`Models list failed: HTTP ${res.status}`)
  return res.json()
}

// ── Model registry (dataset/skeleton/version tree) ─────────────────────────

export interface RegistryVersion {
  display: string
  short_key: string
  local: boolean
  is_g1: boolean
}
export interface RegistrySkeleton {
  label: string
  key: string
  versions: RegistryVersion[]
}
export interface RegistryTree {
  datasets: string[]
  tree: Record<string, { skeletons: RegistrySkeleton[] }>
  default_dataset: string | null
  default_skeleton: string | null
  default_version: string
}

export async function listRegistry(): Promise<RegistryTree> {
  const res = await apiFetch("/poser/text-to-pose/registry")
  if (!res.ok) throw new Error(`Registry fetch failed: HTTP ${res.status}`)
  return res.json()
}

// ── Examples (Kimodo pre-baked cases) ──────────────────────────────────────

export interface KimodoExampleMeta {
  text?: string
  texts?: string[]
  duration?: number
  num_samples?: number
  seed?: number
  diffusion_steps?: number
  cfg?: { enabled?: boolean; text_weight?: number; constraint_weight?: number }
}
export interface KimodoExample {
  id: string
  name: string
  model: string
  has_motion: boolean
  has_constraints: boolean
  meta: KimodoExampleMeta
}
export async function listExamples(model?: string): Promise<{ examples: KimodoExample[] }> {
  const q = model ? `?model=${encodeURIComponent(model)}` : ""
  const res = await apiFetch(`/poser/text-to-pose/examples${q}`)
  if (!res.ok) throw new Error(`Examples list failed: HTTP ${res.status}`)
  return res.json()
}
export async function loadExample(
  model: string, exampleId: string, loadGt = false,
): Promise<{
  id: string; model: string
  meta: KimodoExampleMeta
  motion_b64?: string
  motion_size?: number
  constraints?: unknown[]
}> {
  const q = loadGt ? `?load_gt=true` : ""
  const res = await apiFetch(`/poser/text-to-pose/examples/${model}/${exampleId}${q}`)
  if (!res.ok) throw new Error(`Example load failed: HTTP ${res.status}`)
  return res.json()
}

// ── BVH export ─────────────────────────────────────────────────────────────

export async function exportBVH(
  framesSoma77: number[][][],
  framesRotmat: number[][][][],
  fps: number,
): Promise<{ bvh: string; frames: number; joints: number }> {
  const res = await apiFetch("/poser/text-to-pose/export/bvh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_soma77_3d: framesSoma77,
      frames_soma77_rotmat: framesRotmat,
      fps,
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `BVH export failed: HTTP ${res.status}`)
  }
  return res.json()
}

/** Download a BVH file from SOMA-77 motion data. */
export async function downloadBVH(motion: PoseMotion, standardTpose = false): Promise<void> {
  if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
    throw new Error("Motion data missing SOMA-77 positions or rotations")
  }
  // Re-fetch BVH with the standard_tpose option if requested.
  const res = await apiFetch("/poser/text-to-pose/export/bvh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_soma77_3d: motion.frames_soma77_3d,
      frames_soma77_rotmat: motion.frames_soma77_rotmat,
      fps: motion.fps,
      standard_tpose: standardTpose,
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `BVH export failed: HTTP ${res.status}`)
  }
  const { bvh } = await res.json()
  const blob = new Blob([bvh], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pose_${motion.model}_${Date.now()}.bvh`
  a.click()
  URL.revokeObjectURL(url)
}

// ── AMASS NPZ / G1 CSV / Video export ──────────────────────────────────────

/** Export motion as AMASS NPZ (SMPL-X compatible). */
export async function downloadAMASSNpz(motion: PoseMotion): Promise<void> {
  if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
    throw new Error("Motion data missing SOMA-77 positions or rotations")
  }
  const res = await apiFetch("/poser/text-to-pose/export/amass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_soma77_3d: motion.frames_soma77_3d,
      frames_soma77_rotmat: motion.frames_soma77_rotmat,
      fps: motion.fps,
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `AMASS export failed: HTTP ${res.status}`)
  }
  const { data_b64 } = await res.json()
  downloadBase64Payload(data_b64, `pose_amass_${Date.now()}.npz`, "application/octet-stream")
}

/** Export motion as G1 MuJoCo CSV. */
export async function downloadG1Csv(motion: PoseMotion): Promise<void> {
  if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
    throw new Error("Motion data missing SOMA-77 positions or rotations")
  }
  const res = await apiFetch("/poser/text-to-pose/export/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_soma77_3d: motion.frames_soma77_3d,
      frames_soma77_rotmat: motion.frames_soma77_rotmat,
      fps: motion.fps,
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `CSV export failed: HTTP ${res.status}`)
  }
  const { data_b64 } = await res.json()
  downloadBase64Payload(data_b64, `pose_g1_${Date.now()}.csv`, "text/csv")
}

/**
 * Export motion as a rigged FBX file (Mixamo-compatible joint names).
 *
 * The backend renders an FBX 7.4.0 ASCII skeleton with the full 77-joint
 * hierarchy and baked animation — importable by Blender, Maya, Unity, and
 * Unreal. Mixamo naming enables automatic retargeting onto Mixamo rigs.
 */
export async function downloadFBX(motion: PoseMotion, mixamo = true): Promise<void> {
  if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
    throw new Error("Motion data missing SOMA-77 positions or rotations")
  }
  const res = await apiFetch("/poser/text-to-pose/export/fbx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_soma77_3d: motion.frames_soma77_3d,
      frames_soma77_rotmat: motion.frames_soma77_rotmat,
      fps: motion.fps,
      mixamo,
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `FBX export failed: HTTP ${res.status}`)
  }
  const { fbx } = await res.json()
  const blob = new Blob([fbx], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pose_${motion.model}_${Date.now()}.fbx`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Render a 2D pose video server-side via matplotlib + imageio.
 * Higher-quality and browser-independent than client-side MediaRecorder.
 */
export async function renderServerVideo(
  motion: PoseMotion,
  opts: { width?: number; height?: number; background?: string } = {},
): Promise<Blob> {
  const res = await apiFetch("/poser/text-to-pose/export/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frames_flat: motion.frames_flat,
      fps: motion.fps,
      width: opts.width ?? 512,
      height: opts.height ?? 512,
      background: opts.background ?? "#0d2847",
    }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `Video render failed: HTTP ${res.status}`)
  }
  const { video_b64, mime } = await res.json()
  const bin = atob(video_b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime || "video/mp4" })
}

/** Render and download a server-side 2D pose video. */
export async function downloadServerVideo(
  motion: PoseMotion,
  opts?: { width?: number; height?: number; background?: string },
): Promise<void> {
  const blob = await renderServerVideo(motion, opts)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pose_video_${Date.now()}.mp4`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Constraints save/load ─────────────────────────────────────────────────

export interface ConstraintEntry {
  name: string
  filename: string
  saved_at: number
}

export async function listConstraints(): Promise<ConstraintEntry[]> {
  const res = await apiFetch("/poser/text-to-pose/constraints")
  if (!res.ok) throw new Error(`Constraints list failed: HTTP ${res.status}`)
  const body = await res.json()
  return body.entries ?? []
}

export async function saveConstraints(name: string, constraints: unknown): Promise<void> {
  const res = await apiFetch("/poser/text-to-pose/constraints/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, constraints }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `Save failed: HTTP ${res.status}`)
  }
}

export async function loadConstraints(filename: string): Promise<unknown> {
  const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`)
  if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`)
  const body = await res.json()
  return body.constraints
}

export async function deleteConstraints(filename: string): Promise<void> {
  const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`, {
    method: "DELETE",
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed: HTTP ${res.status}`)
  }
}

// ── Scene save/load ───────────────────────────────────────────────────────
// Full-session persistence (character + motion params + sculpt + constraints
// + reference mesh + lighting + camera as one restorable JSON). Mirrors the
// constraint library API surface so useSceneLibrary mirrors useConstraintLibrary.

export interface SceneEntry {
  name: string
  filename: string
  saved_at: number
}

export async function listScenes(): Promise<SceneEntry[]> {
  const res = await apiFetch("/poser/text-to-pose/scenes")
  if (!res.ok) throw new Error(`Scenes list failed: HTTP ${res.status}`)
  const body = await res.json()
  return body.entries ?? []
}

export async function saveScene(name: string, scene: unknown): Promise<void> {
  const res = await apiFetch("/poser/text-to-pose/scenes/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, scene }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error || `Save failed: HTTP ${res.status}`)
  }
}

export async function loadScene(filename: string): Promise<unknown> {
  const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`)
  if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`)
  const body = await res.json()
  return body.scene
}

export async function deleteScene(filename: string): Promise<void> {
  const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`, {
    method: "DELETE",
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete failed: HTTP ${res.status}`)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Pick a specific frame from a PoseMotion's flat keypoints.
 * Clamps to valid range.
 */
export function pickFrame(motion: PoseMotion, idx: number): FlatKeypoints {
  const clamped = Math.max(0, Math.min(idx, motion.frame_count - 1))
  return motion.frames_flat[clamped]
}

/**
 * Format cache size for display.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Interactive re-skinning (edit mode) ────────────────────────────────────

/**
 * Fetch the 77-joint SOMA-71 rest-pose (bind-pose) positions for the
 * requested identity model. Used by Pose Studio's "Load Model" button to
 * enter Edit Mode WITHOUT generating a motion first — the user can grab
 * joints and pose the character manually.
 *
 * The endpoint accepts both GET (returns the neutral-default joints) and
 * POST (applies the supplied identity morphs first, returns joints that
 * match the shaped body). The POST path is the fully-dynamic one: Anny's
 * height/proportions sliders reshape BOTH the mesh AND the skeleton, so
 * the edit-mode wires always match the body the user sees. Without it the
 * skeleton would stay one fixed size (the static SOMA-77 reference) while
 * the mesh grew/shrank underneath it.
 *
 * Calls GET /poser/skin/bind_joints?identity_model=… when no identity spec
 * is supplied, POST /poser/skin/bind_joints with a JSON body otherwise.
 */
export async function fetchBindJoints(
  identityModel: string = "anny",
  /**
   * Optional identity spec — when ANY of these is supplied, the call
   * switches to POST and the backend applies them via
   * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)`
   * before reading joints, so the returned positions match the shaped
   * body. Mirrors the deformSomaJoints / shaped-mesh contract.
   */
  identityCoeffs?: number[] | null,
  localChanges?: Record<string, number> | null,
  customTargets?: Record<string, number> | null,
): Promise<{ joints: [number, number, number][]; identity_model: string }> {
  const hasSpec =
    (identityCoeffs && identityCoeffs.length > 0) ||
    (localChanges && Object.keys(localChanges).length > 0) ||
    (customTargets && Object.keys(customTargets).length > 0)
  if (!hasSpec) {
    const res = await apiFetch(
      `/poser/skin/bind_joints?identity_model=${encodeURIComponent(identityModel)}`,
    )
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Failed to load bind joints: ${res.status} ${txt}`)
    }
    return res.json()
  }
  const body: Record<string, unknown> = { identity_model: identityModel }
  if (identityCoeffs && identityCoeffs.length > 0) body.identity_coeffs = identityCoeffs
  if (localChanges && Object.keys(localChanges).length > 0) body.local_changes = localChanges
  if (customTargets && Object.keys(customTargets).length > 0) body.custom_targets = customTargets
  const res = await apiFetch("/poser/skin/bind_joints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Failed to load bind joints: ${res.status} ${txt}`)
  }
  return res.json()
}

/**
 * Preload (warm up) a model on the GPU so the first Generate is fast.
 *
 * NOTE: The old forge /admin/load endpoint was removed in the 3-container
 * architecture cleanup. The KimodoPoseService singleton inside ComfyUI
 * now loads lazily on first inference and stays resident, so explicit
 * preloading is unnecessary. This is kept as a no-op so the frontend's
 * "Load Model" button doesn't error.
 */
export async function preloadForgeService(
  _service: string,
  _model?: string,
): Promise<{ status: string; service: string }> {
  return { status: "ok", service: _service }
}

/**
 * Re-skin the mesh for edited SOMA-77 joint positions.
 * Calls /poser/skin/deform_soma with binary response for speed.
 * Used during interactive pose editing — debounced by the caller.
 *
 * @param joints Float32Array of 77 x 3 joint positions
 * @param identityModel Which mesh to skin ("soma" | "mhr" | "anny"). Must
 *   match the mesh the viewer is rendering, otherwise the deformed vertices
 *   won't match the bind-mesh topology and the pose will look wrong.
 * @param jointsRot Optional Float32Array of 77 x 9 global rotation matrices
 *   (row-major 3x3 per joint). When provided, the backend skins directly with
 *   these exact rotations (most accurate). When omitted, the backend derives
 *   approximate rotations from bone directions.
 * @returns base64-encoded float32 deformed vertices (V x 3) for one frame
 */
export async function deformSomaJoints(
  joints: Float32Array,
  identityModel: string = "anny",
  jointsRot?: Float32Array | null,
  /**
   * Identity spec — when supplied, the backend applies them via
   * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)` before
   * skinning so the re-skinned verts match the loaded character (not the
   * default soma bind pose). Without these, edit-mode re-skin would snap the
   * mesh back to the un-morphed body on the first joint drag. All three are
   * optional and model-specific (Anny uses all three; MHR ignores
   * local_changes/custom_targets; SOMA ignores all three).
   */
  identityCoeffs?: number[] | null,
  localChanges?: Record<string, number> | null,
  customTargets?: Record<string, number> | null,
  /**
   * Pre-edit global rotation matrices (77×9, row-major 3×3 per joint) captured
   * BEFORE the user dragged any joint. When supplied (and `jointsRot` is null),
   * the backend recomputes the swing (bone direction) from `joints` while
   * preserving the twist (roll around the bone axis) from these — so dragging
   * a joint updates the bone direction without erasing forearm pronation,
   * neck yaw, etc. This is the edit-mode drag path; `jointsRot` (explicit
   * rotations) takes precedence when both are set.
   */
  baseRotmats?: Float32Array | null,
): Promise<string> {
  // Send as flat nested array (77 joints only - small payload)
  const frames: number[][] = []
  for (let j = 0; j < 77; j++) {
    frames.push([joints[j * 3], joints[j * 3 + 1], joints[j * 3 + 2]])
  }
  const body: Record<string, unknown> = {
    frames_soma77_3d: [frames],
    identity_model: identityModel,
    binary: true,
  }
  // Include the identity spec when supplied so the re-skin matches the
  // loaded character. The backend's deform_soma handler threads these
  // through SomaXSkin.set_identity before LBS — same path as the shaped
  // bind-mesh POST and the generate skinning call.
  if (identityCoeffs && identityCoeffs.length > 0) {
    body.identity_coeffs = identityCoeffs
  }
  if (localChanges && Object.keys(localChanges).length > 0) {
    body.local_changes = localChanges
  }
  if (customTargets && Object.keys(customTargets).length > 0) {
    body.custom_targets = customTargets
  }
  // Pack rotation matrices as (1, 77, 3, 3) nested array when provided.
  if (jointsRot && jointsRot.length === 77 * 9) {
    const rots: number[][][] = _packRotmats(jointsRot)
    body.frames_soma77_rotmat = [rots]
  }
  // Pre-edit rotations: swing recomputed from positions, twist preserved.
  // Sent as a separate field so the backend can apply the swing-twist
  // decomposition rather than using them directly (jointsRot above).
  if (baseRotmats && baseRotmats.length === 77 * 9) {
    const rots: number[][][] = _packRotmats(baseRotmats)
    body.frames_soma77_base_rotmat = [rots]
  }
  const res = await apiFetch("/poser/skin/deform_soma", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Re-skin failed: ${res.status} ${txt}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.vertices_b64 as string
}

/**
 * Pack a flat (77×9,) Float32Array of row-major 3×3 rotation matrices into
 * the (77, 3, 3) nested-array shape the deform_soma endpoint expects.
 * Shared by the `frames_soma77_rotmat` and `frames_soma77_base_rotmat` fields.
 */
function _packRotmats(flat: Float32Array): number[][][] {
  const rots: number[][][] = []
  for (let j = 0; j < 77; j++) {
    const r: number[][] = []
    for (let row = 0; row < 3; row++) {
      r.push([
        flat[j * 9 + row * 3],
        flat[j * 9 + row * 3 + 1],
        flat[j * 9 + row * 3 + 2],
      ])
    }
    rots.push(r)
  }
  return rots
}

// ── SOMA-77 skeleton bones (for overlay rendering) ────────────────────────
// Joint name → parent-joint index, matching vendor/kimodo/kimodo/skeleton/soma_skeleton.py
// SOMASkeleton77 bone order. Used by PoseViewer3D to draw bone lines.

