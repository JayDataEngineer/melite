/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { TimelineTrack } from "@melite-plugin/timeline/ui/timeline"

// ── The document types (the builder SCHEMA's shapes, client-side) ─────────

// (2026-09-15, the operator's cut: NO prompt segments, NO prompt
// beats — the call's prompt is ONE textarea, full stop. Old docs
// carrying per-call `beats` hydrate by JOINING their texts into the
// prompt — no word ever lost, one console warn; the wire still
// admits beats (the compiler's vocabulary), the studio just never
// authors or renders them again.)

/** One contiguous model call — ONE video generation invocation (the
 * timeline's Layer B entity: the strip card, the window, the render).
 * `end_frame` is EXCLUSIVE; the prompt is `text` (one textarea —
 * empty refuses the plan at the door). The optional guide sources
 * anchor at `start_frame` (the cut); `image` IS the first-frame
 * source (a seam image becomes that window's first_frame). The
 * frame-conditioning subcards: `last_frame` was CUT 2026-09-15 — the
 * PlagueKind gen lane (ReferenceToVideo) owns no last-frame input, so
 * the control wrote wire nothing reads. `first_frame_prev_sec`
 * = open from the last X seconds of the PREVIOUS window's rendered
 * video (a motion continuation; coherent WITH `image` — the still
 * anchors frame 0, the tail clip carries the motion). The optional
 * `knobs` dict is the per-call REPLACE (CALL_KNOB_KEYS = the run's
 * RENDER_KNOB_KEYS minus audio_mode — that one is recipe-level);
 * absent key = inherit the Layer A value. */
export interface DocCall {
  text?: string
  start_frame: number
  end_frame: number
  image?: string
  clip?: string
  audio?: string
  first_frame_prev_sec?: number
  /** Seam mode into this call: 'cut' (fresh window; prev-sec re-feeds the
   * previous VIDEO tail as an opener clip) or 'extend' (seamless latent
   * chain — prev-sec becomes SECONDS OF LATENT carried from the previous
   * window's tail via the RayH3ChainLatentAV motion-context node). */
  transition?: "extend" | "cut"
  knobs?: BeatKnobs
  /** Per-call identity refs (Ref2VA route): REPLACE the run-level refs
   * for THIS call's windows. Comma-separated source strings in the UI;
   * serialized as arrays under calls[i].refs.{images,videos,audios,video_audios}. */
  refs?: CallRefs
}

/** The per-call refs bag — comma-separated STRINGS on BOTH sides now:
 * the UI form and the wire form match (the backend stagers read
 * IsString; the 2026-09-02 audit caught this serializer writing
 * arrays the compiler silently dropped). Legacy array-form documents
 * hydrate fine (the reader joins arrays). */
export interface CallRefs {
  images?: string
  videos?: string
  audios?: string
  video_audios?: string
}

/** The per-call knob vocabulary the studio exposes. sampling_steps IS
 * the canonical steps (the backend canonicalizes the pair — one knob,
 * never two fighting siblings). Values are the RAW override values;
 * `undefined` = inherit (absent from the serialized beat). */
export interface BeatKnobs {
  sampling_steps?: number
  /** (knob-audit law 2026-09-02) per-call denoise override — real
   * inject (Scheduler.0.denoise); the parser branch existed in
   * KNOB_ORDER but not in hydration, so a loaded doc silently DROPPED
   * it. Both directions now live. */
  denoise?: number
  sampler?: string
  scheduler?: string
  shift_video?: number
  shift_audio?: number
  h3_attention?: "kitchen" | "sol" | "sage" | "sla"
  h3_fp16_accumulation?: boolean
  h3_torch_compile?: boolean
  cfg?: number
  h3_context_steps?: number
  h3_audio_context_steps?: number
  h3_sla_sparsity?: number
  h3_sla_block_size?: "32" | "64" | "128"
  h3_sla_min_seq_len?: number
  h3_sla_dense_last_steps?: number
  h3_sla_protect_audio?: boolean
  h3_sla_stabilize_motion?: boolean
  h3_sla_reference_protection?: "Off" | "Light" | "Heavy Enforcement"
  h3_sla_dense_backend?: "comfy_kitchen" | "pytorch" | "auto"
  h3_sla_dense_steps?: string
  h3_sla_disable_fp16_accum?: boolean
  sharpen_enabled?: boolean
  sharpen_method?: "rcas" | "adaptive_usm" | "high_pass" | "deconvolution"
  sharpen_strength?: number
  sharpen_radius?: number
  sharpen_threshold?: number
  sharpen_iterations?: number
  interpolate_enabled?: boolean
  interpolate_model?: "film_net_fp16.safetensors" | "rife47.pth"
  interpolate_multiplier?: number
}

/** The backend's CALL_KNOB_KEYS vocabulary — hydration accepts only
 * these (a foreign key is dropped with a warning, never re-sent).
 * (2026-09-02 parity fix) h3_attention is LAYER A ONLY — the compose
 * gate REFUSES it on calls by name ("a per-call h3_attention would
 * silently do nothing") — and legacy h3_sage_attention is not in the
 * card_knobs map at all; both are gone from the vocabulary so the UI
 * can never author a card the run door refuses. Legacy docs carrying
 * them hydrate-drop with a warning. */
/* (compose-law sync, 2026-09-01) the studio offers EXACTLY the keys the
 * h3-timeline compose gate accepts (card_knobs.yaml + cc_key_allowed).
 * Every key here is verified handled; a key the gate refuses would
 * brick the user's card at submit — removed: cfg (retired: the guider
 * bakes 1), h3_context_steps / h3_audio_context_steps (latent-chain
 * seam math is structural, not a knob), h3_fp16_accumulation /
 * h3_torch_compile (engine build flags, no inject), h3_ref_videos
 * (ref2va images only). (2026-09-02 knob audit) sharpen radius /
 * threshold / iterations RE-ADMITTED — they are real ImageSharpenKJ
 * grouped-widget sub-inputs and now carry card_knobs entries. */
export const CALL_KNOB_KEYS = new Set([
  "sampling_steps", "steps", "denoise", "sampler", "scheduler",
  "shift_video", "shift_audio",
  "h3_sla_sparsity", "h3_sla_block_size",
  "h3_sla_min_seq_len", "h3_sla_dense_last_steps",
  "h3_sla_protect_audio", "h3_sla_stabilize_motion",
  "h3_sla_reference_protection", "h3_sla_dense_backend",
  "h3_sla_dense_steps", "h3_sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interpolate_model", "interpolate_multiplier",
])

export const KNOB_ORDER = [
  "sampling_steps", "denoise", "sampler", "scheduler",
  "shift_video", "shift_audio",
  "h3_sla_sparsity", "h3_sla_block_size",
  "h3_sla_min_seq_len", "h3_sla_dense_last_steps",
  "h3_sla_protect_audio", "h3_sla_stabilize_motion",
  "h3_sla_reference_protection", "h3_sla_dense_backend",
  "h3_sla_dense_steps", "h3_sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interpolate_model", "interpolate_multiplier",
] as const
export type KnobKey = (typeof KNOB_ORDER)[number]

export const KNOB_LABELS: Record<KnobKey, string> = {
  sampling_steps: "Sampling steps",
  denoise: "Denoise",
  sampler: "Sampler",
  scheduler: "Scheduler",
  shift_video: "Video shift",
  shift_audio: "Audio shift",
  h3_sla_sparsity: "SLA sparsity",
  h3_sla_block_size: "SLA block size",
  h3_sla_min_seq_len: "SLA min seq len",
  h3_sla_dense_last_steps: "SLA dense last steps",
  h3_sla_protect_audio: "SLA protect audio",
  h3_sla_stabilize_motion: "SLA stabilize motion",
  h3_sla_reference_protection: "SLA ref protection",
  h3_sla_dense_backend: "SLA dense backend",
  h3_sla_dense_steps: "SLA dense steps",
  h3_sla_disable_fp16_accum: "SLA full-prec accum",
  sharpen_enabled: "Sharpen",
  sharpen_method: "Sharpen method",
  sharpen_strength: "Sharpen strength",
  sharpen_radius: "Sharpen radius",
  sharpen_threshold: "Sharpen noise gate",
  sharpen_iterations: "Sharpen iterations",
  interpolate_enabled: "Interpolate",
  interpolate_model: "Interp model",
  interpolate_multiplier: "Interp multiplier",
}

// The same option lists as the card form's engine fold (the builder
// SCHEMA is the source of truth; these mirror it for the compact studio
// controls — adding an engine option updates both).
export const SAMPLER_OPTIONS = [
  "euler", "euler_cfg_pp", "euler_ancestral",
  "dpmpp_2m", "dpmpp_2m_sde", "heun",
]
export const SCHEDULER_OPTIONS = [
  "simple", "beta", "linear_quadratic", "normal",
  "sgm_uniform", "karras", "exponential", "kl_optimal", "ddim_uniform",
]

/** One Layer A audio clip (the Music row's NLE block): position in DOC
 * frames, length in doc frames, gain linear (1 = unity). */
export interface DocAudioClip {
  id: string
  /** Display name (the artifact name or the uploaded filename). */
  name: string
  /** An upstream artifact NAME or an uploaded data: URL. */
  src: string
  start_frame: number
  dur_frames: number
  /** 0..2 linear gain; absent = unity. */
  gain?: number
}

/**
 * Convert a legacy audio_stem artifact name into a positioned clip at
 * frame 0. The caller owns the async duration probe (Audio metadata)
 * for precise dur_frames — this gives a visible 4-second fallback that
 * corrects on probe completion. Exported so tests can exercise the pure
 * conversion logic without mounting the full component.
 */
export function stemToClip(
  stemSrc: string,
  fps: number,
  /** Optional stable id for deterministic tests; production uses Date.now(). */
  id?: string,
): DocAudioClip {
  const name = stemSrc.includes("/") ? stemSrc.split("/").pop()! : stemSrc
  return {
    id: id ?? `aclip-stem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    src: stemSrc,
    start_frame: 0,
    dur_frames: Math.round(4 * (fps || 24)),
    gain: 1,
  }
}

/** Layer A — the run-level document keys (REPLACE/ACCUMULATE/MIX, §10.1).
 * Optional fields are the "empty = engine/preset decides" ones: absent
 * on serialize → the family/preset supplies them. */
export interface LayerA {
  preset: string
  fps: number
  seed: number
  audio_mode: "none" | "native" | "lipSync"
  continuity: boolean
  shift_video?: number
  shift_audio?: number
  sampler?: string
  scheduler?: string
  sampling_steps?: number
  /* (knob-audit law 2026-09-02) real card_knobs injects the studio
   * now offers at Layer A too — see hydrateLayerA. */
  denoise?: number
  width?: number
  height?: number
  h3_attention?: "kitchen" | "sol" | "sage" | "sla"
  h3_fp16_accumulation: boolean
  h3_torch_compile: boolean
  cfg?: number
  h3_context_steps?: number
  h3_audio_context_steps?: number
  h3_sla_sparsity?: number
  h3_sla_block_size?: "32" | "64" | "128"
  h3_sla_min_seq_len?: number
  h3_sla_dense_last_steps?: number
  h3_sla_protect_audio: boolean
  h3_sla_stabilize_motion: boolean
  h3_sla_reference_protection?: "Off" | "Light" | "Heavy Enforcement"
  h3_sla_dense_backend?: "comfy_kitchen" | "pytorch" | "auto"
  h3_sla_dense_steps?: string
  h3_sla_disable_fp16_accum: boolean
  sharpen_enabled: boolean
  sharpen_method?: "rcas" | "adaptive_usm" | "high_pass" | "deconvolution"
  sharpen_strength?: number
  sharpen_radius?: number
  sharpen_threshold?: number
  sharpen_iterations?: number
  interpolate_enabled: boolean
  interpolate_model?: "film_net_fp16.safetensors" | "rife47.pth"
  interpolate_multiplier?: number
  variant?: string
  /** The MODEL ROUTE key (Layer A selector): "h3-timeline" (FL2VA) vs
   * "h3-timeline-ref" (Ref2VA). Serialized as params.model — which WINS
   * at the run door (compose resolves params.model before the service
   * default), so the card's selector is authoritative for the run. */
  model?: string
  h3_ref_images?: string
  h3_ref_videos?: string
  h3_ref_audios?: string
  h3_ref_video_audios?: string
  /** R2V COMBO "match"|"max" — NOT a number (numbers fail node validation). */
  h3_ref_image_size?: string
  h3_ref_audio_trim_start?: number
  h3_ref_audio_trim_duration?: number
  audio_stem?: string
  /** (Layer A NLE law, 2026-08-31) Positioned AUDIO CLIPS — the Music
   * row as a DaVinci track: each clip starts at its own doc frame and
   * runs its own length (across calls, under half a call, wherever).
   * src = an upstream artifact NAME or an uploaded data: URL. These MIX
   * OVER the final cut at their positions (the stitch honors them) —
   * distinct from audio_stem, which also CONDITIONS every window. */
  audio_clips?: DocAudioClip[]
  /** Speed adapter (plaguekind parity): [{name, strength}] rides the
   * plan doc; the graph applies it via the shared applyLoras helper. */
  lora_name?: string
  lora_strength?: number
  rtx_vsr_enabled?: boolean
  rtx_vsr_multiplier?: number
  rtx_vsr_quality?: string
  crf?: number
}

export const AUDIO_MODES = ["none", "native", "lipSync"] as const

/** Speed LoRA choices — the mod.yaml SSOT for the h3 lane's speed
 *  adapters (packages/comfyui/models/video/h3/mods/loras/mod.yaml).
 *  The `value` is the ComfyUI LoRA filename (what LoraLoader.0.lora_name
 *  receives); the `label` is the human-readable name from mod.yaml.
 *  Empty = no speed LoRA (the lane default). */
export const SPEED_LORA_OPTIONS = [
  { value: "h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors", label: "H3 Turbo 8-step (LightX2V v1.0)" },
  { value: "h3/minimax_h3_fl2v_turbo_4step_v1.1_768p_comfyui_bf16.safetensors", label: "H3 Turbo 4-step 768p (LightX2V v1.1)" },
] as const

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
].join(" ")

/** The beat's guide kinds — the planner's KEYFRAME_KINDS, in the lane /
 * panel order. Colors: image = blue, clip = amber, audio = violet. */
export const GUIDE_KINDS = ["image", "clip", "audio"] as const
export type GuideKind = (typeof GUIDE_KINDS)[number]

/** One guide anchor. `source` empty = a TODO (the run gate names it). */
export interface DocKeyframe {
  frame: number
  kind: "image" | "clip" | "audio"
  source: string
}

/** The fresh-card document: ONE window 0→90 — the t4_open physics
 * budget, the widest span a single window renders (both the py canvas
 * 168 and the on-grid 175 died live inside the sampler, receipts
 * 2026-09-17; a longer film is TWO chained windows — this card's
 * genre). The canvas IS the film: the readout shows 3.8 s and 3.8 s
 * renders. Used only when params carry no valid calls (never
 * authored, or legacy malformed). */
export const STARTER_CALLS: DocCall[] = [
  {
    text: "A single shot — describe the action, camera, and mood.",
    start_frame: 0,
    end_frame: 90,
  },
]

/** The three guide lanes — the keyframe kinds of the planner
 * (video_plan.KEYFRAME_KINDS), in lane order. Colors sit apart from the
 * prompt cycle and from each other: image = blue, clip = amber, audio =
 * violet. */
// The three lanes are GUIDES, not beat types — pinned references at a
// frame, optional. The gutter names say the ROLE (uuid stays the
// document's kind vocabulary: image | clip | audio).
export const VIDEO_TIMELINE_TRACKS: TimelineTrack[] = [
  { uuid: "image", name: "Image guide", track_type: "keyframe", color: [86, 140, 245], height_scale: 0.6 },
  { uuid: "clip", name: "Clip guide", track_type: "keyframe", color: [219, 148, 86], height_scale: 0.6 },
  { uuid: "audio", name: "Audio guide", track_type: "keyframe", color: [150, 100, 200], height_scale: 0.6 },
]

export const KIND_OF_TRACK: Record<string, DocKeyframe["kind"]> = {
  image: "image",
  clip: "clip",
  audio: "audio",
}

/** The Layer A key setter the rail panels share (the tenant owns it). */
export type SetLayerAKey = <K extends keyof LayerA>(k: K, v: LayerA[K]) => void
