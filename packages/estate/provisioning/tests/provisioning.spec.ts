import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ProvisioningError,
  ProvisioningService,
  VerifiedArtifactWriter,
  resolveConfinedPath,
  writeVerifiedArtifact,
} from "../src/index.ts";
import type {
  ArtifactResponse,
  DeclarationPort,
  ModelProvisionPlanItem,
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisionTransition,
  ResourceRef,
} from "../src/index.ts";

const BYTES = Buffer.from("provisioning-writer-fixture");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-"));
  roots.push(value);
  return value;
}

function source(bytes: Uint8Array = BYTES): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield bytes.subarray(0, Math.ceil(bytes.length / 2));
      yield bytes.subarray(Math.ceil(bytes.length / 2));
    },
  };
}

function response(bytes: Uint8Array = BYTES, status = 200): ArtifactResponse {
  return {
    status,
    body: new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

function modelItem(over: Partial<ModelProvisionPlanItem> = {}): ModelProvisionPlanItem {
  return {
    kind: "model",
    key: "model:family:one.bin",
    owner: "family",
    id: "family",
    name: "one.bin",
    folder: "checkpoints",
    url: "https://example.invalid/one.bin",
    sha256: SHA,
    sizeBytes: BYTES.length,
    required: true,
    provider: "direct",
    ...over,
  };
}

function extensionItem(over: Partial<Extract<ProvisionPlanItem, { kind: "extension" }>> = {}): Extract<ProvisionPlanItem, { kind: "extension" }> {
  return {
    kind: "extension",
    key: "extension:pack",
    id: "pack",
    url: "https://example.invalid/pack.git",
    required: true,
    provider: "manager",
    ref: "v1",
    nodeTypes: ["PackNode"],
    ...over,
  };
}

function modelRef(over: Partial<Extract<ResourceRef, { kind: "model" }>> = {}): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "family", ...over };
}

function declarationFor(plan: ProvisionPlan): DeclarationPort {
  return {
    resolve: async (): Promise<ProvisionPlan> => plan,
    list: async (): Promise<readonly ResourceRef[]> => [plan.ref],
  };
}

describe("verified artifact writer", () => {
  test("hash success lands bytes and removes the temporary file", async () => {
    const store = root();
    const destination = join(store, "checkpoints", "one.bin");
    const result = await writeVerifiedArtifact({
      root: store,
      relativePath: "checkpoints/one.bin",
      expectedSha256: SHA,
      operationId: "op-success",
      source: source(),
    });
    assert.equal(result.sha256, SHA);
    assert.equal(result.sizeBytes, BYTES.length);
    assert.deepEqual(readFileSync(destination), BYTES);
    assert.equal(existsSync(`${destination}.part-op-success`), false);
  });

  test("hash mismatch removes the temporary file and refuses the destination", async () => {
    const store = root();
    const destination = join(store, "checkpoints", "one.bin");
    await assert.rejects(
      writeVerifiedArtifact({
        root: store,
        relativePath: "checkpoints/one.bin",
        expectedSha256: "0".repeat(64),
        operationId: "op-mismatch",
        source: source(),
      }),
      (error: unknown) => error instanceof ProvisioningError && error.code === "hash-mismatch",
    );
    assert.equal(existsSync(destination), false);
    assert.equal(existsSync(`${destination}.part-op-mismatch`), false);
  });

  test("landing is atomic from the destination's perspective", async () => {
    const store = root();
    const destination = join(store, "one.bin");
    writeFileSync(destination, "old");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayed: AsyncIterable<Uint8Array> = {
      async *[Symbol.asyncIterator]() {
        yield BYTES;
        await gate;
      },
    };
    const pending = writeVerifiedArtifact({
      root: store,
      relativePath: "one.bin",
      expectedSha256: SHA,
      operationId: "op-atomic",
      source: delayed,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(readFileSync(destination, "utf8"), "old");
    release();
    await pending;
    assert.deepEqual(readFileSync(destination), BYTES);
    assert.equal(existsSync(`${destination}.part-op-atomic`), false);
  });

  test("cancellation removes the partial file", async () => {
    const store = root();
    const destination = join(store, "one.bin");
    const controller = new AbortController();
    let firstChunk!: () => void;
    const first = new Promise<void>((resolve) => {
      firstChunk = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayed: AsyncIterable<Uint8Array> = {
      async *[Symbol.asyncIterator]() {
        yield BYTES.subarray(0, 2);
        firstChunk();
        await gate;
        yield BYTES.subarray(2);
      },
    };
    const pending = writeVerifiedArtifact({
      root: store,
      relativePath: "one.bin",
      expectedSha256: SHA,
      operationId: "op-cancel",
      source: delayed,
    }, controller.signal);
    await first;
    controller.abort();
    release();
    await assert.rejects(
      pending,
      (error: unknown) => error instanceof ProvisioningError && error.code === "cancelled",
    );
    assert.equal(existsSync(destination), false);
    assert.equal(existsSync(`${destination}.part-op-cancel`), false);
  });

  test("path confinement rejects traversal, absolute paths, and symlinks", async () => {
    const store = root();
    assert.throws(() => resolveConfinedPath(store, "../escape.bin"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    assert.throws(() => resolveConfinedPath(store, "/escape.bin"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    const outside = root();
    symlinkSync(outside, join(store, "linked"), "dir");
    await assert.rejects(
      writeVerifiedArtifact({
        root: store,
        relativePath: "linked/escape.bin",
        expectedSha256: SHA,
        operationId: "op-link",
        source: source(),
      }),
      (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path",
    );
    assert.equal(existsSync(join(outside, "escape.bin")), false);
  });
});

describe("provisioning service", () => {
  test("deduplicates concurrent operations per resource", async () => {
    const store = root();
    const ref = modelRef();
    const item = modelItem();
    const plan: ProvisionPlan = { ref, items: [item] };
    let fetches = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      artifactFetcher: async (): Promise<ArtifactResponse> => {
        fetches += 1;
        await gate;
        return response();
      },
      operationIdFactory: () => "op-dedupe",
    });
    const first = service.ensure(ref);
    const second = service.ensure(ref);
    release();
    const [left, right] = await Promise.all([first, second]);
    assert.equal(fetches, 1);
    assert.equal(left.operationId, right.operationId);
    assert.equal(left.state, "active");
    assert.equal(service.isLocked(ref), false);
  });

  test("reports partial when one required model item fails", async () => {
    const store = root();
    const ref = modelRef();
    const good = modelItem({ key: "good", name: "good.bin", url: "https://example.invalid/good" });
    const bad = modelItem({ key: "bad", name: "bad.bin", url: "https://example.invalid/bad" });
    const plan: ProvisionPlan = { ref, items: [good, bad] };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      artifactFetcher: async (url): Promise<ArtifactResponse> => url.endsWith("bad")
        ? { status: 503, body: null }
        : response(),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "partial");
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0]?.outcome, "active");
    assert.equal(result.items[1]?.outcome, "failed");
    assert.equal(existsSync(join(store, "checkpoints", "good.bin")), true);
    assert.equal(existsSync(join(store, "checkpoints", "bad.bin")), false);
  });

  test("records legal service state transitions and registers under provisioning", async () => {
    const store = root();
    const ref = modelRef();
    const transitions: ProvisionTransition[] = [];
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      artifactFetcher: async (): Promise<ArtifactResponse> => response(),
      onTransition: (transition): void => transitions.push(transition),
    });
    assert.equal(ctx.provisioning.name, "provisioning");
    assert.equal(typeof ctx.provisioning.ensure, "function");
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(service.stateOf(ref), "active");
    assert.deepEqual(
      transitions.map((transition) => transition.to),
      ["acquiring", "verifying", "installed", "active"],
    );
    assert.equal(service.operationOf(ref)?.outcome, "active");
  });

  test("returns failed when every model item fails", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem({ url: "https://example.invalid/fail" })] };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      artifactFetcher: async (): Promise<ArtifactResponse> => ({ status: 503, body: null }),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.outcome, "failed");
  });

  test("returns blocked when the declared digest is absent", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem({ sha256: undefined })] };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.outcome, "blocked");
  });

  test("missing digest is blocked and partial extension plans retain item results", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = {
      ref,
      items: [modelItem({ sha256: undefined }), extensionItem()],
    };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager: {
        install: async (): Promise<{ installed: boolean }> => ({ installed: true }),
      },
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "partial");
    assert.equal(result.items[0]?.outcome, "blocked");
    assert.equal(result.items[1]?.outcome, "restart_required");
  });

  test("uses manager, inspector, and lifecycle ports for extension activation", async () => {
    const ref: ResourceRef = { kind: "extension", id: "pack" };
    const plan: ProvisionPlan = { ref, items: [extensionItem()] };
    let installs = 0;
    let restarts = 0;
    let waits = 0;
    let inspections = 0;
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      manager: {
        install: async (): Promise<{ installed: boolean }> => {
          installs += 1;
          return { installed: true };
        },
        inspect: async (): Promise<{ installed: boolean; active: boolean }> => ({ installed: true, active: false }),
      },
      inspector: {
        inspect: async (): Promise<{ active: boolean; nodeTypes: readonly string[] }> => {
          inspections += 1;
          return { active: true, nodeTypes: ["PackNode"] };
        },
      },
      lifecycle: {
        activeRuns: async (): Promise<readonly string[]> => [],
        restart: async (): Promise<void> => {
          restarts += 1;
        },
        waitUntilReady: async (): Promise<void> => {
          waits += 1;
        },
      },
    });
    const ensured = await service.ensure(ref);
    const activated = await service.activate(ref);
    assert.equal(ensured.state, "restart_required");
    assert.equal(activated.state, "active");
    assert.equal(installs, 1);
    assert.equal(restarts, 1);
    assert.equal(waits, 1);
    assert.equal(inspections, 1);
    assert.equal(service.stateOf(ref), "active");
  });
});
