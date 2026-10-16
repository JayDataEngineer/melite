/**
 * store/ui — createUiSlice (split from timelineStore.ts; pure move,
 * no logic changes).
 */
import type { ChapterMarker } from "@melite/contracts"
import { timelineCopy } from "../timelineCopy.ts"
import type { GetState, SetState } from "./createStore.ts"
import { copySegmentParams, pasteParamsInto } from "./segmentClipboard.ts"
import { uid } from "./timelineIds.ts"
import { tlClearAll } from "./timelineBlobs.ts"
import { schedulePersist } from "./timelinePersistence.ts"
import { DEFAULT_DRAG, DEFAULT_PLAYBACK, DEFAULT_VIEWPORT } from "./timelineStoreTypes.ts"
import type { TimelineStore } from "./timelineStoreTypes.ts"

export function createUiSlice(
  set: SetState<TimelineStore>,
  get: GetState<TimelineStore>,
): Pick<TimelineStore, "setViewport" | "setStoryboardStatusFilter" | "setPlayback" | "setDrag" | "setSelectedSegment" | "setSelectedAudioCue" | "copySelectedSegmentParams" | "pasteParamsToSegment" | "pasteParamsToSelected" | "selectSegmentRange" | "toggleSegmentInSelection" | "clearMultiSelection" | "selectAllSegments" | "markInAtPlayhead" | "markOutAtPlayhead" | "markSelectionFromPlayhead" | "setInOutPoints" | "clearInOutPoints" | "addMarker" | "removeMarker" | "updateMarker" | "clearMarkers" | "reset"> {
  return {
  setViewport: (patch) => set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  setStoryboardStatusFilter: (status) => set({ storyboardStatusFilter: status }),
  setPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
  setDrag: (patch) => set((s) => ({ drag: { ...s.drag, ...patch } })),
  // G8: Single-select clears the multi-select set — this is the "plain
  // click" path. Shift-click and ctrl/cmd-click use the dedicated actions.
  setSelectedSegment: (id) => set({
    selectedSegmentId: id,
    selectedSegmentIds: new Set<string>(id ? [id] : []),
  }),
  setSelectedAudioCue: (id) => set({ selectedAudioCueId: id }),

  // ── E4.1: Copy/paste segment params ──────────────────────────────────
  // The clipboard lives in lib/segment-clipboard (module-level, NOT
  // persisted). These store actions are thin wrappers: they resolve the
  // selected/target segment, delegate to the clipboard helpers, and
  // apply the patch through updateSegment so history + persist fire
  // exactly once per paste.
  copySelectedSegmentParams: () => {
    const { selectedSegmentId, segments } = get()
    if (!selectedSegmentId) return false
    const seg = segments.find((s) => s.id === selectedSegmentId)
    if (!seg) return false
    copySegmentParams(seg)
    return true
  },
  pasteParamsToSegment: (id) => {
    const seg = get().segments.find((s) => s.id === id)
    if (!seg) return false
    const patch = pasteParamsInto(seg)
    if (!patch) return false
    get().updateSegment(id, patch)
    return true
  },
  pasteParamsToSelected: () => {
    const id = get().selectedSegmentId
    if (!id) return false
    return get().pasteParamsToSegment(id)
  },

  // ── G8: Multi-select + in/out points ────────────────────────────────
  selectSegmentRange: (id) => set((s) => {
    const segs = s.segments
    const anchorId = s.selectedSegmentId
    if (!anchorId || anchorId === id) {
      // No anchor or same segment — just single-select.
      return { selectedSegmentId: id, selectedSegmentIds: new Set<string>([id]) }
    }
    const anchorIdx = segs.findIndex(seg => seg.id === anchorId)
    const targetIdx = segs.findIndex(seg => seg.id === id)
    if (anchorIdx < 0 || targetIdx < 0) {
      return { selectedSegmentId: id, selectedSegmentIds: new Set<string>([id]) }
    }
    const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
    const rangeIds = segs.slice(lo, hi + 1).map(seg => seg.id)
    return {
      selectedSegmentId: anchorId,  // anchor stays primary
      selectedSegmentIds: new Set<string>(rangeIds),
    }
  }),
  toggleSegmentInSelection: (id) => set((s) => {
    const next = new Set(s.selectedSegmentIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    // If the set is empty, clear the primary too.
    if (next.size === 0) {
      return { selectedSegmentIds: next, selectedSegmentId: null }
    }
    // Promote to primary if there isn't one already in the set. When the
    // toggle just REMOVED the primary (ctrl-click off), `id` is no longer
    // a member — fall back to a remaining member so the primary honors
    // the interface invariant (always a member while the set is
    // non-empty). A toggled-ON id still becomes primary. (2026-09-12)
    let primary = s.selectedSegmentId && next.has(s.selectedSegmentId)
      ? s.selectedSegmentId
      : id
    if (!next.has(primary)) primary = [...next][0] as string
    return { selectedSegmentIds: next, selectedSegmentId: primary }
  }),
  clearMultiSelection: () => set((s) => ({
    selectedSegmentIds: new Set<string>(s.selectedSegmentId ? [s.selectedSegmentId] : []),
  })),
  selectAllSegments: () => set((s) => {
    const all = new Set(s.segments.map(seg => seg.id))
    return {
      selectedSegmentIds: all,
      selectedSegmentId: s.segments[0]?.id ?? null,
    }
  }),
  markInAtPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    const existing = s.inOutPoints
    // If there's an existing out point before the playhead, clear it.
    if (existing && existing.end <= t) {
      return { inOutPoints: { start: t, end: t + 1 } }
    }
    return {
      inOutPoints: {
        start: t,
        end: existing ? Math.max(existing.end, t + 0.1) : t + 1,
      },
    }
  }),
  markOutAtPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    const existing = s.inOutPoints
    if (!existing) {
      // No in point — default to 0 and mark out here.
      return { inOutPoints: { start: 0, end: t } }
    }
    // If the playhead is before the in point, push in back to 0.
    const start = t < existing.start ? 0 : existing.start
    return { inOutPoints: { start, end: Math.max(t, start + 0.1) } }
  }),
  markSelectionFromPlayhead: () => set((s) => {
    const t = s.playback.currentTime
    // Find segments overlapping the playhead.
    const hit = s.segments.filter(seg => t >= seg.start && t < seg.start + seg.duration)
    if (hit.length === 0) return {}
    const start = Math.min(...hit.map(seg => seg.start))
    const end = Math.max(...hit.map(seg => seg.start + seg.duration))
    return { inOutPoints: { start, end } }
  }),
  setInOutPoints: (start, end) => set({
    inOutPoints: { start: Math.min(start, end), end: Math.max(start, end) },
  }),
  clearInOutPoints: () => set({ inOutPoints: null }),

  // ── E2.7: Chapter markers ───────────────────────────────────────────
  addMarker: (time, label) => {
    const s = get()
    const t = typeof time === "number" ? Math.max(0, time) : s.playback.currentTime
    const autoLabel = timelineCopy.markerAutoLabel({ index: s.markers.length + 1 })
    const marker: ChapterMarker = {
      id: uid(),
      time: t,
      label: label ?? autoLabel,
    }
    // Keep markers sorted by time for binary-search-like rendering.
    const markers = [...s.markers, marker].sort((a, b) => a.time - b.time)
    set({ markers })
    schedulePersist(get())
    return marker
  },

  removeMarker: (id) => {
    set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }))
    schedulePersist(get())
  },

  updateMarker: (id, patch) => {
    set((s) => ({
      markers: s.markers
        .map((m) => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.time - b.time),
    }))
    schedulePersist(get())
  },

  clearMarkers: () => {
    set({ markers: [] })
    schedulePersist(get())
  },

  reset: () => {
    set({
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
      // Reset initialized so subsequent initialize() calls re-load state.
      // Without this, tests that reset() between cases would see initialize()
      // return early — and production code paths that reset+initialize would
      // skip reloading.
      initialized: false,
    })
    // Clear persisted data
    localStorage.removeItem('tech_noir_timeline')
    // NO SILENT SWALLOW — if IndexedDB cleanup fails we want to know about it,
    // not silently leave stale blobs behind. The catch is fire-and-forget only
    // because the user already confirmed the reset; the error still logs so
    // bugs in the IDB layer don't disappear.
    tlClearAll().catch((e: unknown) =>
      console.error("[Timeline] tlClearAll failed (IndexedDB):", e)
    )
  },
  }
}
