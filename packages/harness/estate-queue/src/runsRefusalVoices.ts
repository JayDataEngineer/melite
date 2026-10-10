// runsRefusalVoices.ts — the runs seat's refusal folds. Extracted
// from runsRegistry (the god-file cut): CardArmError -> QueueRefusal
// -> RemoteError over the one code table, plus the preview posture.
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { CardArmError, LaneInputMiss } from "./cardsArmError.ts";
import type { QueueRefusal } from "./queue.ts";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.ts";
import type { LaneInputMissingDetails } from "./runsRegistry.ts";

function refusalEnvelopeOf(err: CardArmError): Record<string, unknown> {
  const p: Record<string, unknown> = { error: err.message, code: err.code };
  if (err.loc !== undefined) p["loc"] = err.loc;
  if (err.expected !== undefined) p["expected"] = err.expected;
  if (err.got !== undefined) p["got"] = err.got;
  if (err.lane !== undefined) {
    const lane = err.lane;
    p["family"] = lane.family;
    p["slot"] = lane.slot;
    p["missing"] = lane.missing;
    p["folders"] = [...lane.folders];
    if (lane.fetchUrl !== undefined) p["fetch_url"] = lane.fetchUrl;
    p["kind"] = lane.kind;
  }
  return p;
}

/** The lane-miss row's structured details, read back off the
 *  envelope. A lane_input_missing refusal without the structured
 *  evidence is a bug at the throw site — LOUD, never a popup keyed
 *  on prose (the fold's law: unmapped or malformed is thrown,
 *  never a silent generic). */
function laneDetailsOf(p: Record<string, unknown>): LaneInputMissingDetails {
  const family = p["family"];
  const slot = p["slot"];
  const missing = p["missing"];
  const folders = p["folders"];
  const kind = p["kind"];
  if (typeof family !== "string" || typeof slot !== "string"
    || typeof missing !== "string" || !Array.isArray(folders)
    || (kind !== "model" && kind !== "extension")) {
    throw new Error(
      "runs remote: lane_input_missing refusal lacks its structured artifact (family/slot/missing/folders/kind)",
    );
  }
  const fetchUrl = p["fetch_url"];
  const loc = p["loc"];
  const expected = p["expected"];
  const got = p["got"];
  return {
    // THE ROW EXTENDS RunsRefusalDetails: the bench arm's loc-carry
    // reads these three off the mapped details — a lane refusal that
    // set them must survive the fold like every other refusal's.
    ...(typeof loc === "string" && loc !== "" ? { loc } : {}),
    ...(typeof expected === "string" ? { expected } : {}),
    ...(typeof got === "string" ? { got } : {}),
    family,
    slot,
    missing,
    folders: folders.filter((f): f is string => typeof f === "string"),
    ...(typeof fetchUrl === "string" && fetchUrl !== "" ? { fetch_url: fetchUrl } : {}),
    kind,
  };
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
  // THE LANE-MISS ROW CARRIES ITS ARTIFACT (the details map's
  // typed row forces the branch): the popup keys on the fields,
  // so the fold reads them back off the envelope and refuses a
  // malformed one loud.
  if (mapped === "runs/lane-input-missing") {
    return new RemoteError(mapped, p["error"], laneDetailsOf(p));
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
