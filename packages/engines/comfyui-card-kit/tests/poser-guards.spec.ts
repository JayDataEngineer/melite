// @melite/comfyui-card-kit — the poser row guard (positive) and
// its refusal voice. The guard refuses LOUD, never silently clamps.
// (R9: nonNegative, strictTransparent and vecShape refused nothing
// no lane called — deleted with their arms, 2026-10-17.)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { positive } from "../src/blocks/poser-kit.ts";

describe("positive (an inherent amount)", () => {
  it("a positive finite number rides verbatim", () => {
    assert.equal(positive("res", 2.5), 2.5);
    assert.equal(positive("res", 1), 1);
  });
  it("zero, negatives, non-numbers, infinities refuse", () => {
    for (const bad of [0, -1, NaN, Infinity, "3", null, undefined]) {
      assert.throws(() => positive("res", bad), /res = .*: a positive number is required/);
    }
  });
});
