import * as THREE from '@melite/three-client/client';
import { type MotionAzimuth, type MotionNpz } from "@melite/formats";
export type ThreeCtx = {
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
};
interface MotionExportDialogProps {
    open: boolean;
    onClose: () => void;
    npz: MotionNpz;
    /** The raw motion NPZ asset URL (for the plain-NPZ download). NULL before
     *  any run — the rest pose exports fine without it; only the Downloads
     *  scope needs it (disabled when null). */
    npzUrl: string | null;
    /** Auto-baked GLB preview URL (stage.result.motionPreviews) or null. */
    glbUrl: string | null;
    frameIdx: number;
    /** Called when the user scrubs the frame slider inside the dialog. The
     *  parent updates its frameIdx → PoseViewer3D shows the new pose → the
     *  export captures that frame. */
    onFrameChange?: (frame: number) => void;
    /** The card's current azimuth — UNUSED by the export since round 2 (the
     *  single view renders the user's LIVE camera; the batch walks the ring
     *  itself). Optional so new callers can omit it; MCE still passes it. */
    cameraView?: MotionAzimuth;
    /** (77, 3) METERS — the joints currently displayed (edited or raw frame). */
    displayJointsM: Float32Array;
    /** The viewer's mesh lift (meters) — part of the group transform. */
    liftY: number;
    /** Root-pin toggle state — the viewer's group transform mirrors it. */
    inPlace: boolean;
    threeCtxRef: React.MutableRefObject<ThreeCtx | null>;
    /** The stage rectangle — MotionCardEditor renders the draggable overlay
     *  (body = move, four corners = resize); the dialog crops the screenshot
     *  to it. Its PIXEL aspect is locked to outW:outH (the parent refits). */
    stageRect: StageRect;
    onStageRectChange?: (r: StageRect) => void;
    /** The OUTPUT SIZE, in PIXELS — the typed truth ("height and width should
     *  always be pixels"). The export renders at exactly outW × outH; the
     *  stage rect carries the same aspect and can be ANY size on screen (the
     *  framing tool, not the resolution — a small 3:4 rect still exports
     *  768 × 1024). */
    outW: number;
    outH: number;
    /** Typed-size write channel → the parent refits the rect's aspect. */
    onOutSize?: (w: number, h: number) => void;
    /** Reset / Whole-stage frame presets (the parent owns the aspect lock). */
    onFramePreset?: (kind: "reset" | "whole") => void;
}
/** Normalized FREE-ASPECT rectangle over the live stage — owned by
 *  MotionCardEditor (it renders the overlay + drag handles); the dialog
 *  reads it and crops the screenshot to it. */
export type StageRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export declare const DEFAULT_STAGE_RECT: StageRect;
export declare function MotionExportDialog({ open, onClose, npz, npzUrl, glbUrl, frameIdx, onFrameChange, displayJointsM, liftY, inPlace, threeCtxRef, stageRect, onStageRectChange, outW, outH, onOutSize, onFramePreset }: MotionExportDialogProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=MotionExportDialog.d.ts.map
