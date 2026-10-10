import { afterEach, describe, expect, test, vi } from "vitest";
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
import {
  FileOperationStore,
  InMemoryOperationStore,
  OperationStoreError,
  copyProvisionOperation,
  type ProvisionOperation,
} from "../src/index.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-store-"));
  roots.push(value);
  return value;
}

function operation(over: Partial<ProvisionOperation> = {}): ProvisionOperation {
  return {
    operationId: "op-one",
    ref: { kind: "extension", id: "pack" },
    state: "active",
    outcome: "active",
    items: [{ key: "extension:pack", kind: "extension", state: "active" }],
    startedAt: 100,
    finishedAt: 200,
    detail: "done",
    ...over,
  };
}

function modelOperation(): ProvisionOperation {
  return operation({
    operationId: "op-model",
    ref: { kind: "model", owner: "card", id: "family", variant: "fp16", quant: "q4" },
    items: [{
      key: "model:card:family:one.bin",
      kind: "model",
      state: "failed",
      path: "models/one.bin",
      sha256: "a".repeat(64),
      integrity: "declared-sha256",
      errorCode: "artifact/hash-mismatch",
      detail: "bad",
    }],
  });
}

function recordPath(rootPath: string, operationId: string): string {
  return join(rootPath, `${createHash("sha256").update(operationId).digest("hex")}.json`);
}

async function rejectsCode(promise: Promise<unknown>, code: string): Promise<OperationStoreError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof OperationStoreError);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected ${code}`);
}

describe("operation snapshots and in-memory store", () => {
  test("copies extension and model records with every optional field", () => {
    const extension = copyProvisionOperation(operation());
    assert.deepEqual(extension, operation());
    const model = copyProvisionOperation(modelOperation());
    assert.deepEqual(model.ref, { kind: "model", owner: "card", id: "family", variant: "fp16", quant: "q4" });
    assert.deepEqual(model.items[0], modelOperation().items[0]);
    const sparse = copyProvisionOperation({
      operationId: "sparse",
      ref: { kind: "model", owner: "family", id: "sparse" },
      state: "unknown",
      items: [{ key: "model:family:sparse", kind: "model", state: "unknown" }],
      startedAt: 1,
    });
    assert.equal(sparse.outcome, undefined);
    assert.equal(sparse.finishedAt, undefined);
    assert.equal(sparse.detail, undefined);
    assert.equal(sparse.items[0]?.path, undefined);
  });

  test("isolates in-memory snapshots and removes records", async () => {
    const store = new InMemoryOperationStore();
    const saved = modelOperation();
    await store.save(saved);
    saved.ref && Reflect.set(saved.ref, "id", "mutated");
    saved.items[0] && Reflect.set(saved.items[0], "detail", "mutated");
    const loaded = await store.load(saved.operationId);
    assert.equal(loaded?.ref.id, "family");
    assert.equal(loaded?.items[0]?.detail, "bad");
    assert.equal(await store.load("missing"), null);
    await store.remove(saved.operationId);
    assert.equal(await store.load(saved.operationId), null);
  });

  test("rejects every malformed stored record shape", async () => {
    const store = new InMemoryOperationStore();
    const invalid: unknown[] = [
      { ...operation(), ref: null },
      { ...operation(), ref: { kind: "other", id: "x" } },
      { ...operation(), ref: { kind: "extension", id: "" } },
      { ...operation(), ref: { kind: "model", owner: "other", id: "x" } },
      { ...operation(), ref: { kind: "model", owner: "family", id: "x", variant: 1 } },
      { ...operation(), ref: { kind: "model", owner: "family", id: "x", quant: 1 } },
      { ...operation(), state: "other" },
      { ...operation(), items: {} },
      { ...operation(), items: [null] },
      { ...operation(), items: [{ key: "", kind: "extension", state: "active" }] },
      { ...operation(), items: [{ key: "x", kind: "other", state: "active" }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "other" }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "active", integrity: "other" }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "active", path: 1 }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "active", sha256: 1 }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "active", errorCode: 1 }] },
      { ...operation(), items: [{ key: "x", kind: "extension", state: "active", detail: 1 }] },
      { ...operation(), outcome: "other" },
      { ...operation(), startedAt: "1" },
      { ...operation(), finishedAt: "1" },
      { ...operation(), detail: 1 },
    ];
    for (const value of invalid) {
      await rejectsCode(store.save(value as ProvisionOperation), "invalid-record");
    }
    await rejectsCode(store.save(null as unknown as ProvisionOperation), "invalid-request");
    await rejectsCode(store.save({ ...operation(), operationId: "" }), "invalid-request");
    await rejectsCode(store.save({ operationId: "  " } as ProvisionOperation), "invalid-request");
  });

  test("exposes typed store errors with and without causes", () => {
    const cause = new Error("cause");
    assert.equal(new OperationStoreError("io", "failed", cause).cause, cause);
    assert.equal(new OperationStoreError("invalid-request", "plain").cause, undefined);
  });
});

describe("file operation store", () => {
  test("validates its root and operation ids", async () => {
    assert.throws(() => new FileOperationStore(" "), (error: unknown) => error instanceof OperationStoreError && error.code === "invalid-request");
    const store = new FileOperationStore(root());
    await rejectsCode(store.load(" "), "invalid-request");
    await rejectsCode(store.remove(" "), "invalid-request");
  });

  test("persists, reloads, waits for pending saves, and removes", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const saved = modelOperation();
    const saving = store.save(saved);
    const loading = store.load(saved.operationId);
    await Promise.all([saving, loading]);
    assert.deepEqual(await new FileOperationStore(storeRoot).load(saved.operationId), saved);
    assert.equal(existsSync(recordPath(storeRoot, saved.operationId)), true);
    assert.match(readFileSync(recordPath(storeRoot, saved.operationId), "utf8"), /\n$/u);
    await store.remove(saved.operationId);
    assert.equal(await store.load(saved.operationId), null);
    await store.remove(saved.operationId);
  });

  test("rejects missing, non-JSON, mismatched, and non-file records", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const value = operation();
    const path = recordPath(storeRoot, value.operationId);
    writeFileSync(path, "not-json");
    await rejectsCode(store.load(value.operationId), "invalid-record");
    writeFileSync(path, JSON.stringify({ ...value, operationId: "different" }));
    await rejectsCode(store.load(value.operationId), "invalid-record");
    rmSync(path);
    mkdirSync(path);
    await rejectsCode(store.load(value.operationId), "invalid-record");
    rmSync(path, { recursive: true });
    symlinkSync(root(), path, "dir");
    await rejectsCode(store.load(value.operationId), "invalid-record");
  });

  test("rejects parsed records with missing ids and non-object roots", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const path = recordPath(storeRoot, "parsed");
    writeFileSync(path, "null");
    await rejectsCode(store.load("parsed"), "invalid-record");
    writeFileSync(path, JSON.stringify({ ...operation(), operationId: "" }));
    await rejectsCode(store.load("parsed"), "invalid-record");
    writeFileSync(path, JSON.stringify({ ...operation(), operationId: 3 }));
    await rejectsCode(store.load("parsed"), "invalid-record");
  });

  test("reports invalid JSON and validation failures with causes", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const value = operation();
    const path = recordPath(storeRoot, value.operationId);
    writeFileSync(path, "{bad");
    const parseError = await rejectsCode(store.load(value.operationId), "invalid-record");
    assert.notEqual(parseError.cause, undefined);
    writeFileSync(path, JSON.stringify({ ...value, state: "invalid" }));
    await rejectsCode(store.load(value.operationId), "invalid-record");
  });

  test("serializes writes per operation and recovers after a failed write", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const value = operation();
    const path = recordPath(storeRoot, value.operationId);
    mkdirSync(path, { recursive: true });
    const first = store.save(value);
    const second = store.save({ ...value, detail: "second" });
    const results = await Promise.allSettled([first, second]);
    assert.equal(results[0]?.status, "rejected");
    assert.equal(results[1]?.status, "rejected");
    rmSync(path, { recursive: true });
    await store.save({ ...value, detail: "recovered" });
    assert.equal((await store.load(value.operationId))?.detail, "recovered");
    await Promise.all([store.save({ ...value, detail: "third" }), store.save({ ...value, detail: "fourth" })]);
    assert.equal((await store.load(value.operationId))?.detail, "fourth");
  });

  test("surfaces root preparation and save conflicts as io errors", async () => {
    const fileRoot = join(root(), "root-file");
    writeFileSync(fileRoot, "x");
    const store = new FileOperationStore(fileRoot);
    await rejectsCode(store.save(operation()), "io");
    const linkedRootTarget = root();
    const linkedRoot = join(root(), "linked-root");
    symlinkSync(linkedRootTarget, linkedRoot, "dir");
    await rejectsCode(new FileOperationStore(linkedRoot).save(operation()), "io");
    const invalidRoot = new FileOperationStore(`${root()}\0invalid`);
    await rejectsCode(invalidRoot.save(operation()), "io");
    const storeRoot = root();
    const normal = new FileOperationStore(storeRoot);
    const destination = recordPath(storeRoot, operation().operationId);
    mkdirSync(destination, { recursive: true });
    await rejectsCode(normal.save(operation()), "io");
  });

  test("removes files, ignores missing files, and reports unlink conflicts", async () => {
    const storeRoot = root();
    const store = new FileOperationStore(storeRoot);
    const value = operation();
    await store.save(value);
    await store.remove(value.operationId);
    await store.remove(value.operationId);
    mkdirSync(recordPath(storeRoot, value.operationId), { recursive: true });
    await rejectsCode(store.remove(value.operationId), "io");
  });

});

describe("operation-store list (audit E3 boot rehydrate)", () => {
  test("the in-memory store enumerates every row as an isolated copy", async () => {
    const store = new InMemoryOperationStore();
    const one = modelOperation();
    const two = operation({ operationId: "op-two" });
    await store.save(one);
    await store.save(two);
    const rows = await store.list();
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((row) => row.operationId).sort(), ["op-model", "op-two"]);
    rows[0] && Reflect.set(rows[0], "state", "mutated");
    const again = await store.list();
    assert.equal(again.find((row) => row.operationId === "op-model")?.state, "active");
  });

  test("the file store enumerates settled rows and refuses a poison record by name", async () => {
    const store = new FileOperationStore(root());
    await store.save(modelOperation());
    await store.save(operation({ operationId: "op-two" }));
    const rows = await store.list();
    assert.deepEqual(rows.map((row) => row.operationId).sort(), ["op-model", "op-two"]);
    // a poison row blocks the enumeration loud, naming the file
    const { readdirSync, writeFileSync } = await import("node:fs");
    const dir = store.root;
    const poison = readdirSync(dir).find((name) => name.endsWith(".json"));
    assert.ok(poison !== undefined);
    writeFileSync(join(dir, poison), "{ not json");
    await assert.rejects(
      () => store.list(),
      (error: unknown) => error instanceof OperationStoreError &&
        error.code === "invalid-record" &&
        error.message.includes(poison),
    );
  });
});
