// tier.ts — THE STEP↔CHECKPOINT TIER (audit 014 C4): the checkpoint
// a lane loads and the steps it samples share ONE derivation. The
// official Music-3 checkpoints are full-schedule bodies (fp16 is the
// template's default; int8_convrot is its "For low VRAM" twin) and
// sample the template's 30 steps; a distilled body (turbo / lightning
// / distill marks in the filename) is the ONLY tier allowed below —
// upstream's distilled convention is the 8–12 window. The DECL's
// variant stamps (sampler_envelope + resolver_defaults on
// index.ts's standard row) spread FROM this module, and the compose
// action refuses a stated steps outside the resolved checkpoint's
// domain — a divergent hand stamp (or a distilled row landing
// without its bound) reds the wall, never composes.
/** The full-schedule tier: the official template's marriage — 30
 *  steps on the fp16/int8_convrot bodies. The card schema's served
 *  default derives from here (one home; the shared face may not
 *  drift from the derivation). */
export const MUSIC3_FULL_STEPS = {
    tier: "full",
    min: 30,
    max: 200,
    default: 30,
};
/** The distilled tier: the turbo/lightning window (the qwen-img-21
 *  turbo row's own [4, 8] and krea's distilled convention, widened
 *  to the music family's 8–12 the audit names). A distilled variant
 *  row is the only door below 30 — and it MUST stamp this tier (the
 *  step-tier wall derives the roster and judges the stamps). */
export const MUSIC3_DISTILLED_STEPS = {
    tier: "distilled",
    min: 8,
    max: 12,
    default: 10,
};
/** The distilled filename marks, spelling-agnostic: the same
 *  grammar quant-encoding-truth's impliedQuant uses (separators
 *  stripped, case-folded). */
const DISTILLED_MARK = /turbo|lightning|distill/i;
/** Derive the steps tier from the checkpoint a lane loads.
 *  @param unet the resolved lane_inputs.unet (the diffusion body's
 *   filename — the tier IS the body)
 *  @returns the tier's closed steps domain + default */
export function music3StepTier(unet) {
    return DISTILLED_MARK.test(unet) ? MUSIC3_DISTILLED_STEPS : MUSIC3_FULL_STEPS;
}
/** The tier's sampler-envelope spelling (the DECL row's stamp shape
 *  — the closed bounds the door's marriage judge reads). The steps
 *  span IS the tier; the cfg span is the family's own guidance
 *  domain, passed beside the call (the envelope schema requires both
 *  seats — the guidance mode is the family's, not the tier's).
 *  @param tier the derived tier whose steps span stamps
 *  @param cfg the family's guidance domain (the DECL's card bounds)
 *  @returns the envelope row the DECL stamps */
export function music3StepsEnvelope(tier, cfg) {
    return { steps: [tier.min, tier.max], cfg: [cfg[0], cfg[1]] };
}
/** The compose-side pairing judge: a stated steps rides only inside
 *  its checkpoint's tier domain.
 *  @param unet the resolved lane_inputs.unet
 *  @param steps the stated steps (the caller's word)
 *  @returns the tier the pairing resolved to (the caller stamps
 *   nothing — the value rode verbatim)
 *  @throws naming the checkpoint, the tier, and the domain when the
 *   stated steps is outside it (the divergent-stamp refusal) */
export function assertMusic3StepsInTier(unet, steps) {
    const tier = music3StepTier(unet);
    if (typeof steps !== "number" || !Number.isInteger(steps) || steps < tier.min || steps > tier.max) {
        throw new Error(`music3 compose: n_diffusion_steps ${String(steps)} is outside the ${tier.tier} tier's ` +
            `[${String(tier.min)}, ${String(tier.max)}] window for checkpoint '${unet}' ` +
            `(the step↔checkpoint pairing — a full-schedule body samples ${String(tier.default)} steps; ` +
            "only a distilled checkpoint (turbo/lightning/distill) may sample below, and it must stamp its own tier)");
    }
    return tier;
}
//# sourceMappingURL=tier.js.map
