// refusals.spec.ts — the shared queue refusal envelope (py
// _refusal): {error, code} always, loc/expected/got only when set,
// key order the contract.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { qRefusal } from "../src/refusals.ts";

describe("qRefusal", () => {
  it("the bare refusal carries error + code only", () => {
    assert.deepEqual(qRefusal(409, "locked", "run_locked"), {
      status: 409,
      payload: { error: "locked", code: "run_locked" },
    });
  });

  it("set fields ride in contract order, absent keys stay absent", () => {
    const a = qRefusal(400, "bad", "bad_param", "stages[0]");
    assert.deepEqual(Object.keys(a.payload), ["error", "code", "loc"]);
    const full = qRefusal(400, "bad", "bad_param", "stages[0]", "object", "array");
    assert.deepEqual(Object.keys(full.payload), [
      "error",
      "code",
      "loc",
      "expected",
      "got",
    ]);
    assert.equal(full.payload["got"], "array");
    const noLoc = qRefusal(400, "bad", "bad_param", undefined, "object", "array");
    assert.deepEqual(Object.keys(noLoc.payload), [
      "error",
      "code",
      "expected",
      "got",
    ]);
  });
});
