/** The transport every estate consumer receives. Plain, structural,
 *  JSON-in/JSON-out, cancellation + timeout owned by the caller. */
export type EstateCall = (method: "GET" | "POST" | "PATCH", path: string, body: unknown, signal: AbortSignal | undefined, timeoutMs: number) => Promise<unknown>;
/** A lane refusal: status + raw body + the named `error` field the
 *  doors stamp (field names kept from the cards' shape — their catch
 *  arms are unchanged). */
export declare class GatewayError extends Error {
    readonly status: number;
    readonly body: string;
    readonly named: string;
    constructor(status: number, body: string, named: string);
}
/** Adapt the raw call to the JSON-record contract the cards speak:
 *  non-record bodies and refusals throw GatewayError exactly as the
 *  stamped clients did. */
export declare function jsonLane(call: EstateCall): (method: "GET" | "POST" | "PATCH", path: string, body?: Record<string, unknown>, signal?: AbortSignal, timeoutMs?: number) => Promise<Record<string, unknown>>;
//# sourceMappingURL=estateCall.d.ts.map
