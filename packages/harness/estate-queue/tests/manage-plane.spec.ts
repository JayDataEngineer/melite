// manage-plane.spec.ts — the management plane through dispatchManage:
// the parse law, the lifecycle guard, every handler's happy + refusal
// arms, and the envelope mapping. Fetch is routed per test, systemctl
// / journalctl ride a tmpbin, state roots are temp dirs.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resourceKey, ProvisioningService } from "@melite/estate-provisioning";
import type {
  ModelProvisionPlanItem,
  ProvisionItemResult,
  ProvisionOperation,
  ProvisionOutcome,
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisionResult,
  ProvisioningServiceDefinition,
  ProvisioningConfig,
  ExternalProvisionRequest,
  ProvisionState,
  ResourceRef,
  ResourceStatus,
} from "@melite/estate-provisioning";
import { Context } from "@deepseek-ai/cordis";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { resolveStateRoot } from "../src/queueLock.ts";
import { rootsManifest } from "../src/rootsManifest.ts";

const realFetch = globalThis.fetch;
const realPath = process.env.PATH ?? "";

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const text = (v: string, status = 200): Response =>
  new Response(v, { status });

// ── harness ─────────────────────────────────────────────────────────
let ROOT = "";
type ModelRef = Extract<ResourceRef, { kind: "model" }>;
type ExtensionRef = Extract<ResourceRef, { kind: "extension" }>;
type ExtensionItem = Extract<ProvisionPlanItem, { kind: "extension" }>;
type FakeOutcome = ProvisionResult | Error | string;
type FakeProvisioning = ProvisioningServiceDefinition & {
  plans: Map<string, ProvisionPlan>;
  outcomes: Map<string, FakeOutcome>;
  planCalls: ResourceRef[];
  ensureCalls: ResourceRef[];
  reset: () => void;
};

const modelRef = (
  id: string,
  owner: "family" | "card" = "family",
  variant?: string,
  quant?: string,
): ModelRef => ({
  kind: "model",
  owner,
  id,
  ...(variant === undefined ? {} : { variant }),
  ...(quant === undefined ? {} : { quant }),
});
const extensionRef = (id: string): ExtensionRef => ({ kind: "extension", id });
const undeclared = (ref: ResourceRef): Error =>
  new Error(
    ref.kind === "extension"
      ? `extension "${ref.id}" is not declared`
      : `model "${ref.id}" is not declared`,
  );
const modelItem = (
  ref: ModelRef,
  over: Partial<ModelProvisionPlanItem> = {},
): ModelProvisionPlanItem => {
  const name = over.name ?? `${ref.id}.safetensors`;
  return {
    kind: "model",
    key: `model:${ref.owner}:${ref.id}:${ref.variant ?? ""}:${ref.quant ?? ""}:${name}`,
    owner: ref.owner,
    id: ref.id,
    name,
    folder: "checkpoints",
    url: `https://example.invalid/${name}`,
    sha256: "a".repeat(64),
    required: true,
    provider: "direct",
    ...over,
  };
};
const modelPlan = (
  ref: ModelRef,
  items: readonly ModelProvisionPlanItem[] = [modelItem(ref)],
): ProvisionPlan => ({ ref, items });
const extensionItem = (id: string, over: Partial<ExtensionItem> = {}): ExtensionItem => ({
  kind: "extension",
  key: `extension:${id}`,
  id,
  required: true,
  provider: "manager",
  registry: "comfy.org/example",
  version: "1.0.0",
  ...over,
});
const extensionPlan = (id: string, over: Partial<ExtensionItem> = {}): ProvisionPlan => ({
  ref: extensionRef(id),
  items: [extensionItem(id, over)],
});
const resultItem = (
  item: ProvisionPlanItem,
  state: ProvisionState = "active",
  over: Partial<ProvisionItemResult> = {},
): ProvisionItemResult => {
  const outcome: ProvisionOutcome =
    state === "active" || state === "restart_required"
      ? state
      : state === "blocked"
        ? "blocked"
        : "failed";
  return {
    key: item.key,
    kind: item.kind,
    state,
    outcome,
    ...over,
  };
};
const resultFor = (
  ref: ResourceRef,
  state: ProvisionOutcome,
  items: readonly ProvisionItemResult[],
  detail?: string,
): ProvisionResult => {
  const operationState: ProvisionState =
    state === "partial" ? "installed" : state === "cancelled" ? "failed" : state;
  return {
    operationId: `op-${ref.kind}-${ref.id}`,
    ref,
    state,
    outcome: state,
    operationState,
    items,
    restartRequired: state === "restart_required" || items.some((item) => item.state === "restart_required"),
    ...(detail === undefined ? {} : { detail }),
  };
};
const resultForPlan = (ref: ResourceRef, plan: ProvisionPlan): ProvisionResult => {
  const state: ProvisionOutcome = ref.kind === "extension" ? "restart_required" : "active";
  return resultFor(
    ref,
    state,
    plan.items.map((item) => resultItem(item, ref.kind === "extension" ? "restart_required" : "active")),
  );
};

const provisioningPlans = new Map<string, ProvisionPlan>();
const provisioningOutcomes = new Map<string, FakeOutcome>();
const provisioningPlanCalls: ResourceRef[] = [];
const provisioningEnsureCalls: ResourceRef[] = [];
const provisioningExternalCalls: ExternalProvisionRequest[] = [];
const resetFakeProvisioning = (): void => {
  provisioningPlans.clear();
  provisioningOutcomes.clear();
  provisioningPlanCalls.length = 0;
  provisioningEnsureCalls.length = 0;
  provisioningExternalCalls.length = 0;
};
const planRef = async (ref: ResourceRef): Promise<ProvisionPlan> => {
  provisioningPlanCalls.push(ref);
  const plan = provisioningPlans.get(resourceKey(ref));
  if (plan === undefined) throw undeclared(ref);
  return plan;
};
const ensureRef = async (ref: ResourceRef): Promise<ProvisionResult> => {
  provisioningEnsureCalls.push(ref);
  const configured = provisioningOutcomes.get(resourceKey(ref));
  if (configured instanceof Error) throw configured;
  if (typeof configured === "string") throw configured;
  if (configured !== undefined) return configured;
  const plan = provisioningPlans.get(resourceKey(ref));
  if (plan === undefined) throw undeclared(ref);
  return resultForPlan(ref, plan);
};
const fakeProvisioning: FakeProvisioning = {
  plans: provisioningPlans,
  outcomes: provisioningOutcomes,
  planCalls: provisioningPlanCalls,
  ensureCalls: provisioningEnsureCalls,
  reset: resetFakeProvisioning,
  inspect: async (ref): Promise<ResourceStatus> => ({ ref, state: "unknown", items: [] }),
  plan: planRef,
  ensure: ensureRef,
  activate: async (ref): Promise<ProvisionResult> => await ensureRef(ref),
  acquireExternal: async (request): Promise<ProvisionResult> => {
    provisioningExternalCalls.push(request);
    if (request.kind === "extension") {
      const ref: ResourceRef = { kind: "extension", id: "external-extension" };
      const item = extensionItem(ref.id, { url: request.url });
      return resultFor(
        ref,
        "restart_required",
        [resultItem(item, "restart_required", { detail: "git-url installed " + request.url + " (restart required)" })],
        "git-url installed " + request.url + " (restart required)",
      );
    }
    const ref: ResourceRef = { kind: "model", owner: "card", id: "external-model" };
    const name = request.filename ?? "download.bin";
    const item = modelItem(ref, { key: "model:card:external-model:" + name, name, url: request.url });
    return resultFor(
      ref,
      "active",
      [resultItem(item, "active", { detail: "downloaded " + name })],
      "downloaded " + name,
    );
  },
  reconcile: async (): Promise<ResourceStatus[]> => [],
  stateOf: (): ProvisionState => "unknown",
  operationOf: () => undefined,
  isLocked: () => false,
};

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.PATH = realPath;
  delete process.env.COMFYUI_ENDPOINT_CONFIG;
  fakeProvisioning.reset();
});

const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: ROOT,
    // THE ROOTS UNIFICATION (2026-09-25), J12 spelling: the manifest
    // rides the ctx (config-named roots, never an env seam) — own
    // root first, then whatever extras the test arms below pin.
    stateRoots: rootsManifest(resolveStateRoot({ repoRoot: ROOT }), EXTRAS),
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    autoProvision: false,
     models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: fakeProvisioning,
     timeout: (cb: () => void, ms: number): (() => void) => {
       const timer = setTimeout(cb, ms);
       return () => { clearTimeout(timer); };
     },
    ...over,
  }) as unknown as ManageCtx;

/** The test's manifest extras (the retired MELITE_STATE_ROOTS env
 *  seam's stand-in: each test names its extra trees through the
 *  CTX, exactly as production's queue seat does). */
let EXTRAS: string[] = [];

const runFlow = (name: string, status: string | null, pad = ""): void => {
  const dir = join(ROOT, "data", "runs", "output", name);
  mkdirSync(dir, { recursive: true });
  if (status !== null) writeFileSync(join(dir, "_flow.json"), pad + JSON.stringify({ status }));
};
const mkRoot = (): string => {
  ROOT = mkdtempSync(join(tmpdir(), "manage-"));
  // THE ROOTS UNIFICATION (2026-09-25): activeRuns walks the roots
  // manifest now — the fixture pins its own temp root as the state
  // root so the scan reads the fixture tree, never the real repo
  // (J12: through the CTX's stateRoots, not the env).
  return ROOT;
};
const rmRoot = (): void => {
  rmSync(ROOT, { recursive: true, force: true });
  EXTRAS = [];
};

type Route = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;
let ROUTE: Route = () => text("unused", 500);
const route = (fn: Route): void => {
  ROUTE = fn;
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) =>
    ROUTE(String(url), init)) as typeof fetch;
};

const manage = (doc: unknown, ctx?: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]> =>
  dispatchManage(doc, ctx ?? CTX()) as unknown as Promise<
    [number, { ok: boolean; detail: string; action: string; data?: unknown }]
  >;

const fakeBin = (scripts: Record<string, { out: string; err?: string; code: number }>): void => {
  const bin = mkdtempSync(join(tmpdir(), "fakebin-"));
  for (const [name, s] of Object.entries(scripts)) {
    writeFileSync(
      join(bin, name),
      "#!/bin/sh\n" +
        (s.err ? `echo '${s.err}' >&2\n` : "") +
        (s.out ? `printf '%s' '${s.out}'\n` : "") +
        `exit ${s.code}\n`,
    );
    chmodSync(join(bin, name), 0o755);
  }
  process.env.PATH = bin + ":" + realPath;
};

describe("parse law", () => {
  it("non-dicts, missing and unknown actions refuse (action rides)", async () => {
    assert.deepEqual((await manage([]))[0], 422);
    const [code, env] = await manage({ action: "bogus" });
    assert.equal(code, 422);
    assert.equal(env.action, "bogus");
    assert.equal((await manage({ action: 5 }))[1].action, "5");
    // a scalar (non-object) doc labels the action "?" through the
    // envelope's left conjunct
    assert.equal((await manage("flat"))[1].action, "?");
    // a MISSING action refuses with the required voice; a nullish
    // action key tolls the envelope's "?" fallback
    const [mc, me] = await manage({});
    assert.equal(mc, 422);
    assert.equal(me.detail, "Field required: action");
    assert.equal(me.action, "?");
    const [nc, ne] = await manage({ action: null });
    assert.equal(nc, 422);
    assert.equal(ne.action, "?");
  });

  it("junk shapes coerce (nodes map/filter, wait/nulls, numbers, target)", async () => {
    mkRoot();
    try {
      route(() => json({ system: {}, devices: [] }));
      const [code, env] = await manage({
        action: "status",
        wait: "x",
        timeout_seconds: Number.NaN,
        tail: "x",
        target: "",
        extra_args: [1],
        force: 0,
        nodes: "x",
      });
      assert.equal(code, 200);
      assert.equal(env.action, "status");
      const [code2, env2] = await manage({ action: "install_extension", nodes: [0, "", 5] });
      assert.equal(code2, 404);
      assert.match(env2.detail, /extension is not declared: 0/);
    } finally {
      rmRoot();
    }
  });
});

describe("hStatus", () => {
  it("down engines answer not-reachable (byo, unpinned, empty)", async () => {
    mkRoot();
    try {
      route(() => {
        throw new TypeError("fetch failed");
      });
      const [code, env] = await manage(
        { action: "status" },
        CTX({ endpoint: () => ({}) }),
      );
      assert.equal(code, 200);
      assert.equal(env.detail, "server not reachable");
      const data = env.data as {
        endpoint: { reachable: boolean; reason: string };
         manager: { reachable: boolean; reason: string; security: string };
         active_runs: unknown[];
         routing: { mode: string };
         next_action: string;
       };
       assert.equal(data.endpoint.reachable, false);
      assert.equal(data.manager.reason, "endpoint not reachable");
      assert.match(data.manager.security, /unpinned/);
       assert.deepEqual(data.active_runs, []);
       assert.equal(data.routing.mode, "byo");
       assert.equal(data.next_action, "endpoint_set");
    } finally {
      rmRoot();
    }
  });

  it("up engines serve version, queue, devices (sliced, named) and security", async () => {
    mkRoot();
    try {
      mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user", "__manager"), { recursive: true });
      writeFileSync(
        join(ROOT, "data", "runtime", "comfyui", "user", "__manager", "config.ini"),
        "security_level = normal+\nallow_git_url_install = true\n",
      );
      runFlow("run-b", "queued");
      runFlow("run-a", "running");
      runFlow("run-c", "done");
      runFlow("nodash", "running");
      mkdirSync(join(ROOT, "data", "runs", "output", "run-d"), { recursive: true });
      runFlow("run-e", null);
      writeFileSync(join(ROOT, "data", "runs", "output", "run-e", "_flow.json"), "no status here");
      route((url) => {
        if (url.endsWith("/system_stats")) {
          return json({
            system: { comfyui_version: "9.9" },
            devices: [
              { name: "cuda:0", vram_total: 1, vram_free: 2 },
              { vram_total: 3 },
              {},
              { name: "x" },
              { name: "cut" },
            ],
          });
        }
        if (url.endsWith("/manager/version")) return json({ v: 1 });
        return json({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 });
      });
      const [code, env] = await manage({ action: "status" });
      assert.equal(code, 200);
      assert.equal(env.detail, "server up");
      const data = env.data as {
        endpoint: { reachable: boolean; url: string; comfyui_version: string; devices: Array<{ name: string }> };
        manager: { version: unknown; security: string; unit: string };
        active_runs: string[];
        routing: { mode: string };
      };
      assert.equal(data.endpoint.comfyui_version, "9.9");
      assert.deepEqual(data.endpoint.devices.map((d) => d.name), ["cuda:0", "?", "?", "x"]);
      assert.deepEqual(data.manager.version, { v: 1 });
      assert.match(data.manager.security, /security_level=normal\+ \+git_url/);
      assert.deepEqual(data.active_runs, ["run-a", "run-b"]);
      assert.equal(data.routing.mode, "managed");
      // THE ENGINE-BOOT RECEIPT (no-more-gaps law): with no receipt on
      // disk the status names the blindness honestly; a written receipt
      // surfaces age — the maker's /proc-invisible preflight instrument.
      const boot0 = (env.data as { engine_boot: Record<string, unknown> }).engine_boot;
      assert.equal(boot0.known, false);
      assert.match(String(boot0.note), /age unknown/u);
      const receiptDir = join(ROOT, "data", "runtime", "comfyui");
      mkdirSync(receiptDir, { recursive: true });
      writeFileSync(
        join(receiptDir, ".estate-engine-boot.json"),
        JSON.stringify({ boot_at: Date.now() - 93_000, source: "estate restart" }) + "\n",
        "utf8",
      );
      const [, env2] = await manage({ action: "status" });
      const boot1 = (env2.data as { engine_boot: Record<string, unknown> }).engine_boot;
      assert.equal(boot1.known, true);
      assert.equal(boot1.source, "estate restart");
      assert.equal(typeof boot1.age_seconds, "number");
      assert.ok((boot1.age_seconds as number) >= 93);
    } finally {
      rmRoot();
    }
  });

  it("THE FINDING-10 SPLIT: an idle engine corroborates — unsettled claims become historical rows, not 60+ actives", async () => {
    mkRoot();
    try {
      runFlow("run-b", "queued");
      runFlow("run-a", "running");
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ v: 1 });
        if (url.endsWith("/queue")) return json({ queue_running: [], queue_pending: [] });
        return json({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 });
      });
      const [code, env] = await manage({ action: "status" });
      assert.equal(code, 200);
      const data = env.data as {
        active_runs: string[];
        stale_claims?: string[];
        engine_queue?: { running: number; pending: number };
        active_runs_note?: string;
      };
      // ComfyUI executes serially: an empty queue cannot be executing
      // any claim — the census's rows are dead-process sidecars.
      assert.deepEqual(data.active_runs, [], "an idle engine corroborates zero actives");
      assert.deepEqual(data.engine_queue, { running: 0, pending: 0 });
      assert.equal(data.stale_claims?.length, 2);
      assert.match(data.stale_claims?.[0] ?? "", /^run-a \(claimed live; engine queue empty — historical/u);
      assert.match(data.stale_claims?.[1] ?? "", /^run-b \(claimed live; engine queue empty — historical/u);
      assert.equal(data.active_runs_note, undefined, "the idle split carries no surplus note");
    } finally {
      rmRoot();
    }
  });

  it("THE FINDING-10 SPLIT: a busy or unanswerable engine keeps the census conservative (the restart guard's law)", async () => {
    mkRoot();
    try {
      runFlow("run-b", "queued");
      runFlow("run-a", "running");
      const routeFor = (queueBody: unknown): void => {
        route((url) => {
          if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
          if (url.endsWith("/manager/version")) return json({ v: 1 });
          if (url.endsWith("/queue")) return json(queueBody);
          return json({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 });
        });
      };
      // Busy engine (serial executor mid-prompt): the claims stay —
      // which claim is the live one is not knowable without prompt
      // ids, so the view refuses to guess and names the one-run law.
      routeFor({ queue_running: [{ prompt_id: "p1" }], queue_pending: [] });
      const [, busy] = await manage({ action: "status" });
      const busyData = busy.data as { active_runs: string[]; stale_claims?: string[]; engine_queue?: { running: number }; active_runs_note?: string };
      assert.deepEqual(busyData.active_runs, ["run-a", "run-b"]);
      assert.deepEqual(busyData.engine_queue, { running: 1, pending: 0 });
      assert.equal(busyData.stale_claims, undefined);
      assert.match(busyData.active_runs_note ?? "", /one-run law bounds machine-wide actives at 1/u);
      // Unanswerable queue (malformed body): no corroboration at all.
      routeFor({ is_processing: false });
      const [, blind] = await manage({ action: "status" });
      const blindData = blind.data as { active_runs: string[]; engine_queue?: unknown; active_runs_note?: string };
      assert.deepEqual(blindData.active_runs, ["run-a", "run-b"]);
      assert.equal(blindData.engine_queue, undefined);
      assert.match(blindData.active_runs_note ?? "", /one-run law/u);
    } finally {
      rmRoot();
    }
  });

  it("THE ROOTS UNIFICATION: a live run under an EXTRA state root guards the restart census", async () => {
    mkRoot();
    try {
      // own root: quiet; extra root: a live render (the maker lane)
      const extra = mkdtempSync(join(tmpdir(), "manage-extra-"));
      EXTRAS = [extra];
      mkdirSync(join(extra, "output", "run-maker-live"), { recursive: true });
      writeFileSync(
        join(extra, "output", "run-maker-live", "_flow.json"),
        JSON.stringify({ status: "running" }),
      );
      route((url) => {
        if (url.endsWith("/system_stats")) {
          return json({ system: { comfyui_version: "9.9" }, devices: [{ name: "cuda:0", vram_total: 1, vram_free: 2 }] });
        }
        if (url.endsWith("/manager/version")) return json({ v: 1 });
        return json({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 });
      });
      const [code, env] = await manage({ action: "status" });
      assert.equal(code, 200);
      const data = env.data as { active_runs: string[] };
      assert.deepEqual(data.active_runs, ["run-maker-live"], "the maker tree's live run is visible to the restart guard");
      rmSync(extra, { recursive: true, force: true });
    } finally {
      rmRoot();
    }
  });

  it("FAIL-CLOSED: unreadable run state guards the restart (HIGH-3 — never invisible)", async () => {
    // the fallback audit's HIGH-3: an unreadable _flow.json used to
    // `continue` — the run vanished from the census and the restart
    // guard failed OPEN. Unknown state now counts as ACTIVE, named
    // with its errno; absent state (ENOENT) stays honestly inactive.
    mkRoot();
    try {
      runFlow("run-ok", "running");
      // EISDIR: the sidecar path is a directory — state exists but
      // cannot be read (the deterministic stand-in for EACCES/EIO)
      mkdirSync(join(ROOT, "data", "runs", "output", "run-mystery", "_flow.json"), { recursive: true });
      // absent state: a run dir created before its sidecar lands
      mkdirSync(join(ROOT, "data", "runs", "output", "run-fresh"), { recursive: true });
      const [, env] = await manage({ action: "status" });
      const active = (env.data as { active_runs: string[] }).active_runs;
      assert.deepEqual(
        active,
        ["run-mystery (state unreadable: EISDIR)", "run-ok"],
        "the unreadable run counts as active, errno named; the sidecar-less run does not",
      );
      // the lifecycle guard refuses on the unreadable run too
      const [rcode, renv] = await manage({ action: "restart" });
      assert.equal(rcode, 409);
      assert.match(String(renv.detail), /run-mystery \(state unreadable: EISDIR\)/);
      // and an unreadable EXTRA root is named, not swallowed
      const rootAsFile = join(ROOT, "data", "runs-as-file");
      writeFileSync(rootAsFile, "not a directory");
      EXTRAS = [rootAsFile];
      const [, env3] = await manage({ action: "status" });
      const active3 = (env3.data as { active_runs: string[] }).active_runs;
      assert.ok(
        active3.some((n) => n.startsWith("(unreadable root: ") && n.includes("ENOTDIR")),
        "the unreadable root is named with its errno",
      );
    } finally {
      rmRoot();
    }
  });

  it("the auto-provision posture rides the status payload (the deck's gate reads it, default operator)", async () => {
    mkRoot();
    try {
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        if (url.endsWith("/comfyui_manager/comfyui_versions")) return json({ versions: [] });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const [, env] = await manage({ action: "status" });
      assert.equal((env.data as { auto_provision?: boolean }).auto_provision, false,
        "the default posture is operator: every confirm stays");
      const [, envAuto] = await manage({ action: "status" }, CTX({ autoProvision: true }));
      assert.equal((envAuto.data as { auto_provision?: boolean }).auto_provision, true,
        "the configured posture reaches the deck's gate");
    } finally {
      rmRoot();
    }
  });

  it("serves declared model coordinates and ComfyUI version tags", async () => {
    mkRoot();
    try {
      const declaration = {
        id: "wan",
        label: "Wan",
        genre: "video",
        engine: "comfyui",
        variants: [{
          id: "preview",
          label: "Preview",
          cells: [
            { quant: "fp8", label: "FP8" },
            { quant: "q4", label: "Q4" },
          ],
        }],
      };
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        if (url.endsWith("/comfyui_manager/comfyui_versions")) return json({ versions: [{ version: "v0.9", tag: "stable" }, "nightly"] });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const ctx = CTX({ models: { allDecls: () => [declaration] } as unknown as ManageCtx["models"] });
      const [, env] = await manage({ action: "status" }, ctx);
      const data = env.data as {
        model_options: Array<{ id: string; variants: Array<{ id: string; quants: Array<{ id: string }> }> }>;
        comfyui_versions: Array<{ id: string; label: string; tag?: string }>;
      };
      assert.deepEqual(data.model_options[0]?.variants[0]?.quants.map((quant) => quant.id), ["fp8", "q4"]);
      assert.deepEqual(data.comfyui_versions, [
        { id: "v0.9", label: "v0.9 — stable", version: "v0.9", tag: "stable" },
        { id: "nightly", label: "nightly" },
      ]);
    } finally {
      rmRoot();
    }
  });

  it("a manager failure softens (legacy ini, default level)", async () => {
    mkRoot();
    try {
      mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user", "default", "ComfyUI-Manager"), {
        recursive: true,
      });
      writeFileSync(
        join(ROOT, "data", "runtime", "comfyui", "user", "default", "ComfyUI-Manager", "config.ini"),
        "[manager]\n",
      );
      route((url) => {
        if (url.endsWith("/system_stats")) return json({});
        throw new TypeError("boom");
      });
      const [, env] = await manage({ action: "status" });
      const data = env.data as { manager: { reachable: boolean; reason: string; security: string } };
      assert.equal(data.manager.reachable, false);
      assert.match(data.manager.reason, /boom/);
      assert.match(data.manager.security, /normal \(default\)/);
    } finally {
      rmRoot();
    }
  });
});

describe("lifecycle guard + orchestration", () => {
  it("live runs refuse without force (even force=1)", async () => {
    mkRoot();
    try {
      runFlow("run-a", "running");
      route(() => json({}));
      const [, env] = await manage({ action: "restart" });
      assert.match(env.detail, /1 active run\(s\) \(run-a\)/);
      // §5's live-set cure: a STOPPING run is live — the guard
      // protects a stop-in-flight from restart teardown.
      runFlow("run-b", "stopping");
      const [, envS] = await manage({ action: "restart" });
      assert.match(envS.detail, /2 active run\(s\) \(run-a, run-b\)/);
      const [, env2] = await manage({ action: "restart", force: 1 });
      assert.match(env2.detail, /active run/);
    } finally {
      rmRoot();
    }
  });

  it("stop/launch ride systemctl (ok + failed + missing)", async () => {
    mkRoot();
    try {
      fakeBin({ systemctl: { out: "", code: 0 } });
      route(() => json({}));
      const [c1, e1] = await manage({ action: "stop", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /stop issued/);
      const [c2] = await manage({ action: "launch", force: true });
      assert.equal(c2, 200);
      fakeBin({ systemctl: { out: "", err: "no bus", code: 3 } });
      const [c3, e3] = await manage({ action: "stop", force: true });
      assert.equal(c3, 500);
      assert.match(e3.detail, /systemctl stop .* failed: no bus/);
      process.env.PATH = mkdtempSync(join(tmpdir(), "emptybin-"));
      const [c4, e4] = await manage({ action: "launch", force: true });
      assert.equal(c4, 500);
      assert.match(e4.detail, /failed: /);
    } finally {
      rmRoot();
    }
  });
});

describe("hLifecycle cancellation", () => {
  it("cancels an in-flight systemctl action", async () => {
    mkRoot();
    const bin = mkdtempSync(join(tmpdir(), "manage-cancel-"));
    try {
      const script = join(bin, "systemctl");
      writeFileSync(script, "#!/bin/sh\nsleep 5\n", "utf8");
      chmodSync(script, 0o755);
      process.env.PATH = bin + ":" + realPath;
      const controller = new AbortController();
      const pending = manage({ action: "stop", force: true }, CTX({ signal: controller.signal }));
      setTimeout(() => { controller.abort(); }, 10);
      await assert.rejects(pending, (error: unknown) => {
        assert.equal((error as Error).name, "AbortError");
        return true;
      });
    } finally {
      rmSync(bin, { recursive: true, force: true });
      rmRoot();
    }
  });
});

describe("hLogs", () => {
  it("tails the journal (clamped) and degrades without it", async () => {
    mkRoot();
    try {
      fakeBin({ journalctl: { out: "l1\n\nl2\n", code: 0 } });
      const [code, env] = await manage({ action: "logs", tail: 9999 });
      assert.equal(code, 200);
      assert.match(env.detail, /2 log line\(s\)/);
      assert.deepEqual(env.data, ["l1", "l2"]);
      process.env.PATH = mkdtempSync(join(tmpdir(), "emptybin-"));
      const [c2, e2] = await manage({ action: "logs" });
      assert.equal(c2, 503);
      assert.match(e2.detail, /need the estate deployment's journal/);
    } finally {
      rmRoot();
    }
  });
});

describe("hStatus operations", () => {
  it("normalizes status from the correlated operation before choosing next action", async () => {
    mkRoot();
    try {
      const ref = extensionRef("pack");
      const resource: ResourceStatus = {
        ref,
        state: "active",
        items: [{ key: "extension:pack", kind: "extension", state: "active" }],
      };
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const ctx = CTX({
        provisioning: {
          ...fakeProvisioning,
          reconcile: async (): Promise<ResourceStatus[]> => [resource],
          operationOf: () => ({
            operationId: "op-current",
            ref,
            state: "restart_required",
            items: [{ key: "extension:pack", kind: "extension", state: "restart_required" }],
            startedAt: Date.now(),
          }),
        },
      });
      const [, env] = await manage({ action: "status" }, ctx);
      const data = env.data as { next_action: string; resources: Array<{ state: string; operation_id: string }>; operations: Array<{ state: string }> };
      assert.equal(data.resources[0]?.state, "restart_required");
      assert.equal(data.resources[0]?.operation_id, "op-current");
      assert.equal(data.operations[0]?.state, "restart_required");
      assert.equal(data.next_action, "restart");
    } finally {
      rmRoot();
    }
  });

  // THE CENSUS HONESTY LAW (the anima burn, 2026-10-20: the sidebar
  // read "Declared resources 1/1 failed — model family/anima" while
  // every anima file sat byte-exact on disk): a roster carrying ANY
  // 'unknown' row is a scan that could not check everything inside
  // its status budget — the status MUST mark the census partial so
  // the UI never titles its count as the whole truth. A settled
  // roster MUST NOT carry the mark.
  it("marks the status census_partial when any resource row is unknown, never on a settled roster", async () => {
    mkRoot();
    try {
      const ref = extensionRef("pack");
      const unknownRow: ResourceStatus = {
        ref,
        state: "unknown",
        items: [],
        detail: "scan incomplete — this resource was not checked before the status budget closed",
      };
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const ctx = CTX({
        provisioning: {
          ...fakeProvisioning,
          reconcile: async (): Promise<ResourceStatus[]> => [unknownRow],
          operationOf: () => undefined,
        },
      });
      const [, partial] = await manage({ action: "status" }, ctx);
      const partialData = partial.data as { resources: Array<{ state: string }>; census_partial?: boolean };
      assert.equal(partialData.resources.length, 1, "the unknown row rides the roster — row-complete");
      assert.equal(partialData.census_partial, true, "the status marks the census partial");

      const settled: ResourceStatus = {
        ref,
        state: "active",
        items: [{ key: "extension:pack", kind: "extension", state: "active" }],
      };
      const wholeCtx = CTX({
        provisioning: {
          ...fakeProvisioning,
          reconcile: async (): Promise<ResourceStatus[]> => [settled],
          operationOf: () => undefined,
        },
      });
      const [, whole] = await manage({ action: "status" }, wholeCtx);
      const wholeData = whole.data as { census_partial?: boolean };
      assert.equal(wholeData.census_partial, undefined, "a settled roster never carries the partial mark");
    } finally {
      rmRoot();
    }
  });

  // AUDIT F1 (infra-resources-census-honesty): a REAL failed item
  // over unchecked siblings aggregates the row to 'failed' — a real
  // verdict that must stand — but the unchecked items are still the
  // scan's own artifact, and the mark must fire on them or the
  // sidebar titles a partial scan as the whole truth.
  it("marks census_partial on an unknown ITEM even when the row's own state is a real verdict", async () => {
    mkRoot();
    try {
      const ref = extensionRef("pack");
      const masked: ResourceStatus = {
        ref,
        state: "failed",
        items: [
          { key: "extension:pack", kind: "extension", state: "failed" },
          { key: "model:family:anima::w1.safetensors", kind: "model", state: "unknown", detail: "scan incomplete — the check was cut off before it could judge this item" },
        ],
      };
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const ctx = CTX({
        provisioning: {
          ...fakeProvisioning,
          reconcile: async (): Promise<ResourceStatus[]> => [masked],
          operationOf: () => undefined,
        },
      });
      const [, env] = await manage({ action: "status" }, ctx);
      const data = env.data as { census_partial?: boolean };
      assert.equal(data.census_partial, true,
        "the masked shape — a real failed verdict over unchecked siblings — must still carry the partial mark");

      // the discriminating counter: a failed row whose items are ALL
      // checked is a whole verdict — the mark never fires on it
      const settledFailed: ResourceStatus = {
        ref,
        state: "failed",
        items: [
          { key: "extension:pack", kind: "extension", state: "failed" },
          { key: "model:family:anima::w1.safetensors", kind: "model", state: "failed" },
        ],
      };
      const settledCtx = CTX({
        provisioning: {
          ...fakeProvisioning,
          reconcile: async (): Promise<ResourceStatus[]> => [settledFailed],
          operationOf: () => undefined,
        },
      });
      const [, settledEnv] = await manage({ action: "status" }, settledCtx);
      const settledData = settledEnv.data as { census_partial?: boolean };
      assert.equal(settledData.census_partial, undefined,
        "a failed row over all-checked items is a whole verdict — no mark");
    } finally {
      rmRoot();
    }
  });

  // AUDIT F3 (infra-resources-census-honesty): the census arms above
  // stub reconcile and the provisioning walls never ride hStatus —
  // the service->status edge had no single judge. This arm rides the
  // REAL ProvisioningService through the REAL status budget: the
  // writer hangs past STATUS_RECONCILE_MS, the deadline cuts the
  // census, and the status must still ANSWER — census_partial over a
  // row-complete, item-complete unknown roster, never a truncation,
  // never a 504, never a health verdict over unchecked bytes.
  it("AUDIT F3 integration: a real service cut by the real status budget answers census_partial, never truncated", async () => {
    mkRoot();
    const context = new Context();
    try {
      const ref: ResourceRef = { kind: "model", owner: "family", id: "anima" };
      const service = new ProvisioningService(context, {
        declaration: {
          resolve: async (): Promise<ProvisionPlan> => ({
            ref,
            items: [
              { kind: "model", key: "model:family:anima::w0.safetensors", owner: "family", id: "anima", name: "w0.safetensors", folder: "checkpoints", url: "https://example.invalid/w0.safetensors", sha256: "a".repeat(64), sizeBytes: 1, required: true, provider: "direct" },
              { kind: "model", key: "model:family:anima::w1.safetensors", owner: "family", id: "anima", name: "w1.safetensors", folder: "checkpoints", url: "https://example.invalid/w1.safetensors", sha256: "a".repeat(64), sizeBytes: 1, required: true, provider: "direct" },
            ],
          }),
          list: async (): Promise<readonly ResourceRef[]> => [ref],
        },
        // the disk check hangs until the budget's deadline cuts it —
        // the exact window the anima burn rode
        artifactWriter: {
          inspect: async (_item, signal) => await new Promise<never>((_resolve, reject) => {
            const timer = setTimeout(() => { reject(new Error("unreachable")) }, 30_000);
            signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")) }, { once: true });
          }),
          write: async () => { throw new Error("the census never writes") },
        },
        storeRoot: mkdtempSync(join(tmpdir(), "f3-store-")),
      } satisfies ProvisioningConfig);
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "9.9" }, devices: [] });
        if (url.endsWith("/manager/version")) return json({ version: "3.0" });
        return json({ is_processing: false, total_count: 0, done_count: 0 });
      });
      const ctx = CTX({ provisioning: service });

      const started = Date.now();
      const [code, env] = await manage({ action: "status" }, ctx);
      const waited = Date.now() - started;

      assert.equal(code, 200, "the status still ANSWERS — the budget cut is scan data, not a refusal");
      assert.ok(waited >= 1400 && waited < 5000, "the cut rode the real STATUS_RECONCILE_MS deadline (1.5s), not a stubbed fast path");
      const data = env.data as { resources: Array<{ state: string; items?: Array<{ state: string }> }>; census_partial?: boolean };
      assert.equal(data.resources.length, 1, "row-complete — the cut never truncates the roster");
      const row = data.resources[0]!;
      assert.equal(row.items?.length, 2, "item-complete — the cut never truncates the item list");
      assert.ok(row.items?.every((item) => item.state === "unknown"),
        "every unchecked item rides unknown — never 'failed' (the burn's word), never 'absent'");
      assert.equal(data.census_partial, true, "the real seam marks the census partial");
    } finally {
      await context.fiber.dispose();
      rmRoot();
    }
  });
});

describe("hSearch", () => {
  it("needs a query, refuses byo, maps refusals, rethrows transports", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "search_models" });
      assert.match(e0.detail, /search_models requires: query/);
      const [, e1] = await manage({ action: "search_models", query: "x" }, CTX({ endpoint: () => ({}) }));
      assert.match(e1.detail, /byo endpoint/);
      route(() => text("denied", 403));
      const [c2, e2] = await manage({ action: "search_models", query: "x" });
      assert.equal(c2, 403);
      assert.match(e2.detail, /manager refused search_models/);
      route(() => {
        throw new TypeError("down");
      });
      const [c3, e3] = await manage({ action: "search_models", query: "x" });
      assert.equal(c3, 503);
      assert.match(e3.detail, /management plane unavailable/);
      route(() => json({ models: 5 }));
      const [c4, e4] = await manage({ action: "search_models", query: "x" });
      assert.equal(c4, 500);
      assert.match(e4.detail, /TypeError/);
    } finally {
      rmRoot();
    }
  });

  it("filters the cache rows (case-folded, capped)", async () => {
    mkRoot();
    try {
      route(() => json({}));
      const [, e0] = await manage({ action: "search_models", query: "q" });
      assert.match(e0.detail, /0 hit\(s\)/);
      route(() =>
        json({
          models: [
            { name: "Fast Art", type: "ckpt", base: "sdxl", filename: "fast.safetensors" },
            { name: "Slow Photo", type: "lora" },
          ],
        }),
      );
      const [, e1] = await manage({ action: "search_models", query: "FAST ART" });
      assert.match(e1.detail, /1 hit\(s\)/);
    } finally {
      rmRoot();
    }
  });
});

describe("hInstallExtension", () => {
  it("needs nodes and the estate; undeclared names are 404", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "install_extension", nodes: [] });
      assert.match(e0.detail, /install_extension requires: nodes/);
      const [, e1] = await manage({ action: "install_extension", nodes: ["x"] }, CTX({ endpoint: () => ({}) }));
      assert.match(e1.detail, /byo endpoint/);
      const [c2, e2] = await manage({ action: "install_extension", nodes: ["ghost"] });
      assert.equal(c2, 404);
      assert.equal(e2.ok, false);
      assert.match(e2.detail, /extension is not declared: ghost/);
      assert.deepEqual(fakeProvisioning.ensureCalls, []);
    } finally {
      rmRoot();
    }
  });

  it("uses declared plans and reports misses without a latest fallback", async () => {
    mkRoot();
    try {
      const packPlan = extensionPlan("pack", { version: "1.2.3" });
      fakeProvisioning.plans.set(resourceKey(extensionRef("pack")), packPlan);
      let railCalls = 0;
      route(() => {
        railCalls++;
        return json({});
      });
       const [code, env] = await manage({ action: "install_extension", nodes: ["pack", "ghost"] });
       assert.equal(code, 500);
       assert.equal(env.ok, false);
       assert.equal(env.detail, "partial (1/2 extension(s) succeeded)");
      const data = env.data as {
        queued: string[];
        misses: string[];
        restart_required: boolean;
        state: string;
      };
       assert.equal(data.state, "partial");
       assert.equal(data.restart_required, true);
      assert.deepEqual(data.queued, ["extension:pack"]);
      assert.deepEqual(data.misses, ['ghost: extension "ghost" is not declared']);
      assert.equal(railCalls, 0);
      assert.deepEqual(fakeProvisioning.planCalls.map((ref) => ref.id), ["pack", "ghost"]);
      assert.deepEqual(fakeProvisioning.ensureCalls.map((ref) => ref.id), ["pack"]);
      const packItem = packPlan.items[0];
      assert.equal(packItem?.kind, "extension");
      if (packItem?.kind !== "extension") throw new Error("expected extension plan item");
      assert.equal(packItem.version, "1.2.3");
      assert.equal(JSON.stringify(packPlan).includes("latest"), false);
    } finally {
      rmRoot();
    }
  });

  it("keeps mixed successful packs restart-required without calling them partial", async () => {
    mkRoot();
    try {
      const activeRef = extensionRef("active-pack");
      const restartRef = extensionRef("restart-pack");
      const activePlan = extensionPlan("active-pack");
      const restartPlan = extensionPlan("restart-pack");
      fakeProvisioning.plans.set(resourceKey(activeRef), activePlan);
      fakeProvisioning.plans.set(resourceKey(restartRef), restartPlan);
      fakeProvisioning.outcomes.set(resourceKey(activeRef), resultFor(activeRef, "active", [resultItem(activePlan.items[0]!)]));
      fakeProvisioning.outcomes.set(resourceKey(restartRef), resultFor(restartRef, "restart_required", [resultItem(restartPlan.items[0]!, "restart_required")]));
      const [code, env] = await manage({ action: "install_extension", nodes: ["active-pack", "restart-pack"] });
      assert.equal(code, 200);
      assert.equal(env.ok, true);
      const data = env.data as { state: string; operation_id: string; next_action: string; operations: unknown[] };
      assert.equal(data.state, "restart_required");
      assert.match(data.operation_id, /^aggregate:/);
      assert.equal(data.next_action, "restart");
      assert.equal(data.operations.length, 2);
    } finally {
      rmRoot();
    }
  });

  it("does not call a declared pack undeclared when ensure throws", async () => {
    mkRoot();
    try {
      const ref = extensionRef("broken-pack");
      const plan = extensionPlan("broken-pack");
      fakeProvisioning.plans.set(resourceKey(ref), plan);
      fakeProvisioning.outcomes.set(resourceKey(ref), new Error("manager install exploded"));
      const [code, env] = await manage({ action: "install_extension", nodes: ["broken-pack"] });
      assert.equal(code, 500);
      assert.equal(env.ok, false);
      assert.match(env.detail, /failed \(1 item\(s\)\)/);
      const data = env.data as { missed: string[]; misses: string[]; operations: unknown[] };
      assert.deepEqual(data.missed, ["broken-pack"]);
      assert.match(data.misses[0] ?? "", /manager install exploded/);
      assert.equal(data.operations.length, 1);
    } finally {
      rmRoot();
    }
  });

  it("maps manager refusal, activation, and partial provisioning results", async () => {
    mkRoot();
    try {
      const ref = extensionRef("pack");
      const plan = extensionPlan("pack");
      fakeProvisioning.plans.set(resourceKey(ref), plan);
      const failed = resultFor(
        ref,
        "failed",
        [resultItem(plan.items[0]!, "failed", { errorCode: "manager/install-failed", detail: "manager refused install_extension" })],
        "manager refused install_extension",
      );
      fakeProvisioning.outcomes.set(resourceKey(ref), failed);
      const [c1, e1] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c1, 500);
      assert.equal(e1.ok, false);
      assert.match(e1.detail, /failed \(1 item\(s\)\)/);
      assert.deepEqual((e1.data as { errors: Array<{ file: string }> }).errors.map((row) => row.file), ["extension:pack"]);

      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(ref, "blocked", [resultItem(plan.items[0]!, "blocked", { errorCode: "manager/can-install", detail: "manager refused activation" })], "manager refused activation"),
      );
      const [c2, e2] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c2, 409);
      assert.equal(e2.ok, false);
      assert.match(e2.detail, /blocked \(1 item\(s\)\)/);

      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(ref, "active", [resultItem(plan.items[0]!)]),
      );
      const [c3, e3] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c3, 200);
      assert.equal(e3.ok, true);
      assert.equal((e3.data as { state: string }).state, "active");

      const otherRef = extensionRef("other");
      const otherPlan = extensionPlan("other");
      fakeProvisioning.plans.set(resourceKey(otherRef), otherPlan);
      fakeProvisioning.outcomes.set(resourceKey(ref), resultFor(ref, "active", [resultItem(plan.items[0]!)]));
      fakeProvisioning.outcomes.set(
        resourceKey(otherRef),
        resultFor(otherRef, "failed", [resultItem(otherPlan.items[0]!, "failed", { errorCode: "manager/install-failed", detail: "one item failed" })]),
      );
      const [c4, e4] = await manage({ action: "install_extension", nodes: ["pack", "other"] });
      assert.equal(c4, 500);
      assert.equal(e4.ok, false);
      assert.equal((e4.data as { state: string }).state, "partial");
      assert.deepEqual((e4.data as { queued: string[] }).queued, ["extension:pack"]);
    } finally {
      rmRoot();
    }
  });
});

describe("hInstallExtensionUrl", () => {
  it("needs a url and delegates external acquisition to provisioning", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "install_extension_url" });
      assert.match(e0.detail, /install_extension_url requires: url/);
      const [, e1] = await manage({ action: "install_extension_url", url: 5 });
      assert.match(e1.detail, /install_extension_url requires: url/);
      // THE CONFIRM GATE (audit I-S6, 2026-10-22): without the
      // caller-passed flag the door refuses 409 before ANY fetch and
      // no operation row lands
      const [refusedCode, eRefused] = await manage({ action: "install_extension_url", url: "https://x/y" });
      assert.equal(refusedCode, 409);
      assert.match(eRefused.detail, /operator_confirmed/);
      assert.deepEqual(provisioningExternalCalls, [], "the refused press never reaches provisioning");
      const [code, env] = await manage({ action: "install_extension_url", url: "https://x/y", operator_confirmed: true });
      assert.equal(code, 200);
      assert.match(env.detail, /git-url installed/);
      assert.deepEqual(provisioningExternalCalls, [{ kind: "extension", url: "https://x/y" }]);
      // THE REF PIN (the unpinned-URL law, 2026-10-21): an operator
      // free-text install carries the same pin law as every declared
      // nodes.yaml row — the ref threads tool → plane → provisioning
      // → Manager install; absent stays absent (never an empty-string pin).
      const [code2] = await manage({ action: "install_extension_url", url: "https://x/y", ref: "0b8941ff", operator_confirmed: true });
      assert.equal(code2, 200);
      assert.deepEqual(provisioningExternalCalls[1], { kind: "extension", url: "https://x/y", ref: "0b8941ff" });
      // an explicit empty ref is the absent face (never an empty-string pin)
      const [code3] = await manage({ action: "install_extension_url", url: "https://x/y", ref: "", operator_confirmed: true });
      assert.equal(code3, 200);
      assert.deepEqual(provisioningExternalCalls[2], { kind: "extension", url: "https://x/y" });
    } finally {
      rmRoot();
    }
  });
});

describe("hDownloadModel", () => {
  it("guards paths and delegates the unverified external artifact to provisioning", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "download_model" });
      assert.match(e0.detail, /download_model requires: url/);
      const [, e1] = await manage({ action: "download_model", url: "http://h/f", relative_path: "../x" });
      assert.match(e1.detail, /must stay under the models root/);
      const [, e1b] = await manage({ action: "download_model", url: "http://h/f", relative_path: "/abs" });
      assert.match(e1b.detail, /must stay under the models root/);
      // the no-loras-remote law, enforced at the fetch door: a LoRA
      // arrives by copy or upload (lora_install), never by url
      const [, e1c] = await manage({ action: "download_model", url: "http://h/l.safetensors", relative_path: "loras" });
      assert.equal(e1c.ok, false);
      assert.match(e1c.detail, /download_model refuses the loras dir/);
      assert.match(e1c.detail, /lora_install/);
      const [, e1d] = await manage({ action: "download_model", url: "http://h/l.safetensors", relative_path: "models/loras" });
      assert.match(e1d.detail, /download_model refuses the loras dir/);
      const [, e2] = await manage({ action: "download_model", url: "http://h/f", filename: "a/b" });
      assert.match(e2.detail, /must be a bare name/);
      const [, e2b] = await manage({ action: "download_model", url: "http://h/" });
      assert.match(e2b.detail, /must be a bare name/);
      // THE CONFIRM GATE (audit I-S6): no flag, no fetch — 409 with
      // the wire field named, zero provisioning calls
      const [gateCode, eGate] = await manage({
        action: "download_model",
        url: "http://h/dir/f.bin",
        relative_path: "models/ckpt",
      });
      assert.equal(gateCode, 409);
      assert.match(eGate.detail, /operator_confirmed=true/);
      assert.deepEqual(provisioningExternalCalls, [], "the unconfirmed press never fetches");
      const [code, env] = await manage({
        action: "download_model",
        url: "http://h/dir/f.bin",
        relative_path: "models/ckpt",
        timeout_seconds: 9999,
        operator_confirmed: true,
      });
      assert.equal(code, 200);
      assert.match(env.detail, /downloaded f\.bin/);
      assert.deepEqual(provisioningExternalCalls, [{
        kind: "model",
        url: "http://h/dir/f.bin",
        relativePath: "ckpt",
        filename: "f.bin",
      }]);
      // N5 (the dry-sweep): the fence rides segmentConfined now — an
      // inner-dot name is a LEGAL segment (the old hand-roll refused
      // it, drifted from the grammar every other door rides); a NUL
      // byte stays the SSOT's behavioral wall
      const [dotCode, eDot] = await manage({ action: "download_model", url: "http://h/f", relative_path: "models/ckpt", filename: "model..ckpt", operator_confirmed: true });
      assert.equal(dotCode, 200);
      assert.equal(eDot.ok, true);
      assert.deepEqual(provisioningExternalCalls[provisioningExternalCalls.length - 1], {
        kind: "model",
        url: "http://h/f",
        relativePath: "ckpt",
        filename: "model..ckpt",
      });
      const [, eNul] = await manage({ action: "download_model", url: "http://h/f", filename: "a\0b" });
      assert.match(eNul.detail, /must be a bare name/);
      // T-E3 (the C5 filename law rides the derived name too): the
      // query and the fragment are never the file's name — the old
      // split("/").pop() kept them and landed bytes under a name
      // the engine never listed; %XX escapes decode to the true name
      for (const [u, derived] of [
        ["http://h/dir/f.bin?download=1", "f.bin"],
        ["http://h/dir/f.bin#sha=abc", "f.bin"],
        ["http://h/dir/model%20v2.safetensors", "model v2.safetensors"],
      ] as const) {
        const [c, e] = await manage({ action: "download_model", url: u, relative_path: "models/ckpt", operator_confirmed: true });
        assert.equal(c, 200, u);
        assert.equal(e.ok, true, u);
        assert.deepEqual(provisioningExternalCalls[provisioningExternalCalls.length - 1], {
          kind: "model",
          url: u,
          relativePath: "ckpt",
          filename: derived,
        });
      }
      // The download bound is the railMs clamp (timeout_seconds 9999
      // caps at 850s): a hanging external acquire outlives 849_999ms
      // of advanced fake time and answers the 504 timeout voice at
      // exactly 850_000ms.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const hungExternal: ExternalProvisionRequest[] = [];
      const hungCtx = CTX({
        provisioning: {
          ...fakeProvisioning,
          acquireExternal: (request: ExternalProvisionRequest, _opts: unknown, signal: AbortSignal) => {
            hungExternal.push(request);
            return new Promise<ProvisionResult>((_resolve, reject) => {
              signal.addEventListener("abort", () => reject(signal.reason), { once: true });
            });
          },
        },
      });
      const pendingClamp = manage(
        { action: "download_model", url: "http://h/dir/f.bin", relative_path: "models/ckpt", timeout_seconds: 9999, operator_confirmed: true },
        hungCtx,
      );
      await vi.advanceTimersByTimeAsync(849_999);
      assert.equal(hungExternal.length, 1);
      await vi.advanceTimersByTimeAsync(1);
      const [clampCode, clampEnvelope] = await pendingClamp;
      vi.useRealTimers();
      assert.equal(clampCode, 504);
      assert.match(clampEnvelope.detail, /timed out/);
    } finally {
      rmRoot();
    }
  });
});

describe("hProvisionModel", () => {
  it("needs a model; undeclared names are 404", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "provision_model" });
      assert.match(e0.detail, /provision_model requires: model/);
      const [c1, e1] = await manage({ action: "provision_model", model: "ghost" });
      assert.equal(c1, 404);
      assert.equal(e1.ok, false);
      assert.match(e1.detail, /model "ghost" is not declared/);
      assert.deepEqual(fakeProvisioning.ensureCalls, []);
    } finally {
      rmRoot();
    }
  });

  it("re-resolves a family miss against a declared card plan", async () => {
    mkRoot();
    try {
      const family = modelRef("mask", "family", "fp16", "q4");
      const card = modelRef("mask", "card", "fp16", "q4");
      const plan = modelPlan(card, [
        modelItem(card, { key: "mask:sam3", name: "sam3.1_multiplex_fp16.safetensors", folder: "sams" }),
        modelItem(card, { key: "mask:sam2", name: "sam2.1_hiera_large.pt", folder: "sams" }),
      ]);
      fakeProvisioning.plans.set(resourceKey(card), plan);
      fakeProvisioning.outcomes.set(
        resourceKey(card),
        resultFor(card, "active", plan.items.map((item) => resultItem(item)), "verified card provisions"),
      );
      let railCalls = 0;
      route(() => {
        railCalls++;
        return json({});
      });
      const [code, env] = await manage({
        action: "provision_model",
        model: "mask",
        variant: "fp16",
        quant: "q4",
      });
      assert.equal(code, 200);
      assert.equal(env.ok, true);
      assert.equal(env.detail, "verified card provisions");
      const data = env.data as { model: string; state: string; files: string[]; present: string[]; operation_id: string };
      assert.equal(data.model, "mask");
      assert.equal(data.state, "active");
      assert.deepEqual(data.files, ["mask:sam3", "mask:sam2"]);
      assert.deepEqual(data.present, ["mask:sam3", "mask:sam2"]);
      assert.equal(data.operation_id, "op-model-mask");
      assert.equal(railCalls, 0);
      assert.deepEqual(fakeProvisioning.planCalls, [family, card]);
      assert.deepEqual(fakeProvisioning.ensureCalls, [card]);
    } finally {
      rmRoot();
    }
  });

  it("a declared family refusal does not masquerade as an unknown card", async () => {
    mkRoot();
    try {
      const models = { allDecls: () => [{ id: "anima", variants: [] }] } as unknown as ManageCtx["models"];
      const [code, env] = await manage(
        { action: "provision_model", model: "anima" },
        CTX({ models }),
      );
      assert.equal(code, 404);
      assert.equal(env.ok, false);
      assert.match(env.detail, /model "anima"/);
      assert.doesNotMatch(env.detail, /unknown card/);
      assert.deepEqual(fakeProvisioning.planCalls, [modelRef("anima")]);
    } finally {
      rmRoot();
    }
  });

  it("recognizes declared variant and cell routes before card fallback", async () => {
    mkRoot();
    try {
      const models = {
        allDecls: () => [{ id: "family", variants: [{ route: "family-route", cells: [{ route: "family-cell" }] }] }],
      } as unknown as ManageCtx["models"];
      for (const id of ["family-route", "family-cell"]) {
        const [code, env] = await manage({ action: "provision_model", model: id }, CTX({ models }));
        assert.equal(code, 404);
        assert.doesNotMatch(env.detail, /unknown card/);
      }
      assert.deepEqual(fakeProvisioning.planCalls, [modelRef("family-route"), modelRef("family-cell")]);
    } finally {
      rmRoot();
    }
  });

  it("preserves a non-Error family-plan refusal", async () => {
    mkRoot();
    try {
      const models = { allDecls: () => [{ id: "family", variants: [] }] } as unknown as ManageCtx["models"];
      const provisioning = {
        ...fakeProvisioning,
        plan: async () => { throw "raw family refusal"; },
      } as unknown as ManageCtx["provisioning"];
      const [code, env] = await manage(
        { action: "provision_model", model: "family" },
        CTX({ models, provisioning }),
      );
      assert.equal(code, 404);
      assert.equal(env.detail, "raw family refusal");
    } finally {
      rmRoot();
    }
  });

  it("maps verified, failed, and partial model result envelopes", async () => {
    mkRoot();
    try {
      const ref = modelRef("m");
      const plan = modelPlan(ref, [
        modelItem(ref, { key: "good", name: "good.bin" }),
        modelItem(ref, { key: "bad", name: "bad.bin" }),
      ]);
      fakeProvisioning.plans.set(resourceKey(ref), plan);
      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(ref, "active", plan.items.map((item) => resultItem(item)), "verified"),
      );
      const [c1, e1] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c1, 200);
      assert.equal(e1.ok, true);
      assert.equal(e1.detail, "verified");
      assert.deepEqual((e1.data as { state: string; files: string[]; present: string[] }).files, ["good", "bad"]);
      assert.deepEqual((e1.data as { state: string; files: string[]; present: string[] }).present, ["good", "bad"]);

      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(
          ref,
          "failed",
          [resultItem(plan.items[0]!, "failed", { errorCode: "artifact/http-refused", detail: "artifact refused" })],
          "artifact acquisition failed",
        ),
      );
      const [c2, e2] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c2, 500);
      assert.equal(e2.ok, false);
      assert.equal(e2.detail, "artifact acquisition failed");
      assert.deepEqual((e2.data as { errors: Array<{ file: string; error: string }> }).errors, [
        { file: "good", error: "artifact refused" },
      ]);

      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(
          ref,
          "partial",
          [
            resultItem(plan.items[0]!),
            resultItem(plan.items[1]!, "failed", { errorCode: "artifact/http-refused", detail: "bad artifact refused" }),
          ],
          "partial (2 item(s))",
        ),
      );
      const [c3, e3] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c3, 500);
      assert.equal(e3.ok, false);
      assert.equal((e3.data as { state: string }).state, "partial");
      assert.deepEqual((e3.data as { files: string[] }).files, ["good"]);
    } finally {
      rmRoot();
    }
  });

  it("a provision that resolves past the rail serves its envelope (a resolved value is real — the 504 is for unresolved work)", async () => {
    mkRoot();
    const now = vi.spyOn(Date, "now");
    try {
      const ref = modelRef("m");
      fakeProvisioning.plans.set(resourceKey(ref), modelPlan(ref));
      // The fuse is a real 1s timer that never fires inside this
      // test, so the jump isolates the resolve-past-the-rail race:
      // work landed one tick past boundAt holding a real result, and
      // nothing has been written to the wire — the door answers the
      // envelope instead of a 504 for a value it is holding (the old
      // Date.now() >= boundAt arm reported timeout for served work,
      // the 2026-10-22 audit's S5 race).
      now.mockReturnValueOnce(0).mockReturnValue(1_000_000);
      const [code, env] = await manage({ action: "provision_model", model: "m", timeout_seconds: 1 });
      assert.equal(code, 200);
      assert.equal(env.ok, true);
      assert.match(env.detail, /active|partial/);
    } finally {
      now.mockRestore();
      rmRoot();
    }
  });
});

describe("hRestart", () => {
  it("reboots, honors the dropped-connection voice, maps the rest", async () => {
    mkRoot();
    try {
      route(() => json({}));
      const [c1, e1] = await manage({ action: "restart", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /reboot issued \(systemd/);
      route(() => text("boom fetch failed", 503));
      const [c2, e2] = await manage({ action: "restart", force: true });
      assert.equal(c2, 200);
      assert.match(e2.detail, /connection closed by restart/);
      route(() => text("overhaul", 503));
      const [c3, e3] = await manage({ action: "restart", force: true });
      assert.equal(c3, 503);
      assert.match(e3.detail, /overhaul/);
      route(() => text("gone", 404));
      const [c4] = await manage({ action: "restart", force: true });
      assert.equal(c4, 404);
      route(() => {
        throw new Error("boom");
      });
       const [c5, e5] = await manage({ action: "restart", force: true });
       assert.equal(c5, 503);
       assert.match(e5.detail, /management plane unavailable/);
       route((_url, init) => {
         if (init?.signal?.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
         return new Promise<Response>((_resolve, reject) => {
           init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
         });
       });
       vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
       const pendingTimeout = manage({ action: "restart", force: true });
       await vi.advanceTimersByTimeAsync(10_000);
       const [cTimeout, eTimeout] = await pendingTimeout;
       vi.useRealTimers();
       assert.equal(cTimeout, 504);
       assert.match(eTimeout.detail, /timed out/);
       const [, e6] = await manage({ action: "restart", force: true }, CTX({ endpoint: () => ({}) }));
      assert.match(e6.detail, /byo endpoint/);
    } finally {
      rmRoot();
    }
  });
});

describe("hUpdate + hSwitchVersion", () => {
  it("update guards the target, queues through the vendor", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "update", target: "manager" });
      assert.match(e0.detail, /update target must be comfy/);
      let polls = 0;
      route((url) => {
        if (url.includes("/manager/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }
            : { is_processing: true, in_progress_count: 1, total_count: 0, done_count: 0 });
        }
        return json({});
      });
      const [c1, e1] = await manage({ action: "update", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /update\(comfy\) queued/);
      route(() => text("bad", 500));
      const [c2, e2] = await manage({ action: "update", force: true });
      assert.equal(c2, 502);
      assert.match(e2.detail, /manager api error 500/);
    } finally {
      rmRoot();
    }
  });

  it("switch_version pins to the vendor list", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "switch_version" });
      assert.match(e0.detail, /switch_version requires: version/);
      route(() => json({ versions: ["a", "b"] }));
      const [c1, e1] = await manage({ action: "switch_version", version: "z", force: true });
      assert.equal(c1, 404);
      assert.match(e1.detail, /not available \(have: a, b/);
      route((url) => (url.includes("comfyui_versions") ? json({ versions: ["a"] }) : json({})));
      const [c2, e2] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c2, 200);
      assert.match(e2.detail, /switch to a issued/);
      assert.deepEqual((e2.data as { restart_required: boolean }).restart_required, true);
      route(() => {
        throw new TypeError("cut");
      });
      const [c3] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c3, 503);
    } finally {
      rmRoot();
    }
  });

  it("a string throw softens through the generic envelope", async () => {
    mkRoot();
    try {
      const ref = modelRef("m");
      fakeProvisioning.plans.set(resourceKey(ref), modelPlan(ref));
      fakeProvisioning.outcomes.set(resourceKey(ref), "plain-string-fail");
      const [code, env] = await manage({ action: "provision_model", model: "m" });
      assert.equal(code, 500);
      assert.equal(env.detail, "plain-string-fail");
    } finally {
      rmRoot();
    }
  });
});

describe("hFree", () => {
  it("needs the endpoint url; frees; maps", async () => {
    mkRoot();
    try {
      const [c0, e0] = await manage({ action: "free" }, CTX({ endpoint: () => ({}) }));
      assert.equal(c0, 503);
      assert.match(e0.detail, /management plane unavailable/);
      route(() => json({}));
      const [c1, e1] = await manage({ action: "free" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /free issued/);
      route(() => text("sec", 403));
      const [c2] = await manage({ action: "free" });
      assert.equal(c2, 403);
    } finally {
      rmRoot();
    }
  });
});

describe("hEndpointSet", () => {
  const cfgFile = (): string => {
    const f = join(mkdtempSync(join(tmpdir(), "epcfg-")), "endpoint.json");
    process.env.COMFYUI_ENDPOINT_CONFIG = f;
    return f;
  };

  it("THE ENV FENCE (audit I-S2): a divergent COMFYUI_URL refuses 409 before any probe", async () => {
    mkRoot();
    const savedEnv = process.env.COMFYUI_URL;
    try {
      delete process.env.COMFYUI_URL;
      route(() => json({ system: { comfyui_version: "3.0" } }));
      process.env.COMFYUI_URL = "http://elsewhere:9188";
      let probed = 0;
      route(() => {
        probed++;
        return json({ system: { comfyui_version: "3.0" } });
      });
      const [c0, e0] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c0, 409);
      assert.match(e0.detail, /COMFYUI_URL='http:\/\/elsewhere:9188' overrides the config file/);
      assert.equal(probed, 0, "the fence fires before the probe — no write, no fetch");
      // the equal-env case is the legal shape: the write proceeds
      process.env.COMFYUI_URL = "http://h:8188";
      const f = cfgFile();
      const [c1] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c1, 200);
    } finally {
      if (savedEnv === undefined) delete process.env.COMFYUI_URL;
      else process.env.COMFYUI_URL = savedEnv;
      rmRoot();
    }
  });

  it("validates, probes, writes (other fields preserved)", async () => {
    mkRoot();
    try {
      delete process.env.COMFYUI_URL; // the I-S2 fence must not gate these legs
      const [, e0] = await manage({ action: "endpoint_set" });
      assert.match(e0.detail, /endpoint_set requires: url/);
      const [, e1] = await manage({ action: "endpoint_set", url: "ftp://h" });
      assert.match(e1.detail, /must be http/);
      route(() => {
        throw new TypeError("down");
      });
      const [c2, e2] = await manage({ action: "endpoint_set", url: "http://h:8188/" });
      assert.equal(c2, 502);
      assert.match(e2.detail, /did not answer/);
      route(() => text("bad", 500));
      const [c3] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c3, 502);
      const f = cfgFile();
      writeFileSync(f, JSON.stringify({ url: "http://old:8188", provision: "managed" }));
      route(() => json({ system: { comfyui_version: "3.0" } }));
      const [c4, e4] = await manage({ action: "endpoint_set", url: "http://new:8188///" });
      assert.equal(c4, 200);
      assert.match(e4.detail, /endpoint set to http:\/\/new:8188 \(ComfyUI 3\.0 answered\)/);
      const saved = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
      assert.equal(saved["url"], "http://new:8188");
      assert.equal(saved["provision"], "managed");
      assert.deepEqual((e4.data as { url: string }).url, "http://new:8188");
      route(() => json({}));
      const [c5, e5] = await manage({ action: "endpoint_set", url: "http://new:8188" });
      assert.equal(c5, 200);
      assert.match(e5.detail, /ComfyUI \? answered/);
    } finally {
      rmRoot();
    }
  });

  it("write failures refuse (endpoint unchanged)", async () => {
    mkRoot();
    try {
      // J6: the config rides the atomic writer, which CREATES parent
      // dirs — a missing dir no longer fails. The un-writable target
      // is a parent that is a regular FILE: mkdir answers ENOTDIR
      // and the Refused(500) voice keeps its pin.
      const blocker = join(ROOT, "not-a-dir");
      writeFileSync(blocker, "x", "utf8");
      process.env.COMFYUI_ENDPOINT_CONFIG = join(blocker, "endpoint.json");
      route(() => json({ system: {} }));
      const [code, env] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(code, 500);
      assert.match(env.detail, /config write failed/);
    } finally {
      rmRoot();
    }
  });
});

describe("lists + snapshots", () => {
  it("list_extensions versions (version/ver/?) and null docs", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "list_extensions" }, CTX({ endpoint: () => ({}) }));
      assert.match(e0.detail, /byo endpoint/);
      route(() => json({ a: { version: "1" }, b: { ver: "2" }, c: {} }));
      const [c1, e1] = await manage({ action: "list_extensions" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /3 installed pack\(s\)/);
      assert.deepEqual(
        (e1.data as Array<{ name: string; version: string }>).map((r) => r.version),
        ["1", "2", "?"],
      );
      route(() => json(null));
      const [, e2] = await manage({ action: "list_extensions" });
      assert.match(e2.detail, /0 installed pack\(s\)/);
    } finally {
      rmRoot();
    }
  });

  it("snapshot_list/save/restore", async () => {
    mkRoot();
    try {
      route(() => json({ items: ["s1", "s2"] }));
      const [c1, e1] = await manage({ action: "snapshot_list" });
      assert.equal(c1, 200);
      assert.deepEqual(e1.data, ["s1", "s2"]);
      route(() => json({}));
      const [, e1b] = await manage({ action: "snapshot_list" });
      assert.deepEqual(e1b.data, []);
       route((url) => (url.includes("/snapshot/save") ? json({ snapshot: "fresh" }) : json({ items: ["fresh"] })));
      const [c2, e2] = await manage({ action: "snapshot_save" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /snapshot saved: fresh/);
      route((url) => (url.includes("/snapshot/save") ? json({}) : json({ items: [] })));
       const [, e2b] = await manage({ action: "snapshot_save" });
       assert.match(e2b.detail, /snapshot save completed without a verifiable snapshot name/);
      route(() => text("bad", 500));
      const [c2c] = await manage({ action: "snapshot_save" });
      assert.equal(c2c, 502);
      const [, e3] = await manage({ action: "snapshot_restore" });
      assert.match(e3.detail, /snapshot_restore requires: snapshot/);
      route(() => json({}));
      const [c4, e4] = await manage({ action: "snapshot_restore", snapshot: "s1", force: true });
      assert.equal(c4, 200);
      assert.match(e4.detail, /restore of s1 scheduled/);
    } finally {
      rmRoot();
    }
  });

  it("the drain deadline returns the stuck state", async () => {
    mkRoot();
    try {
      route(() => json({ is_processing: true, in_progress_count: 1, total_count: 1, done_count: 0 }));
      const t0 = Date.now();
       const [code, env] = await manage({ action: "update", force: true, timeout_seconds: 0 });
       assert.equal(code, 504);
       assert.ok(Date.now() - t0 >= 900);
       assert.match(env.detail, /queue did not drain/);
    } finally {
      rmRoot();
    }
  });
});

describe("residual arms", () => {
  it("wait booleans ride; counts default; probe failures name the cause", async () => {
    mkRoot();
    try {
      route(() => json({ system: {}, devices: [] }));
      const [c1, e1] = await manage({ action: "status", wait: true, timeout_seconds: "x" });
      assert.equal(c1, 200);
      assert.equal(e1.action, "status");
      let polls = 0;
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: {}, devices: [] });
        if (url.includes("/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }
            : {});
        }
        return json({});
      });
      const [c2] = await manage({ action: "update", force: true });
      assert.equal(c2, 200);
      route((url) => {
        if (url.endsWith("/system_stats")) throw new TypeError("refused");
        return json({});
      });
      const [, e3] = await manage({ action: "status" });
      const data = e3.data as { endpoint: { reachable: boolean; reason: string } };
      assert.equal(data.endpoint.reachable, false);
      assert.match(data.endpoint.reason, /refused/);
      route((url) => {
        if (url.includes("/manager/version")) throw "str-fail";
        if (url.endsWith("/system_stats")) return json({});
        return json({});
      });
      const [, e4] = await manage({ action: "status" });
      const m = (e4.data as { manager: { reason: string } }).manager;
      assert.match(m.reason, /management plane unavailable.*str-fail/);
    } finally {
      rmRoot();
    }
  });

  it("download string-throws; guard passes empty roots; install uses declared plans", async () => {
    mkRoot();
    try {
      const [c1, e1] = await manage({ action: "download_model", url: "http://h/f", filename: "m.bin", operator_confirmed: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /downloaded m\.bin/);
      assert.deepEqual(provisioningExternalCalls, [{
        kind: "model",
        url: "http://h/f",
        relativePath: "checkpoints",
        filename: "m.bin",
      }]);
      fakeBin({ systemctl: { out: "", code: 0 } });
      route(() => json({}));
      const [c2, e2] = await manage({ action: "stop" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /stop issued/);
      fakeProvisioning.plans.set(resourceKey(extensionRef("c1")), extensionPlan("c1"));
      fakeProvisioning.plans.set(resourceKey(extensionRef("pack")), extensionPlan("pack"));
       const [c3, e3] = await manage({ action: "install_extension", nodes: ["c1", "pack", "ghost"] });
       assert.equal(c3, 500);
       assert.match(e3.detail, /partial \(2\/3 extension\(s\) succeeded\)/);
      const data = e3.data as { queued: string[]; misses: string[] };
      assert.deepEqual(data.queued, ["extension:c1", "extension:pack"]);
      assert.deepEqual(data.misses, ['ghost: extension "ghost" is not declared']);
      const [c4, e4] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c4, 200);
      assert.ok(!e4.detail.includes("not in cache"));
      const [c5, e5] = await manage({ action: "install_extension", nodes: ["3.0"] });
      assert.equal(c5, 404);
      assert.match(e5.detail, /extension is not declared: 3\.0/);
    } finally {
      rmRoot();
    }
  });

  it("declared install bypasses the legacy rail; list, snapshots, restore still map", async () => {
    mkRoot();
    try {
      let railCalls = 0;
      route((url) => {
        railCalls++;
        if (url.includes("/customnode/installed")) return text("sec", 403);
        return json({});
      });
      const ref = extensionRef("x");
      const plan = extensionPlan("x");
      fakeProvisioning.plans.set(resourceKey(ref), plan);
      fakeProvisioning.outcomes.set(
        resourceKey(ref),
        resultFor(ref, "failed", [resultItem(plan.items[0]!, "failed", { errorCode: "manager/install-failed", detail: "manager refused install_extension" })], "manager refused install_extension"),
      );
      const [c1, e1] = await manage({ action: "install_extension", nodes: ["x"] });
      assert.equal(c1, 500);
      assert.equal(e1.ok, false);
      assert.match(e1.detail, /failed \(1 item\(s\)\)/);
      assert.equal(railCalls, 0);
      const [c2] = await manage({ action: "list_extensions" });
      assert.equal(c2, 403);
      route((url) => {
        if (url.includes("/snapshot/getlist")) return text("gone", 404);
        return json({});
      });
      const [c3, e3] = await manage({ action: "snapshot_list" });
      assert.equal(c3, 404);
      assert.match(e3.detail, /no such target/);
      route((url) => {
        if (url.includes("/snapshot/restore")) return text("bad", 500);
        return json({});
      });
      const [c4] = await manage({ action: "snapshot_restore", snapshot: "s", force: true });
      assert.equal(c4, 502);
    } finally {
      rmRoot();
    }
  });

  it("endpoint string-throws; version lists default; snapshot names default", async () => {
    mkRoot();
    try {
      route(() => {
        throw "probe-cut";
      });
      const [c1, e1] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c1, 502);
      assert.match(e1.detail, /probe-cut/);
      route((url) => (url.includes("comfyui_versions") ? json({}) : json({})));
      const [c2, e2] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c2, 404);
      assert.match(e2.detail, /have: …/);
      route((url) => (url.includes("/snapshot/save") ? json({}) : json({})));
       const [, e3] = await manage({ action: "snapshot_save" });
       assert.match(e3.detail, /snapshot save completed without a verifiable snapshot name/);
    } finally {
      rmRoot();
    }
  });
});

// THE TRUST MERGE (audit I-S6, 2026-10-22): a served active row
// re-stats its recorded paths before status trusts it — a file
// deleted after the fetch demotes the row to absent naming the
// operation and the gone path; a live file keeps serving active.
describe("hStatus trust re-verify (audit I-S6)", () => {
  const statusCtx = (operationPath: string, exists: boolean): ManageCtx => {
    const ref: ResourceRef = { kind: "model", owner: "card", id: "external-model" };
    const row: ResourceStatus = {
      ref,
      state: "active",
      items: [{
        key: "external:op-ext-1",
        kind: "model",
        state: "active",
        path: operationPath,
        integrity: "operator-unverified",
      }],
    };
    return CTX({
      provisioning: {
        ...fakeProvisioning,
        reconcile: async (): Promise<ResourceStatus[]> => [row],
        operationOf: () => ({
          operationId: "op-ext-1",
          ref,
          state: "active",
          items: [{
            key: "external:op-ext-1",
            kind: "model",
            state: "active",
            path: operationPath,
            integrity: "operator-unverified",
          }],
          startedAt: Date.now(),
          finishedAt: Date.now(),
        }),
        // the probe the service itself runs — the fake answers the
        // recorded path's real fate (the walls write/delete the file).
        // The port's own param type is stated: the spread above leaves
        // this property without a contextual type (ports.ts verifyOperation)
        verifyOperation: async (operation: ProvisionOperation) => exists
          ? operation
          : {
              ...operation,
              state: "absent",
              items: operation.items.map((item) => ({
                ...item,
                state: "absent",
                detail: "the recorded path is gone (" + operationPath + ") — operation " +
                  operation.operationId + " landed bytes that no longer exist; run the download again",
              })),
            },
      },
    });
  };

  it("a file deleted after landing demotes the served row to absent, naming the operation and the path", async () => {
    mkRoot();
    try {
      const gone = join(ROOT, "gone-model.safetensors");
      const [, env] = await manage({ action: "status" }, statusCtx(gone, false));
      const data = env.data as { resources: Array<{ state: string; detail?: string }>; operations: Array<{ state: string; next_action: string }> };
      assert.equal(data.resources[0]?.state, "absent", "the deleted file does not serve active");
      assert.match(data.resources[0]?.detail ?? "", /the recorded path is gone/);
      assert.match(data.resources[0]?.detail ?? "", /op-ext-1/);
      assert.equal(data.operations[0]?.state, "absent");
    } finally {
      rmRoot();
    }
  });

  it("a file still on disk keeps serving active", async () => {
    mkRoot();
    try {
      const live = join(ROOT, "live-model.safetensors");
      writeFileSync(live, "bytes");
      const [, env] = await manage({ action: "status" }, statusCtx(live, true));
      const data = env.data as { resources: Array<{ state: string }> };
      assert.equal(data.resources[0]?.state, "active");
    } finally {
      rmRoot();
    }
  });
});

describe("the weight-landing re-arm on the synchronous doors", () => {
  it("download_model and provision_model fire the re-arm; a refused door never does", async () => {
    mkRoot();
    try {
      // the declared-family plan the provision door needs
      const card = modelRef("mask", "card", "fp16", "q4");
      const plan = modelPlan(card, [
        modelItem(card, { key: "mask:sam3", name: "sam3.1_multiplex_fp16.safetensors", folder: "sams" }),
      ]);
      fakeProvisioning.plans.set(resourceKey(card), plan);
      fakeProvisioning.outcomes.set(
        resourceKey(card),
        resultFor(card, "active", plan.items.map((item) => resultItem(item)), "verified card provisions"),
      );
      const rearms: number[] = [];
      const ctx = CTX({ rearmWeights: (): void => { rearms.push(rearms.length); } });

      // the unconfirmed download press refuses BEFORE any landing —
      // no re-arm for a door that fetched nothing
      await manage({
        action: "download_model",
        url: "http://h/dir/f.bin",
        relative_path: "models/ckpt",
      }, ctx);
      assert.equal(rearms.length, 0);

      // the confirmed press lands the file — the presence face re-arms
      const [code, env] = await manage({
        action: "download_model",
        url: "http://h/dir/f.bin",
        relative_path: "models/ckpt",
        operator_confirmed: true,
      }, ctx);
      assert.equal(code, 200);
      assert.match(env.detail, /downloaded f\.bin/);
      assert.equal(rearms.length, 1);

      // the provision door lands synchronously under ensure
      const [pcode] = await manage({
        action: "provision_model",
        model: "mask",
        variant: "fp16",
        quant: "q4",
      }, ctx);
      assert.equal(pcode, 200);
      assert.equal(rearms.length, 2);
    } finally {
      rmRoot();
    }
  });
});
