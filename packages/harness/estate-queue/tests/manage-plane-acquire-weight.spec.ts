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
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resourceKey } from "@melite/estate-provisioning";
import type {
  ProvisionPlan,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
  WeightAcquireProgress,
} from "@melite/estate-provisioning";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

let ROOT = "";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

type ModelRef = Extract<ResourceRef, { kind: "model" }>;
const modelRef = (id: string, owner: "family" | "card" = "family"): ModelRef => ({
  kind: "model",
  owner,
  id,
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
  planCalls: ResourceRef[];
  startCalls: ResourceRef[];
  ledger: Map<string, WeightAcquireProgress>;
  land: (operationId: string) => void;
}

function fakeProvisioning(): Fake {
  const plans = new Map<string, ProvisionPlan>();
  const planCalls: ResourceRef[] = [];
  const startCalls: ResourceRef[] = [];
  const ledger = new Map<string, WeightAcquireProgress>();
  let seq = 0;
  const fake: Fake = {
    plans,
    planCalls,
    startCalls,
    ledger,
    land: (operationId: string): void => {
      const entry = ledger.get(operationId);
      if (entry !== undefined) ledger.set(operationId, { ...entry, state: "active", bytes: entry.total });
    },
    inspect: async (ref): Promise<ResourceStatus> => ({ ref, state: "unknown", items: [] }),
    plan: async (ref): Promise<ProvisionPlan> => {
      planCalls.push(ref);
      const plan = plans.get(resourceKey(ref));
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
    startWeightAcquire: async (ref: ResourceRef): Promise<string> => {
      const key = resourceKey(ref);
      for (const entry of ledger.values()) {
        if (resourceKey(entry.ref) === key && entry.state === "acquiring") return entry.operationId;
      }
      startCalls.push(ref);
      seq += 1;
      const id = `op-weight-${seq}`;
      const plan = plans.get(key);
      const total = plan?.items.reduce((sum, item) =>
        sum + (item.kind === "model" && typeof item.sizeBytes === "number" ? item.sizeBytes : 0), 0) ?? 0;
      ledger.set(id, { operationId: id, ref: { ...ref }, state: "acquiring", bytes: 0, total });
      return id;
    },
  };
  return fake;
}

function ctxFor(fake: Fake): ManageCtx {
  ROOT = mkdtempSync(join(tmpdir(), "manage-acquire-"));
  roots.push(ROOT);
  return {
    repoRoot: ROOT,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => [] },
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

  it("a second start while the first is locked joins it (one fetch, never two)", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("weight-fam")), modelPlan(modelRef("weight-fam")));
    const ctx = ctxFor(fake);

    const [, first] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    const [, second] = await dispatchManage({ action: "acquire_weight", model: "weight-fam" }, ctx);
    assert.equal(dataOf(second)["operation_id"], dataOf(first)["operation_id"]);
    assert.equal(fake.startCalls.length, 1);
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
});
