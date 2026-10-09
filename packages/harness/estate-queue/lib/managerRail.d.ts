import type { ManageCtx } from "./managePlane.ts";
/** Thrown on any non-2xx manager answer or transport failure. The
 *  handler maps status → the estate envelope (403 security, 404
 *  unknown pack, 503 plane-unavailable). */
export declare class ManagerApiError extends Error {
    status: number;
    text: string;
    constructor(status: number, text: string);
}
/** The manager base URL — ComfyUI's own endpoint (the endpoint
 *  config's url). Empty string means "no endpoint pinned" (the
 *  sandbox default): every rail call then refuses 503 with the
 *  plane-unavailable template. */
export declare function managerBase(ctx: ManageCtx): string;
/** Plane-unavailable template — the ONE refusal every handler
 *  raises when the manager cannot be reached (engine down, manager
 *  custom node missing, or ComfyUI started without the loopback
 *  listen). Provision sync vendors the node; the estate service
 *  pins the flag. */
export declare function planeUnavailable(base: string, cause: string): ManagerApiError;
export interface CallOpts {
    method: "GET" | "POST";
    body?: unknown;
    timeoutMs: number;
    ctx: ManageCtx;
}
/** GET a manager route (JSON expected). */
export declare function managerGet(base: string, path: string, opts: Omit<CallOpts, "method" | "body">): Promise<unknown>;
/** POST a manager route. The vendor's content-type gate
 *  (_reject_simple_form_content_type) demands proper JSON posts —
 *  this always sends application/json. */
export declare function managerPost(base: string, path: string, body: unknown, opts: Omit<CallOpts, "method">): Promise<unknown>;
//# sourceMappingURL=managerRail.d.ts.map
