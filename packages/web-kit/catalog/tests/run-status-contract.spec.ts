// run-status-contract.spec.ts — the status-channel contract mirror: the
// shape gate, the run/stage core, and the violations-signature probe.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  RUN_STATUSES,
  RunStatusContractError,
  hasViolationsSignature,
  validateRunStatusContract,
} from "../src/runStatusContract.ts";
import type { RunStatusViolation } from "../src/runStatusContract.ts";

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s0",
  name: "brick",
  index: 0,
  status: "running",
  ...over,
});
const payload = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  run_id: "r1",
  status: "running",
  stages: [stage()],
  ...over,
});

describe("RUN_STATUSES + RunStatusContractError", () => {
  it("carries the 8-value run-level vocabulary", () => {
    for (const s of [
      "pending",
      "running",
      "completed",
      "failed",
      "stopped",
      "interrupted",
      "unknown",
      "queued",
    ]) {
      assert.ok(RUN_STATUSES.has(s), s);
    }
    assert.ok(!RUN_STATUSES.has("done"));
    assert.ok(!RUN_STATUSES.has("error"));
  });

  it("names the first violation, or unknown when empty", () => {
    const e = new RunStatusContractError("r1", [
      { field: "status", kind: "invalid", message: "bad" },
    ] as RunStatusViolation[]);
    assert.equal(e.name, "RunStatusContractError");
    assert.match(e.message, /r1/);
    assert.match(e.message, /bad/);
    const empty = new RunStatusContractError("r1", []);
    assert.match(empty.message, /unknown/);
  });
});

describe("validateRunStatusContract", () => {
  it("refuses non-object bodies", () => {
    for (const bad of [null, "x", 3, []]) {
      const r = validateRunStatusContract(bad);
      assert.equal(r.valid, false);
      assert.equal(r.violations[0].field, "body");
    }
  });

  it("accepts a clean payload", () => {
    const r = validateRunStatusContract(payload());
    assert.equal(r.valid, true);
    assert.deepEqual(r.violations, []);
  });

  it("requires run_id + a vocabulary status", () => {
    const noId = validateRunStatusContract(payload({ run_id: "" }));
    assert.ok(noId.violations.some((v) => v.field === "run_id"));
    const numId = validateRunStatusContract(payload({ run_id: 7 }));
    assert.ok(numId.violations.some((v) => v.field === "run_id"));
    const badStatus = validateRunStatusContract(payload({ status: "done" }));
    assert.equal(badStatus.valid, false);
    assert.ok(badStatus.violations.some((v) => v.field === "status"));
    const numStatus = validateRunStatusContract(payload({ status: 9 }));
    assert.ok(numStatus.violations.some((v) => v.field === "status"));
    for (const s of ["completed", "queued", "failed"]) {
      assert.equal(validateRunStatusContract(payload({ status: s })).valid, true);
    }
  });

  it("requires a stages array of well-formed stage cores", () => {
    const missing = validateRunStatusContract(payload({ stages: undefined }));
    assert.ok(missing.violations.some((v) => v.field === "stages"));
    const junk = validateRunStatusContract(payload({ stages: [42] }));
    assert.ok(junk.violations.some((v) => v.field === "stages.0"));
    const noIndex = validateRunStatusContract(payload({ stages: [stage({ index: "0" })] }));
    assert.ok(noIndex.violations.some((v) => v.field === "stages.0.index"));
    const noName = validateRunStatusContract(payload({ stages: [stage({ name: null })] }));
    assert.ok(noName.violations.some((v) => v.field === "stages.0.name"));
    const noId = validateRunStatusContract(payload({ stages: [stage({ id: 1 })] }));
    assert.ok(noId.violations.some((v) => v.field === "stages.0.id"));
    const noStatus = validateRunStatusContract(
      payload({ stages: [stage({ status: undefined })] }),
    );
    assert.ok(noStatus.violations.some((v) => v.field === "stages.0.status"));
    // Stage status is NOT enum-constrained — volatile values pass.
    assert.equal(
      validateRunStatusContract(payload({ stages: [stage({ status: "weird" })] })).valid,
      true,
    );
  });
});

describe("hasViolationsSignature", () => {
  it("matches only the backend 500 envelope shape", () => {
    assert.equal(hasViolationsSignature(null), false);
    assert.equal(hasViolationsSignature("x"), false);
    assert.equal(hasViolationsSignature({}), false);
    assert.equal(hasViolationsSignature({ violations: "no" }), false);
    assert.equal(hasViolationsSignature({ violations: [] }), true);
  });
});
