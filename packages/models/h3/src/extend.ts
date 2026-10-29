// The h3 family's EXTEND renderer seat (the extend-video flow's
// emission, report dev_docs/audits/features/
// extend-video-flow-2026-11-12.md §3): MORE SECONDS of coherent
// motion appended to a prior clip — a fresh continuation, never a
// re-edit of what the clip already shows.
//
// THE EXTEND LAW (three clauses):
//  1. THE ANCHOR IS THE PRIOR CLIP'S LAST FRAME, TAKEN IN-GRAPH:
//     ImageFromBatch(priorFrames, batch_index: -1) — the engine's
//     own negative-index support (comfy_extras/nodes_images.py:
//     "if batch_index < 0: batch_index += s_in.shape[0]", clamped).
//     No frame-count probe, no out-of-graph extraction: the prior
//     clip is read ONCE by the VHS loader (force_rate 24 — the film
//     clock), and its tail frame rides BOTH the plan's picture_1
//     seat and the r2v ref_images.ref_image_0 seat (the pixel
//     anchor law, actions.ts: cross-run continuity is the anchor).
//     The whole clip also rides ref_videos.ref_video_0 — the
//     repair's own identity-anchor precedent.
//  2. FRESH GENERATION, NOT A REFINE: the window generates at FULL
//     denoise under an all-white SolidMask (mask_meaning
//     'white = generate' — engine core, comfy_extras/
//     nodes_mask.py). Nothing is held: extended seconds are NEW
//     content, so the edit-latent pass contributes no held pixels
//     and the sampler starts from pure noise. This is the opposite
//     pole of the repair (partial denoise over held pixels) — a
//     repair that wanted new seconds would be this door instead.
//  3. THE JOIN IS THE FILM TAIL'S OWN FILE LAW: the prior clip
//     re-saves at an output-dir SaveVideo prefix and the new window
//     saves at its own; ONE MeliteUnload boundary per save,
//     token-chained; MeliteConcatVideos decodes the SAVED FILES
//     back in CPU-side strictly after every save (the ordering
//     proof), then CreateVideo → SaveVideo delivers the extended
//     film. No MiniMaxH3ChainAssemble terminal here — its
//     `<name>_final.mp4` naming does not match the concat's
//     `<prefix>_<counter>_.mp4` glob (the join grammar this estate
//     owns), and multi-window extend is the follow-up that will
//     own assembly.
//
// Everything else rides the repair seat's spine verbatim: the
// shared h3MaskedEditPlane (the operator's lora law — the family
// plane, never a hand-rolled stack), the H3OneClickSwapPlan
// geometry engine, the chain skeleton (LoopStart → Current → slice
// → edit latent → masked target → context → sampler → trim → save
// → LoopEnd top_level_requeue), and the lazy VIDEO wire.
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { assertGridLength } from './timelineContract.js'
import { loadVideo, h3MaskedEditPlane } from './swap.js'

/** The extend entry's required seats (the reshoot/repair idiom: an
 * armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
  ['source_clip', 'the clip whose seconds are extended — ONE staged leaf: the VHS loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
  ['extend_prompt', 'the continuation text — MOTION+SOUND for the appended seconds (the R2V prompt seat; agent-composed, user-confirmed)'],
] as const

const num = (p: Record<string, unknown>, k: string, d: number): number =>
  typeof p[k] === 'number' ? (p[k] as number) : d

const str = (p: Record<string, unknown>, k: string): string =>
  typeof p[k] === 'string' ? (p[k] as string) : ''

/** The extend renderer: validates the bound entry, then composes the
 * fresh-continuation chain plus the file join. Like the swap and
 * repair, the film path never reaches here (the card branches on a
 * non-empty extend bag and refuses a bag under an armed reshoot,
 * replace, or repair — one door per doc), and the emission ends in
 * the joined-film SaveVideo.
 * @param entry the extend mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this extension renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the join prefixes ride it) */
export function renderH3Extend(
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
        `h3-timeline extend: '${seat}' names no media — ${what}; an extend needs both seats bound (source_clip, extend_prompt)`,
      )
    }
  }
  const seed = num(entry, 'seed', 0)
  const steps = num(entry, 'steps', 6)
  const overlapFrames = num(entry, 'overlap_frames', 39)
  const resolution = str(entry, 'resolution') || '736p'
  // THE GRID DOOR (the uniform span gate's own posture — refuse
  // loud, never a silent snap): the extension's stated seconds must
  // land on the engine's 22+17k frame grid at the film clock. The
  // exact landing then feeds the plan head, so the engine-owned
  // geometry snap inside the plan agrees with the door.
  const extendFrames = assertGridLength(
    Math.round(num(entry, 'extend_seconds', 56 / 24) * 24),
    'h3-timeline extend',
  )
  const clipSeconds = extendFrames / 24

  // ── the family's own model + lora plane (the shared masked-edit
  // seat — the same spine the swap and repair ride) ──
  const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, clipSeconds)

  // ── the staged media: the WHOLE prior clip on the VHS seat
  // (force_rate 24 — the one clock) and its LAST FRAME as the
  // in-graph anchor (negative batch index, engine core) ──
  const [priorFrames, priorAudio] = loadVideo(g, str(entry, 'source_clip'))
  const lastFrame = g.node('ImageFromBatch', {
    image: priorFrames, batch_index: -1, length: 1,
  }).out(0)

  // ── the audio prep (the repair's posture: the source audio trims
  // to the loop budget; the slice's copy is muted — the edit latent
  // holds the source picture, never its sound) ──
  const srcAudioTrim = g.node('TrimAudioDuration', {
    start_index: 0, duration: 2048, audio: priorAudio,
  }).out(0)
  const sliceAudio = g.node('AudioAdjustVolume', {
    volume: -100, audio: srcAudioTrim,
  }).out(0)

  // ── the plan head (the entry's scalars, engine-derived geometry;
  // picture_1 = the prior clip's last frame — the truthful anchor
  // of a continuation) ──
  const plan = g.node('H3OneClickSwapPlan', {
    clip_seconds: clipSeconds,
    overlap_frames: overlapFrames,
    resolution,
    steps,
    seed,
    roles: '',
    source_frames: priorFrames,
    picture_1: lastFrame,
  })
  const profile = g.node('MiniMaxH3GenerationProfile', {
    scene_continuity: 'Hard picture + protected audio',
    audio_profile: 'Generate audio',
  }).out(0)
  const chainPlan = g.node('MiniMaxH3ChainPlanModern', {
    plan_json: JSON.stringify({ shots: [{ id: 'extend', prompt: str(entry, 'extend_prompt') }] }),
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
    skip_first_frames: 0, source_audio: srcAudioTrim,
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
  // The everywhere-generate mask: an all-white SolidMask sized to
  // the chain's own geometry (nothing held — extended seconds are
  // new content).
  const whiteMask = g.node('SolidMask', {
    value: 1, width: cur.out(8), height: cur.out(9),
  })

  // ── the fresh-continuation body ──
  // The anchor rides BOTH reference seats: the last frame as the
  // pixel anchor (ref_image_0) and the whole clip as the motion
  // identity (ref_video_0) — the swap/repair spine's own seats.
  const r2v = g.node('MiniMaxH3ReferenceToVideo', {
    prompt: str(entry, 'extend_prompt'),
    width: cur.out(8), height: cur.out(9), length: cur.out(6),
    ref_image_size: 'match',
    clip, vae: vaeVideo, audio_vae: vaeAudio,
    'ref_images.ref_image_0': lastFrame,
    'ref_videos.ref_video_0': priorFrames,
    'ref_video_audios.ref_video_audio_0': g.node('AudioAdjustVolume', {
      volume: -100, audio: cur.out(12),
    }).out(0),
  })
  const slice = g.node('H3SourceSlice', {
    source_fps: 24, crop: 'center',
    state: cur.out(0), latent: r2v.out(1),
    audio_vae: vaeAudio, source_frames: priorFrames, source_audio: sliceAudio,
  })
  const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
    grow: 0, keep_audio: false, megapixels: 0,
    vae: vaeVideo, images: slice.out(0), mask: whiteMask,
    audio_vae: vaeAudio, audio: slice.out(1),
  }).out(0)
  const target = g.node('MiniMaxH3ContexMaskedTarget', {
    mask_meaning: 'white = generate',
    audio_mode: 'generate all audio',
    mask_conversion: 'H3 exact (causal/token max)',
    target_latent: edit, mask: whiteMask,
  }).out(0)
  const ctx = g.node('MiniMaxH3ChainContext', {
    state: cur.out(0), conditioning: r2v.out(0),
    vae: vaeVideo, latent: target, audio_vae: vaeAudio,
  })

  // ── the sampler tail — FULL DENOISE (the fresh-render pole: the
  // extension generates new seconds, it never refines held ones —
  // the repair's partial-denoise law is the OPPOSITE door) ──
  const sample = g.node('SamplerCustomAdvanced', {
    noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
    guider: g.node('BasicGuider', { model: sigmaModel, conditioning: ctx.out(0) }).out(0),
    sampler: samplerSel,
    sigmas: g.node('BasicScheduler', {
      scheduler: 'simple', steps: cur.out(7), denoise: 1, model: sigmaModel,
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
  g.node('MiniMaxH3ChainLoopEnd', {
    // top_level_requeue (the swap/repair law, mirrored): the
    // estate's requeue driver owns continuation; the extension's
    // single-shot plan ends its prompt terminal-success and the
    // driver completes the chain.
    between_scene_cleanup: 'off', execution_mode: 'top_level_requeue',
    flow: loop.out(0), state: cur.out(0),
    images: trimmed.out(0), sampled_latent: sample, segment: review,
  })

  // ── THE JOIN (the film tail's file law, actions.ts:745-895):
  // both parts save at output-dir SaveVideo prefixes; ONE boundary
  // per save, token-chained; MeliteConcatVideos decodes the FILES
  // back CPU-side strictly after every save; CreateVideo →
  // SaveVideo delivers the extended film. No ChainAssemble: its
  // `_final.mp4` name is not a prefix the concat can glob. ──
  // The NEW WINDOW first (x1): its tensors die at this save.
  const newCreated = g.node('CreateVideo', {
    images: trimmed.out(0), audio: trimmed.out(1), fps: 24, bit_depth: 8,
  })
  const newSaved = g.node('SaveVideo', {
    video: newCreated.out(), filename_prefix: `${runId}/x1`,
    format: 'mp4', codec: 'h264',
  }).out()
  // The PRIOR clip re-saved (x0): the join grammar needs an
  // output-dir file; the prior's frames + its own soundtrack ride
  // verbatim (the extension never rewrites history).
  const priorCreated = g.node('CreateVideo', {
    images: priorFrames, audio: priorAudio, fps: 24, bit_depth: 8,
  })
  const priorSaved = g.node('SaveVideo', {
    video: priorCreated.out(), filename_prefix: `${runId}/x0`,
    format: 'mp4', codec: 'h264',
  }).out()
  // ONE BOUNDARY PER SAVE, token-chained (the cut-film ordering
  // fix): the concat's 'after' transitively depends on BOTH saves.
  const b1: OutputHandle = g.node('MeliteUnload', {
    video: newSaved, unload_models: false,
  }).out(0)
  const b0: OutputHandle = g.node('MeliteUnload', {
    video: priorSaved, unload_models: false, after: b1,
  }).out(0)
  const concat = g.node('MeliteConcatVideos', {
    videos: `${runId}/x0,${runId}/x1`, after: b0,
  })
  const filmCreated = g.node('CreateVideo', {
    images: concat.out(0), audio: concat.out(1), fps: concat.out(2), bit_depth: 8,
  })
  g.node('SaveVideo', {
    video: filmCreated.out(), filename_prefix: `${runId}/extend_film`,
    format: 'mp4', codec: 'h264',
  })
}
