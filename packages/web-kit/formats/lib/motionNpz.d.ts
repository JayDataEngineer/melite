import { type NpyArray } from "./npz.js";
import { loadSomaSkin, type SomaSkin } from "./somaSkin.js";
export interface MotionNpz {
    /** (T, 77, 3) joint positions, meters, row-major flat. */
    posedJoints: Float32Array;
    /** (T, 77, 3, 3) per-joint rotation matrices, meters space, flat (T, 77, 9). */
    globalRotMats: Float32Array;
    fps: number;
    T: number;
}
/** Fetch + parse a kimodo motion NPZ, validating the SOMA-77 contract. */
export declare function loadMotionNpz(url: string): Promise<MotionNpz>;
/**
 * Run client-side LBS for every frame: allVerts (T, V, 3) meters.
 * global_rot_mats is (T, 77, 9) per-joint row-major; posed_joints is
 * (T, 77, 3) — both METERS (kimodo's native unit, no conversion).
 */
export declare function precomputeDeformedVerts(npz: MotionNpz, skin: SomaSkin): Float32Array;
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
export declare function precomputeDeformedVertsChunked(npz: MotionNpz, skin: SomaSkin, outputCm?: boolean, chunkFrames?: number): Promise<Float32Array>;
/** Scale a meters Float32Array by `factor` (×100 → cm) into a new array. */
export declare function scaledArray(src: Float32Array, factor: number): Float32Array;
/** Base64 of the raw float32 bytes (optionally scaled to cm first). */
export declare function vertsToB64(verts: Float32Array, toCm?: boolean): string;
export declare function jointsToCm(jointsM: Float32Array): Float32Array;
export declare function jointsFromCm(jointsCm: Float32Array): Float32Array;
export declare const AZIMUTH_PRESETS: readonly [{
    readonly angle: 0;
    readonly cameraView: "az-0";
    readonly label: "Front";
}, {
    readonly angle: 45;
    readonly cameraView: "az-45";
    readonly label: "F-R";
}, {
    readonly angle: 90;
    readonly cameraView: "az-90";
    readonly label: "Right";
}, {
    readonly angle: 135;
    readonly cameraView: "az-135";
    readonly label: "B-R";
}, {
    readonly angle: 180;
    readonly cameraView: "az-180";
    readonly label: "Back";
}, {
    readonly angle: 225;
    readonly cameraView: "az-225";
    readonly label: "B-L";
}, {
    readonly angle: 270;
    readonly cameraView: "az-270";
    readonly label: "Left";
}, {
    readonly angle: 315;
    readonly cameraView: "az-315";
    readonly label: "F-L";
}];
export type MotionAzimuth = (typeof AZIMUTH_PRESETS)[number]["cameraView"];
/** Camera position for an azimuth view — target is (0, 0.9, 0). */
export declare function azimuthCameraPos(view: MotionAzimuth): [number, number, number];
/** Step ±1 preset around the 8-angle ring (wrap-around). Used by the motion
 *  card's rotate arrows. All presets sit on the same ring (AZ_DIST/AZ_HEIGHT),
 *  so stepping is a hard camera snap — no zoom/height preservation needed. */
export declare function stepAzimuth(view: MotionAzimuth, dir: 1 | -1): MotionAzimuth;
export declare const COCO_TO_SOMA_IDX: number[];
/**
 * Project SOMA-77 3D joints to COCO-18 3D joints (view-independent, meters).
 * Input: (77, 3) meters; output: (18, 3) meters — [x,y,z] per COCO joint.
 */
export declare function soma77ToCoco18(jointsM: Float32Array): Float32Array;
export declare function crc32(bytes: Uint8Array): number;
export interface NpzEntry {
    data: Float32Array;
    /** The array's shape (e.g. [T, 77, 3]). Omitted → 1-D [length]. */
    shape?: number[];
}
/**
 * Serialize a map of named float32 arrays to an NPZ (ZIP of NPY v1 entries).
 * Matches np.savez_compressed's container: ZIP method 8 (deflate-raw),
 * entries named "<key>.npy", real CRC32s. `compress: false` → stored (method
 * 0), like np.savez.
 */
export declare function writeNpz(arrays: Record<string, NpzEntry>, compress?: boolean): Promise<Uint8Array<ArrayBuffer>>;
/** Data URL for the prev_motion_artifact slot (SlotSquare's file-drop shape). */
export declare function npzToDataUrl(bytes: Uint8Array): string;
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
export declare function patchFrame(posedJoints: Float32Array, // (T, 77, 3) meters
globalRotMats: Float32Array, // (T, 77, 9) meters
editedJointsM: Float32Array, // (77, 3) meters — the edited frame's positions
frameIdx: number): {
    posedJoints: Float32Array;
    globalRotMats: Float32Array;
};
export { loadSomaSkin, type SomaSkin };
export type { NpyArray };
//# sourceMappingURL=motionNpz.d.ts.map