import type * as React from "react";
import type { TimelineTrack } from "./viser-timeline/types.js";
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar.js";
import { type CommissionRow } from "./CommissionsRail.js";
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
    /** (SD-8 lane parity, 2026-11-08) the kf heads ride the audio
     *  heads' card height (44) when the tenant opts in — the
     *  audioClipCards precedent; absent → the 24px block, byte-identical. */
    kfLaneCards?: boolean;
    /** (§9's mod projection) the commission heads — one per armed mod
     *  bag, mirroring the body rows the bar renders under the prompts
     *  lane. Opt-in; absent/empty → no head, byte-identical. */
    commissions?: CommissionRow[];
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
    barBg: string;
    frameToPx: (f: number) => number;
    frameAt: (clientX: number) => number | null;
    onPromptAdd?: (frame: number) => void;
}
/** The ruler: ticks only. NOT a scrub surface and NOT a seek surface
 *  (operator, told 10+ times, 2026-10-29: the playhead moves ONLY by
 *  dragging the CAP — the white circle at the top of the line — never
 *  a click anywhere on the timeline): the P6 single-click seek and
 *  its click-voice chip are DEAD, and the sticky timecode chip is
 *  DEAD with them (it read the bar's fps axis, which can mismatch
 *  the film's own rate — a readout that can lie is removed, not
 *  patched). The ruler's one gesture is the double-click ADD. */
export declare function TimelineRuler(props: TimelineRulerProps): React.JSX.Element;
export interface TimelinePlayheadProps {
    frameIdx: number;
    frameToPx: (f: number) => number;
    playhead: string;
    onGrab: (e: React.PointerEvent) => void;
}
/** The playhead, spanning every row (bar line 1517). The cap at its
 *  top is THE scrub handle (operator 2026-11: the gesture lives on
 *  the white circle, never the bar's middle) — the line itself
 *  SWALLOWS its pixels (E2-10: pointer-dead is pass-through, and the
 *  pass-through woke every seat beneath — the ruler's seek over the
 *  ruler band, clip drags over clips, click-away deselect over empty
 *  track. The line intercepts and eats the gesture: no session, no
 *  seek, no select. The cap is carved out — a press bubbling from the
 *  cap still opens the scrub). */
export declare function TimelinePlayhead(props: TimelinePlayheadProps): React.JSX.Element;
//# sourceMappingURL=MotionTimelineBarChrome.d.ts.map
