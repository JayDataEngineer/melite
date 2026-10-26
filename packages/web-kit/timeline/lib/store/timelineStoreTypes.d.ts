/**
 * store/timelineStoreTypes — the TimelineStore state shape + default
 * viewport/playback/drag factories (split from timelineStore.ts; pure
 * move, no logic changes).
 */
import type { AudioCue, AudioTrackDef, ChapterMarker, ConsistencyAnchor, DragState, InOutPoints, PlaybackState, SegmentStatus, TimelineSegment, TimelineViewport, VideoVariant } from "@melite/contracts";
import type { VariantInput } from "./timelineIds.js";
export interface TimelineStore {
    segments: TimelineSegment[];
    audioCues: AudioCue[];
    audioTracks: AudioTrackDef[];
    addAudioTrack: (label?: string) => AudioTrackDef;
    removeAudioTrack: (id: string) => void;
    viewport: TimelineViewport;
    playback: PlaybackState;
    drag: DragState;
    selectedSegmentId: string | null;
    /** G8: Multi-select set. The "primary" selection (`selectedSegmentId`)
     *  is always a member when this set is non-empty. Shift-click extends,
     *  ctrl/cmd-click toggles individual segments. */
    selectedSegmentIds: Set<string>;
    /** E3.11: Active status filter on the storyboard grid. Null = no
     *  filter (show all segments). Set by clicking a status pill on the
     *  flow ribbon. UI-only state — not persisted (resets to 'all'
     *  on reload). */
    storyboardStatusFilter: SegmentStatus | null;
    /** G8: Marked in/out range in seconds. Null = no range marked. */
    inOutPoints: InOutPoints | null;
    /** E2.7: Chapter markers on the timeline. Ordered by `time`. */
    markers: ChapterMarker[];
    selectedAudioCueId: string | null;
    relayVideoUrl: string | null;
    relaySegmentIds: string[];
    relayAssetId: string | null;
    /** E3.5: Global consistency anchor — a face/character reference image
     *  that all segments inherit unless they have a per-segment override.
     *  Set via the toolbar slot; persisted across reloads. */
    globalConsistencyAnchor: ConsistencyAnchor | null;
    initialized: boolean;
    initialize: () => Promise<void>;
    addSegment: (partial?: Partial<TimelineSegment>) => TimelineSegment;
    removeSegment: (id: string) => void;
    updateSegment: (id: string, patch: Partial<TimelineSegment>) => void;
    reorderSegments: (orderedIds: string[]) => void;
    /** E3.2: Add a variant take to a segment's `variants[]` array. If the
     *  array is over MAX_VARIANTS_PER_SEGMENT after the push, the OLDEST
     *  non-primary variant is evicted (FIFO). The variant's `id` is minted
     *  here (caller passes variant data without an id). Returns the stored
     *  variant (with id). No-op if the segment doesn't exist. */
    addVariant: (segId: string, variant: VariantInput) => VideoVariant | null;
    /** E3.2: Remove a variant by id. Does NOT touch the segment's primary
     *  `videoUrl` — to swap the primary, use `promoteVariant` instead. No-op
     *  if the segment or variant doesn't exist. */
    removeVariant: (segId: string, variantId: string) => void;
    /** E3.2: Promote a variant to the segment's primary `videoUrl`. The
     *  outgoing primary is demoted into `variants[]` (as a fresh variant
     *  with a new id and the original seed), and the promoted variant is
     *  removed from `variants[]`. Thumbnail, assetId, and seed on the
     *  promoted variant also become the segment's primary fields. No-op if
     *  the segment or variant doesn't exist, or if the segment has no
     *  current `videoUrl` to demote (in which case we still promote). */
    promoteVariant: (segId: string, variantId: string) => void;
    /** E3.2: Bulk-set a segment's variants array. Used by the "Generate 4"
     *  button to write all four results in one atomic store update (instead
     *  of four addVariant calls that would each trigger history+persist).
     *  Eviction applies. No-op if the segment doesn't exist. */
    setVariants: (segId: string, variants: VariantInput[]) => void;
    /** E2.6: Toggle the lock state of a segment. Locked segments resist
     *  drag/trim/remove. Returns the new lock state. */
    toggleSegmentLock: (id: string) => boolean;
    /** E2.6: Assign every segment in the current multi-select set to the
     *  same (new) groupId so they move as a unit. Returns the new groupId
     *  or null if the selection was empty. */
    groupSelectedSegments: () => string | null;
    /** E2.6: Clear the groupId from every segment matching `groupId`,
     *  dissolving the group. */
    ungroupSegments: (groupId: string) => void;
    /** E2.5: Mute/unmute an audio track. Muted tracks contribute no audio
     *  during playback or render. */
    setTrackMuted: (trackId: string, muted: boolean) => void;
    /** E2.5: Solo/unsolo an audio track. Soloing a track implicitly mutes
     *  every other track. Solo on a muted track is ignored (mute wins). */
    setTrackSolo: (trackId: string, solo: boolean) => void;
    /** G9: Split the segment at the playhead position. The segment under the
     *  playhead is split into two: [start, playhead) and [playhead, end).
     *  Params, prompt, etc. are copied to both halves. Prompt beats and
     *  keyframes before the split stay on the first half; those after go to
     *  the second. Video URLs are cleared (the split invalidates the render).
     *  No-op if the playhead is at a segment boundary or outside a segment. */
    splitSegmentAtPlayhead: () => void;
    /** E2.3: Remove a segment AND close the gap it leaves behind by shifting
     *  every later segment left by the deleted segment's duration. Locked
     *  segments are still shifted (their content isn't modified — only their
     *  start time). No-op if the target doesn't exist or is locked (locked
     *  segments resist deletion; use removeSegment after unlocking). */
    rippleDelete: (id: string) => void;
    /** E2.3: Roll edit — drag the shared boundary between two adjacent clips.
     *  `delta` seconds are subtracted from the left clip's duration and added
     *  to the right clip's start, while the right clip's duration shrinks
     *  (or vice-versa for negative delta). Total timeline length is preserved.
     *  `delta` is clamped so neither clip drops below `minDuration` (0.5s).
     *  No-op if either id is unknown, either is locked, or the clips aren't
     *  actually adjacent in time. */
    rollEdit: (leftId: string, rightId: string, deltaSeconds: number) => void;
    /** G11: Serialize the timeline (segments + audio cues + tracks) to a
     *  JSON string. Returns the JSON string ready for download. */
    exportTimeline: () => string;
    /** G11: Import a timeline from a JSON string. Replaces the current
     *  timeline entirely. Returns true on success, false on parse error. */
    importTimeline: (json: string) => boolean;
    undo: () => void;
    redo: () => void;
    addAudioCue: (cue: Omit<AudioCue, 'id'>) => AudioCue;
    removeAudioCue: (id: string) => void;
    updateAudioCue: (id: string, patch: Partial<AudioCue>) => void;
    setRelayVideo: (url: string | null, segmentIds: string[], assetId?: string | null) => void;
    /** E3.5: Set the global consistency anchor (face/character reference).
     *  Pass null to clear. All segments inherit this unless they have a
     *  per-segment `consistencyAnchor` override. */
    setGlobalConsistencyAnchor: (anchor: ConsistencyAnchor | null) => void;
    /** E3.5: Resolve the effective anchor for a segment — the per-segment
     *  override if set, otherwise the global anchor. Returns null if
     *  neither is set. */
    getEffectiveConsistencyAnchor: (segId: string) => ConsistencyAnchor | null;
    setViewport: (patch: Partial<TimelineViewport>) => void;
    /** E3.11: Set the storyboard status filter. Pass null to clear. */
    setStoryboardStatusFilter: (status: SegmentStatus | null) => void;
    /** G10: Toggle between 'seconds' and 'frames' display. */
    setPlayback: (patch: Partial<PlaybackState>) => void;
    setDrag: (patch: Partial<DragState>) => void;
    setSelectedSegment: (id: string | null) => void;
    setSelectedAudioCue: (id: string | null) => void;
    /** E4.1: Snapshot the primary-selected segment's params + prompt +
     *  negativePrompt into the module-level clipboard. Returns true if a
     *  segment was selected and copied, false otherwise (no-op). */
    copySelectedSegmentParams: () => boolean;
    /** E4.1: Paste the clipboard into a single segment by id. Returns true
     *  on a successful apply, false if the clipboard is empty or the
     *  target segment doesn't exist. Records history + schedules persist. */
    pasteParamsToSegment: (id: string) => boolean;
    /** E4.1: Convenience — paste the clipboard into the primary-selected
     *  segment. Returns false if no selection or no clipboard. */
    pasteParamsToSelected: () => boolean;
    /** E4.5: Duplicate a segment N times, bumping `seed` by 1 on each
     *  copy (source.seed + i for the i-th copy, 1-indexed). Copies are
     *  inserted IMMEDIATELY after the source; later segments shift right
     *  by (count × source.duration) seconds. Clears render state on each
     *  copy (videoUrl, thumbnail, status → 'empty') since a different
     *  seed means a different render. Returns the new segments (empty
     *  array on unknown id or count ≤ 0). */
    duplicateWithOffset: (sourceId: string, count: number) => TimelineSegment[];
    /** G8: Extend the multi-select set to include `id` and all segments
     *  between the current anchor (`selectedSegmentId`) and `id`. The
     *  anchor stays the primary selection. No-op if `id` is the anchor. */
    selectSegmentRange: (id: string) => void;
    /** G8: Toggle `id` in the multi-select set. If the set becomes empty,
     *  clears `selectedSegmentId`. If toggled on and no primary is set,
     *  promotes `id` to primary. */
    toggleSegmentInSelection: (id: string) => void;
    /** G8: Clear the multi-select set (single-select mode). */
    clearMultiSelection: () => void;
    /** G8: Select all segments (ctrl/cmd+A). */
    selectAllSegments: () => void;
    /** G8: Mark the in point at the playhead position. If an out point
     *  already exists before the playhead, it's cleared first. */
    markInAtPlayhead: () => void;
    /** G8: Mark the out point at the playhead position. If no in point
     *  is set, defaults to 0. If the playhead is before the in point,
     *  the in point is moved to 0. */
    markOutAtPlayhead: () => void;
    /** G8: Mark a selection spanning the segment(s) under the playhead.
     *  Multiple segments can be hit if the playhead is on a boundary. */
    markSelectionFromPlayhead: () => void;
    /** G8: Explicit in/out set (e.g. for retake range pre-fill). */
    setInOutPoints: (start: number, end: number) => void;
    /** G8: Clear the in/out range. */
    clearInOutPoints: () => void;
    /** E2.7: Add a chapter marker at the given time (defaults to the
     *  current playhead). Returns the new marker. The label defaults to
     *  "Marker N" but callers can override. */
    addMarker: (time?: number, label?: string) => ChapterMarker;
    /** E2.7: Remove a marker by id. */
    removeMarker: (id: string) => void;
    /** E2.7: Patch an existing marker (e.g. rename, retime). */
    updateMarker: (id: string, patch: Partial<ChapterMarker>) => void;
    /** E2.7: Remove all markers. */
    clearMarkers: () => void;
    reset: () => void;
}
export declare const DEFAULT_VIEWPORT: TimelineViewport;
export declare const DEFAULT_PLAYBACK: PlaybackState;
export declare const DEFAULT_DRAG: DragState;
//# sourceMappingURL=timelineStoreTypes.d.ts.map
