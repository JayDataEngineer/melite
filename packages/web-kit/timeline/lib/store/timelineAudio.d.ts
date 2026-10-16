import type { GetState, SetState } from "./createStore.js";
import type { TimelineStore } from "./timelineStoreTypes.js";
export declare function createAudioSlice(set: SetState<TimelineStore>, get: GetState<TimelineStore>): Pick<TimelineStore, "setTrackMuted" | "setTrackSolo" | "addAudioTrack" | "removeAudioTrack" | "addAudioCue" | "removeAudioCue" | "updateAudioCue" | "setRelayVideo" | "setGlobalConsistencyAnchor" | "getEffectiveConsistencyAnchor">;
//# sourceMappingURL=timelineAudio.d.ts.map