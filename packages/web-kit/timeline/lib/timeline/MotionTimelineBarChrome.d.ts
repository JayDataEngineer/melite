import type * as React from "react";
import type { TimelineTrack } from "./viser-timeline/types.js";
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar.js";
export interface TimelineGutterScale {
    zoom: (factor: number) => void;
    anchorRef: React.MutableRefObject<{
        frame: number;
        off: number;
    } | null>;
    frameToPx: (f: number) => number;
    setPpf: (v: number) => void;
    setBasePpf: (v: number) => void;
    fitPpf: number;
    effPpf: number;
    basePpf: number | null;
}
export interface TimelineGutterProps {
    scale: TimelineGutterScale;
    scrollRef: React.MutableRefObject<HTMLDivElement | null>;
    frameIdx: number;
    promptsHeight: number;
    promptsLabel: string;
    beats?: TimelineBeat[];
    beatsLabel: string;
    beatsHeight: number;
    audioLayers?: AudioLayer[];
    onAudioDetach?: (layerId: string) => void;
    /** (2026-11-06, the lane-add parity law) the track rows' add door:
     *  when the host wires it, every track row carries the SAME upload
     *  verb the audio heads do (anchored at THIS button — the host
     *  opens its source picker); unwired renders no button. The
     *  keyframes lane is a first-class lane: its head owns the door
     *  exactly like Dialogue/Music/SFX. */
    onTrackAdd?: (trackUuid: string, anchor: HTMLButtonElement) => void;
    /** (2026-09-22, the D-M-E card law) cards-mode heads match the lanes. */
    audioClipCards?: boolean;
    tracks: TimelineTrack[];
}
/** The pinned label gutter (bar line 820): the zoom cluster + lane
 *  heads. The Fit pin reads the live scale — the body is the bar's. */
export declare function TimelineGutter(props: TimelineGutterProps): React.JSX.Element;
export interface TimelineContentProps {
    scrollRef: React.MutableRefObject<HTMLDivElement | null>;
    contentW: number;
    suppressClickRef: React.MutableRefObject<boolean>;
    onSelect?: (id: string | null) => void;
    children: React.ReactNode;
}
/** The scrollable shell + click-away deselect (bar line 921). */
export declare function TimelineContent(props: TimelineContentProps): React.JSX.Element;
export interface TimelineRulerProps {
    ticks: number[];
    stepSec: number;
    fps: number;
    frameIdx: number;
    barBg: string;
    frameToPx: (f: number) => number;
    frameAt: (clientX: number) => number | null;
    seek: (e: React.PointerEvent) => void;
    onPromptAdd?: (frame: number) => void;
}
/** The ruler: scrub surface, ticks, sticky timecode (bar line 947). */
export declare function TimelineRuler(props: TimelineRulerProps): React.JSX.Element;
export interface TimelinePlayheadProps {
    frameIdx: number;
    frameToPx: (f: number) => number;
    playhead: string;
}
/** The playhead, spanning every row (bar line 1517). */
export declare function TimelinePlayhead(props: TimelinePlayheadProps): React.JSX.Element;
//# sourceMappingURL=MotionTimelineBarChrome.d.ts.map
