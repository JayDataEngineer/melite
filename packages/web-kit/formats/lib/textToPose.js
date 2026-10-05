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
import { apiFetch } from "@melite/catalog/api";
import { decodeB64ToBuffer } from "./b64.js";
import { encodeBufferToB64 } from "./poseCodec.js";
import { downloadBase64Payload } from "./downloads.js";
import { SOMA_VERTEX_COUNT } from "./poseCodec.js";
import { sleep } from "@melite/catalog/sleep";
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
export async function sliceFrameAsB64(multiB64, frameIdx, vertexCount = SOMA_VERTEX_COUNT) {
    try {
        const stride = vertexCount * 3;
        const buf = await decodeB64ToBuffer(multiB64);
        const multi = new Float32Array(buf);
        const totalFrames = Math.floor(multi.length / stride);
        if (totalFrames < 1)
            return null;
        const idx = Math.max(0, Math.min(frameIdx, totalFrames - 1));
        const singleFlat = new Float32Array(stride);
        singleFlat.set(multi.subarray(idx * stride, (idx + 1) * stride));
        return encodeBufferToB64(new Uint8Array(singleFlat.buffer));
    }
    catch (e) {
        console.error("[text-to-pose] sliceFrameAsB64 failed:", e);
        return null;
    }
}
// ── Submit ─────────────────────────────────────────────────────────────────
/**
 * Submit a text-to-pose generation request.
 * Returns immediately with a job_id — poll via pollJob() or waitForJob().
 */
export async function submitTextToPose(req) {
    const res = await apiFetch("/poser/text-to-pose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });
    // Read text first — the server may return a non-JSON error (405, 502, etc.)
    // and res.json() would throw an opaque V8 parse error that hides the cause.
    const text = await res.text();
    if (!res.ok) {
        let detail = text.slice(0, 300);
        try {
            const j = JSON.parse(text);
            detail = j.error || detail;
        }
        catch { /* not JSON */ }
        throw new Error(`Submit failed: HTTP ${res.status} — ${detail}`);
    }
    try {
        return JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Submit returned invalid JSON: ${text.slice(0, 200)}`);
    }
}
// ── Poll ───────────────────────────────────────────────────────────────────
/**
 * Poll job status once. Returns the current status + result if completed.
 */
export async function pollJob(jobId) {
    const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`);
    if (res.status === 404) {
        throw new Error(`Job ${jobId} not found`);
    }
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Poll failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }
    try {
        return JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Poll returned invalid JSON: ${text.slice(0, 200)}`);
    }
}
/**
 * Wait for a job to reach a terminal state (completed/failed/cancelled).
 * Polls every `intervalMs` until `timeoutMs`.
 *
 * Calls `onUpdate` on each poll if provided — useful for progress UI.
 */
export async function waitForJob(jobId, opts = {}) {
    const interval = opts.intervalMs ?? 500;
    const timeout = opts.timeoutMs ?? 120_000; // 2 min default (inference is 15-30s)
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const status = await pollJob(jobId);
        opts.onUpdate?.(status);
        if (status.status === "completed" && status.result) {
            return status.result;
        }
        if (status.status === "failed") {
            throw new Error(status.error || `Job failed (${status.error_class || "unknown"})`);
        }
        if (status.status === "cancelled") {
            throw new Error("Job was cancelled");
        }
        await sleep(interval);
    }
    throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
}
// ── Cancel ─────────────────────────────────────────────────────────────────
export async function cancelJob(jobId) {
    const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`, {
        method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
        throw new Error(`Cancel failed: HTTP ${res.status}`);
    }
}
// ── Convenience: submit + wait in one call ─────────────────────────────────
/**
 * Submit a text-to-pose request and wait for the result.
 * This is the simplest call for UI components that just want the final motion.
 */
export async function generatePose(req, opts) {
    const { job_id } = await submitTextToPose(req);
    return waitForJob(job_id, opts);
}
// ── Cache ──────────────────────────────────────────────────────────────────
export async function listPoseCache() {
    const res = await apiFetch("/poser/text-to-pose/cache");
    if (!res.ok)
        throw new Error(`Cache list failed: HTTP ${res.status}`);
    return res.json();
}
export async function deletePoseCacheEntry(hash) {
    const res = await apiFetch(`/poser/text-to-pose/cache/${hash}`, {
        method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
        throw new Error(`Cache delete failed: HTTP ${res.status}`);
    }
}
export async function clearPoseCache() {
    const res = await apiFetch("/poser/text-to-pose/cache/clear", {
        method: "POST",
    });
    if (!res.ok)
        throw new Error(`Cache clear failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.cleared;
}
export async function listModels() {
    const res = await apiFetch("/poser/text-to-pose/models");
    if (!res.ok)
        throw new Error(`Models list failed: HTTP ${res.status}`);
    return res.json();
}
export async function listRegistry() {
    const res = await apiFetch("/poser/text-to-pose/registry");
    if (!res.ok)
        throw new Error(`Registry fetch failed: HTTP ${res.status}`);
    return res.json();
}
export async function listExamples(model) {
    const q = model ? `?model=${encodeURIComponent(model)}` : "";
    const res = await apiFetch(`/poser/text-to-pose/examples${q}`);
    if (!res.ok)
        throw new Error(`Examples list failed: HTTP ${res.status}`);
    return res.json();
}
export async function loadExample(model, exampleId, loadGt = false) {
    const q = loadGt ? `?load_gt=true` : "";
    const res = await apiFetch(`/poser/text-to-pose/examples/${model}/${exampleId}${q}`);
    if (!res.ok)
        throw new Error(`Example load failed: HTTP ${res.status}`);
    return res.json();
}
// ── BVH export ─────────────────────────────────────────────────────────────
export async function exportBVH(framesSoma77, framesRotmat, fps) {
    const res = await apiFetch("/poser/text-to-pose/export/bvh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            frames_soma77_3d: framesSoma77,
            frames_soma77_rotmat: framesRotmat,
            fps,
        }),
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `BVH export failed: HTTP ${res.status}`);
    }
    return res.json();
}
/** Download a BVH file from SOMA-77 motion data. */
export async function downloadBVH(motion, standardTpose = false) {
    if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
        throw new Error("Motion data missing SOMA-77 positions or rotations");
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
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `BVH export failed: HTTP ${res.status}`);
    }
    const { bvh } = await res.json();
    const blob = new Blob([bvh], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pose_${motion.model}_${Date.now()}.bvh`;
    a.click();
    URL.revokeObjectURL(url);
}
// ── AMASS NPZ / G1 CSV / Video export ──────────────────────────────────────
/** Export motion as AMASS NPZ (SMPL-X compatible). */
export async function downloadAMASSNpz(motion) {
    if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
        throw new Error("Motion data missing SOMA-77 positions or rotations");
    }
    const res = await apiFetch("/poser/text-to-pose/export/amass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            frames_soma77_3d: motion.frames_soma77_3d,
            frames_soma77_rotmat: motion.frames_soma77_rotmat,
            fps: motion.fps,
        }),
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `AMASS export failed: HTTP ${res.status}`);
    }
    const { data_b64 } = await res.json();
    downloadBase64Payload(data_b64, `pose_amass_${Date.now()}.npz`, "application/octet-stream");
}
/** Export motion as G1 MuJoCo CSV. */
export async function downloadG1Csv(motion) {
    if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
        throw new Error("Motion data missing SOMA-77 positions or rotations");
    }
    const res = await apiFetch("/poser/text-to-pose/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            frames_soma77_3d: motion.frames_soma77_3d,
            frames_soma77_rotmat: motion.frames_soma77_rotmat,
            fps: motion.fps,
        }),
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `CSV export failed: HTTP ${res.status}`);
    }
    const { data_b64 } = await res.json();
    downloadBase64Payload(data_b64, `pose_g1_${Date.now()}.csv`, "text/csv");
}
/**
 * Export motion as a rigged FBX file (Mixamo-compatible joint names).
 *
 * The backend renders an FBX 7.4.0 ASCII skeleton with the full 77-joint
 * hierarchy and baked animation — importable by Blender, Maya, Unity, and
 * Unreal. Mixamo naming enables automatic retargeting onto Mixamo rigs.
 */
export async function downloadFBX(motion, mixamo = true) {
    if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) {
        throw new Error("Motion data missing SOMA-77 positions or rotations");
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
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `FBX export failed: HTTP ${res.status}`);
    }
    const { fbx } = await res.json();
    const blob = new Blob([fbx], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pose_${motion.model}_${Date.now()}.fbx`;
    a.click();
    URL.revokeObjectURL(url);
}
/**
 * Render a 2D pose video server-side via matplotlib + imageio.
 * Higher-quality and browser-independent than client-side MediaRecorder.
 */
export async function renderServerVideo(motion, opts = {}) {
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
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Video render failed: HTTP ${res.status}`);
    }
    const { video_b64, mime } = await res.json();
    const bin = atob(video_b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime || "video/mp4" });
}
/** Render and download a server-side 2D pose video. */
export async function downloadServerVideo(motion, opts) {
    const blob = await renderServerVideo(motion, opts);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pose_video_${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
}
export async function listConstraints() {
    const res = await apiFetch("/poser/text-to-pose/constraints");
    if (!res.ok)
        throw new Error(`Constraints list failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.entries ?? [];
}
export async function saveConstraints(name, constraints) {
    const res = await apiFetch("/poser/text-to-pose/constraints/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, constraints }),
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Save failed: HTTP ${res.status}`);
    }
}
export async function loadConstraints(filename) {
    const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`);
    if (!res.ok)
        throw new Error(`Load failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.constraints;
}
export async function deleteConstraints(filename) {
    const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`, {
        method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
        throw new Error(`Delete failed: HTTP ${res.status}`);
    }
}
export async function listScenes() {
    const res = await apiFetch("/poser/text-to-pose/scenes");
    if (!res.ok)
        throw new Error(`Scenes list failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.entries ?? [];
}
export async function saveScene(name, scene) {
    const res = await apiFetch("/poser/text-to-pose/scenes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scene }),
    });
    if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Save failed: HTTP ${res.status}`);
    }
}
export async function loadScene(filename) {
    const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`);
    if (!res.ok)
        throw new Error(`Load failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.scene;
}
export async function deleteScene(filename) {
    const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`, {
        method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
        throw new Error(`Delete failed: HTTP ${res.status}`);
    }
}
// ── Helpers ────────────────────────────────────────────────────────────────
/**
 * Pick a specific frame from a PoseMotion's flat keypoints.
 * Clamps to valid range.
 */
export function pickFrame(motion, idx) {
    const clamped = Math.max(0, Math.min(idx, motion.frame_count - 1));
    return motion.frames_flat[clamped];
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
export async function fetchBindJoints(identityModel = "anny", 
/**
 * Optional identity spec — when ANY of these is supplied, the call
 * switches to POST and the backend applies them via
 * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)`
 * before reading joints, so the returned positions match the shaped
 * body. Mirrors the deformSomaJoints / shaped-mesh contract.
 */
identityCoeffs, localChanges, customTargets) {
    const hasSpec = (identityCoeffs && identityCoeffs.length > 0) ||
        (localChanges && Object.keys(localChanges).length > 0) ||
        (customTargets && Object.keys(customTargets).length > 0);
    if (!hasSpec) {
        const res = await apiFetch(`/poser/skin/bind_joints?identity_model=${encodeURIComponent(identityModel)}`);
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to load bind joints: ${res.status} ${txt}`);
        }
        return res.json();
    }
    const body = { identity_model: identityModel };
    if (identityCoeffs && identityCoeffs.length > 0)
        body.identity_coeffs = identityCoeffs;
    if (localChanges && Object.keys(localChanges).length > 0)
        body.local_changes = localChanges;
    if (customTargets && Object.keys(customTargets).length > 0)
        body.custom_targets = customTargets;
    const res = await apiFetch("/poser/skin/bind_joints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to load bind joints: ${res.status} ${txt}`);
    }
    return res.json();
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
export async function preloadForgeService(_service, _model) {
    return { status: "ok", service: _service };
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
export async function deformSomaJoints(joints, identityModel = "anny", jointsRot, 
/**
 * Identity spec — when supplied, the backend applies them via
 * `SomaXSkin.set_identity(coeffs, local_changes=, custom_targets=)` before
 * skinning so the re-skinned verts match the loaded character (not the
 * default soma bind pose). Without these, edit-mode re-skin would snap the
 * mesh back to the un-morphed body on the first joint drag. All three are
 * optional and model-specific (Anny uses all three; MHR ignores
 * local_changes/custom_targets; SOMA ignores all three).
 */
identityCoeffs, localChanges, customTargets, 
/**
 * Pre-edit global rotation matrices (77×9, row-major 3×3 per joint) captured
 * BEFORE the user dragged any joint. When supplied (and `jointsRot` is null),
 * the backend recomputes the swing (bone direction) from `joints` while
 * preserving the twist (roll around the bone axis) from these — so dragging
 * a joint updates the bone direction without erasing forearm pronation,
 * neck yaw, etc. This is the edit-mode drag path; `jointsRot` (explicit
 * rotations) takes precedence when both are set.
 */
baseRotmats) {
    // Send as flat nested array (77 joints only - small payload)
    const frames = [];
    for (let j = 0; j < 77; j++) {
        frames.push([joints[j * 3], joints[j * 3 + 1], joints[j * 3 + 2]]);
    }
    const body = {
        frames_soma77_3d: [frames],
        identity_model: identityModel,
        binary: true,
    };
    // Include the identity spec when supplied so the re-skin matches the
    // loaded character. The backend's deform_soma handler threads these
    // through SomaXSkin.set_identity before LBS — same path as the shaped
    // bind-mesh POST and the generate skinning call.
    if (identityCoeffs && identityCoeffs.length > 0) {
        body.identity_coeffs = identityCoeffs;
    }
    if (localChanges && Object.keys(localChanges).length > 0) {
        body.local_changes = localChanges;
    }
    if (customTargets && Object.keys(customTargets).length > 0) {
        body.custom_targets = customTargets;
    }
    // Pack rotation matrices as (1, 77, 3, 3) nested array when provided.
    if (jointsRot && jointsRot.length === 77 * 9) {
        const rots = _packRotmats(jointsRot);
        body.frames_soma77_rotmat = [rots];
    }
    // Pre-edit rotations: swing recomputed from positions, twist preserved.
    // Sent as a separate field so the backend can apply the swing-twist
    // decomposition rather than using them directly (jointsRot above).
    if (baseRotmats && baseRotmats.length === 77 * 9) {
        const rots = _packRotmats(baseRotmats);
        body.frames_soma77_base_rotmat = [rots];
    }
    const res = await apiFetch("/poser/skin/deform_soma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Re-skin failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    if (data.error)
        throw new Error(data.error);
    return data.vertices_b64;
}
/**
 * Pack a flat (77×9,) Float32Array of row-major 3×3 rotation matrices into
 * the (77, 3, 3) nested-array shape the deform_soma endpoint expects.
 * Shared by the `frames_soma77_rotmat` and `frames_soma77_base_rotmat` fields.
 */
function _packRotmats(flat) {
    const rots = [];
    for (let j = 0; j < 77; j++) {
        const r = [];
        for (let row = 0; row < 3; row++) {
            r.push([
                flat[j * 9 + row * 3],
                flat[j * 9 + row * 3 + 1],
                flat[j * 9 + row * 3 + 2],
            ]);
        }
        rots.push(r);
    }
    return rots;
}
// ── SOMA-77 skeleton bones (for overlay rendering) ────────────────────────
// Joint name → parent-joint index, matching vendor/kimodo/kimodo/skeleton/soma_skeleton.py
// SOMASkeleton77 bone order. Used by PoseViewer3D to draw bone lines.
//# sourceMappingURL=textToPose.js.map
