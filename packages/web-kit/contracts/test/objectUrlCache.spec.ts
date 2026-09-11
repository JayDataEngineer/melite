// objectUrlCache.spec.ts — the data-URL → object-URL cache: isDataUrl,
// dataUrlToObjectUrl (null/empty/passthrough/data arms, cache-hit,
// malformed-no-comma, bad-base64, non-base64 url-encoded, mime-default),
// revokeObjectUrlFor (hit/miss/throw-swallowing), revokeAll, _cachedCount.
// Node ships Blob/URL/atob, so every arm runs without a browser.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  _cachedCount,
  dataUrlToObjectUrl,
  isDataUrl,
  revokeAll,
  revokeObjectUrlFor,
} from "../src/objectUrlCache.ts";

function bigB64(bytes = 200): string {
  return Buffer.from("x".repeat(bytes)).toString("base64");
}

function dataUrl(mime = "video/mp4", payload?: string): string {
  return `data:${mime};base64,${payload ?? bigB64()}`;
}

const savedRevoke = URL.revokeObjectURL;

afterEach(() => {
  URL.revokeObjectURL = savedRevoke;
  revokeAll();
});

describe("isDataUrl", () => {
  it("rejects non-strings", () => {
    assert.equal(isDataUrl(null), false);
    assert.equal(isDataUrl(undefined), false);
    assert.equal(isDataUrl(42), false);
    assert.equal(isDataUrl({}), false);
  });

  it("rejects non-data and short strings", () => {
    assert.equal(isDataUrl("blob:abc"), false);
    assert.equal(isDataUrl("https://example.com/v.mp4"), false);
    assert.equal(isDataUrl("data:short"), false);
    assert.equal(isDataUrl("data:" + "x".repeat(123)), false);
  });

  it("accepts long data URLs", () => {
    assert.equal(isDataUrl(dataUrl()), true);
  });
});

describe("dataUrlToObjectUrl", () => {
  it("nulls on null/undefined/empty", () => {
    assert.equal(dataUrlToObjectUrl(null), null);
    assert.equal(dataUrlToObjectUrl(undefined), null);
    assert.equal(dataUrlToObjectUrl(""), null);
  });

  it("passes non-data URLs through untouched", () => {
    assert.equal(dataUrlToObjectUrl("blob:abc"), "blob:abc");
    assert.equal(
      dataUrlToObjectUrl("https://example.com/v.mp4"),
      "https://example.com/v.mp4",
    );
    assert.equal(dataUrlToObjectUrl("data:short"), "data:short");
  });

  it("converts once and serves the cache on repeat", () => {
    const src = dataUrl();
    const first = dataUrlToObjectUrl(src);
    assert.ok(first);
    assert.ok(first.startsWith("blob:"));
    assert.notEqual(first, src);
    assert.equal(_cachedCount(), 1);
    assert.equal(dataUrlToObjectUrl(src), first);
    assert.equal(_cachedCount(), 1);
  });

  it("returns the original when no comma separates header from payload", () => {
    const malformed = "data:" + "x".repeat(130);
    assert.equal(dataUrlToObjectUrl(malformed), malformed);
  });

  it("returns the original on malformed base64", () => {
    const bad = "data:text/plain;base64," + "!".repeat(130);
    assert.equal(dataUrlToObjectUrl(bad), bad);
  });

  it("decodes non-base64 url-encoded payloads", () => {
    const src = "data:text/plain," + encodeURIComponent("hello world ".repeat(12));
    assert.ok(isDataUrl(src));
    const out = dataUrlToObjectUrl(src);
    assert.ok(out);
    assert.ok(out.startsWith("blob:"));
  });

  it("defaults the mime when the header names none", () => {
    const out = dataUrlToObjectUrl(`data:;base64,${bigB64()}`);
    assert.ok(out);
    assert.ok(out.startsWith("blob:"));
  });
});

describe("revocation", () => {
  it("revokeObjectUrlFor drops the hit and ignores misses", () => {
    const src = dataUrl();
    const first = dataUrlToObjectUrl(src);
    assert.equal(_cachedCount(), 1);
    revokeObjectUrlFor(src);
    assert.equal(_cachedCount(), 0);
    revokeObjectUrlFor(src);
    revokeObjectUrlFor("never-cached");
    const second = dataUrlToObjectUrl(src);
    assert.ok(second);
    assert.notEqual(second, first);
  });

  it("revokeObjectUrlFor swallows revoke failures", () => {
    const src = dataUrl();
    dataUrlToObjectUrl(src);
    URL.revokeObjectURL = () => {
      throw new Error("already gone");
    };
    revokeObjectUrlFor(src);
    assert.equal(_cachedCount(), 0);
  });

  it("revokeAll clears everything and swallows revoke failures", () => {
    dataUrlToObjectUrl(dataUrl());
    dataUrlToObjectUrl(dataUrl("image/png"));
    assert.equal(_cachedCount(), 2);
    URL.revokeObjectURL = () => {
      throw new Error("already gone");
    };
    revokeAll();
    assert.equal(_cachedCount(), 0);
  });
});
