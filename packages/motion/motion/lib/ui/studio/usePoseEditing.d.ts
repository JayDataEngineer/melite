import type * as React from "react";
import type { MotionNpz } from "@melite/formats";
import type { SomaSkin } from "@melite/formats";
import type { JointMoveEvent } from "@melite-plugin/motion/ui/viewer3d";
import type { TimelineKeyframe } from "@melite-plugin/timeline/ui/timeline";
import { type MotionConstraint } from "@melite/formats/motionConstraints";
import type { ToastFn } from "./useMotionStage.js";
export interface PoseEditingArgs {
    effectiveNpz: MotionNpz | null;
    frameIdx: number;
    tlKeyframes: TimelineKeyframe[];
    constraintPayloads: Record<string, MotionConstraint>;
    keptEdit: {
        joints: Float32Array;
        frame: number;
    } | null;
    currentJointsM: Float32Array | null;
    fullbodyKfAtFrame: TimelineKeyframe | null;
    pushUndo: () => void;
    toast: ToastFn;
    skin: SomaSkin | null;
    onSave: (params: Record<string, unknown>) => void;
    editMode: boolean;
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    editableJoints: Float32Array | null;
    setEditableJoints: React.Dispatch<React.SetStateAction<Float32Array | null>>;
    editableJointsRef: React.MutableRefObject<Float32Array | null>;
    setSelectedJoint: React.Dispatch<React.SetStateAction<number | null>>;
    setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>;
    reposing: boolean;
    setReposing: React.Dispatch<React.SetStateAction<boolean>>;
    setKeptEdit: React.Dispatch<React.SetStateAction<{
        joints: Float32Array;
        frame: number;
    } | null>>;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>;
}
export declare function usePoseEditing({ effectiveNpz, frameIdx, tlKeyframes: _tlKeyframes, constraintPayloads, keptEdit, currentJointsM, fullbodyKfAtFrame, pushUndo, toast, skin, onSave, editMode, setEditMode, editableJoints, setEditableJoints, editableJointsRef, setSelectedJoint, setEditedDeformedB64, reposing: _reposing, setReposing, setKeptEdit, setPlaying, setConstraintPayloads, }: PoseEditingArgs): {
    toggleEdit: () => void;
    handleJointMove: (e: JointMoveEvent) => void;
    displayJointsM: Float32Array<ArrayBufferLike> | null;
    handleRepose: () => Promise<void>;
};
//# sourceMappingURL=usePoseEditing.d.ts.map
