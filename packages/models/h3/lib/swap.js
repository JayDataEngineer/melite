import { loadVideo, renderMaskedEditChain } from './chainEdit.js';
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
    // ── the staged media (the R0 cards' artifacts: the source clip,
    // the still, the track card's mannequin + grown mask) ──
    const [srcFrames, srcAudio] = loadVideo(g, str(entry, 'source_clip'));
    const stillImg = g.node('LoadImage', { image: str(entry, 'still') }).out(0);
    const maskOf = g.node('ImageToMask', {
        image: g.node('LoadImage', { image: str(entry, 'mask') }).out(0),
        channel: 'red',
    }).out(0);
    const [mannequin] = loadVideo(g, str(entry, 'mannequin'));
    renderMaskedEditChain(g, {
        p, facts,
        clipSeconds,
        overlapFrames: num(entry, 'overlap_frames', 39),
        resolution, seed, steps,
        roles: str(entry, 'roles'),
        sourceClip: str(entry, 'source_clip'),
        windowStart: 0,
        picture1: stillImg,
        srcFrames, srcAudio,
        // the ignored literal fallback — the plan node's SOURCE-SLICED
        // shots ride plan_json_input (the swap's own semantics)
        planJson: JSON.stringify({ shots: [{ id: 'swap', prompt: str(entry, 'swap_prompt') }] }),
        planFromSource: true,
        denoise: 1,
        assemble: {
            audioSource: keepAudio ? 'source' : 'generated',
            filename: `${runId}/swap`,
        },
        body: ({ cur, clip, vaeVideo, vaeAudio, mutedChainAudio, sliceAudio }) => {
            // ── the masked edit body: the still anchors identity, the
            // mannequin carries motion, the staged PNG masks the edit ──
            const r2v = g.node('MiniMaxH3ReferenceToVideo', {
                prompt: str(entry, 'swap_prompt'),
                width: cur.out(8), height: cur.out(9), length: cur.out(6),
                ref_image_size: 'match',
                clip, vae: vaeVideo, audio_vae: vaeAudio,
                'ref_images.ref_image_0': stillImg,
                'ref_videos.ref_video_0': mannequin,
                'ref_video_audios.ref_video_audio_0': mutedChainAudio,
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
            return { conditioning: r2v.out(0), targetLatent: target };
        },
    });
}
//# sourceMappingURL=swap.js.map