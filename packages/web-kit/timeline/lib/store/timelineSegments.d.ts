import type { GetState, SetState } from "./createStore.js";
import type { TimelineStore } from "./timelineStoreTypes.js";
export declare function createSegmentSlice(set: SetState<TimelineStore>, get: GetState<TimelineStore>): Pick<TimelineStore, "initialize" | "addSegment" | "removeSegment" | "updateSegment" | "reorderSegments" | "toggleSegmentLock" | "groupSelectedSegments" | "ungroupSegments" | "splitSegmentAtPlayhead" | "rippleDelete" | "rollEdit" | "exportTimeline" | "importTimeline" | "duplicateWithOffset">;
//# sourceMappingURL=timelineSegments.d.ts.map
