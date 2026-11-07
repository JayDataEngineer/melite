import { contexMaskedTarget, loadVideo, renderMaskedEditChain } from './chainEdit.js';
import { renderH3ChainUpscale } from './chainUpscale.js';
import { renderH3Extend } from './extend.js';
import { REFINE_2X_OOM_FRAMES, REFINE_UPSCALE_MODEL } from './refine.js';
import { assertGridLength } from './timelineContract.js';
/** SAM3's checkpoint row — repair.ts's own spelling (the family's
 * one tracked-mask door; the card's constant cites the same file). */
const SAM3_CKPT = 'sam3.1_multiplex_fp16.safetensors';
/** The near-full-denoise floor of the identity-safety refusal. */
export const EDIT_IDENTITY_BOIL_FLOOR = 0.8;
const str = (p, k) => typeof p[k] === 'string' ? p[k] : '';
const num = (p, k, d) => typeof p[k] === 'number' ? p[k] : d;
/** THE VIDEO-EDIT MATRIX RENDERER: composes one free cell of the
 * mask × reference × denoise matrix on the family's one chain
 * spine. Validates the safety law, derives the dial's own mask and
 * anchors, and hands a body that rides contexMaskedTarget — the
 * stage-1 seam, never a hand-rolled pair.
 * @param entry the edit entry's own seats (edit_prompt, denoise,
 * keep_audio, seed, steps, clip_seconds, overlap_frames,
 * resolution, window_start, window_length, mask_grow, mask_blur,
 * detection_threshold — the card's one bag)
 * @param mask the mask dial's resolved value
 * @param reference the reference dial's resolved value
 * @param p the walked doc params (the lora mod bag + SLA/shift
 * knobs — the family plane this edit renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it)
 * @throws refuses the identity boil (whole-frame × self × denoise
 * >= 0.8), the incoherent audio drop (partial denoise ×
 * keep_audio false), the off-grid stated window, and the negative
 * window seats — each loud, each naming the dial to state */
export function renderH3Edit(entry, mask, reference, p, facts, g, runId) {
    const prompt = str(entry, 'edit_prompt');
    // THE UPSCALE CARVE-OUT: under the loop posture (chain_run
    // stated) a blank prompt is lawful — the second pass reuses the
    // SOURCE RUN'S own per-scene prompts (the conditioning node's
    // documented posture); a bound prompt overrides every scene's
    // pass-2 text.
    const chainRun = str(entry, 'chain_run');
    if (prompt.trim() === '' && chainRun.trim() === '') {
        throw new Error(`h3-timeline edit: 'edit_prompt' names no action — the edit needs its text (what the masked region or frame should become; agent-composed, user-confirmed)`);
    }
    const denoise = num(entry, 'denoise', 1);
    if (!(denoise > 0 && denoise <= 1)) {
        throw new Error(`h3-timeline edit: denoise ${denoise} — the pole lives (0, 1] (partial holds the unmasked region, 1 re-renders the masked one whole); state the dial inside the band`);
    }
    const keepAudio = entry.keep_audio !== false;
    // ── THE UPSCALE POSTURE (slice 3 of the collapse — the doc's
    // collapse map: "upscale = source: prior run + scale 2x"): a
    // stated chain_run seats the door into the DEFERRED second pass
    // — the prior chain run's checkpointed scenes resumed scene by
    // scene through the requeue loop (CheckpointManager →
    // UpscaleAdapter → … → UpscaleLoopEnd), a DIFFERENT mechanism
    // than the refine switch's same-run handoff (the doc's
    // "duplicate 2x" resolved: one door, the SOURCE names which).
    // The clip dials (mask, anchors, window) are inert here — the
    // loop has no masked target and no source clip; denoise rides
    // the pass-2 window (the loop's own law refuses >= 1 below).
    // ──
    if (chainRun.trim() !== '') {
        if (entry.refine === true) {
            throw new Error(`h3-timeline edit: the refine switch under an upscale — two second-pass mechanisms (the switch arms the same-run handoff on THIS chain, the upscale resumes a PRIOR run's checkpointed scenes; the doc's duplicate-2x resolved into ONE door). Leave refine off`);
        }
        if (entry.continuation === true) {
            throw new Error(`h3-timeline edit: a continuation under an upscale — the continuation generates FRESH seconds off a source clip, the upscale resumes a PRIOR run's checkpointed scenes (no clip rides); state one posture`);
        }
        renderH3ChainUpscale({
            chain_run: chainRun,
            // the loop owns the denoise law on its posture (the
            // placement cut: verbatim-or-absent — undefined rides
            // the 0.24 default inside, a STATED 1 refuses loud at
            // the loop's own law, never at a matrix law above)
            ...(typeof entry.denoise === 'number'
                ? { denoise: entry.denoise }
                : {}),
            steps: num(entry, 'steps', 20),
            segment_crf: num(entry, 'segment_crf', 18),
            prompt,
        }, p, facts, g, runId);
        return;
    }
    // ── THE CONTINUATION DIAL (slice 2 of the collapse — the doc's
    // collapse map: "extend = mask=whole-frame + continuation policy,
    // not a separate arm"): continuation ON delegates to the
    // continuation seat — fresh full-denoise seconds appended to the
    // prior's last frame (the forced AddGuide seam), joined into one
    // film. Four posture laws refuse loud before the delegation ──
    if (entry.continuation === true) {
        if (mask.source !== 'whole-frame') {
            throw new Error(`h3-timeline edit: a masked continuation (mask_source '${mask.source}') — extended seconds are NEW content, nothing is held; the continuation rides the blank mask (mask_source whole-frame)`);
        }
        if (reference.mode !== 'self') {
            throw new Error(`h3-timeline edit: an anchored continuation (reference '${reference.mode}') — the continuation's anchors are the prior's own (its last frame as the pixel anchor, the whole clip as the motion identity); reference stays self`);
        }
        if (denoise !== 1) {
            throw new Error(`h3-timeline edit: denoise ${denoise} under a continuation — extended seconds generate FRESH at full denoise (a partial pass would hold pixels that do not exist yet); state denoise 1 or leave continuation off`);
        }
        if (entry.refine === true) {
            throw new Error(`h3-timeline edit: the refine pass under a continuation — the continuation's tail is fresh generation (full noise); a full-noise refine discards the learned latent (the same law that refuses denoise 1 under the switch). Leave refine off`);
        }
        renderH3Extend({
            source_clip: str(entry, 'source_clip'),
            extend_prompt: prompt,
            extend_seconds: num(entry, 'extend_seconds', 2.33),
            seed: num(entry, 'seed', 0),
            steps: num(entry, 'steps', 6),
            resolution: str(entry, 'resolution') || '736p',
            overlap_frames: num(entry, 'overlap_frames', 39),
        }, p, facts, g, runId);
        return;
    }
    // THE REFINE FULL-NOISE LAW (hoisted above the boil by the
    // placement law — slice 4: the specific refusal owns the cell it
    // names; under the refine switch the full-noise sigma law fires,
    // never the general boil beside it).
    if (entry.refine === true && denoise >= 1) {
        throw new Error(`h3-timeline edit: denoise ${denoise} with the refine pass on — a second pass is a refine, never a re-render (a full-noise sigma discards the learned upscaled latent and the vendored node throws); state the partial window (0.05–0.5) or leave refine off`);
    }
    // THE UNGUIDED FULL RENDER (the doc's one deliberate loss,
    // re-authored as validation — slice 4): a MASKED full-denoise
    // pass anchored to nothing but the source is the identity-swap
    // cell with its anchors unstated — the arm-name safety the peer
    // bags carried, stated as the parameter law that replaces it.
    if (denoise >= 1 && mask.source !== 'whole-frame' && reference.mode === 'self') {
        throw new Error(`h3-timeline edit: denoise ${denoise} on the self anchor with a mask — an unguided full re-render of the masked region (the identity-swap cell with its anchors unstated; the subject drifts with no replacement identity to hold). State reference still+mannequin (the swap posture) or the partial window (denoise < 1, the repair posture)`);
    }
    // THE IDENTITY BOIL (F3-17's fold): near-full denoise, no anchor
    // but the source itself, nothing held — that is a style boil with
    // the subject's own prior as its only identity, and the friction
    // audit watched it break identity while reading as an
    // improvement. Name the two lawful doors, refuse the cell.
    if (mask.source === 'whole-frame' && reference.mode === 'self' && denoise >= EDIT_IDENTITY_BOIL_FLOOR) {
        throw new Error(`h3-timeline edit: whole-frame × self reference × denoise ${denoise} — the identity boil (a near-full re-render whose only identity anchor is the source's own prior drifts the subject while reading as an improvement, the F3-17 burn). Anchor it (reference still+mannequin) or use the reshoot door for a true re-render`);
    }
    // THE AUDIO HOLD: a partial pass holds the unmasked region — and
    // the soundtrack is the hold's other half. Dropping it is never a
    // coherent cell; the full pole dials it.
    if (denoise < 1 && !keepAudio) {
        throw new Error(`h3-timeline edit: denoise ${denoise} with keep_audio off — a partial pass holds the unmasked region and its sound (the hold is the point); generated audio rides only the full-denoise pole (state denoise 1 to drop the source soundtrack)`);
    }
    const windowStart = num(entry, 'window_start', 0);
    const windowLength = num(entry, 'window_length', 0);
    if (windowStart < 0 || windowLength < 0) {
        throw new Error(`h3-timeline edit: window_start ${windowStart} / window_length ${windowLength} — a window seat never goes negative (frames at the film clock, 24 fps; 0/0 is the whole clip)`);
    }
    if (windowLength > 0)
        assertGridLength(Math.round(windowLength), 'h3-timeline edit window_length');
    // ── THE UPSCALE DIAL (the fourth dial — FRICTION_3's DESIGN
    // PROPOSAL: "I flip a switch for refine, it opens up a submenu
    // for scaling"): refine ON adds the learned second pass to THIS
    // chain — the handoff rides the edit's own latents (the same-run
    // pass, never the saved-clip re-encode). Two laws ride the
    // switch renderer-side: partial denoise only (a full-noise sigma
    // discards the learned upscaled latent and the vendored node
    // throws), and the >=2x OOM ceiling with its two cures — the
    // multiplier band itself is the walk's declared-band judge
    // (F3-07's landed law: the declaration binds, not the tooltip),
    // never re-judged where the card door cannot reach a second
    // opinion.
    // `scale` is INERT when refine is off (resolve default-fills it —
    // the default-fill burn's law: presence is never authorship). ──
    const refineOn = entry.refine === true;
    const scale = num(entry, 'scale', 2);
    if (refineOn) {
        const windowFrames = windowLength > 0
            ? Math.round(windowLength)
            : Math.round(num(entry, 'clip_seconds', 6) * 24);
        if (scale >= 2 && windowFrames > REFINE_2X_OOM_FRAMES) {
            throw new Error(`h3-timeline edit: a ${windowFrames} f window at refine ${scale}x is TOO LONG — the 2x pass was measured OOM at ${REFINE_2X_OOM_FRAMES} f (H3 memory grows with the window; whichever sizing mode upsizes, a window that dies is a window too long). Cut the window (window_length / clip_seconds) or lower scale below 2 for a same-size pass`);
        }
    }
    if (mask.source === 'static-png' && mask.image.trim() === '') {
        throw new Error(`h3-timeline edit: the static-png mask dial names no image — bind ONE staged PNG (the track run's pixel-max union is the recommended bridge); per-frame motion is the region dial's own door`);
    }
    if (mask.source === 'region' && mask.prompt.trim() === '') {
        throw new Error(`h3-timeline edit: the region mask dial names no target — state the free-text SAM3 detection prompt ("hands", "a person", "a face")`);
    }
    if (reference.mode === 'still+mannequin' && (reference.still.trim() === '' || reference.mannequin.trim() === '')) {
        throw new Error(`h3-timeline edit: the still+mannequin reference dial needs both seats bound (the still anchors appearance, the mannequin carries motion); a self-anchored edit states the self reference`);
    }
    // ── the staged media: the window loader (cap + skip on one VHS
    // seat — frames and audio stay in sync) ──
    const sourceClip = str(entry, 'source_clip');
    if (sourceClip.trim() === '') {
        throw new Error(`h3-timeline edit: 'source_clip' names no media — the edit rides a staged clip (ONE leaf: the VHS window loader + the core LoadVideo read it by staged name)`);
    }
    const [srcFrames, srcAudio] = loadVideo(g, sourceClip, Math.round(windowLength), Math.round(windowStart));
    // ── the mask dial's own derivation (outside the body, the
    // presets' posture: repair's SAM3 chain, swap's staged PNG) ──
    let regionMasks;
    if (mask.source === 'region') {
        const scaled = g.node('ImageScaleToMaxDimension', {
            image: srcFrames, upscale_method: 'area', largest_size: 1008,
        }).out(0);
        const sam = g.node('CheckpointLoaderSimple', { ckpt_name: SAM3_CKPT });
        const regionCond = g.node('CLIPTextEncode', {
            text: mask.prompt, clip: sam.out(1),
        }).out(0);
        const track = g.node('SAM3_VideoTrack', {
            images: scaled, model: sam.out(0), conditioning: regionCond,
            detection_threshold: mask.detectionThreshold,
            max_objects: 0, detect_interval: 1,
        }).out(0);
        regionMasks = g.node('SAM3_TrackToMask', {
            track_data: track, object_indices: '',
        }).out(0);
    }
    // ── the reference dial's own media + the plan's geometry anchor
    // (picture_1: the still when the still anchors identity, the
    // window's own first frame when the source does — repair's
    // truthful-anchor posture) ──
    const stillImg = reference.mode === 'still+mannequin'
        ? g.node('LoadImage', { image: reference.still }).out(0)
        : undefined;
    const [mannequin] = reference.mode === 'still+mannequin'
        ? loadVideo(g, reference.mannequin)
        : [undefined];
    // the plan's geometry anchor: the still when the still anchors
    // identity, the window's own first frame when the source does
    // (repair's truthful-anchor posture) — exactly ONE anchor node is
    // created; a graph seat never serializes an unused node
    const anchorFrame = stillImg === undefined
        ? g.node('ImageFromBatch', {
            image: srcFrames, batch_index: 0, length: 1,
        }).out(0)
        : stillImg;
    renderMaskedEditChain(g, {
        p, facts,
        clipSeconds: num(entry, 'clip_seconds', 6),
        overlapFrames: num(entry, 'overlap_frames', 39),
        resolution: str(entry, 'resolution') || '736p',
        seed: num(entry, 'seed', 0),
        steps: num(entry, 'steps', 6),
        roles: '',
        sourceClip,
        windowStart,
        picture1: anchorFrame,
        srcFrames, srcAudio,
        // the ignored literal fallback — the plan node's SOURCE-SLICED
        // shots ride plan_json_input (the swap/repair semantics)
        planJson: JSON.stringify({ shots: [{ id: 'edit', prompt }] }),
        planFromSource: true,
        denoise,
        ...(refineOn
            ? { upscale: { mode: 'scale by multiplier', scale, modelName: REFINE_UPSCALE_MODEL } }
            : {}),
        assemble: {
            audioSource: keepAudio ? 'source' : 'generated',
            filename: `${runId}/edit`,
        },
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio }) => {
            // ── the reference dial's r2v: the anchors the conditioning
            // rides (swap's pair, or repair's self seat) ──
            const r2v = g.node('MiniMaxH3ReferenceToVideo', {
                prompt,
                width: cur.out(8), height: cur.out(9), length: cur.out(6),
                ref_image_size: 'match',
                clip, vae: vaeVideo, audio_vae: vaeAudio,
                ...(reference.mode === 'still+mannequin'
                    ? {
                        'ref_images.ref_image_0': stillImg,
                        'ref_videos.ref_video_0': mannequin,
                    }
                    : { 'ref_videos.ref_video_0': srcFrames }),
                'ref_video_audios.ref_video_audio_0': mutedChainAudio,
            });
            const slice = g.node('H3SourceSlice', {
                source_fps: 24, crop: 'center',
                state: cur.out(0), latent: r2v.out(1),
                audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
            });
            // ── the mask dial, in-body: the per-scene slice + grow the
            // region tracks demand, the SCALED staged PNG (F3-16 defect
            // 1), or the all-white SolidMask ──
            let editMask;
            if (mask.source === 'region') {
                const sceneMask = g.node('MiniMaxH3ContexLoopMaskSlice', {
                    state: cur.out(0), mask: regionMasks, source_fps: 24,
                });
                editMask = g.node('GrowMaskWithBlur', {
                    mask: sceneMask.out(0), expand: mask.grow,
                    tapered_corners: true, blur_radius: mask.blur,
                }).out(0);
            }
            else if (mask.source === 'static-png') {
                // THE GEOMETRY CURE (F3-16 defect 1): the staged PNG's own
                // shape is the TRACK's shape, not the chain's — resize to
                // the plan geometry in-graph, never trust the file.
                const raw = g.node('LoadImage', { image: mask.image }).out(0);
                const channel = g.node('ImageToMask', { image: raw, channel: 'red' }).out(0);
                editMask = g.node('ImageResize', {
                    image: channel, width: cur.out(8), height: cur.out(9),
                    upscale_method: 'bilinear', keep_proportion: false, crop: 'disabled',
                }).out(0);
            }
            else {
                editMask = g.node('SolidMask', {
                    value: 1, width: cur.out(8), height: cur.out(9),
                }).out(0);
            }
            const target = contexMaskedTarget(g, { vaeVideo, vaeAudio }, {
                frames: slice.out(0), audio: slice.out(1), mask: editMask, keepAudio,
            });
            return { conditioning: r2v.out(0), targetLatent: target };
        },
    });
}
//# sourceMappingURL=edit.js.map
