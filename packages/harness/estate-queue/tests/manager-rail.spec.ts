// manager-rail.spec.ts — the manager rail: the error shape, the
// base law (trailing slashes, non-string urls), the 503 template,
// and the one call (JSON in/out, text fallback, refusal + transport
// mapping, the timeout cancel always released).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  ManagerApiError,
  managerBase,
  managerGet,
  managerPost,
  planeUnavailable,
} from "../src/managerRail.ts";
import type { ManageCtx } from "./managePlane.ts";

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
const CANCELLED: boolean[] = [];
const ctxWithCancel = (url: unknown): ManageCtx =>
  ({
    endpoint: () => ({ url }),
    timeout: (_cb: () => void, _ms: number): (() => void) => {
      let done = false;
      return () => {
        done = true;
        CANCELLED.push(done);
      };
    },
  }) as unknown as ManageCtx;
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

  it("an aborting timeout settles the plane-unavailable template", async () => {
    globalThis.fetch = (async (_url: unknown, init: RequestInit | undefined) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return { status: 200, text: async () => "{}" } as unknown as Response;
    }) as typeof fetch;
    const aborting = {
      endpoint: () => ({ url: "http://h" }),
      timeout: (cb: () => void, _ms: number): (() => void) => {
        cb();
        return () => {};
      },
    } as unknown as ManageCtx;
    await assert.rejects(
      managerGet("http://h", "/r", { timeoutMs: 5, ctx: aborting }),
      /management plane unavailable/,
    );
  });

  it("GET sends no body headers; the cancel always releases", async () => {
    CANCELLED.length = 0;
    mockFetch(200, "{}");
    await managerGet("http://h", "/r", { timeoutMs: 5, ctx: ctxWithCancel(1) });
    assert.equal(seen[0]?.init?.body, undefined);
    assert.equal(seen[0]?.init?.headers, undefined);
    assert.deepEqual(CANCELLED, [true]);
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
