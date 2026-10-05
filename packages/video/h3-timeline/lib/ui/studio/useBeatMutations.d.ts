/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react";
import type { DocKeyframe } from "./docModel.js";
/** Legacy keyframe gestures (tenant §9) — prompt segments cut 2026-09-15. */
export declare function useBeatMutations(keyframes: DocKeyframe[], setKeyframes: Dispatch<SetStateAction<DocKeyframe[]>>): {
    handleKeyframeAdd: (trackId: string, frame: number) => string;
    handleKeyframeMove: (id: string, frame: number) => void;
    handleKeyframeDelete: (id: string) => void;
    setKeyframeSource: (i: number, source: string) => void;
};
//# sourceMappingURL=useBeatMutations.d.ts.map
