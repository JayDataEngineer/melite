// The h3 family's CHAIN-UPSCALE renderer seat (the F19 arm — a
// whole-film deferred 2x second pass over a PRIOR chain run, scene
// by scene through the upstream loop family): CheckpointManager →
// UpscaleAdapter (profile h3_2x, backend h3_latent) → UpscaleCurrent
// → ReferenceConditioning → the learned LatentUpscaler3D →
// ConditioningSyncFromLatents → Pass2Prepare → the sampler tail →
// decode → UpscaleSegmentSave → UpscaleLoopEnd (top_level_requeue —
// the estate's requeue driver completes it, patching the ADAPTER's
// start_clip per owed scene) → ChainAssemble.
//
// THE SELECTION LAW (the headless seam): the CheckpointManager's
// selection_json is emitted as the entry's BARE CHAIN-RUN NAME. The
// per-scene revision ids live only in the engine's own checkpoint
// store (the pack serves no listing route; the browser UI authors
// the JSON by hand), so the estate's execute door resolves the name
// to the newest-per-scene lineage against the vendored
// /melite/h3-chain-checkpoints route BEFORE submit (comfyui-execute
// resolveH3ChainSelections) — an authored JSON spelling passes
// through untouched, an unknown run refuses loud there.
//
// THE UPSCALE LAW (three clauses, the refine arm's own posture):
//  1. THE FAMILY PLANE, NEVER A HAND-ROLLED STACK: the model seat
//     rides h3MaskedEditPlane (UNET + SLA + chunked + the lora bag +
//     AdaLN + sigma shift — the operator's lora law), the text seat
//     its CLIPLoader, the VAEs its loaders. The one deviation is the
//     SAMPLER: res_multistep, this loop family's own recipe spelling
//     (the pack's Deferred Upscale recipe pins it for the low-denoise
//     pass-2; the plane's euler select stays unconsumed — the plane
//     owns model-shaped seats, not the sampler pick of a loop family
//     it never met).
//  2. PARTIAL DENOISE ONLY: denoise defaults 0.24 (the recipe's own
//     pass-2 window), steps 20, scheduler 'simple'. A denoise >= 1
//     refuses LOUD at this door — the same law as the refine arm (a
//     full-denoise re-render is a reshoot, and the reshoot door
//     exists).
//  3. ONE VARIANT PATH: scale 2.0 under 'scale by multiplier' with
//     the family's single upscaler weights spelling
//     (REFINE_UPSCALE_MODEL, bf16 on cuda — the one file the engine's
//     model store carries; the recipe's fp16 spelling names a file
//     this estate does not have). Blank prompt reuses the source
//     run's own per-scene prompts (the conditioning node's documented
//     posture); the entry's prompt, when bound, overrides every
//     scene's pass-2 text.
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { h3MaskedEditPlane } from './chainEdit.js'
import { REFINE_UPSCALE_MODEL } from './refine.js'

/** The upscale entry's required seats (the reshoot idiom: an armed
 *  doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['chain_run', 'the prior chain run whose checkpointed scenes the 2x pass resumes — the engine-side run name (its h3_chains store directory), resolved to the newest per-scene lineage at the execute door'],
] as const

const num = (e: Record<string, unknown>, key: string, d: number): number =>
  typeof e[key] === 'number' ? (e[key] as number) : d

const str = (e: Record<string, unknown>, key: string, d: string): string =>
  typeof e[key] === 'string' ? (e[key] as string) : d

/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/refine/reshoot arms (a commission is armed
 *  when its bag is a NON-EMPTY ARRAY). Absent or empty bag = the
 *  compose never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the upscale bag carries at least one entry */
export function upscaleArmed(p: Record<string, unknown>): boolean {
  const bag = p.upscale
  return Array.isArray(bag) && bag.length > 0
}

/** The chain-upscale renderer: validates the bound entry, then
 *  composes the deferred 2x loop over the named prior run. The film
 *  path never reaches here (the card branches on a non-empty upscale
 *  bag, and a bag beside any other edit arm refuses loud: one door
 *  per doc). The emission ends in ChainAssemble at `<runId>/upscale`
 *  (copy_to_output — the estate's film law; the recipe's dated
 *  filename and no-copy posture is a browser-session spelling, not an
 *  estate one).
 * @param entry the upscale mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this loop renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3ChainUpscale(
  entry: Record<string, unknown>,
  p: Record<string, unknown>,
  facts: H3Facts,
  g: GraphBuilder,
  runId: string,
): void {
  for (const [seat, what] of REQUIRED_SEATS) {
    const v = entry[seat]
    if (typeof v !== 'string' || v.trim() === '') {
      throw new Error(
        `h3-timeline upscale: '${seat}' names no run — ${what}; an upscale needs the prior chain run bound`,
      )
    }
  }
  const denoise = num(entry, 'denoise', 0.24)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline upscale: denoise ${denoise} >= 1 — a second pass is an upscale, never a re-render (the recipe's pass-2 window is 0.24; a full-noise sigma discards the learned upscaled latent — that is a reshoot, and the reshoot door exists)`,
    )
  }
  const steps = num(entry, 'steps', 20)
  const segmentCrf = num(entry, 'segment_crf', 18)
  const prompt = str(entry, 'prompt', '')

  // ── the family's own plane (the shared masked-edit seat — the
  // operator's lora law; a seat NEVER hand-rolls a stack) ──
  const { sigmaModel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, 6)

  // ── the head (the F19 selection law: the bare run name, resolved
  // to the newest per-scene lineage at the execute door) + the loop
  // family's own adapter/current spine ──
  const manager = g.node('MiniMaxH3ChainCheckpointManager', {
    selection_json: entry['chain_run'] as string,
  })
  const adapter = g.node('MiniMaxH3ChainUpscaleAdapter', {
    source_manifest: manager.out(0),
    profile: 'h3_2x', backend: 'h3_latent', recipe_json: '{}',
    start_clip: 1, end_clip: 0, save_latent: false,
    segment_crf: segmentCrf, start_mode: 'resume',
  })
  const cur = g.node('MiniMaxH3ChainUpscaleCurrent', {
    state: adapter.out(1),
  })

  // ── the conditioning rebuild (the node's own defaults for its
  // reference policy seats — the recipe's spellings: missing caches
  // rebuild text-only, motion refs keep audio, refs stay strict).
  // Blank prompt reuses the source run's own scene prompts ──
  const conditioning = g.node('MiniMaxH3ChainUpscaleReferenceConditioning', {
    state: cur.out(0), clip, video_vae: vaeVideo,
    missing_cache: 'text_only', motion_ref_mode: 'exclude_video_keep_audio',
    prompt_override: prompt,
    override_ref_image_size: 'inherit', override_reference_policy: 'strict',
    override_semantic_anchor_size: 'inherit',
    override_semantic_anchor_mode: 'inherit',
  }).out(0)

  // ── the learned 2x upscale (ONE variant path: multiplier 2.0, the
  // family's single weights spelling, offload after — the recipe's
  // own posture, freeing VRAM for pass 2) + the conditioning sync ──
  const upscaled = g.node('MinimaxH3LatentUpscaler3D', {
    latent: cur.out(2),
    model_name: REFINE_UPSCALE_MODEL,
    // F23 — the combo's child rides its DOTTED path (see refine.ts)
    mode: 'scale by multiplier', 'mode.scale': 2.0,
    align: 32, keep_proportion: true,
    device: 'cuda', precision: 'bf16', offload_after_upscale: true,
  }).out(0)
  const synced = g.node('H3ConditioningSyncFromLatents', {
    original_latent: cur.out(2), upscaled_latent: upscaled,
    positive: conditioning,
    method: 'bilinear', motion_ref_mode: 'conditioning_policy',
  }).out(0)

  // ── pass 2 (the recipe's tail: Pass2Prepare over the upscaled
  // latent + the source's untouched audio latent, then the sampler —
  // DisableNoise because Pass2Prepare owns the noise member, the
  // res_multistep select, the 'simple' schedule at the entry's
  // denoise/steps) ──
  const noise = g.node('RandomNoise', { noise_seed: cur.out(9) }).out(0)
  const sigmas = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: 'simple', steps, denoise,
  }).out(0)
  const pass2 = g.node('MiniMaxH3ChainPass2Prepare', {
    upscaled_video: upscaled, source_audio: cur.out(3),
    model: sigmaModel, noise, sigmas, state: cur.out(0),
  }).out(0)
  const sampled = g.node('SamplerCustomAdvanced', {
    noise: g.node('DisableNoise', {}).out(0),
    guider: g.node('BasicGuider', { model: sigmaModel, conditioning: synced }).out(0),
    sampler: g.node('KSamplerSelect', { sampler_name: 'res_multistep' }).out(0),
    sigmas, latent_image: pass2,
  }).out(0)
  const decoded = g.node('VAEDecode', { samples: sampled, vae: vaeVideo }).out(0)

  // ── the loop tail (top_level_requeue — the estate's requeue driver
  // claims each owed scene and patches the ADAPTER's start_clip; the
  // upscale family's LoopEnd rides the same durable h3_chain rows as
  // the scene chain) + the estate's assemble law ──
  const segment = g.node('MiniMaxH3ChainUpscaleSegmentSave', {
    state: cur.out(0), images: decoded, upscaled_latent: sampled,
  }).out(0)
  const loopEnd = g.node('MiniMaxH3ChainUpscaleLoopEnd', {
    flow: adapter.out(0), state: cur.out(0),
    images: decoded, segment, upscaled_latent: sampled,
  }).out(0)
  g.node('MiniMaxH3ChainAssemble', {
    manifest: loopEnd,
    audio_source: 'plan', filename: `${runId}/upscale`,
    audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
    blend_schedule: 'plan', boundary_tone_match: 'off',
    color_stabilization: 'off', delete_checkpoints_after_assembly: false,
    generated_audio_join: 'av_overlap',
  })
}
