/** THE VIDEO-EDIT MATRIX SEAT (the timeline rework's stage 2a,
 * 2026-11-15; operator order: "do the rework of the timeline mods
 * according to your judgment"). The seven peer bags were seven
 * FIXED cells of one matrix — mask source × reference
 * conditioning × denoise pole. The presets stay (each pinned
 * byte-exact by its own suite: swap, repair, extend, refine); THIS
 * renderer serves the FREE cells the presets never composed — a
 * staged mask over a self-anchored partial pass, a tracked region
 * under new identity anchors, a whole-frame restyle — all on the
 * ONE chain spine (renderMaskedEditChain) and the ONE constructor
 * (contexMaskedTarget, the stage-1 seam). The mask dial is
 * first-class per-frame where the region source tracks (N7's cure:
 * the static single-PNG union is one dial value, never the only
 * door), and the region dial's tuning seats (grow, blur,
 * detection_threshold) are the N8 cure — thin structures tune at
 * the door, not by hand.
 *
 * THE SAFETY LAW (F3-17's fold-in, the bag-name safety as
 * validation): a near-full denoise (>= 0.8) with NO identity
 * anchor (self reference) over the WHOLE frame is the identity
 * boil the friction audit named — refuse, naming the anchor dial
 * and the reshoot door. A partial pass that drops the source
 * audio is incoherent (the hold is the point) — refuse. A staged
 * PNG mask feeds the chain SCALED to the chain's own geometry
 * (F3-16 defect 1's cure: the track card emits masks at the
 * track's resolution — 576×1008 against a 768×1344 film — and an
 * unscaled mask seat is a silent 0.75 scale the operator had to
 * correct by hand; the seat resizes in-graph, never trusts the
 * PNG's own shape). */
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The near-full-denoise floor of the identity-safety refusal. */
export declare const EDIT_IDENTITY_BOIL_FLOOR = 0.8;
/** THE MASK DIAL — where the edit happens.
 * `static-png`: ONE staged PNG (the track run's pixel-max union is
 * the recommended bridge — per-frame motion is the region dial's
 * own door, N7). `region`: the free-text SAM3 per-frame track
 * (repair's own chain, tuning seats exposed — N8). `video`: the
 * operator's OWN per-frame mask staged as a video (the track card's
 * mask export or any greyscale ride) — decoded red-channel per
 * frame, geometry-cured in-graph, then THE LENGTH-MATCH CHECK: the
 * mask's frames must equal the clip's as loaded, refused loud
 * engine-side naming both counts (a staged file's frame count is
 * engine knowledge, never compose knowledge). `whole-frame`: the
 * all-white SolidMask (extend's spelling — nothing held). */
export type EditMaskDial = {
    readonly source: 'static-png';
    readonly image: string;
} | {
    readonly source: 'region';
    readonly prompt: string;
    readonly grow: number;
    readonly blur: number;
    readonly detectionThreshold: number;
} | {
    readonly source: 'video';
    readonly video: string;
    readonly grow: number;
    readonly blur: number;
} | {
    readonly source: 'whole-frame';
};
/** THE REFERENCE DIAL — the identity anchors the r2v rides.
 * `still+mannequin`: swap's pair (the still anchors appearance, the
 * mannequin carries motion). `self`: repair's posture (the source
 * clip on its own ref_video seat — the identity anchor of a repair
 * is the person already in the frame). The continuation pole is
 * a free cell since slice 2: the continuation dial delegates to
 * renderH3Extend's own law set (the composition solver + the
 * forced AddGuide seam) under the blank mask, self anchors, and
 * full denoise. The no-reference second pass
 * IS a free cell since the fourth dial landed: the refine posture
 * composes as whole-frame × self × partial denoise × refine on —
 * the learned handoff riding THIS chain's own latents. */
export type EditReferenceDial = {
    readonly mode: 'still+mannequin';
    readonly still: string;
    readonly mannequin: string;
} | {
    readonly mode: 'self';
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
export declare function renderH3Edit(entry: Record<string, unknown>, mask: EditMaskDial, reference: EditReferenceDial, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=edit.d.ts.map