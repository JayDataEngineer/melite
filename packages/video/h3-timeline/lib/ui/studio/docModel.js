import { LEGACY_KNOB_KEY, } from '@melite/models-h3/timelineContract';
// THE SEGMENT DEFAULTS are the contracts' (one owner for the film
// clock's default — the census's M12 fix reads them from here)
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts/timelineTypes";
export { CALL_KNOB_KEYS, KNOB_ORDER, LEGACY_KNOB_KEY } from '@melite/models-h3/timelineContract';
export const KNOB_LABELS = {
    steps: "Steps",
    denoise: "Denoise",
    sampler_name: "Sampler",
    sched_name: "Scheduler",
    shift_video: "Video shift",
    shift_audio: "Audio shift",
    sla_sparsity: "SLA sparsity",
    sla_block_size: "SLA block size",
    sla_min_seq_len: "SLA min seq len",
    sla_dense_last_steps: "SLA dense last steps",
    sla_protect_audio: "SLA protect audio",
    sla_stabilize_motion: "SLA stabilize motion",
    sla_reference_protection: "SLA ref protection",
    sla_dense_backend: "SLA dense backend",
    sla_dense_steps: "SLA dense steps",
    sla_disable_fp16_accum: "SLA full-prec accum",
    sharpen_enabled: "Sharpen",
    sharpen_method: "Sharpen method",
    sharpen_strength: "Sharpen strength",
    sharpen_radius: "Sharpen radius",
    sharpen_threshold: "Sharpen noise gate",
    sharpen_iterations: "Sharpen iterations",
    interpolate_enabled: "Interpolate",
    interp_model: "Interp model",
    interp_multiplier: "Interp multiplier",
    length: "Window length (frames)",
};
/**
 * Convert a legacy audio_stem artifact name into a positioned clip at
 * frame 0. The caller owns the async duration probe (Audio metadata)
 * for precise dur_frames — this gives a visible 4-second fallback that
 * corrects on probe completion. Exported so tests can exercise the pure
 * conversion logic without mounting the full component.
 */
export function stemToClip(stemSrc, fps, 
/** Optional stable id for deterministic tests; production uses Date.now(). */
id) {
    const name = stemSrc.includes("/") ? stemSrc.split("/").pop() : stemSrc;
    return {
        id: id ?? `aclip-stem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        src: stemSrc,
        start_frame: 0,
        // THE FILM CLOCK, NOT 24 (the census's M12): `|| 24` stretched a
        // 16fps film's dialogue and sfx slices by 1.5x and drifted
        // lip-sync. A NON-POSITIVE fps is not a clock either — the
        // declared segment fps is the default, for every unusable value.
        dur_frames: Math.round(4 * (typeof fps === "number" && fps > 0 ? fps : DEFAULT_SEGMENT_PARAMS.fps)),
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
export const GUIDE_KINDS = ["image", "clip", "audio"];
/** The fresh-card document: ONE window 0→90 — the t4_open draft
 * budget . The canvas IS the film: the readout shows
 * 3.8 s and 3.8 s renders. A user authoring a longer window gets it
 * ungated (the operator's order 2026-09-17) — the span-vs-engine
 * receipts live in the ledger, not in any gate. Used only when
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
// The three lanes are GUIDES, not beat types — pinned references at a
// frame, optional. The gutter names say the ROLE (uuid stays the
// document's kind vocabulary: image | clip | audio).
export const VIDEO_TIMELINE_TRACKS = [
    { uuid: "image", name: "Image guide", track_type: "keyframe", color: [86, 140, 245], height_scale: 0.6 },
    { uuid: "clip", name: "Clip guide", track_type: "keyframe", color: [219, 148, 86], height_scale: 0.6 },
    { uuid: "audio", name: "Audio guide", track_type: "keyframe", color: [150, 100, 200], height_scale: 0.6 },
];
export const KIND_OF_TRACK = {
    image: "image",
    clip: "clip",
    audio: "audio",
};
//# sourceMappingURL=docModel.js.map
