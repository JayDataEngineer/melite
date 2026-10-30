// The h3 family's REFINE renderer seat (the refine arm — a
// standalone second pass over a staged source clip): the report-named
// H3 latent-upscale refine chain's minimal emission. The full
// second-pass stack exists engine-side with no card surface — the
// RefineHandoff node (MinimaxH3LatentUpscaler3DRefineHandoff: learned
// 3D-conv latent upscale + the low-sigma MiniMax H3 refinement pass
// in ONE node, sampler/sigmas seats) — and this seat is its one
// door. The deferred ChainUpscale LOOP family
// (MiniMaxH3ChainUpscaleAdapter/Current/Handoff/LoopEnd over a
// CheckpointManager-verified lineage, recursive expand) is the named
// follow-up, not this arm: the loop roots at a prior run's manifest
// and the estate's requeue driver only drives h3_chain rows, so a
// from-scratch clip cannot enter it without new estate surface.
//
// THE REFINE LAW (three clauses):
//  1. ONE VARIANT PATH: scale 2.0 under mode 'scale by multiplier'
//     (the film handoff's own spelling, actions.ts), lock_audio true
//     (the repair's posture — the soundtrack is the source's own,
//     always), bf16 on cuda (the film's own precision/device).
//     Width/height/megapixels/keep_proportion ride the upscaler's own
//     defaults (1280×704, multiplier mode ignores them — the film's
//     own note at its handoff mount).
//  2. PARTIAL DENOISE ONLY: the scheduler's denoise carries the
//     entry's denoise (default 0.32; the researched 0.30–0.35
//     refinement window, the repair's own default), and a denoise >=
//     1 refuses LOUD at this door — the same sigmas law that guards
//     the film's handoff (vendored minimax_h3_refine.py
//     run_h3_refinement: 0 <= sigmas[0] < 1 STRICT; a full-noise
//     sigma discards the learned upscaled latent and the node
//     throws). A full-denoise re-render is a reshoot, and the
//     reshoot door exists.
//  3. THE FAMILY PLANE, NEVER A HAND-ROLLED STACK: the handoff's
//     model seat rides h3MaskedEditPlane (the shared masked-edit
//     plane — UNET + SLA + chunked + the lora bag + AdaLN + sigma
//     shift, the operator's lora law), the sampler rides the plane's
//     euler select, the schedule rides the doc's own sched_name. The
//     entry carries only the refine seats (source_clip,
//     refine_prompt, denoise, steps, seed, clip_seconds) — everything
//     model-shaped stays family-owned.
//
// The emission is a single graph (no loop, no requeue — one
// top-level prompt): VHS source → VAE encode (video + audio split
// streams — the node rebuilds native joint AV state itself) →
// handoff → decode → the film tail's file law (CreateVideo +
// SaveVideo at <runId>/refine, the extend terminal's own posture).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { filmJoinAudio } from './actions.js'
import { h3MaskedEditPlane, loadVideo } from './chainEdit.js'

/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export const REFINE_UPSCALE_MODEL = 'minimax_h3_latent_upscaler_3d_bf16.safetensors'

/** The refine entry's required seats (the reshoot idiom: an armed
 *  doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose frames the second pass refines — ONE staged leaf: the VHS loader reads it by staged name at the film clock, and the encode seats read its frames + soundtrack'],
  ['refine_prompt', 'the refine text — what the upscaled frames should hold (agent-composed, user-confirmed; rides the CLIPTextEncode positive seat — the node refuses without model + positive)'],
] as const

const num = (e: Record<string, unknown>, key: string, d: number): number =>
  typeof e[key] === 'number' ? (e[key] as number) : d

/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/reshoot arms (a commission is armed when
 *  its bag is a NON-EMPTY ARRAY). Absent or empty bag = the compose
 *  never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the refine bag carries at least one entry */
export function refineArmed(p: Record<string, unknown>): boolean {
  const bag = p.refine
  return Array.isArray(bag) && bag.length > 0
}

/** The refine renderer: validates the bound entry, then composes
 *  the standalone second pass. Like the swap, the film path never
 *  reaches here (the card branches on a non-empty refine bag, and a
 *  bag under an armed reshoot — or beside any edit arm — refuses
 *  loud: one door per doc), and the emission ends in SaveVideo (the
 *  extend terminal's own file law — no ChainAssemble: a refine has
 *  no loop lineage to assemble).
 * @param entry the refine mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this refine renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the refine filename rides it) */
export function renderH3Refine(
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
        `h3-timeline refine: '${seat}' names no media — ${what}; a refine needs both seats bound (source_clip, refine_prompt)`,
      )
    }
  }
  const denoise = num(entry, 'denoise', 0.32)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline refine: denoise ${denoise} >= 1 — a second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; a full-noise sigma discards the learned upscaled latent and the vendored node throws — that is a reshoot, and the reshoot door exists)`,
    )
  }
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)
  const clipSeconds = num(entry, 'clip_seconds', 6)

  // ── the staged media (the shared loader law, force-rate-24 VHS —
  // never a private LoadVideo pair) + the family's own plane ──
  // (the REQUIRED_SEATS loop above proved source_clip a non-empty
  // string — the cast restates the proven, never a fallback: there
  // is no default clip, and the sibling str() fallback would be a
  // dead branch here, uncovered by any honest door)
  const [srcFrames, srcAudio] = loadVideo(g, entry['source_clip'] as string)
  const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, clipSeconds)

  // ── the split-stream encode (the node's own contract:
  // _resolve_h3_sources rebuilds native joint AV from plain 24ch
  // video + the matching audio latent) ──
  const videoLatent = g.node('VAEEncode', { pixels: srcFrames, vae: vaeVideo }).out(0)
  const audioLatent = g.node('VAEEncodeAudio', { audio: srcAudio, vae: vaeAudio }).out(0)
  const positive = g.node('CLIPTextEncode', {
    text: entry['refine_prompt'] as string, clip,
  }).out(0)
  const noise = g.node('RandomNoise', { noise_seed: seed }).out(0)
  const sched = g.node('BasicScheduler', {
    model: sigmaModel, scheduler: p.sched_name as string,
    steps, denoise,
  }).out(0)

  // ── THE HANDOFF (the report-named chain: learned 2x upscale +
  // the low-sigma refinement pass, one node — its output is final/
  // decode-ready, no external guider or second sampler) ──
  // THE CAPACITY SEATS (the F24 burn, 2026-10-30): the node serves
  // three sizing modes and a [1, 4] multiplier; the whole-clip pass
  // OOMs at 2x past ~100 f, and a ≤1x pass fits. A stated seat rides
  // verbatim (the knob bounds are the card's own); absent keeps the
  // shipped 2x so every existing doc composes byte-identically.
  const upMode = (entry['mode'] as string | undefined) ?? 'scale by multiplier'
  const upScale = (entry['scale'] as number | undefined) ?? 2.0
  const upscaled = g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
    latent: videoLatent, audio_latent: audioLatent,
    noise, sampler: samplerSel, sigmas: sched,
    model: sigmaModel, positive,
    model_name: REFINE_UPSCALE_MODEL,
    mode: upMode, scale: upScale,
    // Multiplier mode ignores these (the film's own note at its
    // handoff mount) — they ride the upscaler's own defaults.
    width: 1280, height: 704, megapixels: 1,
    keep_proportion: true, align: 32,
    lock_audio: true, cfg: 1.0, device: 'cuda', precision: 'bf16',
    offload_after_upscale: false,
  }).out(0)

  // ── decode + the film tail's file law ──
  const vdec = g.node('VAEDecode', { samples: upscaled, vae: vaeVideo }).out(0)
  const adec = g.node('VAEDecodeAudio', { samples: upscaled, vae: vaeAudio }).out(0)
  const created = g.node('CreateVideo', {
    images: vdec, audio: filmJoinAudio(g, adec), fps: 24, bit_depth: 8,
  })
  g.node('SaveVideo', {
    video: created.out(), filename_prefix: `${runId}/refine`,
    format: 'mp4', codec: 'h264',
  })
}
