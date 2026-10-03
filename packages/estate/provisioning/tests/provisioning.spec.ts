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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
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
    assert.deepEqual(received, {
      id: item.key,
      name: item.name,
      savePath: item.folder,
      url: item.url,
      filename: item.name,
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
