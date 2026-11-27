// manage-lifecycle-latch.spec.ts — the MP-R1 lifecycle latch wall:
// the latch unit arms, the row's behaviour (a press born mid-teardown
// refuses with the named code; the same press succeeds once the door
// settles), and door-side independence (a live run still makes the
// guard refuse a teardown). Fetch is routed per test, state roots are
// temp dirs; the runs seat mirrors runs-registry-start.spec.ts.
import { describe, it, afterEach, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { DECL as FIT_DECL } from "../../../models/fit/src/index.ts";
import { DECL as SKIN_DECL } from "../../../models/skin/src/index.ts";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { LifecycleLatch } from "../src/lifecycleLatch.ts";
import { resolveStateRoot } from "../src/queueLock.ts";
import { rootsManifest } from "../src/rootsManifest.ts";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import type { RunRecord } from "../src/runsTypes.ts";

// THE BEST-EFFORT UNLINK's WALL (round-20 lifecycle audit Q1): the
// refused press's rmSync must be best-effort — a refusing unlink must
// never replace the named 409. The override rides vi.hoisted so the
// hoisted mock factory can read it.
const FAIL_RM = vi.hoisted(() => ({ victim: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    rmSync: (path: Parameters<typeof actual.rmSync>[0], options: Parameters<typeof actual.rmSync>[1]): void => {
      if (FAIL_RM.victim) throw Object.assign(new Error("rim refused"), { code: "EBUSY" });
      return actual.rmSync(path, options);
    },
  };
});

const realFetch = globalThis.fetch;

// THE OWNERSHIP LAW (2026-11-20 cordis-waterfall F3): the latch is
// INSTANCE state the queue seat owns — manage doors and the press
// share ONE instance per test, exactly as production threads
// ctx.queue.lifecycleLatch into both planes. A leaked hold on the
// shared instance blocks every later press — fail LOUD, never carry.
let LATCH = new LifecycleLatch();
beforeEach(() => {
  LATCH = new LifecycleLatch();
});

let TMPS: string[] = [];
const tmp = (prefix: string): string => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  TMPS.push(d);
  return d;
};
afterEach(() => {
  globalThis.fetch = realFetch;
  assert.equal(LATCH.inFlight(), null, "latch leaked across tests");
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
    latch: LATCH,
    repoRoot: ROOT,
    stateRoots: rootsManifest(resolveStateRoot({ repoRoot: ROOT }), []),
    comfyUnit: "estate-comfyui.service",
    engineQuiesceMs: 0,
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
// GATE_SECOND_GET parks the press inside its SECOND draft probe —
// the post-reserve re-read (runsRegistry.ts:1074), which sits after
// the press's own latch read — so a test can take the latch mid-press.
let GATE_SECOND_GET: Promise<void> | null = null;
let GETS = 0;
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
  (ctx as unknown as { queue: unknown }).queue = { lifecycleLatch: LATCH, core, stateRoot: state };
  new ModelsSeatFake(ctx);
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      GETS += 1;
      if (GATE_SECOND_GET !== null && GETS === 2) await GATE_SECOND_GET;
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
  // `state` rides the queue mount above (stateRoot); the seat pair is
  // all the callers read.
  return { svc: new RunsRuntimeService(ctx as unknown as Context), core };
};
const inlineBody = (): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  flow_inline: { id: "x", stages: [{ id: "s", engine: "comfyui", outputs: { out: "image" } }] },
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
    const latch = new LifecycleLatch();
    const release = latch.hold("restart");
    try {
      assert.equal(latch.inFlight(), "restart");
    } finally {
      release();
    }
    assert.equal(latch.inFlight(), null);
  });

  it("overlapping doors nest: the earliest holder names the latch; each release retires only its own", async () => {
    const latch = new LifecycleLatch();
    const releaseRestart = latch.hold("restart");
    const releaseFree = latch.hold("free");
    try {
      assert.equal(latch.inFlight(), "restart", "the earliest holder names the latch");
      releaseRestart();
      assert.equal(latch.inFlight(), "free", "the finished door's release retires only its own hold");
    } finally {
      releaseFree();
    }
    assert.equal(latch.inFlight(), null);
  });

  it("the same action nesting counts its holds", async () => {
    const latch = new LifecycleLatch();
    const first = latch.hold("restart");
    const second = latch.hold("restart");
    try {
      assert.equal(latch.inFlight(), "restart");
      first();
      assert.equal(latch.inFlight(), "restart", "a nested hold keeps the latch held");
    } finally {
      second();
    }
    assert.equal(latch.inFlight(), null);
  });

  it("OWNERSHIP (2026-11-20 cordis-waterfall F3): two instances share nothing — a hold on one is invisible to the other, and the release is idempotent", async () => {
    // The retired module-global holders Map made every host, test,
    // and fiber share ONE latch silently; instance ownership means
    // the queue seat's latch is the only one the manage doors and
    // the press can share — threaded explicitly, never ambient.
    const seatA = new LifecycleLatch();
    const seatB = new LifecycleLatch();
    const releaseA = seatA.hold("restart");
    try {
      assert.equal(seatA.inFlight(), "restart");
      assert.equal(seatB.inFlight(), null, "seat B never sees seat A's hold — no ambient state");
      releaseA();
      releaseA();
      assert.equal(seatA.inFlight(), null, "a double release is a no-op, never an over-decrement");
    } finally {
      releaseA();
    }
    assert.equal(seatB.inFlight(), null);
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
      for (let i = 0; i < 100 && LATCH.inFlight() !== "restart"; i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      assert.equal(LATCH.inFlight(), "restart", "the door holds the latch while its vendor call hangs");
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
    assert.equal(LATCH.inFlight(), null, "the settled door released the latch");
    const ans = await s.svc.start(inlineBody(), sig());
    assert.match(ans.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.equal(ans.status, "queued");
    await settleWait(s.core, ans.run_id);
  });

  it("a teardown taking the latch mid-press still refuses the enqueue (the re-check)", async () => {
    mkRoot();
    const s = seat();
    GETS = 0;
    let releaseProbe!: () => void;
    GATE_SECOND_GET = new Promise<void>((resolve) => { releaseProbe = resolve; });
    try {
      const pending = s.svc.start(inlineBody(), sig()).then(
        (v) => ({ ok: v as { run_id: string } }),
        (e: unknown) => ({ err: e as RemoteError }),
      );
      // Sitting in the SECOND draft probe means the press is past its
      // own latch read (the post-reserve re-read runs after it).
      for (let i = 0; i < 200 && GETS < 2; i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      assert.ok(GETS >= 2, "the press reached its second draft probe");
      const releaseDoor = LATCH.hold("restart");
      try {
        releaseProbe();
        const ans = await pending;
        assert.ok("err" in ans, "the press refused, got: " + JSON.stringify(ans));
        const err = (ans as { err: RemoteError }).err;
        assert.equal(err.code, "runs/lifecycle-inflight");
        assert.match(err.message, /restart/, "the refusal names the action in flight");
        assert.equal(s.core.runs.size, 0, "nothing was enqueued");
      } finally {
        releaseDoor();
      }
      // The minted sidecar is gone from the census: the teardown the
      // press just raced is no longer refused by the guard.
      route(() => json({}));
      const [code] = await manage({ action: "restart" });
      assert.equal(code, 200, "the minted dir left no sidecar behind");
    } finally {
      GATE_SECOND_GET = null;
    }
  });

  it("a refused press whose unlink fails still answers the named code (Q1: the rm is best-effort)", async () => {
    mkRoot();
    const s = seat();
    GETS = 0;
    FAIL_RM.victim = true;
    let releaseProbe!: () => void;
    GATE_SECOND_GET = new Promise<void>((resolve) => { releaseProbe = resolve; });
    try {
      const pending = s.svc.start(inlineBody(), sig()).then(
        (v) => ({ ok: v as { run_id: string } }),
        (e: unknown) => ({ err: e as RemoteError }),
      );
      for (let i = 0; i < 200 && GETS < 2; i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      assert.ok(GETS >= 2, "the press reached its second draft probe");
      const releaseDoor = LATCH.hold("restart");
      try {
        releaseProbe();
        const ans = await pending;
        assert.ok("err" in ans, "the press refused, got: " + JSON.stringify(ans));
        assert.equal((ans as { err: RemoteError }).err.code, "runs/lifecycle-inflight",
          "the failed unlink must not replace the named code");
        assert.equal(s.core.runs.size, 0, "nothing was enqueued");
      } finally {
        releaseDoor();
      }
    } finally {
      FAIL_RM.victim = false;
      GATE_SECOND_GET = null;
    }
  });

  it("a boot replay under a held latch defers — the row is never settled failed (Q2)", async () => {
    const state = tmp("runs-latch-boot-");
    const dir = join(state, "output", "run-defer-a");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({ status: "queued", draft_id: "d1", created_at: 1, graph: [], stages: [], skipped_stages: [], artifacts: [] }));
    writeFileSync(join(dir, "_request.json"), JSON.stringify(inlineBody()));
    const release = LATCH.hold("restart");
    try {
      const warns: string[] = [];
      const orig = console.warn;
      console.warn = (...a: unknown[]): void => { warns.push(a.map(String).join(" ")); };
      const ctx = new Context();
      new FlowsSeatService(ctx);
      const core = new QueueCore();
      (ctx as unknown as { queue: unknown }).queue = { lifecycleLatch: LATCH, core, stateRoot: state, stateRoots: [state] };
      (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
        get: async (id: string): Promise<unknown> => {
          if (id === "d1") return {};
          throw new RemoteError("draft/not-found", "no doc", { draftId: id });
        },
      };
      (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
        objectInfo: (): unknown => null,
        defsSync: (): unknown => new Map(),
      };
      new RunsRuntimeService(ctx); // the constructor's fire-and-forget bootReconcile
      try {
        for (let i = 0; i < 200 && !warns.some((w) => w.includes("deferred")); i++) {
          await new Promise((r) => setTimeout(r, 5));
        }
        assert.ok(warns.some((w) => w.includes("deferred")), "the replay deferred loudly: " + JSON.stringify(warns));
        const side = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
        assert.equal(side["status"], "queued", "the row was never settled failed: " + JSON.stringify(side).slice(0, 300));
        assert.equal(core.runs.size, 0, "nothing was enqueued while the teardown held");
      } finally {
        console.warn = orig;
      }
    } finally {
      release();
    }
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
    assert.equal(LATCH.inFlight(), null, "a guard refusal takes no latch");
  });
});
