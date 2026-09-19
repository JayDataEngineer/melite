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
import { createWriteStream, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { endpointConfigPath, loadEndpointConfig, runtimeModelsRoot } from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { probeEndpoint, activeRuns, managerSecurity } from "./manageProbe.ts";
import { base, mapManagerRefused, mapRail, railMs, estateOnly, awaitQueueDrained, downloadIntoModelsTree, systemctl, guardLifecycle, COMFY_UNIT } from "./manageOps.ts";

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
  const data = {
    endpoint,
    manager: { ...manager, security: managerSecurity(ctx.repoRoot), unit: COMFY_UNIT },
    active_runs: active,
    routing,
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

async function hInstallExtension(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.nodes.length === 0) throw badRequest("install_extension requires: nodes");
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  // The vendor's own UI path: getlist (cache) rows matched by name,
  // queued per-pack, then the worker starts.
  let rows: Array<Record<string, unknown>>;
  try {
    const doc = (await managerGet(base(ctx), "/customnode/getlist?mode=cache", {
      ctx, timeoutMs: 30_000,
    })) as { custom_nodes?: Array<Record<string, unknown>> };
    rows = Array.isArray(doc["custom_nodes"]) ? (doc["custom_nodes"] as Array<Record<string, unknown>>) : [];
  } catch (e) {
    throw mapRail(e, req.action);
  }
  const queued: string[] = [];
  const misses: string[] = [];
  for (const want of req.nodes) {
    const w = want.toLowerCase();
    const row = rows.find((r) => {
      const title = String(r["title"] ?? "").toLowerCase();
      const cnr = String(r["cnr_id"] ?? r["id"] ?? "").toLowerCase();
      const ver = String(r["ver"] ?? "").toLowerCase();
      return title === w || cnr === w || ver === w || title.startsWith(w);
    });
    if (row === undefined) {
      misses.push(want);
      continue;
    }
    try {
      await managerPost(base(ctx), "/manager/queue/install", {
        id: row["cnr_id"] ?? row["id"] ?? row["title"],
        version: row["version"] ?? "cnr",
        selected_version: "latest",
        channel: "default",
        mode: "cache",
      }, { ctx, timeoutMs: 15_000 });
    } catch (e) {
      throw mapRail(e, req.action);
    }
    queued.push(String(row["title"] ?? want));
  }
  if (misses.length > 0 && queued.length === 0) {
    throw notFound("not found in registry cache: " + misses.join(", "));
  }
  let queue: unknown = null;
  try {
    await managerPost(base(ctx), "/manager/queue/start", {}, { ctx, timeoutMs: 10_000 });
    queue = await awaitQueueDrained(ctx, req);
  } catch (e) {
    throw mapRail(e, req.action);
  }
  const detail = "queued " + queued.length + " pack(s): " + queued.join(", ") +
    (misses.length > 0 ? "; not in cache: " + misses.join(", ") : "") +
    " — restart required to load new nodes";
  return ok(req.action, detail, { queued, misses, queue, restart_required: true });
}

async function hInstallExtensionUrl(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/customnode/install/git_url", { url: req.url }, { ctx, timeoutMs: railMs(req) });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "git-url installed " + req.url + " (restart required)", {
    restart_required: true,
  });
}

async function hDownloadModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  const dest = await downloadIntoModelsTree(ctx, {
    url: req.url,
    relative_path: req.relative_path === "" ? "checkpoints" : req.relative_path,
    filename: req.filename,
  }, railMs(req));
  return ok(req.action, "downloaded " + dest.split("/").pop() + " → " + dest, { path: dest });
}

interface CatalogRow {
  name: string;
  url: string;
  relative_path: string;
  filename?: string;
}

/** The models-plane catalog (stroke 4a, DSH-AS-LANGUAGE LAW): the
 *  SEAM is ctx.models (ModelsService, injected by the bridges door
 *  from the engine-model-catalog provider row). Estate downloads
 *  land through the same TS path as download_model — no vendor
 *  dependency, no whitelist mismatch. */
async function hProvisionModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "model");
  let rows: CatalogRow[];
  try {
    rows = ctx.models.resolveCatalogArtifact(req.model, req.variant, req.quant, ctx.repoRoot);
  } catch (e) {
    throw notFound((e as Error).message);
  }
  const done: string[] = [];
  const present: string[] = [];
  const errs: Array<{ file: string; error: string }> = [];
  for (const row of rows) {
    if (ctx.models.checkModelPresent(row.relative_path, row.name, ctx.repoRoot) !== null) {
      present.push(row.name);
      continue;
    }
    try {
      await downloadIntoModelsTree(ctx, {
        url: row.url,
        relative_path: row.relative_path,
        filename: row.filename ?? row.name,
      }, railMs(req));
      done.push(row.name);
    } catch (e) {
      errs.push({ file: row.name, error: String(e).slice(0, 200) });
    }
  }
  const parts: string[] = [];
  if (present.length > 0) parts.push("present: " + present.length);
  if (done.length > 0) parts.push("downloaded: " + done.join(", "));
  let detail = parts.length > 0 ? parts.join("; ") : "no files landed";
  if (errs.length > 0) detail += "; errors: " + errs.length;
  const code = done.length > 0 || present.length > 0 ? 200 : 500;
  return [
    code,
    {
      action: req.action,
      ok: done.length > 0 || present.length > 0,
      detail,
      data: { model: req.model, files: done, present, errors: errs.length > 0 ? errs : null },
    },
  ];
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
