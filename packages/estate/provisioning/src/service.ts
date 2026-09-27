import { Service } from "@deepseek-ai/cordis";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import {
  ProvisioningError,
  VerifiedArtifactWriter,
  newOperationId,
  type ArtifactWriterPort,
} from "./artifact-writer.ts";
import { ManagerProviderError } from "./manager-provider.ts";
import { providerOk, unknownProviderRefusal } from "./contracts.ts";
import {
  resourceKey,
  sameResourceRef,
  type ActivateOptions,
  type EnsureOptions,
  type ExternalProvisionRequest,
  type ModelProvisionPlanItem,
  type ProvisionItemResult,
  type ProvisionOperation,
  type ProvisionOutcome,
  type ProvisionPlan,
  type ProvisionPlanItem,
  type ProvisionResult,
  type ProvisionState,
  type ResourceRef,
  type ResourceStatus,
  type ResourceStatusItem,
} from "./contracts.ts";
import type {
  DeclarationPort,
  InspectorPort,
  LifecyclePort,
  ManagerInstallRequest,
  ManagerPort,
  OperationStorePort,
  ProvisioningConfig,
  ProvisioningServiceDefinition,
  ProvisionTransition,
  ProvisionTransitionListener,
} from "./ports.ts";

interface ResourceRecord {
  state: ProvisionState;
  history: ProvisionState[];
  operation?: ProvisionOperation;
}

interface LockedOperation {
  readonly id: string;
  readonly controller: AbortController;
  readonly promise: Promise<ProvisionResult>;
}

class ItemRefusal extends Error {
  readonly outcome: "blocked" | "failed" | "cancelled";
  readonly code: string;

  constructor(outcome: "blocked" | "failed" | "cancelled", code: string, message: string) {
    super(message);
    this.name = "ItemRefusal";
    this.outcome = outcome;
    this.code = code;
  }
}

const TRANSITIONS: Readonly<Record<ProvisionState, readonly ProvisionState[]>> = {
  unknown: ["absent", "acquiring", "installed", "restart_required", "active", "failed", "blocked"],
  absent: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked"],
  acquiring: ["verifying", "installed", "restart_required", "active", "failed", "blocked", "absent"],
  verifying: ["installed", "restart_required", "active", "failed", "blocked", "acquiring", "absent"],
  installed: ["acquiring", "verifying", "active", "restart_required", "failed", "blocked", "absent"],
  restart_required: ["acquiring", "verifying", "active", "failed", "blocked", "absent"],
  active: ["acquiring", "verifying", "absent", "restart_required", "failed", "blocked"],
  failed: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked", "absent"],
  blocked: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "absent"],
};

function copyRef(ref: ResourceRef): ResourceRef {
  if (ref.kind === "extension") return { kind: "extension", id: ref.id };
  return {
    kind: "model",
    owner: ref.owner,
    id: ref.id,
    ...(ref.variant === undefined ? {} : { variant: ref.variant }),
    ...(ref.quant === undefined ? {} : { quant: ref.quant }),
  };
}

function copyItem(item: ResourceStatusItem): ResourceStatusItem {
  return {
    key: item.key,
    kind: item.kind,
    state: item.state,
    ...(item.path === undefined ? {} : { path: item.path }),
    ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
    ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
    ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
    ...(item.detail === undefined ? {} : { detail: item.detail }),
  };
}

function copyResultItem(item: ProvisionItemResult): ProvisionItemResult {
  return {
    ...copyItem(item),
    outcome: item.outcome,
  };
}

function copyOperation(operation: ProvisionOperation): ProvisionOperation {
  return {
    operationId: operation.operationId,
    ref: copyRef(operation.ref),
    state: operation.state,
    items: operation.items.map(copyItem),
    ...(operation.outcome === undefined ? {} : { outcome: operation.outcome }),
    startedAt: operation.startedAt,
    ...(operation.finishedAt === undefined ? {} : { finishedAt: operation.finishedAt }),
    ...(operation.detail === undefined ? {} : { detail: operation.detail }),
  };
}

function copyPlanItem(item: ProvisionPlanItem): ProvisionPlanItem {
  if (item.kind === "model") {
    return {
      kind: "model",
      key: item.key,
      owner: item.owner,
      id: item.id,
      name: item.name,
      folder: item.folder,
      url: item.url,
      ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
      ...(item.sizeBytes === undefined ? {} : { sizeBytes: item.sizeBytes }),
      required: item.required,
      provider: item.provider,
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.quant === undefined ? {} : { quant: item.quant }),
    };
  }
  return {
    kind: "extension",
    key: item.key,
    id: item.id,
    url: item.url,
    required: item.required,
    provider: item.provider,
    ...(item.ref === undefined ? {} : { ref: item.ref }),
    ...(item.version === undefined ? {} : { version: item.version }),
    ...(item.registry === undefined ? {} : { registry: item.registry }),
    ...(item.requirements === undefined ? {} : { requirements: [...item.requirements] }),
    ...(item.nodeTypes === undefined ? {} : { nodeTypes: [...item.nodeTypes] }),
  };
}

function copyPlan(plan: ProvisionPlan, ref: ResourceRef): ProvisionPlan {
  if (plan === undefined || plan === null || !Array.isArray(plan.items)) {
    throw new Error("declaration port returned an invalid provision plan");
  }
  if (!sameResourceRef(plan.ref, ref)) {
    throw new Error("declaration port returned a plan for a different resource");
  }
  for (const item of plan.items) {
    if (item.kind !== "model" && item.kind !== "extension") {
      throw new Error("declaration port returned an invalid plan item kind");
    }
    if (item.key.trim() === "" || item.provider.trim() === "" || typeof item.required !== "boolean") {
      throw new Error("declaration port returned an incomplete plan item");
    }
    if (item.kind === "model") {
      if (item.name.trim() === "" || item.folder.trim() === "" && item.folder !== "") {
        throw new Error("declaration port returned an invalid model destination");
      }
      if (item.url.trim() === "") {
        throw new Error("declaration port returned an invalid model source");
      }
      if (item.sha256 !== undefined && !/^[0-9a-f]{64}$/i.test(item.sha256)) {
        throw new ItemRefusal("blocked", "artifact/invalid-digest", "declaration port returned a malformed model digest");
      }
      if (item.sizeBytes !== undefined && (!Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 0)) {
        throw new Error("declaration port returned an invalid model size");
      }
    } else if (item.url !== undefined && item.url.trim() === "") {
      throw new Error("declaration port returned an invalid extension source");
    } else if (item.url === undefined && (item.registry ?? "").trim() === "" && item.provider !== "local") {
      throw new Error("declaration port returned an extension without a source");
    }
  }
  return {
    ref: copyRef(plan.ref),
    items: plan.items.map(copyPlanItem),
  };
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function refusalFor(error: unknown, signal?: AbortSignal): ItemRefusal {
  if (isAbortError(error, signal)) {
    return new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled");
  }
  if (error instanceof ItemRefusal) return error;
  if (error instanceof ManagerProviderError) {
    return new ItemRefusal("blocked", `manager/${error.code}`, error.message);
  }
  if (error instanceof ProvisioningError) {
    if (error.code === "invalid-digest" || error.code === "invalid-path") {
      return new ItemRefusal("blocked", error.code, error.message);
    }
    if (error.code === "size-mismatch") {
      return new ItemRefusal("failed", "artifact/size-mismatch", error.message);
    }
    return new ItemRefusal("failed", error.code, error.message);
  }
  return new ItemRefusal("failed", "provisioning/failed", errorText(error));
}

function aggregateState(items: readonly ProvisionItemResult[]): ProvisionState {
  if (items.length === 0) return "absent";
  if (items.some((item) => item.state === "blocked")) return "blocked";
  if (items.some((item) => item.state === "failed")) return "failed";
  if (items.every((item) => item.state === "active")) return "active";
  if (items.every((item) => item.state === "restart_required")) return "restart_required";
  if (items.some((item) => item.state === "restart_required")) {
    return "installed";
  }
  if (items.some((item) => item.state === "active")) return "active";
  return "absent";
}

function aggregateOutcome(items: readonly ProvisionItemResult[]): ProvisionOutcome {
  if (items.some((item) => item.outcome === "cancelled")) return "cancelled";
  const failed = items.filter((item) => item.outcome === "failed" || item.outcome === "blocked");
  const succeeded = items.filter((item) => item.outcome === "active" || item.outcome === "restart_required");
  if (failed.length === 0) {
    const allActive = items.every((item) => item.outcome === "active");
    return allActive ? "active" : "restart_required";
  }
  if (succeeded.length === 0) {
    return items.every((item) => item.outcome === "blocked") ? "blocked" : "failed";
  }
  return "partial";
}

function makeResult(
  ref: ResourceRef,
  operationId: string,
  outcome: ProvisionOutcome,
  operationState: ProvisionState,
  items: readonly ProvisionItemResult[],
  detail?: string,
): ProvisionResult {
  return {
    operationId,
    ref: copyRef(ref),
    state: outcome,
    outcome,
    operationState,
    items: items.map(copyResultItem),
    restartRequired: outcome === "restart_required" || items.some((item) => item.state === "restart_required"),
    ...(detail === undefined ? {} : { detail }),
  };
}

function relativeArtifactPath(folder: string, filename: string): string {
  if (filename.trim() === "" || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
    throw new ItemRefusal("blocked", "artifact/invalid-filename", "model filename must be one path segment");
  }
  if (folder.startsWith("/") || folder.includes("\\") || folder.split("/").some((part) => part === "..")) {
    throw new ItemRefusal("blocked", "artifact/invalid-folder", "model folder must stay under the artifact root");
  }
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return cleanFolder === "" ? filename : `${cleanFolder}/${filename}`;
}

function itemFailure(item: ProvisionPlanItem, refusal: ItemRefusal): ProvisionItemResult {
  return {
    key: item.key,
    kind: item.kind,
    state: refusal.outcome === "blocked" ? "blocked" : "failed",
    outcome: refusal.outcome,
    errorCode: refusal.code,
    detail: refusal.message,
  };
}

function itemResult(
  item: ProvisionPlanItem,
  state: ProvisionState,
  outcome: ProvisionOutcome,
  values: Omit<ResourceStatusItem, "key" | "kind" | "state"> = {},
): ProvisionItemResult {
  return {
    key: item.key,
    kind: item.kind,
    state,
    outcome,
    ...values,
  };
}

export class ProvisioningService extends Service implements ProvisioningServiceDefinition {
  private readonly declaration: DeclarationPort;
  private readonly writer: ArtifactWriterPort | undefined;
  private readonly writerRoot: string;
  private readonly manager: ManagerPort | undefined;
  private readonly inspector: InspectorPort | undefined;
  private readonly lifecycle: LifecyclePort | undefined;
  private readonly operationStore: OperationStorePort | undefined;
  private readonly writeGuard: () => boolean;
  private readonly operationIdFactory: () => string;
  private readonly records = new Map<string, ResourceRecord>();
  private readonly locks = new Map<string, LockedOperation>();
  private readonly listeners = new Set<ProvisionTransitionListener>();

  constructor(ctx: Context, config: ProvisioningConfig) {
    super(ctx, "provisioning");
    if (config === undefined || config.declaration === undefined) {
      throw new Error("provisioning requires a DeclarationPort");
    }
    this.declaration = config.declaration;
    this.writer = config.artifactWriter ?? (config.storeRoot === undefined ? undefined : new VerifiedArtifactWriter(config.storeRoot));
    this.writerRoot = config.storeRoot ?? (config.artifactWriter as { root?: unknown } | undefined)?.root as string ?? "";
    this.manager = config.manager;
    this.inspector = config.inspector;
    this.lifecycle = config.lifecycle;
    this.operationStore = config.operationStore;
    this.writeGuard = config.writeGuard ?? ((): boolean => true);
    this.operationIdFactory = config.operationIdFactory ?? newOperationId;
    this.ctx.effect(() => async (): Promise<void> => {
      const operations = [...this.locks.values()];
      for (const operation of operations) operation.controller.abort();
      await Promise.allSettled(operations.map((operation) => operation.promise));
    }, "provisioning.lifecycle");
    if (config.onTransition !== undefined) this.subscribe(config.onTransition);
  }

  stateOf(ref: ResourceRef): ProvisionState {
    return this.record(ref).state;
  }

  operationOf(ref: ResourceRef): ProvisionOperation | undefined {
    const operation = this.record(ref).operation;
    return operation === undefined ? undefined : copyOperation(operation);
  }

  transitionsOf(ref: ResourceRef): readonly ProvisionState[] {
    return [...this.record(ref).history];
  }

  isLocked(ref: ResourceRef): boolean {
    return this.locks.has(resourceKey(ref));
  }

  subscribe(listener: ProvisionTransitionListener): () => void {
    this.listeners.add(listener);
    return this.ctx.effect(() => () => {
      this.listeners.delete(listener);
    }, "provisioning.transition");
  }

  async plan(ref: ResourceRef): Promise<ProvisionPlan> {
    return copyPlan(await this.declaration.resolve(ref), ref);
  }

  async inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus> {
    const key = resourceKey(ref);
    const locked = this.locks.get(key);
    if (locked !== undefined) {
      const result = await this.joinLocked(ref, locked, signal);
      return this.statusFromResult(result);
    }
    let plan: ProvisionPlan;
    try {
      plan = await this.plan(ref);
    } catch (error: unknown) {
      const refusal = refusalFor(error, signal);
      this.move(ref, undefined, refusal.outcome === "blocked" ? "blocked" : "failed");
      return {
        ref: copyRef(ref),
        state: refusal.outcome === "blocked" ? "blocked" : "failed",
        items: [],
        detail: refusal.message,
      };
    }
    const items: ResourceStatusItem[] = [];
    for (const item of plan.items) {
      if (isAbortError(undefined, signal)) break;
      try {
        items.push(await this.inspectPlanItem(item, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        items.push(itemFailure(item, refusal));
      }
    }
    const state = aggregateState(items.map((item) => ({ ...item, outcome: stateOutcome(item.state) })));
    this.move(ref, undefined, state);
    const operationId = this.record(ref).operation?.operationId;
    return {
      ref: copyRef(ref),
      state,
      ...(operationId === undefined ? {} : { operationId }),
      items: items.map(copyItem),
    };
  }

  async ensure(
    ref: ResourceRef,
    options: EnsureOptions = {},
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    return await this.runLocked(ref, signal, async (operationId, operationSignal) =>
      await this.executeEnsure(ref, options, operationId, operationSignal),
    );
  }

  async activate(
    ref: ResourceRef,
    options: ActivateOptions = {},
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
      this.begin(ref, operationId);
      let plan: ProvisionPlan;
      try {
        plan = await this.plan(ref);
      } catch (error: unknown) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
      }
      if (plan.items.length === 0) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), operationSignal));
      }
      if (ref.kind === "model") {
        const inspected: ProvisionItemResult[] = [];
        for (const item of plan.items) {
          try {
            inspected.push(await this.inspectPlanItem(item, operationSignal) as ProvisionItemResult);
          } catch (error: unknown) {
            const refusal = refusalFor(error, operationSignal);
            inspected.push(itemFailure(item, refusal));
          }
        }
        const result = makeResult(ref, operationId, aggregateOutcome(inspected), aggregateState(inspected), inspected);
        return this.complete(ref, operationId, result);
      }
      if (this.manager === undefined) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
      }
      const inspection = this.manager.inspect === undefined
        ? undefined
        : await this.manager.inspect(ref.id, operationSignal).catch((error: unknown) => {
            throw new ItemRefusal("failed", "manager/inspect-failed", errorText(error));
          });
      if (inspection !== undefined && inspection.installed) {
        this.move(ref, operationId, "installed");
        const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
        return this.complete(ref, operationId, activated);
      }
      const ensured = await this.executeEnsure(ref, {}, operationId, operationSignal, true);
      if (ensured.state !== "restart_required" && ensured.state !== "active") return ensured;
      const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
      return this.complete(ref, operationId, activated);
    });
  }

  async acquireExternal(
    request: ExternalProvisionRequest,
    options: { readonly operatorConfirmed: boolean; readonly force?: boolean } = { operatorConfirmed: false },
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    const ref: ResourceRef = request.kind === "model"
      ? { kind: "model", owner: "card", id: "external-model" }
      : { kind: "extension", id: "external-extension" };
    const lockKey = `external:${request.kind}:${request.url}`;
    return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
      this.begin(ref, operationId);
      if (!this.writeGuard()) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
      }
      if (options.operatorConfirmed !== true) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "external/not-confirmed", "external acquisition requires operator confirmation"));
      }
      if (request.kind === "model") {
        if (this.writer?.inspect === undefined) {
          return this.complete(ref, operationId, this.blockedResult(ref, operationId, "artifact/inspect-unavailable", "external model acquisition requires the configured model store inspector"));
        }
        if (this.manager?.installModel === undefined) {
          return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/model-unavailable", "external model acquisition requires ComfyUI-Manager model installation"));
        }
        try {
          const filename = request.filename ?? "download.bin";
          const folder = request.relativePath === undefined ? "" : request.relativePath;
          const relativePath = relativeArtifactPath(folder, filename);
          const parts = relativePath.split("/");
          const landedName = parts[parts.length - 1] as string;
          const landedFolder = parts.slice(0, -1).join("/");
          this.move(ref, operationId, "verifying");
          const installed = await this.manager.installModel({
            id: relativePath,
            name: landedName,
            savePath: landedFolder,
            url: request.url,
            filename: landedName,
          }, operationSignal);
          if (!installed.installed) {
            throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
          }
          const landed = await this.writer.inspect({
            root: this.writerRoot,
            relativePath,
            ...(request.sha256 === undefined ? {} : { expectedSha256: request.sha256 }),
          }, operationSignal);
          if (!landed.present) {
            throw new ItemRefusal(
              "failed",
              landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch",
              landed.sha256 === undefined
                ? "ComfyUI-Manager queue completed but the requested model path is absent"
                : "ComfyUI-Manager landed bytes that do not match the requested SHA-256",
            );
          }
          if (request.sizeBytes !== undefined && landed.sizeBytes !== request.sizeBytes) {
            throw new ItemRefusal(
              "failed",
              "artifact/size-mismatch",
              `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(request.sizeBytes)}`,
            );
          }
          this.move(ref, operationId, "installed");
          const result = itemResult(
            { kind: "model", key: operationId, owner: "card", id: "external-model", name: relativePath, folder: "", url: request.url, sha256: request.sha256, required: true, provider: "external" },
            "active",
            "active",
            {
              path: landed.path,
              sha256: landed.sha256,
              integrity: request.sha256 === undefined ? "operator-unverified" : "declared-sha256",
            },
          );
          return this.complete(ref, operationId, makeResult(ref, operationId, "active", "active", [result]));
        } catch (error: unknown) {
          return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
        }
      }
      if (this.manager === undefined) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
      }
      try {
        const result = await this.manager.install({ id: ref.id, url: request.url, ...(request.ref === undefined ? {} : { ref: request.ref }) }, operationSignal);
        if (!result.installed) throw new ItemRefusal("failed", "manager/install-failed", result.detail ?? "manager did not install the extension");
        this.move(ref, operationId, "installed");
        const item = itemResult({ kind: "extension", key: operationId, id: ref.id, url: request.url, required: true, provider: "external" }, "restart_required", "restart_required", result.detail === undefined ? {} : { detail: result.detail });
        return this.complete(ref, operationId, makeResult(ref, operationId, "restart_required", "restart_required", [item]));
      } catch (error: unknown) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
      }
    }, lockKey);
  }

  async reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]> {
    if (ref !== undefined) return [await this.inspect(ref, signal)];
    if (this.declaration.list === undefined) return [];
    const refs = await this.declaration.list();
    const statuses: ResourceStatus[] = [];
    for (const item of refs) {
      if (isAbortError(undefined, signal)) break;
      try {
        statuses.push(await this.inspect(item, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        statuses.push({
          ref: copyRef(item),
          state: refusal.outcome === "blocked" ? "blocked" : "failed",
          items: [],
          detail: refusal.message,
        });
      }
    }
    return statuses;
  }

  private async executeEnsure(
    ref: ResourceRef,
    options: EnsureOptions,
    operationId: string,
    signal: AbortSignal,
    alreadyBegun = false,
  ): Promise<ProvisionResult> {
    if (!alreadyBegun) this.begin(ref, operationId);
    if (!this.writeGuard()) {
      return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
    }
    let plan: ProvisionPlan;
    try {
      plan = await this.plan(ref);
    } catch (error: unknown) {
      return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
    }
    if (options.items !== undefined) {
      const requested = new Set(options.items);
      plan = {
        ...plan,
        items: plan.items.filter((item) => requested.has(item.kind === "model" ? item.name : item.id)),
      };
      if (plan.items.length === 0) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/item-not-found", "requested provision item is not declared"));
      }
    }
    if (plan.items.length === 0) {
      return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), signal));
    }
    const items: ProvisionItemResult[] = [];
    let cancelled = false;
    for (const item of plan.items) {
      if (signal.aborted) {
        cancelled = true;
        items.push(itemFailure(item, new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled")));
        continue;
      }
      try {
        this.move(ref, operationId, item.kind === "model" ? "acquiring" : "acquiring");
        items.push(await this.acquirePlanItem(ref, item, operationId, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        if (refusal.outcome === "cancelled") cancelled = true;
        items.push(itemFailure(item, refusal));
      }
    }
    let outcome = aggregateOutcome(items);
    if (cancelled || signal.aborted) outcome = "cancelled";
    const operationState = outcome === "cancelled" ? "failed" : aggregateState(items);
    let result = makeResult(ref, operationId, outcome, operationState, items);
    if (options.activate === true || options.activateIfIdle === true) {
      if (ref.kind === "extension" && (outcome === "active" || outcome === "restart_required")) {
        result = await this.activateExtension(ref, plan, operationId, signal, {
          ...(options.force === undefined ? {} : { force: options.force }),
          ifIdle: options.activateIfIdle === true,
        });
      }
    }
    return this.complete(ref, operationId, result);
  }

  private async acquirePlanItem(
    ref: ResourceRef,
    item: ProvisionPlanItem,
    operationId: string,
    signal: AbortSignal,
  ): Promise<ProvisionItemResult> {
    if (item.kind === "model") return await this.acquireModel(ref, item, operationId, signal);
    // THE PROVIDER ARM (the contract's vocabulary): `local` verifies
    // in place. A token with no arm is REFUSED BY NAME — it used to
    // fall through to the Manager, so a "git" item on a lane with no
    // Manager refused "manager/unavailable" while a git provider sat
    // right there (the audit's C4).
    if (!providerOk(item.provider)) {
      throw new ItemRefusal("blocked", "extension/unknown-provider", unknownProviderRefusal(item.provider));
    }
    if (item.provider === "local") {
      if (this.inspector === undefined) {
        throw new ItemRefusal("blocked", "extension/inspect-unavailable", "local extension requires an engine inspector");
      }
      const inspection = await this.inspector.inspect(ref, signal);
      if (!inspection.active) {
        throw new ItemRefusal("blocked", "extension/not-active", inspection.detail ?? "local extension is not active on the engine");
      }
      return itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.manager === undefined) {
      throw new ItemRefusal("blocked", "manager/unavailable", "no ManagerPort is configured");
    }
    const request: ManagerInstallRequest = {
      id: item.id,
      url: item.url,
      ...(item.ref === undefined ? {} : { ref: item.ref }),
      ...(item.version === undefined ? {} : { version: item.version }),
      ...(item.registry === undefined ? {} : { registry: item.registry }),
      ...(item.requirements === undefined ? {} : { requirements: item.requirements }),
      ...(item.nodeTypes === undefined ? {} : { nodeTypes: item.nodeTypes }),
    };
    if (this.manager.canInstall !== undefined) {
      const canInstall = await this.manager.canInstall(request, signal);
      if (!canInstall) throw new ItemRefusal("blocked", "manager/pin-mismatch", "manager cannot honor the declared extension pin");
    }
    const installed = await this.manager.install(request, signal);
    if (!installed.installed) {
      throw new ItemRefusal("failed", "manager/install-failed", installed.detail ?? "manager did not install the extension");
    }
    this.move(ref, operationId, "installed");
    return itemResult(item, "restart_required", "restart_required", installed.detail === undefined ? {} : { detail: installed.detail });
  }

  private async acquireModel(
    ref: ResourceRef,
    item: ModelProvisionPlanItem,
    operationId: string,
    signal: AbortSignal,
  ): Promise<ProvisionItemResult> {
    if (item.sha256 === undefined || item.sha256.trim() === "") {
      throw new ItemRefusal("blocked", "artifact/invalid-digest", "model acquisition requires a declared SHA-256 digest");
    }
    if (this.writer === undefined || this.writer.inspect === undefined) {
      throw new ItemRefusal("blocked", "artifact/inspect-unavailable", "model acquisition requires the configured model store inspector");
    }
    if (this.manager?.installModel === undefined) {
      throw new ItemRefusal("blocked", "manager/model-unavailable", "model acquisition requires ComfyUI-Manager model installation");
    }
    const relativePath = relativeArtifactPath(item.folder, item.name);
    const existing = await this.writer.inspect({
      root: this.writerRoot,
      relativePath,
      expectedSha256: item.sha256,
    }, signal);
    if (existing.present) {
      if (item.sizeBytes !== undefined && existing.sizeBytes !== item.sizeBytes) {
        throw new ItemRefusal(
          "failed",
          "artifact/size-mismatch",
          `the declared model has size ${String(existing.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
        );
      }
      return itemResult(item, "active", "active", {
        ...(existing.path === undefined ? {} : { path: existing.path }),
        ...(existing.sha256 === undefined ? {} : { sha256: existing.sha256 }),
        integrity: "declared-sha256",
      });
    }
    this.move(ref, operationId, "verifying");
    const installed = await this.manager.installModel({
      id: item.key,
      name: item.name,
      savePath: item.folder,
      url: item.url,
      filename: item.name,
    }, signal);
    if (!installed.installed) {
      throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
    }
    const landed = await this.writer.inspect({
      root: this.writerRoot,
      relativePath,
      expectedSha256: item.sha256,
    }, signal);
    if (!landed.present) {
      const code = landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch";
      throw new ItemRefusal("failed", code, landed.sha256 === undefined
        ? "ComfyUI-Manager queue completed but the declared model path is absent"
        : "ComfyUI-Manager landed bytes that do not match the declared SHA-256");
    }
    if (item.sizeBytes !== undefined && landed.sizeBytes !== item.sizeBytes) {
      throw new ItemRefusal(
        "failed",
        "artifact/size-mismatch",
        `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
      );
    }
    this.move(ref, operationId, "installed");
    return itemResult(item, "active", "active", {
      path: landed.path,
      sha256: landed.sha256,
      integrity: "declared-sha256",
    });
  }

  private async activateExtension(
    ref: ResourceRef,
    plan: ProvisionPlan,
    operationId: string,
    signal: AbortSignal,
    options: ActivateOptions,
  ): Promise<ProvisionResult> {
    if (this.lifecycle === undefined || this.inspector === undefined) {
      return this.blockedResult(ref, operationId, "activation/unavailable", "activation requires LifecyclePort and InspectorPort");
    }
    try {
      const activeRuns = await this.lifecycle.activeRuns(signal);
      if (activeRuns.length > 0 && options.force !== true) {
        return this.blockedResult(ref, operationId, "activation/active-run", `activation refused while ${String(activeRuns.length)} run(s) are active`);
      }
      await this.lifecycle.restart(signal);
      await this.lifecycle.waitUntilReady(signal);
      const inspection = await this.inspector.inspect(ref, signal);
      const expected = plan.items.flatMap((item) => item.kind === "extension" ? item.nodeTypes ?? [] : []);
      const observed = new Set(inspection.nodeTypes ?? []);
      if (!inspection.active || expected.some((node) => !observed.has(node))) {
        return this.failureResult(ref, operationId, new ItemRefusal("failed", "activation/not-visible", inspection.detail ?? "declared extension node types are not visible"), signal);
      }
      const items = plan.items.map((item) => item.kind === "extension"
        ? itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail })
        : itemResult(item, "installed", "active"));
      return makeResult(ref, operationId, "active", "active", items);
    } catch (error: unknown) {
      return this.failureResult(ref, operationId, error, signal);
    }
  }

  private async inspectPlanItem(item: ProvisionPlanItem, signal?: AbortSignal): Promise<ProvisionItemResult> {
    if (item.kind === "model") {
      if (item.sha256 === undefined || item.sha256.trim() === "") {
        return itemResult(item, "blocked", "blocked", { errorCode: "artifact/invalid-digest" });
      }
      if (this.writer?.inspect === undefined) {
        if (this.inspector === undefined) return itemResult(item, "unknown", "blocked", { errorCode: "artifact/inspect-unavailable" });
        const inspection = await this.inspector.inspect(itemOwnerRef(item), signal);
        return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
      }
      const inspection = await this.writer.inspect({
        root: this.writerRoot,
        relativePath: relativeArtifactPath(item.folder, item.name),
        expectedSha256: item.sha256,
      }, signal);
      if (!inspection.present) return itemResult(item, "absent", "blocked", inspection.path === undefined ? {} : { path: inspection.path, sha256: inspection.sha256 });
      if (item.sizeBytes !== undefined && inspection.sizeBytes !== item.sizeBytes) {
        return itemResult(item, "failed", "failed", {
          errorCode: "artifact/size-mismatch",
          detail: `the declared model has size ${String(inspection.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
        });
      }
      return itemResult(item, "active", "active", {
        ...(inspection.path === undefined ? {} : { path: inspection.path }),
        ...(inspection.sha256 === undefined ? {} : { sha256: inspection.sha256 }),
        integrity: "declared-sha256",
      });
    }
    if (item.provider === "local") {
      if (this.inspector === undefined) return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
      const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
      return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.manager?.inspect !== undefined) {
      const inspection = await this.manager.inspect(item.id, signal);
      const state: ProvisionState = inspection.active ? "active" : inspection.installed ? "restart_required" : "absent";
      const outcome: ProvisionOutcome = inspection.active ? "active" : inspection.installed ? "restart_required" : "blocked";
      return itemResult(item, state, outcome, inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.inspector !== undefined) {
      const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
      return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
  }

  private begin(ref: ResourceRef, operationId: string): void {
    const record = this.record(ref);
    record.operation = {
      operationId,
      ref: copyRef(ref),
      state: "unknown",
      items: [],
      startedAt: Date.now(),
    };
    this.move(ref, operationId, "acquiring");
  }

  private complete(ref: ResourceRef, operationId: string, result: ProvisionResult): ProvisionResult {
    const record = this.record(ref);
    const operation = record.operation;
    if (operation !== undefined && operation.operationId === operationId) {
      record.operation = {
        ...operation,
        state: result.operationState,
        items: result.items.map(copyItem),
        outcome: result.state,
        finishedAt: Date.now(),
        ...(result.detail === undefined ? {} : { detail: result.detail }),
      };
    }
    this.move(ref, operationId, result.operationState, result.items);
    this.persist(record);
    return result;
  }

  private failureResult(
    ref: ResourceRef,
    operationId: string,
    error: unknown,
    signal?: AbortSignal,
  ): ProvisionResult {
    const refusal = refusalFor(error, signal);
    const outcome: ProvisionOutcome = refusal.outcome === "cancelled" ? "cancelled" : refusal.outcome;
    const item: ProvisionItemResult = {
      key: resourceKey(ref),
      kind: ref.kind,
      state: outcome === "blocked" ? "blocked" : "failed",
      outcome,
      errorCode: refusal.code,
      detail: refusal.message,
    };
    return makeResult(ref, operationId, outcome, outcome === "blocked" ? "blocked" : "failed", [item], refusal.message);
  }

  private blockedResult(
    ref: ResourceRef,
    operationId: string,
    code: string,
    message: string,
  ): ProvisionResult {
    const item: ProvisionItemResult = {
      key: resourceKey(ref),
      kind: ref.kind,
      state: "blocked",
      outcome: "blocked",
      errorCode: code,
      detail: message,
    };
    return makeResult(ref, operationId, "blocked", "blocked", [item], message);
  }

  private statusFromResult(result: ProvisionResult): ResourceStatus {
    return {
      ref: copyRef(result.ref),
      state: result.operationState,
      operationId: result.operationId,
      items: result.items.map(copyItem),
      ...(result.detail === undefined ? {} : { detail: result.detail }),
    };
  }

  private record(ref: ResourceRef): ResourceRecord {
    const key = resourceKey(ref);
    const existing = this.records.get(key);
    if (existing !== undefined) return existing;
    const record: ResourceRecord = { state: "unknown", history: ["unknown"] };
    this.records.set(key, record);
    return record;
  }

  private move(
    ref: ResourceRef,
    operationId: string | undefined,
    next: ProvisionState,
    items?: readonly ProvisionItemResult[],
  ): void {
    const record = this.record(ref);
    const previous = record.state;
    if (previous !== next && !TRANSITIONS[previous].includes(next)) {
      throw new Error(`invalid provisioning transition ${previous} -> ${next}`);
    }
    if (previous === next && operationId === undefined) return;
    record.state = next;
    if (previous !== next) record.history.push(next);
    if (operationId !== undefined && record.operation?.operationId === operationId) {
      record.operation = {
        ...record.operation,
        state: next,
        items: items === undefined ? record.operation.items : items.map(copyItem),
      };
    }
    if (previous !== next) {
      const transition: ProvisionTransition = {
        operationId: operationId ?? record.operation?.operationId ?? "none",
        ref: copyRef(ref),
        from: previous,
        to: next,
        at: Date.now(),
      };
      for (const listener of this.listeners) {
        try {
          listener(transition);
        } catch (error: unknown) {
          this.ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
        }
      }
      this.persist(record);
    }
  }

  private persist(record: ResourceRecord): void {
    if (this.operationStore === undefined || record.operation === undefined) return;
    const operation = copyOperation(record.operation);
    void this.operationStore.save(operation).catch((error: unknown) => {
      this.ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
    });
  }

  private async runLocked(
    ref: ResourceRef,
    signal: AbortSignal | undefined,
    body: (operationId: string, signal: AbortSignal) => Promise<ProvisionResult>,
    key = resourceKey(ref),
  ): Promise<ProvisionResult> {
    const existing = this.locks.get(key);
    if (existing !== undefined) return await this.joinLocked(ref, existing, signal);
    const id = this.operationIdFactory();
    const controller = new AbortController();
    const operationSignal = signal === undefined
      ? controller.signal
      : AbortSignal.any([controller.signal, signal]);
    if (signal?.aborted === true) controller.abort(signal.reason);
    let promise!: Promise<ProvisionResult>;
    promise = Promise.resolve()
      .then(() => body(id, operationSignal))
      .catch((error: unknown) => this.completeUnstarted(ref, id, error, operationSignal))
      .finally(() => {
        this.locks.delete(key);
      });
    this.locks.set(key, { id, controller, promise });
    return await promise;
  }

  private async joinLocked(
    ref: ResourceRef,
    operation: LockedOperation,
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    if (signal === undefined) return await operation.promise;
    if (signal.aborted) return this.cancelledJoinResult(ref, operation.id);
    return await new Promise<ProvisionResult>((resolvePromise, rejectPromise) => {
      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        fn();
      };
      const onAbort = (): void => finish(() => resolvePromise(this.cancelledJoinResult(ref, operation.id)));
      signal.addEventListener("abort", onAbort, { once: true });
      void operation.promise.then(
        (value) => finish(() => resolvePromise(value)),
        (error: unknown) => finish(() => rejectPromise(error)),
      );
    });
  }

  private cancelledJoinResult(ref: ResourceRef, operationId: string): ProvisionResult {
    return makeResult(ref, operationId, "cancelled", "failed", [], "operation cancelled while waiting for a shared operation");
  }

  private completeUnstarted(
    ref: ResourceRef,
    operationId: string,
    error: unknown,
    signal: AbortSignal,
  ): ProvisionResult {
    this.begin(ref, operationId);
    return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
  }
}

function stateOutcome(state: ProvisionState): ProvisionOutcome {
  if (state === "active") return "active";
  if (state === "restart_required") return "restart_required";
  if (state === "blocked") return "blocked";
  return "failed";
}

function itemOwnerRef(item: ModelProvisionPlanItem): ResourceRef {
  return {
    kind: "model",
    owner: item.owner,
    id: item.id,
    ...(item.variant === undefined ? {} : { variant: item.variant }),
    ...(item.quant === undefined ? {} : { quant: item.quant }),
  };
}

export const name = "provisioning";

export function apply(ctx: Context, config: ProvisioningConfig): void {
  new ProvisioningService(ctx, config);
}

export const provisioningProvider: Plugin = {
  name,
  apply,
};

export const provisioningContract = provisioningProvider;
export const provisioningPlugin = provisioningProvider;

declare module "@deepseek-ai/cordis" {
  interface Context {
    provisioning: ProvisioningService;
  }
}

export default provisioningProvider;
