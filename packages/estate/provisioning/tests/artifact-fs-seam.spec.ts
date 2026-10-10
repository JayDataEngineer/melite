import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ArtifactInput } from "../src/index.ts";
import { ProvisioningError, writeVerifiedArtifact } from "../src/index.ts";

const fsMocks = vi.hoisted(() => ({
  lstat: vi.fn(),
  mkdir: vi.fn(),
  open: vi.fn(),
  realpath: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    lstat: fsMocks.lstat,
    mkdir: fsMocks.mkdir,
    open: fsMocks.open,
    realpath: fsMocks.realpath,
    rename: fsMocks.rename,
    rm: fsMocks.rm,
    stat: fsMocks.stat,
  };
});

type ActualFs = typeof import("node:fs/promises");
type Handle = Awaited<ReturnType<ActualFs["open"]>>;

let actualFs: ActualFs;
const roots: string[] = [];

beforeEach(async () => {
  actualFs = await vi.importActual<ActualFs>("node:fs/promises");
  fsMocks.lstat.mockImplementation(actualFs.lstat);
  fsMocks.mkdir.mockImplementation(actualFs.mkdir);
  fsMocks.open.mockImplementation(actualFs.open);
  fsMocks.realpath.mockImplementation(actualFs.realpath);
  fsMocks.rename.mockImplementation(actualFs.rename);
  fsMocks.rm.mockImplementation(actualFs.rm);
  fsMocks.stat.mockImplementation(actualFs.stat);
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-fs-seam-"));
  roots.push(value);
  return value;
}

function bytes(): Buffer {
  return Buffer.from("filesystem-seam");
}

function source(value: Uint8Array): ArtifactInput {
  return {
    async *[Symbol.asyncIterator]() {
      yield value;
    },
  };
}

async function rejectsCode(promise: Promise<unknown>, code: string): Promise<ProvisioningError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ProvisioningError);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected ${code}`);
}

function proxied(handle: Handle, overrides: Record<string, unknown>): Handle {
  return new Proxy(handle, {
    get(target, property): unknown {
      if (typeof property === "string" && property in overrides) return overrides[property];
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

describe("verified artifact filesystem seams", () => {
  test("surfaces a zero-progress write", async () => {
    const store = root();
    const destination = join(store, "zero.bin");
    fsMocks.open.mockImplementation(async (...args: unknown[]) => {
      const handle = await actualFs.open(...(args as Parameters<ActualFs["open"]>));
      if (String(args[0]).endsWith(".part-op-zero") && args[1] === "wx") {
        return proxied(handle, { write: async () => ({ bytesWritten: 0 }) });
      }
      return handle;
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "zero.bin",
      operationId: "op-zero",
      source: source(bytes()),
    }), "write-failed");
  });

  test("continues cleanup when handle close rejects", async () => {
    const store = root();
    const destination = join(store, "close.bin");
    fsMocks.open.mockImplementation(async (...args: unknown[]) => {
      const handle = await actualFs.open(...(args as Parameters<ActualFs["open"]>));
      if (String(args[0]).endsWith(".part-op-close") && args[1] === "wx") {
        return proxied(handle, { close: async () => { throw new Error("close failed"); } });
      }
      return handle;
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "close.bin",
      operationId: "op-close",
      source: source(bytes()),
    }), "write-failed");
  });

  test("swallows cleanup removal failures", async () => {
    const store = root();
    const destination = join(store, "cleanup.bin");
    const temporary = `${destination}.part-op-cleanup`;
    let removalCount = 0;
    fsMocks.rm.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === temporary) {
        removalCount += 1;
        if (removalCount > 1) throw new Error("cleanup failed");
      }
      return actualFs.rm(...(args as Parameters<ActualFs["rm"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "cleanup.bin",
      expectedSha256: "0".repeat(64),
      operationId: "op-cleanup",
      source: source(bytes()),
    }), "hash-mismatch");
  });

  test("detects a destination that is no longer a file", async () => {
    const store = root();
    const destination = join(store, "kind.bin");
    let destinationChecks = 0;
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === destination) {
        destinationChecks += 1;
        if (destinationChecks > 2) return { isSymbolicLink: () => false, isFile: () => false, isDirectory: () => false };
      }
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "kind.bin",
      operationId: "op-kind",
      source: source(bytes()),
    }), "landing-failed");
  });

  test("detects a destination hash replacement", async () => {
    const store = root();
    const destination = join(store, "replaced.bin");
    const replacement = join(store, "replacement.bin");
    await actualFs.writeFile(replacement, "replacement bytes");
    const expected = createHash("sha256").update(bytes()).digest("hex");
    fsMocks.open.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === destination && args[1] === "r") return actualFs.open(replacement, "r");
      return actualFs.open(...(args as Parameters<ActualFs["open"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "replaced.bin",
      expectedSha256: expected,
      operationId: "op-replaced",
      source: source(bytes()),
    }), "landing-failed");
  });

  test("detects a destination size replacement", async () => {
    const store = root();
    const destination = join(store, "resized.bin");
    fsMocks.stat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === destination) return { size: 999 };
      return actualFs.stat(...(args as Parameters<ActualFs["stat"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "resized.bin",
      sizeBytes: bytes().length,
      operationId: "op-resized",
      source: source(bytes()),
    }), "landing-failed");
  });

  test("rejects a non-file destination kind", async () => {
    const store = root();
    const destination = join(store, "other.bin");
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === destination) return { isSymbolicLink: () => false, isFile: () => false, isDirectory: () => false };
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "other.bin",
      operationId: "op-other",
      source: source(bytes()),
    }), "invalid-path");
  });

  test("detects a parent that resolves outside the root", async () => {
    const store = root();
    const outside = root();
    const parent = join(store, "nested");
    fsMocks.realpath.mockImplementation(async (...args: unknown[]) => args[0] === parent ? outside : actualFs.realpath(...(args as Parameters<ActualFs["realpath"]>)));
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "nested/outside.bin",
      operationId: "op-outside",
      source: source(bytes()),
    }), "invalid-path");
  });

  test("detects a component replaced before and after directory creation", async () => {
    const store = root();
    const parent = join(store, "created");
    let checks = 0;
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === parent) {
        checks += 1;
        if (checks === 2) return { isSymbolicLink: () => true, isFile: () => false, isDirectory: () => false };
      }
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "created/file.bin",
      operationId: "op-created-link",
      source: source(bytes()),
    }), "invalid-path");
    const secondStore = root();
    const secondParent = join(secondStore, "asserted");
    let secondChecks = 0;
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === secondParent) {
        secondChecks += 1;
        if (secondChecks > 2) return { isSymbolicLink: () => false, isFile: () => true, isDirectory: () => false };
      }
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    await rejectsCode(writeVerifiedArtifact({
      root: secondStore,
      relativePath: "asserted/file.bin",
      operationId: "op-asserted-file",
      source: source(bytes()),
    }), "invalid-path");
  });
});

describe("the .part reaper (audit K-4)", () => {
  test("a stale part unlinks; a fresh part and a real artifact survive; the walk reaches nested dirs", async () => {
    const { VerifiedArtifactWriter } = await import("../src/artifact-writer.ts");
    const store = root();
    const stale = join(store, "checkpoints", "big.safetensors.part-op-dead");
    const fresh = join(store, "loras", "small.safetensors.part-op-live");
    const real = join(store, "checkpoints", "landed.bin");
    mkdirSync(dirname(stale), { recursive: true });
    mkdirSync(dirname(fresh), { recursive: true });
    writeFileSync(stale, "half");
    writeFileSync(fresh, "half");
    writeFileSync(real, "whole");
    // backdate only the dead one past the staleness bound
    const dead = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    utimesSync(stale, dead, dead);
    const writer = new VerifiedArtifactWriter(store);
    const reaped = await writer.reapStaleParts();
    assert.equal(reaped, 1);
    assert.equal(existsSync(stale), false, "the stale part is gone");
    assert.equal(existsSync(fresh), true, "the live download's part survives");
    assert.equal(existsSync(real), true, "the landed artifact survives");
  });

  test("a short bound reaps an aged part past the default day (the operator's hard sweep)", async () => {
    const { VerifiedArtifactWriter, PART_STALE_MS } = await import("../src/artifact-writer.ts");
    assert.equal(PART_STALE_MS, 24 * 60 * 60 * 1000, "the staleness bound is a day");
    const store = root();
    const part = join(store, "x.bin.part-op-x");
    writeFileSync(part, "half");
    const aged = new Date(Date.now() - 5 * 60 * 60 * 1000);
    utimesSync(part, aged, aged);
    // the default bound keeps it (5h old < 1 day); the operator's
    // shorter bound takes it
    const writer = new VerifiedArtifactWriter(store);
    assert.equal(await writer.reapStaleParts(), 0);
    assert.equal(existsSync(part), true);
    const reaped = await writer.reapStaleParts({ olderThanMs: 60 * 60 * 1000 });
    assert.equal(reaped, 1);
    assert.equal(existsSync(part), false);
  });
});
