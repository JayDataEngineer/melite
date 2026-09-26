import { afterEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
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
  ArtifactInput,
  ProvisioningError,
  VerifiedArtifactWriter,
  isValidSha256,
  newOperationId,
  resolveConfinedPath,
  sha256File,
  writeVerifiedArtifact,
} from "../src/index.ts";

const roots: string[] = [];
const bytes = Buffer.from("artifact-coverage-fixture");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.useRealTimers();
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-artifact-"));
  roots.push(value);
  return value;
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function asyncSource(chunks: readonly Uint8Array[]): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

function syncSource(chunks: readonly Uint8Array[]): Iterable<Uint8Array> {
  return {
    *[Symbol.iterator]() {
      yield* chunks;
    },
  };
}

function streamSource(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller): void {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function trackedAsyncSource(options: {
  readonly chunks?: readonly Uint8Array[];
  readonly reject?: unknown;
  readonly returnError?: unknown;
  readonly hasReturn?: boolean;
}): { readonly source: ArtifactInput; readonly returned: () => number; readonly next: ReturnType<typeof vi.fn> } {
  let returned = 0;
  let index = 0;
  const next = vi.fn(async (): Promise<IteratorResult<Uint8Array>> => {
    if (options.reject !== undefined) throw options.reject;
    const chunk = options.chunks?.[index++];
    return chunk === undefined ? { done: true, value: undefined } : { done: false, value: chunk };
  });
  const iterator: Record<string, unknown> = { next };
  if (options.hasReturn !== false) {
    iterator.return = vi.fn(async (): Promise<IteratorResult<Uint8Array>> => {
      returned += 1;
      if (options.returnError !== undefined) throw options.returnError;
      return { done: true, value: undefined };
    });
  }
  iterator[Symbol.asyncIterator] = function (): AsyncIterableIterator<Uint8Array> {
    return this as AsyncIterableIterator<Uint8Array>;
  };
  return {
    source: { [Symbol.asyncIterator]: () => iterator as AsyncIterableIterator<Uint8Array> } as unknown as ArtifactInput,
    returned: () => returned,
    next,
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

async function rejectsError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  throw new Error("expected rejection");
}

describe("artifact validation helpers", () => {
  test("validates digests and creates safe operation ids", () => {
    assert.equal(isValidSha256(` ${digest(bytes).toUpperCase()} `), true);
    assert.equal(isValidSha256("0".repeat(63)), false);
    assert.equal(isValidSha256(`z${"0".repeat(63)}`), false);
    assert.match(newOperationId(), /^[0-9a-f]{32}$/u);
  });

  test("rejects every unsafe confined path form", () => {
    const store = root();
    assert.throws(() => resolveConfinedPath(" ", "file"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    assert.throws(() => resolveConfinedPath(store, " "), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    assert.throws(() => resolveConfinedPath(store, "a\0b"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    assert.throws(() => resolveConfinedPath(store, "a\\b"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    assert.throws(() => resolveConfinedPath(store, "/file"), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    for (const path of ["a//b", "a/./b", "a/../b", "../b"]) {
      assert.throws(() => resolveConfinedPath(store, path), (error: unknown) => error instanceof ProvisioningError && error.code === "invalid-path");
    }
    assert.equal(resolveConfinedPath(store, "nested/file.bin"), join(store, "nested", "file.bin"));
  });

  test("reports typed errors with and without causes", () => {
    const cause = new Error("cause");
    const withCause = new ProvisioningError("write-failed", "failed", cause);
    assert.equal(withCause.cause, cause);
    const plain = new ProvisioningError("source-invalid", "plain");
    assert.equal(plain.cause, undefined);
  });
});

describe("artifact source and landing behavior", () => {
  test("writes declared, unverified, async, sync, stream, and empty-chunk sources", async () => {
    const store = root();
    const cases: Array<{ readonly name: string; readonly source: ArtifactInput }> = [
      { name: "async.bin", source: asyncSource([bytes.subarray(0, 2), new Uint8Array(0), bytes.subarray(2)]) },
      { name: "sync.bin", source: syncSource([bytes]) },
      { name: "stream.bin", source: streamSource([bytes]) },
    ];
    for (const [index, item] of cases.entries()) {
      const result = await writeVerifiedArtifact({
        root: store,
        relativePath: item.name,
        expectedSha256: index === 1 ? undefined : digest(bytes),
        sizeBytes: bytes.length,
        operationId: `op-${index}`,
        source: item.source,
      });
      assert.equal(result.sha256, digest(bytes));
      assert.equal(result.sizeBytes, bytes.length);
      assert.equal(result.integrity, index === 1 ? "operator-unverified" : "declared-sha256");
      assert.deepEqual(readFileSync(result.path), bytes);
    }
  });

  test("supports sync iterators with return and reader-only streams", async () => {
    const store = root();
    let returned = 0;
    let iterableIndex = 0;
    const iterable: Iterable<Uint8Array> = {
      [Symbol.iterator]: () => ({
        next: (): IteratorResult<Uint8Array> => iterableIndex++ === 0 ? { done: false, value: bytes } : { done: true, value: undefined },
        return: (): IteratorResult<Uint8Array> => {
          returned += 1;
          return { done: true, value: undefined };
        },
      }),
    };
    let index = 0;
    const syncIterable: Iterable<Uint8Array> = {
      [Symbol.iterator]: () => ({
        next: (): IteratorResult<Uint8Array> => index++ === 0 ? { done: false, value: bytes } : { done: true, value: undefined },
        return: (): IteratorResult<Uint8Array> => ({ done: true, value: undefined }),
      }),
    };
    await writeVerifiedArtifact({ root: store, relativePath: "sync-return.bin", operationId: "op-sync-return", source: iterable });
    assert.equal(returned, 1);
    await writeVerifiedArtifact({ root: store, relativePath: "sync-next.bin", operationId: "op-sync-next", source: syncIterable });
    let noReturnIndex = 0;
    const noReturnIterable: Iterable<Uint8Array> = {
      [Symbol.iterator]: () => ({
        next: (): IteratorResult<Uint8Array> => noReturnIndex++ === 0 ? { done: false, value: bytes } : { done: true, value: undefined },
      }),
    };
    await writeVerifiedArtifact({ root: store, relativePath: "sync-no-return.bin", operationId: "op-sync-no-return", source: noReturnIterable });
    const reader = {
      read: vi.fn(async (): Promise<IteratorResult<Uint8Array>> => index++ === 0 ? { done: false, value: bytes } : { done: true, value: undefined }),
      cancel: vi.fn(async (): Promise<void> => undefined),
    };
    const readerOnly = { getReader: () => reader } as unknown as ArtifactInput;
    await writeVerifiedArtifact({ root: store, relativePath: "reader.bin", operationId: "op-reader", source: readerOnly });
    assert.equal(reader.cancel.mock.calls.length, 1);
  });

  test("covers signal-wrapped iterator completion and rejection", async () => {
    const store = root();
    await writeVerifiedArtifact({
      root: store,
      relativePath: "signal-success.bin",
      operationId: "op-signal-success",
      source: asyncSource([bytes]),
    }, new AbortController().signal);
    const errorSource = trackedAsyncSource({ reject: new Error("signal source") });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "signal-error.bin",
      operationId: "op-signal-error",
      source: errorSource.source,
    }, new AbortController().signal), "write-failed");
  });

  test("supports an async source without an underlying return method", async () => {
    const store = root();
    const tracked = trackedAsyncSource({ chunks: [bytes], hasReturn: false });
    await writeVerifiedArtifact({
      root: store,
      relativePath: "no-return.bin",
      operationId: "op-no-return",
      source: tracked.source,
    });
    assert.equal(tracked.returned(), 0);
  });

  test("rejects invalid source objects and non-byte chunks", async () => {
    const store = root();
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "invalid.bin",
      operationId: "op-invalid-source",
      source: {} as ArtifactInput,
    }), "source-invalid");
    const badChunk = trackedAsyncSource({ chunks: [Buffer.from("x")] });
    badChunk.source = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: false, value: "not bytes" }),
        return: async () => ({ done: true, value: undefined }),
        [Symbol.asyncIterator]() { return this; },
      }),
    } as unknown as ArtifactInput;
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "bad-chunk.bin",
      operationId: "op-bad-chunk",
      source: badChunk.source,
    }), "source-invalid");
  });

  test("propagates source failures and closes iterators", async () => {
    const store = root();
    const errorSource = trackedAsyncSource({ reject: new Error("source failed") });
    const error = await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "source-error.bin",
      operationId: "op-source-error",
      source: errorSource.source,
    }), "write-failed");
    assert.match(error.message, /source failed/u);
    assert.equal(errorSource.returned(), 1);
    const bareSource = trackedAsyncSource({ reject: "bare source failure" });
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "bare-source-error.bin",
      operationId: "op-bare-source-error",
      source: bareSource.source,
    }), "write-failed");
    const returnSource = trackedAsyncSource({ chunks: [bytes], returnError: new Error("close failed") });
    await writeVerifiedArtifact({
      root: store,
      relativePath: "return-error.bin",
      operationId: "op-return-error",
      source: returnSource.source,
    });
    assert.equal(returnSource.returned(), 1);
  });

  test("cancels before reading, during a pending read, and after a chunk", async () => {
    const store = root();
    const before = new AbortController();
    before.abort();
    const beforeError = await rejectsError(writeVerifiedArtifact({
      root: store,
      relativePath: "before.bin",
      operationId: "op-before",
      source: asyncSource([bytes]),
    }, before.signal));
    assert.equal(beforeError.name, "AbortError");
    const reasonController = new AbortController();
    reasonController.abort("stop");
    const reasonError = await rejectsError(writeVerifiedArtifact({
      root: store,
      relativePath: "reason-before.bin",
      operationId: "op-reason-before",
      source: asyncSource([bytes]),
    }, reasonController.signal));
    assert.equal(reasonError.name, "AbortError");
    const duringController = new AbortController();
    let started!: () => void;
    const startedPromise = new Promise<void>((resolve) => { started = resolve; });
    let resolveNext!: (value: IteratorResult<Uint8Array>) => void;
    const pending = new Promise<IteratorResult<Uint8Array>>((resolve) => { resolveNext = resolve; });
    const source: ArtifactInput = {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<Uint8Array>> => {
          started();
          return pending;
        },
        return: async () => ({ done: true, value: undefined }),
        [Symbol.asyncIterator]() { return this; },
      }),
    } as unknown as ArtifactInput;
    const during = writeVerifiedArtifact({
      root: store,
      relativePath: "during.bin",
      operationId: "op-during",
      source,
    }, duringController.signal);
    await startedPromise;
    duringController.abort();
    resolveNext({ done: true, value: undefined });
    await rejectsCode(during, "cancelled");
    const returnFailureController = new AbortController();
    let returnFailureStarted!: () => void;
    const returnFailureStartedPromise = new Promise<void>((resolve) => { returnFailureStarted = resolve; });
    let resolveReturnFailure!: (value: IteratorResult<Uint8Array>) => void;
    const returnFailurePending = new Promise<IteratorResult<Uint8Array>>((resolve) => { resolveReturnFailure = resolve; });
    const returnFailureSource: ArtifactInput = {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<Uint8Array>> => {
          returnFailureStarted();
          return returnFailurePending;
        },
        return: async () => { throw new Error("return failed"); },
      }),
    } as unknown as ArtifactInput;
    const returnFailure = writeVerifiedArtifact({
      root: store,
      relativePath: "return-failure.bin",
      operationId: "op-return-failure",
      source: returnFailureSource,
    }, returnFailureController.signal);
    await returnFailureStartedPromise;
    returnFailureController.abort();
    resolveReturnFailure({ done: true, value: undefined });
    await rejectsCode(returnFailure, "cancelled");
    const afterController = new AbortController();
    let afterStarted!: () => void;
    const afterStartedPromise = new Promise<void>((resolve) => { afterStarted = resolve; });
    let resolveAfter!: (value: IteratorResult<Uint8Array>) => void;
    const afterPending = new Promise<IteratorResult<Uint8Array>>((resolve) => { resolveAfter = resolve; });
    let firstAfter = true;
    const afterSource: ArtifactInput = {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<Uint8Array>> => {
          if (firstAfter) {
            firstAfter = false;
            return Promise.resolve({ done: false, value: bytes });
          }
          afterStarted();
          return afterPending;
        },
        return: async () => ({ done: true, value: undefined }),
        [Symbol.asyncIterator]() { return this; },
      }),
    } as unknown as ArtifactInput;
    const after = writeVerifiedArtifact({
      root: store,
      relativePath: "after.bin",
      operationId: "op-after",
      source: afterSource,
    }, afterController.signal);
    await afterStartedPromise;
    afterController.abort();
    resolveAfter({ done: true, value: undefined });
    await rejectsCode(after, "cancelled");
  });

  test("preserves a caller AbortError reason", async () => {
    const store = root();
    const controller = new AbortController();
    const reason = new Error("caller reason");
    controller.abort(reason);
    const error = await rejectsError(writeVerifiedArtifact({
      root: store,
      relativePath: "reason.bin",
      operationId: "op-reason",
      source: asyncSource([bytes]),
    }, controller.signal));
    assert.equal(error, reason);
  });

  test("removes temporary files on digest and size failures", async () => {
    const store = root();
    const digestDestination = join(store, "digest.bin");
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "digest.bin",
      expectedSha256: "0".repeat(64),
      operationId: "op-digest",
      source: asyncSource([bytes]),
    }), "hash-mismatch");
    assert.equal(existsSync(digestDestination), false);
    assert.equal(existsSync(`${digestDestination}.part-op-digest`), false);
    const sizeDestination = join(store, "size.bin");
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "size.bin",
      sizeBytes: bytes.length + 1,
      operationId: "op-size",
      source: asyncSource([bytes]),
    }), "size-mismatch");
    assert.equal(existsSync(sizeDestination), false);
    assert.equal(existsSync(`${sizeDestination}.part-op-size`), false);
  });

  test("rejects invalid digest, operation id, and source paths before writing", async () => {
    const store = root();
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "bad-digest.bin",
      expectedSha256: "bad",
      operationId: "op-bad-digest",
      source: asyncSource([bytes]),
    }), "invalid-digest");
    for (const operationId of ["bad/id", ".", ".."]) {
      await rejectsCode(writeVerifiedArtifact({
        root: store,
        relativePath: `${operationId.replaceAll("/", "-")}.bin`,
        operationId,
        source: asyncSource([bytes]),
      }), "invalid-path");
    }
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "bad-source.bin",
      operationId: "op-bad-source",
      source: 3 as unknown as ArtifactInput,
    }), "source-invalid");
  });

  test("rejects symlink and non-directory path components", async () => {
    const store = root();
    const outside = root();
    symlinkSync(outside, join(store, "linked"), "dir");
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "linked/file.bin",
      operationId: "op-linked",
      source: asyncSource([bytes]),
    }), "invalid-path");
    writeFileSync(join(store, "plain"), "x");
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "plain/file.bin",
      operationId: "op-plain",
      source: asyncSource([bytes]),
    }), "invalid-path");
    symlinkSync(outside, join(store, "file-link"), "file");
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "file-link",
      operationId: "op-file-link",
      source: asyncSource([bytes]),
    }), "invalid-path");
    mkdirSync(join(store, "directory"));
    await rejectsCode(writeVerifiedArtifact({
      root: store,
      relativePath: "directory",
      operationId: "op-directory",
      source: asyncSource([bytes]),
    }), "invalid-path");
  });

  test("rejects lstat failures", async () => {
    const store = root();
    const blocked = join(store, "blocked");
    mkdirSync(blocked);
    chmodSync(blocked, 0);
    await assert.rejects(writeVerifiedArtifact({
      root: store,
      relativePath: "blocked/file.bin",
      operationId: "op-lstat-error",
      source: asyncSource([bytes]),
    }));
    chmodSync(blocked, 0o700);
  });

  test("inspects present, missing, mismatched, and non-file artifacts", async () => {
    const store = root();
    const writer = new VerifiedArtifactWriter(store);
    assert.deepEqual(await writer.inspect({ root: store, relativePath: "missing.bin" }), { present: false, path: join(store, "missing.bin") });
    await writeVerifiedArtifact({
      root: store,
      relativePath: "present.bin",
      expectedSha256: digest(bytes),
      operationId: "op-present",
      source: asyncSource([bytes]),
    });
    const present = await writer.inspect({ root: store, relativePath: "present.bin", expectedSha256: digest(bytes) });
    assert.equal(present.present, true);
    assert.equal(present.sizeBytes, bytes.length);
    const mismatch = await writer.inspect({ root: store, relativePath: "present.bin", expectedSha256: "0".repeat(64) });
    assert.equal(mismatch.present, false);
    assert.equal(mismatch.sha256, digest(bytes));
    mkdirSync(join(store, "directory"));
    await rejectsCode(writer.inspect({ root: store, relativePath: "directory" }), "invalid-path");
    await rejectsCode(writer.inspect({ root: store, relativePath: "present.bin", expectedSha256: "bad" }), "invalid-digest");
  });

  test("hashes files with and without a signal", async () => {
    const store = root();
    const path = join(store, "hash.bin");
    writeFileSync(path, bytes);
    assert.equal(await sha256File(path), digest(bytes));
    assert.equal(await sha256File(path, new AbortController().signal), digest(bytes));
    const controller = new AbortController();
    controller.abort();
    const error = await rejectsError(sha256File(path, controller.signal));
    assert.equal(error.name, "AbortError");
  });
});
