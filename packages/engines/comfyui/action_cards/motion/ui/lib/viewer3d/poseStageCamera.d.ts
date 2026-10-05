import type { CameraFraming } from "./poseStageTypes.js";
export declare function cameraPosFor(view: string): [number, number, number];
export declare function framedCameraPos(view: string, framing: CameraFraming): [[number, number, number], number];
