import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MotionTimelineBar — the motion card's bar, pose-studio display model.
 *
 * 2026-08-14 rethink: the vendored viser Timeline (canvas-drawn, Kimodo
 * demo parity) is replaced by the LEGACY POSE STUDIO's interaction model —
 * DOM clips you can SEE and GRAB: prompt cards drag (body = move, edges =
 * resize), double-click to edit inline, hover-X to delete; keyframe lanes
 * with draggable diamonds. The user's words: "I could click and drag prompt
 * in the motion studio, was useful."
 *
 * Zoom + horizontal scroll (pose-studio parity, round 2): the bar DEFAULTS
 * to fit (every frame on screen — no hidden content), but −/%/+ zooms in;
 * past fit the content scrolls horizontally (native thin scrollbar, wheel,
 * trackpad, shift-wheel) while the label gutter stays pinned. Zooming is
 * ANCHORED to the playhead — the frame under the playhead stays put, the
 * rest grows around it.
 *
 * Pull-the-tail (2026-08-14, the "stuck at 5 seconds" fix): the end is not
 * a wall. Dragging the LAST prompt card's right edge past the end EXTENDS
 * the timeline (onExtend → the parent grows its envelope + duration_sec),
 * with auto-scroll following the cursor — the DaVinci Resolve rule that
 * the sequence is as long as its content. Non-last cards clamp as before.
 *
 * What stayed: ALL the state + persistence beneath (tlPrompts /
 * tlKeyframes / constraintPayloads in MotionCardEditor, constraints.ts
 * serialize/hydrate, MOTION_TIMELINE_TRACKS lane colors from the Kimodo
 * demo). This is a view-layer swap only — every prop is one of the
 * callbacks the viser Timeline used to receive.
 *
 * Video-timeline re-tenanting round 2 (2026-08-16, "the bar needs to be
 * TALLER, show the videos, and have a beats row UNDER the calls"): the
 * row heights grew (ruler 28 / prompts 36 — the video studio passes 64),
 * call clips render their WINDOW PREVIEW inside the clip (first frame at
 * rest, plays on hover — NLE strip behavior), and a Layer C BEATS row
 * sits under the calls: prompt segments within a call, clickable (the
 * sidebar edits them), never cut-bearers. Clicking a call OR beat clip
 * selects it (`onSelect`) — the tenant's sidebar populates that item's
 * inputs/options; the selected clip gets a ring (calls brand cyan, beats
 * cyan-300). A click on the EMPTY timeline deselects (`onSelect(null)`)
 * — the sidebar shifts back to its global mode; a real drag never
 * deselects (the post-pointerup synthetic click is suppressed).
 *
 * Theme: the DSH tokens (bg --dsw-alias-bg-layer-1, playhead
 * --dsw-alias-brand-primary), the 2026-09-13 color law. The palette is
 * themeable per mount (the 2026-09-07 styling seam: className/style on
 * the root, theme.{barBg,playhead} for the accents) — defaults render
 * byte-identical, so no tenant changes.
 */
import { useRef } from "react";
import { clsx as cn } from "clsx";
import { MOTION_TIMELINE_TRACKS } from "./viser-timeline/motionTimelineState.js";
import { BEATS_H, PROMPTS_H } from "./MotionTimelineBarLayout.js";
import { buildTicks, useTimelineScale } from "./MotionTimelineBarScale.js";
import { useTimelineDragSession } from "./MotionTimelineBarDrag.js";
import { TimelineContent, TimelineGutter, TimelinePlayhead, TimelineRuler, } from "./MotionTimelineBarChrome.js";
import { TimelineAudioLanes, TimelineBeatsLane, TimelineKeyframeLanes, TimelinePromptsLane, } from "./MotionTimelineBarLanes.js";
import css from "./timeline.module.css";
import { timelineCopy } from "../timelineCopy.js";
/** Playhead accent — the DSH brand token. */
const PLAYHEAD = "var(--dsw-alias-brand-primary)";
/** Unified background for the timeline bar and its sticky timecode chip. */
const BAR_BG = "var(--dsw-alias-bg-layer-1)";
/** Re-export surface: every symbol moved into a seam file stays
 *  importable from this path — the public API never moves. */
export { AUDIO_CARDS_H, AUDIO_H, BEATS_H, clamp, DRAG_ARM_PX, fmtTimecode, GUTTER_W, LANE_H, MAX_PPF, PROMPTS_H, rgb, RULER_H, ZOOM_STEP, } from "./MotionTimelineBarLayout.js";
export { buildTicks, useTimelineScale } from "./MotionTimelineBarScale.js";
export { useTimelineDragSession } from "./MotionTimelineBarDrag.js";
export { TimelineContent, TimelineGutter, TimelinePlayhead, TimelineRuler } from "./MotionTimelineBarChrome.js";
export { TimelineAudioLanes, TimelineBeatsLane, TimelineKeyframeLanes, TimelinePromptsLane } from "./MotionTimelineBarLanes.js";
export function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks = MOTION_TIMELINE_TRACKS, promptsLabel = timelineCopy.lanePrompts, laneHint = timelineCopy.laneHintDefault, packed = false, emptyPromptsHint = timelineCopy.emptyPromptsHint, promptsHeight = PROMPTS_H, beats, beatsLabel = timelineCopy.laneBeats, beatsHeight = BEATS_H, beatsHint = timelineCopy.beatsHintDefault, onBeatAdd, onPromptAdd, previews, selectedId = null, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioDetach, audioClipCards = false, className, style, theme, }) {
    // Theme resolution — unset keys keep the verbatim defaults.
    const barBg = theme?.barBg ?? BAR_BG;
    const playhead = theme?.playhead ?? PLAYHEAD;
    const scrollRef = useRef(null);
    // Scale (absolute pin, zoom, frame<->px) + the pointer session.
    const scale = useTimelineScale({ scrollRef, frameIdx, totalFrames, fps, initialSeconds });
    const drag = useTimelineDragSession({
        T1: scale.T1, effPpf: scale.effPpf, ppf: scale.ppf, dragScale: scale.dragScale,
        setPpf: scale.setPpf, setBasePpf: scale.setBasePpf, setDragScale: scale.setDragScale,
        prompts, audioLayers, packed, xToFrame: scale.xToFrame, keepTailVisible: scale.keepTailVisible,
        onFrameChange, onScrubStart, onScrubEnd, onSelect, onKeyframeMove,
        onPromptMove, onPromptResize, onExtend, onAudioClipMove,
    });
    const { ticks, stepSec } = buildTicks(scale.contentW, scale.effPpf, totalFrames, fps);
    return (_jsxs("div", { "data-testid": "motion-timeline-bar", className: cn(css.root, className), style: { background: barBg, ...style }, children: [_jsx(TimelineGutter, { scale: scale, scrollRef: scrollRef, frameIdx: frameIdx, promptsHeight: promptsHeight, promptsLabel: promptsLabel, beats: beats, beatsLabel: beatsLabel, beatsHeight: beatsHeight, audioLayers: audioLayers, onAudioDetach: onAudioDetach, tracks: tracks, audioClipCards: audioClipCards }), _jsxs(TimelineContent, { scrollRef: scrollRef, contentW: scale.contentW, suppressClickRef: drag.suppressClickRef, onSelect: onSelect, children: [_jsx(TimelineRuler, { ticks: ticks, stepSec: stepSec, fps: fps, frameIdx: frameIdx, barBg: barBg, frameToPx: scale.frameToPx, frameAt: scale.frameAt, seek: drag.seek, onPromptAdd: onPromptAdd }), _jsx(TimelinePromptsLane, { prompts: prompts, fps: fps, promptsHeight: promptsHeight, emptyPromptsHint: emptyPromptsHint, onPromptAdd: onPromptAdd, dragId: drag.dragId, selectedId: selectedId, previews: previews, lastPromptRef: drag.lastPromptRef, firstPromptRef: drag.firstPromptRef, frameToPx: scale.frameToPx, frameAt: scale.frameAt, startDrag: drag.startDrag, playhead: playhead, onPromptUpdate: onPromptUpdate, onPromptDelete: onPromptDelete }), beats && (_jsx(TimelineBeatsLane, { beats: beats, beatsHeight: beatsHeight, beatsHint: beatsHint, fps: fps, selectedId: selectedId, onSelect: onSelect, onBeatAdd: onBeatAdd, xToFrame: scale.xToFrame, frameToPx: scale.frameToPx })), _jsx(TimelineAudioLanes, { audioLayers: audioLayers, prompts: prompts, fps: fps, audioClipCards: audioClipCards, frameToPx: scale.frameToPx, xToFrame: scale.xToFrame, startDrag: drag.startDrag, onAudioDrop: onAudioDrop, onAudioDropAt: onAudioDropAt, onAudioFileDrop: onAudioFileDrop, onAudioClipMove: onAudioClipMove, onAudioClipDelete: onAudioClipDelete }), _jsx(TimelineKeyframeLanes, { tracks: tracks, keyframes: keyframes, laneHint: laneHint, dragId: drag.dragId, frameToPx: scale.frameToPx, xToFrame: scale.xToFrame, startDrag: drag.startDrag, onKeyframeAdd: onKeyframeAdd, onKeyframeDelete: onKeyframeDelete }), _jsx(TimelinePlayhead, { frameIdx: frameIdx, frameToPx: scale.frameToPx, playhead: playhead })] })] }));
}
//# sourceMappingURL=MotionTimelineBar.js.map
