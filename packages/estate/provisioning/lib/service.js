import { Service } from "@deepseek-ai/cordis";
import { ProvisioningError, VerifiedArtifactWriter, newOperationId, } from "./artifact-writer.js";
import { ManagerProviderError } from "./manager-provider.js";
import { providerOk, unknownProviderRefusal } from "./contracts.js";
import { resourceKey, sameResourceRef, } from "./contracts.js";
class ItemRefusal extends Error {
    outcome;
    code;
    constructor(outcome, code, message) {
        super(message);
        this.name = "ItemRefusal";
        this.outcome = outcome;
        this.code = code;
    }
}
const TRANSITIONS = {
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
function copyRef(ref) {
    if (ref.kind === "extension")
        return { kind: "extension", id: ref.id };
    return {
        kind: "model",
        owner: ref.owner,
        id: ref.id,
        ...(ref.variant === undefined ? {} : { variant: ref.variant }),
        ...(ref.quant === undefined ? {} : { quant: ref.quant }),
    };
}
function copyItem(item) {
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
function copyResultItem(item) {
    return {
        ...copyItem(item),
        outcome: item.outcome,
    };
}
function copyOperation(operation) {
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
function copyPlanItem(item) {
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
function copyPlan(plan, ref) {
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
        }
        else if (item.url !== undefined && item.url.trim() === "") {
            throw new Error("declaration port returned an invalid extension source");
        }
        else if (item.url === undefined && (item.registry ?? "").trim() === "" && item.provider !== "local") {
            throw new Error("declaration port returned an extension without a source");
        }
    }
    return {
        ref: copyRef(plan.ref),
        items: plan.items.map(copyPlanItem),
    };
}
function isAbortError(error, signal) {
    return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}
function errorText(error) {
    return error instanceof Error ? error.message : String(error);
}
function refusalFor(error, signal) {
    if (isAbortError(error, signal)) {
        return new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled");
    }
    if (error instanceof ItemRefusal)
        return error;
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
function aggregateState(items) {
    if (items.length === 0)
        return "absent";
    if (items.some((item) => item.state === "blocked"))
        return "blocked";
    if (items.some((item) => item.state === "failed"))
        return "failed";
    if (items.every((item) => item.state === "active"))
        return "active";
    if (items.every((item) => item.state === "restart_required"))
        return "restart_required";
    if (items.some((item) => item.state === "restart_required")) {
        return "installed";
    }
    if (items.some((item) => item.state === "active"))
        return "active";
    return "absent";
}
function aggregateOutcome(items) {
    if (items.some((item) => item.outcome === "cancelled"))
        return "cancelled";
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
function makeResult(ref, operationId, outcome, operationState, items, detail) {
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
function relativeArtifactPath(folder, filename) {
    if (filename.trim() === "" || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
        throw new ItemRefusal("blocked", "artifact/invalid-filename", "model filename must be one path segment");
    }
    if (folder.startsWith("/") || folder.includes("\\") || folder.split("/").some((part) => part === "..")) {
        throw new ItemRefusal("blocked", "artifact/invalid-folder", "model folder must stay under the artifact root");
    }
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    return cleanFolder === "" ? filename : `${cleanFolder}/${filename}`;
}
function itemFailure(item, refusal) {
    return {
        key: item.key,
        kind: item.kind,
        state: refusal.outcome === "blocked" ? "blocked" : "failed",
        outcome: refusal.outcome,
        errorCode: refusal.code,
        detail: refusal.message,
    };
}
function itemResult(item, state, outcome, values = {}) {
    return {
        key: item.key,
        kind: item.kind,
        state,
        outcome,
        ...values,
    };
}
/** THE F9 TOTAL (the tracker's denominator): the DECL size_bytes
 *  sum across a plan's model rows — 0 when no row declares one.
 *  Real declared bytes, never a guess. */
function planTotal(plan) {
    let total = 0;
    for (const item of plan.items) {
        if (item.kind === "model" && typeof item.sizeBytes === "number")
            total += item.sizeBytes;
    }
    return total;
}
/** THE F9 COUNTED SOURCE (the tracker's numerator): wraps the
 *  fetcher's byte stream and counts every landed chunk — the bytes
 *  the tracker polls are the bytes the writer received. */
function countedSource(source, onBytes) {
    async function* generate() {
        if (source instanceof ReadableStream) {
            const reader = source.getReader();
            try {
                for (;;) {
                    const next = await reader.read();
                    if (next.done)
                        break;
                    if (next.value !== undefined) {
                        onBytes(next.value.byteLength);
                        yield next.value;
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
            return;
        }
        const maybeAsync = source;
        if (typeof maybeAsync[Symbol.asyncIterator] === "function") {
            for await (const chunk of maybeAsync) {
                onBytes(chunk.byteLength);
                yield chunk;
            }
            return;
        }
        for (const chunk of source) {
            onBytes(chunk.byteLength);
            yield chunk;
        }
    }
    return generate();
}
export class ProvisioningService extends Service {
    declaration;
    writer;
    writerRoot;
    fetcher;
    manager;
    inspector;
    lifecycle;
    operationStore;
    writeGuard;
    operationIdFactory;
    records = new Map();
    locks = new Map();
    /** THE F9 BYTE LEDGER (one map, two readers): operationId ->
     *  live bytes/total. The direct arm counts the fetcher stream as
     *  it lands (real bytes, never an animation); total is the DECL
     *  size_bytes sum. The manage door (acquire_weight) and any
     *  future caller poll progressOf — one ledger, never two. */
    weightProgress = new Map();
    weightProgressByRef = new Map();
    constructor(ctx, config) {
        super(ctx, "provisioning");
        if (config === undefined || config.declaration === undefined) {
            throw new Error("provisioning requires a DeclarationPort");
        }
        this.declaration = config.declaration;
        this.writer = config.artifactWriter ?? (config.storeRoot === undefined ? undefined : new VerifiedArtifactWriter(config.storeRoot));
        this.writerRoot = config.storeRoot ?? config.artifactWriter?.root ?? "";
        this.fetcher = config.fetcher;
        this.manager = config.manager;
        this.inspector = config.inspector;
        this.lifecycle = config.lifecycle;
        this.operationStore = config.operationStore;
        this.writeGuard = config.writeGuard ?? (() => true);
        this.operationIdFactory = config.operationIdFactory ?? newOperationId;
        this.ctx.effect(() => async () => {
            const operations = [...this.locks.values()];
            for (const operation of operations)
                operation.controller.abort();
            await Promise.allSettled(operations.map((operation) => operation.promise));
        }, "provisioning.lifecycle");
    }
    stateOf(ref) {
        return this.record(ref).state;
    }
    operationOf(ref) {
        const operation = this.record(ref).operation;
        return operation === undefined ? undefined : copyOperation(operation);
    }
    transitionsOf(ref) {
        return [...this.record(ref).history];
    }
    isLocked(ref) {
        return this.locks.has(resourceKey(ref));
    }
    /** THE F9 PROGRESS READ (the tracker's poll): a copy of the live
     *  byte ledger for one operation id, null when unknown. Bytes are
     *  counted as the fetcher stream lands — real landed bytes, never
     *  an animation. */
    progressOf(operationId) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined)
            return null;
        return { ...entry, ref: copyRef(entry.ref) };
    }
    /** THE F9 REF READ (the tracker's poll by model): the live entry
     *  for one ref, null when no acquisition has started for it. */
    progressOfRef(ref) {
        const id = this.weightProgressByRef.get(resourceKey(ref));
        if (id === undefined)
            return null;
        return this.progressOf(id);
    }
    /** THE F9 START (one door's background arm): starts the fetch for
     *  one ref WITHOUT awaiting the landing and returns its operation
     *  id at once — the tracker polls progressOf. A second start while
     *  the first is locked returns the FIRST id (one fetch, never two;
     *  runLocked's join law). The fetch itself rides executeEnsure
     *  (the existing fetcher — no second fetcher). */
    async startWeightAcquire(ref, options = {}) {
        const key = resourceKey(ref);
        const locked = this.locks.get(key);
        if (locked !== undefined) {
            if (!this.weightProgress.has(locked.id)) {
                let total = 0;
                try {
                    const plan = await this.plan(ref);
                    total = planTotal(plan);
                }
                catch {
                    total = 0;
                }
                this.weightProgress.set(locked.id, {
                    operationId: locked.id,
                    ref: copyRef(ref),
                    state: "acquiring",
                    bytes: 0,
                    total,
                });
                this.weightProgressByRef.set(key, locked.id);
            }
            return locked.id;
        }
        let total = 0;
        try {
            const plan = await this.plan(ref);
            total = planTotal(plan);
        }
        catch {
            total = 0;
        }
        const id = this.operationIdFactory();
        this.weightProgress.set(id, {
            operationId: id,
            ref: copyRef(ref),
            state: "acquiring",
            bytes: 0,
            total,
        });
        this.weightProgressByRef.set(key, id);
        void this.runWithId(ref, id, undefined, async (operationId, operationSignal) => await this.executeEnsure(ref, options, operationId, operationSignal)).then((result) => {
            const current = this.weightProgress.get(id);
            if (current !== undefined) {
                const landed = current.total > 0 &&
                    (result.state === "active" || result.state === "restart_required")
                    ? current.total
                    : current.bytes;
                this.weightProgress.set(id, {
                    ...current,
                    state: result.operationState,
                    bytes: landed,
                    ...(result.detail === undefined ? {} : { detail: result.detail }),
                });
            }
        }).catch((error) => {
            const current = this.weightProgress.get(id);
            if (current !== undefined) {
                this.weightProgress.set(id, {
                    ...current,
                    state: "failed",
                    detail: error instanceof Error ? error.message : String(error),
                });
            }
        });
        return id;
    }
    async runWithId(ref, presetId, signal, body, key = resourceKey(ref)) {
        const existing = this.locks.get(key);
        if (existing !== undefined)
            return await this.joinLocked(ref, existing, signal);
        const controller = new AbortController();
        const operationSignal = signal === undefined
            ? controller.signal
            : AbortSignal.any([controller.signal, signal]);
        if (signal?.aborted === true)
            controller.abort(signal.reason);
        let promise;
        promise = Promise.resolve()
            .then(() => body(presetId, operationSignal))
            .catch((error) => this.completeUnstarted(ref, presetId, error, operationSignal))
            .finally(() => {
            this.locks.delete(key);
        });
        this.locks.set(key, { id: presetId, controller, promise });
        return await promise;
    }
    async plan(ref) {
        return copyPlan(await this.declaration.resolve(ref), ref);
    }
    async inspect(ref, signal) {
        const key = resourceKey(ref);
        const locked = this.locks.get(key);
        if (locked !== undefined) {
            const result = await this.joinLocked(ref, locked, signal);
            return this.statusFromResult(result);
        }
        let plan;
        try {
            plan = await this.plan(ref);
        }
        catch (error) {
            const refusal = refusalFor(error, signal);
            this.move(ref, undefined, refusal.outcome === "blocked" ? "blocked" : "failed");
            return {
                ref: copyRef(ref),
                state: refusal.outcome === "blocked" ? "blocked" : "failed",
                items: [],
                detail: refusal.message,
            };
        }
        const items = [];
        for (const item of plan.items) {
            if (isAbortError(undefined, signal))
                break;
            try {
                items.push(await this.inspectPlanItem(item, signal));
            }
            catch (error) {
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
    async ensure(ref, options = {}, signal) {
        return await this.runLocked(ref, signal, async (operationId, operationSignal) => await this.executeEnsure(ref, options, operationId, operationSignal));
    }
    async activate(ref, options = {}, signal) {
        return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
            this.begin(ref, operationId);
            let plan;
            try {
                plan = await this.plan(ref);
            }
            catch (error) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
            }
            if (plan.items.length === 0) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), operationSignal));
            }
            if (ref.kind === "model") {
                const inspected = [];
                for (const item of plan.items) {
                    try {
                        inspected.push(await this.inspectPlanItem(item, operationSignal));
                    }
                    catch (error) {
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
                : await this.manager.inspect(ref.id, operationSignal).catch((error) => {
                    throw new ItemRefusal("failed", "manager/inspect-failed", errorText(error));
                });
            if (inspection !== undefined && inspection.installed) {
                this.move(ref, operationId, "installed");
                const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
                return this.complete(ref, operationId, activated);
            }
            const ensured = await this.executeEnsure(ref, {}, operationId, operationSignal, true);
            if (ensured.state !== "restart_required" && ensured.state !== "active")
                return ensured;
            const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
            return this.complete(ref, operationId, activated);
        });
    }
    async acquireExternal(request, options = { operatorConfirmed: false }, signal) {
        const ref = request.kind === "model"
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
                    const landedName = parts[parts.length - 1];
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
                        throw new ItemRefusal("failed", landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch", landed.sha256 === undefined
                            ? "ComfyUI-Manager queue completed but the requested model path is absent"
                            : "ComfyUI-Manager landed bytes that do not match the requested SHA-256");
                    }
                    if (request.sizeBytes !== undefined && landed.sizeBytes !== request.sizeBytes) {
                        throw new ItemRefusal("failed", "artifact/size-mismatch", `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(request.sizeBytes)}`);
                    }
                    this.move(ref, operationId, "installed");
                    const result = itemResult({ kind: "model", key: operationId, owner: "card", id: "external-model", name: relativePath, folder: "", url: request.url, sha256: request.sha256, required: true, provider: "external" }, "active", "active", {
                        path: landed.path,
                        sha256: landed.sha256,
                        integrity: request.sha256 === undefined ? "operator-unverified" : "declared-sha256",
                    });
                    return this.complete(ref, operationId, makeResult(ref, operationId, "active", "active", [result]));
                }
                catch (error) {
                    return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
                }
            }
            if (this.manager === undefined) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
            }
            try {
                const result = await this.manager.install({ id: ref.id, url: request.url, ...(request.ref === undefined ? {} : { ref: request.ref }) }, operationSignal);
                if (!result.installed)
                    throw new ItemRefusal("failed", "manager/install-failed", result.detail ?? "manager did not install the extension");
                this.move(ref, operationId, "installed");
                const item = itemResult({ kind: "extension", key: operationId, id: ref.id, url: request.url, required: true, provider: "external" }, "restart_required", "restart_required", result.detail === undefined ? {} : { detail: result.detail });
                return this.complete(ref, operationId, makeResult(ref, operationId, "restart_required", "restart_required", [item]));
            }
            catch (error) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
            }
        }, lockKey);
    }
    async reconcile(ref, signal) {
        if (ref !== undefined)
            return [await this.inspect(ref, signal)];
        if (this.declaration.list === undefined)
            return [];
        const refs = await this.declaration.list();
        const statuses = [];
        for (const item of refs) {
            if (isAbortError(undefined, signal))
                break;
            try {
                statuses.push(await this.inspect(item, signal));
            }
            catch (error) {
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
    async executeEnsure(ref, options, operationId, signal, alreadyBegun = false) {
        if (!alreadyBegun)
            this.begin(ref, operationId);
        if (!this.writeGuard()) {
            return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
        }
        let plan;
        try {
            plan = await this.plan(ref);
        }
        catch (error) {
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
        // THE F9 LEDGER SEED (the tracker's denominator): the blocking
        // ensure path never passes through startWeightAcquire, so the
        // entry must exist here too — total is the DECL sum, bytes 0.
        // A background start already seeded it; that entry wins.
        if (!this.weightProgress.has(operationId)) {
            this.weightProgress.set(operationId, {
                operationId,
                ref: copyRef(ref),
                state: "acquiring",
                bytes: 0,
                total: planTotal(plan),
            });
            this.weightProgressByRef.set(resourceKey(ref), operationId);
        }
        const items = [];
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
            }
            catch (error) {
                const refusal = refusalFor(error, signal);
                if (refusal.outcome === "cancelled")
                    cancelled = true;
                items.push(itemFailure(item, refusal));
            }
        }
        let outcome = aggregateOutcome(items);
        if (cancelled || signal.aborted)
            outcome = "cancelled";
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
    async acquirePlanItem(ref, item, operationId, signal) {
        if (item.kind === "model")
            return await this.acquireModel(ref, item, operationId, signal);
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
        const request = {
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
            if (!canInstall)
                throw new ItemRefusal("blocked", "manager/pin-mismatch", "manager cannot honor the declared extension pin");
        }
        const installed = await this.manager.install(request, signal);
        if (!installed.installed) {
            throw new ItemRefusal("failed", "manager/install-failed", installed.detail ?? "manager did not install the extension");
        }
        this.move(ref, operationId, "installed");
        return itemResult(item, "restart_required", "restart_required", installed.detail === undefined ? {} : { detail: installed.detail });
    }
    async acquireModel(ref, item, operationId, signal) {
        if (item.sha256 === undefined || item.sha256.trim() === "") {
            throw new ItemRefusal("blocked", "artifact/invalid-digest", "model acquisition requires a declared SHA-256 digest");
        }
        if (this.writer === undefined || this.writer.inspect === undefined) {
            throw new ItemRefusal("blocked", "artifact/inspect-unavailable", "model acquisition requires the configured model store inspector");
        }
        // THE PROVIDER ARM FOR MODELS (the contract's vocabulary): the
        // declaration stamps every model row with its intended source,
        // and this arm honours the token — a "direct" row used to be
        // silently countermanded to ComfyUI-Manager, which resolved the
        // row through its own catalog URL and refused anything the
        // catalog did not know. A token with no model arm is REFUSED BY
        // NAME (the extension arm's law), never routed to a default.
        if (!providerOk(item.provider)) {
            throw new ItemRefusal("blocked", "model/unknown-provider", unknownProviderRefusal(item.provider));
        }
        if (item.provider === "git" || item.provider === "external") {
            throw new ItemRefusal("blocked", "model/provider-without-arm", `the model plan arm does not implement provider "${item.provider}" — git clones are an extension arm, external acquisition rides the operator-confirmed door`);
        }
        const relativePath = relativeArtifactPath(item.folder, item.name);
        const existing = await this.writer.inspect({
            root: this.writerRoot,
            relativePath,
            expectedSha256: item.sha256,
        }, signal);
        if (existing.present) {
            if (item.sizeBytes !== undefined && existing.sizeBytes !== item.sizeBytes) {
                throw new ItemRefusal("failed", "artifact/size-mismatch", `the declared model has size ${String(existing.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`);
            }
            // THE F9 ALREADY-LANDED BYTES (real, not animation): a present
            // file contributes its declared size to the live count at once.
            if (item.sizeBytes !== undefined)
                this.bumpProgress(operationId, item.sizeBytes);
            return itemResult(item, "active", "active", {
                ...(existing.path === undefined ? {} : { path: existing.path }),
                ...(existing.sha256 === undefined ? {} : { sha256: existing.sha256 }),
                integrity: "declared-sha256",
            });
        }
        if (item.provider === "local") {
            throw new ItemRefusal("blocked", "model/not-present", `local model ${item.name} is not present at ${relativePath} with the declared digest — the local arm verifies, it never installs`);
        }
        if (item.provider === "direct") {
            if (this.fetcher === undefined) {
                throw new ItemRefusal("blocked", "artifact/fetch-unavailable", "direct model acquisition requires a configured artifact fetcher");
            }
            this.move(ref, operationId, "verifying");
            const response = await this.fetcher(item.url, signal);
            if (response.status !== 200 || response.body === null) {
                throw new ItemRefusal("failed", "artifact/fetch-refused", `direct fetch of ${item.url} answered status ${String(response.status)}${response.body === null ? " with no body" : ""}`);
            }
            try {
                // THE F9 COUNTED WRITE (the tracker's numerator): the ledger
                // entry must exist before the first chunk lands (a background
                // start seeded it with the plan total; a blocking ensure
                // seeded it in executeEnsure — this keeps whichever total is
                // already there and only fills a missing one).
                this.ensureProgress(operationId, ref, item.sizeBytes ?? 0);
                const landed = await this.writer.write({
                    root: this.writerRoot,
                    relativePath,
                    expectedSha256: item.sha256,
                    operationId,
                    source: countedSource(response.body, (count) => this.bumpProgress(operationId, count)),
                    sizeBytes: item.sizeBytes,
                }, signal);
                this.move(ref, operationId, "installed");
                return itemResult(item, "active", "active", {
                    path: landed.path,
                    sha256: landed.sha256,
                    integrity: "declared-sha256",
                });
            }
            catch (error) {
                if (error instanceof ProvisioningError) {
                    throw new ItemRefusal("failed", "artifact/" + error.code, error.message);
                }
                throw error;
            }
        }
        if (this.manager?.installModel === undefined) {
            throw new ItemRefusal("blocked", "manager/model-unavailable", "model acquisition requires ComfyUI-Manager model installation");
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
            throw new ItemRefusal("failed", "artifact/size-mismatch", `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`);
        }
        // THE F9 MANAGER BYTES (real landed total, no mid-flight count):
        // the Manager owns its own queue bytes, so the ledger jumps from
        // the pre-install count to the declared size only on success.
        if (item.sizeBytes !== undefined)
            this.bumpProgress(operationId, item.sizeBytes);
        this.move(ref, operationId, "installed");
        return itemResult(item, "active", "active", {
            path: landed.path,
            sha256: landed.sha256,
            integrity: "declared-sha256",
        });
    }
    async activateExtension(ref, plan, operationId, signal, options) {
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
        }
        catch (error) {
            return this.failureResult(ref, operationId, error, signal);
        }
    }
    async inspectPlanItem(item, signal) {
        if (item.kind === "model") {
            if (item.sha256 === undefined || item.sha256.trim() === "") {
                return itemResult(item, "blocked", "blocked", { errorCode: "artifact/invalid-digest" });
            }
            if (this.writer?.inspect === undefined) {
                if (this.inspector === undefined)
                    return itemResult(item, "unknown", "blocked", { errorCode: "artifact/inspect-unavailable" });
                const inspection = await this.inspector.inspect(itemOwnerRef(item), signal);
                return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
            }
            const inspection = await this.writer.inspect({
                root: this.writerRoot,
                relativePath: relativeArtifactPath(item.folder, item.name),
                expectedSha256: item.sha256,
            }, signal);
            if (!inspection.present)
                return itemResult(item, "absent", "blocked", inspection.path === undefined ? {} : { path: inspection.path, sha256: inspection.sha256 });
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
            if (this.inspector === undefined)
                return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
            const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
            return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        if (this.manager?.inspect !== undefined) {
            const inspection = await this.manager.inspect(item.id, signal);
            const state = inspection.active ? "active" : inspection.installed ? "restart_required" : "absent";
            const outcome = inspection.active ? "active" : inspection.installed ? "restart_required" : "blocked";
            return itemResult(item, state, outcome, inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        if (this.inspector !== undefined) {
            const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
            return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
    }
    begin(ref, operationId) {
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
    complete(ref, operationId, result) {
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
    failureResult(ref, operationId, error, signal) {
        const refusal = refusalFor(error, signal);
        const outcome = refusal.outcome === "cancelled" ? "cancelled" : refusal.outcome;
        const item = {
            key: resourceKey(ref),
            kind: ref.kind,
            state: outcome === "blocked" ? "blocked" : "failed",
            outcome,
            errorCode: refusal.code,
            detail: refusal.message,
        };
        return makeResult(ref, operationId, outcome, outcome === "blocked" ? "blocked" : "failed", [item], refusal.message);
    }
    blockedResult(ref, operationId, code, message) {
        const item = {
            key: resourceKey(ref),
            kind: ref.kind,
            state: "blocked",
            outcome: "blocked",
            errorCode: code,
            detail: message,
        };
        return makeResult(ref, operationId, "blocked", "blocked", [item], message);
    }
    statusFromResult(result) {
        return {
            ref: copyRef(result.ref),
            state: result.operationState,
            operationId: result.operationId,
            items: result.items.map(copyItem),
            ...(result.detail === undefined ? {} : { detail: result.detail }),
        };
    }
    record(ref) {
        const key = resourceKey(ref);
        const existing = this.records.get(key);
        if (existing !== undefined)
            return existing;
        const record = { state: "unknown", history: ["unknown"] };
        this.records.set(key, record);
        return record;
    }
    move(ref, operationId, next, items) {
        const record = this.record(ref);
        const previous = record.state;
        if (previous !== next && !TRANSITIONS[previous].includes(next)) {
            throw new Error(`invalid provisioning transition ${previous} -> ${next}`);
        }
        if (previous === next && operationId === undefined)
            return;
        record.state = next;
        if (previous !== next)
            record.history.push(next);
        if (operationId !== undefined && record.operation?.operationId === operationId) {
            record.operation = {
                ...record.operation,
                state: next,
                items: items === undefined ? record.operation.items : items.map(copyItem),
            };
        }
        // THE F9 STATE MIRROR (the tracker's face): the progress entry
        // follows the record — acquiring while the stream lands, then
        // the terminal operationState. The poll reads state + bytes.
        if (operationId !== undefined) {
            const entry = this.weightProgress.get(operationId);
            if (entry !== undefined && entry.state !== next) {
                this.weightProgress.set(operationId, { ...entry, state: next });
            }
        }
        if (previous !== next) {
            this.persist(record);
        }
    }
    /** THE F9 BYTE ADD (the tracker's numerator write): adds landed
     *  bytes to one operation's live count. No entry, no write. */
    bumpProgress(operationId, count) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined || count <= 0)
            return;
        this.weightProgress.set(operationId, { ...entry, bytes: entry.bytes + count });
    }
    /** THE F9 ENTRY FILL (the tracker's denominator keep): creates the
     *  live entry when the blocking path is the first writer, and never
     *  shrinks a background start's plan total. */
    ensureProgress(operationId, ref, total) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined) {
            this.weightProgress.set(operationId, {
                operationId,
                ref: copyRef(ref),
                state: "acquiring",
                bytes: 0,
                total,
            });
            this.weightProgressByRef.set(resourceKey(ref), operationId);
        }
        else if (entry.total === 0 && total > 0) {
            this.weightProgress.set(operationId, { ...entry, total });
        }
    }
    persist(record) {
        if (this.operationStore === undefined || record.operation === undefined)
            return;
        const operation = copyOperation(record.operation);
        void this.operationStore.save(operation).catch((error) => {
            this.ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
        });
    }
    async runLocked(ref, signal, body, key = resourceKey(ref)) {
        const existing = this.locks.get(key);
        if (existing !== undefined)
            return await this.joinLocked(ref, existing, signal);
        const id = this.operationIdFactory();
        const controller = new AbortController();
        const operationSignal = signal === undefined
            ? controller.signal
            : AbortSignal.any([controller.signal, signal]);
        if (signal?.aborted === true)
            controller.abort(signal.reason);
        let promise;
        promise = Promise.resolve()
            .then(() => body(id, operationSignal))
            .catch((error) => this.completeUnstarted(ref, id, error, operationSignal))
            .finally(() => {
            this.locks.delete(key);
        });
        this.locks.set(key, { id, controller, promise });
        return await promise;
    }
    async joinLocked(ref, operation, signal) {
        if (signal === undefined)
            return await operation.promise;
        if (signal.aborted)
            return this.cancelledJoinResult(ref, operation.id);
        return await new Promise((resolvePromise, rejectPromise) => {
            let settled = false;
            const finish = (fn) => {
                if (settled)
                    return;
                settled = true;
                signal.removeEventListener("abort", onAbort);
                fn();
            };
            const onAbort = () => finish(() => resolvePromise(this.cancelledJoinResult(ref, operation.id)));
            signal.addEventListener("abort", onAbort, { once: true });
            void operation.promise.then((value) => finish(() => resolvePromise(value)), (error) => finish(() => rejectPromise(error)));
        });
    }
    cancelledJoinResult(ref, operationId) {
        return makeResult(ref, operationId, "cancelled", "failed", [], "operation cancelled while waiting for a shared operation");
    }
    completeUnstarted(ref, operationId, error, signal) {
        this.begin(ref, operationId);
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
    }
}
function stateOutcome(state) {
    if (state === "active")
        return "active";
    if (state === "restart_required")
        return "restart_required";
    if (state === "blocked")
        return "blocked";
    return "failed";
}
function itemOwnerRef(item) {
    return {
        kind: "model",
        owner: item.owner,
        id: item.id,
        ...(item.variant === undefined ? {} : { variant: item.variant }),
        ...(item.quant === undefined ? {} : { quant: item.quant }),
    };
}
export const name = "provisioning";
export function apply(ctx, config) {
    new ProvisioningService(ctx, config);
}
export const provisioningProvider = {
    name,
    apply,
};
export const provisioningContract = provisioningProvider;
export const provisioningPlugin = provisioningProvider;
export default provisioningProvider;
//# sourceMappingURL=service.js.map
