import * as THREE from '@melite/three-client/client';
import type { PoseStageProps, SkinMeshData } from "./poseStageTypes.js";
export declare function createSkinCarrier(liftGroup: THREE.Group): {
    mesh: THREE.Mesh | null;
    geo: THREE.BufferGeometry | null;
    mat: THREE.MeshStandardMaterial | null;
    scratch: Float32Array<ArrayBuffer>;
    lastUploadedIdx: number;
    meshData: SkinMeshData | null;
    deformedFlat: Float32Array | null;
    numVerts: number;
    lastAnimate: boolean;
    setMesh(p: PoseStageProps): void;
    setData(deformedFlat: Float32Array | null): void;
    uploadFrame(idx: number, showBindPose: boolean, animate: boolean): void;
};
export declare function createAnimClock(frameIdxRef: {
    current: number;
}): {
    time: number;
    uiAccum: number;
    lastSyncedIdx: number;
    animate: boolean;
    enabled: boolean;
    frameCount: number;
    fps: number;
    speed: number;
    setFrameIdx: (_f: number) => void;
    reset(): void;
    tick(delta: number): void;
};
export declare function createSkeletonOverlay(liftGroup: THREE.Group): {
    spheres: THREE.InstancedMesh | null;
    lines: THREE.LineSegments | null;
    boneGeo: THREE.BufferGeometry | null;
    dummy: THREE.Object3D<THREE.Object3DEventMap>;
    ensure(): void;
    update(jointsFlat: Float32Array | null, frameIdx: number): void;
};
