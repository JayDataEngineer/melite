import type { EstateCall } from '@melite/estate-call';
/**
 * DYING SHIM (HTTP-era refusal carrier). The seats never throw it;
 * only lanes still awaiting their remotes keep instanceof arms for
 * it, and it is deleted with the last of those. Bench/drafts lanes
 * are already migrated (RemoteError codes).
 */
export type EstateMethod = 'GET' | 'POST' | 'PATCH';
export type EstateRequest = (method: EstateMethod, path: string, body: unknown, execSignal: AbortSignal, timeoutMs?: number) => Promise<unknown>;
/** Narrow the seat-bound request to the canonical EstateCall the card
 * tool builders receive: the seats demand a caller signal (trySeats'
 * throwIfAborted), so a signalless call fails HERE with a named error
 * instead of deep inside the lane as a TypeError (2026-09-12). */
export declare function asEstateCall(request: EstateRequest): EstateCall;
/** Which seat FAMILY a path needs (agent-debt F-8, 2026-09-22 —
 * coarse by design: the matcher above is the truth; this only names
 * the family for the seatless refusal so the error says what to look
 * at instead of developer archaeology). probeNames are the ONLY
 * names the refusal may ctx.get — exactly the ones the matcher
 * itself would have probed for this path: an EAGER sweep of all
 * seat names INSTANTIATES defined-but-unloaded services on a cordis
 * context (constructors with side effects — the hang, live proof
 * 2026-09-22: the manage-seat wall took 51.8s dialing). */
export declare function seatFamilyForPath(path: string): {
    family: string;
    probeNames: string[];
};
/** Build the tools' request: seats only, in-process. A lane with no
 *  seat for the path is a hard error — but the error must be an
 *  AGENT-USABLE refusal (F-8): name the family the path needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. The old voice ("the gateway lane fallback died
 *  2026-09-10 — migrate to a named Typert remote") read as a broken
 *  registry and sent an agent hunting doors for an hour. */
export declare function makeEstateRequest(ctx: unknown): EstateRequest;
//# sourceMappingURL=estate.d.ts.map