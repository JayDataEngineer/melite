/** The manage door (POST /v1/manage) — Cordis-native, zero estate Python.
 *
 * NO-ESTATE-PYTHON LAW: this module is the SSOT vocabulary AND the
 * implementation. The old python/manage.py (Action enum + _HANDLERS +
 * LIFECYCLE_GUARDED) is dead; the vocabulary lives here in scannable
 * shape (ACTIONS array, HANDLERS rows, LIFECYCLE_GUARDED set — the
 * walls-plane successor of test_manage_parity scans these sources).
 *
 * How it works: validated params → vendor APIs. MCP-tool actions ride
 * the MCP rail (./mcp.ts → the VENDOR comfy-mcp server binary over
 * stdio); browse/snapshot actions ride the vendor cm_cli module;
 * endpoint/active-runs/security/routing are TS-native (fetch, readdir,
 * config.ini). No estate Python is spawned, read, or imported.
 *
 * Wire contract (unchanged from the old door — the harness tool
 * comfy-manage.ts and the panel speak it): the envelope is always
 * {action, ok, detail, data}; refusal texts are byte-kept ("Field
 * required", "Input should be", "<action> requires: <fields>",
 * "not found in catalog", the 409 guard texts).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { callMcpTool } from "./mcp.ts";
import { PyNum } from "@melite/gateway-core";
import { loadEndpointConfig } from "@melite/comfyui-cordis";
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
  /** Absolute vendor `comfy-mcp` server binary. */
  serverBin: string;
  /** The models catalog (stroke 4a: injected by the bridges door
   *  from the engine-model-catalog provider — required, never
   *  optional: a door without its catalog is a miswire, and the
   *  type error at the construction site is the loudest refusal). */
  models: ModelsService;
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

// ── request validation (extra=forbid, frozen) ───────────────────────
const KNOWN_KEYS: ReadonlySet<string> = new Set([
  "action", "nodes", "url", "relative_path", "filename", "wait",
  "timeout_seconds", "model", "variant", "quant", "tail", "query",
  "version", "target", "extra_args", "force", "snapshot",
]);

function asString(v: unknown, name: string): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  throw badRequest("bad request: " + name + ": Input should be a string");
}

function parseReq(doc: unknown): Req {
  if (doc === null || doc === undefined || typeof doc !== "object" || Array.isArray(doc)) {
    throw badRequest("bad request: body must be an object");
  }
  const body = doc as Record<string, unknown>;
  for (const k of Object.keys(body)) {
    if (!KNOWN_KEYS.has(k)) throw badRequest("bad request: " + k + ": Extra inputs are not permitted");
  }
  const rawAction = body["action"];
  if (rawAction === undefined || rawAction === null || rawAction === "") {
    throw badRequest("bad request: action: Field required");
  }
  if (typeof rawAction !== "string" || !(ACTIONS as readonly string[]).includes(rawAction)) {
    throw badRequest(
      "bad request: action: Input should be " +
        ACTIONS.map((a) => "'" + a + "'").join(", "),
    );
  }
  const nodes = body["nodes"] === undefined ? [] : body["nodes"];
  if (!Array.isArray(nodes) || nodes.some((n) => typeof n !== "string")) {
    throw badRequest("bad request: nodes: Input should be a list of strings");
  }
  const extraArgs = body["extra_args"] === undefined ? [] : body["extra_args"];
  if (!Array.isArray(extraArgs) || extraArgs.some((n) => typeof n !== "string")) {
    throw badRequest("bad request: extra_args: Input should be a list of strings");
  }
  const wait = body["wait"];
  if (wait !== undefined && wait !== null && typeof wait !== "boolean") {
    throw badRequest("bad request: wait: Input should be a boolean");
  }
  // The dispatcher strict-parses with parseJson: number literals
  // arrive as PyNum (assets.ts machinery) — unwrap, never reject.
  const num = (v: unknown, name: string): number => {
    if (typeof v === "number") return v;
    if (v instanceof PyNum) return Number((v as PyNum).literal);
    throw badRequest("bad request: " + name + ": Input should be a number");
  };
  const tail = body["tail"] === undefined ? 200 : num(body["tail"], "tail");
  const timeoutSeconds = body["timeout_seconds"] === undefined
    ? 1800.0
    : num(body["timeout_seconds"], "timeout_seconds");
  return {
    action: rawAction as ManageAction,
    nodes: nodes as string[],
    url: asString(body["url"], "url"),
    relative_path: asString(body["relative_path"], "relative_path"),
    filename: asString(body["filename"], "filename"),
    wait: (wait ?? null) as boolean | null,
    timeout_seconds: timeoutSeconds,
    model: asString(body["model"], "model"),
    variant: asString(body["variant"], "variant"),
    quant: asString(body["quant"], "quant"),
    tail,
    query: asString(body["query"], "query"),
    version: asString(body["version"], "version"),
    target: body["target"] === undefined ? "comfy" : asString(body["target"], "target"),
    extra_args: extraArgs as string[],
    force: body["force"] === true,
    snapshot: asString(body["snapshot"], "snapshot"),
  };
}

function need(req: Req, ...fields: Array<"nodes" | "url" | "model" | "version" | "snapshot" | "query">): void {
  const missing = fields.filter((f) => {
    const v = req[f];
    return Array.isArray(v) ? v.length === 0 : v === "";
  });
  if (missing.length > 0) throw badRequest(req.action + " requires: " + missing.join(", "));
}

// ── routing / probe / runs / security (TS-native) ───────────────────
interface Routing {
  mode: "byo" | "managed";
  routed: boolean;
  workspace?: string;
}

/** The endpoint config view — the ENGINE owns this read (env path
 *  first, sandbox leak gate, LOUD on unparseable); the manage door
 *  consumes it, never re-implements path+parse (the duplicate
 *  hand-roll died 2026-09-08, zero-compromise followup). */
function endpointConfig(repoRoot: string): Record<string, unknown> {
  return loadEndpointConfig();
}

/** Managed mode: point the vendor rail at THIS runtime's comfy-cli and
 *  workspace (COMFY_BIN + COMFYUI_PATH + set-default); byo touches
 *  nothing. */
function ensureRouting(ctx: ManageCtx): Routing {
  const cfg = endpointConfig(ctx.repoRoot);
  if (cfg["provision"] !== "managed") return { mode: "byo", routed: false };
  const runtime = join(ctx.repoRoot, "data", "runtime", "comfyui");
  const comfyBin = join(runtime, ".venv", "bin", "comfy");
  if (!existsSync(comfyBin)) {
    throw unavailable(
      "managed routing: " + comfyBin + " missing — run provision sync first " +
        "(the runtime venv carries the instance's comfy-cli)",
    );
  }
  process.env["COMFY_BIN"] = comfyBin;
  process.env["COMFYUI_PATH"] = runtime;
  process.env["VIRTUAL_ENV"] = join(runtime, ".venv");
  try {
    spawnSync(comfyBin, ["set-default", runtime], { timeout: 90 * 1000 });
  } catch {
    // Routing is best-effort glue; the vendor calls fail loudly if it
    // did not take.
  }
  return { mode: "managed", routed: true, workspace: runtime };
}

/** Rail env for one vendor spawn: the routing set above, plus the
 *  base bindir on PATH (the vendor shells to `comfy`). */
function railEnv(ctx: ManageCtx): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of ["COMFY_BIN", "COMFYUI_PATH", "VIRTUAL_ENV"] as const) {
    const v = process.env[k];
    if (v) env[k] = v;
  }
  const baseBin = join(ctx.serverBin, "..");
  env["PATH"] = baseBin + ":" + (process.env["PATH"] ?? "");
  return env;
}

function mcpTimeoutMs(req: Req): number {
  return Math.min(Math.max(req.timeout_seconds, 1), 850) * 1000;
}

async function tool(
  ctx: ManageCtx,
  req: Req,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  try {
    return await callMcpTool(name, args, {
      serverBin: ctx.serverBin,
      env: railEnv(ctx),
      timeoutMs: mcpTimeoutMs(req),
    });
  } catch (e) {
    if ((e as Record<string, unknown>)["mcpRail"] === true) {
      throw new Refused(500, "vendor tool " + name + " failed: " + (e as Error).message.slice(0, 300));
    }
    throw e;
  }
}

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

/** security=medium, the operator's pin. The package-form Manager IS
 *  the confirm gate (confirm_*=True on every install/update/switch
 *  call); the config face pins the level for the Manager's own UI. */
function ensureManagerSecurity(repoRoot: string): string {
  const ini = join(repoRoot, "data", "runtime", "comfyui", "custom_nodes", "ComfyUI-Manager", "config.ini");
  if (!existsSync(ini)) return "medium (package-form, confirm-gated)";
  let text: string;
  try {
    text = readFileSync(ini, "utf-8");
  } catch {
    return "unreadable";
  }
  if (/^\s*security_level\s*=\s*medium\s*$/m.test(text)) return "medium (config pinned)";
  text = text.replace(/^(\s*security_level\s*=\s*)(\S+)(\s*)$/m, "$1medium$3");
  if (!/^\s*security_level\s*=/m.test(text)) text += "\nsecurity_level = medium\n";
  try {
    const tmp = ini + ".tmp";
    writeFileSync(tmp, text, "utf-8");
    renameSync(tmp, ini);
  } catch {
    return "unreadable";
  }
  return "medium (config pinned)";
}

interface EndpointView {
  reachable: boolean;
  url?: string;
  reason?: string;
  comfyui_version?: unknown;
  devices?: Array<{ name: string; vram_total: unknown; vram_free: unknown }>;
}

/** The endpoint config's OWN server, probed live (/system_stats). */
async function probeEndpoint(repoRoot: string): Promise<EndpointView> {
  const cfg = endpointConfig(repoRoot);
  const url = typeof cfg["url"] === "string" ? (cfg["url"] as string).replace(/\/+$/, "") : "";
  if (url === "") return { reachable: false, reason: "no url in endpoint config" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
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
    clearTimeout(t);
  }
}

// ── vendor cm_cli (the manager's own CLI module — their API) ────────
const PACK_ROW = /^[A-Za-z0-9_][A-Za-z0-9_ .-]*@[A-Za-z0-9_.-]+$/;
const SNAP_ROW = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.json$/;

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Run ONE cm_cli command in the managed workspace. The interpreter
 *  is the runtime venv's python (managed routing has already pointed
 *  VIRTUAL_ENV at it) — the module executed is the VENDOR
 *  comfyui-manager's own CLI, never estate code. */
function cmCli(workspace: string, args: string[], timeoutMs: number): CliResult {
  const venv = process.env["VIRTUAL_ENV"] ?? "";
  const py = venv !== "" ? join(venv, "bin", "python") : process.execPath;
  const out = spawnSync(py, ["-m", "cm_cli", ...args], {
    cwd: workspace,
    env: { ...process.env, COMFYUI_PATH: workspace },
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
    encoding: "utf8",
  });
  if (out.error !== undefined && (out.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return { code: -1, stdout: "", stderr: "", timedOut: true };
  }
  return {
    code: out.status ?? 1,
    stdout: typeof out.stdout === "string" ? out.stdout : "",
    stderr: typeof out.stderr === "string" ? out.stderr : "",
    timedOut: false,
  };
}

function managedWorkspace(req: Req, ctx: ManageCtx): string {
  const routing = ensureRouting(ctx);
  if (routing.mode !== "managed") {
    throw new Refused(
      409,
      "byo endpoint: " + req.action + " reads the managed workspace — the estate " +
        "never touches a user-owned ComfyUI's packs/snapshots",
    );
  }
  return routing.workspace ?? join(ctx.repoRoot, "data", "runtime", "comfyui");
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
  const info = (await tool(ctx, req, "server_info", {})) as Record<string, unknown>;
  const sec = ensureManagerSecurity(ctx.repoRoot);
  const active = activeRuns(ctx.repoRoot);
  const endpoint = await probeEndpoint(ctx.repoRoot);
  const routing = ensureRouting(ctx);
  const up = endpoint.reachable || (info ?? {})["running"];
  const data = { endpoint, server_info: info, manager_security: sec, active_runs: active, routing };
  if (endpoint.reachable) return ok(req.action, "server up", data);
  if (up) return ok(req.action, "workspace up", data);
  return ok(req.action, "server not reachable", data);
}

async function hLogs(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const data = await tool(ctx, req, "get_logs", { tail: Math.max(1, Math.min(Math.trunc(req.tail), 2000)) });
  const n = Array.isArray(data) ? data.length : 1;
  return ok(req.action, n + " log line(s)", data);
}

async function hSearch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "query");
  const data = (await tool(ctx, req, "search_models", { query: req.query })) as
    | unknown[]
    | { models?: unknown[] };
  const rows = Array.isArray(data) ? data : (data ?? {}).models ?? [];
  return ok(req.action, rows.length + " hit(s) for '" + req.query + "'", data);
}

async function hInstallExtension(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.nodes.length === 0) throw badRequest("install_extension requires: nodes");
  ensureRouting(ctx);
  ensureManagerSecurity(ctx.repoRoot);
  // confirm_install=True IS security=medium in-process: standard
  // registry installs auto-approve (bare ids only — PIN LAW: @pins and
  // URLs are refused by install_node).
  const rep = await tool(ctx, req, "install_node", { names: [...req.nodes], confirm_install: true });
  return ok(req.action, "install_node accepted: " + req.nodes.join(", "), rep);
}

async function hInstallExtensionUrl(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  ensureRouting(ctx);
  ensureManagerSecurity(ctx.repoRoot);
  const workspace = process.env["COMFYUI_PATH"] ?? join(ctx.repoRoot, "data", "runtime", "comfyui");
  const r = cmCli(workspace, ["install", req.url], 300 * 1000);
  if (r.timedOut) throw new Refused(504, "cm_cli install timed out (300s)");
  if (r.code === 0) {
    return ok(req.action, "cm_cli installed " + req.url + " (restart required)", {
      restart_required: true,
      stdout: r.stdout.slice(-800),
    });
  }
  throw new Refused(500, "cm_cli install failed", { error: (r.stderr || r.stdout).slice(0, 500) });
}

async function hDownloadModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  ensureRouting(ctx);
  const wait = req.wait ?? false; // AI door: queue
  const rep = await tool(ctx, req, "download_model", {
    url: req.url,
    relative_path: req.relative_path === "" ? null : req.relative_path,
    filename: req.filename === "" ? null : req.filename,
    wait,
    timeout_seconds: req.timeout_seconds,
  });
  return ok(req.action, (wait ? "downloaded " : "queued ") + (req.filename || req.url.split("/").pop()), rep);
}

interface CatalogRow {
  name: string;
  url: string;
  relative_path: string;
}

/** The models-plane catalog (stroke 4a, DSH-AS-LANGUAGE LAW): the
 *  SEAM is ctx.models (ModelsService, injected by the bridges door
 *  from the engine-model-catalog provider row) — the old
 *  catalogModule() dynamic import with its NON-LITERAL specifier
 *  (the tsc dodge) and its 503 miss-leg are DELETED. A missing
 *  provider fails the door LOUD at inject (the framework's answer),
 *  never a 503 from inside the handler. The repoRoot rides the
 *  request ctx (fixture roots under MELITE_REPO_ROOT in walls) —
 *  the service keys its cache by it. */
async function hProvisionModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "model");
  let rows: CatalogRow[];
  try {
    rows = ctx.models.resolveCatalogArtifact(req.model, req.variant, req.quant, ctx.repoRoot);
  } catch (e) {
    throw notFound((e as Error).message);
  }
  ensureRouting(ctx);
  const wait = req.wait ?? false;
  const done: string[] = [];
  const present: string[] = [];
  const errs: Array<{ file: string; error: string }> = [];
  for (const row of rows) {
    if (ctx.models.checkModelPresent(row.relative_path, row.name, ctx.repoRoot) !== null) {
      present.push(row.name);
      continue;
    }
    try {
      await tool(ctx, req, "download_model", {
        url: row.url,
        relative_path: row.relative_path,
        filename: row.name,
        wait,
        timeout_seconds: req.timeout_seconds,
      });
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
  ensureRouting(ctx);
  try {
    const rep = await tool(ctx, req, "restart_comfyui", {
      extra_args: req.extra_args.length > 0 ? [...req.extra_args] : null,
      confirm_kill_untracked: true,
    });
    return ok(req.action, "restart issued", rep);
  } catch (e) {
    // Honest split: a server this comfy-cli never launched cannot be
    // restarted by it — say WHERE the server is instead.
    const endpoint = await probeEndpoint(ctx.repoRoot);
    if (endpoint.reachable) {
      throw new Refused(
        409,
        "the endpoint server (" + (endpoint.url ?? "?") + ") is up but was not launched by " +
          "comfy-cli — restart it with the deployment boot_cmd (provision boot-cmd) or launch it under comfy-cli",
      );
    }
    throw e;
  }
}

async function hStop(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  ensureRouting(ctx);
  const rep = await tool(ctx, req, "stop_comfyui", {});
  return ok(req.action, "stop issued", rep);
}

async function hLaunch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  ensureRouting(ctx);
  const rep = await tool(ctx, req, "launch_comfyui", {
    extra_args: req.extra_args.length > 0 ? [...req.extra_args] : null,
  });
  return ok(req.action, "launch issued", rep);
}

async function hUpdate(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.target !== "comfy" && req.target !== "cli" && req.target !== "all") {
    throw badRequest("update target must be comfy|cli|all");
  }
  guardLifecycle(req, ctx);
  ensureRouting(ctx);
  ensureManagerSecurity(ctx.repoRoot);
  const rep = await tool(ctx, req, "update_comfyui", { target: req.target, confirm_update_all: true });
  return ok(req.action, "update(" + req.target + ") accepted", rep);
}

async function hSwitchVersion(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "version");
  guardLifecycle(req, ctx);
  ensureRouting(ctx);
  const rep = await tool(ctx, req, "switch_comfyui_version", { version: req.version, confirm_switch: true });
  return ok(req.action, "switch to " + req.version + " accepted", rep);
}

async function hFree(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const rep = await tool(ctx, req, "free_memory", { unload_models: true, free_memory: true });
  return ok(req.action, "free issued (next worker iteration)", rep);
}

function cmRows(stdout: string, re: RegExp): string[] {
  return stdout
    .split("\n")
    .map((ln) => ln.trim())
    .filter((ln) => re.test(ln));
}

async function hListExtensions(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const workspace = managedWorkspace(req, ctx);
  const r = cmCli(workspace, ["simple-show", "installed"], 180 * 1000);
  if (r.timedOut) throw new Refused(504, "cm_cli simple-show timed out (180s)");
  if (r.code !== 0) throw new Refused(500, "cm_cli simple-show failed", { error: (r.stderr || r.stdout).slice(-500) });
  const rows = cmRows(r.stdout, PACK_ROW);
  return ok(req.action, rows.length + " installed pack(s)", rows);
}

async function hSnapshotList(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const workspace = managedWorkspace(req, ctx);
  const r = cmCli(workspace, ["show", "snapshot-list"], 180 * 1000);
  if (r.timedOut) throw new Refused(504, "cm_cli snapshot-list timed out (180s)");
  if (r.code !== 0) {
    throw new Refused(500, "cm_cli snapshot-list failed", { error: (r.stderr || r.stdout).slice(-500) });
  }
  const rows = cmRows(r.stdout, SNAP_ROW);
  return ok(req.action, rows.length + " snapshot(s)", rows);
}

async function hSnapshotSave(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const workspace = managedWorkspace(req, ctx);
  const r = cmCli(workspace, ["save-snapshot"], 300 * 1000);
  if (r.timedOut) throw new Refused(504, "cm_cli save-snapshot timed out (300s)");
  if (r.code !== 0) throw new Refused(500, "cm_cli save-snapshot failed", { error: (r.stderr || r.stdout).slice(-500) });
  const m = /saved as `([^`]+)`/.exec(r.stdout);
  const name = m ? m[1] : "?";
  return ok(req.action, "snapshot saved: " + name, { snapshot: name, stdout: r.stdout.slice(-400) });
}

async function hSnapshotRestore(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "snapshot");
  guardLifecycle(req, ctx);
  const workspace = managedWorkspace(req, ctx);
  const r = cmCli(workspace, ["restore-snapshot", req.snapshot], 600 * 1000);
  if (r.timedOut) throw new Refused(504, "cm_cli restore-snapshot timed out (600s)");
  if (r.code !== 0) {
    throw new Refused(500, "cm_cli restore-snapshot failed", { error: (r.stderr || r.stdout).slice(-500) });
  }
  return ok(req.action, "restore of " + req.snapshot + " issued (restart required)", {
    restart_required: true,
    stdout: r.stdout.slice(-800),
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
    const msg = e instanceof Error ? e.constructor.name + ": " + e.message : String(e);
    return [500, { action: req.action, ok: false, detail: msg.slice(0, 300) }];
  }
}
