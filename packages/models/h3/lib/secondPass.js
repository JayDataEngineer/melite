// THE SECOND_PASS GATE LAW (the unification's first increment):
// the family's second-pass spellings — the edit door's refine
// switch (same-run latents, the learned handoff), the film
// handoff's upscale_route latent_2x (same-run, the window arm), a
// stated chain_run on the edit door (prior-run checkpoints, the
// deferred loop), and the postImage finish limb (decoded pixels) —
// are ARMS of ONE seat. This module is that seat's shared
// vocabulary and refusal laws; the arms keep their own nodes (a
// vocabulary and gate unification, NEVER a graph change — the
// byte-exact frozen suites stay green).
//
// THE ONE-SEAT LAW: one doc states ONE second-pass arm. Stating
// two refuses loud, naming the seat itself — the pair-wise
// refusals the doors carried collapse into this one law.
//
// THE FULL-NOISE LAW: a second pass is a refine or an upscale,
// never a re-render — a full-noise sigma discards the learned
// upscaled latent (the vendored refinement runs 0 <= sigmas[0] < 1
// STRICT and throws otherwise). A full-denoise re-render is a
// reshoot, and the reshoot door exists.
/** The arms' source vocabulary: where the second pass reads its
 * latents or pixels from. */
export const SECOND_PASS_SOURCES = ['same-run', 'prior-run', 'decoded'];
/** The refinement window every second-pass denoise rides
 * (partial only; 1 is the full-denoise pole this law refuses). */
export const SECOND_PASS_WINDOW = [0.05, 1];
/** The full-noise clause shared by every arm's refusal — the
 * never-a-re-render law in the arm's own word. */
export function fullNoiseClause(arm) {
    return `a second pass is ${arm === 'upscale' ? 'an' : 'a'} ${arm}, never a re-render`;
}
/** The shared reason the full-noise law refuses (the learned
 * latent the pole would discard). */
export const FULL_NOISE_REASON = 'a full-noise sigma discards the learned upscaled latent';
/** Which arm a claim states (the first in the seat's own order);
 * undefined when the doc states no second pass at all. */
export function secondPassSourceOf(claim) {
    if (claim.refine === true)
        return 'same-run';
    if (typeof claim.chain_run === 'string' && claim.chain_run.trim() !== '')
        return 'prior-run';
    return undefined;
}
/**
 * THE ONE-SEAT LAW: refuses a doc stating two second-pass arms,
 * naming the seat (the shared door every spelling is an arm of).
 * @param claim the doc's second-pass claims (refine switch, chain_run)
 * @param voice the refusing door's own prefix ("h3-timeline edit")
 * @throws when both the same-run and prior-run arms are stated
 */
export function refuseCompetingSecondPass(claim, voice) {
    const stated = secondPassSourceOf(claim);
    if (stated !== 'same-run')
        return;
    if (!(typeof claim.chain_run === 'string' && claim.chain_run.trim() !== ''))
        return;
    throw new Error(`${voice}: the refine switch under an upscale — two second-pass arms on the ONE second-pass seat (the switch arms the same-run handoff on THIS chain, the upscale resumes a PRIOR run's checkpointed scenes; the doc's duplicate-2x resolved into ONE door — the seat takes one arm per doc). Leave refine off`);
}
//# sourceMappingURL=secondPass.js.map