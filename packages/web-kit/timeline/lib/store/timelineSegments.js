import { DEFAULT_SEGMENT_PARAMS, normalizeSegmentStatus } from "@melite/contracts";
import { syncUidCounter, uid } from "./timelineIds.js";
import { pushHistory } from "./timelineHistory.js";
import { loadPersistedTimeline, schedulePersist } from "./timelinePersistence.js";
export function createSegmentSlice(set, get) {
    return {
        initialize: async () => {
            if (get().initialized)
                return;
            const loaded = await loadPersistedTimeline();
            if (loaded) {
                // Restore _nextId to avoid ID collisions
                const allIds = [
                    ...loaded.segments.map(s => s.id),
                    ...loaded.audioCues.map(c => c.id),
                    ...loaded.audioTracks.map(t => t.id),
                ];
                syncUidCounter(allIds);
                const totalDuration = loaded.segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
                set({
                    segments: loaded.segments,
                    audioCues: loaded.audioCues,
                    audioTracks: loaded.audioTracks,
                    relayVideoUrl: loaded.relayVideoUrl,
                    relaySegmentIds: loaded.relaySegmentIds,
                    relayAssetId: loaded.relayAssetId,
                    globalConsistencyAnchor: loaded.globalConsistencyAnchor,
                    playback: { isPlaying: false, currentTime: 0, totalDuration, loopRegion: false },
                    initialized: true,
                });
                // Seed undo history with loaded state
                pushHistory(loaded.segments, loaded.audioCues);
            }
            else {
                set({ initialized: true });
            }
        },
        addSegment: (partial) => {
            const state = get();
            const order = state.segments.length;
            const seg = {
                id: uid(),
                order,
                start: order * 5,
                duration: 5,
                prompt: '',
                negativePrompt: '',
                thumbnailUrl: null,
                videoUrl: null,
                firstFrameB64: null,
                lastFrameB64: null,
                params: { ...DEFAULT_SEGMENT_PARAMS },
                trimStart: 0,
                sourceStepId: null,
                status: 'empty',
                error: null,
                controlVideoUrl: null,
                lipSyncedVideoUrl: null,
                lipSyncPreferOriginal: false,
                // LTX director flow (Phase 14) — empty by default. Backend picks the
                // legacy vace_director chain when both are empty, and the scheduled
                // path when promptBeats is non-empty (or keyframes has 2+ entries).
                promptBeats: [],
                keyframes: [],
                ...partial,
            };
            set((s) => {
                const segments = [...s.segments, seg];
                const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
                pushHistory(segments, s.audioCues);
                return { segments, playback: { ...s.playback, totalDuration } };
            });
            schedulePersist(get());
            return seg;
        },
        removeSegment: (id) => {
            set((s) => {
                // E2.6: refuse to remove a locked segment. The UI also hides the
                // remove button, but the store is the source of truth.
                const target = s.segments.find((seg) => seg.id === id);
                if (target?.locked)
                    return {};
                const segments = s.segments.filter((seg) => seg.id !== id).map((seg, i) => ({ ...seg, order: i }));
                pushHistory(segments, s.audioCues);
                // Invalidate relay if removed segment was part of it
                const relayActive = s.relaySegmentIds.includes(id);
                // G8: also clean up multi-select set + in/out can stay (time-based, not id-based)
                const nextSelectedIds = new Set(s.selectedSegmentIds);
                nextSelectedIds.delete(id);
                return {
                    segments,
                    selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
                    selectedSegmentIds: nextSelectedIds,
                    ...(relayActive ? { relayVideoUrl: null, relaySegmentIds: [] } : {}),
                };
            });
            schedulePersist(get());
        },
        updateSegment: (id, patch) => {
            set((s) => {
                const segments = s.segments.map((seg) => seg.id === id ? { ...seg, ...patch } : seg);
                pushHistory(segments, s.audioCues);
                return { segments };
            });
            schedulePersist(get());
        },
        reorderSegments: (orderedIds) => {
            set((s) => {
                const map = new Map(s.segments.map((seg) => [seg.id, seg]));
                let cursor = 0;
                const segments = orderedIds.map((id, i) => {
                    const seg = map.get(id);
                    if (!seg)
                        return null;
                    const newSeg = { ...seg, order: i, start: cursor };
                    cursor += seg.duration;
                    return newSeg;
                }).filter(Boolean);
                const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
                pushHistory(segments, s.audioCues);
                return { segments, playback: { ...s.playback, totalDuration } };
            });
            schedulePersist(get());
        },
        toggleSegmentLock: (id) => {
            let newLock = false;
            set((s) => {
                const segments = s.segments.map((seg) => {
                    if (seg.id !== id)
                        return seg;
                    newLock = !seg.locked;
                    return { ...seg, locked: newLock };
                });
                pushHistory(segments, s.audioCues);
                return { segments };
            });
            schedulePersist(get());
            return newLock;
        },
        groupSelectedSegments: () => {
            const s = get();
            const ids = Array.from(s.selectedSegmentIds);
            if (ids.length < 2)
                return null; // grouping a single segment is meaningless
            const gid = `grp_${Date.now().toString(36)}`;
            set((s) => {
                const segments = s.segments.map((seg) => s.selectedSegmentIds.has(seg.id) ? { ...seg, groupId: gid } : seg);
                pushHistory(segments, s.audioCues);
                return { segments };
            });
            schedulePersist(get());
            return gid;
        },
        ungroupSegments: (groupId) => {
            set((s) => {
                const segments = s.segments.map((seg) => seg.groupId === groupId ? { ...seg, groupId: null } : seg);
                pushHistory(segments, s.audioCues);
                return { segments };
            });
            schedulePersist(get());
        },
        splitSegmentAtPlayhead: () => {
            const state = get();
            const playhead = state.playback.currentTime;
            // Find the segment under the playhead.
            const seg = state.segments.find(s => playhead >= s.start && playhead < s.start + s.duration);
            if (!seg)
                return; // playhead outside any segment
            const splitOffset = playhead - seg.start; // seconds into the segment
            const segFrames = seg.params.frames;
            const segFps = seg.params.fps;
            // Don't split if within 0.1s of a boundary (avoids micro-segments).
            if (splitOffset < 0.1 || splitOffset > seg.duration - 0.1)
                return;
            // Split frames proportionally (rounded to nearest frame).
            const splitFrame = Math.round(splitOffset * segFps);
            const firstFrames = Math.max(1, splitFrame);
            const secondFrames = Math.max(1, segFrames - splitFrame);
            // Partition prompt beats and keyframes.
            const partitionTimeBased = (items) => {
                const before = items.filter(i => i.time < splitOffset);
                const after = items
                    .filter(i => i.time >= splitOffset)
                    .map(i => ({ ...i, time: i.time - splitOffset }));
                return [before, after];
            };
            const [beatsBefore, beatsAfter] = partitionTimeBased(seg.promptBeats ?? []);
            const [kfsBefore, kfsAfter] = partitionTimeBased(seg.keyframes ?? []);
            const firstHalf = {
                ...seg,
                params: { ...seg.params, frames: firstFrames },
                duration: firstFrames / segFps,
                promptBeats: beatsBefore,
                keyframes: kfsBefore,
                // Clear renders — the split invalidates the old video.
                videoUrl: null,
                thumbnailUrl: null,
                status: 'empty',
                error: null,
            };
            const secondHalf = {
                ...seg,
                id: uid(),
                order: seg.order + 1,
                start: seg.start + splitOffset,
                duration: secondFrames / segFps,
                params: { ...seg.params, frames: secondFrames, seed: seg.params.seed + 1 },
                promptBeats: beatsAfter,
                keyframes: kfsAfter,
                videoUrl: null,
                thumbnailUrl: null,
                assetId: undefined,
                status: 'empty',
                error: null,
            };
            set((s) => {
                const segments = [
                    ...s.segments.slice(0, seg.order),
                    firstHalf,
                    secondHalf,
                    ...s.segments.slice(seg.order + 1).map((seg, _i) => ({
                        ...seg,
                        order: seg.order + 1,
                    })),
                ];
                pushHistory(segments, s.audioCues);
                return { segments };
            });
            schedulePersist(get());
        },
        rippleDelete: (id) => {
            set((s) => {
                const target = s.segments.find((seg) => seg.id === id);
                // Locked segments resist deletion (same contract as removeSegment).
                if (!target || target.locked)
                    return {};
                const targetEnd = target.start + target.duration;
                const shift = target.duration;
                // Remove the target; shift everything that starts at or after the
                // target's end left by `shift`. We deliberately shift on `start >= targetEnd`
                // (not `> target.start`) so neighbours that touched the target's end
                // get pulled in to fill the gap exactly. Segments that started before
                // the target's end (overlaps) are left alone — ripple shouldn't
                // try to resolve overlaps, that's the user's job.
                const next = s.segments
                    .filter((seg) => seg.id !== id)
                    .map((seg) => {
                    if (seg.start >= targetEnd) {
                        return { ...seg, start: Math.max(0, seg.start - shift) };
                    }
                    return seg;
                })
                    .map((seg, i) => ({ ...seg, order: i }));
                pushHistory(next, s.audioCues);
                const nextSelectedIds = new Set(s.selectedSegmentIds);
                nextSelectedIds.delete(id);
                const relayActive = s.relaySegmentIds.includes(id);
                return {
                    segments: next,
                    selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
                    selectedSegmentIds: nextSelectedIds,
                    ...(relayActive ? { relayVideoUrl: null, relaySegmentIds: [] } : {}),
                };
            });
            schedulePersist(get());
        },
        rollEdit: (leftId, rightId, deltaSeconds) => {
            set((s) => {
                const left = s.segments.find((seg) => seg.id === leftId);
                const right = s.segments.find((seg) => seg.id === rightId);
                // Both must exist and be unlocked.
                if (!left || !right || left.locked || right.locked)
                    return {};
                // Must be adjacent: left ends where right starts (within 1ms).
                const leftEnd = left.start + left.duration;
                if (Math.abs(leftEnd - right.start) > 0.001)
                    return {};
                const minDuration = 0.5;
                // Clamp delta so neither clip drops below minDuration.
                const maxGrow = right.duration - minDuration; // how much left can grow
                const maxShrink = left.duration - minDuration; // how much left can shrink
                const clampedDelta = Math.max(-maxShrink, Math.min(maxGrow, deltaSeconds));
                if (clampedDelta === 0)
                    return {};
                const next = s.segments.map((seg) => {
                    if (seg.id === leftId) {
                        return { ...seg, duration: seg.duration + clampedDelta };
                    }
                    if (seg.id === rightId) {
                        // Right clip shifts right by delta and loses that much duration.
                        return {
                            ...seg,
                            start: seg.start + clampedDelta,
                            duration: seg.duration - clampedDelta,
                        };
                    }
                    return seg;
                });
                pushHistory(next, s.audioCues);
                return { segments: next };
            });
            schedulePersist(get());
        },
        exportTimeline: () => {
            const state = get();
            const data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                segments: state.segments,
                audioCues: state.audioCues,
                audioTracks: state.audioTracks,
            };
            return JSON.stringify(data, null, 2);
        },
        importTimeline: (json) => {
            try {
                const data = JSON.parse(json);
                if (!data || !Array.isArray(data.segments))
                    return false;
                set((s) => {
                    const segments = data.segments.map((seg, i) => ({
                        ...seg,
                        order: i, // ensure sequential ordering
                        status: normalizeSegmentStatus(seg.status), // imported JSON may carry out-of-union statuses
                    }));
                    const audioCues = Array.isArray(data.audioCues) ? data.audioCues : [];
                    const audioTracks = Array.isArray(data.audioTracks) && data.audioTracks.length > 0
                        ? data.audioTracks
                        : s.audioTracks;
                    const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
                    pushHistory(segments, audioCues);
                    return {
                        segments,
                        audioCues,
                        audioTracks,
                        selectedSegmentId: null,
                        selectedSegmentIds: new Set(),
                        storyboardStatusFilter: null,
                        inOutPoints: null,
                        playback: { ...s.playback, totalDuration, currentTime: 0, isPlaying: false },
                    };
                });
                schedulePersist(get());
                return true;
            }
            catch (e) {
                // NO SILENT SWALLOW — import can fail on malformed JSON, schema
                // mismatch, or invalid segment shape. Log the actual error so the
                // user feedback ("import failed") has a matching dev-side trace.
                console.error('[timeline] importTimeline failed:', e);
                return false;
            }
        },
        // ── E4.5: Duplicate-with-offset (seed bump) ──────────────────────────
        // Each copy gets source.seed + i (1-indexed). Copies are inserted as
        // a contiguous block right after the source; later segments shift
        // right by (count × source.duration). Render state is cleared on
        // every copy (different seed → different render).
        duplicateWithOffset: (sourceId, count) => {
            if (count <= 0)
                return [];
            const src = get().segments.find((s) => s.id === sourceId);
            if (!src)
                return [];
            const copies = [];
            for (let i = 1; i <= count; i++) {
                copies.push({
                    ...src,
                    id: uid(),
                    // order + start are finalized in the set() below (we need the
                    // contiguous insertion math), but we pre-compute the params
                    // here since they don't depend on sibling state.
                    params: {
                        ...src.params,
                        seed: src.params.seed + i,
                    },
                    // Each copy is a fresh unrendered segment.
                    videoUrl: null,
                    lipSyncedVideoUrl: null,
                    thumbnailUrl: null,
                    assetId: undefined,
                    status: 'empty',
                    error: null,
                    // A duplicate shouldn't inherit the source's variants — those
                    // are alternate takes of the original render, not this new one.
                    variants: [],
                    // Locked + groupId are intentionally NOT inherited — duplicates
                    // are free-floating clones until the user re-groups them.
                    locked: false,
                    groupId: null,
                });
            }
            set((s) => {
                const idx = s.segments.findIndex((seg) => seg.id === sourceId);
                // Proven dead (2026-09-12): the caller synchronously read the same
                // segment list via get() and returned [] unless idx >= 0; no await
                // or re-entrancy sits between, so the updater always finds it.
                /* v8 ignore next -- idx always >= 0: sync get-then-set, no interleave (2026-09-12) */
                if (idx < 0)
                    return {};
                const before = s.segments.slice(0, idx + 1); // includes the source
                const after = s.segments.slice(idx + 1);
                const totalInsertedDuration = copies.reduce((t, c) => t + c.duration, 0);
                // Shift later segments right.
                const shiftedAfter = after.map((seg) => ({
                    ...seg,
                    start: seg.start + totalInsertedDuration,
                }));
                // Assign order + start for the copies (contiguous block after src).
                let cursor = src.start + src.duration;
                const orderedCopies = copies.map((c, i) => {
                    const copy = { ...c, order: idx + 1 + i, start: cursor };
                    cursor += c.duration;
                    return copy;
                });
                // Re-index orders for everything after the inserted block.
                const finalSegments = [
                    ...before.map((seg, i) => ({ ...seg, order: i })),
                    ...orderedCopies,
                    ...shiftedAfter.map((seg, i) => ({ ...seg, order: before.length + orderedCopies.length + i })),
                ];
                const totalDuration = finalSegments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
                pushHistory(finalSegments, s.audioCues);
                return {
                    segments: finalSegments,
                    playback: { ...s.playback, totalDuration },
                };
            });
            schedulePersist(get());
            // Return the STORED copies (order + start finalized in the set()
            // above), not the pre-insertion images — callers positioning from
            // the return value must see the same starts the store holds.
            // (2026-09-12: the old code returned `copies` with every start still
            // at the source's, so returned starts disagreed with the store.)
            const ids = new Set(copies.map((c) => c.id));
            return get().segments.filter((s) => ids.has(s.id)).sort((x, y) => x.order - y.order);
        },
    };
}
//# sourceMappingURL=timelineSegments.js.map