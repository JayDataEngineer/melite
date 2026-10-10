// manage-lifecycle-latch.spec.ts — the MP-R1 lifecycle latch wall:
// the latch unit arms, the row's behaviour (a press born mid-teardown
// refuses with the named code; the same press succeeds once the door
// settles), and door-side independence (a live run still makes the
// guard refuse a teardown). Fetch is routed per test, state roots are
// temp dirs; the runs seat mirrors runs-registry-start.spec.ts.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { DECL as FIT_DECL } from "../../../models/fit/src/index.ts";
import { DECL as SKIN_DECL } from "../../../models/skin/src/index.ts";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { holdLifecycle, lifecycleInFlight } from "../src/lifecycleLatch.ts";
import { resolveStateRoot } from "../src/queueLock.ts";
import { rootsManifest } from "../src/rootsManifest.ts";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import type { RunRecord } from "../src/runsTypes.ts";

const realFetch = globalThis.fetch;

let TMPS: string[] = [];
const tmp = (prefix: string): string => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  TMPS.push(d);
  return d;
};
afterEach(() => {
  globalThis.fetch = realFetch;
  // A leaked hold blocks every later press — fail LOUD, never carry it.
  assert.equal(lifecycleInFlight(), null, "latch leaked across tests");
  for (const d of TMPS) rmSync(d, { recursive: true, force: true });
  TMPS = [];
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });

// ── manage harness (mirrors manage-plane.spec.ts) ───────────────────
let ROOT = "";
const mkRoot = (): string => {
  ROOT = tmp("manage-latch-");
  return ROOT;
};
const CTX = (): ManageCtx =>
  ({
    repoRoot: ROOT,
    stateRoots: rootsManifest(resolveStateRoot({ repoRoot: ROOT }), []),
    comfyUnit: "estate-comfyui.service",
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
  }) as unknown as ManageCtx;
const runFlow = (name: string, status: string): void => {
  const dir = join(ROOT, "data", "runs", "output", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "_flow.json"), JSON.stringify({ status }));
};
type Route = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;
const route = (fn: Route): void => {
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) =>
    fn(String(url), init)) as typeof fetch;
};
const manage = (doc: unknown): Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]> =>
  dispatchManage(doc, CTX()) as unknown as Promise<
    [number, { ok: boolean; detail: string; action: string; data?: unknown }]
  >;

// ── runs harness (mirrors runs-registry-start.spec.ts) ──────────────
class ModelsSeatFake extends Service {
  constructor(ctx: Context) {
    super(ctx, "models");
  }
  allDecls(): unknown[] {
    return [ANNY_DECL, FIT_DECL, SKIN_DECL];
  }
}
const seat = (): { svc: RunsRuntimeService; core: QueueCore } => {
  const state = tmp("runs-latch-");
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  new ModelsSeatFake(ctx);
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return {};
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    composeValidateCard: async (): Promise<unknown> => null,
    phase1Card: async (): Promise<unknown> => {
      throw new Error("unreached phase1");
    },
    phase2Card: async (): Promise<unknown> => {
      throw new Error("unreached phase2");
    },
  };
  return { svc: new RunsRuntimeService(ctx as unknown as Context), core };
};
const inlineBody = (): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  flow_inline: { id: "x", stages: [{ id: "s", engine: "comfyui" }] },
});
const sig = (): AbortSignal => new AbortController().signal;
const remote = async (fn: () => Promise<unknown>): Promise<RemoteError> => {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof RemoteError, "a RemoteError, got " + String(e));
    return e as RemoteError;
  }
  throw new Error("never threw");
};
const settleWait = async (core: QueueCore, runId: string): Promise<RunRecord> => {
  for (let i = 0; i < 500; i++) {
    const row = core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined && row.status !== "queued") return row;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("pump never settled " + runId);
};

describe("lifecycleLatch unit arms", () => {
  it("hold names the action; release returns null", async () => {
    const release = holdLifecycle("restart");
    try {
      assert.equal(lifecycleInFlight(), "restart");
    } finally {
      release();
    }
    assert.equal(lifecycleInFlight(), null);
  });

  it("a stale release does NOT clear the live hold", async () => {
    const releaseA = holdLifecycle("restart");
    const releaseB = holdLifecycle("free");
    try {
      assert.equal(lifecycleInFlight(), "free");
      releaseA();
      assert.equal(lifecycleInFlight(), "free", "the stale release must not clear the live hold");
    } finally {
      releaseB();
    }
    assert.equal(lifecycleInFlight(), null);
  });
});

describe("the row's behaviour: no run born after the check is torn", () => {
  it("a press mid-teardown refuses with the named code; the same press succeeds once the door settles", async () => {
    mkRoot();
    const s = seat();
    // Gate the door's vendor call: the reboot POST hangs until the
    // test releases it, so the door sits in flight with latch held.
    let releaseGate!: (v: Response) => void;
    const gate = new Promise<Response>((resolve) => { releaseGate = resolve; });
    route((url) => (url.endsWith("/manager/reboot") ? gate : json({})));
    const pending = manage({ action: "restart", force: true });
    try {
      for (let i = 0; i < 100 && lifecycleInFlight() !== "restart"; i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      assert.equal(lifecycleInFlight(), "restart", "the door holds the latch while its vendor call hangs");
      const err = await remote(() => s.svc.start(inlineBody(), sig()));
      assert.equal(err.code, "runs/lifecycle-inflight");
      assert.match(err.message, /restart/, "the refusal names the action in flight");
      assert.match(err.message, /settles/, "the refusal says how to proceed");
      assert.equal(s.core.runs.size, 0, "the refused press minted no run");
    } finally {
      releaseGate(json({}));
    }
    const [code, env] = await pending;
    assert.equal(code, 200);
    assert.match(env.detail, /reboot issued/);
    assert.equal(lifecycleInFlight(), null, "the settled door released the latch");
    const ans = await s.svc.start(inlineBody(), sig());
    assert.match(ans.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.equal(ans.status, "queued");
    await settleWait(s.core, ans.run_id);
  });
});

describe("door-side independence", () => {
  it("a run born and active still makes guardLifecycle refuse a teardown", async () => {
    mkRoot();
    runFlow("run-live", "running");
    route(() => json({}));
    const [code, env] = await manage({ action: "restart" });
    assert.equal(code, 409);
    assert.match(env.detail, /1 active run\(s\) \(run-live\)/);
    assert.equal(lifecycleInFlight(), null, "a guard refusal takes no latch");
  });
});
