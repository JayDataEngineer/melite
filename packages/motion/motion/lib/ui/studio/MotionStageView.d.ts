/** MotionStageView — the live stage (StudioShell `preview`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * The viewport frame (drops, bg, mannequin/viewer, veils, camera pill,
 * export-frame rectangle) + the in-flow export panel sibling.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react";
import type { CardStage } from "@melite/contracts";
import type { MotionAzimuth, MotionNpz } from "@melite/formats";
import type { SomaSkin } from "@melite/formats";
import { type CameraFraming } from "@melite-plugin/motion/ui/viewer3d";
import type { JointMoveEvent } from "@melite-plugin/motion/ui/viewer3d";
import { type StageRect, type ThreeCtx } from "./MotionExportDialog.js";
export interface MotionStageViewProps {
    stageBoxRef: React.RefObject<HTMLDivElement | null>;
    bgDragOver: boolean;
    setBgDragOver: React.Dispatch<React.SetStateAction<boolean>>;
    handleStageDrop: (e: React.DragEvent) => void;
    bgImage: string | null;
    skin: SomaSkin | null;
    allVertsM: Float32Array | null;
    restB64: string | null;
    editedDeformedB64: string | null;
    frameIdx: number;
    setFrameIdx: React.Dispatch<React.SetStateAction<number>>;
    npz: MotionNpz | null;
    playing: boolean;
    editMode: boolean;
    cameraView: MotionAzimuth;
    framing: CameraFraming;
    jointsFlatCm: Float32Array | null;
    showSkeleton: boolean;
    effectiveNpz: MotionNpz | null;
    customBindMesh: {
        vertices: number[][];
        faces: number[][];
    } | null;
    inPlace: boolean;
    threeCtxRef: React.MutableRefObject<ThreeCtx | null>;
    editableJoints: Float32Array | null;
    selectedJoint: number | null;
    setSelectedJoint: React.Dispatch<React.SetStateAction<number | null>>;
    handleJointMove: (e: JointMoveEvent) => void;
    loading: boolean;
    error: string | null;
    setCameraView: React.Dispatch<React.SetStateAction<MotionAzimuth>>;
    setFraming: React.Dispatch<React.SetStateAction<CameraFraming>>;
    exportOpen: boolean;
    stageRect: StageRect;
    beginRectDrag: (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => void;
    onRectPointerMove: (e: React.PointerEvent) => void;
    endRectDrag: () => void;
    setExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
    npzUrl: string | null;
    stage: CardStage;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    displayJointsM: Float32Array | null;
    liftY: number;
    setStageRect: React.Dispatch<React.SetStateAction<StageRect>>;
    exportOut: {
        w: number;
        h: number;
    };
    handleOutSize: (w: number, h: number) => void;
    handleFramePreset: (kind: "reset" | "whole") => void;
}
export declare function MotionStageView({ stageBoxRef, bgDragOver, setBgDragOver, handleStageDrop, bgImage, skin, allVertsM, restB64, editedDeformedB64, frameIdx, setFrameIdx, npz, playing, editMode, cameraView, framing, jointsFlatCm, showSkeleton, effectiveNpz, customBindMesh, inPlace, threeCtxRef, editableJoints, selectedJoint, setSelectedJoint, handleJointMove, loading, error, setCameraView, setFraming, exportOpen, stageRect, beginRectDrag, onRectPointerMove, endRectDrag, setExportOpen, npzUrl, stage, setPlaying, displayJointsM, liftY, setStageRect, exportOut, handleOutSize, handleFramePreset, }: MotionStageViewProps): React.JSX.Element;
//# sourceMappingURL=MotionStageView.d.ts.map
