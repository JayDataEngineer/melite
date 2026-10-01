import { describe, test } from "vitest";
import assert from "node:assert/strict";
import type {
  SubprocessHandle,
  SubprocessSpawnSpec,
  SubprocessTerminalEnvironment,
  SubprocessTerminalHandle,
  SubprocessTerminalSpawnSpec,
} from "@deepseek-ai/dsh-subprocess";
import { SubprocessRuntime } from "@deepseek-ai/dsh-subprocess";
import { Context } from "@deepseek-ai/cordis";
import { PinnedGitError, SubprocessGitCommandRunner } from "../src/index.ts";

/** The canned child the next spawn answers as. */
interface CannedChild {
  outcome: { exitCode: number | null; signal: NodeJS.Signals | null };
  stdout: string;
  stderr: string;
}

/** A SubprocessRuntime that records spawn specs and answers from the canned child. */
class FakeRuntime extends SubprocessRuntime {
  readonly specs: SubprocessSpawnSpec[] = [];
  private canned: CannedChild = { outcome: { exitCode: 0, signal: null }, stdout: "", stderr: "" };

  constructor() {
    // A bare context satisfies the Service constructor; the fake does no fiber work.
    super(new Context());
  }

  queue(child: CannedChild): void {
    this.canned = child;
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    this.specs.push(spec);
    const child = this.canned;
    const reader = (text: string) => ({ readFrom: () => ({ text, nextOffset: text.length, lossy: false }) });
    return {
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      control: undefined,
      collected: { stdout: reader(child.stdout), stderr: reader(child.stderr) },
      done: Promise.resolve(child.outcome),
      terminate: () => undefined,
      waitForExit: async () => true,
    } satisfies SubprocessHandle;
  }

  resolveExecutable(): Promise<string> {
    throw new Error("not needed by the git runner");
  }

  terminalEnvironment(): Promise<SubprocessTerminalEnvironment> {
    throw new Error("not needed by the git runner");
  }

  spawnTerminal(_spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle> {
    throw new Error("not needed by the git runner");
  }
}

describe("SubprocessGitCommandRunner", () => {
  test("validates output bounds and uses the default bound", () => {
    const runner = new SubprocessGitCommandRunner(new FakeRuntime());
    assert.equal(runner.maxOutputBytes, 1024 * 1024);
    assert.equal(new SubprocessGitCommandRunner(new FakeRuntime(), 12).maxOutputBytes, 12);
    for (const value of [0, -1, 1.5]) {
      assert.throws(
        () => new SubprocessGitCommandRunner(new FakeRuntime(), value),
        (error: unknown) => error instanceof PinnedGitError && error.code === "invalid-request",
      );
    }
  });

  test("spawns git through the seat with explicit cwd, bounds, grace, and signal", async () => {
    const seat = new FakeRuntime();
    seat.queue({ outcome: { exitCode: 0, signal: null }, stdout: "out", stderr: "err" });
    const runner = new SubprocessGitCommandRunner(seat, 32);
    const signal = new AbortController().signal;
    const result = await runner.run(["status", "--short"], { cwd: "/tmp", signal });
    assert.deepEqual(result, { stdout: "out", stderr: "err" });
    const spec = seat.specs[0];
    assert.ok(spec !== undefined);
    assert.deepEqual(spec.argv, ["git", "status", "--short"]);
    assert.equal(spec.cwd, "/tmp");
    assert.equal(spec.graceMs, 5_000);
    assert.equal(spec.signal, signal);
    assert.equal(spec.stdio.stdin, "ignore");
    assert.deepEqual(spec.stdio.stdout, { maxBytes: 32 });
    assert.deepEqual(spec.stdio.stderr, { maxBytes: 32 });
  });

  test("defaults cwd to the process cwd when the caller omits it", async () => {
    const seat = new FakeRuntime();
    const runner = new SubprocessGitCommandRunner(seat);
    await runner.run(["version"]);
    assert.equal(seat.specs[0]?.cwd, process.cwd());
  });

  test("rejects on non-zero exit with the exit code and stderr folded", async () => {
    const seat = new FakeRuntime();
    seat.queue({ outcome: { exitCode: 128, signal: null }, stdout: "", stderr: "fatal: not a git repository\n" });
    const runner = new SubprocessGitCommandRunner(seat);
    await assert.rejects(
      runner.run(["rev-parse", "HEAD"]),
      (error: unknown) =>
        error instanceof Error
        && error.message === "git exited with code 128: fatal: not a git repository"
        && !(error instanceof PinnedGitError),
    );
  });

  test("rejects on signal death naming the signal", async () => {
    const seat = new FakeRuntime();
    seat.queue({ outcome: { exitCode: null, signal: "SIGTERM" }, stdout: "", stderr: "" });
    const runner = new SubprocessGitCommandRunner(seat);
    await assert.rejects(
      runner.run(["fetch"]),
      (error: unknown) => error instanceof Error && error.message === "git died on SIGTERM",
    );
  });
});
