// runStatusContract — the status-channel half of the NO SILENT DROPS
// contract.
//
// 2026-08-11: every status payload the poll reads passes
// validateRunStatusContract (in flowProtocol.pollFlowRun) BEFORE
// it can drive a run card. These tests lock the gates: the contract core
// (run_id + the backend's 7-value run-level vocabulary + stages with
// id/name/index/status) is strictly required; auxiliary wire fields
// (log_tail, params, ...) pass through unvalidated; stage
// STATUS is deliberately not enum-constrained (serverStatusToCard maps
// unknowns → pending). A 200 body failing the core — or a non-ok body
// carrying the backend's `violations` signature — is a hard violation,
// never a silent fake "running" card.
import { describe, expect, it } from "vitest"
import {
  validateRunStatusContract,
  hasViolationsSignature,
  RunStatusContractError,
} from "@melite/catalog"
import type { RunStatusViolation } from "@melite/catalog"

// Record<string, any>: fixtures model the wire payload — the gate under
// test is the runtime validator, not static typing.
const GOOD_STATUS: Record<string, any> = {
  run_id: "p-abc123",
  status: "running",
  stages: [
    { id: "s0", name: "Create Image", index: 0, status: "running" },
    { id: "s1", name: "Upscale", index: 1, status: "pending" },
  ],
  // Auxiliary fields — real runner emissions, unvalidated by design.
  // (flow_doc is NOT among them: no gateway ever emitted it — the
  // pipe-carry fiction retired 2026-09-05.)
  log_tail: "step 2/20",
  params: { prompt: "a neon samurai" },
}

describe("validateRunStatusContract", () => {
  it("accepts a contract-valid status payload", () => {
    const r = validateRunStatusContract(GOOD_STATUS)
    expect(r.valid).toBe(true)
    expect(r.violations).toEqual([])
  })

  it("SHAPE GATE: a non-object payload is a violation (error body masquerade)", () => {
    for (const bad of [null, "boom", 42, ["stages"]]) {
      const r = validateRunStatusContract(bad)
      expect(r.valid).toBe(false)
      expect(r.violations[0].field).toBe("body")
      expect(r.violations[0].kind).toBe("shape")
    }
  })

  it("REQUIRES run_id — a payload that cannot identify the run is a violation", () => {
    const { run_id: _drop, ...noRunId } = GOOD_STATUS
    const r = validateRunStatusContract(noRunId)
    expect(r.valid).toBe(false)
    expect(r.violations.some((v) => v.field === "run_id")).toBe(true)
  })

  it("run-level status is strictly the backend's 8-value vocabulary", () => {
    // "done"/"error" are STAGE values — at run level they are a lie
    // (the exact class that would paint a completed card for a dead run).
    const r = validateRunStatusContract({ ...GOOD_STATUS, status: "done" })
    expect(r.valid).toBe(false)
    expect(r.violations.some((v) => v.field === "status")).toBe(true)
    // Every vocabulary value passes. "queued" is the ONE-GPU run queue's
    // status (2026-08-14) — it was shipped in the runner + generated
    // types but NOT this validator, so every queued run tripped this and
    // flipped cards to contract-error. The array in runStatusContract.ts
    // is now `satisfies`-constrained to the GENERATED union, so a future
    // backend addition fails tsc until this loop is updated.
    for (const status of [
      "pending", "running", "completed", "failed", "stopped",
      "interrupted", "unknown", "queued",
    ]) {
      expect(validateRunStatusContract({ ...GOOD_STATUS, status }).valid).toBe(true)
    }
  })

  it("REQUIRES the stages array", () => {
    const { stages: _drop, ...noStages } = GOOD_STATUS
    const r = validateRunStatusContract(noStages)
    expect(r.valid).toBe(false)
    expect(r.violations.some((v) => v.field === "stages")).toBe(true)
  })

  it("REQUIRES the stage core (id/name/index/status) per stage", () => {
    const missingName = { ...GOOD_STATUS, stages: [{ id: "s0", index: 0, status: "pending" }] }
    const r1 = validateRunStatusContract(missingName)
    expect(r1.valid).toBe(false)
    expect(r1.violations.some((v) => v.field === "stages.0.name")).toBe(true)

    const badIndex = { ...GOOD_STATUS, stages: [{ id: "s0", name: "s0", index: "0", status: "pending" }] }
    const r2 = validateRunStatusContract(badIndex)
    expect(r2.valid).toBe(false)
    expect(r2.violations.some((v) => v.field === "stages.0.index")).toBe(true)

    // A non-object stage is flagged at the stage slot.
    const badStage = { ...GOOD_STATUS, stages: ["s0"] }
    const r3 = validateRunStatusContract(badStage)
    expect(r3.valid).toBe(false)
    expect(r3.violations.some((v) => v.field === "stages.0")).toBe(true)
  })

  it("stage STATUS is deliberately NOT enum-constrained (volatile; unknowns map to pending)", () => {
    const r = validateRunStatusContract({
      ...GOOD_STATUS,
      stages: [{ id: "s0", name: "s0", index: 0, status: "working-oddly" }],
    })
    expect(r.valid).toBe(true)
  })

  it("extras on the payload and on stages pass through UNVALIDATED", () => {
    const withExtras = {
      ...GOOD_STATUS,
      new_runner_field: { anything: [1, 2, 3] },
      stages: [
        ...GOOD_STATUS.stages,
        { id: "s9", name: "s9", index: 9, status: "pending", url: "data:image/png;base64,x" },
      ],
    }
    expect(validateRunStatusContract(withExtras).valid).toBe(true)
  })
})

describe("hasViolationsSignature", () => {
  it("recognizes the backend's contract-violation 500 signature", () => {
    expect(hasViolationsSignature({ error: "boom", violations: [] })).toBe(true)
    expect(hasViolationsSignature({ error: "boom" })).toBe(false)
    expect(hasViolationsSignature("boom")).toBe(false)
    expect(hasViolationsSignature(null)).toBe(false)
  })
})

describe("RunStatusContractError", () => {
  it("carries the violations to the caller's catch", () => {
    const violations: RunStatusViolation[] = [
      { field: "status", kind: "invalid", message: "not in the vocabulary" },
    ]
    const err = new RunStatusContractError("p-1", violations)
    expect(err.name).toBe("RunStatusContractError")
    expect(err.violations).toEqual(violations)
    expect(err.message).toContain("p-1")
  })
})
