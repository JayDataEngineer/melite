import type { QueueRefusal } from "./queueSubmit.js";
export type LifecycleState = "queued" | "running" | "completed" | "failed" | "stopped" | "stopping";
/** stop, unknown run (Gateway.stop 2042-2045). */
export declare function refuseUnknownStop(runId: string): QueueRefusal;
/** stop, settled run: 200 with error ONLY (no code
 *  the dispatcher normalizes 4xx alone, and this is a 200). */
export declare function refuseTerminalStop(state: string): QueueRefusal;
/** resume, live run (resume 1919-1925). */
export declare function refuseLiveResume(runId: string, liveStatus: string): QueueRefusal;
/** resume/reproduce, no durable record (1930-1932 / 2011-2014). */
export declare function refuseNoDurableRecord(runId: string): QueueRefusal;
/** resume, completed run. */
export declare function refuseCompletedResume(runId: string): QueueRefusal;
/** resume, neither failed nor stopped. */
export declare function refuseUnresumable(runId: string, status: string): QueueRefusal;
/** resume, draft gone or half-written. */
export declare function refuseUnusableRecord(runId: string): QueueRefusal;
/** reproduce, live run. */
export declare function refuseLiveReproduce(runId: string, liveStatus: string): QueueRefusal;
/** reproduce, cardless legacy row. */
export declare function refuseCardlessReplay(runId: string): QueueRefusal;
/** reproduce, request body missing. */
export declare function refuseMissingRequest(runId: string): QueueRefusal;
/** reproduce, request non-object. */
export declare function refuseNonObjectRequest(runId: string, gotType: string): QueueRefusal;
//# sourceMappingURL=queueLifecycle.d.ts.map
