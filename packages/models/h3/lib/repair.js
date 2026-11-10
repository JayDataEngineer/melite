import { contexMaskedTarget, loadVideo, renderMaskedEditChain, resolvePlanTier, sheetRefSlots } from './chainEdit.js';
import { assertGridLength, resolveCarryOverlap } from './timelineContract.js';
/** The repair entry's required seats (the reshoot idiom: an armed
 * doc with an empty seat refuses loud naming the seat). The third
 * is staged media, not text — P0-2 (defect board row 2, the
 * operator's contract "repair receives a mask and errors without
 * one") killed the inline SAM3 manufacture: the mask is RECEIVED as
 * ONE staged PNG, and the refusal names the seat the same way the
 * swap's does. */
const REQUIRED_SEATS = [
    ['source_clip', 'the clip whose region is repaired — ONE staged leaf: the VHS window loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire'],
    ['repair_prompt', 'the repair action text — what the masked region should become (the R2V prompt seat; agent-composed, user-confirmed)'],
    ['mask', "ONE staged PNG the repair RECEIVES (the operator's contract, defect board row 2: a repair errors without one) — the track run's pixel-max union is the recommended bridge; the chain resizes it to its own geometry in-graph, prose manufactures nothing"],
];
/** Reads one required seat NARROWED by its own refusal — the seat
 * is a string or the door never composes (no fallback arm exists:
 * a validated seat re-read through a forgiving helper would be a
 * second, weaker validator below the law — a silent error). */
const requiredSeat = (entry, seat, what) => {
    const v = entry[seat];
    if (typeof v !== 'string' || v.trim() === '') {
        throw new Error(`h3-timeline repair: '${seat}' names no media — ${what}; a repair needs all three seats bound (source_clip, repair_prompt, mask)`);
    }
    return v;
};
/** Reads one optional number seat: absent falls to the documented
 * default; a stated non-number REFUSES — a defaulting fallback would
 * swallow a bypassed door's wrong-typed value as a silent error. */
const statedNumber = (p, k, d) => {
    const v = p[k];
    if (v === undefined)
        return d;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`h3-timeline repair: '${k}' is stated as ${JSON.stringify(v)} — a number seat carries a number (absent falls to ${d}); a wrong-typed value never silently defaults`);
    }
    return v;
};
/** The repair renderer: validates the bound entry, then composes the
 * masked second-pass chain. Like the swap, the film path never
 * reaches here (the card branches on a non-empty repair bag, refuses
 * a bag under an armed reshoot or replace — one door per doc), and
 * the emission ends in MiniMaxH3ChainAssemble.
 * @param entry the repair mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs
 * — the family plane this repair renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3Repair(entry, p, facts, g, runId) {
    // NO FALLBACK READS: every required seat narrows through its own
    // refusal; every optional number refuses a wrong-typed stated
    // value instead of silently defaulting (the schema walk types
    // every lawful doc — a wrong-typed value means a bypassed door).
    const sourceClipSeat = requiredSeat(entry, 'source_clip', REQUIRED_SEATS[0][1]);
    const repairPromptSeat = requiredSeat(entry, 'repair_prompt', REQUIRED_SEATS[1][1]);
    const maskSeat = requiredSeat(entry, 'mask', REQUIRED_SEATS[2][1]);
    const denoise = statedNumber(entry, 'denoise', 0.32);
    if (denoise >= 1) {
        throw new Error(`h3-timeline repair: denoise ${denoise} >= 1 — a masked second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; denoise 1 would boil the held region into a new take — that is a reshoot, and the reshoot door exists)`);
    }
    const seed = statedNumber(entry, 'seed', 0);
    const steps = statedNumber(entry, 'steps', 6);
    const clipSeconds = statedNumber(entry, 'clip_seconds', 6);
    const resolution = resolvePlanTier(entry, p);
    const windowStart = statedNumber(entry, 'window_start', 0);
    const windowLength = statedNumber(entry, 'window_length', 0);
    // No silent clamps (the no-silent-repair law): a negative window
    // is a caller bug — refuse loud, never round it into a render.
    // F3 — THE GRID LAW ON THE WINDOW (2026-11-13): the plan's scene
    // geometry is 22+17k frames, and the mask tracks the WINDOW the
    // loader cuts. An off-grid window length makes the tracked mask
    // stack disagree with the plan's own intervals — the operator's
    // trial-and-error burn — so a STATED length refuses at the compose
    // door naming the nearest legal grid point, never engine-side.
    if (windowLength > 0)
        assertGridLength(Math.round(windowLength), 'h3-timeline repair window_length');
    if (windowStart < 0 || windowLength < 0) {
        throw new Error(`h3-timeline repair: window_start ${windowStart} / window_length ${windowLength} — a window seat never goes negative (frames at the film clock, 24 fps; 0/0 is the whole clip)`);
    }
    // ── the staged media: the WINDOW loader (cap + skip on the same
    // VHS seat, so frames and audio stay in sync) and the inline
    // per-frame SAM3 mask that replaces the swap's staged PNG ──
    const [srcFrames, srcAudio] = loadVideo(g, sourceClipSeat, Math.round(windowLength), Math.round(windowStart));
    // picture_1 for the plan head: the window's own first frame. The
    // plan node REQUIRES a picture (its describer vocabulary); the
    // repair's "replacement" is the source's own person, so the
    // window's lead frame is the truthful anchor — and the geometry
    // law (grid snap + tier scaling off source_frames) stays
    // engine-owned either way.
    const anchorFrame = g.node('ImageFromBatch', {
        image: srcFrames, batch_index: 0, length: 1,
    }).out(0);
    renderMaskedEditChain(g, {
        p, facts,
        clipSeconds,
        overlapFrames: resolveCarryOverlap(entry),
        resolution, seed, steps,
        roles: '',
        sourceClip: sourceClipSeat,
        windowStart,
        picture1: anchorFrame,
        srcFrames, srcAudio,
        // the ignored literal fallback — the plan node's WINDOW-RE-SLICED
        // shots ride plan_json_input (the repair's geometry law)
        planJson: JSON.stringify({ shots: [{ id: 'repair', prompt: repairPromptSeat }] }),
        planFromSource: true,
        denoise,
        assemble: {
            // a repair is a VISUAL second pass: the soundtrack is the
            // source's own, always (audio_source 'source' — the swap's
            // keep_audio switch has no repair pole to flip)
            audioSource: 'source',
            filename: `${runId}/repair`,
        },
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio, refImages }) => {
            // ── P0-2 (defect board row 2): the mask is RECEIVED, never
            // manufactured — the inline SAM3 prose door (and its F7
            // per-scene slice of a TRACKED stack) died with the contract.
            // The static arm verbatim (the edit door's own F3-16 cure):
            // the staged PNG's own shape is the TRACK's shape, not the
            // chain's — resize to the plan geometry in-graph, never trust
            // the file. The recommended bridge (the track run's pixel-max
            // union) arrives already grown; prose manufactures nothing. ──
            const raw = g.node('LoadImage', { image: maskSeat }).out(0);
            const channel = g.node('ImageToMask', { image: raw, channel: 'red' }).out(0);
            // D-16 (defect board 2026-11-18): the door once wired
            // `ImageResize` — a class NO engine build owns (1817 classes,
            // none so named; the refusal landed at compose time, after the
            // authoring pass). Core `ImageScale` is the exact-fit resize
            // the law always meant: it resizes to width/height with no
            // proportion-keeping arm — the mask fills the chain canvas.
            const editMask = g.node('ImageScale', {
                image: channel, width: cur.out(8), height: cur.out(9),
                upscale_method: 'bilinear', crop: 'disabled',
            }).out(0);
            // ── the masked second-pass body: NO still, NO mannequin — the
            // source clip rides its own ref_video seat (the identity
            // anchor of a repair is the person already in the frame — the
            // zero-new-pixels law) ──
            const r2v = g.node('MiniMaxH3ReferenceToVideo', {
                prompt: repairPromptSeat,
                width: cur.out(8), height: cur.out(9), length: cur.out(6),
                ref_image_size: 'match',
                clip, vae: vaeVideo, audio_vae: vaeAudio,
                'ref_videos.ref_video_0': srcFrames,
                'ref_video_audios.ref_video_audio_0': mutedChainAudio,
                // THE SHEET (P0-1): repair mounts NO image anchor — the
                // declared ref_images ride from slot 0, stated exactly as
                // the gen door states them (an input slot, nothing more).
                ...sheetRefSlots(refImages, 0),
            });
            const slice = g.node('H3SourceSlice', {
                source_fps: 24, crop: 'center',
                state: cur.out(0), latent: r2v.out(1),
                audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
            });
            const target = contexMaskedTarget(g, { vaeVideo, vaeAudio }, {
                frames: slice.out(0), audio: slice.out(1), mask: editMask, keepAudio: true,
            });
            return { conditioning: r2v.out(0), targetLatent: target };
        },
    });
}
//# sourceMappingURL=repair.js.map
