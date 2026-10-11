export interface SkinMeshData {
    vertices: number[][];
    faces: number[][];
}
export interface IdentityGroup {
    label: string;
    start: number;
    count: number;
}
export interface LocalChangeGroup {
    label: string;
    indices: number[];
    category: "body" | "face";
}
export interface LocalChangeSpace {
    dims: number;
    labels: string[];
    defaults: number[];
    range: [number, number];
    groups: LocalChangeGroup[];
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
    id: string;
    name: string;
    description: string;
    glyph: string;
    /** Absolute path on the server (debug only - not used by the UI). */
    file?: string;
}
export interface CustomTargetSpace {
    /** Ordered list - one slider row per entry. */
    items: CustomTargetItem[];
    defaults: number[];
    range: [number, number];
}
export interface IdentitySpace {
    identity_model: string;
    dims: number;
    labels: string[];
    defaults: number[];
    range: [number, number];
    groups: IdentityGroup[] | null;
    local_changes: LocalChangeSpace | null;
    /**
     * Community .target blendshapes (Anny only). null for MHR/SOMA - the UI
     * hides the Stylization tab in that case.
     */
    custom_targets: CustomTargetSpace | null;
}
export type PreviewPose = "tpose" | "arms_down";
/** One bind-mesh request. Object-shaped ON PURPOSE (2026-09-05): the
 *  positional form is how the two pre-dedup copies drifted — motion's
 *  copy had no preview_pose, so custom_targets sat one slot left of
 *  the body copy's. An options object cannot be mis-slotted. */
export interface BindMeshQuery {
    identityModel?: string;
    identityCoeffs?: number[] | null;
    localChanges?: Record<string, number> | null;
    previewPose?: PreviewPose | null;
    customTargets?: Record<string, number> | null;
}
export declare function fetchBindMesh(query?: BindMeshQuery): Promise<SkinMeshData>;
export declare function fetchIdentitySpace(model: string): Promise<IdentitySpace>;
/** SkinMeshData → flat Float32Array positions (V*3) in METERS with the
 *  floor lift applied (the body-studio preview geometry path). */
export declare function buildFlatPositions(meshData: SkinMeshData): Float32Array;
//# sourceMappingURL=poserSkin.d.ts.map
