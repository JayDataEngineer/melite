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
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  endpointConfigPath,
  liveObjectInfo,
  loadEndpointConfig,
  resolveEngineBaseUrl,
} from "@melite/comfyui-cordis";
import {
  installUserLora,
  installUserLoraBytes,
  loraNamesFromObjectInfo,
  readUserLoraRows,
  unboardedRows,
} from "@melite/comfyui-cordis/user-loras";
import type { ModelsService } from "@melite/comfyui-cordis";
import type {
  ProvisionPlan,
  ProvisionResult,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
} from "@melite/estate-provisioning";
import { ManagerApiError, managerBase, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { probeEndpoint, activeRuns, managerSecurity } from "./manageProbe.ts";
import { base, mapManagerRefused, mapRail, railMs, estateOnly, awaitQueueDrained, systemctl, guardLifecycle, COMFY_UNIT } from "./manageOps.ts";

const execFileAsync = promisify(execFile);

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
  "lora_list",
  "lora_install",
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
  "free",
]);

export interface ManageEnvelope {
  action: string;
  ok: boolean;
  detail: string;
  data?: unknown;
  status?: number;
  code?: string;
  state?: string;
  next_action?: string;
  operation_id?: string;
  operations?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  requested?: string[];
  succeeded?: string[];
  missed?: string[];
  misses?: string[];
  partial?: boolean;
  restart_required?: boolean;
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
  signal?: AbortSignal;
  /** THE ENGINE-TRUTH SEAM (2026-09-26, the LoRA doors): the WHOLE
   *  node-definitions document, exactly what the estate's
   *  `liveObjectInfo` returns (cached per engine, refuses closed on a
   *  malformed body). Absent = that reader; present = a caller's
   *  stand-in, which is how these walls prove the engine's answer
   *  without a live engine and without a second spelling of the
   *  truth. The seam is the reader, not one node: a stand-in that
   *  answered a single node would be a different contract. */
  objectInfo?: () => Promise<unknown>;
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

function abortReason(signal: AbortSignal | undefined): unknown {
  return signal?.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted", "AbortError");
}

function signalIsAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw abortReason(signal);
}

function awaitWithAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolvePromise, rejectPromise) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = (): void => finish(() => rejectPromise(abortReason(signal)));
    signal.addEventListener("abort", onAbort, { once: true });
    work.then((value) => finish(() => resolvePromise(value)), (error: unknown) => finish(() => rejectPromise(error)));
  });
}

function linkCallerSignal(ctx: ManageCtx, signal: AbortSignal | undefined): ManageCtx {
  if (signal === undefined) return ctx;
  return {
    ...ctx,
    signal,
    timeout: (callback: () => void, delay: number): (() => void) => {
      if (signal.aborted) {
        callback();
        return () => {};
      }
      const clear = ctx.timeout(callback, delay);
      const onAbort = (): void => callback();
      signal.addEventListener("abort", onAbort, { once: true });
      return () => {
        signal.removeEventListener("abort", onAbort);
        clear();
      };
    },
  };
}

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
    // THE LORA DOORS (2026-09-26): `lora_list` reports what the
    // ENGINE will accept (its own combo) plus the user's own rows;
    // `lora_install` copies a LoRA the operator already has into the
    // engine's loras dir — never a fetch (the no-loras-remote law).
    path: str("path"),
    // THE BYTES ARM (2026-09-26): civit.ai serves downloads behind
    // Cloudflare + a per-account key, and the standing law forbids a
    // loras remote — so the USER'S BROWSER downloads it and hands the
    // bytes over as the uploads rail's own data-URL spelling.
    data: str("data"),
    filename: str("filename") || str("file"),
    families: Array.isArray(d["families"]) ? (d["families"] as unknown[]).map(String).filter((s) => s !== "") : [],
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
  const value = typeof data === "object" && data !== null && !Array.isArray(data)
    ? data as Record<string, unknown>
    : undefined;
  const envelope: ManageEnvelope = {
    action,
    ok: true,
    detail,
    data,
    ...(Array.isArray(data) ? { rows: data } : {}),
  };
  if (typeof value?.state === "string") envelope.state = value.state;
  if (typeof value?.next_action === "string") envelope.next_action = value.next_action;
  if (Array.isArray(value?.operations)) envelope.operations = value.operations;
  return [200, envelope];
}

function withNextAction(response: [number, ManageEnvelope], nextAction: string): [number, ManageEnvelope] {
  response[1].next_action = nextAction;
  return response;
}

// ── handlers ────────────────────────────────────────────────────────
function engineBootReceiptPath(ctx: ManageCtx): string {
  return join(ctx.repoRoot, "data", "runtime", "comfyui", ".estate-engine-boot.json");
}

function recordEngineBoot(ctx: ManageCtx, source: string): void {
  try {
    writeFileSync(engineBootReceiptPath(ctx), JSON.stringify({ boot_at: Date.now(), source }) + "\n", "utf8");
  } catch {
    return;
  }
}

function engineBootRow(ctx: ManageCtx): Record<string, unknown> {
  try {
    const raw = JSON.parse(readFileSync(engineBootReceiptPath(ctx), "utf8")) as { boot_at?: unknown; source?: unknown };
    const bootAt = typeof raw.boot_at === "number" ? raw.boot_at : NaN;
    if (!Number.isFinite(bootAt)) throw new Error("malformed receipt");
    return {
      known: true,
      boot_at: new Date(bootAt).toISOString(),
      age_seconds: Math.max(0, Math.round((Date.now() - bootAt) / 1000)),
      source: typeof raw.source === "string" ? raw.source : "estate",
    };
  } catch {
    return { known: false, note: "engine booted outside the estate's restart door — age unknown" };
  }
}

function statusOutcome(state: string): string {
  return state;
}

function safeStatusItems(items: ResourceStatus["items"]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    key: item.key,
    kind: item.kind,
    state: item.state,
    ...(item.path === undefined ? {} : { path: item.path }),
    ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
    ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
    ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
    ...(item.detail === undefined ? {} : { detail: item.detail }),
  }));
}

function normalizedResources(resources: readonly ResourceStatus[], provisioning: ProvisioningServiceDefinition): ResourceStatus[] {
  return resources.map((resource) => {
    let operationId = resource.operationId;
    let state = resource.state;
    let items = resource.items;
    let detail = resource.detail;
    try {
      const operation = provisioning.operationOf(resource.ref);
      if (operation !== undefined) {
        operationId = operation.operationId;
        state = operation.state;
        items = operation.items;
        detail = detail ?? operation.detail;
      }
    } catch {
      operationId = resource.operationId;
      state = resource.state;
      items = resource.items;
      detail = resource.detail;
    }
    return {
      ...resource,
      state,
      items,
      ...(operationId === undefined ? {} : { operationId }),
      ...(detail === undefined ? {} : { detail }),
    };
  });
}

function operationRows(resources: readonly ResourceStatus[]): Array<Record<string, unknown>> {
  return resources.flatMap((resource) => {
    const operationId = resource.operationId;
    const first = resource.items[0];
    return operationId === undefined ? [] : [{
      operation_id: operationId,
      name: resource.ref.id,
      ref: resource.ref,
      ...(first?.path === undefined ? {} : { path: first.path }),
      state: resource.state,
      outcome: statusOutcome(resource.state),
      items: safeStatusItems(resource.items),
      next_action: resource.state === "restart_required" || resource.state === "installed" ? "restart" : "status",
    }];
  });
}

function nextActionFor(endpointReachable: boolean, resources: readonly ResourceStatus[], managed: boolean): string {
  if (!endpointReachable) return managed ? "launch" : "endpoint_set";
  if (resources.some((resource) => resource.state === "restart_required" || resource.state === "installed")) return "restart";
  return "status";
}

interface ModelQuantOption {
  id: string;
  label: string;
  description?: string;
}

interface ModelVariantOption {
  id: string;
  label: string;
  description?: string;
  quants: ModelQuantOption[];
}

interface ModelOption {
  id: string;
  label: string;
  description?: string;
  genre?: string;
  variants: ModelVariantOption[];
}

interface VersionOption {
  id: string;
  label: string;
  version?: string;
  tag?: string;
  commit?: string;
}

function modelOptions(models: ModelsService): { options: ModelOption[]; detail?: string } {
  if (typeof models.allDecls !== "function") return { options: [], detail: "model catalog unavailable" };
  try {
    const options = models.allDecls()
      .filter((decl) => !decl.unoffered && (decl.engine === undefined || decl.engine === "" || decl.engine === "comfyui"))
      .map((decl) => ({
        id: decl.id,
        label: decl.label || decl.id,
        ...(decl.description === undefined ? {} : { description: decl.description }),
        ...(decl.genre === undefined ? {} : { genre: decl.genre }),
        variants: (decl.variants ?? []).filter((variant) => variant.hide_from_dropdown !== true && (variant.cells ?? []).some((cell) => cell.quant !== "" && cell.hide_from_dropdown !== true)).map((variant) => ({
          id: variant.id,
          label: variant.label || variant.id,
          ...(variant.description === undefined ? {} : { description: variant.description }),
          quants: variant.cells!
            .filter((cell) => cell.quant !== "" && cell.hide_from_dropdown !== true)
            .map((cell) => ({
              id: cell.quant,
              label: cell.label || cell.quant,
              ...(cell.description === undefined ? {} : { description: cell.description }),
            })),
        })),
      }));
    return { options };
  } catch (error: unknown) {
    return { options: [], detail: error instanceof Error ? error.message : String(error) };
  }
}

function versionOptions(doc: unknown): VersionOption[] {
  const values: unknown[] = Array.isArray(doc)
    ? doc
    : typeof doc === "object" && doc !== null
      ? (() => {
        const record = doc as Record<string, unknown>;
        if (Array.isArray(record["versions"])) return record["versions"] as unknown[];
        if (Array.isArray(record["tags"])) return record["tags"] as unknown[];
        if (Array.isArray(record["data"])) return record["data"] as unknown[];
        return Object.entries(record).map(([tag, version]) => ({ tag, version }));
      })()
      : [];
  const seen = new Set<string>();
  const options: VersionOption[] = [];
  for (const value of values) {
    if (typeof value === "string" || typeof value === "number") {
      const id = String(value);
      if (id === "" || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label: id });
      continue;
    }
    if (typeof value !== "object" || value === null) continue;
    const record = value as Record<string, unknown>;
    const version = typeof record["version"] === "string" ? record["version"] : undefined;
    const tag = typeof record["tag"] === "string" ? record["tag"] : undefined;
    const commit = typeof record["commit"] === "string" ? record["commit"] : undefined;
    const id = version ?? tag ?? commit ?? (typeof record["id"] === "string" ? record["id"] : undefined);
    if (id === undefined || id === "" || seen.has(id)) continue;
    seen.add(id);
    const label = version !== undefined && tag !== undefined && version !== tag
      ? version + " — " + tag
      : version ?? tag ?? commit ?? id;
    options.push({ id, label, ...(version === undefined ? {} : { version }), ...(tag === undefined ? {} : { tag }), ...(commit === undefined ? {} : { commit }) });
  }
  return options;
}

async function hStatus(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  const endpoint = await probeEndpoint(ctx);
  const active = activeRuns();
  const routing = { mode: cfg["provision"] === "managed" ? "managed" : "byo" };
  let manager: Record<string, unknown> = {};
  let comfyuiVersions: VersionOption[] = [];
  let comfyuiVersionsDetail: string | undefined;
  if (endpoint.reachable) {
    const [versionResult, queueResult, versionsResult] = await Promise.allSettled([
      managerGet(base(ctx), "/manager/version", { ctx, timeoutMs: 1500 }),
      managerGet(base(ctx), "/manager/queue/status", { ctx, timeoutMs: 1500 }),
      managerGet(base(ctx), "/comfyui_manager/comfyui_versions", { ctx, timeoutMs: 1500 }),
    ]);
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    const managerFailure = [versionResult, queueResult].find((result) => result.status === "rejected");
    if (managerFailure?.status === "rejected") {
      manager = { reachable: false, reason: managerFailure.reason.message.slice(0, 160) };
    } else {
      const version = versionResult as PromiseFulfilledResult<unknown>;
      const queue = queueResult as PromiseFulfilledResult<unknown>;
      manager = { reachable: true, version: version.value, queue: queue.value };
    }
    if (versionsResult.status === "fulfilled") {
      comfyuiVersions = versionOptions(versionsResult.value);
    } else {
      comfyuiVersionsDetail = versionsResult.reason.message;
    }
  } else {
    manager = { reachable: false, reason: "endpoint not reachable" };
  }
  let resources: ResourceStatus[] = [];
  let resourcesDetail: string | undefined;
  try {
    resources = await withManageTimeout(
      req,
      ctx,
      (signal) => ctx.provisioning.reconcile(undefined, signal),
      STATUS_RECONCILE_MS,
    );
  } catch (error: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    resourcesDetail = error instanceof Error ? error.message : String(error);
  }
  const normalized = normalizedResources(resources, ctx.provisioning);
  const operations = operationRows(normalized);
  const resourceRows = normalized.map((resource) => ({
    ...resource,
    ...(resource.operationId === undefined ? {} : { operation_id: resource.operationId }),
  }));
  const state = endpoint.reachable ? "up" : "down";
  const nextAction = nextActionFor(endpoint.reachable, normalized, routing.mode === "managed");
  const catalog = modelOptions(ctx.models);
  const data = {
    state,
    next_action: nextAction,
    endpoint,
    manager: {
      ...manager,
      security: managerSecurity(ctx.repoRoot),
      unit: COMFY_UNIT,
      operations,
    },
    comfyui_versions: comfyuiVersions,
    ...(comfyuiVersionsDetail === undefined ? {} : { comfyui_versions_detail: comfyuiVersionsDetail }),
    model_options: catalog.options,
    ...(catalog.detail === undefined ? {} : { model_options_detail: catalog.detail }),
    active_runs: active,
    engine_boot: engineBootRow(ctx),
    routing,
    resources: resourceRows,
    operations,
    ...(resourcesDetail === undefined ? {} : { resources_detail: resourcesDetail }),
  };
  return ok(req.action, endpoint.reachable ? "server up" : "server not reachable", data);
}

async function hLogs(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  throwIfAborted(ctx.signal);
  const tail = Math.max(1, Math.min(Math.trunc(req.tail), 2000));
  let stdout: string;
  try {
    const out = await execFileAsync("journalctl", ["--user", "-u", COMFY_UNIT, "-n", String(tail), "--no-pager", "-o", "cat"], {
      timeout: 15 * 1000,
      encoding: "utf8",
      signal: ctx.signal,
    });
    stdout = out.stdout;
  } catch (error: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    throw unavailable(
      "logs need the estate deployment's journal (unit " + COMFY_UNIT + "): " +
        (error as Error).message.slice(0, 120),
    );
  }
  throwIfAborted(ctx.signal);
  const lines = stdout.split("\n").filter((ln) => ln !== "");
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
  return ok(req.action, hits.length + " hit(s) from Manager external catalog for '" + req.query + "'", hits);
}

async function withManageTimeout<T>(
  req: Req,
  ctx: ManageCtx,
  work: (signal: AbortSignal) => Promise<T>,
  boundMs: number = railMs(req),
): Promise<T> {
  throwIfAborted(ctx.signal);
  const controller = new AbortController();
  const deadline = Date.now() + boundMs;
  let timedOut = false;
  const onAbort = (): void => controller.abort(ctx.signal?.reason);
  ctx.signal?.addEventListener("abort", onAbort, { once: true });
  const cancel = ctx.timeout((): void => {
    timedOut = true;
    controller.abort();
  }, boundMs);
  try {
    const value = await work(controller.signal);
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (timedOut || Date.now() >= deadline) {
      throw new Refused(504, "manage operation timed out", {
        state: "timeout",
        next_action: "status",
      });
    }
    return value;
  } catch (error: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (timedOut || controller.signal.aborted) {
      throw new Refused(504, "manage operation timed out", {
        state: "timeout",
        next_action: "status",
      });
    }
    throw error;
  } finally {
    ctx.signal?.removeEventListener("abort", onAbort);
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
  const filename = req.filename !== "" ? req.filename : req.url.split("/").pop()!;
  if (filename === "" || filename.includes("/") || filename.includes("..")) {
    throw badRequest("filename must be a bare name under the models root");
  }
  return { relativePath: folder, filename };
}

function safeProvisionItems(result: ProvisionResult, plan?: ProvisionPlan): Array<Record<string, unknown>> {
  const plans = new Map((plan?.items ?? []).map((item) => [item.key, item]));
  return result.items.map((item) => {
    const declaration = plans.get(item.key);
    const name = declaration === undefined
      ? undefined
      : declaration.kind === "model" ? declaration.name : declaration.id;
    return {
      key: item.key,
      kind: item.kind,
      state: item.state,
      outcome: item.outcome,
      ...(name === undefined ? {} : { name }),
      ...(item.path === undefined ? {} : { path: item.path }),
      ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
      ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
      ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
      ...(item.detail === undefined ? {} : { detail: item.detail }),
    };
  });
}

function operationRow(name: string, result: ProvisionResult, ref: ResourceRef, plan?: ProvisionPlan): Record<string, unknown> {
  const first = result.items[0];
  return {
    operation_id: result.operationId,
    name,
    ref,
    ...(first?.path === undefined ? {} : { path: first.path }),
    state: result.state,
    outcome: result.outcome,
    items: safeProvisionItems(result, plan),
    restart_required: result.restartRequired,
    next_action: result.restartRequired || result.state === "restart_required" ? "restart" : "status",
  };
}

function provisionEnvelope(
  action: string,
  result: ProvisionResult,
  extra: Record<string, unknown> = {},
  operations: Array<Record<string, unknown>> = [],
): [number, ManageEnvelope] {
  const success = result.state === "active" || result.state === "restart_required";
  const code = success ? 200 : result.state === "blocked" || result.state === "cancelled" ? 409 : 500;
  const detail = result.detail ?? `${result.state} (${result.items.length} item(s))`;
  const errors = result.items
    .filter((item) => item.errorCode !== undefined)
    .map((item) => ({ file: item.key, error: item.detail ?? (item.errorCode as string) }));
  const rows = operations.length === 0
    ? [operationRow(result.ref.id, result, result.ref)]
    : operations;
  const nextAction = result.restartRequired || result.state === "restart_required"
    ? "restart"
    : result.state === "partial" || result.state === "failed" || result.state === "cancelled"
      ? action
      : "status";
  const items = operations.length === 0
    ? safeProvisionItems(result)
    : operations.flatMap((row) => row["items"] as Array<Record<string, unknown>>);
  const data = {
    ...extra,
    operation_id: result.operationId,
    state: result.state,
    items,
    operations: rows,
    restart_required: result.restartRequired,
    partial: result.state === "partial",
    next_action: nextAction,
    ...(errors.length === 0 ? {} : { errors }),
  };
  return [
    code,
    {
      action,
      ok: success,
      detail,
      status: code,
      state: result.state,
      next_action: nextAction,
      operation_id: result.operationId,
      operations: rows,
      items,
      partial: result.state === "partial",
      restart_required: result.restartRequired,
      ...(Array.isArray(extra["requested"]) ? { requested: extra["requested"] as string[] } : {}),
      ...(Array.isArray(extra["succeeded"]) ? { succeeded: extra["succeeded"] as string[] } : {}),
      ...(Array.isArray(extra["missed"]) ? { missed: extra["missed"] as string[] } : {}),
      ...(Array.isArray(extra["misses"]) ? { misses: extra["misses"] as string[] } : {}),
      data,
    },
  ];
}

function failedProvisionResult(ref: ResourceRef, plan: ProvisionPlan, detail: string, index: number): ProvisionResult {
  return {
    operationId: "failed-" + ref.kind + "-" + String(index),
    ref,
    state: "failed",
    outcome: "failed",
    operationState: "failed",
    items: plan.items.map((item) => ({
      key: item.key,
      kind: item.kind,
      state: "failed",
      outcome: "failed",
      errorCode: "manage/provision-failed",
      detail,
    })),
    restartRequired: false,
    detail,
  };
}

function mergeProvisionResults(results: readonly ProvisionResult[]): {
  readonly state: ProvisionResult["state"];
  readonly operationId: string;
  readonly items: ProvisionResult["items"];
  readonly restartRequired: boolean;
  readonly detail?: string;
} {
  const items = results.flatMap((result) => result.items);
  const hasSuccess = results.some((result) => result.state === "active" || result.state === "restart_required");
  const hasFailure = results.some((result) => result.state !== "active" && result.state !== "restart_required");
  const state: ProvisionResult["state"] = hasFailure
    ? hasSuccess
      ? "partial"
      : results.every((result) => result.state === "blocked")
        ? "blocked"
        : results.some((result) => result.state === "cancelled")
          ? "cancelled"
          : "failed"
    : results.some((result) => result.state === "restart_required")
      ? "restart_required"
      : "active";
  return {
    state,
    operationId: results.length === 1
      ? results[0]!.operationId
      : "aggregate:" + results.map((result) => result.operationId).join("+"),
    items,
    restartRequired: results.some((result) => result.restartRequired),
    ...(state === "partial" ? { detail: "partial provisioning result" } : {}),
  };
}

async function hInstallExtension(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.nodes.length === 0) throw badRequest("install_extension requires: nodes");
  estateOnly(req, ctx.endpoint());
  return await withManageTimeout(req, ctx, async (signal) => {
    const results: Array<{ readonly node: string; readonly ref: ResourceRef; readonly plan: ProvisionPlan; readonly result: ProvisionResult }> = [];
    const misses: string[] = [];
    const missed: string[] = [];
    for (const [index, node] of req.nodes.entries()) {
      throwIfAborted(ctx.signal);
      throwIfAborted(signal);
      const ref: ResourceRef = { kind: "extension", id: node };
      let plan: ProvisionPlan | undefined;
      try {
        plan = await awaitWithAbort(ctx.provisioning.plan(ref), signal);
        throwIfAborted(signal);
        const result = await ctx.provisioning.ensure(ref, undefined, signal);
        results.push({ node, ref, plan, result });
        if (result.state !== "active" && result.state !== "restart_required") {
          missed.push(node);
          misses.push(node + ": " + (result.detail ?? result.state));
        }
      } catch (error: unknown) {
        if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
        if (signal.aborted) throw abortReason(signal);
        const detail = error instanceof Error ? error.message : String(error);
        if (plan !== undefined) results.push({ node, ref, plan, result: failedProvisionResult(ref, plan, detail, index) });
        missed.push(node);
        misses.push(node + ": " + detail);
      }
    }
    const requested = [...req.nodes];
    const succeeded = results
      .filter(({ result }) => result.state === "active" || result.state === "restart_required")
      .map(({ node }) => node);
    const operations = results.map(({ node, ref, plan, result }) => operationRow(node, result, ref, plan));
    if (results.length === 0) {
      throw new Refused(404, "extension is not declared: " + misses.join(", "), {
        state: "failed",
        requested,
        succeeded,
        missed,
        misses,
        partial: false,
        items: [],
        operations: [],
        next_action: "install_extension",
      });
    }
    const merged = mergeProvisionResults(results.map(({ result }) => result));
    const state: ProvisionResult["state"] = missed.length > 0 && succeeded.length > 0
      ? "partial"
      : merged.state;
    const result: ProvisionResult = {
      operationId: merged.operationId,
      ref: { kind: "extension", id: req.nodes.join(",") },
      state,
      outcome: state,
      operationState: state === "partial"
        ? "installed"
        : state === "cancelled"
          ? "failed"
          : state,
      items: merged.items,
      restartRequired: merged.restartRequired,
      ...(state === "partial" ? { detail: `partial (${succeeded.length}/${requested.length} extension(s) succeeded)` } : {}),
    };
    return provisionEnvelope(req.action, result, {
      requested,
      succeeded,
      missed,
      misses,
      queued: merged.items.filter((item) => item.state === "restart_required" || item.state === "active").map((item) => item.key),
      partial: state === "partial",
    }, operations);
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

function familyModelDeclared(ctx: ManageCtx, id: string): boolean {
  return ctx.models.allDecls().some((decl) =>
    decl.id === id || decl.variants.some((variant) =>
      variant.route === id || variant.cells.some((cell) => cell.route === id),
    ),
  )
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
    let plan: ProvisionPlan | undefined;
    try {
       plan = await awaitWithAbort(ctx.provisioning.plan(family), signal);
     } catch (error: unknown) {
       if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
       if (signal.aborted) throw abortReason(signal);
       if (familyModelDeclared(ctx, req.model)) {
         throw notFound(error instanceof Error ? error.message : String(error));
       }
       ref = {
        kind: "model",
        owner: "card",
        id: req.model,
        ...(req.variant === "" ? {} : { variant: req.variant }),
        ...(req.quant === "" ? {} : { quant: req.quant }),
      };
      try {
         plan = await awaitWithAbort(ctx.provisioning.plan(ref), signal);
       } catch (error: unknown) {
        if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
        if (signal.aborted) throw abortReason(signal);
        throw notFound(error instanceof Error ? error.message : String(error));
      }
    }
    throwIfAborted(signal);
    const result = await ctx.provisioning.ensure(ref, undefined, signal);
    return provisionEnvelope(req.action, result, {
      model: req.model,
      files: result.items.filter((item) => item.state === "active").map((item) => item.key),
      present: result.items.filter((item) => item.state === "active").map((item) => item.key),
    }, [operationRow(req.model, result, ref, plan)]);
  });
}

async function hRestart(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    await managerPost(base(ctx), "/manager/reboot", {}, { ctx, timeoutMs: 10_000 });
     recordEngineBoot(ctx, "estate restart");
     return ok(req.action, "reboot issued (systemd re-spawns the engine)", { next_action: "status" });
  } catch (e) {
    if (e instanceof ManagerApiError && e.status === 503) {
      // The vendor reboots by exiting: the connection can drop after
      // the 200 is sent — same honest answer.
       if (/fetch failed|ECONNRESET|socket/i.test(e.text)) {
         recordEngineBoot(ctx, "estate restart (connection dropped mid-answer)");
         return ok(req.action, "reboot issued (connection closed by restart)", { next_action: "status" });
      }
      throw mapManagerRefused(e, req.action);
    }
    throw mapRail(e, req.action);
  }
}

async function hStop(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  estateOnly(req, ctx.endpoint());
  return await systemctl(req, "stop", ctx.signal);
}

async function hLaunch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  estateOnly(req, ctx.endpoint());
  return await systemctl(req, "start", ctx.signal);
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
    if (queue["timed_out"] === true) {
      throw new Refused(504, "update(comfy) queue did not drain before the deadline", {
        state: "timeout",
        queue,
        next_action: "status",
      });
    }
    return ok(req.action, "update(comfy) queued through the manager", {
      state: "completed",
      queue,
      next_action: "status",
    });
  } catch (e) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (e instanceof Refused) throw e;
    throw mapRail(e, req.action);
  }
}

async function hSwitchVersion(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "version");
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  try {
    const doc = await managerGet(base(ctx), "/comfyui_manager/comfyui_versions", {
      ctx, timeoutMs: 30_000,
    });
    const versions = versionOptions(doc).map((option) => option.id);
    if (!versions.includes(req.version)) {
      throw notFound("version " + req.version + " not available (have: " + versions.slice(0, 6).join(", ") + "…)");
    }
    await managerPost(base(ctx), "/comfyui_manager/comfyui_switch_version", { ver: req.version }, {
      ctx, timeoutMs: railMs(req),
    });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "switch to " + req.version + " issued (restart required)", {
    state: "restart_required",
    restart_required: true,
    next_action: "restart",
  });
}

async function hFree(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  const b = base(ctx);
  if (b === "") throw planeUnavailable(b, "no endpoint url");
  try {
    await managerPost(b, "/free", { unload_models: true, free_memory: true }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  }
  return ok(req.action, "free issued (next worker iteration)", { next_action: "status" });
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
  const onAbort = (): void => ctrl.abort(ctx.signal?.reason);
  let timedOut = false;
  ctx.signal?.addEventListener("abort", onAbort, { once: true });
  const clear = ctx.timeout((): void => {
    timedOut = true;
    ctrl.abort();
  }, 5000);
  let stats: Record<string, unknown>;
  try {
    const r = await fetch(url + "/system_stats", { signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + String(r.status));
    stats = (await r.json()) as Record<string, unknown>;
  } catch (e: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (timedOut) {
      throw new Refused(504, "endpoint_set probe timed out — the endpoint is unchanged", {
        state: "timeout",
        next_action: "endpoint_set",
      });
    }
    throw new Refused(
      502,
      "endpoint_set: '" + url + "' did not answer /system_stats (" +
        (e instanceof Error ? e.message : String(e)) + ") — the endpoint is unchanged",
    );
  } finally {
    ctx.signal?.removeEventListener("abort", onAbort);
    clear();
  }
  throwIfAborted(ctx.signal);
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
  throwIfAborted(ctx.signal);
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
  return withNextAction(ok(req.action, rows.length + " installed pack(s)", rows), "install_extension");
}

function snapshotItem(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const row = value as Record<string, unknown>;
    for (const key of ["snapshot", "name", "filename", "file"]) {
      if (typeof row[key] === "string") return row[key] as string;
    }
  }
  return String(value);
}

function snapshotItems(doc: unknown): string[] {
  if (Array.isArray(doc)) return doc.map(snapshotItem);
  if (typeof doc !== "object" || doc === null) return [];
  const value = doc as Record<string, unknown>;
  for (const key of ["items", "snapshots"]) {
    if (Array.isArray(value[key])) return (value[key] as unknown[]).map(snapshotItem);
  }
  if (value["data"] !== undefined) return snapshotItems(value["data"]);
  return [];
}

function snapshotName(doc: unknown): string | undefined {
  if (typeof doc === "string" && doc.trim() !== "" && doc !== "?") return doc;
  if (typeof doc !== "object" || doc === null) return undefined;
  const value = doc as Record<string, unknown>;
  for (const key of ["snapshot", "name", "filename", "file"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim() !== "" && candidate !== "?") return candidate;
  }
  if (value["data"] !== undefined) return snapshotName(value["data"]);
  return undefined;
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
  const items = snapshotItems(doc);
  return withNextAction(ok(req.action, items.length + " snapshot(s)", items), "snapshot_save");
}

async function hSnapshotSave(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  return await withManageTimeout(req, ctx, async (signal) => {
    const scoped = { ...ctx, signal };
    const before = snapshotItems(await managerGet(base(ctx), "/snapshot/getlist", { ctx: scoped, timeoutMs: 15_000 }));
    const response = await managerPost(base(ctx), "/snapshot/save", {}, { ctx: scoped, timeoutMs: railMs(req) });
    const after = snapshotItems(await managerGet(base(ctx), "/snapshot/getlist", { ctx: scoped, timeoutMs: 15_000 }));
    const added = after.filter((item) => !before.includes(item));
    const addedName = added.length === 1 && added[0].trim() !== "" && added[0] !== "?" ? added[0] : undefined;
    const name = addedName ?? snapshotName(response);
    if (name === undefined) {
      throw new Refused(502, "snapshot save completed without a verifiable snapshot name", {
        state: "unknown",
        snapshots: after,
        next_action: "snapshot_list",
      });
    }
    return ok(req.action, "snapshot saved: " + name, {
      state: "saved",
      snapshot: name,
      snapshots: after,
      next_action: "snapshot_restore",
    });
  }).catch((error: unknown) => {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (error instanceof Refused) throw error;
    throw mapRail(error, req.action);
  });
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
    state: "restart_required",
    restart_required: true,
    next_action: "restart",
  });
}


// ── THE LORA DOORS (the operator's 2026-09-26 order: custom LoRAs
// belong in the ComfyUI Manager sidebar, not a dev-only drop-in).

/** The engine's own LoRA directory, as ComfyUI's folder_paths would
 *  resolve it: the endpoint's model root + `loras`. A declared override
 *  wins (a box whose models live elsewhere), and the copy lands where
 *  the combo will find it. */
function engineLorasDir(cfg: Record<string, unknown>): string {
  const declared = process.env['MELITE_COMFYUI_LORAS_DIR']
  if (declared !== undefined && declared !== '') return declared
  const root = typeof cfg['model_base_path'] === 'string' ? (cfg['model_base_path'] as string) : ''
  if (root !== '') return join(root, 'loras')
  return '/mnt/data/models/image-gen/comfyui/loras'
}

/** `lora_list` — THE FACT + THE ROWS. The engine's own
 *  LoraLoaderModelOnly combo is the only truth about what /prompt will
 *  accept (a name outside it is a 400 after the money is spent), and
 *  the user's rows file says which of those names are OFFERED, with a
 *  label and a strength default. */
async function hLoraList(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  const combo = loraNamesFromObjectInfo(await objectInfoDoc(ctx))
  const file = readUserLoraRows(process.env['MELITE_USER_LORAS'] ?? './data/loras/user-loras.json')
  const unboarded = unboardedRows(file.rows, combo)
  return ok(
    req.action,
    combo.length + ' LoRA name(s) the engine accepts; ' + file.rows.length + ' user row(s) offered',
    {
      engine_loras: combo,
      user_rows: file.rows,
      user_rows_path: file.path,
      user_rows_present: !file.absent,
      user_row_problems: file.problems,
      // rows the engine does NOT have: named here, not at /prompt
      unboarded,
      install_dir: engineLorasDir(cfg),
      // a file copied in is only seen by the combo after a reboot —
      // core enumerates folder_paths at import, and a reboot is the
      // only refresh primitive this repo owns
      next_action_after_install: 'restart',
    },
  )
}

/** `lora_install` — COPY, never fetch. The operator's law: no loras
 *  remote; the file is one the operator already has. The answer names
 *  the restart it needs, because the combo is read at engine import. */
async function hLoraInstall(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint()
  estateOnly(req, cfg)
  const dir = engineLorasDir(cfg)
  // THE BYTES ARM: a browser upload (the civit flow) needs no path
  if (req.data !== '') {
    if (req.filename === '') throw new Refused(422, 'lora_install with bytes requires filename')
    // the declared length rides along so the door answers the cap
    // BEFORE decoding a 500MB base64 string (the transport knows the
    // length; a copy must not have to measure by decoding)
    const landed = installUserLoraBytes(req.filename, req.data, dir, req.data.length)
    if (!landed.ok) throw new Refused(422, landed.reason, { filename: req.filename, install_dir: dir })
    return loraInstalled(req, ctx, dir, landed, 'uploaded')
  }
  need(req, 'path')
  const result = installUserLora(req.path, dir)
  if (!result.ok) {
    // the plane's own refusal path (Refused → the envelope's detail +
    // data), so the sidebar reads it like every other refusal
    throw new Refused(422, result.reason, { path: req.path, install_dir: dir })
  }
  return loraInstalled(req, ctx, dir, result, 'copied')
}

/** THE ANSWER both arms share: the name, the bytes, whether the
 *  engine already lists it, and the restart it needs (core reads its
 *  folder list at import — a reboot is the only refresh this repo
 *  owns). The row suggestion rides along so the operator's next step
 *  is a paste, not a hunt. */
async function loraInstalled(
  req: Req,
  ctx: ManageCtx,
  dir: string,
  result: { filename: string, bytes: number },
  verb: 'copied' | 'uploaded',
): Promise<[number, ManageEnvelope]> {
  const combo = loraNamesFromObjectInfo(await objectInfoDoc(ctx))
  const visible = combo.includes(result.filename)
  return ok(
    req.action,
    verb + ' ' + result.filename + ' (' + result.bytes + ' bytes) into ' + dir
      + (visible ? ' — already in the engine\'s list' : ' — restart the engine to enter its list'),
    {
      filename: result.filename,
      bytes: result.bytes,
      install_dir: dir,
      in_combo_now: visible,
      next_action: 'restart',
      restart_required: !visible,
      // the row the operator adds next, ready to paste
      row_suggestion: {
        id: result.filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '_'),
        filename: result.filename,
        families: req.families,
        default_strength: 1,
      },
    },
  )
}

/** The engine's node declaration, or null when the engine is
 *  unreachable (the cross-check then proves nothing and refuses
 *  nothing — never a throw across the sidebar). ONE reader, the
 *  estate's own: `liveObjectInfo` is cached per engine for the
 *  process life and refuses closed on a malformed body — a second
 *  spelling here would be a second truth about the engine. */
/** The engine's WHOLE node-definitions doc, or null when the engine
 *  is unreachable. It is the doc (not one node) because the reader
 *  that turns it into the LoRA list is the reader's own job, and a
 *  per-node hop here would make the two spellings drift. */
async function objectInfoDoc(ctx: ManageCtx): Promise<unknown> {
  try {
    return ctx.objectInfo !== undefined
      ? await ctx.objectInfo()
      : await liveObjectInfo(resolveEngineBaseUrl())
  } catch {
    return null
  }
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
  lora_list: hLoraList,
  lora_install: hLoraInstall,
};

function refusalDataFields(data: unknown): Partial<ManageEnvelope> {
  if (typeof data !== "object" || data === null) return {};
  const value = data as Record<string, unknown>;
  return {
    ...(typeof value["state"] === "string" ? { state: value["state"] } : {}),
    ...(typeof value["next_action"] === "string" ? { next_action: value["next_action"] } : {}),
    ...(typeof value["operation_id"] === "string" ? { operation_id: value["operation_id"] } : {}),
    ...(Array.isArray(value["operations"]) ? { operations: value["operations"] } : {}),
    ...(Array.isArray(value["items"]) ? { items: value["items"] } : {}),
    ...(Array.isArray(value["requested"]) ? { requested: value["requested"] as string[] } : {}),
    ...(Array.isArray(value["succeeded"]) ? { succeeded: value["succeeded"] as string[] } : {}),
    ...(Array.isArray(value["missed"]) ? { missed: value["missed"] as string[] } : {}),
    ...(Array.isArray(value["misses"]) ? { misses: value["misses"] as string[] } : {}),
    ...(typeof value["partial"] === "boolean" ? { partial: value["partial"] } : {}),
    ...(typeof value["restart_required"] === "boolean" ? { restart_required: value["restart_required"] } : {}),
  };
}

function refusalEnvelope(action: string, status: number, detail: string, data?: unknown): ManageEnvelope {
  return {
    action,
    ok: false,
    detail,
    status,
    code: "manage/refused",
    data,
    ...refusalDataFields(data),
  };
}

export async function dispatchManage(doc: unknown, ctx: ManageCtx, signal?: AbortSignal): Promise<[number, ManageEnvelope]> {
  const activeCtx = linkCallerSignal(ctx, signal ?? ctx.signal);
  throwIfAborted(activeCtx.signal);
  let req: Req;
  try {
    req = parseReq(doc);
  } catch (e) {
    const r = e as Refused;
    const action = doc !== null && typeof doc === "object" && !Array.isArray(doc)
      ? String((doc as Record<string, unknown>)["action"] ?? "?")
      : "?";
    return [r.code, refusalEnvelope(action, r.code, r.message, r.data)];
  }
  try {
    const response = await HANDLERS[req.action](req, activeCtx);
    throwIfAborted(activeCtx.signal);
    return response;
  } catch (e) {
    if (activeCtx.signal?.aborted === true) throw abortReason(activeCtx.signal);
    if (e instanceof Refused) {
      return [e.code, refusalEnvelope(req.action, e.code, e.message, e.data)];
    }
    if (e instanceof ManagerApiError) {
      const refused = mapManagerRefused(e, req.action);
      return [refused.code, refusalEnvelope(req.action, refused.code, refused.message, refused.data)];
    }
    const msg = e instanceof Error ? e.constructor.name + ": " + e.message : String(e);
    return [500, refusalEnvelope(req.action, 500, msg.slice(0, 300))];
  }
}
