/** The flow status of a segment — drives the E3.11 status ribbon
 * + filter. The order here is the canonical flow order. */
export declare const SEGMENT_STATUSES: readonly ["empty", "pending", "generating", "ready", "failed"];
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];
/** Coerce an unknown persisted/imported status into the SegmentStatus
 * union. Anything outside it (e.g. pre-refactor persisted "error") is
 * normalized to 'empty' — an out-of-union status silently breaks the
 * failed-state UI (the NLE clip check tests status === 'failed'). */
export declare function normalizeSegmentStatus(raw: unknown): SegmentStatus;
import type { LoRAEntry } from "./loraTypes.ts";
export interface MinMaxPeak {
    min: number;
    max: number;
}
export interface WaveformLODCache {
    low: MinMaxPeak[];
    med: MinMaxPeak[];
    high: MinMaxPeak[];
}
/** A video segment on the timeline — the core editing unit */
export interface TimelineSegment {
    id: string;
    order: number;
    start: number;
    duration: number;
    prompt: string;
    negativePrompt: string;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    /** Asset ID for generated video (references asset store) */
    assetId?: string;
    firstFrameB64: string | null;
    lastFrameB64: string | null;
    params: SegmentParams;
    trimStart: number;
    sourceStepId: string | null;
    status: SegmentStatus;
    /** Last error message if status is 'failed' */
    error: string | null;
    /** Control video URL for IC-LoRA conditioning (pose/depth/canny transfer) */
    controlVideoUrl: string | null;
    /** Lip-synced variant URL — populated by the Phase 10/11 lip-sync flow.
    * Lives alongside `videoUrl` (variants, not overwrites). Director chain
    * export prefers this when present unless `lipSyncPreferOriginal` is true. */
    lipSyncedVideoUrl: string | null;
    /** Per-segment override: when true, Director chain export keeps `videoUrl`
    * even if `lipSyncedVideoUrl` exists. Useful for A/B comparison. */
    lipSyncPreferOriginal: boolean;
    /** Mid-shot prompt beats. `time` is seconds offset from segment start.
    * Empty array = use the legacy single-prompt path. */
    promptBeats?: PromptBeat[];
    /** Visual keyframe waypoints. `time` is seconds offset from segment start.
    * Each image becomes a VAE-encoded anchor at its frame index; the VACE
    * conditioning blocks interpolate between them in a single continuous
    * generation. Empty array = no keyframe anchoring. */
    keyframes?: KeyframeMarker[];
    /** E2.6: Lock — locked segments resist drag/trim/remove/duplicate
    * operations. Use cases: anchor shots you don't want to nudge, or
    * protect a finished cut while iterating elsewhere. */
    locked?: boolean;
    /** E2.6: Group id — segments sharing a non-null groupId move together
    * when any one is dragged. Used for keeping a multi-shot sequence
    * in lockstep. */
    groupId?: string | null;
    /** E2.2: Per-boundary crossfade seconds (incoming edge). 0 = hard cut.
    * When undefined, falls back to the timeline-global `xfadeSeconds`. */
    xFade?: number;
    /** E3.2: Alternate takes generated from different seeds. The primary
    * `videoUrl` is the currently-promoted variant; this array holds the
    * full history (capped at MAX_VARIANTS_PER_SEGMENT — FIFO eviction).
    * Promoting a variant swaps it into `videoUrl` and demotes the
    * outgoing primary back into the list. */
    variants?: VideoVariant[];
    /** E3.5: Per-segment consistency anchor override. When set, this takes
    * precedence over the global toolbar anchor for THIS segment only.
    * Null/undefined = inherit the global anchor (the default). */
    consistencyAnchor?: ConsistencyAnchor | null;
    /** E3.7: Auto-generated captions for this segment's video. Timing is
    * RELATIVE TO THE SEGMENT START (not the global timeline). Built by
    * splitCaptions from a Whisper transcription. Rendered as an overlay
    * in the program monitor and optionally burned in at export. */
    captions?: CaptionCue[];
}
/** E3.5 — A face/character reference image that keeps visual identity
 * consistent across shots. Stored globally (toolbar slot) and inherited
 * by all segments unless a per-segment override exists. The b64 is a
 * data URL (e.g. `data:image/png;base64,...`) stripped to bare base64
 * when emitted in the diffusers payload as `consistency_anchor_b64`. */
export interface ConsistencyAnchor {
    /** Asset-library id (for the thumbnail + provenance). */
    assetId: string;
    /** data URL of the reference image (face/character). */
    b64: string;
}
/** E3.7 — A single caption cue. Timing is relative to the segment's start
 * (0 = segment beginning), NOT the global timeline. The program monitor
 * maps global playback time → segment-relative time before lookup. */
export interface CaptionCue {
    id: string;
    /** Start time in seconds, relative to segment start. */
    start: number;
    /** End time in seconds, relative to segment start. */
    end: number;
    /** The caption text (one line, <= ~42 chars). */
    text: string;
}
/** E3.2 — A single alternate take of a segment's video.
 * `variants[]` on TimelineSegment stores these; the picker UI lets the
 * user promote one to the segment's primary `videoUrl`.
 *
 * E3.3: variants carry a `kind` discriminator so the picker can show
 * provenance (a retake vs. a fresh seed vs. a lip-sync pass). kind is
 * optional and defaults to 'seed' — that's what E3.2's Generate-4 flow
 * produces, and it keeps the type back-compat with persisted timelines
 * from before E3.3 shipped. */
export interface VideoVariant {
    id: string;
    /** The seed used to generate this variant. */
    seed: number;
    /** The variant's video URL (data: URL or server URL). Null when the
     * persisted blob could not be restored (R-S6, 2026-10-22) — the clean
     * non-preview state, never a TLB:… placeholder leaking into render. */
    videoUrl: string | null;
    /** Optional asset ID for the variant's video (references asset store). */
    assetId?: string;
    /** When this variant was created (epoch ms). */
    createdAt: number;
    /** Optional first-frame thumbnail (for the picker UI). */
    thumbnailUrl?: string | null;
    /** E3.3: provenance tag for the picker UI. Defaults to 'seed'.
    * - 'seed' — produced by Generate Variants (E3.2) or a manual
    * seed-change + regenerate.
    * - 'retake' — produced by the G15 retake flow (inpaints a frame
    * range on an existing render).
    * - 'lipsync' — produced by Phase 10/11 lip-sync pass.
    * - 'manual' — user-imported (dragged into the picker from the asset
    * library or filesystem). */
    kind?: 'seed' | 'retake' | 'lipsync' | 'manual';
}
/** A timestamped prompt change within a single continuous shot.
 * Compiles to a T5 embedding that's blended into the diffusion loop's
 * cross-attention at the beat's frame index. */
export interface PromptBeat {
    id: string;
    /** Seconds offset from segment start. Snapped to a frame boundary at
    * compile time (T × fps). */
    time: number;
    prompt: string;
    /** Optional negative prompt scoped to this beat's window. */
    negativePrompt?: string;
    /** Transition half-width in seconds. The blend window goes
    * [time - blend, time + blend] linearly interpolating between the
    * previous beat's embedding and this beat's. 0 = hard swap. */
    blend?: number;
    /** G17: per-boundary epsilon (boundary sharpness) for Prompt Relay.
    * When defined on ANY beat, the frontend emits `epsilon` as a list to
    * the backend — one entry per beat — so each transition can have its
    * own sharpness. Small ε (e.g. 0.001) → hard cut; large ε (e.g. 0.5)
    * → slow dreamy blend. Undefined = fall back to the segment-level
    * `relayEpsilon` (scalar path, original G1 behavior). Range (0, 1). */
    epsilon?: number;
}
/** A keyframe image placed at a specific timestamp within a continuous
 * shot. Compiles to a per-frame VAE-encoded anchor in the VACE context
 * tensor — the VACE conditioning blocks steer the DiT to interpolate
 * through these waypoints. */
export interface KeyframeMarker {
    id: string;
    /** Seconds offset from segment start. */
    time: number;
    /** data-URL b64 (e.g. `data:image/png;base64,...`) — matching the
    * existing firstFrameB64 convention. */
    image: string;
    /** Strength 0.0–1.0. How tightly the DiT must honour this keyframe.
    * 1.0 = hard anchor (default), 0.3 = gentle visual nudge. */
    strength?: number;
    /** G5: Role of this keyframe in the shot. 'middle' (default) = visual
    * waypoint. 'last' = forces this keyframe to act as the shot's end
    * frame (FLF2V target), overriding the segment-level lastFrameB64.
    * 'first' = acts as the shot's first frame (useful when the first
    * keyframe in a chain should replace the segment's firstFrameB64). */
    role?: 'first' | 'middle' | 'last';
}
export interface SegmentParams {
    seed: number;
    width: number;
    height: number;
    /** Per-segment frame count (VACE Director chains segments of this length) */
    frames: number;
    fps: number;
    /** Resize/fit method: stretch, fit, crop, pad, pad-green */
    resizeMethod: 'stretch' | 'fit' | 'crop' | 'pad' | 'pad-green';
    samplingSteps: number;
    /** CFG guidance scale (VACE: 3.0–7.0 typical) */
    guideScale: number;
    /** Video model id (catalog route key; h3 is the only route) */
    model: string;
    /** Legacy speed-profile tag (base|fast) — informational; the catalog
    * Speed variant group is the source of truth for step/scheduler tiers. */
    profile: 'base' | 'fast';
    /** Motion amplitude (0.5=static, 1.0=default, 1.5=exaggerated).
    * Scales guidance internally: adj = guideScale * (0.7 + 0.3 * motion). */
    motionAmplitude: number;
    /** Use FLF2V mode (first + last frame) when lastFrameB64 is present.
    * Off = first frame only (standard I2V). */
    flfMode: boolean;
    /** Enable TeaCache server-side (~70% speedup, negligible quality loss).
    * Diffusers-engine only — silently ignored by the Omni vLLM backend. */
    teacacheEnabled: boolean;
    /** TeaCache threshold (default 0.01 matches OMNI_TEACACHE_THRESH). */
    teacacheThreshold: number;
    /** Enable progressive-resolution denoising (early steps at 1/(2^levels)
    * spatial resolution, then DCT-II upsample for detail steps). */
    progressiveEnabled: boolean;
    /** Pyramid depth (1–3). More levels = faster but coarser early pass. */
    progressiveLevels: number;
    /** Fraction of total steps spent at reduced resolution (0 < delta < 1). */
    progressiveDelta: number;
    /** Upsample strategy: 'dct' (DCT-II spectral) or 'dct_rewind' (rewind
    * latents before DCT upsample for tighter detail alignment). */
    progressiveMode: 'dct' | 'dct_rewind';
    relayEpsilon: number;
    guideStrength: number;
    guideCrf: number;
    scaleBy: number;
    upscaleMethod: 'nearest' | 'bilinear' | 'bicubic';
    useTiledEncode: boolean;
    tileSize: number;
    tileOverlap: number;
    imageAttentionStrength: number;
    /** Selected LoRAs — canonical `LoRAEntry[]` primitive (lib/loraTypes.ts).
    * Single wire format across video + image surfaces; the ComfyUI engine consumes this shape directly. */
    loras: LoRAEntry[];
    /** data-URL or bare base64 of the reference MP4. Null = no motion track. */
    motionVideoB64: string | null;
    /** 0.0–1.0 — how loosely the model interprets the reference motion. */
    motionStrength: number;
    /** G16 trim: start of the sub-range to use (seconds). 0 = from beginning. */
    motionTrimStart: number;
    /** G16 trim: end of the sub-range (seconds). 0 = until the end. */
    motionTrimEnd: number;
    /** G16 offset: time-shift the sub-clip (seconds). + = hold, − = advance. */
    motionOffset: number;
    resampleMode: 'nearest' | 'linear';
    /** Retake prompt — describes what to fix. Empty = use segment prompt. */
    retakePrompt: string;
    /** First frame index to regenerate (inclusive). 0 = start of video. */
    retakeStartFrame: number;
    /** Last frame index to regenerate (inclusive). -1 = end of video. */
    retakeEndFrame: number;
}
/** VACE FLF2V (First-Last-Frame-to-Video) modes */
export declare const FLF_MODES: readonly [{
    readonly id: "off";
    readonly label: "First frame only (standard I2V)";
}, {
    readonly id: "on";
    readonly label: "First + Last frame (FLF2V)";
}];
/** An audio cue placed at a specific time on a named track */
export interface AudioCue {
    id: string;
    track: string;
    start: number;
    duration: number;
    label: string;
    audioUrl: string | null;
    audioB64: string | null;
    volume: number;
    waveformPeaks: number[] | null;
    /** E3.14: min/max peaks at three LODs (low/med/high) for zoom-faithful
    * rendering. Computed once from the decoded PCM and stored alongside
    * the legacy waveformPeaks (kept for back-compat with motion-envelope). */
    waveformPeaksLOD?: WaveformLODCache | null;
    sourceStepId: string | null;
    /** E2.4: Linear fade-in duration in seconds (0 = no fade). Clamped
    * to half the cue's duration by the renderer. */
    fadeIn?: number;
    /** E2.4: Linear fade-out duration in seconds (0 = no fade). Clamped
    * to half the cue's duration by the renderer. */
    fadeOut?: number;
}
export interface AudioTrackDef {
    id: string;
    label: string;
    color: string;
    height: number;
    /** E2.5: per-track mute. When true, no cue on this track is audible. */
    muted?: boolean;
    /** E2.5: per-track solo. When any track has solo=true, only soloed
    * tracks pass audio. Mute wins over solo on the same track. */
    solo?: boolean;
}
export interface TimelineViewport {
    scrollX: number;
    pixelsPerSecond: number;
    canvasWidth: number;
    canvasHeight: number;
}
/** G8: In/out points — a temporal range marked on the timeline for
 * targeted operations (retake, export range, batch generate). Stored
 * in seconds (the timeline's canonical time unit). `end` is exclusive.
 * Null means no range is marked. */
export interface InOutPoints {
    start: number;
    end: number;
}
/** E2.7: Chapter marker — a labeled pin on the timeline. Useful for
 * scene boundaries, narration cues, or review notes. Persisted in the
 * timeline store; exported as part of the timeline JSON. */
export interface ChapterMarker {
    id: string;
    /** Position on the timeline in seconds. */
    time: number;
    /** Short user-facing label (e.g. "Intro", "Take 2"). */
    label: string;
    /** Optional longer note (e.g. "Dial back the bloom here"). */
    note?: string;
    /** Optional color (CSS hex). When absent, a default is derived from
    * the marker's index in the list (auto-cycling accent palette). */
    color?: string;
}
export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    totalDuration: number;
    /** E3.12: When true and inOutPoints is set, playback loops the in/out
    * region. The playback RAF loop wraps currentTime back to `start`
    * when it reaches `end`. UI-only state — not persisted (resets to
    * false on reload). */
    loopRegion: boolean;
}
export interface DragState {
    isDragging: boolean;
    segmentId: string | null;
    mouseX: number;
    mouseY: number;
    originalOrder: number;
    ghostOrder: number;
}
/** Colors for auto-assigned audio tracks */
export declare const TRACK_COLORS: string[];
export declare const DEFAULT_SEGMENT_PARAMS: SegmentParams;
/** Default values for TimelineSegment's lip-sync fields (Phase 11). */
export declare const DEFAULT_LIPSYNC_FIELDS: Pick<TimelineSegment, 'lipSyncedVideoUrl' | 'lipSyncPreferOriginal'>;
/**
 * THE EDITOR-ONLY SEGMENT KEYS (2026-10-10, the census's C5).
 *
 * `SegmentParams` is a RICHER document than the card's params: it
 * carries the segment's own geometry (`frames`, `fps`), the motion
 * track, the guide/relay controls, the upscale and retake settings —
 * most of which never ride a run at all. Until this list existed,
 * "which editor keys reach the card" was answerable only by reading
 * three modules, and a key in NEITHER the card's surface nor this
 * list was silently lost on the way to a run.
 *
 * The law is not "every editor key is a card param" — it is "every
 * editor key is CLASSIFIED": a card knob, a bridged legacy name, a
 * top-level card field, or one of these editor-only keys. The
 * timeline-vocabularies wall fails the moment a key is none of them.
 */
export declare const EDITOR_ONLY_SEGMENT_KEYS: ReadonlySet<string>;
//# sourceMappingURL=timelineTypes.d.ts.map
