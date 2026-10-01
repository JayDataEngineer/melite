import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileOperationStore, OperationStoreError, type ProvisionOperation } from "../src/index.ts";

const fsMocks = vi.hoisted(() => ({
  lstat: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  realpath: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    lstat: fsMocks.lstat,
    mkdir: fsMocks.mkdir,
    readFile: fsMocks.readFile,
    realpath: fsMocks.realpath,
    rename: fsMocks.rename,
    rm: fsMocks.rm,
    unlink: fsMocks.unlink,
    writeFile: fsMocks.writeFile,
  };
});

// The store's write seam is writeFileAtomic (a node_modules external
// Node loads itself — the fs/promises mock above cannot reach it), so
// failure injection for the save queue rides this boundary instead.
const atomicMocks = vi.hoisted(() => ({ writeFileAtomic: vi.fn() }));

vi.mock("@deepseek-ai/dsh-atomic-write", async () => {
  const actual = await vi.importActual<typeof import("@deepseek-ai/dsh-atomic-write")>("@deepseek-ai/dsh-atomic-write");
  return { ...actual, writeFileAtomic: atomicMocks.writeFileAtomic };
});

type ActualFs = typeof import("node:fs/promises");
let actualFs: ActualFs;
type ActualAtomic = typeof import("@deepseek-ai/dsh-atomic-write");
let actualAtomic: ActualAtomic;
const roots: string[] = [];

beforeEach(async () => {
  actualFs = await vi.importActual<ActualFs>("node:fs/promises");
  actualAtomic = await vi.importActual<ActualAtomic>("@deepseek-ai/dsh-atomic-write");
  fsMocks.lstat.mockImplementation(actualFs.lstat);
  fsMocks.mkdir.mockImplementation(actualFs.mkdir);
  fsMocks.readFile.mockImplementation(actualFs.readFile);
  fsMocks.realpath.mockImplementation(actualFs.realpath);
  fsMocks.rename.mockImplementation(actualFs.rename);
  fsMocks.rm.mockImplementation(actualFs.rm);
  fsMocks.unlink.mockImplementation(actualFs.unlink);
  fsMocks.writeFile.mockImplementation(actualFs.writeFile);
  atomicMocks.writeFileAtomic.mockImplementation(actualAtomic.writeFileAtomic);
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "mfs-"));
  roots.push(value);
  return value;
}

function operation(id = "op-seam"): ProvisionOperation {
  return {
    operationId: id,
    ref: { kind: "extension", id: "pack" },
    state: "active",
    items: [{ key: "extension:pack", kind: "extension", state: "active" }],
    startedAt: 1,
  };
}

function recordPath(rootPath: string, id: string): string {
  return join(rootPath, `${createHash("sha256").update(id).digest("hex")}.json`);
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

describe("operation store filesystem seams", () => {
  test("rejects a non-regular record path", async () => {
    const storeRoot = root();
    const path = recordPath(storeRoot, "other");
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === path) return { isSymbolicLink: () => false, isFile: () => false, isDirectory: () => false };
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await rejectsCode(new FileOperationStore(storeRoot).load("other"), "invalid-record");
  });

  test("surfaces a non-ENOENT lstat failure", async () => {
    const storeRoot = root();
    const path = recordPath(storeRoot, "denied");
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === path) throw Object.assign(new Error("denied"), { code: "EACCES" });
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await assert.rejects(new FileOperationStore(storeRoot).load("denied"));
  });

  test("swallows temporary cleanup failures", async () => {
    const storeRoot = root();
    fsMocks.rm.mockImplementation(async (...args: unknown[]) => {
      if (String(args[0]).includes(".json.part-")) throw new Error("cleanup failed");
      return actualFs.rm(...(args as Parameters<ActualFs["rm"]>));
    });
    const store = new FileOperationStore(storeRoot);
    assert.equal(await store.save(operation("cleanup")), undefined);
  });

  test("continues a queued save after a failed predecessor", async () => {
    const storeRoot = root();
    let firstWrite = true;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let firstStarted!: () => void;
    const firstStartedPromise = new Promise<void>((resolve) => { firstStarted = resolve; });
    atomicMocks.writeFileAtomic.mockImplementation(async (...args: unknown[]) => {
      if (firstWrite) {
        firstWrite = false;
        firstStarted();
        await firstGate;
        throw new Error("first write failed");
      }
      return actualAtomic.writeFileAtomic(...(args as Parameters<ActualAtomic["writeFileAtomic"]>));
    });
    const store = new FileOperationStore(storeRoot);
    const first = store.save(operation("queued"));
    await firstStartedPromise;
    const second = store.save({ ...operation("queued"), detail: "recovered" });
    releaseFirst();
    const results = await Promise.allSettled([first, second]);
    assert.equal(results[0]?.status, "rejected");
    assert.equal(results[1]?.status, "fulfilled");
    assert.equal((await store.load("queued"))?.detail, "recovered");
  });
});
