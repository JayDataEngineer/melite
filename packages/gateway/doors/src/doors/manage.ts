/** The manage door (POST /v1/manage) — Cordis-native, zero external Python.
 *
 * NO EXTERNAL PYTHON (the requirements stroke, 2026-09-10): the ONE
 * vendor is ComfyUI-Manager, built into the estate ComfyUI as a
 * custom node (auto-vendored by provision sync) and served on
 * ComfyUI's own port — the same HTTP contract its web UI speaks.
 * The comfy-mcp binary, the cm_cli spawns, and the comfy-cli routing
 * (COMFY_BIN/set-default) are DEAD. Estate-native legs (model
 * downloads into the runtime tree, systemd stop/launch, journal
 * logs, the status probe, the active-run guard) are plain TS.
 *
 * THE FLAG LAW: the manager's security predicates read ComfyUI's
 * listen address at startup. The estate starts the engine with
 * --listen 127.0.0.1 and pins user/__manager/config.ini
 * (security_level=normal-, allow_git_url_install=true,
 * allow_pip_install=true) at provision. Without the flag the vendor
 * refuses installs with its own 403s; this door surfaces them
 * verbatim and never works around a security answer.
 *
 * This module stays the SSOT vocabulary (ACTIONS array, HANDLERS
 * rows, LIFECYCLE_GUARDED set — the walls-plane successor of
 * test_manage_parity scans these sources). Wire contract unchanged:
 * the envelope is always {action, ok, detail, data}.
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./manager-api.ts";
import { loadEndpointConfig, runtimeModelsRoot } from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";

// ── SSOT vocabulary ─────────────────────────────────────────────────
// Closed vocabulary — a typo is a 422, not a silent miss.
export const ACTIONS = [
  "status",
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

interface Req {
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
class Refused extends Error {
  public data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
  public code: number;
}
const badRequest = (m: string): Refused => new Refused(422, m);
const notFound = (m: string): Refused => new Refused(404, m);
const unavailable = (m: string): Refused => new Refused(503, m);

function parseReq(doc: unknown): Req {
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
    return Array.isArray(v) ? v.length === 0 : v === "";
  });
  if (missing.length > 0) throw badRequest(req.action + " requires: " + missing.join(", "));
}

// ── runs / security / probe (TS-native) ────────────────────────────
const STATUS_RE = /"status"\s*:\s*"([a-z]+)"/;

/** Sidecar scan: run dirs whose _flow.json reads running|queued.
 *  Anchored at the REPO data tree (inherited behavior — the scan
 *  follows the estate, not the state root). Conservative: a stale
 *  "running" sidecar refuses the restart (safe). */
function activeRuns(repoRoot: string): string[] {
  const dir = join(repoRoot, "data", "runs", "output");
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of names) {
    if (!name.startsWith("run-")) continue;
    let buf: string;
    try {
      buf = readFileSync(join(dir, name, "_flow.json"), "utf-8").slice(0, 8191);
    } catch {
      continue;
    }
    const m = STATUS_RE.exec(buf);
    if (m && (m[1] === "running" || m[1] === "queued")) out.push(name);
  }
  return out.sort();
}

/** The manager's live security view (READ ONLY — the manager reads
 *  config.ini once at ComfyUI startup, so a call-time write would be
 *  a lie until restart; provision owns the pin). v3.38 layout:
 *  user/__manager/config.ini (system-user-api ComfyUI), legacy
 *  user/default/ComfyUI-Manager/config.ini otherwise. */
function managerSecurity(repoRoot: string): string {
  const runtime = join(repoRoot, "data", "runtime", "comfyui");
  const cands = [
    join(runtime, "user", "__manager", "config.ini"),
    join(runtime, "user", "default", "ComfyUI-Manager", "config.ini"),
  ];
  for (const ini of cands) {
    let text: string;
    try {
      text = readFileSync(ini, "utf-8");
    } catch {
      continue;
    }
    const level = /^\s*security_level\s*=\s*(\S+)/m.exec(text);
    const gitUrl = /^\s*allow_git_url_install\s*=\s*true/m.test(text);
    return "security_level=" + (level ? level[1] : "normal (default)") + (gitUrl ? " +git_url" : "") + " [" + ini + "]";
  }
  return "unpinned (no manager config on disk — provision sync)";
}

interface EndpointView {
  reachable: boolean;
  url?: string;
  reason?: string;
  comfyui_version?: unknown;
  devices?: Array<{ name: string; vram_total: unknown; vram_free: unknown }>;
}

/** The endpoint config's OWN server, probed live (/system_stats).
 *  The 5s abort rides the timer service seat (ManageCtx.timeout —
 *  the cordis-plugin-timer seam): the returned disposer is both the
 *  early clear and the disposal guarantee, no bare setTimeout
 *  (deep-audit finding #7, 2026-09-10). */
async function probeEndpoint(mctx: ManageCtx): Promise<EndpointView> {
  const cfg = mctx.endpoint();
  const url = typeof cfg["url"] === "string" ? (cfg["url"] as string).replace(/\/+$/, "") : "";
  if (url === "") return { reachable: false, reason: "no url in endpoint config" };
  const ctrl = new AbortController();
  const t = mctx.timeout((): void => ctrl.abort(), 5000);
  try {
    const r = await fetch(url + "/system_stats", { signal: ctrl.signal });
    const stats = (await r.json()) as Record<string, unknown>;
    const sysinfo = (stats["system"] ?? {}) as Record<string, unknown>;
    const devices = ((stats["devices"] ?? []) as Array<Record<string, unknown>>).slice(0, 4).map((d) => ({
      name: typeof d["name"] === "string" ? (d["name"] as string) : "?",
      vram_total: d["vram_total"],
      vram_free: d["vram_free"],
    }));
    return { reachable: true, url, comfyui_version: sysinfo["comfyui_version"], devices };
  } catch (e) {
    return { reachable: false, url, reason: String(e).slice(0, 120) };
  } finally {
    t();
  }
}

// ── the manager rail (vendor HTTP — see manager-api.ts) ────────────
function base(ctx: ManageCtx): string {
  return managerBase(ctx);
}

/** Map a manager refusal to the estate envelope (the vendor's own
 *  security texts ride verbatim — this door never reinterprets a
 *  security answer). */
function mapManagerRefused(e: ManagerApiError, action: string): Refused {
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

function railMs(req: Req): number {
  return Math.min(Math.max(req.timeout_seconds, 1), 850) * 1000;
}

/** Poll the vendor's task queue until drained (install arms: the
 *  vendor returns 202-semantics — queue accepted — and processes
 *  asynchronously; the poll bounds the AI door's wait). */
async function awaitQueueDrained(ctx: ManageCtx, req: Req): Promise<Record<string, unknown>> {
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
function estateOnly(req: Req, cfg: Record<string, unknown>): void {
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
async function downloadIntoModelsTree(
  ctx: ManageCtx,
  row: { url: string; relative_path: string; filename: string },
  timeoutMs: number,
): Promise<string> {
  if (row.url === "") throw badRequest("download requires: url");
  const folder = row.relative_path.startsWith("models/")
    ? row.relative_path.slice("models/".length)
    : row.relative_path;
  if (folder.includes("..") || folder.startsWith("/")) {
    throw badRequest("relative_path must stay under the models root: " + row.relative_path);
  }
  const name = row.filename !== "" ? row.filename : row.url.split("/").pop() ?? "";
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
const COMFY_UNIT = process.env["MELITE_COMFYUI_UNIT"] ?? "melite-comfyui.service";

function systemctl(req: Req, verb: "start" | "stop"): [number, ManageEnvelope] {
  const out = spawnSync("systemctl", ["--user", verb, COMFY_UNIT], {
    timeout: 30 * 1000,
    encoding: "utf8",
  });
  if (out.error !== undefined || out.status !== 0) {
    const why = String(out.stderr ?? out.error?.message ?? "").trim().slice(0, 200);
    return [500, { action: req.action, ok: false, detail: "systemctl " + verb + " " + COMFY_UNIT + " failed: " + why }];
  }
  return [200, { action: req.action, ok: true, detail: verb + " issued for " + COMFY_UNIT }];
}

function guardLifecycle(req: Req, ctx: ManageCtx): void {
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
      manager = { reachable: false, reason: e instanceof Error ? e.message.slice(0, 160) : String(e) };
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
        String(out.error.message ?? "").slice(0, 120),
    );
  }
  const text = typeof out.stdout === "string" ? out.stdout : "";
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
      if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
      throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
  }
  return ok(req.action, "switch to " + req.version + " issued (restart required)", { restart_required: true });
}

async function hFree(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const b = base(ctx);
  if (b === "") throw planeUnavailable(b, "no endpoint url");
  try {
    await managerPost(b, "/free", { unload_models: true, free_memory: true }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
  }
  return ok(req.action, "free issued (next worker iteration)", null);
}

async function hListExtensions(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  let doc: unknown;
  try {
    doc = await managerGet(base(ctx), "/customnode/installed", { ctx, timeoutMs: 30_000 });
  } catch (e) {
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof ManagerApiError) throw mapManagerRefused(e, req.action);
    throw e;
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
    if (e instanceof Refused) {
      const action = doc !== null && typeof doc === "object" && !Array.isArray(doc)
        ? String((doc as Record<string, unknown>)["action"] ?? "?")
        : "?";
      return [e.code, { action, ok: false, detail: e.message }];
    }
    throw e;
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
