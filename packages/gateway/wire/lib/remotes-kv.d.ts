import { type Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** The late-bound doors module: exactly the four functions used. */
interface DoorOutFull {
    status: number;
    body: unknown;
    contentType: string;
    headers: Record<string, string>;
}
interface RunsFace {
    hRunsList(qs: Record<string, string[]>, roots: unknown, hasDraft: (draftId: string) => boolean, assets?: unknown): Promise<DoorOutFull>;
    hRunDetail(runId: string, roots: unknown): DoorOutFull;
}
interface ShellFace {
    defaultAssetRoots(): unknown;
}
export declare function loadRuns(): Promise<RunsFace>;
export declare function loadShell(): Promise<ShellFace>;
declare module "@deepseek-ai/cordis" {
    interface Context {
        draftsRemote: DraftsRemoteService;
        benchRemote: BenchRemoteService;
    }
}
/** The drafts KV face (R1: list + get — the panel reads; the save
 * verb widens the surface when its consumer migrates). */
export declare class DraftsRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** drafts/list — the recency-DESC index (cap 600, count pre-cap). */
    list(signal: AbortSignal): Promise<unknown>;
    /** drafts/get — one draft doc by id. */
    get(draft_id: string, signal: AbortSignal): Promise<unknown>;
}
/** The bench KV face (R1: get + ensure — the bench-load gesture's
 * exact two verbs). */
export declare class BenchRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** bench/get — one session's bench block as the served row. */
    get(session: string, signal: AbortSignal): Promise<unknown>;
    /** bench/ensure — create-if-absent / stage-replace-if-present. The
     * handler's body contract is unchanged (JSON bytes), so the decoded
     * remote argument is re-encoded once — the domain law stays 1:1. */
    ensure(doc: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
}
export {};
//# sourceMappingURL=remotes-kv.d.ts.map
