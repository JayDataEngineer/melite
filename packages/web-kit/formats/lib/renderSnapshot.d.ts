/**
 * renderSnapshot — THE one-frame scene→JPEG snapshotter (2026-09-05
 * dedup order).
 *
 * The poster tiles (MeshPoster for GLB meshes, MotionPoster for NPZ
 * motion) and any future "render this 3D thing to a small static
 * image" surface share ONE mechanic: a disposable offscreen
 * WebGLRenderer, one render pass at a capped DPR, toDataURL → JPEG,
 * then immediate teardown (context loss + geometry/material disposal —
 * nothing live remains per tile). The two poster components carried
 * byte-adjacent copies of this block; the scene CONTENT they build is
 * different, the SNAPSHOT is not.
 *
 * preserveDrawingBuffer is REQUIRED for toDataURL() to read back a
 * non-blank frame; the cost is negligible since we dispose
 * immediately.
 */
import * as THREE from '@melite/three-client/client';
export interface SnapshotOptions {
    /** Square output size (256 — plenty for a tile even at 2× DPR). */
    size?: number;
    /** JPEG quality (0.82 — photo-like renders, 4–6× smaller than PNG). */
    jpegQuality?: number;
    /** Device-pixel-ratio cap (1.5 — the tile is too small for more). */
    maxDpr?: number;
    /** Object whose geometry/materials are disposed after the snapshot
     *  (the scene graph the caller built for this render). */
    disposeRoot?: THREE.Object3D;
}
/** Render `scene` through `camera` ONCE and return a JPEG data URL.
 *  The renderer is created, used, and torn down within this call —
 *  no persistent WebGL context survives a snapshot. */
export declare function snapshotSceneToJpeg(scene: THREE.Scene, camera: THREE.Camera, opts?: SnapshotOptions): string;
//# sourceMappingURL=renderSnapshot.d.ts.map