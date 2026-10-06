/**
 * store/timelinePersistence — localStorage metadata + IndexedDB blob
 * strip/restore and the debounced persistence scheduler (split from
 * timelineStore.ts; pure move, no logic changes).
 */
import type { AudioCue, AudioTrackDef, ConsistencyAnchor, TimelineSegment } from "@melite/contracts";
import type { TimelineStore } from "./timelineStoreTypes.ts";
export declare function persistTimeline(segments: TimelineSegment[], audioCues: AudioCue[], audioTracks: AudioTrackDef[], relayVideoUrl: string | null, relaySegmentIds: string[], relayAssetId: string | null, globalConsistencyAnchor: ConsistencyAnchor | null): Promise<void>;
export declare function loadPersistedTimeline(): Promise<{
    segments: TimelineSegment[];
    audioCues: AudioCue[];
    audioTracks: AudioTrackDef[];
    relayVideoUrl: string | null;
    relaySegmentIds: string[];
    relayAssetId: string | null;
    globalConsistencyAnchor: ConsistencyAnchor | null;
} | null>;
export type PersistArgs = Parameters<typeof persistTimeline>;
export declare const PERSIST_DEBOUNCE_MS = 300;
export declare let _persistTimer: ReturnType<typeof setTimeout> | null;
export declare let _pendingPersist: PersistArgs | null;
export declare let _persistRunCount: number;
export declare function _bumpPersistRunCount(): void;
export declare function schedulePersist(state: Pick<TimelineStore, 'segments' | 'audioCues' | 'audioTracks' | 'relayVideoUrl' | 'relaySegmentIds' | 'relayAssetId' | 'globalConsistencyAnchor'>): void;
/** Flush any pending debounced persistence immediately. Returns the
 *  in-flight persistence promise (or a resolved promise if nothing pending). */
export declare function flushPersist(): Promise<void>;
//# sourceMappingURL=timelinePersistence.d.ts.map
