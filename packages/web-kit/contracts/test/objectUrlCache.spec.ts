// objectUrlCache.spec.ts — isDataUrl, the module's one live export
// (the timeline package gates its blob handling on it). The cache
// arms (dataUrlToObjectUrl, revokeObjectUrlFor, revokeAll,
// _cachedCount) were deleted with the 2026-10-21 dead-exports
// census: no production consumer converted through them — only
// this spec.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { isDataUrl } from "../src/objectUrlCache.ts";

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
    const big = Buffer.from("x".repeat(200)).toString("base64");
    assert.equal(isDataUrl(`data:video/mp4;base64,${big}`), true);
  });
});
