import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, unlink } from "node:fs/promises";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { join, resolve } from "node:path";
import { PROVISION_OUTCOMES, PROVISION_STATES, } from "./contracts.js";
export class OperationStoreError extends Error {
    code;
    constructor(code, message, cause) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "OperationStoreError";
        this.code = code;
    }
}
function record(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasValue(values, value) {
    return typeof value === "string" && values.includes(value);
}
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
export function copyProvisionOperation(operation) {
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
function validRef(value) {
    if (!record(value) || (value["kind"] !== "model" && value["kind"] !== "extension"))
        return false;
    if (typeof value["id"] !== "string" || value["id"] === "")
        return false;
    if (value["kind"] === "extension")
        return true;
    return (value["owner"] === "family" || value["owner"] === "card")
        && (value["variant"] === undefined || typeof value["variant"] === "string")
        && (value["quant"] === undefined || typeof value["quant"] === "string");
}
function validItem(value) {
    if (!record(value))
        return false;
    if (typeof value["key"] !== "string" || value["key"] === "")
        return false;
    if (value["kind"] !== "model" && value["kind"] !== "extension")
        return false;
    if (!hasValue(PROVISION_STATES, value["state"]))
        return false;
    if (value["integrity"] !== undefined && value["integrity"] !== "declared-sha256" && value["integrity"] !== "size-checked" && value["integrity"] !== "operator-unverified")
        return false;
    for (const key of ["path", "sha256", "errorCode", "detail"]) {
        if (value[key] !== undefined && typeof value[key] !== "string")
            return false;
    }
    return true;
}
function parseOperation(value, expectedId) {
    if (!record(value)) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation is not an object");
    }
    const operationId = value["operationId"];
    if (typeof operationId !== "string" || operationId === "") {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has no operation id");
    }
    if (expectedId !== undefined && operationId !== expectedId) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation id does not match its record");
    }
    if (!validRef(value["ref"])) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid resource ref");
    }
    if (!hasValue(PROVISION_STATES, value["state"])) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid state");
    }
    if (!Array.isArray(value["items"]) || !value["items"].every(validItem)) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has invalid items");
    }
    if (value["outcome"] !== undefined && !hasValue(PROVISION_OUTCOMES, value["outcome"])) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid outcome");
    }
    if (typeof value["startedAt"] !== "number" || !Number.isFinite(value["startedAt"])) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid start time");
    }
    if (value["finishedAt"] !== undefined && (typeof value["finishedAt"] !== "number" || !Number.isFinite(value["finishedAt"]))) {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid finish time");
    }
    if (value["detail"] !== undefined && typeof value["detail"] !== "string") {
        throw new OperationStoreError("invalid-record", "Stored provisioning operation has an invalid detail");
    }
    return copyProvisionOperation(value);
}
function requireOperation(operation) {
    if (typeof operation !== "object" || operation === null || operation.operationId.trim() === "") {
        throw new OperationStoreError("invalid-request", "Provisioning operation id is required");
    }
    return parseOperation(operation, operation.operationId);
}
function operationFile(operationId) {
    const digest = createHash("sha256").update(operationId).digest("hex");
    return `${digest}.json`;
}
async function pathKind(path) {
    try {
        const value = await lstat(path);
        if (value.isSymbolicLink())
            return "symlink";
        if (value.isFile())
            return "file";
        if (value.isDirectory())
            return "directory";
        return "other";
    }
    catch (error) {
        if (error.code === "ENOENT")
            return "missing";
        throw error;
    }
}
export class InMemoryOperationStore {
    operations = new Map();
    async load(operationId) {
        const operation = this.operations.get(operationId);
        return operation === undefined ? null : copyProvisionOperation(operation);
    }
    async save(operation) {
        const checked = requireOperation(operation);
        this.operations.set(checked.operationId, copyProvisionOperation(checked));
    }
    async remove(operationId) {
        this.operations.delete(operationId);
    }
    async list() {
        return [...this.operations.values()].map((operation) => copyProvisionOperation(operation));
    }
}
export class FileOperationStore {
    root;
    pending = new Map();
    constructor(root) {
        if (root.trim() === "") {
            throw new OperationStoreError("invalid-request", "Operation-store root is required");
        }
        this.root = resolve(root);
    }
    async load(operationId) {
        if (operationId.trim() === "") {
            throw new OperationStoreError("invalid-request", "Operation id is required");
        }
        const filename = operationFile(operationId);
        await this.pending.get(filename);
        const root = await this.prepareRoot();
        const path = join(root, filename);
        const kind = await pathKind(path);
        if (kind === "missing")
            return null;
        if (kind !== "file") {
            throw new OperationStoreError("invalid-record", "Operation record path is not a regular file");
        }
        let value;
        try {
            value = JSON.parse(await readFile(path, "utf8"));
        }
        catch (error) {
            throw new OperationStoreError("invalid-record", "Operation record is not valid JSON", error);
        }
        return copyProvisionOperation(parseOperation(value, operationId));
    }
    async save(operation) {
        const checked = requireOperation(operation);
        await this.enqueue(checked.operationId, async () => {
            const root = await this.prepareRoot();
            const destination = join(root, operationFile(checked.operationId));
            try {
                await writeFileAtomic(destination, `${JSON.stringify(checked)}\n`, { mode: 0o600 });
            }
            catch (error) {
                throw new OperationStoreError("io", "Failed to persist provisioning operation", error);
            }
        });
    }
    async remove(operationId) {
        if (operationId.trim() === "") {
            throw new OperationStoreError("invalid-request", "Operation id is required");
        }
        await this.enqueue(operationId, async () => {
            const root = await this.prepareRoot();
            try {
                await unlink(join(root, operationFile(operationId)));
            }
            catch (error) {
                if (error.code !== "ENOENT") {
                    throw new OperationStoreError("io", "Failed to remove provisioning operation", error);
                }
            }
        });
    }
    async list() {
        const root = await this.prepareRoot();
        // settle in-flight saves first: a boot rehydrate must read the
        // rows the last writes were still landing
        await Promise.all([...this.pending.values()]);
        const rows = [];
        for (const name of (await readdir(root)).sort()) {
            if (!name.endsWith(".json"))
                continue;
            const path = join(root, name);
            const kind = await pathKind(path);
            if (kind === "missing")
                continue;
            if (kind !== "file") {
                throw new OperationStoreError("invalid-record", `Operation record ${name} is not a regular file`);
            }
            let value;
            try {
                value = JSON.parse(await readFile(path, "utf8"));
            }
            catch (error) {
                throw new OperationStoreError("invalid-record", `Operation record ${name} is not valid JSON`, error);
            }
            rows.push(copyProvisionOperation(parseOperation(value)));
        }
        return rows;
    }
    async prepareRoot() {
        try {
            await mkdir(this.root, { recursive: true });
            if (await pathKind(this.root) !== "directory") {
                throw new OperationStoreError("io", "Operation-store root is not a real directory");
            }
            return await realpath(this.root);
        }
        catch (error) {
            if (error instanceof OperationStoreError)
                throw error;
            throw new OperationStoreError("io", "Failed to prepare operation-store root", error);
        }
    }
    async enqueue(operationId, task) {
        const filename = operationFile(operationId);
        const previous = this.pending.get(filename) ?? Promise.resolve();
        const next = previous.then(task);
        const settled = next.then(() => undefined, () => undefined);
        this.pending.set(filename, settled);
        void settled.then(() => {
            if (this.pending.get(filename) === settled)
                this.pending.delete(filename);
        });
        await next;
    }
}
export const MemoryOperationStore = InMemoryOperationStore;
//# sourceMappingURL=operation-store.js.map