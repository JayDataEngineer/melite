/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react";
import type { DocCall } from "./docModel.js";
/** Bar↔card prompt gestures (tenant §6). Verbatim lines 1948–2042. */
export declare function usePromptMutations(setCalls: Dispatch<SetStateAction<DocCall[]>>): {
    handlePromptResize: (id: string, s: number, e: number) => void;
    handlePromptMove: (id: string, s: number, e: number) => void;
    handlePromptDelete: (id: string) => void;
    handlePromptUpdate: (id: string, text: string) => void;
};
//# sourceMappingURL=usePromptMutations.d.ts.map
