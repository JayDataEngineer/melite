// api.spec.ts — the resilient fetch wrapper: retry policy, GET dedup,
// liveness signal, JSON helper, artifact data-URL helper.
import { describe, it, afterEach, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";

const { readAsDataURLMock } = vi.hoisted(() => ({ readAsDataURLMock: vi.fn() }));
vi.mock("@melite/formats/readFile", () => ({ readAsDataURL: readAsDataURLMock }));

import {
  apiFetch,
  apiJson,
  externalUrl,
  getBackendState,
  onBackendState,
  urlToDataUrl,
} from "../src/api.ts";
import type { BackendState } from "../src/api.ts";

const realFetch = globalThis.fetch;
const realWindow = (globalThis as Record<string, unknown>).window;

type FetchFn = (url: unknown, init?: RequestInit) => Promise<Response>;
let calls: Array<{ url: string; init?: RequestInit }> = [];
let script: Array<Response | Error | unknown> = [];

beforeEach(() => {
  calls = [];
  script = [];
  (globalThis as Record<string, unknown>).window = {
    location: { origin: "http://app.test" },
  };
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = script.length > 0 ? script.shift()! : new Response("default-ok", { status: 200 });
    if (next instanceof Error || typeof next === "string") throw next;
    return next as Response;
  }) as FetchFn;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as Record<string, unknown>).window = realWindow;
  readAsDataURLMock.mockReset();
  vi.restoreAllMocks();
});

const ok = (body = "ok", status = 200): Response => new Response(body, { status });
/** Run fn with Date.now pinned past the retry deadline (no sleeps, fast). */
async function pastDeadline<T>(fn: () => Promise<T>): Promise<T> {
  let n = 0;
  const spy = vi.spyOn(Date, "now").mockImplementation(() => (n++ === 0 ? 1000 : 1_000_000));
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
}

describe("externalUrl + getBackendState", () => {
  it("externalUrl is an identity brand", () => {
    assert.equal(externalUrl("/melite-tools/x"), "/melite-tools/x");
    assert.equal(externalUrl("https://other/y"), "https://other/y");
  });

  it("starts online", () => {
    assert.equal(getBackendState(), "online");
  });
});

describe("apiFetch success + dedup", () => {
  it("returns the response and stays online", async () => {
    const res = await apiFetch("/v1/a");
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "default-ok");
    assert.equal(calls.length, 1);
    assert.equal(getBackendState(), "online");
  });

  it("dedups concurrent backend GETs, cloning per caller", async () => {
    script = [ok("shared")];
    const [r1, r2] = await Promise.all([apiFetch("/v1/dedup"), apiFetch("/v1/dedup")]);
    assert.equal(calls.length, 1);
    assert.equal(await r1.text(), "shared");
    assert.equal(await r2.text(), "shared");
    // After settle the entry is cleaned: a later GET re-fires.
    await apiFetch("/v1/dedup");
    assert.equal(calls.length, 2);
  });

  it("shares responses whose mocks lack clone()", async () => {
    const bare = { ok: true, status: 200 };
    script = [bare as unknown as Response];
    const [r1, r2] = await Promise.all([apiFetch("/v1/bare"), apiFetch("/v1/bare")]);
    assert.equal(calls.length, 1);
    assert.equal(r1 as unknown, bare as unknown);
    assert.equal(r2 as unknown, bare as unknown);
  });

  it("does not dedup POSTs or external GETs", async () => {
    await Promise.all([
      apiFetch("/v1/post", { method: "POST" }),
      apiFetch("/v1/post", { method: "POST" }),
    ]);
    assert.equal(calls.length, 2);
    await Promise.all([
      apiFetch(externalUrl("http://other.test/e")),
      apiFetch(externalUrl("http://other.test/e")),
    ]);
    assert.equal(calls.length, 4);
  });

  it("an immediately-aborted caller never fires", async () => {
    const ctl = new AbortController();
    ctl.abort();
    await assert.rejects(apiFetch("/v1/aborted", { signal: ctl.signal }), /Aborted/);
    assert.equal(calls.length, 0);
  });

  it("bridges the caller signal into the underlying fetch", async () => {
    const ctl = new AbortController();
    await apiFetch("/v1/sig", { method: "POST", signal: ctl.signal });
    const sent = calls[0]!.init?.signal as AbortSignal;
    assert.ok(sent instanceof AbortSignal);
    assert.notEqual(sent, ctl.signal);
  });
});

describe("apiFetch retry policy", () => {
  it("retries a transient 500 GET, flagging degraded then online", async () => {
    await apiFetch("/v1/settle"); // preamble: exact liveness sequence below
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      script = [ok("bad", 500), ok("bad", 500), ok("good")];
      calls = [];
      const res = await apiFetch("/v1/flaky");
      assert.equal(res.status, 200);
      assert.equal(calls.length, 3);
      assert.deepEqual(seen, ["degraded", "online"]);
    } finally {
      unsub();
    }
  });

  it("does not retry a 500 POST, but retries a 502 POST", async () => {
    script = [ok("err", 500)];
    assert.equal((await apiFetch("/v1/p", { method: "POST" })).status, 500);
    assert.equal(calls.length, 1);
    script = [ok("bad-gw", 502), ok("fine")];
    assert.equal((await apiFetch("/v1/p2", { method: "POST" })).status, 200);
    assert.equal(calls.length, 3);
  });

  it("returns 4xx as-is without retry", async () => {
    script = [ok("missing", 404)];
    assert.equal((await apiFetch("/v1/m")).status, 404);
    assert.equal(calls.length, 1);
  });

  it("retries an external 500 without touching liveness", async () => {
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      script = [ok("bad", 500), ok("good")];
      const res = await apiFetch(externalUrl("http://other.test/x"));
      assert.equal(res.status, 200);
      assert.equal(calls.length, 2);
      assert.deepEqual(seen, []);
    } finally {
      unsub();
    }
  });

  it("returns the last 500 after exhausting retries", async () => {
    script = [ok("bad", 500), ok("bad", 500), ok("bad", 500), ok("bad", 500), ok("bad", 500)];
    const res = await apiFetch("/v1/always500");
    assert.equal(res.status, 500);
    assert.equal(calls.length, 5);
  }, 30000);

  it("skips the retry wait once the total budget is spent", async () => {
    script = [ok("bad", 500), ok("recovered")];
    // Deadline already spent on the second check: no sleep, return live.
    const res = await pastDeadline(() => apiFetch("/v1/budget"));
    assert.equal(res.status, 500);
    assert.equal(calls.length, 1);
  });
});

describe("apiFetch network failures + liveness", () => {
  it("goes degraded then offline across consecutive failures", async () => {
    await apiFetch("/v1/settle"); // preamble: exact liveness sequence below
    script = Array.from({ length: 15 }, () => new Error("down"));
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      await pastDeadline(() => assert.rejects(apiFetch("/v1/down"), /down/));
      await pastDeadline(() => assert.rejects(apiFetch("/v1/down"), /down/));
      await pastDeadline(() => assert.rejects(apiFetch("/v1/down"), /down/));
      assert.equal(getBackendState(), "offline");
      assert.deepEqual(seen, ["degraded", "offline"]);
      // Recovery resets the counter and announces online once.
      const res = await apiFetch("/v1/up");
      assert.equal(res.status, 200);
      assert.deepEqual(seen, ["degraded", "offline", "online"]);
      // Same-state transitions notify nobody.
      await apiFetch("/v1/up2");
      assert.deepEqual(seen, ["degraded", "offline", "online"]);
    } finally {
      unsub();
    }
  });

  it("external network failures never touch liveness", async () => {
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      script = Array.from({ length: 5 }, () => new Error("nope"));
      await pastDeadline(() => assert.rejects(apiFetch(externalUrl("http://other.test/d")), /nope/));
      assert.deepEqual(seen, []);
    } finally {
      unsub();
    }
  });

  it("wraps a non-Error rejection in an Error", async () => {
    script = Array.from({ length: 5 }, () => "string failure" as unknown as Error);
    await pastDeadline(() => assert.rejects(apiFetch("/v1/weird"), /network request failed/));
  });

  it("surfaces fetch AbortErrors without retry", async () => {
    script = [new DOMException("stop", "AbortError")];
    await assert.rejects(apiFetch("/v1/stop"), /stop/);
    assert.equal(calls.length, 1);
  });

  it("treats non-abort DOMExceptions as retryable network errors", async () => {
    script = [new DOMException("quota", "QuotaExceededError"), ok("back")];
    const res = await apiFetch("/v1/quota");
    assert.equal(res.status, 200);
    assert.equal(calls.length, 2);
  });

  it("an abort during backoff surfaces AbortError", async () => {
    const ctl = new AbortController();
    script = [new Error("blip")];
    const p = apiFetch("/v1/blip", { signal: ctl.signal });
    ctl.abort();
    await assert.rejects(p, /Aborted/);
  });

  it("an abort during a status-retry backoff cancels the sleep", async () => {
    const ctl = new AbortController();
    script = [ok("bad", 500), ok("late-good")];
    const p = apiFetch("/v1/retry-abort", { signal: ctl.signal });
    // The stub fetch settles in a microtask; the ~200-400ms backoff sleep
    // is certainly pending at 50ms, so this abort lands inside sleep().
    await new Promise((r) => setTimeout(r, 50));
    ctl.abort();
    await assert.rejects(p, /Aborted/);
    assert.equal(calls.length, 1); // the retry never fired
  });

  it("a throwing listener never breaks the chain, and unsubscribe works", async () => {
    await apiFetch("/v1/settle"); // preamble: start online
    const seen: BackendState[] = [];
    const unsubBad = onBackendState(() => {
      throw new Error("listener bug");
    });
    const unsubGood = onBackendState((s) => seen.push(s));
    try {
      script = [ok("bad", 500), ok("good")];
      await apiFetch("/v1/chain");
      assert.ok(seen.includes("degraded"));
      unsubBad();
      unsubGood();
      const n = seen.length;
      script = [ok("bad", 500), ok("good")];
      await apiFetch("/v1/chain2");
      assert.equal(seen.length, n); // nobody notified after unsubscribe
    } finally {
      unsubBad();
      unsubGood();
    }
  });

  it("clears the dedup entry when the shared GET rejects", async () => {
    script = Array.from({ length: 5 }, () => "nope" as unknown as Error);
    await pastDeadline(() =>
      assert.rejects(Promise.all([apiFetch("/v1/shared-fail"), apiFetch("/v1/shared-fail")])),
    );
    await apiFetch("/v1/shared-fail");
    assert.ok(calls.length >= 2);
  });
});

describe("isBackendUrl", () => {
  it("classifies relative, same-origin, and foreign URLs", async () => {
    await apiFetch("/v1/rel");
    assert.equal(calls.length, 1);
    await apiFetch(externalUrl("http://app.test/same"));
    await apiFetch(externalUrl("http://other.test/foreign"));
    assert.equal(calls.length, 3);
  });

  it("treats syntactically-invalid URLs as non-backend", async () => {
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      script = [new Error("x"), new Error("x"), new Error("x"), new Error("x"), new Error("x")];
      await pastDeadline(() => assert.rejects(apiFetch(externalUrl("http://[invalid")), /x/));
      assert.deepEqual(seen, []); // no liveness change: not our backend
    } finally {
      unsub();
    }
  });

  it("treats absolute URLs as non-backend with no window", async () => {
    delete (globalThis as Record<string, unknown>).window;
    const seen: BackendState[] = [];
    const unsub = onBackendState((s) => seen.push(s));
    try {
      await apiFetch(externalUrl("http://app.test/nowin"));
      assert.deepEqual(seen, []); // window access threw -> not backend
      await apiFetch("/v1/rel-nowin");
      assert.deepEqual(seen, []); // relative is backend but success is silent
    } finally {
      unsub();
    }
  });
});

describe("apiJson", () => {
  it("returns parsed JSON on 2xx", async () => {
    script = [new Response(JSON.stringify({ a: 1 }))];
    assert.deepEqual(await apiJson<{ a: number }>("/v1/j"), { a: 1 });
  });

  it("throws with status plus a 200-char body excerpt", async () => {
    script = [ok("x".repeat(500), 422)];
    try {
      await apiJson("/v1/j");
      assert.fail("should throw");
    } catch (e) {
      const msg = (e as Error).message;
      assert.match(msg, /\/v1\/j: 422/);
      assert.ok(msg.endsWith("x".repeat(200)));
      assert.ok(!msg.includes("x".repeat(201)));
    }
  });

  it("reports a failing body read with its status", async () => {
    const badText = { ok: false, status: 500, statusText: "Bad", text: async () => { throw new Error("stream cut"); } };
    script = [badText, badText, badText, badText, badText] as unknown as Response[];
    await pastDeadline(() => assert.rejects(apiJson("/v1/j"), /500 Bad \(body read failed: stream cut\)/));
    const badText2 = { ok: false, status: 500, statusText: "Bad", text: async () => { throw "gone"; } };
    script = [badText2, badText2, badText2, badText2, badText2] as unknown as Response[];
    await pastDeadline(() => assert.rejects(apiJson("/v1/j"), /body read failed: gone/));
  });
});

describe("urlToDataUrl", () => {
  it("fetches and re-encodes the blob", async () => {
    const blob = new Blob(["bytes"], { type: "image/png" });
    script = [{ ok: true, status: 200, blob: async () => blob } as unknown as Response];
    readAsDataURLMock.mockResolvedValue("data:image/png;base64,eA==");
    const ctl = new AbortController();
    assert.equal(await urlToDataUrl("http://app.test/a.png", ctl.signal), "data:image/png;base64,eA==");
    assert.equal(readAsDataURLMock.mock.calls.length, 1);
    assert.equal(calls[0]!.init?.signal, ctl.signal);
  });

  it("throws loudly on HTTP errors and unreadable blobs", async () => {
    script = [ok("nope", 404)];
    await assert.rejects(urlToDataUrl("http://app.test/missing.png"), /HTTP 404/);
    const blob = new Blob(["x"]);
    script = [{ ok: true, status: 200, blob: async () => blob } as unknown as Response];
    readAsDataURLMock.mockRejectedValue(new Error("no reader"));
    await assert.rejects(urlToDataUrl("http://app.test/b.png"), /Failed to read http:\/\/app.test\/b.png as data URL/);
  });

  it("slices long URLs in error messages", async () => {
    const long = `http://app.test/${"p".repeat(500)}.png`;
    script = [ok("nope", 500)];
    try {
      await urlToDataUrl(long);
      assert.fail("should throw");
    } catch (e) {
      assert.ok(!(e as Error).message.includes("p".repeat(500)));
      assert.ok((e as Error).message.includes(long.slice(0, 200)));
    }
  });
});
