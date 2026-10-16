import { deadline, timeoutOf } from "@deepseek-ai/dsh-timeout";
/** Thrown on any non-2xx manager answer or transport failure. The
 *  handler maps status → the estate envelope (403 security, 404
 *  unknown pack, 503 plane-unavailable). */
export class ManagerApiError extends Error {
    status;
    text;
    constructor(status, text) {
        super("manager api " + status + ": " + text.slice(0, 200));
        this.status = status;
        this.text = text;
    }
}
/** The manager base URL — ComfyUI's own endpoint (the endpoint
 *  config's url). Empty string means "no endpoint pinned" (the
 *  sandbox default): every rail call then refuses 503 with the
 *  plane-unavailable template. */
export function managerBase(ctx) {
    const cfg = ctx.endpoint();
    const url = typeof cfg["url"] === "string" ? cfg["url"].replace(/\/+$/, "") : "";
    return url;
}
/** Plane-unavailable template — the ONE refusal every handler
 *  raises when the manager cannot be reached (engine down, manager
 *  custom node missing, or ComfyUI started without the loopback
 *  listen). Provision sync vendors the node; the estate service
 *  pins the flag. */
export function planeUnavailable(base, cause) {
    return new ManagerApiError(503, "management plane unavailable: ComfyUI-Manager not reachable at " +
        (base !== "" ? base : "<no endpoint url>") +
        " (" + cause + ") — provision sync vendors the built-in manager and the estate starts ComfyUI with --listen 127.0.0.1 (the manager's security predicate reads it at startup)");
}
/** One manager call. JSON both ways; the response body parses as
 *  JSON when it can (the vendor mixes json_response and plain text
 *  answers — 200s are json on every route we ride, refusal bodies
 *  may be either; parse defensively). */
async function call(base, path, opts) {
    // The fuse is dsh-timeout's deadline (AbortSignal.any + a TimeoutReason
    // the classification below reads back); the 504/abort voices are ours.
    const dl = deadline(opts.ctx.signal, opts.timeoutMs, "MANAGER_API");
    try {
        const r = await fetch(base + path, {
            method: opts.method,
            headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: dl.signal,
        });
        const text = await r.text();
        if (opts.ctx.signal?.aborted === true) {
            throw new DOMException("The operation was aborted", "AbortError");
        }
        if (timeoutOf(dl.signal, "MANAGER_API"))
            throw new ManagerApiError(504, "manager request timed out");
        if (!(r.status >= 200 && r.status < 300)) {
            throw new ManagerApiError(r.status, text);
        }
        if (text === "")
            return null;
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
    catch (e) {
        if (opts.ctx.signal?.aborted === true) {
            const reason = opts.ctx.signal.reason;
            throw reason instanceof Error ? reason : new DOMException("The operation was aborted", "AbortError");
        }
        if (timeoutOf(dl.signal, "MANAGER_API"))
            throw new ManagerApiError(504, "manager request timed out");
        if (e instanceof ManagerApiError)
            throw e;
        throw planeUnavailable(base, e instanceof Error ? e.message : String(e));
    }
    finally {
        dl[Symbol.dispose]();
    }
}
/** GET a manager route (JSON expected). */
export function managerGet(base, path, opts) {
    return call(base, path, { ...opts, method: "GET" });
}
/** POST a manager route. The vendor's content-type gate
 *  (_reject_simple_form_content_type) demands proper JSON posts —
 *  this always sends application/json. */
export function managerPost(base, path, body, opts) {
    return call(base, path, { ...opts, method: "POST", body });
}
//# sourceMappingURL=managerRail.js.map
