/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { DocAudioClip, LayerA } from "./docModel"
import { AUDIO_MODES, stemToClip } from "./docModel"

// ── Hydration (params → tenant state) + serialization (state → params) ────

export function hydrateLayerA(raw: Record<string, unknown> | undefined): LayerA {
  const num = (k: string, d: number) => {
    const v = raw?.[k]
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) && n > 0 ? n : d
  }
  const audio_mode = AUDIO_MODES.includes(raw?.audio_mode as never)
    ? (raw!.audio_mode as LayerA["audio_mode"])
    : "none"
  return {
    preset: typeof raw?.preset === "string" && raw.preset ? raw.preset : "draft_02mp",
    fps: num("fps", 24),
    seed: num("seed", 42),
    audio_mode,
    continuity: raw?.continuity !== false,
    shift_video: raw?.shift_video != null ? Number(raw.shift_video) : undefined,
    shift_audio: raw?.shift_audio != null ? Number(raw.shift_audio) : undefined,
    sampler: typeof raw?.sampler === "string" && raw.sampler ? raw.sampler : undefined,
    scheduler: typeof raw?.scheduler === "string" && raw.scheduler ? raw.scheduler : undefined,
    sampling_steps: raw?.sampling_steps != null ? Number(raw.sampling_steps) : undefined,
    /* (knob-audit law 2026-09-02) denoise / width / height are REAL
     * card_knobs injects (Scheduler.0.denoise, MiniMaxH3ImageToVideo
     * width/height) the studio must offer, not hide. Absent = the
     * preset/engine default rides. */
    denoise: raw?.denoise != null ? Number(raw.denoise) : undefined,
    width: raw?.width != null ? Number(raw.width) : undefined,
    height: raw?.height != null ? Number(raw.height) : undefined,
    // The Attention dropdown — one of the three backends, or undefined =
    // the engine default. Legacy h3_sage_attention: true hydrates as sage.
    h3_attention: raw?.h3_attention === "kitchen" || raw?.h3_attention === "sol" || raw?.h3_attention === "sage" || raw?.h3_attention === "sla"
      ? raw.h3_attention
      : raw?.h3_sage_attention === true ? "sage" : undefined,
    h3_fp16_accumulation: raw?.h3_fp16_accumulation === true,
    h3_torch_compile: raw?.h3_torch_compile === true,
    cfg: raw?.cfg != null ? Number(raw.cfg) : undefined,
    h3_context_steps: raw?.h3_context_steps != null ? Number(raw.h3_context_steps) : undefined,
    h3_audio_context_steps: raw?.h3_audio_context_steps != null ? Number(raw.h3_audio_context_steps) : undefined,
    h3_sla_sparsity: raw?.h3_sla_sparsity != null ? Number(raw.h3_sla_sparsity) : undefined,
    h3_sla_block_size: raw?.h3_sla_block_size === "32" || raw?.h3_sla_block_size === "64" || raw?.h3_sla_block_size === "128"
      ? raw.h3_sla_block_size : undefined,
    h3_sla_min_seq_len: raw?.h3_sla_min_seq_len != null ? Number(raw.h3_sla_min_seq_len) : undefined,
    h3_sla_dense_last_steps: raw?.h3_sla_dense_last_steps != null ? Number(raw.h3_sla_dense_last_steps) : undefined,
    // node defaults are true — pinning true is a no-op, false is a real override
    h3_sla_protect_audio: raw?.h3_sla_protect_audio !== false,
    h3_sla_stabilize_motion: raw?.h3_sla_stabilize_motion !== false,
    h3_sla_reference_protection: raw?.h3_sla_reference_protection === "Off" || raw?.h3_sla_reference_protection === "Light" || raw?.h3_sla_reference_protection === "Heavy Enforcement"
      ? raw.h3_sla_reference_protection : undefined,
    h3_sla_dense_backend: raw?.h3_sla_dense_backend === "comfy_kitchen" || raw?.h3_sla_dense_backend === "pytorch" || raw?.h3_sla_dense_backend === "auto"
      ? raw.h3_sla_dense_backend : undefined,
    h3_sla_dense_steps: typeof raw?.h3_sla_dense_steps === "string" && /^\s*[0-9]+(-[0-9]+)?(\s*,\s*[0-9]+(-[0-9]+)?)*\s*$/.test(raw.h3_sla_dense_steps)
      ? raw.h3_sla_dense_steps.trim() : undefined,
    h3_sla_disable_fp16_accum: raw?.h3_sla_disable_fp16_accum === true,
    sharpen_enabled: raw?.sharpen_enabled === true,
    sharpen_method: raw?.sharpen_method === "rcas" || raw?.sharpen_method === "adaptive_usm" || raw?.sharpen_method === "high_pass" || raw?.sharpen_method === "deconvolution"
      ? raw.sharpen_method : undefined,
    sharpen_strength: raw?.sharpen_strength != null ? Number(raw.sharpen_strength) : undefined,
    sharpen_radius: raw?.sharpen_radius != null ? Number(raw.sharpen_radius) : undefined,
    sharpen_threshold: raw?.sharpen_threshold != null ? Number(raw.sharpen_threshold) : undefined,
    sharpen_iterations: raw?.sharpen_iterations != null ? Number(raw.sharpen_iterations) : undefined,
    interpolate_enabled: raw?.interpolate_enabled === true,
    interpolate_model: raw?.interpolate_model === "film_net_fp16.safetensors" || raw?.interpolate_model === "rife47.pth"
      ? raw.interpolate_model : undefined,
    interpolate_multiplier: raw?.interpolate_multiplier != null ? Number(raw.interpolate_multiplier) : undefined,
    variant: typeof raw?.variant === "string" ? raw.variant : undefined,
    model: typeof raw?.model === "string" ? raw.model : undefined,
    h3_ref_images: typeof raw?.h3_ref_images === "string" && raw.h3_ref_images.trim() ? raw.h3_ref_images : undefined,
    h3_ref_videos: typeof raw?.h3_ref_videos === "string" && raw.h3_ref_videos.trim() ? raw.h3_ref_videos : undefined,
    h3_ref_audios: typeof raw?.h3_ref_audios === "string" && raw.h3_ref_audios.trim() ? raw.h3_ref_audios : undefined,
    h3_ref_video_audios: typeof raw?.h3_ref_video_audios === "string" && raw.h3_ref_video_audios.trim() ? raw.h3_ref_video_audios : undefined,
    h3_ref_image_size: typeof raw?.h3_ref_image_size === "string" && (raw.h3_ref_image_size === "match" || raw.h3_ref_image_size === "max") ? raw.h3_ref_image_size : undefined,
    h3_ref_audio_trim_start: raw?.h3_ref_audio_trim_start != null ? Number(raw.h3_ref_audio_trim_start) : undefined,
    h3_ref_audio_trim_duration: raw?.h3_ref_audio_trim_duration != null ? Number(raw.h3_ref_audio_trim_duration) : undefined,
    lora_name: typeof raw?.lora_name === "string" && raw.lora_name.trim() ? raw.lora_name : undefined,
    lora_strength: raw?.lora_strength != null ? Number(raw.lora_strength) : undefined,
    rtx_vsr_enabled: raw?.rtx_vsr_enabled === true,
    rtx_vsr_multiplier: raw?.rtx_vsr_multiplier != null ? Number(raw.rtx_vsr_multiplier) : undefined,
    rtx_vsr_quality: typeof raw?.rtx_vsr_quality === "string" ? raw.rtx_vsr_quality : undefined,
    crf: raw?.crf != null ? Number(raw.crf) : undefined,
    // audio_stem: kept for round-trip serialization of legacy docs; it is
    // NO LONGER a user-facing control. When a doc has audio_stem but no
    // audio_clips, the stem is converted to a positioned clip at frame 0.
    audio_stem: typeof raw?.audio_stem === "string" && raw.audio_stem.trim()
      ? raw.audio_stem
      : undefined,
    audio_clips: (() => {
      const parsed = Array.isArray(raw?.audio_clips)
        ? raw.audio_clips.filter((c): c is DocAudioClip =>
            !!c && typeof c === "object"
            && typeof (c as DocAudioClip).id === "string"
            && typeof (c as DocAudioClip).name === "string"
            && typeof (c as DocAudioClip).src === "string" && (c as DocAudioClip).src.trim() !== ""
            && Number.isFinite((c as DocAudioClip).start_frame)
            && Number.isFinite((c as DocAudioClip).dur_frames)
            && (c as DocAudioClip).dur_frames > 0)
        : undefined
      // Legacy stem → clip conversion: doc has audio_stem but no clips.
      // The stem becomes a clip at frame 0 (4-second fallback duration;
      // the component's Audio probe corrects it asynchronously).
      const stem = typeof raw?.audio_stem === "string" && raw.audio_stem.trim()
        ? raw.audio_stem.trim()
        : undefined
      if (stem && (!parsed || parsed.length === 0)) {
        return [stemToClip(stem, num("fps", 24))]
      }
      return parsed?.length ? parsed : undefined
    })(),
  }
}

/** Layer A → the persisted doc shape: only non-undefined keys ride
 * (undefined = absent = the family/preset decides — the engine default
 * must never be pinned by a control that was never touched). */
export function serializeLayerA(a: LayerA): Record<string, unknown> {
  const out: Record<string, unknown> = {
    preset: a.preset,
    fps: a.fps,
    seed: a.seed,
    audio_mode: a.audio_mode,
    continuity: a.continuity,
    h3_fp16_accumulation: a.h3_fp16_accumulation,
    h3_torch_compile: a.h3_torch_compile,
    // pin-equals-default booleans: serialize always (false = real
    // override; true matches the node default = no-op)
    h3_sla_protect_audio: a.h3_sla_protect_audio,
    h3_sla_stabilize_motion: a.h3_sla_stabilize_motion,
    h3_sla_disable_fp16_accum: a.h3_sla_disable_fp16_accum,
    sharpen_enabled: a.sharpen_enabled,
    interpolate_enabled: a.interpolate_enabled,
  }
  for (const k of ["shift_video", "shift_audio", "sampler", "scheduler",
                   "sampling_steps", "denoise", "width", "height",
                   "h3_attention", "audio_stem",
                   "h3_sla_sparsity", "h3_sla_block_size",
                   "h3_sla_min_seq_len", "h3_sla_dense_last_steps",
                   "h3_sla_reference_protection", "h3_sla_dense_backend",
                   "h3_sla_dense_steps",
                   "sharpen_method", "sharpen_strength",
                   "interpolate_model", "interpolate_multiplier",
                   "h3_ref_images", "h3_ref_image_size",
                   "model"] as const) {
    if (a[k] !== undefined) out[k] = a[k]
  }
  // (Layer A NLE) positioned audio clips — only when present (an empty
  // array = no clips = absent; the engine default is silence).
  if (a.audio_clips?.length) out.audio_clips = a.audio_clips
  // Speed LoRA (2026-09-02 gate alignment): serialize the KNOB PAIR —
  // lora_name + lora_strength — both real card_knobs splices
  // (LoraLoader.0.lora_name / .strength_model). The old `loras:
  // [{name, strength}]` vocabulary serialization was refused by the
  // strict compose schema (unknown key) — a picked LoRA would have
  // bricked the run at submit. Symmetric with hydration (which always
  // read lora_name); strength absent = the loader default (1.0).
  if (a.lora_name?.trim()) {
    out.lora_name = a.lora_name.trim()
    if (a.lora_strength != null) out.lora_strength = a.lora_strength
  }
  // RTX VSR flag rides only when ON (absent = off — the family default).
  if (a.rtx_vsr_enabled === true) out.rtx_vsr_enabled = true
  return out
}
