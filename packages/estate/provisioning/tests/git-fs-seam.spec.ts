import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PinnedGitError,
  PinnedGitExtensionProvider,
  type GitCommandResult,
  type GitCommandRunner,
} from "../src/index.ts";

const fsMocks = vi.hoisted(() => ({
  lstat: vi.fn(),
  mkdir: vi.fn(),
  realpath: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    lstat: fsMocks.lstat,
    mkdir: fsMocks.mkdir,
    realpath: fsMocks.realpath,
    rename: fsMocks.rename,
    rm: fsMocks.rm,
  };
});

type ActualFs = typeof import("node:fs/promises");
let actualFs: ActualFs;
const roots: string[] = [];
const commit = "c".repeat(40);
const repository = "https://github.com/example/pack.git";

beforeEach(async () => {
  actualFs = await vi.importActual<ActualFs>("node:fs/promises");
  fsMocks.lstat.mockImplementation(actualFs.lstat);
  fsMocks.mkdir.mockImplementation(actualFs.mkdir);
  fsMocks.realpath.mockImplementation(actualFs.realpath);
  fsMocks.rename.mockImplementation(actualFs.rename);
  fsMocks.rm.mockImplementation(actualFs.rm);
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-git-fs-"));
  roots.push(value);
  return value;
}

function request(): { id: string; url: string; ref: string } {
  return { id: "pack", url: repository, ref: "v1" };
}

function runner(createTemporary: boolean): GitCommandRunner {
  return {
    run: async (args): Promise<GitCommandResult> => {
      if (args[0] === "init" && createTemporary) {
        const path = args.at(-1);
        assert.ok(path);
        await actualFs.mkdir(path, { recursive: true });
      }
      return { stdout: args.includes("rev-parse") ? commit : "", stderr: "" };
    },
  };
}

async function rejectsCode(promise: Promise<unknown>, code: string): Promise<PinnedGitError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof PinnedGitError);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected ${code}`);
}

describe("pinned git filesystem seams", () => {
  test("surfaces a non-ENOENT lstat failure", async () => {
    const store = root();
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (String(args[0]).endsWith("/pack")) throw Object.assign(new Error("denied"), { code: "EACCES" });
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(false) });
    await assert.rejects(provider.install(request()));
  });

  test("rejects a root that changes kind after creation", async () => {
    const store = root();
    const realRoot = await actualFs.realpath(store);
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === realRoot) return { isSymbolicLink: () => false, isFile: () => false, isDirectory: () => false };
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(false) });
    await rejectsCode(provider.install(request()), "invalid-request");
  });

  test("detects a destination that changes before the second check", async () => {
    const store = root();
    let destinationChecks = 0;
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === join(store, "pack")) {
        destinationChecks += 1;
        if (destinationChecks > 1) return { isSymbolicLink: () => false, isFile: () => true, isDirectory: () => false };
      }
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(true) });
    await rejectsCode(provider.install(request()), "ref-mismatch");
  });

  test("swallows temporary cleanup failures", async () => {
    const store = root();
    fsMocks.rm.mockImplementation(async (...args: unknown[]) => {
      if (String(args[0]).includes(".pack.part-")) throw new Error("cleanup failed");
      return actualFs.rm(...(args as Parameters<ActualFs["rm"]>));
    });
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(true) });
    assert.equal((await provider.install(request())).installed, true);
  });

  test("rejects a destination with another filesystem kind", async () => {
    const store = root();
    fsMocks.lstat.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === join(store, "pack")) return { isSymbolicLink: () => false, isFile: () => false, isDirectory: () => false };
      return actualFs.lstat(...(args as Parameters<ActualFs["lstat"]>));
    });
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(false) });
    await rejectsCode(provider.install(request()), "ref-mismatch");
  });

  test("still rejects a symlink root through the normal path", async () => {
    const target = root();
    const store = join(root(), "root-link");
    symlinkSync(target, store, "dir");
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: runner(false) });
    await assert.rejects(provider.install(request()));
  });
});
