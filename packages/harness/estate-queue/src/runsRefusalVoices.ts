// runsRefusalVoices.ts — the runs seat's refusal folds. Extracted
// from runsRegistry (the god-file cut): CardArmError -> QueueRefusal
// -> RemoteError over the one code table, plus the preview posture.
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { CardArmError } from "./cardsArmError.ts";
import type { QueueRefusal } from "./queue.ts";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.ts";

function refusalEnvelopeOf(err: CardArmError): Record<string, unknown> {
  const p: Record<string, unknown> = { error: err.message, code: err.code };
  if (err.loc !== undefined) p["loc"] = err.loc;
  if (err.expected !== undefined) p["expected"] = err.expected;
  if (err.got !== undefined) p["got"] = err.got;
  return p;
}

export function cardRefusal(err: CardArmError): QueueRefusal {
  return {
    status: err.status,
    payload: refusalEnvelopeOf(err),
  };
}

/** Fold a door refusal into the protocol's one error class. */
export function toRemoteError(r: QueueRefusal): RemoteError {
  const p = r.payload as {
    error: string;
    code: string;
    loc?: string;
    expected?: string;
    got?: string;
  };
  const mapped = RUNS_ERROR_CODES[p["code"]];
  if (mapped === undefined) {
    // A refusal this table does not name is a bug — LOUD, never
    // a silent generic.
    throw new Error("runs remote: unmapped refusal code " + p["code"]);
  }
  const details: {
    loc?: string;
    expected?: string;
    got?: string;
  } = {};
  if (p["loc"] !== undefined) details["loc"] = p["loc"];
  if (p["expected"] !== undefined) details["expected"] = p["expected"];
  if (p["got"] !== undefined) details["got"] = p["got"];
  return new RemoteError(mapped, p["error"], details);
}

/** The preview-scope refusal (door posture). */
export function refusePreview(message: string): QueueRefusal {
  return { status: 400, payload: { error: message, code: "preview_scope" } };
}
