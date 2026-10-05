import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { type Stage3D } from "@melite/card-base/client";
import type { AltSampleDecoded, LightingOrb, SkinMeshData } from "./poseStageTypes.js";
export declare function createLightingOrbs(deps: {
    stage: Stage3D;
    scene: THREE.Scene;
}): {
    root: THREE.Group<THREE.Object3DEventMap>;
    entries: {
        id: string;
        group: THREE.Group;
        sphereMat: THREE.MeshBasicMaterial;
        light: THREE.PointLight;
        tc: TransformControls | null;
    }[];
    onChange: ((o: LightingOrb[]) => void) | undefined;
    onSelectOrb: ((id: string | null) => void) | undefined;
    orbs: LightingOrb[];
    selectedOrb: string | null;
    constructorDone: boolean;
    update(list: LightingOrb[], selectedOrb: string | null): void;
    handleOrbDrag(id: string): void;
};
export declare function createKeyframeGhost(liftGroup: THREE.Group): {
    lines: THREE.LineSegments | null;
    geo: THREE.BufferGeometry | null;
    update(joints: Float32Array | null): void;
};
export declare function createFootContacts(liftGroup: THREE.Group): {
    meshes: THREE.Mesh[];
    mats: THREE.MeshBasicMaterial[];
    ensure(): void;
    update(footContacts: number[][] | null, frameIdx: number, jointsFlat: Float32Array | null): void;
};
export declare function createDirectionArrow(liftGroup: THREE.Group): {
    group: THREE.Group | null;
    update(jointsFlat: Float32Array | null): void;
    setVisible(v: boolean): void;
};
export declare function createAltSamples(): {
    root: THREE.Group<THREE.Object3DEventMap>;
    samples: AltSampleDecoded[];
    faces: number[][];
    onCommit: (_i: number) => void;
    update(samples: AltSampleDecoded[], meshData: SkinMeshData | null, onCommit: (i: number) => void): void;
};
export declare function createConstraintOverlays(deps: {
    stage: Stage3D;
    scene: THREE.Scene;
}): {
    root: THREE.Group<THREE.Object3DEventMap>;
    eeTC: TransformControls | null;
    eeGroups: THREE.Group[];
    eeMats: THREE.MeshBasicMaterial[];
    eeIds: string[];
    points: {
        id: string;
        frame: number;
        joint_name: string;
        position: [number, number, number];
    }[];
    editMode: boolean;
    selectedEEId: string | null;
    showLabels: boolean;
    onSelectEE: ((id: string | null) => void) | undefined;
    onChangeEEPoint: ((id: string, p: [number, number, number]) => void) | undefined;
    eeColor: Record<string, string>;
    update(root2dPoints: {
        frame: number;
        x: number;
        z: number;
    }[], endEffectorPoints: {
        id: string;
        frame: number;
        joint_name: string;
        position: [number, number, number];
    }[], showLabels: boolean, editMode: boolean, selectedEEId: string | null): void;
    handleEEDrag(id: string): void;
};
export declare function createEEPlacementPlane(liftGroup: THREE.Group): {
    mesh: THREE.Mesh | null;
    setVisible(v: boolean): void;
    update(placingEE: boolean, eePlaceJointIdx: number, editableJoints: Float32Array | null, jointsFlat: Float32Array | null, frameIdx: number, onPlaceEE: (p: [number, number, number]) => void): void;
};
