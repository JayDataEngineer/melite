import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  FileOperationStore,
  ManagerProviderError,
  ProvisioningError,
  ProvisioningService,
  apply as provisioningApply,
} from "../src/index.ts";
import type {
  ArtifactInspection,
  ArtifactResponse,
  ArtifactWriterPort,
  DeclarationPort,
  InspectorPort,
  LifecyclePort,
  ManagerPort,
  ProvisionPlan,
  ProvisionPlanItem,
  ExternalProvisionRequest,
  ProvisionResult,
  ProvisioningConfig,
  ResourceRef,
  VerifiedArtifactResult,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-service-coverage-"));
  roots.push(root);
  return root;
}

function modelRef(over: Partial<Extract<ResourceRef, { kind: "model" }>> = {}): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "family", ...over };
}

function extensionRef(id = "pack"): Extract<ResourceRef, { kind: "extension" }> {
  return { kind: "extension", id };
}

function modelItem(over: Partial<Extract<ProvisionPlanItem, { kind: "model" }>> = {}): Extract<ProvisionPlanItem, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:family:one.bin",
    owner: "family",
    id: "family",
    name: "one.bin",
    folder: "checkpoints",
    url: "https://example.invalid/one.bin",
    sha256: "a".repeat(64),
    sizeBytes: 4,
    required: true,
    // this spec exercises the Manager arm; the direct arm's behavior
    // lives in provisioning.spec.ts
    provider: "manager",
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
    version: "1.0.0",
    registry: "example/pack",
    requirements: ["one"],
    nodeTypes: ["PackNode"],
    ...over,
  };
}

function plan(ref: ResourceRef, items: readonly ProvisionPlanItem[]): ProvisionPlan {
  return { ref, items };
}

function declaration(value: ProvisionPlan | (() => ProvisionPlan | Promise<ProvisionPlan>), list?: readonly ResourceRef[]): DeclarationPort {
  return {
    resolve: async (): Promise<ProvisionPlan> => typeof value === "function" ? await value() : value,
    list: async (): Promise<readonly ResourceRef[]> => list ?? [],
  };
}

function inspection(value: ArtifactInspection | { readonly error: unknown }): ArtifactInspection {
  if ("error" in value) throw value.error;
  return value;
}

function fakeWriter(values: readonly (ArtifactInspection | { readonly error: unknown })[], root = "/virtual-store"): ArtifactWriterPort & { readonly root: string } {
  let index = 0;
  return {
    root,
    inspect: async (): Promise<ArtifactInspection> => {
      const value = values[Math.min(index, values.length - 1)] ?? { present: false };
      index += 1;
      return inspection(value);
    },
    write: async (request): Promise<VerifiedArtifactResult> => ({
      path: join(request.root, request.relativePath),
      sha256: request.expectedSha256 ?? "b".repeat(64),
      sizeBytes: request.sizeBytes ?? 0,
      integrity: request.expectedSha256 === undefined ? "operator-unverified" : "declared-sha256",
    }),
  };
}

function manager(over: Partial<ManagerPort> = {}): ManagerPort {
  return {
    install: async (): Promise<{ installed: boolean }> => ({ installed: true }),
    installModel: async (): Promise<{ installed: boolean }> => ({ installed: true }),
    ...over,
  };
}

function inspector(value: { active: boolean; nodeTypes?: readonly string[]; detail?: string } = { active: false }): InspectorPort {
  return { inspect: async (): Promise<typeof value> => value };
}

function lifecycle(over: Partial<LifecyclePort> = {}): LifecyclePort {
  return {
    activeRuns: async (): Promise<readonly string[]> => [],
    restart: async (): Promise<void> => undefined,
    waitUntilReady: async (): Promise<void> => undefined,
    ...over,
  };
}

function makeService(config: ProvisioningConfig): { ctx: Context; service: ProvisioningService } {
  const ctx = new Context();
  contexts.push(ctx);
  return { ctx, service: new ProvisioningService(ctx, config) };
}

function basicConfig(value: ProvisionPlan | (() => ProvisionPlan | Promise<ProvisionPlan>), over: Partial<ProvisioningConfig> = {}): ProvisioningConfig {
  return {
    declaration: declaration(value),
    manager: manager(),
    ...over,
  };
}

describe("ProvisioningService public seams", () => {
  test("constructor rejects absent configuration and accepts the real writer root", async () => {
    assert.throws(() => new ProvisioningService(new Context(), undefined as never), /requires a DeclarationPort/);
    assert.throws(() => new ProvisioningService(new Context(), { declaration: undefined as never }), /requires a DeclarationPort/);
    const root = tempRoot();
    writeFileSync(join(root, "one.bin"), "abcd");
    const ref = modelRef();
    const item = modelItem({ folder: "", sha256: createHash("sha256").update("abcd").digest("hex"), sizeBytes: 4 });
    const service = makeService(basicConfig(plan(ref, [item]), { storeRoot: root })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
  });

  test("copy seams retain optional model and extension fields", async () => {
    const ref = modelRef({ variant: "raw", quant: "int8" });
    const item = modelItem({ variant: "raw", quant: "int8", sizeBytes: 4 });
    const service = makeService(basicConfig(plan(ref, [item]), {
      artifactWriter: fakeWriter([{ present: true, path: "/store/one.bin", sha256: item.sha256, sizeBytes: 4 }]),
    })).service;
    const copiedPlan = await service.plan(ref);
    assert.deepEqual(copiedPlan, plan(ref, [item]));
    const status = await service.inspect(ref);
    assert.equal(status.items[0]?.path, "/store/one.bin");
    assert.equal(status.items[0]?.sha256, item.sha256);
    const extension = extensionItem();
    const extensionService = makeService(basicConfig(plan(extensionRef(), [extension]))).service;
    assert.deepEqual((await extensionService.plan(extensionRef())).items[0], extension);
  });

  test("declaration validation rejects every invalid plan shape", async () => {
    const ref = modelRef();
    const cases: ProvisionPlan[] = [
      undefined as never,
      null as never,
      { ref, items: null as never },
      plan(modelRef({ id: "other" }), [modelItem()]),
      { ref, items: [{ kind: "other" } as never] },
      plan(ref, [modelItem({ key: " " })]),
      plan(ref, [modelItem({ provider: " " })]),
      plan(ref, [modelItem({ required: "yes" as never })]),
      plan(ref, [modelItem({ name: " " })]),
      plan(ref, [modelItem({ folder: " " })]),
      plan(ref, [modelItem({ url: " " })]),
      plan(ref, [modelItem({ sha256: "bad" })]),
      plan(ref, [modelItem({ sizeBytes: -1 })]),
      plan(ref, [modelItem({ sizeBytes: 1.5 })]),
      plan(ref, [extensionItem({ url: " " })]),
      plan(ref, [extensionItem({ url: undefined, registry: "", provider: "manager" })]),
    ];
    for (const value of cases) {
      await assert.rejects(makeService(basicConfig(value)).service.plan(ref), /declaration port returned/);
    }
    const local = makeService(basicConfig(plan(ref, [extensionItem({ url: undefined, provider: "local" })]))).service;
    assert.equal((await local.plan(ref)).items[0]?.provider, "local");
  });

  test("refusal conversion covers abort, manager, provisioning, and foreign errors", async () => {
    const ref = modelRef();
    const abortError = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const cases: Array<{ error: unknown; state: string; code: string }> = [
      // THE CENSUS HONESTY LAW (the anima burn, 2026-10-20): the
    // cancelled outcome wears 'unknown' — a scan artifact, never a
    // health verdict. This row judged the old 'failed' seat.
    { error: abortError, state: "unknown", code: "provisioning/cancelled" },
      { error: new ManagerProviderError("pin-mismatch", "manager refuses"), state: "blocked", code: "manager/pin-mismatch" },
      { error: new ProvisioningError("invalid-digest", "digest refuses"), state: "blocked", code: "invalid-digest" },
      { error: new ProvisioningError("invalid-path", "path refuses"), state: "blocked", code: "invalid-path" },
      { error: new ProvisioningError("size-mismatch", "size refuses"), state: "failed", code: "artifact/size-mismatch" },
      { error: new ProvisioningError("source-invalid", "source refuses"), state: "failed", code: "source-invalid" },
      { error: new Error("foreign"), state: "failed", code: "provisioning/failed" },
      { error: "foreign-value", state: "failed", code: "provisioning/failed" },
    ];
    for (const entry of cases) {
      const service = makeService(basicConfig(plan(ref, [modelItem()]), {
        artifactWriter: fakeWriter([{ error: entry.error }]),
        manager: manager(),
      })).service;
      const result = await service.inspect(ref);
      assert.equal(result.state, entry.state, entry.code);
      assert.equal(result.items[0]?.errorCode, entry.code);
    }
    const signal = new AbortController();
    signal.abort();
    const signalled = makeService(basicConfig(async () => { throw new Error("late"); })).service;
    const cancelled = await signalled.inspect(ref, signal.signal);
    // CENSUS HONESTY LAW AT THE PLAN DOOR (audit V1): a cancelled
    // plan resolution is the scan's own artifact — 'unknown' with
    // the budget voice, never 'failed' over zero checked bytes
    assert.equal(cancelled.state, "unknown");
    assert.match(cancelled.detail ?? "", /scan incomplete/);
    assert.equal(cancelled.items.length, 0);
  });

  test("an extension naming a provider outside the vocabulary is refused by name", async () => {
    // 3320f3d6 shipped the gate with a source-text wall only; this
    // pins the runtime refusal (pinned 2026-10-13, the cut's-wake
    // audit). The plan validator refuses only a BLANK provider, so
    // "civitai" rides through validation and dies at acquire.
    const ref = extensionRef();
    const service = makeService(basicConfig(plan(ref, [extensionItem({ provider: "civitai" })]))).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "blocked");
    assert.equal(result.items[0]?.errorCode, "extension/unknown-provider");
  });

  test("a direct model whose writer throws a foreign error fails provisioning-named", async () => {
    // the direct arm rethrows non-ProvisioningError writers (the
    // port is injected; the interface does not promise wrapping) —
    // the item-level conversion lands provisioning/failed
    const ref = modelRef();
    const writer: ArtifactWriterPort = {
      inspect: async (): Promise<ArtifactInspection> => ({ present: false }),
      write: async (): Promise<VerifiedArtifactResult> => { throw new Error("store offline"); },
    };
    const service = makeService(basicConfig(plan(ref, [modelItem({ provider: "direct" })]), {
      artifactWriter: writer,
      fetcher: async (): Promise<ArtifactResponse> => ({
        status: 200,
        body: (async function* (): AsyncGenerator<Uint8Array> { yield new Uint8Array([1, 2, 3, 4]); })(),
      }),
    })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "failed");
    assert.equal(result.items[0]?.errorCode, "provisioning/failed");
  });

  test("aggregate state and outcome cover empty, blocked, failed, active, restart, mixed, and partial", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, []))).service;
    assert.equal((await service.inspect(ref)).state, "absent");
    const blocked = makeService(basicConfig(plan(ref, [modelItem({ sha256: undefined })]))).service;
    assert.equal((await blocked.inspect(ref)).state, "blocked");
    const failed = makeService(basicConfig(plan(ref, [modelItem({ sha256: "bad" })]))).service;
    assert.equal((await failed.inspect(ref)).state, "blocked");
    const itemResults = async (items: readonly ProvisionPlanItem[], over: Partial<ProvisioningConfig> = {}): Promise<ProvisionResult> => {
      const subject = makeService(basicConfig(plan(ref, items), over)).service;
      return await subject.ensure(ref);
    };
    // T-E2: the declared sizeBytes rides to the manager port (the
    // queue-drain budget scaler was armed but never fed)
    const seen: Array<Record<string, unknown>> = [];
    await itemResults([modelItem()], {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({
        installModel: async (request: { sizeBytes?: number }): Promise<{ installed: boolean }> => {
          seen.push(request);
          return { installed: true };
        },
      }),
    });
    assert.equal(seen.length, 1, "the manager arm ran once");
    assert.equal(seen[0]!["sizeBytes"], 4, "the declared size rides (T-E2)");
    const active = await itemResults([modelItem()], { artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]) });
    assert.equal(active.state, "active");
    const extension = await itemResults([extensionItem()], { manager: manager() });
    assert.equal(extension.state, "restart_required");
    // THE POST-INSTALL VERIFY (audit I-S6(c)): the install ack is the
    // Manager's claim, not the landing — the belt re-reads the
    // Manager's own inspect before the plane trusts it, and no
    // inspect seat leaves the ack standing (the row above).
    const lying = await itemResults([extensionItem()], {
      manager: manager({ inspect: async () => ({ installed: false, active: false }) }),
    });
    assert.equal(lying.state, "failed");
    assert.equal(lying.items[0]?.errorCode, "manager/install-not-landed");
    const hotActive = await itemResults([extensionItem()], {
      manager: manager({ inspect: async () => ({ installed: true, active: true }) }),
    });
    assert.equal(hotActive.state, "active", "a pack the Manager already sees active skips the restart ask");
    const partial = await itemResults([modelItem(), modelItem({ key: "bad", name: "bad.bin", url: "bad" })], {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }, { present: false }]),
      manager: manager({ installModel: async () => ({ installed: false }) }),
    });
    assert.equal(partial.state, "partial");
    const cancelled = await itemResults([modelItem()], {
      artifactWriter: fakeWriter([{ error: Object.assign(new Error("stop"), { name: "AbortError" }) }]),
    });
    assert.equal(cancelled.state, "cancelled");
  });

  test("relative destinations refuse invalid filenames, folders, and empty folders", async () => {
    const ref = modelRef();
    for (const over of [
      { name: "a/b" },
      { name: "a\\b" },
      { name: "." },
      { name: ".." },
      { folder: "/absolute" },
      { folder: "a\\b" },
      { folder: "a/../b" },
    ]) {
      const service = makeService(basicConfig(plan(ref, [modelItem(over)]), {
        artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      })).service;
      const result = await service.inspect(ref);
      assert.equal(result.state, "blocked");
    }
    const root = tempRoot();
    writeFileSync(join(root, "one.bin"), "abcd");
    const service = makeService(basicConfig(plan(ref, [modelItem({ folder: "", sha256: createHash("sha256").update("abcd").digest("hex"), sizeBytes: 4 })]), { storeRoot: root })).service;
    assert.equal((await service.inspect(ref)).state, "active");
  });

  test("inspection covers locked operations, plan refusal, item refusal, and abort", async () => {
    const ref = modelRef();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => { await gate; return { installed: true }; } }),
    })).service;
    const pending = service.ensure(ref);
    // THE LIVE-ROW DOOR (audit download-stack-audit-2026-10-20 F10,
    // last remainder — supersedes the locked join this arm once
    // pinned): the locked inspect answers NOW with the live snapshot
    // and never joins the flight. This flight rides the manager
    // install, whose ledger row does not exist yet — the pre-seed
    // window's honest arming row: live, named, no invented numbers.
    const locked = await service.inspect(ref);
    assert.equal(locked.state, "acquiring");
    assert.equal(typeof locked.operationId === "string", true, JSON.stringify(locked));
    assert.equal(locked.items.length, 0);
    for (const additive of ["bytes", "total", "phase"]) {
      assert.equal(additive in locked, false, "the arming row invents no " + additive);
    }
    release();
    assert.equal((await pending).state, "active");
    const refused = makeService(basicConfig(async () => { throw new ManagerProviderError("pin-mismatch", "no"); })).service;
    const status = await refused.inspect(ref);
    assert.equal(status.state, "blocked");
    assert.equal(status.items.length, 0);
    const failed = makeService(basicConfig(async () => { throw new Error("no"); })).service;
    assert.equal((await failed.inspect(ref)).state, "failed");
    const aborted = makeService(basicConfig(plan(ref, [modelItem(), modelItem({ key: "two", name: "two.bin" })]))).service;
    const controller = new AbortController();
    controller.abort();
    // CENSUS HONESTY LAW (audit F1): a pre-aborted inspect once
    // answered 'absent' over a declared 2-item plan — a verdict
    // invented from silence. It answers 'unknown' with the full
    // item roster now.
    const abortedStatus = await aborted.inspect(ref, controller.signal);
    assert.equal(abortedStatus.state, "unknown");
    assert.equal(abortedStatus.items.length, 2);
    assert.ok(abortedStatus.items.every((item) => item.state === "unknown"));
  });

  test("ensure blocks writes, selects declared items, and reports empty plans", async () => {
    const ref = modelRef();
    const blocked = makeService(basicConfig(plan(ref, [modelItem()]), { writeGuard: () => false })).service;
    assert.equal((await blocked.ensure(ref)).state, "blocked");
    const selected = makeService(basicConfig(plan(ref, [modelItem(), modelItem({ key: "two", name: "two.bin" })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    const selectedResult = await selected.ensure(ref, { items: ["one.bin"] });
    assert.equal(selectedResult.items.length, 1);
    const missing = makeService(basicConfig(plan(ref, [modelItem()]))).service;
    assert.equal((await missing.ensure(ref, { items: ["other"] })).state, "blocked");
    const empty = makeService(basicConfig(plan(ref, []))).service;
    assert.equal((await empty.ensure(ref)).state, "failed");
  });

  test("ensure cancellation covers pre-abort, mid-plan abort, and abort errors", async () => {
    const ref = modelRef();
    const first = modelItem();
    const second = modelItem({ key: "two", name: "two.bin" });
    const controller = new AbortController();
    controller.abort();
    const pre = makeService(basicConfig(plan(ref, [first, second]))).service;
    const preResult = await pre.ensure(ref, {}, controller.signal);
    assert.equal(preResult.state, "cancelled");
    let calls = 0;
    let midController!: AbortController;
    const mid = makeService(basicConfig(plan(ref, [first, second]), {
      artifactWriter: fakeWriter([{ present: false }]),
      manager: manager({ installModel: async () => { calls += 1; midController.abort(); return { installed: true }; } }),
    })).service;
    midController = new AbortController();
    const midResult = await mid.ensure(ref, {}, midController.signal);
    assert.equal(midResult.state, "cancelled");
    assert.equal(calls, 1);
    const throwing = makeService(basicConfig(plan(ref, [first]), {
      artifactWriter: fakeWriter([{ error: Object.assign(new Error("stop"), { name: "AbortError" }) }]),
    })).service;
    assert.equal((await throwing.ensure(ref)).state, "cancelled");
  });

  test("model acquisition covers digest, writer, manager, size, landing, and success arms", async () => {
    const ref = modelRef();
    const noDigest = makeService(basicConfig(plan(ref, [modelItem({ sha256: undefined })]))).service;
    assert.equal((await noDigest.ensure(ref)).items[0]?.errorCode, "artifact/invalid-digest");
    const noWriter = makeService(basicConfig(plan(ref, [modelItem()]))).service;
    assert.equal((await noWriter.ensure(ref)).items[0]?.errorCode, "artifact/inspect-unavailable");
    const noManager = makeService(basicConfig(plan(ref, [modelItem()]), { artifactWriter: fakeWriter([{ present: false }]), manager: undefined })).service;
    assert.equal((await noManager.ensure(ref)).items[0]?.errorCode, "manager/model-unavailable");
    const active = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    assert.equal((await active.ensure(ref)).state, "active");
    const wrongSize = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    assert.equal((await wrongSize.ensure(ref)).items[0]?.errorCode, "artifact/size-mismatch");
    const notInstalled = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }]),
      manager: manager({ installModel: async () => ({ installed: false, detail: "queue refused" }) }),
    })).service;
    assert.equal((await notInstalled.ensure(ref)).items[0]?.detail, "queue refused");
    const notLanded = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: false }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    assert.equal((await notLanded.ensure(ref)).items[0]?.errorCode, "manager/model-not-landed");
    const badLanded = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: false, sha256: "wrong" }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    assert.equal((await badLanded.ensure(ref)).items[0]?.errorCode, "artifact/hash-mismatch");
    const landedWrongSize = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    assert.equal((await landedWrongSize.ensure(ref)).items[0]?.errorCode, "artifact/size-mismatch");
    const landed = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    const landedResult = await landed.ensure(ref);
    assert.equal(landedResult.state, "active");
    // a declared size that the Manager landing confirms bumps the
    // ledger to the declared total on success (the F9 manager bytes)
    const sized = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: 4 })]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    assert.equal((await sized.ensure(ref)).state, "active");
  });

  test("extension acquisition covers local, manager, pins, and optional details", async () => {
    const ref = extensionRef();
    const localMissing = makeService(basicConfig(plan(ref, [extensionItem({ provider: "local", url: undefined })]))).service;
    assert.equal((await localMissing.ensure(ref)).items[0]?.errorCode, "extension/inspect-unavailable");
    const localActive = makeService(basicConfig(plan(ref, [extensionItem({ provider: "local", url: undefined })]), {
      inspector: inspector({ active: true, detail: "local ready" }),
    })).service;
    assert.equal((await localActive.ensure(ref)).state, "active");
    const localInactive = makeService(basicConfig(plan(ref, [extensionItem({ provider: "local", url: undefined })]), {
      inspector: inspector({ active: false, detail: "not loaded" }),
    })).service;
    assert.equal((await localInactive.ensure(ref)).items[0]?.detail, "not loaded");
    const noManager = makeService(basicConfig(plan(ref, [extensionItem()]), { manager: undefined })).service;
    assert.equal((await noManager.ensure(ref)).items[0]?.errorCode, "manager/unavailable");
    const pin = makeService(basicConfig(plan(ref, [extensionItem()]), {
      manager: manager({ canInstall: async () => false }),
    })).service;
    assert.equal((await pin.ensure(ref)).items[0]?.errorCode, "manager/pin-mismatch");
    const refused = makeService(basicConfig(plan(ref, [extensionItem()]), {
      manager: manager({ install: async () => ({ installed: false, detail: "refused" }) }),
    })).service;
    assert.equal((await refused.ensure(ref)).items[0]?.detail, "refused");
    const detail = makeService(basicConfig(plan(ref, [extensionItem()]), {
      manager: manager({ install: async () => ({ installed: true, detail: "queued" }) }),
    })).service;
    assert.equal((await detail.ensure(ref)).items[0]?.detail, "queued");
  });

  test("activation covers model inspection, installed extensions, unavailable ports, active runs, force, and visibility", async () => {
    const model = modelRef();
    const modelService = makeService(basicConfig(plan(model, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    assert.equal((await modelService.activate(model)).state, "active");
    const ref = extensionRef();
    const planValue = plan(ref, [extensionItem()]);
    const unavailable = makeService(basicConfig(planValue)).service;
    assert.equal((await unavailable.activate(ref)).state, "blocked");
    const installed = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    assert.equal((await installed.activate(ref)).state, "active");
    const activeRun = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle({ activeRuns: async () => ["run"] }),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    assert.equal((await activeRun.activate(ref)).items[0]?.errorCode, "activation/active-run");
    const forced = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle({ activeRuns: async () => ["run"] }),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    assert.equal((await forced.activate(ref, { force: true })).state, "active");
    const notVisible = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: [], detail: "missing" }),
    })).service;
    assert.equal((await notVisible.activate(ref)).items[0]?.errorCode, "activation/not-visible");
    const restartError = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle({ restart: async () => { throw new Error("restart failed"); } }),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    assert.equal((await restartError.activate(ref)).state, "failed");
    const detail = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: true, active: false, detail: "ready" }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"], detail: "visible" }),
    })).service;
    assert.equal((await detail.activate(ref)).items[0]?.detail, "visible");
    // an inspection that throws lands as the failure voice — the
    // activation arm never swallows a transport error
    const thrown = makeService(basicConfig(planValue, {
      manager: manager({ inspect: async () => ({ installed: false, active: false }) }),
      lifecycle: lifecycle(),
      inspector: { inspect: async () => { throw new Error("inspection exploded"); } },
    })).service;
    assert.equal((await thrown.activate(ref)).state, "failed");
  });

  test("ensure activation options cover extension, model, force, and idle branches", async () => {
    const extension = extensionRef();
    const extensionPlan = plan(extension, [extensionItem()]);
    const ports = {
      manager: manager({ install: async () => ({ installed: true, detail: "queued" }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    };
    const activated = makeService(basicConfig(extensionPlan, ports)).service;
    assert.equal((await activated.ensure(extension, { activate: true })).state, "active");
    const idle = makeService(basicConfig(extensionPlan, ports)).service;
    assert.equal((await idle.ensure(extension, { activateIfIdle: true, force: true })).state, "active");
    const model = modelRef();
    const modelActivated = makeService(basicConfig(plan(model, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    assert.equal((await modelActivated.ensure(model, { activate: true })).state, "active");
  });

  test("inspection paths cover manager, local, fallback, and unavailable extension seams", async () => {
    const ref = extensionRef();
    const managerStates: Array<{ installed: boolean; active: boolean; detail?: string }> = [
      { installed: true, active: true, detail: "active" },
      { installed: true, active: false, detail: "installed" },
      { installed: false, active: false },
    ];
    for (const value of managerStates) {
      const service = makeService(basicConfig(plan(ref, [extensionItem()]), {
        manager: manager({ inspect: async () => value }),
      })).service;
      const status = await service.inspect(ref);
      assert.equal(status.state, value.active ? "active" : value.installed ? "restart_required" : "absent");
    }
    const fallbackActive = makeService(basicConfig(plan(ref, [extensionItem()]), {
      inspector: inspector({ active: true, detail: "fallback" }),
    })).service;
    assert.equal((await fallbackActive.inspect(ref)).state, "active");
    const fallbackAbsent = makeService(basicConfig(plan(ref, [extensionItem()]), {
      inspector: inspector({ active: false }),
    })).service;
    assert.equal((await fallbackAbsent.inspect(ref)).state, "absent");
    const unavailable = makeService(basicConfig(plan(ref, [extensionItem()]))).service;
    assert.equal((await unavailable.inspect(ref)).items[0]?.errorCode, "extension/inspect-unavailable");
    const local = makeService(basicConfig(plan(ref, [extensionItem({ provider: "local", url: undefined })]), {
      inspector: inspector({ active: true, detail: "local" }),
    })).service;
    assert.equal((await local.inspect(ref)).state, "active");
  });

  test("model inspection covers writer, inspector fallback, digest, and size arms", async () => {
    const ref = modelRef({ variant: "v", quant: "q" });
    const item = modelItem({ variant: "v", quant: "q" });
    const writerAbsent = makeService(basicConfig(plan(ref, [item]), {
      artifactWriter: fakeWriter([{ present: false, path: "/p" }]),
    })).service;
    assert.equal((await writerAbsent.inspect(ref)).state, "absent");
    const writerMismatch = makeService(basicConfig(plan(ref, [modelItem({ variant: "v", quant: "q", sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: true, sizeBytes: 4, path: "/p", sha256: "a".repeat(64) }]),
    })).service;
    assert.equal((await writerMismatch.inspect(ref)).items[0]?.errorCode, "artifact/size-mismatch");
    const writerActive = makeService(basicConfig(plan(ref, [item]), {
      artifactWriter: fakeWriter([{ present: true, sizeBytes: 4 }]),
    })).service;
    assert.equal((await writerActive.inspect(ref)).state, "active");
    const inspectorActive = makeService(basicConfig(plan(ref, [item]), {
      inspector: inspector({ active: true, detail: "engine" }),
    })).service;
    assert.equal((await inspectorActive.inspect(ref)).state, "active");
    const inspectorAbsent = makeService(basicConfig(plan(ref, [item]), {
      inspector: inspector({ active: false }),
    })).service;
    assert.equal((await inspectorAbsent.inspect(ref)).state, "absent");
    const noPorts = makeService(basicConfig(plan(ref, [item]))).service;
    assert.equal((await noPorts.inspect(ref)).items[0]?.errorCode, "artifact/inspect-unavailable");
    const noDigest = makeService(basicConfig(plan(ref, [modelItem({ variant: "v", quant: "q", sha256: undefined })]))).service;
    assert.equal((await noDigest.inspect(ref)).items[0]?.errorCode, "artifact/invalid-digest");
  });

  test("reconcile covers explicit, listed, aborted, and refused resources", async () => {
    const ref = modelRef();
    const listed = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      declaration: declaration(plan(ref, [modelItem()]), [ref]),
    })).service;
    assert.equal((await listed.reconcile(ref)).length, 1);
    assert.equal((await listed.reconcile()).length, 1);
    const noList = makeService(basicConfig(plan(ref, [modelItem()]))).service;
    assert.deepEqual(await noList.reconcile(), []);
    const refused = makeService(basicConfig(plan(ref, [modelItem()]), {
      declaration: declaration(plan(ref, [modelItem()]), [ref]),
      artifactWriter: fakeWriter([{ error: new ManagerProviderError("pin-mismatch", "refused") }]),
    })).service;
    assert.equal((await refused.reconcile())[0]?.state, "blocked");
    const controller = new AbortController();
    controller.abort();
    const aborted = makeService(basicConfig(plan(ref, [modelItem(), modelItem({ key: "two", name: "two.bin" })]), {
      declaration: declaration(plan(ref, [modelItem(), modelItem({ key: "two", name: "two.bin" })]), [ref, modelRef({ id: "two" })]),
    })).service;
    const statuses = await aborted.reconcile(undefined, controller.signal);
    // THE CENSUS HONESTY LAW (the anima burn): an aborted census is
    // ROW-COMPLETE — every declared ref rides an 'unknown' row; the
    // old law truncated to 0 rows and the roster served as the
    // whole truth.
    assert.equal(statuses.length, 2);
    assert.ok(statuses.every((row) => row.state === "unknown"));
  });

  test("subscriptions, transitions, persistence, and operation copies cover their optional arms", async () => {
    const ref = modelRef();
    const saved: unknown[] = [];
    const failingStore = {
      load: async () => null,
      save: async (operation: unknown): Promise<void> => { saved.push(operation); throw new Error("save failed"); },
      remove: async (): Promise<void> => undefined,
    };
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      operationStore: failingStore,
    })).service;
    assert.equal((await service.ensure(ref)).state, "active");
    assert.equal(service.stateOf(ref), "active");
    assert.deepEqual(service.transitionsOf(ref), ["unknown", "acquiring", "active"]);
    assert.equal(service.operationOf(ref)?.outcome, "active");
    assert.equal(service.operationOf(extensionRef())?.outcome, undefined);
    assert.equal(service.isLocked(ref), false);
    assert.ok(saved.length > 0);
  });

  test("locked joins honor caller cancellation and cleanup", async () => {
    const ref = modelRef();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { ctx, service } = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => { await gate; return { installed: true }; } }),
    }));
    const first = service.ensure(ref);
    const controller = new AbortController();
    const joined = service.ensure(ref, {}, controller.signal);
    controller.abort();
    assert.equal((await joined).state, "cancelled");
    release();
    assert.equal((await first).state, "active");
    const pending = service.ensure(ref);
    await ctx.fiber.dispose();
    assert.equal((await pending).state, "cancelled");
  });

  test("minimal declarations and activation failures cover defensive result arms", async () => {
    const model = modelRef();
    const minimalModel = modelItem({ sha256: undefined, sizeBytes: undefined });
    const minimalExtension: Extract<ProvisionPlanItem, { kind: "extension" }> = {
      kind: "extension",
      key: "minimal",
      id: "minimal",
      required: true,
      provider: "local",
    };
    const modelService = makeService(basicConfig(plan(model, [minimalModel]))).service;
    const plannedModel = await modelService.plan(model);
    assert.equal((plannedModel.items[0] as Extract<ProvisionPlanItem, { kind: "model" }>).sha256, undefined);
    const extensionService = makeService(basicConfig(plan(extensionRef("minimal"), [minimalExtension]), {
      inspector: inspector({ active: true }),
    })).service;
    assert.equal(((await extensionService.plan(extensionRef("minimal"))).items[0] as Extract<ProvisionPlanItem, { kind: "extension" }>)?.url, undefined);
    assert.equal((await extensionService.ensure(extensionRef("minimal"))).state, "active");
    assert.equal(extensionService.operationOf(extensionRef("minimal"))?.detail, undefined);
    const unavailable = makeService(basicConfig(plan(extensionRef("minimal"), [minimalExtension]), {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      inspector: undefined,
      lifecycle: undefined,
    })).service;
    assert.equal((await unavailable.activate(extensionRef("minimal"))).state, "blocked");
    assert.equal(unavailable.operationOf(extensionRef("minimal"))?.detail, "activation requires LifecyclePort and InspectorPort");
  });

  test("activation covers declaration, empty-plan, manager, inspector, and mixed-plan arms", async () => {
    const ref = extensionRef();
    const failedPlan = makeService(basicConfig(async () => { throw new Error("plan refused"); })).service;
    assert.equal((await failedPlan.activate(ref)).state, "failed");
    const empty = makeService(basicConfig(plan(ref, []))).service;
    assert.equal((await empty.activate(ref)).state, "failed");
    const noManager = makeService(basicConfig(plan(ref, [extensionItem()]), { manager: undefined })).service;
    assert.equal((await noManager.activate(ref)).state, "blocked");
    const inspectFailure = makeService(basicConfig(plan(ref, [extensionItem()]), {
      manager: manager({ inspect: async () => { throw new Error("inspect refused"); } }),
    })).service;
    assert.equal((await inspectFailure.activate(ref)).state, "failed");
    const installFailure = makeService(basicConfig(plan(ref, [extensionItem()]), {
      manager: manager({ inspect: async () => ({ installed: false, active: false }), install: async () => ({ installed: false }) }),
    })).service;
    assert.equal((await installFailure.activate(ref)).state, "failed");
    const model = modelRef();
    const modelInspectionFailure = makeService(basicConfig(plan(model, [modelItem()]), {
      artifactWriter: fakeWriter([{ error: new Error("inspect failed") }]),
    })).service;
    assert.equal((await modelInspectionFailure.activate(model)).state, "failed");
    const mixed = plan(ref, [extensionItem(), modelItem()]);
    const mixedService = makeService(basicConfig(mixed, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    const mixedResult = await mixedService.activate(ref);
    assert.equal(mixedResult.state, "active");
    assert.equal(mixedResult.items[1]?.state, "installed");
    const noNodes = plan(ref, [extensionItem({ nodeTypes: undefined })]);
    const noNodesService = makeService(basicConfig(noNodes, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true }),
    })).service;
    assert.equal((await noNodesService.activate(ref)).state, "active");
    const noDetail = plan(ref, [extensionItem()]);
    const noDetailService = makeService(basicConfig(noDetail, {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: ["PackNode"] }),
    })).service;
    assert.equal((await noDetailService.activate(ref)).items[0]?.detail, undefined);
  });

  test("ensure declaration failures, extension selection, request defaults, and local details", async () => {
    const model = modelRef();
    const declarationFailure = makeService(basicConfig(async () => { throw new Error("declaration failed"); })).service;
    assert.equal((await declarationFailure.ensure(model)).state, "failed");
    const extension = extensionRef();
    const selected: unknown[] = [];
    const extensionService = makeService(basicConfig(plan(extension, [extensionItem(), extensionItem({ key: "other", id: "other" })]), {
      manager: manager({
        canInstall: async (request) => { selected.push(request); return true; },
      }),
    })).service;
    const selectedResult = await extensionService.ensure(extension, { items: ["pack"] });
    assert.equal(selectedResult.items.length, 1);
    // the drain heartbeat rides every manager request (audit F4) —
    // pinned beside the shape, never inside the deep-equal (functions
    // compare by reference)
    const selectedRequest = selected[0] as { onQueueStatus?: unknown };
    assert.equal(typeof selectedRequest.onQueueStatus, "function");
    delete selectedRequest.onQueueStatus;
    assert.deepEqual(selectedRequest, {
      id: "pack",
      url: "https://example.invalid/pack.git",
      ref: "v1",
      version: "1.0.0",
      registry: "example/pack",
      requirements: ["one"],
      nodeTypes: ["PackNode"],
    });
    const minimalRequest: unknown[] = [];
    const minimalService = makeService(basicConfig(plan(extension, [{
      kind: "extension",
      key: "minimal-manager",
      id: "minimal-manager",
      url: "https://example.invalid/minimal.git",
      required: true,
      provider: "manager",
    }]), {
      manager: manager({ install: async (request) => { minimalRequest.push(request); return { installed: true }; } }),
    })).service;
    await minimalService.ensure(extension);
    const minimalHeartbeat = minimalRequest[0] as { onQueueStatus?: unknown };
    assert.equal(typeof minimalHeartbeat.onQueueStatus, "function");
    delete minimalHeartbeat.onQueueStatus;
    assert.deepEqual(minimalHeartbeat, { id: "minimal-manager", url: "https://example.invalid/minimal.git" });
    const local = extensionRef("local-detail");
    const localService = makeService(basicConfig(plan(local, [extensionItem({ id: "local-detail", provider: "local", url: undefined })]), {
      inspector: inspector({ active: true }),
    })).service;
    assert.equal((await localService.ensure(local)).items[0]?.detail, undefined);
    const localFailed = makeService(basicConfig(plan(local, [extensionItem({ id: "local-detail", provider: "local", url: undefined })]), {
      inspector: inspector({ active: false }),
    })).service;
    assert.equal((await localFailed.ensure(local)).items[0]?.detail, "local extension is not active on the engine");
  });

  test("model existing inspection covers optional path and digest fields", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, sizeBytes: 4 }]),
    })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(result.items[0]?.path, undefined);
    assert.equal(result.items[0]?.sha256, undefined);
  });

  test("external acquisition covers model and extension routes", async () => {
    const modelRequest: ExternalProvisionRequest = { kind: "model", url: "https://example.invalid/model.bin" };
    const writeGuard = makeService(basicConfig(plan(modelRef(), []), { writeGuard: () => false })).service;
    assert.equal((await writeGuard.acquireExternal(modelRequest)).items[0]?.errorCode, "provisioning/byo");
    const unconfirmed = makeService(basicConfig(plan(modelRef(), []))).service;
    assert.equal((await unconfirmed.acquireExternal(modelRequest)).items[0]?.errorCode, "external/not-confirmed");
    const noInspector = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: { write: async () => ({ path: "/p", sha256: "a".repeat(64), sizeBytes: 0, integrity: "operator-unverified" }) },
    })).service;
    assert.equal((await noInspector.acquireExternal(modelRequest, { operatorConfirmed: true })).items[0]?.errorCode, "artifact/inspect-unavailable");
    const noModelManager = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false }]),
      manager: undefined,
    })).service;
    assert.equal((await noModelManager.acquireExternal(modelRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/model-unavailable");
    const invalidName = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false }]),
    })).service;
    assert.equal((await invalidName.acquireExternal({ kind: "model", url: "u", filename: "a/b" }, { operatorConfirmed: true })).items[0]?.errorCode, "artifact/invalid-filename");
    const invalidFolder = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false }]),
    })).service;
    assert.equal((await invalidFolder.acquireExternal({ kind: "model", url: "u", relativePath: "../escape", filename: "x.bin" }, { operatorConfirmed: true })).items[0]?.errorCode, "artifact/invalid-folder");
    const installRefused = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false }]),
      manager: manager({ installModel: async () => ({ installed: false }) }),
    })).service;
    assert.equal((await installRefused.acquireExternal(modelRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/model-install-failed");
    const notLanded = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false }]),
    })).service;
    assert.equal((await notLanded.acquireExternal(modelRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/model-not-landed");
    const hashMismatch = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: false, sha256: "wrong" }]),
    })).service;
    assert.equal((await hashMismatch.acquireExternal(modelRequest, { operatorConfirmed: true })).items[0]?.errorCode, "artifact/hash-mismatch");
    const sizeMismatch = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: true, path: "/p" }]),
    })).service;
    assert.equal((await sizeMismatch.acquireExternal({ ...modelRequest, sizeBytes: 2 }, { operatorConfirmed: true })).items[0]?.errorCode, "artifact/size-mismatch");
    const success = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 2 }]),
    })).service;
    const successResult = await success.acquireExternal({ ...modelRequest, relativePath: "checkpoints", filename: "x.bin", sha256: "a".repeat(64), sizeBytes: 2 }, { operatorConfirmed: true });
    assert.equal(successResult.state, "active");
    const defaultName = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: true, path: "/p" }]),
    })).service;
    assert.equal((await defaultName.acquireExternal(modelRequest, { operatorConfirmed: true })).state, "active");
    const extensionRequest: ExternalProvisionRequest = { kind: "extension", url: "https://example.invalid/ext.git" };
    const noExtensionManager = makeService(basicConfig(plan(extensionRef(), []), { manager: undefined })).service;
    assert.equal((await noExtensionManager.acquireExternal(extensionRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/unavailable");
    const extensionRefusal = makeService(basicConfig(plan(extensionRef(), []), {
      manager: manager({ install: async () => ({ installed: false }) }),
    })).service;
    assert.equal((await extensionRefusal.acquireExternal(extensionRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/install-failed");
    const extensionSuccess = makeService(basicConfig(plan(extensionRef(), []), {
      manager: manager({ install: async () => ({ installed: true }) }),
    })).service;
    assert.equal((await extensionSuccess.acquireExternal(extensionRequest, { operatorConfirmed: true })).state, "restart_required");
    const extensionRefDetail = makeService(basicConfig(plan(extensionRef(), []), {
      manager: manager({ install: async () => ({ installed: true, detail: "queued" }) }),
    })).service;
    assert.equal((await extensionRefDetail.acquireExternal({ ...extensionRequest, ref: "v1" }, { operatorConfirmed: true })).items[0]?.detail, "queued");
    // The URL door runs the same post-install belt: an acked install
    // the Manager cannot see on inspect fails by name, a hot-active
    // landing serves active.
    const urlLying = makeService(basicConfig(plan(extensionRef(), []), {
      manager: manager({ install: async () => ({ installed: true }), inspect: async () => ({ installed: false, active: false }) }),
    })).service;
    assert.equal((await urlLying.acquireExternal(extensionRequest, { operatorConfirmed: true })).items[0]?.errorCode, "manager/install-not-landed");
    const urlActive = makeService(basicConfig(plan(extensionRef(), []), {
      manager: manager({ install: async () => ({ installed: true }), inspect: async () => ({ installed: true, active: true }) }),
    })).service;
    assert.equal((await urlActive.acquireExternal(extensionRequest, { operatorConfirmed: true })).state, "active");
  });

  test("aggregate mixed states and remaining inspection detail arms", async () => {
    const extension = extensionRef("mixed");
    const local = extensionItem({ id: "mixed-local", key: "local", provider: "local", url: undefined });
    const remote = extensionItem({ id: "mixed-remote", key: "remote" });
    const restartMixed = makeService(basicConfig(plan(extension, [local, remote]), {
      inspector: inspector({ active: true }),
    })).service;
    assert.equal((await restartMixed.ensure(extension)).state, "restart_required");
    const absentMixed = makeService(basicConfig(plan(extension, [local, remote]), {
      inspector: inspector({ active: true }),
      manager: manager({ inspect: async () => ({ installed: false, active: false }) }),
    })).service;
    assert.equal((await absentMixed.inspect(extension)).state, "active");
    const localRef = extensionRef("local-inspect");
    const localMissing = makeService(basicConfig(plan(localRef, [extensionItem({ id: "local-inspect", provider: "local", url: undefined })]))).service;
    assert.equal((await localMissing.inspect(localRef)).items[0]?.errorCode, "extension/inspect-unavailable");
    const localActiveNoDetail = makeService(basicConfig(plan(localRef, [extensionItem({ id: "local-inspect", provider: "local", url: undefined })]), {
      inspector: inspector({ active: true }),
    })).service;
    assert.equal((await localActiveNoDetail.inspect(localRef)).items[0]?.detail, undefined);
    const localFailedNoDetail = makeService(basicConfig(plan(localRef, [extensionItem({ id: "local-inspect", provider: "local", url: undefined })]), {
      inspector: inspector({ active: false }),
    })).service;
    assert.equal((await localFailedNoDetail.inspect(localRef)).items[0]?.detail, undefined);
    const model = modelRef();
    const absentNoPath = makeService(basicConfig(plan(model, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }]),
    })).service;
    assert.equal((await absentNoPath.inspect(model)).items[0]?.path, undefined);
    const absentSizeUnknown = makeService(basicConfig(plan(model, [modelItem({ sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p" }]),
    })).service;
    assert.equal((await absentSizeUnknown.inspect(model)).items[0]?.errorCode, "artifact/size-mismatch");
    const landedSizeUnknown = makeService(basicConfig(plan(model, [modelItem({ sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64) }]),
    })).service;
    assert.equal((await landedSizeUnknown.ensure(model)).items[0]?.errorCode, "artifact/size-mismatch");
    const existingSizeUnknown = makeService(basicConfig(plan(model, [modelItem({ sizeBytes: 5 })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64) }]),
    })).service;
    assert.equal((await existingSizeUnknown.ensure(model)).items[0]?.errorCode, "artifact/size-mismatch");
  });

  test("reconcile catches synchronous port failures and handles declarations without list", async () => {
    const ref = modelRef();
    const noList = makeService({
      declaration: { resolve: async () => plan(ref, [modelItem()]) },
      manager: manager(),
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    } as ProvisioningConfig).service;
    assert.deepEqual(await noList.reconcile(), []);
    let armFailure = false;
    let inspectFailure = false;
    const badStore = {
      save: (): Promise<void> => {
        if (armFailure) throw new Error("save synchronous");
        return Promise.resolve();
      },
      load: async () => null,
    };
    const listedWriter = fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]);
    const listed = makeService(basicConfig(plan(ref, [modelItem()]), {
      declaration: declaration(plan(ref, [modelItem()]), [ref]),
      artifactWriter: { ...listedWriter, inspect: async () => inspectFailure ? { present: false } : { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 } },
      operationStore: badStore,
    })).service;
    await listed.ensure(ref);
    armFailure = true;
    inspectFailure = true;
    const failed = await listed.reconcile();
    assert.equal(failed[0]?.state, "failed");
    let armBlocked = false;
    let inspectBlocked = false;
    const blockedStore = {
      save: (): Promise<void> => {
        if (armBlocked) throw new ManagerProviderError("pin-mismatch", "blocked store");
        return Promise.resolve();
      },
      load: async () => null,
    };
    const blockedWriter = fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]);
    const blocked = makeService(basicConfig(plan(ref, [modelItem()]), {
      declaration: declaration(plan(ref, [modelItem()]), [ref]),
      artifactWriter: { ...blockedWriter, inspect: async () => inspectBlocked ? { present: false } : { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 } },
      operationStore: blockedStore,
    })).service;
    await blocked.ensure(ref);
    armBlocked = true;
    inspectBlocked = true;
    assert.equal((await blocked.reconcile())[0]?.state, "blocked");
  });

  test("covers failure cancellation, transition error details, and listener error values", async () => {
    const ref = modelRef();
    const abortFailure = makeService(basicConfig(async () => { throw Object.assign(new Error("abort"), { name: "AbortError" }); })).service;
    const cancelled = await abortFailure.ensure(ref);
    assert.equal(cancelled.state, "cancelled");
    let fail = false;
    const mutable = makeService(basicConfig(() => {
      if (fail) throw new ManagerProviderError("pin-mismatch", "later refusal");
      return plan(ref, [modelItem()]);
    }, {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    await mutable.ensure(ref);
    fail = true;
    assert.equal((await mutable.inspect(ref)).state, "blocked");
    const nonErrorStore = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      operationStore: { save: async () => { throw "store string"; }, load: async () => null },
    })).service;
    assert.equal((await nonErrorStore.ensure(ref)).state, "active");
    await Promise.resolve();
  });

  test("activation refusal without detail and locked failed status preserve details", async () => {
    const ref = extensionRef("no-detail-activation");
    const service = makeService(basicConfig(plan(ref, [extensionItem({ id: "no-detail-activation" })]), {
      manager: manager({ inspect: async () => ({ installed: true, active: false }) }),
      lifecycle: lifecycle(),
      inspector: inspector({ active: true, nodeTypes: [] }),
    })).service;
    const result = await service.activate(ref);
    assert.equal(result.items[0]?.errorCode, "activation/not-visible");
    assert.equal(result.items[0]?.detail, "declared extension node types are not visible");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const model = modelRef({ id: "locked-failure" });
    const failed = makeService(basicConfig(async () => {
      await gate;
      throw new Error("locked failure");
    })).service;
    const first = failed.ensure(model);
    // THE LIVE-ROW DOOR (audit F10 last remainder — supersedes the
    // joined-failure detail this arm once pinned): the locked inspect
    // answers the arming row NOW; the plan gate is still closed, so
    // no ledger row and no numbers. The failure detail rides the
    // flight's own await (the join seam below), never the scan.
    const joined = failed.inspect(model);
    release();
    const [firstResult, joinedResult] = await Promise.all([first, joined]);
    assert.equal(firstResult.items[0]?.detail, "locked failure");
    assert.equal(joinedResult.state, "acquiring");
    assert.equal(joinedResult.detail === undefined, true, JSON.stringify(joinedResult));
    for (const additive of ["bytes", "total", "phase"]) {
      assert.equal(additive in joinedResult, false, "the arming row invents no " + additive);
    }
  });

  test("a size-checked activate persists — the store's integrity vocabulary carries the cheap-first word (audit M2, 2026-11)", async () => {
    const root = tempRoot();
    writeFileSync(join(root, "one.bin"), "abcd");
    const ref = modelRef();
    const item = modelItem({ folder: "", sha256: createHash("sha256").update("abcd").digest("hex"), sizeBytes: 4 });
    const storeRoot = join(root, "operations");
    const service = makeService(basicConfig(plan(ref, [item]), {
      storeRoot: root,
      operationStore: new FileOperationStore(storeRoot),
    })).service;
    const result = await service.activate(ref);
    assert.equal(result.state, "active");
    assert.equal(result.items[0]?.integrity, "size-checked",
      "control: the scan judged the size-matching file by stat, never a hash");
    // THE ROUND TRIP (audit M2): the persist is an enqueued write —
    // reload the store from disk and demand the item with its
    // size-checked integrity. Pre-fix the store's allowlist refused
    // the word (invalid-record) and the stale begin-record stayed.
    const reloaded = new FileOperationStore(storeRoot);
    let record: Awaited<ReturnType<typeof reloaded.load>> = null;
    for (let attempt = 0; attempt < 100 && record === null; attempt += 1) {
      record = await reloaded.load(result.operationId);
      if (record === null) await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.ok(record !== null,
      "the activate's record must persist — a refused integrity leaves the stale begin-record forever");
    assert.equal(record.items[0]?.integrity, "size-checked",
      "the persisted item carries the cheap-first word, not a downgraded one");
  });

  test("model fallback inspection includes references without optional coordinates", async () => {
    const ref = modelRef();
    const item = modelItem();
    const service = makeService(basicConfig(plan(ref, [item]), {
      inspector: inspector({ active: true }),
      manager: undefined,
    })).service;
    assert.equal((await service.inspect(ref)).state, "active");
  });

  test("independent external requests hold separate records — no spurious transition failure (verify R2)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    let both!: () => void;
    const bothCalls = new Promise<void>((resolve) => { both = resolve; });
    const service = makeService(basicConfig(plan(modelRef(), []), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64) }]),
      manager: manager({
        installModel: async () => {
          calls += 1;
          if (calls === 2) both();
          if (calls === 1) await gate;
          return { installed: true };
        },
      }),
    })).service;
    const first = service.acquireExternal({ kind: "model", url: "https://example.invalid/one" }, { operatorConfirmed: true });
    const second = service.acquireExternal({ kind: "model", url: "https://example.invalid/two" }, { operatorConfirmed: true });
    await bothCalls;
    release();
    const results = await Promise.all([first, second]);
    // the old shared record made the SECOND begin() kill the FIRST
    // with an invalid-transition failure — per-url identities never
    // cross-write (verify R2)
    assert.equal(results[0].state, "active");
    assert.equal(results[1].state, "active");
  });

  test("a synchronous operation-store failure exercises shared promise rejection", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      operationStore: {
        save: (): never => { throw new Error("synchronous persistence failure"); },
        load: async () => null,
      },
    })).service;
    const first = service.ensure(ref);
    const joinController = new AbortController();
    const joined = service.ensure(ref, {}, joinController.signal);
    const firstOutcome = await first.then(() => "resolved", () => "rejected");
    const joinedOutcome = await joined.then(() => "resolved", () => "rejected");
    assert.equal(firstOutcome, "rejected");
    assert.equal(joinedOutcome, "rejected");
  });

  test("locked promise settlement covers factory errors, pre-aborted joins, and rejected operations", async () => {
    const ref = modelRef();
    const factoryFailure = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    })).service;
    assert.equal((await factoryFailure.ensure(ref)).state, "active");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      manager: manager({ installModel: async () => { await gate; return { installed: true }; } }),
    })).service;
    const first = service.ensure(ref);
    const preAborted = new AbortController();
    preAborted.abort();
    assert.equal((await service.ensure(ref, {}, preAborted.signal)).state, "cancelled");
    const joinController = new AbortController();
    const joined = service.ensure(ref, {}, joinController.signal);
    joinController.abort();
    assert.equal((await joined).state, "cancelled");
    const resolvedJoin = service.ensure(ref, {}, new AbortController().signal);
    release();
    assert.equal((await first).state, "active");
    assert.equal((await resolvedJoin).state, "active");
  });

  test("persistence rejection is observed and transition state covers no-operation records", async () => {
    const ref = modelRef();
    let rejectSave!: (error: Error) => void;
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
      operationStore: {
        load: async () => null,
        save: async () => new Promise<void>((_resolve, reject) => { rejectSave = reject; }),
      },
    })).service;
    await service.ensure(ref);
    rejectSave(new Error("save failed"));
    await Promise.resolve();
    const fresh = modelRef({ id: "fresh" });
    const freshService = makeService(basicConfig(plan(fresh, [modelItem({ id: "fresh" })]))).service;
    const freshResult = await freshService.inspect(fresh);
    // THE CENSUS HONESTY LAW: no inspect door exists, so the row
    // reads 'unknown' — the old 'absent' invented a health verdict
    // (nothing was checked, nothing was declared missing).
    assert.equal(freshResult.state, "unknown");
    assert.equal(freshService.transitionsOf(fresh)[0], "unknown");
  });

  test("plugin apply registers the service", () => {
    const ctx = new Context();
    contexts.push(ctx);
    provisioningApply(ctx, basicConfig(plan(modelRef(), [modelItem()])));
    assert.equal(ctx.provisioning.name, "provisioning");
  });

  test("a start that arrives while a blocking ensure holds the lock seeds the joined ledger, never a second fetch", async () => {
    const ref = modelRef();
    const value = plan(ref, [modelItem()]);
    // the ensure's own plan read hangs on the gate so the start's
    // read lands first and owns the seed for the joined id
    let declarationCalls = 0;
    let releasePlan!: () => void;
    const planGate = new Promise<void>((resolve) => { releasePlan = resolve; });
    const service = makeService({
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          declarationCalls += 1;
          if (declarationCalls === 2) await planGate;
          return value;
        },
        list: async (): Promise<readonly ResourceRef[]> => [],
      },
      manager: manager(),
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    }).service;
    const pending = service.ensure(ref);
    const id = await service.startWeightAcquire(ref);
    assert.equal(declarationCalls, 2);
    releasePlan();
    const result = await pending;
    assert.equal(id, result.operationId);
    assert.equal(result.state, "active");
    // the start seeded the joined id with the DECL total and the
    // already-landed file bumped it to the same total
    assert.equal(service.progressOf(id)?.total, 4);
    assert.equal(service.progressOf(id)?.bytes, 4);
    assert.equal(service.progressOfRef(ref)?.operationId, id);
  });

  test("a start that arrives while the declaration refuses keeps a zero total instead of a guess", async () => {
    const ref = modelRef();
    const value = plan(ref, [modelItem()]);
    // the start's read is the first call, so it takes the refusal
    // while the ensure's later read resolves and completes the join
    let declarationCalls = 0;
    const service = makeService({
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          declarationCalls += 1;
          if (declarationCalls === 1) throw new Error("declaration refused");
          return value;
        },
        list: async (): Promise<readonly ResourceRef[]> => [],
      },
      manager: manager(),
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 4 }]),
    }).service;
    const pending = service.ensure(ref);
    const id = await service.startWeightAcquire(ref);
    const result = await pending;
    assert.equal(id, result.operationId);
    assert.equal(result.state, "active");
    assert.equal(service.progressOf(id)?.total, 0);
  });

  test("a start with no declaration to read opens a zero-total ledger and fails loud", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(async (): Promise<ProvisionPlan> => {
      throw new Error("declaration refused");
    })).service;
    const id = await service.startWeightAcquire(ref);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (service.progressOf(id)?.state === "failed") break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.progressOf(id)?.state, "failed");
    assert.equal(service.progressOf(id)?.total, 0);
  });

  test("a background start on a read-only lane lands the door's own refusal on the ledger", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem()]), {
      writeGuard: () => false,
    })).service;
    const id = await service.startWeightAcquire(ref);
    // the ledger's detail lands one microtask after the terminal
    // state (the state mirror runs inside complete, the detail
    // spread in the start's own settlement arm), so poll for both
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = service.progressOf(id);
      if (current !== null && current.state !== "acquiring" && current.detail !== undefined) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    const ledger = service.progressOf(id);
    assert.equal(ledger?.state, "blocked");
    assert.equal(ledger?.total, 4);
    assert.equal(ledger?.bytes, 0);
    assert.match(ledger?.detail ?? "", /read-only/);
  });

  test("a synchronous operation-store failure fails the background ledger with the store's own words", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem({ provider: "direct" })]), {
      fetcher: async (): Promise<ArtifactResponse> => ({
        status: 200,
        body: (async function* (): AsyncGenerator<Uint8Array> { yield new Uint8Array([1, 2, 3, 4]); })(),
      }),
      operationStore: {
        load: async () => null,
        save: (): Promise<void> => { throw new Error("disk offline"); },
      },
    })).service;
    const id = await service.startWeightAcquire(ref);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (service.progressOf(id)?.state === "failed") break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.progressOf(id)?.state, "failed");
    assert.equal(service.progressOf(id)?.detail, "disk offline");
  });

  test("a synchronous operation-store failure that throws a bare string lands the string on the ledger", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem({ provider: "direct" })]), {
      fetcher: async (): Promise<ArtifactResponse> => ({
        status: 200,
        body: (async function* (): AsyncGenerator<Uint8Array> { yield new Uint8Array([1, 2, 3, 4]); })(),
      }),
      operationStore: {
        load: async () => null,
        save: (): Promise<void> => { throw "disk offline"; },
      },
    })).service;
    const id = await service.startWeightAcquire(ref);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (service.progressOf(id)?.state === "failed") break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.progressOf(id)?.state, "failed");
    assert.equal(service.progressOf(id)?.detail, "disk offline");
  });

  test("a plan that gains its declared size mid-flight fills the opening zero instead of keeping it", async () => {
    const ref = modelRef();
    // the start's read lands before the declaration names a size;
    // the background ensure's later read carries the sized row
    let declarationCalls = 0;
    const service = makeService({
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          declarationCalls += 1;
          if (declarationCalls === 1) return plan(ref, [modelItem({ provider: "direct", sizeBytes: undefined })]);
          return plan(ref, [modelItem({ provider: "direct", sizeBytes: 4 })]);
        },
        list: async (): Promise<readonly ResourceRef[]> => [],
      },
      artifactWriter: fakeWriter([{ present: false }]),
      fetcher: async (): Promise<ArtifactResponse> => ({
        status: 200,
        body: (async function* (): AsyncGenerator<Uint8Array> { yield new Uint8Array([1, 2, 3, 4]); })(),
      }),
    }).service;
    const id = await service.startWeightAcquire(ref);
    assert.equal(service.progressOf(id)?.total, 0);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (service.progressOf(id)?.state === "active") break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(service.progressOf(id)?.state, "active");
    assert.equal(service.progressOf(id)?.total, 4);
  });

  test("an already-landed model with no declared size skips the ledger bump and still reads active", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: undefined })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64) }]),
    })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(service.progressOf(result.operationId)?.bytes, 0);
  });

  test("a zero-byte landing adds nothing to the live count", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: 0 })]), {
      artifactWriter: fakeWriter([{ present: true, path: "/p", sha256: "a".repeat(64), sizeBytes: 0 }]),
    })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(service.progressOf(result.operationId)?.bytes, 0);
  });

  test("a Manager landing with no declared size skips the ledger bump on success", async () => {
    const ref = modelRef();
    const service = makeService(basicConfig(plan(ref, [modelItem({ sizeBytes: undefined })]), {
      artifactWriter: fakeWriter([{ present: false }, { present: true, path: "/p", sha256: "a".repeat(64) }]),
      manager: manager({ installModel: async () => ({ installed: true }) }),
    })).service;
    const result = await service.ensure(ref);
    assert.equal(result.state, "active");
    assert.equal(service.progressOf(result.operationId)?.bytes, 0);
  });
});
