import { DOC_FPS_DEFAULT, LEGACY_KNOB_KEY, } from '@melite/models-h3/timelineContract';
import { studioCopy } from "./studioCopy.js";
export { CALL_KNOB_KEYS, KNOB_ORDER, LEGACY_KNOB_KEY, SECOND_PASS_KNOBS } from '@melite/models-h3/timelineContract';
/** The knob fold's faces — locale-owned since the copy cure
 *  (2026-11-05): the words ride studioCopy (one home), this record
 *  keeps the KnobKey shape the fold reads. */
export const KNOB_LABELS = {
    steps: studioCopy.knobSteps,
    denoise: studioCopy.knobDenoise,
    sampler_name: studioCopy.knobSampler,
    sched_name: studioCopy.knobScheduler,
    shift_video: studioCopy.knobShiftVideo,
    shift_audio: studioCopy.knobShiftAudio,
    sla_sparsity: studioCopy.knobSlaSparsity,
    sla_block_size: studioCopy.knobSlaBlockSize,
    sla_min_seq_len: studioCopy.knobSlaMinSeqLen,
    sla_dense_last_steps: studioCopy.knobSlaDenseLastSteps,
    sla_protect_audio: studioCopy.knobSlaProtectAudio,
    sla_stabilize_motion: studioCopy.knobSlaStabilizeMotion,
    sla_reference_protection: studioCopy.knobSlaRefProtection,
    sla_dense_backend: studioCopy.knobSlaDenseBackend,
    sla_dense_steps: studioCopy.knobSlaDenseSteps,
    sla_disable_fp16_accum: studioCopy.knobSlaFullPrecAccum,
    sharpen_enabled: studioCopy.knobSharpen,
    sharpen_method: studioCopy.knobSharpenMethod,
    sharpen_strength: studioCopy.knobSharpenStrength,
    sharpen_radius: studioCopy.knobSharpenRadius,
    sharpen_threshold: studioCopy.knobSharpenNoiseGate,
    sharpen_iterations: studioCopy.knobSharpenIterations,
    interpolate_enabled: studioCopy.knobInterpolate,
    interp_model: studioCopy.knobInterpModel,
    interp_multiplier: studioCopy.knobInterpMultiplier,
    length: studioCopy.knobWindowLength,
};
/**
 * Convert a legacy audio_stem artifact name into a positioned clip at
 * frame 0. The caller owns the async duration probe (Audio metadata)
 * for precise dur_frames — this gives a visible 4-second fallback that
 * corrects on probe completion. Exported so tests can exercise the pure
 * conversion logic without mounting the full component.
 */
export function stemToClip(stemSrc, 
/** The film clock; OPTIONAL by the pin law (R2) — a doc that never
 * stated one hands undefined and the DOC CLOCK'S OWN DEFAULT
 * rides inside (DOC_FPS_DEFAULT — one clock with the walk and the
 * compose; AUDIO-2's three-clock split retired). A non-positive
 * value is junk, same law. */
fps, 
/** Optional stable id for deterministic tests; production uses Date.now(). */
id) {
    const name = stemSrc.includes("/") ? stemSrc.split("/").pop() : stemSrc;
    return {
        id: id ?? `aclip-stem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        src: stemSrc,
        start_frame: 0,
        // THE FILM CLOCK, ONE OWNER (census M12 + journey audit AUDIO-2):
        // `|| 24` stretched a 16fps film's slices by 1.5x, and the old
        // DEFAULT_SEGMENT_PARAMS.fps fallback (16) booked the UI at a
        // clock the compose never spoke — the three-clock split. The
        // fallback is the schema row's own default now, the same value
        // the walk fills and the mix divides by. A NON-POSITIVE fps is
        // not a clock either — the same default rides for every
        // unusable value.
        dur_frames: Math.round(4 * (typeof fps === "number" && fps > 0 ? fps : DOC_FPS_DEFAULT)),
        gain: 1,
    };
}
/** The retired Layer A spellings → the card's wire names (hydration
 * migrates; serialization writes only the wire names). The lora knob
 * pair maps through the mod bag: a legacy lora_name resolves to a
 * catalog id when the filename matches, else drops with a warning
 * (it was decorative anyway — compose never read it). */
export const LEGACY_LAYERA_KEY = {
    ...LEGACY_KNOB_KEY,
    rtx_vsr_enabled: "sr_switch",
    h3_ref_image_size: "ref_image_size",
};
/** H3 prompt style (Layer B ✨): rewrite ONE model call's prompt into
 * the cinematic MiniMax-H3 dialect. One call = ONE continuous shot
 * (cuts are CALL boundaries — never describe a cut inside a call);
 * concrete camera + subject + action + environment language, present
 * tense, duration-aware, no meta ("prompt", "video of") noise. */
export const H3_ENHANCE_SYSTEM = [
    "You rewrite video-generation prompts for the MiniMax H3 model.",
    "One prompt describes ONE continuous camera shot — never describe cuts, transitions, or editing inside a prompt.",
    "Style rules: present tense; concrete cinematic camera language (dolly, crane, handheld, static tripod, orbit); named subject with visible physical detail; specific action beats that fit the shot's duration; environment, lighting and atmosphere; film-stock or lens texture where it helps.",
    "Keep the original subject, intent, and any proper nouns exactly. Do not invent new characters or change the story.",
    "Length: 2-4 flowing sentences, dense but not padded. No lists, no headings, no meta-commentary.",
    "Output STRICT JSON exactly: {\"positive\": \"<the rewritten prompt>\", \"negative\": \"\"} — nothing else outside the JSON.",
].join(" ");
/** The beat's guide kinds — the planner's KEYFRAME_KINDS, in the lane /
 * panel order. Colors: image = blue, clip = amber, audio = violet. */
/** The call-attached guide slots the compose actually reads.
 *  `clip` and `audio` LEFT THIS LIST (2026-10-16, audit 3f0b7c1a
 *  ui-truth-gap #3): neither had a compose reader (no node consumes
 *  a per-call clip or audio source — the reference bus and the D-M-E
 *  audio lanes own conditioning), yet both round-tripped through
 *  hydration and rode CALL_KEYS admission, and `call.audio` painted
 *  a speaker dot on the strip: UI truth with an engine-deaf wire.
 *  The image guide survives (it IS the t4r anchor). */
export const GUIDE_KINDS = ["image"];
/** The fresh-card document: ONE window 0→90 — the t4_open draft
 * budget . The canvas IS the film: the readout shows
 * 3.8 s and 3.8 s renders. A user authoring a longer window rides
 * the UNIFORM SPAN GATE (2026-09-25): writes snap to the grid and a
 * reversed/crossed write refuses at the mutation seat — the
 * starter's 0→90 survives because it is grid-exact. Used only when
 * params carry no valid calls (never authored, or legacy malformed). */
export const STARTER_CALLS = [
    {
        text: "A single shot — describe the action, camera, and mood.",
        start_frame: 0,
        end_frame: 90,
    },
];
/** The three guide lanes — the keyframe kinds of the planner
 * (video_plan.KEYFRAME_KINDS), in lane order. Colors sit apart from the
 * prompt cycle and from each other: image = blue, clip = amber, audio =
 * violet. */
// (operator 2026-11-05: "CLIP GUIDE? AUDIO GUIDE? DON'T THEY
// CONFLICT?") — the ghost lanes died: a clip/audio diamond never
// had a compose meaning in the keyframe era (docCalls drops them at
// hydration with a loud warn — no compose meaning), so their lane
// rows were phantom pick surfaces. THE ONE LANE is the keyframe
// lane: image pins. The gutter name is the dictionary's (it renders
// on the vendored canvas gutter, draw.ts fillText, so it is melite
// chrome).
export const VIDEO_TIMELINE_TRACKS = [
    { uuid: "image", name: studioCopy.imageGuideLane, track_type: "keyframe", color: [86, 140, 245], height_scale: 0.6 },
];
/** THE TRACK COLOR, ONE SPELLING (the rail-law audit's H4,
 *  2026-10-31 — two seats re-rolled the identical rgb() template
 *  over the color triple): every VIDEO_TIMELINE_TRACKS entry a keyframe
 *  kind can find carries a color triple (the literal above), so this
 *  is a join, never a fallthrough.
 *
 * @param track the track row whose color triple stringifies.
 * @returns the rgb() string for a dot/swatch. */
/** A track's face color. A colorless track (TimelineTrack allows
 *  null) falls back to neutral gray — the caller never guards.
 * @param track the track row (color null = use the fallback).
 * @returns the rgb() string for the lane's dot/border faces. */
export function trackColor(track) {
    const c = track.color ?? [128, 128, 128];
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
/** Defined-wins layer merge (the family-gate derivation input,
 *  2026-11-06): the settled stage params (calls, keyframes, the
 *  declared ref surface) overlaid with the layer's STATED keys. A
 *  plain spread would let the layer's undefined holes erase the
 *  base's seats and mis-derive the family (t4_open for a t4r doc —
 *  the exact lie the gate exists to kill). Shared by the rail's
 *  omitFields gate and the commit seam's family reseat (useShownDoc's
 *  commit — the mount heal dissolved with B2): one merge, one truth.
 *  The layer's domain is any doc layer object (LayerA included —
 *  an interface carries no index signature, so the callers pass the
 *  layer bare, never through a Record cast). */
export function mergeDocLayers(base, layer) {
    const out = { ...(base ?? {}) };
    for (const [k, v] of Object.entries(layer)) {
        if (v !== undefined && v !== "")
            out[k] = v;
    }
    return out;
}
//# sourceMappingURL=docModel.js.map