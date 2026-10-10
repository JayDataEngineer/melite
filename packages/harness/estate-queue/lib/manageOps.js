// manageOps.ts — the manage plane's rails (extracted from
// managePlane.ts, the god-file cut): the vendor manager rail +
// refusals folding, estate model downloads, and the systemd
// lifecycle verbs.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { activeRuns } from "./manageProbe.js";
import { ManagerApiError, managerBase, managerGet } from "./managerRail.js";
import { Refused } from "./managePlane.js";
const execFileAsync = promisify(execFile);
// ── the manager rail (vendor HTTP — see manager-api.ts) ────────────
export function base(ctx) {
    return managerBase(ctx);
}
/** Map a manager refusal to the estate envelope (the vendor's own
 *  security texts ride verbatim — this door never reinterprets a
 *  security answer). */
export function mapManagerRefused(e, action) {
    if (e.status === 503)
        return new Refused(503, e.text, undefined);
    if (e.status === 403) {
        return new Refused(403, "manager refused " + action + " (security_level or the loopback listen flag): " + e.text.slice(0, 200));
    }
    if (e.status === 404)
        return new Refused(404, "manager has no such target: " + e.text.slice(0, 200));
    if (e.status === 504)
        return new Refused(504, "manager request timed out: " + e.text.slice(0, 200));
    return new Refused(502, "manager api error " + e.status + ": " + e.text.slice(0, 200));
}
/** Map a rail failure to its refusal: the rail throws ManagerApiError
 *  by contract (refusals verbatim, transports as the 503 template),
 *  so the fallthrough only guards the type, never a live error. */
export function mapRail(e, action) {
    if (e instanceof ManagerApiError)
        return mapManagerRefused(e, action);
    /* v8 ignore next -- the rail's ManagerApiError-only contract
       (2026-09-12) */
    throw e;
}
export function railMs(req) {
    return Math.min(Math.max(req.timeout_seconds, 1), 850) * 1000;
}
/** Poll the vendor's task queue until drained (install arms: the
 *  vendor returns 202-semantics — queue accepted — and processes
 *  asynchronously; the poll bounds the AI door's wait). */
function abortReason(signal) {
    return signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted", "AbortError");
}
export async function awaitQueueDrained(ctx, req) {
    const deadline = Date.now() + railMs(req);
    for (;;) {
        if (ctx.signal?.aborted === true)
            throw abortReason(ctx.signal);
        if (Date.now() >= deadline)
            return { timed_out: true };
        let st;
        try {
            st = await managerGet(base(ctx), "/manager/queue/status", {
                ctx, timeoutMs: Math.min(10_000, Math.max(1, deadline - Date.now())),
            });
        }
        catch (error) {
            if (Date.now() >= deadline)
                return { timed_out: true };
            throw error;
        }
        const processing = st["is_processing"] === true;
        const pending = Number(st["in_progress_count"] ?? 0) + Number(st["total_count"] ?? 0) - Number(st["done_count"] ?? 0);
        if (!processing && pending <= 0)
            return st;
        if (Date.now() >= deadline)
            return { ...st, timed_out: true };
        await waitForQueuePoll(ctx);
    }
}
function waitForQueuePoll(ctx) {
    const signal = ctx.signal;
    if (signal?.aborted === true)
        return Promise.reject(abortReason(signal));
    return new Promise((resolvePromise, rejectPromise) => {
        // The seat IS the timer (ManageCtx.timeout, the conformance
        // stroke's no-bare-setTimeout guarantee): the poll waits on
        // ctx.timeout and races the door's signal. No settled-flag dance
        // -- a promise settles once, so the guard the wrapper carried
        // was unreachable; the post-registration re-check closes the
        // race where the signal aborts between the check above and the
        // listener landing.
        const dispose = ctx.timeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolvePromise();
        }, 1000);
        const onAbort = () => {
            dispose();
            rejectPromise(abortReason(signal));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        if (signal?.aborted === true)
            onAbort();
    });
}
/** BYO guard: estate-orchestration legs (systemd, workspace reads)
 *  never touch a user-owned ComfyUI. */
export function estateOnly(req, cfg) {
    if (cfg["provision"] === "managed")
        return;
    throw new Refused(409, "byo endpoint: " + req.action + " orchestrates the estate engine — the estate never touches a user-owned ComfyUI");
}
// ── systemd orchestration (estate deployment — TS-native) ──────────
// V7 cure (2026-10-18): the unit name rode an import-time env capture
// frozen before any plugin loads; it is now the manage provider's
// config field, resolved per mount.
/** Run systemctl for the estate's engine unit.
 * @param req - the manage request (envelope rows).
 * @param verb - the systemctl verb to run.
 * @param unit - the estate deployment's systemd unit (config-pinned).
 * @param signal - aborts the child and maps to the abort reason.
 * @returns [status, envelope] as the manage lane's answer.
 */
export async function systemctl(req, verb, unit, signal) {
    try {
        await execFileAsync("systemctl", ["--user", verb, unit], {
            timeout: 30 * 1000,
            encoding: "utf8",
            signal,
        });
    }
    catch (error) {
        if (signal?.aborted === true)
            throw abortReason(signal);
        const value = error;
        const why = String(value.stderr ?? value.message).trim().slice(0, 200);
        return [500, { action: req.action, ok: false, detail: "systemctl " + verb + " " + unit + " failed: " + why }];
    }
    return [200, {
            action: req.action,
            ok: true,
            detail: verb + " issued for " + unit,
            next_action: verb === "stop" ? "launch" : "status",
            data: { next_action: verb === "stop" ? "launch" : "status" },
        }];
}
export function guardLifecycle(req, ctx) {
    if (req.force)
        return;
    const active = activeRuns(ctx.stateRoots);
    if (active.length > 0) {
        throw new Refused(409, "refused: " + active.length + " active run(s) (" + active.slice(0, 4).join(", ") +
            ") — stop them first (the stop door) or pass force=true");
    }
}
//# sourceMappingURL=manageOps.js.map