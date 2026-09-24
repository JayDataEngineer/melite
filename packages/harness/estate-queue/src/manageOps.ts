// manageOps.ts — the manage plane's rails (extracted from
// managePlane.ts, the god-file cut): the vendor manager rail +
// refusals folding, estate model downloads, and the systemd
// lifecycle verbs.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { activeRuns } from "./manageProbe.ts";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { Refused } from "./managePlane.ts";
import type { ManageCtx, ManageEnvelope, Req } from "./managePlane.ts";

// ── the manager rail (vendor HTTP — see manager-api.ts) ────────────
export function base(ctx: ManageCtx): string {
  return managerBase(ctx);
}

/** Map a manager refusal to the estate envelope (the vendor's own
 *  security texts ride verbatim — this door never reinterprets a
 *  security answer). */
export function mapManagerRefused(e: ManagerApiError, action: string): Refused {
  if (e.status === 503) return new Refused(503, e.text, undefined);
  if (e.status === 403) {
    return new Refused(
      403,
      "manager refused " + action + " (security_level or the loopback listen flag): " + e.text.slice(0, 200),
    );
  }
  if (e.status === 404) return new Refused(404, "manager has no such target: " + e.text.slice(0, 200));
  return new Refused(502, "manager api error " + e.status + ": " + e.text.slice(0, 200));
}

/** Map a rail failure to its refusal: the rail throws ManagerApiError
 *  by contract (refusals verbatim, transports as the 503 template),
 *  so the fallthrough only guards the type, never a live error. */
export function mapRail(e: unknown, action: string): Refused {
  if (e instanceof ManagerApiError) return mapManagerRefused(e, action);
  /* v8 ignore next -- the rail's ManagerApiError-only contract
     (2026-09-12) */
  throw e;
}

export function railMs(req: Req): number {
  return Math.min(Math.max(req.timeout_seconds, 1), 850) * 1000;
}

/** Poll the vendor's task queue until drained (install arms: the
 *  vendor returns 202-semantics — queue accepted — and processes
 *  asynchronously; the poll bounds the AI door's wait). */
export async function awaitQueueDrained(ctx: ManageCtx, req: Req): Promise<Record<string, unknown>> {
  const deadline = Date.now() + railMs(req);
  for (;;) {
    const st = (await managerGet(base(ctx), "/manager/queue/status", {
      ctx, timeoutMs: 10_000,
    })) as Record<string, unknown>;
    const processing = st["is_processing"] === true;
    const pending = Number(st["in_progress_count"] ?? 0) + Number(st["total_count"] ?? 0) - Number(st["done_count"] ?? 0);
    if (!processing && pending <= 0) return st;
    if (Date.now() >= deadline) return st;
    await new Promise<void>((res) => {
      const t = ctx.timeout((): void => res(), 1000);
      void t;
    });
  }
}

/** BYO guard: estate-orchestration legs (systemd, workspace reads)
 *  never touch a user-owned ComfyUI. */
export function estateOnly(req: Req, cfg: Record<string, unknown>): void {
  if (cfg["provision"] === "managed") return;
  throw new Refused(
    409,
    "byo endpoint: " + req.action + " orchestrates the estate engine — the estate never touches a user-owned ComfyUI",
  );
}

// ── systemd orchestration (estate deployment — TS-native) ──────────
export const COMFY_UNIT = process.env["MELITE_COMFYUI_UNIT"] ?? "melite-comfyui.service";

export function systemctl(req: Req, verb: "start" | "stop"): [number, ManageEnvelope] {
  const out = spawnSync("systemctl", ["--user", verb, COMFY_UNIT], {
    timeout: 30 * 1000,
    encoding: "utf8",
  });
  if (out.error !== undefined || out.status !== 0) {
    // (stderr is "" (not nullish) on a clean spawn, so the last
    // fallback only guards the type — spawn failures always carry
    // one of the first two)
    const why = String(out.stderr ?? out.error?.message).trim().slice(0, 200);
    return [500, { action: req.action, ok: false, detail: "systemctl " + verb + " " + COMFY_UNIT + " failed: " + why }];
  }
  return [200, { action: req.action, ok: true, detail: verb + " issued for " + COMFY_UNIT }];
}

export function guardLifecycle(req: Req, ctx: ManageCtx): void {
  if (req.force) return;
  const active = activeRuns(ctx.repoRoot);
  if (active.length > 0) {
    throw new Refused(
      409,
      "refused: " + active.length + " active run(s) (" + active.slice(0, 4).join(", ") +
        ") — stop them first (the stop door) or pass force=true",
    );
  }
}
