/**
 * timeline store — the storyboard document (segments, variants, audio
 * cues/tracks, playback, selection, markers) + debounced persistence.
 *
 * Split 2026-09-18: the state shape lives in ./timelineStoreTypes, id
 * minting in ./timelineIds, blob storage in ./timelineBlobs, persistence +
 * debounce in ./timelinePersistence, undo history in ./timelineHistory, and
 * the action groups in ./timelineSegments, ./timelineVariants, ./timelineAudio
 * and ./timelineUi. This module keeps the public surface and composes the
 * slices into `useTimelineStore`.
 *
 * PUBLIC API (other packages import from this store path): `useTimelineStore`,
 * `flushPersist`, `_persistRunCount`, `_tlDelete`, `MAX_VARIANTS_PER_SEGMENT`,
 * `VariantInput`. It never moves from here — only the internals moved out.
 */
import { create } from "./createStore"
import { DEFAULT_DRAG, DEFAULT_PLAYBACK, DEFAULT_VIEWPORT } from "./timelineStoreTypes"
import type { TimelineStore } from "./timelineStoreTypes"
import { createAudioSlice } from "./timelineAudio"
import { createHistorySlice } from "./timelineHistory"
import { createSegmentSlice } from "./timelineSegments"
import { createUiSlice } from "./timelineUi"
import { createVariantSlice } from "./timelineVariants"

// ── Public re-export surface (unchanged) ──
export { MAX_VARIANTS_PER_SEGMENT } from "./timelineIds"
export type { VariantInput } from "./timelineIds"
export { _tlDelete } from "./timelineBlobs"
export { _persistRunCount, flushPersist } from "./timelinePersistence"
export type { TimelineStore } from "./timelineStoreTypes"

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  segments: [],
  audioCues: [],
  audioTracks: [],
  viewport: { ...DEFAULT_VIEWPORT },
  timeFormat: 'seconds',
  playback: { ...DEFAULT_PLAYBACK },
  drag: { ...DEFAULT_DRAG },
  selectedSegmentId: null,
  selectedSegmentIds: new Set<string>(),
  storyboardStatusFilter: null,
  inOutPoints: null,
  markers: [],
  selectedAudioCueId: null,
  relayVideoUrl: null,
  relaySegmentIds: [],
  relayAssetId: null,
  globalConsistencyAnchor: null,
  initialized: false,
  ...createSegmentSlice(set, get),
  ...createVariantSlice(set, get),
  ...createAudioSlice(set, get),
  ...createUiSlice(set, get),
  ...createHistorySlice(set, get),
}))
