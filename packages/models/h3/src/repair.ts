// The h3 family's REPAIR renderer seat (Tier A, operator order
// 2026-11-12: "Okay do it all" — a masked SECOND pass over a region
// of the source clip: hands, the body, a face. Region-agnostic by
// design: the region is a free-text SAM3 detection prompt, never a
// card-per-region).
//
// THE REPAIR LAW (three clauses, all operator-seated):
//  1. ZERO NEW PIXEL POSITIONS: the pass re-renders ONLY the masked
//     region of the SAME clip — the source rides its own ref_video
//     seat as the identity anchor (r2v with no still, no mannequin:
//     the person is already right, only the region is wrong). This
//     is why Tier A cannot add detail to small-in-frame hands — the
//     mask adds no canvas (crop-scale is Tier B, blocked on the
//     unvendored producer).
//  2. PARTIAL DENOISE ONLY: a repair is a refine, never a re-render.
//     BasicScheduler.denoise carries the entry's denoise (default
//     0.32; the reference refine window 0.30–0.35, actions.ts's
//     refine arm the precedent), and a denoise >= 1 refuses LOUD at
//     this door — the same sigmas law that guards the film's refine
//     seat (full denoise would boil the held region into a new
//     take; that is a reshoot, and the reshoot door exists).
//  3. THE MASK IS PER-FRAME, INLINE, NATIVE: SAM3_VideoTrack +
//     SAM3_TrackToMask (engine core, nodes_sam3.py) over the window
//     frames, driven by a CLIPTextEncode of the entry's
//     region_prompt. This is STRICTLY better than the swap's staged
//     single-PNG union (the estate has no per-frame sequence
//     primitive — friction-report #3): the mask tracks the region
//     frame by frame at track time, in-graph, with no R0 handoff.
//
// Everything else rides the swap seat's own spine verbatim: the
// shared h3MaskedEditPlane (the operator's lora law — the family
// plane, never a hand-rolled stack), the H3OneClickSwapPlan geometry
// engine (picture_1 = the window's own first frame: the plan's grid
// snap + tier scaling stay ENGINE-OWNED, never re-derived
// renderer-side), the chain skeleton (LoopStart → Current → slice →
// edit latent → masked target → context → sampler → trim → save →
// LoopEnd top_level_requeue → Assemble), and the lazy VIDEO wire
// (friction-report #4 — the timeline reads the core loader's file
// stream; video_path rides along staged but unread).
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { loadVideo, h3MaskedEditPlane } from './swap.js'

/** The SAM3 checkpoint the mask family declares + hash-pins
 *  (packages/models/mask/src/index.ts — auto-provisioned; the track
 *  card's own SAM3_CKPT constant is the same file). */
const SAM3_CKPT = 'sam3.1_multiplex_fp16.safetensors'

/** The repair entry's required seats (the reshoot idiom: an armed
 *  doc with an empty seat refuses loud naming the seat). Two of the
 *  three are text, not staged media — the loop still speaks the one
 *  spelling so the refusal names the seat the same way the swap's
 *  does. */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose region is repaired — ONE staged leaf: the VHS window loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
  ['repair_prompt', 'the repair action text — what the masked region should become (the R2V prompt seat; agent-composed, user-confirmed)'],
  ['region_prompt', 'the free-text SAM3 detection target naming the region — "hands", "a person", "a face" are param VALUES, never card kinds (the region-agnostic law)'],
] as const

const num = (p: Record<string, unknown>, k: string, d: number): number =>
  typeof p[k] === 'number' ? (p[k] as number) : d

const str = (p: Record<string, unknown>, k: string): string =>
  typeof p[k] === 'string' ? (p[k] as string) : ''

/** The repair renderer: validates the bound entry, then composes the
 * masked second-pass chain. Like the swap, the film path never
 * reaches here (the card branches on a non-empty repair bag, refuses
 * a bag under an armed reshoot or an armed replace — one door per
 * doc), and the emission ends in MiniMaxH3ChainAssemble.
 * @param entry the repair mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this repair renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3Repair(
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
        `h3-timeline repair: '${seat}' names no media — ${what}; a repair needs all three seats bound (source_clip, repair_prompt, region_prompt)`,
      )
    }
  }
  const denoise = num(entry, 'denoise', 0.32)
  if (denoise >= 1) {
    throw new Error(
      `h3-timeline repair: denoise ${denoise} >= 1 — a masked second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; denoise 1 would boil the held region into a new take — that is a reshoot, and the reshoot door exists)`,
    )
  }
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)
  const clipSeconds = num(entry, 'clip_seconds', 6)
  const resolution = str(entry, 'resolution') || '736p'
  const windowStart = num(entry, 'window_start', 0)
  const windowLength = num(entry, 'window_length', 0)
  // No silent clamps (the no-silent-repair law): a negative window
  // is a caller bug — refuse loud, never round it into a render.
  if (windowStart < 0 || windowLength < 0) {
    throw new Error(
      `h3-timeline repair: window_start ${windowStart} / window_length ${windowLength} — a window seat never goes negative (frames at the film clock, 24 fps; 0/0 is the whole clip)`,
    )
  }

  // ── the family's own model + lora plane (the shared masked-edit
  // seat — the same spine the swap rides, the operator's lora law;
  // the repair NEVER hand-rolls a stack) ──
  const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, clipSeconds)

  // ── the staged media: the WINDOW loader (cap + skip on the same
  // VHS seat, so frames and audio stay in sync) and the inline
  // per-frame SAM3 mask that replaces the swap's staged PNG ──
  const [srcFrames, srcAudio] = loadVideo(g, str(entry, 'source_clip'), Math.round(windowLength), Math.round(windowStart))
  const scaled = g.node('ImageScaleToMaxDimension', {
    image: srcFrames, upscale_method: 'area', largest_size: 1008,
  }).out(0)
  const sam = g.node('CheckpointLoaderSimple', { ckpt_name: SAM3_CKPT })
  const regionCond = g.node('CLIPTextEncode', {
    text: str(entry, 'region_prompt'), clip: sam.out(1),
  }).out(0)
  const track = g.node('SAM3_VideoTrack', {
    images: scaled, model: sam.out(0), conditioning: regionCond,
    detection_threshold: num(entry, 'detection_threshold', 0.5),
    max_objects: 0, detect_interval: 1,
  }).out(0)
  const regionMasks = g.node('SAM3_TrackToMask', {
    track_data: track, object_indices: '',
  }).out(0)
  const grown = g.node('GrowMaskWithBlur', {
    mask: regionMasks, expand: Math.round(num(entry, 'mask_grow', 16)),
    tapered_corners: true, blur_radius: 0,
  }).out(0)
  // picture_1 for the plan head: the window's own first frame. The
  // plan node REQUIRES a picture (its describer vocabulary); the
  // repair's "replacement" is the source's own person, so the
  // window's lead frame is the truthful anchor — and the geometry
  // law (grid snap + tier scaling off source_frames) stays
  // engine-owned either way.
  const anchorFrame = g.node('ImageFromBatch', {
    image: srcFrames, batch_index: 0, length: 1,
  }).out(0)

  // ── the audio prep (the swap's own posture verbatim: the source
  // audio trims to the loop window; the slice's copy is muted — the
  // edit latent holds the source picture, never its sound) ──
  const srcAudioTrim = g.node('TrimAudioDuration', {
    start_index: 0, duration: 2048, audio: srcAudio,
  }).out(0)
  const sliceAudio = g.node('AudioAdjustVolume', {
    volume: -100, audio: srcAudioTrim,
  }).out(0)

  // ── the plan head (the entry's scalars, engine-derived geometry) ──
  const plan = g.node('H3OneClickSwapPlan', {
    clip_seconds: clipSeconds,
    overlap_frames: num(entry, 'overlap_frames', 39),
    resolution,
    steps,
    seed,
    roles: '',
    source_frames: srcFrames,
    picture_1: anchorFrame,
  })
  const profile = g.node('MiniMaxH3GenerationProfile', {
    scene_continuity: 'Hard picture + protected audio',
    audio_profile: 'Generate audio',
  }).out(0)
  const chainPlan = g.node('MiniMaxH3ChainPlanModern', {
    plan_json: JSON.stringify({ shots: [{ id: 'repair', prompt: str(entry, 'repair_prompt') }] }),
    run_name: plan.out(3),
    generation_fingerprint: '',
    width: plan.out(1),
    height: plan.out(2),
    encode_mode: 'video',
    crop: 'center',
    default_duration_seconds: clipSeconds,
    default_steps: steps,
    base_seed: seed,
    segment_crf: 16,
    video_blend_frames: 0,
    chain_policy: profile,
    plan_json_input: plan.out(0),
  }).out(0)
  const timeline = g.node('MiniMaxH3SourceTimeline', {
    video_path: str(entry, 'source_clip'), audio_path: '', embedded_audio: 'auto',
    // The window rides BOTH loaders identically (the VHS seat's
    // skip_first_frames above and this one): the timeline maps the
    // chain onto the same window the frames/audio were cut from.
    skip_first_frames: Math.round(windowStart), source_audio: srcAudioTrim,
    source_video: g.node('LoadVideo', {
      file: str(entry, 'source_clip'),
    }).out(0),
  }).out(0)
  const loop = g.node('MiniMaxH3ChainLoopStart', {
    start_clip: 1, scene_range: '', verify_resume_history: true,
    plan: chainPlan, source_timeline: timeline,
  })
  const cur = g.node('MiniMaxH3ChainCurrent', {
    align_audio_reference: false, state: loop.out(1),
  })

  // ── the masked second-pass body ──
  // NO still, NO mannequin: the source clip rides its own ref_video
  // seat — the identity anchor of a repair is the person already in
  // the frame (the zero-new-pixels law).
  const r2v = g.node('MiniMaxH3ReferenceToVideo', {
    prompt: str(entry, 'repair_prompt'),
    width: cur.out(8), height: cur.out(9), length: cur.out(6),
    ref_image_size: 'match',
    clip, vae: vaeVideo, audio_vae: vaeAudio,
    'ref_videos.ref_video_0': srcFrames,
    'ref_video_audios.ref_video_audio_0': g.node('AudioAdjustVolume', {
      volume: -100, audio: cur.out(12),
    }).out(0),
  })
  const slice = g.node('H3SourceSlice', {
    source_fps: 24, crop: 'center',
    state: cur.out(0), latent: r2v.out(1),
    audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
  })
  const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
    grow: 0, keep_audio: true, megapixels: 0,
    vae: vaeVideo, images: slice.out(0), mask: grown,
    audio_vae: vaeAudio, audio: slice.out(1),
  }).out(0)
  const target = g.node('MiniMaxH3ContexMaskedTarget', {
    mask_meaning: 'white = generate',
    audio_mode: 'preserve source audio',
    mask_conversion: 'H3 exact (causal/token max)',
    target_latent: edit, mask: grown,
  }).out(0)
  const ctx = g.node('MiniMaxH3ChainContext', {
    state: cur.out(0), conditioning: r2v.out(0),
    vae: vaeVideo, latent: target, audio_vae: vaeAudio,
  })

  // ── the sampler tail — THE PARTIAL DENOISE SEAT (the repair's
  // own one law-bearing delta from the swap's tail: denoise is the
  // entry's refine strength, never the swap's full 1) ──
  const sample = g.node('SamplerCustomAdvanced', {
    noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
    guider: g.node('BasicGuider', { model: sigmaModel, conditioning: ctx.out(0) }).out(0),
    sampler: samplerSel,
    sigmas: g.node('BasicScheduler', {
      scheduler: 'simple', steps: cur.out(7), denoise, model: sigmaModel,
    }).out(0),
    latent_image: ctx.out(3),
  }).out(0)
  const decoded = g.node('VAEDecode', { samples: sample, vae: vaeVideo }).out(0)
  const decodedAudio = g.node('VAEDecodeAudio', { samples: sample, vae: vaeAudio }).out(0)
  const trimmed = g.node('MiniMaxH3LoopTrim', {
    trim_frames: ctx.out(1), fps: 24, match_tail: true,
    audio_trim_mode: 'sync_with_video',
    images: decoded, audio: decodedAudio, state: cur.out(0),
  })
  const seg = g.node('MiniMaxH3ChainSegmentSave', {
    state: cur.out(0), images: trimmed.out(0), sampled_latent: sample,
    audio: trimmed.out(1), images_with_overlap: trimmed.out(2),
  }).out(0)
  const review = g.node('MiniMaxH3ChainReview', {
    enabled: false, play_notification_sound: false,
    auto_continue_timeout_minutes: 0, unload_models_while_waiting: false,
    assemble_partial_on_stop: true, partial_audio_source: 'checkpointed',
    candidate_count: 1, review_each_candidate: false,
    state: cur.out(0), segment: seg, audio: trimmed.out(1),
  }).out(0)
  const loopEnd = g.node('MiniMaxH3ChainLoopEnd', {
    // top_level_requeue (the swap-chain burn's law, mirrored): the
    // estate's requeue driver owns continuation; the repair's
    // single-shot plan ends its prompt terminal-success and the
    // driver completes the chain.
    between_scene_cleanup: 'off', execution_mode: 'top_level_requeue',
    flow: loop.out(0), state: cur.out(0),
    images: trimmed.out(0), sampled_latent: sample, segment: review,
  })
  g.node('MiniMaxH3ChainAssemble', {
    // A repair is a VISUAL second pass: the soundtrack is the
    // source's own, always (audio_source 'source' — the swap's
    // keep_audio switch has no repair pole to flip).
    audio_source: 'source',
    filename: `${runId}/repair`,
    audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
    blend_schedule: 'plan', boundary_tone_match: 'off',
    color_stabilization: 'off', delete_checkpoints_after_assembly: false,
    generated_audio_join: 'av_overlap',
    manifest: loopEnd.out(0),
  })
}
