import type { Dispatch, SetStateAction } from "react";
import type { DocCall, DocKeyframe, LayerA } from "./docModel.js";
import type { TimelineSelection } from "./useViewSelection.js";
/** Playhead clamp, selection scroll/stale-guard, persist effects + the Layer A
 *  setter (tenant §4). Verbatim lines 1671–1729. */
export declare function useDocEffects(args: {
    totalFrames: number;
    setFrameIdx: Dispatch<SetStateAction<number>>;
    selected: TimelineSelection | null;
    setSelected: Dispatch<SetStateAction<TimelineSelection | null>>;
    calls: DocCall[];
    keyframes: DocKeyframe[];
    layerA: LayerA;
    setLayerA: Dispatch<SetStateAction<LayerA>>;
    onSave: (params: Record<string, unknown>) => void;
    callCardRefs: {
        current: (HTMLDivElement | null)[];
    };
    beatRowRefs: {
        current: (HTMLDivElement | null)[][];
    };
    lastCallsRef: {
        current: string;
    };
    lastKeyframesRef: {
        current: string;
    };
    lastLayerARef: {
        current: string;
    };
}): {
    setLayerAKey: <K extends keyof LayerA>(k: K, v: LayerA[K]) => void;
};
//# sourceMappingURL=useDocEffects.d.ts.map
