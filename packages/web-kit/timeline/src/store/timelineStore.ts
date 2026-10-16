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
import { create } from "./createStore.ts"
import { DEFAULT_DRAG, DEFAULT_PLAYBACK, DEFAULT_VIEWPORT } from "./timelineStoreTypes.ts"
import type { TimelineStore } from "./timelineStoreTypes.ts"
import { createAudioSlice } from "./timelineAudio.ts"
import { createHistorySlice } from "./timelineHistory.ts"
import { createSegmentSlice } from "./timelineSegments.ts"
import { createUiSlice } from "./timelineUi.ts"
import { createVariantSlice } from "./timelineVariants.ts"

// ── Public re-export surface (unchanged) ──
export { MAX_VARIANTS_PER_SEGMENT } from "./timelineIds.ts"
export type { VariantInput } from "./timelineIds.ts"
export { _tlDelete } from "./timelineBlobs.ts"
export { _persistRunCount, flushPersist } from "./timelinePersistence.ts"
export type { TimelineStore } from "./timelineStoreTypes.ts"

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  segments: [],
  audioCues: [],
  audioTracks: [],
  viewport: { ...DEFAULT_VIEWPORT },
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
