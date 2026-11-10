import type { RefObject } from "react";
/** Ruler ticks over the content (bar line 790): seconds coverage of
 *  the frames — BOUNDED AT THE AXIS END (D-19, the v2v lane-mirror
 *  audit 2026-11-18): the lead-out stays scrollable/droppable room,
 *  but its tick labels used to run to the content width, so a short
 *  axis under heavy lead-out read as a longer film — the ruler
 *  impersonated duration the film does not have. */
export declare function buildTicks(contentW: number, effPpf: number, totalFrames: number, fps: number): {
    ticks: number[];
    stepSec: number;
};
export interface TimelineScaleOpts {
    scrollRef: RefObject<HTMLDivElement | null>;
    frameIdx: number;
    totalFrames: number;
    fps: number;
    initialSeconds?: number;
}
/** The bar's zoom/scroll state + converters (bar line 400). */
export declare function useTimelineScale(opts: TimelineScaleOpts): {
    boxW: number;
    ppf: number | null;
    setPpf: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    basePpf: number | null;
    setBasePpf: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    dragScale: number | null;
    setDragScale: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    anchorRef: RefObject<{
        frame: number;
        off: number;
    } | null>;
    T1: number;
    fitPpf: number;
    effPpf: number;
    contentW: number;
    frameToPx: (f: number) => number;
    frameAt: (clientX: number) => number | null;
    xToFrame: (clientX: number) => number | null;
    zoom: (factor: number) => void;
    keepTailVisible: (endFrame: number) => void;
};
//# sourceMappingURL=MotionTimelineBarScale.d.ts.map
