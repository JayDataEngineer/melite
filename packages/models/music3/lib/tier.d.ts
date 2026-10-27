/** The closed tier vocabulary: full-schedule vs distilled. */
export type Music3StepTier = "full" | "distilled";
/** The steps a tier's checkpoint samples: the closed domain and the
 *  default the derivation stamps when the caller states nothing. */
export interface Music3TierSteps {
    readonly tier: Music3StepTier;
    /** The domain's floor — a full body refuses below it. */
    readonly min: number;
    /** The domain's ceiling. */
    readonly max: number;
    /** The tier's default (the unstated compose). */
    readonly default: number;
}
/** The full-schedule tier: the official template's marriage — 30
 *  steps on the fp16/int8_convrot bodies. The card schema's served
 *  default derives from here (one home; the shared face may not
 *  drift from the derivation). */
export declare const MUSIC3_FULL_STEPS: Music3TierSteps;
/** The distilled tier: the turbo/lightning window (the qwen-img-21
 *  turbo row's own [4, 8] and krea's distilled convention, widened
 *  to the music family's 8–12 the audit names). A distilled variant
 *  row is the only door below 30 — and it MUST stamp this tier (the
 *  step-tier wall derives the roster and judges the stamps). */
export declare const MUSIC3_DISTILLED_STEPS: Music3TierSteps;
/** Derive the steps tier from the checkpoint a lane loads.
 *  @param unet the resolved lane_inputs.unet (the diffusion body's
 *   filename — the tier IS the body)
 *  @returns the tier's closed steps domain + default */
export declare function music3StepTier(unet: string): Music3TierSteps;
/** The tier's sampler-envelope spelling (the DECL row's stamp shape
 *  — the closed bounds the door's marriage judge reads). The steps
 *  span IS the tier; the cfg span is the family's own guidance
 *  domain, passed beside the call (the envelope schema requires both
 *  seats — the guidance mode is the family's, not the tier's).
 *  @param tier the derived tier whose steps span stamps
 *  @param cfg the family's guidance domain (the DECL's card bounds)
 *  @returns the envelope row the DECL stamps */
export declare function music3StepsEnvelope(tier: Music3TierSteps, cfg: readonly [number, number]): {
    steps: [number, number];
    cfg: [number, number];
};
/** The compose-side pairing judge: a stated steps rides only inside
 *  its checkpoint's tier domain.
 *  @param unet the resolved lane_inputs.unet
 *  @param steps the stated steps (the caller's word)
 *  @returns the tier the pairing resolved to (the caller stamps
 *   nothing — the value rode verbatim)
 *  @throws naming the checkpoint, the tier, and the domain when the
 *   stated steps is outside it (the divergent-stamp refusal) */
export declare function assertMusic3StepsInTier(unet: string, steps: number): Music3TierSteps;
//# sourceMappingURL=tier.d.ts.map
