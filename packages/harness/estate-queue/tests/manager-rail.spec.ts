// manager-rail.spec.ts — the manager rail: the error shape, the
// base law (trailing slashes, non-string urls), the 503 template,
// and the one call (JSON in/out, text fallback, refusal + transport
// mapping, the timeout cancel always released).
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import {
  ManagerApiError,
  managerBase,
  managerGet,
  managerPost,
  planeUnavailable,
} from "../src/managerRail.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const CTX = (url: unknown): ManageCtx =>
  ({
    endpoint: () => ({ url }),
    timeout: (_cb: () => void, _ms: number): (() => void) => () => {},
  }) as unknown as ManageCtx;
const seen: Array<{ url: unknown; init: RequestInit | undefined }> = [];
const mockFetch = (status: number, text: string): void => {
  seen.length = 0;
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    seen.push({ url, init });
    return { status, text: async () => text } as unknown as Response;
  }) as typeof fetch;
};

describe("ManagerApiError", () => {
  it("carries status + full text, sliced message", () => {
    const e = new ManagerApiError(403, "x".repeat(500));
    assert.equal(e.status, 403);
    assert.equal(e.text, "x".repeat(500));
    assert.equal(e.message, "manager api 403: " + "x".repeat(200));
  });
});

describe("managerBase", () => {
  it("strips trailing slashes; non-strings ride empty", () => {
    assert.equal(managerBase(CTX("http://h:8188///")), "http://h:8188");
    assert.equal(managerBase(CTX("http://h:8188")), "http://h:8188");
    assert.equal(managerBase(CTX(5)), "");
    assert.equal(managerBase(CTX(undefined)), "");
  });
});

describe("planeUnavailable", () => {
  it("503s with the base or the no-endpoint voice", () => {
    const a = planeUnavailable("http://h:8188", "boom");
    assert.equal(a.status, 503);
    assert.match(a.message, /http:\/\/h:8188 \(boom\)/);
    assert.match(planeUnavailable("", "boom").message, /<no endpoint url>/);
  });
});

describe("managerGet", () => {
  it("parses JSON, passes text, nulls empty", async () => {
    mockFetch(200, '{"a":1}');
    assert.deepEqual(await managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }), { a: 1 });
    mockFetch(200, "plain");
    assert.equal(await managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }), "plain");
    mockFetch(200, "");
    assert.equal(await managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }), null);
  });

  it("refusals ride verbatim; transports become the 503 template", async () => {
    mockFetch(404, "no pack");
    await assert.rejects(managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }), /manager api 404: no pack/);
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(
      managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }),
      /management plane unavailable.*fetch failed/,
    );
    globalThis.fetch = (async () => {
      throw "bare string failure";
    }) as unknown as typeof fetch;
    await assert.rejects(
      managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }),
      /management plane unavailable.*bare string failure/,
    );
  });

  it("an internal timeout maps to a manager timeout", async () => {
    // The fuse is the dsh-timeout deadline's own timer (timeoutMs: 5
    // real ms): the fetch hangs until its signal aborts, so the
    // deadline wins and the classification below maps it to the 504.
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    }) as typeof fetch;
    await assert.rejects(
      managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }),
      /manager request timed out/,
    );
  });

  it("a read that completes only after the deadline still maps to the manager timeout", async () => {
    // The sister arm's fetch never resolves, so the classification
    // happens in the catch. Here the fetch resolves at the abort and
    // the body READ completes after it — the walk reaches the
    // post-read timeout check on the success path and answers the
    // same 504 (the coverage queue's managerRail batch, 2026-10-16).
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      await new Promise<void>((resolve) => {
        init?.signal?.addEventListener("abort", () => resolve(), { once: true });
      });
      return { status: 200, text: async () => "late" } as unknown as Response;
    }) as typeof fetch;
    await assert.rejects(
      managerGet("http://h", "/r", { timeoutMs: 5, ctx: CTX(1) }),
      (error: unknown) => {
        assert.equal((error as ManagerApiError).status, 504);
        assert.match((error as Error).message, /manager request timed out/);
        return true;
      },
    );
  });

  it("propagates a caller abort to the fetch", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      requestSignal = init?.signal ?? undefined;
      return await new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    }) as typeof fetch;
    const pending = managerGet("http://h", "/r", {
      timeoutMs: 5_000,
      ctx: {
        endpoint: () => ({ url: "http://h" }),
        timeout: () => () => {},
        signal: controller.signal,
      } as unknown as ManageCtx,
    });
    controller.abort();
    await assert.rejects(pending, (error: unknown) => {
      assert.equal((error as Error).name, "AbortError");
      return true;
    });
    assert.equal(requestSignal?.aborted, true);
  });

  it("GET sends no body headers; the deadline timer always releases", async () => {
    // The fuse timer is dsh-timeout's; its dispose-once clear is the
    // release. With fake timers a live setTimeout left behind by a
    // completed call would keep the count above zero.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      mockFetch(200, "{}");
      await managerGet("http://h", "/r", { timeoutMs: 5_000, ctx: CTX(1) });
      assert.equal(seen[0]?.init?.body, undefined);
      assert.equal(seen[0]?.init?.headers, undefined);
      assert.equal(vi.getTimerCount(), 0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("managerPost", () => {
  it("always posts JSON with the content-type gate", async () => {
    mockFetch(200, "{}");
    await managerPost("http://h", "/r", { a: 1 }, { timeoutMs: 5, ctx: CTX(1) });
    assert.equal(seen[0]?.init?.method, "POST");
    assert.deepEqual(seen[0]?.init?.headers, { "content-type": "application/json" });
    assert.equal(seen[0]?.init?.body, JSON.stringify({ a: 1 }));
  });
});
