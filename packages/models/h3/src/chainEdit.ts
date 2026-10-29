// chainEdit.ts — THE SHARED MASKED-EDIT CHAIN SPINE (the multi-window
// unification, dev_docs/audits/features/
// multiwindow-unification-2026-11-12.md §4.1; operator order 2026-11-12:
// "unify, so masking, normal vids, extending, inpaint / repair use
// shared primitives where possible").
//
// ONE home for the node sequence every chain-riding seat speaks: the
// VHS window loader, the family's model+lora plane, and the spine
// plan head → source timeline → LoopStart/Current → the seat's body →
// ChainContext → sampler tail → decode → trim → SegmentSave → Review
// → LoopEnd (top_level_requeue) → optional ChainAssemble. The seats
// (swap.ts, repair.ts, extend.ts) speak ONLY their true deltas:
// media + window, mask derivation, anchor seats, edit knobs, the
// denoise pole, the plan shots, and the terminal.
//
// THE LATENT-CARRY LAW (operator, 2026-11-12): windows after the
// first ride the chain's own context/checkpoint lineage (the policy's
// masked_av context — LoopStart resumes the checkpointed latents, the
// requeue driver owns continuation); a RAW prior boundary has no
// latents and takes the pixel-anchor posture instead (the extend
// seat). In-chain seams assemble in-chain (ChainAssemble); raw
// boundaries join by file (the film tail's law, actions.ts
// joinSavedFilms). top_level_requeue is THE mode: recursive expansion
// dies past clip 2 (the 2026-10-28 swap-chain burn) and the estate's
// driver (comfyui-execute.ts driveH3ChainRequeue) completes every
// chain headlessly.
//
// Creation order follows the seats' historical sequence (the emission
// walls pin node presence and values; this extraction changes no
// node's parameters — the suites are the proof).
import type { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph'
import type { H3Facts } from './actions.js'
import { LANE_FILES, h3LoraStackOf, h3ShiftVideoOf } from './actions.js'

/** The VHS source loader the slice + timeline read (reference node 5
 *  verbatim: force_rate 24 — the film clock — and the zero/one
 *  passthrough knobs; format 'None'). Slot 0 frames, slot 2 audio.
 *  The window seats (repair, 2026-11-12) ride the loader's own cap +
 *  skip — 0/0 is the whole clip, the swap's posture. The SAME loader
 *  yields the frames and the audio, so a windowed load stays in
 *  sync on both wires.
 * @param g the run's graph builder
 * @param path the staged source leaf (input-dir name)
 * @param frameLoadCap 0 loads the whole clip; a repair window caps here
 * @param skipFirstFrames the window's start (repair skips here)
 * @returns [frames, audio] — the loader's slots 0 and 2 */
export const loadVideo = (
  g: GraphBuilder, path: string, frameLoadCap = 0, skipFirstFrames = 0,
): OutputHandle[] => {
  const n = g.node('VHS_LoadVideo', {
    video: path, force_rate: 24, custom_width: 0, custom_height: 0,
    frame_load_cap: frameLoadCap, skip_first_frames: skipFirstFrames,
    select_every_nth: 1, format: 'None',
  })
  return [n.out(0), n.out(2)]
}

/** The family's model + lora plane EVERY masked-edit seat rides
 * (extracted 2026-11-12 when the repair seat joined; ONE sequence,
 * every caller, zero drift — the unification's first stroke). The
 * operator's lora law, 2026-10-28, verbatim: "WE SAID KEEP OUR
 * CURRENT LORA SETUP FOR NOW" — facts.unet, the SLA/lowvram/chunked
 * attention chain, and LTX_lora_loader with h3LoraStackOf(p) (the
 * lora mod bag, else the absent-bag family default): the same plane
 * the film renders under, composed in the same order (actions.ts's
 * renderH3Window is the symmetry owner). No fixed accelerator row,
 * no engine-side stack the operator cannot see or empty. Creation
 * order is pinned by the emission walls — keep the node sequence
 * untouched.
 * @param g the run's graph builder
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param clipSeconds the clip budget (the preview override's frames)
 * @returns the plane's five seats: sigmaModel, samplerSel, clip,
 *  vaeVideo, vaeAudio */
export const h3MaskedEditPlane = (
  g: GraphBuilder,
  p: Record<string, unknown>,
  facts: H3Facts,
  clipSeconds: number,
): {
  sigmaModel: OutputHandle; samplerSel: OutputHandle; clip: OutputHandle
  vaeVideo: OutputHandle; vaeAudio: OutputHandle
} => {
  const stabilize = p.sla_stabilize_motion ?? true
  const unet = g.node('UNETLoader', { unet_name: facts.unet, weight_dtype: 'default' }).out()
  const sla = g.node('H3SLAAttention', {
    model: unet,
    sparsity_ratio: p.sla_sparsity as number,
    block_size: p.sla_block_size as string,
    min_seq_len: p.sla_min_seq_len as number,
    dense_last_steps: p.sla_dense_last_steps as number,
    protect_audio: p.sla_protect_audio as boolean,
    enabled: true,
    dense_steps: p.sla_dense_steps as string,
    dense_backend: p.sla_dense_backend as string,
    disable_fp16_accum: p.sla_disable_fp16_accum as boolean,
    stabilize_motion: stabilize,
    reference_protection: p.sla_reference_protection !== 'Off',
  }).out()
  const chunked = g.node('MiniMaxChunkFeedForward', {
    model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
    chunks: 2, seq_threshold: 4096,
  }).out()
  const clip = g.node('CLIPLoader', {
    clip_name: LANE_FILES.clip, type: 'minimax',
  }).out()
  const vaeVideo = g.node('VAELoader', { vae_name: LANE_FILES.vae_video }).out()
  const vaeAudio = g.node('VAELoader', { vae_name: LANE_FILES.vae_audio }).out()
  let slaSel: OutputHandle | boolean | null = (p.sla_enabled as boolean | undefined) === false
    ? true
    : ((p.sla_switch as boolean | undefined) ?? null)
  if (slaSel === null) slaSel = g.node('PrimitiveBoolean', { value: false }).out()
  const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out()
  const loraModel = g.node('LTX_lora_loader', {
    model: picked, mode: 'minimax', stack_data: h3LoraStackOf(p),
  }).out()
  // The preview override's frame budget: the caller's one clip at
  // the film clock (the film rides its own length node — the clock
  // node is film-owned; a literal rides here, the same posture the
  // reference's fixed preview knobs take).
  const previewed = g.node('ModelPreviewOverrideKJ', {
    max_resolution: 512, jpeg_quality: 80,
    suppress_default_preview: true, preview_frames: Math.round(clipSeconds * 24),
    preview_fps: 8, tiny_vae: 'none', model: loraModel,
  }).out()
  const adaln = g.node('H3AdaLNLoRAFix', { model: previewed, mode: 'port' }).out()
  const sigmaModel = g.node('MiniMaxH3SigmaShift', {
    model: adaln, shift_video: h3ShiftVideoOf(p), shift_audio: p.shift_audio as number,
  }).out()
  const samplerSel = g.node('KSamplerSelect', { sampler_name: 'euler' }).out()
  return { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio }
}

/** What the seat's body callback receives: the ChainCurrent node
 * (its .out(k) seats), the plane's encoders/decoders, the muted
 * chain audio (the r2v ref_video_audios seat), and the window's own
 * frames + muted slice audio (the H3SourceSlice seats). */
export interface ChainBodyHandles {
  /** MiniMaxH3ChainCurrent — out(0) state, out(5) seed, out(6)
   * length, out(7) steps, out(8)/out(9) width/height, out(12) the
   * chain's carried audio. */
  readonly cur: { out(k: number): OutputHandle }
  readonly clip: OutputHandle
  readonly vaeVideo: OutputHandle
  readonly vaeAudio: OutputHandle
  /** the chain's carried audio, muted −100dB (the r2v audio ref). */
  readonly mutedChainAudio: OutputHandle
  /** the window's frames (the seat's loader, slot 0). */
  readonly srcFrames: OutputHandle
  /** the window's source audio, muted (the slice's audio seat). */
  readonly sliceAudio: OutputHandle
}

/** The seat's masked-edit body: the nodes between ChainCurrent and
 * ChainContext — the r2v anchors, the source slice, the edit latent,
 * the masked target. Returns the two wires ChainContext consumes. */
export type ChainBody = (h: ChainBodyHandles) => {
  /** the r2v's conditioning output. */
  readonly conditioning: OutputHandle
  /** the ContexMaskedTarget's output. */
  readonly targetLatent: OutputHandle
}

/** The terminal: ChainAssemble's config, or null when the seat joins
 * by file instead (the single-window extend posture). */
export interface ChainAssembleSeat {
  /** 'source' keeps the source soundtrack; 'generated' assembles the
   * checkpointed H3 sound. */
  readonly audioSource: 'source' | 'generated'
  /** the assemble basename (the `<runId>/<kind>` prefix). */
  readonly filename: string
}

/** ONE masked-edit chain seat — every delta the spine does not own.
 * The seat validates its own entry, loads its own media, derives its
 * own mask, and hands the body callback; the spine emits everything
 * else with the seats' historical parameters verbatim. */
export interface MaskedChainSeat {
  /** the walked doc params (the lora mod bag + SLA/shift knobs). */
  readonly p: Record<string, unknown>
  /** the family's lane facts (unet off the DECL row). */
  readonly facts: H3Facts
  /** the per-window clip budget (the plane's preview + the plan's
   * default duration; for multi-window seats this is ONE window's
   * seconds, never the total). */
  readonly clipSeconds: number
  /** the plan node's overlap knob (the seat's entry default 39). */
  readonly overlapFrames: number
  readonly resolution: string
  readonly seed: number
  readonly steps: number
  /** the swap's roles text ('' on repair/extend). */
  readonly roles: string
  /** the staged source leaf (loader + timeline + lazy video wire). */
  readonly sourceClip: string
  /** the window's start frame (repair's seat; 0 otherwise). */
  readonly windowStart: number
  /** the staged picture_1 — the plan's geometry anchor. */
  readonly picture1: OutputHandle
  /** the window's frames + audio (the seat's loadVideo call). */
  readonly srcFrames: OutputHandle
  readonly srcAudio: OutputHandle
  /** the literal plan_json — REQUIRED by ChainPlanModern. When
   * planFromSource is true it is the ignored fallback (the swap and
   * repair ride the plan node's engine-derived shots); when false it
   * IS the plan (the extend cure: the seat's own continuation shots
   * rule — a raw prior is never re-sliced, §3 of the design). */
  readonly planJson: string
  /** true wires plan_json_input from the plan node (source slicing —
   * the swap/repair semantics); false leaves the literal ruling. */
  readonly planFromSource: boolean
  /** the scheduler denoise: 1 fresh (swap/extend), partial refine
   * (repair — its own law refuses >= 1 at the seat's door). */
  readonly denoise: number
  /** the seat's masked-edit body. */
  readonly body: ChainBody
  /** the ChainAssemble terminal, or null (file-join posture). */
  readonly assemble: ChainAssembleSeat | null
}

/** The spine's returned handles: the loop-trimmed window (the seat's
 * file join consumes its streams) and, when assembled, the
 * ChainAssemble node's video_path (the assembled film's absolute
 * path — the compose join's append member). */
export interface ChainRender {
  /** MiniMaxH3LoopTrim — out(0) frames, out(1) audio, out(2) the
   * with-overlap images. */
  readonly trimmed: { out(k: number): OutputHandle }
  /** ChainAssemble's video_path when the seat assembles; else null. */
  readonly assemblePath: OutputHandle | null
}

/** Emit the shared masked-edit chain for one seat. The node
 * parameters are the three seats' historical spellings, verbatim;
 * the seat's deltas arrive through the seat interface. The emission
 * ends in LoopEnd (top_level_requeue) and, when configured,
 * ChainAssemble.
 * @param g the run's graph builder
 * @param seat the seat's deltas (see MaskedChainSeat) */
export function renderMaskedEditChain(g: GraphBuilder, seat: MaskedChainSeat): ChainRender {
  const { p, facts } = seat
  // ── the family's own model + lora plane (the shared masked-edit
  // seat — the operator's lora law; a seat NEVER hand-rolls a stack) ──
  const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } =
    h3MaskedEditPlane(g, p, facts, seat.clipSeconds)

  // ── the audio prep (the seats' shared posture: the source audio
  // trims to the loop budget; the slice's copy is muted — the edit
  // latent holds the source picture, never its sound) ──
  const srcAudioTrim = g.node('TrimAudioDuration', {
    start_index: 0, duration: 2048, audio: seat.srcAudio,
  }).out(0)
  const sliceAudio = g.node('AudioAdjustVolume', {
    volume: -100, audio: srcAudioTrim,
  }).out(0)

  // ── the plan head (the entry's scalars, engine-derived geometry;
  // picture_1 = the seat's anchor — the grid snap + tier scaling
  // stay ENGINE-OWNED, never re-derived renderer-side) ──
  const plan = g.node('H3OneClickSwapPlan', {
    clip_seconds: seat.clipSeconds,
    overlap_frames: seat.overlapFrames,
    resolution: seat.resolution,
    steps: seat.steps,
    seed: seat.seed,
    roles: seat.roles,
    source_frames: seat.srcFrames,
    picture_1: seat.picture1,
  })
  const profile = g.node('MiniMaxH3GenerationProfile', {
    scene_continuity: 'Hard picture + protected audio',
    audio_profile: 'Generate audio',
  }).out(0)
  const chainPlan = g.node('MiniMaxH3ChainPlanModern', {
    plan_json: seat.planJson,
    run_name: plan.out(3),
    generation_fingerprint: '',
    width: plan.out(1),
    height: plan.out(2),
    encode_mode: 'video',
    crop: 'center',
    default_duration_seconds: seat.clipSeconds,
    default_steps: seat.steps,
    base_seed: seat.seed,
    segment_crf: 16,
    video_blend_frames: 0,
    chain_policy: profile,
    // THE PLAN-INPUT LAW (the extend cure, design §3): only a
    // source-SLICING seat wires the plan node's derived shots — a
    // non-empty plan_json_input OVERRIDES the literal, and the plan
    // node slices the SOURCE by clip_seconds (the swap's semantics,
    // the repair's window re-slice). A continuation seat (extend)
    // leaves the literal ruling: its shots are NEW seconds, never a
    // re-slice of the raw prior.
    ...(seat.planFromSource ? { plan_json_input: plan.out(0) } : {}),
  }).out(0)
  const timeline = g.node('MiniMaxH3SourceTimeline', {
    video_path: seat.sourceClip, audio_path: '', embedded_audio: 'auto',
    // the window rides BOTH loaders identically (the VHS seat's
    // skip + this one): the timeline maps the chain onto the same
    // window the frames/audio were cut from.
    skip_first_frames: Math.round(seat.windowStart), source_audio: srcAudioTrim,
    // THE LAZY-VIDEO WIRE (friction-report #4): the timeline's
    // video_path is a raw CWD-relative filesystem path (upstream
    // _resolved_media_path: abspath, never the input dir), while
    // VHS_LoadVideo.video must be an input-dir leaf — one string
    // cannot satisfy both. The node prefers "a native file-backed
    // VIDEO connection" (its own tooltip): the core loader resolves
    // the staged leaf in the input dir, and the timeline reads the
    // file back off the wire's stream source — video_path rides
    // along staged but unread.
    source_video: g.node('LoadVideo', {
      file: seat.sourceClip,
    }).out(0),
  }).out(0)
  const loop = g.node('MiniMaxH3ChainLoopStart', {
    start_clip: 1, scene_range: '', verify_resume_history: true,
    plan: chainPlan, source_timeline: timeline,
  })
  const cur = g.node('MiniMaxH3ChainCurrent', {
    align_audio_reference: false, state: loop.out(1),
  })
  const mutedChainAudio = g.node('AudioAdjustVolume', {
    volume: -100, audio: cur.out(12),
  }).out(0)

  // ── the seat's masked-edit body (anchors + slice + edit latent +
  // masked target — the seat's true deltas) ──
  const { conditioning, targetLatent } = seat.body({
    cur, clip, vaeVideo, vaeAudio, mutedChainAudio,
    srcFrames: seat.srcFrames, sliceAudio,
  })
  const ctx = g.node('MiniMaxH3ChainContext', {
    state: cur.out(0), conditioning,
    vae: vaeVideo, latent: targetLatent, audio_vae: vaeAudio,
  })

  // ── the sampler tail (the denoise pole is the seat's one knob:
  // full 1 fresh — swap/extend; partial refine — the repair's law) ──
  const sample = g.node('SamplerCustomAdvanced', {
    noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
    guider: g.node('BasicGuider', { model: sigmaModel, conditioning: ctx.out(0) }).out(0),
    sampler: samplerSel,
    sigmas: g.node('BasicScheduler', {
      scheduler: 'simple', steps: cur.out(7), denoise: seat.denoise, model: sigmaModel,
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
    // top_level_requeue (the swap-chain burn, 2026-10-28): recursive
    // expansion dies past clip 2 (subgraph-qualified node ids stop
    // resolving at depth >= 3 — the pack now refuses >2-scene
    // recursive plans at hop 1). Requeue mode checkpoints each scene,
    // ends its prompt terminal-success, and the estate's requeue
    // DRIVER (comfyui-execute.ts driveH3ChainRequeue) claims the
    // durable handoff, patches LoopStart to the owed scene, and
    // re-submits until the chain completes — the film assembles on
    // the final prompt.
    between_scene_cleanup: 'off', execution_mode: 'top_level_requeue',
    flow: loop.out(0), state: cur.out(0),
    images: trimmed.out(0), sampled_latent: sample, segment: review,
  })

  // ── the terminal: ChainAssemble when the seat assembles in-chain
  // (the latent-seam machinery — blend_schedule 'plan' rides the
  // policy's own overlaps); null when the seat joins by file. ──
  if (seat.assemble === null) return { trimmed, assemblePath: null }
  const assemble = g.node('MiniMaxH3ChainAssemble', {
    audio_source: seat.assemble.audioSource,
    filename: seat.assemble.filename,
    audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
    blend_schedule: 'plan', boundary_tone_match: 'off',
    color_stabilization: 'off', delete_checkpoints_after_assembly: false,
    generated_audio_join: 'av_overlap',
    manifest: loopEnd.out(0),
  })
  return { trimmed, assemblePath: assemble.out(0) }
}
