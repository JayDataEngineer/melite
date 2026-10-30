import { filmJoinAudio } from './actions.js';
import { h3MaskedEditPlane, loadVideo } from './chainEdit.js';
/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export const REFINE_UPSCALE_MODEL = 'minimax_h3_latent_upscaler_3d_bf16.safetensors';
/** The refine entry's required seats (the reshoot idiom: an armed
 *  doc with an empty seat refuses loud naming the seat). */
const REQUIRED_SEATS = [
    ['source_clip', 'the clip whose frames the second pass refines — ONE staged leaf: the VHS loader reads it by staged name at the film clock, and the encode seats read its frames + soundtrack'],
    ['refine_prompt', 'the refine text — what the upscaled frames should hold (agent-composed, user-confirmed; rides the CLIPTextEncode positive seat — the node refuses without model + positive)'],
];
const num = (e, key, d) => typeof e[key] === 'number' ? e[key] : d;
/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/reshoot arms (a commission is armed when
 *  its bag is a NON-EMPTY ARRAY). Absent or empty bag = the compose
 *  never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the refine bag carries at least one entry */
export function refineArmed(p) {
    const bag = p.refine;
    return Array.isArray(bag) && bag.length > 0;
}
/** The refine renderer: validates the bound entry, then composes
 *  the standalone second pass. Like the swap, the film path never
 *  reaches here (the card branches on a non-empty refine bag, and a
 *  bag under an armed reshoot — or beside any edit arm — refuses
 *  loud: one door per doc), and the emission ends in SaveVideo (the
 *  extend terminal's own file law — no ChainAssemble: a refine has
 *  no loop lineage to assemble).
 * @param entry the refine mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this refine renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the refine filename rides it) */
export function renderH3Refine(entry, p, facts, g, runId) {
    for (const [seat, what] of REQUIRED_SEATS) {
        const v = entry[seat];
        if (typeof v !== 'string' || v.trim() === '') {
            throw new Error(`h3-timeline refine: '${seat}' names no media — ${what}; a refine needs both seats bound (source_clip, refine_prompt)`);
        }
    }
    const denoise = num(entry, 'denoise', 0.32);
    if (denoise >= 1) {
        throw new Error(`h3-timeline refine: denoise ${denoise} >= 1 — a second pass is a refine, never a re-render (the partial-denoise window is 0.05–0.50; a full-noise sigma discards the learned upscaled latent and the vendored node throws — that is a reshoot, and the reshoot door exists)`);
    }
    const seed = num(entry, 'seed', 0);
    const steps = num(entry, 'steps', 6);
    const clipSeconds = num(entry, 'clip_seconds', 6);
    // ── the staged media (the shared loader law, force-rate-24 VHS —
    // never a private LoadVideo pair) + the family's own plane ──
    // (the REQUIRED_SEATS loop above proved source_clip a non-empty
    // string — the cast restates the proven, never a fallback: there
    // is no default clip, and the sibling str() fallback would be a
    // dead branch here, uncovered by any honest door)
    const [srcFrames, srcAudio] = loadVideo(g, entry['source_clip']);
    const { sigmaModel, samplerSel, clip, vaeVideo, vaeAudio } = h3MaskedEditPlane(g, p, facts, clipSeconds);
    // ── the split-stream encode (the node's own contract:
    // _resolve_h3_sources rebuilds native joint AV from plain 24ch
    // video + the matching audio latent) ──
    const videoLatent = g.node('VAEEncode', { pixels: srcFrames, vae: vaeVideo }).out(0);
    const audioLatent = g.node('VAEEncodeAudio', { audio: srcAudio, vae: vaeAudio }).out(0);
    const positive = g.node('CLIPTextEncode', {
        text: entry['refine_prompt'], clip,
    }).out(0);
    const noise = g.node('RandomNoise', { noise_seed: seed }).out(0);
    const sched = g.node('BasicScheduler', {
        model: sigmaModel, scheduler: p.sched_name,
        steps, denoise,
    }).out(0);
    // ── THE HANDOFF (the report-named chain: learned 2x upscale +
    // the low-sigma refinement pass, one node — its output is final/
    // decode-ready, no external guider or second sampler) ──
    // THE CAPACITY SEATS (the F24 burn, 2026-10-30): the node serves
    // three sizing modes and a [1, 4] multiplier; the whole-clip pass
    // OOMs at 2x past ~100 f, and a ≤1x pass fits. A stated seat rides
    // verbatim (the knob bounds are the card's own); absent keeps the
    // shipped 2x so every existing doc composes byte-identically.
    const upMode = entry['mode'] ?? 'scale by multiplier';
    const upScale = entry['scale'] ?? 2.0;
    const upscaled = g.node('MinimaxH3LatentUpscaler3DRefineHandoff', {
        latent: videoLatent, audio_latent: audioLatent,
        noise, sampler: samplerSel, sigmas: sched,
        model: sigmaModel, positive,
        model_name: REFINE_UPSCALE_MODEL,
        // THE FLAT CLASS (F23 blocker, round-6 audit): THIS handoff
        // declares `mode` as a plain combo and `scale` as its OWN required
        // top-level FLOAT (production /object_info + the vendored
        // minimax_h3_refine.py:349-353) — there is no `mode.scale` seat on
        // it. The dotted spelling belongs to MinimaxH3LatentUpscaler3D
        // (COMFY_DYNAMICCOMBO_V3, chainUpscale.ts), a DIFFERENT node; the
        // round-5 cure crossed the two and reintroduced
        // required_input_missing on this member.
        mode: upMode, scale: upScale,
        // Multiplier mode ignores these (the film's own note at its
        // handoff mount) — they ride the upscaler's own defaults.
        width: 1280, height: 704, megapixels: 1,
        keep_proportion: true, align: 32,
        lock_audio: true, cfg: 1.0, device: 'cuda', precision: 'bf16',
        offload_after_upscale: false,
    }).out(0);
    // ── decode + the film tail's file law ──
    const vdec = g.node('VAEDecode', { samples: upscaled, vae: vaeVideo }).out(0);
    const adec = g.node('VAEDecodeAudio', { samples: upscaled, vae: vaeAudio }).out(0);
    const created = g.node('CreateVideo', {
        images: vdec, audio: filmJoinAudio(g, adec), fps: 24, bit_depth: 8,
    });
    g.node('SaveVideo', {
        video: created.out(), filename_prefix: `${runId}/refine`,
        format: 'mp4', codec: 'h264',
    });
}
//# sourceMappingURL=refine.js.map