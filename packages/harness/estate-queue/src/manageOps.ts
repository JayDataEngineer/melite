// manageOps.ts — the manage plane's rails (extracted from
// managePlane.ts, the god-file cut): the vendor manager rail +
// refusals folding, estate model downloads, and the systemd
// lifecycle verbs.
import { spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { runtimeModelsRoot } from "@melite/comfyui-cordis";
import { activeRuns } from "./manageProbe.ts";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { Refused, badRequest } from "./managePlane.ts";
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

// ── estate model downloads (TS-native — no vendor on this path) ────
/** Download one model file into the runtime models tree. Direct
 *  URLs are ESTATE truth (the catalog carries them); the vendor's
 *  model plane is whitelist-only for registered models — a
 *  mismatched dependency was the old comfy-mcp's job, not ours. */
export async function downloadIntoModelsTree(
  ctx: ManageCtx,
  row: { url: string; relative_path: string; filename: string },
  timeoutMs: number,
): Promise<string> {
  /* v8 ignore next -- need(url) pre-empts upstream (both callers
     gate it): the recheck never fires (2026-09-12) */
  if (row.url === "") throw badRequest("download requires: url");
  const folder = row.relative_path.startsWith("models/")
    ? row.relative_path.slice("models/".length)
    : row.relative_path;
  if (folder.includes("..") || folder.startsWith("/")) {
    throw badRequest("relative_path must stay under the models root: " + row.relative_path);
  }
  // (split never yields [] — pop is always a string here)
  const name = row.filename !== "" ? row.filename : (row.url.split("/").pop() as string);
  if (name === "" || name.includes("/") || name.includes("..")) {
    throw badRequest("filename must be a bare name under the models root");
  }
  const dir = join(runtimeModelsRoot(ctx.repoRoot), folder);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, name);
  const ctrl = new AbortController();
  const t = ctx.timeout((): void => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(row.url, { signal: ctrl.signal });
    if (!(r.status >= 200 && r.status < 300)) {
      throw new Refused(502, "download refused: HTTP " + r.status + " for " + row.url);
    }
    if (r.body === null) throw new Refused(502, "download returned no body: " + row.url);
    await pipeline(Readable.fromWeb(r.body as never), createWriteStream(dest));
    return dest;
  } catch (e) {
    if (e instanceof Refused) throw e;
    throw new Refused(502, "download failed: " + (e instanceof Error ? e.message : String(e)).slice(0, 200));
  } finally {
    t();
  }
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
