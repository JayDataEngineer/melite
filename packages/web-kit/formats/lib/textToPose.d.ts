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
export declare function sliceFrameAsB64(multiB64: string, frameIdx: number, vertexCount?: number): Promise<string | null>;
export type CameraView = "front" | "side" | "three-quarter" | "demo";
export type CfgType = "nocfg" | "regular" | "separated";
export type FrameStrategy = "auto_peak" | "auto_mid" | "manual" | "all";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
/** A prompt segment for the multi-stack timeline. */
export interface PromptSegmentInput {
    text: string;
    duration_sec: number;
}
/** A prompt segment with resolved frame ranges — returned by the backend. */
export interface PromptSegmentOutput {
    text: string;
    start_frame: number;
    end_frame: number;
    frame_count: number;
}
export interface TextToPoseRequest {
    prompt: string;
    seed: number | null;
    duration_sec: number;
    diffusion_steps?: number;
    camera_view?: CameraView;
    frame_strategy?: FrameStrategy;
    cfg_type?: CfgType;
    cfg_weight?: number[] | null;
    num_samples?: number;
    num_transition_frames?: number;
    use_cache?: boolean;
    confidence?: number;
    ear_confidence?: number;
    width?: number;
    height?: number;
    frame_indices?: number[] | null;
    /** Per-segment prompts with explicit durations — "timeline command stacking".
     *  When present, the backend gives each segment its own frame budget instead
     *  of splitting a single prompt evenly. */
    prompt_segments?: PromptSegmentInput[];
    /** Post-processing: foot-contact-based root correction. Default true (non-G1). */
    post_processing?: boolean;
    /** Root margin for post-processing (meters). Lower = tighter root pinning. */
    root_margin?: number;
}
/** One frame of COCO-18 keypoints: [x0, y0, c0, x1, y1, c1, ...] (54 floats). */
export type FlatKeypoints = number[];
/** One frame of COCO-18 3D keypoints: [[x, y, z], ...] (18 joints). */
export type Coco18_3D = [number, number, number][];
export interface PoseMotion {
    fps: number;
    frame_count: number;
    duration_sec: number;
    skeleton: string;
    model: string;
    camera_view: CameraView;
    width: number;
    height: number;
    peak_frame_idx: number;
    /** Prompt segments with resolved frame ranges — for accurate timeline display. */
    prompt_segments?: PromptSegmentOutput[];
    /** Flat 2D keypoints per frame — ready for /poser/render. */
    frames_flat: FlatKeypoints[];
    /** 3D keypoints per frame — for 3D preview / rotation. */
    frames_coco18_3d: Coco18_3D[];
    /** Full SOMA-77 3D keypoints per frame (T, 77, 3) — lossless, for /poser/skin/deform_soma. */
    frames_soma77_3d?: [number, number, number][][];
    /** Full SOMA-77 global rotation matrices per frame (T, 77, 3, 3) — for correct LBS skinning. */
    frames_soma77_rotmat?: [number, number, number][][][];
    /** Pre-computed deformed mesh vertices per frame — base64-encoded float32 binary (T, V, 3).
     * Decode via: atob() → ArrayBuffer → Float32Array, then reshape [T * V * 3] → [T][V][3].
     * NOT a JSON array — see deformed_vertices_b64 instead. */
    deformed_vertices_b64?: string;
    /** Base64-encoded .npz of SOMA-77 joints — for round-tripping to other tools. */
    soma_npz_b64?: string;
    /** Foot-contact probabilities per frame (T, 4): [L_heel, R_heel, L_toe, R_toe] in [0,1]. */
    foot_contacts?: number[][];
    /** Number of samples actually generated (may be > 1 when num_samples > 1). */
    num_samples?: number;
    /** Alternate samples when num_samples > 1. Each entry is a full SOMA-77 motion
     * with its own deformed verts, so the UI can render clickable alternates. */
    alt_samples?: AltSample[];
    /** Identity model the deformed_vertices were skinned to. Echoed by the
     *  backend so the frontend can detect a mismatch if the user switched
     *  identity after generating (verts/topo would be wrong). Missing = unknown
     *  = do NOT drop (the historical default before this field existed). */
    identity_model?: string;
    /** Identity coefficients used for the skinning pass (echoed so capture-
     *  reference can build a matching ReferenceMeshSpec without round-tripping
     *  through the bind/mesh endpoint). Missing = defaults were used. */
    identity_coeffs?: number[] | null;
    /** Vertex count of the deformed mesh (V, not V*3). Informational. */
    vertex_count?: number;
}
export interface AltSample {
    sample_idx: number;
    frames_soma77_3d: [number, number, number][][];
    frames_soma77_rotmat: [number, number, number][][][];
    deformed_vertices_b64: string;
}
export interface TextToPoseResult {
    status: "success";
    cache_hit: boolean;
    inference_time_sec: number;
    motion: PoseMotion;
}
export interface SubmitResponse {
    job_id: string;
    status: "pending";
    poll_url: string;
}
export interface JobStatusResponse {
    job_id: string;
    status: JobStatus;
    result?: TextToPoseResult;
    error?: string;
    error_class?: string;
}
export interface CacheEntry {
    hash: string;
    prompt: string;
    seed: number | null;
    duration_sec: number;
    model_name: string;
    created_at: number;
    accessed_at: number;
    size_bytes: number;
    frame_count: number;
    peak_frame_idx: number;
}
export interface CacheListResponse {
    entries: CacheEntry[];
    total_size_bytes: number;
    entry_count: number;
}
/**
 * Submit a text-to-pose generation request.
 * Returns immediately with a job_id — poll via pollJob() or waitForJob().
 */
export declare function submitTextToPose(req: TextToPoseRequest): Promise<SubmitResponse>;
/**
 * Poll job status once. Returns the current status + result if completed.
 */
export declare function pollJob(jobId: string): Promise<JobStatusResponse>;
/**
 * Wait for a job to reach a terminal state (completed/failed/cancelled).
 * Polls every `intervalMs` until `timeoutMs`.
 *
 * Calls `onUpdate` on each poll if provided — useful for progress UI.
 */
export declare function waitForJob(jobId: string, opts?: {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (status: JobStatusResponse) => void;
}): Promise<TextToPoseResult>;
export declare function cancelJob(jobId: string): Promise<void>;
/**
 * Submit a text-to-pose request and wait for the result.
 * This is the simplest call for UI components that just want the final motion.
 */
export declare function generatePose(req: TextToPoseRequest, opts?: {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (status: JobStatusResponse) => void;
}): Promise<TextToPoseResult>;
export declare function listPoseCache(): Promise<CacheListResponse>;
export declare function deletePoseCacheEntry(hash: string): Promise<void>;
export declare function clearPoseCache(): Promise<number>;
export interface ModelInfo {
    id: string;
    label: string;
    /** True if the model checkpoint is available locally. */
    local: boolean;
    is_default: boolean;
}
export declare function listModels(): Promise<{
    models: ModelInfo[];
    default: string;
}>;
export interface RegistryVersion {
    display: string;
    short_key: string;
    local: boolean;
    is_g1: boolean;
}
export interface RegistrySkeleton {
    label: string;
    key: string;
    versions: RegistryVersion[];
}
export interface RegistryTree {
    datasets: string[];
    tree: Record<string, {
        skeletons: RegistrySkeleton[];
    }>;
    default_dataset: string | null;
    default_skeleton: string | null;
    default_version: string;
}
export declare function listRegistry(): Promise<RegistryTree>;
export interface KimodoExampleMeta {
    text?: string;
    texts?: string[];
    duration?: number;
    num_samples?: number;
    seed?: number;
    diffusion_steps?: number;
    cfg?: {
        enabled?: boolean;
        text_weight?: number;
        constraint_weight?: number;
    };
}
export interface KimodoExample {
    id: string;
    name: string;
    model: string;
    has_motion: boolean;
    has_constraints: boolean;
    meta: KimodoExampleMeta;
}
export declare function listExamples(model?: string): Promise<{
    examples: KimodoExample[];
}>;
export declare function loadExample(model: string, exampleId: string, loadGt?: boolean): Promise<{
    id: string;
    model: string;
    meta: KimodoExampleMeta;
    motion_b64?: string;
    motion_size?: number;
    constraints?: unknown[];
}>;
export declare function exportBVH(framesSoma77: number[][][], framesRotmat: number[][][][], fps: number): Promise<{
    bvh: string;
    frames: number;
    joints: number;
}>;
/** Download a BVH file from SOMA-77 motion data. */
export declare function downloadBVH(motion: PoseMotion, standardTpose?: boolean): Promise<void>;
/** Export motion as AMASS NPZ (SMPL-X compatible). */
export declare function downloadAMASSNpz(motion: PoseMotion): Promise<void>;
/** Export motion as G1 MuJoCo CSV. */
export declare function downloadG1Csv(motion: PoseMotion): Promise<void>;
/**
 * Export motion as a rigged FBX file (Mixamo-compatible joint names).
 *
 * The backend renders an FBX 7.4.0 ASCII skeleton with the full 77-joint
 * hierarchy and baked animation — importable by Blender, Maya, Unity, and
 * Unreal. Mixamo naming enables automatic retargeting onto Mixamo rigs.
 */
export declare function downloadFBX(motion: PoseMotion, mixamo?: boolean): Promise<void>;
/**
 * Render a 2D pose video server-side via matplotlib + imageio.
 * Higher-quality and browser-independent than client-side MediaRecorder.
 */
export declare function renderServerVideo(motion: PoseMotion, opts?: {
    width?: number;
    height?: number;
    background?: string;
}): Promise<Blob>;
/** Render and download a server-side 2D pose video. */
export declare function downloadServerVideo(motion: PoseMotion, opts?: {
    width?: number;
    height?: number;
    background?: string;
}): Promise<void>;
export interface ConstraintEntry {
    name: string;
    filename: string;
    saved_at: number;
}
export declare function listConstraints(): Promise<ConstraintEntry[]>;
export declare function saveConstraints(name: string, constraints: unknown): Promise<void>;
export declare function loadConstraints(filename: string): Promise<unknown>;
export declare function deleteConstraints(filename: string): Promise<void>;
export interface SceneEntry {
    name: string;
    filename: string;
    saved_at: number;
}
export declare function listScenes(): Promise<SceneEntry[]>;
export declare function saveScene(name: string, scene: unknown): Promise<void>;
export declare function loadScene(filename: string): Promise<unknown>;
export declare function deleteScene(filename: string): Promise<void>;
/**
 * Pick a specific frame from a PoseMotion's flat keypoints.
 * Clamps to valid range.
 */
export declare function pickFrame(motion: PoseMotion, idx: number): FlatKeypoints;
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
export declare function fetchBindJoints(identityModel?: string, 
/**
 * Optional identity spec — when ANY of these is supplied, the call
 * switches to POST and the backend applies them via
 * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)`
 * before reading joints, so the returned positions match the shaped
 * body. Mirrors the deformSomaJoints / shaped-mesh contract.
 */
identityCoeffs?: number[] | null, localChanges?: Record<string, number> | null, customTargets?: Record<string, number> | null): Promise<{
    joints: [number, number, number][];
    identity_model: string;
}>;
/**
 * Preload (warm up) a model on the GPU so the first Generate is fast.
 *
 * NOTE: The old forge /admin/load endpoint was removed in the 3-container
 * architecture cleanup. The KimodoPoseService singleton inside ComfyUI
 * now loads lazily on first inference and stays resident, so explicit
 * preloading is unnecessary. This is kept as a no-op so the frontend's
 * "Load Model" button doesn't error.
 */
export declare function preloadForgeService(_service: string, _model?: string): Promise<{
    status: string;
    service: string;
}>;
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
export declare function deformSomaJoints(joints: Float32Array, identityModel?: string, jointsRot?: Float32Array | null, 
/**
 * Identity spec — when supplied, the backend applies them via
 * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)` before
 * skinning so the re-skinned verts match the loaded character (not the
 * default soma bind pose). Without these, edit-mode re-skin would snap the
 * mesh back to the un-morphed body on the first joint drag. All three are
 * optional and model-specific (Anny uses all three; MHR ignores
 * local_changes/custom_targets; SOMA ignores all three).
 */
identityCoeffs?: number[] | null, localChanges?: Record<string, number> | null, customTargets?: Record<string, number> | null, 
/**
 * Pre-edit global rotation matrices (77×9, row-major 3×3 per joint) captured
 * BEFORE the user dragged any joint. When supplied (and `jointsRot` is null),
 * the backend recomputes the swing (bone direction) from `joints` while
 * preserving the twist (roll around the bone axis) from these — so dragging
 * a joint updates the bone direction without erasing forearm pronation,
 * neck yaw, etc. This is the edit-mode drag path; `jointsRot` (explicit
 * rotations) takes precedence when both are set.
 */
baseRotmats?: Float32Array | null): Promise<string>;
//# sourceMappingURL=textToPose.d.ts.map
