import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
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
    // real landed-byte count, never an animation endpoint.
    await new Promise((resolve) => { setTimeout(resolve, 160); });
    const mid = service.progressOf(id);
    assert.notEqual(mid, null);
    assert.ok((mid?.bytes ?? 0) > 0 && (mid?.bytes ?? 0) < BYTES.length,
      `expected growing bytes, saw ${String(mid?.bytes)}`);

    // Await the landing through the joining read, then prove the
    // terminal ledger and the file.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = service.progressOf(id);
      if (current !== null && (current.state === "active" || current.state === "installed")) break;
      await new Promise((resolve) => { setTimeout(resolve, 50); });
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
      await new Promise((resolve) => { setTimeout(resolve, 50); });
    }
    assert.equal(calls.count, 1);
    assert.equal(service.progressOf(first)?.bytes, BYTES.length);
  });
});
