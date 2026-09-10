import type { Context } from "@deepseek-ai/cordis";
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
    remoteExportStart(doc: unknown, signal: AbortSignal): Promise<{
        run_id: string;
        status: string;
        queue_position: number;
    }>;
    /** Endpoint `runs/status` — the live row (registry seat). */
    remoteExportStatus(runId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** Endpoint `runs/stop` — the flag + interrupt (registry seat). */
    remoteExportStop(runId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** Endpoint `runs/list` — the restore-port envelope (registry
     *  seat; the raw limit string keeps py int() semantics). */
    remoteExportList(rawLimit: string, signal: AbortSignal): Promise<{
        count: number;
        runs: Record<string, unknown>[];
    }>;
    /** Endpoint `runs/validate` — the pure compile (registry seat). */
    remoteExportValidate(doc: unknown, signal: AbortSignal): Promise<Record<string, unknown>>;
}
/** The runs remote row (the estate mounts it after the registry). */
export declare const runsRemotePlugin: {
    name: string;
    inject: readonly ["runs"];
    apply(ctx: Context): void;
};
export {};
//# sourceMappingURL=index.d.ts.map
