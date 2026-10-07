import * as THREE from '@melite/three-client/client';
import type { SkinMeshData } from "./poseStageTypes.js";
/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
export declare function computeMeshLiftY(meshData: SkinMeshData): number;
export declare function buildGeometry(meshData: SkinMeshData): THREE.BufferGeometry;
export { fetchBindMesh } from "@melite/formats/poserSkin";
