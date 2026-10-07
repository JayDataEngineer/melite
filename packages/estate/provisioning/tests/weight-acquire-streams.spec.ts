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
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-streams-"));
  roots.push(root);
  return root;
}

const BYTES = Buffer.from("0123456789", "utf8");
const DIGEST = createHash("sha256").update(BYTES).digest("hex");

function ref(id = "stream-fam"): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id };
}

function item(): Extract<ProvisionPlanItem, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:stream-fam:weight.bin",
    owner: "family",
    id: "stream-fam",
    name: "weight.bin",
    folder: "checkpoints",
    url: "https://example.invalid/weight.bin",
    sha256: DIGEST,
    sizeBytes: BYTES.length,
    required: true,
    provider: "direct",
  };
}

function serviceFor(root: string, body: unknown): { ctx: Context; service: ProvisioningService } {
  const ctx = new Context();
  contexts.push(ctx);
  const plan: ProvisionPlan = { ref: ref(), items: [item()] };
  const config: ProvisioningConfig = {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
    storeRoot: root,
    // the body shape is the test's subject — the seam hands each
    // transport over the same fetcher reply the engine would
    fetcher: async () => ({ status: 200, body }) as never,
  };
  return { ctx, service: new ProvisioningService(ctx, config) };
}

async function awaitTerminal(service: ProvisioningService, id: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const current = service.progressOf(id);
    if (current !== null && (current.state === "active" || current.state === "installed")) return;
    await new Promise((resolve) => { setTimeout(resolve, 50); });
  }
  assert.fail("the acquisition never reached a terminal state");
}

describe("weight acquisition body transports (the byte-counting pump)", () => {
  test("a ReadableStream body counts every landed chunk and skips undefined reads", async () => {
    const root = tempRoot();
    // the stream's transport type is honest about the hostile chunk;
    // the fetcher seam (as never below) is where the writer-side
    // contract takes over
    const stream = new ReadableStream<Uint8Array | undefined>({
      start(controller) {
        // an undefined chunk read must not count bytes nor end the
        // pump — the reader's done flag is the only terminator
        controller.enqueue(undefined);
        controller.enqueue(Uint8Array.of(...BYTES));
        controller.close();
      },
    });
    const { service } = serviceFor(root, stream);
    const id = await service.startWeightAcquire(ref());
    await awaitTerminal(service, id);
    assert.equal(service.progressOf(id)?.bytes, BYTES.length);
    assert.deepEqual(readFileSync(join(root, "checkpoints", "weight.bin")), BYTES);
  });

  test("a plain sync-iterable body still lands whole and counted", async () => {
    const root = tempRoot();
    const { service } = serviceFor(root, [Uint8Array.of(...BYTES)]);
    const id = await service.startWeightAcquire(ref());
    await awaitTerminal(service, id);
    assert.equal(service.progressOf(id)?.bytes, BYTES.length);
    assert.deepEqual(readFileSync(join(root, "checkpoints", "weight.bin")), BYTES);
  });

  test("the progress reads answer null for unknown ids and refs, live entries for known ones", async () => {
    const root = tempRoot();
    const { service } = serviceFor(root, [Uint8Array.of(...BYTES)]);
    assert.equal(service.progressOf("no-such-operation"), null);
    assert.equal(service.progressOfRef(ref("never-started")), null);
    const id = await service.startWeightAcquire(ref());
    const byRef = service.progressOfRef(ref());
    assert.notEqual(byRef, null);
    assert.equal(byRef?.total, BYTES.length);
    assert.equal(byRef?.ref.kind, "model");
    await awaitTerminal(service, id);
  });
});
