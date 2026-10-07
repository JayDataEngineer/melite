import * as THREE from '@melite/three-client/client';
import type { ReferenceManipHandle } from "./poseStageManipulators.js";
import type { PoseStageProps, ReferenceBundle } from "./poseStageTypes.js";
export declare function createReferenceCarrier(deps: {
    liftGroup: THREE.Group;
    refManip: ReferenceManipHandle;
}): {
    root: THREE.Group | null;
    mesh: THREE.Mesh | null;
    geo: THREE.BufferGeometry | null;
    mat: THREE.MeshStandardMaterial | null;
    skeleton: {
        spheres: THREE.InstancedMesh;
        lines: THREE.LineSegments;
        boneGeo: THREE.BufferGeometry;
        dummy: THREE.Object3D;
    } | null;
    scratch: Float32Array<ArrayBuffer>;
    lastUploaded: number;
    bundle: ReferenceBundle | null;
    lastSig: string;
    update(p: PoseStageProps): void;
    disposeMesh(): void;
};
