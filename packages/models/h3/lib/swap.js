import { LANE_FILES, h3LoraStackOf, h3ShiftVideoOf } from './actions.js';
/** The swap entry's required media + text seats (the reshoot idiom:
 *  an armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
    ['source_clip', 'the source video whose person is replaced — ONE staged leaf: the VHS slice loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire (its video_path string rides along staged but unread)'],
    ['still', 'the replacement still (the R2V ref_images LoadImage + the plan picture_1)'],
    ['mannequin', 'the mannequin video from the track-card run (the R2V ref_videos H3GreyMannequins output)'],
    ['mask', 'ONE staged PNG from the track-card run — the pixel-max UNION of its grown per-frame masks is recommended (per-frame motion rides the mannequin; the edit-latent + masked-target mask, reference GrowMaskWithBlur expand 40)'],
    ['swap_prompt', 'the swap action text (agent-composed, user-confirmed — the R2V prompt seat; the estate has no in-graph describers)'],
];
const str = (p, k) => typeof p[k] === 'string' ? p[k] : '';
const num = (p, k, d) => typeof p[k] === 'number' ? p[k] : d;
/** The VHS source loader the slice + timeline read (reference node 5
 *  verbatim: force_rate 24 — the film clock — and the zero/one
 *  passthrough knobs; format 'None'). Slot 0 frames, slot 2 audio.
 *  The window seats (repair, 2026-11-12) ride the loader's own cap +
 *  skip — 0/0 is the whole clip, the swap's posture. The SAME loader
 *  yields the frames and the audio, so a windowed load stays in
 *  sync on both wires. Exported: the repair seat loads its window
 *  through the identical spelling. */
export const loadVideo = (g, path, frameLoadCap = 0, skipFirstFrames = 0) => {
    const n = g.node('VHS_LoadVideo', {
        video: path, force_rate: 24, custom_width: 0, custom_height: 0,
        frame_load_cap: frameLoadCap, skip_first_frames: skipFirstFrames,
        select_every_nth: 1, format: 'None',
    });
    return [n.out(0), n.out(2)];
};
/** The family's model + lora plane BOTH masked-edit seats ride
 *  (swap + repair; extracted 2026-11-12 when the repair seat joined
 *  — one sequence, two callers, zero drift). The operator's lora
 *  law, 2026-10-28, verbatim: "WE SAID KEEP OUR CURRENT LORA SETUP
 *  FOR NOW" — facts.unet, the SLA/lowvram/chunked attention chain,
 *  and LTX_lora_loader with h3LoraStackOf(p) (the lora mod bag, else
 *  the absent-bag family default): the same plane the film renders
 *  under, composed in the same order (actions.ts's renderH3Window is
 *  the symmetry owner). No fixed accelerator row, no engine-side
 *  stack the operator cannot see or empty. Creation order is pinned
 *  by the emission walls — keep the node sequence untouched.
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
/** The swap renderer: validates the bound entry, then composes the
 *  masked-edit chain per the reference map above. The film path
 *  never reaches here (the card branches ONLY on a non-empty replace
 *  bag, and refuses a bag under an armed reshoot — one door per doc).
 * @param entry the replace mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs —
 *  the family plane this swap renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3Swap(entry, p, facts, g, runId) {
    for (const [seat, what] of REQUIRED_SEATS) {
        const v = entry[seat];
        if (typeof v !== 'string' || v.trim() === '') {
            throw new Error(`h3-timeline replace: '${seat}' names no media — ${what}; a swap needs all five seats bound (source_clip, still, mannequin, mask, swap_prompt)`);
        }
    }
    const keepAudio = entry.keep_audio !== false;
    const seed = num(entry, 'seed', 0);
    const steps = num(entry, 'steps', 6);
    const clipSeconds = num(entry, 'clip_seconds', 6);
    const resolution = str(entry, 'resolution') || '736p';
    // ── the family's own model + lora plane (delta 1; the film's
    // renderH3Window is the symmetry owner — same nodes, same order,
    // same plane; the swap NEVER hand-rolls a stack). The shared
    // h3MaskedEditPlane helper above carries the identical sequence —
    // the swap body calls it at this exact spot, so creation order
    // (and the emission walls pinning it) is untouched. ──
    const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } = h3MaskedEditPlane(g, p, facts, clipSeconds);
    // ── the staged media (the R0 cards' artifacts: the source clip,
    // the still, the track card's mannequin + grown mask) ──
    const [srcFrames, srcAudio] = loadVideo(g, str(entry, 'source_clip'));
    const stillImg = g.node('LoadImage', { image: str(entry, 'still') }).out(0);
    const maskOf = g.node('ImageToMask', {
        image: g.node('LoadImage', { image: str(entry, 'mask') }).out(0),
        channel: 'red',
    }).out(0);
    const [mannequin] = loadVideo(g, str(entry, 'mannequin'));
    // ── the audio prep (reference nodes 6 + 72 verbatim: the source
    // audio trims to the loop window; the slice's copy is muted — the
    // edit latent holds the source picture, never its sound) ──
    const srcAudioTrim = g.node('TrimAudioDuration', {
        start_index: 0, duration: 2048, audio: srcAudio,
    }).out(0);
    const sliceAudio = g.node('AudioAdjustVolume', {
        volume: -100, audio: srcAudioTrim,
    }).out(0);
    // ── the plan head (the entry's scalars, engine-derived geometry) ──
    const plan = g.node('H3OneClickSwapPlan', {
        clip_seconds: clipSeconds,
        overlap_frames: num(entry, 'overlap_frames', 39),
        resolution,
        steps,
        seed,
        roles: str(entry, 'roles'),
        source_frames: srcFrames,
        picture_1: stillImg,
    });
    const profile = g.node('MiniMaxH3GenerationProfile', {
        scene_continuity: 'Hard picture + protected audio',
        audio_profile: 'Generate audio',
    }).out(0);
    const chainPlan = g.node('MiniMaxH3ChainPlanModern', {
        plan_json: JSON.stringify({ shots: [{ id: 'swap', prompt: str(entry, 'swap_prompt') }] }),
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
    }).out(0);
    const timeline = g.node('MiniMaxH3SourceTimeline', {
        video_path: str(entry, 'source_clip'), audio_path: '', embedded_audio: 'auto',
        skip_first_frames: 0, source_audio: srcAudioTrim,
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
            file: str(entry, 'source_clip'),
        }).out(0),
    }).out(0);
    const loop = g.node('MiniMaxH3ChainLoopStart', {
        start_clip: 1, scene_range: '', verify_resume_history: true,
        plan: chainPlan, source_timeline: timeline,
    });
    const cur = g.node('MiniMaxH3ChainCurrent', {
        align_audio_reference: false, state: loop.out(1),
    });
    // ── the masked edit body ──
    const r2v = g.node('MiniMaxH3ReferenceToVideo', {
        prompt: str(entry, 'swap_prompt'),
        width: cur.out(8), height: cur.out(9), length: cur.out(6),
        ref_image_size: 'match',
        clip, vae: vaeVideo, audio_vae: vaeAudio,
        'ref_images.ref_image_0': stillImg,
        'ref_videos.ref_video_0': mannequin,
        'ref_video_audios.ref_video_audio_0': g.node('AudioAdjustVolume', {
            volume: -100, audio: cur.out(12),
        }).out(0),
    });
    const slice = g.node('H3SourceSlice', {
        source_fps: 24, crop: 'center',
        state: cur.out(0), latent: r2v.out(1),
        audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
    });
    const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
        grow: 0, keep_audio: keepAudio, megapixels: 0,
        vae: vaeVideo, images: slice.out(0), mask: maskOf,
        audio_vae: vaeAudio, audio: slice.out(1),
    }).out(0);
    const target = g.node('MiniMaxH3ContexMaskedTarget', {
        mask_meaning: 'white = generate',
        audio_mode: keepAudio ? 'preserve source audio' : 'generate all audio',
        mask_conversion: 'H3 exact (causal/token max)',
        target_latent: edit, mask: maskOf,
    }).out(0);
    const ctx = g.node('MiniMaxH3ChainContext', {
        state: cur.out(0), conditioning: r2v.out(0),
        vae: vaeVideo, latent: target, audio_vae: vaeAudio,
    });
    // ── the sampler tail (reference 37/58/59/60 verbatim) ──
    const sample = g.node('SamplerCustomAdvanced', {
        noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
        guider: g.node('BasicGuider', { model: sigmaModel, conditioning: ctx.out(0) }).out(0),
        sampler: samplerSel,
        sigmas: g.node('BasicScheduler', {
            scheduler: 'simple', steps: cur.out(7), denoise: 1, model: sigmaModel,
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
    g.node('MiniMaxH3ChainAssemble', {
        audio_source: keepAudio ? 'source' : 'generated',
        filename: `${runId}/swap`,
        audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
        blend_schedule: 'plan', boundary_tone_match: 'off',
        color_stabilization: 'off', delete_checkpoints_after_assembly: false,
        generated_audio_join: 'av_overlap',
        manifest: loopEnd.out(0),
    });
}
//# sourceMappingURL=swap.js.map
