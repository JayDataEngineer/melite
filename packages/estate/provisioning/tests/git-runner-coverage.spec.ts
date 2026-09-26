import { afterEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import { NodeGitCommandRunner, PinnedGitError } from "../src/index.ts";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ execFile: execFileMock }));

afterEach(() => {
  execFileMock.mockReset();
});

describe("NodeGitCommandRunner", () => {
  test("validates output bounds and uses the default bound", () => {
    const runner = new NodeGitCommandRunner();
    assert.equal(runner.maxOutputBytes, 1024 * 1024);
    assert.equal(new NodeGitCommandRunner(12).maxOutputBytes, 12);
    for (const value of [0, -1, 1.5]) {
      assert.throws(
        () => new NodeGitCommandRunner(value),
        (error: unknown) => error instanceof PinnedGitError && error.code === "invalid-request",
      );
    }
  });

  test("passes default and explicit process options and converts output", async () => {
    execFileMock.mockImplementation((...values: unknown[]) => {
      const callback = values.at(-1) as (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void;
      callback(null, Buffer.from("out"), Buffer.from("err"));
      return undefined;
    });
    const runner = new NodeGitCommandRunner(32);
    const signal = new AbortController().signal;
    const result = await runner.run(["status", "--short"], { cwd: "/tmp", signal });
    assert.deepEqual(result, { stdout: "out", stderr: "err" });
    assert.equal(execFileMock.mock.calls[0]?.[0], "git");
    assert.deepEqual(execFileMock.mock.calls[0]?.[1], ["status", "--short"]);
    assert.deepEqual(execFileMock.mock.calls[0]?.[2], {
      cwd: "/tmp",
      encoding: "utf8",
      maxBuffer: 32,
      signal,
      windowsHide: true,
    });
    await runner.run(["version"]);
    const defaultOptions = execFileMock.mock.calls[1]?.[2] as Record<string, unknown>;
    assert.equal(defaultOptions.cwd, undefined);
    assert.equal(defaultOptions.signal, undefined);
  });

  test("preserves process errors and supports string output", async () => {
    const failure = new Error("process failed");
    execFileMock.mockImplementationOnce((...values: unknown[]) => {
      const callback = values.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(failure, "ignored", "ignored");
      return undefined;
    });
    const runner = new NodeGitCommandRunner();
    await assert.rejects(runner.run(["status"]), (error: unknown) => error === failure);
    execFileMock.mockImplementationOnce((...values: unknown[]) => {
      const callback = values.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, "stdout", "stderr");
      return undefined;
    });
    assert.deepEqual(await runner.run(["status"]), { stdout: "stdout", stderr: "stderr" });
  });
});
