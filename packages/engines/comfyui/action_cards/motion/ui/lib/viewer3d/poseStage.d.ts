/**
 * poseStage — the raw-three pose scene (the substrate law).
 *
 * THE PORT (2026-09-13): PoseViewer3D/PoseEditMode rode @react-three/fiber
 * + drei — the last r3f island in the card plane (the react-reconciler
 * version-skew boot crash is why the substrate exists). This module is the
 * 1:1 imperative port of that scene graph onto card-base's shared stage3d
 * core: every r3f child component became a subsystem with an update()
 * coarse-diff, useFrame became an ordered stage tick (anim clock BEFORE
 * skin upload — the declaration order of the old JSX tree), drei's
 * OrbitControls/Grid/ContactShadows/Text/Billboard/TransformControls became
 * three's own OrbitControls/GridHelper/ShadowMaterial plane/canvas-texture
 * sprites/addons TransformControls.
 *
 * Coordinate law (unchanged from the r3f original): ALL mesh/joint content
 * lives inside ONE lift group translated by meshLiftY (bind-mesh min-Y lift
 * + the in-place XZ anchor). Raw cm data → *CM_TO_M at ingestion; the group
 * carries the visual offset so drag handlers still receive RAW (cm-space)
 * coordinates. TransformControls gizmos attach to pivots INSIDE the group
 * but the gizmo itself is scene-rooted — world handles, local drag math,
 * which is the clean version of the old LiftAwareTransformControls fix
 * (its negative-offset hack existed only because drei nested the gizmo
 * inside the lifted group).
 */
import * as THREE from "three";
import type { CameraFraming, PoseStageProps } from "./poseStageTypes.js";
export { CM_TO_M, SOMA77_PARENT, getDescendants, getJointChain, solveCCD } from "./poseStageSkeleton.js";
export { cameraPosFor, framedCameraPos } from "./poseStageCamera.js";
export { buildGeometry, computeMeshLiftY, fetchBindMesh } from "./poseStageMesh.js";
export type { AltSampleDecoded, CameraFraming, JointMoveEvent, LightingOrb, PoseStageProps, ReferenceBundle, ReferenceMeshSpec, SkinMeshData, } from "./poseStageTypes.js";
export interface PoseStageHandle {
    /** { gl, scene, camera } — the MotionExportDialog projection ctx. */
    threeCtx: {
        gl: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.Camera;
    };
    update(p: PoseStageProps): void;
    applyCamera(view: string, framing: CameraFraming): void;
    setDarkMode(dark: boolean): void;
    dispose(): void;
}
export declare function mountPoseStage(canvas: HTMLCanvasElement, opts: {
    fov: number;
    camera: [number, number, number];
    darkMode: boolean;
    onFail?: (msg: string) => void;
    onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}): PoseStageHandle | null;
