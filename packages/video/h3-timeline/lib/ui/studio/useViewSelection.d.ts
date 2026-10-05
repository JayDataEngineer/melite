import type { DocCall, LayerA } from "./docModel.js";
/** Selection shared with the bar clips (tenant §2). Verbatim lines 1561–1590. */
export interface TimelineSelection {
    callIdx: number;
    beatIdx?: number;
}
export declare function useViewSelection(calls: DocCall[], layerA: LayerA): {
    frameIdx: number;
    setFrameIdx: import("react").Dispatch<import("react").SetStateAction<number>>;
    selected: {
        callIdx: number;
        beatIdx?: number;
    } | null;
    setSelected: import("react").Dispatch<import("react").SetStateAction<{
        callIdx: number;
        beatIdx?: number;
    } | null>>;
    callCardRefs: import("react").RefObject<(HTMLDivElement | null)[]>;
    beatRowRefs: import("react").RefObject<(HTMLDivElement | null)[][]>;
    handleTimelineSelect: (id: string | null) => void;
    fps: number;
    totalFrames: number;
};
//# sourceMappingURL=useViewSelection.d.ts.map
