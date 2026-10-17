/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { TimelineTrack } from "@melite-plugin/timeline/ui/timeline"
import {
  CALL_KNOB_KEYS,
  DOC_FPS_DEFAULT,
  KNOB_ORDER,
  LEGACY_KNOB_KEY,
  type KnobKey,
} from '@melite/models-h3/timelineContract'
import { studioCopy } from "./studioCopy.ts"

export { CALL_KNOB_KEYS, KNOB_ORDER, LEGACY_KNOB_KEY, SECOND_PASS_KNOBS } from '@melite/models-h3/timelineContract'
export type { KnobKey } from '@melite/models-h3/timelineContract'

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
 * anchor at `start_frame` (the cut); `image` is the window's
 * ANCHOR REFERENCE — slot 1 on the reference bus (ref_image_0 on
 * the r2v node, the strongest identity pull). THE ANCHOR TRUTH
 * (2026-10-24, correcting the old "first-frame source" claim):
 * every window conditions through the reference arm — the i2v
 * first-frame input is an orphaned marker consumed by nothing — so
 * the image GUIDES the generated first frame, it never pins it. The
 * frame-conditioning subcards: `last_frame` RIDES (the compose's
 * no-drop law reads it at the seat union; the studio round-trips it
 * display-owned — see DocCall.last_frame). `first_frame_prev_sec`
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
  /** The closing-still anchor (the FL2VA pair's second seat): the
   *  compose's no-drop law (2026-10-26) READS `call.last_frame` at
   *  the seat union, so the studio round-trips it — hydrate carries,
   *  serialize re-emits; the agent plane authors it, the studio
   *  renders no control for it (display-owned like the declared refs
   *  chips). The 2026-09-15 cut is retired: a cutting hydrate made
   *  hops 2 and 5 disagree — an agent-authored anchor composed while
   *  a studio round-trip deleted it (calls-stanza audit (e)). */
  last_frame?: string
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
 * died 2026-09-17: the bundle never mounted it. `mods` (2026-10-24)
 * is the reference-mods lane: .safetensors pack PATHS under the
 * engine's models/refmods/ — engine-side files, never run artifacts
 * (no upload door, no From-flow candidates; a picked path commits
 * its stem, the compose refuses a non-.safetensors entry loud). Mods
 * spend conditioning tokens, never a bundle-bus slot, so a mods-only
 * call stays FL2VA (they never flip the arm). */
export interface CallRefs {
  images?: string
  videos?: string
  audios?: string
  mods?: string
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

/** The knob fold's faces — locale-owned since the copy cure
 *  (2026-11-05): the words ride studioCopy (one home), this record
 *  keeps the KnobKey shape the fold reads. */
export const KNOB_LABELS: Record<KnobKey, string> = {
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
}

/** One Layer A audio clip (the audio lanes' NLE block): position in
 * DOC frames, length in doc frames, gain linear (1 = unity).
 * THE THREE LANES (2026-09-22, D-M-E): a clip rides one class —
 * dialogue | sfx | music — one H3 audio input each; every class
 * runs the same stamp → pin → prompt-field → overlay machinery.
 * Default (class absent): text present → dialogue, else music. */
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
  /** The lane: dialogue | sfx | music; absent = auto (text → dialogue, else music). */
  class?: "dialogue" | "sfx" | "music"
  /** The WORDS (dialogue — exact, unabridged, matching the take) or
   * the EVENT description (sfx — what the soundscape times) or the
   * music description; absent = the clip overlays without conditioning. */
  text?: string
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
  /** The film clock; OPTIONAL by the pin law (R2) — a doc that never
   * stated one hands undefined and the DOC CLOCK'S OWN DEFAULT
   * rides inside (DOC_FPS_DEFAULT — one clock with the walk and the
   * compose; AUDIO-2's three-clock split retired). A non-positive
   * value is junk, same law. */
  fps?: number,
  /** Optional stable id for deterministic tests; production uses Date.now(). */
  id?: string,
): DocAudioClip {
  const name = stemSrc.includes("/") ? stemSrc.split("/").pop()! : stemSrc
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
  /** Document clock — doc-frame ↔ seconds math only. OPTIONAL (the
   * pin law, R2 2026-10-27): absent = no clock ever stated; readers
   * default at use (stemToClip/callsToPrompts own the
   * DOC_FPS_DEFAULT fallback — one clock, AUDIO-2). A card doc key (card.ts's own
   * list) — the RunRecipe FPS control writes it and it serializes
   * when stated; the old `fps: number` + "never serializes" pair
   * made that control's writes die silently on every save. */
  fps?: number
  seed: number
  shift_video?: number
  shift_audio?: number
  steps?: number
  denoise?: number
  sampler_name?: string
  sched_name?: string
  width?: number
  height?: number
  /** The layout length's ROUND-TRIP SEAT (layera-globals audit #1's
   *  third key): the schema row is hidden-but-served (FRAMES ARE
   *  LAYER B — no control shows it as the span's rival), the compose
   *  READS it, so the studio carries it display-owned — an
   *  agent-authored length survives a studio save; the compose's own
   *  grid gate refuses junk loud. */
  length?: number
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
  /** The dense branch's attention implementation (Layer A global —
   * the schema's own enum; 'comfy kitchen attention' is the declared
   * default). Had NO studio seat until 2026-10-16: the contract
   * wall's new two-directional law caught the pick dying
   * unserialized — the same silent-drop class as the Second Pass
   * switch. */
  attention_backend?: "pytorch attention" | "comfy kitchen attention"
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
  /** THE SECOND-PASS MASTER (operator 2026-09-22: "it is very
   * unclear if it is on or off" — and 2026-10-16: the switch was
   * STILL broken, because the 10-15 "walled at both depths" cure
   * judged the form component and never the saved doc: the key had
   * no studio seat, so ON never persisted and the post chain never
   * fired). Absent = off (the family default); true arms the whole
   * post chain — sharpening, interpolation, super-res, the refine
   * lora. */
  second_pass_enabled?: boolean
  /** The refine rider's doc keys (the service resolver's own
   * vocabulary, service.ts's T3 arm): refine_lora is a CATALOG ID
   * resolved against the served flavor rows; refine_strength and
   * refine_steps override the row's declared defaults. A row with
   * no step count and no explicit refine_steps refuses loud at the
   * compose door. */
  refine_lora?: string
  refine_strength?: number
  refine_steps?: number
  /** R2V COMBO "match"|"max" — NOT a number (numbers fail node validation). */
  ref_image_size?: string
  /** The loras MOD BAG (the operator's law: loras are MODS, never
   * card knobs) — [{id, strength, steps?}] rows resolved against the
   * family's flavor catalog at compose; the default every call
   * inherits. `steps` is the distill's married count (LORA STEPS
   * APPLIED, 2026-09-18) — the same row shape the Modifiers menu
   * writes and the family's recipe pills stamp (Rule A). */
  loras?: Array<{ id: string, strength?: number, steps?: number }>
  /** THE DECLARED REFERENCE SURFACE (2026-09-23, the operator: the
   * agent-persisted card-level refs showed NOWHERE in the studio):
   * card-level ref_images/ref_videos/ref_audios — the compose merges
   * them as PRIMARY onto every stanza's bus; the lanes display them
   * as card-level chips ahead of the per-call chips. Display-owned
   * (the studio never writes them — the agent path does); the
   * serialize rides them back so a save never drops what it shows. */
  ref_images?: string[]
  ref_videos?: string[]
  ref_audios?: string[]
  /** Card-level ref_mods (the declared mods surface — the canon's
   * REPLACE arm, the same law as the three bus lanes above: a
   * stanza's own mods lane REPLACES it per lane, an absent stanza
   * lane inherits it). Display-owned like its siblings: the studio
   * renders them as card-level chips; the agent path authors them. */
  ref_mods?: string[]
  /** Per-video trims, index-paired with ref_videos (entry i slices
   * guide i: start seconds + duration seconds before conditioning;
   * duration 0 = to the clip's end, an absent entry = the whole
   * clip). The schema row has served this seat since the trims
   * landed — the Layer-A face had NO field, NO hydrate, NO emit:
   * every drag died at save (journey audit 89d325c0 finding 1, the
   * second-pass class — served, rendered, never carried). */
  ref_video_trims?: Array<{ start_time: number, duration: number }>
  /** How far the generated voice ducks under a dialogue clip
   * (dB; −14 is the mix-desk default, the schema row's declared
   * default). Same class as ref_video_trims: a served row needs a
   * seat, or the panel lies about what the doc carries. */
  duck_depth_db?: number
  variant?: string
  /** The MODEL ROUTE key (Layer A selector): "h3-timeline" (FL2VA) vs
   * "h3-timeline-ref" (Ref2VA). Serialized as params.model — which WINS
   * at the run door (compose resolves params.model before the service
   * default), so the card's selector is authoritative for the run. */
  model?: string
  audio_stem?: string
  /** (Layer A NLE law, 2026-08-31; the stitch RESTORED 2026-09-21;
   * the DIALOGUE HALF same day; the valve's SECOND ARM 2026-09-24)
   * Positioned AUDIO CLIPS — the Music row as a DaVinci track: each
   * clip starts at its own doc frame and runs its own length. src =
   * an upstream artifact NAME or an uploaded data: URL. Two planes,
   * both real: (1) OVERLAY — one post-generation MeliteFilmAudioMix
   * (ComfyUI, torch — never ffmpeg) composes the film's audio from
   * the saved window files + the pinned clips at film time (the
   * generated track ducks under conditioned spans; the music
   * sub-bus ducks under dialogue/sfx only), seamless across window
   * seams; (2) CONDITIONING — the window whose doc span a clip
   * rides HEARS that clip (a generation-time MeliteAudioSlice in
   * its ref_audios lane: the model's lip-sync mechanism; bed +
   * dialogue + user refs must fit 3 lanes or the compose REFUSES
   * loud), and the generated voice DUCKS (−14dB) under the real
   * clip at its film span. Lip-sync FIDELITY is the model's own
   * capability — the plumbing delivers the dialogue to its ears; a
   * rendered window settles how tightly the mouth tracks. */
  audio_clips?: DocAudioClip[]
}

/** The retired Layer A spellings → the card's wire names (hydration
 * migrates; serialization writes only the wire names). The lora knob
 * pair maps through the mod bag: a legacy lora_name resolves to a
 * catalog id when the filename matches, else drops with a warning
 * (it was decorative anyway — compose never read it). */
export const LEGACY_LAYERA_KEY: Record<string, string> = {
  ...LEGACY_KNOB_KEY,
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
/** The call-attached guide slots the compose actually reads.
 *  `clip` and `audio` LEFT THIS LIST (2026-10-16, audit 3f0b7c1a
 *  ui-truth-gap #3): neither had a compose reader (no node consumes
 *  a per-call clip or audio source — the reference bus and the D-M-E
 *  audio lanes own conditioning), yet both round-tripped through
 *  hydration and rode CALL_KEYS admission, and `call.audio` painted
 *  a speaker dot on the strip: UI truth with an engine-deaf wire.
 *  The image guide survives (it IS the t4r anchor). */
export const GUIDE_KINDS = ["image"] as const
export type GuideKind = (typeof GUIDE_KINDS)[number]

/** A pinned frame on the film timeline — the forced-alignment seat
 *  (FL2VA endpoints + mid-generation guides). Hybrid model: pins
 *  compose WITH the reference lanes, never instead of them (the
 *  keyframe lane's design, 2026-11-05). `image` is an estate source
 *  in the square grammar (file/url/$spell/data:); `frame` is
 *  FILM-absolute — inside some call's [start_frame, end_frame) span,
 *  or the plan door refuses the gap loud. Legacy kinded rows
 *  ({frame, kind, source}) hydrate: image-kind rows ride source→image,
 *  clip/audio rows drop with a loud warn (the pin channel is image
 *  pins only — a clip/audio diamond had no compose meaning). */
export interface DocKeyframe {
  image: string
  frame: number
}

/** The fresh-card document: ONE window 0→90 — the t4_open draft
 * budget . The canvas IS the film: the readout shows
 * 3.8 s and 3.8 s renders. A user authoring a longer window rides
 * the UNIFORM SPAN GATE (2026-09-25): writes snap to the grid and a
 * reversed/crossed write refuses at the mutation seat — the
 * starter's 0→90 survives because it is grid-exact. Used only when
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
// (operator 2026-11-05: "CLIP GUIDE? AUDIO GUIDE? DON'T THEY
// CONFLICT?") — the ghost lanes died: a clip/audio diamond never
// had a compose meaning in the keyframe era (docCalls drops them at
// hydration with a loud warn — no compose meaning), so their lane
// rows were phantom pick surfaces. THE ONE LANE is the keyframe
// lane: image pins. The gutter name is the dictionary's (it renders
// on the vendored canvas gutter, draw.ts fillText, so it is melite
// chrome).
export const VIDEO_TIMELINE_TRACKS: TimelineTrack[] = [
  { uuid: "image", name: studioCopy.imageGuideLane, track_type: "keyframe", color: [86, 140, 245], height_scale: 0.6 },
]

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
export function trackColor(track: { color: number[] | null }): string {
  const c = track.color ?? [128, 128, 128]
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** The Layer A key setter the rail panels share (the tenant owns it). */
export type SetLayerAKey = <K extends keyof LayerA>(k: K, v: LayerA[K]) => void

/** Defined-wins layer merge (the family-gate derivation input,
 *  2026-11-06): the settled stage params (calls, keyframes, the
 *  declared ref surface) overlaid with the layer's STATED keys. A
 *  plain spread would let the layer's undefined holes erase the
 *  base's seats and mis-derive the family (t4_open for a t4r doc —
 *  the exact lie the gate exists to kill). Shared by the rail's
 *  omitFields gate and the commit seam's family reseat (useShownDoc's
 *  commit — the mount heal dissolved with B2): one merge, one truth. */
export function mergeDocLayers(
  base: Record<string, unknown> | null | undefined,
  layer: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(base ?? {}) }
  for (const [k, v] of Object.entries(layer)) {
    if (v !== undefined && v !== "") out[k] = v
  }
  return out
}
