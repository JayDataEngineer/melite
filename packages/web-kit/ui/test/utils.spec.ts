// utils.spec.ts — cn class merging + locale-aware number parsing +
// numeric clamping.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { clampNumber, cn, parseNumber } from "../src/utils.ts";

describe("cn", () => {
  it("joins plain classes", () => {
    assert.equal(cn("a", "b"), "a b");
  });
  it("resolves conflicting tailwind classes to the last one", () => {
    assert.equal(cn("px-2", "px-4"), "px-4");
  });
  it("drops falsy conditionals", () => {
    assert.equal(cn("a", false && "b", undefined, null, "c"), "a c");
  });
  it("returns empty for no inputs", () => {
    assert.equal(cn(), "");
  });
});

describe("parseNumber", () => {
  it("parses a plain dot-decimal", () => {
    assert.equal(parseNumber("1.5"), 1.5);
  });
  it("parses a comma-decimal as a decimal point", () => {
    assert.equal(parseNumber("1,5"), 1.5);
  });
  it("parses de/EU thousands + comma-decimal", () => {
    assert.equal(parseNumber("1.234,5"), 1234.5);
  });
  it("parses en/US thousands + dot-decimal", () => {
    assert.equal(parseNumber("1,234.5"), 1234.5);
  });
  it("parses a bare integer", () => {
    assert.equal(parseNumber("42"), 42);
  });
  it("strips surrounding whitespace", () => {
    assert.equal(parseNumber("  2.5  "), 2.5);
  });
  it("returns NaN for an empty string", () => {
    assert.ok(Number.isNaN(parseNumber("")));
  });
  it("returns NaN for whitespace-only", () => {
    assert.ok(Number.isNaN(parseNumber("   ")));
  });
  it("returns NaN for a non-numeric string", () => {
    assert.ok(Number.isNaN(parseNumber("abc")));
  });
  it("passes non-string input through Number()", () => {
    assert.equal(parseNumber(2.5 as unknown as string), 2.5);
  });
});

describe("clampNumber", () => {
  it("returns the fallback for NaN", () => {
    assert.equal(clampNumber(NaN, 0, 10, 7), 7);
  });
  it("returns the fallback for infinities", () => {
    assert.equal(clampNumber(Infinity, 0, 10, 7), 7);
    assert.equal(clampNumber(-Infinity, 0, 10, 7), 7);
  });
  it("clamps below min up to min", () => {
    assert.equal(clampNumber(-5, 0, 10, 7), 0);
  });
  it("clamps above max down to max", () => {
    assert.equal(clampNumber(99, 0, 10, 7), 10);
  });
  it("passes an in-range value through", () => {
    assert.equal(clampNumber(4, 0, 10, 7), 4);
  });
  it("keeps the boundary values", () => {
    assert.equal(clampNumber(0, 0, 10, 7), 0);
    assert.equal(clampNumber(10, 0, 10, 7), 10);
  });
});
