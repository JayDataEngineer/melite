import type * as React from "react";
import type { MotionNpz } from "@melite/formats";
import type { TimelineInterval, TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
import { type MotionConstraint } from "@melite/formats/motionConstraints";
import type { CardStage } from "@melite/contracts";
import type { ToastFn } from "./useMotionStage.js";
export interface TimelineEnvelopeArgs {
    stage: CardStage;
    effectiveNpz: MotionNpz | null;
    onSave: (params: Record<string, unknown>) => void;
    toast: ToastFn;
    promptsAuthoredRef: React.MutableRefObject<boolean>;
    tlPrompts: TimelinePrompt[];
    setTlPrompts: React.Dispatch<React.SetStateAction<TimelinePrompt[]>>;
    tlKeyframes: TimelineKeyframe[];
    setTlKeyframes: React.Dispatch<React.SetStateAction<TimelineKeyframe[]>>;
    constraintPayloads: Record<string, MotionConstraint>;
    setConstraintPayloads: React.Dispatch<React.SetStateAction<Record<string, MotionConstraint>>>;
    setTlIntervals: React.Dispatch<React.SetStateAction<TimelineInterval[]>>;
}
export declare function useTimelineEnvelope({ stage, effectiveNpz, onSave, toast, promptsAuthoredRef, tlPrompts, setTlPrompts, tlKeyframes, setTlKeyframes, constraintPayloads, setConstraintPayloads, setTlIntervals, }: TimelineEnvelopeArgs): {
    baseT: number;
    targetT: number;
    onTimelineExtend: (newTotal: number) => void;
};
//# sourceMappingURL=useTimelineEnvelope.d.ts.map
