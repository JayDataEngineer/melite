// cardsArmError.ts — the card-lane refusal error (status + the
// _refusal envelope shape). Extracted from cardsRegistry: the arm's
// error voice, shared by every card plane module (no cycles).
export class CardArmError extends Error {
  readonly status: number;
  readonly code: string;
  readonly loc?: string;
  readonly expected?: string;
  readonly got?: string;
  constructor(
    status: number,
    message: string,
    code: string,
    loc?: string,
    expected?: string,
    got?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    if (loc !== undefined) this.loc = loc;
    if (expected !== undefined) this.expected = expected;
    if (got !== undefined) this.got = got;
  }
}

/** The variant rail's own refusal (sampler_envelope) — a subclass
 *  so the WRITE seat can tell a DECL-own word from a selection
 *  failure (the audit's GAP 1: laneVerdict swallowed these with
 *  the selection tolerance, the bench admitted what the run
 *  refused, and no served face carried the envelope). Every
 *  instanceof CardArmError site still catches it. */
export class EnvelopeRefusal extends CardArmError {}

export function phaseRefusal(phase: string, detail: string): CardArmError {
  return new CardArmError(
    400,
    "card_compose phase " + phase + ": " + detail,
    "card_compose",
  );
}

