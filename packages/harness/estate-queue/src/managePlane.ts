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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ComfyError,
  endpointConfigPath,
  invalidateObjectInfo,
  liveObjectInfo,
  loadEndpointConfig,
  resolveEngineBaseUrl,
} from "@melite/comfyui-cordis";
import { writeJsonAtomic } from "./queueLock.ts";
import {
  installUserLora,
  installUserLoraBytes,
  loraNamesFromObjectInfo,
  readUserLoraRows,
  resolveEngineLorasDir,
  unboardedRows,
  userLorasPath,
} from "@melite/comfyui-cordis/user-loras";
import type { ModelsService } from "@melite/comfyui-cordis";
import type {
  ProvisionPlan,
  ProvisionResult,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
  WeightAcquireProgress,
} from "@melite/estate-provisioning";
import { AcquireBusyError } from "@melite/estate-provisioning";
import { ManagerApiError, managerGet, managerPost, planeUnavailable } from "./managerRail.ts";
import { probeEndpoint, activeRuns, managerSecurity, engineQueueView } from "./manageProbe.ts";
import { base, mapManagerRefused, mapRail, railMs, estateOnly, awaitQueueDrained, systemctl, guardLifecycle } from "./manageOps.ts";
import { holdLifecycle } from "./lifecycleLatch.ts";
import { deadline as deadlineOf, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { segmentConfined } from "@melite/contracts/mediaKinds";
import { artifactFileName } from "@melite/contracts/benchResult";

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
  "acquire_weight",
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
  retry_after_ms?: number;
}

export interface ManageCtx {
  /** File-anchored repo root (routing, catalog, runs scan anchor). */
  repoRoot: string;
  /** The §23 cross-roots manifest (own state root first, then the
   *  stateRoots config extras): the runs-probe rows (restart
   *  guard, status) walk these trees — one law from the queue
   *  seat, never the retired env seam (J12). */
  stateRoots: readonly string[];
  /** The estate deployment's systemd unit (V7 cure: the manage
   *  provider's config field — systemctl/journalctl/status rows all
   *  read this one value, never an import-time env capture). */
  comfyUnit: string;
  /** The lane's provisioning posture (the manage provider's config
   *  field): true tells the deck the DECLARED arms run without the
   *  operator confirm — the raw-URL arms stay operator-gated in the
   *  deck's own gate regardless of this value. */
  autoProvision: boolean;
  /** The endpoint config, re-read per call (fresh — never cached
   *  between calls): carries the engine url the manager rail rides.
   *  The bridges door passes loadEndpointConfig itself. */
  endpoint: () => Record<string, unknown>;
  /** The models catalog (stroke 4a: injected by the bridges door
   *  from the engine-model-catalog provider row — required, never
   *  optional: a door without its catalog is a miswire, and the
   *  type error at the construction site is the loudest refusal). */
  models: ModelsService;
  /**
   * The Cordis provisioning seat — OPTIONAL, and the type finally says
   * so (2026-09-26). It was declared required while the construction
   * site cast an unchecked `ctx.get("provisioning")`, and nine call
   * sites dereferenced it ungated. On a lane that does not mount the
   * provisioning composition (proved live on a maker lane: the status
   * door answered with `resources_detail: Cannot read properties of
   * undefined (reading 'reconcile')` — a raw TypeError laundered into
   * a status field), every one of those was a crash dressed as data.
   *
   * ABSENCE IS NOT AN ERROR for the read arms (status reports the
   * absence in words and answers everything else) and it IS a loud 503
   * for the mutation arms (there is nothing to mutate through). Both go
   * through `provisioningOf`.
   */
  provisioning?: ProvisioningServiceDefinition;
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
  /** THE WEIGHT-LANDING RE-ARM (the cards-plane batch): called after
   *  a model lands under a living process (provision_model,
   *  download_model, an acquire_weight poll observing a terminal
   *  state) so the card registry's presence cache re-derives on its
   *  next read. Optional: a lane without the estate card registry
   *  has no presence face to re-arm. */
  rearmWeights?: () => void;
}

/** THE PROVISIONING SEAT GATE (2026-09-26). One accessor, both
 *  postures, no unguated dereference left in the plane:
 *
 *  - `provisioningOf` — for the MUTATION arms. An absent seat is a
 *    503 in the door's own vocabulary, naming the row that mounts it,
 *    because "install what?" has no answer without a provisioner and a
 *    TypeError is not an answer.
 *  - `provisioningOrAbsent` — for the READ arms. Status still answers;
 *    the resources section reports the absence in words and every other
 *    section (endpoint, manager, versions, active runs, routing) is
 *    unaffected. A status door that dies because one optional seat is
 *    missing cannot tell the operator anything at all.
 */
export function provisioningOf(ctx: ManageCtx): ProvisioningServiceDefinition {
  const seat = ctx.provisioning;
  if (seat === undefined || typeof seat.reconcile !== "function") {
    throw new Refused(
      503,
      "the provisioning seat is not mounted on this lane (absent, not broken) — the estate's provisioning composition row is what mounts it; nothing can be installed, updated or reconciled without it",
    );
  }
  return seat;
}

export function provisioningOrAbsent(ctx: ManageCtx): ProvisioningServiceDefinition | undefined {
  const seat = ctx.provisioning;
  return seat === undefined || typeof seat.reconcile !== "function" ? undefined : seat;
}

export interface Req {
  action: ManageAction;
  nodes: string[];
  url: string;
  /** install_extension_url's PIN (the unpinned-URL law, cured
   *  2026-10-21): a free-text URL with no ref floats with the
   *  branch head — every declared nodes.yaml row pins, and the
   *  operator free-text arm carries the same law. */
  ref: string;
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
  /** The external-acquisition doors' confirm (audit I-S6, 2026-10-22):
   *  the caller's own assertion that a human approved landing bytes
   *  from this URL — never self-asserted by the door. */
  operator_confirmed: boolean;
  snapshot: string;
  // THE LORA DOORS' ROWS (the interface drift the tsc gate caught,
  // 2026-10-10: the normalizer below has set these since the doors
  // landed — path for the copy arm, data for the bytes arm,
  // families for the row suggestion — while the interface never
  // declared them)
  path: string;
  data: string;
  families: string[];
  /** THE ACQUIRE-WEIGHT POLL KEY (F9 run-press acquisition): the
   *  tracker's poll carries ONLY this — the start carries the model
   *  (plus the missing file for display, via filename) and returns
   *  this id at once. */
  operation_id: string;
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
    // The timer keeps its own abort listener (an in-flight wait
    // fires early when the caller aborts). A timer SCHEDULED while
    // already aborted cannot occur: every ctx.timeout caller
    // (waitForQueuePoll, the registry seat) rejects at entry on the
    // same tick it would schedule on — the pre-aborted leg the
    // wrapper once carried was unreachable and is gone (the same
    // judgment waitForQueuePoll's own comment records).
    timeout: (callback: () => void, delay: number): (() => void) => {
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
    ref: str("ref"),
    relative_path: str("relative_path"),
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
    operator_confirmed: d["operator_confirmed"] === true,
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
    operation_id: str("operation_id"),
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
  if (typeof value?.operation_id === "string") envelope.operation_id = value.operation_id;
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

async function recordEngineBoot(ctx: ManageCtx, source: string): Promise<void> {
  try {
    // J6: the receipt rides the package's atomic writer — a bare
    // writeFileSync could tear the file across a crash, and a torn
    // receipt is a FALSE blindness signal for the status reader.
    await writeJsonAtomic(engineBootReceiptPath(ctx), { boot_at: Date.now(), source });
  } catch {
    // Swallowed with reason: the engine IS rebooting regardless; a
    // failed receipt write must never fail the restart answer — with
    // ONE exception (MP-R2, round 19): the caller's own abort. An
    // abort surfacing inside this write must propagate (the hRestart
    // finally still drops the cache for the issued reboot) instead of
    // being laundered into a success the caller cancelled.
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
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

async function normalizedResources(resources: readonly ResourceStatus[], provisioning?: ProvisioningServiceDefinition): Promise<ResourceStatus[]> {
  const rows: ResourceStatus[] = [];
  for (const resource of resources) {
    rows.push(await normalizeResource(resource, provisioning));
  }
  return rows;
}

/** THE TRUST MERGE (audit I-S6, 2026-10-22): the stored operation
 *  still fills a status row the declaration does not know (external
 *  acquisitions are never in the reconcile list), but the row no
 *  longer trusts its own landing — a served active row re-stats its
 *  recorded paths through the seat's verifyOperation before it is
 *  served, and a deleted file demotes the row to absent with the
 *  operation id and the gone path. NO SEAT = no operation merge,
 *  not a throw: a resource status the door can still report beats a
 *  status door that cannot answer. */
async function normalizeResource(resource: ResourceStatus, provisioning?: ProvisioningServiceDefinition): Promise<ResourceStatus> {
  const row = (
    operationId: string | undefined,
    state: ResourceStatus["state"],
    items: ResourceStatus["items"],
    detail: string | undefined,
  ): ResourceStatus => ({
    ...resource,
    state,
    items,
    ...(operationId === undefined ? {} : { operationId }),
    ...(detail === undefined ? {} : { detail }),
  });
  if (provisioning === undefined) {
    /* v8 ignore next 2 -- the only caller (hStatus) initialises
     * resources = [] and assigns entries only in the branch that
     * first resolves the provisioning seat, so a resource reaching
     * this function never sees provisioning === undefined; the
     * empty list never enters the loop (audit 2026-10-13,
     * call-site proof). */
    return row(resource.operationId, resource.state, resource.items, resource.detail);
  }
  try {
    const operation = provisioning.operationOf(resource.ref);
    if (operation === undefined) {
      return row(resource.operationId, resource.state, resource.items, resource.detail);
    }
    const verified = provisioning.verifyOperation === undefined
      ? operation
      : await provisioning.verifyOperation(operation);
    if (verified.state !== operation.state) {
      return row(verified.operationId, verified.state, verified.items, verified.items[0]?.detail ?? resource.detail);
    }
    return row(operation.operationId, operation.state, operation.items, resource.detail ?? operation.detail);
  } catch {
    return row(resource.operationId, resource.state, resource.items, resource.detail);
  }
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
  const active = activeRuns(ctx.stateRoots);
  // THE FINDING-10 SPLIT (2026-10-13): the census is fail-closed by
  // law (unreadable ⇒ active — guardLifecycle refuses restarts on
  // it), but the STATUS view was asserting every unsettled sidecar
  // as a concurrent active run: 60+ `active_runs` against the flow
  // door's one-active-run-machine-wide contract. The engine's own
  // queue corroborates: ComfyUI executes serially, so a reachable
  // engine reporting an empty queue cannot be executing ANY claim —
  // those rows are historical (dead-process sidecars that never
  // settled). The guard keeps the raw census; only the view splits.
  const engineQueue = await engineQueueView(ctx);
  const engineIdle = engineQueue !== null && engineQueue.running === 0 && engineQueue.pending === 0;
  const activeView = engineIdle ? [] : active;
  const staleClaims = engineIdle
    ? active.map((name) => name + " (claimed live; engine queue empty — historical: the sidecar never settled; the boot sweep retires its own root at restart)")
    : [];
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
  // THE STATUS POSTURE (2026-09-26): a missing provisioning seat is
  // reported IN WORDS and the rest of the status still answers. Before,
  // this line was `ctx.provisioning.reconcile(...)` behind a try/catch,
  // so an absent seat produced the TypeError text
  // "Cannot read properties of undefined (reading 'reconcile')" as a
  // status FIELD — a crash wearing a data costume, on the one door an
  // operator reads to decide what the estate is doing.
  const provisionSeat = provisioningOrAbsent(ctx);
  if (provisionSeat === undefined) {
    resourcesDetail = "the provisioning seat is not mounted on this lane (absent, not broken): no resource reconciliation — everything else in this status is live";
  } else {
    try {
      resources = await withManageTimeout(
        req,
        ctx,
        (signal) => provisionSeat.reconcile(undefined, signal),
        STATUS_RECONCILE_MS,
      );
    } catch (error: unknown) {
      if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
      resourcesDetail = error instanceof Error ? error.message : String(error);
    }
  }
  const normalized = await normalizedResources(resources, provisionSeat);
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
      unit: ctx.comfyUnit,
      operations,
    },
    comfyui_versions: comfyuiVersions,
    ...(comfyuiVersionsDetail === undefined ? {} : { comfyui_versions_detail: comfyuiVersionsDetail }),
    model_options: catalog.options,
    ...(catalog.detail === undefined ? {} : { model_options_detail: catalog.detail }),
    active_runs: activeView,
    ...(engineQueue === null ? {} : { engine_queue: engineQueue }),
    ...(staleClaims.length > 0 ? { stale_claims: staleClaims } : {}),
    ...(active.length > 1 && !engineIdle
      ? { active_runs_note: active.length + " claims; the one-run law bounds machine-wide actives at 1 — the surplus is unsettled sidecars (historical); the engine queue corroborates only when empty" }
      : {}),
    engine_boot: engineBootRow(ctx),
    routing,
    auto_provision: ctx.autoProvision,
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
    const out = await execFileAsync("journalctl", ["--user", "-u", ctx.comfyUnit, "-n", String(tail), "--no-pager", "-o", "cat"], {
      timeout: 15 * 1000,
      encoding: "utf8",
      signal: ctx.signal,
    });
    stdout = out.stdout;
  } catch (error: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    throw unavailable(
      "logs need the estate deployment's journal (unit " + ctx.comfyUnit + "): " +
        (error as Error).message.slice(0, 120),
    );
  }
  throwIfAborted(ctx.signal);
  const lines = stdout.split("\n").filter((ln) => ln !== "");
  return ok(req.action, lines.length + " log line(s) from " + ctx.comfyUnit, lines);
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
  // The fuse is dsh-timeout's deadline (the caller signal and the
  // timer fuse into one signal; TimeoutReason carries the win); the
  // 504 voice and its state payload are ours.
  const dl = deadlineOf(ctx.signal, boundMs, "MANAGE_OP");
  const boundAt = Date.now() + boundMs;
  const timedOut = (): boolean => timeoutOf(dl.signal, "MANAGE_OP") !== undefined;
  try {
    const value = await work(dl.signal);
    // THE RESOLVED-BEFORE-BOUND LAW (audit 2026-10-22): once work
    // RESOLVED, its value is real — reporting 504 for a result the
    // caller could have used (the old Date.now arm fired on work that
    // landed one tick past boundAt) serves nobody. An unresolved work
    // still dies at the deadline below (the abort arm).
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    return value;
  } catch (error: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (timedOut() || dl.signal.aborted) {
      throw new Refused(504, "manage operation timed out", {
        state: "timeout",
        next_action: "status",
      });
    }
    throw error;
  } finally {
    dl[Symbol.dispose]();
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
  // THE NO-LORAS-REMOTE LAW, enforced at the one fetch door: the
  // operator's rule ("THERE SHOULD NOT BE A LORAS REMOTE / IT'S
  // ALL BUILT IN") — a LoRA arrives by COPY through lora_install
  // or the user rows file, never by url. Before this arm the door
  // could fetch into models/loras and contradict the stated law.
  if (folder === "loras" || folder.startsWith("loras/")) {
    throw badRequest("download_model refuses the loras dir — LoRAs arrive by copy or upload (lora_install), never by url");
  }
  // THE C5 FILENAME LAW (audit T-E3, 2026-10-22): the derived name
  // rides the SSOT the cell artifacts ride — a URL's query and
  // fragment are never the file's name ("...safetensors?download=1"
  // landed bytes under a name the engine never listed), a trailing
  // slash names a directory (the empty name refuses by the bare-name
  // fence below), and %XX escapes decode to the true name.
  const filename = req.filename !== "" ? req.filename : artifactFileName(req.url);
  // The bare-name fence rides the SSOT (the dry-sweep's N5):
  // segmentConfined owns the bytes of a legal segment — inner dots
  // are legal ("model..ckpt" stays under the root; the traversal
  // fence is the slash arm, since the SSOT judges one segment) and
  // the NUL arm is its behavioral wall. The old hand-roll refused
  // every inner ".." and had drifted from the grammar every other
  // door rides.
  if (filename.includes("/") || !segmentConfined(filename)) {
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
  // THE GATE RUNS FIRST, NOT PER NODE (2026-09-26): the per-node catch
  // below turns any plan/ensure throw into a "missed" row, so a
  // seatless lane answered "extension is not declared" — blaming the
  // DECLARATION for a missing provisioner. Ask once, up front, so the
  // refusal is the true one and no node is attempted at all.
  const provisioner = provisioningOf(ctx);
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
        plan = await awaitWithAbort(provisioner.plan(ref), signal);
        throwIfAborted(signal);
        const result = await provisioner.ensure(ref, undefined, signal);
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

/** THE CONFIRM GATE (audit I-S6, 2026-10-22): the external
 *  acquisition doors pass the caller's operator_confirmed through —
 *  the door never asserts it. A request without the flag refuses
 *  409 before any fetch: the service's own gate would also block,
 *  but the refusal must name the wire field, not the service's
 *  internal voice. Returns the refusal envelope, or null to
 *  proceed. */
function operatorConfirmGate(req: Req, door: string): [number, ManageEnvelope] | null {
  if (req.operator_confirmed === true) return null;
  return [
    409,
    {
      action: door,
      ok: false,
      state: "conflict",
      detail:
        door + ": external acquisitions land bytes from a caller-named URL — pass operator_confirmed=true " +
        "(the human's approval) to proceed. The flag is recorded with the operation.",
      next_action: "operator_confirmed",
    },
  ];
}

async function hInstallExtensionUrl(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  estateOnly(req, ctx.endpoint());
  // THE SEAT ASKS FIRST (the hProvisionModel order law): a seatless
  // lane names its own 503 before any human flag is demanded
  const provisioner = provisioningOf(ctx);
  const confirmed = operatorConfirmGate(req, "install_extension_url");
  if (confirmed !== null) return confirmed;
  const result = await withManageTimeout(req, ctx, (signal) =>
    provisioner.acquireExternal(
      { kind: "extension", url: req.url, ...(req.ref === "" ? {} : { ref: req.ref }) },
      { operatorConfirmed: req.operator_confirmed },
      signal,
    ));
  return provisionEnvelope(req.action, result);
}

async function hDownloadModel(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "url");
  estateOnly(req, ctx.endpoint());
  const path = externalModelPath(req);
  // THE SEAT ASKS FIRST (the hProvisionModel order law), then the
  // gate below the shape guards: a request refused on its own merits
  // never needs the human's flag
  const provisioner = provisioningOf(ctx);
  const confirmed = operatorConfirmGate(req, "download_model");
  if (confirmed !== null) return confirmed;
  const result = await withManageTimeout(req, ctx, (signal) =>
    provisioner.acquireExternal(
      {
        kind: "model",
        url: req.url,
        relativePath: path.relativePath,
        filename: path.filename,
      },
      { operatorConfirmed: req.operator_confirmed },
      signal,
    ));
  // THE UNCONDITIONAL DROP (audit 2026-10-22): a landed fetch under a
  // living process must not leave the boot-time /object_info doc
  // serving. The old restartRequired guard was dead — the service
  // answers models "active" on every path (only extension installs
  // arm restart_required), so model landings never dropped and the
  // census stayed boot-stale until a reboot.
  invalidateLiveObjectInfo(ctx);
  ctx.rearmWeights?.();
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
  // THE GATE IS ABOVE THE FAMILY/CARD FALLBACK (2026-09-26): both plan
  // attempts sit inside catches that end in notFound(...), so a
  // seatless lane used to answer "404 model not found" for a model that
  // was perfectly well declared — the missing provisioner wearing the
  // wrong refusal. Ask once, first; then the family→card fallback keeps
  // its meaning.
  const provisioner = provisioningOf(ctx);
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
       plan = await awaitWithAbort(provisioner.plan(family), signal);
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
         plan = await awaitWithAbort(provisioner.plan(ref), signal);
       } catch (error: unknown) {
        if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
        if (signal.aborted) throw abortReason(signal);
        throw notFound(error instanceof Error ? error.message : String(error));
      }
    }
    throwIfAborted(signal);
    const result = await provisioner.ensure(ref, undefined, signal);
    // THE WEIGHTS LANDED UNDER A LIVING PROCESS (cold-drive run 6,
    // 2026-10-11): a provision that flags restart_required changes the
    // engine's model folders while this process still serves the
    // boot-time /object_info doc — the next compose read an empty combo
    // ("unet_name allows 0 values"). The engine's own folder scan is
    // mtime-live, so dropping the cached doc makes the landing visible
    // without a reboot (same door law as loraInstalled below).
    // THE UNCONDITIONAL DROP (audit 2026-10-22): restartRequired was a
    // dead guard — model items never arm it (service answers "active";
    // only extensions yield restart_required), so the drop must not
    // wait on a flag that never fires.
    invalidateLiveObjectInfo(ctx);
    ctx.rearmWeights?.();
    return provisionEnvelope(req.action, result, {
      model: req.model,
      files: result.items.filter((item) => item.state === "active").map((item) => item.key),
      present: result.items.filter((item) => item.state === "active").map((item) => item.key),
    }, [operationRow(req.model, result, ref, plan)]);
  });
}

/** THE F9 ACQUISITION DOOR (run-press acquisition — ONE door, TWO
 *  callers): the bench popup's Download button and the agent's
 *  comfy_manage acquire_weight seat both land here. It starts the
 *  fetch WITHOUT awaiting the landing (the progress ledger counts
 *  real landed bytes) and returns the operation id at once; the
 *  tracker polls this SAME action with {operation_id} for
 *  bytes/total. The fetch itself rides provisioner.ensure (the
 *  existing fetcher — never a second fetcher). */
async function hAcquireWeight(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  type Progressive = ProvisioningServiceDefinition & {
    progressOf?: (operationId: string) => WeightAcquireProgress | null;
    startWeightAcquire?: (ref: ResourceRef, options?: { items?: readonly string[] }) => Promise<string>;
  };
  const provisioner = provisioningOf(ctx) as Progressive;
  // THE POLL (the tracker's read): same action, operation id only —
  // no model, no fetch, no wait. Unknown ids 404 (never a fake
  // zero — the tracker must render the truth).
  if (req.operation_id !== "") {
    if (typeof provisioner.progressOf !== "function") {
      throw unavailable("acquire_weight progress is not configured on this lane");
    }
    const progress = provisioner.progressOf(req.operation_id);
    if (progress === null || progress === undefined) {
      throw notFound("unknown acquire_weight operation: " + req.operation_id);
    }
    // the landing finished under this process — the cached doc predates
    // the files (same door law as hProvisionModel); the next read
    // re-fetches once and sees the landed weights
    if (
      progress.state === "installed" ||
      progress.state === "restart_required" ||
      progress.state === "active"
    ) {
      invalidateLiveObjectInfo(ctx);
      // the presence face re-arms with the doc: the files the engine
      // will serve are the files the board's present flags claim
      ctx.rearmWeights?.();
    }
    return ok(req.action,
      "acquire_weight " + progress.operationId + ": " + String(progress.bytes) + "/" + String(progress.total)
        + " bytes (" + progress.state + ")",
      {
        operation_id: progress.operationId,
        state: progress.state,
        bytes: progress.bytes,
        total: progress.total,
        next_action: "acquire_weight",
        ...(progress.detail === undefined ? {} : { detail: progress.detail }),
      });
  }
  // THE START (the Download press): model required, the missing file
  // rides filename for DISPLAY only (the DECL owns the fetch source —
  // the names-only law). Returns the operation id at once; the fetch
  // lands in the background and the tracker polls it above.
  need(req, "model");
  estateOnly(req, ctx.endpoint());
  if (typeof provisioner.startWeightAcquire !== "function" || typeof provisioner.progressOf !== "function") {
    throw unavailable("acquire_weight is not configured on this lane");
  }
  const startAcquire = provisioner.startWeightAcquire;
  const family: ResourceRef = {
    kind: "model",
    owner: "family",
    id: req.model,
    ...(req.variant === "" ? {} : { variant: req.variant }),
    ...(req.quant === "" ? {} : { quant: req.quant }),
  };
  // The provisioner hops ride the same deadline fuse as every
  // sibling arm (audit N-E2): a stalled provisioner answers 504
  // inside the request's own railMs, never hangs the door.
  let ref = family;
  let plan: Awaited<ReturnType<typeof provisioner.plan>> | null = null;
  try {
    plan = await withManageTimeout(req, ctx, async () => await provisioner.plan(family));
  } catch (error: unknown) {
    // the fuse's own refusal keeps its voice (audit F1): a deadline
    // maps to 504 here, never into the unknown-model 404 below
    if (error instanceof Refused) throw error;
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
      plan = await withManageTimeout(req, ctx, async () => await provisioner.plan(ref));
    } catch (nested: unknown) {
      if (nested instanceof Refused) throw nested;
      throw notFound(nested instanceof Error ? nested.message : String(nested));
    }
  }
  // THE FILE→ITEMS WALL (audit T-S1, 2026-10-22): the requested
  // filename now SUBSETS the fetch — one missing file no longer
  // downloads every row of a multi-GB family. The name maps to plan
  // item keys exactly as the provisioner's own options.items filter
  // keys them (kind model → name, else id); an unknown filename is
  // the item-not-found refusal, never a whole-family fetch.
  let acquireOptions: { items: string[] } | undefined;
  if (req.filename !== "" && plan !== null) {
    const wanted = plan.items
      .filter((item) => (item.kind === "model" ? item.name : item.id) === req.filename)
      .map((item) => (item.kind === "model" ? item.name : item.id));
    if (wanted.length === 0) {
      throw badRequest(
        `acquire_weight file '${req.filename}' matches no provision row of '${req.model}' (item-not-found) — refusing to fetch the whole family for a one-file miss`);
    }
    acquireOptions = { items: wanted };
  }
  // THE BUSY MAP (audit I-S4): a plane at its concurrency cap is a
  // wait, not a failure — the 429 carries retry_after_ms and points
  // the caller back at the poll arm
  let operationId: string;
  try {
    operationId = await withManageTimeout(req, ctx, async () => await startAcquire.call(provisioner, ref, acquireOptions));
  } catch (error: unknown) {
    if (error instanceof AcquireBusyError) {
      return [429, {
        action: req.action,
        ok: false,
        state: "busy",
        status: 429,
        detail: error.message,
        next_action: "acquire_weight",
        retry_after_ms: error.retryAfterMs,
      }];
    }
    throw error;
  }
  const progress = provisioner.progressOf(operationId);
  const bytes = progress?.bytes ?? 0;
  const total = progress?.total ?? 0;
  const state = progress?.state ?? "acquiring";
  const file = req.filename !== "" ? " (" + req.filename + ")" : "";
  return ok(req.action,
    "acquiring " + req.model + file + " — " + String(bytes) + "/" + String(total)
      + " bytes (poll acquire_weight operation_id=" + operationId + ")",
    {
      operation_id: operationId,
      operationId,
      state,
      bytes,
      total,
      model: req.model,
      ...(req.filename === "" ? {} : { file: req.filename, filename: req.filename }),
      ...(req.variant === "" ? {} : { variant: req.variant }),
      ...(req.quant === "" ? {} : { quant: req.quant }),
      next_action: "acquire_weight",
    });
}

async function hRestart(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the vendor
  // call so a run pressed mid-reboot refuses instead of tearing.
  const releaseLifecycle = holdLifecycle(req.action);
  try {
    await managerPost(base(ctx), "/manager/reboot", {}, { ctx, timeoutMs: 10_000 });
     // MP-R2 (round 19, 2026-10-10): the reboot is ISSUED past this
     // await — the cached /object_info doc must not outlive it. The
     // drop rides a finally so an abort inside the receipt write
     // cannot skip it (the abort still propagates after the drop).
     try {
       await recordEngineBoot(ctx, "estate restart");
     } finally {
       // the node set changes under a reboot while this process lives —
       // the cached /object_info doc must not outlive it (the refresh
       // the lora answer's next_action promises, 2026-10-15)
       invalidateLiveObjectInfo(ctx);
     }
     return ok(req.action, "reboot issued (systemd re-spawns the engine)", { next_action: "status" });
  } catch (e) {
    if (e instanceof ManagerApiError && e.status === 503) {
      // The vendor reboots by exiting: the connection can drop after
      // the 200 is sent — same honest answer.
       if (/fetch failed|ECONNRESET|socket/i.test(e.text)) {
         try {
           await recordEngineBoot(ctx, "estate restart (connection dropped mid-answer)");
         } finally {
           invalidateLiveObjectInfo(ctx);
         }
         return ok(req.action, "reboot issued (connection closed by restart)", { next_action: "status" });
      }
      throw mapManagerRefused(e, req.action);
    }
    throw mapRail(e, req.action);
  } finally {
    releaseLifecycle();
  }
}

async function hStop(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  guardLifecycle(req, ctx);
  estateOnly(req, ctx.endpoint());
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the
  // systemctl call so a run pressed mid-stop refuses.
  const releaseLifecycle = holdLifecycle(req.action);
  try {
    return await systemctl(req, "stop", ctx.comfyUnit, ctx.signal);
  } finally {
    releaseLifecycle();
  }
}

async function hLaunch(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  estateOnly(req, ctx.endpoint());
  return await systemctl(req, "start", ctx.comfyUnit, ctx.signal);
}

async function hUpdate(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  if (req.target !== "comfy") {
    throw badRequest("update target must be comfy — comfy-cli is retired (the built-in manager updates ComfyUI)");
  }
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the vendor
  // calls so a run pressed mid-update refuses instead of tearing.
  const releaseLifecycle = holdLifecycle(req.action);
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
  } finally {
    releaseLifecycle();
  }
}

async function hSwitchVersion(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  need(req, "version");
  guardLifecycle(req, ctx);
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the read +
  // switch so a run pressed mid-switch refuses instead of tearing.
  const releaseLifecycle = holdLifecycle(req.action);
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
  } finally {
    releaseLifecycle();
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
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the free
  // call so a run pressed mid-free refuses instead of tearing.
  const releaseLifecycle = holdLifecycle(req.action);
  try {
    await managerPost(b, "/free", { unload_models: true, free_memory: true }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  } finally {
    releaseLifecycle();
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
  // THE ENV FENCE (audit I-S2, the KEY LAW divergence enforced):
  // resolveEngineBaseUrl reads COMFYUI_URL FIRST, so with the env
  // set, this file write lands on a plane no reader keys off —
  // the census, lora doors, and live docs keep answering the env
  // server while the UI reports the file's. Refuse instead of
  // warning: the operator unsets COMFYUI_URL (or points it at the
  // same server) and the write becomes real.
  const envUrl: string = (process.env["COMFYUI_URL"] ?? "").trim().replace(/\/+$/, "");
  if (envUrl !== "" && envUrl !== url) {
    throw new Refused(
      409,
      "endpoint_set: COMFYUI_URL='" + envUrl + "' overrides the config file — " +
        "every reader keys off the env while this write lands on the file, " +
        "so the door would silently change nothing. Unset COMFYUI_URL or point it at '" + url + "' first.",
      { state: "conflict", next_action: "endpoint_set" },
    );
  }
  const dl = deadlineOf(ctx.signal, 5000, "ENDPOINT_SET_PROBE");
  let stats: Record<string, unknown>;
  try {
    const r = await fetch(url + "/system_stats", { signal: dl.signal });
    if (!r.ok) throw new Error("HTTP " + String(r.status));
    stats = (await r.json()) as Record<string, unknown>;
  } catch (e: unknown) {
    if (signalIsAborted(ctx.signal)) throw abortReason(ctx.signal);
    if (timeoutOf(dl.signal, "ENDPOINT_SET_PROBE")) {
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
    dl[Symbol.dispose]();
  }
  throwIfAborted(ctx.signal);
  const cfgPath = endpointConfigPath();
  const cfg = { ...loadEndpointConfig() } as Record<string, unknown>;
  // Captured BEFORE the mutation below: priorUrl must read the
  // PRE-write config url. Reading cfg["url"] after `cfg["url"] = url`
  // returns the new url twice and the old server's doc never drops
  // (found by the MP-R2 wall — the drop loop read [url, url]).
  const priorUrl: string = (() => {
    const raw: unknown = cfg["url"];
    return typeof raw === "string" && raw.trim() !== "" ? raw.trim().replace(/\/+$/, "") : url;
  })();
  cfg["url"] = url;
  try {
    // J6: the endpoint config rides the atomic writer — a torn
    // comfyui_endpoint.json would brick every later config read on
    // this estate. The writer rejects with Error only (fs/promises),
    // so the Refused narrow still holds.
    await writeJsonAtomic(cfgPath, cfg);
  } catch (e: unknown) {
    throw new Refused(
      500,
      "endpoint_set: config write failed (" + (e as Error).message + ") — the endpoint is unchanged",
    );
  }
  // THE BOTH-KEYS DROP (audit 2026-10-22): repointing orphans the old
  // server's ~3.5MB census doc forever (oiCache is unbounded) — drop
  // the pre-write config url AND the new one, so neither seat serves
  // a doc that no longer describes its engine.
  // MP-R2 (round 19, 2026-10-10): the drop sits BEFORE the post-write
  // abort check — the write above already landed, so an abort
  // delivered between the write and the drop still drops (the old
  // server's doc must not be served indefinitely). A write that did
  // NOT land throws above and never reaches this drop.
  for (const stale of [priorUrl, url]) {
    try {
      invalidateObjectInfo(stale);
    } catch (e: unknown) {
      // no endpoint configured under this spelling — no key was
      // cached under it. The LIVE key failing is different (audit
      // N-S6): the stale doc survives and the next census serves the
      // old server's node set — that failure is voiced, not folded.
      if (stale === url) {
        console.log("[estate-queue] endpoint_set: the oiCache drop failed on the LIVE key — the next census may serve the previous server's node set:", e instanceof Error ? e.message : String(e));
      }
    }
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
  // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): held across the restore
  // call so a run pressed mid-restore refuses instead of tearing.
  const releaseLifecycle = holdLifecycle(req.action);
  try {
    await managerPost(base(ctx), "/snapshot/restore", { target: req.snapshot }, { ctx, timeoutMs: 30_000 });
  } catch (e) {
    throw mapRail(e, req.action);
  } finally {
    releaseLifecycle();
  }
  return ok(req.action, "restore of " + req.snapshot + " scheduled (restart required)", {
    state: "restart_required",
    restart_required: true,
    next_action: "restart",
  });
}


// ── THE LORA DOORS (the operator's 2026-09-26 order: custom LoRAs
// belong in the ComfyUI Manager sidebar, not a dev-only drop-in).

/** The engine's loras dir, resolved by the ONE shared spelling
 *  (`resolveEngineLorasDir` in comfyui-cordis — env override, else
 *  the endpoint's model root + `loras`, null when undeclared). The
 *  uploads door's binary arm reads the same function, so the two
 *  doors can never disagree about where a LoRA lands. */
const engineLorasDir = resolveEngineLorasDir

/** The refusal text for an undeclared loras dir — one spelling. */
const LORAS_DIR_UNDECLARED =
  'the loras install dir is undeclared — set MELITE_COMFYUI_LORAS_DIR or the endpoint model_base_path (never guessed)'

/** `lora_list` — THE FACT + THE ROWS. The engine's own
 *  LoraLoaderModelOnly combo is the only truth about what /prompt will
 *  accept (a name outside it is a 400 after the money is spent), and
 *  the user's rows file says which of those names are OFFERED, with a
 *  label and a strength default. */
async function hLoraList(req: Req, ctx: ManageCtx): Promise<[number, ManageEnvelope]> {
  const cfg = ctx.endpoint();
  estateOnly(req, cfg);
  const combo = loraNamesFromObjectInfo(await objectInfoDoc(ctx, railMs(req)))
  const file = readUserLoraRows(userLorasPath())
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
      install_dir: engineLorasDir(cfg) ?? LORAS_DIR_UNDECLARED,
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
  // a copy needs a REAL target — an undeclared dir refuses loud
  // (never a guessed path on someone else's machine)
  if (dir === null) throw new Refused(502, LORAS_DIR_UNDECLARED)
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
 *  engine already lists it, and the restart it needs. The pinned
 *  core's folder listing is mtime-live (cached_filename_list_
 *  re-stats each folder per read — data/runtime/comfyui/
 *  folder_paths.py:499), so a landed file shows in the next census
 *  WITHOUT a reboot; the harness's own cached /object_info doc is
 *  the stale layer, and the acquisition doors drop it (1a6f773c).
 *  A restart stays required for custom_nodes (import-time), never
 *  for a weight file. The row suggestion rides along so the
 *  operator's next step is a paste, not a hunt. */
async function loraInstalled(
  req: Req,
  ctx: ManageCtx,
  dir: string,
  result: { filename: string, bytes: number },
  verb: 'copied' | 'uploaded',
): Promise<[number, ManageEnvelope]> {
  // truth at answer time: the engine may have rebooted since the
  // cache filled (an out-of-band restart), so the combo read below
  // must not serve the pre-restart doc — one fresh fetch per install
  invalidateLiveObjectInfo(ctx)
  const combo = loraNamesFromObjectInfo(await objectInfoDoc(ctx, railMs(req)))
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
async function objectInfoDoc(ctx: ManageCtx, boundMs?: number): Promise<unknown> {
  // THE OI FUSE (audit I-E5, 2026-10-22; refusal split audit N-S1,
  // 2026-10-22): the live read carries the caller's signal and the
  // same railMs bound every other manage hop rides. The deadline
  // refusal is LOUD — a hung engine refuses the door (504), it
  // never reads as an empty lora combo; only an engine that cannot
  // be reached at all folds to the null-doc contract.
  throwIfAborted(ctx.signal)
  if (ctx.objectInfo !== undefined) {
    try {
      return await ctx.objectInfo()
    } catch {
      return null
    }
  }
  try {
    return await liveObjectInfo(resolveEngineBaseUrl(), ctx.signal, boundMs)
  } catch (error) {
    // only the deadline goes loud; an unreachable or endpoint-less
    // engine keeps the settled null-doc contract (not-visible), and
    // an aborted door needs no refusal past its own teardown
    if (error instanceof ComfyError && error.code === 'deadline') {
      throw new Refused(504, error.message)
    }
    return null
  }
}

/** Drop the live /object_info cache entry for the engine this
 *  process serves — the same key objectInfoDoc's live arm reads.
 *  A ctx carrying its own objectInfo seam never touches the global
 *  cache, so there is nothing to drop; and an endpoint-less
 *  resolveEngineBaseUrl refusal means no key was ever cached.
 *  KEY LAW: the drop keys off resolveEngineBaseUrl() (env/config),
 *  never ctx.endpoint() — matching the reader. A lane seating a
 *  ctx.endpoint() that differs from the resolved base must point
 *  COMFYUI_URL at the same server, or the drop lands on a key no
 *  census reads and the stale doc survives. */
function invalidateLiveObjectInfo(ctx: ManageCtx): void {
  if (ctx.objectInfo !== undefined) return
  try {
    invalidateObjectInfo(resolveEngineBaseUrl())
  } catch (e) {
    // no endpoint configured — nothing was ever cached under a key
    void e
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
  acquire_weight: hAcquireWeight,
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
