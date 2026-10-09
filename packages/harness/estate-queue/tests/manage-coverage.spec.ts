import { afterEach, describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resourceKey } from "@melite/estate-provisioning";
import type {
  ModelProvisionPlanItem,
  ProvisionItemResult,
  ProvisionOutcome,
  ProvisionPlan,
  ProvisionResult,
  ProvisionState,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
} from "@melite/estate-provisioning";

interface ChildResult {
  readonly stdout: string | Buffer;
  readonly stderr: string;
}

const child = vi.hoisted(() => ({
  run: async (_file: string, _args: readonly string[], _options: Record<string, unknown>): Promise<ChildResult> => ({
    stdout: "",
    stderr: "",
  }),
}));

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  const execFile = vi.fn();
  Object.assign(execFile, {
    [promisify.custom]: (file: string, args: readonly string[], options: Record<string, unknown>) =>
      child.run(file, args, options),
  });
  return { execFile };
});

import { dispatchManage, Refused } from "../src/managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "../src/managePlane.ts";

const realFetch = globalThis.fetch;
// the ?? "" guard (the flake audit's A1 step 5, 2026-10-15): an
// unset PATH captured as undefined writes back the literal string
// "undefined" under a -t filter, poisoning every later spec's PATH
const realPath = process.env.PATH ?? "";
let root = "";

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status });
const text = (value: string, status = 200): Response => new Response(value, { status });
const extensionRef = (id: string): ResourceRef => ({ kind: "extension", id });
const modelRef = (id: string, owner: "family" | "card" = "family", variant?: string, quant?: string): Extract<ResourceRef, { kind: "model" }> => ({
  kind: "model",
  owner,
  id,
  ...(variant === undefined ? {} : { variant }),
  ...(quant === undefined ? {} : { quant }),
});
const extensionPlan = (id: string): ProvisionPlan => ({
  ref: extensionRef(id),
  items: [{ kind: "extension", key: `extension:${id}`, id, required: true, provider: "manager", registry: "example", version: "1" }],
});
const modelPlan = (ref: Extract<ResourceRef, { kind: "model" }>): ProvisionPlan => {
  const name = `${ref.id}.safetensors`;
  const item: ModelProvisionPlanItem = {
    kind: "model",
    key: `model:${ref.id}:${name}`,
    owner: ref.owner,
    id: ref.id,
    name,
    folder: "checkpoints",
    url: `https://example.invalid/${name}`,
    sha256: "a".repeat(64),
    required: true,
    provider: "direct",
  };
  return { ref, items: [item] };
};
const itemResult = (
  item: ProvisionPlan["items"][number],
  state: ProvisionState,
  over: Partial<ProvisionItemResult> = {},
): ProvisionItemResult => ({
  key: item.key,
  kind: item.kind,
  state,
  outcome: state === "restart_required" ? "restart_required" : state === "blocked" ? "blocked" : "failed",
  ...over,
});
const provisionResult = (
  ref: ResourceRef,
  state: ProvisionOutcome,
  plan: ProvisionPlan,
  over: Partial<ProvisionResult> = {},
): ProvisionResult => ({
  operationId: `op-${ref.kind}-${ref.id}`,
  ref,
  state,
  outcome: state,
  operationState: state === "partial" ? "installed" : state === "cancelled" ? "failed" : state,
  items: plan.items.map((item) => itemResult(item, state === "active" ? "active" : state === "restart_required" ? "restart_required" : state === "blocked" ? "blocked" : "failed")),
  restartRequired: state === "restart_required",
  ...over,
});

type Provisioning = ProvisioningServiceDefinition & {
  plans: Map<string, ProvisionPlan>;
  outcomes: Map<string, ProvisionResult | Error | string>;
};
type Route = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

let route: Route = () => text("unused", 500);
const provisioning: Provisioning = {
  plans: new Map(),
  outcomes: new Map(),
  inspect: async (ref) => ({ ref, state: "unknown", items: [] }),
  plan: async (ref) => {
    const value = provisioning.plans.get(resourceKey(ref));
    if (value === undefined) throw new Error(`missing ${resourceKey(ref)}`);
    return value;
  },
  ensure: async (ref) => {
    const value = provisioning.outcomes.get(resourceKey(ref));
    if (value instanceof Error) throw value;
    if (typeof value === "string") throw value;
    if (value !== undefined) return value;
    const plan = provisioning.plans.get(resourceKey(ref));
    if (plan === undefined) throw new Error(`missing ${resourceKey(ref)}`);
    return provisionResult(ref, ref.kind === "extension" ? "restart_required" : "active", plan);
  },
  activate: async (ref) => await provisioning.ensure(ref),
  acquireExternal: async (request) => {
    const ref: ResourceRef = request.kind === "extension"
      ? extensionRef("external")
      : modelRef("external", "card");
    const plan = request.kind === "extension" ? extensionPlan("external") : modelPlan(ref as Extract<ResourceRef, { kind: "model" }>);
    return provisionResult(ref, request.kind === "extension" ? "restart_required" : "active", plan);
  },
  reconcile: async () => [],
  stateOf: () => "unknown",
  operationOf: () => undefined,
  isLocked: () => false,
};
const models = { allDecls: () => [] } as unknown as ManageCtx["models"];
const ctx = (over: Partial<ManageCtx> = {}): ManageCtx => ({
  repoRoot: root,
  // J12: the manifest rides the ctx (config-named call data) — the
  // census reads the fixture's own tree, never the repo's runs.
  stateRoots: root === "" ? [] : [root],
  comfyUnit: "melite-comfyui.service",
  endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
  models,
  provisioning,
  timeout: () => () => {},
  ...over,
});
const run = (doc: unknown, over: Partial<ManageCtx> = {}): Promise<[number, ManageEnvelope]> =>
  dispatchManage(doc, ctx(over));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.fetch = realFetch;
  process.env.PATH = realPath;
  delete process.env.COMFYUI_ENDPOINT_CONFIG;
  provisioning.plans.clear();
  provisioning.outcomes.clear();
  child.run = async () => ({ stdout: "", stderr: "" });
  if (root !== "") rmSync(root, { recursive: true, force: true });
  root = "";
});

describe("manage cancellation and rail coverage", () => {
  it("rejects pre-aborted and non-error caller reasons", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    const errorController = new AbortController();
    const errorReason = new Error("already-cancelled");
    errorController.abort(errorReason);
    await assert.rejects(run({ action: "status" }, { signal: errorController.signal }), (error: unknown) => error === errorReason);

    const plainController = new AbortController();
    const ref = extensionRef("plain-abort");
    const plan = extensionPlan(ref.id);
    const aborting = {
      ...provisioning,
      plan: async () => {
        plainController.abort("plain-abort");
        return plan;
      },
    } as unknown as ProvisioningServiceDefinition;
    await assert.rejects(
      run({ action: "install_extension", nodes: [ref.id] }, { signal: plainController.signal, provisioning: aborting }),
      (error: unknown) => (error as Error).name === "AbortError",
    );
  });

  it("settles an aborted plan once and ignores its later resolution", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    const controller = new AbortController();
    const plan = extensionPlan("deferred");
    let release: ((value: ProvisionPlan) => void) | undefined;
    const deferred = new Promise<ProvisionPlan>((resolve) => {
      release = resolve;
    });
    const aborting = { ...provisioning, plan: () => deferred } as unknown as ProvisioningServiceDefinition;
    const pending = run(
      { action: "install_extension", nodes: ["deferred"] },
      { signal: controller.signal, provisioning: aborting },
    );
    const reason = new Error("plan-cancelled");
    controller.abort(reason);
    await assert.rejects(pending, (error: unknown) => error === reason);
    release?.(plan);
    await Promise.resolve();
    await Promise.resolve();
  });

  it("links an abort into the timer seat and the manager request", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    const controller = new AbortController();
    const linked = {
      ...ctx(),
      endpoint: () => {
        controller.abort(new Error("endpoint-abort"));
        return { provision: "managed", url: "http://engine:8188" };
      },
      timeout: () => () => {},
    } as ManageCtx;
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return json({});
    }) as typeof fetch;
    await assert.rejects(dispatchManage({ action: "list_extensions" }, linked, controller.signal), /endpoint-abort/);
  });

  it("the linked timer's PRE-ABORTED arm fires immediately (a signal aborted at schedule time never waits)", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-linkcancel-"));
    const controller = new AbortController();
    let statusPolls = 0;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).endsWith("/manager/queue/status")) {
        statusPolls += 1;
        // abort on the FIRST poll: the drain's NEXT timer schedules
        // with the signal already aborted, and the WRAPPER's
        // pre-aborted arm answers the callback itself — the
        // underlying seat never runs
        if (statusPolls === 1) controller.abort(new Error("drain-abort"));
        return json({ is_processing: true, in_progress_count: 1 });
      }
      return json({});
    }) as typeof fetch;
    const linked = { ...ctx() } as ManageCtx;
    await assert.rejects(
      dispatchManage({ action: "update", force: true, timeout_seconds: 5 }, linked, controller.signal),
      /drain-abort/,
    );
  });

  it("the linked timer's abort LISTENER fires the callback mid-wait (the wrapped seat races the caller's signal)", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-linkcancel-"));
    const controller = new AbortController();
    globalThis.fetch = (async (url: unknown) => String(url).endsWith("/manager/queue/status")
      ? json({ is_processing: true, in_progress_count: 1 })
      : json({})) as typeof fetch;
    const linked = {
      ...ctx(),
      // the REAL timer seat: the callback waits its delay, and the
      // caller's abort (10ms in) must fire it through the wrapper's
      // listener — never the full 1000ms
      timeout: (callback: () => void, delay: number): (() => void) => {
        const t = setTimeout(callback, delay);
        return () => { clearTimeout(t); };
      },
    } as ManageCtx;
    setTimeout(() => controller.abort(new Error("mid-drain-abort")), 10);
    await assert.rejects(
      dispatchManage({ action: "update", force: true, timeout_seconds: 5 }, linked, controller.signal),
      /mid-drain-abort/,
    );
  });

  it("propagates late caller aborts and transport timeouts through the rail", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    const late = new AbortController();
    globalThis.fetch = (async () => ({
      status: 200,
      text: async () => {
        late.abort(new Error("late-abort"));
        return "{}";
      },
    })) as unknown as typeof fetch;
    await assert.rejects(
      run({ action: "list_extensions" }, { signal: late.signal }),
      /late-abort/,
    );

    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    }) as unknown as typeof fetch;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingTimed = run({ action: "list_extensions" });
    await vi.advanceTimersByTimeAsync(300_000);
    const [timedCode, timedEnvelope] = await pendingTimed;
    vi.useRealTimers();
    assert.equal(timedCode, 504);
    assert.match(timedEnvelope.detail, /timed out/);

    const plain = new AbortController();
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })) as typeof fetch;
    const pending = run({ action: "list_extensions" }, { signal: plain.signal });
    plain.abort("plain-rail-abort");
    await assert.rejects(pending, (error: unknown) => (error as Error).name === "AbortError");
  });

  it("propagates endpoint-probe aborts with both reason shapes", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    for (const reason of [new Error("probe-error"), "probe-plain"]) {
      const controller = new AbortController();
      const context = ctx({
        signal: controller.signal,
        endpoint: () => {
          if (!controller.signal.aborted) controller.abort(reason);
          return { provision: "managed", url: "http://engine:8188" };
        },
      });
      globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
        if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
        return json({});
      }) as typeof fetch;
      await assert.rejects(dispatchManage({ action: "status" }, context), (error: unknown) =>
        reason instanceof Error ? error === reason : (error as Error).name === "AbortError",
      );
    }
  });
});

describe("manage queue and child seats", () => {
  it("covers queue deadline, failure, processing, and abort paths without waiting", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-queue-"));
    const abort = new AbortController();
    let statusStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      statusStarted = resolve;
    });
    globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
      if (String(url).endsWith("/manager/queue/status")) {
        statusStarted?.();
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        });
      }
      return json({});
    }) as typeof fetch;
    const aborting = run({ action: "update", force: true, timeout_seconds: 1 }, { signal: abort.signal });
    await started;
    abort.abort("queue-abort");
    await assert.rejects(aborting, (error: unknown) => (error as Error).name === "AbortError");

    const beforeLoop = new AbortController();
    let beforeLoopStatuses = 0;
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).endsWith("/manager/queue/status")) {
        beforeLoopStatuses++;
        return json({});
      }
      if (String(url).endsWith("/manager/queue/start")) {
        return {
          status: 200,
          text: () => ({
            then(resolve: (value: string) => void) {
              resolve("{}");
              queueMicrotask(() => beforeLoop.abort("before-loop"));
            },
          }),
        } as unknown as Response;
      }
      return json({});
    }) as typeof fetch;
    await assert.rejects(
      run({ action: "update", force: true, timeout_seconds: 1 }, { signal: beforeLoop.signal }),
      (error: unknown) => (error as Error).name === "AbortError",
    );
    assert.equal(beforeLoopStatuses, 0);

    const beforeWait = new AbortController();
    globalThis.fetch = (async (url: unknown) => {
      if (String(url).endsWith("/manager/queue/status")) {
        return {
          status: 200,
          text: () => ({
            then(resolve: (value: string) => void) {
              resolve('{"is_processing":true,"in_progress_count":1}');
              queueMicrotask(() => beforeWait.abort("before-wait"));
            },
          }),
        } as unknown as Response;
      }
      return json({});
    }) as typeof fetch;
    await assert.rejects(
      run({ action: "update", force: true, timeout_seconds: 1 }, { signal: beforeWait.signal }),
      (error: unknown) => (error as Error).name === "AbortError",
    );

    let now = vi.spyOn(Date, "now");
    now.mockReset();
    now.mockReturnValueOnce(0).mockReturnValueOnce(1_000);
    const [deadlineCode, deadlineEnvelope] = await run({ action: "update", force: true, timeout_seconds: 1 });
    assert.equal(deadlineCode, 504);
    assert.equal(deadlineEnvelope.state, "timeout");

    now.mockReset();
    now.mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(20);
    globalThis.fetch = (async (url: unknown) => String(url).endsWith("/manager/queue/status")
      ? text("queue failed", 500)
      : json({})) as typeof fetch;
    const [failureCode] = await run({ action: "update", force: true, timeout_seconds: 1 });
    assert.equal(failureCode, 502);

    now.mockReset();
    now.mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(1_000);
    const [errorDeadlineCode] = await run({ action: "update", force: true, timeout_seconds: 1 });
    assert.equal(errorDeadlineCode, 504);

    now.mockReset();
    now.mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(1_000);
    globalThis.fetch = (async (url: unknown) => String(url).endsWith("/manager/queue/status")
      ? json({ is_processing: true, in_progress_count: 1 })
      : json({})) as typeof fetch;
    const [stuckCode, stuckEnvelope] = await run({ action: "update", force: true, timeout_seconds: 1 });
    assert.equal(stuckCode, 504);
    assert.match(stuckEnvelope.detail, /queue did not drain/);

    now.mockReset();
    now.mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValue(20);
    globalThis.fetch = (async (url: unknown) => String(url).endsWith("/manager/queue/status")
      ? json({ is_processing: true, in_progress_count: 1 })
      : json({})) as typeof fetch;
    const waiting = new AbortController();
    const pendingWait = run(
      { action: "update", force: true, timeout_seconds: 1 },
      { signal: waiting.signal, timeout: (_callback: () => void, delay: number) => {
        if (delay === 1_000) waiting.abort("wait-abort");
        return () => {};
      } },
    );
    await assert.rejects(pendingWait, (error: unknown) => (error as Error).name === "AbortError");
  });

  it("covers journal and systemctl success, errors, bounds, and cancellation", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-child-"));
    const calls: Array<{ readonly file: string; readonly args: readonly string[]; readonly options: Record<string, unknown> }> = [];
    child.run = async (file, args, options) => {
      calls.push({ file, args, options });
      return { stdout: "first\nsecond\n", stderr: "" };
    };
    const [logsCode, logsEnvelope] = await run({ action: "logs", tail: 0 });
    assert.equal(logsCode, 200);
    assert.deepEqual(logsEnvelope.data, ["first", "second"]);
    assert.deepEqual(calls[0]?.args.slice(0, 4), ["--user", "-u", "melite-comfyui.service", "-n"]);
    assert.equal(calls[0]?.args[4], "1");

    child.run = async () => {
      throw new Error("journal failed");
    };
    const [journalCode, journalEnvelope] = await run({ action: "logs" });
    assert.equal(journalCode, 503);
    assert.match(journalEnvelope.detail, /journal failed/);

    const logAbort = new AbortController();
    child.run = async (_file, _args, options) => await new Promise<ChildResult>((_resolve, reject) => {
      (options["signal"] as AbortSignal | undefined)?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
    const pendingLogs = run({ action: "logs" }, { signal: logAbort.signal });
    logAbort.abort(new Error("journal-abort"));
    await assert.rejects(pendingLogs, /journal-abort/);

    child.run = async () => ({ stdout: "", stderr: "" });
    const [stopCode, stopEnvelope] = await run({ action: "stop", force: true });
    assert.equal(stopCode, 200);
    assert.equal(stopEnvelope.next_action, "launch");
    const [launchCode, launchEnvelope] = await run({ action: "launch" });
    assert.equal(launchCode, 200);
    assert.equal(launchEnvelope.next_action, "status");

    child.run = async () => {
      const error = new Error("systemctl-message") as Error & { stderr?: string };
      throw error;
    };
    const [messageCode, messageEnvelope] = await run({ action: "stop", force: true });
    assert.equal(messageCode, 500);
    assert.match(messageEnvelope.detail, /systemctl-message/);

    child.run = async () => {
      const error = new Error("outer") as Error & { stderr?: string };
      error.stderr = "systemctl-stderr";
      throw error;
    };
    const [stderrCode, stderrEnvelope] = await run({ action: "stop", force: true });
    assert.equal(stderrCode, 500);
    assert.match(stderrEnvelope.detail, /systemctl-stderr/);

    const systemAbort = new AbortController();
    child.run = async (_file, _args, options) => await new Promise<ChildResult>((_resolve, reject) => {
      (options["signal"] as AbortSignal | undefined)?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
    const pendingStop = run({ action: "stop", force: true }, { signal: systemAbort.signal });
    systemAbort.abort("system-abort");
    await assert.rejects(pendingStop, (error: unknown) => (error as Error).name === "AbortError");
  });
});

describe("manage status projections", () => {
  const statusRoute = (versions: unknown = { versions: [] }): void => {
    globalThis.fetch = (async (url: unknown) => {
      const value = String(url);
      if (value.endsWith("/system_stats")) return json({ system: { comfyui_version: "1" }, devices: [] });
      if (value.endsWith("/comfyui_manager/comfyui_versions")) return json(versions);
      if (value.endsWith("/manager/version")) return json({ version: "3" });
      return json({ is_processing: false });
    }) as typeof fetch;
  };

  it("normalizes operation rows, item fields, engine boots, and next actions", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    const boot = join(root, "data", "runtime", "comfyui");
    mkdirSync(boot, { recursive: true });
    writeFileSync(join(boot, ".estate-engine-boot.json"), JSON.stringify({ boot_at: Date.now(), source: 7 }));
    statusRoute();
    const correlated = extensionRef("correlated");
    const preserved = extensionRef("preserved");
    const installed = extensionRef("installed");
    const failed = extensionRef("failed");
    const unowned = extensionRef("unowned");
    const normalResource = extensionRef("normal");
    const resources: ResourceStatus[] = [
      {
        ref: correlated,
        state: "active",
        detail: "resource-detail",
        items: [{
          key: "extension:correlated",
          kind: "extension",
          state: "restart_required",
          path: "/packs/correlated",
          sha256: "a",
          integrity: "declared-sha256",
          errorCode: "warning",
          detail: "present",
        }],
      },
      {
        ref: preserved,
        state: "active",
        items: [{ key: "extension:preserved", kind: "extension", state: "active" }],
      },
      { ref: installed, state: "installed", operationId: "op-installed", items: [] },
      { ref: failed, state: "failed", operationId: "op-failed", detail: "failed-detail", items: [] },
      { ref: unowned, state: "active", items: [] },
      { ref: normalResource, state: "active", operationId: "op-normal", items: [] },
    ];
    const statusProvisioning = {
      ...provisioning,
      reconcile: async () => resources,
      operationOf: (ref: ResourceRef) => {
        if (ref.kind !== "extension") return undefined;
        if (ref.id === "correlated") return {
          operationId: "op-correlated",
          ref,
          state: "restart_required",
          items: [{
            key: "extension:correlated",
            kind: "extension",
            state: "restart_required",
            path: "/packs/correlated",
            sha256: "a",
            integrity: "declared-sha256",
            errorCode: "warning",
            detail: "present",
          }],
          startedAt: Date.now(),
        };
        if (ref.id === "preserved") return {
          operationId: "op-preserved",
          ref,
          state: "active",
          items: [{ key: "extension:preserved", kind: "extension", state: "active" }],
          detail: "operation-detail",
          startedAt: Date.now(),
        };
        if (ref.id === "installed") return {
          operationId: "op-installed",
          ref,
          state: "installed",
          items: [],
          startedAt: Date.now(),
        };
        if (ref.id === "failed") throw new Error("operation lookup failed");
        return undefined;
      },
    } as unknown as ProvisioningServiceDefinition;
    const [, envelope] = await run({ action: "status" }, { provisioning: statusProvisioning });
    const data = envelope.data as {
      engine_boot: { known: boolean; source: string };
      next_action: string;
      resources: Array<{ state: string; operation_id?: string; detail?: string }>;
      operations: Array<{ next_action: string; state: string }>;
    };
    assert.equal(data.engine_boot.known, true);
    assert.equal(data.engine_boot.source, "estate");
    assert.equal(data.next_action, "restart");
    assert.deepEqual(data.resources.map((row) => row.state), ["restart_required", "active", "installed", "failed", "active", "active"]);
    assert.equal(data.resources[1]?.operation_id, "op-preserved");
    assert.equal(data.resources[1]?.detail, "operation-detail");
    assert.equal(data.resources[2]?.operation_id, "op-installed");
    assert.equal(data.resources[3]?.operation_id, "op-failed");
    assert.equal(data.resources[4]?.operation_id, undefined);
    assert.equal(data.resources[5]?.operation_id, "op-normal");
    assert.equal(data.operations.find((row) => row.state === "restart_required")?.next_action, "restart");
    assert.equal(data.operations.find((row) => row.state === "installed")?.next_action, "restart");
    assert.equal(data.operations.find((row) => row.state === "failed")?.next_action, "status");
    assert.equal(data.operations.find((row) => row.state === "active")?.next_action, "status");

    writeFileSync(join(boot, ".estate-engine-boot.json"), JSON.stringify({ boot_at: Date.now() + 60_000, source: "future" }));
    const [, future] = await run({ action: "status" }, { provisioning: statusProvisioning });
    assert.equal(((future.data as { engine_boot: { age_seconds: number } }).engine_boot.age_seconds), 0);
    writeFileSync(join(boot, ".estate-engine-boot.json"), JSON.stringify({ boot_at: "bad" }));
    const [, malformed] = await run({ action: "status" }, { provisioning: statusProvisioning });
    assert.equal((malformed.data as { engine_boot: { known: boolean } }).engine_boot.known, false);

    statusRoute();
    const [, down] = await run({ action: "status" }, { endpoint: () => ({ provision: "managed" }) });
    assert.equal((down.data as { next_action: string }).next_action, "launch");
    statusRoute();
    const [, normal] = await run({ action: "status" });
    assert.equal((normal.data as { next_action: string }).next_action, "status");
    const installedOnlyRef = extensionRef("installed-only");
    const installedOnly = {
      ...provisioning,
      reconcile: async () => [{ ref: installedOnlyRef, state: "installed", items: [] }],
    } as unknown as ProvisioningServiceDefinition;
    const [, installedStatus] = await run({ action: "status" }, { provisioning: installedOnly });
    assert.equal((installedStatus.data as { next_action: string }).next_action, "restart");
  });

  it("rejects a caller aborted after the manager promises settle", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    const controller = new AbortController();
    globalThis.fetch = (async (url: unknown) => {
      const value = String(url);
      if (value.endsWith("/system_stats")) return json({ system: {}, devices: [] });
      if (value.endsWith("/comfyui_manager/comfyui_versions")) {
        return {
          status: 200,
          text: () => ({
            then(resolve: (body: string) => void) {
              resolve('{"versions":[]}');
              queueMicrotask(() => controller.abort("status-settled"));
            },
          }),
        } as unknown as Response;
      }
      return json({});
    }) as typeof fetch;
    await assert.rejects(
      run({ action: "status" }, { signal: controller.signal }),
      (error: unknown) => (error as Error).name === "AbortError",
    );
  });

  it("projects every model-declaration and version-list shape", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    const declarations = [
      { id: "bare" },
      { id: "empty-label", label: "", engine: "" },
      { id: "hidden", unoffered: true },
      { id: "other", engine: "other" },
      {
        id: "full",
        label: "Full",
        description: "description",
        genre: "video",
        engine: "comfyui",
         variants: [
           { id: "empty", label: "", cells: [] },
           { id: "no-cells", label: "no-cells" },
           { id: "hidden-variant", label: "hidden", hide_from_dropdown: true, cells: [{ quant: "q4" }] },
          {
            id: "variant",
            label: "Variant",
            description: "variant-description",
            cells: [
              { quant: "", label: "empty" },
              { quant: "hidden", hide_from_dropdown: true },
              { quant: "fp8", label: "", description: "quant-description" },
            ],
          },
          { id: "fallback", label: "", cells: [{ quant: "q4" }] },
        ],
      },
    ];
    const modelContext = { allDecls: () => declarations } as unknown as ManageCtx["models"];
    statusRoute([
      "",
      "duplicate",
      "duplicate",
      3,
      null,
      {},
      { id: "" },
      { id: "id-only" },
      { commit: "commit-only" },
      { tag: "tag-only" },
      { version: "same", tag: "same" },
      { version: "version", tag: "tag", commit: "commit" },
      { version: "version-only" },
    ]);
    const [, modelEnvelope] = await run({ action: "status" }, { models: modelContext });
    const modelData = modelEnvelope.data as {
      model_options: Array<{ id: string; label: string; description?: string; genre?: string; variants: Array<{ label: string; description?: string; quants: Array<{ label: string; description?: string }> }> }>;
      comfyui_versions: Array<{ id: string; label: string }>;
    };
    assert.deepEqual(modelData.model_options.map((row) => row.id), ["bare", "empty-label", "full"]);
    assert.equal(modelData.model_options[2]?.label, "Full");
    assert.equal(modelData.model_options[2]?.description, "description");
    assert.equal(modelData.model_options[2]?.genre, "video");
    assert.equal(modelData.model_options[2]?.variants[0]?.label, "Variant");
    assert.equal(modelData.model_options[2]?.variants[0]?.description, "variant-description");
    assert.equal(modelData.model_options[2]?.variants[0]?.quants[0]?.description, "quant-description");
    assert.equal(modelData.model_options[2]?.variants[1]?.label, "fallback");
    assert.deepEqual(modelData.model_options[2]?.variants[0]?.quants.map((row) => row.label), ["fp8"]);
    assert.equal(JSON.stringify(modelData.model_options).includes('"url"'), false);
    assert.deepEqual(modelData.comfyui_versions.map((row) => row.id), ["duplicate", "3", "id-only", "commit-only", "tag-only", "same", "version", "version-only"]);
    assert.equal(modelData.comfyui_versions.find((row) => row.id === "version")?.label, "version — tag");

    for (const document of [{ tags: [{ tag: "tag-doc" }] }, { data: [{ version: "data-doc" }] }, { latest: { version: "entry-doc" } }, 7]) {
      statusRoute(document);
      const [, envelope] = await run({ action: "status" }, { models: modelContext });
      assert.equal(Array.isArray((envelope.data as { comfyui_versions: unknown[] }).comfyui_versions), true);
    }

    const unavailable = {} as ManageCtx["models"];
    statusRoute();
    const [, unavailableEnvelope] = await run({ action: "status" }, { models: unavailable });
    assert.match(((unavailableEnvelope.data as { model_options_detail: string }).model_options_detail), /unavailable/);
    const errorModels = { allDecls: () => { throw new Error("catalog failed"); } } as unknown as ManageCtx["models"];
    const [, errorEnvelope] = await run({ action: "status" }, { models: errorModels });
    assert.match(((errorEnvelope.data as { model_options_detail: string }).model_options_detail), /catalog failed/);
    const plainModels = { allDecls: () => { throw "catalog-plain"; } } as unknown as ManageCtx["models"];
    const [, plainEnvelope] = await run({ action: "status" }, { models: plainModels });
    assert.match(((plainEnvelope.data as { model_options_detail: string }).model_options_detail), /catalog-plain/);
  });

  it("keeps model and version catalogs independent from Manager legs", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    const modelContext = {
      allDecls: () => [{
        id: "declared",
        label: "Declared",
        engine: "comfyui",
        variants: [{ id: "variant", cells: [{ quant: "q4", label: "Q4" }] }],
      }],
    } as unknown as ManageCtx["models"];
    globalThis.fetch = (async (url: unknown) => {
      const value = String(url);
      if (value.endsWith("/system_stats")) return json({ system: {}, devices: [] });
      if (value.endsWith("/manager/version")) return json({ version: "3" });
      if (value.endsWith("/manager/queue/status")) return json({ is_processing: false });
      if (value.endsWith("/comfyui_manager/comfyui_versions")) return text("version catalog down", 503);
      return json({});
    }) as typeof fetch;

    const [, versionFailure] = await run({ action: "status" }, { models: modelContext });
    const versionData = versionFailure.data as {
      manager: { reachable: boolean };
      model_options: Array<{ id: string }>;
      comfyui_versions: unknown[];
      comfyui_versions_detail: string;
    };
    assert.equal(versionData.manager.reachable, true);
    assert.deepEqual(versionData.model_options.map((row) => row.id), ["declared"]);
    assert.deepEqual(versionData.comfyui_versions, []);
    assert.match(versionData.comfyui_versions_detail, /version catalog down/);

    globalThis.fetch = (async (url: unknown) => {
      const value = String(url);
      if (value.endsWith("/system_stats")) return json({ system: {}, devices: [] });
      if (value.endsWith("/manager/version")) return json({ version: "3" });
      if (value.endsWith("/manager/queue/status")) return text("queue down", 503);
      if (value.endsWith("/comfyui_manager/comfyui_versions")) return json({ versions: ["nightly"] });
      return json({});
    }) as typeof fetch;
    const [, queueFailure] = await run({ action: "status" }, { models: modelContext });
    const queueData = queueFailure.data as {
      manager: { reachable: boolean; reason: string };
      model_options: Array<{ id: string }>;
      comfyui_versions: Array<{ id: string }>;
    };
    assert.equal(queueData.manager.reachable, false);
    assert.match(queueData.manager.reason, /queue down/);
    assert.deepEqual(queueData.model_options.map((row) => row.id), ["declared"]);
    assert.deepEqual(queueData.comfyui_versions.map((row) => row.id), ["nightly"]);

    const emptyModels = { allDecls: () => [] } as unknown as ManageCtx["models"];
    const [, emptyCatalog] = await run({ action: "status" }, { models: emptyModels });
    const emptyData = emptyCatalog.data as { model_options: unknown[]; model_options_detail?: string };
    assert.deepEqual(emptyData.model_options, []);
    assert.equal(emptyData.model_options_detail, undefined);
  });

  it("uses the same normalized version rows for status and switching", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    let posted: unknown;
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      const value = String(url);
      if (value.endsWith("/system_stats")) return json({ system: {}, devices: [] });
      if (value.endsWith("/manager/version")) return json({ version: "3" });
      if (value.endsWith("/manager/queue/status")) return json({ is_processing: false });
      if (value.endsWith("/comfyui_manager/comfyui_versions")) return json({ stable: "0.3.40", nightly: "0.4.0" });
      if (init?.method === "POST") {
        posted = JSON.parse(String(init.body));
        return json({});
      }
      return json({});
    }) as typeof fetch;

    const [, status] = await run({ action: "status" });
    const statusData = status.data as { comfyui_versions: Array<{ id: string; label: string; version?: string; tag?: string }> };
    assert.deepEqual(statusData.comfyui_versions, [
      { id: "0.3.40", label: "0.3.40 — stable", version: "0.3.40", tag: "stable" },
      { id: "0.4.0", label: "0.4.0 — nightly", version: "0.4.0", tag: "nightly" },
    ]);

    const [switchCode, switched] = await run({ action: "switch_version", version: "0.3.40", force: true });
    assert.equal(switchCode, 200);
    assert.match(switched.detail, /switch to 0.3.40 issued/);
    assert.deepEqual(posted, { ver: "0.3.40" });
  });

  // ── THE ABSENT PROVISIONING SEAT (2026-09-26) ────────────────────
  // The live defect, in the shape it actually shipped: a maker lane
  // does not mount the provisioning composition, the status door
  // dereferenced the seat behind a try/catch, and the raw TypeError
  // came back as a STATUS FIELD —
  //   resources_detail: "Cannot read properties of undefined
  //                      (reading 'reconcile')"
  // — a crash wearing a data costume, on the one door an operator
  // reads to decide what the estate is doing.
  it("status with NO provisioning seat still answers, and names the absence in words", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-seatless-"));
    statusRoute();
    const [code, envelope] = await run({ action: "status" }, { provisioning: undefined });
    assert.equal(code, 200, "the status door answers without the seat");
    const data = envelope.data as {
      resources: unknown[];
      resources_detail?: string;
      endpoint: Record<string, unknown>;
      active_runs: unknown;
      routing: Record<string, unknown>;
    };
    // the absence is REPORTED, not thrown, and not a TypeError string
    assert.deepEqual(data.resources, []);
    assert.match(String(data.resources_detail), /provisioning seat is not mounted/);
    assert.doesNotMatch(JSON.stringify(envelope), /Cannot read properties/);
    // …and the rest of the status is still live: the door degraded one
    // section, it did not go dark
    assert.ok(data.endpoint !== undefined);
    assert.ok(Array.isArray(data.active_runs));
    assert.ok(data.routing !== undefined);
  });

  it("a MUTATION with no provisioning seat refuses 503 naming the seat (never a TypeError)", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-mutate-seatless-"));
    statusRoute();
    // every mutation arm goes through the one gate — a missing seat is
    // "there is nothing to install through", not a crash
    // the door's contract is an ENVELOPE, not a throw: a Refused
    // becomes [code, refusalEnvelope] at the dispatch boundary
    for (const action of [
      { action: "install_extension", nodes: ["a-pack"] },
      { action: "install_extension_url", url: "https://example.invalid/pack.tar.gz" },
    ]) {
      const [code, envelope] = await run(action, { provisioning: undefined });
      assert.equal(code, 503, `${action.action} refuses 503`);
      assert.match(String(envelope.detail), /provisioning seat is not mounted/, action.action);
      assert.doesNotMatch(JSON.stringify(envelope), /Cannot read properties/, action.action);
      // and it does not blame the declaration for a missing provisioner
      assert.doesNotMatch(String(envelope.detail), /is not declared/, action.action);
    }

    // provision_model's SEAT gate comes before its family→card
    // fallback, and that order is the point: on a seatless lane EVERY
    // provision fails for one reason, so a per-model 404 ("unknown
    // model") would be a lie about the cause. Both a declared and an
    // undeclared id answer the same true 503.
    const [undeclaredCode, undeclaredEnvelope] = await run(
      { action: "provision_model", model: "not-a-family" },
      { provisioning: undefined },
    );
    assert.equal(undeclaredCode, 503, "a seatless lane answers 503 even for an unknown id");
    assert.match(String(undeclaredEnvelope.detail), /provisioning seat is not mounted/);
    const declaredModels = {
      allDecls: () => [{ id: "trellis2-native", variants: [] }],
    } as unknown as ManageCtx["models"];
    const [declaredCode, declaredEnvelope] = await run(
      { action: "provision_model", model: "trellis2-native" },
      { provisioning: undefined, models: declaredModels },
    );
    assert.equal(declaredCode, 503, "a DECLARED model on a seatless lane refuses 503 too");
    assert.match(String(declaredEnvelope.detail), /provisioning seat is not mounted/);
    assert.doesNotMatch(JSON.stringify(declaredEnvelope), /Cannot read properties/);
  });

  it("a HALF-mounted seat (present but not a provisioner) reads as absent, not as a crash", async () => {
    // the shape an unchecked `as ProvisioningServiceDefinition` cast
    // invites: the key resolves, the object is not a provisioner
    root = mkdtempSync(join(tmpdir(), "manage-halfseat-"));
    statusRoute();
    const half = {} as unknown as ProvisioningServiceDefinition;
    const [, envelope] = await run({ action: "status" }, { provisioning: half });
    assert.match(String((envelope.data as { resources_detail?: string }).resources_detail), /provisioning seat is not mounted/);
    assert.doesNotMatch(JSON.stringify(envelope), /Cannot read properties/);
  });

  it("normalizes reconcile errors and timeout details", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-status-"));
    statusRoute();
    const throwing = { ...provisioning, reconcile: async () => { throw new Error("reconcile failed"); } } as unknown as ProvisioningServiceDefinition;
    const [, failed] = await run({ action: "status" }, { provisioning: throwing });
    assert.equal((failed.data as { resources_detail: string }).resources_detail, "reconcile failed");
    const plain = { ...provisioning, reconcile: async () => { throw "reconcile plain"; } } as unknown as ProvisioningServiceDefinition;
    const [, plainEnvelope] = await run({ action: "status" }, { provisioning: plain });
    assert.equal((plainEnvelope.data as { resources_detail: string }).resources_detail, "reconcile plain");

    const hangOnSignal = (signal: AbortSignal): Promise<never> =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    const completed = {
      ...provisioning,
      reconcile: async (_scope: unknown, signal: AbortSignal) => await hangOnSignal(signal),
    } as unknown as ProvisioningServiceDefinition;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingTimeout = run({ action: "status" }, { provisioning: completed });
    await vi.advanceTimersByTimeAsync(1_500);
    const [timeoutCode, timeoutEnvelope] = await pendingTimeout;
    vi.useRealTimers();
    assert.equal(timeoutCode, 200);
    assert.match((timeoutEnvelope.data as { resources_detail: string }).resources_detail, /timed out/);

    const rejecting = {
      ...provisioning,
      reconcile: async (_scope: unknown, signal: AbortSignal) => {
        if (signal.aborted) throw new Error("reconcile aborted");
        return await hangOnSignal(signal);
      },
    } as unknown as ProvisioningServiceDefinition;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingRejected = run({ action: "status" }, { provisioning: rejecting });
    await vi.advanceTimersByTimeAsync(1_500);
    const [, rejected] = await pendingRejected;
    vi.useRealTimers();
    assert.match((rejected.data as { resources_detail: string }).resources_detail, /timed out/);

    const controller = new AbortController();
    const aborting = {
      ...provisioning,
      reconcile: async () => {
        controller.abort("reconcile-abort");
        return [];
      },
    } as unknown as ProvisioningServiceDefinition;
    await assert.rejects(
      run({ action: "status" }, { signal: controller.signal, provisioning: aborting }),
      (error: unknown) => (error as Error).name === "AbortError",
    );
  });
});

describe("manage provisioning and snapshot coverage", () => {
  it("covers install cancellation, string failures, merged states, and item fields", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-provision-"));
    const declared = extensionRef("declared");
    const plan = extensionPlan(declared.id);
    provisioning.plans.set(resourceKey(declared), plan);
    provisioning.outcomes.set(resourceKey(declared), "ensure-plain");
    const [plainCode, plainEnvelope] = await run({ action: "install_extension", nodes: [declared.id] });
    assert.equal(plainCode, 500);
    assert.match((plainEnvelope.data as { misses: string[] }).misses[0] ?? "", /ensure-plain/);

    const internalPlan = {
      ...provisioning,
      plan: () => new Promise<ProvisionPlan>(() => {}),
    } as unknown as ProvisioningServiceDefinition;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingInternal = run(
      { action: "install_extension", nodes: [declared.id] },
      { provisioning: internalPlan },
    );
    await vi.advanceTimersByTimeAsync(300_000);
    const [internalCode, internalEnvelope] = await pendingInternal;
    vi.useRealTimers();
    assert.equal(internalCode, 504);
    assert.match(internalEnvelope.detail, /timed out/);

    const cancelled = extensionRef("cancelled");
    const blocked = extensionRef("blocked");
    const cancelledPlan = extensionPlan(cancelled.id);
    const blockedPlan = extensionPlan(blocked.id);
    provisioning.plans.set(resourceKey(cancelled), cancelledPlan);
    provisioning.plans.set(resourceKey(blocked), blockedPlan);
    provisioning.outcomes.set(resourceKey(cancelled), provisionResult(cancelled, "cancelled", cancelledPlan, { detail: "cancelled" }));
    provisioning.outcomes.set(resourceKey(blocked), provisionResult(blocked, "blocked", blockedPlan, { detail: "blocked" }));
    const [mergedCode, mergedEnvelope] = await run({ action: "install_extension", nodes: [cancelled.id, blocked.id] });
    assert.equal(mergedCode, 409);
    assert.equal(mergedEnvelope.state, "cancelled");

    const richRef = extensionRef("rich");
    const richPlan = extensionPlan(richRef.id);
    provisioning.plans.set(resourceKey(richRef), richPlan);
    provisioning.outcomes.set(resourceKey(richRef), provisionResult(richRef, "failed", richPlan, {
      items: [{
        key: richPlan.items[0]!.key,
        kind: "extension",
        state: "failed",
        outcome: "failed",
        path: "/packs/rich",
        sha256: "b",
        integrity: "operator-unverified",
        errorCode: "manager/failed",
      }],
      detail: "rich failure",
    }));
    const [richCode, richEnvelope] = await run({ action: "install_extension", nodes: [richRef.id] });
    assert.equal(richCode, 500);
    assert.deepEqual((richEnvelope.data as { errors: Array<{ error: string }> }).errors, [{ file: richPlan.items[0]!.key, error: "manager/failed" }]);
    assert.equal((richEnvelope.data as { items: Array<{ path?: string }> }).items[0]?.path, "/packs/rich");

    const model = modelRef("model");
    const modelDeclaration = modelPlan(model);
    provisioning.plans.set(resourceKey(model), modelDeclaration);
    provisioning.outcomes.set(resourceKey(model), provisionResult(model, "active", modelDeclaration));
    const [modelCode] = await run({ action: "provision_model", model: model.id });
    assert.equal(modelCode, 200);
    const [downloadCode] = await run({
      action: "download_model",
      url: "http://engine:8188/file.bin",
      filename: "file.bin",
      relative_path: "models",
    });
    assert.equal(downloadCode, 200);
  });

  it("covers model-plan caller and internal cancellation paths", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-provision-"));
    const model = modelRef("model");
    const declaration = modelPlan(model);
    const caller = new AbortController();
    const first = {
      ...provisioning,
      plan: async (ref: ResourceRef) => {
        if (ref.kind === "model" && ref.owner === "family") {
          caller.abort(new Error("family abort"));
          return declaration;
        }
        return declaration;
      },
    } as unknown as ProvisioningServiceDefinition;
    await assert.rejects(
      run({ action: "provision_model", model: model.id }, { signal: caller.signal, provisioning: first }),
      /family abort/,
    );

    const internalFamily = {
      ...provisioning,
      plan: () => new Promise<ProvisionPlan>(() => {}),
    } as unknown as ProvisioningServiceDefinition;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingInternal = run(
      { action: "provision_model", model: model.id },
      { provisioning: internalFamily },
    );
    await vi.advanceTimersByTimeAsync(300_000);
    const [internalCode, internalEnvelope] = await pendingInternal;
    vi.useRealTimers();
    assert.equal(internalCode, 504);
    assert.equal(internalEnvelope.state, "timeout");

    const secondCaller = new AbortController();
    const callerCard = {
      ...provisioning,
      plan: (ref: ResourceRef) => {
        if (ref.kind === "model" && ref.owner === "family") return Promise.reject(new Error("family missing"));
        secondCaller.abort(new Error("card caller"));
        return Promise.resolve(declaration);
      },
    } as unknown as ProvisioningServiceDefinition;
    await assert.rejects(
      run({ action: "provision_model", model: model.id }, { signal: secondCaller.signal, provisioning: callerCard }),
      /card caller/,
    );

    const plainCard = {
      ...provisioning,
      plan: (ref: ResourceRef) => ref.kind === "model" && ref.owner === "family"
        ? Promise.reject(new Error("family missing"))
        : Promise.reject("card plain"),
    } as unknown as ProvisioningServiceDefinition;
    const [plainCode, plainEnvelope] = await run(
      { action: "provision_model", model: model.id },
      { provisioning: plainCard },
    );
    assert.equal(plainCode, 404);
    assert.equal(plainEnvelope.detail, "card plain");

    const second = {
      ...provisioning,
      plan: (ref: ResourceRef) => {
        if (ref.kind === "model" && ref.owner === "family") return Promise.reject(new Error("family missing"));
        return new Promise<ProvisionPlan>(() => {});
      },
    } as unknown as ProvisioningServiceDefinition;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingSecond = run(
      { action: "provision_model", model: model.id },
      { provisioning: second },
    );
    await vi.advanceTimersByTimeAsync(300_000);
    const [secondCode, secondEnvelope] = await pendingSecond;
    vi.useRealTimers();
    assert.equal(secondCode, 504);
    assert.equal(secondEnvelope.state, "timeout");
  });

  it("preserves all refusal data fields", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-provision-"));
    const data = {
      state: "failed",
      next_action: "retry",
      operation_id: "op-refused",
      operations: [],
      items: [],
      requested: ["x"],
      succeeded: [],
      missed: ["x"],
      misses: ["x failed"],
      partial: true,
      restart_required: true,
      invalid: "ignored",
    };
    const ref = modelRef("x");
    const declaration = modelPlan(ref);
    const refusing = {
      ...provisioning,
      plan: async () => declaration,
      ensure: async () => { throw new Refused(409, "refused", data); },
    } as unknown as ProvisioningServiceDefinition;
    const [code, envelope] = await run({ action: "provision_model", model: "x" }, { provisioning: refusing });
    assert.equal(code, 409);
    assert.equal(envelope.operation_id, "op-refused");
    assert.equal(envelope.restart_required, true);
    assert.equal(envelope.partial, true);
    assert.deepEqual(envelope.requested, ["x"]);

    const malformed = {
      ...provisioning,
      plan: async () => declaration,
      ensure: async () => {
        throw new Refused(422, "malformed refusal", {
          state: 1,
          next_action: 2,
          operation_id: 3,
          operations: {},
          items: {},
          requested: {},
          succeeded: {},
          missed: {},
          misses: {},
          partial: "yes",
          restart_required: "yes",
        });
      },
    } as unknown as ProvisioningServiceDefinition;
    const [malformedCode, malformedEnvelope] = await run(
      { action: "provision_model", model: ref.id },
      { provisioning: malformed },
    );
    assert.equal(malformedCode, 422);
    assert.equal(malformedEnvelope.state, undefined);
    assert.equal(malformedEnvelope.next_action, undefined);
  });

  it("normalizes every snapshot list and name shape", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-snapshot-"));
    const documents: unknown[] = [
      ["plain", { name: "name" }, { filename: "filename" }, { file: "file" }, { other: "fallback" }, 9],
      null,
      { snapshots: [{ snapshot: "snap" }] },
      { data: { items: ["nested"] } },
      { other: [] },
    ];
    for (const document of documents) {
      globalThis.fetch = (async () => json(document)) as typeof fetch;
      const [code] = await run({ action: "snapshot_list" });
      assert.equal(code, 200);
    }

    const responseNames: Array<{ readonly response: unknown; readonly expected?: string }> = [
      { response: "direct", expected: "direct" },
      { response: { name: "from-name" }, expected: "from-name" },
      { response: { snapshot: "", name: "from-name" }, expected: "from-name" },
      { response: { snapshot: "?", name: "", filename: "from-filename" }, expected: "from-filename" },
      { response: { snapshot: "?", name: "?", filename: "", file: "from-file" }, expected: "from-file" },
      { response: { data: { name: "from-data" } }, expected: "from-data" },
      { response: { data: "invalid" }, expected: "invalid" },
      { response: 9 },
    ];
    for (const { response, expected } of responseNames) {
      let listCalls = 0;
      globalThis.fetch = (async (url: unknown) => {
        if (String(url).includes("/snapshot/save")) return json(response);
        listCalls++;
        return json({ items: [] });
      }) as typeof fetch;
      const [code, envelope] = await run({ action: "snapshot_save" });
      if (expected === undefined) {
        assert.equal(code, 502);
      } else {
        assert.equal(code, 200);
        assert.match(envelope.detail, new RegExp(`snapshot saved: ${expected}`));
      }
      assert.equal(listCalls, 2);
    }

    for (const added of [["fresh"], ["?"], [""]]) {
      let listCalls = 0;
      globalThis.fetch = (async (url: unknown) => {
        if (String(url).includes("/snapshot/save")) return json("response-name");
        listCalls++;
        return json({ items: listCalls === 1 ? [] : added });
      }) as typeof fetch;
      const [code, envelope] = await run({ action: "snapshot_save" });
      assert.equal(code, 200);
      assert.match(envelope.detail, added[0] === "fresh" ? /snapshot saved: fresh/ : /response-name/);
    }

    const controller = new AbortController();
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })) as typeof fetch;
    const pending = run({ action: "snapshot_save" }, { signal: controller.signal });
    controller.abort(new Error("snapshot abort"));
    await assert.rejects(pending, /snapshot abort/);
  });

  it("covers endpoint-set timeout and caller cancellation", async () => {
    root = mkdtempSync(join(tmpdir(), "manage-endpoint-"));
    const config = join(root, "endpoint.json");
    process.env.COMFYUI_ENDPOINT_CONFIG = config;
    writeFileSync(config, JSON.stringify({ url: "http://old", provision: "managed" }));
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return json({ system: {} });
    }) as typeof fetch;
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    }) as typeof fetch;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pendingProbe = run({ action: "endpoint_set", url: "http://new:8188" });
    await vi.advanceTimersByTimeAsync(5_000);
    const [code, envelope] = await pendingProbe;
    vi.useRealTimers();
    assert.equal(code, 504);
    assert.equal(envelope.state, "timeout");

    const controller = new AbortController();
    globalThis.fetch = (async () => {
      controller.abort(new Error("endpoint caller abort"));
      throw new DOMException("aborted", "AbortError");
    }) as typeof fetch;
    await assert.rejects(
      run({ action: "endpoint_set", url: "http://new:8188" }, { signal: controller.signal }),
      /endpoint caller abort/,
    );
  });
});
