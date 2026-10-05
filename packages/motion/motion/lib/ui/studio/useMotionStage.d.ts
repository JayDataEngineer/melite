import type * as React from "react";
import type { MotionNpz } from "@melite/formats";
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline";
import type { MotionConstraint } from "@melite/formats/motionConstraints";
import type { StageRect } from "./MotionExportDialog.js";
export type ToastFn = (type: "error" | "success" | "info", message: string) => void;
export interface MotionStageArgs {
    effectiveNpz: MotionNpz | null;
    keptEdit: {
        joints: Float32Array;
        frame: number;
    } | null;
    editableJoints: Float32Array | null;
    frameIdx: number;
    fullbodyKfAtFrame: TimelineKeyframe | null;
    toast: ToastFn;
    pushUndo: () => void;
    setKeptEdit: React.Dispatch<React.SetStateAction<{
        joints: Float32Array;
        frame: number;
    } | null>>;
    setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>;
    setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>;
    setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>;
    exportOpen: boolean;
    stageRect: StageRect;
    setStageRect: React.Dispatch<React.SetStateAction<StageRect>>;
}
export declare function useMotionStage({ effectiveNpz, keptEdit, editableJoints, frameIdx, fullbodyKfAtFrame, toast, pushUndo, setKeptEdit, setEditedDeformedB64, setConstraintPayloads, setTlKeyframes, exportOpen, stageRect, setStageRect, }: MotionStageArgs): {
    jointsFlatCm: Float32Array<ArrayBuffer> | null;
    discardKeptEdit: () => void;
    stampConstraintAtFrame: () => void;
    exportOut: {
        w: number;
        h: number;
    };
    handleOutSize: (w: number, h: number) => void;
    handleFramePreset: (kind: "reset" | "whole") => void;
    stageBoxRef: React.RefObject<HTMLDivElement | null>;
    beginRectDrag: (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => void;
    onRectPointerMove: (e: React.PointerEvent) => void;
    endRectDrag: () => void;
};
//# sourceMappingURL=useMotionStage.d.ts.map
