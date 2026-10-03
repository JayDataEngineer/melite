import { afterEach, describe, expect, test, vi } from "vitest";
import assert from "node:assert/strict";
import {
  ComfyUiManagerHttpClient,
  ManagerClientError,
  ManagerProvider,
  ManagerProviderError,
  isManagerClientError,
  isManagerProviderError,
  postManagerPip,
  type ManagerInstallRequest,
  type ManagerQueueStatus,
} from "../src/index.ts";

type Fetch = typeof globalThis.fetch;

// Suite lib is ES2023 without DOM, so the DOM ReadableStream result type is
// unavailable; reader.read() resolves to the IteratorResult shape instead.
type ReadableStreamReadResult<T> = IteratorResult<T>;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function client(fetchImpl: Fetch, options: Partial<ConstructorParameters<typeof ComfyUiManagerHttpClient>[0]> = {}): ComfyUiManagerHttpClient {
  return new ComfyUiManagerHttpClient({
    baseUrl: "http://manager.test",
    requestTimeoutMs: 100,
    queueTimeoutMs: 100,
    pollIntervalMs: 1,
    fetch: fetchImpl,
    ...options,
  });
}

function queueStatus(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    total_count: 1,
    done_count: 1,
    in_progress_count: 0,
    is_processing: false,
    ...overrides,
  };
}

async function rejectsCode(promise: Promise<unknown>, code: string): Promise<ManagerClientError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ManagerClientError);
    if (!(error instanceof ManagerClientError)) throw error;
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected ${code}`);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ManagerClient construction and errors", () => {
  test("constructs typed errors with and without causes", () => {
    const cause = new Error("cause");
    const detailed = new ManagerClientError("transport", "failed", {
      cause,
      detail: "detail",
      status: 503,
      method: "GET",
      path: "/x",
    });
    assert.equal(detailed.name, "ManagerClientError");
    assert.equal(detailed.code, "transport");
    assert.equal(detailed.cause, cause);
    assert.equal(detailed.detail, "detail");
    assert.equal(detailed.status, 503);
    assert.equal(detailed.method, "GET");
    assert.equal(detailed.path, "/x");
    const plain = new ManagerClientError("invalid-request", "plain");
    assert.equal(plain.cause, undefined);
    assert.equal(plain.detail, "plain");
  });

  test("validates base URLs, protocols, credentials, and positive limits", () => {
    assert.throws(
      () => new ComfyUiManagerHttpClient({ baseUrl: "not a url" }),
      (error: unknown) => error instanceof ManagerClientError && error.code === "invalid-request",
    );
    assert.throws(
      () => new ComfyUiManagerHttpClient({ baseUrl: "ftp://manager.test" }),
      (error: unknown) => error instanceof ManagerClientError && error.code === "invalid-request",
    );
    assert.throws(
      () => new ComfyUiManagerHttpClient({ baseUrl: "https://user:password@manager.test" }),
      (error: unknown) => error instanceof ManagerClientError && error.code === "invalid-request",
    );
    for (const key of ["requestTimeoutMs", "queueTimeoutMs", "pollIntervalMs", "maxRequestBytes", "maxResponseBytes"] as const) {
      assert.throws(
        () => new ComfyUiManagerHttpClient({ baseUrl: "http://manager.test", [key]: 0 }),
        (error: unknown) => error instanceof ManagerClientError && error.code === "invalid-request",
      );
      assert.throws(
        () => new ComfyUiManagerHttpClient({ baseUrl: "http://manager.test", [key]: 1.5 }),
        (error: unknown) => error instanceof ManagerClientError && error.code === "invalid-request",
      );
    }
    const https = new ComfyUiManagerHttpClient({ baseUrl: "  https://MANAGER.test///  " });
    assert.equal(https.baseUrl, "https://MANAGER.test");
    assert.equal(https.requestTimeoutMs, 10_000);
    const withDefaults = new ComfyUiManagerHttpClient({ baseUrl: "http://manager.test" });
    assert.equal(withDefaults.queueTimeoutMs, 300_000);
    assert.equal(withDefaults.pollIntervalMs, 500);
    assert.equal(withDefaults.maxRequestBytes, 256 * 1024);
    assert.equal(withDefaults.maxResponseBytes, 8 * 1024 * 1024);
  });

  test("converts Error and non-Error transport failures", async () => {
    const errorClient = client(async () => { throw new Error("socket"); });
    const error = await rejectsCode(errorClient.get("/x"), "transport");
    assert.match(error.message, /socket/u);
    const textClient = client(async () => { throw "offline"; });
    const textError = await rejectsCode(textClient.get("/x"), "transport");
    assert.match(textError.message, /offline/u);
  });
});

describe("ManagerClient request and response handling", () => {
  test("sends JSON, text, and no-body requests and parses JSON values", async () => {
    const calls: Array<{ readonly url: string; readonly init: RequestInit | undefined }> = [];
    const fetchImpl: Fetch = async (input, init): Promise<Response> => {
      calls.push({ url: String(input), init });
      if (new URL(String(input)).pathname === "/empty") return new Response(null, { status: 200 });
      if (new URL(String(input)).pathname === "/text") return new Response("plain", { headers: { "content-type": "text/plain" } });
      return json({ ok: true });
    };
    const subject = client(fetchImpl);
    assert.deepEqual(await subject.get("/json"), { ok: true });
    assert.deepEqual(await subject.postJson("/json", { value: 1 }), { ok: true });
    assert.equal(await subject.postText("/text", "body"), "plain");
    assert.equal(await subject.get("/empty"), null);
    assert.equal(calls[0]?.init?.body, undefined);
    assert.equal(calls[1]?.init?.headers !== undefined, true);
    assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), { value: 1 });
    assert.equal((calls[1]?.init?.headers as Record<string, string>)["content-type"], "application/json");
    assert.equal(calls[2]?.init?.body, "body");
    assert.equal((calls[2]?.init?.headers as Record<string, string>)["content-type"], "text/plain");
  });

  test("rejects non-object JSON results from typed helpers", async () => {
    for (const body of ["null", "3", "\"text\""]) {
      const subject = client(async () => new Response(body, { headers: { "content-type": "application/json" } }));
      await rejectsCode(subject.getJson("/x"), "invalid-response");
      await rejectsCode(subject.postJson("/x", {}), "invalid-response");
    }
  });

  test("handles empty, malformed, and non-JSON bodies", async () => {
    const empty = client(async () => new Response(null));
    assert.equal(await empty.get("/x"), null);
    const malformedJson = client(async () => new Response("{bad", { headers: { "content-type": "application/json" } }));
    await rejectsCode(malformedJson.get("/x"), "invalid-response");
    const malformedText = client(async () => new Response("not json", { headers: { "content-type": "text/plain" } }));
    assert.equal(await malformedText.get("/x"), "not json");
    const malformedShape = client(async () => new Response("[bad"));
    await rejectsCode(malformedShape.get("/x"), "invalid-response");
  });

  test("enforces declared and streamed response bounds", async () => {
    const declared = client(async () => new Response("too large", { headers: { "content-length": "100" } }), { maxResponseBytes: 2 });
    const declaredError = await rejectsCode(declared.get("/x"), "response-too-large");
    assert.match(declaredError.detail, /content-length/u);
    const invalidLength = client(async () => new Response("ok", { headers: { "content-length": "not-a-number" } }), { maxResponseBytes: 2 });
    assert.equal(await invalidLength.get("/x"), "ok");
    const streamed = client(async () => new Response(new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.close();
      },
    })), { maxResponseBytes: 1 });
    await rejectsCode(streamed.get("/x"), "response-too-large");
    let cancelled = false;
    const cancelReader = {
      read: async (): Promise<ReadableStreamReadResult<Uint8Array>> => ({ done: false, value: new Uint8Array([1, 2]) }),
      cancel: async (): Promise<void> => {
        cancelled = true;
        throw new Error("cancel failed");
      },
      releaseLock: (): void => undefined,
    };
    const cancelResponse = {
      status: 200,
      headers: new Headers(),
      body: { getReader: () => cancelReader },
    } as unknown as Response;
    const cancelClient = client(async () => cancelResponse, { maxResponseBytes: 1 });
    await rejectsCode(cancelClient.get("/x"), "response-too-large");
    assert.equal(cancelled, true);
  });

  test("wraps response reader failures and HTTP refusals", async () => {
    const failingReader = {
      read: async (): Promise<ReadableStreamReadResult<Uint8Array>> => { throw "read failed"; },
      releaseLock: (): void => undefined,
    };
    const readClient = client(async () => ({
      status: 200,
      headers: new Headers(),
      body: { getReader: () => failingReader },
    } as unknown as Response));
    const readError = await rejectsCode(readClient.get("/x"), "transport");
    assert.match(readError.message, /read failed/u);
    const refused = client(async () => new Response("denied", { status: 503, headers: { "content-type": "text/plain" } }));
    const refusedError = await rejectsCode(refused.get("/x"), "http-refused");
    assert.equal(refusedError.status, 503);
    assert.equal(refusedError.detail, "denied");
  });

  test("validates paths, origins, bodies, and cancellation before fetch", async () => {
    let calls = 0;
    const subject = client(async () => {
      calls += 1;
      return json({});
    });
    await rejectsCode(subject.get("relative"), "invalid-request");
    await rejectsCode(subject.postText("/x", 3 as unknown as string), "invalid-request");
    await rejectsCode(subject.post("/x", { toJSON: () => { throw new Error("json"); } }), "invalid-request");
    await rejectsCode(subject.post("/x", { toJSON: () => undefined }), "invalid-request");
    const small = client(async () => json({}), { maxRequestBytes: 1 });
    await rejectsCode(small.post("/x", "123456"), "request-too-large");
    const aborted = new AbortController();
    aborted.abort();
    await rejectsCode(subject.get("/x", { signal: aborted.signal }), "cancelled");
    assert.equal(calls, 0);
    await rejectsCode(subject.get("/x", { timeoutMs: 0 }), "invalid-request");
  });

  test("maps caller cancellation and request timeouts", async () => {
    vi.useFakeTimers();
    const cancelController = new AbortController();
    const cancelClient = client(async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const cancelPromise = cancelClient.get("/x", { signal: cancelController.signal });
    cancelController.abort();
    const cancelError = await rejectsCode(cancelPromise, "cancelled");
    assert.match(cancelError.message, /cancelled/u);
    const timeoutClient = client(async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject("timed out"), { once: true });
    }), { requestTimeoutMs: 5 });
    const timeoutPromise = timeoutClient.get("/x");
    const timeoutExpectation = rejectsCode(timeoutPromise, "request-timeout");
    await vi.advanceTimersByTimeAsync(5);
    await timeoutExpectation;
  });

  test("accepts a caller cancellation that races response processing", async () => {
    const controller = new AbortController();
    const responseError = client(async () => ({
      status: 200,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
            controller.abort();
            throw new Error("response cancelled");
          },
          releaseLock: (): void => undefined,
        }),
      },
    } as unknown as Response));
    const error = await rejectsCode(responseError.get("/x", { signal: controller.signal }), "cancelled");
    assert.match(error.message, /cancelled/u);
  });
});

describe("ManagerClient queue status", () => {
  test("rejects malformed queue shapes and counts", async () => {
    const cases: Array<readonly [string, unknown]> = [
      ["null", null],
      ["shape", {}],
      ["processing", { ...queueStatus(), is_processing: "false" }],
      ["total type", { ...queueStatus(), total_count: "1" }],
      ["total negative", { ...queueStatus(), total_count: -1 }],
      ["done type", { ...queueStatus(), done_count: "1" }],
      ["in-progress type", { ...queueStatus(), in_progress_count: "0" }],
      ["done inconsistent", { ...queueStatus(), done_count: 2 }],
      ["in-progress inconsistent", { ...queueStatus(), in_progress_count: 2 }],
    ];
    for (const [label, value] of cases) {
      await assert.rejects(
        client(async () => json(value)).waitForQueue({ timeoutMs: 10, pollIntervalMs: 1 }),
        (error: unknown) => {
          assert.ok(error instanceof ManagerClientError, label);
          assert.equal(error.code, "invalid-response", label);
          return true;
        },
        label,
      );
    }
    const valid = await client(async () => json(queueStatus())).waitForQueue({ timeoutMs: 10, pollIntervalMs: 1 });
    assert.equal(valid.totalCount, 1);
  });

  test("returns immediately for a drained queue and accepts a signal", async () => {
    const subject = client(async () => json(queueStatus()));
    const signal = new AbortController().signal;
    assert.deepEqual(await subject.waitForQueue({ signal }), {
      totalCount: 1,
      doneCount: 1,
      inProgressCount: 0,
      isProcessing: false,
    });
  });

  test("polls until all queue predicates are true", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const subject = client(async () => {
      calls += 1;
      return json(queueStatus(calls === 1 ? { done_count: 0, in_progress_count: 1, is_processing: true } : {}));
    });
    const pending = subject.waitForQueue({ timeoutMs: 50, pollIntervalMs: 2 });
    await vi.runAllTimersAsync();
    assert.equal((await pending).doneCount, 1);
    assert.equal(calls, 2);
  });

  test("covers non-final queue predicates", async () => {
    vi.useFakeTimers();
    const statuses = [
      queueStatus({ done_count: 0, in_progress_count: 0, is_processing: false }),
      queueStatus({ done_count: 0, in_progress_count: 1, is_processing: false }),
      queueStatus({ done_count: 1, in_progress_count: 1, is_processing: false }),
      queueStatus(),
    ];
    let calls = 0;
    const subject = client(async () => json(statuses[Math.min(calls++, statuses.length - 1)]));
    const pending = subject.waitForQueue({ timeoutMs: 50, pollIntervalMs: 1 });
    await vi.runAllTimersAsync();
    assert.equal((await pending).doneCount, 1);
    assert.equal(calls, 4);
  });

  test("fails at the initial deadline and after a status response", async () => {
    vi.useFakeTimers();
    const OriginalDate = globalThis.Date;
    let nowCalls = 0;
    class StepDate extends OriginalDate {
      static now(): number {
        nowCalls += 1;
        return nowCalls === 1 ? 0 : 2;
      }
    }
    vi.stubGlobal("Date", StepDate);
    await rejectsCode(client(async () => json(queueStatus())).waitForQueue({ timeoutMs: 1 }), "queue-timeout");
    vi.stubGlobal("Date", OriginalDate);
    vi.setSystemTime(0);
    const late = client(async () => {
      vi.setSystemTime(20);
      return json(queueStatus({ done_count: 0, in_progress_count: 1, is_processing: true }));
    });
    await rejectsCode(late.waitForQueue({ timeoutMs: 10 }), "queue-timeout");
  });

  test("converts request timeouts and preserves other queue errors", async () => {
    vi.useFakeTimers();
    const timed = client(async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject("request timed out"), { once: true });
    }));
    const pending = timed.waitForQueue({ timeoutMs: 20, pollIntervalMs: 1 });
    const expectation = rejectsCode(pending, "queue-timeout");
    await vi.advanceTimersByTimeAsync(20);
    await expectation;
    const failed = client(async () => { throw new Error("queue transport"); });
    await rejectsCode(failed.waitForQueue(), "transport");
  });

  test("cancels a queue sleep after a response and times out response reads", async () => {
    const sleepController = new AbortController();
    const sleeping = client(async () => {
      sleepController.abort();
      return json(queueStatus({ done_count: 0, in_progress_count: 1, is_processing: true }));
    });
    await rejectsCode(sleeping.waitForQueue({ signal: sleepController.signal, timeoutMs: 50, pollIntervalMs: 1 }), "cancelled");
    vi.useFakeTimers();
    let responseSignal: AbortSignal | null | undefined;
    let rejectRead!: (error: unknown) => void;
    const pendingRead = new Promise<ReadableStreamReadResult<Uint8Array>>((_resolve, reject) => {
      rejectRead = reject;
    });
    const reader = {
      read: (): Promise<ReadableStreamReadResult<Uint8Array>> => pendingRead,
      releaseLock: (): void => undefined,
    };
    const subject = client(async (_input, init) => {
      responseSignal = init?.signal;
      responseSignal?.addEventListener("abort", () => rejectRead(new Error("read timeout")), { once: true });
      return {
        status: 200,
        headers: new Headers(),
        body: { getReader: () => reader },
      } as unknown as Response;
    }, { requestTimeoutMs: 5 });
    const pending = subject.get("/x");
    const expectation = rejectsCode(pending, "request-timeout");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5);
    await expectation;
  });

  test("cancels queue polling before and during the wait", async () => {
    vi.useFakeTimers();
    const before = new AbortController();
    before.abort();
    await rejectsCode(client(async () => json(queueStatus({ done_count: 0, in_progress_count: 1, is_processing: true }))).waitForQueue({ signal: before.signal }), "cancelled");
    const during = new AbortController();
    const subject = client(async () => json(queueStatus({ done_count: 0, in_progress_count: 1, is_processing: true })));
    const pending = subject.waitForQueue({ signal: during.signal, timeoutMs: 50, pollIntervalMs: 5 });
    await vi.advanceTimersByTimeAsync(0);
    during.abort();
    await rejectsCode(pending, "cancelled");
  });

  test("rejects invalid queue timing options", async () => {
    await rejectsCode(client(async () => json(queueStatus())).waitForQueue({ timeoutMs: 0 }), "invalid-request");
    await rejectsCode(client(async () => json(queueStatus())).waitForQueue({ pollIntervalMs: -1 }), "invalid-request");
  });
});

type ProviderFetch = {
  getJson: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  waitForQueue: ReturnType<typeof vi.fn>;
};

function providerClient(overrides: Partial<ProviderFetch> = {}): ComfyUiManagerHttpClient {
  return {
    getJson: vi.fn(async () => ({})),
    post: vi.fn(async () => undefined),
    waitForQueue: vi.fn(async () => queueStatus()),
    ...overrides,
  } as unknown as ComfyUiManagerHttpClient;
}

function registryCatalog(row: Record<string, unknown>): Record<string, unknown> {
  return { node_packs: { pack: { id: "pack", version: "1.0.0", repository: "https://github.com/example/pack.git", ...row } } };
}

const baseRequest: ManagerInstallRequest = {
  id: "pack",
  url: "https://github.com/example/pack.git",
  registry: "pack",
};

describe("ManagerProvider validation and routing", () => {
  test("exposes typed error guards", () => {
    assert.equal(isManagerProviderError(new ManagerProviderError("invalid-request", "x")), true);
    assert.equal(isManagerProviderError(new Error("x")), false);
    assert.equal(isManagerClientError(new ManagerClientError("transport", "x")), true);
    assert.equal(isManagerClientError(new Error("x")), false);
    const cause = new Error("cause");
    const detailed = new ManagerProviderError("pin-mismatch", "x", cause);
    assert.equal(detailed.cause, cause);
    const plain = new ManagerProviderError("invalid-request", "x");
    assert.equal(plain.cause, undefined);
  });

  test("posts pip requirements only when present and forwards a signal", async () => {
    const calls: Array<{ readonly path: string; readonly options: unknown }> = [];
    const subject = providerClient({ post: vi.fn(async (path: string, _body: unknown, options: unknown) => { calls.push({ path, options }); }) });
    await postManagerPip(subject, []);
    await postManagerPip(subject, ["one", "two"], new AbortController().signal);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.path, "/customnode/install/pip");
    assert.notEqual((calls[0]?.options as { signal?: AbortSignal }).signal, undefined);
  });

  test("accepts and rejects URL-only requests", async () => {
    const subject = new ManagerProvider(providerClient({ post: vi.fn(async () => undefined) }));
    assert.equal(await subject.canInstall({ id: "x", url: " " }), false);
    assert.equal(await subject.canInstall({ id: "x", url: "https://example.test/x.git" }), true);
    await assert.rejects(subject.install({ id: "x", url: " " }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
    assert.equal((await subject.install({ id: "x", url: "https://example.test/x.git" })).installed, true);
    const signal = new AbortController().signal;
    assert.equal((await subject.install({ id: "x", url: "https://example.test/x.git" }, signal)).installed, true);
  });

  // REPLACES "routes refs to the pinned port" (the extensions law,
  // 2026-10-13). That test named the clone as the intended route and
  // proved it with a stub port; there is no port any more. A declared
  // ref now rides Manager's git-url door and the landed commit is
  // verified — both asserted here through the real provider.
  test("carries a declared ref into Manager's git-url door and refuses unverified combinations", async () => {
    const post = vi.fn(async () => undefined);
    const getJson = vi.fn(async () => [{ aux_id: "https://example.test/x", ver: "abc1234def" }]);
    const subject = new ManagerProvider(providerClient({ post, getJson }));
    assert.equal(await subject.canInstall({ id: "x", ref: "abc1234", url: "https://example.test/x.git" }), true);
    // a ref AND an unverifiable registry version is refused outright
    assert.equal(await subject.canInstall({ id: "x", ref: "abc1234", version: "1" }), false);
    assert.equal(await subject.canInstall({ id: "x", ref: "abc1234", url: "https://example.test/x.git", version: "1" }), false);
    // ref + version WITH a url is the unverifiable-version refusal
    await assert.rejects(subject.install({ id: "x", ref: "abc1234", url: "https://example.test/x.git", version: "1" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "pin-mismatch");
    // a ref with no url has nothing for Manager to install from
    assert.equal(await subject.canInstall({ id: "x", ref: "abc1234" }), false);
    await assert.rejects(subject.install({ id: "x", ref: "abc1234" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
    // a branch name is not a commit and never reaches the engine
    assert.equal(await subject.canInstall({ id: "x", ref: "main", url: "https://example.test/x.git" }), false);
    await assert.rejects(subject.install({ id: "x", ref: "main", url: "https://example.test/x.git" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
  });

  test("a ref install that landed a different commit refuses head-mismatch", async () => {
    const post = vi.fn(async () => undefined);
    const getJson = vi.fn(async () => [{ aux_id: "https://example.test/x", ver: "deadbeefcafe" }]);
    const subject = new ManagerProvider(providerClient({ post, getJson }));
    await assert.rejects(
      subject.install({ id: "x", ref: "abc1234def", url: "https://example.test/x.git" }),
      (error: unknown) => error instanceof ManagerProviderError && error.code === "head-mismatch",
    );
  });

  test("a pack with no landed commit cannot satisfy a declared ref", async () => {
    // the live impact-pack shape: Manager installs it as a registry zip
    // and reports a VERSION, so the ref is unverifiable by any means
    const post = vi.fn(async () => undefined);
    const getJson = vi.fn(async () => [{ aux_id: "https://example.test/x", ver: "8.28.3" }]);
    const subject = new ManagerProvider(providerClient({ post, getJson }));
    await assert.rejects(
      subject.install({ id: "x", ref: "abc1234def", url: "https://example.test/x.git" }),
      (error: unknown) => error instanceof ManagerProviderError && error.code === "ref-unverifiable",
    );
  });

  test("resolves registry rows across catalog shapes and version forms", async () => {
    const firstCatalog = { custom_nodes: [{ cnr_id: "legacy", name: "Legacy", selected_version: "2", reference: "git@example.test:Org/Legacy.git", requirements: ["numpy"] }] };
    const firstGetJson = vi.fn(async (path: string) => path.includes("getlist") ? firstCatalog : [{ version: "2" }]);
    const first = new ManagerProvider(providerClient({ getJson: firstGetJson }));
    const firstRequest = { ...baseRequest, url: "git@example.test:Org/Legacy.git", registry: "legacy", version: "2" };
    assert.equal(await first.canInstall(firstRequest), true);
    assert.equal((await first.install(firstRequest)).installed, true);

    const secondCatalog = { node_packs: { keyed: { id: "keyed", name: "Keyed", git_url: "https://example.test/keyed.git", files: ["file"], requirements: ["numpy"] } } };
    const secondGetJson = vi.fn(async (path: string) => path.includes("getlist") ? secondCatalog : [{ version: "2" }]);
    const second = new ManagerProvider(providerClient({ getJson: secondGetJson }));
    const secondRequest = { ...baseRequest, url: "https://example.test/keyed.git", registry: "keyed", version: "2" };
    assert.equal(await second.canInstall(secondRequest), true);
    assert.equal((await second.install(secondRequest)).installed, true);

    const skipped = new ManagerProvider(providerClient({ getJson: vi.fn(async () => ({ custom_nodes: [null, { name: "Skipped" }] })) }));
    assert.equal(await skipped.canInstall({ ...baseRequest, version: "1" }), false);
  });

  test("rejects invalid registry catalogs and rows", async () => {
    const invalidCatalogs: unknown[] = [[], {}, { node_packs: [] }];
    for (const value of invalidCatalogs) {
      const subject = new ManagerProvider(providerClient({ getJson: vi.fn(async () => value) }));
      await assert.rejects(subject.canInstall({ ...baseRequest, version: "1" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
    }
    const emptyRows = new ManagerProvider(providerClient({ getJson: vi.fn(async () => ({ custom_nodes: [] })) }));
    assert.equal(await emptyRows.canInstall({ ...baseRequest, version: "1" }), false);
    const noId = new ManagerProvider(providerClient({ getJson: vi.fn(async () => ({ custom_nodes: [{ version: "1", url: "https://example.test/x" }] })) }));
    assert.equal(await noId.canInstall({ ...baseRequest, version: "1" }), false);
    const duplicate = new ManagerProvider(providerClient({ getJson: vi.fn(async () => ({ custom_nodes: [{ id: "pack", url: "https://example.test/x" }, { id: "pack", url: "https://example.test/y" }] })) }));
    assert.equal(await duplicate.canInstall({ ...baseRequest, version: "1" }), false);
    const missing = new ManagerProvider(providerClient({ getJson: vi.fn(async () => ({ custom_nodes: [{ id: "pack" }] })) }));
    assert.equal(await missing.canInstall({ ...baseRequest, version: "1" }), false);
  });

  test("checks repository pins, file matches, and malformed declared versions", async () => {
    const exact = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({}) : [{ version: "1" }]),
    }));
    assert.equal(await exact.canInstall({ ...baseRequest, version: "1" }), true);
    const scp = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({ repository: "git@EXAMPLE.test:Org/Pack.git" }) : [{ version: "1" }]),
    }));
    assert.equal(await scp.canInstall({ ...baseRequest, url: "git@example.test:Org/Pack", version: "1" }), true);
    const fileMatch = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({ repository: "https://other.test/repo.git", files: ["https://github.com/example/pack.git"] }) : [{ version: "1" }]),
    }));
    assert.equal(await fileMatch.canInstall({ ...baseRequest, version: "1" }), true);
    const mismatch = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({ repository: "https://other.test/repo.git" }) : [{ version: "1" }]),
    }));
    assert.equal(await mismatch.canInstall({ ...baseRequest, version: "1" }), false);
    const emptyVersion = new ManagerProvider(providerClient({ getJson: vi.fn(async () => registryCatalog({})) }));
    assert.equal(await emptyVersion.canInstall({ ...baseRequest, version: "  " }), false);
    const malformedVersions = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({}) : { nope: [] }),
    }));
    assert.equal(await malformedVersions.canInstall({ ...baseRequest, version: "1" }), false);
    const unavailable = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({}) : [{ version: "2" }]),
    }));
    assert.equal(await unavailable.canInstall({ ...baseRequest, version: "1" }), false);
    const latest = new ManagerProvider(providerClient({ getJson: vi.fn(async () => registryCatalog({})) }));
    assert.equal(await latest.canInstall({ ...baseRequest }), true);
    const keyFallback = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? { node_packs: { keyed: { repository: baseRequest.url, pip: ["numpy"] } } } : { versions: [{ version: "1" }] }),
    }));
    assert.equal(await keyFallback.canInstall({ id: "keyed", registry: "keyed", version: "1" }), true);
    const objectVersions = new ManagerProvider(providerClient({
      getJson: vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({}) : { versions: [{ version: "1" }] }),
    }));
    assert.equal(await objectVersions.canInstall({ ...baseRequest, version: "1" }, new AbortController().signal), true);
    const noUrl = new ManagerProvider(providerClient({ getJson: vi.fn(async () => registryCatalog({})) }));
    assert.equal(await noUrl.canInstall({ id: "pack", registry: "pack" }), true);
  });

  test("propagates non-pin registry errors and forwards install signals", async () => {
    const invalid = new ManagerProvider(providerClient({ getJson: vi.fn(async () => []) }));
    await assert.rejects(invalid.canInstall({ ...baseRequest, version: "1" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
    const post = vi.fn(async () => undefined);
    const waitForQueue = vi.fn(async () => queueStatus());
    const getJson = vi.fn(async (path: string) => path.includes("getlist") ? registryCatalog({}) : []);
    const subject = new ManagerProvider(providerClient({ getJson, post, waitForQueue }));
    const signal = new AbortController().signal;
    assert.equal((await subject.install({ ...baseRequest, version: "latest" }, signal)).installed, true);
    assert.equal(post.mock.calls.length, 2);
    assert.equal(waitForQueue.mock.calls.length, 1);
    const waitArgs = waitForQueue.mock.calls[0] as unknown as [{ signal?: AbortSignal }] | undefined; // intentionally partial: untyped vi.fn reports a zero-arg tuple; test inspects the runtime signal arg
    const getArgs = getJson.mock.calls[0] as unknown as [string, { signal?: AbortSignal }] | undefined; // intentionally partial: untyped vi.fn reports a zero-arg tuple; test inspects the runtime signal arg
    assert.equal(waitArgs?.[0]?.signal, signal);
    assert.equal(getArgs?.[1]?.signal, signal);
  });

  test("rejects missing registry ids and blank registry URLs", async () => {
    const subject = new ManagerProvider(providerClient());
    await assert.rejects(subject.install({ id: "x" }), (error: unknown) => error instanceof ManagerProviderError && error.code === "pin-mismatch");
    await assert.rejects(subject.install({ id: "x", registry: "  " }), (error: unknown) => error instanceof ManagerProviderError && error.code === "pin-mismatch");
    await assert.rejects(subject.install({ ...baseRequest, url: " " }), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
  });
});

describe("ManagerProvider model catalog", () => {
  const model = {
    id: "model:family:one",
    name: "one.bin",
    savePath: "checkpoints",
    url: "https://example.test/one.bin",
    filename: "one.bin",
  };

  function modelProvider(catalog: unknown, options: Partial<ProviderFetch> = {}): ManagerProvider {
    return new ManagerProvider(providerClient({ getJson: vi.fn(async () => catalog), ...options }));
  }

  test("normalizes model paths and queues a unique catalog row", async () => {
    const row = { name: "one.bin", type: "checkpoint", base: "SD", save_path: "models/checkpoints", url: model.url, filename: model.filename };
    const defaultRow = { ...row, save_path: "models" };
    const post = vi.fn(async () => undefined);
    const waitForQueue = vi.fn(async () => queueStatus());
    const subject = modelProvider({ models: [row, defaultRow] }, { post, waitForQueue });
    assert.equal((await subject.installModel({ ...model, savePath: "models//checkpoints/." })).installed, true);
    assert.equal((await subject.installModel({ ...model, savePath: "models" })).installed, true);
    assert.equal((await subject.installModel({ ...model, savePath: "" })).installed, true);
    const signal = new AbortController().signal;
    assert.equal((await subject.installModel(model, signal)).installed, true);
    const lastPostArgs = post.mock.calls.at(-1) as unknown as [string, unknown, { signal?: AbortSignal }] | undefined; // intentionally partial: untyped vi.fn reports a zero-arg tuple; test inspects the runtime signal arg
    const lastWaitArgs = waitForQueue.mock.calls.at(-1) as unknown as [{ signal?: AbortSignal }] | undefined; // intentionally partial: untyped vi.fn reports a zero-arg tuple; test inspects the runtime signal arg
    assert.equal(lastPostArgs?.[2]?.signal, signal);
    assert.equal(lastWaitArgs?.[0]?.signal, signal);
    const payload = (post.mock.calls[0] as unknown as [string, Record<string, unknown>] | undefined)?.[1]; // intentionally partial: untyped vi.fn reports a zero-arg tuple; test inspects the runtime payload
    assert.deepEqual(payload, { name: "one.bin", type: "checkpoint", base: "SD", save_path: "models/checkpoints", url: model.url, filename: model.filename, ui_id: model.id });
  });

  test("a DECLARED row the catalog lacks defaults its lone tag to the manager-local pair", async () => {
    // e6e510e7 typed type/base independently optional (ports.ts):
    // a declared row carrying only one tag falls to "model"/"melite"
    // for the other — pinned 2026-10-13, the cut's-wake audit
    const post = vi.fn(async () => undefined);
    const waitForQueue = vi.fn(async () => queueStatus());
    const subject = modelProvider({ models: [] }, { post, waitForQueue });
    await subject.installModel({ ...model, type: "checkpoint" });
    await subject.installModel({ ...model, base: "SD" });
    // queue/start posts interleave — read only the install_model rows
    const payloads = post.mock.calls
      .map((call) => (call as unknown as [string, Record<string, unknown>])[1])
      .filter((body) => body?.name === "one.bin");
    assert.equal(payloads[0]?.base, "melite");
    assert.equal(payloads[0]?.type, "checkpoint");
    assert.equal(payloads[1]?.type, "model");
    assert.equal(payloads[1]?.base, "SD");
  });

  test("filters malformed model catalog rows", async () => {
    const invalidRows = [
      null,
      {},
      { save_path: " " },
      { save_path: "/absolute", filename: "one.bin" },
      { save_path: "\\absolute", filename: "one.bin" },
      { save_path: "checkpoints/../escape", filename: "one.bin" },
      { save_path: "checkpoints", filename: "" },
      { save_path: "checkpoints", filename: "." },
      { save_path: "checkpoints", filename: ".." },
      { save_path: "checkpoints", filename: "a/b" },
      { save_path: "checkpoints", filename: "a\\b" },
      { save_path: "checkpoints", filename: "a\0b" },
    ];
    const subject = modelProvider({ models: invalidRows });
    await assert.rejects(subject.installModel(model), (error: unknown) => error instanceof ManagerProviderError && error.code === "model-unregistered");
    for (const invalidCatalog of [null, {}, { models: null }]) {
      await assert.rejects(modelProvider(invalidCatalog).installModel(model), (error: unknown) => error instanceof ManagerProviderError && error.code === "model-metadata");
    }
  });

  test("requires every required model metadata field", async () => {
    const fields = ["name", "type", "base", "url"] as const;
    for (const missing of fields) {
      const row: Record<string, unknown> = { name: "one.bin", type: "checkpoint", base: "SD", save_path: "checkpoints", url: model.url, filename: model.filename };
      delete row[missing];
      const subject = modelProvider({ models: [row] });
      await assert.rejects(subject.installModel(model), (error: unknown) => error instanceof ManagerProviderError && error.code === "model-metadata");
    }
    const missingSavePath: Record<string, unknown> = { name: "one.bin", type: "checkpoint", base: "SD", save_path: " ", url: model.url, filename: model.filename };
    await assert.rejects(modelProvider({ models: [missingSavePath] }).installModel(model), (error: unknown) => error instanceof ManagerProviderError && error.code === "model-unregistered");
  });

  test("rejects invalid model request fields before catalog access", async () => {
    const subject = modelProvider({ models: [] });
    const invalid = [
      { ...model, name: " " },
      { ...model, url: " " },
      { ...model, savePath: "/bad" },
      { ...model, savePath: "../bad" },
      { ...model, filename: "a/b" },
      { ...model, filename: " " },
      { ...model, savePath: 3 as unknown as string },
      { ...model, filename: 3 as unknown as string },
    ];
    for (const request of invalid) {
      await assert.rejects(subject.installModel(request), (error: unknown) => error instanceof ManagerProviderError && error.code === "invalid-request");
    }
  });
});
