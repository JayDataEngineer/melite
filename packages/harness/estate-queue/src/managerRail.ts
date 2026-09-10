// managerRail.ts — the manager rail, RE-HOMED (REBUILD-15,
// 2026-09-10): HTTP to the ComfyUI-Manager custom node, ported
// verbatim from the dead gateway's doors/manager-api.ts (killed
// with the gateway app). The vendor IS ComfyUI-Manager, built into
// the estate ComfyUI as a custom node and served on ComfyUI's OWN
// port; this rail speaks the manager's HTTP contract.
//
// THE FLAG LAW (requirement b) rides unchanged: the manager's
// security predicates read ComfyUI's listen address at startup —
// the estate pins --listen 127.0.0.1 + security_level=normal- +
// allow_git_url_install/allow_pip_install at provision; without
// them the vendor refuses with its own 403s and this rail
// surfaces them verbatim, never works around a security answer.
import type { ManageCtx } from "./managePlane.ts";

/** Thrown on any non-2xx manager answer or transport failure. The
 *  handler maps status → the estate envelope (403 security, 404
 *  unknown pack, 503 plane-unavailable). */
export class ManagerApiError extends Error {
  public status: number;
  public text: string;
  constructor(status: number, text: string) {
    super("manager api " + status + ": " + text.slice(0, 200));
    this.status = status;
    this.text = text;
  }
}

/** The manager base URL — ComfyUI's own endpoint (the endpoint
 *  config's url). Empty string means "no endpoint pinned" (the
 *  sandbox default): every rail call then refuses 503 with the
 *  plane-unavailable template. */
export function managerBase(ctx: ManageCtx): string {
  const cfg = ctx.endpoint();
  const url = typeof cfg["url"] === "string" ? (cfg["url"] as string).replace(/\/+$/, "") : "";
  return url;
}

/** Plane-unavailable template — the ONE refusal every handler
 *  raises when the manager cannot be reached (engine down, manager
 *  custom node missing, or ComfyUI started without the loopback
 *  listen). Provision sync vendors the node; the estate service
 *  pins the flag. */
export function planeUnavailable(base: string, cause: string): ManagerApiError {
  return new ManagerApiError(
    503,
    "management plane unavailable: ComfyUI-Manager not reachable at " +
      (base !== "" ? base : "<no endpoint url>") +
      " (" + cause + ") — provision sync vendors the built-in manager and the estate starts ComfyUI with --listen 127.0.0.1 (the manager's security predicate reads it at startup)",
  );
}

export interface CallOpts {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs: number;
  ctx: ManageCtx;
}

/** One manager call. JSON both ways; the response body parses as
 *  JSON when it can (the vendor mixes json_response and plain text
 *  answers — 200s are json on every route we ride, refusal bodies
 *  may be either; parse defensively). */
async function call(base: string, path: string, opts: CallOpts): Promise<unknown> {
  const ctrl = new AbortController();
  const t = opts.ctx.timeout((): void => ctrl.abort(), opts.timeoutMs);
  try {
    const r = await fetch(base + path, {
      method: opts.method ?? "GET",
      headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    const text: string = await r.text();
    if (!(r.status >= 200 && r.status < 300)) {
      throw new ManagerApiError(r.status, text);
    }
    if (text === "") return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch (e) {
    if (e instanceof ManagerApiError) throw e;
    // Transport failure (ECONNREFUSED, abort, dns): the plane is
    // down — one template, never a raw TypeError in an envelope.
    throw planeUnavailable(base, e instanceof Error ? e.message : String(e));
  } finally {
    t();
  }
}

/** GET a manager route (JSON expected). */
export function managerGet(base: string, path: string, opts: Omit<CallOpts, "method" | "body">): Promise<unknown> {
  return call(base, path, { ...opts, method: "GET" });
}

/** POST a manager route. The vendor's content-type gate
 *  (_reject_simple_form_content_type) demands proper JSON posts —
 *  this always sends application/json. */
export function managerPost(base: string, path: string, body: unknown, opts: Omit<CallOpts, "method">): Promise<unknown> {
  return call(base, path, { ...opts, method: "POST", body });
}
