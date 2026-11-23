/** The auxiliary streams this record names. One record per model call;
 *  the wall judges each stream on its own firing arm. */
export type AuxModelCallStream = 'enhance' | 'vision';
/** The vision question kinds (VISION_QUESTIONS's keys — structurally
 *  welded: vision-route constructs this payload from its own union, so
 *  a new question kind fails to compile until the record carries it). */
export type AuxVisionKind = 'still' | 'film' | 'poster';
/** What one auxiliary model call consumed — the reconstructable inputs.
 *  Face fields are optional because one record carries exactly one
 *  face; the wall asserts each stream's own fields present. */
export interface AuxModelCallEventData {
    /** Which auxiliary stream fired. */
    stream: AuxModelCallStream;
    /** The exact route the call went to (provider + model). */
    route: {
        provider: string;
        model: string;
    };
    /** ENHANCE FACE: the exact assembled system text (recipe + the door's
     *  output contract), verbatim what the request carried. */
    system?: string;
    /** ENHANCE FACE: the exact user prompt text. */
    prompt?: string;
    /** ENHANCE FACE: the temperature when one was sent. */
    temperature?: number;
    /** VISION FACE: which fixed question the arm asked. */
    kind?: AuxVisionKind;
    /** VISION FACE: the exact fixed question text (VISION_QUESTIONS's
     *  value — carried verbatim so the record is self-sufficient). */
    question?: string;
    /** VISION FACE: the durable attachment identity — the store's own
     *  carriers for the pixels this call consumed. */
    image?: {
        attachmentId: string;
        mediaType: string;
        bytes: number;
        width: number;
        height: number;
    };
}
/** The record type in the session log's plugin-record namespace. */
export declare const AUX_MODEL_CALL_RECORD = "plugin:melite/aux-model-call";
declare module '@deepseek-ai/dsh-session/types' {
    interface PluginRecordMap {
        /** One auxiliary model call's consumed inputs, pre-dispatch. */
        'plugin:melite/aux-model-call': AuxModelCallEventData;
    }
}
declare module '@deepseek-ai/dsh-llm/types' {
    interface LlmRequestPurposeMap {
        /** The enhance door's auxiliary completion. */
        'melite-enhance': true;
        /** The delegated-eye vision verification. */
        'melite-vision': true;
    }
}
/** The emission seam every auxiliary call site threads. One method so
 *  test seats stay one closure wide. */
export interface AuxCallLog {
    /** Append the record for one auxiliary model call. */
    append(data: AuxModelCallEventData): void;
}
/**
 * The session seat: validate + append. The real Session satisfies it;
 * the structural exec views widen to exactly this face (the ViewExec
 * grammar — contravariance-safe, requestHeader widened the same way).
 */
export interface AuxSessionAppendSeat {
    append(type: string, data: unknown): unknown;
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
export declare function auxCallLogOf(session: AuxSessionAppendSeat): AuxCallLog;
/**
 * The no-session face (the /melite-tools/enhance HTTP door: the editor's
 * ✦ press names no session and the door opens none). The record rides
 * the host logger as one JSON line — the same payload the session seat
 * would append — naming the exception, never a silent skip. The
 * registry row carries the exception as the door's documented arm.
 * @param voice - the host logger's line sink.
 * @returns the seam whose append voices the record to the logger.
 */
export declare function unsessionedAuxCallLog(voice: (line: string) => void): AuxCallLog;
//# sourceMappingURL=aux-session-log.d.ts.map
