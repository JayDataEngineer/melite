import type React from "react";
import * as THREE from '@melite/three-client/client';
import type { MotionAzimuth } from "@melite/formats";
import { framedCameraPos, type SkinMeshData, type JointMoveEvent, type LightingOrb, type ReferenceMeshSpec, type CameraFraming as Framing } from "./poseStage.js";
import { type StageLayers } from '@melite/card-base/client';
export type { CameraFraming, ReferenceMeshSpec, LightingOrb, JointMoveEvent } from "./poseStage.js";
export { framedCameraPos };
export interface PoseViewer3DProps {
    /** Pre-computed deformed vertices — base64-encoded float32 binary (T, V, 3). */
    deformedVerticesB64?: string | null;
    /** Pre-computed deformed vertices as a raw Float32Array (T, V, 3) IN CM.
     *  When provided, this is used DIRECTLY — no base64 encode/decode roundtrip.
     *  The motion card passes the full-motion LBS result here (up to 32MB) to
     *  avoid the ~500ms synchronous encode + async decode of the b64 path.
     *  Ignored when `editedDeformedB64` is set (edit override wins). */
    deformedVertsDirect?: Float32Array | null;
    frameIdx: number;
    onFrameChange?: (f: number) => void;
    animate?: boolean;
    cameraView?: "front" | "side" | "three-quarter" | "demo" | MotionAzimuth;
    /** Camera framing: "full" (whole figure) or "upper" (half-body — closer,
     *  chest-height target, same azimuth). View state only. */
    cameraFraming?: Framing;
    height?: string;
    opacity?: number;
    /** THE BASE'S LAYER VOCABULARY (primitive ② close-out): the same
     *  StageLayers every mesh stage votes, Pick'd to this stage's
     *  lanes (wireframe + skeleton). Replaces the old hand-rolled
     *  `wireframe`/`showSkeleton` boolean pair — one vocabulary, the
     *  base's. */
    layers?: Pick<StageLayers, "wireframe" | "skeleton">;
    color?: string;
    fps?: number;
    forceBindPose?: boolean;
    soma77Joints?: [number, number, number][][] | null;
    /** Pre-flattened soma77 joints as a Float32Array (T × 77 × 3). When
     *  provided, skips the nested→flat conversion in the flatten memo — avoids
     *  11,550 small array allocations + GC pressure per generation. */
    soma77JointsFlat?: Float32Array | null;
    editMode?: boolean;
    /** Editable joint positions for the current frame (77 × 3 Float32Array). */
    editableJoints?: Float32Array | null;
    selectedJoint?: number | null;
    onSelectJoint?: (idx: number | null, additive?: boolean) => void;
    onSelectChain?: (chain: number[] | null) => void;
    onJointMove?: (e: JointMoveEvent) => void;
    selectedChain?: number[] | null;
    /** "fk" = forward kinematics, "ik" = inverse kinematics (CCD). */
    kinematicMode?: "fk" | "ik";
    gizmoMode?: "rotate" | "translate";
    /** Override deformed vertices (used during edit mode re-skinning). */
    editedDeformedB64?: string | null;
    lightingOrbs?: LightingOrb[];
    onLightingOrbsChange?: (orbs: LightingOrb[]) => void;
    selectedOrb?: string | null;
    onSelectOrb?: (id: string | null) => void;
    ghostJoints?: Float32Array | null;
    cameraFov?: number;
    darkMode?: boolean;
    playbackSpeed?: number;
    /** Mesh identity: "soma" | "mhr" | "anny". Triggers a bind-mesh refetch. */
    identityModel?: string;
    /** Identity coefficients for body-shape morphing (MHR: 45 PCA, Anny: 11
     *  phenotype). When present, the viewer POSTs to /poser/skin/mesh for a
     *  shaped bind mesh instead of the default GET. */
    identityCoeffs?: number[] | null;
    /** Anny-only detail morphs: sparse {label: value} for the 139 local-change
     *  blendshapes. Included in the POST body so the bind mesh reflects them. */
    localChanges?: Record<string, number> | null;
    /** Anny-only community MakeHuman .target blends (e.g. anime_stylized_enhanced).
     *  Same role as localChanges — included in the POST so the bind mesh reflects
     *  the loaded character's full identity spec, not just the phenotype sliders. */
    customTargets?: Record<string, number> | null;
    footContacts?: number[][] | null;
    showFootContacts?: boolean;
    showStartingDirection?: boolean;
    altSamples?: {
        sample_idx: number;
        deformed_vertices_b64: string;
    }[];
    onCommitSample?: (idx: number) => void;
    root2dPoints?: {
        frame: number;
        x: number;
        z: number;
    }[];
    endEffectorPoints?: {
        id: string;
        frame: number;
        joint_name: string;
        position: [number, number, number];
    }[];
    showConstraintLabels?: boolean;
    selectedEEId?: string | null;
    onSelectEE?: (id: string | null) => void;
    onChangeEEPoint?: (id: string, position: [number, number, number]) => void;
    placingEE?: boolean;
    eePlaceJointIdx?: number;
    onPlaceEE?: (position: [number, number, number]) => void;
    referenceMesh?: ReferenceMeshSpec | null;
    refPlaybackFrameIdx?: number;
    editRefMode?: boolean;
    refEditableJoints?: Float32Array | null;
    onRefJointMove?: (e: JointMoveEvent) => void;
    /** When true, viewer pins the root joint at origin during playback so the
     *  character animates in place (running, walking) without translating
     *  across the floor. Viewer-side only — doesn't modify the data. */
    inPlace?: boolean;
    /** Custom bind mesh override (item d): a GLB the user loaded, used
     *  directly instead of fetching from /poser/skin/mesh. */
    customBindMesh?: SkinMeshData | null;
    /** Fired once the WebGL canvas exists (screenshot paths). */
    onCanvasReady?: (canvas: HTMLCanvasElement) => void;
    /** Parent-owned ctx ref (MotionExportDialog projects COCO-18 joints
     *  through this camera to draw 2D overlays on the canvas). */
    threeCtxRef?: React.MutableRefObject<{
        gl: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.Camera;
    } | null>;
}
declare function PoseViewer3DImpl({ deformedVerticesB64, deformedVertsDirect, frameIdx, onFrameChange, animate, cameraView, cameraFraming, height, opacity, layers, color, fps, forceBindPose, soma77Joints, soma77JointsFlat: soma77JointsFlatProp, editMode, editableJoints, selectedJoint, onSelectJoint, onSelectChain, onJointMove, selectedChain, kinematicMode, gizmoMode, editedDeformedB64, lightingOrbs, onLightingOrbsChange, selectedOrb, onSelectOrb, ghostJoints, cameraFov, darkMode, playbackSpeed, identityModel, identityCoeffs, localChanges, customTargets, footContacts, showFootContacts, showStartingDirection, altSamples, onCommitSample, root2dPoints, endEffectorPoints, showConstraintLabels, selectedEEId, onSelectEE, onChangeEEPoint, placingEE, eePlaceJointIdx, onPlaceEE, referenceMesh, refPlaybackFrameIdx, editRefMode, refEditableJoints, onRefJointMove, onCanvasReady, threeCtxRef, inPlace, customBindMesh, }: PoseViewer3DProps): React.JSX.Element;
export declare const PoseViewer3D: React.MemoExoticComponent<typeof PoseViewer3DImpl>;
