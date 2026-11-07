/** The flow status of a segment — drives the E3.11 status ribbon
 * + filter. The order here is the canonical flow order. */
export const SEGMENT_STATUSES = ['empty', 'pending', 'generating', 'ready', 'failed'];
/** Coerce an unknown persisted/imported status into the SegmentStatus
 * union. Anything outside it (e.g. pre-refactor persisted "error") is
 * normalized to 'empty' — an out-of-union status silently breaks the
 * failed-state UI (the NLE clip check tests status === 'failed'). */
export function normalizeSegmentStatus(raw) {
    return typeof raw === 'string' && SEGMENT_STATUSES.includes(raw)
        ? raw
        : 'empty';
}
/** VACE FLF2V (First-Last-Frame-to-Video) modes */
export const FLF_MODES = [
    { id: 'off', label: 'First frame only (standard I2V)' },
    { id: 'on', label: 'First + Last frame (FLF2V)' },
];
/** Colors for auto-assigned audio tracks */
export const TRACK_COLORS = [
    '#4ade80', '#facc15', '#fb923c', '#60a5fa', '#f472b6',
    '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#38bdf8',
];
export const DEFAULT_SEGMENT_PARAMS = {
    // Resolution / timing — VACE defaults proven on RTX 4090 24GB (vace_fast.yaml)
    seed: 42,
    width: 640,
    height: 480,
    frames: 33, // ~2s at 16fps; bump to 81 for 5s clips (still fits VRAM at 640x480)
    fps: 16,
    resizeMethod: 'crop',
    // Sampling
    samplingSteps: 10, // Lightning default
    guideScale: 5.0, // VACE default CFG
    model: 'h3', // the ONLY video route (2026-09-21, operator order:
    // wan-vace is gone; timeline studio is H3 only)
    // VACE-specific
    profile: 'fast',
    motionAmplitude: 1.0,
    flfMode: false,
    // TeaCache (Phase 8 — default off; diffusers-engine only)
    teacacheEnabled: false,
    teacacheThreshold: 0.01,
    // Progressive resolution (diffusers-engine only — default off)
    progressiveEnabled: false,
    progressiveLevels: 2,
    progressiveDelta: 0.15,
    progressiveMode: 'dct',
    // Prompt Relay (G1/G2 — Diffusers-engine only)
    relayEpsilon: 0.01,
    // Image conditioning (G3/G4 — Diffusers-engine only)
    guideStrength: 1.0,
    guideCrf: 0,
    // Latent spatial upscaling (G18 — diffusers-engine only)
    scaleBy: 1.0,
    upscaleMethod: 'bicubic',
    // Tiled VAE encode (G19 — diffusers-engine only)
    useTiledEncode: false,
    tileSize: 256,
    tileOverlap: 64,
    // Dual guide-strength control (G20 — diffusers-engine only)
    imageAttentionStrength: 1.0,
    // LoRA (Omni-engine only)
    loras: [],
    // Motion guidance (G16 — diffusers-engine only)
    motionVideoB64: null,
    motionStrength: 0.7,
    motionTrimStart: 0,
    motionTrimEnd: 0,
    motionOffset: 0,
    resampleMode: 'nearest',
    // Retake (G15 — diffusers-engine only)
    retakePrompt: '',
    retakeStartFrame: 0,
    retakeEndFrame: -1,
};
/** Default values for TimelineSegment's lip-sync fields (Phase 11). */
export const DEFAULT_LIPSYNC_FIELDS = {
    lipSyncedVideoUrl: null,
    lipSyncPreferOriginal: false,
};
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
export const EDITOR_ONLY_SEGMENT_KEYS = new Set([
    // the segment's own geometry. ("order" lived here for a while but
    // is NOT a SegmentParams key — it rides the parent TimelineSegment
    // (timelineTypes.ts order: number) — the vocabularies wall's hatch
    // pin caught it blessing a key this vocabulary does not carry.)
    "frames", "fps", "resizeMethod",
    // the motion track (its own lane in the editor; a run receives the
    // composed motion, never these controls)
    "motionVideoB64", "motionStrength", "motionTrimStart", "motionTrimEnd",
    "motionOffset", "resampleMode", "scaleBy", "upscaleMethod", "useTiledEncode",
    "tileSize", "tileOverlap", "imageAttentionStrength", "flfMode", "profile",
    // the guide/relay/teacache/progressive controls — editor-side
    // conditioning, composed into the run's plan rather than sent
    "guideStrength", "guideCrf", "relayEpsilon", "teacacheEnabled",
    "teacacheThreshold", "progressiveEnabled", "progressiveLevels",
    "progressiveDelta", "progressiveMode",
    // the retake slice and the mod bag
    "retakePrompt", "retakeStartFrame", "retakeEndFrame", "loras",
    // the model the segment was authored against (the card's model
    // field is the run's truth)
    "model",
    // the editor's OWN spelling of two concepts the card names
    // differently (`samplingSteps`→`steps`, `guideScale`→`sla_sparsity`).
    // The studio authors the CARD's names in a call's knobs; these
    // live in the editor's segment model and are never sent — so they
    // are editor-only BY SPELLING, and the bridge that translates the
    // retired snake_case spellings does not apply to them.
    "samplingSteps", "guideScale", "motionAmplitude",
]);
//# sourceMappingURL=timelineTypes.js.map