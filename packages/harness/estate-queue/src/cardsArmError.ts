// cardsArmError.ts — the card-lane refusal error (status + the
// _refusal envelope shape). Extracted from cardsRegistry: the arm's
// error voice, shared by every card plane module (no cycles).
import { RUNS_ERROR_CODES } from "./runsErrorCodes.ts";

/** The structured lane-miss evidence a lane_input_missing refusal
 *  carries beside its prose (the missing-model popup's payload,
 *  operator 2026-10-22): the wire code names the class, these fields
 *  name the artifact — which slot, which family, which file, where
 *  the manager fetches it. */
export interface LaneInputMiss {
  /** The model family id whose lane_inputs declared the row. */
  readonly family: string;
  /** The lane slot key (text_encoder, vae, …). */
  readonly slot: string;
  /** The declared file name that has no store copy. */
  readonly missing: string;
  /** The model folders the presence probe checked, in order. */
  readonly folders: readonly string[];
  /** The provision URL when the family declares one for the file. */
  readonly fetchUrl?: string;
  /** The artifact class the popup's action keys on. "runtime" is
   *  the tool-runtime leg (E2-2 Piece A): the slot is the consuming
   *  param, missing is the runtime name, folders are the checked
   *  engine-tree paths, and there is no fetchUrl (the provision is
   *  a command the banner voices from the prose, never a URL). */
  readonly kind: "model" | "extension" | "runtime";
}

/** THE IN-FLIGHT ACQUISITION ROW (ERRORS.md k2, NEVER-RUN-ON-
 *  INCOMPLETE): the structured truth a lane-presence miss carries when
 *  the missing file is LANDING right now — the popup keys its face on
 *  these fields, never on prose, and the fresh-fetch hint is absent by
 *  law (a fetch already runs; offering another re-pops the loop). */
export interface AcquireInFlightDetails {
  readonly acquire_in_flight: true;
  /** The live acquire's operation id (the poll key). */
  readonly operation_id: string;
  /** Real landed bytes at the refusal moment. */
  readonly bytes: number;
  /** The DECL's declared total (0 when no row declares one). */
  readonly total: number;
}

export class CardArmError extends Error {
  readonly status: number;
  /** The refusal's envelope code — ALWAYS a RUNS_ERROR_CODES key
   *  (the wire-chain F1 wall, 2026-10-20: the field is narrowed to
   *  the table's key union, so an untabled code fails TYPECHECK at
   *  its throw site — never the validate door's runtime guard, and
   *  never the client's silent default carry). */
  readonly code: keyof typeof RUNS_ERROR_CODES;
  readonly loc?: string;
  readonly expected?: string;
  readonly got?: string;
  /** The structured lane-miss evidence — set only by the
   *  lane_input_missing throw site (cardsLanes.lanePresenceMiss). */
  readonly lane?: LaneInputMiss;
  /** The structured in-flight-acquisition evidence — set only by the
   *  lane_input_missing throw site's in-flight arm, beside (never
   *  instead of) the lane miss itself. */
  readonly details?: AcquireInFlightDetails;
  constructor(
    status: number,
    message: string,
    code: keyof typeof RUNS_ERROR_CODES,
    loc?: string,
    expected?: string,
    got?: string,
    lane?: LaneInputMiss,
    details?: AcquireInFlightDetails,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    if (loc !== undefined) this.loc = loc;
    if (expected !== undefined) this.expected = expected;
    if (got !== undefined) this.got = got;
    if (lane !== undefined) this.lane = lane;
    if (details !== undefined) this.details = details;
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
export function phaseRefusalCode(
  detail: string,
  code: keyof typeof RUNS_ERROR_CODES,
): CardArmError {
  return new CardArmError(
    400,
    detail,
    code,
  );
}
