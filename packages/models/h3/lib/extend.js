import { chainSaveBoundaries, concatSavedFilms } from './actions.js';
import { assertGridLength, solveWindowComposition, CONTEXT_OVERLAP_FRAMES, GRID_MAX_FRAMES, } from './timelineContract.js';
export { solveWindowComposition } from './timelineContract.js';
import { loadVideo, renderMaskedEditChain } from './chainEdit.js';
/** The extend entry's required seats (the reshoot/repair idiom: an
 * armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
    ['source_clip', 'the clip whose seconds are extended — ONE staged leaf: the VHS loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
    ['extend_prompt', 'the continuation text — MOTION+SOUND for the appended seconds (the R2V prompt seat; agent-composed, user-confirmed)'],
];
const num = (p, k, d) => typeof p[k] === 'number' ? p[k] : d;
const str = (p, k) => typeof p[k] === 'string' ? p[k] : '';
/** The extend renderer: validates the bound entry, then composes the
 * fresh-continuation chain plus the join. Like the swap and repair,
 * the film path never reaches here (the card branches on a non-empty
 * extend bag and refuses a bag under an armed reshoot, replace, or
 * repair — one door per doc), and the emission ends in the
 * joined-film SaveVideo.
 * @param entry the extend mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this extension renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the join prefixes ride it) */
export function renderH3Extend(entry, p, facts, g, runId) {
    for (const [seat, what] of REQUIRED_SEATS) {
        const v = entry[seat];
        if (typeof v !== 'string' || v.trim() === '') {
            throw new Error(`h3-timeline extend: '${seat}' names no media — ${what}; an extend needs both seats bound (source_clip, extend_prompt)`);
        }
    }
    const seed = num(entry, 'seed', 0);
    const steps = num(entry, 'steps', 6);
    const overlapFrames = num(entry, 'overlap_frames', 39);
    const resolution = str(entry, 'resolution') || '736p';
    const statedFrames = Math.round(num(entry, 'extend_seconds', 56 / 24) * 24);
    // THE COMPOSITION DOOR: one window keeps the landed grid law
    // verbatim; beyond it the solver composes N uniform windows and
    // refuses every non-exact landing by name. The solver ALWAYS
    // carries the policy's 39f overlap (every law-home pins 39 —
    // SKILL.md, the registry row, CONTEXT_OVERLAP_FRAMES, the refusal
    // text); the entry knob never rides seam math. A multi-window
    // extend under a knob ≠ 39 would compose exact-DELIVERY numbers
    // the chain then stitches at a different carry — the exactness
    // guarantee breaks silently — so it refuses loud instead (the
    // dsh-docs audit's MED-1).
    const composition = statedFrames <= GRID_MAX_FRAMES
        ? { windows: 1, windowFrames: assertGridLength(statedFrames, 'h3-timeline extend'), deliveredFrames: statedFrames }
        : solveWindowComposition(statedFrames, 'h3-timeline extend');
    if (composition.windows > 1 && overlapFrames !== CONTEXT_OVERLAP_FRAMES) {
        throw new Error(`h3-timeline extend: overlap_frames ${overlapFrames} — the multi-window composition law carries the policy's ${CONTEXT_OVERLAP_FRAMES}f context overlap (every law-home pins 39; the knob feeds only the single-window plan head); re-state overlap_frames 39`);
    }
    const clipSeconds = composition.windowFrames / 24;
    // ── the staged media: the WHOLE prior clip on the VHS seat
    // (force_rate 24 — the one clock) and its LAST FRAME as the
    // in-graph anchor (negative batch index, engine core) ──
    const [priorFrames, priorAudio] = loadVideo(g, str(entry, 'source_clip'));
    const lastFrame = g.node('ImageFromBatch', {
        image: priorFrames, batch_index: -1, length: 1,
    }).out(0);
    // ── THE SEAT'S OWN PLAN (clause 3): N continuation shots — the
    // literal rules, plan_json_input stays UNWIRED (the plan node's
    // source slicing is the swap's semantics, never a continuation's;
    // the cure for the re-slice bug the unification's survey found) ──
    const shots = Array.from({ length: composition.windows }, (_k, i) => ({
        id: `extend-${i + 1}`, prompt: str(entry, 'extend_prompt'),
    }));
    const planJson = JSON.stringify({ shots });
    const { trimmed, assemblePath } = renderMaskedEditChain(g, {
        p, facts,
        clipSeconds,
        overlapFrames,
        resolution, seed, steps,
        roles: '',
        sourceClip: str(entry, 'source_clip'),
        windowStart: 0,
        picture1: lastFrame,
        srcFrames: priorFrames,
        srcAudio: priorAudio,
        planJson,
        planFromSource: false,
        denoise: 1,
        // THE LATENT-CARRY TERMINAL (clause 4): N ≥ 2 windows assemble
        // IN-CHAIN — ChainAssemble owns the seams under the policy's
        // overlap (fresh content's soundtrack assembles from the
        // checkpointed H3 sound); one window joins by file directly.
        assemble: composition.windows >= 2
            ? { audioSource: 'generated', filename: `${runId}/extend_chain` }
            : null,
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio }) => {
            // The everywhere-generate mask: an all-white SolidMask sized
            // to the chain's own geometry (nothing held — extended
            // seconds are new content).
            const whiteMask = g.node('SolidMask', {
                value: 1, width: cur.out(8), height: cur.out(9),
            });
            // ── the fresh-continuation body: the anchor rides BOTH
            // reference seats — the last frame as the pixel anchor
            // (ref_image_0) and the whole clip as the motion identity
            // (ref_video_0), the swap/repair spine's own seats ──
            const r2v = g.node('MiniMaxH3ReferenceToVideo', {
                prompt: str(entry, 'extend_prompt'),
                width: cur.out(8), height: cur.out(9), length: cur.out(6),
                ref_image_size: 'match',
                clip, vae: vaeVideo, audio_vae: vaeAudio,
                'ref_images.ref_image_0': lastFrame,
                'ref_videos.ref_video_0': priorFrames,
                'ref_video_audios.ref_video_audio_0': mutedChainAudio,
            });
            const slice = g.node('H3SourceSlice', {
                source_fps: 24, crop: 'center',
                state: cur.out(0), latent: r2v.out(1),
                audio_vae: vaeAudio, source_frames: priorFrames, source_audio: sliceAudio,
            });
            const edit = g.node('MiniMaxH3FantasticVideoEditLatent', {
                grow: 0, keep_audio: false, megapixels: 0,
                vae: vaeVideo, images: slice.out(0), mask: whiteMask,
                audio_vae: vaeAudio, audio: slice.out(1),
            }).out(0);
            const target = g.node('MiniMaxH3ContexMaskedTarget', {
                mask_meaning: 'white = generate',
                audio_mode: 'generate all audio',
                mask_conversion: 'H3 exact (causal/token max)',
                target_latent: edit, mask: whiteMask,
            }).out(0);
            return { conditioning: r2v.out(0), targetLatent: target };
        },
    });
    // ── THE JOIN (the file-join primitive; the initial raw boundary
    // is the exception the latent carry cannot cross — clause 4) ──
    if (assemblePath !== null) {
        // MULTI-WINDOW: the prior re-muxes at x0 (the join grammar needs
        // an output-dir file; the prior's frames + its own soundtrack
        // ride verbatim — the extension never rewrites history); the
        // ASSEMBLED extension rides the concat's append seat — an exact
        // saved-file path (ChainAssemble's video_path output, wired:
        // the DAG itself proves the assembly completed before the join).
        const priorCreated = g.node('CreateVideo', {
            images: priorFrames, audio: priorAudio, fps: 24, bit_depth: 8,
        });
        const priorSaved = g.node('SaveVideo', {
            video: priorCreated.out(), filename_prefix: `${runId}/x0`,
            format: 'mp4', codec: 'h264',
        }).out();
        const after = chainSaveBoundaries(g, [priorSaved]);
        concatSavedFilms(g, [`${runId}/x0`], after, `${runId}/extend_film`, {
            append: assemblePath,
        });
        return;
    }
    // SINGLE-WINDOW (the landed shape): both parts save at prefixes,
    // the boundary chain orders them, the concat joins, the container
    // delivers <runId>/extend_film.
    const newCreated = g.node('CreateVideo', {
        images: trimmed.out(0), audio: trimmed.out(1), fps: 24, bit_depth: 8,
    });
    const newSaved = g.node('SaveVideo', {
        video: newCreated.out(), filename_prefix: `${runId}/x1`,
        format: 'mp4', codec: 'h264',
    }).out();
    const priorCreated = g.node('CreateVideo', {
        images: priorFrames, audio: priorAudio, fps: 24, bit_depth: 8,
    });
    const priorSaved = g.node('SaveVideo', {
        video: priorCreated.out(), filename_prefix: `${runId}/x0`,
        format: 'mp4', codec: 'h264',
    }).out();
    const after = chainSaveBoundaries(g, [newSaved, priorSaved]);
    concatSavedFilms(g, [`${runId}/x0`, `${runId}/x1`], after, `${runId}/extend_film`);
}
//# sourceMappingURL=extend.js.map