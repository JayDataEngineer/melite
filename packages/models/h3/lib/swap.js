import { resolveCarryOverlap } from './timelineContract.js';
import { contexMaskedTarget, loadVideo, renderMaskedEditChain, resolvePlanTier, sheetRefSlots } from './chainEdit.js';
/** The swap entry's required media + text seats (the reshoot idiom:
 *  an armed doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
    ['source_clip', 'the source video whose person is replaced — ONE staged leaf: the VHS slice loader + the core LoadVideo read it by staged name, and the timeline reads it back off the native VIDEO wire (its video_path string rides along staged but unread)'],
    ['still', 'the replacement still (the R2V ref_images LoadImage + the plan picture_1)'],
    ['mannequin', 'the mannequin video from the track-card run (the R2V ref_videos H3GreyMannequins output)'],
    ['mask', 'ONE staged PNG from the track-card run — the pixel-max UNION of its grown per-frame masks is recommended (per-frame motion rides the mannequin; the edit-latent + masked-target mask, reference GrowMaskWithBlur expand 40)'],
    ['swap_prompt', 'the swap action text (agent-composed, user-confirmed — the R2V prompt seat; the estate has no in-graph describers)'],
];
/** Reads one required seat NARROWED by its own refusal — the seat
 * is a string or the door never composes (no fallback arm exists:
 * a validated seat re-read through a forgiving helper would be a
 * second, weaker validator below the law — a silent error). */
const requiredSeat = (entry, seat, what) => {
    const v = entry[seat];
    if (typeof v !== 'string' || v.trim() === '') {
        throw new Error(`h3-timeline replace: '${seat}' names no media — ${what}; a swap needs all five seats bound (source_clip, still, mannequin, mask, swap_prompt)`);
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
        throw new Error(`h3-timeline replace: '${k}' is stated as ${JSON.stringify(v)} — a number seat carries a number (absent falls to ${d}); a wrong-typed value never silently defaults`);
    }
    return v;
};
/** An optional text seat: absent is the lawful unstated ('' rides
 * on); a stated non-string REFUSES. */
const seatString = (p, k) => {
    const v = p[k];
    if (v === undefined)
        return '';
    if (typeof v !== 'string') {
        throw new Error(`h3-timeline replace: '${k}' is stated as ${JSON.stringify(v)} — a text seat carries text; a wrong-typed value never silently reads as unbound`);
    }
    return v;
};
/** The swap renderer: validates the bound entry, then composes the
 * masked-edit chain per the reference map above. The film path
 * never reaches here (the card branches ONLY on a non-empty replace
 * bag, and refuses a bag under an armed reshoot — one door per doc).
 * @param entry the replace mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs —
 * the family plane this swap renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export function renderH3Swap(entry, p, facts, g, runId) {
    // NO FALLBACK READS: every required seat narrows through its own
    // refusal; optional seats refuse wrong-typed stated values.
    const sourceClipSeat = requiredSeat(entry, 'source_clip', REQUIRED_SEATS[0][1]);
    const stillSeat = requiredSeat(entry, 'still', REQUIRED_SEATS[1][1]);
    const mannequinSeat = requiredSeat(entry, 'mannequin', REQUIRED_SEATS[2][1]);
    const maskSeat = requiredSeat(entry, 'mask', REQUIRED_SEATS[3][1]);
    const swapPromptSeat = requiredSeat(entry, 'swap_prompt', REQUIRED_SEATS[4][1]);
    const keepAudio = entry.keep_audio !== false;
    const seed = statedNumber(entry, 'seed', 0);
    const steps = statedNumber(entry, 'steps', 6);
    const clipSeconds = statedNumber(entry, 'clip_seconds', 6);
    const resolution = resolvePlanTier(entry, p);
    // ── the staged media (the R0 cards' artifacts: the source clip,
    // the still, the track card's mannequin + grown mask) ──
    const [srcFrames, srcAudio] = loadVideo(g, sourceClipSeat);
    const stillImg = g.node('LoadImage', { image: stillSeat }).out(0);
    const maskOf = g.node('ImageToMask', {
        image: g.node('LoadImage', { image: maskSeat }).out(0),
        channel: 'red',
    }).out(0);
    const [mannequin] = loadVideo(g, mannequinSeat);
    renderMaskedEditChain(g, {
        p, facts,
        clipSeconds,
        overlapFrames: resolveCarryOverlap(entry),
        resolution, seed, steps,
        roles: seatString(entry, 'roles'),
        sourceClip: sourceClipSeat,
        windowStart: 0,
        picture1: stillImg,
        srcFrames, srcAudio,
        // the ignored literal fallback — the plan node's SOURCE-SLICED
        // shots ride plan_json_input (the swap's own semantics)
        planJson: JSON.stringify({ shots: [{ id: 'swap', prompt: swapPromptSeat }] }),
        planFromSource: true,
        denoise: 1,
        assemble: {
            audioSource: keepAudio ? 'source' : 'generated',
            filename: `${runId}/swap`,
        },
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio, refImages }) => {
            // ── the masked edit body: the still anchors identity, the
            // mannequin carries motion, the staged PNG masks the edit ──
            const r2v = g.node('MiniMaxH3ReferenceToVideo', {
                prompt: swapPromptSeat,
                width: cur.out(8), height: cur.out(9), length: cur.out(6),
                ref_image_size: 'match',
                clip, vae: vaeVideo, audio_vae: vaeAudio,
                'ref_images.ref_image_0': stillImg,
                'ref_videos.ref_video_0': mannequin,
                'ref_video_audios.ref_video_audio_0': mutedChainAudio,
                // THE SHEET (P0-1): the still owns slot 0 — the declared
                // sheet follows it, the same input-slot grammar as gen.
                ...sheetRefSlots(refImages, 1),
            });
            const slice = g.node('H3SourceSlice', {
                source_fps: 24, crop: 'center',
                state: cur.out(0), latent: r2v.out(1),
                audio_vae: vaeAudio, source_frames: srcFrames, source_audio: sliceAudio,
            });
            const target = contexMaskedTarget(g, { vaeVideo, vaeAudio }, {
                frames: slice.out(0), audio: slice.out(1), mask: maskOf, keepAudio,
            });
            return { conditioning: r2v.out(0), targetLatent: target };
        },
    });
}
//# sourceMappingURL=swap.js.map