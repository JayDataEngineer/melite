export declare const KP: {
    readonly NOSE: 0;
    readonly NECK: 1;
    readonly R_SHOULDER: 2;
    readonly R_ELBOW: 3;
    readonly R_WRIST: 4;
    readonly L_SHOULDER: 5;
    readonly L_ELBOW: 6;
    readonly L_WRIST: 7;
    readonly R_HIP: 8;
    readonly R_KNEE: 9;
    readonly R_ANKLE: 10;
    readonly L_HIP: 11;
    readonly L_KNEE: 12;
    readonly L_ANKLE: 13;
    readonly R_EYE: 14;
    readonly L_EYE: 15;
    readonly R_EAR: 16;
    readonly L_EAR: 17;
};
export declare const NUM_KEYPOINTS = 18;
export declare const FLAT_LENGTH: number;
export type Keypoints = number[];
export interface PosePreset {
    id: string;
    name: string;
    category: string;
    description: string;
    tags: string[];
    render_url: string;
    keypoints: Keypoints;
}
export interface PoseAdjustments {
    leftArmRaise: number;
    rightArmRaise: number;
    leftElbowBend: number;
    rightElbowBend: number;
    weightShift: number;
    crouch: number;
    headTilt: number;
    spineLean: number;
}
export declare const DEFAULT_ADJUSTMENTS: PoseAdjustments;
export declare function applyAdjustments(base: Keypoints, adj: PoseAdjustments): Keypoints;
export declare function fetchPosePresets(): Promise<PosePreset[]>;
/**
 * Render keypoints to a PNG skeleton image via the backend.
 * Returns a Blob (image/png) suitable for object URLs.
 */
export declare function renderCustomPose(keypoints: Keypoints, opts?: {
    width?: number;
    height?: number;
}): Promise<Blob>;
/**
 * Convert 2D flat COCO-18 keypoints to approximate 3D positions.
 *
 * The 2D keypoints are flattened [x, y, confidence, ...] in image-pixel space
 * (typically 1024×1024). This function maps them into the SOMA coordinate
 * frame: +X = subject's left, +Y = up, +Z = forward.
 *
 * Z-values are estimated from joint category (shoulders forward, hips back).
 * The result is suitable for the 3D PoseViewer — not physically accurate but
 * visually coherent for preset poses.
 */
export declare function flatTo3D(flat: number[]): [number, number, number][];
//# sourceMappingURL=poseTransforms.d.ts.map