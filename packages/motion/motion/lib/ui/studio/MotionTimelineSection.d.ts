/** MotionTimelineSection — the bottom timeline (StudioShell `bottom`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * Transport header + MotionTimelineBar + edit hint + wire picker modal.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react";
import type { CardStage } from "@melite/contracts";
import type { MotionNpz } from "@melite/formats";
import { type TimelineKeyframe, type TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
export interface MotionTimelineSectionProps {
    npz: MotionNpz | null;
    editMode: boolean;
    playing: boolean;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    fmt: (s: number) => string;
    curSec: number;
    totalSec: number;
    tlPrompts: TimelinePrompt[];
    targetT: number;
    addPromptCard: () => void;
    tlKeyframes: TimelineKeyframe[];
    frameIdx: number;
    effectiveNpz: MotionNpz | null;
    onTimelineExtend: (newTotal: number) => void;
    handleTimelineFrameChange: (f: number) => void;
    onKeyframeAdd: (trackId: string, frame: number) => string;
    onKeyframeMove: (id: string, frame: number) => void;
    onKeyframeDelete: (id: string) => void;
    onPromptUpdate: (id: string, text: string) => void;
    onPromptMove: (id: string, startFrame: number, endFrame: number) => void;
    onPromptResize: (id: string, startFrame: number, endFrame: number) => void;
    onPromptDelete: (id: string) => void;
    bodyWireOpen: boolean;
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    priorStages: CardStage[];
    bodyWired: boolean;
    bodyWiredId: string;
    onSave: (params: Record<string, unknown>) => void;
    setBodyGlbState: React.Dispatch<React.SetStateAction<string | null>>;
    setBodyNotice: React.Dispatch<React.SetStateAction<string | null>>;
    setBodyWireOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export declare function MotionTimelineSection({ npz, editMode, playing, setPlaying, fmt, curSec, totalSec, tlPrompts, targetT, addPromptCard, tlKeyframes, frameIdx, effectiveNpz, onTimelineExtend, handleTimelineFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, bodyWireOpen, onWireSlot, priorStages, bodyWired, bodyWiredId, onSave, setBodyGlbState, setBodyNotice, setBodyWireOpen, }: MotionTimelineSectionProps): React.JSX.Element;
//# sourceMappingURL=MotionTimelineSection.d.ts.map
