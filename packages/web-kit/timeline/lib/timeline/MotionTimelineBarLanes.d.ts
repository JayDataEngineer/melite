import type * as React from "react";
import type { TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./viser-timeline/types.js";
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar.js";
import type { Drag } from "./MotionTimelineBarDrag.js";
export interface TimelinePromptsLaneProps {
    prompts: TimelinePrompt[];
    fps: number;
    promptsHeight: number;
    emptyPromptsHint: string;
    onPromptAdd?: (frame: number) => void;
    dragId: string | null;
    lastPromptRef: React.RefObject<string | null>;
    firstPromptRef: React.RefObject<string | null>;
    selectedId: string | null;
    previews?: Record<string, string>;
    frameToPx: (f: number) => number;
    frameAt: (clientX: number) => number | null;
    startDrag: (e: React.PointerEvent, d: Drag) => void;
    playhead: string;
    onPromptUpdate: (id: string, text: string) => void;
    onPromptDelete: (id: string) => void;
}
/** Draggable/resizable prompt clips (bar line 994). */
export declare function TimelinePromptsLane(props: TimelinePromptsLaneProps): React.JSX.Element;
export interface TimelineBeatsLaneProps {
    beats: TimelineBeat[] | undefined;
    beatsHeight: number;
    beatsHint: string;
    fps: number;
    selectedId: string | null;
    onSelect?: (id: string | null) => void;
    onBeatAdd?: (frame: number) => void;
    xToFrame: (clientX: number) => number | null;
    frameToPx: (f: number) => number;
}
/** Layer C prompt beats within the calls (bar line 1261). */
export declare function TimelineBeatsLane(props: TimelineBeatsLaneProps): React.JSX.Element | null;
export interface TimelineAudioLanesProps {
    audioLayers?: AudioLayer[];
    prompts: TimelinePrompt[];
    fps: number;
    /** (2026-09-22, the D-M-E card law) clips as SMALL CALL CARDS —
     * gradient + accent edge + glyph, 44px lanes. Absent → blocks. */
    audioClipCards?: boolean;
    frameToPx: (f: number) => number;
    xToFrame: (clientX: number) => number | null;
    startDrag: (e: React.PointerEvent, d: Drag) => void;
    onAudioDrop?: (layerId: string, url: string) => void;
    onAudioDropAt?: (layerId: string, url: string, frame: number) => void;
    onAudioFileDrop?: (layerId: string, file: File, frame: number) => void;
    onAudioClipMove?: (layerId: string, clipId: string, frame: number) => void;
    onAudioClipDelete?: (layerId: string, clipId: string) => void;
    /** (the submenu law, 2026-11-06) A click on the LANE ROW itself —
     *  not on a clip, not a drag — opens the tenant's audio submenu
     *  (the bar is the navigation surface). Opt-in, absent → no click
     *  face, byte-identical rows. */
    onAudioLaneActivate?: (layerId: string) => void;
}
/** Native audio tracks, same scroll + scale (bar line 1316). */
export declare function TimelineAudioLanes(props: TimelineAudioLanesProps): React.JSX.Element;
export interface TimelineKeyframeLanesProps {
    tracks: TimelineTrack[];
    keyframes: TimelineKeyframe[];
    laneHint: string;
    dragId: string | null;
    frameToPx: (f: number) => number;
    xToFrame: (clientX: number) => number | null;
    startDrag: (e: React.PointerEvent, d: Drag) => void;
    onKeyframeAdd: (trackId: string, frame: number) => string;
    onKeyframeDelete: (id: string) => void;
}
/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
export declare function TimelineKeyframeLanes(props: TimelineKeyframeLanesProps): React.JSX.Element;
//# sourceMappingURL=MotionTimelineBarLanes.d.ts.map
