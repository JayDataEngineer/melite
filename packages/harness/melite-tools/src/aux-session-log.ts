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
import { appendPluginRecord } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'

/** The auxiliary streams this record names. One record per model call;
 *  the wall judges each stream on its own firing arm. */
export type AuxModelCallStream = 'enhance' | 'vision'

/** The vision question kinds (VISION_QUESTIONS's keys — structurally
 *  welded: vision-route constructs this payload from its own union, so
 *  a new question kind fails to compile until the record carries it). */
export type AuxVisionKind = 'still' | 'film' | 'poster'

/** What one auxiliary model call consumed — the reconstructable inputs.
 *  Face fields are optional because one record carries exactly one
 *  face; the wall asserts each stream's own fields present. */
export interface AuxModelCallEventData {
  /** Which auxiliary stream fired. */
  stream: AuxModelCallStream
  /** The exact route the call went to (provider + model). */
  route: { provider: string, model: string }
  /** ENHANCE FACE: the exact assembled system text (recipe + the door's
   *  output contract), verbatim what the request carried. */
  system?: string
  /** ENHANCE FACE: the exact user prompt text. */
  prompt?: string
  /** ENHANCE FACE: the temperature when one was sent. */
  temperature?: number
  /** VISION FACE: which fixed question the arm asked. */
  kind?: AuxVisionKind
  /** VISION FACE: the exact fixed question text (VISION_QUESTIONS's
   *  value — carried verbatim so the record is self-sufficient). */
  question?: string
  /** VISION FACE: the durable attachment identity — the store's own
   *  carriers for the pixels this call consumed. */
  image?: {
    attachmentId: string
    mediaType: string
    bytes: number
    width: number
    height: number
  }
}

/** The record type in the session log's plugin-record namespace. */
export const AUX_MODEL_CALL_RECORD = 'plugin:melite/aux-model-call'

declare module '@deepseek-ai/dsh-session/types' {
  interface PluginRecordMap {
    /** One auxiliary model call's consumed inputs, pre-dispatch. */
    'plugin:melite/aux-model-call': AuxModelCallEventData
  }
}

declare module '@deepseek-ai/dsh-llm/types' {
  interface LlmRequestPurposeMap {
    /** The enhance door's auxiliary completion. */
    'melite-enhance': true
    /** The delegated-eye vision verification. */
    'melite-vision': true
  }
}

/** The emission seam every auxiliary call site threads. One method so
 *  test seats stay one closure wide. */
export interface AuxCallLog {
  /** Append the record for one auxiliary model call. */
  append(data: AuxModelCallEventData): void
}

/**
 * The session seat: validate + append. The real Session satisfies it;
 * the structural exec views widen to exactly this face (the ViewExec
 * grammar — contravariance-safe, requestHeader widened the same way).
 */
export interface AuxSessionAppendSeat {
  append(type: string, data: unknown): unknown
}

/**
 * Build the emission seat for a session-owned auxiliary call (the tool
 * plane: `auxCallLogOf(exec.agent.session)`). Misregistration fails
 * LOUD here — at the earliest resolvable point, before any model call
 * fires — never as a silent skip mid-stream.
 * @param session - the owning session (its log receives the record).
 * @returns the seam whose append commits one ignorable plugin record.
 * @throws when the seat carries no append door (a malformed exec view).
 */
export function auxCallLogOf(session: AuxSessionAppendSeat): AuxCallLog {
  if (session === null || typeof session !== 'object' || typeof session.append !== 'function') {
    throw new Error(
      'aux-session-log: the session seat carries no append door — refusing to fire an unlogged auxiliary model call (Model-visible ⟺ logged: the record has no log home)',
    )
  }
  return {
    append: (data) => {
      // The cast states the production truth (the registry hands real
      // Sessions; a fake exec's structural view is the test face — the
      // fake-exec.ts grammar). The append-door check above catches the
      // lie at runtime before this line.
      appendPluginRecord(session as Session, AUX_MODEL_CALL_RECORD, data)
    },
  }
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
export function unsessionedAuxCallLog(voice: (line: string) => void): AuxCallLog {
  return {
    append: (data) => {
      voice('[melite aux-call UNSESSIONED — no session log seats the '
        + data.stream + ' door; the record rides this line + the wire purpose] '
        + JSON.stringify(data))
    },
  }
}
