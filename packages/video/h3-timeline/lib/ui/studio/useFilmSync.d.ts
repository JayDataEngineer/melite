import type { Dispatch, SetStateAction } from "react";
import type { FilmPlayerHandle } from "@melite-plugin/timeline/ui/timeline";
import type { DocCall, DocKeyframe } from "./docModel.js";
/** Player↔bar playhead sync + rail readout stats (tenant §3). Verbatim lines 1592–1670. */
export declare function useFilmSync(args: {
    fps: number;
    totalFrames: number;
    keyframes: DocKeyframe[];
    calls: DocCall[];
    setFrameIdx: Dispatch<SetStateAction<number>>;
}): {
    filmRef: import("react").RefObject<FilmPlayerHandle | null>;
    isScrubbingRef: import("react").RefObject<boolean>;
    wasPlayingRef: import("react").RefObject<boolean>;
    handleScrubStart: () => void;
    handleScrubEnd: () => void;
    filmFpsRef: import("react").RefObject<number | null>;
    axisFps: () => number;
    handleFilmTime: (sec: number) => void;
    handleBarFrame: (f: number) => void;
    isPausedRef: import("react").RefObject<boolean>;
    handlePlayingChange: (playing: boolean) => void;
    filmPlaying: boolean;
    seconds: string;
    unwired: number;
    emptyText: number;
    guideCount: number;
    knobOverrides: number;
};
//# sourceMappingURL=useFilmSync.d.ts.map
