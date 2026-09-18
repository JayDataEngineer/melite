/**
 * store/audio — createAudioSlice (split from timelineStore.ts; pure move,
 * no logic changes).
 */
import type { AudioCue, AudioTrackDef } from "@melite/contracts"
import { TRACK_COLORS } from "@melite/contracts"
import type { GetState, SetState } from "./createStore"
import { uid } from "./timelineIds"
import { schedulePersist } from "./timelinePersistence"
import type { TimelineStore } from "./timelineStoreTypes"

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
      label: label || `Audio ${idx + 1}`,
      color,
      height: 48,
    }
    set((s) => ({ audioTracks: [...s.audioTracks, track] }))
    schedulePersist(get())
    return track
  },

  removeAudioTrack: (id) => {
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
    set((s) => ({
      audioCues: s.audioCues.filter((c) => c.id !== id),
      selectedAudioCueId: s.selectedAudioCueId === id ? null : s.selectedAudioCueId,
    }))
    schedulePersist(get())
  },

  updateAudioCue: (id, patch) => {
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
