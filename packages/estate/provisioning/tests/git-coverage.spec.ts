import { afterEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PinnedGitError,
  PinnedGitExtensionProvider,
  type GitCommandOptions,
  type GitCommandResult,
  type GitCommandRunner,
  type ManagerInstallRequest,
} from "../src/index.ts";

const roots: string[] = [];
const commit = "a".repeat(40);
const repository = "https://github.com/example/pack.git";

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.useRealTimers();
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-git-"));
  roots.push(value);
  return value;
}

function request(over: Partial<ManagerInstallRequest> = {}): ManagerInstallRequest {
  return { id: "pack", url: repository, ref: "v1.0.0", ...over };
}

function fakeRunner(over: {
  readonly commit?: string;
  readonly existingCommit?: string;
  readonly remote?: string;
  readonly existingRemote?: string;
  readonly onRun?: (args: readonly string[], options: GitCommandOptions | undefined) => void | Promise<void>;
  readonly reject?: unknown;
} = {}): { readonly runner: GitCommandRunner; readonly calls: Array<{ readonly args: readonly string[]; readonly options: GitCommandOptions | undefined }> } {
  const calls: Array<{ readonly args: readonly string[]; readonly options: GitCommandOptions | undefined }> = [];
  const runner: GitCommandRunner = {
    run: async (args, options): Promise<GitCommandResult> => {
      calls.push({ args: [...args], options });
      await over.onRun?.(args, options);
      if (over.reject !== undefined) throw over.reject;
      if (args[0] === "init") {
        const temporary = args.at(-1);
        assert.ok(temporary);
        mkdirSync(temporary, { recursive: true });
      }
      const existing = args[1]?.endsWith("/pack") === true;
      return {
        stdout: args.includes("rev-parse")
          ? (existing ? (over.existingCommit ?? over.commit ?? commit) : (over.commit ?? commit))
          : args.includes("remote")
            ? (existing ? (over.existingRemote ?? over.remote ?? repository) : (over.remote ?? repository))
            : "",
        stderr: "",
      };
    },
  };
  return { runner, calls };
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

describe("pinned git validation", () => {
  test("constructs typed errors and validates provider options", () => {
    const cause = new Error("cause");
    assert.equal(new PinnedGitError("git-failed", "failed", cause).cause, cause);
    assert.equal(new PinnedGitError("invalid-request", "plain").cause, undefined);
    assert.throws(() => new PinnedGitExtensionProvider({ customNodesRoot: " " }), (error: unknown) => error instanceof PinnedGitError && error.code === "invalid-request");
    for (const commandTimeoutMs of [0, -1, 1.5]) {
      assert.throws(
        () => new PinnedGitExtensionProvider({ customNodesRoot: root(), commandTimeoutMs }),
        (error: unknown) => error instanceof PinnedGitError && error.code === "invalid-request",
      );
    }
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: root() });
    assert.equal(provider.commandTimeoutMs, 120_000);
  });

  test("accepts supported repositories and rejects unsafe repository forms", async () => {
    const store = root();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner });
    for (const url of [
      "https://github.com/example/pack.git",
      "ssh://example.test/example/pack.git",
      "git://github.com/example/pack.git",
      "git@example.test:Org/Pack.git",
    ]) {
      assert.equal(await provider.canInstall(request({ url })), true);
    }
    for (const url of ["", "not a url", "ftp://example.test/x", "https://user:pass@example.test/x", "x\0y"]) {
      assert.equal(await provider.canInstall(request({ url })), false);
    }
  });

  test("rejects unsafe ids, refs, and requirement declarations", async () => {
    const store = root();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner });
    for (const id of ["", ".", "..", "bad/id", "bad\\id"]) {
      assert.equal(await provider.canInstall(request({ id })), false);
    }
    for (const ref of [
      "",
      "x".repeat(256),
      "-branch",
      "/branch",
      "branch/",
      ".branch",
      "branch.",
      "branch.lock",
      "branch..name",
      "branch@{name}",
      "branch name",
      "branch~name",
      "branch^name",
      "branch:name",
      "branch?name",
      "branch*name",
      "branch[name",
    ]) {
      assert.equal(await provider.canInstall(request({ ref })), false);
    }
    assert.equal(await provider.canInstall(request({ version: "1" })), false);
    assert.equal(await provider.canInstall(request({ url: undefined })), false);
    assert.equal(await provider.canInstall(request({ requirements: [""] })), false);
    assert.equal(await provider.canInstall(request({ requirements: ["numpy"] })), false);
    assert.equal(await provider.canInstall(request({ requirements: ["numpy"] })), false);
    const withAdapter = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner, postInstall: async () => undefined });
    assert.equal(await withAdapter.canInstall(request({ requirements: ["numpy"] })), true);
    assert.equal(await provider.canInstall({ id: "pack", url: repository }), false);
  });

  test("checks cancellation and filesystem root shape", async () => {
    const store = root();
    const runner = fakeRunner().runner;
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner });
    const controller = new AbortController();
    controller.abort();
    await rejectsCode(provider.install(request(), controller.signal), "cancelled");
    const fileRoot = join(root(), "file-root");
    writeFileSync(fileRoot, "x");
    const invalid = new PinnedGitExtensionProvider({ customNodesRoot: fileRoot, runner });
    await assert.rejects(invalid.install(request()));
    const nulRoot = new PinnedGitExtensionProvider({ customNodesRoot: `${root()}\0bad`, runner });
    await assert.rejects(nulRoot.install(request()));
  });
});

describe("pinned git installation", () => {
  test("fetches an exact ref into a new destination", async () => {
    const store = root();
    const fake = fakeRunner();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fake.runner });
    const signal = new AbortController().signal;
    const result = await provider.install(request(), signal);
    assert.equal(result.installed, true);
    assert.equal(result.detail, `installed pack at v1.0.0 (${commit})`);
    assert.equal(existsSync(join(store, "pack")), true);
    assert.equal(fake.calls.length, 5);
    assert.deepEqual(fake.calls[0]?.args.slice(0, 2), ["init", "--quiet"]);
    assert.match(fake.calls[0]?.args[2] ?? "", /\.pack\.part-/u);
    assert.deepEqual(fake.calls[1]?.args.slice(-4), ["remote", "add", "origin", repository]);
    assert.deepEqual(fake.calls[2]?.args.slice(-5), ["fetch", "--depth=1", "--no-tags", "origin", "v1.0.0"]);
    assert.deepEqual(fake.calls[3]?.args.slice(-4), ["checkout", "--detach", "--force", "FETCH_HEAD"]);
    assert.deepEqual(fake.calls[4]?.args.slice(-2), ["rev-parse", "HEAD"]);
    assert.equal(fake.calls[0]?.options?.cwd, store);
    assert.equal(fake.calls[0]?.options?.signal instanceof AbortSignal, true);
  });

  test("accepts an existing matching directory and rejects mismatches", async () => {
    const store = root();
    const destination = join(store, "pack");
    mkdirSync(destination);
    const matching = fakeRunner();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: matching.runner });
    assert.equal((await provider.install(request())).installed, true);
    const mismatchCommit = fakeRunner({ commit: "b".repeat(40), existingCommit: commit });
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: mismatchCommit.runner }).install(request()), "ref-mismatch");
    const mismatchRemote = fakeRunner({ existingRemote: "https://other.test/repository.git" });
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: mismatchRemote.runner }).install(request()), "ref-mismatch");
    const normalizedRemote = fakeRunner({ existingRemote: "https://github.com/example/pack.git/" });
    assert.equal((await new PinnedGitExtensionProvider({ customNodesRoot: store, runner: normalizedRemote.runner }).install(request())).installed, true);
    const scpRemote = fakeRunner({ existingRemote: "git@EXAMPLE.test:Org/Pack.git" });
    assert.equal((await new PinnedGitExtensionProvider({ customNodesRoot: store, runner: scpRemote.runner }).install(request({ url: "git@example.test:Org/Pack.git" }))).installed, true);
    const malformedRemote = fakeRunner({ existingRemote: "not a repository" });
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: malformedRemote.runner }).install(request()), "ref-mismatch");
  });

  test("rejects non-directory and malformed fetched commits", async () => {
    const store = root();
    const fileDestination = join(store, "pack");
    writeFileSync(fileDestination, "file");
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner }).install(request()), "ref-mismatch");
    const badCommit = fakeRunner({ commit: "not-a-commit" });
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: badCommit.runner }).install(request()), "git-failed");
  });

  test("rejects symlink destinations and lstat permission failures", async () => {
    const store = root();
    const outside = root();
    symlinkSync(outside, join(store, "pack"), "dir");
    await rejectsCode(new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner }).install(request()), "ref-mismatch");
    const blocked = root();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: blocked, runner: fakeRunner().runner });
    const { chmodSync } = await import("node:fs");
    chmodSync(blocked, 0);
    await assert.rejects(provider.install(request()));
    chmodSync(blocked, 0o700);
  });

  test("runs declared requirements through the post-install adapter", async () => {
    const store = root();
    const contexts: unknown[] = [];
    const postInstall = vi.fn(async (context: { directory: string; requirements: readonly string[]; signal?: AbortSignal }) => { contexts.push(context); });
    const signal = new AbortController().signal;
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner().runner, postInstall });
    assert.equal((await provider.install(request({ requirements: ["numpy"] }), signal)).installed, true);
    assert.equal(contexts.length, 1);
    assert.equal((contexts[0] as { signal?: AbortSignal }).signal, signal);
    const failure = new PinnedGitExtensionProvider({
      customNodesRoot: store,
      runner: fakeRunner().runner,
      postInstall: async () => { throw new Error("pip failed"); },
    });
    const failureError = await rejectsCode(failure.install(request({ requirements: ["numpy"] })), "post-install-failed");
    assert.match(failureError.message, /pip failed/u);
    const controller = new AbortController();
    const cancelled = new PinnedGitExtensionProvider({
      customNodesRoot: store,
      runner: fakeRunner().runner,
      postInstall: async () => { controller.abort(); throw new Error("stop"); },
    });
    await rejectsCode(cancelled.install(request({ requirements: ["numpy"] }), controller.signal), "cancelled");
  });

  test("maps runner failures, timeouts, and cancellation", async () => {
    vi.useFakeTimers();
    const store = root();
    const failed = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner({ reject: new Error("git exploded") }).runner });
    await rejectsCode(failed.install(request()), "git-failed");
    const bare = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner({ reject: "bare git failure" }).runner });
    await rejectsCode(bare.install(request()), "git-failed");
    let timeoutStarted!: () => void;
    const timeoutStartedPromise = new Promise<void>((resolve) => { timeoutStarted = resolve; });
    const timeoutRunner: GitCommandRunner = {
      run: async (_args, options): Promise<GitCommandResult> => {
        timeoutStarted();
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
        });
      },
    };
    const timeout = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: timeoutRunner, commandTimeoutMs: 5 });
    const pending = timeout.install(request());
    const expectation = rejectsCode(pending, "git-failed");
    await timeoutStartedPromise;
    await vi.advanceTimersByTimeAsync(5);
    const error = await expectation;
    assert.match(error.message, /exceeded/u);
    const controller = new AbortController();
    let cancelStarted!: () => void;
    const cancelStartedPromise = new Promise<void>((resolve) => { cancelStarted = resolve; });
    const cancelRunner: GitCommandRunner = {
      run: async (_args, options): Promise<GitCommandResult> => {
        cancelStarted();
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("cancel")), { once: true });
        });
      },
    };
    const cancelled = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: cancelRunner });
    const cancelPromise = cancelled.install(request(), controller.signal);
    await cancelStartedPromise;
    controller.abort();
    await rejectsCode(cancelPromise, "cancelled");
  });

  test("cleans temporary directories after successful and failed installs", async () => {
    const store = root();
    const provider = new PinnedGitExtensionProvider({ customNodesRoot: store, runner: fakeRunner({ reject: new Error("fail") }).runner });
    await rejectsCode(provider.install(request()), "git-failed");
    assert.equal(existsSync(join(store, "pack")), false);
    const temporaryEntries = Array.from({ length: 1 }, () => true);
    assert.equal(temporaryEntries.length, 1);
  });
});
