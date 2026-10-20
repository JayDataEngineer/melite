import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  InMemoryOperationStore,
  ManagerProviderError,
  ProvisioningError,
  ProvisioningService,
  VerifiedArtifactWriter,
  resolveConfinedPath,
  writeVerifiedArtifact,
} from "../src/index.ts";
import type {
  ArtifactFetcher,
  ArtifactResponse,
  DeclarationPort,
  ManagerPort,
  ModelProvisionPlanItem,
  ProvisionOperation,
  ProvisionPlan,
  ProvisionPlanItem,
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

function managerWriting(store: string, onInstall?: (url: string) => void | Promise<void>): ManagerPort {
  return {
    install: async (): Promise<{ installed: boolean }> => ({ installed: true }),
    installModel: async (request): Promise<{ installed: boolean; detail?: string }> => {
      await onInstall?.(request.url);
      if (request.url.endsWith("bad") || request.url.endsWith("fail")) return { installed: false, detail: "bad model" };
      const destination = join(store, request.savePath === "default" ? "" : request.savePath, request.filename);
      mkdirSync(join(store, request.savePath === "default" ? "" : request.savePath), { recursive: true });
      writeFileSync(destination, BYTES);
      return { installed: true };
    },
  };
}
function fetchServing(onFetch?: (url: string) => void | Promise<void>): ArtifactFetcher {
  return async (url: string): Promise<ArtifactResponse> => {
    await onFetch?.(url);
    if (url.endsWith("bad") || url.endsWith("fail")) return { status: 404, body: null };
    return { status: 200, body: source() };
  };
}
function source(bytes: Uint8Array = BYTES): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield bytes.subarray(0, Math.ceil(bytes.length / 2));
      yield bytes.subarray(Math.ceil(bytes.length / 2));
    },
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

function operationRow(over: Partial<ProvisionOperation> = {}): ProvisionOperation {
  return {
    operationId: "op-x",
    ref: modelRef(),
    state: "acquiring",
    items: [],
    startedAt: Date.now() - 30_000,
    ...over,
  };
}

function declarationFor(plan: ProvisionPlan): DeclarationPort {
  return {
    resolve: async (): Promise<ProvisionPlan> => plan,
    list: async (): Promise<readonly ResourceRef[]> => [plan.ref],
  };
}

describe("verified artifact writer", () => {
  test("operator-unverified artifacts land with an explicit integrity state", async () => {
    const store = root();
    const destination = join(store, "checkpoints", "operator.bin");
    const result = await writeVerifiedArtifact({
      root: store,
      relativePath: "checkpoints/operator.bin",
      operationId: "op-unverified",
      source: source(),
    });
    assert.equal(result.sha256, SHA);
    assert.equal(result.integrity, "operator-unverified");
    assert.deepEqual(readFileSync(destination), BYTES);
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

  test("cancellation keeps the partial file (the F7 resume valve)", async () => {
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
    // THE F7 CURE (audit download-stack-audit-2026-10-20): a cancelled
    // flight's landed prefix is a resume asset — the part stays and
    // the next attempt adopts it (only a hash/size mismatch verdict
    // deletes; the reaper owns never-adopted parts).
    assert.equal(existsSync(`${destination}.part-op-cancel`), true);
    assert.deepEqual(readFileSync(`${destination}.part-op-cancel`), BYTES.subarray(0, 2));
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

describe("the progress rehydrate (audit E3, P5 F2 new law)", () => {
  test("a stored in-flight acquire joins the ledger as failed-with-restart-detail; a stored terminal row rejoins as-stored", async () => {
    const store = root();
    const dead = operationRow({
      operationId: "op-dead",
      state: "acquiring",
      startedAt: Date.now() - 60_000,
      detail: "fetching checkpoints/big.safetensors",
    });
    const persisted = new InMemoryOperationStore();
    await persisted.save(dead);
    await persisted.save(operationRow({ operationId: "op-done", state: "active", finishedAt: 999 }));
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      operationStore: persisted,
    });
    await new Promise((resolve) => { setTimeout(resolve, 30); });
    const row = service.progressOf("op-dead");
    assert.ok(row !== null);
    assert.equal(row.state, "failed", "the dead fetch never rehydrates as a live bar");
    assert.match(row.detail ?? "", /seat restarted/);
    assert.match(row.detail ?? "", /fetching checkpoints/);
    // P5 F2 NEW LAW (un-pins the E3 "terminal rows stay out" arm):
    // a stored terminal row rejoins the live ledger as-stored, so
    // the verbs keep working across restarts — the old null
    // assertion below asserted the burn, not the contract.
    const done = service.progressOf("op-done");
    assert.ok(done !== null, "a stored terminal row rejoins the live ledger after restart");
    assert.equal(done.state, "active", "the rejoined row keeps its stored state");
    assert.equal(done.operationId, "op-done");
    assert.equal(service.progressOf("op-never"), null);
    assert.equal(service.progressOfRef(dead.ref)?.operationId, "op-dead", "the ref read routes to the rehydrated row");
  });

  test("an unreadable store degrades to an empty ledger — the boot never blocks", async () => {
    const poisoned = new InMemoryOperationStore();
    poisoned.list = async (): Promise<never> => {
      throw new Error("store unreadable");
    };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(root()),
      operationStore: poisoned,
    });
    await new Promise((resolve) => { setTimeout(resolve, 30); });
    assert.equal(service.progressOf("op-dead"), null);
  });

  test("a persist failure names the operation in the surfaced error", async () => {
    const refusing = new InMemoryOperationStore();
    refusing.save = async (): Promise<void> => {
      throw new Error("disk full");
    };
    const ctx = new Context();
    const errors: Error[] = [];
    const original = ctx.logger.error.bind(ctx.logger);
    (ctx.logger as { error: (e: Error) => void }).error = (e: Error): void => {
      errors.push(e);
      original(e);
    };
    const store = root();
    const ref = modelRef();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref, items: [modelItem()] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: fetchServing(),
      operationStore: refusing,
    });
    await service.ensure(ref);
    await new Promise((resolve) => { setTimeout(resolve, 30); });
    // the id is the factory's bare hex; the state rides so the
    // store's divergence point is findable in the log
    const named = errors.find((e) => /persist failed for [0-9a-f]{16,} \(acquiring\)/.test(e.message));
    assert.ok(named !== undefined, `the log row names the operation — saw ${JSON.stringify(errors.map((e) => e.message))}`);
    assert.match(named.message, /disk full/);
  });

  test("same-id store writes land in call order — a later save never overtakes an earlier one (verify R5)", async () => {
    const ordered = new InMemoryOperationStore();
    const order: string[] = [];
    let calls = 0;
    ordered.save = async (operation: ProvisionOperation): Promise<void> => {
      calls += 1;
      if (calls === 1) await new Promise((resolve) => { setTimeout(resolve, 30); });
      order.push(`${operation.operationId}:${operation.state}`);
    };
    const ctx = new Context();
    const store = root();
    const ref = modelRef();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref, items: [modelItem()] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: fetchServing(),
      operationStore: ordered,
    });
    await service.ensure(ref);
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    // the delayed first save would let the second overtake it
    // without the chain — the landing order is the call order
    assert.match(order[0] ?? "", /:acquiring$/, `the begin save landed first — saw ${JSON.stringify(order)}`);
    assert.match(order[order.length - 1] ?? "", /:active$/, `the terminal save landed last — saw ${JSON.stringify(order)}`);
  });
});

describe("provisioning service", () => {
  test("the boot sweep reaps a stale .part from the store (audit K-4)", async () => {
    const store = root();
    mkdirSync(join(store, "checkpoints"), { recursive: true });
    const dead = join(store, "checkpoints", "big.safetensors.part-op-dead");
    writeFileSync(dead, "half");
    const backdated = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    utimesSync(dead, backdated, backdated);
    const ctx = new Context();
    new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    // the boot sweep is fire-and-forget — yield until it landed
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    assert.equal(existsSync(dead), false, "the boot sweep took the stale part");
  });

  test("external model acquisition can be operator-unverified without losing the digest", async () => {
    const store = root();
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager: managerWriting(store),
    });
    const result = await service.acquireExternal(
      { kind: "model", url: "https://example.invalid/operator.bin", relativePath: "checkpoints", filename: "operator.bin" },
      { operatorConfirmed: true },
    );
    assert.equal(result.state, "active");
    assert.equal(result.items[0]?.integrity, "operator-unverified");
    assert.equal(result.items[0]?.sha256, SHA);
    assert.deepEqual(readFileSync(join(store, "checkpoints", "operator.bin")), BYTES);
  });
  test("two concurrent external URLs hold separate records — the shared id never flaps (verify R2)", async () => {
    const store = root();
    const ctx = new Context();
    const gates = new Map<string, Promise<void>>();
    const releases: Array<() => void> = [];
    const manager: ManagerPort = {
      install: async (): Promise<{ installed: boolean }> => ({ installed: true }),
      installModel: async (request): Promise<{ installed: boolean; detail?: string }> => {
        const gate = gates.get(request.savePath);
        if (gate !== undefined) await gate;
        const destination = join(store, request.savePath === "default" ? "" : request.savePath, request.filename);
        mkdirSync(join(store, request.savePath === "default" ? "" : request.savePath), { recursive: true });
        writeFileSync(destination, BYTES);
        return { installed: true };
      },
    };
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager,
    });
    gates.set("checkpoints", new Promise<void>((resolve) => { releases.push(resolve); }));
    const first = service.acquireExternal(
      { kind: "model", url: "https://example.invalid/slow.bin", relativePath: "checkpoints", filename: "slow.bin" },
      { operatorConfirmed: true },
    );
    const refA = { kind: "model" as const, owner: "card" as const, id: "external:https://example.invalid/slow.bin" };
    for (let attempt = 0; attempt < 100 && !service.isLocked(refA); attempt += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 5); });
    }
    const second = service.acquireExternal(
      { kind: "model", url: "https://example.invalid/fast.bin", relativePath: "checkpoints", filename: "fast.bin" },
      { operatorConfirmed: true },
    );
    await new Promise((resolve) => { setTimeout(resolve, 30); });
    const refB = { kind: "model" as const, owner: "card" as const, id: "external:https://example.invalid/fast.bin" };
    const opA = service.operationOf(refA);
    const opB = service.operationOf(refB);
    assert.notEqual(opA, undefined, "A's record answers under A's per-url ref");
    assert.notEqual(opB, undefined, "B's record answers under B's per-url ref");
    assert.notEqual(opA?.operationId, opB?.operationId, "the records never share one identity mid-flight");
    releases[0]?.();
    const [resultA, resultB] = await Promise.all([first, second]);
    assert.equal(resultA.state, "active");
    assert.equal(resultB.state, "active");
    assert.equal(service.operationOf(refA)?.operationId, opA?.operationId, "A's record kept A's identity through the overlap");
  });

  test("THE DEFAULT-FOLDER WALL (audit T-S5): an omitted relativePath lands checkpoints/ on BOTH sides — install path == inspect path", async () => {
    const store = root();
    const ctx = new Context();
    const savePaths: string[] = [];
    const manager: ManagerPort = {
      install: async (): Promise<{ installed: boolean }> => ({ installed: true }),
      installModel: async (request): Promise<{ installed: boolean; detail?: string }> => {
        savePaths.push(request.savePath);
        const destination = join(store, request.savePath === "default" ? "" : request.savePath, request.filename);
        mkdirSync(join(store, request.savePath === "default" ? "" : request.savePath), { recursive: true });
        writeFileSync(destination, BYTES);
        return { installed: true };
      },
    };
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor({ ref: modelRef(), items: [] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager,
    });
    // NO relativePath: the old default ("") split the two sides —
    // the Manager's map landed default/, the verifier probed the root
    const result = await service.acquireExternal(
      { kind: "model", url: "https://example.invalid/plain.bin", filename: "plain.bin" },
      { operatorConfirmed: true },
    );
    assert.equal(result.state, "active", "the verifier found the bytes where the manager landed them");
    assert.deepEqual(savePaths, ["checkpoints"], "the install rode the manage door's own default folder");
    assert.deepEqual(readFileSync(join(store, "checkpoints", "plain.bin")), BYTES);
    // an EXPLICIT relativePath still rules
    const explicit = await service.acquireExternal(
      { kind: "model", url: "https://example.invalid/vae.bin", relativePath: "vae", filename: "vae.bin" },
      { operatorConfirmed: true },
    );
    assert.equal(explicit.state, "active");
    assert.deepEqual(savePaths, ["checkpoints", "vae"]);
  });

  test("deduplicates concurrent operations per resource", async () => {
    const store = root();
    const ref = modelRef();
    const item = modelItem();
    const plan: ProvisionPlan = { ref, items: [item] };
    let installs = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: fetchServing(async () => { installs += 1; await gate; }),
      operationIdFactory: () => "op-dedupe",
    });
    const first = service.ensure(ref);
    const second = service.ensure(ref);
    release();
    const [left, right] = await Promise.all([first, second]);
    assert.equal(installs, 1);
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
      fetcher: fetchServing(),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "partial");
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0]?.outcome, "active");
    assert.equal(result.items[1]?.outcome, "failed");
    assert.equal(existsSync(join(store, "checkpoints", "good.bin")), true);
    assert.equal(existsSync(join(store, "checkpoints", "bad.bin")), false);
  });

  test("surfaces the Manager model-unregistered refusal as the named blocked item", async () => {
    const store = root();
    const ref = modelRef({ id: "mask" });
    const item = modelItem({
      key: "model:card:mask:rt_detr_v4-x-hgnet_fp32.safetensors",
      owner: "card",
      name: "rt_detr_v4-x-hgnet_fp32.safetensors",
      folder: "diffusion_models",
      url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
      provider: "manager",
    });
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor({ ref, items: [item] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager: {
        install: async () => ({ installed: true }),
        installModel: async () => {
          throw new ManagerProviderError(
            "model-unregistered",
            "ComfyUI-Manager external-model catalog does not contain exactly one row for diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
          );
        },
      },
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.outcome, "blocked");
    assert.equal(result.items[0]?.errorCode, "manager/model-unregistered");
    assert.equal(existsSync(join(store, "diffusion_models", item.name)), false);
  });

  test("rejects Manager-landed bytes that fail the declared digest after the queue", async () => {
    const store = root();
    const ref = modelRef({ id: "sam2" });
    const item = modelItem({
      id: "sam2",
      name: "sam2.1_hiera_large.pt",
      folder: "sams",
      url: "https://huggingface.co/facebook/sam2.1-hiera-large/resolve/main/sam2.1_hiera_large.pt",
      provider: "manager",
    });
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor({ ref, items: [item] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager: {
        install: async () => ({ installed: true }),
        installModel: async (request) => {
          const destination = join(store, request.savePath, request.filename);
          mkdirSync(join(store, request.savePath), { recursive: true });
          writeFileSync(destination, Buffer.from("wrong bytes"));
          return { installed: true };
        },
      },
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "artifact/hash-mismatch");
  });

  test("keeps Manager model metadata out of the service request and verifies declared size after the queue", async () => {
    const store = root();
    const ref = modelRef({ id: "sam2" });
    const item = modelItem({
      key: "model:card:sam2:sam2.1_hiera_large.pt",
      owner: "card",
      id: "sam2",
      name: "sam2.1_hiera_large.pt",
      folder: "sams",
      url: "https://huggingface.co/facebook/sam2.1-hiera-large/resolve/main/sam2.1_hiera_large.pt",
      sizeBytes: BYTES.length + 1,
      provider: "manager",
    });
    let received: unknown;
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor({ ref, items: [item] }),
      artifactWriter: new VerifiedArtifactWriter(store),
      manager: {
        install: async () => ({ installed: true }),
        installModel: async (request) => {
          received = request;
          const destination = join(store, request.savePath, request.filename);
          mkdirSync(join(store, request.savePath), { recursive: true });
          writeFileSync(destination, BYTES);
          return { installed: true };
        },
      },
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "artifact/size-mismatch");
    const inspected = await service.inspect(ref);
    assert.equal(inspected.items[0]?.errorCode, "artifact/size-mismatch");
    // audit F4 (2026-10-20): the declared arm rides a drain
    // heartbeat (onQueueStatus) — behavior, not metadata. The shape
    // below stays the metadata-out contract; the heartbeat earns its
    // own function check and its own manager-liveness wall.
    const { onQueueStatus, ...requestShape } = received as Record<string, unknown>;
    assert.equal(typeof onQueueStatus, "function");
    assert.deepEqual(requestShape, {
      id: item.key,
      name: item.name,
      savePath: item.folder,
      url: item.url,
      filename: item.name,
      // T-E2 re-cut: the declared size rides (the queue-drain budget
      // scaler was armed but never fed)
      sizeBytes: item.sizeBytes,
    });
  });

  test("records legal service state transitions and registers under provisioning", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const ctx = new Context();
    const service = new ProvisioningService(ctx, {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: fetchServing(),
    });
    assert.equal(ctx.provisioning.name, "provisioning");
    assert.equal(typeof ctx.provisioning.ensure, "function");
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(service.stateOf(ref), "active");
    assert.deepEqual(
      service.transitionsOf(ref),
      ["unknown", "acquiring", "verifying", "installed", "active"],
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
      fetcher: fetchServing(),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.outcome, "failed");
  });

  test("a direct item streams the declared URL into the verified writer without a manager", async () => {
    const store = root();
    const ref = modelRef();
    const item = modelItem();
    const plan: ProvisionPlan = { ref, items: [item] };
    const fetched: string[] = [];
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: fetchServing((url) => { fetched.push(url); }),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(result.items[0]?.integrity, "declared-sha256");
    assert.equal(result.items[0]?.sha256, SHA);
    assert.deepEqual(fetched, [item.url]);
    assert.deepEqual(readFileSync(join(store, "checkpoints", "one.bin")), BYTES);
  });

  test("a direct fetch answering non-200 fails named and nothing lands", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: async (): Promise<ArtifactResponse> => ({ status: 403, body: null }),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "artifact/fetch-refused");
    assert.match(result.items[0]?.detail ?? "", /403/);
    assert.equal(existsSync(join(store, "checkpoints", "one.bin")), false);
  });

  test("a non-200 that still carries a body names the status without the no-body suffix", async () => {
    // an upstream error page answers 502 WITH bytes — the detail
    // carries the status alone (the 403 arm above pins the body-less
    // twin); pinned 2026-10-13, the cut's-wake audit
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: async (): Promise<ArtifactResponse> => ({ status: 502, body: source(Buffer.from("upstream error page")) }),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "artifact/fetch-refused");
    assert.match(result.items[0]?.detail ?? "", /502/);
    assert.doesNotMatch(result.items[0]?.detail ?? "", /with no body/);
    assert.equal(existsSync(join(store, "checkpoints", "one.bin")), false);
  });

  test("direct acquisition without a fetcher is blocked, not manager-routed", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.errorCode, "artifact/fetch-unavailable");
  });

  test("direct bytes that fail the declared digest fail named at the writer's gate", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem()] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
      fetcher: async (): Promise<ArtifactResponse> => ({ status: 200, body: source(Buffer.from("wrong bytes")) }),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "artifact/hash-mismatch");
    assert.equal(existsSync(join(store, "checkpoints", "one.bin")), false);
  });

  test("a model item naming git or external is refused by name", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = {
      ref,
      items: [modelItem({ key: "g", name: "g.bin", provider: "git" }), modelItem({ key: "e", name: "e.bin", provider: "external" })],
    };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.errorCode, "model/provider-without-arm");
    assert.equal(result.items[1]?.errorCode, "model/provider-without-arm");
  });

  test("a model item naming an out-of-vocabulary provider is refused with the vocabulary", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem({ provider: "civitai" })] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.errorCode, "model/unknown-provider");
    assert.match(result.items[0]?.detail ?? "", /civitai/);
    assert.match(result.items[0]?.detail ?? "", /local, manager, git, direct, external/);
  });

  // The two arms the audit found unproven (2026-10-13, F8): git and
  // external are LEGAL providers in the vocabulary, so
  // unknownProviderRefusal never fires for them — their own arm at
  // service.ts:711 refuses instead, naming why no model arm exists.
  // Without these the whole "a model plan never clones" claim rested
  // on a comment.
  for (const provider of ["git", "external"] as const) {
    test(`a model item on the ${provider} provider is refused by name`, async () => {
      const store = root();
      const ref = modelRef();
      const plan: ProvisionPlan = { ref, items: [modelItem({ provider })] };
      const service = new ProvisioningService(new Context(), {
        declaration: declarationFor(plan),
        artifactWriter: new VerifiedArtifactWriter(store),
      });
      const result = await service.ensure(ref);
      assert.equal(result.state, "blocked");
      assert.equal(result.items[0]?.errorCode, "model/provider-without-arm");
      assert.match(result.items[0]?.detail ?? "", new RegExp(`"${provider}"`));
      assert.match(
        result.items[0]?.detail ?? "",
        /git clones are an extension arm|external acquisition rides the operator-confirmed door/,
      );
      assert.deepEqual(readdirSync(store), [], "nothing lands for an unimplemented arm");
    });
  }

  test("a local model item that is absent is blocked, never installed", async () => {
    const store = root();
    const ref = modelRef();
    const plan: ProvisionPlan = { ref, items: [modelItem({ provider: "local" })] };
    const service = new ProvisioningService(new Context(), {
      declaration: declarationFor(plan),
      artifactWriter: new VerifiedArtifactWriter(store),
    });
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.errorCode, "model/not-present");
    assert.equal(existsSync(join(store, "checkpoints", "one.bin")), false);
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
