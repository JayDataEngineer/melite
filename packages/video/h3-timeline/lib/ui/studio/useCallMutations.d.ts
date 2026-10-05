/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { Dispatch, SetStateAction } from "react";
import type { CallRefs, DocCall, GuideKind } from "./docModel.js";
/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
 *  Verbatim lines 2088–2260, plus the authoring grid (2026-09-25):
 *  every gesture that writes a frame lands on the card's own span law
 *  (docGrid.ts), so a studio-built doc never trips the card's uniform
 *  off-grid refusal. */
export declare function useCallMutations(setCalls: Dispatch<SetStateAction<DocCall[]>>, fps: number): {
    handleExtend: (newTotal: number) => void;
    addCallAt: (frame: number) => void;
    setCallGuide: (i: number, kind: GuideKind, source: string) => void;
    setCallTransition: (i: number, t: "extend" | "cut") => void;
    setCallRefs: (i: number, key: keyof CallRefs, value: string) => void;
    setCallSpan: (i: number, which: "start" | "end", frame: number) => void;
    setCallKnob: (i: number, key: string, value: number | string | boolean | undefined) => void;
};
//# sourceMappingURL=useCallMutations.d.ts.map
