// @melite/comfyui-card-kit — the poser row guards (positive,
// nonNegative, strictTransparent, vecShape) and their refusal
// voices. Every guard refuses LOUD, never silently clamps.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { positive, nonNegative, strictTransparent, vecShape } from "../src/blocks/poser-kit.ts";

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

describe("nonNegative (a ratio or width)", () => {
  it("zero and positives ride", () => {
    assert.equal(nonNegative("pad", 0), 0);
    assert.equal(nonNegative("pad", 4.5), 4.5);
  });
  it("negatives and non-numbers refuse", () => {
    for (const bad of [-0.1, "x", null, undefined, NaN]) {
      assert.throws(() => nonNegative("pad", bad), /pad = .*: negative is nonsense/);
    }
  });
});

describe("strictTransparent (the lax-wire boolean law)", () => {
  it("bools ride verbatim", () => {
    assert.equal(strictTransparent(true), true);
    assert.equal(strictTransparent(false), false);
  });
  it("the lax wire strings coerce", () => {
    for (const t of ["true", "1", "yes", " TRUE ", "Yes"]) assert.equal(strictTransparent(t), true);
    for (const f of ["false", "0", "no", " FALSE "]) assert.equal(strictTransparent(f), false);
  });
  it("garbage refuses loud (never a silent default)", () => {
    for (const bad of ["maybe", 2, null, undefined]) {
      assert.throws(() => strictTransparent(bad), /transparent = .*: true \| false/);
    }
  });
});

describe("vecShape (the x,y,z wire string)", () => {
  it("a three-number comma string rides VERBATIM", () => {
    assert.equal(vecShape("pos", "1.5, 2, -3"), "1.5, 2, -3");
  });
  it("non-strings, wrong arity, and non-number parts refuse", () => {
    for (const bad of [5, null, undefined, "", "1,2", "1,2,3,4", "1,,3", "1,a,3"]) {
      assert.throws(() => vecShape("pos", bad), /pos = .*: want x,y,z/);
    }
  });
});
