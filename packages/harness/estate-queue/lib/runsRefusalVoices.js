// runsRefusalVoices.ts — the runs seat's refusal folds. Extracted
// from runsRegistry (the god-file cut): CardArmError -> QueueRefusal
// -> RemoteError over the one code table, plus the preview posture.
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.js";
function refusalEnvelopeOf(err) {
    const p = { error: err.message, code: err.code };
    if (err.loc !== undefined)
        p["loc"] = err.loc;
    if (err.expected !== undefined)
        p["expected"] = err.expected;
    if (err.got !== undefined)
        p["got"] = err.got;
    return p;
}
export function cardRefusal(err) {
    return {
        status: err.status,
        payload: refusalEnvelopeOf(err),
    };
}
/** Fold a door refusal into the protocol's one error class. */
export function toRemoteError(r) {
    const p = r.payload;
    const mapped = RUNS_ERROR_CODES[p["code"]];
    if (mapped === undefined) {
        // A refusal this table does not name is a bug — LOUD, never
        // a silent generic.
        throw new Error("runs remote: unmapped refusal code " + p["code"]);
    }
    const details = {};
    if (p["loc"] !== undefined)
        details["loc"] = p["loc"];
    if (p["expected"] !== undefined)
        details["expected"] = p["expected"];
    if (p["got"] !== undefined)
        details["got"] = p["got"];
    return new RemoteError(mapped, p["error"], details);
}
/** The preview-scope refusal (door posture). */
export function refusePreview(message) {
    return { status: 400, payload: { error: message, code: "preview_scope" } };
}
//# sourceMappingURL=runsRefusalVoices.js.map
