import * as THREE from "three";
import { CM_TO_M } from "./poseStageSkeleton.js";
const FLOOR_LIFT_Y = 0.02;
/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
export function computeMeshLiftY(meshData) {
    let minY = Infinity;
    const verts = meshData.vertices;
    for (let i = 0; i < verts.length; i++) {
        if (verts[i][1] < minY)
            minY = verts[i][1];
    }
    return isFinite(minY) ? FLOOR_LIFT_Y - minY * CM_TO_M : FLOOR_LIFT_Y;
}
export function buildGeometry(meshData) {
    const geo = new THREE.BufferGeometry();
    const verts = meshData.vertices;
    const arr = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
        // Bind pose is raw cm — scaled to meters in the shared buffer so the
        // lift group + deformed frames share one space.
        arr[i * 3] = verts[i][0] * CM_TO_M;
        arr[i * 3 + 1] = verts[i][1] * CM_TO_M;
        arr[i * 3 + 2] = verts[i][2] * CM_TO_M;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const idx = meshData.faces.flat(2);
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
}
// ── API: the per-identity bind-mesh fetch + cache ─────────────────────────
// THE SHARED MODULE OWNS IT (2026-10-13, the card-UI duplication audit).
// This file carried a second copy of fetchBindMesh, and it was not merely
// a twin: the shared copy always sends `custom_targets` for Anny POSTs
// (a missing field means "preserve previous state" to the backend — the
// "slider at 0 shows ~50%" bug), while the copy here sent the field only
// when it had entries, so a slider dragged to 0 left the old weight
// active. It also kept a SECOND mesh cache, so a shape previewed in Body
// Studio was a network hit here, and it folded no previewPose into its
// cache key. Body Studio has imported the shared module since the
// 2026-09-05 dedup; Pose Studio's viewer now does the same, and the two
// studios share one cache. The implementation lives nowhere else.
export { fetchBindMesh } from "@melite/formats/poserSkin";
//# sourceMappingURL=poseStageMesh.js.map
