import type * as React from "react";
import type { MotionNpz } from "@melite/formats";
import { type TimelineKeyframe, type TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
import { type MotionConstraint } from "@melite/formats/motionConstraints";
import type { ToastFn } from "./useMotionStage.js";
export interface TimelineAuthoringArgs {
    effectiveNpz: MotionNpz | null;
    toast: ToastFn;
    pushUndo: () => void;
    maybePushDragUndo: (key: string) => void;
    promptsAuthoredRef: React.MutableRefObject<boolean>;
    targetT: number;
    setFrameIdx: React.Dispatch<React.SetStateAction<number>>;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>;
    setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>;
    setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>;
}
export declare function useTimelineAuthoring({ effectiveNpz, toast, pushUndo, maybePushDragUndo, promptsAuthoredRef, targetT, setFrameIdx, setPlaying, setConstraintPayloads, setTlKeyframes, setTlPrompts, }: TimelineAuthoringArgs): {
    handleTimelineFrameChange: (f: number) => void;
    onKeyframeAdd: (trackId: string, frame: number) => string;
    onKeyframeMove: (id: string, frame: number) => void;
    onKeyframeDelete: (id: string) => void;
    onPromptUpdate: (id: string, text: string) => void;
    onPromptResize: (id: string, startFrame: number, endFrame: number) => void;
    onPromptMove: (id: string, startFrame: number, endFrame: number) => void;
    onPromptDelete: (id: string) => void;
    addPromptCard: () => void;
};
//# sourceMappingURL=useTimelineAuthoring.d.ts.map
