import { filmJoinAudio } from './actions.js';
import { h3MaskedEditPlane, loadVideo } from './chainEdit.js';
/** The learned 3D-conv upscale weights (the schema's upscale_model
 *  seat carries this same single option — one file, one spelling, no
 *  hand-spelled alternatives). */
export const REFINE_UPSCALE_MODEL = 'minimax_h3_latent_upscaler_3d_bf16.safetensors';
/** The 2x pass's measured memory ceiling, in frames at the film clock
 *  (24 fps). The friction report's §12.2/§13.2 sweep on the operator's
 *  box: 56 f and 90 f pass at 2x (2688×1536, 48 kHz); 141 f OOMs,
 *  needing 1.06 GiB more with 20.13 GiB already resident. H3's memory
 *  grows monotonically with the window, so a window past the measured
 *  OOM point cannot fit at this variant — the door refuses it by name
 *  instead of burning a render to find out. */
export const REFINE_2X_OOM_FRAMES = 141;
/** The refine window's default length in seconds — 90 f at 24 fps, the
 *  widest window the sweep measured GREEN at 2x. A default that OOMs is
 *  the F24 burn: the arm used to load the WHOLE staged clip, so any
 *  film longer than ~4 s died at this variant. */
export const REFINE_DEFAULT_CLIP_SECONDS = 3.75;
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
    // THE CAPACITY SEATS (the F24 burn, 2026-10-30): the node serves
    // three sizing modes and a [1, 4] multiplier. A stated seat rides
    // verbatim (the knob bounds are the card's own); absent keeps the
    // shipped 2x so every existing doc composes byte-identically.
    const upMode = entry['mode'] ?? 'scale by multiplier';
    const upScale = entry['scale'] ?? 2.0;
    // ── THE WINDOW (F24's cure, round 6): a refine refines a WINDOW of
    // the staged clip, never the whole film. The pass used to load every
    // frame of the source and hand the full latent to the 2x handoff,
    // so any clip past ~90 f died engine-side (141 f OOM, §13.2). The
    // window is the loader's own two seats: frame_load_cap stops the
    // read and skip_first_frames offsets it — VHS trims the soundtrack
    // by the same window (load_video_nodes.py: `start_time =
    // skip_first_frames * target_frame_time`, `lazy_get_audio(video,
    // start_time, frame_load_cap * target_frame_time)`), so the encode
    // seats read the WINDOW's frames and the WINDOW's audio, in sync.
    // A long film is covered by advancing start_seconds window by
    // window (the card's section states the stepping law).
    const clipSeconds = num(entry, 'clip_seconds', REFINE_DEFAULT_CLIP_SECONDS);
    const startSeconds = num(entry, 'start_seconds', 0);
    if (!(clipSeconds > 0)) {
        throw new Error(`h3-timeline refine: clip_seconds ${clipSeconds} — a refine window needs frames (the seat is the loader's frame_load_cap: seconds × 24 at the film clock; the safe default is ${REFINE_DEFAULT_CLIP_SECONDS} s = 90 f)`);
    }
    if (!(startSeconds >= 0)) {
        throw new Error(`h3-timeline refine: start_seconds ${startSeconds} — a window starts at or after the clip's first frame (the seat is the loader's skip_first_frames); advance it window by window to cover a long film`);
    }
    const windowFrames = Math.max(1, Math.round(clipSeconds * 24));
    const skipFrames = Math.round(startSeconds * 24);
    // THE CEILING IS THE WINDOW'S (refine-window audit C1, 2026-11-13):
    // the measured OOM is a function of the WINDOW first and the upscale
    // factor second — H3's memory grows with the frame count through the
    // learned 3D upscaler and the sampler. The first cut guarded only
    // `scale by multiplier` ≥ 2, so a target-dimensions or megapixels
    // window walked past the same ceiling into the measured OOM with no
    // refusal. Only a same-size multiplier pass (< 2, the capacity cure)
    // is exempt: its upscaler is the identity, which is what made 144 f
    // fit at 1x. The other two modes size from the source and cannot be
    // judged ≤ 1x before the read, so they take the ceiling.
    const sameSize = upMode === 'scale by multiplier' && upScale < 2;
    if (!sameSize && windowFrames > REFINE_2X_OOM_FRAMES) {
        const named = upMode === 'scale by multiplier' ? `${upScale}x` : upMode;
        throw new Error(`h3-timeline refine: a ${windowFrames} f window at ${named} — the 2x pass was measured OOM at ${REFINE_2X_OOM_FRAMES} f and green at ${REFINE_DEFAULT_CLIP_SECONDS * 24} f (2688×1536, 48 kHz; H3 memory grows with the window, so a wider window cannot fit — the ceiling belongs to the WINDOW, whichever sizing mode upsizes). Cut clip_seconds to ${(REFINE_2X_OOM_FRAMES / 24).toFixed(2)} s or less and cover the rest window by window, or lower scale to 1 for a same-size pass`);
    }
    // ── the staged media (the shared loader law, force-rate-24 VHS —
    // never a private LoadVideo pair) + the family's own plane ──
    // (the REQUIRED_SEATS loop above proved source_clip a non-empty
    // string — the cast restates the proven, never a fallback: there
    // is no default clip, and the sibling str() fallback would be a
    // dead branch here, uncovered by any honest door)
    const [srcFrames, srcAudio] = loadVideo(g, entry['source_clip'], windowFrames, skipFrames);
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
    // THE CAPACITY SEATS ride the handoff verbatim — the window above is
    // what keeps a 2x pass inside memory; a ≤1x pass sizes its own.
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