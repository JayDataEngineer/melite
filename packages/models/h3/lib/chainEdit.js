import { LANE_FILES, h3LoraStackOf, h3ShiftVideoOf } from './actions.js';
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
export const loadVideo = (g, path, frameLoadCap = 0, skipFirstFrames = 0) => {
    const n = g.node('VHS_LoadVideo', {
        video: path, force_rate: 24, custom_width: 0, custom_height: 0,
        frame_load_cap: frameLoadCap, skip_first_frames: skipFirstFrames,
        select_every_nth: 1, format: 'None',
    });
    return [n.out(0), n.out(2)];
};
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
export const h3MaskedEditPlane = (g, p, facts, clipSeconds) => {
    const stabilize = p.sla_stabilize_motion ?? true;
    const unet = g.node('UNETLoader', { unet_name: facts.unet, weight_dtype: 'default' }).out();
    const sla = g.node('H3SLAAttention', {
        model: unet,
        sparsity_ratio: p.sla_sparsity,
        block_size: p.sla_block_size,
        min_seq_len: p.sla_min_seq_len,
        dense_last_steps: p.sla_dense_last_steps,
        protect_audio: p.sla_protect_audio,
        enabled: true,
        dense_steps: p.sla_dense_steps,
        dense_backend: p.sla_dense_backend,
        disable_fp16_accum: p.sla_disable_fp16_accum,
        stabilize_motion: stabilize,
        reference_protection: p.sla_reference_protection !== 'Off',
    }).out();
    const chunked = g.node('MiniMaxChunkFeedForward', {
        model: g.node('MiniMaxLowVRAMAttention', { model: sla, head_chunks: 4 }).out(),
        chunks: 2, seq_threshold: 4096,
    }).out();
    const clip = g.node('CLIPLoader', {
        clip_name: LANE_FILES.clip, type: 'minimax',
    }).out();
    const vaeVideo = g.node('VAELoader', { vae_name: LANE_FILES.vae_video }).out();
    const vaeAudio = g.node('VAELoader', { vae_name: LANE_FILES.vae_audio }).out();
    let slaSel = p.sla_enabled === false
        ? true
        : (p.sla_switch ?? null);
    if (slaSel === null)
        slaSel = g.node('PrimitiveBoolean', { value: false }).out();
    const picked = g.node('ComfySwitchNode', { switch: slaSel, on_true: chunked, on_false: sla }).out();
    const loraModel = g.node('LTX_lora_loader', {
        model: picked, mode: 'minimax', stack_data: h3LoraStackOf(p),
    }).out();
    // The preview override's frame budget: the caller's one clip at
    // the film clock (the film rides its own length node — the clock
    // node is film-owned; a literal rides here, the same posture the
    // reference's fixed preview knobs take).
    const previewed = g.node('ModelPreviewOverrideKJ', {
        max_resolution: 512, jpeg_quality: 80,
        suppress_default_preview: true, preview_frames: Math.round(clipSeconds * 24),
        preview_fps: 8, tiny_vae: 'none', model: loraModel,
    }).out();
    const adaln = g.node('H3AdaLNLoRAFix', { model: previewed, mode: 'port' }).out();
    const sigmaModel = g.node('MiniMaxH3SigmaShift', {
        model: adaln, shift_video: h3ShiftVideoOf(p), shift_audio: p.shift_audio,
    }).out();
    const samplerSel = g.node('KSamplerSelect', { sampler_name: 'euler' }).out();
    return { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio };
};
/** The plan node's own widget band for clip_seconds (live
 * object_info: FLOAT min 2.5 max 15.0). The estate's grid rungs run
 * 22f–362f = 0.917s–15.083s, so the edge rungs (22/39/56f under,
 * 362f over) used to build graphs the engine REFUSED at submit
 * (validate_prompt's value_smaller_than_min — the works audit's F1:
 * the card's own 2.33s default extend died there). The plan feed
 * clamps into the band; the TRUE window length rides the chain's
 * own seats (default_duration_seconds bounds 0.1–149.7,
 * preview_frames), which never reject a rung. */
const PLAN_CLIP_BAND = { min: 2.5, max: 15.0 };
const planClipFeed = (seconds) => Math.min(PLAN_CLIP_BAND.max, Math.max(PLAN_CLIP_BAND.min, seconds));
/** Emit the shared masked-edit chain for one seat. The node
 * parameters are the three seats' historical spellings, verbatim;
 * the seat's deltas arrive through the seat interface. The emission
 * ends in LoopEnd (top_level_requeue) and, when configured,
 * ChainAssemble.
 * @param g the run's graph builder
 * @param seat the seat's deltas (see MaskedChainSeat)
 * @returns the trimmed window + optional assemble path (see ChainRender) */
export function renderMaskedEditChain(g, seat) {
    const { p, facts } = seat;
    // ── the family's own model + lora plane (the shared masked-edit
    // seat — the operator's lora law; a seat NEVER hand-rolls a stack) ──
    const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } = h3MaskedEditPlane(g, p, facts, seat.clipSeconds);
    // ── the audio prep (the seats' shared posture: the source audio
    // trims to the loop budget; the slice's copy is muted — the edit
    // latent holds the source picture, never its sound) ──
    const srcAudioTrim = g.node('TrimAudioDuration', {
        start_index: 0, duration: 2048, audio: seat.srcAudio,
    }).out(0);
    const sliceAudio = g.node('AudioAdjustVolume', {
        volume: -100, audio: srcAudioTrim,
    }).out(0);
    // ── the plan head (the entry's scalars, engine-derived geometry;
    // picture_1 = the seat's anchor — the grid snap + tier scaling
    // stay ENGINE-OWNED, never re-derived renderer-side). clip_seconds
    // rides the WIDGET BAND clamp above (the node's own floor/ceiling
    // would 400 the edge rungs at submit); the window's true length
    // rides default_duration_seconds below, never this seat ──
    const plan = g.node('H3OneClickSwapPlan', {
        clip_seconds: planClipFeed(seat.clipSeconds),
        overlap_frames: seat.overlapFrames,
        resolution: seat.resolution,
        steps: seat.steps,
        seed: seat.seed,
        roles: seat.roles,
        source_frames: seat.srcFrames,
        picture_1: seat.picture1,
    });
    const profile = g.node('MiniMaxH3GenerationProfile', {
        scene_continuity: 'Hard picture + protected audio',
        audio_profile: 'Generate audio',
    }).out(0);
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
    }).out(0);
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
    }).out(0);
    const loop = g.node('MiniMaxH3ChainLoopStart', {
        start_clip: 1, scene_range: '', verify_resume_history: true,
        plan: chainPlan, source_timeline: timeline,
    });
    const cur = g.node('MiniMaxH3ChainCurrent', {
        align_audio_reference: false, state: loop.out(1),
    });
    const mutedChainAudio = g.node('AudioAdjustVolume', {
        volume: -100, audio: cur.out(12),
    }).out(0);
    // ── the seat's masked-edit body (anchors + slice + edit latent +
    // masked target — the seat's true deltas) ──
    const { conditioning, targetLatent } = seat.body({
        cur, clip, vaeVideo, vaeAudio, mutedChainAudio,
        srcFrames: seat.srcFrames, sliceAudio,
    });
    const ctx = g.node('MiniMaxH3ChainContext', {
        state: cur.out(0), conditioning,
        vae: vaeVideo, latent: targetLatent, audio_vae: vaeAudio,
    });
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
    }).out(0);
    const decoded = g.node('VAEDecode', { samples: sample, vae: vaeVideo }).out(0);
    const decodedAudio = g.node('VAEDecodeAudio', { samples: sample, vae: vaeAudio }).out(0);
    const trimmed = g.node('MiniMaxH3LoopTrim', {
        trim_frames: ctx.out(1), fps: 24, match_tail: true,
        audio_trim_mode: 'sync_with_video',
        images: decoded, audio: decodedAudio, state: cur.out(0),
    });
    const seg = g.node('MiniMaxH3ChainSegmentSave', {
        state: cur.out(0), images: trimmed.out(0), sampled_latent: sample,
        audio: trimmed.out(1), images_with_overlap: trimmed.out(2),
    }).out(0);
    const review = g.node('MiniMaxH3ChainReview', {
        enabled: false, play_notification_sound: false,
        auto_continue_timeout_minutes: 0, unload_models_while_waiting: false,
        assemble_partial_on_stop: true, partial_audio_source: 'checkpointed',
        candidate_count: 1, review_each_candidate: false,
        state: cur.out(0), segment: seg, audio: trimmed.out(1),
    }).out(0);
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
    });
    // ── the terminal: ChainAssemble when the seat assembles in-chain
    // (the latent-seam machinery — blend_schedule 'plan' rides the
    // policy's own overlaps); null when the seat joins by file. ──
    if (seat.assemble === null)
        return { trimmed, assemblePath: null };
    const assemble = g.node('MiniMaxH3ChainAssemble', {
        audio_source: seat.assemble.audioSource,
        filename: seat.assemble.filename,
        audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
        blend_schedule: 'plan', boundary_tone_match: 'off',
        color_stabilization: 'off', delete_checkpoints_after_assembly: false,
        generated_audio_join: 'av_overlap',
        manifest: loopEnd.out(0),
    });
    return { trimmed, assemblePath: assemble.out(0) };
}
//# sourceMappingURL=chainEdit.js.map