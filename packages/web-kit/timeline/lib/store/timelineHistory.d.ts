/**
 * store/timelineHistory — undo/redo snapshot stack (split from
 * timelineStore.ts; pure move, no logic changes).
 */
import type { AudioCue, TimelineSegment } from "@melite/contracts";
import type { GetState, SetState } from "./createStore.ts";
import type { TimelineStore } from "./timelineStoreTypes.ts";
export declare const _history: {
    segments: TimelineSegment[];
    audioCues: AudioCue[];
}[];
export declare let _historyIdx: number;
export declare const MAX_HISTORY = 50;
export declare function pushHistory(segments: TimelineSegment[], audioCues: AudioCue[]): void;
/**
 * Undo/redo actions. They live here (with the stack they mutate) and are
 * composed into the store by timelineStore.ts. Bodies are verbatim moves.
 */
export declare function createHistorySlice(set: SetState<TimelineStore>, get: GetState<TimelineStore>): Pick<TimelineStore, "undo" | "redo">;
//# sourceMappingURL=timelineHistory.d.ts.map