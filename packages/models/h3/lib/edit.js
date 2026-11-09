import { contexMaskedTarget, loadVideo, renderMaskedEditChain, resolvePlanTier, sheetRefSlots } from './chainEdit.js';
import { renderH3ChainUpscale } from './chainUpscale.js';
import { renderH3Extend } from './extend.js';
import { REFINE_2X_OOM_FRAMES, REFINE_UPSCALE_MODEL } from './refine.js';
import { FULL_NOISE_REASON, fullNoiseClause, refuseCompetingSecondPass } from './secondPass.js';
import { resolveCarryOverlap, entryCarries, isGridLength, gridSnap, GRID_BASE_FRAMES, GRID_MAX_FRAMES, solveWindowComposition } from './timelineContract.js';
/** SAM3's checkpoint row — repair.ts's own spelling (the family's
 * one tracked-mask door; the card's constant cites the same file). */
const SAM3_CKPT = 'sam3.1_multiplex_fp16.safetensors';
/** The near-full-denoise floor of the identity-safety refusal. */
export const EDIT_IDENTITY_BOIL_FLOOR = 0.8;
/** NO FALLBACK READS (the silent-error law): a string seat stated
 * wrong-typed REFUSES — absent is the lawful unbound state ('' rides
 * to the seat's own refusal), but a wrong-typed value never silently
 * becomes unbound. */
const seatString = (p, k) => {
    const v = p[k];
    if (v === undefined)
        return '';
    if (typeof v !== 'string') {
        throw new Error(`h3-timeline edit: '${k}' is stated as ${JSON.stringify(v)} — a text seat carries text; a wrong-typed value never silently reads as unbound`);
    }
    return v;
};
/** An optional number seat: absent falls to the documented default;
 * a stated non-number REFUSES — a defaulting fallback would swallow
 * a bypassed door's wrong-typed value as a silent error. */
const statedNumber = (p, k, d) => {
    const v = p[k];
    if (v === undefined)
        return d;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`h3-timeline edit: '${k}' is stated as ${JSON.stringify(v)} — a number seat carries a number (absent falls to ${d}); a wrong-typed value never silently defaults`);
    }
    return v;
};
/** THE PROBED SOURCE LENGTH (defect board D-5): the compose door
 * stamps the source clip's probed frame count (`__source_frames`)
 * onto the compose copy of every h3 bag row it can read. Returns
 * the frames REMAINING past this window's start — the widest
 * window the film can actually serve — or undefined when the door
 * could not probe (unresolvable or unreadable): the conservative
 * clip_seconds plan keeps judging, never a silent pass. A
 * wrong-typed stamp refuses like any other seat — the door's
 * number is never guessed around. */
const probedSourceFrames = (entry, windowStart) => {
    const n = entry.__source_frames;
    if (n === undefined)
        return undefined;
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
        throw new Error(`h3-timeline edit: '__source_frames' is stated as ${JSON.stringify(n)} — the compose door's probed-length stamp is a positive frame count; a wrong-typed value never silently reads as unprobed`);
    }
    return Math.max(0, Math.round(n) - Math.round(windowStart));
};
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
    const prompt = seatString(entry, 'edit_prompt');
    // THE UPSCALE CARVE-OUT: under the loop posture (chain_run
    // stated) a blank prompt is lawful — the second pass reuses the
    // SOURCE RUN'S own per-scene prompts (the conditioning node's
    // documented posture); a bound prompt overrides every scene's
    // pass-2 text.
    const chainRun = seatString(entry, 'chain_run');
    if (prompt.trim() === '' && chainRun.trim() === '') {
        throw new Error(`h3-timeline edit: 'edit_prompt' names no action — the edit needs its text (what the masked region or frame should become; agent-composed, user-confirmed)`);
    }
    const denoise = statedNumber(entry, 'denoise', 1);
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
        // THE ONE-SEAT LAW (the shared second-pass gate): the switch
        // and the stated run are two arms of ONE seat — the shared
        // refusal names it (secondPass.ts owns the law; this door
        // owns the voice).
        refuseCompetingSecondPass({ refine: entry.refine === true, chain_run: chainRun }, 'h3-timeline edit');
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
            steps: statedNumber(entry, 'steps', 20),
            segment_crf: statedNumber(entry, 'segment_crf', 18),
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
            source_clip: seatString(entry, 'source_clip'),
            extend_prompt: prompt,
            extend_seconds: statedNumber(entry, 'extend_seconds', 2.33),
            seed: statedNumber(entry, 'seed', 0),
            steps: statedNumber(entry, 'steps', 6),
            resolution: resolvePlanTier(entry, p),
            overlap_frames: statedNumber(entry, 'overlap_frames', 39),
        }, p, facts, g, runId);
        return;
    }
    // THE REFINE FULL-NOISE LAW (hoisted above the boil by the
    // placement law — slice 4: the specific refusal owns the cell it
    // names; under the refine switch the full-noise sigma law fires,
    // never the general boil beside it). The clause and reason ride
    // the shared second-pass gate (secondPass.ts) — every arm of the
    // seat refuses the same pole in its own word.
    if (entry.refine === true && denoise >= 1) {
        throw new Error(`h3-timeline edit: denoise ${denoise} with the refine pass on — ${fullNoiseClause('refine')} (${FULL_NOISE_REASON} and the vendored node throws); state the partial window (0.05–0.5) or leave refine off`);
    }
    // THE UNGUIDED FULL RENDER (the doc's one deliberate loss,
    // re-authored as validation — slice 4): a MASKED full-denoise
    // pass anchored to nothing but the source is the identity-swap
    // cell with its anchors unstated — the arm-name safety the peer
    // bags carried, stated as the parameter law that replaces it.
    if (denoise >= 1 && mask.source !== 'whole-frame' && reference.mode === 'self') {
        throw new Error(`h3-timeline edit: denoise ${denoise} on the self anchor with a mask — an unguided full re-render of the masked region (the identity-swap cell with its anchors unstated; the subject drifts with no replacement identity to hold). THE MISSING FIELD IS 'mannequin' — the motion video seated beside 'still' under reference still+mannequin ('still' alone is not a posture: the enum is self | still+mannequin; a stated 'still' seat is read only under still+mannequin), or take the partial window (denoise < 1, the repair posture). With mask_source 'region' a plate is OPTIONAL — region_prompt selects the region by text and the edit prompt redraws inside it; a reference image is required only when the new content must be a specific person or a specific mark`);
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
    const windowStart = statedNumber(entry, 'window_start', 0);
    const windowLength = statedNumber(entry, 'window_length', 0);
    if (windowStart < 0 || windowLength < 0) {
        throw new Error(`h3-timeline edit: window_start ${windowStart} / window_length ${windowLength} — a window seat never goes negative (frames at the film clock, 24 fps; 0/0 is the whole clip)`);
    }
    // THE INTENT-PHRASED GRID REFUSAL (defect board row 8, the
    // rider on row 4's land): arithmetic voicing ("nearest legal")
    // taught frame arithmetic; the cure the operator asked to READ
    // is carry — leave the window unstated and the film splits
    // itself. The expert override stays open (a legal rung rides).
    // THE 2 S DECREE RIDER (defect board D-3, 2026-11-16: the
    // operator's "2 seconds for the refine flows" is 48 f at the
    // film clock and 48 f CANNOT exist — the engine serves 22+17k
    // frames, so the 2 s class's rung IS 56 f = 2.33 s, the
    // memory-safe ceiling at refine 2x; the decree rounds UP to it,
    // and the refusal must SAY so, never leave "the nearest" as the
    // only number an agent can read).
    if (windowLength > 0 && !isGridLength(Math.round(windowLength))) {
        const nearest = gridSnap(Math.min(GRID_MAX_FRAMES, Math.max(GRID_BASE_FRAMES, Math.round(windowLength))));
        throw new Error(`h3-timeline edit: window_length ${windowLength}f is not on the film's grid — ${nearest}f is the nearest${nearest === 56 && windowLength < 56 ? ' and it IS the ceiling of the 2 s class (48 f cannot exist: the engine serves 22+17k frames, so the "2 seconds" decree rounds UP to the 56 f rung = 2.33 s, the memory-safe window at refine 2x)' : ''}, or leave the window unstated and carry: true (the default) splits the film automatically (never type frame numbers)`);
    }
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
    const scale = statedNumber(entry, 'scale', 2);
    if (refineOn) {
        // THE PROBED WINDOW (defect board D-5, 2026-11-16: the operator's
        // refine 2x press on a 56 f clip refused "a 144 f window" — the
        // unstated window planned the 6 s default and never read the
        // film): the window the 2x pass actually upsizes is the plan's
        // FIRST SEGMENT, never wider than the film itself. The compose
        // door stamps the source's probed frame count (__source_frames)
        // on the compose copy; with it a film shorter than the plan
        // composes unstated (56 f judged, not the blind 144). Without it
        // (an unresolvable or unreadable source) the conservative
        // clip_seconds plan keeps its own voice — never a silent pass.
        const planFrames = Math.round(statedNumber(entry, 'clip_seconds', 6) * 24);
        const probed = probedSourceFrames(entry, windowStart);
        const windowFrames = windowLength > 0
            ? Math.round(windowLength)
            : Math.min(planFrames, probed ?? planFrames);
        if (scale >= 2 && windowFrames > REFINE_2X_OOM_FRAMES) {
            throw new Error(`h3-timeline edit: a ${windowFrames} f window at refine ${scale}x is TOO LONG — the 2x pass was measured OOM at ${REFINE_2X_OOM_FRAMES} f (H3 memory grows with the window; whichever sizing mode upsizes, a window that dies is a window too long). Cut the window (window_length / clip_seconds) or lower scale below 2 for a same-size pass` +
                (probed !== undefined && windowFrames === planFrames
                    ? ` — the source probed ${probed + Math.round(windowStart)} f and outlives the ${planFrames} f plan slice, so the slice itself judged`
                    : ``));
        }
    }
    if (mask.source === 'static-png' && mask.image.trim() === '') {
        throw new Error(`h3-timeline edit: the static-png mask dial names no image — bind ONE staged PNG (the track run's pixel-max union is the recommended bridge); per-frame motion is the region dial's own door`);
    }
    if (mask.source === 'region' && mask.prompt.trim() === '') {
        throw new Error(`h3-timeline edit: the region mask dial names no target — state the free-text SAM3 detection prompt ("hands", "a person", "a face")`);
    }
    if (mask.source === 'video' && mask.video.trim() === '') {
        throw new Error(`h3-timeline edit: the video mask dial names no media — bind ONE staged mask video (per-frame, white = edit; the track card's mask export is the recommended bridge), and it must length-match the clip's own frame count or the run refuses naming both counts`);
    }
    if (reference.mode === 'still+mannequin' && (reference.still.trim() === '' || reference.mannequin.trim() === '')) {
        throw new Error(`h3-timeline edit: the still+mannequin reference dial needs both seats bound (the still anchors appearance, the mannequin carries motion); a self-anchored edit states the self reference`);
    }
    // ── the staged media: the window loader (cap + skip on one VHS
    // seat — frames and audio stay in sync) ──
    const sourceClip = seatString(entry, 'source_clip');
    if (sourceClip.trim() === '') {
        throw new Error(`h3-timeline edit: 'source_clip' names no media — the edit rides a staged clip (ONE leaf: the VHS window loader + the core LoadVideo read it by staged name)`);
    }
    const [srcFrames, srcAudio] = loadVideo(g, sourceClip, Math.round(windowLength), Math.round(windowStart));
    // ── THE CALLS→EDIT SEAM TRANSLATION (audit item 5; board row 4's
    // acceptance: "The film already has windows on the timeline. The
    // edit door should split on those … and join with the same
    // overlap"). When the entry states NO window (0/0 — the default
    // carry press) and the doc's calls[] carry AUTHORED windows (two
    // or more spans), the edit's plan shots ARE the calls' spans:
    // one shot per window at the window's own length, each seam
    // carrying what its call states — transition 'cut' →
    // context_length 0 (the engine's cut preset), any carry
    // transition → the derived AV join (resolveCarryOverlap: 39 under
    // carry, 0 when the entry states carry: false — a keyframe is a
    // gen-side anchor; a masked edit carries, and the shot's id
    // STATES the translation, never a silent downgrade). The shot
    // lengths are the windows' own spans — the engine's plan node
    // judges each against its lattice and refuses loud naming the
    // shot. A single call is the un-split film: the source-sliced
    // default press stands, nothing changes. A stated expert window
    // rules over the calls (the override is the expert's, not
    // derived). ──
    const callsRaw = Array.isArray(p.calls) ? p.calls : [];
    const windows = callsRaw.filter((c) => typeof c === 'object' && c !== null);
    const authored = windowStart === 0 && windowLength === 0 && windows.length >= 2
        && windows.every((c) => {
            const start = Number(c['start_frame']);
            const end = Number(c['end_frame']);
            return Number.isFinite(start) && Number.isFinite(end) && end - start >= 1;
        });
    const carryJoin = resolveCarryOverlap(entry);
    const seamShots = authored
        ? windows.map((c, i) => {
            const span = Math.max(1, Math.round(Number(c['end_frame']) - Number(c['start_frame'])));
            const cut = c['transition'] === 'cut' || !entryCarries(entry);
            return {
                id: `w${i + 1}${cut ? '-cut' : '-carry'}`,
                prompt,
                length: span,
                ...(i === 0 ? {} : { context_length: cut ? 0 : carryJoin }),
            };
        })
        : null;
    // THE MULTI-SEGMENT 2X GUARD (defect board D-2, 2026-11-16: the
    // engine burn `h3_masked_prefix: previous/target video latent
    // geometry differs: (1, 24, 17, 168, 96) vs (1, 24, 17, 84, 48)` —
    // segment 0 refined emits a 2x latent, segment 1's prefix builds
    // at 1x, and the chain divides at 1x to re-join at 2x, which can
    // never match; the first segment renders, the second aborts the
    // whole run AFTER the GPU bill): refine + scale >= 2 over a plan
    // the film splits into 2+ windows refuses HERE, zero GPU. The
    // single-window press is the measured posture (56 f at 768×1344 →
    // 1536×2688, AAC kept, ~3 min, a pre-trimmed clip or a stated
    // window) — refine is an output-space pass; the full-film 2x tile
    // owes the assembler its own upscale-after-assembly door. The
    // guard counts the plan's own two faces: AUTHORED calls (the
    // literal shots) count directly; the source-sliced plan — a film
    // LONGER than its first plan slice (probed total past the slice,
    // exactly the press the engine dies on) — tiles through the D-5
    // probe stamp and counts through the solver (an unprobed source
    // stays the engine's belt — the same posture every probe arm here
    // rides). The plan SLICE fits or the D-5 per-window ceiling has
    // the next word — the wrong cure applied in the wrong order is
    // the silent error a wall must refuse.
    const planFramesGuard = Math.round(statedNumber(entry, 'clip_seconds', 6) * 24);
    if (refineOn && scale >= 2) {
        // A STATED window caps the plan at one segment (the measured
        // single-window press) — the guard only judges plans the film
        // or the calls actually split.
        const probedTotal = probedSourceFrames(entry, windowStart);
        const planWindows = windowLength > 0
            ? 1
            : (seamShots !== null
                ? seamShots.length
                : (probedTotal !== undefined && probedTotal > planFramesGuard
                    ? solveWindowComposition(probedTotal, 'edit', carryJoin).windows
                    : null));
        if (planWindows !== null && planWindows >= 2) {
            throw new Error(`h3-timeline edit: refine ${scale}x over a ${planWindows}-window plan cannot tile — the chain joins its segments at 1x geometry while each refined window emits ${scale}x latents (the engine dies mid-run: h3_masked_prefix 'previous/target video latent geometry differs'), so a multi-window refine press burns GPU on the first segment to abort on the second. Refine ONE window per press (a stated window_length, or a pre-trimmed clip — the measured posture: 56 f at 2x, ~3 min, AAC kept); the full-film 2x tile owes the assembler its own upscale-after-assembly door`);
        }
    }
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
        clipSeconds: statedNumber(entry, 'clip_seconds', 6),
        overlapFrames: resolveCarryOverlap(entry),
        resolution: resolvePlanTier(entry, p),
        seed: statedNumber(entry, 'seed', 0),
        steps: statedNumber(entry, 'steps', 6),
        roles: '',
        sourceClip,
        windowStart,
        picture1: anchorFrame,
        srcFrames, srcAudio,
        // the plan's shot law: AUTHORED shots (the calls' spans + the
        // stated seams) rule as the literal — the plan node must not
        // re-slice the source over them; the un-split film keeps the
        // source-sliced default press (the literal is the ignored
        // fallback, plan_json_input rides)
        planJson: seamShots !== null
            ? JSON.stringify({ shots: seamShots })
            : JSON.stringify({ shots: [{ id: 'edit', prompt }] }),
        planFromSource: seamShots === null,
        denoise,
        ...(refineOn
            ? { upscale: { mode: 'scale by multiplier', scale, modelName: REFINE_UPSCALE_MODEL } }
            : {}),
        assemble: {
            audioSource: keepAudio ? 'source' : 'generated',
            filename: `${runId}/edit`,
        },
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio, refImages }) => {
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
                // THE SHEET (P0-1): after the dial's own anchor — slot 1
                // under still+mannequin, slot 0 on the self seat (the
                // repair posture). One grammar, both input slots.
                ...sheetRefSlots(refImages, reference.mode === 'still+mannequin' ? 1 : 0),
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
            else if (mask.source === 'video') {
                // THE OWN-VIDEO MASK DOOR: the operator's staged per-frame
                // mask (the track card's export or their own greyscale
                // ride). Three laws ride before the slice: decode the red
                // channel per frame; cure the geometry in-graph (F3-16
                // defect 1's law owns this door too — a staged file's shape
                // is never the chain's); then THE LENGTH-MATCH CHECK — the
                // mask's frames must equal the clip's frames AS LOADED
                // (window caps included), refused loud engine-side naming
                // both counts. The check GATES the door: the slice rides
                // the verified timeline, never the raw decode.
                const [maskFrames] = loadVideo(g, mask.video);
                const decoded = g.node('ImageToMask', {
                    image: maskFrames, channel: 'red',
                }).out(0);
                const fitted = g.node('ImageResize', {
                    image: decoded, width: cur.out(8), height: cur.out(9),
                    upscale_method: 'bilinear', keep_proportion: false, crop: 'disabled',
                }).out(0);
                const verified = g.node('MiniMaxH3ContexLoopMaskLengthCheck', {
                    source_frames: srcFrames, mask: fitted,
                }).out(0);
                const sceneMask = g.node('MiniMaxH3ContexLoopMaskSlice', {
                    state: cur.out(0), mask: verified, source_fps: 24,
                });
                editMask = g.node('GrowMaskWithBlur', {
                    mask: sceneMask.out(0), expand: mask.grow,
                    tapered_corners: true, blur_radius: mask.blur,
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