// managePlane.ts — the management plane, RE-HOMED (REBUILD-15,
// 2026-09-10): the dead gateway's doors/manage.ts (killed with the
// gateway app) ports here BESIDE the runs/disclose seats — the
// vocabulary (ACTIONS, HANDLERS rows, LIFECYCLE_GUARDED) stays the
// SSOT the walls scan. Wire contract unchanged: the envelope is
// always {action, ok, detail, data}.
//
// This module is the PURE plane (dispatchManage + ManageCtx); the
// seat (manageRegistry.ts) assembles the ctx from the estate's own
// seats and answers the tools' /v1/manage lane.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { endpointConfigPath, loadEndpointConfig } from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";
import type {
  ProvisionResult,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
} from "@melite/estate-provisioning";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { probeEndpoint, activeRuns, managerSecurity } from "./manageProbe.ts";
import { base, mapManagerRefused, mapRail, railMs, estateOnly, awaitQueueDrained, systemctl, guardLifecycle, COMFY_UNIT } from "./manageOps.ts";

// ── SSOT vocabulary ─────────────────────────────────────────────────
// Closed vocabulary — a typo is a 422, not a silent miss.
export const ACTIONS = [
  "status",
  "endpoint_set",
  "logs",
  "search_models",
  "list_extensions",
  "snapshot_list",
  "install_extension",
  "install_extension_url",
  "download_model",
  "provision_model",
  "restart",
  "stop",
  "launch",
  "update",
  "switch_version",
  "free",
  "snapshot_save",
  "snapshot_restore",
] as const;

export type ManageAction = (typeof ACTIONS)[number];

/** The status reconcile bound (the wall law — see hStatus): status
 *  answers inside the plane's 5s wall; the digest-verifying
 *  reconcile cannot, so it rides this bound and reports partial.
 *  1.5s (not 3s): the wall's 5s covers bundle-mount + seat settle
 *  too — under battery load the settle alone eats ~2s, so the
 *  reconcile must leave headroom (the flake law). */
const STATUS_RECONCILE_MS = 1_500;

// Lifecycle actions that would kill a live GPU job — guarded
// (INFERENCE LAW: management never manufactures zombie runs; the stop
// DOOR is the sanctioned way a run dies).
export const LIFECYCLE_GUARDED: ReadonlySet<ManageAction> = new Set([
  "restart",
  "stop",
  "switch_version",
  "update",
  "snapshot_restore",
]);

export interface ManageEnvelope {
  action: string;
  ok: boolean;
  detail: string;
  data?: unknown;
}

export interface ManageCtx {
  /** File-anchored repo root (routing, catalog, runs scan anchor). */
  repoRoot: string;
  /** The endpoint config, re-read per call (fresh — never cached
   *  between calls): carries the engine url the manager rail rides.
   *  The bridges door passes loadEndpointConfig itself. */
  endpoint: () => Record<string, unknown>;
  /** The models catalog (stroke 4a: injected by the bridges door
   *  from the engine-model-catalog provider row — required, never
   *  optional: a door without its catalog is a miswire, and the
   *  type error at the construction site is the loudest refusal). */
  models: ModelsService;
  provisioning: ProvisioningServiceDefinition;
  /** The timer-service seat (ctx.timeout from the door's Cordis
   *  context — cordis-plugin-timer): REQUIRED so a library caller
   *  can never silently fall back to a bare setTimeout (the
   *  conformance stroke 2026-09-10). */
  timeout: (callback: () => void, delay: number) => () => void;
}

export interface Req {
  action: ManageAction;
  nodes: string[];
  url: string;
  relative_path: string;
  filename: string;
  wait: boolean | null;
  timeout_seconds: number;
  model: string;
  variant: string;
  quant: string;
  tail: number;
  query: string;
  version: string;
  target: string;
  extra_args: string[];
  force: boolean;
  snapshot: string;
}

type Handler = (req: Req, ctx: ManageCtx) => Promise<[number, ManageEnvelope]>;

// ── errors (the dispatch maps classes to codes, as before) ─────────
export class Refused extends Error {
  public data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
  public code: number;
}
export const badRequest = (m: string): Refused => new Refused(422, m);
const notFound = (m: string): Refused => new Refused(404, m);
const unavailable = (m: string): Refused => new Refused(503, m);

export function parseReq(doc: unknown): Req {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    throw badRequest("Input should be a valid dictionary");
  }
  const d = doc as Record<string, unknown>;
  const action = String(d["action"] ?? "");
  if (action === "") throw badRequest("Field required: action");
  if (!(ACTIONS as readonly string[]).includes(action)) {
    throw badRequest("Input should be one of: " + ACTIONS.join(", "));
  }
  const str = (k: string): string => (typeof d[k] === "string" ? (d[k] as string) : "");
  const num = (k: string, def: number): number => {
    const v = d[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return def;
    return v;
  };
  return {
    action: action as ManageAction,
    nodes: Array.isArray(d["nodes"]) ? (d["nodes"] as unknown[]).map(String).filter((s) => s !== "") : [],
    url: str("url"),
    relative_path: str("relative_path"),
    filename: str("filename"),
    wait: typeof d["wait"] === "boolean" ? (d["wait"] as boolean) : null,
    timeout_seconds: num("timeout_seconds", 300),
    model: str("model"),
    variant: str("variant"),
    quant: str("quant"),
    tail: num("tail", 200),
    query: str("query"),
    version: str("version"),
    target: str("target") || "comfy",
    extra_args: Array.isArray(d["extra_args"]) ? (d["extra_args"] as unknown[]).map(String) : [],
    force: d["force"] === true,
    snapshot: str("snapshot"),
  };
}

function need(req: Req, ...fields: string[]): void {
  const missing = fields.filter((f: string) => {
    const v: unknown = (req as unknown as Record<string, unknown>)[f];
    // (no caller gates an array field today — all needs are strings)
    return Array.isArray(v) ? /* v8 ignore next */ v.length === 0 : v === "";
  });
  if (missing.length > 0) throw badRequest(req.action + " requires: " + missing.join(", "));
}


function ok(action: string, detail: string, data?: unknown): [number, ManageEnvelope] {
  return [200, { action, ok: true, detail, data }];
}

// ── handlers ────────────────────────────────────────────────────────
async function hStatus(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  const endpoint = await probeEndpoint(ctx);
  const active = activeRuns(ctx.repoRoot);
  const routing = { mode: cfg["provision"] === "managed" ? "managed" : "byo" };
  let manager: Record<string, unknown> = {};
  if (endpoint.reachable) {
    try {
      const version = await managerGet(base(ctx), "/manager/version", { ctx, timeoutMs: 5000 });
      const queue = await managerGet(base(ctx), "/manager/queue/status", { ctx, timeoutMs: 5000 });
      manager = { version, queue };
    } catch (e) {
      // (the rail throws ManagerApiError — an Error — by contract)
      manager = { reachable: false, reason: e instanceof Error ? e.message.slice(0, 160) : /* v8 ignore next */ String(e) };
    }
  } else {
    manager = { reachable: false, reason: "endpoint not reachable" };
  }
  let resources: ResourceStatus[] = [];
  let resourcesDetail: string | undefined;
  try {
    // THE STATUS BOUND (the wall law): status answers in seconds, but
    // a full reconcile verifies GB-scale digests sequentially — unbounded
    // it can never fit the plane's 5s wall. Bound the status reconcile
    // at 3s; the abort threads into per-chunk hash checks and the loop's
    // between-row check, so settled rows ride `resources` and the
    // remainder rides `resources_detail` (loud partial, never silent).
    resources = await withManageTimeout(
      req,
      ctx,
      (signal) => ctx.provisioning.reconcile(undefined, signal),
      STATUS_RECONCILE_MS,
    );
  } catch (error: unknown) {
    resourcesDetail = error instanceof Error ? error.message : String(error);
  }
  const data = {
    endpoint,
    manager: { ...manager, security: managerSecurity(ctx.repoRoot), unit: COMFY_UNIT },
    active_runs: active,
    routing,
    resources,
    ...(resourcesDetail === undefined ? {} : { resources_detail: resourcesDetail }),
  };
  if (endpoint.reachable) return ok(req.action, "server up", data);
  return ok(req.action, "server not reachable", data);
}

async function hLogs(req: Req, _ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const tail = Math.max(1, Math.min(Math.trunc(req.tail), 2000));
  const out = spawnSync("journalctl", ["--user", "-u", COMFY_UNIT, "-n", String(tail), "--no-pager", "-o", "cat"], {
    timeout: 15 * 1000,
    encoding: "utf8",
  });
  if (out.error !== undefined) {
    throw unavailable(
      "logs need the estate deployment's journal (unit " + COMFY_UNIT + "): " +
        String(out.error.message).slice(0, 120),
    );
  }
  // (encoding utf8 always serves a string — the fallback guards the type)
  const text = typeof out.stdout === "string" ? out.stdout : /* v8 ignore next */ "";
  const lines = text.split("\n").filter((ln) => ln !== "");
  return ok(req.action, lines.length + " log line(s) from " + COMFY_UNIT, lines);
}

async function hSearch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "query");
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  let doc: unknown;
  try {
    doc = await managerGet(base(ctx), "/externalmodel/getlist?mode=cache", { ctx, timeoutMs: railMs(req) });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  const models = (doc as { models?: unknown[] })["models"] ?? [];
  const q = req.query.toLowerCase();
  const hits = (models as Array<Record<string, unknown>>).filter((m) => {
    const hay = [m["name"], m["type"], m["base"], m["filename"]].map((v) => String(v ?? "").toLowerCase()).join(" ");
    return hay.includes(q);
  }).slice(0, 50);
  return ok(req.action, hits.length + " hit(s) for '" + req.query + "'", hits);
}

async function withManageTimeout<T>(
  req: Req,
  ctx: ManageCtx,
  work: (signal: AbortSignal) => Promise<T>,
  boundMs: number = railMs(req),
): Promise<T> {
  const controller = new AbortController();
  const cancel = ctx.timeout(() => controller.abort(), boundMs);
  try {
    return await work(controller.signal);
  } finally {
    cancel();
  }
}

function externalModelPath(req: Req): { readonly relativePath: string; readonly filename: string } {
  const rawFolder = req.relative_path.startsWith("models/")
    ? req.relative_path.slice("models/".length)
    : req.relative_path === "" ? "checkpoints" : req.relative_path;
  const folder = rawFolder === "models" ? "" : rawFolder;
  if (folder.includes("..") || folder.startsWith("/")) {
    throw badRequest("relative_path must stay under the models root: " + req.relative_path);
  }
  const filename = req.filename !== "" ? req.filename : req.url.split("/").pop() ?? "";
  if (filename === "" || filename.includes("/") || filename.includes("..")) {
    throw badRequest("filename must be a bare name under the models root");
  }
  return { relativePath: folder, filename };
}

function safeProvisionItems(result: ProvisionResult): Array<Record<string, unknown>> {
  return result.items.map((item) => ({
    key: item.key,
    kind: item.kind,
    state: item.state,
    ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
    ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
    ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
    ...(item.detail === undefined ? {} : { detail: item.detail }),
  }));
}

function provisionEnvelope(
  action: string,
  result: ProvisionResult,
  extra: Record<string, unknown> = {},
): [number, ManageEnvelope] {
  const success = result.state === "active" || result.state === "restart_required";
  const code = success ? 200 : result.state === "blocked" || result.state === "cancelled" ? 409 : 500;
  const detail = result.detail ?? `${result.state} (${result.items.length} item(s))`;
  const errors = result.items
    .filter((item) => item.errorCode !== undefined)
    .map((item) => ({ file: item.key, error: item.detail ?? item.errorCode ?? "failed" }));
  return [
    code,
    {
      action,
      ok: success,
      detail,
      data: {
        ...extra,
        operation_id: result.operationId,
        state: result.state,
        items: safeProvisionItems(result),
        restart_required: result.restartRequired,
        ...(errors.length === 0 ? {} : { errors }),
      },
    },
  ];
}

function mergeProvisionResults(results: readonly ProvisionResult[]): {
  readonly state: ProvisionResult["state"];
  readonly operationId: string;
  readonly items: ProvisionResult["items"];
  readonly restartRequired: boolean;
  readonly detail?: string;
} {
  const items = results.flatMap((result) => result.items);
  const state = results.every((result) => result.state === "active")
    ? "active"
    : results.every((result) => result.state === "restart_required")
      ? "restart_required"
      : results.some((result) => result.state === "active" || result.state === "restart_required")
        ? "partial"
        : results.every((result) => result.state === "blocked")
          ? "blocked"
          : results.some((result) => result.state === "cancelled")
            ? "cancelled"
            : "failed";
  return {
    state,
    operationId: results[0]?.operationId ?? "none",
    items,
    restartRequired: results.some((result) => result.restartRequired),
  };
}

async function hInstallExtension(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.nodes.length === 0) throw badRequest("install_extension requires: nodes");
  estateOnly(req, ctx.endpoint());
  return await withManageTimeout(req, ctx, async (signal) => {
    const results: ProvisionResult[] = [];
    const misses: string[] = [];
    for (const node of req.nodes) {
      const ref: ResourceRef = { kind: "extension", id: node };
      try {
        await ctx.provisioning.plan(ref);
        results.push(await ctx.provisioning.ensure(ref, undefined, signal));
      } catch (error: unknown) {
        misses.push(node + ": " + (error instanceof Error ? error.message : String(error)));
      }
    }
    if (results.length === 0) throw notFound("extension is not declared: " + misses.join(", "));
    const merged = mergeProvisionResults(results);
    const result: ProvisionResult = {
      operationId: merged.operationId,
      ref: { kind: "extension", id: req.nodes.join(",") },
      state: merged.state,
      outcome: merged.state,
      operationState: merged.state === "partial"
        ? "installed"
        : merged.state === "cancelled"
          ? "failed"
          : merged.state,
      items: merged.items,
      restartRequired: merged.restartRequired,
    };
    return provisionEnvelope(req.action, result, {
      queued: merged.items.filter((item) => item.state === "restart_required" || item.state === "active").map((item) => item.key),
      misses,
    });
  });
}

async function hInstallExtensionUrl(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  estateOnly(req, ctx.endpoint());
  const result = await withManageTimeout(req, ctx, (signal) =>
    ctx.provisioning.acquireExternal(
      { kind: "extension", url: req.url },
      { operatorConfirmed: true },
      signal,
    ));
  return provisionEnvelope(req.action, result);
}

async function hDownloadModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  estateOnly(req, ctx.endpoint());
  const path = externalModelPath(req);
  const result = await withManageTimeout(req, ctx, (signal) =>
    ctx.provisioning.acquireExternal(
      {
        kind: "model",
        url: req.url,
        relativePath: path.relativePath,
        filename: path.filename,
      },
      { operatorConfirmed: true },
      signal,
    ));
  return provisionEnvelope(req.action, result);
}

async function hProvisionModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "model");
  estateOnly(req, ctx.endpoint());
  return await withManageTimeout(req, ctx, async (signal) => {
    const family: ResourceRef = {
      kind: "model",
      owner: "family",
      id: req.model,
      ...(req.variant === "" ? {} : { variant: req.variant }),
      ...(req.quant === "" ? {} : { quant: req.quant }),
    };
    let ref = family;
    try {
      await ctx.provisioning.plan(family);
    } catch (error: unknown) {
      ref = {
        kind: "model",
        owner: "card",
        id: req.model,
        ...(req.variant === "" ? {} : { variant: req.variant }),
        ...(req.quant === "" ? {} : { quant: req.quant }),
      };
      try {
        await ctx.provisioning.plan(ref);
      } catch {
        throw notFound(error instanceof Error ? error.message : String(error));
      }
    }
    const result = await ctx.provisioning.ensure(ref, undefined, signal);
    return provisionEnvelope(req.action, result, {
      model: req.model,
      files: result.items.filter((item) => item.state === "active").map((item) => item.key),
      present: result.items.filter((item) => item.state === "active").map((item) => item.key),
    });
  });
}

async function hRestart(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/manager/reboot", {}, { ctx, timeoutMs: 10_000 });
    return ok(req.action, "reboot issued (systemd re-spawns the engine)", null);
  } catch (e) {
    if (e instanceof ManagerApiError && e.status === 503) {
      // The vendor reboots by exiting: the connection can drop after
      // the 200 is sent — same honest answer.
      if (/fetch failed|aborted|ECONNRESET|socket/i.test(e.text)) {
        return ok(req.action, "reboot issued (connection closed by restart)", null);
      }
      throw mapManagerRefused(e, req.action);
    }
    throw mapRail(e, req.action);
  }
}

async function hStop(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  estateOnly(req, ctx.endpoint());
  return systemctl(req, "stop");
}

async function hLaunch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  estateOnly(req, ctx.endpoint());
  return systemctl(req, "start");
}

async function hUpdate(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.target !== "comfy") {
    throw badRequest("update target must be comfy — comfy-cli is retired (the built-in manager updates ComfyUI)");
  }
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/manager/queue/update_comfyui", {}, { ctx, timeoutMs: 10_000 });
    await managerPost(base(ctx), "/manager/queue/start", {}, { ctx, timeoutMs: 10_000 });
    const queue = await awaitQueueDrained(ctx, req);
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "update(comfy) queued through the manager", null);
}

async function hSwitchVersion(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "version");
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    const doc = (await managerGet(base(ctx), "/comfyui_manager/comfyui_versions", {
      ctx, timeoutMs: 30_000,
    })) as { versions?: unknown[] };
    const versions = (doc["versions"] ?? []).map((v) => String(v));
    if (!versions.includes(req.version)) {
      throw notFound("version " + req.version + " not available (have: " + versions.slice(0, 6).join(", ") + "…)");
    }
    await managerPost(base(ctx), "/comfyui_manager/comfyui_switch_version", { ver: req.version }, {
      ctx, timeoutMs: railMs(req),
    });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "switch to " + req.version + " issued (restart required)", { restart_required: true });
}

async function hFree(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const b = base(ctx);
  if (b === "") throw planeUnavailable(b, "no endpoint url");
  try {
    await managerPost(b, "/free", { unload_models: true, free_memory: true }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "free issued (next worker iteration)", null);
}

// ── endpoint_set: the operator's server URL change ────────────────
// Validates FIRST (a live /system_stats probe — an unreachable URL
// is refused, never written), then rewrites ONLY `url` in the
// endpoint config, preserving every other field. Works in managed
// AND byo modes (pointing elsewhere is not provisioning).
async function hEndpointSet(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  const url = req.url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[A-Za-z0-9.\-]+(:\d+)?(\/.*)?$/.test(url)) {
    throw new Refused(400, "endpoint_set: url must be http(s)://host[:port] — got '" + url + "'");
  }
  // Probe the candidate BEFORE writing (no unreachable URL ever
  // lands in the config; the old URL keeps serving on refusal).
  const ctrl = new AbortController();
  const clear = ctx.timeout((): void => ctrl.abort(), 5000);
  let stats: Record<string, unknown>;
  try {
    const r = await fetch(url + "/system_stats", { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + String(r.status));
    stats = (await r.json()) as Record<string, unknown>;
  } catch (e: unknown) {
    throw new Refused(
      502,
      "endpoint_set: '" + url + "' did not answer /system_stats (" +
        (e instanceof Error ? e.message : String(e)) + ") — the endpoint is unchanged",
    );
  } finally {
    clear();
  }
  const cfgPath = endpointConfigPath();
  const cfg = { ...loadEndpointConfig() } as Record<string, unknown>;
  cfg["url"] = url;
  try {
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  } catch (e: unknown) {
    // writeFileSync throws SystemError (an Error) only — the narrow is the law.
    throw new Refused(
      500,
      "endpoint_set: config write failed (" + (e as Error).message + ") — the endpoint is unchanged",
    );
  }
  const sys = (stats["system"] ?? {}) as Record<string, unknown>;
  return ok(req.action, "endpoint set to " + url + " (ComfyUI " + String(sys["comfyui_version"] ?? "?") + " answered)", { url, comfyui_version: sys["comfyui_version"] ?? null });
}

async function hListExtensions(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  let doc: unknown;
  try {
    doc = await managerGet(base(ctx), "/customnode/installed", { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  const packs = (doc ?? {}) as Record<string, unknown>;
  const rows = Object.entries(packs).map(([name, v]) => ({
    name,
    version: (v as Record<string, unknown>)["version"] ?? (v as Record<string, unknown>)["ver"] ?? "?",
  }));
  return ok(req.action, rows.length + " installed pack(s)", rows);
}

async function hSnapshotList(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  let doc: unknown;
  try {
    doc = await managerGet(base(ctx), "/snapshot/getlist", { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  const items = ((doc as { items?: unknown[] })["items"] ?? []).map(String);
  return ok(req.action, items.length + " snapshot(s)", items);
}

async function hSnapshotSave(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/snapshot/save", {}, { ctx, timeoutMs: railMs(req) });
    const doc = (await managerGet(base(ctx), "/snapshot/getlist", { ctx, timeoutMs: 15_000 })) as { items?: string[] };
    const name = (doc["items"] ?? [])[0] ?? "?";
    return ok(req.action, "snapshot saved: " + name, { snapshot: name });
  } catch (e) {
    throw mapRail(e, req.action);
  }
}

async function hSnapshotRestore(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "snapshot");
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/snapshot/restore", { target: req.snapshot }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "restore of " + req.snapshot + " scheduled (restart required)", {
    restart_required: true,
  });
}

// ── handler table (wall-scanned rows) ───────────────────────────────
const HANDLERS: Record<ManageAction, Handler> = {
  status: hStatus,
  logs: hLogs,
  search_models: hSearch,
  endpoint_set: hEndpointSet,
  list_extensions: hListExtensions,
  snapshot_list: hSnapshotList,
  install_extension: hInstallExtension,
  install_extension_url: hInstallExtensionUrl,
  download_model: hDownloadModel,
  provision_model: hProvisionModel,
  restart: hRestart,
  stop: hStop,
  launch: hLaunch,
  update: hUpdate,
  switch_version: hSwitchVersion,
  free: hFree,
  snapshot_save: hSnapshotSave,
  snapshot_restore: hSnapshotRestore,
};

/** The one entry the door calls: (status, response-envelope). Error
 *  mapping mirrors the old dispatch: bad request 422, catalog miss
 *  404, plane missing 503, everything else 500. */
export async function dispatchManage(doc: unknown, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  let req: Req;
  try {
    req = parseReq(doc);
  } catch (e) {
    // parseReq throws badRequest (Refused) only — the narrow is the law.
    const r = e as Refused;
    const action = doc !== null && typeof doc === "object" && !Array.isArray(doc)
      ? String((doc as Record<string, unknown>)["action"] ?? "?")
      : "?";
    return [r.code, { action, ok: false, detail: r.message }];
  }
  try {
    return await HANDLERS[req.action](req, ctx);
  } catch (e) {
    if (e instanceof Refused) {
      return [e.code, { action: req.action, ok: false, detail: e.message, data: e.data }];
    }
    // A rail error escaping its handler (e.g. the pre-try plane
    // probe in hFree) softens through the same map — the envelope
    // is always the answer, never a host traceback.
    if (e instanceof ManagerApiError) {
      const refused = mapManagerRefused(e, req.action);
      return [refused.code, { action: req.action, ok: false, detail: refused.message }];
    }
    const msg = e instanceof Error ? e.constructor.name + ": " + e.message : String(e);
    return [500, { action: req.action, ok: false, detail: msg.slice(0, 300) }];
  }
}
