// manage-plane-acquire-weight.spec.ts — the F9 acquisition door
// (ONE door, TWO callers): the bench popup's Download button and the
// agent's comfy_manage acquire_weight seat both land on the manage
// plane's acquire_weight action. The start returns the operation id
// AT ONCE with the opening bytes/total; the tracker polls the SAME
// action with ONLY the operation id. The fetch itself rides
// provisioner.ensure (never a second fetcher) — here the fake owns
// the ledger, while the service-level wall (weight-acquire.spec.ts)
// proves the bytes are real landed bytes.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AcquireBusyError, resourceKey } from "@melite/estate-provisioning";
import type {
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
  WeightAcquireProgress,
} from "@melite/estate-provisioning";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { liveObjectInfo } from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";

let ROOT = "";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

type ModelRef = Extract<ResourceRef, { kind: "model" }>;
const modelRef = (
  id: string,
  owner: "family" | "card" = "family",
  variant = "",
  quant = "",
): ModelRef => ({
  kind: "model",
  owner,
  id,
  ...(variant === "" ? {} : { variant }),
  ...(quant === "" ? {} : { quant }),
});

const SIZE = 8;

function modelPlan(ref: ModelRef): ProvisionPlan {
  return {
    ref,
    items: [{
      kind: "model",
      key: `model:${ref.owner}:${ref.id}::weight.bin`,
      owner: ref.owner,
      id: ref.id,
      name: "weight.bin",
      folder: "checkpoints",
      url: "https://example.invalid/weight.bin",
      sha256: "a".repeat(64),
      sizeBytes: SIZE,
      required: true,
      provider: "direct",
    }],
  };
}

interface Fake extends ProvisioningServiceDefinition {
  plans: Map<string, ProvisionPlan>;
  failures: Map<string, unknown>;
  planCalls: ResourceRef[];
  startCalls: ResourceRef[];
  /** T-S1: the START's options land here — the file→items subset proof. */
  startOptions: Array<{ items?: string[] } | undefined>;
  ledger: Map<string, WeightAcquireProgress>;
  land: (operationId: string) => void;
}

function fakeProvisioning(): Fake {
  const plans = new Map<string, ProvisionPlan>();
  const failures = new Map<string, unknown>();
  const planCalls: ResourceRef[] = [];
  const startCalls: ResourceRef[] = [];
  const startOptions: Array<{ items?: string[] } | undefined> = [];
  const ledger = new Map<string, WeightAcquireProgress>();
  let seq = 0;
  const fake: Fake = {
    plans,
    failures,
    planCalls,
    startCalls,
    startOptions,
    ledger,
    land: (operationId: string): void => {
      const entry = ledger.get(operationId);
      if (entry !== undefined) ledger.set(operationId, { ...entry, state: "active", bytes: entry.total });
    },
    inspect: async (ref): Promise<ResourceStatus> => ({ ref, state: "unknown", items: [] }),
    plan: async (ref): Promise<ProvisionPlan> => {
      planCalls.push(ref);
      const key = resourceKey(ref);
      if (failures.has(key)) throw failures.get(key);
      const plan = plans.get(key);
      if (plan === undefined) throw new Error(`model "${(ref as ModelRef).id}" is not declared`);
      return plan;
    },
    ensure: async (): Promise<never> => {
      throw new Error("acquire_weight never rides the blocking ensure");
    },
    activate: async (): Promise<never> => {
      throw new Error("unused");
    },
    acquireExternal: async (): Promise<never> => {
      throw new Error("unused");
    },
    reconcile: async (): Promise<ResourceStatus[]> => [],
    stateOf: () => "unknown" as const,
    operationOf: () => undefined,
    isLocked: () => false,
    progressOf: (operationId: string): WeightAcquireProgress | null =>
      ledger.get(operationId) ?? null,
    startWeightAcquire: async (ref: ResourceRef, options: { items?: string[] } = {}): Promise<string> => {
      const key = resourceKey(ref);
      for (const entry of ledger.values()) {
        if (resourceKey(entry.ref) === key && entry.state === "acquiring") return entry.operationId;
      }
      startCalls.push(ref);
      startOptions.push(options.items === undefined ? undefined : { items: [...options.items] });
      seq += 1;
      const id = `op-weight-${seq}`;
      const plan = plans.get(key);
      // the service's own subset law: total tracks the REQUESTED rows
      const wanted = options.items === undefined ? null : new Set(options.items);
      const total = plan?.items
        .filter((item) => wanted === null || wanted.has(item.kind === "model" ? item.name : item.id))
        .reduce((sum, item) =>
          sum + (item.kind === "model" && typeof item.sizeBytes === "number" ? item.sizeBytes : 0), 0) ?? 0;
      ledger.set(id, { operationId: id, ref: { ...ref }, state: "acquiring", bytes: 0, total });
      return id;
    },
  };
  return fake;
}

function ctxFor(fake: ProvisioningServiceDefinition, decls: ReturnType<ModelsService["allDecls"]> = []): ManageCtx {
  ROOT = mkdtempSync(join(tmpdir(), "manage-acquire-"));
  roots.push(ROOT);
  return {
    repoRoot: ROOT,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => decls },
    provisioning: fake,
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
  } as unknown as ManageCtx;
}

function dataOf(envelope: { data?: unknown }): Record<string, unknown> {
  assert.equal(typeof envelope.data, "object");
  return envelope.data as Record<string, unknown>;
}

describe("manage acquire_weight (the one acquisition door)", () => {
  it("the start returns the operation id at once; the SAME action polls bytes/total to the terminal ledger", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    const ctx = ctxFor(fake);

    const [startCode, start] = await dispatchManage(
      { action: "acquire_weight", model: "weight-fam", file: "weight.bin" }, ctx);
    assert.equal(startCode, 200);
    assert.equal(start.ok, true);
    const started = dataOf(start);
    assert.match(String(started["operation_id"]), /^op-weight-/);
    assert.equal(start.operation_id, started["operation_id"]);
    assert.equal(started["bytes"], 0);
    assert.equal(started["total"], SIZE);
    assert.equal(started["next_action"], "acquire_weight");

    const opId = String(started["operation_id"]);
    const [pollCode, polled] = await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
    assert.equal(pollCode, 200);
    assert.equal(dataOf(polled)["bytes"], 0);

    // The fetch lands out of band (the service wall proves the
    // landing bytes are real); the door reports the ledger truth.
    fake.land(opId);
    const [doneCode, done] = await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
    assert.equal(doneCode, 200);
    assert.equal(dataOf(done)["bytes"], SIZE);
    assert.equal(dataOf(done)["total"], SIZE);
    assert.equal(dataOf(done)["state"], "active");
    // One fetch: the polls never started a second one.
    assert.equal(fake.startCalls.length, 1);
  });

  it("a terminal poll drops the cached /object_info doc — the agent's next census re-fetches post-landing (run-6 lesson)", async () => {
    // A counting stand-in for the engine's /object_info; the drive
    // pins the env seam (COMFYUI_URL) so resolveEngineBaseUrl — both
    // the reader's key and the drop's key — lands on this server.
    let served = 0;
    let generation = 1;
    const srv = createServer((req, res) => {
      served += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ generation, url: String(req.url) }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    const savedRoute = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = base;
    try {
      // the pre-landing census: served once, then cached
      const before = await liveObjectInfo(base);
      assert.equal(before["generation"], 1);
      assert.equal(await liveObjectInfo(base), before, "cached: no second fetch");

      const fake = fakeProvisioning();
      fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
      const ctx = ctxFor(fake);
      const [, start] = await dispatchManage(
        { action: "acquire_weight", model: "weight-fam", file: "weight.bin" }, ctx);
      const opId = String(dataOf(start)["operation_id"]);
      // a mid-flight poll must NOT drop — the doc still describes the engine
      await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
      assert.equal(await liveObjectInfo(base), before, "mid-flight: the cache survives");
      assert.equal(served, 1);

      // the weight lands — the engine's node set changes (generation
      // 2) — and the terminal poll (state active) drops the doc
      generation = 2;
      fake.land(opId);
      const [, done] = await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
      assert.equal(dataOf(done)["state"], "active");

      // the next census re-fetches the post-landing doc: it must
      // answer the NEW node set — a surviving stale cache would still
      // answer generation 1
      const after = await liveObjectInfo(base);
      assert.equal(after["generation"], 2, "post-landing: the census serves the new node set");
      assert.notEqual(after, before, "the stale pre-landing doc is gone from the cache");
      assert.equal(await liveObjectInfo(base), after, "the post-landing doc is the cached one");
      assert.equal(served, 2, "exactly one re-fetch after the drop");
    } finally {
      if (savedRoute === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = savedRoute;
      srv.close();
    }
  });

  it("a second start while the first is locked joins it (one fetch, never two)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    const ctx = ctxFor(fake);

    const [, first] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    const [, second] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(dataOf(second)["operation_id"], dataOf(first)["operation_id"]);
    assert.equal(fake.startCalls.length, 1);
  });

  it("a plane at its concurrency cap answers 429 busy with retry_after_ms (a wait, never a failure) (audit I-S4)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    fake.startWeightAcquire = async (): Promise<string> => {
      throw new AcquireBusyError("the estate already runs 2 weight acquisitions (cap 2) — poll the live operation or wait for one to settle");
    };
    const ctx = ctxFor(fake);
    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 429);
    assert.equal(envelope.ok, false);
    assert.equal(envelope.state, "busy");
    assert.equal(envelope.next_action, "acquire_weight");
    assert.equal((envelope as { retry_after_ms?: number }).retry_after_ms, 5000);
    assert.match(envelope.detail, /cap 2/);
  });

  it("an unknown operation id 404s (never a fake zero)", async () => {
    const fake = fakeProvisioning();
    const ctx = ctxFor(fake);
    const [code] = await dispatchManage({ action: "acquire_weight", operation_id: "op-nope" }, ctx);
    assert.equal(code, 404);
  });

  it("the start requires the model name", async () => {
    const fake = fakeProvisioning();
    const ctx = ctxFor(fake);
    const [code] = await dispatchManage({ action: "acquire_weight" }, ctx);
    assert.equal(code, 422);
  });

  it("the start resolves the card-owned DECL rows when the family plan misses (the mask SAM2 fallback)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("mask", "card")), modelPlan(modelRef("mask", "card")));
    const ctx = ctxFor(fake);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "mask" }, ctx);
    assert.equal(code, 200);
    // the whole ref, not one field: ResourceRef is a union, so the
    // owner only reads through the model discriminant.
    assert.deepEqual(fake.startCalls[0], modelRef("mask", "card"));
    assert.match(String(dataOf(envelope)["operation_id"]), /^op-weight-/);
  });

  it("a poll on a lane without the progress seat 503s (the tracker renders the refusal, never a crash)", async () => {
    const fake = fakeProvisioning();
    const { progressOf: _withoutProgress, ...pollBlind } = fake;
    void _withoutProgress;
    const ctx = ctxFor(pollBlind);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", operation_id: "op-any" }, ctx);
    assert.equal(code, 503);
    assert.match(envelope.detail, /progress is not configured/);
  });

  it("a start on a lane without the start seat 503s (the Download press names the missing seat)", async () => {
    const fake = fakeProvisioning();
    const { startWeightAcquire: _withoutStart, ...noStarter } = fake;
    void _withoutStart;
    const ctx = ctxFor(noStarter);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 503);
    assert.match(envelope.detail, /acquire_weight is not configured/);
  });

  it("a start on a lane without the progress seat 503s (either half of the gate refuses alike)", async () => {
    const fake = fakeProvisioning();
    const { progressOf: _withoutProgress, ...noTracker } = fake;
    void _withoutProgress;
    const ctx = ctxFor(noTracker);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 503);
    assert.match(envelope.detail, /acquire_weight is not configured/);
  });

  it("the poll renders the ledger's detail word (the tracker shows the why, not just the bytes)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    const ctx = ctxFor(fake);

    const [, start] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    const opId = String(dataOf(start)["operation_id"]);
    const entry = fake.ledger.get(opId);
    assert.ok(entry !== undefined);
    fake.ledger.set(opId, { ...entry, bytes: 3, detail: "fetching weight.bin" });

    const [pollCode, polled] = await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
    assert.equal(pollCode, 200);
    assert.equal(dataOf(polled)["detail"], "fetching weight.bin");
  });

  it("the start spells variant and quant onto the family ref (the fetch keys the exact address)", async () => {
    const fake = fakeProvisioning();
    const ref = modelRef("weight-fam", "family", "turbo", "int8");
    fake.plans.set(resourceKey(ref), modelPlan(modelRef("weight-fam")));
    const ctx = ctxFor(fake);

    const [code, envelope] = await dispatchManage(
      { action: "acquire_weight", model: "weight-fam", variant: "turbo", quant: "int8" }, ctx);
    assert.equal(code, 200);
    assert.deepEqual(fake.planCalls[0], ref);
    assert.equal(dataOf(envelope)["variant"], "turbo");
    assert.equal(dataOf(envelope)["quant"], "int8");
  });

  it("a declared family's miss 404s with the plan's words (the card fallback never fires for a family row)", async () => {
    const fake = fakeProvisioning();
    const ctx = ctxFor(fake, [{ id: "weight-fam", genre: "image", label: "Weight Fam", variants: [] }]);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 404);
    assert.match(envelope.detail, /model "weight-fam" is not declared/);
    assert.equal(fake.planCalls.length, 1);
  });

  it("a declared family's string refusal 404s with its words (the throw need not be an Error)", async () => {
    const fake = fakeProvisioning();
    fake.failures.set(resourceKey(modelRef("weight-fam")), "family lane exploded");
    const ctx = ctxFor(fake, [{ id: "weight-fam", genre: "image", label: "Weight Fam", variants: [] }]);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 404);
    assert.equal(envelope.detail, "family lane exploded");
    assert.equal(fake.planCalls.length, 1);
  });

  it("THE FILE→ITEMS WALL (audit T-S1): a named file subsets the fetch — never the whole family", async () => {
    const fake = fakeProvisioning();
    // the plan's items are readonly (contracts.ts ProvisionPlan) — the
    // spare file is added by construction, never by mutating the
    // factory's own answer
    const base = modelPlan(modelRef("multi-fam"));
    const spare: ProvisionPlanItem = {
      kind: "model",
      key: `model:family:multi-fam::spare.bin`,
      owner: "family",
      id: "multi-fam",
      name: "spare.bin",
      folder: "checkpoints",
      url: "https://example.invalid/spare.bin",
      sha256: "b".repeat(64),
      sizeBytes: SIZE * 1000,
      required: true,
      provider: "direct",
    };
    const twoRow: ProvisionPlan = { ...base, items: [...base.items, spare] };
    fake.plans.set(resourceKey(modelRef("multi-fam")), twoRow);
    const ctx = ctxFor(fake);

    // naming the small row fetches ONLY the small row
    const [code, out] = await dispatchManage(
      { action: "acquire_weight", model: "multi-fam", file: "weight.bin" }, ctx);
    assert.equal(code, 200);
    assert.equal(out.ok, true);
    assert.deepEqual(fake.startOptions.at(-1), { items: ["weight.bin"] }, "the subset reached startWeightAcquire");
    const total = (dataOf(out)["total"] as number | undefined) ?? 0;
    assert.equal(total, SIZE, "total tracks the named file, not the family sum");

    // no file at all → the whole family (the explicit default). A fresh
    // fake: the lock law would join the in-flight op above instead of
    // recording a second start.
    const fake2 = fakeProvisioning();
    fake2.plans.set(resourceKey(modelRef("multi-fam")), twoRow);
    const ctx2 = ctxFor(fake2);
    await dispatchManage({ action: "acquire_weight", model: "multi-fam" }, ctx2);
    assert.equal(fake2.startOptions.at(-1), undefined, "no file means no subset");

    // an unknown filename REFUSES — never a whole-family fetch for a miss
    fake.startCalls.length = 0;
    fake.startOptions.length = 0;
    const [badCode, bad] = await dispatchManage(
      { action: "acquire_weight", model: "multi-fam", file: "ghost.bin" }, ctx);
    assert.equal(badCode, 422);
    assert.equal(bad.ok, false);
    assert.match(bad.detail, /item-not-found/);
    assert.equal(fake.startCalls.length, 0, "no fetch started");
  });

  it("the card fallback carries variant and quant (the fallback address stays exact)", async () => {
    const fake = fakeProvisioning();
    const card = modelRef("mask", "card", "fp16", "q4");
    fake.plans.set(resourceKey(card), modelPlan(modelRef("mask", "card")));
    const ctx = ctxFor(fake);

    const [code, envelope] = await dispatchManage(
      { action: "acquire_weight", model: "mask", variant: "fp16", quant: "q4" }, ctx);
    assert.equal(code, 200);
    assert.deepEqual(fake.startCalls[0], card);
    assert.match(String(dataOf(envelope)["operation_id"]), /^op-weight-/);
  });

  it("an undeclared model 404s with the card plan's words (both doors missed)", async () => {
    const fake = fakeProvisioning();
    const ctx = ctxFor(fake);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "ghost" }, ctx);
    assert.equal(code, 404);
    assert.match(envelope.detail, /model "ghost" is not declared/);
    assert.equal(fake.planCalls.length, 2);
  });

  it("an undeclared model's string refusal 404s with its words (the throw need not be an Error)", async () => {
    const fake = fakeProvisioning();
    fake.failures.set(resourceKey(modelRef("ghost", "card")), "card lane exploded");
    const ctx = ctxFor(fake);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "ghost" }, ctx);
    assert.equal(code, 404);
    assert.equal(envelope.detail, "card lane exploded");
  });

  it("a start whose ledger lags answers zeros as acquiring (a missing row is patience, never a crash)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    const lagging = { ...fake, startWeightAcquire: async (): Promise<string> => "op-ghost" };
    const ctx = ctxFor(lagging);

    const [code, envelope] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(code, 200);
    const data = dataOf(envelope);
    assert.equal(data["operation_id"], "op-ghost");
    assert.equal(data["bytes"], 0);
    assert.equal(data["total"], 0);
    assert.equal(data["state"], "acquiring");
  });
});
