import type { TimelineInterval, TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
import type { MotionConstraint } from "@melite/formats/motionConstraints";
export type AuthoringSnapshot = {
    tlPrompts: TimelinePrompt[];
    tlKeyframes: TimelineKeyframe[];
    constraintPayloads: Record<string, MotionConstraint>;
    tlIntervals: TimelineInterval[];
    editableJoints: Float32Array | null;
    keptEdit: {
        joints: Float32Array;
        frame: number;
    } | null;
    editedDeformedB64: string | null;
};
export interface MotionUndoStackArgs {
    tlPrompts: TimelinePrompt[];
    tlKeyframes: TimelineKeyframe[];
    constraintPayloads: Record<string, MotionConstraint>;
    tlIntervals: TimelineInterval[];
    keptEdit: {
        joints: Float32Array;
        frame: number;
    } | null;
    editedDeformedB64: string | null;
    editableJointsRef: React.MutableRefObject<Float32Array | null>;
    promptsAuthoredRef: React.MutableRefObject<boolean>;
    setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>;
    setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>;
    setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>;
    setTlIntervals: React.Dispatch<React.SetStateAction<TimelineInterval[]>>;
    setEditableJoints: React.Dispatch<React.SetStateAction<Float32Array | null>>;
    setKeptEdit: React.Dispatch<React.SetStateAction<{
        joints: Float32Array;
        frame: number;
    } | null>>;
    setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>;
}
export declare function useMotionUndoStack({ tlPrompts, tlKeyframes, constraintPayloads, tlIntervals, keptEdit, editedDeformedB64, editableJointsRef, promptsAuthoredRef, setTlPrompts, setTlKeyframes, setConstraintPayloads, setTlIntervals, setEditableJoints, setKeptEdit, setEditedDeformedB64, }: MotionUndoStackArgs): {
    pushUndo: () => void;
    handleUndo: () => void;
    handleRedo: () => void;
    maybePushDragUndo: (key: string) => void;
    captureSnapshot: () => AuthoringSnapshot;
    restoreSnapshot: (snap: AuthoringSnapshot) => void;
    undoVersion: number;
};
//# sourceMappingURL=useMotionUndoStack.d.ts.map
