import type { CSSProperties } from "react";
import type { TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./viser-timeline/types.js";
/** One Layer C prompt segment (video timeline) rendered in its OWN row
 * UNDER the calls: {text, start, end} within a call — a SUBSET of the
 * call, never a timeline entity itself (the call row above carries the
 * cuts). `end_frame` is INCLUSIVE (the bar's frame vocabulary — the
 * studio translates the doc's exclusive end). */
export interface TimelineBeat {
    id: string;
    callId: string;
    text: string;
    start_frame: number;
    end_frame: number;
    color?: [number, number, number];
}
export interface MotionTimelineBarProps {
    prompts: TimelinePrompt[];
    keyframes: TimelineKeyframe[];
    /** Current playhead frame. */
    frameIdx: number;
    /** Total frames T (the authoring envelope — bars map 0..T-1 across the width). */
    totalFrames: number;
    fps: number;
    /** Mount zoom (2026-09-02, operator: "the default zoom should show
     *  10 seconds — it starts out too zoomed in"): when set, the pinned
     *  scale shows this many SECONDS across the viewport — an absolute
     *  NLE default in both directions (long docs stop opening as
     *  postage stamps; short docs stop inflating to fill the width).
     *  Absent → fit at mount (the motion card's unchanged behavior).
     *  Fit re-pins from the dial as before; this only picks the FIRST
     *  pin. */
    initialSeconds?: number;
    onFrameChange: (frame: number) => void;
    /** ── SCRUB INTERACTION STATES (2026-09-01, davinci 1:1): fired around
     *  a ruler scrub's lifetime — pointerdown to pointerup/cancel. A tenant
     *  syncing a player gates its time reports STRICTLY on this pair (set a
     *  flag at start, clear at end) instead of a timer: a seek's own late
     *  onTime arriving mid-hold must never yank the thumb back. Absent →
     *  the bar is unchanged (the motion card never notices). */
    onScrubStart?: () => void;
    onScrubEnd?: () => void;
    onKeyframeAdd: (trackId: string, frame: number) => string;
    onKeyframeMove: (id: string, frame: number) => void;
    onKeyframeDelete: (id: string) => void;
    onPromptUpdate: (id: string, text: string) => void;
    onPromptMove: (id: string, startFrame: number, endFrame: number) => void;
    onPromptResize: (id: string, startFrame: number, endFrame: number) => void;
    onPromptDelete: (id: string) => void;
    /** Pull-the-tail: dragging the LAST card's right edge past the end
     *  EXTENDS the timeline (the parent grows its envelope + duration) —
     *  DaVinci Resolve's "the sequence is as long as its content". Non-last
     *  cards still clamp at the end. */
    onExtend: (newTotal: number) => void;
    /** ── Re-tenanting props (2026-08-15, the video timeline studio — S5).
     *  The bar is the interaction model, not the motion domain: another
     *  genre (video beats) drives the SAME DOM clips + diamonds with its
     *  OWN lanes/labels. All four default to the motion behavior, so the
     *  motion card is byte-for-byte unchanged. */
    /** The keyframe lanes (gutter labels + colors). Default: the motion
     *  card's 6 pose tracks. */
    tracks?: TimelineTrack[];
    /** Gutter label over the prompts row (motion: "Prompts"; video: "Calls"). */
    promptsLabel?: string;
    /** The empty-lanes hint (motion names pose constraints; video names
     *  image/clip/audio guides). */
    laneHint?: string;
    /** PACKED mode — the cards TILE the timeline with no gaps (video
     *  beats: a contiguous partition, compiler-enforced). Motion cards
     *  float in slack; their edge drags stop one frame short of the
     *  neighbor's START. A packed card's edges are SHARED BOUNDARIES —
     *  the drag may travel the FULL neighbor span (bounded by the
     *  neighbor's far edge, keeping every card ≥ 1 frame) and the parent
     *  ripples the cut (onPromptResize moves both sides). Without this
     *  the no-overlap clamps pin every interior boundary — a packed
     *  timeline would be uneditable. */
    packed?: boolean;
    /** The empty prompts-row hint. */
    emptyPromptsHint?: string;
    /** Taller prompts row (the video timeline passes 64 — room for the
     *  window preview + text; the motion card keeps the 36 default). */
    promptsHeight?: number;
    /** Layer C row — prompt segments WITHIN a call (video timeline only).
     *  Absent → no beats row at all (the motion card is unchanged). The
     *  row is a SUBSET of the calls row above: no cuts, no drag — spans
     *  edit in the sidebar; a click selects the segment. */
    beats?: TimelineBeat[];
    beatsLabel?: string;
    beatsHeight?: number;
    /** The empty-beats-row hint. */
    beatsHint?: string;
    /** Double-click the beats row at a frame → ADD a beat there (the
     *  row IS the entry point — the rail "+" is the second path, never
     *  the only one). The tenant resolves the frame → owning call and
     *  splits/promotes. Absent → no dblclick affordance (the row is a
     *  read-only lane; the cursor stays default). */
    onBeatAdd?: (frame: number) => void;
    /** Double-click the CALLS row's non-clip area (or the ruler — the
     *  frame is always computable there) → ADD a clip at that frame.
     *  Clips keep their own double-click (inline edit, stopPropagation),
     *  so this is strictly the additive gesture on surfaces no clip
     *  owns: the ruler, gaps, the margin past the end. The tenant
     *  resolves split-vs-append (2026-08-16: "We don't need the add-call
     *  button. We can use the timeline to do this."). Absent → double-
     *  clicks stay inert (the motion card's clips float in slack; its
     *  Add button still carves). */
    onPromptAdd?: (frame: number) => void;
    /** prompt uuid → video URL: the window render shown INSIDE the call
     *  clip (first frame at rest, plays on hover — NLE strip behavior).
     *  Best-effort mapping: window index ↔ call index (1:1 unless a
     *  forced mid-call split shifts it). */
    previews?: Record<string, string>;
    /** The selected clip (call or beat) — the sidebar is editing it. */
    selectedId?: string | null;
    /** Click a call or beat clip → the sidebar populates that item's
     *  inputs/options. null = a click on the empty timeline (deselect) —
     *  the tenant's sidebar shifts back to its global mode. */
    onSelect?: (id: string | null) => void;
    /** ── AUDIO LAYERS — NATIVE timeline tracks (2026-08-16: "integrate
     *  the audio into the timeline. It should be native to it, not some
     *  3rd party row"). Each layer is a row INSIDE the bar: same gutter,
     *  same scroll, SAME SCALE — its slice segments sit at frameToPx
     *  positions, aligned with the calls row above. An ARRAY so a tenant
     *  can stack layers (music + dialogue); absent → no rows (the motion
     *  card is unchanged). `stem` = the wired artifact NAME (null = the
     *  dashed drop state). */
    audioLayers?: AudioLayer[];
    /** A tray drop on a layer's lane. The tenant owns the honesty rules
     *  (URL → upstream artifact NAME; foreign URLs write nothing). */
    onAudioDrop?: (layerId: string, url: string) => void;
    /** (Layer A NLE law, 2026-08-31) A POSITIONED drop — the clip lands
     *  at the drop frame (DaVinci: where you let go is where it starts).
     *  Absent → the drop falls back to onAudioDrop (the legacy bed; the
     *  motion card never notices). */
    onAudioDropAt?: (layerId: string, url: string, frame: number) => void;
    /** (Layer A NLE law) An OS FILE drop on the layer — the upload door.
     *  The tenant reads the file (data: URL) and appends a clip at the
     *  drop frame. Absent → file drops are ignored (no bad writes). */
    onAudioFileDrop?: (layerId: string, file: File, frame: number) => void;
    /** Drag a clip body along the layer — translate, duration constant. */
    onAudioClipMove?: (layerId: string, clipId: string, frame: number) => void;
    /** Delete one clip (its hover × on the block). */
    onAudioClipDelete?: (layerId: string, clipId: string) => void;
    /** (the submenu law, 2026-11-06) A click on an audio LANE row (not
     *  a clip) opens the tenant's audio submenu — the bar is the
     *  navigation surface. Opt-in; absent → no click face. */
    onAudioLaneActivate?: (layerId: string) => void;
    /** Detach a wired layer (its × in the gutter). */
    onAudioDetach?: (layerId: string) => void;
    /** (2026-11-06, the lane-add parity law) a track head's add door —
     *  the host opens its source picker anchored at the button. */
    onTrackAdd?: (trackUuid: string, anchor: HTMLButtonElement) => void;
    /** (2026-09-22, the D-M-E card law) render audio clips as SMALL CALL
     * CARDS — gradient fill, accent left edge, glyph + name + span, 44px
     * lanes — instead of the 26px blocks. Opt-in; absent → byte-identical
     * blocks (the motion tenant never changes). */
    audioClipCards?: boolean;
    /** (SD-8 lane parity, 2026-11-08, the audioClipCards precedent) the
     * keyframe lanes ride the audio lanes' card height (44) + the 3%
     * lane tint, and their heads mirror the body — instead of the 24px
     * blocks. Opt-in; absent → byte-identical 24px blocks (the motion
     * tenant's six kf tracks never change). */
    kfLaneCards?: boolean;
    /** ── STYLING SEAM (2026-09-07, the shadcn rule): the bar is a
     *  shared component and takes className/style like every other
     *  primitive — the tenant's shell (border, rounding) rides the
     *  root; twMerge resolves conflicts. Absent → byte-identical. */
    className?: string;
    style?: CSSProperties;
    /** Palette overrides — the navy/cyan defaults ARE the 2026-08-14
     *  re-skin (barBg var(--dsw-alias-bg-layer-1), playhead
     *  var(--dsw-alias-brand-primary)); a tenant restyles (e.g. matches
     *  a themed studio) without forking the bar. Partial: unset keys
     *  keep defaults. */
    theme?: MotionTimelineBarTheme;
}
/** The bar's themeable palette (defaults: the navy/cyan tokens). */
export interface MotionTimelineBarTheme {
    /** The bar's background wash (the DSH bg-layer token). */
    barBg?: string;
    /** The playhead + seam/extend accent (the DSH brand token). */
    playhead?: string;
}
/** One persistent audio bed rendered as a native timeline track. */
export interface AudioLayer {
    id: string;
    label: string;
    /** The wired artifact NAME (null/"" = unwired — the dashed drop row). */
    stem?: string | null;
    /** (2026-09-22, the D-M-E card law) per-lane accent — any CSS color;
     * tints the gutter glyph and, in cards mode, the clip's gradient +
     * left edge. Absent → the current neutral look, byte-identical. */
    accent?: string;
    /** (2026-09-22) the lane's glyph: music (default) | mic | zap. */
    icon?: "music" | "mic" | "zap";
    /** (2026-09-22, the lane-picker law) the lane's ADD door — when
     *  present the gutter head renders an upload affordance beside the
     *  label; the click hands the BUTTON ELEMENT back (the anchor the
     *  host's source-picker menu pins to — the estate's one From flow /
     *  From media / From file grammar). Absent → no affordance,
     *  byte-identical. */
    onUpload?: (anchor: HTMLElement) => void;
    /** (Layer A NLE law, 2026-08-31) Positioned CLIPS — the DaVinci track:
     *  each clip starts at its own frame and runs its own length (across
     *  calls, under half a call, wherever). Present + non-empty → the row
     *  renders clips (draggable blocks); absent → the legacy stem bed
     *  (one bed under every cut) — byte-identical to before. */
    clips?: AudioClipView[];
}
/** One Layer A audio clip as the bar sees it (position in FRAMES on the
 *  bar's axis — the tenant translates to/from its doc space). */
export interface AudioClipView {
    id: string;
    /** Display name (the clip's label inside the block). */
    name: string;
    start_frame: number;
    dur_frames: number;
    /** 0..2 linear gain (drawn as the block's fill height; 1 = unity). */
    gain?: number;
}
/** Re-export surface: every symbol moved into a seam file stays
 *  importable from this path — the public API never moves. */
export { AUDIO_CARDS_H, AUDIO_H, BEATS_H, clamp, DRAG_ARM_PX, fmtTimecode, GUTTER_W, LANE_H, MAX_PPF, PROMPTS_H, rgb, RULER_H, ZOOM_STEP, } from "./MotionTimelineBarLayout.js";
export { buildTicks, useTimelineScale } from "./MotionTimelineBarScale.js";
export type { TimelineScaleOpts } from "./MotionTimelineBarScale.js";
export { useTimelineDragSession } from "./MotionTimelineBarDrag.js";
export type { Drag, TimelineDragSessionOpts } from "./MotionTimelineBarDrag.js";
export { TimelineContent, TimelineGutter, TimelinePlayhead, TimelineRuler } from "./MotionTimelineBarChrome.js";
export type { TimelineContentProps, TimelineGutterProps, TimelineGutterScale, TimelinePlayheadProps, TimelineRulerProps } from "./MotionTimelineBarChrome.js";
export { LaneHead } from "./LaneHead.js";
export type { LaneHeadProps } from "./LaneHead.js";
export { TimelineAudioLanes, TimelineBeatsLane, TimelineKeyframeLanes, TimelinePromptsLane } from "./MotionTimelineBarLanes.js";
export type { TimelineAudioLanesProps, TimelineBeatsLaneProps, TimelineKeyframeLanesProps, TimelinePromptsLaneProps } from "./MotionTimelineBarLanes.js";
export declare function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks, promptsLabel, laneHint, packed, emptyPromptsHint, promptsHeight, beats, beatsLabel, beatsHeight, beatsHint, onBeatAdd, onPromptAdd, previews, selectedId, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioLaneActivate, onAudioDetach, onTrackAdd, audioClipCards, kfLaneCards, className, style, theme, }: MotionTimelineBarProps): import("react").JSX.Element;
//# sourceMappingURL=MotionTimelineBar.d.ts.map
