// cardsArmError.ts — the card-lane refusal error (status + the
// _refusal envelope shape). Extracted from cardsRegistry: the arm's
// error voice, shared by every card plane module (no cycles).
export class CardArmError extends Error {
    status;
    code;
    loc;
    expected;
    got;
    constructor(status, message, code, loc, expected, got) {
        super(message);
        this.status = status;
        this.code = code;
        if (loc !== undefined)
            this.loc = loc;
        if (expected !== undefined)
            this.expected = expected;
        if (got !== undefined)
            this.got = got;
    }
}
/** The variant rail's own refusal (sampler_envelope) — a subclass
 *  so the WRITE seat can tell a DECL-own word from a selection
 *  failure (the audit's GAP 1: laneVerdict swallowed these with
 *  the selection tolerance, the bench admitted what the run
 *  refused, and no served face carried the envelope). Every
 *  instanceof CardArmError site still catches it. */
export class EnvelopeRefusal extends CardArmError {
}
export function phaseRefusal(phase, detail) {
    return new CardArmError(400, "card_compose phase " + phase + ": " + detail, "card_compose");
}
/** phaseRefusal with an explicit code — the run seat's lane gate
 *  splits the incomplete-draft class (an UNSTATED required word is
 *  bench state, never a run outcome; the client reads the code, not
 *  the prose) from every stated-wrong verdict. The message is the
 *  detail VERBATIM, no phase prefix: the prefix discriminated by
 *  prose what the code now discriminates, and this voice renders as
 *  the operator's claim at the Run press.
 * @param detail the refusal sentence (laneVerdict's own voice)
 * @param code the stable refusal code riding the error envelope
 * @returns the CardArmError the door throws */
export function phaseRefusalCode(detail, code) {
    return new CardArmError(400, detail, code);
}
//# sourceMappingURL=cardsArmError.js.map
