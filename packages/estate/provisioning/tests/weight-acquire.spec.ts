import { afterEach, describe, it, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { AcquireBusyError, ProvisioningService } from "../src/index.ts";
import type {
  ProvisionOperation,
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisioningConfig,
  ResourceRef,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-acquire-"));
  roots.push(root);
  return root;
}

const BYTES = Buffer.from("0123456789", "utf8");
const DIGEST = createHash("sha256").update(BYTES).digest("hex");

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "weight-fam" };
}

function item(): Extract<ProvisionPlanItem, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:weight-fam:weight.bin",
    owner: "family",
    id: "weight-fam",
    name: "weight.bin",
    folder: "checkpoints",
    url: "https://example.invalid/weight.bin",
    sha256: DIGEST,
    sizeBytes: BYTES.length,
    required: true,
    provider: "direct",
  };
}

function config(root: string, chunkDelayMs: number, calls: { count: number }): ProvisioningConfig {
  const plan: ProvisionPlan = { ref: ref(), items: [item()] };
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
    storeRoot: root,
    fetcher: async () => {
      calls.count += 1;
      async function* generate(): AsyncGenerator<Uint8Array> {
        for (const byte of BYTES) {
          await new Promise((resolve) => { setTimeout(resolve, chunkDelayMs); });
          yield Uint8Array.of(byte);
        }
      }
      return { status: 200, body: generate() };
    },
  };
}

function serviceFor(root: string, chunkDelayMs: number, calls: { count: number }): ProvisioningService {
  const ctx = new Context();
  contexts.push(ctx);
  return new ProvisioningService(ctx, config(root, chunkDelayMs, calls));
}

describe("weight acquisition progress (F9 run-press acquisition)", () => {
  test("startWeightAcquire returns the operation id at once and counts real landed bytes to the DECL total", async () => {
    const root = tempRoot();
    const calls = { count: 0 };
    const service = serviceFor(root, 30, calls);
    const target = ref();

    const id = await service.startWeightAcquire(target);
    assert.match(id, /.+/);

    const opening = service.progressOf(id);
    assert.notEqual(opening, null);
    assert.equal(opening?.total, BYTES.length);
    assert.equal(opening?.bytes, 0);

    // Mid-flight the count is strictly between empty and total — a
    // real landed-byte count, never an animation endpoint. Poll the
    // growing count, not a fixed 160ms (ten 30ms chunks leave a
    // ~240ms mid-flight window; 10ms polls cannot miss it).
    let mid = service.progressOf(id);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (mid !== null && (mid.bytes ?? 0) > 0 && (mid.bytes ?? 0) < BYTES.length) break;
      if (attempt === 99) throw new Error("never observed mid-flight bytes for " + id);
      await new Promise((resolve) => { setTimeout(resolve, 10); });
      mid = service.progressOf(id);
    }
    assert.notEqual(mid, null);
    assert.ok((mid?.bytes ?? 0) > 0 && (mid?.bytes ?? 0) < BYTES.length,
      `expected growing bytes, saw ${String(mid?.bytes)}`);

    // Await the landing through the joining read, then prove the
    // terminal ledger and the file.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = service.progressOf(id);
      if (current !== null && (current.state === "active" || current.state === "installed")) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    const done = service.progressOf(id);
    assert.equal(done?.bytes, BYTES.length);
    assert.equal(done?.total, BYTES.length);
    assert.ok(done?.state === "active" || done?.state === "installed");
    assert.deepEqual(readFileSync(join(root, "checkpoints", "weight.bin")), BYTES);
    assert.equal(calls.count, 1);
  });

  test("a second start while the first is locked joins it (one fetch, never two)", async () => {
    const root = tempRoot();
    const calls = { count: 0 };
    const service = serviceFor(root, 20, calls);
    const target = ref();

    const first = await service.startWeightAcquire(target);
    const second = await service.startWeightAcquire(target);
    assert.equal(second, first);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = service.progressOf(first);
      if (current !== null && (current.state === "active" || current.state === "installed")) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(calls.count, 1);
    assert.equal(service.progressOf(first)?.bytes, BYTES.length);
  });

  test("a sizeless direct plan still lands whole and counts real bytes against a zero denominator", async () => {
    const root = tempRoot();
    const calls = { count: 0 };
    const ctx = new Context();
    contexts.push(ctx);
    const value: ProvisionPlan = { ref: ref(), items: [{ ...item(), sizeBytes: undefined }] };
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => value },
      storeRoot: root,
      fetcher: async () => {
        calls.count += 1;
        async function* generate(): AsyncGenerator<Uint8Array> {
          yield Uint8Array.of(...BYTES);
        }
        return { status: 200, body: generate() };
      },
    });
    const target = ref();

    const id = await service.startWeightAcquire(target);
    assert.equal(service.progressOf(id)?.total, 0);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = service.progressOf(id);
      if (current !== null && (current.state === "active" || current.state === "installed")) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.progressOf(id)?.bytes, BYTES.length);
    assert.deepEqual(readFileSync(join(root, "checkpoints", "weight.bin")), BYTES);
    assert.equal(calls.count, 1);
  });

  test("two starts that cross mid-plan join one fetch through the shared lock", async () => {
    const root = tempRoot();
    const calls = { count: 0 };
    const ctx = new Context();
    contexts.push(ctx);
    const value: ProvisionPlan = { ref: ref(), items: [item()] };
    // the second plan read hangs so the first start wins the race
    // into the lock and the second joins it inside runWithId
    let planCalls = 0;
    let releasePlan!: () => void;
    const planGate = new Promise<void>((resolve) => { releasePlan = resolve; });
    let releaseFetch!: () => void;
    const fetchGate = new Promise<void>((resolve) => { releaseFetch = resolve; });
    const service = new ProvisioningService(ctx, {
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          planCalls += 1;
          if (planCalls === 2) await planGate;
          return value;
        },
        list: async (): Promise<readonly ResourceRef[]> => [],
      },
      storeRoot: root,
      fetcher: async () => {
        calls.count += 1;
        await fetchGate;
        async function* generate(): AsyncGenerator<Uint8Array> {
          yield Uint8Array.of(...BYTES);
        }
        return { status: 200, body: generate() };
      },
    });
    const target = ref();

    const firstPromise = service.startWeightAcquire(target);
    assert.equal(planCalls, 1);
    const secondPromise = service.startWeightAcquire(target);
    assert.equal(planCalls, 2);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (service.isLocked(target)) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.isLocked(target), true);
    releasePlan();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (calls.count === 1) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(calls.count, 1);
    releaseFetch();
    const first = await firstPromise;
    const second = await secondPromise;
    // the crossing start minted its own id but rode the first fetch
    assert.notEqual(second, first);
    assert.equal(calls.count, 1);
    for (const id of [first, second]) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const current = service.progressOf(id);
        if (current !== null && (current.state === "active" || current.state === "installed")) break;
        await new Promise((resolve) => { setTimeout(resolve, 10); });
      }
      assert.equal(service.progressOf(id)?.bytes, BYTES.length);
    }
    assert.deepEqual(readFileSync(join(root, "checkpoints", "weight.bin")), BYTES);
  });
});


// THE PLANE CEILING (audit I-S4, 2026-10-22): the models-provision
// plane carries the runs plane's bounds — a concurrency cap on live
// fetch locks (the START refuses busy, the same-key join never costs
// a slot), a free-disk admission gate ahead of any fetch, and
// oldest-first eviction of terminal ledger rows past the settled cap
// (the store row removed with the ledger row).
describe("the provision-plane ceiling (audit I-S4)", () => {
  function namedConfig(
    root: string,
    plans: ReadonlyMap<string, ProvisionPlan>,
    options: {
      fetchDelayMs?: number;
      diskFree?: (path: string) => Promise<number>;
      store?: ProvisioningConfig["operationStore"];
    } = {},
  ): ProvisioningConfig {
    return {
      declaration: { resolve: async (target: ResourceRef): Promise<ProvisionPlan> => {
        const plan = plans.get(target.id);
        if (plan === undefined) throw new Error("no plan for " + target.id);
        return plan;
      } },
      storeRoot: root,
      ...(options.store === undefined ? {} : { operationStore: options.store }),
      ...(options.diskFree === undefined ? {} : { diskFree: options.diskFree }),
      fetcher: async () => {
        async function* generate(): AsyncGenerator<Uint8Array> {
          if ((options.fetchDelayMs ?? 0) > 0) await new Promise((resolve) => { setTimeout(resolve, options.fetchDelayMs); });
          yield Uint8Array.from(BYTES);
        }
        return { status: 200, body: generate() };
      },
    };
  }

  function tinyPlan(id: string, sizeBytes = BYTES.length): ProvisionPlan {
    return {
      ref: { kind: "model", owner: "family", id },
      items: [{
        kind: "model",
        key: `model:family:${id}:weight.bin`,
        owner: "family",
        id,
        name: "weight.bin",
        folder: "checkpoints",
        url: `https://example.invalid/${id}.bin`,
        sha256: DIGEST,
        sizeBytes,
        required: true,
        provider: "direct",
      }],
    };
  }

  async function untilSettled(service: ProvisioningService, id: string): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const entry = service.progressOf(id);
      if (entry !== null && entry.state !== "acquiring") return;
      await new Promise((resolve) => { setTimeout(resolve, 5); });
    }
    throw new Error("acquire never settled: " + id);
  }

  /** The slot releases a beat after the ledger row turns terminal
   *  (runWithId's finally follows the body). A start during that beat
   *  answers busy — poll it out. */
  async function untilAdmitted(service: ProvisioningService, target: ResourceRef): Promise<string> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        return await service.startWeightAcquire(target);
      } catch (error: unknown) {
        if (!(error instanceof AcquireBusyError)) throw error;
        await new Promise((resolve) => { setTimeout(resolve, 5); });
      }
    }
    throw new Error("acquire never admitted: " + target.id);
  }

  it("the concurrency cap refuses the third distinct start busy; the same-key join is never a slot (audit I-S4)", async () => {
    const root = tempRoot();
    const plans = new Map([
      ["fam-a", tinyPlan("fam-a")],
      ["fam-b", tinyPlan("fam-b")],
      ["fam-c", tinyPlan("fam-c")],
    ]);
    const ctx = new Context();
    contexts.push(ctx);
    const service = new ProvisioningService(ctx, namedConfig(root, plans, { fetchDelayMs: 200 }));

    const a = await service.startWeightAcquire({ kind: "model", owner: "family", id: "fam-a" });
    const b = await service.startWeightAcquire({ kind: "model", owner: "family", id: "fam-b" });
    // the same-key re-poll of a live fetch joins it even with the plane full
    const join = await service.startWeightAcquire({ kind: "model", owner: "family", id: "fam-a" });
    assert.equal(join, a);

    await assert.rejects(
      service.startWeightAcquire({ kind: "model", owner: "family", id: "fam-c" }),
      (error: unknown) => {
        assert.ok(error instanceof AcquireBusyError);
        assert.match(error.message, /cap 2/);
        return true;
      },
    );

    // the slots free on settle — the same third start succeeds after both land
    await untilSettled(service, a);
    await untilSettled(service, b);
    const c = await untilAdmitted(service, { kind: "model", owner: "family", id: "fam-c" });
    assert.match(c, /.+/);
  });

  it("the disk admission gate refuses a too-big plan before any fetch, and a fitting plan proceeds (audit I-S4)", async () => {
    const root = tempRoot();
    const GIB = 1024 * 1024 * 1024;
    const plans = new Map([
      ["too-big", tinyPlan("too-big")],
      ["fits", tinyPlan("fits")],
    ]);
    const ctx = new Context();
    contexts.push(ctx);
    let fetches = 0;
    // the free-space answers, in call order: the first plan finds a
    // dry root, the second finds room — the items stay 1-byte
    // consistent so the landed check passes on the admitted plan
    const free = [0, 10 * GIB];
    const base = namedConfig(root, plans, { diskFree: async () => free.shift() ?? 0 });
    const service = new ProvisioningService(ctx, {
      ...base,
      fetcher: async () => {
        fetches += 1;
        return { status: 200, body: (async function* generate(): AsyncGenerator<Uint8Array> { yield Uint8Array.from(BYTES); })() };
      },
    });

    const blocked = await service.ensure({ kind: "model", owner: "family", id: "too-big" });
    assert.equal(blocked.state, "blocked");
    assert.equal(blocked.items[0]?.errorCode, "provisioning/insufficient-disk");
    assert.match(blocked.detail ?? "", /needs 10 bytes but the store root has 0 available/);
    assert.equal(fetches, 0, "the refused plan never fetches");

    const ok = await service.ensure({ kind: "model", owner: "family", id: "fits" });
    assert.equal(ok.state, "active");
    assert.equal(fetches, 1);
  });

  it("three simultaneous starts over an empty plane mint exactly the cap — the reservation is synchronous (verify-batch31 D1)", async () => {
    const root = tempRoot();
    const plans = new Map([
      ["fam-a", tinyPlan("fam-a")],
      ["fam-b", tinyPlan("fam-b")],
      ["fam-c", tinyPlan("fam-c")],
    ]);
    const ctx = new Context();
    contexts.push(ctx);
    const service = new ProvisioningService(ctx, namedConfig(root, plans, { fetchDelayMs: 150 }));
    const start = (id: string): Promise<string> => service.startWeightAcquire({ kind: "model", owner: "family", id });
    const settled = await Promise.allSettled([start("fam-a"), start("fam-b"), start("fam-c")]);
    const minted = settled.filter((r) => r.status === "fulfilled");
    const refused = settled.filter((r) => r.status === "rejected");
    assert.equal(minted.length, 2, "the cap admits exactly two, whatever the interleaving");
    assert.equal(refused.length, 1);
    assert.ok(refused[0]?.reason instanceof AcquireBusyError);
  });

  it("a lock-held fetch in a non-acquiring ledger state is never an eviction candidate (verify-batch31 D2)", async () => {
    const root = tempRoot();
    const removed: string[] = [];
    const store = {
      load: async (): Promise<ProvisionOperation | null> => null,
      save: async (): Promise<void> => {},
      remove: async (operationId: string): Promise<void> => { removed.push(operationId); },
    };
    const ctx = new Context();
    contexts.push(ctx);
    // the live fetch parks in "verifying" for its whole 400ms window;
    // the ghosts settle fast and drive eviction pressure past the cap
    const plans = new Map([["live", tinyPlan("live")]]);
    // the live fetch parks mid-body until the wall releases it — its
    // "verifying" ledger state spans the whole eviction pressure
    let releaseLive: () => void = () => {};
    const gate = new Promise<void>((resolve) => { releaseLive = resolve; });
    const base = namedConfig(root, plans, { store });
    const service = new ProvisioningService(ctx, {
      ...base,
      fetcher: async () => {
        await gate;
        return { status: 200, body: (async function* generate(): AsyncGenerator<Uint8Array> { yield Uint8Array.from(BYTES); })() };
      },
    });

    const liveId = await untilAdmitted(service, { kind: "model", owner: "family", id: "live" });
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (service.progressOf(liveId)?.state === "verifying") break;
      await new Promise((resolve) => { setTimeout(resolve, 5); });
    }
    assert.equal(service.progressOf(liveId)?.state, "verifying");

    for (let index = 0; index < 502; index += 1) {
      const id = await untilAdmitted(service, { kind: "model", owner: "family", id: "ghost-" + String(index) });
      await untilSettled(service, id);
    }

    assert.notEqual(service.progressOf(liveId), null, "the live verifying row survives");
    assert.equal(service.progressOfRef({ kind: "model", owner: "family", id: "live" })?.operationId, liveId);
    assert.ok(!removed.includes(liveId), "the live row's store row is never removed");
    releaseLive();
    await untilSettled(service, liveId);
  });

  it("terminal ledger rows evict oldest-first past the settled cap, dropping the ByRef pointer and the stored row (audit I-S4)", async () => {
    const root = tempRoot();
    const removed: string[] = [];
    const saved: string[] = [];
    const store = {
      load: async (): Promise<ProvisionOperation | null> => null,
      save: async (operation: ProvisionOperation): Promise<void> => { saved.push(operation.operationId); },
      remove: async (operationId: string): Promise<void> => { removed.push(operationId); },
    };
    const ctx = new Context();
    contexts.push(ctx);
    // every plan fails fast (declaration miss) — the fastest terminal row
    const service = new ProvisioningService(ctx, namedConfig(root, new Map(), { store }));

    const ids: string[] = [];
    for (let index = 0; index < 502; index += 1) {
      const id = await untilAdmitted(service, { kind: "model", owner: "family", id: "ghost-" + String(index) });
      ids.push(id);
      await untilSettled(service, id);
    }

    // the two oldest rows are gone from BOTH maps; the pointer never dangles
    assert.equal(service.progressOf(ids[0] ?? ""), null);
    assert.equal(service.progressOf(ids[1] ?? ""), null);
    assert.equal(service.progressOfRef({ kind: "model", owner: "family", id: "ghost-0" }), null);
    assert.equal(service.progressOfRef({ kind: "model", owner: "family", id: "ghost-1" }), null);
    // the newest row survives
    assert.notEqual(service.progressOf(ids[501] ?? ""), null);
    // the store row for an evicted id is removed with it
    assert.ok(removed.includes(ids[0] ?? ""), "the evicted ledger row removes its stored operation");
  });
});
