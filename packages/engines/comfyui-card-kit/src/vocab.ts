// models/vocab.ts — THE ENGINE VOCABULARIES AS CLOSED TYPES
// ("a closed set is a TYPE, not a string a wall validates").
//
// The served sampler/scheduler options with an ALPHABETIC serve
// order. This module declares the closed set as a z.union of consts:
// ONE row gives the dropdown (meta.list = options, served in
// DECLARED order — sorted) AND the membership refusal (an off-set
// value fails the union at schema parse — the compose door's
// bad-params refusal, never a silent engine 400).
//
// The membership source is the LIVE ENGINE, refreshed through the
// regen door (packages/engines/comfyui-cordis/scripts/regen-vocab.ts
// — SDK client off the endpoint config). The arrays are GENERATED:
// no hand edits, no frozen snapshot, no set-equality wall. Refresh
// is that door; drift is a loud git diff at regen time, never a
// silent fallback at run time. Never a runtime read into the schema
// (the $samplers late-resolution hole — options that "resolve at
// serve time" resolved nowhere — is the defect class this design
// removes).
//
// Consumers: cards' schemas (sampler/scheduler knobs), the
// cross-validation domains (fieldDomains reads union meta.list),
// the emitters (options off the same meta).

import z from "@deepseek-ai/schemastery";

/** The t2i/t2v sampler vocabulary — 45 members, SORTED serve order
 *  (generated: scripts/regen-vocab.ts off the live engine). */
export const SAMPLER_OPTIONS: readonly string[] = [
  "cfgpp_ud10_ab",
  "ddim",
  "ddpm",
  "deis",
  "dpm_2",
  "dpm_2_ancestral",
  "dpm_adaptive",
  "dpm_fast",
  "dpmpp_2m",
  "dpmpp_2m_cfg_pp",
  "dpmpp_2m_sde",
  "dpmpp_2m_sde_gpu",
  "dpmpp_2m_sde_heun",
  "dpmpp_2m_sde_heun_gpu",
  "dpmpp_2s_ancestral",
  "dpmpp_2s_ancestral_cfg_pp",
  "dpmpp_3m_sde",
  "dpmpp_3m_sde_gpu",
  "dpmpp_sde",
  "dpmpp_sde_gpu",
  "er_sde",
  "euler",
  "euler_ancestral",
  "euler_ancestral_cfg_pp",
  "euler_cfg_pp",
  "exp_heun_2_x0",
  "exp_heun_2_x0_sde",
  "gradient_estimation",
  "gradient_estimation_cfg_pp",
  "heun",
  "heunpp2",
  "ipndm",
  "ipndm_v",
  "lcm",
  "lms",
  "res_multistep",
  "res_multistep_ancestral",
  "res_multistep_ancestral_cfg_pp",
  "res_multistep_cfg_pp",
  "sa_solver",
  "sa_solver_pece",
  "seeds_2",
  "seeds_3",
  "uni_pc",
  "uni_pc_bh2",
];

/** The scheduler vocabulary — 9 members, SORTED serve order
 *  (generated: scripts/regen-vocab.ts off the live engine). */
export const SCHEDULER_OPTIONS: readonly string[] = [
  "beta",
  "ddim_uniform",
  "exponential",
  "karras",
  "kl_optimal",
  "linear_quadratic",
  "normal",
  "sgm_uniform",
  "simple",
];

/** The closed TYPE: one union row = the dropdown AND the refusal.
 *  (Schemastery union-of-consts: alternatives live at .list, each
 *  const carrying .value — the emitters and the cross-validation
 *  domains read the same row.) */
export const SAMPLERS = z.union(
  SAMPLER_OPTIONS.map((s) => z.const(s)),
) as unknown as z<string>;

export const SCHEDULERS = z.union(
  SCHEDULER_OPTIONS.map((s) => z.const(s)),
) as unknown as z<string>;

/** Declare a card-local closed vocabulary (the same one-row law for
 *  sets that are not engine vocabularies): options in serve order. */
export function vocabulary(options: readonly string[]): z<string> {
  if (options.length === 0) {
    throw new Error("vocab: a closed set with no members is not a type");
  }
  return z.union(options.map((o) => z.const(o))) as unknown as z<string>;
}
