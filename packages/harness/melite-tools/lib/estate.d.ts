import { type DraftId } from '@melite/contracts/benchStage';
import type { EstateCall } from '@melite/estate-call';
/**
 * DYING SHIM (HTTP-era refusal carrier). The seats never throw it;
 * only lanes still awaiting their remotes keep instanceof arms for
 * it, and it is deleted with the last of those. Bench/drafts lanes
 * are already migrated (RemoteError codes).
 */
export type EstateMethod = 'GET' | 'POST' | 'PATCH';
export type EstateRequest = (method: EstateMethod, path: string, body: unknown, execSignal: AbortSignal, timeoutMs?: number) => Promise<unknown>;
/** The service-probe face every estate consumer reads through —
 *  cordis Context satisfies it structurally (the tutorial's
 *  documented ctx.get probe). The retired `as { get }` inline casts
 *  (F-2/F-4, 2026-11-05) named this face at every use site; the named
 *  interface is the one spelling now. */
export interface EstateHost {
    get(name: string): unknown;
}
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
export interface SeatFamily {
    family: string;
    probeNames: string[];
    notADoor?: string;
}
export declare function seatFamilyForPath(path: string): SeatFamily;
/** Build the tools' request: seats only, in-process. A lane with no
 *  seat for the path is a hard error — but the error must be an
 *  AGENT-USABLE refusal (F-8): name the family the path needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. The old voice ("the gateway lane fallback died
 *  2026-09-10 — migrate to a named Typert remote") read as a broken
 *  registry and sent an agent hunting doors for an hour. */
export declare function makeEstateRequest(ctx: EstateHost): EstateRequest;
/** The bench plane's mutation verbs — the eight arms the bench
 *  seat answers 1:1 (the router's regex admits the same eight;
 *  `archive` is F11's spent-stage mark — the row stays, every run
 *  face skips it). */
export type BenchVerb = 'patch' | 'add_stage' | 'add_stages' | 'remove_stage' | 'archive' | 'clear' | 'rewire' | 'undo';
/** The tool plane's ONE estate seam: the typed lanes. A tool factory
 *  takes `Estate` and calls methods — never `request('GET', path)`. */
export interface Estate {
    /** The drafts plane: the KV list, the one-draft read, the stage
     *  wire PATCH (params edits + result persistence). */
    draftsList(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    draftsGet(draftId: DraftId, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    draftsStagePatch(draftId: DraftId, stageId: string, patch: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** THE CARD COMPOSE (the start body → a bench-backed draft; the
     *  CAS one-retry law lives in the ONE lane both faces share). */
    cardCompose(body: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The bench plane: the shared-bench read, the ensure (birth/load),
     *  the eight mutation verbs. */
    benchGet(session: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    benchEnsure(doc: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    benchVerb(session: string, verb: BenchVerb, doc: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The runs registry: validate (pure compile), start, live status,
     *  stop receipt, the tail list. */
    runsValidate(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    runsStart(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    runsStatus(runId: string, includeLog: boolean, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    runsStop(runId: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    runsList(limit: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The disclosure seat: discover over both planes, the flow
     *  contracts. Sync seats — the bound still races their answer. */
    discover(lookup: string, q: string, tags: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    flowsContracts(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The management seat (ComfyUI-Manager plane). */
    manageAct(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The skills seat: the index and the one-doc read. */
    skillsIndex(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    skillRead(id: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The load seat: one card or flow bundle. */
    loadCard(inferenceType: string, name: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
    /** The queue seat's journal tail. SEATLESS reads as an EMPTY tail
     *  (the designed degrade — the journal is optional infra), never
     *  a refusal; a mounted seat's throw propagates. */
    ledgerTail(limit: string, event: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
}
/** The typed lanes (see Estate). Same seats, same refusals, same
 *  bounds as the URL router — no second answering of any lane law. */
export declare function makeEstate(ctx: EstateHost): Estate;
//# sourceMappingURL=estate.d.ts.map