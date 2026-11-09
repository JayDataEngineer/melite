import { LANE_FILES, h3LoraStackOf, h3ShiftVideoOf } from './actions.js';
import { mountRefModBake } from './refmodBake.js';
import { wireList } from './schema.js';
import { REF_CAPS } from './timelineContract.js';
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
/** THE SOURCE→NESTED-AV TARGET CONSTRUCTOR (the timeline rework's
 *  stage-1 seam, 2026-11-15; operator order: "do the rework of the
 *  timeline mods according to your judgment"): the two-node pair
 *  every masked-edit seat composes — MiniMaxH3FantasticVideoEditLatent
 *  (grow 0, the plane's VAEs, the mask over the frames) →
 *  MiniMaxH3ContexMaskedTarget (white = generate, the audio mode the
 *  keepAudio dial spells, H3 exact conversion). Swap, repair,
 *  extend, refine (its joint AV target) and the video-edit matrix
 *  (edit.ts, the stage-2a free cells) all ride THIS one spelling —
 *  four hand-rolled copies existed before (the audits' "one
 *  mechanism, seven names" root); a sixth rider composes here too,
 *  never beside. The MASK is the caller's own (a static PNG seat, a
 *  grown blur mask, an all-white SolidMask sized to the loader) —
 *  the mask SOURCE is a dial, the edit+target pair is the
 *  mechanism.
 * @param g the run's graph builder
 * @param plane the plane's two VAE seats
 * @param source the frames + soundtrack the latent nests, the mask
 *  over them, and the keepAudio dial (true: the source's soundtrack
 *  rides the joint latent's audio stream; false: every window's
 *  audio is generated)
 * @returns the nested video+audio target latent the seat's sampler
 *  rides */
export const contexMaskedTarget = (g, plane, source) => {
    const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
        grow: 0, keep_audio: source.keepAudio, megapixels: 0,
        vae: plane.vaeVideo, images: source.frames, mask: source.mask,
        audio_vae: plane.vaeAudio, audio: source.audio,
    }).out(0);
    return g.node('MiniMaxH3ContexMaskedTarget', {
        mask_meaning: 'white = generate',
        audio_mode: source.keepAudio ? 'preserve source audio' : 'generate all audio',
        mask_conversion: 'H3 exact (causal/token max)',
        target_latent: edit, mask: source.mask,
    }).out(0);
};
// ── F18 — THE CROSS-REGIME ADMISSION (2026-11-12) ──────────────────
// Two resolution regimes live in one family: the FILM path renders
// at the doc's own width/height (schema defaults 1344×768), the mod
// bags (replace/repair/extend) render at a plan TIER — a short-edge
// label the engine resolves against the source's own shape. Mixed
// film+mod chains joined mismatched shapes silently (friction F18):
// the film at 1344×768, the mod window at 736p = 1280×736. The cure
// is an ADMISSION WARNING at the compose door (operator order
// 2026-11-12: warn loud, name both regimes and the pin — no render
// output changes, never a refusal). The tier math below is the
// ENGINE'S OWN LAW, ported verbatim from the live extension
// (comfyui-h3-oneclick-swap/__init__.py): RESOLUTIONS at line 28
// maps every tier to its short edge; plan_clips at lines 268-273
// scales the SOURCE shape by shortEdge/min(w,h) and snaps both
// edges to 32. The port cites the pin too: a tier whose short edge
// equals the film's own short edge composes the film's shape
// exactly (768p on 1344×768: scale 1.0 — the join stays
// shape-true), and any other shape reconciles through the plan
// node's optional short_edge knob (step 32), never by re-rendering
// the film.
export const RESOLUTION_SHORT_EDGE = {
    '480p': 480, '576p': 576, '736p': 736, '768p': 768, '1080p': 1080,
};
/** The engine's plan_clips shape math, ported (ext lines 270-273):
 * scale the source by shortEdge/min(w,h), snap both edges to 32
 * (round), floor 32. Cited, never re-derived — an engine-side move
 * of this math must update this port or the admission lies. */
export const planTierShape = (width, height, shortEdge) => {
    const scale = shortEdge / Math.min(width, height);
    return {
        width: Math.max(32, Math.round(width * scale / 32) * 32),
        height: Math.max(32, Math.round(height * scale / 32) * 32),
    };
};
/** P0-3 (defect board row 3, the operator's law: "default the
 * plan tier to the source clip's own geometry. An agent should
 * never know the source's tier") — THE TIER-FROM-CLIP PIN: the tier
 * whose short edge equals the film regime's own short edge
 * (768p for 1344×768 — the shape-true join), or when no tier
 * spells it, the NEAREST rung by absolute delta (a tie takes the
 * smaller edge — never an upscale by default); the admission then
 * names the short_edge counsel for the residual mismatch.
 * @param filmWidth the film regime's width (the doc knob)
 * @param filmHeight the film regime's height (the doc knob)
 * @returns the tier label the plan node takes */
export const planTierPinOf = (filmWidth, filmHeight) => {
    const filmShort = Math.min(filmWidth, filmHeight);
    const exact = Object.entries(RESOLUTION_SHORT_EDGE).find(([, e]) => e === filmShort)?.[0];
    if (exact !== undefined)
        return exact;
    return Object.keys(RESOLUTION_SHORT_EDGE).reduce((best, k) => {
        const d = Math.abs(RESOLUTION_SHORT_EDGE[k] - filmShort);
        const bd = Math.abs(RESOLUTION_SHORT_EDGE[best] - filmShort);
        return d < bd || (d === bd && RESOLUTION_SHORT_EDGE[k] < RESOLUTION_SHORT_EDGE[best]) ? k : best;
    }, '736p');
};
/** P0-3 — the entry's stated tier VERBATIM, else the film's own
 * pin: 'auto' (the form's derived default) and absence both derive.
 * The agent never states a tier unless they mean to override the
 * film's own geometry.
 * @param entry the cell's bound entry (resolution seat)
 * @param p the walked doc params (the film regime's width/height)
 * @returns the tier label the plan node takes */
export const resolvePlanTier = (entry, p) => {
    const stated = typeof entry['resolution'] === 'string' ? entry['resolution'] : '';
    if (stated !== '' && stated !== 'auto')
        return stated;
    const w = typeof p['width'] === 'number' ? p['width'] : 1344;
    const h = typeof p['height'] === 'number' ? p['height'] : 768;
    return planTierPinOf(w, h);
};
/** THE CROSS-REGIME JOIN ADMISSION: given the film regime's shape
 * (the doc's width/height — the shape this estate's film arm
 * renders and the join appends onto) and the mod bag's tier, answer
 * the admission text when the tier would render a DIFFERENT shape,
 * null when the join is shape-true. The text names both regimes,
 * the engine-derived mod shape, and the pin (the tier whose short
 * edge matches the film's — 768p for the film regime's 768 short
 * edge — or the plan node's short_edge knob for any other shape).
 * @param filmWidth the film regime's width (the doc knob)
 * @param filmHeight the film regime's height (the doc knob)
 * @param tier the mod bag's resolution tier (e.g. '736p')
 * @returns the admission warning text, or null when shapes agree */
export const admitCrossRegimeJoin = (filmWidth, filmHeight, tier) => {
    const shortEdge = RESOLUTION_SHORT_EDGE[tier];
    if (shortEdge === undefined)
        return null;
    const shape = planTierShape(filmWidth, filmHeight, shortEdge);
    if (shape.width === filmWidth && shape.height === filmHeight)
        return null;
    const filmShort = Math.min(filmWidth, filmHeight);
    const pin = Object.entries(RESOLUTION_SHORT_EDGE)
        .find(([, e]) => e === filmShort)?.[0];
    const pinText = pin !== undefined
        ? `pin the bag's resolution ${pin} (short edge ${String(filmShort)} — the plan then composes ${String(filmWidth)}×${String(filmHeight)} exactly)`
        : `pin the plan's short_edge ${String(filmShort)} (the film's own short edge — no tier spells it)`;
    return `h3-timeline: CROSS-REGIME JOIN — the film regime renders ${String(filmWidth)}×${String(filmHeight)} but the mod bag's tier '${tier}' renders ${String(shape.width)}×${String(shape.height)} on a film-shaped source (the engine scales the short edge to ${String(shortEdge)}, snaps to 32); the join mismatches shapes. To join shape-true, ${pinText}; to keep the mismatch, carry on — this admission warns, it never refuses.`;
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
/** Wire the sheet handles into an r2v creator's image slots at the
 * cell's first free index (each cell owns its anchor count; the
 * spine owns the load + the cap). A symmetric input slot to the
 * agent, machinery to the graph.
 * @param refImages the declared sheet handles (possibly empty).
 * @param base the cell's first free ref_images index.
 * @returns dotted-slot inputs for the creator node. */
export function sheetRefSlots(refImages, base) {
    const out = {};
    refImages.forEach((h, i) => {
        out[`ref_images.ref_image_${base + i}`] = h;
    });
    return out;
}
/** The plan node's own widget band for clip_seconds (live
 * object_info: FLOAT min 2.5 max 15.0). The estate's grid rungs run
 * 22f–362f = 0.917s–15.083s, so the edge rungs (22/39/56f under,
 * 362f over) used to build graphs the engine REFUSED at submit
 * (validate_prompt's value_smaller_than_min — the works audit's F1:
 * the card's own 2.33s default extend died there). The plan feed
 * clamps into the band; the TRUE window length rides the chain's
 * own seats (default_duration_seconds bounds 0.1–149.7,
 * preview_frames), which never reject a rung. */
/** @dev Judged against the boot census (served-grid-truth.spec.ts's
 *  band arm): the fixture's H3OneClickSwapPlan row is the engine's
 *  own word, and this pin must match it or the wall reds — an
 *  engine-side band move can never silently outdate the clamp. */
export const PLAN_CLIP_BAND = { min: 2.5, max: 15.0 };
const planClipFeed = (seconds) => Math.min(PLAN_CLIP_BAND.max, Math.max(PLAN_CLIP_BAND.min, seconds));
/** The plan head's own overlap widget vocabulary — the LIVE engine's
 * word (object_info H3OneClickSwapPlan.overlap_frames: COMBO
 * [22, 39, 56], default 39; the bench burn 2026-11-16, run
 * run-84806ec44694's cell B: a carry:false press landed 0 on this
 * widget and validate_prompt refused it eight nodes deep — "the
 * input allows 3 values (22, 39, 56)"). The plan head's slicing is
 * NOT the edit's join seat: an edit's join (the cut 0, the wider AV
 * boundaries 90/141/192/243) serves AUTHORED shots' context_length,
 * never this widget — every join the resolver can derive other than
 * 39 is unservable here and must die at COMPOSE, not at submit.
 * @dev Judged against the boot census (served-grid-truth.spec.ts's
 *  overlap band arm): the fixture's H3OneClickSwapPlan row is the
 *  engine's own word, and this pin must match it or the wall reds —
 *  an engine-side vocabulary move can never silently outdate the
 *  feed. */
export const PLAN_OVERLAP_CHOICES = [22, 39, 56];
/** THE PLAN-HEAD OVERLAP FEED (the bench-burn cure): the widget
 * always rides a legal choice, and the ONLY join a source-slicing
 * plan head serves is the AV-legal 39 — the one value both
 * vocabularies share. Authored-shot seats (planFromSource false:
 * the literal plan_json rules, the plan node's output is unread)
 * ride the node's own default 39 on the inert widget; a join ≠ 39
 * there is served where it lives, on the shots' context_length. A
 * source-slicing seat (planFromSource true) that resolves a join ≠ 39
 * REFUSES HERE, at the compose door, naming the cure — the run dies
 * at zero GPU, never eight nodes deep at submit.
 * @param overlapFrames the resolver's join (resolveCarryOverlap)
 * @param literalShotsRules whether authored shots rule this run
 * @returns the widget value: always a legal choice */
const planOverlapFeed = (overlapFrames, literalShotsRules) => {
    if (literalShotsRules)
        return 39;
    if (overlapFrames !== 39) {
        throw new Error(`h3-timeline edit chain: the join ${overlapFrames} cannot ride the source-slicing plan head — H3OneClickSwapPlan.overlap_frames carries the live engine's [${PLAN_OVERLAP_CHOICES.join(', ')}] and the AV-legal join a masked edit serves is 39; a CUT (0) serves AUTHORED windows only (the shot's own context_length 0 — split the film on the timeline first, then state carry: false), and the wider AV boundaries (90/141/192/243) belong to authored seams, never the plan head's own slicing. Leave carry unstated (or carry: true) and the join derives 39`);
    }
    return 39;
};
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
        overlap_frames: planOverlapFeed(seat.overlapFrames, !seat.planFromSource),
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
    // ── THE SHEET (P0-1's second half): ref_images stated once at
    // the doc level, loaded once here, wired by the cell at its first
    // free slot. The cap is the one the gen door states (the bag's
    // own max_stack, REF_CAPS.images): one number for both doors, the
    // slot INDEX merely shifts under a cell's own anchor. A longer
    // sheet refuses LOUD (the gen bus law — never a silent clobber
    // onto the video lane). ──
    const sheetRefs = wireList(seat.p.ref_images);
    if (sheetRefs.length > REF_CAPS.images) {
        throw new Error(`[h3-timeline] ref_images exceeds the reference-image cap (saw ${String(sheetRefs.length)}, max ${String(REF_CAPS.images)})`);
    }
    const refImages = sheetRefs.map((src) => g.node('LoadImage', { image: src, upload: 'image' }).out(0));
    // ── the seat's masked-edit body (anchors + slice + edit latent +
    // masked target — the seat's true deltas) ──
    const { conditioning: bodyCond, targetLatent } = seat.body({
        cur, clip, vaeVideo, vaeAudio, mutedChainAudio,
        srcFrames: seat.srcFrames, sliceAudio, refImages,
    });
    // ── THE REFMOD BAKE (P0-1's first half): the identical bake the
    // film path mounts, appended onto the edit conditioning — the
    // chain applies it to every window (the loop's own conditioning
    // seat), so the bake is per-window through the chain's own law.
    // An empty seat returns the handle untouched (byte-stable). ──
    const conditioning = mountRefModBake(g, { p: seat.p, cond: bodyCond, vaeVideo, vaeAudio });
    const ctx = g.node('MiniMaxH3ChainContext', {
        state: cur.out(0), conditioning,
        vae: vaeVideo, latent: targetLatent, audio_vae: vaeAudio,
    });
    // ── the sampler tail (the denoise pole is the seat's one knob:
    // full 1 fresh — swap/extend; partial refine — the repair's law).
    // THE UPSCALE DIAL (the fourth dial): refine on swaps the tail
    // for the learned RefineHandoff — the SAME latent (ctx.out(3)),
    // the SAME conditioning (ctx.out(0)), the same noise/sampler/
    // sigmas; the node upscales the joint-AV latent and runs the
    // low-sigma pass internally (refine.ts's own wiring, riding the
    // chain's LIVE latents). Downstream seats consume the same
    // sampled-latent seam — segments still checkpoint (the chain
    // store that writes the revisions a deferred upscale reads). ──
    const sample = seat.upscale === undefined
        ? g.node('SamplerCustomAdvanced', {
            noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
            guider: g.node('BasicGuider', { model: sigmaModel, conditioning: ctx.out(0) }).out(0),
            sampler: samplerSel,
            sigmas: g.node('BasicScheduler', {
                scheduler: 'simple', steps: cur.out(7), denoise: seat.denoise, model: sigmaModel,
            }).out(0),
            latent_image: ctx.out(3),
        }).out(0)
        : g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
            latent: ctx.out(3),
            noise: g.node('RandomNoise', { noise_seed: cur.out(5) }).out(0),
            sampler: samplerSel,
            sigmas: g.node('BasicScheduler', {
                scheduler: 'simple', steps: cur.out(7), denoise: seat.denoise, model: sigmaModel,
            }).out(0),
            model: sigmaModel,
            positive: ctx.out(0),
            model_name: seat.upscale.modelName,
            mode: seat.upscale.mode,
            scale: seat.upscale.scale,
            width: 1280, height: 704, megapixels: 1,
            keep_proportion: true, align: 32,
            lock_audio: true, cfg: 1.0, device: 'cuda', precision: 'bf16',
            offload_after_upscale: false,
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
    if (seat.assemble === null) {
        return { trimmed, assemblePath: null, planShape: { width: plan.out(1), height: plan.out(2) } };
    }
    const assemble = g.node('MiniMaxH3ChainAssemble', {
        audio_source: seat.assemble.audioSource,
        filename: seat.assemble.filename,
        audio_bitrate: 256, copy_to_output: true, output_subfolder: '',
        blend_schedule: 'plan', boundary_tone_match: 'off',
        color_stabilization: 'off', delete_checkpoints_after_assembly: false,
        generated_audio_join: 'av_overlap',
        manifest: loopEnd.out(0),
    });
    return {
        trimmed, assemblePath: assemble.out(0),
        planShape: { width: plan.out(1), height: plan.out(2) },
    };
}
//# sourceMappingURL=chainEdit.js.map