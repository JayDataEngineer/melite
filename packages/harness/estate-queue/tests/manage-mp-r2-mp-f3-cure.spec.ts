// manage-mp-r2-mp-f3-cure.spec.ts — the round-19 MP-R2 + MP-F3 cure
// walls (2026-10-10): abort-path cache drops that must follow a
// landed write, and the lifecycle guard's provisioning census.
//
// (a) MP-R2 endpoint_set: an abort delivered between the config
// write and the both-keys oiCache drop still drops (the drop
// precedes the post-write abort check).
// (b) MP-R2 hRestart: an abort inside recordEngineBoot still drops
// (the drop rides a finally; the receipt rethrows the caller's own
// abort instead of laundering it into a success).
// (c) MP-F3 guardLifecycle: a teardown refuses 409 while a
// provisioning fetch holds its lock (or parks in the pre-lock mint
// window), naming the in-flight operation.
//
// The writer is gated per test (the abort window is one await wide
// — only a gate lands inside it deterministically); the
// provisioning arms ride the REAL seat, mirroring
// provisioning/tests/weight-acquire.spec.ts. Fetch is routed per
// test, state roots are temp dirs.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "../src/managePlane.ts";
import { resolveStateRoot } from "../src/queueLock.ts";
import { rootsManifest } from "../src/rootsManifest.ts";
import { holdLifecycle, lifecycleInFlight } from "../src/lifecycleLatch.ts";
import { ProvisioningService } from "../../../estate/provisioning/src/index.ts";
import type {
  ProvisionPlan,
  ProvisionPlanItem,
  ResourceRef,
} from "../../../estate/provisioning/src/index.ts";

// hoisted: vi.mock's factories run before module scope initializes,
// so the shared spies and writer gates live here, not up top.
const seat = vi.hoisted(() => ({
  invalidated: [] as string[],
  writeMode: "real" as "real" | "gate" | "abort-receipt",
  writeEntered: false,
  releaseWrite: null as null | (() => void),
  abortReceipt: null as null | (() => unknown),
}));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...mod,
    invalidateObjectInfo: (key: string): void => {
      seat.invalidated.push(key);
      (mod.invalidateObjectInfo as (key: string) => void)(key);
    },
  };
});

vi.mock("../src/queueLock.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../src/queueLock.ts")>();
  return {
    ...mod,
    writeJsonAtomic: async (filePath: string, obj: unknown): Promise<void> => {
      if (seat.writeMode === "gate") {
        seat.writeEntered = true;
        await new Promise<void>((resolve) => {
          seat.releaseWrite = resolve;
        });
        seat.releaseWrite = null;
      } else if (seat.writeMode === "abort-receipt" && basename(filePath) === ".estate-engine-boot.json") {
        // An abort-aware writer: the caller's abort lands mid-write
        // and the write answers with the abort reason (never a
        // success, never a disk error).
        throw seat.abortReceipt?.() ?? new Error("receipt aborted");
      }
      return await mod.writeJsonAtomic(filePath, obj);
    },
  };
});

const realFetch = globalThis.fetch;
const savedEndpointConfig = process.env.COMFYUI_ENDPOINT_CONFIG;
const savedEngineUrl = process.env.COMFYUI_URL;

let TMPS: string[] = [];
const tmp = (prefix: string): string => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  TMPS.push(d);
  return d;
};
const contexts: Context[] = [];

afterEach(async () => {
  globalThis.fetch = realFetch;
  if (savedEndpointConfig === undefined) delete process.env.COMFYUI_ENDPOINT_CONFIG;
  else process.env.COMFYUI_ENDPOINT_CONFIG = savedEndpointConfig;
  if (savedEngineUrl === undefined) delete process.env.COMFYUI_URL;
  else process.env.COMFYUI_URL = savedEngineUrl;
  seat.invalidated.length = 0;
  seat.writeMode = "real";
  seat.writeEntered = false;
  seat.releaseWrite = null;
  seat.abortReceipt = null;
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const d of TMPS.splice(0)) rmSync(d, { recursive: true, force: true });
  // A leaked hold blocks every later press — fail LOUD, never carry it.
  assert.equal(lifecycleInFlight(), null, "latch leaked across tests");
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });

type Route = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;
const route = (fn: Route): void => {
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) =>
    fn(String(url), init)) as typeof fetch;
};

// ── manage harness (mirrors manage-lifecycle-latch.spec.ts) ──────────
let ROOT = "";
const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
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
    ...over,
  }) as unknown as ManageCtx;

const until = async (ready: () => boolean, what: string): Promise<void> => {
  for (let i = 0; i < 500; i++) {
    if (ready()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("never became ready: " + what);
};

describe("MP-R2 (a): abort between the endpoint write and the drop still drops", () => {
  it("the landed write's both-keys drop runs on the abort path", async () => {
    ROOT = tmp("mp-r2-endpoint-");
    delete process.env.COMFYUI_URL;
    const cfgFile = join(ROOT, "endpoint.json");
    process.env.COMFYUI_ENDPOINT_CONFIG = cfgFile;
    writeFileSync(cfgFile, JSON.stringify({ url: "http://old:8188", provision: "managed" }));
    route(() => json({ system: { comfyui_version: "3.0" } }));
    seat.writeMode = "gate";

    const controller = new AbortController();
    const pending = dispatchManage({ action: "endpoint_set", url: "http://new:8188" }, CTX(), controller.signal);
    // The write await is the only yield between the pre-write and
    // post-write abort checks — park inside it, then abort, then let
    // the write land. Deterministic: no sleep races the window.
    await until(() => seat.writeEntered, "the config write to start");
    controller.abort(new Error("endpoint abort between write and drop"));
    seat.releaseWrite?.();
    await assert.rejects(pending, /endpoint abort between write and drop/);

    const saved = JSON.parse(readFileSync(cfgFile, "utf8")) as Record<string, unknown>;
    assert.equal(saved["url"], "http://new:8188", "the write LANDED before the abort threw");
    assert.deepEqual(
      seat.invalidated,
      ["http://old:8188", "http://new:8188"],
      "both keys dropped despite the abort (the old server's doc must not outlive the repoint)",
    );
  });
});

describe("MP-R2 (b): abort inside recordEngineBoot still drops", () => {
  it("the issued reboot's drop runs and the abort still propagates", async () => {
    ROOT = tmp("mp-r2-restart-");
    delete process.env.COMFYUI_URL;
    route((url) => json(url.endsWith("/manager/reboot") ? {} : {}));
    const controller = new AbortController();
    seat.writeMode = "abort-receipt";
    seat.abortReceipt = (): unknown => {
      const err = new Error("restart receipt abort");
      controller.abort(err);
      return err;
    };

    await assert.rejects(
      dispatchManage({ action: "restart" }, CTX(), controller.signal),
      /restart receipt abort/,
      "the caller's abort propagates (never laundered into a success)",
    );
    assert.equal(seat.invalidated.length, 1, "the issued reboot's drop ran on the abort path");
    assert.equal(
      existsSync(join(ROOT, "data", "runtime", "comfyui", ".estate-engine-boot.json")),
      false,
      "the receipt write itself never landed (abort delivered mid-write)",
    );
    assert.equal(lifecycleInFlight(), null, "the abort path released the latch");
    // holdLifecycle itself is untouched — the unit arm still holds.
    const release = holdLifecycle("restart");
    try {
      assert.equal(lifecycleInFlight(), "restart");
    } finally {
      release();
    }
  });
});

describe("MP-F3 (c): guardLifecycle refuses while a provisioning fetch is in flight", () => {
  const BYTES = Buffer.from("0123456789", "utf8");
  const DIGEST = createHash("sha256").update(BYTES).digest("hex");
  const target: Extract<ResourceRef, { kind: "model" }> = { kind: "model", owner: "family", id: "guard-fam" };
  const item: Extract<ProvisionPlanItem, { kind: "model" }> = {
    kind: "model",
    key: "model:guard-fam:weight.bin",
    owner: "family",
    id: "guard-fam",
    name: "weight.bin",
    folder: "checkpoints",
    url: "https://example.invalid/weight.bin",
    sha256: DIGEST,
    sizeBytes: BYTES.length,
    required: true,
    provider: "direct",
  };
  const plan: ProvisionPlan = { ref: target, items: [item] };

  const serve = (root: string, gate: Promise<void>): ProvisioningService => {
    const ctx = new Context();
    contexts.push(ctx);
    return new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
      storeRoot: root,
      fetcher: async () => {
        await gate;
        async function* generate(): AsyncGenerator<Uint8Array> {
          yield new Uint8Array(BYTES);
        }
        return { status: 200, body: generate() };
      },
    });
  };

  it("a lock-held fetch refuses, names the operation, then force bypasses", async () => {
    ROOT = tmp("mp-f3-lock-");
    delete process.env.COMFYUI_URL;
    route(() => json({}));
    let releaseFetch!: () => void;
    const fetchGate = new Promise<void>((resolve) => { releaseFetch = resolve; });
    const service = serve(tmp("mp-f3-store-"), fetchGate);
    assert.deepEqual(service.inflightAcquires(), [], "idle seat: empty census");

    // startWeightAcquire resolves after the lock registers (the
    // registration is synchronous past the plan await) while the
    // background fetch parks on the gate — the census is
    // deterministic here, no mid-flight poll.
    const id = await service.startWeightAcquire(target);
    assert.equal(service.inflightAcquires().length, 1);
    assert.match(service.inflightAcquires()[0] ?? "", new RegExp(id), "the census names the operation id");

    const [code, env] = await dispatchManage({ action: "free" }, CTX({ provisioning: service })) as [number, ManageEnvelope];
    assert.equal(code, 409);
    assert.match(env.detail, /1 in-flight acquisition\(s\)/);
    assert.match(env.detail, new RegExp(id), "the refusal names the in-flight operation (sidecar voice)");
    assert.match(env.detail, /force=true/);
    assert.equal(env.next_action, "status");
    assert.equal(lifecycleInFlight(), null, "a guard refusal takes no latch");

    const [forceCode, forceEnv] = await dispatchManage({ action: "free", force: true }, CTX({ provisioning: service })) as [
      number,
      ManageEnvelope,
    ];
    assert.equal(forceCode, 200);
    assert.match(forceEnv.detail, /free issued/);

    releaseFetch();
    await until(() => service.inflightAcquires().length === 0, "the fetch to land and release its lock");
  });

  it("a pre-lock mint (the P-R1 window) refuses, naming the resource key", async () => {
    ROOT = tmp("mp-f3-mint-");
    delete process.env.COMFYUI_URL;
    route(() => json({}));
    let releasePlan!: () => void;
    const planGate = new Promise<void>((resolve) => { releasePlan = resolve; });
    const ctx = new Context();
    contexts.push(ctx);
    const gated = new ProvisioningService(ctx, {
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          await planGate;
          return plan;
        },
      },
      storeRoot: tmp("mp-f3-mint-store-"),
      fetcher: async () => {
        async function* generate(): AsyncGenerator<Uint8Array> {
          yield new Uint8Array(BYTES);
        }
        return { status: 200, body: generate() };
      },
    });
    assert.deepEqual(gated.inflightAcquires(), [], "idle seat: empty census");

    // The mint reserves its slot synchronously past the cap check and
    // parks on the plan resolve — the census names it before any lock
    // or operation id exists. Unawaited on purpose: it pends by law.
    const pending = gated.startWeightAcquire(target);
    assert.equal(gated.inflightAcquires().length, 1);
    assert.match(gated.inflightAcquires()[0] ?? "", /minting/, "the pre-lock mint is named with no id minted yet");

    const [code, env] = await dispatchManage({ action: "free" }, CTX({ provisioning: gated })) as [number, ManageEnvelope];
    assert.equal(code, 409);
    assert.match(env.detail, /1 in-flight acquisition\(s\)/);
    assert.match(env.detail, /minting/);

    releasePlan();
    await pending;
    await until(() => gated.inflightAcquires().length === 0, "the minted fetch to land and release");
  });
});
