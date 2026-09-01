// The ONE sampler/scheduler vocabulary — engine-legal values, declared once.
// Port of backend/media/comfyui/sampler_vocab.py.
//
// ZERO-DRIFT (2026-08-16): the family signatures type their params with these
// Literals, and the builder SCHEMAs serve their select options from the SAME
// lists. Before this module the options were hand-copied per builder — every
// copy drifted narrower than the engine. One declaration, both sides read it.
//
// Source of truth: the vendored ComfyUI (container /root/ComfyUI/comfy/
// samplers.py:971 KSAMPLER_NAMES, :1363 SCHEDULER_HANDLERS). ddim/uni_pc/
// euler_a are absent deliberately — ComfyUI rejects them at prompt time.

/** Engine-legal sampler names (SAMPLER Literal in Python). */
export const SAMPLER = [
  "euler", "euler_ancestral", "euler_cfg_pp", "dpmpp_2m", "dpmpp_2m_sde",
  "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpm_fast", "lcm", "er_sde",
  "lms", "heun",
] as const;

/** Engine-legal scheduler names (SCHEDULER Literal in Python). */
export const SCHEDULER = [
  "normal", "karras", "exponential", "sgm_uniform", "simple",
  "ddim_uniform", "beta", "linear_quadratic", "kl_optimal",
] as const;

export type SamplerName = (typeof SAMPLER)[number];
export type SchedulerName = (typeof SCHEDULER)[number];

/** Ready-made options lists for builder SCHEMA select Fields. */
export const SAMPLER_OPTIONS: string[] = [...SAMPLER];
export const SCHEDULER_OPTIONS: string[] = [...SCHEDULER];
