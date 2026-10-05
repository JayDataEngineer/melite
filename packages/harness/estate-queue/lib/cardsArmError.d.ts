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
//# sourceMappingURL=cardsArmError.d.ts.map
