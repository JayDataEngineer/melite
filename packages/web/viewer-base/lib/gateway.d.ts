export interface RunStatusBody {
    run_id: string;
    status: string;
    /** Relative artifact paths; compose with assetUrl(). */
    artifacts: readonly string[];
    error: string;
    queue_position: number;
}
/** A non-JSON or non-2xx status response (the run door's own 404
 * carries {error: "unknown run_id"} — surfaced as .named when parseable). */
export declare class RunDoorError extends Error {
    readonly status: number;
    readonly named: string;
    constructor(status: number, named: string);
}
/** The runs status door path, spelled once. */
export declare function runStatusPath(runId: string): string;
/** The asset door URL for one run artifact (rel path from the status body). */
export declare function assetUrl(gateway: string, runId: string, rel: string): string;
/** Fetch one run's status body. Throws RunDoorError on non-2xx. */
export declare function fetchRunStatus(gateway: string, runId: string, signal?: AbortSignal): Promise<RunStatusBody>;
//# sourceMappingURL=gateway.d.ts.map
