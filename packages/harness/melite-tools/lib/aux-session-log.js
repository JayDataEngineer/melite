/**
 * aux-session-log.ts — the auxiliary model-call record (the
 * model-visible ⟺ logged law, AGENTS.md conventions; ROADMAP
 * "conventions sweep drift ①").
 *
 * THE GAP IT CLOSES: the auxiliary completions (the enhance stream and
 * the delegated-eye vision stream) reached model requests with ZERO
 * session events — a model-visible input the session log could not
 * reconstruct. The compose plane never had this gap (its model-visible
 * inputs are DSH tool executions; their tool/call + tool/result events
 * ride the log by the registry), the auxiliary plane did.
 *
 * THE RECORD (one per auxiliary model call, appended PRE-dispatch, the
 * `session/title-llm-request` precedent — DSH's own log-only pre-dispatch
 * record of one auxiliary title request): the exact consumed inputs as
 * identity carriers — the assembled system text and the user prompt for
 * the enhance face (title-llm carries the exact system + messages); the
 * fixed question text and the DURABLE attachment identity (id, media
 * type, byte size, pixel geometry) for the vision face, the raw pixels
 * already living estate-side in the attachment store's own durable log.
 *
 * THE ENVELOPE: an ignorable plugin record (`appendPluginRecord`,
 * `plugin:` grammar) — purely informational forensics whose loss cannot
 * change how the rest of the log is interpreted, so a reader that does
 * not know the type skips it (the conventions' ignorable arm) instead of
 * refusing the log. A released SessionEventMap member would be
 * required-on-read — over-refusal for a record this law prices as
 * evidence.
 *
 * THE SEATS: every auxiliary call site threads a required AuxCallLog.
 *   - session seats (the tool plane): auxCallLogOf(exec.agent.session)
 *     — the seat is validated at construction; a malformed seat refuses
 *     loud before any model call fires.
 *   - the no-session face (the /melite-tools/enhance HTTP door: the
 *     editor's ✦ press names no session on the wire and the door opens
 *     none — the audit's documented-exception arm): unsessionedAuxCallLog
 *     voices the SAME payload through the host logger naming the
 *     exception, never a silent skip. The registry row
 *     gates-aux-model-call-session-log carries the exception.
 *
 * @module @melite/harness-tools/aux-session-log
 */
import { appendPluginRecord } from '@deepseek-ai/dsh-session';
/** The record type in the session log's plugin-record namespace. */
export const AUX_MODEL_CALL_RECORD = 'plugin:melite/aux-model-call';
/**
 * Build the emission seat for a session-owned auxiliary call (the tool
 * plane: `auxCallLogOf(exec.agent.session)`). Misregistration fails
 * LOUD here — at the earliest resolvable point, before any model call
 * fires — never as a silent skip mid-stream.
 * @param session - the owning session (its log receives the record).
 * @returns the seam whose append commits one ignorable plugin record.
 * @throws when the seat carries no append door (a malformed exec view).
 */
export function auxCallLogOf(session) {
    if (session === null || typeof session !== 'object' || typeof session.append !== 'function') {
        throw new Error('aux-session-log: the session seat carries no append door — refusing to fire an unlogged auxiliary model call (Model-visible ⟺ logged: the record has no log home)');
    }
    return {
        append: (data) => {
            // The cast states the production truth (the registry hands real
            // Sessions; a fake exec's structural view is the test face — the
            // fake-exec.ts grammar). The append-door check above catches the
            // lie at runtime before this line.
            appendPluginRecord(session, AUX_MODEL_CALL_RECORD, data);
        },
    };
}
/**
 * The no-session face (the /melite-tools/enhance HTTP door: the editor's
 * ✦ press names no session and the door opens none). The record rides
 * the host logger as one JSON line — the same payload the session seat
 * would append — naming the exception, never a silent skip. The
 * registry row carries the exception as the door's documented arm.
 * @param voice - the host logger's line sink.
 * @returns the seam whose append voices the record to the logger.
 */
export function unsessionedAuxCallLog(voice) {
    return {
        append: (data) => {
            voice('[melite aux-call UNSESSIONED — no session log seats the '
                + data.stream + ' door; the record rides this line + the wire purpose] '
                + JSON.stringify(data));
        },
    };
}
//# sourceMappingURL=aux-session-log.js.map
