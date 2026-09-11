// py-ascii.spec.ts — ensure_ascii: ASCII rides, BMP escapes,
// astral becomes surrogate halves (charCodeAt semantics).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { asciiEscape } from "../src/pyAscii.ts";

describe("asciiEscape", () => {
  it("leaves ASCII (including controls) alone", () => {
    assert.equal(asciiEscape(""), "");
    assert.equal(asciiEscape("abc 123 ~!"), "abc 123 ~!");
    assert.equal(asciiEscape("a\nb"), "a\nb");
  });

  it("escapes BMP non-ASCII as \\uXXXX", () => {
    assert.equal(asciiEscape("é"), "\\u00e9");
    assert.equal(asciiEscape("aéb"), "a\\u00e9b");
    assert.equal(asciiEscape("中"), "\\u4e2d");
  });

  it("astral chars become surrogate halves", () => {
    assert.equal(asciiEscape("𝄞"), "\\ud834\\udd1e");
  });
});
