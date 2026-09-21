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
 * was CUT 2026-09-20 — the seam is AUTOMATIC (the drift-control
 * continuation carries every non-cut join; nothing to author). The
 * optional
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
  /** Seam mode into this call: 'extend' (ABSENT = extend — the
   * drift-control continuation carries the previous window's latent,
   * automatic at the director's proven 22-frame overlap) or 'cut'
   * (an independent window, a true butt — nothing carries). */
  transition?: "extend" | "cut"
  knobs?: BeatKnobs
  /** Per-call identity refs (Ref2VA route): REPLACE the run-level refs
   * for THIS call's windows. Comma-separated source strings in the UI;
   * serialized as arrays under calls[i].refs.{images,videos,audios,video_audios}. */
  refs?: CallRefs
}

/** The per-call refs bag — comma-separated STRINGS on BOTH sides:
 * the UI form and the wire form match (the card's wireList law —
 * trimmed entries, empties absent). Legacy array-form documents
 * hydrate fine (the reader joins arrays). The video_audios bucket
 * died 2026-09-17: the bundle never mounted it. */
export interface CallRefs {
  images?: string
  videos?: string
  audios?: string
}

/** The per-call knob vocabulary the studio exposes — the card's wire
 * names (steps, sampler_name, sla_*, interp_*). Values are the RAW
 * override values; `undefined` = inherit (absent from the serialized
 * call). */
export interface BeatKnobs {
  /** per-call window length pin (frames) — the span rider law:
   * when set, the window's length is THIS, not the span-derived
   * snap (card compose honors knobs.length). */
  length?: number
  steps?: number
  /** (knob-audit law 2026-09-02) per-call denoise override — real
   * inject (Scheduler.0.denoise); the parser branch existed in
   * KNOB_ORDER but not in hydration, so a loaded doc silently DROPPED
   * it. Both directions now live. */
  denoise?: number
  sampler_name?: string
  sched_name?: string
  shift_video?: number
  shift_audio?: number
  sla_sparsity?: number
  sla_block_size?: "32" | "64" | "128"
  sla_min_seq_len?: number
  sla_dense_last_steps?: number
  sla_protect_audio?: boolean
  sla_stabilize_motion?: boolean
  sla_reference_protection?: "Off" | "Light" | "Heavy Enforcement"
  sla_dense_backend?: "comfy_kitchen" | "pytorch" | "auto"
  sla_dense_steps?: string
  sla_disable_fp16_accum?: boolean
  sharpen_enabled?: boolean
  sharpen_method?: "rcas" | "adaptive_usm" | "high_pass" | "deconvolution"
  sharpen_strength?: number
  sharpen_radius?: number
  sharpen_threshold?: number
  sharpen_iterations?: number
  interpolate_enabled?: boolean
  interp_model?: "film_net_fp16.safetensors" | "rife47.pth"
  interp_multiplier?: number
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
/* THE CALL-KNOB VOCABULARY (the Layer A/B law stroke, 2026-09-17):
 * the stanza keys the CARD's compose actually reads — the wire names,
 * no studio dialect. The retired spellings (sampling_steps / sampler /
 * scheduler / h3_sla_* / interpolate_model / interpolate_multiplier)
 * never matched the card's reads and were silently ignored by
 * compose; they migrate at hydration (LEGACY_KNOB_KEY) and never
 * serialize again. */
export const CALL_KNOB_KEYS = new Set([
  "steps", "denoise", "sampler_name", "sched_name",
  "shift_video", "shift_audio",
  "sla_sparsity", "sla_block_size",
  "sla_min_seq_len", "sla_dense_last_steps",
  "sla_protect_audio", "sla_stabilize_motion",
  "sla_reference_protection", "sla_dense_backend",
  "sla_dense_steps", "sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interp_model", "interp_multiplier",
  "length",
])

export const KNOB_ORDER = [
  "steps", "denoise", "sampler_name", "sched_name",
  "shift_video", "shift_audio",
  "sla_sparsity", "sla_block_size",
  "sla_min_seq_len", "sla_dense_last_steps",
  "sla_protect_audio", "sla_stabilize_motion",
  "sla_reference_protection", "sla_dense_backend",
  "sla_dense_steps", "sla_disable_fp16_accum",
  "sharpen_enabled", "sharpen_method", "sharpen_strength",
  "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
  "interpolate_enabled", "interp_model", "interp_multiplier",
  "length",
] as const
export type KnobKey = (typeof KNOB_ORDER)[number]

export const KNOB_LABELS: Record<KnobKey, string> = {
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
}

/** The retired knob spellings → the card's wire names. Hydration
 * migrates; serialization only ever writes the wire names. */
export const LEGACY_KNOB_KEY: Record<string, string> = {
  sampling_steps: "steps",
  sampler: "sampler_name",
  scheduler: "sched_name",
  h3_sla_sparsity: "sla_sparsity",
  h3_sla_block_size: "sla_block_size",
  h3_sla_min_seq_len: "sla_min_seq_len",
  h3_sla_dense_last_steps: "sla_dense_last_steps",
  h3_sla_protect_audio: "sla_protect_audio",
  h3_sla_stabilize_motion: "sla_stabilize_motion",
  h3_sla_reference_protection: "sla_reference_protection",
  h3_sla_dense_backend: "sla_dense_backend",
  h3_sla_dense_steps: "sla_dense_steps",
  h3_sla_disable_fp16_accum: "sla_disable_fp16_accum",
  interpolate_model: "interp_model",
  interpolate_multiplier: "interp_multiplier",
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

/** Layer A — THE DEFAULTS RAIL (the operator's law, 2026-09-17):
 * Layer A never makes a model call; it holds the DEFAULTS every Layer
 * B call inherits plus the document's own clock (fps
 * geometry) and the NLE audio bed. Every optional field is a card
 * wire key at its exact name — absent = the family default rides.
 * The retired decorative vocabulary (audio_mode, continuity,
 * h3_attention, h3_fp16_accumulation, h3_torch_compile, cfg,
 * h3_context_steps, h3_audio_context_steps, crf, lora_name, the
 * h3_ref_* run-level refs) is GONE: none of it was ever read by
 * compose — refs are per-call, loras ride the mod bag, engine
 * internals are not knobs. */
export interface LayerA {
  /** Document clock — doc-frame ↔ seconds math only; the film
   * renders at the card's pinned 24. Not serialized. */
  fps: number
  seed: number
  shift_video?: number
  shift_audio?: number
  steps?: number
  denoise?: number
  sampler_name?: string
  sched_name?: string
  width?: number
  height?: number
  /** THE SLA MASTER SWITCH (2026-09-21): Layer A only (never a per-call
   * knob — the switch arms the whole run's attention path, like
   * sr_switch). Absent = on. */
  sla_enabled?: boolean
  sla_sparsity?: number
  sla_block_size?: "32" | "64" | "128"
  sla_min_seq_len?: number
  sla_dense_last_steps?: number
  /** pin-equals-default booleans: serialize always when overridden */
  sla_protect_audio?: boolean
  sla_stabilize_motion?: boolean
  sla_reference_protection?: "Off" | "Light" | "Heavy Enforcement"
  sla_dense_backend?: "comfy_kitchen" | "pytorch" | "auto"
  sla_dense_steps?: string
  sla_disable_fp16_accum?: boolean
  sharpen_enabled?: boolean
  sharpen_method?: "rcas" | "adaptive_usm" | "high_pass" | "deconvolution"
  sharpen_strength?: number
  sharpen_radius?: number
  sharpen_threshold?: number
  sharpen_iterations?: number
  interpolate_enabled?: boolean
  interp_model?: "film_net_fp16.safetensors" | "rife47.pth"
  interp_multiplier?: number
  sr_switch?: boolean
  sr_model?: "seedvr2_ema_3b_fp16.safetensors" | "seedvr2_ema_3b_fp8_e4m3fn.safetensors"
  sr_resolution?: number
  /** R2V COMBO "match"|"max" — NOT a number (numbers fail node validation). */
  ref_image_size?: string
  /** The loras MOD BAG (the operator's law: loras are MODS, never
   * card knobs) — [{id, strength, steps?}] rows resolved against the
   * family's flavor catalog at compose; the default every call
   * inherits. `steps` is the distill's married count (LORA STEPS
   * APPLIED, 2026-09-18) — the same row shape the Modifiers menu
   * writes and the family's recipe pills stamp (Rule A). */
  loras?: Array<{ id: string, strength?: number, steps?: number }>
  variant?: string
  /** The MODEL ROUTE key (Layer A selector): "h3-timeline" (FL2VA) vs
   * "h3-timeline-ref" (Ref2VA). Serialized as params.model — which WINS
   * at the run door (compose resolves params.model before the service
   * default), so the card's selector is authoritative for the run. */
  model?: string
  audio_stem?: string
  /** (Layer A NLE law, 2026-08-31; the stitch RESTORED 2026-09-21;
   * the DIALOGUE HALF same day) Positioned AUDIO CLIPS — the Music
   * row as a DaVinci track: each clip starts at its own doc frame
   * and runs its own length. src = an upstream artifact NAME or an
   * uploaded data: URL. Two planes, both real: (1) OVERLAY — the
   * card's compose mixes each clip over the final cut at film time
   * (LoadAudio → MeliteAudioDelay at the film position → chained
   * MeliteAudioMix), seamless across window seams; (2) CONDITIONING
   * — the window whose doc span a clip rides HEARS that clip (a
   * generation-time MeliteAudioSlice in its ref_audios lane: the
   * model's lip-sync mechanism; bed + dialogue + user refs must fit
   * 3 lanes or the compose REFUSES loud), and the generated voice
   * DUCKS (−14dB) under the real clip at its film span. Lip-sync
   * FIDELITY is the model's own capability — the plumbing delivers
   * the dialogue to its ears; a rendered window settles how tightly
   * the mouth tracks. */
  audio_clips?: DocAudioClip[]
}

/** The retired Layer A spellings → the card's wire names (hydration
 * migrates; serialization writes only the wire names). The lora knob
 * pair maps through the mod bag: a legacy lora_name resolves to a
 * catalog id when the filename matches, else drops with a warning
 * (it was decorative anyway — compose never read it). */
export const LEGACY_LAYERA_KEY: Record<string, string> = {
  sampling_steps: "steps",
  sampler: "sampler_name",
  scheduler: "sched_name",
  h3_sla_sparsity: "sla_sparsity",
  h3_sla_block_size: "sla_block_size",
  h3_sla_min_seq_len: "sla_min_seq_len",
  h3_sla_dense_last_steps: "sla_dense_last_steps",
  h3_sla_protect_audio: "sla_protect_audio",
  h3_sla_stabilize_motion: "sla_stabilize_motion",
  h3_sla_reference_protection: "sla_reference_protection",
  h3_sla_dense_backend: "sla_dense_backend",
  h3_sla_dense_steps: "sla_dense_steps",
  h3_sla_disable_fp16_accum: "sla_disable_fp16_accum",
  interpolate_model: "interp_model",
  interpolate_multiplier: "interp_multiplier",
  rtx_vsr_enabled: "sr_switch",
  h3_ref_image_size: "ref_image_size",
}

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

/** The fresh-card document: ONE window 0→90 — the t4_open draft
 * budget . The canvas IS the film: the readout shows
 * 3.8 s and 3.8 s renders. A user authoring a longer window gets it
 * ungated (the operator's order 2026-09-17) — the span-vs-engine
 * receipts live in the ledger, not in any gate. Used only when
 * params carry no valid calls (never authored, or legacy malformed). */
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
