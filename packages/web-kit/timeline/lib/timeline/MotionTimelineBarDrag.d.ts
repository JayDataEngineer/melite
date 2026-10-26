import type * as React from "react";
import type { AudioLayer } from "./MotionTimelineBar.tsx";
import type { TimelinePrompt } from "./viser-timeline/types.ts";
/** One in-flight pointer drag. `moved` distinguishes a click (select/
 * seek on pointerup) from a real drag. */
export type Drag = ({
    kind: "scrub";
    startX: number;
    moved: boolean;
} | {
    kind: "prompt-move" | "prompt-l" | "prompt-r";
    id: string;
    startX: number;
    startF: number;
    endF: number;
    moved: boolean;
} | {
    kind: "kf";
    id: string;
    startX: number;
    frame: number;
    moved: boolean;
} | {
    /** (Layer A NLE law) a Music-row clip body drag: translate the
     *  clip, duration constant, bounded by its clip neighbors. */
    kind: "audio-clip";
    layerId: string;
    id: string;
    startX: number;
    startF: number;
    durF: number;
    moved: boolean;
}) & {
    /** Total frames at gesture start — stamped by startDrag so the
     * extend-release pin test (audit F4b) can see doc growth. */
    t1AtStart?: number;
};
export interface TimelineDragSessionOpts {
    T1: number;
    effPpf: number;
    ppf: number | null;
    dragScale: number | null;
    setPpf: (v: number) => void;
    setBasePpf: (v: number) => void;
    setDragScale: (v: number | null) => void;
    prompts: TimelinePrompt[];
    audioLayers?: AudioLayer[];
    packed: boolean;
    xToFrame: (clientX: number) => number | null;
    keepTailVisible: (endFrame: number) => void;
    onFrameChange: (frame: number) => void;
    onScrubStart?: () => void;
    onScrubEnd?: () => void;
    onSelect?: (id: string | null) => void;
    onKeyframeMove: (id: string, frame: number) => void;
    onPromptMove: (id: string, startFrame: number, endFrame: number) => void;
    onPromptResize: (id: string, startFrame: number, endFrame: number) => void;
    onExtend: (newTotal: number) => void;
    onAudioClipMove?: (layerId: string, clipId: string, frame: number) => void;
}
/** The bar's pointer-session state + gesture entry points (bar line 369). */
export declare function useTimelineDragSession(opts: TimelineDragSessionOpts): {
    dragId: string | null;
    dragRef: React.RefObject<Drag | null>;
    suppressClickRef: React.RefObject<boolean>;
    lastPromptRef: React.RefObject<string | null>;
    firstPromptRef: React.RefObject<string | null>;
    promptsRef: React.RefObject<TimelinePrompt[]>;
    startDrag: (e: React.PointerEvent, d: Drag) => void;
    grabPlayhead: (e: React.PointerEvent) => void;
};
//# sourceMappingURL=MotionTimelineBarDrag.d.ts.map