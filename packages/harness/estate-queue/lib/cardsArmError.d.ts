import { RUNS_ERROR_CODES } from "./runsErrorCodes.js";
export declare class CardArmError extends Error {
    readonly status: number;
    readonly code: string;
    readonly loc?: string;
    readonly expected?: string;
    readonly got?: string;
    constructor(status: number, message: string, code: string, loc?: string, expected?: string, got?: string);
}
/** The variant rail's own refusal (sampler_envelope) — a subclass
 *  so the WRITE seat can tell a DECL-own word from a selection
 *  failure (the audit's GAP 1: laneVerdict swallowed these with
 *  the selection tolerance, the bench admitted what the run
 *  refused, and no served face carried the envelope). Every
 *  instanceof CardArmError site still catches it. */
export declare class EnvelopeRefusal extends CardArmError {
}
export declare function phaseRefusal(phase: string, detail: string): CardArmError;
/** phaseRefusal with an explicit code — the run seat's lane gate
 *  splits the incomplete-draft class (an UNSTATED required word is
 *  bench state, never a run outcome; the client reads the code, not
 *  the prose) from every stated-wrong verdict. The message is the
 *  detail VERBATIM, no phase prefix: the prefix discriminated by
 *  prose what the code now discriminates, and this voice renders as
 *  the operator's claim at the Run press.
 *  THE PARAM IS THE TABLE'S KEY UNION (the wire-chain audit cure,
 *  2026-10-18): an envelope code outside RUNS_ERROR_CODES fails
 *  TYPECHECK at this throw site — never the toRemoteError LOUD
 *  throw, and never the client's silent default carry.
 * @param detail the refusal sentence (laneVerdict's own voice)
 * @param code the tabled envelope code riding the error envelope
 * @returns the CardArmError the door throws */
export declare function phaseRefusalCode(detail: string, code: keyof typeof RUNS_ERROR_CODES): CardArmError;
//# sourceMappingURL=cardsArmError.d.ts.map
