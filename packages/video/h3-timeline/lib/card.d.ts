import type { Context } from '@melite/comfyui-card-kit/card-definition';
import { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
export { assertCarriedSpanGrid, assertGridLength, assertSpanGrid, gridSnap } from '@melite/models-h3/timelineContract';
export { carrier, JSON_ARRAY_PARAMS, schema } from '@melite/models-h3/schema';
/** The card's boarding roster: ONE family. The folded-lane variant
 *  routes (h3-fl2va, h3-ref2va, h3-keyframe, h3-timeline-ref)
 *  RETIRED with the operator's 2026-11-02 recipe rework ("1 model,
 *  1 variant, 1 quant, and 3 recipes") — the single-shot and
 *  keyframe lanes now compose through the timeline lane's own
 *  windows; old drafts naming a retired address refuse LOUD at the
 *  run door (the accepted end state). The family is the CHECKPOINT
 *  id `h3` — never a lane name; the card id `h3-timeline` (the
 *  usecase surface) keeps its own name. The id comes from the
 *  family's own DECL, and with it the lane's files. */
export declare const BOARDED: string[];
export declare const VARIANT_ADDRESSES: string[];
/** Which edit posture a walked doc rides — the ONE law the flow
 * output bindings and the compose door both read (one truth home):
 * 'film' nothing armed; 'inchain' the masked-edit matrix cells
 * (mask postures, the refine dial, the chain_run loop — every
 * posture whose terminal is the chain assemble); 'join' the
 * continuation posture (the joined-film SaveVideo, the file-boundary
 * grammar); 'reshoot' the different chain that stays its own door. */
export declare function editPosture(p: Record<string, unknown>): 'film' | 'inchain' | 'join' | 'reshoot';
/** THE ALIAS RESOLVER: runs at the compose door BEFORE the bag
 * guards — a doc carrying legacy keys resolves into the edit bag
 * (the translation table below), the legacy keys leave the doc,
 * and the dispatch below sees ONE bag. Two legacy keys, or a
 * legacy key beside an armed edit bag, refuse loud (one door per
 * doc — the pair-refusal matrix's ONE surviving law, now stated
 * as parameter validation over the one bag). Seats with no dial
 * refuse loud naming the edit spelling. */
export declare function resolveLegacyEditAliases(p: Record<string, unknown>): Record<string, unknown>;
/** THE DECLARED-BAND JUDGE (F3-07, R-P3-18): a number seat's DECLARED
 *  band binds at the compose door. Every armed bag entry's stated
 *  numeric field is judged against its declared min/max — the
 *  DeclaredModifierKind field rows are the truth home, read at
 *  compose time (never a copied literal), so a band edit binds
 *  without a judge edit. The estate admission judges bag KEYS only
 *  (cardsCompose.ts) and the mods-schema gate checks the row's SHAPE
 *  only (min <= max), so this walk is the only judge an entry's
 *  VALUES ever meet.
 *
 *  The >= 1 pole on a sub-1 band is NOT the band's: full denoise is
 *  a different CLASS — a re-render — and the family door refuses it
 *  in its own voice (repair/upscale/refine sigmas law); the band
 *  judge steps aside there and keeps its voice for tunes inside the
 *  reachable range.
 *
 * @param p the walked doc params (the mod bags ride their kinds'
 * param_key) */
export declare function judgeDeclaredBands(p: Record<string, unknown>): void;
/** THE FAMILY ACTION BINDING (the atom vocabulary's video stroke):
 *  the h3 family's declared film action composes the whole lane-true
 *  segment from the gated, lifted doc this card's plane produced —
 *  resolved off the DECL at boarding (the interlock: an unbound
 *  family refuses loud, never a legacy fallback). THE REPLACE BRANCH
 *  (the swap-parity build): a non-empty replace bag never enters the
 *  film action — it dispatches to the family's swap seat, which
 *  renders the masked-edit chain (models/h3 renderH3Swap, ending in MiniMaxH3ChainAssemble). A bag
 *  under an ARMED RESHOOT refuses loud at this door (one door per
 *  doc — the swap branch returns before the film action, so a
 *  reshoot under it would be silently dropped). The film path below
 *  is byte-identical with the arm empty (the suite pins it — a swap
 *  seat must never reshape a film graph). */
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export declare function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void;
//# sourceMappingURL=card.d.ts.map