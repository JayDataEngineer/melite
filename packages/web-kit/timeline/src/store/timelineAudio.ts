/**
 * store/audio — createAudioSlice (split from timelineStore.ts; pure move,
 * no logic changes).
 */
import type { AudioCue, AudioTrackDef } from "@melite/contracts"
import { TRACK_COLORS } from "@melite/contracts"
import type { GetState, SetState } from "./createStore.ts"
import { uid } from "./timelineIds.ts"
import { schedulePersist } from "./timelinePersistence.ts"
import { timelineCopy } from "../timelineCopy.ts"
import type { TimelineStore } from "./timelineStoreTypes.ts"

export function createAudioSlice(
  set: SetState<TimelineStore>,
  get: GetState<TimelineStore>,
): Pick<TimelineStore, "setTrackMuted" | "setTrackSolo" | "addAudioTrack" | "removeAudioTrack" | "addAudioCue" | "removeAudioCue" | "updateAudioCue" | "setRelayVideo" | "setGlobalConsistencyAnchor" | "getEffectiveConsistencyAnchor"> {
  return {
  setTrackMuted: (trackId, muted) => {
    set((s) => ({
      audioTracks: s.audioTracks.map((t) =>
        t.id === trackId ? { ...t, muted } : t,
      ),
    }))
    schedulePersist(get())
  },

  setTrackSolo: (trackId, solo) => {
    set((s) => ({
      audioTracks: s.audioTracks.map((t) =>
        t.id === trackId ? { ...t, solo } : t,
      ),
    }))
    schedulePersist(get())
  },

  addAudioTrack: (label) => {
    const state = get()
    const idx = state.audioTracks.length
    const color = TRACK_COLORS[idx % TRACK_COLORS.length]
    const track: AudioTrackDef = {
      id: uid(),
      // THE LOCALE LAW (F-B4, the 2026-11-05 timeline nativity audit):
      // the fallback label rides timelineCopy — melite-authored copy
      // never plants literals outside the dictionary.
      label: label || timelineCopy.audioTrackFallback(idx + 1),
      color,
      height: 48,
    }
    set((s) => ({ audioTracks: [...s.audioTracks, track] }))
    schedulePersist(get())
    return track
  },

  removeAudioTrack: (id) => {
    // R-S5 (2026-10-22): the decoded buffers of the removed track's
    // cues leave with it — the playback hook's preload effect sweeps
    // buffersRef against the surviving cues on this very change (it
    // runs on every audioCues write).
    set((s) => ({
      audioTracks: s.audioTracks.filter((t) => t.id !== id),
      audioCues: s.audioCues.filter((c) => c.track !== id),
      selectedAudioCueId: s.selectedAudioCueId && s.audioCues.find(c => c.id === s.selectedAudioCueId)?.track === id ? null : s.selectedAudioCueId,
    }))
    schedulePersist(get())
  },

  addAudioCue: (cue) => {
    const full: AudioCue = { ...cue, id: uid() }
    set((s) => ({ audioCues: [...s.audioCues, full] }))
    schedulePersist(get())
    return full
  },

  removeAudioCue: (id) => {
    // R-S5: the hook's preload effect evicts this cue's decoded
    // buffer when it observes the removal (see removeAudioTrack).
    set((s) => ({
      audioCues: s.audioCues.filter((c) => c.id !== id),
      selectedAudioCueId: s.selectedAudioCueId === id ? null : s.selectedAudioCueId,
    }))
    schedulePersist(get())
  },

  updateAudioCue: (id, patch) => {
    // R-S5 (2026-10-22): a settle-after-removal write used to mint a
    // phantom persist + re-render for zero visible change (map over a
    // list that no longer contains the id still set()s a new array
    // ref). The row is gone — the patch has nothing to land on.
    if (!get().audioCues.some((c) => c.id === id)) return
    set((s) => ({
      audioCues: s.audioCues.map((c) => c.id === id ? { ...c, ...patch } : c),
    }))
    schedulePersist(get())
  },

  setRelayVideo: (url, segmentIds, assetId) => {
    set({ relayVideoUrl: url, relaySegmentIds: segmentIds, relayAssetId: assetId })
    schedulePersist(get())
  },

  // E3.5: Consistency anchor — global face/character reference.
  setGlobalConsistencyAnchor: (anchor) => {
    set({ globalConsistencyAnchor: anchor })
    schedulePersist(get())
  },

  getEffectiveConsistencyAnchor: (segId) => {
    const s = get()
    const seg = s.segments.find((x) => x.id === segId)
    // Per-segment override wins; otherwise fall back to the global anchor.
    if (seg?.consistencyAnchor) return seg.consistencyAnchor
    return s.globalConsistencyAnchor
  },
  }
}
