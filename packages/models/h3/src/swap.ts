// The h3 family's SWAP renderer seat (the swap-parity build,
// 2026-10-28 — Viggle-Animate is trash, OUR timeline learns the
// upstream swap recipe instead).
//
// REFERENCE TRUTH (D3voz/openjutsu simple.api.json, dumped
// 2026-10-28 — every class + input key below is verbatim from that
// file, never recalled; required-vs-optional faces verified against
// the LIVE /object_info after the operator's 2026-10-28 press, 1822
// classes): the masked-edit render path is
//   OneClickSwapPlan(scalars + source_frames + picture_1)
//   → ChainPlanModern(plan_json literal + plan_json_input [plan])
//   → ChainLoopStart → ChainCurrent
//   → ReferenceToVideo(prompt, chain WxHxL, ref_images still,
//     ref_videos mannequin, ref_video_audios muted chain audio)
//   → H3SourceSlice(state, latent, source_frames, muted source audio)
//   → FantasticVideoEditLatent(grow 0, mask, keep_audio)
//   → ContexMaskedTarget(mask_meaning, audio_mode, mask_conversion)
//   → ChainContext → RandomNoise(chain seed) → BasicGuider +
//   BasicScheduler(chain steps) → SamplerCustomAdvanced →
//   VAEDecode/VAEDecodeAudio → LoopTrim → SegmentSave → Review(off)
//   → LoopEnd → ChainAssemble.
//
// THE ESTATE'S TWO DELTAS (operator law, 2026-10-28):
//  1. THE MODEL + LORA PLANE IS OURS, ENTIRELY (operator, verbatim:
//     "WE SAID KEEP OUR CURRENT LORA SETUP FOR NOW"): the reference's
//     UNET→LoraLoaderModelOnly(DMAD)→ModelAttentionBackend chain is
//     NOT adopted. The swap rides the family's own plane
//     (chainEdit.ts h3MaskedEditPlane — the same stack the film
//     renders under). No fixed accelerator row, no engine-side stack
//     the operator cannot see or empty.
//  2. NO IN-GRAPH DESCRIBERS: the reference's TextGenerate/H3ClipShots/
//     H3FillShots describer chain is the agent's job here — the
//     entry's swap_prompt feeds ReferenceToVideo's prompt seat
//     directly (user-confirmed per the skill's confirm law).
// The mask enters as ONE staged PNG (friction-report #3): the track
// card stages per-frame masks, but the estate has no per-frame sequence
// primitive — so the seat takes a single representative (the pixel-max
// UNION of the grown frames is recommended; per-frame motion rides the
// mannequin video, never the mask). LoadImage → ImageToMask(red) at
// the two MASK seats (the reference grew masks in-graph from a live
// tracker; the track card stages them, the R0→replace handoff).
//
// THE SPINE IS SHARED (the 2026-11-12 unification): every node
// outside this seat's true deltas is emitted by chainEdit.ts's
// renderMaskedEditChain — the plane, the audio prep, the plan head,
// the timeline, the loop, the context, the sampler tail, the save,
// the requeue LoopEnd, and the ChainAssemble terminal. This seat
// owns: the five required seats, the staged media, the swap body
// (still + mannequin anchors, the staged-PNG mask, the keep_audio
// poles), and the source-sliced plan (planFromSource — the plan node
// derives the shots by slicing the source, THE swap semantics).
//
// R1 SCOPE (single clip, operator-approved): one shot in the plan
// (no continuation overlap — the seam question is a named follow-up
// in the plan doc). default_duration_seconds rides clip_seconds (the
// one clock — the reference's 15 packs many 6s clips; ours renders
// the clip itself).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { loadVideo, renderMaskedEditChain } from './chainEdit.js'

/** The swap entry's required media + text seats (the reshoot idiom:
 *  an armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the source video whose person is replaced — ONE staged leaf: the VHS slice loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire (its video_path string rides along staged but unread)'],
  ['still', 'the replacement still (the R2V ref_images LoadImage + the plan picture_1)'],
  ['mannequin', 'the mannequin video from the track-card run (the R2V ref_videos H3GreyMannequins output)'],
  ['mask', 'ONE staged PNG from the track-card run — the pixel-max UNION of its grown per-frame masks is recommended (per-frame motion rides the mannequin; the edit-latent + masked-target mask, reference GrowMaskWithBlur expand 40)'],
  ['swap_prompt', 'the swap action text (agent-composed, user-confirmed — the R2V prompt seat; the estate has no in-graph describers)'],
] as const

const str = (p: Record<string, unknown>, k: string): string =>
  typeof p[k] === 'string' ? (p[k] as string) : ''

const num = (p: Record<string, unknown>, k: string, d: number): number =>
  typeof p[k] === 'number' ? (p[k] as number) : d

/** The swap renderer: validates the bound entry, then composes the
 * masked-edit chain per the reference map above. The film path
 * never reaches here (the card branches ONLY on a non-empty replace
 * bag, and refuses a bag under an armed reshoot — one door per doc).
 * @param entry the replace mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs —
 * the family plane this swap renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3Swap(
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
        `h3-timeline replace: '${seat}' names no media — ${what}; a swap needs all five seats bound (source_clip, still, mannequin, mask, swap_prompt)`,
      )
    }
  }
  const keepAudio = entry.keep_audio !== false
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)
  const clipSeconds = num(entry, 'clip_seconds', 6)
  const resolution = str(entry, 'resolution') || '736p'

  // ── the staged media (the R0 cards' artifacts: the source clip,
  // the still, the track card's mannequin + grown mask) ──
  const [srcFrames, srcAudio] = loadVideo(g, str(entry, 'source_clip'))
  const stillImg = g.node('LoadImage', { image: str(entry, 'still') }).out(0)
  const maskOf = g.node('ImageToMask', {
    image: g.node('LoadImage', { image: str(entry, 'mask') }).out(0),
    channel: 'red',
  }).out(0)
  const [mannequin] = loadVideo(g, str(entry, 'mannequin'))

  renderMaskedEditChain(g, {
    p, facts,
    clipSeconds,
    overlapFrames: num(entry, 'overlap_frames', 39),
    resolution, seed, steps,
    roles: str(entry, 'roles'),
    sourceClip: str(entry, 'source_clip'),
    windowStart: 0,
    picture1: stillImg,
    srcFrames, srcAudio,
    // the ignored literal fallback — the plan node's SOURCE-SLICED
    // shots ride plan_json_input (the swap's own semantics)
    planJson: JSON.stringify({ shots: [{ id: 'swap', prompt: str(entry, 'swap_prompt') }] }),
    planFromSource: true,
    denoise: 1,
    assemble: {
      audioSource: keepAudio ? 'source' : 'generated',
      filename: `${runId}/swap`,
    },
    body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio }) => {
      // ── the masked edit body: the still anchors identity, the
      // mannequin carries motion, the staged PNG masks the edit ──
      const r2v = g.node('MiniMaxH3ReferenceToVideo', {
        prompt: str(entry, 'swap_prompt'),
        width: cur.out(8), height: cur.out(9), length: cur.out(6),
        ref_image_size: 'match',
        clip, vae: vaeVideo, audio_vae: vaeAudio,
        'ref_images.ref_image_0': stillImg,
        'ref_videos.ref_video_0': mannequin,
        'ref_video_audios.ref_video_audio_0': mutedChainAudio,
      })
      const slice = g.node('H3SourceSlice', {
        source_fps: 24, crop: 'center',
        state: cur.out(0), latent: r2v.out(1),
        audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
      })
      const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
        grow: 0, keep_audio: keepAudio, megapixels: 0,
        vae: vaeVideo, images: slice.out(0), mask: maskOf,
        audio_vae: vaeAudio, audio: slice.out(1),
      }).out(0)
      const target = g.node('MiniMaxH3ContexMaskedTarget', {
        mask_meaning: 'white = generate',
        audio_mode: keepAudio ? 'preserve source audio' : 'generate all audio',
        mask_conversion: 'H3 exact (causal/token max)',
        target_latent: edit, mask: maskOf,
      }).out(0)
      return { conditioning: r2v.out(0), targetLatent: target }
    },
  })
}
