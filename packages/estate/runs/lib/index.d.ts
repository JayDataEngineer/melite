import type { Context } from "@deepseek-ai/cordis";
export type { JsonValue, RunStartDoc, RunRow } from "./types.ts";
import type { RunStartDoc, RunRow } from "./types.ts";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** The registry seat's adapter-facing surface (structural — the
 *  implementation is RunsRegistryService in @melite/estate-queue;
 *  the wall pins the delegation byte-for-byte). */
interface RunsSeat {
    start(doc: unknown, signal: AbortSignal): Promise<{
        run_id: string;
        status: string;
        queue_position: number;
    }>;
    status(runId: string, signal: AbortSignal, includeLog?: boolean): Promise<Record<string, unknown>>;
    stop(runId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    list(rawLimit: string, signal: AbortSignal): Promise<{
        count: number;
        runs: Record<string, unknown>[];
    }>;
    validate(doc: unknown, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** Subscribe to run-row movement (the seam module's guarded
     *  wrapper — runsChange.ts in @melite/estate-queue); returns the
     *  unsubscribe. */
    onRunChange(fn: (runId: string) => void): () => void;
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        runsRemote: RunsRemoteService;
        /** The live-run registry seat (@melite/estate-queue's
         *  RunsRegistryService — structural here, per the header). */
        runs: RunsSeat;
    }
}
/** The runs remote: start/status/stop over the registry seat. */
export declare class RunsRemoteService extends TypertRemoteService {
    static inject: string[];
    constructor(ctx: Context);
    /** Endpoint `runs/start` — the submit chain (registry seat). */
    remoteExportStart(doc: RunStartDoc, signal: AbortSignal): Promise<{
        run_id: string;
        status: string;
        queue_position: number;
    }>;
    /** Endpoint `runs/status` — the live row (registry seat). */
    remoteExportStatus(runId: string, signal: AbortSignal): Promise<RunRow>;
    /** Endpoint `runs/stop` — the flag + interrupt (registry seat). */
    remoteExportStop(runId: string, signal: AbortSignal): Promise<RunRow>;
    /** Endpoint `runs/list` — the restore-port envelope (registry
     *  seat; the raw limit string keeps int() semantics). */
    remoteExportList(rawLimit: string, signal: AbortSignal): Promise<{
        count: number;
        runs: RunRow[];
    }>;
    /** Endpoint `runs/validate` — the pure compile (registry seat). */
    remoteExportValidate(doc: RunStartDoc, signal: AbortSignal): Promise<RunRow>;
    /** Endpoint `runs/subscribe` — THE PUSH SOURCE for the live row
     *  (1.8, the hand-roll audit's last poll, 2026-10-12): the row on
     *  open, then a fresh row after every registry write that moves
     *  the run — the change events the write spine fires (the claim,
     *  the settle, the artifacts harvest, the stop press). Stream mode
     *  rides the typert logical-stream carrier — the same-origin mux
     *  the bench tail rides. Abort ends the stream clean; a listener's
     *  fault never breaks it (the seam's wrapper guards). */
    subscribe(runId: string, signal: AbortSignal): AsyncIterable<RunRow>;
}
/** The runs remote row (the estate mounts it after the registry). */
export declare const runsRemotePlugin: {
    name: string;
    inject: readonly ["runs"];
    apply(ctx: Context): void;
};
//# sourceMappingURL=index.d.ts.map