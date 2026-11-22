/** The arms' source vocabulary: where the second pass reads its
 * latents or pixels from. */
export declare const SECOND_PASS_SOURCES: readonly ["same-run", "prior-run", "decoded"];
export type SecondPassSource = (typeof SECOND_PASS_SOURCES)[number];
/** The doc-side claims that arm the seat (the edit door's own
 * spellings; undefined/false/empty = the arm is not stated). */
export interface SecondPassClaim {
    readonly refine?: boolean;
    readonly chain_run?: string;
}
/** The refinement window every second-pass denoise rides
 * (partial only; 1 is the full-denoise pole this law refuses). */
export declare const SECOND_PASS_WINDOW: readonly [0.05, 1];
/** The full-noise clause shared by every arm's refusal — the
 * never-a-re-render law in the arm's own word. */
export declare function fullNoiseClause(arm: 'refine' | 'upscale'): string;
/** The shared reason the full-noise law refuses (the learned
 * latent the pole would discard). */
export declare const FULL_NOISE_REASON = "a full-noise sigma discards the learned upscaled latent";
/** Which arm a claim states (the first in the seat's own order);
 * undefined when the doc states no second pass at all. */
export declare function secondPassSourceOf(claim: SecondPassClaim): SecondPassSource | undefined;
/**
 * THE ONE-SEAT LAW: refuses a doc stating two second-pass arms,
 * naming the seat (the shared door every spelling is an arm of).
 * @param claim the doc's second-pass claims (refine switch, chain_run)
 * @param voice the refusing door's own prefix ("h3-timeline edit")
 * @throws when both the same-run and prior-run arms are stated
 */
export declare function refuseCompetingSecondPass(claim: SecondPassClaim, voice: string): void;
//# sourceMappingURL=secondPass.d.ts.map
